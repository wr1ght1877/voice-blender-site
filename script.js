/* Voice Blender: page UI (nav, tilt, reveal, parallax, call mock, hero fallback). */
(function () {
  'use strict';
  var VB = window.VB || {};
  var reduce = !!VB.reduceMotion;
  var finePointer = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* Mascots on cards */
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  Array.prototype.forEach.call(document.querySelectorAll('canvas.mascot'), function (c) {
    var bot = VB.BOTS && VB.BOTS[+c.getAttribute('data-bot')];
    if (!bot || !c.getContext) return;
    var size = +c.getAttribute('width') || 120;
    c.width = size * dpr; c.height = size * dpr;
    var cx = c.getContext('2d');
    cx.scale(dpr, dpr);
    var paint = function () { cx.clearRect(0, 0, size, size); VB.drawMascot(cx, bot, size / 2, size / 2, size * 0.28, { lookY: 0.2 }); };
    paint();
    if (VB.onMascotImages) VB.onMascotImages(paint);
  });

  /* Nav: scrolled state, mobile menu, active link */
  var nav = document.getElementById('nav');
  var toggle = document.querySelector('.nav-toggle');
  var links = document.getElementById('nav-links');
  function setMenu(open) {
    links.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }
  if (toggle && links) {
    toggle.addEventListener('click', function () { setMenu(!links.classList.contains('open')); });
    links.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && links.classList.contains('open')) { setMenu(false); toggle.focus(); } });
    document.addEventListener('click', function (e) { if (links.classList.contains('open') && !e.target.closest('.nav')) setMenu(false); });
  }
  function onScrollNav() { nav.classList.toggle('scrolled', window.scrollY > 30); }
  onScrollNav();

  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.nav-links a[href^="#"]'));
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        navLinks.forEach(function (a) { a.classList.toggle('active', a.getAttribute('href') === '#' + en.target.id); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    ['what', 'how', 'features', 'bots', 'use-cases', 'pricing', 'faq', 'waitlist'].forEach(function (id) {
      var el = document.getElementById(id); if (el) io.observe(el);
    });

    /* Reveal on scroll */
    var rio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); rio.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    Array.prototype.forEach.call(document.querySelectorAll('.reveal'), function (el, i) {
      if (reduce) { el.classList.add('in'); return; }
      el.style.transitionDelay = ((i % 5) * 70) + 'ms';
      rio.observe(el);
    });
  } else {
    Array.prototype.forEach.call(document.querySelectorAll('.reveal'), function (el) { el.classList.add('in'); });
  }
  // clear stagger delay after reveal so tilt stays snappy
  document.addEventListener('transitionend', function (e) {
    if (e.target.classList && e.target.classList.contains('reveal') && e.propertyName === 'opacity') e.target.style.transitionDelay = '';
  });

  /* 3D tilt (mouse only) */
  if (!reduce && finePointer) {
    Array.prototype.forEach.call(document.querySelectorAll('[data-tilt]'), function (el) {
      var raf = 0, px = 0, py = 0;
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        px = (e.clientX - r.left) / r.width; py = (e.clientY - r.top) / r.height;
        if (raf) return;
        raf = requestAnimationFrame(function () {
          raf = 0;
          el.classList.add('hovering');
          el.style.setProperty('--ry', ((px - 0.5) * 14).toFixed(2) + 'deg');
          el.style.setProperty('--rx', ((0.5 - py) * 12).toFixed(2) + 'deg');
          el.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
          el.style.setProperty('--my', (py * 100).toFixed(1) + '%');
        });
      });
      el.addEventListener('pointerleave', function () {
        el.classList.remove('hovering');
        el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg');
      });
    });
  }

  /* Layered parallax blobs */
  var blobs = Array.prototype.slice.call(document.querySelectorAll('[data-depth]'));
  var ticking = false;
  function parallax() {
    ticking = false;
    onScrollNav();
    if (reduce) return;
    var vh = window.innerHeight;
    blobs.forEach(function (b) {
      var r = b.parentNode.getBoundingClientRect();
      var off = (r.top + r.height / 2 - vh / 2) * parseFloat(b.getAttribute('data-depth'));
      b.style.transform = 'translate3d(0,' + off.toFixed(1) + 'px,0)';
    });
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(parallax); } }, { passive: true });
  parallax();

  /* Call mock: speaking indicator moves between bots (turn-taking) */
  var tiles = document.querySelectorAll('.cm-tiles .tile');
  var caps = document.querySelectorAll('.captions li');
  var script = [ // caption index -> speaking tile (-1 = you)
    -1, 4, -1, 0, -1, 3
  ];
  function showStep(k) {
    var spk = script[k];
    Array.prototype.forEach.call(tiles, function (t) { t.classList.toggle('speaking', +t.getAttribute('data-i') === spk); });
    Array.prototype.forEach.call(caps, function (c, i) { c.classList.toggle('dim', i !== k); });
  }
  if (tiles.length && caps.length) {
    if (reduce) { showStep(5); Array.prototype.forEach.call(caps, function (c) { c.classList.remove('dim'); }); }
    else {
      var step = 0, timer = null;
      showStep(0);
      var mock = document.querySelector('.callmock');
      var run = function () { if (timer) return; timer = setInterval(function () { step = (step + 1) % script.length; showStep(step); }, 1900); };
      var halt = function () { clearInterval(timer); timer = null; };
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (en) { en[0].isIntersecting ? run() : halt(); }).observe(mock);
      } else run();
    }
  }

  /* Hero fallback: if the 3D module doesn't start (no WebGL, CDN blocked, old browser), use the 2D canvas. */
  var hero = document.querySelector('.hero');
  VB.useFallback = function (why) {
    if (VB.heroMode) return;
    VB.heroMode = '2d';
    hero.classList.add('mode-2d');
    try { VB.start2D(document.getElementById('vortex')); }
    catch (e) { hero.classList.remove('mode-2d'); hero.classList.add('mode-static'); VB.heroMode = 'static'; }
    if (window.console && why) console.info('Voice Blender hero: 2D fallback (' + why + ')');
  };
  var root = document.documentElement;
  function heroWatchdog() { setTimeout(function () { if (!VB.heroMode) VB.useFallback('3D did not start'); }, 6000); }

  /* Switch from the 3D tour to the plain page (skip link, or if the tour can't start). */
  VB.toPlain = function (why, remember) {
    if (remember) { try { localStorage.setItem('vb-plain', '1'); } catch (e) {} }
    if (root.classList.contains('plain')) return;
    if (VB.tourStop) { try { VB.tourStop(); } catch (e) {} }
    root.classList.remove('tour'); root.classList.add('plain');
    window.scrollTo(0, 0);
    if (why && window.console) console.info('Voice Blender: plain page (' + why + ')');
    if (!VB.reduceMotion && VB.startHero3d) VB.startHero3d(); else if (!VB.heroMode) VB.useFallback(VB.reduceMotion ? 'reduced motion' : 'no 3D');
    heroWatchdog();
  };
  var skip = document.getElementById('tour-skip');
  if (skip) skip.addEventListener('click', function (e) { e.preventDefault(); VB.toPlain('skipped the tour', true); var m = document.getElementById('main'); if (m) { m.setAttribute('tabindex', '-1'); m.focus({ preventScroll: true }); } });
  var take = document.getElementById('tour-take');
  if (take) take.addEventListener('click', function () { try { localStorage.removeItem('vb-plain'); } catch (e) {} });

  /* In tour mode, nav links to tour sections fly the camera to that point in the journey. */
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a || !root.classList.contains('tour') || !VB.tourGo) return;
    var id = a.getAttribute('href').slice(1);
    if (id === 'top') id = 'start';
    if (VB.tourGo(id)) e.preventDefault();
  });

  if (root.classList.contains('plain')) heroWatchdog();
  else setTimeout(function () { if (!VB.tourReady && root.classList.contains('tour')) VB.toPlain('3D tour did not start'); }, 9000);

  /* Pricing: billing period toggle (monthly / 3 / 6 / 12 months prepaid) */
  var billBtns = document.querySelectorAll('.bill-toggle button');
  function setTerm(t) {
    Array.prototype.forEach.call(billBtns, function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-term') === t ? 'true' : 'false'); });
    Array.prototype.forEach.call(document.querySelectorAll('#pricing .price[data-p1]'), function (el) {
      el.innerHTML = '$' + el.getAttribute('data-p' + t) + '<span>' + (t === '1' ? '/mo' : t === '12' ? '/year' : ' for ' + t + ' mo') + '</span>';
    });
    Array.prototype.forEach.call(document.querySelectorAll('#pricing .bill[data-b1]'), function (el) {
      el.textContent = el.getAttribute('data-b' + t);
    });
  }
  Array.prototype.forEach.call(billBtns, function (b) {
    b.addEventListener('click', function () { setTerm(b.getAttribute('data-term')); });
  });
})();

/* Hero subline types itself out on load. The full text stays in the HTML (and in a screen-reader copy while typing);
   the not-yet-typed part is kept in place but transparent, so the paragraph's height never changes. */
(function () {
  'use strict';
  var p = document.querySelector('.hero .sub');
  if (!p || !window.requestAnimationFrame) return;
  var full = p.textContent.replace(/\s+/g, ' ').trim();
  var rm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (rm || (window.VB && VB.reduceMotion) || window.scrollY > 40 || /[?&]notype\b/.test(location.search)) return;

  // schedule: steady pace with short pauses after punctuation, scaled to ~5 s total
  var times = [], t = 0, i, ch;
  for (i = 0; i < full.length; i++) {
    ch = full[i]; t += 1;
    if (ch === ',') t += 4; else if (ch === '.' || ch === '!' || ch === '?') t += 9;
    times.push(t);
  }
  var scale = 5000 / t, START = 900;

  var sr = document.createElement('span'); sr.className = 'sr-only'; sr.textContent = full;
  var vis = document.createElement('span'); vis.className = 'tw'; vis.setAttribute('aria-hidden', 'true');
  var on = document.createElement('span'), cur = document.createElement('span'), off = document.createElement('span');
  cur.className = 'tw-cur'; off.className = 'tw-off'; off.textContent = full;
  vis.appendChild(on); vis.appendChild(cur); vis.appendChild(off);
  p.textContent = ''; p.appendChild(sr); p.appendChild(vis);
  p.classList.add('typing');

  var shown = 0, t0 = 0, done = false, raf = 0;
  function set(n) { if (n === shown) return; shown = n; on.textContent = full.slice(0, n); off.textContent = full.slice(n); }
  function finish() {
    if (done) return; done = true; cancelAnimationFrame(raf); set(full.length);
    p.classList.add('typed');
    stopListening();
    setTimeout(function () { p.textContent = full; p.classList.remove('typing', 'typed'); }, 2200);   // back to plain text after the cursor fades
  }
  function step(now) {
    if (!t0) t0 = now;
    var el = (now - t0) / scale, n = shown;
    while (n < full.length && times[n] <= el) n++;
    set(n);
    if (n >= full.length) return finish();
    raf = requestAnimationFrame(step);
  }
  var evs = ['scroll', 'wheel', 'touchstart', 'pointerdown', 'keydown'];
  function early() { finish(); }
  function stopListening() { evs.forEach(function (e) { removeEventListener(e, early, { passive: true }); }); }
  evs.forEach(function (e) { addEventListener(e, early, { passive: true }); });
  setTimeout(function () { if (!done) raf = requestAnimationFrame(step); }, START);
  window.VB = window.VB || {}; VB.finishTyping = finish;
})();

/* Fixed corner buttons (Skip/Take the tour, Sound) fade out while they would cover the video player,
   and come back as soon as the player isn't under them. */
(function () {
  'use strict';
  var frame = document.querySelector('.watch-frame');
  var pills = Array.prototype.slice.call(document.querySelectorAll('.tour-skip, .tour-take, .sound-toggle'));
  if (!frame || !pills.length) return;
  var queued = false;
  function check() {
    queued = false;
    var f = frame.getBoundingClientRect();
    pills.forEach(function (el) {
      var r = el.getBoundingClientRect(), pad = 8;
      var over = r.width > 0 && r.right + pad > f.left && r.left - pad < f.right && r.bottom + pad > f.top && r.top - pad < f.bottom;
      el.classList.toggle('over-video', over);
    });
  }
  function q() { if (!queued) { queued = true; requestAnimationFrame(check); } }
  addEventListener('scroll', q, { passive: true }); addEventListener('resize', q);
  q();
})();
