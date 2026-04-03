import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Giris() {
  const [telefon, setTelefon] = useState('')
  const [sifre, setSifre]     = useState('')
  const [hata, setHata]       = useState('')
  const [yukleniyor, setYukleniyor] = useState(false)
  const { girisYap } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setHata('')
    setYukleniyor(true)
    try {
      const kullanici = await girisYap(telefon, sifre)
      switch (kullanici.rol) {
        case 'muhendis':  navigate('/muhendis');  break
        case 'ciftci':    navigate('/ciftci');    break
        case 'uretici':   navigate('/uretici');   break
        case 'bayii':     navigate('/bayii');     break
        default:          navigate('/');
      }
    } catch (err) {
      console.error('GİRİŞ HATASI:', err)
      const mesaj = err.response?.data?.non_field_errors?.[0]
        || err.response?.data?.detail
        || err.message
        || 'Bilinmeyen hata'
      setHata(mesaj)
    } finally {
      setYukleniyor(false)
    }
  }

  return (
    <div style={styles.kapsayici}>
      <div style={styles.kart}>
        <h1 style={styles.baslik}>Ondur</h1>
        <p style={styles.slogan}>Onduralım</p>
        <form onSubmit={handleSubmit}>
          <div style={styles.alan}>
            <label style={styles.etiket}>Telefon</label>
            <input
              style={styles.girdi}
              type="tel"
              placeholder="05XX XXX XX XX"
              value={telefon}
              onChange={e => setTelefon(e.target.value)}
              required
            />
          </div>
          <div style={styles.alan}>
            <label style={styles.etiket}>Şifre</label>
            <input
              style={styles.girdi}
              type="password"
              placeholder="••••••••"
              value={sifre}
              onChange={e => setSifre(e.target.value)}
              required
            />
          </div>
          {hata && <p style={styles.hata}>{hata}</p>}
          <button style={styles.buton} type="submit" disabled={yukleniyor}>
            {yukleniyor ? 'Giriş yapılıyor...' : 'Giriş Yap'}
          </button>
        </form>
        <p style={styles.kayitLink}>
          Hesabın yok mu? <a href="/kayit">Kayıt Ol</a>
        </p>
      </div>
    </div>
  )
}

const styles = {
  kapsayici: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f0f4f8',
  },
  kart: {
    background: '#fff',
    padding: '2.5rem',
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    width: '100%',
    maxWidth: '400px',
  },
  baslik: {
    textAlign: 'center',
    color: '#1a7a4a',
    fontSize: '2rem',
    margin: '0 0 4px',
  },
  slogan: {
    textAlign: 'center',
    color: '#888',
    marginBottom: '2rem',
    fontSize: '0.9rem',
  },
  alan: { marginBottom: '1rem' },
  etiket: {
    display: 'block',
    marginBottom: '6px',
    fontSize: '0.9rem',
    color: '#444',
  },
  girdi: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid #ddd',
    fontSize: '1rem',
    boxSizing: 'border-box',
  },
  hata: {
    color: '#e53e3e',
    fontSize: '0.85rem',
    marginBottom: '1rem',
  },
  buton: {
    width: '100%',
    padding: '12px',
    background: '#1a7a4a',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    cursor: 'pointer',
    marginTop: '0.5rem',
  },
  kayitLink: {
    textAlign: 'center',
    marginTop: '1.5rem',
    fontSize: '0.9rem',
    color: '#666',
  },
}