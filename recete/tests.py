from django.test import TestCase
from .models import Recete


class ReceteModelTest(TestCase):
    def test_durum_choices(self):
        values = [c[0] for c in Recete.Durum.choices]
        self.assertIn('taslak', values)
        self.assertIn('onaylandi', values)
        self.assertIn('iptal', values)

    def test_default_durum(self):
        self.assertEqual(Recete._meta.get_field('durum').default, Recete.Durum.TASLAK)
