/* multi select on the inventory: the floating bar and the actions sheet (move, status, condition, price, tags, quantity, note, sold, labels, CSV, delete) */
import { useEffect, useMemo, useState } from 'react'
import { bulkDelete, bulkItems, CONDITION, Condition, InventoryRow, Location, Status, STATUS, Zone } from '../lib/api'
import { Loc, toast } from '../components/Bits'

export type BulkAct = 'move' | 'status' | 'condition' | 'price' | 'tags' | 'qty' | 'note' | 'sold' | 'delete'

export function BulkBar({ rows, isParts, onClear, onAct, onLabels }: { rows: InventoryRow[]; isParts: boolean; onClear: () => void; onAct: (a: BulkAct | 'menu') => void; onLabels: () => void }) {
  const units = rows.reduce((s, r) => s + r.qty, 0)
  return (
    <div className="bulkbar" role="toolbar" aria-label="פעולות על השורות המסומנות">
      <button type="button" className="bb-x" onClick={onClear} aria-label="נקה סימון">✕</button>
      <div className="bb-n"><b>{rows.length}</b><small>{rows.length === 1 ? 'שורה' : 'שורות'} · {units.toLocaleString('en-US')} {isParts ? 'חלקים' : 'יחידות'}</small></div>
      <div className="bb-acts">
        <button type="button" className="bb-main" onClick={() => onAct('move')}>העבר מיקום</button>
        {isParts && <button type="button" onClick={onLabels}>תוויות</button>}
        <button type="button" onClick={() => onAct('menu')}>עוד</button>
      </div>
    </div>
  )
}

const ACTS: { a: BulkAct; he: string; d: string; parts: boolean; items: boolean }[] = [
  { a: 'move', he: 'העבר מיקום', d: 'מדף, קובייה, קופסה', parts: true, items: true },
  { a: 'status', he: 'סטטוס', d: 'למכירה, אישי, שמור, נמכר', parts: true, items: true },
  { a: 'condition', he: 'מצב', d: 'סגור, פתוח, בנוי', parts: false, items: true },
  { a: 'price', he: 'מחיר', d: 'אותו מחיר לכולן', parts: false, items: true },
  { a: 'tags', he: 'תגיות', d: 'הוספה או הסרה', parts: true, items: true },
  { a: 'qty', he: 'כמות', d: 'הוסף, הורד או קבע', parts: true, items: true },
  { a: 'note', he: 'הערה', d: 'מתווספת לכל שורה', parts: true, items: true },
  { a: 'sold', he: 'נמכר אחד', d: 'מכל שורה, נרשם ביומן', parts: false, items: true },
  { a: 'delete', he: 'מחיקה', d: 'השורות יוסרו מהמלאי', parts: true, items: true },
]

export function BulkSheet({ rows, isParts, locations, zones, start, onClose, onDone, onLabels, onCsv }: {
  rows: InventoryRow[]; isParts: boolean; locations: Location[]; zones: Zone[]; start: BulkAct | 'menu'
  onClose: () => void; onDone: (clear: boolean) => void; onLabels: () => void; onCsv: () => void
}) {
  const [act, setAct] = useState<BulkAct | 'menu'>(start)
  const [busy, setBusy] = useState(false)
  const [loc, setLoc] = useState<string | null>(null)
  const [status, setStatus] = useState<Status | null>(null)
  const [cond, setCond] = useState<Condition | null>(null)
  const [price, setPrice] = useState('')
  const [tag, setTag] = useState('')
  const [qmode, setQmode] = useState<'add' | 'sub' | 'set'>('add')
  const [qn, setQn] = useState('1')
  const [note, setNote] = useState('')
  const [sure, setSure] = useState(false)
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k) }, [onClose])
  useEffect(() => { setSure(false) }, [act])

  const ids = rows.map(r => r.id)
  const units = rows.reduce((s, r) => s + r.qty, 0)
  const n = rows.length
  const lines = `${n} ${n === 1 ? 'שורה' : 'שורות'}`
  // where the selection sits today
  const from = useMemo(() => { const m = new Map<string, number>(); rows.forEach(r => m.set(r.location || '', (m.get(r.location || '') || 0) + 1)); return [...m.entries()].sort((a, b) => b[1] - a[1]) }, [rows])
  const tagsHere = useMemo(() => { const m = new Map<string, number>(); rows.forEach(r => r.tags?.forEach(t => m.set(t, (m.get(t) || 0) + 1))); return [...m.entries()].sort((a, b) => b[1] - a[1]) }, [rows])
  const groups = useMemo(() => zones.map(z => ({ z, locs: locations.filter(l => l.active !== false && l.wall === z.code) })).filter(g => g.locs.length), [zones, locations])
  const orphans = locations.filter(l => l.active !== false && !zones.some(z => z.code === l.wall))

  async function run(fn: () => Promise<number>, msg: (k: number) => string, clear = false) {
    setBusy(true)
    try { const k = await fn(); toast(msg(k)); onDone(clear) } catch (e) { toast('לא בוצע: ' + (e as Error).message, true) } finally { setBusy(false) }
  }
  const apply: Record<BulkAct, () => void> = {
    move: () => run(() => bulkItems(ids, 'move', { location: loc ?? '' }), k => k ? `${k} שורות עברו ל${loc || 'ללא מיקום'}` : 'הכל כבר היה שם'),
    status: () => status && run(() => bulkItems(ids, 'status', { status }), k => `סטטוס עודכן ב ${k} שורות`),
    condition: () => cond && run(() => bulkItems(ids, 'condition', { condition: cond }), k => `מצב עודכן ב ${k} שורות`),
    price: () => run(() => bulkItems(ids, 'price', { price: price || '' }), k => price ? `מחיר ₪ ${price} ב ${k} שורות` : `${k} שורות סומנו "לתמחר"`),
    tags: () => {},
    qty: () => {
      const v = Math.max(0, Math.round(Number(qn) || 0))
      if (qmode === 'set') return run(() => bulkItems(ids, 'qty_set', { n: v }), k => `כמות ${v} נקבעה ב ${k} שורות`)
      run(() => bulkItems(ids, 'qty_add', { n: qmode === 'add' ? v : -v }), k => `כמות עודכנה ב ${k} שורות`)
    },
    note: () => note.trim() && run(() => bulkItems(ids, 'notes_append', { note: note.trim() }), k => `הערה נוספה ל ${k} שורות`),
    sold: () => run(() => bulkItems(ids, 'sold_one'), k => `נרשמה מכירה ב ${k} שורות`),
    delete: () => run(() => bulkDelete(ids), k => `${k} שורות נמחקו`, true),
  }
  const tagRun = (op: 'tags_add' | 'tags_remove', t: string) => t.trim() && run(() => bulkItems(ids, op, { tags: t.split(',').map(s => s.trim()).filter(Boolean) }), k => op === 'tags_add' ? `התגית נוספה ל ${k} שורות` : `התגית הוסרה מ ${k} שורות`)
  const meta = ACTS.find(x => x.a === act)

  return (
    <div className="overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="pane bulk">
        <div className="grab" />
        <h4>
          {act === 'menu' ? <span>פעולה על {lines}</span> : <span><button type="button" className="bk-back" onClick={() => setAct('menu')} aria-label="חזרה">→</button>{meta?.he}</span>}
          <button type="button" onClick={onClose}>סגור</button>
        </h4>
        <div className="bk-sum">
          <b>{lines}</b> · {units.toLocaleString('en-US')} {isParts ? 'חלקים' : 'יחידות'}
          <div className="bk-from">{from.slice(0, 6).map(([c, k]) => <span key={c || '-'}>{c ? <Loc code={c} small /> : <i>ללא מיקום</i>}<em>{k}</em></span>)}{from.length > 6 && <span><i>ועוד {from.length - 6}</i></span>}</div>
        </div>

        {act === 'menu' && <>
          <div className="bk-grid">
            {ACTS.filter(x => (isParts ? x.parts : x.items)).map(x => (
              <button type="button" key={x.a} className={'bk-tile' + (x.a === 'delete' ? ' danger' : x.a === 'move' ? ' main' : '')} onClick={() => setAct(x.a)}><b>{x.he}</b><small>{x.d}</small></button>
            ))}
            {isParts && <button type="button" className="bk-tile" onClick={onLabels}><b>תוויות</b><small>{n} תוויות 50×30 ל B1</small></button>}
            <button type="button" className="bk-tile" onClick={onCsv}><b>ייצוא CSV</b><small>רק השורות המסומנות</small></button>
          </div>
        </>}

        {act === 'move' && <>
          <div className="bk-locs">
            {groups.map(({ z, locs }) => (
              <div className="g" key={z.code}><div className="lab">{z.name}</div>
                <div className="chips">{locs.map(l => <button type="button" key={l.code} className={'chip lp' + (loc === l.code ? ' on' : '')} onClick={() => setLoc(l.code)} title={l.label || l.code}><Loc code={l.code} small />{l.label && l.label !== l.code ? <span className="lpl">{l.label}</span> : null}</button>)}</div>
              </div>
            ))}
            {orphans.length > 0 && <div className="g"><div className="lab">אחר</div><div className="chips">{orphans.map(l => <button type="button" key={l.code} className={'chip lp' + (loc === l.code ? ' on' : '')} onClick={() => setLoc(l.code)}><Loc code={l.code} small /></button>)}</div></div>}
            <div className="g"><div className="chips"><button type="button" className={'chip' + (loc === '' ? ' on' : '')} onClick={() => setLoc('')}>ללא מיקום</button></div></div>
          </div>
          <button type="button" className="cta" disabled={busy || loc === null} onClick={apply.move}>{loc === null ? 'בחר מיקום' : `העבר ${lines} ל ${loc || 'ללא מיקום'}`}</button>
        </>}

        {act === 'status' && <>
          <div className="chips">{(Object.keys(STATUS) as Status[]).map(s => <button type="button" key={s} className={'chip' + (status === s ? ' on' : '')} onClick={() => setStatus(s)}>{STATUS[s].he}</button>)}</div>
          {status === 'sale' && isParts && <p className="muted small">חלקים בסטטוס "למכירה" עדיין לא מוצגים בחנות. החנות מציגה רק סטים ופריטים.</p>}
          <button type="button" className="cta" disabled={busy || !status} onClick={apply.status}>{status ? `קבע "${STATUS[status].he}" ל ${lines}` : 'בחר סטטוס'}</button>
        </>}

        {act === 'condition' && <>
          <div className="chips">{(Object.keys(CONDITION) as Condition[]).map(c => <button type="button" key={c} className={'chip' + (cond === c ? ' on' : '')} onClick={() => setCond(c)}>{CONDITION[c]}</button>)}</div>
          <button type="button" className="cta" disabled={busy || !cond} onClick={apply.condition}>{cond ? `קבע "${CONDITION[cond]}" ל ${lines}` : 'בחר מצב'}</button>
        </>}

        {act === 'price' && <>
          <div className="field"><label>מחיר מכירה לכל שורה (₪). ריק = לתמחר</label><input inputMode="decimal" autoFocus value={price} onChange={e => setPrice(e.target.value.replace(/[^\d.]/g, ''))} placeholder="לתמחר" /></div>
          <button type="button" className="cta" disabled={busy} onClick={apply.price}>{price ? `קבע ₪ ${price} ל ${lines}` : `סמן ${lines} "לתמחר"`}</button>
        </>}

        {act === 'tags' && <>
          <div className="field"><label>תגית (אפשר כמה, מופרדות בפסיק)</label><input autoFocus value={tag} onChange={e => setTag(e.target.value)} placeholder="שקית 3, לסדנה" onKeyDown={e => { if (e.key === 'Enter') tagRun('tags_add', tag) }} /></div>
          <div className="field2">
            <button type="button" className="btn primary" disabled={busy || !tag.trim()} onClick={() => tagRun('tags_add', tag)}>הוסף לכולן</button>
            <button type="button" className="btn" disabled={busy || !tag.trim()} onClick={() => tagRun('tags_remove', tag)}>הסר מכולן</button>
          </div>
          {tagsHere.length > 0 && <div className="g"><div className="lab">תגיות שכבר על השורות (נגיעה מסירה)</div><div className="chips">{tagsHere.map(([t, k]) => <button type="button" key={t} className="chip" disabled={busy} onClick={() => tagRun('tags_remove', t)}>{t}<span className="cnt">{k}</span> ✕</button>)}</div></div>}
        </>}

        {act === 'qty' && <>
          <div className="seg">{([['add', 'הוסף'], ['sub', 'הורד'], ['set', 'קבע']] as const).map(([v, h]) => <button type="button" key={v} className={qmode === v ? 'on' : ''} onClick={() => setQmode(v)}>{h}</button>)}</div>
          <div className="field"><label>{qmode === 'set' ? 'הכמות החדשה בכל שורה' : 'בכמה, בכל שורה'}</label><input type="number" min={0} inputMode="numeric" value={qn} onChange={e => setQn(e.target.value)} /></div>
          {qmode === 'set' && <p className="muted small">כל שורה תקבל בדיוק את הכמות הזו. השינוי נרשם ביומן התנועות.</p>}
          <button type="button" className="cta" disabled={busy || qn === ''} onClick={apply.qty}>{qmode === 'set' ? `קבע ${qn || 0} בכל ${lines}` : `${qmode === 'add' ? 'הוסף' : 'הורד'} ${qn || 0} בכל ${lines}`}</button>
        </>}

        {act === 'note' && <>
          <div className="field"><label>הערה (מתווספת להערה הקיימת)</label><textarea rows={3} autoFocus value={note} onChange={e => setNote(e.target.value)} placeholder="נכנס לקופסה 3, שקית מקורית..." /></div>
          <button type="button" className="cta" disabled={busy || !note.trim()} onClick={apply.note}>הוסף הערה ל {lines}</button>
        </>}

        {act === 'sold' && <>
          <p className="small">מכל שורה תרד יחידה אחת. שורה שמגיעה לאפס עוברת ל"נמכר" ונעלמת מהחנות. שורות שכבר באפס לא ישתנו.</p>
          <button type="button" className="cta dark" disabled={busy} onClick={apply.sold}>נמכר אחד מכל {lines}</button>
        </>}

        {act === 'delete' && <>
          <p className="small">{lines} ({units.toLocaleString('en-US')} {isParts ? 'חלקים' : 'יחידות'}) יימחקו מהמלאי. המחיקה נרשמת ביומן התנועות, אבל השורות עצמן לא חוזרות.{isParts ? ' ייבוא "כל האוסף" יחזיר חלקים שנמצאים בקובץ.' : ''}</p>
          {!sure ? <button type="button" className="cta bk-danger" disabled={busy} onClick={() => setSure(true)}>מחק {lines}</button>
            : <button type="button" className="cta bk-danger sure" disabled={busy} onClick={apply.delete}>בטוח? מחק {lines} לצמיתות</button>}
        </>}
      </div>
    </div>
  )
}
