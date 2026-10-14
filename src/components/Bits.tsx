import { useEffect, useState } from 'react'
import { themeCls, zoneOf, ZONE_COLORS } from '../lib/api'

export function Logo({ short = false, className = '' }: { short?: boolean; className?: string }) {
  return <span className={'logo ' + className}>BR<span className="stack"><i /><i /><i /><i /></span>{short ? 'CK' : 'CK HOUSE'}</span>
}
export function Stud({ color = '' }: { color?: string }) {
  return <span className={'stud ' + color}><b /><b /><b /><b /></span>
}
export function Loc({ code, small = false }: { code: string | null; small?: boolean }) {
  const sz = small ? { minWidth: 30, fontSize: 10, padding: '1px 0' } : {}
  if (!code) return <span className="loc" style={sz}>—</span>
  const z = zoneOf(code)
  const bg = z ? ZONE_COLORS[z.color] || 'var(--stone)' : undefined
  const fg = z?.color === 'yellow' ? 'var(--ink)' : '#fff'
  return <span className={'loc ' + (z ? '' : code[0])} style={{ ...sz, ...(bg ? { background: bg, color: fg } : {}) }}>{code}</span>
}
export function ThemeTag({ theme }: { theme: string | null }) {
  if (!theme) return null
  return <span className={'tag ' + themeCls(theme)}><i />{theme}</span>
}
export function Pic({ src, alt = '', fallback }: { src: string | null | undefined; alt?: string; fallback?: string }) {
  const [err, setErr] = useState(false)
  if (!src || err) return <span>{fallback || ''}</span>
  return <img src={src} alt={alt} loading="lazy" onError={() => setErr(true)} />
}

const base = import.meta.env.BASE_URL
export const JOEY = { head: base + 'joey-head.webp', happy: base + 'joey-happy.webp', nap: base + 'joey-nap.webp', curious: base + 'joey-curious.webp' }

export function Empty({ img = 'nap', title, text }: { img?: keyof typeof JOEY; title: string; text?: string }) {
  return <div className="empty"><img src={JOEY[img]} alt="" /><b>{title}</b>{text && <span>{text}</span>}</div>
}

/* toast */
type ToastMsg = { text: string; err?: boolean; id: number }
let listeners: ((m: ToastMsg) => void)[] = []
export function toast(text: string, err = false) { listeners.forEach(l => l({ text, err, id: Date.now() })) }
export function Toaster() {
  const [m, setM] = useState<ToastMsg | null>(null)
  useEffect(() => {
    const l = (x: ToastMsg) => setM(x); listeners.push(l)
    return () => { listeners = listeners.filter(f => f !== l) }
  }, [])
  useEffect(() => { if (!m) return; const t = setTimeout(() => setM(null), 2600); return () => clearTimeout(t) }, [m])
  return <div className={'toast' + (m ? ' show' : '') + (m?.err ? ' err' : '')} aria-live="polite">{m && !m.err && <img src={JOEY.happy} alt="" />}<span>{m?.text}</span></div>
}

export function useMedia(q: string) {
  const [ok, setOk] = useState(() => window.matchMedia(q).matches)
  useEffect(() => { const mq = window.matchMedia(q); const f = () => setOk(mq.matches); mq.addEventListener('change', f); return () => mq.removeEventListener('change', f) }, [q])
  return ok
}
