import { useEffect, useState, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import { AuthContext } from '../../context/AuthContext'
import useBreakpoint from '../../hooks/useBreakpoint'

// Döneme göre tahmini yapılması gerekenler
const DONEM_ONERILER = {
  fide:        ['Fide kontrolü yapın', 'Sulama düzenini kurun', 'Toprak sıcaklığını takip edin'],
  cıkıs:       ['Çıkış kontrolü yapın', 'Seyreltme gerekiyorsa yapın', 'İlk sulama'],
  vejetatif:   ['Düzenli sulama', 'İlk gübreleme (azot)', 'Yabancı ot kontrolü', 'Böcek takibi'],
  ciceklenme:  ['Sıcaklık takibi', 'Azot gübrelemesini azaltın', 'Tozlaşmayı destekleyin', 'Fungisit ihtiyacı değerlendirin'],
  meyve:       ['Potasyum gübrelemesi', 'Sulama kritik', 'Hastalık takibi', 'Meyve seyreltme gerekebilir'],
  hasat:       ['Hasat zamanlamasını belirleyin', 'Depo hazırlığı', 'Son ilaçlama bekleme sürelerine dikkat'],
  hasat_sonrasi: ['Toprak analizi yaptırın', 'Tarla temizliği', 'Gelecek sezon planlaması'],
}

function donemTahmini(gunSayisi) {
  if (gunSayisi === null) return null
  if (gunSayisi < 14)  return { ad: 'Çıkış / Fide', key: 'fide', renk: '#e8f5ee', yazı: '#1a7a4a' }
  if (gunSayisi < 30)  return { ad: 'Erken Vejetatif', key: 'vejetatif', renk: '#f0faf5', yazı: '#1a7a4a' }
  if (gunSayisi < 60)  return { ad: 'Vejetatif Gelişme', key: 'vejetatif', renk: '#f0faf5', yazı: '#2d8a5e' }
  if (gunSayisi < 90)  return { ad: 'Çiçeklenme', key: 'ciceklenme', renk: '#fff8e1', yazı: '#b7791f' }
  if (gunSayisi < 130) return { ad: 'Meyve Tutumu', key: 'meyve', renk: '#fff3e0', yazı: '#c05621' }
  if (gunSayisi < 160) return { ad: 'Meyve Gelişimi', key: 'meyve', renk: '#fff3e0', yazı: '#c05621' }
  if (gunSayisi < 200) return { ad: 'Hasat Dönemi', key: 'hasat', renk: '#e8f0fe', yazı: '#1a56db' }
  return { ad: 'Hasat Sonrası', key: 'hasat_sonrasi', renk: '#f3f4f6', yazı: '#555' }
}

function gunFarki(tarihStr) {
  if (!tarihStr) return null
  const gun = Math.floor((Date.now() - new Date(tarihStr)) / 86400000)
  return gun >= 0 ? gun : null
}

const URUN_EMOJI = {
  domates:'🍅', cherry:'🍒', biber:'🫑', patlican:'🍆',
  salatalik:'🥒', kavun:'🍈', karpuz:'🍉', cilek:'🍓',
  uzum:'🍇', elma:'🍎', nar:'🍎', zeytin:'🫒',
  bugday:'🌾', arpa:'🌾', misir:'🌽', aycicek:'🌻',
}

function urunEmoji(urun) {
  if (!urun) return '🌱'
  const k = urun.toLowerCase().replace(/[çğışöü ]/g, c => ({ç:'c',ğ:'g',ı:'i',ş:'s',ö:'o',ü:'u',' ':''}[c]||c))
  return URUN_EMOJI[k] || '🌱'
}

export default function AnaSayfa() {
  const navigate = useNavigate()
  const { kullanici, yukleniyor: authYukleniyor } = useContext(AuthContext)
  const { isMobile } = useBreakpoint()
  const [isletmeler, setIsletmeler] = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)

  useEffect(() => {
    if (authYukleniyor) return
    if (!kullanici || kullanici.rol !== 'ciftci') { navigate('/giris'); return }
    api.get('/ciftci/isletmelerim/')
      .then(r => setIsletmeler(r.data))
      .catch(() => {})
      .finally(() => setYukleniyor(false))
  }, [authYukleniyor, kullanici, navigate])

  if (authYukleniyor || yukleniyor) return <div style={s.yuklenme}>Yükleniyor...</div>

  const aktif = isletmeler.filter(i => i.aktif)

  return (
    <div style={{ ...s.kapsayici, padding: isMobile ? '1rem' : '1.5rem' }}>
      <div style={s.hosgeldin}>
        <div>
          <h2 style={s.baslik}>Merhaba, {kullanici?.first_name || kullanici?.username} 👋</h2>
          <p style={s.altBaslik}>İşletmelerinizin dönem özeti</p>
        </div>
      </div>

      {aktif.length === 0 ? (
        <div style={s.bos}>
          <p style={{ fontSize:'1.1rem', color:'#888', margin:0 }}>Henüz aktif işletme yok.</p>
          <p style={{ fontSize:'0.85rem', color:'#aaa', marginTop:'6px' }}>Menüden işletme ekleyebilirsiniz.</p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
          {aktif.map(i => {
            const gun = gunFarki(i.ekim_tarihi)
            const donem = gun !== null ? donemTahmini(gun) : null
            const oneriler = donem ? (DONEM_ONERILER[donem.key] || []) : []

            return (
              <div key={i.id} style={s.kart}>
                {/* Başlık */}
                <div style={s.kartUst}>
                  <span style={s.urunEmoji}>{urunEmoji(i.urun_ad)}</span>
                  <div style={{ flex: 1 }}>
                    <div style={s.isletmeAd}>{i.ad}</div>
                    <div style={s.urunAd}>
                      {i.urun_ad || 'Ürün belirtilmemiş'}
                      {i.cesit_ad ? ` · ${i.cesit_ad}` : ''}
                      {i.alan_dekar ? ` · ${parseFloat(i.alan_dekar)} da` : ''}
                    </div>
                  </div>
                  {donem && (
                    <span style={{ ...s.donemRozet, background: donem.renk, color: donem.yazı }}>
                      {donem.ad}
                    </span>
                  )}
                </div>

                {/* Günlük bilgi */}
                {gun !== null ? (
                  <div style={s.gunBar}>
                    <span style={s.gunSayi}>{gun}</span>
                    <span style={s.gunYazi}>günlük</span>
                    {i.ekim_tarihi && (
                      <span style={s.ekimTarih}>Ekim: {new Date(i.ekim_tarihi).toLocaleDateString('tr-TR')}</span>
                    )}
                  </div>
                ) : (
                  <div style={{ fontSize:'0.82rem', color:'#bbb', padding:'6px 0' }}>Ekim tarihi girilmemiş</div>
                )}

                {/* Yapılması gerekenler */}
                {oneriler.length > 0 && (
                  <div style={s.onerilerBlok}>
                    <div style={s.onerilerBaslik}>Bu dönemde yapılması gerekenler:</div>
                    <ul style={s.onerilerListe}>
                      {oneriler.map((o, idx) => (
                        <li key={idx} style={s.oneriItem}>✓ {o}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const s = {
  kapsayici:   { maxWidth: '720px', margin: '0 auto' },
  yuklenme:    { padding: '3rem', textAlign: 'center', color: '#888' },
  hosgeldin:   { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' },
  baslik:      { fontSize: '1.3rem', fontWeight: '700', color: '#1a1a1a', margin: 0 },
  altBaslik:   { fontSize: '0.85rem', color: '#888', margin: '4px 0 0' },
  bos:         { padding: '3rem', textAlign: 'center', background: '#f9f9f9', borderRadius: '12px' },
  kart:        { background: '#fff', border: '1px solid #e8e8e8', borderRadius: '14px', padding: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' },
  kartUst:     { display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '10px' },
  urunEmoji:   { fontSize: '2rem', lineHeight: 1, flexShrink: 0 },
  isletmeAd:   { fontWeight: '700', fontSize: '1rem', color: '#1a1a1a' },
  urunAd:      { fontSize: '0.85rem', color: '#666', marginTop: '2px' },
  donemRozet:  { padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '600', flexShrink: 0, whiteSpace: 'nowrap' },
  gunBar:      { display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid #f5f5f5' },
  gunSayi:     { fontSize: '2rem', fontWeight: '800', color: '#1a7a4a', lineHeight: 1 },
  gunYazi:     { fontSize: '1rem', color: '#888', fontWeight: '500' },
  ekimTarih:   { fontSize: '0.78rem', color: '#bbb', marginLeft: 'auto' },
  onerilerBlok:{ background: '#f8fdf9', borderRadius: '8px', padding: '10px 14px' },
  onerilerBaslik: { fontSize: '0.78rem', fontWeight: '700', color: '#1a7a4a', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' },
  onerilerListe:  { margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '4px' },
  oneriItem:      { fontSize: '0.88rem', color: '#333' },
}
