import { createEmptyCard, type Card } from 'ts-fsrs'

export interface Settings {
  newPerDay: number
  aiProvider: 'gemini' | 'claude'
  geminiKey: string
  claudeKey: string
  geminiModel: string
  claudeModel: string
  furigana: boolean
  ttsRate: number
}

export interface SerializedCard extends Omit<Card, 'due' | 'last_review'> {
  due: string
  last_review?: string
}

export interface AppState {
  version: 1
  settings: Settings
  /** SRS cards by item id */
  cards: Record<string, SerializedCard>
  /** grammar lessons completed */
  grammarDone: string[]
  /** stories read */
  storiesRead: string[]
  xp: number
  /** day string YYYY-MM-DD -> reviews done */
  history: Record<string, number>
  /** new cards introduced per day */
  newIntroduced: Record<string, number>
  /** placement test completed */
  onboarded: boolean
}

const KEY = 'torii-state-v1'

const defaultSettings: Settings = {
  newPerDay: 15,
  aiProvider: 'gemini',
  geminiKey: '',
  claudeKey: '',
  geminiModel: 'gemini-2.5-flash',
  claudeModel: 'claude-sonnet-5',
  furigana: true,
  ttsRate: 0.9,
}

export function defaultState(): AppState {
  return {
    version: 1,
    settings: { ...defaultSettings },
    cards: {},
    grammarDone: [],
    storiesRead: [],
    xp: 0,
    history: {},
    newIntroduced: {},
    onboarded: false,
  }
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return defaultState()
    const parsed = JSON.parse(raw) as AppState
    return { ...defaultState(), ...parsed, settings: { ...defaultSettings, ...parsed.settings } }
  } catch {
    return defaultState()
  }
}

export function saveState(s: AppState) {
  localStorage.setItem(KEY, JSON.stringify(s))
}

export function serializeCard(c: Card): SerializedCard {
  return { ...c, due: c.due.toISOString(), last_review: c.last_review?.toISOString() }
}

export function deserializeCard(s: SerializedCard): Card {
  return { ...s, due: new Date(s.due), last_review: s.last_review ? new Date(s.last_review) : undefined }
}

export function freshCard(): Card {
  return createEmptyCard(new Date())
}

export function todayStr(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** consecutive-day streak ending today or yesterday */
export function computeStreak(history: Record<string, number>): number {
  let streak = 0
  const d = new Date()
  // allow streak to survive if today not yet studied
  if (!history[todayStr(d)]) d.setDate(d.getDate() - 1)
  while (history[todayStr(d)]) {
    streak++
    d.setDate(d.getDate() - 1)
  }
  return streak
}

export function exportState(): string {
  return localStorage.getItem(KEY) ?? JSON.stringify(defaultState())
}

export function importState(json: string): boolean {
  try {
    const parsed = JSON.parse(json)
    if (typeof parsed !== 'object' || !parsed.cards) return false
    localStorage.setItem(KEY, JSON.stringify(parsed))
    return true
  } catch {
    return false
  }
}
