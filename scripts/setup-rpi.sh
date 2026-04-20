#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# CurveExtract — Raspberry Pi backend setup
#
# Run from the repo root:
#   chmod +x scripts/setup-rpi.sh
#   ./scripts/setup-rpi.sh
#
# What it does:
#   1. Installs system dependencies (OpenCV, fonts, etc.)
#   2. Creates a Python virtual environment and installs requirements
#   3. Initialises the SQLite database in a persistent directory
#   4. Registers a systemd service so the backend starts on boot
#   5. Optionally installs cloudflared for a public HTTPS tunnel so
#      your GitHub Pages frontend can reach this Pi from anywhere
# ---------------------------------------------------------------------------

set -euo pipefail

# ── Colours ─────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; BOLD='\033[1m'; NC='\033[0m'

info()    { echo -e "${BLUE}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
die()     { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }

echo -e "\n${BOLD}CurveExtract — Raspberry Pi Setup${NC}\n"

# ── Sanity checks ────────────────────────────────────────────────────────────
[[ "$(uname -s)" == "Linux" ]] || die "This script is for Linux/Raspberry Pi OS only."

ARCH=$(uname -m)
info "Architecture: $ARCH"
if [[ "$ARCH" != "aarch64" && "$ARCH" != "armv7l" ]]; then
    warn "Not an ARM system — this script targets Raspberry Pi but will continue."
fi

# Locate repo root (the directory containing this script's parent)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_DIR="$REPO_ROOT/backend"
[[ -f "$BACKEND_DIR/requirements.txt" ]] || die "Cannot find backend/requirements.txt. Run this script from the repo root."

# ── Python version ───────────────────────────────────────────────────────────
PYTHON=""
for cmd in python3.11 python3.12 python3.13 python3; do
    if command -v "$cmd" &>/dev/null; then
        VER=$("$cmd" -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
        MAJOR=${VER%%.*}; MINOR=${VER##*.}
        if [[ "$MAJOR" -ge 3 && "$MINOR" -ge 11 ]]; then
            PYTHON="$cmd"
            break
        fi
    fi
done
[[ -n "$PYTHON" ]] || die "Python 3.11+ is required. Install it with: sudo apt install python3.11"
success "Found Python $($PYTHON --version 2>&1 | awk '{print $2}') at $(command -v "$PYTHON")"

# ── System packages ──────────────────────────────────────────────────────────
info "Installing system dependencies…"
sudo apt-get update -qq
sudo apt-get install -y --no-install-recommends \
    libgl1 libglib2.0-0 libgomp1 libxrender1 libxext6 libsm6 \
    python3-venv python3-pip curl
success "System packages installed."

# ── Virtual environment ──────────────────────────────────────────────────────
VENV_DIR="$REPO_ROOT/.venv-rpi"
if [[ ! -d "$VENV_DIR" ]]; then
    info "Creating virtual environment at $VENV_DIR …"
    "$PYTHON" -m venv "$VENV_DIR"
fi
PY="$VENV_DIR/bin/python"
PIP="$VENV_DIR/bin/pip"
success "Virtual environment ready."

info "Upgrading pip…"
"$PIP" install --quiet --upgrade pip

# ── Python requirements ──────────────────────────────────────────────────────
info "Installing Python requirements (this can take several minutes on ARM)…"
# CadQuery has no official ARM wheel. Try PyPI first; if it fails, skip it
# and warn — STEP generation won't work but STL/preview still will.
if "$PIP" install --quiet -r "$BACKEND_DIR/requirements.txt" 2>/dev/null; then
    success "All requirements installed."
else
    warn "Full install failed (likely cadquery on ARM). Retrying without cadquery…"
    grep -v '^cadquery' "$BACKEND_DIR/requirements.txt" > /tmp/req_nocadquery.txt
    "$PIP" install --quiet -r /tmp/req_nocadquery.txt
    warn "cadquery was skipped — STEP file generation will be unavailable."
    warn "Only STL export (handled client-side) will work."
fi

# ── Data directory ───────────────────────────────────────────────────────────
DATA_DIR="${CURVEEXTRACT_DATA_DIR:-$HOME/.curveextract}"
mkdir -p "$DATA_DIR/uploads"
success "Data directory: $DATA_DIR"

# ── Initialise database ──────────────────────────────────────────────────────
info "Initialising SQLite database…"
CURVEEXTRACT_DATA_DIR="$DATA_DIR" PYTHONPATH="$BACKEND_DIR" \
    "$PY" -c "from app.storage.db import init_db; init_db(); print('  Database ready.')"
success "Database initialised at $DATA_DIR/history.db"

# ── systemd service ──────────────────────────────────────────────────────────
SERVICE_NAME="curveextract"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"

info "Creating systemd service…"
sudo tee "$SERVICE_FILE" > /dev/null << EOF
[Unit]
Description=CurveExtract Backend
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$BACKEND_DIR
Environment=CURVEEXTRACT_DATA_DIR=$DATA_DIR
ExecStart=$VENV_DIR/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable "$SERVICE_NAME"
sudo systemctl restart "$SERVICE_NAME"

sleep 2
if systemctl is-active --quiet "$SERVICE_NAME"; then
    success "Backend service is running on http://localhost:8000"
else
    warn "Service didn't start cleanly. Check logs with: sudo journalctl -u $SERVICE_NAME -n 40"
fi

# ── Cloudflare Tunnel (optional) ─────────────────────────────────────────────
echo ""
echo -e "${BOLD}Public access via Cloudflare Tunnel${NC}"
echo "A tunnel gives the backend a public HTTPS URL so your GitHub Pages"
echo "frontend can reach this Pi from anywhere — no port forwarding needed."
echo ""
read -r -p "Set up a Cloudflare Quick Tunnel now? [y/N] " SETUP_TUNNEL
SETUP_TUNNEL=${SETUP_TUNNEL:-N}

if [[ "$SETUP_TUNNEL" =~ ^[Yy]$ ]]; then
    # Install cloudflared if needed
    if ! command -v cloudflared &>/dev/null; then
        info "Installing cloudflared…"
        if [[ "$ARCH" == "aarch64" ]]; then
            CFURL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64"
        else
            CFURL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm"
        fi
        sudo curl -fsSL "$CFURL" -o /usr/local/bin/cloudflared
        sudo chmod +x /usr/local/bin/cloudflared
        success "cloudflared installed."
    fi

    # Create a systemd service for the tunnel
    TUNNEL_SERVICE="curveextract-tunnel"
    sudo tee "/etc/systemd/system/${TUNNEL_SERVICE}.service" > /dev/null << 'EOF'
[Unit]
Description=CurveExtract Cloudflare Tunnel
After=network.target curveextract.service

[Service]
Type=simple
User=nobody
ExecStart=/usr/local/bin/cloudflared tunnel --url http://localhost:8000 --no-autoupdate
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

    sudo systemctl daemon-reload
    sudo systemctl enable "$TUNNEL_SERVICE"
    sudo systemctl restart "$TUNNEL_SERVICE"

    echo ""
    info "Waiting for tunnel URL (up to 15 s)…"
    TUNNEL_URL=""
    for i in $(seq 1 15); do
        TUNNEL_URL=$(sudo journalctl -u "$TUNNEL_SERVICE" -n 50 --no-pager 2>/dev/null \
            | grep -oP 'https://[a-z0-9-]+\.trycloudflare\.com' | tail -1)
        [[ -n "$TUNNEL_URL" ]] && break
        sleep 1
    done

    echo ""
    if [[ -n "$TUNNEL_URL" ]]; then
        echo -e "${GREEN}${BOLD}╔══════════════════════════════════════════════════════╗${NC}"
        echo -e "${GREEN}${BOLD}║  Your public backend URL:                            ║${NC}"
        echo -e "${GREEN}${BOLD}║  $TUNNEL_URL  ║${NC}"
        echo -e "${GREEN}${BOLD}╚══════════════════════════════════════════════════════╝${NC}"
        echo ""
        echo "  1. Open https://scottlinddk.github.io/3D/"
        echo "  2. Paste the URL above into the amber 'Backend' banner"
        echo "  3. Click Connect — upload and 3D generation will work"
        echo ""
        warn "Quick Tunnel URLs change every restart. For a permanent URL,"
        warn "create a free Named Tunnel at dash.cloudflare.com."
    else
        warn "Could not read tunnel URL yet. Run this to get it:"
        echo "  sudo journalctl -u $TUNNEL_SERVICE -f | grep trycloudflare"
    fi
else
    echo ""
    info "Skipped tunnel setup. The backend is reachable on your local network at:"
    echo "  http://$(hostname -I | awk '{print $1}'):8000"
    echo ""
    echo "To access it from GitHub Pages you'll need one of:"
    echo "  • Cloudflare Tunnel: run this script again and choose Y"
    echo "  • Router port forwarding + a DDNS service"
fi

# ── Done ─────────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}Useful commands:${NC}"
echo "  sudo systemctl status curveextract          # service status"
echo "  sudo journalctl -u curveextract -f          # live logs"
echo "  sudo systemctl restart curveextract         # restart"
echo "  curl http://localhost:8000/health            # health check"
echo ""
success "Setup complete."
