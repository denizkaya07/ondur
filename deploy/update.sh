#!/bin/bash
# Ondur — Hızlı Güncelleme (git pull + migrate + build + restart)
set -e

APP_DIR="/var/www/ondur"
cd $APP_DIR

echo "=== [1/5] Git pull ==="
git pull origin main

echo "=== [2/5] Python bağımlılıkları ==="
venv/bin/pip install -r requirements.txt -q

echo "=== [3/5] Django migrate + collectstatic ==="
venv/bin/python manage.py migrate --no-input
venv/bin/python manage.py collectstatic --no-input --clear

echo "=== [4/5] Frontend build ==="
cd $APP_DIR/frontend
npm install --legacy-peer-deps -q
npm run build

echo "=== [5/5] Servis yeniden başlat ==="
systemctl restart ondur
systemctl reload nginx

echo ""
echo "✓ Güncelleme tamamlandı!"
echo "Log: journalctl -u ondur -f"
