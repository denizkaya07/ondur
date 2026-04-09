"""
Ondur — Katalog Demo Veri Scripti
Gercekci Turkce tarim urunleri (ilac + gubre) — yuzlerce kayit
Calistirmak icin: python manage.py shell < katalog_veri.py
"""

import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ondur.settings')
django.setup()

from katalog.models import Uretici, Ilac, Gubre, EtkenMadde, IlacEtkenMadde, GubreEtkenMadde
from accounts.models import Kullanici

# ─── Üretici bul veya oluştur ───
def uretici_al(firma, vergi, adres, yetkili, tel='05300000099'):
    try:
        u = Kullanici.objects.get(telefon=tel)
    except Kullanici.DoesNotExist:
        u = Kullanici.objects.create_user(
            username=f'ure_{vergi}', password='1234',
            telefon=tel, rol='uretici',
            first_name=f'[DEMO] {firma}', last_name='',
        )
    obj, _ = Uretici.objects.get_or_create(
        vergi_no=vergi,
        defaults=dict(kullanici=u, firma_adi=f'[DEMO] {firma}', adres=adres, yetkili=yetkili)
    )
    return obj

# ─── Üreticiler ───
bayer    = uretici_al('Bayer CropScience TR', '1111111111', 'Istanbul', 'Demo Yetkili', '05301111111')
syngenta = uretici_al('Syngenta TR',          '2222222222', 'Ankara',   'Demo Yetkili', '05302222222')
basf     = uretici_al('BASF TR',              '3333333333', 'Izmir',    'Demo Yetkili', '05303333333')
adama    = uretici_al('Adama TR',             '4444444444', 'Istanbul', 'Demo Yetkili', '05304444444')
sumitomo = uretici_al('Sumitomo TR',          '5555555555', 'Ankara',   'Demo Yetkili', '05305555555')
corteva  = uretici_al('Corteva TR',           '6666666666', 'Izmir',    'Demo Yetkili', '05306666666')
nufarm   = uretici_al('Nufarm TR',            '7777777777', 'Istanbul', 'Demo Yetkili', '05307777777')
stockton = uretici_al('Stockton TR',          '8888888888', 'Antalya',  'Demo Yetkili', '05308888888')
belchim  = uretici_al('Belchim TR',           '9999999999', 'Istanbul', 'Demo Yetkili', '05309999999')
arysta   = uretici_al('UPL TR',               '1010101010', 'Ankara',   'Demo Yetkili', '05301010101')
chemtura = uretici_al('Chemtura TR',          '1212121212', 'Istanbul', 'Demo Yetkili', '05301212121')

print("Ureticiler OK")

# ─── Etken Maddeler ───
etkenler = {}
etken_listesi = [
    # Fungisitler
    'Azoksistrobin', 'Tebukonazol', 'Trifloksistrobin', 'Propikonazol', 'Siprokonazol',
    'Dinikonazol', 'Heksakonazol', 'Penkonazol', 'Flutriafol', 'Difenkonazol',
    'Boskalid', 'Bupirimat', 'Fenarimol', 'Kresoksim Metil', 'Pikoksistrobin',
    'Dimoksistrobin', 'Fluoksastrobin', 'Orysastrobin', 'Piraklostrobin', 'Spiroksamin',
    'Fenpropimorf', 'Triadimefon', 'Triadimenol', 'Bitertanol', 'Epoksikonazol',
    'Metkonazol', 'Miklobutanil', 'Prokloraz', 'Tetrakonazol', 'Flusilazol',
    'Mankozeb', 'Bakır Hidroksit', 'Bakır Oksiklorür', 'Kaptan', 'Folpet',
    'Iprodion', 'Vinklozolin', 'Dikloflüanid', 'Tolifluanid', 'Klorotalonil',
    'Metalaksil', 'Metalaksil-M', 'Fosetil Al', 'Dimetomorf', 'Iprovalikarb',
    'Siazofamid', 'Mandipropamid', 'Benalaksil', 'Kiralaksil', 'Propamokarb',
    'Flusulfamid', 'Kasugamisin', 'Trifloksi Miks',
    # İnsektisitler
    'İmidakloprid', 'Tiametoksam', 'Klotianidin', 'Asetamiprid', 'Nitenpyram',
    'Lambda-Sihalotrin', 'Deltametrin', 'Alfa-Sipermetrin', 'Sipermetrin', 'Permetrin',
    'Beta-Siflutrin', 'Esfenvalerat', 'Fenvalerat', 'Flüvalinat', 'Bifentrin',
    'Klorpirifos', 'Dimetoat', 'Malatiyon', 'Fenitrotiyon', 'Metidatiyon',
    'Diazinon', 'Pirimifos Metil', 'Klorpirifos Etil', 'Triazofos',
    'Abamektin', 'Spinosad', 'Emamektin Benzoat', 'Milbemektin',
    'Azadiraktin', 'Piriproksfen', 'Diafentiüron', 'Buprofezin',
    'İndoksakarb', 'Klorantraniliprol', 'Sinatraniliprol', 'Flubendiamid',
    'Spirotetramat', 'Spiromesifen', 'Flonikamid', 'Sulfoksaflor',
    'Tiakloprid', 'Diklormezotiaz',
    # Akarisitler
    'Abamektin', 'Bifenazat', 'Fenpiroksimit', 'Heksitiazoks', 'Klofentezin',
    'Etoksazol', 'Amitraz', 'Bromopropilat', 'Fenazakin', 'Tebufenpyrad',
    'Piridaben', 'Fenpropatin',
    # Gübre etken maddeleri
    'Azot (N)', 'Fosfor (P2O5)', 'Potasyum (K2O)', 'Kalsiyum (Ca)',
    'Magnezyum (Mg)', 'Sülfür (S)', 'Bor (B)', 'Demir (Fe)', 'Mangan (Mn)',
    'Çinko (Zn)', 'Bakır (Cu)', 'Molibden (Mo)', 'Kobalt (Co)',
    'Aminoasit', 'Hümik Asit', 'Fülvik Asit', 'Deniz Yosunu Ekstraktı',
    'Silisyum (Si)', 'Selenyum (Se)', 'Nikel (Ni)',
]

for ad in etken_listesi:
    e, _ = EtkenMadde.objects.get_or_create(ad=ad, defaults={'aktif': True, 'onaylandi': True})
    etkenler[ad] = e

print(f"Etken maddeler OK ({len(etkenler)} adet)")

# ─── İLAÇ VERİLERİ ───
# (ticari_ad, kategori, formulasyon, doz_min, doz_max, doz_birimi, phi, uygulama, uretici, [etkenler])
ilac_data = [
    # FUNGİSİT — Azoksi / Strobilurin grubu
    ('Amistar 250 SC',      'fungisit', 'SC', 75, 100,'ml/100L', 3, 'Yapraktan', syngenta, ['Azoksistrobin']),
    ('Amistar Opti',        'fungisit', 'SC', 150,200,'ml/da',   3, 'Yapraktan', syngenta, ['Azoksistrobin','Klorotalonil']),
    ('Amistar Top',         'fungisit', 'SC', 100,125,'ml/da',   7, 'Yapraktan', syngenta, ['Azoksistrobin','Difenkonazol']),
    ('Quadris',             'fungisit', 'SC', 60, 100,'ml/da',   3, 'Yapraktan', syngenta, ['Azoksistrobin']),
    ('Flint 50 WG',         'fungisit', 'WG', 10,  15,'gr/da',   3, 'Yapraktan', bayer,    ['Trifloksistrobin']),
    ('Flint Max',           'fungisit', 'WG', 20,  25,'gr/da',   7, 'Yapraktan', bayer,    ['Trifloksistrobin','Tebukonazol']),
    ('Cabrio Top',          'fungisit', 'SC', 175,200,'ml/da',   7, 'Yapraktan', basf,     ['Piraklostrobin','Dimoksistrobin']),
    ('Ortiva Top',          'fungisit', 'SC', 100,125,'ml/da',   3, 'Yapraktan', syngenta, ['Azoksistrobin','Difenkonazol']),
    ('Signum',              'fungisit', 'WG', 60,  80,'gr/da',   7, 'Yapraktan', basf,     ['Boskalid','Piraklostrobin']),

    # FUNGİSİT — Triazol grubu
    ('Folicur 250 EW',      'fungisit', 'EW', 75, 100,'ml/da',   7, 'Yapraktan', bayer,    ['Tebukonazol']),
    ('Horizon 250 EW',      'fungisit', 'EW', 75, 100,'ml/da',   7, 'Yapraktan', bayer,    ['Tebukonazol']),
    ('Opera',               'fungisit', 'SE', 125,150,'ml/da',   7, 'Yapraktan', basf,     ['Piraklostrobin','Epoksikonazol']),
    ('Tilt 250 EC',         'fungisit', 'EC', 40,  50,'ml/da',   7, 'Yapraktan', syngenta, ['Propikonazol']),
    ('Topas 100 EC',        'fungisit', 'EC', 15,  20,'ml/da',   7, 'Yapraktan', syngenta, ['Penkonazol']),
    ('Score 250 EC',        'fungisit', 'EC', 25,  50,'ml/da',   7, 'Yapraktan', syngenta, ['Difenkonazol']),
    ('Duett Ultra',         'fungisit', 'EC', 50,  75,'ml/da',   7, 'Yapraktan', syngenta, ['Epoksikonazol','Tiofanat Metil']),
    ('Bumper 25 EC',        'fungisit', 'EC', 40,  60,'ml/da',   7, 'Yapraktan', adama,    ['Propikonazol']),
    ('Tebuzol 25 WP',       'fungisit', 'WP', 80, 100,'gr/da',   7, 'Yapraktan', adama,    ['Tebukonazol']),
    ('Mystic 250 EW',       'fungisit', 'EW', 75, 100,'ml/da',   7, 'Yapraktan', adama,    ['Tebukonazol']),
    ('Juwel',               'fungisit', 'EC', 75, 100,'ml/da',   7, 'Yapraktan', basf,     ['Epoksikonazol','Kresoksim Metil']),
    ('Sphere',              'fungisit', 'SC', 75, 100,'ml/da',   7, 'Yapraktan', bayer,    ['Trifloksistrobin','Siprokonazol']),
    ('Swing Gold',          'fungisit', 'EC', 100,125,'ml/da',   7, 'Yapraktan', basf,     ['Dimoksistrobin','Epoksikonazol']),
    ('Caramba',             'fungisit', 'SL', 150,200,'ml/da',   7, 'Yapraktan', basf,     ['Metkonazol']),
    ('Proline 275 EC',      'fungisit', 'EC', 60,  80,'ml/da',   7, 'Yapraktan', bayer,    ['Prokloraz']),

    # FUNGİSİT — Temaslı / Koruyucu
    ('Dithane M-45',        'fungisit', 'WP', 200,300,'gr/da',  14, 'Yapraktan', corteva,  ['Mankozeb']),
    ('Mancozeb 80 WP',      'fungisit', 'WP', 200,300,'gr/da',  14, 'Yapraktan', adama,    ['Mankozeb']),
    ('Kocide 2000',         'fungisit', 'WG', 150,200,'gr/da',  14, 'Yapraktan', corteva,  ['Bakır Hidroksit']),
    ('Champion WP',         'fungisit', 'WP', 200,300,'gr/da',  14, 'Yapraktan', adama,    ['Bakır Hidroksit']),
    ('Cuprofix',            'fungisit', 'WP', 200,300,'gr/da',  14, 'Yapraktan', stockton, ['Bakır Oksiklorür']),
    ('Captan 80 WDG',       'fungisit', 'WG', 150,200,'gr/da',  14, 'Yapraktan', adama,    ['Kaptan']),
    ('Folpan 80 WDG',       'fungisit', 'WG', 150,200,'gr/da',  14, 'Yapraktan', adama,    ['Folpet']),
    ('Rovral Aquaflo',      'fungisit', 'SC', 100,150,'ml/da',   7, 'Yapraktan', adama,    ['Iprodion']),
    ('Switch 62,5 WG',      'fungisit', 'WG', 60,  80,'gr/da',   7, 'Yapraktan', syngenta, ['Siprodinil','Flüdyoksonil']),

    # FUNGİSİT — Oomycet / Mildiyö
    ('Ridomil Gold',        'fungisit', 'WP', 200,250,'gr/da',  21, 'Yapraktan', syngenta, ['Metalaksil-M','Mankozeb']),
    ('Ridomil Gold MZ',     'fungisit', 'WP', 200,250,'gr/da',  21, 'Yapraktan', syngenta, ['Metalaksil-M','Mankozeb']),
    ('Previcur Energy',     'fungisit', 'SL', 200,300,'ml/da',  14, 'Damla',     bayer,    ['Propamokarb','Fosetil Al']),
    ('Infinito',            'fungisit', 'SC', 150,200,'ml/da',   7, 'Yapraktan', bayer,    ['Propamokarb','Fluopikolid']),
    ('Reboot',              'fungisit', 'SC', 200,250,'ml/da',   7, 'Yapraktan', belchim,  ['Metalaksil-M','Fosetil Al']),
    ('Equation Pro',        'fungisit', 'WG', 40,  50,'gr/da',   7, 'Yapraktan', corteva,  ['Famoksadon','Simazofamid']),
    ('Proxanil',            'fungisit', 'SC', 200,250,'ml/da',   7, 'Yapraktan', corteva,  ['Propamokarb','Metalaksil-M']),
    ('Forum Star',          'fungisit', 'WG', 200,250,'gr/da',  14, 'Yapraktan', basf,     ['Dimetomorf','Mankozeb']),
    ('Acrobat MZ',          'fungisit', 'WP', 200,250,'gr/da',  14, 'Yapraktan', basf,     ['Dimetomorf','Mankozeb']),
    ('Tanos 50 WG',         'fungisit', 'WG', 40,  50,'gr/da',   7, 'Yapraktan', corteva,  ['Famoksadon','Simazofamid']),
    ('Revus',               'fungisit', 'SC', 60,  75,'ml/da',   7, 'Yapraktan', syngenta, ['Mandipropamid']),
    ('Ranman',              'fungisit', 'SC', 15,  20,'ml/da',   3, 'Yapraktan', sumitomo, ['Siazofamid']),

    # İNSEKTİSİT — Neonikotinoid
    ('Confidor 350 SC',     'insektisit','SC', 25,  35,'ml/da',   7, 'Yapraktan', bayer,    ['İmidakloprid']),
    ('Admire 350 SC',       'insektisit','SC', 25,  35,'ml/da',   7, 'Yapraktan', bayer,    ['İmidakloprid']),
    ('Actara 25 WG',        'insektisit','WG', 8,   12,'gr/da',   7, 'Yapraktan', syngenta, ['Tiametoksam']),
    ('Cruiser 70 WS',       'insektisit','WS', 10,  15,'gr/da',   7, 'Yapraktan', syngenta, ['Tiametoksam']),
    ('Mospilan 20 SP',      'insektisit','SP', 40,  60,'gr/da',   7, 'Yapraktan', sumitomo, ['Asetamiprid']),
    ('Gazelle SG',          'insektisit','SG', 40,  60,'gr/da',   7, 'Yapraktan', sumitomo, ['Asetamiprid']),
    ('Calypso 480 SC',      'insektisit','SC', 20,  25,'ml/da',   7, 'Yapraktan', bayer,    ['Tiakloprid']),
    ('Movento 100 SC',      'insektisit','SC', 75, 100,'ml/da',   7, 'Yapraktan', bayer,    ['Spirotetramat']),

    # İNSEKTİSİT — Piretroit
    ('Karate Zeon 5 CS',    'insektisit','CS', 15,  20,'ml/da',   3, 'Yapraktan', syngenta, ['Lambda-Sihalotrin']),
    ('Decis 25 EC',         'insektisit','EC', 20,  30,'ml/da',   3, 'Yapraktan', bayer,    ['Deltametrin']),
    ('Fastac 10 EC',        'insektisit','EC', 15,  20,'ml/da',   3, 'Yapraktan', basf,     ['Alfa-Sipermetrin']),
    ('Cypermethrin 25 EC',  'insektisit','EC', 25,  40,'ml/da',   3, 'Yapraktan', adama,    ['Sipermetrin']),
    ('Bulldock 25 EC',      'insektisit','EC', 20,  30,'ml/da',   3, 'Yapraktan', basf,     ['Beta-Siflutrin']),
    ('Sumi-Alpha 5 EC',     'insektisit','EC', 20,  30,'ml/da',   3, 'Yapraktan', sumitomo, ['Esfenvalerat']),
    ('Fury 10 EW',          'insektisit','EW', 10,  15,'ml/da',   3, 'Yapraktan', adama,    ['Zeta-Sipermetrin']),
    ('Talstar 10 EC',       'insektisit','EC', 20,  30,'ml/da',   3, 'Yapraktan', corteva,  ['Bifentrin']),

    # İNSEKTİSİT — Organofosfat
    ('Dursban 4 EC',        'insektisit','EC', 100,150,'ml/da',  14, 'Yapraktan', corteva,  ['Klorpirifos']),
    ('Perfekthion 40 EC',   'insektisit','EC', 100,150,'ml/da',  14, 'Yapraktan', basf,     ['Dimetoat']),
    ('Malathion 50 EC',     'insektisit','EC', 150,200,'ml/da',   7, 'Yapraktan', adama,    ['Malatiyon']),
    ('Sumithion 50 EC',     'insektisit','EC', 100,150,'ml/da',  14, 'Yapraktan', sumitomo, ['Fenitrotiyon']),

    # İNSEKTİSİT — Yeni nesil
    ('Coragen 20 SC',       'insektisit','SC', 20,  25,'ml/da',   3, 'Yapraktan', corteva,  ['Klorantraniliprol']),
    ('Altacor WG',          'insektisit','WG', 6,   9, 'gr/da',   3, 'Yapraktan', corteva,  ['Klorantraniliprol']),
    ('Voliam Flexi',        'insektisit','SC', 50,  75,'ml/da',   7, 'Yapraktan', syngenta, ['Tiametoksam','Klorantraniliprol']),
    ('Belt SC',             'insektisit','SC', 6,   10,'ml/da',   3, 'Yapraktan', bayer,    ['Flubendiamid']),
    ('Closer SC',           'insektisit','SC', 75, 100,'ml/da',   7, 'Yapraktan', corteva,  ['Sulfoksaflor']),
    ('Sivanto Prime',       'insektisit','SL', 100,125,'ml/da',   3, 'Yapraktan', bayer,    ['Flupyradifuron']),
    ('Exirel',              'insektisit','SE', 75, 100,'ml/da',   3, 'Yapraktan', corteva,  ['Sinatraniliprol']),
    ('Avaunt EC',           'insektisit','EC', 15,  20,'ml/da',   3, 'Yapraktan', corteva,  ['İndoksakarb']),
    ('Steward EC',          'insektisit','EC', 15,  20,'ml/da',   3, 'Yapraktan', corteva,  ['İndoksakarb']),
    ('Radiant SC',          'insektisit','SC', 60,  80,'ml/da',   3, 'Yapraktan', corteva,  ['Spinosad']),
    ('Tracer SC',           'insektisit','SC', 30,  50,'ml/da',   3, 'Yapraktan', corteva,  ['Spinosad']),
    ('Proclaim 5 SG',       'insektisit','SG', 30,  50,'gr/da',   7, 'Yapraktan', syngenta, ['Emamektin Benzoat']),
    ('Affirm WG',           'insektisit','WG', 150,200,'gr/da',   7, 'Yapraktan', syngenta, ['Emamektin Benzoat']),
    ('Vertimec 18 EC',      'insektisit','EC', 75, 100,'ml/da',   3, 'Yapraktan', syngenta, ['Abamektin']),
    ('Agri-Mek SC',         'insektisit','SC', 50,  75,'ml/da',   3, 'Yapraktan', syngenta, ['Abamektin']),

    # AKARİSİT
    ('Floramite SC',        'akarisit',  'SC', 20,  30,'ml/da',   3, 'Yapraktan', chemtura, ['Bifenazat']),
    ('Ortus 5 SC',          'akarisit',  'SC', 60,  80,'ml/da',   7, 'Yapraktan', sumitomo, ['Fenpiroksimit']),
    ('Nissorum 10 WP',      'akarisit',  'WP', 30,  40,'gr/da',   7, 'Yapraktan', sumitomo, ['Heksitiazoks']),
    ('Apollo 50 SC',        'akarisit',  'SC', 30,  40,'ml/da',   7, 'Yapraktan', adama,    ['Klofentezin']),
    ('Borneo SC',           'akarisit',  'SC', 20,  30,'ml/da',   3, 'Yapraktan', sumitomo, ['Etoksazol']),
    ('Zoom SC',             'akarisit',  'SC', 60,  80,'ml/da',   7, 'Yapraktan', sumitomo, ['Fenpiroksimit']),
    ('Masai 20 WP',         'akarisit',  'WP', 30,  50,'gr/da',   7, 'Yapraktan', basf,     ['Tebufenpyrad']),
    ('Sanmite 20 WP',       'akarisit',  'WP', 60,  80,'gr/da',   7, 'Yapraktan', sumitomo, ['Piridaben']),
    ('Envidor SC',          'akarisit',  'SC', 40,  60,'ml/da',   7, 'Yapraktan', bayer,    ['Spiromesifen']),
    ('Oberon SC',           'akarisit',  'SC', 40,  60,'ml/da',   7, 'Yapraktan', bayer,    ['Spiromesifen']),

    # HERBİSİT — Tarla
    ('Glyphomax 480 SL',    'herbisit',  'SL', 300,500,'ml/da',   0, 'Toprak',    adama,    ['Glifosat']),
    ('Roundup Flexi',       'herbisit',  'SG', 200,350,'gr/da',   0, 'Toprak',    bayer,    ['Glifosat']),
    ('Gramoxone SL',        'herbisit',  'SL', 150,250,'ml/da',   0, 'Toprak',    syngenta, ['Paraquat']),
    ('Stomp Aqua',          'herbisit',  'CS', 200,300,'ml/da',   0, 'Toprak',    basf,     ['Pendimetalin']),
    ('Sencor 70 WG',        'herbisit',  'WG', 20,  30,'gr/da',   0, 'Toprak',    bayer,    ['Metribuzin']),
    ('Goal 2 EC',           'herbisit',  'EC', 50,  75,'ml/da',   0, 'Toprak',    corteva,  ['Oksiflüorfen']),
    ('Basagran 480 SL',     'herbisit',  'SL', 150,200,'ml/da',   0, 'Yapraktan', basf,     ['Bentazon']),
    ('Select SC',           'herbisit',  'SC', 75, 100,'ml/da',   0, 'Yapraktan', adama,    ['Kletodim']),
    ('Fusilade Forte',      'herbisit',  'EC', 75, 100,'ml/da',   0, 'Yapraktan', syngenta, ['Fluazifop-P-Butil']),
    ('Agil 100 EC',         'herbisit',  'EC', 75, 100,'ml/da',   0, 'Yapraktan', adama,    ['Propakizafop']),
    ('Focus Ultra',         'herbisit',  'EC', 150,200,'ml/da',   0, 'Yapraktan', basf,     ['Sikloksidim']),
    ('Targa Super',         'herbisit',  'EC', 100,150,'ml/da',   0, 'Yapraktan', adama,    ['Kuizalofop-P-Etil']),
]

# İlaçları oluştur
print("Ilaclar olusturuluyor...")
olusturulan_ilac = 0

for row in ilac_data:
    if len(row) == 10:
        ad, kat, form, dmin, dmax, dbirim, phi, yontem, ure, etkens = row
    else:
        continue

    ilac, created = Ilac.objects.get_or_create(
        ticari_ad=f'[DEMO] {ad}',
        defaults=dict(
            uretici=ure,
            kategori=kat,
            formulasyon=form,
            ruhsat_no=f'TR-{ad[:6].upper().replace(" ","")}',
            phi_gun=phi,
            endikasyon=f'{ad} - demo endikasyon',
            doz_min=dmin, doz_max=dmax, doz_birimi=dbirim,
            uygulama_yontemi=yontem,
            ambalaj_hacmi=1, ambalaj_birimi='sise', ambalaj_birim='L',
            aktif=True, onaylandi=True,
        )
    )
    if created:
        olusturulan_ilac += 1
        for etken_ad in etkens:
            e = etkenler.get(etken_ad)
            if e:
                IlacEtkenMadde.objects.get_or_create(
                    ilac=ilac, etken_madde=e,
                    defaults={'oran': 10, 'miktar': 100, 'miktar_birim': 'g/L'}
                )

print(f"  {olusturulan_ilac} yeni ilac olusturuldu")

# ─── GÜBRE VERİLERİ ───
gubre_data = [
    # MAKRO GÜBRELER — NPK
    ('Kristalina 20-20-20',     'makro',  'WS',  150, 300, 'gr/100L', 'Damla',       syngenta, [('Azot (N)',20),('Fosfor (P2O5)',20),('Potasyum (K2O)',20)]),
    ('Kristalina 13-40-13',     'makro',  'WS',  150, 300, 'gr/100L', 'Damla',       syngenta, [('Azot (N)',13),('Fosfor (P2O5)',40),('Potasyum (K2O)',13)]),
    ('Kristalina 15-5-30',      'makro',  'WS',  150, 300, 'gr/100L', 'Damla',       syngenta, [('Azot (N)',15),('Fosfor (P2O5)',5),('Potasyum (K2O)',30)]),
    ('Kristalina 19-19-19',     'makro',  'WS',  150, 300, 'gr/100L', 'Damla',       syngenta, [('Azot (N)',19),('Fosfor (P2O5)',19),('Potasyum (K2O)',19)]),
    ('Haifa Multi 20-20-20',    'makro',  'WS',  150, 300, 'gr/100L', 'Damla',       stockton, [('Azot (N)',20),('Fosfor (P2O5)',20),('Potasyum (K2O)',20)]),
    ('Haifa Multi 12-12-36',    'makro',  'WS',  150, 300, 'gr/100L', 'Damla',       stockton, [('Azot (N)',12),('Fosfor (P2O5)',12),('Potasyum (K2O)',36)]),
    ('Yara Tera Kristalon',     'makro',  'WS',  200, 400, 'gr/100L', 'Damla',       basf,     [('Azot (N)',18),('Fosfor (P2O5)',18),('Potasyum (K2O)',18)]),
    ('Peters Excel 21-5-20',    'makro',  'WS',  200, 400, 'gr/100L', 'Damla',       corteva,  [('Azot (N)',21),('Fosfor (P2O5)',5),('Potasyum (K2O)',20)]),
    ('Calcinit (Kalsiyum Nit.)', 'makro', 'WS',  100, 200, 'gr/100L', 'Damla',       basf,     [('Azot (N)',15),('Kalsiyum (Ca)',25)]),
    ('Magnisal (Mg Nitrat)',    'makro',  'WS',   75, 150, 'gr/100L', 'Damla',       basf,     [('Azot (N)',11),('Magnezyum (Mg)',16)]),
    ('MAP 12-61-0',             'makro',  'WS',  100, 200, 'gr/100L', 'Damla',       adama,    [('Azot (N)',12),('Fosfor (P2O5)',61)]),
    ('MKP 0-52-34',             'makro',  'WS',  100, 200, 'gr/100L', 'Damla',       adama,    [('Fosfor (P2O5)',52),('Potasyum (K2O)',34)]),
    ('MKP Monokaliyum Fosfat',  'makro',  'WS',  100, 200, 'gr/100L', 'Damla',       syngenta, [('Fosfor (P2O5)',52),('Potasyum (K2O)',34)]),
    ('Potasyum Nitrat 13-0-46', 'makro',  'WS',  150, 300, 'gr/100L', 'Damla',       adama,    [('Azot (N)',13),('Potasyum (K2O)',46)]),
    ('Potasyum Sülfat 0-0-50',  'makro',  'WS',  100, 200, 'gr/100L', 'Damla',       adama,    [('Potasyum (K2O)',50),('Sülfür (S)',18)]),
    ('Üre 46-0-0',              'makro',  'PR',  100, 200, 'gr/da',   'Toprak',      adama,    [('Azot (N)',46)]),
    ('Amonyum Sülfat 21-0-0',   'makro',  'PR',  100, 200, 'gr/da',   'Toprak',      adama,    [('Azot (N)',21),('Sülfür (S)',24)]),
    ('Diamonyum Fosfat 18-46',  'makro',  'PR',  100, 200, 'gr/da',   'Toprak',      adama,    [('Azot (N)',18),('Fosfor (P2O5)',46)]),
    ('15-15-15 Kompoze',        'makro',  'PR',  150, 300, 'gr/da',   'Toprak',      adama,    [('Azot (N)',15),('Fosfor (P2O5)',15),('Potasyum (K2O)',15)]),
    ('8-24-24 Kompoze',         'makro',  'PR',  150, 300, 'gr/da',   'Toprak',      adama,    [('Azot (N)',8),('Fosfor (P2O5)',24),('Potasyum (K2O)',24)]),

    # MİKRO GÜBRELER
    ('Solubor DF (Bor)',        'mikro',  'WG',  15,  30, 'gr/100L', 'Yapraktan',   basf,     [('Bor (B)',17)]),
    ('Borax Etidot 67',         'mikro',  'WP',  150, 300, 'gr/da',  'Toprak',      adama,    [('Bor (B)',11)]),
    ('Mantrac Pro (Mn)',         'mikro',  'WP',  100, 200, 'gr/100L','Yapraktan',   adama,    [('Mangan (Mn)',37)]),
    ('Zineb 80 WP (Çinko)',     'mikro',  'WP',  150, 250, 'gr/100L','Yapraktan',   adama,    [('Çinko (Zn)',80)]),
    ('Zinplex Çinko Sülfat',    'mikro',  'WP',  100, 200, 'gr/100L','Yapraktan',   stockton, [('Çinko (Zn)',36)]),
    ('Sequestrene 138 Fe',      'mikro',  'WG',  10,  20, 'gr/100L', 'Damla',       basf,     [('Demir (Fe)',6)]),
    ('Librel Fe',               'mikro',  'WG',  10,  20, 'gr/100L', 'Damla',       basf,     [('Demir (Fe)',6)]),
    ('Librel Mn',               'mikro',  'WG',  20,  40, 'gr/100L', 'Yapraktan',   basf,     [('Mangan (Mn)',13)]),
    ('Librel Zn',               'mikro',  'WG',  20,  40, 'gr/100L', 'Yapraktan',   basf,     [('Çinko (Zn)',15)]),
    ('Librel Cu',               'mikro',  'WG',  10,  20, 'gr/100L', 'Yapraktan',   basf,     [('Bakır (Cu)',15)]),
    ('Mikrocop (Cu)',            'mikro',  'WP',  100, 200, 'gr/100L','Yapraktan',   adama,    [('Bakır (Cu)',50)]),
    ('Fertigard Mo',            'mikro',  'WP',   5,  10, 'gr/100L', 'Yapraktan',   stockton, [('Molibden (Mo)',25)]),
    ('Speedfol B Sprey',        'mikro',  'SL',  200, 400, 'ml/100L','Yapraktan',   basf,     [('Bor (B)',11)]),
    ('Speedfol Zn Sprey',       'mikro',  'SL',  200, 400, 'ml/100L','Yapraktan',   basf,     [('Çinko (Zn)',7)]),
    ('Chelal Fe',               'mikro',  'SL',  100, 200, 'ml/100L','Yapraktan',   belchim,  [('Demir (Fe)',5)]),
    ('Chelal Combi',            'mikro',  'SL',  200, 400, 'ml/100L','Yapraktan',   belchim,  [('Demir (Fe)',2),('Mangan (Mn)',1),('Çinko (Zn)',1)]),
    ('Kendal',                  'mikro',  'WP',  100, 200, 'gr/100L','Yapraktan',   stockton, [('Bor (B)',1)]),

    # YAPRAK GÜBRELERİ
    ('Wuxal Super',             'yaprak', 'SL',  200, 400, 'ml/100L','Yapraktan',   adama,    [('Azot (N)',8),('Fosfor (P2O5)',8),('Potasyum (K2O)',6)]),
    ('Wuxal Calcium',           'yaprak', 'SL',  200, 400, 'ml/100L','Yapraktan',   adama,    [('Azot (N)',6),('Kalsiyum (Ca)',11)]),
    ('Wuxal Boron',             'yaprak', 'SL',  200, 400, 'ml/100L','Yapraktan',   adama,    [('Bor (B)',9)]),
    ('Nutrel Ca-B',             'yaprak', 'SL',  200, 400, 'ml/100L','Yapraktan',   belchim,  [('Kalsiyum (Ca)',10),('Bor (B)',0)]),
    ('Megafol',                 'yaprak', 'SL',  200, 300, 'ml/100L','Yapraktan',   stockton, [('Aminoasit',40)]),
    ('Radifarm',                'yaprak', 'WG',  100, 200, 'gr/100L','Damla',       stockton, [('Aminoasit',30)]),
    ('Viva',                    'yaprak', 'SL',  200, 400, 'ml/100L','Yapraktan',   stockton, [('Aminoasit',25)]),
    ('Kelpak SL',               'yaprak', 'SL',  200, 400, 'ml/100L','Yapraktan',   adama,    [('Deniz Yosunu Ekstraktı',18)]),
    ('Goëmar BM 86',            'yaprak', 'SL',  200, 400, 'ml/100L','Yapraktan',   basf,     [('Deniz Yosunu Ekstraktı',20)]),
    ('Humiforte',               'yaprak', 'SL',  200, 400, 'ml/100L','Damla',       belchim,  [('Hümik Asit',12),('Fülvik Asit',3)]),
    ('Roots',                   'yaprak', 'SL',  200, 400, 'ml/100L','Damla',       stockton, [('Hümik Asit',20)]),
    ('Atlante',                 'yaprak', 'SL',  200, 400, 'ml/100L','Yapraktan',   stockton, [('Aminoasit',30)]),
    ('Kalex',                   'yaprak', 'SL',  200, 400, 'ml/100L','Yapraktan',   belchim,  [('Kalsiyum (Ca)',12)]),
    ('Calbit C',                'yaprak', 'SL',  200, 400, 'ml/100L','Yapraktan',   stockton, [('Kalsiyum (Ca)',15),('Bor (B)',1)]),
    ('Boroplant',               'yaprak', 'SL',  200, 400, 'ml/100L','Yapraktan',   belchim,  [('Bor (B)',15)]),

    # ORGANİK / TOPRAK DÜZENLEYİCİ
    ('Powhumus WS',             'organik','WS',  100, 300, 'gr/da',  'Toprak',      adama,    [('Hümik Asit',85)]),
    ('Huminite S',              'organik','SL',  200, 500, 'ml/da',  'Damla',       adama,    [('Hümik Asit',12),('Fülvik Asit',3)]),
    ('Aminocat 30',             'organik','SL',  200, 400, 'ml/100L','Yapraktan',   stockton, [('Aminoasit',30)]),
    ('Trainer',                 'organik','WP',  100, 200, 'gr/100L','Yapraktan',   stockton, [('Aminoasit',20)]),
    ('Azoter',                  'organik','WP',  200, 400, 'gr/da',  'Toprak',      belchim,  [('Azot (N)',12)]),
    ('Bioplasma',               'organik','SL',  200, 400, 'ml/da',  'Damla',       stockton, [('Aminoasit',15)]),
    ('Sitokin Plus',            'toprak', 'SL',  100, 200, 'ml/da',  'Damla',       belchim,  [('Silisyum (Si)',5)]),
    ('Perlka (Kalsiyum Siyanamid)','toprak','PR',200, 300, 'gr/da',  'Toprak',      basf,     [('Azot (N)',20),('Kalsiyum (Ca)',28)]),
    ('Isobutilenin Diacid',     'toprak', 'PR',  200, 300, 'gr/da',  'Toprak',      basf,     [('Azot (N)',22)]),
    ('Sulfur 80 WG',            'toprak', 'WG',  200, 300, 'gr/da',  'Toprak',      adama,    [('Sülfür (S)',80)]),
    ('Thiovit Jet',             'toprak', 'WG',  200, 300, 'gr/da',  'Yapraktan',   syngenta, [('Sülfür (S)',80)]),
    ('Kumulus DF',              'toprak', 'WG',  200, 300, 'gr/da',  'Yapraktan',   basf,     [('Sülfür (S)',80)]),
]

print("Gubreler olusturuluyor...")
olusturulan_gubre = 0

for row in gubre_data:
    ad, tur, form, dmin, dmax, dbirim, yontem, ure, etkens = row
    gubre, created = Gubre.objects.get_or_create(
        ticari_ad=f'[DEMO] {ad}',
        defaults=dict(
            uretici=ure,
            tur=tur,
            formulasyon=form,
            doz_min=dmin, doz_max=dmax, doz_birimi=dbirim,
            uygulama_yontemi=yontem,
            ambalaj_hacmi=25, ambalaj_birimi='torba', ambalaj_birim='kg',
            aktif=True, onaylandi=True,
        )
    )
    if created:
        olusturulan_gubre += 1
        for etken_ad, oran in etkens:
            e = etkenler.get(etken_ad)
            if e:
                GubreEtkenMadde.objects.get_or_create(
                    gubre=gubre, etken_madde=e,
                    defaults={'oran': oran}
                )

print(f"  {olusturulan_gubre} yeni gubre olusturuldu")
print()
print(f"=== TOPLAM ===")
print(f"  Ilac: {Ilac.objects.filter(aktif=True, onaylandi=True).count()}")
print(f"  Gubre: {Gubre.objects.filter(aktif=True, onaylandi=True).count()}")
print(f"  Etken madde: {EtkenMadde.objects.count()}")
print()
print("Katalog veri yukleme tamamlandi.")
