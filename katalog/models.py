from django.db import models
from accounts.models import Kullanici


class Uretici(models.Model):
    kullanici = models.OneToOneField(
                    Kullanici,
                    on_delete=models.CASCADE,
                    related_name='uretici_profili'
                )
    firma_adi = models.CharField(max_length=200)
    vergi_no  = models.CharField(max_length=20, unique=True)
    adres     = models.TextField()
    yetkili   = models.CharField(max_length=200)

    def __str__(self):
        return self.firma_adi

    class Meta:
        verbose_name        = 'Üretici'
        verbose_name_plural = 'Üreticiler'
        ordering            = ['firma_adi']


class Bayii(models.Model):
    kullanici = models.OneToOneField(
                    Kullanici,
                    on_delete=models.CASCADE,
                    related_name='bayii_profili'
                )
    firma_adi = models.CharField(max_length=200)
    ruhsat_no = models.CharField(max_length=100)
    il        = models.CharField(max_length=100)
    ilce      = models.CharField(max_length=100)
    telefon   = models.CharField(max_length=20)

    def __str__(self):
        return self.firma_adi

    class Meta:
        verbose_name        = 'Bayii'
        verbose_name_plural = 'Bayiiler'
        ordering            = ['firma_adi']


class EtkenMadde(models.Model):
    ad        = models.CharField(max_length=200, unique=True)
    cas_no    = models.CharField(
                    max_length=50,
                    blank=True,
                    verbose_name='CAS Numarası'
                )
    aktif     = models.BooleanField(default=True)
    onaylandi = models.BooleanField(default=False)
    giris     = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.ad

    class Meta:
        verbose_name        = 'Etken Madde'
        verbose_name_plural = 'Etken Maddeler'
        ordering            = ['ad']


class Ilac(models.Model):

    class Kategori(models.TextChoices):
        FUNGISIT   = 'fungisit',   'Fungisit'
        INSEKTISIT = 'insektisit', 'İnsektisit'
        HERBISIT   = 'herbisit',   'Herbisit'
        AKARISIT   = 'akarisit',   'Akarisit'
        NEMATISIT  = 'nematisit',  'Nematisit'
        RODENTISIT = 'rodentisit', 'Rodentisit'
        MOLLUSISIT = 'mollusisit', 'Mollüsisit'
        DIGER      = 'diger',      'Diğer'

    class AmbalajBirimi(models.TextChoices):
        SISE   = 'sise',   'Şişe'
        KUTU   = 'kutu',   'Kutu'
        TORBA  = 'torba',  'Torba'
        TENEKE = 'teneke', 'Teneke'
        DIGER  = 'diger',  'Diğer'

    uretici            = models.ForeignKey(
                             Uretici,
                             related_name='ilaclar',
                             on_delete=models.CASCADE
                         )
    ticari_ad          = models.CharField(max_length=200)
    kategori           = models.CharField(max_length=20, choices=Kategori.choices)
    formulasyon        = models.CharField(max_length=50)
    ruhsat_no          = models.CharField(max_length=100)
    phi_gun            = models.PositiveIntegerField(
                             verbose_name='PHI (Hasat Öncesi Bekleme Günü)'
                         )
    bekleme_suresi     = models.PositiveIntegerField(
                             null=True,
                             blank=True,
                             verbose_name='İnsan Güvenliği Bekleme Süresi (gün)'
                         )
    endikasyon         = models.TextField(
                             verbose_name='Endikasyon'
                         )
    doz_min            = models.DecimalField(max_digits=8, decimal_places=2)
    doz_max            = models.DecimalField(max_digits=8, decimal_places=2)
    doz_birimi         = models.CharField(max_length=50)
    uygulama_yontemi   = models.CharField(max_length=100)
    kullanim_tavsiyesi = models.TextField(blank=True)
    notlar             = models.TextField(blank=True)
    ambalaj_hacmi      = models.DecimalField(max_digits=8, decimal_places=2)
    ambalaj_birimi     = models.CharField(max_length=10, choices=AmbalajBirimi.choices)
    ambalaj_birim      = models.CharField(max_length=10)
    aktif              = models.BooleanField(default=True)
    onaylandi          = models.BooleanField(default=False)
    giris              = models.DateTimeField(auto_now_add=True)
    guncelleme         = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.ticari_ad} ({self.formulasyon})'

    class Meta:
        verbose_name        = 'İlaç'
        verbose_name_plural = 'İlaçlar'
        ordering            = ['ticari_ad']


class IlacEtkenMadde(models.Model):
    ilac         = models.ForeignKey(
                       Ilac,
                       related_name='etken_maddeler',
                       on_delete=models.CASCADE
                   )
    etken_madde  = models.ForeignKey(
                       EtkenMadde,
                       related_name='ilac_bilesenleri',
                       on_delete=models.PROTECT
                   )
    oran         = models.DecimalField(
                       max_digits=5,
                       decimal_places=2,
                       verbose_name='Oran (%)'
                   )
    miktar       = models.DecimalField(
                       max_digits=8,
                       decimal_places=2,
                       verbose_name='Miktar'
                   )
    miktar_birim = models.CharField(max_length=20)

    def __str__(self):
        return f'{self.etken_madde.ad} %{self.oran} ({self.miktar} {self.miktar_birim})'

    class Meta:
        verbose_name        = 'İlaç Etken Madde'
        verbose_name_plural = 'İlaç Etken Maddeler'
        unique_together     = ('ilac', 'etken_madde')


class Gubre(models.Model):

    class Tur(models.TextChoices):
        MAKRO   = 'makro',   'Makro Gübre'
        MIKRO   = 'mikro',   'Mikro Gübre'
        ORGANIK = 'organik', 'Organik Gübre'
        YAPRAK  = 'yaprak',  'Yaprak Gübresi'
        TOPRAK  = 'toprak',  'Toprak Düzenleyici'
        DIGER   = 'diger',   'Diğer'

    class AmbalajBirimi(models.TextChoices):
        SISE   = 'sise',   'Şişe'
        KUTU   = 'kutu',   'Kutu'
        TORBA  = 'torba',  'Torba'
        TENEKE = 'teneke', 'Teneke'
        DIGER  = 'diger',  'Diğer'

    uretici            = models.ForeignKey(
                             Uretici,
                             related_name='gubreler',
                             on_delete=models.CASCADE
                         )
    ticari_ad          = models.CharField(max_length=200)
    tur                = models.CharField(max_length=20, choices=Tur.choices)
    formulasyon        = models.CharField(max_length=50)
    doz_min            = models.DecimalField(max_digits=8, decimal_places=2)
    doz_max            = models.DecimalField(max_digits=8, decimal_places=2)
    doz_birimi         = models.CharField(max_length=50)
    uygulama_yontemi   = models.CharField(max_length=100)
    bekleme_suresi     = models.PositiveIntegerField(null=True, blank=True)
    kullanim_tavsiyesi = models.TextField(blank=True)
    notlar             = models.TextField(blank=True)
    ambalaj_hacmi      = models.DecimalField(max_digits=8, decimal_places=2)
    ambalaj_birimi     = models.CharField(max_length=10, choices=AmbalajBirimi.choices)
    ambalaj_birim      = models.CharField(max_length=10)
    aktif              = models.BooleanField(default=True)
    onaylandi          = models.BooleanField(default=False)
    giris              = models.DateTimeField(auto_now_add=True)
    guncelleme         = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.ticari_ad} ({self.tur})'

    class Meta:
        verbose_name        = 'Gübre'
        verbose_name_plural = 'Gübreler'
        ordering            = ['ticari_ad']


class GubreEtkenMadde(models.Model):
    gubre        = models.ForeignKey(
                       Gubre,
                       related_name='etken_maddeler',
                       on_delete=models.CASCADE
                   )
    etken_madde  = models.ForeignKey(
                       EtkenMadde,
                       related_name='gubre_bilesenleri',
                       on_delete=models.PROTECT
                   )
    oran         = models.DecimalField(
                       max_digits=5,
                       decimal_places=2,
                       null=True,
                       blank=True,
                       verbose_name='Oran (%)'
                   )
    miktar       = models.DecimalField(
                       max_digits=8,
                       decimal_places=2,
                       null=True,
                       blank=True
                   )
    miktar_birim = models.CharField(max_length=20, blank=True)

    def __str__(self):
        return f'{self.etken_madde.ad} %{self.oran}'

    class Meta:
        verbose_name        = 'Gübre Etken Madde'
        verbose_name_plural = 'Gübre Etken Maddeler'
        unique_together     = ('gubre', 'etken_madde')


class BayiiUrun(models.Model):
    bayii  = models.ForeignKey(
                 Bayii,
                 related_name='urunler',
                 on_delete=models.CASCADE
             )
    ilac   = models.ForeignKey(
                 Ilac,
                 null=True,
                 blank=True,
                 on_delete=models.SET_NULL
             )
    gubre  = models.ForeignKey(
                 Gubre,
                 null=True,
                 blank=True,
                 on_delete=models.SET_NULL
             )
    aktif       = models.BooleanField(default=True)
    stok        = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, verbose_name='Stok (kg/lt/adet)')
    stok_esik   = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, verbose_name='Uyarı Eşiği')
    ekleme      = models.DateTimeField(auto_now_add=True)

    @property
    def stok_kritik(self):
        """Stok eşiğin altındaysa True döner."""
        if self.stok is not None and self.stok_esik is not None:
            return self.stok <= self.stok_esik
        return False

    def __str__(self):
        urun = self.ilac or self.gubre
        return f'{self.bayii} — {urun}'

    class Meta:
        verbose_name        = 'Bayii Ürün'
        verbose_name_plural = 'Bayii Ürünler'


class MuhendisBayii(models.Model):
    muhendis  = models.ForeignKey(
                    Kullanici,
                    related_name='bayii_iliskisi',
                    on_delete=models.CASCADE
                )
    bayii     = models.ForeignKey(
                    Bayii,
                    related_name='muhendisler',
                    on_delete=models.CASCADE
                )
    baslangic = models.DateField()
    aktif     = models.BooleanField(default=True)

    def __str__(self):
        return f'{self.muhendis} — {self.bayii}'

    class Meta:
        verbose_name        = 'Mühendis Bayii'
        verbose_name_plural = 'Mühendis Bayiiler'
        unique_together     = ('muhendis', 'bayii')


class HalFiyat(models.Model):
    """Haftalık hal toptancı fiyatları — manuel veya import ile girilir."""
    urun      = models.ForeignKey(
                    'ciftci.Urun',
                    on_delete=models.CASCADE,
                    related_name='hal_fiyatlar'
                )
    hal_sehir = models.CharField(max_length=100, verbose_name='Hal Şehri')
    tarih     = models.DateField(verbose_name='Hafta Tarihi', db_index=True)
    fiyat_min = models.DecimalField(max_digits=8, decimal_places=2, verbose_name='Min Fiyat (₺/kg)')
    fiyat_max = models.DecimalField(max_digits=8, decimal_places=2, verbose_name='Max Fiyat (₺/kg)')
    fiyat_ort = models.DecimalField(max_digits=8, decimal_places=2, verbose_name='Ort Fiyat (₺/kg)')
    kaynak    = models.CharField(max_length=200, blank=True, verbose_name='Kaynak')

    class Meta:
        verbose_name        = 'Hal Fiyatı'
        verbose_name_plural = 'Hal Fiyatları'
        ordering            = ['-tarih']
        unique_together     = ('urun', 'hal_sehir', 'tarih')
        indexes             = [models.Index(fields=['urun', 'hal_sehir', 'tarih'])]

    def __str__(self):
        return f'{self.urun.ad} — {self.hal_sehir} — {self.tarih}: {self.fiyat_ort}₺'