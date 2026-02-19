// ─── Card & Deck ─────────────────────────────────────────────────────────────

export interface Card {
  id: string
  category: string
  value: string
  description?: string
}

export interface DeckDefinition {
  category: string
  label: string
  description: string
  cards: Card[]
}

export interface DecksJson {
  decks: DeckDefinition[]
}

// ─── Character ────────────────────────────────────────────────────────────────

export type CharacterField =
  | 'profession'
  | 'health'
  | 'biology'
  | 'baggage'
  | 'skill'
  | 'phobia'
  | 'fact'
  | 'condition'

export type Character = Record<CharacterField, Card>

// Public view: only revealed fields are included
export type RevealedCharacter = Partial<Character>

// ─── Player ───────────────────────────────────────────────────────────────────

export interface Player {
  id: string // socket.id
  name: string
  connected: boolean
  isAlive: boolean
  character: Character
  revealedFields: CharacterField[]
}

/** What other players can see about this player */
export interface PublicPlayer {
  id: string
  name: string
  connected: boolean
  isAlive: boolean
  revealedFields: CharacterField[]
  revealedCharacter: RevealedCharacter
}

// ─── Game State ───────────────────────────────────────────────────────────────

export type GamePhase = 'lobby' | 'game' | 'voting' | 'finished'

export interface GameState {
  roomCode: string
  hostId: string
  phase: GamePhase
  players: Player[]
  revealOrder: CharacterField[]
  currentRevealIndex: number
  maxPlayers: number
  enabledCategories: CharacterField[]
}

/** What is broadcast to all players */
export interface PublicGameState {
  roomCode: string
  hostId: string
  phase: GamePhase
  players: PublicPlayer[]
  revealOrder: CharacterField[]
  currentRevealIndex: number
  maxPlayers: number
  enabledCategories: CharacterField[]
}

// ─── Socket Events ────────────────────────────────────────────────────────────

export interface ServerToClientEvents {
  'game:state': (state: PublicGameState) => void
  'player:character': (character: Character) => void
  'reconnect:success': (data: {
    character: Character | null
    state: PublicGameState
  }) => void
  error: (message: string) => void
}

export interface ClientToServerEvents {
  'lobby:create': (data: {
    nickname: string
    maxPlayers: number
    enabledCategories: CharacterField[]
  }) => void
  'lobby:join': (data: { roomCode: string; nickname: string }) => void
  'lobby:update-settings': (data: {
    maxPlayers: number
    enabledCategories: CharacterField[]
  }) => void
  'game:start': () => void
  'game:reveal-next': () => void
  'reconnect:attempt': (data: {
    roomCode: string
    nickname: string
  }) => void
}

export interface InterServerEvents {}
export interface SocketData {}
