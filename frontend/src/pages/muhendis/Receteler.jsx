import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import api from '../../services/api'

const DURUM_RENK = {
  taslak:    { background: '#fff8e1', color: '#b7791f' },
  onaylandi: { background: '#e8f5ee', color: '#1a7a4a' },
  iptal:     { background: '#fff0f0', color: '#c53030' },
}
const DURUM_ETIKET = { taslak: 'Taslak', onaylandi: 'Onaylandı', iptal: 'İptal' }

export default function Receteler() {
  const [receteler, setReceteler]   = useState([])
  const [detaylar, setDetaylar]     = useState({})   // { [id]: ReceteSerializer data }
  const [acik, setAcik]             = useState(null)
  const [yukleniyor, setYukleniyor] = useState(true)
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const isletmeId = searchParams.get('isletme')

  useEffect(() => {
    const url = isletmeId ? `/recete/?isletme=${isletmeId}` : '/recete/'
    api.get(url)
      .then(res => setReceteler(res.data))
      .catch(err => console.error(err))
      .finally(() => setYukleniyor(false))
  }, [isletmeId])

  const toggle = (id) => {
    setAcik(prev => prev === id ? null : id)
    if (!detaylar[id]) {
      api.get(`/recete/${id}/`)
        .then(r => setDetaylar(prev => ({ ...prev, [id]: r.data })))
        .catch(() => setDetaylar(prev => ({ ...prev, [id]: null })))
    }
  }

  const onayla = async (e, id) => {
    e.stopPropagation()
    await api.patch(`/recete/${id}/`, { durum: 'onaylandi' })
    setReceteler(prev => prev.map(r => r.id === id ? { ...r, durum: 'onaylandi' } : r))
    setDetaylar(prev => prev[id] ? { ...prev, [id]: { ...prev[id], durum: 'onaylandi' } } : prev)
  }

  if (yukleniyor) return <div style={s.yuklenme}>Yükleniyor...</div>

  return (
    <div style={s.kapsayici}>
      <div style={s.ustBar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {isletmeId && (
            <button style={s.geriBtn} onClick={() => navigate('/muhendis')}>← Danışanlar</button>
          )}
          <h2 style={s.baslik}>
            {isletmeId && receteler[0] ? `${receteler[0].isletme_ad} — ` : ''}Reçeteler
          </h2>
        </div>
      </div>

      {receteler.length === 0 ? (
        <div style={s.bos}>Henüz reçete yazılmamış.</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={s.tablo}>
            <thead>
              <tr>
                <th style={s.th}>Çiftçi</th>
                <th style={s.th}>İşletme</th>
                <th style={s.th}>Tarih</th>
                <th style={s.th}>Tanı</th>
                <th style={s.th}>Durum</th>
                <th style={s.th}></th>
              </tr>
            </thead>
            <tbody>
              {receteler.map(r => (
                <>
                  {/* Ana reçete satırı */}
                  <tr key={r.id} style={{ ...s.satir, ...(acik === r.id ? s.satirAcik : {}) }}
                    onClick={() => toggle(r.id)}>
                    <td style={s.td}>{r.ciftci_ad} {r.ciftci_soyad || ''}</td>
                    <td style={s.td}>{r.isletme_ad}</td>
                    <td style={{ ...s.td, whiteSpace: 'nowrap' }}>{r.tarih}</td>
                    <td style={s.td}>{r.tani || <span style={{ color: '#ccc' }}>—</span>}</td>
                    <td style={s.td}>
                      <span style={{ ...s.badge, ...DURUM_RENK[r.durum] }}>
                        {DURUM_ETIKET[r.durum]}
                      </span>
                    </td>
                    <td style={{ ...s.td, textAlign: 'right' }}>
                      {r.durum === 'taslak' && (
                        <button style={s.onaylaBtn} onClick={e => onayla(e, r.id)}>✓ Onayla</button>
                      )}
                      <span style={s.okIcon}>{acik === r.id ? '▲' : '▼'}</span>
                    </td>
                  </tr>

                  {/* Ürün satırları */}
                  {acik === r.id && (
                    <tr key={`${r.id}-detay`}>
                      <td colSpan={6} style={s.detayTd}>
                        {!detaylar[r.id] && detaylar[r.id] !== null
                          ? <p style={s.yukleniyor}>Yükleniyor…</p>
                          : detaylar[r.id] === null
                            ? <p style={s.hata}>Yüklenemedi.</p>
                            : <UrunTablosu detay={detaylar[r.id]} />
                        }
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function UrunTablosu({ detay }) {
  const satirlar = []
  for (const adim of detay.adimlar || []) {
    if (adim.notlar?.includes('[kültürel]')) {
      satirlar.push({ tip: 'kulturel', tanim: adim.tanim, tarih: adim.uygulama_tarihi })
    } else if (adim.notlar?.includes('[biyolojik]')) {
      satirlar.push({ tip: 'biyolojik', tanim: adim.tanim, tarih: adim.uygulama_tarihi })
    } else if (adim.notlar?.includes('[takip]')) {
      satirlar.push({ tip: 'takip', tanim: adim.tanim, tarih: adim.uygulama_tarihi })
    } else {
      for (const k of adim.kalemler || []) {
        satirlar.push({
          tip: 'urun',
          suNo: adim.tanim,
          tarih: adim.uygulama_tarihi,
          urun: k.ilac_ad || k.gubre_ad || '—',
          doz: k.doz_dekar,
          birim: k.birim,
          toplam: k.toplam_miktar,
        })
      }
    }
  }

  if (satirlar.length === 0) {
    if (detay.ciftciye_not) return <p style={{ margin: '8px 0', fontSize: '0.85rem', color: '#666' }}>📝 {detay.ciftciye_not}</p>
    return <p style={{ margin: '8px 0', fontSize: '0.85rem', color: '#aaa' }}>Ürün girilmemiş.</p>
  }

  return (
    <div>
      {detay.ciftciye_not && <p style={{ margin: '0 0 8px', fontSize: '0.83rem', color: '#666' }}>📝 {detay.ciftciye_not}</p>}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
        <thead>
          <tr style={{ background: '#f5f5f5' }}>
            <th style={s.ith}>Su / Adım</th>
            <th style={s.ith}>Tarih</th>
            <th style={s.ith}>İlaç / Gübre</th>
            <th style={s.ith}>Doz / da</th>
            <th style={s.ith}>Birim</th>
            <th style={s.ith}>Toplam</th>
          </tr>
        </thead>
        <tbody>
          {satirlar.map((r, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
              {r.tip === 'urun' ? (
                <>
                  <td style={s.itd}>{r.suNo}</td>
                  <td style={{ ...s.itd, whiteSpace: 'nowrap' }}>{r.tarih || '—'}</td>
                  <td style={{ ...s.itd, fontWeight: '500' }}>{r.urun}</td>
                  <td style={s.itd}>{r.doz}</td>
                  <td style={s.itd}>{r.birim}</td>
                  <td style={s.itd}>{r.toplam || '—'}</td>
                </>
              ) : (
                <td colSpan={6} style={{ ...s.itd, color: '#888', fontStyle: 'italic' }}>
                  {r.tip === 'kulturel' ? '🌿' : r.tip === 'biyolojik' ? '🐞' : '📋'} {r.tanim}
                  {r.tarih && ` — ${r.tarih}`}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const s = {
  kapsayici: { padding: '2rem', maxWidth: '980px', margin: '0 auto' },
  ustBar:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' },
  geriBtn:   { background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: '0.9rem', padding: '6px 0' },
  baslik:    { fontSize: '1.5rem', fontWeight: '500', margin: 0, color: '#1a7a4a' },
  yuklenme:  { padding: '2rem', textAlign: 'center', color: '#888' },
  bos:       { padding: '3rem', textAlign: 'center', color: '#aaa', background: '#f9f9f9', borderRadius: '10px' },
  tablo:     { width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: '10px', overflow: 'hidden', border: '1px solid #e8e8e8' },
  th:        { padding: '10px 14px', textAlign: 'left', fontSize: '0.82rem', color: '#888', fontWeight: '600', borderBottom: '1px solid #e8e8e8', background: '#fafafa' },
  satir:     { cursor: 'pointer', borderBottom: '1px solid #f0f0f0', transition: 'background 0.1s' },
  satirAcik: { background: '#f8fdf9' },
  td:        { padding: '10px 14px', fontSize: '0.88rem', verticalAlign: 'middle' },
  badge:     { padding: '2px 9px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '500', whiteSpace: 'nowrap' },
  onaylaBtn: { padding: '3px 10px', background: '#1a7a4a', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.78rem', marginRight: '8px' },
  okIcon:    { fontSize: '0.7rem', color: '#aaa' },
  detayTd:   { padding: '12px 20px 16px 20px', background: '#f8fdf9', borderBottom: '1px solid #e0ede6' },
  yukleniyor:{ margin: 0, fontSize: '0.85rem', color: '#aaa' },
  hata:      { margin: 0, fontSize: '0.85rem', color: '#e53e3e' },
  ith:       { padding: '6px 12px', textAlign: 'left', color: '#888', fontWeight: '600', borderBottom: '1px solid #e8e8e8' },
  itd:       { padding: '6px 12px', verticalAlign: 'middle' },
}
