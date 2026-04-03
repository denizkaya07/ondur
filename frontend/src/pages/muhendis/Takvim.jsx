import { useEffect, useState, useCallback } from 'react'
import api from '../../services/api'

const TUR_RENK = {
  saha:        { bg: '#e8f5ee', color: '#1a7a4a' },
  danismanlik: { bg: '#e8f0fe', color: '#1a56db' },
  hasat:       { bg: '#fff8e1', color: '#b7791f' },
  recete:      { bg: '#f3e8ff', color: '#7e22ce' },
  numune:      { bg: '#e0f7fa', color: '#00838f' },
  planlama:    { bg: '#f5f5f5', color: '#555'    },
}

const TUR_ETIKET = {
  saha:        'Saha Ziyareti',
  danismanlik: 'Danışmanlık',
  hasat:       'Hasat Kontrolü',
  recete:      'Reçete Ziyareti',
  numune:      'Numune Alma',
  planlama:    'Sezon Planlaması',
}

const AYLAR = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran',
               'Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık']
const GUNLER = ['Pzt','Sal','Çar','Per','Cum','Cmt','Paz']

function takvimGunleri(yil, ay) {
  const ilkGun  = new Date(yil, ay, 1)
  const sonGun  = new Date(yil, ay + 1, 0)
  // Haftanın ilk günü Pazartesi (0=Pzt)
  let bosluk = (ilkGun.getDay() + 6) % 7
  const gunler = []
  for (let i = 0; i < bosluk; i++) gunler.push(null)
  for (let d = 1; d <= sonGun.getDate(); d++) gunler.push(d)
  while (gunler.length % 7 !== 0) gunler.push(null)
  return gunler
}

function tarihStr(yil, ay, gun) {
  return `${yil}-${String(ay + 1).padStart(2,'0')}-${String(gun).padStart(2,'0')}`
}

export default function Takvim() {
  const bugun      = new Date()
  const [yil, setYil]             = useState(bugun.getFullYear())
  const [ay, setAy]               = useState(bugun.getMonth())
  const [ziyaretler, setZiyaretler] = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [seciliGun, setSeciliGun]   = useState(null)
  const [formAcik, setFormAcik]     = useState(false)
  const [isletmeler, setIsletmeler] = useState([])
  const [kaydediyor, setKaydediyor] = useState(false)
  const [hata, setHata]             = useState('')
  const [seciliZiyaret, setSeciliZiyaret] = useState(null)

  const [form, setForm] = useState({
    isletme: '',
    tur: 'saha',
    tarih: bugun.toISOString().slice(0, 10),
    saat: '09:00',
    sure_dk: 60,
    adres: '',
    notlar: '',
  })

  const yukle = useCallback(() => {
    setYukleniyor(true)
    const baslangic = tarihStr(yil, ay, 1)
    const bitis     = tarihStr(yil, ay, new Date(yil, ay + 1, 0).getDate())
    api.get(`/ziyaret/?tarih__gte=${baslangic}&tarih__lte=${bitis}`)
      .then(res => setZiyaretler(res.data))
      .catch(() => {})
      .finally(() => setYukleniyor(false))
  }, [yil, ay])

  useEffect(() => { yukle() }, [yukle])

  const oncekiAy = () => {
    if (ay === 0) { setAy(11); setYil(y => y - 1) }
    else setAy(a => a - 1)
    setSeciliGun(null)
    setSeciliZiyaret(null)
  }

  const sonrakiAy = () => {
    if (ay === 11) { setAy(0); setYil(y => y + 1) }
    else setAy(a => a + 1)
    setSeciliGun(null)
    setSeciliZiyaret(null)
  }

  const gunZiyaretler = (gun) => {
    if (!gun) return []
    const ts = tarihStr(yil, ay, gun)
    return ziyaretler.filter(z => z.tarih === ts)
  }

  const formAc = (gun = null) => {
    setFormAcik(true)
    setHata('')
    setSeciliZiyaret(null)
    if (gun) setForm(f => ({ ...f, tarih: tarihStr(yil, ay, gun) }))
    if (isletmeler.length === 0) {
      api.get('/ciftci/danisanlarim/').then(res => setIsletmeler(res.data)).catch(() => {})
    }
  }

  const formKapat = () => {
    setFormAcik(false)
    setHata('')
  }

  const handleDegis = (e) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  const kaydet = async (e) => {
    e.preventDefault()
    if (!form.isletme || !form.tarih || !form.saat) {
      setHata('Zorunlu alanları doldurun.')
      return
    }
    setKaydediyor(true)
    setHata('')
    try {
      await api.post('/ziyaret/', { ...form, sure_dk: Number(form.sure_dk) })
      formKapat()
      yukle()
    } catch (err) {
      setHata(err.response?.data ? JSON.stringify(err.response.data) : 'Kayıt başarısız.')
    } finally {
      setKaydediyor(false)
    }
  }

  const tamamla = async (id) => {
    await api.post(`/ziyaret/${id}/tamamla/`)
    yukle()
    setSeciliZiyaret(null)
  }

  const gunler = takvimGunleri(yil, ay)
  const bugunStr = bugun.toISOString().slice(0, 10)
  const seciliGunZiyaretler = seciliGun ? gunZiyaretler(seciliGun) : []

  if (yukleniyor) return <div style={s.yuklenme}>Yükleniyor...</div>

  return (
    <div style={s.kapsayici}>
      {/* Üst bar */}
      <div style={s.ustBar}>
        <div style={s.navRow}>
          <button style={s.navBtn} onClick={oncekiAy}>‹</button>
          <span style={s.ayBaslik}>{AYLAR[ay]} {yil}</span>
          <button style={s.navBtn} onClick={sonrakiAy}>›</button>
        </div>
        <button style={s.ekleBtn} onClick={() => formAc(seciliGun)}>+ Ziyaret Ekle</button>
      </div>

      {/* Form paneli */}
      {formAcik && (
        <div style={s.panel}>
          <div style={s.panelUst}>
            <span style={s.panelBaslik}>Yeni Ziyaret</span>
            <button style={s.kapatBtn} onClick={formKapat}>✕</button>
          </div>
          <form onSubmit={kaydet}>
            <div style={s.formGrid}>
              <div style={s.alan}>
                <label style={s.etiket}>İşletme *</label>
                <select name="isletme" value={form.isletme} onChange={handleDegis} style={s.girdi}>
                  <option value="">Seçin...</option>
                  {isletmeler.map(d => (
                    <option key={d.isletme.id} value={d.isletme.id}>{d.isletme.ad}</option>
                  ))}
                </select>
              </div>
              <div style={s.alan}>
                <label style={s.etiket}>Ziyaret Türü</label>
                <select name="tur" value={form.tur} onChange={handleDegis} style={s.girdi}>
                  {Object.entries(TUR_ETIKET).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div style={s.alan}>
                <label style={s.etiket}>Tarih *</label>
                <input type="date" name="tarih" value={form.tarih} onChange={handleDegis} style={s.girdi} />
              </div>
              <div style={s.alan}>
                <label style={s.etiket}>Saat *</label>
                <input type="time" name="saat" value={form.saat} onChange={handleDegis} style={s.girdi} />
              </div>
              <div style={s.alan}>
                <label style={s.etiket}>Süre (dakika)</label>
                <input type="number" name="sure_dk" value={form.sure_dk} onChange={handleDegis} style={s.girdi} min={5} />
              </div>
              <div style={s.alan}>
                <label style={s.etiket}>Adres</label>
                <input type="text" name="adres" value={form.adres} onChange={handleDegis} style={s.girdi} />
              </div>
              <div style={{...s.alan, gridColumn: 'span 2'}}>
                <label style={s.etiket}>Notlar</label>
                <textarea name="notlar" value={form.notlar} onChange={handleDegis} style={{...s.girdi, height: '64px', resize: 'vertical'}} />
              </div>
            </div>
            {hata && <p style={s.hataMsg}>{hata}</p>}
            <div style={s.formAlt}>
              <button type="button" style={s.iptalBtn} onClick={formKapat}>Vazgeç</button>
              <button type="submit" style={s.kaydetBtn} disabled={kaydediyor}>
                {kaydediyor ? 'Kaydediliyor…' : 'Kaydet'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Takvim grid */}
      <div style={s.takvim}>
        {GUNLER.map(g => (
          <div key={g} style={s.gunBaslik}>{g}</div>
        ))}
        {gunler.map((gun, i) => {
          const ts       = gun ? tarihStr(yil, ay, gun) : null
          const bugunku  = ts === bugunStr
          const secildi  = gun === seciliGun
          const gunZiy   = gun ? gunZiyaretler(gun) : []
          return (
            <div
              key={i}
              style={{
                ...s.gunHucre,
                ...(gun ? s.gunHucreAktif : {}),
                ...(bugunku ? s.gunHucreBugun : {}),
                ...(secildi ? s.gunHucreSecili : {}),
              }}
              onClick={() => {
                if (!gun) return
                setSeciliGun(gun === seciliGun ? null : gun)
                setSeciliZiyaret(null)
              }}
            >
              {gun && (
                <>
                  <span style={{...s.gunNo, ...(bugunku ? s.gunNoBugun : {})}}>{gun}</span>
                  <div style={s.dotSatir}>
                    {gunZiy.slice(0, 3).map(z => (
                      <span key={z.id} style={{...s.dot, background: TUR_RENK[z.tur]?.color}} />
                    ))}
                    {gunZiy.length > 3 && <span style={s.dotFazla}>+{gunZiy.length - 3}</span>}
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>

      {/* Seçili günün ziyaretleri */}
      {seciliGun && (
        <div style={s.gunDetay}>
          <div style={s.gunDetayUst}>
            <span style={s.gunDetayBaslik}>
              {seciliGun} {AYLAR[ay]} — {seciliGunZiyaretler.length} ziyaret
            </span>
            <button style={s.ekleKucukBtn} onClick={() => formAc(seciliGun)}>+ Ekle</button>
          </div>

          {seciliGunZiyaretler.length === 0 ? (
            <p style={s.bosGun}>Bu gün için ziyaret yok.</p>
          ) : (
            seciliGunZiyaretler.map(z => (
              <div
                key={z.id}
                style={{...s.ziyaretKart, ...(seciliZiyaret?.id === z.id ? s.ziyaretKartSecili : {})}}
                onClick={(e) => { e.stopPropagation(); setSeciliZiyaret(seciliZiyaret?.id === z.id ? null : z) }}
              >
                <div style={s.ziyaretUst}>
                  <span style={{...s.turBadge, ...TUR_RENK[z.tur]}}>{TUR_ETIKET[z.tur]}</span>
                  <span style={s.ziyaretSaat}>{z.saat?.slice(0,5)} · {z.sure_dk} dk</span>
                </div>
                <p style={s.ziyaretIsletme}>{z.isletme_ad}</p>

                {seciliZiyaret?.id === z.id && (
                  <div style={s.ziyaretDetay}>
                    {z.ciftci_ad && <p style={s.zDetayRow}><span style={s.dEtiket}>Çiftçi</span>{z.ciftci_ad}</p>}
                    {z.adres     && <p style={s.zDetayRow}><span style={s.dEtiket}>Adres</span>{z.adres}</p>}
                    {z.notlar    && <p style={s.zDetayRow}><span style={s.dEtiket}>Not</span>{z.notlar}</p>}
                    {!z.tamamlandi && (
                      <button style={s.tamamlaBtn} onClick={() => tamamla(z.id)}>
                        ✓ Tamamlandı
                      </button>
                    )}
                    {z.tamamlandi && <span style={s.tamamlandiEtiket}>✓ Tamamlandı</span>}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

const s = {
  kapsayici: { padding: '2rem', maxWidth: '860px', margin: '0 auto' },
  ustBar:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' },
  navRow:    { display: 'flex', alignItems: 'center', gap: '12px' },
  navBtn:    { background: 'none', border: '1px solid #ddd', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontSize: '1.1rem', color: '#555' },
  ayBaslik:  { fontSize: '1.2rem', fontWeight: '600', color: '#1a7a4a', minWidth: '160px', textAlign: 'center' },
  ekleBtn:   { padding: '8px 16px', background: '#1a7a4a', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem' },

  panel: { background: '#fff', border: '1px solid #e0ede6', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.25rem' },
  panelUst:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' },
  panelBaslik: { fontWeight: '600', color: '#1a7a4a' },
  kapatBtn:    { background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: '#aaa' },
  formGrid:    { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' },
  alan:        { display: 'flex', flexDirection: 'column', gap: '4px' },
  etiket:      { fontSize: '0.82rem', color: '#666', fontWeight: '500' },
  girdi:       { padding: '7px 10px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '0.9rem', background: '#fff', width: '100%', boxSizing: 'border-box' },
  hataMsg:     { color: '#e53e3e', fontSize: '0.85rem', marginTop: '8px' },
  formAlt:     { display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '14px' },
  iptalBtn:    { padding: '7px 14px', background: '#f0f0f0', color: '#444', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem' },
  kaydetBtn:   { padding: '7px 18px', background: '#1a7a4a', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem' },

  takvim: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', background: '#fff', border: '1px solid #e8e8e8', borderRadius: '12px', padding: '12px' },
  gunBaslik:      { textAlign: 'center', fontSize: '0.78rem', fontWeight: '600', color: '#aaa', padding: '4px 0 8px' },
  gunHucre:       { minHeight: '72px', borderRadius: '8px', padding: '6px', cursor: 'default' },
  gunHucreAktif:  { cursor: 'pointer', transition: 'background 0.15s' },
  gunHucreBugun:  { background: '#f0faf4' },
  gunHucreSecili: { background: '#e8f5ee', outline: '2px solid #1a7a4a' },
  gunNo:          { fontSize: '0.85rem', color: '#444', fontWeight: '400' },
  gunNoBugun:     { fontWeight: '700', color: '#1a7a4a' },
  dotSatir:       { display: 'flex', gap: '3px', marginTop: '4px', flexWrap: 'wrap' },
  dot:            { width: '7px', height: '7px', borderRadius: '50%' },
  dotFazla:       { fontSize: '0.65rem', color: '#aaa' },

  yuklenme:   { padding: '2rem', textAlign: 'center', color: '#888' },
  gunDetay:    { marginTop: '1rem', background: '#fff', border: '1px solid #e8e8e8', borderRadius: '12px', padding: '1rem' },
  gunDetayUst: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' },
  gunDetayBaslik: { fontWeight: '600', color: '#333', fontSize: '0.95rem' },
  ekleKucukBtn:   { padding: '5px 12px', background: '#1a7a4a', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.82rem' },
  bosGun:      { color: '#aaa', textAlign: 'center', padding: '1rem 0', fontSize: '0.9rem' },

  ziyaretKart:       { border: '1px solid #eee', borderRadius: '8px', padding: '10px 12px', marginBottom: '8px', cursor: 'pointer' },
  ziyaretKartSecili: { border: '1px solid #1a7a4a' },
  ziyaretUst:        { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' },
  turBadge:          { padding: '2px 8px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: '500' },
  ziyaretSaat:       { fontSize: '0.82rem', color: '#888' },
  ziyaretIsletme:    { margin: 0, fontSize: '0.9rem', fontWeight: '500' },
  ziyaretDetay:      { marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #f0f0f0' },
  zDetayRow:         { margin: '3px 0', fontSize: '0.85rem', display: 'flex', gap: '8px' },
  dEtiket:           { color: '#aaa', minWidth: '52px' },
  tamamlaBtn:        { marginTop: '8px', padding: '6px 14px', background: '#e8f5ee', color: '#1a7a4a', border: '1px solid #c6e6d4', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' },
  tamamlandiEtiket:  { display: 'inline-block', marginTop: '8px', fontSize: '0.85rem', color: '#1a7a4a', fontWeight: '500' },
}
