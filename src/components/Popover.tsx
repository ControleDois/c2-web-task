import { useEffect, useRef, type ReactNode } from 'react'
import { XIcon } from './kbIcons'

interface PopoverProps {
  title: string
  onClose: () => void
  children: ReactNode
  width?: number
}

// Janela pequena ancorada no botão que a abriu (etiquetas, datas, membros...).
export function Popover({ title, onClose, children, width = 304 }: PopoverProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handlePointer(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) onClose()
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
      }
    }
    document.addEventListener('mousedown', handlePointer)
    document.addEventListener('keydown', handleKey, true)
    return () => {
      document.removeEventListener('mousedown', handlePointer)
      document.removeEventListener('keydown', handleKey, true)
    }
  }, [onClose])

  return (
    <div
      ref={ref}
      style={{ width }}
      className="absolute left-0 top-full z-[70] mt-1.5 max-w-[calc(100vw-32px)] rounded-xl border border-[var(--border)] bg-[var(--kb-modal)] p-3 shadow-2xl"
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="flex-1 text-center text-[13px] font-semibold text-[var(--kb-card-ink)]">{title}</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="rounded p-1 text-[var(--kb-list-muted)] hover:bg-[var(--kb-modal-soft)]"
        >
          <XIcon className="h-4 w-4" />
        </button>
      </div>
      {children}
    </div>
  )
}
