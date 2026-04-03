import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'

const URUN_EMOJI = {
  domates: '🍅', cherry: '🍒', biber: '🫑', patlican: '🍆',
  salatalik: '🥒', kavun: '🍈', karpuz: '🍉', çilek: '🍓',
  uzum: '🍇', elma: '🍎', nar: '🍎', zeytin: '🫒',
  buğday: '🌾', arpa: '🌾', mısır: '🌽', ayçiçek: '🌻',
  pamuk: '🌱', patates: '🥔', soğan: '🧅', sarımsak: '🧄',
  fasulye: '🫘', nohut: '🫘', mercimek: '🫘',
}

function urunEmoji(urunAd, cesitAd) {
  const metin = `${cesitAd || ''} ${urunAd || ''}`.toLowerCase()
  if (metin.includes('cherry') || metin.includes('kiraz')) return '🍒'
  for (const [key, emoji] of Object.entries(URUN_EMOJI)) {
    if (metin.includes(key)) return emoji
  }
  return '🌿'
}

const DURUM_RENK = {
  taslak:    { bg: '#fff8e1', color: '#b7791f' },
  onaylandi: { bg: '#e8f5ee', color: '#1a7a4a' },
  iptal:     { bg: '#fff0f0', color: '#c53030' },
}

export default function Danisanlar() {
  const navigate = useNavigate()
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
  const [gecmisIsletme, setGecmisIsletme] = useState(null)   // açık geçmiş paneli
  const [gecmisReceteler, setGecmisReceteler] = useState({}) // { isletme_id: [...] }

  useEffect(() => {
    api.get('/ciftci/danisanlarim/')
      .then(res => setDanisanlar(res.data))
      .catch(err => console.error(err))
      .finally(() => setYukleniyor(false))
  }, [])

  // Danışanları çiftçiye göre grupla
  const gruplar = useMemo(() => {
    const map = {}
    danisanlar.forEach(d => {
      const key = d.ciftci_ad || d.isletme?.id
      if (!map[key]) {
        map[key] = { ciftci_ad: d.ciftci_ad, ciftci_ilce: d.ciftci_ilce, isletmeler: [] }
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
      g.ciftci_ilce?.toLowerCase().includes(q) ||
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

  if (yukleniyor) return <div style={s.yuklenme}>Yükleniyor...</div>

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
                  <p style={s.isletmeBaslik}>İşletme seç:</p>
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
                    <div style={s.avatar}>{g.ciftci_ad?.[0] || '—'}</div>
                    <div style={s.kartMeta}>
                      <p style={s.isim}>{g.ciftci_ad}</p>
                      <p style={s.ilce}>{g.ciftci_ilce} · {g.isletmeler.length} işletme</p>
                    </div>
                    <span style={s.ok}>{acik ? '▲' : '▼'}</span>
                  </div>

                  {/* İşletme Listesi */}
                  {acik && (
                    <div style={s.isletmeListe}>
                      {g.isletmeler.map(isl => isl && (
                        <div
                          key={isl.id}
                          style={s.isletmeKart}
                          onClick={() => navigate(`/muhendis/recete/yaz?isletme=${isl.id}`)}
                        >
                          <div style={s.isletmeEmoji}>
                            {urunEmoji(isl.urun_ad, isl.cesit_ad)}
                          </div>
                          <div style={s.isletmeKartSol}>
                            <p style={s.isletmeAd}>{isl.ad}</p>
                            <p style={s.isletmeBilgi2}>{g.ciftci_ad} · {g.ciftci_ilce}</p>
                            <p style={s.isletmeBilgi2}>
                              {isl.cesit_ad || isl.urun_ad || '—'}
                              {isl.alan_dekar ? ` · ${isl.alan_dekar} da` : ''}
                            </p>
                          </div>
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
  kartMeta: { flex: 1 },
  isim:     { margin: 0, fontWeight: '500', fontSize: '1rem' },
  ilce:     { margin: '2px 0 0', fontSize: '0.82rem', color: '#888' },
  ok:       { fontSize: '0.75rem', color: '#aaa' },

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
  isletmeAd:     { margin: 0, fontWeight: '500', fontSize: '0.95rem' },
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
  isletmeBaslik: { fontSize: '0.85rem', color: '#888', marginBottom: '6px', marginTop: 0 },
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
