from django.contrib import admin
from .models import Ziyaret


@admin.register(Ziyaret)
class ZiyaretAdmin(admin.ModelAdmin):
    list_display  = ['muhendis', 'isletme', 'tur', 'tarih', 'saat', 'tamamlandi']
    list_filter   = ['tur', 'tamamlandi', 'tarih']
    search_fields = ['muhendis__username', 'isletme__ad']