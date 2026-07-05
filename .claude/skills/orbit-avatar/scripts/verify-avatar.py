#!/usr/bin/env python3
"""Verify an Orbit Station avatar reference PNG — no dependencies (stdlib only).

Guardrail for the Tripo-input pipeline. Exits NON-ZERO if any file fails a hard
check, so it can gate automation. Checks, for one or more PNGs:
  - transparency: RGBA (colortype 6) with fully-transparent corners  [HARD]
  - shadow: no contact shadow / base disc under the soles            [HARD]
  - proportion: head fraction (~43% base) and width/height (~0.58)   [soft/info]
  - dominant body color (rough hue label, RGBA only)                 [info]

Usage:
  python3 verify-avatar.py IMAGE.png [IMAGE2.png ...]
Exit 0 = all files passed hard checks; exit 1 = at least one failed/errored.

Only 8-bit, non-interlaced PNGs of colortype 0/2/6 are supported; anything else
is reported as a hard failure rather than silently mis-measured.

The canonical base is docs/design/assets/2026-07-04-avatar-space-Bspec-1-transparent.png
(head 43.0%, w/h 0.58). Expected input size ~1024x1536; the 40px body-row cutoff
and pass-bands are calibrated for that resolution.

NOTE: the shadow and proportion checks are HEURISTICS with known blind spots
(a fully-opaque base disc, or a hair/collar that moves the neck row). Always also
eyeball the render — do not trust the numbers alone.
"""
import sys, zlib, struct

# soft proportion bands (RGBA only); off-band => WARN, not a hard failure
HEAD_LO, HEAD_HI = 0.40, 0.48
WH_LO, WH_HI = 0.52, 0.64


class DecodeError(Exception):
    pass


def decode(path):
    data = open(path, 'rb').read()
    if data[:8] != b'\x89PNG\r\n\x1a\n':
        raise DecodeError("not a PNG")
    pos, idat = 8, b''
    W = H = ct = bd = inter = comp = filt = None
    while pos + 8 <= len(data):
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
    if W is None:
        raise DecodeError("no IHDR")
    # Only the happy path is trustworthy — refuse the rest loudly (see module docstring).
    if bd != 8:
        raise DecodeError(f"unsupported bit depth {bd} (need 8-bit)")
    if ct not in (0, 2, 6):
        raise DecodeError(f"unsupported color type {ct} (need grey/RGB/RGBA; palette & grey+alpha not handled)")
    if inter != 0:
        raise DecodeError("interlaced PNG (Adam7) not supported")
    if comp != 0 or filt != 0:
        raise DecodeError(f"unsupported compression/filter method ({comp}/{filt})")
    ch = {0: 1, 2: 3, 6: 4}[ct]
    stride = W * ch
    raw = zlib.decompress(idat)
    if len(raw) < H * (1 + stride):
        raise DecodeError("truncated image data")

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
    """Return True if the file passes all HARD checks, False otherwise."""
    try:
        W, H, ch, stride, out, ct = decode(path)
    except DecodeError as e:
        print(f"\n=== {path.split('/')[-1]} ===\n  FAIL decode: {e}")
        return False

    rgba = ct == 6
    def px(x, y):
        o = y*stride + x*ch
        if ch == 4: return (out[o], out[o+1], out[o+2], out[o+3])
        if ch == 3: return (out[o], out[o+1], out[o+2], 255)
        return (out[o], out[o], out[o], 255)

    print(f"\n=== {path.split('/')[-1]}  ({W}x{H}) ===")
    ok = True

    # opacity test: alpha for RGBA; luminance-vs-corner for RGB/grey (unreliable)
    if rgba:
        opaque = lambda x, y: px(x, y)[3] > 40
    else:
        bg = sum(sum(px(x, y)[:3]) / 3 for x in (10, 20, 30) for y in (10, 20, 30)) / 9
        opaque = lambda x, y: abs(sum(px(x, y)[:3])/3 - bg) > 25

    widths = [sum(1 for x in range(W) if opaque(x, y)) for y in range(H)]
    body = [y for y, w in enumerate(widths) if w >= 40]
    if not body:
        print("  FAIL: no figure detected (blank / fully transparent / no foreground)")
        return False
    top, bot = body[0], body[-1]
    total = bot - top
    if total <= 0:
        print("  FAIL: degenerate figure (zero height)")
        return False

    # --- transparency (HARD, RGBA only) ---
    if rgba:
        def abox(cx, cy, r=12):
            xs = range(max(0, cx-r), min(W, cx+r)); ys = range(max(0, cy-r), min(H, cy+r))
            n = len(xs) * len(ys)
            return sum(px(x, y)[3] for x in xs for y in ys) / n if n else 255
        corners = [abox(x, y) for x, y in [(30, 30), (W-30, 30), (30, H-30), (W-30, H-30)]]
        if max(corners) < 8:
            print(f"  transparency : PASS (corner alpha max {max(corners):.1f})")
        else:
            print(f"  transparency : FAIL — background not transparent (corner alpha max {max(corners):.1f})")
            ok = False
    else:
        print(f"  transparency : FAIL — not RGBA (colortype {ct}); not a valid Tripo input")
        ok = False

    # --- no-shadow (HARD, RGBA only): improved detection ---
    # Find the solid feet bottom from HIGH alpha (>200), not the >40 mask that a
    # semi-opaque disc pollutes. Then look below it for (a) any semi/opaque pixels
    # (soft shadow) or (b) a width bulge wider than the ankles (base disc).
    if rgba:
        solid = [y for y in range(H) if sum(1 for x in range(0, W, 2) if px(x, y)[3] > 200) >= 10]
        if solid:
            sole = solid[-1]
            # A real soft shadow is a BROAD region of moderate+ alpha below the
            # soles; a few faint anti-alias px are not. Count area, not max.
            area = sum(1 for yy in range(sole + 6, min(H, sole + 70))
                       for x in range(0, W, 2) if px(x, yy)[3] > 40)
            # A fully-opaque disc touches the feet (so it hides in `solid`); catch
            # it by a bottom row much wider than the ankles just above the soles.
            w_bottom = widths[bot]
            w_ref = widths[max(top, sole - 25)]
            disc = w_bottom > w_ref * 1.35 and w_bottom > 80
            if area > 30:
                print(f"  no-shadow    : FAIL — broad shadow below soles ({area} px alpha>40) → contact shadow/disc")
                ok = False
            elif disc:
                print(f"  no-shadow    : FAIL — base disc suspected (bottom row {w_bottom}px vs {w_ref}px above soles)")
                ok = False
            else:
                print(f"  no-shadow    : PASS ({area} faint px below soles; heuristic — also eyeball it)")
        else:
            print("  no-shadow    : SKIP (no solid feet found)")

    # --- proportion (soft / informational) ---
    if rgba:
        zone = range(top + int(total*0.15), max(top + int(total*0.15) + 1, top + int(total*0.58)))
        neck = min(zone, key=lambda y: widths[y])
        head_frac = (neck - top + 1) / (total + 1)
        wh = max(widths) / total
        hp = "ok" if HEAD_LO <= head_frac <= HEAD_HI else "WARN off-band"
        wp = "ok" if WH_LO <= wh <= WH_HI else "WARN off-band"
        print(f"  proportion   : head {head_frac*100:.1f}% [{hp}]   w/h {wh:.2f} [{wp}]   (base 43.0% / 0.58)")
    else:
        print("  proportion   : SKIPPED — non-RGBA luminance heuristic is unreliable for the "
              "cream-trim palette (can read 5+pp off). Convert to RGBA to measure.")

    # --- dominant body color (info, RGBA only — bg contaminates non-RGBA) ---
    if rgba:
        cy = top + int(total*0.72)  # note: lower torso / upper legs on a big-head chibi
        s = [px(x, cy) for x in range(int(W*0.3), int(W*0.7), 6) if px(x, cy)[3] > 200]
        if s:
            r = sum(p[0] for p in s)//len(s); g = sum(p[1] for p in s)//len(s); b = sum(p[2] for p in s)//len(s)
            if r > g+25 and r > b+25: hue = "red/warm"
            elif g > r+15 and g >= b: hue = "green/teal"
            elif b > r+15 and b > g+10: hue = "blue"
            elif max(r, g, b)-min(r, g, b) < 20: hue = "neutral/grey"
            else: hue = "mixed/pastel"
            print(f"  body color   : RGB({r},{g},{b}) -> {hue}")

    return ok


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(__doc__); sys.exit(2)
    failed = 0
    for p in sys.argv[1:]:
        try:
            if not check(p):
                failed += 1
        except Exception as e:  # unexpected — treat as failure, don't exit 0
            print(f"\n=== {p} ===\n  FAIL (unexpected): {type(e).__name__}: {e}")
            failed += 1
    print(f"\n{'ALL PASSED' if failed == 0 else str(failed) + ' FILE(S) FAILED'}")
    sys.exit(1 if failed else 0)
