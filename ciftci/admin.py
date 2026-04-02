from django.contrib import admin
from .models import Urun, UrunCesit, Ciftci, Isletme, MuhendisIsletme


@admin.register(Urun)
class UrunAdmin(admin.ModelAdmin):
    list_display  = ['ad', 'aktif']
    search_fields = ['ad']
    list_filter   = ['aktif']


@admin.register(UrunCesit)
class UrunCesitAdmin(admin.ModelAdmin):
    list_display  = ['urun', 'ad', 'aktif']
    search_fields = ['ad', 'urun__ad']
    list_filter   = ['aktif', 'urun']


@admin.register(Ciftci)
class CiftciAdmin(admin.ModelAdmin):
    list_display   = ['ad', 'soyad', 'kimlik_kodu_formatli', 'il', 'ilce', 'telefon', 'aktif']
    list_filter    = ['il', 'aktif']
    search_fields  = ['ad', 'soyad', 'kimlik_kodu', 'telefon']
    readonly_fields = ['kimlik_kodu']


@admin.register(Isletme)
class IsletmeAdmin(admin.ModelAdmin):
    list_display  = ['ad', 'ciftci', 'tur', 'urun', 'alan_dekar', 'aktif']
    list_filter   = ['tur', 'aktif']
    search_fields = ['ad', 'ciftci__ad', 'ciftci__soyad']


@admin.register(MuhendisIsletme)
class MuhendisIsletmeAdmin(admin.ModelAdmin):
    list_display  = ['muhendis', 'isletme', 'durum', 'talep_tarihi']
    list_filter   = ['durum']
    search_fields = ['muhendis__username', 'isletme__ad']