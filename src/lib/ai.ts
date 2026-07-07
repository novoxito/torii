import type { Settings } from './store'

export interface ChatMsg {
  role: 'user' | 'assistant'
  content: string
}

const SYSTEM = `Eres Torii-sensei, un tutor de japonés cercano y exigente para un estudiante hispanohablante (español de España) de nivel N5-N4 que quiere llegar a dominar el idioma.

Reglas:
- Responde SIEMPRE en español, salvo el japonés que enseñas.
- Cada vez que escribas japonés con kanji, añade la lectura en hiragana entre paréntesis justo después. Ejemplo: 勉強(べんきょう).
- Si el estudiante escribe una frase en japonés, corrígela: versión correcta, qué estaba mal y por qué, y una alternativa más natural.
- Si conversáis en japonés, adapta tu nivel al suyo y desliza 1 palabra o estructura nueva por mensaje, explicándola al final.
- Sé concreto y breve. Nada de párrafos largos. Usa listas cuando ayude.
- Si pide ejemplos, da 3 como máximo, del más simple al más complejo.`

async function callGemini(settings: Settings, history: ChatMsg[]): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${settings.geminiModel}:generateContent?key=${encodeURIComponent(settings.geminiKey)}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM }] },
      contents: history.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
      generationConfig: { maxOutputTokens: 1024, temperature: 0.7 },
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Gemini ${res.status}: ${body.slice(0, 300)}`)
  }
  const data = await res.json()
  const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? '').join('')
  if (!text) throw new Error('Gemini no devolvió texto. ¿Bloqueo de seguridad o cuota agotada?')
  return text
}

async function callClaude(settings: Settings, history: ChatMsg[]): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': settings.claudeKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: settings.claudeModel,
      max_tokens: 1024,
      system: SYSTEM,
      messages: history.map((m) => ({ role: m.role, content: m.content })),
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Claude ${res.status}: ${body.slice(0, 300)}`)
  }
  const data = await res.json()
  const text = (data?.content ?? [])
    .filter((b: any) => b.type === 'text')
    .map((b: any) => b.text)
    .join('')
  if (!text) throw new Error('Claude no devolvió texto.')
  return text
}

export function hasKey(settings: Settings): boolean {
  return settings.aiProvider === 'gemini' ? !!settings.geminiKey : !!settings.claudeKey
}

export async function chat(settings: Settings, history: ChatMsg[]): Promise<string> {
  if (settings.aiProvider === 'gemini') return callGemini(settings, history)
  return callClaude(settings, history)
}
