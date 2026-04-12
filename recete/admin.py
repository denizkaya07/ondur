from django.contrib import admin
from .models import (
    Recete, UygulamaAdimi, UygulamaAdimKalemi,
    ReceteVersiyon, ReceteYorum, ReceteFotograf, ReceteSablon
)


class UygulamaAdimiInline(admin.TabularInline):
    model = UygulamaAdimi
    extra = 1


class UygulamaAdimKalemiInline(admin.TabularInline):
    model = UygulamaAdimKalemi
    extra = 1


class ReceteYorumInline(admin.TabularInline):
    model = ReceteYorum
    extra = 0


class ReceteFotografInline(admin.TabularInline):
    model = ReceteFotograf
    extra = 0


@admin.register(Recete)
class ReceteAdmin(admin.ModelAdmin):
    list_display  = ['id', 'isletme', 'muhendis', 'tani', 'tarih', 'durum']
    list_filter   = ['durum', 'tarih']
    search_fields = ['isletme__ad', 'muhendis__username', 'tani']
    inlines       = [UygulamaAdimiInline, ReceteYorumInline, ReceteFotografInline]


@admin.register(UygulamaAdimi)
class UygulamaAdimiAdmin(admin.ModelAdmin):
    list_display = ['recete', 'sira_no', 'tanim', 'tip', 'uygulama_tarihi', 'tamamlandi']
    list_filter  = ['tip', 'tamamlandi']
    inlines      = [UygulamaAdimKalemiInline]


@admin.register(ReceteVersiyon)
class ReceteVersiyonAdmin(admin.ModelAdmin):
    list_display  = ['recete', 'versiyon_no', 'duzenleyen', 'duzenleme_tarihi']
    search_fields = ['recete__id']


@admin.register(ReceteYorum)
class ReceteYorumAdmin(admin.ModelAdmin):
    list_display = ['recete', 'yazan', 'tip', 'olusturma']
    list_filter  = ['tip']


@admin.register(ReceteFotograf)
class ReceteFotografAdmin(admin.ModelAdmin):
    list_display = ['recete', 'yukleyen', 'tip', 'olusturma']
    list_filter  = ['tip']


@admin.register(ReceteSablon)
class ReceteSablonAdmin(admin.ModelAdmin):
    list_display  = ['ad', 'muhendis', 'urun', 'guncelleme']
    search_fields = ['ad', 'muhendis__username', 'tani']
    list_filter   = ['urun']
