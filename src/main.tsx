import React, { lazy, Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'

registerSW({ immediate: true })

/* Two faces, one app: the customer shop lives under /shop, everything else is the back office. */
const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '')
const isShop = location.pathname === base + '/shop' || location.pathname.startsWith(base + '/shop/')

const Root = isShop
  ? lazy(() => import('./shop/Shop'))
  : lazy(() => Promise.all([import('./App'), import('./styles.css')]).then(([m]) => ({ default: m.default })))

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Suspense fallback={null}><Root /></Suspense>
  </React.StrictMode>
)
