import { useEffect, useState } from 'react'
import { fmtPrice, getLang, useT } from '../i18n'
import { placeOrder, waLink, type ShopConfig, DEFAULT_BIT, DEFAULT_WA } from '../data'
import { clearCart, useCart } from '../cart'
import { Brick, Pic, Stud } from '../ui'
import { JOEY } from '../joey'
import { navigate } from '../router'

type Done = { number: number; pay: 'bit' | 'whatsapp'; total: number; text: string }

export function Checkout({ config }: { config: ShopConfig }) {
  const t = useT(); const cart = useCart()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState({ name: '', phone: '', city: '', note: '', delivery: 'pickup' as 'pickup' | 'delivery', pay: 'bit' as 'bit' | 'whatsapp' })
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('')
  const [done, setDone] = useState<Done | null>(() => { try { return JSON.parse(sessionStorage.getItem('bs_done') || 'null') } catch { return null } })
  const wa = config.shop_whatsapp || DEFAULT_WA; const bit = config.shop_bit_phone || DEFAULT_BIT
  const he = getLang() === 'he'
  useEffect(() => { if (!done && cart.lines.length === 0) navigate('/sets', { replace: true }) }, [cart.lines.length, done])
  const okStep1 = form.name.trim().length >= 2 && form.phone.replace(/\D/g, '').length >= 9

  const place = async () => {
    setBusy(true); setErr('')
    try {
      const items = cart.lines.map(l => ({ set_num: l.set_num, name: l.name, qty: l.qty, price: l.price, demo: l.demo }))
      const r = await placeOrder({ customer_name: form.name.trim(), phone: form.phone.trim(), city: form.city.trim(), delivery: form.delivery, note: form.note.trim(), items, total: cart.total, pay_method: form.pay, lang: getLang() })
      const lines = cart.lines.map(l => `• ${l.name} (${(l.set_num || '').replace(/-1$/, '')}) × ${l.qty} · ${fmtPrice(l.price * l.qty)}`).join('\n')
      const text = he
        ? `הזמנה #${r.number} · BRICK Shop\n${form.name} · ${form.phone}${form.city ? ' · ' + form.city : ''}\n${form.delivery === 'pickup' ? 'איסוף מראש פינה' : 'משלוח'}\n\n${lines}\n\nסה"כ ${fmtPrice(cart.total)}\n${form.pay === 'bit' ? 'שולם בביט, לאימות' : 'תשלום: נסגור בוואטסאפ'}${form.note ? '\nהערה: ' + form.note : ''}`
        : `Order #${r.number} · BRICK Shop\n${form.name} · ${form.phone}${form.city ? ' · ' + form.city : ''}\n${form.delivery === 'pickup' ? 'Pickup in Rosh Pina' : 'Delivery'}\n\n${lines}\n\nTotal ${fmtPrice(cart.total)}\n${form.pay === 'bit' ? 'Paid with Bit, please confirm' : 'Payment: to settle on WhatsApp'}${form.note ? '\nNote: ' + form.note : ''}`
      const d: Done = { number: r.number, pay: form.pay, total: cart.total, text }
      sessionStorage.setItem('bs_done', JSON.stringify(d)); setDone(d); clearCart(); window.scrollTo({ top: 0 })
    } catch (e) { setErr((e as Error).message || t('co_error')) } finally { setBusy(false) }
  }

  if (done) return <DoneView d={done} wa={wa} bit={bit} />

  const steps = [t('co_step1'), t('co_step2'), t('co_step3')]
  return <main className="s-wrap s-section s-checkout">
    <h1 className="s-h1">{t('co_title')}</h1>
    <ol className="s-steps" aria-label="steps">{steps.map((s, i) => <li key={s} className={i < step ? 'done' : i === step ? 'on' : ''}><Stud color={i <= step ? 'yellow' : 'soft'} size={18} /><span>{s}</span></li>)}</ol>
    <div className="s-co-grid">
      <form className="s-co-form" onSubmit={e => { e.preventDefault(); if (step < 2) setStep(step + 1); else place() }}>
        {step === 0 && <>
          <label><span>{t('co_name')}</span><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} autoComplete="name" required minLength={2} /></label>
          <label><span>{t('co_phone')}</span><input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} inputMode="tel" autoComplete="tel" required className="ltr" /></label>
          <label><span>{t('co_city')}</span><input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} autoComplete="address-level2" /></label>
          <label><span>{t('co_note')}</span><textarea value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} placeholder={t('co_note_ph')} rows={3} /></label>
          <p className="muted">{t('co_required')}</p>
        </>}
        {step === 1 && <div className="s-options">
          {(['pickup', 'delivery'] as const).map(k => <label key={k} className={'s-option ' + (form.delivery === k ? 'on' : '')}><input type="radio" name="delivery" checked={form.delivery === k} onChange={() => setForm({ ...form, delivery: k })} /><b>{t(k === 'pickup' ? 'co_pickup' : 'co_delivery')}</b><span>{t(k === 'pickup' ? 'co_pickup_sub' : 'co_delivery_sub')}</span></label>)}
        </div>}
        {step === 2 && <div className="s-options">
          {(['bit', 'whatsapp'] as const).map(k => <label key={k} className={'s-option ' + (form.pay === k ? 'on' : '')}><input type="radio" name="pay" checked={form.pay === k} onChange={() => setForm({ ...form, pay: k })} /><b>{t(k === 'bit' ? 'co_bit' : 'co_wa')}</b><span>{t(k === 'bit' ? 'co_bit_sub' : 'co_wa_sub')}</span></label>)}
          {err && <p className="s-err">{err}</p>}
        </div>}
        <div className="s-co-actions">
          {step > 0 && <button type="button" className="s-linkbtn" onClick={() => setStep(step - 1)}>{t('co_back')}</button>}
          <Brick type="submit" color={step === 2 ? 'green' : 'yellow'} disabled={busy || (step === 0 && !okStep1)}>{step === 2 ? t('co_place') : t('co_next')}</Brick>
        </div>
      </form>
      <aside className="s-co-summary">
        <h2 className="s-h3">{t('co_summary')}</h2>
        <ul>{cart.lines.map(l => <li key={l.id}><Pic src={l.image} alt="" /><span>{l.name}<em className="ltr"> × {l.qty}</em></span><b>{fmtPrice(l.price * l.qty)}</b></li>)}</ul>
        <div className="s-total"><span>{t('cart_total')}</span><b>{fmtPrice(cart.total)}</b></div>
        <p className="muted">{t('price_incl')}</p>
        <img src={JOEY.wait} alt="" className="s-co-joey" />
      </aside>
    </div>
  </main>
}

function DoneView({ d, wa, bit }: { d: Done; wa: string; bit: string }) {
  const t = useT(); const [c, setC] = useState('')
  const copy = async (v: string, k: string) => { try { await navigator.clipboard.writeText(v); setC(k); setTimeout(() => setC(''), 1400) } catch { /* ignore */ } }
  const bitDisplay = bit.replace(/^(\d{3})(\d{3})(\d{4})$/, '$1-$2-$3')
  return <main className="s-wrap s-section s-done">
    <div className="s-done-card">
      <img src={JOEY.wave} alt="" className="s-done-joey" />
      <span className="s-tag t-green">{t('done_joey')}</span>
      <h1 className="s-h1">{t('done_title')} <span className="ltr">#{d.number}</span></h1>
      {d.pay === 'bit' ? <>
        <h2 className="s-h3">{t('done_bit_title')}</h2>
        <div className="s-bit">
          <div className="s-bit-row"><span>{t('done_bit_1')}</span><b className="ltr">{fmtPrice(d.total)}</b><button type="button" className="s-chip" onClick={() => copy(String(Math.round(d.total)), 'amt')}>{c === 'amt' ? t('copied') : t('copy')}</button></div>
          <div className="s-bit-row"><span>{t('done_bit_2')}</span><b className="ltr">{bitDisplay}</b><button type="button" className="s-chip" onClick={() => copy(bit, 'ph')}>{c === 'ph' ? t('copied') : t('copy')}</button></div>
          <div className="s-bit-row"><span>{t('done_bit_3')}</span><b className="ltr">#{d.number}</b><button type="button" className="s-chip" onClick={() => copy('#' + d.number, 'no')}>{c === 'no' ? t('copied') : t('copy')}</button></div>
        </div>
        <Brick color="green" href={waLink(wa, d.text)} external>{t('done_bit_send')}</Brick>
      </> : <>
        <h2 className="s-h3">{t('done_wa_title')}</h2>
        <p>{t('done_wa_1')}</p>
        <Brick color="green" href={waLink(wa, d.text)} external>{t('done_wa_send')}</Brick>
      </>}
      <pre className="s-order-text">{d.text}</pre>
      <button type="button" className="s-linkbtn" onClick={() => { sessionStorage.removeItem('bs_done'); navigate('/') }}>{t('done_back')}</button>
    </div>
  </main>
}
