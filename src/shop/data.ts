import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export type ShopItem = {
  id: string; kind: string; set_num: string | null; number: string | null; name: string | null; theme: string | null; subtheme: string | null
  year: number | null; pieces: number | null; minifigs: number | null; age_min: number | null; packaging: string | null; availability: string | null
  launch_date: string | null; exit_date: string | null; rrp_us: number | null; rrp_de: number | null; image_url: string | null; thumb_url: string | null
  dims: { height?: number; width?: number; depth?: number } | null; model_dims: { height?: number; width?: number; depth?: number } | null
  rating: number | null; rating_count: number | null; instructions_count: number | null; additional_images: number | null; catalog_tags: string[] | null
  description_en: string | null; description_he: string | null; retired: boolean | null
  qty: number; condition: string; price: number | null; tags: string[]; photo_url: string | null; created_at: string; updated_at: string; demo: boolean
}
export type CatalogSet = Omit<ShopItem, 'id' | 'kind' | 'qty' | 'condition' | 'price' | 'tags' | 'photo_url' | 'created_at' | 'updated_at' | 'demo' | 'catalog_tags'> & { ean: string | null; tags: string[] | null; age_max: number | null; rrp_uk: number | null }
export type ShopConfig = { shop_demo?: boolean; shop_whatsapp?: string; shop_bit_phone?: string; usd_ils?: number; vat_included?: string | boolean }

export const DEFAULT_WA = '972525000553'
export const DEFAULT_BIT = '0525000553'

/* theme -> brand color token. Everything else falls back to ink. */
export const THEME_COLOR: Record<string, string> = {
  'Harry Potter': 'red', 'Star Wars': 'ink', Disney: 'blue', Botanicals: 'green', City: 'yellow', 'The Lord of the Rings': 'oak', Technic: 'cocoa',
  Creator: 'green', Ideas: 'blue', 'Marvel Super Heroes': 'red', 'DC Comics Super Heroes': 'ink', Friends: 'yellow', Icons: 'oak', Ninjago: 'green',
  'Speed Champions': 'red', Dots: 'yellow', Architecture: 'ink', Classic: 'yellow', Duplo: 'red', Minecraft: 'green', 'Super Mario': 'red',
  'Jurassic World': 'green', Art: 'ink', BrickHeadz: 'yellow', 'Sonic the Hedgehog': 'blue', PlayStation: 'blue', Miscellaneous: 'oak', Seasonal: 'red',
}
export function themeColor(theme: string | null | undefined) { return (theme && THEME_COLOR[theme]) || 'ink' }

let cache: { items: ShopItem[]; config: ShopConfig; at: number } | null = null
let inflight: Promise<{ items: ShopItem[]; config: ShopConfig }> | null = null

export async function loadShop(force = false) {
  if (cache && !force && Date.now() - cache.at < 60_000) return cache
  if (inflight) return inflight
  inflight = (async () => {
    const mock = (window as unknown as { __BS_MOCK?: { items: ShopItem[]; config: ShopConfig } }).__BS_MOCK
    if (mock) { cache = { items: mock.items.map(d => ({ ...d, id: d.demo ? 'demo-' + d.set_num : d.id })), config: mock.config, at: Date.now() }; inflight = null; return cache }
    const [cfgRes, liveRes] = await Promise.all([
      supabase.rpc('bs_shop_config'),
      supabase.from('bs_shop').select('*').order('created_at', { ascending: false }).limit(1000),
    ])
    const config = (cfgRes.data || {}) as ShopConfig
    if (liveRes.error) throw liveRes.error
    let items = (liveRes.data || []) as ShopItem[]
    if (config.shop_demo) {
      const demoRes = await supabase.from('bs_shop_demo').select('*').limit(200)
      const live = new Set(items.map(i => i.set_num))
      const demo = ((demoRes.data || []) as ShopItem[]).filter(d => !live.has(d.set_num))
      // stable id for demo rows (view generates random uuids per query)
      demo.forEach(d => { d.id = 'demo-' + d.set_num })
      items = [...items, ...demo]
    }
    cache = { items, config, at: Date.now() }
    inflight = null
    return cache
  })()
  return inflight
}

export function useShop() {
  const [state, setState] = useState<{ items: ShopItem[]; config: ShopConfig; loading: boolean; error: string | null }>(() => cache ? { ...cache, loading: false, error: null } : { items: [], config: {}, loading: true, error: null })
  useEffect(() => {
    let on = true
    loadShop().then(r => { if (on) setState({ items: r.items, config: r.config, loading: false, error: null }) }).catch(e => { if (on) setState(s => ({ ...s, loading: false, error: (e as Error).message })) })
    return () => { on = false }
  }, [])
  return state
}

export async function loadCatalogSet(set_num: string): Promise<CatalogSet | null> {
  if ((window as unknown as { __BS_MOCK?: unknown }).__BS_MOCK) return null
  const { data } = await supabase.from('bs_shop_catalog').select('*').eq('set_num', set_num).maybeSingle()
  return (data as CatalogSet) || null
}

export type OrderLine = { set_num: string | null; name: string; qty: number; price: number; demo: boolean }
export async function placeOrder(o: { customer_name: string; phone: string; city: string; delivery: 'pickup' | 'delivery'; note: string; items: OrderLine[]; total: number; pay_method: 'bit' | 'whatsapp'; lang: string }) {
  const { data, error } = await supabase.rpc('bs_place_order', { o })
  if (error) throw error
  return data as { number: number; id: string }
}

/* helpers */
export function isNew(i: ShopItem) { return !i.demo && Date.now() - new Date(i.created_at).getTime() < 1000 * 60 * 60 * 24 * 21 }
export function isRare(i: ShopItem) { return /promotional|gwp|gift/i.test(i.subtheme || '') || /promotional|gwp/i.test((i.catalog_tags || []).join(' ')) || (i.number || '').startsWith('40') && (i.pieces || 0) < 500 && !!i.retired }
export function stripHtml(s: string | null | undefined) { if (!s) return ''; const d = document.createElement('div'); d.innerHTML = s; return (d.textContent || '').replace(/\s+/g, ' ').trim() }
export function dims(d: { height?: number; width?: number; depth?: number } | null) { if (!d || !d.width) return ''; return [d.width, d.height, d.depth].filter(Boolean).map(x => Number(x).toFixed(1).replace(/\.0$/, '')).join(' × ') + ' cm' }
export function waLink(number: string, text: string) { return `https://wa.me/${number}?text=${encodeURIComponent(text)}` }

/* official additional images (Brickset), cached in bs_catalog_images */
export type SetImage = { image: string; thumb?: string }
export async function loadImages(set_num: string): Promise<SetImage[]> {
  if ((window as unknown as { __BS_MOCK?: unknown }).__BS_MOCK) return []
  const { data } = await supabase.from('bs_catalog_images').select('images').eq('set_num', set_num).maybeSingle()
  return ((data?.images as SetImage[]) || [])
}
/* turn Brickset's HTML description into readable paragraphs */
export function paragraphs(html: string | null | undefined): string[] {
  const text = stripHtml(html).replace(/\s+/g, ' ').trim()
  if (!text) return []
  const sentences = text.match(/[^.!?]+[.!?]+(\s|$)/g)?.map(s => s.trim()).filter(Boolean) || [text]
  const out: string[] = []
  for (let i = 0; i < sentences.length; i += 2) out.push(sentences.slice(i, i + 2).join(' '))
  return out
}
