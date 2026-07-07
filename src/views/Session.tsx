import { useMemo, useRef, useState } from 'react'
import * as wanakana from 'wanakana'
import type { ItemLookup } from '../lib/content'
import type { AppState } from '../lib/store'
import { review } from '../lib/srs'
import { buildExercise, type Exercise } from '../lib/quiz'
import { speak } from '../lib/tts'
import { POS_LABELS } from '../lib/types'
import type { SessionSpec } from '../App'

interface Step {
  kind: 'intro' | 'ex'
  id: string
}

interface Props {
  spec: SessionSpec
  lookup: ItemLookup
  state: AppState
  mutate: (fn: (s: AppState) => void) => void
  onClose: () => void
}

export default function Session({ spec, lookup, state, mutate, onClose }: Props) {
  const [queue, setQueue] = useState<Step[]>(() => {
    const steps: Step[] = []
    for (const id of spec.itemIds) {
      if (spec.mode === 'learn') steps.push({ kind: 'intro', id })
      steps.push({ kind: 'ex', id })
    }
    return steps
  })
  const [idx, setIdx] = useState(0)
  const [seenIds] = useState(() => new Set<string>())
  const [correct, setCorrect] = useState(0)
  const [wrong, setWrong] = useState(0)
  const total = queue.length
  const step = queue[idx]

  const exercise = useMemo(
    () => (step?.kind === 'ex' ? buildExercise(step.id, lookup, seenIds.has(step.id) || spec.mode === 'review') : null),
    [idx, queue],
  )

  const advance = () => setIdx((i) => i + 1)

  const answered = (ok: boolean) => {
    const id = step.id
    seenIds.add(id)
    if (ok) {
      setCorrect((c) => c + 1)
      mutate((s) => review(s, id, 'good'))
    } else {
      setWrong((w) => w + 1)
      mutate((s) => review(s, id, 'again'))
      // requeue for another attempt at the end
      setQueue((q) => [...q, { kind: 'ex', id }])
    }
  }

  if (!step) {
    const acc = correct + wrong ? Math.round((correct / (correct + wrong)) * 100) : 100
    return (
      <div className="session">
        <div className="session-body" style={{ justifyContent: 'center', textAlign: 'center' }}>
          <div style={{ fontSize: '3.5rem' }}>{acc >= 80 ? '🎉' : '💪'}</div>
          <h1>¡Sesión completada!</h1>
          <p style={{ color: 'var(--muted)' }}>
            Aciertos: {correct} · Fallos: {wrong} · Precisión {acc}%
          </p>
        </div>
        <div className="session-actions">
          <button className="btn" onClick={onClose}>Volver al curso</button>
        </div>
      </div>
    )
  }

  return (
    <div className="session">
      <div className="session-top">
        <button className="speak-btn" onClick={onClose} aria-label="Salir">✕</button>
        <div className="progressbar"><div style={{ width: `${(idx / total) * 100}%` }} /></div>
        <span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>{idx}/{total}</span>
      </div>
      {step.kind === 'intro' ? (
        <IntroCard id={step.id} lookup={lookup} onNext={() => { seenIds.delete(step.id); advance() }} />
      ) : exercise ? (
        <ExerciseCard key={idx} ex={exercise} onAnswered={answered} onNext={advance} rate={state.settings.ttsRate} />
      ) : (
        // item missing from content: skip
        <SkipStep onNext={advance} />
      )}
    </div>
  )
}

function SkipStep({ onNext }: { onNext: () => void }) {
  onNext()
  return null
}

function IntroCard({ id, lookup, onNext }: { id: string; lookup: ItemLookup; onNext: () => void }) {
  let body = null
  if (id.startsWith('kn:')) {
    const k = lookup.kana.get(id)!
    body = (
      <div className="intro-card">
        <div className="prompt-big jp">{k.k}</div>
        <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{k.r}</div>
        <p className="prompt-hint">{k.t === 'h' ? 'hiragana' : 'katakana'}</p>
        <button className="speak-btn" onClick={() => speak(k.k)}>🔊</button>
        {k.mn && <div className="mn">💡 {k.mn}</div>}
      </div>
    )
  } else if (id.startsWith('v:')) {
    const v = lookup.vocab.get(id)!
    body = (
      <div className="intro-card">
        <div className="prompt-mid jp">{v.jp}</div>
        {v.jp !== v.kana && <div className="jp" style={{ color: 'var(--muted)' }}>{v.kana}</div>}
        <div style={{ fontSize: '1.2rem', fontWeight: 700, marginTop: 8 }}>{v.es}</div>
        <p className="prompt-hint">{POS_LABELS[v.pos] ?? v.pos}</p>
        <button className="speak-btn" onClick={() => speak(v.jp === v.kana ? v.kana : v.jp)}>🔊</button>
        <div className="example" style={{ textAlign: 'left', marginTop: 16 }}>
          <div className="jp-line jp" onClick={() => speak(v.ex.jp)}>{v.ex.jp} 🔉</div>
          <div className="kana-line jp">{v.ex.kana}</div>
          <div className="es-line">{v.ex.es}</div>
        </div>
      </div>
    )
  } else if (id.startsWith('k:')) {
    const k = lookup.kanji.get(id)!
    body = (
      <div className="intro-card">
        <div className="prompt-big jp">{k.k}</div>
        <div style={{ fontSize: '1.15rem', fontWeight: 700 }}>{k.es}</div>
        <p className="prompt-hint">
          {k.on.length > 0 && <>on: {k.on.join('・')} </>}
          {k.kun.length > 0 && <>kun: {k.kun.join('・')}</>} · {k.s} trazos
        </p>
        {k.mn && <div className="mn">💡 {k.mn}</div>}
        <div style={{ marginTop: 12 }}>
          {k.words.map((w) => (
            <div className="example" key={w.jp} style={{ textAlign: 'left' }} onClick={() => speak(w.jp)}>
              <div className="jp-line jp">{w.jp} 🔉</div>
              <div className="kana-line jp">{w.kana} · {w.es}</div>
            </div>
          ))}
        </div>
      </div>
    )
  }
  return (
    <>
      <div className="session-body">{body}</div>
      <div className="session-actions">
        <button className="btn" onClick={onNext}>Continuar</button>
      </div>
    </>
  )
}

function ExerciseCard({ ex, onAnswered, onNext, rate }: { ex: Exercise; onAnswered: (ok: boolean) => void; onNext: () => void; rate: number }) {
  const [picked, setPicked] = useState<number | null>(null)
  const [typed, setTyped] = useState('')
  const [result, setResult] = useState<boolean | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const finish = (ok: boolean) => {
    setResult(ok)
    onAnswered(ok)
  }

  const pick = (i: number, answer: number) => {
    if (result !== null) return
    setPicked(i)
    finish(i === answer)
  }

  const norm = (s: string) => wanakana.toHiragana(s.trim())

  const submitTyped = () => {
    if (result !== null || !typed.trim()) return
    if (ex.type === 'kana-type') {
      const ok =
        typed.trim().toLowerCase() === ex.item.r.toLowerCase() ||
        wanakana.toHiragana(typed.trim()) === wanakana.toHiragana(ex.item.k)
      finish(ok)
    } else if (ex.type === 'vocab-type') {
      finish(norm(typed) === norm(ex.item.kana))
    }
  }

  let prompt = null
  let options: string[] | null = null
  let answer = -1
  let correctText = ''
  let detail: React.ReactNode = null

  switch (ex.type) {
    case 'kana-mc':
      prompt = <div className="prompt-big jp">{ex.item.k}</div>
      options = ex.options; answer = ex.answer; correctText = ex.options[ex.answer]
      detail = ex.item.mn && <>💡 {ex.item.mn}</>
      break
    case 'kana-type':
      prompt = (
        <>
          <div className="prompt-big jp">{ex.item.k}</div>
          <p className="prompt-hint">Escribe la lectura en rōmaji</p>
        </>
      )
      correctText = ex.item.r
      break
    case 'vocab-mc-es':
      prompt = (
        <>
          <div className="prompt-mid jp">{ex.item.jp}</div>
          <p className="prompt-hint">¿Qué significa?</p>
        </>
      )
      options = ex.options; answer = ex.answer; correctText = ex.options[ex.answer]
      detail = <span className="jp">{ex.item.kana} · {ex.item.ex.jp}</span>
      break
    case 'vocab-mc-jp':
      prompt = (
        <>
          <div className="prompt-mid">{ex.item.es}</div>
          <p className="prompt-hint">¿Cómo se dice en japonés?</p>
        </>
      )
      options = ex.options; answer = ex.answer; correctText = ex.options[ex.answer]
      detail = <span className="jp">{ex.item.kana}</span>
      break
    case 'vocab-type':
      prompt = (
        <>
          <div className="prompt-mid jp">{ex.item.jp}</div>
          <p className="prompt-hint">«{ex.item.es}» · Escribe la lectura (rōmaji → kana automático)</p>
        </>
      )
      correctText = ex.item.kana
      break
    case 'vocab-listen':
      prompt = (
        <>
          <div style={{ textAlign: 'center', margin: '24px 0' }}>
            <button className="speak-btn" style={{ width: 80, height: 80, fontSize: '2rem' }} onClick={() => speak(ex.item.jp === ex.item.kana ? ex.item.kana : ex.item.jp, rate)}>🔊</button>
          </div>
          <p className="prompt-hint">Escucha y elige el significado</p>
        </>
      )
      options = ex.options; answer = ex.answer; correctText = ex.options[ex.answer]
      detail = <span className="jp">{ex.item.jp}（{ex.item.kana}）</span>
      break
    case 'kanji-mc-es':
      prompt = (
        <>
          <div className="prompt-big jp">{ex.item.k}</div>
          <p className="prompt-hint">¿Qué significa este kanji?</p>
        </>
      )
      options = ex.options; answer = ex.answer; correctText = ex.options[ex.answer]
      detail = ex.item.mn && <>💡 {ex.item.mn}</>
      break
    case 'kanji-mc-read':
      prompt = (
        <>
          <div className="prompt-mid jp">{ex.item.words[0]?.jp ?? ex.item.k}</div>
          <p className="prompt-hint">¿Cómo se lee? ({ex.item.words[0]?.es ?? ex.item.es})</p>
        </>
      )
      options = ex.options; answer = ex.answer; correctText = ex.options[ex.answer]
      break
  }

  const isTyping = ex.type === 'kana-type' || ex.type === 'vocab-type'

  return (
    <>
      <div className="session-body">
        {prompt}
        {isTyping && (
          <input
            ref={inputRef}
            className="type-input jp"
            value={typed}
            autoFocus
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="off"
            onChange={(e) => {
              const raw = e.target.value
              setTyped(ex.type === 'vocab-type' ? wanakana.toKana(raw, { IMEMode: true }) : raw)
            }}
            onKeyDown={(e) => e.key === 'Enter' && submitTyped()}
            disabled={result !== null}
          />
        )}
        {options && (
          <div className="opts">
            {options.map((o, i) => (
              <button
                key={i}
                className={`opt ${result !== null && i === answer ? 'correct' : ''} ${result !== null && picked === i && i !== answer ? 'wrong' : ''}`}
                onClick={() => pick(i, answer)}
              >
                <span className="jp">{o}</span>
              </button>
            ))}
          </div>
        )}
        {result !== null && (
          <div className={`feedback ${result ? 'ok' : 'ko'}`}>
            <strong>{result ? '¡Correcto!' : `Respuesta: ${correctText}`}</strong>
            {detail && <div style={{ marginTop: 6, color: 'var(--muted)' }}>{detail}</div>}
          </div>
        )}
      </div>
      <div className="session-actions">
        {isTyping && result === null ? (
          <button className="btn" onClick={submitTyped} disabled={!typed.trim()}>Comprobar</button>
        ) : (
          <button className="btn" onClick={onNext} disabled={result === null}>Continuar</button>
        )}
      </div>
    </>
  )
}
