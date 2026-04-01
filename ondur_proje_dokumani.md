# ONDUR — Proje Dökümanı
**Slogan:** Onduralım  
**Versiyon:** 1.0  
**Tarih:** Nisan 2026

---

## 1. Proje Tanımı

Ondur, ziraat mühendisleri, çiftçiler, ilaç/gübre üreticileri ve bayiileri bir araya getiren tarımsal danışmanlık ve reçete yönetim sistemidir.

**Teknoloji:**
- Backend: Django + Django REST Framework (DRF)
- Frontend: React (Web)
- Veritabanı: PostgreSQL
- Mobil: İleride React Native

**Yapı:**
```
ondur-api      → Django backend
ondur-web      → React frontend
ondur-mobile   → İleride
ondur-admin    → Django Admin
```

---

## 2. Kullanıcı Rolleri

```python
class Rol(models.TextChoices):
    YONETICI  = 'yonetici',  'Yönetici'
    YARDIMCI  = 'yardimci',  'Yardımcı'
    MUHENDIS  = 'muhendis',  'Mühendis'
    CIFTCI    = 'ciftci',    'Çiftçi'
    URETICI   = 'uretici',   'Üretici'
    BAYII     = 'bayii',     'Bayii'
```

### Yönetici
- Sistemi yöneten kişi (sistem sahibi)
- Tam yetki
- Yardımcı ekler, yetkilerini belirler
- Mühendis ekler
- Django Admin üzerinden çalışır

### Yardımcı
- Yöneticinin verdiği yetkilerle sınırlı
- Yetkiler: mühendis_ekle, mühendis_duzenle, mühendis_pasif, katalog_ekle, katalog_duzenle, katalog_sil, raporlar, kullanici_yon

### Mühendis
- Kendisi kaydolur → direkt aktif
- Kayıt olurken: ad, soyad, telefon, şifre, çalıştığı ilçeler (birden fazla)
- İki tip: bağımsız veya bayii bünyesinde
- Reçete yazar, ziyaret planlar, danışan yönetir

### Çiftçi
- Kendisi kaydolur → direkt aktif
- Kayıt olurken: ad, soyad, telefon, şifre, il, ilçe, mahalle
- CKS no opsiyonel
- Sistem 8 haneli kimlik kodu üretir (Luhn algoritması ile)
- İşletmelerini kendisi ekler
- Reçetelerini görür, mühendis/bayii onaylar

### Üretici
- Kendisi kaydolur → direkt aktif
- İlaç ve gübre kataloğunu girer
- Kendi ürünlerini yönetir

### Bayii
- Kendisi kaydolur → direkt aktif
- Hangi ürünleri sattığını girer
- Bağlı çiftçilerin reçete analizini görür (ürün bazında toplam miktar)
- Bünyesinde mühendis çalıştırabilir

---

## 3. Kimlik Kodu Sistemi

**Format:** 8 haneli sayısal, boşluklu gösterim
```
873 645 13
│   │   └── checksum (Luhn)
│   └────── orta 3 rakam
└────────── ilk 3 rakam
```

**Veritabanında:** 87364513 (boşluksuz)  
**Ekranda:** 873 645 13 (boşluklu)  
**Girişte:** Her iki format da kabul edilir

**Üretim:**
```python
def kimlik_kodu_uret():
    with transaction.atomic():
        while True:
            rakamlar = [random.randint(0, 9) for _ in range(7)]
            toplam = sum(rakamlar)
            checksum = (10 - (toplam % 10)) % 10
            kod = ''.join(map(str, rakamlar)) + str(checksum)
            if not Ciftci.objects.select_for_update().filter(
                kimlik_kodu=kod
            ).exists():
                return kod
```

---

## 4. İlişkiler

### Mühendis — Çiftçi (İşletme Bazında)
```
Mühendis kimlik koduyla çiftçiyi arar
→ Kendi bölgesindeki veya daha önce eklediği çiftçiler
→ İşletmelerini görür, seçer, talep açar
→ MuhendisIsletme kaydı oluşur (durum=bekliyor)
→ Çiftçi uygulamasından her işletme için ayrı onaylar/reddeder
→ Onaylanan işletmeler için mühendis reçete yazabilir
```

### Çiftçi — Bayii (İki Yönlü)
```
Bayii başlatırsa → çiftçi onaylar
Çiftçi başlatırsa → bayii onaylar

Çiftçi başlatınca: il/ilçeye göre bayii listesinden seçer
Bayii başlatınca: çiftçinin kimlik kodunu girer

Onaylanan ilişkide bayii:
→ O çiftçinin reçetelerindeki ürünleri (toplam miktar bazında) görebilir
```

### Mühendis — Bayii
```
Bağımsız mühendis → bayii ilişkisi yok
Bayii mühendisi   → MuhendisBayii kaydı var
                    Bayii o mühendisin reçetelerini de görebilir
```

---

## 5. Modeller

### accounts/

```python
class Kullanici(AbstractUser):
    rol     = models.CharField(max_length=20, choices=Rol.choices)
    telefon = models.CharField(max_length=20, unique=True)
    il      = models.CharField(max_length=100, blank=True)
    ilce    = models.CharField(max_length=100, blank=True)

class YardimciYetki(models.Model):
    yardimci = FK → Kullanici
    yetki    = CharField (choices)
    aktif    = BooleanField
    veren    = FK → Kullanici
    tarih    = DateTimeField(auto_now_add=True)
    unique_together: (yardimci, yetki)

class MuhendisIlce(models.Model):
    muhendis = FK → Kullanici
    il       = CharField
    ilce     = CharField
    aktif    = BooleanField
    unique_together: (muhendis, il, ilce)

class MuhendisBayii(models.Model):
    muhendis  = FK → Kullanici
    bayii     = FK → Bayii
    baslangic = DateField
    aktif     = BooleanField
    unique_together: (muhendis, bayii)
```

### ciftci/

```python
class Ciftci(models.Model):
    kullanici   = OneToOne → Kullanici
    kimlik_kodu = CharField(max_length=8, unique=True, editable=False)
    ad          = CharField
    soyad       = CharField
    cks_no      = CharField(blank=True)  # opsiyonel
    mahalle     = CharField(blank=True)
    ilce        = CharField
    il          = CharField
    telefon     = CharField
    email       = EmailField(blank=True)
    aktif       = BooleanField
    kayit       = DateTimeField(auto_now_add=True)

class Urun(models.Model):
    ad    = CharField(unique=True)
    aktif = BooleanField

class UrunCesit(models.Model):
    urun  = FK → Urun
    ad    = CharField
    aktif = BooleanField
    unique_together: (urun, ad)

class Isletme(models.Model):
    class Tur(choices):
        SERA, ACIK_TARLA, MEYVE_BAHCE, ZEYTINLIK, DIGER

    class SeraTip(choices):
        NAYLON, CAM, POLICARBON, NET, DIGER

    ciftci      = FK → Ciftci
    olusturan   = FK → Kullanici
    ad          = CharField
    tur         = CharField (choices)
    sera_tip    = CharField (choices, null=True)  # sadece tur=sera ise
    urun        = FK → Urun (null=True)
    cesit       = FK → UrunCesit (null=True)
    alan_dekar  = DecimalField
    ekim_tarihi = DateField(null=True)
    enlem       = DecimalField(max_digits=9, decimal_places=6, null=True)
    boylam      = DecimalField(max_digits=9, decimal_places=6, null=True)
    aktif       = BooleanField
    olusturma   = DateTimeField(auto_now_add=True)

class MuhendisIsletme(models.Model):
    class Durum(choices):
        BEKLIYOR, ONAYLANDI, REDDEDILDI, IPTAL

    muhendis     = FK → Kullanici
    isletme      = FK → Isletme
    durum        = CharField (default=BEKLIYOR)
    talep_tarihi = DateTimeField(auto_now_add=True)
    yanit_tarihi = DateTimeField(null=True)
    unique_together: (muhendis, isletme)

class CifciBayii(models.Model):
    class Durum(choices):
        BEKLIYOR, ONAYLANDI, REDDEDILDI, PASIF

    class Baslatan(choices):
        CIFTCI, BAYII

    ciftci       = FK → Ciftci
    bayii        = FK → Bayii
    baslatan     = CharField (choices)
    durum        = CharField (default=BEKLIYOR)
    talep_tarihi = DateTimeField(auto_now_add=True)
    yanit_tarihi = DateTimeField(null=True)
    unique_together: (ciftci, bayii)
```

### katalog/

```python
class EtkenMadde(models.Model):
    ad        = CharField(unique=True)
    cas_no    = CharField(blank=True)
    aktif     = BooleanField
    onaylandi = BooleanField

class Uretici(models.Model):
    kullanici = OneToOne → Kullanici
    firma_adi = CharField
    vergi_no  = CharField(unique=True)
    adres     = TextField
    yetkili   = CharField

class Bayii(models.Model):
    kullanici = OneToOne → Kullanici
    firma_adi = CharField
    ruhsat_no = CharField
    il        = CharField
    ilce      = CharField
    telefon   = CharField

class Ilac(models.Model):
    class Kategori(choices):
        FUNGISIT, INSEKTISIT, HERBISIT,
        AKARISIT, NEMATISIT, RODENTISIT, MOLLUSISIT, DIGER

    class AmbalajBirimi(choices):
        SISE, KUTU, TORBA, TENEKE, DIGER

    uretici            = FK → Uretici
    ticari_ad          = CharField
    kategori           = CharField (choices)
    formulasyon        = CharField      # EC, WP, OD, WG...
    ruhsat_no          = CharField
    phi_gun            = PositiveIntegerField
    bekleme_suresi     = PositiveIntegerField(null=True)
    endikasyon         = TextField
    doz_min            = DecimalField
    doz_max            = DecimalField
    doz_birimi         = CharField      # ml/100L, g/da
    uygulama_yontemi   = CharField
    kullanim_tavsiyesi = TextField(blank=True)
    notlar             = TextField(blank=True)
    ambalaj_hacmi      = DecimalField
    ambalaj_birimi     = CharField (choices)
    ambalaj_birim      = CharField      # L, ml, kg, g
    aktif              = BooleanField
    onaylandi          = BooleanField
    giris              = DateTimeField(auto_now_add=True)
    guncelleme         = DateTimeField(auto_now=True)

class IlacEtkenMadde(models.Model):
    ilac         = FK → Ilac
    etken_madde  = FK → EtkenMadde (PROTECT)
    oran         = DecimalField   # % cinsinden
    miktar       = DecimalField
    miktar_birim = CharField      # g/L, g/kg
    unique_together: (ilac, etken_madde)

class Gubre(models.Model):
    class Tur(choices):
        MAKRO, MIKRO, ORGANIK, YAPRAK, TOPRAK, DIGER

    uretici            = FK → Uretici
    ticari_ad          = CharField
    tur                = CharField (choices)
    formulasyon        = CharField
    doz_min            = DecimalField
    doz_max            = DecimalField
    doz_birimi         = CharField
    uygulama_yontemi   = CharField
    bekleme_suresi     = PositiveIntegerField(null=True)
    kullanim_tavsiyesi = TextField(blank=True)
    notlar             = TextField(blank=True)
    ambalaj_hacmi      = DecimalField
    ambalaj_birimi     = CharField (choices)
    ambalaj_birim      = CharField
    aktif              = BooleanField
    onaylandi          = BooleanField
    giris              = DateTimeField(auto_now_add=True)
    guncelleme         = DateTimeField(auto_now=True)

class GubreEtkenMadde(models.Model):
    gubre        = FK → Gubre
    etken_madde  = FK → EtkenMadde (PROTECT)
    oran         = DecimalField(null=True)
    miktar       = DecimalField(null=True)
    miktar_birim = CharField(blank=True)
    unique_together: (gubre, etken_madde)

class BayiiUrun(models.Model):
    bayii  = FK → Bayii
    ilac   = FK → Ilac (null=True)
    gubre  = FK → Gubre (null=True)
    aktif  = BooleanField
    # Constraint: ilac veya gubre'den biri dolu olmalı
```

### recete/

```python
class Recete(models.Model):
    class Durum(choices):
        TASLAK, ONAYLANDI, IPTAL

    isletme          = FK → Isletme
    muhendis         = FK → Kullanici
    tani             = CharField
    tarih            = DateField
    uygulama_yontemi = CharField
    durum            = CharField (default=TASLAK)
    muhendis_notu    = TextField(blank=True)   # sadece mühendis görür
    hatirlatma       = TextField(blank=True)   # bildirim için
    ciftciye_not     = TextField(blank=True)   # çiftçi görür
    duzenleme_sayisi = PositiveIntegerField(default=0)
    olusturma        = DateTimeField(auto_now_add=True)
    guncelleme       = DateTimeField(auto_now=True)

class UygulamaAdimi(models.Model):
    class Tip(choices):
        SULAMA, ILACLAMA, GUBRELEME, DIGER

    recete          = FK → Recete (related_name='adimlar')
    sira_no         = PositiveIntegerField
    tip             = CharField (choices)
    tanim           = CharField    # "1. Sulama", "İlaçlama" vs.
    uygulama_tarihi = DateField(null=True)
    tamamlandi      = BooleanField(default=False)
    notlar          = TextField(blank=True)
    unique_together: (recete, sira_no)
    ordering: ['sira_no']

class UygulamaAdimKalemi(models.Model):
    adim      = FK → UygulamaAdimi (related_name='kalemler')
    ilac      = FK → Ilac (null=True)
    gubre     = FK → Gubre (null=True)
    doz_dekar = DecimalField
    birim     = CharField

    @property
    def toplam_miktar(self):
        return self.doz_dekar * self.adim.recete.isletme.alan_dekar

    # Constraint: ilac veya gubre'den biri dolu olmalı

class ReceteVersiyon(models.Model):
    recete           = FK → Recete (related_name='versiyonlar')
    versiyon_no      = PositiveIntegerField
    tani             = CharField
    uygulama_yontemi = CharField
    notlar           = TextField
    kalemler         = JSONField   # o anki snapshot
    duzenleme_tarihi = DateTimeField(auto_now_add=True)
    duzenleyen       = FK → Kullanici (null=True)
    duzenleme_notu   = TextField(blank=True)
    unique_together: (recete, versiyon_no)

class ReceteYorum(models.Model):
    class Tip(choices):
        YORUM, SORU, YANIT

    recete    = FK → Recete (related_name='yorumlar')
    yazan     = FK → Kullanici
    tip       = CharField (choices)
    ust_yorum = FK → self (null=True)   # yanıtsa hangi yoruma
    metin     = TextField
    olusturma = DateTimeField(auto_now_add=True)
    ordering: ['olusturma']

class ReceteFotograf(models.Model):
    class Tip(choices):
        HASTALIK, UYGULAMA, GENEL

    recete    = FK → Recete (related_name='fotograflar')
    yukleyen  = FK → Kullanici
    fotograf  = ImageField(upload_to='recete/%Y/%m/')
    tip       = CharField (choices)
    aciklama  = TextField(blank=True)
    olusturma = DateTimeField(auto_now_add=True)
```

### ziyaret/

```python
class Ziyaret(models.Model):
    class Tip(choices):
        SAHA, DANISMANLIK, HASAT_KONTROL,
        RECETE, NUMUNE, PLANLAMA

    isletme    = FK → Isletme
    muhendis   = FK → Kullanici
    tur        = CharField (choices)
    tarih      = DateField
    saat       = TimeField
    sure_dk    = PositiveIntegerField
    adres      = TextField(blank=True)
    notlar     = TextField(blank=True)
    tamamlandi = BooleanField(default=False)
    olusturma  = DateTimeField(auto_now_add=True)
```

---

## 6. Reçete Yazma Akışı

```
Adım 1 — Tanı
├── Danışan seçilir (listeden veya kimlik koduyla)
├── İşletme seçilir (sol panelde bilgiler görünür)
├── Hastalık/zararlı seçilir
├── Tanı notu yazılır
├── Fotoğraf eklenebilir
└── Uygulama yöntemi seçilir

Adım 2 — Uygulama Adımları
├── Her sulama/ilaçlama ayrı kart
├── Her adımda:
│   ├── Adım adı (1. Sulama, İlaçlama vs.)
│   ├── Tip (sulama/ilaçlama/gübreleme)
│   ├── Uygulama tarihi
│   └── Ürünler (katalogdan seçilir)
│       ├── Dekara doz girilir
│       └── Sistem otomatik hesaplar (doz × alan = toplam)
├── PHI uyarısı otomatik gösterilir
└── İstenildiği kadar adım eklenebilir

Sol Panel (sabit)
├── Mühendis Notu    → sadece mühendis görür
├── Hatırlatma       → sistem bildirim gönderir
└── Çiftçiye Not     → çiftçi görür, WhatsApp'ta çıkar

Adım 3 — Onay & Özet
├── Tüm adımlar listelenir
├── Notlar özetlenir
├── 3 onay kutusu işaretlenir
│   ├── İlaç ruhsatlı (Registered use)
│   ├── Çiftçi bilgilendirildi (Farmer briefed)
│   └── PHI uygulanabilir
└── Taslak veya Onaylı olarak kaydedilir

Sonrası
├── Çiftçi reçeteyi görür
├── WhatsApp ile paylaşılabilir
├── Düzenlenirse versiyon kaydedilir
└── Çiftçi yorum/soru ekleyebilir
```

---

## 7. Notlar Sistemi

| Not | Yazan | Gören | Amaç |
|-----|-------|-------|------|
| Mühendis Notu | Mühendis | Sadece mühendis | Kişisel gözlem, hatırlatma |
| Hatırlatma | Mühendis | Sistem → bildirim | Uygulama tarihi yaklaşınca bildirim |
| Çiftçiye Not | Mühendis | Çiftçi | Talimat, uyarı |
| Yorum/Soru | Çiftçi | Mühendis | Soru, geri bildirim |
| Yanıt | Mühendis | Çiftçi | Soruya yanıt |

---

## 8. Bayii Reçete Analizi

Bayii sadece şunu görür — çiftçi bazında kırılım yok:

```python
ReceteAdimKalemi.objects.filter(
    adim__recete__isletme__ciftci__bayii_iliskileri__bayii=bayii,
    adim__recete__isletme__ciftci__bayii_iliskileri__durum='onaylandi',
    adim__recete__durum='onaylandi'
).annotate(
    hesaplanan_miktar=ExpressionWrapper(
        F('doz_dekar') * F('adim__recete__isletme__alan_dekar'),
        output_field=DecimalField()
    )
).values(
    'ilac__ticari_ad',
    'ilac__etken_madde__ad',  # IlacEtkenMadde üzerinden
    'ilac__formulasyon',
    'ilac__uretici__firma_adi',
    'gubre__ticari_ad',
    'birim'
).annotate(
    isletme_sayisi = Count('adim__recete__isletme', distinct=True),
    recete_sayisi  = Count('adim__recete', distinct=True),
    toplam_miktar  = Sum('hesaplanan_miktar')
).order_by('-toplam_miktar')
```

**Filtreler:** tarih aralığı, ürün türü (ilaç/gübre)

---

## 9. Uygulama Dizin Yapısı

```
ondur/
├── ondur/                  # Django proje ayarları
│   ├── settings.py
│   ├── urls.py
│   └── wsgi.py
├── accounts/               # Kullanici, YardimciYetki, MuhendisIlce, MuhendisBayii
├── ciftci/                 # Ciftci, Urun, UrunCesit, Isletme, MuhendisIsletme, CifciBayii
├── katalog/                # EtkenMadde, Uretici, Bayii, Ilac, IlacEtkenMadde, Gubre, GubreEtkenMadde, BayiiUrun
├── recete/                 # Recete, UygulamaAdimi, UygulamaAdimKalemi, ReceteVersiyon, ReceteYorum, ReceteFotograf
├── ziyaret/                # Ziyaret
├── api/                    # DRF router, tüm endpoint'ler
├── requirements.txt
└── manage.py

ondur-web/                  # React frontend
├── src/
│   ├── pages/
│   ├── components/
│   ├── api/
│   └── styles/
└── package.json
```

---

## 10. Yetki Matrisi

| İşlem | Yönetici | Yardımcı | Mühendis | Çiftçi | Üretici | Bayii |
|-------|----------|----------|----------|--------|---------|-------|
| Kullanici yönet | ✓ | yetkiye göre | — | kendi | kendi | kendi |
| Mühendis ekle | ✓ | yetkiye göre | — | — | — | — |
| Katalog ekle/düzenle | ✓ | yetkiye göre | — | — | kendi | — |
| Çiftçi oluştur | ✓ | — | ✓ | kendi | — | — |
| İşletme oluştur | ✓ | — | ✓ | kendi | — | — |
| Reçete yaz | — | — | ✓ | — | — | — |
| Reçete görüntüle | ✓ | — | kendi | kendi | — | bağlı |
| Ziyaret planla | — | — | ✓ | görür | — | — |
| Bayii analiz | — | — | — | — | — | ✓ |
| Raporlar | ✓ | yetkiye göre | kısıtlı | — | kendi | kendi |

---

## 11. Modül Yapım Sırası

```
Faz 1 — Temel
├── Django proje kurulumu
├── accounts uygulaması
├── JWT authentication
└── Django Admin

Faz 2 — Çiftçi & İşletme
├── ciftci uygulaması
├── Kimlik kodu sistemi
├── Urun, UrunCesit
└── GPS koordinatı

Faz 3 — Mühendis İlişkileri
├── MuhendisIlce
├── MuhendisIsletme (talep/onay)
└── Çiftçi arama endpoint'i

Faz 4 — Katalog
├── EtkenMadde
├── Uretici, Bayii
├── Ilac, IlacEtkenMadde
└── Gubre, GubreEtkenMadde

Faz 5 — Bayii İlişkileri
├── CifciBayii
├── MuhendisBayii
└── BayiiUrun

Faz 6 — Reçete
├── Recete, UygulamaAdimi
├── UygulamaAdimKalemi
├── ReceteVersiyon
├── ReceteYorum
└── ReceteFotograf

Faz 7 — Ziyaret
├── Ziyaret modeli
└── GPS & takvim endpoint'leri

Faz 8 — Yönetim
├── YardimciYetki sistemi
└── Raporlar

Faz 9 — Frontend (React)
├── Her rol için ayrı arayüz
├── Responsive (mobil/tablet/masaüstü)
└── WhatsApp entegrasyonu

Faz 10 — Yayın
├── Sunucu kurulumu
├── Domain & SSL
└── Canlıya alma
```

---

## 12. Önemli Kararlar

```
✓ Telefon numarası unique — ikinci kayıt engellenir
✓ Kimlik kodu 8 haneli, Luhn checksum, boşluklu gösterim
✓ Mühendis birden fazla ilçede çalışabilir (MuhendisIlce)
✓ İşletme bazında mühendis onayı (her işletme ayrı)
✓ Çiftçi-bayii ilişkisi iki yönlü başlatılabilir
✓ Reçete düzenlenince versiyon kaydedilir
✓ Bayii çiftçi bazında kırılım göremez, sadece ürün toplamı
✓ Üretici ve bayii direkt aktif (admin onayı yok)
✓ Sera tipi ayrı alan (naylon, cam, polikarbon, net)
✓ Ürün ve çeşit ayrı tablo (Urun, UrunCesit)
✓ Etken madde ayrı tablo, birden fazla olabilir (IlacEtkenMadde)
✓ Reçete adım bazlı (UygulamaAdimi) — 1. sulama, 2. sulama vs.
✓ Doz dekara girilir, sistem toplam hesaplar (doz × alan)
✓ PHI uyarısı otomatik gösterilir
✓ 3 not tipi: mühendis notu, hatırlatma, çiftçiye not
✓ Responsive tasarım: mobil/tablet/masaüstü
```

---

*Bu döküman her konuşmada Claude'a yapıştırılarak kaldığı yerden devam edilebilir.*
