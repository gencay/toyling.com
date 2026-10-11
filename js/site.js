/* Toyling Games — theme, integer-scaled pixel art, parallax, the hero sky and the logo player. */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var narrowMQ = window.matchMedia('(max-width: 700px)');
  var players = [];
  function mod(a, n) { return ((a % n) + n) % n; }

  /* ---------------------------------------------------------------- theme */
  function currentTheme() { return root.getAttribute('data-theme') === 'night' ? 'night' : 'day'; }
  function applyTheme(t, persist) {
    root.setAttribute('data-theme', t);
    document.querySelectorAll('[data-theme-toggle]').forEach(function (b) {
      b.setAttribute('aria-pressed', t === 'night' ? 'true' : 'false');
      var label = b.querySelector('.theme-label');
      if (label) label.textContent = t === 'night' ? 'Day' : 'Night';
      b.setAttribute('aria-label', t === 'night' ? 'Switch to day' : 'Switch to night');
    });
    if (persist) { try { localStorage.setItem('toyling-theme', t); } catch (e) {} }
    players.forEach(function (p) { p.themeChanged(); });
    setScales();
    request();
  }
  document.querySelectorAll('[data-theme-toggle]').forEach(function (b) {
    b.addEventListener('click', function () { applyTheme(currentTheme() === 'night' ? 'day' : 'night', true); });
  });

  /* ---------------------------------------------------------------- integer scales */
  var hero = document.querySelector('[data-hero]');
  var skyLayer = hero ? hero.querySelector('.layer-sky') : null;
  // layer-local x of a scenery tile's left edge: mirrors the layers' background-position
  function tileOrigin(lw, s, W) { return (lw - W * s) / 2 + (narrowMQ.matches ? 48 * s : 0); }
  function setScales() {
    if (hero) {
      var header = document.querySelector('.site-header');
      var vh = Math.max(600, window.innerHeight - (header ? header.offsetHeight : 0));
      var s = Math.max(2, Math.min(12, Math.round(vh / 180)));
      hero.style.setProperty('--s', s);
      var content = hero.querySelector('.hero-content');
      var logo = content ? content.querySelector('.hero-logo') : null;
      if (content && logo) {
        var textBlock = content.offsetHeight - logo.offsetHeight;
        var top = content.offsetTop;
        var skyBottom = vh - 90 * s;            // far range is 86 cells tall; keep 4 cells of air
        var ls = Math.floor((skyBottom - top - textBlock) / 68);
        ls = Math.max(2, Math.min(6, ls));
        if (window.innerWidth < 420) ls = Math.min(ls, 3);
        hero.style.setProperty('--ls', ls);
        // grow the hero (never the art) when the copy needs more sky than the viewport offers
        hero.style.height = Math.max(vh, top + textBlock + 68 * ls + 90 * s) + 'px';
      }
      if (skyLayer) {
        // dotted-notebook paper: dots about 20 px apart, on whole cells of the scenery grid
        var gap = s * Math.max(2, Math.round(20 / s));
        var gx = skyLayer.offsetLeft + tileOrigin(skyLayer.offsetWidth, s, 480);
        var gy = skyLayer.offsetTop + skyLayer.offsetHeight;
        hero.style.setProperty('--dot-gap', gap + 'px');
        hero.style.setProperty('--dot-pos', mod(gx, gap) + 'px ' + mod(gy, gap) + 'px');
      }
    }
    var rs = window.innerWidth < 560 ? 2 : 3;
    root.style.setProperty('--rs', rs);
    buildSky();
  }

  /* ---------------------------------------------------------------- hero sky
     Redraws the kit's sky lists on a canvas at 1 px per cell that the layer scales like every other layer: stars by
     night; clouds, birds and plus signs by day. Items that would touch the hero copy (plus 2 cells, along its parallax
     path and, by day, across their drift) are dropped whole; the four-button diamond moves to its reserved alternate
     spot below the Ida summit when its primary spot is covered. By day clouds drift, birds flap in short bursts and
     glide, and plus signs twinkle, all in whole cells and inside the room the kit reserved for them. */
  var skyAll = window.TOYLING_SKY || null;
  var sky = { canvas: null, ctx: null, key: '', scene: null, theme: '', timer: null, visible: true, t: 1, sprites: {} };
  var FLAP_MS = 200, FLAPS_MS = 1600, GLIDE_MS = 3200;   // two wingbeats, then a glide

  function copyBoxes(s) {
    var boxes = [], content = hero.querySelector('.hero-content');
    if (!content) return boxes;
    var m = 2 * s, ls = parseInt(hero.style.getPropertyValue('--ls'), 10) || 0;
    // the copy drifts against the sky while scrolling (different depths): clear its whole path
    var rel = ((parseFloat(skyLayer.getAttribute('data-depth')) || 0) -
               (parseFloat(content.getAttribute('data-depth')) || 0)) * (hero.offsetHeight + 200);
    var up = Math.max(0, Math.ceil(rel)), down = Math.max(0, Math.ceil(-rel));
    Array.prototype.forEach.call(content.children, function (el) {
      if (el.offsetWidth < 4 || el.offsetHeight < 4) return;
      var e = m + (el.classList.contains('hero-logo') ? ls : 0);   // the logo canvas has a 1-cell gutter
      var x = content.offsetLeft + el.offsetLeft, y = content.offsetTop + el.offsetTop;
      boxes.push([x - e, y - e - up, x + el.offsetWidth + e, y + el.offsetHeight + e + down]);
    });
    return boxes;
  }
  function bounds(cells) {
    var b = [Infinity, Infinity, -Infinity, -Infinity];
    cells.forEach(function (d) {
      b[0] = Math.min(b[0], d[0]); b[1] = Math.min(b[1], d[1]); b[2] = Math.max(b[2], d[0]); b[3] = Math.max(b[3], d[1]);
    });
    return b;
  }
  function sprite(name) {
    if (!sky.sprites[name]) {
      var cells = skyAll.day.sprites[name], b = bounds(cells), c = document.createElement('canvas');
      c.width = b[2] + 1; c.height = b[3] + 1;
      var g = c.getContext('2d');
      cells.forEach(function (d) { g.fillStyle = d[2]; g.fillRect(d[0], d[1], 1, 1); });
      sky.sprites[name] = c;
    }
    return sky.sprites[name];
  }

  function buildSky() {
    if (!skyLayer || !skyAll || !skyAll[currentTheme()]) return;
    var theme = currentTheme(), data = skyAll[theme];
    var s = parseInt(hero.style.getPropertyValue('--s'), 10) || 1;
    var W = data.grid_cells[0], H = data.grid_cells[1], tile = W * s;
    var left = skyLayer.offsetLeft, top = skyLayer.offsetTop, lw = skyLayer.offsetWidth;
    var tox = tileOrigin(lw, s, W);
    var k0 = Math.floor(-tox / tile), k1 = Math.floor((lw - 1 - tox) / tile);
    var boxes = copyBoxes(s);
    var key = [theme, s, left, top, lw, tox, boxes.join(';')].join('|');
    if (key === sky.key) return;
    sky.key = key;
    if (!sky.canvas) {
      sky.canvas = document.createElement('canvas');
      sky.canvas.className = 'sky-canvas';
      sky.canvas.setAttribute('aria-hidden', 'true');
      skyLayer.appendChild(sky.canvas);
      sky.ctx = sky.canvas.getContext('2d');
      skyLayer.classList.add('is-live');
    }
    sky.canvas.width = (k1 - k0 + 1) * W;
    sky.canvas.height = H;
    sky.canvas.style.left = (tox + k0 * tile) + 'px';
    sky.canvas.style.width = ((k1 - k0 + 1) * tile) + 'px';

    // is the cell box [x0, x1) x [y0, y1) of scenery tile k behind the copy?
    function covered(k, x0, y0, x1, y1) {
      var X0 = left + tox + (k * W + x0) * s, X1 = left + tox + (k * W + x1) * s, Y0 = top + y0 * s, Y1 = top + y1 * s;
      for (var i = 0; i < boxes.length; i++) {
        var b = boxes[i];
        if (X0 < b[2] && X1 > b[0] && Y0 < b[3] && Y1 > b[1]) return true;
      }
      return false;
    }
    var scene = [], k, ox;
    function cellsAt(x, y, cells, colour) { scene.push({ x: x, y: y, cells: cells, colour: colour }); }
    function diamond() {
      var con = data.constellation, group = [];
      con.pattern.forEach(function (pt) {
        data.cells[pt[2]].forEach(function (d) { group.push([pt[0] + d[0], pt[1] + d[1]]); });
      });
      var b = bounds(group), spots = [con.primary, con.alternate];
      for (var i = 0; i < spots.length; i++) {
        var sp = spots[i];
        if (sp && !covered(k, sp[0] + b[0], sp[1] + b[1], sp[0] + b[2] + 1, sp[1] + b[3] + 1)) {
          con.pattern.forEach(function (pt) { cellsAt(ox + sp[0] + pt[0], sp[1] + pt[1], data.cells[pt[2]], pt[3]); });
          return;
        }
      }
    }
    for (k = k0; k <= k1; k++) {
      ox = (k - k0) * W;
      if (theme === 'night') {
        data.stars.forEach(function (st) {
          var cells = data.cells[st[2]], b = bounds(cells);
          if (!covered(k, st[0] + b[0], st[1] + b[1], st[0] + b[2] + 1, st[1] + b[3] + 1)) cellsAt(ox + st[0], st[1], cells, st[3]);
        });
      } else {
        var flock = -1, prev = null, seed = k * 7;
        data.items.forEach(function (it, n) {
          var kind = it[3], b = bounds(data.sprites[it[2]]);
          var drift = kind === 'cloud' ? data.motion.cloud_drift_cells : kind === 'bird' ? data.motion.bird_drift_cells : 0;
          var bob = kind === 'bird' ? data.motion.bird_bob_cells || 0 : 0;
          if (kind === 'bird' && !(prev && Math.abs(it[0] - prev[0]) < 14 && Math.abs(it[1] - prev[1]) < 6)) flock += 1;
          if (kind === 'bird') prev = it;
          if (covered(k, it[0] + b[0] - drift, it[1] + b[1] - bob, it[0] + b[2] + 1 + drift, it[1] + b[3] + 1)) return;
          var r = mod(Math.sin((n + 1) * 12.9898 + seed) * 43758.5453, 1);   // stable per item and tile
          var e = { x: ox + it[0], y: it[1], name: it[2], kind: kind, drift: drift, bob: bob };
          if (kind === 'cloud') { e.period = (40 + 30 * r) * 1000 / (2 * Math.PI); e.phase = r * 6.283; }
          if (kind === 'bird') {
            var fr = mod(Math.sin((flock + 1) * 78.233 + seed) * 12345.678, 1);   // a flock drifts together
            e.period = (14 + 6 * fr) * 1000 / (2 * Math.PI); e.phase = fr * 6.283;
            e.flap = Math.round(fr * (FLAPS_MS + GLIDE_MS)) + Math.round(r * 3) * FLAP_MS;   // a flock beats nearly together
          }
          if (kind === 'spark') {
            var c = data.sprites[it[2]].filter(function (d) { return d[0] === 1 && d[1] === 1; })[0];
            e.colour = c ? c[2] : '#FFFFFF'; e.period = 3200 + Math.round(r * 4200); e.phase = Math.round(r * 9000);
          }
          scene.push(e);
        });
      }
      diamond();
    }
    sky.scene = scene;
    sky.theme = theme;
    paintSky(reduceMotion.matches ? 0 : sky.t);
    animateSky();
  }
  // t = 0 paints the kit's still frame; later times move clouds and birds and twinkle the plus signs
  function paintSky(t) {
    var g = sky.ctx;
    g.clearRect(0, 0, sky.canvas.width, sky.canvas.height);
    sky.scene.forEach(function (e) {
      if (e.cells) {
        g.fillStyle = e.colour;
        e.cells.forEach(function (d) { g.fillRect(e.x + d[0], e.y + d[1], 1, 1); });
        return;
      }
      var name = e.name, dx = 0, dy = 0;
      if (t && e.kind === 'cloud') dx = Math.round(e.drift * Math.sin(t / e.period + e.phase));
      if (t && e.kind === 'bird') {
        var frames = skyAll.day.motion.bird_frames, beat = (t + e.flap) % (FLAPS_MS + GLIDE_MS);
        dx = Math.round(e.drift * Math.sin(t / e.period + e.phase));
        if (beat < FLAPS_MS) {
          var f = Math.floor(beat / FLAP_MS) % 4;   // up, level, down, level
          name = frames[f === 3 ? 1 : f];
          if (f === 2) dy = -e.bob;   // the downstroke lifts the bird
        } else {
          name = frames[1];   // glide
        }
      }
      if (t && e.kind === 'spark' && (t + e.phase) % e.period < 280) {
        g.fillStyle = e.colour;
        g.fillRect(e.x + 1, e.y + 1, 1, 1);   // twinkle: just the centre for a moment
        return;
      }
      g.drawImage(sprite(name), e.x + dx, e.y + dy);
    });
  }
  function animateSky() {
    var run = sky.scene && sky.theme === 'day' && sky.visible && !document.hidden && !reduceMotion.matches;
    if (run && !sky.timer) {
      var t0 = performance.now() - sky.t;
      (function tick() {
        sky.t = Math.max(1, performance.now() - t0);
        paintSky(sky.t);
        sky.timer = setTimeout(tick, 100);
      })();
    } else if (!run && sky.timer) {
      clearTimeout(sky.timer);
      sky.timer = null;
    }
  }
  if (hero && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      sky.visible = entries[entries.length - 1].isIntersecting;
      animateSky();
    }).observe(hero);
  }

  /* ---------------------------------------------------------------- parallax */
  var layers = hero ? Array.prototype.slice.call(hero.querySelectorAll('[data-depth]')) : [];
  var locals = Array.prototype.slice.call(document.querySelectorAll('[data-depth-local]'));
  var ridge = document.querySelector('[data-ridge]');
  var pointer = { x: 0, y: 0 };
  var ticking = false;

  function frame() {
    ticking = false;
    var y = window.scrollY || window.pageYOffset;
    var still = reduceMotion.matches;
    if (hero) {
      var hh = hero.offsetHeight;
      if (y < hh + 200) {
        layers.forEach(function (el) {
          var d = parseFloat(el.getAttribute('data-depth')) || 0;
          var ty = still ? 0 : Math.round(y * d);
          if (el.classList.contains('layer')) {
            var cell = parseInt(hero.style.getPropertyValue('--s'), 10) || 1;
            ty = Math.round(ty / cell) * cell; // whole pixel-art cells only
          }
          var tx = still ? 0 : Math.round(pointer.x * (1 - d) * -18);
          el.style.transform = 'translate3d(' + tx + 'px,' + ty + 'px,0)';
        });
      }
    }
    var vh = window.innerHeight;
    locals.forEach(function (el) {
      var r = el.getBoundingClientRect();
      var centre = r.top + r.height / 2 - vh / 2;
      var d = parseFloat(el.getAttribute('data-depth-local')) || 0;
      var base = el.classList.contains('tilt-a') ? 'rotate(-3deg) ' : el.classList.contains('tilt-b') ? 'rotate(4deg) ' : '';
      var ty = still ? 0 : Math.round(centre * d);
      el.style.transform = base + 'translate3d(0,' + ty + 'px,0)';
    });
    if (ridge) {
      var rs = parseInt(getComputedStyle(root).getPropertyValue('--rs'), 10) || 3;
      var off = still ? 0 : Math.round((y * 0.25) / rs) * rs; // move in whole cells
      ridge.style.backgroundPosition = (-off) + 'px bottom';
    }
  }
  function request() { if (!ticking) { ticking = true; window.requestAnimationFrame(frame); } }

  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', function () { setScales(); request(); });
  window.addEventListener('pointermove', function (e) {
    if (e.pointerType !== 'mouse') return;
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
    request();
  }, { passive: true });

  /* ---------------------------------------------------------------- logo player
     The hero and studio logos share one player on a 57x70-cell canvas (the stacked lockup plus a 1-cell gutter): the
     kit's intro, played a little slower, then idles. After a random gap it plays a weighted variant for the current
     theme (lively by day; sleepy by night, when the controller dozes off) and returns to the rest pose, which is the
     intro's last frame. Off-screen logos and hidden pages wait; reduced motion shows the rest pose only. */
  var INTRO_SLOWDOWN = 1.5;
  var logoAssets = null;
  function loadImage(src) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = reject;
      img.src = src;
    });
  }
  function loadLogoAssets() {
    if (!logoAssets) {
      var base = '/assets/brand/intro/';
      var json = function (f) {
        return fetch(base + f).then(function (r) { if (!r.ok) throw new Error(f); return r.json(); });
      };
      logoAssets = Promise.all([
        json('toyling-intro.json'), json('toyling-idle.json'),
        loadImage(base + 'toyling-intro-sheet-light@1x.png'), loadImage(base + 'toyling-intro-sheet-dark@1x.png'),
        loadImage(base + 'toyling-idle-sheet-light@1x.png'), loadImage(base + 'toyling-idle-sheet-dark@1x.png')
      ]).then(function (a) {
        return { intro: a[0], idle: a[1], sheets: { intro: { day: a[2], night: a[3] }, idle: { day: a[4], night: a[5] } } };
      });
    }
    return logoAssets;
  }

  function logoPlayer(canvas, opts) {
    var ctx = canvas.getContext('2d');
    var A = null, timer = null, mode = 'rest', shown = null, lastVariant = '';
    var visible = !('IntersectionObserver' in window);
    function draw(kind, rect) {
      shown = [kind, rect];
      if (canvas.width !== rect.w || canvas.height !== rect.h) { canvas.width = rect.w; canvas.height = rect.h; }
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(A.sheets[kind][currentTheme()], rect.x, rect.y, rect.w, rect.h, 0, 0, rect.w, rect.h);
      if (opts.onLive) { opts.onLive(); opts.onLive = null; }
    }
    function stop() { if (timer) { clearTimeout(timer); timer = null; } }
    function rest() { stop(); mode = 'rest'; draw('idle', A.idle.frames[A.idle.meta.rest]); }
    function run(steps, after) {
      stop();
      var i = 0;
      (function next() {
        if (i >= steps.length) { timer = null; after(); return; }
        var st = steps[i++];
        draw(st[0], st[1]);
        timer = setTimeout(next, st[2]);
      })();
    }
    function waiting() { return reduceMotion.matches || document.hidden || !visible; }
    function scheduleIdle() {
      if (!A || mode !== 'rest') return;   // never cuts an intro or a variant short
      stop();
      if (waiting()) return;
      var gap = A.idle.meta.gap_ms[currentTheme()];
      timer = setTimeout(playVariant, gap[0] + Math.random() * (gap[1] - gap[0]));
    }
    function pick() {
      var list = A.idle.variants[currentTheme()], total = 0, i, r, tries;
      list.forEach(function (v) { total += v.weight; });
      for (tries = 0; tries < 3; tries++) {   // rarely the same variant twice in a row
        r = Math.random() * total;
        for (i = 0; i < list.length - 1; i++) { r -= list[i].weight; if (r < 0) break; }
        if (list[i].name !== lastVariant) break;
      }
      lastVariant = list[i].name;
      return list[i];
    }
    function playVariant() {
      timer = null;
      if (waiting()) return;
      mode = 'idle';
      run(pick().frames.map(function (f) { return ['idle', A.idle.frames[f[0]], f[1]]; }),
          function () { rest(); scheduleIdle(); });
    }
    function intro() {
      if (!A) return;
      if (reduceMotion.matches) { rest(); return; }
      mode = 'intro';
      run(A.intro.frames.map(function (f) { return ['intro', f.frame, Math.round(f.duration * INTRO_SLOWDOWN)]; }),
          function () { rest(); scheduleIdle(); });
    }
    function settle() { if (A && mode !== 'rest') rest(); }
    var pendingIntro = false;   // opened in a background tab: hold the intro until the page is shown
    loadLogoAssets().then(function (assets) {
      A = assets;
      if (opts.autoIntro && opts.autoIntro()) {
        if (document.hidden) { pendingIntro = true; rest(); } else intro();
      } else { rest(); scheduleIdle(); }
    }).catch(function () { if (opts.onFail) opts.onFail(); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[entries.length - 1].isIntersecting;
        if (!A) return;
        if (!visible && mode === 'idle') settle();
        else if (visible && mode === 'rest' && !timer) scheduleIdle();
      }, { threshold: 0.25 }).observe(canvas);
    }
    return {
      intro: intro,
      skip: function () { if (mode === 'intro') { rest(); scheduleIdle(); } },
      themeChanged: function () {
        if (!A) return;
        if (mode === 'intro') draw(shown[0], shown[1]);   // keep playing, in the other colourway
        else { rest(); scheduleIdle(); }
      },
      pageChanged: function () {
        if (!A) return;
        if (document.hidden) { settle(); stop(); return; }
        if (pendingIntro) { pendingIntro = false; if (opts.autoIntro()) { intro(); return; } }
        scheduleIdle();
      },
      motionChanged: function () {
        if (!A) return;
        if (reduceMotion.matches) settle(); else scheduleIdle();
      }
    };
  }

  var heroLogo = hero ? hero.querySelector('.hero-logo') : null;
  var heroCanvas = heroLogo ? heroLogo.querySelector('canvas') : null;
  if (heroCanvas && heroCanvas.getContext && window.Promise && window.fetch) {
    players.push(logoPlayer(heroCanvas, {
      // the hero plays the intro when it is on screen at load; otherwise the logo just idles
      autoIntro: function () { var r = heroCanvas.getBoundingClientRect(); return r.bottom > 0 && r.top < window.innerHeight; },
      onLive: function () { heroLogo.classList.add('is-live'); },
      onFail: function () { heroLogo.classList.add('is-static'); }
    }));
  } else if (heroLogo) {
    heroLogo.classList.add('is-static');
  }
  var studioCanvas = document.querySelector('[data-intro]');
  if (studioCanvas && studioCanvas.getContext && window.Promise && window.fetch) {
    var studio = logoPlayer(studioCanvas, {});
    players.push(studio);
    studioCanvas.addEventListener('click', studio.skip);
    var replay = document.querySelector('[data-intro-replay]');
    if (replay) replay.addEventListener('click', studio.intro);
  }

  document.addEventListener('visibilitychange', function () {
    players.forEach(function (p) { p.pageChanged(); });
    animateSky();
  });
  if (reduceMotion.addEventListener) {
    reduceMotion.addEventListener('change', function () {
      players.forEach(function (p) { p.motionChanged(); });
      if (sky.scene) paintSky(reduceMotion.matches ? 0 : sky.t);
      animateSky();
      request();
    });
  }

  applyTheme(currentTheme(), false);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { setScales(); request(); });
})();
