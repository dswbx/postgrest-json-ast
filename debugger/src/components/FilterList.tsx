import type { Filter } from '../state'
import { FILTER_OPERATORS } from '../state'

type Props = {
  filters: Filter[]
  onChange: (filters: Filter[]) => void
}

export function FilterList({ filters, onChange }: Props) {
  const update = (idx: number, field: keyof Filter, val: string) => {
    const next = filters.map((f, i) => (i === idx ? { ...f, [field]: val } : f))
    onChange(next)
  }

  const remove = (idx: number) => onChange(filters.filter((_, i) => i !== idx))
  const add = () => onChange([...filters, { column: '', operator: 'eq', value: '' }])

  return (
    <div className="space-y-1.5">
      {filters.map((f, i) => (
        <div key={i} className="flex gap-1 items-center">
          <input
            className="w-28 shrink-0 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-blue-500/50"
            placeholder="column"
            value={f.column}
            onChange={(e) => update(i, 'column', e.target.value)}
          />
          <select
            className="w-40 shrink-0 bg-gray-900 border border-gray-700 rounded px-1 py-1 text-xs text-gray-300 outline-none focus:ring-1 focus:ring-blue-500/50"
            value={f.operator}
            onChange={(e) => update(i, 'operator', e.target.value)}
          >
            <option value="">raw (no operator)</option>
            {FILTER_OPERATORS.map((op) => (
              <option key={op.op} value={op.op} title={op.desc}>
                {op.label}
              </option>
            ))}
          </select>
          <input
            className="flex-1 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-blue-500/50"
            placeholder={placeholderFor(f.operator)}
            value={f.value}
            onChange={(e) => update(i, 'value', e.target.value)}
          />
          <button
            className="text-gray-500 hover:text-red-400 text-xs px-1"
            onClick={() => remove(i)}
          >
            &times;
          </button>
        </div>
      ))}
      <button className="text-xs text-blue-400 hover:text-blue-300" onClick={add}>
        + Add filter
      </button>
      <p className="text-[10px] text-gray-600">
        Use <code>embed.column</code> for embedded filters/transforms (e.g.{' '}
        <code>reviews.order</code> with raw value <code>created_at.desc</code>).
      </p>
    </div>
  )
}

function placeholderFor(op: string): string {
  switch (op) {
    case 'is': return 'null | true | false'
    case 'in': return '(val1,val2,...)'
    case 'like':
    case 'ilike': return '%pattern%'
    case 'fts':
    case 'plfts':
    case 'phfts':
    case 'wfts': return 'search terms'
    case 'or':
    case 'and': return '(col.eq.val,col.gt.val)'
    case 'cs':
    case 'cd':
    case 'ov': return '{val1,val2}'
    case '': return 'raw value (op.val)'
    default: return 'value'
  }
}
