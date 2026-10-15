/* The box library: real LEGO boxes standing on the shelf like books, spine out.
   Every box is a real cuboid (CSS 3D) sized from the catalog dimensions, with the official
   box face on the front. Hover (or a tap) pulls the box out and turns it to show the face.
   Click opens the set. */
import { useEffect, useMemo, useState } from 'react'
import { loadBoxes, type BoxFaces, type ShopItem } from './data'
import { navigate, href } from './router'

export type ShelfBox = { item: ShopItem; face: string; kind: 'front' | 'back' | 'prod' }

/* which sets go on the shelf: live inventory first, then demo, only sets with a flat box face and real dimensions */
export function useShelf(items: ShopItem[], max = 8) {
  const [faces, setFaces] = useState<BoxFaces[] | null>(null)
  useEffect(() => { let on = true; loadBoxes().then(b => { if (on) setFaces(b) }); return () => { on = false } }, [])
  return useMemo<ShelfBox[]>(() => {
    if (!faces || !max) return []
    const byNum = new Map(faces.map(f => [f.set_num, f]))
    const out: ShelfBox[] = []
    const seen = new Set<string>()
    for (const item of [...items.filter(i => !i.demo), ...items.filter(i => i.demo)]) {
      if (!item.set_num || seen.has(item.set_num)) continue
      const f = byNum.get(item.set_num); const d = item.dims
      if (!f || !d || !d.width || !d.height || !d.depth || d.height > 40) continue
      const face = f.front || f.back || f.prod; if (!face) continue
      seen.add(item.set_num)
      out.push({ item, face, kind: f.front ? 'front' : f.back ? 'back' : 'prod' })
      if (out.length >= max) break
    }
    // a pleasing order: tall ones toward the middle, like a real shelf
    const sorted = [...out].sort((a, b) => (b.item.dims!.height || 0) - (a.item.dims!.height || 0))
    const arranged: ShelfBox[] = []
    sorted.forEach((b, i) => { if (i % 2 === 0) arranged.push(b); else arranged.unshift(b) })
    return arranged
  }, [items, faces, max])
}

export function BoxShelf({ boxes, unit = 6.4 }: { boxes: ShelfBox[]; unit?: number }) {
  const [open, setOpen] = useState<string | null>(null)
  useEffect(() => { if (!open) return; const off = (e: Event) => { if (!(e.target as HTMLElement).closest('.s-book')) setOpen(null) }; document.addEventListener('pointerdown', off); return () => document.removeEventListener('pointerdown', off) }, [open])
  if (!boxes.length) return null
  return <div className="s-lib" style={{ ['--u' as string]: `${unit}px` }}>
    <div className="s-lib-row">
      {boxes.map((b, i) => {
        const d = b.item.dims!
        const style = { ['--w' as string]: `calc(${d.depth} * var(--u))`, ['--h' as string]: `calc(${d.height} * var(--u))`, ['--d' as string]: `calc(${d.width} * var(--u))`, ['--i' as string]: i, ['--face' as string]: `url("${b.face}")` } as React.CSSProperties
        const url = href(`/set/${b.item.set_num}`)
        const thin = (d.depth || 0) * unit < 46
        return <a key={b.item.id} href={url} className={`s-book${open === b.item.id ? ' open' : ''}${thin ? ' thin' : ''} k-${b.kind}`} style={style}
          onClick={e => { if (e.metaKey || e.ctrlKey) return; e.preventDefault(); const touch = window.matchMedia('(hover: none)').matches; if (touch && open !== b.item.id) setOpen(b.item.id); else navigate(`/set/${b.item.set_num}`) }}
          aria-label={b.item.name || b.item.set_num || ''}>
          <span className="s-book-spine">
            {!thin && b.item.image_url && <span className="s-book-thumb"><img src={b.item.image_url} alt="" loading="lazy" /></span>}
            <span className="s-book-name">{b.item.name}</span>
            <span className="s-book-num ltr">{b.item.number || b.item.set_num?.replace(/-1$/, '')}</span>
            {!thin && b.item.pieces && <span className="s-book-pcs ltr">{b.item.pieces.toLocaleString()} pcs</span>}
          </span>
          <span className="s-book-face" />
          <span className="s-book-top" />
          <span className="s-book-shadow" />
        </a>
      })}
    </div>
  </div>
}
