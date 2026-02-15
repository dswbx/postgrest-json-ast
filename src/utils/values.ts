/**
 * Parse an `in.(...)` value list, handling quoted strings.
 * Input: "(1,\"a,b\",3)" → [1, "a,b", 3]
 */
export function parseInList(raw: string): unknown[] {
  // Strip outer parens
  if (raw.startsWith('(') && raw.endsWith(')')) {
    raw = raw.slice(1, -1)
  }
  if (raw === '') return []

  const results: unknown[] = []
  let i = 0

  while (i < raw.length) {
    if (raw[i] === '"') {
      // Quoted string — find closing quote
      i++ // skip opening quote
      let val = ''
      while (i < raw.length && raw[i] !== '"') {
        val += raw[i]
        i++
      }
      if (i < raw.length) i++ // skip closing quote
      results.push(val)
    } else {
      // Unquoted value — read until comma
      let val = ''
      while (i < raw.length && raw[i] !== ',') {
        val += raw[i]
        i++
      }
      results.push(coerceValue(val))
    }
    // Skip comma separator
    if (i < raw.length && raw[i] === ',') i++
  }

  return results
}

/**
 * Parse a PostgreSQL array literal: {1,2,3} → [1, 2, 3]
 */
export function parseArrayLiteral(raw: string): unknown[] {
  if (raw.startsWith('{') && raw.endsWith('}')) {
    raw = raw.slice(1, -1)
  }
  if (raw === '') return []

  const results: unknown[] = []
  let i = 0

  while (i < raw.length) {
    if (raw[i] === '"') {
      i++
      let val = ''
      while (i < raw.length && raw[i] !== '"') {
        if (raw[i] === '\\' && i + 1 < raw.length) {
          i++
          val += raw[i]
        } else {
          val += raw[i]
        }
        i++
      }
      if (i < raw.length) i++ // skip closing quote
      results.push(val)
    } else {
      let val = ''
      while (i < raw.length && raw[i] !== ',') {
        val += raw[i]
        i++
      }
      results.push(coerceValue(val))
    }
    if (i < raw.length && raw[i] === ',') i++
  }

  return results
}

/**
 * Coerce a string value to the appropriate JS type.
 * Numbers, booleans, null are converted; everything else stays string.
 */
export function coerceValue(val: string): unknown {
  if (val === 'null') return null
  if (val === 'true') return true
  if (val === 'false') return false

  // Try numeric — must be a valid finite number
  if (val !== '' && !isNaN(Number(val)) && isFinite(Number(val))) {
    return Number(val)
  }

  return val
}
