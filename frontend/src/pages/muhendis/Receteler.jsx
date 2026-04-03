import { useEffect, useState } from 'react'
import api from '../../services/api'

const DURUM_RENK = {
  taslak:    { bg: '#fff8e1', color: '#b7791f' },
  onaylandi: { bg: '#e8f5ee', color: '#1a7a4a' },
  iptal:     { bg: '#fff0f0', color: '#c53030' },
}

const DURUM_ETIKET = {
  taslak:    'Taslak',
  onaylandi: 'Onaylandı',
  iptal:     'İptal',
}

export default function Receteler() {
  const [receteler, setReceteler]   = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [secili, setSecili]         = useState(null)

  useEffect(() => {
    api.get('/recete/')
      .then(res => setReceteler(res.data))
      .catch(err => console.error(err))
      .finally(() => setYukleniyor(false))
  }, [])

  const onayla = async (e, id) => {
    e.stopPropagation()
    await api.patch(`/recete/${id}/`, { durum: 'onaylandi' })
    setReceteler(prev => prev.map(r => r.id === id ? { ...r, durum: 'onaylandi' } : r))
    setSecili(prev => prev?.id === id ? { ...prev, durum: 'onaylandi' } : prev)
  }

  if (yukleniyor) return <div style={s.yuklenme}>Yükleniyor...</div>

  return (
    <div style={s.kapsayici}>
      <div style={s.ustBar}>
        <h2 style={s.baslik}>Reçeteler</h2>
      </div>

      {receteler.length === 0 ? (
        <div style={s.bos}>Henüz reçete yazılmamış.</div>
      ) : (
        <div style={s.liste}>
          {receteler.map(r => (
            <div
              key={r.id}
              style={{...s.kart, ...(secili?.id === r.id ? s.kartSecili : {})}}
              onClick={() => setSecili(secili?.id === r.id ? null : r)}
            >
              <div style={s.kartUst}>
                <div style={s.kartSol}>
                  <p style={s.tani}>{r.tani}</p>
                  <p style={s.alt}>{r.isletme_ad} · {r.ciftci_ad} · {r.tarih}</p>
                </div>
                <div style={s.kartSag}>
                  <span style={{...s.badge, ...DURUM_RENK[r.durum]}}>
                    {DURUM_ETIKET[r.durum]}
                  </span>
                  {r.durum === 'taslak' && (
                    <button style={s.onaylaBtn} onClick={e => onayla(e, r.id)}>
                      ✓ Onayla
                    </button>
                  )}
                </div>
              </div>

              {secili?.id === r.id && (
                <div style={s.detay}>
                  <div style={s.detayRow}>
                    <span style={s.detayEtiket}>Mühendis</span>
                    <span>{r.muhendis_ad}</span>
                  </div>
                  <div style={s.detayRow}>
                    <span style={s.detayEtiket}>Uygulama Yöntemi</span>
                    <span>{r.uygulama_yontemi}</span>
                  </div>
                  <div style={s.detayRow}>
                    <span style={s.detayEtiket}>Oluşturma</span>
                    <span>{new Date(r.olusturma).toLocaleDateString('tr-TR')}</span>
                  </div>
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
  kapsayici: { padding: '2rem', maxWidth: '860px', margin: '0 auto' },
  ustBar:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' },
  baslik:    { fontSize: '1.5rem', fontWeight: '500', margin: 0, color: '#1a7a4a' },
  yuklenme:  { padding: '2rem', textAlign: 'center', color: '#888' },
  bos:       { padding: '3rem', textAlign: 'center', color: '#aaa', background: '#f9f9f9', borderRadius: '10px' },
  liste:     { display: 'flex', flexDirection: 'column', gap: '10px' },
  kart:       { background: '#fff', border: '1px solid #e8e8e8', borderRadius: '10px', padding: '1rem 1.25rem', cursor: 'pointer' },
  kartSecili: { border: '1px solid #1a7a4a' },
  kartUst:    { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' },
  kartSol:    { flex: 1 },
  kartSag:    { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0 },
  tani:       { margin: 0, fontWeight: '500', fontSize: '1rem' },
  alt:        { margin: '4px 0 0', fontSize: '0.83rem', color: '#888' },
  badge:      { padding: '3px 10px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: '500', whiteSpace: 'nowrap' },
  onaylaBtn:  { padding: '4px 12px', background: '#1a7a4a', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '500' },
  detay:       { marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #f0f0f0' },
  detayRow:    { display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '0.9rem' },
  detayEtiket: { color: '#888' },
}
