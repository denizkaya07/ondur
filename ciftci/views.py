from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.utils import timezone
from .models import Ciftci, Isletme, MuhendisIsletme, Urun, UrunCesit
from .serializers import (
    CiftciSerializer, CiftciKisaSerializer,
    IsletmeSerializer, MuhendisIsletmeSerializer,
    UrunSerializer, UrunCesitSerializer
)


class IsMuhendis(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.rol == 'muhendis'


class IsCiftci(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.rol == 'ciftci'


# ── ÜRÜN LİSTELERİ ──

class UrunListView(generics.ListAPIView):
    queryset           = Urun.objects.filter(aktif=True)
    serializer_class   = UrunSerializer
    permission_classes = [permissions.IsAuthenticated]


class UrunCesitListView(generics.ListAPIView):
    serializer_class   = UrunCesitSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        urun_id = self.kwargs.get('urun_id')
        return UrunCesit.objects.filter(urun_id=urun_id, aktif=True)


# ── MÜHENDİS — ÇİFTÇİ ──

class CiftciAraView(APIView):
    permission_classes = [IsMuhendis]

    def get(self, request):
        kod = request.query_params.get('kod', '').replace(' ', '')

        if not Ciftci.kimlik_kodu_gecerli_mi(kod):
            return Response(
                {'hata': 'Geçersiz kimlik kodu.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            ciftci = Ciftci.objects.prefetch_related('isletmeler').get(
                kimlik_kodu=kod,
                aktif=True
            )
        except Ciftci.DoesNotExist:
            return Response(
                {'hata': 'Bu kimlik koduna ait çiftçi bulunamadı.'},
                status=status.HTTP_404_NOT_FOUND
            )

        return Response(CiftciSerializer(ciftci).data)


class MuhendisIsletmeTalepView(APIView):
    permission_classes = [IsMuhendis]

    def post(self, request):
        isletme_idler = request.data.get('isletme_idler', [])

        if not isletme_idler:
            return Response(
                {'hata': 'En az bir işletme seçilmeli.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        olusturulan = []
        zaten_var   = []

        for isletme_id in isletme_idler:
            iliski, created = MuhendisIsletme.objects.get_or_create(
                muhendis=request.user,
                isletme_id=isletme_id,
                defaults={'durum': MuhendisIsletme.Durum.BEKLIYOR}
            )
            if created:
                olusturulan.append(isletme_id)
            else:
                zaten_var.append(isletme_id)

        return Response({
            'olusturulan': olusturulan,
            'zaten_var'  : zaten_var
        }, status=status.HTTP_201_CREATED)


class MuhendisDanisanlarView(generics.ListAPIView):
    permission_classes = [IsMuhendis]
    serializer_class   = MuhendisIsletmeSerializer

    def get_queryset(self):
        return MuhendisIsletme.objects.filter(
            muhendis=self.request.user,
            durum=MuhendisIsletme.Durum.ONAYLANDI
        ).select_related('isletme__ciftci', 'isletme__urun')


# ── ÇİFTÇİ ──

class CiftciIsletmelerView(generics.ListAPIView):
    permission_classes = [IsCiftci]
    serializer_class   = IsletmeSerializer

    def get_queryset(self):
        return Isletme.objects.filter(
            ciftci__kullanici=self.request.user,
            aktif=True
        )


class CiftciIsletmeEkleView(generics.CreateAPIView):
    permission_classes = [IsCiftci]
    serializer_class   = IsletmeSerializer

    def perform_create(self, serializer):
        ciftci = self.request.user.ciftci_profili
        serializer.save(ciftci=ciftci, olusturan=self.request.user)


class BekleyenTaleplerView(generics.ListAPIView):
    permission_classes = [IsCiftci]
    serializer_class   = MuhendisIsletmeSerializer

    def get_queryset(self):
        return MuhendisIsletme.objects.filter(
            isletme__ciftci__kullanici=self.request.user,
            durum=MuhendisIsletme.Durum.BEKLIYOR
        ).select_related('muhendis', 'isletme')


class TalepYanitlaView(APIView):
    permission_classes = [IsCiftci]

    def post(self, request, pk):
        talep = get_object_or_404(
            MuhendisIsletme,
            pk=pk,
            isletme__ciftci__kullanici=request.user,
            durum=MuhendisIsletme.Durum.BEKLIYOR
        )
        karar = request.data.get('karar')

        if karar == 'onayla':
            talep.durum = MuhendisIsletme.Durum.ONAYLANDI
        elif karar == 'reddet':
            talep.durum = MuhendisIsletme.Durum.REDDEDILDI
        else:
            return Response(
                {'hata': 'Geçersiz karar. "onayla" veya "reddet" olmalı.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        talep.yanit_tarihi = timezone.now()
        talep.save()

        return Response(MuhendisIsletmeSerializer(talep).data)