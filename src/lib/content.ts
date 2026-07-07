import type { Content, KanaItem, KanjiItem, VocabItem, GrammarLesson, Story, Unit } from './types'

const BASE = import.meta.env.BASE_URL + 'content/'

async function load<T>(file: string): Promise<T[]> {
  try {
    const res = await fetch(BASE + file)
    if (!res.ok) return []
    return (await res.json()) as T[]
  } catch {
    return []
  }
}

let cached: Content | null = null

export async function loadContent(): Promise<Content> {
  if (cached) return cached
  const [kana, k5, k4, k3, v5, v4, v3, g5, g4, g3, s5, s4, s3] = await Promise.all([
    load<KanaItem>('kana.json'),
    load<Omit<KanjiItem, 'level'>>('kanji_n5.json'),
    load<Omit<KanjiItem, 'level'>>('kanji_n4.json'),
    load<Omit<KanjiItem, 'level'>>('kanji_n3.json'),
    load<Omit<VocabItem, 'level'>>('vocab_n5.json'),
    load<Omit<VocabItem, 'level'>>('vocab_n4.json'),
    load<Omit<VocabItem, 'level'>>('vocab_n3.json'),
    load<GrammarLesson>('grammar_n5.json'),
    load<GrammarLesson>('grammar_n4.json'),
    load<GrammarLesson>('grammar_n3.json'),
    load<Story>('stories_n5.json'),
    load<Story>('stories_n4.json'),
    load<Story>('stories_n3.json'),
  ])
  const lvl = <T,>(arr: T[], level: 'N5' | 'N4' | 'N3') => arr.map((x) => ({ ...x, level }))
  cached = {
    kana,
    kanji: [...lvl(k5, 'N5'), ...lvl(k4, 'N4'), ...lvl(k3, 'N3')] as KanjiItem[],
    vocab: [...lvl(v5, 'N5'), ...lvl(v4, 'N4'), ...lvl(v3, 'N3')] as VocabItem[],
    grammar: [...g5, ...g4, ...g3],
    stories: [...s5, ...s4, ...s3],
  }
  return cached
}

// ---- SRS item ids ----
export const kanaId = (k: KanaItem) => `kn:${k.k}`
export const kanjiId = (k: KanjiItem) => `k:${k.k}`
export const vocabId = (v: VocabItem) => `v:${v.jp}|${v.kana}`

export interface ItemLookup {
  kana: Map<string, KanaItem>
  kanji: Map<string, KanjiItem>
  vocab: Map<string, VocabItem>
}

export function buildLookup(c: Content): ItemLookup {
  return {
    kana: new Map(c.kana.map((k) => [kanaId(k), k])),
    kanji: new Map(c.kanji.map((k) => [kanjiId(k), k])),
    vocab: new Map(c.vocab.map((v) => [vocabId(v), v])),
  }
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

const ROW_NAMES: Record<string, string> = {
  a: 'あいうえお', ka: 'か', sa: 'さ', ta: 'た', na: 'な', ha: 'は', ma: 'ま',
  ya: 'や', ra: 'ら', wa: 'わ・ん', n: 'ん',
}

/** Build the ordered course path from content */
export function buildUnits(c: Content): Unit[] {
  const units: Unit[] = []

  // 1) Kana: group by script + row, keeping content order
  for (const script of ['h', 'k'] as const) {
    const scriptName = script === 'h' ? 'Hiragana' : 'Katakana'
    const items = c.kana.filter((k) => k.t === script)
    const base = items.filter((k) => k.mn !== '' || 'aiueon'.includes(k.row))
    const rows: { row: string; items: KanaItem[] }[] = []
    for (const it of items) {
      const last = rows[rows.length - 1]
      if (last && last.row === it.row) last.items.push(it)
      else rows.push({ row: it.row, items: [it] })
    }
    // merge tiny rows into groups of ~8
    let buf: KanaItem[] = []
    let bufRows: string[] = []
    for (const r of rows) {
      buf.push(...r.items)
      bufRows.push(r.row)
      if (buf.length >= 8) {
        units.push({
          id: `u-${script}-${units.length}`,
          title: `${scriptName}: ${bufRows.join(' · ')}`,
          subtitle: buf.map((b) => b.k).join(' '),
          kind: 'kana',
          level: 'Kana',
          itemIds: buf.map(kanaId),
        })
        buf = []
        bufRows = []
      }
    }
    if (buf.length) {
      units.push({
        id: `u-${script}-${units.length}`,
        title: `${scriptName}: ${bufRows.join(' · ')}`,
        subtitle: buf.map((b) => b.k).join(' '),
        kind: 'kana',
        level: 'Kana',
        itemIds: buf.map(kanaId),
      })
    }
    void base
  }

  // 2) Per JLPT level: interleave vocab (10s), kanji (5s), grammar (1 lesson)
  for (const level of ['N5', 'N4', 'N3'] as const) {
    const vGroups = chunk(c.vocab.filter((v) => v.level === level), 10)
    const kGroups = chunk(c.kanji.filter((k) => k.level === level), 5)
    const gLessons = c.grammar.filter((g) => g.level === level)
    const total = Math.max(vGroups.length, kGroups.length, gLessons.length)
    for (let i = 0; i < total; i++) {
      if (i < vGroups.length) {
        units.push({
          id: `u-${level}-v-${i}`,
          title: `Vocabulario ${level} · ${i + 1}`,
          subtitle: vGroups[i].map((v) => v.jp).slice(0, 5).join('、') + '…',
          kind: 'vocab',
          level,
          itemIds: vGroups[i].map(vocabId),
        })
      }
      if (i < kGroups.length) {
        units.push({
          id: `u-${level}-k-${i}`,
          title: `Kanji ${level} · ${i + 1}`,
          subtitle: kGroups[i].map((k) => k.k).join(' '),
          kind: 'kanji',
          level,
          itemIds: kGroups[i].map(kanjiId),
        })
      }
      if (i < gLessons.length) {
        units.push({
          id: `u-${level}-g-${i}`,
          title: gLessons[i].title,
          subtitle: gLessons[i].short,
          kind: 'grammar',
          level,
          itemIds: [gLessons[i].id],
        })
      }
    }
  }
  return units
}
