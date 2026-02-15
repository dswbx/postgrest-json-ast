import { describe, test, expect } from 'bun:test'
import { resolveTransforms } from '../../src/resolvers/transforms.js'
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

describe('resolveTransforms', () => {
  test('order single column', () => {
    const r = resolveTransforms(params([['order', 'price.asc']]), noEmbeds)
    expect(r.order).toEqual([{ column: 'price', direction: 'asc' }])
  })

  test('order multiple columns', () => {
    const r = resolveTransforms(
      params([['order', 'price.asc.nullsfirst,name.desc']]),
      noEmbeds,
    )
    expect(r.order).toEqual([
      { column: 'price', direction: 'asc', nullsFirst: true },
      { column: 'name', direction: 'desc' },
    ])
  })

  test('limit and offset', () => {
    const r = resolveTransforms(
      params([['limit', '50'], ['offset', '10']]),
      noEmbeds,
    )
    expect(r.limit).toBe(50)
    expect(r.offset).toBe(10)
  })

  test('embedded order', () => {
    const embeds = new Set(['reviews'])
    const r = resolveTransforms(
      params([['reviews.order', 'created_at.desc']]),
      embeds,
    )
    expect(r.embeddedTransforms).toEqual({
      reviews: { order: [{ column: 'created_at', direction: 'desc' }] },
    })
  })

  test('embedded limit', () => {
    const embeds = new Set(['categories'])
    const r = resolveTransforms(
      params([['categories.limit', '5']]),
      embeds,
    )
    expect(r.embeddedTransforms).toEqual({
      categories: { limit: 5 },
    })
  })

  test('nullslast', () => {
    const r = resolveTransforms(params([['order', 'price.desc.nullslast']]), noEmbeds)
    expect(r.order).toEqual([{ column: 'price', direction: 'desc', nullsFirst: false }])
  })

  test('order column only (default — no direction)', () => {
    const r = resolveTransforms(params([['order', 'name']]), noEmbeds)
    expect(r.order).toEqual([{ column: 'name' }])
  })

  test('embedded offset', () => {
    const embeds = new Set(['reviews'])
    const r = resolveTransforms(params([['reviews.offset', '20']]), embeds)
    expect(r.embeddedTransforms).toEqual({
      reviews: { offset: 20 },
    })
  })

  test('combined embedded order + limit + offset', () => {
    const embeds = new Set(['reviews'])
    const r = resolveTransforms(
      params([
        ['reviews.order', 'score.desc'],
        ['reviews.limit', '10'],
        ['reviews.offset', '5'],
      ]),
      embeds,
    )
    expect(r.embeddedTransforms).toEqual({
      reviews: {
        order: [{ column: 'score', direction: 'desc' }],
        limit: 10,
        offset: 5,
      },
    })
  })

  test('multiple order params (first value wins)', () => {
    const r = resolveTransforms(
      params([['order', 'price.asc'], ['order', 'name.desc']]),
      noEmbeds,
    )
    // transforms uses first value: values[0]
    expect(r.order).toEqual([{ column: 'price', direction: 'asc' }])
  })
})
