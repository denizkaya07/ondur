import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import useBreakpoint from '../hooks/useBreakpoint'

const ROL_ETIKET = {
  muhendis: 'Ziraat Mühendisi',
  ciftci:   'Çiftçi',
  uretici:  'Üretici',
  bayii:    'Bayii',
}

function RolBilgiKarti({ kullanici }) {
  const p   = kullanici?.rol_profil
  const rol = kullanici?.rol

  if (!p) return null

  const satirlar = []

  if (rol === 'muhendis') {
    if (p.hizmet_ilceleri?.length)
      satirlar.push(['Hizmet İlçeleri', p.hizmet_ilceleri.join(', ')])
  }

  if (rol === 'ciftci') {
    if (p.kimlik_kodu) satirlar.push(['Kimlik Kodu', p.kimlik_kodu])
    if (p.cks_no)      satirlar.push(['ÇKS No', p.cks_no])
    if (p.mahalle || p.ilce || p.il)
      satirlar.push(['Adres', [p.mahalle, p.ilce, p.il].filter(Boolean).join(' / ')])
    if (p.telefon)     satirlar.push(['Telefon', p.telefon])
    satirlar.push(['Aktif İşletme', `${p.isletme_sayisi ?? 0} işletme`])
  }

  if (rol === 'bayii') {
    if (p.firma_adi)  satirlar.push(['Firma Adı', p.firma_adi])
    if (p.ruhsat_no)  satirlar.push(['Ruhsat No', p.ruhsat_no])
    if (p.il || p.ilce)
      satirlar.push(['Konum', [p.ilce, p.il].filter(Boolean).join(' / ')])
    if (p.telefon)    satirlar.push(['Telefon', p.telefon])
  }

  if (rol === 'uretici') {
    if (p.firma_adi) satirlar.push(['Firma Adı', p.firma_adi])
    if (p.vergi_no)  satirlar.push(['Vergi No', p.vergi_no])
    if (p.yetkili)   satirlar.push(['Yetkili', p.yetkili])
    if (p.adres)     satirlar.push(['Adres', p.adres])
  }

  if (!satirlar.length) return null

  return (
    <div style={s.bolum}>
      <h3 style={s.bolumBaslik}>{ROL_ETIKET[rol]} Bilgileri</h3>
      <div style={s.bilgiGrid}>
        {satirlar.map(([etiket, deger]) => (
          <div key={etiket} style={s.bilgiSatir}>
            <span style={s.bilgiEtiket}>{etiket}</span>
            <span style={s.bilgiDeger}>{deger}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Profil() {
  const { kullanici, setKullanici } = useAuth()
  const { isMobile } = useBreakpoint()
  const [form, setForm] = useState({
    first_name: kullanici?.first_name || '',
    last_name:  kullanici?.last_name  || '',
    telefon:    kullanici?.telefon    || '',
  })
  const [sifreForm, setSifreForm]     = useState({ eski: '', yeni: '', yeni2: '' })
  const [basari, setBasari]           = useState('')
  const [hata, setHata]               = useState('')
  const [sifreBasari, setSifreBasari] = useState('')
  const [sifreHata, setSifreHata]     = useState('')
  const [yukleniyor, setYukleniyor]   = useState(false)

  const degis      = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  const sifreDegis = e => setSifreForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const bilgiKaydet = async e => {
    e.preventDefault()
    setHata(''); setBasari(''); setYukleniyor(true)
    try {
      const res = await api.patch('/auth/profil/guncelle/', form)
      setKullanici(k => ({ ...k, ...res.data }))
      setBasari('Bilgiler güncellendi.')
    } catch (err) {
      const data = err.response?.data
      setHata(data ? Object.values(data).flat()[0] : 'Güncelleme başarısız.')
    } finally { setYukleniyor(false) }
  }

  const sifreKaydet = async e => {
    e.preventDefault()
    setSifreHata(''); setSifreBasari('')
    if (sifreForm.yeni !== sifreForm.yeni2) { setSifreHata('Yeni şifreler eşleşmiyor.'); return }
    try {
      await api.post('/auth/sifre-degistir/', { eski_sifre: sifreForm.eski, yeni_sifre: sifreForm.yeni })
      setSifreBasari('Şifre güncellendi.')
      setSifreForm({ eski: '', yeni: '', yeni2: '' })
    } catch (err) {
      const data = err.response?.data
      setSifreHata(data ? Object.values(data).flat()[0] : 'Şifre değiştirilemedi.')
    }
  }

  return (
    <div style={{ ...s.kapsayici, padding: isMobile ? '1rem' : '2rem' }}>
      <h2 style={s.baslik}>Profilim</h2>

      {/* Özet kart */}
      <div style={s.ozetKart}>
        <div style={s.avatar}>
          {kullanici?.first_name?.[0]}{kullanici?.last_name?.[0]}
        </div>
        <div>
          <p style={s.ozetAd}>{kullanici?.first_name} {kullanici?.last_name}</p>
          <p style={s.ozetAlt}>
            <span style={s.rolBadge}>{ROL_ETIKET[kullanici?.rol] || kullanici?.rol}</span>
            <span style={s.ozetTelefon}>{kullanici?.telefon}</span>
          </p>
        </div>
      </div>

      {/* Rol bilgileri */}
      <RolBilgiKarti kullanici={kullanici} />

      {/* Kişisel bilgi güncelleme */}
      <div style={s.bolum}>
        <h3 style={s.bolumBaslik}>Kişisel Bilgiler</h3>
        <form onSubmit={bilgiKaydet} style={s.form}>
          <div style={s.satir2}>
            <div style={s.alan}>
              <label style={s.etiket}>Ad</label>
              <input name="first_name" value={form.first_name} onChange={degis} style={s.girdi} />
            </div>
            <div style={s.alan}>
              <label style={s.etiket}>Soyad</label>
              <input name="last_name" value={form.last_name} onChange={degis} style={s.girdi} />
            </div>
          </div>
          <div style={s.alan}>
            <label style={s.etiket}>Telefon</label>
            <input name="telefon" value={form.telefon} onChange={degis} style={s.girdi} />
          </div>
          <div style={s.alan}>
            <label style={s.etiket}>Kullanıcı Adı</label>
            <input value={kullanici?.username} disabled style={{ ...s.girdi, background: '#f9f9f9', color: '#aaa' }} />
          </div>
          {hata   && <p style={s.hata}>{hata}</p>}
          {basari && <p style={s.basariMsg}>{basari}</p>}
          <button type="submit" style={s.btn} disabled={yukleniyor}>
            {yukleniyor ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </form>
      </div>

      {/* Şifre değiştirme */}
      <div style={s.bolum}>
        <h3 style={s.bolumBaslik}>Şifre Değiştir</h3>
        <form onSubmit={sifreKaydet} style={s.form}>
          <div style={s.alan}>
            <label style={s.etiket}>Mevcut Şifre</label>
            <input type="password" name="eski" value={sifreForm.eski} onChange={sifreDegis} style={s.girdi} required />
          </div>
          <div style={s.satir2}>
            <div style={s.alan}>
              <label style={s.etiket}>Yeni Şifre</label>
              <input type="password" name="yeni" value={sifreForm.yeni} onChange={sifreDegis} style={s.girdi} required />
            </div>
            <div style={s.alan}>
              <label style={s.etiket}>Yeni Şifre (Tekrar)</label>
              <input type="password" name="yeni2" value={sifreForm.yeni2} onChange={sifreDegis} style={s.girdi} required />
            </div>
          </div>
          {sifreHata   && <p style={s.hata}>{sifreHata}</p>}
          {sifreBasari && <p style={s.basariMsg}>{sifreBasari}</p>}
          <button type="submit" style={s.btn}>Şifreyi Güncelle</button>
        </form>
      </div>
    </div>
  )
}

const s = {
  kapsayici:   { maxWidth: '560px', margin: '0 auto' },
  baslik:      { fontSize: '1.5rem', fontWeight: '500', color: '#1a7a4a', marginBottom: '1.25rem' },
  ozetKart:    { display: 'flex', alignItems: 'center', gap: '16px', background: '#fff', border: '1px solid #e8e8e8', borderRadius: '12px', padding: '1.25rem', marginBottom: '1rem' },
  avatar:      { width: '52px', height: '52px', borderRadius: '50%', background: '#1a7a4a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', fontWeight: '700', flexShrink: 0 },
  ozetAd:      { margin: 0, fontWeight: '600', fontSize: '1.05rem' },
  ozetAlt:     { margin: '4px 0 0', display: 'flex', gap: '10px', alignItems: 'center' },
  rolBadge:    { padding: '2px 8px', borderRadius: '20px', fontSize: '0.75rem', background: '#e8f5ee', color: '#1a7a4a', fontWeight: '500' },
  ozetTelefon: { fontSize: '0.85rem', color: '#888' },
  bolum:       { background: '#fff', border: '1px solid #e8e8e8', borderRadius: '12px', padding: '1.25rem 1.5rem', marginBottom: '1rem' },
  bolumBaslik: { fontSize: '1rem', fontWeight: '600', color: '#333', margin: '0 0 1rem' },
  bilgiGrid:   { display: 'flex', flexDirection: 'column', gap: '8px' },
  bilgiSatir:  { display: 'flex', gap: '12px', fontSize: '0.9rem' },
  bilgiEtiket: { color: '#888', minWidth: '110px', flexShrink: 0 },
  bilgiDeger:  { color: '#333', fontWeight: '500' },
  form:        { display: 'flex', flexDirection: 'column', gap: '10px' },
  satir2:      { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' },
  alan:        { display: 'flex', flexDirection: 'column', gap: '4px' },
  etiket:      { fontSize: '0.82rem', color: '#666', fontWeight: '500' },
  girdi:       { padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', width: '100%' },
  hata:        { color: '#e53e3e', fontSize: '0.85rem', margin: 0 },
  basariMsg:   { color: '#1a7a4a', fontSize: '0.85rem', margin: 0 },
  btn:         { padding: '9px 20px', background: '#1a7a4a', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer', alignSelf: 'flex-start' },
}
