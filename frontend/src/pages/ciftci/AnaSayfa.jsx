import { useEffect, useState, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import { AuthContext } from '../../context/AuthContext'
import useBreakpoint from '../../hooks/useBreakpoint'

function gunFarki(tarihStr) {
  if (!tarihStr) return null
  const gun = Math.floor((Date.now() - new Date(tarihStr)) / 86400000)
  return gun >= 0 ? gun : null
}

function donemAdi(gun) {
  if (gun === null) return null
  if (gun < 14)  return { ad: 'Çıkış / Fide',      renk: '#e8f5ee', yazı: '#1a7a4a' }
  if (gun < 60)  return { ad: 'Vejetatif Gelişme',  renk: '#f0faf5', yazı: '#2d8a5e' }
  if (gun < 90)  return { ad: 'Çiçeklenme',         renk: '#fff8e1', yazı: '#b7791f' }
  if (gun < 160) return { ad: 'Meyve Gelişimi',     renk: '#fff3e0', yazı: '#c05621' }
  if (gun < 200) return { ad: 'Hasat Dönemi',       renk: '#e8f0fe', yazı: '#1a56db' }
  return           { ad: 'Hasat Sonrası',            renk: '#f3f4f6', yazı: '#555'    }
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

const BITKI_GORSEL = {
  domates:    'tomato,plant,greenhouse',
  biber:      'pepper,plant,farm',
  patlican:   'eggplant,vegetable,farm',
  salatalik:  'cucumber,plant,greenhouse',
  kavun:      'melon,farm,fruit',
  karpuz:     'watermelon,farm',
  cilek:      'strawberry,plant,farm',
  uzum:       'grape,vineyard,harvest',
  elma:       'apple,orchard,tree',
  nar:        'pomegranate,fruit,tree',
  zeytin:     'olive,tree,harvest',
  bugday:     'wheat,field,golden',
  arpa:       'barley,field,farm',
  misir:      'corn,maize,field',
  aycicek:    'sunflower,field',
  patates:    'potato,farm,field',
  sogan:      'onion,farm,field',
  cherry:     'cherry,tree,fruit',
}

function bitkiGorselUrl(urunAd) {
  const k = (urunAd || '').toLowerCase()
    .replace(/[çğışöü]/g, c => ({ç:'c',ğ:'g',ı:'i',ş:'s',ö:'o',ü:'u'}[c]||c))
  const anahtar = Object.keys(BITKI_GORSEL).find(key => k.includes(key))
  const kelime  = BITKI_GORSEL[anahtar] || 'farm,plant,greenhouse'
  return `https://loremflickr.com/700/360/${kelime}?lock=${anahtar || 0}`
}

const HAVA_KODU = {
  0:'Açık', 1:'Açık', 2:'Parçalı bulutlu', 3:'Bulutlu',
  45:'Sisli', 48:'Sisli', 51:'Hafif çisenti', 53:'Çisenti', 55:'Yoğun çisenti',
  61:'Hafif yağmur', 63:'Yağmur', 65:'Yoğun yağmur',
  71:'Hafif kar', 73:'Kar', 75:'Yoğun kar',
  80:'Sağanak', 81:'Kuvvetli sağanak', 82:'Çok kuvvetli sağanak',
  95:'Gök gürültülü fırtına', 96:'Dolulu fırtına',
}

function UygunlukGostergesi({ puan }) {
  const renk = puan >= 8 ? '#16a34a' : puan >= 6 ? '#ca8a04' : '#dc2626'
  const etiket = puan >= 8 ? 'Çok Uygun' : puan >= 6 ? 'Orta Uygun' : 'Az Uygun'
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
      <div style={{ width:44, height:44, borderRadius:'50%', background:renk, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:800, fontSize:'1.1rem', flexShrink:0 }}>
        {puan}
      </div>
      <div>
        <div style={{ fontWeight:700, fontSize:'0.88rem', color:renk }}>{etiket}</div>
        <div style={{ fontSize:'0.72rem', color:'#6b7280' }}>10 üzerinden</div>
      </div>
    </div>
  )
}

function ToprakDegerlendirme({ isletmeId, urunAd }) {
  const [durum, setDurum] = useState('bos')
  const [veri, setVeri]   = useState(null)
  const [hata, setHata]   = useState('')

  async function getir() {
    setDurum('yukleniyor')
    try {
      const res = await api.post('/ai/toprak-degerlendirme/', { isletme_id: isletmeId })
      setVeri(res.data)
      setDurum('tamam')
    } catch (e) {
      const msg = e.response?.data?.hata || 'Bir hata oluştu.'
      if (msg.includes('toprak analizi yok')) {
        setHata('Bu işletme için henüz toprak analizi girilmemiş.')
      } else {
        setHata(msg)
      }
      setDurum('hata')
    }
  }

  if (durum === 'bos') return (
    <button style={td.acBtn} onClick={getir} type="button">
      🧪 Toprak Analizi & Uygunluk
    </button>
  )

  if (durum === 'yukleniyor') return (
    <div style={td.bilgi}>⏳ Toprak analizi değerlendiriliyor...</div>
  )

  if (durum === 'hata') return (
    <div style={{ ...td.bilgi, color: hata.includes('toprak analizi') ? '#92400e' : '#dc2626',
                  background: hata.includes('toprak analizi') ? '#fffbeb' : undefined,
                  border: hata.includes('toprak analizi') ? '1px solid #fcd34d' : undefined,
                  borderRadius: 8, padding: '10px 12px' }}>
      {hata.includes('toprak analizi')
        ? <>🧪 Bu işletme için toprak analizi kaydı yok.<br/>
            <span style={{ fontSize:'0.78rem', color:'#78350f' }}>
              Mühendis ya da yönetici toprak analizi ekledikten sonra bu değerlendirme çalışacak.
            </span>
          </>
        : hata}
      <button style={td.tekrarBtn} onClick={() => setDurum('bos')}>Geri</button>
    </div>
  )

  return (
    <div style={td.kutu}>
      <div style={td.baslikSatir}>
        <span style={td.baslik}>🧪 Toprak Analizi — {urunAd}</span>
        <button style={td.kapatBtn} onClick={() => setDurum('bos')}>✕</button>
      </div>

      <UygunlukGostergesi puan={veri.uygunluk_puani} />

      {veri.uygunluk_aciklamasi && (
        <p style={td.aciklama}>{veri.uygunluk_aciklamasi}</p>
      )}

      {veri.daha_uygun_bitkiler?.length > 0 && (
        <div style={td.bolum}>
          <div style={td.bolumBaslik}>🌱 Bu Toprağa Daha Uygun Bitkiler</div>
          {veri.daha_uygun_bitkiler.map((b, i) => (
            <div key={i} style={td.bitkiKart}>
              <span style={td.bitkiAd}>{b.bitki}</span>
              <span style={td.bitkiNeden}>{b.neden}</span>
            </div>
          ))}
        </div>
      )}

      {veri.iyilestirme_onerileri?.length > 0 && (
        <div style={td.bolum}>
          <div style={td.bolumBaslik}>⚗️ {urunAd} İçin Toprak İyileştirme</div>
          <ul style={td.liste}>
            {veri.iyilestirme_onerileri.map((o, i) => (
              <li key={i} style={td.listeItem}>✓ {o}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

const td = {
  acBtn:       { width:'100%', padding:'8px', background:'#fefce8', border:'1px solid #fde68a', borderRadius:'8px', cursor:'pointer', fontSize:'0.85rem', fontWeight:'600', color:'#92400e', marginBottom:'8px' },
  bilgi:       { fontSize:'0.82rem', color:'#6b7280', padding:'8px 0', display:'flex', alignItems:'center', gap:8 },
  tekrarBtn:   { background:'none', border:'none', color:'#4f46e5', fontSize:'0.78rem', cursor:'pointer', padding:0 },
  kutu:        { background:'#fefce8', border:'1px solid #fde68a', borderRadius:'10px', padding:'12px', marginBottom:'10px' },
  baslikSatir: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px' },
  baslik:      { fontSize:'0.78rem', fontWeight:'700', color:'#92400e', textTransform:'uppercase', letterSpacing:'0.04em' },
  kapatBtn:    { background:'none', border:'none', cursor:'pointer', color:'#9ca3af', fontSize:'0.9rem' },
  aciklama:    { fontSize:'0.88rem', color:'#1f2937', lineHeight:1.6, margin:'0 0 12px' },
  bolum:       { marginBottom:'10px' },
  bolumBaslik: { fontSize:'0.72rem', fontWeight:'700', color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:'6px' },
  bitkiKart:   { background:'#fff', borderRadius:'6px', padding:'6px 10px', marginBottom:'4px', border:'1px solid #fef08a', display:'flex', flexDirection:'column', gap:2 },
  bitkiAd:     { fontWeight:'700', fontSize:'0.85rem', color:'#78350f' },
  bitkiNeden:  { fontSize:'0.78rem', color:'#6b7280' },
  liste:       { margin:0, padding:0, listStyle:'none', display:'flex', flexDirection:'column', gap:4 },
  listeItem:   { fontSize:'0.85rem', color:'#1f2937' },
}

function HalFiyatGrafik({ urunId, urunAd, il }) {
  const [veri, setVeri]         = useState(null)
  const [sehir, setSehir]       = useState('')
  const [yukleniyor, setYukleniyor] = useState(false)
  const [acik, setAcik]         = useState(false)

  useEffect(() => {
    if (!urunId || !acik) return
    setYukleniyor(true)
    const q = sehir ? `&sehir=${sehir}` : (il ? `&sehir=${il}` : '')
    api.get(`/katalog/hal-fiyat/?urun_id=${urunId}${q}`)
      .then(r => setVeri(r.data))
      .catch(() => {})
      .finally(() => setYukleniyor(false))
  }, [urunId, sehir, acik, il])

  if (!acik) return (
    <button style={hf.acBtn} onClick={() => setAcik(true)} type="button">
      📊 Hal Fiyatları
    </button>
  )

  const fiyatlar = veri?.fiyatlar || []
  const sehirler = veri?.sehirler || []

  // SVG sparkline
  const yukseklik = 60
  const genislik  = 280
  let svgPath = ''
  if (fiyatlar.length > 1) {
    const min = Math.min(...fiyatlar.map(f => parseFloat(f.fiyat_min)))
    const max = Math.max(...fiyatlar.map(f => parseFloat(f.fiyat_max)))
    const aralik = max - min || 1
    const pts = fiyatlar.map((f, i) => {
      const x = (i / (fiyatlar.length - 1)) * genislik
      const y = yukseklik - ((parseFloat(f.fiyat_ort) - min) / aralik) * yukseklik
      return `${x},${y}`
    })
    svgPath = `M ${pts.join(' L ')}`
  }

  const son   = fiyatlar[fiyatlar.length - 1]
  const once1 = fiyatlar[fiyatlar.length - 2]
  const once52 = fiyatlar[fiyatlar.length - 53] // ~1 yıl önce

  return (
    <div style={hf.kutu}>
      <div style={hf.baslikSatir}>
        <span style={hf.baslik}>📊 {urunAd} Hal Fiyatı</span>
        <button style={hf.kapatBtn} onClick={() => setAcik(false)}>✕</button>
      </div>

      {sehirler.length > 1 && (
        <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginBottom:8 }}>
          {[...new Set(sehirler)].map(s => (
            <button key={s}
              style={{ ...hf.sehirBtn, ...(sehir===s ? hf.sehirAktif : {}) }}
              onClick={() => setSehir(s)}
            >{s}</button>
          ))}
        </div>
      )}

      {yukleniyor ? (
        <div style={hf.bilgi}>Yükleniyor...</div>
      ) : fiyatlar.length === 0 ? (
        <div style={{ ...hf.bilgi, background:'#fffbeb', border:'1px solid #fcd34d', borderRadius:8, padding:'10px 12px', color:'#92400e' }}>
          📭 {urunAd} için henüz hal fiyatı verisi yok.<br/>
          <span style={{ fontSize:'0.75rem', color:'#78350f' }}>
            Yönetici panelinden <code style={{ background:'#fef3c7', padding:'1px 4px', borderRadius:3 }}>hal_fiyat_cek</code> komutu çalıştırılarak Antalya hali fiyatları çekilebilir.
          </span>
        </div>
      ) : (
        <>
          {/* Özet kutucuklar */}
          <div style={hf.ozetSatir}>
            {son && (
              <div style={hf.ozetKutu}>
                <div style={hf.ozetEtiket}>Son Fiyat</div>
                <div style={hf.ozetDeger}>₺{son.fiyat_ort}</div>
                <div style={hf.ozetTarih}>{new Date(son.tarih).toLocaleDateString('tr-TR', {day:'numeric',month:'short',year:'numeric'})}</div>
              </div>
            )}
            {once1 && (
              <div style={hf.ozetKutu}>
                <div style={hf.ozetEtiket}>Geçen Hafta</div>
                <div style={hf.ozetDeger}>₺{once1.fiyat_ort}</div>
                {son && (
                  <div style={{ fontSize:'0.72rem', color: parseFloat(son.fiyat_ort) >= parseFloat(once1.fiyat_ort) ? '#16a34a' : '#dc2626', fontWeight:600 }}>
                    {parseFloat(son.fiyat_ort) >= parseFloat(once1.fiyat_ort) ? '▲' : '▼'}
                    {' '}{Math.abs(((parseFloat(son.fiyat_ort) - parseFloat(once1.fiyat_ort)) / parseFloat(once1.fiyat_ort)) * 100).toFixed(1)}%
                  </div>
                )}
              </div>
            )}
            {once52 && (
              <div style={hf.ozetKutu}>
                <div style={hf.ozetEtiket}>1 Yıl Önce</div>
                <div style={hf.ozetDeger}>₺{once52.fiyat_ort}</div>
              </div>
            )}
          </div>

          {/* Sparkline grafik */}
          {fiyatlar.length > 2 && (
            <div style={{ overflowX:'auto' }}>
              <svg width={genislik} height={yukseklik + 10} style={{ display:'block' }}>
                <path d={svgPath} fill="none" stroke="#16a34a" strokeWidth="2" strokeLinejoin="round" />
              </svg>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.65rem', color:'#9ca3af', marginTop:2 }}>
                <span>{new Date(fiyatlar[0].tarih).toLocaleDateString('tr-TR', {month:'short', year:'numeric'})}</span>
                <span>{new Date(fiyatlar[Math.floor(fiyatlar.length/2)].tarih).toLocaleDateString('tr-TR', {month:'short', year:'numeric'})}</span>
                <span>{new Date(fiyatlar[fiyatlar.length-1].tarih).toLocaleDateString('tr-TR', {month:'short', year:'numeric'})}</span>
              </div>
            </div>
          )}

          {/* Min-Max */}
          {son && (
            <div style={hf.minmaxSatir}>
              <span style={{ color:'#6b7280', fontSize:'0.78rem' }}>Bu hafta: </span>
              <span style={{ color:'#2563eb', fontWeight:600, fontSize:'0.82rem' }}>₺{son.fiyat_min} – ₺{son.fiyat_max}</span>
              {son.hal_sehir && <span style={{ color:'#9ca3af', fontSize:'0.75rem' }}> · {son.hal_sehir} hali</span>}
            </div>
          )}
        </>
      )}
    </div>
  )
}

const hf = {
  acBtn:       { width:'100%', padding:'8px', background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:'8px', cursor:'pointer', fontSize:'0.85rem', fontWeight:'600', color:'#15803d', marginBottom:'8px' },
  kutu:        { background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:'10px', padding:'12px', marginBottom:'10px' },
  baslikSatir: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'8px' },
  baslik:      { fontSize:'0.78rem', fontWeight:'700', color:'#15803d', textTransform:'uppercase', letterSpacing:'0.04em' },
  kapatBtn:    { background:'none', border:'none', cursor:'pointer', color:'#9ca3af', fontSize:'0.9rem' },
  bilgi:       { fontSize:'0.82rem', color:'#6b7280', lineHeight:1.5 },
  sehirBtn:    { padding:'3px 8px', border:'1px solid #d1d5db', borderRadius:'20px', background:'#fff', cursor:'pointer', fontSize:'0.72rem', color:'#374151' },
  sehirAktif:  { borderColor:'#16a34a', background:'#dcfce7', color:'#15803d', fontWeight:600 },
  ozetSatir:   { display:'flex', gap:'8px', marginBottom:'10px' },
  ozetKutu:    { flex:1, background:'#fff', borderRadius:'8px', padding:'8px', border:'1px solid #d1fae5', textAlign:'center' },
  ozetEtiket:  { fontSize:'0.65rem', color:'#6b7280', fontWeight:'700', textTransform:'uppercase', marginBottom:'2px' },
  ozetDeger:   { fontSize:'0.95rem', fontWeight:'800', color:'#14532d' },
  ozetTarih:   { fontSize:'0.65rem', color:'#9ca3af', marginTop:'2px' },
  minmaxSatir: { marginTop:'8px', fontSize:'0.78rem' },
}

function HavaDurumu({ enlem, boylam, il, ilce }) {
  const [hava, setHava]   = useState(null)
  const [yukleniyor, setYukleniyor] = useState(true)

  useEffect(() => {
    if (!enlem || !boylam) { setYukleniyor(false); return }
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${enlem}&longitude=${boylam}` +
      `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode,windspeed_10m_max` +
      `&hourly=relativehumidity_2m` +
      `&timezone=Europe%2FIstanbul&forecast_days=5`
    fetch(url)
      .then(r => r.json())
      .then(d => {
        const gunler = d.daily.time.map((t, i) => {
          // O güne ait saatlik nem ortalaması (24 saat)
          const nemSaatler = d.hourly.relativehumidity_2m.slice(i * 24, i * 24 + 24)
          const nemOrt = Math.round(nemSaatler.reduce((a, b) => a + b, 0) / nemSaatler.length)
          return {
            tarih: t,
            max: Math.round(d.daily.temperature_2m_max[i]),
            min: Math.round(d.daily.temperature_2m_min[i]),
            yagis: d.daily.precipitation_sum[i],
            kod: d.daily.weathercode[i],
            nem: nemOrt,
          }
        })
        setHava(gunler)
      })
      .catch(() => {})
      .finally(() => setYukleniyor(false))
  }, [enlem, boylam])

  if (!enlem || !boylam) return (
    <div style={hw.yok}>📍 Koordinat girilmemiş — hava durumu alınamıyor</div>
  )
  if (yukleniyor) return <div style={hw.yukleniyor}>🌤 Hava durumu yükleniyor...</div>
  if (!hava) return null

  const bugun = hava[0]

  return (
    <div style={hw.kapsayici}>
      <div style={hw.baslik}>🌤 {ilce || il} Hava Tahmini</div>

      {/* Bugün özet */}
      <div style={hw.bugunSatir}>
        <div style={hw.bugunKutu}>
          <span style={hw.bugunEtiket}>🌡 Max</span>
          <span style={hw.bugunDeger}>{bugun.max}°C</span>
        </div>
        <div style={hw.bugunKutu}>
          <span style={hw.bugunEtiket}>🌡 Min</span>
          <span style={hw.bugunDeger}>{bugun.min}°C</span>
        </div>
        <div style={hw.bugunKutu}>
          <span style={hw.bugunEtiket}>💧 Nem</span>
          <span style={hw.bugunDeger}>%{bugun.nem}</span>
        </div>
        <div style={hw.bugunKutu}>
          <span style={hw.bugunEtiket}>🌧 Yağış</span>
          <span style={hw.bugunDeger}>{bugun.yagis} mm</span>
        </div>
      </div>

      {/* 5 günlük */}
      <div style={hw.gunlerSatir}>
        {hava.map((g, i) => {
          const d = new Date(g.tarih)
          const gunEtiket = i === 0 ? 'Bugün' : i === 1 ? 'Yarın' : i === 2 ? 'Öbür gün' : d.toLocaleDateString('tr-TR', { weekday: 'short' })
          const tarihKisa = d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
          return (
            <div key={`${g.tarih}-${i}`} style={hw.gunKutu}>
              <div style={hw.gunAd}>{gunEtiket}</div>
              <div style={hw.gunTarih}>{tarihKisa}</div>
              <div style={hw.gunIkon}>{g.yagis > 2 ? '🌧' : g.kod <= 2 ? '☀️' : g.kod <= 45 ? '⛅' : '🌥'}</div>
              <div style={hw.gunMax}>{g.max}°</div>
              <div style={hw.gunMin}>{g.min}°</div>
              <div style={hw.gunNem}>💧{g.nem}%</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const hw = {
  kapsayici:   { background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '10px', padding: '12px', marginBottom: '10px' },
  baslik:      { fontSize: '0.78rem', fontWeight: '700', color: '#0369a1', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.04em' },
  yok:         { fontSize: '0.8rem', color: '#aaa', padding: '8px 0' },
  yukleniyor:  { fontSize: '0.82rem', color: '#6b7280', padding: '8px 0' },
  bugunSatir:  { display: 'flex', gap: '8px', marginBottom: '12px' },
  bugunKutu:   { flex: 1, background: '#fff', borderRadius: '8px', padding: '8px 4px', textAlign: 'center', border: '1px solid #e0f2fe' },
  bugunEtiket: { display: 'block', fontSize: '0.68rem', color: '#64748b', marginBottom: '2px' },
  bugunDeger:  { display: 'block', fontSize: '1rem', fontWeight: '700', color: '#0c4a6e' },
  gunlerSatir: { display: 'flex', gap: '6px' },
  gunKutu:     { flex: 1, textAlign: 'center', background: '#fff', borderRadius: '8px', padding: '6px 2px', border: '1px solid #e0f2fe' },
  gunAd:       { fontSize: '0.68rem', color: '#0369a1', fontWeight: '700' },
  gunTarih:    { fontSize: '0.62rem', color: '#94a3b8', marginBottom: '2px' },
  gunIkon:     { fontSize: '1.1rem', margin: '2px 0' },
  gunMax:      { fontSize: '0.82rem', fontWeight: '700', color: '#b45309' },
  gunMin:      { fontSize: '0.78rem', color: '#0369a1' },
  gunNem:      { fontSize: '0.68rem', color: '#0891b2', marginTop: '2px' },
}

const TAVSIYE_CACHE_SURE = 6 * 60 * 60 * 1000 // 6 saat

function TavsiyeBlok({ isletmeId, urunAd, cesitAd }) {
  const cacheKey = `tavsiye_${isletmeId}`

  const cachedInit = () => {
    try {
      const raw = localStorage.getItem(cacheKey)
      if (!raw) return null
      const { veri, ts } = JSON.parse(raw)
      if (Date.now() - ts < TAVSIYE_CACHE_SURE) return veri
      localStorage.removeItem(cacheKey)
    } catch { /* bozuk veri */ }
    return null
  }

  const onceki = cachedInit()
  const [durum, setDurum]   = useState(onceki ? 'tamam' : 'bos')
  const [veri, setVeri]     = useState(onceki)
  const [hata, setHata]     = useState('')

  async function getir() {
    setDurum('yukleniyor')
    try {
      const res = await api.post('/ai/tavsiye/', { isletme_id: isletmeId, kullanici_tipi: 'ciftci' })
      setVeri(res.data)
      setDurum('tamam')
      try { localStorage.setItem(cacheKey, JSON.stringify({ veri: res.data, ts: Date.now() })) } catch {}
    } catch (e) {
      setHata(e.response?.data?.hata || 'Bir hata oluştu.')
      setDurum('hata')
    }
  }

  function yenile() {
    localStorage.removeItem(cacheKey)
    getir()
  }

  if (durum === 'bos') return (
    <button style={s.tavsiyeBtn} onClick={getir} type="button">
      ✨ AI Tavsiye Al
    </button>
  )

  if (durum === 'yukleniyor') return (
    <div style={s.tavsiyeYukleniyor}>⏳ AI analiz ediyor...</div>
  )

  if (durum === 'hata') return (
    <div style={{ ...s.tavsiyeYukleniyor, color: '#dc2626' }}>{hata}
      <button style={s.tekrarBtn} onClick={() => setDurum('bos')}>Tekrar dene</button>
    </div>
  )

  const gorselUrl = bitkiGorselUrl(urunAd)

  return (
    <div style={s.tavsiyeBlok}>
      <img
        src={gorselUrl}
        alt={urunAd || 'bitki'}
        style={s.bitkiGorsel}
        onError={e => { e.target.style.display = 'none' }}
      />
      <div style={{ padding: '14px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
          <div style={s.tavsiyeBaslik}>✨ AI Tarım Tavsiyesi</div>
          <button onClick={yenile} title="Yenile" type="button"
            style={{ background:'none', border:'none', cursor:'pointer', fontSize:'0.78rem', color:'#6b7280', padding:'2px 4px' }}>
            ↺ Yenile
          </button>
        </div>

        {veri.hava_uyarisi && (
          <div style={s.havaUyari}>⚠️ {veri.hava_uyarisi}</div>
        )}

        {veri.genel_durum && (
          <p style={s.genelDurum}>{veri.genel_durum}</p>
        )}

        {veri.yapilacaklar?.length > 0 && (
          <div style={s.yapilacaklarBlok}>
            <div style={s.altBaslik}>Bu dönemde yapılması gerekenler</div>
            <ul style={s.liste}>
              {veri.yapilacaklar.map((m, i) => (
                <li key={i} style={s.listeItem}>✓ {m}</li>
              ))}
            </ul>
          </div>
        )}

        <div style={s.hasatSatir}>
          {veri.tahmini_hasat_tarihi && (
            <div style={s.hasatKutu}>
              <div style={s.hasatEtiket}>📅 Tahmini Hasat</div>
              <div style={s.hasatDeger}>{veri.tahmini_hasat_tarihi}</div>
            </div>
          )}
          {veri.tahmini_hasat_miktari && (
            <div style={s.hasatKutu}>
              <div style={s.hasatEtiket}>⚖️ Tahmini Miktar</div>
              <div style={s.hasatDeger}>{veri.tahmini_hasat_miktari}</div>
            </div>
          )}
        </div>

        <button style={s.tekrarBtn} onClick={() => setDurum('bos')}>🔄 Yenile</button>
      </div>
    </div>
  )
}

function SoruForm({ isletmeId }) {
  const [acik, setAcik]             = useState(false)
  const [metin, setMetin]           = useState('')
  const [foto, setFoto]             = useState(null)
  const [gonderiyor, setGonderiyor] = useState(false)
  const [sonuc, setSonuc]           = useState(null)
  const [sorular, setSorular]       = useState(null) // null = henüz yüklenmedi

  const sorulariYukle = async () => {
    try {
      const res = await api.get('/ciftci/sorularim/')
      setSorular(res.data.filter(q => q.isletme === isletmeId))
    } catch {}
  }

  useEffect(() => { sorulariYukle() }, [isletmeId])

  const gonder = async () => {
    if (!metin.trim()) return
    setGonderiyor(true)
    try {
      const fd = new FormData()
      fd.append('metin', metin)
      fd.append('isletme', isletmeId)
      if (foto) fd.append('fotograf', foto)
      await api.post('/ciftci/soru-gonder/', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setMetin(''); setFoto(null); setAcik(false)
      setSonuc('Sorunuz iletildi.')
      setTimeout(() => setSonuc(null), 4000)
      sorulariYukle()
    } catch { setSonuc('Hata oluştu.') }
    finally { setGonderiyor(false) }
  }

  const yanıtlananSayisi = (sorular || []).filter(q => q.durum === 'yanitlandi' && q.yanit).length

  return (
    <div style={{ marginTop: 10, borderTop: '1px solid #e5e7eb', paddingTop: 10 }}>
      {/* Geçmiş sorular */}
      {sorular && sorular.length > 0 && (
        <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:8 }}>
          {sorular.map(q => (
            <div key={q.id} style={{ background: q.durum === 'yanitlandi' ? '#f0faf5' : '#fffbeb', border: `1px solid ${q.durum === 'yanitlandi' ? '#bbf7d0' : '#fde68a'}`, borderRadius:8, padding:'8px 10px', fontSize:'0.85rem' }}>
              <div style={{ display:'flex', justifyContent:'space-between', gap:8 }}>
                <span style={{ color:'#374151' }}>{q.metin}</span>
                <span style={{ fontSize:'0.75rem', color: q.durum === 'yanitlandi' ? '#1a7a4a' : '#92400e', flexShrink:0 }}>
                  {q.durum === 'yanitlandi' ? '✓ Yanıtlandı' : '⏳ Bekliyor'}
                </span>
              </div>
              {q.ai_teshis && (
                <div style={{ marginTop:5, fontSize:'0.8rem', color:'#6d28d9', background:'#f5f3ff', borderRadius:5, padding:'4px 8px' }}>
                  🤖 {q.ai_teshis}
                </div>
              )}
              {q.yanit && (
                <div style={{ marginTop:5, fontSize:'0.83rem', color:'#065f46', background:'#ecfdf5', borderRadius:5, padding:'4px 8px' }}>
                  👨‍💼 {q.yanit}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Bildirim */}
      {sonuc && <div style={{ fontSize:'0.82rem', color:'#1a7a4a', marginBottom:4 }}>{sonuc}</div>}

      {/* Form */}
      {!acik ? (
        <button onClick={() => setAcik(true)}
          style={{ fontSize:'0.82rem', color:'#1a7a4a', background:'none', border:'1px solid #1a7a4a', borderRadius:6, padding:'4px 12px', cursor:'pointer' }}>
          💬 Mühendise Sor
        </button>
      ) : (
        <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:8, padding:'10px 12px', display:'flex', flexDirection:'column', gap:6 }}>
          <textarea value={metin} onChange={e => setMetin(e.target.value)} rows={3} placeholder="Sorunuzu yazın..."
            style={{ width:'100%', borderRadius:6, border:'1px solid #d1d5db', padding:'6px 8px', fontSize:'0.88rem', resize:'vertical', boxSizing:'border-box' }} />
          <input type="file" accept="image/*" onChange={e => setFoto(e.target.files[0])}
            style={{ fontSize:'0.8rem' }} />
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={gonder} disabled={gonderiyor || !metin.trim()}
              style={{ background:'#1a7a4a', color:'#fff', border:'none', borderRadius:6, padding:'5px 14px', fontSize:'0.85rem', cursor:'pointer' }}>
              {gonderiyor ? '...' : 'Gönder'}
            </button>
            <button onClick={() => { setAcik(false); setMetin(''); setFoto(null) }}
              style={{ background:'none', border:'1px solid #ccc', borderRadius:6, padding:'5px 12px', fontSize:'0.85rem', cursor:'pointer' }}>
              İptal
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AnaSayfa() {
  const navigate = useNavigate()
  const { kullanici, yukleniyor: authYukleniyor } = useContext(AuthContext)
  const { isMobile } = useBreakpoint()
  const [isletmeler, setIsletmeler] = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [duyurular, setDuyurular]   = useState([])
  const [duyuruAcik, setDuyuruAcik] = useState(null) // açık duyuru id

  useEffect(() => {
    if (authYukleniyor) return
    if (!kullanici || kullanici.rol !== 'ciftci') { navigate('/giris'); return }
    api.get('/ciftci/isletmelerim/')
      .then(r => setIsletmeler(r.data))
      .catch(() => {})
      .finally(() => setYukleniyor(false))
    api.get('/ciftci/duyurular/').then(r => setDuyurular(r.data)).catch(() => {})
  }, [authYukleniyor, kullanici, navigate])

  if (authYukleniyor || yukleniyor) return <div style={s.yuklenme}>Yükleniyor...</div>

  const aktif = isletmeler.filter(i => i.aktif)

  return (
    <div style={{ ...s.kapsayici, padding: isMobile ? '1rem' : '1.5rem' }}>
      <div style={s.hosgeldin}>
        <div>
          <h2 style={s.baslik}>Merhaba, {kullanici?.first_name || kullanici?.username} 👋</h2>
          <p style={s.altBaslikGri}>İşletmelerinizin dönem özeti</p>
        </div>
      </div>

      {/* Mühendis duyuruları */}
      {duyurular.length > 0 && (
        <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:16 }}>
          {duyurular.map(d => (
            <div key={d.id} style={{ background:'#fffbeb', border:'1px solid #fcd34d', borderRadius:10, padding:'10px 14px', cursor:'pointer' }}
              onClick={() => setDuyuruAcik(duyuruAcik === d.id ? null : d.id)}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontWeight:600, fontSize:'0.9rem', color:'#92400e' }}>📢 {d.baslik}</span>
                <span style={{ fontSize:'0.75rem', color:'#aaa' }}>
                  {new Date(d.olusturma).toLocaleDateString('tr-TR')} {duyuruAcik === d.id ? '▲' : '▼'}
                </span>
              </div>
              {duyuruAcik === d.id && (
                <p style={{ margin:'8px 0 0', fontSize:'0.88rem', color:'#78350f', whiteSpace:'pre-wrap' }}>{d.metin}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {aktif.length === 0 ? (
        <div style={s.bos}>
          <p style={{ fontSize:'1.1rem', color:'#888', margin:0 }}>Henüz aktif işletme yok.</p>
          <p style={{ fontSize:'0.85rem', color:'#aaa', marginTop:'6px' }}>Menüden işletme ekleyebilirsiniz.</p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
          {aktif.map(i => {
            const gun   = gunFarki(i.ekim_tarihi)
            const donem = gun !== null ? donemAdi(gun) : null

            return (
              <div key={i.id} style={s.kart}>
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

                <HavaDurumu enlem={i.enlem} boylam={i.boylam} il={i.il} ilce={i.ilce} />
                <ToprakDegerlendirme isletmeId={i.id} urunAd={i.urun_ad} />
                <HalFiyatGrafik urunId={i.urun} urunAd={i.urun_ad} il={i.il} />
                <TavsiyeBlok isletmeId={i.id} urunAd={i.urun_ad} cesitAd={i.cesit_ad} />
                <SoruForm isletmeId={i.id} />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const s = {
  kapsayici:    { maxWidth: '720px', margin: '0 auto' },
  yuklenme:     { padding: '3rem', textAlign: 'center', color: '#888' },
  hosgeldin:    { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' },
  baslik:       { fontSize: '1.3rem', fontWeight: '700', color: '#1a1a1a', margin: 0 },
  altBaslikGri: { fontSize: '0.85rem', color: '#888', margin: '4px 0 0' },
  bos:          { padding: '3rem', textAlign: 'center', background: '#f9f9f9', borderRadius: '12px' },
  kart:         { background: '#fff', border: '1px solid #e8e8e8', borderRadius: '14px', padding: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' },
  kartUst:      { display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '10px' },
  urunEmoji:    { fontSize: '2rem', lineHeight: 1, flexShrink: 0 },
  isletmeAd:    { fontWeight: '700', fontSize: '1rem', color: '#1a1a1a' },
  urunAd:       { fontSize: '0.85rem', color: '#666', marginTop: '2px' },
  donemRozet:   { padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '600', flexShrink: 0, whiteSpace: 'nowrap' },
  gunBar:       { display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid #f5f5f5' },
  gunSayi:      { fontSize: '2rem', fontWeight: '800', color: '#1a7a4a', lineHeight: 1 },
  gunYazi:      { fontSize: '1rem', color: '#888', fontWeight: '500' },
  ekimTarih:    { fontSize: '0.78rem', color: '#bbb', marginLeft: 'auto' },

  tavsiyeBtn:   { width: '100%', padding: '11px', background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '0.95rem', fontWeight: '600' },
  tavsiyeYukleniyor: { padding: '10px', fontSize: '0.88rem', color: '#6b7280', textAlign: 'center' },
  tavsiyeBlok:  { background: '#f5f3ff', borderRadius: '10px', overflow: 'hidden' },
  bitkiGorsel:  { width: '100%', height: '200px', objectFit: 'cover', display: 'block', borderRadius: '10px 10px 0 0' },
  tavsiyeBaslik:{ fontWeight: '700', fontSize: '0.88rem', color: '#4f46e5', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' },
  genelDurum:   { fontSize: '0.9rem', color: '#1f2937', lineHeight: 1.5, margin: '0 0 10px' },
  yapilacaklarBlok: { marginBottom: '12px' },
  altBaslik:    { fontSize: '0.75rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' },
  liste:        { margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '5px' },
  listeItem:    { fontSize: '0.9rem', color: '#1f2937' },
  hasatSatir:   { display: 'flex', gap: '10px', marginBottom: '10px' },
  hasatKutu:    { flex: 1, background: '#fff', borderRadius: '8px', padding: '10px 12px', border: '1px solid #e0e7ff' },
  hasatEtiket:  { fontSize: '0.72rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', marginBottom: '4px' },
  hasatDeger:   { fontSize: '0.88rem', fontWeight: '600', color: '#1e1b4b' },
  havaUyari:    { background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '8px', padding: '8px 12px', fontSize: '0.88rem', color: '#9a3412', marginBottom: '10px', lineHeight: 1.5 },
  tekrarBtn:    { background: 'none', border: 'none', color: '#7c3aed', fontSize: '0.8rem', cursor: 'pointer', padding: 0 },
}
