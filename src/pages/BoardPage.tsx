import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  archiveList,
  BOARD_BACKGROUNDS,
  createCard,
  createList,
  fetchBoard,
  LABEL_COLORS,
  moveCard,
  renameList,
  reorderLists,
  updateBoard,
  type BoardDetail,
  type Card,
  type Label,
  type List,
} from '../lib/kanban'
import { ApiError } from '../lib/api'
import { CardTile } from '../components/CardTile'
import { CardModal } from '../components/CardModal'
import { ArchiveIcon, ChevronLeftIcon, DotsIcon, FilterIcon, PlusIcon, XIcon } from '../components/kbIcons'
import type { AuthSession } from '../lib/auth'

interface BoardPageProps {
  session: AuthSession
  boardId: string
  onBack: () => void
}

const STEP = 1024

type Dragging = { type: 'card'; id: string } | { type: 'list'; id: string }

function positionBetween(cards: Card[], index: number): number {
  const prev = cards[index - 1]?.position
  const next = cards[index]?.position
  if (prev !== undefined && next !== undefined) return (prev + next) / 2
  if (prev !== undefined) return prev + STEP
  if (next !== undefined) return next / 2
  return STEP
}

export function BoardPage({ session, boardId, onBack }: BoardPageProps) {
  const token = session.token.token
  const [board, setBoard] = useState<BoardDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const [openCardId, setOpenCardId] = useState<string | null>(null)
  const [dragging, setDragging] = useState<Dragging | null>(null)
  const [cardDrop, setCardDrop] = useState<{ listId: string; index: number } | null>(null)
  const [listDropIndex, setListDropIndex] = useState<number | null>(null)

  const [addingCardListId, setAddingCardListId] = useState<string | null>(null)
  const [newCardTitle, setNewCardTitle] = useState('')
  const [addingList, setAddingList] = useState(false)
  const [newListTitle, setNewListTitle] = useState('')
  const [editingListId, setEditingListId] = useState<string | null>(null)
  const [editingListTitle, setEditingListTitle] = useState('')
  const [menuListId, setMenuListId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')

  const [filterOpen, setFilterOpen] = useState(false)
  const [filterText, setFilterText] = useState('')
  const [filterLabels, setFilterLabels] = useState<string[]>([])
  const filtering = filterText.trim() !== '' || filterLabels.length > 0

  const boardRef = useRef<BoardDetail | null>(null)
  boardRef.current = board

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    fetchBoard(token, boardId)
      .then(setBoard)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Não foi possível carregar o quadro.'))
      .finally(() => setLoading(false))
  }, [token, boardId])

  useEffect(() => {
    load()
  }, [load])

  function showNotice(message: string) {
    setNotice(message)
    setTimeout(() => setNotice((current) => (current === message ? null : current)), 4000)
  }

  function patchList(listId: string, patch: Partial<List>) {
    setBoard((current) =>
      current ? { ...current, lists: current.lists.map((list) => (list.id === listId ? { ...list, ...patch } : list)) } : current
    )
  }

  const replaceCard = useCallback((card: Card) => {
    setBoard((current) =>
      current
        ? {
            ...current,
            lists: current.lists.map((list) => {
              const without = list.cards.filter((item) => item.id !== card.id)
              if (list.id !== card.list_id) return { ...list, cards: without }
              const exists = list.cards.some((item) => item.id === card.id)
              return {
                ...list,
                cards: exists ? list.cards.map((item) => (item.id === card.id ? card : item)) : [...without, card],
              }
            }),
          }
        : current
    )
  }, [])

  const removeCard = useCallback((cardId: string) => {
    setBoard((current) =>
      current
        ? { ...current, lists: current.lists.map((list) => ({ ...list, cards: list.cards.filter((card) => card.id !== cardId) })) }
        : current
    )
  }, [])

  const visibleCards = useMemo(() => {
    const term = filterText.trim().toLowerCase()
    return (cards: Card[]) =>
      cards.filter(
        (card) =>
          (!term || card.title.toLowerCase().includes(term)) &&
          (filterLabels.length === 0 || filterLabels.some((id) => card.label_ids.includes(id)))
      )
  }, [filterText, filterLabels])

  // ---------- criar ----------

  async function handleAddCard(list: List) {
    const title = newCardTitle.trim()
    if (!title) return
    setNewCardTitle('')
    try {
      const card = await createCard(token, list.id, title)
      setBoard((current) =>
        current
          ? { ...current, lists: current.lists.map((item) => (item.id === list.id ? { ...item, cards: [...item.cards, card] } : item)) }
          : current
      )
    } catch (err) {
      showNotice(err instanceof ApiError ? err.message : 'Não foi possível criar o cartão.')
    }
  }

  async function handleAddList() {
    const title = newListTitle.trim()
    if (!title) return
    setNewListTitle('')
    try {
      const list = await createList(token, boardId, title)
      setBoard((current) => (current ? { ...current, lists: [...current.lists, list] } : current))
    } catch (err) {
      showNotice(err instanceof ApiError ? err.message : 'Não foi possível criar a lista.')
    }
  }

  async function handleRenameList(list: List) {
    const title = editingListTitle.trim()
    setEditingListId(null)
    if (!title || title === list.title) return
    patchList(list.id, { title })
    try {
      await renameList(token, list.id, title)
    } catch (err) {
      showNotice(err instanceof ApiError ? err.message : 'Não foi possível renomear a lista.')
      load()
    }
  }

  async function handleArchiveList(list: List) {
    setMenuListId(null)
    setBoard((current) => (current ? { ...current, lists: current.lists.filter((item) => item.id !== list.id) } : current))
    try {
      await archiveList(token, list.id)
    } catch (err) {
      showNotice(err instanceof ApiError ? err.message : 'Não foi possível arquivar a lista.')
      load()
    }
  }

  async function handleRenameBoard() {
    const title = titleDraft.trim()
    setEditingTitle(false)
    if (!title || !board || title === board.title) return
    setBoard({ ...board, title })
    try {
      await updateBoard(token, board.id, { title })
    } catch (err) {
      showNotice(err instanceof ApiError ? err.message : 'Não foi possível renomear o quadro.')
      load()
    }
  }

  // ---------- arrastar e soltar ----------

  function cardIndexAt(container: HTMLElement, clientY: number, skipId: string | null): number {
    const elements = Array.from(container.querySelectorAll<HTMLElement>('[data-card-id]')).filter(
      (element) => element.dataset.cardId !== skipId
    )
    for (let index = 0; index < elements.length; index++) {
      const rect = elements[index].getBoundingClientRect()
      if (clientY < rect.top + rect.height / 2) return index
    }
    return elements.length
  }

  function listIndexAt(container: HTMLElement, clientX: number, skipId: string | null): number {
    const elements = Array.from(container.querySelectorAll<HTMLElement>('[data-list-id]')).filter(
      (element) => element.dataset.listId !== skipId
    )
    for (let index = 0; index < elements.length; index++) {
      const rect = elements[index].getBoundingClientRect()
      if (clientX < rect.left + rect.width / 2) return index
    }
    return elements.length
  }

  function endDrag() {
    setDragging(null)
    setCardDrop(null)
    setListDropIndex(null)
  }

  async function dropCard(listId: string, index: number) {
    const current = boardRef.current
    if (!current || !dragging || dragging.type !== 'card') return
    const cardId = dragging.id
    endDrag()

    const card = current.lists.flatMap((list) => list.cards).find((item) => item.id === cardId)
    const target = current.lists.find((list) => list.id === listId)
    if (!card || !target) return

    const targetCards = target.cards.filter((item) => item.id !== cardId)
    const position = positionBetween(targetCards, index)
    const moved: Card = { ...card, list_id: listId, position }

    setBoard({
      ...current,
      lists: current.lists.map((list) => {
        const without = list.cards.filter((item) => item.id !== cardId)
        if (list.id !== listId) return { ...list, cards: without }
        return { ...list, cards: [...without, moved].sort((a, b) => a.position - b.position) }
      }),
    })

    try {
      await moveCard(token, cardId, listId, position)
    } catch (err) {
      showNotice(err instanceof ApiError ? err.message : 'Não foi possível mover o cartão.')
      load()
    }
  }

  async function dropList(index: number) {
    const current = boardRef.current
    if (!current || !dragging || dragging.type !== 'list') return
    const listId = dragging.id
    endDrag()

    const moving = current.lists.find((list) => list.id === listId)
    if (!moving) return
    const rest = current.lists.filter((list) => list.id !== listId)
    const lists = [...rest.slice(0, index), moving, ...rest.slice(index)]
    setBoard({ ...current, lists })

    try {
      await reorderLists(token, current.id, lists.map((list) => list.id))
    } catch (err) {
      showNotice(err instanceof ApiError ? err.message : 'Não foi possível reordenar as listas.')
      load()
    }
  }

  if (loading && !board) {
    return (
      <div className="flex h-full items-center justify-center bg-[var(--page)]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--blue-300)] border-t-[var(--blue-500)]" />
      </div>
    )
  }

  if (error || !board) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-[var(--page)] p-6 text-center">
        <p className="text-[14px] font-medium text-[var(--red-500)]">{error ?? 'Quadro não encontrado.'}</p>
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg bg-[var(--surface)] px-4 py-2 text-[13px] font-bold text-[var(--ink)] shadow"
        >
          Voltar para os quadros
        </button>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col" style={{ background: BOARD_BACKGROUNDS[board.background] ?? BOARD_BACKGROUNDS.blue }}>
      <div className="flex flex-none flex-wrap items-center gap-2 bg-black/25 px-4 py-2.5 text-white backdrop-blur">
        <button
          type="button"
          onClick={onBack}
          aria-label="Voltar para os quadros"
          className="rounded-lg p-1.5 hover:bg-white/20"
        >
          <ChevronLeftIcon className="h-5 w-5" />
        </button>
        {editingTitle ? (
          <input
            autoFocus
            value={titleDraft}
            onChange={(event) => setTitleDraft(event.target.value)}
            onBlur={handleRenameBoard}
            onKeyDown={(event) => {
              if (event.key === 'Enter') handleRenameBoard()
              if (event.key === 'Escape') setEditingTitle(false)
            }}
            className="rounded-md bg-white px-2.5 py-1 text-[17px] font-bold text-[#172b4d] focus:outline-none focus:ring-2 focus:ring-[#579dff]"
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setTitleDraft(board.title)
              setEditingTitle(true)
            }}
            className="rounded-md px-2.5 py-1 text-[17px] font-bold hover:bg-white/20"
          >
            {board.title}
          </button>
        )}

        <div className="ml-auto flex items-center gap-2">
          {filtering && (
            <button
              type="button"
              onClick={() => {
                setFilterText('')
                setFilterLabels([])
              }}
              className="flex items-center gap-1 rounded-md bg-white/20 px-2.5 py-1.5 text-[13px] font-semibold hover:bg-white/30"
            >
              <XIcon className="h-3.5 w-3.5" />
              Limpar filtros
            </button>
          )}
          <div className="relative">
            <button
              type="button"
              onClick={() => setFilterOpen((open) => !open)}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] font-semibold hover:bg-white/30 ${
                filtering ? 'bg-white/30' : 'bg-white/15'
              }`}
            >
              <FilterIcon className="h-4 w-4" />
              Filtros
            </button>
            {filterOpen && (
              <div className="absolute right-0 top-full z-50 mt-1.5 w-72 rounded-xl border border-[var(--border)] bg-[var(--kb-modal)] p-3 text-[var(--kb-card-ink)] shadow-2xl">
                <label className="text-[12px] font-semibold text-[var(--kb-list-muted)]">Palavra-chave</label>
                <input
                  value={filterText}
                  onChange={(event) => setFilterText(event.target.value)}
                  placeholder="Buscar cartões…"
                  className="mt-1 w-full rounded-md bg-[var(--kb-modal-soft)] px-2.5 py-1.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-[var(--kb-accent)]"
                />
                <p className="mb-1.5 mt-3 text-[12px] font-semibold text-[var(--kb-list-muted)]">Etiquetas</p>
                <div className="flex flex-col gap-1">
                  {board.labels.map((label: Label) => (
                    <label key={label.id} className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={filterLabels.includes(label.id)}
                        onChange={() =>
                          setFilterLabels((current) =>
                            current.includes(label.id) ? current.filter((id) => id !== label.id) : [...current, label.id]
                          )
                        }
                      />
                      <span
                        className="flex h-7 flex-1 items-center rounded px-2 text-[13px] font-medium text-[#172b4d]"
                        style={{ background: LABEL_COLORS[label.color] }}
                      >
                        {label.name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {notice && (
        <p className="mx-4 mt-3 rounded-lg bg-[#f87168] px-3.5 py-2 text-[13px] font-semibold text-[#2d0a07]">{notice}</p>
      )}

      <div
        className="kb-scroll flex min-h-0 flex-1 items-start gap-3 overflow-x-auto overflow-y-hidden p-4"
        onDragOver={(event) => {
          if (dragging?.type !== 'list') return
          event.preventDefault()
          setListDropIndex(listIndexAt(event.currentTarget, event.clientX, dragging.id))
        }}
        onDrop={(event) => {
          if (dragging?.type !== 'list') return
          event.preventDefault()
          dropList(listIndexAt(event.currentTarget, event.clientX, dragging.id))
        }}
      >
        {board.lists.map((list, listIndex) => {
          const cards = visibleCards(list.cards)
          const showListMarker =
            dragging?.type === 'list' && listDropIndex === listIndex && dragging.id !== list.id
          return (
            <div key={list.id} className="flex flex-none items-start gap-3">
              {showListMarker && <div className="h-24 w-1.5 flex-none rounded-full bg-white/70" />}
              <section
                data-list-id={list.id}
                className="flex max-h-full w-[272px] flex-none flex-col rounded-xl bg-[var(--kb-list)] text-[var(--kb-list-ink)]"
                style={{ boxShadow: 'var(--kb-shadow)', opacity: dragging?.type === 'list' && dragging.id === list.id ? 0.4 : 1 }}
              >
                <header
                  draggable={editingListId !== list.id && !filtering}
                  onDragStart={(event) => {
                    event.dataTransfer.setData('text/plain', list.id)
                    setDragging({ type: 'list', id: list.id })
                  }}
                  onDragEnd={endDrag}
                  className="relative flex cursor-grab items-start gap-1 px-3 pb-1 pt-2.5"
                >
                  {editingListId === list.id ? (
                    <input
                      autoFocus
                      value={editingListTitle}
                      onChange={(event) => setEditingListTitle(event.target.value)}
                      onBlur={() => handleRenameList(list)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') handleRenameList(list)
                        if (event.key === 'Escape') setEditingListId(null)
                      }}
                      className="min-w-0 flex-1 rounded-md bg-white px-2 py-1 text-[14px] font-semibold text-[#172b4d] focus:outline-none focus:ring-2 focus:ring-[#579dff]"
                    />
                  ) : (
                    <h2
                      onClick={() => {
                        setEditingListId(list.id)
                        setEditingListTitle(list.title)
                      }}
                      className="min-w-0 flex-1 cursor-pointer break-words px-1 py-1 text-[14px] font-semibold"
                    >
                      {list.title}
                    </h2>
                  )}
                  <button
                    type="button"
                    onClick={() => setMenuListId((current) => (current === list.id ? null : list.id))}
                    aria-label="Ações da lista"
                    className="rounded-md p-1.5 text-[var(--kb-list-muted)] hover:bg-black/10"
                  >
                    <DotsIcon className="h-4 w-4" />
                  </button>
                  {menuListId === list.id && (
                    <div className="absolute right-2 top-9 z-40 w-56 rounded-xl border border-[var(--border)] bg-[var(--kb-modal)] p-1.5 text-[var(--kb-card-ink)] shadow-2xl">
                      <button
                        type="button"
                        onClick={() => {
                          setMenuListId(null)
                          setAddingCardListId(list.id)
                        }}
                        className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[13.5px] hover:bg-[var(--kb-modal-soft)]"
                      >
                        <PlusIcon className="h-4 w-4" />
                        Adicionar cartão
                      </button>
                      <button
                        type="button"
                        onClick={() => handleArchiveList(list)}
                        className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[13.5px] hover:bg-[var(--kb-modal-soft)]"
                      >
                        <ArchiveIcon className="h-4 w-4" />
                        Arquivar esta lista
                      </button>
                    </div>
                  )}
                </header>

                <div
                  className="kb-scroll flex min-h-[8px] flex-col gap-2 overflow-y-auto px-2 pb-1 pt-1"
                  onDragOver={(event) => {
                    if (dragging?.type !== 'card') return
                    event.preventDefault()
                    event.stopPropagation()
                    setCardDrop({ listId: list.id, index: cardIndexAt(event.currentTarget, event.clientY, dragging.id) })
                  }}
                  onDrop={(event) => {
                    if (dragging?.type !== 'card') return
                    event.preventDefault()
                    event.stopPropagation()
                    dropCard(list.id, cardIndexAt(event.currentTarget, event.clientY, dragging.id))
                  }}
                >
                  {cards.map((card, cardIndex) => (
                    <div key={card.id} className="flex flex-col gap-2">
                      {cardDrop?.listId === list.id && cardDrop.index === cardIndex && dragging?.id !== card.id && (
                        <div className="h-9 rounded-lg bg-black/15" />
                      )}
                      <CardTile
                        card={card}
                        labels={board.labels}
                        dragging={dragging?.type === 'card' && dragging.id === card.id}
                        draggable={!filtering}
                        onOpen={() => setOpenCardId(card.id)}
                        onDragStart={() => setDragging({ type: 'card', id: card.id })}
                        onDragEnd={endDrag}
                      />
                    </div>
                  ))}
                  {cardDrop?.listId === list.id && cardDrop.index >= cards.filter((c) => c.id !== dragging?.id).length && (
                    <div className="h-9 rounded-lg bg-black/15" />
                  )}
                </div>

                {addingCardListId === list.id ? (
                  <div className="px-2 pb-2">
                    <textarea
                      autoFocus
                      value={newCardTitle}
                      onChange={(event) => setNewCardTitle(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' && !event.shiftKey) {
                          event.preventDefault()
                          handleAddCard(list)
                        }
                        if (event.key === 'Escape') {
                          setAddingCardListId(null)
                          setNewCardTitle('')
                        }
                      }}
                      rows={3}
                      placeholder="Insira um título para este cartão…"
                      className="w-full resize-none rounded-lg bg-[var(--kb-card)] px-3 py-2 text-[14px] text-[var(--kb-card-ink)] placeholder:text-[var(--kb-list-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--kb-accent)]"
                      style={{ boxShadow: 'var(--kb-shadow)' }}
                    />
                    <div className="mt-2 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleAddCard(list)}
                        className="rounded-md bg-[var(--kb-accent)] px-3 py-1.5 text-[13.5px] font-semibold text-white hover:opacity-90"
                      >
                        Adicionar cartão
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAddingCardListId(null)
                          setNewCardTitle('')
                        }}
                        aria-label="Cancelar"
                        className="rounded-md p-1.5 text-[var(--kb-list-muted)] hover:bg-black/10"
                      >
                        <XIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setAddingCardListId(list.id)
                      setNewCardTitle('')
                    }}
                    className="m-1.5 flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[14px] text-[var(--kb-list-muted)] hover:bg-black/10"
                  >
                    <PlusIcon className="h-4 w-4" />
                    Adicionar um cartão
                  </button>
                )}
              </section>
            </div>
          )
        })}

        {dragging?.type === 'list' && listDropIndex !== null && listDropIndex >= board.lists.filter((l) => l.id !== dragging.id).length && (
          <div className="h-24 w-1.5 flex-none rounded-full bg-white/70" />
        )}

        <div className="w-[272px] flex-none">
          {addingList ? (
            <div className="rounded-xl bg-[var(--kb-list)] p-2" style={{ boxShadow: 'var(--kb-shadow)' }}>
              <input
                autoFocus
                value={newListTitle}
                onChange={(event) => setNewListTitle(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') handleAddList()
                  if (event.key === 'Escape') {
                    setAddingList(false)
                    setNewListTitle('')
                  }
                }}
                placeholder="Insira o título da lista…"
                className="w-full rounded-md bg-[var(--kb-card)] px-3 py-2 text-[14px] text-[var(--kb-card-ink)] placeholder:text-[var(--kb-list-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--kb-accent)]"
              />
              <div className="mt-2 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleAddList}
                  className="rounded-md bg-[var(--kb-accent)] px-3 py-1.5 text-[13.5px] font-semibold text-white hover:opacity-90"
                >
                  Adicionar lista
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAddingList(false)
                    setNewListTitle('')
                  }}
                  aria-label="Cancelar"
                  className="rounded-md p-1.5 text-[var(--kb-list-muted)] hover:bg-black/10"
                >
                  <XIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAddingList(true)}
              className="flex w-full items-center gap-2 rounded-xl bg-white/25 px-3.5 py-2.5 text-left text-[14px] font-semibold text-white backdrop-blur hover:bg-white/35"
            >
              <PlusIcon className="h-4 w-4" />
              Adicionar outra lista
            </button>
          )}
        </div>
      </div>

      {openCardId && (
        <CardModal
          token={token}
          cardId={openCardId}
          board={board}
          onClose={() => setOpenCardId(null)}
          onCardChange={replaceCard}
          onCardRemoved={(cardId) => {
            removeCard(cardId)
            setOpenCardId(null)
          }}
          onLabelsChange={(labels) => setBoard((current) => (current ? { ...current, labels } : current))}
        />
      )}
    </div>
  )
}
