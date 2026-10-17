import { useEffect, useMemo, useState } from 'react'
import { CONDITION, Condition, deleteItem, fmtPrice, InventoryRow, Location, Status, STATUS, updateItem, Zone } from '../lib/api'
import { Empty, Loc, Pic, ThemeTag, toast, useMedia } from '../components/Bits'
import { Labels, type PartLabel } from '../labels'

const partLabel = (r: InventoryRow): PartLabel => ({ id: r.id, part_no: r.part_no || r.number || '', color_id: r.color_id, color_name: r.color_name, name: r.name })
export const partKeyOf = (r: { part_no: string | null; color_id: number | null }) => `${r.part_no}.${r.color_id ?? 0}`

type Filters = { loc: string; q: string; status: 'all' | Status; prod: 'all' | 'retired' | 'active'; stock: 'all' | 'in' | 'zero' | 'many'; themes: string[]; walls: string[]; tags: string[]; quick: 'all' | 'retired' | 'zero' | 'noprice' | 'week' }
const F0: Filters = { loc: '', q: '', status: 'all', prod: 'all', stock: 'all', themes: [], walls: [], tags: [], quick: 'all' }
type SortKey = 'number' | 'theme' | 'name' | 'location' | 'qty' | 'price' | 'status' | 'retired' | 'updated_at'

function passes(p: InventoryRow, F: Filters) {
  if (F.loc && p.location !== F.loc) return false
  if (F.q) { const t = F.q.toLowerCase(); if (!`${p.name || ''} ${p.number || ''} ${p.theme || ''} ${p.location || ''} ${p.ean || ''} ${p.catalog_ean || ''} ${p.notes || ''} ${p.part_no || ''} ${p.color_name || ''} ${p.part_cat || ''}`.toLowerCase().includes(t)) return false }
  if (F.status !== 'all' && p.status !== F.status) return false
  if (F.prod === 'retired' && !p.retired) return false
  if (F.prod === 'active' && p.retired) return false
  if (F.stock === 'in' && p.qty < 1) return false
  if (F.stock === 'zero' && p.qty > 0) return false
  if (F.stock === 'many' && p.qty < 5) return false
  if (F.themes.length && !F.themes.includes(p.theme || '')) return false
  if (F.walls.length && !F.walls.includes(p.wall || '?')) return false
  if (F.tags.length && !F.tags.some(t => p.tags?.includes(t))) return false
  if (F.quick === 'retired' && !p.retired) return false
  if (F.quick === 'zero' && p.qty > 0) return false
  if (F.quick === 'noprice' && p.price != null) return false
  if (F.quick === 'week' && Date.now() - new Date(p.created_at).getTime() > 7 * 864e5) return false
  return true
}

export function Inventory({ rows: allRows, locations, zones, reload, openPart, openLoc, onOpened }: { rows: InventoryRow[]; locations: Location[]; zones: Zone[]; reload: () => void; openPart?: string | null; openLoc?: string | null; onOpened?: () => void }) {
  const desktop = useMedia('(min-width: 900px)')
  const [F, setF] = useState<Filters>(F0)
  const [mode, setMode] = useState<'items' | 'parts'>(() => (openPart || localStorage.getItem('bs_invmode') === 'parts') ? 'parts' : 'items')
  const [labels, setLabels] = useState<PartLabel[] | null>(null)
  useEffect(() => { localStorage.setItem('bs_invmode', mode) }, [mode])
  const partsCount = useMemo(() => allRows.filter(r => r.kind === 'parts').length, [allRows])
  const rows = useMemo(() => allRows.filter(r => (mode === 'parts') === (r.kind === 'parts')), [allRows, mode])
  // a scanned label (?p=3001.11) opens that part
  useEffect(() => {
    if (!openPart || !allRows.length) return
    const hit = allRows.find(r => r.kind === 'parts' && partKeyOf(r) === openPart)
    if (hit) { setMode('parts'); setSel(hit) } else toast('החלק מהתווית לא נמצא במלאי', true)
    onOpened?.()
  }, [openPart, allRows]) // eslint-disable-line react-hooks/exhaustive-deps
  // a scanned location label (?loc=K3): show what is inside
  useEffect(() => {
    if (!openLoc || !allRows.length) return
    const here = allRows.filter(r => r.location === openLoc)
    setF({ ...F0, loc: openLoc })
    if (here.length && here.every(r => r.kind === 'parts')) setMode('parts'); else setMode('items')
    onOpened?.()
  }, [openLoc, allRows]) // eslint-disable-line react-hooks/exhaustive-deps
  const locInfo = useMemo(() => {
    if (!F.loc) return null
    const here = allRows.filter(r => r.location === F.loc && r.status !== 'sold')
    const items = here.filter(r => r.kind !== 'parts'), parts = here.filter(r => r.kind === 'parts')
    return { l: locations.find(l => l.code === F.loc), items: items.reduce((s, r) => s + r.qty, 0), itemLines: items.length, parts: parts.reduce((s, r) => s + r.qty, 0), partLines: parts.length }
  }, [F.loc, allRows, locations]) // eslint-disable-line react-hooks/exhaustive-deps
  const [sheet, setSheet] = useState(false)
  const [sel, setSel] = useState<InventoryRow | null>(null)
  const [sortK, setSortK] = useState<SortKey>('updated_at')
  const [sortD, setSortD] = useState<1 | -1>(-1)

  const themes = useMemo(() => { const m: Record<string, number> = {}; rows.forEach(r => { if (r.theme) m[r.theme] = (m[r.theme] || 0) + 1 }); return Object.keys(m).sort().map(k => ({ k, c: m[k] })) }, [rows])
  const tags = useMemo(() => { const m: Record<string, number> = {}; rows.forEach(r => r.tags?.forEach(t => { m[t] = (m[t] || 0) + 1 })); return Object.keys(m).sort().map(k => ({ k, c: m[k] })) }, [rows])
  const walls = useMemo(() => zones.map(z => z.code), [zones])
  const zoneName = (w: string) => zones.find(z => z.code === w)?.name || w
  void locations
  const list = useMemo(() => {
    const l = rows.filter(r => passes(r, F))
    l.sort((a, b) => { let x: unknown = a[sortK], y: unknown = b[sortK]; if (typeof x === 'boolean') { x = x ? 1 : 0; y = y ? 1 : 0 } if (x == null) x = ''; if (y == null) y = ''; if (typeof x === 'string') { x = x.toLowerCase(); y = String(y).toLowerCase() } return ((x as number) > (y as number) ? 1 : (x as number) < (y as number) ? -1 : 0) * sortD })
    return l
  }, [rows, F, sortK, sortD])
  const units = list.reduce((s, r) => s + r.qty, 0), value = list.reduce((s, r) => s + r.qty * (r.price || 0), 0)
  const active = rows.filter(r => r.status !== 'sold')
  const kpi = { units: active.reduce((s, r) => s + r.qty, 0), models: new Set(active.map(r => r.set_num || r.id)).size, value: active.filter(r => r.status === 'sale').reduce((s, r) => s + r.qty * (r.price || 0), 0), retired: active.filter(r => r.retired).length, noprice: active.filter(r => r.price == null && r.status === 'sale').length }
  const fcount = F.themes.length + F.walls.length + F.tags.length + (F.status !== 'all' ? 1 : 0) + (F.prod !== 'all' ? 1 : 0) + (F.stock !== 'all' ? 1 : 0)
  const toggle = (key: 'themes' | 'walls' | 'tags', v: string) => setF(f => ({ ...f, [key]: f[key].includes(v) ? f[key].filter(x => x !== v) : [...f[key], v] }))
  const sortBy = (k: SortKey) => { if (sortK === k) setSortD(d => (d === 1 ? -1 : 1)); else { setSortK(k); setSortD(1) } }

  const filterPane = (
    <>
      <div className="g"><div className="lab">נושא</div><div className="chips">{themes.map(t => <button type="button" key={t.k} className={'chip' + (F.themes.includes(t.k) ? ' on' : '')} onClick={() => toggle('themes', t.k)}>{t.k}<span className="cnt">{t.c}</span></button>)}</div></div>
      <div className="g"><div className="lab">קיר</div><div className="chips">{walls.map(w => <button type="button" key={w} className={'chip' + (F.walls.includes(w) ? ' on' : '')} onClick={() => toggle('walls', w)}><Loc code={w} small />{zoneName(w)}</button>)}</div></div>
      <div className="g"><div className="lab">סטטוס</div><div className="chips"><button type="button" className={'chip' + (F.status === 'all' ? ' on' : '')} onClick={() => setF({ ...F, status: 'all' })}>הכל</button>{(Object.keys(STATUS) as Status[]).map(s => <button type="button" key={s} className={'chip' + (F.status === s ? ' on' : '')} onClick={() => setF({ ...F, status: s })}>{STATUS[s].he}</button>)}</div></div>
      <div className="g"><div className="lab">מצב ייצור</div><div className="chips">{([['all', 'הכל'], ['retired', 'פרש'], ['active', 'בייצור']] as const).map(([v, h]) => <button type="button" key={v} className={'chip' + (F.prod === v ? ' on' : '')} onClick={() => setF({ ...F, prod: v })}>{h}</button>)}</div></div>
      <div className="g"><div className="lab">כמות</div><div className="chips">{([['all', 'הכל'], ['in', 'יש'], ['zero', 'אזל'], ['many', '5 ומעלה']] as const).map(([v, h]) => <button type="button" key={v} className={'chip' + (F.stock === v ? ' on' : '')} onClick={() => setF({ ...F, stock: v })}>{h}</button>)}</div></div>
      {tags.length > 0 && <div className="g"><div className="lab">תגיות</div><div className="chips">{tags.map(t => <button type="button" key={t.k} className={'chip' + (F.tags.includes(t.k) ? ' on' : '')} onClick={() => toggle('tags', t.k)}>{t.k}<span className="cnt">{t.c}</span></button>)}</div></div>}
    </>
  )

  return (
    <div className="page">
      {locInfo && <div className="locbar"><Loc code={F.loc} /><div><b>{locInfo.l?.label || F.loc}</b><small>{locInfo.itemLines ? `${locInfo.items} פריטים (${locInfo.itemLines} שורות)` : 'אין סטים'}{' · '}{locInfo.partLines ? `${locInfo.parts.toLocaleString('en-US')} חלקים (${locInfo.partLines} סוגים)` : 'אין חלקים'}</small></div><button type="button" onClick={() => setF({ ...F, loc: '' })} aria-label="נקה מיקום">✕</button></div>}
      {(partsCount > 0 || mode === 'parts') && <div className="seg"><button type="button" className={mode === 'items' ? 'on' : ''} onClick={() => { setMode('items'); setF({ ...F0, loc: F.loc }) }}>סטים ופריטים</button><button type="button" className={mode === 'parts' ? 'on' : ''} onClick={() => { setMode('parts'); setF({ ...F0, loc: F.loc }) }}>חלקים <span className="cnt">{partsCount}</span></button></div>}
      {mode === 'parts' ? <PartsView rows={rows} q={F.q} setQ={q => setF({ ...F, q })} list={list} onPick={setSel} onLabels={l => setLabels(l.map(partLabel))} /> : <>
      <div className="kp">
        <div><small>פריטים במלאי</small><b>{kpi.units}</b></div>
        <div><small>דגמים</small><b>{kpi.models}</b></div>
        <div><small>שווי למכירה</small><b>{fmtPrice(kpi.value) || '₪ 0'}</b></div>
        {desktop && <div><small>פרשו מייצור</small><b>{kpi.retired}</b></div>}
        {desktop && <div><small>בלי מחיר</small><b>{kpi.noprice}</b></div>}
      </div>
      <div className="srow">
        <label className="search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg><input value={F.q} onChange={e => setF({ ...F, q: e.target.value })} placeholder="שם, מספר, ברקוד, נושא, מדף" aria-label="חיפוש" /></label>
        {!desktop && <button type="button" className="fbtn" onClick={() => setSheet(true)}>סינון{fcount > 0 && <span className="dot">{fcount}</span>}</button>}
        {desktop && <button type="button" className="btn" onClick={() => exportCsv(list)}>ייצוא CSV</button>}
      </div>
      <div className="hscroll">{([['all', 'הכל'], ['retired', 'פרשו מייצור'], ['zero', 'אזל'], ['noprice', 'בלי מחיר'], ['week', 'נוסף השבוע']] as const).map(([v, h]) => <button type="button" key={v} className={'chip y' + (F.quick === v ? ' on' : '')} onClick={() => setF({ ...F, quick: v })}>{h}</button>)}</div>
      {desktop && <div className="card" style={{ padding: 14, display: 'grid', gap: 10 }}>{filterPane}</div>}

      {list.length === 0 ? (
        <div className="card"><Empty title={rows.length ? 'ישנתי על זה. אין פה כלום.' : 'המדפים ריקים בינתיים'} text={rows.length ? 'נקה סינון או נסה חיפוש אחר' : 'עבור ל"הוספה" והתחל לספור'} /></div>
      ) : desktop ? (
        <div className="tablewrap">
          <table className="inv">
            <thead><tr>
              <th style={{ width: 56 }}></th>
              {([['number', 'מספר סט', ''], ['theme', 'נושא', ''], ['name', 'שם הסט', ''], ['location', 'מדף', 'c'], ['qty', 'כמות', 'c'], ['price', 'מחיר', 'l'], ['status', 'סטטוס', ''], ['retired', 'ייצור', '']] as const).map(([k, h, c]) => (
                <th key={k} className={c + (sortK === k ? ' sorted' : '')} onClick={() => sortBy(k)}>{h} <span style={{ fontSize: 9, opacity: .6 }}>{sortK === k ? (sortD > 0 ? '▲' : '▼') : '▲▼'}</span></th>
              ))}
            </tr></thead>
            <tbody>
              {list.map(p => (
                <tr key={p.id} className={sel?.id === p.id ? 'sel' : ''} onClick={() => setSel(p)}>
                  <td><div className="pic"><Pic src={p.thumb_url || p.image_url} fallback={p.number || ''} /></div></td>
                  <td className="setno">{p.number}</td>
                  <td><ThemeTag theme={p.theme} /></td>
                  <td className="name">{p.name}<small>{[p.year, p.pieces && `${p.pieces.toLocaleString('en-US')} חלקים`, p.age_min && `${p.age_min}+`].filter(Boolean).join(' · ')}</small></td>
                  <td className="c"><Loc code={p.location} /></td>
                  <td className={'qty c' + (p.qty ? '' : ' zero')}>{p.qty}</td>
                  <td className="price">{p.price != null ? fmtPrice(p.price) : <span className="tag t-yellow">לתמחר</span>}{p.rrp_us && <small>RRP ${p.rrp_us}</small>}</td>
                  <td><span className={'tag ' + STATUS[p.status].cls}>{STATUS[p.status].he}</span></td>
                  <td>{p.retired ? <span className="tag t-red">פרש {p.exit_date?.slice(0, 4)}</span> : p.set_num ? <span className="tag t-green">בייצור</span> : <span className="tag">{p.kind === 'gear' ? 'ציוד' : p.kind}</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="tfoot"><span>מציג <b>{list.length}</b> שורות · <b>{units}</b> יחידות · שווי <b className="num">{fmtPrice(value) || '₪ 0'}</b></span><span>לחיצה על שורה פותחת את הפריט</span></div>
        </div>
      ) : (
        <div className="rows">
          {list.map(p => (
            <button type="button" className="row" key={p.id} onClick={() => setSel(p)}>
              <div className="pic"><Pic src={p.thumb_url || p.image_url} fallback={p.number || ''} /></div>
              <div style={{ minWidth: 0 }}>
                <div className="n">{p.name}</div>
                <div className="m"><span className="setno">{p.number}</span><ThemeTag theme={p.theme} /><Loc code={p.location} small />{p.retired && <span className="tag t-red">פרש</span>}{p.status !== 'sale' && <span className={'tag ' + STATUS[p.status].cls}>{STATUS[p.status].he}</span>}</div>
              </div>
              <div className="qc"><b className={p.qty ? '' : 'zero'}>{p.qty}</b><small>במלאי</small></div>
              <div className="pr">{p.price != null ? fmtPrice(p.price) : <span className="tag t-yellow">לתמחר</span>}</div>
            </button>
          ))}
          <div className="tfoot" style={{ borderTop: 0 }}><span><b>{list.length}</b> שורות · <b>{units}</b> יחידות</span><span className="num">{fmtPrice(value)}</span></div>
        </div>
      )}

      </>}
      {sheet && !desktop && mode === 'items' && (
        <div className="overlay" onClick={e => { if (e.target === e.currentTarget) setSheet(false) }}>
          <div className="pane">
            <div className="grab" />
            <h4>סינון<button type="button" onClick={() => setF({ ...F0, q: F.q, loc: F.loc })}>נקה הכל</button></h4>
            {filterPane}
            <button className="cta" type="button" onClick={() => setSheet(false)}>הצג {list.length} תוצאות</button>
          </div>
        </div>
      )}

      {sel && <ItemDrawer item={sel} locations={locations} onClose={() => setSel(null)} onChanged={() => { setSel(null); reload() }} onLabel={() => setLabels([partLabel(sel)])} />}
      {labels && <Labels parts={labels} onClose={() => setLabels(null)} />}
    </div>
  )
}

function ItemDrawer({ item, locations, onClose, onChanged, onLabel }: { item: InventoryRow; locations: Location[]; onClose: () => void; onChanged: () => void; onLabel: () => void }) {
  const isPart = item.kind === 'parts'
  const [f, setF] = useState({ location: item.location || '', qty: item.qty, condition: item.condition, status: item.status, price: item.price != null ? String(item.price) : '', tags: (item.tags || []).join(', '), notes: item.notes || '', custom_name: item.set_num ? '' : item.name || '' })
  const [busy, setBusy] = useState(false)
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k) }, [onClose])

  async function save() {
    setBusy(true)
    try {
      const qty = Number(f.qty)
      const patch = { location: f.location || null, qty, condition: f.condition as Condition, status: f.status as Status, price: f.price ? Number(f.price) : null, price_source: f.price && Number(f.price) !== item.price ? 'ידני' : item.price_source, tags: f.tags.split(',').map(s => s.trim()).filter(Boolean), notes: f.notes || null, custom_name: item.set_num ? null : f.custom_name || null }
      const mv = qty !== item.qty ? { delta: qty - item.qty, reason: 'adjust' as const } : (f.location !== item.location ? { delta: 0, reason: 'move' as const, from: item.location, to: f.location } : undefined)
      await updateItem(item.id, patch as never, mv)
      toast('נשמר'); onChanged()
    } catch (e) { toast('לא נשמר: ' + (e as Error).message, true) } finally { setBusy(false) }
  }
  async function sold() {
    if (item.qty < 1) return
    setBusy(true)
    try { await updateItem(item.id, { qty: item.qty - 1, status: item.qty - 1 === 0 ? 'sold' : item.status }, { delta: -1, reason: 'sold' }); toast('נרשמה מכירה'); onChanged() } catch (e) { toast((e as Error).message, true) } finally { setBusy(false) }
  }
  async function remove() {
    setBusy(true)
    try { await deleteItem(item.id); toast('הפריט נמחק'); onChanged() } catch (e) { toast((e as Error).message, true) } finally { setBusy(false) }
  }
  const [confirm, setConfirm] = useState(false)

  return (
    <div className="overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="pane">
        <div className="grab" />
        <h4><span className="ltr num">{item.set_num || item.part_no || item.kind}</span><button type="button" onClick={onClose}>סגור</button></h4>
        <div className="dhero">
          <div className="pic"><Pic src={item.image_url} fallback={item.number || ''} /></div>
          <div>
            <h4>{item.name}</h4>
            <div className="f">{isPart ? [item.color_name, item.part_cat, item.part_no].filter(Boolean).join(' · ') : [item.theme, item.year, item.pieces && `${item.pieces.toLocaleString('en-US')} חלקים`, item.minifigs != null && `${item.minifigs} מיניפיגורות`].filter(Boolean).join(' · ')}</div>
            <div className="chips" style={{ marginTop: 8 }}>{item.retired ? <span className="tag t-red">פרש {item.exit_date?.slice(0, 4)}</span> : item.set_num && <span className="tag t-green">בייצור</span>}<ThemeTag theme={item.theme} /></div>
          </div>
        </div>
        {isPart && <div className="qbig"><button type="button" onClick={() => setF({ ...f, qty: Math.max(0, f.qty - 1) })}>−</button><b>{f.qty}</b><button type="button" onClick={() => setF({ ...f, qty: f.qty + 1 })}>+</button><small>יחידות</small></div>}
        {!item.set_num && <div className="field"><label>שם הפריט</label><input value={f.custom_name} onChange={e => setF({ ...f, custom_name: e.target.value })} /></div>}
        <div className="field2">
          <div className="field"><label>מיקום</label><select value={f.location} onChange={e => setF({ ...f, location: e.target.value })}><option value="">ללא</option>{locations.map(l => <option key={l.code} value={l.code}>{l.code} · {l.label}</option>)}</select></div>
          <div className="field"><label>כמות</label><input type="number" min={0} value={f.qty} onChange={e => setF({ ...f, qty: Number(e.target.value) })} /></div>
        </div>
        <div className="field2">
          <div className="field"><label>מחיר מכירה (₪)</label><input inputMode="decimal" value={f.price} onChange={e => setF({ ...f, price: e.target.value.replace(/[^\d.]/g, '') })} placeholder="לתמחר" /></div>
          <div className="field"><label>סטטוס</label><select value={f.status} onChange={e => setF({ ...f, status: e.target.value as Status })}>{(Object.keys(STATUS) as Status[]).map(s => <option key={s} value={s}>{STATUS[s].he}</option>)}</select></div>
        </div>
        <div className="field2">
          <div className="field"><label>מצב</label><select value={f.condition} onChange={e => setF({ ...f, condition: e.target.value as Condition })}>{(Object.keys(CONDITION) as Condition[]).map(c => <option key={c} value={c}>{CONDITION[c]}</option>)}</select></div>
          <div className="field"><label>תגיות (מופרדות בפסיק)</label><input value={f.tags} onChange={e => setF({ ...f, tags: e.target.value })} placeholder="מתנה, אספנים" /></div>
        </div>
        <div className="field"><label>הערות</label><textarea rows={2} value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} placeholder="מדבקה, פגם באריזה, לקוח שמחכה..." /></div>
        {isPart ? <div className="specs">
          <div className="spec"><span>מספר חלק</span><b>{item.part_no}</b></div>
          <div className="spec"><span>צבע</span><b>{item.color_name || '—'}</b></div>
          <div className="spec"><span>שווי BrickLink ליחידה</span><b>{item.bl_price != null ? `$${item.bl_price}` : '—'}</b></div>
          <div className="spec"><span>סה"כ לפי BrickLink</span><b>{item.bl_price != null ? `$${(item.bl_price * item.qty).toFixed(2)}` : '—'}</b></div>
        </div> : <div className="specs">
          <div className="spec"><span>מחיר מחירון</span><b>{item.rrp_us ? `$${item.rrp_us}` : '—'}</b></div>
          <div className="spec"><span>ברקוד</span><b>{item.catalog_ean || item.ean || '—'}</b></div>
          <div className="spec"><span>מקור המחיר</span><b style={{ fontFamily: 'var(--heb)', direction: 'rtl' }}>{item.price_source || '—'}</b></div>
          <div className="spec"><span>עודכן</span><b>{new Date(item.updated_at).toLocaleDateString('he-IL')}</b></div>
        </div>}
        <div className="dacts">
          <button type="button" className="btn primary" disabled={busy} onClick={save}>שמור</button>
          {isPart ? <button type="button" className="btn dark" onClick={onLabel}>תווית</button> : <button type="button" className="btn dark" disabled={busy || item.qty < 1} onClick={sold}>נמכר אחד</button>}
          {item.set_num && <a className="btn" href={`https://brickset.com/sets/${item.set_num}`} target="_blank" rel="noreferrer">Brickset</a>}
          {isPart && <a className="btn" href={`https://www.bricklink.com/v2/catalog/catalogitem.page?P=${encodeURIComponent(item.part_no || '')}${item.color_id ? `#T=C&C=${item.color_id}` : ''}`} target="_blank" rel="noreferrer">BrickLink</a>}
          {!confirm ? <button type="button" className="btn danger" onClick={() => setConfirm(true)}>מחק</button> : <button type="button" className="btn danger" disabled={busy} onClick={remove}>בטוח? מחק</button>}
        </div>
      </div>
    </div>
  )
}

/* ---------- parts tab ---------- */
function PartsView({ rows, q, setQ, list, onPick, onLabels }: { rows: InventoryRow[]; q: string; setQ: (q: string) => void; list: InventoryRow[]; onPick: (r: InventoryRow) => void; onLabels: (l: InventoryRow[]) => void }) {
  const units = rows.reduce((s, r) => s + r.qty, 0)
  const colors = new Set(rows.map(r => r.color_name).filter(Boolean)).size
  const worth = rows.reduce((s, r) => s + (r.bl_price || 0) * r.qty, 0)
  return <>
    <div className="kp">
      <div><small>סוגי חלקים</small><b>{rows.length}</b></div>
      <div><small>יחידות</small><b>{units.toLocaleString('en-US')}</b></div>
      <div><small>צבעים</small><b>{colors}</b></div>
      <div><small>שווי BrickLink</small><b>${Math.round(worth).toLocaleString('en-US')}</b></div>
    </div>
    <div className="srow">
      <label className="search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg><input value={q} onChange={e => setQ(e.target.value)} placeholder="שם, מספר חלק, צבע, קטגוריה" aria-label="חיפוש חלקים" /></label>
      <button type="button" className="btn" disabled={!list.length} onClick={() => onLabels(list)}>תוויות ({list.length})</button>
    </div>
    {list.length === 0 ? <div className="card"><Empty title={rows.length ? 'אין חלק כזה' : 'עוד אין חלקים'} text={rows.length ? 'נסה חיפוש אחר' : 'הגדרות → ייבוא חלקים'} /></div> : (
      <div className="rows">
        {list.map(p => (
          <button type="button" className="row part" key={p.id} onClick={() => onPick(p)}>
            <div className="pic"><Pic src={p.image_url} fallback={p.part_no || ''} /></div>
            <div style={{ minWidth: 0 }}>
              <div className="n">{p.name}</div>
              <div className="m"><span className="setno">{p.part_no}</span>{p.color_name && p.color_name !== 'Not Selected' && <span className="tag">{p.color_name}</span>}{p.location && <Loc code={p.location} small />}</div>
            </div>
            <div className="qc"><b className={p.qty ? '' : 'zero'}>{p.qty.toLocaleString('en-US')}</b><small>יחידות</small></div>
          </button>
        ))}
      </div>
    )}
  </>
}

function exportCsv(list: InventoryRow[]) {
  const head = ['set_num', 'number', 'name', 'theme', 'year', 'pieces', 'location', 'qty', 'condition', 'status', 'price', 'retired', 'tags', 'notes']
  const esc = (v: unknown) => '"' + String(v ?? '').replace(/"/g, '""') + '"'
  const body = list.map(r => [r.set_num, r.number, r.name, r.theme, r.year, r.pieces, r.location, r.qty, r.condition, r.status, r.price, r.retired ? 'yes' : '', (r.tags || []).join('|'), r.notes].map(esc).join(','))
  const blob = new Blob(['﻿' + [head.join(','), ...body].join('\n')], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `brick-shop-${new Date().toISOString().slice(0, 10)}.csv`; a.click()
}
