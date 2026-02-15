import { useState, useRef, useEffect } from 'react'

type Position = 'top-right' | 'bottom-right'
type Props = { text: string; position?: Position }

const popoverCls: Record<Position, string> = {
  'top-right': 'bottom-full left-0 mb-1.5',
  'bottom-right': 'top-full left-0 mt-1.5',
}

const arrowCls: Record<Position, string> = {
  'top-right': 'top-full left-3 -mt-px border-4 border-transparent border-t-gray-700',
  'bottom-right': 'bottom-full left-3 -mb-px border-4 border-transparent border-b-gray-700',
}

export function InfoTip({ text, position = 'top-right' }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <span className="relative inline-block" ref={ref}>
      <button
        type="button"
        className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-gray-700 text-[9px] text-gray-400 hover:bg-gray-600 hover:text-gray-200 leading-none cursor-help"
        onClick={() => setOpen((v) => !v)}
      >
        ?
      </button>
      {open && (
        <div className={`absolute z-50 ${popoverCls[position]} w-56 px-2.5 py-2 rounded bg-gray-800 border border-gray-700 text-[11px] text-gray-300 leading-snug shadow-lg whitespace-normal`}>
          {text}
          <div className={`absolute ${arrowCls[position]}`} />
        </div>
      )}
    </span>
  )
}
