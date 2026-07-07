import { useState } from 'react'
import type { Content, Story } from '../lib/types'
import type { AppState } from '../lib/store'
import { speak } from '../lib/tts'

interface Props {
  content: Content
  state: AppState
  mutate: (fn: (s: AppState) => void) => void
}

export default function StoriesView({ content, state, mutate }: Props) {
  const [open, setOpen] = useState<Story | null>(null)

  if (open) {
    return (
      <Reader
        story={open}
        furigana={state.settings.furigana}
        rate={state.settings.ttsRate}
        onBack={() => setOpen(null)}
        onRead={() => mutate((s) => { if (!s.storiesRead.includes(open.id)) s.storiesRead.push(open.id) })}
      />
    )
  }

  return (
    <div className="page">
      <h1>📚 Lecturas graduadas</h1>
      <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
        Historias originales por nivel. Toca una frase para ver la traducción y escúchala con 🔉.
      </p>
      {(['N5', 'N4', 'N3'] as const).map((lvl) => (
        <div key={lvl}>
          <h2>{lvl}</h2>
          {content.stories.filter((s) => s.level === lvl).map((s) => {
            const read = state.storiesRead.includes(s.id)
            return (
              <div key={s.id} className={`unit ${read ? 'done' : ''}`} onClick={() => setOpen(s)}>
                <div className="ico">{read ? '✅' : '📚'}</div>
                <div>
                  <div className="t jp">{s.title}</div>
                  <div className="s">{s.titleEs} · {s.body.length} frases</div>
                </div>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

function Reader({ story, furigana, rate, onBack, onRead }: { story: Story; furigana: boolean; rate: number; onBack: () => void; onRead: () => void }) {
  const [revealed, setRevealed] = useState<Set<number>>(new Set())

  return (
    <div className="page">
      <button className="btn small secondary" onClick={onBack}>← Volver</button>
      <h1 className="jp" style={{ marginTop: 12 }}>{story.title}</h1>
      <p style={{ color: 'var(--muted)', marginTop: 0 }}>{story.titleEs} · <span className={`pill ${story.level.toLowerCase()}`}>{story.level}</span></p>

      {story.body.map((sen, i) => (
        <div
          key={i}
          className="story-sentence"
          onClick={() => setRevealed((r) => { const n = new Set(r); n.has(i) ? n.delete(i) : n.add(i); return n })}
        >
          <div className="jp-line jp">
            {sen.jp}{' '}
            <span onClick={(e) => { e.stopPropagation(); speak(sen.jp, rate) }}>🔉</span>
          </div>
          {furigana && sen.kana !== sen.jp && <div className="kana-line jp">{sen.kana}</div>}
          {revealed.has(i) && <div className="es-line">{sen.es}</div>}
        </div>
      ))}

      <h2>Vocabulario clave</h2>
      <div className="card">
        {story.vocab.map((v, i) => (
          <p key={i} style={{ margin: '6px 0' }}>
            <span className="jp" style={{ fontWeight: 700 }}>{v.jp}</span>{' '}
            <span style={{ color: 'var(--muted)' }}>{v.es}</span>
          </p>
        ))}
      </div>
      <button className="btn green" onClick={() => { onRead(); onBack() }}>Marcar como leída ✅</button>
    </div>
  )
}
