import { useState, useEffect, useRef } from 'react'
import { translate } from 'postgrest-ast'
import type { FormState } from './state'
import { initialState, buildRequest, PRESETS, parseRequestString } from './state'
import { RequestForm } from './components/RequestForm'
import { RequestPreview } from './components/RequestPreview'
import { AstOutput } from './components/AstOutput'

export default function App() {
  const [state, setState] = useState<FormState>(initialState)
  const [ast, setAst] = useState<unknown>(null)
  const [error, setError] = useState<string | null>(null)
  const [urlInput, setUrlInput] = useState('')
  const [activePreset, setActivePreset] = useState('')
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null)

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      try {
        const req = buildRequest(state)
        const result = await translate(req)
        setAst(result)
        setError(null)
      } catch (e: unknown) {
        setAst(null)
        setError(e instanceof Error ? e.message : String(e))
      }
    }, 150)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [state])

  const loadPreset = (idx: number) => {
    const preset = PRESETS[idx]
    if (preset) {
      setState({ ...initialState, ...preset.state })
      setUrlInput('')
      setActivePreset(String(idx))
    }
  }

  const inspect = () => {
    const parsed = parseRequestString(urlInput)
    if (Object.keys(parsed).length) {
      setState({ ...initialState, ...parsed })
      setActivePreset('')
    }
  }

  return (
    <div className="h-screen flex flex-col bg-gray-950 text-gray-200">
      <header className="flex items-center gap-2 px-4 py-2 border-b border-gray-800 shrink-0">
        <a href="https://github.com/dswbx/postgrest-json-ast" target="_blank" rel="noopener noreferrer" className="shrink-0 text-gray-500 hover:text-gray-300 transition-colors">
          <svg height="18" width="18" viewBox="0 0 16 16" fill="currentColor" aria-label="GitHub"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
        </a>
        <h1 className="text-sm font-semibold tracking-wide text-gray-400 shrink-0">PostgREST AST Debugger</h1>
        <select
          className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-gray-300 shrink-0 outline-none focus:ring-1 focus:ring-blue-500/50"
          value={activePreset}
          onChange={(e) => loadPreset(Number(e.target.value))}
        >
          <option value="" disabled>
            Presets
          </option>
          {PRESETS.map((p, i) => (
            <option key={i} value={i}>
              {p.label}
            </option>
          ))}
        </select>
        <input
          type="text"
          className="flex-1 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-gray-300 font-mono placeholder-gray-600 min-w-0 outline-none focus:ring-1 focus:ring-blue-500/50"
          placeholder="GET /rest/v1/todos?select=id,title&status=eq.active  or  https://…"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && inspect()}
        />
        <button
          className="shrink-0 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium px-3 py-1 rounded"
          onClick={inspect}
          disabled={!urlInput.trim()}
        >
          Inspect
        </button>
      </header>
      <div className="flex flex-1 min-h-0">
        <div className="w-1/2 overflow-y-auto border-r border-gray-800 p-4">
          <RequestForm state={state} setState={(s) => { setActivePreset(''); setState(s) }} />
        </div>
        <div className="w-1/2 flex flex-col min-h-0 p-4 gap-3">
          <RequestPreview state={state} />
          <AstOutput ast={ast} error={error} />
        </div>
      </div>
    </div>
  )
}
