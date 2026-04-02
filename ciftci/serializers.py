from rest_framework import serializers
from .models import Ciftci, Isletme, Urun, UrunCesit, MuhendisIsletme


class UrunSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Urun
        fields = ['id', 'ad', 'aktif']


class UrunCesitSerializer(serializers.ModelSerializer):
    class Meta:
        model  = UrunCesit
        fields = ['id', 'urun', 'ad', 'aktif']


class IsletmeSerializer(serializers.ModelSerializer):
    urun_ad  = serializers.CharField(source='urun.ad', read_only=True)
    cesit_ad = serializers.CharField(source='cesit.ad', read_only=True)

    class Meta:
        model  = Isletme
        fields = [
            'id', 'ad', 'tur', 'sera_tip',
            'urun', 'urun_ad', 'cesit', 'cesit_ad',
            'alan_dekar', 'ekim_tarihi',
            'enlem', 'boylam', 'aktif', 'olusturma'
        ]


class CiftciSerializer(serializers.ModelSerializer):
    isletmeler = IsletmeSerializer(many=True, read_only=True)

    class Meta:
        model  = Ciftci
        fields = [
            'id', 'kimlik_kodu', 'kimlik_kodu_formatli',
            'ad', 'soyad', 'cks_no',
            'mahalle', 'ilce', 'il',
            'telefon', 'email',
            'aktif', 'kayit', 'isletmeler'
        ]
        read_only_fields = ['kimlik_kodu', 'kimlik_kodu_formatli']


class CiftciKisaSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Ciftci
        fields = [
            'id', 'kimlik_kodu_formatli',
            'ad', 'soyad', 'ilce', 'il'
        ]


class MuhendisIsletmeSerializer(serializers.ModelSerializer):
    isletme = IsletmeSerializer(read_only=True)

    class Meta:
        model  = MuhendisIsletme
        fields = ['id', 'isletme', 'durum', 'talep_tarihi', 'yanit_tarihi']