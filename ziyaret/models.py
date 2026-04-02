from django.db import models
from accounts.models import Kullanici
from ciftci.models import Isletme


class Ziyaret(models.Model):

    class Tip(models.TextChoices):
        SAHA          = 'saha',         'Saha Ziyareti'
        DANISMANLIK   = 'danismanlik',  'Danışmanlık'
        HASAT_KONTROL = 'hasat',        'Hasat Kontrolü'
        RECETE        = 'recete',       'Reçete Ziyareti'
        NUMUNE        = 'numune',       'Numune Alma'
        PLANLAMA      = 'planlama',     'Sezon Planlaması'

    isletme    = models.ForeignKey(
                     Isletme,
                     related_name='ziyaretler',
                     on_delete=models.CASCADE
                 )
    muhendis   = models.ForeignKey(
                     Kullanici,
                     related_name='ziyaretler',
                     on_delete=models.CASCADE
                 )
    tur        = models.CharField(
                     max_length=20,
                     choices=Tip.choices
                 )
    tarih      = models.DateField()
    saat       = models.TimeField()
    sure_dk    = models.PositiveIntegerField(
                     verbose_name='Süre (dakika)'
                 )
    adres      = models.TextField(blank=True)
    notlar     = models.TextField(blank=True)
    tamamlandi = models.BooleanField(default=False)
    olusturma  = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.muhendis} — {self.isletme} ({self.tarih})'

    class Meta:
        verbose_name        = 'Ziyaret'
        verbose_name_plural = 'Ziyaretler'
        ordering            = ['tarih', 'saat']