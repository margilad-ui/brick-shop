/* The label sheet: previews of 50 x 30 mm part labels, direct print to the NIIMBOT B1, or a PDF. Loaded on demand. */
import { useEffect, useRef, useState } from 'react'
import { renderLabel, type PartLabel } from './render'
import { canBluetooth, connectPrinter, isConnected, labelsPdf, printerName, printLabels } from './printer'
import { toast } from '../components/Bits'

type Done = { p: PartLabel; canvas: HTMLCanvasElement; url: string; source: string }

export default function LabelSheet({ parts, onClose }: { parts: PartLabel[]; onClose: () => void }) {
  const [done, setDone] = useState<Done[]>([])
  const [skip, setSkip] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState<string | null>(null)
  const [printer, setPrinter] = useState<string | null>(isConnected() ? printerName() : null)
  const [density, setDensity] = useState(() => Number(localStorage.getItem('bs_density') || 3))
  const alive = useRef(true)

  useEffect(() => {
    alive.current = true
    ;(async () => {
      for (const p of parts) {
        if (!alive.current) return
        try {
          const r = await renderLabel(p)
          if (!alive.current) return
          setDone(d => [...d, { p, canvas: r.canvas, url: r.canvas.toDataURL('image/png'), source: r.source }])
        } catch (e) { console.warn('label', p.part_no, e) }
      }
    })()
    return () => { alive.current = false }
  }, [parts])
  useEffect(() => { localStorage.setItem('bs_density', String(density)) }, [density])
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k) }, [onClose])

  const ready = done.length === parts.length
  const chosen = done.filter(d => !skip.has(d.p.id))

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
        <h4>תוויות 50×30 · {parts.length}<button type="button" onClick={onClose}>סגור</button></h4>
        <p className="muted" style={{ margin: 0 }}>{ready ? `מוכן. לחיצה על תווית מוציאה אותה מההדפסה.` : `מצייר ${done.length} מתוך ${parts.length}...`}</p>
        <div className="labels-grid">
          {done.map(d => (
            <button type="button" key={d.p.id} className={'label-prev' + (skip.has(d.p.id) ? ' off' : '')} onClick={() => setSkip(s => { const n = new Set(s); if (n.has(d.p.id)) n.delete(d.p.id); else n.add(d.p.id); return n })} title={d.source === 'ldraw' ? 'ציור LDraw' : d.source === 'photo' ? 'מתמונת BrickLink' : 'בלי תמונה'}>
              <img src={d.url} alt={d.p.name || d.p.part_no} />
              {d.source !== 'ldraw' && <span className="label-src">{d.source === 'photo' ? 'מתמונה' : 'בלי תמונה'}</span>}
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
          <button type="button" className="btn" disabled={!ready || !chosen.length} onClick={() => labelsPdf(chosen.map(d => d.canvas), `brick-house-labels-${new Date().toISOString().slice(0, 10)}`)}>הורד PDF</button>
        </div>
      </div>
    </div>
  )
}
