/**
 * Shared constants for the home page (avoids importing server-only modules in
 * client components).
 */
import type { CharacterField } from '@/server/types'

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

export const CATEGORY_META: Record<CharacterField, { label: string; icon: string }> = {
  profession: { label: 'Profession',   icon: '💼' },
  health:     { label: 'Health',       icon: '❤️' },
  biology:    { label: 'Biology',      icon: '🧬' },
  baggage:    { label: 'Baggage',      icon: '🎒' },
  skill:      { label: 'Unique Skill', icon: '⚡' },
  phobia:     { label: 'Phobia',       icon: '😰' },
  fact:       { label: 'Secret Fact',  icon: '🔍' },
  condition:  { label: 'Condition',    icon: '🩺' },
}
