import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../services/api'

const ROLLER = [
  { value: 'muhendis', label: 'Ziraat Mühendisi' },
  { value: 'ciftci',   label: 'Çiftçi' },
  { value: 'uretici',  label: 'Üretici' },
  { value: 'bayii',    label: 'Bayii' },
]

export default function Kayit() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    username: '', first_name: '', last_name: '',
    telefon: '', rol: 'ciftci',
    password: '', password2: '',
  })
  const [hata, setHata]       = useState('')
  const [yukleniyor, setYukleniyor] = useState(false)

  const degis = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const gonder = async (e) => {
    e.preventDefault()
    if (form.password !== form.password2) {
      setHata('Şifreler eşleşmiyor.')
      return
    }
    setHata('')
    setYukleniyor(true)
    try {
      await api.post('/auth/kayit/', form)
      navigate('/giris', { state: { mesaj: 'Kayıt başarılı! Giriş yapabilirsiniz.' } })
    } catch (err) {
      const data = err.response?.data
      if (data) {
        const ilkHata = Object.values(data).flat()[0]
        setHata(typeof ilkHata === 'string' ? ilkHata : JSON.stringify(data))
      } else {
        setHata('Kayıt başarısız.')
      }
    } finally {
      setYukleniyor(false)
    }
  }

  return (
    <div style={s.sayfa}>
      <div style={s.kutu}>
        <h1 style={s.baslik}>Ondur</h1>
        <p style={s.altBaslik}>Hesap Oluştur</p>

        <form onSubmit={gonder} style={s.form}>
          <div style={s.satir2}>
            <div style={s.alan}>
              <label style={s.etiket}>Ad</label>
              <input name="first_name" value={form.first_name} onChange={degis}
                style={s.girdi} placeholder="Adınız" required />
            </div>
            <div style={s.alan}>
              <label style={s.etiket}>Soyad</label>
              <input name="last_name" value={form.last_name} onChange={degis}
                style={s.girdi} placeholder="Soyadınız" required />
            </div>
          </div>

          <div style={s.alan}>
            <label style={s.etiket}>Kullanıcı Adı</label>
            <input name="username" value={form.username} onChange={degis}
              style={s.girdi} placeholder="kullanici_adi" required />
          </div>

          <div style={s.alan}>
            <label style={s.etiket}>Telefon</label>
            <input name="telefon" value={form.telefon} onChange={degis}
              style={s.girdi} placeholder="05XXXXXXXXX" required />
          </div>

          <div style={s.alan}>
            <label style={s.etiket}>Rol</label>
            <select name="rol" value={form.rol} onChange={degis} style={s.girdi}>
              {ROLLER.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          <div style={s.alan}>
            <label style={s.etiket}>Şifre</label>
            <input type="password" name="password" value={form.password} onChange={degis}
              style={s.girdi} placeholder="En az 8 karakter" required />
          </div>

          <div style={s.alan}>
            <label style={s.etiket}>Şifre (Tekrar)</label>
            <input type="password" name="password2" value={form.password2} onChange={degis}
              style={s.girdi} placeholder="Şifreyi tekrar girin" required />
          </div>

          {hata && <p style={s.hata}>{hata}</p>}

          <button type="submit" style={s.btn} disabled={yukleniyor}>
            {yukleniyor ? 'Kaydediliyor…' : 'Kayıt Ol'}
          </button>
        </form>

        <p style={s.girisLink}>
          Zaten hesabın var mı?{' '}
          <Link to="/giris" style={s.link}>Giriş yap</Link>
        </p>
      </div>
    </div>
  )
}

const s = {
  sayfa:     { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f7f5' },
  kutu:      { background: '#fff', border: '1px solid #e8e8e8', borderRadius: '16px', padding: '2.5rem 2rem', width: '420px', maxWidth: '95vw', boxShadow: '0 4px 24px rgba(0,0,0,.07)' },
  baslik:    { fontSize: '1.8rem', fontWeight: '700', color: '#1a7a4a', textAlign: 'center', margin: '0 0 4px' },
  altBaslik: { textAlign: 'center', color: '#888', fontSize: '0.95rem', margin: '0 0 1.5rem' },
  form:      { display: 'flex', flexDirection: 'column', gap: '12px' },
  satir2:    { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' },
  alan:      { display: 'flex', flexDirection: 'column', gap: '4px' },
  etiket:    { fontSize: '0.82rem', color: '#555', fontWeight: '500' },
  girdi:     { padding: '9px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box', width: '100%' },
  hata:      { color: '#e53e3e', fontSize: '0.85rem', margin: 0 },
  btn:       { marginTop: '4px', padding: '11px', background: '#1a7a4a', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: '600', cursor: 'pointer' },
  girisLink: { textAlign: 'center', marginTop: '1.25rem', fontSize: '0.88rem', color: '#888' },
  link:      { color: '#1a7a4a', fontWeight: '600', textDecoration: 'none' },
}
