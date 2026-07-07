import { useState } from 'react'
import type { Content, GrammarLesson } from '../lib/types'
import type { AppState } from '../lib/store'
import { speak } from '../lib/tts'

interface Props {
  content: Content
  state: AppState
  mutate: (fn: (s: AppState) => void) => void
}

/** minimal markdown: **bold** and line breaks */
function md(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((p, i) =>
    p.startsWith('**') ? <strong key={i}>{p.slice(2, -2)}</strong> : <span key={i}>{p}</span>,
  )
}

export default function GrammarView({ content, state, mutate }: Props) {
  const [level, setLevel] = useState<'N5' | 'N4' | 'N3'>('N5')
  const [open, setOpen] = useState<GrammarLesson | null>(null)

  const lessons = content.grammar.filter((g) => g.level === level)

  if (open) return <LessonDetail lesson={open} done={state.grammarDone.includes(open.id)} onDone={() => mutate((s) => { if (!s.grammarDone.includes(open.id)) s.grammarDone.push(open.id) })} onBack={() => setOpen(null)} />

  return (
    <div className="page">
      <h1>📖 Gramática</h1>
      <div className="chips">
        {(['N5', 'N4', 'N3'] as const).map((l) => (
          <button key={l} className="chip" style={level === l ? { background: 'var(--accent)', color: '#fff' } : {}} onClick={() => setLevel(l)}>
            {l} ({content.grammar.filter((g) => g.level === l).length})
          </button>
        ))}
      </div>
      {lessons.map((g) => {
        const done = state.grammarDone.includes(g.id)
        return (
          <div key={g.id} className={`unit ${done ? 'done' : ''}`} onClick={() => setOpen(g)}>
            <div className="ico">{done ? '✅' : '📖'}</div>
            <div>
              <div className="t jp">{g.title}</div>
              <div className="s">{g.short}</div>
            </div>
          </div>
        )
      })}
      {!lessons.length && <p style={{ color: 'var(--muted)' }}>No hay lecciones de este nivel todavía.</p>}
    </div>
  )
}

function LessonDetail({ lesson, done, onDone, onBack }: { lesson: GrammarLesson; done: boolean; onDone: () => void; onBack: () => void }) {
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const allCorrect = lesson.quiz.every((q, i) => answers[i] === q.answer)

  return (
    <div className="page">
      <button className="btn small secondary" onClick={onBack}>← Volver</button>
      <h1 className="jp" style={{ marginTop: 12 }}>{lesson.title}</h1>
      <span className={`pill ${lesson.level.toLowerCase()}`}>{lesson.level}</span>
      <p className="lesson-exp">{lesson.explanation.split('\n').map((line, i) => <span key={i}>{md(line)}<br /></span>)}</p>

      <h2>Ejemplos</h2>
      {lesson.examples.map((e, i) => (
        <div className="example" key={i} onClick={() => speak(e.jp)}>
          <div className="jp-line jp">{e.jp} 🔉</div>
          <div className="kana-line jp">{e.kana}</div>
          <div className="es-line">{e.es}</div>
        </div>
      ))}

      <h2>Mini test</h2>
      {lesson.quiz.map((q, qi) => {
        const picked = answers[qi]
        return (
          <div className="card" key={qi}>
            <p className="jp" style={{ marginTop: 0 }}>{q.q}</p>
            <div className="opts">
              {q.options.map((o, oi) => (
                <button
                  key={oi}
                  className={`opt ${picked !== undefined && oi === q.answer ? 'correct' : ''} ${picked === oi && oi !== q.answer ? 'wrong' : ''}`}
                  onClick={() => picked === undefined && setAnswers((a) => ({ ...a, [qi]: oi }))}
                >
                  <span className="jp">{o}</span>
                </button>
              ))}
            </div>
            {picked !== undefined && (
              <div className={`feedback ${picked === q.answer ? 'ok' : 'ko'}`}>{q.why}</div>
            )}
          </div>
        )
      })}

      <button className={`btn ${allCorrect || done ? 'green' : ''}`} onClick={() => { onDone(); onBack() }}>
        {done ? 'Lección completada ✅' : allCorrect ? '¡Perfecto! Marcar como completada' : 'Marcar como completada'}
      </button>
    </div>
  )
}
