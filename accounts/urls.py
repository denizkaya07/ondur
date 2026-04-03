from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

urlpatterns = [
    path('kayit/',           views.KayitView.as_view(),        name='kayit'),
    path('giris/',           views.TelefonGirisView.as_view(), name='giris'),
    path('token/yenile/',    TokenRefreshView.as_view(),       name='token_yenile'),
    path('profil/',          views.ProfilView.as_view(),       name='profil'),
    path('profil/guncelle/', views.ProfilGuncelleView.as_view(), name='profil_guncelle'),
    path('sifre-degistir/',  views.SifreDegistirView.as_view(),  name='sifre_degistir'),
]
