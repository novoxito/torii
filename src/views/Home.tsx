import { useMemo, useState } from 'react'
import type { Content, Unit } from '../lib/types'
import type { ItemLookup } from '../lib/content'
import type { AppState } from '../lib/store'
import { computeStreak, todayStr } from '../lib/store'
import { dueIds, isLearned, knownCount, markKnown, newRemainingToday } from '../lib/srs'
import type { SessionSpec } from '../App'

const KIND_ICO: Record<Unit['kind'], string> = { kana: 'あ', kanji: '漢', vocab: '💬', grammar: '📖' }

interface Props {
  content: Content
  lookup: ItemLookup
  units: Unit[]
  state: AppState
  mutate: (fn: (s: AppState) => void) => void
  startSession: (s: SessionSpec) => void
  openPlacement: () => void
}

export default function Home({ units, state, mutate, startSession, openPlacement }: Props) {
  const [showAll, setShowAll] = useState(false)
  const due = useMemo(() => dueIds(state), [state])
  const streak = computeStreak(state.history)
  const todayCount = state.history[todayStr()] ?? 0
  const newLeft = newRemainingToday(state)

  // first unit not fully learned = current position
  const unitDone = (u: Unit) =>
    u.kind === 'grammar'
      ? state.grammarDone.includes(u.itemIds[0])
      : u.itemIds.every((id) => isLearned(state, id))

  const firstPendingIdx = units.findIndex((u) => !unitDone(u))
  const visibleUnits = showAll
    ? units
    : units.slice(Math.max(0, firstPendingIdx - 2), firstPendingIdx + 12)

  const startReview = () => {
    if (!due.length) return
    startSession({ title: 'Repaso', itemIds: due.slice(0, 60), mode: 'review' })
  }

  const startLearnUnit = (u: Unit) => {
    const pending = u.itemIds.filter((id) => !isLearned(state, id))
    const ids = pending.length ? pending : u.itemIds
    startSession({ title: u.title, itemIds: ids, mode: pending.length ? 'learn' : 'review' })
  }

  return (
    <div className="page">
      <h1>⛩️ Torii</h1>
      <div className="stats">
        <div className="stat"><div className="big">🔥 {streak}</div><div className="lbl">racha (días)</div></div>
        <div className="stat"><div className="big">⭐ {state.xp}</div><div className="lbl">XP total</div></div>
        <div className="stat"><div className="big">🧠 {knownCount(state)}</div><div className="lbl">dominadas</div></div>
        <div className="stat"><div className="big">✅ {todayCount}</div><div className="lbl">hoy</div></div>
      </div>

      <button className="btn" onClick={startReview} disabled={!due.length}>
        {due.length ? `Repasar ${due.length} tarjeta${due.length === 1 ? '' : 's'}` : 'Sin repasos pendientes 🎉'}
      </button>
      <p style={{ color: 'var(--muted)', fontSize: '0.8rem', textAlign: 'center', margin: '8px 0 4px' }}>
        {newLeft > 0 ? `Puedes aprender ${newLeft} elementos nuevos hoy` : 'Límite de nuevos alcanzado hoy: toca repasar 💪'}
      </p>

      <button className="btn secondary" style={{ marginTop: 4 }} onClick={openPlacement}>
        🎯 Prueba de nivel (saltar a tu nivel)
      </button>

      <h2>Tu camino</h2>
      {visibleUnits.map((u) => {
        const done = unitDone(u)
        const learnedN = u.kind === 'grammar' ? (done ? 1 : 0) : u.itemIds.filter((id) => isLearned(state, id)).length
        return (
          <div key={u.id} className={`unit ${done ? 'done' : ''}`} onClick={() => u.kind !== 'grammar' && startLearnUnit(u)}>
            <div className="ico">{done ? '✅' : KIND_ICO[u.kind]}</div>
            <div>
              <div className="t">{u.title}</div>
              <div className="s jp">{u.subtitle}</div>
            </div>
            <div className="right">
              <span className={`pill ${u.level.toLowerCase()}`}>{u.level}</span>
              <div style={{ marginTop: 4 }}>
                {u.kind === 'grammar' ? (done ? 'hecha' : 'en Gramática') : `${learnedN}/${u.itemIds.length}`}
              </div>
            </div>
          </div>
        )
      })}
      <button className="btn secondary" onClick={() => setShowAll(!showAll)}>
        {showAll ? 'Ver menos' : 'Ver todo el camino'}
      </button>

      {firstPendingIdx >= 0 && units[firstPendingIdx] && units[firstPendingIdx].kind !== 'grammar' && (
        <p style={{ color: 'var(--muted)', fontSize: '0.78rem', marginTop: 12 }}>
          ¿Ya dominas «{units[firstPendingIdx].title}»? {' '}
          <a
            style={{ color: 'var(--blue)' }}
            onClick={() => mutate((s) => markKnown(s, units[firstPendingIdx].itemIds))}
          >
            Marcar como sabida
          </a>{' '}
          y saltar adelante.
        </p>
      )}
    </div>
  )
}
