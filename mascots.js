/* Voice Blender: shared bot data + flat mascot drawing (2D canvas). */
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


  /* Glowing woman with a black-hole mouth. (cx, my) is the mouth; h is the full figure height. */
  function drawWoman(ctx, cx, my, h) {
    var top = my - 0.1 * h;
    var X = function (u) { return cx + u * h; }, Y = function (v) { return top + v * h; };
    function mirrorPath(pts) {      // pts: left-side outline from top-center to bottom-center as [cmd, ...coords]
      ctx.beginPath();
      ctx.moveTo(X(pts[0][1]), Y(pts[0][2]));
      var i, p;
      for (i = 1; i < pts.length; i++) { p = pts[i]; seg(p, 1); }
      for (i = pts.length - 1; i >= 1; i--) { p = pts[i]; segBack(pts, i); }
      ctx.closePath();
    }
    function seg(p, s) {
      if (p[0] === 'L') ctx.lineTo(X(s * p[1]), Y(p[2]));
      else if (p[0] === 'Q') ctx.quadraticCurveTo(X(s * p[1]), Y(p[2]), X(s * p[3]), Y(p[4]));
      else ctx.bezierCurveTo(X(s * p[1]), Y(p[2]), X(s * p[3]), Y(p[4]), X(s * p[5]), Y(p[6]));
    }
    function segBack(pts, i) {      // walk the right side back up (reverse of segment i, mirrored)
      var p = pts[i], prev = pts[i - 1], e = [prev[prev.length - 2], prev[prev.length - 1]];
      if (p[0] === 'L') ctx.lineTo(X(-e[0]), Y(e[1]));
      else if (p[0] === 'Q') ctx.quadraticCurveTo(X(-p[1]), Y(p[2]), X(-e[0]), Y(e[1]));
      else ctx.bezierCurveTo(X(-p[3]), Y(p[4]), X(-p[1]), Y(p[2]), X(-e[0]), Y(e[1]));
    }
    var HAIR = [['M', 0, 0.012], ['C', -0.07, 0.012, -0.078, 0.11, -0.076, 0.2], ['C', -0.075, 0.25, -0.086, 0.29, -0.064, 0.305], ['C', -0.05, 0.27, -0.04, 0.2, -0.03, 0.16], ['L', 0, 0.16]];
    var BODY = [['M', 0, 0.15], ['L', -0.017, 0.15], ['Q', -0.06, 0.156, -0.092, 0.172], ['C', -0.108, 0.2, -0.106, 0.3, -0.104, 0.36], ['L', -0.099, 0.465], ['L', -0.083, 0.465], ['L', -0.08, 0.35], ['C', -0.074, 0.29, -0.068, 0.25, -0.064, 0.235], ['C', -0.06, 0.3, -0.05, 0.35, -0.045, 0.385], ['C', -0.08, 0.6, -0.16, 0.86, -0.205, 0.99], ['Q', -0.1, 1.012, 0, 1.012]];
    ctx.save();
    var lw = Math.max(1, h * 0.006);
    // body + arms + gown
    ctx.shadowColor = 'rgba(150,200,255,1)'; ctx.shadowBlur = h * 0.06;
    var bg = ctx.createLinearGradient(0, Y(0.15), 0, Y(1));
    bg.addColorStop(0, '#b9ceff'); bg.addColorStop(0.3, '#7d8bff'); bg.addColorStop(0.7, '#6a3fe0'); bg.addColorStop(1, 'rgba(120,70,255,0.55)');
    mirrorPath(BODY); ctx.fillStyle = bg; ctx.fill(); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(8,10,40,.75)'; ctx.lineWidth = lw; ctx.stroke();
    // long hair, falling over the shoulders
    var hg = ctx.createLinearGradient(0, Y(0), 0, Y(0.31));
    hg.addColorStop(0, '#9d8cff'); hg.addColorStop(1, '#4b2fc4');
    ctx.shadowColor = 'rgba(150,200,255,1)'; ctx.shadowBlur = h * 0.06;
    mirrorPath(HAIR); ctx.fillStyle = hg; ctx.fill();
    ctx.shadowBlur = 0; ctx.strokeStyle = 'rgba(8,10,40,.6)'; ctx.lineWidth = lw; ctx.stroke();
    // head
    ctx.shadowColor = 'rgba(170,215,255,1)'; ctx.shadowBlur = h * 0.05;
    ctx.beginPath(); ctx.ellipse(X(0), Y(0.077), h * 0.04, h * 0.053, 0, 0, Math.PI * 2);
    var fg = ctx.createRadialGradient(X(0), Y(0.07), 0, X(0), Y(0.077), h * 0.055);
    fg.addColorStop(0, '#ffffff'); fg.addColorStop(1, '#a9c2ff');
    ctx.fillStyle = fg; ctx.fill(); ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(8,10,40,.75)'; ctx.lineWidth = lw; ctx.stroke();
    // hair fringe over the forehead
    ctx.beginPath(); ctx.moveTo(X(-0.042), Y(0.07));
    ctx.bezierCurveTo(X(-0.04), Y(0.02), X(0.04), Y(0.012), X(0.043), Y(0.068));
    ctx.bezierCurveTo(X(0.02), Y(0.04), X(-0.01), Y(0.036), X(-0.042), Y(0.07));
    ctx.fillStyle = '#8f7cff'; ctx.fill();
    // black-hole mouth: soft halo, bright accretion ring, dark core
    var m = [cx, my], r = h * 0.013;
    var halo = ctx.createRadialGradient(m[0], m[1], r * 0.8, m[0], m[1], r * 3);
    halo.addColorStop(0, 'rgba(150,205,255,0.95)'); halo.addColorStop(1, 'rgba(120,160,255,0)');
    ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(m[0], m[1], r * 3, 0, Math.PI * 2); ctx.fill();
    ctx.shadowColor = '#bfe3ff'; ctx.shadowBlur = r * 2;
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(1, r * 0.45);
    ctx.beginPath(); ctx.ellipse(m[0], m[1], r * 1.25, r * 0.95, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#000000';
    ctx.beginPath(); ctx.ellipse(m[0], m[1], r * 1.05, r * 0.78, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  window.VB = window.VB || {};
  window.VB.BOTS = BOTS;
  window.VB.drawWoman = drawWoman;
  window.VB.drawMascot = drawMascot;
  window.VB.reduceMotion = reduceMotion;
})();
