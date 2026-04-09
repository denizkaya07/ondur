import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import PropTypes from 'prop-types'
import { useNavigate, useLocation } from 'react-router-dom'
import useBreakpoint from '../hooks/useBreakpoint'
import OfflineBanner from './OfflineBanner'

const ROL_ETIKET = {
  muhendis: 'Mühendis',
  ciftci:   'Çiftçi',
  uretici:  'Üretici',
  bayii:    'Bayii',
}

const menuler = {
  muhendis: [
    { yol: '/muhendis',           etiket: 'Danışanlarım' },
    { yol: '/muhendis/receteler', etiket: 'Reçeteler' },
    { yol: '/muhendis/takvim',    etiket: 'Takvim' },
  ],
  ciftci: [
    { yol: '/ciftci',             etiket: 'Reçetelerim' },
    { yol: '/ciftci/isletmeler',  etiket: 'İşletmelerim' },
    { yol: '/ciftci/talepler',    etiket: 'Talepler' },
  ],
  uretici: [
    { yol: '/uretici',            etiket: 'Katalogum' },
  ],
  bayii: [
    { yol: '/bayii',              etiket: 'Analiz' },
    { yol: '/bayii/musteriler',   etiket: 'Müşterilerim' },
    { yol: '/bayii/urunler',      etiket: 'Ürünlerim' },
  ],
}

export default function Layout({ children }) {
  const { kullanici, cikisYap } = useAuth()
  const navigate   = useNavigate()
  const location   = useLocation()
  const { isMobile } = useBreakpoint()
  const [menuAcik, setMenuAcik] = useState(false)

  const menu = menuler[kullanici?.rol] || []

  const git = (yol) => {
    navigate(yol)
    setMenuAcik(false)
  }

  return (
    <div style={s.kapsayici}>
      <nav style={s.navbar}>
        <span style={s.logo} onClick={() => git('/')}>Ondur</span>

        {isMobile ? (
          <>
            <button style={s.hamburger} onClick={() => setMenuAcik(a => !a)} aria-label="Menü">
              {menuAcik ? '✕' : '☰'}
            </button>
            {menuAcik && (
              <div style={s.dropdown} onClick={() => setMenuAcik(false)}>
                {menu.map(m => (
                  <div
                    key={m.yol}
                    style={{
                      ...s.dropdownItem,
                      ...(location.pathname === m.yol ? s.dropdownItemAktif : {})
                    }}
                    onClick={(e) => { e.stopPropagation(); git(m.yol) }}
                  >
                    {m.etiket}
                  </div>
                ))}
                <div style={s.dropdownAyrac} />
                <div style={s.dropdownItem} onClick={(e) => { e.stopPropagation(); git('/profil') }}>
                  {kullanici?.first_name || kullanici?.username}
                  <span style={{...s.rolBadge, marginLeft:'8px'}}>{ROL_ETIKET[kullanici?.rol] || kullanici?.rol}</span>
                </div>
                <div style={{ ...s.dropdownItem, color: '#e05' }} onClick={(e) => { e.stopPropagation(); cikisYap() }}>
                  Çıkış
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <div style={s.menuler}>
              {menu.map(m => (
                <span
                  key={m.yol}
                  style={{
                    ...s.menuItem,
                    ...(location.pathname === m.yol ? s.menuItemAktif : {})
                  }}
                  onClick={() => navigate(m.yol)}
                >
                  {m.etiket}
                </span>
              ))}
            </div>

            <div style={s.sag}>
              <span style={s.kullaniciAd} onClick={() => navigate('/profil')}>
                {kullanici?.first_name || kullanici?.username}
              </span>
              <span style={s.rolBadge}>{ROL_ETIKET[kullanici?.rol] || kullanici?.rol}</span>
              <button style={s.cikis} onClick={cikisYap}>Çıkış</button>
            </div>
          </>
        )}
      </nav>

      <main style={s.icerik}>
        {children}
      </main>
      <OfflineBanner />
    </div>
  )
}

Layout.propTypes = {
  children: PropTypes.node.isRequired,
}

const s = {
  kapsayici: { minHeight: '100vh', background: '#f5f7f5' },
  navbar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 1rem', height: '56px',
    background: '#fff', borderBottom: '1px solid #e8e8e8',
    position: 'sticky', top: 0, zIndex: 200,
  },
  logo: {
    fontSize: '1.3rem', fontWeight: '600', color: '#1a7a4a',
    cursor: 'pointer',
  },
  menuler: { display: 'flex', gap: '8px' },
  menuItem: {
    padding: '6px 14px', borderRadius: '6px', cursor: 'pointer',
    fontSize: '0.9rem', color: '#555',
  },
  menuItemAktif: {
    background: '#e8f5ee', color: '#1a7a4a', fontWeight: '500',
  },
  sag: { display: 'flex', alignItems: 'center', gap: '12px' },
  kullaniciAd: { fontSize: '0.9rem', color: '#555', cursor: 'pointer', textDecoration: 'underline dotted' },
  rolBadge:    { padding: '2px 8px', borderRadius: '20px', fontSize: '0.75rem', background: '#e8f5ee', color: '#1a7a4a', fontWeight: '500' },
  cikis: {
    padding: '6px 14px', background: 'transparent', border: '1px solid #ddd',
    borderRadius: '6px', cursor: 'pointer', fontSize: '0.9rem', color: '#888',
  },
  // Mobile hamburger
  hamburger: {
    background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer',
    color: '#1a7a4a', padding: '4px 8px',
  },
  dropdown: {
    position: 'fixed', top: '56px', left: 0, right: 0,
    background: '#fff', borderBottom: '1px solid #e8e8e8',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    zIndex: 199,
  },
  dropdownItem: {
    padding: '14px 20px', fontSize: '1rem', color: '#333',
    cursor: 'pointer', borderBottom: '1px solid #f0f0f0',
  },
  dropdownItemAktif: {
    background: '#e8f5ee', color: '#1a7a4a', fontWeight: '600',
  },
  dropdownAyrac: {
    height: '1px', background: '#e8e8e8', margin: '4px 0',
  },
  icerik: {},
}
