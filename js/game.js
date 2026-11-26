/* ─────────────────────────────────────────────────────────────
   레카텐 변경 영주 — 엔진
   ───────────────────────────────────────────────────────────── */
(() => {
'use strict';

const SAVE_KEY = 'rekathen-lord.save.v1';
const MAX_DAY = 30;
const $ = (s, r = document) => r.querySelector(s);
const screenEl = $('#screen');
const hudEl = $('#hud');
const tabsEl = $('#tabs');
const overlayEl = $('#overlay');
const toastEl = $('#toast');

let state = null;

/* ── 유틸 ─────────────────────────────── */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const won = n => n.toLocaleString('ko-KR');

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function priceOf(id, day) {
  const f = 0.72 + ((hash(id + '#' + day) % 1000) / 1000) * 0.68;
  return Math.max(1, Math.round(ITEMS[id].base * f));
}
const buyPrice = id => Math.round(priceOf(id, state.day) * 1.28);

function josa(word, withBatchim, without) {
  const c = word.charCodeAt(word.length - 1) - 0xAC00;
  const has = c >= 0 && c < 11172 && c % 28 !== 0;
  return has ? withBatchim : without;
}

function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toastEl.classList.remove('show'), 1700);
}

/* ── 상태 ─────────────────────────────── */
function newState() {
  return {
    v: 1, day: 1, gold: 130, troops: 36, morale: 52, faith: 48,
    hp: 60, maxHp: 60, atk: 8,
    inv: { herb: 2, iron: 1, pelt: 0, mana: 0, potion: 1, sword: 0, cloak: 0, lamp: 0 },
    aff: { serena: 0, mira: 0 },
    talked: { serena: false, mira: false },
    gifted: { serena: false, mira: false },
    flags: {}, seen: {}, journal: [],
    pending: null, battle: null, lastResult: null,
    ended: false, ending: null, tab: 'estate', startedAt: Date.now(),
  };
}
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) {} }
function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s || s.v !== 1) return null;
    return s;
  } catch (e) { return null; }
}
function wipe() { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} }

/* ── HUD ─────────────────────────────── */
const STATS = [
  { key: 'gold',   label: '재정',       icon: '◈', max: 400, fmt: v => won(v) },
  { key: 'troops', label: '병력',       icon: '⚔', max: 80,  fmt: v => v },
  { key: 'morale', label: '민심',       icon: '♨', max: 100, fmt: v => v },
  { key: 'faith',  label: '교단 신뢰',  icon: '✝', max: 100, fmt: v => v },
];

function renderHUD(changed = []) {
  $('#dayNum').textContent = state.day;
  const box = $('#stats');
  box.innerHTML = STATS.map(s => {
    const v = state[s.key];
    const pct = clamp((v / s.max) * 100, 0, 100);
    const danger = (s.key !== 'gold' && v <= 20) || (s.key === 'gold' && v <= 20);
    const cls = changed.includes(s.key) ? ' stat bump' : '';
    return `<div class="stat${danger ? ' danger' : ''}${cls}">
      <div class="stat-label"><i>${s.icon}</i>${s.label}</div>
      <div class="stat-val">${s.fmt(v)}</div>
      <div class="stat-bar"><span style="width:${pct}%"></span></div>
    </div>`;
  }).join('');
  requestAnimationFrame(() => {
    box.querySelectorAll('.bump').forEach(el => el.classList.remove('bump'));
  });
}

function flashStats(changed) {
  if (!changed.length) return;
  const box = $('#stats');
  STATS.forEach((s, i) => {
    if (!changed.includes(s.key)) return;
    const el = box.children[i];
    if (!el) return;
    el.classList.add('up');
    setTimeout(() => el.classList.remove('up'), 760);
  });
}

/* ── 화면 라우팅 ─────────────────────── */
function render() {
  if (!state) return renderTitle();
  hudEl.classList.remove('hidden');
  renderHUD();
  if (state.ended) { tabsEl.classList.add('hidden'); return renderEnding(); }
  tabsEl.classList.remove('hidden');
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === state.tab));
  if (state.battle) return renderBattle();
  if (state.tab === 'market') return renderMarket();
  if (state.tab === 'people') return renderPeople();
  if (state.tab === 'journal') return renderJournal();
  return renderEstate();
}

/* ── 타이틀 ───────────────────────────── */
function renderTitle() {
  hudEl.classList.add('hidden');
  tabsEl.classList.add('hidden');
  const saved = load();
  screenEl.innerHTML = `
    <div class="title-wrap">
      <div class="title-lead">REKATHEN · A MARCH IN WINTER</div>
      <h1 class="title-main">레카텐 <em>변경 영주</em></h1>
      <div class="title-sub">서른 날의 겨울, 하나의 작은 영지</div>
      <div class="title-art"><img src="assets/lord.png" alt="영주"></div>
      <p class="title-quote">마왕이 오기 전의 이야기.<br>신성 타이셀 왕국의 북쪽 끝,<br>검은숲과 맞닿은 작은 변경령에서<br>당신은 겨울 하나를 견뎌야 한다.</p>
      ${saved ? `<button class="btn-primary" data-act="continue">이어하기 · Day ${saved.day}</button>` : ''}
      <button class="btn-ghost" data-act="new">새 게임 시작</button>
      <div class="title-note">《외뿔의 악마》 세계관 · 비공식 팬 프로토타입<br>수치는 자동 저장됩니다 · 세로 화면 최적화</div>
    </div>`;
}

/* ── 영지(이벤트) ─────────────────────── */
function renderEstate() {
  if (!state.pending) pickEvent();
  const ev = state.pending;
  const art = ev.art && ev.art !== 'none' ? `<div class="scene ${ev.art === 'wolf' ? 'wolf' : ''}">
      <span class="scene-tag">${ev.kicker}</span>
      <img src="assets/${ev.art}.png" alt="">
      <span class="scene-line"></span>
    </div>` : `<div class="scene none"><span class="scene-tag">${ev.kicker || '영지'}</span><span class="scene-line"></span></div>`;

  let body;
  if (state.pending.phase === 'result') {
    body = `<div class="result">
      <div class="result-box">${state.pending.resultText || ''}</div>
      <div class="btn-row">
        <button class="btn solid" data-act="next-day">다음 날 →</button>
      </div>
      <div class="foothint">Day ${state.day} · 남은 ${MAX_DAY - state.day}일</div>
    </div>`;
    screenEl.innerHTML = `<div class="card">${art}
      <div class="card-body">
        <div class="kicker">${ev.kicker}</div>
        <h2 class="card-title">${ev.title}</h2>
      </div>${body}</div>`;
    return;
  }

  const choices = ev.choices.map((c, i) => {
    if (c.cond && !c.cond(state)) return '';
    const guards = [];
    let locked = false;
    if (c.req) for (const [k, v] of Object.entries(c.req)) {
      const have = haveOf(k);
      if (have < v) locked = true;
      guards.push(`<span class="tag ${have < v ? 'bad' : ''}">${labelOf(k)} ${won(v)}</span>`);
    }
    if (c.cost) for (const [k, v] of Object.entries(c.cost)) {
      if (v > 0) {
        const have = haveOf(k);
        if (have < v) locked = true;
        guards.push(`<span class="tag ${have < v ? 'bad' : 'gold'}">${labelOf(k)} −${won(v)}</span>`);
      }
    }
    if (c.battle) guards.push(`<span class="tag bad">전투</span>`);
    return `<button class="choice${locked ? ' locked' : ''}" data-act="choose" data-i="${i}" ${locked ? 'disabled' : ''}>
      <span class="ct">${c.t}</span>
      ${guards.length ? `<span class="meta">${guards.join('')}</span>` : ''}
    </button>`;
  }).join('');

  screenEl.innerHTML = `<div class="card">${art}
    <div class="card-body">
      <div class="kicker">${ev.kicker}</div>
      <h2 class="card-title">${ev.title}</h2>
      <div class="narr">${ev.text}</div>
    </div>
    <div class="choices">${choices}</div>
  </div>`;
}

function haveOf(k) {
  if (['gold', 'troops', 'morale', 'faith', 'hp'].includes(k)) return state[k];
  return state.inv[k] || 0;
}

function labelOf(k) {
  if (k === 'gold') return '금화';
  if (k === 'troops') return '병력';
  if (k === 'morale') return '민심';
  if (k === 'faith') return '신뢰';
  if (k === 'hp') return '체력';
  if (ITEMS[k]) return ITEMS[k].name;
  return k;
}

function pickEvent() {
  // romance / story priority
  const forced = EVENTS.find(e => e.weight === 0 && !state.seen[e.id] && (!e.minDay || state.day >= e.minDay) && (!e.cond || e.cond(state)));
  if (forced) return setEvent(forced);

  const pool = EVENTS.filter(e => {
    if (e.weight === 0) return false;
    if (e.once && state.seen[e.id]) return false;
    if (e.minDay && state.day < e.minDay) return false;
    if (e.cond && !e.cond(state)) return false;
    if (e.id === state.lastEventId) return false;
    return true;
  });
  const bag = [];
  pool.forEach(e => { for (let i = 0; i < (e.weight || 1); i++) bag.push(e); });
  const ev = bag.length ? bag[rnd(0, bag.length - 1)] : EVENTS.find(e => e.repeat);
  setEvent(ev);
}
function setEvent(ev) {
  state.pending = { ...ev, phase: 'choice', resultText: null };
  state.lastEventId = ev.id;
  state.seen[ev.id] = true;
  delete state.pending.cond;
  save();
}

/* ── 선택 처리 ────────────────────────── */
function choose(i) {
  const ev = state.pending;
  const c = ev.choices[i];
  if (!c) return;

  if (c.battle) { startBattle(c, ev); return; }

  const changed = applyEffects(c.eff || {}, c.cost);
  ev.phase = 'result';
  ev.resultText = (c.res || '') + effectSummary(c.eff || {}, c.cost);
  state.lastResult = ev.resultText;
  journalAdd(ev.title, c.t, changed);
  flashStats(changed);
  save();
  if (checkFail()) return;
  render();
}

function applyEffects(eff, cost) {
  const changed = [];
  if (cost) for (const [k, v] of Object.entries(cost)) {
    if (v <= 0) continue;
    if (k === 'gold') { state.gold -= v; changed.push('gold'); }
    else if (k === 'troops') { state.troops -= v; changed.push('troops'); }
    else if (k === 'morale') { state.morale -= v; changed.push('morale'); }
    else if (k === 'faith') { state.faith -= v; changed.push('faith'); }
    else if (k === 'hp') { state.hp -= v; changed.push('hp'); }
    else if (k === 'items') { for (const [ik, iv] of Object.entries(v)) state.inv[ik] = Math.max(0, (state.inv[ik] || 0) - iv); }
    else if (state.inv[k] !== undefined) { state.inv[k] -= v; }
  }
  for (const [k, v] of Object.entries(eff)) {
    if (k === 'items') {
      for (const [ik, iv] of Object.entries(v)) state.inv[ik] = Math.max(0, (state.inv[ik] || 0) + iv);
      continue;
    }
    if (k === 'affS') { state.aff.serena = clamp(state.aff.serena + v, 0, 5); changed.push('aff'); continue; }
    if (k === 'affM') { state.aff.mira = clamp(state.aff.mira + v, 0, 5); changed.push('aff'); continue; }
    if (k === 'flags') { v.forEach(f => state.flags[f] = true); continue; }
    if (k in state && typeof state[k] === 'number') {
      state[k] = state[k] + v;
      changed.push(k);
    }
  }
  // clamp bar stats
  ['morale', 'faith'].forEach(k => state[k] = clamp(state[k], 0, 100));
  state.troops = Math.max(0, state.troops);
  state.hp = Math.min(state.hp, state.maxHp);
  return [...new Set(changed)];
}

function effectSummary(eff, cost) {
  const parts = [];
  const add = (label, v, cls) => parts.push(`<span class="tag ${cls}">${label} ${v > 0 ? '+' : '−'}${won(Math.abs(v))}</span>`);
  if (cost) for (const [k, v] of Object.entries(cost)) {
    if (k === 'items') { for (const [ik, iv] of Object.entries(v)) add(ITEMS[ik].name, -iv, 'bad'); continue; }
    if (v > 0) add(labelOf(k), -v, 'bad');
  }
  for (const [k, v] of Object.entries(eff)) {
    if (['items', 'flags'].includes(k)) continue;
    if (k === 'affS') { add('셀레나 호감', v, v > 0 ? 'good' : 'bad'); continue; }
    if (k === 'affM') { add('미라 호감', v, v > 0 ? 'good' : 'bad'); continue; }
    add(labelOf(k), v, v > 0 ? 'good' : 'bad');
  }
  if (eff.items) for (const [ik, iv] of Object.entries(eff.items)) add(ITEMS[ik].name, iv, iv > 0 ? 'good' : 'bad');
  return parts.length ? `<div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:5px">${parts.join('')}</div>` : '';
}

function journalAdd(title, choice, changed) {
  state.journal.unshift({ day: state.day, title, choice });
  if (state.journal.length > 60) state.journal.pop();
}

/* ── 다음 날 ──────────────────────────── */
function nextDay() {
  if (state.day >= MAX_DAY) return finish();
  state.day++;
  state.talked = { serena: false, mira: false };
  state.gifted = { serena: false, mira: false };
  state.pending = null;
  state.lastResult = null;

  // 영지 수입 / 유지비
  const income = Math.round(4 + state.morale / 9);
  const upkeep = Math.ceil(state.troops / 9);
  state.gold += income - upkeep;
  state.hp = clamp(state.hp + 3, 0, state.maxHp);
  if (state.day % 4 === 0 && state.morale < 50) state.morale += 1;
  if (state.day % 5 === 0 && state.faith > 0) state.faith -= 1;

  save();
  if (checkFail()) return;
  pickEvent();
  state.tab = 'estate';
  render();
}

/* ── 실패 판정 ────────────────────────── */
function checkFail() {
  if (state.gold < 0) return finish('ruin_gold');
  if (state.morale <= 0) return finish('ruin_morale');
  if (state.faith <= 0) return finish('ruin_faith');
  if (state.troops <= 0) return finish('ruin_troops');
  if (state.hp <= 0) return finish('ruin_hp');
  return false;
}

function finish(forcedKey) {
  state.ended = true;
  state.ending = forcedKey || decideEnding();
  state.battle = null;
  save();
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function decideEnding() {
  const { gold, troops, morale, faith } = state;
  const a = state.aff;
  if (a.serena >= 4 && a.mira >= 4 && morale >= 60) return 'two';
  if (morale >= 70 && faith >= 60 && gold >= 160) return 'saint';
  if (faith >= 70 && a.serena >= 3) return 'church';
  if (gold >= 180 && a.mira >= 3) return 'merchant';
  if (a.serena <= 1 && a.mira <= 1) return 'lone';
  return 'survive';
}

function renderEnding() {
  const e = ENDINGS[state.ending] || ENDINGS.survive;
  const hearts = n => Array.from({ length: 5 }, (_, i) => `<i class="${i < n ? 'on' : ''}">♥</i>`).join('');
  screenEl.innerHTML = `
    <div class="ending">
      <div class="kicker">${e.sub}</div>
      <h1>${e.title}</h1>
      <div class="sub">DAY ${state.day} / ${MAX_DAY}</div>
      <div class="art"><img src="${e.art}" alt=""></div>
      <div class="epi">${e.epi}</div>
      <div class="summary">
        <div><span>재정</span><b>${won(state.gold)}</b></div>
        <div><span>병력</span><b>${state.troops}</b></div>
        <div><span>민심</span><b>${state.morale}</b></div>
        <div><span>교단 신뢰</span><b>${state.faith}</b></div>
      </div>
      <div class="panel" style="text-align:left">
        <div class="panel-title">인연 <small>AFFECTION</small></div>
        <div class="person" style="border:0;padding:6px 0">
          <div class="avatar"><img src="assets/serena_portrait.png" alt=""></div>
          <div class="pbody"><div class="pname">셀레나</div><div class="hearts">${hearts(state.aff.serena)}</div></div>
        </div>
        <div class="person" style="border:0;padding:6px 0 0">
          <div class="avatar"><img src="assets/mira_portrait.png" alt=""></div>
          <div class="pbody"><div class="pname">미라</div><div class="hearts">${hearts(state.aff.mira)}</div></div>
        </div>
      </div>
      <div class="btn-row" style="margin-top:18px">
        <button class="btn solid" data-act="restart">다시 시작</button>
      </div>
      <div class="foothint">모든 엔딩은 하나의 겨울에서 갈라집니다.</div>
    </div>`;
}

/* ── 상회 ─────────────────────────────── */
function renderMarket() {
  const matRows = Object.entries(ITEMS).filter(([, v]) => v.kind === 'mat').map(([id, it]) => {
    const p = priceOf(id, state.day);
    const prev = priceOf(id, state.day - 1);
    const cls = p > prev ? 'up' : p < prev ? 'down' : '';
    return `<div class="row">
      <div class="ico">${it.icon}</div>
      <div class="nm">${it.name}<small>보유 ${state.inv[id] || 0} · 어제 ${prev} → 오늘 ${p}</small></div>
      <div class="price ${cls}">${p} G</div>
      <button class="mini" data-act="buy" data-id="${id}" ${state.gold < buyPrice(id) ? 'disabled' : ''}>매입 ${buyPrice(id)}</button>
    </div>`;
  }).join('');

  const goodRows = Object.entries(ITEMS).filter(([, v]) => v.kind === 'good').map(([id, it]) => {
    const p = priceOf(id, state.day);
    const prev = priceOf(id, state.day - 1);
    const cls = p > prev ? 'up' : p < prev ? 'down' : '';
    return `<div class="row">
      <div class="ico">${it.icon}</div>
      <div class="nm">${it.name}<small>보유 ${state.inv[id] || 0} · 어제 ${prev} → 오늘 ${p}</small></div>
      <div class="price ${cls}">${p} G</div>
      <button class="mini sell" data-act="sell" data-id="${id}" ${(state.inv[id] || 0) <= 0 ? 'disabled' : ''}>판매</button>
    </div>`;
  }).join('');

  const recipes = RECIPES.map(r => {
    const lack = Object.entries(r.need).filter(([k, v]) => (state.inv[k] || 0) < v);
    const can = lack.length === 0 && state.gold >= r.fee;
    return `<div class="row">
      <div class="ico">${ITEMS[r.out].icon}</div>
      <div class="nm">${r.name}<small>${Object.entries(r.need).map(([k, v]) => `${ITEMS[k].name} ${v}`).join(' · ')} + ${r.fee} G</small></div>
      <button class="mini" data-act="craft" data-id="${r.out}" ${can ? '' : 'disabled'}>제작</button>
    </div>`;
  }).join('');

  const equipRows = [
    { id: 'sword', name: '강철 검', desc: '장비하면 공격력 +3 (1회)', enabled: (state.inv.sword || 0) > 0 },
    { id: 'cloak', name: '방한 망토', desc: '장비하면 최대 체력 +10 (1회)', enabled: (state.inv.cloak || 0) > 0 },
  ].map(e => `<div class="row">
      <div class="ico">${ITEMS[e.id].icon}</div>
      <div class="nm">${e.name}<small>${e.desc}</small></div>
      <button class="mini" data-act="equip" data-id="${e.id}" ${e.enabled ? '' : 'disabled'}>장비</button>
    </div>`).join('');

  screenEl.innerHTML = `
    <div class="sheet-head">
      <div><div class="sheet-title">상회</div><div class="sheet-sub">MARKET · DAY ${state.day}</div></div>
      <div class="chip">금화 <b>${won(state.gold)}</b></div>
    </div>
    <div class="panel">
      <div class="panel-title">시세 <small>매일 변동 · 매입은 1.28배</small></div>
      ${matRows}
    </div>
    <div class="panel">
      <div class="panel-title">특산품 <small>SELL</small></div>
      ${goodRows}
    </div>
    <div class="panel">
      <div class="panel-title">제작 <small>CRAFT</small></div>
      ${recipes}
    </div>
    <div class="panel">
      <div class="panel-title">장비 <small>EQUIP</small></div>
      ${equipRows}
      <div class="row" style="border-top:1px solid var(--line-soft)">
        <div class="ico">🗡</div>
        <div class="nm">현재 공격력<small>검격 피해 ${Math.max(1, state.atk - 2)}~${state.atk + 4} · 체력 ${state.hp}/${state.maxHp}</small></div>
      </div>
    </div>
    <div class="foot hint foothint">상회는 하루에 한 번 시세가 갱신됩니다.</div>`;
}

function buy(id) {
  const p = buyPrice(id);
  if (state.gold < p) return toast('금화가 부족합니다');
  state.gold -= p; state.inv[id] = (state.inv[id] || 0) + 1;
  toast(`${ITEMS[id].name} 매입 · −${p} G`);
  save(); renderMarket(); renderHUD();
}
function sell(id) {
  if ((state.inv[id] || 0) <= 0) return toast('보유한 물건이 없습니다');
  const p = priceOf(id, state.day);
  state.gold += p; state.inv[id]--;
  toast(`${ITEMS[id].name} 판매 · +${p} G`);
  save(); renderMarket(); renderHUD();
}
function craft(id) {
  const r = RECIPES.find(x => x.out === id);
  if (!r) return;
  for (const [k, v] of Object.entries(r.need)) if ((state.inv[k] || 0) < v) return toast('재료가 부족합니다');
  if (state.gold < r.fee) return toast('금화가 부족합니다');
  for (const [k, v] of Object.entries(r.need)) state.inv[k] -= v;
  state.gold -= r.fee; state.inv[id] = (state.inv[id] || 0) + 1;
  toast(`${r.name} 제작 완료`);
  save(); renderMarket(); renderHUD();
}
function equip(id) {
  if ((state.inv[id] || 0) <= 0) return toast('보유한 물건이 없습니다');
  if (id === 'sword') { state.inv.sword--; state.atk += 3; toast('강철 검 장비 · 공격력 +3'); }
  if (id === 'cloak') { state.inv.cloak--; state.maxHp += 10; state.hp += 10; toast('방한 망토 장비 · 최대 체력 +10'); }
  save(); renderMarket(); renderHUD();
}

/* ── 인물 ─────────────────────────────── */
function renderPeople() {
  const card = (key) => {
    const p = PEOPLE[key], aff = state.aff[key];
    const hearts = Array.from({ length: 5 }, (_, i) => `<i class="${i < aff ? 'on' : ''}">♥</i>`).join('');
    const talked = state.talked[key], gifted = state.gifted[key];
    const likeIds = p.likes;
    const giftOptions = likeIds.filter(id => (state.inv[id] || 0) > 0);
    return `<div class="person">
      <div class="avatar" data-act="portrait" data-key="${key}"><img src="${p.portrait}" alt=""></div>
      <div class="pbody">
        <div class="pname">${p.name}</div>
        <div class="prole">${p.role}</div>
        <div class="hearts">${hearts}</div>
        <div class="pdesc">${p.desc}</div>
        <div class="pacts">
          <button class="mini" data-act="talk" data-key="${key}" ${talked ? 'disabled' : ''}>${talked ? '오늘 완료' : '대화'}</button>
          <button class="mini" data-act="gift" data-key="${key}" data-id="${giftOptions[0] || ''}" ${(gifted || !giftOptions.length) ? 'disabled' : ''}>
            ${gifted ? '선물 완료' : giftOptions.length ? `${ITEMS[giftOptions[0]].name} 선물` : '선물 없음'}
          </button>
        </div>
      </div>
    </div>`;
  };
  screenEl.innerHTML = `
    <div class="sheet-head">
      <div><div class="sheet-title">인물</div><div class="sheet-sub">BONDS · DAY ${state.day}</div></div>
      <div class="chip">♥ <b>${state.aff.serena + state.aff.mira}</b>/10</div>
    </div>
    <div class="panel">${card('serena')}${card('mira')}</div>
    <div class="panel">
      <div class="panel-title">영주 <small>LORD</small></div>
      <div class="row">
        <div class="ico">⚔</div>
        <div class="nm">체력<small>${state.hp} / ${state.maxHp} · 공격력 ${state.atk}</small></div>
        <div class="bar self" style="width:88px"><span style="width:${Math.round(state.hp / state.maxHp * 100)}%"></span></div>
      </div>
      <div class="row">
        <div class="ico">◈</div>
        <div class="nm">보유품<small>${Object.entries(state.inv).filter(([, v]) => v > 0).map(([k, v]) => `${ITEMS[k].name} ${v}`).join(' · ') || '없음'}</small></div>
      </div>
    </div>
    <div class="foothint">대화와 선물은 하루에 한 번씩. 호감도 4가 되면 전용 사건이 열립니다.</div>`;
}

function talk(key) {
  if (state.talked[key]) return toast('오늘은 이미 이야기했습니다');
  state.talked[key] = true;
  const lines = TALK[key];
  const line = lines[Math.min(state.aff[key], lines.length - 1)];
  const before = state.aff[key];
  state.aff[key] = clamp(state.aff[key] + 1, 0, 5);
  const grew = state.aff[key] > before;
  openModal(`
    <div class="modal-head"><div class="modal-title">${PEOPLE[key].name}</div><button class="x" data-act="close-modal">✕</button></div>
    <div class="big-art" style="height:150px"><img src="${PEOPLE[key].portrait}" style="height:150px;border-radius:12px"></div>
    <p class="narr">${line}</p>
    <div style="margin-top:12px;display:flex;gap:6px;flex-wrap:wrap">
      ${grew ? '<span class="tag good">호감도 +1</span>' : '<span class="tag">호감도 최대</span>'}
    </div>
    <div class="btn-row" style="margin-top:16px"><button class="btn" data-act="close-modal">닫기</button></div>
  `);
  journalAdd(`${PEOPLE[key].name}와의 대화`, '', []);
  save(); renderHUD();
}

function gift(key) {
  if (state.gifted[key]) return toast('오늘은 이미 선물했습니다');
  const p = PEOPLE[key];
  const id = p.likes.find(x => (state.inv[x] || 0) > 0);
  if (!id) return toast('선물할 물건이 없습니다');
  state.inv[id]--; state.gifted[key] = true;
  const liked = true;
  const before = state.aff[key];
  state.aff[key] = clamp(state.aff[key] + (liked ? 2 : 1), 0, 5);
  openModal(`
    <div class="modal-head"><div class="modal-title">${p.name}에게 선물</div><button class="x" data-act="close-modal">✕</button></div>
    <div class="big-art" style="height:150px"><img src="${p.portrait}" style="height:150px;border-radius:12px"></div>
    <p class="narr">${GIFTS[key][id] || `${p.name}가 선물을 받아 들고 웃었다.`}</p>
    <div style="margin-top:12px"><span class="chip">${ITEMS[id].name} <b>−1</b></span> <span class="tag good">호감도 +${state.aff[key] - before}</span></div>
    <div class="btn-row" style="margin-top:16px"><button class="btn" data-act="close-modal">닫기</button></div>
  `);
  journalAdd(`${p.name}에게 ${ITEMS[id].name} 선물`, '', []);
  save(); renderHUD();
}

/* ── 기록 ─────────────────────────────── */
function renderJournal() {
  const rows = state.journal.length ? state.journal.map(j => `
    <div class="row" style="align-items:flex-start">
      <div class="ico" style="font-family:var(--mono);font-size:11px;color:var(--gold-dim)">D${j.day}</div>
      <div class="nm">${j.title}<small>${j.choice || ''}</small></div>
    </div>`).join('') : '<div class="empty">아직 기록이 없습니다.</div>';

  screenEl.innerHTML = `
    <div class="sheet-head">
      <div><div class="sheet-title">기록</div><div class="sheet-sub">CHRONICLE · DAY ${state.day}/${MAX_DAY}</div></div>
      <div class="chip">항목 <b>${state.journal.length}</b></div>
    </div>
    <div class="panel">
      <div class="panel-title">영지일지 <small>최근 30</small></div>
      ${rows}
    </div>
    <div class="panel">
      <div class="panel-title">설정 <small>SYSTEM</small></div>
      <div class="row">
        <div class="ico">💾</div>
        <div class="nm">자동 저장<small>매 선택마다 기기에 저장됩니다</small></div>
      </div>
      <div class="row">
        <div class="ico">↺</div>
        <div class="nm">처음부터<small>저장 기록을 지우고 새로 시작합니다</small></div>
        <button class="mini" data-act="reset">새 게임</button>
      </div>
    </div>
    <div class="foothint">《외뿔의 악마》 세계관 팬 프로토타입 v1.0</div>`;
}

/* ── 전투 ─────────────────────────────── */
function startBattle(choice, ev) {
  const b = choice.battle;
  state.battle = {
    name: b.name, hp: b.hp, maxHp: b.hp, atk: b.atk, art: b.art || 'wolf',
    boss: b.boss, loot: b.loot, log: [], over: false, guard: false,
    source: { res: choice.res || '', title: ev.title, choice: choice.t },
  };
  state.battle.log.push(`<div>⚔ ${b.name}${josa(b.name, '이', '가')} 덤벼든다.</div>`);
  save(); render();
}

function renderBattle() {
  const b = state.battle;
  screenEl.innerHTML = `
    <div class="card" style="padding:14px 14px 16px">
      <div class="battle">
        <div class="enemy" id="enemyBox">
          <span class="scene-tag">ENCOUNTER</span>
          <img src="assets/${b.art}.png" alt="">
        </div>
        <div class="hprow">
          <div class="lab"><span>${b.name}</span><span>${Math.max(0, b.hp)} / ${b.maxHp}</span></div>
          <div class="bar hp"><span style="width:${Math.max(0, b.hp / b.maxHp * 100)}%"></span></div>
        </div>
        <div class="hprow">
          <div class="lab"><span>영주</span><span>${Math.max(0, state.hp)} / ${state.maxHp}</span></div>
          <div class="bar self"><span style="width:${Math.max(0, state.hp / state.maxHp * 100)}%"></span></div>
        </div>
        <div class="log" id="logBox">${b.log.join('')}</div>
        ${b.over ? `
          <div class="btn-row"><button class="btn solid" data-act="battle-end">계속</button></div>
        ` : `
          <div class="choices" style="padding:0">
            <button class="choice" data-act="b-atk"><span class="ct">검격 — 검을 곧게 내지른다</span><span class="meta"><span class="tag bad">${Math.max(1, state.atk - 2)}~${state.atk + 4} 피해</span></span></button>
            <button class="choice" data-act="b-guard"><span class="ct">방진 — 방패를 세우고 버틴다</span><span class="meta"><span class="tag">피해 65% 감소</span><span class="tag good">반격 2</span></span></button>
            <button class="choice" data-act="b-item"><span class="ct">${(state.inv.potion || 0) > 0 ? '치유 물약 — 상처를 메운다' : '기도 — 짧게 빌고 숨을 고른다'}</span><span class="meta">${(state.inv.potion || 0) > 0 ? `<span class="tag good">HP +16 · 보유 ${state.inv.potion}</span>` : '<span class="tag good">HP +6</span>'}</span></button>
          </div>
        `}
      </div>
    </div>`;
  const lg = $('#logBox'); if (lg) lg.scrollTop = lg.scrollHeight;
}

function battleAct(kind) {
  const b = state.battle;
  if (!b || b.over) return;
  let skipEnemy = false;

  if (kind === 'atk') {
    const dmg = rnd(Math.max(1, state.atk - 2), state.atk + 4);
    b.hp -= dmg;
    b.log.push(`<div>▸ 검격 — <span class="dmg">${dmg}</span> 피해</div>`);
  } else if (kind === 'guard') {
    b.guard = true;
    if (b.hp > 0) { b.hp -= 2; b.log.push(`<div>▸ 방진 — 자세를 낮추고 반격 <span class="dmg">2</span></div>`); }
  } else if (kind === 'item') {
    if ((state.inv.potion || 0) > 0) {
      state.inv.potion--; state.hp = clamp(state.hp + 16, 0, state.maxHp);
      b.log.push(`<div>▸ 치유 물약 — <span class="heal">HP +16</span></div>`);
    } else {
      state.hp = clamp(state.hp + 6, 0, state.maxHp);
      state.faith = clamp(state.faith + 1, 0, 100);
      b.log.push(`<div>▸ 기도 — <span class="heal">HP +6</span></div>`);
    }
    skipEnemy = false;
  }

  if (b.hp <= 0) return battleWin();

  // enemy turn
  let edmg = rnd(Math.max(1, b.atk - 2), b.atk + 2);
  if (b.guard) edmg = Math.max(1, Math.round(edmg * 0.35));
  state.hp -= edmg;
  b.log.push(`<div>◂ ${b.name}의 공격 — <span class="dmg">${edmg}</span></div>`);
  b.guard = false;

  if (state.hp <= 0) return battleLose();

  save(); renderBattle();
}

function battleWin() {
  const b = state.battle;
  b.over = true;
  const loot = b.loot || {};
  if (loot.gold) state.gold += loot.gold;
  if (loot.items) for (const [k, v] of Object.entries(loot.items)) state.inv[k] = (state.inv[k] || 0) + v;
  state.morale = clamp(state.morale + (b.boss ? 8 : 3), 0, 100);
  const lootTxt = [
    loot.gold ? `금화 +${loot.gold}` : '',
    ...Object.entries(loot.items || {}).map(([k, v]) => `${ITEMS[k].name} +${v}`),
  ].filter(Boolean).join(' · ');
  b.log.push(`<div class="win">◆ ${b.name}${josa(b.name, '을', '를')} 쓰러뜨렸다.${lootTxt ? ` ${lootTxt}` : ''}</div>`);
  save(); renderBattle();
}

function battleLose() {
  const b = state.battle;
  b.over = true;
  state.hp = 1;
  const lost = Math.round(state.gold * 0.4);
  state.gold = Math.max(0, state.gold - lost);
  state.morale = clamp(state.morale - 12, 0, 100);
  state.troops = Math.max(0, state.troops - 3);
  b.log.push(`<div class="dmg">✕ 쓰러졌다. 부관이 끌어냈다. 금화 −${lost}, 민심 −12</div>`);
  save(); renderBattle();
}

function battleEnd() {
  const b = state.battle;
  const won = state.hp > 1 || b.hp <= 0;
  const ev = state.pending;
  const res = b.source.res;
  state.battle = null;
  if (ev) {
    ev.phase = 'result';
    ev.resultText = `${res}${b.hp <= 0 ? '' : '\n\n상처를 감고 성으로 돌아왔다.'}`;
  }
  journalAdd(b.source.title, b.source.choice, []);
  save();
  if (checkFail()) return;
  state.tab = 'estate';
  render();
}

/* ── 모달 ─────────────────────────────── */
function openModal(html) {
  overlayEl.innerHTML = `<div class="modal">${html}</div>`;
  overlayEl.classList.remove('hidden');
}
function closeModal() { overlayEl.classList.add('hidden'); overlayEl.innerHTML = ''; }

/* ── 이벤트 위임 ──────────────────────── */
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el) {
    if (e.target === overlayEl) closeModal();
    return;
  }
  const act = el.dataset.act;
  switch (act) {
    case 'new': state = newState(); save(); state.tab = 'estate'; pickEvent(); render(); break;
    case 'continue': { const s = load(); if (s) { state = s; render(); } break; }
    case 'choose': choose(Number(el.dataset.i)); break;
    case 'next-day': nextDay(); break;
    case 'buy': buy(el.dataset.id); break;
    case 'sell': sell(el.dataset.id); break;
    case 'craft': craft(el.dataset.id); break;
    case 'equip': equip(el.dataset.id); break;
    case 'talk': talk(el.dataset.key); break;
    case 'gift': gift(el.dataset.key); break;
    case 'portrait': {
      const p = PEOPLE[el.dataset.key];
      openModal(`<div class="modal-head"><div class="modal-title">${p.name}</div><button class="x" data-act="close-modal">✕</button></div>
        <div class="big-art"><img src="${p.portrait}" alt=""></div>
        <div class="prole" style="text-align:center">${p.role}</div>
        <p class="pdesc" style="text-align:center;margin-top:8px">${p.desc}</p>`);
      break;
    }
    case 'close-modal': closeModal(); break;
    case 'b-atk': battleAct('atk'); break;
    case 'b-guard': battleAct('guard'); break;
    case 'b-item': battleAct('item'); break;
    case 'battle-end': battleEnd(); break;
    case 'restart': wipe(); state = newState(); save(); pickEvent(); render(); break;
    case 'reset':
      if (confirm('저장된 기록을 지우고 처음부터 시작할까요?')) { wipe(); state = newState(); pickEvent(); render(); }
      break;
  }
});

tabsEl.addEventListener('click', (e) => {
  const t = e.target.closest('.tab');
  if (!t || state.battle) return;
  state.tab = t.dataset.tab;
  save(); render();
});

/* ── 시작 ─────────────────────────────── */
state = null;
renderTitle();
})();
