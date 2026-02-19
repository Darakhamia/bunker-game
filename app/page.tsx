'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getSocket } from '@/lib/socket'
import { saveSession, loadSession, clearSession } from '@/lib/storage'
import { ALL_CATEGORIES, CATEGORY_META } from './homeHelpers'
import Toast from '@/components/Toast'
import type { CharacterField, PublicGameState } from '@/server/types'

type Mode = 'choose' | 'create' | 'join'

export default function HomePage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('choose')

  // Create form
  const [createNickname, setCreateNickname] = useState('')
  const [maxPlayers, setMaxPlayers] = useState(8)
  const [enabledCats, setEnabledCats] = useState<CharacterField[]>([...ALL_CATEGORIES])

  // Join form
  const [joinNickname, setJoinNickname] = useState('')
  const [roomCode, setRoomCode] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const clearError = useCallback(() => setError(null), [])

  // On mount: check if a session exists and offer to reconnect
  useEffect(() => {
    const session = loadSession()
    if (session) {
      // Attempt silent reconnect
      const socket = getSocket()
      socket.connect()
      socket.emit('reconnect:attempt', {
        roomCode: session.roomCode,
        nickname: session.nickname,
      })

      socket.once('reconnect:success', ({ state }) => {
        const target = state.phase === 'lobby'
          ? `/lobby/${state.roomCode}`
          : `/game/${state.roomCode}`
        router.push(target)
      })

      socket.once('error', () => {
        // Reconnect failed (room gone) — clear stale session
        clearSession()
        socket.disconnect()
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function toggleCategory(cat: CharacterField) {
    setEnabledCats((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    )
  }

  function handleCreate() {
    if (!createNickname.trim()) {
      setError('Enter a nickname to continue')
      return
    }
    if (enabledCats.length === 0) {
      setError('Enable at least one card category')
      return
    }

    setLoading(true)
    const socket = getSocket()
    socket.connect()

    socket.once('game:state', (state: PublicGameState) => {
      saveSession({ roomCode: state.roomCode, nickname: createNickname.trim() })
      router.push(`/lobby/${state.roomCode}`)
    })

    socket.once('error', (msg: string) => {
      setError(msg)
      setLoading(false)
    })

    socket.emit('lobby:create', {
      nickname: createNickname.trim(),
      maxPlayers,
      enabledCategories: enabledCats,
    })
  }

  function handleJoin() {
    if (!joinNickname.trim()) {
      setError('Enter a nickname to continue')
      return
    }
    if (!roomCode.trim()) {
      setError('Enter the room code')
      return
    }

    setLoading(true)
    const socket = getSocket()
    socket.connect()

    socket.once('game:state', (state: PublicGameState) => {
      saveSession({ roomCode: state.roomCode, nickname: joinNickname.trim() })
      router.push(`/lobby/${state.roomCode}`)
    })

    socket.once('error', (msg: string) => {
      setError(msg)
      setLoading(false)
    })

    socket.emit('lobby:join', {
      roomCode: roomCode.trim().toUpperCase(),
      nickname: joinNickname.trim(),
    })
  }

  return (
    <>
      <Toast message={error} onDismiss={clearError} />

      <div className="min-h-[80vh] flex flex-col items-center justify-center gap-8 py-12">
        {/* Hero */}
        <div className="text-center space-y-3">
          <p className="text-amber-500 text-sm font-bold tracking-widest uppercase">
            Online Multiplayer
          </p>
          <h1 className="text-5xl font-black tracking-tight text-white">
            Bunker <span className="text-amber-500">Online</span>
          </h1>
          <p className="text-slate-400 max-w-md text-sm leading-relaxed">
            Catastrophe has struck. A handful of survivors compete for limited
            spots in the bunker. Each player has a hidden character with unique
            traits — but only the most useful will survive.
          </p>
        </div>

        {/* Mode selector */}
        {mode === 'choose' && (
          <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
            <button
              onClick={() => setMode('create')}
              className="btn-primary flex-1 text-base py-3"
            >
              Create Room
            </button>
            <button
              onClick={() => setMode('join')}
              className="btn-secondary flex-1 text-base py-3"
            >
              Join Room
            </button>
          </div>
        )}

        {/* Create form */}
        {mode === 'create' && (
          <div className="card w-full max-w-lg space-y-5 animate-fade-in">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Create a Room</h2>
              <button
                onClick={() => setMode('choose')}
                className="text-slate-400 hover:text-white text-sm"
              >
                ← Back
              </button>
            </div>

            {/* Nickname */}
            <div>
              <label className="label">Your Nickname</label>
              <input
                className="input"
                placeholder="e.g. SurvivorJoe"
                maxLength={24}
                value={createNickname}
                onChange={(e) => setCreateNickname(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
            </div>

            {/* Max players */}
            <div>
              <label className="label">Max Players ({maxPlayers})</label>
              <input
                type="range"
                min={2}
                max={20}
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(Number(e.target.value))}
                className="w-full accent-amber-500"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>2</span>
                <span>20</span>
              </div>
            </div>

            {/* Card categories */}
            <div>
              <label className="label">Card Categories</label>
              <div className="grid grid-cols-2 gap-2">
                {ALL_CATEGORIES.map((cat) => {
                  const meta = CATEGORY_META[cat]
                  const active = enabledCats.includes(cat)
                  return (
                    <button
                      key={cat}
                      onClick={() => toggleCategory(cat)}
                      className={`
                        flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium
                        transition-all duration-150
                        ${active
                          ? 'border-amber-500/60 bg-amber-500/10 text-amber-300'
                          : 'border-slate-600 bg-slate-700/40 text-slate-400 hover:border-slate-500'
                        }
                      `}
                    >
                      <span>{meta.icon}</span>
                      <span>{meta.label}</span>
                      {active && <span className="ml-auto text-amber-500">✓</span>}
                    </button>
                  )
                })}
              </div>
            </div>

            <button
              className="btn-primary w-full text-base py-3"
              onClick={handleCreate}
              disabled={loading}
            >
              {loading ? 'Creating…' : 'Create Room →'}
            </button>
          </div>
        )}

        {/* Join form */}
        {mode === 'join' && (
          <div className="card w-full max-w-sm space-y-5 animate-fade-in">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Join a Room</h2>
              <button
                onClick={() => setMode('choose')}
                className="text-slate-400 hover:text-white text-sm"
              >
                ← Back
              </button>
            </div>

            <div>
              <label className="label">Room Code</label>
              <input
                className="input uppercase tracking-widest font-mono text-lg text-center"
                placeholder="ABC123"
                maxLength={6}
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              />
            </div>

            <div>
              <label className="label">Your Nickname</label>
              <input
                className="input"
                placeholder="e.g. SurvivorJoe"
                maxLength={24}
                value={joinNickname}
                onChange={(e) => setJoinNickname(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              />
            </div>

            <button
              className="btn-primary w-full text-base py-3"
              onClick={handleJoin}
              disabled={loading}
            >
              {loading ? 'Joining…' : 'Join Room →'}
            </button>
          </div>
        )}

        {/* Footer hint */}
        <p className="text-slate-600 text-xs text-center">
          2-20 players · No account required · Instant play
        </p>
      </div>
    </>
  )
}
