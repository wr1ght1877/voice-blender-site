/* Voice Blender: background music ("voices" by Rexlambo, CC BY 3.0, credited in the footer).
   Browsers block sound until the visitor interacts, so it starts on the first click, tap or key press
   anywhere (scrolling can't unlock audio), or from the Sound toggle. If the visitor turns it off,
   it stays off (remembered). */
(function () {
  'use strict';
  var btn = document.getElementById('sound-toggle');
  if (!btn) return;

  var KEY = 'vb-sound', VOL = 0.35, SRC = 'assets/voices-rexlambo.mp3';
  var stored = null; try { stored = localStorage.getItem(KEY); } catch (e) {}
  var auto = stored !== 'off';            // start on first gesture unless they muted it before

  var audio = null, on = false, fade = null;
  function save(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }
  function setUI() {
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.setAttribute('aria-label', on ? 'Turn the music off' : 'Turn the music on');
    btn.classList.toggle('on', on);
    btn.querySelector('.st-label').textContent = on ? 'Sound on' : 'Sound off';
  }
  function ramp(to, ms, done) {
    clearInterval(fade);
    var from = audio.volume, t0 = Date.now();
    fade = setInterval(function () {
      var k = Math.min(1, (Date.now() - t0) / ms);
      audio.volume = Math.max(0, Math.min(1, from + (to - from) * k));
      if (k >= 1) { clearInterval(fade); fade = null; if (done) done(); }
    }, 30);
  }
  function start() {
    if (!audio) { audio = new Audio(SRC); audio.loop = true; audio.preload = 'auto'; audio.volume = 0; }
    on = true; setUI();
    var p = audio.play();
    if (p && p.then) p.then(function () { if (on) ramp(VOL, 600); }, function () { on = false; setUI(); });
    else ramp(VOL, 600);
  }
  function stop() {
    on = false; setUI();
    if (!audio) return;
    ramp(0, 300, function () { if (!on) audio.pause(); });
  }

  btn.addEventListener('click', function () { if (on) { stop(); save('off'); } else { start(); save('on'); } });

  // first real user gesture anywhere starts the music
  var GEST = ['pointerdown', 'keydown', 'touchend', 'click'];
  function first(e) {
    if (btn.contains(e.target)) { unhook(); return; }   // the toggle handles itself
    if (e.target && e.target.closest && e.target.closest('video')) { unhook(); return; }   // pressing play on a video shouldn't also start the music
    if (e.type === 'keydown' && (e.metaKey || e.ctrlKey || e.altKey || e.key === 'Tab' || e.key === 'Escape')) return;
    unhook();
    if (auto && !on) start();
  }
  function unhook() { GEST.forEach(function (g) { document.removeEventListener(g, first, true); }); }
  GEST.forEach(function (g) { document.addEventListener(g, first, true); });

  // the music steps aside while a video plays, then comes back if it was on
  var paused4video = false;
  Array.prototype.forEach.call(document.querySelectorAll('video'), function (v) {
    v.addEventListener('play', function () { if (on) { paused4video = true; stop(); } });
    function back() { if (paused4video) { paused4video = false; if (auto) start(); } }
    v.addEventListener('pause', back); v.addEventListener('ended', back);
  });

  setUI();
})();
