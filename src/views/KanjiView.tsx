import { useEffect, useRef, useState } from 'react'
import type { Content, KanjiItem } from '../lib/types'
import type { AppState } from '../lib/store'
import { kanjiId } from '../lib/content'
import { speak } from '../lib/tts'

interface Props {
  content: Content
  state: AppState
}

export default function KanjiView({ content, state }: Props) {
  const [level, setLevel] = useState<'N5' | 'N4' | 'N3'>('N5')
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState<KanjiItem | null>(null)

  const list = content.kanji.filter(
    (k) =>
      (query
        ? k.k === query.trim() || k.es.toLowerCase().includes(query.toLowerCase())
        : k.level === level),
  )

  return (
    <div className="page">
      <h1>漢 Kanji</h1>
      <div className="field">
        <input placeholder="Buscar por kanji o significado…" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      {!query && (
        <div className="chips">
          {(['N5', 'N4', 'N3'] as const).map((l) => (
            <button key={l} className="chip" style={level === l ? { background: 'var(--accent)', color: '#fff' } : {}} onClick={() => setLevel(l)}>
              {l} ({content.kanji.filter((k) => k.level === l).length})
            </button>
          ))}
        </div>
      )}
      <div className="kanji-grid">
        {list.map((k) => (
          <div
            key={k.k}
            className={`kanji-cell jp ${state.cards[kanjiId(k)] ? 'learned' : ''}`}
            onClick={() => setOpen(k)}
          >
            {k.k}
          </div>
        ))}
      </div>
      {open && <KanjiModal k={open} onClose={() => setOpen(null)} />}
    </div>
  )
}

function kanjivgUrl(char: string): string {
  const hex = char.codePointAt(0)!.toString(16).padStart(5, '0')
  return `https://cdn.jsdelivr.net/gh/KanjiVG/kanjivg@master/kanji/${hex}.svg`
}

function KanjiModal({ k, onClose }: { k: KanjiItem; onClose: () => void }) {
  const [svg, setSvg] = useState<string | null>(null)
  const [draw, setDraw] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let alive = true
    fetch(kanjivgUrl(k.k))
      .then((r) => (r.ok ? r.text() : Promise.reject()))
      .then((t) => alive && setSvg(t))
      .catch(() => alive && setSvg(null))
    return () => { alive = false }
  }, [k.k])

  // animate strokes when svg mounts
  useEffect(() => {
    if (!svg || !boxRef.current) return
    const paths = boxRef.current.querySelectorAll<SVGPathElement>('svg path')
    let delay = 0
    paths.forEach((p) => {
      const len = p.getTotalLength()
      p.style.strokeDasharray = `${len}`
      p.style.strokeDashoffset = `${len}`
      p.style.transition = 'none'
      requestAnimationFrame(() => {
        p.style.transition = `stroke-dashoffset 0.5s ease ${delay}s`
        p.style.strokeDashoffset = '0'
      })
      delay += 0.45
    })
  }, [svg, draw])

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 className="jp" style={{ margin: 0 }}>{k.k} <span style={{ fontSize: '1rem', color: 'var(--muted)' }}>{k.es}</span></h1>
          <button className="speak-btn" onClick={onClose}>✕</button>
        </div>
        <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
          {k.on.length > 0 && <>on: <span className="jp">{k.on.join('・')}</span> · </>}
          {k.kun.length > 0 && <>kun: <span className="jp">{k.kun.join('・')}</span> · </>}
          {k.s} trazos · <span className={`pill ${k.level.toLowerCase()}`}>{k.level}</span>
        </p>

        {!draw ? (
          <>
            <div className="stroke-box" ref={boxRef}>
              {svg ? (
                <div dangerouslySetInnerHTML={{ __html: svg.slice(svg.indexOf('<svg')) }} />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '5rem' }} className="jp">{k.k}</div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 10 }}>
              <button className="btn small secondary" onClick={() => setSvg((s) => (s ? s + ' ' : s))}>▶ Repetir trazos</button>
              <button className="btn small secondary" onClick={() => setDraw(true)}>✍️ Practicar</button>
            </div>
          </>
        ) : (
          <DrawPad ghost={k.k} onBack={() => setDraw(false)} />
        )}

        {k.mn && <div className="card" style={{ marginTop: 14 }}>💡 {k.mn}</div>}
        {k.words.map((w) => (
          <div className="example" key={w.jp} onClick={() => speak(w.jp)}>
            <div className="jp-line jp">{w.jp} 🔉</div>
            <div className="kana-line jp">{w.kana} · {w.es}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function DrawPad({ ghost, onBack }: { ghost: string; onBack: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)

  useEffect(() => {
    const c = canvasRef.current!
    const ctx = c.getContext('2d')!
    ctx.clearRect(0, 0, c.width, c.height)
    // ghost character
    ctx.font = '200px "Hiragino Sans", "Noto Sans JP", sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.08)'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(ghost, c.width / 2, c.height / 2 + 10)
    ctx.strokeStyle = '#ff5a4e'
    ctx.lineWidth = 7
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [ghost])

  const pos = (e: React.PointerEvent) => {
    const r = canvasRef.current!.getBoundingClientRect()
    return { x: ((e.clientX - r.left) / r.width) * 260, y: ((e.clientY - r.top) / r.height) * 260 }
  }

  return (
    <div style={{ textAlign: 'center' }}>
      <canvas
        ref={canvasRef}
        className="draw-canvas"
        width={260}
        height={260}
        style={{ width: 260, height: 260 }}
        onPointerDown={(e) => {
          drawing.current = true
          const ctx = canvasRef.current!.getContext('2d')!
          const p = pos(e)
          ctx.beginPath()
          ctx.moveTo(p.x, p.y)
        }}
        onPointerMove={(e) => {
          if (!drawing.current) return
          const ctx = canvasRef.current!.getContext('2d')!
          const p = pos(e)
          ctx.lineTo(p.x, p.y)
          ctx.stroke()
        }}
        onPointerUp={() => { drawing.current = false }}
        onPointerLeave={() => { drawing.current = false }}
      />
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 10 }}>
        <button
          className="btn small secondary"
          onClick={() => {
            const c = canvasRef.current!
            const ctx = c.getContext('2d')!
            ctx.clearRect(0, 0, c.width, c.height)
            ctx.font = '200px "Hiragino Sans", "Noto Sans JP", sans-serif'
            ctx.fillStyle = 'rgba(255,255,255,0.08)'
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText(ghost, c.width / 2, c.height / 2 + 10)
            ctx.strokeStyle = '#ff5a4e'
            ctx.lineWidth = 7
            ctx.lineCap = 'round'
            ctx.lineJoin = 'round'
          }}
        >
          🧹 Borrar
        </button>
        <button className="btn small secondary" onClick={onBack}>← Trazos</button>
      </div>
    </div>
  )
}
