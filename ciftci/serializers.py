from rest_framework import serializers
from .models import Ciftci, Isletme, Urun, UrunCesit, MuhendisIsletme, ToprakAnaliz, IsletmeFotograf


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
            'alan_dekar', 'ortualti_no', 'ekim_tarihi',
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
    isletme     = IsletmeSerializer(read_only=True)
    muhendis_ad = serializers.SerializerMethodField()
    ciftci_id   = serializers.IntegerField(source='isletme.ciftci.id', read_only=True)
    ciftci_ad   = serializers.SerializerMethodField()
    ciftci_soyad = serializers.SerializerMethodField()
    ciftci_mahalle = serializers.SerializerMethodField()
    ciftci_ilce = serializers.SerializerMethodField()
    ciftci_il = serializers.SerializerMethodField()
    ciftci_cks_no = serializers.SerializerMethodField()
    ciftci_telefon = serializers.SerializerMethodField()

    def get_muhendis_ad(self, obj):
        return obj.muhendis.get_full_name() or obj.muhendis.username

    def get_ciftci_ad(self, obj):
        return obj.isletme.ciftci.ad

    def get_ciftci_soyad(self, obj):
        return obj.isletme.ciftci.soyad

    def get_ciftci_mahalle(self, obj):
        return obj.isletme.ciftci.mahalle

    def get_ciftci_ilce(self, obj):
        return obj.isletme.ciftci.ilce

    def get_ciftci_il(self, obj):
        return obj.isletme.ciftci.il

    def get_ciftci_cks_no(self, obj):
        return obj.isletme.ciftci.cks_no

    def get_ciftci_telefon(self, obj):
        return obj.isletme.ciftci.telefon

    class Meta:
        model  = MuhendisIsletme
        fields = ['id', 'isletme', 'muhendis_ad', 'ciftci_id', 'ciftci_ad', 'ciftci_soyad', 'ciftci_mahalle', 'ciftci_ilce', 'ciftci_il', 'ciftci_cks_no', 'ciftci_telefon', 'durum', 'baslatan', 'talep_tarihi', 'yanit_tarihi']

class IsletmeFotografSerializer(serializers.ModelSerializer):
    yukleyen_ad  = serializers.CharField(source='yukleyen.get_full_name', read_only=True)
    yukleyen_rol = serializers.CharField(source='yukleyen.rol', read_only=True)
    fotograf     = serializers.ImageField(use_url=True)

    class Meta:
        model  = IsletmeFotograf
        fields = ['id', 'fotograf', 'aciklama', 'yukleyen_ad', 'yukleyen_rol', 'olusturma']
        read_only_fields = ['yukleyen_ad', 'yukleyen_rol', 'olusturma']


class ToprakAnalizSerializer(serializers.ModelSerializer):
    class Meta:
        model  = ToprakAnaliz
        fields = ['id', 'tarih', 'ph', 'organik_madde', 'fosfor', 'potasyum',
                  'kalsiyum', 'magnezyum', 'tuz', 'notlar', 'olusturma']
        read_only_fields = ['olusturma']


from .models import CiftciBayii

class CiftciBayiiSerializer(serializers.ModelSerializer):
    bayii_adi     = serializers.CharField(source='bayii.firma_adi', read_only=True)
    bayii_il      = serializers.CharField(source='bayii.il',       read_only=True)
    bayii_ilce    = serializers.CharField(source='bayii.ilce',     read_only=True)
    bayii_telefon = serializers.CharField(source='bayii.telefon',  read_only=True)
    ciftci_ad     = serializers.CharField(source='ciftci.ad',      read_only=True)
    ciftci_soyad  = serializers.CharField(source='ciftci.soyad',   read_only=True)

    class Meta:
        model  = CiftciBayii
        fields = ['id', 'ciftci', 'ciftci_ad', 'ciftci_soyad',
                  'bayii', 'bayii_adi', 'bayii_il', 'bayii_ilce', 'bayii_telefon',
                  'baslatan', 'durum', 'talep_tarihi', 'yanit_tarihi', 'aktif']
        read_only_fields = ['baslatan', 'durum', 'talep_tarihi', 'yanit_tarihi']