#!/usr/bin/env bash
# CyberAgent bridge — one-command install (M6 zero-install bridge).
#
#   curl -fsSL https://raw.githubusercontent.com/unbug/cyber-agent/main/bridge/install.sh | bash
#
# Creates ~/venvs/cyberagent with the bridge's dependencies and prints the
# exact command to start your robot. Safe to re-run (idempotent).
set -euo pipefail

VENV="${CYBERAGENT_VENV:-$HOME/venvs/cyberagent}"
REPO_URL="https://github.com/unbug/cyber-agent"
REPO_DIR="${CYBERAGENT_HOME:-$HOME/cyber-agent}"

echo "▸ CyberAgent bridge installer"

# 1) python3
if ! command -v python3 >/dev/null 2>&1; then
  echo "✗ python3 not found. Install Python 3.9+ first:"
  echo "    Debian/Ubuntu: sudo apt install python3 python3-venv"
  echo "    macOS:         brew install python"
  exit 1
fi

# 2) venv + deps
if [ ! -x "$VENV/bin/python" ]; then
  echo "▸ creating venv at $VENV"
  python3 -m venv "$VENV"
fi
echo "▸ installing dependencies"
"$VENV/bin/pip" install --quiet --upgrade pip
"$VENV/bin/pip" install --quiet websockets pyserial
# optional niceties (mDNS discovery + RoboMaster SDK); failures are non-fatal
"$VENV/bin/pip" install --quiet zeroconf 2>/dev/null || true

# 3) repo (for bridge/robot_bridge.py + drivers)
if [ -d "$REPO_DIR/.git" ]; then
  echo "▸ updating repo at $REPO_DIR"
  git -C "$REPO_DIR" pull --ff-only --quiet || true
elif [ ! -f "$REPO_DIR/bridge/robot_bridge.py" ]; then
  echo "▸ cloning repo to $REPO_DIR"
  git clone --depth 1 "$REPO_URL" "$REPO_DIR"
fi

# 4) serial permission hint
if command -v getent >/dev/null 2>&1 && ! id -nG | grep -qw dialout; then
  echo "⚠ you are not in the 'dialout' group — one-time fix needed:"
  echo "    sudo usermod -aG dialout \$USER   # then log out and back in"
fi

BRIDGE="$REPO_DIR/bridge/robot_bridge.py"
echo
echo "✓ installed. Start your robot with:"
echo
echo "    $VENV/bin/python $BRIDGE --platform cyberbrick --host 0.0.0.0"
echo
echo "  (serial port is auto-detected; add --platform robomaster for DJI EP/S1)"
echo "  Then open https://unbug.github.io/cyber-agent/connect and hit Scan."
