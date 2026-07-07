import { useState } from 'react'
import type { AppState } from '../lib/store'
import { exportState, importState, defaultState, loadState } from '../lib/store'

interface Props {
  state: AppState
  mutate: (fn: (s: AppState) => void) => void
  setState: (s: AppState) => void
}

export default function SettingsView({ state, mutate, setState }: Props) {
  const [importText, setImportText] = useState('')
  const [msg, setMsg] = useState('')
  const s = state.settings

  const set = (patch: Partial<typeof s>) => mutate((st) => Object.assign(st.settings, patch))

  const download = () => {
    const blob = new Blob([exportState()], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `torii-progreso-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    setMsg('Progreso exportado ✅')
  }

  return (
    <div className="page">
      <h1>⚙️ Ajustes</h1>

      <h2>Estudio</h2>
      <div className="field">
        <label>Elementos nuevos por día: {s.newPerDay}</label>
        <input type="range" min={5} max={50} step={5} value={s.newPerDay} onChange={(e) => set({ newPerDay: Number(e.target.value) })} />
      </div>
      <div className="field">
        <label>Velocidad de la voz japonesa: {s.ttsRate.toFixed(1)}</label>
        <input type="range" min={0.5} max={1.2} step={0.1} value={s.ttsRate} onChange={(e) => set({ ttsRate: Number(e.target.value) })} />
      </div>
      <div className="field">
        <label>
          <input type="checkbox" checked={s.furigana} onChange={(e) => set({ furigana: e.target.checked })} style={{ width: 'auto', marginRight: 8 }} />
          Mostrar furigana (lectura en kana) en las lecturas
        </label>
      </div>

      <h2>Tutor IA</h2>
      <div className="field">
        <label>Proveedor</label>
        <select value={s.aiProvider} onChange={(e) => set({ aiProvider: e.target.value as 'gemini' | 'claude' })}>
          <option value="gemini">Google Gemini (key gratuita)</option>
          <option value="claude">Anthropic Claude (key de pago)</option>
        </select>
      </div>
      {s.aiProvider === 'gemini' ? (
        <>
          <div className="field">
            <label>API key de Gemini (gratis en aistudio.google.com/apikey)</label>
            <input type="password" value={s.geminiKey} placeholder="AIza…" onChange={(e) => set({ geminiKey: e.target.value.trim() })} />
          </div>
          <div className="field">
            <label>Modelo</label>
            <select value={s.geminiModel} onChange={(e) => set({ geminiModel: e.target.value })}>
              <option value="gemini-2.5-flash">gemini-2.5-flash (recomendado)</option>
              <option value="gemini-2.5-pro">gemini-2.5-pro (mejor, cuota menor)</option>
              <option value="gemini-2.0-flash">gemini-2.0-flash</option>
            </select>
          </div>
        </>
      ) : (
        <>
          <div className="field">
            <label>API key de Anthropic (console.anthropic.com)</label>
            <input type="password" value={s.claudeKey} placeholder="sk-ant-…" onChange={(e) => set({ claudeKey: e.target.value.trim() })} />
          </div>
          <div className="field">
            <label>Modelo</label>
            <select value={s.claudeModel} onChange={(e) => set({ claudeModel: e.target.value })}>
              <option value="claude-sonnet-5">claude-sonnet-5 (recomendado)</option>
              <option value="claude-haiku-4-5-20251001">claude-haiku-4-5 (más barato)</option>
              <option value="claude-opus-4-8">claude-opus-4-8 (el mejor)</option>
            </select>
          </div>
        </>
      )}
      <p style={{ color: 'var(--muted)', fontSize: '0.78rem' }}>
        Las keys se guardan solo en este dispositivo (localStorage) y se envían únicamente al proveedor elegido.
      </p>

      <h2>Copia de seguridad</h2>
      <div className="row2">
        <button className="btn secondary" onClick={download}>⬇️ Exportar progreso</button>
      </div>
      <div className="field" style={{ marginTop: 10 }}>
        <label>Importar progreso (pega aquí el JSON exportado)</label>
        <input value={importText} placeholder='{"version":1,…}' onChange={(e) => setImportText(e.target.value)} />
        <button
          className="btn small secondary"
          style={{ marginTop: 8 }}
          onClick={() => {
            if (importState(importText)) {
              setState(loadState())
              setImportText('')
              setMsg('Progreso importado ✅')
            } else setMsg('JSON no válido ❌')
          }}
        >
          Importar
        </button>
      </div>
      {msg && <p style={{ color: 'var(--green)' }}>{msg}</p>}

      <h2>Peligro</h2>
      <button
        className="btn secondary"
        style={{ color: 'var(--red)' }}
        onClick={() => {
          if (confirm('¿Borrar TODO el progreso? Esta acción no se puede deshacer.')) {
            setState(defaultState())
            setMsg('Progreso borrado')
          }
        }}
      >
        🗑️ Borrar todo el progreso
      </button>
      <p style={{ color: 'var(--muted)', fontSize: '0.75rem', marginTop: 20, textAlign: 'center' }}>
        Torii v1.0 · curso generado con Claude Fable · repaso espaciado FSRS
      </p>
    </div>
  )
}
