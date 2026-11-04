/* the two label sheets, built from the shared LabelSheet. Lazy loaded through ./index */
import { useMemo } from 'react'
import LabelSheet, { type Template, type TextEdit } from './LabelSheet'
import { renderLabel, type PartLabel } from './render'
import { LOC_TEMPLATES, SHELF_TEMPLATES, type LocLabel } from './locations'

const PART_TEMPLATES: Template<PartLabel>[] = [{ key: 'part5030', label: 'חלק', mm: [50, 30], render: renderLabel }]

export function PartsSheet({ parts, onClose, preselect }: { parts: PartLabel[]; onClose: () => void; preselect?: boolean }) {
  const items = useMemo(() => parts.map(p => ({ id: p.id, title: p.name || p.part_no, data: p })), [parts])
  return <LabelSheet title="תוויות חלקים" items={items} templates={PART_TEMPLATES} onClose={onClose} preselect={preselect} />
}
export function LocSheet({ locs, strips = false, onClose, onSaveText }: { locs: LocLabel[]; strips?: boolean; onClose: () => void; onSaveText?: (code: string, title: string, text: string) => Promise<void> }) {
  const items = useMemo(() => locs.map(l => ({ id: l.code, title: l.code, data: l, group: strips ? l.zoneName || undefined : undefined })), [locs, strips])
  const textEdit: TextEdit<LocLabel> | undefined = onSaveText && {
    get: d => ({ title: d.title || '', text: d.text || '' }),
    with: (d, v) => ({ ...d, title: v.title, text: v.text }),
    save: (d, v) => onSaveText(d.code, v.title, v.text),
  }
  // boxes open on the 80 x 50 label with text
  const initial = !strips && locs.length > 0 && locs.every(l => l.kind === 'box') ? 'box8050' : undefined
  return <LabelSheet title={strips ? 'תוויות מדפים' : 'תוויות מיקום'} items={items} templates={strips ? SHELF_TEMPLATES : LOC_TEMPLATES} onClose={onClose} initial={initial} textEdit={textEdit} />
}
