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
    { yol: '/ciftci/isletmeler',  etiket: 'İşletmelerim' },
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
  const [ayarlarAcik, setAyarlarAcik] = useState(false)
  const [talepler, setTalepler]     = useState([])
  const [islemde, setIslemde]       = useState(null)
  const [icmalAcik, setIcmalAcik]       = useState(false)
  const [icmalDanisanlar, setIcmalDanisanlar] = useState([])
  const [icmalSecili, setIcmalSecili]   = useState(null) // danisan objesi
  const [icmalReceteler, setIcmalReceteler] = useState([])
  const [icmalYukleniyor, setIcmalYukleniyor] = useState(false)
  const [haritaAcik, setHaritaAcik] = useState(false)
  const [bayiiTalepler, setBayiiTalepler] = useState([])
  const [bayiiKritikStok, setBayiiKritikStok] = useState(0)
  const [bayiiTalepPanel, setBayiiTalepPanel] = useState(false)
  const [bayiiTalepIslemde, setBayiiTalepIslemde] = useState(null)
  const [bayiiIcmalAcik, setBayiiIcmalAcik] = useState(false)
  const [bayiiIcmalData, setBayiiIcmalData] = useState([])
  const [bayiiIcmalSecili, setBayiiIcmalSecili] = useState(null)
  const [bayiiIcmalYukleniyor, setBayiiIcmalYukleniyor] = useState(false)
  const [danismanPanel, setDanismanPanel] = useState(false)
  const [danIsletmeler, setDanIsletmeler] = useState([])
  const [danIsletme, setDanIsletme]       = useState('')
  const [danMuhendisList, setDanMuhendisList] = useState([])
  const [danIslemde, setDanIslemde]       = useState(null)
  const [danHata, setDanHata]             = useState('')
  const [danAra, setDanAra]               = useState('')
  const [bayiiPanel, setBayiiPanel]       = useState(false)
  const [tumBayii, setTumBayii]           = useState([])
  const [bayiiAra, setBayiiAra]           = useState('')
  const [bayiiIslemde, setBayiiIslemde]   = useState(null)
  const [bayiiHata, setBayiiHata]         = useState('')
  const [bayiilerim, setBayiilerim]       = useState([])

  const menu = menuler[kullanici?.rol] || []

  const git = (yol) => {
    navigate(yol)
    setDrawerAcik(false)
  }

  const [soruPanel, setSoruPanel]       = useState(false)
  const [sorular, setSorular]           = useState([])
  const [bekleyenSoruSayi, setBekleyenSoruSayi] = useState(0)
  const [soruYanit, setSoruYanit]       = useState({}) // { [soruId]: string }
  const [soruYanitIslemde, setSoruYanitIslemde] = useState(null)

  // Mühendis ise gelen talepleri ve bekleyen soruları yükle
  useEffect(() => {
    if (kullanici?.rol !== 'muhendis') return
    api.get('/ciftci/gelen-talepler/').then(r => setTalepler(r.data)).catch(() => {})
    api.get('/ciftci/muhendis/bekleyen-sorular/').then(r => setBekleyenSoruSayi(r.data.bekleyen || 0)).catch(() => {})
  }, [kullanici])

  const soruPanelAc = async () => {
    setSoruPanel(p => !p)
    if (!soruPanel) {
      const res = await api.get('/ciftci/muhendis/sorular/?durum=bekliyor').catch(() => ({ data: [] }))
      setSorular(res.data)
    }
  }

  const soruYanitla = async (id) => {
    const yanit = (soruYanit[id] || '').trim()
    if (!yanit) return
    setSoruYanitIslemde(id)
    try {
      await api.patch(`/ciftci/muhendis/sorular/${id}/yanit/`, { yanit })
      setSorular(p => p.filter(s => s.id !== id))
      setBekleyenSoruSayi(p => Math.max(0, p - 1))
      setSoruYanit(p => { const n = { ...p }; delete n[id]; return n })
    } catch {}
    setSoruYanitIslemde(null)
  }

  const [duyuruPanel, setDuyuruPanel]   = useState(false)
  const [duyuruForm, setDuyuruForm]     = useState({ baslik: '', metin: '', urun: '', il_filtre: '', ilce_filtre: '' })
  const [duyuruUrunler, setDuyuruUrunler] = useState([])
  const [duyuruGonderiyor, setDuyuruGonderiyor] = useState(false)
  const [duyuruSonuc, setDuyuruSonuc]   = useState(null) // { hedef_ciftci }
  const [duyuruHata, setDuyuruHata]     = useState('')

  const duyuruPanelAc = async () => {
    setDuyuruPanel(p => !p)
    setDuyuruSonuc(null)
    if (duyuruUrunler.length === 0) {
      api.get('/ciftci/urunler/').then(r => setDuyuruUrunler(r.data)).catch(() => {})
    }
  }

  const duyuruGonder = async () => {
    if (!duyuruForm.baslik.trim() || !duyuruForm.metin.trim()) {
      setDuyuruHata('Başlık ve mesaj zorunlu.'); return
    }
    setDuyuruGonderiyor(true)
    setDuyuruHata('')
    try {
      const payload = {
        baslik: duyuruForm.baslik,
        metin:  duyuruForm.metin,
        urun:   duyuruForm.urun || null,
        il_filtre:   duyuruForm.il_filtre,
        ilce_filtre: duyuruForm.ilce_filtre,
      }
      const res = await api.post('/ciftci/muhendis/duyuru/', payload)
      setDuyuruSonuc(res.data)
      setDuyuruForm({ baslik: '', metin: '', urun: '', il_filtre: '', ilce_filtre: '' })
    } catch (e) {
      setDuyuruHata(e.response?.data?.detail || 'Gönderilemedi.')
    }
    setDuyuruGonderiyor(false)
  }

  // Bayii ise gelen çiftçi taleplerini ve kritik stokları yükle
  useEffect(() => {
    if (kullanici?.rol !== 'bayii') return
    api.get('/ciftci/bayii/bekleyen/').then(r => setBayiiTalepler(r.data)).catch(() => {})
    api.get('/katalog/bayii/stok/').then(r => setBayiiKritikStok(r.data.kritik_sayisi || 0)).catch(() => {})
  }, [kullanici])

  const bayiiIcmalAc = async () => {
    setBayiiIcmalAcik(true)
    setBayiiIcmalSecili(null)
    setBayiiIcmalYukleniyor(true)
    try {
      const r = await api.get('/katalog/bayii/musterilerim/')
      setBayiiIcmalData(r.data)
    } catch { alert('İcmal yüklenemedi.') }
    finally { setBayiiIcmalYukleniyor(false) }
  }

  const bayiiTalepYanitla = async (id, durum) => {
    setBayiiTalepIslemde(id)
    try {
      await api.patch(`/ciftci/bayii/yanit/${id}/`, { durum })
      setBayiiTalepler(p => p.filter(t => t.id !== id))
    } finally { setBayiiTalepIslemde(null) }
  }

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

  const danismanPanelAc = async () => {
    setDanismanPanel(true)
    setDanHata('')
    setDanIsletme('')
    setDanAra('')
    try {
      const [isl, muh] = await Promise.all([
        api.get('/ciftci/isletmelerim/'),
        api.get('/ciftci/muhendis/listele/'),
      ])
      setDanIsletmeler(isl.data)
      setDanMuhendisList(muh.data)
    } catch { setDanHata('Veriler yüklenemedi.') }
  }

  const danismanTalepGonder = async (muhendisId) => {
    if (!danIsletme) { setDanHata('Lütfen önce bir işletme seçin.'); return }
    setDanIslemde(muhendisId)
    setDanHata('')
    try {
      await api.post('/ciftci/muhendise-talep/', { muhendis_id: muhendisId, isletme_id: parseInt(danIsletme) })
      setDanismanPanel(false)
    } catch (err) {
      setDanHata(err.response?.data?.hata || err.response?.data?.detail || JSON.stringify(err.response?.data) || 'Talep gönderilemedi.')
    } finally { setDanIslemde(null) }
  }

  const bayiiPanelAc = async () => {
    setBayiiPanel(true)
    setBayiiHata('')
    setBayiiAra('')
    try {
      const [b, tb] = await Promise.all([
        api.get('/ciftci/bayiilerim/'),
        api.get('/katalog/bayii/listele/'),
      ])
      setBayiilerim(b.data)
      setTumBayii(tb.data)
    } catch { setBayiiHata('Bayii listesi yüklenemedi.') }
  }

  const bayiiTalepGonder = async (bayiiId) => {
    setBayiiIslemde(bayiiId)
    setBayiiHata('')
    try {
      await api.post('/ciftci/bayii/talep/', { bayii: bayiiId })
      const b = await api.get('/ciftci/bayiilerim/')
      setBayiilerim(b.data)
    } catch (err) {
      setBayiiHata(err.response?.data?.detail || JSON.stringify(err.response?.data) || 'Talep gönderilemedi.')
    } finally { setBayiiIslemde(null) }
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
          <span style={s.logoAlt}>Onduran Tarım</span>
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
            style={{ ...s.drawerItem, ...(location.pathname === m.yol ? s.drawerItemAktif : {}), display:'flex', alignItems:'center', gap:'8px' }}
            onClick={() => git(m.yol)}>
            <span>{m.etiket}</span>
            {m.yol === '/bayii/urunler' && bayiiKritikStok > 0 && (
              <span style={{ ...s.drawerBadge, background:'#dc2626' }}>{bayiiKritikStok}</span>
            )}
          </button>
        ))}

        <div style={s.drawerAyrac} />

        {/* Çiftçi */}
        {kullanici?.rol === 'ciftci' && (
          <>
            <div style={s.drawerAyrac} />
            <button style={s.drawerItem} onClick={() => git('/ciftci/recetelerim')}>
              📋 Reçetelerim
            </button>
            <div style={s.drawerAyrac} />
            <button style={{ ...s.drawerItem, display:'flex', alignItems:'center', gap:'8px' }}
              onClick={() => setAyarlarAcik(p => !p)}>
              <span>⚙️ Ayarlar</span>
              <span style={{ marginLeft:'auto', fontSize:'0.75rem', color:'#aaa' }}>{ayarlarAcik ? '▲' : '▼'}</span>
            </button>
            {ayarlarAcik && (
              <div style={{ paddingLeft:'12px' }}>
                <button style={{ ...s.drawerItem, fontSize:'0.92rem' }} onClick={() => git('/ciftci/talepler')}>
                  🔔 İzinler & Talepler
                </button>
                <button style={{ ...s.drawerItem, fontSize:'0.92rem' }} onClick={() => { setDrawerAcik(false); danismanPanelAc() }}>
                  👨‍💼 Danışman Ekle
                </button>
                <button style={{ ...s.drawerItem, fontSize:'0.92rem' }} onClick={() => {
                  setDrawerAcik(false)
                  if (location.pathname === '/ciftci/isletmeler') {
                    window.dispatchEvent(new Event('isletme-ekle-ac'))
                  } else {
                    navigate('/ciftci/isletmeler')
                    setTimeout(() => window.dispatchEvent(new Event('isletme-ekle-ac')), 300)
                  }
                }}>
                  🏢 İşletme Ekle / Düzenle / Kaldır
                </button>
                <button style={{ ...s.drawerItem, fontSize:'0.92rem' }} onClick={() => { setDrawerAcik(false); bayiiPanelAc() }}>
                  🏪 Bayii Ekle
                </button>
              </div>
            )}
          </>
        )}

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
            <button style={{ ...s.drawerItem, display:'flex', alignItems:'center', gap:'8px' }}
              onClick={soruPanelAc}>
              <span>💬 Çiftçi Soruları</span>
              {bekleyenSoruSayi > 0 && <span style={s.drawerBadge}>{bekleyenSoruSayi}</span>}
              <span style={{ marginLeft:'auto', fontSize:'0.75rem', color:'#aaa' }}>{soruPanel ? '▲' : '▼'}</span>
            </button>
            {soruPanel && (
              <div style={s.talepPanel}>
                {sorular.length === 0
                  ? <p style={s.talepBos}>Bekleyen soru yok.</p>
                  : sorular.map(q => (
                    <div key={q.id} style={{ ...s.talepKart, borderLeft:'3px solid #f59e0b' }}>
                      <div style={s.talepAd}>👨‍🌾 {q.ciftci_ad} {q.ciftci_soyad}</div>
                      {q.isletme_ad && <div style={s.talepIsletme}>🌱 {q.isletme_ad}</div>}
                      <div style={{ fontSize:'0.85rem', color:'#333', margin:'4px 0' }}>{q.metin}</div>
                      {q.fotograf_url && (
                        <img src={q.fotograf_url} alt="" style={{ maxWidth:'100%', maxHeight:120, borderRadius:6, marginBottom:4, objectFit:'cover' }} />
                      )}
                      {q.ai_teshis && (
                        <div style={{ background:'#f5f3ff', borderRadius:6, padding:'6px 8px', fontSize:'0.78rem', color:'#4c1d95', marginBottom:6 }}>
                          🤖 {q.ai_teshis}
                        </div>
                      )}
                      <textarea
                        placeholder="Yanıtınızı yazın..."
                        rows={2}
                        style={{ width:'100%', padding:'6px 8px', border:'1px solid #ddd', borderRadius:6, fontSize:'0.83rem', boxSizing:'border-box', resize:'vertical' }}
                        value={soruYanit[q.id] || ''}
                        onChange={e => setSoruYanit(p => ({ ...p, [q.id]: e.target.value }))}
                      />
                      <button
                        style={{ ...s.kabul, marginTop:4, width:'100%' }}
                        disabled={soruYanitIslemde === q.id || !(soruYanit[q.id] || '').trim()}
                        onClick={() => soruYanitla(q.id)}>
                        {soruYanitIslemde === q.id ? '…' : 'Yanıtla'}
                      </button>
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
            <div style={s.drawerAyrac} />
            <button style={{ ...s.drawerItem, display:'flex', alignItems:'center', gap:'8px' }}
              onClick={duyuruPanelAc}>
              <span>📢 Toplu Mesaj Gönder</span>
              <span style={{ marginLeft:'auto', fontSize:'0.75rem', color:'#aaa' }}>{duyuruPanel ? '▲' : '▼'}</span>
            </button>
            {duyuruPanel && (
              <div style={{ padding:'10px 14px', background:'#f8fdf9', borderRadius:8, margin:'4px 8px' }}>
                {duyuruSonuc ? (
                  <div style={{ textAlign:'center', padding:'12px 0' }}>
                    <div style={{ fontSize:'1.5rem' }}>✅</div>
                    <div style={{ fontWeight:600, color:'#1a7a4a', marginBottom:4 }}>Mesaj Gönderildi</div>
                    <div style={{ fontSize:'0.85rem', color:'#555' }}>
                      <strong>{duyuruSonuc.hedef_ciftci}</strong> çiftçiye ulaştı.
                    </div>
                    <button style={{ marginTop:10, ...s.kabul }} onClick={() => setDuyuruSonuc(null)}>
                      Yeni Mesaj
                    </button>
                  </div>
                ) : (
                  <>
                    <div style={s.duyuruAlan}>
                      <label style={s.duyuruEtiket}>Başlık *</label>
                      <input style={s.duyuruGirdi} placeholder="Örn: Kırmızı örümcek uyarısı"
                        value={duyuruForm.baslik}
                        onChange={e => setDuyuruForm(f => ({ ...f, baslik: e.target.value }))} />
                    </div>
                    <div style={s.duyuruAlan}>
                      <label style={s.duyuruEtiket}>Mesaj *</label>
                      <textarea style={{ ...s.duyuruGirdi, minHeight:72, resize:'vertical' }}
                        placeholder="Çiftçilere iletmek istediğiniz bilgi veya uyarı..."
                        value={duyuruForm.metin}
                        onChange={e => setDuyuruForm(f => ({ ...f, metin: e.target.value }))} />
                    </div>
                    <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                      <div style={{ ...s.duyuruAlan, flex:1, minWidth:100 }}>
                        <label style={s.duyuruEtiket}>Ürün filtresi</label>
                        <select style={s.duyuruGirdi} value={duyuruForm.urun}
                          onChange={e => setDuyuruForm(f => ({ ...f, urun: e.target.value }))}>
                          <option value="">Tümü</option>
                          {duyuruUrunler.map(u => <option key={u.id} value={u.id}>{u.ad}</option>)}
                        </select>
                      </div>
                      <div style={{ ...s.duyuruAlan, flex:1, minWidth:90 }}>
                        <label style={s.duyuruEtiket}>İlçe filtresi</label>
                        <input style={s.duyuruGirdi} placeholder="Kumluca"
                          value={duyuruForm.ilce_filtre}
                          onChange={e => setDuyuruForm(f => ({ ...f, ilce_filtre: e.target.value }))} />
                      </div>
                    </div>
                    {duyuruHata && <p style={{ color:'#dc2626', fontSize:'0.8rem', margin:'4px 0' }}>{duyuruHata}</p>}
                    <button style={{ ...s.kabul, width:'100%', marginTop:8 }}
                      disabled={duyuruGonderiyor}
                      onClick={duyuruGonder}>
                      {duyuruGonderiyor ? 'Gönderiliyor…' : '📢 Gönder'}
                    </button>
                  </>
                )}
              </div>
            )}
          </>
        )}

        {/* Bayii: reçete icmal + çiftçi talepleri */}
        {kullanici?.rol === 'bayii' && (
          <>
            <div style={s.drawerAyrac} />
            <button style={s.drawerItem} onClick={() => { setDrawerAcik(false); bayiiIcmalAc() }}>
              📋 Reçete İcmali
            </button>
            <div style={s.drawerAyrac} />
            <button style={{ ...s.drawerItem, display:'flex', alignItems:'center', gap:'8px' }}
              onClick={() => setBayiiTalepPanel(p => !p)}>
              <span>🤝 Çiftçi Talepleri</span>
              {bayiiTalepler.length > 0 && <span style={s.drawerBadge}>{bayiiTalepler.length}</span>}
              <span style={{ marginLeft:'auto', fontSize:'0.75rem', color:'#aaa' }}>{bayiiTalepPanel ? '▲' : '▼'}</span>
            </button>
            {bayiiTalepPanel && (
              <div style={s.talepPanel}>
                {bayiiTalepler.length === 0
                  ? <p style={s.talepBos}>Bekleyen talep yok.</p>
                  : bayiiTalepler.map(t => (
                    <div key={t.id} style={s.talepKart}>
                      <div style={s.talepAd}>👨‍🌾 {t.ciftci_ad} {t.ciftci_soyad}</div>
                      <div style={s.talepTarih}>{new Date(t.talep_tarihi).toLocaleDateString('tr-TR')}</div>
                      <div style={s.talepButonlar}>
                        <button style={s.kabul} disabled={bayiiTalepIslemde === t.id}
                          onClick={() => bayiiTalepYanitla(t.id, 'onaylandi')}>✓ Kabul Et</button>
                        <button style={s.red} disabled={bayiiTalepIslemde === t.id}
                          onClick={() => bayiiTalepYanitla(t.id, 'reddedildi')}>✕ Reddet</button>
                      </div>
                    </div>
                  ))
                }
              </div>
            )}
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

      {/* ── Bayii Reçete İcmal Modal ── */}
      {bayiiIcmalAcik && (
        <div style={s.icmalOverlay}>
          <div style={s.icmalModal}>
            <div style={s.icmalUst}>
              <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                {bayiiIcmalSecili && (
                  <button style={s.icmalGeri} onClick={() => setBayiiIcmalSecili(null)}>← Geri</button>
                )}
                <div>
                  <div style={s.icmalBaslik}>📋 Reçete İcmali</div>
                  {bayiiIcmalSecili && (
                    <div style={s.icmalMeta}>👨‍🌾 {bayiiIcmalSecili.ciftci_ad} {bayiiIcmalSecili.ciftci_soyad}</div>
                  )}
                </div>
              </div>
              <div style={{ display:'flex', gap:'8px' }}>
                {bayiiIcmalSecili && (
                  <button style={s.icmalYazdir} onClick={() => window.print()}>🖨️ Yazdır / PDF</button>
                )}
                <button style={s.icmalKapatBtn} onClick={() => { setBayiiIcmalAcik(false); setBayiiIcmalSecili(null) }}>✕ Kapat</button>
              </div>
            </div>

            <div style={s.icmalIcerik}>
              {bayiiIcmalYukleniyor && <p style={{ textAlign:'center', color:'#aaa', padding:'20px' }}>Yükleniyor…</p>}

              {!bayiiIcmalYukleniyor && !bayiiIcmalSecili && (
                <>
                  <label style={{ fontSize:'0.85rem', color:'#555' }}>👨‍🌾 Çiftçi seçin:</label>
                  <select
                    style={{ width:'100%', padding:'9px 12px', border:'1px solid #ddd', borderRadius:'8px', fontSize:'0.92rem', outline:'none', fontFamily:'inherit' }}
                    defaultValue=''
                    onChange={e => {
                      const idx = parseInt(e.target.value)
                      if (!isNaN(idx)) setBayiiIcmalSecili(bayiiIcmalData[idx])
                    }}
                  >
                    <option value=''>— Seçin —</option>
                    {bayiiIcmalData.map((m, idx) => (
                      <option key={idx} value={idx}>{m.ciftci_ad} {m.ciftci_soyad}</option>
                    ))}
                  </select>
                </>
              )}

              {!bayiiIcmalYukleniyor && bayiiIcmalSecili && (
                <div style={s.icmalBlok}>
                  <div style={s.icmalIsletmeBaslik}>
                    <span>👨‍🌾 {bayiiIcmalSecili.ciftci_ad} {bayiiIcmalSecili.ciftci_soyad}</span>
                    <span style={s.icmalSayac}>{bayiiIcmalSecili.kalemler?.length || 0} kalem</span>
                  </div>
                  {!bayiiIcmalSecili.kalemler?.length ? (
                    <p style={{ color:'#aaa', fontStyle:'italic', padding:'12px', margin:0 }}>Reçete bulunamadı.</p>
                  ) : (
                    <table style={{ width:'100%', borderCollapse:'collapse' }}>
                      <thead>
                        <tr style={{ background:'#f0faf5' }}>
                          {['Tarih','İşletme','Ürün','Doz'].map(h => (
                            <th key={h} style={{ padding:'6px 10px', textAlign:'left', fontSize:'11px', color:'#666', fontWeight:600 }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {bayiiIcmalSecili.kalemler.map((k, i) => (
                          <tr key={i}>
                            <td style={s.icmalTd}>{k.recete_tarih}</td>
                            <td style={s.icmalTd}>{k.isletme_ad}</td>
                            <td style={s.icmalTd}>{k.ilac_ad || k.gubre_ad || '—'}</td>
                            <td style={s.icmalTd}>{k.doz_dekar} {k.birim}/da</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Bayii Ekle Modal (Çiftçi) ── */}
      {bayiiPanel && (
        <div style={s.icmalOverlay} onClick={() => setBayiiPanel(false)}>
          <div style={{ ...s.icmalModal, maxWidth:'440px' }} onClick={e => e.stopPropagation()}>
            <div style={s.icmalUst}>
              <div style={s.icmalBaslik}>🏪 Bayii Ekle</div>
              <button style={s.icmalKapatBtn} onClick={() => setBayiiPanel(false)}>✕ Kapat</button>
            </div>
            <div style={{ padding:'12px 20px 16px', display:'flex', flexDirection:'column', gap:'10px' }}>
              {bayiiHata && <p style={{ color:'#e05353', fontSize:'0.85rem', margin:0 }}>{bayiiHata}</p>}
              <input
                placeholder="Bayii adı veya ilçe ara..."
                value={bayiiAra}
                onChange={e => setBayiiAra(e.target.value)}
                style={{ padding:'9px 12px', border:'1px solid #ddd', borderRadius:'8px', fontSize:'0.9rem', outline:'none', fontFamily:'inherit' }}
                autoFocus
              />
              <div style={{ display:'flex', flexDirection:'column', gap:'8px', maxHeight:'320px', overflowY:'auto' }}>
                {tumBayii
                  .filter(b =>
                    b.firma_adi.toLowerCase().includes(bayiiAra.toLowerCase()) ||
                    b.il?.toLowerCase().includes(bayiiAra.toLowerCase()) ||
                    b.ilce?.toLowerCase().includes(bayiiAra.toLowerCase())
                  )
                  .map(b => {
                    const ekli = bayiilerim.some(x => x.bayii === b.id)
                    return (
                      <div key={b.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 12px', background:'#f8fdf9', border:'1px solid #d4eadb', borderRadius:'8px' }}>
                        <div>
                          <div style={{ fontWeight:'600', fontSize:'0.92rem' }}>{b.firma_adi}</div>
                          <div style={{ fontSize:'0.78rem', color:'#888' }}>{b.ilce}, {b.il}</div>
                        </div>
                        {ekli ? (
                          <span style={{ fontSize:'0.8rem', color:'#aaa' }}>Ekli</span>
                        ) : (
                          <button
                            style={{ padding:'6px 14px', background:'#1a7a4a', color:'#fff', border:'none', borderRadius:'7px', cursor:'pointer', fontSize:'0.85rem', fontWeight:'600' }}
                            disabled={bayiiIslemde === b.id}
                            onClick={() => bayiiTalepGonder(b.id)}
                          >
                            {bayiiIslemde === b.id ? '…' : 'Talep'}
                          </button>
                        )}
                      </div>
                    )
                  })
                }
                {tumBayii.length === 0 && !bayiiHata && (
                  <p style={{ color:'#aaa', textAlign:'center', padding:'12px' }}>Yükleniyor…</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Danışman Ekle Modal (Çiftçi) ── */}
      {danismanPanel && (
        <div style={s.icmalOverlay} onClick={() => setDanismanPanel(false)}>
          <div style={{ ...s.icmalModal, maxWidth:'440px' }} onClick={e => e.stopPropagation()}>
            <div style={s.icmalUst}>
              <div style={s.icmalBaslik}>👨‍💼 Danışman Ekle</div>
              <button style={s.icmalKapatBtn} onClick={() => setDanismanPanel(false)}>✕ Kapat</button>
            </div>
            <div style={{ padding:'16px 20px', display:'flex', flexDirection:'column', gap:'12px' }}>
              {danHata && <p style={{ color:'#e05353', fontSize:'0.85rem', margin:0 }}>{danHata}</p>}
              <div>
                <label style={{ fontSize:'0.82rem', fontWeight:'600', color:'#555', display:'block', marginBottom:'6px' }}>İşletme *</label>
                <select
                  style={{ width:'100%', padding:'9px 12px', border:'1px solid #ddd', borderRadius:'8px', fontSize:'0.92rem', outline:'none', fontFamily:'inherit' }}
                  value={danIsletme}
                  onChange={e => { setDanIsletme(e.target.value); setDanHata('') }}
                >
                  <option value=''>— İşletme seçin —</option>
                  {danIsletmeler.map(i => (
                    <option key={i.id} value={i.id}>{i.ad}{i.urun_ad ? ` · ${i.urun_ad}` : ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize:'0.82rem', fontWeight:'600', color:'#555', display:'block', marginBottom:'6px' }}>Danışman Mühendis</label>
                <input
                  placeholder="Ad ile ara..."
                  value={danAra}
                  onChange={e => setDanAra(e.target.value)}
                  style={{ width:'100%', padding:'9px 12px', border:'1px solid #ddd', borderRadius:'8px', fontSize:'0.9rem', outline:'none', fontFamily:'inherit', boxSizing:'border-box' }}
                />
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:'8px', maxHeight:'260px', overflowY:'auto' }}>
                {danMuhendisList
                  .filter(m => m.ad.toLowerCase().includes(danAra.toLowerCase()))
                  .map(m => (
                    <div key={m.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 12px', background:'#f8fdf9', border:'1px solid #d4eadb', borderRadius:'8px' }}>
                      <span style={{ fontWeight:'600', fontSize:'0.92rem' }}>👨‍💼 {m.ad}</span>
                      <button
                        style={{ padding:'6px 14px', background:'#1a7a4a', color:'#fff', border:'none', borderRadius:'7px', cursor:'pointer', fontSize:'0.85rem', fontWeight:'600' }}
                        disabled={danIslemde === m.id}
                        onClick={() => danismanTalepGonder(m.id)}
                      >
                        {danIslemde === m.id ? '…' : 'Talep Gönder'}
                      </button>
                    </div>
                  ))
                }
                {danMuhendisList.length === 0 && !danHata && (
                  <p style={{ color:'#aaa', textAlign:'center', padding:'12px' }}>Yükleniyor…</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

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
              {/* Dropdown */}
              <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'10px' }}>
                <label style={{ fontSize:'0.85rem', color:'#555', whiteSpace:'nowrap' }}>👨‍🌾 Çiftçi:</label>
                <select
                  style={{ flex:1, padding:'9px 12px', border:'1px solid #ddd', borderRadius:'8px', fontSize:'0.92rem', outline:'none', fontFamily:'inherit' }}
                  value={icmalSecili ? icmalDanisanlar.indexOf(icmalSecili) : ''}
                  onChange={e => {
                    const idx = parseInt(e.target.value)
                    if (!isNaN(idx)) icmalSecilisineGit(icmalDanisanlar[idx])
                    else { setIcmalSecili(null); setIcmalReceteler([]) }
                  }}
                >
                  <option value=''>— Seçin —</option>
                  {icmalDanisanlar.map((g, idx) => (
                    <option key={idx} value={idx}>{g.ciftci_ad} {g.ciftci_soyad} ({g.isletmeler.length} işletme)</option>
                  ))}
                </select>
              </div>

              {icmalYukleniyor && <p style={{ textAlign:'center', color:'#aaa', padding:'20px' }}>Yükleniyor…</p>}

              {icmalSecili && !icmalYukleniyor && (
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
                    ? <p style={{ color:'#aaa', fontStyle:'italic', padding:'12px', margin:0 }}>Reçete bulunamadı.</p>
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
                              doz: k.doz_dekar, birim: k.birim, toplam: k.toplam_miktar,
                            }))).filter(k => k.ad !== '—')
                            return (
                              <tr key={r.id}>
                                <td style={s.icmalTd}>{r.tarih||'—'}</td>
                                <td style={s.icmalTd}>{r.tani||'—'}</td>
                                <td style={{ ...s.icmalTd, padding:0 }}>
                                  {kalemler.length === 0
                                    ? <span style={{ padding:'5px 10px', display:'block', color:'#aaa' }}>—</span>
                                    : <table style={{ width:'100%', borderCollapse:'collapse' }}>
                                        <tbody>
                                          {kalemler.map((k, i) => (
                                            <tr key={i} style={{ borderBottom: i < kalemler.length-1 ? '1px solid #f5f5f5' : 'none' }}>
                                              <td style={{ padding:'4px 10px', fontSize:'0.82rem', color:'#1a1a1a' }}>{k.ad}</td>
                                              <td style={{ padding:'4px 6px', fontSize:'0.78rem', color:'#666', whiteSpace:'nowrap' }}>
                                                {k.doz ? `${k.doz} ${k.birim}/da` : ''}{k.toplam ? ` · ${k.toplam} ${k.birim}` : ''}
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
  duyuruAlan:  { marginBottom: 8 },
  duyuruEtiket:{ display: 'block', fontSize: '0.78rem', color: '#555', fontWeight: 500, marginBottom: 3 },
  duyuruGirdi: { width: '100%', padding: '6px 8px', border: '1px solid #ddd', borderRadius: 6, fontSize: '0.85rem', boxSizing: 'border-box' },
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
