import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Giris from './pages/Giris'
import Kayit from './pages/Kayit'
import Profil from './pages/Profil'
import Layout from './components/Layout'
import Danisanlar from './pages/muhendis/Danisanlar'
import Receteler from './pages/muhendis/Receteler'
import Takvim from './pages/muhendis/Takvim'
import ReceteYaz from './pages/muhendis/ReceteYaz'
import Recetelerim from './pages/ciftci/Recetelerim'
import Isletmelerim from './pages/ciftci/Isletmelerim'
import Talepler from './pages/ciftci/Talepler'
import Katalog from './pages/uretici/Katalog'
import Analiz from './pages/bayii/Analiz'
import Urunlerim from './pages/bayii/Urunlerim'

function KorunanRota({ children, rol }) {
  const { kullanici, yukleniyor } = useAuth()
  if (yukleniyor) return <div>Yükleniyor...</div>
  if (!kullanici) return <Navigate to="/giris" />
  if (rol && kullanici.rol !== rol) return <Navigate to="/giris" />
  return <Layout>{children}</Layout>
}

export default function App() {
  const { kullanici, yukleniyor } = useAuth()

  if (yukleniyor) return <div>Yükleniyor...</div>

  return (
    <Routes>
      <Route path="/giris" element={<Giris />} />
      <Route path="/kayit" element={<Kayit />} />
      <Route path="/profil" element={
        <KorunanRota>
          <Profil />
        </KorunanRota>
      } />
      <Route path="/" element={
        kullanici
          ? <Navigate to={`/${kullanici.rol}`} />
          : <Navigate to="/giris" />
      } />

      <Route path="/muhendis" element={
        <KorunanRota rol="muhendis">
          <Danisanlar />
        </KorunanRota>
      } />
      <Route path="/muhendis/receteler" element={
        <KorunanRota rol="muhendis">
          <Receteler />
        </KorunanRota>
      } />
      <Route path="/muhendis/recete/yaz" element={
        <KorunanRota rol="muhendis">
          <ReceteYaz />
        </KorunanRota>
      } />
      <Route path="/muhendis/takvim" element={
        <KorunanRota rol="muhendis">
          <Takvim />
        </KorunanRota>
      } />

      <Route path="/ciftci" element={
        <KorunanRota rol="ciftci">
          <Recetelerim />
        </KorunanRota>
      } />
      <Route path="/ciftci/isletmeler" element={
        <KorunanRota rol="ciftci">
          <Isletmelerim />
        </KorunanRota>
      } />
      <Route path="/ciftci/talepler" element={
        <KorunanRota rol="ciftci">
          <Talepler />
        </KorunanRota>
      } />

      <Route path="/uretici" element={
        <KorunanRota rol="uretici">
          <Katalog />
        </KorunanRota>
      } />

      <Route path="/bayii" element={
        <KorunanRota rol="bayii">
          <Analiz />
        </KorunanRota>
      } />
      <Route path="/bayii/urunler" element={
        <KorunanRota rol="bayii">
          <Urunlerim />
        </KorunanRota>
      } />

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}