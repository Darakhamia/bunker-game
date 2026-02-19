/**
 * Singleton socket.io-client instance.
 *
 * Call `getSocket()` from any client component.
 * The socket is lazily initialized on first call and reused thereafter.
 * Always access inside `useEffect` or event handlers — never at module
 * top-level, since `window` is undefined during SSR.
 */
import { io, Socket } from 'socket.io-client'
import type { ClientToServerEvents, ServerToClientEvents } from '@/server/types'

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>

let socket: AppSocket | null = null

export function getSocket(): AppSocket {
  if (!socket) {
    socket = io({
      // Connects to the same origin as the page (our custom HTTP server)
      autoConnect: false,
      reconnection: false, // We handle reconnection manually via localStorage
      transports: ['websocket', 'polling'],
    })
  }
  return socket
}

export function destroySocket(): void {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
