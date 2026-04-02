from django.urls import path
from . import views

urlpatterns = [
    # Mühendis
    path('', views.ReceteListView.as_view(), name='recete-list'),
    path('<int:pk>/', views.ReceteDetayView.as_view(), name='recete-detay'),

    # Uygulama adımları
    path('<int:recete_pk>/adimlar/', views.UygulamaAdimiListView.as_view(), name='adim-list'),
    path('adim/<int:pk>/tamamla/', views.AdimTamamlaView.as_view(), name='adim-tamamla'),

    # Yorumlar
    path('<int:recete_pk>/yorumlar/', views.ReceteYorumListView.as_view(), name='yorum-list'),

    # Fotoğraflar
    path('<int:recete_pk>/fotograflar/', views.ReceteFotografListView.as_view(), name='fotograf-list'),

    # Versiyonlar
    path('<int:recete_pk>/versiyonlar/', views.ReceteVersiyonListView.as_view(), name='versiyon-list'),

    # Çiftçi
    path('benim/', views.CiftciRecetelerView.as_view(), name='ciftci-receteler'),
]