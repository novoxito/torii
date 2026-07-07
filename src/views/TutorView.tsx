import { useEffect, useRef, useState } from 'react'
import type { AppState } from '../lib/store'
import { chat, hasKey, type ChatMsg } from '../lib/ai'
import { speak } from '../lib/tts'

interface Props {
  state: AppState
  mutate: (fn: (s: AppState) => void) => void
}

const QUICK = [
  'Corrige esta frase: ',
  'Conversemos en japonés fácil (nivel N5)',
  '¿Cuál es la diferencia entre は y が?',
  'Ponme un mini examen de 5 preguntas de N5',
  'Enséñame 3 frases útiles para comprar en una tienda',
]

export default function TutorView({ state }: Props) {
  const [messages, setMessages] = useState<ChatMsg[]>(() => {
    try {
      return JSON.parse(sessionStorage.getItem('torii-chat') ?? '[]')
    } catch {
      return []
    }
  })
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    sessionStorage.setItem('torii-chat', JSON.stringify(messages))
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, busy])

  const keyReady = hasKey(state.settings)

  const send = async (text: string) => {
    if (!text.trim() || busy) return
    setError('')
    const history: ChatMsg[] = [...messages, { role: 'user', content: text.trim() }]
    setMessages(history)
    setInput('')
    setBusy(true)
    try {
      const reply = await chat(state.settings, history)
      setMessages([...history, { role: 'assistant', content: reply }])
    } catch (e: any) {
      setError(String(e?.message ?? e))
    } finally {
      setBusy(false)
    }
  }

  if (!keyReady) {
    return (
      <div className="page">
        <h1>🤖 Tutor IA</h1>
        <div className="card">
          <p style={{ marginTop: 0 }}>
            Para hablar con tu tutor necesitas una API key. La de <strong>Google Gemini es gratuita</strong>:
          </p>
          <ol style={{ lineHeight: 1.7, paddingLeft: 20 }}>
            <li>Entra en <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" style={{ color: 'var(--blue)' }}>aistudio.google.com/apikey</a></li>
            <li>Crea una key (botón «Create API key»)</li>
            <li>Pégala en <strong>Ajustes → Tutor IA</strong></li>
          </ol>
          <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
            También puedes usar una key de Anthropic (Claude) si tienes una. La key se guarda solo en tu móvil, nunca sale de ahí salvo hacia Google/Anthropic.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="page" style={{ paddingBottom: 0 }}>
      <h1>🤖 Tutor IA</h1>
      <div className="chips">
        {QUICK.map((q) => (
          <button key={q} className="chip" onClick={() => (q.endsWith(': ') ? setInput(q) : send(q))}>
            {q.replace(': ', '…')}
          </button>
        ))}
        {messages.length > 0 && (
          <button className="chip" onClick={() => setMessages([])}>🧹 Nueva conversación</button>
        )}
      </div>
      <div className="chat">
        {messages.length === 0 && (
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
            こんにちは！Soy tu tutor. Escríbeme en español o japonés: corrijo tus frases, te explico gramática o conversamos a tu nivel.
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.role === 'user' ? 'user' : 'ai'}`}>
            {m.content}
            {m.role === 'assistant' && (
              <div style={{ marginTop: 6 }}>
                <button className="chip" onClick={() => {
                  const ja = m.content.match(/[぀-ヿ一-龯][぀-ヿ一-龯、。！？ー\s]*/g)?.join('。') ?? ''
                  if (ja) speak(ja, state.settings.ttsRate)
                }}>🔊 Oír japonés</button>
              </div>
            )}
          </div>
        ))}
        {busy && <div className="msg ai">Escribiendo…</div>}
        {error && <div className="feedback ko">{error}</div>}
        <div ref={bottomRef} />
      </div>
      <div className="chat-input-row">
        <input
          value={input}
          placeholder="Escribe en español o japonés…"
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send(input)}
        />
        <button className="btn small" onClick={() => send(input)} disabled={busy || !input.trim()}>➤</button>
      </div>
    </div>
  )
}
