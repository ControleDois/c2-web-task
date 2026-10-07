import { apiDelete, apiGet, apiPost, apiPostForm, apiPut } from './api'

export const LABEL_COLORS: Record<string, string> = {
  green: '#4bce97',
  yellow: '#e2b203',
  orange: '#faa53d',
  red: '#f87168',
  purple: '#9f8fef',
  blue: '#579dff',
}

export const BOARD_BACKGROUNDS: Record<string, string> = {
  blue: 'linear-gradient(135deg, #1d7afc 0%, #09326c 100%)',
  purple: 'linear-gradient(135deg, #8270db 0%, #352c63 100%)',
  green: 'linear-gradient(135deg, #2abb7f 0%, #164b35 100%)',
  orange: 'linear-gradient(135deg, #f5a623 0%, #7a3e00 100%)',
  red: 'linear-gradient(135deg, #e5493a 0%, #601e16 100%)',
  pink: 'linear-gradient(135deg, #e774bb 0%, #50253f 100%)',
  teal: 'linear-gradient(135deg, #1fb6d4 0%, #0b414e 100%)',
  gray: 'linear-gradient(135deg, #8590a2 0%, #2c333a 100%)',
}

export interface BoardSummary {
  id: string
  title: string
  background: string
  is_default: boolean
}

export interface Label {
  id: string
  name: string | null
  color: string
}

export interface Member {
  id: string
  name: string
}

export interface Card {
  id: string
  list_id: string
  title: string
  position: number
  has_description: boolean
  due: string | null
  due_complete: boolean
  start: string | null
  cover_color: string | null
  cover_url: string | null
  label_ids: string[]
  members: Member[]
  checklist: { total: number; done: number }
  attachments: number
  comments: number
}

export interface List {
  id: string
  title: string
  position: number
  cards: Card[]
}

export interface BoardDetail extends BoardSummary {
  labels: Label[]
  members: Member[]
  lists: List[]
}

export interface ChecklistItem {
  id: string
  text: string
  checked: boolean
}

export interface Checklist {
  id: string
  title: string
  items: ChecklistItem[]
}

export interface CardFile {
  id: string
  title: string | null
  file_name: string
  file_url: string
  file_size: number | null
  is_image: boolean
  created_at: string
}

export interface FeedEntry {
  kind: 'comment' | 'activity'
  id: string
  text: string
  author: Member | null
  created_at: string
}

export interface CardDetail extends Card {
  description: string
  board_id: string
  list_title: string
  cover_file_id: string | null
  checklists: Checklist[]
  files: CardFile[]
  activity: FeedEntry[]
}

export const fetchBoards = (token: string, companyId: string) =>
  apiGet<BoardSummary[]>('/kanban/boards', { companyId }, token)

export const createBoard = (token: string, payload: { companyId: string; title: string; background: string }) =>
  apiPost<BoardSummary>('/kanban/boards', payload, token)

export const updateBoard = (token: string, id: string, payload: { title?: string; background?: string }) =>
  apiPut<BoardSummary>(`/kanban/boards/${id}`, payload, token)

export const deleteBoard = (token: string, id: string) => apiDelete<unknown>(`/kanban/boards/${id}`, token)

export const fetchBoard = (token: string, id: string) => apiGet<BoardDetail>(`/kanban/boards/${id}`, {}, token)

export const createList = (token: string, boardId: string, title: string) =>
  apiPost<List>('/kanban/lists', { boardId, title }, token)

export const renameList = (token: string, id: string, title: string) =>
  apiPut<unknown>(`/kanban/lists/${id}`, { title }, token)

export const archiveList = (token: string, id: string) => apiPost<unknown>(`/kanban/lists/${id}/archive`, {}, token)

export const reorderLists = (token: string, boardId: string, ids: string[]) =>
  apiPost<unknown>(`/kanban/boards/${boardId}/lists/reorder`, { ids }, token)

export const createCard = (token: string, listId: string, title: string) =>
  apiPost<Card>('/kanban/cards', { listId, title }, token)

export const fetchCard = (token: string, id: string) => apiGet<CardDetail>(`/kanban/cards/${id}`, {}, token)

export const updateCard = (token: string, id: string, payload: Record<string, unknown>) =>
  apiPut<CardDetail>(`/kanban/cards/${id}`, payload, token)

export const moveCard = (token: string, id: string, listId: string, position: number) =>
  apiPost<unknown>(`/kanban/cards/${id}/move`, { listId, position }, token)

export const deleteCard = (token: string, id: string) => apiDelete<unknown>(`/kanban/cards/${id}`, token)

export const toggleCardLabel = (token: string, cardId: string, labelId: string) =>
  apiPost<unknown>(`/kanban/cards/${cardId}/labels/${labelId}`, {}, token)

export const toggleCardMember = (token: string, cardId: string, peopleId: string) =>
  apiPost<unknown>(`/kanban/cards/${cardId}/members/${peopleId}`, {}, token)

export const createLabel = (token: string, boardId: string, payload: { name: string; color: string }) =>
  apiPost<Label>(`/kanban/boards/${boardId}/labels`, payload, token)

export const updateLabel = (token: string, id: string, payload: { name?: string; color?: string }) =>
  apiPut<Label>(`/kanban/labels/${id}`, payload, token)

export const deleteLabel = (token: string, id: string) => apiDelete<unknown>(`/kanban/labels/${id}`, token)

export const createChecklist = (token: string, cardId: string, title: string) =>
  apiPost<Checklist>(`/kanban/cards/${cardId}/checklists`, { title }, token)

export const renameChecklist = (token: string, id: string, title: string) =>
  apiPut<unknown>(`/kanban/checklists/${id}`, { title }, token)

export const deleteChecklist = (token: string, id: string) => apiDelete<unknown>(`/kanban/checklists/${id}`, token)

export const createChecklistItem = (token: string, checklistId: string, text: string) =>
  apiPost<ChecklistItem>(`/kanban/checklists/${checklistId}/items`, { text }, token)

export const updateChecklistItem = (token: string, id: string, payload: { text?: string; checked?: boolean }) =>
  apiPut<ChecklistItem>(`/kanban/checklist-items/${id}`, payload, token)

export const deleteChecklistItem = (token: string, id: string) =>
  apiDelete<unknown>(`/kanban/checklist-items/${id}`, token)

export const createComment = (token: string, cardId: string, body: string) =>
  apiPost<unknown>(`/kanban/cards/${cardId}/comments`, { body }, token)

export const deleteComment = (token: string, id: string) => apiDelete<unknown>(`/kanban/comments/${id}`, token)

export function uploadCardFile(token: string, cardId: string, file: File) {
  const form = new FormData()
  form.append('file', file)
  return apiPostForm<unknown>(`/kanban/cards/${cardId}/files`, form, token)
}

export const deleteCardFile = (token: string, id: string) => apiDelete<unknown>(`/kanban/files/${id}`, token)

export function summarize(detail: CardDetail): Card {
  return {
    id: detail.id,
    list_id: detail.list_id,
    title: detail.title,
    position: detail.position,
    has_description: Boolean(detail.description && detail.description.trim()),
    due: detail.due,
    due_complete: detail.due_complete,
    start: detail.start,
    cover_color: detail.cover_color,
    cover_url: detail.cover_url,
    label_ids: detail.label_ids,
    members: detail.members,
    checklist: {
      total: detail.checklists.reduce((sum, list) => sum + list.items.length, 0),
      done: detail.checklists.reduce((sum, list) => sum + list.items.filter((item) => item.checked).length, 0),
    },
    attachments: detail.files.length,
    comments: detail.activity.filter((entry) => entry.kind === 'comment').length,
  }
}

export interface ArchivedItems {
  lists: { id: string; title: string }[]
  cards: { id: string; title: string; list_title: string }[]
}

export interface SearchResult {
  card_id: string
  title: string
  list_title: string
  board_id: string
  board_title: string
}

export const fetchArchived = (token: string, boardId: string) =>
  apiGet<ArchivedItems>(`/kanban/boards/${boardId}/archived`, {}, token)

export const restoreList = (token: string, id: string) => apiPost<unknown>(`/kanban/lists/${id}/restore`, {}, token)

export const duplicateCard = (token: string, id: string) => apiPost<Card>(`/kanban/cards/${id}/duplicate`, {}, token)

export const searchCards = (token: string, companyId: string, q: string) =>
  apiGet<SearchResult[]>('/kanban/search', { companyId, q }, token)

export const reorderChecklistItems = (token: string, checklistId: string, ids: string[]) =>
  apiPost<unknown>(`/kanban/checklists/${checklistId}/items/reorder`, { ids }, token)

export interface KanbanEvent {
  type: 'board' | 'content'
  boardId: string | null
  clientId: string | null
}
