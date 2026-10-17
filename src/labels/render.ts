/* Part labels for the NIIMBOT B1 (203 dpi, 8 dots per mm).
   A 50 x 30 mm label is printed on a 384 dot printhead, so the canvas is 384 x 240 (48 x 30 mm, 1 mm side margins).
   Everything is drawn 1-bit (pure black and white), the way the thermal head will print it.

   The picture of the part comes from LDraw, the open 3D library that BrickLink and the instruction books are rendered
   from: white faces and black edge lines, like a page of building instructions. Exact geometry for every part, no AI.
   When a part has no LDraw model, the official BrickLink picture is converted to a black and white drawing instead. */
import * as THREE from 'three'
import { LDrawLoader } from 'three/examples/jsm/loaders/LDrawLoader.js'
import { LDrawConditionalLineMaterial } from 'three/examples/jsm/materials/LDrawConditionalLineMaterial.js'
import qrcode from 'qrcode-generator'
import { supabase } from '../lib/supabase'

export const LABEL_W = 384
export const LABEL_H = 240
const LIB = 'https://raw.githubusercontent.com/gkjohnson/ldraw-parts-library/master/complete/ldraw/'

export type PartLabel = { id: string; part_no: string; color_id: number | null; color_name: string | null; name: string | null }

/* the link inside the QR: opens this part in the back office (same site the label was made from) */
export function partKey(p: { part_no: string; color_id: number | null }) { return `${p.part_no}.${p.color_id ?? 0}` }
export function partUrl(p: { part_no: string; color_id: number | null }) {
  const base = (import.meta.env.BASE_URL || '/')
  return `${location.origin}${base}?p=${encodeURIComponent(partKey(p))}`
}
export function brickLinkImg(p: { part_no: string; color_id: number | null }) {
  return p.color_id && p.color_id > 0 ? `https://img.bricklink.com/ItemImage/PN/${p.color_id}/${p.part_no}.png` : `https://img.bricklink.com/ItemImage/PL/${p.part_no}.png`
}

/* ---------- LDraw line drawing ---------- */
let renderer: THREE.WebGLRenderer | null = null
let loader: LDrawLoader | null = null
let loaderReady: Promise<void> | null = null
const artCache = new Map<string, Promise<HTMLCanvasElement | null>>()

async function getLoader() {
  if (!loader) {
    loader = new LDrawLoader()
    loader.setConditionalLineMaterial(LDrawConditionalLineMaterial)
    loader.setPartsLibraryPath(LIB)
    loader.smoothNormals = false
    loaderReady = loader.preloadMaterials(LIB + 'LDConfig.ldr').catch(() => undefined)
  }
  await loaderReady
  return loader
}

/* BrickLink and LDraw share most numbers. Assemblies (87081c02) and printed variants fall back to the base mould. */
function ldrawCandidates(partNo: string) {
  const id = partNo.toLowerCase()
  const out = [id]
  const base = id.replace(/c\d+$/, '').replace(/pb\d+$/, '').replace(/pr\d+$/, '')
  if (base !== id) out.push(base)
  return [...new Set(out)]
}

async function loadLDraw(partNo: string): Promise<THREE.Group | null> {
  const l = await getLoader()
  for (const id of ldrawCandidates(partNo)) {
    const url = `${LIB}parts/${id}.dat`
    const head = await fetch(url, { method: 'GET', cache: 'force-cache' }).catch(() => null)
    if (!head || !head.ok) continue
    try { return await l.loadAsync(url) as THREE.Group } catch { /* try next */ }
  }
  return null
}

function renderLines(group: THREE.Group, size: number): HTMLCanvasElement {
  const S = size * 3
  if (!renderer) { renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true }); renderer.setPixelRatio(1) }
  renderer.setSize(S, S, false)
  renderer.setClearColor(0xffffff, 1)

  const white = new THREE.MeshBasicMaterial({ color: 0xffffff, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1, side: THREE.DoubleSide })
  const black = new THREE.LineBasicMaterial({ color: 0x000000 })
  group.rotation.x = Math.PI // LDraw is -Y up
  group.traverse(o => {
    const m = o as THREE.Mesh & THREE.LineSegments & { isConditionalLine?: boolean }
    if ((o as THREE.Mesh).isMesh) m.material = white
    else if (m.isConditionalLine) {
      const mat = m.material as THREE.ShaderMaterial
      if (mat?.uniforms?.diffuse) mat.uniforms.diffuse.value = new THREE.Color(0x000000)
      if (mat?.uniforms?.opacity) mat.uniforms.opacity.value = 1
    } else if ((o as THREE.LineSegments).isLineSegments) m.material = black
  })
  const scene = new THREE.Scene()
  scene.add(group)
  group.updateMatrixWorld(true)

  // classic instruction angle: from the front left, a little above
  const box = new THREE.Box3().setFromObject(group)
  const center = box.getCenter(new THREE.Vector3())
  const dir = new THREE.Vector3(-1, 0.85, 1.25).normalize()
  const radius = box.getSize(new THREE.Vector3()).length() / 2 || 10
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, radius * 20)
  cam.position.copy(center).addScaledVector(dir, radius * 6)
  cam.lookAt(center)
  cam.updateMatrixWorld(true)
  // tight fit: project the 8 box corners into camera space
  const inv = cam.matrixWorldInverse
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
    const v = new THREE.Vector3(x, y, z).applyMatrix4(inv)
    minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x); minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y)
  }
  const half = Math.max(maxX - minX, maxY - minY) / 2 * 1.04
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2
  cam.left = cx - half; cam.right = cx + half; cam.top = cy + half; cam.bottom = cy - half
  cam.updateProjectionMatrix()
  renderer.render(scene, cam)

  const big = document.createElement('canvas'); big.width = S; big.height = S
  big.getContext('2d')!.drawImage(renderer.domElement, 0, 0)
  scene.remove(group)
  const src = big.getContext('2d')!.getImageData(0, 0, S, S).data
  // down to label resolution: a dot is black if any of its 3x3 source pixels is dark, then thicken lines to 2 dots
  const bits = new Uint8Array(size * size)
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let dark = false
    for (let j = 0; j < 3 && !dark; j++) for (let i = 0; i < 3 && !dark; i++) { const k = ((y * 3 + j) * S + x * 3 + i) * 4; if (src[k] < 140) dark = true }
    bits[y * size + x] = dark ? 1 : 0
  }
  return bitsToCanvas(dilate(bits, size, size), size, size)
}

/* ---------- fallback: BrickLink picture to black and white ---------- */
async function fetchBrickLink(p: { part_no: string; color_id: number | null }): Promise<ImageBitmap | null> {
  const urls = [brickLinkImg(p)]
  if (p.color_id) urls.push(brickLinkImg({ part_no: p.part_no, color_id: null }))
  for (const url of urls) {
    try {
      const { data, error } = await supabase.functions.invoke('photo', { body: { proxy: url } })
      if (error || !(data instanceof Blob)) continue
      return await createImageBitmap(data)
    } catch { /* next */ }
  }
  return null
}

function photoToLines(img: ImageBitmap, size: number): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.width = size; c.height = size
  const g = c.getContext('2d')!
  g.fillStyle = '#fff'; g.fillRect(0, 0, size, size)
  const k = Math.min((size - 4) / img.width, (size - 4) / img.height)
  const w = Math.round(img.width * k), h = Math.round(img.height * k)
  g.drawImage(img, Math.round((size - w) / 2), Math.round((size - h) / 2), w, h)
  const d = g.getImageData(0, 0, size, size).data
  const L = new Float32Array(size * size), fg = new Uint8Array(size * size)
  for (let i = 0; i < size * size; i++) {
    const r = d[i * 4], gg = d[i * 4 + 1], b = d[i * 4 + 2]
    L[i] = 0.299 * r + 0.587 * gg + 0.114 * b
    fg[i] = r > 238 && gg > 238 && b > 238 ? 0 : 1
  }
  const bits = new Uint8Array(size * size)
  const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]
  for (let y = 1; y < size - 1; y++) for (let x = 1; x < size - 1; x++) {
    const i = y * size + x
    if (!fg[i]) continue
    // silhouette edge
    if (!fg[i - 1] || !fg[i + 1] || !fg[i - size] || !fg[i + size]) { bits[i] = 1; continue }
    // inner edges (Sobel on brightness)
    const gx = -L[i - size - 1] - 2 * L[i - 1] - L[i + size - 1] + L[i - size + 1] + 2 * L[i + 1] + L[i + size + 1]
    const gy = -L[i - size - 1] - 2 * L[i - size] - L[i - size + 1] + L[i + size - 1] + 2 * L[i + size] + L[i + size + 1]
    if (Math.hypot(gx, gy) > 150) { bits[i] = 1; continue }
    // light shading so dark parts read darker, but never so dense that edges get lost
    const dark = Math.min(0.45, (1 - L[i] / 255) * 0.5)
    if (bayer[(y % 4) * 4 + (x % 4)] / 16 < dark) bits[i] = 1
  }
  return bitsToCanvas(dilate(bits, size, size, true), size, size)
}

/* ---------- helpers ---------- */
function dilate(bits: Uint8Array, w: number, h: number, light = false) {
  const out = new Uint8Array(bits)
  for (let y = 0; y < h - 1; y++) for (let x = 0; x < w - 1; x++) {
    if (!bits[y * w + x]) continue
    out[y * w + x + 1] = 1
    if (!light) out[(y + 1) * w + x] = 1
  }
  return out
}
function bitsToCanvas(bits: Uint8Array, w: number, h: number) {
  const c = document.createElement('canvas'); c.width = w; c.height = h
  const g = c.getContext('2d')!
  const im = g.createImageData(w, h)
  for (let i = 0; i < w * h; i++) { const v = bits[i] ? 0 : 255; im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = v; im.data[i * 4 + 3] = 255 }
  g.putImageData(im, 0, 0)
  return c
}

/** the part drawing, square, 1-bit. source tells which path made it */
export function partArt(p: PartLabel, size: number): Promise<{ canvas: HTMLCanvasElement; source: 'ldraw' | 'photo' } | null> {
  const key = `${p.part_no}|${p.color_id ?? 0}|${size}`
  const run = async () => {
    try {
      const g = await loadLDraw(p.part_no)
      if (g) return { canvas: renderLines(g, size), source: 'ldraw' as const }
    } catch { /* fall through */ }
    const img = await fetchBrickLink(p)
    return img ? { canvas: photoToLines(img, size), source: 'photo' as const } : null
  }
  if (!artCache.has(key)) artCache.set(key, run() as Promise<never>)
  return artCache.get(key) as Promise<{ canvas: HTMLCanvasElement; source: 'ldraw' | 'photo' } | null>
}

/* ---------- the label ---------- */
function cleanName(n: string | null) {
  return (n || '').replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim()
}
function wrap(g: CanvasRenderingContext2D, text: string, maxW: number, maxLines: number) {
  const words = text.split(' '), lines: string[] = []
  let cur = ''
  for (const w of words) {
    const t = cur ? cur + ' ' + w : w
    if (g.measureText(t).width <= maxW || !cur) cur = t
    else { lines.push(cur); cur = w }
  }
  if (cur) lines.push(cur)
  if (lines.length > maxLines) {
    const keep = lines.slice(0, maxLines)
    let last = keep[maxLines - 1] + '…'
    while (g.measureText(last).width > maxW && last.length > 2) last = last.slice(0, -2) + '…'
    keep[maxLines - 1] = last
    return keep
  }
  return lines
}
function fitFont(g: CanvasRenderingContext2D, text: string, weight: number, start: number, min: number, maxW: number) {
  let s = start
  for (; s > min; s--) { g.font = `${weight} ${s}px Montserrat, Arial, sans-serif`; if (g.measureText(text).width <= maxW) break }
  return s
}

export async function renderLabel(p: PartLabel): Promise<{ canvas: HTMLCanvasElement; source: 'ldraw' | 'photo' | 'none' }> {
  try { await document.fonts.load('700 20px Montserrat'); await document.fonts.load('900 20px Montserrat') } catch { /* system font */ }
  const c = document.createElement('canvas'); c.width = LABEL_W; c.height = LABEL_H
  const g = c.getContext('2d')!
  g.fillStyle = '#fff'; g.fillRect(0, 0, LABEL_W, LABEL_H)

  // picture, left
  const ART = 176
  const art = await partArt(p, ART)
  if (art) g.drawImage(art.canvas, 6, Math.round((LABEL_H - ART) / 2))
  g.fillStyle = '#000'

  // right column
  const X = 192, W = LABEL_W - X - 8
  g.textBaseline = 'top'; g.direction = 'ltr'; g.textAlign = 'left'

  // name, up to 3 lines
  g.font = '700 25px Montserrat, Arial, sans-serif'
  const lines = wrap(g, cleanName(p.name) || p.part_no, W, 3)
  let y = 10
  for (const ln of lines) { g.fillText(ln, X, y); y += 29 }

  // colour in an inverted pill (the colour is what tells two bags of the same part apart)
  const color = (p.color_name && p.color_name !== 'Not Selected' ? p.color_name : '').toUpperCase()
  if (color) {
    y += 4
    const fs = fitFont(g, color, 800, 22, 14, W - 16)
    const tw = g.measureText(color).width
    g.fillRect(X, y, tw + 16, fs + 10)
    g.fillStyle = '#fff'; g.fillText(color, X + 8, y + 6); g.fillStyle = '#000'
  }

  // QR, bottom right, integer module size so every module is crisp
  const qr = qrcode(0, 'L'); qr.addData(partUrl(p)); qr.make()
  const n = qr.getModuleCount(), m = Math.max(2, Math.floor(92 / (n + 2)))
  const qs = (n + 2) * m, qx = LABEL_W - 6 - qs, qy = LABEL_H - 6 - qs
  for (let r = 0; r < n; r++) for (let col = 0; col < n; col++) if (qr.isDark(r, col)) g.fillRect(qx + (col + 1) * m, qy + (r + 1) * m, m, m)

  // part number, bottom left of the column
  const pn = p.part_no
  const fs = fitFont(g, pn, 900, 34, 18, qx - X - 6)
  g.textBaseline = 'alphabetic'
  g.fillText(pn, X, LABEL_H - 12)
  g.font = `700 13px Montserrat, Arial, sans-serif`
  g.fillText('PART', X, LABEL_H - 14 - fs)

  // hard 1-bit, exactly what the head prints
  const im = g.getImageData(0, 0, LABEL_W, LABEL_H)
  for (let i = 0; i < im.data.length; i += 4) { const v = im.data[i] < 128 ? 0 : 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255 }
  g.putImageData(im, 0, 0)
  return { canvas: c, source: art ? art.source : 'none' }
}
