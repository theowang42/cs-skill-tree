# 短片的声音：只有终端打字声和“嗖”的过场声，全部合成，按 cues.json 的时间点放
import json, sys, wave
import numpy as np

SR = 48000
cfg = json.load(open(sys.argv[1]))
DUR = cfg['dur'] + 1.2
N = int(SR * DUR)
L = np.zeros(N)
R = np.zeros(N)
rng = np.random.default_rng(11)


def add(sig, t, gain=1.0, pan=0.0):
    """单声道放进立体声；pan 可以是一个数，也可以是和 sig 一样长的数组（声像移动）"""
    i = int(round(t * SR))
    if i < 0:
        sig = sig[-i:]
        i = 0
    j = min(N, i + len(sig))
    if j <= i:
        return
    s = sig[: j - i] * gain
    p = np.asarray(pan)
    if p.ndim:
        p = p[: j - i]
    L[i:j] += s * np.sqrt((1 - p) / 2)
    R[i:j] += s * np.sqrt((1 + p) / 2)


def spectral(x, shape):
    """频域整形：shape(freqs) 返回每个频率的增益"""
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    return np.fft.irfft(X * shape(f), len(x))


def band(x, lo, hi):
    return spectral(x, lambda f: ((f > lo) & (f < hi)).astype(float))


def decay(n, tau, attack=0.0):
    t = np.arange(n) / SR
    e = np.exp(-t / tau)
    k = int(attack * SR)
    if k:
        e[:k] *= np.linspace(0, 1, k) ** 2
    return e


def damped(f, tau, dur):
    n = int(SR * dur)
    t = np.arange(n) / SR
    return np.sin(2 * np.pi * f * t) * decay(n, tau)


# ── 键盘：咔（高频瞬态）+ 哒（键帽的共鸣）+ 咚（触底），松开时再轻轻一下 ──
def key(v=0.5, soft=False, kind='key'):
    dur = 0.16
    n = int(SR * dur)
    out = np.zeros(n)
    click = band(rng.standard_normal(n), 2500, 11000) * decay(n, 0.0016 + 0.0008 * v)
    body = damped(1700 + 900 * v, 0.006, dur) * 0.35
    thock = damped(150 + 70 * v if kind != 'space' else 105, 0.022 if kind != 'space' else 0.035, dur) * (0.9 if kind == 'space' else 0.6)
    out += click * 0.9 + body + thock
    rel = int((0.045 + 0.03 * v) * SR)
    m = n - rel
    out[rel:] += (band(rng.standard_normal(m), 3000, 10000) * decay(m, 0.0012)) * 0.35
    if soft:
        out = spectral(out, lambda f: 1 / (1 + (f / 3500) ** 2)) * 0.7
    return out


def enter(last=False):
    a = key(0.8, kind='space') * 1.25
    b = np.zeros(len(a) + int(0.03 * SR))
    b[: len(a)] += a
    b[int(0.03 * SR):] += key(0.2) * 0.6
    if last:
        n = int(0.6 * SR)
        thud = damped(62, 0.12, 0.6) * 0.8
        out = np.zeros(max(len(b), n))
        out[: len(b)] += b
        out[:n] += thud
        return out
    return b


# ── 嗖：一段噪声穿过一个移动的带通，响度先起后落，声像从一边扫到另一边 ──
def whoosh(d=0.6, f=600, rise=0):
    n = int(SR * d)
    x = rng.standard_normal(n + 4096)
    hop, win = 256, 2048
    w = np.hanning(win)
    y = np.zeros(len(x))
    freqs = np.fft.rfftfreq(win, 1 / SR)
    for k in range(0, n, hop):
        p = k / n
        # 中心频率：先往上扫再回落（rise=1 一直往上）
        fc = f * (0.45 + 1.5 * p) if rise else f * (0.5 + 1.4 * np.sin(np.pi * min(1, p * 1.15)) ** 1.2)
        bw = 0.9
        g = np.exp(-0.5 * (np.log2(np.maximum(freqs, 1) / fc) / bw) ** 2)
        seg = x[k: k + win] * w
        y[k: k + win] += np.fft.irfft(np.fft.rfft(seg) * g, win) * w
    y = y[:n]
    t = np.arange(n) / n
    env = np.sin(np.pi * t ** (0.7 if rise else 0.9)) ** 2
    if rise:
        env *= np.minimum(1, (1 - t) * 6)
    y *= env
    return y / (np.max(np.abs(y)) + 1e-9)


# ── 低频冲击：从 70Hz 滑到 38Hz，慢慢消失 ──
def sub(d=1.4):
    n = int(SR * d)
    t = np.arange(n) / SR
    f = 38 + 32 * np.exp(-t / 0.18)
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) * decay(n, 0.42, 0.012)
    s += 0.25 * np.sin(2 * ph) * decay(n, 0.15, 0.012)
    return s


# ── 点亮：很短的一声“嚓”（高处的空气声）加一个轻轻的落点 ──
def light(i=0, big=False):
    d = 0.9 if big else 0.32
    n = int(SR * d)
    out = np.zeros(n)
    air = whoosh(0.16, 5200 + 300 * (i % 5), rise=1) * 0.35
    out[: len(air)] += air
    out += damped(900 + 60 * (i % 6), 0.012, d) * 0.25
    if big:
        out += sub(d)[:n] * 0.6
    return out


def tick(k=0):
    d = 0.05
    n = int(SR * d)
    return band(rng.standard_normal(n), 3500, 9000) * decay(n, 0.0011) * 0.8 + damped(2400 + 40 * (k % 5), 0.004, d) * 0.15


# ── 按时间表放 ──
for c in cfg['cues']:
    t, ty = c['t'], c['type']
    if ty in ('key', 'space'):
        add(key(c.get('v', 0.5), soft=bool(c.get('soft')), kind=ty), t, 0.34 if not c.get('soft') else 0.27, pan=(c.get('v', 0.5) - 0.5) * 0.3)
    elif ty == 'enter':
        add(enter(bool(c.get('last'))), t, 0.6, pan=0.05)
    elif ty == 'whoosh':
        y = whoosh(c['d'], c['f'], c.get('rise', 0))
        p0 = c.get('pan', 0)
        pan = np.linspace(-p0, p0, len(y)) if p0 else 0.0
        add(y, t, 0.32 * c.get('g', 0.5) / 0.5, pan=pan)
    elif ty == 'sub':
        add(sub(), t, 0.55 * c.get('g', 1))
    elif ty == 'light':
        add(light(c.get('i', 0), bool(c.get('big'))), t, 0.5 if c.get('big') else 0.3, pan=c.get('pan', 0) * 0.6)
    elif ty == 'press':
        add(key(0.6, kind='space'), t, 0.5, pan=0.25)
        add(light(c.get('i', 0) + 3) * 0.6, t + 0.01, 0.35, pan=0.25)
    elif ty == 'tick':
        add(tick(c.get('k', 0)), t, 0.22, pan=0.4)

# ── 空间感：一点很短的混响 ──
def reverb(x, sec=0.9, wet=0.14):
    n = int(SR * sec)
    ir = rng.standard_normal(n) * np.exp(-np.arange(n) / SR / (sec / 5))
    ir = spectral(ir, lambda f: 1 / (1 + (f / 5000) ** 2))
    ir /= np.sqrt(np.sum(ir ** 2))
    m = len(x) + n
    size = 1 << int(np.ceil(np.log2(m)))
    y = np.fft.irfft(np.fft.rfft(x, size) * np.fft.rfft(ir, size), size)[: len(x)]
    return x + wet * y


L2, R2 = reverb(L), reverb(R)
# 低切 25Hz，去掉没用的超低频
L2 = spectral(L2, lambda f: 1 / np.sqrt(1 + (25 / np.maximum(f, 1)) ** 4))
R2 = spectral(R2, lambda f: 1 / np.sqrt(1 + (25 / np.maximum(f, 1)) ** 4))
# 软限幅，峰值 -1 dBFS
peak = max(np.max(np.abs(L2)), np.max(np.abs(R2)))
L2, R2 = L2 / peak * 1.25, R2 / peak * 1.25
L2, R2 = np.tanh(L2), np.tanh(R2)
peak = max(np.max(np.abs(L2)), np.max(np.abs(R2)))
L2, R2 = L2 / peak * 0.89, R2 / peak * 0.89
# 结尾淡出
f = int(0.4 * SR)
L2[-f:] *= np.linspace(1, 0, f)
R2[-f:] *= np.linspace(1, 0, f)
pcm = (np.stack([L2, R2], 1) * 32767).astype('<i2')
with wave.open(sys.argv[2], 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print('ok', DUR, 's', len(cfg['cues']), 'cues')
