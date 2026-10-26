/* Location labels (shelves, boxes, cubes): a QR that opens the inventory filtered to that place.
   Three ready templates, all 1-bit at 203 dpi (8 dots per mm):
   - box 50 x 70 mm (portrait): big code, name, QR
   - round 31 mm: QR and the code under it (cube doors)
   - round 50 mm: the same, bigger, with the name
   Round stickers are transparent: only black prints, so the surface under them must be light for the QR to scan. */
import qrcode from 'qrcode-generator'
import type { Template } from './LabelSheet'

export type LocLabel = { code: string; label: string | null; kind: string; kindName: string; zoneName: string | null }

export function locUrl(code: string) {
  const base = import.meta.env.BASE_URL || '/'
  return `${location.origin}${base}?loc=${encodeURIComponent(code)}`
}

async function fonts() {
  try { await Promise.all([document.fonts.load('900 40px Montserrat'), document.fonts.load('800 20px Montserrat'), document.fonts.load('700 20px Heebo')]) } catch { /* system fonts */ }
}
function canvas(w: number, h: number) {
  const c = document.createElement('canvas'); c.width = w; c.height = h
  const g = c.getContext('2d')!
  g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.fillStyle = '#000'
  return { c, g }
}
/** draws the QR with whole-dot modules, centred on (cx, cy), no larger than max dots. Returns its size */
function drawQr(g: CanvasRenderingContext2D, text: string, cx: number, cy: number, max: number, quiet = 1) {
  const qr = qrcode(0, 'M'); qr.addData(text); qr.make()
  let n = qr.getModuleCount(), m = Math.floor(max / (n + quiet * 2))
  if (m < 3) { const q = qrcode(0, 'L'); q.addData(text); q.make(); n = q.getModuleCount(); m = Math.max(2, Math.floor(max / (n + quiet * 2))); return paint(q, n, m) }
  return paint(qr, n, m)
  function paint(q: ReturnType<typeof qrcode>, n: number, m: number) {
    const size = (n + quiet * 2) * m
    const x0 = Math.round(cx - size / 2), y0 = Math.round(cy - size / 2)
    g.fillStyle = '#fff'; g.fillRect(x0, y0, size, size); g.fillStyle = '#000'
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) g.fillRect(x0 + (c + quiet) * m, y0 + (r + quiet) * m, m, m)
    return size
  }
}
function fit(g: CanvasRenderingContext2D, text: string, font: (s: number) => string, start: number, min: number, maxW: number) {
  let s = start
  for (; s > min; s--) { g.font = font(s); if (g.measureText(text).width <= maxW) break }
  g.font = font(s)
  return s
}
function wrapRtl(g: CanvasRenderingContext2D, text: string, maxW: number, maxLines: number) {
  const words = text.split(/\s+/).filter(Boolean), lines: string[] = []
  let cur = ''
  for (const w of words) { const t = cur ? cur + ' ' + w : w; if (g.measureText(t).width <= maxW || !cur) cur = t; else { lines.push(cur); cur = w } }
  if (cur) lines.push(cur)
  if (lines.length > maxLines) { const k = lines.slice(0, maxLines); k[maxLines - 1] += '…'; return k }
  return lines
}
function brand(g: CanvasRenderingContext2D, cx: number, y: number, size: number) {
  // BR + four studs + CK HOUSE, the wordmark in one colour
  g.font = `800 ${size}px Montserrat, Arial, sans-serif`; g.textBaseline = 'middle'; g.textAlign = 'left'; g.direction = 'ltr'
  const a = 'BR', b = 'CK HOUSE', sp = size * 0.14
  const wa = g.measureText(a).width, wb = g.measureText(b).width, ws = size * 0.62
  const total = wa + ws + wb + sp * 2
  let x = cx - total / 2
  g.fillText(a, x, y); x += wa + sp
  const bh = size * 0.17, gap = size * 0.05
  for (let i = 0; i < 4; i++) g.fillRect(Math.round(x), Math.round(y - size * 0.42 + i * (bh + gap)), Math.round(ws), Math.max(1, Math.round(bh)))
  x += ws + sp
  g.fillText(b, x, y)
}
function oneBit(c: HTMLCanvasElement) {
  const g = c.getContext('2d')!
  const im = g.getImageData(0, 0, c.width, c.height)
  for (let i = 0; i < im.data.length; i += 4) { const v = im.data[i] < 128 ? 0 : 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255 }
  g.putImageData(im, 0, 0)
  return c
}
const MONT = (w: number) => (s: number) => `${w} ${s}px Montserrat, Arial, sans-serif`
const HEB = (w: number) => (s: number) => `${w} ${s}px Heebo, Arial, sans-serif`
const descr = (l: LocLabel) => (l.label || '').replace(new RegExp(`\\s*${l.code}\\s*`), ' ').replace(/\s*·\s*$/, '').replace(/^\s*·\s*/, '').trim()

/* ---------- box 50 x 70 ---------- */
async function box(l: LocLabel) {
  await fonts()
  const W = 384, H = 560
  const { c, g } = canvas(W, H)
  brand(g, W / 2, 30, 22)
  g.fillRect(24, 54, W - 48, 3)
  // the code, as big as it fits
  g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.direction = 'ltr'
  const s = fit(g, l.code, MONT(900), 190, 60, W - 40)
  g.fillText(l.code, W / 2, 70 + s * 0.78)
  let y = 70 + s * 0.78 + 22
  // what it is and what is inside (the location's description from Settings)
  g.direction = 'rtl'; g.textBaseline = 'top'
  const d = descr(l)
  const kind = [l.kindName, l.zoneName].filter(Boolean).join(' · ')
  g.font = HEB(700)(24)
  const lines = d ? wrapRtl(g, d, W - 48, 2) : []
  for (const ln of lines) { g.fillText(ln, W / 2, y); y += 31 }
  g.font = HEB(400)(19)
  if (kind && kind !== d) { g.fillText(kind, W / 2, y + 2); y += 26 }
  // the QR fills what is left
  const room = H - 14 - (y + 8)
  const size = drawQr(g, locUrl(l.code), W / 2, y + 8 + room / 2, Math.min(260, room))
  void size
  return { canvas: oneBit(c) }
}

/* ---------- round 31 mm ---------- */
async function round31(l: LocLabel) {
  await fonts()
  const D = 248
  const { c, g } = canvas(D, D)
  drawQr(g, locUrl(l.code), D / 2, 104, 128, 1)
  g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.direction = 'ltr'
  fit(g, l.code, MONT(900), 40, 20, 120)
  g.fillText(l.code, D / 2, 208)
  return { canvas: oneBit(c) }
}

/* ---------- round 50 mm ---------- */
async function round50(l: LocLabel) {
  await fonts()
  const W = 384, H = 400, cy = H / 2
  const { c, g } = canvas(W, H)
  brand(g, W / 2, 44, 17)
  drawQr(g, locUrl(l.code), W / 2, 166, 216, 1)
  g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.direction = 'ltr'
  fit(g, l.code, MONT(900), 62, 28, 200)
  g.fillText(l.code, W / 2, 326)
  const d = descr(l)
  if (d) {
    g.direction = 'rtl'
    const half = Math.sqrt(Math.max(0, 196 * 196 - (356 - cy) ** 2)) // chord half-width at the text line
    fit(g, d, HEB(700), 20, 13, half * 2 - 24)
    g.fillText(d, W / 2, 356)
  }
  return { canvas: oneBit(c) }
}

/* ---------- shelf strip 50 x 12 (NIIMBOT D110, transparent) ----------
   Drawn as the label is read: 400 x 96 dots. The D110 head is 96 dots wide (12 mm), the library turns the image.
   1 mm margin top and bottom, 2 mm at the ends. The QR is short on purpose: HTTPS://HOST/L/A3 in capitals is
   alphanumeric mode, so it fits version 2 (25 modules) at 3 dots a module, about 10 mm. main.tsx reads /L/<code>. */
export function shortLocUrl(code: string) {
  const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '')
  return `${location.origin}${base}/L/${code}`.toUpperCase()
}
function qrAlnum(g: CanvasRenderingContext2D, text: string, x0: number, y0: number, m: number) {
  const q = qrcode(0, 'L'); q.addData(text, 'Alphanumeric'); q.make()
  const n = q.getModuleCount()
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) g.fillRect(x0 + c * m, y0 + r * m, m, m)
  return n * m
}
function rrect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); g.fill()
}
export type ShelfStyle = 'block' | 'lines' | 'blockbrand' | 'blockqr' | 'blockqrbrand' | 'plainqr'
export async function shelfStrip(l: LocLabel, style: ShelfStyle) {
  await fonts()
  const W = 400, H = 96, mx = 16, my = 8, ih = H - my * 2
  const { c, g } = canvas(W, H)
  g.textBaseline = 'alphabetic'; g.direction = 'ltr'; g.textAlign = 'left'
  const code = l.code
  const qr = style === 'blockqr' || style === 'blockqrbrand' || style === 'plainqr'
  let qrW = 0
  if (qr) { const t = shortLocUrl(code); const q = qrcode(0, 'L'); q.addData(t, 'Alphanumeric'); q.make(); const m = Math.min(3, Math.floor(ih / q.getModuleCount())); qrW = q.getModuleCount() * m; qrAlnum(g, t, W - mx - qrW, Math.round((H - qrW) / 2), m) }
  // the code: Montserrat 900, cap height about 7 mm
  const capOf = (px: number) => px * 0.7
  if (style === 'lines' || style === 'plainqr') {
    const px = 84; g.font = MONT(900)(px)
    const tw = g.measureText(code).width, cap = capOf(px), base = Math.round(H / 2 + cap / 2)
    if (style === 'lines') {
      const x = Math.round((W - tw) / 2); g.fillText(code, x, base)
      const ly = Math.round(H / 2) - 1, gap = 16
      g.fillRect(mx, ly, x - gap - mx, 3); g.fillRect(x + tw + gap, ly, W - mx - (x + tw + gap), 3)
    } else {
      g.fillText(code, mx, base)
      const x1 = mx + tw + 16, x2 = W - mx - qrW - 16
      if (x2 - x1 > 20) g.fillRect(x1, Math.round(H / 2) - 1, x2 - x1, 3)
    }
    return { canvas: oneBit(c) }
  }
  // black block, clear letters: the shelf shows through the code
  const px = 66; g.font = MONT(900)(px)
  const tw = g.measureText(code).width, padX = 18, bw = Math.round(tw + padX * 2), bh = ih
  const bx = style === 'block' ? Math.round((W - bw) / 2) : mx
  rrect(g, bx, my, bw, bh, 14)
  g.fillStyle = '#fff'; g.fillText(code, bx + padX, Math.round(H / 2 + capOf(px) / 2)); g.fillStyle = '#000'
  if (style === 'blockbrand' || style === 'blockqrbrand') {
    const right = qr ? W - mx - qrW - 14 : W - mx, left = bx + bw + 14
    // small wordmark centred in the free space
    brand(g, (left + right) / 2, H / 2 + 1, qr ? 13 : 17)
  }
  return { canvas: oneBit(c) }
}
const strip = (style: ShelfStyle) => (l: LocLabel) => shelfStrip(l, style)

export const LOC_TEMPLATES: Template<LocLabel>[] = [
  { key: 'box5070', label: 'קופסה', mm: [50, 70], render: box },
  { key: 'round31', label: 'עיגול QR', hint: '31 מ"מ, שקוף', mm: [31, 31], round: true, render: round31 },
  { key: 'round50', label: 'עיגול גדול', hint: '50 מ"מ, שקוף', mm: [50, 50], round: true, render: round50 },
]
/* shelf strips for the D110, 50 x 12 (Gilad chose 1, 3, 4, 5 on 26.10) */
const D110 = { hint: 'D110 · 50×12', mm: [50, 12] as [number, number], printer: 'D110' }
export const SHELF_TEMPLATES: Template<LocLabel>[] = [
  { key: 's1', label: 'בלוק + QR', ...D110, render: strip('blockqr') },
  { key: 's3', label: 'בלוק, לוגו, QR', ...D110, render: strip('blockqrbrand') },
  { key: 's4', label: 'בלוק', ...D110, render: strip('block') },
  { key: 's5', label: 'קו', ...D110, render: strip('lines') },
]
