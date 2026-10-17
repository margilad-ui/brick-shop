/* Direct printing to a NIIMBOT B1 over Bluetooth, from Chrome (Android or desktop), through the open NiimBlue library.
   Not an official NIIMBOT channel: the PDF download is the fallback. */
import { NiimbotBluetoothClient, ImageEncoder, LabelType, PageColorType } from '@mmote/niimbluelib'
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

/** prints every canvas once, in order. onPage(i) after each label */
export async function printLabels(canvases: HTMLCanvasElement[], density = 3, onPage?: (i: number) => void) {
  if (!client?.isConnected()) await connectPrinter()
  const c = client!
  const meta = c.getModelMetadata()
  const dir = meta?.printDirection ?? 'top'
  const taskType = c.getPrintTaskType() ?? 'B1'
  const task = c.protocol.newPrintTask(taskType, { totalPages: canvases.length, density, labelType: LabelType.WithGaps, statusPollIntervalMs: 100, statusTimeoutMs: 15_000 })
  try {
    await task.printInit()
    for (let i = 0; i < canvases.length; i++) {
      const encoded = ImageEncoder.encodeCanvas(canvases[i], PageColorType.SingleColor, dir)
      await task.printPage(encoded, 1)
      await task.waitForPageFinished()
      onPage?.(i + 1)
    }
    await task.waitForFinished()
  } finally {
    await task.printEnd().catch(() => undefined)
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
