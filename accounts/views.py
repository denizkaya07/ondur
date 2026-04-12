from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.throttling import AnonRateThrottle
from rest_framework_simplejwt.views import TokenObtainPairView
from .models import Kullanici
from .serializers import KayitSerializer, KullaniciSerializer, TelefonTokenSerializer


class KayitThrottle(AnonRateThrottle):
    scope = 'kayit'


class GirisThrottle(AnonRateThrottle):
    scope = 'giris'


class TelefonGirisView(TokenObtainPairView):
    serializer_class  = TelefonTokenSerializer
    throttle_classes  = [GirisThrottle]


class KayitView(generics.CreateAPIView):
    queryset           = Kullanici.objects.all()
    serializer_class   = KayitSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes   = [KayitThrottle]


class ProfilView(generics.RetrieveAPIView):
    serializer_class   = KullaniciSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class ProfilGuncelleView(generics.UpdateAPIView):
    serializer_class   = KullaniciSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class SifreDegistirView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        eski  = request.data.get('eski_sifre', '')
        yeni  = request.data.get('yeni_sifre', '')
        if not request.user.check_password(eski):
            return Response({'eski_sifre': 'Mevcut şifre yanlış.'}, status=status.HTTP_400_BAD_REQUEST)
        if len(yeni) < 8:
            return Response({'yeni_sifre': 'Şifre en az 8 karakter olmalıdır.'}, status=status.HTTP_400_BAD_REQUEST)
        request.user.set_password(yeni)
        request.user.save()
        return Response({'detail': 'Şifre güncellendi.'})
