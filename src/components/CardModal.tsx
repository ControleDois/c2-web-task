import { useCallback, useEffect, useRef, useState } from 'react'
import {
  createChecklist,
  createChecklistItem,
  createComment,
  createLabel,
  deleteCard,
  deleteCardFile,
  deleteChecklist,
  deleteChecklistItem,
  deleteComment,
  deleteLabel,
  fetchCard,
  LABEL_COLORS,
  moveCard,
  summarize,
  toggleCardLabel,
  toggleCardMember,
  updateCard,
  updateChecklistItem,
  updateLabel,
  uploadCardFile,
  type BoardDetail,
  type Card,
  type CardDetail,
  type Label,
} from '../lib/kanban'
import { ApiError } from '../lib/api'
import {
  avatarColor,
  DUE_STYLES,
  dueState,
  formatBytes,
  formatDateTime,
  formatFullDate,
  initials,
} from '../lib/cardUtils'
import { Popover } from './Popover'
import {
  ArchiveIcon,
  CheckIcon,
  ChecklistIcon,
  ClockIcon,
  CommentIcon,
  ImageIcon,
  MoveIcon,
  PaperclipIcon,
  PencilIcon,
  TagIcon,
  TextIcon,
  TrashIcon,
  UserPlusIcon,
  XIcon,
} from './kbIcons'

interface CardModalProps {
  token: string
  cardId: string
  board: BoardDetail
  onClose: () => void
  onCardChange: (card: Card) => void
  onCardRemoved: (cardId: string) => void
  onLabelsChange: (labels: Label[]) => void
}

type PopoverKind = 'labels' | 'dates' | 'checklist' | 'members' | 'cover' | null

const STEP = 1024

const actionButton =
  'flex items-center gap-2 rounded-md bg-[var(--kb-modal-soft)] px-3 py-1.5 text-[13.5px] font-medium text-[var(--kb-card-ink)] hover:brightness-95'
const fieldClass =
  'w-full rounded-md bg-[var(--kb-modal-soft)] px-3 py-2 text-[14px] text-[var(--kb-card-ink)] placeholder:text-[var(--kb-list-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--kb-accent)]'

function SectionTitle({ icon, children, action }: { icon: React.ReactNode; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-2 flex items-center gap-3">
      <span className="h-5 w-5 flex-none text-[var(--kb-list-muted)]">{icon}</span>
      <h3 className="flex-1 text-[16px] font-semibold text-[var(--kb-card-ink)]">{children}</h3>
      {action}
    </div>
  )
}

export function CardModal({ token, cardId, board, onClose, onCardChange, onCardRemoved, onLabelsChange }: CardModalProps) {
  const [detail, setDetail] = useState<CardDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [popover, setPopover] = useState<PopoverKind>(null)

  const [titleDraft, setTitleDraft] = useState('')
  const [editingDescription, setEditingDescription] = useState(false)
  const [descriptionDraft, setDescriptionDraft] = useState('')
  const [commentDraft, setCommentDraft] = useState('')
  const [commentFocused, setCommentFocused] = useState(false)
  const [addingItemTo, setAddingItemTo] = useState<string | null>(null)
  const [itemDraft, setItemDraft] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  const fail = useCallback((err: unknown, fallback: string) => {
    setError(err instanceof ApiError ? err.message : fallback)
  }, [])

  const apply = useCallback(
    (next: CardDetail) => {
      setDetail(next)
      setTitleDraft(next.title)
      onCardChange(summarize(next))
    },
    [onCardChange]
  )

  const refresh = useCallback(async () => {
    try {
      apply(await fetchCard(token, cardId))
    } catch (err) {
      fail(err, 'Não foi possível carregar o cartão.')
    }
  }, [apply, cardId, fail, token])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  async function run<T>(action: () => Promise<T>, fallback: string): Promise<T | undefined> {
    setError(null)
    try {
      return await action()
    } catch (err) {
      fail(err, fallback)
      return undefined
    }
  }

  async function saveTitle() {
    const title = titleDraft.trim()
    if (!detail || !title || title === detail.title) {
      setTitleDraft(detail?.title ?? '')
      return
    }
    const updated = await run(() => updateCard(token, cardId, { title }), 'Não foi possível renomear o cartão.')
    if (updated) apply(updated)
  }

  async function saveDescription() {
    const updated = await run(() => updateCard(token, cardId, { description: descriptionDraft }), 'Não foi possível salvar a descrição.')
    if (updated) {
      apply(updated)
      setEditingDescription(false)
    }
  }

  async function patch(payload: Record<string, unknown>, fallback: string) {
    const updated = await run(() => updateCard(token, cardId, payload), fallback)
    if (updated) apply(updated)
  }

  async function toggleLabel(label: Label) {
    await run(() => toggleCardLabel(token, cardId, label.id), 'Não foi possível alterar a etiqueta.')
    await refresh()
  }

  async function toggleMember(personId: string) {
    await run(() => toggleCardMember(token, cardId, personId), 'Não foi possível alterar os membros.')
    await refresh()
  }

  async function addChecklist(title: string) {
    await run(() => createChecklist(token, cardId, title), 'Não foi possível criar o checklist.')
    await refresh()
  }

  async function removeChecklist(id: string) {
    await run(() => deleteChecklist(token, id), 'Não foi possível excluir o checklist.')
    await refresh()
  }

  async function addItem(checklistId: string) {
    const text = itemDraft.trim()
    if (!text) return
    setItemDraft('')
    await run(() => createChecklistItem(token, checklistId, text), 'Não foi possível adicionar o item.')
    await refresh()
  }

  async function toggleItem(itemId: string, checked: boolean) {
    // Marca na hora e confirma com o servidor em seguida.
    setDetail((current) =>
      current
        ? {
            ...current,
            checklists: current.checklists.map((list) => ({
              ...list,
              items: list.items.map((item) => (item.id === itemId ? { ...item, checked } : item)),
            })),
          }
        : current
    )
    await run(() => updateChecklistItem(token, itemId, { checked }), 'Não foi possível atualizar o item.')
    await refresh()
  }

  async function removeItem(itemId: string) {
    await run(() => deleteChecklistItem(token, itemId), 'Não foi possível excluir o item.')
    await refresh()
  }

  async function sendComment() {
    const body = commentDraft.trim()
    if (!body) return
    setCommentDraft('')
    setCommentFocused(false)
    await run(() => createComment(token, cardId, body), 'Não foi possível comentar.')
    await refresh()
  }

  async function removeComment(id: string) {
    await run(() => deleteComment(token, id), 'Não foi possível excluir o comentário.')
    await refresh()
  }

  async function handleUpload(file: File | undefined) {
    if (!file) return
    setUploading(true)
    await run(() => uploadCardFile(token, cardId, file), 'Não foi possível anexar o arquivo.')
    setUploading(false)
    await refresh()
  }

  async function removeFile(id: string) {
    await run(() => deleteCardFile(token, id), 'Não foi possível excluir o anexo.')
    await refresh()
  }

  async function moveToList(listId: string) {
    if (!detail || listId === detail.list_id) return
    const target = board.lists.find((list) => list.id === listId)
    const last = target?.cards.reduce((max, card) => Math.max(max, card.position), 0) ?? 0
    await run(() => moveCard(token, cardId, listId, last + STEP), 'Não foi possível mover o cartão.')
    await refresh()
  }

  async function archive() {
    const updated = await run(() => updateCard(token, cardId, { archived: true }), 'Não foi possível arquivar o cartão.')
    if (updated) onCardRemoved(cardId)
  }

  async function remove() {
    const done = await run(() => deleteCard(token, cardId), 'Não foi possível excluir o cartão.')
    if (done) onCardRemoved(cardId)
  }

  const coverImage = detail?.files.find((file) => file.id === detail.cover_file_id && file.is_image)
  const coverStyle = detail?.cover_color ? LABEL_COLORS[detail.cover_color] : null
  const cardLabels = detail ? board.labels.filter((label) => detail.label_ids.includes(label.id)) : []

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-black/70 px-3 py-8 sm:px-6" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="relative mx-auto w-full max-w-[768px] rounded-xl bg-[var(--kb-modal)] text-[var(--kb-card-ink)] shadow-2xl">
        {(coverImage || coverStyle) && (
          <div
            className="h-32 w-full overflow-hidden rounded-t-xl"
            style={coverImage ? undefined : { background: coverStyle ?? undefined }}
          >
            {coverImage && <img src={coverImage.file_url} alt="" className="h-full w-full object-cover" />}
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute right-3 top-3 z-10 rounded-full bg-black/40 p-1.5 text-white hover:bg-black/60"
        >
          <XIcon className="h-5 w-5" />
        </button>

        {!detail ? (
          <div className="flex h-60 items-center justify-center">
            {error ? (
              <p className="px-6 text-center text-[14px] font-medium text-[#f87168]">{error}</p>
            ) : (
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-[var(--kb-list-muted)] border-t-[var(--kb-accent)]" />
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-5 p-5 sm:p-6">
            <div>
              <textarea
                value={titleDraft}
                onChange={(event) => setTitleDraft(event.target.value)}
                onBlur={saveTitle}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    event.currentTarget.blur()
                  }
                }}
                rows={Math.max(1, Math.ceil(titleDraft.length / 48))}
                className="w-full resize-none rounded-md bg-transparent px-2 py-1 text-[22px] font-semibold leading-tight focus:bg-[var(--kb-modal-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--kb-accent)]"
              />
              <p className="px-2 text-[13px] text-[var(--kb-list-muted)]">
                na lista <span className="font-semibold underline">{detail.list_title}</span>
              </p>
            </div>

            {error && <p className="rounded-md bg-[#f87168] px-3 py-2 text-[13px] font-semibold text-[#2d0a07]">{error}</p>}

            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <button type="button" onClick={() => setPopover(popover === 'labels' ? null : 'labels')} className={actionButton}>
                  <TagIcon className="h-4 w-4" />
                  Etiquetas
                </button>
                {popover === 'labels' && (
                  <Popover title="Etiquetas" onClose={() => setPopover(null)}>
                    <LabelsPopover
                      token={token}
                      boardId={board.id}
                      labels={board.labels}
                      selected={detail.label_ids}
                      onToggle={toggleLabel}
                      onLabelsChange={onLabelsChange}
                      onError={(err) => fail(err, 'Não foi possível salvar a etiqueta.')}
                    />
                  </Popover>
                )}
              </div>

              <div className="relative">
                <button type="button" onClick={() => setPopover(popover === 'dates' ? null : 'dates')} className={actionButton}>
                  <ClockIcon className="h-4 w-4" />
                  Datas
                </button>
                {popover === 'dates' && (
                  <Popover title="Datas" onClose={() => setPopover(null)}>
                    <DatesPopover
                      start={detail.start}
                      due={detail.due}
                      onSave={async (start, due) => {
                        await patch({ start, due }, 'Não foi possível salvar as datas.')
                        setPopover(null)
                      }}
                    />
                  </Popover>
                )}
              </div>

              <div className="relative">
                <button type="button" onClick={() => setPopover(popover === 'checklist' ? null : 'checklist')} className={actionButton}>
                  <ChecklistIcon className="h-4 w-4" />
                  Checklist
                </button>
                {popover === 'checklist' && (
                  <Popover title="Adicionar checklist" onClose={() => setPopover(null)}>
                    <ChecklistPopover
                      onAdd={async (title) => {
                        await addChecklist(title)
                        setPopover(null)
                      }}
                    />
                  </Popover>
                )}
              </div>

              <div className="relative">
                <button type="button" onClick={() => setPopover(popover === 'members' ? null : 'members')} className={actionButton}>
                  <UserPlusIcon className="h-4 w-4" />
                  Membros
                </button>
                {popover === 'members' && (
                  <Popover title="Membros" onClose={() => setPopover(null)}>
                    <div className="flex max-h-72 flex-col gap-1 overflow-y-auto">
                      {board.members.length === 0 && <p className="text-[13px] text-[var(--kb-list-muted)]">Nenhum usuário disponível.</p>}
                      {board.members.map((member) => {
                        const active = detail.members.some((item) => item.id === member.id)
                        return (
                          <button
                            key={member.id}
                            type="button"
                            onClick={() => toggleMember(member.id)}
                            className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-left hover:bg-[var(--kb-modal-soft)]"
                          >
                            <span
                              className="flex h-8 w-8 flex-none items-center justify-center rounded-full text-[12px] font-bold text-white"
                              style={{ background: avatarColor(member.id) }}
                            >
                              {initials(member.name)}
                            </span>
                            <span className="flex-1 truncate text-[14px]">{member.name}</span>
                            {active && <CheckIcon className="h-4 w-4" />}
                          </button>
                        )
                      })}
                    </div>
                  </Popover>
                )}
              </div>

              <button type="button" onClick={() => fileInput.current?.click()} className={actionButton} disabled={uploading}>
                <PaperclipIcon className="h-4 w-4" />
                {uploading ? 'Enviando…' : 'Anexo'}
              </button>
              <input
                ref={fileInput}
                type="file"
                className="hidden"
                onChange={(event) => {
                  handleUpload(event.target.files?.[0])
                  event.target.value = ''
                }}
              />

              <div className="relative">
                <button type="button" onClick={() => setPopover(popover === 'cover' ? null : 'cover')} className={actionButton}>
                  <ImageIcon className="h-4 w-4" />
                  Capa
                </button>
                {popover === 'cover' && (
                  <Popover title="Capa" onClose={() => setPopover(null)}>
                    <p className="mb-1.5 text-[12px] font-semibold text-[var(--kb-list-muted)]">Cores</p>
                    <div className="grid grid-cols-6 gap-1.5">
                      {Object.entries(LABEL_COLORS).map(([key, hex]) => (
                        <button
                          key={key}
                          type="button"
                          aria-label={key}
                          onClick={() => patch({ cover_color: key, cover_file_id: null }, 'Não foi possível definir a capa.')}
                          className="h-8 rounded-md ring-offset-2 ring-offset-[var(--kb-modal)] hover:ring-2 hover:ring-[var(--kb-accent)]"
                          style={{ background: hex }}
                        />
                      ))}
                    </div>
                    {detail.files.some((file) => file.is_image) && (
                      <>
                        <p className="mb-1.5 mt-3 text-[12px] font-semibold text-[var(--kb-list-muted)]">Imagens anexadas</p>
                        <div className="grid grid-cols-3 gap-1.5">
                          {detail.files
                            .filter((file) => file.is_image)
                            .map((file) => (
                              <button
                                key={file.id}
                                type="button"
                                onClick={() => patch({ cover_file_id: file.id, cover_color: null }, 'Não foi possível definir a capa.')}
                                className="h-14 overflow-hidden rounded-md hover:ring-2 hover:ring-[var(--kb-accent)]"
                              >
                                <img src={file.file_url} alt="" className="h-full w-full object-cover" />
                              </button>
                            ))}
                        </div>
                      </>
                    )}
                    {(detail.cover_color || detail.cover_file_id) && (
                      <button
                        type="button"
                        onClick={() => patch({ cover_color: null, cover_file_id: null }, 'Não foi possível remover a capa.')}
                        className="mt-3 w-full rounded-md bg-[var(--kb-modal-soft)] py-1.5 text-[13px] font-medium hover:brightness-95"
                      >
                        Remover capa
                      </button>
                    )}
                  </Popover>
                )}
              </div>
            </div>

            {(cardLabels.length > 0 || detail.members.length > 0 || detail.due) && (
              <div className="flex flex-wrap gap-x-6 gap-y-3">
                {cardLabels.length > 0 && (
                  <div>
                    <p className="mb-1 text-[12px] font-semibold text-[var(--kb-list-muted)]">Etiquetas</p>
                    <div className="flex flex-wrap gap-1">
                      {cardLabels.map((label) => (
                        <button
                          key={label.id}
                          type="button"
                          onClick={() => setPopover('labels')}
                          className="flex h-8 min-w-12 items-center rounded px-3 text-[14px] font-medium text-[#172b4d]"
                          style={{ background: LABEL_COLORS[label.color] }}
                        >
                          {label.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {detail.members.length > 0 && (
                  <div>
                    <p className="mb-1 text-[12px] font-semibold text-[var(--kb-list-muted)]">Membros</p>
                    <div className="flex gap-1">
                      {detail.members.map((member) => (
                        <span
                          key={member.id}
                          title={member.name}
                          className="flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-bold text-white"
                          style={{ background: avatarColor(member.id) }}
                        >
                          {initials(member.name)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {detail.due && (
                  <div>
                    <p className="mb-1 text-[12px] font-semibold text-[var(--kb-list-muted)]">Prazo</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={detail.due_complete}
                        onChange={(event) => patch({ due_complete: event.target.checked }, 'Não foi possível atualizar o prazo.')}
                        className="h-4 w-4"
                      />
                      <button
                        type="button"
                        onClick={() => setPopover('dates')}
                        className={`flex items-center gap-1.5 rounded px-2.5 py-1.5 text-[14px] font-medium ${
                          dueState(detail.due, detail.due_complete) === 'normal'
                            ? 'bg-[var(--kb-modal-soft)]'
                            : DUE_STYLES[dueState(detail.due, detail.due_complete)]
                        }`}
                      >
                        {formatFullDate(detail.due)}
                        {detail.due_complete && <span className="text-[11px] font-bold">Concluído</span>}
                        {!detail.due_complete && dueState(detail.due, false) === 'overdue' && (
                          <span className="text-[11px] font-bold">Atrasado</span>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col gap-6 md:flex-row">
              <div className="flex min-w-0 flex-1 flex-col gap-7">
                <section>
                  <SectionTitle
                    icon={<TextIcon className="h-5 w-5" />}
                    action={
                      !editingDescription && detail.description ? (
                        <button
                          type="button"
                          onClick={() => {
                            setDescriptionDraft(detail.description)
                            setEditingDescription(true)
                          }}
                          className={actionButton}
                        >
                          Editar
                        </button>
                      ) : undefined
                    }
                  >
                    Descrição
                  </SectionTitle>
                  <div className="pl-8">
                    {editingDescription ? (
                      <div>
                        <textarea
                          autoFocus
                          value={descriptionDraft}
                          onChange={(event) => setDescriptionDraft(event.target.value)}
                          rows={6}
                          placeholder="Adicione uma descrição mais detalhada…"
                          className={fieldClass}
                        />
                        <div className="mt-2 flex gap-2">
                          <button
                            type="button"
                            onClick={saveDescription}
                            className="rounded-md bg-[var(--kb-accent)] px-3.5 py-1.5 text-[13.5px] font-semibold text-white hover:opacity-90"
                          >
                            Salvar
                          </button>
                          <button type="button" onClick={() => setEditingDescription(false)} className="rounded-md px-3 py-1.5 text-[13.5px] font-medium hover:bg-[var(--kb-modal-soft)]">
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : detail.description ? (
                      <p className="whitespace-pre-wrap break-words text-[14px] leading-relaxed">{detail.description}</p>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setDescriptionDraft('')
                          setEditingDescription(true)
                        }}
                        className="w-full rounded-md bg-[var(--kb-modal-soft)] px-3 py-4 text-left text-[14px] text-[var(--kb-list-muted)] hover:brightness-95"
                      >
                        Adicione uma descrição mais detalhada…
                      </button>
                    )}
                  </div>
                </section>

                {detail.files.length > 0 && (
                  <section>
                    <SectionTitle icon={<PaperclipIcon className="h-5 w-5" />}>Anexos</SectionTitle>
                    <div className="flex flex-col gap-2 pl-8">
                      {detail.files.map((file) => (
                        <div key={file.id} className="flex items-center gap-3 rounded-md bg-[var(--kb-modal-soft)] p-2">
                          <a
                            href={file.file_url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex h-14 w-20 flex-none items-center justify-center overflow-hidden rounded bg-black/10 text-[12px] font-bold uppercase text-[var(--kb-list-muted)]"
                          >
                            {file.is_image ? (
                              <img src={file.file_url} alt="" className="h-full w-full object-cover" />
                            ) : (
                              file.file_name.split('.').pop()
                            )}
                          </a>
                          <div className="min-w-0 flex-1">
                            <a href={file.file_url} target="_blank" rel="noreferrer" className="block truncate text-[14px] font-semibold hover:underline">
                              {file.file_name}
                            </a>
                            <p className="text-[12px] text-[var(--kb-list-muted)]">
                              {formatDateTime(file.created_at)} {file.file_size ? `· ${formatBytes(file.file_size)}` : ''}
                            </p>
                            <div className="mt-1 flex gap-3 text-[12px] font-medium text-[var(--kb-list-muted)]">
                              {file.is_image && (
                                <button
                                  type="button"
                                  onClick={() => patch({ cover_file_id: file.id, cover_color: null }, 'Não foi possível definir a capa.')}
                                  className="hover:underline"
                                >
                                  {detail.cover_file_id === file.id ? 'Capa atual' : 'Tornar capa'}
                                </button>
                              )}
                              <button type="button" onClick={() => removeFile(file.id)} className="hover:underline">
                                Excluir
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {detail.checklists.map((checklist) => {
                  const total = checklist.items.length
                  const done = checklist.items.filter((item) => item.checked).length
                  const percent = total ? Math.round((done / total) * 100) : 0
                  return (
                    <section key={checklist.id}>
                      <SectionTitle
                        icon={<ChecklistIcon className="h-5 w-5" />}
                        action={
                          <button type="button" onClick={() => removeChecklist(checklist.id)} className={actionButton}>
                            Excluir
                          </button>
                        }
                      >
                        {checklist.title}
                      </SectionTitle>
                      <div className="pl-0">
                        <div className="mb-2 flex items-center gap-3">
                          <span className="w-8 text-right text-[12px] text-[var(--kb-list-muted)]">{percent}%</span>
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--kb-modal-soft)]">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${percent}%`, background: percent === 100 ? '#4bce97' : 'var(--kb-accent)' }}
                            />
                          </div>
                        </div>
                        <div className="flex flex-col">
                          {checklist.items.map((item) => (
                            <div key={item.id} className="group flex items-start gap-3 rounded-md px-1 py-1.5 hover:bg-[var(--kb-modal-soft)]">
                              <input
                                type="checkbox"
                                checked={item.checked}
                                onChange={(event) => toggleItem(item.id, event.target.checked)}
                                className="mt-1 h-4 w-4 flex-none"
                              />
                              <span className={`flex-1 break-words text-[14px] ${item.checked ? 'text-[var(--kb-list-muted)] line-through' : ''}`}>
                                {item.text}
                              </span>
                              <button
                                type="button"
                                onClick={() => removeItem(item.id)}
                                aria-label="Excluir item"
                                className="rounded p-1 text-[var(--kb-list-muted)] opacity-0 hover:bg-black/10 group-hover:opacity-100"
                              >
                                <TrashIcon className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                        {addingItemTo === checklist.id ? (
                          <div className="mt-2">
                            <textarea
                              autoFocus
                              value={itemDraft}
                              onChange={(event) => setItemDraft(event.target.value)}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter' && !event.shiftKey) {
                                  event.preventDefault()
                                  addItem(checklist.id)
                                }
                                if (event.key === 'Escape') {
                                  event.stopPropagation()
                                  setAddingItemTo(null)
                                }
                              }}
                              rows={2}
                              placeholder="Adicione um item"
                              className={fieldClass}
                            />
                            <div className="mt-2 flex gap-2">
                              <button
                                type="button"
                                onClick={() => addItem(checklist.id)}
                                className="rounded-md bg-[var(--kb-accent)] px-3.5 py-1.5 text-[13.5px] font-semibold text-white hover:opacity-90"
                              >
                                Adicionar
                              </button>
                              <button type="button" onClick={() => setAddingItemTo(null)} className="rounded-md px-3 py-1.5 text-[13.5px] font-medium hover:bg-[var(--kb-modal-soft)]">
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setAddingItemTo(checklist.id)
                              setItemDraft('')
                            }}
                            className={`${actionButton} mt-2`}
                          >
                            Adicionar um item
                          </button>
                        )}
                      </div>
                    </section>
                  )
                })}

                <section>
                  <SectionTitle icon={<CommentIcon className="h-5 w-5" />}>Comentários e atividade</SectionTitle>
                  <div className="pl-8">
                    <textarea
                      value={commentDraft}
                      onChange={(event) => setCommentDraft(event.target.value)}
                      onFocus={() => setCommentFocused(true)}
                      rows={commentFocused || commentDraft ? 3 : 1}
                      placeholder="Escrever um comentário…"
                      className={fieldClass}
                    />
                    {(commentFocused || commentDraft) && (
                      <button
                        type="button"
                        disabled={!commentDraft.trim()}
                        onClick={sendComment}
                        className="mt-2 rounded-md bg-[var(--kb-accent)] px-3.5 py-1.5 text-[13.5px] font-semibold text-white hover:opacity-90 disabled:opacity-50"
                      >
                        Salvar
                      </button>
                    )}

                    <div className="mt-4 flex flex-col gap-4">
                      {detail.activity.map((entry) => (
                        <div key={`${entry.kind}-${entry.id}`} className="flex gap-3">
                          <span
                            className="flex h-8 w-8 flex-none items-center justify-center rounded-full text-[12px] font-bold text-white"
                            style={{ background: avatarColor(entry.author?.id ?? 'sistema') }}
                          >
                            {entry.author ? initials(entry.author.name) : '·'}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-[14px]">
                              <span className="font-semibold">{entry.author?.name ?? 'Sistema'}</span>
                              {entry.kind === 'activity' && <span> {entry.text}</span>}
                            </p>
                            <p className="text-[12px] text-[var(--kb-list-muted)]">{formatDateTime(entry.created_at)}</p>
                            {entry.kind === 'comment' && (
                              <>
                                <p className="mt-1 whitespace-pre-wrap break-words rounded-md bg-[var(--kb-modal-soft)] px-3 py-2 text-[14px]">
                                  {entry.text}
                                </p>
                                <button
                                  type="button"
                                  onClick={() => removeComment(entry.id)}
                                  className="mt-1 text-[12px] font-medium text-[var(--kb-list-muted)] hover:underline"
                                >
                                  Excluir
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              </div>

              <aside className="flex w-full flex-none flex-col gap-2 md:w-44">
                <p className="text-[12px] font-semibold text-[var(--kb-list-muted)]">Ações</p>
                <div className="relative">
                  <select
                    value={detail.list_id}
                    onChange={(event) => moveToList(event.target.value)}
                    aria-label="Mover para outra lista"
                    className="w-full rounded-md bg-[var(--kb-modal-soft)] px-3 py-1.5 text-[13.5px] font-medium text-[var(--kb-card-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--kb-accent)]"
                  >
                    {board.lists.map((list) => (
                      <option key={list.id} value={list.id}>
                        {list.title}
                      </option>
                    ))}
                  </select>
                  <MoveIcon className="pointer-events-none absolute right-7 top-2 hidden h-4 w-4" />
                </div>
                <button type="button" onClick={archive} className={actionButton}>
                  <ArchiveIcon className="h-4 w-4" />
                  Arquivar
                </button>
                {confirmDelete ? (
                  <div className="rounded-md bg-[var(--kb-modal-soft)] p-2.5">
                    <p className="mb-2 text-[12.5px]">Excluir este cartão de vez?</p>
                    <div className="flex gap-1.5">
                      <button type="button" onClick={remove} className="flex-1 rounded-md bg-[#f87168] py-1.5 text-[13px] font-semibold text-[#2d0a07]">
                        Excluir
                      </button>
                      <button type="button" onClick={() => setConfirmDelete(false)} className="flex-1 rounded-md py-1.5 text-[13px] font-medium hover:bg-black/10">
                        Não
                      </button>
                    </div>
                  </div>
                ) : (
                  <button type="button" onClick={() => setConfirmDelete(true)} className={actionButton}>
                    <TrashIcon className="h-4 w-4" />
                    Excluir
                  </button>
                )}
              </aside>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ---------- janelinhas ----------

function ChecklistPopover({ onAdd }: { onAdd: (title: string) => void }) {
  const [title, setTitle] = useState('Checklist')
  return (
    <div>
      <label className="text-[12px] font-semibold text-[var(--kb-list-muted)]">Título</label>
      <input
        autoFocus
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        onKeyDown={(event) => event.key === 'Enter' && title.trim() && onAdd(title.trim())}
        className={`${fieldClass} mt-1`}
      />
      <button
        type="button"
        onClick={() => title.trim() && onAdd(title.trim())}
        className="mt-3 rounded-md bg-[var(--kb-accent)] px-3.5 py-1.5 text-[13.5px] font-semibold text-white hover:opacity-90"
      >
        Adicionar
      </button>
    </div>
  )
}

function DatesPopover({
  start,
  due,
  onSave,
}: {
  start: string | null
  due: string | null
  onSave: (start: string | null, due: string | null) => void
}) {
  const [startValue, setStartValue] = useState(start ?? '')
  const [dueValue, setDueValue] = useState(due ?? '')
  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        <span className="text-[12px] font-semibold text-[var(--kb-list-muted)]">Data de início</span>
        <input type="date" value={startValue} onChange={(event) => setStartValue(event.target.value)} className={fieldClass} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[12px] font-semibold text-[var(--kb-list-muted)]">Data de entrega</span>
        <input type="date" value={dueValue} onChange={(event) => setDueValue(event.target.value)} className={fieldClass} />
      </label>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onSave(startValue || null, dueValue || null)}
          className="flex-1 rounded-md bg-[var(--kb-accent)] px-3.5 py-1.5 text-[13.5px] font-semibold text-white hover:opacity-90"
        >
          Salvar
        </button>
        <button
          type="button"
          onClick={() => onSave(null, null)}
          className="rounded-md bg-[var(--kb-modal-soft)] px-3.5 py-1.5 text-[13.5px] font-medium hover:brightness-95"
        >
          Remover
        </button>
      </div>
    </div>
  )
}

interface LabelsPopoverProps {
  token: string
  boardId: string
  labels: Label[]
  selected: string[]
  onToggle: (label: Label) => void
  onLabelsChange: (labels: Label[]) => void
  onError: (err: unknown) => void
}

function LabelsPopover({ token, boardId, labels, selected, onToggle, onLabelsChange, onError }: LabelsPopoverProps) {
  const [editing, setEditing] = useState<Label | 'new' | null>(null)
  const [name, setName] = useState('')
  const [color, setColor] = useState('green')

  function startEdit(target: Label | 'new') {
    setEditing(target)
    setName(target === 'new' ? '' : target.name ?? '')
    setColor(target === 'new' ? 'green' : target.color)
  }

  async function save() {
    if (!editing) return
    try {
      if (editing === 'new') {
        const created = await createLabel(token, boardId, { name: name.trim(), color })
        onLabelsChange([...labels, created])
      } else {
        const updated = await updateLabel(token, editing.id, { name: name.trim(), color })
        onLabelsChange(labels.map((label) => (label.id === updated.id ? updated : label)))
      }
      setEditing(null)
    } catch (err) {
      onError(err)
    }
  }

  async function remove() {
    if (!editing || editing === 'new') return
    try {
      await deleteLabel(token, editing.id)
      onLabelsChange(labels.filter((label) => label.id !== editing.id))
      setEditing(null)
    } catch (err) {
      onError(err)
    }
  }

  if (editing) {
    return (
      <div>
        <div
          className="mb-3 flex h-10 items-center rounded px-3 text-[14px] font-medium text-[#172b4d]"
          style={{ background: LABEL_COLORS[color] }}
        >
          {name || ' '}
        </div>
        <label className="text-[12px] font-semibold text-[var(--kb-list-muted)]">Título</label>
        <input autoFocus value={name} onChange={(event) => setName(event.target.value)} className={`${fieldClass} mb-3 mt-1`} />
        <p className="mb-1.5 text-[12px] font-semibold text-[var(--kb-list-muted)]">Cor</p>
        <div className="mb-3 grid grid-cols-6 gap-1.5">
          {Object.entries(LABEL_COLORS).map(([key, hex]) => (
            <button
              key={key}
              type="button"
              aria-label={key}
              onClick={() => setColor(key)}
              className={`h-8 rounded-md ${color === key ? 'ring-2 ring-[var(--kb-accent)] ring-offset-2 ring-offset-[var(--kb-modal)]' : ''}`}
              style={{ background: hex }}
            />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={save} className="rounded-md bg-[var(--kb-accent)] px-3.5 py-1.5 text-[13.5px] font-semibold text-white hover:opacity-90">
            Salvar
          </button>
          <button type="button" onClick={() => setEditing(null)} className="rounded-md px-3 py-1.5 text-[13.5px] font-medium hover:bg-[var(--kb-modal-soft)]">
            Voltar
          </button>
          {editing !== 'new' && (
            <button type="button" onClick={remove} className="ml-auto rounded-md bg-[#f87168] px-3 py-1.5 text-[13px] font-semibold text-[#2d0a07]">
              Excluir
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex max-h-72 flex-col gap-1.5 overflow-y-auto">
        {labels.map((label) => (
          <div key={label.id} className="flex items-center gap-2">
            <input type="checkbox" checked={selected.includes(label.id)} onChange={() => onToggle(label)} className="h-4 w-4 flex-none" />
            <button
              type="button"
              onClick={() => onToggle(label)}
              className="flex h-8 flex-1 items-center rounded px-3 text-left text-[14px] font-medium text-[#172b4d]"
              style={{ background: LABEL_COLORS[label.color] }}
            >
              {label.name}
            </button>
            <button
              type="button"
              onClick={() => startEdit(label)}
              aria-label="Editar etiqueta"
              className="rounded p-1.5 text-[var(--kb-list-muted)] hover:bg-[var(--kb-modal-soft)]"
            >
              <PencilIcon className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      <button type="button" onClick={() => startEdit('new')} className="mt-3 w-full rounded-md bg-[var(--kb-modal-soft)] py-1.5 text-[13.5px] font-medium hover:brightness-95">
        Criar uma nova etiqueta
      </button>
    </div>
  )
}
