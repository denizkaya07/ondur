from rest_framework import generics, permissions, filters
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Count, Sum, F, ExpressionWrapper, DecimalField
from ondur.permissions import IsUretici, IsBayii
from .models import Ilac, Gubre, EtkenMadde, BayiiUrun, Bayii
from .serializers import (
    IlacSerializer, IlacKisaSerializer,
    GubreSerializer, GubreKisaSerializer,
    EtkenMaddeSerializer, BayiiUrunSerializer,
    BayiiSerializer
)


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


class UreticiGubreGuncelleView(generics.UpdateAPIView):
    permission_classes = [IsUretici]
    serializer_class   = GubreSerializer

    def get_queryset(self):
        return Gubre.objects.filter(uretici__kullanici=self.request.user)


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


class BayiiListesiView(generics.ListAPIView):
    """Tüm bayii listesi — çiftçi bu listeden bayii seçer."""
    serializer_class   = BayiiSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Bayii.objects.all().order_by('il', 'ilce', 'firma_adi')


class BayiiMusterileriView(APIView):
    """Bayii kendi bağlı müşterilerini ve reçete kalemlerini görür."""
    permission_classes = [IsBayii]

    def get(self, request):
        from ciftci.models import CiftciBayii
        from recete.models import UygulamaAdimKalemi

        bayii     = request.user.bayii_profili
        iliskiler = CiftciBayii.objects.filter(
            bayii=bayii, durum='onaylandi', aktif=True
        ).select_related('ciftci')

        sonuc = []
        for iliski in iliskiler:
            ciftci = iliski.ciftci
            kalemler = UygulamaAdimKalemi.objects.filter(
                adim__recete__isletme__ciftci=ciftci,
                adim__recete__durum='onaylandi',
            ).select_related(
                'ilac', 'gubre', 'adim__recete__isletme'
            ).order_by('-adim__recete__tarih')[:100]

            kalem_list = []
            for k in kalemler:
                r = k.adim.recete
                kalem_list.append({
                    'recete_id':    r.id,
                    'recete_tarih': str(r.tarih),
                    'isletme_ad':   r.isletme.ad,
                    'ilac_ad':      k.ilac.ticari_ad   if k.ilac  else None,
                    'ilac_form':    k.ilac.formulasyon  if k.ilac  else None,
                    'gubre_ad':     k.gubre.ticari_ad  if k.gubre else None,
                    'gubre_tur':    k.gubre.tur         if k.gubre else None,
                    'doz_dekar':    str(k.doz_dekar),
                    'birim':        k.birim,
                })

            sonuc.append({
                'iliski_id':    iliski.id,
                'ciftci_id':    ciftci.id,
                'ciftci_ad':    ciftci.ad,
                'ciftci_soyad': ciftci.soyad,
                'mahalle':      ciftci.mahalle,
                'ilce':         ciftci.ilce,
                'il':           ciftci.il,
                'telefon':      ciftci.telefon,
                'kalemler':     kalem_list,
            })

        return Response(sonuc)