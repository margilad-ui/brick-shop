import { useMemo, useState } from 'react'
import { useT } from '../i18n'
import { isNew, isRare, themeColor, type ShopItem } from '../data'
import { Brick, Bubble, Link, Pic, SetCard, Stud } from '../ui'
import { Clip, CLIP, JOEY } from '../joey'
import { BrickRain } from '../rain'
import { navigate } from '../router'

export function Home({ items, loading }: { items: ShopItem[]; loading: boolean }) {
  const t = useT()
  const live = items.filter(i => !i.demo)
  const heroPics = useMemo(() => {
    const pool = [...live, ...items.filter(i => i.demo)].filter(i => i.image_url)
    return pool.slice(0, 7)
  }, [items]) // eslint-disable-line react-hooks/exhaustive-deps
  const picks = useMemo(() => {
    const byTheme = new Map<string, ShopItem>()
    for (const i of [...items].sort((a, b) => (b.rating_count || 0) - (a.rating_count || 0))) { const k = i.theme || '?'; if (!byTheme.has(k) && i.image_url) byTheme.set(k, i) }
    return [...byTheme.values()].slice(0, 8)
  }, [items])
  const themes = useMemo(() => { const m = new Map<string, number>(); items.forEach(i => { if (i.theme) m.set(i.theme, (m.get(i.theme) || 0) + 1) }); return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12) }, [items])
  const counts = {
    retired: items.filter(i => i.retired).length, rare: items.filter(isRare).length, fresh: items.filter(isNew).length, poly: items.filter(i => i.kind === 'polybag').length,
  }
  const joeyLines = t('joey_lines').split('\n')

  const [world, setWorld] = useState<string | null>(null)

  return <main className="s-home" style={world ? { ['--accent' as string]: `var(--${themeColor(world)})` } : undefined}>
    {/* hero: the yellow room, with brick rain and Joey at the shelf */}
    <section className="s-hero">
      <BrickRain />
      <div className="s-wrap s-hero-in">
        <div className="s-hero-text">
          <h1 className="s-display"><span>{t('hero_l1')}</span><span>{t('hero_l2')}</span></h1>
          <p className="s-hero-sub">{t('hero_sub')}</p>
          <p className="s-hero-p">{t('hero_p')}</p>
          <div className="s-hero-ctas"><Brick color="ink" href="/sets">{t('hero_cta')}</Brick><Brick color="paper" href="/sets?f=retired">{t('hero_cta2')}</Brick></div>
        </div>
        <div className="s-hero-stage">
          <div className="s-shelf" aria-hidden="true">
            <div className="s-shelf-boxes">{heroPics.slice(0, 4).map((p, i) => <Link to={`/set/${p.set_num}`} key={p.id} className={`s-shelf-box b${i}`} tabIndex={-1}><Pic src={p.image_url} eager /></Link>)}</div>
            <div className="s-shelf-plank" />
          </div>
          <div className="s-hero-joey">
            <div className="s-hero-bubble"><b>{t('joey_hi')}</b><Bubble lines={joeyLines} /></div>
            <Clip src={CLIP.greet} poster={JOEY.wave} className="s-greet" />
          </div>
        </div>
      </div>
      <div className="s-hero-floor" aria-hidden="true" />
    </section>

    {/* rooms: four bricks */}
    <section className="s-wrap s-section">
      <h2 className="s-h2">{t('rooms_title')}</h2>
      <div className="s-rooms">
        {[
          ['red', 'room_retired', 'room_retired_sub', '/sets?f=retired', counts.retired],
          ['blue', 'room_rare', 'room_rare_sub', '/collectors', counts.rare],
          ['green', 'room_new', 'room_new_sub', '/sets?f=new', counts.fresh],
          ['cocoa', 'room_poly', 'room_poly_sub', '/sets?f=poly', counts.poly],
        ].map(([c, k, s, to, n]) => <Link key={k as string} to={to as string} className={`s-room c-${c}`}>
          <span className="studs" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /></span>
          <b>{t(k as 'room_retired')}</b><span>{t(s as 'room_retired_sub')}</span>
          <em className="ltr">{Number(n) > 0 ? n : ''}</em>
        </Link>)}
      </div>
    </section>

    {/* Joey's picks */}
    <section className="s-wrap s-section">
      <div className="s-section-head"><div><h2 className="s-h2">{t('picks_title')}</h2><p className="s-lead">{t('picks_sub')}</p></div><img src={JOEY.curious} alt="" className="s-section-joey" /></div>
      <div className="s-grid">{loading ? Array.from({ length: 8 }).map((_, i) => <div key={i} className="s-card s-skel" />) : picks.map((p, i) => <SetCard key={p.id} item={p} eager={i < 4} />)}</div>
      <div className="s-center"><Brick color="ink" href="/sets">{t('see_all')}</Brick></div>
    </section>

    {/* worlds: the room changes color */}
    <section className="s-worlds">
      <div className="s-wrap">
        <h2 className="s-h2">{t('worlds_title')}</h2><p className="s-lead">{t('worlds_sub')}</p>
        <div className="s-world-chips">
          {themes.map(([th, n]) => <button type="button" key={th} className={`s-world c-${themeColor(th)} ${world === th ? 'on' : ''}`} onMouseEnter={() => setWorld(th)} onFocus={() => setWorld(th)} onMouseLeave={() => setWorld(null)} onClick={() => navigate('/sets?theme=' + encodeURIComponent(th))}><Stud color={themeColor(th)} size={12} />{th}<em>{n}</em></button>)}
        </div>
      </div>
    </section>

    {/* promises */}
    <section className="s-wrap s-section s-promises">
      <h2 className="s-h2">{t('promise_title')}</h2>
      <div className="s-promise-row">
        {[['promise_1', 'promise_1_sub', 'green'], ['promise_2', 'promise_2_sub', 'yellow'], ['promise_3', 'promise_3_sub', 'red']].map(([k, s, c]) => <div key={k} className={`s-promise c-${c}`}><Stud color={c} size={22} /><b>{t(k as 'promise_1')}</b><span>{t(s as 'promise_1_sub')}</span></div>)}
      </div>
    </section>
  </main>
}
