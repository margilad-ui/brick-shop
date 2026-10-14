import { useState } from 'react'
import { supabase, configured } from '../lib/supabase'
import { JOEY, Logo } from '../components/Bits'

export function Login() {
  const [email, setEmail] = useState('mar.gilad@gmail.com')
  const [pw, setPw] = useState('')
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function go(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMsg(null)
    try {
      if (mode === 'in') {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pw })
        if (error) throw error
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password: pw })
        if (error) throw error
        if (data.session) return
        setMsg('נשלח מייל אימות. לחץ על הקישור שבו (גם אם הדף שנפתח אחריו נראה שבור), ואז חזור לכאן והתחבר.')
      }
    } catch (err) {
      setMsg((err as Error).message === 'Invalid login credentials' ? 'אימייל או סיסמה לא נכונים' : (err as Error).message)
    } finally { setBusy(false) }
  }

  return (
    <div className="login">
      <form className="box" onSubmit={go}>
        <Logo />
        <img src={JOEY.head} alt="" />
        <div className="eyebrow" style={{ textAlign: 'center' }}>{mode === 'in' ? 'כניסה למשרד האחורי' : 'הרשמה ראשונה'}</div>
        {!configured && <div className="muted">חסרה הגדרת חיבור ל Supabase.</div>}
        <div className="field"><label htmlFor="email">אימייל</label><input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="username" required /></div>
        <div className="field"><label htmlFor="pw">סיסמה</label><input id="pw" type="password" value={pw} onChange={e => setPw(e.target.value)} autoComplete={mode === 'in' ? 'current-password' : 'new-password'} minLength={8} required /></div>
        {msg && <div className="muted" style={{ color: 'var(--ink)' }}>{msg}</div>}
        <button className="cta" type="submit" disabled={busy}>{busy ? '...' : mode === 'in' ? 'כניסה' : 'צור משתמש'}</button>
        <button type="button" className="btn" onClick={() => setMode(mode === 'in' ? 'up' : 'in')}>{mode === 'in' ? 'פעם ראשונה? הרשמה' : 'כבר יש משתמש? כניסה'}</button>
      </form>
    </div>
  )
}
