#!/usr/bin/env python3
"""
CyberAgent Robot Bridge — the hardware half of the Magic Loop.

Runs next to your robot (the laptop it plugs into), exposes a WebSocket
endpoint for the CyberAgent web app, and translates the generic JSON
command protocol into real motor / LED / sound actions.

Browser → bridge protocol (plain JSON, one message per line):
    {"type": "motors", "payload": {"left": -1..1, "right": -1..1}}
    {"type": "led",    "payload": {"r": 0-255, "g": 0-255, "b": 0-255}}
    {"type": "sound",  "payload": {"frequency": Hz, "duration": ms}}
    {"type": "fire",   "payload": {}}
    {"type": "turret", "payload": {"angle": 0-180}}
    {"type": "stop",   "payload": {}}
    {"type": "heartbeat", "payload": {}}

Bridge → browser:
    {"type": "hello",     "payload": {"platform": ..., "name": ..., "port": ..., "remote_url": ...}}
    {"type": "telemetry", "payload": {...}, "t": <epoch ms>}
    {"type": "status",    "payload": {"platform": ..., "state": ...}}

Safety model:
    * If the WebSocket drops, the robot is stopped immediately (3×).
    * If no message arrives for FAILSAFE_S seconds, the robot is stopped.
    * Ctrl-C always stops the robot before exiting.

Phone remote: the bridge also serves a touch-remote page over HTTP on
--http-port (default ws_port + 1000). A phone on the same LAN opens
http://<bridge-ip>:<http-port>/ to drive the robot manually. No app.

Usage:
    python3 bridge/robot_bridge.py --platform cyberbrick    # port 8765
    python3 bridge/robot_bridge.py --platform robomaster    # port 8766
    python3 bridge/robot_bridge.py --platform dummy         # no hardware

Requires:  pip install websockets            (all platforms)
           pip install pyserial              (cyberbrick)
           pip install robomaster            (robomaster)

The hardware drivers are reused from the CyberClaw skill collection when
present (override with --drivers-dir or CYBERCLAW_DRIVERS_DIR).
"""

import argparse
import asyncio
import importlib.util
import json
import math
import os
import socket
import sys
import threading
import time

FAILSAFE_S = 2.0
MOVE_PERIOD_S = 0.45  # re-issue movement this often (short = responsive)

DEFAULT_PORT = {"cyberbrick": 8765, "robomaster": 8766, "dummy": 8765}
DRIVERS_DIRS = [
    os.environ.get("CYBERCLAW_DRIVERS_DIR", ""),
    os.path.expanduser(
        "~/.openclaw/workspace-cyberbrick/skills/CyberClaw"
    ),
]


def load_driver_module(pkg: str, name: str):
    """Load <drivers>/<pkg>/<name>.py by path, so we don't depend on installs."""
    for base in DRIVERS_DIRS:
        if not base:
            continue
        path = os.path.join(base, pkg, f"{name}.py")
        if os.path.exists(path):
            spec = importlib.util.spec_from_file_location(name, path)
            mod = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(mod)
            return mod
    raise FileNotFoundError(
        f"driver {pkg}/{name}.py not found. Set CYBERCLAW_DRIVERS_DIR "
        f"(searched: {[b for b in DRIVERS_DIRS if b]})"
    )


def clamp(v, lo, hi):
    return max(lo, min(hi, v))


# ─── Platform drivers ─────────────────────────────────────────────


class DummyRobot:
    name = "dummy"

    def connect(self):
        print("[dummy] virtual robot connected")

    def motors(self, left, right):
        pass

    def led(self, r, g, b):
        pass

    def sound(self, freq, ms):
        pass

    def stop(self):
        pass

    def telemetry(self):
        return {"battery": 0.9, "hello": "from dummy robot"}

    def close(self):
        pass


class CyberBrickRobot:
    """CyberBrick Mini T tank via the CyberClaw serial driver."""

    name = "cyberbrick"

    def __init__(self, port=None):
        mod = load_driver_module("cyberbrick_driver", "cyberbrick_driver")
        self.dev = mod.CyberBrickDriver(port=port)
        self.lock = threading.Lock()
        self.last_move_at = 0.0
        self.led_color = None

    def connect(self):
        self.dev.connect()
        print(f"[cyberbrick] connected on {getattr(self.dev, 'port', '?')}")

    def _move(self, kind, speed, duration):
        with self.lock:
            getattr(self.dev, kind)(int(abs(speed) * 100), duration)
            self.last_move_at = time.time()

    def motors(self, left, right):
        # Movement snippets on the ESP32 run for `duration` seconds; re-issue
        # at MOVE_PERIOD_S intervals while the character keeps moving.
        now = time.time()
        l, r = clamp(left, -1, 1), clamp(right, -1, 1)
        if abs(l) < 0.06 and abs(r) < 0.06:
            self.stop(honour_throttle=False)
            return
        if now - self.last_move_at < MOVE_PERIOD_S:
            return
        if abs(l - r) < 0.08:  # both tracks same → straight
            self._move("move_forward" if l >= 0 else "move_backward", l, MOVE_PERIOD_S * 2)
        elif l * r <= 0 or abs(abs(l) - abs(r)) > 0.5:  # counter/near-pivot spin
            speed = max(abs(l), abs(r))
            self._move("turn_left" if r > l else "turn_right", speed, MOVE_PERIOD_S * 2)
        else:  # differential arc
            speed = (abs(l) + abs(r)) / 2
            self._move("move_forward" if (l + r) >= 0 else "move_backward", speed, MOVE_PERIOD_S * 2)

    def led(self, r, g, b):
        pass  # Mini T has no RGB LED — emotion still shows in the app

    def sound(self, freq, ms):
        pass

    def fire(self):
        with self.lock:
            self.dev.fire()

    def turret(self, angle):
        with self.lock:
            self.dev.turret(int(clamp(angle, 0, 180)))

    def stop(self, honour_throttle=True):
        with self.lock:
            self.dev.stop()
            self.last_move_at = time.time()

    def telemetry(self):
        return {"battery": None, "platform": "cyberbrick"}

    def close(self):
        try:
            self.stop(honour_throttle=False)
        except Exception:
            pass


class RoboMasterRobot:
    """DJI RoboMaster EP/S1 via the CyberClaw SDK driver."""

    name = "robomaster"

    def __init__(self):
        mod = load_driver_module("robomaster_driver", "robomaster_driver")
        self.dev = mod.RoboMasterDriver()
        self.led_color = None

    def connect(self):
        self.dev.connect()
        try:
            self.dev.set_mode("free")
        except Exception:
            pass
        print("[robomaster] connected")

    def motors(self, left, right):
        l, r = clamp(left, -1, 1), clamp(right, -1, 1)
        vx = (l + r) / 2 * 0.7          # m/s
        wz = (r - l) * 1.0 * 60         # deg/s
        if abs(vx) < 0.02 and abs(wz) < 1:
            self.stop()
            return
        self.dev.speed(x=vx, z=wz)

    def led(self, r, g, b):
        self.dev.set_led(comp="all", r=int(r), g=int(g), b=int(b))

    def sound(self, freq, ms):
        try:
            self.dev.play_sound(0, times=1, timeout_s=0.3)
        except Exception:
            pass

    def fire(self):
        self.dev.fire(type="ir", count=1)

    def turret(self, angle):
        self.dev.move_gimbal_to(pitch=0, yaw=int(clamp(angle, -90, 90)))

    def stop(self):
        self.dev.speed(x=0.0, z=0.0)

    def telemetry(self):
        try:
            info = self.dev.get_system_info()
            bat = (info or {}).get("battery_domain", {}) if isinstance(info, dict) else {}
            return {"battery": bat.get("remaining_capacity", None)}
        except Exception:
            return {"battery": None}

    def close(self):
        try:
            self.stop()
            self.dev.disconnect()
        except Exception:
            pass



# ─── Phone touch remote (HTTP) ────────────────────────────────────

HELLO_INFO = {}  # filled in main(): {"ws_port", "remote_url"}


def lan_ip():
    """Best-effort LAN IP of this machine (no traffic actually sent)."""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        return s.getsockname()[0]
    except Exception:
        return "127.0.0.1"
    finally:
        s.close()


def start_remote_http(html_path, host, http_port, ws_port, robot_name):
    """Serve bridge/remote.html so a phone on the LAN becomes a remote."""
    from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

    try:
        with open(html_path, "r", encoding="utf-8") as f:
            html = f.read()
    except OSError:
        print(f"[bridge] remote page not found at {html_path} — HTTP remote disabled")
        return None

    page = (html
            .replace("__WS_PORT__", str(ws_port))
            .replace("__ROBOT_NAME__", robot_name))

    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            if self.path in ("/", "/remote", "/index.html"):
                body = page.encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Cache-Control", "no-store")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
            else:
                self.send_error(404)

        def log_message(self, fmt, *args):
            pass  # keep bridge console clean

    bind = "0.0.0.0" if host in ("0.0.0.0", "") else host
    srv = ThreadingHTTPServer((bind, http_port), Handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


# ─── Bridge server ────────────────────────────────────────────────


def make_robot(platform, args):
    if platform == "cyberbrick":
        return CyberBrickRobot(port=args.serial_port)
    if platform == "robomaster":
        return RoboMasterRobot()
    return DummyRobot()


def handle_command(robot, raw, max_speed=1.0):
    try:
        msg = json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        return False
    ctype = msg.get("type")
    p = msg.get("payload") or {}
    if ctype == "motors":
        cap = clamp(float(max_speed), 0.0, 1.0)
        left = clamp(float(p.get("left", 0)), -1.0, 1.0) * cap
        right = clamp(float(p.get("right", 0)), -1.0, 1.0) * cap
        robot.motors(left, right)
    elif ctype == "led":
        robot.led(int(p.get("r", 0)), int(p.get("g", 0)), int(p.get("b", 0)))
    elif ctype == "sound":
        robot.sound(float(p.get("frequency", 440)), float(p.get("duration", 200)))
    elif ctype == "fire":
        if hasattr(robot, "fire"):
            robot.fire()
    elif ctype == "turret":
        if hasattr(robot, "turret"):
            robot.turret(float(p.get("angle", 90)))
    elif ctype in ("stop", "heartbeat"):
        if ctype == "stop":
            robot.stop()
    else:
        return False  # unknown → ignored
    return True


def is_browser_role(ws):
    """The web app connects with ?role=browser; phone remotes do not."""
    try:
        return "role=browser" in (ws.request.path or "")
    except AttributeError:
        try:
            return "role=browser" in (ws.path or "")
        except AttributeError:
            return False


async def session(websockets_like, robot, path=None, remote_pin=None, max_speed=1.0):
    ws = websockets_like
    peer = getattr(getattr(ws, "remote_address", None), "__str__", lambda: "?")()
    print(f"[bridge] browser connected: {peer}")
    locked = remote_pin is not None and not is_browser_role(ws)
    last_rx = time.time()
    failsafe_fired = False
    try:
        await ws.send(json.dumps({
            "type": "status",
            "payload": {"platform": robot.name, "state": "ready"},
        }))
        await ws.send(json.dumps({
            "type": "hello",
            "payload": {
                "platform": robot.name,
                "name": robot.name,
                "port": HELLO_INFO.get("ws_port"),
                "remote_url": HELLO_INFO.get("remote_url"),
                "max_speed": HELLO_INFO.get("max_speed", 1.0),
                "remote_lock": HELLO_INFO.get("remote_lock", False),
            },
        }))
        if locked:
            await ws.send(json.dumps({"type": "locked", "payload": {}}))
        async for raw in ws:
            last_rx = time.time()
            failsafe_fired = False
            if locked:
                try:
                    m = json.loads(raw)
                except (json.JSONDecodeError, TypeError):
                    continue
                if m.get("type") == "unlock" and str((m.get("payload") or {}).get("pin")) == str(remote_pin):
                    locked = False
                    await ws.send(json.dumps({"type": "unlocked", "payload": {}}))
                    print("[bridge] remote unlocked")
                elif m.get("type") == "stop":
                    await asyncio.to_thread(robot.stop)
                continue
            handled = await asyncio.to_thread(handle_command, robot, raw, max_speed)
            if not handled:
                pass
        # normal close
    finally:
        print("[bridge] browser disconnected → stopping robot")
        for _ in range(3):
            try:
                await asyncio.to_thread(robot.stop)
            except Exception as e:
                print(f"[bridge] stop failed: {e}")
            time.sleep(0.05)


async def telemetry_loop(ws, robot):
    while True:
        await asyncio.sleep(2)
        try:
            tel = await asyncio.to_thread(robot.telemetry)
            await ws.send(json.dumps({"type": "telemetry", "payload": tel, "t": int(time.time() * 1000)}))
        except Exception:
            return


async def failsafe_loop(robot, state):
    while True:
        await asyncio.sleep(0.5)
        if state["last_rx"] and time.time() - state["last_rx"] > FAILSAFE_S:
            try:
                await asyncio.to_thread(robot.stop)
            except Exception:
                pass


async def main():
    try:
        sys.stdout.reconfigure(line_buffering=True)
    except Exception:
        pass
    ap = argparse.ArgumentParser(description="CyberAgent robot bridge")
    ap.add_argument("--platform", choices=["cyberbrick", "robomaster", "dummy"],
                    default="cyberbrick")
    ap.add_argument("--port", type=int, default=None)
    ap.add_argument("--host", default="127.0.0.1",
                    help="use LAN IP or 0.0.0.0 to reach the site from another device")
    ap.add_argument("--serial-port", default=None, help="cyberbrick serial device")
    ap.add_argument("--max-speed", type=float, default=1.0,
                    help="hard cap 0..1 applied to every motors command")
    ap.add_argument("--remote-pin", default=None,
                    help="require this PIN from phone remotes (child lock); "
                         "web app is exempt via ?role=browser")
    ap.add_argument("--http-port", type=int, default=None,
                    help="phone touch-remote HTTP port (default ws_port + 1000)")
    ap.add_argument("--no-remote", action="store_true", help="disable the phone remote page")
    args = ap.parse_args()

    port = args.port or DEFAULT_PORT[args.platform]

    try:
        import websockets
    except ImportError:
        sys.exit("pip install websockets")

    robot = make_robot(args.platform, args)
    try:
        robot.connect()
    except Exception as e:
        sys.exit(f"[bridge] robot connect failed: {e}")

    global HELLO_INFO
    state = {"last_rx": 0.0}
    http_port = args.http_port or (port + 1000)
    remote_srv = None
    if not args.no_remote:
        html_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "remote.html")
        try:
            remote_srv = start_remote_http(html_path, args.host, http_port, port, robot.name)
        except OSError as e:
            print(f"[bridge] phone remote disabled: {e}")
        if remote_srv:
            HELLO_INFO = {
                "ws_port": port,
                "remote_url": f"http://{lan_ip()}:{http_port}/remote",
            }

    max_speed = clamp(args.max_speed, 0.0, 1.0)
    HELLO_INFO.setdefault("max_speed", max_speed)
    HELLO_INFO.setdefault("remote_lock", args.remote_pin is not None)
    print(f"[bridge] max_speed={max_speed}" + (f" remote_pin={'*' * 4}" if args.remote_pin else ""))

    async def handler(ws, *_args):
        state["last_rx"] = time.time()
        tel_task = asyncio.create_task(telemetry_loop(ws, robot))
        try:
            await session(ws, robot, remote_pin=args.remote_pin, max_speed=max_speed)
        finally:
            state["last_rx"] = 0.0
            tel_task.cancel()

    try:
        async with websockets.serve(handler, args.host, port):
            print(f"[bridge] {robot.name} listening on ws://{args.host}:{port}")
            print("[bridge] open https://unbug.github.io/cyber-agent/connect in the browser")
            if remote_srv:
                print(f"[bridge] 📱 phone remote: {HELLO_INFO.get('remote_url')}")
            fs_task = asyncio.create_task(failsafe_loop(robot, state))
            try:
                await asyncio.Future()  # serve until Ctrl-C
            finally:
                fs_task.cancel()
    finally:
        if remote_srv:
            remote_srv.shutdown()
        robot.close()
        print("[bridge] robot closed")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n[bridge] interrupted — stopping robot")
