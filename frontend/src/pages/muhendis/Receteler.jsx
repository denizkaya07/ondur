import React, { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import html2pdf from 'html2pdf.js'
import api from '../../services/api'
import useBreakpoint from '../../hooks/useBreakpoint'

const DURUM_RENK = {
  taslak:    { background: '#fff8e1', color: '#b7791f' },
  onaylandi: { background: '#e8f5ee', color: '#1a7a4a' },
  iptal:     { background: '#fff0f0', color: '#c53030' },
}
const DURUM_ETIKET = { taslak: 'Taslak', onaylandi: 'Onaylandı', iptal: 'İptal' }

export default function Receteler() {
  const { isMobile } = useBreakpoint()
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
    <div style={{ ...s.kapsayici, padding: isMobile ? '1rem' : '2rem' }}>
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
                <React.Fragment key={r.id}>
                  {/* Ana reçete satırı */}
                  <tr style={{ ...s.satir, ...(acik === r.id ? s.satirAcik : {}) }}
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
                    <tr>
                      <td colSpan={6} style={s.detayTd}>
                        {!detaylar[r.id] && detaylar[r.id] !== null
                          ? <p style={s.yukleniyor}>Yükleniyor…</p>
                          : detaylar[r.id] === null
                            ? <p style={s.hata}>Yüklenemedi.</p>
                            : <>
                                <UrunTablosu detay={detaylar[r.id]} />
                                {detaylar[r.id] && (() => {
                                  const tel = detaylar[r.id].ciftci_telefon?.replace(/\D/g,'')
                                  const mesaj = encodeURIComponent(receteMesajOlustur(detaylar[r.id]))
                                  return (
                                    <div style={s.paylasBar}>
                                      <button style={s.pdfBtn} onClick={() => recetePdfIndir(detaylar[r.id])}>
                                        📄 PDF İndir
                                      </button>
                                      {tel && <>
                                        <a style={s.waBtn} href={`https://wa.me/90${tel.replace(/^0/,'')}?text=${mesaj}`} target="_blank" rel="noreferrer">
                                          📲 WhatsApp
                                        </a>
                                        <a style={s.smsBtn} href={`sms:${tel}?body=${mesaj}`}>
                                          💬 SMS
                                        </a>
                                      </>}
                                    </div>
                                  )
                                })()}
                              </>
                        }
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function recetePdfIndir(detay) {
  const adimlar = detay.adimlar || []
  const sulamaHtml = adimlar.filter(a => a.notlar?.includes('[sulama]')).map((a, i) => {
    const kalemler = (a.kalemler || []).map(k => `
      <tr>
        <td>${k.ilac_ad || k.gubre_ad || '—'}</td>
        <td>${k.doz_dekar}</td>
        <td>${k.birim}</td>
        <td>${k.toplam_miktar || '—'}</td>
      </tr>`).join('')
    return `
      <h4 style="color:#1a7a4a;margin:16px 0 6px">💧 ${i+1}. Sulama${a.uygulama_tarihi ? ' — ' + a.uygulama_tarihi : ''}</h4>
      <table><thead><tr><th>İlaç / Gübre</th><th>Doz/da</th><th>Birim</th><th>Toplam</th></tr></thead>
      <tbody>${kalemler}</tbody></table>`
  }).join('')

  const kulturelHtml = adimlar.filter(a => a.notlar?.includes('[kültürel]'))
    .map(a => `<li>Kültürel: ${a.tanim}</li>`).join('')
  const biyoHtml = adimlar.filter(a => a.notlar?.includes('[biyolojik]'))
    .map(a => `<li>Biyolojik: ${a.tanim}</li>`).join('')
  const takipHtml = adimlar.filter(a => a.notlar?.includes('[takip]'))
    .map(a => `<li>${a.uygulama_tarihi ? a.uygulama_tarihi + ' — ' : ''}${a.tanim}</li>`).join('')

  const thSt  = 'background:#e8f5ee;color:#1a7a4a;padding:7px 10px;text-align:left;font-size:0.83rem;'
  const tdSt  = 'padding:7px 10px;border-bottom:1px solid #eee;font-size:0.88rem;'
  const tblSt = 'width:100%;border-collapse:collapse;margin-bottom:8px;'
  const liSt  = 'font-size:0.88rem;line-height:1.8;'

  const sulamaHtmlFix = adimlar.filter(a => a.notlar?.includes('[sulama]')).map((a, i) => {
    const kalemler = (a.kalemler || []).map(k => `
      <tr>
        <td style="${tdSt}">${k.ilac_ad || k.gubre_ad || '—'}</td>
        <td style="${tdSt}">${k.doz_dekar}</td>
        <td style="${tdSt}">${k.birim}</td>
        <td style="${tdSt}">${k.toplam_miktar || '—'}</td>
      </tr>`).join('')
    return `
      <h4 style="color:#1a7a4a;margin:16px 0 6px">💧 ${i+1}. Sulama${a.uygulama_tarihi ? ' — ' + a.uygulama_tarihi : ''}</h4>
      <table style="${tblSt}"><thead><tr>
        <th style="${thSt}">Ilac / Gubre</th><th style="${thSt}">Doz/da</th><th style="${thSt}">Birim</th><th style="${thSt}">Toplam</th>
      </tr></thead><tbody>${kalemler}</tbody></table>`
  }).join('')

  const el = document.createElement('div')
  el.style.cssText = 'width:794px;background:#fff;padding:32px;font-family:Arial,sans-serif;color:#222;'
  el.innerHTML = `
<h1 style="color:#1a7a4a;font-size:1.4rem;margin:0 0 4px">Ondur Recete #${detay.id}</h1>
<div style="display:flex;flex-wrap:wrap;gap:8px 20px;color:#555;font-size:0.88rem;margin-bottom:20px;padding-bottom:12px;border-bottom:2px solid #1a7a4a;">
  <span>Tarih: ${detay.tarih}</span>
  <span>Isletme: ${detay.isletme_ad}</span>
  <span>Ciftci: ${detay.ciftci_ad || ''} ${detay.ciftci_soyad || ''}</span>
  ${detay.ciftci_telefon ? `<span>Tel: ${detay.ciftci_telefon}</span>` : ''}
  <span>Muhendis: ${detay.muhendis_ad || ''}</span>
  <span style="padding:2px 10px;border-radius:20px;font-size:0.8rem;font-weight:600;background:${detay.durum === 'onaylandi' ? '#e8f5ee' : '#fff8e1'};color:${detay.durum === 'onaylandi' ? '#1a7a4a' : '#b7791f'}">${detay.durum === 'onaylandi' ? 'Onaylandi' : 'Taslak'}</span>
</div>
${detay.tani ? `<div style="background:#f8fdf9;border-left:4px solid #1a7a4a;padding:10px 14px;margin-bottom:16px;font-size:0.95rem">Tani / Problem: ${detay.tani}</div>` : ''}
${sulamaHtmlFix}
${kulturelHtml ? `<h4 style="color:#1a7a4a;margin:16px 0 6px">Kulturel Onlemler</h4><ul style="margin:6px 0;padding-left:18px">${kulturelHtml.replace(/<li>/g,`<li style="${liSt}">`)}</ul>` : ''}
${biyoHtml ? `<h4 style="color:#1a7a4a;margin:16px 0 6px">Biyolojik Mucadele</h4><ul style="margin:6px 0;padding-left:18px">${biyoHtml.replace(/<li>/g,`<li style="${liSt}">`)}</ul>` : ''}
${takipHtml ? `<h4 style="color:#1a7a4a;margin:16px 0 6px">Takip Noktalari</h4><ul style="margin:6px 0;padding-left:18px">${takipHtml.replace(/<li>/g,`<li style="${liSt}">`)}</ul>` : ''}
${detay.ciftciye_not ? `<div style="margin-top:16px;padding:10px 14px;background:#fff8e1;border-radius:6px;font-size:0.88rem">Ciftciye Not: ${detay.ciftciye_not}</div>` : ''}
<div style="margin-top:32px;padding-top:12px;border-top:1px solid #eee;font-size:0.78rem;color:#aaa">Ondur Tarim Danismanlik</div>`

  const overlay = document.createElement('div')
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;z-index:9999;color:#fff;font-size:1.1rem;font-family:Arial,sans-serif;'
  overlay.textContent = 'PDF hazırlanıyor…'
  document.body.appendChild(overlay)
  document.body.appendChild(el)
  html2pdf()
    .set({
      margin: 10,
      filename: `recete-${detay.id}-${detay.isletme_ad || detay.id}.pdf`,
      html2canvas: { scale: 2, useCORS: true, logging: false, scrollX: 0, scrollY: 0 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    })
    .from(el)
    .save()
    .finally(() => { document.body.removeChild(el); document.body.removeChild(overlay) })
}

function receteMesajOlustur(detay) {
  const satirlar = []
  satirlar.push(`🌱 ONDUR REÇETE #${detay.id}`)
  satirlar.push(`📅 ${detay.tarih}`)
  satirlar.push(`🏢 ${detay.isletme_ad}`)
  if (detay.tani) satirlar.push(`🔍 Tanı: ${detay.tani}`)
  satirlar.push('')

  for (const adim of detay.adimlar || []) {
    if (adim.notlar?.includes('[sulama]') && adim.kalemler?.length) {
      satirlar.push(`💧 ${adim.tanim}${adim.uygulama_tarihi ? ' — ' + adim.uygulama_tarihi : ''}`)
      for (const k of adim.kalemler) {
        satirlar.push(`  • ${k.ilac_ad || k.gubre_ad} — ${k.doz_dekar} ${k.birim}/da`)
      }
    } else if (adim.notlar?.includes('[kültürel]')) {
      satirlar.push(`🌿 ${adim.tanim}`)
    } else if (adim.notlar?.includes('[biyolojik]')) {
      satirlar.push(`🐞 ${adim.tanim}`)
    } else if (adim.notlar?.includes('[takip]')) {
      satirlar.push(`📋 ${adim.uygulama_tarihi ? adim.uygulama_tarihi + ' — ' : ''}${adim.tanim}`)
    }
  }

  if (detay.ciftciye_not) {
    satirlar.push('')
    satirlar.push(`📝 Not: ${detay.ciftciye_not}`)
  }
  return satirlar.join('\n')
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
  paylasBar: { display: 'flex', gap: '10px', marginTop: '12px' },
  pdfBtn:    { padding: '6px 16px', background: '#1a7a4a', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '500' },
  waBtn:     { padding: '6px 16px', background: '#25d366', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontSize: '0.85rem', fontWeight: '500' },
  smsBtn:    { padding: '6px 16px', background: '#f0f0f0', color: '#444', borderRadius: '8px', textDecoration: 'none', fontSize: '0.85rem' },
}
