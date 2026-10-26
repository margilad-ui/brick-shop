/* Direct printing to a NIIMBOT (B1, D110) over Bluetooth, from Chrome (Android or desktop), through the open NiimBlue library.
   Not an official NIIMBOT channel: the PDF download is the fallback. */
import { NiimbotBluetoothClient, ImageEncoder, LabelType, PageColorType, type PrintTaskName } from '@mmote/niimbluelib'
import { jsPDF } from 'jspdf'

let client: NiimbotBluetoothClient | null = null

export const canBluetooth = () => typeof navigator !== 'undefined' && 'bluetooth' in navigator

export async function connectPrinter(): Promise<string> {
  if (!canBluetooth()) throw new Error('הדפדפן הזה לא תומך בבלוטות׳. צריך כרום באנדרואיד או במחשב.')
  if (client?.isConnected()) return printerName()
  client = new NiimbotBluetoothClient()
  await client.connect()
  return printerName()
}
export function printerName() {
  const m = client?.getModelMetadata()
  return m?.model || 'NIIMBOT'
}
export function isConnected() { return !!client?.isConnected() }
export async function disconnectPrinter() { try { await client?.disconnect() } finally { client = null } }

/* Which print routine (task) a model needs is guessed by the library from model + protocol version.
   Some printers (seen on a D110_M: error 20 WriteRfidFail) answer badly to the guess, so when the very first
   label fails we try the other routines that fit the model, and remember the one that worked. */
const TASK_CANDIDATES: Record<string, PrintTaskName[]> = {
  D110_M: ['D110M_V4', 'B1', 'D110'],
  D110: ['D110', 'B1', 'D110M_V4'],
  B1: ['B1', 'D110M_V4'],
}
const taskKey = (model: string) => 'bs_task_' + model
export function printerInfo() {
  const m = client?.getModelMetadata(), info = client?.getPrinterInfo()
  return `${m?.model || '?'} · v${info?.protocolVersion ?? '?'} · ${client?.getPrintTaskType() ?? '?'}`
}

/** prints every canvas once, in order. onPage(i) after each label */
export async function printLabels(canvases: HTMLCanvasElement[], density = 3, transparent = false, onPage?: (i: number) => void) {
  if (!client?.isConnected()) await connectPrinter()
  const c = client!
  const meta = c.getModelMetadata()
  const model = meta?.model || ''
  const dir = meta?.printDirection ?? 'top'
  const max = meta?.densityMax ?? 5
  const guess = (c.getPrintTaskType() ?? 'B1') as PrintTaskName
  let saved: PrintTaskName | null = null
  try { saved = localStorage.getItem(taskKey(model)) as PrintTaskName | null } catch { /* */ }
  const order = [...new Set([saved, guess, ...(TASK_CANDIDATES[model] || [])].filter(Boolean) as PrintTaskName[])]
  let printed = 0, lastErr: unknown = null
  for (const name of order) {
    const task = c.protocol.newPrintTask(name, { totalPages: canvases.length - printed, density: Math.min(density, max), labelType: transparent ? LabelType.Transparent : LabelType.WithGaps, statusPollIntervalMs: 100, statusTimeoutMs: 15_000 })
    const before = printed
    try {
      await task.printInit()
      for (let i = printed; i < canvases.length; i++) {
        const encoded = ImageEncoder.encodeCanvas(canvases[i], PageColorType.SingleColor, dir)
        await task.printPage(encoded, 1)
        await task.waitForPageFinished()
        printed = i + 1
        onPage?.(printed)
      }
      await task.waitForFinished()
      try { localStorage.setItem(taskKey(model), name) } catch { /* */ }
      return
    } catch (e) {
      lastErr = e
      console.warn('print task failed', name, e)
      // only switch routine when nothing came out with this one; a failure mid run is a real printer problem
      if (printed > before) break
    } finally {
      await task.printEnd().catch(() => undefined)
    }
    await new Promise(r => setTimeout(r, 600))
  }
  const msg = (lastErr as Error)?.message || String(lastErr)
  throw new Error(`${msg} (${printerInfo()}, נוסו: ${order.join(', ')})`)
}

/* PNG files of the labels, for apps that only take a picture (the NIIMBOT app imports from the gallery).
   Scaled up 4x with hard pixels, so the app can shrink it back to the label without blurring the edges. */
export async function labelFiles(canvases: HTMLCanvasElement[], names: string[], scale = 4): Promise<File[]> {
  const out: File[] = []
  for (let i = 0; i < canvases.length; i++) {
    const src = canvases[i]
    const c = document.createElement('canvas'); c.width = src.width * scale; c.height = src.height * scale
    const g = c.getContext('2d')!; g.imageSmoothingEnabled = false; g.drawImage(src, 0, 0, c.width, c.height)
    const blob = await new Promise<Blob>((res, rej) => c.toBlob(b => (b ? res(b) : rej(new Error('PNG failed'))), 'image/png'))
    out.push(new File([blob], `brick-house-${names[i].replace(/[^\w.-]+/g, '_')}.png`, { type: 'image/png' }))
  }
  return out
}
export const canShareFiles = (files: File[]) => { try { return !!navigator.canShare?.({ files }) } catch { return false } }
/** the share sheet: straight into the NIIMBOT app, Google Photos, WhatsApp... */
export async function shareFiles(files: File[]) { await navigator.share({ files, title: 'BRICK HOUSE labels' }) }
/** one download per picture (Chrome asks once to allow several). On Android they land in the gallery's Download album */
export async function downloadFiles(files: File[]) {
  for (const f of files) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(f); a.download = f.name
    document.body.appendChild(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(a.href), 4000)
    await new Promise(r => setTimeout(r, 350))
  }
}

/** one label per page at the label's real size, for the NIIMBOT app or any label printer.
    The canvas is placed centred; its width is the printable part (48 mm on a 50 mm label). */
export function labelsPdf(canvases: HTMLCanvasElement[], mm: [number, number] = [50, 30], name = 'brick-house-labels') {
  const [W, H] = mm
  const orient = W >= H ? 'landscape' : 'portrait'
  const doc = new jsPDF({ unit: 'mm', format: [W, H], orientation: orient, compress: true })
  canvases.forEach((cv, i) => {
    if (i) doc.addPage([W, H], orient)
    const w = cv.width / 8, h = cv.height / 8 // 8 dots per mm (203 dpi)
    doc.addImage(cv.toDataURL('image/png'), 'PNG', (W - w) / 2, (H - h) / 2, w, h, undefined, 'FAST')
  })
  doc.save(`${name}.pdf`)
}
