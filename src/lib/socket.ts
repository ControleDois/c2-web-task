import { io, type Socket } from 'socket.io-client'
import { API_BASE_URL } from './api'
import { loadSession } from './auth'

let socket: Socket | null = null

// O servidor só coloca na sala da empresa quem manda o token de login de um usuário dela.
export function joinCompany(target: Socket, companyId: string) {
  target.emit('join:company', { companyId, token: loadSession()?.token?.token })
}

export function connectSocket(companyId: string): Socket {
  if (!socket) {
    socket = io(API_BASE_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    })
  }

  if (socket.connected) {
    joinCompany(socket, companyId)
  } else {
    socket.once('connect', () => socket && joinCompany(socket, companyId))
  }

  return socket
}

export function getSocketId(): string | undefined {
  return socket?.id
}

export function disconnectSocket(): void {
  socket?.disconnect()
  socket = null
}
