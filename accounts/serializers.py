from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from rest_framework_simplejwt.tokens import RefreshToken
from .models import Kullanici, MuhendisIlce


class KayitSerializer(serializers.ModelSerializer):
    password  = serializers.CharField(write_only=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True)

    class Meta:
        model  = Kullanici
        fields = [
            'username', 'first_name', 'last_name',
            'telefon', 'rol', 'il', 'ilce',
            'password', 'password2'
        ]

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({'password': 'Şifreler eşleşmiyor.'})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password2')
        password = validated_data.pop('password')
        kullanici = Kullanici(**validated_data)
        kullanici.set_password(password)
        kullanici.save()
        return kullanici


class MuhendisIlceSerializer(serializers.ModelSerializer):
    class Meta:
        model  = MuhendisIlce
        fields = ['id', 'il', 'ilce', 'aktif']


class KullaniciSerializer(serializers.ModelSerializer):
    ilceler    = MuhendisIlceSerializer(many=True, read_only=True)
    rol_profil = serializers.SerializerMethodField()

    class Meta:
        model  = Kullanici
        fields = [
            'id', 'username', 'first_name', 'last_name',
            'telefon', 'rol', 'il', 'ilce', 'ilceler', 'rol_profil'
        ]
        read_only_fields = ['rol']

    def get_rol_profil(self, obj):
        if obj.rol == 'ciftci':
            try:
                p = obj.ciftci_profili
                return {
                    'kimlik_kodu': p.kimlik_kodu_formatli,
                    'cks_no':      p.cks_no,
                    'mahalle':     p.mahalle,
                    'ilce':        p.ilce,
                    'il':          p.il,
                    'telefon':     p.telefon,
                    'isletme_sayisi': p.isletmeler.filter(aktif=True).count(),
                }
            except Exception:
                return None
        if obj.rol == 'bayii':
            try:
                p = obj.bayii_profili
                return {
                    'firma_adi': p.firma_adi,
                    'ruhsat_no': p.ruhsat_no,
                    'il':        p.il,
                    'ilce':      p.ilce,
                    'telefon':   p.telefon,
                }
            except Exception:
                return None
        if obj.rol == 'uretici':
            try:
                p = obj.uretici_profili
                return {
                    'firma_adi': p.firma_adi,
                    'vergi_no':  p.vergi_no,
                    'adres':     p.adres,
                    'yetkili':   p.yetkili,
                }
            except Exception:
                return None
        if obj.rol == 'muhendis':
            ilceler = obj.ilceler.filter(aktif=True).values_list('ilce', 'il')
            return {
                'hizmet_ilceleri': [f'{ilce} / {il}' for ilce, il in ilceler],
            }
        return None


class TelefonTokenSerializer(serializers.Serializer):
    telefon  = serializers.RegexField(
        regex=r'^(0|\+90)?\d{10}$',
        error_messages={'invalid': 'Geçersiz telefon numarası formatı.'}
    )
    password = serializers.CharField()

    def validate(self, attrs):
        telefon  = attrs.get('telefon')
        password = attrs.get('password')

        try:
            kullanici = Kullanici.objects.get(telefon=telefon)
        except Kullanici.DoesNotExist:
            raise serializers.ValidationError('Telefon veya şifre hatalı.')

        if not kullanici.check_password(password):
            raise serializers.ValidationError('Telefon veya şifre hatalı.')

        if not kullanici.is_active:
            raise serializers.ValidationError('Hesap aktif değil.')

        refresh = RefreshToken.for_user(kullanici)
        return {
            'refresh': str(refresh),
            'access':  str(refresh.access_token),
            'rol':     kullanici.rol,
            'telefon': kullanici.telefon,
        }