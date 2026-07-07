import { fsrs, generatorParameters, Rating, State, type Card } from 'ts-fsrs'
import type { AppState } from './store'
import { deserializeCard, serializeCard, freshCard, todayStr } from './store'

const engine = fsrs(generatorParameters({ enable_fuzz: true }))

export type Answer = 'again' | 'good' | 'easy'

const RATING: Record<Answer, Rating.Again | Rating.Good | Rating.Easy> = {
  again: Rating.Again,
  good: Rating.Good,
  easy: Rating.Easy,
}

/** Apply an answer to an item, mutating state.cards */
export function review(state: AppState, itemId: string, answer: Answer) {
  const now = new Date()
  const existing = state.cards[itemId]
  const card: Card = existing ? deserializeCard(existing) : freshCard()
  const isNew = card.state === State.New
  const result = engine.next(card, now, RATING[answer])
  state.cards[itemId] = serializeCard(result.card)
  const day = todayStr()
  state.history[day] = (state.history[day] ?? 0) + 1
  if (isNew) state.newIntroduced[day] = (state.newIntroduced[day] ?? 0) + 1
  state.xp += answer === 'again' ? 2 : 10
}

/** Mark a whole unit as already known (e.g. user already dominates it) */
export function markKnown(state: AppState, itemIds: string[]) {
  const now = new Date()
  for (const id of itemIds) {
    if (state.cards[id]) continue
    let card = freshCard()
    // simulate three good reviews to build stability
    card = engine.next(card, now, Rating.Easy).card
    card = engine.next(card, card.due, Rating.Easy).card
    card = engine.next(card, card.due, Rating.Easy).card
    state.cards[id] = serializeCard(card)
  }
}

export function dueIds(state: AppState, now = new Date()): string[] {
  return Object.entries(state.cards)
    .filter(([, c]) => new Date(c.due) <= now)
    .sort((a, b) => a[1].due.localeCompare(b[1].due))
    .map(([id]) => id)
}

export function knownCount(state: AppState): number {
  return Object.values(state.cards).filter((c) => c.state === State.Review).length
}

export function isLearned(state: AppState, itemId: string): boolean {
  return !!state.cards[itemId]
}

export function newRemainingToday(state: AppState): number {
  const used = state.newIntroduced[todayStr()] ?? 0
  return Math.max(0, state.settings.newPerDay - used)
}

export function retrievabilityLabel(state: AppState, itemId: string): string {
  const c = state.cards[itemId]
  if (!c) return 'nuevo'
  if (c.state === State.New) return 'nuevo'
  if (c.state === State.Learning || c.state === State.Relearning) return 'aprendiendo'
  return c.stability > 21 ? 'dominado' : 'repasando'
}
