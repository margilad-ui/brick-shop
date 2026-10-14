import { useCallback, useEffect, useRef, useState } from 'react'
import { addItem, CatalogSet, Condition, CONDITION, fmtPrice, Kind, Location, lookup, Lookup, NewItem, queueAdd, shelfCount, Status, STATUS, zoneOf } from '../lib/api'
import { Empty, Loc, Pic, ThemeTag, toast } from '../components/Bits'
import { Scanner } from '../components/Scanner'

type Recent = { number: string; name: string; qty: number; loc: string }

export function Add({ locations }: { locations: Location[] }) {
  const [loc, setLoc] = useState(() => localStorage.getItem('bs_shelf') || 'B3')
  const [count, setCount] = useState<number | null>(null)
  const [q, setQ] = useState('')
  const [scan, setScan] = useState(false)
  const [busy, setBusy] = useState(false)
  const [res, setRes] = useState<Lookup | null>(null)
  const [qty, setQty] = useState(1)
  const [cond, setCond] = useState<Condition>('sealed')
  const [status, setStatus] = useState<Status>('sale')
  const [price, setPrice] = useState<string>('')
  const [custom, setCustom] = useState({ name: '', kind: 'gear' as Kind })
  const [recent, setRecent] = useState<Recent[]>(() => { try { return JSON.parse(localStorage.getItem('bs_recent') || '[]') } catch { return [] } })
  const inputRef = useRef<HTMLInputElement>(null)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => { localStorage.setItem('bs_shelf', loc); shelfCount(loc).then(setCount) }, [loc])

  const doLookup = useCallback(async (code: string) => {
    setBusy(true); setRes(null)
    const r = await lookup(code)
    setRes(r); setBusy(false)
    if ('found' in r && r.found) { setPrice(r.suggested.price != null ? String(r.suggested.price) : '') }
    else setPrice('')
    setQty(1)
  }, [])

  function onInput(v: string) {
    const d = v.replace(/\D/g, '').slice(0, 13); setQ(d); setRes(null)
    window.clearTimeout(timer.current)
    if (d.length === 5 || d.length === 7 || d.length >= 12) timer.current = window.setTimeout(() => doLookup(d), d.length >= 12 ? 0 : 500)
  }
  const onCode = useCallback((code: string) => { setScan(false); setQ(code); doLookup(code); if (navigator.vibrate) navigator.vibrate(60) }, [doLookup])

  async function save(set: CatalogSet | null) {
    const n: NewItem = {
      kind: set ? (set.packaging === 'Polybag' ? 'polybag' : 'set') : custom.kind,
      set_num: set ? set.set_num : null,
      custom_name: set ? null : custom.name.trim() || null,
      ean: q.length >= 12 ? q : null,
      location: loc, qty, condition: cond, status,
      price: price ? Number(price) : null,
      price_source: price && res && 'found' in res && res.found && Number(price) === res.suggested.price ? res.suggested.source : (price ? 'ידני' : null),
      tags: [], notes: null,
    }
    if (!set && !n.custom_name) { toast('תן שם לפריט', true); return }
    setBusy(true)
    try {
      const r = await addItem(n)
      toast(r.merged ? `עודכן. ${set?.name || n.custom_name} עכשיו ${r.qty} במדף ${loc}` : `נוסף. ${qty} × ${set?.name || n.custom_name} במדף ${loc}`)
      const rec: Recent[] = [{ number: set?.number || '', name: set?.name || n.custom_name || '', qty, loc }, ...recent].slice(0, 6)
      setRecent(rec); localStorage.setItem('bs_recent', JSON.stringify(rec))
      setCount(c => (c ?? 0) + qty)
      setQ(''); setRes(null); setQty(1); setPrice(''); setCustom({ name: '', kind: 'gear' })
      inputRef.current?.focus()
    } catch (err) {
      const m = (err as Error).message || ''
      if (/fetch|network|Failed/i.test(m)) { queueAdd(n); toast('אין רשת. נשמר בטלפון ויעלה כשתהיה.') }
      else toast('לא נשמר: ' + m, true)
    } finally { setBusy(false) }
  }

  const found = res && 'found' in res && res.found ? res : null
  const set = found ? found.set : null
  const retired = !!(set?.exit_date && set.exit_date < new Date().toISOString().slice(0, 10))

  const zone = zoneOf(loc)
  const here = locations.find(l => l.code === loc)
  return (
    <div className="page">
      <div className={'shelf ' + (zone?.color || 'blue')}>
        <div className="where"><Loc code={loc} /><div>{here?.label || loc}<small>{count == null ? '...' : `${count} פריטים כבר כאן`}{zone?.site ? ` · ${zone.site}` : ''}</small></div></div>
        <select value={loc} onChange={e => setLoc(e.target.value)} aria-label="בחר מדף">
          {locations.filter(l => l.active !== false || l.code === loc).map(l => <option key={l.code} value={l.code}>{l.code} · {l.label}</option>)}
        </select>
      </div>

      <div className="entry">
        <div className="fieldbox"><small>מספר סט (5 ספרות) או ברקוד</small>
          <input ref={inputRef} value={q} onChange={e => onInput(e.target.value)} inputMode="numeric" placeholder="76388" aria-label="מספר סט או ברקוד" autoFocus
            onKeyDown={e => { if (e.key === 'Enter' && q.length >= 4) doLookup(q) }} /></div>
        <button type="button" className={'cam' + (scan ? ' on' : '')} onClick={() => setScan(s => !s)}>
          <svg viewBox="0 0 24 24"><path d="M4 7h3l2-2h6l2 2h3v12H4z" /><circle cx="12" cy="13" r="3.5" /></svg>{scan ? 'סגור' : 'סרוק'}
        </button>
      </div>

      {scan && <Scanner onCode={onCode} onError={m => toast(m, true)} />}

      {busy && !res && <div className="muted" style={{ textAlign: 'center' }}>מחפש...</div>}

      {res && 'error' in res && <div className="card"><Empty img="curious" title="שגיאה" text={res.error} /></div>}

      {res && 'found' in res && !res.found && (
        <div className="card">
          <Empty img="curious" title={res.reason === 'barcode_unknown' ? 'הברקוד לא בקטלוג עדיין' : 'לא מצאתי סט עם המספר הזה'} text={res.reason === 'barcode_unknown' ? 'נסה להקליד את 5 הספרות מחזית הקופסה. או רשום כפריט ידני:' : 'בדוק את המספר, או רשום כפריט ידני:'} />
          <div style={{ padding: '0 14px 14px', display: 'grid', gap: 10 }}>
            <div className="field2">
              <div className="field"><label>שם הפריט</label><input value={custom.name} onChange={e => setCustom({ ...custom, name: e.target.value })} placeholder="קלמר לגו אדום" /></div>
              <div className="field"><label>סוג</label><select value={custom.kind} onChange={e => setCustom({ ...custom, kind: e.target.value as Kind })}><option value="gear">ציוד</option><option value="polybag">Polybag</option><option value="parts">חלקים</option><option value="set">סט</option><option value="other">אחר</option></select></div>
            </div>
            <Controls qty={qty} setQty={setQty} cond={cond} setCond={setCond} status={status} setStatus={setStatus} price={price} setPrice={setPrice} />
            <button className="cta" type="button" disabled={busy} onClick={() => save(null)}>הוסף למדף {loc}</button>
          </div>
        </div>
      )}

      {set && found && (
        <div className="card hit">
          <div className="top2">
            <div className="pic"><Pic src={set.image_url} alt={set.name} fallback={set.number} /></div>
            <div>
              <div className="n">{set.set_num}{found.source === 'brickset' && <span className="muted"> · נמשך עכשיו</span>}</div>
              <h3>{set.name}</h3>
              <div className="f">{set.year} · {set.pieces?.toLocaleString('en-US')} חלקים · {set.minifigs ?? 0} מיניפיגורות · {set.age_min ? set.age_min + '+' : ''}</div>
              <div className="tags"><ThemeTag theme={set.theme} />{retired ? <span className="tag t-red">פרש {set.exit_date?.slice(0, 4)}</span> : <span className="tag t-green">בייצור</span>}{set.rrp_us && <span className="tag t-ink">RRP ${set.rrp_us}</span>}</div>
            </div>
          </div>
          <div className="price">
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}><span className="muted">₪</span><input value={price} onChange={e => setPrice(e.target.value.replace(/[^\d.]/g, ''))} inputMode="decimal" placeholder="לתמחר" aria-label="מחיר" /></div>
              <div className="src">{found.suggested.price != null ? <>מחיר מוצע {fmtPrice(found.suggested.price)} · {found.suggested.source} · אפשר לשנות</> : found.suggested.source}</div>
            </div>
          </div>
          <Controls qty={qty} setQty={setQty} cond={cond} setCond={setCond} status={status} setStatus={setStatus} />
          <div style={{ padding: '0 14px 14px' }}><button className="cta" type="button" disabled={busy} onClick={() => save(set)}>הוסף למדף {loc}</button></div>
        </div>
      )}

      {recent.length > 0 && (
        <div className="recent">
          <div className="eyebrow" style={{ margin: '4px 0 6px' }}>נוסף הרגע</div>
          {recent.map((r, i) => <div className="r" key={i}><Loc code={r.loc} small /><b>{r.number}</b> {r.name} <span className="q">{r.qty}</span></div>)}
        </div>
      )}
    </div>
  )
}

function Controls({ qty, setQty, cond, setCond, status, setStatus, price, setPrice }: { qty: number; setQty: (n: number) => void; cond: Condition; setCond: (c: Condition) => void; status: Status; setStatus: (s: Status) => void; price?: string; setPrice?: (p: string) => void }) {
  return (
    <div className="ctl">
      <div className="lab">כמות</div>
      <div className="qty"><button type="button" onClick={() => setQty(Math.max(1, qty - 1))}>−</button><input value={qty} onChange={e => setQty(Math.max(1, Number(e.target.value.replace(/\D/g, '')) || 1))} inputMode="numeric" aria-label="כמות" /><button type="button" onClick={() => setQty(qty + 1)}>+</button></div>
      <div className="lab">מצב</div>
      <div className="chips">{(Object.keys(CONDITION) as Condition[]).map(c => <button type="button" key={c} className={'chip' + (cond === c ? ' on' : '')} onClick={() => setCond(c)}>{CONDITION[c]}</button>)}</div>
      <div className="lab">סטטוס</div>
      <div className="chips">{(['sale', 'personal', 'hold'] as Status[]).map(s => <button type="button" key={s} className={'chip y' + (status === s ? ' on' : '')} onClick={() => setStatus(s)}>{STATUS[s].he}</button>)}</div>
      {setPrice && <><div className="lab">מחיר</div><div className="qty" style={{ borderRadius: 10 }}><input value={price || ''} onChange={e => setPrice(e.target.value.replace(/[^\d.]/g, ''))} inputMode="decimal" placeholder="₪" aria-label="מחיר" style={{ width: 90 }} /></div></>}
    </div>
  )
}
