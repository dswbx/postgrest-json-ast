import type { FormState } from '../state'
import { InfoTip } from './InfoTip'

type Props = {
  state: FormState
  onChange: <K extends keyof FormState>(key: K, val: FormState[K]) => void
}

type SelectField = {
  key: keyof FormState
  label: string
  options: string[]
  tip: string
}

const selectFields: SelectField[] = [
  {
    key: 'preferCount',
    label: 'count',
    options: ['exact', 'planned', 'estimated'],
    tip: 'Include row count in the response Content-Range header. "exact" scans all rows; "planned" uses query planner estimate; "estimated" uses planner for large tables, exact for small.',
  },
  {
    key: 'preferReturn',
    label: 'return',
    options: ['minimal', 'headers-only', 'representation'],
    tip: 'Controls what the server returns after mutation. "minimal" returns nothing; "headers-only" returns headers with no body; "representation" returns the full affected rows.',
  },
  {
    key: 'preferMissing',
    label: 'missing',
    options: ['default', 'null'],
    tip: 'What to do when a column is absent from the JSON body. "default" uses the column\'s DB default; "null" explicitly inserts NULL.',
  },
  {
    key: 'preferHandling',
    label: 'handling',
    options: ['strict', 'lenient'],
    tip: '"strict" returns 400 on invalid preferences or extra query params. "lenient" silently ignores them.',
  },
  {
    key: 'preferTx',
    label: 'tx',
    options: ['commit', 'rollback'],
    tip: 'Transaction behavior for bulk operations. "rollback" executes the request then rolls back — useful for dry-run validation.',
  },
  {
    key: 'preferResolution',
    label: 'resolution',
    options: ['merge-duplicates', 'ignore-duplicates'],
    tip: 'Upsert conflict resolution. "merge-duplicates" does ON CONFLICT DO UPDATE; "ignore-duplicates" does ON CONFLICT DO NOTHING.',
  },
]

export function PreferSection({ state, onChange }: Props) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
      {selectFields.map((f) => (
        <label key={f.key} className="flex items-center gap-1.5 text-xs text-gray-400">
          <span className="w-20 shrink-0 flex items-center gap-1">
            {f.label} <InfoTip text={f.tip} />
          </span>
          <select
            className="flex-1 bg-gray-900 border border-gray-700 rounded px-1.5 py-1 text-xs text-gray-300 outline-none focus:ring-1 focus:ring-blue-500/50"
            value={state[f.key] as string}
            onChange={(e) => onChange(f.key, e.target.value as never)}
          >
            <option value="">—</option>
            {f.options.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </label>
      ))}
      <label className="flex items-center gap-1.5 text-xs text-gray-400">
        <span className="w-20 shrink-0 flex items-center gap-1">
          max-affected <InfoTip text="Limit the number of rows a mutation can affect. The server returns 400 if the count exceeds this value. Useful as a safety net for bulk updates/deletes." />
        </span>
        <input
          className="flex-1 bg-gray-900 border border-gray-700 rounded px-1.5 py-1 text-xs outline-none focus:ring-1 focus:ring-blue-500/50"
          type="number"
          min="0"
          placeholder="e.g. 10"
          value={state.preferMaxAffected}
          onChange={(e) => onChange('preferMaxAffected', e.target.value)}
        />
      </label>
      <label className="flex items-center gap-1.5 text-xs text-gray-400">
        <span className="w-20 shrink-0 flex items-center gap-1">
          timezone <InfoTip text="Sets the PostgreSQL session timezone for the request. Affects how timestamptz values are serialized. Example: America/New_York, UTC." />
        </span>
        <input
          className="flex-1 bg-gray-900 border border-gray-700 rounded px-1.5 py-1 text-xs outline-none focus:ring-1 focus:ring-blue-500/50"
          placeholder="e.g. UTC"
          value={state.preferTimezone}
          onChange={(e) => onChange('preferTimezone', e.target.value)}
        />
      </label>
    </div>
  )
}
