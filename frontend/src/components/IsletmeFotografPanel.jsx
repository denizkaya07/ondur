/* eslint react/prop-types: 0 */
import { useState, useEffect, useRef } from 'react'
import api from '../services/api'

function AiSonucModal({ sonuc, onKapat }) {
  if (!sonuc) return null
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:10001, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
      onClick={onKapat}>
      <div style={{ background:'#fff', borderRadius:12, padding:20, maxWidth:400, width:'100%', boxShadow:'0 20px 60px rgba(0,0,0,0.2)', maxHeight:'80vh', overflowY:'auto' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
          <span style={{ fontWeight:700, fontSize:15, color:'#1e1b4b' }}>🔍 AI Fotoğraf Analizi</span>
          <button style={{ background:'none', border:'none', fontSize:18, cursor:'pointer', color:'#6b7280' }} onClick={onKapat}>✕</button>
        </div>
        {sonuc.tani && (
          <div style={{ marginBottom:10 }}>
            <div style={{ fontSize:11, fontWeight:700, color:'#6b7280', textTransform:'uppercase', marginBottom:4 }}>Tanı</div>
            <div style={{ fontSize:14, color:'#1f2937', lineHeight:1.5 }}>{sonuc.tani}</div>
          </div>
        )}
        {sonuc.muhendis_notu && (
          <div style={{ marginBottom:10 }}>
            <div style={{ fontSize:11, fontWeight:700, color:'#6b7280', textTransform:'uppercase', marginBottom:4 }}>Mühendis Notu</div>
            <div style={{ fontSize:13, color:'#374151', lineHeight:1.5 }}>{sonuc.muhendis_notu}</div>
          </div>
        )}
        {sonuc.onerilen_ilaclar?.length > 0 && (
          <div>
            <div style={{ fontSize:11, fontWeight:700, color:'#6b7280', textTransform:'uppercase', marginBottom:6 }}>Önerilen İlaçlar</div>
            {sonuc.onerilen_ilaclar.map((il, i) => (
              <div key={i} style={{ background:'#f5f3ff', borderRadius:8, padding:'8px 12px', marginBottom:6 }}>
                <div style={{ fontWeight:700, fontSize:13, color:'#1f2937' }}>{il.ticari_ad}</div>
                <div style={{ fontSize:12, color:'#4f46e5', fontWeight:600 }}>{il.doz} {il.doz_birimi}</div>
                <div style={{ fontSize:12, color:'#6b7280' }}>{il.gerekce}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const DJANGO_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api')
  .replace(/\/api.*$/, '')
const mediaUrl = (path) => {
  if (!path) return ''
  // Absolute URL geliyorsa path kısmını al (host yanlış olabilir)
  if (path.startsWith('http')) {
    try { path = new URL(path).pathname } catch { return path }
  }
  if (!path.startsWith('/')) path = `/media/${path}`
  return `${DJANGO_BASE}${path}`
}

export default function IsletmeFotografPanel({ isletmeId, canUpload = true, onKapat }) {
  const [fotograflar, setFotograflar] = useState(null)
  const [buyuk, setBuyuk]             = useState(null)
  const [yukluyor, setYukluyor]       = useState(false)
  const [aiYukleniyor, setAiYukleniyor] = useState(null) // foto id
  const [aiSonuc, setAiSonuc]           = useState(null)
  const inputRef   = useRef()
  const kameraRef  = useRef()

  const aiAnaliz = async (f, e) => {
    e.stopPropagation()
    setAiYukleniyor(f.id)
    try {
      const url = mediaUrl(f.fotograf)
      const res = await api.post('/ai/fotograf-teshis-url/', { url, isletme_id: isletmeId })
      setAiSonuc(res.data)
    } catch {
      alert('AI analizi başarısız oldu.')
    } finally {
      setAiYukleniyor(null)
    }
  }

  useEffect(() => {
    api.get(`/ciftci/isletme/${isletmeId}/fotograflar/`)
      .then(r => setFotograflar(r.data))
      .catch(() => setFotograflar([]))
  }, [isletmeId])

  const yukle = async (e) => {
    const dosyalar = Array.from(e.target.files)
    if (!dosyalar.length) return
    setYukluyor(true)
    for (const dosya of dosyalar) {
      const fd = new FormData()
      fd.append('fotograf', dosya)
      try {
        const res = await api.post(`/ciftci/isletme/${isletmeId}/fotograflar/`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
        setFotograflar(prev => [res.data, ...prev])
      } catch { /* devam */ }
    }
    setYukluyor(false)
    e.target.value = ''
  }

  const sil = async (id) => {
    if (!window.confirm('Bu fotoğraf silinsin mi?')) return
    await api.delete(`/ciftci/isletme/${isletmeId}/fotograflar/${id}/`)
    setFotograflar(prev => prev.filter(f => f.id !== id))
    if (buyuk?.id === id) setBuyuk(null)
  }

  return (
    <div style={s.panel} onClick={e => e.stopPropagation()}>
      <AiSonucModal sonuc={aiSonuc} onKapat={() => setAiSonuc(null)} />

      {/* Lightbox — panel içinde fixed, tüm ekranı kaplar */}
      {buyuk && (
        <div
          style={s.lightbox}
          onClick={() => setBuyuk(null)}
        >
          <img
            src={mediaUrl(buyuk.fotograf)}
            alt={mediaUrl(buyuk.fotograf)}
            style={s.lightboxImg}
            onClick={e => e.stopPropagation()}
            onError={e => { e.target.style.background = 'white'; e.target.style.color = 'red'; e.target.style.padding = '20px'; e.target.style.minWidth = '200px'; e.target.style.minHeight = '50px' }}
          />
          <button style={s.lightboxKapat} onClick={() => setBuyuk(null)}>✕</button>
        </div>
      )}

      <div style={s.ust}>
        <span style={s.baslik}>📷 Fotoğraflar {fotograflar ? `(${fotograflar.length})` : ''}</span>
        <div style={{ display: 'flex', gap: '8px' }}>
          {canUpload && (
            <>
              <button style={s.yukleBtn} onClick={() => inputRef.current.click()} disabled={yukluyor}>
                {yukluyor ? 'Yükleniyor…' : '+ Fotoğraf Ekle'}
              </button>
              <button style={s.kameraBtn} onClick={() => kameraRef.current.click()} disabled={yukluyor}>
                📷 Çek
              </button>
              <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/gif" multiple style={{ display: 'none' }} onChange={yukle} />
              <input ref={kameraRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={yukle} />
            </>
          )}
          <button style={s.kapatBtn} onClick={onKapat}>✕</button>
        </div>
      </div>

      {fotograflar === null ? (
        <p style={s.bilgi}>Yükleniyor…</p>
      ) : fotograflar.length === 0 ? (
        <p style={s.bilgi}>Henüz fotoğraf eklenmemiş.</p>
      ) : (
        <div style={s.grid}>
          {fotograflar.map(f => (
            <div key={f.id} style={s.thumb} onClick={() => setBuyuk(f)}>
              <img
                src={mediaUrl(f.fotograf)}
                alt={f.aciklama || ''}
                style={s.img}
              />
              <div style={s.thumbAlt}>
                <span style={s.yukleyenAd}>{f.yukleyen_rol === 'muhendis' ? '👷' : '👨‍🌾'} {f.yukleyen_ad}</span>
                <div style={{ display:'flex', gap:2 }}>
                  <button
                    style={s.aiBtn}
                    onClick={e => aiAnaliz(f, e)}
                    disabled={aiYukleniyor === f.id}
                    title="AI ile analiz et"
                  >
                    {aiYukleniyor === f.id ? '⏳' : '🔍'}
                  </button>
                  {canUpload && (
                    <button style={s.silBtn} onClick={e => { e.stopPropagation(); sil(f.id) }}>✕</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const s = {
  panel:        { position: 'relative', background: '#f8fdf9', border: '1px solid #d0eada', borderRadius: '10px', padding: '12px 14px', marginTop: '8px' },
  ust:          { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' },
  baslik:       { fontWeight: '600', fontSize: '0.88rem', color: '#1a7a4a' },
  yukleBtn:     { padding: '5px 12px', background: '#1a7a4a', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' },
  kameraBtn:    { padding: '5px 12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' },
  kapatBtn:     { background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', fontSize: '1rem' },
  bilgi:        { color: '#aaa', fontSize: '0.85rem', margin: 0 },
  grid:         { display: 'flex', flexWrap: 'nowrap', gap: '8px', overflowX: 'auto', paddingBottom: '4px' },
  thumb:        { width: '90px', background: '#fff', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e0ede6', cursor: 'pointer', flexShrink: 0 },
  img:          { width: '90px', height: '70px', objectFit: 'cover', display: 'block', pointerEvents: 'none' },
  thumbAlt:     { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 5px' },
  yukleyenAd:   { fontSize: '0.68rem', color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60px' },
  silBtn:       { background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', fontSize: '0.75rem', padding: 0, flexShrink: 0 },
  aiBtn:        { background: '#ede9fe', border: 'none', cursor: 'pointer', fontSize: '1rem', padding: '4px 6px', borderRadius: '6px', flexShrink: 0 },
  lightbox:     { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 },
  lightboxImg:  { maxWidth: '92vw', maxHeight: '88vh', borderRadius: '8px', objectFit: 'contain' },
  lightboxKapat:{ position: 'fixed', top: '16px', right: '20px', background: 'none', border: 'none', color: '#fff', fontSize: '2rem', cursor: 'pointer', zIndex: 10000 },
}
