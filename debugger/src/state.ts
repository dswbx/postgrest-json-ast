export type Filter = { column: string; operator: string; value: string }

// PostgREST operator → supabase-js method name + description
export const FILTER_OPERATORS = [
  { op: 'eq', label: '.eq()', desc: 'equal to' },
  { op: 'neq', label: '.neq()', desc: 'not equal to' },
  { op: 'gt', label: '.gt()', desc: 'greater than' },
  { op: 'gte', label: '.gte()', desc: 'greater than or equal' },
  { op: 'lt', label: '.lt()', desc: 'less than' },
  { op: 'lte', label: '.lte()', desc: 'less than or equal' },
  { op: 'like', label: '.like()', desc: 'LIKE (use % for wildcard)' },
  { op: 'ilike', label: '.ilike()', desc: 'ILIKE (case-insensitive)' },
  { op: 'is', label: '.is()', desc: 'IS (null, true, false)' },
  { op: 'in', label: '.in()', desc: 'IN list — (val1,val2,...)' },
  { op: 'cs', label: '.contains()', desc: 'array/range contains' },
  { op: 'cd', label: '.containedBy()', desc: 'contained by' },
  { op: 'ov', label: '.overlaps()', desc: 'array/range overlaps' },
  { op: 'sl', label: '.rangeLt()', desc: 'range strictly left' },
  { op: 'sr', label: '.rangeGt()', desc: 'range strictly right' },
  { op: 'nxl', label: '.rangeGte()', desc: 'range not left of' },
  { op: 'nxr', label: '.rangeLte()', desc: 'range not right of' },
  { op: 'adj', label: '.rangeAdjacent()', desc: 'range adjacent' },
  { op: 'match', label: '.match()', desc: 'POSIX regex' },
  { op: 'imatch', label: '.imatch()', desc: 'POSIX regex (case-insensitive)' },
  { op: 'fts', label: '.textSearch()', desc: 'full-text search' },
  { op: 'plfts', label: '.textSearch({type:"plain"})', desc: 'plain text search' },
  { op: 'phfts', label: '.textSearch({type:"phrase"})', desc: 'phrase text search' },
  { op: 'wfts', label: '.textSearch({type:"websearch"})', desc: 'websearch text search' },
  { op: 'not.eq', label: '.not.eq()', desc: 'NOT equal' },
  { op: 'not.is', label: '.not.is()', desc: 'IS NOT' },
  { op: 'not.in', label: '.not.in()', desc: 'NOT IN' },
  { op: 'not.cs', label: '.not.contains()', desc: 'NOT contains' },
  { op: 'isdistinct', label: '.isDistinct()', desc: 'IS DISTINCT FROM' },
  { op: 'or', label: '.or()', desc: 'logical OR group — value is (expr1,expr2)' },
  { op: 'and', label: '.and()', desc: 'logical AND group — value is (expr1,expr2)' },
] as const

export type OrderEntry = {
  column: string
  direction: 'asc' | 'desc'
  nulls: '' | 'nullsfirst' | 'nullslast'
}

export type FormState = {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'HEAD'
  resourceType: 'table' | 'rpc'
  resourceName: string
  schema: string
  select: string
  filters: Filter[]
  orders: OrderEntry[]
  limit: string
  offset: string
  preferCount: '' | 'exact' | 'planned' | 'estimated'
  preferReturn: '' | 'minimal' | 'headers-only' | 'representation'
  preferMissing: '' | 'default' | 'null'
  preferHandling: '' | 'strict' | 'lenient'
  preferTx: '' | 'commit' | 'rollback'
  preferResolution: '' | 'merge-duplicates' | 'ignore-duplicates'
  preferMaxAffected: string
  preferTimezone: string
  accept: string
  contentType: string
  body: string
  onConflict: string
  columns: string
}

export const initialState: FormState = {
  method: 'GET',
  resourceType: 'table',
  resourceName: 'todos',
  schema: '',
  select: '',
  filters: [],
  orders: [],
  limit: '',
  offset: '',
  preferCount: '',
  preferReturn: '',
  preferMissing: '',
  preferHandling: '',
  preferTx: '',
  preferResolution: '',
  preferMaxAffected: '',
  preferTimezone: '',
  accept: '',
  contentType: '',
  body: '',
  onConflict: '',
  columns: '',
}

export type Preset = { label: string; state: Partial<FormState> }

export const PRESETS: Preset[] = [
  {
    label: 'Simple query',
    state: {
      method: 'GET',
      resourceType: 'table',
      resourceName: 'todos',
      select: 'id,title,done',
      filters: [{ column: 'status', operator: 'eq', value: 'active' }],
    },
  },
  {
    label: 'Query with embeds',
    state: {
      method: 'GET',
      resourceType: 'table',
      resourceName: 'products',
      select: 'id,name,categories!inner(id,name),reviews(id,body,rating)',
      filters: [
        { column: 'price', operator: 'gte', value: '10' },
        { column: 'reviews.order', operator: '', value: 'created_at.desc' },
      ],
      orders: [{ column: 'name', direction: 'asc', nulls: '' }],
    },
  },
  {
    label: 'Insert',
    state: {
      method: 'POST',
      resourceType: 'table',
      resourceName: 'todos',
      preferReturn: 'representation',
      contentType: 'application/json',
      body: JSON.stringify({ title: 'Buy milk', done: false }, null, 2),
    },
  },
  {
    label: 'Upsert',
    state: {
      method: 'POST',
      resourceType: 'table',
      resourceName: 'todos',
      preferResolution: 'merge-duplicates',
      preferReturn: 'representation',
      onConflict: 'id',
      contentType: 'application/json',
      body: JSON.stringify({ id: 1, title: 'Buy milk', done: true }, null, 2),
    },
  },
  {
    label: 'RPC GET',
    state: {
      method: 'GET',
      resourceType: 'rpc',
      resourceName: 'get_status',
      filters: [{ column: 'user_id', operator: 'eq', value: '1' }],
    },
  },
  {
    label: 'RPC POST',
    state: {
      method: 'POST',
      resourceType: 'rpc',
      resourceName: 'compute_total',
      contentType: 'application/json',
      body: JSON.stringify({ order_id: 42 }, null, 2),
    },
  },
  {
    label: 'Update',
    state: {
      method: 'PATCH',
      resourceType: 'table',
      resourceName: 'todos',
      filters: [{ column: 'id', operator: 'eq', value: '1' }],
      preferReturn: 'representation',
      contentType: 'application/json',
      body: JSON.stringify({ done: true }, null, 2),
    },
  },
  {
    label: 'Delete',
    state: {
      method: 'DELETE',
      resourceType: 'table',
      resourceName: 'todos',
      select: 'id,title',
      filters: [{ column: 'id', operator: 'eq', value: '1' }],
    },
  },
]

function serializeOrders(orders: OrderEntry[]): string {
  return orders
    .filter((o) => o.column)
    .map((o) => {
      let s = o.column + '.' + o.direction
      if (o.nulls) s += '.' + o.nulls
      return s
    })
    .join(',')
}

export function buildRequest(state: FormState): Request {
  const path =
    state.resourceType === 'rpc'
      ? `/rest/v1/rpc/${state.resourceName}`
      : `/rest/v1/${state.resourceName}`

  const order = serializeOrders(state.orders)
  const params = new URLSearchParams()
  if (state.select) params.set('select', state.select)
  if (order) params.set('order', order)
  if (state.limit) params.set('limit', state.limit)
  if (state.offset) params.set('offset', state.offset)
  if (state.onConflict) params.set('on_conflict', state.onConflict)
  if (state.columns) params.set('columns', state.columns)
  for (const f of state.filters) {
    if (!f.column) continue
    // or/and logical groups and raw entries (no operator) pass value through directly
    const val = f.operator ? `${f.operator}.${f.value}` : f.value
    params.append(f.column, val)
  }

  const qs = params.toString()
  const url = `http://localhost:3000${path}${qs ? '?' + qs : ''}`

  const headers: Record<string, string> = {}

  if (state.schema) {
    if (state.method === 'GET' || state.method === 'HEAD') {
      headers['Accept-Profile'] = state.schema
    } else {
      headers['Content-Profile'] = state.schema
    }
  }

  const preferTokens: string[] = []
  if (state.preferCount) preferTokens.push(`count=${state.preferCount}`)
  if (state.preferReturn) preferTokens.push(`return=${state.preferReturn}`)
  if (state.preferMissing) preferTokens.push(`missing=${state.preferMissing}`)
  if (state.preferHandling) preferTokens.push(`handling=${state.preferHandling}`)
  if (state.preferTx) preferTokens.push(`tx=${state.preferTx}`)
  if (state.preferResolution) preferTokens.push(`resolution=${state.preferResolution}`)
  if (state.preferMaxAffected) preferTokens.push(`max-affected=${state.preferMaxAffected}`)
  if (state.preferTimezone) preferTokens.push(`timezone=${state.preferTimezone}`)
  if (preferTokens.length) headers['Prefer'] = preferTokens.join(', ')

  if (state.accept) headers['Accept'] = state.accept

  const hasBody = state.method !== 'GET' && state.method !== 'HEAD'
  if (hasBody && state.contentType) headers['Content-Type'] = state.contentType

  const init: RequestInit = { method: state.method, headers }
  if (hasBody && state.body) init.body = state.body

  return new Request(url, init)
}

export function buildRequestPreview(state: FormState, encode = false): string {
  const path =
    state.resourceType === 'rpc'
      ? `/rest/v1/rpc/${state.resourceName}`
      : `/rest/v1/${state.resourceName}`

  const order = serializeOrders(state.orders)

  let qs: string
  if (encode) {
    const params = new URLSearchParams()
    if (state.select) params.set('select', state.select)
    if (order) params.set('order', order)
    if (state.limit) params.set('limit', state.limit)
    if (state.offset) params.set('offset', state.offset)
    if (state.onConflict) params.set('on_conflict', state.onConflict)
    if (state.columns) params.set('columns', state.columns)
    for (const f of state.filters) {
      if (!f.column) continue
      const val = f.operator ? `${f.operator}.${f.value}` : f.value
      params.append(f.column, val)
    }
    qs = params.toString()
  } else {
    const parts: string[] = []
    if (state.select) parts.push(`select=${state.select}`)
    if (order) parts.push(`order=${order}`)
    if (state.limit) parts.push(`limit=${state.limit}`)
    if (state.offset) parts.push(`offset=${state.offset}`)
    if (state.onConflict) parts.push(`on_conflict=${state.onConflict}`)
    if (state.columns) parts.push(`columns=${state.columns}`)
    for (const f of state.filters) {
      if (!f.column) continue
      const val = f.operator ? `${f.operator}.${f.value}` : f.value
      parts.push(`${f.column}=${val}`)
    }
    qs = parts.join('&')
  }

  const requestLine = `${state.method} ${path}${qs ? '?' + qs : ''} HTTP/1.1`

  const headerLines: string[] = []
  headerLines.push(`Host: localhost:3000`)

  if (state.schema) {
    if (state.method === 'GET' || state.method === 'HEAD') {
      headerLines.push(`Accept-Profile: ${state.schema}`)
    } else {
      headerLines.push(`Content-Profile: ${state.schema}`)
    }
  }

  const preferTokens: string[] = []
  if (state.preferCount) preferTokens.push(`count=${state.preferCount}`)
  if (state.preferReturn) preferTokens.push(`return=${state.preferReturn}`)
  if (state.preferMissing) preferTokens.push(`missing=${state.preferMissing}`)
  if (state.preferHandling) preferTokens.push(`handling=${state.preferHandling}`)
  if (state.preferTx) preferTokens.push(`tx=${state.preferTx}`)
  if (state.preferResolution) preferTokens.push(`resolution=${state.preferResolution}`)
  if (state.preferMaxAffected) preferTokens.push(`max-affected=${state.preferMaxAffected}`)
  if (state.preferTimezone) preferTokens.push(`timezone=${state.preferTimezone}`)
  if (preferTokens.length) headerLines.push(`Prefer: ${preferTokens.join(', ')}`)

  if (state.accept) headerLines.push(`Accept: ${state.accept}`)

  const hasBody = state.method !== 'GET' && state.method !== 'HEAD'
  if (hasBody && state.contentType) headerLines.push(`Content-Type: ${state.contentType}`)

  let result = requestLine + '\n' + headerLines.join('\n')
  if (hasBody && state.body) result += '\n\n' + state.body

  return result
}
