from rest_framework import serializers
from .models import (
    Recete, UygulamaAdimi, UygulamaAdimKalemi,
    ReceteVersiyon, ReceteYorum, ReceteFotograf
)
from ciftci.serializers import IsletmeSerializer
from katalog.serializers import IlacKisaSerializer, GubreKisaSerializer


class UygulamaAdimKalemiSerializer(serializers.ModelSerializer):
    ilac_ad       = serializers.CharField(source='ilac.ticari_ad', read_only=True)
    gubre_ad      = serializers.CharField(source='gubre.ticari_ad', read_only=True)
    toplam_miktar = serializers.DecimalField(
                        max_digits=10,
                        decimal_places=2,
                        read_only=True
                    )

    class Meta:
        model  = UygulamaAdimKalemi
        fields = [
            'id', 'ilac', 'ilac_ad', 'gubre', 'gubre_ad',
            'doz_dekar', 'birim', 'toplam_miktar'
        ]


class UygulamaAdimiSerializer(serializers.ModelSerializer):
    kalemler = UygulamaAdimKalemiSerializer(many=True, read_only=True)

    class Meta:
        model  = UygulamaAdimi
        fields = [
            'id', 'sira_no', 'tip', 'tanim',
            'uygulama_tarihi', 'tamamlandi',
            'notlar', 'kalemler'
        ]


class ReceteYorumSerializer(serializers.ModelSerializer):
    yazan_ad = serializers.CharField(source='yazan.get_full_name', read_only=True)
    yazan_rol = serializers.CharField(source='yazan.rol', read_only=True)

    class Meta:
        model  = ReceteYorum
        fields = [
            'id', 'yazan', 'yazan_ad', 'yazan_rol',
            'tip', 'ust_yorum', 'metin', 'olusturma'
        ]
        read_only_fields = ['yazan']


class ReceteFotografSerializer(serializers.ModelSerializer):
    class Meta:
        model  = ReceteFotograf
        fields = ['id', 'fotograf', 'tip', 'aciklama', 'olusturma']
        read_only_fields = ['yukleyen']


class ReceteVersiyonSerializer(serializers.ModelSerializer):
    duzenleyen_ad = serializers.CharField(
                        source='duzenleyen.get_full_name',
                        read_only=True
                    )

    class Meta:
        model  = ReceteVersiyon
        fields = [
            'id', 'versiyon_no', 'tani', 'uygulama_yontemi',
            'notlar', 'kalemler', 'duzenleme_tarihi',
            'duzenleyen', 'duzenleyen_ad', 'duzenleme_notu'
        ]


class ReceteSerializer(serializers.ModelSerializer):
    adimlar          = UygulamaAdimiSerializer(many=True, read_only=True)
    yorumlar         = ReceteYorumSerializer(many=True, read_only=True)
    fotograflar      = ReceteFotografSerializer(many=True, read_only=True)
    isletme_ad       = serializers.CharField(source='isletme.ad', read_only=True)
    ciftci_ad        = serializers.CharField(
                           source='isletme.ciftci.ad',
                           read_only=True
                       )
    muhendis_ad      = serializers.CharField(
                           source='muhendis.get_full_name',
                           read_only=True
                       )

    class Meta:
        model  = Recete
        fields = [
            'id', 'isletme', 'isletme_ad', 'ciftci_ad',
            'muhendis', 'muhendis_ad',
            'tani', 'tarih', 'uygulama_yontemi', 'durum',
            'muhendis_notu', 'hatirlatma', 'ciftciye_not',
            'duzenleme_sayisi', 'olusturma', 'guncelleme',
            'adimlar', 'yorumlar', 'fotograflar'
        ]
        read_only_fields = ['muhendis', 'duzenleme_sayisi']


class ReceteKisaSerializer(serializers.ModelSerializer):
    isletme_ad  = serializers.CharField(source='isletme.ad', read_only=True)
    ciftci_ad   = serializers.CharField(source='isletme.ciftci.ad', read_only=True)
    muhendis_ad = serializers.CharField(source='muhendis.get_full_name', read_only=True)

    class Meta:
        model  = Recete
        fields = [
            'id', 'isletme', 'isletme_ad', 'ciftci_ad',
            'muhendis_ad', 'tani', 'tarih', 'durum', 'olusturma'
        ]


class UygulamaAdimKalemiEkleSerializer(serializers.ModelSerializer):
    class Meta:
        model  = UygulamaAdimKalemi
        fields = ['id', 'ilac', 'gubre', 'doz_dekar', 'birim']


class UygulamaAdimiEkleSerializer(serializers.ModelSerializer):
    kalemler = UygulamaAdimKalemiEkleSerializer(many=True)

    class Meta:
        model  = UygulamaAdimi
        fields = ['id', 'sira_no', 'tip', 'tanim', 'uygulama_tarihi', 'notlar', 'kalemler']

    def create(self, validated_data):
        kalemler_data = validated_data.pop('kalemler')
        adim = UygulamaAdimi.objects.create(**validated_data)
        for kalem_data in kalemler_data:
            UygulamaAdimKalemi.objects.create(adim=adim, **kalem_data)
        return adim