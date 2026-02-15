import { describe, test, expect } from 'bun:test'
import { createTranslator } from '../src/index.js'

const { translate } = createTranslator()

describe('e2e: Request → AST', () => {
  // ── Example 1: SELECT with embeds, filters, ordering ──
  test('spec example 1: query with embeds + filters', async () => {
    const req = new Request(
      'http://localhost/rest/v1/products?select=id,name,price,categories!inner(id,name),reviews(rating,comment)&status=eq.active&price=gt.100&price=lt.500&categories.active=eq.true&order=price.asc.nullsfirst,name.desc&reviews.order=created_at.desc&limit=50&offset=0',
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Accept-Profile': 'public',
          Prefer: 'count=exact',
        },
      },
    )

    const ast = await translate(req)

    expect(ast).toEqual({
      type: 'query',
      from: 'products',
      schema: 'public',
      join: {
        categories: { type: 'inner' },
        reviews: {},
      },
      select: [
        'id',
        'name',
        'price',
        {
          categories: {
            select: ['id', 'name'],
            where: { active: { $eq: true } },
          },
        },
        {
          reviews: {
            select: ['rating', 'comment'],
            order: [{ column: 'created_at', direction: 'desc' }],
          },
        },
      ],
      where: {
        status: { $eq: 'active' },
        price: { $gt: 100, $lt: 500 },
      },
      order: [
        { column: 'price', direction: 'asc', nullsFirst: true },
        { column: 'name', direction: 'desc' },
      ],
      limit: 50,
      offset: 0,
      $meta: {
        count: 'exact',
      },
    })
  })

  // ── Example 2: RPC GET with mixed args + filters ──
  test('spec example 2: RPC GET with args + filters', async () => {
    const req = new Request(
      'http://localhost/rest/v1/rpc/search_products?term=phone&category=electronics&min_rating=gte.4&status=eq.available&select=id,name,score&order=score.desc&limit=20',
      {
        method: 'GET',
        headers: {
          'Accept-Profile': 'public',
        },
      },
    )

    const ast = await translate(req)

    expect(ast).toEqual({
      type: 'rpc',
      function: 'search_products',
      schema: 'public',
      args: { term: 'phone', category: 'electronics' },
      httpMethod: 'GET',
      paramsType: 'named',
      inputType: 'json',
      select: ['id', 'name', 'score'],
      where: {
        min_rating: { $gte: 4 },
        status: { $eq: 'available' },
      },
      order: [{ column: 'score', direction: 'desc' }],
      limit: 20,
    })
  })

  // ── Example 3: Upsert with Prefer headers ──
  test('spec example 3: upsert', async () => {
    const body = JSON.stringify([
      { product_id: 1, quantity: 50 },
      { product_id: 2, quantity: 30 },
    ])

    const req = new Request(
      'http://localhost/rest/v1/inventory?on_conflict=product_id&select=product_id,quantity,updated_at&columns="product_id","quantity"',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Profile': 'public',
          Prefer: 'resolution=merge-duplicates, count=exact, missing=default, return=representation',
        },
        body,
      },
    )

    const ast = await translate(req)

    expect(ast).toEqual({
      type: 'upsert',
      from: 'inventory',
      schema: 'public',
      values: [
        { product_id: 1, quantity: 50 },
        { product_id: 2, quantity: 30 },
      ],
      onConflict: 'product_id',
      ignoreDuplicates: false,
      select: ['product_id', 'quantity', 'updated_at'],
      $meta: {
        count: 'exact',
        missing: 'default',
        columns: ['product_id', 'quantity'],
      },
    })
  })

  // ── Additional: simple query ──
  test('simple GET query', async () => {
    const req = new Request('http://localhost/rest/v1/users?select=id,email&status=eq.active&limit=10', {
      method: 'GET',
    })
    const ast = await translate(req)

    expect(ast.type).toBe('query')
    expect(ast.from).toBe('users')
    expect(ast.select).toEqual(['id', 'email'])
    expect(ast.where).toEqual({ status: { $eq: 'active' } })
    expect(ast.limit).toBe(10)
  })

  // ── Additional: simple insert ──
  test('simple POST insert', async () => {
    const req = new Request('http://localhost/rest/v1/products?select=id,name', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Widget', price: 99 }),
    })
    const ast = await translate(req)

    expect(ast.type).toBe('insert')
    expect(ast.from).toBe('products')
    expect(ast.values).toEqual({ name: 'Widget', price: 99 })
    expect(ast.select).toEqual(['id', 'name'])
  })

  // ── Additional: DELETE ──
  test('DELETE with filter', async () => {
    const req = new Request('http://localhost/rest/v1/products?id=in.(1,2,3)', {
      method: 'DELETE',
    })
    const ast = await translate(req)

    expect(ast.type).toBe('delete')
    expect(ast.from).toBe('products')
    expect(ast.where).toEqual({ id: { $in: [1, 2, 3] } })
  })

  // ── Additional: UPDATE ──
  test('PATCH update', async () => {
    const req = new Request('http://localhost/rest/v1/products?id=eq.123&select=id,price', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ price: 799 }),
    })
    const ast = await translate(req)

    expect(ast.type).toBe('update')
    expect(ast.from).toBe('products')
    expect(ast.values).toEqual({ price: 799 })
    expect(ast.where).toEqual({ id: { $eq: 123 } })
    expect(ast.select).toEqual(['id', 'price'])
  })

  // ── Additional: HEAD request ──
  test('HEAD request sets meta.head', async () => {
    const req = new Request('http://localhost/rest/v1/products', {
      method: 'HEAD',
      headers: { Prefer: 'count=exact' },
    })
    const ast = await translate(req)

    expect(ast.type).toBe('query')
    expect(ast.$meta?.head).toBe(true)
    expect(ast.$meta?.count).toBe('exact')
  })

  // ── Additional: cardinality ──
  test('single object cardinality', async () => {
    const req = new Request('http://localhost/rest/v1/users?id=eq.1&select=id,email', {
      method: 'GET',
      headers: { Accept: 'application/vnd.pgrst.object+json' },
    })
    const ast = await translate(req)

    expect(ast.$meta?.cardinality).toBe('one')
  })

  // ── Additional: POST RPC ──
  test('POST RPC', async () => {
    const req = new Request('http://localhost/rest/v1/rpc/calculate_discount', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: 123, discount_percent: 15 }),
    })
    const ast = await translate(req)

    expect(ast.type).toBe('rpc')
    expect(ast.function).toBe('calculate_discount')
    expect(ast.args).toEqual({ product_id: 123, discount_percent: 15 })
    expect(ast.httpMethod).toBe('POST')
    expect(ast.paramsType).toBe('named')
  })

  // ── Bulk insert (array body) ──
  test('bulk insert', async () => {
    const req = new Request('http://localhost/rest/v1/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([
        { name: 'A', price: 10 },
        { name: 'B', price: 20 },
      ]),
    })
    const ast = await translate(req)
    expect(ast.type).toBe('insert')
    expect(ast.values).toEqual([
      { name: 'A', price: 10 },
      { name: 'B', price: 20 },
    ])
  })

  // ── DELETE + select (return deleted rows) ──
  test('DELETE with select', async () => {
    const req = new Request('http://localhost/rest/v1/products?id=eq.1&select=id,name', {
      method: 'DELETE',
      headers: { Prefer: 'return=representation' },
    })
    const ast = await translate(req)
    expect(ast.type).toBe('delete')
    expect(ast.where).toEqual({ id: { $eq: 1 } })
    expect(ast.select).toEqual(['id', 'name'])
  })

  // ── Update without filters (all rows) ──
  test('update without filters', async () => {
    const req = new Request('http://localhost/rest/v1/products', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ featured: false }),
    })
    const ast = await translate(req)
    expect(ast.type).toBe('update')
    expect(ast.values).toEqual({ featured: false })
    expect(ast.where).toBeUndefined()
  })

  // ── Spread embed full pipeline ──
  test('spread embed full pipeline', async () => {
    const req = new Request(
      'http://localhost/rest/v1/films?select=title,...director(first_name,last_name)&limit=5',
      { method: 'GET' },
    )
    const ast = await translate(req)
    expect(ast.select).toEqual([
      'title',
      { director: { spread: true, select: ['first_name', 'last_name'] } },
    ])
    expect(ast.join).toEqual({ director: {} })
    expect(ast.limit).toBe(5)
  })

  // ── RPC POST with positional array args + select + filters ──
  test('RPC POST with array args + select', async () => {
    const req = new Request(
      'http://localhost/rest/v1/rpc/process?select=id,result',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([1, 2, 3]),
      },
    )
    const ast = await translate(req)
    expect(ast.type).toBe('rpc')
    expect(ast.args).toEqual([1, 2, 3])
    expect(ast.paramsType).toBe('positional')
    expect(ast.select).toEqual(['id', 'result'])
  })

  // ── Nested embed 3 levels deep with filters at each level ──
  test('nested 3-level embed with filters', async () => {
    const req = new Request(
      'http://localhost/rest/v1/companies?select=name,departments(name,employees(name,skills(name)))&departments.active=eq.true',
      { method: 'GET' },
    )
    const ast = await translate(req)
    expect(ast.from).toBe('companies')
    expect(ast.join).toEqual({ departments: {} })
    // embedded where merges into the departments embed
    const deptEmbed = (ast.select![1] as any).departments
    expect(deptEmbed.where).toEqual({ active: { $eq: true } })
    expect(deptEmbed.select).toContain('name')
    // verify 3 levels of nesting exist
    const empEmbed = deptEmbed.select.find((e: any) => typeof e === 'object' && e.employees)
    expect(empEmbed).toBeDefined()
    const skillsEmbed = empEmbed.employees.select.find((e: any) => typeof e === 'object' && e.skills)
    expect(skillsEmbed).toBeDefined()
  })

  // ── Additional: custom translator config ──
  test('createTranslator with custom basePath', async () => {
    const { translate: t } = createTranslator({ basePath: '/api/v2' })
    const req = new Request('http://localhost/api/v2/users?select=id', {
      method: 'GET',
    })
    const ast = await t(req)
    expect(ast.from).toBe('users')
    expect(ast.select).toEqual(['id'])
  })
})
