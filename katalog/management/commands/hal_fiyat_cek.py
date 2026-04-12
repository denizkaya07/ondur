"""
Antalya Büyükşehir Belediyesi toptancı hal fiyatlarını çeker ve HalFiyat modeline kaydeder.

Kullanım:
  python manage.py hal_fiyat_cek                  # bugünkü fiyatlar
  python manage.py hal_fiyat_cek --tarih 2025-04-10
  python manage.py hal_fiyat_cek --tarih 2025-04-10 --gecmis 260  # ~5 yıl haftalık
"""

import json
import re
import time
from datetime import date, timedelta
from decimal import Decimal, InvalidOperation

import requests
from django.core.management.base import BaseCommand
from django.db import IntegrityError

from katalog.models import HalFiyat
from ciftci.models import Urun

HAL_SAYFA = 'https://www.antalya.bel.tr/tr/halden-gunluk-fiyatlar'
HAL_API   = 'https://www.antalya.bel.tr/tr/seolink/VueData/GetVueData'
HAL_SEHIR = 'Antalya'
PAGE_ID   = '67863b6f3206e6473c59e2e8'

# Hal ürün adı → Urun.ad eşleştirmesi (küçük harf, normalize)
URUN_ESLESME = {
    'domates':      'Domates',
    'biber':        'Biber',
    'patlican':     'Patlıcan',
    'salatalik':    'Salatalık',
    'kabak':        'Kabak',
    'fasulye':      'Fasulye',
    'ispanak':      'Ispanak',
    'marul':        'Marul',
    'maydanoz':     'Maydanoz',
    'limon':        'Limon',
    'portakal':     'Portakal',
    'elma':         'Elma',
    'armut':        'Armut',
    'uzum':         'Üzüm',
    'seftali':      'Şeftali',
    'cilek':        'Çilek',
    'karpuz':       'Karpuz',
    'kavun':        'Kavun',
    'nar':          'Nar',
    'avokado':      'Avokado',
    'patates':      'Patates',
    'sogan':        'Soğan',
    'sarimsak':     'Sarımsak',
    'havuc':        'Havuç',
    'pirasa':       'Pırasa',
    'kereviz':      'Kereviz',
    'brokoli':      'Brokoli',
    'karnabahar':   'Karnabahar',
    'lahana':       'Lahana',
    'misir':        'Mısır',
    'biber sivri':  'Biber',
    'biber dolmalik': 'Biber',
    'domates salkım': 'Domates',
    'domates cherry': 'Domates',
}


def normalize(metin):
    tr = {'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u',
          'Ç': 'C', 'Ğ': 'G', 'İ': 'I', 'Ö': 'O', 'Ş': 'S', 'Ü': 'U'}
    return ''.join(tr.get(c, c) for c in metin).lower().strip()


def urun_bul_veya_olustur(urun_adi):
    """Hal ürün adını Urun modeline eşleştir, yoksa oluştur."""
    norm = normalize(urun_adi)
    # Tam eşleşme
    for anahtar, db_ad in URUN_ESLESME.items():
        if anahtar in norm:
            urun, _ = Urun.objects.get_or_create(ad=db_ad, defaults={'aktif': True})
            return urun
    # Eşleşme bulunamazsa ham adı kaydet
    urun, _ = Urun.objects.get_or_create(ad=urun_adi.title(), defaults={'aktif': True})
    return urun


def fiyat_parse(metin):
    """'80,00 ₺' → Decimal('80.00')"""
    try:
        temiz = re.sub(r'[^\d,.]', '', str(metin)).replace(',', '.')
        return Decimal(temiz)
    except InvalidOperation:
        return None


def token_al(session):
    """Sayfa HTML'inden CSRF token çeker."""
    r = session.get(HAL_SAYFA, timeout=15, verify=False)
    r.raise_for_status()
    m = re.search(r'__RequestVerificationToken[^>]+value="([^"]+)"', r.text)
    if not m:
        raise RuntimeError('CSRF token bulunamadı.')
    return m.group(1)


def fiyat_cek(session, token, tarih: date):
    """Belirli tarih için API'yi çağırır, ürün listesi döner."""
    tarih_str = tarih.strftime('%d.%m.%Y')
    payload = {
        '__RequestVerificationToken': token,
        'colllection':      'MarketPrices',
        'pageid':           PAGE_ID,
        'collectiontype':   '0',
        'seolink':          'halden-gunluk-fiyatlar',
        'lang':             'tr',
        'requestquery':     f'fiyattarih={tarih_str}',
        'dbfind':           '',
        'relationcollection': '',
        'collectionfunction': '',
    }
    headers = {
        'X-Requested-With': 'XMLHttpRequest',
        'Content-Type':     'application/x-www-form-urlencoded',
        'Referer':          HAL_SAYFA,
    }
    r = session.post(HAL_API, data=payload, headers=headers, timeout=20, verify=False)
    r.raise_for_status()

    dis = r.json()
    if not dis.get('issuccess'):
        return []

    ic = json.loads(dis['data'])
    urunler = ic.get('products', [])
    return urunler


class Command(BaseCommand):
    help = 'Antalya hal fiyatlarını çeker ve veritabanına kaydeder.'

    def add_arguments(self, parser):
        parser.add_argument('--tarih',   type=str,  default=None,
                            help='Çekilecek tarih (YYYY-MM-DD). Varsayılan: bugün.')
        parser.add_argument('--gecmis',  type=int,  default=0,
                            help='Geriye kaç hafta gidilsin (haftalık adım). 0=sadece belirtilen tarih.')

    def handle(self, *args, **options):
        baslangic = date.fromisoformat(options['tarih']) if options['tarih'] else date.today()
        hafta_sayisi = max(0, options['gecmis'])

        tarihler = [baslangic - timedelta(weeks=i) for i in range(hafta_sayisi + 1)]
        tarihler.reverse()  # eskiden yeniye

        self.stdout.write(f'{len(tarihler)} tarih için fiyat çekilecek...')

        session = requests.Session()
        session.headers['User-Agent'] = 'Mozilla/5.0 (compatible; OndurBot/1.0)'

        session.verify = False  # Antalya BB sertifika zinciri sorunu
        import urllib3; urllib3.disable_warnings()

        try:
            token = token_al(session)
        except Exception as e:
            self.stderr.write(f'CSRF token alınamadı: {e}')
            return

        kayit = 0
        atlandi = 0

        for tarih in tarihler:
            try:
                urunler = fiyat_cek(session, token, tarih)
            except Exception as e:
                self.stderr.write(f'{tarih} — hata: {e}')
                time.sleep(2)
                continue

            if not urunler:
                self.stdout.write(f'{tarih} — fiyat yok (tatil/yayınlanmamış)')
                continue

            for u in urunler:
                urun_adi  = u.get('urun_adi', '').strip()
                fiyat_min = fiyat_parse(u.get('en_dusuk_fiyat_sayi', u.get('en_dusuk_fiyat', '')))
                fiyat_max = fiyat_parse(u.get('en_yuksek_fiyat_sayi', u.get('en_yuksek_fiyat', '')))

                if not urun_adi or fiyat_min is None or fiyat_max is None:
                    continue

                fiyat_ort = (fiyat_min + fiyat_max) / 2

                urun_obj = urun_bul_veya_olustur(urun_adi)

                try:
                    _, created = HalFiyat.objects.get_or_create(
                        urun=urun_obj,
                        hal_sehir=HAL_SEHIR,
                        tarih=tarih,
                        defaults={
                            'fiyat_min': fiyat_min,
                            'fiyat_max': fiyat_max,
                            'fiyat_ort': fiyat_ort,
                            'kaynak':    f'Antalya Büyükşehir — {urun_adi}',
                        }
                    )
                    if created:
                        kayit += 1
                    else:
                        atlandi += 1
                except IntegrityError:
                    atlandi += 1

            self.stdout.write(f'{tarih} — {len(urunler)} ürün işlendi')
            time.sleep(0.5)  # sunucuya saygı

        self.stdout.write(self.style.SUCCESS(
            f'Tamamlandı. Yeni kayıt: {kayit}, zaten mevcut: {atlandi}'
        ))
