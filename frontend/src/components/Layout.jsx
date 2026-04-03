import { useAuth } from '../context/AuthContext'
import PropTypes from 'prop-types'
import { useNavigate, useLocation } from 'react-router-dom'

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
    { yol: '/bayii/urunler',      etiket: 'Ürünlerim' },
  ],
}

export default function Layout({ children }) {
  const { kullanici, cikisYap } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const menu = menuler[kullanici?.rol] || []

  return (
    <div style={s.kapsayici}>
      <nav style={s.navbar}>
        <span style={s.logo} onClick={() => navigate('/')}>Ondur</span>

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
          <button style={s.cikis} onClick={cikisYap}>Çıkış</button>
        </div>
      </nav>

      <main style={s.icerik}>
        {children}
      </main>
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
    padding: '0 2rem', height: '56px',
    background: '#fff', borderBottom: '1px solid #e8e8e8',
    position: 'sticky', top: 0, zIndex: 100,
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
  kullanici: { fontSize: '0.9rem', color: '#555' },
  kullaniciAd: { fontSize: '0.9rem', color: '#555', cursor: 'pointer', textDecoration: 'underline dotted' },
  cikis: {
    padding: '6px 14px', background: 'transparent', border: '1px solid #ddd',
    borderRadius: '6px', cursor: 'pointer', fontSize: '0.9rem', color: '#888',
  },
}