import { useMemo } from 'react'
import { fmtPrice, useT } from '../i18n'
import { isRare, themeColor, type ShopItem } from '../data'
import { Brick, Link, Pic, SetCard } from '../ui'
import { Clip, CLIP, JOEY } from '../joey'
import { addToCart } from '../cart'
import { flyToCart } from '../ui'

export function Collectors({ items, loading }: { items: ShopItem[]; loading: boolean }) {
  const t = useT()
  const list = useMemo(() => items.filter(i => i.retired || isRare(i)).sort((a, b) => (new Date(a.exit_date || '2030').getTime()) - (new Date(b.exit_date || '2030').getTime())), [items])
  const feature = list.find(i => (i.pieces || 0) > 1500 && i.image_url) || list[0]
  const rest = list.filter(i => i !== feature)
  const yrs = (i: ShopItem) => i.exit_date ? Math.max(0, Math.floor((Date.now() - new Date(i.exit_date).getTime()) / (365.25 * 864e5))) : null
  return <main className="s-vault">
    <section className="s-wrap s-vault-head">
      <div><h1 className="s-h1 light">{t('col_title')}</h1><p className="s-lead light">{t('col_sub')}</p></div>
      <div className="s-vault-joey"><Clip src={CLIP.sniff} poster={JOEY.detective} className="s-sniff" /><span className="s-vault-bubble">{t('col_joey')}</span></div>
    </section>
    {feature && <section className={`s-wrap s-feature c-${themeColor(feature.theme)}`}>
      <Link to={`/set/${feature.set_num}`} className="s-feature-pic"><Pic src={feature.image_url} alt={feature.name || ''} eager /></Link>
      <div className="s-feature-body">
        <span className="s-tag t-red">{t('retired_tag')}{feature.exit_date ? ` · ${new Date(feature.exit_date).getFullYear()}` : ''}</span>
        <h2 className="s-h2 light">{feature.name}</h2>
        <div className="s-feature-meta ltr">{feature.number} · {feature.theme} · {(feature.pieces || 0).toLocaleString('en-US')} {t('pieces')}</div>
        <div className="s-feature-stats">
          {yrs(feature) != null && <div><b className="ltr">{yrs(feature)}</b><span>{t('col_years')}</span></div>}
          {feature.rrp_us && <div><b className="ltr">${feature.rrp_us}</b><span>{t('col_rrp')}</span></div>}
          {feature.rating && <div><b className="ltr">{Number(feature.rating).toFixed(1)}</b><span>{t('spec_rating')}</span></div>}
        </div>
        <div className="s-feature-cta"><span className="s-price light">{fmtPrice(feature.price)}</span>
          <Brick onClick={e => { addToCart(feature); flyToCart((e.currentTarget.closest('.s-feature')?.querySelector('img') as HTMLImageElement) || null, feature.image_url) }}>{t('want')}</Brick></div>
      </div>
    </section>}
    <section className="s-wrap s-section">
      {loading ? <div className="s-grid">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="s-card s-skel" />)}</div> : <div className="s-grid">{rest.map(i => <SetCard key={i.id} item={i} />)}</div>}
    </section>
  </main>
}
