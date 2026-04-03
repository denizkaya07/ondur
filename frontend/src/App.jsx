import { lazy, Suspense } from 'react'
import PropTypes from 'prop-types'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout'

// Statik yüklenecekler (auth akışı için gerekli)
import Giris from './pages/Giris'
import Kayit from './pages/Kayit'

// Lazy — sadece ilgili rol girince yüklenir
const Profil       = lazy(() => import('./pages/Profil'))
const Danisanlar   = lazy(() => import('./pages/muhendis/Danisanlar'))
const Receteler    = lazy(() => import('./pages/muhendis/Receteler'))
const Takvim       = lazy(() => import('./pages/muhendis/Takvim'))
const ReceteYaz    = lazy(() => import('./pages/muhendis/ReceteYaz'))
const Recetelerim  = lazy(() => import('./pages/ciftci/Recetelerim'))
const Isletmelerim = lazy(() => import('./pages/ciftci/Isletmelerim'))
const Talepler     = lazy(() => import('./pages/ciftci/Talepler'))
const Katalog      = lazy(() => import('./pages/uretici/Katalog'))
const Analiz       = lazy(() => import('./pages/bayii/Analiz'))
const Urunlerim    = lazy(() => import('./pages/bayii/Urunlerim'))

const Yukleniyor = () => (
  <div style={{ padding: '3rem', textAlign: 'center', color: '#aaa' }}>Yükleniyor…</div>
)

function KorunanRota({ children, rol }) {
  const { kullanici, yukleniyor } = useAuth()
  if (yukleniyor) return <Yukleniyor />
  if (!kullanici) return <Navigate to="/giris" />
  if (rol && kullanici.rol !== rol) return <Navigate to="/giris" />
  return <Layout><Suspense fallback={<Yukleniyor />}>{children}</Suspense></Layout>
}

KorunanRota.propTypes = {
  children: PropTypes.node.isRequired,
  rol: PropTypes.string,
}

export default function App() {
  const { kullanici, yukleniyor } = useAuth()
  if (yukleniyor) return <Yukleniyor />

  return (
    <Routes>
      <Route path="/giris" element={<Giris />} />
      <Route path="/kayit" element={<Kayit />} />

      <Route path="/profil" element={
        <KorunanRota><Profil /></KorunanRota>
      } />

      <Route path="/" element={
        kullanici ? <Navigate to={`/${kullanici.rol}`} /> : <Navigate to="/giris" />
      } />

      {/* Mühendis */}
      <Route path="/muhendis"            element={<KorunanRota rol="muhendis"><Danisanlar /></KorunanRota>} />
      <Route path="/muhendis/receteler"  element={<KorunanRota rol="muhendis"><Receteler /></KorunanRota>} />
      <Route path="/muhendis/recete/yaz" element={<KorunanRota rol="muhendis"><ReceteYaz /></KorunanRota>} />
      <Route path="/muhendis/takvim"     element={<KorunanRota rol="muhendis"><Takvim /></KorunanRota>} />

      {/* Çiftçi */}
      <Route path="/ciftci"             element={<KorunanRota rol="ciftci"><Recetelerim /></KorunanRota>} />
      <Route path="/ciftci/isletmeler"  element={<KorunanRota rol="ciftci"><Isletmelerim /></KorunanRota>} />
      <Route path="/ciftci/talepler"    element={<KorunanRota rol="ciftci"><Talepler /></KorunanRota>} />

      {/* Üretici */}
      <Route path="/uretici" element={<KorunanRota rol="uretici"><Katalog /></KorunanRota>} />

      {/* Bayii */}
      <Route path="/bayii"         element={<KorunanRota rol="bayii"><Analiz /></KorunanRota>} />
      <Route path="/bayii/urunler" element={<KorunanRota rol="bayii"><Urunlerim /></KorunanRota>} />

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}
