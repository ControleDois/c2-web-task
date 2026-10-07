export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  return `${parts[0][0]}${parts.length > 1 ? parts[parts.length - 1][0] : ''}`.toUpperCase()
}

const AVATAR_COLORS = ['#1d7afc', '#2abb7f', '#8270db', '#e5493a', '#f5a623', '#1fb6d4', '#e774bb']

export function avatarColor(seed: string): string {
  let hash = 0
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

function parseDate(value: string): Date {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function formatShortDate(value: string): string {
  return parseDate(value).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace('.', '')
}

export function formatFullDate(value: string): string {
  return parseDate(value).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' }).replace('.', '')
}

export type DueState = 'complete' | 'overdue' | 'soon' | 'normal'

export function dueState(due: string, complete: boolean): DueState {
  if (complete) return 'complete'
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = (parseDate(due).getTime() - today.getTime()) / 86400000
  if (diff < 0) return 'overdue'
  if (diff <= 1) return 'soon'
  return 'normal'
}

export const DUE_STYLES: Record<DueState, string> = {
  complete: 'bg-[#4bce97] text-[#09326c]',
  overdue: 'bg-[#f87168] text-[#2d0a07]',
  soon: 'bg-[#e2b203] text-[#2a1e00]',
  normal: 'bg-transparent text-[var(--kb-list-muted)]',
}

export function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('pt-BR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatBytes(bytes?: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
