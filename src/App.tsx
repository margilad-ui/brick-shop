import { useCallback, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import { flushQueue, InventoryRow, loadInventory, loadLocations, Location, queued } from './lib/api'
import { JOEY, Logo, Stud, toast, Toaster } from './components/Bits'
import { Login } from './screens/Login'
import { Add } from './screens/Add'
import { Inventory } from './screens/Inventory'
import { More } from './screens/More'

type Tab = 'inventory' | 'add' | 'more'

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [tab, setTab] = useState<Tab>(() => (location.hash.replace('#', '') as Tab) || 'add')
  const [locations, setLocations] = useState<Location[]>([])
  const [rows, setRows] = useState<InventoryRow[]>([])
  const [owner, setOwner] = useState<boolean | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])
  useEffect(() => { location.hash = tab }, [tab])

  const reload = useCallback(async () => {
    try { const [l, r] = await Promise.all([loadLocations(), loadInventory()]); setLocations(l); setRows(r); setOwner(true) }
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
  if (owner === false) return <div className="login"><div className="box"><Logo /><img src={JOEY.curious} alt="" /><div style={{ textAlign: 'center' }}>המשתמש {session.user.email} מחובר, אבל אינו רשום כבעלים של BRICK Shop.</div><button className="btn" type="button" onClick={() => supabase.auth.signOut()}>יציאה</button></div></div>

  const tabs: { k: Tab; he: string; color: string }[] = [{ k: 'inventory', he: 'מלאי', color: '' }, { k: 'add', he: 'הוספה', color: 'red' }, { k: 'more', he: 'עוד', color: 'ink' }]

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
        {tab === 'inventory' && <Inventory rows={rows} locations={locations} reload={reload} />}
        {tab === 'more' && <More rows={rows} locations={locations} email={session.user.email || ''} />}
      </div>
      <Toaster />
    </div>
  )
}
