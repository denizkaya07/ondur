import random
from django.db import models, transaction
from accounts.models import Kullanici


class Urun(models.Model):
    ad    = models.CharField(max_length=100, unique=True)
    aktif = models.BooleanField(default=True)

    def __str__(self):
        return self.ad

    class Meta:
        verbose_name        = 'Ürün'
        verbose_name_plural = 'Ürünler'
        ordering            = ['ad']


class UrunCesit(models.Model):
    urun  = models.ForeignKey(
                Urun,
                related_name='cesitler',
                on_delete=models.CASCADE
            )
    ad    = models.CharField(max_length=100)
    aktif = models.BooleanField(default=True)

    def __str__(self):
        return f'{self.urun.ad} — {self.ad}'

    class Meta:
        verbose_name        = 'Ürün Çeşidi'
        verbose_name_plural = 'Ürün Çeşitleri'
        unique_together     = ('urun', 'ad')
        ordering            = ['urun', 'ad']


class Ciftci(models.Model):
    kullanici   = models.OneToOneField(
                      Kullanici,
                      on_delete=models.CASCADE,
                      related_name='ciftci_profili'
                  )
    kimlik_kodu = models.CharField(
                      max_length=8,
                      unique=True,
                      editable=False,
                      db_index=True
                  )
    ad          = models.CharField(max_length=100)
    soyad       = models.CharField(max_length=100)
    cks_no      = models.CharField(max_length=100, blank=True)
    mahalle     = models.CharField(max_length=200, blank=True)
    ilce        = models.CharField(max_length=100)
    il          = models.CharField(max_length=100)
    telefon     = models.CharField(max_length=20)
    email       = models.EmailField(blank=True)
    aktif       = models.BooleanField(default=True)
    kayit       = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.kimlik_kodu:
            self.kimlik_kodu = self._kod_uret()
        super().save(*args, **kwargs)

    @staticmethod
    def _kod_uret():
        with transaction.atomic():
            while True:
                rakamlar = [random.randint(0, 9) for _ in range(7)]
                toplam   = sum(rakamlar)
                checksum = (10 - (toplam % 10)) % 10
                kod      = ''.join(map(str, rakamlar)) + str(checksum)
                if not Ciftci.objects.select_for_update().filter(
                    kimlik_kodu=kod
                ).exists():
                    return kod

    @staticmethod
    def kimlik_kodu_gecerli_mi(kod):
        kod = kod.replace(' ', '')
        if len(kod) != 8 or not kod.isdigit():
            return False
        rakamlar = [int(r) for r in kod[:7]]
        checksum = int(kod[7])
        toplam   = sum(rakamlar)
        beklenen = (10 - (toplam % 10)) % 10
        return checksum == beklenen

    @property
    def kimlik_kodu_formatli(self):
        k = self.kimlik_kodu
        return f'{k[:3]} {k[3:6]} {k[6:]}'

    def __str__(self):
        return f'{self.ad} {self.soyad} ({self.kimlik_kodu_formatli})'

    class Meta:
        verbose_name        = 'Çiftçi'
        verbose_name_plural = 'Çiftçiler'
        ordering            = ['-kayit']


class Isletme(models.Model):

    class Tur(models.TextChoices):
        SERA        = 'sera',        'Sera'
        ACIK_TARLA  = 'acik_tarla',  'Açık Tarla'
        MEYVE_BAHCE = 'meyve_bahce', 'Meyve Bahçesi'
        ZEYTINLIK   = 'zeytinlik',   'Zeytinlik'
        DIGER       = 'diger',       'Diğer'

    class SeraTip(models.TextChoices):
        NAYLON     = 'naylon',     'Naylon'
        CAM        = 'cam',        'Cam'
        POLICARBON = 'policarbon', 'Polikarbon'
        NET        = 'net',        'Net / Gölgelik'
        DIGER      = 'diger',      'Diğer'

    ciftci      = models.ForeignKey(
                      Ciftci,
                      related_name='isletmeler',
                      on_delete=models.CASCADE
                  )
    olusturan   = models.ForeignKey(
                      Kullanici,
                      related_name='olusturulan_isletmeler',
                      on_delete=models.SET_NULL,
                      null=True
                  )
    ad          = models.CharField(max_length=200)
    tur         = models.CharField(max_length=20, choices=Tur.choices)
    sera_tip    = models.CharField(
                      max_length=20,
                      choices=SeraTip.choices,
                      null=True,
                      blank=True
                  )
    urun        = models.ForeignKey(
                      Urun,
                      on_delete=models.SET_NULL,
                      null=True,
                      blank=True
                  )
    cesit       = models.ForeignKey(
                      UrunCesit,
                      on_delete=models.SET_NULL,
                      null=True,
                      blank=True
                  )
    alan_dekar  = models.DecimalField(max_digits=8, decimal_places=2)
    ekim_tarihi = models.DateField(null=True, blank=True)
    enlem       = models.DecimalField(
                      max_digits=9,
                      decimal_places=6,
                      null=True,
                      blank=True,
                      verbose_name='Enlem (Latitude)'
                  )
    boylam      = models.DecimalField(
                      max_digits=9,
                      decimal_places=6,
                      null=True,
                      blank=True,
                      verbose_name='Boylam (Longitude)'
                  )
    aktif       = models.BooleanField(default=True)
    olusturma   = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.ciftci} — {self.ad}'

    class Meta:
        verbose_name        = 'İşletme'
        verbose_name_plural = 'İşletmeler'
        ordering            = ['ciftci', 'ad']
        indexes             = [
            models.Index(fields=['ciftci', 'aktif']),
        ]


class IsletmeFotograf(models.Model):
    isletme   = models.ForeignKey(
                    Isletme,
                    related_name='fotograflar',
                    on_delete=models.CASCADE
                )
    yukleyen  = models.ForeignKey(
                    'accounts.Kullanici',
                    on_delete=models.SET_NULL,
                    null=True
                )
    fotograf  = models.ImageField(upload_to='isletme_fotograflar/%Y/%m/')
    aciklama  = models.CharField(max_length=200, blank=True)
    olusturma = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name        = 'İşletme Fotoğrafı'
        verbose_name_plural = 'İşletme Fotoğrafları'
        ordering            = ['-olusturma']

    def __str__(self):
        return f'{self.isletme.ad} — {self.olusturma:%Y-%m-%d}'


class ToprakAnaliz(models.Model):
    isletme      = models.ForeignKey(
                       Isletme,
                       related_name='toprak_analizler',
                       on_delete=models.CASCADE
                   )
    tarih        = models.DateField()
    ph           = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)
    organik_madde = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, verbose_name='Organik Madde (%)')
    fosfor       = models.DecimalField(max_digits=7, decimal_places=2, null=True, blank=True, verbose_name='Fosfor (kg/da)')
    potasyum     = models.DecimalField(max_digits=7, decimal_places=2, null=True, blank=True, verbose_name='Potasyum (kg/da)')
    kalsiyum     = models.DecimalField(max_digits=7, decimal_places=2, null=True, blank=True, verbose_name='Kalsiyum (kg/da)')
    magnezyum    = models.DecimalField(max_digits=7, decimal_places=2, null=True, blank=True, verbose_name='Magnezyum (kg/da)')
    tuz          = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, verbose_name='Tuz (%)')
    notlar       = models.TextField(blank=True)
    olusturma    = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name        = 'Toprak Analizi'
        verbose_name_plural = 'Toprak Analizleri'
        ordering            = ['-tarih']

    def __str__(self):
        return f'{self.isletme.ad} — Toprak Analizi {self.tarih}'


class MuhendisIsletme(models.Model):

    class Durum(models.TextChoices):
        BEKLIYOR   = 'bekliyor',   'Bekliyor'
        ONAYLANDI  = 'onaylandi',  'Onaylandı'
        REDDEDILDI = 'reddedildi', 'Reddedildi'
        IPTAL      = 'iptal',      'İptal'

    muhendis     = models.ForeignKey(
                       Kullanici,
                       related_name='isletme_iliskileri',
                       on_delete=models.CASCADE
                   )
    isletme      = models.ForeignKey(
                       Isletme,
                       related_name='muhendis_iliskileri',
                       on_delete=models.CASCADE
                   )
    durum        = models.CharField(
                       max_length=20,
                       choices=Durum.choices,
                       default=Durum.BEKLIYOR
                   )
    talep_tarihi = models.DateTimeField(auto_now_add=True)
    yanit_tarihi = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f'{self.muhendis} → {self.isletme} ({self.durum})'

    class Meta:
        verbose_name        = 'Mühendis İşletme'
        verbose_name_plural = 'Mühendis İşletmeler'
        unique_together     = ('muhendis', 'isletme')


# CifciBayii — katalog uygulaması tamamlandıktan sonra eklenecek
class CiftciBayii(models.Model):
    class Durum(models.TextChoices):
        BEKLIYOR  = 'bekliyor',  'Bekliyor'
        ONAYLANDI = 'onaylandi', 'Onaylandı'
        REDDEDILDI = 'reddedildi', 'Reddedildi'

    ciftci     = models.ForeignKey(Ciftci, on_delete=models.CASCADE, related_name='bayii_iliskileri')
    bayii      = models.ForeignKey('katalog.Bayii', on_delete=models.CASCADE, related_name='ciftci_iliskileri')
    baslatan   = models.ForeignKey('accounts.Kullanici', on_delete=models.SET_NULL, null=True, related_name='baslattigi_iliskiler')
    durum      = models.CharField(max_length=20, choices=Durum.choices, default=Durum.BEKLIYOR)
    talep_tarihi = models.DateTimeField(auto_now_add=True)
    yanit_tarihi = models.DateTimeField(null=True, blank=True)
    aktif      = models.BooleanField(default=True)

    class Meta:
        unique_together = ('ciftci', 'bayii')
        verbose_name = 'Çiftçi-Bayii İlişkisi'

    def __str__(self):
        return f"{self.ciftci} — {self.bayii} ({self.durum})"