import { useEffect, useRef } from 'react'
import { connectSocket } from '../lib/socket'
import { CLIENT_ID } from '../lib/api'
import type { KanbanEvent } from '../lib/kanban'

// Escuta o aviso em tempo real do servidor ("alguém mexeu nos quadros") e chama
// onEvent - ignorando o que esta própria aba fez. O aviso não traz conteúdo:
// quem recebe busca de novo pela API.
export function useKanbanEvents(companyId: string, onEvent: (event: KanbanEvent) => void) {
  const handler = useRef(onEvent)
  handler.current = onEvent

  useEffect(() => {
    const socket = connectSocket(companyId)
    const listener = (event: KanbanEvent) => {
      if (event.clientId && event.clientId === CLIENT_ID) return
      handler.current(event)
    }
    const rejoin = () => socket.emit('join:company', { companyId })

    socket.on('kanban:updated', listener)
    // Ao reconectar (rede caiu e voltou) entra na sala de novo e atualiza, pois pode ter perdido avisos.
    socket.on('connect', rejoin)
    socket.on('reconnect', () => handler.current({ type: 'content', boardId: null, clientId: null }))

    return () => {
      socket.off('kanban:updated', listener)
      socket.off('connect', rejoin)
    }
  }, [companyId])
}
