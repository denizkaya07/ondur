from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.utils import timezone
from ondur.permissions import IsMuhendis, IsCiftci, IsMuhendisOrCiftci
from .models import (
    Recete, UygulamaAdimi, UygulamaAdimKalemi,
    ReceteVersiyon, ReceteYorum, ReceteFotograf
)
from .serializers import (
    ReceteSerializer, ReceteKisaSerializer,
    UygulamaAdimiSerializer, UygulamaAdimiEkleSerializer,
    ReceteYorumSerializer, ReceteFotografSerializer,
    ReceteVersiyonSerializer
)
from ciftci.models import MuhendisIsletme


# ── REÇETE ──

class ReceteListView(generics.ListCreateAPIView):
    permission_classes = [IsMuhendis]

    def get_serializer_class(self):
        return ReceteSerializer if self.request.method == 'POST' else ReceteKisaSerializer

    def get_queryset(self):
        qs = Recete.objects.filter(
            muhendis=self.request.user
        ).select_related('isletme__ciftci', 'isletme__urun').order_by('-olusturma')
        isletme_id = self.request.query_params.get('isletme')
        if isletme_id:
            qs = qs.filter(isletme_id=isletme_id)
        return qs

    def perform_create(self, serializer):
        serializer.save(muhendis=self.request.user)


class ReceteDetayView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsMuhendisOrCiftci]
    serializer_class   = ReceteSerializer

    def get_queryset(self):
        user = self.request.user
        if user.rol == 'muhendis':
            return Recete.objects.filter(muhendis=user).select_related('isletme__ciftci')
        return Recete.objects.filter(
            isletme__ciftci__kullanici=user,
            durum=Recete.Durum.ONAYLANDI
        ).select_related('isletme__ciftci')

    def perform_update(self, serializer):
        recete = self.get_object()
        ReceteVersiyon.objects.create(
            recete=recete,
            versiyon_no=recete.duzenleme_sayisi + 1,
            tani=recete.tani,
            uygulama_yontemi=recete.uygulama_yontemi,
            notlar=recete.ciftciye_not,
            kalemler=[],
            duzenleyen=self.request.user
        )
        serializer.save(duzenleme_sayisi=recete.duzenleme_sayisi + 1)


class CiftciRecetelerView(generics.ListAPIView):
    permission_classes = [IsCiftci]
    serializer_class   = ReceteKisaSerializer

    def get_queryset(self):
        return Recete.objects.filter(
            isletme__ciftci__kullanici=self.request.user,
            durum=Recete.Durum.ONAYLANDI
        ).select_related('isletme__urun').order_by('-olusturma')


# ── UYGULAMA ADIMI ──

class UygulamaAdimiListView(generics.ListCreateAPIView):
    permission_classes = [IsMuhendis]

    def get_serializer_class(self):
        return UygulamaAdimiEkleSerializer if self.request.method == 'POST' else UygulamaAdimiSerializer

    def get_queryset(self):
        return UygulamaAdimi.objects.filter(
            recete_id=self.kwargs['recete_pk'],
            recete__muhendis=self.request.user
        ).prefetch_related('kalemler__ilac', 'kalemler__gubre')

    def perform_create(self, serializer):
        recete = get_object_or_404(Recete, pk=self.kwargs['recete_pk'], muhendis=self.request.user)
        serializer.save(recete=recete)


class AdimTamamlaView(APIView):
    permission_classes = [IsCiftci]

    def post(self, request, pk):
        adim = get_object_or_404(
            UygulamaAdimi, pk=pk,
            recete__isletme__ciftci__kullanici=request.user
        )
        adim.tamamlandi = True
        adim.save()
        return Response(UygulamaAdimiSerializer(adim).data)


# ── YORUM ──

class ReceteYorumListView(generics.ListCreateAPIView):
    permission_classes = [IsMuhendisOrCiftci]
    serializer_class   = ReceteYorumSerializer

    def get_queryset(self):
        return ReceteYorum.objects.filter(
            recete_id=self.kwargs['recete_pk']
        ).select_related('yazan')

    def perform_create(self, serializer):
        serializer.save(yazan=self.request.user, recete_id=self.kwargs['recete_pk'])


# ── FOTOĞRAF ──

class ReceteFotografListView(generics.ListCreateAPIView):
    permission_classes = [IsMuhendisOrCiftci]
    serializer_class   = ReceteFotografSerializer

    def get_queryset(self):
        return ReceteFotograf.objects.filter(recete_id=self.kwargs['recete_pk'])

    def perform_create(self, serializer):
        serializer.save(yukleyen=self.request.user, recete_id=self.kwargs['recete_pk'])


# ── VERSİYON ──

class ReceteVersiyonListView(generics.ListAPIView):
    permission_classes = [IsMuhendis]
    serializer_class   = ReceteVersiyonSerializer

    def get_queryset(self):
        return ReceteVersiyon.objects.filter(
            recete_id=self.kwargs['recete_pk'],
            recete__muhendis=self.request.user
        ).select_related('duzenleyen')
