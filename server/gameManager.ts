import fs from 'fs'
import path from 'path'
import {
  Card,
  Character,
  CharacterField,
  DecksJson,
  GamePhase,
  GameState,
  Player,
  PublicGameState,
  PublicPlayer,
  RevealedCharacter,
} from './types'

// ─── Constants ────────────────────────────────────────────────────────────────

export const ALL_CATEGORIES: CharacterField[] = [
  'profession',
  'health',
  'biology',
  'baggage',
  'skill',
  'phobia',
  'fact',
  'condition',
]

// Default reveal order — host can reorder in future versions
const DEFAULT_REVEAL_ORDER: CharacterField[] = [...ALL_CATEGORIES]

// ─── In-Memory Store ──────────────────────────────────────────────────────────

const gameStates = new Map<string, GameState>()

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // omit 0/O and 1/I
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

function uniqueRoomCode(): string {
  let code: string
  let attempts = 0
  do {
    code = generateRoomCode()
    attempts++
    if (attempts > 1000) throw new Error('Could not generate unique room code')
  } while (gameStates.has(code))
  return code
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function loadDecks(): Map<string, Card[]> {
  const dataPath = path.join(process.cwd(), 'data', 'decks.json')
  const raw = fs.readFileSync(dataPath, 'utf-8')
  const data: DecksJson = JSON.parse(raw)
  const map = new Map<string, Card[]>()
  for (const deck of data.decks) {
    map.set(deck.category, deck.cards)
  }
  return map
}

function generateCharacters(
  playerCount: number,
  enabledCategories: CharacterField[]
): Character[] {
  const decks = loadDecks()
  // For each category, pre-select a pool of cards (no duplicates unless pool is smaller than playerCount)
  const categoryPools: Map<CharacterField, Card[]> = new Map()

  for (const cat of enabledCategories) {
    const available = decks.get(cat) ?? []
    let pool = shuffleArray(available)
    // If fewer cards than players, cycle through the deck (wrap around)
    while (pool.length < playerCount) {
      pool = [...pool, ...shuffleArray(available)]
    }
    categoryPools.set(cat, pool.slice(0, playerCount))
  }

  const characters: Character[] = []
  for (let i = 0; i < playerCount; i++) {
    const char: Partial<Character> = {}
    for (const cat of enabledCategories) {
      const pool = categoryPools.get(cat)!
      char[cat] = pool[i]
    }
    characters.push(char as Character)
  }
  return characters
}

// ─── Public State Projection ──────────────────────────────────────────────────

function toPublicPlayer(player: Player): PublicPlayer {
  const revealedCharacter: RevealedCharacter = {}
  for (const field of player.revealedFields) {
    revealedCharacter[field] = player.character[field]
  }
  return {
    id: player.id,
    name: player.name,
    connected: player.connected,
    isAlive: player.isAlive,
    revealedFields: player.revealedFields,
    revealedCharacter,
  }
}

export function getPublicState(state: GameState): PublicGameState {
  return {
    roomCode: state.roomCode,
    hostId: state.hostId,
    phase: state.phase,
    players: state.players.map(toPublicPlayer),
    revealOrder: state.revealOrder,
    currentRevealIndex: state.currentRevealIndex,
    maxPlayers: state.maxPlayers,
    enabledCategories: state.enabledCategories,
  }
}

// ─── Game Operations ──────────────────────────────────────────────────────────

export function createGame(
  hostId: string,
  nickname: string,
  maxPlayers: number,
  enabledCategories: CharacterField[]
): GameState {
  const roomCode = uniqueRoomCode()

  const host: Player = {
    id: hostId,
    name: nickname,
    connected: true,
    isAlive: true,
    character: {} as Character,
    revealedFields: [],
  }

  const state: GameState = {
    roomCode,
    hostId,
    phase: 'lobby',
    players: [host],
    revealOrder: DEFAULT_REVEAL_ORDER.filter((f) => enabledCategories.includes(f)),
    currentRevealIndex: 0,
    maxPlayers: Math.max(2, Math.min(maxPlayers, 20)),
    enabledCategories,
  }

  gameStates.set(roomCode, state)
  return state
}

export function joinGame(
  roomCode: string,
  playerId: string,
  nickname: string
): { state: GameState | null; error?: string } {
  const state = gameStates.get(roomCode)
  if (!state) return { state: null, error: 'Room not found' }
  if (state.phase !== 'lobby') return { state, error: 'Game has already started' }
  if (state.players.length >= state.maxPlayers) return { state, error: 'Room is full' }
  if (state.players.some((p) => p.name.toLowerCase() === nickname.toLowerCase())) {
    return { state, error: 'Nickname is already taken in this room' }
  }

  const player: Player = {
    id: playerId,
    name: nickname,
    connected: true,
    isAlive: true,
    character: {} as Character,
    revealedFields: [],
  }

  state.players.push(player)
  return { state }
}

export function updateSettings(
  roomCode: string,
  requesterId: string,
  maxPlayers: number,
  enabledCategories: CharacterField[]
): { state: GameState | null; error?: string } {
  const state = gameStates.get(roomCode)
  if (!state) return { state: null, error: 'Room not found' }
  if (state.hostId !== requesterId) return { state, error: 'Only the host can change settings' }
  if (state.phase !== 'lobby') return { state, error: 'Cannot change settings after the game has started' }

  state.maxPlayers = Math.max(state.players.length, Math.max(2, Math.min(maxPlayers, 20)))
  state.enabledCategories = enabledCategories
  state.revealOrder = DEFAULT_REVEAL_ORDER.filter((f) => enabledCategories.includes(f))
  return { state }
}

export function startGame(
  roomCode: string,
  requesterId: string
): { state: GameState | null; error?: string } {
  const state = gameStates.get(roomCode)
  if (!state) return { state: null, error: 'Room not found' }
  if (state.hostId !== requesterId) return { state, error: 'Only the host can start the game' }
  if (state.players.length < 2) return { state, error: 'Need at least 2 players to start' }
  if (state.phase !== 'lobby') return { state, error: 'Game has already started' }
  if (state.enabledCategories.length === 0) return { state, error: 'Enable at least one card category' }

  const characters = generateCharacters(state.players.length, state.enabledCategories)

  state.players.forEach((player, i) => {
    player.character = characters[i]
    player.revealedFields = []
    player.isAlive = true
  })

  state.phase = 'game'
  state.currentRevealIndex = 0
  state.revealOrder = DEFAULT_REVEAL_ORDER.filter((f) => state.enabledCategories.includes(f))

  return { state }
}

export function revealNext(
  roomCode: string,
  requesterId: string
): { state: GameState | null; error?: string; revealedField?: CharacterField } {
  const state = gameStates.get(roomCode)
  if (!state) return { state: null, error: 'Room not found' }
  if (state.hostId !== requesterId) return { state, error: 'Only the host can reveal attributes' }
  if (state.phase !== 'game') return { state, error: 'Reveal is only available during the game phase' }
  if (state.currentRevealIndex >= state.revealOrder.length) {
    return { state, error: 'All attributes have been revealed' }
  }

  const field = state.revealOrder[state.currentRevealIndex]

  state.players.forEach((player) => {
    if (!player.revealedFields.includes(field)) {
      player.revealedFields.push(field)
    }
  })

  state.currentRevealIndex++

  if (state.currentRevealIndex >= state.revealOrder.length) {
    state.phase = 'voting'
  }

  return { state, revealedField: field }
}

// ─── Reconnect ────────────────────────────────────────────────────────────────

export function reconnectPlayer(
  roomCode: string,
  newSocketId: string,
  nickname: string
): { state: GameState | null; player?: Player; error?: string } {
  const state = gameStates.get(roomCode)
  if (!state) return { state: null, error: 'Room not found' }

  const player = state.players.find(
    (p) => p.name.toLowerCase() === nickname.toLowerCase()
  )
  if (!player) return { state, error: 'No player with that nickname found in this room' }

  const oldId = player.id

  // Update socket ID and mark as connected
  player.id = newSocketId
  player.connected = true

  // Update hostId if this player was the host
  if (state.hostId === oldId) {
    state.hostId = newSocketId
  }

  return { state, player }
}

// ─── Connection Management ────────────────────────────────────────────────────

export function setPlayerConnected(
  roomCode: string,
  playerId: string,
  connected: boolean
): GameState | null {
  const state = gameStates.get(roomCode)
  if (!state) return null

  const player = state.players.find((p) => p.id === playerId)
  if (player) player.connected = connected

  return state
}

export function transferHostIfNeeded(
  roomCode: string,
  leavingPlayerId: string
): GameState | null {
  const state = gameStates.get(roomCode)
  if (!state) return null

  if (state.hostId === leavingPlayerId) {
    const next = state.players.find(
      (p) => p.id !== leavingPlayerId && p.connected
    )
    if (next) {
      state.hostId = next.id
    }
  }

  return state
}

// ─── Getters ──────────────────────────────────────────────────────────────────

export function getGameState(roomCode: string): GameState | undefined {
  return gameStates.get(roomCode)
}

export function getPlayerById(
  roomCode: string,
  playerId: string
): Player | undefined {
  return gameStates.get(roomCode)?.players.find((p) => p.id === playerId)
}

export function findRoomBySocketId(socketId: string): string | undefined {
  for (const [roomCode, state] of gameStates.entries()) {
    if (state.players.some((p) => p.id === socketId)) {
      return roomCode
    }
  }
  return undefined
}

// ─── Cleanup ──────────────────────────────────────────────────────────────────

/** Remove rooms where all players have been disconnected for a while */
export function pruneEmptyRooms(): void {
  for (const [roomCode, state] of gameStates.entries()) {
    const anyConnected = state.players.some((p) => p.connected)
    if (!anyConnected) {
      // Could add a timestamp check here for delayed cleanup
      gameStates.delete(roomCode)
    }
  }
}

// Run cleanup every 10 minutes
setInterval(pruneEmptyRooms, 10 * 60 * 1000)
