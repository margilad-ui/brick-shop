import { useEffect, useRef } from 'react'
import { reducedMotion } from './joey'

/* Gentle brick rain for the hero: a handful of 2x4 bricks drifting down behind the content.
   Click anywhere in the hero to drop one more where you clicked. */
const COLORS = ['#D3382F', '#1F6FC9', '#1E9A5B', '#FAF8F4', '#D3382F', '#1F6FC9']
type B = { x: number; y: number; w: number; vy: number; vx: number; rot: number; vr: number; c: string; d: number }

export function BrickRain({ count = 13 }: { count?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current!; const ctx = canvas.getContext('2d')!
    let W = 0, H = 0, raf = 0, alive = true
    const bricks: B[] = []
    const still = reducedMotion()
    const mk = (y?: number, x?: number): B => { const d = 0.5 + Math.random(); return { x: x ?? Math.random() * W, y: y ?? -40 - Math.random() * H, w: 26 + d * 22, vy: (0.25 + d * 0.45), vx: (Math.random() - .5) * 0.15, rot: Math.random() * Math.PI, vr: (Math.random() - .5) * 0.006, c: COLORS[Math.floor(Math.random() * COLORS.length)], d } }
    const resize = () => { const r = canvas.parentElement!.getBoundingClientRect(); W = canvas.width = Math.floor(r.width * devicePixelRatio); H = canvas.height = Math.floor(r.height * devicePixelRatio); canvas.style.width = r.width + 'px'; canvas.style.height = r.height + 'px' }
    resize(); for (let i = 0; i < count; i++) bricks.push(mk(Math.random() * H))
    const draw = (b: B) => {
      const s = devicePixelRatio * b.d; const w = b.w * s, h = w * 0.5
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.rot); ctx.globalAlpha = 0.82
      ctx.fillStyle = b.c; ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 3 * s); ctx.fill()
      // studs
      ctx.fillStyle = 'rgba(255,255,255,.28)'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.ellipse(-w / 2 + w * (i + .5) / 4, -h / 2 - 1.5 * s, w / 11, 2.2 * s, 0, 0, Math.PI * 2); ctx.fill() }
      ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.fillRect(-w / 2, h / 2 - 3 * s, w, 3 * s)
      ctx.restore()
    }
    const tick = () => {
      if (!alive) return
      ctx.clearRect(0, 0, W, H)
      for (const b of bricks) {
        if (!still) { b.y += b.vy * devicePixelRatio * 1.2; b.x += b.vx * devicePixelRatio; b.rot += b.vr; if (b.y > H + 60) Object.assign(b, mk(-60)) }
        draw(b)
      }
      if (!still) raf = requestAnimationFrame(tick)
    }
    tick()
    const click = (e: MouseEvent) => { const r = canvas.getBoundingClientRect(); bricks.push(mk((e.clientY - r.top) * devicePixelRatio, (e.clientX - r.left) * devicePixelRatio)); if (bricks.length > count + 12) bricks.shift(); if (still) tick() }
    const sec = canvas.parentElement!; sec.addEventListener('click', click)
    const ro = new ResizeObserver(resize); ro.observe(sec)
    return () => { alive = false; cancelAnimationFrame(raf); ro.disconnect(); sec.removeEventListener('click', click) }
  }, [count])
  return <canvas ref={ref} className="s-rain" aria-hidden="true" />
}
