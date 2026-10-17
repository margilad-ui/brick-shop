/* the two label sheets, built from the shared LabelSheet. Lazy loaded through ./index */
import { useMemo } from 'react'
import LabelSheet, { type Template } from './LabelSheet'
import { renderLabel, type PartLabel } from './render'
import { LOC_TEMPLATES, type LocLabel } from './locations'

const PART_TEMPLATES: Template<PartLabel>[] = [{ key: 'part5030', label: 'חלק', mm: [50, 30], render: renderLabel }]

export function PartsSheet({ parts, onClose }: { parts: PartLabel[]; onClose: () => void }) {
  const items = useMemo(() => parts.map(p => ({ id: p.id, title: p.name || p.part_no, data: p })), [parts])
  return <LabelSheet title="תוויות חלקים" items={items} templates={PART_TEMPLATES} onClose={onClose} />
}
export function LocSheet({ locs, onClose }: { locs: LocLabel[]; onClose: () => void }) {
  const items = useMemo(() => locs.map(l => ({ id: l.code, title: l.code, data: l })), [locs])
  return <LabelSheet title="תוויות מיקום" items={items} templates={LOC_TEMPLATES} onClose={onClose} />
}
