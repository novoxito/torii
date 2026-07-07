import { useEffect, useMemo, useState, useCallback } from 'react'
import type { Content, Unit } from './lib/types'
import { loadContent, buildLookup, buildUnits } from './lib/content'
import { loadState, saveState, type AppState } from './lib/store'
import Home from './views/Home'
import Session from './views/Session'
import GrammarView from './views/GrammarView'
import StoriesView from './views/StoriesView'
import KanjiView from './views/KanjiView'
import TutorView from './views/TutorView'
import SettingsView from './views/SettingsView'

export type Tab = 'home' | 'grammar' | 'stories' | 'kanji' | 'tutor' | 'settings'

export interface SessionSpec {
  title: string
  itemIds: string[]
  mode: 'learn' | 'review'
}

export default function App() {
  const [content, setContent] = useState<Content | null>(null)
  const [state, setState] = useState<AppState>(() => loadState())
  const [tab, setTab] = useState<Tab>('home')
  const [session, setSession] = useState<SessionSpec | null>(null)

  useEffect(() => {
    loadContent().then(setContent)
  }, [])

  // persist on every state change
  useEffect(() => {
    saveState(state)
  }, [state])

  const mutate = useCallback((fn: (s: AppState) => void) => {
    setState((prev) => {
      const next = structuredClone(prev)
      fn(next)
      return next
    })
  }, [])

  const lookup = useMemo(() => (content ? buildLookup(content) : null), [content])
  const units: Unit[] = useMemo(() => (content ? buildUnits(content) : []), [content])

  if (!content || !lookup) {
    return (
      <div className="loading">
        <div className="torii-logo">⛩️</div>
        <p>Cargando el curso…</p>
      </div>
    )
  }

  return (
    <div className="app">
      {tab === 'home' && (
        <Home content={content} lookup={lookup} units={units} state={state} mutate={mutate} startSession={setSession} />
      )}
      {tab === 'grammar' && <GrammarView content={content} state={state} mutate={mutate} />}
      {tab === 'stories' && <StoriesView content={content} state={state} mutate={mutate} />}
      {tab === 'kanji' && <KanjiView content={content} state={state} />}
      {tab === 'tutor' && <TutorView state={state} mutate={mutate} />}
      {tab === 'settings' && <SettingsView state={state} mutate={mutate} setState={setState} />}

      {session && (
        <Session
          spec={session}
          lookup={lookup}
          state={state}
          mutate={mutate}
          onClose={() => setSession(null)}
        />
      )}

      <nav className="nav">
        <NavBtn cur={tab} set={setTab} id="home" ico="⛩️" label="Curso" />
        <NavBtn cur={tab} set={setTab} id="grammar" ico="📖" label="Gramática" />
        <NavBtn cur={tab} set={setTab} id="stories" ico="📚" label="Lecturas" />
        <NavBtn cur={tab} set={setTab} id="kanji" ico="漢" label="Kanji" />
        <NavBtn cur={tab} set={setTab} id="tutor" ico="🤖" label="Tutor IA" />
        <NavBtn cur={tab} set={setTab} id="settings" ico="⚙️" label="Ajustes" />
      </nav>
    </div>
  )
}

function NavBtn({ cur, set, id, ico, label }: { cur: Tab; set: (t: Tab) => void; id: Tab; ico: string; label: string }) {
  return (
    <button className={cur === id ? 'active' : ''} onClick={() => set(id)}>
      <span className="ico">{ico}</span>
      {label}
    </button>
  )
}
