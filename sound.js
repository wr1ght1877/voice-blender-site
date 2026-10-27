/* Voice Blender: optional background beat, synthesized live with the Web Audio API (no audio files).
   Off by default; only starts when the visitor presses the sound toggle. */
(function () {
  'use strict';
  var btn = document.getElementById('sound-toggle');
  var AC = window.AudioContext || window.webkitAudioContext;
  if (!btn || !AC) { if (btn) btn.hidden = true; return; }

  var ctx = null, master = null, comp = null, noiseBuf = null, timer = null, on = false;
  var BPM = 92, STEP = 60 / BPM / 4, nextTime = 0, step = 0;
  // Am - F - C - G, one bar each
  var CHORDS = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]];
  var BASS = [45, 41, 48, 43];
  var mtof = function (m) { return 440 * Math.pow(2, (m - 69) / 12); };

  function init() {
    ctx = new AC();
    comp = ctx.createDynamicsCompressor();
    master = ctx.createGain(); master.gain.value = 0;
    master.connect(comp); comp.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    var d = noiseBuf.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  function env(g, t, a, peak, dec) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec); }
  function kick(t) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.18);
    env(g, t, 0.004, 0.9, 0.32); o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.4);
  }
  function noise(t, type, freq, peak, dec) {
    var s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; f.type = type; f.frequency.value = freq;
    env(g, t, 0.002, peak, dec); s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + dec + 0.05);
  }
  function tone(t, midi, type, peak, dur, cutoff) {
    var o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = type; o.frequency.value = mtof(midi); f.type = 'lowpass'; f.frequency.value = cutoff;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + 0.04); g.gain.setValueAtTime(peak, t + dur * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f); f.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
  }
  function schedule() {
    while (nextTime < ctx.currentTime + 0.12) {
      var s = step % 16, bar = Math.floor(step / 16) % 4, t = nextTime;
      if (s === 0 || s === 8 || s === 10) kick(t);
      if (s === 4 || s === 12) noise(t, 'bandpass', 1800, 0.35, 0.16);
      if (s % 2 === 0) noise(t, 'highpass', 8000, s % 4 === 2 ? 0.12 : 0.06, 0.04);
      if (s === 0) CHORDS[bar].forEach(function (m) { tone(t, m, 'sawtooth', 0.035, STEP * 16, 1400); });
      if (s === 0 || s === 6 || s === 8 || s === 14) tone(t, BASS[bar], 'triangle', 0.22, STEP * 2, 600);
      nextTime += STEP; step++;
    }
  }
  function setUI() {
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.setAttribute('aria-label', on ? 'Turn the beat off' : 'Turn the beat on');
    btn.classList.toggle('on', on);
    btn.querySelector('.st-label').textContent = on ? 'Sound on' : 'Sound off';
  }
  function start() {
    if (!ctx) init();
    ctx.resume();
    nextTime = ctx.currentTime + 0.06; step = 0;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(0.55, ctx.currentTime, 0.3);
    timer = setInterval(schedule, 25); schedule();
    on = true; setUI();
  }
  function stop() {
    on = false; setUI();
    if (!ctx) return;
    clearInterval(timer); timer = null;
    master.gain.setTargetAtTime(0, ctx.currentTime, 0.12);
    setTimeout(function () { if (!on && ctx) ctx.suspend(); }, 600);
  }
  btn.addEventListener('click', function () { on ? stop() : start(); });
  document.addEventListener('visibilitychange', function () {
    if (!ctx || !on) return;
    if (document.hidden) { clearInterval(timer); timer = null; ctx.suspend(); }
    else { ctx.resume().then(function () { nextTime = ctx.currentTime + 0.06; if (!timer) timer = setInterval(schedule, 25); }); }
  });
  setUI();
})();
