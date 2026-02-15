import type { RouteResult } from '../types.js'

const DEFAULT_BASE_PATH = '/rest/v1'

export function parseRoute(req: Request, basePath = DEFAULT_BASE_PATH): RouteResult {
  const url = new URL(req.url)
  let path = decodeURIComponent(url.pathname)

  // Strip base path
  if (path.startsWith(basePath)) {
    path = path.slice(basePath.length)
  }

  // Strip leading/trailing slashes
  path = path.replace(/^\/+|\/+$/g, '')

  const segments = path.split('/')

  if (segments[0] === 'rpc' && segments[1]) {
    return { function: segments[1], isRpc: true }
  }

  return { from: segments[0] || undefined, isRpc: false }
}
