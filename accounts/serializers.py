from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
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
    ilceler = MuhendisIlceSerializer(many=True, read_only=True)

    class Meta:
        model  = Kullanici
        fields = [
            'id', 'username', 'first_name', 'last_name',
            'telefon', 'rol', 'il', 'ilce', 'ilceler'
        ]
        read_only_fields = ['rol']