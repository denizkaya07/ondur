import { useEffect, useState, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import { AuthContext } from '../../context/AuthContext'
import IsletmeFotografPanel from '../../components/IsletmeFotografPanel'
import useBreakpoint from '../../hooks/useBreakpoint'

const URUN_EMOJI = {
  domates:'🩷', cherry:'🍒', biber:'🫑', patlican:'🍆',
  salatalik:'🥒', kavun:'🍈', karpuz:'🍉', cilek:'🍓',
  uzum:'🍇', elma:'🍎', nar:'🍎', zeytin:'🫒',
  bugday:'🌾', arpa:'🌾', misir:'🌽', aycicek:'🌻',
  pamuk:'🌱', patates:'🥔', sogan:'🧅', sarimsak:'🧄',
}

function urunEmoji(urun, cesit) {
  const ara = (s) => s && URUN_EMOJI[s.toLowerCase().replace(/[çğışöü ]/g, c =>
    ({ç:'c',ğ:'g',ı:'i',ş:'s',ö:'o',ü:'u',' ':''}[c]||c))]
  return ara(cesit) || ara(urun) || '🌱'
}

function gunFarki(tarihStr) {
  if (!tarihStr) return null
  const gun = Math.floor((Date.now() - new Date(tarihStr)) / 86400000)
  return gun >= 0 ? gun : null
}

const TUR_ETIKET = {
  sera:        'Sera',
  acik_tarla:  'Açık Tarla',
  meyve_bahce: 'Meyve Bahçesi',
  zeytinlik:   'Zeytinlik',
  diger:       'Diğer',
}

const SERA_TIP = {
  naylon:     'Naylon',
  cam:        'Cam',
  policarbon: 'Polikarbon',
  net:        'Net / Gölgelik',
  diger:      'Diğer',
}

export default function Isletmelerim() {
  const navigate = useNavigate()
  const { kullanici, yukleniyor: authYukleniyor } = useContext(AuthContext)
  const { isMobile } = useBreakpoint()
  const [isletmeler, setIsletmeler] = useState([])
  const [urunler, setUrunler]       = useState([])
  const [cesitler, setCesitler]     = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [secili, setSecili]         = useState(null)
  const [toprakAnalizler, setToprakAnalizler] = useState({})
  const [toprakEkle, setToprakEkle]   = useState(null)
  const [toprakForm, setToprakForm]   = useState({})
  const [toprakAcik, setToprakAcik]   = useState(null)
  const [fotografAcik, setFotografAcik] = useState(null)
  const [receteler, setReceteler]     = useState(null)
  const [recAcik, setRecAcik]         = useState(null)
  const [formAcik, setFormAcik]     = useState(false)
  const [kaydediyor, setKaydediyor] = useState(false)
  const [hata, setHata]             = useState('')

  const [form, setForm] = useState({
    ad: '', tur: 'sera', sera_tip: '', urun: '', cesit: '',
    alan_dekar: '', ekim_tarihi: '', enlem: '', boylam: '',
  })

  useEffect(() => {
    if (authYukleniyor) return
    if (!kullanici || kullanici.rol !== 'ciftci') {
      navigate('/giris')
      return
    }
    Promise.all([
      api.get('/ciftci/isletmelerim/'),
      api.get('/ciftci/urunler/'),
      api.get('/recete/benim/'),
    ]).then(([is, ur, rec]) => {
      setIsletmeler(is.data)
      setUrunler(ur.data)
      setReceteler(rec.data)
    }).catch(err => {
      console.error(err)
      setHata('Veriler yüklenirken hata oluştu.')
    }).finally(() => setYukleniyor(false))
  }, [authYukleniyor, kullanici, navigate])

  const degis = (e) => {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
    if (name === 'urun') {
      setCesitler([])
      setForm(f => ({ ...f, urun: value, cesit: '' }))
      if (value) api.get(`/ciftci/urunler/${value}/cesitler/`).then(r => setCesitler(r.data)).catch(() => {})
    }
  }

  const kaydet = async (e) => {
    e.preventDefault()
    if (!form.ad || !form.tur || !form.alan_dekar) {
      setHata('Zorunlu alanları doldurun.')
      return
    }
    setKaydediyor(true)
    setHata('')
    try {
      const payload = {
        ad: form.ad,
        tur: form.tur,
        alan_dekar: form.alan_dekar,
        ...(form.tur === 'sera' && form.sera_tip ? { sera_tip: form.sera_tip } : {}),
        ...(form.urun ? { urun: form.urun } : {}),
        ...(form.cesit ? { cesit: form.cesit } : {}),
        ...(form.ekim_tarihi ? { ekim_tarihi: form.ekim_tarihi } : {}),
        ...(form.enlem ? { enlem: form.enlem } : {}),
        ...(form.boylam ? { boylam: form.boylam } : {}),
      }
      const res = await api.post('/ciftci/isletme/ekle/', payload)
      setIsletmeler(prev => [res.data, ...prev])
      setFormAcik(false)
      setForm({ ad: '', tur: 'sera', sera_tip: '', urun: '', cesit: '', alan_dekar: '', ekim_tarihi: '', enlem: '', boylam: '' })
      setCesitler([])
    } catch (err) {
      setHata(err.response?.data ? JSON.stringify(err.response.data) : 'Kayıt başarısız.')
    } finally {
      setKaydediyor(false)
    }
  }

  if (authYukleniyor || yukleniyor) return <div style={s.yuklenme}>Yükleniyor...</div>

  if (hata) return <div style={s.hataMsg}>{hata}</div>

  return (
    <div style={{ ...s.kapsayici, padding: isMobile ? '1rem' : '2rem' }}>
      <div style={s.ustBar}>
        <h2 style={s.baslik}>İşletmelerim</h2>
        <button style={s.ekleBtn} onClick={() => { setFormAcik(true); setHata('') }}>
          + İşletme Ekle
        </button>
      </div>

      {formAcik && (
        <div style={s.panel}>
          <div style={s.panelUst}>
            <span style={s.panelBaslik}>Yeni İşletme</span>
            <button style={s.kapatBtn} onClick={() => setFormAcik(false)}>✕</button>
          </div>
          <form onSubmit={kaydet}>
            <div style={{ ...s.formGrid, gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr' }}>
              <div style={{...s.alan, gridColumn: 'span 2'}}>
                <label style={s.etiket}>İşletme Adı *</label>
                <input style={s.girdi} name="ad" value={form.ad} onChange={degis} placeholder="Örn: Kuzey Serası" />
              </div>
              <div style={s.alan}>
                <label style={s.etiket}>Tür *</label>
                <select style={s.girdi} name="tur" value={form.tur} onChange={degis}>
                  {Object.entries(TUR_ETIKET).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              {form.tur === 'sera' && (
                <div style={s.alan}>
                  <label style={s.etiket}>Sera Tipi</label>
                  <select style={s.girdi} name="sera_tip" value={form.sera_tip} onChange={degis}>
                    <option value="">Seçin...</option>
                    {Object.entries(SERA_TIP).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
              )}
              <div style={s.alan}>
                <label style={s.etiket}>Alan (dekar) *</label>
                <input style={s.girdi} name="alan_dekar" type="number" step="0.1" min="0" value={form.alan_dekar} onChange={degis} />
              </div>
              <div style={s.alan}>
                <label style={s.etiket}>Ürün</label>
                <select style={s.girdi} name="urun" value={form.urun} onChange={degis}>
                  <option value="">Seçin...</option>
                  {urunler.map(u => <option key={u.id} value={u.id}>{u.ad}</option>)}
                </select>
              </div>
              <div style={s.alan}>
                <label style={s.etiket}>Ürün Çeşidi</label>
                <select style={s.girdi} name="cesit" value={form.cesit} onChange={degis} disabled={!form.urun || cesitler.length === 0}>
                  <option value="">{cesitler.length === 0 ? '— önce ürün seçin —' : '— Seçin —'}</option>
                  {cesitler.map(c => <option key={c.id} value={c.id}>{c.ad}</option>)}
                </select>
              </div>
              <div style={s.alan}>
                <label style={s.etiket}>Ekim Tarihi</label>
                <input style={s.girdi} name="ekim_tarihi" type="date" value={form.ekim_tarihi} onChange={degis} />
              </div>
              <div style={{...s.alan, gridColumn: isMobile ? 'span 1' : 'span 2'}}>
                <label style={s.etiket}>GPS Konumu</label>
                <div style={{display:'flex', gap:'8px', alignItems:'center', flexWrap:'wrap'}}>
                  <input style={{...s.girdi, flex:1}} name="enlem" type="number" step="0.000001" placeholder="Enlem (36.123456)" value={form.enlem} onChange={degis} />
                  <input style={{...s.girdi, flex:1}} name="boylam" type="number" step="0.000001" placeholder="Boylam (30.123456)" value={form.boylam} onChange={degis} />
                  <button type="button" style={s.konumBtn} onClick={() => {
                    if (!navigator.geolocation) return
                    navigator.geolocation.getCurrentPosition(
                      pos => setForm(f => ({ ...f, enlem: pos.coords.latitude.toFixed(6), boylam: pos.coords.longitude.toFixed(6) })),
                      () => alert('Konum alınamadı.')
                    )
                  }}>📍 Konumumu Al</button>
                </div>
              </div>
            </div>
            {hata && <p style={s.hataMsg}>{hata}</p>}
            <div style={s.formAlt}>
              <button type="button" style={s.iptalBtn} onClick={() => setFormAcik(false)}>Vazgeç</button>
              <button type="submit" style={s.kaydetBtn} disabled={kaydediyor}>
                {kaydediyor ? 'Kaydediliyor…' : 'Kaydet'}
              </button>
            </div>
          </form>
        </div>
      )}

      {isletmeler.length === 0 ? (
        <div style={s.bos}>Henüz işletme eklenmemiş.</div>
      ) : (
        <div style={s.liste}>
          {isletmeler.map(i => (
            <div
              key={i.id}
              style={{...s.kart, ...(secili?.id === i.id ? s.kartSecili : {})}}
              onClick={() => {
                const yeni = secili?.id === i.id ? null : i
                setSecili(yeni)
                if (yeni && !toprakAnalizler[i.id]) {
                  api.get(`/ciftci/isletme/${i.id}/toprak-analiz/`)
                    .then(r => setToprakAnalizler(prev => ({ ...prev, [i.id]: r.data })))
                    .catch(() => setToprakAnalizler(prev => ({ ...prev, [i.id]: [] })))
                }
              }}
            >
              <div style={s.kartUst}>
                <p style={s.isletmeBaslik}>
                  {urunEmoji(i.urun_ad, i.cesit_ad)}{' '}
                  [ 🏢 {i.ad} ]
                  {'  -----  '}
                  🌱 {i.urun_ad || '—'}{i.cesit_ad ? ` - ${i.cesit_ad}` : ''}
                  {i.alan_dekar ? `  📏 ${parseFloat(i.alan_dekar)} da` : ''}
                  {gunFarki(i.ekim_tarihi) !== null && `  ⏳ ${gunFarki(i.ekim_tarihi)} günlük`}
                  {'  '}{i.enlem && i.boylam
                    ? <a href={`https://maps.google.com/?q=${i.enlem},${i.boylam}`} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()} style={s.gpsLink}>📍 {parseFloat(i.enlem).toFixed(4)}, {parseFloat(i.boylam).toFixed(4)}</a>
                    : <span style={{ color:'#bbb', fontSize:'0.78rem' }}>📍 GPS yok</span>
                  }
                </p>
                <span style={i.aktif ? s.aktifBadge : s.pasifBadge}>
                  {i.aktif ? 'Aktif' : 'Pasif'}
                </span>
              </div>

              {secili?.id === i.id && (
                <div style={s.detay}>
                  {i.sera_tip && (
                    <div style={s.detayRow}>
                      <span style={s.detiket}>Sera Tipi</span>
                      <span>{SERA_TIP[i.sera_tip] || i.sera_tip}</span>
                    </div>
                  )}
                  {i.ekim_tarihi && (
                    <div style={s.detayRow}>
                      <span style={s.detiket}>Ekim Tarihi</span>
                      <span>{i.ekim_tarihi}</span>
                    </div>
                  )}
                  <div style={s.detayRow}>
                    <span style={s.detiket}>Oluşturma</span>
                    <span>{new Date(i.olusturma).toLocaleDateString('tr-TR')}</span>
                  </div>

                  {/* GPS detay */}
                  {i.enlem && i.boylam && (
                    <div style={s.detayRow}>
                      <span style={s.detiket}>📍 GPS</span>
                      <a href={`https://maps.google.com/?q=${i.enlem},${i.boylam}`} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()} style={s.gpsLink}>
                        {i.enlem}, {i.boylam} — Haritada Gör
                      </a>
                    </div>
                  )}

                  {/* Aksiyon butonları */}
                  <div style={s.aksiyonlar}>
                    <button style={{...s.aksiyonBtn, ...(recAcik === i.id ? s.aksiyonAktif : {})}}
                      onClick={e => { e.stopPropagation(); setRecAcik(recAcik === i.id ? null : i.id); setFotografAcik(null); setToprakAcik(null) }}>
                      📋 Reçeteler {recAcik === i.id ? '▲' : '▼'}
                    </button>
                    <button style={{...s.aksiyonBtn, ...(fotografAcik === i.id ? s.aksiyonAktif : {})}}
                      onClick={e => { e.stopPropagation(); setFotografAcik(fotografAcik === i.id ? null : i.id); setRecAcik(null); setToprakAcik(null) }}>
                      📷 Fotoğraflar {fotografAcik === i.id ? '▲' : '▼'}
                    </button>
                    <button style={{...s.aksiyonBtn, ...(toprakAcik === i.id ? s.aksiyonAktif : {})}}
                      onClick={e => { e.stopPropagation(); setToprakAcik(toprakAcik === i.id ? null : i.id); setRecAcik(null); setFotografAcik(null); setToprakEkle(null) }}>
                      🧪 Toprak Analizi {toprakAcik === i.id ? '▲' : '▼'}
                    </button>
                  </div>

                  {/* Reçeteler paneli */}
                  {recAcik === i.id && (
                    <div style={s.panelIcerik} onClick={e => e.stopPropagation()}>
                      {receteler === null
                        ? <p style={s.analizYukleniyor}>Yükleniyor…</p>
                        : receteler.filter(r => r.isletme === i.id).length === 0
                          ? <p style={s.analizYok}>Bu işletme için henüz reçete yok.</p>
                          : receteler.filter(r => r.isletme === i.id).map(r => (
                              <div key={r.id} style={s.receteKart}>
                                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                                  <span style={{ fontWeight:'500', fontSize:'0.88rem' }}>{r.tani || '(Tanı yok)'}</span>
                                  <span style={{ fontSize:'0.78rem', color:'#888' }}>{r.tarih}</span>
                                </div>
                                <p style={{ margin:'2px 0 0', fontSize:'0.78rem', color:'#888' }}>👷 {r.muhendis_ad}</p>
                              </div>
                            ))
                      }
                    </div>
                  )}

                  {/* Fotoğraflar paneli */}
                  {fotografAcik === i.id && (
                    <div onClick={e => e.stopPropagation()}>
                      <IsletmeFotografPanel
                        isletmeId={i.id}
                        canUpload={true}
                        onKapat={() => setFotografAcik(null)}
                      />
                    </div>
                  )}

                  {/* Toprak Analizi paneli */}
                  {toprakAcik === i.id && (
                    <div style={s.panelIcerik} onClick={e => e.stopPropagation()}>
                      <div style={s.toprakBaslikSatir}>
                        <span style={{ fontWeight:'600', fontSize:'0.85rem', color:'#1a7a4a' }}>🧪 Toprak Analizi</span>
                        <button style={s.toprakEkleBtn}
                          onClick={e => { e.stopPropagation(); setToprakEkle(toprakEkle === i.id ? null : i.id); setToprakForm({ tarih: new Date().toISOString().slice(0,10) }) }}>
                          {toprakEkle === i.id ? '✕ İptal' : '+ Ekle'}
                        </button>
                      </div>

                      {toprakEkle === i.id && (
                        <div style={s.toprakForm}>
                          <div style={{ display:'flex', flexWrap:'wrap', gap:'8px', marginBottom:'8px' }}>
                            {[
                              { key:'tarih', label:'Tarih', type:'date' },
                              { key:'ph', label:'pH', type:'number' },
                              { key:'organik_madde', label:'Org. Madde (%)', type:'number' },
                              { key:'fosfor', label:'Fosfor (kg/da)', type:'number' },
                              { key:'potasyum', label:'Potasyum (kg/da)', type:'number' },
                              { key:'kalsiyum', label:'Kalsiyum (kg/da)', type:'number' },
                              { key:'magnezyum', label:'Magnezyum (kg/da)', type:'number' },
                              { key:'tuz', label:'Tuz (%)', type:'number' },
                            ].map(({ key, label, type }) => (
                              <div key={key} style={{ display:'flex', flexDirection:'column', gap:'2px' }}>
                                <label style={{ fontSize:'0.72rem', color:'#666' }}>{label}</label>
                                <input type={type} step="0.01"
                                  value={toprakForm[key] || ''}
                                  onChange={e => setToprakForm(p => ({ ...p, [key]: e.target.value }))}
                                  style={{ width:'110px', padding:'4px 6px', border:'1px solid #d0eada', borderRadius:'4px', fontSize:'0.82rem' }} />
                              </div>
                            ))}
                          </div>
                          <div style={{ marginBottom:'8px' }}>
                            <label style={{ fontSize:'0.72rem', color:'#666' }}>Notlar</label>
                            <textarea value={toprakForm.notlar || ''}
                              onChange={e => setToprakForm(p => ({ ...p, notlar: e.target.value }))}
                              rows={2}
                              style={{ display:'block', width:'100%', padding:'4px 6px', border:'1px solid #d0eada', borderRadius:'4px', fontSize:'0.82rem', boxSizing:'border-box', resize:'vertical' }} />
                          </div>
                          <button style={s.toprakKaydetBtn}
                            onClick={async e => {
                              e.stopPropagation()
                              const res = await api.post(`/ciftci/isletme/${i.id}/toprak-analiz/`, toprakForm)
                              setToprakAnalizler(p => ({ ...p, [i.id]: [res.data, ...(p[i.id] || [])] }))
                              setToprakEkle(null)
                              setToprakForm({})
                            }}>
                            Kaydet
                          </button>
                        </div>
                      )}

                      {toprakAnalizler[i.id] === undefined
                        ? <p style={s.analizYukleniyor}>Yükleniyor…</p>
                        : toprakAnalizler[i.id].length === 0
                          ? <p style={s.analizYok}>Henüz toprak analizi girilmemiş.</p>
                          : toprakAnalizler[i.id].slice(0, 1).map(a => (
                              <div key={a.id} style={s.analizKart}>
                                <p style={s.analizBaslik}>Son analiz — {a.tarih}</p>
                                <div style={s.analizGrid}>
                                  {a.ph        != null && <span>pH: <b>{a.ph}</b></span>}
                                  {a.organik_madde != null && <span>Org. Madde: <b>{a.organik_madde}%</b></span>}
                                  {a.fosfor    != null && <span>Fosfor: <b>{a.fosfor} kg/da</b></span>}
                                  {a.potasyum  != null && <span>Potasyum: <b>{a.potasyum} kg/da</b></span>}
                                  {a.kalsiyum  != null && <span>Kalsiyum: <b>{a.kalsiyum} kg/da</b></span>}
                                  {a.magnezyum != null && <span>Magnezyum: <b>{a.magnezyum} kg/da</b></span>}
                                  {a.tuz       != null && <span>Tuz: <b>{a.tuz}%</b></span>}
                                </div>
                                {a.notlar && <p style={s.analizNot}>{a.notlar}</p>}
                              </div>
                            ))
                      }
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const s = {
  kapsayici: { padding: '2rem', maxWidth: '800px', margin: '0 auto' },
  ustBar:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' },
  baslik:    { fontSize: '1.5rem', fontWeight: '500', margin: 0, color: '#1a7a4a' },
  ekleBtn:   { padding: '8px 16px', background: '#1a7a4a', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem' },
  yuklenme:  { padding: '2rem', textAlign: 'center', color: '#888' },
  bos:       { padding: '3rem', textAlign: 'center', color: '#aaa', background: '#f9f9f9', borderRadius: '10px' },
  liste:     { display: 'flex', flexDirection: 'column', gap: '10px' },
  panel:     { background: '#fff', border: '1px solid #e0ede6', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem' },
  panelUst:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' },
  panelBaslik: { fontWeight: '600', color: '#1a7a4a' },
  kapatBtn:    { background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: '#aaa' },
  formGrid:  { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' },
  alan:      { display: 'flex', flexDirection: 'column', gap: '4px' },
  etiket:    { fontSize: '0.82rem', color: '#666', fontWeight: '500' },
  girdi:     { padding: '8px 10px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '0.9rem', background: '#fff', width: '100%', boxSizing: 'border-box' },
  hataMsg:   { color: '#e53e3e', fontSize: '0.85rem', marginTop: '8px' },
  formAlt:   { display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '14px' },
  iptalBtn:  { padding: '7px 14px', background: '#f0f0f0', color: '#444', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem' },
  kaydetBtn: { padding: '7px 18px', background: '#1a7a4a', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem' },
  kart:          { background: '#fff', border: '1px solid #e8e8e8', borderRadius: '10px', padding: '1rem 1.25rem', cursor: 'pointer' },
  kartSecili:    { border: '1px solid #1a7a4a' },
  kartUst:       { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' },
  isletmeBaslik: { margin: 0, fontSize: '0.9rem', lineHeight: '1.6', color: '#333', flex: 1 },
  gpsLink:       { color: '#1a7a4a', textDecoration: 'none', fontWeight: '500' },
  aktifBadge: { padding: '3px 10px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: '500', background: '#e8f5ee', color: '#1a7a4a' },
  pasifBadge: { padding: '3px 10px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: '500', background: '#f5f5f5', color: '#aaa' },
  detay:     { marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #f0f0f0' },
  detayRow:  { display: 'flex', gap: '12px', padding: '4px 0', fontSize: '0.9rem' },
  detiket:   { color: '#888', minWidth: '120px' },
  konumBtn:  { padding: '7px 12px', background: '#e8f5ee', color: '#1a7a4a', border: '1px solid #c8e6d4', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', whiteSpace: 'nowrap' },
  analizKart:       { marginTop: '12px', padding: '10px 12px', background: '#f8fdf9', border: '1px solid #d0eada', borderRadius: '8px' },
  analizBaslik:     { margin: '0 0 8px', fontWeight: '600', fontSize: '0.85rem', color: '#1a7a4a' },
  analizGrid:       { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '6px 12px', fontSize: '0.83rem', color: '#444', marginTop: '4px' },
  analizNot:        { margin: '8px 0 0', fontSize: '0.82rem', color: '#666' },
  analizYukleniyor: { fontSize: '0.83rem', color: '#aaa', marginTop: '10px' },
  analizYok:        { fontSize: '0.83rem', color: '#aaa', marginTop: '6px' },
  aksiyonlar:       { display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' },
  aksiyonBtn:       { padding: '5px 14px', background: '#f5f5f5', color: '#555', border: '1px solid #e0e0e0', borderRadius: '6px', cursor: 'pointer', fontSize: '0.82rem' },
  aksiyonAktif:     { background: '#e8f5ee', color: '#1a7a4a', borderColor: '#c8e6d4' },
  panelIcerik:      { marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' },
  receteKart:       { padding: '8px 12px', background: '#f8fdf9', border: '1px solid #d0eada', borderRadius: '6px' },
  toprakBaslikSatir:{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', paddingTop: '10px', borderTop: '1px solid #f0f0f0' },
  toprakEkleBtn:    { padding: '3px 10px', background: '#1a7a4a', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '0.78rem' },
  toprakForm:       { background: '#fff', border: '1px solid #d0eada', borderRadius: '6px', padding: '10px', marginTop: '8px' },
  toprakKaydetBtn:  { padding: '5px 16px', background: '#1a7a4a', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '0.82rem' },
}
