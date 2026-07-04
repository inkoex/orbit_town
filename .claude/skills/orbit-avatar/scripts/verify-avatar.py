#!/usr/bin/env python3
"""Verify an Orbit Station avatar reference PNG — no dependencies (stdlib only).

Checks, for one or more PNGs:
  - transparency: RGBA (colortype 6) with fully-transparent corners (Tripo-ready)
  - shadow: no opaque/semi-opaque pixels just under the soles (no contact shadow)
  - proportion: head fraction (~43% base) and width/height (~0.58 base)
  - dominant body color (rough hue label, for the color axis)

Usage:
  python3 verify-avatar.py IMAGE.png [IMAGE2.png ...]

The canonical base is docs/design/assets/2026-07-04-avatar-space-Bspec-1-transparent.png
(head 43.0%, w/h 0.58). New family members should land near that band; gender
coding via a hair silhouette legitimately raises the head fraction a few points.
"""
import sys, zlib, struct

def decode(path):
    data = open(path, 'rb').read()
    assert data[:8] == b'\x89PNG\r\n\x1a\n', "not a PNG"
    pos, idat = 8, b''
    W = H = ct = inter = None
    while pos < len(data):
        ln = struct.unpack('>I', data[pos:pos+4])[0]
        typ = data[pos+4:pos+8]
        chunk = data[pos+8:pos+8+ln]
        if typ == b'IHDR':
            W, H, bd, ct, comp, filt, inter = struct.unpack('>IIBBBBB', chunk)
        elif typ == b'IDAT':
            idat += chunk
        elif typ == b'IEND':
            break
        pos += 12 + ln
    ch = {0: 1, 2: 3, 6: 4}[ct]
    stride = W * ch
    raw = zlib.decompress(idat)
    def paeth(a, b, c):
        p = a + b - c; pa, pb, pc = abs(p-a), abs(p-b), abs(p-c)
        return a if (pa <= pb and pa <= pc) else (b if pb <= pc else c)
    out = bytearray(); prev = bytearray(stride); i = 0
    for _ in range(H):
        f = raw[i]; i += 1
        line = bytearray(raw[i:i+stride]); i += stride
        for x in range(stride):
            a = line[x-ch] if x >= ch else 0
            b = prev[x]; c = prev[x-ch] if x >= ch else 0
            if f == 1: line[x] = (line[x] + a) & 255
            elif f == 2: line[x] = (line[x] + b) & 255
            elif f == 3: line[x] = (line[x] + ((a+b) >> 1)) & 255
            elif f == 4: line[x] = (line[x] + paeth(a, b, c)) & 255
        out += line; prev = line
    return W, H, ch, stride, out, ct

def check(path):
    W, H, ch, stride, out, ct = decode(path)
    def px(x, y):
        o = y*stride + x*ch
        if ch == 4: return (out[o], out[o+1], out[o+2], out[o+3])
        if ch == 3: return (out[o], out[o+1], out[o+2], 255)
        return (out[o], out[o], out[o], 255)
    rgba = ct == 6
    # opacity test: alpha for RGBA, else luminance differs from a corner background
    if rgba:
        opaque = lambda x, y: px(x, y)[3] > 40
    else:
        bg = sum(px(20, 20)[:3]) / 3
        opaque = lambda x, y: abs(sum(px(x, y)[:3])/3 - bg) > 25

    widths = [sum(1 for x in range(0, W) if opaque(x, y)) for y in range(H)]
    body = [y for y, w in enumerate(widths) if w >= 40]  # >=40px row excludes thin antenna
    top, bot = body[0], body[-1]; total = bot - top
    zone = range(top + int(total*0.15), top + int(total*0.58))
    neck = min(zone, key=lambda y: widths[y])
    head_frac = (neck - top) / total
    wh = max(widths) / total

    def abox(cx, cy, r=12):
        xs = range(max(0, cx-r), min(W, cx+r)); ys = range(max(0, cy-r), min(H, cy+r))
        return sum(px(x, y)[3] for x in xs for y in ys) / (len(xs)*len(ys))

    print(f"\n=== {path.split('/')[-1]}  ({W}x{H}) ===")
    # transparency
    if rgba:
        corners = [abox(x, y) for x, y in [(30,30),(W-30,30),(30,H-30),(W-30,H-30)]]
        t_ok = max(corners) < 8
        print(f"  transparency : RGBA, corner alpha max {max(corners):.1f}  -> {'PASS' if t_ok else 'FAIL (bg not transparent)'}")
        # shadow: band just below the soles across the figure width
        under = [abox(x, min(H-1, bot+18), 8) for x in range(int(W*0.25), int(W*0.75), 40)]
        s_ok = max(under) < 10
        print(f"  no-shadow    : under-sole alpha max {max(under):.1f}  -> {'PASS' if s_ok else 'WARN (contact shadow / disc present)'}")
    else:
        print(f"  transparency : NOT RGBA (colortype {ct}) -> NOT Tripo-ready (needs transparent bg)")

    # proportion (informational band, not a hard fail — hair silhouette shifts head%)
    hp = "ok" if 0.40 <= head_frac <= 0.48 else "off-band"
    wp = "ok" if 0.52 <= wh <= 0.64 else "off-band"
    print(f"  proportion   : head {head_frac*100:.1f}% [{hp}]   w/h {wh:.2f} [{wp}]   (base: 43.0% / 0.58)")

    # dominant body color (mid-torso average of opaque pixels)
    cy = top + int(total*0.72)
    samples = [px(x, cy) for x in range(int(W*0.3), int(W*0.7), 6) if px(x, cy)[3] > 200]
    if samples:
        r = sum(s[0] for s in samples)//len(samples)
        g = sum(s[1] for s in samples)//len(samples)
        b = sum(s[2] for s in samples)//len(samples)
        if r > g+25 and r > b+25: hue = "red/warm"
        elif g > r+15 and g >= b: hue = "green/teal"
        elif b > r+15 and b > g+10: hue = "blue"
        elif max(r,g,b)-min(r,g,b) < 20: hue = "neutral/grey"
        else: hue = "mixed/pastel"
        print(f"  body color   : RGB({r},{g},{b}) -> {hue}")

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(__doc__); sys.exit(1)
    for p in sys.argv[1:]:
        try:
            check(p)
        except Exception as e:
            print(f"\n=== {p} ===\n  ERROR: {e}")
