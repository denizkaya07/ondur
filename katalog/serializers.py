from rest_framework import serializers
from .models import (
    EtkenMadde, Uretici, Bayii,
    Ilac, IlacEtkenMadde,
    Gubre, GubreEtkenMadde,
    BayiiUrun, MuhendisBayii
)


class EtkenMaddeSerializer(serializers.ModelSerializer):
    class Meta:
        model  = EtkenMadde
        fields = ['id', 'ad', 'cas_no', 'aktif', 'onaylandi']


class IlacEtkenMaddeSerializer(serializers.ModelSerializer):
    etken_madde_ad = serializers.CharField(source='etken_madde.ad', read_only=True)

    class Meta:
        model  = IlacEtkenMadde
        fields = ['id', 'etken_madde', 'etken_madde_ad', 'oran', 'miktar', 'miktar_birim']


class GubreEtkenMaddeSerializer(serializers.ModelSerializer):
    etken_madde_ad = serializers.CharField(source='etken_madde.ad', read_only=True)

    class Meta:
        model  = GubreEtkenMadde
        fields = ['id', 'etken_madde', 'etken_madde_ad', 'oran', 'miktar', 'miktar_birim']


class IlacSerializer(serializers.ModelSerializer):
    etken_maddeler = IlacEtkenMaddeSerializer(many=True, read_only=True)
    uretici_ad     = serializers.CharField(source='uretici.firma_adi', read_only=True)

    class Meta:
        model  = Ilac
        fields = [
            'id', 'ticari_ad', 'kategori', 'formulasyon',
            'ruhsat_no', 'phi_gun', 'bekleme_suresi',
            'endikasyon', 'doz_min', 'doz_max', 'doz_birimi',
            'uygulama_yontemi', 'kullanim_tavsiyesi', 'notlar',
            'ambalaj_hacmi', 'ambalaj_birimi', 'ambalaj_birim',
            'uretici', 'uretici_ad', 'etken_maddeler',
            'aktif', 'onaylandi'
        ]


class IlacKisaSerializer(serializers.ModelSerializer):
    etken_maddeler = IlacEtkenMaddeSerializer(many=True, read_only=True)
    uretici_ad     = serializers.CharField(source='uretici.firma_adi', read_only=True)

    class Meta:
        model  = Ilac
        fields = [
            'id', 'ticari_ad', 'kategori', 'formulasyon',
            'phi_gun', 'doz_min', 'doz_max', 'doz_birimi',
            'uygulama_yontemi', 'uretici_ad', 'etken_maddeler'
        ]


class GubreSerializer(serializers.ModelSerializer):
    etken_maddeler = GubreEtkenMaddeSerializer(many=True, read_only=True)
    uretici_ad     = serializers.CharField(source='uretici.firma_adi', read_only=True)

    class Meta:
        model  = Gubre
        fields = [
            'id', 'ticari_ad', 'tur', 'formulasyon',
            'doz_min', 'doz_max', 'doz_birimi',
            'uygulama_yontemi', 'bekleme_suresi',
            'kullanim_tavsiyesi', 'notlar',
            'ambalaj_hacmi', 'ambalaj_birimi', 'ambalaj_birim',
            'uretici', 'uretici_ad', 'etken_maddeler',
            'aktif', 'onaylandi'
        ]


class GubreKisaSerializer(serializers.ModelSerializer):
    etken_maddeler = GubreEtkenMaddeSerializer(many=True, read_only=True)
    uretici_ad     = serializers.CharField(source='uretici.firma_adi', read_only=True)

    class Meta:
        model  = Gubre
        fields = [
            'id', 'ticari_ad', 'tur', 'formulasyon',
            'doz_min', 'doz_max', 'doz_birimi',
            'uygulama_yontemi', 'uretici_ad', 'etken_maddeler'
        ]


class BayiiUrunSerializer(serializers.ModelSerializer):
    ilac_ad  = serializers.CharField(source='ilac.ticari_ad', read_only=True)
    gubre_ad = serializers.CharField(source='gubre.ticari_ad', read_only=True)

    class Meta:
        model  = BayiiUrun
        fields = ['id', 'ilac', 'ilac_ad', 'gubre', 'gubre_ad', 'aktif']


class UreticiSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Uretici
        fields = ['id', 'firma_adi', 'vergi_no', 'adres', 'yetkili']


class BayiiSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Bayii
        fields = ['id', 'firma_adi', 'ruhsat_no', 'il', 'ilce', 'telefon']