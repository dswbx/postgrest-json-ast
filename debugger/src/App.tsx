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
