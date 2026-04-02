from rest_framework import generics, permissions
from rest_framework.response import Response
from .models import Kullanici
from .serializers import KayitSerializer, KullaniciSerializer


class KayitView(generics.CreateAPIView):
    queryset         = Kullanici.objects.all()
    serializer_class = KayitSerializer
    permission_classes = [permissions.AllowAny]


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