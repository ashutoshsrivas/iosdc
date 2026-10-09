#!/usr/bin/env bash
# Deploy iosdc.geu.ac.in — content sync + exposure hardening.
# Nothing is deleted: exposed files are MOVED to /home/ubuntu/iosdc-quarantine/.
set -euo pipefail

LOCAL_DIR="/Users/ashutosh/Desktop/development/iosdc"
KEY="$LOCAL_DIR/iosdc.pem"
HOST="ubuntu@15.206.107.186"
DOCROOT="/var/www/iosdc"
SP="$(cd "$(dirname "$0")" && pwd)"

cd "$LOCAL_DIR"

echo "==> [1/6] Backing up the current docroot on the server"
ssh -i "$KEY" "$HOST" "sudo tar czf /home/ubuntu/iosdc-backup-\$(date +%F-%H%M).tar.gz -C /var/www iosdc && ls -lh /home/ubuntu/iosdc-backup-*.tar.gz | tail -1"

echo "==> [2/6] Pre-flight: confirm nothing sensitive is in the transfer set"
# Dry-run first and abort if any forbidden path survived the exclude list.
# This is the structural guarantee that ios-sdp/ (and its .env) can never
# reach the public web root, even though it lives inside this folder.
MANIFEST="$(mktemp)"
rsync -rln --checksum --out-format='%n' \
  --exclude-from="$SP/rsync-exclude.txt" \
  --rsync-path="sudo rsync" \
  -e "ssh -i $KEY" \
  ./ "$HOST:$DOCROOT/" > "$MANIFEST"

if grep -qiE '(^|/)(ios-sdp|node_modules|\.git|\.env|\.vscode)(/|$)|\.(pem|ppk|key|zip)$' "$MANIFEST"; then
  echo "!! ABORTED — sensitive paths would be published:"
  grep -iE '(^|/)(ios-sdp|node_modules|\.git|\.env|\.vscode)(/|$)|\.(pem|ppk|key|zip)$' "$MANIFEST" | sed 's/^/     /'
  rm -f "$MANIFEST"; exit 1
fi
echo "  clean — $(wc -l < "$MANIFEST" | tr -d ' ') paths queued"
rm -f "$MANIFEST"

echo "==> [3/6] Syncing site content (no --delete; excludes keys, .git, archives)"
rsync -rlptv --checksum \
  --exclude-from="$SP/rsync-exclude.txt" \
  --rsync-path="sudo rsync" \
  -e "ssh -i $KEY" \
  ./ "$HOST:$DOCROOT/"
# rsync -p copies the local directory modes, which on a laptop are often 700 —
# that leaves the docroot readable only by its owner. Normalise explicitly.
ssh -i "$KEY" "$HOST" "sudo find $DOCROOT -type d -exec chmod 755 {} + && \
  sudo find $DOCROOT -type f -exec chmod 644 {} + && \
  sudo chown -R www-data:www-data $DOCROOT && echo '  perms normalised'"

echo "==> [4/6] Quarantining exposed files out of the webroot"
ssh -i "$KEY" "$HOST" '
set -e
sudo mkdir -p /home/ubuntu/iosdc-quarantine
cd /var/www/iosdc
for f in .git Archive.zip iosdc.pem iosdc.ppk .vscode ".DS_Store" "a 1.sv"; do
  if [ -e "$f" ]; then sudo mv -f "$f" /home/ubuntu/iosdc-quarantine/ && echo "  moved: $f"; fi
done
sudo find /var/www/iosdc -name ".DS_Store" -delete
sudo chown -R ubuntu:ubuntu /home/ubuntu/iosdc-quarantine
sudo chmod -R go-rwx /home/ubuntu/iosdc-quarantine
echo "  quarantine:"; ls -la /home/ubuntu/iosdc-quarantine
'

echo "==> [5/6] Installing Apache hardening (no content change)"
scp -i "$KEY" "$SP/iosdc-hardening.conf" "$HOST:/tmp/iosdc-hardening.conf"
ssh -i "$KEY" "$HOST" '
set -e
sudo cp /tmp/iosdc-hardening.conf /etc/apache2/conf-available/iosdc-hardening.conf
sudo a2enmod headers expires >/dev/null
sudo a2enconf iosdc-hardening >/dev/null
if sudo apache2ctl configtest; then
  sudo systemctl reload apache2 && echo "  apache reloaded"
else
  echo "  CONFIGTEST FAILED — rolling back"; sudo a2disconf iosdc-hardening; exit 1
fi
'

echo "==> [6/6] Verifying"
for p in / /robots.txt /sitemap.xml /about.html /events.html /cohort2025.html /contact.html /php/mail.php /bootcamp /sdp; do
  printf '  %s  %s\n' "$(curl -s -o /dev/null -w '%{http_code}' "https://iosdc.geu.ac.in$p")" "$p"
done
echo "  --- these MUST now be 403/404 ---"
for p in /.git/config /iosdc.pem /iosdc.ppk /Archive.zip /img/ /css/; do
  printf '  %s  %s\n' "$(curl -s -o /dev/null -w '%{http_code}' "https://iosdc.geu.ac.in$p")" "$p"
done
echo "==> Done."
