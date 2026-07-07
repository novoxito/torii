// Merge *.partN.json files into final content JSONs, validate and dedupe.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const DIR = fileURLToPath(new URL('../public/content/', import.meta.url))

const files = readdirSync(DIR).filter((f) => f.endsWith('.json'))
const groups = {}
for (const f of files) {
  const m = f.match(/^(.+?)\.part(\d+)\.json$/)
  if (!m) continue
  ;(groups[m[1]] ??= []).push({ n: Number(m[2]), f })
}

const keyOf = {
  kana: (x) => `${x.t}:${x.k}`,
  kanji_n5: (x) => x.k,
  kanji_n4: (x) => x.k,
  kanji_n3: (x) => x.k,
  vocab_n5: (x) => `${x.jp}|${x.kana}`,
  vocab_n4: (x) => `${x.jp}|${x.kana}`,
  vocab_n3: (x) => `${x.jp}|${x.kana}`,
  grammar_n5: (x) => x.id,
  grammar_n4: (x) => x.id,
  grammar_n3: (x) => x.id,
}

// cross-level dedupe: later levels must not repeat earlier ones
const crossSeen = { kanji: new Set(), vocab: new Set() }
const order = ['kana', 'kanji_n5', 'kanji_n4', 'kanji_n3', 'vocab_n5', 'vocab_n4', 'vocab_n3', 'grammar_n5', 'grammar_n4', 'grammar_n3']

let hadError = false
for (const name of order) {
  if (!groups[name]) continue
  const parts = groups[name].sort((a, b) => a.n - b.n)
  const merged = []
  const seen = new Set()
  let dupes = 0
  for (const { f } of parts) {
    let arr
    try {
      arr = JSON.parse(readFileSync(join(DIR, f), 'utf8'))
    } catch (e) {
      console.error(`INVALID JSON: ${f}: ${e.message}`)
      hadError = true
      continue
    }
    if (!Array.isArray(arr)) {
      console.error(`NOT AN ARRAY: ${f}`)
      hadError = true
      continue
    }
    for (const item of arr) {
      const key = keyOf[name](item)
      const family = name.startsWith('kanji') ? 'kanji' : name.startsWith('vocab') ? 'vocab' : null
      if (seen.has(key) || (family && crossSeen[family].has(key))) {
        dupes++
        continue
      }
      seen.add(key)
      if (family) crossSeen[family].add(key)
      merged.push(item)
    }
  }
  writeFileSync(join(DIR, `${name}.json`), JSON.stringify(merged), 'utf8')
  console.log(`${name}.json: ${merged.length} entradas (${parts.length} partes, ${dupes} duplicados eliminados)`)
}

// sanity checks on final files
const checks = {
  'kana.json': (a) => a.every((x) => x.k && x.r && (x.t === 'h' || x.t === 'k')),
  'kanji_n5.json': (a) => a.every((x) => x.k && x.es && Array.isArray(x.words)),
  'vocab_n5.json': (a) => a.every((x) => x.jp && x.kana && x.es && x.ex?.jp),
  'grammar_n5.json': (a) => a.every((x) => x.id && x.title && x.examples?.length && x.quiz?.length),
}
for (const [f, check] of Object.entries(checks)) {
  try {
    const arr = JSON.parse(readFileSync(join(DIR, f), 'utf8'))
    if (!check(arr)) {
      console.error(`SCHEMA FAIL: ${f}`)
      hadError = true
    }
  } catch {
    console.error(`MISSING/INVALID: ${f}`)
    hadError = true
  }
}
for (const f of ['stories_n5.json', 'stories_n4.json', 'stories_n3.json']) {
  try {
    const arr = JSON.parse(readFileSync(join(DIR, f), 'utf8'))
    console.log(`${f}: ${arr.length} historias`)
  } catch (e) {
    console.error(`INVALID: ${f}: ${e.message}`)
    hadError = true
  }
}
process.exit(hadError ? 1 : 0)
