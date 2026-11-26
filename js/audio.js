/* ══════════════════════════════════════════════════════════════
   사운드 — Web Audio API 합성 효과음 + 음소거 토글
   ══════════════════════════════════════════════════════════════ */
const SFX = (() => {
  let ctx = null;
  let muted = localStorage.getItem('arden_muted') === '1';

  function ac() {
    if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function env(node, t0, a, d, peak = 1) {
    const g = node.context.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(peak * 0.5, t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
    node.connect(g);
    g.connect(node.context.destination);
    return g;
  }

  function tone(freq, dur, type = 'sine', when = 0, vol = 0.5, slide = 0) {
    const c = ac(); if (!c || muted) return;
    const t0 = c.currentTime + when;
    const o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
    env(o, t0, 0.008, dur, vol);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }

  function noise(dur, vol = 0.3, hp = 800, when = 0) {
    const c = ac(); if (!c || muted) return;
    const t0 = c.currentTime + when;
    const len = Math.max(1, Math.floor(c.sampleRate * dur));
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource(); src.buffer = buf;
    const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
    src.connect(f); env(f, t0, 0.005, dur, vol);
    src.start(t0);
  }

  const lib = {
    tap:      () => { tone(660, .06, 'triangle', 0, .35); },
    hover:    () => { tone(880, .04, 'sine', 0, .15); },
    coin:     () => { tone(1180, .07, 'square', 0, .18); tone(1560, .1, 'square', .06, .15); },
    craft:    () => { tone(520, .1, 'triangle', 0, .3); tone(780, .12, 'triangle', .09, .3); noise(.18, .18, 2000, .02); },
    sword:    () => { noise(.16, .3, 2400); tone(320, .12, 'sawtooth', 0, .25, -180); },
    hurt:     () => { tone(180, .18, 'sawtooth', 0, .3, -90); noise(.1, .2, 500); },
    heart:    () => { tone(620, .1, 'sine', 0, .35); tone(930, .12, 'sine', .09, .3); tone(1240, .16, 'sine', .19, .22); },
    day:      () => { tone(392, .16, 'sine', 0, .3); tone(523, .18, 'sine', .13, .3); tone(659, .26, 'sine', .27, .3); },
    open:     () => { tone(440, .07, 'sine', 0, .25); tone(554, .09, 'sine', .05, .25); },
    close:    () => { tone(554, .07, 'sine', 0, .2); tone(440, .09, 'sine', .05, .2); },
    bad:      () => { tone(300, .2, 'square', 0, .18, -120); },
    build:    () => { noise(.3, .25, 300); tone(220, .28, 'triangle', 0, .3); tone(330, .2, 'triangle', .2, .25); },
    level:    () => { [523, 659, 784, 1046].forEach((f, i) => tone(f, .16, 'triangle', i * .09, .28)); },
    bell:     () => { tone(880, .5, 'sine', 0, .22); tone(1320, .4, 'sine', .02, .1); },
  };

  function play(name) {
    if (muted) return;
    try { (lib[name] || lib.tap)(); } catch (e) { /* silent */ }
  }

  function toggle() {
    muted = !muted;
    localStorage.setItem('arden_muted', muted ? '1' : '0');
    return muted;
  }

  return { play, toggle, isMuted: () => muted, unlock: () => ac() };
})();
