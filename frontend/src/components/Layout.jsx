import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import PropTypes from 'prop-types'
import { useNavigate, useLocation } from 'react-router-dom'
import OfflineBanner from './OfflineBanner'
import api from '../services/api'
import ZiyaretHarita from './ZiyaretHarita'

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
  const navigate  = useNavigate()
  const location  = useLocation()
  const [drawerAcik, setDrawerAcik] = useState(false)
  const [talepPanel, setTalepPanel] = useState(false)
  const [talepler, setTalepler]     = useState([])
  const [islemde, setIslemde]       = useState(null)
  const [icmalAcik, setIcmalAcik]       = useState(false)
  const [icmalDanisanlar, setIcmalDanisanlar] = useState([])
  const [icmalSecili, setIcmalSecili]   = useState(null) // danisan objesi
  const [icmalReceteler, setIcmalReceteler] = useState([])
  const [icmalYukleniyor, setIcmalYukleniyor] = useState(false)
  const [haritaAcik, setHaritaAcik] = useState(false)

  const menu = menuler[kullanici?.rol] || []

  const git = (yol) => {
    navigate(yol)
    setDrawerAcik(false)
  }

  // Mühendis ise gelen talepleri yükle
  useEffect(() => {
    if (kullanici?.rol !== 'muhendis') return
    api.get('/ciftci/gelen-talepler/').then(r => setTalepler(r.data)).catch(() => {})
  }, [kullanici])

  const talepYanitla = async (id, karar) => {
    setIslemde(id)
    try {
      await api.post(`/ciftci/gelen-talepler/${id}/yanit/`, { karar })
      setTalepler(p => p.filter(t => t.id !== id))
    } finally {
      setIslemde(null)
    }
  }

  const icmalAc = async () => {
    setIcmalAcik(true)
    setIcmalSecili(null)
    setIcmalReceteler([])
    setIcmalYukleniyor(true)
    try {
      const r = await api.get('/ciftci/danisanlarim/')
      // Çiftçi bazlı grupla (bir çiftçinin birden fazla işletmesi olabilir)
      const grupMap = {}
      r.data.forEach(d => {
        const key = d.ciftci_id || `${d.ciftci_ad}_${d.ciftci_soyad}`
        if (!grupMap[key]) {
          grupMap[key] = { ciftci_ad: d.ciftci_ad, ciftci_soyad: d.ciftci_soyad, isletmeler: [] }
        }
        grupMap[key].isletmeler.push(d.isletme)
      })
      setIcmalDanisanlar(Object.values(grupMap))
    } catch {
      alert('Danışanlar yüklenemedi.')
    } finally {
      setIcmalYukleniyor(false)
    }
  }

  const icmalSecilisineGit = async (grup) => {
    setIcmalSecili(grup)
    setIcmalYukleniyor(true)
    try {
      // Çiftçinin tüm işletmelerinin reçetelerini çek
      const sonuclar = await Promise.all(
        grup.isletmeler.map(isl => api.get(`/recete/?isletme=${isl.id}`))
      )
      const tumReceteler = sonuclar.flatMap(r => r.data)
        .sort((a, b) => (b.tarih || '').localeCompare(a.tarih || ''))
      setIcmalReceteler(tumReceteler)
    } catch {
      setIcmalReceteler([])
    } finally {
      setIcmalYukleniyor(false)
    }
  }

  const icmalKapat = () => {
    setIcmalAcik(false)
    setIcmalSecili(null)
    setIcmalReceteler([])
  }

  return (
    <div style={s.kapsayici}>
      {/* ── Navbar ── */}
      <nav style={s.navbar}>
        {/* Profil / menü butonu — solda */}
        <button style={s.profilBtn} onClick={() => setDrawerAcik(true)} aria-label="Menü">
          <span style={s.profilAvatar}>
            {(kullanici?.first_name || kullanici?.username || '?')[0].toUpperCase()}
          </span>
          <span style={s.profilAd}>{kullanici?.first_name || kullanici?.username}</span>
        </button>

        {/* Logo — ortalı */}
        <div style={s.logo} onClick={() => git('/')}>
          <span style={s.logoAd}>www.onduran.com.tr</span>
          <span style={s.logoAlt}>Onduran Uygulama</span>
        </div>
      </nav>


      {/* ── Overlay ── */}
      {drawerAcik && (
        <div style={s.overlay} onClick={() => setDrawerAcik(false)} />
      )}

      {/* ── Slide Drawer (sağdan) ── */}
      <div style={{ ...s.drawer, transform: drawerAcik ? 'translateX(0)' : 'translateX(-100%)' }}>
        <div style={s.drawerUst}>
          <div style={s.drawerAvatar}>
            {(kullanici?.first_name || kullanici?.username || '?')[0].toUpperCase()}
          </div>
          <div>
            <div style={s.drawerAd}>{kullanici?.first_name || kullanici?.username}</div>
            <div style={s.drawerRol}>{ROL_ETIKET[kullanici?.rol] || kullanici?.rol}</div>
          </div>
          <button style={s.drawerKapat} onClick={() => setDrawerAcik(false)}>✕</button>
        </div>

        <div style={s.drawerAyrac} />

        {menu.map(m => (
          <button key={m.yol}
            style={{ ...s.drawerItem, ...(location.pathname === m.yol ? s.drawerItemAktif : {}) }}
            onClick={() => git(m.yol)}>
            {m.etiket}
          </button>
        ))}

        <div style={s.drawerAyrac} />

        {/* Mühendis: gelen danışmanlık talepleri */}
        {kullanici?.rol === 'muhendis' && (
          <>
            <button style={{ ...s.drawerItem, display:'flex', alignItems:'center', gap:'8px' }}
              onClick={() => setTalepPanel(p => !p)}>
              <span>🤝 Danışmanlık Talepleri</span>
              {talepler.length > 0 && <span style={s.drawerBadge}>{talepler.length}</span>}
              <span style={{ marginLeft:'auto', fontSize:'0.75rem', color:'#aaa' }}>{talepPanel ? '▲' : '▼'}</span>
            </button>
            {talepPanel && (
              <div style={s.talepPanel}>
                {talepler.length === 0
                  ? <p style={s.talepBos}>Bekleyen talep yok.</p>
                  : talepler.map(t => (
                    <div key={t.id} style={s.talepKart}>
                      <div style={s.talepAd}>👨‍🌾 {t.ciftci_ad} {t.ciftci_soyad}</div>
                      <div style={s.talepIsletme}>🏢 {t.isletme?.ad || '—'}</div>
                      <div style={s.talepTarih}>{new Date(t.talep_tarihi).toLocaleDateString('tr-TR')}</div>
                      <div style={s.talepButonlar}>
                        <button style={s.kabul} disabled={islemde===t.id}
                          onClick={() => talepYanitla(t.id, 'onayla')}>✓ Kabul Et</button>
                        <button style={s.red} disabled={islemde===t.id}
                          onClick={() => talepYanitla(t.id, 'reddet')}>✕ Reddet</button>
                      </div>
                    </div>
                  ))
                }
              </div>
            )}
            <div style={s.drawerAyrac} />
          </>
        )}

        {kullanici?.rol === 'muhendis' && (
          <>
            <button style={s.drawerItem} onClick={() => { setDrawerAcik(false); setHaritaAcik(true) }}>
              🗺️ Ziyaret Planı Haritası
            </button>
            <button style={s.drawerItem} onClick={() => { setDrawerAcik(false); icmalAc() }}>
              📋 Reçete İcmali
            </button>
          </>
        )}

        <button style={s.drawerItem} onClick={() => git('/profil')}>
          Profil
        </button>
        <button style={{ ...s.drawerItem, color: '#e05353' }} onClick={() => { setDrawerAcik(false); cikisYap() }}>
          Çıkış
        </button>
      </div>

      <main style={s.icerik}>
        {children}
      </main>
      <OfflineBanner />

      {/* ── Ziyaret Harita Modal ── */}
      {haritaAcik && <ZiyaretHarita onKapat={() => setHaritaAcik(false)} />}

      {/* ── İcmal Modal ── */}
      {icmalAcik && (
        <div style={s.icmalOverlay}>
          <div style={s.icmalModal}>
            {/* Başlık */}
            <div style={s.icmalUst}>
              <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                {icmalSecili && (
                  <button style={s.icmalGeri} onClick={() => { setIcmalSecili(null); setIcmalReceteler([]) }}>← Geri</button>
                )}
                <div>
                  <div style={s.icmalBaslik}>📋 Reçete İcmali</div>
                  {icmalSecili && (
                    <div style={s.icmalMeta}>
                      👨‍🌾 {icmalSecili.ciftci_ad} {icmalSecili.ciftci_soyad} &nbsp;·&nbsp; {icmalSecili.isletmeler?.length} işletme
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display:'flex', gap:'8px' }}>
                {icmalSecili && (
                  <button style={s.icmalYazdir} onClick={() => window.print()}>🖨️ Yazdır / PDF</button>
                )}
                <button style={s.icmalKapatBtn} onClick={icmalKapat}>✕ Kapat</button>
              </div>
            </div>

            <div style={s.icmalIcerik} id="icmal-yazdir">
              {icmalYukleniyor ? (
                <p style={{ textAlign:'center', color:'#aaa', padding:'30px' }}>Yükleniyor…</p>
              ) : !icmalSecili ? (
                /* ── Adım 1: Çiftçi Seçimi ── */
                <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                  <p style={{ color:'#888', fontSize:'0.85rem', margin:'0 0 6px' }}>İcmalini görmek istediğiniz çiftçiyi seçin:</p>
                  {icmalDanisanlar.length === 0
                    ? <p style={{ color:'#aaa', textAlign:'center', padding:'20px' }}>Danışan bulunamadı.</p>
                    : icmalDanisanlar.map((grup, idx) => (
                      <button key={idx} style={s.icmalCiftciKart} onClick={() => icmalSecilisineGit(grup)}>
                        <div style={{ flex:1 }}>
                          <div style={s.icmalCiftciAd}>👨‍🌾 {grup.ciftci_ad} {grup.ciftci_soyad}</div>
                          <div style={s.icmalCiftciMeta}>
                            {grup.isletmeler.map(isl => `🏢 ${isl.ad}`).join('  ·  ')}
                          </div>
                        </div>
                        <span style={s.icmalCiftciOk}>›</span>
                      </button>
                    ))
                  }
                </div>
              ) : (
                /* ── Adım 2: Seçili çiftçinin reçeteleri ── */
                <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
                  {/* Yazdırma başlığı — yalnızca print'te görünür */}
                  <div className="print-only" style={{ display:'none' }}>
                    <h2 style={{ margin:'0 0 4px', color:'#1a7a4a' }}>Reçete İcmali</h2>
                    <p style={{ margin:'0 0 16px', color:'#555', fontSize:'0.9rem' }}>
                      {kullanici?.first_name || kullanici?.username} &nbsp;·&nbsp;
                      {new Date().toLocaleDateString('tr-TR', { day:'numeric', month:'long', year:'numeric' })}
                    </p>
                  </div>
                  <div style={s.icmalBlok}>
                    <div style={s.icmalIsletmeBaslik}>
                      <span>👨‍🌾 {icmalSecili.ciftci_ad} {icmalSecili.ciftci_soyad}</span>
                      {icmalSecili.isletmeler?.map(isl => (
                        <span key={isl.id} style={{ fontWeight:400, opacity:.85, fontSize:'0.85rem' }}>
                          🏢 {isl.ad}{isl.urun_ad ? ` · 🌱 ${isl.urun_ad}` : ''}{isl.alan_dekar ? ` · ${parseFloat(isl.alan_dekar)} da` : ''}
                        </span>
                      ))}
                      <span style={s.icmalSayac}>{icmalReceteler.length} reçete</span>
                    </div>
                    {icmalReceteler.length === 0
                      ? <p style={{ color:'#aaa', fontStyle:'italic', padding:'12px', margin:0 }}>Bu işletmeye ait reçete bulunamadı.</p>
                      : <table style={{ width:'100%', borderCollapse:'collapse' }}>
                          <thead>
                            <tr style={{ background:'#f0faf5' }}>
                              {['Tarih','Tanı','Uygulanan Ürünler','Durum'].map(h => (
                                <th key={h} style={{ padding:'6px 10px', textAlign:'left', fontSize:'11px', color:'#666', fontWeight:600 }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {icmalReceteler.map(r => {
                              const kalemler = (r.adimlar||[]).flatMap(a => (a.kalemler||[]).map(k => ({
                                ad: k.ilac_ad || k.gubre_ad || '—',
                                doz: k.doz_dekar,
                                birim: k.birim,
                                toplam: k.toplam_miktar,
                              }))).filter(k => k.ad !== '—')
                              return (
                                <tr key={r.id}>
                                  <td style={s.icmalTd}>{r.tarih||'—'}</td>
                                  <td style={s.icmalTd}>{r.tani||'—'}</td>
                                  <td style={{ ...s.icmalTd, padding: 0 }}>
                                    {kalemler.length === 0 ? <span style={{ padding:'5px 10px', display:'block', color:'#aaa' }}>—</span>
                                    : <table style={{ width:'100%', borderCollapse:'collapse' }}>
                                        <tbody>
                                          {kalemler.map((k, i) => (
                                            <tr key={i} style={{ borderBottom: i < kalemler.length-1 ? '1px solid #f5f5f5' : 'none' }}>
                                              <td style={{ padding:'4px 10px', fontSize:'0.82rem', color:'#1a1a1a' }}>{k.ad}</td>
                                              <td style={{ padding:'4px 6px', fontSize:'0.78rem', color:'#666', whiteSpace:'nowrap' }}>
                                                {k.doz ? `${k.doz} ${k.birim}/da` : ''}
                                                {k.toplam ? ` · ${k.toplam} ${k.birim}` : ''}
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    }
                                  </td>
                                  <td style={{ ...s.icmalTd, verticalAlign:'top' }}>
                                    <span style={{ padding:'2px 8px', borderRadius:'10px', fontSize:'11px', background:r.durum==='onaylandi'?'#e8f5ee':'#fff8e1', color:r.durum==='onaylandi'?'#1a7a4a':'#b7791f' }}>
                                      {r.durum==='onaylandi'?'Onaylı':'Taslak'}
                                    </span>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                    }
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
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
    display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer',
    flex: 1, textAlign: 'center',
  },
  logoAd:  { fontSize: '1.05rem', fontWeight: '700', color: '#1a7a4a', lineHeight: 1.2 },
  logoAlt: { fontSize: '0.75rem', color: '#888', fontWeight: '400' },
  menuBar: {
    display: 'flex', gap: '4px', padding: '6px 1rem',
    background: '#fff', borderBottom: '1px solid #f0f0f0',
  },
  menuler: { display: 'flex', gap: '4px' },
  menuItem: {
    padding: '6px 14px', borderRadius: '6px', cursor: 'pointer',
    fontSize: '0.9rem', color: '#555',
  },
  menuItemAktif: { background: '#e8f5ee', color: '#1a7a4a', fontWeight: '500' },

  profilBtn: {
    display: 'flex', alignItems: 'center', gap: '8px',
    background: 'none', border: 'none', cursor: 'pointer', padding: '4px', flexShrink: 0,
  },
  profilAvatar: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0,
    background: '#1a7a4a', color: '#fff', fontSize: '1rem', fontWeight: '700',
  },
  profilAd: { fontSize: '0.9rem', fontWeight: '600', color: '#1a7a4a' },

  // Overlay
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 299,
  },

  // Drawer
  drawer: {
    position: 'fixed', top: 0, left: 0, bottom: 0, width: '260px',
    background: '#fff', boxShadow: '4px 0 20px rgba(0,0,0,0.12)',
    zIndex: 300, display: 'flex', flexDirection: 'column',
    transition: 'transform 0.25s ease', overflowY: 'auto',
  },
  drawerUst: {
    display: 'flex', alignItems: 'center', gap: '12px', padding: '20px 16px 16px',
  },
  drawerAvatar: {
    width: '44px', height: '44px', borderRadius: '50%', flexShrink: 0,
    background: '#1a7a4a', color: '#fff', display: 'flex',
    alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: '700',
  },
  drawerAd:   { fontWeight: '600', fontSize: '1rem', color: '#1a1a1a' },
  drawerRol:  { fontSize: '0.8rem', color: '#1a7a4a', fontWeight: '500', marginTop: '2px' },
  drawerKapat:{ marginLeft: 'auto', background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#aaa', padding: '4px', flexShrink: 0 },
  drawerAyrac:{ height: '1px', background: '#f0f0f0', margin: '4px 0' },
  drawerItem: {
    display: 'block', width: '100%', textAlign: 'left',
    padding: '14px 20px', background: 'none', border: 'none',
    fontSize: '1rem', color: '#333', cursor: 'pointer', fontFamily: 'inherit',
  },
  drawerItemAktif: { background: '#f0faf5', color: '#1a7a4a', fontWeight: '600' },
  drawerBadge: { background: '#e05353', color: '#fff', borderRadius: '10px', fontSize: '0.72rem', padding: '1px 7px', fontWeight: 700 },

  // Talep paneli
  talepPanel:  { padding: '0 12px 10px' },
  talepBos:    { color: '#aaa', fontSize: '0.85rem', textAlign: 'center', padding: '12px 0' },
  talepKart:   { background: '#f8fdf9', border: '1px solid #d0eada', borderRadius: '8px', padding: '10px 12px', marginBottom: '8px' },
  talepAd:     { fontWeight: '600', fontSize: '0.9rem', color: '#1a1a1a', marginBottom: '2px' },
  talepIsletme:{ fontSize: '0.82rem', color: '#555', marginBottom: '2px' },
  talepTarih:  { fontSize: '0.75rem', color: '#aaa', marginBottom: '8px' },
  talepButonlar:{ display: 'flex', gap: '6px' },
  kabul: { flex: 1, padding: '8px', background: '#1a7a4a', color: '#fff', border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600' },
  red:   { flex: 1, padding: '8px', background: '#fff0f0', color: '#e05353', border: '1px solid #fcc', borderRadius: '7px', cursor: 'pointer', fontSize: '0.85rem' },

  icerik: {},

  // ── İcmal Modal ──
  icmalOverlay: { position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:400, display:'flex', alignItems:'flex-start', justifyContent:'center', padding:'20px 12px', overflowY:'auto' },
  icmalModal:   { background:'#fff', borderRadius:'12px', width:'100%', maxWidth:'760px', boxShadow:'0 8px 40px rgba(0,0,0,0.2)', display:'flex', flexDirection:'column', maxHeight:'90vh' },
  icmalUst:     { display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'12px', padding:'16px 20px', borderBottom:'1px solid #e8e8e8', flexShrink:0 },
  icmalBaslik:  { fontSize:'1.15rem', fontWeight:'700', color:'#1a7a4a' },
  icmalMeta:    { fontSize:'0.8rem', color:'#888', marginTop:'2px' },
  icmalGeri:    { padding:'6px 12px', background:'#f0f0f0', color:'#555', border:'none', borderRadius:'7px', cursor:'pointer', fontSize:'0.88rem', flexShrink:0 },
  icmalYazdir:  { padding:'8px 16px', background:'#1a7a4a', color:'#fff', border:'none', borderRadius:'8px', cursor:'pointer', fontSize:'0.9rem', fontWeight:'600', whiteSpace:'nowrap' },
  icmalKapatBtn:{ padding:'8px 16px', background:'#f0f0f0', color:'#555', border:'none', borderRadius:'8px', cursor:'pointer', fontSize:'0.9rem', whiteSpace:'nowrap' },
  icmalCiftciKart: { display:'flex', alignItems:'center', gap:'10px', padding:'12px 14px', background:'#f8fdf9', border:'1px solid #d4eadb', borderRadius:'9px', cursor:'pointer', textAlign:'left', width:'100%', fontFamily:'inherit' },
  icmalCiftciAd:   { fontWeight:'600', fontSize:'0.92rem', color:'#1a1a1a', flex:1, display:'block' },
  icmalCiftciMeta: { fontSize:'0.78rem', color:'#666', display:'block', marginTop:'2px' },
  icmalCiftciOk:   { color:'#1a7a4a', fontSize:'1.3rem', fontWeight:'700', flexShrink:0 },
  icmalIcerik:  { overflowY:'auto', padding:'16px 20px', display:'flex', flexDirection:'column', gap:'14px' },
  icmalBlok:    { border:'1px solid #e0ede6', borderRadius:'8px', overflow:'hidden' },
  icmalIsletmeBaslik: { background:'#1a7a4a', color:'#fff', padding:'8px 12px', fontWeight:'600', fontSize:'0.9rem', display:'flex', flexWrap:'wrap', gap:'10px', alignItems:'center' },
  icmalSayac:   { marginLeft:'auto', background:'rgba(255,255,255,.2)', padding:'2px 8px', borderRadius:'10px', fontSize:'0.78rem' },
  icmalTd:      { padding:'5px 8px', borderBottom:'1px solid #f0f0f0', fontSize:'0.85rem' },
}
