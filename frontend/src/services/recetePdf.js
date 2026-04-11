import html2pdf from 'html2pdf.js'

export function recetePdfIndir(detay) {
  if (!detay) return
  const thSt  = 'background:#e8f5ee;color:#1a7a4a;padding:7px 10px;text-align:left;font-size:0.83rem;'
  const tdSt  = 'padding:7px 10px;border-bottom:1px solid #eee;font-size:0.88rem;'
  const tblSt = 'width:100%;border-collapse:collapse;margin-bottom:8px;'
  const adimlar = detay.adimlar || []

  const sulamaHtml = adimlar.filter(a => a.notlar?.includes('[sulama]')).map((a, i) => {
    const kalemler = (a.kalemler || []).map(k =>
      `<tr><td style="${tdSt}">${k.ilac_ad || k.gubre_ad || '—'}</td><td style="${tdSt}">${k.doz_dekar}</td><td style="${tdSt}">${k.birim}</td></tr>`
    ).join('')
    return `<h4 style="color:#1a7a4a;margin:16px 0 6px">${i+1}. Sulama${a.uygulama_tarihi ? ' — '+a.uygulama_tarihi : ''}</h4>
<table style="${tblSt}"><thead><tr><th style="${thSt}">İlaç/Gübre</th><th style="${thSt}">Doz/da</th><th style="${thSt}">Birim</th></tr></thead><tbody>${kalemler}</tbody></table>`
  }).join('')

  const el = document.createElement('div')
  el.style.cssText = 'width:794px;background:#fff;padding:32px;font-family:Arial,sans-serif;color:#222;'
  el.innerHTML = `
<div style="text-align:center;padding-bottom:12px;border-bottom:3px solid #1a7a4a;margin-bottom:18px;">
  <div style="font-size:1.4rem;font-weight:700;color:#1a7a4a;letter-spacing:-0.5px;">www.onduran.com.tr</div>
  <div style="font-size:0.95rem;color:#555;margin-top:3px;font-weight:500;">Onduran Tarım</div>
  <div style="font-size:0.75rem;color:#aaa;margin-top:2px;">Reçete #${detay.id}</div>
</div>

<h2 style="color:#1a7a4a;font-size:1.2rem;margin:0 0 10px">${detay.tani || 'Reçete'}</h2>

<div style="display:flex;flex-wrap:wrap;gap:8px 24px;color:#555;font-size:0.88rem;margin-bottom:18px;padding:10px 14px;background:#f8fdf9;border-radius:8px;">
  <span><b>Tarih:</b> ${detay.tarih || ''}</span>
  <span><b>İşletme:</b> ${detay.isletme_ad || ''}</span>
  <span><b>Çiftçi:</b> ${detay.ciftci_ad || ''} ${detay.ciftci_soyad || ''}</span>
  <span><b>Mühendis:</b> ${detay.muhendis_ad || ''}</span>
</div>

${sulamaHtml}

${detay.ciftciye_not ? `<div style="margin-top:16px;padding:10px 14px;background:#fff8e1;border-radius:6px;font-size:0.88rem"><b>Not:</b> ${detay.ciftciye_not}</div>` : ''}

<div style="margin-top:40px;padding-top:10px;border-top:1px solid #eee;text-align:center;font-size:0.72rem;color:#aaa;">
  <div style="font-weight:600;color:#1a7a4a;">www.onduran.com.tr</div>
  <div>Onduran Tarım — ${new Date().toLocaleDateString('tr-TR')}</div>
</div>`

  const overlay = document.createElement('div')
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;z-index:9999;color:#fff;font-size:1.1rem;font-family:Arial,sans-serif;'
  overlay.textContent = 'PDF hazırlanıyor…'
  document.body.appendChild(overlay)
  document.body.appendChild(el)

  html2pdf().set({
    margin: 10,
    filename: `recete-${detay.id}.pdf`,
    html2canvas: { scale: 2, useCORS: true, logging: false, scrollX: 0, scrollY: 0 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
  }).from(el).save().finally(() => {
    document.body.removeChild(el)
    document.body.removeChild(overlay)
  })
}
