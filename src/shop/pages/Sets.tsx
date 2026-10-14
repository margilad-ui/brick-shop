import { useEffect, useMemo, useState } from 'react'
import { useT } from '../i18n'
import { isNew, themeColor, type ShopItem } from '../data'
import { Brick, SetCard, Stud } from '../ui'
import { navigate, useRoute } from '../router'
import { JOEY } from '../joey'

type Filter = 'all' | 'retired' | 'new' | 'under' | 'big' | 'poly'
type Sort = 'new' | 'price_asc' | 'price_desc' | 'pieces'

export function Sets({ items, loading }: { items: ShopItem[]; loading: boolean }) {
  const t = useT(); const { query } = useRoute()
  const f = (query.get('f') as Filter) || 'all'
  const theme = query.get('theme') || ''
  const q = (query.get('q') || '').trim().toLowerCase()
  const sort = (query.get('sort') as Sort) || 'new'
  const [page, setPage] = useState(1)
  useEffect(() => setPage(1), [f, theme, q, sort])
  const set = (k: string, v: string) => { const p = new URLSearchParams(location.search); if (v) p.set(k, v); else p.delete(k); navigate('/sets' + (p.toString() ? '?' + p : ''), { scroll: false }) }

  const themes = useMemo(() => { const m = new Map<string, number>(); items.forEach(i => { if (i.theme) m.set(i.theme, (m.get(i.theme) || 0) + 1) }); return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0])) }, [items])
  const list = useMemo(() => {
    let r = items
    if (f === 'retired') r = r.filter(i => i.retired)
    if (f === 'new') r = r.filter(isNew)
    if (f === 'under') r = r.filter(i => (i.price || 0) <= 150)
    if (f === 'big') r = r.filter(i => (i.pieces || 0) >= 1000)
    if (f === 'poly') r = r.filter(i => i.kind === 'polybag')
    if (theme) r = r.filter(i => i.theme === theme)
    if (q) r = r.filter(i => [i.name, i.number, i.theme, i.subtheme].some(x => (x || '').toLowerCase().includes(q)))
    const s = [...r]
    if (sort === 'price_asc') s.sort((a, b) => (a.price || 0) - (b.price || 0))
    else if (sort === 'price_desc') s.sort((a, b) => (b.price || 0) - (a.price || 0))
    else if (sort === 'pieces') s.sort((a, b) => (b.pieces || 0) - (a.pieces || 0))
    else s.sort((a, b) => Number(a.demo) - Number(b.demo) || new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    return s
  }, [items, f, theme, q, sort])
  const shown = list.slice(0, page * 24)
  const filters: [Filter, string][] = [['all', t('filter_all')], ['retired', t('filter_retired')], ['new', t('filter_new')], ['under', t('filter_under')], ['big', t('filter_big')], ['poly', t('room_poly')]]
  const accent = theme ? themeColor(theme) : f === 'retired' ? 'red' : f === 'new' ? 'green' : f === 'poly' ? 'cocoa' : 'yellow'

  return <main className="s-wrap s-section s-sets" style={{ ['--accent' as string]: `var(--${accent})` }}>
    <div className="s-sets-head">
      <h1 className="s-h1"><Stud color={accent} size={22} /> {theme || (f === 'retired' ? t('filter_retired') : f === 'new' ? t('filter_new') : f === 'poly' ? t('room_poly') : t('sets_title'))}</h1>
      <span className="s-count ltr">{loading ? '' : `${list.length} ${t('sets_count')}`}</span>
    </div>
    <div className="s-filters">
      <div className="s-chips">{filters.map(([k, l]) => <button type="button" key={k} className={'s-chip ' + (f === k ? 'on' : '')} onClick={() => set('f', k === 'all' ? '' : k)}>{l}</button>)}</div>
      <div className="s-filters-row">
        <label className="s-select"><span>{t('filter_theme')}</span><select value={theme} onChange={e => set('theme', e.target.value)}><option value="">{t('filter_all')}</option>{themes.map(([th, n]) => <option key={th} value={th}>{th} ({n})</option>)}</select></label>
        <label className="s-select"><span>{t('sort')}</span><select value={sort} onChange={e => set('sort', e.target.value === 'new' ? '' : e.target.value)}><option value="new">{t('sort_new')}</option><option value="price_asc">{t('sort_price_asc')}</option><option value="price_desc">{t('sort_price_desc')}</option><option value="pieces">{t('sort_pieces')}</option></select></label>
        {(f !== 'all' || theme || q) && <button type="button" className="s-linkbtn" onClick={() => navigate('/sets', { scroll: false })}>{t('clear')}</button>}
        {q && <span className="s-chip on">“{q}”</span>}
      </div>
    </div>
    {loading ? <div className="s-grid">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="s-card s-skel" />)}</div>
      : shown.length === 0 ? <div className="s-empty"><img src={JOEY.guilty} alt="" /><b>{t('empty_title')}</b><span>{t('empty_sub')}</span><Brick onClick={() => navigate('/sets')}>{t('clear')}</Brick></div>
        : <div className="s-grid">{shown.map((i, n) => <SetCard key={i.id} item={i} eager={n < 8} />)}</div>}
    {shown.length < list.length && <div className="s-center"><Brick color="ink" onClick={() => setPage(p => p + 1)}>+ {Math.min(24, list.length - shown.length)}</Brick></div>}
  </main>
}
