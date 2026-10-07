import { useEffect, useRef, useState } from 'react'
import { searchCards, type SearchResult } from '../lib/kanban'
import { SearchIcon } from './kbIcons'

interface SearchBoxProps {
  token: string
  companyId: string
  onPick: (boardId: string, cardId: string) => void
}

// Busca de cartões em todos os quadros da empresa.
export function SearchBox({ token, companyId, onPick }: SearchBoxProps) {
  const [term, setTerm] = useState('')
  const [results, setResults] = useState<SearchResult[] | null>(null)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const query = term.trim()
    if (query.length < 2) {
      setResults(null)
      return
    }
    let cancelled = false
    const timeout = setTimeout(() => {
      searchCards(token, companyId, query)
        .then((res) => {
          if (!cancelled) setResults(res)
        })
        .catch(() => {
          if (!cancelled) setResults([])
        })
    }, 300)
    return () => {
      cancelled = true
      clearTimeout(timeout)
    }
  }, [term, token, companyId])

  useEffect(() => {
    function handlePointer(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handlePointer)
    return () => document.removeEventListener('mousedown', handlePointer)
  }, [])

  return (
    <div ref={ref} className="relative w-full max-w-[320px]">
      <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
      <input
        value={term}
        onChange={(event) => {
          setTerm(event.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        placeholder="Buscar cartões"
        className="w-full rounded-lg border border-[var(--border)] bg-[var(--page)] py-1.5 pl-8 pr-3 text-[13px] text-[var(--ink)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--blue-500)]"
      />
      {open && results && (
        <div className="absolute left-0 top-full z-50 mt-1.5 max-h-80 w-[min(380px,calc(100vw-24px))] overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1.5 shadow-2xl">
          {results.length === 0 ? (
            <p className="px-3 py-2.5 text-[13px] text-[var(--muted)]">Nenhum cartão encontrado.</p>
          ) : (
            results.map((result) => (
              <button
                key={result.card_id}
                type="button"
                onClick={() => {
                  setOpen(false)
                  setTerm('')
                  onPick(result.board_id, result.card_id)
                }}
                className="block w-full rounded-lg px-3 py-2 text-left hover:bg-[var(--page)]"
              >
                <span className="block truncate text-[13.5px] font-medium text-[var(--ink)]">{result.title}</span>
                <span className="block truncate text-[12px] text-[var(--muted)]">
                  {result.board_title} · {result.list_title}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
