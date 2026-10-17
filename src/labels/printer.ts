/* Direct printing to a NIIMBOT B1 over Bluetooth, from Chrome (Android or desktop), through the open NiimBlue library.
   Not an official NIIMBOT channel: the PDF download is the fallback. */
import { NiimbotBluetoothClient, ImageEncoder, LabelType, PageColorType } from '@mmote/niimbluelib'
import { jsPDF } from 'jspdf'
import { LABEL_H, LABEL_W } from './render'

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

/** one label per page, 50 x 30 mm, for the NIIMBOT app or any label printer */
export function labelsPdf(canvases: HTMLCanvasElement[], name = 'brick-house-labels') {
  const doc = new jsPDF({ unit: 'mm', format: [50, 30], orientation: 'landscape', compress: true })
  canvases.forEach((cv, i) => {
    if (i) doc.addPage([50, 30], 'landscape')
    doc.addImage(cv.toDataURL('image/png'), 'PNG', 1, 0, 48, 48 * LABEL_H / LABEL_W, undefined, 'FAST')
  })
  doc.save(`${name}.pdf`)
}
