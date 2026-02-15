import { describe, test, expect } from 'bun:test'
import { resolveFilters } from '../../src/resolvers/filters.js'
import type { QueryParamsResult } from '../../src/types.js'

function params(entries: [string, string][]): QueryParamsResult {
  const m = new Map<string, string[]>()
  for (const [k, v] of entries) {
    const existing = m.get(k) ?? []
    existing.push(v)
    m.set(k, existing)
  }
  return m
}

const noEmbeds = new Set<string>()

describe('resolveFilters', () => {
  // ── Basic operators ──

  test('eq', () => {
    const r = resolveFilters(params([['status', 'eq.active']]), noEmbeds)
    expect(r.where).toEqual({ status: { $eq: 'active' } })
  })

  test('gt with number', () => {
    const r = resolveFilters(params([['price', 'gt.100']]), noEmbeds)
    expect(r.where).toEqual({ price: { $gt: 100 } })
  })

  test('is with boolean', () => {
    const r = resolveFilters(params([['active', 'is.true']]), noEmbeds)
    expect(r.where).toEqual({ active: { $is: true } })
  })

  test('is with null', () => {
    const r = resolveFilters(params([['deleted_at', 'is.null']]), noEmbeds)
    expect(r.where).toEqual({ deleted_at: { $is: null } })
  })

  test('in list', () => {
    const r = resolveFilters(params([['id', 'in.(1,2,3)']]), noEmbeds)
    expect(r.where).toEqual({ id: { $in: [1, 2, 3] } })
  })

  test('in list with quoted strings', () => {
    const r = resolveFilters(params([['name', 'in.(hello,"world,2",foo)']]), noEmbeds)
    expect(r.where).toEqual({ name: { $in: ['hello', 'world,2', 'foo'] } })
  })

  test('like', () => {
    const r = resolveFilters(params([['name', 'like.*phone*']]), noEmbeds)
    expect(r.where).toEqual({ name: { $like: '*phone*' } })
  })

  test('ilike', () => {
    const r = resolveFilters(params([['name', 'ilike.*phone*']]), noEmbeds)
    expect(r.where).toEqual({ name: { $ilike: '*phone*' } })
  })

  // ── Negation ──

  test('not.eq', () => {
    const r = resolveFilters(params([['status', 'not.eq.active']]), noEmbeds)
    expect(r.where).toEqual({ status: { $not: { $eq: 'active' } } })
  })

  test('not.in → $notIn', () => {
    const r = resolveFilters(params([['id', 'not.in.(1,2,3)']]), noEmbeds)
    expect(r.where).toEqual({ id: { $notIn: [1, 2, 3] } })
  })

  test('not.like', () => {
    const r = resolveFilters(params([['name', 'not.like.*test*']]), noEmbeds)
    expect(r.where).toEqual({ name: { $not: { $like: '*test*' } } })
  })

  // ── Multiple values (AND) ──

  test('multiple values same key', () => {
    const r = resolveFilters(params([['price', 'gte.100'], ['price', 'lte.500']]), noEmbeds)
    expect(r.where).toEqual({ price: { $gte: 100, $lte: 500 } })
  })

  // ── Embedded filters ──

  test('embedded filter', () => {
    const embeds = new Set(['categories'])
    const r = resolveFilters(params([['categories.active', 'eq.true']]), embeds)
    expect(r.where).toEqual({})
    expect(r.embeddedWheres).toEqual({
      categories: { active: { $eq: true } },
    })
  })

  // ── Logical groups ──

  test('or group', () => {
    const r = resolveFilters(
      params([['or', '(status.eq.active,featured.is.true)']]),
      noEmbeds,
    )
    expect(r.where).toEqual({
      $or: [
        { status: { $eq: 'active' } },
        { featured: { $is: true } },
      ],
    })
  })

  test('and group', () => {
    const r = resolveFilters(
      params([['and', '(price.gt.100,price.lt.500)']]),
      noEmbeds,
    )
    expect(r.where).toEqual({
      $and: [
        { price: { $gt: 100 } },
        { price: { $lt: 500 } },
      ],
    })
  })

  test('nested or with and', () => {
    const r = resolveFilters(
      params([['or', '(status.eq.active,and(price.gt.100,price.lt.500))']]),
      noEmbeds,
    )
    expect(r.where).toEqual({
      $or: [
        { status: { $eq: 'active' } },
        { $and: [{ price: { $gt: 100 } }, { price: { $lt: 500 } }] },
      ],
    })
  })

  test('not.or', () => {
    const r = resolveFilters(
      params([['not.or', '(status.eq.draft,status.eq.deleted)']]),
      noEmbeds,
    )
    expect(r.where).toEqual({
      $not: { $or: [{ status: { $eq: 'draft' } }, { status: { $eq: 'deleted' } }] },
    })
  })

  // ── FTS ──

  test('fts basic', () => {
    const r = resolveFilters(params([['description', 'fts.phone']]), noEmbeds)
    expect(r.where).toEqual({
      description: { $textSearch: { query: 'phone' } },
    })
  })

  test('plfts with config', () => {
    const r = resolveFilters(params([['description', 'plfts(english).phone']]), noEmbeds)
    expect(r.where).toEqual({
      description: { $textSearch: { query: 'phone', type: 'plain', config: 'english' } },
    })
  })

  test('wfts', () => {
    const r = resolveFilters(params([['description', 'wfts.phone & flagship']]), noEmbeds)
    expect(r.where).toEqual({
      description: { $textSearch: { query: 'phone & flagship', type: 'websearch' } },
    })
  })

  // ── Reserved keys skipped ──

  test('skips reserved keys', () => {
    const r = resolveFilters(
      params([['select', 'id'], ['order', 'id.asc'], ['status', 'eq.active']]),
      noEmbeds,
    )
    expect(r.where).toEqual({ status: { $eq: 'active' } })
  })

  // ── Array/Range operators ──

  test('contains with array literal', () => {
    const r = resolveFilters(params([['tags', 'cs.{featured,new}']]), noEmbeds)
    expect(r.where).toEqual({ tags: { $contains: ['featured', 'new'] } })
  })

  test('overlaps', () => {
    const r = resolveFilters(params([['tags', 'ov.{a,b}']]), noEmbeds)
    expect(r.where).toEqual({ tags: { $overlaps: ['a', 'b'] } })
  })

  test('range operator', () => {
    const r = resolveFilters(params([['range', 'sr.[1,5]']]), noEmbeds)
    expect(r.where).toEqual({ range: { $rangeGt: '[1,5]' } })
  })

  // ── Quantified operators ──

  test('eq(any)', () => {
    const r = resolveFilters(params([['status', 'eq(any).{active,pending}']]), noEmbeds)
    expect(r.where).toEqual({ status: { $eqAny: ['active', 'pending'] } })
  })

  test('like(all)', () => {
    const r = resolveFilters(params([['name', 'like(all).{%phone%,%pro%}']]), noEmbeds)
    expect(r.where).toEqual({ name: { $likeAll: ['%phone%', '%pro%'] } })
  })

  // ── Additional basic operators ──

  test('neq', () => {
    const r = resolveFilters(params([['status', 'neq.draft']]), noEmbeds)
    expect(r.where).toEqual({ status: { $neq: 'draft' } })
  })

  test('gte standalone', () => {
    const r = resolveFilters(params([['age', 'gte.18']]), noEmbeds)
    expect(r.where).toEqual({ age: { $gte: 18 } })
  })

  test('lte standalone', () => {
    const r = resolveFilters(params([['age', 'lte.65']]), noEmbeds)
    expect(r.where).toEqual({ age: { $lte: 65 } })
  })

  test('isdistinct', () => {
    const r = resolveFilters(params([['status', 'isdistinct.null']]), noEmbeds)
    expect(r.where).toEqual({ status: { $isDistinct: null } })
  })

  test('match (regex)', () => {
    const r = resolveFilters(params([['name', 'match.^foo']]), noEmbeds)
    expect(r.where).toEqual({ name: { $regex: '^foo' } })
  })

  test('imatch (iregex)', () => {
    const r = resolveFilters(params([['name', 'imatch.^foo']]), noEmbeds)
    expect(r.where).toEqual({ name: { $iregex: '^foo' } })
  })

  test('cd (containedBy) with array', () => {
    const r = resolveFilters(params([['tags', 'cd.{a,b,c}']]), noEmbeds)
    expect(r.where).toEqual({ tags: { $containedBy: ['a', 'b', 'c'] } })
  })

  // ── Additional FTS ──

  test('phfts (phrase text search)', () => {
    const r = resolveFilters(params([['description', 'phfts.the cat']]), noEmbeds)
    expect(r.where).toEqual({
      description: { $textSearch: { query: 'the cat', type: 'phrase' } },
    })
  })

  test('fts with language config', () => {
    const r = resolveFilters(params([['description', 'fts(english).phone']]), noEmbeds)
    expect(r.where).toEqual({
      description: { $textSearch: { query: 'phone', config: 'english' } },
    })
  })

  // ── Additional range operators ──

  test('sl (rangeLt)', () => {
    const r = resolveFilters(params([['range', 'sl.[1,5]']]), noEmbeds)
    expect(r.where).toEqual({ range: { $rangeLt: '[1,5]' } })
  })

  test('nxl (rangeGte)', () => {
    const r = resolveFilters(params([['range', 'nxl.[1,5]']]), noEmbeds)
    expect(r.where).toEqual({ range: { $rangeGte: '[1,5]' } })
  })

  test('nxr (rangeLte)', () => {
    const r = resolveFilters(params([['range', 'nxr.[1,5]']]), noEmbeds)
    expect(r.where).toEqual({ range: { $rangeLte: '[1,5]' } })
  })

  test('adj (rangeAdjacent)', () => {
    const r = resolveFilters(params([['range', 'adj.[1,5]']]), noEmbeds)
    expect(r.where).toEqual({ range: { $rangeAdjacent: '[1,5]' } })
  })

  // ── Additional quantified operators ──

  test('neq(any)', () => {
    const r = resolveFilters(params([['status', 'neq(any).{draft,deleted}']]), noEmbeds)
    expect(r.where).toEqual({ status: { $neqAny: ['draft', 'deleted'] } })
  })

  test('ilike(any)', () => {
    const r = resolveFilters(params([['name', 'ilike(any).{%phone%,%tablet%}']]), noEmbeds)
    expect(r.where).toEqual({ name: { $ilikeAny: ['%phone%', '%tablet%'] } })
  })

  test('ilike(all)', () => {
    const r = resolveFilters(params([['name', 'ilike(all).{%pro%,%max%}']]), noEmbeds)
    expect(r.where).toEqual({ name: { $ilikeAll: ['%pro%', '%max%'] } })
  })

  test('like(any)', () => {
    const r = resolveFilters(params([['name', 'like(any).{%phone%,%pro%}']]), noEmbeds)
    expect(r.where).toEqual({ name: { $likeAny: ['%phone%', '%pro%'] } })
  })

  test('gte(all)', () => {
    const r = resolveFilters(params([['score', 'gte(all).{80,90}']]), noEmbeds)
    expect(r.where).toEqual({ score: { $gteAll: [80, 90] } })
  })

  // ── Additional negation combos ──

  test('not.is', () => {
    const r = resolveFilters(params([['active', 'not.is.null']]), noEmbeds)
    expect(r.where).toEqual({ active: { $not: { $is: null } } })
  })

  test('not.cs', () => {
    const r = resolveFilters(params([['tags', 'not.cs.{featured}']]), noEmbeds)
    expect(r.where).toEqual({ tags: { $not: { $contains: ['featured'] } } })
  })

  test('not.isdistinct', () => {
    const r = resolveFilters(params([['status', 'not.isdistinct.null']]), noEmbeds)
    expect(r.where).toEqual({ status: { $not: { $isDistinct: null } } })
  })

  // ── contains with JSON object ──

  test('contains with JSON object', () => {
    const r = resolveFilters(params([['metadata', 'cs.{"theme":"dark"}']]), noEmbeds)
    expect(r.where).toEqual({ metadata: { $contains: { theme: 'dark' } } })
  })

  // ── containedBy with range string ──

  test('containedBy with range string', () => {
    const r = resolveFilters(params([['range', 'cd.[1,10]']]), noEmbeds)
    expect(r.where).toEqual({ range: { $containedBy: '[1,10]' } })
  })

  // ── in with empty list ──

  test('in with empty list', () => {
    const r = resolveFilters(params([['id', 'in.()']]), noEmbeds)
    expect(r.where).toEqual({ id: { $in: [] } })
  })

  // ── match() shorthand: multiple eq filters ──

  test('match shorthand — multiple eq filters', () => {
    const r = resolveFilters(
      params([['status', 'eq.active'], ['category', 'eq.electronics']]),
      noEmbeds,
    )
    expect(r.where).toEqual({
      status: { $eq: 'active' },
      category: { $eq: 'electronics' },
    })
  })

  // ── Embedded and group ──

  test('embedded and group', () => {
    const embeds = new Set(['categories'])
    const r = resolveFilters(
      params([['categories.and', '(active.eq.true,featured.is.true)']]),
      embeds,
    )
    expect(r.embeddedWheres).toEqual({
      categories: {
        $and: [
          { active: { $eq: true } },
          { featured: { $is: true } },
        ],
      },
    })
  })

  // ── Nested not.and inside or ──

  test('not.and inside or', () => {
    const r = resolveFilters(
      params([['or', '(status.eq.active,not.and(price.gt.1000,stock.lt.5))']]),
      noEmbeds,
    )
    expect(r.where).toEqual({
      $or: [
        { status: { $eq: 'active' } },
        { $not: { $and: [{ price: { $gt: 1000 } }, { stock: { $lt: 5 } }] } },
      ],
    })
  })

  // ── Embedded or ──

  test('embedded or', () => {
    const embeds = new Set(['categories'])
    const r = resolveFilters(
      params([['categories.or', '(active.eq.true,featured.is.true)']]),
      embeds,
    )
    expect(r.embeddedWheres).toEqual({
      categories: {
        $or: [
          { active: { $eq: true } },
          { featured: { $is: true } },
        ],
      },
    })
  })
})
