import type { QueryParamsResult, TransformsResult, OrderEntry } from '../types.js'

export function resolveTransforms(
  queryParams: QueryParamsResult,
  embeddedAliases: Set<string>,
): TransformsResult {
  const result: TransformsResult = { embeddedTransforms: {} }

  for (const [key, values] of queryParams) {
    const val = values[0] // transforms use first value

    // Check embedded prefix
    const dotIdx = key.indexOf('.')
    if (dotIdx > 0) {
      const prefix = key.slice(0, dotIdx)
      const rest = key.slice(dotIdx + 1)
      if (embeddedAliases.has(prefix) && (rest === 'order' || rest === 'limit' || rest === 'offset')) {
        if (!result.embeddedTransforms[prefix]) {
          result.embeddedTransforms[prefix] = {}
        }
        if (rest === 'order') {
          result.embeddedTransforms[prefix].order = parseOrder(val)
        } else if (rest === 'limit') {
          result.embeddedTransforms[prefix].limit = Number(val)
        } else if (rest === 'offset') {
          result.embeddedTransforms[prefix].offset = Number(val)
        }
        continue
      }
    }

    if (key === 'order') {
      result.order = parseOrder(val)
    } else if (key === 'limit') {
      result.limit = Number(val)
    } else if (key === 'offset') {
      result.offset = Number(val)
    }
  }

  return result
}

function parseOrder(raw: string): OrderEntry[] {
  return raw.split(',').map(entry => {
    const parts = entry.trim().split('.')
    const result: OrderEntry = { column: parts[0] }

    for (let i = 1; i < parts.length; i++) {
      const part = parts[i]
      if (part === 'asc' || part === 'desc') {
        result.direction = part
      } else if (part === 'nullsfirst') {
        result.nullsFirst = true
      } else if (part === 'nullslast') {
        result.nullsFirst = false
      }
    }

    return result
  })
}
