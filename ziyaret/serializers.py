from rest_framework import serializers
from .models import Ziyaret
from ciftci.serializers import IsletmeSerializer


class ZiyaretSerializer(serializers.ModelSerializer):
    isletme_ad  = serializers.CharField(source='isletme.ad', read_only=True)
    ciftci_ad   = serializers.CharField(source='isletme.ciftci.ad', read_only=True)
    muhendis_ad = serializers.CharField(source='muhendis.get_full_name', read_only=True)
    isletme_enlem  = serializers.DecimalField(
                         source='isletme.enlem',
                         max_digits=9, decimal_places=6,
                         read_only=True
                     )
    isletme_boylam = serializers.DecimalField(
                         source='isletme.boylam',
                         max_digits=9, decimal_places=6,
                         read_only=True
                     )

    class Meta:
        model  = Ziyaret
        fields = [
            'id', 'isletme', 'isletme_ad', 'ciftci_ad',
            'muhendis', 'muhendis_ad',
            'tur', 'tarih', 'saat', 'sure_dk',
            'adres', 'notlar', 'tamamlandi',
            'isletme_enlem', 'isletme_boylam',
            'olusturma'
        ]
        read_only_fields = ['muhendis']


class ZiyaretKisaSerializer(serializers.ModelSerializer):
    isletme_ad = serializers.CharField(source='isletme.ad', read_only=True)
    ciftci_ad  = serializers.CharField(source='isletme.ciftci.ad', read_only=True)

    class Meta:
        model  = Ziyaret
        fields = [
            'id', 'isletme_ad', 'ciftci_ad',
            'tur', 'tarih', 'saat', 'sure_dk', 'tamamlandi'
        ]