/* The label sheet: previews, direct print to the NIIMBOT B1, or a PDF. One sheet for every kind of label;
   the caller passes the items and the templates that can draw them. Loaded on demand. */
import { useEffect, useRef, useState } from 'react'
import { canBluetooth, canShareFiles, connectPrinter, disconnectPrinter, downloadFiles, isConnected, labelFiles, labelsPdf, printerName, printLabels, shareFiles } from './printer'
import { toast } from '../components/Bits'

export type Rendered = { canvas: HTMLCanvasElement; source?: string }
/* printer: the model the template is drawn for (canvas width = its print head). paper: transparent rolls use their own sensing mode */
export type Template<T> = { key: string; family?: string; label: string; hint?: string; mm: [number, number]; round?: boolean; printer?: string; paper?: 'transparent'; render: (item: T) => Promise<Rendered> }
export type SheetItem<T> = { id: string; title: string; data: T; group?: string }
type Done = { id: string; title: string; canvas: HTMLCanvasElement; url: string; source?: string }

export default function LabelSheet<T>({ title, items, templates, onClose }: { title: string; items: SheetItem<T>[]; templates: Template<T>[]; onClose: () => void }) {
  const memKey = 'bs_tpl_' + templates.map(t => t.key).join('_')
  const [tplKey, setTplKey] = useState(() => { try { const k = localStorage.getItem(memKey); if (k && templates.some(t => t.key === k)) return k } catch { /* */ } return templates[0].key })
  const tpl = templates.find(t => t.key === tplKey) || templates[0]
  /* templates that come in several sizes: a size switch, and the tiles of the chosen size only */
  const sizes = [...new Set(templates.filter(t => t.family).map(t => t.mm.join('×')))]
  const sizeOf = (t: Template<T>) => t.mm.join('×')
  const shown = sizes.length > 1 && tpl.family ? templates.filter(t => sizeOf(t) === sizeOf(tpl)) : templates
  const pickSize = (sz: string) => { const t = templates.find(x => sizeOf(x) === sz && x.family === tpl.family) || templates.find(x => sizeOf(x) === sz); if (t) setTplKey(t.key) }
  const [done, setDone] = useState<Done[]>([])
  const [skip, setSkip] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState<string | null>(null)
  const [printer, setPrinter] = useState<string | null>(isConnected() ? printerName() : null)
  const [density, setDensity] = useState(() => Number(localStorage.getItem('bs_density') || 3))
  /* roll type for D110 strips: transparent and white rolls are sensed differently */
  const [paper, setPaper] = useState<'white' | 'clear'>(() => (localStorage.getItem('bs_paper_d110') === 'clear' ? 'clear' : 'white'))
  useEffect(() => { try { localStorage.setItem('bs_paper_d110', paper) } catch { /* */ } }, [paper])
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
  /* group chips (walls): one tap leaves a whole group out of the print */
  const groups = [...new Set(items.map(i => i.group).filter(Boolean) as string[])]
  const groupOn = (g: string) => items.some(i => i.group === g && !skip.has(i.id))
  const toggleGroup = (g: string) => setSkip(s => { const n = new Set(s); const on = groupOn(g); items.filter(i => i.group === g).forEach(i => on ? n.add(i.id) : n.delete(i.id)); return n })
  const chosen = done.filter(d => !skip.has(d.id))

  async function connect() {
    setBusy('מתחבר...')
    try { setPrinter(await connectPrinter()); toast('המדפסת מחוברת') } catch (e) { toast((e as Error).message || 'החיבור נכשל', true) } finally { setBusy(null) }
  }
  const wrongPrinter = !!(printer && tpl.printer && !printer.toUpperCase().startsWith(tpl.printer))
  async function switchPrinter() { await disconnectPrinter(); setPrinter(null) }
  const [shareOk, setShareOk] = useState(false)
  useEffect(() => { setShareOk(canShareFiles([new File([''], 'x.png', { type: 'image/png' })])) }, [])
  async function images(mode: 'download' | 'share') {
    if (!chosen.length) return
    setBusy('מכין תמונות...')
    try {
      const files = await labelFiles(chosen.map(d => d.canvas), chosen.map(d => d.title))
      if (mode === 'share') await shareFiles(files)
      else { await downloadFiles(files); toast(`${files.length} תמונות ירדו לתיקיית ההורדות`) }
    } catch (e) { if ((e as Error).name !== 'AbortError') toast('התמונות לא נוצרו: ' + ((e as Error).message || e), true) } finally { setBusy(null) }
  }
  async function print() {
    if (!chosen.length) return
    if (wrongPrinter) { toast(`התבנית הזו ל ${tpl.printer}, והמחוברת היא ${printer}. החלף מדפסת.`, true); return }
    setBusy(`מדפיס 0 מתוך ${chosen.length}`)
    try {
      await printLabels(chosen.map(d => d.canvas), density, tpl.printer === 'D110' ? paper === 'clear' : tpl.paper === 'transparent', i => setBusy(`מדפיס ${i} מתוך ${chosen.length}`))
      toast(`הודפסו ${chosen.length} תוויות`)
    } catch (e) { toast('ההדפסה נעצרה: ' + ((e as Error).message || e), true) } finally { setBusy(null); setPrinter(isConnected() ? printerName() : null) }
  }

  return (
    <div className="overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="pane labels-pane">
        <div className="grab" />
        <h4>{title} · {items.length}<button type="button" onClick={onClose}>סגור</button></h4>
        {sizes.length > 1 && <div className="seg" role="group" aria-label="גודל תווית">{sizes.map(sz => <button type="button" key={sz} className={sizeOf(tpl) === sz ? 'on' : ''} onClick={() => pickSize(sz)}><span className="ltr">{sz.split('×').join(' × ')}</span> מ"מ</button>)}</div>}
        {shown.length > 1 && (
          <div className="tpls">{shown.map(t => (
            <button type="button" key={t.key} className={'tpl' + (t.key === tpl.key ? ' on' : '')} onClick={() => setTplKey(t.key)}>
              <i className={t.round ? 'round' : ''} style={{ aspectRatio: `${t.mm[0]} / ${t.mm[1]}`, ...(t.mm[0] / t.mm[1] > 2 ? { width: '86%', height: 'auto', margin: '12px 0 14px' } : {}) }} />
              <b>{t.label}</b><small>{t.hint || `${t.mm[0]}×${t.mm[1]} מ"מ`}</small>
            </button>
          ))}</div>
        )}
        {groups.length > 1 && <div className="chips">{groups.map(g => <button type="button" key={g} className={'chip' + (groupOn(g) ? ' on' : '')} onClick={() => toggleGroup(g)}>{g}<span className="cnt">{items.filter(i => i.group === g && !skip.has(i.id)).length}</span></button>)}</div>}
        <p className="muted" style={{ margin: 0 }}>{ready ? `מוכן. לחיצה על תווית מוציאה אותה מההדפסה.` : `מצייר ${done.length} מתוך ${items.length}...`}</p>
        <div className={'labels-grid' + (tpl.mm[1] > tpl.mm[0] ? ' tall' : '') + (tpl.round ? ' round' : '') + (tpl.mm[0] / tpl.mm[1] > 3 ? ' strip' + (paper === 'white' ? ' white' : '') : '')}>
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
              ? <>{wrongPrinter ? <button type="button" className="btn primary" disabled={!!busy} onClick={switchPrinter}>{`מחוברת ${printer}. החלף ל ${tpl.printer}`}</button> : <button type="button" className="btn primary" disabled={!ready || !!busy || !chosen.length} onClick={print}>{busy || `הדפס ${chosen.length} ב ${printer}`}</button>}{!wrongPrinter && <button type="button" className="btn" disabled={!!busy} onClick={switchPrinter}>החלף מדפסת</button>}</>
              : <button type="button" className="btn primary" disabled={!!busy} onClick={connect}>{busy || `חבר מדפסת ${tpl.printer || 'B1'}`}</button>
          ) : <span className="muted" style={{ fontSize: 13 }}>הדפסה ישירה עובדת בכרום (אנדרואיד או מחשב). כאן: PDF.</span>}
          {tpl.printer === 'D110' && <div className="seg" role="group" aria-label="סוג גליל"><button type="button" className={paper === 'white' ? 'on' : ''} onClick={() => setPaper('white')}>לבן</button><button type="button" className={paper === 'clear' ? 'on' : ''} onClick={() => setPaper('clear')}>שקוף</button></div>}
          <label className="density">כהות<select value={density} onChange={e => setDensity(Number(e.target.value))}>{[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}</select></label>
          <button type="button" className="btn" disabled={!ready || !chosen.length} onClick={() => labelsPdf(chosen.map(d => d.canvas), tpl.mm, `brick-house-${tpl.key}-${new Date().toISOString().slice(0, 10)}`)}>הורד PDF</button>
          <button type="button" className="btn" disabled={!ready || !chosen.length || !!busy} onClick={() => images('download')}>הורד תמונות ({chosen.length})</button>
          {shareOk && <button type="button" className="btn" disabled={!ready || !chosen.length || !!busy} onClick={() => images('share')}>שתף תמונות</button>}
        </div>
        <p className="muted" style={{ margin: 0, fontSize: 12 }}>{tpl.printer === 'D110' ? `D110 עם גליל 50×12 ${paper === 'clear' ? 'שקוף' : 'לבן'}. התווית יוצאת לאורכה. כהות 2 או 3.` : `גליל במדפסת: ${tpl.label} (${tpl.mm[0]}×${tpl.mm[1]}). להחליף גליל לפני ההדפסה.`}</p>
      </div>
    </div>
  )
}
