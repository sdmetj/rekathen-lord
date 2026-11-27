#!/usr/bin/env python3
"""코어·주역 인물 초상·전신을 새로 뽑고 최신 pixelize 파이프라인으로 후처리한다.

  python3 tools/gencore.py --only serena --kind face   # 한 장만
  python3 tools/gencore.py --only serena,kael          # 지정 인물 초상+전신
  python3 tools/gencore.py --pixelize --only serena    # 이미 뽑은 원본만 후처리
  python3 tools/gencore.py --force                     # 전원 다시 생성

원본은 assets/raw/{id}_face.png · {id}.png 에 덮어쓰고(이전 원본은 assets/raw/_prev 로),
결과는 assets/{id}_portrait.png · {id}.png 로 저장한다.
"""
import argparse
import importlib.util
import shutil
import subprocess
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
RAW = ROOT / 'assets' / 'raw'
PREV = RAW / '_prev'
OUT = ROOT / 'assets'


def _load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


pix = _load('pix', HERE / 'pixelize.py')
core = _load('art_core', HERE / 'art_specs_core.py')

IDS = list(core.SPECS)

# 인물별 후처리 보정 — 흰 머리·검은 옷처럼 극단적인 색은 기본 파스텔 톤에서 뭉개진다.
PIXEL_OVERRIDES = {
    'greta': {
        'face': dict(color=1.12, contrast=1.06, bright=0.98),
    },
    'ellen': {
        'face': dict(color=1.16, contrast=1.07, bright=0.98),
        'body': dict(color=1.18, contrast=1.10, bright=1.14),
    },
}
FACE_PARAMS = dict(target=(240, 240), outline=False, align='center', scale=3, colors=48,
                   color=1.10, contrast=1.04, bright=1.05)
BODY_PARAMS = dict(color=1.20, contrast=1.06, bright=1.02)


def raw_path(cid, kind):
    return RAW / (f'{cid}_face.png' if kind == 'face' else f'{cid}.png')


def generate(cid, kind):
    dst = raw_path(cid, kind)
    RAW.mkdir(parents=True, exist_ok=True)
    if dst.exists():
        PREV.mkdir(parents=True, exist_ok=True)
        shutil.copy2(dst, PREV / dst.name)
    p = subprocess.run(['images', core.prompt(cid, kind), '--out', str(dst)],
                       capture_output=True, text=True)
    if p.returncode != 0 or not dst.exists():
        return False, (p.stderr or p.stdout).strip()[:300]
    return True, dst


def pixelize(cid, kind):
    src = raw_path(cid, kind)
    if not src.exists():
        return None
    over = PIXEL_OVERRIDES.get(cid, {}).get(kind, {})
    if kind == 'face':
        pix.process_sprite(src, OUT / f'{cid}_portrait.png', **{**FACE_PARAMS, **over})
        return OUT / f'{cid}_portrait.png'
    pix.process_sprite(src, OUT / f'{cid}.png', **{**BODY_PARAMS, **over})
    return OUT / f'{cid}.png'


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--only', default='')
    ap.add_argument('--kind', default='', choices=['', 'face', 'body'])
    ap.add_argument('--force', action='store_true')
    ap.add_argument('--pixelize', action='store_true')
    args = ap.parse_args()

    only = [x for x in args.only.split(',') if x]
    ids = [i for i in IDS if not only or i in only]
    kinds = [args.kind] if args.kind else ['face', 'body']
    for cid in ids:
        for kind in kinds:
            if args.pixelize:
                out = pixelize(cid, kind)
                print(('ok  ' if out else 'skip') + f' {cid} {kind}', flush=True)
                continue
            src = raw_path(cid, kind)
            if src.exists() and not args.force:
                print(f'skip {cid} {kind} (raw exists)', flush=True)
                continue
            ok, info = generate(cid, kind)
            if not ok:
                print(f'FAIL {cid} {kind}: {info}', flush=True)
                continue
            out = pixelize(cid, kind)
            print(f'ok  {cid} {kind} -> {out.name if out else "-"}', flush=True)


if __name__ == '__main__':
    main()
