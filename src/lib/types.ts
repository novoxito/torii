export interface KanaItem {
  k: string
  r: string
  t: 'h' | 'k'
  row: string
  mn: string
}

export interface KanjiWord {
  jp: string
  kana: string
  es: string
}

export interface KanjiItem {
  k: string
  es: string
  on: string[]
  kun: string[]
  mn: string
  words: KanjiWord[]
  s: number
  level: 'N5' | 'N4' | 'N3'
}

export interface VocabItem {
  jp: string
  kana: string
  es: string
  pos: string
  ex: { jp: string; kana: string; es: string }
  level: 'N5' | 'N4' | 'N3'
}

export interface GrammarQuiz {
  q: string
  options: string[]
  answer: number
  why: string
}

export interface GrammarLesson {
  id: string
  title: string
  short: string
  level: 'N5' | 'N4' | 'N3'
  explanation: string
  examples: { jp: string; kana: string; es: string }[]
  quiz: GrammarQuiz[]
}

export interface StorySentence {
  jp: string
  kana: string
  es: string
}

export interface Story {
  id: string
  title: string
  titleEs: string
  level: 'N5' | 'N4' | 'N3'
  body: StorySentence[]
  vocab: { jp: string; es: string }[]
}

export interface Content {
  kana: KanaItem[]
  kanji: KanjiItem[]
  vocab: VocabItem[]
  grammar: GrammarLesson[]
  stories: Story[]
}

/** A learnable unit shown in the course path */
export interface Unit {
  id: string
  title: string
  subtitle: string
  kind: 'kana' | 'kanji' | 'vocab' | 'grammar'
  level: string
  itemIds: string[] // SRS item ids (or [lessonId] for grammar)
}

export type ItemKind = 'kana' | 'kanji' | 'vocab'

export const POS_LABELS: Record<string, string> = {
  n: 'sustantivo',
  v1: 'verbo godan',
  v2: 'verbo ichidan',
  v3: 'verbo irregular',
  'adj-i': 'adjetivo い',
  'adj-na': 'adjetivo な',
  adv: 'adverbio',
  part: 'partícula',
  exp: 'expresión',
  num: 'número',
  cnt: 'contador',
}
