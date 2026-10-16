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
export const LOC_KINDS: Record<string, string> = { shelf: 'מדף', box: 'קופסה', cabinet: 'ארון', drawer: 'מגירה', bin: 'תא', other: 'אחר' }
/* zone registry, filled after load so the Loc pill can colour itself */
export const ZONES: Record<string, Zone> = {}
export function zoneOf(code: string | null | undefined): Zone | undefined { if (!code) return; const z = Object.keys(ZONES).filter(k => code.startsWith(k)).sort((a, b) => b.length - a.length)[0]; return z ? ZONES[z] : undefined }
export type Condition = 'sealed' | 'open' | 'built'
export type Status = 'sale' | 'personal' | 'hold' | 'sold'
export type Kind = 'set' | 'polybag' | 'gear' | 'parts' | 'other'

export type InventoryRow = {
  id: string; kind: Kind; set_num: string | null; number: string | null; name: string | null; theme: string | null; subtheme: string | null
  year: number | null; pieces: number | null; minifigs: number | null; age_min: number | null; image_url: string | null; thumb_url: string | null
  exit_date: string | null; availability: string | null; rrp_us: number | null; catalog_ean: string | null; retired: boolean | null
  location: string | null; wall: string | null; qty: number; condition: Condition; status: Status; price: number | null; price_source: string | null
  tags: string[]; notes: string | null; photo_url: string | null; ean: string | null; created_at: string; updated_at: string
}

export const STATUS: Record<Status, { he: string; cls: string }> = {
  sale: { he: 'למכירה', cls: 't-green' }, personal: { he: 'אישי', cls: 't-blue' }, hold: { he: 'שמור ללקוח', cls: 't-yellow' }, sold: { he: 'נמכר', cls: 't-ink' },
}
export const CONDITION: Record<Condition, string> = { sealed: 'חדש סגור', open: 'פתוח', built: 'בנוי' }
export const KIND: Record<Kind, string> = { set: 'סט', polybag: 'Polybag', gear: 'ציוד', parts: 'חלקים', other: 'אחר' }
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

export type NewItem = { kind: Kind; set_num: string | null; custom_name: string | null; ean: string | null; location: string; qty: number; condition: Condition; status: Status; price: number | null; price_source: string | null; tags: string[]; notes: string | null }

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
