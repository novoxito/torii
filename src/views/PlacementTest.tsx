import { useMemo, useState } from 'react'
import type { Content } from '../lib/types'
import { kanaId, kanjiId, vocabId } from '../lib/content'
import type { AppState } from '../lib/store'
import { markKnown } from '../lib/srs'

interface Props {
  content: Content
  mutate: (fn: (s: AppState) => void) => void
  onDone: () => void
}

type Lvl = 'Kana' | 'N5' | 'N4' | 'N3'

interface Question {
  prompt: string
  sub?: string
  big: boolean
  options: string[]
  answer: number
  tag: string
}

interface Block {
  level: Lvl
  label: string
  questions: Question[]
  /** all SRS item ids of this level, marked known if the block is passed */
  itemIds: string[]
  /** grammar lesson ids of this level */
  grammarIds: string[]
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function mc(correct: string, pool: string[]): { options: string[]; answer: number } {
  const distractors = [...new Set(shuffle(pool).filter((x) => x !== correct))].slice(0, 3)
  const options = shuffle([correct, ...distractors])
  return { options, answer: options.indexOf(correct) }
}

function buildBlocks(c: Content): Block[] {
  const blocks: Block[] = []

  // --- Kana ---
  const baseKana = c.kana.filter((k) => k.mn !== '')
  const allRomaji = c.kana.map((k) => k.r)
  const kanaQs: Question[] = shuffle(baseKana)
    .slice(0, 8)
    .map((k) => {
      const { options, answer } = mc(k.r, allRomaji)
      return { prompt: k.k, sub: k.t === 'h' ? 'hiragana' : 'katakana', big: true, options, answer, tag: 'kana' }
    })
  blocks.push({
    level: 'Kana',
    label: 'Kana (hiragana y katakana)',
    questions: kanaQs,
    itemIds: c.kana.map(kanaId),
    grammarIds: [],
  })

  // --- N5 / N4 / N3 ---
  for (const level of ['N5', 'N4', 'N3'] as const) {
    const vocab = c.vocab.filter((v) => v.level === level)
    const kanji = c.kanji.filter((k) => k.level === level)
    const grammar = c.grammar.filter((g) => g.level === level)
    const allEs = [...vocab.map((v) => v.es), ...kanji.map((k) => k.es)]

    const qs: Question[] = []
    // 5 vocab: show japanese, pick meaning
    for (const v of shuffle(vocab).slice(0, 5)) {
      const { options, answer } = mc(v.es, allEs)
      qs.push({ prompt: v.jp, sub: v.jp !== v.kana ? v.kana : undefined, big: false, options, answer, tag: 'vocab' })
    }
    // 3 kanji: show kanji, pick meaning
    for (const k of shuffle(kanji).slice(0, 3)) {
      const { options, answer } = mc(k.es, allEs)
      qs.push({ prompt: k.k, sub: undefined, big: true, options, answer, tag: 'kanji' })
    }
    // 2 grammar: pick the option that fills the gap (reuse first quiz of a lesson)
    for (const g of shuffle(grammar).slice(0, 2)) {
      const quiz = g.quiz[0]
      if (quiz) qs.push({ prompt: quiz.q, sub: undefined, big: false, options: quiz.options, answer: quiz.answer, tag: 'gramática' })
    }

    blocks.push({
      level,
      label: `${level}: vocabulario, kanji y gramática`,
      questions: shuffle(qs),
      itemIds: [...vocab.map(vocabId), ...kanji.map(kanjiId)],
      grammarIds: grammar.map((g) => g.id),
    })
  }
  return blocks
}

const PASS_RATIO = 0.7

export default function PlacementTest({ content, mutate, onDone }: Props) {
  const blocks = useMemo(() => buildBlocks(content), [content])
  const [bi, setBi] = useState(0)
  const [qi, setQi] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [correct, setCorrect] = useState(0)
  const [phase, setPhase] = useState<'q' | 'block' | 'done'>('q')
  const [lastPassed, setLastPassed] = useState<boolean>(false)
  const [startLevel, setStartLevel] = useState<string>('Kana')

  const block = blocks[bi]
  const q = block?.questions[qi]
  const totalQ = block ? block.questions.length : 0
  const needed = Math.ceil(totalQ * PASS_RATIO)

  const pick = (i: number) => {
    if (picked !== null) return
    setPicked(i)
    if (i === q.answer) setCorrect((c) => c + 1)
  }

  const next = () => {
    setPicked(null)
    if (qi + 1 < totalQ) {
      setQi(qi + 1)
      return
    }
    // block finished
    const passed = correct >= needed
    setLastPassed(passed)
    if (passed) {
      // mark everything in this level as already known and jump ahead
      mutate((s) => {
        markKnown(s, block.itemIds)
        for (const id of block.grammarIds) if (!s.grammarDone.includes(id)) s.grammarDone.push(id)
      })
    }
    if (passed && bi + 1 < blocks.length) {
      setPhase('block')
    } else {
      // stop: either failed here, or passed everything
      setStartLevel(passed ? 'Completo' : block.level)
      setPhase('done')
    }
  }

  const continueNextBlock = () => {
    setBi(bi + 1)
    setQi(0)
    setCorrect(0)
    setPicked(null)
    setPhase('q')
  }

  const finish = () => {
    mutate((s) => {
      s.onboarded = true
    })
    onDone()
  }

  const skip = () => {
    mutate((s) => {
      s.onboarded = true
    })
    onDone()
  }

  // ---- render ----
  if (phase === 'done') {
    const passedAll = startLevel === 'Completo'
    return (
      <div className="session">
        <div className="session-body" style={{ justifyContent: 'center', textAlign: 'center' }}>
          <div style={{ fontSize: '3.5rem' }}>{passedAll ? '🏆' : '🎯'}</div>
          <h1>{passedAll ? '¡Nivel altísimo!' : 'Nivel detectado'}</h1>
          {passedAll ? (
            <p style={{ color: 'var(--muted)' }}>
              Has superado todos los bloques. Marco todo el curso como dominado; en la pestaña Curso te tocará repasar
              para consolidar. Si quieres, puedes reiniciar tu progreso en Ajustes.
            </p>
          ) : (
            <p style={{ color: 'var(--muted)' }}>
              Empiezas en <strong style={{ color: 'var(--accent2)' }}>{startLevel}</strong>. Todo lo anterior queda
              marcado como dominado y aparecerá solo para repasar de vez en cuando. Ve a la pestaña <strong>Curso</strong> y
              pulsa una unidad para empezar a aprender.
            </p>
          )}
        </div>
        <div className="session-actions">
          <button className="btn green" onClick={finish}>
            Empezar a estudiar
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'block') {
    return (
      <div className="session">
        <div className="session-body" style={{ justifyContent: 'center', textAlign: 'center' }}>
          <div style={{ fontSize: '3.5rem' }}>{lastPassed ? '✅' : '🔎'}</div>
          <h1>¡Dominas {block.level}!</h1>
          <p style={{ color: 'var(--muted)' }}>
            {correct}/{totalQ} correctas. Lo marco como sabido y probamos el siguiente nivel:{' '}
            <strong style={{ color: 'var(--accent2)' }}>{blocks[bi + 1].level}</strong>.
          </p>
        </div>
        <div className="session-actions">
          <button className="btn" onClick={continueNextBlock}>
            Seguir con {blocks[bi + 1].level} →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="session">
      <div className="session-top">
        <button className="speak-btn" onClick={skip} aria-label="Saltar">
          ✕
        </button>
        <div className="progressbar">
          <div style={{ width: `${(qi / totalQ) * 100}%` }} />
        </div>
        <span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>
          {block.level} · {qi + 1}/{totalQ}
        </span>
      </div>
      <div className="session-body">
        <p className="prompt-hint" style={{ marginTop: 0 }}>
          Prueba de nivel · {block.label}
        </p>
        {q.big ? <div className="prompt-big jp">{q.prompt}</div> : <div className="prompt-mid jp">{q.prompt}</div>}
        {q.sub && <div className="jp" style={{ textAlign: 'center', color: 'var(--muted)' }}>{q.sub}</div>}
        <p className="prompt-hint">
          {q.tag === 'kana' ? 'Lectura en rōmaji' : q.tag === 'gramática' ? 'Elige la opción correcta' : '¿Qué significa?'}
        </p>
        <div className="opts">
          {q.options.map((o, i) => (
            <button
              key={i}
              className={`opt ${picked !== null && i === q.answer ? 'correct' : ''} ${
                picked === i && i !== q.answer ? 'wrong' : ''
              }`}
              onClick={() => pick(i)}
            >
              <span className="jp">{o}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="session-actions">
        <button className="btn" onClick={next} disabled={picked === null}>
          {qi + 1 < totalQ ? 'Siguiente' : 'Ver resultado'}
        </button>
      </div>
    </div>
  )
}
