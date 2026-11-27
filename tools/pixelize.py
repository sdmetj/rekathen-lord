#!/usr/bin/env python3
"""Turn flat-magenta anime renders into true pixel-art game assets.

Modes
  sprite    full-body character  -> transparent 176x240, 32 colours, 1px outline, x4
  portrait  bust portrait        -> transparent 200x200, 32 colours, no outline, x3
  scene     background painting  -> opaque 400x225, 48 colours, x2
  all       everything found in assets/raw

Pipeline (sprite / portrait)
  1. background removal: border flood-fill from the corner colour + magenta halo cleanup
  2. silhouette repair (enclosed holes filled) and colour bleed filling behind alpha
  3. downscale to the real pixel grid, hard alpha cut
  4. 32-colour palette (MEDIANCUT, dither NONE) built from opaque pixels only
  5. optional 1px outline, integer NEAREST upscale
"""
import argparse
import sys
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageEnhance, ImageFilter

BG_TOL = 80
MAGENTA_TOL = 45

SPRITES = [
    ("lord", "lord.png"),
    ("serena", "serena.png"),
    ("mira", "mira.png"),
    ("claire", "claire.png"),
    ("seraphine", "seraphine.png"),
    ("kael", "kael.png"),
    ("ellen", "ellen.png"),
    ("lana", "lana.png"),
    ("mill", "mill.png"),
    ("rebe", "rebe.png"),
    ("beloa", "beloa.png"),
    ("taron", "taron.png"),
    ("sgarteron", "sgarteron.png"),
    ("dorun", "dorun.png"),
    ("wolf", "wolf.png"),
]
PORTRAITS = [
    ("serena_face", "serena_portrait.png"),
    ("mira_face", "mira_portrait.png"),
    ("claire_face", "claire_portrait.png"),
    ("seraphine_face", "seraphine_portrait.png"),
    ("kael_face", "kael_portrait.png"),
    ("ellen_face", "ellen_portrait.png"),
    ("lana_face", "lana_portrait.png"),
    ("mill_face", "mill_portrait.png"),
    ("rebe_face", "rebe_portrait.png"),
    ("beloa_face", "beloa_portrait.png"),
    ("taron_face", "taron_portrait.png"),
    ("sgarteron_face", "sgarteron_portrait.png"),
    ("dorun_face", "dorun_portrait.png"),
    ("lord_face", "lord_portrait.png"),
]
SCENES = [
    ("bg_castle", "bg_castle.png"),
    ("bg_shop", "bg_shop.png"),
    ("bg_chapel", "bg_chapel.png"),
    ("bg_workshop", "bg_workshop.png"),
    ("bg_tavern", "bg_tavern.png"),
    ("bg_forest", "bg_forest.png"),
]


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


def quantise(rgba, colors=32, method=Image.Quantize.MEDIANCUT):
    arr = np.array(rgba)
    mask = arr[:, :, 3] > 0
    pixels = arr[mask][:, :3]
    if len(pixels) == 0:
        return rgba
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


def defringe(img, iters=8):
    """Kill stray magenta speckles that survived quantisation inside hair/armour."""
    arr = np.array(img).astype(np.int16)
    rgb, alpha = arr[:, :, :3], arr[:, :, 3]
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    bad = (alpha > 0) & (r > 115) & (b > 95) & (b - g > 42) & (r - g > 42)
    for _ in range(iters):
        if not bad.any():
            break
        acc = np.zeros_like(rgb, dtype=np.int32)
        cnt = np.zeros(rgb.shape[:2], dtype=np.int32)
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nbr = np.roll(np.roll(rgb, dy, axis=0), dx, axis=1)
            ok = np.roll(np.roll((alpha > 0) & ~bad, dy, axis=0), dx, axis=1)
            acc += nbr * ok[..., None]
            cnt += ok
        upd = bad & (cnt > 0)
        rgb[upd] = acc[upd] // cnt[upd][:, None]
        bad &= ~upd
    out = np.dstack([np.clip(rgb, 0, 255), alpha]).astype(np.uint8)
    return Image.fromarray(out, "RGBA")


def clean_specks(img, iters=2):
    """Drop isolated opaque dust left on the alpha edge, then refill the 1px holes."""
    arr = np.array(img)
    alpha = arr[:, :, 3] > 0
    for _ in range(iters):
        cnt = np.zeros(alpha.shape, dtype=np.int32)
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, -1), (1, -1), (-1, 1)):
            cnt += np.roll(np.roll(alpha, dy, axis=0), dx, axis=1).astype(np.int32)
        dust = alpha & (cnt <= 1)
        alpha &= ~dust
    arr[:, :, 3] = (alpha * 255).astype(np.uint8)
    return Image.fromarray(arr.astype(np.uint8), "RGBA")


def despill(rgb, alpha, rounds=8, tol=18):
    """실루엣 경계에 남은 마젠타 번짐을 '불투명한' 이웃 색으로만 덮는다.
    투명 영역은 마젠타라서 이웃으로 쓰면 오히려 번진다."""
    out = rgb.astype(np.float32).copy()
    opaque = alpha
    for _ in range(rounds):
        r, g, b = out[:, :, 0], out[:, :, 1], out[:, :, 2]
        bad = opaque & ((np.minimum(r, b) - g) > tol)
        if not bad.any():
            break
        good = opaque & ~bad
        acc = np.zeros_like(out)
        cnt = np.zeros(out.shape[:2], dtype=np.float32)
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, -1), (1, -1), (-1, 1)):
            nbr = np.roll(np.roll(out, dy, axis=0), dx, axis=1)
            ok = np.roll(np.roll(good, dy, axis=0), dx, axis=1)
            acc += nbr * ok[..., None]
            cnt += ok
        upd = bad & (cnt > 0)
        out[upd] = acc[upd] / cnt[upd][:, None]
    return np.clip(out, 0, 255).astype(np.uint8)


def fill_outside(rgb, alpha, iters=6):
    """투명 영역을 가장 가까운 불투명 색으로 채운다.
    축소(LANCZOS)할 때 마젠타가 실루엣 안으로 섞여 들어오는 것을 막는다."""
    out = rgb.copy()
    known = alpha.copy()
    for _ in range(iters):
        if known.all():
            break
        acc = np.zeros_like(out)
        cnt = np.zeros(out.shape[:2], dtype=np.float32)
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, -1), (1, -1), (-1, 1)):
            nbr = np.roll(np.roll(out, dy, axis=0), dx, axis=1)
            kn = np.roll(np.roll(known, dy, axis=0), dx, axis=1)
            acc += nbr * kn[..., None]
            cnt += kn
        upd = (~known) & (cnt > 0)
        out[upd] = acc[upd] / cnt[upd][:, None]
        known |= upd
    return np.clip(out, 0, 255).astype(np.uint8)


def add_outline(img, colour=(24, 20, 34)):
    a = np.array(img)
    opaque = a[:, :, 3] > 0
    edge = np.zeros_like(opaque)
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        edge |= np.roll(np.roll(opaque, dy, axis=0), dx, axis=1)
    edge &= ~opaque
    edge[0, :] = edge[-1, :] = False
    edge[:, 0] = edge[:, -1] = False
    out = a.copy()
    out[edge] = [colour[0], colour[1], colour[2], 235]
    return Image.fromarray(out, "RGBA")


def cutout(src):
    arr = np.array(Image.open(src).convert("RGB"))
    bg = bg_colour(arr)
    rgb16 = arr.astype(np.int16)
    # 진짜 마젠타는 R·B가 함께 높다. 평균을 쓰면 진홍(적발)·주황이 마젠타로 오인돼 사라진다.
    magenta = np.minimum(rgb16[:, :, 0], rgb16[:, :, 2]) - rgb16[:, :, 1]
    dist_bg = np.sqrt(((rgb16 - bg) ** 2).sum(axis=2))

    opaque = ~border_flood((dist_bg < BG_TOL) | (magenta > 90))
    opaque &= ~(magenta > MAGENTA_TOL)
    interior = ~border_flood(~opaque) & ~opaque
    opaque |= interior

    base = neutralise(arr, (magenta >= 25) & opaque)
    blur = np.array(Image.fromarray(base).filter(ImageFilter.GaussianBlur(5)))
    base[~opaque] = blur[~opaque]
    return Image.fromarray(base, "RGB"), Image.fromarray((opaque * 255).astype(np.uint8), "L")


def process_sprite(src, dst, target=(176, 240), outline=True, align="bottom", colors=32, scale=4,
                   color=1.14, contrast=1.06, bright=1.0, top_bias=0.0):
    img, alpha = cutout(src)
    am = np.array(alpha) > 0
    rgb = despill(np.array(img), am)
    rgb = fill_outside(rgb, am)
    img = Image.fromarray(rgb, "RGB")
    bbox = alpha.getbbox()
    if bbox:
        img, alpha = img.crop(bbox), alpha.crop(bbox)
    img = ImageEnhance.Color(img).enhance(color)
    img = ImageEnhance.Contrast(img).enhance(contrast)
    if bright != 1.0:
        img = ImageEnhance.Brightness(img).enhance(bright)

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
    out = defringe(clean_specks(quantise(rgba, colors=colors)))
    if outline:
        out = add_outline(out)
    out.resize((tw * scale, th * scale), Image.NEAREST).save(dst)
    return out


def process_scene(src, dst, target=(400, 225), colors=48, scale=2):
    img = Image.open(src).convert("RGB")
    img = ImageEnhance.Color(img).enhance(1.08)
    small = img.resize(target, Image.LANCZOS)
    out = quantise(small.convert("RGBA"), colors=colors).convert("RGB")
    out.resize((target[0] * scale, target[1] * scale), Image.NEAREST).save(dst)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("mode", nargs="?", default="all", choices=["all", "sprites", "portraits", "scenes"])
    ap.add_argument("root", nargs="?", default=".")
    ap.add_argument("--only", default="")
    # 초상화 톤 — 파스텔 모던 도트 기준(var2): 채도·대비를 낮게, 밝기는 살짝 올린다.
    ap.add_argument("--pcolor", type=float, default=1.10)
    ap.add_argument("--pcontrast", type=float, default=1.04)
    ap.add_argument("--pbright", type=float, default=1.05)
    args = ap.parse_args()
    base = Path(args.root)
    raw = base / "assets" / "raw"
    out = base / "assets"
    only = set(filter(None, args.only.split(",")))
    made = []

    if args.mode in ("all", "sprites"):
        for name, dst in SPRITES:
            if only and name not in only:
                continue
            src = raw / f"{name}.png"
            if not src.exists():
                print("skip", src)
                continue
            small = process_sprite(src, out / dst)
            made.append((dst, small))
            print(f"assets/{dst}  {Image.open(out / dst).size}")
    if args.mode in ("all", "portraits"):
        for name, dst in PORTRAITS:
            if only and name not in only:
                continue
            src = raw / f"{name}.png"
            if not src.exists():
                print("skip", src)
                continue
            process_sprite(src, out / dst, target=(240, 240), outline=False, align="center", scale=3,
                           colors=48, color=args.pcolor, contrast=args.pcontrast, bright=args.pbright)
            print(f"assets/{dst}  {Image.open(out / dst).size}")
    if args.mode in ("all", "scenes"):
        for name, dst in SCENES:
            if only and name not in only:
                continue
            src = raw / f"{name}.png"
            if not src.exists():
                print("skip", src)
                continue
            process_scene(src, out / dst)
            print(f"assets/{dst}  {Image.open(out / dst).size}")
    if made:
        w = 176 * 2
        sheet = Image.new("RGBA", ((w + 16) * len(made), 480), (20, 22, 32, 255))
        for i, (_, small) in enumerate(made):
            sheet.alpha_composite(small.resize((w, 480), Image.NEAREST), (i * (w + 16), 0))
        sheet.save(out / "_sheet.png")
        print("sheet assets/_sheet.png")


if __name__ == "__main__":
    main()
