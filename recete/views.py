from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.utils import timezone
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


class IsMuhendis(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.rol == 'muhendis'


class IsCiftci(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.rol == 'ciftci'


class IsMuhendisOrCiftci(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.rol in ['muhendis', 'ciftci']


# ── REÇETE ──

class ReceteListView(generics.ListCreateAPIView):
    permission_classes = [IsMuhendis]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return ReceteSerializer
        return ReceteKisaSerializer

    def get_queryset(self):
        qs = Recete.objects.filter(
            muhendis=self.request.user
        ).select_related('isletme__ciftci').order_by('-olusturma')
        isletme_id = self.request.query_params.get('isletme')
        if isletme_id:
            qs = qs.filter(isletme_id=isletme_id)
        return qs

    def perform_create(self, serializer):
        serializer.save(muhendis=self.request.user)


class ReceteDetayView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsMuhendisOrCiftci]

    def get_serializer_class(self):
        return ReceteSerializer

    def get_queryset(self):
        user = self.request.user
        if user.rol == 'muhendis':
            return Recete.objects.filter(muhendis=user)
        elif user.rol == 'ciftci':
            return Recete.objects.filter(
                isletme__ciftci__kullanici=user,
                durum=Recete.Durum.ONAYLANDI
            )
        return Recete.objects.none()

    def perform_update(self, serializer):
        recete = self.get_object()
        # Güncelleme öncesi versiyon kaydet
        ReceteVersiyon.objects.create(
            recete=recete,
            versiyon_no=recete.duzenleme_sayisi + 1,
            tani=recete.tani,
            uygulama_yontemi=recete.uygulama_yontemi,
            notlar=recete.ciftciye_not,
            kalemler=[],
            duzenleyen=self.request.user
        )
        serializer.save(
            duzenleme_sayisi=recete.duzenleme_sayisi + 1
        )


class CiftciRecetelerView(generics.ListAPIView):
    permission_classes = [IsCiftci]
    serializer_class   = ReceteKisaSerializer

    def get_queryset(self):
        return Recete.objects.filter(
            isletme__ciftci__kullanici=self.request.user,
            durum=Recete.Durum.ONAYLANDI
        ).order_by('-olusturma')


# ── UYGULAMA ADIMI ──

class UygulamaAdimiListView(generics.ListCreateAPIView):
    permission_classes = [IsMuhendis]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return UygulamaAdimiEkleSerializer
        return UygulamaAdimiSerializer

    def get_queryset(self):
        return UygulamaAdimi.objects.filter(
            recete_id=self.kwargs['recete_pk'],
            recete__muhendis=self.request.user
        )

    def perform_create(self, serializer):
        recete = get_object_or_404(
            Recete,
            pk=self.kwargs['recete_pk'],
            muhendis=self.request.user
        )
        serializer.save(recete=recete)


class AdimTamamlaView(APIView):
    permission_classes = [IsCiftci]

    def post(self, request, pk):
        adim = get_object_or_404(
            UygulamaAdimi,
            pk=pk,
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
        )

    def perform_create(self, serializer):
        serializer.save(
            yazan=self.request.user,
            recete_id=self.kwargs['recete_pk']
        )


# ── FOTOĞRAF ──

class ReceteFotografListView(generics.ListCreateAPIView):
    permission_classes = [IsMuhendisOrCiftci]
    serializer_class   = ReceteFotografSerializer

    def get_queryset(self):
        return ReceteFotograf.objects.filter(
            recete_id=self.kwargs['recete_pk']
        )

    def perform_create(self, serializer):
        serializer.save(
            yukleyen=self.request.user,
            recete_id=self.kwargs['recete_pk']
        )


# ── VERSİYON ──

class ReceteVersiyonListView(generics.ListAPIView):
    permission_classes = [IsMuhendis]
    serializer_class   = ReceteVersiyonSerializer

    def get_queryset(self):
        return ReceteVersiyon.objects.filter(
            recete_id=self.kwargs['recete_pk'],
            recete__muhendis=self.request.user
        )