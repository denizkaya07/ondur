import { useEffect, useState } from 'react'
import api from '../../services/api'
import useBreakpoint from '../../hooks/useBreakpoint'

const DEMO = s => (s || '').replace(/\[DEMO\]\s*/gi, '').trim()

export default function Musterilerim() {
  const { isMobile } = useBreakpoint()
  const [musteriler, setMusteriler] = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [hata, setHata]             = useState('')
  const [acik, setAcik]             = useState(null) // acik ciftci_id
  const [ara, setAra]               = useState('')
  const [tab, setTab]               = useState('ilac') // 'ilac' | 'gubre'

  useEffect(() => {
    api.get('/katalog/bayii/musterilerim/')
      .then(res => setMusteriler(res.data))
      .catch(err => {
        if (err.response?.status === 403) setHata('Bu sayfaya erişim için bayii profiliniz gerekli.')
        else setHata('Veriler yüklenemedi.')
      })
      .finally(() => setYukleniyor(false))
  }, [])

  if (yukleniyor) return <div style={s.yuklenme}>Yükleniyor...</div>
  if (hata)       return <div style={{ ...s.kapsayici, padding: '2rem' }}><p style={{ color: '#e53e3e' }}>{hata}</p></div>

  const filtreli = musteriler.filter(m =>
    DEMO(m.ciftci_ad + ' ' + m.ciftci_soyad).toLowerCase().includes(ara.toLowerCase()) ||
    (m.ilce || '').toLowerCase().includes(ara.toLowerCase())
  )

  return (
    <div style={{ ...s.kapsayici, padding: isMobile ? '1rem' : '2rem' }}>
      <h2 style={s.baslik}>Müşterilerim</h2>

      {musteriler.length === 0 ? (
        <div style={s.bos}>
          <p style={s.bosBaslik}>Henüz müşteri yok</p>
          <p style={s.bosAlt}>Çiftçiler bayii seçme talebi gönderdiğinde burada görünür.</p>
        </div>
      ) : (
        <>
          <div style={s.ozet}>
            <div style={s.ozetKart}><p style={s.ozetSayi}>{musteriler.length}</p><p style={s.ozetEtiket}>Müşteri</p></div>
            <div style={s.ozetKart}>
              <p style={s.ozetSayi}>{new Set(musteriler.flatMap(m => m.kalemler.filter(k => k.ilac_ad).map(k => k.ilac_ad))).size}</p>
              <p style={s.ozetEtiket}>Farklı İlaç</p>
            </div>
            <div style={s.ozetKart}>
              <p style={s.ozetSayi}>{new Set(musteriler.flatMap(m => m.kalemler.filter(k => k.gubre_ad).map(k => k.gubre_ad))).size}</p>
              <p style={s.ozetEtiket}>Farklı Gübre</p>
            </div>
          </div>

          <input
            placeholder="Müşteri adı veya ilçe ara..."
            value={ara}
            onChange={e => setAra(e.target.value)}
            style={s.araInput}
          />

          <div style={s.liste}>
            {filtreli.map(m => {
              const isAcik    = acik === m.ciftci_id
              const ilacKalemler  = m.kalemler.filter(k => k.ilac_ad)
              const gubreKalemler = m.kalemler.filter(k => k.gubre_ad)
              const aktifKalemler = tab === 'ilac' ? ilacKalemler : gubreKalemler

              return (
                <div key={m.ciftci_id} style={s.kart}>
                  <div
                    style={s.kartBaslik}
                    onClick={() => setAcik(isAcik ? null : m.ciftci_id)}
                  >
                    <div style={s.kartSol}>
                      <span style={s.avatarKucuk}>
                        {DEMO(m.ciftci_ad)[0]}{DEMO(m.ciftci_soyad)[0]}
                      </span>
                      <div>
                        <p style={s.musteriAd}>{DEMO(m.ciftci_ad)} {DEMO(m.ciftci_soyad)}</p>
                        <p style={s.musteriAlt}>
                          {m.mahalle ? `${m.mahalle}, ` : ''}{m.ilce}
                          {m.telefon && ` · ${m.telefon}`}
                        </p>
                      </div>
                    </div>
                    <div style={s.kartSag}>
                      <span style={s.kalemSayi}>{ilacKalemler.length} ilaç · {gubreKalemler.length} gübre</span>
                      <span style={s.chevron}>{isAcik ? '▲' : '▼'}</span>
                    </div>
                  </div>

                  {isAcik && (
                    <div style={s.kalemler}>
                      <div style={s.tabBar}>
                        <button style={{...s.tabBtn, ...(tab === 'ilac' ? s.tabAktif : {})}} onClick={() => setTab('ilac')}>
                          İlaçlar ({ilacKalemler.length})
                        </button>
                        <button style={{...s.tabBtn, ...(tab === 'gubre' ? s.tabAktif : {})}} onClick={() => setTab('gubre')}>
                          Gübreler ({gubreKalemler.length})
                        </button>
                      </div>

                      {aktifKalemler.length === 0 ? (
                        <p style={s.bos2}>Bu kategoride reçete kalemi yok.</p>
                      ) : (
                        <div style={s.tabloKutu}>
                          <div style={s.tabloBaslik}>
                            <span style={{flex:3}}>Ürün</span>
                            <span style={{flex:2}}>İşletme</span>
                            <span style={{flex:1, textAlign:'right'}}>Doz/da</span>
                            <span style={{flex:1, textAlign:'right'}}>Tarih</span>
                          </div>
                          {aktifKalemler.map((k, i) => (
                            <div key={i} style={{...s.tabloSatir, background: i%2===1?'#fafafa':'#fff'}}>
                              <div style={{flex:3}}>
                                <p style={s.urunAd}>{k.ilac_ad || k.gubre_ad}</p>
                                <p style={s.urunAlt}>{k.ilac_form || k.gubre_tur}</p>
                              </div>
                              <span style={{flex:2, fontSize:'0.82rem', color:'#555'}}>{DEMO(k.isletme_ad)}</span>
                              <span style={{flex:1, fontSize:'0.82rem', textAlign:'right'}}>{k.doz_dekar} {k.birim}</span>
                              <span style={{flex:1, fontSize:'0.78rem', color:'#aaa', textAlign:'right'}}>
                                {k.recete_tarih ? new Date(k.recete_tarih).toLocaleDateString('tr-TR', {day:'numeric',month:'short'}) : ''}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
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
  kapsayici:   { maxWidth: '860px', margin: '0 auto' },
  baslik:      { fontSize: '1.5rem', fontWeight: '500', color: '#1a7a4a', marginBottom: '1.25rem' },
  yuklenme:    { padding: '3rem', textAlign: 'center', color: '#888' },
  bos:         { padding: '3rem', textAlign: 'center', background: '#f9f9f9', borderRadius: '10px' },
  bosBaslik:   { fontSize: '1rem', fontWeight: '500', color: '#555', margin: '0 0 6px' },
  bosAlt:      { fontSize: '0.85rem', color: '#aaa', margin: 0 },
  ozet:        { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '1.25rem' },
  ozetKart:    { background: '#fff', border: '1px solid #e8e8e8', borderRadius: '10px', padding: '1rem', textAlign: 'center' },
  ozetSayi:    { fontSize: '1.8rem', fontWeight: '700', color: '#1a7a4a', margin: '0 0 2px' },
  ozetEtiket:  { fontSize: '0.78rem', color: '#888', margin: 0 },
  araInput:    { display: 'block', width: '100%', marginBottom: '1rem', padding: '9px 14px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' },
  liste:       { display: 'flex', flexDirection: 'column', gap: '10px' },
  kart:        { background: '#fff', border: '1px solid #e8e8e8', borderRadius: '12px', overflow: 'hidden' },
  kartBaslik:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.1rem', cursor: 'pointer' },
  kartSol:     { display: 'flex', gap: '12px', alignItems: 'center' },
  kartSag:     { display: 'flex', alignItems: 'center', gap: '10px' },
  avatarKucuk: { width: '38px', height: '38px', borderRadius: '50%', background: '#e8f5ee', color: '#1a7a4a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: '700', flexShrink: 0 },
  musteriAd:   { margin: '0 0 2px', fontWeight: '600', fontSize: '0.95rem' },
  musteriAlt:  { margin: 0, fontSize: '0.8rem', color: '#888' },
  kalemSayi:   { fontSize: '0.78rem', color: '#aaa' },
  chevron:     { fontSize: '0.7rem', color: '#bbb' },
  kalemler:    { borderTop: '1px solid #f0f0f0', padding: '0 1.1rem 1rem' },
  tabBar:      { display: 'flex', gap: '4px', borderBottom: '2px solid #eee', margin: '0.75rem 0' },
  tabBtn:      { padding: '6px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', color: '#888', borderBottom: '2px solid transparent', marginBottom: '-2px' },
  tabAktif:    { color: '#1a7a4a', fontWeight: '600', borderBottomColor: '#1a7a4a' },
  bos2:        { color: '#aaa', fontSize: '0.85rem', padding: '1rem 0' },
  tabloKutu:   { border: '1px solid #f0f0f0', borderRadius: '8px', overflow: 'hidden' },
  tabloBaslik: { display: 'flex', padding: '8px 12px', background: '#f8f8f8', fontSize: '0.72rem', color: '#aaa', fontWeight: '600', textTransform: 'uppercase' },
  tabloSatir:  { display: 'flex', padding: '9px 12px', alignItems: 'center', borderTop: '1px solid #f5f5f5' },
  urunAd:      { margin: 0, fontWeight: '500', fontSize: '0.85rem' },
  urunAlt:     { margin: '1px 0 0', fontSize: '0.72rem', color: '#aaa' },
}
