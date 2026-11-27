#!/usr/bin/env python3
"""변경 인물 41인의 초상·전신을 생성하고 도트로 후처리한다.

  python3 tools/genchars.py --limit 12          # 아직 없는 것부터 최대 12장 생성
  python3 tools/genchars.py --only greta,sable  # 특정 인물만
  python3 tools/genchars.py --kind face         # 초상만
  python3 tools/genchars.py --pixelize          # 생성된 원본을 도트로 후처리만
  python3 tools/genchars.py --force --only gam  # 다시 생성
"""
import argparse
import importlib.util
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
RAW = ROOT / 'assets' / 'raw'
OUT = ROOT / 'assets'

spec = importlib.util.spec_from_file_location('pix', HERE / 'pixelize.py')
pix = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pix)
art = importlib.util.spec_from_file_location('art_specs', HERE / 'art_specs.py')
art_specs = importlib.util.module_from_spec(art)
art.loader.exec_module(art_specs)

IDS = list(art_specs.SPECS)


def raw_path(cid, kind):
    return RAW / (f'{cid}_face.png' if kind == 'face' else f'{cid}.png')


def generate(cid, kind):
    dst = raw_path(cid, kind)
    RAW.mkdir(parents=True, exist_ok=True)
    p = subprocess.run(['images', art_specs.prompt(cid, kind), '--out', str(dst)],
                       capture_output=True, text=True)
    if p.returncode != 0 or not dst.exists():
        return False, (p.stderr or p.stdout).strip()[:300]
    return True, dst


def pixelize(cid, kind):
    src = raw_path(cid, kind)
    if not src.exists():
        return None
    if kind == 'face':
        pix.process_sprite(src, OUT / f'{cid}_portrait.png', target=(240, 240), outline=False,
                           align='center', scale=3, colors=48,
                           color=1.18, contrast=1.05, bright=1.06)
        return OUT / f'{cid}_portrait.png'
    pix.process_sprite(src, OUT / f'{cid}.png', color=1.20, contrast=1.06, bright=1.02)
    return OUT / f'{cid}.png'


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--only', default='')
    ap.add_argument('--kind', default='', choices=['', 'face', 'body'])
    ap.add_argument('--limit', type=int, default=0)
    ap.add_argument('--force', action='store_true')
    ap.add_argument('--pixelize', action='store_true')
    args = ap.parse_args()

    only = [x for x in args.only.split(',') if x]
    ids = [i for i in IDS if not only or i in only]
    kinds = [args.kind] if args.kind else ['face', 'body']
    jobs = [(i, k) for i in ids for k in kinds]
    if not args.pixelize:
        jobs = [j for j in jobs if args.force or not raw_path(*j).exists() or raw_path(*j).stat().st_size < 20000]
    if args.limit:
        jobs = jobs[:args.limit]

    made = 0
    for cid, kind in jobs:
        if args.pixelize:
            out = pixelize(cid, kind)
            print(('ok  ' if out else 'skip') + f' {cid} {kind}', flush=True)
            continue
        ok, info = generate(cid, kind)
        if not ok:
            print(f'FAIL {cid} {kind}: {info}', flush=True)
            continue
        out = pixelize(cid, kind)
        made += 1
        print(f'{made}. {cid} {kind} -> {out.name if out else "-"}', flush=True)
    print(f'done {len(jobs)} jobs')


if __name__ == '__main__':
    main()
