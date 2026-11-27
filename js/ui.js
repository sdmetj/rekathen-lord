/* ══════════════════════════════════════════════════════════════
   UI — 화면 · 장면 · 편지 · 단서 수첩
   ══════════════════════════════════════════════════════════════ */

const $  = (q, r) => (r || document).querySelector(q);
const $$ = (q, r) => Array.from((r || document).querySelectorAll(q));
const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));

const UI = {
  tab: 'today',
  sheet: null,
  scene: null,
  bookTab: 'doc',
  linkSel: [],

  /* ══ 기본 ══════════════════════════════════════════════ */
  boot() {
    this.renderTitle();
  },

  renderTitle() {
    const s = State.load();
    const hasSave = !!s;
    $('#app').classList.add('is-hidden');
    const old = document.getElementById('titleScreen'); if (old) old.remove();
    const stage = ['serena','kael','greta'].map(id =>
      `<img class="t-char ${id}" src="assets/${id}.png?v=${ASSET_VER}" alt="">`).join('');
    const t = document.createElement('div');
    t.id = 'titleScreen'; t.className = 'title-screen';
    t.innerHTML = `
      <div class="title">
        <div class="t-bg"></div><div class="t-veil"></div>
        <div class="t-snow">${Array.from({length:26},(_,i)=>`<i style="--x:${(i*37)% 100}%;--d:${6+(i%7)*1.7}s;--s:${1+(i%3)}px"></i>`).join('')}</div>
        <div class="t-stage">${stage}</div>
        <div class="t-inner">
          <p class="t-kicker">《외뿔의 악마》 세계관 · 변경 영주 서사 RPG</p>
          <h1 class="t-title">레카텐<br><span>아르덴 변경령</span></h1>
          <p class="t-sub">빈 성의 겨울 — 제1막 파일럿<br><b>15일 · 12인</b></p>
          <div class="t-menu">
            ${hasSave ? `<button class="btn primary" data-act="resume">▶ 이어서 — 겨울 ${s.day}일 ${PHASE_NAME[s.phase]}</button>` : ''}
            <div class="t-new">
              <input id="tName" maxlength="10" placeholder="영주의 이름" value="${hasSave ? '' : '아르덴 영주'}">
              <button class="btn ${hasSave ? '' : 'primary'}" data-act="new">✦ 새로 시작한다</button>
            </div>
            <button class="btn ghost small" data-act="import">기록 불러오기 (코드)</button>
          </div>
          <p class="t-foot">54인의 명부 · 이 겨울에 문을 두드리는 사람은 12인</p>
        </div>
      </div>`;
    document.body.appendChild(t);
    t.addEventListener('click', e => {
      const a = e.target.closest('[data-act]'); if (!a) return;
      if (a.dataset.act === 'new') this.newGame();
      if (a.dataset.act === 'resume') this.resume();
      if (a.dataset.act === 'import') this.openImport();
    });
  },

  hideTitle() {
    const t = document.getElementById('titleScreen'); if (t) t.remove();
    $('#app').classList.remove('is-hidden');
  },

  newGame() {
    const name = ($('#tName')?.value || '').trim() || '아르덴 영주';
    this.hideTitle();
    Game.newGame(name);
  },

  resume() {
    if (!Game.resume()) { this.toast('⚠️', '기록을 읽지 못했습니다.'); this.renderTitle(); return; }
    this.hideTitle();
  },

  openImport() {
    this.openSheet(`
      <div class="sheet-head"><h2>기록 불러오기</h2><button class="x" data-close>✕</button></div>
      <p class="hint">이전에 내보낸 기록 코드를 붙여 넣으십시오.</p>
      <textarea id="impCode" class="code-area" placeholder="eyJ2IjozLC..."></textarea>
      <div class="row gap" style="margin-top:10px">
        <button class="btn primary" id="impGo">불러오기</button>
        <button class="btn ghost" data-close>취소</button>
      </div>`);
    $('#impGo').onclick = () => {
      const ok = State.importCode($('#impCode').value || '');
      if (!ok) return this.toast('⚠️', '코드가 올바르지 않습니다.');
      this.closeSheet(); this.go('today');
    };
  },

  exportSave() {
    const code = State.exportCode();
    this.openSheet(`
      <div class="sheet-head"><h2>기록 내보내기</h2><button class="x" data-close>✕</button></div>
      <p class="hint">아래 코드를 복사해 두면 다른 기기에서 이어서 할 수 있습니다.</p>
      <textarea class="code-area" readonly>${code}</textarea>
      <button class="btn primary" id="copyCode">복사</button>`);
    $('#copyCode').onclick = () => {
      const t = $('.code-area'); t.select();
      try { document.execCommand('copy'); this.toast('📋', '복사했습니다.'); } catch (e) {}
    };
  },

  go(tab) {
    this.tab = tab;
    this.hideTitle();
    $('#hud').classList.remove('is-hidden');
    $('#tabbar').classList.remove('is-hidden');
    this.render();
  },

  /* ══ 렌더 ══════════════════════════════════════════════ */
  render() {
    if (!S()) return;
    this.renderHud();
    this.renderTabs();
    const v = $('#view');
    v.scrollTop = 0;
    if (this.tab === 'today') this.viewToday(v);
    else if (this.tab === 'roster') this.viewRoster(v);
    else if (this.tab === 'letters') this.viewLetters(v);
    else if (this.tab === 'book') this.viewBook(v);
    else if (this.tab === 'domain') this.viewDomain(v);
  },

  renderHud() {
    const s = S();
    const pips = Array.from({ length: 5 }, (_, i) => {
      const used = i >= slotLeft();
      return `<i class="pip ${used ? 'off' : 'on'}"></i>`;
    }).join('');
    const g = goalsDone();
    $('#hud').innerHTML = `
      <div class="hud-row hud-top">
        <div class="fief"><em>아르덴 변경령</em><b>겨울 <span>${s.day}일</span></b></div>
        <div class="hud-date">
          <span class="phase-pill">${PHASE_ICON[s.phase]} ${PHASE_NAME[s.phase]}</span>
          <button class="icon-btn" data-act="menu">☰</button>
        </div>
      </div>
      <div class="hud-row hud-mid">
        <div class="pips">${pips}</div>
        <div class="goal-chip" data-act="goal">1막 목표 <b>${g}/4</b></div>
      </div>
      <div class="res-row">
        <span class="res gold">🪙 <b>${s.gold}</b></span>
        <span class="res morale">🕯 <b>${s.morale}</b></span>
        <span class="res faith">⛪ <b>${s.faith}</b></span>
        <span class="res food">🍞 <b>${s.food}일</b></span>
        <span class="res troops">🛡 <b>${s.troops}</b></span>
      </div>`;
    $('#hud').onclick = e => {
      const a = e.target.closest('[data-act]'); if (!a) return;
      if (a.dataset.act === 'menu') this.openMenu();
      if (a.dataset.act === 'goal') { this.tab = 'domain'; this.render(); }
    };
  },

  renderTabs() {
    const s = S();
    const inbox = s.letters.inbox.length;
    const rows = [
      ['today','🏰','오늘'], ['roster','🪪','명부'], ['letters','✉️','서신'],
      ['book','📜','수첩'], ['domain','🌫','영지'],
    ];
    $('#tabbar').innerHTML = rows.map(([k, i, n]) => `
      <button class="tab ${this.tab === k ? 'on' : ''}" data-tab="${k}">
        <i>${i}${k === 'letters' && inbox ? `<b class="badge">${inbox}</b>` : ''}</i><span>${n}</span>
      </button>`).join('');
    $('#tabbar').onclick = e => {
      const b = e.target.closest('[data-tab]'); if (b) this.go(b.dataset.tab);
    };
  },

  /* ══ 오늘 ══════════════════════════════════════════════ */
  viewToday(v) {
    const s = S();
    const ev = Game.eventDue(s.day, s.phase);
    const ambient = AMBIENT[s.phase][s.day % AMBIENT[s.phase].length];
    const appt = s.appt && s.appt.day === s.day && s.appt.phase === s.phase ? s.appt : null;
    const letters = s.letters.inbox.length;
    const goalHtml = goalSummary().map(g =>
      `<span class="gchip ${g.ok ? 'ok' : ''}">${g.ok ? '✓' : '○'} ${g.name}</span>`).join('');
    const partners = Object.keys(PLACES).map(k => {
      const here = Object.keys(s.met).filter(id => ROSTER[id]?.place === k && s.met[id]);
      return `<button class="place" data-place="${k}">
        <span class="p-ico">${PLACES[k].icon}</span>
        <span class="p-name">${PLACES[k].name.split(' · ')[0]}</span>
        <span class="p-say">${here.length ? here.slice(0,3).map(id => ROSTER[id].name).join(' · ') : '조용하다'}</span>
      </button>`;
    }).join('');

    v.innerHTML = `
      ${s.free ? `<div class="banner">연대기 모드 · 2막 준비 중 — 영지는 계속 돌아간다</div>` : ''}
      <section class="day-head">
        <p class="kicker">${PHASE_ICON[s.phase]} ${PHASE_NAME[s.phase]} · 겨울 ${s.day}일</p>
        <h2>${s.done ? '겨울이 지나간다' : '빈 성의 겨울'}</h2>
        <p class="ambient">${ev ? '아직 아무 일도 일어나지 않았다. …곧 일어날 것이다.' : ambient}</p>
      </section>

      ${ev ? `
      <button class="event-card" data-event="${ev.id}">
        <span class="ec-kicker">오늘의 장면</span>
        <b>${esc(ev.title)}</b>
        <span class="ec-go">장면 보기 ›</span>
      </button>` : `
      <div class="calm-card">
        <span class="ec-kicker">조용한 ${PHASE_NAME[s.phase]}</span>
        <b>${letters ? '책상 위에 답장하지 않은 편지가 있다.' : '할 일을 고르십시오.'}</b>
      </div>`}

      ${appt ? `
      <button class="appt-card" data-appt="1">
        <span class="a-ico">◈</span>
        <span><em>오늘의 약속</em><b>${ROSTER[appt.who].name} · ${PLACES[appt.place].name}</b></span>
        <span class="a-go">지키러 간다 ›</span>
      </button>` : ''}

      <div class="goal-row">${goalHtml}</div>

      <div class="sect"><h3>영지의 장소</h3><span>${PHASE_NAME[s.phase]}에 ${s.slots[s.phase] || 0}번 남았다</span></div>
      <div class="places">${partners}</div>

      <div class="row gap" style="margin:16px 0 6px">
        <button class="btn primary grow" data-act="next">${s.phase === 'night' ? '🛏 하루 마감' : `다음 시간 ›`}</button>
        <button class="btn ghost" data-act="menu">☰</button>
      </div>
      <p class="hint center">${s.phase === 'night' ? '밤에는 한 번의 행동. 하루가 끝나면 서신이 온다.' : '시간을 보내면 다음 시간대의 장면이 열린다.'}</p>
    `;
    v.onclick = e => {
      const pl = e.target.closest('[data-place]');
      if (pl) return this.openPlace(pl.dataset.place);
      const evb = e.target.closest('[data-event]');
      if (evb) return this.openEventById(evb.dataset.event);
      if (e.target.closest('[data-appt]')) return Game.keepAppointment();
      const a = e.target.closest('[data-act]');
      if (!a) return;
      if (a.dataset.act === 'next') Game.nextPhase();
      if (a.dataset.act === 'menu') this.openMenu();
    };
  },

  maybeAutoEvent() {
    const s = S(); if (!s) return;
    if (this.scene) return;
    const ev = Game.eventDue(s.day, s.phase);
    if (ev) setTimeout(() => this.openScene(ev), 380);
  },

  /* ══ 명부 ══════════════════════════════════════════════ */
  viewRoster(v) {
    const s = S();
    const ids = Object.keys(ROSTER);
    const metCount = ids.filter(id => s.met[id]).length;
    const act1 = ids.filter(id => ROSTER[id].act === 1);
    const cells = ids.map(id => {
      const c = ROSTER[id], on = !!s.met[id];
      return `<button class="rcell ${on ? 'on' : 'locked'}" data-char="${on ? id : ''}" data-lock="${on ? '' : id}">
        ${on ? `<img src="assets/${id}_portrait.png?v=${ASSET_VER}" alt="">` : `<span class="sil">?</span>`}
        <b>${on ? c.name : '???'}</b>
        <i>${c.role}</i>
        ${on && c.tier !== '조연' ? `<em class="tier">${c.tier}</em>` : ''}
      </button>`;
    }).join('');
    v.innerHTML = `
      <section class="day-head">
        <p class="kicker">명부 · 수집이 아니라 기억</p>
        <h2>이 겨울에 만난 사람 <span>${metCount}</span><small>/ ${act1.length}</small></h2>
        <p class="ambient">명부에는 54자리가 있다. 이 겨울에 문을 두드리는 사람은 열둘.</p>
      </section>
      <div class="roster-grid">${cells}</div>
      <p class="hint center" style="margin:14px 0">??? — 아직 오지 않은 사람. 2막이 열리면 이름을 얻는다.</p>`;
    v.onclick = e => {
      const b = e.target.closest('[data-char]');
      if (b && b.dataset.char) return this.openChar(b.dataset.char);
      const l = e.target.closest('[data-lock]');
      if (l && l.dataset.lock) {
        const c = ROSTER[l.dataset.lock];
        this.toast('🔒', `${c.role} — ${c.act}막에 도착한다.`);
      }
    };
  },

  openChar(id) {
    const s = S(), c = ROSTER[id];
    const t = trustOf(id), a = affOf(id);
    const tier = t >= 60 ? 3 : t >= 40 ? 2 : t >= 20 ? 1 : 0;
    const line = HUB[id]?.[tier] || c.line;
    const met = s.met[id];
    this.openSheet(`
      <div class="char-sheet">
        <div class="cs-art"><img src="assets/${id}_portrait.png?v=${ASSET_VER}" alt=""></div>
        <div class="cs-body">
          <p class="kicker">${c.role} · ${PLACES[c.place]?.name || ''}</p>
          <h2>${c.name}</h2>
          <p class="cs-line">"${line}"</p>
          <div class="meter"><span>신뢰</span><i><b style="width:${t}%"></b></i><em>${t}</em></div>
          <div class="meter love"><span>호감</span><i><b style="width:${a / 10}%"></b></i><em>${Math.round(a / 10)}%</em></div>
          ${s.hints[id] ? `<p class="cs-memo">명부의 한 줄 — ${s.hints[id]}</p>` : ''}
          ${c.romance ? `<p class="hint">로맨스는 신뢰로 열린다. 선물로는 오르지 않는다.</p>` : ''}
          ${met && PLACES[c.place] ? `<button class="btn ghost" data-place="${c.place}">${PLACES[c.place].name}에서 만나기</button>` : ''}
        </div>
      </div>`);
    $('.cs-body [data-place]')?.addEventListener('click', e => { this.closeSheet(); this.openPlace(e.target.dataset.place); });
  },

  /* ══ 서신 ══════════════════════════════════════════════ */
  viewLetters(v) {
    const s = S();
    const inbox = s.letters.inbox.map(id => LETTERS.find(l => l.id === id)).filter(Boolean);
    const done = s.letters.read.map(id => LETTERS.find(l => l.id === id)).filter(Boolean).slice(-12).reverse();
    v.innerHTML = `
      <section class="day-head">
        <p class="kicker">서신 · 하루 두 통의 답장</p>
        <h2>편지가 오는 밤</h2>
        <p class="ambient">오늘 쓸 수 있는 답장 <b>${repliesLeft()}</b>통. 답장 한 줄이 다음 만남을 바꾼다.</p>
      </section>
      ${inbox.length ? inbox.map(L => `
        <button class="letter-row" data-letter="${L.id}">
          <span class="lr-wax">${L.wax === '교단' ? '†' : L.wax === '추기경' ? '††' : L.wax === '숲' ? '❖' : L.wax === '주점' ? '◉' : L.wax === '공방' ? '⚗' : '✦'}</span>
          <span class="lr-main"><em>${ROSTER[L.from]?.name || L.from}</em><b>${L.title}</b>
          <i>${esc(L.body[1] || L.body[0]).slice(0, 46)}…</i></span>
          <span class="lr-new">새 편지</span>
        </button>`).join('') : `<div class="empty">답장하지 않은 편지가 없다. 밤이 지나면 새 편지가 온다.</div>`}
      ${done.length ? `<div class="sect"><h3>지난 서신</h3><span>${done.length}</span></div>
        ${done.map(L => `<button class="letter-row read" data-letter="${L.id}">
          <span class="lr-wax">✦</span><span class="lr-main"><em>${ROSTER[L.from]?.name || L.from}</em><b>${L.title}</b></span>
        </button>`).join('')}` : ''}
      <p class="hint center" style="margin:16px 0">편지는 하루에 한 통씩 도착한다. 약속은 답장에서 잡힌다.</p>`;
    v.onclick = e => {
      const b = e.target.closest('[data-letter]');
      if (b) this.openLetter(b.dataset.letter);
    };
  },

  openLetter(id) {
    const s = S(), L = LETTERS.find(l => l.id === id); if (!L) return;
    const replied = s.letters.replied[id] != null;
    const canReply = !replied && L.replies?.length && repliesLeft() > 0;
    const body = L.body.map(p => `<p>${esc(p)}</p>`).join('');
    this.openOverlay(`
      <div class="letter-wrap">
        <div class="letter-paper">
          <div class="lp-head"><span>${esc(L.title)}</span><i>${ROSTER[L.from]?.name || L.from}</i></div>
          <div class="lp-body">${body}</div>
          <div class="lp-seal">${L.wax === '교단' ? '†' : L.wax === '추기경' ? '††' : '✦'}</div>
        </div>
        <div class="letter-actions">
          ${replied ? `<p class="hint center">이미 답장했다. ${s.letters.replied[id] >= 0 ? '' : ''}</p>` :
            canReply ? `<p class="lbl">답장을 고르십시오 — 오늘 ${repliesLeft()}통 남음</p>
            ${L.replies.map((r, i) => `
              <button class="choice tone-${r.tone}" data-reply="${i}">
                <span class="tone-mark">${r.tone === 'near' ? '가까이' : r.tone === 'far' ? '거리두기' : '장난'}</span>
                <span class="choice-label">${esc(r.t)}</span>
              </button>`).join('')}` :
            L.noReply ? `<button class="btn ghost" data-archive="${L.id}">읽고 보관한다</button>` :
            `<p class="hint center">오늘의 답장을 다 썼다. 내일 다시 쓰십시오.</p>`}
          <button class="btn ghost" data-close>닫기</button>
        </div>
      </div>`);
    $('.letter-wrap').onclick = e => {
      const ar = e.target.closest('[data-archive]');
      if (ar) {
        const ss = S();
        ss.letters.inbox = ss.letters.inbox.filter(x => x !== ar.dataset.archive);
        if (!ss.letters.read.includes(ar.dataset.archive)) ss.letters.read.push(ar.dataset.archive);
        State.save(); this.closeOverlay(); this.render(); return;
      }
      const b = e.target.closest('[data-reply]');
      if (b) {
        const idx = +b.dataset.reply;
        const out = Game.replyLetter(id, idx);
        if (!out) return;
        const r = L.replies[idx];
        this.showResult(r.res || [], out, () => { this.closeOverlay(); this.render(); });
      }
    };
  },

  /* ══ 수첩 ══════════════════════════════════════════════ */
  viewBook(v) {
    const s = S();
    const tabs = CLUE_TABS.map(t => `<button class="btab ${this.bookTab === t.k ? 'on' : ''}" data-btab="${t.k}">${t.name}${t.k !== 'link' ? `<b>${s.clues.filter(id => CLUES[id]?.tab === t.k).length}</b>` : `<b>${s.inf.length}</b>`}</button>`).join('');
    let body = '';
    if (this.bookTab === 'link') {
      body = `
        <p class="hint">단서 두 개를 골라 잇는다. 맞는 짝이면 추론 카드가 생긴다.</p>
        <div class="link-chips">${s.clues.map(id => `<button class="chip ${this.linkSel.includes(id) ? 'on' : ''}" data-link="${id}">${CLUES[id].name}</button>`).join('') || '<span class="hint">단서가 없다.</span>'}</div>
        <button class="btn primary" data-act="infer" ${this.linkSel.length !== 2 ? 'disabled' : ''}>두 단서를 잇는다</button>
        ${s.inf.length ? `<div class="sect"><h3>추론 카드</h3><span>${s.inf.length}</span></div>` : ''}
        ${s.inf.map(id => { const I = INFERENCES.find(x => x.id === id); return I ? `
          <div class="infer-card"><em>추론</em><b>${I.title}</b><p>${I.text}</p><span>${I.unlock}</span></div>` : ''; }).join('')}`;
    } else {
      const list = Object.keys(CLUES).filter(id => CLUES[id].tab === this.bookTab);
      body = list.map(id => {
        const c = CLUES[id], got = s.clues.includes(id);
        return got ? `<div class="clue-card got"><span class="cc-id">${id}</span><b>${c.name}</b><p>${c.text}</p><em>${c.from}</em></div>`
          : `<div class="clue-card"><span class="cc-id">${id}</span><b>???</b><p class="locked">아직 모른다. ${this.clueHint(id)}</p></div>`;
      }).join('');
    }
    v.innerHTML = `
      <section class="day-head">
        <p class="kicker">단서 수첩</p>
        <h2>아는 것 <span>${s.clues.length}</span><small> / 12</small> · 추론 ${s.inf.length}</h2>
        <p class="ambient">단서는 정보가 아니라, 물을 수 있는 권리다.</p>
      </section>
      <div class="btabs">${tabs}</div>
      <div class="book-body">${body}</div>`;
    v.onclick = e => {
      const t = e.target.closest('[data-btab]'); if (t) { this.bookTab = t.dataset.btab; this.linkSel = []; return this.render(); }
      const c = e.target.closest('[data-link]');
      if (c) {
        const id = c.dataset.link;
        if (this.linkSel.includes(id)) this.linkSel = this.linkSel.filter(x => x !== id);
        else if (this.linkSel.length < 2) this.linkSel.push(id);
        return this.render();
      }
      if (e.target.closest('[data-act="infer"]')) this.tryInfer();
    };
  },

  clueHint(id) {
    const c = CLUES[id]; return `출처 — ${c.from.split(' · ')[0]}`;
  },

  tryInfer() {
    const s = S();
    if (this.linkSel.length !== 2) return;
    const [a, b] = this.linkSel;
    const I = INFERENCES.find(x => (x.need[0] === a && x.need[1] === b) || (x.need[0] === b && x.need[1] === a));
    if (!I) { this.toast('📜', '두 단서가 이어지지 않는다.'); this.linkSel = []; return this.render(); }
    if (s.inf.includes(I.id)) { this.toast('📜', '이미 이은 추론이다.'); this.linkSel = []; return this.render(); }
    s.inf.push(I.id);
    State.save();
    this.linkSel = [];
    this.render();
    this.openSheet(`
      <div class="sheet-head"><h2>추론 — ${I.title}</h2><button class="x" data-close>✕</button></div>
      <p class="infer-text">${I.text}</p>
      <p class="hint">${I.unlock}</p>
      <button class="btn primary" data-close>기록한다</button>`);
  },

  /* ══ 영지 ══════════════════════════════════════════════ */
  viewDomain(v) {
    const s = S();
    const tags = Object.keys(TAGS).filter(k => !TAGS[k].hidden).map(k => {
      const h = tagHeat(k), T = TAGS[k], on = h >= T.at;
      return `<div class="tag ${on ? 'on' : ''}">
        <div class="tag-top"><b>${T.icon} ${T.name}</b><span>${h}/${T.max}</span></div>
        <i class="heat"><b style="width:${(h / T.max) * 100}%"></b></i>
        <p>${T.desc}${on ? ` <em>열림 — ${T.effect}</em>` : ''}</p>
      </div>`;
    }).join('');
    const builds = Object.entries(BUILDINGS).map(([k, B]) => {
      const built = isBuilt(k);
      const cost = Object.entries(B.cost).map(([m, n]) =>
        `${m === 'gold' ? '🪙' : GOODS[m]?.icon || ''}${n}`).join(' ');
      return `<button class="build ${built ? 'done' : ''}" data-build="${k}">
        <span class="b-ico">${B.icon}</span>
        <span class="b-main"><b>${B.name}</b><i>${B.desc}</i></span>
        <span class="b-cost">${built ? '완공' : cost}</span>
      </button>`;
    }).join('');
    const visitors = (s.visitors || []).map(v => {
      const E = ERRANDS[v.key];
      return `<div class="visit"><span>${E.icon}</span><div><b>${E.title}</b><p>${E.text}</p>
        <button class="btn small" data-accept="${v.id}">받아들인다</button></div></div>`;
    }).join('');
    const errands = (s.errands || []).map(e => {
      const E = ERRANDS[e.key], left = e.due - s.day;
      return `<div class="visit"><span>${E.icon}</span><div><b>${E.title}</b>
        <p>${left >= 0 ? `기한 D-${left}` : '기한 초과'}</p>
        <button class="btn small" data-deliver="${e.key}">납품한다</button></div></div>`;
    }).join('');

    v.innerHTML = `
      <section class="day-head">
        <p class="kicker">영지 · 소문이 사람을 부른다</p>
        <h2>아르덴의 겨울</h2>
        <p class="ambient">금화 ${s.gold} · 민심 ${s.morale} · 질서 ${s.order} · 식량 ${s.food}일</p>
      </section>
      <div class="goals">${goalSummary().map(g => `
        <div class="goal ${g.ok ? 'ok' : ''}"><span>${g.ok ? '✓' : '○'}</span><b>${g.name}</b><i>${g.text}</i></div>`).join('')}</div>

      <div class="sect"><h3>문 앞의 사람들</h3><span>${(s.visitors || []).length + (s.errands || []).length}</span></div>
      ${visitors || errands ? visitors + errands : `<p class="hint pad">아직 아무도 오지 않았다. 소문이 열리면 사람이 온다.</p>`}

      <div class="sect"><h3>소문</h3><span>${activeTags().length}개 활성</span></div>
      <div class="tags">${tags}</div>

      <div class="sect"><h3>시설</h3><span>${Object.keys(BUILDINGS).filter(k => isBuilt(k)).length} / ${Object.keys(BUILDINGS).length}</span></div>
      <div class="builds">${builds}</div>
      <div class="row gap" style="margin-top:14px">
        <button class="btn ghost grow" data-act="export">기록 내보내기</button>
      </div>
      <p class="hint center" style="margin:12px 0 4px">건설에는 행동 1회가 든다. 재료는 상회에서 사고팔 수 있다.</p>`;
    v.onclick = e => {
      const b = e.target.closest('[data-build]');
      if (b) return Game.build(b.dataset.build);
      const a = e.target.closest('[data-accept]');
      if (a) return Game.acceptErrand(a.dataset.accept);
      const d = e.target.closest('[data-deliver]');
      if (d) return Game.deliverErrand(d.dataset.deliver);
      if (e.target.closest('[data-act="export"]')) this.exportSave();
    };
  },

  /* ══ 장소 ══════════════════════════════════════════════ */
  openPlace(key) {
    const s = S(), P = PLACES[key];
    const here = Object.keys(s.met).filter(id => ROSTER[id]?.place === key && s.met[id]);
    const acts = (ACTIONS[key] || []).map(a => {
      const cost = [];
      if (a.cost?.gold) cost.push(`🪙 ${a.cost.gold}`);
      for (const [k, n] of Object.entries(a.cost || {})) if (GOODS[k]) cost.push(`${GOODS[k].icon} ${n}`);
      return `<button class="act" data-action="${a.id}">
        <span class="a-ico">${a.icon}</span>
        <span class="a-main"><b>${a.name}</b><i>${this.effText(a.eff)}</i></span>
        <span class="a-cost">${cost.join(' ') || '무료'}</span>
      </button>`;
    }).join('');
    const chars = here.map(id => `
      <button class="pchar" data-char="${id}">
        <img src="assets/${id}_portrait.png?v=${ASSET_VER}" alt="">
        <b>${ROSTER[id].name}</b><i>신뢰 ${trustOf(id)}</i>
      </button>`).join('');
    const goods = key === 'market' ? Object.keys(GOODS).map(k => {
      const g = GOODS[k], have = s.items[k] || 0;
      return `<div class="good">
        <span>${g.icon} ${g.name} <b>${have}</b></span>
        <span class="g-btns">
          <button data-buy="${k}">사기 ${g.buy}G</button>
          <button data-sell="${k}" ${have ? '' : 'disabled'}>팔기 ${g.sell}G</button>
        </span></div>`;
    }).join('') : '';

    this.openSheet(`
      <div class="place-head">
        <div class="ph-bg" style="background-image:url('assets/${P.bg}.png?v=${ASSET_VER}')"></div>
        <div class="ph-txt"><p class="kicker">${P.name}</p><h2>${P.desc}</h2></div>
      </div>
      ${here.length ? `<div class="sect"><h3>이곳의 사람</h3><span>${here.length}</span></div><div class="pchars">${chars}</div>` : ''}
      <div class="sect"><h3>할 수 있는 일</h3><span>이번 ${PHASE_NAME[S().phase]} ${S().slots[S().phase] || 0}번</span></div>
      <div class="acts">${acts}</div>
      ${goods ? `<div class="sect"><h3>상회 — 사고팔기</h3><span>1회 = 행동 1</span></div><div class="goods">${goods}</div>` : ''}
    `);
    const sheet = $('#overlay .sheet');
    sheet.onclick = e => {
      const a = e.target.closest('[data-action]');
      if (a) { if (Game.doAction(key, a.dataset.action)) this.closeSheet(); return; }
      const b = e.target.closest('[data-buy]');
      if (b) { Game.buy(b.dataset.buy, 1); this.closeSheet(); return; }
      const sl = e.target.closest('[data-sell]');
      if (sl) { Game.sell(sl.dataset.sell, 1); this.closeSheet(); return; }
      const c = e.target.closest('[data-char]');
      if (c) { this.closeSheet(); this.openChar(c.dataset.char); }
    };
  },

  effText(eff) {
    if (!eff) return '';
    const p = [];
    for (const k of ['gold','morale','faith','food','order','hp']) {
      if (eff[k]) p.push(`${EFF_LABEL[k][0]} ${eff[k] > 0 ? '+' : ''}${eff[k]}`);
    }
    for (const k of Object.keys(GOODS)) if (eff[k]) p.push(`${GOODS[k].name} ${eff[k] > 0 ? '+' : ''}${eff[k]}`);
    if (eff.tag) p.push('소문');
    return p.join(' · ') || '—';
  },

  /* ══ 장면 플레이어 ═════════════════════════════════════ */
  openEventById(id) {
    const ev = ACT1_EVENTS.find(e => e.id === id);
    if (ev) this.openScene(ev);
  },

  openScene(ev) {
    if (!ev) return;
    const S0 = S();
    const lines = [];
    if (ev.bg) lines.push({ bg: ev.bg });
    (ev.scene || []).forEach(l => lines.push(l));
    const st = { ev, lines, i: 0, phase:'lines', bg: ev.bg || 'bg_castle', who: null, results: [], after: null, night: null };
    this.scene = st;
    this.renderScene();
  },

  renderScene() {
    const st = this.scene; if (!st) return;
    const l = st.lines[st.i] || {};
    if (l.bg) { st.bg = l.bg; st.i++; return this.renderScene(); }
    if (l.who) st.who = l.who;
    if (l.n) st.who = null;
    const c = st.who ? ROSTER[st.who] : null;
    const isLast = st.i >= st.lines.length - 1;
    const showChoices = st.phase === 'lines' && isLast;
    let choices = showChoices ? this.choicesFor(st) : '';
    if (showChoices && !choices && st.phase === 'lines' && !st.ev.dynamic) {
      choices = `<button class="btn primary" data-next>계속</button>`;
    }
    this.openOverlay(`
      <div class="scene" data-bg="${st.bg}">
        <div class="scene-bg" style="background-image:url('assets/${st.bg}.png?v=${ASSET_VER}')"></div>
        <div class="scene-veil"></div>
        <div class="scene-top">
          <span class="kicker">${esc(st.ev.kicker || '')}</span>
          ${st.phase === 'lines' && st.i < st.lines.length - 1 ? `<button class="icon-btn ghost" data-fast title="선택지까지">≫</button>` : ''}
        </div>
        ${c ? `<div class="scene-stage"><img class="scene-char" src="assets/${st.who}_portrait.png?v=${ASSET_VER}" alt=""></div>` : `<div class="scene-stage empty"></div>`}
        <div class="scene-box ${l.n ? 'narr' : ''}">
          ${c ? `<div class="scene-who">${c.name}<em>${c.role}</em></div>` : ''}
          <p class="scene-text">${esc(l.n || l.t || '')}</p>
          ${choices ? `<div class="choices">${choices}</div>` : (!showChoices ? `<span class="scene-next">▾</span>` : '')}
          ${st.phase === 'result' && isLast ? `<div class="choices"><button class="btn primary" data-next>계속</button></div>` : ''}
        </div>
      </div>`);
    const sc = $('.scene');
    sc.onclick = e => {
      if (e.target.closest('[data-fast]')) { st.i = st.lines.length - 1; return this.renderScene(); }
      if (e.target.closest('[data-next]')) return this.advanceResult();
      const ch = e.target.closest('[data-choice]');
      if (ch) return this.pickChoice(+ch.dataset.choice);
      const nl = e.target.closest('[data-night]');
      if (nl) return this.pickWinter(+nl.dataset.night);
      if (!e.target.closest('.choices')) {
        if (st.phase === 'lines') return this.advanceLine();
        if (st.phase === 'result') return this.advanceResult();
      }
    };
  },

  advanceLine() {
    const st = this.scene; if (!st) return;
    if (st.i < st.lines.length - 1) { st.i++; this.renderScene(); }
  },

  choicesFor(st) {
    const ev = st.ev;
    if (st.phase !== 'lines') return '';
    if (ev.dynamic === 'winter_night') {
      const ids = Game.winterCandidates();
      if (!ids.length) return `<button class="btn primary" data-night="-1">혼자 밤을 보낸다</button>`;
      return ids.map(id => `<button class="choice" data-night="${id}">
        <span class="tone-mark">${ROSTER[id].role}</span>
        <span class="choice-label">${ROSTER[id].name} 곁에 앉는다</span>
        <span class="choice-sub">신뢰 ${trustOf(id)}</span></button>`).join('');
    }
    const s = S();
    const list = (ev.choices || []).filter(c => !c.reqClue || c.reqClue.some(id => s.clues.includes(id)));
    return list.map((c, i) => {
      const pay = canPay(c.eff);
      return `<button class="choice tone-${c.tone || 'near'}" data-choice="${i}" ${pay ? '' : 'disabled'}>
      <span class="tone-mark">${c.tone === 'far' ? '거리두기' : c.tone === 'joke' ? '농담' : c.tone === 'bold' ? '결단' : c.tone === 'cold' ? '냉정' : '가까이'}</span>
      <span class="choice-label">${esc(c.label)}</span>
      ${c.sub ? `<span class="choice-sub">${esc(c.sub)}</span>` : ''}
      ${pay ? '' : '<span class="choice-sub need">자원이 모자란다</span>'}
    </button>`;
    }).join('');
  },

  pickChoice(i) {
    const st = this.scene; if (!st) return;
    const ev = st.ev, s = S();
    const list = (ev.choices || []).filter(c => !c.reqClue || c.reqClue.some(id => s.clues.includes(id)));
    const c = list[i]; if (!c) return;
    if (!canPay(c.eff)) return this.toast('⚠️', '자원이 모자란다.');
    const out = applyEff(c.eff);
    s.log.push({ d:s.day, k:'choice', ev:ev.id, i, label:c.label });
    State.save();
    st.results = (c.res || []).slice();
    st.effOut = out;
    st.phase = 'result';
    st.lines = st.results; st.i = 0; st.who = st.who;
    /* 결과 첫 줄이 지문이면 초상을 내린다 */
    this.renderScene();
    this.showEffToasts(out);
  },

  advanceResult() {
    const st = this.scene; if (!st) return;
    if (st.i < st.lines.length - 1) { st.i++; this.renderScene(); return; }
    if (st.after) { const f = st.after; this.closeOverlay(); this.scene = null; f(); return; }
    if (st.night) return this.finishNight();
    if (st.ev.finale) return this.playFinaleScenes();
    const after = st.ev.letterAfter;
    this.closeOverlay();
    this.scene = null;
    Game.finishEvent(st.ev);
    if (after) setTimeout(() => this.openLetter(after), 320);
  },

  playFinaleScenes() {
    const st = this.scene; if (!st) return;
    st.finaleQueue = st.finaleQueue || FINALE_SCENES.slice();
    const scn = st.finaleQueue.shift();
    if (!scn) {
      this.closeOverlay(); this.scene = null; Game.finishEvent(st.ev); return;
    }
    st.bg = scn.bg; st.lines = scn.lines; st.i = 0; st.phase = 'lines'; st.who = null;
    st.ev = Object.assign({}, st.ev, { kicker: '겨울 · 15일 · 밤' });
    this.renderScene();
  },

  /* ══ 밤 이벤트 ═════════════════════════════════════════ */
  openNight(who, fromAppt) {
    const N = NIGHTS[who]; if (!N) return;
    const ev = {
      id: 'N_' + who, kicker: (fromAppt ? '약속의 밤 · ' : '겨울의 밤 · ') + (ROSTER[who]?.name || ''),
      title: N.title, bg: N.bg, scene: N.scene, choices: N.choices,
    };
    this.openScene(ev);
    const st = this.scene;
    st.night = { who, fromAppt };
    if (fromAppt) S().appt = null;
  },

  finishNight() {
    const st = this.scene; if (!st) return;
    const s = S();
    const n = st.night || {};
    if (n.who) {
      s.nightSeen[n.who] = (s.nightSeen[n.who] || 0) + 1;
      s.flags['night_' + n.who] = 1;
    }
    if (st.winter) { s.seen['a1_night'] = 1; s.flags.winter_night_done = 1; }
    State.save();
    this.closeOverlay(); this.scene = null;
    Game.finishEvent({ id: st.ev.id === 'a1_night' ? 'a1_night' : 'N_' + n.who, finale:false });
  },

  pickWinter(id) {
    const st = this.scene; if (!st) return;
    if (id === '-1') {
      st.winter = false;
      this.closeOverlay(); this.scene = null; S().seen.a1_night = 1; State.save();
      Game.finishEvent({ id:'a1_night' }); return;
    }
    const who = id;
    const N = NIGHTS[who];
    const ev = { id:'N_' + who, kicker:'겨울 · 14일 · 밤 · ' + ROSTER[who].name, title:N.title, bg:N.bg, scene:N.scene, choices:N.choices };
    this.scene = { ev, lines: [{bg:N.bg}, ...N.scene], i:0, phase:'lines', bg:N.bg, who:null, winter:true, night:{who} };
    this.renderScene();
  },

  /* ══ 결과 · 시트 ═══════════════════════════════════════ */
  showResult(lines, effOut, done) {
    const st = { ev:{ kicker:'', title:'' }, lines: lines.slice(), i:0, phase:'result', bg: this.scene?.bg || 'bg_castle', who:null, after:done };
    this.scene = st;
    this.renderScene();
    this.showEffToasts(effOut);
  },

  showActionResult(A, out) {
    this.openSheet(`
      <div class="sheet-head"><h2>${A.icon} ${A.name}</h2><button class="x" data-close>✕</button></div>
      ${A.lines.map(t => `<p class="flavor">${t}</p>`).join('')}
      <div class="eff-row">${out.map(o => `<span class="eff ${o.cls}">${o.icon} ${o.text}</span>`).join('') || '<span class="eff">변화 없음</span>'}</div>
      <button class="btn primary" data-close>계속</button>`);
  },

  showErrandDone(E, out) {
    this.openSheet(`
      <div class="sheet-head"><h2>${E.icon} ${E.title}</h2><button class="x" data-close>✕</button></div>
      <p class="flavor">${E.done}</p>
      <div class="eff-row">${out.map(o => `<span class="eff ${o.cls}">${o.icon} ${o.text}</span>`).join('')}</div>
      <button class="btn primary" data-close>계속</button>`);
  },

  showEffToasts(out) {
    if (!out?.length) return;
    const line = out.map(o => `${o.icon} ${o.text}`).join('   ');
    this.toast('✦', line, 3200);
  },

  /* ══ 하루 결산 ═════════════════════════════════════════ */
  openReport(r) {
    const s = S();
    const Ls = (r.letters || []).map(id => LETTERS.find(l => l.id === id)).filter(Boolean);
    this.openSheet(`
      <div class="sheet-head"><h2>겨울 ${r.day}일의 끝</h2><button class="x" data-close>✕</button></div>
      <div class="report">
        <div><span>수입</span><b>🪙 +${r.income}</b></div>
        <div><span>식량 소모</span><b>🍞 −${r.eat}일</b></div>
        <div><span>남은 식량</span><b>${r.food}일</b></div>
        <div><span>민심</span><b>${r.morale}</b></div>
        <div><span>1막 목표</span><b>${r.goals} / 4</b></div>
      </div>
      ${r.warn ? `<p class="warn">${r.warn}</p>` : ''}
      ${Ls.length ? `<div class="sect"><h3>도착한 서신</h3></div>${Ls.map(L => `<p class="flavor">✉️ ${ROSTER[L.from].name} — ${L.title}</p>`).join('')}` : `<p class="hint">오늘은 편지가 오지 않았다.</p>`}
      <button class="btn primary" data-close>겨울 ${s.day}일을 시작한다</button>`);
  },

  /* ══ 완결 ══════════════════════════════════════════════ */
  openEnding() {
    const s = S();
    const top = Object.keys(s.trust).filter(id => s.met[id]).sort((a,b) => (s.trust[b]||0) - (s.trust[a]||0)).slice(0,3);
    const verbs = { burn:'태웠다', hide:'숨겼다', seal:'봉인해 두었다' };
    const doc = s.flags.final_burn ? verbs.burn : s.flags.final_hide ? verbs.hide : verbs.seal;
    const wall = s.bld.wall ? '서쪽 성벽이 다시 서 있다' : '서쪽 성벽은 아직 무너져 있다';
    this.openOverlay(`
      <div class="ending">
        <div class="e-bg"></div><div class="e-veil"></div>
        <div class="e-inner">
          <p class="kicker">제1막 · 빈 성의 겨울</p>
          <h1>눈 그친 밤</h1>
          <p class="e-sub">겨울 15일. 이름 없는 불빛 하나가 숲 쪽에 서 있다.</p>
          <div class="e-stats">
            <div><b>${s.day}</b><span>일</span></div>
            <div><b>${s.morale}</b><span>민심</span></div>
            <div><b>${s.clues.length}</b><span>단서</span></div>
            <div><b>${Object.keys(s.met).length}</b><span>만난 사람</span></div>
          </div>
          <div class="e-list">
            <p>· ${wall}. ${doc}.</p>
            <p>· 마지막 줄은 아직 비어 있다. ${s.flags.edict ? '사흘의 시한은 끝났다.' : ''}</p>
            <p>· 가장 가까운 사람 — ${top.map(id => ROSTER[id].name).join(', ') || '아무도 없다'}</p>
          </div>
          <p class="e-hook">"사람입니다. …사람이겠지요."</p>
          <p class="e-next">제2막 「검은숲과 비아 상단」 — 준비 중<br><span>문을 열면, 무엇이 들어오는가.</span></p>
          <div class="e-btns">
            <button class="btn primary" data-free>영지를 계속 둘러본다</button>
            <button class="btn ghost" data-export>기록 내보내기</button>
          </div>
          <p class="e-foot">이 파일럿은 여기서 매듭짓는다. 2막에서 이름을 얻을 사람들이 명부에 아직 ???로 남아 있다.</p>
        </div>
      </div>`);
    $('.ending').onclick = e => {
      if (e.target.closest('[data-free]')) { this.closeOverlay(); Game.enterFree(); }
      if (e.target.closest('[data-export]')) this.exportSave();
    };
  },

  /* ══ 메뉴 ══════════════════════════════════════════════ */
  openMenu() {
    const s = S();
    this.openSheet(`
      <div class="sheet-head"><h2>기록</h2><button class="x" data-close>✕</button></div>
      <div class="menu-list">
        <button data-menu="guide">플레이 안내</button>
        <button data-menu="export">기록 내보내기 (코드)</button>
        <button data-menu="home">타이틀로</button>
      </div>
      <p class="hint">이 겨울은 15일입니다. 세이브는 자동으로 저장됩니다. (${s.day}일 ${PHASE_NAME[s.phase]})</p>`);
    $('#overlay .sheet').addEventListener('click', e => {
      const b = e.target.closest('[data-menu]'); if (!b) return;
      if (b.dataset.menu === 'export') { this.closeSheet(); this.exportSave(); }
      if (b.dataset.menu === 'home') { this.closeOverlay(); this.renderTitle(); }
      if (b.dataset.menu === 'guide') { this.closeSheet(); this.openGuide(); }
    });
  },

  openGuide() {
    this.openSheet(`
      <div class="sheet-head"><h2>플레이 안내</h2><button class="x" data-close>✕</button></div>
      <div class="guide">
        <p><b>1. 하루는 세 시간</b> — 오전 2번, 오후 2번, 밤 1번의 행동. '다음 시간'으로 넘어간다.</p>
        <p><b>2. 오늘의 장면</b> — 시간이 바뀌면 이야기가 열린다. 선택지는 자원·신뢰·단서를 바꾼다.</p>
        <p><b>3. 편지</b> — 밤이 지나면 편지가 온다. 답장은 하루 두 통. '가까이'는 약속을 부른다.</p>
        <p><b>4. 약속</b> — 잡은 밤에 지키지 못하면 신뢰 −5. 밤은 한 사람의 것이다.</p>
        <p><b>5. 소문</b> — 장소의 행동이 소문 열기를 올린다. 4가 되면 태그가 열리고, 문 앞에 사람이 온다.</p>
        <p><b>6. 단서</b> — 수첩에서 두 단서를 이으면 추론이 된다. 추론은 3막의 질문을 연다.</p>
        <p><b>7. 목표</b> — 민심 45 · 성벽 Lv1 · 식량 10일 · 서류와 빈 줄. 15일 밤에 매듭지어진다.</p>
      </div>`);
  },

  /* ══ 오버레이 유틸 ═════════════════════════════════════ */
  openOverlay(html) {
    const o = $('#overlay');
    o.innerHTML = html;
    o.classList.add('on');
    document.body.classList.add('ovl');
  },

  closeOverlay() {
    const o = $('#overlay');
    o.classList.remove('on'); o.innerHTML = '';
    document.body.classList.remove('ovl');
  },

  openSheet(html) {
    this.openOverlay(`<div class="sheet-bg" data-close></div><div class="sheet"><div class="sheet-grab"></div>${html}</div>`);
    $('#overlay').onclick = e => {
      if (e.target.closest('[data-close]') || e.target.classList.contains('sheet-bg')) this.closeOverlay();
    };
  },

  closeSheet() { this.closeOverlay(); },

  toast(icon, text, ms) {
    const root = $('#toast');
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = `<span>${icon}</span>${esc(text)}`;
    root.appendChild(t);
    requestAnimationFrame(() => t.classList.add('on'));
    setTimeout(() => { t.classList.remove('on'); setTimeout(() => t.remove(), 350); }, ms || 2300);
  },

  openPrologue() {
    const ev = Game.scriptedEvent('p_open');
    const s = S();
    s.tut = s.tut || {};
    this.openScene(ev);
    /* 프롤로그가 끝나면 곧바로 1일차 오전 */
  },
};

/* 프롤로그 종료 훅 — p_open의 마지막 결과에서 */
const _origFinish = Game.finishEvent.bind(Game);
Game.finishEvent = function (ev) {
  if (ev && ev.id === 'p_open') {
    const s = S();
    s.day = 1; s.phase = 'am'; s.slots = { am:2, pm:2, night:1 };
    s.tut.seenIntro = true;
    State.save();
    UI.go('today');
    setTimeout(() => UI.maybeAutoEvent(), 450);
    return;
  }
  return _origFinish(ev);
};

document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (UI.scene) return;               /* 장면은 건너뛸 수 없다 */
  if ($('#overlay').classList.contains('on')) UI.closeOverlay();
});
