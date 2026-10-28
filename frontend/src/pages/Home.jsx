import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import '@fontsource/playfair-display/600.css'
import '@fontsource/playfair-display/700.css'
import '@fontsource/jost/400.css'
import '@fontsource/jost/500.css'
import { shopInfo } from '../data/shopInfo'
import { SHOP_NAME, HERO_BACKGROUND } from '../data/brand'
import '../styles/shine.css'
import './Home.css'

const onlyDigits = (value) => String(value || '').replace(/\D/g, '')

// Shop name split into a big word and a small word for the logo
function Logo({ name, light = false }) {
  const parts = name.trim().split(/\s+/)
  const sub   = parts.length > 1 ? parts[parts.length - 1] : ''
  const main  = parts.length > 1 ? parts.slice(0, -1).join(' ') : name
  return (
    <span className={`pj-logo${light ? ' pj-logo-light' : ''}`}>
      <span className="pj-logo-main">{main}</span>
      {sub && <span className="pj-logo-sub">{sub}</span>}
    </span>
  )
}

function Home() {
  // Same check the rest of the app uses to know if someone is logged in
  const [loggedIn] = useState(() => {
    try { return !!localStorage.getItem('token') } catch { return false }
  })

  // The top bar turns solid once the page is scrolled
  const [scrolled, setScrolled] = useState(() => window.scrollY > 40)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const {
    tagline, years, address, phone, whatsapp,
    hours, mapsLink, mapsEmbed, offerings
  } = shopInfo
  const name = SHOP_NAME

  const phoneHref    = phone ? `tel:${phone.replace(/[^\d+]/g, '')}` : ''
  const whatsappHref = whatsapp ? `https://wa.me/${onlyDigits(whatsapp)}` : ''
  const hasVisit     = address || phone || whatsapp || hours.length > 0 || mapsLink || mapsEmbed
  const embedOk      = mapsEmbed.startsWith('https://www.google.com/maps/embed')
  const yearsNumber  = years.replace('+', '')
  const authPath     = loggedIn ? '/dashboard' : '/login'
  const authLabel    = loggedIn ? 'Dashboard' : 'Login'

  return (
    <div className="pj">
      {/* ── Top bar ── */}
      <header className={`pj-header${scrolled ? ' pj-header-solid' : ''}`}>
        <a href="#top" className="pj-logo-link" aria-label={name}>
          <Logo name={name} light={!scrolled} />
        </a>

        <nav className="pj-nav" aria-label="Page sections">
          <a href="#about">About</a>
          {offerings.length > 0 && <a href="#collections">Collections</a>}
          {hasVisit && <a href="#visit">Visit us</a>}
        </nav>

        <Link className="pj-login" to={authPath}>{authLabel}</Link>
      </header>

      {/* ── Hero ── */}
      <section id="top" className="pj-hero" style={{ background: HERO_BACKGROUND }}>
        <div className="pj-frame" aria-hidden="true" />
        <div className="pj-hero-inner">
          <p className="pj-eyebrow">Family jewellers for {yearsNumber}+ years</p>
          <h1 className="pj-hero-name pj-shine">{name}</h1>
          <div className="pj-rule" aria-hidden="true" />
          <p className="pj-tagline">{tagline}</p>
          <div className="pj-actions">
            {hasVisit && <a className="pj-btn pj-btn-gold" href="#visit">Visit our shop</a>}
            {whatsappHref && (
              <a className="pj-btn pj-btn-light" href={whatsappHref} target="_blank" rel="noopener noreferrer">
                WhatsApp us
              </a>
            )}
          </div>
        </div>
      </section>

      {/* ── Facts ── */}
      <section className="pj-facts" aria-label="About the shop at a glance">
        <div className="pj-fact">
          <div className="pj-fact-big">{years}</div>
          <div className="pj-fact-small">Years in business</div>
        </div>
        <div className="pj-fact">
          <div className="pj-fact-big">Gold &amp; Silver</div>
          <div className="pj-fact-small">Jewellery and ornaments</div>
        </div>
        <div className="pj-fact">
          <div className="pj-fact-big">Family run</div>
          <div className="pj-fact-small">Personal service</div>
        </div>
      </section>

      {/* ── About ── */}
      <section id="about" className="pj-section pj-about">
        <div className="pj-label">About us</div>
        <h2 className="pj-h2">A family jeweller you can trust</h2>
        <p className="pj-lead">
          {name} is a family-run shop. For more than {yearsNumber} years we have
          served our customers with gold and silver jewellery, and we still treat
          every customer the way we did on the first day.
        </p>
      </section>

      {/* ── Collections ── */}
      {offerings.length > 0 && (
        <section id="collections" className="pj-band">
          <div className="pj-section">
            <div className="pj-label">Collections</div>
            <h2 className="pj-h2">What we offer</h2>
            <div className="pj-cards">
              {offerings.map((o, i) => (
                <article key={o.title} className="pj-card">
                  <div className="pj-card-no">{String(i + 1).padStart(2, '0')}</div>
                  <h3>{o.title}</h3>
                  {o.text && <p>{o.text}</p>}
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Visit us ── */}
      {hasVisit && (
        <section id="visit" className="pj-section pj-visit">
          <div className="pj-label">Visit us</div>
          <h2 className="pj-h2">Visit our shop</h2>

          <div className="pj-visit-grid">
            <div className="pj-info">
              {address && (
                <div className="pj-info-row">
                  <div className="pj-info-label">Address</div>
                  <div>{address}</div>
                </div>
              )}
              {phone && (
                <div className="pj-info-row">
                  <div className="pj-info-label">Phone</div>
                  <a href={phoneHref}>{phone}</a>
                </div>
              )}
              {whatsapp && (
                <div className="pj-info-row">
                  <div className="pj-info-label">WhatsApp</div>
                  <a href={whatsappHref} target="_blank" rel="noopener noreferrer">Message us on WhatsApp</a>
                </div>
              )}
              {hours.length > 0 && (
                <div className="pj-info-row">
                  <div className="pj-info-label">Opening hours</div>
                  <div>
                    {hours.map((h) => (
                      <div key={h.days} className="pj-hours">
                        <span>{h.days}</span>
                        <span>{h.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {mapsLink && (
                <a className="pj-btn pj-btn-gold pj-map-btn" href={mapsLink} target="_blank" rel="noopener noreferrer">
                  Open in Google Maps
                </a>
              )}
            </div>

            {embedOk && (
              <iframe
                className="pj-map"
                title={`${name} location`}
                src={mapsEmbed}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            )}
          </div>
        </section>
      )}

      {/* ── Footer ── */}
      <footer className="pj-footer">
        <Logo name={name} light />
        <div className="pj-footer-line">
          © {new Date().getFullYear()} {name}. All rights reserved.
        </div>
        <Link className="pj-footer-login" to={authPath}>Staff login</Link>
      </footer>
    </div>
  )
}

export default Home
