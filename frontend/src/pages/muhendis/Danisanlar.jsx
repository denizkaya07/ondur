import { useEffect, useState, useMemo, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import { AuthContext } from '../../context/AuthContext'
import IsletmeFotografPanel from '../../components/IsletmeFotografPanel'

function ReceteDetayIcerik({ recete }) {
  const adimlar = recete.adimlar || []
  const sulama  = adimlar.filter(a => a.notlar?.includes('[sulama]'))
  const kultur  = adimlar.filter(a => a.notlar?.includes('[kültürel]'))
  const biyo    = adimlar.filter(a => a.notlar?.includes('[biyolojik]'))
  const takip   = adimlar.filter(a => a.notlar?.includes('[takip]'))

  return (
    <div style={{ fontSize:'0.85rem', color:'#333' }}>
      {recete.tani && <p style={{ margin:'0 0 8px', fontWeight:'500' }}>🔍 {recete.tani}</p>}
      {recete.ciftciye_not && <p style={{ margin:'0 0 8px', color:'#666' }}>📝 {recete.ciftciye_not}</p>}

      {sulama.map((a, i) => (
        <div key={a.id} style={{ marginBottom:'8px' }}>
          <p style={{ margin:'0 0 4px', fontWeight:'500', color:'#1a7a4a' }}>💧 {i+1}. Sulama {a.uygulama_tarihi ? `— ${a.uygulama_tarihi}` : ''}</p>
          {(a.kalemler||[]).map(k => (
            <p key={k.id} style={{ margin:'0 0 2px', paddingLeft:'12px' }}>
              • {k.ilac_ad || k.gubre_ad || '—'} — {k.doz_dekar} {k.birim}
            </p>
          ))}
        </div>
      ))}
      {kultur.length > 0 && <p style={{ margin:'0 0 4px', fontWeight:'500', color:'#1a7a4a' }}>🌿 Kültürel</p>}
      {kultur.map(a => <p key={a.id} style={{ margin:'0 0 2px', paddingLeft:'12px' }}>• {a.tanim}</p>)}
      {biyo.length > 0 && <p style={{ margin:'4px 0', fontWeight:'500', color:'#1a7a4a' }}>🐞 Biyolojik</p>}
      {biyo.map(a => <p key={a.id} style={{ margin:'0 0 2px', paddingLeft:'12px' }}>• {a.tanim}</p>)}
      {takip.length > 0 && <p style={{ margin:'4px 0', fontWeight:'500', color:'#1a7a4a' }}>📋 Takip</p>}
      {takip.map(a => <p key={a.id} style={{ margin:'0 0 2px', paddingLeft:'12px' }}>• {a.uygulama_tarihi ? `${a.uygulama_tarihi} — ` : ''}{a.tanim}</p>)}
    </div>
  )
}

function urunEmoji(urun, cesit) {
  const anahtar = [cesit, urun].find(s => s && URUN_EMOJI[s?.toLowerCase()])
  return URUN_EMOJI[anahtar?.toLowerCase()] || '🌱'
}

const URUN_EMOJI = {
  domates: '🩷', cherry: '🍒', biber: '🫑', patlican: '🍆',
  salatalik: '🥒', kavun: '🍈', karpuz: '🍉', çilek: '🍓',
  uzum: '🍇', elma: '🍎', nar: '🍎', zeytin: '🫒',
  buğday: '🌾', arpa: '🌾', mısır: '🌽', ayçiçek: '🌻',
  pamuk: '🌱', patates: '🥔', soğan: '🧅', sarımsak: '🧄',
  fasulye: '🫘', nohut: '🫘', mercimek: '🫘',
}

function gunFarki(tarihStr) {
  if (!tarihStr) return null
  const gun = Math.floor((Date.now() - new Date(tarihStr)) / 86400000)
  return gun >= 0 ? gun : null
}



const DURUM_RENK = {
  taslak:    { bg: '#fff8e1', color: '#b7791f' },
  onaylandi: { bg: '#e8f5ee', color: '#1a7a4a' },
  iptal:     { bg: '#fff0f0', color: '#c53030' },
}

export default function Danisanlar() {
  const navigate = useNavigate()
  const { kullanici, yukleniyor: authYukleniyor } = useContext(AuthContext)
  const [danisanlar, setDanisanlar]     = useState([])
  const [yukleniyor, setYukleniyor]     = useState(true)
  const [aramaAcik, setAramaAcik]       = useState(false)
  const [tumCiftciler, setTumCiftciler] = useState([])
  const [seciliCiftci, setSeciliCiftci] = useState(null)
  const [seciliIsletme, setSeciliIsletme] = useState([])
  const [gonderiyor, setGonderiyor]     = useState(false)
  const [basari, setBasari]             = useState('')
  const [hata, setHata]                 = useState('')
  const [filtre, setFiltre]             = useState('')
  const [acikCiftci, setAcikCiftci]     = useState(null)
  const [gecmisIsletme, setGecmisIsletme] = useState(null)
  const [gecmisReceteler, setGecmisReceteler] = useState({})
  const [fotografIsletme, setFotografIsletme] = useState(null)
  const [acikRecete, setAcikRecete] = useState(null)     // { id, data|null }
  const [receteDetay, setReceteDetay] = useState({})

  const gecmisToggle = (e, islId) => {
    e.stopPropagation()
    if (gecmisIsletme === islId) { setGecmisIsletme(null); setAcikRecete(null); return }
    setGecmisIsletme(islId)
    setAcikRecete(null)
    if (!gecmisReceteler[islId]) {
      api.get(`/recete/?isletme=${islId}`)
        .then(res => setGecmisReceteler(prev => ({ ...prev, [islId]: res.data })))
        .catch(() => setGecmisReceteler(prev => ({ ...prev, [islId]: [] })))
    }
  }

  const receteAc = (e, rid) => {
    e.stopPropagation()
    if (acikRecete === rid) { setAcikRecete(null); return }
    setAcikRecete(rid)
    if (!receteDetay[rid]) {
      api.get(`/recete/${rid}/`)
        .then(res => setReceteDetay(prev => ({ ...prev, [rid]: res.data })))
        .catch(() => setReceteDetay(prev => ({ ...prev, [rid]: 'hata' })))
    }
  }

  useEffect(() => {
    if (authYukleniyor) return
    if (!kullanici || kullanici.rol !== 'muhendis') {
      navigate('/giris')
      return
    }
    api.get('/ciftci/danisanlarim/')
      .then(res => setDanisanlar(res.data))
      .catch(err => {
        console.error(err)
        setHata('Danışanlar yüklenirken hata oluştu.')
      })
      .finally(() => setYukleniyor(false))
  }, [authYukleniyor, kullanici, navigate])

  // Danışanları çiftçiye göre grupla
  const gruplar = useMemo(() => {
    const map = {}
    danisanlar.forEach(d => {
      const key = d.ciftci_ad || d.isletme?.id
      if (!map[key]) {
        map[key] = {
          ciftci_ad: d.ciftci_ad,
          ciftci_soyad: d.ciftci_soyad,
          ciftci_mahalle: d.ciftci_mahalle,
          ciftci_ilce: d.ciftci_ilce,
          ciftci_il: d.ciftci_il,
          ciftci_cks_no: d.ciftci_cks_no,
          ciftci_telefon: d.ciftci_telefon,
          isletmeler: []
        }
      }
      map[key].isletmeler.push(d.isletme)
    })
    return Object.values(map)
  }, [danisanlar])

  const filtreliGruplar = gruplar.filter(g => {
    if (!filtre) return true
    const q = filtre.toLowerCase()
    return (
      g.ciftci_ad?.toLowerCase().includes(q) ||
      g.ciftci_soyad?.toLowerCase().includes(q) ||
      g.ciftci_mahalle?.toLowerCase().includes(q) ||
      g.ciftci_ilce?.toLowerCase().includes(q) ||
      g.ciftci_il?.toLowerCase().includes(q) ||
      g.ciftci_cks_no?.toLowerCase().includes(q) ||
      g.ciftci_telefon?.toLowerCase().includes(q) ||
      g.isletmeler.some(i => i?.ad?.toLowerCase().includes(q))
    )
  })

  // ── Danışan Ekle ──
  const aramaAc = () => {
    setAramaAcik(true)
    if (tumCiftciler.length === 0) {
      api.get('/ciftci/liste/').then(res => setTumCiftciler(res.data)).catch(() => {})
    }
  }

  const aramaKapat = () => {
    setAramaAcik(false)
    setSeciliCiftci(null)
    setSeciliIsletme([])
    setBasari('')
    setHata('')
  }

  const ciftciSec = (e) => {
    const id = e.target.value
    const c = tumCiftciler.find(c => String(c.id) === id) || null
    setSeciliCiftci(c)
    setSeciliIsletme([])
    setBasari('')
    setHata('')
  }

  const isletmeToggle = (id) => {
    setSeciliIsletme(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const talepGonder = async () => {
    if (seciliIsletme.length === 0) return
    setGonderiyor(true)
    setHata('')
    try {
      const res = await api.post('/ciftci/talep/', { isletme_idler: seciliIsletme })
      const { olusturulan } = res.data
      setBasari(
        olusturulan.length > 0
          ? `${olusturulan.length} işletme için talep gönderildi. Çiftçinin onayı bekleniyor.`
          : 'Seçilen işletmeler için zaten talep mevcut.'
      )
      setSeciliIsletme([])
    } catch {
      setHata('Talep gönderilemedi.')
    } finally {
      setGonderiyor(false)
    }
  }

  if (authYukleniyor || yukleniyor) return <div style={s.yuklenme}>Yükleniyor...</div>

  if (hata) return <div style={s.hataMsg}>{hata}</div>

  return (
    <div style={s.kapsayici}>
      <div style={s.ustBar}>
        <h2 style={s.baslik}>Danışanlarım</h2>
        <button style={s.ekleBtn} onClick={aramaAc}>+ Danışan Ekle</button>
      </div>

      {/* ── Danışan Ekle Paneli ── */}
      {aramaAcik && (
        <div style={s.panel}>
          <div style={s.panelUst}>
            <span style={s.panelBaslik}>Çiftçi Seç</span>
            <button style={s.kapatBtn} onClick={aramaKapat}>✕</button>
          </div>

          <select style={s.dropdown} onChange={ciftciSec} defaultValue="">
            <option value="" disabled>— Çiftçi seçin —</option>
            {tumCiftciler.map(c => (
              <option key={c.id} value={c.id}>
                {c.ad} {c.soyad} · {c.ilce} / {c.il}
              </option>
            ))}
          </select>

          {hata && <p style={s.hataMsg}>{hata}</p>}

          {seciliCiftci && (
            <div style={s.ciftciKart}>
              <div style={s.ciftciRow}>
                <div style={s.ciftciAvatar}>{seciliCiftci.ad?.[0]}{seciliCiftci.soyad?.[0]}</div>
                <div>
                  <p style={s.ciftciAd}>{seciliCiftci.ad} {seciliCiftci.soyad}</p>
                  <p style={s.ciftciAlt}>{seciliCiftci.ilce} / {seciliCiftci.il} · {seciliCiftci.telefon}</p>
                </div>
              </div>

              {seciliCiftci.isletmeler?.length === 0 ? (
                <p style={s.bosMsg}>Bu çiftçiye ait işletme yok.</p>
              ) : (
                <>
                  <p style={s.isletmeBaslik2}>İşletme seç:</p>
                  {seciliCiftci.isletmeler.map(i => (
                    <label key={i.id} style={s.isletmeRow}>
                      <input
                        type="checkbox"
                        checked={seciliIsletme.includes(i.id)}
                        onChange={() => isletmeToggle(i.id)}
                        style={{ marginRight: '10px' }}
                      />
                      <span>
                        <strong>{i.ad}</strong>
                        <span style={s.isletmeBilgi}> · {i.cesit_ad || i.urun_ad || '—'} · {i.alan_dekar} da</span>
                      </span>
                    </label>
                  ))}
                </>
              )}

              {basari ? (
                <p style={s.basariMsg}>{basari}</p>
              ) : (
                <button
                  style={{...s.talepBtn, opacity: seciliIsletme.length > 0 ? 1 : 0.5}}
                  onClick={talepGonder}
                  disabled={seciliIsletme.length === 0 || gonderiyor}
                >
                  {gonderiyor ? 'Gönderiliyor…' : `Talep Gönder (${seciliIsletme.length})`}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Danışan Listesi ── */}
      {danisanlar.length === 0 ? (
        <div style={s.bos}>Henüz danışanınız yok.</div>
      ) : (
        <>
          <input
            style={s.filtre}
            type="text"
            placeholder="İsim, ilçe veya işletme ara…"
            value={filtre}
            onChange={e => setFiltre(e.target.value)}
          />

          <div style={s.liste}>
            {filtreliGruplar.length === 0 ? (
              <div style={s.bos}>Eşleşen danışan bulunamadı.</div>
            ) : filtreliGruplar.map((g, i) => {
              const acik = acikCiftci === i
              return (
                <div key={i} style={s.kart}>
                  {/* Danışan Kartı */}
                  <div style={s.kartUst} onClick={() => setAcikCiftci(acik ? null : i)}>
                    <div style={s.kartMeta}>
                      <p style={s.isim}>
                        [ 👨‍🌾 {g.ciftci_ad} {g.ciftci_soyad} ]
                        {g.ciftci_telefon && <span style={s.isimDetay}>  📞 {g.ciftci_telefon}</span>}
                      </p>
                      <p style={s.ilce}>
                        📍 {[g.ciftci_mahalle, g.ciftci_ilce, g.ciftci_il].filter(Boolean).join(' / ')}
                        {g.ciftci_cks_no && <span>  🆔 ÇKS: {g.ciftci_cks_no}</span>}
                        <span style={s.isletmeSayisi}>  · {g.isletmeler.length} işletme</span>
                      </p>
                    </div>
                    <span style={s.ok}>{acik ? '▲' : '▼'}</span>
                  </div>

                  {/* İşletme Listesi */}
                  {acik && (
                    <div style={s.isletmeListe}>
                      {g.isletmeler.map(isl => isl && (
                        <div key={isl.id}>
                          <div
                            style={s.isletmeKart}
                            onClick={() => navigate(`/muhendis/recete/yaz?isletme=${isl.id}`)}
                          >
                            <div style={s.isletmeKartSol}>
                              <p style={s.isletmeBaslik}>
                                {urunEmoji(isl.urun_ad, isl.cesit_ad)}{' '}
                                [ 🏢 {isl.ad} ] 👨‍🌾 {g.ciftci_ad} {g.ciftci_soyad}
                                {'  -----  '}
                                🌱 {isl.urun_ad || '—'}{isl.cesit_ad ? ` - ${isl.cesit_ad}` : ''}
                                {'  '}📏 {isl.alan_dekar ? `${isl.alan_dekar} da` : '—'}
                                {gunFarki(isl.ekim_tarihi) !== null && <>{'  '}⏳ {gunFarki(isl.ekim_tarihi)} günlük</>}
                                {isl.enlem && isl.boylam && <>{' '}<a href={`https://maps.google.com/?q=${isl.enlem},${isl.boylam}`} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={s.gpsLink}>📍 GPS</a></>}
                              </p>
                            </div>
                            <div style={{display:'flex',flexDirection:'column',gap:'5px',flexShrink:0}}>
                              <button
                                style={{...s.gecmisBtn, ...(gecmisIsletme === isl.id ? s.gecmisBtnAcik : {})}}
                                onClick={e => gecmisToggle(e, isl.id)}
                              >
                                📋 Geçmiş Reçeteler
                              </button>
                              <button
                                style={{...s.gecmisBtn, ...(fotografIsletme === isl.id ? s.gecmisBtnAcik : {})}}
                                onClick={e => { e.stopPropagation(); setFotografIsletme(fotografIsletme === isl.id ? null : isl.id) }}
                              >
                                📷 Fotoğraflar
                              </button>
                            </div>
                          </div>

                          {fotografIsletme === isl.id && (
                            <IsletmeFotografPanel
                              isletmeId={isl.id}
                              canUpload={true}
                              onKapat={() => setFotografIsletme(null)}
                            />
                          )}

                          {gecmisIsletme === isl.id && (
                            <div style={s.gecmisPanel}>
                              {!gecmisReceteler[isl.id] ? (
                                <p style={s.gecmisYukleniyor}>Yükleniyor…</p>
                              ) : gecmisReceteler[isl.id].length === 0 ? (
                                <p style={s.gecmisBos}>Henüz reçete yok.</p>
                              ) : gecmisReceteler[isl.id].map(r => (
                                <div key={r.id}>
                                  <div style={{...s.gecmisKart, cursor:'pointer', ...(acikRecete===r.id ? {background:'#f0f8f4'} : {})}}
                                    onClick={e => receteAc(e, r.id)}>
                                    <div style={s.gecmisKartSol}>
                                      <p style={s.gecmisTani}>{r.tani || '(Tanı yok)'}</p>
                                      <p style={s.gecmisAlt}>{r.tarih}</p>
                                    </div>
                                    <span style={{...s.gecmisBadge, ...DURUM_RENK[r.durum]}}>
                                      {r.durum === 'onaylandi' ? 'Onaylandı' : 'Taslak'}
                                    </span>
                                  </div>
                                  {acikRecete === r.id && (
                                    <div style={s.detayPanel} onClick={e => e.stopPropagation()}>
                                      {!receteDetay[r.id]
                                        ? <p style={s.gecmisYukleniyor}>Yükleniyor…</p>
                                        : receteDetay[r.id] === 'hata'
                                          ? <p style={{color:'#e53e3e',fontSize:'0.85rem'}}>Yüklenemedi.</p>
                                          : <ReceteDetayIcerik recete={receteDetay[r.id]} />
                                      }
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
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
  filtre: {
    width: '100%', padding: '9px 14px', border: '1px solid #ddd',
    borderRadius: '8px', fontSize: '0.95rem', marginBottom: '1rem',
    boxSizing: 'border-box', background: '#fff',
  },
  liste: { display: 'flex', flexDirection: 'column', gap: '10px' },

  // Danışan kartı
  kart:    { background: '#fff', border: '1px solid #e8e8e8', borderRadius: '10px', overflow: 'hidden' },
  kartUst: { display: 'flex', alignItems: 'center', gap: '12px', padding: '0.9rem 1.25rem', cursor: 'pointer' },
  avatar:  {
    width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
    background: '#e8f5ee', color: '#1a7a4a', display: 'flex',
    alignItems: 'center', justifyContent: 'center', fontWeight: '600', fontSize: '1.1rem',
  },
  kartMeta:     { flex: 1 },
  isim:         { margin: 0, fontWeight: '600', fontSize: '1rem', color: '#1a7a4a' },
  isimDetay:    { fontWeight: '400', color: '#444', fontSize: '0.95rem' },
  ilce:         { margin: '3px 0 0', fontSize: '0.83rem', color: '#666' },
  isletmeSayisi:{ color: '#aaa' },
  ok:           { fontSize: '0.75rem', color: '#aaa', flexShrink: 0 },

  // İşletme listesi
  isletmeListe: { borderTop: '1px solid #f0f0f0' },
  isletmeKart: {
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '0.85rem 1.25rem',
    borderBottom: '1px solid #f0f0f0', background: '#fafafa',
    cursor: 'pointer',
  },
  isletmeEmoji: {
    fontSize: '2rem', width: '44px', height: '44px', flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: '#fff', borderRadius: '10px', border: '1px solid #eee',
  },
  isletmeKartSol: { flex: 1, minWidth: 0 },
  isletmeBaslik: { margin: 0, fontSize: '0.85rem', lineHeight: '1.4', color: '#333' },
  isletmeBilgi2: { margin: '2px 0 0', fontSize: '0.8rem', color: '#888' },
  isletmeBtnler: { display: 'flex', flexDirection: 'column', gap: '5px', flexShrink: 0 },
  receteBtn: {
    padding: '5px 14px', background: '#1a7a4a', color: '#fff',
    border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '500',
  },
  ziyaretBtn: {
    padding: '5px 14px', background: '#f0f0f0', color: '#555',
    border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem',
  },
  gpsLink:       { color: '#1a7a4a', textDecoration: 'none', fontWeight: '500' },
  ayrintiBtn:    { padding: '5px 12px', background: '#e8f5ee', color: '#1a7a4a', border: '1px solid #c8e6d4', borderRadius: '6px', cursor: 'pointer', fontSize: '0.78rem' },
  gecmisBtn:     { padding: '5px 12px', background: '#f5f5f5', color: '#888', border: '1px solid #e8e8e8', borderRadius: '6px', cursor: 'pointer', fontSize: '0.78rem', flexShrink: 0 },
  gecmisBtnAcik: { background: '#e8f5ee', color: '#1a7a4a', borderColor: '#c8e6d4' },
  gecmisPanel:   { background: '#fafafa', borderTop: '1px solid #f0f0f0', padding: '0.75rem 1.25rem 0.75rem 1.5rem' },
  detayPanel:    { background: '#f8fdf9', borderTop: '1px solid #d0eada', padding: '0.75rem 1.25rem 0.75rem 2rem', margin: '0' },
  gecmisYukleniyor: { color: '#aaa', fontSize: '0.85rem', margin: 0 },
  gecmisBos:        { color: '#aaa', fontSize: '0.85rem', margin: 0 },
  gecmisKart:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #f0f0f0' },
  gecmisKartSol: { flex: 1 },
  gecmisTani:    { margin: 0, fontSize: '0.88rem', fontWeight: '500' },
  gecmisAlt:     { margin: '2px 0 0', fontSize: '0.78rem', color: '#aaa' },
  gecmisBadge:   { padding: '2px 8px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '500', flexShrink: 0 },

  // Danışan Ekle paneli
  panel:       { background: '#fff', border: '1px solid #e0ede6', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem' },
  panelUst:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' },
  panelBaslik: { fontWeight: '600', color: '#1a7a4a' },
  kapatBtn:    { background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: '#aaa' },
  dropdown: {
    width: '100%', padding: '9px 12px', border: '1px solid #ddd',
    borderRadius: '8px', fontSize: '0.95rem', marginBottom: '0.75rem',
    background: '#fff', cursor: 'pointer',
  },
  hataMsg:   { color: '#e53e3e', fontSize: '0.85rem', margin: '4px 0' },
  basariMsg: { color: '#1a7a4a', fontSize: '0.9rem', marginTop: '12px', fontWeight: '500' },
  ciftciKart:   { marginTop: '12px', padding: '1rem', background: '#f8fdf9', borderRadius: '10px', border: '1px solid #d0eada' },
  ciftciRow:    { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' },
  ciftciAvatar: {
    width: '44px', height: '44px', borderRadius: '50%',
    background: '#1a7a4a', color: '#fff', display: 'flex',
    alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '1rem',
  },
  ciftciAd:  { margin: 0, fontWeight: '600', fontSize: '1rem' },
  ciftciAlt: { margin: 0, fontSize: '0.82rem', color: '#888' },
  bosMsg:    { color: '#aaa', fontSize: '0.9rem' },
  isletmeBaslik2: { fontSize: '0.85rem', color: '#888', marginBottom: '6px', marginTop: 0 },
  isletmeRow: {
    display: 'flex', alignItems: 'center', padding: '8px 0',
    borderBottom: '1px solid #eee', cursor: 'pointer', fontSize: '0.9rem',
  },
  isletmeBilgi: { color: '#888', fontSize: '0.82rem' },
  talepBtn: {
    marginTop: '12px', width: '100%', padding: '10px',
    background: '#1a7a4a', color: '#fff', border: 'none',
    borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem',
  },
}
