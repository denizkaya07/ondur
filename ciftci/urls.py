from django.urls import path
from . import views

urlpatterns = [
    # Ürün listeleri
    path('urunler/', views.UrunListView.as_view(), name='urun-list'),
    path('urunler/<int:urun_id>/cesitler/', views.UrunCesitListView.as_view(), name='urun-cesit-list'),

    # Mühendis endpoint'leri
    path('ara/', views.CiftciAraView.as_view(), name='ciftci-ara'),
    path('talep/', views.MuhendisIsletmeTalepView.as_view(), name='isletme-talep'),
    path('danisanlarim/', views.MuhendisDanisanlarView.as_view(), name='danisanlar'),

    # Çiftçi endpoint'leri
    path('isletmelerim/', views.CiftciIsletmelerView.as_view(), name='ciftci-isletmeler'),
    path('isletme/ekle/', views.CiftciIsletmeEkleView.as_view(), name='isletme-ekle'),
    path('talepler/', views.BekleyenTaleplerView.as_view(), name='bekleyen-talepler'),
    path('talepler/<int:pk>/yanit/', views.TalepYanitlaView.as_view(), name='talep-yanit'),
    path('bayiilerim/',         views.CiftciBayiiListView.as_view(),   name='ciftci-bayiilerim'),
    path('bayii/talep/',        views.CiftciBayiiTalepView.as_view(),  name='ciftci-bayii-talep'),
    path('bayii/yanit/<int:pk>/', views.CiftciBayiiYanitView.as_view(), name='ciftci-bayii-yanit'),

]
