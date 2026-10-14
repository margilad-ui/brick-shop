import { useEffect, useMemo, useRef, useState } from 'react'
import { fmtPrice, getLang, useT } from '../i18n'
import { dims, loadCatalogSet, stripHtml, themeColor, waLink, DEFAULT_WA, type CatalogSet, type ShopItem } from '../data'
import { Brick, Link, Pic, SetCard, Stud, flyToCart } from '../ui'
import { addToCart, inCart, openDrawer, useCart } from '../cart'
import { JOEY } from '../joey'
import { navigate } from '../router'

export function Product({ id, items, loading }: { id: string; items: ShopItem[]; loading: boolean }) {
  const t = useT(); useCart()
  const setNum = id.includes('-') ? id : id + '-1'
  const item = items.find(i => i.set_num === setNum || i.id === id)
  const [cat, setCat] = useState<CatalogSet | null>(null)
  useEffect(() => { let on = true; loadCatalogSet(setNum).then(c => on && setCat(c)); return () => { on = false } }, [setNum])
  const s = (item || cat) as (ShopItem & Partial<CatalogSet>) | null
  const color = themeColor(s?.theme)
  const more = useMemo(() => items.filter(i => i.theme === s?.theme && i.set_num !== setNum).slice(0, 4), [items, s?.theme, setNum])
  const n = item ? inCart(item.id) : 0
  const picRef = useRef<HTMLImageElement>(null)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  useEffect(() => { document.title = s?.name ? `${s.name} · BRICK Shop` : 'BRICK Shop' }, [s?.name])
  const he = getLang() === 'he'
  const desc = s ? (he && s.description_he ? s.description_he : stripHtml(s.description_en)) : ''
  const descIsOfficial = !(he && s?.description_he)

  if (!s && !loading && cat === null) return <main className="s-wrap s-section s-empty"><img src={JOEY.guilty} alt="" /><b>{t('not_found_set')}</b><Brick href="/sets">{t('crumb_sets')}</Brick></main>
  if (!s) return <main className="s-wrap s-section"><div className="s-product s-skel-page" /></main>

  const add = (e: React.MouseEvent<HTMLButtonElement>) => { if (!item) return; if (addToCart(item)) flyToCart(picRef.current, item.image_url) }
  const share = async () => { try { await navigator.share({ title: s.name || '', url: location.href }) } catch { try { await navigator.clipboard.writeText(location.href) } catch { /* ignore */ } } }
  const waText = he ? `היי, אני רוצה את ${s.name} (${s.number}) מ BRICK Shop` : `Hi, I want ${s.name} (${s.number}) from BRICK Shop`
  const specs: [string, string][] = [
    [t('spec_theme'), [s.theme, s.subtheme].filter(Boolean).join(' · ')],
    [t('spec_year'), s.year ? String(s.year) : ''],
    [t('spec_pieces'), s.pieces ? s.pieces.toLocaleString('en-US') : ''],
    [t('spec_minifigs'), s.minifigs ? String(s.minifigs) : ''],
    [t('spec_age'), s.age_min ? `${s.age_min}+` : ''],
    [t('spec_status'), s.retired ? `${t('spec_status_retired')}${s.exit_date ? ' · ' + new Date(s.exit_date).getFullYear() : ''}` : t('spec_status_active')],
    [t('spec_box'), dims(s.dims)], [t('spec_model'), dims(s.model_dims)],
    [t('spec_rrp'), [s.rrp_us ? `$${s.rrp_us}` : '', s.rrp_de ? `€${s.rrp_de}` : ''].filter(Boolean).join(' · ')],
    [t('spec_rating'), s.rating ? `${Number(s.rating).toFixed(1)} / 5${s.rating_count ? ` (${s.rating_count})` : ''}` : ''],
    [t('spec_packaging'), s.packaging || ''], [t('spec_ean'), (s as CatalogSet).ean || ''],
  ]
  return <main className={`s-wrap s-section s-product c-${color}`} style={{ ['--accent' as string]: `var(--${color})` }}>
    <nav className="s-crumbs" aria-label="breadcrumb"><Link to="/sets">{t('crumb_sets')}</Link>{s.theme && <><span>›</span><Link to={'/sets?theme=' + encodeURIComponent(s.theme)}>{s.theme}</Link></>}<span>›</span><b>{s.name}</b></nav>
    <div className="s-product-grid">
      <div className="s-product-pic" onPointerMove={e => { const r = e.currentTarget.getBoundingClientRect(); setTilt({ x: ((e.clientX - r.left) / r.width - .5) * 10, y: ((e.clientY - r.top) / r.height - .5) * -10 }) }} onPointerLeave={() => setTilt({ x: 0, y: 0 })}>
        <div className="s-product-box" style={{ transform: `rotateY(${tilt.x}deg) rotateX(${tilt.y}deg)` }}>
          {s.image_url ? <img ref={picRef} src={s.image_url} alt={s.name || ''} /> : <Pic src={null} />}
        </div>
        <span className="s-product-studs" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /></span>
      </div>
      <div className="s-product-body">
        <div className="s-product-theme"><Stud color={color} size={12} />{[s.theme, s.subtheme].filter(Boolean).join(' · ')}</div>
        <h1 className="s-h1">{s.name}</h1>
        <div className="s-product-num ltr">{t('set_label')} {s.number}</div>
        <div className="s-card-tags">
          {s.retired ? <span className="s-tag t-red">{t('retired_tag')}{s.exit_date ? ` · ${new Date(s.exit_date).getFullYear()}` : ''}</span> : null}
          <span className="s-tag t-green">{t('condition_sealed')}</span>
          {s.pieces ? <span className="s-tag t-ink ltr">{s.pieces.toLocaleString('en-US')} {t('pieces')}</span> : null}
          {s.minifigs ? <span className="s-tag t-ink ltr">{s.minifigs} {t('minifigs')}</span> : null}
          {item?.demo && <span className="s-tag t-demo">{t('demo_tag')}</span>}
        </div>
        <div className="s-buy">
          {item ? <>
            <div className="s-buy-price"><span className="s-price big">{fmtPrice(item.price)}</span>{s.rrp_us && <span className="muted ltr">{t('spec_rrp')}: ${s.rrp_us}</span>}</div>
            <div className="s-buy-stock"><i className={`dot c-${item.qty === 1 ? 'red' : 'green'}`} />{item.qty} {t('in_stock')} · {t('pickup')}</div>
            <div className="s-buy-ctas">
              <Brick color={n ? 'green' : 'yellow'} onClick={add}>{n ? `${t('added')} · ${n}` : t('want')}</Brick>
              {n > 0 && <Brick color="ink" onClick={() => openDrawer(true)}>{t('cart_checkout')}</Brick>}
              <a className="s-linkbtn wa" href={waLink(DEFAULT_WA, waText)} target="_blank" rel="noopener">{t('ask_wa')}</a>
            </div>
            <p className="muted">{t('price_incl')}</p>
          </> : <>
            <b>{t('not_found_set')}</b>
            <div className="s-buy-ctas"><a className="s-linkbtn wa" href={waLink(DEFAULT_WA, waText)} target="_blank" rel="noopener">{t('ask_wa')}</a><button type="button" className="s-linkbtn" onClick={() => navigate('/sets')}>{t('crumb_sets')}</button></div>
          </>}
        </div>
        {desc && <div className="s-joeysays">
          <img src={JOEY.head} alt="" />
          <div><b>{descIsOfficial ? t('official_desc') : t('joey_on')}</b><p>{desc}</p></div>
        </div>}
        <button type="button" className="s-linkbtn" onClick={share}>{t('share')}</button>
      </div>
    </div>
    <section className="s-specs">
      <h2 className="s-h3">{t('specs')}</h2>
      <dl>{specs.filter(([, v]) => v).map(([k, v]) => <div key={k}><dt>{k}</dt><dd className={/\d/.test(v) ? 'ltr' : ''}>{v}</dd></div>)}</dl>
    </section>
    {more.length > 0 && <section className="s-more"><h2 className="s-h3">{t('more_world')}</h2><div className="s-grid">{more.map(m => <SetCard key={m.id} item={m} />)}</div></section>}
  </main>
}
