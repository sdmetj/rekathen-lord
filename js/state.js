/* ══════════════════════════════════════════════════════════════
   상태 · 저장 · 효과
   세이브 키는 arden_save_v3. 문자열 본문은 코드에만 있고,
   세이브에는 id와 숫자만 들어간다.
   ══════════════════════════════════════════════════════════════ */

const SAVE_KEY = 'arden_save_v3';
const SAVE_BAK  = 'arden_save_v3_bak';
const ASSET_VER = 36;

function newState(name) {
  return {
    v: 3,
    name: name || '아르덴 영주',
    day: 1, phase: 'am',
    slots: { am: 2, pm: 2, night: 1 },
    gold: 40, morale: 42, faith: 30, troops: 6, food: 18, order: 50, pop: 0, hp: 100,
    rep: { warm:0, bold:0, cunning:0, mercy:0, loyal:0, cold:0 },
    items: { herb:2, iron:2, pelt:1, wood:2, cloth:1, paper:1 },
    aff: {}, trust: {}, met: { kael:1, serena:1, greta:1 },
    flags: {}, clues: [], inf: [], tags: { herb:0, mercy:0, forest:0, church:0, heresy:0, smuggle:0 },
    letters: { inbox: [], read: [], replied: {}, sentDay: 3, day: 0 },
    appt: null, apptLog: [], visitors: [], errands: [],
    seen: {}, nightSeen: {}, log: [], bld: { keep:1, wall:0, market:1, chapel:1, workshop:1, tavern:0, greenhouse:0 },
    act: 1, done: false, free: false, ending: null, lastReport: null,
    rep2: {}, hints: {}, tut: { letters:false, book:false, roster:false },
    started: Date.now(),
  };
}

const State = {
  s: null,

  init(s) { this.s = s; return s; },

  save() {
    if (!this.s) return;
    try {
      const raw = JSON.stringify(this.s);
      localStorage.setItem(SAVE_KEY, raw);
      if (!this._bakAt || Date.now() - this._bakAt > 120000) {
        localStorage.setItem(SAVE_BAK, raw); this._bakAt = Date.now();
      }
    } catch (e) { console.warn('save failed', e); }
  },

  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw);
      if (!s || s.v !== 3) return null;
      return this.migrate(s);
    } catch (e) { return null; }
  },

  exists() { return !!localStorage.getItem(SAVE_KEY); },

  /* v3 내부의 빠진 키를 채운다 (구버전 파일 대비) */
  migrate(s) {
    const base = newState(s.name);
    const merged = Object.assign(base, s);
    merged.slots = Object.assign({ am:2, pm:2, night:1 }, s.slots || {});
    merged.letters = Object.assign({ inbox:[], read:[], replied:{}, sentDay:3, day:0 }, s.letters || {});
    merged.bld = Object.assign(base.bld, s.bld || {});
    merged.tags = Object.assign(base.tags, s.tags || {});
    merged.items = Object.assign(base.items, s.items || {});
    merged.flags = s.flags || {};
    merged.aff = s.aff || {}; merged.trust = s.trust || {};
    merged.met = s.met || {}; merged.clues = s.clues || []; merged.inf = s.inf || [];
    return merged;
  },

  reset(name) { this.s = newState(name); this.save(); return this.s; },

  exportCode() {
    try { return btoa(unescape(encodeURIComponent(JSON.stringify(this.s)))); }
    catch (e) { return ''; }
  },

  importCode(code) {
    try {
      const s = JSON.parse(decodeURIComponent(escape(atob(code.trim()))));
      if (!s || s.v !== 3) return false;
      this.s = this.migrate(s); this.save(); return true;
    } catch (e) { return false; }
  },
};

/* ── 파생 값 ───────────────────────────────────────────────── */
const S = () => State.s;
const has = id => !!S().met[id];
const known = id => !!S().seen[id];
const flag = k => !!S().flags[k];
const trustOf = id => S().trust[id] || 0;
const affOf = id => S().aff[id] || 0;
const hasClue = id => S().clues.includes(id);
const bld = k => S().bld[k] || 0;
function isBuilt(k) {
  if (k === 'market2') return (S().bld.market || 0) >= 2;
  if (k === 'tavern2') return !!S().bld.tavern;
  if (k === 'chapel') return !!S().flags.chapel_fixed;
  return !!S().bld[k];
}
const tagHeat = k => Math.max(0, Math.min(6, S().tags[k] || 0));
const tagActive = k => tagHeat(k) >= (TAGS[k]?.at || 4);

function activeTags() {
  return Object.keys(TAGS).filter(k => !TAGS[k].hidden && tagActive(k));
}

function goalsDone() {
  return GOALS.filter(g => g.check(S())).length;
}

function slotLeft() {
  const s = S();
  return Object.values(s.slots).reduce((a, b) => a + Math.max(0, b), 0);
}

function maxSlots() { return 5; }

/* ── 효과 적용 ─────────────────────────────────────────────── */
const EFF_LABEL = {
  gold:['금화','🪙'], morale:['민심','🕯'], faith:['신앙','⛪'], troops:['병력','🛡'],
  food:['식량','🍞'], order:['질서','⚖️'], hp:['기력','❤️'], pop:['인구','🏠'],
};

function applyEff(eff, opts) {
  const s = S(); if (!eff) return [];
  const out = [];
  const add = (icon, text, cls) => out.push({ icon, text, cls: cls || '' });
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  for (const k of ['gold','morale','faith','troops','food','order','hp','pop']) {
    if (eff[k] != null) {
      let v = eff[k];
      if (k === 'morale' || k === 'faith') v = Math.round(v);
      s[k] = s[k] + v;
      if (k === 'morale' || k === 'faith') s[k] = clamp(s[k], 0, 100);
      if (k === 'order') s[k] = clamp(s[k], 0, 100);
      if (k === 'hp') s[k] = clamp(s[k], 1, 100);
      if (k === 'troops' || k === 'food' || k === 'gold' || k === 'pop') s[k] = Math.max(0, s[k]);
      const [name, icon] = EFF_LABEL[k] || [k, '•'];
      add(icon, `${name} ${v > 0 ? '+' : ''}${v}`, v > 0 ? 'up' : 'down');
    }
  }
  if (eff.items) for (const [k, v] of Object.entries(eff.items)) {
    s.items[k] = Math.max(0, (s.items[k] || 0) + v);
    add(GOODS[k]?.icon || '📦', `${GOODS[k]?.name || k} ${v > 0 ? '+' : ''}${v}`, v > 0 ? 'up' : 'down');
  }
  /* 데이터 파일에서 단수 키로 쓴 것들 */
  for (const k of Object.keys(GOODS)) {
    if (eff[k] != null) {
      s.items[k] = Math.max(0, (s.items[k] || 0) + eff[k]);
      add(GOODS[k].icon, `${GOODS[k].name} ${eff[k] > 0 ? '+' : ''}${eff[k]}`, eff[k] > 0 ? 'up' : 'down');
    }
  }
  if (eff.trust) for (const [id, v] of Object.entries(eff.trust)) {
    s.trust[id] = clamp((s.trust[id] || 0) + v, 0, 100);
    add('🤝', `${ROSTER[id]?.name || id} 신뢰 ${v > 0 ? '+' : ''}${v}`, v > 0 ? 'up' : 'down');
  }
  if (eff.aff) for (const [id, v] of Object.entries(eff.aff)) {
    s.aff[id] = clamp((s.aff[id] || 0) + v * 4, 0, 1000);
    add('💗', `${ROSTER[id]?.name || id} 호감 ${v > 0 ? '+' : ''}${v * 4}`, v > 0 ? 'up' : 'down');
  }
  if (eff.clue) for (const id of eff.clue) if (!s.clues.includes(id)) {
    s.clues.push(id);
    add('📜', `단서 — ${CLUES[id]?.name || id}`, 'clue');
  }
  if (eff.loseClue) for (const id of eff.loseClue) {
    const i = s.clues.indexOf(id);
    if (i >= 0) { s.clues.splice(i, 1); add('🗑', `단서 소멸 — ${CLUES[id]?.name || id}`, 'down'); }
  }
  if (eff.flag) s.flags[eff.flag] = 1;
  if (eff.flags) eff.flags.forEach(f => s.flags[f] = 1);
  if (eff.unflag) s.flags[eff.unflag] = 0;
  if (eff.tag) for (const [k, v] of Object.entries(eff.tag)) {
    s.tags[k] = clamp((s.tags[k] || 0) + v, 0, TAGS[k]?.max || 6);
    if (!TAGS[k]?.hidden) add('🌫', `${TAGS[k]?.name || k} ${v > 0 ? '+' : ''}${v}`, v > 0 ? 'up' : 'down');
  }
  if (eff.unlock) for (const id of eff.unlock) unlockChar(id, out);
  if (eff.bld) for (const [k, v] of Object.entries(eff.bld)) s.bld[k] = Math.max(s.bld[k] || 0, v);
  if (eff.rep) for (const [k, v] of Object.entries(eff.rep)) s.rep[k] = (s.rep[k] || 0) + v;
  if (eff.letter) addLetter(eff.letter, out);
  if (eff.appt) {
    const a = eff.appt;
    if (!NIGHTS[a.who]) {
      /* 밤 장면이 없는 인물 — 약속 대신 신뢰로 남긴다 */
      s.trust[a.who] = Math.min(100, (s.trust[a.who] || 0) + 3);
      add('🤝', `${ROSTER[a.who]?.name || a.who} 신뢰 +3`, 'up');
    } else if (!has('tilly')) {
      add('⌛', '전령이 없어 약속을 잡지 못했다', 'down');
    } else {
      if (s.appt && s.appt.day > s.day && s.appt.who !== a.who) {
        s.trust[s.appt.who] = Math.max(0, (s.trust[s.appt.who] || 0) - 5);
        s.flags['서운함_' + s.appt.who] = 1;
        add('🕯', `${ROSTER[s.appt.who]?.name || s.appt.who}과의 약속을 미뤘다 (신뢰 −5)`, 'down');
      }
      s.appt = { who: a.who, place: a.place, day: s.day + (a.inDays ?? 1), phase: a.phase || 'night', made: s.day };
      add('🕯', `약속 — ${ROSTER[a.who]?.name || a.who} · ${PLACES[a.place]?.name || a.place}`, 'appt');
    }
  }
  return out;
}

function canPay(eff) {
  const s = S(); if (!eff) return true;
  if (eff.gold != null && s.gold + eff.gold < 0) return false;
  for (const k of Object.keys(GOODS)) if (eff[k] != null && (s.items[k] || 0) + eff[k] < 0) return false;
  for (const k of ['food','troops']) if (eff[k] != null && s[k] + eff[k] < 0) return false;
  return true;
}

function unlockChar(id, out) {
  const s = S();
  if (!ROSTER[id] || s.met[id]) return;
  s.met[id] = 1;
  const memo = ROSTER_MEMO[id];
  if (memo) s.hints[id] = memo;
  if (out) out.push({ icon:'🪪', text:`명부 — ${ROSTER[id].name}`, cls:'unlock' });
  if (typeof toast === 'function') toast('🪪', `명부에 이름이 올랐습니다 — ${ROSTER[id].name}`);
}

function addLetter(id, out) {
  const s = S(); const L = LETTERS.find(l => l.id === id);
  if (!L || s.letters.inbox.includes(id) || (id in s.letters.replied)) return;
  s.letters.inbox.push(id);
  if (out) out.push({ icon:'✉️', text:`서신 — ${ROSTER[L.from]?.name || L.from}`, cls:'letter' });
}

function canReply() {
  const s = S();
  return (s.letters.day !== s.day) || s.letters.sentDay > 0;
}

function repliesLeft() {
  const s = S();
  if (s.letters.day !== s.day) return 2;
  return Math.max(0, s.letters.sentDay);
}

function useReply() {
  const s = S();
  if (s.letters.day !== s.day) { s.letters.day = s.day; s.letters.sentDay = 2; }
  s.letters.sentDay = Math.max(0, s.letters.sentDay - 1);
}

/* ── 목표 ─────────────────────────────────────────────────── */
function goalSummary() {
  return GOALS.map(g => ({ ...g, ok: g.check(S()), text: g.now(S()) }));
}
