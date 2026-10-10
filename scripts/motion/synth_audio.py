#!/usr/bin/env python3
"""Banda sonora sintetizada para las presentaciones motion (apuntes de chino).

Lee timeline.json (la MISMA tabla de eventos que usa la imagen) y escribe audio.wav
(44.1 kHz, estéreo, 16-bit) de exactamente round(duration * 44100) muestras.

Cada sonido nace de un evento del timeline:
  kick      -> bombo (seno con barrido de tono analítico) + campanita si target = "hz:…"
  snare     -> clap suave (ráfagas de ruido filtrado + cuerpo)
  hat       -> hat (ruido pasaaltos) + clic de tecleo si target = "py:…"
  click     -> clic de tecleo (pinyin)
  bass      -> bajo: sierra aditiva filtrada, raíz tomada del target «raíz X»
  pad_chord -> pad: sierras desafinadas + pasabajos, acorde tomado del target
  whoosh    -> ruido con filtro pasabanda que barre + paneo lateral
  riser     -> ruido + tono que suben hasta el siguiente impact/sub_drop
  impact    -> sub + ruido grave; campanita si target = "hz:…"
  sub_drop  -> seno grave con barrido descendente
  chime     -> campanita pentatónica (la menor pentatónica: A C D E G)

Todo es determinista (ruido con semilla por evento). Sin scipy: los filtros de
tonos son aditivos (respuesta del filtro evaluada por armónico) y los de ruido
se aplican en el dominio de la frecuencia por bloques (overlap-add).

Uso:  python3 scripts/motion/synth_audio.py [carpeta_con_timeline]
"""
import json
import re
import subprocess
import sys
import wave
import zlib
from pathlib import Path

import numpy as np

SR = 44100
ROOT = Path(__file__).resolve().parents[2]
DEFAULT_DIR = ROOT / "chino" / "presentaciones" / "i1-clase04"


# ─────────────────────────── utilidades ───────────────────────────

def seed_of(*parts):
    """Semilla estable (crc32) a partir de cualquier texto/números."""
    return zlib.crc32("|".join(str(p) for p in parts).encode("utf-8"))


def rng_for(ev, salt=""):
    return np.random.default_rng(seed_of(ev["t"], ev["type"], ev.get("target", ""), salt))


def mtof(m):
    return 440.0 * 2.0 ** ((m - 69) / 12.0)


def pan_gains(p):
    """Paneo equal-power, p en [-1, 1]."""
    a = (p + 1) * np.pi / 4
    return np.cos(a), np.sin(a)


class Bus:
    """Bus estéreo al que se suman fragmentos en posiciones de tiempo."""

    def __init__(self, n):
        self.x = np.zeros((2, n))
        self.n = n

    def add(self, t, sig, pan=0.0, gain=1.0):
        i0 = int(round(t * SR))
        sig = np.asarray(sig, dtype=float)
        if sig.ndim == 1:
            gl, gr = pan_gains(pan)
            sig = np.vstack([sig * gl, sig * gr])
        if i0 < 0:
            sig = sig[:, -i0:]
            i0 = 0
        m = min(sig.shape[1], self.n - i0)
        if m > 0:
            self.x[:, i0:i0 + m] += gain * sig[:, :m]


def lp2_mag(f, fc, q=0.707):
    """|H| de un pasabajos de 2 polos (analógico) evaluado en f."""
    r = f / fc
    return 1.0 / np.sqrt((1 - r * r) ** 2 + (r / q) ** 2)


def spectral_filter(x, gain_fn, n=2048):
    """Filtro variante en el tiempo por overlap-add.

    gain_fn(freqs, tc) -> ganancia por bin, con tc = tiempo (s) del centro del bloque
    relativo al inicio de x.  Ventana Hann periódica con salto n/2 (suma = 1),
    FFT con cero-relleno x2 para limitar el aliasing circular.
    """
    hop = n // 2
    win = 0.5 - 0.5 * np.cos(2 * np.pi * np.arange(n) / n)
    pad = np.concatenate([np.zeros(hop), x, np.zeros(n)])
    out = np.zeros(len(pad) + n)
    freqs = np.fft.rfftfreq(2 * n, 1 / SR)
    for start in range(0, len(pad) - n, hop):
        seg = pad[start:start + n] * win
        spec = np.fft.rfft(seg, 2 * n)
        tc = (start + n / 2 - hop) / SR
        out[start:start + 2 * n] += np.fft.irfft(spec * gain_fn(freqs, tc), 2 * n)
    return out[hop:hop + len(x)]


def bandpass_gain(fc, q):
    def g(f, tc):
        c = fc(tc) if callable(fc) else fc
        r = np.maximum(f, 1.0) / c
        return 1.0 / np.sqrt(1 + (q * (r - 1 / r)) ** 2)
    return g


def highpass_gain(fc, order=2):
    def g(f, tc):
        r = np.maximum(f, 1.0) / fc
        return r ** order / np.sqrt(1 + r ** (2 * order))
    return g


def lowpass_gain(fc, order=2):
    def g(f, tc):
        c = fc(tc) if callable(fc) else fc
        r = f / c
        return 1.0 / np.sqrt(1 + r ** (2 * order))
    return g


def env_adsr(n, a, d, s, r, hold=None):
    """Envolvente lineal-exponencial suave; tiempos en segundos."""
    t = np.arange(n) / SR
    hold = (n / SR - r) if hold is None else hold
    e = np.where(t < a, t / max(a, 1e-4), s + (1 - s) * np.exp(-(t - a) / max(d, 1e-4)))
    rel = np.clip((t - hold) / max(r, 1e-4), 0, 1)
    return e * (1 - rel) ** 2


# ─────────────────────────── armonía ───────────────────────────

# Voicings de pad (MIDI), en la zona media cálida (F3–B4).
CHORDS = {
    "Am9":   [57, 60, 64, 67, 71],
    "Fmaj7": [53, 57, 60, 64, 67],
    "Cmaj7": [55, 60, 64, 67, 71],
    "G6":    [55, 59, 62, 64, 67],
    "Am":    [57, 60, 64, 69],
    "F":     [53, 57, 60, 65],
    "C":     [55, 60, 64, 67],
    "E7":    [56, 59, 62, 64, 68],
    "Dm9":   [53, 57, 60, 62, 64],
    "Gsus4": [55, 60, 62, 67],
    "Esus4": [52, 57, 59, 64, 71],
}
BASS_ROOT = {"A": 33, "F": 29, "C": 36, "G": 31, "E": 28, "D": 38, "B": 35}
PENTA = [0, 3, 5, 7, 10]  # la menor pentatónica relativa a A (A C D E G)


def chord_from_target(target):
    m = re.search(r"·\s*([A-G][^\s·]*)", target)
    if m and m.group(1) in CHORDS:
        return m.group(1)
    for tok in re.findall(r"[A-G][A-Za-z0-9]*", target):
        if tok in CHORDS:
            return tok
    return "Am9"


def root_from_target(target):
    m = re.search(r"raíz\s+([A-G])", target)
    return BASS_ROOT[m.group(1)] if m else 33


def penta_note(text, octave_base=81):
    """Nota de la pentatónica elegida por el contenido (hanzi) del evento."""
    h = sum(ord(c) for c in text)
    deg = h % len(PENTA)
    octv = (h // len(PENTA)) % 2
    return octave_base + PENTA[deg] + 12 * octv


def inner_text(target):
    m = re.search(r"\(([^)]*)\)", target)
    return m.group(1) if m else target


# ─────────────────────────── instrumentos ───────────────────────────

def kick(intensity):
    dur = 0.55
    t = np.arange(int(dur * SR)) / SR
    f1, f0, tau = 150.0, 46.0, 0.045
    phase = 2 * np.pi * (f0 * t + (f1 - f0) * tau * (1 - np.exp(-t / tau)))
    amp = np.exp(-t / 0.20) * np.clip(t / 0.002, 0, 1)
    body = np.sin(phase) * amp
    click = np.sin(2 * np.pi * 1800 * t) * np.exp(-t / 0.004) * 0.12
    return (body + click) * intensity


def clap(ev):
    rng = rng_for(ev)
    dur = 0.45
    n = int(dur * SR)
    t = np.arange(n) / SR
    noise = rng.standard_normal(n)
    env = np.zeros(n)
    for k, off in enumerate((0.0, 0.009, 0.019)):
        tt = t - off
        env += np.where(tt >= 0, np.exp(-np.maximum(tt, 0) / 0.006), 0) * (0.7 + 0.15 * k)
    env += np.where(t >= 0.028, np.exp(-np.maximum(t - 0.028, 0) / 0.11), 0) * 0.55
    sig = spectral_filter(noise * env, bandpass_gain(1250.0, 1.1))
    body = np.sin(2 * np.pi * 190 * t) * np.exp(-t / 0.05) * 0.25
    return (sig * 0.8 + body) * ev["intensity"]


def hat(ev, open_=False):
    rng = rng_for(ev)
    dur = 0.25 if open_ else 0.09
    n = int(dur * SR)
    t = np.arange(n) / SR
    noise = rng.standard_normal(n)
    # un poco de brillo metálico (parciales inarmónicos) muy bajo
    metal = sum(np.sign(np.sin(2 * np.pi * f * t)) for f in (5200, 7310, 8430)) * 0.08
    env = np.exp(-t / (0.08 if open_ else 0.022)) * np.clip(t / 0.0008, 0, 1)
    sig = spectral_filter((noise + metal) * env, highpass_gain(7000.0, 3))
    sig = spectral_filter(sig, lowpass_gain(13500.0, 2))  # sin aspereza
    return sig * ev["intensity"]


def key_click(ev, level=1.0):
    """Clic de tecleo: transitorio + pequeña resonancia de tecla (tono según el texto)."""
    rng = rng_for(ev, "click")
    n = int(0.06 * SR)
    t = np.arange(n) / SR
    txt = inner_text(ev["target"]) if "«" not in ev["target"] else ev["target"].split("«")[-1]
    fres = 2600 + (seed_of(txt) % 9) * 180.0
    tick = rng.standard_normal(n) * np.exp(-t / 0.0015)
    tick = spectral_filter(tick, bandpass_gain(fres * 1.4, 1.6), n=512)
    body = np.sin(2 * np.pi * fres * t) * np.exp(-t / 0.012) * 0.35
    thock = np.sin(2 * np.pi * 420 * t) * np.exp(-t / 0.008) * 0.25
    return (tick + body + thock) * ev["intensity"] * level


def bell(midi, intensity, dur=2.6):
    """Campanita: parciales inarmónicos tipo campana de metal con decaimientos propios."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = mtof(midi)
    partials = [(1.0, 1.0, 1.4), (2.0, 0.45, 0.9), (2.76, 0.3, 0.6),
                (5.40, 0.12, 0.28), (8.93, 0.05, 0.14)]
    sig = np.zeros(n)
    for ratio, amp, dec in partials:
        if f * ratio < 16000:
            sig += amp * np.sin(2 * np.pi * f * ratio * t) * np.exp(-t / dec)
    att = np.clip(t / 0.002, 0, 1)
    return sig * att * intensity * 0.5


def saw_additive(f0, fc_t, n, rng, q=0.8, max_h=60):
    """Sierra de banda limitada filtrada por un pasabajos variable fc_t (array)."""
    t = np.arange(n) / SR
    out = np.zeros(n)
    fc_max = float(np.max(fc_t))
    for k in range(1, max_h + 1):
        fk = f0 * k
        if fk > min(fc_max * 3.5, 15000):
            break
        ph = rng.uniform(0, 2 * np.pi)
        out += (1.0 / k) * lp2_mag(fk, fc_t, q) * np.sin(2 * np.pi * fk * t + ph)
    return out


def pad(ev, dur):
    chord = CHORDS[chord_from_target(ev["target"])]
    rng = rng_for(ev)
    rel = 0.6
    n = int((dur + rel) * SR)
    t = np.arange(n) / SR
    inten = ev["intensity"]
    base_fc = 650 + 1500 * inten                      # drops (0.5) algo más brillantes
    fc = base_fc * (0.55 + 0.45 * (1 - np.exp(-t / 0.6)))  # el filtro se abre al entrar
    env = env_adsr(n, a=0.35, d=1.2, s=0.85, r=rel, hold=dur)
    L = np.zeros(n)
    R = np.zeros(n)
    for m in chord:
        for det, p in ((-9, -0.7), (0, 0.0), (8, 0.7)):
            f0 = mtof(m) * 2 ** (det / 1200)
            v = saw_additive(f0, fc, n, rng)
            gl, gr = pan_gains(p * 0.8)
            L += v * gl
            R += v * gr
    s = np.vstack([L, R]) * env / (len(chord) * 3)
    return s * inten


def bass(ev, dur, kicks_in):
    root = root_from_target(ev["target"])
    rng = rng_for(ev)
    rel = 0.08
    n = int((dur + rel) * SR)
    t = np.arange(n) / SR
    f0 = mtof(root)
    # el filtro se reabre (suave) con cada bombo dentro de la nota
    fc = np.full(n, 180.0)
    for tk, ik in kicks_in:
        dt = t - tk
        fc += np.where(dt >= 0, 520 * ik * np.exp(-np.maximum(dt, 0) / 0.16), 0)
    saw = saw_additive(f0, fc, n, rng, q=0.9, max_h=40)
    sub = np.sin(2 * np.pi * f0 * t) * 0.6
    env = env_adsr(n, a=0.006, d=0.5, s=0.8, r=rel, hold=dur)
    sig = np.tanh(1.3 * (saw * 0.9 + sub)) * env
    return sig * ev["intensity"]


def whoosh(ev):
    rng = rng_for(ev)
    pre, post = 0.38, 0.45                           # el evento es la llegada del barrido
    n = int((pre + post) * SR)
    t = np.arange(n) / SR - pre
    noise = rng.standard_normal((2, n))
    env = np.where(t < 0, np.exp(-(t / 0.2) ** 2), np.exp(-(t / 0.24) ** 2))
    fc = lambda tc: 350 + 2600 * np.exp(-(((tc - pre) / 0.22) ** 2))  # sube y baja
    L = spectral_filter(noise[0] * env, bandpass_gain(fc, 2.2), n=1024)
    R = spectral_filter(noise[1] * env, bandpass_gain(fc, 2.2), n=1024)
    p = np.clip(t / 0.4, -1, 1) * 0.75                 # barrido lateral izquierda → derecha
    gl, gr = pan_gains(p)
    return np.vstack([L * gl, R * gr]) * ev["intensity"] * 0.7, -pre


def riser(ev, dur):
    rng = rng_for(ev)
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = t / dur
    noise = rng.standard_normal((2, n))
    fc = lambda tc: 400 * (6000 / 400) ** np.clip(tc / dur, 0, 1)
    L = spectral_filter(noise[0], bandpass_gain(fc, 1.8))
    R = spectral_filter(noise[1], bandpass_gain(fc, 1.8))
    env = x ** 2.2 * (1 - np.clip((x - 0.985) / 0.015, 0, 1))
    # tono que sube una octava (A3 → A4), fase analítica de un barrido exponencial
    f_a, f_b = 220.0, 440.0
    k = np.log(f_b / f_a) / dur
    phase = 2 * np.pi * f_a * (np.exp(k * t) - 1) / k
    tone = (np.sin(phase) + 0.3 * np.sin(2 * phase)) * 0.25
    s = np.vstack([L + tone, R + tone]) * env
    return s * ev["intensity"] * 0.55


def impact(ev):
    rng = rng_for(ev)
    soft = ev["scene"] == "cierre"
    dur = 1.8
    n = int(dur * SR)
    t = np.arange(n) / SR
    f1, f0, tau = 95.0, 38.0, 0.12
    phase = 2 * np.pi * (f0 * t + (f1 - f0) * tau * (1 - np.exp(-t / tau)))
    sub = np.sin(phase) * np.exp(-t / 0.55) * np.clip(t / 0.003, 0, 1)
    noise = rng.standard_normal(n) * np.exp(-t / 0.18)
    body = spectral_filter(noise, lowpass_gain(lambda tc: 300 + 2200 * np.exp(-tc / 0.08), 2))
    mix = sub * 0.9 + body * (0.15 if soft else 0.35)
    return mix * ev["intensity"] * (0.6 if soft else 1.0)


def sub_drop(ev):
    dur = 1.6
    t = np.arange(int(dur * SR)) / SR
    f1, f0, tau = 90.0, 30.0, 0.35
    phase = 2 * np.pi * (f0 * t + (f1 - f0) * tau * (1 - np.exp(-t / tau)))
    env = np.exp(-t / 0.6) * np.clip(t / 0.005, 0, 1)
    return np.sin(phase) * env * ev["intensity"]


# ─────────────────────────── efectos ───────────────────────────

def sidechain_curve(n, kicks, depth=0.55):
    """Ganancia que se hunde con cada bombo y se recupera exponencialmente."""
    g = np.ones(n)
    rec = 0.17
    span = int(0.6 * SR)
    for tk, ik in kicks:
        i0 = int(round(tk * SR))
        if i0 >= n:
            continue
        m = min(span, n - i0)
        dt = np.arange(m) / SR
        att = np.clip(dt / 0.004, 0, 1)
        duck = 1 - depth * ik * att * np.exp(-dt / rec)
        g[i0:i0 + m] = np.minimum(g[i0:i0 + m], duck)
    return g


def synth_ir(seconds=2.4, seed=1234):
    """IR estéreo sintética: pre-delay + ruido con decaimiento, más oscuro en la cola."""
    rng = np.random.default_rng(seed)
    n = int(seconds * SR)
    t = np.arange(n) / SR
    pre = int(0.022 * SR)
    ir = np.zeros((2, n))
    for ch in range(2):
        noise = rng.standard_normal(n)
        spec = np.fft.rfft(noise)
        f = np.fft.rfftfreq(n, 1 / SR)
        low = np.fft.irfft(spec / np.sqrt(1 + (f / 2500) ** 4), n)
        high = np.fft.irfft(spec * (f / 2500) ** 2 / np.sqrt(1 + (f / 2500) ** 4), n)
        tail = low * np.exp(-6.9 * t / 2.1) + high * np.exp(-6.9 * t / 0.7) * 0.5
        tail *= np.clip(t / 0.03, 0, 1)
        ir[ch, pre:] = tail[: n - pre]
        # primeras reflexiones
        for k in range(6):
            d = pre + int(rng.uniform(0.004, 0.05) * SR)
            ir[ch, d] += rng.uniform(0.2, 0.45) * (-1) ** k
    ir /= np.sqrt(np.sum(ir ** 2, axis=1, keepdims=True))
    return ir


def convolve_fft(x, ir):
    n = x.shape[1] + ir.shape[1] - 1
    nfft = 1 << (n - 1).bit_length()
    out = np.zeros((2, x.shape[1]))
    for ch in range(2):
        y = np.fft.irfft(np.fft.rfft(x[ch], nfft) * np.fft.rfft(ir[ch], nfft), nfft)
        out[ch] = y[: x.shape[1]]
    return out


def soft_limit(x, knee=0.72):
    """Limitador suave: lineal hasta `knee`, saturación tanh por encima (continua y C1)."""
    a = np.abs(x)
    over = a > knee
    y = x.copy()
    head = 1.0 - knee
    y[over] = np.sign(x[over]) * (knee + head * np.tanh((a[over] - knee) / head))
    return y


def one_pole_hp_dc(x):
    """Quita DC restando una media móvil larga (0,5 s) calculada con cumsum."""
    w = int(0.5 * SR)
    out = np.empty_like(x)
    for ch in range(x.shape[0]):
        c = np.cumsum(np.concatenate([np.zeros(w), x[ch]]))
        mean = (c[w:] - c[:-w]) / w
        out[ch] = x[ch] - mean
    return out


# ─────────────────────────── render ───────────────────────────

def render(tl):
    duration = float(tl["duration"])
    n = int(round(duration * SR))
    ev = sorted(tl["events"], key=lambda e: (e["t"], e["type"]))
    bar = float(tl["bar"])

    drums = Bus(n); keys = Bus(n); pads = Bus(n); bassb = Bus(n)
    fx = Bus(n); bells = Bus(n); low = Bus(n)

    kicks = [(e["t"], e["intensity"]) for e in ev if e["type"] == "kick"]
    by_type = lambda ty: [e for e in ev if e["type"] == ty]

    def next_time(t0, types, default):
        cand = [e["t"] for e in ev if e["type"] in types and e["t"] > t0 + 1e-6]
        return min(cand) if cand else default

    hat_i = 0
    for e in ev:
        ty, t0, tg = e["type"], e["t"], e.get("target", "")
        if ty == "kick":
            drums.add(t0, kick(e["intensity"]), gain=0.95)
            if tg.startswith("hz:"):
                bells.add(t0, bell(penta_note(inner_text(tg)), 0.55 * e["intensity"]),
                          pan=((seed_of(tg) % 100) / 100 - 0.5) * 0.8)
        elif ty == "snare":
            drums.add(t0, clap(e), pan=0.05, gain=0.42)
        elif ty == "hat":
            hat_i += 1
            drums.add(t0, hat(e), pan=0.28 if hat_i % 2 else -0.22, gain=0.22)
            if tg.startswith("py:"):
                keys.add(t0, key_click(e, 0.5), pan=0.15, gain=0.3)
        elif ty == "click":
            keys.add(t0, key_click(e), pan=((seed_of(tg) % 100) / 100 - 0.5) * 0.6, gain=0.4)
        elif ty == "pad_chord":
            end = next_time(t0, {"pad_chord"}, duration)
            pads.add(t0, pad(e, end - t0), gain=1.0)
        elif ty == "bass":
            end = min(next_time(t0, {"bass"}, duration), t0 + bar)
            kin = [(tk - t0, ik) for tk, ik in kicks if t0 - 1e-6 <= tk < end]
            bassb.add(t0, bass(e, end - t0, kin), gain=0.36)
        elif ty == "whoosh":
            sig, off = whoosh(e)
            fx.add(t0 + off, sig, gain=0.5)
        elif ty == "riser":
            end = next_time(t0, {"impact", "sub_drop"}, t0 + bar)
            fx.add(t0, riser(e, end - t0), gain=0.55)
        elif ty == "impact":
            low.add(t0, impact(e), gain=0.75)
            if tg.startswith("hz:"):
                bells.add(t0, bell(penta_note(inner_text(tg)), 0.6 * e["intensity"]),
                          pan=((seed_of(tg) % 100) / 100 - 0.5) * 0.8)
        elif ty == "sub_drop":
            low.add(t0, sub_drop(e), gain=0.6)
        elif ty == "chime":
            beat = float(tl["beat"])
            if "retícula" in tg:
                notes = [69, 72, 74, 76, 79, 81]            # arpegio pentatónico ascendente
                step = beat / 2
            elif tg.startswith("hz:"):
                notes = [penta_note(tg, 88)]                 # destello: una nota aguda
                step = 0
            else:
                idx = seed_of(inner_text(tg)) % 5           # nota: tres grados seguidos
                notes = [81 + PENTA[(idx + k) % 5] + 12 * ((idx + k) // 5) for k in (0, 1, 2)]
                step = beat / 4
            for k, m in enumerate(notes):
                bells.add(t0 + k * step, bell(m, e["intensity"] * (1 - 0.08 * k), dur=3.2),
                          pan=(-0.35 + 0.7 * k / max(len(notes) - 1, 1)) if len(notes) > 1 else 0.0)

    # sidechain de pads y bajo con el bombo
    sc = sidechain_curve(n, kicks)
    pads.x *= sc
    bassb.x *= sc ** 0.9

    # reverb (envío)
    send = (pads.x * 0.30 + bells.x * 0.55 + keys.x * 0.18 + drums.x * 0.06
            + fx.x * 0.35 + low.x * 0.10)
    wet = convolve_fft(send, synth_ir())

    mix = (drums.x * 1.0 + keys.x * 1.6 + pads.x * 1.05 + bassb.x * 1.0
           + fx.x * 1.0 + bells.x * 0.8 + low.x * 1.0 + wet * 0.42)
    mix = one_pole_hp_dc(mix)

    # master: ganancia de entrada por RMS objetivo → limitador suave → pico -1.2 dBFS
    rms = np.sqrt(np.mean(mix ** 2))
    mix *= 0.16 / max(rms, 1e-9)
    mix = soft_limit(mix)
    # fade-in de 5 ms y fade-out coseno en los últimos 2 s
    fi = int(0.005 * SR)
    mix[:, :fi] *= np.linspace(0, 1, fi)
    fo = int(2.0 * SR)
    mix[:, -fo:] *= 0.5 + 0.5 * np.cos(np.linspace(0, np.pi, fo))
    target_peak = 10 ** (-1.2 / 20)
    mix *= target_peak / np.max(np.abs(mix))
    return mix


def write_wav(path, x, seed=7):
    rng = np.random.default_rng(seed)
    dither = (rng.random(x.shape) - rng.random(x.shape)) / 32768.0   # TPDF ±1 LSB
    y = np.clip(np.round((x + dither) * 32767), -32768, 32767).astype("<i2")
    with wave.open(str(path), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(y.T.copy().tobytes())


def main():
    folder = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else DEFAULT_DIR
    tl = json.loads((folder / "timeline.json").read_text(encoding="utf-8"))
    x = render(tl)
    out = folder / "audio.wav"
    write_wav(out, x)
    peak = 20 * np.log10(np.max(np.abs(x)))
    print(f"{out}  {x.shape[1]} muestras = {x.shape[1] / SR:.6f} s  pico {peak:.2f} dBFS")
    # audio.wav queda local (gitignore); el sitio publica audio.m4a (~2 MB)
    m4a = folder / "audio.m4a"
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(out),
                    "-c:a", "aac", "-b:a", "96k", str(m4a)], check=True)
    print(m4a)


if __name__ == "__main__":
    main()
