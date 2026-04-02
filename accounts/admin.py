from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import Kullanici, YardimciYetki, MuhendisIlce


@admin.register(Kullanici)
class KullaniciAdmin(UserAdmin):
    list_display  = ['username', 'telefon', 'rol', 'il', 'ilce', 'is_active']
    list_filter   = ['rol', 'is_active', 'il']
    search_fields = ['username', 'first_name', 'last_name', 'telefon']
    fieldsets     = UserAdmin.fieldsets + (
        ('Ondur Bilgileri', {
            'fields': ('rol', 'telefon', 'il', 'ilce')
        }),
    )


@admin.register(YardimciYetki)
class YardimciYetkiAdmin(admin.ModelAdmin):
    list_display  = ['yardimci', 'yetki', 'aktif', 'veren', 'tarih']
    list_filter   = ['yetki', 'aktif']
    search_fields = ['yardimci__username']


@admin.register(MuhendisIlce)
class MuhendisIlceAdmin(admin.ModelAdmin):
    list_display  = ['muhendis', 'il', 'ilce', 'aktif']
    list_filter   = ['il', 'aktif']
    search_fields = ['muhendis__username', 'ilce']