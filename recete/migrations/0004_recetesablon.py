from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('recete', '0003_tani_blank'),
        ('ciftci', '0001_initial'),
        ('accounts', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='ReceteSablon',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('ad', models.CharField(max_length=200)),
                ('tani', models.CharField(blank=True, max_length=300)),
                ('ciftciye_not', models.TextField(blank=True)),
                ('donemler', models.JSONField(default=list)),
                ('kulturel', models.JSONField(default=list)),
                ('biyolojik', models.JSONField(default=list)),
                ('takip', models.JSONField(default=list)),
                ('olusturma', models.DateTimeField(auto_now_add=True)),
                ('guncelleme', models.DateTimeField(auto_now=True)),
                ('muhendis', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='sablonlar', to='accounts.kullanici')),
                ('urun', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='ciftci.urun', verbose_name='Ürün (opsiyonel)')),
            ],
            options={
                'verbose_name': 'Reçete Şablonu',
                'verbose_name_plural': 'Reçete Şablonları',
                'ordering': ['-guncelleme'],
            },
        ),
    ]
