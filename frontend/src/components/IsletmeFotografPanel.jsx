/* eslint react/prop-types: 0 */
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import api from '../services/api'

// fotograf_url backend'den tam URL olarak geliyor, BASE artık gerekmiyor

export default function IsletmeFotografPanel({ isletmeId, canUpload = true, onKapat }) {
  const [fotograflar, setFotograflar] = useState(null)   // null = yükleniyor
  const [buyuk, setBuyuk]             = useState(null)   // lightbox
  const [yukluyor, setYukluyor]       = useState(false)
  const inputRef   = useRef()
  const kameraRef  = useRef()

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
            <div key={f.id} style={s.thumb}>
              <img
                src={f.fotograf?.replace('http://', 'https://')}
                alt={f.aciklama || ''}
                style={s.img}
                onClick={() => setBuyuk(f)}
              />
              <div style={s.thumbAlt}>
                <span style={s.yukleyenAd}>{f.yukleyen_rol === 'muhendis' ? '👷' : '👨‍🌾'} {f.yukleyen_ad}</span>
                {canUpload && (
                  <button style={s.silBtn} onClick={() => sil(f.id)}>✕</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox — body'e portal ile render edilir, z-index sorununu önler */}
      {buyuk && createPortal(
        <div style={s.lightbox} onClick={() => setBuyuk(null)}>
          <img src={buyuk.fotograf?.replace('http://', 'https://')} alt="" style={s.lightboxImg} onClick={e => e.stopPropagation()} />
          <button style={s.lightboxKapat} onClick={() => setBuyuk(null)}>✕</button>
        </div>,
        document.body
      )}
    </div>
  )
}

const s = {
  panel:   { background: '#f8fdf9', border: '1px solid #d0eada', borderRadius: '10px', padding: '12px 14px', marginTop: '8px' },
  ust:     { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' },
  baslik:  { fontWeight: '600', fontSize: '0.88rem', color: '#1a7a4a' },
  yukleBtn: { padding: '5px 12px', background: '#1a7a4a', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' },
  kameraBtn:{ padding: '5px 12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' },
  kapatBtn:{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', fontSize: '1rem' },
  bilgi:   { color: '#aaa', fontSize: '0.85rem', margin: 0 },
  grid:    { display: 'flex', flexWrap: 'nowrap', gap: '8px', overflowX: 'auto', paddingBottom: '4px' },
  thumb:   { width: '90px', background: '#fff', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e0ede6', cursor: 'pointer' },
  img:     { width: '90px', height: '70px', objectFit: 'cover', display: 'block' },
  thumbAlt:{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 5px' },
  yukleyenAd: { fontSize: '0.68rem', color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60px' },
  silBtn:  { background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', fontSize: '0.75rem', padding: 0, flexShrink: 0 },
  lightbox:     { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  lightboxImg:  { maxWidth: '90vw', maxHeight: '88vh', borderRadius: '8px', objectFit: 'contain' },
  lightboxKapat:{ position: 'fixed', top: '16px', right: '20px', background: 'none', border: 'none', color: '#fff', fontSize: '1.8rem', cursor: 'pointer', zIndex: 1001 },
}
