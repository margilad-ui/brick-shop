import { useEffect, useState } from 'react'

/* Tiny history router. Paths are relative to BASE + 'shop' (e.g. "/", "/sets", "/set/76388-1"). */
export const BASE = (import.meta.env.BASE_URL || '/').replace(/\/$/, '') + '/shop'

export function currentPath() {
  const p = location.pathname
  const rel = p.startsWith(BASE) ? p.slice(BASE.length) : '/'
  return (rel || '/').replace(/\/+$/, '') || '/'
}
export function currentQuery() { return new URLSearchParams(location.search) }

const listeners = new Set<() => void>()
function emit() { listeners.forEach(l => l()) }

export function navigate(to: string, opts: { replace?: boolean; scroll?: boolean } = {}) {
  const url = to.startsWith('http') ? to : BASE + (to.startsWith('/') ? to : '/' + to)
  if (opts.replace) history.replaceState(null, '', url); else history.pushState(null, '', url)
  if (opts.scroll !== false) window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  emit()
}
export function href(to: string) { return BASE + (to.startsWith('/') ? to : '/' + to) }

window.addEventListener('popstate', emit)

export function useRoute() {
  const [, tick] = useState(0)
  useEffect(() => { const l = () => tick(t => t + 1); listeners.add(l); return () => { listeners.delete(l) } }, [])
  return { path: currentPath(), query: currentQuery() }
}

/* match "/set/:id" style patterns */
export function match(pattern: string, path: string): Record<string, string> | null {
  const a = pattern.split('/').filter(Boolean), b = path.split('/').filter(Boolean)
  if (a.length !== b.length) return null
  const params: Record<string, string> = {}
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith(':')) params[a[i].slice(1)] = decodeURIComponent(b[i])
    else if (a[i] !== b[i]) return null
  }
  return params
}

/* <Link> helper: intercepts plain left clicks */
export function onLinkClick(e: React.MouseEvent<HTMLAnchorElement>, to: string) {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
  e.preventDefault(); navigate(to)
}
