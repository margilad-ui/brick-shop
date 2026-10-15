import { useCallback, useEffect, useState } from 'react'
import './shop.css'
import { applyDir, useLang } from './i18n'
import { match, useRoute } from './router'
import { useShop } from './data'
import { CartDrawer, DemoBanner, Feedback, Footer, Header, Intro, MobileNav, Runner } from './ui'
import { Home } from './pages/Home'
import { Sets } from './pages/Sets'
import { Collectors } from './pages/Collectors'
import { Product } from './pages/Product'
import { Checkout } from './pages/Checkout'
import { About, NotFound } from './pages/About'

export default function Shop() {
  useLang(); const { path } = useRoute()
  const { items, config, loading, error } = useShop()
  // the opening moment: once per 12 hours per browser, always with ?intro, never with ?nointro
  const [intro, setIntro] = useState(() => { try { if (location.search.includes('nointro')) return false; if (location.search.includes('intro')) return true; const at = Number(localStorage.getItem('bs_intro_at') || 0); return Date.now() - at > 12 * 3600e3 } catch { return false } })
  const endIntro = useCallback(() => { setIntro(false); try { localStorage.setItem('bs_intro_at', String(Date.now())) } catch { /* ignore */ } }, [])
  useEffect(() => { applyDir(); document.body.classList.add('s-body'); return () => document.body.classList.remove('s-body') }, [])
  useEffect(() => {
    const titles: Record<string, string> = { '/': 'BRICK Shop · BRICK HOUSE', '/sets': 'כל הערכות · BRICK Shop', '/collectors': 'לאספנים · BRICK Shop', '/checkout': 'הזמנה · BRICK Shop', '/about': 'BRICK HOUSE' }
    if (titles[path]) document.title = titles[path]
  }, [path])

  let page: React.ReactNode
  let p: Record<string, string> | null
  if (path === '/') page = <Home items={items} loading={loading} />
  else if (path === '/sets') page = <Sets items={items} loading={loading} />
  else if (path === '/collectors') page = <Collectors items={items} loading={loading} />
  else if ((p = match('/set/:id', path))) page = <Product id={p.id} items={items} loading={loading} />
  else if (path === '/checkout') page = <Checkout config={config} />
  else if (path === '/about') page = <About />
  else page = <NotFound />

  return <div className={'s-app ' + (intro ? 's-app-intro' : '')}>
    {intro && <Intro onDone={endIntro} />}
    <DemoBanner on={!!config.shop_demo} />
    <Header />
    {error && <div className="s-wrap s-err">{error}</div>}
    {page}
    <Footer />
    <MobileNav />
    <CartDrawer />
    <Runner />
    <Feedback />
  </div>
}
