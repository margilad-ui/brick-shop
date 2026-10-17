/* lazy entry: three.js, the QR and the printer library load only when a label sheet is opened */
import { lazy, Suspense } from 'react'
import type { PartLabel } from './render'
const Sheet = lazy(() => import('./LabelSheet'))
export type { PartLabel }
export function Labels({ parts, onClose }: { parts: PartLabel[]; onClose: () => void }) {
  return <Suspense fallback={<div className="overlay"><div className="pane"><p className="muted">טוען את מכונת התוויות...</p></div></div>}><Sheet parts={parts} onClose={onClose} /></Suspense>
}
