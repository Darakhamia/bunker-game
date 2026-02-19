import type { Server, Socket } from 'socket.io'
import {
  createGame,
  joinGame,
  startGame,
  revealNext,
  getPublicState,
  setPlayerConnected,
  transferHostIfNeeded,
  updateSettings,
  reconnectPlayer,
  findRoomBySocketId,
} from './gameManager'
import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from './types'

type AppServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>

type AppSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>

export function registerSocketHandlers(io: AppServer): void {
  io.on('connection', (socket: AppSocket) => {
    console.log(`[socket] connected: ${socket.id}`)

    // ── Create a new lobby ────────────────────────────────────────────────────
    socket.on('lobby:create', ({ nickname, maxPlayers, enabledCategories }) => {
      const trimmed = nickname.trim()
      if (!trimmed) {
        socket.emit('error', 'Nickname cannot be empty')
        return
      }

      const state = createGame(socket.id, trimmed, maxPlayers, enabledCategories)
      socket.join(state.roomCode)
      socket.emit('game:state', getPublicState(state))
      console.log(`[game] Room ${state.roomCode} created by ${trimmed}`)
    })

    // ── Join an existing lobby ────────────────────────────────────────────────
    socket.on('lobby:join', ({ roomCode, nickname }) => {
      const code = roomCode.trim().toUpperCase()
      const trimmed = nickname.trim()

      if (!code) {
        socket.emit('error', 'Room code cannot be empty')
        return
      }
      if (!trimmed) {
        socket.emit('error', 'Nickname cannot be empty')
        return
      }

      const { state, error } = joinGame(code, socket.id, trimmed)
      if (error || !state) {
        socket.emit('error', error ?? 'Failed to join room')
        return
      }

      socket.join(code)
      // Broadcast updated state to everyone in the room
      io.to(code).emit('game:state', getPublicState(state))
      console.log(`[game] ${trimmed} joined room ${code}`)
    })

    // ── Update lobby settings (host only) ─────────────────────────────────────
    socket.on('lobby:update-settings', ({ maxPlayers, enabledCategories }) => {
      const roomCode = findRoomBySocketId(socket.id)
      if (!roomCode) {
        socket.emit('error', 'You are not in a room')
        return
      }

      const { state, error } = updateSettings(roomCode, socket.id, maxPlayers, enabledCategories)
      if (error || !state) {
        socket.emit('error', error ?? 'Failed to update settings')
        return
      }

      io.to(roomCode).emit('game:state', getPublicState(state))
    })

    // ── Start game (host only) ─────────────────────────────────────────────────
    socket.on('game:start', () => {
      const roomCode = findRoomBySocketId(socket.id)
      if (!roomCode) {
        socket.emit('error', 'You are not in a room')
        return
      }

      const { state, error } = startGame(roomCode, socket.id)
      if (error || !state) {
        socket.emit('error', error ?? 'Failed to start game')
        return
      }

      // SECURITY: send each player only their own character card
      for (const player of state.players) {
        io.to(player.id).emit('player:character', player.character)
      }

      // Broadcast the public state (no private character data)
      io.to(roomCode).emit('game:state', getPublicState(state))
      console.log(`[game] Room ${roomCode} started with ${state.players.length} players`)
    })

    // ── Reveal next attribute (host only) ─────────────────────────────────────
    socket.on('game:reveal-next', () => {
      const roomCode = findRoomBySocketId(socket.id)
      if (!roomCode) {
        socket.emit('error', 'You are not in a room')
        return
      }

      const { state, error, revealedField } = revealNext(roomCode, socket.id)
      if (error || !state) {
        socket.emit('error', error ?? 'Failed to reveal attribute')
        return
      }

      io.to(roomCode).emit('game:state', getPublicState(state))
      console.log(`[game] Room ${roomCode} revealed "${revealedField}" (${state.currentRevealIndex}/${state.revealOrder.length})`)
    })

    // ── Reconnect attempt ─────────────────────────────────────────────────────
    socket.on('reconnect:attempt', ({ roomCode, nickname }) => {
      const code = roomCode.trim().toUpperCase()
      const trimmed = nickname.trim()

      const { state, player, error } = reconnectPlayer(code, socket.id, trimmed)
      if (error || !state || !player) {
        socket.emit('error', error ?? 'Reconnect failed')
        return
      }

      socket.join(code)

      // Send this player their own character (null if still in lobby)
      const character = state.phase !== 'lobby' ? player.character : null
      socket.emit('reconnect:success', {
        character,
        state: getPublicState(state),
      })

      // Update everyone else about the reconnection
      io.to(code).emit('game:state', getPublicState(state))
      console.log(`[game] ${trimmed} reconnected to room ${code}`)
    })

    // ── Disconnect ────────────────────────────────────────────────────────────
    socket.on('disconnect', (reason) => {
      console.log(`[socket] disconnected: ${socket.id} (${reason})`)

      const roomCode = findRoomBySocketId(socket.id)
      if (!roomCode) return

      let state = setPlayerConnected(roomCode, socket.id, false)
      if (!state) return

      state = transferHostIfNeeded(roomCode, socket.id) ?? state

      io.to(roomCode).emit('game:state', getPublicState(state))
    })
  })
}
