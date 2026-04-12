from django.contrib import admin
from .models import (
    Uretici, Bayii, EtkenMadde,
    Ilac, IlacEtkenMadde,
    Gubre, GubreEtkenMadde,
    BayiiUrun, MuhendisBayii, HalFiyat
)


class IlacEtkenMaddeInline(admin.TabularInline):
    model = IlacEtkenMadde
    extra = 1


class GubreEtkenMaddeInline(admin.TabularInline):
    model = GubreEtkenMadde
    extra = 1


@admin.register(Uretici)
class UreticiAdmin(admin.ModelAdmin):
    list_display  = ['firma_adi', 'vergi_no', 'yetkili']
    search_fields = ['firma_adi', 'vergi_no']


@admin.register(Bayii)
class BayiiAdmin(admin.ModelAdmin):
    list_display  = ['firma_adi', 'il', 'ilce', 'ruhsat_no']
    list_filter   = ['il']
    search_fields = ['firma_adi', 'ruhsat_no']


@admin.register(EtkenMadde)
class EtkenMaddeAdmin(admin.ModelAdmin):
    list_display  = ['ad', 'cas_no', 'aktif', 'onaylandi']
    search_fields = ['ad', 'cas_no']
    list_filter   = ['aktif', 'onaylandi']


@admin.register(Ilac)
class IlacAdmin(admin.ModelAdmin):
    list_display  = ['ticari_ad', 'kategori', 'formulasyon', 'uretici', 'aktif', 'onaylandi']
    list_filter   = ['kategori', 'aktif', 'onaylandi']
    search_fields = ['ticari_ad', 'ruhsat_no']
    inlines       = [IlacEtkenMaddeInline]


@admin.register(Gubre)
class GubreAdmin(admin.ModelAdmin):
    list_display  = ['ticari_ad', 'tur', 'formulasyon', 'uretici', 'aktif', 'onaylandi']
    list_filter   = ['tur', 'aktif', 'onaylandi']
    search_fields = ['ticari_ad']
    inlines       = [GubreEtkenMaddeInline]


@admin.register(BayiiUrun)
class BayiiUrunAdmin(admin.ModelAdmin):
    list_display  = ['bayii', 'ilac', 'gubre', 'aktif']
    list_filter   = ['aktif']


@admin.register(MuhendisBayii)
class MuhendisBayiiAdmin(admin.ModelAdmin):
    list_display  = ['muhendis', 'bayii', 'baslangic', 'aktif']
    list_filter   = ['aktif']


@admin.register(HalFiyat)
class HalFiyatAdmin(admin.ModelAdmin):
    list_display   = ['urun', 'hal_sehir', 'tarih', 'fiyat_min', 'fiyat_ort', 'fiyat_max', 'kaynak']
    list_filter    = ['urun', 'hal_sehir']
    search_fields  = ['urun__ad', 'hal_sehir']
    date_hierarchy = 'tarih'
    ordering       = ['-tarih']