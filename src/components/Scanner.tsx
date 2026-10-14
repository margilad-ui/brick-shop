import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser'
import { BarcodeFormat, DecodeHintType } from '@zxing/library'

export function Scanner({ onCode, onError }: { onCode: (code: string) => void; onError?: (msg: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [status, setStatus] = useState('מפעיל מצלמה...')
  useEffect(() => {
    let controls: IScannerControls | null = null
    let stopped = false
    const hints = new Map()
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.UPC_A, BarcodeFormat.EAN_8, BarcodeFormat.CODE_128])
    hints.set(DecodeHintType.TRY_HARDER, true)
    const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 150 })
    ;(async () => {
      try {
        const onResult = (result: { getText(): string } | undefined) => {
          if (result && !stopped) { stopped = true; controls?.stop(); onCode(result.getText()) }
        }
        setStatus('כוון את הברקוד למסגרת')
        // back camera first: exact environment, then ideal, then any camera
        const tries: MediaStreamConstraints[] = [
          { video: { facingMode: { exact: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } } },
          { video: { facingMode: { ideal: 'environment' } } },
          { video: true },
        ]
        let lastErr: unknown = null
        for (const c of tries) {
          try { controls = await reader.decodeFromConstraints(c, videoRef.current!, onResult); lastErr = null; break }
          catch (e) { lastErr = e }
        }
        if (lastErr) throw lastErr
      } catch (e) {
        const msg = (e as Error).message || 'אין גישה למצלמה'
        setStatus(msg); onError?.(msg)
      }
    })()
    return () => { stopped = true; controls?.stop() }
  }, [onCode, onError])
  return (
    <div className="scanner">
      <video ref={videoRef} muted playsInline autoPlay />
      <div className="frame" />
      <div className="hint">{status}</div>
    </div>
  )
}
