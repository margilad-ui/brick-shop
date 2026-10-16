/* The box shelf: real LEGO boxes standing on the painted shelf like books, spine out.
   Every box has two renders made from its official front art (OpenArt, keyed to transparent):
   the spine, and the box turned 45 degrees. Hover (or a tap) pulls the box toward you and turns it.
   Click opens the set. Sizes follow the real catalog dimensions. */
import { useEffect, useMemo, useState } from 'react'
import { loadBoxArt, type BoxArt, type ShopItem } from './data'
import { navigate, href } from './router'
import { SB } from '../lib/supabase'

export type ShelfBox = { item: ShopItem; art: BoxArt }
const SHELF_IMG = SB.url + '/storage/v1/object/public/bs-assets/shelf/keyed/shelf-a.png'

/* which sets go on the shelf: live inventory first, then demo; only sets with both renders and real dimensions */
export function useShelf(items: ShopItem[], max = 8) {
  const [art, setArt] = useState<BoxArt[] | null>(null)
  useEffect(() => { if (!max) return; let on = true; loadBoxArt().then(b => { if (on) setArt(b) }); return () => { on = false } }, [max])
  return useMemo<ShelfBox[]>(() => {
    if (!art || !max) return []
    const byNum = new Map(art.filter(a => a.spine_url && a.angle_url).map(a => [a.set_num, a]))
    const out: ShelfBox[] = []; const seen = new Set<string>()
    for (const item of [...items.filter(i => !i.demo), ...items.filter(i => i.demo)]) {
      if (!item.set_num || seen.has(item.set_num)) continue
      const a = byNum.get(item.set_num); const d = item.dims
      if (!a || !d || !d.height) continue
      seen.add(item.set_num); out.push({ item, art: a })
      if (out.length >= max) break
    }
    // tall boxes toward the middle, like a real shelf
    const sorted = [...out].sort((a, b) => (b.item.dims!.height || 0) - (a.item.dims!.height || 0))
    const arranged: ShelfBox[] = []
    sorted.forEach((b, i) => { if (i % 2 === 0) arranged.push(b); else arranged.unshift(b) })
    return arranged
  }, [items, art, max])
}

export function BoxShelf({ boxes }: { boxes: ShelfBox[] }) {
  const [open, setOpen] = useState<string | null>(null)
  // the 45 degree renders are heavier: fetch them quietly once the page has settled (or on the first hover)
  const [warm, setWarm] = useState(false)
  useEffect(() => { const t = setTimeout(() => setWarm(true), 2500); return () => clearTimeout(t) }, [])
  useEffect(() => { if (!open) return; const off = (e: Event) => { if (!(e.target as HTMLElement).closest('.s-bx')) setOpen(null) }; document.addEventListener('pointerdown', off); return () => document.removeEventListener('pointerdown', off) }, [open])
  if (!boxes.length) return null
  return <div className="s-shelf2">
    <div className="s-shelf2-row">
      {boxes.map((b, i) => {
        const d = b.item.dims!
        const style = { ['--h' as string]: `calc(${d.height} * var(--u))`, ['--i' as string]: i } as React.CSSProperties
        return <a key={b.item.id} href={href(`/set/${b.item.set_num}`)} className={`s-bx${open === b.item.id ? ' open' : ''}`} style={style} onPointerEnter={() => setWarm(true)}
          onClick={e => { if (e.metaKey || e.ctrlKey) return; e.preventDefault(); const touch = window.matchMedia('(hover: none)').matches; if (touch && open !== b.item.id) setOpen(b.item.id); else navigate(`/set/${b.item.set_num}`) }}
          aria-label={b.item.name || b.item.set_num || ''}>
          <img className="s-bx-spine" src={b.art.spine_url!} alt="" loading={i < 8 ? 'eager' : 'lazy'} draggable={false} />
          {warm && <img className="s-bx-angle" src={b.art.angle_url!} alt="" draggable={false} />}
          <span className="s-bx-shadow" />
        </a>
      })}
    </div>
    <img className="s-shelf2-wood" src={SHELF_IMG} alt="" draggable={false} />
  </div>
}
