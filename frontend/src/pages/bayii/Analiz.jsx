import { useEffect, useState } from 'react'
import api from '../../services/api'
import useBreakpoint from '../../hooks/useBreakpoint'

export default function Analiz() {
  const { isMobile } = useBreakpoint()
  const [veri, setVeri]           = useState(null)
  const [yukleniyor, setYukleniyor] = useState(true)
  const [hata, setHata]           = useState('')
  const [tab, setTab]             = useState('ilac')

  useEffect(() => {
    api.get('/katalog/bayii/analiz/')
      .then(res => setVeri(res.data))
      .catch(err => {
        if (err.response?.status === 403) {
          setHata('Bu sayfaya erişim için bayii profiliniz gerekli.')
        } else {
          setHata('Veriler yüklenemedi.')
        }
      })
      .finally(() => setYukleniyor(false))
  }, [])

  if (yukleniyor) return <div style={s.yuklenme}>Yükleniyor...</div>

  if (hata) return (
    <div style={s.kapsayici}>
      <h2 style={s.baslik}>Analiz</h2>
      <div style={s.bos}>{hata}</div>
    </div>
  )

  const ilaclar  = veri?.ilaclar  || []
  const gubreler = veri?.gubreler || []
  const liste    = tab === 'ilac' ? ilaclar : gubreler

  const toplamRecete = new Set([
    ...ilaclar.map(x => x.recete_sayisi),
    ...gubreler.map(x => x.recete_sayisi),
  ]).size

  return (
    <div style={{ ...s.kapsayici, padding: isMobile ? '1rem' : '2rem' }}>
      <h2 style={s.baslik}>Analiz</h2>

      <div style={{ ...s.kartlar, gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)' }}>
        <div style={s.ozetKart}>
          <p style={s.ozetSayi}>{ilaclar.length + gubreler.length}</p>
          <p style={s.ozetEtiket}>Ürün Kullanımı</p>
        </div>
        <div style={s.ozetKart}>
          <p style={s.ozetSayi}>{ilaclar.reduce((a, x) => a + x.isletme_sayisi, 0)}</p>
          <p style={s.ozetEtiket}>İşletme</p>
        </div>
        <div style={s.ozetKart}>
          <p style={s.ozetSayi}>{ilaclar.reduce((a, x) => a + x.recete_sayisi, 0)}</p>
          <p style={s.ozetEtiket}>Reçete</p>
        </div>
      </div>

      <div style={s.tabBar}>
        <button
          style={{...s.tabBtn, ...(tab === 'ilac' ? s.tabAktif : {})}}
          onClick={() => setTab('ilac')}
        >
          İlaçlar ({ilaclar.length})
        </button>
        <button
          style={{...s.tabBtn, ...(tab === 'gubre' ? s.tabAktif : {})}}
          onClick={() => setTab('gubre')}
        >
          Gübreler ({gubreler.length})
        </button>
      </div>

      {liste.length === 0 ? (
        <div style={s.bos}>
          Bölgenizde onaylı reçetelerde henüz {tab === 'ilac' ? 'ilaç' : 'gübre'} kullanım verisi yok.
        </div>
      ) : (
        <div style={{ ...s.tablo, overflowX: 'auto' }}>
          <div style={s.tabloBaslik}>
            <span style={{flex: 3}}>Ürün</span>
            <span style={{flex: 1, textAlign: 'right'}}>İşletme</span>
            <span style={{flex: 1, textAlign: 'right'}}>Reçete</span>
            <span style={{flex: 2, textAlign: 'right'}}>Toplam Miktar</span>
          </div>
          {liste.map((x, i) => (
            <div key={i} style={{...s.tabloSatir, ...(i % 2 === 1 ? s.tabloSatirTek : {})}}>
              <div style={{flex: 3}}>
                <p style={s.urunAd}>
                  {tab === 'ilac' ? x.ilac__ticari_ad : x.gubre__ticari_ad}
                </p>
                <p style={s.urunAlt}>
                  {tab === 'ilac' ? x.ilac__formulasyon : x.gubre__tur}
                  {' · '}{tab === 'ilac' ? x.ilac__uretici__firma_adi : x.gubre__uretici__firma_adi}
                </p>
              </div>
              <span style={{flex: 1, textAlign: 'right', fontSize: '0.9rem'}}>{x.isletme_sayisi}</span>
              <span style={{flex: 1, textAlign: 'right', fontSize: '0.9rem'}}>{x.recete_sayisi}</span>
              <span style={{flex: 2, textAlign: 'right', fontSize: '0.9rem', fontWeight: '500'}}>
                {Number(x.toplam_miktar).toFixed(1)} {x.birim}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const s = {
  kapsayici: { padding: '2rem', maxWidth: '860px', margin: '0 auto' },
  baslik:    { fontSize: '1.5rem', fontWeight: '500', marginBottom: '1.5rem', color: '#1a7a4a' },
  yuklenme:  { padding: '2rem', textAlign: 'center', color: '#888' },
  bos:       { padding: '3rem', textAlign: 'center', color: '#aaa', background: '#f9f9f9', borderRadius: '10px' },
  kartlar:   { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '1.5rem' },
  ozetKart:  { background: '#fff', border: '1px solid #e8e8e8', borderRadius: '10px', padding: '1.25rem', textAlign: 'center' },
  ozetSayi:  { fontSize: '2rem', fontWeight: '700', color: '#1a7a4a', margin: '0 0 4px' },
  ozetEtiket:{ fontSize: '0.82rem', color: '#888', margin: 0 },
  tabBar:    { display: 'flex', gap: '4px', borderBottom: '2px solid #eee', marginBottom: '1rem' },
  tabBtn:    { padding: '8px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem', color: '#888', borderBottom: '2px solid transparent', marginBottom: '-2px' },
  tabAktif:  { color: '#1a7a4a', fontWeight: '600', borderBottomColor: '#1a7a4a' },
  tablo:        { background: '#fff', border: '1px solid #e8e8e8', borderRadius: '10px', overflow: 'hidden' },
  tabloBaslik:  { display: 'flex', padding: '10px 16px', background: '#f8f8f8', fontSize: '0.78rem', color: '#aaa', fontWeight: '600', textTransform: 'uppercase' },
  tabloSatir:   { display: 'flex', padding: '12px 16px', alignItems: 'center', borderTop: '1px solid #f5f5f5' },
  tabloSatirTek:{ background: '#fafafa' },
  urunAd:    { margin: 0, fontWeight: '500', fontSize: '0.9rem' },
  urunAlt:   { margin: '2px 0 0', fontSize: '0.78rem', color: '#aaa' },
}
