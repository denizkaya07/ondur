/* eslint react/prop-types: 0 */
import { useEffect, useState, useRef } from 'react'
import PropTypes from 'prop-types'
import * as XLSX from 'xlsx'
import api from '../../services/api'
import useBreakpoint from '../../hooks/useBreakpoint'

const ILAC_EXCEL_SUTUNLAR = ['ticari_ad','kategori','formulasyon','ruhsat_no','phi_gun','endikasyon','doz_min','doz_max','doz_birimi','uygulama_yontemi','ambalaj_hacmi','ambalaj_birimi','ambalaj_birim']
const GUBRE_EXCEL_SUTUNLAR = ['ticari_ad','tur','formulasyon','doz_min','doz_max','doz_birimi','uygulama_yontemi','ambalaj_hacmi','ambalaj_birimi','ambalaj_birim']

function excelSikayet(tip) {
  const sutunlar = tip === 'ilac' ? ILAC_EXCEL_SUTUNLAR : GUBRE_EXCEL_SUTUNLAR
  const ws = XLSX.utils.aoa_to_sheet([sutunlar])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, tip === 'ilac' ? 'İlaçlar' : 'Gübreler')
  XLSX.writeFile(wb, `${tip}_sablonu.xlsx`)
}

async function excelYukle(tip, dosya, api, onBitti, onHata) {
  const sutunlar = tip === 'ilac' ? ILAC_EXCEL_SUTUNLAR : GUBRE_EXCEL_SUTUNLAR
  const url = tip === 'ilac' ? '/katalog/uretici/ilaclarim/' : '/katalog/uretici/gubrelerim/'
  const buf = await dosya.arrayBuffer()
  const wb  = XLSX.read(buf)
  const ws  = wb.Sheets[wb.SheetNames[0]]
  const satirlar = XLSX.utils.sheet_to_json(ws, { header: sutunlar, range: 1, defval: '' })
  let hata = [], basari = 0
  for (const satir of satirlar) {
    if (!satir.ticari_ad) continue
    try {
      await api.post(url, satir)
      basari++
    } catch (e) {
      hata.push(`${satir.ticari_ad}: ${JSON.stringify(e.response?.data || e.message)}`)
    }
  }
  if (hata.length) onHata(`${basari} eklendi, ${hata.length} hata:\n${hata.slice(0,3).join('\n')}`)
  else onBitti(basari)
}

const KATEGORI = ['fungisit','insektisit','herbisit','akarisit','nematisit','rodentisit','mollusisit','diger']
const KATEGORI_ETIKET = {
  fungisit:'Fungisit', insektisit:'İnsektisit', herbisit:'Herbisit',
  akarisit:'Akarisit', nematisit:'Nematisit',   rodentisit:'Rodentisit',
  mollusisit:'Mollüsisit', diger:'Diğer',
}
const GUBRE_TUR = ['makro','mikro','organik','yaprak','toprak','diger']
const GUBRE_TUR_ETIKET = {
  makro:'Makro', mikro:'Mikro', organik:'Organik',
  yaprak:'Yaprak', toprak:'Toprak Düzenleyici', diger:'Diğer',
}

const ILAC_BOSLUK = () => ({
  ticari_ad:'', kategori:'fungisit', formulasyon:'',
  ruhsat_no:'', phi_gun:'', endikasyon:'',
  doz_min:'', doz_max:'', doz_birimi:'ml/da',
  uygulama_yontemi:'', ambalaj_hacmi:'', ambalaj_birimi:'şişe', ambalaj_birim:'L',
  aktif: true,
})

const GUBRE_BOSLUK = () => ({
  ticari_ad:'', tur:'makro', formulasyon:'',
  doz_min:'', doz_max:'', doz_birimi:'gr/da',
  uygulama_yontemi:'', ambalaj_hacmi:'', ambalaj_birimi:'torba', ambalaj_birim:'kg',
  aktif: true,
})

function UrunKart({ urun, tip, secili, onClick, onDuzenle }) {
  return (
    <div style={{...s.kart, ...(secili ? s.kartSecili : {})}}>
      <div style={s.kartUst} onClick={onClick}>
        <div style={s.kartSol}>
          <p style={s.urunAd}>{urun.ticari_ad}</p>
          <p style={s.urunAlt}>
            {tip === 'ilac'
              ? `${KATEGORI_ETIKET[urun.kategori] || urun.kategori} · ${urun.formulasyon}`
              : `${GUBRE_TUR_ETIKET[urun.tur] || urun.tur} · ${urun.formulasyon}`
            }
            {` · ${urun.doz_min}–${urun.doz_max} ${urun.doz_birimi}`}
          </p>
        </div>
        <div style={{display:'flex', gap:'6px', alignItems:'center'}}>
          <span style={urun.onaylandi ? s.onayBadge : s.bekBadge}>
            {urun.onaylandi ? 'Onaylı' : 'Beklemede'}
          </span>
          <button style={s.duzenleBtn} onClick={e => { e.stopPropagation(); onDuzenle(urun) }}>
            Düzenle
          </button>
        </div>
      </div>

      {secili && (
        <div style={s.detay}>
          {tip === 'ilac' && urun.phi_gun != null && (
            <Satir etiket="PHI" deger={`${urun.phi_gun} gün`} />
          )}
          {urun.endikasyon && <Satir etiket="Endikasyon" deger={urun.endikasyon} />}
          <Satir etiket="Uygulama" deger={urun.uygulama_yontemi} />
          <Satir etiket="Ambalaj" deger={`${urun.ambalaj_hacmi} ${urun.ambalaj_birim} / ${urun.ambalaj_birimi}`} />
          {urun.etken_maddeler?.length > 0 && (
            <div style={s.etkenler}>
              <span style={s.etkenBaslik}>Etken Maddeler</span>
              {urun.etken_maddeler.map(e => (
                <span key={e.id} style={s.etkenChip}>
                  {e.etken_madde_ad} {e.oran && `%${e.oran}`}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

UrunKart.propTypes = {
  urun: PropTypes.shape({
    ticari_ad: PropTypes.string,
    kategori: PropTypes.string,
    formulasyon: PropTypes.string,
    doz_min: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    doz_max: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    doz_birimi: PropTypes.string,
    uygulama_yontemi: PropTypes.string,
    ambalaj_hacmi: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    ambalaj_birimi: PropTypes.string,
    ambalaj_birim: PropTypes.string,
    onaylandi: PropTypes.bool,
    etken_maddeler: PropTypes.array,
  }),
  tip: PropTypes.string.isRequired,
  secili: PropTypes.bool,
  onClick: PropTypes.func.isRequired,
  onDuzenle: PropTypes.func.isRequired,
}

function Satir({ etiket, deger }) {
  return (
    <div style={s.satirRow}>
      <span style={s.satirEtiket}>{etiket}</span>
      <span>{deger}</span>
    </div>
  )
}

Satir.propTypes = {
  etiket: PropTypes.string.isRequired,
  deger: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
}

function UrunForm({ tip, mevcut, onKapat, onKaydet }) {
  const { isMobile } = useBreakpoint()
  const [form, setForm]     = useState(mevcut || (tip === 'ilac' ? ILAC_BOSLUK() : GUBRE_BOSLUK()))
  const [hata, setHata]     = useState('')
  const [yukleniyor, setYukleniyor] = useState(false)

  const degis = (e) => {
    const { name, value, type, checked } = e.target
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  const gonder = async (e) => {
    e.preventDefault()
    setHata('')
    setYukleniyor(true)
    try {
      let res
      if (mevcut) {
        const url = tip === 'ilac'
          ? `/katalog/uretici/ilaclarim/${mevcut.id}/`
          : `/katalog/uretici/gubrelerim/${mevcut.id}/`
        res = await api.patch(url, form)
      } else {
        const url = tip === 'ilac'
          ? '/katalog/uretici/ilaclarim/'
          : '/katalog/uretici/gubrelerim/'
        res = await api.post(url, form)
      }
      onKaydet(res.data)
    } catch (err) {
      const data = err.response?.data
      setHata(data ? Object.values(data).flat()[0] : 'Kayıt başarısız.')
    } finally {
      setYukleniyor(false)
    }
  }

  return (
    <div style={{ ...s.modalOverlay, alignItems: isMobile ? 'flex-end' : 'center', padding: isMobile ? '0' : '1rem' }} onClick={onKapat}>
      <div style={{ ...s.modal, width: isMobile ? '100%' : '560px', maxHeight: isMobile ? '100vh' : '90vh', borderRadius: isMobile ? '12px 12px 0 0' : '14px' }} onClick={e => e.stopPropagation()}>
        <div style={s.modalUst}>
          <h3 style={s.modalBaslik}>
            {mevcut ? 'Ürün Düzenle' : (tip === 'ilac' ? 'Yeni İlaç' : 'Yeni Gübre')}
          </h3>
          <button style={s.kapat} onClick={onKapat}>✕</button>
        </div>

        <form onSubmit={gonder} style={{ ...s.formGrid, gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr' }}>
          <div style={{...s.alan, gridColumn:'span 2'}}>
            <label style={s.etiket}>Ticari Ad *</label>
            <input name="ticari_ad" value={form.ticari_ad} onChange={degis} style={s.girdi} required />
          </div>

          {tip === 'ilac' ? (
            <>
              <div style={s.alan}>
                <label style={s.etiket}>Kategori</label>
                <select name="kategori" value={form.kategori} onChange={degis} style={s.girdi}>
                  {KATEGORI.map(k => <option key={k} value={k}>{KATEGORI_ETIKET[k]}</option>)}
                </select>
              </div>
              <div style={s.alan}>
                <label style={s.etiket}>Ruhsat No</label>
                <input name="ruhsat_no" value={form.ruhsat_no} onChange={degis} style={s.girdi} />
              </div>
              <div style={s.alan}>
                <label style={s.etiket}>PHI (gün)</label>
                <input type="number" name="phi_gun" value={form.phi_gun} onChange={degis} style={s.girdi} min="0" />
              </div>
              <div style={s.alan}>
                <label style={s.etiket}>Endikasyon</label>
                <input name="endikasyon" value={form.endikasyon} onChange={degis} style={s.girdi} />
              </div>
            </>
          ) : (
            <div style={s.alan}>
              <label style={s.etiket}>Tür</label>
              <select name="tur" value={form.tur} onChange={degis} style={s.girdi}>
                {GUBRE_TUR.map(t => <option key={t} value={t}>{GUBRE_TUR_ETIKET[t]}</option>)}
              </select>
            </div>
          )}

          <div style={s.alan}>
            <label style={s.etiket}>Formülasyon</label>
            <input name="formulasyon" value={form.formulasyon} onChange={degis} style={s.girdi} placeholder="EC, WP, SC..." />
          </div>

          <div style={s.alan}>
            <label style={s.etiket}>Doz Min</label>
            <input type="number" name="doz_min" value={form.doz_min} onChange={degis} style={s.girdi} step="0.1" />
          </div>
          <div style={s.alan}>
            <label style={s.etiket}>Doz Max</label>
            <input type="number" name="doz_max" value={form.doz_max} onChange={degis} style={s.girdi} step="0.1" />
          </div>
          <div style={s.alan}>
            <label style={s.etiket}>Doz Birimi</label>
            <input name="doz_birimi" value={form.doz_birimi} onChange={degis} style={s.girdi} placeholder="ml/da, gr/da" />
          </div>

          <div style={s.alan}>
            <label style={s.etiket}>Uygulama Yöntemi</label>
            <input name="uygulama_yontemi" value={form.uygulama_yontemi} onChange={degis} style={s.girdi} />
          </div>

          <div style={s.alan}>
            <label style={s.etiket}>Ambalaj Hacmi</label>
            <input type="number" name="ambalaj_hacmi" value={form.ambalaj_hacmi} onChange={degis} style={s.girdi} step="0.1" />
          </div>
          <div style={s.alan}>
            <label style={s.etiket}>Ambalaj Tipi</label>
            <input name="ambalaj_birimi" value={form.ambalaj_birimi} onChange={degis} style={s.girdi} placeholder="şişe, kutu..." />
          </div>
          <div style={s.alan}>
            <label style={s.etiket}>Ambalaj Birim</label>
            <input name="ambalaj_birim" value={form.ambalaj_birim} onChange={degis} style={s.girdi} placeholder="L, kg, ml..." />
          </div>

          <div style={{...s.alan, gridColumn:'span 2', flexDirection:'row', alignItems:'center', gap:'8px'}}>
            <input type="checkbox" name="aktif" checked={form.aktif} onChange={degis} id="aktif-cb" />
            <label htmlFor="aktif-cb" style={{fontSize:'0.88rem', color:'#555'}}>Aktif</label>
          </div>

          {hata && <p style={{...s.hata, gridColumn:'span 2'}}>{hata}</p>}

          <div style={{gridColumn:'span 2', display:'flex', justifyContent:'flex-end', gap:'8px', marginTop:'4px'}}>
            <button type="button" style={s.iptalBtn} onClick={onKapat}>Vazgeç</button>
            <button type="submit" style={s.kaydetBtn} disabled={yukleniyor}>
              {yukleniyor ? 'Kaydediliyor…' : (mevcut ? 'Güncelle' : 'Ekle')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Katalog() {
  const { isMobile } = useBreakpoint()
  const [tab, setTab]           = useState('ilac')
  const [ilaclar, setIlaclar]   = useState([])
  const [gubreler, setGubreler] = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [secili, setSecili]     = useState(null)
  const [modal, setModal]       = useState(null)
  const [excelMesaj, setExcelMesaj] = useState('')
  const [excelYukleniyor, setExcelYukleniyor] = useState(false)
  const dosyaRef = useRef()

  const yukle = () => {
    setYukleniyor(true)
    Promise.all([
      api.get('/katalog/uretici/ilaclarim/'),
      api.get('/katalog/uretici/gubrelerim/'),
    ]).then(([il, gu]) => {
      setIlaclar(il.data)
      setGubreler(gu.data)
    }).catch(() => {})
      .finally(() => setYukleniyor(false))
  }

  useEffect(() => { yukle() }, [])

  const modalKapat = () => setModal(null)

  const urunKaydet = (kaydedilen) => {
    if (modal.tip === 'ilac') {
      setIlaclar(prev => {
        const var_ = prev.find(x => x.id === kaydedilen.id)
        return var_ ? prev.map(x => x.id === kaydedilen.id ? kaydedilen : x) : [kaydedilen, ...prev]
      })
    } else {
      setGubreler(prev => {
        const var_ = prev.find(x => x.id === kaydedilen.id)
        return var_ ? prev.map(x => x.id === kaydedilen.id ? kaydedilen : x) : [kaydedilen, ...prev]
      })
    }
    setModal(null)
  }

  const liste = tab === 'ilac' ? ilaclar : gubreler

  if (yukleniyor) return <div style={s.yuklenme}>Yükleniyor...</div>

  return (
    <div style={{ ...s.kapsayici, padding: isMobile ? '1rem' : '2rem' }}>
      <div style={s.ustBar}>
        <h2 style={s.baslik}>Katalogum</h2>
        <div style={{display:'flex', gap:'8px', alignItems:'center', flexWrap:'wrap'}}>
          <div style={s.ozet}>
            <span style={s.ozetChip}>{ilaclar.length} ilaç</span>
            <span style={s.ozetChip}>{gubreler.length} gübre</span>
            <span style={{...s.ozetChip, ...s.ozetOnay}}>
              {[...ilaclar, ...gubreler].filter(x => x.onaylandi).length} onaylı
            </span>
          </div>

          <button style={s.excelBtn} disabled={excelYukleniyor} onClick={() => dosyaRef.current?.click()}>
            {excelYukleniyor ? 'Yükleniyor…' : 'Excel Yükle'}
          </button>
          <input
            ref={dosyaRef}
            type="file"
            accept=".xlsx,.xls"
            style={{display:'none'}}
            onChange={async e => {
              const dosya = e.target.files?.[0]
              if (!dosya) return
              e.target.value = ''
              setExcelYukleniyor(true)
              setExcelMesaj('')
              await excelYukle(
                tab, dosya, api,
                (n) => { setExcelMesaj(`${n} ürün eklendi.`); yukle() },
                (m) => setExcelMesaj(m)
              )
              setExcelYukleniyor(false)
            }}
          />
          <button style={s.ekleBtn} onClick={() => setModal({ tip: tab, mevcut: null })}>
            + {tab === 'ilac' ? 'İlaç' : 'Gübre'} Ekle
          </button>
        </div>
      </div>
      {excelMesaj && (
        <div style={{marginBottom:'1rem', padding:'8px 14px', background:'#f0faf5', border:'1px solid #c8e6d4', borderRadius:'8px', fontSize:'0.85rem', color:'#1a7a4a', whiteSpace:'pre-wrap'}}>
          {excelMesaj}
        </div>
      )}

      <div style={s.tabBar}>
        <button
          style={{...s.tabBtn, ...(tab === 'ilac' ? s.tabAktif : {})}}
          onClick={() => { setTab('ilac'); setSecili(null) }}
        >
          İlaçlar ({ilaclar.length})
        </button>
        <button
          style={{...s.tabBtn, ...(tab === 'gubre' ? s.tabAktif : {})}}
          onClick={() => { setTab('gubre'); setSecili(null) }}
        >
          Gübreler ({gubreler.length})
        </button>
      </div>

      {liste.length === 0 ? (
        <div style={s.bos}>
          <p>Henüz {tab === 'ilac' ? 'ilaç' : 'gübre'} kaydı yok.</p>
          <button style={s.ekleBtn} onClick={() => setModal({ tip: tab, mevcut: null })}>
            + İlk ürünü ekle
          </button>
        </div>
      ) : (
        <div style={s.liste}>
          {liste.map(u => (
            <UrunKart
              key={u.id}
              urun={u}
              tip={tab}
              secili={secili === u.id}
              onClick={() => setSecili(secili === u.id ? null : u.id)}
              onDuzenle={(urun) => setModal({ tip: tab, mevcut: urun })}
            />
          ))}
        </div>
      )}

      {modal && (
        <UrunForm
          tip={modal.tip}
          mevcut={modal.mevcut}
          onKapat={modalKapat}
          onKaydet={urunKaydet}
        />
      )}
    </div>
  )
}

const s = {
  kapsayici: { padding: '2rem', maxWidth: '800px', margin: '0 auto' },
  ustBar:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '10px' },
  baslik:    { fontSize: '1.5rem', fontWeight: '500', margin: 0, color: '#1a7a4a' },
  ozet:      { display: 'flex', gap: '6px' },
  ozetChip:  { padding: '3px 10px', borderRadius: '20px', fontSize: '0.78rem', background: '#f0f0f0', color: '#555' },
  ozetOnay:  { background: '#e8f5ee', color: '#1a7a4a' },
  ekleBtn:   { padding: '8px 16px', background: '#1a7a4a', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.88rem', fontWeight: '600' },
  excelBtn:  { padding: '8px 14px', background: '#fff', color: '#555', border: '1px solid #ccc', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem' },
  tabBar:    { display: 'flex', gap: '4px', marginBottom: '1.25rem', borderBottom: '2px solid #eee', paddingBottom: '0' },
  tabBtn:    { padding: '8px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem', color: '#888', borderBottom: '2px solid transparent', marginBottom: '-2px' },
  tabAktif:  { color: '#1a7a4a', fontWeight: '600', borderBottomColor: '#1a7a4a' },
  yuklenme:  { padding: '2rem', textAlign: 'center', color: '#888' },
  bos:       { padding: '3rem', textAlign: 'center', color: '#aaa', background: '#f9f9f9', borderRadius: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' },
  liste:     { display: 'flex', flexDirection: 'column', gap: '8px' },
  kart:      { background: '#fff', border: '1px solid #e8e8e8', borderRadius: '10px', padding: '1rem 1.25rem', cursor: 'pointer' },
  kartSecili:{ border: '1px solid #1a7a4a' },
  kartUst:   { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  kartSol:   { flex: 1 },
  urunAd:    { margin: 0, fontWeight: '500', fontSize: '1rem' },
  urunAlt:   { margin: '3px 0 0', fontSize: '0.82rem', color: '#888' },
  onayBadge: { padding: '2px 8px', borderRadius: '20px', fontSize: '0.75rem', background: '#e8f5ee', color: '#1a7a4a', whiteSpace: 'nowrap' },
  bekBadge:  { padding: '2px 8px', borderRadius: '20px', fontSize: '0.75rem', background: '#fff8e1', color: '#b7791f', whiteSpace: 'nowrap' },
  duzenleBtn:{ padding: '3px 10px', background: '#f0f0f0', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.78rem', color: '#555' },
  detay:     { marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #f0f0f0' },
  satirRow:  { display: 'flex', gap: '12px', padding: '3px 0', fontSize: '0.88rem' },
  satirEtiket:{ color: '#888', minWidth: '90px' },
  etkenler:  { marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' },
  etkenBaslik:{ fontSize: '0.8rem', color: '#888', marginRight: '4px' },
  etkenChip: { padding: '2px 8px', background: '#f0f0f0', borderRadius: '20px', fontSize: '0.78rem', color: '#444' },

  // modal
  modalOverlay:{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' },
  modal:       { background: '#fff', borderRadius: '14px', width: '560px', maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '1.5rem', boxShadow: '0 8px 40px rgba(0,0,0,.15)' },
  modalUst:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' },
  modalBaslik: { margin: 0, fontSize: '1.1rem', fontWeight: '600', color: '#1a7a4a' },
  kapat:       { background: 'none', border: 'none', fontSize: '1.1rem', cursor: 'pointer', color: '#aaa' },
  formGrid:    { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' },
  alan:        { display: 'flex', flexDirection: 'column', gap: '4px' },
  etiket:      { fontSize: '0.8rem', color: '#666', fontWeight: '500' },
  girdi:       { padding: '7px 10px', border: '1px solid #ddd', borderRadius: '7px', fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box', width: '100%' },
  hata:        { color: '#e53e3e', fontSize: '0.85rem', margin: 0 },
  iptalBtn:    { padding: '8px 16px', background: '#f0f0f0', color: '#555', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem' },
  kaydetBtn:   { padding: '8px 20px', background: '#1a7a4a', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '600' },
}
