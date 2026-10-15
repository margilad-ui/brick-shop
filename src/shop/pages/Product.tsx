import { useEffect, useMemo, useRef, useState } from 'react'
import { fmtPrice, getLang, useT } from '../i18n'
import { dims, loadCatalogSet, loadImages, paragraphs, themeColor, waLink, DEFAULT_WA, type CatalogSet, type SetImage, type ShopItem } from '../data'
import { Brick, Link, Pic, SetCard, Stud, flyToCart } from '../ui'
import { addToCart, inCart, openDrawer, useCart } from '../cart'
import { JOEY } from '../joey'
import { navigate } from '../router'

export function Product({ id, items, loading }: { id: string; items: ShopItem[]; loading: boolean }) {
  const t = useT(); useCart()
  const setNum = id.includes('-') ? id : id + '-1'
  const item = items.find(i => i.set_num === setNum || i.id === id)
  const [cat, setCat] = useState<CatalogSet | null>(null)
  const [images, setImages] = useState<SetImage[]>([])
  const [active, setActive] = useState(0)
  const [zoom, setZoom] = useState(false)
  const [more, setMore] = useState(false)
  useEffect(() => { let on = true; setActive(0); setImages([]); setMore(false); loadCatalogSet(setNum).then(c => on && setCat(c)); loadImages(setNum).then(im => on && setImages(im)); return () => { on = false } }, [setNum])
  const s = (item || cat) as (ShopItem & Partial<CatalogSet>) | null
  const color = themeColor(s?.theme)
  const related = useMemo(() => items.filter(i => i.theme === s?.theme && i.set_num !== setNum).slice(0, 4), [items, s?.theme, setNum])
  const n = item ? inCart(item.id) : 0
  const picRef = useRef<HTMLImageElement>(null)
  useEffect(() => { document.title = s?.name ? `${s.name} · BRICK Shop` : 'BRICK Shop' }, [s?.name])
  useEffect(() => { if (!zoom) return; const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setZoom(false); if (e.key === 'ArrowRight') setActive(a => (a + 1) % gallery.length); if (e.key === 'ArrowLeft') setActive(a => (a - 1 + gallery.length) % gallery.length) }; addEventListener('keydown', k); return () => removeEventListener('keydown', k) })
  const he = getLang() === 'he'

  if (!s && !loading && cat === null) return <main className="s-wrap s-section s-empty"><img src={JOEY.guilty} alt="" /><b>{t('not_found_set')}</b><Brick href="/sets">{t('crumb_sets')}</Brick></main>
  if (!s) return <main className="s-wrap s-section"><div className="s-skel-page" /></main>

  const gallery: SetImage[] = [...(s.image_url ? [{ image: s.image_url, thumb: s.thumb_url || s.image_url }] : []), ...images.filter(i => i.image !== s.image_url)]
  const cur = gallery[active] || gallery[0]
  const add = (e: React.MouseEvent<HTMLButtonElement>) => { if (!item) return; if (addToCart(item)) flyToCart(picRef.current, item.image_url) }
  const share = async () => { try { await navigator.share({ title: s.name || '', url: location.href }) } catch { try { await navigator.clipboard.writeText(location.href) } catch { /* ignore */ } } }
  const waText = he ? `היי, אני רוצה את ${s.name} (${s.number}) מ BRICK Shop` : `Hi, I want ${s.name} (${s.number}) from BRICK Shop`
  const joeyText = he && s.description_he ? s.description_he : ''
  const official = paragraphs(s.description_en)
  const shownParas = more ? official : official.slice(0, 2)
  const tiles: [string, string][] = [
    [s.pieces ? s.pieces.toLocaleString('en-US') : '', t('spec_pieces')], [s.minifigs ? String(s.minifigs) : '', t('spec_minifigs')],
    [s.age_min ? `${s.age_min}+` : '', t('spec_age')], [s.year ? String(s.year) : '', t('spec_year')],
  ]
  const specs: [string, string][] = [
    [t('spec_theme'), [s.theme, s.subtheme].filter(Boolean).join(' · ')],
    [t('spec_status'), s.retired ? `${t('spec_status_retired')}${s.exit_date ? ' · ' + new Date(s.exit_date).getFullYear() : ''}` : t('spec_status_active')],
    [t('spec_box'), dims(s.dims)], [t('spec_model'), dims(s.model_dims)],
    [t('spec_rrp'), [s.rrp_us ? `$${s.rrp_us}` : '', s.rrp_de ? `€${s.rrp_de}` : ''].filter(Boolean).join(' · ')],
    [t('spec_rating'), s.rating ? `${Number(s.rating).toFixed(1)} / 5${s.rating_count ? ` (${s.rating_count})` : ''}` : ''],
    [t('spec_packaging'), s.packaging || ''], [t('spec_ean'), (s as CatalogSet).ean || ''],
  ]
  return <main className={`s-product c-${color}`} style={{ ['--accent' as string]: `var(--${color})` }}>
    <div className="s-wrap">
      <nav className="s-crumbs" aria-label="breadcrumb"><Link to="/sets">{t('crumb_sets')}</Link>{s.theme && <><span>›</span><Link to={'/sets?theme=' + encodeURIComponent(s.theme)}>{s.theme}</Link></>}<span>›</span><b className="ltr">{s.number}</b></nav>
      <div className="s-product-grid">
        {/* gallery */}
        <div className="s-gallery">
          <button type="button" className="s-gallery-main" onClick={() => setZoom(true)} aria-label="zoom">
            <span className="s-product-studs" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /></span>
            {cur ? <img ref={picRef} src={cur.image} alt={s.name || ''} /> : <Pic src={null} />}
            {gallery.length > 1 && <span className="s-gallery-count ltr">{active + 1} / {gallery.length}</span>}
          </button>
          {gallery.length > 1 && <div className="s-thumbs">{gallery.map((g, i) => <button type="button" key={g.image} className={i === active ? 'on' : ''} onClick={() => setActive(i)} aria-label={`${i + 1}`}><img src={g.thumb || g.image} alt="" loading="lazy" /></button>)}</div>}
        </div>

        {/* buy column */}
        <div className="s-product-body">
          <div className="s-product-theme"><Stud color={color} size={12} />{[s.theme, s.subtheme].filter(Boolean).join(' · ')}</div>
          <h1 className="s-h1">{s.name}</h1>
          <div className="s-product-num ltr">{t('set_label')} {s.number}</div>
          <div className="s-tiles">{tiles.filter(([v]) => v).map(([v, l]) => <div key={l} className="s-tile"><b className="ltr">{v}</b><span>{l}</span></div>)}</div>
          <div className="s-buy">
            {item ? <>
              <div className="s-buy-top">
                <div className="s-buy-price"><span className="s-price big">{fmtPrice(item.price)}</span><span className="muted">{t('price_incl')}</span></div>
                <div className="s-buy-tags">
                  {s.retired ? <span className="s-tag t-red">{t('retired_tag')}</span> : null}
                  <span className="s-tag t-green">{t('condition_sealed')}</span>
                  {item.demo && <span className="s-tag t-demo">{t('demo_tag')}</span>}
                </div>
              </div>
              <div className="s-buy-stock"><i className={`dot c-${item.qty === 1 ? 'red' : 'green'}`} />{item.qty === 1 ? t('last_one') : `${item.qty} ${t('in_stock')}`} · {t('pickup')}</div>
              <div className="s-buy-ctas">
                <Brick color={n ? 'green' : 'yellow'} onClick={add}>{n ? `${t('added')} · ${n}` : t('want')}</Brick>
                {n > 0 && <Brick color="ink" onClick={() => openDrawer(true)}>{t('cart_checkout')}</Brick>}
              </div>
              <div className="s-buy-links"><a className="s-linkbtn wa" href={waLink(DEFAULT_WA, waText)} target="_blank" rel="noopener">{t('ask_wa')}</a><button type="button" className="s-linkbtn" onClick={share}>{t('share')}</button></div>
              <img src={JOEY.present} alt="" className="s-buy-joey" />
            </> : <>
              <b>{t('not_found_set')}</b>
              <div className="s-buy-ctas"><a className="s-linkbtn wa" href={waLink(DEFAULT_WA, waText)} target="_blank" rel="noopener">{t('ask_wa')}</a><button type="button" className="s-linkbtn" onClick={() => navigate('/sets')}>{t('crumb_sets')}</button></div>
            </>}
          </div>
        </div>
      </div>

      {/* Joey's take + official story */}
      <div className="s-story">
        {joeyText && <div className="s-joeysays"><img src={JOEY.head} alt="" /><div><b>{t('joey_on')}</b><p>{joeyText}</p></div></div>}
        {official.length > 0 && <div className="s-official">
          <h2 className="s-h3">{t('official_desc')}</h2>
          <div className="s-official-text ltr">{shownParas.map((p, i) => <p key={i}>{p}</p>)}</div>
          {official.length > 2 && <button type="button" className="s-linkbtn" onClick={() => setMore(m => !m)}>{more ? t('read_less') : t('read_more')}</button>}
        </div>}
      </div>

      <section className="s-specs">
        <h2 className="s-h3">{t('specs')}</h2>
        <dl>{specs.filter(([, v]) => v).map(([k, v]) => <div key={k}><dt>{k}</dt><dd className={/\d/.test(v) ? 'ltr' : ''}>{v}</dd></div>)}</dl>
      </section>
      {related.length > 0 && <section className="s-more"><h2 className="s-h3">{t('more_world')}</h2><div className="s-grid">{related.map(m => <SetCard key={m.id} item={m} />)}</div></section>}
    </div>

    {zoom && cur && <div className="s-lightbox" onClick={() => setZoom(false)} role="dialog">
      <img src={cur.image} alt={s.name || ''} onClick={e => e.stopPropagation()} />
      {gallery.length > 1 && <>
        <button type="button" className="s-lb-nav prev" onClick={e => { e.stopPropagation(); setActive(a => (a - 1 + gallery.length) % gallery.length) }} aria-label="prev">‹</button>
        <button type="button" className="s-lb-nav next" onClick={e => { e.stopPropagation(); setActive(a => (a + 1) % gallery.length) }} aria-label="next">›</button>
      </>}
      <button type="button" className="s-x s-lb-x" onClick={() => setZoom(false)} aria-label="close">×</button>
    </div>}
  </main>
}
