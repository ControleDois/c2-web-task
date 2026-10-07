import { useEffect, useState, type FormEvent } from 'react'
import {
  BOARD_BACKGROUNDS,
  createBoard,
  deleteBoard,
  fetchBoards,
  type BoardSummary,
} from '../lib/kanban'
import { ApiError } from '../lib/api'
import { useKanbanEvents } from '../hooks/useKanbanEvents'
import { BoardIcon, PlusIcon, TrashIcon, XIcon } from '../components/kbIcons'
import type { AuthSession, AuthCompany } from '../lib/auth'

interface BoardsPageProps {
  session: AuthSession
  company: AuthCompany
  onOpen: (boardId: string) => void
}

export function BoardsPage({ session, company, onOpen }: BoardsPageProps) {
  const token = session.token.token
  const [boards, setBoards] = useState<BoardSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [title, setTitle] = useState('')
  const [background, setBackground] = useState('blue')
  const [saving, setSaving] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [deleteTarget, setDeleteTarget] = useState<BoardSummary | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchBoards(token, company.id)
      .then((res) => {
        if (!cancelled) setBoards(res)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Não foi possível carregar os quadros.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [token, company.id, reloadKey])

  useKanbanEvents(company.id, (event) => {
    if (event.type === 'board') setReloadKey((key) => key + 1)
  })

  async function handleCreate(event: FormEvent) {
    event.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    setError(null)
    try {
      const board = await createBoard(token, { companyId: company.id, title: title.trim(), background })
      setCreating(false)
      setTitle('')
      onOpen(board.id)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível criar o quadro.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setSaving(true)
    try {
      await deleteBoard(token, deleteTarget.id)
      setDeleteTarget(null)
      setReloadKey((key) => key + 1)
    } catch (err) {
      setDeleteTarget(null)
      setError(err instanceof ApiError ? err.message : 'Não foi possível excluir o quadro.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="h-full overflow-y-auto bg-[var(--page)] px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-[920px]">
        <h1 className="mb-5 flex items-center gap-2 text-[16px] font-bold text-[var(--ink)]">
          <BoardIcon className="h-5 w-5" />
          Seus quadros
        </h1>

        {error && <p className="mb-4 rounded-lg bg-[var(--red-100)] px-4 py-3 text-[13px] font-medium text-[var(--red-500)]">{error}</p>}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {loading
            ? Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-24 animate-pulse rounded-lg bg-[var(--surface)]" />)
            : boards.map((board) => (
                <div key={board.id} className="group relative">
                  <button
                    type="button"
                    onClick={() => onOpen(board.id)}
                    className="flex h-24 w-full items-start rounded-lg p-3 text-left text-[15px] font-bold text-white shadow transition hover:brightness-110"
                    style={{ background: BOARD_BACKGROUNDS[board.background] ?? BOARD_BACKGROUNDS.blue }}
                  >
                    <span className="line-clamp-2 drop-shadow">{board.title}</span>
                  </button>
                  {!board.is_default && (
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(board)}
                      aria-label="Excluir quadro"
                      className="absolute bottom-2 right-2 rounded bg-black/40 p-1.5 text-white opacity-0 transition hover:bg-black/60 group-hover:opacity-100"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}

          {!loading && (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="flex h-24 flex-col items-center justify-center gap-1 rounded-lg bg-[var(--surface)] text-[14px] font-semibold text-[var(--ink-soft)] shadow-sm transition hover:text-[var(--ink)]"
            >
              <PlusIcon className="h-5 w-5" />
              Criar novo quadro
            </button>
          )}
        </div>
      </div>

      {creating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onMouseDown={(event) => event.target === event.currentTarget && setCreating(false)}>
          <form onSubmit={handleCreate} className="w-full max-w-[320px] rounded-xl bg-[var(--surface)] p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <span className="flex-1 text-center text-[14px] font-semibold text-[var(--ink)]">Criar quadro</span>
              <button type="button" onClick={() => setCreating(false)} aria-label="Fechar" className="rounded p-1 text-[var(--muted)] hover:bg-[var(--page)]">
                <XIcon className="h-4 w-4" />
              </button>
            </div>

            <div
              className="mb-4 flex h-24 items-center justify-center rounded-lg text-[15px] font-bold text-white"
              style={{ background: BOARD_BACKGROUNDS[background] }}
            >
              {title || 'Título do quadro'}
            </div>

            <p className="mb-1.5 text-[12px] font-semibold text-[var(--ink-soft)]">Fundo</p>
            <div className="mb-4 grid grid-cols-4 gap-2">
              {Object.entries(BOARD_BACKGROUNDS).map(([key, gradient]) => (
                <button
                  key={key}
                  type="button"
                  aria-label={key}
                  onClick={() => setBackground(key)}
                  className={`h-9 rounded-md ${background === key ? 'ring-2 ring-[var(--blue-500)] ring-offset-2 ring-offset-[var(--surface)]' : ''}`}
                  style={{ background: gradient }}
                />
              ))}
            </div>

            <label className="text-[12px] font-semibold text-[var(--ink-soft)]">Título do quadro *</label>
            <input
              autoFocus
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="mb-4 mt-1 w-full rounded-md bg-[var(--page)] px-3 py-2 text-[14px] text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--blue-500)]"
            />
            <button
              type="submit"
              disabled={saving || !title.trim()}
              className="w-full rounded-md bg-[var(--blue-500)] py-2 text-[14px] font-semibold text-white hover:bg-[var(--blue-700)] disabled:opacity-50"
            >
              {saving ? 'Criando…' : 'Criar'}
            </button>
          </form>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onMouseDown={(event) => event.target === event.currentTarget && setDeleteTarget(null)}>
          <div className="w-full max-w-[340px] rounded-xl bg-[var(--surface)] p-5 shadow-2xl">
            <h2 className="text-[15px] font-bold text-[var(--ink)]">Excluir quadro?</h2>
            <p className="mt-1.5 text-[13px] text-[var(--ink-soft)]">
              O quadro “{deleteTarget.title}” sai da lista. Os cartões ficam guardados no sistema.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={handleDelete}
                disabled={saving}
                className="flex-1 rounded-md bg-[var(--red-500)] py-2 text-[13.5px] font-semibold text-white disabled:opacity-60"
              >
                Excluir
              </button>
              <button type="button" onClick={() => setDeleteTarget(null)} className="flex-1 rounded-md py-2 text-[13.5px] font-medium text-[var(--ink-soft)] hover:bg-[var(--page)]">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
