/* ══════════════════════════════════════════════════════════════
   오프닝 프롤로그 · 첫날 가이드
   새 게임을 시작하면 4장짜리 비주얼 노벨 프롤로그가 열리고,
   그 뒤 첫날 튜토리얼 배너가 4단계를 안내한다. ? 가이드로 언제든 다시 연다.
   ══════════════════════════════════════════════════════════════ */

const PROLOGUE = [
  {
    bg: 'bg_castle', chapter: '제1장 · 빈 영주',
    lines: [
      { t: 'narr', text: '신성 타이셀 왕국 북부. 왕도의 지도에는 검은 잉크로만 표시된 땅이 있다. 아르덴 변경.' },
      { t: 'narr', text: '전임 영주는 지난겨울 검은숲으로 사냥을 나간 뒤 돌아오지 않았다. 왕가는 그의 이름을 장부에서 지웠고, 그 자리에 왕도에서 가장 젊은 서기 하나를 앉혔다.' },
      { t: 'narr', text: '…그게 당신이다.' },
      { who: '카엘', portrait: 'kael', text: '성벽은 아직 서 있습니다. 병사는 여덟, 성문은 밤이면 닫히고 아침이면 다시 열리지요.' },
      { who: '카엘', portrait: 'kael', text: '영주님, 이 영지에는 세 가지가 없습니다. 돈, 사람, 그리고 시간.' },
    ],
  },
  {
    bg: 'bg_chapel', chapter: '제2장 · 교단의 눈',
    lines: [
      { t: 'narr', text: '성당의 푸른 유리창 너머로 하이레프티아의 빛이 기울었다. 변경의 성당은 왕도의 그것보다 낡았고, 더 조용했다.' },
      { who: '셀레나', portrait: 'serena', text: '헤레테븐에서 파견된 서기관, 셀레나입니다. 이곳의 기록을 맡겠습니다.' },
      { who: '셀레나', portrait: 'serena', text: '…교단은 변경의 이단을 살피고 있습니다. 보고서 마지막 장에 이름을 적어 보내라고 지시받았습니다.' },
      { who: '스가르테론', portrait: 'sgarteron', text: '신의 일은 서두르지 않습니다. 다만, 잊지도 않지요. 영주님의 첫 보고서를 기다리겠습니다.' },
    ],
  },
  {
    bg: 'bg_forest', chapter: '제3장 · 검은숲의 깃발',
    lines: [
      { t: 'narr', text: '성벽 밖은 눈이었다. 검은 나무가 눈을 이고 서 있고, 그 사이로 붉은 깃발이 흔들렸다.' },
      { who: '라나', portrait: 'lana', text: '외뿔의 용병단이다. 이 숲에서 굶어 죽을 놈들을 먹여 살리는 게 우리 일이지.' },
      { who: '라나', portrait: 'lana', text: '헐값짜리 영주라면 값을 매기지 않겠다. …값을 매길 만한 영주라면, 내가 먼저 찾아오지.' },
      { t: 'narr', text: '숲 깊은 곳에서 늑대 울음이 한 번, 두 번. 밤이 짧아지고 있었다.' },
    ],
  },
  {
    bg: 'bg_castle', chapter: '제4장 · 첫날',
    lines: [
      { t: 'narr', text: '첫날의 해가 떴다. 책상 위에는 빈 장부와, 아직 봉하지 않은 편지 한 장이 놓여 있다.' },
      { who: '카엘', portrait: 'kael', text: '영주님. 오늘 하루는 영주님의 것입니다. 어디서 시작하시겠습니까.' },
      { t: 'narr', text: '영지는 기다린다. 당신이 무엇을 먼저 할지.' },
    ],
  },
];

/* ── 첫날 가이드 4단계 ─────────────────────────────────────── */
const GUIDE_STEPS = [
  { k: 'visit', icon: '🗺', title: '영지 지도에서 장소로 간다',
    text: '지도 아래의 장소 카드를 누르면 성채 집무실 · 상회 · 성당 · 공방 · 주점 · 검은숲으로 이동합니다. 장소마다 할 수 있는 일과 사람이 다릅니다.' },
  { k: 'talk', icon: '💬', title: '사람과 대화하고 선물한다',
    text: '장소의 인물을 누르면 대화가 열립니다. 선택지를 고르면 호감도가 오르고, 선물은 하루에 한 번. 호감도 200에서 개인사, 500에서 마음속 이야기가 열립니다.' },
  { k: 'dev', icon: '🏗', title: '상회 · 집무실로 영지를 키운다',
    text: '상회에서 물건을 사고팔고, 집무실에서 시설을 올립니다. 세금과 생산은 하루가 끝날 때 정산됩니다.' },
  { k: 'sleep', icon: '🛏', title: '행동력을 쓰고 하루를 마감한다',
    text: '행동력은 오전 · 오후 · 밤에 걸쳐 4~5칸. 다 쓰면 오른쪽 위 "🛏 하루 마감"으로 다음 날로 넘어갑니다.' },
];

/* ── 프롤로그 렌더 ─────────────────────────────────────────── */
let PL = { ch: 0, ln: 0 };

function prologueDone() {
  const el = $('#prologueView');
  if (el) el.remove();
  const s = G.state;
  if (s) { s.tut = s.tut || {}; s.tut.seenP = true; saveGame(); }
  G.screen = { view: 'map' };
  render();
  setTimeout(() => { if (s) openGuide(true); }, 420);
}

function renderPrologue() {
  const el = $('#prologueView');
  if (!el) return;
  const chap = PROLOGUE[PL.ch];
  const line = chap.lines[PL.ln];
  const last = PL.ch === PROLOGUE.length - 1 && PL.ln === chap.lines.length - 1;
  el.innerHTML = `
    <div class="pl-bg" style="background-image:url('assets/${chap.bg}.png?v=${ASSET_VER}')"></div>
    <div class="pl-veil"></div>
    ${line.portrait ? `<img class="pl-char px" src="assets/${line.portrait}.png?v=${ASSET_VER}" ${IMG_FALLBACK} alt="">` : ''}
    <div class="pl-top">
      <span class="pl-chapter">${chap.chapter}</span>
      <button class="pl-skip" id="plSkip">건너뛰기 ✕</button>
    </div>
    <div class="pl-box ${line.who ? '' : 'narr'}">
      ${line.who ? `<div class="pl-who">${line.who}</div>` : ''}
      <p class="pl-text">${line.text}</p>
      <div class="pl-foot">
        <span class="pl-dots">${PROLOGUE.map((_, i) => `<i class="${i <= PL.ch ? 'on' : ''}"></i>`).join('')}</span>
        <button class="pl-next" id="plNext">${last ? '영지로 나간다' : '다음 ›'}</button>
      </div>
    </div>`;
  $('#plSkip').addEventListener('click', e => { e.stopPropagation(); prologueDone(); });
  $('#plNext').addEventListener('click', e => { e.stopPropagation(); nextPrologue(); });
}

function nextPrologue() {
  const chap = PROLOGUE[PL.ch];
  if (PL.ln < chap.lines.length - 1) PL.ln++;
  else if (PL.ch < PROLOGUE.length - 1) { PL.ch++; PL.ln = 0; renderPrologue(); return; }
  else { prologueDone(); return; }
  renderPrologue();
}

function openPrologue() {
  PL = { ch: 0, ln: 0 };
  const el = document.createElement('div');
  el.className = 'prologue'; el.id = 'prologueView';
  document.body.appendChild(el);
  renderPrologue();
}

/* ── 가이드 ───────────────────────────────────────────────── */
function guideStepNow(s) {
  const t = s.tut || {};
  const d = t.done || {};
  const idx = GUIDE_STEPS.findIndex(g => !d[g.k]);
  return idx < 0 ? 4 : idx;
}

function tutorialBanner() {
  const s = G.state;
  const t = s.tut || {};
  const d = t.done || {};
  if (!t.on || GUIDE_STEPS.every(g => d[g.k])) return '';
  const cur = guideStepNow(s);
  const g = GUIDE_STEPS[cur] || GUIDE_STEPS[3];
  return `
    <button class="tut-banner" id="tutBanner">
      <span class="tut-head"><span class="tut-badge">첫날 가이드 ${cur + 1}/4</span>
        <span class="tut-dots">${GUIDE_STEPS.map((x, i) => `<i class="${d[x.k] ? 'on' : (i === cur ? 'now' : '')}"></i>`).join('')}</span></span>
      <span class="tut-body"><b>${g.icon} ${g.title}</b><span>${g.text}</span></span>
      <span class="tut-more">가이드 열기 ›</span>
    </button>`;
}

function openGuide(first) {
  const s = G.state;
  if (!s) return;
  const d = (s.tut && s.tut.done) || {};
  const cur = guideStepNow(s);
  openModal(`
    <div class="ev-kicker">🧭 ${first ? '영지에 도착했다' : '영지 가이드'}</div>
    <h2 class="ev-title">${first ? '첫날, 이렇게 시작하면 된다' : '영지 가이드'}</h2>
    <p class="hint mb6">막혔을 때는 오른쪽 위 <b>? 가이드</b>를 누르면 언제든 이 창이 열린다.</p>
    <div class="guide-list">
      ${GUIDE_STEPS.map((g, i) => `
        <div class="guide-step ${d[g.k] ? 'done' : (i === cur ? 'now' : '')}">
          <div class="gs-no">${d[g.k] ? '✓' : '0' + (i + 1)}</div>
          <div class="gs-body"><b>${g.icon} ${g.title}</b><span>${g.text}</span></div>
        </div>`).join('')}
    </div>
    <div class="guide-tips">
      <div><b>행동력</b> 한 칸 = 한 번의 행동. 오전 · 오후 · 밤에 걸쳐 4~5칸.</div>
      <div><b>호감도</b> 200에서 개인사, 500에서 마음속 이야기, 800에서 고백.</div>
      <div><b>선물</b>은 하루 한 번. 인물마다 좋아하는 물건이 다르다.</div>
      <div><b>기록</b> 탭에서 호감도 · 의뢰 · 가족을 다시 볼 수 있다.</div>
    </div>
    <button class="btn primary wide mt8" id="guideOk">${first ? '알겠다, 시작한다' : '닫기'}</button>`);
  $('#guideOk').addEventListener('click', closeModal);
}

/* 단계 완료 표시 */
function tutMark(key) {
  const s = G.state;
  if (!s) return;
  s.tut = s.tut || { done: {}, on: true };
  s.tut.done = s.tut.done || {};
  if (s.tut.done[key]) return;
  const before = guideStepNow(s);
  s.tut.done[key] = true;
  const all = GUIDE_STEPS.every(g => s.tut.done[g.k]);
  if (all) {
    s.tut.on = false;
    setTimeout(() => toast('🎓 첫날 가이드 완료 — 이제 영지의 주인은 당신이다.', 'good'), 300);
  } else {
    setTimeout(() => toast(`가이드 ${before + 1}/4 완료`, 'good'), 300);
  }
  saveGame();
}
