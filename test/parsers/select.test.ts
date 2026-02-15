import { describe, test, expect } from 'bun:test'
import { parseSelect } from '../../src/parsers/select.js'

function sel(selectParam: string) {
  return parseSelect(new Request(`http://localhost/rest/v1/t?select=${encodeURIComponent(selectParam)}`))
}

function selNone() {
  return parseSelect(new Request('http://localhost/rest/v1/t'))
}

describe('parseSelect', () => {
  // ── Basic ──

  test('no select param', () => {
    const r = selNone()
    expect(r.select).toEqual([])
    expect(r.embeddedAliases.size).toBe(0)
  })

  test('empty select', () => {
    const r = sel('')
    expect(r.select).toEqual([])
  })

  test('star', () => {
    const r = sel('*')
    expect(r.select).toEqual(['*'])
  })

  test('single column', () => {
    const r = sel('id')
    expect(r.select).toEqual(['id'])
  })

  test('multiple columns', () => {
    const r = sel('id,name,price')
    expect(r.select).toEqual(['id', 'name', 'price'])
  })

  // ── Aliases ──

  test('renamed column', () => {
    const r = sel('desc:description')
    expect(r.select).toEqual([{ desc: { column: 'description' } }])
  })

  // ── Type casts ──

  test('column with cast', () => {
    const r = sel('salary::text')
    expect(r.select).toEqual([{ salary: { cast: 'text' } }])
  })

  // ── Aggregates ──

  test('column with aggregate', () => {
    const r = sel('price.avg()')
    expect(r.select).toEqual([{ price: { column: 'price', aggregate: 'avg' } }])
  })

  test('column with aggregate and cast', () => {
    const r = sel('price.avg()::int')
    expect(r.select).toEqual([{ price: { column: 'price', aggregate: 'avg', cast: 'int' } }])
  })

  test('column with preCast and aggregate', () => {
    const r = sel('amount::numeric.sum()')
    expect(r.select).toEqual([{ amount: { preCast: 'numeric', aggregate: 'sum', column: 'amount' } }])
  })

  test('standalone count()', () => {
    const r = sel('count()')
    expect(r.select).toEqual([{ count: { aggregate: 'count' } }])
  })

  test('count with alias', () => {
    const r = sel('row_count:count()')
    expect(r.select).toEqual([{ row_count: { aggregate: 'count' } }])
  })

  test('count with cast', () => {
    const r = sel('count()::int')
    expect(r.select).toEqual([{ count: { aggregate: 'count', cast: 'int' } }])
  })

  // ── JSON paths ──

  test('json arrow path', () => {
    const r = sel('metadata->theme->>color')
    expect(r.select).toEqual([{
      color: { column: 'metadata', path: '$.theme.color' },
    }])
  })

  test('single json arrow', () => {
    const r = sel('data->>name')
    expect(r.select).toEqual([{
      name: { column: 'data', path: '$.name' },
    }])
  })

  // ── Embeds ──

  test('simple embed', () => {
    const r = sel('id,categories(id,name)')
    expect(r.select).toEqual([
      'id',
      { categories: { select: ['id', 'name'] } },
    ])
    expect(r.join).toEqual({ categories: {} })
    expect(r.embeddedAliases.has('categories')).toBe(true)
  })

  test('embed with inner join', () => {
    const r = sel('categories!inner(id,name)')
    expect(r.select).toEqual([{ categories: { select: ['id', 'name'] } }])
    expect(r.join).toEqual({ categories: { type: 'inner' } })
  })

  test('embed with left join', () => {
    const r = sel('categories!left(id,name)')
    expect(r.select).toEqual([{ categories: { select: ['id', 'name'] } }])
    expect(r.join).toEqual({ categories: {} })
  })

  test('embed with hint', () => {
    const r = sel('categories!category_id(id,name)')
    expect(r.select).toEqual([{ categories: { select: ['id', 'name'] } }])
    expect(r.join).toEqual({ categories: { hint: 'category_id' } })
  })

  test('embed with hint and inner join', () => {
    const r = sel('categories!category_id!inner(id,name)')
    expect(r.select).toEqual([{ categories: { select: ['id', 'name'] } }])
    expect(r.join).toEqual({ categories: { hint: 'category_id', type: 'inner' } })
  })

  test('aliased embed', () => {
    const r = sel('cats:categories(id,name)')
    expect(r.select).toEqual([{ cats: { select: ['id', 'name'] } }])
    expect(r.join).toEqual({ cats: { from: 'categories' } })
    expect(r.embeddedAliases.has('cats')).toBe(true)
  })

  test('aliased embed with inner join', () => {
    const r = sel('cats:categories!inner(id,name)')
    expect(r.select).toEqual([{ cats: { select: ['id', 'name'] } }])
    expect(r.join).toEqual({ cats: { from: 'categories', type: 'inner' } })
  })

  test('empty embed', () => {
    const r = sel('categories()')
    expect(r.select).toEqual([{ categories: { select: ['*'] } }])
    expect(r.join).toEqual({ categories: {} })
  })

  test('nested embeds', () => {
    const r = sel('actors(name,roles(character,films(title)))')
    expect(r.select).toEqual([{
      actors: {
        select: [
          'name',
          {
            roles: {
              select: [
                'character',
                { films: { select: ['title'] } },
              ],
              join: { films: {} },
            },
          },
        ],
        join: { roles: {} },
      },
    }])
    expect(r.join).toEqual({ actors: {} })
  })

  // ── Spread ──

  test('spread embed', () => {
    const r = sel('title,...director(first_name)')
    expect(r.select).toEqual([
      'title',
      { director: { spread: true, select: ['first_name'] } },
    ])
    expect(r.join).toEqual({ director: {} })
  })

  // ── Quoted identifiers ──

  test('quoted identifier', () => {
    const r = sel('"my col"')
    expect(r.select).toEqual(['my col'])
  })

  // ── Complex combinations ──

  test('spec §4 walkthrough', () => {
    const r = sel('id,desc:description,categories!inner(id,name),price.avg()::int')
    expect(r.select).toEqual([
      'id',
      { desc: { column: 'description' } },
      { categories: { select: ['id', 'name'] } },
      { price: { column: 'price', aggregate: 'avg', cast: 'int' } },
    ])
    expect(r.join).toEqual({ categories: { type: 'inner' } })
  })

  test('star with columns and embeds', () => {
    const r = sel('*,categories(id,name)')
    expect(r.select).toEqual([
      '*',
      { categories: { select: ['id', 'name'] } },
    ])
  })

  // ── Column sum variations ──

  test('sum aggregate', () => {
    const r = sel('amount.sum()')
    expect(r.select).toEqual([{ amount: { column: 'amount', aggregate: 'sum' } }])
  })

  test('min aggregate', () => {
    const r = sel('price.min()')
    expect(r.select).toEqual([{ price: { column: 'price', aggregate: 'min' } }])
  })

  test('max aggregate', () => {
    const r = sel('price.max()')
    expect(r.select).toEqual([{ price: { column: 'price', aggregate: 'max' } }])
  })

  // ── Additional: aliased aggregate ──

  test('aliased aggregate', () => {
    const r = sel('total:price.sum()')
    expect(r.select).toEqual([{ total: { column: 'price', aggregate: 'sum' } }])
  })

  // ── Additional: preCast + aggregate + postCast ──

  test('preCast + aggregate + postCast', () => {
    const r = sel('amount::numeric.sum()::int')
    expect(r.select).toEqual([{
      amount: { preCast: 'numeric', aggregate: 'sum', column: 'amount', cast: 'int' },
    }])
  })

  // ── Additional JSON paths ──

  test('json path with alias', () => {
    const r = sel('color:metadata->theme->>color')
    expect(r.select).toEqual([{
      color: { column: 'metadata', path: '$.theme.color' },
    }])
  })

  test('multiple json depth levels', () => {
    const r = sel('data->a->b->>c')
    expect(r.select).toEqual([{
      c: { column: 'data', path: '$.a.b.c' },
    }])
  })

  // ── Additional embeds ──

  test('embed with alias + hint + inner', () => {
    const r = sel('cats:categories!fk!inner(id)')
    expect(r.select).toEqual([{ cats: { select: ['id'] } }])
    expect(r.join).toEqual({ cats: { from: 'categories', hint: 'fk', type: 'inner' } })
  })
})
