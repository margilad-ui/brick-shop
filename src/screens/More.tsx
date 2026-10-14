import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { InventoryRow, keyUsage, Location, syncYear, WALL_NAME } from '../lib/api'
import { Loc, toast } from '../components/Bits'

export function More({ rows, locations, email }: { rows: InventoryRow[]; locations: Location[]; email: string }) {
  const [keys, setKeys] = useState({ brickset: '', rebrickable: '' })
  const [haveKeys, setHaveKeys] = useState<string[]>([])
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [year, setYear] = useState(new Date().getFullYear())
  const [log, setLog] = useState<string[]>([])
  const [catalogCount, setCatalogCount] = useState<number | null>(null)

  async function load() {
    const { data: s } = await supabase.from('bs_secrets').select('name')
    setHaveKeys((s || []).map(r => r.name))
    const { data: st } = await supabase.from('bs_settings').select('key,value')
    const o: Record<string, string> = {}; (st || []).forEach(r => { o[r.key] = String(r.value) }); setSettings(o)
    const { count } = await supabase.from('bs_catalog').select('*', { count: 'exact', head: true })
    setCatalogCount(count ?? 0)
  }
  useEffect(() => { load() }, [])

  async function saveKeys() {
    setBusy(true)
    try {
      const rows = [] as { name: string; value: string }[]
      if (keys.brickset.trim()) rows.push({ name: 'BRICKSET_API_KEY', value: keys.brickset.trim() })
      if (keys.rebrickable.trim()) rows.push({ name: 'REBRICKABLE_API_KEY', value: keys.rebrickable.trim() })
      if (!rows.length) return
      const { error } = await supabase.from('bs_secrets').upsert(rows, { onConflict: 'name' })
      if (error) throw error
      setKeys({ brickset: '', rebrickable: '' }); toast('המפתחות נשמרו'); load()
    } catch (e) { toast((e as Error).message, true) } finally { setBusy(false) }
  }
  async function saveSettings() {
    setBusy(true)
    try {
      const rows = Object.entries(settings).map(([key, value]) => ({ key, value: isNaN(Number(value)) ? JSON.stringify(value) : Number(value) }))
      const { error } = await supabase.from('bs_settings').upsert(rows as never, { onConflict: 'key' })
      if (error) throw error
      toast('ההגדרות נשמרו')
    } catch (e) { toast((e as Error).message, true) } finally { setBusy(false) }
  }
  async function sync(y: number) {
    setBusy(true); setLog(l => [`${y}: מושך...`, ...l])
    try {
      const r = await syncYear(y)
      if ('error' in r) throw new Error(r.error)
      setLog(l => [`${y}: נשמרו ${r.saved} סטים (${r.pages} קריאות)`, ...l.slice(1)])
      load()
    } catch (e) { setLog(l => [`${y}: שגיאה. ${(e as Error).message}`, ...l.slice(1)]) } finally { setBusy(false) }
  }
  async function usage() {
    try { const u = await keyUsage(); setLog(l => [JSON.stringify(u.apiKeyUsage?.slice?.(0, 3) ?? u), ...l]) } catch (e) { toast((e as Error).message, true) }
  }

  const perShelf = locations.map(l => ({ l, n: rows.filter(r => r.location === l.code && r.status !== 'sold').reduce((s, r) => s + r.qty, 0) }))

  return (
    <div className="page">
      <div className="card" style={{ padding: 16, display: 'grid', gap: 10 }}>
        <div className="eyebrow">מפתחות API</div>
        <p className="muted">המפתחות נשמרים בבסיס הנתונים, קריאים רק לשרת. שמורים כרגע: {haveKeys.length ? haveKeys.join(', ') : 'אין'}</p>
        <div className="field"><label>Brickset API key</label><input value={keys.brickset} onChange={e => setKeys({ ...keys, brickset: e.target.value })} placeholder={haveKeys.includes('BRICKSET_API_KEY') ? 'שמור. הדבק כדי להחליף' : 'הדבק כאן'} autoComplete="off" /></div>
        <div className="field"><label>Rebrickable API key</label><input value={keys.rebrickable} onChange={e => setKeys({ ...keys, rebrickable: e.target.value })} placeholder={haveKeys.includes('REBRICKABLE_API_KEY') ? 'שמור. הדבק כדי להחליף' : 'הדבק כאן'} autoComplete="off" /></div>
        <button className="btn primary" type="button" disabled={busy} onClick={saveKeys}>שמור מפתחות</button>
      </div>

      <div className="card" style={{ padding: 16, display: 'grid', gap: 10 }}>
        <div className="eyebrow">קטלוג</div>
        <p className="muted">בקטלוג המקומי יש {catalogCount ?? '...'} סטים. סריקת ברקוד מזהה רק סטים שכבר בקטלוג, לכן מושכים שנה אחר שנה (כל שנה 2 עד 4 קריאות מתוך 100 ביום).</p>
        <div className="frow">
          <input type="number" value={year} onChange={e => setYear(Number(e.target.value))} style={{ width: 100, border: '1px solid var(--line-2)', borderRadius: 10, padding: '8px 10px' }} aria-label="שנה" />
          <button className="btn primary" type="button" disabled={busy} onClick={() => sync(year)}>משוך שנה</button>
          <button className="btn" type="button" disabled={busy} onClick={async () => { for (let y = 2026; y >= 2018; y--) await sync(y) }}>משוך 2018 עד 2026</button>
          <button className="btn" type="button" onClick={usage}>מכסת Brickset</button>
        </div>
        {log.length > 0 && <div className="muted" style={{ fontFamily: 'var(--display)', fontSize: 12, direction: 'ltr', textAlign: 'left', whiteSpace: 'pre-wrap' }}>{log.slice(0, 12).join('\n')}</div>}
      </div>

      <div className="card" style={{ padding: 16, display: 'grid', gap: 10 }}>
        <div className="eyebrow">תמחור</div>
        <div className="field2">
          <div className="field"><label>שער דולר לשקל</label><input value={settings.usd_ils || ''} onChange={e => setSettings({ ...settings, usd_ils: e.target.value })} inputMode="decimal" /></div>
          <div className="field"><label>מקדם לסטים שפרשו</label><input value={settings.retired_multiplier || ''} onChange={e => setSettings({ ...settings, retired_multiplier: e.target.value })} inputMode="decimal" /></div>
        </div>
        <button className="btn primary" type="button" disabled={busy} onClick={saveSettings}>שמור הגדרות</button>
      </div>

      <div className="card" style={{ padding: 16, display: 'grid', gap: 10 }}>
        <div className="eyebrow">מדפים</div>
        <div className="chips">{perShelf.map(({ l, n }) => <span key={l.code} className="chip"><Loc code={l.code} small />{n}</span>)}</div>
        <p className="muted">{Object.entries(WALL_NAME).map(([k, v]) => `${k} = ${v}`).join(' · ')}. הוספת מדפים וקירות: בגרסה הבאה.</p>
      </div>

      <div className="card" style={{ padding: 16, display: 'grid', gap: 10 }}>
        <div className="eyebrow">חשבון</div>
        <p className="muted">{email}</p>
        <button className="btn" type="button" onClick={() => supabase.auth.signOut()}>יציאה</button>
      </div>
    </div>
  )
}
