import { useCallback, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import { flushQueue, InventoryRow, loadInventory, loadLocations, loadZones, Location, queued, Zone } from './lib/api'
import { JOEY, Logo, Stud, toast, Toaster } from './components/Bits'
import { Login } from './screens/Login'
import { Add } from './screens/Add'
import { Inventory } from './screens/Inventory'
import { Settings } from './screens/Settings'

type Tab = 'inventory' | 'add' | 'settings'

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  // ?p=3001.11 comes from the QR on a part label: open that part
  const [openPart, setOpenPart] = useState<string | null>(() => new URLSearchParams(location.search).get('p'))
  const [tab, setTab] = useState<Tab>(() => { if (new URLSearchParams(location.search).get('p')) return 'inventory'; const h = location.hash.replace('#', ''); return (['inventory', 'add', 'settings'].includes(h) ? h : 'add') as Tab })
  const partOpened = useCallback(() => { setOpenPart(null); const u = new URL(location.href); u.searchParams.delete('p'); history.replaceState(null, '', u.pathname + u.search + u.hash) }, [])
  useEffect(() => { const f = (e: Event) => { setOpenPart((e as CustomEvent<string>).detail); setTab('inventory') }; window.addEventListener('bs:openpart', f); return () => window.removeEventListener('bs:openpart', f) }, [])
  const [locations, setLocations] = useState<Location[]>([])
  const [zones, setZones] = useState<Zone[]>([])
  const [rows, setRows] = useState<InventoryRow[]>([])
  const [owner, setOwner] = useState<boolean | null>(null)
  // after a recovery code was verified, the user is signed in but still has to choose a new password
  const [newPw, setNewPw] = useState(() => sessionStorage.getItem('bs_newpw') === '1')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => { setSession(s); if (sessionStorage.getItem('bs_newpw') === '1') setNewPw(true) })
    return () => sub.subscription.unsubscribe()
  }, [])
  useEffect(() => { location.hash = tab }, [tab])

  const reload = useCallback(async () => {
    try { const [z, l, r] = await Promise.all([loadZones(), loadLocations(), loadInventory()]); setZones(z); setLocations(l); setRows(r); setOwner(true) }
    catch (e) { const m = (e as Error).message || ''; if (/permission|policy|denied/i.test(m)) setOwner(false); else toast('טעינה נכשלה: ' + m, true) }
  }, [])

  useEffect(() => {
    if (!session) return
    reload()
    if (queued().length) flushQueue().then(n => { if (n) { toast(`${n} הוספות מהתור עלו`); reload() } })
    const onl = () => { if (queued().length) flushQueue().then(n => { if (n) { toast(`${n} הוספות מהתור עלו`); reload() } }) }
    window.addEventListener('online', onl); return () => window.removeEventListener('online', onl)
  }, [session, reload])

  if (session === undefined) return <div className="login"><div className="box"><Logo /><div className="muted" style={{ textAlign: 'center' }}>טוען...</div></div></div>
  if (!session) return <Login />
  if (newPw) return <Login recovery onDone={() => { sessionStorage.removeItem('bs_newpw'); setNewPw(false) }} />
  if (owner === false) return <div className="login"><div className="box"><Logo /><img src={JOEY.curious} alt="" /><div style={{ textAlign: 'center' }}>המשתמש {session.user.email} מחובר, אבל אינו רשום כבעלים של BRICK Shop.</div><button className="btn" type="button" onClick={() => supabase.auth.signOut()}>יציאה</button></div></div>

  const tabs: { k: Tab; he: string; color: string }[] = [{ k: 'inventory', he: 'מלאי', color: '' }, { k: 'add', he: 'הוספה', color: 'red' }, { k: 'settings', he: 'הגדרות', color: 'ink' }]

  return (
    <div className="shell">
      <nav className="tabs" aria-label="ניווט">
        <div className="sidelogo"><Logo /></div>
        {tabs.map(t => <button key={t.k} type="button" className={tab === t.k ? 'on' : ''} onClick={() => setTab(t.k)}><Stud color={tab === t.k ? '' : 'soft'} />{t.he}</button>)}
        <div className="sideme"><img src={JOEY.head} alt="" /><div>{session.user.email}<br /><span style={{ fontSize: 11, opacity: .7 }}>{rows.filter(r => r.status !== 'sold').reduce((s, r) => s + r.qty, 0)} פריטים במלאי</span></div></div>
      </nav>
      <div style={{ minWidth: 0 }}>
        <header className="bar"><Logo short /><div className="me"><span>{tabs.find(t => t.k === tab)?.he}</span><img src={JOEY.head} alt="" /></div></header>
        {tab === 'add' && <Add locations={locations} />}
        {tab === 'inventory' && <Inventory rows={rows} locations={locations} zones={zones} reload={reload} openPart={openPart} onOpened={partOpened} />}
        {tab === 'settings' && <Settings rows={rows} locations={locations} zones={zones} email={session.user.email || ''} reload={reload} />}
      </div>
      <Toaster />
    </div>
  )
}
