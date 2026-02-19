'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getSocket } from '@/lib/socket'
import { loadSession, clearSession } from '@/lib/storage'
import Toast from '@/components/Toast'
import PlayerBoard from '@/components/PlayerBoard'
import OwnCharacterPanel from '@/components/OwnCharacterPanel'
import { CATEGORY_META } from '@/app/homeHelpers'
import type { Character, CharacterField, PublicGameState } from '@/server/types'

export default function GamePage() {
  const params = useParams()
  const roomCode = (params.roomCode as string).toUpperCase()
  const router = useRouter()

  const [gameState, setGameState] = useState<PublicGameState | null>(null)
  const [myCharacter, setMyCharacter] = useState<Character | null>(null)
  const [myId, setMyId] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [revealing, setRevealing] = useState(false)

  const clearError = useCallback(() => setError(null), [])

  const isHost = gameState?.hostId === myId
  const me = gameState?.players.find((p) => p.id === myId)

  // ── Socket setup ──────────────────────────────────────────────────────────
  useEffect(() => {
    const socket = getSocket()

    function onGameState(state: PublicGameState) {
      setGameState(state)
      setRevealing(false)

      // If pushed back to lobby (shouldn't happen but guard anyway)
      if (state.phase === 'lobby') {
        router.push(`/lobby/${roomCode}`)
      }
    }

    function onCharacter(character: Character) {
      setMyCharacter(character)
    }

    function onError(msg: string) {
      setError(msg)
      setRevealing(false)
    }

    function onReconnectSuccess({
      character,
      state,
    }: {
      character: Character | null
      state: PublicGameState
    }) {
      setMyId(socket.id ?? '')
      if (character) setMyCharacter(character)
      onGameState(state)
    }

    socket.on('game:state', onGameState)
    socket.on('player:character', onCharacter)
    socket.on('error', onError)
    socket.on('reconnect:success', onReconnectSuccess)

    // If socket already connected and we have state, nothing to do
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
        clearSession()
        router.push('/')
        return
      }
    } else {
      setMyId(socket.id ?? '')
    }

    return () => {
      socket.off('game:state', onGameState)
      socket.off('player:character', onCharacter)
      socket.off('error', onError)
      socket.off('reconnect:success', onReconnectSuccess)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode])

  function handleRevealNext() {
    setRevealing(true)
    getSocket().emit('game:reveal-next')
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (!gameState) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-400 text-sm">Connecting to game…</p>
        </div>
      </div>
    )
  }

  const revealProgress =
    gameState.revealOrder.length > 0
      ? Math.round(
          (gameState.currentRevealIndex / gameState.revealOrder.length) * 100
        )
      : 100

  const nextField: CharacterField | undefined =
    gameState.revealOrder[gameState.currentRevealIndex]

  const phaseColors: Record<string, string> = {
    game:   'text-amber-400',
    voting: 'text-red-400',
    finished: 'text-emerald-400',
  }

  const phaseLabels: Record<string, string> = {
    game:     '▶ Revealing',
    voting:   '🗳 Voting Phase',
    finished: '✓ Game Over',
  }

  return (
    <>
      <Toast message={error} onDismiss={clearError} />

      <div className="space-y-6">
        {/* ── Top bar ──────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-white">
                Room{' '}
                <span className="text-amber-400 font-mono">{roomCode}</span>
              </h1>
              <span
                className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded bg-slate-800 border border-slate-700 ${
                  phaseColors[gameState.phase] ?? 'text-slate-400'
                }`}
              >
                {phaseLabels[gameState.phase] ?? gameState.phase}
              </span>
            </div>
            <p className="text-slate-400 text-sm mt-0.5">
              {gameState.players.filter((p) => p.isAlive).length} survivors ·{' '}
              {gameState.players.filter((p) => p.connected).length} online
            </p>
          </div>

          {/* Reveal control — host only, only during game phase */}
          {isHost && gameState.phase === 'game' && (
            <div className="flex flex-col items-end gap-2">
              <button
                onClick={handleRevealNext}
                disabled={revealing || gameState.currentRevealIndex >= gameState.revealOrder.length}
                className="btn-primary px-8 py-2.5 text-base"
              >
                {revealing
                  ? 'Revealing…'
                  : nextField
                  ? `Reveal ${CATEGORY_META[nextField]?.label ?? nextField} ${CATEGORY_META[nextField]?.icon ?? ''}`
                  : 'All Revealed'}
              </button>
              <p className="text-xs text-slate-500">
                {gameState.currentRevealIndex} / {gameState.revealOrder.length} attributes revealed
              </p>
            </div>
          )}

          {gameState.phase === 'voting' && (
            <div className="bg-red-900/30 border border-red-500/30 rounded-xl px-4 py-3 text-center">
              <p className="text-red-400 font-bold">All attributes revealed!</p>
              <p className="text-slate-400 text-sm">Discuss and vote on who stays in the bunker.</p>
            </div>
          )}
        </div>

        {/* ── Global reveal progress bar ────────────────────────────────── */}
        <div>
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>Reveal progress</span>
            <span>{revealProgress}%</span>
          </div>
          <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full transition-all duration-700"
              style={{ width: `${revealProgress}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* ── Player boards ─────────────────────────────────────────────── */}
          <div className="xl:col-span-3 space-y-4">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
              All Players
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {gameState.players.map((player) => (
                <PlayerBoard
                  key={player.id}
                  player={player}
                  isCurrentPlayer={player.id === myId}
                  isHost={player.id === gameState.hostId}
                  enabledCategories={gameState.enabledCategories}
                />
              ))}
            </div>
          </div>

          {/* ── Own character panel ───────────────────────────────────────── */}
          <div className="xl:col-span-1">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">
              Your Character
            </h2>
            {myCharacter ? (
              <OwnCharacterPanel
                character={myCharacter}
                revealedFields={me?.revealedFields ?? []}
                enabledCategories={gameState.enabledCategories}
              />
            ) : (
              <div className="card text-center space-y-2">
                <p className="text-slate-400 text-sm">
                  Loading your character…
                </p>
              </div>
            )}

            {/* Reveal order reference */}
            <div className="mt-4 card bg-slate-800/50 space-y-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Reveal Order
              </p>
              <ol className="space-y-1">
                {gameState.revealOrder.map((field, idx) => {
                  const isRevealed = idx < gameState.currentRevealIndex
                  const isNext = idx === gameState.currentRevealIndex
                  const meta = CATEGORY_META[field]
                  return (
                    <li
                      key={field}
                      className={`flex items-center gap-2 text-xs px-2 py-1 rounded ${
                        isRevealed
                          ? 'text-emerald-400'
                          : isNext
                          ? 'text-amber-400 bg-amber-500/10'
                          : 'text-slate-500'
                      }`}
                    >
                      <span className="w-4 text-center font-mono">{idx + 1}.</span>
                      <span>{meta?.icon}</span>
                      <span>{meta?.label ?? field}</span>
                      {isRevealed && <span className="ml-auto">✓</span>}
                      {isNext && <span className="ml-auto text-amber-500">→</span>}
                    </li>
                  )
                })}
              </ol>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
