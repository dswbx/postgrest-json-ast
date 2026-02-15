# postgrest-ast

Translates raw `Request` objects into a structured AST representing PostgREST operations. Parses the URL path, query parameters, headers (Prefer, Accept, schema profiles), and body into a single typed `AST` object covering queries, inserts, updates, deletes, upserts, and RPC calls.

![Debugger UI](screen.png)

## Usage

```ts
import { translate } from 'postgrest-ast'

const req = new Request('http://localhost/rest/v1/todos?select=id,title&status=eq.active&order=id.desc&limit=10', {
  method: 'GET',
  headers: { 'Accept-Profile': 'api', Prefer: 'count=exact' },
})

const ast = await translate(req)
// {
//   type: 'query',
//   from: 'todos',
//   schema: 'api',
//   select: ['id', 'title'],
//   where: { status: { $eq: 'active' } },
//   order: [{ column: 'id', direction: 'desc' }],
//   limit: 10,
//   $meta: { count: 'exact' }
// }
```

`translate()` is async because it reads the request body stream for POST/PATCH.

## Setup

```bash
bun install
bun test
```

## Debugger

Interactive UI for building PostgREST requests and viewing the resulting AST in real time.

```bash
cd debugger
bun install
bun run dev
```

Opens at `http://localhost:5173`. Features:

- Form-driven request builder with supabase-js style filter/order dropdowns
- Live request preview (raw HTTP, with optional URL encoding toggle)
- Live AST output
- Presets for common patterns (query, insert, upsert, RPC, update, delete)
- Prefer header tooltips explaining each token

## Project structure

```
src/
  index.ts              # public API — translate(), createTranslator(), re-exports
  translate.ts          # main pipeline: parse → resolve → assemble
  types.ts              # all type definitions (AST, intermediate results, config)
  parsers/              # phase 1 — extract from Request
    route.ts            #   URL path → { from, function, isRpc }
    headers.ts          #   headers → { schema, preferTokens, accept }
    select.ts           #   ?select= → columns, embeds, joins
    body.ts             #   request body → values/args/raw
    query-params.ts     #   remaining query params → Map
  resolvers/            # phase 2 — transform parsed data into AST fields
    type.ts             #   determine operation type (query/insert/update/...)
    filters.ts          #   query params → where clauses
    transforms.ts       #   order, limit, offset (top-level + embedded)
    meta.ts             #   Prefer tokens + accept → $meta
    rpc-params.ts       #   RPC arg resolution
    upsert-params.ts    #   on_conflict, resolution
  utils/
    operators.ts        #   PostgREST operator set + parser
    values.ts           #   value coercion, array/list parsing
test/                   # mirrors src/ structure
debugger/               # Vite + React 19 + Tailwind v4 debugger UI
```
