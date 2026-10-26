/* Voice Blender: 3D hero for the plain (non-tour) page. three.js r169 from jsDelivr, pinned.
   Falls back to the 2D canvas (vortex2d.js) if WebGL or the CDN is unavailable. */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createHero, makeBotShape, makeBackground } from './vbscene.js';

const VB = window.VB || (window.VB = {});

function start() {
  if (VB.heroMode) return;
  const host = document.getElementById('hero3d');
  const hero = document.querySelector('.hero');
  if (!host || !hero) return;
  const reduce = !!VB.reduceMotion;
  const small = Math.min(window.innerWidth, window.innerHeight) < 700;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: !small, powerPreference: 'high-performance' });
    if (!renderer.getContext()) throw new Error('no context');
  } catch (e) { VB.useFallback && VB.useFallback('WebGL unavailable'); return; }
  VB.heroMode = '3d';
  hero.classList.add('mode-3d');
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.5 : 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = makeBackground();
  const overlay = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  const H = createHero({ small });
  scene.add(H.world); overlay.add(H.front);

  scene.add(new THREE.AmbientLight(0x6070ff, 0.5));
  const lightDefs = [[0x2f8bff, -5, 3, 3], [0xff3dc8, 5, 2, 2], [0x2ee86f, -4, -3, 2], [0xffa424, 4, -3, 3], [0x9b5cff, 0, 4, -2]];
  const lights = lightDefs.map(([c, x, y, z]) => { const l = new THREE.PointLight(c, 40, 18, 1.6); l.position.set(x, y, z); scene.add(l); return l; });
  const shapes = new THREE.Group(); scene.add(shapes);
  [[-6.2, 2.2, -5], [6.4, 2.0, -5.5], [-6.8, -2.4, -6], [6.6, -2.2, -5.2], [0.4, 4.4, -8]].forEach(([x, y, z], i) => {
    const m = makeBotShape(i); m.position.set(x, y, z); m.userData.base = new THREE.Vector3(x, y, z); m.userData.i = i; shapes.add(m);
  });

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(1, 1), 0.7, 0.5, 0.28));
  composer.addPass(new OutputPass());

  let W = 1, Hh = 1, baseZ = 9, worldY = 0.7, running = false, visible = true, elapsed = 6, last = 0, scrollP = 0;
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  function resize() {
    W = host.clientWidth || window.innerWidth; Hh = host.clientHeight || window.innerHeight;
    renderer.setSize(W, Hh, false); composer.setSize(W, Hh);
    camera.aspect = W / Hh; camera.updateProjectionMatrix();
    const a = W / Hh;
    baseZ = a < 0.75 ? 15.5 : a < 1.2 ? 12 : 9.2;
    worldY = a < 0.75 ? 1.9 : a < 1.2 ? 1.2 : 0.75;
    H.setPixel(Hh, renderer.getPixelRatio());
    if (reduce || !running) renderFrame(6);
  }
  if (!reduce) {
    window.addEventListener('pointermove', (e) => { mouse.tx = (e.clientX / window.innerWidth) * 2 - 1; mouse.ty = (e.clientY / window.innerHeight) * 2 - 1; }, { passive: true });
    window.addEventListener('scroll', () => { scrollP = Math.min(1, window.scrollY / Math.max(1, window.innerHeight)); }, { passive: true });
  }
  window.addEventListener('resize', resize);

  function renderFrame(time) {
    mouse.x += (mouse.tx - mouse.x) * 0.05; mouse.y += (mouse.ty - mouse.y) * 0.05;
    camera.position.set(mouse.x * 1.1, 0.35 - mouse.y * 0.6 + scrollP * 1.2, baseZ - scrollP * 2.8);
    camera.lookAt(0, worldY * 0.25 - scrollP * 0.4, 0);
    H.world.position.y = worldY;
    H.world.rotation.x = 0.12 + scrollP * 0.45;
    H.world.rotation.y = Math.sin(time * 0.07) * 0.18 + mouse.x * 0.12;
    H.update(time);
    shapes.children.forEach((m) => {
      const b = m.userData.base, i = m.userData.i;
      m.position.set(b.x - mouse.x * 0.8, b.y + Math.sin(time * 0.6 + i) * 0.25 + mouse.y * 0.5, b.z);
      m.rotation.x = time * 0.15 + i; m.rotation.y = time * 0.22 + i * 0.5;
    });
    lights.forEach((l, i) => { l.position.x = lightDefs[i][1] + Math.sin(time * 0.4 + i) * 1.2; });
    composer.render();
    H.front.position.copy(H.world.position); H.front.rotation.copy(H.world.rotation);
    renderer.autoClear = false; renderer.clearDepth(); renderer.render(overlay, camera); renderer.autoClear = true;
  }
  function frame(now) {
    if (!running) return;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0; last = now;
    elapsed += dt; renderFrame(elapsed); requestAnimationFrame(frame);
  }
  function play() { if (reduce || running || !visible || document.hidden) return; running = true; last = 0; requestAnimationFrame(frame); }
  function pause() { running = false; }
  document.addEventListener('visibilitychange', () => (document.hidden ? pause() : play()));
  if ('IntersectionObserver' in window) new IntersectionObserver((en) => { visible = en[0].isIntersecting; visible ? play() : pause(); }).observe(hero);
  renderer.domElement.addEventListener('webglcontextlost', (e) => { e.preventDefault(); pause(); host.innerHTML = ''; VB.heroMode = null; hero.classList.remove('mode-3d'); VB.useFallback && VB.useFallback('WebGL context lost'); });
  resize(); renderFrame(6);
  VB.hero3dReady = true;
  if (!reduce) play();
}

function safeStart() {
  if (!document.documentElement.classList.contains('has-webgl')) { VB.useFallback && VB.useFallback('WebGL unavailable'); return; }
  try { start(); }
  catch (e) { console.warn('Voice Blender 3D hero failed:', e); VB.heroMode = null; const h = document.getElementById('hero3d'); if (h) h.innerHTML = ''; VB.useFallback && VB.useFallback('3D error'); }
}
VB.startHero3d = safeStart;
if (document.documentElement.classList.contains('plain')) safeStart();
