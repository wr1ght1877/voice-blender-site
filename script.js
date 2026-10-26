/* Voice Blender starter site: hero vortex + mascots. No dependencies. */
(function () {
  'use strict';

  var BOTS = [
    { name: 'M&M',       color: '#2f8bff', shape: 'ball' },
    { name: 'Hollywood', color: '#ff3dc8', shape: 'star' },
    { name: 'Scalper',   color: '#2ee86f', shape: 'square' },
    { name: 'Ledger',    color: '#ffa424', shape: 'diamond' },
    { name: 'Grok Bot',  color: '#9b5cff', shape: 'cloud' }
  ];

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Mascots ---------- */
  function shapePath(ctx, shape, s) {
    ctx.beginPath();
    if (shape === 'ball') {
      ctx.arc(0, 0, s, 0, Math.PI * 2);
    } else if (shape === 'star') {
      var R = s * 1.25, k = s * 0.34;
      ctx.moveTo(0, -R);
      ctx.quadraticCurveTo(k, -k, R, 0);
      ctx.quadraticCurveTo(k, k, 0, R);
      ctx.quadraticCurveTo(-k, k, -R, 0);
      ctx.quadraticCurveTo(-k, -k, 0, -R);
    } else if (shape === 'square') {
      roundRect(ctx, -s * 0.92, -s * 0.92, s * 1.84, s * 1.84, s * 0.46);
    } else if (shape === 'diamond') {
      ctx.save(); ctx.rotate(Math.PI / 4);
      roundRect(ctx, -s * 0.82, -s * 0.82, s * 1.64, s * 1.64, s * 0.38);
      ctx.restore();
    } else if (shape === 'cloud') {
      ctx.moveTo(-s * 0.95, s * 0.55);
      ctx.arc(-s * 0.6, s * 0.18, s * 0.5, Math.PI * 0.75, Math.PI * 1.55);
      ctx.arc(0, -s * 0.15, s * 0.68, Math.PI * 1.1, Math.PI * 1.95);
      ctx.arc(s * 0.62, s * 0.18, s * 0.48, Math.PI * 1.45, Math.PI * 0.3);
      ctx.quadraticCurveTo(s * 0.9, s * 0.62, s * 0.55, s * 0.62);
      ctx.lineTo(-s * 0.6, s * 0.62);
      ctx.quadraticCurveTo(-s * 1.0, s * 0.62, -s * 0.95, s * 0.55);
      ctx.closePath();
    }
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawMascot(ctx, bot, x, y, s, opts) {
    opts = opts || {};
    var lookX = opts.lookX || 0, lookY = opts.lookY || 0, blink = opts.blink || 0, tilt = opts.tilt || 0;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tilt);
    // glow
    ctx.shadowColor = bot.color;
    ctx.shadowBlur = s * 1.1;
    shapePath(ctx, bot.shape, s);
    ctx.fillStyle = bot.color;
    ctx.fill();
    ctx.shadowBlur = 0;
    // soft top highlight (flat look, just a hint)
    var g = ctx.createLinearGradient(0, -s, 0, s);
    g.addColorStop(0, 'rgba(255,255,255,0.28)');
    g.addColorStop(0.55, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    shapePath(ctx, bot.shape, s);
    ctx.fill();
    // eyes
    var ey = bot.shape === 'cloud' ? s * 0.12 : -s * 0.06;
    var ex = s * 0.3, ew = s * 0.2, eh = s * 0.27 * (1 - blink * 0.92);
    for (var i = -1; i <= 1; i += 2) {
      ctx.beginPath();
      ctx.ellipse(i * ex, ey, ew, Math.max(eh, s * 0.02), 0, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
      if (blink < 0.6) {
        ctx.beginPath();
        ctx.arc(i * ex + lookX * ew * 0.35, ey + lookY * eh * 0.3 + eh * 0.15, ew * 0.48, 0, Math.PI * 2);
        ctx.fillStyle = '#0b1030';
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // Bot cards
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  Array.prototype.forEach.call(document.querySelectorAll('canvas.mascot'), function (c) {
    var bot = BOTS[+c.getAttribute('data-bot')];
    var size = 120;
    c.width = size * dpr; c.height = size * dpr;
    var cx = c.getContext('2d');
    cx.scale(dpr, dpr);
    drawMascot(cx, bot, size / 2, size / 2, size * 0.28, { lookY: 0.2 });
  });

  // Mobile nav
  var toggle = document.querySelector('.nav-toggle');
  var links = document.getElementById('nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      var open = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    links.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') { links.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); }
    });
  }

  /* ---------- Hero vortex ---------- */
  var canvas = document.getElementById('vortex');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  var W = 0, H = 0, S = 0, CX = 0, CY = 0, particles = [], running = false, visible = true;

  // pre-rendered glow sprites
  function sprite(rgb) {
    var c = document.createElement('canvas'); c.width = c.height = 32;
    var g = c.getContext('2d');
    var gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.18, 'rgba(' + rgb + ',0.95)');
    gr.addColorStop(0.5, 'rgba(' + rgb + ',0.25)');
    gr.addColorStop(1, 'rgba(' + rgb + ',0)');
    g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
    return c;
  }
  var SPRITES = [sprite('90,160,255'), sprite('60,120,255'), sprite('140,210,255'), sprite('110,130,255')];

  function rand(a, b) { return a + Math.random() * (b - a); }

  function newParticle(p, fresh) {
    p.side = p.side || (Math.random() < 0.5 ? 1 : -1);
    p.R = S * 1.15;
    p.r = fresh ? Math.pow(Math.random(), 0.7) * p.R : p.R * rand(0.85, 1);
    p.th = rand(0, Math.PI * 2);
    p.v = rand(0.35, 1);
    p.size = rand(0.6, 1.6) * (Math.random() < 0.04 ? 3.2 : 1);
    p.spr = SPRITES[(Math.random() * SPRITES.length) | 0];
    return p;
  }

  function resize() {
    var rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = rect.width; H = rect.height;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    S = Math.min(W * 0.5, H * 0.42);
    CX = W / 2;
    CY = H * (W < 720 ? 0.38 : 0.4);
    var n = Math.round(Math.min(1700, Math.max(500, W * H / 900)));
    particles = [];
    for (var i = 0; i < n; i++) {
      var p = newParticle({ side: i % 2 ? 1 : -1 }, true);
      particles.push(p);
    }
    if (!running) draw(reduceMotion ? 6 : lastT);
  }

  // funnel height for radius r (vortex opening away from the mouth)
  function funnel(r) { var u = r / (S * 1.15); return S * 0.95 * Math.pow(u, 1.35); }

  function drawParticles(dt) {
    ctx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      if (dt) {
        var u = p.r / p.R;
        p.th += dt * p.v * (0.25 + 0.9 / (u * 6 + 0.6)) * p.side;
        p.r -= dt * p.v * S * 0.05 * (0.4 + u);
        if (p.r < S * 0.03) newParticle(p, false);
      }
      var u2 = p.r / p.R;
      var x = CX + Math.cos(p.th) * p.r;
      var depth = Math.sin(p.th);           // + = toward camera
      var y = CY - p.side * (funnel(p.r) - depth * p.r * 0.22);
      var a = Math.min(1, (1 - u2) * 2.2) * (0.35 + 0.65 * Math.min(1, u2 * 4));
      var near = depth > 0.6 && u2 > 0.55;   // fake depth of field: big soft particles near camera
      var sz = p.size * (near ? 3.2 : 1) * (2.2 + u2 * 3);
      ctx.globalAlpha = a * (near ? 0.35 : 0.9);
      ctx.drawImage(p.spr, x - sz, y - sz, sz * 2, sz * 2);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  function drawCore(t) {
    var pulse = 1 + Math.sin(t * 0.9) * 0.08;
    var g = ctx.createRadialGradient(CX, CY, 0, CX, CY, S * 0.38 * pulse);
    g.addColorStop(0, 'rgba(210,230,255,0.75)');
    g.addColorStop(0.12, 'rgba(90,150,255,0.45)');
    g.addColorStop(0.45, 'rgba(40,70,200,0.12)');
    g.addColorStop(1, 'rgba(10,20,80,0)');
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(CX, CY, S * 0.38 * pulse, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }

  function drawFigure() {
    var h = Math.max(26, S * 0.15);       // tiny figure
    var headR = h * 0.12;
    var hx = CX, hy = CY - headR * 0.35;  // mouth sits at the vortex center
    ctx.save();
    ctx.shadowColor = 'rgba(120,180,255,0.95)';
    ctx.shadowBlur = h * 0.18;
    ctx.fillStyle = '#01030c';
    ctx.beginPath(); ctx.arc(hx, hy, headR, 0, Math.PI * 2); ctx.fill();
    // neck + body
    var top = hy + headR * 0.9, sw = h * 0.17;
    ctx.beginPath();
    ctx.moveTo(hx - headR * 0.35, top);
    ctx.lineTo(hx + headR * 0.35, top);
    ctx.quadraticCurveTo(hx + sw, top + h * 0.03, hx + sw, top + h * 0.12);
    ctx.lineTo(hx + sw * 0.78, top + h * 0.45);
    ctx.lineTo(hx + sw * 0.5, top + h * 0.47);
    ctx.lineTo(hx + sw * 0.55, top + h * 0.86);
    ctx.lineTo(hx + sw * 0.12, top + h * 0.86);
    ctx.lineTo(hx, top + h * 0.5);
    ctx.lineTo(hx - sw * 0.12, top + h * 0.86);
    ctx.lineTo(hx - sw * 0.55, top + h * 0.86);
    ctx.lineTo(hx - sw * 0.5, top + h * 0.47);
    ctx.lineTo(hx - sw * 0.78, top + h * 0.45);
    ctx.lineTo(hx - sw, top + h * 0.12);
    ctx.quadraticCurveTo(hx - sw, top + h * 0.03, hx - headR * 0.35, top);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // White spiky voice-prompt waveform rising out of the mouth
  function drawVoice(t) {
    var mouthY = CY;
    var baseY = CY - S * 0.3;
    var w = Math.min(S * 0.62, W * 0.7);
    // rising stem of light from the mouth
    var sg = ctx.createLinearGradient(0, mouthY, 0, baseY);
    sg.addColorStop(0, 'rgba(255,255,255,0.9)');
    sg.addColorStop(1, 'rgba(255,255,255,0.15)');
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = sg; ctx.lineWidth = Math.max(1, S * 0.004);
    ctx.shadowColor = '#9cc4ff'; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.moveTo(CX, mouthY - 2); ctx.lineTo(CX, baseY); ctx.stroke();
    // small rising pulses along the stem
    for (var k = 0; k < 3; k++) {
      var ph = ((t * 0.35 + k / 3) % 1);
      var py = mouthY - (mouthY - baseY) * ph;
      ctx.globalAlpha = (1 - ph) * 0.9;
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(CX, py, Math.max(1.2, S * 0.006), 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // spiky waveform (mirrored bars, tallest in the middle)
    var bars = W < 720 ? 29 : 41, gap = w / bars;
    ctx.fillStyle = '#fff'; ctx.shadowColor = 'rgba(150,200,255,1)'; ctx.shadowBlur = 14;
    for (var i = 0; i < bars; i++) {
      var x = CX - w / 2 + gap * (i + 0.5);
      var d = Math.abs(i - (bars - 1) / 2) / ((bars - 1) / 2);
      var env = Math.pow(1 - d, 1.6);
      var n = 0.55 + 0.45 * Math.sin(t * 1.6 + i * 1.7) * Math.sin(t * 0.7 + i * 0.6);
      var amp = S * 0.11 * env * n + S * 0.006;
      var bw = Math.max(1.2, gap * 0.38);
      ctx.fillRect(x - bw / 2, baseY - amp, bw, amp * 2);
    }
    ctx.restore();
  }

  // Colored streams swirling out of the mouth, with a bot riding each
  function streamPoint(i, tt, t) {
    var base = i * (Math.PI * 2 / BOTS.length);
    var a = base + tt * 2.4 + t * 0.12;
    var r = Math.pow(tt, 0.9) * S * 1.02;
    return { x: CX + Math.cos(a) * r, y: CY + Math.sin(a) * r * 0.42, a: a };
  }

  function drawStreams(t) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (var i = 0; i < BOTS.length; i++) {
      var bot = BOTS[i];
      var steps = 60;
      for (var pass = 0; pass < 2; pass++) {
        ctx.strokeStyle = bot.color;
        ctx.shadowColor = bot.color;
        ctx.shadowBlur = pass ? 4 : 18;
        ctx.globalAlpha = pass ? 0.95 : 0.45;
        var prev = streamPoint(i, 0, t);
        for (var s = 1; s <= steps; s++) {
          var tt = s / steps;
          var p = streamPoint(i, tt, t);
          // wavy ripple along the line
          var wob = Math.sin(tt * 18 - t * 2 + i) * S * 0.012 * tt;
          p.y += wob;
          ctx.lineWidth = (pass ? 1.2 : 4) * (0.5 + tt * 1.6) * Math.max(1, S / 300);
          ctx.globalAlpha = (pass ? 0.95 : 0.4) * Math.min(1, tt * 5) * (1 - Math.pow(tt, 6) * 0.9);
          ctx.beginPath(); ctx.moveTo(prev.x, prev.y); ctx.lineTo(p.x, p.y); ctx.stroke();
          prev = p;
        }
      }
    }
    ctx.restore();
  }

  function drawBots(t) {
    var list = [];
    for (var i = 0; i < BOTS.length; i++) {
      var tt = 0.8 + Math.sin(t * 0.35 + i * 1.3) * 0.07;
      var p = streamPoint(i, tt, t);
      p.y += Math.sin(tt * 18 - t * 2 + i) * S * 0.012 * tt;
      var depth = Math.sin(p.a); // + = front
      // peel off: lift slightly away from the stream
      var lift = (0.5 + 0.5 * Math.sin(t * 0.5 + i * 2.1)) * S * 0.05;
      list.push({ i: i, x: p.x, y: p.y - lift, depth: depth, a: p.a });
    }
    list.sort(function (a, b) { return a.depth - b.depth; });
    for (var k = 0; k < list.length; k++) {
      var b = list[k];
      var s = Math.max(11, S * 0.07) * (0.82 + 0.25 * (b.depth + 1) / 2);
      var blinkPh = (t * 0.25 + b.i * 0.37) % 1;
      var blink = blinkPh < 0.03 ? Math.sin(blinkPh / 0.03 * Math.PI) : 0;
      drawMascot(ctx, BOTS[b.i], b.x, b.y, s, {
        lookX: -Math.cos(b.a) * 0.8, lookY: -Math.sin(b.a) * 0.4 + 0.2,
        blink: blink, tilt: Math.sin(t * 0.8 + b.i) * 0.12
      });
    }
  }

  var lastT = 0, lastNow = 0;
  function draw(t, dt) {
    ctx.clearRect(0, 0, W, H);
    drawCore(t);
    drawParticles(dt || 0);
    drawFigure();
    drawStreams(t);
    drawVoice(t);
    drawBots(t);
  }

  function frame(now) {
    if (!running) return;
    var dt = lastNow ? Math.min(0.05, (now - lastNow) / 1000) : 0;
    lastNow = now;
    lastT += dt;
    draw(lastT, dt);
    requestAnimationFrame(frame);
  }

  function start() {
    if (reduceMotion || running || !visible || document.hidden) return;
    running = true; lastNow = 0; requestAnimationFrame(frame);
  }
  function stop() { running = false; }

  window.addEventListener('resize', function () { resize(); });
  document.addEventListener('visibilitychange', function () { document.hidden ? stop() : start(); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      visible ? start() : stop();
    }).observe(canvas);
  }

  resize();
  if (reduceMotion) {
    draw(6, 0); // still frame, no loop
  } else {
    start();
  }
})();
