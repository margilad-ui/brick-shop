/* lazy entry: three.js, the QR and the printer library load only when a label sheet is opened */
import { lazy, Suspense } from 'react'
import type { PartLabel } from './render'
import type { LocLabel } from './locations'
const PartsSheet = lazy(() => import('./sheets').then(m => ({ default: m.PartsSheet })))
const LocSheet = lazy(() => import('./sheets').then(m => ({ default: m.LocSheet })))
export type { PartLabel, LocLabel }
const Wait = () => <div className="overlay"><div className="pane"><p className="muted">טוען את מכונת התוויות...</p></div></div>
export function Labels({ parts, onClose }: { parts: PartLabel[]; onClose: () => void }) {
  return <Suspense fallback={<Wait />}><PartsSheet parts={parts} onClose={onClose} /></Suspense>
}
export function LocationLabels({ locs, strips, onClose }: { locs: LocLabel[]; strips?: boolean; onClose: () => void }) {
  return <Suspense fallback={<Wait />}><LocSheet locs={locs} strips={strips} onClose={onClose} /></Suspense>
}
