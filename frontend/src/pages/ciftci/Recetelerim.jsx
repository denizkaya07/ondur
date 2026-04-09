import { useEffect, useState, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import { AuthContext } from '../../context/AuthContext'
import useBreakpoint from '../../hooks/useBreakpoint'
import { recetePdfIndir } from '../../services/recetePdf'

const DURUM_RENK = {
  taslak:    { bg: '#fff8e1', color: '#b7791f' },
  onaylandi: { bg: '#e8f5ee', color: '#1a7a4a' },
  iptal:     { bg: '#fff0f0', color: '#c53030' },
}

const TIP_ETIKET = {
  sulama:    'Sulama',
  ilaclama:  'İlaçlama',
  gubreleme: 'Gübreleme',
  diger:     'Diğer',
}

export default function Recetelerim() {
  const navigate = useNavigate()
  const { kullanici, yukleniyor: authYukleniyor } = useContext(AuthContext)
  const { isMobile } = useBreakpoint()
  const [receteler, setReceteler]   = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [secili, setSecili]         = useState(null)
  const [detay, setDetay]           = useState(null)
  const [detayYukleniyor, setDetayYukleniyor] = useState(false)
  const [hata, setHata]             = useState('')

  useEffect(() => {
    if (authYukleniyor) return
    if (!kullanici || kullanici.rol !== 'ciftci') {
      navigate('/giris')
      return
    }
    api.get('/recete/benim/')
      .then(res => setReceteler(res.data))
      .catch(err => {
        console.error(err)
        setHata('Reçeteler yüklenirken hata oluştu.')
      })
      .finally(() => setYukleniyor(false))
  }, [authYukleniyor, kullanici, navigate])

  const kartTikla = async (r) => {
    if (secili?.id === r.id) {
      setSecili(null)
      setDetay(null)
      return
    }
    setSecili(r)
    setDetayYukleniyor(true)
    try {
      const res = await api.get(`/recete/${r.id}/`)
      setDetay(res.data)
    } catch {
      setDetay(null)
    } finally {
      setDetayYukleniyor(false)
    }
  }

  if (authYukleniyor || yukleniyor) return <div style={s.yuklenme}>Yükleniyor...</div>

  if (hata) return <div style={s.hataMsg}>{hata}</div>

  return (
    <div style={{ ...s.kapsayici, padding: isMobile ? '1rem' : '2rem' }}>
      <h2 style={s.baslik}>Reçetelerim</h2>

      {receteler.length === 0 ? (
        <div style={s.bos}>Henüz onaylanmış reçeteniz yok.</div>
      ) : (
        <div style={s.liste}>
          {receteler.map(r => (
            <div
              key={r.id}
              style={{...s.kart, ...(secili?.id === r.id ? s.kartSecili : {})}}
              onClick={() => kartTikla(r)}
            >
              <div style={s.kartUst}>
                <div style={s.kartSol}>
                  <p style={s.tani}>{r.tani}</p>
                  <p style={s.alt}>{r.isletme_ad} · {r.tarih} · {r.muhendis_ad} · {r.ciftci_ad} {r.ciftci_soyad} ({r.ciftci_telefon})</p>
                </div>
                <span style={{...s.badge, ...DURUM_RENK[r.durum]}}>
                  {r.durum === 'onaylandi' ? 'Onaylandı' : r.durum}
                </span>
              </div>

              {secili?.id === r.id && (
                <div style={s.detay}>
                  {detayYukleniyor ? (
                    <p style={s.alt}>Yükleniyor...</p>
                  ) : detay ? (
                    <>
                    <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:'8px' }}>
                      <button
                        style={s.pdfBtn}
                        onClick={e => { e.stopPropagation(); recetePdfIndir(detay) }}
                      >
                        PDF İndir
                      </button>
                    </div>
                    <>
                      <div style={s.detayRow}>
                        <span style={s.detiket}>Uygulama Yöntemi</span>
                        <span>{detay.uygulama_yontemi}</span>
                      </div>
                      {detay.ciftciye_not && (
                        <div style={s.detayRow}>
                          <span style={s.detiket}>Mühendis Notu</span>
                          <span>{detay.ciftciye_not}</span>
                        </div>
                      )}
                      {detay.adimlar?.length > 0 && (
                        <div style={s.adimlar}>
                          <p style={s.adimlarBaslik}>Uygulama Adımları</p>
                          {detay.adimlar.map(a => (
                            <div key={a.id} style={s.adimKart}>
                              <div style={s.adimUst}>
                                <span style={s.adimTip}>{TIP_ETIKET[a.tip] || a.tip}</span>
                                {a.uygulama_tarihi && (
                                  <span style={s.adimTarih}>{a.uygulama_tarihi}</span>
                                )}
                                {a.tamamlandi && <span style={s.tamam}>✓</span>}
                              </div>
                              {a.tanim && <p style={s.adimTanim}>{a.tanim}</p>}
                              {a.kalemler?.map(k => (
                                <p key={k.id} style={s.kalem}>
                                  {k.ilac_ad || k.gubre_ad} · {k.doz_dekar} {k.birim}/da
                                </p>
                              ))}
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                    </>
                  ) : null}
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
  baslik:    { fontSize: '1.5rem', fontWeight: '500', marginBottom: '1.5rem', color: '#1a7a4a' },
  yuklenme:  { padding: '2rem', textAlign: 'center', color: '#888' },
  bos:       { padding: '3rem', textAlign: 'center', color: '#aaa', background: '#f9f9f9', borderRadius: '10px' },
  liste:     { display: 'flex', flexDirection: 'column', gap: '10px' },
  kart:       { background: '#fff', border: '1px solid #e8e8e8', borderRadius: '10px', padding: '1rem 1.25rem', cursor: 'pointer' },
  kartSecili: { border: '1px solid #1a7a4a' },
  kartUst:    { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  kartSol:    { flex: 1 },
  tani:       { margin: 0, fontWeight: '500', fontSize: '1rem' },
  alt:        { margin: '4px 0 0', fontSize: '0.83rem', color: '#888' },
  badge:      { padding: '3px 10px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: '500', whiteSpace: 'nowrap' },
  detay:      { marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #f0f0f0' },
  pdfBtn:     { padding: '5px 14px', background: '#1a7a4a', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: '500' },
  detayRow:   { display: 'flex', gap: '12px', padding: '4px 0', fontSize: '0.9rem' },
  detiket:    { color: '#888', minWidth: '140px' },
  adimlar:      { marginTop: '10px' },
  adimlarBaslik:{ fontSize: '0.82rem', color: '#888', fontWeight: '600', marginBottom: '6px' },
  adimKart:   { border: '1px solid #eee', borderRadius: '8px', padding: '8px 12px', marginBottom: '6px' },
  adimUst:    { display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '2px' },
  adimTip:    { fontSize: '0.85rem', fontWeight: '500', color: '#1a7a4a' },
  adimTarih:  { fontSize: '0.8rem', color: '#aaa' },
  tamam:      { color: '#1a7a4a', fontSize: '0.85rem' },
  adimTanim:  { margin: '2px 0', fontSize: '0.85rem', color: '#555' },
  kalem:      { margin: '2px 0 0 8px', fontSize: '0.82rem', color: '#888' },
}
