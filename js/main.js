/* ── 부트 ─────────────────────────────────────────────── */
(function () {
  function start() {
    const saved = State.load();
    if (saved) State.init(saved);
    UI.boot();
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && S()) State.save();
    });
    window.addEventListener('pagehide', () => { if (S()) State.save(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
