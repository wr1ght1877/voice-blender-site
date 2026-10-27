/* Voice Blender: high-octane 140 BPM rave beat, synthesized live with the Web Audio API (no audio files).
   Browsers block sound until the visitor interacts, so it starts on the first click, tap or key press,
   or from the Sound toggle. Mute is remembered; reduced-motion visitors start muted. */
(function () {
  'use strict';
  var AC = window.AudioContext || window.webkitAudioContext;
  var BPM = 140, STEP = 60 / BPM / 4, PHRASE = 16;            // 16 bars per phrase
  var ROOTS = [33, 29, 36, 31];                                // A1 F1 C2 G1 (Am F C G)
  var CHORDS = [[57, 60, 64], [53, 57, 60], [55, 60, 64], [55, 59, 62]];
  var ACID = [0, 0, 12, 0, 0, 3, 0, 12, 0, 0, 7, 0, 10, 0, 12, 3];  // rolling 16ths (semitones over the root)
  var ACC = [1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 1, 0];
  var ARP = [0, 1, 2, 3, 2, 1, 0, 2, 1, 3, 2, 0, 3, 1, 2, 3];
  var STABS = { 0: 1, 3: 1, 6: 1, 10: 1, 12: 1 };
  var mtof = function (m) { return 440 * Math.pow(2, (m - 69) / 12); };

  /* Engine: everything is built against any BaseAudioContext so it can also render offline. */
  function Engine(ctx, out) {
    var noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = noise.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

    // master: bus -> soft clip -> limiter -> out
    var bus = ctx.createGain(); bus.gain.value = 1;
    var clip = ctx.createWaveShaper(), curve = new Float32Array(1024);
    for (i = 0; i < 1024; i++) { var x = i / 511.5 - 1; curve[i] = Math.tanh(1.6 * x) / Math.tanh(1.6); }
    clip.curve = curve;
    var lim = ctx.createDynamicsCompressor();
    lim.threshold.value = -8; lim.knee.value = 2; lim.ratio.value = 20; lim.attack.value = 0.002; lim.release.value = 0.12;
    bus.connect(clip); clip.connect(lim); lim.connect(out);

    // sidechain-pumped bus for bass / synths / hats, ducked on every kick
    var pump = ctx.createGain(); pump.gain.value = 1; pump.connect(bus);
    // dotted-8th delay for arp and stabs
    var dly = ctx.createDelay(1), fb = ctx.createGain(), dlyOut = ctx.createGain(), dlyLp = ctx.createBiquadFilter();
    dly.delayTime.value = STEP * 3; fb.gain.value = 0.32; dlyOut.gain.value = 0.28; dlyLp.type = 'lowpass'; dlyLp.frequency.value = 3500;
    dly.connect(dlyLp); dlyLp.connect(fb); fb.connect(dly); dlyLp.connect(dlyOut); dlyOut.connect(pump);

    function src(t, dur) { var s = ctx.createBufferSource(); s.buffer = noise; s.start(t, Math.random() * 1.5); s.stop(t + dur); return s; }
    function chain(nodes) { for (var k = 0; k < nodes.length - 1; k++) nodes[k].connect(nodes[k + 1]); return nodes[0]; }
    function filt(type, f, q) { var b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; if (q) b.Q.value = q; return b; }
    function amp(t, a, peak, dec) { var g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec); return g; }

    function kick(t) {
      var o = ctx.createOscillator(), g = amp(t, 0.003, 1.0, 0.38);
      o.frequency.setValueAtTime(170, t); o.frequency.exponentialRampToValueAtTime(48, t + 0.09); o.frequency.exponentialRampToValueAtTime(40, t + 0.35);
      o.connect(g); g.connect(bus); o.start(t); o.stop(t + 0.45);
      var c = src(t, 0.03); chain([c, filt('highpass', 3000), amp(t, 0.001, 0.25, 0.02), bus]);
      pump.gain.cancelScheduledValues(t); pump.gain.setValueAtTime(0.22, t); pump.gain.linearRampToValueAtTime(1, t + STEP * 3.4);
    }
    function clap(t, peak) {
      var g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t);
      [0, 0.011, 0.022].forEach(function (o) { g.gain.setValueAtTime(peak, t + o); g.gain.exponentialRampToValueAtTime(peak * 0.15, t + o + 0.009); });
      g.gain.setValueAtTime(peak * 0.8, t + 0.033); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
      chain([src(t, 0.25), filt('bandpass', 1500, 1.4), g, bus]);
    }
    function hat(t, open, peak) { chain([src(t, open ? 0.2 : 0.05), filt('highpass', open ? 7000 : 9000), amp(t, 0.001, peak, open ? 0.14 : 0.03), pump]); }
    function acid(t, midi, accent, cut) {
      var o = ctx.createOscillator(), o2 = ctx.createOscillator(), f = filt('lowpass', 200, 14), g = amp(t, 0.004, accent ? 0.34 : 0.22, STEP * 0.9);
      o.type = 'sawtooth'; o2.type = 'square'; o.frequency.value = mtof(midi); o2.frequency.value = mtof(midi) * 1.003;
      var top = cut * (accent ? 1.8 : 1);
      f.frequency.setValueAtTime(top, t); f.frequency.exponentialRampToValueAtTime(Math.max(140, top * 0.12), t + STEP * 0.9);
      var m = ctx.createGain(); m.gain.value = 0.5; o.connect(m); o2.connect(m); m.connect(f); f.connect(g); g.connect(pump);
      o.start(t); o2.start(t); o.stop(t + STEP + 0.02); o2.stop(t + STEP + 0.02);
    }
    function supersaw(t, notes, dur, peak, cut, toDelay, cutTo) {
      var f = filt('lowpass', cut, 2), g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      if (cutTo) {                      // sustained pad with an opening filter
        g.gain.linearRampToValueAtTime(peak, t + (cut > 1000 ? 0.03 : 0.4)); g.gain.setValueAtTime(peak, t + dur - 0.05); g.gain.linearRampToValueAtTime(0.0001, t + dur);
        f.frequency.setValueAtTime(cut, t); f.frequency.exponentialRampToValueAtTime(cutTo, t + dur);
      } else { g.gain.exponentialRampToValueAtTime(peak, t + 0.008); g.gain.exponentialRampToValueAtTime(peak * 0.5, t + dur * 0.5); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); }
      f.connect(g); g.connect(pump); if (toDelay) g.connect(dly);
      notes.forEach(function (n) {
        [-14, -7, 0, 7, 14].forEach(function (c) {
          var o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(n); o.detune.value = c + (Math.random() * 4 - 2);
          o.connect(f); o.start(t); o.stop(t + dur + 0.02);
        });
      });
    }
    function arp(t, midi) {
      var o = ctx.createOscillator(), f = filt('lowpass', 4200, 4), g = amp(t, 0.003, 0.09, STEP * 0.8);
      o.type = 'square'; o.frequency.value = mtof(midi); o.connect(f); f.connect(g); g.connect(pump); g.connect(dly);
      o.start(t); o.stop(t + STEP);
    }
    function riser(t, dur, peak) {
      var f = filt('bandpass', 400, 3), g = ctx.createGain();
      f.frequency.setValueAtTime(400, t); f.frequency.exponentialRampToValueAtTime(9000, t + dur);
      g.gain.setValueAtTime(peak * 0.05, t); g.gain.linearRampToValueAtTime(peak, t + dur * 0.98); g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.02);
      chain([src(t, dur + 0.05), f, g, bus]);
      var o = ctx.createOscillator(), og = ctx.createGain(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(1760, t + dur);
      og.gain.setValueAtTime(0.0001, t); og.gain.linearRampToValueAtTime(peak * 0.3, t + dur * 0.98); og.gain.linearRampToValueAtTime(0.0001, t + dur + 0.02);
      chain([o, filt('lowpass', 2500), og, bus]); o.start(t); o.stop(t + dur + 0.05);
    }
    function impact(t) {
      chain([src(t, 1.6), filt('highpass', 4000), amp(t, 0.002, 0.3, 1.4), bus]);
      var o = ctx.createOscillator(), g = amp(t, 0.004, 0.7, 1.1);
      o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(30, t + 1); o.connect(g); g.connect(bus); o.start(t); o.stop(t + 1.2);
    }

    // one 16th step of the arrangement
    this.step = function (n, t) {
      var s = n % 16, barN = Math.floor(n / 16), bar = barN % PHRASE, ci = barN % 4;
      var breakdown = bar >= 14, full = bar >= 8 && bar < 14;
      var cut = 500 + 2600 * (0.5 - 0.5 * Math.cos(Math.PI * 2 * ((n % 128) / 128)));   // acid filter sweep every 8 bars
      if (s === 0 && bar === 0) impact(t);
      if (s === 0 && bar === 8) chain([src(t, 1.2), filt('highpass', 5000), amp(t, 0.002, 0.2, 1), bus]);
      if (!breakdown) {
        if (s % 4 === 0) kick(t);
        if (s === 4 || s === 12) clap(t, 0.55);
        if (s % 4 === 2) hat(t, true, 0.2); else hat(t, false, s % 2 ? 0.05 : 0.08);
        acid(t, ROOTS[ci] + 12 + ACID[s], ACC[s], cut);
        var ch = CHORDS[ci];
        arp(t, ch[ARP[s] % 3] + 12 * (ARP[s] === 3 ? 1 : 0) + 12);
        if (full && STABS[s]) supersaw(t, ch, STEP * 1.6, 0.075, 5200, true);
        if (bar === 7 && s === 0) riser(t, STEP * 16, 0.18);                     // small riser into bar 8
      } else {
        if (s === 0) supersaw(t, CHORDS[ci].concat([CHORDS[ci][0] - 12]), STEP * 16, 0.06, bar === 14 ? 600 : 1800, false, bar === 14 ? 1800 : 7000);
        if (bar === 14 && s === 0) riser(t, STEP * 32, 0.6);                    // big riser into the drop
        if (bar === 15 && s % 2 === 0) acid(t, ROOTS[ci] + 12 + ACID[s], 1, 300 + 2400 * s / 16);
        if ((bar === 14 && s % 4 === 0) || (bar === 15 && (s < 8 ? s % 2 === 0 : true))) clap(t, 0.2 + 0.45 * ((bar - 14) * 16 + s) / 32);
        if (s % 4 === 2) hat(t, false, 0.06);
      }
    };
  }

  // offline renderer (used for previews/tests): renders `seconds` starting at `startBar`
  window.VBBeat = {
    bpm: BPM,
    render: function (seconds, startBar, rate) {
      rate = rate || 44100;
      var OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
      var oc = new OAC(2, Math.ceil(seconds * rate), rate), vol = oc.createGain(); vol.gain.value = 0.5; vol.connect(oc.destination);
      var e = new Engine(oc, vol), n0 = (startBar || 0) * 16;
      for (var n = n0, t = 0.02; t < seconds; n++, t += STEP) e.step(n, t);
      return oc.startRendering();
    }
  };

  var btn = document.getElementById('sound-toggle');
  if (!btn) return;
  if (!AC) { btn.hidden = true; return; }

  var KEY = 'vb-sound', VOL = 0.5;
  var stored = null; try { stored = localStorage.getItem(KEY); } catch (e) {}
  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var auto = stored === 'on' || (stored !== 'off' && !reduced);   // play on first gesture?

  var ctx = null, master = null, eng = null, timer = null, on = false, nextTime = 0, n = 0;
  function save(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }
  function setUI() {
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.setAttribute('aria-label', on ? 'Turn the beat off' : 'Turn the beat on');
    btn.classList.toggle('on', on);
    btn.querySelector('.st-label').textContent = on ? 'Sound on' : 'Sound off';
  }
  function tick() {
    while (nextTime < ctx.currentTime + 0.15) { eng.step(n, nextTime); nextTime += STEP; n++; }
  }
  function run() { nextTime = ctx.currentTime + 0.08; if (!timer) timer = setInterval(tick, 25); tick(); }
  function start() {
    if (!ctx) {
      ctx = new AC({ latencyHint: 'playback' });
      master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
      eng = new Engine(ctx, master); n = 0;
    }
    on = true; setUI();
    var go = function () {
      if (!on) return;
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setTargetAtTime(VOL, ctx.currentTime, 0.08);
      run();
    };
    if (ctx.state === 'running') go(); else ctx.resume().then(go, function () {});
  }
  function stop() {
    on = false; setUI();
    if (!ctx) return;
    clearInterval(timer); timer = null;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(0, ctx.currentTime, 0.06);
    setTimeout(function () { if (!on && ctx) ctx.suspend(); }, 500);
  }

  btn.addEventListener('click', function () { if (on) { stop(); save('off'); } else { start(); save('on'); } });

  // first real user gesture starts the beat (scrolling alone does not count as a gesture in browsers)
  var GEST = ['pointerdown', 'keydown', 'touchend', 'click'];
  function first(e) {
    if (btn.contains(e.target)) { unhook(); return; }   // the toggle handles itself
    if (e.type === 'keydown' && (e.metaKey || e.ctrlKey || e.altKey || e.key === 'Tab' || e.key === 'Escape')) return;
    unhook();
    if (auto && !on) start();
  }
  function unhook() { GEST.forEach(function (g) { document.removeEventListener(g, first, true); }); }
  GEST.forEach(function (g) { document.addEventListener(g, first, true); });

  document.addEventListener('visibilitychange', function () {
    if (!ctx || !on) return;
    if (document.hidden) { clearInterval(timer); timer = null; ctx.suspend(); }
    else ctx.resume().then(function () { if (on) run(); });
  });
  setUI();
})();
