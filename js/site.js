/* Toyling Games — theme, integer-scaled pixel art, parallax and the studio intro player. */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

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
    if (intro) intro.redraw();
    if (typeof setScales === 'function') { setScales(); request(); }
  }
  document.querySelectorAll('[data-theme-toggle]').forEach(function (b) {
    b.addEventListener('click', function () { applyTheme(currentTheme() === 'night' ? 'day' : 'night', true); });
  });

  /* ---------------------------------------------------------------- integer scales */
  var hero = document.querySelector('[data-hero]');
  function setScales() {
    if (hero) {
      var header = document.querySelector('.site-header');
      var vh = Math.max(600, window.innerHeight - (header ? header.offsetHeight : 0));
      var s = Math.max(2, Math.min(12, Math.round(vh / 180)));
      hero.style.setProperty('--s', s);
      var content = hero.querySelector('.hero-content');
      var logo = content ? content.querySelector(currentTheme() === 'night' ? '.hero-logo.night-only' : '.hero-logo.day-only') : null;
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
    }
    var rs = window.innerWidth < 560 ? 2 : 3;
    root.style.setProperty('--rs', rs);
    buildSky();
  }

  /* ---------------------------------------------------------------- night sky
     Redraws the kit's star list at 1 px per cell (the layer CSS scales it like every other layer).
     Stars that would touch the hero copy (plus 2 cells) are dropped whole; the constellation moves to
     its reserved alternate spot below the Ida summit when its primary spot is covered. */
  var skyData = window.TOYLING_SKY || null;
  var skyLayer = hero ? hero.querySelector('.layer-sky') : null;
  var narrowMQ = window.matchMedia('(max-width: 700px)');
  var skyKey = '';
  function buildSky() {
    if (!skyLayer || !skyData) return;
    if (currentTheme() !== 'night') { skyLayer.style.backgroundImage = ''; skyKey = ''; return; }
    var s = parseInt(hero.style.getPropertyValue('--s'), 10) || 1;
    var W = skyData.grid_cells[0], H = skyData.grid_cells[1], tile = W * s;
    var left = skyLayer.offsetLeft, lw = skyLayer.offsetWidth;
    var ox = left + (lw - tile) / 2 + (narrowMQ.matches ? 48 * s : 0);   // mirrors background-position
    var oy = skyLayer.offsetTop + skyLayer.offsetHeight - H * s;
    var m = 2 * s, boxes = [];
    var content = hero.querySelector('.hero-content');
    if (content) {
      // the copy drifts against the sky while scrolling (different depths): clear its whole path
      var rel = ((parseFloat(skyLayer.getAttribute('data-depth')) || 0) -
                 (parseFloat(content.getAttribute('data-depth')) || 0)) * (hero.offsetHeight + 200);
      var up = Math.max(0, Math.ceil(rel)), down = Math.max(0, Math.ceil(-rel));
      Array.prototype.forEach.call(content.children, function (el) {
        if (el.offsetWidth < 4 || el.offsetHeight < 4) return;
        var x = content.offsetLeft + el.offsetLeft, y = content.offsetTop + el.offsetTop;
        boxes.push([x - m, y - m - up, x + el.offsetWidth + m, y + el.offsetHeight + m + down]);
      });
    }
    var key = [s, left, lw, ox, oy, boxes.join(';')].join('|');
    if (key === skyKey) return;
    skyKey = key;

    function covered(cx, cy, cells) {
      var x0c = 0, x1c = 0, y0c = 0, y1c = 0;
      cells.forEach(function (d) {
        x0c = Math.min(x0c, d[0]); x1c = Math.max(x1c, d[0]); y0c = Math.min(y0c, d[1]); y1c = Math.max(y1c, d[1]);
      });
      var y0 = oy + (cy + y0c) * s, y1 = oy + (cy + y1c + 1) * s;
      for (var k = Math.floor((left - ox) / tile) - 1; k <= Math.ceil((left + lw - ox) / tile); k++) {
        var x0 = ox + (cx + x0c + k * W) * s, x1 = ox + (cx + x1c + 1 + k * W) * s;
        if (x1 <= left || x0 >= left + lw) continue;
        for (var i = 0; i < boxes.length; i++) {
          var b = boxes[i];
          if (x0 < b[2] && x1 > b[0] && y0 < b[3] && y1 > b[1]) return true;
        }
      }
      return false;
    }

    var canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    var g = canvas.getContext('2d');
    function draw(cx, cy, cells, colour) {
      g.fillStyle = colour;
      cells.forEach(function (d) { g.fillRect(cx + d[0], cy + d[1], 1, 1); });
    }
    skyData.stars.forEach(function (st) {
      var cells = skyData.cells[st[2]];
      if (!covered(st[0], st[1], cells)) draw(st[0], st[1], cells, st[3]);
    });
    var con = skyData.constellation, group = [];
    con.pattern.forEach(function (pt) {
      skyData.cells[pt[2]].forEach(function (d) { group.push([pt[0] + d[0], pt[1] + d[1]]); });
    });
    var spots = [con.primary, con.alternate];
    for (var i = 0; i < spots.length; i++) {
      var sp = spots[i];
      if (sp && !covered(sp[0], sp[1], group)) {
        con.pattern.forEach(function (pt) { draw(sp[0] + pt[0], sp[1] + pt[1], skyData.cells[pt[2]], pt[3]); });
        break;
      }
    }
    skyLayer.style.backgroundImage = 'url(' + canvas.toDataURL('image/png') + ')';
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
  if (reduceMotion.addEventListener) reduceMotion.addEventListener('change', request);

  /* ---------------------------------------------------------------- intro player */
  var intro = null;
  var canvas = document.querySelector('[data-intro]');
  if (canvas) {
    intro = (function () {
      var ctx = canvas.getContext('2d');
      var meta = null, idx = 0, timer = null, idleTimer = null, played = false, playing = false;
      var sheets = { day: new Image(), night: new Image() };
      sheets.day.src = '/assets/brand/intro/toyling-intro-sheet-light@1x.png';
      sheets.night.src = '/assets/brand/intro/toyling-intro-sheet-dark@1x.png';
      function sheet() { return sheets[currentTheme()]; }
      function draw(i) {
        if (!meta) return;
        var f = meta.frames[i].frame;
        var img = sheet();
        if (!img.complete) { img.onload = function () { draw(i); }; return; }
        if (canvas.width !== f.w) { canvas.width = f.w; canvas.height = f.h; }
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, f.x, f.y, f.w, f.h, 0, 0, f.w, f.h);
      }
      function last() { return meta.frames.length - 1; }
      function frameIndex(label) {
        for (var i = 0; i < meta.frames.length; i++) if (meta.frames[i].label === label) return i;
        return last();
      }
      function stop() {
        if (timer) { clearTimeout(timer); timer = null; }
        if (idleTimer) { clearTimeout(idleTimer); idleTimer = null; }
        playing = false;
      }
      function idle() {
        // idle loop: blink every few seconds (skipped for reduced motion or hidden pages)
        if (reduceMotion.matches || document.hidden) return;
        idleTimer = setTimeout(function () {
          var b = frameIndex('blink');
          draw(b);
          idleTimer = setTimeout(function () { draw(last()); idle(); }, meta.frames[b].duration);
        }, 2600 + Math.round(Math.random() * 1600));
      }
      function finish() { stop(); idx = last(); draw(idx); idle(); }
      function play() {
        if (!meta) return;
        stop();
        if (reduceMotion.matches) { finish(); return; }
        playing = true;
        idx = 0;
        (function step() {
          draw(idx);
          var dur = meta.frames[idx].duration;
          if (idx < last()) { idx += 1; timer = setTimeout(step, dur); }
          else { playing = false; idle(); }
        })();
      }
      fetch('/assets/brand/intro/toyling-intro.json').then(function (r) { return r.json(); }).then(function (m) {
        meta = m;
        idx = last();
        draw(idx);
        if ('IntersectionObserver' in window) {
          var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (e) { if (e.isIntersecting && !played) { played = true; play(); } });
          }, { threshold: 0.6 });
          io.observe(canvas);
        }
      }).catch(function () {});
      canvas.addEventListener('click', function () { if (playing) finish(); });
      var replay = document.querySelector('[data-intro-replay]');
      if (replay) replay.addEventListener('click', play);
      document.addEventListener('visibilitychange', function () { if (document.hidden && meta) finish(); });
      return { redraw: function () { draw(idx); }, play: play };
    })();
  }

  applyTheme(currentTheme(), false);
  setScales();
  request();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { setScales(); request(); });
})();
