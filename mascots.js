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


  window.VB = window.VB || {};
  window.VB.BOTS = BOTS;
  window.VB.drawMascot = drawMascot;
  window.VB.reduceMotion = reduceMotion;
})();
