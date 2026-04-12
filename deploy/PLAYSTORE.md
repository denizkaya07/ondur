# Ondur — Play Store Yayınlama Rehberi (TWA)

Mevcut PWA'yı kod değiştirmeden Play Store'a paketleme adımları.

---

## Ön Koşullar

- [ ] Site canlıda ve HTTPS çalışıyor (`https://onduran.com.tr`)
- [ ] Google Play Developer hesabı açıldı ($25 tek seferlik)
- [ ] Java JDK 17+ kurulu (`java -version`)
- [ ] Android Studio veya sadece Android SDK kurulu

---

## Adım 1 — Bubblewrap Kurulumu

```bash
npm install -g @bubblewrap/cli
bubblewrap doctor   # eksik araçları gösterir
```

---

## Adım 2 — Projeyi Oluştur

```bash
mkdir ondur-twa && cd ondur-twa
bubblewrap init --manifest https://onduran.com.tr/manifest.webmanifest
```

Sorulacak değerler:

| Soru | Cevap |
|------|-------|
| Application ID | `com.ondur.tarim` |
| App name | `Ondur Tarım` |
| Display mode | `standalone` |
| Status bar color | `#1a7a4a` |
| Signing key | yeni oluştur (ilk kez) |

---

## Adım 3 — Digital Asset Links (Zorunlu)

Play Store'un siteyle güven bağı kurması için gerekli.

Bubblewrap'in verdiği SHA-256 fingerprint'i not al, sonra sunucuda:

```bash
mkdir -p /var/www/ondur/staticfiles/.well-known
```

`/var/www/ondur/staticfiles/.well-known/assetlinks.json` dosyasını oluştur:

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.ondur.tarim",
    "sha256_cert_fingerprints": ["BURAYA_BUBBLEWRAP_SHA256"]
  }
}]
```

Nginx'te bu dosyanın erişilebilir olduğunu kontrol et:

```
https://onduran.com.tr/.well-known/assetlinks.json
```

---

## Adım 4 — APK / AAB Derle

```bash
bubblewrap build
```

Çıktı: `app-release-bundle.aab` — Play Store'a bu yüklenir.

---

## Adım 5 — Play Console'a Yükle

1. [play.google.com/console](https://play.google.com/console) → Uygulama oluştur
2. **Uygulama türü:** Uygulama | **Ücretsiz**
3. **Dahili test** → AAB dosyasını yükle → Test et
4. Tüm zorunlu alanları doldur:
   - Kısa açıklama (80 karakter)
   - Tam açıklama
   - Ekran görüntüleri (en az 2 adet, 1080px)
   - Uygulama ikonu (512x512 PNG)
   - Gizlilik politikası URL'i (zorunlu)
5. **Üretime gönder** → İnceleme (1-3 gün)

---

## Adım 6 — Gizlilik Politikası Sayfası

Play Store zorunlu tutar. Uygulamaya basit bir sayfa ekle:

```
https://onduran.com.tr/gizlilik
```

İçerik: hangi verilerin toplandığı, nasıl kullanıldığı, kimlerle paylaşıldığı.

---

## Güncelleme Süreci

Uygulama güncelleme gerekmez — web sitesini güncellediğinde TWA otomatik yeni versiyonu çeker. Play Store'a yeni sürüm yüklemene gerek yok.

Sadece şunlarda Play Store güncellemesi gerekir:
- Uygulama ID veya paket adı değişirse
- İkon veya splash screen değişirse
- Android manifest değişirse

---

## PWA Desteklenen Özellikler

| Özellik | Durum |
|---------|-------|
| Kamera | ✅ Web API ile çalışır |
| Fotoğraf yükleme | ✅ Zaten mevcut |
| Push bildirimleri | ✅ Web Push API |
| GPS / Konum | ✅ Geolocation API |
| Offline çalışma | ✅ Service Worker kurulu |
| Ana ekrana yükleme | ✅ Manifest kurulu |

---

## Tahmini Süre

| Aşama | Süre |
|-------|------|
| Bubblewrap kurulum ve init | 1-2 saat |
| Digital Asset Links | 30 dakika |
| AAB derleme | 30 dakika |
| Play Console formu | 1-2 saat |
| Google incelemesi | 1-3 gün |
| **Toplam** | **2-4 gün** |
