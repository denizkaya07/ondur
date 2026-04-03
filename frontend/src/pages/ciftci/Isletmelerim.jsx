import { useEffect, useState } from 'react'
import api from '../../services/api'

const TUR_ETIKET = {
  sera:        'Sera',
  acik_tarla:  'Açık Tarla',
  meyve_bahce: 'Meyve Bahçesi',
  zeytinlik:   'Zeytinlik',
  diger:       'Diğer',
}

const SERA_TIP = {
  naylon:     'Naylon',
  cam:        'Cam',
  policarbon: 'Polikarbon',
  net:        'Net / Gölgelik',
  diger:      'Diğer',
}

export default function Isletmelerim() {
  const [isletmeler, setIsletmeler] = useState([])
  const [urunler, setUrunler]       = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [secili, setSecili]         = useState(null)
  const [formAcik, setFormAcik]     = useState(false)
  const [kaydediyor, setKaydediyor] = useState(false)
  const [hata, setHata]             = useState('')

  const [form, setForm] = useState({
    ad: '', tur: 'sera', sera_tip: '', urun: '',
    alan_dekar: '', ekim_tarihi: '',
  })

  useEffect(() => {
    Promise.all([
      api.get('/ciftci/isletmelerim/'),
      api.get('/ciftci/urunler/'),
    ]).then(([is, ur]) => {
      setIsletmeler(is.data)
      setUrunler(ur.data)
    }).catch(console.error)
      .finally(() => setYukleniyor(false))
  }, [])

  const degis = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const kaydet = async (e) => {
    e.preventDefault()
    if (!form.ad || !form.tur || !form.alan_dekar) {
      setHata('Zorunlu alanları doldurun.')
      return
    }
    setKaydediyor(true)
    setHata('')
    try {
      const payload = {
        ad: form.ad,
        tur: form.tur,
        alan_dekar: form.alan_dekar,
        ...(form.tur === 'sera' && form.sera_tip ? { sera_tip: form.sera_tip } : {}),
        ...(form.urun ? { urun: form.urun } : {}),
        ...(form.ekim_tarihi ? { ekim_tarihi: form.ekim_tarihi } : {}),
      }
      const res = await api.post('/ciftci/isletme/ekle/', payload)
      setIsletmeler(prev => [res.data, ...prev])
      setFormAcik(false)
      setForm({ ad: '', tur: 'sera', sera_tip: '', urun: '', alan_dekar: '', ekim_tarihi: '' })
    } catch (err) {
      setHata(err.response?.data ? JSON.stringify(err.response.data) : 'Kayıt başarısız.')
    } finally {
      setKaydediyor(false)
    }
  }

  if (yukleniyor) return <div style={s.yuklenme}>Yükleniyor...</div>

  return (
    <div style={s.kapsayici}>
      <div style={s.ustBar}>
        <h2 style={s.baslik}>İşletmelerim</h2>
        <button style={s.ekleBtn} onClick={() => { setFormAcik(true); setHata('') }}>
          + İşletme Ekle
        </button>
      </div>

      {formAcik && (
        <div style={s.panel}>
          <div style={s.panelUst}>
            <span style={s.panelBaslik}>Yeni İşletme</span>
            <button style={s.kapatBtn} onClick={() => setFormAcik(false)}>✕</button>
          </div>
          <form onSubmit={kaydet}>
            <div style={s.formGrid}>
              <div style={{...s.alan, gridColumn: 'span 2'}}>
                <label style={s.etiket}>İşletme Adı *</label>
                <input style={s.girdi} name="ad" value={form.ad} onChange={degis} placeholder="Örn: Kuzey Serası" />
              </div>
              <div style={s.alan}>
                <label style={s.etiket}>Tür *</label>
                <select style={s.girdi} name="tur" value={form.tur} onChange={degis}>
                  {Object.entries(TUR_ETIKET).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              {form.tur === 'sera' && (
                <div style={s.alan}>
                  <label style={s.etiket}>Sera Tipi</label>
                  <select style={s.girdi} name="sera_tip" value={form.sera_tip} onChange={degis}>
                    <option value="">Seçin...</option>
                    {Object.entries(SERA_TIP).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
              )}
              <div style={s.alan}>
                <label style={s.etiket}>Alan (dekar) *</label>
                <input style={s.girdi} name="alan_dekar" type="number" step="0.1" min="0" value={form.alan_dekar} onChange={degis} />
              </div>
              <div style={s.alan}>
                <label style={s.etiket}>Ürün</label>
                <select style={s.girdi} name="urun" value={form.urun} onChange={degis}>
                  <option value="">Seçin...</option>
                  {urunler.map(u => <option key={u.id} value={u.id}>{u.ad}</option>)}
                </select>
              </div>
              <div style={s.alan}>
                <label style={s.etiket}>Ekim Tarihi</label>
                <input style={s.girdi} name="ekim_tarihi" type="date" value={form.ekim_tarihi} onChange={degis} />
              </div>
            </div>
            {hata && <p style={s.hataMsg}>{hata}</p>}
            <div style={s.formAlt}>
              <button type="button" style={s.iptalBtn} onClick={() => setFormAcik(false)}>Vazgeç</button>
              <button type="submit" style={s.kaydetBtn} disabled={kaydediyor}>
                {kaydediyor ? 'Kaydediliyor…' : 'Kaydet'}
              </button>
            </div>
          </form>
        </div>
      )}

      {isletmeler.length === 0 ? (
        <div style={s.bos}>Henüz işletme eklenmemiş.</div>
      ) : (
        <div style={s.liste}>
          {isletmeler.map(i => (
            <div
              key={i.id}
              style={{...s.kart, ...(secili?.id === i.id ? s.kartSecili : {})}}
              onClick={() => setSecili(secili?.id === i.id ? null : i)}
            >
              <div style={s.kartUst}>
                <div>
                  <p style={s.isletmeAd}>{i.ad}</p>
                  <p style={s.alt}>
                    {TUR_ETIKET[i.tur]} · {i.alan_dekar} da
                    {i.urun_ad ? ` · ${i.urun_ad}` : ''}
                  </p>
                </div>
                <span style={i.aktif ? s.aktifBadge : s.pasifBadge}>
                  {i.aktif ? 'Aktif' : 'Pasif'}
                </span>
              </div>

              {secili?.id === i.id && (
                <div style={s.detay}>
                  {i.sera_tip && (
                    <div style={s.detayRow}>
                      <span style={s.detiket}>Sera Tipi</span>
                      <span>{SERA_TIP[i.sera_tip] || i.sera_tip}</span>
                    </div>
                  )}
                  {i.ekim_tarihi && (
                    <div style={s.detayRow}>
                      <span style={s.detiket}>Ekim Tarihi</span>
                      <span>{i.ekim_tarihi}</span>
                    </div>
                  )}
                  <div style={s.detayRow}>
                    <span style={s.detiket}>Oluşturma</span>
                    <span>{new Date(i.olusturma).toLocaleDateString('tr-TR')}</span>
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
  kapsayici: { padding: '2rem', maxWidth: '800px', margin: '0 auto' },
  ustBar:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' },
  baslik:    { fontSize: '1.5rem', fontWeight: '500', margin: 0, color: '#1a7a4a' },
  ekleBtn:   { padding: '8px 16px', background: '#1a7a4a', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem' },
  yuklenme:  { padding: '2rem', textAlign: 'center', color: '#888' },
  bos:       { padding: '3rem', textAlign: 'center', color: '#aaa', background: '#f9f9f9', borderRadius: '10px' },
  liste:     { display: 'flex', flexDirection: 'column', gap: '10px' },
  panel:     { background: '#fff', border: '1px solid #e0ede6', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem' },
  panelUst:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' },
  panelBaslik: { fontWeight: '600', color: '#1a7a4a' },
  kapatBtn:    { background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: '#aaa' },
  formGrid:  { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' },
  alan:      { display: 'flex', flexDirection: 'column', gap: '4px' },
  etiket:    { fontSize: '0.82rem', color: '#666', fontWeight: '500' },
  girdi:     { padding: '8px 10px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '0.9rem', background: '#fff', width: '100%', boxSizing: 'border-box' },
  hataMsg:   { color: '#e53e3e', fontSize: '0.85rem', marginTop: '8px' },
  formAlt:   { display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '14px' },
  iptalBtn:  { padding: '7px 14px', background: '#f0f0f0', color: '#444', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem' },
  kaydetBtn: { padding: '7px 18px', background: '#1a7a4a', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem' },
  kart:       { background: '#fff', border: '1px solid #e8e8e8', borderRadius: '10px', padding: '1rem 1.25rem', cursor: 'pointer' },
  kartSecili: { border: '1px solid #1a7a4a' },
  kartUst:    { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  isletmeAd:  { margin: 0, fontWeight: '500', fontSize: '1rem' },
  alt:        { margin: '4px 0 0', fontSize: '0.83rem', color: '#888' },
  aktifBadge: { padding: '3px 10px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: '500', background: '#e8f5ee', color: '#1a7a4a' },
  pasifBadge: { padding: '3px 10px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: '500', background: '#f5f5f5', color: '#aaa' },
  detay:     { marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #f0f0f0' },
  detayRow:  { display: 'flex', gap: '12px', padding: '4px 0', fontSize: '0.9rem' },
  detiket:   { color: '#888', minWidth: '120px' },
}
