#!/usr/bin/env python3
# tools/qa_voice.py — 대사 목소리·리듬 검수
# 진단서 부록 A의 측정을 그대로 쓰고, §6 목표 수치(Q표)를 PASS/FAIL로 판정한다.
#   python3 tools/qa_voice.py          검수 (실패 시 exit 1)
#   python3 tools/qa_voice.py --verbose  인물별·편지별 상세
import re, sys, collections

FILES = ['js/data-act1.js', 'js/data-nights.js', 'js/data-letters.js', 'js/data-roster.js']
CONN = re.compile(r'[가-힣](?:고|며|서|는데|지만|면|다가|니까|러|게|지|면서|도록|므로),')
CONN_ANY = re.compile(r'[가-힣](?:고|며|서|는데|지만|면|다가|니까|러|게|지|면서|도록|므로)(?=[,.!?\s\'"」』]|$)')
LINE = re.compile(r"\{[^{}\n]*?who:'([a-z]+)'[^{}\n]*?\bt:'((?:[^'\\]|\\.)*)'")
BODY = re.compile(r"^\s{4}'((?:[^'\\]|\\.){12,})',\s*$", re.M)
NUM_SUB = re.compile(r'[0-9０-９]|[+\-−]\s*\d|금화|HP|신뢰\s*[+\-]|민심\s*[+\-]|신앙\s*[+\-]')
ELL_OK = {'serena', 'oskar'}          # V5: `…`는 셀레나·오스카만
VERBOSE = '--verbose' in sys.argv

def load(f): return open(f, encoding='utf-8').read()

def spoken(s):  return [(w, t) for w, t in LINE.findall(s)]

def bodies(s):  return BODY.findall(s)

def josa(t):  # 지문/대사 공통 문장 분해
    return [x for x in re.split(r'(?<=[.!?])\s+', t.strip()) if x]

def sentences(t):  # 종결 부호 수 (계측용)
    return len(re.findall(r'[.!?]', t))

fails = []
def check(name, ok, detail):
    print(f"  [{'PASS' if ok else 'FAIL'}] {name:<34} {detail}")
    if not ok: fails.append(name)

print('══ 1. 파일별 기본량 ══')
all_lines = []
for f in FILES:
    s = load(f)
    L = [t for _, t in spoken(s)] + bodies(s)
    n = len(L) or 1
    one = sum(1 for t in L if sentences(t) <= 1)
    print(f"{f:22s} 줄={len(L):4d} 1문장={one/n*100:5.1f}% 평균={sum(map(len,L))/n:5.1f}자 "
          f"말줄임={sum(t.count('…') for t in L)/n*100:5.1f}%/100줄 물음표={sum(t.count('?') for t in L)} "
          f"연결어미쉼표={len(CONN.findall(s))}")
    all_lines += [t for _, t in spoken(s)]

# ── 대상: 1막 대사 (편지는 문단 단위라 S1·S2에서 제외, 부록 A 주석과 동일)
act_spoken = spoken(load('js/data-act1.js'))
night_spoken = spoken(load('js/data-nights.js'))
roster_spoken = spoken(load('js/data-roster.js'))
dlg = act_spoken + night_spoken + roster_spoken
dtxt = [t for _, t in dlg]
n = len(dtxt) or 1
one_ratio = sum(1 for t in dtxt if sentences(t) <= 1) / n * 100
avg_len = sum(map(len, dtxt)) / n
ell = sum(t.count('…') for t in dtxt)
q = sum(t.count('?') for t in dtxt)

print('\n══ 2. 문장 목표 (S1·S2·Q) ══')
print(f"  대사 {n}줄 · 지문 제외")
check('1문장 대사 비율 ≥60%', one_ratio >= 60, f"{one_ratio:.1f}%")
check('대사 평균 길이 ≤24자', avg_len <= 24, f"{avg_len:.1f}자")

# ── 인물별 리듬 (1막 본편 + 밤 + 허브)
d = collections.defaultdict(list)
for w, t in dlg: d[w].append(t)
avgs = {}
for w, ts in sorted(d.items(), key=lambda x: -sum(map(len, x[1])) / len(x[1])):
    if len(ts) < 4: continue
    a = sum(map(len, ts)) / len(ts); avgs[w] = a
    if VERBOSE:
        print(f"    {w:9s} n={len(ts):3d} 평균={a:5.1f}자 …={sum(t.count('…') for t in ts)}")
spread = max(avgs.values()) / min(avgs.values())
print(f"  길이 편차 최장/최단 = {spread:.2f}배 ({max(avgs,key=avgs.get)} {max(avgs.values()):.1f} / {min(avgs,key=avgs.get)} {min(avgs.values()):.1f})")
check('인물별 길이 편차 ≥2.0배', spread >= 2.0, f"{spread:.2f}배")

# ── 물음표: 선택지가 있는 사건마다 1개 이상
src = load('js/data-act1.js')
ev_blocks = re.split(r"\n\{\n  id:'", src)[1:]
noq = []
for b in ev_blocks:
    eid = b.split("'")[0]
    if "label:'" not in b: continue   # dynamic(14일 밤)처럼 선택지가 없는 사건은 제외
    if '?' not in b: noq.append(eid)
check('사건당 물음표 ≥1', not noq, f"누락 {len(noq)}건 {noq if noq else ''}")

# ── 말줄임표
check('말줄임표 ≤5/100줄', ell / n * 100 <= 5, f"{ell}개 = {ell/n*100:.1f}/100줄")
bad_ell = sorted({w for w, t in dlg if '…' in t} - ELL_OK)
check('`…` 사용 인물 제한', not bad_ell, f"위반 {bad_ell if bad_ell else '없음'}")
start_ell = [(w, t[:14]) for w, t in dlg if t.lstrip().startswith('…')]
check('줄 시작 `…` 금지', not start_ell, f"{len(start_ell)}건 {start_ell[:3] if start_ell else ''}")

# ── 연결어미 뒤 쉼표
tot_c, all_c = 0, 0
for f in FILES:
    s = load(f)
    tot_c += len(CONN.findall(s)); all_c += len(CONN_ANY.findall(s))
rate = tot_c / (all_c or 1) * 100
check('연결어미+쉼표 ≤8%', rate <= 8, f"{tot_c}/{all_c} = {rate:.1f}%")

print('\n══ 3. 편지 (L1·L3·L7) ══')
ls = load('js/data-letters.js')
# 편지별 본문 묶음
letters = re.split(r"\n\{\n  id:'L_", ls)[1:]
lens, firsts, nreply, nreply_dlg, short = [], [], 0, 0, 0
for b in letters:
    lid = 'L_' + b.split("'")[0]
    body = BODY.findall(b)
    plens = [len(p) for p in body]
    L = sum(plens); lens.append(L)
    if body: firsts.append(body[0].strip())
    if len(body) and L <= 120: short += 1
    # 답장 결과
    for rm in re.finditer(r"res:\[(.*?)\]\s*\}\s*,?\s*(?=\n\s*\{ tone:|\n\s*\]\s*,)", b, re.S):
        pass
    # 간단히: 각 tone 블록
    for block in re.split(r"\{ tone:'", b)[1:]:
        nreply += 1
        res_part = block.split('res:[')[1].split(']')[0] if 'res:[' in block else ''
        if "who:'" in res_part: nreply_dlg += 1
    if VERBOSE: print(f"    {lid:16s} {L:4d}자 문단{len(body)}")
import statistics as st
sd = st.pstdev(lens)
sr = sum(1 for x in firsts if x.startswith('영주님')) / (len(firsts) or 1) * 100
print(f"  편지 {len(lens)}통 · 길이 {min(lens)}~{max(lens)}자 평균 {sum(lens)/len(lens):.0f} 표준편차 {sd:.1f}")
check('편지 길이 표준편차 ≥60자', sd >= 60, f"{sd:.1f}자")
check('편지 첫 줄 `영주님` ≤20%', sr <= 20, f"{sr:.0f}% ({sum(1 for x in firsts if x.startswith('영주님'))}/{len(firsts)})")
check('짧은 편지(≤120자) 3통↑', short >= 3, f"{short}통")
rd = nreply_dlg / (nreply or 1) * 100
check('답장 결과에 인물 대사 ≥70%', rd >= 70, f"{nreply_dlg}/{nreply} = {rd:.0f}%")

print('\n══ 4. 선택지 (C1·C3) ══')
labels = re.findall(r"label:'((?:[^'\\]|\\.)*)'", src)
subs = re.findall(r"sub:'((?:[^'\\]|\\.)*)'", src)
notsp = [l for l in labels if not (l.startswith('"') and l.endswith('"'))]
check('선택지 주인공 발화 100%', not notsp, f"{len(labels)-len(notsp)}/{len(labels)} · 위반 {notsp[:3] if notsp else '없음'}")
numsub = [x for x in subs if NUM_SUB.search(x)]
check('선택지 sub 수치 0', not numsub, f"위반 {numsub[:3] if numsub else '없음'}")
print(f"  선택지 {len(labels)}택 · sub {len(subs)}")

print('\n══ 5. 재료 재사용 (V7) ══')
sent = collections.defaultdict(set)
for f in FILES:
    for t in [x for _, x in spoken(load(f))] + bodies(load(f)):
        for x in josa(t):
            if len(x.strip()) > 12: sent[x.strip()].add(f)
dup = {k: v for k, v in sent.items() if len(v) > 1}
check('파일 간 동일 문장 0', not dup, f"{len(dup)}건")
for k, v in list(dup.items())[:6]: print('     ·', k[:50], sorted(v))

print('\n══ 6. 금지어 ══')
all_text = ''.join(load(f) for f in FILES)
banned = {w: all_text.count(w) for w in ['엘프', '메르테아', '메르테이아', '도호', '레데브로크', '인류']}
check('금지어 0회', sum(banned.values()) == 0, str(banned))

print()
if fails:
    print(f"FAIL {len(fails)}건: " + ', '.join(fails)); sys.exit(1)
print("ALL PASS — 대사 목소리·리듬 목표 수치를 모두 통과했다.")
