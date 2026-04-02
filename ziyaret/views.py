from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import Ziyaret
from .serializers import ZiyaretSerializer, ZiyaretKisaSerializer


class IsMuhendis(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.rol == 'muhendis'


class IsCiftci(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.rol == 'ciftci'


class IsMuhendisOrCiftci(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.rol in ['muhendis', 'ciftci']


class ZiyaretListView(generics.ListCreateAPIView):
    permission_classes = [IsMuhendis]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return ZiyaretSerializer
        return ZiyaretKisaSerializer

    def get_queryset(self):
        qs = Ziyaret.objects.filter(
            muhendis=self.request.user
        ).select_related('isletme__ciftci')

        tarih = self.request.query_params.get('tarih')
        if tarih:
            qs = qs.filter(tarih=tarih)

        tamamlandi = self.request.query_params.get('tamamlandi')
        if tamamlandi is not None:
            qs = qs.filter(tamamlandi=tamamlandi.lower() == 'true')

        return qs.order_by('tarih', 'saat')

    def perform_create(self, serializer):
        serializer.save(muhendis=self.request.user)


class ZiyaretDetayView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsMuhendisOrCiftci]
    serializer_class   = ZiyaretSerializer

    def get_queryset(self):
        user = self.request.user
        if user.rol == 'muhendis':
            return Ziyaret.objects.filter(muhendis=user)
        elif user.rol == 'ciftci':
            return Ziyaret.objects.filter(
                isletme__ciftci__kullanici=user
            )
        return Ziyaret.objects.none()


class ZiyaretTamamlaView(APIView):
    permission_classes = [IsMuhendis]

    def post(self, request, pk):
        ziyaret = get_object_or_404(
            Ziyaret,
            pk=pk,
            muhendis=request.user
        )
        ziyaret.tamamlandi = True
        ziyaret.save()
        return Response(ZiyaretSerializer(ziyaret).data)


class CiftciZiyaretlerView(generics.ListAPIView):
    permission_classes = [IsCiftci]
    serializer_class   = ZiyaretKisaSerializer

    def get_queryset(self):
        return Ziyaret.objects.filter(
            isletme__ciftci__kullanici=self.request.user
        ).order_by('tarih', 'saat')