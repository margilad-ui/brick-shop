import { useState } from 'react'
import { supabase, configured } from '../lib/supabase'
import { JOEY, Logo } from '../components/Bits'

/* Modes: in (password), up (first registration, then code), code (6-digit code from the mail),
   reset (send a recovery code), resetcode (type it), newpw (choose a new password while signed in by the code). */
type Mode = 'in' | 'up' | 'code' | 'reset' | 'resetcode' | 'newpw'

const TITLES: Record<Mode, string> = {
  in: 'כניסה למשרד האחורי', up: 'הרשמה ראשונה', code: 'אימות המייל',
  reset: 'שכחתי סיסמה', resetcode: 'הקוד מהמייל', newpw: 'סיסמה חדשה',
}
const CTAS: Record<Mode, string> = {
  in: 'כניסה', up: 'צור משתמש', code: 'אמת קוד', reset: 'שלח לי קוד', resetcode: 'אמת קוד', newpw: 'שמור סיסמה',
}

export function Login({ recovery = false, onDone }: { recovery?: boolean; onDone?: () => void } = {}) {
  const [email, setEmail] = useState('mar.gilad@gmail.com')
  const [pw, setPw] = useState('')
  const [mode, setMode] = useState<Mode>(recovery ? 'newpw' : 'in')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function go(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMsg(null)
    try {
      if (mode === 'in') {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pw })
        if (error) throw error
      } else if (mode === 'up') {
        const { data, error } = await supabase.auth.signUp({ email, password: pw })
        if (error) throw error
        if (data.session) return
        setMode('code'); setMsg('נשלח אליך מייל עם קוד בן 6 ספרות. הקלד אותו כאן.')
      } else if (mode === 'code') {
        const { error } = await supabase.auth.verifyOtp({ email, token: code.trim(), type: 'signup' })
        if (error) {
          const r = await supabase.auth.verifyOtp({ email, token: code.trim(), type: 'email' })
          if (r.error) throw error
        }
      } else if (mode === 'reset') {
        const { error } = await supabase.auth.resetPasswordForEmail(email)
        if (error) throw error
        setCode(''); setMode('resetcode'); setMsg('נשלח אליך מייל עם קוד בן 6 ספרות. הקלד אותו כאן ואז תבחר סיסמה חדשה.')
      } else if (mode === 'resetcode') {
        sessionStorage.setItem('bs_newpw', '1')
        const { error } = await supabase.auth.verifyOtp({ email, token: code.trim(), type: 'recovery' })
        if (error) { sessionStorage.removeItem('bs_newpw'); throw error }
        setPw(''); setMode('newpw'); setMsg('הקוד אומת. בחר סיסמה חדשה (8 תווים לפחות).')
      } else if (mode === 'newpw') {
        const { error } = await supabase.auth.updateUser({ password: pw })
        if (error) throw error
        sessionStorage.removeItem('bs_newpw'); setMsg('הסיסמה נשמרה.'); onDone?.()
      }
    } catch (err) {
      const m = (err as Error).message
      setMsg(m === 'Invalid login credentials' ? 'אימייל או סיסמה לא נכונים'
        : /expired|invalid/i.test(m) && (mode === 'code' || mode === 'resetcode') ? 'הקוד לא נכון או שפג תוקפו. אפשר לבקש קוד חדש.'
        : m)
    } finally { setBusy(false) }
  }

  const askCode = mode === 'code' || mode === 'resetcode'
  const askPw = mode === 'in' || mode === 'up' || mode === 'newpw'
  const askEmail = mode !== 'newpw'

  return (
    <div className="login">
      <form className="box" onSubmit={go}>
        <Logo />
        <img src={JOEY.head} alt="" />
        <div className="eyebrow" style={{ textAlign: 'center' }}>{TITLES[mode]}</div>
        {!configured && <div className="muted">חסרה הגדרת חיבור ל Supabase.</div>}
        {askEmail && <div className="field"><label htmlFor="email">אימייל</label><input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="username" required /></div>}
        {askPw && <div className="field"><label htmlFor="pw">{mode === 'newpw' ? 'סיסמה חדשה' : 'סיסמה'}</label><input id="pw" type="password" value={pw} onChange={e => setPw(e.target.value)} autoComplete={mode === 'in' ? 'current-password' : 'new-password'} minLength={8} required /></div>}
        {askCode && <div className="field"><label htmlFor="code">קוד האימות מהמייל (6 ספרות)</label><input id="code" inputMode="numeric" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} autoComplete="one-time-code" required /></div>}
        {msg && <div className="muted" style={{ color: 'var(--ink)' }}>{msg}</div>}
        <button className="cta" type="submit" disabled={busy}>{busy ? '...' : CTAS[mode]}</button>
        {mode === 'in' && <>
          <button type="button" className="btn" onClick={() => { setMsg(null); setMode('reset') }}>שכחתי סיסמה</button>
          <button type="button" className="btn" onClick={() => { setMsg(null); setMode('up') }}>פעם ראשונה? הרשמה</button>
          <button type="button" className="btn" onClick={() => { setMsg('הקלד את הקוד מהמייל.'); setMode('code') }}>קיבלתי קוד במייל</button>
        </>}
        {mode !== 'in' && mode !== 'newpw' && <button type="button" className="btn" onClick={() => { setMsg(null); setMode('in') }}>חזרה לכניסה</button>}
        {mode === 'resetcode' && <button type="button" className="btn" onClick={() => { setMsg(null); setMode('reset') }}>שלח קוד חדש</button>}
      </form>
    </div>
  )
}
