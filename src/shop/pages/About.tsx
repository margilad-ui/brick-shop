import { getLang, useT } from '../i18n'
import { waLink, DEFAULT_WA } from '../data'
import { Brick, Stud } from '../ui'
import { JOEY } from '../joey'

export function About() {
  const t = useT()
  const rooms = [['about_room_shop', 'about_room_shop_s', 'yellow', true], ['about_room_cafe', 'about_room_cafe_s', 'red', false], ['about_room_gallery', 'about_room_gallery_s', 'blue', false], ['about_room_lab', 'about_room_lab_s', 'green', false]] as const
  return <main className="s-about">
    <section className="s-wrap s-about-hero">
      <div><h1 className="s-display small"><span>BRICK</span><span>HOUSE</span></h1><p className="s-lead">{t('about_sub')}</p></div>
      <img src={JOEY.sit} alt="" className="s-about-joey" />
    </section>
    <section className="s-wrap s-about-text">
      <p>{t('about_p1')}</p><p>{t('about_p2')}</p>
    </section>
    <section className="s-wrap s-section">
      <h2 className="s-h2">{t('about_rooms_t')}</h2>
      <div className="s-rooms">{rooms.map(([k, s, c, open]) => <div key={k} className={`s-room c-${c} ${open ? '' : 'closed'}`}><span className="studs" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /></span><b>{t(k)}</b><span>{t(s)}</span></div>)}</div>
    </section>
    <section className="s-wrap s-section s-about-joeycard">
      <img src={JOEY.fetch} alt="" />
      <div><h2 className="s-h2">{t('about_joey_t')}</h2><p>{t('about_joey_p')}</p></div>
    </section>
    <section className="s-wrap s-section s-center">
      <Stud color="yellow" size={22} />
      <h2 className="s-h2">{t('about_contact')}</h2>
      <Brick color="green" href={waLink(DEFAULT_WA, getLang() === 'he' ? 'היי, הגעתי מ BRICK Shop' : 'Hi, I came from BRICK Shop')} external>WhatsApp</Brick>
    </section>
  </main>
}

export function NotFound() {
  const t = useT()
  return <main className="s-wrap s-section s-404">
    <div className="s-404-bricks" aria-hidden="true">{Array.from({ length: 9 }).map((_, i) => <i key={i} className={`c-${['red', 'yellow', 'blue', 'green'][i % 4]}`} style={{ ['--i' as string]: i }} />)}</div>
    <img src={JOEY.oops} alt="" />
    <h1 className="s-h1">{t('nf_title')}</h1><p className="s-lead">{t('nf_sub')}</p>
    <Brick href="/">{t('nf_cta')}</Brick>
  </main>
}
