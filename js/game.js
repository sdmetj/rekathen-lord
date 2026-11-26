/* ══════════════════════════════════════════════════════════════
   게임 상태 · 로직 — 샌드박스 영주 시뮬레이션
   ══════════════════════════════════════════════════════════════ */

const SAVE_KEY = 'arden_save_v2';

const G = {
  state: null,
  screen: { view: 'title' },
  turn: 0,
};

function defaultState(name) {
  return {
    v: 2, name: name || '아르덴 영주',
    day: 1, season: 3, dayOfSeason: 1, year: 1, phase: 0,
    ap: 4, apUsed: 0, sleptEarly: false,
    hp: 100, maxHp: 100,
    gold: 120, troops: 8, morale: 50, faith: 30,
    rep: { warm: 0, bold: 0, cunning: 0, mercy: 0, loyal: 0, cold: 0 },
    aff: {}, trust: {}, mood: {}, rel: {}, lastTalk: {}, lastGift: {},
    items: { herb: 5, iron: 2, pelt: 1, cloth: 3, potion: 2 },
    equip: { weapon: null, armor: null },
    bld: { keep: 1, wall: 0, market: 1, chapel: 1, workshop: 1, tavern: 0, greenhouse: 0, forge: 0, manor: 0 },
    quests: [], questSeq: 1,
    prices: {}, flags: {}, memories: {},
    children: [], wedding: {}, pregnant: null,
    logs: [], rumors: 0, milestones: [],
    place: 'castle', visited: {}, battledToday: false,
    gameOver: false, startDay: 1,
  };
}

/* ── 저장 / 불러오기 ──────────────────────────────────────── */
function saveGame() {
  if (!G.state) return;
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(G.state)); } catch (e) {}
}
function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s || s.v !== 2) return null;
    return s;
  } catch (e) { return null; }
}
function clearSave() { localStorage.removeItem(SAVE_KEY); }

/* ── 유틸 ─────────────────────────────────────────────────── */
function rnd(a, b) { return a + Math.random() * (b - a); }
function ri(a, b) { return Math.floor(rnd(a, b + 1)); }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function today() { return G.state.day + '-' + G.state.phase; }

function addLog(text) {
  const s = G.state;
  s.logs.unshift({ d: s.day, t: text });
  if (s.logs.length > 120) s.logs.length = 120;
}

function toast(text, kind) {
  const root = document.getElementById('toast-root');
  const el = document.createElement('div');
  el.className = 'toast' + (kind ? ' ' + kind : '');
  el.textContent = text;
  root.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = '.4s'; }, 1900);
  setTimeout(() => el.remove(), 2400);
}

/* ── 성향 태그 ────────────────────────────────────────────── */
const REP_LABEL = { warm: '다정함', bold: '호탕', cunning: '교활', mercy: '자비', loyal: '충의', cold: '냉혈' };
function repTags(s) {
  const entries = Object.entries(s.rep).filter(([, v]) => v !== 0).sort((a, b) => b[1] - a[1]);
  return entries.slice(0, 2).map(([k]) => REP_LABEL[k]);
}
function repTone(s) {
  const sum = s.rep.warm + s.rep.mercy - s.rep.cold - s.rep.cunning * 0.5;
  return sum >= 6 ? '온화' : sum <= -6 ? '차가움' : '중립';
}

/* ── 아이템 관리 ──────────────────────────────────────────── */
function give(dict, delta) {
  const s = G.state;
  for (const k in delta) {
    if (k === 'gold' || k === 'troops' || k === 'morale' || k === 'faith' || k === 'hp') continue;
    s.items[k] = Math.max(0, (s.items[k] || 0) + delta[k]);
  }
}
function itemCount(id) { return (G.state.items[id] || 0); }

function applyDelta(d) {
  const s = G.state;
  if (!d) return;
  if (d.gold) s.gold += d.gold;
  if (d.troops) s.troops = Math.max(0, s.troops + d.troops);
  if (d.morale) s.morale = clamp(s.morale + d.morale, -100, 100);
  if (d.faith) s.faith = clamp(s.faith + d.faith, 0, 100);
  if (d.hp) s.hp = clamp(s.hp + d.hp, 0, s.maxHp);
  const items = {};
  for (const k in d) if (ITEMS[k]) items[k] = d[k];
  give(null, items);
  if (d.aff) for (const id in d.aff) addAff(id, d.aff[id]);
  if (d.trust) for (const id in d.trust) addTrust(id, d.trust[id]);
  if (d.rep) for (const k in d.rep) s.rep[k] = (s.rep[k] || 0) + d.rep[k];
  if (d.unlockShop) s.flags.shopOpen = true;
}

function addAff(id, v) {
  const s = G.state;
  if (!CHARS[id]) return;
  const before = s.aff[id] || 0;
  s.aff[id] = clamp(before + v, 0, 1000);
  if (v > 0 && affStage(s.aff[id]) > affStage(before)) SFX.play('heart');
}
function addTrust(id, v) {
  const s = G.state;
  const key = 'trust_' + id;
  s.flags[key] = clamp((s.flags[key] || 0) + v, 0, 100);
}
function trustOf(id) { return G.state.flags['trust_' + id] || 0; }

/* ── 상태 파생 ────────────────────────────────────────────── */
function apMax() { return G.state.bld.keep >= 3 ? 5 : 4; }
function apLeft() { return G.state.ap; }
function phaseOf(apUsed) { return Math.min(2, Math.floor(apUsed / 2)); }
function weather() {
  const s = G.state;
  const list = SEASON_WEATHER[(s.season + 3) % 4];
  return WEATHER[list[(s.day - 1) % list.length]];
}
function priceOf(id) {
  const s = G.state;
  if (s.prices[id]) return s.prices[id];
  return ITEMS[id].base;
}
function refreshPrices() {
  const s = G.state;
  const w = weather();
  s.prices = {};
  for (const id in ITEMS) {
    const base = ITEMS[id].base;
    const drift = rnd(-0.16, 0.2);
    const seasonMul = s.season === 3 && (id === 'cloak' || id === 'potion') ? 1.3 : s.season === 0 && id === 'herb' ? 1.2 : 1;
    s.prices[id] = Math.max(3, Math.round(base * (1 + drift) * w.sell * seasonMul));
  }
}
function sellPrice(id) { return Math.round(priceOf(id) * (1 + (G.state.bld.market - 1) * 0.08)); }
function buyPrice(id) { return Math.round(priceOf(id) * 1.22); }
function marketStock() { return 2 + G.state.bld.market * 2; }

/* ── 시설 ─────────────────────────────────────────────────── */
function bldEffect(id) {
  const s = G.state;
  const b = BUILDINGS.find(x => x.id === id);
  return b.effect[Math.min(s.bld[id], b.max) - 1] || '';
}
function canBuild(id) {
  const s = G.state;
  const b = BUILDINGS.find(x => x.id === id);
  const lv = s.bld[id];
  if (lv >= b.max) return { ok: false, why: '최고 등급' };
  const cost = b.cost[lv];
  if (!cost) return { ok: false, why: '?' };
  if (s.gold < cost.gold) return { ok: false, why: '금화 부족' };
  for (const k in cost) {
    if (k === 'gold') continue;
    if (itemCount(k) < cost[k]) return { ok: false, why: ITEMS[k].name + ' 부족' };
  }
  return { ok: true, cost };
}
function doBuild(id) {
  const chk = canBuild(id);
  if (!chk.ok) return false;
  const s = G.state;
  const cost = chk.cost;
  s.gold -= cost.gold;
  for (const k in cost) if (k !== 'gold') s.items[k] -= cost[k];
  s.bld[id]++;
  SFX.play('build');
  const b = BUILDINGS.find(x => x.id === id);
  addLog(`${b.name}이(가) ${s.bld[id]}단계로 올라갔다.`);
  milestone(`🏗 ${b.name} ${s.bld[id]}단계`, b.effect[Math.min(s.bld[id], b.max) - 1] || '영지가 자랐다.');
  saveGame();
  return true;
}

/* ── 하루 루프 ────────────────────────────────────────────── */
function spendAP(n = 1) {
  const s = G.state;
  s.ap = Math.max(0, s.ap - n);
  s.apUsed += n;
  s.phase = phaseOf(s.apUsed);
}

function dailyIncome() {
  const s = G.state;
  let gold = 0, lines = [];
  const tax = 10 + s.bld.keep * 6 + Math.round(s.morale / 20);
  gold += tax;
  lines.push(`세금 +${tax}`);
  const produce = {
    greenhouse: { 1: { herb: 2 }, 2: { herb: 4 }, 3: { herb: 7, cloth: 1 } },
    forge: { 1: { iron: 1 }, 2: { iron: 2 }, 3: { iron: 3 } },
    wall: { 1: {}, 2: {}, 3: {} },
    tavern: { 1: {}, 2: {}, 3: {} },
  };
  for (const b in produce) {
    const lv = s.bld[b];
    if (!lv) continue;
    const p = produce[b][lv];
    for (const k in p) { s.items[k] = (s.items[k] || 0) + p[k]; lines.push(`${ITEMS[k].name} +${p[k]}`); }
  }
  let upkeep = 4 + Math.floor(s.troops / 4);
  if (s.bld.keep >= 2) upkeep -= 2;
  upkeep = Math.max(0, upkeep);
  gold -= upkeep;
  lines.push(`유지비 -${upkeep}`);
  return { gold, lines };
}

function dailyProduceLines() { return []; }

function endDay(sleepAtNight) {
  const s = G.state;
  /* 결산 */
  const inc = dailyIncome();
  s.gold += inc.gold;
  refreshPrices();
  s.battledToday = false;

  /* 건물 수익 */
  if (s.bld.market >= 2) {
    const bonus = [0, 0, 8, 16][s.bld.market] || 0;
    s.gold += bonus;
  }
  if (s.bld.chapel >= 1) s.faith = clamp(s.faith + [0, 1, 2, 4][s.bld.chapel], 0, 100);
  if (s.bld.tavern >= 1) s.morale = clamp(s.morale + s.bld.tavern, -100, 100);

  /* 아내/첩 내조 버프 */
  for (const id in s.rel) {
    const r = s.rel[id];
    if (r === 'wife') {
      if (id === 'serena') s.faith = clamp(s.faith + 2, 0, 100);
      if (id === 'mira') s.gold += 14;
      if (id === 'claire') { if (s.items.herb) s.items.herb += 2; }
      if (id === 'seraphine') s.flags.spyNet = true;
      if (id === 'ellen' || id === 'lana') s.troops += 1;
      if (id === 'mill') s.morale = clamp(s.morale + 2, -100, 100);
    } else if (r === 'concubine') {
      if (id === 'mira') s.gold += 8;
      if (id === 'seraphine') s.flags.spyNet = true;
    }
    /* 애정은 방치하면 조금 식는다 */
    if (!(id in s.lastTalk) || s.day - (s.lastTalk[id] || 0) > 3) {
      s.aff[id] = Math.max(0, (s.aff[id] || 0) - 4);
    }
  }

  /* 임신 → 출산 */
  if (s.pregnant) {
    s.pregnant.days++;
    if (s.pregnant.days >= 20) {
      birthChild(s.pregnant.mom);
      s.pregnant = null;
    }
  }

  /* 납품 의뢰 마감 */
  s.quests = s.quests.filter(q => {
    if (s.day >= q.due) { addLog(`의뢰 만료: ${q.label}`); return false; }
    return true;
  });

  /* 무작위 사건 확률 */
  const evtRoll = Math.random();
  let pendingEvent = null;
  if (evtRoll < 0.42) {
    const pool = EVENTS.filter(e => {
      if (s.day < (e.minDay || 1)) return false;
      if (e.once && s.flags['ev_' + e.id]) return false;
      if (e.requireChild && !s.children.length) return false;
      if (e.minFaith && s.faith < e.minFaith) return false;
      if (e.phase && !e.phase.includes(0)) return false;
      if (e.requireBld) {
        for (const b in e.requireBld) if ((s.bld[b] || 0) < e.requireBld[b]) return false;
      }
      return true;
    });
    if (pool.length) pendingEvent = pick(pool);
  }

  /* 파산 판정 */
  if (s.gold < -80) {
    s.gameOver = true;
    saveGame();
    return { over: 'bankrupt', inc };
  }

  /* 날짜 진행 */
  s.day++;
  s.dayOfSeason++;
  if (s.dayOfSeason > DAYS_PER_SEASON) {
    s.dayOfSeason = 1;
    s.season = (s.season + 1) % 4;
    if (s.season === 0) { s.year++; milestone(`🎉 ${s.year}년차`, '아르덴의 연대기에 새 한 해가 열렸다.'); }
    milestone(`${SEASON_ICON[s.season]} ${SEASONS[s.season]}이 되었다`, weather().desc);
  }
  s.ap = apMax(); s.apUsed = 0; s.phase = 0; s.hp = Math.min(s.maxHp, s.hp + 30);
  s.visited = {}; G.talkedCount = {};
  if (s.gold > 500 && !s.flags.m_rich) { s.flags.m_rich = true; milestone('💰 부유한 변경령', '곳간이 넉넉해졌다. 사람들의 발길이 담요 넘는다.'); }
  if (s.troops > 25 && !s.flags.m_troops) { s.flags.m_troops = true; milestone('🛡 강한 성벽', '수비대가 늘었다. 검은숲이 조용해졌다.'); }
  if (s.morale > 85 && !s.flags.m_love) { s.flags.m_love = true; milestone('💗 사랑받는 영주', '민심이 높다. 아이들이 성문 앞에서 손을 흔든다.'); }

  saveGame();
  return { inc, pendingEvent };
}

/* ── 사건 ─────────────────────────────────────────────────── */
function runEventChoice(ev, choice) {
  const s = G.state;
  const cost = choice.cost || {};
  for (const k in cost) {
    if (k === 'gold') { if (s.gold < cost[k]) return null; }
    else if (ITEMS[k] && itemCount(k) < cost[k]) return null;
    else if (k === 'troops' && s.troops < cost[k]) return null;
    else if (k === 'potion' && itemCount('potion') < cost[k]) return null;
  }
  for (const k in cost) {
    if (k === 'gold') s.gold -= cost[k];
    else if (k === 'troops') s.troops -= cost[k];
    else s.items[k] -= cost[k];
  }
  applyDelta(choice.d);
  if (choice.battle) return { battle: choice.battle, res: choice.res, rep: choice.rep };
  if (choice.rep) for (const k in choice.rep) s.rep[k] = (s.rep[k] || 0) + choice.rep[k];
  s.flags['ev_' + ev.id] = true;
  addLog(`[${ev.title}] ${choice.t}`);
  saveGame();
  return { res: choice.res };
}

/* ── 전투 ─────────────────────────────────────────────────── */
function playerAtk() {
  const s = G.state;
  let atk = 8 + Math.floor(s.troops / 6);
  if (s.equip.weapon === 'sword') atk += 6;
  return atk;
}
function playerDef() {
  const s = G.state;
  return s.equip.armor === 'cloak' ? 4 : 0;
}
function battleSupport() {
  const s = G.state;
  for (const id in s.rel) {
    if ((s.rel[id] === 'lover' || s.rel[id] === 'wife' || s.rel[id] === 'ally') && (s.aff[id] || 0) >= 400) return CHARS[id];
  }
  if ((s.aff.kael || 0) >= 300) return CHARS.kael;
  return null;
}

/* ── 로맨스 · 관계 ────────────────────────────────────────── */
const REL_LABEL = { wife: '아내', lover: '연인', concubine: '첩', ally: '가신', friend: '친구' };

function canConfess(id) {
  const s = G.state;
  const c = CHARS[id];
  if (!c || !c.romance) return { ok: false, why: '로맨스 루트가 아니다' };
  const aff = s.aff[id] || 0;
  if (aff < 800) return { ok: false, why: '호감도 부족 (8하트 필요)' };
  if (c.deepRoute && trustOf(id) < 40) return { ok: false, why: '신뢰 부족 — 이야기를 더 파고들어야 한다' };
  if (s.rel[id]) return { ok: false, why: '이미 관계가 있다' };
  return { ok: true };
}

function doConfess(id, kind) {
  const s = G.state;
  const c = CHARS[id];
  s.rel[id] = kind;
  if (kind === 'wife') { s.wedding[id] = s.day; addLog(`${c.name}와 혼인했다.`); milestone(`💍 ${c.name}와의 혼인`, '영주 저택의 내실에 새 문패가 걸렸다.'); }
  if (kind === 'lover') addLog(`${c.name}와 연인이 되었다.`);
  if (kind === 'concubine') { s.wedding[id] = s.day; addLog(`${c.name}를 저택 별채에 들였다.`); milestone(`🏠 별채의 주인`, `${c.name}가 저택에 머무르게 되었다.`); }
  if (kind === 'ally') { addLog(`${c.name}를 가신으로 들였다.`); milestone(`🤝 가신 계약`, `${c.name}가 아르덴의 가신이 되었다.`); }
  saveGame();
}

function spouses() { return Object.keys(G.state.rel).filter(id => G.state.rel[id] === 'wife'); }
function residents() {
  return Object.keys(G.state.rel).filter(id => ['wife', 'concubine'].includes(G.state.rel[id]));
}
function manorSlots() { return [0, 1, 2, 3][G.state.bld.manor]; }

function tryConceive() {
  const s = G.state;
  if (s.pregnant) return;
  const sp = spouses()[0];
  if (!sp) return;
  const since = s.day - (s.wedding[sp] || s.day);
  if (since < 15 || (s.aff[sp] || 0) < 600) return;
  if (Math.random() < 0.12) {
    s.pregnant = { mom: sp, days: 0 };
    addLog('좋은 소식이 저택에 울렸다. 새 식구가 올 것이다.');
    milestone('🌱 새 생명', `${CHARS[sp].name}의 월경이 멈췄다. 영주 저택에 기쁨이 찾아온다.`);
  }
}

function birthChild(momId) {
  const s = G.state;
  const mom = CHARS[momId];
  const sex = Math.random() < 0.5 ? '딸' : '아들';
  const hair = { serena: '백금발', mira: '적갈색 머리', claire: '은발', seraphine: '흑발', ellen: '백금발', lana: '적발', mill: '갈색 머리' }[momId] || '갈색 머리';
  const child = {
    id: 'c' + s.day, name: null, sex, mom: momId, born: s.day, stage: 'infant',
    hair, temp: TRAITS[mom.trait] ? TRAITS[mom.trait].name : '평온',
  };
  s.children.push(child);
  SFX.play('level');
  milestone(sex === '딸' ? '👶 딸이 태어났다' : '👶 아들이 태어났다', `${mom.name}의 아이. ${hair}을 물려받았다. '기록' 탭에서 이름을 지어줄 수 있다.`);
}

function childStageOK(c) {
  return G.state.day - c.born >= 60 && c.stage === 'infant';
}

/* ── 가신 · 알아보기 ─────────────────────────────────────── */
function recruitCost(c) {
  return { gold: 60 + Math.floor(rnd(0, 40)), item: c.gift, qty: 1 };
}

/* ── 의뢰 생성 ────────────────────────────────────────────── */
function genQuests() {
  const s = G.state;
  const want = 1 + (s.bld.market >= 3 ? 1 : 0);
  while (s.quests.length < want) {
    const froms = [
      { from: '타이셀 왕국', icon: '👑' },
      { from: '비아 상단', icon: '🛒' },
      { from: '크렌 교구', icon: '⛪' },
    ];
    const f = pick(froms);
    const pool = ['potion', 'cloak', 'lamp', 'sword', 'elixir'];
    const item = pick(pool.slice(0, 2 + s.bld.workshop));
    const qty = ri(1, 2);
    const reward = Math.round(sellPrice(item) * qty * rnd(1.5, 2.1)) + 12;
    s.quests.push({
      id: s.questSeq++, item, qty, reward, from: f.from, icon: f.icon,
      due: s.day + ri(3, 6), label: `${ITEMS[item].name} ×${qty}`,
    });
  }
}

/* ── 채집 / 생산 ──────────────────────────────────────────── */
function gatherForest() {
  const s = G.state;
  const w = weather();
  const loot = {};
  const herbN = Math.max(1, Math.round(rnd(1, 3) * w.gather + (s.bld.greenhouse ? 1 : 0)));
  loot.herb = herbN;
  if (Math.random() < 0.35) loot.iron = 1;
  if (Math.random() < 0.2) loot.pelt = 1;
  if (Math.random() < 0.1) loot.mana = 1;
  return loot;
}

function craft(recipe, times) {
  const s = G.state;
  for (const k in recipe.need) if (itemCount(k) < recipe.need[k] * times) return null;
  for (const k in recipe.need) s.items[k] -= recipe.need[k] * times;
  s.gold -= recipe.fee * times;
  const crit = Math.random() < (s.bld.workshop >= 3 ? 0.22 : s.bld.workshop >= 2 ? 0.1 : 0);
  s.items[recipe.out] = (s.items[recipe.out] || 0) + times + (crit ? 1 : 0);
  SFX.play('craft');
  return { crit };
}
