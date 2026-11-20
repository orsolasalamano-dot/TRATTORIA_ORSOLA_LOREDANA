/* =====================================================================
   Orsola & Loredana's Digital Platforms Trattoria
   One script for the whole site:
     1. Helpers + saved progress (localStorage "odp-trattoria-v1")
     2. Level data (data/levels.json + data/<pasta>.json)
     3. Pasta drawings
     4. Win overlay (pasta confetti + chef's kiss)
     5. Views: Il Menù, Level (reusable template), La Mia Cucina, Prenota
     6. Game engines: order, timed-sort, match, quiz
     7. Router (#menu, #cucina, #prenota, #<pasta>)
   ===================================================================== */
(function () {
  'use strict';

  /* ================= 1. Helpers + saved progress ================= */
  var KEY = 'odp-trattoria-v1';
  var $ = function (id) { return document.getElementById(id); };

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  /* Escaped text with **bold** support, for recaps written in the JSON. */
  function rich(v) { return esc(v).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>'); }
  function fill(tpl, vars) { return String(tpl).replace(/\{(\w+)\}/g, function (m, k) { return k in vars ? vars[k] : m; }); }
  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  function load() {
    try {
      var raw = window.localStorage.getItem(KEY);
      var s = raw ? JSON.parse(raw) : null;
      if (!s || typeof s !== 'object' || Array.isArray(s)) s = {};
      if (!s.games || typeof s.games !== 'object') s.games = {};
      return s;
    } catch (e) { return { games: {} }; }
  }
  function save(s) { try { window.localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }
  /* Write {best, done, perfect} for a finished game. */
  function record(id, score, max, perfect) {
    var s = load();
    var g = s.games[id] || { best: 0, done: false, perfect: false };
    g.best = Math.max(g.best || 0, score);
    g.done = true;
    if (perfect === undefined ? score >= max : perfect) g.perfect = true;
    s.games[id] = g;
    save(s);
    return s;
  }
  function paintHeader(s) {
    s = s || load();
    var label = s.nick ? 'Tavolo di ' + s.nick : 'Prenota un Tavolo';
    document.querySelectorAll('[data-book]').forEach(function (a) { a.textContent = label; });
  }

  /* ================= 2. Level data ================= */
  var menuPromise = null;
  function getJSON(path) {
    return fetch(path, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error(path + ' answered ' + r.status);
      return r.json();
    });
  }
  /* levels.json plus the game file of every open level (attached as level.data). Loaded once. */
  function getMenu() {
    if (!menuPromise) {
      menuPromise = getJSON('data/levels.json').then(function (menu) {
        var open = menu.levels.filter(function (l) { return l.status === 'open' && l.file; });
        return Promise.all(open.map(function (l) {
          return getJSON('data/' + l.file).then(function (d) { l.data = d; });
        })).then(function () { return menu; });
      });
      menuPromise.catch(function () { menuPromise = null; });
    }
    return menuPromise;
  }
  function keyOf(level) { return level.file ? level.file.replace(/\.json$/, '') : level.pasta.toLowerCase(); }

  /* XP, hats, forks, dishes and rank, counted over the games of open levels. */
  function stats(menu, s) {
    var g = s.games || {}, games = [], xp = 0, hats = 0, forks = 0, dishes = 0;
    menu.levels.forEach(function (l) {
      l.progress = null;
      if (!l.data) return;
      var done = 0;
      l.data.games.forEach(function (x) {
        var rec = g[x.id];
        games.push({ game: x, level: l, rec: rec });
        if (rec) {
          xp += rec.best || 0;
          if (rec.done) { hats++; done++; }
          if (rec.perfect) forks++;
        }
      });
      l.progress = { done: done, total: l.data.games.length, finished: done === l.data.games.length };
      if (l.progress.finished) dishes++;
    });
    var ranks = menu.ranks, ri = 0;
    ranks.forEach(function (r, i) { if (xp >= r[0]) ri = i; });
    var next = ranks[ri + 1];
    return {
      games: games, xp: xp, hats: hats, forks: forks, dishes: dishes,
      totalGames: games.length, totalDishes: menu.levels.length,
      rank: ranks[ri][1],
      rankPct: next ? Math.round(((xp - ranks[ri][0]) / (next[0] - ranks[ri][0])) * 100) : 100,
      nextText: next ? (next[0] - xp) + ' XP to ' + next[1] : 'top of the kitchen!'
    };
  }

  function loadError(el, err) {
    el.innerHTML = '<div class="load-error" role="alert"><b>The kitchen could not load the menu.</b> ' +
      'Run the site on a local server (see README: <code>npx serve .</code>) instead of double-clicking index.html, then refresh. ' +
      '<span class="muted">(' + esc(err && err.message) + ')</span></div>';
  }

  /* ================= 3. Pasta drawings (viewBox 0 0 120 90) ================= */
  var ART = {
    Spaghetti: '<path d="M14 44h92c0 22-20 36-46 36S14 66 14 44z" fill="#C0392B"/><path d="M34 84h52" stroke="#8E2A1F" stroke-width="4" stroke-linecap="round"/><path d="M22 44c6-14 12 6 18-6s12 8 18-4 12 10 18-2 10 8 16 0" fill="none" stroke="#F2C14E" stroke-width="5" stroke-linecap="round"/><path d="M30 40c4-10 10 4 14-4s10 6 16-2 8 6 14-2" fill="none" stroke="#E0A82E" stroke-width="4" stroke-linecap="round"/><circle cx="48" cy="31" r="7" fill="#8E2A1F"/><circle cx="68" cy="29" r="6" fill="#8E2A1F"/><path d="M78 22c6-8 14-6 14-6s-2 10-12 10z" fill="#2E6B34"/>',
    Penne: '<path d="M26 66 L50 22 L64 22 L40 66Z" fill="#F2C14E" stroke="#D49A22" stroke-width="2.5" stroke-linejoin="round"/><path d="M50 72 L74 28 L88 28 L64 72Z" fill="#F2C14E" stroke="#D49A22" stroke-width="2.5" stroke-linejoin="round"/><path d="M44 30l6 4M38 42l6 4M68 36l6 4M62 48l6 4M56 60l6 4" stroke="#D49A22" stroke-width="2" stroke-linecap="round"/><circle cx="96" cy="64" r="5" fill="#C0392B"/><path d="M18 30c5-6 12-4 12-4s-2 8-10 8z" fill="#2E6B34"/>',
    /* Ready for when these levels open: */
    Fusilli: (function () {
      var r = '';
      for (var i = 0; i < 6; i++) r += '<rect x="' + (24 + i * 12) + '" y="32" width="15" height="28" rx="7.5" transform="rotate(22 ' + (31.5 + i * 12) + ' 46)" fill="#F2C14E" stroke="#D49A22" stroke-width="2"/>';
      return '<g transform="rotate(-24 60 46)">' + r + '</g><circle cx="98" cy="68" r="5" fill="#C0392B"/><path d="M16 26c5-6 12-4 12-4s-2 8-10 8z" fill="#2E6B34"/>';
    })(),
    Farfalle: '<path d="M60 45 L30 22 L26 30 L30 37 L26 45 L30 53 L26 60 L30 68 Z" fill="#F2C14E" stroke="#D49A22" stroke-width="2.5" stroke-linejoin="round"/><path d="M60 45 L90 22 L94 30 L90 37 L94 45 L90 53 L94 60 L90 68 Z" fill="#F2C14E" stroke="#D49A22" stroke-width="2.5" stroke-linejoin="round"/><path d="M38 33v24M46 37v16M82 33v24M74 37v16" stroke="#D49A22" stroke-width="2" stroke-linecap="round"/><rect x="53" y="36" width="14" height="18" rx="5" fill="#E0A82E" stroke="#D49A22" stroke-width="2"/><path d="M100 20c5-6 12-4 12-4s-2 8-10 8z" fill="#2E6B34"/>',
    Ravioli: '<g transform="rotate(-8 42 48)"><rect x="18" y="26" width="44" height="44" rx="5" fill="#F2C14E" stroke="#D49A22" stroke-width="2.5" stroke-dasharray="4 3"/><rect x="27" y="35" width="26" height="26" rx="11" fill="#F8D77E"/></g><g transform="rotate(10 82 44)"><rect x="60" y="22" width="44" height="44" rx="5" fill="#F2C14E" stroke="#D49A22" stroke-width="2.5" stroke-dasharray="4 3"/><rect x="69" y="31" width="26" height="26" rx="11" fill="#F8D77E"/></g><path d="M86 74c5-6 12-4 12-4s-2 8-10 8z" fill="#2E6B34"/><circle cx="14" cy="22" r="5" fill="#C0392B"/>',
    Lasagna: '<ellipse cx="60" cy="78" rx="46" ry="6" fill="#E3C9A0"/><path d="M22 30q6-6 12 0t12 0 12 0 12 0 12 0 12 0v8H22z" fill="#F2C14E"/><rect x="22" y="38" width="76" height="8" fill="#C0392B"/><rect x="22" y="46" width="76" height="5" fill="#FFF4D6"/><rect x="22" y="51" width="76" height="6" fill="#F2C14E"/><rect x="22" y="57" width="76" height="7" fill="#C0392B"/><rect x="22" y="64" width="76" height="9" rx="2" fill="#F2C14E"/><path d="M22 30v43h76V30" fill="none" stroke="#D49A22" stroke-width="2"/><path d="M54 24c5-7 13-5 13-5s-2 9-11 9z" fill="#2E6B34"/>'
  };
  var CLOCHE = '<ellipse cx="60" cy="74" rx="46" ry="7" fill="#E3C9A0"/><path d="M22 72a38 36 0 0 1 76 0z" fill="#DCD5CA" stroke="#B9B1A5" stroke-width="2"/><path d="M38 52c4-8 10-12 16-14" stroke="#fff" stroke-width="4" stroke-linecap="round" fill="none"/><circle cx="60" cy="33" r="5" fill="#B9B1A5"/>';
  var CROWN = '<path d="M44 20l4-8 6 6 6-8 6 8 6-6 4 8z" fill="#E0A82E"/>';
  /* Open dishes show their pasta; locked dishes stay under the closed cloche (boss gets a crown). */
  function art(level, w, h) {
    var open = level.status === 'open' && ART[level.pasta];
    return '<svg width="' + w + '" height="' + h + '" viewBox="0 0 120 90" aria-hidden="true">' +
      (open ? ART[level.pasta] : CLOCHE + (level.boss ? CROWN : '')) + '</svg>';
  }
  function lockIcon(color) {
    return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="' + color + '" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
  }

  /* ================= 4. Win overlay ================= */
  var winTimer = null;
  function showWin(title, sub) {
    clearTimeout(winTimer);
    var cols = ['#F2C14E', '#C0392B', '#2E6B34', '#E0A82E', '#7A8A2A'], bits = '';
    for (var i = 0; i < 34; i++) {
      var c = cols[i % cols.length], t = i % 3, svg;
      if (t === 0) svg = '<svg width="26" height="14" viewBox="0 0 26 14"><path d="M1 13L7 1h18l-6 12z" fill="#F2C14E" stroke="#D49A22" stroke-width="1.5"/></svg>';
      else if (t === 1) svg = '<svg width="26" height="18" viewBox="0 0 26 18"><path d="M1 1l12 8L1 17zM25 1L13 9l12 8z" fill="' + c + '"/><rect x="10" y="5" width="6" height="8" rx="2" fill="#D49A22"/></svg>';
      else svg = '<svg width="30" height="16" viewBox="0 0 30 16"><path d="M2 8c4-8 8 8 13 0s9 8 13 0" fill="none" stroke="' + c + '" stroke-width="3" stroke-linecap="round"/></svg>';
      bits += '<span class="cf" style="left:' + Math.round(Math.random() * 98) + '%;animation-delay:' + (Math.random() * 0.9).toFixed(2) + 's;animation-duration:' + (2.2 + Math.random() * 1.6).toFixed(2) + 's">' + svg + '</span>';
    }
    $('win').innerHTML = '<div class="cf-layer" aria-hidden="true">' + bits + '</div>' +
      '<div class="win" role="dialog" aria-modal="false" aria-label="' + esc(title) + '">' +
      '<div style="position:relative;display:inline-block"><span class="kiss"><svg width="96" height="64" viewBox="0 0 64 44" role="img" aria-label="Chef\'s kiss"><path d="M6 24c8-12 18-15 26-8 8-7 18-4 26 8-9 13-43 13-52 0z" fill="#C0392B"/><path d="M10 24c10 5 34 5 44 0" stroke="#8E2A1F" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg></span>' +
      '<svg class="heart" width="18" height="16" viewBox="0 0 18 16" aria-hidden="true"><path d="M9 15S1 10 1 5a4 4 0 0 1 8-1 4 4 0 0 1 8 1c0 5-8 10-8 10z" fill="#C0392B"/></svg></div>' +
      '<p class="hand win-title">' + esc(title) + '</p><p class="disp win-kiss">MWAH! CHEF\'S KISS</p>' +
      '<p class="win-sub">' + esc(sub) + '</p><button class="btn btn-red" data-close-win>Grazie, chef!</button></div>';
    winTimer = setTimeout(closeWin, 4200);
  }
  function closeWin() { clearTimeout(winTimer); $('win').innerHTML = ''; }
  function forkTail(perfect) { return perfect ? ' and a golden fork.' : '.'; }

  /* ================= 5. Views ================= */
  var TRATT = "Orsola & Loredana's Digital Platforms Trattoria · Fall 2026";
  var VIEWS = {};

  /* ---------- Il Menù ---------- */
  VIEWS.menu = function () {
    var menu = null;
    function dishCard(l) {
      var n = l.level;
      if (!l.data) {
        var col = l.boss ? '#A93226' : '#6B5A45';
        var label = 'Level ' + n + ', ' + l.pasta + (l.boss ? ' boss level' : '') + ', still in the kitchen';
        return '<article class="dish dish-shut' + (l.boss ? ' dish-boss' : '') + '" aria-label="' + esc(label) + '">' +
          '<div class="dish-top"><span class="lvl" style="color:' + col + '">Level ' + n + (l.boss ? ' · Boss' : '') + '</span>' + lockIcon(col) + '</div>' +
          '<div class="plate">' + art(l, 120, 90) + '</div>' +
          '<h3 class="disp">' + esc(l.pasta) + '</h3>' +
          '<p class="meta">Session ' + n + ' · ' + esc(l.session) + '</p>' +
          '<p class="hand soon">Still in the kitchen…</p>' +
          '<button class="btn btn-off" disabled>Coming soon</button></article>';
      }
      var p = l.progress, tag = p.finished ? 'Finito!' : (p.done > 0 ? 'In cottura' : 'Pronto!');
      return '<article class="dish dish-open' + (l.boss ? ' dish-boss' : '') + '">' +
        '<div class="dish-top"><span class="lvl" style="color:#C0392B">Level ' + n + (l.boss ? ' · Boss' : '') + '</span><span class="tag">' + tag + '</span></div>' +
        '<div class="plate">' + art(l, 120, 90) + '</div>' +
        '<h3 class="disp">' + esc(l.pasta) + '</h3>' +
        '<p class="meta">Session ' + n + ' · <b>' + esc(l.session) + '</b></p>' +
        '<ul class="games">' + l.data.games.map(function (g) { return '<li>' + esc(g.title) + '</li>'; }).join('') + '</ul>' +
        '<p class="meta" style="font-size:13px"><b>' + p.done + ' / ' + p.total + '</b> games cooked</p>' +
        '<a class="btn btn-red" href="#' + esc(keyOf(l)) + '" aria-label="Play ' + esc(l.pasta) + '">Mangia! Play</a></article>';
    }
    function render() {
      var s = load();
      paintHeader(s);
      $('greeting').textContent = s.nick ? 'Bentornati, ' + s.nick + '!' : 'Benvenuti, studenti!';
      if (!menu) return;
      var st = stats(menu, s);
      $('xp').textContent = st.xp;
      $('hats').textContent = st.hats + ' / ' + st.totalGames;
      $('forks').textContent = st.forks + ' / ' + st.totalGames;
      $('dishes').textContent = st.dishes + ' / ' + st.totalDishes;
      $('rack').style.width = Math.round((st.dishes / st.totalDishes) * 100) + '%';
      $('menu-note').textContent = st.totalDishes + ' courses · from simple to layered · new dishes unlock after each session';
      $('menu').innerHTML = menu.levels.map(dishCard).join('');
      var first = menu.levels.filter(function (l) { return l.data; })[0];
      if (first) $('start').href = '#' + keyOf(first);
    }
    render();
    getMenu().then(function (m) { menu = m; render(); }).catch(function (e) { loadError($('menu'), e); });
    return { title: 'Il Menù · Digital Platforms Trattoria', foot: TRATT, nav: 'menu', render: render };
  };

  /* ---------- La Mia Cucina ---------- */
  VIEWS.cucina = function () {
    var menu = null;
    var HAT = '<path d="M18 40c-7 0-12-5-12-11s6-11 12-10c2-7 8-11 14-11s12 4 14 11c6-1 12 4 12 10s-5 11-12 11z" fill="F" stroke="S" stroke-width="2.5"/><rect x="18" y="40" width="28" height="14" rx="3" fill="F" stroke="S" stroke-width="2.5"/>';
    var STRANDS = 'M14 2c-4 20 6 30 0 50s6 30 2 56M28 2c4 22-6 34 0 54s-4 28 0 50M42 2c-4 18 6 32 0 52s6 30 0 52M56 2c4 20-6 30 0 50s-4 32 0 56M70 2c-4 22 6 32 0 52s4 30 0 52';
    function peg(l, i) {
      var color = l.boss ? '#C0392B' : (i % 2 ? '#D49A22' : '#E0A82E');
      var p = l.progress, fin = p && p.finished;
      var status = !p ? 'Still in the kitchen' : (fin ? 'Drying! All games done' : p.done + ' / ' + p.total + ' games');
      var op = fin ? 1 : (p && p.done ? 0.6 : 0.35);
      return '<div class="peg">' +
        '<svg width="18" height="22" viewBox="0 0 18 22" aria-hidden="true"><rect x="6" y="0" width="6" height="16" rx="2" fill="#8A5A30"/><circle cx="9" cy="18" r="4" fill="#8A5A30"/></svg>' +
        '<svg width="90" height="110" viewBox="0 0 90 110" aria-hidden="true" style="opacity:' + op + '"><path d="' + STRANDS + '" fill="none" stroke="' + (fin ? color : '#B9B1A5') + '" stroke-width="4" stroke-linecap="round" stroke-dasharray="' + (fin ? '0' : '4 6') + '"/></svg>' +
        '<span class="disp" style="font-size:17px">' + esc(l.pasta) + '</span><span class="muted" style="font-size:13px">' + esc(status) + '</span></div>';
    }
    function badge(on, icon, name, sub) {
      return '<div class="badge ' + (on ? 'badge-on' : 'badge-off') + '">' + icon + '<span style="font-weight:700">' + esc(name) + '</span><span style="font-size:12px">' + esc(sub) + '</span></div>';
    }
    function hat(x) {
      var on = !!(x.rec && x.rec.done);
      var icon = '<svg width="40" height="40" viewBox="0 0 64 64" role="img" aria-label="' + (on ? 'Chef hat earned' : 'Chef hat not yet earned') + '">' +
        HAT.replace(/F/g, on ? '#FFFFFF' : '#F1E9DC').replace(/S/g, on ? '#C0392B' : '#B9B1A5') + '</svg>';
      return badge(on, icon, x.game.short || x.game.title, x.level.pasta);
    }
    function fork(x) {
      var on = !!(x.rec && x.rec.perfect), max = x.game.maxScore;
      var icon = '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="' + (on ? '#B7860B' : '#B9B1A5') + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="' + (on ? 'Golden fork earned' : 'Golden fork not yet earned') + '"><path d="M7 2v6a3 3 0 0 0 3 3v11"/><path d="M10 2v5M13 2v6a3 3 0 0 1-3 3"/><path d="M18 2c-2 1-3 4-3 7s1 4 3 4v9"/></svg>';
      return badge(on, icon, x.game.short || x.game.title, x.rec ? 'Best ' + x.rec.best + ' / ' + max : 'Perfect = ' + max);
    }
    function render() {
      var s = load();
      paintHeader(s);
      $('nick').textContent = s.nick || 'Ospite';
      $('guest-note').hidden = !!s.nick;
      if (!menu) return;
      var st = stats(menu, s);
      $('rank').textContent = st.rank;
      $('next-text').textContent = st.nextText;
      $('rank-fill').style.width = st.rankPct + '%';
      $('rank-bar').setAttribute('aria-valuenow', st.rankPct);
      $('xp').textContent = st.xp;
      $('hats').textContent = st.hats + ' / ' + st.totalGames;
      $('forks').textContent = st.forks + ' / ' + st.totalGames;
      $('dishes').textContent = st.dishes + ' / ' + st.totalDishes;
      $('rack').innerHTML = menu.levels.map(peg).join('');
      $('rack-text').textContent = 'Rack filled: ' + st.dishes + ' of ' + st.totalDishes + ' dishes';
      $('rack-fill').style.width = Math.round((st.dishes / st.totalDishes) * 100) + '%';
      $('hat-list').innerHTML = st.games.map(hat).join('');
      $('fork-list').innerHTML = st.games.map(fork).join('');
    }
    /* Two-step reset, no browser dialogs. Keeps the nickname. */
    function confirming(on) {
      $('confirm').hidden = !on;
      $('ask-reset').hidden = on;
      (on ? $('cancel-reset') : $('ask-reset')).focus();
    }
    $('ask-reset').addEventListener('click', function () { confirming(true); });
    $('cancel-reset').addEventListener('click', function () { confirming(false); });
    $('do-reset').addEventListener('click', function () {
      var s = load(), keep = { games: {} };
      if (s.nick) keep.nick = s.nick;
      save(keep);
      confirming(false);
      render();
    });
    render();
    getMenu().then(function (m) { menu = m; render(); }).catch(function (e) { loadError($('rack'), e); });
    return { title: 'La Mia Cucina · Profile', foot: 'Progress is saved in this browser only', nav: 'cucina', render: render };
  };

  /* ---------- Prenota un Tavolo (prototype login: keeps a nickname, never the password) ---------- */
  VIEWS.prenota = function () {
    function render() {
      var s = load();
      paintHeader(s);
      $('seated').hidden = !s.nick;
      $('booking').hidden = !!s.nick;
      $('seated-nick').textContent = s.nick || '';
    }
    function err(msg) { $('err').textContent = msg; $('err').hidden = !msg; }
    function setMode(reg) {
      $('to-reg').className = 'seg' + (reg ? ' seg-on' : '');
      $('to-log').className = 'seg' + (reg ? '' : ' seg-on');
      $('to-reg').setAttribute('aria-selected', reg);
      $('to-log').setAttribute('aria-selected', !reg);
      $('pw').setAttribute('autocomplete', reg ? 'new-password' : 'current-password');
      $('submit').textContent = reg ? 'Prenota il mio tavolo' : 'Siediti! Sign in';
      err('');
    }
    $('to-reg').addEventListener('click', function () { setMode(true); });
    $('to-log').addEventListener('click', function () { setMode(false); });
    $('who').addEventListener('input', function () { err(''); });
    $('pw').addEventListener('input', function () { err(''); });
    $('toggle-pw').addEventListener('click', function () {
      var show = $('pw').type === 'password';
      $('pw').type = show ? 'text' : 'password';
      this.textContent = show ? 'Hide' : 'Show';
      this.setAttribute('aria-pressed', show);
    });
    $('book-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var who = $('who').value.trim(), pw = $('pw').value;
      if (!who) { err('Tell the waiter your nickname or email.'); $('who').focus(); return; }
      if (who.indexOf('@') >= 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(who)) { err('That email looks a little undercooked. Check it again.'); $('who').focus(); return; }
      if (pw.length < 6) { err('Your password needs at least 6 characters.'); $('pw').focus(); return; }
      var nick = who.indexOf('@') >= 0 ? who.split('@')[0] : who;
      nick = nick.charAt(0).toUpperCase() + nick.slice(1, 24);
      var s = load(); s.nick = nick; save(s);
      $('pw').value = '';
      render();
    });
    $('logout').addEventListener('click', function () {
      var s = load(); delete s.nick; save(s);
      $('who').value = ''; $('pw').value = '';
      render();
      $('who').focus();
    });
    render();
    return { title: 'Prenota un Tavolo · Login', foot: TRATT, nav: 'prenota', render: render };
  };

  /* ---------- Level: one reusable template for every pasta ---------- */
  VIEWS.level = function (key) {
    var D = null, menu = null, tab = 0, states = [], timer = null, dragId = null;
    var view = { title: 'Trattoria', foot: TRATT, nav: '', render: function () { if (D) render(); } };

    function render(focusKey) {
      var active = document.activeElement;
      var k = focusKey || (active && active.closest && active.closest('#panel') && active.getAttribute('data-k'));
      var rec = load().games;
      paintHeader();

      var xp = 0;
      $('bill-rows').innerHTML = D.games.map(function (g) {
        var best = (rec[g.id] && rec[g.id].best) || 0; xp += best;
        return '<div class="bill-row" style="font-size:14px"><span>' + esc(g.title) + '</span><b>' + best + ' / ' + g.maxScore + '</b></div>';
      }).join('');
      $('level-xp').textContent = xp;

      $('tabs').innerHTML = D.games.map(function (g, i) {
        var r = rec[g.id], on = i === tab;
        var status = r && r.done ? 'Best: ' + r.best + ' XP' + (r.perfect ? ' · golden fork' : '') : 'Not cooked yet';
        return '<button class="tab' + (on ? ' tab-on' : '') + '" data-tab="' + i + '" aria-pressed="' + on + '">' +
          '<span class="disp tab-kicker">' + esc(g.kicker || ('GAME ' + (i + 1))) + '</span><span class="disp tab-label">' + esc(g.title) + '</span>' +
          '<span class="tab-status">' + esc(status) + '</span></button>';
      }).join('');

      var g = D.games[tab], engine = ENGINES[g.type];
      $('panel').innerHTML = engine ? engine.render(g, states[tab]) : '<p>Unknown game type: ' + esc(g.type) + '</p>';

      /* Keep keyboard focus in place across re-renders (or on the nearest sibling). */
      if (k) {
        var p = $('panel');
        var el = p.querySelector('[data-k="' + k + '"]') ||
          p.querySelector('[data-k^="' + k.split('-')[0] + '-"]:not([aria-disabled])') ||
          p.querySelector('[data-k="check"],[data-k="next"],[data-k="reset"]');
        if (el) el.focus({ preventScroll: true });
      }
    }

    /* Context handed to the engines. */
    var ctx = {
      record: record, showWin: showWin, rerender: function () { render(); },
      startTimer: function (fn) { clearInterval(timer); timer = setInterval(fn, 1000); },
      stopTimer: function () { clearInterval(timer); },
      isActive: function (g) { return D.games[tab] === g; }
    };

    function act(name, a) {
      var g = D.games[tab], s = states[tab], engine = ENGINES[g.type];
      if (name === 'reset') { if (engine.reset) engine.reset(ctx); states[tab] = engine.fresh(g); render(); return; }
      var focus = engine.act(g, s, name, a, ctx);
      render(focus);
    }

    function bind() {
      $('tabs').addEventListener('click', function (e) {
        var b = e.target.closest('[data-tab]'); if (!b) return;
        tab = +b.getAttribute('data-tab'); render();
      });
      var panel = $('panel');
      panel.addEventListener('click', function (e) {
        var b = e.target.closest('[data-act]'); if (!b) return;
        act(b.getAttribute('data-act'), b.getAttribute('data-a'));
      });
      /* Drag and drop on desktop (order games); tapping works everywhere. */
      panel.addEventListener('dragstart', function (e) {
        var b = e.target.closest('.strand'); if (!b) return;
        dragId = b.getAttribute('data-a');
        try { e.dataTransfer.setData('text/plain', dragId); e.dataTransfer.effectAllowed = 'move'; } catch (x) {}
      });
      panel.addEventListener('dragover', function (e) {
        var z = e.target.closest('[data-drop]'); if (!z) return;
        e.preventDefault();
        if (z.classList.contains('slot')) z.classList.add('slot-over');
      });
      panel.addEventListener('dragleave', function (e) {
        var z = e.target.closest('.slot'); if (z && !z.contains(e.relatedTarget)) z.classList.remove('slot-over');
      });
      panel.addEventListener('drop', function (e) {
        var z = e.target.closest('[data-drop]'); if (!z) return;
        e.preventDefault();
        var id = dragId; try { id = e.dataTransfer.getData('text/plain') || id; } catch (x) {}
        dragId = null;
        var at = z.getAttribute('data-drop'), g = D.games[tab];
        if (id && at !== 'pool' && g.type === 'order') { ENGINES.order.place(g, states[tab], id, +at); render(); }
      });
    }

    function paintHero() {
      var p = D.page || {};
      view.title = 'Level ' + D.level + ' · ' + D.pasta + (p.venue ? ' · ' + p.venue : '');
      document.title = view.title;
      $('hero-art').innerHTML = art({ status: 'open', pasta: D.pasta }, 104, 80);
      $('hero-kicker').textContent = p.kicker || ('Level ' + D.level);
      $('hero-title').innerHTML = esc(D.pasta) + (p.venue ? ' <span>· ' + esc(p.venue) + '</span>' : '');
      $('hero-blurb').textContent = p.blurb || D.topic || '';
      $('bill-tag').textContent = p.table || ('TAVOLO ' + D.level);
      if (p.credit) $('foot-note').textContent = p.credit;
    }
    function paintPager() {
      var open = menu.levels.filter(function (l) { return l.data; });
      var idx = -1;
      open.forEach(function (l, i) { if (keyOf(l) === key) idx = i; });
      var prev = open[idx - 1], next = open[idx + 1];
      $('pager').innerHTML =
        (prev ? '<a class="btn btn-ghost" href="#' + esc(keyOf(prev)) + '">Previous dish: ' + esc(prev.pasta) + '</a>' : '<a class="btn btn-ghost" href="#menu">Back to Il Menù</a>') +
        (next ? '<a class="btn btn-green" href="#' + esc(keyOf(next)) + '">Next dish: ' + esc(next.pasta) + '</a>' : '<a class="btn btn-green" href="#menu">Back to Il Menù</a>');
    }

    view.leave = function () { clearInterval(timer); };
    view.onKey = function (e) {
      if (!D) return;
      var g = D.games[tab], engine = ENGINES[g.type];
      if (engine && engine.key) {
        var r = engine.key(g, states[tab], e);
        if (r) { e.preventDefault(); act(r[0], r[1]); }
      }
    };

    paintHeader();
    getMenu().then(function (m) {
      menu = m;
      var level = m.levels.filter(function (l) { return keyOf(l) === key && l.data; })[0];
      if (!level) { missing(key, m); return; }
      D = level.data;
      states = D.games.map(function (g) { return ENGINES[g.type] ? ENGINES[g.type].fresh(g) : {}; });
      paintHero(); paintPager(); bind(); render();
    }).catch(function (e) { loadError($('panel'), e); });
    return view;
  };

  function missing(key, menu) {
    $('app').replaceChildren($('tpl-missing').content.cloneNode(true));
    var l = menu && menu.levels.filter(function (x) { return keyOf(x) === key; })[0];
    $('missing-text').textContent = l ? l.pasta + ' opens after Session ' + l.level + '.' : 'That dish is not on the menu yet.';
  }

  /* ================= 6. Game engines =================
     Each engine: fresh(game) -> state, render(game, state) -> HTML,
     act(game, state, action, arg, ctx) -> key of the element to focus next. */

  function head(g, stats) {
    return '<div class="game-head"><div class="game-intro"><h2 class="disp game-title">' + esc(g.title) + '</h2>' +
      (g.intro ? '<p class="lead">' + esc(g.intro) + '</p>' : '') + '</div>' +
      '<div class="bill bill-mini">' + stats.map(function (s) { return '<span>' + s[0] + ' <b class="disp"' + (s[2] || '') + '>' + s[1] + '</b></span>'; }).join('') + '</div></div>';
  }
  function recapBox(text) {
    return '<div class="recap"><h3 class="disp">Ricetta del giorno · what to remember</h3><p>' + rich(text) + '</p></div>';
  }

  var ENGINES = {};

  /* ---------- ORDER: Untangle the Spaghetti, Dal Forno al Tavolo, Passa il Piatto ---------- */
  var SQUIGGLE = '<svg width="100%" height="10" viewBox="0 0 200 10" preserveAspectRatio="none" aria-hidden="true"><path d="M0 5c10-8 20 8 30 0s20 8 30 0 20 8 30 0 20 8 30 0 20 8 30 0 20 8 30 0 20 8 30 0" fill="none" stroke="#E0A82E" stroke-width="3"/></svg>';
  ENGINES.order = {
    fresh: function (g) {
      /* Shuffle, but never hand out the pool already solved. */
      var p = shuffle(g.answer), n = 0;
      while (p.join() === g.answer.join() && n < 8) { p = shuffle(g.answer); n++; }
      return { pool: p, slots: g.answer.map(function () { return null; }), wrong: [], attempts: 0, done: false, score: 0, msg: '' };
    },
    render: function (g, o) {
      var pts = o.done ? o.score : Math.max(20, 100 - 20 * o.attempts);
      var h = '<div class="game">' + head(g, [['Punti', pts], ['Tentativi', o.attempts]]) +
        '<div class="split"><div class="pool" data-drop="pool"><p class="hand col-title">' + esc(g.poolTitle || 'The ingredients') + '</p>';
      h += o.pool.map(function (id) {
        var it = g.items[id];
        return '<button class="strand" draggable="true" data-act="place" data-a="' + esc(id) + '" data-k="p-' + esc(id) + '" aria-label="Place ' + esc(it.label) + ' in the next empty spot">' +
          (g.squiggle ? SQUIGGLE : '') + '<span class="disp strand-label">' + esc(it.label) + '</span><span class="strand-hint">' + esc(it.hint) + '</span></button>';
      }).join('');
      if (!o.pool.length) h += '<p class="m0 muted" style="font-size:14px">' + esc(g.poolEmptyMsg || 'Everything is placed. Tap a spot to send it back.') + '</p>';
      h += '</div><ol class="slots">';
      h += o.slots.map(function (id, i) {
        var name = g.slotLabels ? g.slotLabels[i] : 'Step ' + (i + 1);
        var cls = 'slot' + (id ? (o.wrong[i] ? ' slot-bad' : ' slot-full') : '');
        var aria = id ? name + ': ' + g.items[id].label + (o.wrong[i] ? ' (wrong)' : '') + (o.done ? '' : '. Tap to send it back.') : name + ': empty';
        return '<li><button class="' + cls + '" data-act="back" data-a="' + i + '" data-drop="' + i + '" data-k="s-' + i + '" aria-label="' + esc(aria) + '">' +
          '<span class="slot-num">' + (i + 1) + '</span><span class="slot-body">' +
          (g.slotLabels ? '<span class="station">' + esc(g.slotLabels[i]) + '</span>' : '') +
          '<span class="disp strand-label">' + esc(id ? g.items[id].label : (g.emptyLabel || 'Empty spot')) + '</span></span></button></li>';
      }).join('');
      h += '</ol></div><div class="actions">' +
        '<button class="btn btn-green" data-act="check" data-k="check">' + esc(g.checkLabel || 'Assaggia! Check my order') + '</button>' +
        '<button class="btn btn-ghost" data-act="reset" data-k="reset">Start over</button>' +
        '<span class="msg ' + (o.done ? 'ok' : 'bad') + '" role="status">' + esc(o.msg) + '</span></div>';
      if (o.done && g.recap) h += recapBox(g.recap);
      return h + '</div>';
    },
    /* Tap = next empty slot; drop = that slot (swapping out whatever was there). */
    place: function (g, o, id, idx) {
      if (o.done || o.pool.indexOf(id) < 0) return;
      if (idx == null) { idx = o.slots.indexOf(null); if (idx < 0) return; }
      var prev = o.slots[idx];
      o.pool = o.pool.filter(function (x) { return x !== id; });
      if (prev) o.pool.push(prev);
      o.slots[idx] = id; o.wrong = []; o.msg = '';
    },
    act: function (g, o, name, a, ctx) {
      if (name === 'place') { this.place(g, o, a); return; }
      if (name === 'back') {
        var i = +a;
        if (!o.done && o.slots[i]) { o.pool.push(o.slots[i]); o.slots[i] = null; o.wrong = []; o.msg = ''; }
        return;
      }
      if (name !== 'check' || o.done) return;
      if (o.slots.indexOf(null) >= 0) { o.msg = g.fillMsg || 'Fill every spot first!'; return; }
      o.wrong = o.slots.map(function (id, i) { return id !== g.answer[i]; });
      var bad = o.wrong.filter(Boolean).length, unit = g.unit || ['item', 'items'];
      if (bad) {
        o.attempts++;
        o.msg = 'Ancora al dente… ' + bad + ' ' + (bad === 1 ? unit[0] + ' is' : unit[1] + ' are') + ' out of place.' + (g.fixHint ? ' ' + g.fixHint : '');
        return;
      }
      o.done = true; o.score = Math.max(20, 100 - 20 * o.attempts);
      o.msg = 'Perfetto! +' + o.score + ' Parmigiano points.';
      ctx.record(g.id, o.score, g.maxScore);
      var perfect = o.attempts === 0;
      ctx.showWin(perfect ? 'Perfetto!' : 'Che bello!', fill(g.winText || '{title} served with {score} Parmigiano points', { title: g.title, score: o.score }) + forkTail(perfect));
    }
  };

  /* ---------- TIMED SORT: Sauce Sorter ---------- */
  var POT_ICON = {
    html: '<svg width="56" height="40" viewBox="0 0 56 40" aria-hidden="true"><path d="M8 12h40v16a8 8 0 0 1-8 8H16a8 8 0 0 1-8-8z" fill="#2B1D14" opacity=".85"/><path d="M3 12h50M1 18h7M48 18h7" stroke="#2B1D14" stroke-width="3" stroke-linecap="round"/><path d="M16 8c3-5 6 2 9-2s6 2 9-2 6 2 8 0" fill="none" stroke="#2B1D14" stroke-width="2.5" stroke-linecap="round"/></svg>',
    css: '<svg width="56" height="40" viewBox="0 0 56 40" aria-hidden="true"><path d="M8 12h40v16a8 8 0 0 1-8 8H16a8 8 0 0 1-8-8z" fill="#fff" opacity=".9"/><path d="M3 12h50M1 18h7M48 18h7" stroke="#fff" stroke-width="3" stroke-linecap="round"/><path d="M20 8c0-4 4-4 4-7M30 8c0-4 4-4 4-7" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/></svg>',
    js: '<svg width="56" height="40" viewBox="0 0 56 40" aria-hidden="true"><path d="M8 12h40v16a8 8 0 0 1-8 8H16a8 8 0 0 1-8-8z" fill="#fff" opacity=".9"/><path d="M3 12h50M1 18h7M48 18h7" stroke="#fff" stroke-width="3" stroke-linecap="round"/><circle cx="22" cy="5" r="2" fill="#fff"/><circle cx="30" cy="3" r="2" fill="#fff"/><circle cx="36" cy="7" r="2" fill="#fff"/></svg>'
  };
  function potParts(label) { var p = String(label).split(' · '); return { name: p[0], sub: p.slice(1).join(' · ') }; }
  function timeColor(t) { return t <= 10 ? '#C0392B' : '#2E6B34'; }

  ENGINES['timed-sort'] = {
    fresh: function (g) { return { phase: 'ready', queue: [], i: 0, score: 0, time: g.seconds, streak: 0, fb: '', ok: true, correct: 0 }; },
    reset: function (ctx) { ctx.stopTimer(); },
    render: function (g, s) {
      var n = g.snippets.length, col = timeColor(s.time), max = g.maxScore;
      var h = '<div class="game">' + head(g, [
        ['Punti', s.score],
        ['Tempo', '<span data-time>' + s.time + '</span>s', ' style="color:' + col + '" data-timecol'],
        ['Serie', 'x' + s.streak]
      ]);
      h += '<div class="bar bar-sm"><div class="bar-fill" data-timebar style="min-width:0;width:' + Math.round((s.time / g.seconds) * 100) + '%;background:' + col + ';transition:width 1s linear"></div></div>';
      if (s.phase === 'ready') {
        h += '<div class="center" style="padding:30px 10px"><p class="hand m0" style="font-size:30px;color:#2E6B34">' + n + ' snippets · ' + g.seconds + ' seconds · +10 right, −5 wrong</p>' +
          '<button class="btn btn-red" data-act="start" data-k="start" style="font-size:20px;padding:14px 32px">Accendi il fuoco! Start</button></div>';
      } else if (s.phase === 'play') {
        var sn = g.snippets[s.queue[s.i]];
        h += '<p class="m0 muted" style="font-size:14px">Snippet ' + (s.i + 1) + ' of ' + n + ' on the counter</p>' +
          '<div class="' + (s.i % 2 ? 'drop-a' : 'drop-b') + '"><div class="code">' + esc(sn.code) + '</div></div><div class="pots">';
        h += Object.keys(g.pots).map(function (k, idx) {
          var p = potParts(g.pots[k]);
          return '<button class="pot pot-' + esc(k) + '" data-act="pot" data-a="' + esc(k) + '" data-k="pot-' + esc(k) + '" aria-keyshortcuts="' + (idx + 1) + '">' +
            (POT_ICON[k] || '') + '<span class="disp pot-name">' + esc(p.name) + '</span><span class="pot-sub">' + esc(p.sub) + '</span></button>';
        }).join('');
        h += '</div><p class="m0 msg ' + (s.ok ? 'ok' : 'bad') + '" role="status" style="min-height:24px">' + esc(s.fb) + '</p>' +
          '<p class="m0 muted" style="font-size:13px">Tip: keys 1, 2 and 3 throw into the pots too.</p>';
      } else {
        var verdict = s.score >= max ? 'Perfetto!' : (s.score >= max * 2 / 3 ? 'Che bello!' : (s.score >= max / 3 ? 'Buono, ma…' : 'Riprova, chef!'));
        h += '<div class="center"><p class="hand m0" style="font-size:34px;color:#C0392B">' + verdict + '</p>' +
          '<p class="m0" style="font-size:17px">You sorted <b>' + s.correct + '</b> of ' + n + ' snippets for <b>' + s.score + '</b> Parmigiano points.</p>' +
          (g.recap ? '<div class="note">' + rich(g.recap) + '</div>' : '') +
          '<button class="btn btn-red" data-act="start" data-k="start">Another round</button></div>';
      }
      return h + '</div>';
    },
    end: function (g, s, ctx) {
      ctx.stopTimer();
      s.phase = 'over';
      ctx.record(g.id, s.score, g.maxScore);
      if (s.score >= g.maxScore) ctx.showWin('Perfetto!', (g.perfectText || 'A perfect sort') + ': +' + s.score + ' Parmigiano and a golden fork.');
      else if (s.score >= g.maxScore * 2 / 3) ctx.showWin('Che bello!', 'Great sorting: ' + s.score + ' Parmigiano points.');
    },
    act: function (g, s, name, a, ctx) {
      var self = this;
      if (name === 'start') {
        Object.assign(s, { phase: 'play', queue: shuffle(g.snippets.map(function (_, i) { return i; })), i: 0, score: 0, time: g.seconds, streak: 0, fb: '', ok: true, correct: 0 });
        ctx.startTimer(function () {
          if (s.phase !== 'play') { ctx.stopTimer(); return; }
          s.time = Math.max(0, s.time - 1);
          if (s.time === 0) { self.end(g, s, ctx); ctx.rerender(); return; }
          if (ctx.isActive(g)) self.tick(g, s);
        });
        return 'pot-' + Object.keys(g.pots)[0];
      }
      if (name !== 'pot' || s.phase !== 'play') return;
      var sn = g.snippets[s.queue[s.i]], ex = g.explain || {};
      if (sn.answer === a) { s.streak++; s.correct++; s.score += 10; s.ok = true; s.fb = 'Corretto! ' + (ex[a] || ''); }
      else { s.streak = 0; s.score = Math.max(0, s.score - 5); s.ok = false; s.fb = 'Ops! That one goes in ' + potParts(g.pots[sn.answer]).name + '. ' + (ex[sn.answer] || ''); }
      s.i++;
      if (s.i >= s.queue.length) { this.end(g, s, ctx); return 'start'; }
    },
    /* Ticks only touch the clock, so the snippet's drop animation does not replay. */
    tick: function (g, s) {
      var col = timeColor(s.time), t = document.querySelector('[data-time]'), c = document.querySelector('[data-timecol]'), b = document.querySelector('[data-timebar]');
      if (t) t.textContent = s.time;
      if (c) c.style.color = col;
      if (b) { b.style.width = Math.round((s.time / g.seconds) * 100) + '%'; b.style.background = col; }
    },
    key: function (g, s, e) {
      if (s.phase !== 'play' || e.ctrlKey || e.metaKey || e.altKey) return null;
      var k = Object.keys(g.pots)[+e.key - 1];
      return k ? ['pot', k] : null;
    }
  };

  /* ---------- MATCH: La Brigata ---------- */
  ENGINES.match = {
    fresh: function (g) { return { sel: null, paired: {}, score: 0, misses: 0, fb: '', ok: true, done: false, order: shuffle(g.pairs.map(function (_, i) { return i; })) }; },
    render: function (g, b) {
      var n = g.pairs.length;
      var h = '<div class="game">' + head(g, [['Punti', b.score], ['Coppie', Object.keys(b.paired).length + ' / ' + n]]) + '<div class="split">';
      h += '<div class="col"><p class="hand col-title">' + esc(g.rolesTitle || 'Who') + '</p>';
      h += g.pairs.map(function (p, i) {
        var done = !!b.paired[i], on = b.sel === i, plan = p.team === g.pairs[0].team;
        return '<button class="chef' + (done ? ' chef-done' : (on ? ' chef-on' : '')) + '" data-act="role" data-a="' + i + '" data-k="r-' + i + '" aria-pressed="' + on + '"' + (done ? ' aria-disabled="true"' : '') + '>' +
          (p.team ? '<span class="team ' + (plan ? 'team-plan' : 'team-prod') + '">' + esc(p.team) + '</span>' : '') +
          '<span class="disp" style="font-size:17px">' + esc(p.role) + '</span>' + (done ? '<span class="sr-only"> (matched)</span>' : '') + '</button>';
      }).join('');
      h += '</div><div class="col col-wide"><p class="hand col-title">' + esc(g.outputsTitle || 'What they make') + '</p>';
      h += b.order.map(function (i) {
        var done = !!b.paired[i];
        return '<button class="chef' + (done ? ' chef-done' : '') + '" data-act="out" data-a="' + i + '" data-k="o-' + i + '"' + (done ? ' aria-disabled="true"' : '') + '><span>' + esc(g.pairs[i].output) + '</span>' + (done ? '<span class="sr-only"> (matched)</span>' : '') + '</button>';
      }).join('');
      h += '</div></div><div class="actions"><button class="btn btn-ghost" data-act="reset" data-k="reset">Start over</button>' +
        '<span class="msg ' + (b.ok ? 'ok' : 'bad') + '" role="status">' + esc(b.fb) + '</span></div>';
      return h + '</div>';
    },
    act: function (g, b, name, a, ctx) {
      var i = +a;
      if (name === 'role') {
        if (b.done || b.paired[i]) return;
        b.sel = i; b.fb = '';
        /* Jump to the first dish still on the pass. */
        var free = b.order.filter(function (j) { return !b.paired[j]; })[0];
        return free != null ? 'o-' + free : undefined;
      }
      if (name !== 'out' || b.done || b.paired[i]) return;
      if (b.sel === null) { b.fb = 'Pick a chef first, then their dish.'; b.ok = false; return 'r-0'; }
      var who = g.pairs[b.sel].role;
      if (i === b.sel) { b.paired[i] = true; b.score += 20; b.ok = true; b.fb = 'Esatto! That is the ' + who + '’s plate.'; b.sel = null; }
      else { b.score = Math.max(0, b.score - 5); b.misses++; b.ok = false; b.fb = 'Wrong plate for the ' + who + '. Try another.'; }
      if (Object.keys(b.paired).length === g.pairs.length) {
        b.done = true;
        /* The score floors at 0, so an early miss can still end on 120: the fork needs zero misses. */
        var perfect = b.misses === 0;
        ctx.record(g.id, b.score, g.maxScore, perfect);
        ctx.showWin(perfect ? 'Perfetto!' : 'Che bello!', fill(g.winText || 'All matched: {score} Parmigiano points', { score: b.score }) + forkTail(perfect));
        return 'reset';
      }
      if (b.sel === null) return 'r-0';
    }
  };

  /* ---------- QUIZ: Il Quiz del Cameriere, Il Quiz di Nick ---------- */
  ENGINES.quiz = {
    fresh: function () { return { i: 0, picked: null, score: 0, right: 0, done: false }; },
    render: function (g, q) {
      var qs = g.questions, n = qs.length, cur = qs[Math.min(q.i, n - 1)], pass = Math.ceil(n * 0.65);
      var h = '<div class="game game-narrow">' + head(g, [['Punti', q.score], ['Domanda', Math.min(q.i + 1, n) + ' / ' + n]]);
      if (!q.done) {
        var answered = q.picked !== null, right = q.picked === cur.answer;
        h += '<div class="game" style="gap:12px"><p class="disp question" tabindex="-1" data-k="q">' + esc(cur.question) + '</p>';
        h += cur.options.map(function (t, i) {
          var cls = 'opt';
          if (answered) { if (i === cur.answer) cls += ' opt-good'; else if (i === q.picked) cls += ' opt-bad'; }
          var sr = answered ? (i === cur.answer ? ' (correct answer)' : (i === q.picked ? ' (your answer)' : '')) : '';
          return '<button class="' + cls + '" data-act="opt" data-a="' + i + '" data-k="opt-' + i + '"' + (answered ? ' aria-disabled="true"' : '') + '><span class="letter">' + 'ABCDEF'[i] + '</span><span>' + esc(t) + '</span>' + (sr ? '<span class="sr-only">' + sr + '</span>' : '') + '</button>';
        }).join('');
        if (answered) {
          h += '<div class="why" role="status"><b class="' + (right ? 'ok' : 'bad') + '">' + (right ? 'Esatto!' : 'Non proprio.') + '</b> ' + esc(cur.explanation) + '</div>' +
            '<div><button class="btn btn-green" data-act="next" data-k="next">' + (q.i + 1 >= n ? 'See my bill' : 'Next question') + '</button></div>';
        }
        h += '</div>';
      } else {
        h += '<div class="center"><p class="hand m0" style="font-size:34px;color:#C0392B">' + (q.right === n ? 'Perfetto!' : (q.right >= pass ? 'Che bello!' : 'Riprova, chef!')) + '</p>' +
          '<p class="m0" style="font-size:17px">' + q.right + ' of ' + n + ' right · <b>' + q.score + '</b> Parmigiano points</p>' +
          '<button class="btn btn-red" data-act="reset" data-k="reset">Ask me again</button></div>';
      }
      return h + '</div>';
    },
    act: function (g, q, name, a, ctx) {
      var n = g.questions.length;
      if (name === 'opt') {
        if (q.picked !== null || q.done) return 'next';
        q.picked = +a;
        if (q.picked === g.questions[q.i].answer) { q.score += g.pointsEach || 10; q.right++; }
        return 'next';
      }
      if (name !== 'next' || q.picked === null) return;
      if (q.i + 1 >= n) {
        q.done = true;
        ctx.record(g.id, q.score, g.maxScore);
        if (q.right === n) ctx.showWin('Perfetto!', (g.perfectText || 'A perfect score') + ': +' + q.score + ' Parmigiano and a golden fork.');
        else if (q.right >= Math.ceil(n * 0.65)) ctx.showWin('Che bello!', q.right + ' of ' + n + ' right: +' + q.score + ' Parmigiano points.');
        return 'reset';
      }
      q.i++; q.picked = null;
      return 'q';
    }
  };

  /* ================= 7. Router ================= */
  var current = null, firstRoute = true;
  function route() {
    var hash = decodeURIComponent((location.hash || '').slice(1)).toLowerCase();
    var name = hash === 'cucina' || hash === 'prenota' ? hash : (hash && hash !== 'menu' ? 'level' : 'menu');
    if (current && current.leave) current.leave();
    closeWin();
    $('foot-note').textContent = TRATT;
    $('app').replaceChildren($('tpl-' + name).content.cloneNode(true));
    current = VIEWS[name](hash);
    document.title = current.title;
    $('foot-note').textContent = current.foot;
    document.querySelectorAll('[data-nav]').forEach(function (a) {
      var on = a.getAttribute('data-nav') === current.nav;
      a.classList.toggle('nav-on', on);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    document.querySelectorAll('[data-book]').forEach(function (a) { a.hidden = name === 'prenota'; });
    if (!firstRoute) { window.scrollTo(0, 0); $('app').focus({ preventScroll: true }); }
    firstRoute = false;
  }

  /* Re-read progress when the student comes back from another tab or window. */
  function refresh() { if (current && current.render) current.render(); }
  window.addEventListener('focus', refresh);
  window.addEventListener('pageshow', function (e) { if (e.persisted) refresh(); });
  window.addEventListener('storage', function (e) { if (e.key === KEY) refresh(); });
  window.addEventListener('hashchange', route);
  $('win').addEventListener('click', function (e) { if (e.target.closest('[data-close-win]')) closeWin(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closeWin(); return; }
    if (current && current.onKey && !/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) current.onKey(e);
  });
  route();
})();
