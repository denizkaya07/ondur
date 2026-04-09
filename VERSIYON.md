# Ondur Tarım Danışmanlık — Sürüm Notları

## v0.4.0 — 10 Nisan 2025 Perşembe

### Yeni Özellikler

**Bayii**
- Müşterilerim sayfası: bağlı çiftçiler ve reçete kalemleri (ilaç/gübre) görüntülenir
- Çiftçi → Bayii seçme talebi: Talepler sayfasına "Bayiilerim" sekmesi eklendi
- Excel ile toplu ürün ekleme: şablon indir + Excel yükle (Ürünlerim sayfası)

**Üretici**
- Excel ile toplu ilaç/gübre ekleme: şablon indir + Excel yükle (Katalogum sayfası)

**Çiftçi**
- İşletmelerim → Reçeteler paneli: reçeteye tıklayınca detay açılır, PDF indirilebilir
- Reçetelerim sayfasında seçili reçeteden PDF indirme

**Genel**
- Tüm PDF çıktılarında `onduran.com.tr` üst antet
- Navbar'da kullanıcı adının yanında rol rozeti (Mühendis, Çiftçi, Üretici, Bayii)
- Profil sayfasında rol bazlı bilgi kartı (çiftçi kimlik kodu, bayii firma/ruhsat, üretici firma bilgisi, mühendis hizmet ilçeleri)

**Altyapı**
- Offline-First PWA: IndexedDB önbellek, Service Worker (Workbox), arka plan senkronizasyonu
- Çevrimdışı banner bileşeni
- Ortak PDF servisi: `src/services/recetePdf.js`

### Temizlenen Alanlar
- Danışanlar sayfasındaki tüm emoji/ikonlar kaldırıldı (🍒 🏢 👨‍🌾 🌱 📏 ⏳ 📍 🧪 ▼ ▲)
- Çiftçi / İşletmelerim işletme satırından ikonlar temizlendi
- Demo veriler: tüm demo kullanıcı şifreleri `1234` olarak güncellendi

### Demo Kullanıcılar

| Rol | Telefon | Şifre |
|-----|---------|-------|
| Mühendis | 05100000001 | 1234 |
| Mühendis | 05100000002 | 1234 |
| Çiftçi | 05200000001 | 1234 |
| Çiftçi | 05200000002 | 1234 |
| Çiftçi | 05200000003 | 1234 |
| Üretici | 05300000001 | 1234 |
| Bayii | 05400000001 | 1234 |
| Bayii | 05400000002 | 1234 |

### Teknik Notlar
- `NODE_ENV=production` ortamında `npm install --include=dev` gereklidir
- Django: `python manage.py runserver`
- Frontend: `npm run dev --include=dev` (c:\ondur\frontend)
