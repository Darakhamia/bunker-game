'use client'

import { useState } from 'react'
import type { Character } from '@/server/types'
import { RevealedCard, CATEGORY_META } from './AttributeCard'

interface OwnCharacterPanelProps {
  character: Character
  revealedFields: string[]
  enabledCategories: string[]
}

export default function OwnCharacterPanel({
  character,
  revealedFields,
  enabledCategories,
}: OwnCharacterPanelProps) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="bg-slate-800 border border-amber-500/30 rounded-xl overflow-hidden shadow-xl shadow-amber-500/5">
      {/* Panel header */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="w-full flex items-center justify-between px-4 py-3 bg-amber-500/10 hover:bg-amber-500/15 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-amber-400 text-sm font-bold tracking-wide uppercase">
            Your Character
          </span>
          <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded px-1.5 py-0.5 font-semibold">
            PRIVATE
          </span>
        </div>
        <span className="text-slate-400 text-xs">
          {collapsed ? '▼ Show' : '▲ Hide'}
        </span>
      </button>

      {/* Card grid */}
      {!collapsed && (
        <div className="p-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {enabledCategories.map((category) => {
            const card = character[category as keyof Character]
            const isRevealed = revealedFields.includes(category)

            if (!card) return null

            return (
              <div key={category} className="relative">
                <RevealedCard category={category} card={card} />
                {/* Show "revealed to all" badge */}
                {isRevealed && (
                  <span className="absolute top-1.5 right-1.5 text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded px-1 py-0.5 font-bold uppercase tracking-wider">
                    Revealed
                  </span>
                )}
                {/* Show "your secret" badge for unrevealed */}
                {!isRevealed && (
                  <span className="absolute top-1.5 right-1.5 text-[9px] bg-slate-700 text-slate-400 border border-slate-600 rounded px-1 py-0.5 font-bold uppercase tracking-wider">
                    Hidden
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
