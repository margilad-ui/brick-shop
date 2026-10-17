/* The label sheet: previews, direct print to the NIIMBOT B1, or a PDF. One sheet for every kind of label;
   the caller passes the items and the templates that can draw them. Loaded on demand. */
import { useEffect, useRef, useState } from 'react'
import { canBluetooth, connectPrinter, isConnected, labelsPdf, printerName, printLabels } from './printer'
import { toast } from '../components/Bits'

export type Rendered = { canvas: HTMLCanvasElement; source?: string }
export type Template<T> = { key: string; label: string; hint?: string; mm: [number, number]; round?: boolean; render: (item: T) => Promise<Rendered> }
export type SheetItem<T> = { id: string; title: string; data: T }
type Done = { id: string; title: string; canvas: HTMLCanvasElement; url: string; source?: string }

export default function LabelSheet<T>({ title, items, templates, onClose }: { title: string; items: SheetItem<T>[]; templates: Template<T>[]; onClose: () => void }) {
  const memKey = 'bs_tpl_' + templates.map(t => t.key).join('_')
  const [tplKey, setTplKey] = useState(() => { try { const k = localStorage.getItem(memKey); if (k && templates.some(t => t.key === k)) return k } catch { /* */ } return templates[0].key })
  const tpl = templates.find(t => t.key === tplKey) || templates[0]
  const [done, setDone] = useState<Done[]>([])
  const [skip, setSkip] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState<string | null>(null)
  const [printer, setPrinter] = useState<string | null>(isConnected() ? printerName() : null)
  const [density, setDensity] = useState(() => Number(localStorage.getItem('bs_density') || 3))
  const run = useRef(0)

  useEffect(() => {
    const my = ++run.current
    setDone([])
    try { localStorage.setItem(memKey, tpl.key) } catch { /* */ }
    ;(async () => {
      for (const it of items) {
        if (run.current !== my) return
        try {
          const r = await tpl.render(it.data)
          if (run.current !== my) return
          setDone(d => [...d, { id: it.id, title: it.title, canvas: r.canvas, url: r.canvas.toDataURL('image/png'), source: r.source }])
        } catch (e) { console.warn('label', it.id, e) }
      }
    })()
    return () => { run.current++ }
  }, [items, tpl]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { localStorage.setItem('bs_density', String(density)) }, [density])
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k) }, [onClose])

  const ready = done.length === items.length
  const chosen = done.filter(d => !skip.has(d.id))

  async function connect() {
    setBusy('מתחבר...')
    try { setPrinter(await connectPrinter()); toast('המדפסת מחוברת') } catch (e) { toast((e as Error).message || 'החיבור נכשל', true) } finally { setBusy(null) }
  }
  async function print() {
    if (!chosen.length) return
    setBusy(`מדפיס 0 מתוך ${chosen.length}`)
    try {
      await printLabels(chosen.map(d => d.canvas), density, i => setBusy(`מדפיס ${i} מתוך ${chosen.length}`))
      toast(`הודפסו ${chosen.length} תוויות`)
    } catch (e) { toast('ההדפסה נעצרה: ' + ((e as Error).message || e), true) } finally { setBusy(null); setPrinter(isConnected() ? printerName() : null) }
  }

  return (
    <div className="overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="pane labels-pane">
        <div className="grab" />
        <h4>{title} · {items.length}<button type="button" onClick={onClose}>סגור</button></h4>
        {templates.length > 1 && (
          <div className="tpls">{templates.map(t => (
            <button type="button" key={t.key} className={'tpl' + (t.key === tpl.key ? ' on' : '')} onClick={() => setTplKey(t.key)}>
              <i className={t.round ? 'round' : ''} style={{ aspectRatio: `${t.mm[0]} / ${t.mm[1]}` }} />
              <b>{t.label}</b><small>{t.hint || `${t.mm[0]}×${t.mm[1]} מ"מ`}</small>
            </button>
          ))}</div>
        )}
        <p className="muted" style={{ margin: 0 }}>{ready ? `מוכן. לחיצה על תווית מוציאה אותה מההדפסה.` : `מצייר ${done.length} מתוך ${items.length}...`}</p>
        <div className={'labels-grid' + (tpl.mm[1] > tpl.mm[0] ? ' tall' : '') + (tpl.round ? ' round' : '')}>
          {done.map(d => (
            <button type="button" key={d.id} className={'label-prev' + (skip.has(d.id) ? ' off' : '')} onClick={() => setSkip(s => { const n = new Set(s); if (n.has(d.id)) n.delete(d.id); else n.add(d.id); return n })} title={d.title}>
              <img src={d.url} alt={d.title} style={{ aspectRatio: `${d.canvas.width} / ${d.canvas.height}` }} />
              {d.source && d.source !== 'ldraw' && <span className="label-src">{d.source === 'photo' ? 'מתמונה' : d.source === 'none' ? 'בלי תמונה' : d.source}</span>}
            </button>
          ))}
          {!ready && <div className="label-prev wait"><span /></div>}
        </div>
        <div className="labels-acts">
          {canBluetooth() ? (
            printer
              ? <button type="button" className="btn primary" disabled={!ready || !!busy || !chosen.length} onClick={print}>{busy || `הדפס ${chosen.length} ב ${printer}`}</button>
              : <button type="button" className="btn primary" disabled={!!busy} onClick={connect}>{busy || 'חבר מדפסת B1'}</button>
          ) : <span className="muted" style={{ fontSize: 13 }}>הדפסה ישירה עובדת בכרום (אנדרואיד או מחשב). כאן: PDF.</span>}
          <label className="density">כהות<select value={density} onChange={e => setDensity(Number(e.target.value))}>{[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}</select></label>
          <button type="button" className="btn" disabled={!ready || !chosen.length} onClick={() => labelsPdf(chosen.map(d => d.canvas), tpl.mm, `brick-house-${tpl.key}-${new Date().toISOString().slice(0, 10)}`)}>הורד PDF</button>
        </div>
        <p className="muted" style={{ margin: 0, fontSize: 12 }}>גליל במדפסת: {tpl.label} ({tpl.mm[0]}×{tpl.mm[1]}). להחליף גליל לפני ההדפסה.</p>
      </div>
    </div>
  )
}
