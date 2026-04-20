#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# CurveExtract — Raspberry Pi CI/CD server setup
#
# Sets up two independent backend environments driven by GitHub Actions:
#   • Production  — tracks the "main" branch,        port 8000
#   • Development — tracks the "development" branch, port 8001
#
# Requires:
#   • Raspberry Pi OS (64-bit recommended) or any Debian-based ARM OS
#   • Python 3.11+
#   • The repo cloned on the Pi (or internet access to clone it)
#
# Usage (from the repo root on the Pi):
#   chmod +x scripts/setup-rpi-server.sh
#   ./scripts/setup-rpi-server.sh
# ---------------------------------------------------------------------------

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; BOLD='\033[1m'; NC='\033[0m'

info()    { echo -e "${BLUE}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
die()     { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }
step()    { echo -e "\n${BOLD}── $* ──${NC}"; }

echo -e "\n${BOLD}CurveExtract — Raspberry Pi Server Setup${NC}"
echo "Production: port 8000  |  Development: port 8001"
echo "Deployment: GitHub Actions self-hosted runner"

# ── Sanity checks ─────────────────────────────────────────────────────────
[[ "$(uname -s)" == "Linux" ]] || die "Linux only."

ARCH=$(uname -m)
REPO_URL="https://github.com/scottlinddk/3D.git"
INSTALL_BASE="$HOME/curveextract"
DATA_BASE="/var/lib/curveextract"
RUNNER_DIR="$HOME/actions-runner"

# ── Python ────────────────────────────────────────────────────────────────
PYTHON=""
for cmd in python3.12 python3.11 python3; do
    if command -v "$cmd" &>/dev/null; then
        VER=$("$cmd" -c "import sys; print(f'{sys.version_info.major}{sys.version_info.minor}')")
        [[ "$VER" -ge 311 ]] && { PYTHON="$cmd"; break; }
    fi
done
[[ -n "$PYTHON" ]] || die "Python 3.11+ required. Install: sudo apt install python3.11"
success "Python: $($PYTHON --version)"

# ── System packages ────────────────────────────────────────────────────────
step "System packages"
sudo apt-get update -qq
sudo apt-get install -y --no-install-recommends \
    libgl1 libglib2.0-0 libgomp1 libxrender1 libxext6 libsm6 \
    python3-venv python3-pip git curl jq
success "System packages ready."

# ── Helper: set up one environment ────────────────────────────────────────
setup_env() {
    local ENV="$1"          # prod | dev
    local BRANCH="$2"       # main | development
    local PORT="$3"         # 8000 | 8001
    local DIR="$INSTALL_BASE/$ENV"
    local DATA_DIR="$DATA_BASE/$ENV"
    local SERVICE="curveextract-$ENV"
    local VENV="$DIR/.venv"

    step "Environment: $ENV (branch=$BRANCH, port=$PORT)"

    # ── Clone or update ──────────────────────────────────────────────────
    if [[ -d "$DIR/.git" ]]; then
        info "Updating existing clone…"
        git -C "$DIR" fetch origin "$BRANCH"
        git -C "$DIR" reset --hard "origin/$BRANCH"
    else
        info "Cloning $REPO_URL → $DIR …"
        git clone --branch "$BRANCH" --single-branch "$REPO_URL" "$DIR"
    fi
    success "Code at $DIR (branch: $BRANCH)"

    # ── Virtual environment ──────────────────────────────────────────────
    if [[ ! -d "$VENV" ]]; then
        info "Creating venv…"
        "$PYTHON" -m venv "$VENV"
    fi
    "$VENV/bin/pip" install -q --upgrade pip

    info "Installing requirements (may take a while on ARM)…"
    if "$VENV/bin/pip" install -q -r "$DIR/backend/requirements.txt" 2>/dev/null; then
        success "Requirements installed."
    else
        warn "cadquery failed on ARM — retrying without it (STEP export disabled)."
        grep -v '^cadquery' "$DIR/backend/requirements.txt" > /tmp/_req.txt
        "$VENV/bin/pip" install -q -r /tmp/_req.txt
        warn "Only STL export will work (client-side). STEP is skipped."
    fi

    # ── Data directory ───────────────────────────────────────────────────
    sudo mkdir -p "$DATA_DIR/uploads"
    sudo chown -R "$USER:$USER" "$DATA_DIR"
    success "Data dir: $DATA_DIR"

    # ── Init DB ──────────────────────────────────────────────────────────
    info "Initialising database…"
    CURVEEXTRACT_DATA_DIR="$DATA_DIR" PYTHONPATH="$DIR/backend" \
        "$VENV/bin/python" -c "from app.storage.db import init_db; init_db()"
    success "Database ready at $DATA_DIR/history.db"

    # ── systemd service ──────────────────────────────────────────────────
    info "Creating systemd service: $SERVICE …"
    sudo tee "/etc/systemd/system/$SERVICE.service" > /dev/null << EOF
[Unit]
Description=CurveExtract Backend ($ENV)
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$DIR/backend
Environment=CURVEEXTRACT_DATA_DIR=$DATA_DIR
ExecStart=$VENV/bin/uvicorn app.main:app --host 0.0.0.0 --port $PORT
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
    sudo systemctl daemon-reload
    sudo systemctl enable "$SERVICE"
    sudo systemctl restart "$SERVICE"
    sleep 2

    if systemctl is-active --quiet "$SERVICE"; then
        success "$SERVICE running on http://localhost:$PORT"
    else
        warn "$SERVICE failed to start. Check: sudo journalctl -u $SERVICE -n 30"
    fi
}

# ── Set up both environments ───────────────────────────────────────────────
setup_env prod development main 8000
setup_env dev  development development 8001

# ── Sudoers rule for Actions runner ───────────────────────────────────────
step "Sudoers (passwordless service restart for runner)"
SUDOERS_FILE="/etc/sudoers.d/curveextract-runner"
sudo tee "$SUDOERS_FILE" > /dev/null << EOF
# Allow $USER to restart CurveExtract services without a password
$USER ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart curveextract-prod
$USER ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart curveextract-dev
$USER ALL=(ALL) NOPASSWD: /usr/bin/systemctl status curveextract-prod
$USER ALL=(ALL) NOPASSWD: /usr/bin/systemctl status curveextract-dev
EOF
sudo chmod 440 "$SUDOERS_FILE"
success "Sudoers rule added."

# ── GitHub Actions self-hosted runner ─────────────────────────────────────
step "GitHub Actions self-hosted runner"

echo ""
echo "The runner polls GitHub over HTTPS — no port forwarding needed."
echo ""
echo "You need a registration token:"
echo "  1. Open https://github.com/scottlinddk/3D/settings/actions/runners/new"
echo "  2. Select Linux / ARM64"
echo "  3. Copy the token shown under 'Configure' (starts with A…)"
echo ""
read -r -p "Paste the runner registration token: " RUNNER_TOKEN
[[ -n "$RUNNER_TOKEN" ]] || die "Token required."

# Detect architecture for runner download
if [[ "$ARCH" == "aarch64" ]]; then
    RUNNER_ARCH="arm64"
else
    RUNNER_ARCH="arm"
fi

# Get latest runner version
RUNNER_VERSION=$(curl -fsSL "https://api.github.com/repos/actions/runner/releases/latest" \
    | python3 -c "import sys,json; print(json.load(sys.stdin)['tag_name'].lstrip('v'))")
RUNNER_PKG="actions-runner-linux-${RUNNER_ARCH}-${RUNNER_VERSION}.tar.gz"
RUNNER_URL="https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/${RUNNER_PKG}"

info "Downloading runner v${RUNNER_VERSION} (${RUNNER_ARCH})…"
mkdir -p "$RUNNER_DIR"
curl -fsSL "$RUNNER_URL" -o "/tmp/$RUNNER_PKG"
tar -xzf "/tmp/$RUNNER_PKG" -C "$RUNNER_DIR"
rm "/tmp/$RUNNER_PKG"
success "Runner extracted to $RUNNER_DIR"

info "Configuring runner…"
"$RUNNER_DIR/config.sh" \
    --url "https://github.com/scottlinddk/3D" \
    --token "$RUNNER_TOKEN" \
    --name "rpi-$(hostname)" \
    --labels "self-hosted,rpi,Linux,ARM64" \
    --work "$RUNNER_DIR/_work" \
    --unattended \
    --replace

info "Installing runner as a systemd service…"
sudo "$RUNNER_DIR/svc.sh" install "$USER"
sudo "$RUNNER_DIR/svc.sh" start
success "Runner service started."

if systemctl is-active --quiet "actions.runner.scottlinddk-3D.rpi-$(hostname)" 2>/dev/null \
    || sudo "$RUNNER_DIR/svc.sh" status 2>&1 | grep -q "active (running)"; then
    success "GitHub Actions runner is online."
else
    warn "Runner may not be running yet. Check: sudo $RUNNER_DIR/svc.sh status"
fi

# ── Cloudflare Quick Tunnels (optional) ───────────────────────────────────
step "Cloudflare Tunnels (optional)"
echo "Expose the backends publicly without port forwarding."
read -r -p "Set up Cloudflare Quick Tunnels for prod and dev? [y/N] " SETUP_CF
SETUP_CF=${SETUP_CF:-N}

if [[ "$SETUP_CF" =~ ^[Yy]$ ]]; then
    if ! command -v cloudflared &>/dev/null; then
        info "Installing cloudflared…"
        if [[ "$ARCH" == "aarch64" ]]; then
            CF_URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64"
        else
            CF_URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm"
        fi
        sudo curl -fsSL "$CF_URL" -o /usr/local/bin/cloudflared
        sudo chmod +x /usr/local/bin/cloudflared
        success "cloudflared installed."
    fi

    for ENV_CF in prod dev; do
        local_port=$( [[ "$ENV_CF" == "prod" ]] && echo 8000 || echo 8001 )
        SVC="curveextract-tunnel-$ENV_CF"
        sudo tee "/etc/systemd/system/$SVC.service" > /dev/null << EOF
[Unit]
Description=CurveExtract Cloudflare Tunnel ($ENV_CF)
After=network.target curveextract-$ENV_CF.service

[Service]
Type=simple
User=nobody
ExecStart=/usr/local/bin/cloudflared tunnel --url http://localhost:$local_port --no-autoupdate
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
        sudo systemctl daemon-reload
        sudo systemctl enable "$SVC"
        sudo systemctl restart "$SVC"
    done

    info "Waiting for tunnel URLs (15 s)…"
    sleep 15
    for ENV_CF in prod dev; do
        SVC="curveextract-tunnel-$ENV_CF"
        URL=$(sudo journalctl -u "$SVC" -n 80 --no-pager 2>/dev/null \
            | grep -oP 'https://[a-z0-9-]+\.trycloudflare\.com' | tail -1)
        if [[ -n "$URL" ]]; then
            echo ""
            success "$ENV_CF public URL: $URL"
            [[ "$ENV_CF" == "prod" ]] && \
                echo "  → Enter this in the BackendConfigBanner on GitHub Pages"
        else
            warn "Could not read $ENV_CF tunnel URL. Run: sudo journalctl -u $SVC -n 40"
        fi
    done
fi

# ── Summary ───────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║  Setup complete — GitHub Actions CI/CD is ready               ║${NC}"
echo -e "${BOLD}╠═══════════════════════════════════════════════════════════════╣${NC}"
echo -e "${BOLD}║  Service          Port   Branch        Data                   ║${NC}"
echo -e "${BOLD}║  curveextract-prod  8000  main          /var/lib/curveextract/prod ║${NC}"
echo -e "${BOLD}║  curveextract-dev   8001  development   /var/lib/curveextract/dev  ║${NC}"
echo -e "${BOLD}╠═══════════════════════════════════════════════════════════════╣${NC}"
echo -e "${BOLD}║  Deployment trigger                                            ║${NC}"
echo -e "${BOLD}║  Push to main        → deploy-backend-prod.yml runs on Pi    ║${NC}"
echo -e "${BOLD}║  Push to development → deploy-backend-dev.yml  runs on Pi    ║${NC}"
echo -e "${BOLD}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Useful commands:"
echo "  sudo systemctl status curveextract-prod"
echo "  sudo systemctl status curveextract-dev"
echo "  sudo journalctl -u curveextract-prod -f"
echo "  curl http://localhost:8000/health"
echo "  curl http://localhost:8001/health"
