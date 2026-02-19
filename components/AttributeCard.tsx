'use client'

import type { Card } from '@/server/types'

// ─── Category metadata ────────────────────────────────────────────────────────

export const CATEGORY_META: Record<
  string,
  { label: string; color: string; icon: string }
> = {
  profession: { label: 'Profession',   color: 'border-blue-500   text-blue-400',   icon: '💼' },
  health:     { label: 'Health',       color: 'border-emerald-500 text-emerald-400', icon: '❤️' },
  biology:    { label: 'Biology',      color: 'border-violet-500  text-violet-400',  icon: '🧬' },
  baggage:    { label: 'Baggage',      color: 'border-orange-500  text-orange-400',  icon: '🎒' },
  skill:      { label: 'Unique Skill', color: 'border-cyan-500    text-cyan-400',    icon: '⚡' },
  phobia:     { label: 'Phobia',       color: 'border-red-500     text-red-400',     icon: '😰' },
  fact:       { label: 'Secret Fact',  color: 'border-amber-500   text-amber-400',   icon: '🔍' },
  condition:  { label: 'Condition',    color: 'border-pink-500    text-pink-400',    icon: '🩺' },
}

// ─── Revealed card ────────────────────────────────────────────────────────────

interface RevealedCardProps {
  category: string
  card: Card
  compact?: boolean
}

export function RevealedCard({ category, card, compact = false }: RevealedCardProps) {
  const meta = CATEGORY_META[category] ?? {
    label: category,
    color: 'border-slate-500 text-slate-400',
    icon: '?',
  }

  return (
    <div
      className={`
        border-l-4 ${meta.color.split(' ')[0]}
        bg-slate-800/80 rounded-r-lg
        ${compact ? 'p-2' : 'p-3'}
        animate-fade-in
      `}
    >
      <div className={`flex items-center gap-1.5 mb-0.5 ${meta.color.split(' ')[1]}`}>
        <span className="text-xs">{meta.icon}</span>
        <span className="text-[10px] font-semibold uppercase tracking-widest opacity-80">
          {meta.label}
        </span>
      </div>
      <p className={`text-white font-semibold ${compact ? 'text-sm' : 'text-base'}`}>
        {card.value}
      </p>
      {!compact && card.description && (
        <p className="text-slate-400 text-xs mt-1 leading-relaxed">{card.description}</p>
      )}
    </div>
  )
}

// ─── Hidden / locked card ─────────────────────────────────────────────────────

interface HiddenCardProps {
  category: string
  compact?: boolean
}

export function HiddenCard({ category, compact = false }: HiddenCardProps) {
  const meta = CATEGORY_META[category] ?? {
    label: category,
    color: 'border-slate-600 text-slate-500',
    icon: '?',
  }

  return (
    <div
      className={`
        border-l-4 border-slate-600
        bg-slate-800/40 rounded-r-lg
        ${compact ? 'p-2' : 'p-3'}
        opacity-60
      `}
    >
      <div className="flex items-center gap-1.5 mb-0.5 text-slate-500">
        <span className="text-xs">{meta.icon}</span>
        <span className="text-[10px] font-semibold uppercase tracking-widest">
          {meta.label}
        </span>
      </div>
      <div className={`flex items-center gap-2 ${compact ? 'h-5' : 'h-6'}`}>
        <div className="flex gap-0.5">
          {Array.from({ length: compact ? 6 : 8 }).map((_, i) => (
            <div key={i} className="w-2 h-2 bg-slate-600 rounded-full" />
          ))}
        </div>
        <span className="text-slate-600 text-xs">Hidden</span>
      </div>
    </div>
  )
}
