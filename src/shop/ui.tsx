import { useEffect, useRef, useState } from 'react'
import { fmtPrice, getLang, setLang, useT } from './i18n'
import { href, navigate, onLinkClick, useRoute } from './router'
import { addToCart, cartLines, clearCart, inCart, openDrawer, removeLine, setQty, takeLastEvent, useCart, useDrawer } from './cart'
import { isNew, isRare, themeColor, waLink, DEFAULT_WA, type ShopItem } from './data'
import { Clip, CLIP, JOEY } from './joey'

/* ---------- brand atoms ---------- */
export function Logo({ className = '' }: { className?: string }) {
  return <a href={href('/')} onClick={e => onLinkClick(e, '/')} className={'s-logo ' + className} aria-label="BRICK HOUSE">
    BR<span className="stack"><i /><i /><i /><i /></span>CK<span className="house"> HOUSE</span>
  </a>
}
export function Stud({ color = 'yellow', size = 14 }: { color?: string; size?: number }) {
  return <span className={'s-stud c-' + color} style={{ width: size, height: size }} aria-hidden="true" />
}
/* a 2x4 brick as a button: the studs sit on the top edge */
export function Brick({ children, color = 'yellow', onClick, href: to, className = '', type = 'button', disabled, small, external }:
  { children: React.ReactNode; color?: string; onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void; href?: string; className?: string; type?: 'button' | 'submit'; disabled?: boolean; small?: boolean; external?: boolean }) {
  const cls = `s-brick c-${color} ${small ? 'small' : ''} ${className}`
  const inner = <><span className="studs" aria-hidden="true"><i /><i /><i /><i /></span><span className="label">{children}</span></>
  if (to) return external ? <a className={cls} href={to} target="_blank" rel="noopener">{inner}</a> : <a className={cls} href={href(to)} onClick={e => onLinkClick(e, to)}>{inner}</a>
  return <button type={type} className={cls} onClick={onClick} disabled={disabled}>{inner}</button>
}
export function Link({ to, children, className = '', ...rest }: { to: string; children: React.ReactNode; className?: string } & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>) {
  return <a href={href(to)} onClick={e => onLinkClick(e, to)} className={className} {...rest}>{children}</a>
}
export function Pic({ src, alt = '', className = '', eager = false }: { src: string | null | undefined; alt?: string; className?: string; eager?: boolean }) {
  const [err, setErr] = useState(false)
  if (!src || err) return <span className={'s-nopic ' + className} aria-hidden="true"><Stud color="soft" size={28} /></span>
  return <img src={src} alt={alt} className={className} loading={eager ? 'eager' : 'lazy'} decoding="async" onError={() => setErr(true)} />
}

/* ---------- speech bubble that types ---------- */
export function Bubble({ lines, className = '', interval = 5200 }: { lines: string[]; className?: string; interval?: number }) {
  const [i, setI] = useState(0); const [shown, setShown] = useState('')
  useEffect(() => {
    let alive = true; let n = 0; const line = lines[i % lines.length]
    const tick = () => { if (!alive) return; n++; setShown(line.slice(0, n)); if (n < line.length) setTimeout(tick, 22) }
    setShown(''); setTimeout(tick, 120)
    const t = setTimeout(() => alive && setI(x => x + 1), interval)
    return () => { alive = false; clearTimeout(t) }
  }, [i, lines, interval])
  return <span className={'s-bubble ' + className} aria-live="polite">{shown}<i className="caret" /></span>
}

/* ---------- set card ---------- */
export function SetCard({ item, eager = false }: { item: ShopItem; eager?: boolean }) {
  const t = useT(); const cart = useCart(); const n = inCart(item.id)
  const color = themeColor(item.theme)
  const [bump, setBump] = useState(false)
  const to = `/set/${item.set_num || item.id}`
  const add = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault(); e.stopPropagation()
    const ok = addToCart(item); if (!ok) return
    setBump(true); setTimeout(() => setBump(false), 700)
    flyToCart((e.currentTarget as HTMLElement).closest('.s-card')?.querySelector('img') as HTMLImageElement | null, item.image_url)
  }
  void cart
  return <article className={`s-card c-${color} ${bump ? 'bump' : ''}`}>
    <span className="s-card-studs" aria-hidden="true"><i /><i /><i /><i /></span>
    <Link to={to} className="s-card-pic"><Pic src={item.image_url} alt={item.name || ''} eager={eager} /></Link>
    <div className="s-card-tags">
      {item.retired && <span className="s-tag t-red">{t('retired_tag')}</span>}
      {isNew(item) && <span className="s-tag t-green">{t('new_tag')}</span>}
      {item.qty === 1 && !item.demo && <span className="s-tag t-ink">{t('last_one')}</span>}
      {item.demo && <span className="s-tag t-demo">{t('demo_tag')}</span>}
    </div>
    <div className="s-card-body">
      <Link to={to} className="s-card-name">{item.name}</Link>
      <div className="s-card-meta ltr"><span>{item.number}</span>{item.pieces ? <span>{item.pieces.toLocaleString('en-US')} {t('pieces')}</span> : null}{item.theme && <span>{item.theme}</span>}</div>
    </div>
    <div className="s-card-foot">
      <span className="s-price">{fmtPrice(item.price)}</span>
      <Brick small color={n ? 'green' : 'yellow'} onClick={add} className="s-card-cta">{n ? `${t('added')} · ${n}` : t('want')}</Brick>
    </div>
  </article>
}

/* image flies into the cart button */
export function flyToCart(img: HTMLImageElement | null, src: string | null) {
  const target = document.querySelector('.s-cartbtn') as HTMLElement | null
  if (!target) return
  const from = img?.getBoundingClientRect() || { left: innerWidth / 2, top: innerHeight / 2, width: 120, height: 120 }
  const to = target.getBoundingClientRect()
  const ghost = document.createElement('img'); ghost.src = src || img?.src || ''; ghost.className = 's-fly'
  Object.assign(ghost.style, { left: from.left + 'px', top: from.top + 'px', width: from.width + 'px', height: from.height + 'px' })
  document.body.appendChild(ghost)
  requestAnimationFrame(() => {
    Object.assign(ghost.style, { left: to.left + to.width / 2 - 14 + 'px', top: to.top + to.height / 2 - 14 + 'px', width: '28px', height: '28px', opacity: '0.2', transform: 'rotate(-20deg)' })
  })
  setTimeout(() => { ghost.remove(); target.classList.add('pop'); setTimeout(() => target.classList.remove('pop'), 500) }, 720)
}

/* ---------- header ---------- */
export function Header({ onSearch }: { onSearch?: (q: string) => void }) {
  const t = useT(); const { path } = useRoute(); const cart = useCart(); const lang = getLang()
  const [q, setQ] = useState('')
  const [solid, setSolid] = useState(false)
  useEffect(() => { const f = () => setSolid(scrollY > 24); f(); addEventListener('scroll', f, { passive: true }); return () => removeEventListener('scroll', f) }, [])
  const submit = (e: React.FormEvent) => { e.preventDefault(); if (onSearch) onSearch(q); else navigate('/sets?q=' + encodeURIComponent(q)) }
  const nav = [['/sets', t('nav_sets')], ['/sets?f=retired', t('nav_retired')], ['/collectors', t('nav_collectors')], ['/about', t('nav_about')]] as const
  return <header className={'s-header ' + (solid ? 'solid' : '')}>
    <div className="s-wrap s-header-in">
      <Logo />
      <nav className="s-nav" aria-label="main">{nav.map(([to, label]) => <Link key={to} to={to} className={path === to.split('?')[0] && (to.includes('?') ? location.search.includes('f=retired') : !location.search.includes('f=retired')) ? 'on' : ''}>{label}</Link>)}</nav>
      <form className="s-search" onSubmit={submit} role="search"><input value={q} onChange={e => setQ(e.target.value)} placeholder={t('search_ph')} aria-label={t('search_ph')} /><button type="submit" aria-label="search"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg></button></form>
      <button type="button" className="s-lang" onClick={() => setLang(lang === 'he' ? 'en' : 'he')} aria-label="language">{t('lang_switch')}</button>
      <button type="button" className="s-cartbtn" onClick={() => openDrawer(true)} aria-label={t('nav_cart')}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9h18l-1.5 10.5a1 1 0 0 1-1 .5h-13a1 1 0 0 1-1-.5L3 9Z" /><path d="M8 9V7a4 4 0 0 1 8 0v2" /><path d="M7 13h10M7 16h10" /></svg>
        {cart.count > 0 && <span className="s-cartcount">{cart.count}</span>}
      </button>
    </div>
  </header>
}

/* ---------- footer ---------- */
export function Footer() {
  const t = useT()
  return <footer className="s-footer">
    <div className="s-wrap s-footer-in">
      <div className="s-footer-joey"><Clip src={CLIP.peek} poster={JOEY.peek} className="s-peek" /></div>
      <div className="s-footer-text">
        <Logo className="light" />
        <p>{t('legal')}</p>
        <p className="s-footer-made">{t('footer_made')} · <a href={waLink(DEFAULT_WA, lang() === 'he' ? 'היי, הגעתי מ BRICK Shop' : 'Hi, I came from BRICK Shop')} target="_blank" rel="noopener">WhatsApp</a></p>
      </div>
    </div>
  </footer>
}
function lang() { return getLang() }

/* ---------- cart drawer ---------- */
export function CartDrawer() {
  const t = useT(); const open = useDrawer(); const cart = useCart()
  const [fetched, setFetched] = useState(false)
  useEffect(() => { const e = takeLastEvent(); if (e) { setFetched(true); const to = setTimeout(() => setFetched(false), 2200); return () => clearTimeout(to) } }, [cart.count])
  useEffect(() => { document.body.classList.toggle('s-noscroll', open); return () => document.body.classList.remove('s-noscroll') }, [open])
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape') openDrawer(false) }; addEventListener('keydown', k); return () => removeEventListener('keydown', k) }, [])
  return <>
    <div className={'s-scrim ' + (open ? 'on' : '')} onClick={() => openDrawer(false)} />
    <aside className={'s-drawer ' + (open ? 'on' : '')} aria-hidden={!open} aria-label={t('cart_title')}>
      <div className="s-drawer-top">
        <img src={JOEY.peek} alt="" className="s-drawer-joey" />
        <h2>{t('cart_title')}</h2>
        <button type="button" className="s-x" onClick={() => openDrawer(false)} aria-label={t('fb_close')}>×</button>
      </div>
      {cart.lines.length === 0 ? <div className="s-drawer-empty">
        <Clip src={CLIP.nap} poster={JOEY.nap} className="s-napclip" />
        <b>{t('cart_empty')}</b><span>{t('cart_empty_sub')}</span>
        <Brick onClick={() => { openDrawer(false); navigate('/sets') }}>{t('cart_go')}</Brick>
      </div> : <>
        <ul className="s-lines">
          {cart.lines.map(l => <li key={l.id} className={`c-${themeColor(l.theme)}`}>
            <Pic src={l.image} alt="" />
            <div className="s-line-body">
              <b>{l.name}</b>
              <span className="ltr muted">{l.set_num?.replace(/-1$/, '')}{l.demo ? ' · ' + t('demo_tag') : ''}</span>
              <div className="s-qty"><button type="button" onClick={() => setQty(l.id, l.qty - 1)} aria-label="-">−</button><span>{l.qty}</span><button type="button" onClick={() => setQty(l.id, l.qty + 1)} disabled={l.qty >= l.max} aria-label="+" title={l.qty >= l.max ? t('cart_max') : ''}>+</button></div>
            </div>
            <div className="s-line-end"><span className="s-price">{fmtPrice(l.price * l.qty)}</span><button type="button" className="s-linkbtn" onClick={() => removeLine(l.id)}>{t('cart_remove')}</button></div>
          </li>)}
        </ul>
        <div className="s-drawer-foot">
          <div className="s-total"><span>{t('cart_total')} · {cart.count} {t('cart_items')}</span><b>{fmtPrice(cart.total)}</b></div>
          <Brick color="yellow" onClick={() => { openDrawer(false); navigate('/checkout') }}>{t('cart_checkout')}</Brick>
          <button type="button" className="s-linkbtn center" onClick={() => openDrawer(false)}>{t('cart_keep')}</button>
        </div>
      </>}
    </aside>
    <div className={'s-fetched ' + (fetched ? 'on' : '')} aria-hidden={!fetched}><img src={JOEY.fetch} alt="" /><span>{t('joey_fetched')}</span></div>
  </>
}

/* Joey occasionally runs across the bottom of the screen */
export function Runner() {
  const [show, setShow] = useState(false)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let t = setTimeout(() => setShow(true), 9000)
    const loop = () => { t = setTimeout(() => setShow(true), 38000 + Math.random() * 20000) }
    const off = () => { setShow(false); loop() }
    window.addEventListener('bs-run-done', off)
    return () => { clearTimeout(t); window.removeEventListener('bs-run-done', off) }
  }, [])
  if (!show) return null
  return <div className="s-runner" aria-hidden="true"><Clip src={CLIP.run} loop={false} onEnded={() => window.dispatchEvent(new Event('bs-run-done'))} /></div>
}

/* ---------- review notes (floating) ---------- */
export function Feedback() {
  const t = useT(); const { path } = useRoute()
  const [open, setOpen] = useState(false)
  const [notes, setNotes] = useState<Record<string, string>>(() => { try { return JSON.parse(localStorage.getItem('bs_notes') || '{}') } catch { return {} } })
  const [copied, setCopied] = useState(false)
  const ta = useRef<HTMLTextAreaElement>(null)
  const key = path + location.search
  const save = (v: string) => { const n = { ...notes, [key]: v }; if (!v.trim()) delete n[key]; setNotes(n); try { localStorage.setItem('bs_notes', JSON.stringify(n)) } catch { /* ignore */ } }
  const all = Object.entries(notes).map(([k, v]) => `[${k}]\n${v}`).join('\n\n')
  const copy = async () => { try { await navigator.clipboard.writeText(all || t('fb_none')); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch { ta.current?.select() } }
  const count = Object.keys(notes).length
  return <>
    <button type="button" className="s-fb" onClick={() => setOpen(o => !o)}>{t('fb_btn')}{count > 0 && <b>{count}</b>}</button>
    {open && <div className="s-fb-panel">
      <div className="s-fb-head"><b>{t('fb_title')}</b><button type="button" className="s-x" onClick={() => setOpen(false)}>×</button></div>
      <p className="muted">{t('fb_sub')}</p>
      <label className="muted">{t('fb_page')} <code className="ltr">{key}</code></label>
      <textarea ref={ta} value={notes[key] || ''} onChange={e => save(e.target.value)} rows={5} />
      <div className="s-fb-actions">
        <Brick small onClick={copy}>{copied ? t('copied') : t('fb_copy')}</Brick>
        <a className="s-linkbtn" href={waLink(DEFAULT_WA, all)} target="_blank" rel="noopener">WhatsApp</a>
        <button type="button" className="s-linkbtn danger" onClick={() => { if (confirm('?')) { setNotes({}); localStorage.removeItem('bs_notes') } }}>{t('fb_clear')}</button>
      </div>
    </div>}
  </>
}

/* ---------- intro moment (first visit only) ---------- */
export function Intro({ onDone }: { onDone: () => void }) {
  const t = useT()
  const [phase, setPhase] = useState(0)
  useEffect(() => {
    const steps = [400, 1500, 2300, 3100]
    const ts = steps.map((ms, i) => setTimeout(() => setPhase(i + 1), ms))
    const end = setTimeout(onDone, 3600)
    return () => { ts.forEach(clearTimeout); clearTimeout(end) }
  }, [onDone])
  return <div className={`s-intro p${phase}`} role="dialog" aria-label="BRICK HOUSE">
    <div className="s-intro-grid" aria-hidden="true" />
    <div className="s-intro-logo" aria-hidden="true">
      <span className="w">BR</span>
      <span className="stack"><i className="b1" /><i className="b2" /><i className="b3" /><i className="b4" /></span>
      <span className="w">CK</span>
      <span className="house">HOUSE</span>
    </div>
    <div className="s-intro-joey" aria-hidden="true"><img src={JOEY.run} alt="" /></div>
    <button type="button" className="s-intro-skip" onClick={onDone}>{t('skip')}</button>
  </div>
}

/* demo banner */
export function DemoBanner({ on }: { on: boolean }) {
  const t = useT(); const [hide, setHide] = useState(() => sessionStorage.getItem('bs_demo_hide') === '1')
  if (!on || hide) return null
  return <div className="s-demo"><span>{t('demo_banner')}</span><button type="button" onClick={() => { setHide(true); sessionStorage.setItem('bs_demo_hide', '1') }} aria-label="close">×</button></div>
}

export { clearCart, cartLines, isRare }

/* mobile bottom nav */
export function MobileNav() {
  const t = useT(); const { path } = useRoute(); const cart = useCart()
  const tabs: [string, string, string][] = [['/', getLang() === 'he' ? 'ראשי' : 'Home', 'yellow'], ['/sets', t('nav_sets'), 'red'], ['/collectors', t('nav_collectors'), 'blue'], ['cart', t('nav_cart'), 'green']]
  return <nav className="s-mnav" aria-label="mobile">
    {tabs.map(([to, label, c]) => to === 'cart'
      ? <a key={to} href="#" onClick={e => { e.preventDefault(); openDrawer(true) }} className={cart.count ? 'on' : ''}><Stud color={c} size={22} />{label}{cart.count ? ` · ${cart.count}` : ''}</a>
      : <Link key={to} to={to} className={path === to ? 'on' : ''}><Stud color={c} size={22} />{label}</Link>)}
  </nav>
}
