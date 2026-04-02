from django.urls import path
from . import views

urlpatterns = [
    # Mühendis
    path('', views.ZiyaretListView.as_view(), name='ziyaret-list'),
    path('<int:pk>/', views.ZiyaretDetayView.as_view(), name='ziyaret-detay'),
    path('<int:pk>/tamamla/', views.ZiyaretTamamlaView.as_view(), name='ziyaret-tamamla'),

    # Çiftçi
    path('benim/', views.CiftciZiyaretlerView.as_view(), name='ciftci-ziyaretler'),
]
