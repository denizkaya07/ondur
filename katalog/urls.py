from django.urls import path
from . import views

urlpatterns = [
    # Genel katalog (tüm roller)
    path('ilaclar/', views.IlacListView.as_view(), name='ilac-list'),
    path('ilaclar/<int:pk>/', views.IlacDetayView.as_view(), name='ilac-detay'),
    path('gubreler/', views.GubreListView.as_view(), name='gubre-list'),
    path('gubreler/<int:pk>/', views.GubreDetayView.as_view(), name='gubre-detay'),

    # Üretici
    path('uretici/ilaclarim/', views.UreticiIlacListView.as_view(), name='uretici-ilac-list'),
    path('uretici/ilaclarim/<int:pk>/', views.UreticiIlacGuncelleView.as_view(), name='uretici-ilac-guncelle'),
    path('uretici/gubrelerim/', views.UreticiGubreListView.as_view(), name='uretici-gubre-list'),
    path('uretici/gubrelerim/<int:pk>/', views.UreticiGubreGuncelleView.as_view(), name='uretici-gubre-guncelle'),

    # Bayii
    path('bayii/urunlerim/', views.BayiiUrunListView.as_view(), name='bayii-urun-list'),
    path('bayii/stok/', views.BayiiUrunStokView.as_view(), name='bayii-stok-liste'),
    path('bayii/stok/<int:pk>/', views.BayiiUrunStokView.as_view(), name='bayii-stok-guncelle'),
    path('bayii/analiz/', views.BayiiAnalizView.as_view(), name='bayii-analiz'),
    path('bayii/bolgem/',       views.BayiiBolgesiView.as_view(),     name='bayii-bolge'),
    path('bayii/listele/',      views.BayiiListesiView.as_view(),     name='bayii-listele'),
    path('bayii/musterilerim/', views.BayiiMusterileriView.as_view(), name='bayii-musteriler'),
    path('isletme-bayii-urunler/', views.IsletmeBayiiUrunleriView.as_view(), name='isletme-bayii-urunler'),
    path('hal-fiyat/', views.HalFiyatView.as_view(), name='hal-fiyat'),
]
