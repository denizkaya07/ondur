from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.utils import timezone
from ondur.permissions import IsMuhendis, IsCiftci
from .models import Ciftci, Isletme, MuhendisIsletme, Urun, UrunCesit, CiftciBayii, ToprakAnaliz, IsletmeFotograf, CiftciSorusu, MuhendisDuyuru
from .serializers import (
    CiftciSerializer, CiftciKisaSerializer,
    IsletmeSerializer, MuhendisIsletmeSerializer,
    UrunSerializer, UrunCesitSerializer,
    CiftciBayiiSerializer, ToprakAnalizSerializer,
    IsletmeFotografSerializer, CiftciSorusuSerializer,
    MuhendisDuyuruSerializer
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


# ── ÇİFTÇİ SORULARI ──

class CiftciSoruGonderView(APIView):
    """Çiftçi soru gönderir. Fotoğraf varsa AI teşhis otomatik çalışır."""
    permission_classes = [IsCiftci]

    def post(self, request):
        ciftci = get_object_or_404(Ciftci, kullanici=request.user)
        ser = CiftciSorusuSerializer(data=request.data, context={'request': request})
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)

        soru = ser.save(ciftci=ciftci)

        # Fotoğraf varsa AI teşhisi çalıştır
        if soru.fotograf:
            try:
                from django.conf import settings as dj_settings
                from groq import Groq
                import base64

                api_key = dj_settings.GROQ_API_KEY
                if api_key:
                    gorsel_bytes = soru.fotograf.read()
                    b64 = base64.b64encode(gorsel_bytes).decode('utf-8')
                    ext = soru.fotograf.name.rsplit('.', 1)[-1].lower()
                    mime = 'image/jpeg' if ext in ('jpg', 'jpeg') else f'image/{ext}'

                    client = Groq(api_key=api_key)
                    yanit = client.chat.completions.create(
                        model='meta-llama/llama-4-scout-17b-16e-instruct',
                        max_tokens=400,
                        messages=[{
                            'role': 'user',
                            'content': [
                                {'type': 'image_url', 'image_url': {'url': f'data:{mime};base64,{b64}'}},
                                {'type': 'text', 'text': (
                                    'Bu bitki fotoğrafını incele. '
                                    'Kısa Türkçe teşhis yap: hastalık/zararlı adı, belirtiler, tahmini neden. '
                                    '3-4 cümle yeterli.'
                                )},
                            ],
                        }],
                    )
                    soru.ai_teshis = yanit.choices[0].message.content.strip()
                    soru.save(update_fields=['ai_teshis'])
            except Exception:
                pass  # AI hata verse bile soru kaydedildi

        return Response(CiftciSorusuSerializer(soru, context={'request': request}).data,
                        status=status.HTTP_201_CREATED)


class CiftciSorularimView(APIView):
    """Çiftçi kendi sorularını listeler."""
    permission_classes = [IsCiftci]

    def get(self, request):
        ciftci = get_object_or_404(Ciftci, kullanici=request.user)
        sorular = CiftciSorusu.objects.filter(ciftci=ciftci).select_related('isletme')
        return Response(CiftciSorusuSerializer(sorular, many=True, context={'request': request}).data)


class MuhendisSorularView(APIView):
    """Mühendis, danıştığı çiftçilerin sorularını görür ve yanıtlar."""
    permission_classes = [IsMuhendis]

    def get(self, request):
        # Mühendisin erişebildiği çiftçilerin soruları
        ciftci_idler = MuhendisIsletme.objects.filter(
            muhendis=request.user
        ).values_list('isletme__ciftci__id', flat=True).distinct()

        durum = request.query_params.get('durum', '')
        qs = CiftciSorusu.objects.filter(
            ciftci__id__in=ciftci_idler
        ).select_related('ciftci', 'isletme')
        if durum:
            qs = qs.filter(durum=durum)
        return Response(CiftciSorusuSerializer(qs, many=True, context={'request': request}).data)

    def patch(self, request, pk):
        """Mühendis soruyu yanıtlar."""
        ciftci_idler = MuhendisIsletme.objects.filter(
            muhendis=request.user
        ).values_list('isletme__ciftci__id', flat=True).distinct()

        soru = get_object_or_404(CiftciSorusu, pk=pk, ciftci__id__in=ciftci_idler)
        yanit = request.data.get('yanit', '').strip()
        if not yanit:
            return Response({'hata': 'Yanıt boş olamaz.'}, status=status.HTTP_400_BAD_REQUEST)

        soru.yanit        = yanit
        soru.yanitleyen   = request.user
        soru.durum        = CiftciSorusu.Durum.YANITLANDI
        soru.yanit_tarihi = timezone.now()
        soru.save(update_fields=['yanit', 'yanitleyen', 'durum', 'yanit_tarihi'])
        return Response(CiftciSorusuSerializer(soru, context={'request': request}).data)


class MuhendisDuyuruView(APIView):
    """Mühendis filtreli duyuru gönderir; hedef çiftçi sayısını döner."""
    permission_classes = [IsMuhendis]

    def get(self, request):
        """Mühendis kendi geçmiş duyurularını listeler."""
        duyurular = MuhendisDuyuru.objects.filter(muhendis=request.user)
        return Response(MuhendisDuyuruSerializer(duyurular, many=True).data)

    def post(self, request):
        ser = MuhendisDuyuruSerializer(data=request.data)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)

        duyuru = ser.save(muhendis=request.user)

        # Kaç çiftçiye ulaştı hesapla
        ciftci_idler = MuhendisIsletme.objects.filter(
            muhendis=request.user
        ).values_list('isletme__ciftci__id', flat=True).distinct()

        hedef = Isletme.objects.filter(ciftci__id__in=ciftci_idler, aktif=True)
        if duyuru.urun_id:
            hedef = hedef.filter(urun=duyuru.urun)
        if duyuru.il_filtre:
            hedef = hedef.filter(il__icontains=duyuru.il_filtre)
        if duyuru.ilce_filtre:
            hedef = hedef.filter(ilce__icontains=duyuru.ilce_filtre)

        hedef_sayi = hedef.values('ciftci').distinct().count()
        return Response({'id': duyuru.id, 'hedef_ciftci': hedef_sayi}, status=status.HTTP_201_CREATED)


class CiftciDuyurularView(APIView):
    """Çiftçi, danışman mühendislerinden gelen duyuruları görür (son 30 gün)."""
    permission_classes = [IsCiftci]

    def get(self, request):
        import datetime
        ciftci = get_object_or_404(Ciftci, kullanici=request.user)
        muhendis_idler = MuhendisIsletme.objects.filter(
            isletme__ciftci=ciftci
        ).values_list('muhendis_id', flat=True).distinct()

        son30 = __import__('datetime').date.today() - datetime.timedelta(days=30)
        duyurular = MuhendisDuyuru.objects.filter(
            muhendis_id__in=muhendis_idler,
            olusturma__date__gte=son30
        )

        # Çiftçinin işletmelerine göre filtrele
        isletmeler = Isletme.objects.filter(ciftci=ciftci, aktif=True)
        urun_idler  = set(isletmeler.values_list('urun_id', flat=True))
        iller       = set(i.lower() for i in isletmeler.values_list('il', flat=True) if i)
        ilceler     = set(i.lower() for i in isletmeler.values_list('ilce', flat=True) if i)

        sonuc = []
        for d in duyurular:
            # Filtre yoksa herkese
            if not d.urun_id and not d.il_filtre and not d.ilce_filtre:
                sonuc.append(d); continue
            if d.urun_id and d.urun_id not in urun_idler:
                continue
            if d.il_filtre and d.il_filtre.lower() not in iller:
                continue
            if d.ilce_filtre and d.ilce_filtre.lower() not in ilceler:
                continue
            sonuc.append(d)

        return Response(MuhendisDuyuruSerializer(sonuc, many=True).data)


class MuhendisBekleyenSorularView(APIView):
    """Mühendis: yanıt bekleyen soru sayısını döner (bildirim rozeti için)."""
    permission_classes = [IsMuhendis]

    def get(self, request):
        ciftci_idler = MuhendisIsletme.objects.filter(
            muhendis=request.user
        ).values_list('isletme__ciftci__id', flat=True).distinct()
        sayi = CiftciSorusu.objects.filter(
            ciftci__id__in=ciftci_idler, durum='bekliyor'
        ).count()
        return Response({'bekleyen': sayi})
