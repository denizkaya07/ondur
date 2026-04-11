from django.urls import path
from . import views

urlpatterns = [
    # Ürün listeleri
    path('urunler/', views.UrunListView.as_view(), name='urun-list'),
    path('urunler/<int:urun_id>/cesitler/', views.UrunCesitListView.as_view(), name='urun-cesit-list'),

    # Mühendis endpoint'leri
    path('liste/', views.CiftciListView.as_view(), name='ciftci-liste'),
    path('ara/', views.CiftciAraView.as_view(), name='ciftci-ara'),
    path('talep/', views.MuhendisIsletmeTalepView.as_view(), name='isletme-talep'),
    path('danisanlarim/', views.MuhendisDanisanlarView.as_view(), name='danisanlar'),
    path('gelen-talepler/', views.MuhendisBekleyenTaleplerView.as_view(), name='muhendis-gelen-talepler'),
    path('gelen-talepler/<int:pk>/yanit/', views.MuhendisTalepYanitlaView.as_view(), name='muhendis-talep-yanit'),

    # Çiftçi endpoint'leri
    path('isletmelerim/', views.CiftciIsletmelerView.as_view(), name='ciftci-isletmeler'),
    path('isletme/ekle/', views.CiftciIsletmeEkleView.as_view(), name='isletme-ekle'),
    path('isletme/<int:pk>/guncelle/', views.CiftciIsletmeGuncelleView.as_view(), name='isletme-guncelle'),
    path('talepler/', views.BekleyenTaleplerView.as_view(), name='bekleyen-talepler'),
    path('gonderilen-talepler/', views.CiftciGonderilenTaleplerView.as_view(), name='gonderilen-talepler'),
    path('danismanlarim-ciftci/', views.CiftciDanismanlarView.as_view(), name='ciftci-danismanlar'),
    path('danismanlarim-ciftci/<int:pk>/guncelle/', views.CiftciDanismanGuncelleView.as_view(), name='ciftci-danisan-guncelle'),
    path('muhendise-talep/', views.CiftciMuhendiseTalepView.as_view(), name='ciftci-muhendis-talep'),
    path('muhendis/listele/', views.MuhendisListeleView.as_view(), name='muhendis-listele'),
    path('talepler/<int:pk>/yanit/', views.TalepYanitlaView.as_view(), name='talep-yanit'),
    path('bayiilerim/',         views.CiftciBayiiListView.as_view(),   name='ciftci-bayiilerim'),
    path('bayiilerim/<int:pk>/kaldir/', views.CiftciBayiiKaldirView.as_view(), name='ciftci-bayii-kaldir'),
    path('bayii/talep/',        views.CiftciBayiiTalepView.as_view(),  name='ciftci-bayii-talep'),
    path('bayii/yanit/<int:pk>/', views.CiftciBayiiYanitView.as_view(), name='ciftci-bayii-yanit'),
    path('bayii/bekleyen/', views.BayiiBekleyenTaleplerView.as_view(), name='bayii-bekleyen'),
    path('isletme/<int:isletme_id>/toprak-analiz/', views.ToprakAnalizListView.as_view(), name='toprak-analiz'),
    path('isletme/<int:isletme_id>/fotograflar/', views.IsletmeFotografListView.as_view(), name='isletme-fotograflar'),
    path('isletme/<int:isletme_id>/fotograflar/<int:pk>/', views.IsletmeFotografSilView.as_view(), name='isletme-fotograf-sil'),
]
