#!/usr/bin/env bash
# One-shot install of the memory engine on a fresh Ubuntu/Debian box.
# Run as root:  bash deploy/install-engine.sh
set -euo pipefail

APP_DIR=/opt/precedent
DATA_DIR=/var/lib/precedent

id -u precedent &>/dev/null || useradd --system --home "$APP_DIR" --shell /usr/sbin/nologin precedent

apt-get update -qq
apt-get install -y -qq python3-venv python3-pip

mkdir -p "$APP_DIR" "$DATA_DIR"
# copy the engine only — the web app is deployed by Vercel, not from here
cp -r precedent requirements.txt "$APP_DIR"/

python3 -m venv "$APP_DIR/.venv"
"$APP_DIR/.venv/bin/pip" install --quiet --upgrade pip
"$APP_DIR/.venv/bin/pip" install --quiet -r "$APP_DIR/requirements.txt"

chown -R precedent:precedent "$APP_DIR" "$DATA_DIR"
chmod 750 "$DATA_DIR"

echo
echo "installed. next:"
echo "  1. edit PRECEDENT_API_KEY in deploy/precedent-engine.service"
echo "  2. sudo cp deploy/precedent-engine.service /etc/systemd/system/"
echo "  3. sudo systemctl daemon-reload && sudo systemctl enable --now precedent-engine"
echo "  4. curl -s localhost:8787/health"
