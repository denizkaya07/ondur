import uuid
from django.contrib.auth.models import AbstractUser
from django.db import models


class Kullanici(AbstractUser):

    class Rol(models.TextChoices):
        YONETICI = 'yonetici', 'Yönetici'
        YARDIMCI = 'yardimci', 'Yardımcı'
        MUHENDIS = 'muhendis', 'Mühendis'
        CIFTCI   = 'ciftci',   'Çiftçi'
        URETICI  = 'uretici',  'Üretici'
        BAYII    = 'bayii',    'Bayii'

    rol     = models.CharField(
                  max_length=20,
                  choices=Rol.choices,
                  default=Rol.CIFTCI
              )
    telefon = models.CharField(
                  max_length=20,
                  unique=True,
                  null=True,
                  blank=True
              )
    il      = models.CharField(max_length=100, blank=True)
    ilce    = models.CharField(max_length=100, blank=True)

    def __str__(self):
        return f'{self.get_full_name()} ({self.rol})'

    class Meta:
        verbose_name        = 'Kullanıcı'
        verbose_name_plural = 'Kullanıcılar'


class YardimciYetki(models.Model):

    class Yetki(models.TextChoices):
        MUHENDIS_EKLE    = 'muhendis_ekle',    'Mühendis Ekle'
        MUHENDIS_DUZENLE = 'muhendis_duzenle',  'Mühendis Düzenle'
        MUHENDIS_PASIF   = 'muhendis_pasif',    'Mühendis Pasif Yap'
        KATALOG_EKLE     = 'katalog_ekle',      'Katalog Ekle'
        KATALOG_DUZENLE  = 'katalog_duzenle',   'Katalog Düzenle'
        KATALOG_SIL      = 'katalog_sil',       'Katalog Sil'
        RAPORLAR         = 'raporlar',          'Raporları Gör'
        KULLANICI_YON    = 'kullanici_yon',     'Kullanıcı Yönetimi'

    yardimci = models.ForeignKey(
                   Kullanici,
                   related_name='yetkiler',
                   on_delete=models.CASCADE
               )
    yetki    = models.CharField(
                   max_length=50,
                   choices=Yetki.choices
               )
    aktif    = models.BooleanField(default=True)
    veren    = models.ForeignKey(
                   Kullanici,
                   related_name='verilen_yetkiler',
                   on_delete=models.CASCADE
               )
    tarih    = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.yardimci} — {self.yetki}'

    class Meta:
        verbose_name        = 'Yardımcı Yetki'
        verbose_name_plural = 'Yardımcı Yetkiler'
        unique_together     = ('yardimci', 'yetki')


class MuhendisIlce(models.Model):

    muhendis = models.ForeignKey(
                   Kullanici,
                   related_name='ilceler',
                   on_delete=models.CASCADE
               )
    il       = models.CharField(max_length=100)
    ilce     = models.CharField(max_length=100)
    aktif    = models.BooleanField(default=True)

    def __str__(self):
        return f'{self.muhendis} — {self.ilce}, {self.il}'

    class Meta:
        verbose_name        = 'Mühendis İlçe'
        verbose_name_plural = 'Mühendis İlçeler'
        unique_together     = ('muhendis', 'il', 'ilce')