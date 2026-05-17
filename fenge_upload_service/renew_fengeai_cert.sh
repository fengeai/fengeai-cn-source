#!/usr/bin/env sh
set -eu

CERT_DIR="/root/projects/fenge_upload_service/certs"
LE_DIR="/root/letsencrypt/live/fengeai.cn"

docker stop fenge_nginx >/dev/null
docker run --rm \
  -p 80:80 \
  -v /root/letsencrypt:/etc/letsencrypt \
  -v /root/letsencrypt-lib:/var/lib/letsencrypt \
  certbot/certbot renew --standalone --preferred-challenges http --quiet

cp "$LE_DIR/fullchain.pem" "$CERT_DIR/fengeai.cn.pem"
cp "$LE_DIR/privkey.pem" "$CERT_DIR/fengeai.cn.key"
cp "$LE_DIR/fullchain.pem" "$CERT_DIR/cert.pem"
cp "$LE_DIR/privkey.pem" "$CERT_DIR/key.pem"

docker start fenge_nginx >/dev/null
