import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { deleteLocation, deleteZone, importParts, InventoryRow, keyUsage, Location, LOC_KINDS, parsePartsCsv, PartRow, saveLocation, saveZone, Status, STATUS, syncYear, Zone, ZONE_COLORS } from '../lib/api'
import { Loc, toast } from '../components/Bits'
import { Labels, LocationLabels, type LocLabel, type PartLabel } from '../labels'

export function Settings({ rows, locations, zones, email, reload }: { rows: InventoryRow[]; locations: Location[]; zones: Zone[]; email: string; reload: () => void }) {
  return (
    <div className="page">
      <PartsImport locations={locations} reload={reload} />
      <Places rows={rows} locations={locations} zones={zones} reload={reload} />
      <Keys />
      <Catalog />
      <Pricing />
      <div className="card" style={{ padding: 16, display: 'grid', gap: 10 }}>
        <div className="eyebrow">חשבון</div>
        <p className="muted">{email}</p>
        <button className="btn" type="button" onClick={() => supabase.auth.signOut()}>יציאה</button>
      </div>
    </div>
  )
}

/* ---------- places: zones (walls, rooms, cabinets) and their shelves ---------- */
function Places({ rows, locations, zones, reload }: { rows: InventoryRow[]; locations: Location[]; zones: Zone[]; reload: () => void }) {
  const [nz, setNz] = useState({ code: '', name: '', color: 'red', site: '' })
  const [lbl, setLbl] = useState<LocLabel[] | null>(null)
  const toLbl = (l: Location): LocLabel => ({ code: l.code, label: l.label, kind: l.kind, kindName: LOC_KINDS[l.kind] || '', zoneName: zones.find(z => z.code === l.wall)?.name || null })
  const onLabels = (ls: Location[]) => setLbl(ls.filter(l => l.active !== false).map(toLbl))
  const countAt = (code: string) => rows.filter(r => r.location === code && r.status !== 'sold').reduce((s, r) => s + r.qty, 0)

  async function addZone() {
    const code = nz.code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (!code || !nz.name.trim()) { toast('קוד ושם לאזור', true); return }
    if (zones.some(z => z.code === code)) { toast('הקוד הזה כבר קיים', true); return }
    try { await saveZone({ code, name: nz.name.trim(), color: nz.color, site: nz.site.trim() || null, sort: (zones[zones.length - 1]?.sort || 0) + 10 }); setNz({ code: '', name: '', color: 'red', site: '' }); toast('האזור נוסף'); reload() } catch (e) { toast((e as Error).message, true) }
  }
  return (
    <div className="card" style={{ padding: 16, display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}><div className="eyebrow">מקומות: אזורים ומדפים</div><button type="button" className="btn" onClick={() => onLabels(locations)}>תוויות מיקום</button></div>
      <p className="muted">אזור הוא קיר, ארון, חדר או מחסן. לכל אזור קוד קצר (אות או שתיים) וצבע, ובתוכו מדפים, קופסאות או תאים. קוד המיקום המלא הוא קוד האזור ומספר, למשל B3.</p>
      {zones.map(z => <ZoneCard key={z.code} zone={z} shelves={locations.filter(l => l.wall === z.code)} countAt={countAt} reload={reload} onLabels={onLabels} />)}
      {lbl && <LocationLabels locs={lbl} onClose={() => setLbl(null)} />}
      <div className="zone" style={{ background: 'var(--bg)' }}>
        <div className="eyebrow">אזור חדש</div>
        <div className="addrow">
          <input className="code" placeholder="קוד" value={nz.code} onChange={e => setNz({ ...nz, code: e.target.value })} maxLength={3} aria-label="קוד אזור" />
          <input placeholder="שם (ארון סלון, מחסן)" value={nz.name} onChange={e => setNz({ ...nz, name: e.target.value })} aria-label="שם אזור" />
          <input placeholder="איפה (חדר הלגו, מחסן)" value={nz.site} onChange={e => setNz({ ...nz, site: e.target.value })} aria-label="מקום" />
          <Swatches value={nz.color} onChange={c => setNz({ ...nz, color: c })} />
          <button type="button" className="btn primary" onClick={addZone}>הוסף אזור</button>
        </div>
      </div>
    </div>
  )
}

function Swatches({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return <div className="swatches">{Object.keys(ZONE_COLORS).map(c => <button type="button" key={c} className={value === c ? 'on' : ''} style={{ background: ZONE_COLORS[c] }} onClick={() => onChange(c)} aria-label={c} />)}</div>
}

function ZoneCard({ zone, shelves, countAt, reload, onLabels }: { zone: Zone; shelves: Location[]; countAt: (c: string) => number; reload: () => void; onLabels: (l: Location[]) => void }) {
  const [z, setZ] = useState(zone)
  const [dirty, setDirty] = useState(false)
  const [add, setAdd] = useState({ n: String((shelves.length ? Math.max(...shelves.map(s => s.shelf || 0)) : 0) + 1), kind: 'shelf', label: '' })
  useEffect(() => { setZ(zone); setDirty(false) }, [zone])
  const total = shelves.reduce((s, l) => s + countAt(l.code), 0)

  async function save() { try { await saveZone(z); toast('נשמר'); setDirty(false); reload() } catch (e) { toast((e as Error).message, true) } }
  async function remove() {
    if (shelves.length) { toast('מחק קודם את המדפים של האזור', true); return }
    try { await deleteZone(zone.code); toast('האזור נמחק'); reload() } catch (e) { toast((e as Error).message, true) }
  }
  async function addShelf() {
    const n = Number(add.n); if (!n) return
    const code = zone.code + n
    if (shelves.some(s => s.code === code)) { toast(code + ' כבר קיים', true); return }
    try {
      await saveLocation({ code, wall: zone.code, shelf: n, kind: add.kind, label: add.label.trim() || `${zone.name} · ${LOC_KINDS[add.kind]} ${n}`, color: zone.color, sort: zone.sort * 10 + n, active: true })
      setAdd({ n: String(n + 1), kind: add.kind, label: '' }); toast(code + ' נוסף'); reload()
    } catch (e) { toast((e as Error).message, true) }
  }
  return (
    <div className="zone">
      <div className="zh">
        <Loc code={zone.code} />
        <input className="nm" value={z.name} onChange={e => { setZ({ ...z, name: e.target.value }); setDirty(true) }} aria-label="שם האזור" />
        <input className="st" value={z.site || ''} placeholder="איפה" onChange={e => { setZ({ ...z, site: e.target.value }); setDirty(true) }} aria-label="מקום" />
        <Swatches value={z.color} onChange={c => { setZ({ ...z, color: c }); setDirty(true) }} />
        <span className="muted">{total} פריטים</span>
        {shelves.some(x => x.active) && <button type="button" className="btn" onClick={() => onLabels(shelves)}>תוויות</button>}
        {dirty && <button type="button" className="btn primary" onClick={save}>שמור</button>}
        {!shelves.length && <button type="button" className="btn danger" onClick={remove}>מחק אזור</button>}
      </div>
      <div className="shelves">
        {shelves.map(s => <Shelf key={s.code} s={s} count={countAt(s.code)} reload={reload} onLabel={() => onLabels([s])} />)}
      </div>
      <div className="addrow">
        <input className="code" value={add.n} onChange={e => setAdd({ ...add, n: e.target.value.replace(/\D/g, '') })} inputMode="numeric" aria-label="מספר" />
        <select value={add.kind} onChange={e => setAdd({ ...add, kind: e.target.value })} aria-label="סוג">{Object.entries(LOC_KINDS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <input placeholder="תיאור (לא חובה)" value={add.label} onChange={e => setAdd({ ...add, label: e.target.value })} aria-label="תיאור" />
        <button type="button" className="btn" onClick={addShelf}>+ הוסף ל{zone.name}</button>
      </div>
    </div>
  )
}

function Shelf({ s, count, reload, onLabel }: { s: Location; count: number; reload: () => void; onLabel: () => void }) {
  const [label, setLabel] = useState(s.label || '')
  useEffect(() => setLabel(s.label || ''), [s.label])
  async function save() { if (label === (s.label || '')) return; try { await saveLocation({ ...s, label }); toast(s.code + ' עודכן') } catch (e) { toast((e as Error).message, true) } }
  async function toggle() { try { await saveLocation({ ...s, active: !s.active }); reload() } catch (e) { toast((e as Error).message, true) } }
  async function remove() {
    if (count > 0) { toast('יש פריטים במדף הזה. העבר אותם קודם.', true); return }
    try { await deleteLocation(s.code); toast(s.code + ' נמחק'); reload() } catch (e) { toast((e as Error).message, true) }
  }
  return (
    <span className={'sh' + (s.active ? '' : ' off')} title={LOC_KINDS[s.kind] || s.kind}>
      <Loc code={s.code} small />
      <input value={label} onChange={e => setLabel(e.target.value)} onBlur={save} aria-label={'תיאור ' + s.code} />
      <b className="num" style={{ fontSize: 11 }}>{count}</b>
      {s.active && <button type="button" onClick={onLabel} title="תווית QR" className="qrb">QR</button>}
      <button type="button" onClick={toggle} title={s.active ? 'השבת' : 'הפעל'}>{s.active ? '◌' : '●'}</button>
      {count === 0 && <button type="button" onClick={remove} title="מחק">×</button>}
    </span>
  )
}

/* ---------- keys ---------- */
function Keys() {
  const [keys, setKeys] = useState({ brickset: '', rebrickable: '' })
  const [have, setHave] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  async function load() { const { data } = await supabase.from('bs_secrets').select('name'); setHave((data || []).map(r => r.name)) }
  useEffect(() => { load() }, [])
  async function save() {
    setBusy(true)
    try {
      const rows = [] as { name: string; value: string }[]
      if (keys.brickset.trim()) rows.push({ name: 'BRICKSET_API_KEY', value: keys.brickset.trim() })
      if (keys.rebrickable.trim()) rows.push({ name: 'REBRICKABLE_API_KEY', value: keys.rebrickable.trim() })
      if (!rows.length) return
      const { error } = await supabase.from('bs_secrets').upsert(rows, { onConflict: 'name' })
      if (error) throw error
      setKeys({ brickset: '', rebrickable: '' }); toast('המפתחות נשמרו'); load()
    } catch (e) { toast((e as Error).message, true) } finally { setBusy(false) }
  }
  return (
    <div className="card" style={{ padding: 16, display: 'grid', gap: 10 }}>
      <div className="eyebrow">מפתחות API</div>
      <p className="muted">נשמרים בבסיס הנתונים, קריאים רק לשרת. שמורים: {have.length ? have.join(', ') : 'אין'}</p>
      <div className="field2">
        <div className="field"><label>Brickset</label><input value={keys.brickset} onChange={e => setKeys({ ...keys, brickset: e.target.value })} placeholder={have.includes('BRICKSET_API_KEY') ? 'שמור. הדבק כדי להחליף' : 'הדבק כאן'} autoComplete="off" /></div>
        <div className="field"><label>Rebrickable</label><input value={keys.rebrickable} onChange={e => setKeys({ ...keys, rebrickable: e.target.value })} placeholder={have.includes('REBRICKABLE_API_KEY') ? 'שמור. הדבק כדי להחליף' : 'הדבק כאן'} autoComplete="off" /></div>
      </div>
      <button className="btn primary" type="button" disabled={busy} onClick={save}>שמור מפתחות</button>
    </div>
  )
}

/* ---------- catalog ---------- */
function Catalog() {
  const [busy, setBusy] = useState(false)
  const [year, setYear] = useState(new Date().getFullYear())
  const [log, setLog] = useState<string[]>([])
  const [count, setCount] = useState<number | null>(null)
  async function load() { const { count } = await supabase.from('bs_catalog').select('*', { count: 'exact', head: true }); setCount(count ?? 0) }
  useEffect(() => { load() }, [])
  async function sync(y: number) {
    setBusy(true); setLog(l => [`${y}: מושך...`, ...l])
    try { const r = await syncYear(y); if ('error' in r) throw new Error(r.error); setLog(l => [`${y}: נשמרו ${r.saved} סטים (${r.pages} קריאות)`, ...l.slice(1)]); load() }
    catch (e) { setLog(l => [`${y}: שגיאה. ${(e as Error).message}`, ...l.slice(1)]) } finally { setBusy(false) }
  }
  async function usage() { try { const u = await keyUsage(); setLog(l => [JSON.stringify(u.apiKeyUsage?.slice?.(0, 3) ?? u), ...l]) } catch (e) { toast((e as Error).message, true) } }
  return (
    <div className="card" style={{ padding: 16, display: 'grid', gap: 10 }}>
      <div className="eyebrow">קטלוג</div>
      <p className="muted">בקטלוג המקומי {count ?? '...'} סטים. סריקת ברקוד מזהה רק סטים שבקטלוג. סטים שמקלידים במספר נמשכים לבד.</p>
      <div className="frow">
        <input type="number" value={year} onChange={e => setYear(Number(e.target.value))} style={{ width: 100, border: '1px solid var(--line-2)', borderRadius: 10, padding: '8px 10px' }} aria-label="שנה" />
        <button className="btn primary" type="button" disabled={busy} onClick={() => sync(year)}>משוך שנה</button>
        <button className="btn" type="button" disabled={busy} onClick={async () => { for (let y = 2017; y >= 2010; y--) await sync(y) }}>משוך 2010 עד 2017</button>
        <button className="btn" type="button" onClick={usage}>מכסת Brickset</button>
      </div>
      {log.length > 0 && <div className="muted" style={{ fontFamily: 'var(--display)', fontSize: 12, direction: 'ltr', textAlign: 'left', whiteSpace: 'pre-wrap' }}>{log.slice(0, 12).join('\n')}</div>}
    </div>
  )
}

/* ---------- pricing ---------- */
function Pricing() {
  const [s, setS] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  useEffect(() => { supabase.from('bs_settings').select('key,value').then(({ data }) => { const o: Record<string, string> = {}; (data || []).forEach(r => { o[r.key] = String(r.value) }); setS(o) }) }, [])
  async function save() {
    setBusy(true)
    try { const rows = Object.entries(s).map(([key, value]) => ({ key, value: isNaN(Number(value)) ? JSON.stringify(value) : Number(value) })); const { error } = await supabase.from('bs_settings').upsert(rows as never, { onConflict: 'key' }); if (error) throw error; toast('ההגדרות נשמרו') }
    catch (e) { toast((e as Error).message, true) } finally { setBusy(false) }
  }
  return (
    <div className="card" style={{ padding: 16, display: 'grid', gap: 10 }}>
      <div className="eyebrow">תמחור</div>
      <div className="field2">
        <div className="field"><label>שער דולר לשקל</label><input value={s.usd_ils || ''} onChange={e => setS({ ...s, usd_ils: e.target.value })} inputMode="decimal" /></div>
        <div className="field"><label>מקדם לסטים שפרשו</label><input value={s.retired_multiplier || ''} onChange={e => setS({ ...s, retired_multiplier: e.target.value })} inputMode="decimal" /></div>
      </div>
      <button className="btn primary" type="button" disabled={busy} onClick={save}>שמור הגדרות</button>
    </div>
  )
}

/* ---------- parts import (BrickLink-format CSV from BrickMonkey, BrickLink or Rebrickable) + labels ---------- */
function PartsImport({ locations, reload }: { locations: Location[]; reload: () => void }) {
  const [file, setFile] = useState<{ name: string; rows: PartRow[]; skipped: number } | null>(null)
  const [loc, setLoc] = useState('')
  const [status, setStatus] = useState<Status>('personal')
  const [mode, setMode] = useState<'set' | 'add'>('set')
  const [busy, setBusy] = useState(false)
  const [res, setRes] = useState<{ inserted: number; updated: number; unchanged: number; new_keys: string[] } | null>(null)
  const [labels, setLabels] = useState<PartLabel[] | null>(null)
  const key = (r: PartRow) => r.part_no + '.' + (r.color_id ?? 0)
  const toLabel = (r: PartRow): PartLabel => ({ id: key(r), part_no: r.part_no, color_id: r.color_id, color_name: r.color_name, name: r.name })

  async function pick(f: File) {
    setRes(null)
    try { const p = parsePartsCsv(await f.text()); if (!p.rows.length) throw new Error('לא נמצאו חלקים בקובץ'); setFile({ name: f.name, ...p }) } catch (e) { setFile(null); toast((e as Error).message, true) }
  }
  async function run() {
    if (!file) return
    setBusy(true)
    try {
      const r = await importParts(file.rows, loc || null, status, mode)
      setRes(r); reload()
      toast(`יובאו ${r.inserted} חדשים, ${r.updated} עודכנו`)
    } catch (e) { toast('הייבוא נכשל: ' + (e as Error).message, true) } finally { setBusy(false) }
  }
  const units = file?.rows.reduce((s, r) => s + r.qty, 0) || 0
  return (
    <div className="card" style={{ padding: 16, display: 'grid', gap: 10 }}>
      <div className="eyebrow">ייבוא חלקים ותוויות</div>
      <p className="muted">קובץ CSV בפורמט של BrickLink (ייצוא מ BrickMonkey, BrickLink או Rebrickable). ייבוא חוזר של אותו אוסף מעדכן כמויות ולא משכפל. אחרי הייבוא: תוויות 50×30 למדפסת NIIMBOT B1.</p>
      <label className="btn" style={{ justifySelf: 'start', cursor: 'pointer' }}>{file ? 'קובץ אחר' : 'בחר קובץ CSV'}<input type="file" accept=".csv,text/csv" hidden onChange={e => { const f = e.target.files?.[0]; if (f) pick(f); e.target.value = '' }} /></label>
      {file && <>
        <div className="import-sum"><b>{file.name}</b><span>{file.rows.length} סוגי חלקים · {units.toLocaleString('en-US')} יחידות{file.skipped ? ` · ${file.skipped} שורות שאינן חלקים דולגו` : ''}</span></div>
        <div className="parts-mini">{file.rows.slice(0, 8).map(r => <span key={key(r)}><img src={r.color_id ? `https://img.bricklink.com/ItemImage/PN/${r.color_id}/${r.part_no}.png` : `https://img.bricklink.com/ItemImage/PL/${r.part_no}.png`} alt="" loading="lazy" onError={e => { (e.target as HTMLImageElement).style.visibility = 'hidden' }} /><small>{r.qty}</small></span>)}{file.rows.length > 8 && <em>+{file.rows.length - 8}</em>}</div>
        <div className="field2">
          <div className="field"><label>מיקום לחלקים חדשים</label><select value={loc} onChange={e => setLoc(e.target.value)}><option value="">ללא מיקום</option>{locations.filter(l => l.active !== false).map(l => <option key={l.code} value={l.code}>{l.code} · {l.label}</option>)}</select></div>
          <div className="field"><label>סטטוס</label><select value={status} onChange={e => setStatus(e.target.value as Status)}>{(['personal', 'sale', 'hold'] as Status[]).map(s => <option key={s} value={s}>{STATUS[s].he}</option>)}</select></div>
        </div>
        <div className="modes">
          <button type="button" className={mode === 'set' ? 'on' : ''} onClick={() => { setMode('set'); setRes(null) }}><b>כל האוסף</b><small>הקובץ הוא כל מה שיש. כמויות של חלקים קיימים נקבעות לפי הקובץ.</small></button>
          <button type="button" className={mode === 'add' ? 'on' : ''} onClick={() => { setMode('add'); setRes(null) }}><b>תוספת</b><small>הקובץ הוא רק מה שנוסף (שקית חדשה). הכמויות מתווספות למה שכבר יש.</small></button>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="btn primary" disabled={busy || !!res} onClick={run}>{busy ? 'מייבא...' : res ? 'יובא' : `ייבא ${file.rows.length} חלקים · ${mode === 'set' ? 'כל האוסף' : 'תוספת'}`}</button>
          {res && res.new_keys.length > 0 && <button type="button" className="btn dark" onClick={() => { const nk = new Set(res.new_keys); setLabels(file.rows.filter(r => nk.has(key(r))).map(toLabel)) }}>תוויות רק לחדשים ({res.new_keys.length})</button>}
          <button type="button" className="btn" onClick={() => setLabels(file.rows.map(toLabel))}>תוויות לכל הקובץ ({file.rows.length})</button>
        </div>
        {res && <div className="import-sum ok"><b>יובא.</b><span>{res.inserted} חדשים · {res.updated} עודכנו · {res.unchanged} ללא שינוי. החלקים בלשונית "חלקים" במלאי. מיקום וסטטוס חלים רק על החדשים.</span></div>}
      </>}
      {labels && <Labels parts={labels} onClose={() => setLabels(null)} />}
    </div>
  )
}
