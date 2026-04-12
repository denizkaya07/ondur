from rest_framework import generics, permissions, filters
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Count, Sum, F, ExpressionWrapper, DecimalField
from rest_framework import permissions as drf_permissions
from ondur.permissions import IsUretici, IsBayii
from .models import Ilac, Gubre, EtkenMadde, BayiiUrun, Bayii, HalFiyat
from ciftci.models import Isletme
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


class BayiiUrunStokView(APIView):
    """Bayii ürününün stok ve eşik değerini günceller. Ayrıca kritik stok listesi döner."""
    permission_classes = [IsBayii]

    def get(self, request):
        """Kritik stokta olan ürünleri döner."""
        bayii = request.user.bayii_profili
        kritikler = BayiiUrun.objects.filter(
            bayii=bayii, aktif=True,
            stok__isnull=False, stok_esik__isnull=False,
            stok__lte=F('stok_esik')
        ).select_related('ilac', 'gubre')
        data = BayiiUrunSerializer(kritikler, many=True).data
        return Response({'kritik_sayisi': len(data), 'urunler': data})

    def patch(self, request, pk):
        """Tek ürünün stok/stok_esik değerini günceller."""
        try:
            urun = BayiiUrun.objects.get(pk=pk, bayii__kullanici=request.user)
        except BayiiUrun.DoesNotExist:
            return Response({'hata': 'Ürün bulunamadı.'}, status=404)
        stok      = request.data.get('stok')
        stok_esik = request.data.get('stok_esik')
        if stok      is not None: urun.stok      = stok
        if stok_esik is not None: urun.stok_esik = stok_esik
        urun.save(update_fields=['stok', 'stok_esik'])
        return Response(BayiiUrunSerializer(urun).data)


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


class IsletmeBayiiUrunleriView(APIView):
    """
    Mühendis için: verilen işletmenin bağlı bayiisinin ürün listesi.
    ?isletme=<id>&tip=stok   → çiftçinin kendi bayiisinin ürünleri
    ?isletme=<id>&tip=bolge  → aynı ildeki tüm bayiilerin ürünleri
    """
    permission_classes = [drf_permissions.IsAuthenticated]

    def get(self, request):
        from ciftci.models import CiftciBayii, Isletme
        isletme_id = request.query_params.get('isletme')
        tip        = request.query_params.get('tip', 'stok')

        if not isletme_id:
            return Response({'hata': 'isletme parametresi gerekli.'}, status=400)

        try:
            isletme = Isletme.objects.select_related('ciftci').get(pk=isletme_id)
        except Isletme.DoesNotExist:
            return Response({'hata': 'İşletme bulunamadı.'}, status=404)

        ciftci = isletme.ciftci

        if tip == 'stok':
            bayii_idler = CiftciBayii.objects.filter(
                ciftci=ciftci, durum='onaylandi'
            ).values_list('bayii_id', flat=True)
        else:
            bayii_idler = Bayii.objects.filter(il=ciftci.il).values_list('id', flat=True)

        urunler = BayiiUrun.objects.filter(
            bayii_id__in=bayii_idler, aktif=True
        ).select_related('ilac', 'gubre')

        ilac_adlar  = set()
        gubre_adlar = set()
        for u in urunler:
            if u.ilac:  ilac_adlar.add(u.ilac.ticari_ad)
            if u.gubre: gubre_adlar.add(u.gubre.ticari_ad)

        return Response({'ilaclar': list(ilac_adlar), 'gubreler': list(gubre_adlar)})

class HalFiyatView(APIView):
    """
    Ürün ve şehre göre haftalık hal fiyatları.
    ?urun_id=1&sehir=Antalya&yil=5  (yil: kaç yıllık geçmiş, default 5)
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from datetime import date, timedelta
        urun_id = request.query_params.get('urun_id')
        sehir   = request.query_params.get('sehir', '')
        yil     = int(request.query_params.get('yil', 5))

        if not urun_id:
            return Response({'hata': 'urun_id zorunlu.'}, status=400)

        bitis    = date.today()
        baslangic = bitis - timedelta(days=365 * yil)

        qs = HalFiyat.objects.filter(
            urun_id=urun_id,
            tarih__gte=baslangic,
            tarih__lte=bitis,
        )
        if sehir:
            qs = qs.filter(hal_sehir__icontains=sehir)

        qs = qs.order_by('tarih').values(
            'tarih', 'hal_sehir', 'fiyat_min', 'fiyat_ort', 'fiyat_max'
        )

        # Şehir listesi (o ürün için kayıtlı)
        sehirler = list(
            HalFiyat.objects.filter(urun_id=urun_id)
            .values_list('hal_sehir', flat=True)
            .distinct()
        )

        return Response({
            'fiyatlar': list(qs),
            'sehirler': sehirler,
        })
