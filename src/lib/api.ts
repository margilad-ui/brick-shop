import { supabase } from './supabase'

export type CatalogSet = {
  set_num: string; number: string; variant: number; name: string; year: number | null; theme: string | null; subtheme: string | null
  pieces: number | null; minifigs: number | null; age_min: number | null; packaging: string | null; availability: string | null
  launch_date: string | null; exit_date: string | null; rrp_us: number | null; rrp_uk: number | null; rrp_de: number | null
  image_url: string | null; thumb_url: string | null; ean: string | null; upc: string | null; dims: { height?: number; width?: number; depth?: number } | null
  rating: number | null; rating_count: number | null; instructions_count: number | null; description_en: string | null; description_he: string | null
}
export type Lookup =
  | { found: true; source: 'catalog' | 'brickset'; set: CatalogSet; suggested: { price: number | null; source: string } }
  | { found: false; reason: 'barcode_unknown' | 'set_unknown'; q: string }
  | { error: string }

export type Location = { code: string; wall: string; shelf: number | null; label: string | null; color: string | null; sort: number; kind: string; active: boolean }
export type Zone = { code: string; name: string; color: string; site: string | null; sort: number }
export const ZONE_COLORS: Record<string, string> = { red: 'var(--red)', blue: 'var(--blue)', green: 'var(--green)', yellow: 'var(--yellow)', cocoa: 'var(--cocoa)', oak: 'var(--oak)', ink: 'var(--ink)', stone: 'var(--stone)' }
export const LOC_KINDS: Record<string, string> = { shelf: 'מדף', cube: 'קובייה', box: 'קופסה', cabinet: 'ארון', drawer: 'מגירה', bin: 'תא', other: 'אחר' }
/* zone registry, filled after load so the Loc pill can colour itself */
export const ZONES: Record<string, Zone> = {}
export function zoneOf(code: string | null | undefined): Zone | undefined { if (!code) return; const z = Object.keys(ZONES).filter(k => code.startsWith(k)).sort((a, b) => b.length - a.length)[0]; return z ? ZONES[z] : undefined }
export type Condition = 'sealed' | 'open' | 'built'
export type Status = 'sale' | 'personal' | 'hold' | 'sold'
export type Kind = 'set' | 'polybag' | 'gear' | 'book' | 'magazine' | 'parts' | 'other'

export type InventoryRow = {
  id: string; kind: Kind; set_num: string | null; number: string | null; name: string | null; theme: string | null; subtheme: string | null
  year: number | null; pieces: number | null; minifigs: number | null; age_min: number | null; image_url: string | null; thumb_url: string | null
  exit_date: string | null; availability: string | null; rrp_us: number | null; catalog_ean: string | null; retired: boolean | null
  location: string | null; wall: string | null; qty: number; condition: Condition; status: Status; price: number | null; price_source: string | null
  tags: string[]; notes: string | null; photo_url: string | null; ean: string | null; created_at: string; updated_at: string
  part_no: string | null; color_id: number | null; color_name: string | null; part_cat: string | null; bl_price: number | null
}

export const STATUS: Record<Status, { he: string; cls: string }> = {
  sale: { he: 'למכירה', cls: 't-green' }, personal: { he: 'אישי', cls: 't-blue' }, hold: { he: 'שמור ללקוח', cls: 't-yellow' }, sold: { he: 'נמכר', cls: 't-ink' },
}
export const CONDITION: Record<Condition, string> = { sealed: 'חדש סגור', open: 'פתוח', built: 'בנוי' }
export const KIND: Record<Kind, string> = { set: 'סט', polybag: 'Polybag', gear: 'אביזר', book: 'ספר', magazine: 'עיתון', parts: 'חלקים', other: 'אחר' }
const THEME_CLS: Record<string, string> = { 'Harry Potter': 't-red', 'Star Wars': 't-ink', Disney: 't-blue', Botanicals: 't-green', City: 't-yellow', 'The Lord of the Rings': 't-oak', Technic: 't-cocoa', Creator: 't-green', Ideas: 't-blue', Marvel: 't-red', Friends: 't-yellow', Icons: 't-oak', Ninjago: 't-green', Speed: 't-red', DOTS: 't-yellow', Architecture: 't-ink', Classic: 't-yellow', Duplo: 't-red' }
export function themeCls(t: string | null) { return (t && THEME_CLS[t]) || 't-ink' }
export function fmtPrice(x: number | null | undefined) { return x == null ? '' : '₪ ' + Math.round(x).toLocaleString('en-US') }

export async function lookup(q: string): Promise<Lookup> {
  const { data, error } = await supabase.functions.invoke('catalog', { body: { action: 'lookup', q } })
  if (error) return { error: error.message || 'שגיאת חיפוש' }
  return data as Lookup
}
export async function syncYear(year: number) {
  const { data, error } = await supabase.functions.invoke('catalog', { body: { action: 'sync', year } })
  if (error) throw new Error(error.message)
  return data as { ok: boolean; year: number; matches: number; saved: number; pages: number } | { error: string }
}
export async function keyUsage() {
  const { data, error } = await supabase.functions.invoke('catalog', { body: { action: 'usage' } })
  if (error) throw new Error(error.message)
  return data
}

export async function loadLocations(): Promise<Location[]> {
  const { data, error } = await supabase.from('bs_locations').select('*').order('sort')
  if (error) throw error
  return data as Location[]
}
export async function loadZones(): Promise<Zone[]> {
  const { data, error } = await supabase.from('bs_zones').select('*').order('sort')
  if (error) throw error
  Object.keys(ZONES).forEach(k => delete ZONES[k]); (data as Zone[]).forEach(z => { ZONES[z.code] = z })
  return data as Zone[]
}
export async function saveZone(z: Zone) { const { error } = await supabase.from('bs_zones').upsert(z, { onConflict: 'code' }); if (error) throw error }
export async function deleteZone(code: string) { const { error } = await supabase.from('bs_zones').delete().eq('code', code); if (error) throw error }
export async function saveLocation(l: Partial<Location> & { code: string; wall: string }) { const { error } = await supabase.from('bs_locations').upsert(l, { onConflict: 'code' }); if (error) throw error }
export async function deleteLocation(code: string) { const { error } = await supabase.from('bs_locations').delete().eq('code', code); if (error) throw error }
export async function loadInventory(): Promise<InventoryRow[]> {
  const { data, error } = await supabase.from('bs_inventory').select('*').order('updated_at', { ascending: false }).limit(5000)
  if (error) throw error
  return data as InventoryRow[]
}
export type StockLine = { id: string; location: string | null; qty: number; condition: Condition; status: Status; price: number | null }
export async function stockOf(set_num: string): Promise<StockLine[]> {
  const { data } = await supabase.from('bs_items').select('id,location,qty,condition,status,price').eq('set_num', set_num).neq('status', 'sold').gt('qty', 0).order('created_at')
  return (data || []) as StockLine[]
}
export async function shelfCount(code: string): Promise<number> {
  const { data, error } = await supabase.from('bs_items').select('qty').eq('location', code).neq('status', 'sold')
  if (error) return 0
  return (data || []).reduce((s, r) => s + (r.qty || 0), 0)
}

export type NewItem = { kind: Kind; set_num: string | null; custom_name: string | null; ean: string | null; location: string; qty: number; condition: Condition; status: Status; price: number | null; price_source: string | null; tags: string[]; notes: string | null; photo_url?: string | null }

/* existing lines of a manual item, matched by barcode (set_num is null for those) */
export async function stockOfEan(ean: string): Promise<StockLine[]> {
  const { data } = await supabase.from('bs_items').select('id,location,qty,condition,status,price').is('set_num', null).eq('ean', ean).order('created_at')
  return (data || []) as StockLine[]
}

/* shrink a phone photo to max 1400px (JPEG) before upload, then store it through the photo function */
export async function uploadPhoto(file: File): Promise<string> {
  const small = await shrink(file, 1400)
  const fd = new FormData(); fd.append('file', small, 'item.jpg')
  const { data, error } = await supabase.functions.invoke('photo', { body: fd })
  if (error) throw new Error(error.message || 'העלאת התמונה נכשלה')
  if (!data?.url) throw new Error(data?.error || 'העלאת התמונה נכשלה')
  return data.url as string
}
/* a product picture from a shop page: the server copies it into our storage */
export async function importPhotoUrl(url: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke('photo', { body: { url } })
  if (error) throw new Error(error.message || 'העתקת התמונה נכשלה')
  if (!data?.url) throw new Error(data?.error || 'העתקת התמונה נכשלה')
  return data.url as string
}
async function shrink(file: File, max: number): Promise<Blob> {
  const bmp = await createImageBitmap(file).catch(() => null)
  if (!bmp) return file
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height))
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k)
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height)
  return await new Promise<Blob>(res => c.toBlob(b => res(b || file), 'image/jpeg', 0.86))
}

/* how a scan of a set that is already in stock is saved:
   mergeInto = add the quantity to that existing line (its shelf, its condition), forceNew = always open a new line,
   neither = the old default: merge when the same set sits on the same shelf in the same condition and status, otherwise a new line */
export async function addItem(n: NewItem, opts: { mergeInto?: string; forceNew?: boolean } = {}) {
  let existing = null as null | { id: string; qty: number; location?: string | null }
  if (opts.mergeInto) {
    const { data } = await supabase.from('bs_items').select('id,qty,location').eq('id', opts.mergeInto).maybeSingle()
    if (!data) throw new Error('השורה הקיימת לא נמצאה')
    existing = data
  } else if (n.set_num && !opts.forceNew) {
    const { data } = await supabase.from('bs_items').select('id,qty').eq('set_num', n.set_num).eq('location', n.location).eq('condition', n.condition).eq('status', n.status).limit(1)
    existing = data?.[0] || null
  }
  if (existing) {
    const target = existing.location ?? n.location
    const { error } = await supabase.from('bs_items').update({ qty: existing.qty + n.qty, price: n.price ?? undefined, price_source: n.price_source ?? undefined }).eq('id', existing.id)
    if (error) throw error
    await supabase.from('bs_movements').insert({ item_id: existing.id, set_num: n.set_num, delta: n.qty, reason: 'add', to_location: target })
    return { id: existing.id, merged: true, qty: existing.qty + n.qty, location: target }
  }
  const { data, error } = await supabase.from('bs_items').insert(n).select('id').single()
  if (error) throw error
  await supabase.from('bs_movements').insert({ item_id: data.id, set_num: n.set_num, delta: n.qty, reason: 'add', to_location: n.location })
  return { id: data.id as string, merged: false, qty: n.qty, location: n.location }
}

export async function updateItem(id: string, patch: Partial<NewItem> & { qty?: number }, movement?: { delta: number; reason: 'sold' | 'move' | 'adjust' | 'remove'; from?: string | null; to?: string | null; note?: string }) {
  const { error } = await supabase.from('bs_items').update(patch).eq('id', id)
  if (error) throw error
  if (movement) await supabase.from('bs_movements').insert({ item_id: id, delta: movement.delta, reason: movement.reason, from_location: movement.from ?? null, to_location: movement.to ?? null, note: movement.note ?? null })
}
export async function deleteItem(id: string) {
  const { error } = await supabase.from('bs_items').delete().eq('id', id)
  if (error) throw error
}

/* offline queue: adds that failed because of network are kept and retried */
const QKEY = 'bs_queue'
export function queueAdd(n: NewItem) { try { const q = JSON.parse(localStorage.getItem(QKEY) || '[]'); q.push(n); localStorage.setItem(QKEY, JSON.stringify(q)) } catch { /* ignore */ } }
export function queued(): NewItem[] { try { return JSON.parse(localStorage.getItem(QKEY) || '[]') } catch { return [] } }
export async function flushQueue(): Promise<number> {
  const q = queued(); if (!q.length) return 0
  const rest: NewItem[] = []; let done = 0
  for (const n of q) { try { await addItem(n); done++ } catch { rest.push(n) } }
  localStorage.setItem(QKEY, JSON.stringify(rest))
  return done
}

/* ---------- parts (BrickLink format collection export: BrickMonkey, BrickLink, Rebrickable) ---------- */
export type PartRow = { part_no: string; color_id: number | null; color_name: string; name: string; cat: string; qty: number; cond: string; bl_price: number | null; note: string }

/** parse a CSV export in BrickLink column names (ITEMTYPE, ITEMID, COLOR, COLORNAME, ITEMNAME, PARTCATEGORYNAME, QTY, CONDITION, PRICE, DESCRIPTION) */
export function parsePartsCsv(text: string): { rows: PartRow[]; skipped: number } {
  const recs = csvRecords(text.replace(/^\uFEFF/, ''))
  if (!recs.length) return { rows: [], skipped: 0 }
  const head = recs[0].map(h => h.trim().toUpperCase())
  const col = (...names: string[]) => names.map(n => head.indexOf(n)).find(i => i >= 0) ?? -1
  const c = { type: col('ITEMTYPE'), id: col('ITEMID', 'PART', 'PART_NUM'), color: col('COLOR', 'COLOR_ID'), cname: col('COLORNAME'), name: col('ITEMNAME', 'NAME'), cat: col('PARTCATEGORYNAME', 'CATEGORY'), qty: col('QTY', 'QUANTITY'), cond: col('CONDITION'), price: col('PRICE'), desc: col('DESCRIPTION', 'REMARKS') }
  if (c.id < 0 || c.qty < 0) throw new Error('הקובץ לא בפורמט של BrickLink (חסרות עמודות ITEMID ו QTY)')
  const rows: PartRow[] = []; let skipped = 0
  for (const r of recs.slice(1)) {
    const get = (i: number) => (i >= 0 ? (r[i] || '').trim() : '')
    const type = get(c.type).toUpperCase()
    const id = get(c.id)
    if (!id || (type && type !== 'P')) { if (id) skipped++; continue }
    const colorId = get(c.color) === '' ? null : Number(get(c.color))
    rows.push({ part_no: id, color_id: Number.isFinite(colorId as number) ? colorId : null, color_name: get(c.cname), name: get(c.name), cat: get(c.cat), qty: Math.max(0, Math.round(Number(get(c.qty)) || 0)), cond: get(c.cond).toUpperCase() || 'N', bl_price: get(c.price) ? Number(get(c.price)) : null, note: get(c.desc) })
  }
  // the same part and colour twice in one file: add the quantities
  const m = new Map<string, PartRow>()
  for (const r of rows) { const k = r.part_no + '|' + (r.color_id ?? -1); const x = m.get(k); if (x) x.qty += r.qty; else m.set(k, { ...r }) }
  return { rows: [...m.values()], skipped }
}
function csvRecords(text: string): string[][] {
  const out: string[][] = []; let row: string[] = [], f = '', q = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { f += '"'; i++ } else q = false } else f += ch }
    else if (ch === '"') q = true
    else if (ch === ',') { row.push(f); f = '' }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(f); f = ''; if (row.some(x => x !== '')) out.push(row); row = [] }
    else f += ch
  }
  row.push(f); if (row.some(x => x !== '')) out.push(row)
  return out
}
export async function importParts(rows: PartRow[], location: string | null, status: Status = 'personal') {
  const { data, error } = await supabase.rpc('bs_import_parts', { p_rows: rows, p_location: location, p_status: status })
  if (error) throw new Error(error.message)
  return data as { inserted: number; updated: number; unchanged: number; ids: string[] }
}
