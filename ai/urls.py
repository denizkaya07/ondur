from django.urls import path
from .views import TeshisView, FotografTeshisView, FotografUrlTeshisView, TavsiyeView, ToprakDegerlendirmeView

urlpatterns = [
    path('teshis/', TeshisView.as_view(), name='ai-teshis'),
    path('fotograf-teshis/', FotografTeshisView.as_view(), name='ai-fotograf-teshis'),
    path('fotograf-teshis-url/', FotografUrlTeshisView.as_view(), name='ai-fotograf-teshis-url'),
    path('tavsiye/', TavsiyeView.as_view(), name='ai-tavsiye'),
    path('toprak-degerlendirme/', ToprakDegerlendirmeView.as_view(), name='ai-toprak'),
]
