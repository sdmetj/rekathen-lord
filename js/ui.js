/* ══════════════════════════════════════════════════════════════
   렌더 · UI — 모바일 퍼스트 모던 인디 UI
   ══════════════════════════════════════════════════════════════ */

const $ = sel => document.querySelector(sel);
const viewEl = () => document.getElementById('view');
const hudEl = () => document.getElementById('hud');
const tabEl = () => document.getElementById('tabbar');

/* ── 초상화 캐시 · 캔버스 색조 변형 ─────────────────────────── */
const FaceCache = {};
function hslShift(r, g, b, dH, mS, dV) {
  const mx = Math.max(r, g, b) / 255, mn = Math.min(r, g, b) / 255;
  let h = 0, s = 0, l = (mx + mn) / 2;
  if (mx !== mn) {
    const d = mx - mn;
    s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn);
    if (mx === r) h = ((g - b) / d + (g < b ? 6 : 0));
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  h = (h + dH + 360) % 360;
  s = Math.min(1, Math.max(0, s * mS));
  l = Math.min(.97, Math.max(.03, l + dV));
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2;
  let rr = 0, gg = 0, bb = 0;
  if (h < 60) [rr, gg, bb] = [c, x, 0]; else if (h < 120) [rr, gg, bb] = [x, c, 0];
  else if (h < 180) [rr, gg, bb] = [0, c, x]; else if (h < 240) [rr, gg, bb] = [0, x, c];
  else if (h < 300) [rr, gg, bb] = [x, 0, c]; else [rr, gg, bb] = [c, 0, x];
  return [Math.round((rr + m) * 255), Math.round((gg + m) * 255), Math.round((bb + m) * 255)];
}

function tintImage(src, tint, w, h) {
  return new Promise(res => {
    const img = new Image();
    img.onload = () => {
      const cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      const cx = cv.getContext('2d');
      cx.drawImage(img, 0, 0, w, h);
      const d = cx.getImageData(0, 0, w, h);
      const p = d.data;
      const [dH, mS, dV] = tint;
      for (let i = 0; i < p.length; i += 4) {
        if (p[i + 3] < 40) continue;
        const mx = Math.max(p[i], p[i + 1], p[i + 2]), mn = Math.min(p[i], p[i + 1], p[i + 2]);
        const sat = mx === 0 ? 0 : (mx - mn) / mx;
        if (sat > .22 && mx / 255 < .97) {
          const [r, g, b] = hslShift(p[i], p[i + 1], p[i + 2], dH, mS, dV);
          p[i] = r; p[i + 1] = g; p[i + 2] = b;
        }
      }
      cx.putImageData(d, 0, 0);
      res(cv.toDataURL('image/png'));
    };
    img.onerror = () => res(src);
    img.src = src;
  });
}

/* base는 핵심 인물의 도트 이름일 수도, 다른 변경 인물의 id일 수도 있다.
   체인 끝까지 따라가 실제 도트(sprite)를 가진 인물을 찾아낸다. */
function spriteBaseOf(c) {
  let cur = c, guard = 0;
  while (cur && !cur.sprite && cur.base && guard++ < 10) cur = CHARS[cur.base];
  return (cur && cur.sprite) ? cur.sprite : null;
}
const IMG_FALLBACK = "onerror=\"this.onerror=null;this.src='assets/lord.png'\"";
function faceSrc(id) {
  const c = CHARS[id];
  if (!c) return 'assets/lord.png';
  if (c.core) return `assets/${c.sprite}_portrait.png`;
  if (FaceCache[id]) return FaceCache[id];
  const sb = spriteBaseOf(c);
  const load = sb ? `assets/${sb}_portrait.png` : 'assets/lord.png';
  FaceCache[id] = load;
  tintImage(load, c.tint || [0, 1, 0], 200, 200).then(url => { FaceCache[id] = url; });
  return load;
}
function spriteSrc(id) {
  const c = CHARS[id];
  if (!c) return 'assets/lord.png';
  if (c.core) return `assets/${c.sprite}.png`;
  const key = '_sp_' + id;
  if (FaceCache[key]) return FaceCache[key];
  const sb = spriteBaseOf(c);
  const load = sb ? `assets/${sb}.png` : 'assets/lord.png';
  FaceCache[key] = load;
  tintImage(load, c.tint || [0, 1, 0], 176, 240).then(url => { FaceCache[key] = url; });
  return load;
}
function bodyArt(id) { return 'assets/wolf.png'; }

/* ── 공용 프래그먼트 ──────────────────────────────────────── */
function heartsHTML(aff) {
  const st = affStage(aff);
  let h = '';
  for (let i = 0; i < 10; i++) h += `<i class="${i < st ? 'on' : ''}">♥</i>`;
  return `<span class="hearts">${h}</span>`;
}

function hudHTML() {
  const s = G.state;
  const w = weather();
  const am = apMax();
  let pips = '';
  for (let i = 0; i < am; i++) pips += `<span class="ap-pip ${i < s.ap ? 'on' : 'used'}"></span>`;
  const tags = repTags(s).map(t => `<span class="tag">${t}</span>`).join('');
  return `
  <div class="hud-row hud-top">
    <div class="fief">
      <em>ARDEN MARCH</em>
      <b>${esc(s.name)}의 아르덴 <span style="color:var(--dim2);font-weight:500">· ${SEASON_ICON[s.season]} ${SEASONS[s.season]}</span></b>
    </div>
    <div class="hud-date">
      <div class="chip-date"><b>${s.year}년차 ${s.dayOfSeason}일</b><span>${w.icon} ${w.name}</span></div>
      <button class="chip-date" id="muteBtn" style="font-size:14px">${SFX.isMuted() ? '🔇' : '🔊'}</button>
    </div>
  </div>
  <div class="hud-row hud-mid">
    <div class="ap"><span class="ap-label">행동력</span>${pips}<span class="phase-pill">${PHASES[s.phase]}</span></div>
    <div style="display:flex;gap:5px;align-items:center">${tags}
      <button class="btn small ghost" id="sleepBtn" style="padding:5px 10px">🛏 하루 마감</button>
    </div>
  </div>
  <div class="res-row">
    <span class="res gold"><i>💰</i><b>${s.gold}</b></span>
    <span class="res morale"><i>😊</i><b>${s.morale}</b></span>
    <span class="res troops"><i>🛡</i><b>${s.troops}</b></span>
    <span class="res faith"><i>✝</i><b>${s.faith}</b></span>
    <span class="res"><i>❤️</i><b>${s.hp}</b></span>
  </div>`;
}

function esc(t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
/* josa는 game.js의 것을 쓴다 */

function showHUD(on) { hudEl().classList.toggle('is-hidden', !on); }
function showTabs(on) { tabEl().classList.toggle('is-hidden', !on); }

/* ── 영지 지도 SVG ─────────────────────────────────────────── */
function bldPos(id) {
  /* [x, baseline y] — 낮은 y가 멀리, 높은 y가 앞줄 */
  return {
    keep: [200, 128], wall: [200, 204], market: [92, 150], chapel: [318, 142],
    workshop: [330, 106], tavern: [80, 182], greenhouse: [84, 106], forge: [316, 180], manor: [200, 170],
  }[id];
}
function drawBld(id, lv, s) {
  const [x, y] = bldPos(id);
  const b = BUILDINGS.find(x2 => x2.id === id);
  const night = s.phase === 2;
  const lit = night ? '#ffd88a' : '#b7c3e8';
  let body = '';
  if (lv === 0) {
    body = `<g opacity=".85">
      <rect x="${x - 16}" y="${y - 14}" width="32" height="14" rx="2" fill="rgba(30,38,66,.55)" stroke="rgba(200,210,255,.4)" stroke-dasharray="3 3" stroke-width="1"/>
      <text x="${x}" y="${y + 6}" text-anchor="middle" font-size="7.5" fill="rgba(225,232,255,.75)" font-family="sans-serif">${b.icon} ${b.name}</text>
    </g>`;
  } else {
    const h = 13 + lv * 5, w2 = 24 + lv * 5;
    const wallC = ['#8a6a4a', '#8a6a4a', '#95a1cc', '#a9b5e4'][lv];
    const roofC = ['#5f4630', '#5f4630', '#59619c', '#675cc4'][lv];
    body = `<g>
      <ellipse cx="${x}" cy="${y}" rx="${w2 / 2 + 5}" ry="3" fill="rgba(10,12,24,.35)"/>
      <rect x="${x - w2 / 2}" y="${y - h}" width="${w2}" height="${h}" rx="2" fill="${wallC}"/>
      <polygon points="${x - w2 / 2 - 4},${y - h} ${x + w2 / 2 + 4},${y - h} ${x},${y - h - 10 - lv * 2}" fill="${roofC}"/>
      <rect x="${x - 3}" y="${y - h + 4}" width="6" height="6" rx="1" fill="${lit}" opacity="${night ? 1 : .8}"/>
      ${lv >= 2 ? `<rect x="${x - w2 / 2 + 3}" y="${y - 6}" width="4" height="6" rx="1" fill="${lit}" opacity=".7"/><rect x="${x + w2 / 2 - 7}" y="${y - 6}" width="4" height="6" rx="1" fill="${lit}" opacity=".7"/>` : ''}
      ${lv >= 3 ? `<line x1="${x}" y1="${y - h - 10 - lv * 2}" x2="${x}" y2="${y - h - 22}" stroke="#d9def7" stroke-width="1"/><polygon points="${x},${y - h - 22} ${x + 9},${y - h - 18.5} ${x},${y - h - 15}" fill="#ff8fa8"/>` : ''}
      <text x="${x}" y="${y + 9}" text-anchor="middle" font-size="7.5" fill="${night ? 'rgba(255,235,200,.8)' : 'rgba(25,30,55,.75)'}" font-family="sans-serif">${b.name} ${lv >= 2 ? 'Ⅲ' : lv === 2 ? 'Ⅱ' : ''}</text>
    </g>`;
  }
  return body;
}

function territorySVG() {
  const s = G.state;
  const w = weather();
  const night = s.phase === 2;
  const skies = {
    0: ['#1c2440', '#3a4a7a'], 1: ['#4a3a5e', '#8a5a7a'], 2: ['#0a0e1e', '#1c2440'],
    3: ['#232c4e', '#46568e'],
  };
  const [c1, c2] = night ? skies[2] : s.season === 3 ? skies[0] : s.season === 0 ? ['#3a4a7a', '#7a9ac9'] : s.season === 1 ? skies[1] : skies[3];
  const snow = s.season === 3;
  const ground = snow ? '#dfe8f6' : s.season === 0 ? '#7fae6c' : s.season === 1 ? '#6fa25e' : '#b99a5e';
  const ground2 = snow ? '#c6d5ee' : s.season === 0 ? '#6e9c5c' : s.season === 1 ? '#5f904f' : '#a5854c';
  const treeC = snow ? '#2c3a5e' : '#3f6a3c';
  const snowCap = snow ? '#e8eefb' : '';
  const villagerN = Math.max(0, Math.min(7, Math.round((s.morale + 100) / 40) + (s.bld.tavern ? 1 : 0)));
  let vill = '';
  for (let i = 0; i < villagerN; i++) {
    vill += `<circle cx="${30 + i * 50}" cy="${200 + (i % 2) * 5}" r="2.6" fill="${night ? '#ffd88a' : '#2c3560'}"><animate attributeName="opacity" values="1;.45;1" dur="${2 + i * .4}s" repeatCount="indefinite"/></circle>`;
  }
  let stars = '';
  if (night) for (let i = 0; i < 14; i++) stars += `<circle cx="${(i * 37) % 396}" cy="${(i * 23) % 70}" r="${i % 3 ? .8 : 1.3}" fill="#dfe6ff" opacity="${.5 + (i % 3) * .2}"><animate attributeName="opacity" values=".9;.3;.9" dur="${2 + i % 3}s" repeatCount="indefinite"/></circle>`;
  const tree = (x, y, sc) => `<g transform="translate(${x},${y}) scale(${sc})"><rect x="-1.5" y="0" width="3" height="6" fill="#3a2e22"/><polygon points="-8,0 8,0 0,-16" fill="${treeC}"/>${snowCap ? `<polygon points="-3.5,-10 3.5,-10 0,-16" fill="${snowCap}"/>` : ''}</g>`;
  return `<svg viewBox="0 0 400 225" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient>
      <linearGradient id="gnd" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${ground}"/><stop offset="1" stop-color="${ground2}"/></linearGradient>
    </defs>
    <rect width="400" height="120" fill="url(#sky)"/>
    ${night ? '<circle cx="330" cy="28" r="11" fill="#e8ecff" opacity=".92"/><circle cx="326" cy="25" r="11" fill="' + c1 + '" opacity=".55"/>' : s.season === 0 ? '<circle cx="70" cy="26" r="9" fill="#ffe9a8"/>' : ''}
    ${stars}
    <polygon points="0,120 70,66 140,108 230,58 320,104 400,72 400,120" fill="${snow ? '#57639e' : '#39466f'}" opacity=".9"/>
    <polygon points="0,120 110,86 220,116 320,88 400,112 400,124 0,124" fill="${ground2}" opacity=".55"/>
    <rect y="118" width="400" height="107" fill="url(#gnd)"/>
    <path d="M150,225 Q200,196 185,168 Q170,140 195,118 L215,118 Q195,142 210,168 Q226,196 260,225 Z" fill="${snow ? '#b9c9e6' : '#00000022'}" opacity="${snow ? .8 : .5}"/>
    ${tree(18, 168, 1.1)}${tree(48, 148, .8)}${tree(368, 158, 1)}${tree(352, 176, .75)}${tree(140, 132, .7)}${tree(262, 130, .7)}
    ${['greenhouse', 'workshop', 'keep', 'chapel', 'market', 'tavern', 'forge', 'manor', 'wall'].map(id => drawBld(id, s.bld[id], s)).join('')}
    ${vill}
  </svg>`;
}

/* ── 메인 맵 뷰 ────────────────────────────────────────────── */
function presentAt(placeId) {
  const s = G.state;
  return ALL_IDS.filter(id => {
    const c = CHARS[id];
    const home = c.place || c.home;
    if (id === 'ellen') return placeId === 'forest' && (s.day + 1) % 2 === 0;
    if (id === 'lana') return placeId === 'tavern' || (placeId === 'forest' && s.day % 3 === 0);
    if (s.rel[id] === 'wife' || s.rel[id] === 'concubine') return placeId === 'manor';
    if (id === 'sgarteron') return placeId === 'chapel' && s.faith > 25;
    if (id === 'beloa') return placeId === 'castle' && s.day % 7 === 0;
    if (id === 'mill' || id === 'rebe') return placeId === 'tavern' && (s.day + (id === 'mill' ? 1 : 2)) % 3 !== 0;
    if (c.core) return home === placeId && (s.day + id.length) % 4 !== 3;
    if (home !== placeId) return false;
    return ((s.day * 7 + id.length * 3 + s.phase) % 5) !== 0;
  });
}

function placeSubLabel(id) {
  const c = CHARS[id];
  const rel = G.state.rel[id];
  return c.role + (rel ? ` · ${REL_LABEL[rel] || rel}` : '');
}

function renderMap() {
  const s = G.state;
  const w = weather();
  const places = PLACES.filter(p => {
    if (p.id === 'manor' && s.bld.manor < 1) return false;
    if (p.id === 'tavern' && s.bld.tavern < 1) return false;
    return true;
  });
  viewEl().innerHTML = `
    <div class="map-card fade">
      <div class="map-topinfo">
        <span class="weather-pill">${w.icon} ${w.name}</span>
        ${s.pregnant ? '<span class="weather-pill">🌱 새 식구 ' + s.pregnant.days + '/20일</span>' : ''}
      </div>
      <div class="map-weather"><span class="weather-pill">${PHASES[s.phase]}</span></div>
      ${territorySVG()}
      <div class="map-caption">
        <div><b>${SEASON_ICON[s.season]} ${SEASONS[s.season]}, ${s.dayOfSeason}일째</b><span>${w.desc}</span></div>
        <span class="map-go">장소를 눌러 이동 →</span>
      </div>
    </div>
    <div class="sect"><h3>영지의 장소</h3><span>행동력 ${s.ap}/${apMax()}</span></div>
    <div class="place-grid">
      ${places.map(p => {
        const ppl = presentAt(p.id);
        return `<button class="place-btn" data-place="${p.id}">
          <i class="pi">${p.icon}</i>
          <span class="pt"><b>${p.name}</b><span>${ppl.length ? ppl.slice(0, 2).map(id => CHARS[id].name).join(', ') + (ppl.length > 2 ? ` 외 ${ppl.length - 2}명` : '') : p.sub}</span>
          ${ppl.length ? `<span class="faces">${ppl.slice(0, 3).map(id => `<img class="px" src="${faceSrc(id)}" ${IMG_FALLBACK}>`).join('')}</span>` : ''}
          </span>
          ${ppl.length ? `<span class="crowd">${ppl.length}</span>` : ''}
        </button>`;
      }).join('')}
    </div>
    <div class="sect"><h3>알림</h3></div>
    <div class="card" style="padding:12px 14px">
      ${s.quests.length ? s.quests.map(q => `<div class="kv"><span>${q.icon} ${q.from} · ${q.label} (D+${q.due - s.day})</span><b>${q.reward}금</b></div>`).join('') : '<div class="hint">온 의뢰는 없다. 상회에서 확인하자.</div>'}
      ${residents().length ? `<div class="divider"></div><div class="hint">🕯 저택 상주: ${residents().map(id => CHARS[id].name).join(', ')} — 언제나 만날 수 있다.</div>` : ''}
    </div>`;
  viewEl().querySelectorAll('[data-place]').forEach(b =>
    b.addEventListener('click', () => { SFX.play('open'); G.screen = { view: 'place', place: b.dataset.place }; render(); }));
  bindCommon();
}

/* ── 장소 뷰 ──────────────────────────────────────────────── */
function placeActions(placeId) {
  const s = G.state;
  const A = [];
  if (placeId === 'castle') {
    A.push({ id: 'tax', icon: '📜', name: '징세', desc: '세금을 걷는다. 민심이 내려간다.', cost: 'AP 1', ap: 1,
      run: () => { const amt = 14 + s.bld.keep * 4 + Math.round(s.morale / 25); s.gold += amt; s.morale = clamp(s.morale - 5, -100, 100); addLog('징세로 금화 ' + amt + '닢을 걷었다.'); return `금화 ${amt}닢을 걷었다. 마을은 조용했다.`; } });
    A.push({ id: 'build', icon: '🏗', name: '시설 관리', desc: '건설 · 업그레이드로 영지를 키운다.', cost: '', sheet: 'build' });
    A.push({ id: 'petition', icon: '📃', name: '청원 처리', desc: '사람들의 청원을 들어준다.', cost: 'AP 1', ap: 1,
      run: () => { const c = 8 + ri(0, 12); if (s.gold < c) return '곳간이 얇아 청원을 받아줄 수 없었다.'; s.gold -= c; s.morale = clamp(s.morale + 8, -100, 100); s.rep.warm++; return `청원에 금화 ${c}닢을 썼다. 사람들이 고개를 끄덕였다.`; } });
    A.push({ id: 'decree', icon: '⚖️', name: '법령 반포', desc: '영주의 뜻을 새긴다. 방향은 자유다.', cost: 'AP 1', ap: 1,
      run: () => {
        const r = ri(0, 2);
        if (r === 0) { s.gold += 10; s.rep.cunning++; return '통행세를 올렸다. 금화가, 원망이 남았다.'; }
        if (r === 1) { s.morale = clamp(s.morale + 9, -100, 100); s.rep.warm++; return '장사 길을 열었다. 좌판이 늘었다.'; }
        s.faith = clamp(s.faith + 6, 0, 100); s.rep.loyal++; return '기도를 의무화했다. 교단이 기뻐했다.';
      } });
  }
  if (placeId === 'shop') {
    A.push({ id: 'trade', icon: '💱', name: '물건 사고팔기', desc: '오늘의 시세를 보고 거래한다.', cost: '', sheet: 'trade' });
    A.push({ id: 'quests', icon: '📋', name: '납품 의뢰', desc: '기한부 의뢰을 확인하고 납품한다.', cost: '', sheet: 'quests' });
    if (s.bld.market >= 2) A.push({ id: 'ad', icon: '📣', name: '상회 널리기', desc: '손님을 끌어온다. 수입이 늘어난다.', cost: 'AP 1', ap: 1,
      run: () => { const g = 10 + s.bld.market * 6; s.gold += g; s.morale = clamp(s.morale - 2, -100, 100); return `상회가 붐볐다. 수입 +${g}`; } });
  }
  if (placeId === 'chapel') {
    A.push({ id: 'pray', icon: '🙏', name: '기도', desc: '마음을 가다듬는다. 상처가 조금 아문다.', cost: 'AP 1', ap: 1,
      run: () => { s.faith = clamp(s.faith + 4, 0, 100); s.hp = clamp(s.hp + 10, 0, s.maxHp); s.rep.loyal++; return '기도가 끝났다. 마음이 가벼워졌다. 신앙 +4, HP +10'; } });
    A.push({ id: 'tithe', icon: '🕯', name: '십일조', desc: '곳간을 연다. 교단의 신뢰가 오른다.', cost: 'AP 1', ap: 1,
      run: () => { if (s.gold < 20) return '낼 만한 금화가 없다.'; s.gold -= 20; s.faith = clamp(s.faith + 9, 0, 100); s.rep.loyal += 2; return '십일조를 바쳤다. 교단의 인정을 받았다. 신앙 +9'; } });
    if (s.bld.chapel >= 3) A.push({ id: 'bless', icon: '✨', name: '성흔 의식', desc: '축복을 내린다. 민심이 크게 오른다.', cost: 'AP 1', ap: 1, req: () => s.faith >= 40,
      run: () => { if (s.faith < 40) return '신앙이 부족하다.'; s.faith -= 15; s.morale = clamp(s.morale + 14, -100, 100); return '성흔 의식이 거행됐다. 사람들이 눈물을 흘렸다. 민심 +14'; } });
  }
  if (placeId === 'workshop') {
    A.push({ id: 'craft', icon: '⚗️', name: '제작', desc: '물약 · 장비 · 선물을 만든다.', cost: '', sheet: 'craft' });
    A.push({ id: 'research', icon: '🔭', name: '연구', desc: '약초와 금화를 쏟아 공방을 발전시킨다.', cost: 'AP 1', ap: 1,
      run: () => { if (s.gold < 12) return '연구비가 모자라다.'; s.gold -= 12; s.items.mana = (s.items.mana || 0) + 1; return '연구의 결실로 마정석을 얻었다.'; } });
  }
  if (placeId === 'tavern') {
    A.push({ id: 'drink', icon: '🍺', name: '술자리', desc: '한잔 한다. 기분과 소문이 오간다.', cost: 'AP 1', ap: 1,
      run: () => { if (s.gold < 6) return '술값이 없다.'; s.gold -= 6; s.morale = clamp(s.morale + 5, -100, 100); s.rep.bold++; const r = pickRumor(); return r; } });
    A.push({ id: 'rumor', icon: '👂', name: '소문 듣기', desc: '주점의 귀는 빠르다.', cost: 'AP 1', ap: 1,
      run: () => { const r = pickRumor(); s.morale = clamp(s.morale + 1, -100, 100); return r; } });
    if (s.bld.tavern >= 3) A.push({ id: 'meeting', icon: '🤫', name: '비밀 회합', desc: '2층 방에서 뜻밖의 손님이 기다린다.', cost: 'AP 1', ap: 1,
      run: () => { if (s.gold < 20) return '회합에는 돈이 필요하다.'; s.gold += 26; s.rep.cunning += 3; s.faith = clamp(s.faith - 4, 0, 100); return '검은 마차의 거래가 이루어졌다. 수익 +26, 교단의 눈이 흐려졌다.'; } });
  }
  if (placeId === 'forest') {
    A.push({ id: 'gather', icon: '🌿', name: '채집', desc: '약초와 재료를 얻는다.', cost: 'AP 1', ap: 1,
      run: () => { const loot = gatherForest(); const parts = []; for (const k in loot) { s.items[k] = (s.items[k] || 0) + loot[k]; parts.push(`${ITEMS[k].name} +${loot[k]}`); } return '숲에서 돌아왔다. ' + parts.join(', '); } });
    A.push({ id: 'hunt', icon: '⚔️', name: '출진 · 토벌', desc: '검은숲의 위협을 없앤다. 위험하다.', cost: 'AP 1', ap: 1, risk: true,
      run: () => { G.battleCtx = { from: 'hunt' }; return null; } });
    A.push({ id: 'patrol', icon: '🛡', name: '순찰', desc: '병력과 경계를 다진다.', cost: 'AP 1', ap: 1,
      run: () => { s.troops += 1 + (s.bld.wall ? 1 : 0); s.rep.loyal++; return '순찰을 마쳤다. 병력이 정돈됐다.'; } });
  }
  if (placeId === 'manor') {
    A.push({ id: 'rest', icon: '🛏', name: '휴식', desc: '잠시 쉰다. 상처가 많이 아문다.', cost: 'AP 1', ap: 1,
      run: () => { s.hp = clamp(s.hp + 25, 0, s.maxHp); return '저택의 낮은 천장 아래서 잠깐 눈을 감았다. HP +25'; } });
    A.push({ id: 'family', icon: '🏠', name: '가족 시간', desc: '상주하는 사람들과 시간을 보낸다.', cost: 'AP 1', ap: 1,
      run: () => { const r = residents(); if (!r.length) return '상주하는 사람이 아직 없다.'; r.forEach(id => addAff(id, 12)); s.morale = clamp(s.morale + 4, -100, 100); return `${r.map(id => CHARS[id].name).join(', ')}와 저녁을 먹었다. 호감도가 깊어졌다.`; } });
    if (s.children.length) A.push({ id: 'kids', icon: '👶', name: '아이와 놀기', desc: '영주의 다음 세대.', cost: 'AP 1', ap: 1,
      run: () => { s.children.forEach(c => c.bond = (c.bond || 0) + 1); s.morale = clamp(s.morale + 5, -100, 100); return '아이들과 놀았다. 성의 복도에 웃음소리가 울렸다.'; } });
  }
  return A;
}

const RUMORS = [
  '검은숲 깊은 곳에서 빛이 났다는 사냥꾼의 이야기. 마정석이 그립다.',
  '아르카디아 쪽에서 마정석 값이 뛰고 있다. 등불을 쥐고 있으면 한다.',
  '교단이 변경의 이단을 살피고 있다. 서신이 오갔다.',
  '비아 상단이 물약을 대량으로 원한다. 의뢰가 곧 온다.',
  '올겨울은 길다고 한다. 방한 망토를 쟁여라.',
  '외뿔의 용병단이 북쪽 길에 있다. 붉은 깃발이 눈에 띈다.',
  '주점 2층에서 밤에 사람들이 모인다. 등불을 끄고.',
  '대장간이 철광을 찾는다. 검 한 자루 값이 올랐다.',
  '왕도에서 온 사절이 성채를 두리번거렸다. 좋은 소문만은 아니다.',
  '어느 사냥꾼이 늑대 가죽을 값싸게 낼 만하다 한다.',
];
function pickRumor() {
  const r = RUMORS[(G.state.day + G.state.rumors++) % RUMORS.length];
  return '소문: ' + r;
}

function renderPlace() {
  const s = G.state;
  const p = PLACES.find(x => x.id === G.screen.place);
  const acts = placeActions(p.id);
  const ppl = presentAt(p.id);
  viewEl().innerHTML = `
    <div class="place-hero">
      <img src="assets/${p.bg}.png" alt="">
      <button class="back-fab" id="backBtn">←</button>
      <div class="place-head">
        <div><h2>${p.icon} ${p.name}</h2><p>${p.desc}</p></div>
        <span class="phase-pill">${PHASES[s.phase]}</span>
      </div>
    </div>
    <div class="sect"><h3>할 수 있는 일</h3><span>행동력 ${s.ap}/${apMax()}</span></div>
    <div class="action-list">
      ${acts.map((a, i) => {
        const locked = a.req && !a.req();
        return `<button class="action ${locked ? 'locked' : ''} ${a.risk ? 'risk' : ''}" data-act="${i}">
          <i class="ai">${a.icon}</i>
          <span class="ab"><b>${a.name}</b><span>${a.desc}</span></span>
          <span class="ac">${locked ? '조건 미달' : a.cost || '메뉴'}</span>
        </button>`;
      }).join('')}
    </div>
    <div class="sect"><h3>이곳의 사람들</h3><span>${ppl.length}명</span></div>
    ${ppl.length ? `<div class="people">${ppl.map(id => {
      const c = CHARS[id];
      return `<button class="person" data-person="${id}">
        <img class="px" src="${faceSrc(id)}" ${IMG_FALLBACK} alt="">
        <span class="pb"><b>${c.name}</b><span>${placeSubLabel(id)}</span></span>
        <span class="ps">${c.romance || s.rel[id] ? heartsHTML(s.aff[id] || 0) : `<span class="tag">${TRAITS[c.trait] ? TRAITS[c.trait].name : ''}</span>`}</span>
      </button>`;
    }).join('')}</div>` : '<div class="empty">아무도 없다. 조용한 곳이다.</div>'}
    <div style="height:10px"></div>`;
  $('#backBtn').addEventListener('click', () => { G.screen = { view: 'map' }; render(); });
  viewEl().querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', () => {
    const a = acts[+b.dataset.act];
    if (a.sheet) { openSheet(a.sheet); return; }
    if (s.ap <= 0) { toast('행동력이 없다. 하루를 마감하자.', 'bad'); return; }
    if (a.req && !a.req()) { toast('조건이 부족하다.', 'bad'); return; }
    const r = a.run();
    if (r === null && G.battleCtx) { openBattle({ name: pick(['원뿔늑대', '도적단', '유적 수호자']), hp: 26 + Math.floor(s.day * 1.2), atk: 7 + Math.floor(s.day / 3), art: 'wolf', loot: { gold: 10 + ri(0, 20), pelt: 1 } }); G.battleCtx = null; spendAP(a.ap); render(); return; }
    spendAP(a.ap);
    SFX.play('coin');
    toast(r, r && (r.includes('+') ? 'good' : ''));
    if (a.id === 'family' && Math.random() < 0.3) tryConceive();
    checkGameOver();
    render();
  }));
  viewEl().querySelectorAll('[data-person]').forEach(b => b.addEventListener('click', () => {
    SFX.play('tap');
    openChat(b.dataset.person);
  }));
  bindCommon();
}

/* ── 채팅 (바베챗 스타일) ──────────────────────────────────── */
let CHAT = null;
function openChat(id) {
  const s = G.state;
  const c = CHARS[id];
  CHAT = { id, log: [], busy: false };
  const el = document.createElement('div');
  el.className = 'chat';
  el.id = 'chatView';
  el.innerHTML = `
    <div class="chat-stage">
      <div class="bg" style="background-image:url('assets/${PLACES.find(p => p.id === (c.place || 'castle')).bg}.png')"></div>
      <img id="chatSprite" class="chat-sprite px" src="${spriteSrc(id)}" ${IMG_FALLBACK} alt="">
      <div class="chat-top">
        <button class="chat-back" id="chatBack">←</button>
        <span class="phase-pill">${c.romance ? '로맨스 가능' : '교류'}</span>
      </div>
      <div class="chat-name">
        <div class="nm"><h2>${c.name}</h2><span class="role">${c.role}</span></div>
        <div class="meta">${heartsHTML(s.aff[id] || 0)}<span class="aff-box">호감 ${(s.aff[id] || 0)} · 신뢰 ${trustOf(id)}</span>${s.rel[id] ? `<span class="tag rose">${REL_LABEL[s.rel[id]] || s.rel[id]}</span>` : ''}</div>
      </div>
    </div>
    <div class="chat-body">
      <div class="log" id="chatLog"></div>
      <div class="chat-dock">
        <div class="chips" id="chatChips"></div>
        <div class="quick-gifts" id="giftRow"></div>
        <div class="input-row" style="margin-top:6px">
          <input id="chatInput" type="text" placeholder="${c.name}에게 직접 말 걸기…" maxlength="80">
          <button class="send" id="chatSend">↑</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(el);
  const log = el.querySelector('#chatLog');
  pushMsg('narr', `${josa(c.name, '과', '와')}의 대화. 처음 듣는 말투, 처음 보는 눈빛.`);
  pushMsg('them', TRAITS[c.trait].talk.neutral[0]);
  renderChips();
  renderGifts();
  $('#chatBack').addEventListener('click', closeChat);
  $('#chatSend').addEventListener('click', sendFreeTalk);
  $('#chatInput').addEventListener('keydown', e => { if (e.key === 'Enter') sendFreeTalk(); });
}
function closeChat() {
  const el = $('#chatView');
  if (el) el.remove();
  CHAT = null;
  saveGame();
  render();
}
function pushMsg(kind, text, who) {
  const log = $('#chatLog');
  if (!log) return;
  const div = document.createElement('div');
  div.className = 'msg ' + kind;
  if (who) div.innerHTML = `<span class="who">${esc(who)}</span>`;
  div.appendChild(document.createTextNode(text));
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
}
function chatBusy(ms) {
  return new Promise(res => {
    const log = $('#chatLog');
    const t = document.createElement('div');
    t.className = 'typing';
    t.innerHTML = '<i></i><i></i><i></i>';
    log.appendChild(t); log.scrollTop = log.scrollHeight;
    setTimeout(() => { t.remove(); res(); }, ms || 600);
  });
}

const TONE_CHIPS = [
  { k: 'praise', label: '칭찬하기' }, { k: 'flirt', label: '다정하게', hot: true },
  { k: 'tease', label: '놀리기' }, { k: 'comfort', label: '위로하기' },
  { k: 'secret', label: '비밀 묻기' }, { k: 'work', label: '일 이야기' },
  { k: 'drink', label: '술자리' }, { k: 'battle', label: '전투 이야기' },
  { k: 'money', label: '돈 이야기' }, { k: 'faith', label: '신앙 이야기' },
];

function renderChips() {
  const s = G.state;
  const c = CHARS[CHAT.id];
  const box = $('#chatChips');
  if (!box) return;
  let html = TONE_CHIPS.map(t => `<button class="tchip ${t.hot ? 'hot' : ''}" data-tone="${t.k}">${t.label}</button>`).join('');
  if (s.mood[c.id] === 'sour') html = `<button class="tchip" data-tone="comfort">사과하기</button>` + html;
  const conf = canConfess(c.id);
  if (c.romance && !s.rel[c.id] && (s.aff[c.id] || 0) >= 600) {
    html += `<button class="tchip hot" data-tone="confess">♡ 고백${conf.ok ? '' : ` (${conf.why})`}</button>`;
  }
  if (s.rel[c.id] === 'lover' || s.rel[c.id] === 'concubine') {
    html += `<button class="tchip" data-tone="marry">💍 프로포즈</button>`;
  }
  if (!c.core) {
    html += `<button class="tchip" data-tone="recruit">🤝 가신으로</button>`;
  }
  if (s.rel[c.id] === 'wife' || s.rel[c.id] === 'concubine') {
    html += `<button class="tchip" data-tone="home">🏠 같이 있기</button>`;
  }
  box.innerHTML = html;
  box.querySelectorAll('[data-tone]').forEach(b => b.addEventListener('click', () => handleTone(b.dataset.tone)));
}

function renderGifts() {
  const s = G.state;
  const row = $('#giftRow');
  if (!row) return;
  const gifts = Object.keys(s.items).filter(k => s.items[k] > 0 && ITEMS[k] && ITEMS[k].base <= 100);
  row.innerHTML = gifts.map(k => `<button class="tchip" data-gift="${k}">${ITEMS[k].icon} ${ITEMS[k].name} ×${s.items[k]}</button>`).join('') || '<span class="mini">줄 만한 물건이 없다.</span>';
  row.querySelectorAll('[data-gift]').forEach(b => b.addEventListener('click', () => giveGift(b.dataset.gift)));
}

function handleTone(tone) {
  if (CHAT.busy) return;
  const s = G.state;
  const c = CHARS[CHAT.id];
  if (tone === 'confess') { openConfessSheet(c.id); return; }
  if (tone === 'marry') { openMarrySheet(c.id); return; }
  if (tone === 'recruit') { recruitAlly(c.id); return; }
  if (tone === 'home') {
    pushMsg('narr', `${c.name}와 저택에서 소소한 시간을 보냈다.`);
    addAff(c.id, 15); s.morale = clamp(s.morale + 2, -100, 100);
    return;
  }
  const talk = { praise: '그렇게 잘했다고 칭찬한다.', flirt: '조금 다정하게 다가간다.', tease: '가볍게 놀린다.', comfort: '위로의 말을 건넨다.', secret: '숨겨둔 이야기를 캐묻는다.', work: '영지의 일을 이야기한다.', drink: '한잔 하자고 권한다.', battle: '검과 전투 이야기를 꺼낸다.', money: '돈 이야기를 꺼낸다.', faith: '신과 기도 이야기를 꺼낸다.', comfort2: '' };
  CHAT.busy = true;
  pushMsg('me', talk[tone] || '말을 건넨다.');
  chatBusy(650).then(() => {
    const lastKey = '_tone_' + tone;
    const bonus = s.flags[lastKey] === s.day ? 0.4 : 1;
    s.flags[lastKey] = s.day;
    const gain = Math.round(talkGain(c, tone, s) * bonus);
    const tg = Math.round(trustGain(c, tone, s) * bonus);
    addAff(c.id, gain); addTrust(c.id, tg);
    s.lastTalk[c.id] = s.day;
    const line = TRAITS[c.trait].talk[tone] ? pick(TRAITS[c.trait].talk[tone]) : TRAITS[c.trait].talk.neutral[0];
    pushMsg('them', line, c.name);
    if (gain >= 8) pushMsg('system', `♡ ${c.name}의 호감도가 크게 올랐다 (+${gain})`);
    else if (gain < 0) pushMsg('system', `${c.name}의 표정이 굳었다 (${gain})`);
    afterChatStep(c, tone);
  });
}

function sendFreeTalk() {
  if (CHAT.busy) return;
  const inp = $('#chatInput');
  const text = inp.value.trim();
  if (!text) return;
  inp.value = '';
  const s = G.state;
  const c = CHARS[CHAT.id];
  CHAT.busy = true;
  pushMsg('me', text);
  chatBusy(700).then(() => {
    const r = respondFreeTalk(c, text, s);
    addAff(c.id, r.dAff); addTrust(c.id, r.dTrust);
    s.lastTalk[c.id] = s.day;
    if (r.mood) s.mood[c.id] = r.mood;
    let line = r.line;
    if (r.mem && r.mem.includes('wife_call') && s.rel[c.id] === 'wife') line = '…아내라니, 그 호칭은 계속 쓰게 되겠지. 계속 해.';
    pushMsg('them', line, c.name);
    if (r.dAff >= 8) pushMsg('system', `♡ 호감도 +${r.dAff}${r.dTrust ? ` · 신뢰 +${r.dTrust}` : ''}`);
    else if (r.dTrust > 0) pushMsg('system', `신뢰 +${r.dTrust}`);
    if (r.mem && r.mem.length) s.memories[c.id] = (s.memories[c.id] || []).concat(r.mem).slice(-6);
    afterChatStep(c, r.intent);
  });
}

function giveGift(itemId) {
  const s = G.state;
  const c = CHARS[CHAT.id];
  if (!s.items[itemId]) return;
  if (s.lastGift[c.id] === s.day) { pushMsg('system', '오늘은 이미 선물했다. 하루에 한 번.'); return; }
  s.items[itemId]--;
  s.lastGift[c.id] = s.day;
  const loved = c.gift === itemId, hated = c.badGift === itemId;
  const gain = loved ? 45 : hated ? -25 : 12;
  addAff(c.id, gain);
  addTrust(c.id, loved ? 6 : 2);
  const t = TRAITS[c.trait];
  pushMsg('me', `${ITEMS[itemId].icon} ${ITEMS[itemId].name}을(를) 건넨다.`);
  chatBusy(600).then(() => {
    if (loved) { SFX.play('heart'); pushMsg('them', pick(t.talk.praise).replace('그', '이런 걸'), c.name); pushMsg('system', `♡♡ 마음에 든 모양이다. 호감도 +${gain}`); }
    else if (hated) { SFX.play('bad'); pushMsg('them', '…고맙다. 정말로.', c.name); pushMsg('system', `${c.name}은(는) 별로 좋아하지 않는다 (${gain})`); }
    else { pushMsg('them', '고맙다. 소중히 하지.', c.name); pushMsg('system', `호감도 +${gain}`); }
    renderChips(); renderGifts();
    const meta = $('.chat-name .meta');
    if (meta) meta.innerHTML = `${heartsHTML(s.aff[c.id] || 0)}<span class="aff-box">호감 ${s.aff[c.id] || 0} · 신뢰 ${trustOf(c.id)}</span>${s.rel[c.id] ? `<span class="tag rose">${REL_LABEL[s.rel[c.id]]}</span>` : ''}`;
    afterChatStep(c, 'gift');
    saveGame();
  });
}

function afterChatStep(c, intent) {
  CHAT.busy = false;
  const s = G.state;
  renderChips(); renderGifts();
  const meta = $('.chat-name .meta');
  if (meta) meta.innerHTML = `${heartsHTML(s.aff[c.id] || 0)}<span class="aff-box">호감 ${s.aff[c.id] || 0} · 신뢰 ${trustOf(c.id)}</span>${s.rel[c.id] ? `<span class="tag rose">${REL_LABEL[s.rel[c.id]]}</span>` : ''}`;
  /* 하트 이벤트 체크 */
  for (const stage of HEART_STAGES) {
    const key = `heart_${c.id}_${stage}`;
    if ((s.aff[c.id] || 0) >= stage * 100 && !s.flags[key]) {
      const ev = (HEART_EVENTS[c.id] || []).find(e => e.at === stage);
      if (ev) {
        s.flags[key] = true;
        setTimeout(() => openHeartEvent(c.id, ev), 500);
        return;
      }
    }
  }
  /* 질투 */
  if (intent === 'flirt' && Math.random() < 0.3) {
    const j = jealousyFor(s, c.id);
    if (j && s.rel[j.id] && (s.aff[j.id] || 0) > 500) {
      pushMsg('narr', `저택으로 돌아가니, ${CHARS[j.id].name}이(가) 기다리고 있었다…`);
      saveGame();
      return;
    }
  }
  saveGame();
}

/* ── 하트 이벤트 · 고백 · 혼인 ─────────────────────────────── */
function openHeartEvent(charId, ev) {
  const s = G.state;
  const c = CHARS[charId];
  openModal(`
    <div class="ev-kicker">♡ 하트 이벤트 · ${c.name}</div>
    <h2 class="ev-title">${ev.title}</h2>
    <p class="ev-text">${ev.text}</p>
    <div class="ev-choices">
      ${ev.choices.map((ch, i) => `<button class="ev-choice" data-i="${i}"><span class="em">${i === 0 ? '💗' : '🤍'}</span><span>${ch.t}</span></button>`).join('')}
    </div>`, () => {
    document.querySelectorAll('.ev-choice').forEach(b => b.addEventListener('click', () => {
      const ch = ev.choices[+b.dataset.i];
      applyDelta({ aff: { [charId]: ch.d.aff || 0 }, trust: ch.d.trust ? { [charId]: ch.d.trust } : null, faith: ch.d.faith, gold: ch.d.gold, troops: ch.d.troops });
      if (ch.d.unlock) s.flags[ch.d.unlock] = true;
      if (ch.battle) { closeModal(); addLog(`[하트 이벤트] ${ev.title} — 전투`); openBattle(ch.battle); return; }
      if (ch.d.love) s.flags['love_' + charId] = true;
      addLog(`[♡] ${c.name} — ${ev.title}: ${ch.t}`);
      SFX.play('heart');
      closeModal();
      toast(`♡ ${josa(c.name, '과', '와')}의 순간이 기록됐다`, 'good');
      saveGame();
      if (CHAT) { pushMsg('narr', `— ${ev.title} —`); pushMsg('narr', `당신의 선택: "${ch.t}"`); pushMsg('them', c.affinityLine || '…….', c.name); }
    }));
  });
}

function openConfessSheet(charId) {
  const s = G.state;
  const c = CHARS[charId];
  const conf = canConfess(charId);
  openModal(`
    <div class="ev-kicker">♡ 고백</div>
    <h2 class="ev-title">${c.name}에게 마음을 전한다</h2>
    <p class="ev-text">${conf.ok ? '두근거리는 순간이다. 어떤 관계를 원하는가?' : conf.why}</p>
    ${conf.ok ? `<div class="ev-choices">
      <button class="ev-choice" data-k="lover"><span class="em">💗</span><span>연인이 되고 싶다<small>서로 마음만 통하는 사이</small></span></button>
      ${s.bld.manor >= 1 ? `<button class="ev-choice" data-k="wife"><span class="em">💍</span><span>아내로 맞이한다<small>저택 내실에 상주 · 내조 버프</small></span></button>
      <button class="ev-choice" data-k="concubine"><span class="em">🏠</span><span>별채에 들인다<small>첩 · 저택 상주 · 기존 배우자의 질투</small></span></button>` : '<div class="hint mt8">저택 별채를 지으면 혼인 · 첩이 가능해진다.</div>'}
      <button class="ev-choice" data-k="cancel"><span class="em">🤍</span><span>아직은 아니다</span></button>
    </div>` : ''}`, () => {
    document.querySelectorAll('.ev-choice').forEach(b => b.addEventListener('click', () => {
      const k = b.dataset.k;
      closeModal();
      if (k === 'cancel' || !conf.ok) return;
      const accept = (s.aff[charId] || 0) >= 750;
      chatThen(c.name, accept ? null : '거절');
      if (!accept) return;
      doConfess(charId, k);
      if (k === 'wife' || k === 'concubine') {
        const others = Object.keys(s.rel).filter(id => id !== charId && ['wife', 'lover', 'concubine'].includes(s.rel[id]));
        if (others.length) setTimeout(() => {
          const o = others[0];
          const arr = JEALOUSY_LINES[o] || JEALOUSY_LINES[o.replace('2', '')] || ['…….'];
          toast(`${CHARS[o].name}: ${arr[0]}`, 'bad');
          s.aff[o] = Math.max(0, (s.aff[o] || 0) - 60);
          addLog(`${CHARS[o].name}의 질투 — 호감도가 내려갔다.`);
        }, 900);
      }
      toast(`♡ ${c.name}${k === 'wife' ? josa(c.name, '와', '와') + ' 혼인' : k === 'concubine' ? '를 별채에 들임' : josa(c.name, '과', '와') + ' 연인'}이 되었다`, 'gold');
      saveGame();
    }));
  });
}
function chatThen(name, mode) {
  if (!CHAT) return;
  if (mode === '거절') { pushMsg('them', '…지금은 아직, 대답할 수 없어.', name); return; }
  pushMsg('narr', `— 고백의 답 —`);
  pushMsg('them', '…그래. 나도, 너였다.', name);
}

function openMarrySheet(charId) {
  const s = G.state;
  const c = CHARS[charId];
  openModal(`
    <div class="ev-kicker">💍 프로포즈</div>
    <h2 class="ev-title">${c.name}에게 혼인을 청한다</h2>
    <p class="ev-text">${s.bld.manor >= 1 ? '저택의 내실에 방이 하나 있다.' : '저택 별채가 없어 맞이할 수 없다.'}</p>
    ${s.bld.manor >= 1 ? `<div class="ev-choices">
      <button class="ev-choice" data-k="wife"><span class="em">💍</span><span>정식 아내로 맞이한다<small>영주 저택 상주 · 내조 버프 · 자녀 가능</small></span></button>
      <button class="ev-choice" data-k="concubine"><span class="em">🏠</span><span>첩으로 별채에 들인다<small>기존 아내의 질투가 따른다</small></span></button>
    </div>` : ''}`, () => {
    document.querySelectorAll('.ev-choice').forEach(b => b.addEventListener('click', () => {
      closeModal();
      if (!b.dataset.k) return;
      doConfess(charId, b.dataset.k);
      toast(`💍 ${c.name}와의 새 관계가 시작됐다`, 'gold');
      saveGame();
    }));
  });
}

function recruitAlly(charId) {
  const s = G.state;
  const c = CHARS[charId];
  if (s.rel[charId]) { pushMsg('system', `${c.name}은(는) 이미 ${REL_LABEL[s.rel[charId]]}이다.`); return; }
  if ((s.aff[charId] || 0) < 350) { pushMsg('them', '…아직 어디 소속도 모르는 사람을 믿을 수는 없지.', c.name); pushMsg('system', '호감도 350 이상에서 가신 계약이 가능하다.'); return; }
  s.rel[charId] = 'ally';
  addAff(charId, 30);
  SFX.play('level');
  pushMsg('them', pick(TRAITS[c.trait].talk.work || TRAITS[c.trait].talk.neutral), c.name);
  pushMsg('system', `🤝 ${c.name}이(가) 아르덴의 가신이 되었다.`);
  addLog(`${c.name}을(를) 가신으로 들였다.`);
  milestone('🤝 가신 계약', `${c.name}이(가) 아르덴의 가신이 되었다.`);
  renderChips();
  saveGame();
}

/* ── 모달 / 시트 ──────────────────────────────────────────── */
function openModal(inner, after) {
  const root = document.getElementById('modal-root');
  root.className = 'modal-root';
  root.innerHTML = `<div class="scrim"></div><div class="sheet"><div class="sheet-grip"></div><div class="sheet-body">${inner}</div></div>`;
  requestAnimationFrame(() => root.classList.add('open'));
  root.querySelector('.scrim').addEventListener('click', closeModal);
  if (after) setTimeout(after, 60);
}
function closeModal() {
  const root = document.getElementById('modal-root');
  root.classList.remove('open');
  setTimeout(() => { root.innerHTML = ''; root.className = 'modal-root'; }, 260);
  setTimeout(() => { if (G.state && typeof nextMilestone === 'function') nextMilestone(); }, 320);
}

function openSheet(kind) { SFX.play('open'); SHEETS[kind](); }

const SHEETS = {
  build() {
    const s = G.state;
    openModal(`
      <div class="ev-kicker">🏗 영지 개발</div>
      <h2 class="ev-title">시설 건설 · 업그레이드</h2>
      <p class="hint mb6">지은 만큼 영지가 자라고, 매일 수확이 굴러들어온다.</p>
      ${BUILDINGS.map(b => {
        const lv = s.bld[b.id];
        const chk = canBuild(b.id);
        const cost = b.cost[Math.min(lv, b.max - 1)];
        return `<div class="bcard">
          <div class="bi">${b.icon}</div>
          <div class="bb">
            <b>${b.name}<span class="lv">${lv ? 'Lv' + lv : '미건설'}</span></b>
            <p>${b.desc}</p>
            <div class="cost">${lv < b.max ? `<span class="${s.gold >= (cost ? cost.gold : 0) ? '' : 'no'}">💰 ${cost ? cost.gold : '-'}</span>` + Object.keys(cost || {}).filter(k => k !== 'gold').map(k => `<span class="${itemCount(k) >= cost[k] ? '' : 'no'}">${ITEMS[k].icon} ${ITEMS[k].name} ×${cost[k]}</span>`).join('') : '<span>최고 단계</span>'}</div>
            <div class="mini mt8">효과: ${b.effect[Math.max(0, Math.min(lv, b.max) - (lv ? 0 : 0)) || 0]}</div>
          </div>
          ${lv < b.max ? `<button class="btn small ${chk.ok ? 'primary' : 'ghost'}" data-b="${b.id}">${lv ? '증축' : '건설'}</button>` : ''}
        </div>`;
      }).join('')}`, () => {
      document.querySelectorAll('[data-b]').forEach(btn => btn.addEventListener('click', () => {
        if (doBuild(btn.dataset.b)) { toast('🏗 영지가 자랐다!', 'gold'); SHEETS.build(); render(); }
        else toast('재료가 부족하다.', 'bad');
      }));
    });
  },
  trade() {
    const s = G.state;
    const stock = marketStock();
    openModal(`
      <div class="ev-kicker">💱 아르덴 상회</div>
      <h2 class="ev-title">오늘의 시세</h2>
      <p class="hint mb6">시세는 매일 바뀐다. 싸게 사서 비싸게 팔자.</p>
      ${Object.keys(ITEMS).map(id => {
        const it = ITEMS[id];
        const p = priceOf(id), sp = sellPrice(id), bp = buyPrice(id);
        const up = p > it.base;
        return `<div class="mrow">
          <div class="ic">${it.icon}</div>
          <div class="mb"><b>${it.name} <span class="stock">보유 ${s.items[id] || 0}</span></b><span>${it.desc}</span></div>
          <div class="mq">
            <button class="qbtn" data-sell="${id}">팔</button>
            <span class="val ${up ? 'price-up' : 'price-down'}">${sp}</span>
            <button class="qbtn" data-buy="${id}">삼</button>
            <span class="val" style="color:var(--dim)">${bp}</span>
          </div>
        </div>`;
      }).join('')}
      <div class="hint mt8">팔기: 흥정 창이 열린다 · 삼기: 즉시 구매 (상회 레벨 ${s.bld.market})</div>`, () => {
      document.querySelectorAll('[data-sell]').forEach(b => b.addEventListener('click', () => openHaggle(b.dataset.sell)));
      document.querySelectorAll('[data-buy]').forEach(b => b.addEventListener('click', () => {
        const id = b.dataset.buy;
        const bp = buyPrice(id);
        if (s.gold < bp) { toast('금화가 부족하다.', 'bad'); return; }
        s.gold -= bp; s.items[id] = (s.items[id] || 0) + 1;
        SFX.play('coin'); toast(`${ITEMS[id].name} 구매 -${bp}금`, 'gold');
        saveGame(); SHEETS.trade(); render();
      }));
    });
  },
  quests() {
    const s = G.state;
    openModal(`
      <div class="ev-kicker">📋 납품 의뢰</div>
      <h2 class="ev-title">기한부 의뢰</h2>
      ${s.quests.length ? s.quests.map((q, i) => {
        const have = itemCount(q.item) >= q.qty;
        return `<div class="mrow">
          <div class="ic">${q.icon}</div>
          <div class="mb"><b>${q.from} · ${q.label}</b><span>보상 ${q.reward}금 · D+${q.due - s.day}</span></div>
          <button class="btn small ${have ? 'primary' : 'ghost'}" data-q="${i}">${have ? '납품' : '재료 부족'}</button>
        </div>`;
      }).join('') : '<p class="hint">온 의뢰가 없다. 하루가 지나면 온다.</p>'}`, () => {
      document.querySelectorAll('[data-q]').forEach(b => b.addEventListener('click', () => {
        const q = s.quests[+b.dataset.q];
        if (itemCount(q.item) < q.qty) { toast('재료가 부족하다.', 'bad'); return; }
        s.items[q.item] -= q.qty;
        s.gold += q.reward;
        s.quests = s.quests.filter(x => x.id !== q.id);
        s.morale = clamp(s.morale + 3, -100, 100);
        SFX.play('level');
        toast(`📋 납품 완료 +${q.reward}금`, 'gold');
        addLog(`${q.from} 의뢰 납품 (${q.label}) +${q.reward}금`);
        saveGame(); SHEETS.quests(); render();
      }));
    });
  },
  craft() {
    const s = G.state;
    const lv = s.bld.workshop;
    openModal(`
      <div class="ev-kicker">⚗️ 연금 공방</div>
      <h2 class="ev-title">제작 (공방 Lv${lv})</h2>
      ${RECIPES.map((r, i) => {
        const locked = r.lv > lv || (r.forge && !s.bld.forge);
        const can = !locked && Object.keys(r.need).every(k => itemCount(k) >= r.need[k]) && s.gold >= r.fee;
        return `<div class="mrow">
          <div class="ic">${ITEMS[r.out].icon}</div>
          <div class="mb"><b>${r.name}</b><span>${r.desc}</span>
            <div class="cost mt8">${Object.keys(r.need).map(k => `<span class="${itemCount(k) >= r.need[k] ? '' : 'no'}">${ITEMS[k].icon}×${r.need[k]}</span>`).join('')}<span class="${s.gold >= r.fee ? '' : 'no'}">💰${r.fee}</span></div>
          </div>
          <button class="btn small ${can ? 'primary' : 'ghost'}" data-c="${i}" ${can ? '' : 'disabled'}>${locked ? '잠김' : '제작'}</button>
        </div>`;
      }).join('')}`, () => {
      document.querySelectorAll('[data-c]').forEach(b => b.addEventListener('click', () => {
        const r = RECIPES[+b.dataset.c];
        const res = craft(r, 1);
        if (!res) { toast('재료가 부족하다.', 'bad'); return; }
        toast(`${ITEMS[r.out].icon} ${ITEMS[r.out].name} 제작${res.crit ? ' — 대성공!' : ''}`, res.crit ? 'gold' : 'good');
        saveGame(); SHEETS.craft(); render();
      }));
    });
  },
};

function openHaggle(itemId) {
  const s = G.state;
  const base = sellPrice(itemId);
  const miraBoost = (s.aff.mira || 0) >= 300;
  openModal(`
    <div class="ev-kicker">💰 흥정</div>
    <h2 class="ev-title">${ITEMS[itemId].name} 팔기</h2>
    <p class="hint mb6">안전한 값을 받을지, 배보다 배꼽을 노릴지.</p>
    <div class="ev-choices">
      ${[['안전가', 1.0, 1], ['적정가', 1.15, 0.75], ['공격가', 1.35, 0.45], ['모험가', 1.6, 0.2]].map(([n, m, p], i) => `
        <button class="ev-choice" data-h="${i}"><span class="em">${['🪙', '⚖️', '🔥', '🎲'][i]}</span><span>${n} — ${Math.round(base * m)}금<small>성공 확률 ${Math.round(Math.min(0.98, p + (miraBoost ? 0.15 : 0)) * 100)}%</small></span></button>`).join('')}
    </div>`, () => {
    document.querySelectorAll('[data-h]').forEach(b => b.addEventListener('click', () => {
      const i = +b.dataset.h;
      const mult = [1, 1.15, 1.35, 1.6][i];
      let p = [1, 0.75, 0.45, 0.2][i] + (miraBoost ? 0.15 : 0);
      p = Math.min(0.98, p);
      if (!s.items[itemId]) { closeModal(); toast('물건이 없다.', 'bad'); return; }
      if (Math.random() < p) {
        const got = Math.round(base * mult);
        s.items[itemId]--;
        s.gold += got;
        SFX.play('coin');
        toast(`${ITEMS[itemId].name} 판매 +${got}금`, 'gold');
        addLog(`${ITEMS[itemId].name}${josa(ITEMS[itemId].name, '을', '를')} ${got}금에 팔았다.`);
      } else {
        SFX.play('bad');
        toast('손님이 혀를 찬 채 나갔다…', 'bad');
      }
      closeModal(); saveGame(); render();
    }));
  });
}

/* ── 전투 ─────────────────────────────────────────────────── */
let BAT = null;
function openBattle(enemy) {
  const s = G.state;
  BAT = { enemy: { ...enemy, maxHp: enemy.hp }, log: ['검을 뽑았다!'], over: false };
  const support = battleSupport();
  openModal(`
    <div class="ev-kicker">⚔️ 전투</div>
    <h2 class="ev-title">${enemy.name}</h2>
    <div class="battle-stage">
      <img class="px" src="assets/wolf.png" alt="">
      <div class="hpbar">
        <div class="nm"><span>${enemy.name}</span><span id="eHp">${enemy.hp}/${enemy.hp}</span></div>
        <div class="bar rose"><i id="eHpBar" style="width:100%"></i></div>
      </div>
    </div>
    <div class="hpbar" style="position:static;margin-top:10px">
      <div class="nm"><span>${esc(s.name)}</span><span id="pHp">${s.hp}/${s.maxHp}</span></div>
      <div class="bar"><i id="pHpBar" style="width:${s.hp / s.maxHp * 100}%"></i></div>
    </div>
    ${support ? `<div class="quote-box mt8">🤝 ${support.name}의 지원 스킬 대기 중 (호감도 연동)</div>` : ''}
    <div class="battle-log" id="batLog"></div>
    <div class="battle-acts" id="batActs">
      <button class="btn" data-a="slash">⚔️ 검격 (공격력 ${playerAtk()})</button>
      <button class="btn" data-a="heavy">💥 강하게 (50% · 대미지 ×2)</button>
      <button class="btn" data-a="potion">🧪 물약 (보유 ${itemCount('potion')})</button>
      <button class="btn ghost" data-a="flee">🏃 이탈</button>
    </div>`, () => {
    batLog(BAT.log[0]);
    document.querySelectorAll('#batActs [data-a]').forEach(b => b.addEventListener('click', () => batAct(b.dataset.a)));
  });
}
function batLog(t) {
  const el = $('#batLog');
  if (el) { el.innerHTML = esc(t); BAT.log = [t].concat(BAT.log).slice(0, 6); }
}
function batAct(a) {
  const s = G.state;
  if (!BAT || BAT.over) return;
  const e = BAT.enemy;
  if (a === 'slash' || a === 'heavy') {
    let dmg = playerAtk() + ri(0, 4);
    if (a === 'heavy') {
      if (Math.random() < 0.5) { dmg *= 2; }
      else { dmg = 0; batLog('헛방했다!'); enemyTurn(); return; }
    }
    const support = battleSupport();
    let supTxt = '';
    if (support && Math.random() < 0.35) { dmg += 6; supTxt = ` ${support.name}의 지원 일격이 더했다!`; }
    e.hp -= dmg;
    SFX.play('sword');
    batLog(`검이 스쳤다 — ${dmg} 대미지!${supTxt}`);
    updateBars();
    if (e.hp <= 0) return batEnd(true);
    enemyTurn();
  } else if (a === 'potion') {
    if (itemCount('potion') < 1) { batLog('물약이 없다!'); enemyTurn(); return; }
    s.items.potion--;
    s.hp = clamp(s.hp + 22, 0, s.maxHp);
    SFX.play('craft');
    batLog('물약을 마셨다. HP +22');
    updateBars();
    enemyTurn();
  } else if (a === 'flee') {
    if (Math.random() < 0.6) { closeModal(); BAT = null; toast('무사히 빠져나왔다.'); }
    else { batLog('빠져나가지 못했다!'); enemyTurn(); }
  }
}
function enemyTurn() {
  const s = G.state;
  const e = BAT.enemy;
  const dmg = Math.max(1, e.atk + ri(-2, 2) - playerDef());
  s.hp -= dmg;
  SFX.play('hurt');
  batLog(`${e.name}의 반격 — ${dmg} 대미지!`);
  updateBars();
  if (s.hp <= 0) batEnd(false);
}
function updateBars() {
  const s = G.state;
  const e = BAT.enemy;
  const eH = $('#eHp'), eB = $('#eHpBar'), pH = $('#pHp'), pB = $('#pHpBar');
  if (eH) eH.textContent = `${Math.max(0, e.hp)}/${e.maxHp}`;
  if (eB) eB.style.width = `${Math.max(0, e.hp / e.maxHp * 100)}%`;
  if (pH) pH.textContent = `${Math.max(0, s.hp)}/${s.maxHp}`;
  if (pB) pB.style.width = `${Math.max(0, s.hp / s.maxHp * 100)}%`;
}
function batEnd(win) {
  const s = G.state;
  BAT.over = true;
  const acts = $('#batActs');
  if (win) {
    SFX.play('level');
    const loot = BAT.enemy.loot || {};
    let msg = '승리! 전리품: ';
    if (loot.gold) { s.gold += loot.gold; msg += `금화 ${loot.gold} `; }
    if (loot.pelt) { s.items.pelt = (s.items.pelt || 0) + loot.pelt; msg += `늑대 가죽 ${loot.pelt} `; }
    if (loot.mana) { s.items.mana = (s.items.mana || 0) + loot.mana; msg += `마정석 ${loot.mana} `; }
    if (loot.crystal) { s.items.crystal = (s.items.crystal || 0) + loot.crystal; msg += `빛결정 ${loot.crystal}`; }
    s.rep.bold++;
    addLog(`토벌 승리 (${BAT.enemy.name}) — ${msg}`);
    batLog(msg);
    toast('⚔️ ' + msg, 'gold');
  } else {
    s.hp = 1;
    s.gold = Math.max(0, s.gold - 20);
    batLog('쓰러졌다… 누군가 끌고 갔다. 금화 일부를 잃었다.');
    toast('전투에서 쓰러졌다. 금화 -20', 'bad');
    addLog('전투 패배. 금화 일부를 잃었다.');
  }
  if (acts) acts.innerHTML = '<button class="btn primary wide" id="batDone">돌아가기</button>';
  const done = $('#batDone');
  if (done) done.addEventListener('click', () => { closeModal(); BAT = null; saveGame(); render(); });
}

/* ── 하루 마감 · 결산 ─────────────────────────────────────── */
function openSleep() {
  const s = G.state;
  const r = endDay(s.phase === 2);
  if (r.over === 'bankrupt') {
    openModal(`
      <div class="ev-kicker">게임 오버</div>
      <h2 class="ev-title">축출당한 영주</h2>
      <p class="ev-text">곳간이 텅 비고, 빚이 성벽보다 높아졌다. 사람들이 문 앞에 모였다.\n\n${s.day}일간의 아르덴 연대기는 여기서 끝났다.</p>
      <div class="ev-choices"><button class="ev-choice" id="restart"><span class="em">↺</span><span>새로 시작한다</span></button></div>`, () => {
      $('#restart').addEventListener('click', () => { clearSave(); closeModal(); showTitle(); });
    });
    return;
  }
  const w2 = weather();
  const ev = r.pendingEvent;
  openModal(`
    <div class="ev-kicker">🛏 ${s.day - 1}일차 결산</div>
    <h2 class="ev-title">하루가 저물었다</h2>
    <div class="card" style="padding:10px 12px;margin-bottom:10px">
      ${r.inc.lines.map(l => `<div class="kv"><span>${l.split(' ')[0]}</span><b>${l.split(' ').slice(1).join(' ')}</b></div>`).join('')}
      <div class="kv"><span>총 곳간</span><b style="color:${s.gold < 0 ? 'var(--red)' : 'var(--gold)'}">${s.gold} 금화</b></div>
    </div>
    <p class="hint">내일: ${w2.icon} ${w2.name} — ${w2.desc}</p>
    ${s.pregnant ? `<p class="hint mt8">🌱 ${CHARS[s.pregnant.mom].name}의 새 식구가 오기까지 ${20 - s.pregnant.days}일 남았다.</p>` : ''}
    <div class="ev-choices">
      ${ev ? `<button class="ev-choice" id="evGo"><span class="em">❗</span><span>${ev.title}<small>${ev.kicker} — 하루가 시작되기 전에 일이 터졌다</small></span></button>` : ''}
      <button class="ev-choice" id="sleepGo"><span class="em">🌅</span><span>아침을 맞는다</span></button>
    </div>`, () => {
    const go = () => { closeModal(); render(); };
    $('#sleepGo').addEventListener('click', () => { SFX.play('day'); go(); if (ev && ev.place === 'castle') setTimeout(() => openEventModal(ev), 400); });
    if (ev) $('#evGo').addEventListener('click', () => { closeModal(); render(); openEventModal(ev); });
  });
}

function openEventModal(ev) {
  const s = G.state;
  openModal(`
    <div class="ev-kicker">${ev.kicker}</div>
    <h2 class="ev-title">${ev.title}</h2>
    <p class="ev-text">${ev.text}</p>
    <div class="ev-choices">
      ${ev.choices.map((c, i) => {
        const cost = c.cost || {};
        const costTxt = Object.keys(cost).map(k => k === 'gold' ? `💰${cost[k]}` : k === 'troops' ? `🛡${cost[k]}` : `${ITEMS[k] ? ITEMS[k].icon : ''}${ITEMS[k] ? ITEMS[k].name : k}×${cost[k]}`).join(' ');
        const cant = Object.keys(cost).some(k => k === 'gold' ? s.gold < cost[k] : k === 'troops' ? s.troops < cost[k] : itemCount(k) < cost[k]);
        return `<button class="ev-choice" data-i="${i}" ${cant ? 'style="opacity:.5"' : ''}><span class="em">${cant ? '🔒' : '▸'}</span><span>${c.t}${costTxt ? `<small>${costTxt}</small>` : ''}</span></button>`;
      }).join('')}
    </div>`, () => {
    document.querySelectorAll('.ev-choice').forEach(b => b.addEventListener('click', () => {
      const choice = ev.choices[+b.dataset.i];
      const r = runEventChoice(ev, choice);
      if (!r) { toast('조건이 부족하다.', 'bad'); return; }
      closeModal();
      if (r.battle) { openBattle(r.battle); toast(choice.res); }
      else { SFX.play('coin'); toast(choice.res); }
      render();
    }));
  });
}

/* ── 마일스톤 · 축하 팝업 ─────────────────────────────────── */
const MS_QUEUE = [];
function milestone(title, text) {
  const s = G.state;
  if (s.milestones.includes(s.day + title)) return;
  s.milestones.push(s.day + title);
  MS_QUEUE.push({ title, text });
  if (document.getElementById('modal-root').classList.contains('open')) return;
  nextMilestone();
}
function nextMilestone() {
  const m = MS_QUEUE.shift();
  if (!m) return;
  openModal(`
    <div style="text-align:center;padding:14px 8px">
      <div style="font-size:34px">${esc(m.title.split(' ')[0])}</div>
      <h2 class="ev-title" style="margin-top:6px">${esc(m.title.replace(/^\S+\s/, ''))}</h2>
      <p class="ev-text">${esc(m.text)}</p>
      <div class="ev-choices"><button class="ev-choice" id="msOk"><span class="em">🎉</span><span>계속한다</span></button></div>
    </div>`, () => {
    SFX.play('level');
    $('#msOk').addEventListener('click', () => { closeModal(); setTimeout(nextMilestone, 300); });
  });
}

/* ── 인물 명부 · 기록 ─────────────────────────────────────── */
function renderRoster() {
  const s = G.state;
  const ids = ALL_IDS.slice().sort((a, b) => (s.aff[b] || 0) - (s.aff[a] || 0));
  viewEl().innerHTML = `
    <div class="sect"><h3>아르덴의 사람들</h3><span>${ids.length}명</span></div>
    <div class="hint mb6">총 ${ids.length}명이 아르덴을 오간다. 말을 걸고, 선물하고, 신뢰를 쌓자.</div>
    <div style="display:flex;flex-direction:column;gap:7px">
      ${ids.map(id => {
        const c = CHARS[id];
        const rel = s.rel[id];
        return `<button class="char-card" data-c="${id}">
          <img class="px" src="${faceSrc(id)}" ${IMG_FALLBACK} alt="">
          <div class="cb">
            <div class="cn"><b>${c.name}</b>${rel ? `<span class="rel ${rel}">${REL_LABEL[rel] || rel}</span>` : ''}${c.romance && !rel ? '<span class="rel">로맨스</span>' : ''}</div>
            <p>${c.role}</p>
            <p style="color:var(--dim2)">${TRAITS[c.trait] ? TRAITS[c.trait].name : ''} · 호감 ${s.aff[id] || 0}</p>
          </div>
          <div class="cs">${c.romance || rel ? heartsHTML(s.aff[id] || 0) : ''}</div>
        </button>`;
      }).join('')}
    </div>
    <div style="height:10px"></div>`;
  viewEl().querySelectorAll('[data-c]').forEach(b => b.addEventListener('click', () => openChat(b.dataset.c)));
  bindCommon();
}

function renderJournal() {
  const s = G.state;
  const kids = s.children.map(c => `<div class="kv"><span>${c.sex === '딸' ? '👧' : '👦'} ${c.name || '(이름 없음)'} · ${c.hair} · ${c.stage === 'infant' ? '영아' : '유년'} · ${s.day - c.born}일째</span><b>${CHARS[c.mom].name}의 아이</b></div>
      ${!c.name ? `<div class="row mt8"><input class="name-input" style="margin:0" placeholder="아이의 이름…" maxlength="8" id="childName_${c.id}"><button class="btn small primary" data-name="${c.id}">이름 지어주기</button></div>` : ''}`).join('');
  viewEl().innerHTML = `
    <div class="sect"><h3>영지 연대기</h3><span>${s.year}년차 · D+${s.day - s.startDay}</span></div>
    <div class="card" style="padding:12px 14px">
      <div class="kv"><span>영주</span><b>${esc(s.name)}</b></div>
      <div class="kv"><span>성향</span><b>${repTags(s).join(' · ') || '아직 모습이 없다'} (${repTone(s)})</b></div>
      <div class="kv"><span>가족</span><b>${residents().map(id => CHARS[id].name).join(', ') || '없다'}</b></div>
      ${kids ? `<div class="divider"></div>${kids}` : ''}
      <div class="kv"><span>누적 사건</span><b>${s.logs.length}</b></div>
    </div>
    <div class="sect"><h3>기록</h3></div>
    <div class="card" style="padding:6px 14px">
      ${s.logs.length ? s.logs.map(l => `<div class="log-item"><span class="ld">D+${l.d - s.startDay}</span><span class="lt">${esc(l.t)}</span></div>`).join('') : '<div class="empty">아직 기록이 없다.</div>'}
    </div>
    <div class="mt12"><button class="btn danger wide" id="resetBtn">↺ 처음부터 다시 (기록 삭제)</button></div>
    <div style="height:10px"></div>`;
  $('#resetBtn').addEventListener('click', () => {
    openModal(`<div class="ev-kicker">위험</div><h2 class="ev-title">모든 기록을 지운다</h2><p class="ev-text">영지의 연대기가 사라진다. 되돌릴 수 없다.</p><div class="ev-choices"><button class="ev-choice" id="yesReset"><span class="em">🗑</span><span>지운다</span></button><button class="ev-choice" id="noReset"><span class="em">🤍</span><span>그만둔다</span></button></div>`, () => {
      $('#yesReset').addEventListener('click', () => { clearSave(); closeModal(); showTitle(); });
      $('#noReset').addEventListener('click', closeModal);
    });
  });
  viewEl().querySelectorAll('[data-name]').forEach(b => b.addEventListener('click', () => {
    const c = s.children.find(x => x.id === b.dataset.name);
    const inp = document.getElementById('childName_' + c.id);
    const nm = inp && inp.value.trim();
    if (!nm) { toast('이름을 적어 주세요.', 'bad'); return; }
    c.name = nm;
    addLog(`아이의 이름을 ${nm}${josa(nm, '으', '')}로 지었다.`);
    toast(`👶 ${nm}(이)라고 지었다.`, 'gold');
    SFX.play('level');
    saveGame(); render();
  }));
  bindCommon();
}

/* ── 타이틀 ───────────────────────────────────────────────── */
function showTitle() {
  G.state = null;
  showHUD(false); showTabs(false);
  const saved = loadGame();
  viewEl().className = 'view center';
  viewEl().innerHTML = `
    <div class="title-wrap">
      <div class="title-bg" style="background-image:url('assets/bg_forest.png')"></div>
      <div class="title-veil"></div>
      <div class="title-inner">
        <div class="title-sprites">
          <img class="px" src="assets/lord.png" alt="">
          <img class="px" src="assets/serena.png" alt="">
          <img class="px" src="assets/mira.png" alt="">
        </div>
        <div class="title-crest">— 《외뿔의 악마》 외전 —</div>
        <h1 class="title-main">레카텐 변경 영주<br>아르덴의 봄</h1>
        <p class="title-sub">마왕 도래 이전, 신성 타이셀 왕국 북부.<br>영지를 다스리고, 사람을 만나고, 사랑하고, 가족을 이루는 샌드박스.</p>
        <div class="title-btns">
          ${saved ? '<button class="btn primary" id="contBtn">▶ 이어서 (${day}일차)</button>'.replace('${day}', saved.day) : ''}
          <div>
            <span class="newgame-label">영주의 이름</span>
            <input class="name-input" id="nameInput" placeholder="아르덴 영주" maxlength="12">
            <button class="btn ${saved ? 'ghost' : 'primary'} wide" id="startBtn">✦ 새로 시작한다</button>
          </div>
        </div>
        <div class="title-foot">54명의 인물 · 사계절 샌드박스 · 로맨스/결혼/자녀/가신 · 프리토크 대화</div>
      </div>
    </div>`;
  const start = () => {
    const nm = $('#nameInput').value.trim() || '아르덴 영주';
    if (saved) { /* keep save */ }
    G.state = defaultState(nm);
    refreshPrices();
    genQuests();
    saveGame();
    SFX.unlock();
    SFX.play('day');
    G.screen = { view: 'map' };
    render();
  };
  $('#startBtn').addEventListener('click', start);
  const cont = $('#contBtn');
  if (cont) cont.addEventListener('click', () => {
    G.state = loadGame();
    if (!G.state) { toast('저장을 읽을 수 없다.', 'bad'); return; }
    SFX.unlock();
    G.screen = { view: 'map' };
    render();
  });
}

/* ── 탭 · 공통 바인딩 ─────────────────────────────────────── */
function renderTabs() {
  tabEl().innerHTML = `
    <button class="tab ${G.screen.view === 'map' || G.screen.view === 'place' ? 'on' : ''}" data-tab="map"><i>🏰</i>영지</button>
    <button class="tab ${G.screen.view === 'roster' ? 'on' : ''}" data-tab="roster"><i>👤</i>인물</button>
    <button class="tab ${G.screen.view === 'journal' ? 'on' : ''}" data-tab="journal"><i>📖</i>기록</button>`;
  tabEl().querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => {
    SFX.play('tap');
    G.screen = { view: b.dataset.tab };
    render();
  }));
}

function bindCommon() {
  const m = $('#muteBtn');
  if (m) m.addEventListener('click', () => { const mu = SFX.toggle(); m.textContent = mu ? '🔇' : '🔊'; });
  const sl = $('#sleepBtn');
  if (sl) sl.addEventListener('click', () => openSleep());
}

/* ── 게임 오버 체크 ───────────────────────────────────────── */
function checkGameOver() {
  const s = G.state;
  if (s.morale <= -60 && !s.flags.revoltWarn) {
    s.flags.revoltWarn = true;
    toast('⚠️ 민심이 위험하다. 사람들의 눈빛이 달라졌다.', 'bad');
  }
}

/* ── 렌더 라우터 ──────────────────────────────────────────── */
function render() {
  if (!G.state) { showTitle(); return; }
  showHUD(true); showTabs(true);
  hudEl().innerHTML = hudHTML();
  renderTabs();
  bindCommon();
  const v = G.screen.view;
  viewEl().className = 'view' + (v === 'place' ? '' : '');
  if (v === 'map') renderMap();
  else if (v === 'place') renderPlace();
  else if (v === 'roster') renderRoster();
  else if (v === 'journal') renderJournal();
  else renderMap();
  saveGame();
}

/* ── 부팅 ─────────────────────────────────────────────────── */
function warmFaces() {
  let pending = 0, done = 0;
  ALL_IDS.forEach(id => {
    const c = CHARS[id];
    if (c.core) return;
    faceSrc(id);
    const sb = spriteBaseOf(c);
    const base = sb ? `assets/${sb}_portrait.png` : 'assets/lord.png';
    const im = new Image();
    pending++;
    const finish = () => tintImage(base, c.tint || [0, 1, 0], 200, 200).then(url => {
      FaceCache[id] = url;
      if (++done === pending && G.state) render();
    });
    im.onload = finish;
    im.onerror = finish;   /* 한 명 로드가 실패해도 나머지 렌더가 막히지 않게 */
    im.src = base;
  });
}
window.addEventListener('load', () => {
  document.getElementById('boot').classList.add('gone');
  showTitle();
  warmFaces();
});
window.addEventListener('visibilitychange', () => { if (!document.hidden) saveGame(); });
