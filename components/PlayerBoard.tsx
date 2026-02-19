'use client'

import type { CharacterField, PublicPlayer } from '@/server/types'
import { RevealedCard, HiddenCard, CATEGORY_META } from './AttributeCard'

interface PlayerBoardProps {
  player: PublicPlayer
  isCurrentPlayer: boolean
  isHost: boolean
  enabledCategories: string[]
}

export default function PlayerBoard({
  player,
  isCurrentPlayer,
  isHost,
  enabledCategories,
}: PlayerBoardProps) {
  const revealedCount = player.revealedFields.length
  const totalCount = enabledCategories.length
  const progress = totalCount > 0 ? (revealedCount / totalCount) * 100 : 0

  return (
    <div
      className={`
        relative rounded-xl border transition-all duration-200
        ${isCurrentPlayer
          ? 'border-amber-500/50 bg-slate-800/90 shadow-lg shadow-amber-500/10'
          : player.connected
          ? 'border-slate-700 bg-slate-800/60'
          : 'border-slate-700/40 bg-slate-800/30 opacity-60'
        }
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-2 min-w-0">
          {/* Connection indicator */}
          <span
            className={`flex-shrink-0 w-2 h-2 rounded-full ${
              player.connected ? 'bg-emerald-400 animate-pulse-slow' : 'bg-slate-500'
            }`}
          />
          <span
            className={`font-bold truncate ${
              isCurrentPlayer ? 'text-amber-400' : 'text-white'
            }`}
          >
            {player.name}
          </span>
          {isCurrentPlayer && (
            <span className="flex-shrink-0 text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded px-1.5 py-0.5 font-semibold">
              YOU
            </span>
          )}
          {isHost && (
            <span className="flex-shrink-0 text-[10px] bg-violet-500/20 text-violet-400 border border-violet-500/30 rounded px-1.5 py-0.5 font-semibold">
              HOST
            </span>
          )}
        </div>

        {/* Reveal progress */}
        <span className="flex-shrink-0 text-xs text-slate-400 font-mono ml-2">
          {revealedCount}/{totalCount}
        </span>
      </div>

      {/* Progress bar */}
      <div className="px-4 mb-3">
        <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-500 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Attribute cards grid */}
      <div className="px-4 pb-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {enabledCategories.map((category) => {
          const isRevealed = player.revealedFields.includes(category as CharacterField)
          const card = isRevealed
            ? player.revealedCharacter[category as CharacterField]
            : undefined

          return isRevealed && card !== undefined ? (
            <RevealedCard key={category} category={category} card={card} compact />
          ) : (
            <HiddenCard key={category} category={category} compact />
          )
        })}
      </div>

      {/* Alive / eliminated badge */}
      {!player.isAlive && (
        <div className="absolute inset-0 rounded-xl bg-slate-900/70 flex items-center justify-center">
          <span className="text-red-400 font-bold text-lg tracking-widest uppercase">
            Eliminated
          </span>
        </div>
      )}
    </div>
  )
}
