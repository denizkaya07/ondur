"""
Ondur — Demo Veri Scripti
Calistirmak icin: python manage.py shell < demo_veri.py
"""

import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ondur.settings')
django.setup()

from django.utils import timezone
from datetime import date, timedelta
from accounts.models import Kullanici
from ciftci.models import Ciftci, Isletme, MuhendisIsletme, Urun, UrunCesit
from katalog.models import Uretici, Bayii, Ilac, Gubre, BayiiUrun
from recete.models import Recete, UygulamaAdimi, UygulamaAdimKalemi
from ziyaret.models import Ziyaret

bugun = date.today()

# ─────────────────────────────────────────────
# KULLANICILAR
# ─────────────────────────────────────────────
print("Kullanicilar olusturuluyor...")

def kullanici(username, tel, rol, ad, soyad):
    u = Kullanici.objects.create_user(
        username=username, password='demo1234',
        telefon=tel, rol=rol,
        first_name=f'[DEMO] {ad}', last_name=soyad,
    )
    return u

muh1 = kullanici('demo_muh1', '05100000001', 'muhendis', 'Emre',   'Demir')
muh2 = kullanici('demo_muh2', '05100000002', 'muhendis', 'Selin',  'Arslan')

cif1 = kullanici('demo_cif1', '05200000001', 'ciftci',   'Ahmet',  'Yilmaz')
cif2 = kullanici('demo_cif2', '05200000002', 'ciftci',   'Fatma',  'Kaya')
cif3 = kullanici('demo_cif3', '05200000003', 'ciftci',   'Mehmet', 'Celik')

ure1_u = kullanici('demo_ure1', '05300000001', 'uretici', 'Bayer',  'TR')
bay1_u = kullanici('demo_bay1', '05400000001', 'bayii',   'Alanya', 'Tarim')
bay2_u = kullanici('demo_bay2', '05400000002', 'bayii',   'Manavgat','Tarim')

print("  OK")

# ─────────────────────────────────────────────
# ÜRÜNLER
# ─────────────────────────────────────────────
print("Urunler olusturuluyor...")

domates  = Urun.objects.create(ad='Domates')
biber    = Urun.objects.create(ad='Biber')
salatalik= Urun.objects.create(ad='Salatalik')
cilek    = Urun.objects.create(ad='Cilek')
zeytin   = Urun.objects.create(ad='Zeytin')

UrunCesit.objects.create(urun=domates,   ad='Salkım')
UrunCesit.objects.create(urun=domates,   ad='Cherry')
UrunCesit.objects.create(urun=biber,     ad='Sivri')
UrunCesit.objects.create(urun=salatalik, ad='Mini')

print("  OK")

# ─────────────────────────────────────────────
# ÜRETİCİ & BAYİİ PROFİLLERİ
# ─────────────────────────────────────────────
print("Uretici/Bayii profilleri...")

ure1 = Uretici.objects.create(
    kullanici=ure1_u, firma_adi='[DEMO] Bayer CropScience TR',
    vergi_no='1111111111', adres='Istanbul', yetkili='Demo Yetkili'
)

bay1 = Bayii.objects.create(
    kullanici=bay1_u, firma_adi='[DEMO] Alanya Tarim AS',
    ruhsat_no='TR-BAY-001', il='Antalya', ilce='Alanya', telefon='05400000001'
)
bay2 = Bayii.objects.create(
    kullanici=bay2_u, firma_adi='[DEMO] Manavgat Tarim AS',
    ruhsat_no='TR-BAY-002', il='Antalya', ilce='Manavgat', telefon='05400000002'
)

print("  OK")

# ─────────────────────────────────────────────
# İLAÇLAR & GÜBRELER
# ─────────────────────────────────────────────
print("Ilaclar/Gubreler olusturuluyor...")

ilac_data = [
    ('Topas 250 EC',   'fungisit',   'EC', 50, 100, 'ml/da', 7),
    ('Score 250 EC',   'fungisit',   'EC', 40,  80, 'ml/da', 7),
    ('Karate Zeon',    'insektisit', 'CS', 15,  30, 'ml/da', 3),
    ('Confidor 350 SC','insektisit', 'SC', 25,  50, 'ml/da', 7),
    ('Teldor 500 SC',  'fungisit',   'SC', 60, 120, 'ml/da',14),
]

ilaclar = []
for ad, kat, form, dmin, dmax, dbirim, phi in ilac_data:
    ilac = Ilac.objects.create(
        uretici=ure1, ticari_ad=f'[DEMO] {ad}',
        kategori=kat, formulasyon=form,
        ruhsat_no=f'TR-{ad[:4].upper()}',
        phi_gun=phi, endikasyon='Demo endikasyon',
        doz_min=dmin, doz_max=dmax, doz_birimi=dbirim,
        uygulama_yontemi='Yaprak spreyi',
        ambalaj_hacmi=1, ambalaj_birimi='sise', ambalaj_birim='L',
        aktif=True, onaylandi=True
    )
    ilaclar.append(ilac)

gubre_data = [
    ('Fertiplon 20-20-20', 'makro', 100, 300, 'gr/da'),
    ('Calcinit',           'makro', 150, 250, 'gr/da'),
    ('MKP 0-52-34',        'makro', 100, 200, 'gr/da'),
    ('Magnisal',           'mikro',  50, 100, 'gr/da'),
]

gubreler = []
for ad, tur, dmin, dmax, dbirim in gubre_data:
    g = Gubre.objects.create(
        uretici=ure1, ticari_ad=f'[DEMO] {ad}',
        tur=tur, formulasyon='WS',
        doz_min=dmin, doz_max=dmax, doz_birimi=dbirim,
        uygulama_yontemi='Damla sulama',
        ambalaj_hacmi=25, ambalaj_birimi='torba', ambalaj_birim='kg',
        aktif=True, onaylandi=True
    )
    gubreler.append(g)

print("  OK")

# ─────────────────────────────────────────────
# BAYİİ ÜRÜNLERİ
# ─────────────────────────────────────────────
for ilac in ilaclar[:3]:
    BayiiUrun.objects.create(bayii=bay1, ilac=ilac)
for gubre in gubreler[:2]:
    BayiiUrun.objects.create(bayii=bay1, gubre=gubre)
for ilac in ilaclar[2:]:
    BayiiUrun.objects.create(bayii=bay2, ilac=ilac)

# ─────────────────────────────────────────────
# ÇİFTÇİLER & İŞLETMELER
# ─────────────────────────────────────────────
print("Ciftciler ve isletmeler...")

ciftci_data = [
    (cif1, 'Ahmet',  'Yilmaz',  'Alanya',   'Antalya',  '05200000001'),
    (cif2, 'Fatma',  'Kaya',    'Manavgat', 'Antalya',  '05200000002'),
    (cif3, 'Mehmet', 'Celik',   'Serik',    'Antalya',  '05200000003'),
]

ciftciler = []
for u, ad, soyad, ilce, il, tel in ciftci_data:
    c = Ciftci.objects.create(
        kullanici=u, ad=ad, soyad=soyad,
        ilce=ilce, il=il, telefon=tel
    )
    ciftciler.append(c)

isletme_data = [
    (ciftciler[0], muh1, '[DEMO] Kuzey Serasi',     'sera',       domates,  8.0),
    (ciftciler[0], muh1, '[DEMO] Guney Tarlasi',    'acik_tarla', biber,    15.0),
    (ciftciler[1], muh1, '[DEMO] Manavgat Serasi',  'sera',       salatalik,6.0),
    (ciftciler[1], muh2, '[DEMO] Cilek Bahcesi',    'acik_tarla', cilek,    10.0),
    (ciftciler[2], muh2, '[DEMO] Zeytinlik',        'zeytinlik',  zeytin,   50.0),
    (ciftciler[2], muh2, '[DEMO] Serik Serasi',     'sera',       domates,  4.0),
]

isletmeler = []
for ciftci, muh, ad, tur, urun, alan in isletme_data:
    i = Isletme.objects.create(
        ciftci=ciftci, olusturan=muh,
        ad=ad, tur=tur, urun=urun,
        alan_dekar=alan,
        sera_tip='naylon' if tur == 'sera' else None,
    )
    isletmeler.append(i)

print("  OK")

# ─────────────────────────────────────────────
# MÜHENDİS-İŞLETME İLİŞKİLERİ (Onaylı)
# ─────────────────────────────────────────────
print("Muhandis-isletme iliskileri...")

iliski_data = [
    (muh1, isletmeler[0]),
    (muh1, isletmeler[1]),
    (muh1, isletmeler[2]),
    (muh2, isletmeler[3]),
    (muh2, isletmeler[4]),
    (muh2, isletmeler[5]),
]

for muh, isl in iliski_data:
    MuhendisIsletme.objects.create(
        muhendis=muh, isletme=isl,
        durum='onaylandi', yanit_tarihi=timezone.now()
    )

print("  OK")

# ─────────────────────────────────────────────
# REÇETELER
# ─────────────────────────────────────────────
print("Receteler olusturuluyor...")

recete_data = [
    (muh1, isletmeler[0], 'Kueleme hastaligi', bugun - timedelta(days=20), 'onaylandi'),
    (muh1, isletmeler[0], 'Demir eksikligi',   bugun - timedelta(days=10), 'onaylandi'),
    (muh1, isletmeler[1], 'Yaprakbiti',        bugun - timedelta(days=5),  'taslak'),
    (muh1, isletmeler[2], 'Botrytis',          bugun - timedelta(days=3),  'onaylandi'),
    (muh2, isletmeler[3], 'Kirmizi orumcek',   bugun - timedelta(days=15), 'onaylandi'),
    (muh2, isletmeler[4], 'Halka leke',        bugun - timedelta(days=7),  'taslak'),
    (muh2, isletmeler[5], 'Kueleme hastaligi', bugun - timedelta(days=2),  'onaylandi'),
]

receteler = []
for muh, isl, tani, tarih, durum in recete_data:
    r = Recete.objects.create(
        muhendis=muh, isletme=isl,
        tani=tani, tarih=tarih,
        uygulama_yontemi='Yaprak spreyi',
        durum=durum,
        ciftciye_not='[DEMO] Ilaci sabah erken saatlerde uygulayiniz.',
    )
    receteler.append(r)

# Adimlar
for i, recete in enumerate(receteler):
    adim = UygulamaAdimi.objects.create(
        recete=recete, sira_no=1,
        tip='ilaclama',
        tanim='Ana ilacli sulama',
        uygulama_tarihi=recete.tarih + timedelta(days=1),
    )
    UygulamaAdimKalemi.objects.create(
        adim=adim,
        ilac=ilaclar[i % len(ilaclar)],
        doz_dekar=75, birim='ml'
    )
    adim2 = UygulamaAdimi.objects.create(
        recete=recete, sira_no=2,
        tip='gubreleme',
        tanim='Destekleyici gubre',
        uygulama_tarihi=recete.tarih + timedelta(days=3),
    )
    UygulamaAdimKalemi.objects.create(
        adim=adim2,
        gubre=gubreler[i % len(gubreler)],
        doz_dekar=150, birim='gr'
    )

print("  OK")

# ─────────────────────────────────────────────
# ZİYARETLER
# ─────────────────────────────────────────────
print("Ziyaretler olusturuluyor...")

ziyaret_data = [
    (muh1, isletmeler[0], 'saha',        bugun - timedelta(days=18), '09:00', 60,  True),
    (muh1, isletmeler[0], 'recete',      bugun - timedelta(days=9),  '10:30', 45,  True),
    (muh1, isletmeler[1], 'danismanlik', bugun - timedelta(days=4),  '14:00', 90,  True),
    (muh1, isletmeler[2], 'saha',        bugun + timedelta(days=2),  '09:00', 60,  False),
    (muh1, isletmeler[0], 'hasat',       bugun + timedelta(days=7),  '08:00', 120, False),
    (muh2, isletmeler[3], 'saha',        bugun - timedelta(days=12), '11:00', 60,  True),
    (muh2, isletmeler[4], 'planlama',    bugun - timedelta(days=6),  '13:00', 90,  True),
    (muh2, isletmeler[5], 'recete',      bugun + timedelta(days=3),  '10:00', 45,  False),
    (muh2, isletmeler[3], 'numune',      bugun + timedelta(days=5),  '09:30', 30,  False),
]

for muh, isl, tur, tarih, saat, sure, tamam in ziyaret_data:
    Ziyaret.objects.create(
        muhendis=muh, isletme=isl,
        tur=tur, tarih=tarih, saat=saat,
        sure_dk=sure, tamamlandi=tamam,
        adres=f'[DEMO] {isl.ciftci.ilce}, {isl.ciftci.il}',
        notlar='[DEMO] Sanal ziyaret verisi.',
    )

print("  OK")

# ─────────────────────────────────────────────
# ÖZET
# ─────────────────────────────────────────────
print()
print("=" * 40)
print("DEMO VERISI HAZIR")
print("=" * 40)
print(f"Kullanici:    {Kullanici.objects.exclude(username='admin').count()}")
print(f"Ciftci:       {Ciftci.objects.count()}")
print(f"Isletme:      {Isletme.objects.count()}")
print(f"Ilac:         {Ilac.objects.count()}")
print(f"Gubre:        {Gubre.objects.count()}")
print(f"Recete:       {Recete.objects.count()}")
print(f"Ziyaret:      {Ziyaret.objects.count()}")
print()
print("Sifre: demo1234")
print()
print("ROL       | TELEFON       | URL")
print("-" * 45)
print("muhendis  | 05100000001   | /muhendis")
print("muhendis  | 05100000002   | /muhendis")
print("ciftci    | 05200000001   | /ciftci")
print("ciftci    | 05200000002   | /ciftci")
print("ciftci    | 05200000003   | /ciftci")
print("uretici   | 05300000001   | /uretici")
print("bayii     | 05400000001   | /bayii")
print("bayii     | 05400000002   | /bayii")
