/* The label sheet: previews, direct print to the NIIMBOT B1, or a PDF. One sheet for every kind of label;
   the caller passes the items and the templates that can draw them. Loaded on demand. */
import { useEffect, useRef, useState } from 'react'
import { canBluetooth, canShareFiles, connectPrinter, disconnectPrinter, downloadFiles, isConnected, labelFiles, labelsPdf, printerName, printLabels, shareFiles, turnCanvas } from './printer'
import { toast } from '../components/Bits'

export type Rendered = { canvas: HTMLCanvasElement; source?: string }
/* printer: the model the template is drawn for (canvas width = its print head). paper: transparent rolls use their own sensing mode */
export type Template<T> = { key: string; family?: string; label: string; hint?: string; mm: [number, number]; round?: boolean; printer?: string; paper?: 'transparent'; turn?: boolean; text?: boolean; render: (item: T) => Promise<Rendered> }
/* labels whose text is typed in the app: how to read it from an item, put it back, and save it */
export type TextEdit<T> = { get: (d: T) => { title: string; text: string }; with: (d: T, v: { title: string; text: string }) => T; save: (d: T, v: { title: string; text: string }) => Promise<void> }
export type SheetItem<T> = { id: string; title: string; data: T; group?: string }
type Done = { id: string; title: string; canvas: HTMLCanvasElement; url: string; source?: string }

/* selection: nothing is picked when the sheet opens (pick one by one, or all at once), except when the caller already chose (preselect), or there is a single label */
export default function LabelSheet<T>({ title, items, templates, onClose, initial, textEdit, preselect }: { title: string; items: SheetItem<T>[]; templates: Template<T>[]; onClose: () => void; initial?: string; textEdit?: TextEdit<T>; preselect?: boolean }) {
  const memKey = 'bs_tpl_' + templates.map(t => t.key).join('_')
  const [tplKey, setTplKey] = useState(() => { if (initial && templates.some(t => t.key === initial)) return initial; try { const k = localStorage.getItem(memKey); if (k && templates.some(t => t.key === k)) return k } catch { /* */ } return templates[0].key })
  const tpl = templates.find(t => t.key === tplKey) || templates[0]
  /* templates that come in several sizes: a size switch, and the tiles of the chosen size only */
  const sizes = [...new Set(templates.filter(t => t.family).map(t => t.mm.join('×')))]
  const sizeOf = (t: Template<T>) => t.mm.join('×')
  const shown = sizes.length > 1 && tpl.family ? templates.filter(t => sizeOf(t) === sizeOf(tpl)) : templates
  const pickSize = (sz: string) => { const t = templates.find(x => sizeOf(x) === sz && x.family === tpl.family) || templates.find(x => sizeOf(x) === sz); if (t) setTplKey(t.key) }
  const [done, setDone] = useState<Done[]>([])
  const [picked, setPicked] = useState<Set<string>>(() => new Set(preselect || items.length === 1 ? items.map(i => i.id) : []))
  const togglePick = (id: string) => setPicked(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const [busy, setBusy] = useState<string | null>(null)
  const [printer, setPrinter] = useState<string | null>(isConnected() ? printerName() : null)
  const [density, setDensity] = useState(() => Number(localStorage.getItem('bs_density') || 3))
  /* roll type for D110 strips: transparent and white rolls are sensed differently */
  const [paper, setPaper] = useState<'white' | 'clear'>(() => (localStorage.getItem('bs_paper_d110') === 'clear' ? 'clear' : 'white'))
  useEffect(() => { try { localStorage.setItem('bs_paper_d110', paper) } catch { /* */ } }, [paper])
  const run = useRef(0)
  /* typed text: saved values per item (over), and the label being edited with its live values */
  const [over, setOver] = useState<Record<string, T>>({})
  const [editing, setEditing] = useState<string | null>(null)
  const [form, setForm] = useState({ title: '', text: '' })
  const dataOf = (it: SheetItem<T>) => over[it.id] ?? it.data
  const canEdit = !!(textEdit && tpl.text)
  function openEdit(id: string) { const it = items.find(i => i.id === id); if (!it || !textEdit) return; setForm(textEdit.get(dataOf(it))); setEditing(id) }
  async function redraw(id: string, d: T) {
    try { const r = await tpl.render(d); setDone(ds => ds.map(x => (x.id === id ? { ...x, canvas: r.canvas, url: r.canvas.toDataURL('image/png') } : x))) } catch { /* keep the old picture */ }
  }
  useEffect(() => {
    if (!editing || !textEdit) return
    const it = items.find(i => i.id === editing); if (!it) return
    const t = setTimeout(() => redraw(editing, textEdit.with(dataOf(it), form)), 180)
    return () => clearTimeout(t)
  }, [form, editing]) // eslint-disable-line react-hooks/exhaustive-deps
  async function saveEdit() {
    const it = items.find(i => i.id === editing); if (!it || !textEdit) return
    setBusy('שומר...')
    try { await textEdit.save(dataOf(it), form); setOver(o => ({ ...o, [it.id]: textEdit.with(dataOf(it), form) })); toast(`${it.title} נשמר`); setEditing(null) } catch (e) { toast('לא נשמר: ' + ((e as Error).message || e), true) } finally { setBusy(null) }
  }
  function cancelEdit() { const it = items.find(i => i.id === editing); setEditing(null); if (it) redraw(it.id, dataOf(it)) }

  useEffect(() => {
    const my = ++run.current
    setDone([])
    try { localStorage.setItem(memKey, tpl.key) } catch { /* */ }
    ;(async () => {
      for (const it of items) {
        if (run.current !== my) return
        try {
          const r = await tpl.render(dataOf(it))
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
  const groupAll = (g: string) => items.filter(i => i.group === g).every(i => picked.has(i.id))
  const groupN = (g: string) => items.filter(i => i.group === g && picked.has(i.id)).length
  const toggleGroup = (g: string) => setPicked(s => { const n = new Set(s); const all = groupAll(g); items.filter(i => i.group === g).forEach(i => all ? n.delete(i.id) : n.add(i.id)); return n })
  const allOn = items.length > 0 && items.every(i => picked.has(i.id))
  const toggleAll = () => setPicked(allOn ? new Set() : new Set(items.map(i => i.id)))
  const chosen = done.filter(d => picked.has(d.id))

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
      await printLabels(chosen.map(d => (tpl.turn ? turnCanvas(d.canvas) : d.canvas)), density, tpl.printer === 'D110' ? paper === 'clear' : tpl.paper === 'transparent', i => setBusy(`מדפיס ${i} מתוך ${chosen.length}`))
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
        <div className="pickbar">
          <button type="button" className="selall" onClick={toggleAll}><span className={'ck' + (allOn ? ' on' : picked.size ? ' part' : '')}>{allOn ? <svg viewBox="0 0 16 16"><path d="M3.5 8.5l3 3 6-7" /></svg> : picked.size ? <i /> : null}</span><span>{allOn ? 'בטל את כל הסימון' : `סמן את כל ה ${items.length}`}</span></button>
          <b className="pickn">{picked.size ? `${picked.size} מסומנות` : 'שום תווית לא מסומנת'}</b>
        </div>
        {groups.length > 1 && <div className="chips">{groups.map(g => <button type="button" key={g} className={'chip' + (groupAll(g) ? ' on' : '')} onClick={() => toggleGroup(g)}>{g}<span className="cnt">{groupN(g)}/{items.filter(i => i.group === g).length}</span></button>)}</div>}
        <p className="muted" style={{ margin: 0 }}>{ready ? `מוכן. לחיצה על תווית מסמנת אותה להדפסה.` : `מצייר ${done.length} מתוך ${items.length}...`}</p>
        <div className={'labels-grid' + (tpl.mm[1] > tpl.mm[0] ? ' tall' : '') + (tpl.round ? ' round' : '') + (tpl.mm[0] / tpl.mm[1] > 3 ? ' strip' + (paper === 'white' ? ' white' : '') : '')}>
          {done.map(d => (
            <div key={d.id} className={'label-cell' + (editing === d.id ? ' editing' : '')}>
              <button type="button" className={'label-prev' + (picked.has(d.id) ? ' on' : '')} aria-pressed={picked.has(d.id)} onClick={() => togglePick(d.id)} title={d.title}>
                <span className={'ck lp-ck' + (picked.has(d.id) ? ' on' : '')}>{picked.has(d.id) && <svg viewBox="0 0 16 16"><path d="M3.5 8.5l3 3 6-7" /></svg>}</span>
                <img src={d.url} alt={d.title} style={{ aspectRatio: `${d.canvas.width} / ${d.canvas.height}` }} />
                {d.source && d.source !== 'ldraw' && <span className="label-src">{d.source === 'photo' ? 'מתמונה' : d.source === 'none' ? 'בלי תמונה' : d.source}</span>}
              </button>
              {canEdit && editing !== d.id && <button type="button" className="label-edit" onClick={() => openEdit(d.id)} aria-label={'טקסט ל ' + d.title}>✎ טקסט</button>}
              {canEdit && editing === d.id && (
                <div className="label-form">
                  <div className="field"><label>כותרת</label><input autoFocus value={form.title} maxLength={60} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="חלקי Technic" /></div>
                  <div className="field"><label>טקסט, עד 3 שורות (Enter לשורה חדשה)</label><textarea rows={3} value={form.text} onChange={e => setForm({ ...form, text: e.target.value.split('\n').slice(0, 3).join('\n') })} placeholder={'צירים, גלגלי שיניים\nTechnic pins & axles'} /></div>
                  <div className="label-form-acts"><button type="button" className="btn primary" disabled={!!busy} onClick={saveEdit}>שמור ל {d.title}</button><button type="button" className="btn" onClick={cancelEdit}>ביטול</button></div>
                </div>
              )}
            </div>
          ))}
          {!ready && <div className="label-prev wait"><span /></div>}
        </div>
        <div className="labels-acts">
          {canBluetooth() ? (
            printer
              ? <>{wrongPrinter ? <button type="button" className="btn primary" disabled={!!busy} onClick={switchPrinter}>{`מחוברת ${printer}. החלף ל ${tpl.printer}`}</button> : <button type="button" className="btn primary" disabled={!ready || !!busy || !chosen.length} onClick={print}>{busy || (chosen.length ? `הדפס ${chosen.length} ב ${printer}` : 'סמן תוויות להדפסה')}</button>}{!wrongPrinter && <button type="button" className="btn" disabled={!!busy} onClick={switchPrinter}>החלף מדפסת</button>}</>
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
