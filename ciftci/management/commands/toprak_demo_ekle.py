"""
Demo işletmeler için Kumluca/Alanya/Manavgat bölgesine uygun
gerçekçi toprak analizi verileri ekler.

Kullanım:
  python manage.py toprak_demo_ekle
"""
import random
from datetime import date, timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from ciftci.models import Isletme, ToprakAnaliz


# Kumluca kıyı ovası sera bölgesi — kumlu-tınlı, kireçli ana materyal
# Farklı mahallelere göre hafif varyasyon
BOLGE_PROFIL = {
    # Düz ova, sulama kanalları yakın — biraz daha ağır
    'default': dict(
        ph=(6.9, 7.4), organik=(1.4, 2.6), fosfor=(9, 24),
        potasyum=(32, 75), kalsiyum=(900, 1900), magnezyum=(85, 145), tuz=(0.14, 0.32)
    ),
    # Yüksek kireçli yamaç alanlar (Beykonak, Belen)
    'kalker': dict(
        ph=(7.3, 7.8), organik=(1.0, 1.8), fosfor=(6, 16),
        potasyum=(28, 60), kalsiyum=(1800, 3200), magnezyum=(110, 190), tuz=(0.10, 0.22)
    ),
    # Kumul/delta yakını (Mavikent, Yeşilköy kıyı)
    'kumul': dict(
        ph=(6.7, 7.2), organik=(0.8, 1.5), fosfor=(5, 14),
        potasyum=(20, 45), kalsiyum=(600, 1200), magnezyum=(60, 110), tuz=(0.18, 0.40)
    ),
    # Alanya — kırmızı akdeniz toprağı (terra rossa)
    'alanya': dict(
        ph=(6.5, 7.1), organik=(1.8, 3.2), fosfor=(12, 28),
        potasyum=(40, 90), kalsiyum=(700, 1400), magnezyum=(90, 160), tuz=(0.12, 0.28)
    ),
    # Manavgat — alüvyal nehir taşkın ovası
    'manavgat': dict(
        ph=(6.8, 7.3), organik=(2.0, 3.5), fosfor=(14, 32),
        potasyum=(45, 95), kalsiyum=(800, 1600), magnezyum=(100, 175), tuz=(0.13, 0.30)
    ),
    # Serik — kireçli düzlük
    'serik': dict(
        ph=(7.1, 7.6), organik=(1.2, 2.2), fosfor=(8, 20),
        potasyum=(30, 68), kalsiyum=(1200, 2400), magnezyum=(95, 160), tuz=(0.11, 0.25)
    ),
}

MAHALLE_BOLGE = {
    'beykonak': 'kalker', 'belen': 'kalker',
    'mavikent': 'kumul',  'yeşilköy': 'kumul', 'yesılkoy': 'kumul',
    'alanya':   'alanya',
    'manavgat': 'manavgat',
    'serik':    'serik',
}


def bolge_sec(isletme):
    m = (isletme.mahalle or '').lower()
    il = (isletme.ilce or '').lower()
    for anahtar, bolge in MAHALLE_BOLGE.items():
        if anahtar in m or anahtar in il:
            return bolge
    return 'default'


def rastgele(aralik, ondalik=2):
    deger = random.uniform(*aralik)
    return round(Decimal(str(deger)), ondalik)


class Command(BaseCommand):
    help = 'Demo işletmeler için gerçekçi toprak analizi ekler (eksik olanlar).'

    def handle(self, *args, **options):
        random.seed(42)  # Tekrar üretilebilir

        demo = Isletme.objects.filter(ad__startswith='[DEMO]').select_related('urun')
        eklendi = 0

        for isletme in demo:
            if ToprakAnaliz.objects.filter(isletme=isletme).exists():
                continue

            bolge = bolge_sec(isletme)
            p = BOLGE_PROFIL[bolge]

            # Tarih: 1-8 ay önce rastgele
            gun_once = random.randint(30, 240)
            analiz_tarihi = date.today() - timedelta(days=gun_once)

            ToprakAnaliz.objects.create(
                isletme=isletme,
                tarih=analiz_tarihi,
                ph=rastgele(p['ph']),
                organik_madde=rastgele(p['organik']),
                fosfor=rastgele(p['fosfor'], 1),
                potasyum=rastgele(p['potasyum'], 1),
                kalsiyum=rastgele(p['kalsiyum'], 0),
                magnezyum=rastgele(p['magnezyum'], 1),
                tuz=rastgele(p['tuz']),
                notlar=f'Demo veri — {bolge} profili ({isletme.ilce})',
            )
            eklendi += 1
            self.stdout.write(f'  + {isletme.ad[:40]} - {bolge}')

        self.stdout.write(self.style.SUCCESS(f'\nTamamlandı. {eklendi} toprak analizi eklendi.'))
