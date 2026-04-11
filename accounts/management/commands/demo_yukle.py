"""
Kumluca bölgesi için gerçeğe yakın demo verisi yükler.
Kullanım: python manage.py demo_yukle
"""
import random
from datetime import date, timedelta
from django.core.management.base import BaseCommand
from django.db import transaction
from accounts.models import Kullanici
from ciftci.models import Ciftci, Isletme, Urun, UrunCesit, MuhendisIsletme, ToprakAnaliz
from katalog.models import Bayii, Ilac, Gubre
from recete.models import Recete, UygulamaAdimi, UygulamaAdimKalemi


ADLAR = [
    'Ahmet','Mehmet','Mustafa','Ali','Hasan','Hüseyin','İbrahim','Yusuf','Ömer','Kadir',
    'Recep','Murat','Kemal','Sercan','Ercan','Fatih','Emre','Burak','Onur','Deniz',
    'Ayşe','Fatma','Zeynep','Hatice','Emine','Merve','Selin','Büşra','Elif','Tuğba',
    'Ramazan','Süleyman','Abdurrahman','Bayram','Cengiz','Dursun','Fikret','Gökhan',
    'Halil','İsmail','Celal','Bekir','Adem','Cafer','Erdal','Ferhat','Güven','Harun',
]

SOYADLAR = [
    'Yılmaz','Kaya','Demir','Çelik','Şahin','Doğan','Arslan','Öztürk','Aydın','Erdoğan',
    'Taş','Kurt','Polat','Güneş','Acar','Çetin','Koç','Yıldız','Özcan','Karaca',
    'Bulut','Bozkurt','Çakır','Aslan','Güler','Kılıç','Korkmaz','Özer','Tekin','Uysal',
    'Aksoy','Bayrak','Çiftçi','Duman','Ekinci','Gündoğdu','Karakuş','Sarıkaya','Topal',
    'Uzun','Yavuz','Zorlu','Akgül','Bakırcı','Coşkun','Demirci','Gül','Kaplan','Sert',
]

MAHALLELER = [
    'Hacıveliler Mah.','Kılavuzlar Mah.','Bucak Mah.','Yazır Mah.','Karaçay Mah.',
    'Gökbük Mah.','Beykonak Mah.','Sarılar Mah.','Çobanlar Mah.','Yeşilköy Mah.',
    'Dereköy Mah.','Belen Mah.','Kumluca Merkez Mah.','Adrasan Mah.','Mavikent Mah.',
    'Sundurlu Mah.','Yukarı Mah.','Aşağı Mah.','Çukurca Mah.','Güzle Mah.',
]

BAYII_ADLAR = [
    ('Kumluca Tarım Ürünleri', '07-KLK-001'),
    ('Anadolu Tarım Girdileri', '07-KLK-002'),
    ('Akdeniz Tarım Malzemeleri', '07-KLK-003'),
    ('Güney Tarım Bayii', '07-KLK-004'),
    ('Bereket Tarım Ürünleri', '07-KLK-005'),
    ('Toroslar Tarım Merkezi', '07-KLK-006'),
    ('Öz Kumluca Tarım', '07-KLK-007'),
    ('Yıldız Tarım Girdileri', '07-KLK-008'),
    ('Sera Teknik Tarım', '07-KLK-009'),
    ('Körfez Tarım Ürünleri', '07-KLK-010'),
]

MUHENDIS_ADLAR = [
    ('Alper', 'Karahan'),
    ('Barış', 'Demirbaş'),
    ('Caner', 'Yılmaz'),
    ('Doruk', 'Şimşek'),
    ('Emrah', 'Gürbüz'),
    ('Fehmi', 'Arslan'),
    ('Gökhan', 'Baysal'),
    ('Hakan', 'Toprak'),
    ('İlker', 'Çelik'),
    ('Kaan', 'Öztürk'),
    ('Levent', 'Karadağ'),
    ('Mete', 'Sarıoğlu'),
    ('Nihat', 'Erdoğan'),
    ('Orhan', 'Aydın'),
    ('Pınar', 'Koç'),
    ('Rıza', 'Demir'),
    ('Serhat', 'Bülbül'),
    ('Taner', 'Kılıç'),
    ('Ufuk', 'Aktaş'),
    ('Volkan', 'Güneş'),
]

TANILAR = [
    'Yaprak sarılması ve solgunluk belirtileri',
    'Kök boğazı çürüklüğü şüphesi',
    'Kırmızı örümcek zararı',
    'Mildiyö belirtileri',
    'Külleme hastalığı',
    'Thrips zararı',
    'Botrytis (gri küf) enfeksiyonu',
    'Yaprak delici zararlı',
    'Demir eksikliği (kloroz)',
    'Erken yanıklık hastalığı',
    'Beyazsinek istilası',
    'Fusarium solgunluğu şüphesi',
    'Çiçek dökümü ve meyve tutmama',
    'Azot eksikliği belirtileri',
    'Potasyum noksanlığı',
    'Ürün gelişim takibi',
    'Dönemsel ilaçlama programı',
    'Verim düşüklüğü incelemesi',
    'Sulama sonrası gübreleme',
    'Periyodik kontrol ve bakım',
]

NOTLAR = [
    'Sabah erken saatlerde uygulama yapınız.',
    'İlaçlama sonrası 3 gün sulama yapmayınız.',
    'Ürünleri hasat öncesi kontrol ediniz.',
    'Sıcaklık 30°C üzerinde uygulama yapmayınız.',
    'Komşu parsellere drift olmamaya dikkat ediniz.',
    'Maske ve eldiven kullanımı zorunludur.',
    'Uygulamadan önce tankı temizleyiniz.',
    'İki uygulama arasında en az 10 gün bekleyiniz.',
]

URUNLER = ['Domates', 'Biber', 'Salatalık', 'Patlıcan', 'Fasulye', 'Kabak', 'Marul', 'Çilek']
SERA_TIPLERI = ['naylon', 'naylon', 'naylon', 'policarbon', 'cam']
ISLETME_TURLER = ['sera', 'sera', 'sera', 'acik_tarla', 'meyve_bahce']

class Command(BaseCommand):
    help = 'Kumluca bölgesi demo verisi yükler (100 çiftçi, 10 bayii, 20 mühendis)'

    def add_arguments(self, parser):
        parser.add_argument('--temizle', action='store_true', help='Demo verileri sil ve yeniden oluştur')

    @transaction.atomic
    def handle(self, *args, **options):
        if options['temizle']:
            self._temizle()

        urunler = self._urunleri_hazirla()
        muhendisl = self._muhendisl_olustur()
        bayiiler = self._bayii_olustur()
        ciftciler = self._ciftci_olustur(urunler, muhendisl)
        recete_sayisi = self._recete_olustur(muhendisl)
        toprak_sayisi = self._toprak_analiz_olustur()

        self.stdout.write(self.style.SUCCESS(
            f'\nDemo verisi yüklendi:\n'
            f'  Mühendis:       {len(muhendisl)}\n'
            f'  Bayii:          {len(bayiiler)}\n'
            f'  Çiftçi:         {len(ciftciler)}\n'
            f'  Reçete:         {recete_sayisi}\n'
            f'  Toprak Analizi: {toprak_sayisi}\n'
            f'\nGiriş: telefon numarası, şifre: 1234\n'
            f'  Mühendis örnek: 05001000001\n'
            f'  Bayii örnek:    05302000001\n'
            f'  Çiftçi örnek:   05323000001\n'
        ))

    def _temizle(self):
        # Demo kullanıcıları telefon prefix'e göre sil
        Kullanici.objects.filter(telefon__startswith='0500100').delete()
        Kullanici.objects.filter(telefon__startswith='0530200').delete()
        Kullanici.objects.filter(telefon__startswith='0532300').delete()
        self.stdout.write('Eski demo verisi temizlendi.')

    def _urunleri_hazirla(self):
        urun_objeleri = []
        for ad in URUNLER:
            u, _ = Urun.objects.get_or_create(ad=ad)
            urun_objeleri.append(u)
        return urun_objeleri

    def _muhendisl_olustur(self):
        muhendisl = []
        for i, (ad, soyad) in enumerate(MUHENDIS_ADLAR, 1):
            tel = f'0500100{i:04d}'
            if Kullanici.objects.filter(telefon=tel).exists():
                muhendisl.append(Kullanici.objects.get(telefon=tel))
                continue
            u = Kullanici.objects.create_user(
                username=tel,
                password='1234',
                first_name=ad,
                last_name=soyad,
                telefon=tel,
                rol='muhendis',
                il='Antalya',
                ilce='Kumluca',
            )
            muhendisl.append(u)
            self.stdout.write(f'  Mühendis: {ad} {soyad} — {tel}')
        return muhendisl

    def _bayii_olustur(self):
        bayiiler = []
        for i, (firma, ruhsat) in enumerate(BAYII_ADLAR, 1):
            tel = f'0530200{i:04d}'
            if Kullanici.objects.filter(telefon=tel).exists():
                bayiiler.append(Kullanici.objects.get(telefon=tel))
                continue
            u = Kullanici.objects.create_user(
                username=tel,
                password='1234',
                first_name=firma.split()[0],
                last_name='Bayii',
                telefon=tel,
                rol='bayii',
                il='Antalya',
                ilce='Kumluca',
            )
            Bayii.objects.create(
                kullanici=u,
                firma_adi=firma,
                ruhsat_no=ruhsat,
                il='Antalya',
                ilce='Kumluca',
                telefon=tel,
            )
            bayiiler.append(u)
            self.stdout.write(f'  Bayii: {firma} — {tel}')
        return bayiiler

    def _ciftci_olustur(self, urunler, muhendisl):
        ciftciler = []
        kullanilan_adlar = set()

        for i in range(1, 101):
            tel = f'0532300{i:04d}'
            if Kullanici.objects.filter(telefon=tel).exists():
                ciftciler.append(Ciftci.objects.get(kullanici__telefon=tel))
                continue

            # Benzersiz ad-soyad çifti
            while True:
                ad = random.choice(ADLAR)
                soyad = random.choice(SOYADLAR)
                if (ad, soyad) not in kullanilan_adlar:
                    kullanilan_adlar.add((ad, soyad))
                    break

            mahalle = random.choice(MAHALLELER)

            u = Kullanici.objects.create_user(
                username=tel,
                password='1234',
                first_name=ad,
                last_name=soyad,
                telefon=tel,
                rol='ciftci',
                il='Antalya',
                ilce='Kumluca',
            )

            c = Ciftci.objects.create(
                kullanici=u,
                ad=ad,
                soyad=soyad,
                telefon=tel,
                ilce='Kumluca',
                il='Antalya',
                mahalle=mahalle,
                cks_no=f'07-KLK-{random.randint(10000, 99999)}',
            )

            # Her çiftçiye 1-3 işletme
            isletme_sayisi = random.randint(1, 3)
            for j in range(isletme_sayisi):
                urun = random.choice(urunler)
                tur = random.choice(ISLETME_TURLER)
                sera_tip = random.choice(SERA_TIPLERI) if tur == 'sera' else None
                alan = round(random.uniform(2, 25), 2)
                ekim_gunu = date.today() - timedelta(days=random.randint(10, 120))
                ada = str(random.randint(100, 999))
                parsel = str(random.randint(1, 50))

                isletme = Isletme.objects.create(
                    ciftci=c,
                    olusturan=u,
                    ad=f'{mahalle.split()[0]} {urun.ad} {j+1}' if isletme_sayisi > 1 else f'{mahalle.split()[0]} {urun.ad}',
                    tur=tur,
                    sera_tip=sera_tip,
                    urun=urun,
                    alan_dekar=alan,
                    il='Antalya',
                    ilce='Kumluca',
                    mahalle=mahalle,
                    ada_no=ada,
                    parsel_no=parsel,
                    ekim_tarihi=ekim_gunu,
                    enlem=round(36.35 + random.uniform(-0.15, 0.15), 6),
                    boylam=round(30.28 + random.uniform(-0.15, 0.15), 6),
                )

                # Rastgele 1-2 mühendis bağla (onaylı)
                for muh in random.sample(muhendisl, random.randint(1, 2)):
                    MuhendisIsletme.objects.get_or_create(
                        muhendis=muh,
                        isletme=isletme,
                        defaults={'durum': 'onaylandi', 'baslatan': 'muhendis'}
                    )

            ciftciler.append(c)
            self.stdout.write(f'  Çiftçi {i:3d}: {ad} {soyad} — {tel}')

        return ciftciler

    def _recete_olustur(self, muhendisl):
        ilaclar  = list(Ilac.objects.filter(onaylandi=True))
        gubreler = list(Gubre.objects.filter(onaylandi=True))
        if not ilaclar and not gubreler:
            self.stdout.write('  İlaç/gübre yok, reçete atlandı.')
            return 0

        isletmeler = list(
            Isletme.objects.filter(aktif=True)
            .select_related('ciftci')
            .prefetch_related('muhendis_iliskileri')
        )
        sayac = 0
        for isletme in isletmeler:
            # Zaten reçete varsa atla
            if Recete.objects.filter(isletme=isletme).exists():
                continue
            # Bu işletmeye bağlı mühendisleri bul
            iliskiler = isletme.muhendis_iliskileri.filter(durum='onaylandi')
            if not iliskiler.exists():
                continue
            muhendis = iliskiler.first().muhendis

            recete_adet = random.randint(1, 3)
            for r in range(recete_adet):
                gun_once = random.randint(5, 90)
                tarih = date.today() - timedelta(days=gun_once)
                tani = random.choice(TANILAR)
                durum = random.choices(['onaylandi', 'taslak'], weights=[85, 15])[0]

                recete = Recete.objects.create(
                    isletme=isletme,
                    muhendis=muhendis,
                    tani=tani,
                    tarih=tarih,
                    uygulama_yontemi='Damla sulama ile fertigasyon',
                    durum=durum,
                    ciftciye_not=random.choice(NOTLAR) if random.random() > 0.4 else '',
                )

                # 1-2 uygulama adımı
                adim_sayisi = random.randint(1, 2)
                for s in range(adim_sayisi):
                    tip = random.choice(['sulama', 'sulama', 'ilaclama', 'gubreleme'])
                    adim_tarihi = tarih + timedelta(days=s * random.randint(7, 14))
                    adim = UygulamaAdimi.objects.create(
                        recete=recete,
                        sira_no=s + 1,
                        tip=tip,
                        tanim=f'{s+1}. uygulama',
                        uygulama_tarihi=adim_tarihi,
                        tamamlandi=(adim_tarihi < date.today()),
                        notlar='[sulama]' if tip == 'sulama' else '',
                    )

                    # 1-3 kalem
                    if tip in ('ilaclama',):
                        secilen = random.sample(ilaclar, min(2, len(ilaclar)))
                        for il in secilen:
                            UygulamaAdimKalemi.objects.create(
                                adim=adim, ilac=il,
                                doz_dekar=round(random.uniform(0.1, 1.0), 2),
                                birim=random.choice(['lt', 'ml', 'kg', 'gr']),
                            )
                    else:
                        secilen = random.sample(gubreler, min(2, len(gubreler)))
                        for gu in secilen:
                            UygulamaAdimKalemi.objects.create(
                                adim=adim, gubre=gu,
                                doz_dekar=round(random.uniform(0.5, 3.0), 2),
                                birim=random.choice(['lt', 'kg', 'gr']),
                            )
                sayac += 1
        self.stdout.write(f'  Reçete: {sayac} oluşturuldu.')
        return sayac

    def _toprak_analiz_olustur(self):
        isletmeler = list(Isletme.objects.filter(aktif=True))
        sayac = 0
        for isletme in isletmeler:
            if ToprakAnaliz.objects.filter(isletme=isletme).exists():
                continue
            # Her işletmeye %60 ihtimalle 1-2 analiz
            if random.random() > 0.6:
                continue
            analiz_adet = random.randint(1, 2)
            for i in range(analiz_adet):
                tarih = date.today() - timedelta(days=random.randint(30, 365))
                ToprakAnaliz.objects.create(
                    isletme=isletme,
                    tarih=tarih,
                    ph=round(random.uniform(5.5, 7.8), 2),
                    organik_madde=round(random.uniform(0.5, 4.5), 2),
                    fosfor=round(random.uniform(5, 80), 2),
                    potasyum=round(random.uniform(80, 400), 2),
                    kalsiyum=round(random.uniform(500, 3000), 2),
                    magnezyum=round(random.uniform(50, 400), 2),
                    tuz=round(random.uniform(0.05, 0.8), 2),
                    notlar=random.choice([
                        'pH dengeli, organik madde artırılmalı.',
                        'Fosfor yeterli, potasyum desteği önerilir.',
                        'Tuz oranı yüksek, yıkama sulaması yapılmalı.',
                        'Genel olarak dengeli toprak yapısı.',
                        'Demir ve çinko eksikliği şüphesi.',
                        '',
                    ]),
                )
                sayac += 1
        self.stdout.write(f'  Toprak analizi: {sayac} oluşturuldu.')
        return sayac
