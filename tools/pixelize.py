#!/usr/bin/env python3
"""Turn a flat-magenta-background anime render into a true pixel-art sprite.

Pipeline
  1. background removal: border flood-fill on the corner colour, plus magenta-halo
     cleanup for the pink pixels that survive in thin gaps between hair strands
  2. silhouette repair (interior holes filled) and colour fill behind transparent
     areas, so area-reduction never bleeds dark pixels into the edges
  3. reduction to a real pixel grid (176x240), hard alpha cut
  4. 28-colour palette (MEDIANCUT, dither NONE) built from opaque pixels only
  5. 1px dark outline, integer NEAREST upscale x4 for crisp pixelated display
"""
import sys
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageEnhance, ImageFilter

TARGET_W, TARGET_H = 176, 240
SCALE = 4
PALETTE = 28
BG_TOL = 80
MAGENTA_TOL = 45


def bg_colour(arr):
    h, w, _ = arr.shape
    corners = np.concatenate([
        arr[0:12, 0:12].reshape(-1, 3), arr[0:12, w - 12:w].reshape(-1, 3),
        arr[h - 12:h, 0:12].reshape(-1, 3), arr[h - 12:h, w - 12:w].reshape(-1, 3),
    ])
    return np.median(corners, axis=0)


def border_flood(candidate):
    h, w = candidate.shape
    seen = np.zeros((h, w), dtype=bool)
    q = deque()
    edge = [(x, 0) for x in range(w)] + [(x, h - 1) for x in range(w)]
    edge += [(0, y) for y in range(h)] + [(w - 1, y) for y in range(h)]
    for x, y in edge:
        if candidate[y, x] and not seen[y, x]:
            seen[y, x] = True
            q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and candidate[ny, nx] and not seen[ny, nx]:
                seen[ny, nx] = True
                q.append((ny, nx))
    return seen


def neutralise(img, mask, iters=60):
    """Grow clean colour into magenta-tainted pixels (`mask`) from their neighbours.

    Used for the pink halo that survives inside thin hair gaps: the pixel stays part of
    the character, it just needs the hair colour from next to it.
    """
    out = img.astype(np.float32)
    todo = mask.copy()
    for _ in range(iters):
        if not todo.any():
            break
        acc = np.zeros_like(out)
        cnt = np.zeros(out.shape[:2], dtype=np.float32)
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, -1), (1, -1), (-1, 1)):
            nbr = np.roll(np.roll(out, dy, axis=0), dx, axis=1)
            ok = np.roll(np.roll(~todo, dy, axis=0), dx, axis=1)
            w = ok.astype(np.float32)
            acc += nbr * w[..., None]
            cnt += w
        upd = todo & (cnt > 0)
        out[upd] = (acc[upd] / cnt[upd][:, None])
        todo &= ~upd
    return np.clip(out, 0, 255).astype(np.uint8)


def quantise(rgba, colors=PALETTE, method=Image.Quantize.MEDIANCUT):
    """Nearest-colour mapping to a palette built from opaque pixels only."""
    arr = np.array(rgba)
    mask = arr[:, :, 3] > 0
    pixels = arr[mask][:, :3]
    strip = Image.fromarray(pixels.reshape(1, -1, 3), "RGB")
    q = strip.quantize(colors=colors, method=method, dither=Image.Dither.NONE)
    pal = np.array(q.getpalette()[:colors * 3], dtype=np.int32).reshape(-1, 3)
    p = pixels.astype(np.int32)
    out_rgb = np.empty_like(p, dtype=np.uint8)
    for i in range(0, len(p), 30000):
        chunk = p[i:i + 30000]
        d = ((chunk[:, None, :] - pal[None, :, :]) ** 2).sum(axis=2)
        out_rgb[i:i + 30000] = pal[d.argmin(axis=1)].astype(np.uint8)
    res = np.zeros_like(arr)
    res[mask, :3] = out_rgb
    res[mask, 3] = 255
    return Image.fromarray(res, "RGBA")


def add_outline(img, colour=(22, 18, 28)):
    a = np.array(img)
    opaque = a[:, :, 3] > 0
    edge = np.zeros_like(opaque)
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        edge |= np.roll(np.roll(opaque, dy, axis=0), dx, axis=1)
    edge &= ~opaque
    edge[0, :] = edge[-1, :] = False
    edge[:, 0] = edge[:, -1] = False
    out = a.copy()
    out[edge] = [colour[0], colour[1], colour[2], 230]
    return Image.fromarray(out, "RGBA")


def process(src, dst, target=(TARGET_W, TARGET_H), outline=True, grade=True, align="bottom"):
    arr = np.array(Image.open(src).convert("RGB"))
    bg = bg_colour(arr)
    rgb16 = arr.astype(np.int16)
    magenta = (rgb16[:, :, 0] + rgb16[:, :, 2]) // 2 - rgb16[:, :, 1]
    dist_bg = np.sqrt(((rgb16 - bg) ** 2).sum(axis=2))

    opaque = ~border_flood((dist_bg < BG_TOL) | (magenta > 90))
    opaque &= ~(magenta > MAGENTA_TOL)          # drop pink halo pixels
    interior = ~border_flood(~opaque) & ~opaque  # enclosed holes -> solid
    opaque |= interior

    base = neutralise(arr, (magenta >= 25) & opaque)
    blur = np.array(Image.fromarray(base).filter(ImageFilter.GaussianBlur(5)))
    base[~opaque] = blur[~opaque]                # no dark bleed at reduction

    img = Image.fromarray(base, "RGB")
    alpha = Image.fromarray((opaque * 255).astype(np.uint8), "L")
    bbox = alpha.getbbox()
    if bbox:
        img, alpha = img.crop(bbox), alpha.crop(bbox)
    if grade:
        img = ImageEnhance.Color(img).enhance(1.12)
        img = ImageEnhance.Contrast(img).enhance(1.06)

    w, h = img.size
    tw, th = target
    pad = 1
    ratio = min((tw - pad * 2) / w, (th - pad * 2) / h)
    nw, nh = max(1, round(w * ratio)), max(1, round(h * ratio))

    small_rgb = img.resize((nw, nh), Image.LANCZOS)
    small_a = alpha.resize((nw, nh), Image.LANCZOS)
    a = np.array(small_a)
    a = np.where(a >= 120, 255, 0).astype(np.uint8)
    canvas_rgb = Image.new("RGB", (tw, th), (0, 0, 0))
    canvas_a = Image.new("L", (tw, th), 0)
    pos = ((tw - nw) // 2, th - pad - nh if align == "bottom" else (th - nh) // 2)
    canvas_rgb.paste(small_rgb, pos)
    canvas_a.paste(Image.fromarray(a, "L"), pos)

    rgba = canvas_rgb.convert("RGBA")
    rgba.putalpha(canvas_a)
    img_out = quantise(rgba)
    if outline:
        img_out = add_outline(img_out)
    img_out.resize((tw * SCALE, th * SCALE), Image.NEAREST).save(dst)
    return dst, img_out


def main():
    pairs = [
        ("assets/raw_lord.png", "assets/lord.png"),
        ("assets/raw_serena3.png", "assets/serena.png"),
        ("assets/raw_mira2.png", "assets/mira.png"),
        ("assets/raw_wolf.png", "assets/wolf.png"),
    ]
    portraits = [
        ("assets/raw_serena_face.png", "assets/serena_portrait.png"),
        ("assets/raw_mira_face.png", "assets/mira_portrait.png"),
    ]
    base = Path(sys.argv[1] if len(sys.argv) > 1 else ".")
    smalls = []
    for s, d in pairs:
        out, small = process(base / s, base / d)
        smalls.append(small)
        print(f"{out}  {Image.open(out).size}")
    for s, d in portraits:
        out, _ = process(base / s, base / d, target=(240, 240), align="center")
        print(f"{out}  {Image.open(out).size}")
    sheet = Image.new("RGBA", ((TARGET_W * 3 + 24) * len(smalls), TARGET_H * 3),
                      (18, 19, 26, 255))
    for i, small in enumerate(smalls):
        sheet.alpha_composite(small.resize((TARGET_W * 3, TARGET_H * 3), Image.NEAREST),
                              (i * (TARGET_W * 3 + 24), 0))
    sheet.save(base / "assets/_sheet.png")
    print("sheet", base / "assets/_sheet.png")


if __name__ == "__main__":
    main()
