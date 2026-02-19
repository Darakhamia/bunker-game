'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getSocket } from '@/lib/socket'
import { saveSession, loadSession, clearSession } from '@/lib/storage'
import { ALL_CATEGORIES, CATEGORY_META } from '@/app/homeHelpers'
import Toast from '@/components/Toast'
import type { Character, CharacterField, PublicGameState } from '@/server/types'

export default function LobbyPage() {
  const params = useParams()
  const roomCode = (params.roomCode as string).toUpperCase()
  const router = useRouter()

  const [gameState, setGameState] = useState<PublicGameState | null>(null)
  const [myId, setMyId] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Settings (host only)
  const [maxPlayers, setMaxPlayers] = useState(8)
  const [enabledCats, setEnabledCats] = useState<CharacterField[]>([...ALL_CATEGORIES])
  const settingsTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearError = useCallback(() => setError(null), [])

  const isHost = gameState?.hostId === myId

  // ── Socket setup ──────────────────────────────────────────────────────────
  useEffect(() => {
    const socket = getSocket()

    function onGameState(state: PublicGameState) {
      setGameState(state)
      setMaxPlayers(state.maxPlayers)
      setEnabledCats(state.enabledCategories)

      // Redirect to game screen when host starts
      if (state.phase === 'game' || state.phase === 'voting') {
        router.push(`/game/${roomCode}`)
      }
    }

    function onError(msg: string) {
      setError(msg)
    }

    function onReconnectSuccess({ state }: { character: Character | null; state: PublicGameState }) {
      setMyId(socket.id ?? '')
      onGameState(state)
    }

    socket.on('game:state', onGameState)
    socket.on('error', onError)
    socket.on('reconnect:success', onReconnectSuccess)

    // If socket is not yet connected, reconnect using stored session
    if (!socket.connected) {
      const session = loadSession()
      if (session && session.roomCode === roomCode) {
        socket.connect()
        socket.once('connect', () => {
          setMyId(socket.id ?? '')
          socket.emit('reconnect:attempt', {
            roomCode: session.roomCode,
            nickname: session.nickname,
          })
        })
      } else {
        // No valid session — send back home
        clearSession()
        router.push('/')
        return
      }
    } else {
      setMyId(socket.id ?? '')
    }

    return () => {
      socket.off('game:state', onGameState)
      socket.off('error', onError)
      socket.off('reconnect:success', onReconnectSuccess)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode])

  // ── Emit settings change (debounced) ──────────────────────────────────────
  function updateSettings(newMax: number, newCats: CharacterField[]) {
    if (settingsTimeout.current) clearTimeout(settingsTimeout.current)
    settingsTimeout.current = setTimeout(() => {
      getSocket().emit('lobby:update-settings', {
        maxPlayers: newMax,
        enabledCategories: newCats,
      })
    }, 400)
  }

  function handleMaxChange(val: number) {
    setMaxPlayers(val)
    updateSettings(val, enabledCats)
  }

  function toggleCategory(cat: CharacterField) {
    const next = enabledCats.includes(cat)
      ? enabledCats.filter((c) => c !== cat)
      : [...enabledCats, cat]
    setEnabledCats(next)
    updateSettings(maxPlayers, next)
  }

  function handleStart() {
    getSocket().emit('game:start')
  }

  function copyCode() {
    navigator.clipboard.writeText(roomCode).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  // ── Loading state ─────────────────────────────────────────────────────────
  if (!gameState) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-400 text-sm">Connecting to room {roomCode}…</p>
        </div>
      </div>
    )
  }

  const connectedCount = gameState.players.filter((p) => p.connected).length

  return (
    <>
      <Toast message={error} onDismiss={clearError} />

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-amber-500 text-xs font-bold tracking-widest uppercase mb-1">
              Lobby
            </p>
            <h1 className="text-3xl font-black text-white">Waiting Room</h1>
            <p className="text-slate-400 text-sm mt-1">
              {connectedCount} / {gameState.maxPlayers} players connected
            </p>
          </div>

          {/* Room code */}
          <button
            onClick={copyCode}
            className="flex items-center gap-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 hover:border-amber-500/40 transition-all rounded-xl px-5 py-3 group"
          >
            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">
                Room Code
              </p>
              <p className="text-2xl font-black font-mono text-amber-400 tracking-widest">
                {roomCode}
              </p>
            </div>
            <span className="text-slate-500 group-hover:text-slate-300 text-sm">
              {copied ? '✓ Copied!' : '📋'}
            </span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Player list */}
          <div className="lg:col-span-2 card space-y-3">
            <h2 className="text-base font-bold text-slate-200">Players</h2>
            <ul className="space-y-2">
              {gameState.players.map((player) => (
                <li
                  key={player.id}
                  className="flex items-center gap-3 px-3 py-2.5 bg-slate-700/50 rounded-lg"
                >
                  <span
                    className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                      player.connected ? 'bg-emerald-400' : 'bg-slate-500'
                    }`}
                  />
                  <span className="text-white font-medium flex-1 truncate">
                    {player.name}
                  </span>
                  <div className="flex gap-1.5 flex-shrink-0">
                    {player.id === gameState.hostId && (
                      <span className="text-[10px] bg-violet-500/20 text-violet-400 border border-violet-500/30 rounded px-1.5 py-0.5 font-bold">
                        HOST
                      </span>
                    )}
                    {player.id === myId && (
                      <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded px-1.5 py-0.5 font-bold">
                        YOU
                      </span>
                    )}
                    {!player.connected && (
                      <span className="text-[10px] bg-slate-700 text-slate-400 border border-slate-600 rounded px-1.5 py-0.5 font-bold">
                        AWAY
                      </span>
                    )}
                  </div>
                </li>
              ))}

              {/* Empty slots */}
              {Array.from({
                length: Math.max(0, gameState.maxPlayers - gameState.players.length),
              }).map((_, i) => (
                <li
                  key={`empty-${i}`}
                  className="flex items-center gap-3 px-3 py-2.5 bg-slate-800/30 rounded-lg border border-dashed border-slate-700/50"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-700 flex-shrink-0" />
                  <span className="text-slate-600 text-sm italic">Waiting for player…</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Settings (host) */}
          <div className="space-y-4">
            {isHost ? (
              <div className="card space-y-4">
                <h2 className="text-base font-bold text-slate-200">Room Settings</h2>

                <div>
                  <label className="label">Max Players ({maxPlayers})</label>
                  <input
                    type="range"
                    min={gameState.players.length}
                    max={20}
                    value={maxPlayers}
                    onChange={(e) => handleMaxChange(Number(e.target.value))}
                    className="w-full accent-amber-500"
                  />
                </div>

                <div>
                  <label className="label">Card Categories</label>
                  <div className="space-y-1.5">
                    {ALL_CATEGORIES.map((cat) => {
                      const meta = CATEGORY_META[cat]
                      const active = enabledCats.includes(cat)
                      return (
                        <button
                          key={cat}
                          onClick={() => toggleCategory(cat)}
                          className={`
                            w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-sm
                            transition-all duration-100
                            ${active
                              ? 'border-amber-500/50 bg-amber-500/10 text-amber-300'
                              : 'border-slate-600 bg-slate-700/30 text-slate-400 hover:border-slate-500'
                            }
                          `}
                        >
                          <span>{meta.icon}</span>
                          <span className="flex-1 text-left">{meta.label}</span>
                          {active && <span className="text-amber-500 text-xs">✓</span>}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <button
                  className="btn-primary w-full py-3 text-base"
                  onClick={handleStart}
                  disabled={gameState.players.length < 2 || enabledCats.length === 0}
                >
                  Start Game →
                </button>

                {gameState.players.length < 2 && (
                  <p className="text-xs text-slate-500 text-center">
                    Need at least 2 players
                  </p>
                )}
              </div>
            ) : (
              <div className="card text-center space-y-3">
                <div className="text-3xl">⏳</div>
                <p className="text-slate-300 font-semibold">Waiting for host</p>
                <p className="text-slate-500 text-sm">
                  The host will start the game when everyone is ready.
                </p>
              </div>
            )}

            {/* Share instructions */}
            <div className="card space-y-2 bg-slate-800/50">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Invite Friends
              </p>
              <p className="text-slate-300 text-sm">
                Share the room code{' '}
                <span className="font-mono font-bold text-amber-400">{roomCode}</span>{' '}
                and have them join at this URL.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
