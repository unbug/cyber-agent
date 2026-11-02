#!/usr/bin/env bash
# CyberAgent bridge self-test — run this when "the robot doesn't show up".
# Everything is read-only; it tells you exactly which link in the chain breaks.
set -u

PASS=0; FAIL=0
ok()   { echo "  ✓ $1"; PASS=$((PASS+1)); }
bad()  { echo "  ✗ $1"; FAIL=$((FAIL+1)); }

echo "== CyberAgent bridge self-test =="

echo "[1/5] python"
command -v python3 >/dev/null && ok "python3: $(python3 -V 2>&1)" || bad "python3 missing"

echo "[2/5] dependencies"
# look in system python and the usual bridge venvs
PY_OK=""
for PY in python3 "$HOME/venvs/cyberagent/bin/python" "$HOME/venvs/cyber/bin/python"; do
  command -v "$PY" >/dev/null 2>&1 || [ -x "$PY" ] || continue
  if "$PY" -c "import websockets, serial" 2>/dev/null; then PY_OK="$PY"; break; fi
done
if [ -n "$PY_OK" ]; then ok "websockets+pyserial available via $PY_OK"
else bad "websockets/pyserial missing everywhere — run bridge/install.sh"
fi

echo "[3/5] serial device"
DEV="$(ls /dev/serial/by-id/* 2>/dev/null | head -1)"
[ -z "$DEV" ] && DEV="$(ls /dev/ttyUSB* /dev/ttyACM* 2>/dev/null | head -1)"
if [ -n "$DEV" ]; then
  ok "found: $DEV"
  if [ -r "$DEV" ] && [ -w "$DEV" ]; then
    ok "read/write permission OK"
  else
    bad "no permission on $DEV — run: sudo usermod -aG dialout \$USER, then log out & in"
  fi
else
  bad "no USB-serial device found. Try: (1) a DATA cable (charge-only cables are common!) (2) another USB port (3) dmesg | tail after re-plugging"
fi

echo "[4/5] network"
if command -v curl >/dev/null; then
  code=$(curl -s -o /dev/null -w "%{http_code}" https://unbug.github.io/cyber-agent/ || echo 000)
  if [ "$code" != "200" ] && [ -r /etc/ssl/certs/ca-certificates.crt ]; then
    code=$(SSL_CERT_FILE=/etc/ssl/certs/ca-certificates.crt curl -s -o /dev/null -w "%{http_code}" https://unbug.github.io/cyber-agent/ || echo 000)
    [ "$code" = "200" ] && ok "site reachable (needed SSL_CERT_FILE — your system trust store config is broken)"
  fi
  [ "$code" = "200" ] && ok "site reachable (200)" || bad "site check failed (code $code)"
fi

echo "[5/5] bridge script"
SELF_DIR="$(cd "$(dirname "$0")" && pwd)"
python3 -m py_compile "$SELF_DIR/robot_bridge.py" 2>/dev/null && ok "robot_bridge.py compiles" || bad "robot_bridge.py syntax error"

echo
echo "result: $PASS passed, $FAIL failed"
[ "$FAIL" = "0" ] && echo "🚀 you're ready: python3 $SELF_DIR/robot_bridge.py --platform cyberbrick --host 0.0.0.0"
exit "$FAIL"
