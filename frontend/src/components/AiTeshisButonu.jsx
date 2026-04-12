/* eslint react/prop-types: 0 */
import { useState, useRef } from 'react'
import api from '../services/api'

export default function AiTeshisButonu({ urunAdi, alanDekar, ciftciId, onUygula }) {
  const [acik, setAcik]             = useState(false)
  const [mod, setMod]               = useState('metin') // 'metin' | 'fotograf'
  const [semptomlar, setSemptomlar] = useState('')
  const [fotograf, setFotograf]     = useState(null)
  const [onizleme, setOnizleme]     = useState(null)
  const [yukleniyor, setYukleniyor] = useState(false)
  const [sonuc, setSonuc]           = useState(null)
  const [hata, setHata]             = useState('')
  const dosyaRef = useRef()

  function kapat() {
    setAcik(false); setSonuc(null); setSemptomlar('')
    setFotograf(null); setOnizleme(null); setHata('')
  }

  function fotografSec(e) {
    const dosya = e.target.files[0]
    if (!dosya) return
    setFotograf(dosya)
    setOnizleme(URL.createObjectURL(dosya))
    setSonuc(null); setHata('')
  }

  async function calistirMetin() {
    if (!semptomlar.trim()) return
    setYukleniyor(true); setHata(''); setSonuc(null)
    try {
      const res = await api.post('/ai/teshis/', {
        semptomlar,
        urun_adi:   urunAdi   || 'Bilinmiyor',
        alan_dekar: alanDekar || 0,
        ciftci_id:  ciftciId  || null,
      })
      setSonuc({ tip: 'metin', ...res.data })
    } catch (e) {
      setHata(e.response?.data?.hata || 'Bir hata oluştu.')
    } finally {
      setYukleniyor(false)
    }
  }

  async function calistirFotograf() {
    if (!fotograf) return
    setYukleniyor(true); setHata(''); setSonuc(null)
    try {
      const form = new FormData()
      form.append('fotograf', fotograf)
      if (ciftciId) form.append('ciftci_id', ciftciId)
      const res = await api.post('/ai/fotograf-teshis/', form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setSonuc({ tip: 'fotograf', tani: res.data.tani, muhendis_notu: res.data.muhendis_notu, onerilen_ilaclar: res.data.onerilen_ilaclar || [] })
    } catch (e) {
      setHata(e.response?.data?.hata || 'Bir hata oluştu.')
    } finally {
      setYukleniyor(false)
    }
  }

  function uygula() {
    if (!sonuc || !onUygula) return
    onUygula({ tani: sonuc.tani, muhendis_notu: sonuc.muhendis_notu, onerilen_ilaclar: sonuc.onerilen_ilaclar })
    kapat()
  }

  return (
    <>
      <button style={s.tetikBtn} onClick={() => setAcik(true)} type="button">
        ✨ AI Teşhis
      </button>

      {acik && (
        <div style={s.overlay} onClick={kapat}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={s.baslik}>
              <span>✨ AI Teşhis Asistanı</span>
              <button style={s.kapatBtn} onClick={kapat}>✕</button>
            </div>

            {/* Mod seçici */}
            <div style={s.modBar}>
              <button
                style={{ ...s.modBtn, ...(mod === 'metin' ? s.modAktif : {}) }}
                onClick={() => { setMod('metin'); setSonuc(null); setHata('') }}
                type="button"
              >
                📝 Belirt
              </button>
              <button
                style={{ ...s.modBtn, ...(mod === 'fotograf' ? s.modAktif : {}) }}
                onClick={() => { setMod('fotograf'); setSonuc(null); setHata('') }}
                type="button"
              >
                📷 Fotoğraf
              </button>
            </div>

            {/* Metin modu */}
            {mod === 'metin' && (
              <>
                <textarea
                  style={s.textarea}
                  placeholder="Örn: Yapraklarda sarı lekeler, alt yüzeyde beyaz toz, sürgünler kuruyor..."
                  value={semptomlar}
                  onChange={e => setSemptomlar(e.target.value)}
                  rows={4}
                  disabled={yukleniyor}
                />
                {urunAdi && (
                  <p style={s.bilgi}>Ürün: <strong>{urunAdi}</strong> — {alanDekar || '?'} da</p>
                )}
              </>
            )}

            {/* Fotoğraf modu */}
            {mod === 'fotograf' && (
              <div style={s.fotografAlani}>
                {onizleme
                  ? <img src={onizleme} alt="önizleme" style={s.onizleme} />
                  : (
                    <div style={s.yukleAlani} onClick={() => dosyaRef.current.click()}>
                      <span style={{ fontSize: 32 }}>📷</span>
                      <span style={{ color: '#6b7280', fontSize: 13 }}>Fotoğraf seç</span>
                    </div>
                  )
                }
                <input
                  ref={dosyaRef} type="file" accept="image/*"
                  style={{ display: 'none' }} onChange={fotografSec}
                />
                {onizleme && (
                  <button
                    style={s.degistirBtn}
                    onClick={() => dosyaRef.current.click()}
                    type="button"
                  >
                    Değiştir
                  </button>
                )}
              </div>
            )}

            {hata && <p style={s.hata}>{hata}</p>}

            {/* Analiz butonu */}
            {!sonuc && (
              <button
                style={{ ...s.analizBtn, opacity: yukleniyor ? 0.6 : 1 }}
                onClick={mod === 'metin' ? calistirMetin : calistirFotograf}
                disabled={yukleniyor || (mod === 'metin' ? !semptomlar.trim() : !fotograf)}
                type="button"
              >
                {yukleniyor ? '⏳ Analiz ediliyor...' : '🔍 Analiz Et'}
              </button>
            )}

            {/* Metin sonucu */}
            {sonuc?.tip === 'metin' && (
              <div style={s.sonuc}>
                <div style={s.sonucBaslik}>Teşhis Sonucu</div>
                <div style={s.blok}>
                  <div style={s.etiket}>Tanı</div>
                  <div style={s.deger}>{sonuc.tani}</div>
                </div>
                {sonuc.muhendis_notu && (
                  <div style={s.blok}>
                    <div style={s.etiket}>Mühendis Notu</div>
                    <div style={s.deger}>{sonuc.muhendis_notu}</div>
                  </div>
                )}
                {sonuc.onerilen_ilaclar?.length > 0 && (
                  <div style={s.blok}>
                    <div style={s.etiket}>Önerilen İlaçlar</div>
                    {sonuc.onerilen_ilaclar.map((il, i) => (
                      <div key={i} style={s.ilacKart}>
                        <strong>{il.ticari_ad}</strong>
                        <span style={s.doz}>{il.doz} {il.doz_birimi}</span>
                        <span style={s.gerekce}>{il.gerekce}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div style={s.aksiyonlar}>
                  <button style={s.uygulaBtn} onClick={uygula} type="button">✅ Forma Uygula</button>
                  <button style={s.tekrarBtn} onClick={() => setSonuc(null)} type="button">🔄 Tekrar</button>
                </div>
              </div>
            )}

            {/* Fotoğraf sonucu — metin sonucuyla aynı format */}
            {sonuc?.tip === 'fotograf' && (
              <div style={s.sonuc}>
                <div style={s.sonucBaslik}>Fotoğraf Analizi</div>
                <div style={s.blok}>
                  <div style={s.etiket}>Tanı</div>
                  <div style={s.deger}>{sonuc.tani}</div>
                </div>
                {sonuc.muhendis_notu && (
                  <div style={s.blok}>
                    <div style={s.etiket}>Mühendis Notu</div>
                    <div style={s.deger}>{sonuc.muhendis_notu}</div>
                  </div>
                )}
                {sonuc.onerilen_ilaclar?.length > 0 && (
                  <div style={s.blok}>
                    <div style={s.etiket}>Önerilen İlaçlar</div>
                    {sonuc.onerilen_ilaclar.map((il, i) => (
                      <div key={i} style={s.ilacKart}>
                        <strong>{il.ticari_ad}</strong>
                        <span style={s.doz}>{il.doz} {il.doz_birimi}</span>
                        <span style={s.gerekce}>{il.gerekce}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div style={s.aksiyonlar}>
                  <button style={s.uygulaBtn} onClick={uygula} type="button">✅ Forma Uygula</button>
                  <button style={s.tekrarBtn} onClick={() => setSonuc(null)} type="button">🔄 Tekrar</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

const s = {
  tetikBtn: {
    padding: '6px 14px',
    background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
    color: '#fff', border: 'none', borderRadius: 8,
    cursor: 'pointer', fontSize: 13, fontWeight: 600,
  },
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
    zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
  },
  modal: {
    background: '#fff', borderRadius: 12, padding: 24,
    width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto',
    boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
  },
  baslik: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 14, fontSize: 17, fontWeight: 700, color: '#1e1b4b',
  },
  kapatBtn: { background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#6b7280' },
  modBar: { display: 'flex', gap: 6, marginBottom: 14 },
  modBtn: {
    flex: 1, padding: '7px', border: '1.5px solid #e5e7eb',
    borderRadius: 8, background: '#f9fafb', cursor: 'pointer',
    fontSize: 13, fontWeight: 600, color: '#6b7280',
  },
  modAktif: { borderColor: '#7c3aed', background: '#f5f3ff', color: '#7c3aed' },
  textarea: {
    width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 8,
    padding: '10px 12px', fontSize: 14, resize: 'vertical',
    outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
  },
  bilgi: { fontSize: 12, color: '#6b7280', margin: '6px 0' },
  fotografAlani: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 },
  yukleAlani: {
    width: '100%', height: 140, border: '2px dashed #d1d5db', borderRadius: 10,
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    gap: 6, cursor: 'pointer', background: '#f9fafb',
  },
  onizleme: { width: '100%', maxHeight: 200, objectFit: 'contain', borderRadius: 8 },
  degistirBtn: {
    padding: '4px 12px', background: '#f3f4f6', border: 'none',
    borderRadius: 6, cursor: 'pointer', fontSize: 12, color: '#374151',
  },
  hata: { background: '#fef2f2', color: '#dc2626', borderRadius: 8, padding: '8px 12px', fontSize: 13, margin: '8px 0' },
  analizBtn: {
    marginTop: 12, width: '100%', padding: '10px',
    background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
    color: '#fff', border: 'none', borderRadius: 8,
    cursor: 'pointer', fontSize: 14, fontWeight: 600,
  },
  sonuc: { marginTop: 16, background: '#f5f3ff', borderRadius: 10, padding: 16 },
  sonucBaslik: { fontWeight: 700, fontSize: 14, color: '#4f46e5', marginBottom: 10 },
  blok: { marginBottom: 10 },
  etiket: { fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 },
  deger: { fontSize: 14, color: '#1f2937', lineHeight: 1.5 },
  ilacKart: {
    background: '#fff', borderRadius: 8, padding: '8px 12px', marginBottom: 6,
    display: 'flex', flexDirection: 'column', gap: 2, border: '1px solid #e0e7ff',
  },
  doz: { fontSize: 12, color: '#4f46e5', fontWeight: 600 },
  gerekce: { fontSize: 12, color: '#6b7280' },
  aksiyonlar: { display: 'flex', gap: 8, marginTop: 12 },
  uygulaBtn: {
    flex: 1, padding: '9px', background: '#059669',
    color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600,
  },
  tekrarBtn: {
    padding: '9px 14px', background: '#f3f4f6',
    color: '#374151', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13,
  },
}
