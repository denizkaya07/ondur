/* eslint react/prop-types: 0 */
import { useEffect, useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import useBreakpoint from '../../hooks/useBreakpoint'

function urunEmoji(urunAd, cesitAd) {
  const m = `${cesitAd || ''} ${urunAd || ''}`.toLowerCase()
  if (m.includes('cherry') || m.includes('kiraz')) return '🍒'
  if (m.includes('domates')) return '🍅'
  if (m.includes('biber'))   return '🫑'
  if (m.includes('patlıcan') || m.includes('patlican')) return '🍆'
  if (m.includes('salatalık') || m.includes('salatalik')) return '🥒'
  if (m.includes('çilek') || m.includes('cilek')) return '🍓'
  if (m.includes('kavun'))   return '🍈'
  if (m.includes('karpuz'))  return '🍉'
  if (m.includes('üzüm') || m.includes('uzum')) return '🍇'
  if (m.includes('zeytin'))  return '🫒'
  if (m.includes('mısır') || m.includes('misir')) return '🌽'
  if (m.includes('buğday') || m.includes('bugday')) return '🌾'
  return '🌿'
}
import api from '../../services/api'

// ─── ID üretici ───
let _id = 0
const uid = () => ++_id

// ─── Toplam miktar hesabı ───
function hesaplaTopam(doz, baz, birim, alanDekar) {
  const d = parseFloat(doz)
  if (!d || !alanDekar) return '—'
  const areaSm   = alanDekar * 1000        // m²
  const totalSu  = areaSm * 0.8            // L (0.8 L/m² tahmini)
  let total = 0
  switch (baz) {
    case '100L':  total = d * (totalSu / 100); break
    case '1000L': total = d * (totalSu / 1000); break
    case 'dekar': total = d * alanDekar; break
    case 'm2':    total = d * areaSm; break
    case 'sabit': total = d; break
    default:      total = d * (totalSu / 100)
  }
  const agirlik = ['gr','kg'].includes(birim)
  if (agirlik) return total >= 1000 ? (total/1000).toFixed(2)+' kg' : total.toFixed(1)+' gr'
  return total >= 1000 ? (total/1000).toFixed(2)+' L' : total.toFixed(1)+' ml'
}

// ─── Bölüm başlığı ───
function Bolum({ ikon, baslik, acik, onToggle, onEkle, ekleEtiket, children }) {
  return (
    <div style={s.bolum}>
      <div style={s.bolumUst}>
        <button style={s.bolumToggle} onClick={onToggle}>
          <span style={s.bolumIkon}>{ikon}</span>
          <span style={s.bolumBaslik}>{baslik}</span>
          <span style={s.bolumOk}>{acik ? '▲' : '▼'}</span>
        </button>
        {onEkle && (
          <button style={s.ekleBtn} onClick={onEkle}>+ {ekleEtiket}</button>
        )}
      </div>
      {acik && <div style={s.bolumIcerik}>{children}</div>}
    </div>
  )
}

// ─── 💧 Sulama satırı ───
function DonemSatiri({ satir, katalogIndex, alanDekar, onChange, onSil }) {
  const [turFiltre, setTurFiltre] = useState('')

  // Katalogdan benzersiz türleri çıkar
  const turler = [...new Set(Object.values(katalogIndex).map(u => u._tip === 'ilac' ? `İlaç: ${u._turEtiket}` : `Gübre: ${u._turEtiket}`))].sort()

  const filtreliAnahtar = Object.keys(katalogIndex).filter(k => {
    if (!turFiltre) return true
    const u = katalogIndex[k]
    const etiket = u._tip === 'ilac' ? `İlaç: ${u._turEtiket}` : `Gübre: ${u._turEtiket}`
    return etiket === turFiltre
  })

  const autofill = (ad) => {
    const urun = katalogIndex[ad]
    if (!urun) return
    onChange({
      ...satir,
      urun_ad:  ad,
      urun_id:  urun.id,
      urun_tip: urun._tip,
      tur:      urun._turEtiket,
      doz:      urun.doz_min || '',
      birim:    urun.doz_birimi?.split('/')[0] || 'ml',
      baz:      urun._baz || '100L',
      yontem:   urun.uygulama_yontemi || 'Yapraktan',
      toplam:   hesaplaTopam(urun.doz_min, urun._baz || '100L', urun.doz_birimi?.split('/')[0] || 'ml', alanDekar),
    })
  }

  const guncelle = (alan, deger) => {
    const yeni = { ...satir, [alan]: deger }
    if (['doz','baz','birim'].includes(alan)) {
      yeni.toplam = hesaplaTopam(yeni.doz, yeni.baz, yeni.birim, alanDekar)
    }
    onChange(yeni)
  }

  const etkenMadde = satir.urun_ad && katalogIndex[satir.urun_ad]
    ? (katalogIndex[satir.urun_ad].etken_maddeler || []).map(e => e.etken_madde_ad).filter(Boolean).join(', ')
    : ''

  return (
    <tr>
      <td style={s.td}>
        <select
          style={{...s.tdGirdi, width:'130px', fontSize:'11px', color: turFiltre ? '#1a7a4a' : '#aaa'}}
          value={turFiltre}
          onChange={e => { setTurFiltre(e.target.value); onChange({ ...satir, urun_ad: '', urun_id: '', urun_tip: '', tur: '' }) }}
        >
          <option value="">— Tür —</option>
          {turler.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </td>
      <td style={s.td}>
        <input
          list={`dl-${satir._id}`}
          style={s.tdGirdi}
          placeholder="İlaç / gübre adı…"
          value={satir.urun_ad}
          onChange={e => {
            onChange({ ...satir, urun_ad: e.target.value, urun_id: '', urun_tip: '' })
            autofill(e.target.value)
          }}
        />
        <datalist id={`dl-${satir._id}`}>
          {filtreliAnahtar.map(k => <option key={k} value={k} />)}
        </datalist>
      </td>
      <td style={s.td}>
        <input style={{...s.tdGirdi, color:'#666', background:'#fafafa', minWidth:'100px'}}
          value={etkenMadde} readOnly placeholder="—" />
      </td>
      <td style={s.td}>
        <input style={{...s.tdGirdi, width:'60px'}} type="number" placeholder="—"
          value={satir.doz} onChange={e => guncelle('doz', e.target.value)} step="0.1" min="0" />
      </td>
      <td style={s.td}>
        <select style={{...s.tdGirdi, width:'56px'}}
          value={satir.birim} onChange={e => guncelle('birim', e.target.value)}>
          <option>ml</option><option>cc</option><option>gr</option><option>L</option><option>kg</option>
        </select>
      </td>
      <td style={s.td}>
        <select style={{...s.tdGirdi, width:'110px', fontSize:'11px', color:'#888'}}
          value={satir.baz} onChange={e => guncelle('baz', e.target.value)}
          title="Toplam hesap bazı: 100 L suya → her 100 litre suya bu kadar ürün. Dekar → doğrudan dekara göre.">
          <option value="100L">/ 100 L suya</option>
          <option value="1000L">/ ton suya</option>
          <option value="dekar">/ dekar</option>
          <option value="m2">/ m²</option>
          <option value="sabit">sabit</option>
        </select>
      </td>
      <td style={{...s.td, background:'#f9fafb'}}>
        <input style={{...s.tdGirdi, width:'80px'}} value={satir.toplam || '—'} readOnly />
      </td>
      <td style={s.td}>
        <select style={{...s.tdGirdi, width:'100px'}}
          value={satir.yontem} onChange={e => guncelle('yontem', e.target.value)}>
          <option>Yapraktan</option><option>Damla</option>
          <option>Sulama Suyu</option><option>Toprak</option>
        </select>
      </td>
      <td style={s.td}>
        <input style={{...s.tdGirdi, minWidth:'100px'}}
          placeholder="Not…"
          value={satir.not || ''}
          onChange={e => guncelle('not', e.target.value)} />
      </td>
      <td style={s.td}>
        <button style={s.silBtn} onClick={onSil}>✕</button>
      </td>
    </tr>
  )
}

// ─── 💧 Sulama dönemleri bölümü ───
function SulamaBolum({ donemler, setDonemler, katalogIndex, alanDekar }) {
  const [acik, setAcik] = useState(true)

  const donemEkle = () => {
    setDonemler(prev => [...prev, {
      _id: uid(),
      tarih: '',
      satirlar: [{ _id: uid(), urun_ad:'', urun_id:'', urun_tip:'', tur:'', doz:'', birim:'ml', baz:'100L', toplam:'', yontem:'Yapraktan' }]
    }])
  }

  const donemGuncelle = (id, yeni) =>
    setDonemler(prev => prev.map(d => d._id === id ? yeni : d))

  const donemSil = (id) =>
    setDonemler(prev => prev.filter(d => d._id !== id))

  const donemKopyala = (donem) => {
    setDonemler(prev => {
      const idx = prev.findIndex(d => d._id === donem._id)
      const kopya = {
        _id: uid(),
        tarih: donem.tarih,
        satirlar: donem.satirlar.map(s => ({ ...s, _id: uid() })),
      }
      const yeni = [...prev]
      yeni.splice(idx + 1, 0, kopya)
      return yeni
    })
  }

  const satirEkle = (donemId) => {
    setDonemler(prev => prev.map(d => d._id === donemId
      ? { ...d, satirlar: [...d.satirlar, { _id: uid(), urun_ad:'', urun_id:'', urun_tip:'', tur:'', doz:'', birim:'ml', baz:'100L', toplam:'', yontem:'Yapraktan' }] }
      : d
    ))
  }

  const satirGuncelle = (donemId, satirId, yeni) => {
    setDonemler(prev => prev.map(d => d._id === donemId
      ? { ...d, satirlar: d.satirlar.map(r => r._id === satirId ? yeni : r) }
      : d
    ))
  }

  const satirSil = (donemId, satirId) => {
    setDonemler(prev => prev.map(d => d._id === donemId
      ? { ...d, satirlar: d.satirlar.filter(r => r._id !== satirId) }
      : d
    ))
  }

  return (
    <Bolum ikon="💧" baslik={`Sulama & İlaçlama Dönemleri${donemler.length ? ` (${donemler.length})` : ''}`}
      acik={acik} onToggle={() => setAcik(a => !a)}
      onEkle={donemEkle} ekleEtiket="Su Ekle">

      {donemler.length === 0 && (
        <p style={s.bosMetin}>Henüz dönem yok — + Dönem Ekle ile başla.</p>
      )}

      {donemler.map((d, i) => (
        <div key={d._id} style={s.donemKutu}>
          <div style={s.donemUst}>
            <span style={s.donemNo}>💧 {i+1}. Su</span>
            <input type="date" style={s.donemTarih} value={d.tarih}
              placeholder="Uygulama tarihi"
              onChange={e => donemGuncelle(d._id, { ...d, tarih: e.target.value })} />
            {donemler.length > 1 && (
              <>
                <button style={s.kopyalaBtn} onClick={() => donemKopyala(d)}>⧉ Kopyala</button>
                <button style={s.silBtn} onClick={() => donemSil(d._id)}>✕ Sil</button>
              </>
            )}
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={s.tablo}>
              <thead>
                <tr>
                  {['Tür','İlaç / Gübre','Etken Madde','Doz','Birim','Baz','İşletme Toplam','Uygulama','Not',''].map(h => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {d.satirlar.map(r => (
                  <DonemSatiri key={r._id} satir={r}
                    katalogIndex={katalogIndex} alanDekar={alanDekar}
                    onChange={yeni => satirGuncelle(d._id, r._id, yeni)}
                    onSil={() => satirSil(d._id, r._id)} />
                ))}
              </tbody>
            </table>
          </div>

          <div style={s.donemAlt}>
            <button style={s.satirEkleBtn} onClick={() => satirEkle(d._id)}>
              + İlaç / Gübre Ekle
            </button>
          </div>
        </div>
      ))}
    </Bolum>
  )
}

// ─── 🌿 Kültürel Önlemler ───
function KulturelBolum({ items, setItems }) {
  const [acik, setAcik] = useState(true)
  const ekle = () => setItems(p => [...p, { _id: uid(), metin: '' }])
  const guncelle = (id, metin) => setItems(p => p.map(x => x._id === id ? { ...x, metin } : x))
  const sil = (id) => setItems(p => p.filter(x => x._id !== id))

  return (
    <Bolum ikon="🌿" baslik={`Kültürel Önlemler${items.length ? ` (${items.length})` : ''}`}
      acik={acik} onToggle={() => setAcik(a => !a)}
      onEkle={ekle} ekleEtiket="Önlem Ekle">

      {items.length === 0 && (
        <p style={s.bosMetin}>Budama, havalandırma, sulama sıklığı vb. — + Önlem Ekle ile başla.</p>
      )}

      <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
        {items.map((x, i) => (
          <div key={x._id} style={s.satirSatir}>
            <span style={s.satirNo}>{i+1}.</span>
            <input style={{ ...s.girdi, flex:1 }}
              placeholder="Örn: Alt yaprakları temizle, gece havalandırmasını artır"
              value={x.metin}
              onChange={e => guncelle(x._id, e.target.value)} />
            <button style={s.silBtn} onClick={() => sil(x._id)}>✕</button>
          </div>
        ))}
      </div>
    </Bolum>
  )
}

// ─── 🐞 Biyolojik Mücadele ───
function BiyolojikBolum({ items, setItems }) {
  const [acik, setAcik] = useState(true)
  const ekle = () => setItems(p => [...p, { _id: uid(), ajan:'', doz:'', alan:'', yontem:'' }])
  const guncelle = (id, alan, deger) => setItems(p => p.map(x => x._id === id ? { ...x, [alan]: deger } : x))
  const sil = (id) => setItems(p => p.filter(x => x._id !== id))

  return (
    <Bolum ikon="🐞" baslik={`Biyolojik Mücadele${items.length ? ` (${items.length})` : ''}`}
      acik={acik} onToggle={() => setAcik(a => !a)}
      onEkle={ekle} ekleEtiket="Ajan Ekle">

      {items.length === 0 && (
        <p style={s.bosMetin}>Faydalı böcek, tuzak, feromon vb. — + Ajan Ekle ile başla.</p>
      )}

      <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
        {items.map((x, i) => (
          <div key={x._id} style={s.biyoSatir}>
            <span style={s.satirNo}>{i+1}.</span>
            <div style={s.biyoGruplar}>
              <div style={s.biyoAlan}>
                <label style={s.miniEtiket}>Ajan Adı</label>
                <input style={s.girdi} placeholder="Phytoseiulus persimilis"
                  value={x.ajan} onChange={e => guncelle(x._id, 'ajan', e.target.value)} />
              </div>
              <div style={s.biyoAlan}>
                <label style={s.miniEtiket}>Doz</label>
                <input style={s.girdi} placeholder="50 adet/100m²"
                  value={x.doz} onChange={e => guncelle(x._id, 'doz', e.target.value)} />
              </div>
              <div style={s.biyoAlan}>
                <label style={s.miniEtiket}>Uygulama Alanı</label>
                <input style={s.girdi} placeholder="Tüm sera"
                  value={x.alan} onChange={e => guncelle(x._id, 'alan', e.target.value)} />
              </div>
              <div style={s.biyoAlan}>
                <label style={s.miniEtiket}>Yöntem</label>
                <input style={s.girdi} placeholder="Salım, asma vb."
                  value={x.yontem} onChange={e => guncelle(x._id, 'yontem', e.target.value)} />
              </div>
            </div>
            <button style={s.silBtn} onClick={() => sil(x._id)}>✕</button>
          </div>
        ))}
      </div>
    </Bolum>
  )
}

// ─── 📋 Takip Noktaları ───
function TakipBolum({ items, setItems }) {
  const [acik, setAcik] = useState(true)
  const ekle = () => setItems(p => [...p, { _id: uid(), tarih:'', aciklama:'' }])
  const guncelle = (id, alan, deger) => setItems(p => p.map(x => x._id === id ? { ...x, [alan]: deger } : x))
  const sil = (id) => setItems(p => p.filter(x => x._id !== id))

  return (
    <Bolum ikon="📋" baslik={`Takip Noktaları${items.length ? ` (${items.length})` : ''}`}
      acik={acik} onToggle={() => setAcik(a => !a)}
      onEkle={ekle} ekleEtiket="Takip Ekle">

      {items.length === 0 && (
        <p style={s.bosMetin}>Kontrol tarihleri ve yapılacaklar — + Takip Ekle ile başla.</p>
      )}

      <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
        {items.map((x, i) => (
          <div key={x._id} style={s.satirSatir}>
            <span style={s.satirNo}>{i+1}.</span>
            <input type="date" style={{ ...s.girdi, width:'140px', flexShrink:0 }}
              value={x.tarih} onChange={e => guncelle(x._id, 'tarih', e.target.value)} />
            <input style={{ ...s.girdi, flex:1 }}
              placeholder="Örn: 7. gün — yeni leke oluşumu, etkinlik değerlendirmesi"
              value={x.aciklama} onChange={e => guncelle(x._id, 'aciklama', e.target.value)} />
            <button style={s.silBtn} onClick={() => sil(x._id)}>✕</button>
          </div>
        ))}
      </div>
    </Bolum>
  )
}

// ─── ANA BİLEŞEN ───
export default function ReceteYaz() {
  const navigate = useNavigate()
  const { isMobile } = useBreakpoint()
  const [searchParams] = useSearchParams()
  const [isletmeler,  setIsletmeler]  = useState([])
  const [katalogIndex, setKatalogIndex] = useState({})
  const [kaydediyor,  setKaydediyor]  = useState(false)
  const [hata,        setHata]        = useState('')
  const [hataliAlanlar, setHataliAlanlar] = useState({})
  const [toprakAcik,  setToprakAcik]  = useState(false)
  const [toprakVeriler, setToprakVeriler] = useState([])
  const autoSaveRef = useRef(null)

  const isletmeParam = searchParams.get('isletme') || ''
  const LS_KEY = `recete_taslak_${isletmeParam}`

  // Temel form — localStorage'dan geri yükle yoksa varsayılan
  const [form, setForm] = useState(() => {
    try {
      const kayitli = JSON.parse(localStorage.getItem(LS_KEY) || '{}')
      return {
        isletme: isletmeParam,
        tani: kayitli.tani || '',
        tarih: kayitli.tarih || new Date().toISOString().slice(0,10),
        durum: kayitli.durum || 'taslak',
        ciftciye_not: kayitli.ciftciye_not || '',
      }
    } catch { return { isletme: isletmeParam, tani: '', tarih: new Date().toISOString().slice(0,10), durum: 'taslak', ciftciye_not: '' } }
  })

  // Bölümler — localStorage'dan geri yükle
  const [donemler,   setDonemler]  = useState(() => { try { return JSON.parse(localStorage.getItem(LS_KEY+'_donem') || 'null') || [] } catch { return [] } })
  const [kulturel,   setKulturel]  = useState(() => { try { return JSON.parse(localStorage.getItem(LS_KEY+'_kultur') || '[]') } catch { return [] } })
  const [biyolojik,  setBiyolojik] = useState(() => { try { return JSON.parse(localStorage.getItem(LS_KEY+'_biyo') || '[]') } catch { return [] } })
  const [takip,      setTakip]     = useState(() => { try { return JSON.parse(localStorage.getItem(LS_KEY+'_takip') || '[]') } catch { return [] } })

  // Seçili işletmenin alan_dekar değeri
  const seciliIsletme = isletmeler.find(d => String(d.isletme.id) === String(form.isletme))
  const alanDekar = parseFloat(seciliIsletme?.isletme?.alan_dekar) || 0

  // Auto-save — her değişiklikte 1.5sn debounce ile localStorage'a yaz
  useEffect(() => {
    clearTimeout(autoSaveRef.current)
    autoSaveRef.current = setTimeout(() => {
      localStorage.setItem(LS_KEY, JSON.stringify(form))
      localStorage.setItem(LS_KEY+'_donem', JSON.stringify(donemler))
      localStorage.setItem(LS_KEY+'_kultur', JSON.stringify(kulturel))
      localStorage.setItem(LS_KEY+'_biyo', JSON.stringify(biyolojik))
      localStorage.setItem(LS_KEY+'_takip', JSON.stringify(takip))
    }, 1500)
    return () => clearTimeout(autoSaveRef.current)
  }, [form, donemler, kulturel, biyolojik, takip, LS_KEY])

  useEffect(() => {
    api.get('/ciftci/danisanlarim/').then(r => setIsletmeler(r.data)).catch(() => {})

    Promise.all([
      api.get('/katalog/ilaclar/'),
      api.get('/katalog/gubreler/'),
    ]).then(([ilRes, guRes]) => {
      const index = {}
      ilRes.data.forEach(x => {
        index[x.ticari_ad] = {
          ...x, _tip: 'ilac', _turEtiket: x.kategori,
          _baz: x.uygulama_yontemi?.includes('damla') ? 'dekar' : '100L',
        }
      })
      guRes.data.forEach(x => {
        index[x.ticari_ad] = {
          ...x, _tip: 'gubre', _turEtiket: x.tur,
          _baz: 'dekar',
        }
      })
      setKatalogIndex(index)
    }).catch(() => {})

    // Dönem yoksa başlangıç dönemi oluştur
    setDonemler(prev => prev.length > 0 ? prev : [{
      _id: uid(), tarih: new Date().toISOString().slice(0,10),
      satirlar: [{ _id: uid(), urun_ad:'', urun_id:'', urun_tip:'', tur:'', doz:'', birim:'ml', baz:'100L', toplam:'', yontem:'Yapraktan' }]
    }])
  }, [])

  const degis = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const toprakAnalizPdf = async (isl) => {
    const isletme = isl.isletme
    let analizler = []
    try {
      const res = await api.get(`/ciftci/isletme/${isletme.id}/toprak-analiz/`)
      analizler = res.data
    } catch { /* yok */ }

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Toprak Analizi — ${isletme.ad}</title>
<style>
  body { font-family: Arial, sans-serif; padding: 32px; color: #222; }
  h1 { color: #1a7a4a; font-size: 1.4rem; margin-bottom: 4px; }
  .meta { color: #888; font-size: 0.9rem; margin-bottom: 24px; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; }
  th { background: #e8f5ee; color: #1a7a4a; padding: 8px 12px; text-align: left; font-size: 0.85rem; }
  td { padding: 8px 12px; border-bottom: 1px solid #eee; font-size: 0.9rem; }
  .bos { color: #aaa; font-style: italic; margin-top: 24px; }
  .notlar { margin-top: 12px; padding: 10px; background: #f9f9f9; border-radius: 6px; font-size: 0.85rem; }
  @media print { body { padding: 16px; } button { display: none; } }
</style></head><body>
<h1>🧪 Toprak Analizi Raporu</h1>
<div class="meta">
  🏢 ${isletme.ad} &nbsp;|&nbsp;
  👨‍🌾 ${isl.ciftci_ad || ''} ${isl.ciftci_soyad || ''} &nbsp;|&nbsp;
  🌱 ${isletme.urun_ad || '—'}${isletme.cesit_ad ? ' - ' + isletme.cesit_ad : ''} &nbsp;|&nbsp;
  📏 ${isletme.alan_dekar ? parseFloat(isletme.alan_dekar) : '—'} da
</div>
${analizler.length === 0
  ? '<p class="bos">Bu işletme için toprak analizi girilmemiş.</p>'
  : analizler.map(a => `
    <h3 style="color:#1a7a4a;font-size:1rem;margin:20px 0 6px">📅 Analiz Tarihi: ${a.tarih}</h3>
    <table>
      <tr><th>Parametre</th><th>Değer</th></tr>
      ${a.ph != null ? `<tr><td>pH</td><td>${a.ph}</td></tr>` : ''}
      ${a.organik_madde != null ? `<tr><td>Organik Madde</td><td>${a.organik_madde} %</td></tr>` : ''}
      ${a.fosfor != null ? `<tr><td>Fosfor</td><td>${a.fosfor} kg/da</td></tr>` : ''}
      ${a.potasyum != null ? `<tr><td>Potasyum</td><td>${a.potasyum} kg/da</td></tr>` : ''}
      ${a.kalsiyum != null ? `<tr><td>Kalsiyum</td><td>${a.kalsiyum} kg/da</td></tr>` : ''}
      ${a.magnezyum != null ? `<tr><td>Magnezyum</td><td>${a.magnezyum} kg/da</td></tr>` : ''}
      ${a.tuz != null ? `<tr><td>Tuz</td><td>${a.tuz} %</td></tr>` : ''}
    </table>
    ${a.notlar ? `<div class="notlar">📝 ${a.notlar}</div>` : ''}
  `).join('')
}
<br><button onclick="window.print()">🖨️ Yazdır / PDF Kaydet</button>
</body></html>`

    const w = window.open('', '_blank')
    w.document.write(html)
    w.document.close()
  }

  const kaydet = async () => {
    const hatalar = {}
    if (!form.isletme) hatalar.isletme = true
    if (!form.tarih)   hatalar.tarih   = true
    if (Object.keys(hatalar).length) {
      setHataliAlanlar(hatalar)
      setHata('Kırmızı alanları doldurun.')
      return
    }
    setHataliAlanlar({})
    setHata('')
    setKaydediyor(true)
    try {
      // 1) Reçete oluştur
      const rec = await api.post('/recete/', {
        isletme:          form.isletme,
        tani:             form.tani,
        tarih:            form.tarih,
        uygulama_yontemi: 'Karma uygulama',
        durum:            form.durum,
        ciftciye_not:     form.ciftciye_not,
      })
      const rid = rec.data.id
      let sira  = 1

      // 2) Sulama dönemleri
      for (const donem of donemler) {
        const dolulular = donem.satirlar.filter(r => r.urun_id)
        if (!dolulular.length) continue
        await api.post(`/recete/${rid}/adimlar/`, {
          sira_no:         sira++,
          tip:             'ilaclama',
          tanim:           `${sira-1}. Sulama Dönemi`,
          uygulama_tarihi: donem.tarih || null,
          notlar:          '[sulama]',
          kalemler: dolulular.map(r => ({
            ilac:      r.urun_tip === 'ilac'   ? r.urun_id : null,
            gubre:     r.urun_tip === 'gubre'  ? r.urun_id : null,
            doz_dekar: r.doz || 0,
            birim:     r.birim || 'ml',
          })),
        })
      }

      // 3) Kültürel önlemler
      for (const item of kulturel) {
        if (!item.metin.trim()) continue
        await api.post(`/recete/${rid}/adimlar/`, {
          sira_no: sira++, tip: 'diger',
          tanim: item.metin, notlar: '[kültürel]', kalemler: [],
        })
      }

      // 4) Biyolojik mücadele
      for (const item of biyolojik) {
        if (!item.ajan.trim()) continue
        await api.post(`/recete/${rid}/adimlar/`, {
          sira_no: sira++, tip: 'diger',
          tanim: item.ajan,
          notlar: `[biyolojik] doz:${item.doz} alan:${item.alan} yöntem:${item.yontem}`,
          kalemler: [],
        })
      }

      // 5) Takip noktaları
      for (const item of takip) {
        if (!item.aciklama.trim()) continue
        await api.post(`/recete/${rid}/adimlar/`, {
          sira_no:         sira++,
          tip:             'diger',
          tanim:           item.aciklama,
          uygulama_tarihi: item.tarih || null,
          notlar:          '[takip]',
          kalemler:        [],
        })
      }

      localStorage.removeItem(LS_KEY)
      localStorage.removeItem(LS_KEY+'_donem')
      localStorage.removeItem(LS_KEY+'_kultur')
      localStorage.removeItem(LS_KEY+'_biyo')
      localStorage.removeItem(LS_KEY+'_takip')
      navigate('/muhendis/receteler')
    } catch (err) {
      setHata(err.response?.data ? JSON.stringify(err.response.data) : 'Kayıt başarısız.')
      setKaydediyor(false)
    }
  }

  return (
    <div style={{ ...s.sayfa, padding: isMobile ? '1rem' : '1.5rem 2rem' }}>
      {/* Üst bar */}
      <div style={s.ustBar}>
        <button style={s.geriBtn} onClick={() => navigate('/muhendis/receteler')}>
          ← Reçeteler
        </button>
        <h2 style={s.baslik}>Yeni Reçete</h2>
        <button style={s.kaydetBtn} onClick={kaydet} disabled={kaydediyor}>
          {kaydediyor ? 'Kaydediliyor…' : '💾 Kaydet'}
        </button>
      </div>

      {/* Temel bilgiler */}
      <div style={s.temelKart}>
        <div style={s.temelGrid}>
          <div style={{...s.alan, gridColumn:'span 3'}}>
            <label style={s.etiket}>İşletme *</label>
            {searchParams.get('isletme') ? (
              (() => {
                const isl = seciliIsletme?.isletme
                const emoji = urunEmoji(isl?.urun_ad, isl?.cesit_ad)
                const dikimGun = isl?.ekim_tarihi
                  ? Math.floor((Date.now() - new Date(isl.ekim_tarihi)) / 86400000)
                  : null
                return (
                  <div style={s.isletmeKart}>
                    <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'8px'}}>
                      <p style={{...s.isletmeBaslikMetin, margin:0}}>
                        {emoji}{' '}
                        [ 🏢 {isl?.ad || '—'} ] 👨‍🌾 {seciliIsletme?.ciftci_ad} {seciliIsletme?.ciftci_soyad}
                        {'  -----  '}
                        🌱 {isl?.urun_ad || '—'}{isl?.cesit_ad ? ` - ${isl.cesit_ad}` : ''}
                        {isl?.alan_dekar ? `  📏 ${parseFloat(isl.alan_dekar)} da` : ''}
                        {dikimGun !== null ? `  ⏳ ${dikimGun} günlük` : ''}
                        {isl?.enlem && isl?.boylam && <>{' '}<a href={`https://maps.google.com/?q=${isl.enlem},${isl.boylam}`} target="_blank" rel="noreferrer" style={{color:'#1a7a4a'}}>📍 GPS</a></>}
                      </p>
                      <button style={s.toprakMiniBtn} onClick={async () => {
                        if (!toprakAcik) {
                          try {
                            const res = await api.get(`/ciftci/isletme/${isl.id}/toprak-analiz/`)
                            const sirali = [...(res.data || [])].sort((a,b) => b.tarih.localeCompare(a.tarih))
                            setToprakVeriler(sirali)
                          } catch { setToprakVeriler([]) }
                        }
                        setToprakAcik(p => !p)
                      }}>
                        🧪 Toprak Analizi {toprakAcik ? '▲' : '▼'}
                      </button>
                    </div>
                    {toprakAcik && (
                      <div style={s.toprakPanel}>
                        {toprakVeriler.length === 0
                          ? <p style={{color:'#aaa', fontSize:'0.82rem', margin:0}}>Toprak analizi girilmemiş.</p>
                          : toprakVeriler.map((a, i) => (
                            <div key={i} style={s.toprakSatir}>
                              <span style={s.toprakTarih}>📅 {a.tarih}</span>
                              <span>pH: <b>{a.ph ?? '—'}</b></span>
                              <span>OM: <b>{a.organik_madde ?? '—'}%</b></span>
                              <span>P: <b>{a.fosfor ?? '—'}</b></span>
                              <span>K: <b>{a.potasyum ?? '—'}</b></span>
                              <span>Tuz: <b>{a.tuz ?? '—'}</b></span>
                            </div>
                          ))
                        }
                      </div>
                    )}
                  </div>
                )
              })()
            ) : (
              <select name="isletme" value={form.isletme} onChange={degis} style={s.girdi}>
                <option value="">Seçin...</option>
                {isletmeler.map(d => (
                  <option key={d.isletme.id} value={d.isletme.id}>
                    {d.isletme.ad}
                    {d.isletme.alan_dekar ? ` — ${parseFloat(d.isletme.alan_dekar)} da` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div style={{...s.alan, gridColumn:'span 3', flexDirection:'row', alignItems:'center', gap:'8px', flexWrap:'wrap'}}>
            <div style={{display:'flex', alignItems:'center', gap:'4px'}}>
              <label style={{...s.etiket, margin:0, fontSize:'0.78rem'}}>Tarih *</label>
              <input type="date" name="tarih" value={form.tarih} onChange={degis}
                style={{...s.girdi, fontSize:'0.78rem', padding:'4px 6px', width:'130px', ...(hataliAlanlar.tarih ? s.hataliGirdi : {})}} />
            </div>
            <div style={{display:'flex', alignItems:'center', gap:'4px'}}>
              <label style={{...s.etiket, margin:0, fontSize:'0.78rem'}}>Durum</label>
              <select name="durum" value={form.durum} onChange={degis} style={{...s.girdi, fontSize:'0.78rem', padding:'4px 6px', width:'110px'}}>
                <option value="taslak">Taslak</option>
                <option value="onaylandi">Onaylandı</option>
              </select>
            </div>
          </div>

          <div style={{...s.alan, gridColumn:'span 3'}}>
            <label style={s.etiket}>Tanı / Problem</label>
            <input name="tani" value={form.tani} onChange={degis} style={s.girdi}
              placeholder="Örn: Külleme hastalığı, kırmızı örümcek, demir eksikliği…" />
          </div>

          <div style={{...s.alan, gridColumn:'span 3'}}>
            <label style={s.etiket}>Çiftçiye Not</label>
            <textarea name="ciftciye_not" value={form.ciftciye_not} onChange={degis}
              style={{...s.girdi, height:'56px', resize:'vertical'}}
              placeholder="Uygulamada dikkat edilecek hususlar…" />
          </div>
        </div>
      </div>

      {/* 4 bölüm */}
      <SulamaBolum
        donemler={donemler} setDonemler={setDonemler}
        katalogIndex={katalogIndex} alanDekar={alanDekar} />

      <KulturelBolum  items={kulturel}  setItems={setKulturel} />
      <BiyolojikBolum items={biyolojik} setItems={setBiyolojik} />
      <TakipBolum     items={takip}     setItems={setTakip} />


      {/* Alt bar */}
      {hata && <p style={s.hata}>{hata}</p>}
      <div style={s.altBar}>
        <button style={s.iptalBtn} onClick={() => navigate('/muhendis/receteler')}>Vazgeç</button>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            style={s.ziyaretBtn}
            onClick={() => navigate(`/muhendis/takvim${form.isletme ? `?isletme=${form.isletme}` : ''}`)}
            disabled={kaydediyor}
          >
            📅 Ziyaret Ekle
          </button>
          <button style={s.kaydetBtn} onClick={kaydet} disabled={kaydediyor}>
            {kaydediyor ? 'Kaydediliyor…' : '💾 Reçeteyi Kaydet'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── STİLLER ───
const s = {
  sayfa:     { padding:'1.5rem 2rem', maxWidth:'860px', margin:'0 auto' },
  ustBar:    { display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1.25rem' },
  baslik:    { fontSize:'1.3rem', fontWeight:'600', color:'#1a7a4a', margin:0 },
  geriBtn:   { background:'none', border:'none', cursor:'pointer', color:'#888', fontSize:'0.9rem', padding:'6px 0' },
  kaydetBtn: { padding:'9px 22px', background:'#1a7a4a', color:'#fff', border:'none', borderRadius:'8px', cursor:'pointer', fontSize:'0.9rem', fontWeight:'600' },
  iptalBtn:  { padding:'9px 18px', background:'#f0f0f0', color:'#555', border:'none', borderRadius:'8px', cursor:'pointer', fontSize:'0.9rem' },
  toprakBar: { margin:'12px 0', display:'flex' },
  toprakBtn: { padding:'9px 20px', background:'#fff', color:'#1a7a4a', border:'1px solid #c8e6d4', borderRadius:'8px', cursor:'pointer', fontSize:'0.9rem', fontWeight:'500' },
  toprakMiniBtn: { padding:'4px 10px', background:'#f0faf5', color:'#1a7a4a', border:'1px solid #c8e6d4', borderRadius:'6px', cursor:'pointer', fontSize:'0.78rem', fontWeight:'500', whiteSpace:'nowrap' },
  toprakPanel: { marginTop:'8px', background:'#f8fdf9', border:'1px solid #e0ede6', borderRadius:'6px', padding:'8px 10px', display:'flex', flexDirection:'column', gap:'4px' },
  toprakSatir: { display:'flex', gap:'12px', flexWrap:'wrap', fontSize:'0.8rem', color:'#444', borderBottom:'1px solid #eef4f1', paddingBottom:'4px' },
  toprakTarih: { color:'#1a7a4a', fontWeight:'600', minWidth:'90px' },
  ziyaretBtn: { padding:'9px 18px', background:'#f0f0f0', color:'#1a7a4a', border:'1px solid #c8e6d4', borderRadius:'8px', cursor:'pointer', fontSize:'0.9rem', fontWeight:'500' },

  temelKart: { background:'#fff', border:'1px solid #e8e8e8', borderRadius:'12px', padding:'1.25rem', marginBottom:'10px' },
  temelGrid: { display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'10px' },
  alan:      { display:'flex', flexDirection:'column', gap:'4px' },
  etiket:    { fontSize:'0.8rem', color:'#666', fontWeight:'500' },
  girdi:      { padding:'7px 10px', border:'1px solid #ddd', borderRadius:'7px', fontSize:'0.88rem', outline:'none', width:'100%', boxSizing:'border-box', fontFamily:'inherit' },
  hataliGirdi:{ border:'2px solid #e53e3e', background:'#fff5f5' },
  kopyalaBtn: { padding:'3px 10px', background:'#f0f4ff', color:'#3b5bdb', border:'1px solid #c5d0fa', borderRadius:'5px', cursor:'pointer', fontSize:'0.78rem' },
  sabitIsletme: { padding:'7px 10px', border:'1px solid #e0ede6', borderRadius:'7px', fontSize:'0.88rem', background:'#f8fdf9', color:'#1a7a4a', fontWeight:'500' },
  isletmeKart:  { padding:'10px 14px', background:'#f8fdf9', border:'1px solid #d0eada', borderRadius:'10px' },
  isletmeBaslikMetin: { margin:0, fontSize:'0.9rem', lineHeight:'1.6', color:'#333' },
  isletmeEmoji: { fontSize:'2.2rem', width:'48px', height:'48px', display:'flex', alignItems:'center', justifyContent:'center', background:'#fff', borderRadius:'10px', border:'1px solid #eee', flexShrink:0 },
  isletmeBilgi: { flex:1 },
  isletmeAd:    { margin:0, fontWeight:'600', fontSize:'1rem', color:'#1a1a1a' },
  isletmeAlt:   { margin:'3px 0 0', fontSize:'0.83rem', color:'#666' },
  miniEtiket:{ fontSize:'0.75rem', color:'#999', marginBottom:'2px' },

  // bölüm
  bolum:      { background:'#fff', border:'1px solid #e8e8e8', borderRadius:'12px', marginBottom:'10px', overflow:'hidden' },
  bolumUst:   { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 14px 0 0' },
  bolumToggle:{ flex:1, display:'flex', alignItems:'center', gap:'8px', padding:'12px 16px', background:'none', border:'none', cursor:'pointer', textAlign:'left', fontFamily:'inherit' },
  bolumIkon:  { fontSize:'16px' },
  bolumBaslik:{ fontSize:'0.95rem', fontWeight:'600', color:'#1a7a4a' },
  bolumOk:    { fontSize:'10px', color:'#aaa', marginLeft:'4px' },
  ekleBtn:    { padding:'5px 12px', background:'#e8f5ee', color:'#1a7a4a', border:'none', borderRadius:'6px', cursor:'pointer', fontSize:'0.82rem', fontWeight:'600', flexShrink:0 },
  bolumIcerik:{ padding:'0 14px 14px', borderTop:'1px solid #f0f0f0' },
  bosMetin:   { color:'#bbb', fontSize:'0.85rem', padding:'12px 0 4px', fontStyle:'italic' },

  // sulama tablosu
  donemKutu:  { border:'1px solid #e8e8e8', borderRadius:'10px', overflow:'hidden', marginTop:'10px' },
  donemUst:   { display:'flex', alignItems:'center', gap:'10px', padding:'8px 12px', background:'#f0faf4', borderBottom:'1px solid #e8e8e8' },
  donemNo:    { fontWeight:'600', color:'#1a7a4a', fontSize:'0.88rem' },
  donemTarih: { padding:'4px 8px', border:'1px solid #ddd', borderRadius:'6px', fontSize:'0.82rem', marginLeft:'auto' },
  donemAlt:   { padding:'8px 12px', borderTop:'1px dashed #e8e8e8', background:'#fafcfa' },
  satirEkleBtn:{ padding:'4px 12px', background:'#e8f5ee', color:'#1a7a4a', border:'none', borderRadius:'6px', cursor:'pointer', fontSize:'0.82rem' },
  tablo:      { width:'100%', borderCollapse:'collapse' },
  th:         { padding:'7px 8px', fontSize:'10px', fontWeight:'700', color:'#999', textAlign:'left', background:'#fafbfa', borderBottom:'1px solid #e8e8e8', whiteSpace:'nowrap', textTransform:'uppercase', letterSpacing:'0.3px' },
  td:         { padding:'5px 6px', borderBottom:'1px solid #f0f0f0', verticalAlign:'middle' },
  tdGirdi:    { padding:'5px 7px', border:'1px solid #e8e8e8', borderRadius:'6px', fontSize:'0.82rem', outline:'none', width:'100%', boxSizing:'border-box', fontFamily:'inherit' },
  silBtn:     { background:'none', border:'none', cursor:'pointer', color:'#ccc', fontSize:'1rem', padding:'0 4px', lineHeight:1 },

  // kültürel / takip satırı
  satirSatir: { display:'flex', alignItems:'center', gap:'8px' },
  satirNo:    { fontSize:'0.82rem', color:'#bbb', minWidth:'18px', textAlign:'right' },

  // biyolojik
  biyoSatir:  { display:'flex', alignItems:'flex-start', gap:'8px' },
  biyoGruplar:{ flex:1, display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr', gap:'6px' },
  biyoAlan:   { display:'flex', flexDirection:'column', gap:'2px' },

  hata:  { color:'#e53e3e', fontSize:'0.85rem', margin:'4px 0 8px' },
  altBar:{ display:'flex', justifyContent:'flex-end', gap:'8px', paddingTop:'12px', borderTop:'1px solid #f0f0f0', marginTop:'8px' },
}
