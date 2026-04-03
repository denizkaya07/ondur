from django.db import models
from accounts.models import Kullanici
from ciftci.models import Isletme
from katalog.models import Ilac, Gubre


class Recete(models.Model):

    class Durum(models.TextChoices):
        TASLAK    = 'taslak',    'Taslak'
        ONAYLANDI = 'onaylandi', 'Onaylandı'
        IPTAL     = 'iptal',     'İptal'

    isletme          = models.ForeignKey(
                           Isletme,
                           related_name='receteler',
                           on_delete=models.CASCADE
                       )
    muhendis         = models.ForeignKey(
                           Kullanici,
                           related_name='yazilan_receteler',
                           on_delete=models.CASCADE
                       )
    tani             = models.CharField(max_length=300, blank=True)
    tarih            = models.DateField()
    uygulama_yontemi = models.CharField(max_length=100)
    durum            = models.CharField(
                           max_length=20,
                           choices=Durum.choices,
                           default=Durum.TASLAK
                       )
    muhendis_notu    = models.TextField(blank=True)
    hatirlatma       = models.TextField(blank=True)
    ciftciye_not     = models.TextField(blank=True)
    duzenleme_sayisi = models.PositiveIntegerField(default=0)
    olusturma        = models.DateTimeField(auto_now_add=True)
    guncelleme       = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'Reçete #{self.pk} — {self.isletme} ({self.durum})'

    class Meta:
        verbose_name        = 'Reçete'
        verbose_name_plural = 'Reçeteler'
        ordering            = ['-olusturma']
        indexes             = [
            models.Index(fields=['muhendis', '-olusturma']),
            models.Index(fields=['isletme', '-tarih']),
            models.Index(fields=['durum']),
        ]


class UygulamaAdimi(models.Model):

    class Tip(models.TextChoices):
        SULAMA    = 'sulama',    'Sulama'
        ILACLAMA  = 'ilaclama',  'İlaçlama'
        GUBRELEME = 'gubreleme', 'Gübreleme'
        DIGER     = 'diger',     'Diğer'

    recete          = models.ForeignKey(
                          Recete,
                          related_name='adimlar',
                          on_delete=models.CASCADE
                      )
    sira_no         = models.PositiveIntegerField()
    tip             = models.CharField(max_length=20, choices=Tip.choices)
    tanim           = models.CharField(max_length=200, blank=True)
    uygulama_tarihi = models.DateField(null=True, blank=True)
    tamamlandi      = models.BooleanField(default=False)
    notlar          = models.TextField(blank=True)

    def __str__(self):
        return f'{self.recete} — {self.sira_no}. {self.tanim}'

    class Meta:
        verbose_name        = 'Uygulama Adımı'
        verbose_name_plural = 'Uygulama Adımları'
        unique_together     = ('recete', 'sira_no')
        ordering            = ['sira_no']


class UygulamaAdimKalemi(models.Model):
    adim      = models.ForeignKey(
                    UygulamaAdimi,
                    related_name='kalemler',
                    on_delete=models.CASCADE
                )
    ilac      = models.ForeignKey(
                    Ilac,
                    null=True,
                    blank=True,
                    on_delete=models.SET_NULL
                )
    gubre     = models.ForeignKey(
                    Gubre,
                    null=True,
                    blank=True,
                    on_delete=models.SET_NULL
                )
    doz_dekar = models.DecimalField(max_digits=8, decimal_places=2)
    birim     = models.CharField(max_length=50)

    @property
    def toplam_miktar(self):
        return self.doz_dekar * self.adim.recete.isletme.alan_dekar

    def __str__(self):
        urun = self.ilac or self.gubre
        return f'{urun} — {self.doz_dekar} {self.birim}/da'

    class Meta:
        verbose_name        = 'Uygulama Adım Kalemi'
        verbose_name_plural = 'Uygulama Adım Kalemleri'


class ReceteVersiyon(models.Model):
    recete           = models.ForeignKey(
                           Recete,
                           related_name='versiyonlar',
                           on_delete=models.CASCADE
                       )
    versiyon_no      = models.PositiveIntegerField()
    tani             = models.CharField(max_length=300)
    uygulama_yontemi = models.CharField(max_length=100)
    notlar           = models.TextField(blank=True)
    kalemler         = models.JSONField()
    duzenleme_tarihi = models.DateTimeField(auto_now_add=True)
    duzenleyen       = models.ForeignKey(
                           Kullanici,
                           on_delete=models.SET_NULL,
                           null=True
                       )
    duzenleme_notu   = models.TextField(blank=True)

    def __str__(self):
        return f'{self.recete} — v{self.versiyon_no}'

    class Meta:
        verbose_name        = 'Reçete Versiyon'
        verbose_name_plural = 'Reçete Versiyonlar'
        unique_together     = ('recete', 'versiyon_no')
        ordering            = ['-versiyon_no']


class ReceteYorum(models.Model):

    class Tip(models.TextChoices):
        SORU  = 'soru',  'Soru'
        YORUM = 'yorum', 'Yorum'
        YANIT = 'yanit', 'Yanıt'

    recete     = models.ForeignKey(
                     Recete,
                     related_name='yorumlar',
                     on_delete=models.CASCADE
                 )
    yazan      = models.ForeignKey(
                     Kullanici,
                     on_delete=models.CASCADE
                 )
    tip        = models.CharField(max_length=10, choices=Tip.choices)
    ust_yorum  = models.ForeignKey(
                     'self',
                     null=True,
                     blank=True,
                     related_name='yanitlar',
                     on_delete=models.CASCADE
                 )
    metin      = models.TextField()
    olusturma  = models.DateTimeField(auto_now_add=True)
    guncelleme = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.yazan} — {self.tip}'

    class Meta:
        verbose_name        = 'Reçete Yorum'
        verbose_name_plural = 'Reçete Yorumlar'
        ordering            = ['olusturma']


class ReceteFotograf(models.Model):

    class Tip(models.TextChoices):
        HASTALIK = 'hastalik', 'Hastalık / Zararlı'
        UYGULAMA = 'uygulama', 'Uygulama Sonrası'
        GENEL    = 'genel',    'Genel'

    recete    = models.ForeignKey(
                    Recete,
                    related_name='fotograflar',
                    on_delete=models.CASCADE
                )
    yukleyen  = models.ForeignKey(
                    Kullanici,
                    on_delete=models.CASCADE
                )
    fotograf  = models.ImageField(upload_to='recete_fotograflar/%Y/%m/')
    tip       = models.CharField(
                    max_length=20,
                    choices=Tip.choices,
                    default=Tip.GENEL
                )
    aciklama  = models.TextField(blank=True)
    olusturma = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.recete} — {self.tip}'

    class Meta:
        verbose_name        = 'Reçete Fotoğraf'
        verbose_name_plural = 'Reçete Fotoğraflar'
        ordering            = ['olusturma']