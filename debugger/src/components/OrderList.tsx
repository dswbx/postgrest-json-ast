import type { OrderEntry } from '../state'

type Props = {
  orders: OrderEntry[]
  onChange: (orders: OrderEntry[]) => void
}

export function OrderList({ orders, onChange }: Props) {
  const update = <K extends keyof OrderEntry>(idx: number, field: K, val: OrderEntry[K]) => {
    const next = orders.map((o, i) => (i === idx ? { ...o, [field]: val } : o))
    onChange(next)
  }

  const remove = (idx: number) => onChange(orders.filter((_, i) => i !== idx))
  const add = () => onChange([...orders, { column: '', direction: 'asc', nulls: '' }])

  return (
    <div className="space-y-1.5">
      {orders.map((o, i) => (
        <div key={i} className="flex gap-1 items-center">
          <input
            className="flex-1 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-blue-500/50"
            placeholder="column"
            value={o.column}
            onChange={(e) => update(i, 'column', e.target.value)}
          />
          <select
            className="w-16 shrink-0 bg-gray-900 border border-gray-700 rounded px-1 py-1 text-xs text-gray-300 outline-none focus:ring-1 focus:ring-blue-500/50"
            value={o.direction}
            onChange={(e) => update(i, 'direction', e.target.value as OrderEntry['direction'])}
          >
            <option value="asc">asc</option>
            <option value="desc">desc</option>
          </select>
          <label className="flex items-center gap-1 text-[10px] text-gray-400 shrink-0 cursor-pointer select-none">
            <input
              type="checkbox"
              className="accent-blue-500"
              checked={o.nulls === 'nullsfirst'}
              onChange={(e) => update(i, 'nulls', e.target.checked ? 'nullsfirst' : '')}
            />
            nulls first
          </label>
          <label className="flex items-center gap-1 text-[10px] text-gray-400 shrink-0 cursor-pointer select-none">
            <input
              type="checkbox"
              className="accent-blue-500"
              checked={o.nulls === 'nullslast'}
              onChange={(e) => update(i, 'nulls', e.target.checked ? 'nullslast' : '')}
            />
            nulls last
          </label>
          <button
            className="text-gray-500 hover:text-red-400 text-xs px-1"
            onClick={() => remove(i)}
          >
            &times;
          </button>
        </div>
      ))}
      <button className="text-xs text-blue-400 hover:text-blue-300" onClick={add}>
        + Add order
      </button>
    </div>
  )
}
