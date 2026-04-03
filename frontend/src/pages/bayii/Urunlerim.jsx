import { useEffect, useState } from 'react'
import api from '../../services/api'

export default function Urunlerim() {
  const [urunler, setUrunler]     = useState([])
  const [katalog, setKatalog]     = useState({ ilaclar: [], gubreler: [] })
  const [yukleniyor, setYukleniyor] = useState(true)
  const [formAcik, setFormAcik]   = useState(false)
  const [form, setForm]           = useState({ tip: 'ilac', urun_id: '' })
  const [kaydediyor, setKaydediyor] = useState(false)
  const [hata, setHata]           = useState('')
  const [hataGlobal, setHataGlobal] = useState('')

  const yukle = () => {
    setYukleniyor(true)
    api.get('/katalog/bayii/urunlerim/')
      .then(res => setUrunler(res.data))
      .catch(err => {
        if (err.response?.status === 403) {
          setHataGlobal('Bu sayfaya erişim için bayii profiliniz gerekli.')
        }
      })
      .finally(() => setYukleniyor(false))
  }

  useEffect(() => {
    yukle()
    Promise.all([
      api.get('/katalog/ilaclar/'),
      api.get('/katalog/gubreler/'),
    ]).then(([il, gu]) => setKatalog({ ilaclar: il.data, gubreler: gu.data }))
      .catch(() => {})
  }, [])

  const kaydet = async (e) => {
    e.preventDefault()
    if (!form.urun_id) { setHata('Ürün seçin.'); return }
    setKaydediyor(true)
    setHata('')
    try {
      const payload = form.tip === 'ilac'
        ? { ilac: form.urun_id, gubre: null }
        : { ilac: null, gubre: form.urun_id }
      await api.post('/katalog/bayii/urunlerim/', payload)
      setFormAcik(false)
      setForm({ tip: 'ilac', urun_id: '' })
      yukle()
    } catch (err) {
      setHata(err.response?.data ? JSON.stringify(err.response.data) : 'Kayıt başarısız.')
    } finally {
      setKaydediyor(false)
    }
  }

  if (yukleniyor) return <div style={s.yuklenme}>Yükleniyor...</div>

  if (hataGlobal) return (
    <div style={s.kapsayici}>
      <h2 style={s.baslik}>Ürünlerim</h2>
      <div style={s.bos}>{hataGlobal}</div>
    </div>
  )

  const katalogListe = form.tip === 'ilac' ? katalog.ilaclar : katalog.gubreler

  return (
    <div style={s.kapsayici}>
      <div style={s.ustBar}>
        <h2 style={s.baslik}>Ürünlerim</h2>
        <button style={s.ekleBtn} onClick={() => { setFormAcik(true); setHata('') }}>
          + Ürün Ekle
        </button>
      </div>

      {formAcik && (
        <div style={s.panel}>
          <div style={s.panelUst}>
            <span style={s.panelBaslik}>Katalogdan Ürün Ekle</span>
            <button style={s.kapatBtn} onClick={() => setFormAcik(false)}>✕</button>
          </div>
          <form onSubmit={kaydet}>
            <div style={s.formRow}>
              <div style={s.alan}>
                <label style={s.etiket}>Tür</label>
                <select
                  style={s.girdi}
                  value={form.tip}
                  onChange={e => setForm(f => ({ ...f, tip: e.target.value, urun_id: '' }))}
                >
                  <option value="ilac">İlaç</option>
                  <option value="gubre">Gübre</option>
                </select>
              </div>
              <div style={{...s.alan, flex: 2}}>
                <label style={s.etiket}>Ürün *</label>
                <select
                  style={s.girdi}
                  value={form.urun_id}
                  onChange={e => setForm(f => ({ ...f, urun_id: e.target.value }))}
                >
                  <option value="">Seçin...</option>
                  {katalogListe.map(u => (
                    <option key={u.id} value={u.id}>{u.ticari_ad}</option>
                  ))}
                </select>
              </div>
            </div>
            {hata && <p style={s.hataMsg}>{hata}</p>}
            <div style={s.formAlt}>
              <button type="button" style={s.iptalBtn} onClick={() => setFormAcik(false)}>Vazgeç</button>
              <button type="submit" style={s.kaydetBtn} disabled={kaydediyor}>
                {kaydediyor ? 'Ekleniyor…' : 'Ekle'}
              </button>
            </div>
          </form>
        </div>
      )}

      {urunler.length === 0 ? (
        <div style={s.bos}>Henüz ürün eklenmemiş.</div>
      ) : (
        <div style={s.liste}>
          {urunler.map(u => (
            <div key={u.id} style={s.kart}>
              <div style={s.tipBadge}>
                {u.ilac_ad ? 'İlaç' : 'Gübre'}
              </div>
              <p style={s.urunAd}>{u.ilac_ad || u.gubre_ad}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const s = {
  kapsayici: { padding: '2rem', maxWidth: '760px', margin: '0 auto' },
  ustBar:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' },
  baslik:    { fontSize: '1.5rem', fontWeight: '500', margin: 0, color: '#1a7a4a' },
  ekleBtn:   { padding: '8px 16px', background: '#1a7a4a', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem' },
  yuklenme:  { padding: '2rem', textAlign: 'center', color: '#888' },
  bos:       { padding: '3rem', textAlign: 'center', color: '#aaa', background: '#f9f9f9', borderRadius: '10px' },
  liste:     { display: 'flex', flexDirection: 'column', gap: '8px' },
  kart:      { background: '#fff', border: '1px solid #e8e8e8', borderRadius: '10px', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '12px' },
  tipBadge:  { padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', background: '#f0f0f0', color: '#555', whiteSpace: 'nowrap' },
  urunAd:    { margin: 0, fontWeight: '500', fontSize: '0.95rem' },
  panel:     { background: '#fff', border: '1px solid #e0ede6', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem' },
  panelUst:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' },
  panelBaslik: { fontWeight: '600', color: '#1a7a4a' },
  kapatBtn:    { background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: '#aaa' },
  formRow:   { display: 'flex', gap: '10px' },
  alan:      { display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 },
  etiket:    { fontSize: '0.82rem', color: '#666', fontWeight: '500' },
  girdi:     { padding: '8px 10px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '0.9rem', background: '#fff', width: '100%', boxSizing: 'border-box' },
  hataMsg:   { color: '#e53e3e', fontSize: '0.85rem', marginTop: '8px' },
  formAlt:   { display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' },
  iptalBtn:  { padding: '7px 14px', background: '#f0f0f0', color: '#444', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem' },
  kaydetBtn: { padding: '7px 18px', background: '#1a7a4a', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem' },
}
