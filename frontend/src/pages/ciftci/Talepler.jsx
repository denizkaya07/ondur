import { useEffect, useState, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import { AuthContext } from '../../context/AuthContext'
import useBreakpoint from '../../hooks/useBreakpoint'

export default function Talepler() {
  const navigate = useNavigate()
  const { kullanici, yukleniyor: authYukleniyor } = useContext(AuthContext)
  const { isMobile } = useBreakpoint()
  const [tab, setTab] = useState('danismanlar')

  // Danışmanlarım (onaylı)
  const [danismanlar, setDanismanlar]   = useState([])
  const [danYukleniyor, setDanYukleniyor] = useState(true)
  const [danIslemde, setDanIslemde]     = useState(null)

  // Mühendisten gelen talepler (çiftçi kabul/red edecek)
  const [bekleyenler, setBekleyenler]   = useState([])
  const [islemde, setIslemde]           = useState(null)
  // Çiftçinin mühendise gönderdiği talepler
  const [gonderilenler, setGonderilenler] = useState([])

  // Bayii
  const [bayiilerim, setBayiilerim]     = useState([])
  const [tumBayii, setTumBayii]         = useState([])
  const [bayiiYukleniyor, setBayiiYukleniyor] = useState(false)
  const [bayiiPanelAcik, setBayiiPanelAcik]   = useState(false)
  const [bayiiIslemde, setBayiiIslemde] = useState(null)
  const [bayiiHata, setBayiiHata]       = useState('')
  const [bayiiAra, setBayiiAra]         = useState('')

  const yukle = () => {
    if (!kullanici || kullanici.rol !== 'ciftci') { navigate('/giris'); return }
    setDanYukleniyor(true)
    Promise.all([
      api.get('/ciftci/danismanlarim-ciftci/'),
      api.get('/ciftci/talepler/'),
      api.get('/ciftci/gonderilen-talepler/'),
    ]).then(([dan, bek, gon]) => {
      setDanismanlar(dan.data)
      setBekleyenler(bek.data)
      setGonderilenler(gon.data)
    }).catch(() => {})
      .finally(() => setDanYukleniyor(false))
  }

  const bayiileriYukle = () => {
    setBayiiYukleniyor(true)
    api.get('/ciftci/bayiilerim/')
      .then(res => setBayiilerim(res.data))
      .catch(() => {})
      .finally(() => setBayiiYukleniyor(false))
  }

  useEffect(() => {
    if (authYukleniyor) return
    yukle()
    bayiileriYukle()
  }, [authYukleniyor, kullanici])

  // Mühendisten gelen taleplere yanıt (bekleyen tab'da gösterilecek)
  const talepYanitla = async (id, karar) => {
    setIslemde(id)
    try {
      await api.post(`/ciftci/talepler/${id}/yanit/`, { karar })
      yukle()
    } catch { } finally { setIslemde(null) }
  }

  const danismanKaldir = async (id) => {
    if (!window.confirm('Bu danışmanlık ilişkisini kaldırmak istediğinize emin misiniz?')) return
    setDanIslemde(id)
    try {
      await api.patch(`/ciftci/danismanlarim-ciftci/${id}/guncelle/`, { aksiyon: 'iptal' })
      setDanismanlar(p => p.filter(d => d.id !== id))
    } catch { alert('İşlem başarısız.') }
    finally { setDanIslemde(null) }
  }

  const bayiiKaldir = async (id) => {
    if (!window.confirm('Bayii ilişkisini kaldırmak istediğinize emin misiniz?')) return
    setBayiiIslemde(id)
    try {
      await api.delete(`/ciftci/bayiilerim/${id}/kaldir/`)
      setBayiilerim(p => p.filter(b => b.id !== id))
    } catch { alert('İşlem başarısız.') }
    finally { setBayiiIslemde(null) }
  }

  const bayiiListesiAc = async () => {
    setBayiiPanelAcik(true)
    if (tumBayii.length > 0) return
    try {
      const res = await api.get('/katalog/bayii/listele/')
      setTumBayii(res.data)
    } catch { setBayiiHata('Bayii listesi yüklenemedi.') }
  }

  const bayiiTalepGonder = async (bayiiId) => {
    setBayiiIslemde(bayiiId)
    setBayiiHata('')
    try {
      await api.post('/ciftci/bayii/talep/', { bayii: bayiiId })
      setBayiiPanelAcik(false)
      bayiileriYukle()
    } catch (err) {
      setBayiiHata(err.response?.data?.detail || 'Talep gönderilemedi.')
    } finally { setBayiiIslemde(null) }
  }

  if (authYukleniyor) return <div style={s.yuklenme}>Yükleniyor...</div>

  const baglinaBayii  = bayiilerim.filter(b => b.durum === 'onaylandi')
  const bekleyenBayii = bayiilerim.filter(b => b.durum === 'bekliyor')
  const filtrelenmisBayii = tumBayii.filter(b =>
    b.firma_adi.toLowerCase().includes(bayiiAra.toLowerCase()) ||
    b.il.toLowerCase().includes(bayiiAra.toLowerCase()) ||
    b.ilce.toLowerCase().includes(bayiiAra.toLowerCase())
  )
  const zatenEkliBayiiIdler = new Set(bayiilerim.map(b => b.bayii))

  return (
    <div style={{ ...s.kapsayici, padding: isMobile ? '1rem' : '2rem' }}>
      <h2 style={s.baslik}>İzinler</h2>

      <div style={s.tabBar}>
        <button style={{...s.tabBtn, ...(tab === 'danismanlar' ? s.tabAktif : {})}} onClick={() => setTab('danismanlar')}>
          👨‍💼 Danışmanlarım
        </button>
        <button style={{...s.tabBtn, ...(tab === 'gonderilen' ? s.tabAktif : {})}} onClick={() => setTab('gonderilen')}>
          Gönderilen {gonderilenler.length > 0 && <span style={s.rozet}>{gonderilenler.length}</span>}
        </button>
        <button style={{...s.tabBtn, ...(tab === 'bayii' ? s.tabAktif : {})}} onClick={() => setTab('bayii')}>
          Bayiilerim {bekleyenBayii.length > 0 && <span style={s.rozet}>{bekleyenBayii.length}</span>}
        </button>
      </div>

      {/* ── Danışmanlarım ── */}
      {tab === 'danismanlar' && (
        <>
          {danYukleniyor ? (
            <div style={s.yuklenme}>Yükleniyor...</div>
          ) : danismanlar.length === 0 ? (
            <div style={s.bos}>
              <p style={s.bosBaslik}>Henüz danışmanınız yok</p>
              <p style={s.bosAlt}>Slide menüden "Danışman Ekle" ile mühendis talep gönderebilirsiniz.</p>
            </div>
          ) : (
            <div style={s.liste}>
              {danismanlar.map(d => (
                <div key={d.id} style={s.kart}>
                  <div style={s.kartIcerik}>
                    <div style={s.ikonYesil}>👨‍💼</div>
                    <div style={s.bilgi}>
                      <p style={s.baslikKuculuk}>{d.muhendis_ad}</p>
                      <p style={s.alt}>🏢 {d.isletme?.ad}{d.isletme?.urun_ad ? ` · 🌱 ${d.isletme.urun_ad}` : ''}</p>
                      {d.yanit_tarihi && (
                        <p style={s.tarih}>✅ Onaylandı — {new Date(d.yanit_tarihi).toLocaleDateString('tr-TR')}</p>
                      )}
                    </div>
                    <span style={s.onayliRozet}>Aktif</span>
                  </div>
                  <div style={{ display:'flex', gap:'8px', justifyContent:'flex-end', marginTop:'10px' }}>
                    <button style={s.kaldir} disabled={danIslemde === d.id} onClick={() => danismanKaldir(d.id)}>
                      {danIslemde === d.id ? '…' : '✕ Kaldır'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Mühendisten Gelen Talepler ── */}
      {tab === 'bekleyen' && (
        <>
          {bekleyenler.length === 0 ? (
            <div style={s.bos}>
              <p style={s.bosBaslik}>Bekleyen talep yok</p>
              <p style={s.bosAlt}>Bir mühendis danışman olarak eklemek istediğinde burada görünür.</p>
            </div>
          ) : (
            <div style={s.liste}>
              {bekleyenler.map(t => (
                <div key={t.id} style={s.kart}>
                  <div style={s.kartIcerik}>
                    <div style={s.ikon}>👨‍💼</div>
                    <div style={s.bilgi}>
                      <p style={s.baslikKuculuk}>{t.muhendis_ad}</p>
                      <p style={s.alt}>{t.isletme?.ad} için danışmanlık talebinde bulunuyor</p>
                      <p style={s.tarih}>{new Date(t.talep_tarihi).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    </div>
                  </div>
                  <div style={{ ...s.butonlar, flexDirection: isMobile ? 'column' : 'row' }}>
                    <button style={s.reddetBtn} onClick={() => talepYanitla(t.id, 'reddet')} disabled={islemde === t.id}>Reddet</button>
                    <button style={s.onaylaBtn} onClick={() => talepYanitla(t.id, 'onayla')} disabled={islemde === t.id}>
                      {islemde === t.id ? 'İşleniyor…' : 'Onayla'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Mühendise Gönderilen Talepler ── */}
      {tab === 'gonderilen' && (
        <>
          {gonderilenler.length === 0 ? (
            <div style={s.bos}>
              <p style={s.bosBaslik}>Gönderilen talep yok</p>
              <p style={s.bosAlt}>Slide menüden "Danışman Ekle" ile mühendise talep gönderebilirsiniz.</p>
            </div>
          ) : (
            <div style={s.liste}>
              {gonderilenler.map(t => (
                <div key={t.id} style={s.kart}>
                  <div style={s.kartIcerik}>
                    <div style={s.ikon}>👨‍💼</div>
                    <div style={s.bilgi}>
                      <p style={s.baslikKuculuk}>{t.muhendis_ad}</p>
                      <p style={s.alt}>🏢 {t.isletme?.ad} için talep gönderildi</p>
                      <p style={s.tarih}>{new Date(t.talep_tarihi).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    </div>
                    <span style={s.bekleyenRozet}>Bekliyor</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Bayiilerim ── */}
      {tab === 'bayii' && (
        <>
          {bayiiYukleniyor ? (
            <div style={s.yuklenme}>Yükleniyor...</div>
          ) : (
            <>
              {baglinaBayii.length > 0 && (
                <div style={s.liste}>
                  {baglinaBayii.map(b => (
                    <div key={b.id} style={s.kart}>
                      <div style={s.kartIcerik}>
                        <div style={s.ikonYesil}>🏪</div>
                        <div style={s.bilgi}>
                          <p style={s.baslikKuculuk}>{b.bayii_adi}</p>
                          <p style={s.alt}>{b.bayii_ilce}, {b.bayii_il}</p>
                          {b.bayii_telefon && <p style={s.tarih}>{b.bayii_telefon}</p>}
                        </div>
                        <span style={s.onayliRozet}>Bağlı</span>
                      </div>
                      <div style={{ display:'flex', gap:'8px', justifyContent:'flex-end', marginTop:'10px' }}>
                        <button style={s.kaldir} disabled={bayiiIslemde === b.id} onClick={() => bayiiKaldir(b.id)}>
                          {bayiiIslemde === b.id ? '…' : '✕ Kaldır'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {bekleyenBayii.length > 0 && (
                <div style={{ marginTop: baglinaBayii.length > 0 ? '1rem' : 0 }}>
                  <p style={s.bolumBaslik}>Bekleyen Talepler</p>
                  <div style={s.liste}>
                    {bekleyenBayii.map(b => (
                      <div key={b.id} style={{...s.kart, opacity: 0.7}}>
                        <div style={s.kartIcerik}>
                          <div style={s.ikon}>🏪</div>
                          <div style={s.bilgi}>
                            <p style={s.baslikKuculuk}>{b.bayii_adi}</p>
                            <p style={s.alt}>{b.bayii_ilce}, {b.bayii_il}</p>
                          </div>
                          <span style={s.bekleyenRozet}>Bekliyor</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {baglinaBayii.length === 0 && bekleyenBayii.length === 0 && (
                <div style={s.bos}>
                  <p style={s.bosBaslik}>Henüz bayii yok</p>
                  <p style={s.bosAlt}>Bir bayii seçerek bağlanabilirsiniz.</p>
                </div>
              )}

            </>
          )}

          {bayiiPanelAcik && (
            <div style={s.overlay} onClick={() => setBayiiPanelAcik(false)}>
              <div style={{ ...s.panel, width: isMobile ? '94vw' : '480px' }} onClick={e => e.stopPropagation()}>
                <div style={s.panelBaslik}>
                  <span>Bayii Seç</span>
                  <button style={s.kapat} onClick={() => setBayiiPanelAcik(false)}>✕</button>
                </div>
                <input
                  placeholder="Bayii adı veya ilçe ara..."
                  value={bayiiAra}
                  onChange={e => setBayiiAra(e.target.value)}
                  style={s.araInput}
                  autoFocus
                />
                {bayiiHata && <p style={s.hataMsg}>{bayiiHata}</p>}
                <div style={s.panelListe}>
                  {filtrelenmisBayii.length === 0 ? (
                    <p style={{ color: '#aaa', textAlign: 'center', padding: '1rem' }}>Sonuç yok</p>
                  ) : filtrelenmisBayii.map(b => {
                    const ekli = zatenEkliBayiiIdler.has(b.id)
                    return (
                      <div key={b.id} style={s.panelSatir}>
                        <div>
                          <p style={s.baslikKuculuk}>{b.firma_adi}</p>
                          <p style={s.alt}>{b.ilce}, {b.il} {b.telefon && `· ${b.telefon}`}</p>
                        </div>
                        {ekli ? (
                          <span style={s.ekliYazi}>Ekli</span>
                        ) : (
                          <button
                            style={s.talepBtn}
                            disabled={bayiiIslemde === b.id}
                            onClick={() => bayiiTalepGonder(b.id)}
                          >
                            {bayiiIslemde === b.id ? '…' : 'Talep'}
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

const s = {
  kapsayici:   { maxWidth: '720px', margin: '0 auto' },
  baslik:      { fontSize: '1.5rem', fontWeight: '500', marginBottom: '1rem', color: '#1a7a4a' },
  yuklenme:    { padding: '2rem', textAlign: 'center', color: '#888' },
  hataMsg:     { color: '#e53e3e', fontSize: '0.85rem', margin: '8px 0' },
  tabBar:      { display: 'flex', gap: '4px', borderBottom: '2px solid #eee', marginBottom: '1.25rem' },
  tabBtn:      { padding: '8px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem', color: '#888', borderBottom: '2px solid transparent', marginBottom: '-2px' },
  tabAktif:    { color: '#1a7a4a', fontWeight: '600', borderBottomColor: '#1a7a4a' },
  rozet:       { display: 'inline-block', background: '#e53e3e', color: '#fff', borderRadius: '10px', fontSize: '0.7rem', padding: '1px 6px', marginLeft: '6px', fontWeight: '700' },
  bos:         { padding: '3rem', textAlign: 'center', background: '#f9f9f9', borderRadius: '10px', marginBottom: '1rem' },
  bosBaslik:   { fontSize: '1rem', fontWeight: '500', color: '#555', margin: '0 0 6px' },
  bosAlt:      { fontSize: '0.85rem', color: '#aaa', margin: 0 },
  liste:       { display: 'flex', flexDirection: 'column', gap: '10px' },
  kart:        { background: '#fff', border: '1px solid #e8e8e8', borderRadius: '12px', padding: '1.1rem' },
  kartIcerik:  { display: 'flex', gap: '12px', alignItems: 'center' },
  ikon:        { fontSize: '1.8rem', lineHeight: 1, flexShrink: 0 },
  ikonYesil:   { fontSize: '1.8rem', lineHeight: 1, flexShrink: 0 },
  bilgi:       { flex: 1 },
  baslikKuculuk: { margin: '0 0 2px', fontWeight: '600', fontSize: '0.95rem' },
  alt:         { margin: '0 0 2px', fontSize: '0.85rem', color: '#666' },
  tarih:       { margin: 0, fontSize: '0.78rem', color: '#aaa' },
  butonlar:    { display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '0.75rem' },
  reddetBtn:   { padding: '7px 16px', background: '#fff', color: '#e53e3e', border: '1px solid #e53e3e', borderRadius: '8px', cursor: 'pointer', fontSize: '0.88rem' },
  onaylaBtn:   { padding: '7px 16px', background: '#1a7a4a', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.88rem', fontWeight: '500' },
  onayliRozet: { padding: '3px 10px', background: '#e8f5ee', color: '#1a7a4a', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '600', flexShrink: 0 },
  bekleyenRozet:{ padding: '3px 10px', background: '#fff8e1', color: '#b7791f', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '600', flexShrink: 0 },
  bolumBaslik: { fontSize: '0.85rem', fontWeight: '600', color: '#aaa', margin: '0 0 8px', textTransform: 'uppercase' },
  ekleBtn:     { marginTop: '1rem', padding: '9px 20px', background: '#1a7a4a', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '500' },
  overlay:     { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  panel:       { background: '#fff', borderRadius: '16px', overflow: 'hidden', maxHeight: '80vh', display: 'flex', flexDirection: 'column' },
  panelBaslik: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', borderBottom: '1px solid #eee', fontWeight: '600', fontSize: '1rem' },
  kapat:       { background: 'none', border: 'none', fontSize: '1.1rem', cursor: 'pointer', color: '#aaa' },
  araInput:    { margin: '0.75rem 1.25rem', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '0.9rem', outline: 'none' },
  panelListe:  { overflowY: 'auto', padding: '0 1.25rem 1rem' },
  panelSatir:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f5f5f5' },
  talepBtn:    { padding: '5px 14px', background: '#1a7a4a', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: '500' },
  ekliYazi:    { fontSize: '0.82rem', color: '#aaa' },
  kaldir:      { padding: '5px 14px', background: '#fff0f0', color: '#e05353', border: '1px solid #fcc', borderRadius: '7px', cursor: 'pointer', fontSize: '0.82rem' },
}
