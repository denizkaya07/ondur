/* eslint react/prop-types: 0 */
import { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import api from '../services/api'
import { useNavigate } from 'react-router-dom'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const bugun = () => new Date().toISOString().slice(0, 10)

// Haversine mesafe (km)
function mesafeKm(lat1, lon1, lat2, lon2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

function seciliIkon(secili, oneri) {
  const bg = secili ? '#1a7a4a' : oneri ? '#f59e0b' : '#fff'
  const border = oneri ? '#f59e0b' : '#1a7a4a'
  return L.divIcon({
    className: '',
    html: `<div style="width:34px;height:34px;border-radius:50%;background:${bg};border:3px solid ${border};display:flex;align-items:center;justify-content:center;font-size:17px;box-shadow:0 2px 8px rgba(0,0,0,0.25);cursor:pointer;">${oneri && !secili ? '⭐' : '🌱'}</div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  })
}

// Haritayı başlangıçta sınırlara sığdır, sonra sabit tut
function HaritaBounds({ bounds }) {
  const map = useMap()
  const fitted = useRef(false)
  useEffect(() => {
    if (fitted.current || !bounds) return
    map.fitBounds(bounds, { padding: [40, 40] })
    fitted.current = true
  }, [bounds, map])
  return null
}

export default function ZiyaretHarita({ onKapat }) {
  const navigate = useNavigate()
  const [tumIsletmeler, setTumIsletmeler] = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [secili, setSecili] = useState({}) // { id: { danisan, tarih } }
  const [kaydediyor, setKaydediyor] = useState(false)
  const [takvimHata, setTakvimHata] = useState('')

  useEffect(() => {
    api.get('/ciftci/danisanlarim/')
      .then(r => setTumIsletmeler(r.data))
      .catch(() => {})
      .finally(() => setYukleniyor(false))
  }, [])

  const gpsliler  = tumIsletmeler.filter(d => d.isletme?.enlem && d.isletme?.boylam)
  const gpssizler = tumIsletmeler.filter(d => !(d.isletme?.enlem && d.isletme?.boylam))

  // Bounds — tüm GPS işletmelerini kapsasın, sabit
  const bounds = gpsliler.length > 0
    ? L.latLngBounds(gpsliler.map(d => [parseFloat(d.isletme.enlem), parseFloat(d.isletme.boylam)]))
    : null
  const merkez = bounds ? bounds.getCenter() : [36.37, 30.29]

  const toggle = (danisan) => {
    const id = danisan.isletme.id
    setSecili(prev => {
      if (prev[id]) { const { [id]: _, ...rest } = prev; return rest }
      return { ...prev, [id]: { danisan, tarih: bugun() } }
    })
  }

  const setTarih = (id, tarih) => setSecili(prev => prev[id] ? { ...prev, [id]: { ...prev[id], tarih } } : prev)

  const seciliListe = Object.values(secili)
  const seciliSayisi = seciliListe.length

  // En son seçilen işletmeye en yakın seçilmemiş işletmeyi öner
  const oneriId = (() => {
    if (seciliSayisi === 0) return null
    const son = seciliListe[seciliListe.length - 1].danisan.isletme
    const sonLat = parseFloat(son.enlem), sonLon = parseFloat(son.boylam)
    let enYakin = null, enYakinMesafe = Infinity
    gpsliler.forEach(d => {
      if (secili[d.isletme.id]) return
      const m = mesafeKm(sonLat, sonLon, parseFloat(d.isletme.enlem), parseFloat(d.isletme.boylam))
      if (m < enYakinMesafe) { enYakinMesafe = m; enYakin = d.isletme.id }
    })
    return enYakin
  })()

  return (
    <div style={s.overlay}>
      <div style={s.modal}>
        <div style={s.ust}>
          <div>
            <div style={s.baslik}>🗺️ Ziyaret Planı</div>
            <div style={s.meta}>İşletmeleri seçin, her birine tarih atayın</div>
          </div>
          <button style={s.kapatBtn} onClick={onKapat}>✕</button>
        </div>

        <div style={s.govde}>
          <div style={s.sol}>
            <div style={s.haritaKap}>
              {yukleniyor ? (
                <div style={s.yuklenme}>Harita yükleniyor…</div>
              ) : gpsliler.length === 0 ? (
                <div style={s.yuklenme}>GPS koordinatı olan işletme bulunamadı.</div>
              ) : (
                <MapContainer center={merkez} zoom={11} style={{ width:'100%', height:'100%' }} zoomControl={true}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
                  <HaritaBounds bounds={bounds} />
                  {gpsliler.map(d => {
                    const isl = d.isletme
                    const sec = !!secili[isl.id]
                    const oneri = isl.id === oneriId

                    // Seçili işletmelere mesafe hesapla
                    const mesafeler = seciliListe.map(({ danisan: sd }) => {
                      const km = mesafeKm(
                        parseFloat(sd.isletme.enlem), parseFloat(sd.isletme.boylam),
                        parseFloat(isl.enlem), parseFloat(isl.boylam)
                      )
                      return { ad: sd.isletme.ad, km: km.toFixed(1) }
                    }).filter(m => m.km > 0)

                    return (
                      <Marker
                        key={isl.id}
                        position={[parseFloat(isl.enlem), parseFloat(isl.boylam)]}
                        icon={seciliIkon(sec, oneri)}
                        eventHandlers={{ click: () => toggle(d) }}
                      >
                        <Popup>
                          <div style={{ minWidth: '180px' }}>
                            <b>{isl.ad}</b><br />
                            👨‍🌾 {d.ciftci_ad} {d.ciftci_soyad}<br />
                            🌱 {isl.urun_ad || '—'}{isl.cesit_ad ? ` - ${isl.cesit_ad}` : ''}<br />
                            {isl.alan_dekar && <>📏 {parseFloat(isl.alan_dekar)} da<br /></>}
                            {oneri && <div style={{ color:'#f59e0b', fontWeight:600, fontSize:'12px', margin:'4px 0' }}>⭐ En yakın öneri</div>}
                            {mesafeler.length > 0 && (
                              <div style={{ fontSize:'11px', color:'#666', marginTop:'4px', borderTop:'1px solid #eee', paddingTop:'4px' }}>
                                {mesafeler.map((m, i) => <div key={i}>📍 {m.ad.split('-')[0].trim()}: {m.km} km</div>)}
                              </div>
                            )}
                            {sec
                              ? <div style={{ marginTop:'6px', color:'#1a7a4a', fontWeight:'700', fontSize:'13px' }}>✓ Ziyarete Eklendi</div>
                              : <div style={{ marginTop:'6px', color:'#aaa', fontSize:'12px' }}>Tıklayarak ekleyin</div>
                            }
                          </div>
                        </Popup>
                      </Marker>
                    )
                  })}
                </MapContainer>
              )}
            </div>

            {gpssizler.length > 0 && (
              <div style={s.gpssizBlok}>
                <div style={s.gpssizBaslik}>📋 GPS'siz İşletmeler</div>
                <div style={s.gpssizListe}>
                  {gpssizler.map(d => {
                    const sec = !!secili[d.isletme.id]
                    return (
                      <div key={d.isletme.id} style={{ ...s.gpssizSatir, background: sec ? '#edf7f1' : '#fff', borderColor: sec ? '#1a7a4a' : '#e0e0e0' }}>
                        <div style={s.gpssizBilgi}>
                          <span style={s.gpssizAd}>{d.isletme.ad}</span>
                          <span style={s.gpssizMeta}>👨‍🌾 {d.ciftci_ad} {d.ciftci_soyad} · 🌱 {d.isletme.urun_ad || '—'}</span>
                        </div>
                        <button style={{ ...s.togBtn, background: sec ? '#e05' : '#1a7a4a' }} onClick={() => toggle(d)}>
                          {sec ? '✕' : '+'}
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Sağ panel */}
          <div style={s.panel}>
            <div style={s.panelBaslik}>
              Ziyaret Listesi
              {seciliSayisi > 0 && <span style={s.badge}>{seciliSayisi}</span>}
            </div>

            {/* Öneri */}
            {oneriId && seciliSayisi > 0 && (() => {
              const oneriDanisan = gpsliler.find(d => d.isletme.id === oneriId)
              const sonSec = seciliListe[seciliListe.length - 1].danisan.isletme
              const km = mesafeKm(
                parseFloat(sonSec.enlem), parseFloat(sonSec.boylam),
                parseFloat(oneriDanisan.isletme.enlem), parseFloat(oneriDanisan.isletme.boylam)
              ).toFixed(1)
              return (
                <div style={s.oneriBlok}>
                  <div style={s.oneriBaslik}>⭐ Önerilen Sonraki Durak</div>
                  <div style={s.oneriAd}>{oneriDanisan.isletme.ad}</div>
                  <div style={s.oneriMeta}>👨‍🌾 {oneriDanisan.ciftci_ad} · 📍 {km} km uzakta</div>
                  <button style={s.oneriEkleBtn} onClick={() => toggle(oneriDanisan)}>+ Ziyarete Ekle</button>
                </div>
              )
            })()}

            {seciliSayisi === 0 ? (
              <p style={s.bos}>Haritadan işletme seçin</p>
            ) : (
              <div style={s.liste}>
                {seciliListe.map(({ danisan: d, tarih }, idx) => {
                  // Bir önceki ile mesafe
                  const onceki = idx > 0 ? seciliListe[idx-1].danisan.isletme : null
                  const araKm = onceki && d.isletme.enlem
                    ? mesafeKm(parseFloat(onceki.enlem), parseFloat(onceki.boylam), parseFloat(d.isletme.enlem), parseFloat(d.isletme.boylam)).toFixed(1)
                    : null
                  return (
                    <div key={d.isletme.id}>
                      {araKm && <div style={s.araKm}>↕ {araKm} km</div>}
                      <div style={s.kart}>
                        <div style={s.kartUst}>
                          <div style={s.kartNo}>{idx + 1}</div>
                          <div style={s.kartAd}>{d.isletme.ad}</div>
                          <button style={s.silBtn} onClick={() => toggle(d)}>✕</button>
                        </div>
                        <div style={s.kartMeta}>👨‍🌾 {d.ciftci_ad} {d.ciftci_soyad}</div>
                        <div style={s.kartMeta}>🌱 {d.isletme.urun_ad || '—'}</div>
                        <div style={s.tarihSatir}>
                          <span>📅</span>
                          <input type="date" value={tarih} onChange={e => setTarih(d.isletme.id, e.target.value)} style={s.tarihInput} />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {seciliSayisi > 0 && (
              <div style={s.altBlok}>
                {takvimHata && <div style={{ color:'#c00', fontSize:'0.78rem' }}>{takvimHata}</div>}
                <button style={{ ...s.planBtn, opacity: kaydediyor ? 0.6 : 1 }} disabled={kaydediyor}
                  onClick={async () => {
                    setKaydediyor(true); setTakvimHata('')
                    try {
                      for (const { danisan: d, tarih } of seciliListe) {
                        await api.post('/ziyaret/', { isletme: d.isletme.id, tarih, saat: '09:00', sure_dk: 60, tur: 'saha' })
                      }
                      onKapat(); navigate('/muhendis/takvim')
                    } catch { setTakvimHata('Kaydedilemedi, tekrar deneyin.') }
                    finally { setKaydediyor(false) }
                  }}>
                  {kaydediyor ? 'Kaydediliyor…' : `📅 Takvime Ekle (${seciliSayisi} ziyaret)`}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const s = {
  overlay:      { position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:500, display:'flex', alignItems:'center', justifyContent:'center', padding:'16px' },
  modal:        { background:'#fff', borderRadius:'14px', width:'100%', maxWidth:'980px', height:'92vh', display:'flex', flexDirection:'column', boxShadow:'0 12px 48px rgba(0,0,0,0.25)', overflow:'hidden' },
  ust:          { display:'flex', alignItems:'flex-start', justifyContent:'space-between', padding:'16px 20px', borderBottom:'1px solid #e8e8e8', flexShrink:0 },
  baslik:       { fontSize:'1.15rem', fontWeight:'700', color:'#1a7a4a' },
  meta:         { fontSize:'0.78rem', color:'#888', marginTop:'2px' },
  kapatBtn:     { background:'none', border:'none', fontSize:'1.2rem', cursor:'pointer', color:'#aaa', padding:'4px' },
  govde:        { display:'flex', flex:1, overflow:'hidden' },
  sol:          { flex:1, display:'flex', flexDirection:'column', overflow:'hidden' },
  haritaKap:    { flex:1, position:'relative', minHeight:0 },
  yuklenme:     { display:'flex', alignItems:'center', justifyContent:'center', height:'100%', color:'#aaa' },
  gpssizBlok:   { borderTop:'1px solid #e8e8e8', flexShrink:0, maxHeight:'160px', display:'flex', flexDirection:'column' },
  gpssizBaslik: { padding:'8px 14px', fontSize:'0.8rem', fontWeight:'600', color:'#555', borderBottom:'1px solid #f0f0f0', flexShrink:0 },
  gpssizListe:  { overflowY:'auto', padding:'6px 10px', display:'flex', flexDirection:'column', gap:'5px' },
  gpssizSatir:  { display:'flex', alignItems:'center', gap:'8px', padding:'7px 10px', border:'1px solid', borderRadius:'7px' },
  gpssizBilgi:  { flex:1 },
  gpssizAd:     { fontWeight:'600', fontSize:'0.83rem', color:'#1a1a1a', display:'block' },
  gpssizMeta:   { fontSize:'0.73rem', color:'#666', display:'block' },
  togBtn:       { width:'30px', height:'30px', border:'none', borderRadius:'50%', color:'#fff', fontSize:'1rem', cursor:'pointer', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' },
  panel:        { width:'270px', borderLeft:'1px solid #e8e8e8', display:'flex', flexDirection:'column', flexShrink:0, overflowY:'auto' },
  panelBaslik:  { padding:'12px 14px', fontWeight:'600', fontSize:'0.9rem', color:'#333', borderBottom:'1px solid #f0f0f0', display:'flex', alignItems:'center', gap:'6px', flexShrink:0 },
  badge:        { background:'#1a7a4a', color:'#fff', borderRadius:'10px', fontSize:'0.72rem', padding:'1px 7px', fontWeight:700 },
  bos:          { color:'#bbb', fontSize:'0.85rem', textAlign:'center', padding:'20px 14px', fontStyle:'italic' },
  oneriBlok:    { margin:'8px 10px', padding:'10px', background:'#fffbeb', border:'1px solid #f59e0b', borderRadius:'8px', display:'flex', flexDirection:'column', gap:'3px' },
  oneriBaslik:  { fontSize:'0.72rem', fontWeight:'700', color:'#b45309' },
  oneriAd:      { fontSize:'0.85rem', fontWeight:'600', color:'#1a1a1a' },
  oneriMeta:    { fontSize:'0.75rem', color:'#666' },
  oneriEkleBtn: { marginTop:'6px', padding:'6px', background:'#f59e0b', color:'#fff', border:'none', borderRadius:'6px', cursor:'pointer', fontSize:'0.82rem', fontWeight:'600' },
  liste:        { padding:'8px', display:'flex', flexDirection:'column', gap:'0', flex:1, overflowY:'auto' },
  araKm:        { textAlign:'center', fontSize:'0.72rem', color:'#aaa', padding:'3px 0' },
  kart:         { border:'1px solid #d4eadb', borderRadius:'9px', padding:'10px 12px', background:'#f8fdf9', display:'flex', flexDirection:'column', gap:'3px', marginBottom:'4px' },
  kartUst:      { display:'flex', alignItems:'center', gap:'6px' },
  kartNo:       { width:'20px', height:'20px', borderRadius:'50%', background:'#1a7a4a', color:'#fff', fontSize:'0.72rem', fontWeight:'700', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 },
  kartAd:       { fontWeight:'700', fontSize:'0.83rem', color:'#1a1a1a', flex:1 },
  kartMeta:     { fontSize:'0.75rem', color:'#666', paddingLeft:'26px' },
  silBtn:       { background:'none', border:'none', cursor:'pointer', color:'#bbb', fontSize:'0.9rem', padding:'0', flexShrink:0 },
  tarihSatir:   { display:'flex', alignItems:'center', gap:'5px', marginTop:'4px', paddingLeft:'22px' },
  tarihInput:   { flex:1, padding:'4px 8px', border:'1px solid #cce0d4', borderRadius:'6px', fontSize:'0.8rem' },
  altBlok:      { padding:'10px', borderTop:'1px solid #f0f0f0', display:'flex', flexDirection:'column', gap:'6px', flexShrink:0 },
  planBtn:      { padding:'11px', background:'#1a7a4a', color:'#fff', border:'none', borderRadius:'8px', cursor:'pointer', fontSize:'0.88rem', fontWeight:'600' },
}
