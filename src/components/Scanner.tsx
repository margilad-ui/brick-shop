import { useCallback, useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser'
import { BarcodeFormat, DecodeHintType } from '@zxing/library'

type Caps = { zoom?: { min: number; max: number; step: number }; focusMode?: string[] }
type Track = MediaStreamTrack & { getCapabilities?: () => Caps }
type Detector = { detect(src: HTMLVideoElement): Promise<{ rawValue: string }[]> }
declare global { interface Window { BarcodeDetector?: new (o: { formats: string[] }) => Detector } }

async function listBackCameras(): Promise<MediaDeviceInfo[]> {
  const all = await navigator.mediaDevices.enumerateDevices()
  const cams = all.filter(d => d.kind === 'videoinput')
  const back = cams.filter(d => /back|rear|environment|אחור|wide|main/i.test(d.label) && !/front|selfie|קדמ/i.test(d.label))
  // "main" lens usually comes first among the back ones; ultra wide and macro after it
  const sorted = back.sort((a, b) => {
    const score = (l: string) => (/ultra|wide angle|macro|tele|depth/i.test(l) ? 1 : 0)
    return score(a.label) - score(b.label)
  })
  return sorted.length ? sorted : cams
}

export function Scanner({ onCode, onError }: { onCode: (code: string) => void; onError?: (msg: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [status, setStatus] = useState('מפעיל מצלמה...')
  const [cams, setCams] = useState<MediaDeviceInfo[]>([])
  const [camIdx, setCamIdx] = useState(() => Number(localStorage.getItem('bs_cam') || 0))
  const [zoom, setZoom] = useState<{ cur: number; min: number; max: number } | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const stoppedRef = useRef(false)

  const refocus = useCallback(async () => {
    const t = streamRef.current?.getVideoTracks()[0] as Track | undefined
    if (!t?.getCapabilities) return
    const caps = t.getCapabilities()
    try {
      if (caps.focusMode?.includes('single-shot')) { await t.applyConstraints({ advanced: [{ focusMode: 'single-shot' } as MediaTrackConstraintSet] }); await new Promise(r => setTimeout(r, 400)) }
      if (caps.focusMode?.includes('continuous')) await t.applyConstraints({ advanced: [{ focusMode: 'continuous' } as MediaTrackConstraintSet] })
    } catch { /* not supported on this device */ }
  }, [])

  const setZoomLevel = useCallback(async (z: number) => {
    const t = streamRef.current?.getVideoTracks()[0] as Track | undefined
    if (!t) return
    try { await t.applyConstraints({ advanced: [{ zoom: z } as MediaTrackConstraintSet] }); setZoom(s => (s ? { ...s, cur: z } : s)) } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    stoppedRef.current = false
    let controls: IScannerControls | null = null
    let raf = 0
    let stream: MediaStream | null = null
    const video = videoRef.current!

    async function start() {
      try {
        // 1. open the camera: a chosen back lens if we know one, else the environment camera
        let list = cams
        if (!list.length) { list = await listBackCameras(); setCams(list) }
        const dev = list[Math.min(camIdx, Math.max(0, list.length - 1))]
        const base: MediaTrackConstraints = { width: { ideal: 1920 }, height: { ideal: 1080 } }
        const tries: MediaStreamConstraints[] = dev?.deviceId
          ? [{ video: { ...base, deviceId: { exact: dev.deviceId } } }, { video: { ...base, facingMode: { ideal: 'environment' } } }]
          : [{ video: { ...base, facingMode: { exact: 'environment' } } }, { video: { ...base, facingMode: { ideal: 'environment' } } }, { video: true }]
        let err: unknown = null
        for (const c of tries) { try { stream = await navigator.mediaDevices.getUserMedia(c); err = null; break } catch (e) { err = e } }
        if (!stream) throw err
        streamRef.current = stream
        video.srcObject = stream
        await video.play().catch(() => undefined)
        // labels are only available after permission: refresh the lens list once
        if (!list.length || !list[0].label) { const l2 = await listBackCameras(); if (l2.length) setCams(l2) }

        // 2. continuous focus and a little zoom help with small barcodes
        const track = stream.getVideoTracks()[0] as Track
        const caps: Caps = track.getCapabilities?.() || {}
        try { if (caps.focusMode?.includes('continuous')) await track.applyConstraints({ advanced: [{ focusMode: 'continuous' } as MediaTrackConstraintSet] }) } catch { /* ignore */ }
        if (caps.zoom && caps.zoom.max > caps.zoom.min) {
          const z = Math.min(caps.zoom.max, Math.max(caps.zoom.min, 1.5))
          setZoom({ cur: z, min: caps.zoom.min, max: Math.min(caps.zoom.max, 5) })
          try { await track.applyConstraints({ advanced: [{ zoom: z } as MediaTrackConstraintSet] }) } catch { /* ignore */ }
        }
        setStatus('כוון את הברקוד למסגרת. הקש על המסך למיקוד.')

        const done = (text: string) => {
          if (stoppedRef.current) return
          stoppedRef.current = true
          if (navigator.vibrate) navigator.vibrate(60)
          onCode(text)
        }

        // 3. decode: the browser's own detector when it exists (Android Chrome), ZXing otherwise
        if (window.BarcodeDetector) {
          const det = new window.BarcodeDetector({ formats: ['ean_13', 'upc_a', 'ean_8', 'code_128', 'upc_e'] })
          let last = 0
          const loop = async (ts: number) => {
            if (stoppedRef.current) return
            if (ts - last > 120 && video.readyState >= 2) {
              last = ts
              try { const codes = await det.detect(video); if (codes.length && codes[0].rawValue) { done(codes[0].rawValue); return } } catch { /* keep going */ }
            }
            raf = requestAnimationFrame(loop)
          }
          raf = requestAnimationFrame(loop)
        } else {
          const hints = new Map()
          hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.UPC_A, BarcodeFormat.EAN_8, BarcodeFormat.CODE_128, BarcodeFormat.UPC_E])
          hints.set(DecodeHintType.TRY_HARDER, true)
          const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 120 })
          controls = await reader.decodeFromStream(stream, video, (result) => { if (result) done(result.getText()) })
        }
      } catch (e) {
        const msg = (e as Error)?.message || 'אין גישה למצלמה'
        setStatus(msg); onError?.(msg)
      }
    }
    start()
    return () => {
      stoppedRef.current = true
      cancelAnimationFrame(raf)
      controls?.stop()
      stream?.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camIdx, onCode, onError])

  const backCams = cams.filter(c => c.label)
  return (
    <div>
      <div className="scanner" onClick={refocus} role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter') refocus() }}>
        <video ref={videoRef} muted playsInline autoPlay />
        <div className="frame" />
        <div className="hint">{status}</div>
      </div>
      <div className="chips" style={{ marginTop: 8, justifyContent: 'center' }}>
        {backCams.length > 1 && <button type="button" className="chip" onClick={() => { const n = (camIdx + 1) % backCams.length; localStorage.setItem('bs_cam', String(n)); setCamIdx(n) }}>החלף עדשה ({Math.min(camIdx, backCams.length - 1) + 1}/{backCams.length})</button>}
        {zoom && <button type="button" className="chip" onClick={() => setZoomLevel(zoom.cur >= zoom.max ? zoom.min : Math.min(zoom.max, zoom.cur + 0.5))}>זום ×{zoom.cur.toFixed(1)}</button>}
        <button type="button" className="chip" onClick={refocus}>מיקוד</button>
      </div>
    </div>
  )
}
