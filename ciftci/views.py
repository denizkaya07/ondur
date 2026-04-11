from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.utils import timezone
from ondur.permissions import IsMuhendis, IsCiftci
from .models import Ciftci, Isletme, MuhendisIsletme, Urun, UrunCesit, CiftciBayii, ToprakAnaliz, IsletmeFotograf
from .serializers import (
    CiftciSerializer, CiftciKisaSerializer,
    IsletmeSerializer, MuhendisIsletmeSerializer,
    UrunSerializer, UrunCesitSerializer,
    CiftciBayiiSerializer, ToprakAnalizSerializer,
    IsletmeFotografSerializer
)
from katalog.models import Bayii


# ── ÜRÜN LİSTELERİ ──

class UrunListView(generics.ListAPIView):
    queryset           = Urun.objects.filter(aktif=True)
    serializer_class   = UrunSerializer
    permission_classes = [IsAuthenticated]


class UrunCesitListView(generics.ListAPIView):
    serializer_class   = UrunCesitSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return UrunCesit.objects.filter(urun_id=self.kwargs['urun_id'], aktif=True)


# ── MÜHENDİS – ÇİFTÇİ ──

class CiftciListView(generics.ListAPIView):
    permission_classes = [IsMuhendis]
    serializer_class   = CiftciSerializer

    def get_queryset(self):
        return Ciftci.objects.filter(aktif=True).prefetch_related('isletmeler')


class CiftciAraView(APIView):
    permission_classes = [IsMuhendis]

    def get(self, request):
        kod = request.query_params.get('kod', '').replace(' ', '')
        if not Ciftci.kimlik_kodu_gecerli_mi(kod):
            return Response({'hata': 'Geçersiz kimlik kodu.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            ciftci = Ciftci.objects.prefetch_related('isletmeler').get(kimlik_kodu=kod, aktif=True)
        except Ciftci.DoesNotExist:
            return Response({'hata': 'Bu kimlik koduna ait çiftçi bulunamadı.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(CiftciSerializer(ciftci).data)


class MuhendisIsletmeTalepView(APIView):
    permission_classes = [IsMuhendis]

    def post(self, request):
        isletme_idler = request.data.get('isletme_idler', [])
        if not isletme_idler:
            return Response({'hata': 'En az bir işletme seçilmeli.'}, status=status.HTTP_400_BAD_REQUEST)

        olusturulan, zaten_var = [], []
        for isletme_id in isletme_idler:
            iliski, created = MuhendisIsletme.objects.get_or_create(
                muhendis=request.user,
                isletme_id=isletme_id,
                defaults={'durum': MuhendisIsletme.Durum.BEKLIYOR}
            )
            (olusturulan if created else zaten_var).append(isletme_id)

        return Response({'olusturulan': olusturulan, 'zaten_var': zaten_var}, status=status.HTTP_201_CREATED)


class CiftciMuhendiseTalepView(APIView):
    """Çiftçi, belirli bir mühendise danışmanlık talebi gönderir."""
    permission_classes = [IsCiftci]

    def post(self, request):
        muhendis_id = request.data.get('muhendis_id')
        isletme_id  = request.data.get('isletme_id')
        if not muhendis_id or not isletme_id:
            return Response({'hata': 'muhendis_id ve isletme_id gerekli.'}, status=status.HTTP_400_BAD_REQUEST)
        isletme = get_object_or_404(Isletme, pk=isletme_id, ciftci__kullanici=request.user)
        from accounts.models import Kullanici
        muhendis = get_object_or_404(Kullanici, pk=muhendis_id, rol='muhendis')
        iliski, created = MuhendisIsletme.objects.get_or_create(
            muhendis=muhendis, isletme=isletme,
            defaults={'durum': MuhendisIsletme.Durum.BEKLIYOR, 'baslatan': 'ciftci'}
        )
        if not created:
            if iliski.durum in (MuhendisIsletme.Durum.IPTAL, MuhendisIsletme.Durum.REDDEDILDI):
                # İptal/reddedilmiş ilişkiye yeniden talep gönderilebilir
                iliski.durum = MuhendisIsletme.Durum.BEKLIYOR
                iliski.baslatan = 'ciftci'
                iliski.yanit_tarihi = None
                iliski.save()
            else:
                return Response({'hata': 'Bu mühendis ile zaten aktif bir ilişki var.'}, status=status.HTTP_400_BAD_REQUEST)
        return Response(MuhendisIsletmeSerializer(iliski).data, status=status.HTTP_201_CREATED)


class MuhendisDanisanlarView(generics.ListAPIView):
    permission_classes = [IsMuhendis]
    serializer_class   = MuhendisIsletmeSerializer

    def get_queryset(self):
        return MuhendisIsletme.objects.filter(
            muhendis=self.request.user,
            durum=MuhendisIsletme.Durum.ONAYLANDI
        ).select_related('isletme__ciftci', 'isletme__urun', 'isletme__cesit')


class MuhendisBekleyenTaleplerView(generics.ListAPIView):
    """Çiftçi tarafından başlatılan ve mühendis onayı bekleyen talepler."""
    permission_classes = [IsMuhendis]
    serializer_class   = MuhendisIsletmeSerializer

    def get_queryset(self):
        return MuhendisIsletme.objects.filter(
            muhendis=self.request.user,
            durum=MuhendisIsletme.Durum.BEKLIYOR,
            baslatan='ciftci',
        ).select_related('isletme__ciftci', 'isletme__urun', 'isletme__cesit')


class MuhendisTalepYanitlaView(APIView):
    """Mühendis, çiftçinin danışmanlık talebini kabul veya reddeder."""
    permission_classes = [IsMuhendis]

    def post(self, request, pk):
        talep = get_object_or_404(
            MuhendisIsletme, pk=pk,
            muhendis=request.user,
            durum=MuhendisIsletme.Durum.BEKLIYOR,
            baslatan='ciftci',
        )
        karar = request.data.get('karar')
        if karar == 'onayla':
            talep.durum = MuhendisIsletme.Durum.ONAYLANDI
        elif karar == 'reddet':
            talep.durum = MuhendisIsletme.Durum.REDDEDILDI
        else:
            return Response({'hata': '"onayla" veya "reddet" olmalı.'}, status=status.HTTP_400_BAD_REQUEST)
        talep.yanit_tarihi = timezone.now()
        talep.save()
        return Response(MuhendisIsletmeSerializer(talep).data)


# ── ÇİFTÇİ ──

class CiftciIsletmelerView(generics.ListAPIView):
    permission_classes = [IsCiftci]
    serializer_class   = IsletmeSerializer

    def get_queryset(self):
        return Isletme.objects.filter(
            ciftci__kullanici=self.request.user, aktif=True
        ).select_related('urun', 'cesit')


class CiftciIsletmeEkleView(generics.CreateAPIView):
    permission_classes = [IsCiftci]
    serializer_class   = IsletmeSerializer

    def perform_create(self, serializer):
        serializer.save(ciftci=self.request.user.ciftci_profili, olusturan=self.request.user)


class CiftciIsletmeGuncelleView(generics.UpdateAPIView):
    permission_classes = [IsCiftci]
    serializer_class   = IsletmeSerializer
    http_method_names  = ['patch']

    def get_queryset(self):
        return Isletme.objects.filter(ciftci__kullanici=self.request.user)


class BekleyenTaleplerView(generics.ListAPIView):
    permission_classes = [IsCiftci]
    serializer_class   = MuhendisIsletmeSerializer

    def get_queryset(self):
        # Sadece mühendisten gelen talepler (çiftçinin kabul/red etmesi gereken)
        return MuhendisIsletme.objects.filter(
            isletme__ciftci__kullanici=self.request.user,
            durum=MuhendisIsletme.Durum.BEKLIYOR,
            baslatan='muhendis',
        ).select_related('muhendis', 'isletme__urun')


class TalepYanitlaView(APIView):
    permission_classes = [IsCiftci]

    def post(self, request, pk):
        talep = get_object_or_404(
            MuhendisIsletme, pk=pk,
            isletme__ciftci__kullanici=request.user,
            durum=MuhendisIsletme.Durum.BEKLIYOR
        )
        karar = request.data.get('karar')
        if karar == 'onayla':
            talep.durum = MuhendisIsletme.Durum.ONAYLANDI
        elif karar == 'reddet':
            talep.durum = MuhendisIsletme.Durum.REDDEDILDI
        else:
            return Response({'hata': '"onayla" veya "reddet" olmalı.'}, status=status.HTTP_400_BAD_REQUEST)
        talep.yanit_tarihi = timezone.now()
        talep.save()
        return Response(MuhendisIsletmeSerializer(talep).data)


class CiftciGonderilenTaleplerView(generics.ListAPIView):
    """Çiftçinin mühendise gönderdiği ve henüz cevaplanmayan talepler."""
    permission_classes = [IsCiftci]
    serializer_class   = MuhendisIsletmeSerializer

    def get_queryset(self):
        return MuhendisIsletme.objects.filter(
            isletme__ciftci__kullanici=self.request.user,
            durum=MuhendisIsletme.Durum.BEKLIYOR,
            baslatan='ciftci',
        ).select_related('muhendis', 'isletme__urun')


class CiftciDanismanlarView(generics.ListAPIView):
    """Çiftçinin onaylı danışman mühendisleri."""
    permission_classes = [IsCiftci]
    serializer_class   = MuhendisIsletmeSerializer

    def get_queryset(self):
        return MuhendisIsletme.objects.filter(
            isletme__ciftci__kullanici=self.request.user,
            durum=MuhendisIsletme.Durum.ONAYLANDI
        ).select_related('muhendis', 'isletme__urun')


class CiftciDanismanGuncelleView(APIView):
    """Çiftçi danışmanlık ilişkisini aktif/pasif yapar veya kaldırır."""
    permission_classes = [IsCiftci]

    def patch(self, request, pk):
        iliski = get_object_or_404(
            MuhendisIsletme, pk=pk,
            isletme__ciftci__kullanici=request.user,
            durum=MuhendisIsletme.Durum.ONAYLANDI
        )
        aksiyon = request.data.get('aksiyon')  # 'iptal'
        if aksiyon == 'iptal':
            iliski.durum = MuhendisIsletme.Durum.IPTAL
            iliski.save()
            return Response({'durum': 'iptal'})
        return Response({'hata': 'Geçersiz aksiyon.'}, status=status.HTTP_400_BAD_REQUEST)


class MuhendisListeleView(generics.ListAPIView):
    """Çiftçinin danışman talebi gönderebileceği mühendis listesi."""
    permission_classes = [IsCiftci]

    def get(self, request):
        from accounts.models import Kullanici
        muhendisl = Kullanici.objects.filter(rol='muhendis', is_active=True).values(
            'id', 'first_name', 'last_name', 'username'
        )
        data = [
            {
                'id': m['id'],
                'ad': f"{m['first_name']} {m['last_name']}".strip() or m['username'],
            }
            for m in muhendisl
        ]
        return Response(data)


# ── ÇİFTÇİ – BAYİİ ──

class CiftciBayiiListView(generics.ListAPIView):
    serializer_class   = CiftciBayiiSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.rol == 'ciftci':
            return CiftciBayii.objects.filter(ciftci__kullanici=user, aktif=True).select_related('bayii')
        elif user.rol == 'bayii':
            return CiftciBayii.objects.filter(bayii__kullanici=user, aktif=True).select_related('ciftci')
        return CiftciBayii.objects.none()


class CiftciBayiiTalepView(generics.CreateAPIView):
    serializer_class   = CiftciBayiiSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        user = self.request.user
        if user.rol == 'ciftci':
            serializer.save(ciftci=user.ciftci_profili, bayii=Bayii.objects.get(pk=self.request.data['bayii']), baslatan=user)
        elif user.rol == 'bayii':
            serializer.save(bayii=user.bayii_profili, ciftci=Ciftci.objects.get(pk=self.request.data['ciftci']), baslatan=user)


class BayiiBekleyenTaleplerView(generics.ListAPIView):
    """Bayiiye gelen ve henüz cevaplanmamış çiftçi talepleri."""
    serializer_class   = CiftciBayiiSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        from ondur.permissions import IsBayii
        if self.request.user.rol != 'bayii':
            return CiftciBayii.objects.none()
        return CiftciBayii.objects.filter(
            bayii__kullanici=self.request.user,
            durum='bekliyor',
            aktif=True,
        ).select_related('ciftci')


class CiftciBayiiKaldirView(APIView):
    """Çiftçi bayii ilişkisini kaldırır (aktif=False)."""
    permission_classes = [IsCiftci]

    def delete(self, request, pk):
        iliski = get_object_or_404(CiftciBayii, pk=pk, ciftci__kullanici=request.user)
        iliski.aktif = False
        iliski.save()
        return Response(status=status.HTTP_204_NO_CONTENT)


class CiftciBayiiYanitView(generics.UpdateAPIView):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.rol == 'ciftci':
            return CiftciBayii.objects.filter(ciftci__kullanici=user)
        elif user.rol == 'bayii':
            return CiftciBayii.objects.filter(bayii__kullanici=user)
        return CiftciBayii.objects.none()

    def patch(self, request, pk):
        iliski = self.get_queryset().get(pk=pk)
        if iliski.baslatan == request.user:
            return Response({'hata': 'Talebi başlatan yanıt veremez.'}, status=status.HTTP_403_FORBIDDEN)
        karar = request.data.get('durum')
        if karar not in ('onaylandi', 'reddedildi'):
            return Response({'hata': 'Geçersiz karar.'}, status=status.HTTP_400_BAD_REQUEST)
        iliski.durum = karar
        iliski.yanit_tarihi = timezone.now()
        iliski.save()
        return Response(CiftciBayiiSerializer(iliski).data)


class ToprakAnalizListView(generics.ListCreateAPIView):
    serializer_class   = ToprakAnalizSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        isletme_id = self.kwargs['isletme_id']
        isletme = get_object_or_404(Isletme, pk=isletme_id)
        # Çiftçi kendi işletmesi, mühendis danışanı ise erişebilir
        user = self.request.user
        if user.rol == 'ciftci':
            get_object_or_404(Ciftci, kullanici=user, isletmeler=isletme)
        elif user.rol == 'muhendis':
            get_object_or_404(MuhendisIsletme, muhendis=user, isletme=isletme)
        return ToprakAnaliz.objects.filter(isletme_id=isletme_id)

    def perform_create(self, serializer):
        serializer.save(isletme_id=self.kwargs['isletme_id'])


def _isletme_erisim_kontrol(user, isletme):
    if user.rol == 'ciftci':
        get_object_or_404(Ciftci, kullanici=user, isletmeler=isletme)
    elif user.rol == 'muhendis':
        get_object_or_404(MuhendisIsletme, muhendis=user, isletme=isletme)


class IsletmeFotografListView(generics.ListCreateAPIView):
    serializer_class   = IsletmeFotografSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        isletme = get_object_or_404(Isletme, pk=self.kwargs['isletme_id'])
        _isletme_erisim_kontrol(self.request.user, isletme)
        return IsletmeFotograf.objects.filter(isletme=isletme)

    def perform_create(self, serializer):
        isletme = get_object_or_404(Isletme, pk=self.kwargs['isletme_id'])
        _isletme_erisim_kontrol(self.request.user, isletme)
        serializer.save(isletme=isletme, yukleyen=self.request.user)


class IsletmeFotografSilView(generics.DestroyAPIView):
    serializer_class   = IsletmeFotografSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        isletme = get_object_or_404(Isletme, pk=self.kwargs['isletme_id'])
        _isletme_erisim_kontrol(self.request.user, isletme)
        return IsletmeFotograf.objects.filter(isletme=isletme)
