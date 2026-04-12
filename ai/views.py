import json
import base64
import requests
from groq import Groq
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
from ondur.permissions import IsMuhendis
from rest_framework.permissions import IsAuthenticated
from katalog.models import Ilac, BayiiUrun, HalFiyat
from ciftci.models import CiftciBayii, Isletme, ToprakAnaliz


SISTEM_GIRIS = """Sen bir tarım mühendisine yardım eden uzman bir bitki koruma asistanısın.
Görevin: verilen belirti ve ürüne göre hastalık/zararlı teşhisi yap ve ilaç öner.

KURALLAR:
- Yanıtı SADECE JSON formatında ver, başka hiçbir metin ekleme.
- Önerilen ilaçları yalnızca aşağıdaki KATALOG listesinden seç (ilac_id alanını kullan).
- Katalogda uygun ilaç yoksa onerilen_ilaclar listesini boş bırak.
- tani alanı kısa ve net olsun (max 2 cümle).
- muhendis_notu alanına PHI günü, uygulama sıklığı ve dikkat edilmesi gerekenler yaz.

JSON ŞEMASI:
{
  "tani": "string",
  "muhendis_notu": "string",
  "onerilen_ilaclar": [
    {
      "ilac_id": number,
      "ticari_ad": "string",
      "doz": "string",
      "doz_birimi": "string",
      "gerekce": "string"
    }
  ]
}
"""


def katalog_metni(ciftci_id=None):
    """İlaçları metin olarak döner. ciftci_id verilirse sadece o çiftçinin bayiisindeki ilaçlar."""
    if ciftci_id:
        bayii_idler = CiftciBayii.objects.filter(
            ciftci_id=ciftci_id, durum='onaylandi', aktif=True
        ).values_list('bayii_id', flat=True)
        ilac_idler = BayiiUrun.objects.filter(
            bayii_id__in=bayii_idler, ilac__isnull=False, aktif=True
        ).values_list('ilac_id', flat=True)
        ilaclar = Ilac.objects.filter(id__in=ilac_idler, aktif=True, onaylandi=True).only(
            'id', 'ticari_ad', 'kategori', 'endikasyon', 'doz_min', 'doz_max', 'doz_birimi', 'phi_gun'
        )
        baslik = "=== BAYİİ İLAÇ KATALOĞU (Çiftçinin bayiisinde satılan ilaçlar) ==="
    else:
        ilaclar = Ilac.objects.filter(aktif=True, onaylandi=True).only(
            'id', 'ticari_ad', 'kategori', 'endikasyon', 'doz_min', 'doz_max', 'doz_birimi', 'phi_gun'
        )
        baslik = "=== İLAÇ KATALOĞU ==="

    satirlar = [baslik]
    for ilac in ilaclar:
        satirlar.append(
            f"[{ilac.id}] {ilac.ticari_ad} ({ilac.get_kategori_display()}) — "
            f"Endikasyon: {ilac.endikasyon} — "
            f"Doz: {ilac.doz_min}–{ilac.doz_max} {ilac.doz_birimi} — "
            f"PHI: {ilac.phi_gun} gün"
        )
    return "\n".join(satirlar)


class TeshisView(APIView):
    permission_classes = [IsMuhendis]

    def post(self, request):
        api_key = settings.GROQ_API_KEY
        if not api_key:
            return Response(
                {'hata': 'AI servisi yapılandırılmamış. GROQ_API_KEY eksik.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        semptomlar = request.data.get('semptomlar', '').strip()
        urun_adi   = request.data.get('urun_adi', '').strip()
        alan_dekar = request.data.get('alan_dekar', '')
        ciftci_id  = request.data.get('ciftci_id') or None

        if not semptomlar or not urun_adi:
            return Response(
                {'hata': 'semptomlar ve urun_adi zorunlu.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        katalog = katalog_metni(ciftci_id=ciftci_id)
        sistem_prompt = f"{SISTEM_GIRIS}\n\n{katalog}"

        kullanici_mesaji = (
            f"Ürün: {urun_adi}\n"
            f"Alan: {alan_dekar} dekar\n"
            f"Belirtiler: {semptomlar}"
        )

        try:
            client = Groq(api_key=api_key)
            yanit = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                max_tokens=1024,
                messages=[
                    {"role": "system", "content": sistem_prompt},
                    {"role": "user",   "content": kullanici_mesaji},
                ],
            )
            icerik = yanit.choices[0].message.content.strip()
            if icerik.startswith("```"):
                icerik = icerik.split("```")[1]
                if icerik.startswith("json"):
                    icerik = icerik[4:]
                icerik = icerik.strip()
            veri = json.loads(icerik)
            return Response(veri)
        except json.JSONDecodeError:
            return Response(
                {'hata': 'AI yanıtı işlenemedi. Lütfen tekrar deneyin.'},
                status=status.HTTP_502_BAD_GATEWAY
            )
        except Exception as e:
            return Response(
                {'hata': f'AI servisi hatası: {str(e)}'},
                status=status.HTTP_502_BAD_GATEWAY
            )


GORSEL_SISTEM_GIRIS = """Sen bir tarım mühendisine yardım eden uzman bir bitki koruma asistanısın.
Görevin: verilen fotoğrafa bakarak bitki hastalığı/zararlı teşhisi yap ve ilaç öner.

KURALLAR:
- Yanıtı SADECE JSON formatında ver, başka hiçbir metin ekleme.
- Önerilen ilaçları yalnızca aşağıdaki KATALOG listesinden seç (ilac_id alanını kullan).
- Katalogda uygun ilaç yoksa onerilen_ilaclar listesini boş bırak.
- tani alanı kısa ve net olsun (max 2 cümle), TÜRKÇE yaz.
- muhendis_notu alanına PHI günü, uygulama sıklığı ve dikkat edilmesi gerekenler yaz, TÜRKÇE.
- Fotoğraf bitki içermiyorsa tani alanına "Fotoğrafta bitki tespit edilemedi." yaz.

JSON ŞEMASI:
{
  "tani": "string",
  "muhendis_notu": "string",
  "onerilen_ilaclar": [
    {
      "ilac_id": number,
      "ticari_ad": "string",
      "doz": "string",
      "doz_birimi": "string",
      "gerekce": "string"
    }
  ]
}
"""


def gorsel_groq_analiz(gorsel_bytes, api_key, ciftci_id=None):
    """Fotoğrafı Groq vision modeline gönderir, JSON döner."""
    b64 = base64.b64encode(gorsel_bytes).decode('utf-8')
    katalog = katalog_metni(ciftci_id=ciftci_id)
    sistem = f"{GORSEL_SISTEM_GIRIS}\n\n{katalog}"

    client = Groq(api_key=api_key)
    yanit = client.chat.completions.create(
        model="meta-llama/llama-4-scout-17b-16e-instruct",
        max_tokens=1024,
        messages=[
            {"role": "system", "content": sistem},
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/jpeg;base64,{b64}"},
                    },
                    {
                        "type": "text",
                        "text": "Bu fotoğraftaki bitkiyi incele. Hastalık veya zararlı var mı? Teşhis yap ve uygun ilaç öner.",
                    },
                ],
            },
        ],
    )
    icerik = yanit.choices[0].message.content.strip()
    if icerik.startswith("```"):
        icerik = icerik.split("```")[1]
        if icerik.startswith("json"):
            icerik = icerik[4:]
        icerik = icerik.strip()
    return json.loads(icerik)


class FotografTeshisView(APIView):
    permission_classes = [IsMuhendis]

    def post(self, request):
        api_key = settings.GROQ_API_KEY
        if not api_key:
            return Response(
                {'hata': 'GROQ_API_KEY yapılandırılmamış.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        fotograf  = request.FILES.get('fotograf')
        ciftci_id = request.data.get('ciftci_id') or None
        if not fotograf:
            return Response(
                {'hata': 'fotograf alanı zorunlu.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            veri = gorsel_groq_analiz(fotograf.read(), api_key, ciftci_id=ciftci_id)
            return Response(veri)
        except json.JSONDecodeError:
            return Response(
                {'hata': 'AI yanıtı işlenemedi. Lütfen tekrar deneyin.'},
                status=status.HTTP_502_BAD_GATEWAY
            )
        except Exception as e:
            return Response(
                {'hata': f'AI servisi hatası: {str(e)}'},
                status=status.HTTP_502_BAD_GATEWAY
            )


class FotografUrlTeshisView(APIView):
    """Sunucudaki mevcut fotoğraf URL'sini alıp Groq vision modeline gönderir."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        api_key = settings.GROQ_API_KEY
        if not api_key:
            return Response(
                {'hata': 'GROQ_API_KEY yapılandırılmamış.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        fotograf_url = request.data.get('url', '').strip()
        isletme_id   = request.data.get('isletme_id') or None
        if not fotograf_url:
            return Response({'hata': 'url alanı zorunlu.'}, status=status.HTTP_400_BAD_REQUEST)

        # İşletmeden çiftçiyi bul
        ciftci_id = None
        if isletme_id:
            try:
                ciftci_id = Isletme.objects.values_list('ciftci_id', flat=True).get(pk=isletme_id)
            except Isletme.DoesNotExist:
                pass

        try:
            r = requests.get(fotograf_url, timeout=15)
            r.raise_for_status()
            veri = gorsel_groq_analiz(r.content, api_key, ciftci_id=ciftci_id)
            return Response(veri)
        except requests.RequestException as e:
            return Response(
                {'hata': f'Fotoğraf indirilemedi: {str(e)}'},
                status=status.HTTP_502_BAD_GATEWAY
            )
        except json.JSONDecodeError:
            return Response(
                {'hata': 'AI yanıtı işlenemedi. Lütfen tekrar deneyin.'},
                status=status.HTTP_502_BAD_GATEWAY
            )
        except Exception as e:
            return Response(
                {'hata': f'AI servisi hatası: {str(e)}'},
                status=status.HTTP_502_BAD_GATEWAY
            )


def hava_durumu_metni(enlem, boylam):
    """Open-Meteo'dan 7 günlük hava verisi çeker, metin döner."""
    try:
        url = (
            f"https://api.open-meteo.com/v1/forecast"
            f"?latitude={enlem}&longitude={boylam}"
            f"&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode"
            f"&timezone=Europe%2FIstanbul&forecast_days=7"
        )
        r = requests.get(url, timeout=10)
        r.raise_for_status()
        d = r.json().get('daily', {})
        satirlar = ["=== HAVA DURUMU (önümüzdeki 7 gün) ==="]
        for i, tarih in enumerate(d.get('time', [])):
            satirlar.append(
                f"{tarih}: max {d['temperature_2m_max'][i]}°C, "
                f"min {d['temperature_2m_min'][i]}°C, "
                f"yağış {d['precipitation_sum'][i]} mm"
            )
        return "\n".join(satirlar)
    except Exception:
        return ""


class TavsiyeView(APIView):
    """Çiftçiye işletmesi için AI tavsiyesi üretir."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        api_key = settings.GROQ_API_KEY
        if not api_key:
            return Response({'hata': 'GROQ_API_KEY yapılandırılmamış.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        isletme_id = request.data.get('isletme_id')
        if not isletme_id:
            return Response({'hata': 'isletme_id zorunlu.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            isletme = Isletme.objects.select_related('urun', 'cesit').get(pk=isletme_id)
        except Isletme.DoesNotExist:
            return Response({'hata': 'İşletme bulunamadı.'}, status=status.HTTP_404_NOT_FOUND)

        # Toprak analizi (en son)
        toprak = ToprakAnaliz.objects.filter(isletme=isletme).order_by('-tarih').first()

        # Ekim bilgisi
        bugun = __import__('datetime').date.today()
        gun_sayisi = (bugun - isletme.ekim_tarihi).days if isletme.ekim_tarihi else None

        # Hava durumu
        hava = ''
        if isletme.enlem and isletme.boylam:
            hava = hava_durumu_metni(isletme.enlem, isletme.boylam)

        # Prompt
        satirlar = ["=== İŞLETME BİLGİSİ ==="]
        satirlar.append(f"İşletme adı: {isletme.ad}")
        satirlar.append(f"Tür: {isletme.get_tur_display()}")
        satirlar.append(f"Ürün: {isletme.urun.ad if isletme.urun else 'Belirtilmemiş'}")
        satirlar.append(f"Çeşit: {isletme.cesit.ad if isletme.cesit else 'Belirtilmemiş'}")
        satirlar.append(f"Alan: {isletme.alan_dekar} dekar")
        satirlar.append(f"Konum: {isletme.mahalle}, {isletme.ilce}, {isletme.il}")
        if isletme.ekim_tarihi:
            satirlar.append(f"Ekim tarihi: {isletme.ekim_tarihi} ({gun_sayisi} gün önce)")
        if toprak:
            satirlar.append(f"\n=== TOPRAK ANALİZİ ({toprak.tarih}) ===")
            if toprak.ph:          satirlar.append(f"pH: {toprak.ph}")
            if toprak.organik_madde: satirlar.append(f"Organik madde: %{toprak.organik_madde}")
            if toprak.fosfor:      satirlar.append(f"Fosfor: {toprak.fosfor} kg/da")
            if toprak.potasyum:    satirlar.append(f"Potasyum: {toprak.potasyum} kg/da")
            if toprak.kalsiyum:    satirlar.append(f"Kalsiyum: {toprak.kalsiyum} kg/da")
            if toprak.magnezyum:   satirlar.append(f"Magnezyum: {toprak.magnezyum} kg/da")
            if toprak.tuz:         satirlar.append(f"Tuz: %{toprak.tuz}")
        if hava:
            satirlar.append(f"\n{hava}")

        # Hal fiyatları (son 8 hafta + 1 yıl önce aynı dönem)
        if isletme.urun_id:
            import datetime
            bugun_d = bugun
            son_fiyatlar = HalFiyat.objects.filter(
                urun_id=isletme.urun_id,
                tarih__gte=bugun_d - datetime.timedelta(weeks=8)
            ).order_by('tarih').values('tarih', 'hal_sehir', 'fiyat_ort')[:8]
            if son_fiyatlar:
                satirlar.append("\n=== HAL FİYATLARI (Son 8 Hafta) ===")
                for f in son_fiyatlar:
                    satirlar.append(f"{f['tarih']} {f['hal_sehir']}: {f['fiyat_ort']}₺/kg")

        isletme_metni = "\n".join(satirlar)

        kullanici_tipi = request.data.get('kullanici_tipi', 'ciftci')  # 'ciftci' veya 'muhendis'

        if kullanici_tipi == 'muhendis':
            dil_talimat = (
                "Muhatap: Ziraat mühendisi. "
                "Teknik, mesleki Türkçe kullan. "
                "Fenolojik evre, EC değeri, mg/L dozaj, entegre mücadele eşiği, bitki besin elementi denklemi gibi teknik terimleri serbestçe kullan. "
                "Öneriler somut ve ölçülebilir olsun (doz, sıklık, eşik değer). "
                "Gereksiz sadeleştirme yapma; mühendis detayı anlayacaktır."
            )
        else:
            dil_talimat = (
                "Muhatap: Çiftçi. "
                "Sade, anlaşılır, samimi Türkçe kullan. "
                "Teknik jargondan kaçın; zorunluysa parantez içinde kısa açıkla. "
                "Talimatlar pratik ve adım adım olsun — 'Ne yapacağımı tam bildim' dedirtecek netlikte."
            )

        sistem = f"""Sen deneyimli bir tarım danışmanısın.

{dil_talimat}

KURALLAR:
- Yanıtı SADECE JSON formatında ver.
- yapilacaklar: en fazla 7 madde, kısa ve pratik. Hava durumu verisindeki kritik durumlara göre mutlaka somut aksiyon ekle. Örnek: "Önümüzdeki 2 günde kuvvetli yağış bekleniyor — fungisit uygulamasını erteleyin.", "Sıcaklık 38°C'ye çıkacak — gölgeleme ve sabah sulaması yapın.", "Gece sıcaklığı 8°C'ye düşüyor — don koruma tedbirlerini alın."
- hava_uyarisi: hava durumuna özgü 1-2 cümle acil uyarı. Kritik durum yoksa boş string bırak.
- tahmini_hasat_tarihi: yaklaşık tarih aralığı (örn: "15-30 Ağustos 2025").
- tahmini_hasat_miktari: dekar başına veya toplam tahmini (örn: "5-7 ton/da").
- genel_durum: 2-3 cümle genel değerlendirme. Son cümleyi şu fikir üzerine kur, ama tamamen kendi cümlelerinle, doğal ve şiirsel: \
toprak ve hava nem/ısı verileri olsaydı tahminler daha isabetli olurdu, önceden uyarılmak mümkün olurdu, \
daha az masraf daha az emek daha fazla hasat ve kalite — yani onmak. \
"Onmak nedir? Siz zaten biliyorsunuz. onduran.com.tr"
- Ekim tarihi yoksa hasat tahmini yapma, "Ekim tarihi girilmemiş" yaz.
- DİL KURALI: Tüm metinleri yalnızca TÜRKÇE yaz. "slightly", "medium", "high", "low" gibi İngilizce kelimeler KESİNLİKLE yasaktır.

JSON ŞEMASI:
{{
  "genel_durum": "string",
  "hava_uyarisi": "string",
  "yapilacaklar": ["string", ...],
  "tahmini_hasat_tarihi": "string",
  "tahmini_hasat_miktari": "string"
}}"""

        try:
            client = Groq(api_key=api_key)
            yanit = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                max_tokens=800,
                messages=[
                    {"role": "system", "content": sistem},
                    {"role": "user",   "content": isletme_metni},
                ],
            )
            icerik = yanit.choices[0].message.content.strip()
            if icerik.startswith("```"):
                icerik = icerik.split("```")[1]
                if icerik.startswith("json"):
                    icerik = icerik[4:]
                icerik = icerik.strip()
            return Response(json.loads(icerik))
        except json.JSONDecodeError:
            return Response({'hata': 'AI yanıtı işlenemedi.'}, status=status.HTTP_502_BAD_GATEWAY)
        except Exception as e:
            return Response({'hata': f'AI servisi hatası: {str(e)}'}, status=status.HTTP_502_BAD_GATEWAY)




class ToprakDegerlendirmeView(APIView):
    """Toprak analizi + ekili ürün => uygunluk, daha iyi bitkiler, yapilacaklar."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        api_key = settings.GROQ_API_KEY
        if not api_key:
            return Response({'hata': 'GROQ_API_KEY eksik.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        isletme_id = request.data.get('isletme_id')
        if not isletme_id:
            return Response({'hata': 'isletme_id zorunlu.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            isletme = Isletme.objects.select_related('urun', 'cesit').get(pk=isletme_id)
        except Isletme.DoesNotExist:
            return Response({'hata': 'Isletme bulunamadi.'}, status=status.HTTP_404_NOT_FOUND)

        toprak = ToprakAnaliz.objects.filter(isletme=isletme).order_by('-tarih').first()
        if not toprak:
            return Response({'hata': 'Bu isletmeye ait toprak analizi yok.'}, status=status.HTTP_404_NOT_FOUND)

        urun_adi = isletme.urun.ad if isletme.urun else 'Bilinmiyor'

        satirlar = [f"Ürün: {urun_adi}"]
        if isletme.cesit: satirlar.append(f"Cesit: {isletme.cesit.ad}")
        satirlar.append(f"Isletme turu: {isletme.get_tur_display()}")
        satirlar.append(f"Konum: {isletme.ilce}, {isletme.il}")
        satirlar.append(f"\n=== TOPRAK ANALIZI ({toprak.tarih}) ===")
        if toprak.ph:            satirlar.append(f"pH: {toprak.ph}")
        if toprak.organik_madde: satirlar.append(f"Organik madde: %{toprak.organik_madde}")
        if toprak.fosfor:        satirlar.append(f"Fosfor: {toprak.fosfor} kg/da")
        if toprak.potasyum:      satirlar.append(f"Potasyum: {toprak.potasyum} kg/da")
        if toprak.kalsiyum:      satirlar.append(f"Kalsiyum: {toprak.kalsiyum} kg/da")
        if toprak.magnezyum:     satirlar.append(f"Magnezyum: {toprak.magnezyum} kg/da")
        if toprak.tuz:           satirlar.append(f"Tuz: %{toprak.tuz}")

        sistem = """Sen deneyimli bir toprak bilimcisi ve tarım danışmanısın. Toprak analizi verilerine bakarak değerlendirme yapıyorsun.

KURALLAR:
- Yanıtı SADECE JSON formatında ver, başka hiçbir metin ekleme.
- uygunluk_puani: 1-10 arası tam sayı (ekili ürün için bu toprağın uygunluğu)
- uygunluk_aciklamasi: 2-3 cümle, pH/organik madde/besin elementi bazında somut açıklama. TÜRKÇE.
- daha_uygun_bitkiler: Bu toprak için daha uygun 3-5 bitki adı (TÜRKÇE), kısa gerekçesiyle
- iyilestirme_onerileri: Mevcut ürün için toprağı iyileştirmek adına 3-5 somut öneri (TÜRKÇE)
- DİL KURALI: Tüm metinleri yalnızca TÜRKÇE yaz. "slightly", "medium", "high", "low", "moderate" gibi İngilizce kelimeler KESİNLİKLE yasaktır. Bunların yerine: "hafif", "orta", "yüksek", "düşük", "ılımlı" gibi Türkçe karşılıklarını kullan.

JSON ŞEMASI:
{
  "uygunluk_puani": number,
  "uygunluk_aciklamasi": "string",
  "daha_uygun_bitkiler": [{"bitki": "string", "neden": "string"}],
  "iyilestirme_onerileri": ["string", ...]
}"""

        try:
            client = Groq(api_key=api_key)
            yanit = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                max_tokens=800,
                messages=[
                    {"role": "system", "content": sistem},
                    {"role": "user",   "content": "\n".join(satirlar)},
                ],
            )
            icerik = yanit.choices[0].message.content.strip()
            if icerik.startswith("```"):
                icerik = icerik.split("```")[1]
                if icerik.startswith("json"):
                    icerik = icerik[4:]
                icerik = icerik.strip()
            # İngilizce sızan kelimeleri Türkçe'ye çevir
            INGTR = [
                ('slightly', 'hafif'), ('moderately', 'orta düzeyde'), ('moderate', 'orta'),
                ('high', 'yüksek'), ('low', 'düşük'), ('medium', 'orta'),
                ('very high', 'çok yüksek'), ('very low', 'çok düşük'),
                ('adequate', 'yeterli'), ('deficient', 'yetersiz'), ('excess', 'fazla'),
                ('optimal', 'uygun'), ('suitable', 'uygun'), ('insufficient', 'yetersiz'),
            ]
            for ing, tr in INGTR:
                icerik = icerik.replace(ing, tr).replace(ing.capitalize(), tr.capitalize())
            return Response(json.loads(icerik))
        except json.JSONDecodeError:
            return Response({'hata': 'AI yaniti islenemedi.'}, status=status.HTTP_502_BAD_GATEWAY)
        except Exception as e:
            return Response({'hata': f'AI servisi hatasi: {str(e)}'}, status=status.HTTP_502_BAD_GATEWAY)
