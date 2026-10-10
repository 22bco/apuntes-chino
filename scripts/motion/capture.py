#!/usr/bin/env python3
"""Render a motion presentation (render(t) engine) to MP4, frame by frame.

Serves chino/ with python3 -m http.server on a free port, opens headless
Chromium (GPU flags) at 1920x1080, loads <page>?capture=1, waits for
window.ready, and for each frame f calls window.render(f/fps), takes a PNG
screenshot and pipes it to ffmpeg (libx264, crf 18, yuv420p, preset slow).
Then muxes audio.wav into the final MP4.

Usage (from anywhere):
  python3 scripts/motion/capture.py                      # full render, 60 fps
  python3 scripts/motion/capture.py --fps 60
  python3 scripts/motion/capture.py --start 40 --end 50  # partial render
  python3 scripts/motion/capture.py --bench 60           # time 60 frames, no output
"""
import argparse
import base64
import json
import os
import socket
import subprocess
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
SITE = ROOT / "chino"


def free_port():
    s = socket.socket()
    s.bind(("127.0.0.1", 0))
    p = s.getsockname()[1]
    s.close()
    return p


def wait_port(port, timeout=10):
    t0 = time.time()
    while time.time() - t0 < timeout:
        try:
            socket.create_connection(("127.0.0.1", port), 0.3).close()
            return
        except OSError:
            time.sleep(0.1)
    raise RuntimeError(f"http.server did not start on port {port}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--piece", default="i1-clase04", help="folder in chino/presentaciones/")
    ap.add_argument("--fps", type=float, default=60,
                    help="60 = timeline fps; measured ~7.9 f/s capture on M2 (~19 min full render)")
    ap.add_argument("--start", type=float, default=0.0, help="start time (s)")
    ap.add_argument("--end", type=float, default=None, help="end time (s), default DURATION")
    ap.add_argument("--out", default=None, help="final MP4 path")
    ap.add_argument("--video", default=None, help="intermediate silent MP4 path")
    ap.add_argument("--no-mux", action="store_true")
    ap.add_argument("--bench", type=int, default=0, help="only time N frames")
    args = ap.parse_args()

    piece = SITE / "presentaciones" / args.piece
    video = Path(args.video) if args.video else piece / "video.mp4"
    out = Path(args.out) if args.out else piece / f"{args.piece.split('-', 1)[-1]}-motion.mp4"
    audio = piece / "audio.wav"

    port = free_port()
    srv = subprocess.Popen(
        [sys.executable, "-m", "http.server", str(port), "--bind", "127.0.0.1", "--directory", str(SITE)],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    ff = None
    try:
        wait_port(port)
        with sync_playwright() as pw:
            browser = pw.chromium.launch(headless=True, args=[
                "--use-angle=metal", "--ignore-gpu-blocklist", "--enable-gpu",
                "--enable-gpu-rasterization", "--force-color-profile=srgb",
                "--hide-scrollbars"])
            page = browser.new_page(viewport={"width": 1920, "height": 1080}, device_scale_factor=1)
            errors = []
            page.on("pageerror", lambda e: errors.append(str(e)))
            page.on("console", lambda m: m.type == "error" and errors.append(m.text))
            page.goto(f"http://127.0.0.1:{port}/presentaciones/{args.piece}/index.html?capture=1")
            page.wait_for_function("window.ready !== undefined", timeout=30000)
            page.evaluate("() => window.ready")
            page.evaluate("() => document.fonts.ready")
            dur = page.evaluate("() => window.DURATION")
            end = min(args.end if args.end is not None else dur, dur)
            fps = args.fps
            f0 = int(round(args.start * fps))
            f1 = int(round(end * fps))  # exclusive
            n = f1 - f0
            if args.bench:
                n = min(n, args.bench)
                f1 = f0 + n
            print(f"duration={dur}s fps={fps} frames {f0}..{f1 - 1} ({n})", flush=True)

            clip = {"x": 0, "y": 0, "width": 1920, "height": 1080}

            # Page.captureScreenshot via CDP with optimizeForSpeed: lossless PNG
            # (faster zlib level) ~5x faster than page.screenshot(type="png").
            cdp = page.context.new_cdp_session(page)
            shot = {"format": "png", "optimizeForSpeed": True, "clip": {**clip, "scale": 1}}

            def frame_png(f):
                page.evaluate("t => { window.render(t); return new Promise(r => requestAnimationFrame(() => r())); }", f / fps)
                return base64.b64decode(cdp.send("Page.captureScreenshot", shot)["data"])

            if not args.bench:
                video.parent.mkdir(parents=True, exist_ok=True)
                ff = subprocess.Popen([
                    "ffmpeg", "-y", "-loglevel", "error",
                    "-f", "image2pipe", "-framerate", str(fps), "-c:v", "png", "-i", "-",
                    "-c:v", "libx264", "-crf", "18", "-preset", "slow", "-pix_fmt", "yuv420p",
                    "-r", str(fps), "-movflags", "+faststart", str(video)], stdin=subprocess.PIPE)

            t0 = time.time()
            for i, f in enumerate(range(f0, f1)):
                png = frame_png(f)
                if ff:
                    ff.stdin.write(png)
                if (i + 1) % 150 == 0 or i + 1 == n:
                    el = time.time() - t0
                    rate = (i + 1) / el
                    print(f"  {i + 1}/{n} frames  {rate:.1f} f/s  eta {(n - i - 1) / rate:.0f}s", flush=True)
            el = time.time() - t0
            print(f"captured {n} frames in {el:.1f}s ({n / el:.2f} f/s)", flush=True)
            if errors:
                print("page errors:", *errors[:10], sep="\n  ", flush=True)
            browser.close()
        if args.bench:
            return
        ff.stdin.close()
        if ff.wait() != 0:
            raise RuntimeError("ffmpeg encode failed")
        ff = None
        print(f"video: {video}", flush=True)

        if not args.no_mux:
            cmd = ["ffmpeg", "-y", "-loglevel", "error", "-i", str(video)]
            if args.start > 0:
                cmd += ["-ss", str(args.start)]
            cmd += ["-i", str(audio), "-map", "0:v", "-map", "1:a", "-c:v", "copy",
                    "-c:a", "aac", "-b:a", "256k", "-shortest", "-movflags", "+faststart", str(out)]
            subprocess.run(cmd, check=True)
            print(f"final: {out}", flush=True)
    finally:
        if ff:
            ff.stdin.close()
            ff.wait()
        srv.terminate()
        srv.wait()


if __name__ == "__main__":
    main()
