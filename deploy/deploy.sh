#!/bin/bash
# Ondur — VPS Deployment Script
# Ubuntu 22.04 LTS için
# Kullanım: bash deploy.sh

set -e

DOMAIN="onduran.com.tr"
APP_DIR="/var/www/ondur"
REPO="https://github.com/denizkaya07/ondur.git"

echo "=== [1/8] Sistem paketleri ==="
apt-get update -q
apt-get install -y python3.12 python3.12-venv python3-pip \
    postgresql postgresql-contrib nginx certbot python3-certbot-nginx \
    nodejs npm git

echo "=== [2/8] PostgreSQL ==="
# .env bu adımda henüz yok — şifreyi daha sonra okumak için önce .env oluşturulmalı
# Aşağıdaki blok .env'den şifreyi okuyarak idempotent çalışır
if [ ! -f "$APP_DIR/.env" ]; then
  echo "HATA: $APP_DIR/.env dosyası bulunamadı. Önce .env dosyasını oluşturun:"
  echo "  cp $APP_DIR/.env.example $APP_DIR/.env && nano $APP_DIR/.env"
  exit 1
fi
DB_PASS=$(grep DB_PASSWORD $APP_DIR/.env | cut -d= -f2)
sudo -u postgres psql <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'ondur') THEN
    CREATE USER ondur WITH PASSWORD '$DB_PASS';
  END IF;
END
\$\$;
SELECT 'CREATE DATABASE ondur OWNER ondur'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'ondur')\gexec
SQL

echo "=== [3/8] Uygulama dizini ==="
mkdir -p $APP_DIR /var/log/ondur
git clone $REPO $APP_DIR || (cd $APP_DIR && git pull)

echo "=== [4/8] Python ortamı ==="
cd $APP_DIR
python3.12 -m venv venv
venv/bin/pip install --upgrade pip
venv/bin/pip install -r requirements.txt

echo "=== [5/8] Django ==="
# .env dosyasını manuel oluşturmanız gerekiyor:
# cp .env.example .env && nano .env
venv/bin/python manage.py migrate --no-input
venv/bin/python manage.py collectstatic --no-input
venv/bin/python manage.py createsuperuser --no-input || true

echo "=== [6/8] Frontend build ==="
cd $APP_DIR/frontend
npm ci
VITE_API_URL=https://$DOMAIN/api npm run build

echo "=== [7/8] Nginx + SSL ==="
cp $APP_DIR/deploy/nginx.conf /etc/nginx/sites-available/ondur
ln -sf /etc/nginx/sites-available/ondur /etc/nginx/sites-enabled/ondur
rm -f /etc/nginx/sites-enabled/default
nginx -t
certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos -m admin@onduran.com.tr
systemctl reload nginx

echo "=== [8/8] Servis ==="
cp $APP_DIR/deploy/ondur.service /etc/systemd/system/ondur.service
chown -R www-data:www-data $APP_DIR /var/log/ondur
systemctl daemon-reload
systemctl enable ondur
systemctl restart ondur

echo ""
echo "✓ Deployment tamamlandı: https://$DOMAIN"
echo ""
echo "Loglar: journalctl -u ondur -f"
