import type { ItemLookup } from './content'
import type { KanaItem, KanjiItem, VocabItem } from './types'

export type Exercise =
  | { type: 'kana-mc'; item: KanaItem; prompt: string; options: string[]; answer: number }
  | { type: 'kana-type'; item: KanaItem }
  | { type: 'vocab-mc-es'; item: VocabItem; options: string[]; answer: number }
  | { type: 'vocab-mc-jp'; item: VocabItem; options: string[]; answer: number }
  | { type: 'vocab-type'; item: VocabItem }
  | { type: 'vocab-listen'; item: VocabItem; options: string[]; answer: number }
  | { type: 'kanji-mc-es'; item: KanjiItem; options: string[]; answer: number }
  | { type: 'kanji-mc-read'; item: KanjiItem; options: string[]; answer: number }

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function pickDistractors<T>(pool: T[], exclude: (t: T) => boolean, n: number): T[] {
  const candidates = shuffle(pool.filter((p) => !exclude(p)))
  return candidates.slice(0, n)
}

function mcOptions(correct: string, distractors: string[]): { options: string[]; answer: number } {
  const uniq = [...new Set(distractors.filter((d) => d !== correct))].slice(0, 3)
  const options = shuffle([correct, ...uniq])
  return { options, answer: options.indexOf(correct) }
}

/** Build an exercise for an SRS item id. `depth` = how many times seen before (0 = first exposure). */
export function buildExercise(id: string, lookup: ItemLookup, seen: boolean): Exercise | null {
  if (id.startsWith('kn:')) {
    const item = lookup.kana.get(id)
    if (!item) return null
    if (seen && Math.random() < 0.5) return { type: 'kana-type', item }
    const pool = [...lookup.kana.values()].filter((k) => k.t === item.t)
    const { options, answer } = mcOptions(item.r, pickDistractors(pool, (p) => p.k === item.k, 3).map((p) => p.r))
    return { type: 'kana-mc', item, prompt: item.k, options, answer }
  }
  if (id.startsWith('v:')) {
    const item = lookup.vocab.get(id)
    if (!item) return null
    const pool = [...lookup.vocab.values()].filter((v) => v.level === item.level)
    const roll = seen ? Math.random() : 0
    if (roll < 0.35) {
      const { options, answer } = mcOptions(item.es, pickDistractors(pool, (p) => p.jp === item.jp, 3).map((p) => p.es))
      return { type: 'vocab-mc-es', item, options, answer }
    } else if (roll < 0.6) {
      const { options, answer } = mcOptions(item.jp, pickDistractors(pool, (p) => p.jp === item.jp, 3).map((p) => p.jp))
      return { type: 'vocab-mc-jp', item, options, answer }
    } else if (roll < 0.8 && item.jp !== item.kana) {
      return { type: 'vocab-type', item }
    } else {
      const { options, answer } = mcOptions(item.es, pickDistractors(pool, (p) => p.jp === item.jp, 3).map((p) => p.es))
      return { type: 'vocab-listen', item, options, answer }
    }
  }
  if (id.startsWith('k:')) {
    const item = lookup.kanji.get(id)
    if (!item) return null
    const pool = [...lookup.kanji.values()].filter((k) => k.level === item.level)
    if (seen && Math.random() < 0.5) {
      const correct = item.words[0]?.kana ?? item.kun[0] ?? item.on[0]
      const distractors = pickDistractors(pool, (p) => p.k === item.k, 3).map(
        (p) => p.words[0]?.kana ?? p.kun[0] ?? p.on[0],
      )
      const { options, answer } = mcOptions(correct, distractors)
      return { type: 'kanji-mc-read', item, options, answer }
    }
    const { options, answer } = mcOptions(item.es, pickDistractors(pool, (p) => p.k === item.k, 3).map((p) => p.es))
    return { type: 'kanji-mc-es', item, options, answer }
  }
  return null
}
