/* Voice Blender: shared bot data + 2D bot drawing (canvas). */
(function () {
  'use strict';

  var BOTS = [
    { name: 'Researcher', color: '#2f8bff', shape: 'wave' },
    { name: 'Writer',    color: '#ff3dc8', shape: 'ring' },
    { name: 'Assistant', color: '#2ee86f', shape: 'drum' },
    { name: 'Builder',   color: '#ffa424', shape: 'meter' },
    { name: 'Planner',   color: '#9b5cff', shape: 'ribbon' }
  ];

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Bots (sound-wave look) ---------- */
  /* Flat fallback: a little sound-wave in the bot's color with a bright core (used until the 3D renders load). */
  var WAVES = [
    [0.35, 0.6, 0.85, 1.0, 0.85, 0.6, 0.35],
    [0.5, 0.8, 0.5, 0.8, 0.5, 0.8, 0.5],
    [0.55, 0.75, 0.95, 0.75, 0.55, 0.75, 0.95],
    [0.4, 0.65, 1.0, 0.65, 0.4],
    [0.3, 0.55, 0.8, 1.0, 0.8, 0.55, 0.3]
  ];
  function drawFlat(ctx, i, s, t) {
    var w = WAVES[i] || WAVES[0], n = w.length, gap = s * 2.1 / n, bw = gap * 0.55;
    ctx.lineCap = 'round'; ctx.lineWidth = bw;
    for (var k = 0; k < n; k++) {
      var x = (k - (n - 1) / 2) * gap, h = s * 1.1 * w[k] * (0.8 + 0.2 * Math.sin(t * 5 + k));
      ctx.beginPath(); ctx.moveTo(x, -h); ctx.lineTo(x, h); ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(0, 0, s * 0.2, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.fill();
  }

  /* 3D renders of each sound-wave bot (made with the same builder as the opening tornado, vbscene.js).
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
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(opts.tilt || 0);
    ctx.shadowColor = bot.color;
    ctx.shadowBlur = s * 0.9;
    ctx.strokeStyle = bot.color;
    drawFlat(ctx, BOTS.indexOf(bot), s, (window.performance ? performance.now() : 0) / 1000);
    ctx.restore();
  }


  window.VB = window.VB || {};
  window.VB.BOTS = BOTS;
  window.VB.drawMascot = drawMascot;
  window.VB.onMascotImages = onImagesReady;
  window.VB.reduceMotion = reduceMotion;
})();
