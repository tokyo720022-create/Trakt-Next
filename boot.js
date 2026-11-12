/* boot.js: loads the screen files, then the script files in order, then the app starts. */
(function () {
  const REV = '0.5.0-r1'; // change this whenever files change, so a phone never mixes old and new files
  const VIEWS = [
    ['screens', 'views/shell/header.html'], ['screens', 'views/shell/tabs.html'],
    ['screens', 'views/screens/login.html'], ['screens', 'views/screens/home.html'], ['screens', 'views/screens/lists.html'],
    ['screens', 'views/screens/discover.html'], ['screens', 'views/screens/profile.html'],
    ['overlays', 'views/sheets/filter.html'], ['overlays', 'views/sheets/customise.html'], ['overlays', 'views/sheets/customlists.html'],
    ['overlays', 'views/sheets/streak.html'], ['overlays', 'views/sheets/history.html'], ['overlays', 'views/sheets/watching.html'], ['overlays', 'views/sheets/detail.html'],
    ['overlays', 'views/sheets/episode.html'], ['overlays', 'views/sheets/mark.html'],
  ];
  const SCRIPTS = [
    'js/core/core.js', 'js/core/auth.js', 'js/core/trakt.js', 'js/core/tabs.js',
    'js/features/cards.js', 'js/features/lists.js', 'js/features/list-options.js', 'js/features/customlists.js',
    'js/features/detail.js', 'js/features/detail-extras.js', 'js/features/episodes.js', 'js/features/episode-screen.js', 'js/features/mark-sheet.js', 'js/features/watching.js', 'js/features/history.js',
    'js/features/discover.js', 'js/features/streak.js', 'js/features/home.js',
    'js/features/profile.js', 'js/core/start.js',
  ];
  let done = 0;
  const total = VIEWS.length + SCRIPTS.length;
  const tick = () => { done++; const f = document.getElementById('bootFill'); if (f) f.style.width = Math.max(6, Math.round(done / total * 100)) + '%'; };
  const fail = (msg) => {
    document.body.innerHTML = '<div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:24px;text-align:center;background:#0A0714;color:#F2EEFF;font:16px sans-serif"><p style="margin:0">Couldn\'t load the app (' + msg + ').</p><button onclick="location.reload()" style="padding:12px 28px;border:0;border-radius:24px;background:#fff;color:#0A0714;font:600 16px sans-serif">Try again</button></div>';
  };
  Promise.all(VIEWS.map((v) => fetch(v[1] + '?v=' + REV, { cache: 'no-cache' })
    .then((r) => { if (!r.ok) throw new Error(v[1] + ' ' + r.status); return r.text(); })
    .then((t) => { tick(); return t; })))
    .then(async (texts) => {
      const html = { screens: '', overlays: '' };
      VIEWS.forEach((v, i) => { html[v[0]] += texts[i] + '\n'; });
      document.getElementById('screens').innerHTML = html.screens;
      document.getElementById('overlays').innerHTML = html.overlays;
      for (const f of SCRIPTS) {
        await new Promise((ok, bad) => {
          const s = document.createElement('script');
          s.src = f + '?v=' + REV;
          s.onload = () => { tick(); ok(); };
          s.onerror = () => bad(new Error('missing ' + f));
          document.body.append(s);
        });
      }
      new App().start();
      const splash = document.getElementById('boot');
      if (splash) { splash.classList.add('out'); setTimeout(() => splash.remove(), 380); }
    })
    .catch((e) => fail(e.message));
})();
