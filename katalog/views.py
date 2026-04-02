from rest_framework import generics, permissions, filters
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Count, Sum, F, ExpressionWrapper, DecimalField
from .models import Ilac, Gubre, EtkenMadde, BayiiUrun, Bayii
from .serializers import (
    IlacSerializer, IlacKisaSerializer,
    GubreSerializer, GubreKisaSerializer,
    EtkenMaddeSerializer, BayiiUrunSerializer,
    BayiiSerializer
)


class IsUretici(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.rol == 'uretici'


class IsBayii(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.rol == 'bayii'


# ── İLAÇ ──

class IlacListView(generics.ListAPIView):
    serializer_class   = IlacKisaSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends    = [filters.SearchFilter]
    search_fields      = ['ticari_ad', 'etken_maddeler__etken_madde__ad', 'kategori']

    def get_queryset(self):
        return Ilac.objects.filter(
            aktif=True, onaylandi=True
        ).prefetch_related('etken_maddeler__etken_madde', 'uretici')


class IlacDetayView(generics.RetrieveAPIView):
    serializer_class   = IlacSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Ilac.objects.filter(aktif=True, onaylandi=True)


class UreticiIlacListView(generics.ListCreateAPIView):
    permission_classes = [IsUretici]

    def get_serializer_class(self):
        return IlacSerializer

    def get_queryset(self):
        return Ilac.objects.filter(
            uretici__kullanici=self.request.user
        ).prefetch_related('etken_maddeler__etken_madde')

    def perform_create(self, serializer):
        uretici = self.request.user.uretici_profili
        serializer.save(uretici=uretici)


class UreticiIlacGuncelleView(generics.UpdateAPIView):
    permission_classes = [IsUretici]
    serializer_class   = IlacSerializer

    def get_queryset(self):
        return Ilac.objects.filter(uretici__kullanici=self.request.user)


# ── GÜBRE ──

class GubreListView(generics.ListAPIView):
    serializer_class   = GubreKisaSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends    = [filters.SearchFilter]
    search_fields      = ['ticari_ad', 'etken_maddeler__etken_madde__ad', 'tur']

    def get_queryset(self):
        return Gubre.objects.filter(
            aktif=True, onaylandi=True
        ).prefetch_related('etken_maddeler__etken_madde', 'uretici')


class GubreDetayView(generics.RetrieveAPIView):
    serializer_class   = GubreSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Gubre.objects.filter(aktif=True, onaylandi=True)


class UreticiGubreListView(generics.ListCreateAPIView):
    permission_classes = [IsUretici]
    serializer_class   = GubreSerializer

    def get_queryset(self):
        return Gubre.objects.filter(
            uretici__kullanici=self.request.user
        ).prefetch_related('etken_maddeler__etken_madde')

    def perform_create(self, serializer):
        uretici = self.request.user.uretici_profili
        serializer.save(uretici=uretici)


# ── BAYİİ ──

class BayiiUrunListView(generics.ListCreateAPIView):
    permission_classes = [IsBayii]
    serializer_class   = BayiiUrunSerializer

    def get_queryset(self):
        return BayiiUrun.objects.filter(
            bayii__kullanici=self.request.user,
            aktif=True
        )

    def perform_create(self, serializer):
        bayii = self.request.user.bayii_profili
        serializer.save(bayii=bayii)


class BayiiAnalizView(APIView):
    permission_classes = [IsBayii]

    def get(self, request):
        bayii     = request.user.bayii_profili
        baslangic = request.query_params.get('baslangic')
        bitis     = request.query_params.get('bitis')
        tur       = request.query_params.get('tur', 'tumu')

        from recete.models import UygulamaAdimKalemi

        base = UygulamaAdimKalemi.objects.filter(
            adim__recete__isletme__ciftci__bayii_iliskileri__bayii=bayii,
            adim__recete__isletme__ciftci__bayii_iliskileri__durum='onaylandi',
            adim__recete__durum='onaylandi'
        )

        if baslangic:
            base = base.filter(adim__recete__tarih__gte=baslangic)
        if bitis:
            base = base.filter(adim__recete__tarih__lte=bitis)

        sonuc = {}

        if tur in ('tumu', 'ilac'):
            sonuc['ilaclar'] = list(
                base.filter(ilac__isnull=False).annotate(
                    hesaplanan=ExpressionWrapper(
                        F('doz_dekar') * F('adim__recete__isletme__alan_dekar'),
                        output_field=DecimalField()
                    )
                ).values(
                    'ilac__ticari_ad',
                    'ilac__formulasyon',
                    'ilac__uretici__firma_adi',
                    'birim'
                ).annotate(
                    isletme_sayisi=Count('adim__recete__isletme', distinct=True),
                    recete_sayisi=Count('adim__recete', distinct=True),
                    toplam_miktar=Sum('hesaplanan')
                ).order_by('-toplam_miktar')
            )

        if tur in ('tumu', 'gubre'):
            sonuc['gubreler'] = list(
                base.filter(gubre__isnull=False).annotate(
                    hesaplanan=ExpressionWrapper(
                        F('doz_dekar') * F('adim__recete__isletme__alan_dekar'),
                        output_field=DecimalField()
                    )
                ).values(
                    'gubre__ticari_ad',
                    'gubre__tur',
                    'gubre__uretici__firma_adi',
                    'birim'
                ).annotate(
                    isletme_sayisi=Count('adim__recete__isletme', distinct=True),
                    recete_sayisi=Count('adim__recete', distinct=True),
                    toplam_miktar=Sum('hesaplanan')
                ).order_by('-toplam_miktar')
            )

        return Response(sonuc)


class BayiiBolgesiView(generics.ListAPIView):
    permission_classes = [IsBayii]
    serializer_class   = BayiiSerializer

    def get_queryset(self):
        bayii = self.request.user.bayii_profili
        return Bayii.objects.filter(il=bayii.il)