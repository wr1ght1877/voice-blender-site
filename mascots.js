/* Voice Blender: shared bot data + flat mascot drawing (2D canvas). */
(function () {
  'use strict';

  var BOTS = [
    { name: 'Researcher', color: '#2f8bff', shape: 'ball' },
    { name: 'Writer',    color: '#ff3dc8', shape: 'star' },
    { name: 'Assistant', color: '#2ee86f', shape: 'square' },
    { name: 'Builder',   color: '#ffa424', shape: 'diamond' },
    { name: 'Planner',   color: '#9b5cff', shape: 'cloud' }
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

  function pill(ctx, x, y, w, h) {
    var r = Math.min(w, h) / 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /* 3D toy-style renders of each bot (made with the same builder as the opening tornado, vbscene.js).
     Each PNG spans 2.8 x the mascot size `s`; until they load we fall back to the flat drawing below. */
  var IMGS = [], pending = BOTS.length, ready = [];
  BOTS.forEach(function (bot, i) {
    var im = new Image();
    im.onload = im.onerror = function () { if (--pending === 0) { ready.forEach(function (f) { f(); }); ready = []; } };
    im.src = 'assets/bots/bot-' + i + '.png';
    IMGS[i] = im; bot.img = im;
  });
  function onImagesReady(f) { if (pending === 0) f(); else ready.push(f); }

  function drawMascot(ctx, bot, x, y, s, opts) {
    opts = opts || {};
    var im = bot.img;
    if (im && im.complete && im.naturalWidth) {
      var w = s * 2.8;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(opts.tilt || 0);
      ctx.shadowColor = bot.color;
      ctx.shadowBlur = s * 1.1;
      ctx.drawImage(im, -w / 2, -w / 2, w, w);
      ctx.restore();
      return;
    }
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
    // eyes: sideways white pills
    var cl = bot.shape === 'cloud';
    var ey = cl ? s * 0.02 : -s * 0.16, ex = cl ? s * 0.28 : s * 0.36;
    var ew = s * 0.42, eh = Math.max(s * 0.25 * (1 - blink * 0.9), s * 0.03);
    ctx.fillStyle = '#fff';
    for (var i = -1; i <= 1; i += 2) {
      pill(ctx, i * ex + lookX * s * 0.03 - ew / 2, ey + lookY * s * 0.03 - eh / 2, ew, eh);
      ctx.fill();
    }
    // glowing sound-wave mouth
    var my = cl ? s * 0.36 : s * 0.3, bw = s * 0.075, gap = s * 0.05, hs = [0.32, 0.62, 1, 0.7, 0.4];
    ctx.shadowColor = 'rgba(255,255,255,0.8)';
    ctx.shadowBlur = s * 0.12;
    for (var j = 0; j < 5; j++) {
      var bh = s * 0.3 * hs[j];
      pill(ctx, (j - 2) * (bw + gap) - bw / 2, my - bh / 2, bw, bh);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    ctx.restore();
  }


  window.VB = window.VB || {};
  window.VB.BOTS = BOTS;
  window.VB.drawMascot = drawMascot;
  window.VB.onMascotImages = onImagesReady;
  window.VB.reduceMotion = reduceMotion;
})();
