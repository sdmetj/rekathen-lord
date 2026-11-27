/* ══════════════════════════════════════════════════════════════
   엔진 — 하루의 흐름, 사건, 편지, 약속, 소문, 의뢰
   ══════════════════════════════════════════════════════════════ */

const PHASE_NAME = { am:'오전', pm:'오후', night:'밤' };
const PHASE_ICON = { am:'🌅', pm:'☀️', night:'🌙' };

const Game = {
  /* ── 시작 ─────────────────────────────────────────────── */
  newGame(name) {
    State.reset(name);
    const s = S();
    s.met = { kael:1, serena:1, greta:1 };
    s.day = 1; s.phase = 'am';
    s.flags = {};
    State.save();
    UI.openPrologue();
  },

  resume() {
    const s = State.load();
    if (!s) return false;
    State.init(s);
    UI.go('today');
    if (!s.tut.seenIntro) UI.openScene(this.scriptedEvent('p_open'));
    return true;
  },

  /* ── 사건 ─────────────────────────────────────────────── */
  eventDue(day, phase) {
    const s = S();
    return ACT1_EVENTS.find(e =>
      e.day === day && e.phase === phase && !s.seen[e.id] &&
      (!e.cond || e.cond(s)));
  },

  scriptedEvent(id) { return ACT1_EVENTS.find(e => e.id === id); },

  finishEvent(ev) {
    const s = S();
    s.seen[ev.id] = 1;
    if (ev.unlock) ev.unlock.forEach(id => unlockChar(id));
    if (ev.id === 'a1_letter1') { addLetter('L_serena_01'); s.tut.letters = false; }
    if (ev.id === 'a1_letter2') { addLetter('L_cardinal_01'); }
    if (ev.finale) { this.completeAct1(); return; }
    /* 사건이 끝나면 명부·목표를 다시 그린다 */
    State.save(); UI.render();
  },

  /* ── 시간 ─────────────────────────────────────────────── */
  nextPhase() {
    const s = S();
    if (s.phase === 'am') { s.phase = 'pm'; s.slots.pm = Math.max(s.slots.pm, 2); }
    else if (s.phase === 'pm') { s.phase = 'night'; s.slots.night = Math.max(s.slots.night, 1); }
    else { return this.endDay(); }
    State.save(); UI.render(); UI.maybeAutoEvent();
  },

  goPhase(p) {
    const s = S();
    const order = ['am','pm','night'];
    if (order.indexOf(p) < order.indexOf(s.phase)) return;
    s.phase = p; State.save(); UI.render();
  },

  endDay() {
    const s = S();
    if (s.day === 15 && s.phase === 'night' && !s.done) {
      UI.toast('🌙', '오늘 밤을 지나칠 수 없다. 성벽 위의 불빛이 기다린다.');
      return;
    }
    /* 약속을 지키지 못했는가 */
    if (s.appt && s.appt.day <= s.day) {
      const who = s.appt.who;
      s.trust[who] = Math.max(0, (s.trust[who] || 0) - 5);
      s.flags['서운함_' + who] = 1;
      s.apptLog.push({ who, day: s.appt.day, kept:false });
      s.appt = null;
      UI.toast('🕯', `${ROSTER[who].name}과의 약속을 지키지 못했다 (신뢰 −5)`);
    }
    /* 의뢰 기한 */
    if (s.errands?.length) {
      s.errands = s.errands.filter(e => {
        if (e.due < s.day) {
          const E = ERRANDS[e.key];
          if (E?.fail) applyEff(E.fail);
          UI.toast('📜', `의뢰 기한이 지났다 — ${E?.title || ''}`);
          return false;
        }
        return true;
      });
    }

    const report = this.settle();
    s.day += 1;
    s.phase = 'am';
    s.slots = { am:2, pm:2, night:1 };
    s.hp = Math.min(100, s.hp + 6);
    /* 소문은 이틀에 한 번 식는다 */
    if (s.day % 2 === 0) for (const k of Object.keys(s.tags)) {
      s.tags[k] = Math.max(0, s.tags[k] - 1);
    }
    this.checkUnlocks();
    this.deliverLetter(report);
    this.makeVisitors(report);
    s.lastReport = report;
    State.save();
    UI.render();
    UI.openReport(report);
  },

  settle() {
    const s = S();
    const income = 5 + Math.floor(s.morale / 25) + (s.bld.market >= 2 ? 4 : 0) + (s.bld.tavern ? 3 : 0) + Math.floor((s.pop||0) / 8);
    const eat = 2 + Math.floor((s.pop || 0) / 10);
    s.gold += income;
    s.food = Math.max(0, s.food - eat);
    let warn = '';
    if (s.food <= 0) { s.morale = Math.max(0, s.morale - 6); warn = '식량이 바닥났다. 민심 −6'; }
    if (s.faith > 55 && s.tags.heresy >= 4) s.flags.church_watch = 1;
    return { day: s.day, income, eat, food: s.food, morale: s.morale, warn,
             goals: goalsDone(), letters: [] };
  },

  /* ── 해금 ─────────────────────────────────────────────── */
  checkUnlocks() {
    const s = S();
    if (s.day >= 2 && !s.met.ansel) unlockChar('ansel');
    if (s.flags.tavern_open && !s.met.brix) unlockChar('brix');
  },

  /* ── 편지 ─────────────────────────────────────────────── */
  letterEligible(L) {
    const s = S(), w = L.when || {};
    if (w.scripted) return false;
    if (s.letters.inbox.includes(L.id) || (L.id in s.letters.replied)) return false;
    if (w.day && s.day < w.day) return false;
    if (w.fromDay && s.day < w.fromDay) return false;
    if (w.toDay && s.day > w.toDay) return false;
    if (w.flag && !s.flags[w.flag]) return false;
    if (w.notFlag && s.flags[w.notFlag]) return false;
    if (w.minTrust) for (const [id, n] of Object.entries(w.minTrust)) if (trustOf(id) < n) return false;
    if (w.notMet && !s.met[w.notMet]) return false;
    return true;
  },

  deliverLetter(report) {
    const s = S();
    if (s.done && !s.free) return;
    if (s.letters.inbox.length >= 5) return;
    const L = LETTERS.find(l => this.letterEligible(l));
    if (!L) return;
    s.letters.inbox.push(L.id);
    report.letters.push(L.id);
    UI.toast('✉️', `서신이 도착했다 — ${ROSTER[L.from].name}`);
  },

  replyLetter(id, idx) {
    const s = S();
    const L = LETTERS.find(l => l.id === id); if (!L) return [];
    const r = L.replies[idx]; if (!r) return [];
    if (repliesLeft() <= 0) { UI.toast('⌛', '오늘 쓸 수 있는 답장을 다 썼다. 내일 다시.'); return null; }
    useReply();
    const out = applyEff(r.eff);
    s.letters.replied[id] = idx;
    s.letters.inbox = s.letters.inbox.filter(x => x !== id);
    if (!s.letters.read.includes(id)) s.letters.read.push(id);
    s.log.push({ d:s.day, k:'letter', id, tone:r.tone });
    State.save();
    return out;
  },

  /* ── 행동 ─────────────────────────────────────────────── */
  canSpendSlot() { return (S().slots[S().phase] || 0) > 0; },

  doAction(place, id) {
    const s = S(), A = ACTIONS[place]?.find(a => a.id === id); if (!A) return false;
    if (!this.canSpendSlot()) { UI.toast('⌛', '이번 시간에 할 수 있는 일을 다 했다.'); return false; }
    const c = A.cost || {};
    if (c.gold && s.gold < c.gold) { UI.toast('🪙', '금화가 모자란다.'); return false; }
    for (const k of Object.keys(GOODS)) {
      if (c[k] && (s.items[k] || 0) < c[k]) { UI.toast(GOODS[k].icon, `${GOODS[k].name}이(가) 모자란다.`); return false; }
    }
    if (c.gold) s.gold -= c.gold;
    for (const k of Object.keys(GOODS)) if (c[k]) s.items[k] = Math.max(0, (s.items[k] || 0) - c[k]);
    s.slots[s.phase] -= 1;
    const out = applyEff(A.eff);
    s.log.push({ d:s.day, k:'action', place, id });
    State.save();
    UI.render();
    UI.showActionResult(A, out);
    return true;
  },

  sell(key, n) {
    const s = S(), g = GOODS[key]; if (!g) return false;
    if ((s.items[key] || 0) < n) { UI.toast(g.icon, `${g.name}이(가) 모자란다.`); return false; }
    if (!this.canSpendSlot()) { UI.toast('⌛', '이번 시간에 할 수 있는 일을 다 했다.'); return false; }
    s.items[key] -= n; s.gold += g.sell * n; s.slots[s.phase] -= 1;
    if (key === 'herb') s.tags.herb = Math.min(6, (s.tags.herb || 0) + 1);
    State.save(); UI.render();
    UI.toast(g.icon, `${g.name} ${n}개를 팔았다 (+${g.sell * n}G)`);
    return true;
  },

  buy(key, n) {
    const s = S(), g = GOODS[key]; if (!g) return false;
    const total = g.buy * n;
    if (s.gold < total) { UI.toast('🪙', '금화가 모자란다.'); return false; }
    if (!this.canSpendSlot()) { UI.toast('⌛', '이번 시간에 할 수 있는 일을 다 했다.'); return false; }
    s.gold -= total; s.items[key] = (s.items[key] || 0) + n; s.slots[s.phase] -= 1;
    State.save(); UI.render();
    UI.toast(g.icon, `${g.name} ${n}개를 샀다 (−${total}G)`);
    return true;
  },

  build(key) {
    const s = S(), B = BUILDINGS[key]; if (!B) return false;
    if (isBuilt(key)) { UI.toast('🏗', '이미 세웠다.'); return false; }
    const c = B.cost;
    if (s.gold < (c.gold || 0)) { UI.toast('🪙', `금화가 모자란다 (${c.gold}G 필요)`); return false; }
    for (const [k, n] of Object.entries(c)) {
      if (k === 'gold') continue;
      if ((s.items[k] || 0) < n) { UI.toast(GOODS[k]?.icon || '📦', `${GOODS[k]?.name || k}이(가) 모자란다 (${n}개 필요)`); return false; }
    }
    if (!this.canSpendSlot()) { UI.toast('⌛', '이번 시간에 할 수 있는 일을 다 했다.'); return false; }
    s.gold -= c.gold || 0;
    for (const [k, n] of Object.entries(c)) if (k !== 'gold') s.items[k] -= n;
    s.bld[key === 'market2' ? 'market' : key === 'tavern2' ? 'tavern' : key] = key === 'market2' ? 2 : 1;
    s.slots[s.phase] -= 1;
    s.flags['built_' + key] = 1;
    State.save(); UI.render();
    UI.toast(B.icon, `${B.name} 완공`);
    return true;
  },

  /* ── 약속 ─────────────────────────────────────────────── */
  keepAppointment() {
    const s = S(); if (!s.appt) return;
    const who = s.appt.who;
    s.apptLog.push({ who, day: s.day, kept:true });
    s.flags['kept_' + who] = 1;
    const a = s.appt;
    s.appt = null;
    State.save();
    UI.openNight(who, true);
  },

  /* 14일 밤의 후보 */
  winterCandidates() {
    return Object.keys(NIGHTS).filter(id => has(id) && trustOf(id) >= 5)
      .sort((a, b) => trustOf(b) - trustOf(a)).slice(0, 3);
  },

  /* ── 의뢰 ─────────────────────────────────────────────── */
  makeVisitors(report) {
    const s = S(); if (s.done && !s.free) return;
    const active = activeTags();
    for (const t of active) {
      const key = Object.keys(ERRANDS).find(k => ERRANDS[k].tag === t);
      if (!key) continue;
      const already = (s.visitors || []).some(v => v.key === key && v.day >= s.day - 1);
      const running = (s.errands || []).some(e => e.key === key);
      if (already || running) continue;
      if ((s.visitors || []).length >= 2) break;
      s.visitors.push({ key, day: s.day, id: key + '_' + s.day });
      UI.toast(ERRANDS[key].icon, `문 앞에 사람이 왔다 — ${ERRANDS[key].title}`);
    }
  },

  acceptErrand(vid) {
    const s = S(); const v = (s.visitors || []).find(x => x.id === vid); if (!v) return;
    const E = ERRANDS[v.key];
    const req = E.req || {};
    for (const [k, n] of Object.entries(req)) {
      if (k === 'gold' && s.gold < n) return UI.toast('🪙', '금화가 모자란다.');
      if (['food','troops'].includes(k) && s[k] < n) return UI.toast('⚠️', `${EFF_LABEL[k]?.[0] || k}이(가) 모자란다.`);
      if (GOODS[k] && (s.items[k] || 0) < n) return UI.toast(GOODS[k].icon, `${GOODS[k].name}이(가) ${n}개 필요하다.`);
    }
    for (const [k, n] of Object.entries(req)) {
      if (k === 'gold') s.gold -= n;
      else if (['food','troops'].includes(k)) s[k] = Math.max(0, s[k] - n);
      else s.items[k] = Math.max(0, (s.items[k] || 0) - n);
    }
    s.visitors = s.visitors.filter(x => x.id !== vid);
    s.errands = s.errands || [];
    s.errands.push({ key: v.key, due: s.day + (E.due || 3), title: E.title, icon: E.icon });
    State.save(); UI.render();
    UI.toast(E.icon, `의뢰를 받았다 — ${E.title}`);
  },

  deliverErrand(key) {
    const s = S(); const e = (s.errands || []).find(x => x.key === key); if (!e) return;
    const E = ERRANDS[key];
    s.errands = s.errands.filter(x => x.key !== key);
    const out = applyEff(E.reward);
    s.log.push({ d:s.day, k:'errand', key });
    State.save(); UI.render();
    UI.showErrandDone(E, out);
  },

  /* ── 완결 ─────────────────────────────────────────────── */
  completeAct1() {
    const s = S();
    s.done = true; s.ending = 'A1'; s.flags.final_done = 1;
    if (s.met.dorun && !s.flags.dorun_out) addLetter('L_dorun_01');
    State.save();
    UI.openEnding();
  },

  enterFree() {
    const s = S(); s.free = true; s.done = true;
    State.save(); UI.go('today'); UI.render();
    UI.toast('❄️', '연대기 — 2막 준비 중. 영지는 계속 돌아간다.');
  },
};
