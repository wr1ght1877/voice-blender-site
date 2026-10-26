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
    VB.drawMascot(cx, bot, size / 2, size / 2, size * 0.28, { lookY: 0.2 });
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
  setTimeout(function () { if (!VB.heroMode) VB.useFallback('3D did not start'); }, 6000);
})();
