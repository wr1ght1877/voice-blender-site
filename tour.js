/* Voice Blender: scroll-driven 3D tour (three.js r169 from jsDelivr, pinned).
   Scroll moves a camera down the -Z axis: hero vortex -> dive into the mouth -> tunnel of bot streams ->
   bright "What is" space -> through the O of a giant 3D "VOICE" into a dark room (How it works, Features,
   Use cases, Team) -> between the "3" and "PLANS" into bright pricing -> rush toward "JOIN THE CALL".
   Cards are real HTML placed in 3D with CSS3DRenderer. Plain page is the fallback (see script.js). */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { createHero, makeBotShape, makeBackground, makeMascot3D, addMascotLights, MASCOT_SIZE, dotTexture, radialTexture, BOT_COLORS } from './vbscene.js';

const VB = window.VB || (window.VB = {});
const root = document.documentElement;
const FONT_URL = 'https://cdn.jsdelivr.net/npm/three@0.169.0/examples/fonts/helvetiker_bold.typeface.json';

/* Camera path: [scroll units (viewport heights), camera z] */
const KEYS = [[0, 9.2], [1.4, 0.4], [3.8, -70], [7.2, -146], [8.0, -160], [10.6, -228], [13.2, -300], [15.0, -350], [18.4, -438], [19.2, -454], [21.6, -482], [23, -529]];
const U = KEYS[KEYS.length - 1][0];
const GATES = [0.3, -70, -152, -446];        // things beyond a gate stay hidden until the camera passes it
const VOICE_Z = -152, PLANS_Z = -446, JOIN_Z = -541;

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
function zAt(u) {
  if (u <= 0) return KEYS[0][1];
  for (let i = 1; i < KEYS.length; i++) {
    const [u1, z1] = KEYS[i], [u0, z0] = KEYS[i - 1];
    if (u <= u1) { const t = (u - u0) / (u1 - u0); return lerp(z0, z1, t * t * (3 - 2 * t) * 0.35 + t * 0.65); }
  }
  return KEYS[KEYS.length - 1][1];
}
function uAt(z) { let lo = 0, hi = U; for (let k = 0; k < 40; k++) { const m = (lo + hi) / 2; if (zAt(m) > z) lo = m; else hi = m; } return (lo + hi) / 2; }

if (root.classList.contains('tour')) {
  start().catch((e) => { console.warn('Voice Blender 3D tour failed:', e); VB.toPlain && VB.toPlain('3D tour error'); });
}

async function start() {
  const tourEl = document.getElementById('tour');
  const glHost = document.getElementById('tour-gl');
  const cssHost = document.getElementById('tour-css');
  const flash = document.querySelector('.tour-flash');
  const heroCopy = document.querySelector('.hero-copy');
  const heroCue = document.querySelector('.tour-cue');
  const dotsNav = document.querySelector('.tour-dots');
  const bar = document.querySelector('.tour-bar i');
  const small = Math.min(innerWidth, innerHeight) < 700 || matchMedia('(pointer: coarse)').matches;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: !small, powerPreference: 'high-performance' });
    if (!renderer.getContext()) throw new Error('no context');
  } catch (e) { VB.toPlain && VB.toPlain('WebGL unavailable'); return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, small ? 1.25 : 1.5));
  renderer.toneMappingExposure = 1.1;
  glHost.appendChild(renderer.domElement);
  const css = new CSS3DRenderer();
  cssHost.appendChild(css.domElement);

  const scene = new THREE.Scene();
  const overlay = new THREE.Scene();       // crisp sprites drawn after bloom
  const cssScene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(48, 1, 0.05, 200);
  const fog = new THREE.Fog(0x070a24, 16, 75);
  scene.fog = fog;
  const heroBg = makeBackground();
  const bgColor = new THREE.Color();

  /* lights: hemisphere + colored point lights that travel with the camera */
  const hemi = new THREE.HemisphereLight(0xffffff, 0x6040c0, 1.0); scene.add(hemi);
  const dir = new THREE.DirectionalLight(0xffffff, 1.4); scene.add(dir); scene.add(dir.target);
  const camLights = [[0x2f8bff, -7, 3, -6], [0xff3dc8, 7, 2, -8], [0x2ee86f, -5, -3, -12], [0xffa424, 6, -3, -10]].map(([c, x, y, z]) => {
    const l = new THREE.PointLight(c, 70, 32, 1.4); l.userData.off = new THREE.Vector3(x, y, z); scene.add(l); return l;
  });

  /* 1. hero */
  const hero = createHero({ small });
  scene.add(hero.world); overlay.add(hero.front);

  /* 2. tunnel: glowing rounded-rect portals + five helical bot streams */
  const tunnel = new THREE.Group(); scene.add(tunnel);
  const rr = (w, h, r) => { const s = new THREE.Shape(); s.moveTo(-w / 2 + r, -h / 2); s.lineTo(w / 2 - r, -h / 2); s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r); s.lineTo(w / 2, h / 2 - r); s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2); s.lineTo(-w / 2 + r, h / 2); s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r); s.lineTo(-w / 2, -h / 2 + r); s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2); return s; };
  const frameGeo = new THREE.BufferGeometry().setFromPoints(rr(7.6, 4.8, 0.9).getPoints(12));
  const frameGeo2 = new THREE.BufferGeometry().setFromPoints(rr(7.2, 4.45, 0.8).getPoints(12));
  for (let k = 0, z = -5; z > -68; z -= 4.5, k++) {
    const c = new THREE.Color(BOT_COLORS[k % 5]).multiplyScalar(1.6);
    const a = new THREE.LineLoop(frameGeo, new THREE.LineBasicMaterial({ color: c, toneMapped: false })); a.position.z = z; tunnel.add(a);
    const b = new THREE.LineLoop(frameGeo2, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, toneMapped: false })); b.position.z = z - 0.4; tunnel.add(b);
  }
  const TPER = small ? 700 : 1500, TN = TPER * 5;
  const tAttr = new Float32Array(TN * 4), tCol = new Float32Array(TN * 3);
  for (let i = 0; i < TN; i++) {
    const s = i % 5, c = new THREE.Color(BOT_COLORS[s]);
    tAttr.set([Math.random(), s, Math.random() - 0.5, 0.6 + Math.random()], i * 4);
    const b = 0.7 + Math.random() * 0.8; tCol.set([c.r * b, c.g * b, c.b * b], i * 3);
  }
  const tg = new THREE.BufferGeometry();
  tg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(TN * 3), 3));
  tg.setAttribute('aT', new THREE.BufferAttribute(tAttr, 4));
  tg.setAttribute('aColor', new THREE.BufferAttribute(tCol, 3));
  tg.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, -36), 60);
  const tunnelMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uPixel: { value: 30 } },
    vertexShader: `
      attribute vec4 aT; attribute vec3 aColor; uniform float uTime, uPixel; varying vec3 vC; varying float vA;
      void main(){
        float z = -1.5 - aT.x * 68.0;
        float base = aT.y * 1.2566;
        float ang = base + z * 0.21 + uTime * 0.5 + aT.z * 0.35;
        float r = 2.0 + 0.35 * sin(z * 0.45 + base * 2.0) + aT.z * 0.5;
        vec3 p = vec3(cos(ang) * r * 1.35, sin(ang) * r * 0.9, z);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        float d = max(-mv.z, 0.05);
        vA = step(0.0, -mv.z) * smoothstep(0.2, 3.0, d);
        vC = aColor;
        gl_PointSize = min(aT.w * uPixel * 1.4 / d, 70.0);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `varying vec3 vC; varying float vA;
      void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d); gl_FragColor = vec4(vC * a + vec3(smoothstep(0.18,0.0,d)) * 0.6, a * vA); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  });
  tunnel.add(new THREE.Points(tg, tunnelMat));

  /* 3. floating sound-wave bots + confetti through the bright and dark zones */
  const floaters = [];
  const addFloat = (i, x, y, z, s) => { const m = makeBotShape(i, s); m.position.set(x, y, z); m.userData.b = new THREE.Vector3(x, y, z); m.userData.r = Math.random() * 6; scene.add(m); floaters.push(m); };
  let k = 0;
  for (let z = -80; z > -150; z -= 6) addFloat(k % 5, (k++ % 2 ? 1 : -1) * (6 + Math.random() * 4), -3 + Math.random() * 7, z, 0.8 + Math.random() * 0.8);
  for (let z = -165; z > -440; z -= 13) addFloat(k % 5, (k++ % 2 ? 1 : -1) * (7 + Math.random() * 5), -2 + Math.random() * 6, z, 0.7 + Math.random() * 0.7);
  for (let z = -455; z > -505; z -= 7) addFloat(k % 5, (k++ % 2 ? 1 : -1) * (7 + Math.random() * 4), -3 + Math.random() * 7, z, 0.8 + Math.random() * 0.8);
  const confetti = (z0, z1, n, additive) => {
    const pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos.set([(Math.random() - 0.5) * 30, (Math.random() - 0.5) * 18, lerp(z0, z1, Math.random())], i * 3);
      const c = new THREE.Color(BOT_COLORS[i % 5]); col.set([c.r, c.g, c.b], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const p = new THREE.Points(g, new THREE.PointsMaterial({ size: additive ? 0.12 : 0.16, map: dotTexture(), vertexColors: true, transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending }));
    scene.add(p); return p;
  };
  confetti(-74, -150, small ? 400 : 900, false);
  confetti(-158, -440, small ? 500 : 1200, true);
  confetti(-450, -505, small ? 300 : 700, false);
  confetti(-505, -545, small ? 300 : 600, true);

  /* dark room: glowing grid floor + ceiling, and drifting cubes */
  const grid = new THREE.GridHelper(300, 120, 0x6a5cff, 0x2a2f7a);
  grid.position.set(0, -6, -300); grid.material.transparent = true; grid.material.opacity = 0.55; scene.add(grid);
  const grid2 = grid.clone(); grid2.position.y = 9; grid2.material = grid.material.clone(); grid2.material.opacity = 0.2; scene.add(grid2);
  const CUBES = small ? 40 : 90;
  const cubes = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), new THREE.MeshStandardMaterial({ color: 0x1a1d3a, metalness: 0.6, roughness: 0.25 }), CUBES);
  const cubeData = [];
  for (let i = 0; i < CUBES; i++) cubeData.push({ x: (Math.random() < 0.5 ? -1 : 1) * (5 + Math.random() * 10), y: -4 + Math.random() * 11, z: -160 - Math.random() * 280, s: 0.4 + Math.random() * 1.2, r: Math.random() * 6 });
  scene.add(cubes);

  /* team bots: 3D sound-wave bots like the opening tornado (crisp, in the overlay, with their own lights) + soft glow (bloomed) */
  const BOTS = VB.BOTS || [];
  const teamLights = addMascotLights(new THREE.Group()); teamLights.visible = false; overlay.add(teamLights);
  const M3 = 0.195 / MASCOT_SIZE, _mq = new THREE.Quaternion(), _me = new THREE.Euler();            // old sprite scale -> 3D mascot scale (same on-screen size)
  const mascots = BOTS.map((bot, i) => {
    const s = makeMascot3D(bot, i, 1, { glow: false });
    s.userData.mats = []; s.traverse((o) => { if (o.isMesh && !s.userData.mats.includes(o.material)) { o.material.transparent = true; s.userData.mats.push(o.material); } });
    s.scale.setScalar(3.4 * M3); overlay.add(s);
    const g = new THREE.Sprite(new THREE.SpriteMaterial({ map: radialTexture([[0, bot.color], [0.35, bot.color + '66'], [1, bot.color + '00']]), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
    g.scale.setScalar(4); scene.add(g);
    return { s, g };
  });

  /* 4. giant 3D words: VOICE (fly through the O), 3 PLANS (fly through the gap), JOIN THE CALL */
  let joinGroup = null, joinWidth = 1;
  try {
    const font = await new FontLoader().loadAsync(FONT_URL);
    const geo = (ch, size, depth) => { const g = new TextGeometry(ch, { font, size, depth, curveSegments: small ? 6 : 10, bevelEnabled: true, bevelThickness: size * 0.03, bevelSize: size * 0.02, bevelSegments: 3 }); g.computeBoundingBox(); return g; };
    // VOICE: dark glossy letters in the bright space
    const voiceMat = new THREE.MeshStandardMaterial({ color: 0x15163a, metalness: 0.55, roughness: 0.28 });
    const vg = new THREE.Group(); let x = 0, oCenter = 0, oY = 0;
    for (const ch of 'VOICE') {
      const g = geo(ch, 9, 5), bb = g.boundingBox, w = bb.max.x - bb.min.x;
      const m = new THREE.Mesh(g, voiceMat); m.position.x = x - bb.min.x; vg.add(m);
      if (ch === 'O') { oCenter = x + w / 2; oY = (bb.min.y + bb.max.y) / 2; }
      x += w + 0.9;
    }
    vg.position.set(-oCenter, -oY, VOICE_Z - 5.3); scene.add(vg);
    // 3 PLANS: glowing colored letters in the dark room, with a wide gap after the 3
    const pg = new THREE.Group(); const gap = 5.2;
    const three = new THREE.Mesh(geo('3', 9, 4), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x9fb8ff, emissiveIntensity: 0.55, metalness: 0.2, roughness: 0.3 }));
    const tb = three.geometry.boundingBox; three.position.x = -gap / 2 - tb.max.x; pg.add(three);
    x = gap / 2; const word = 'PLANS';
    for (let i = 0; i < word.length; i++) {
      const g = geo(word[i], 9, 4), bb = g.boundingBox;
      const c = new THREE.Color(BOT_COLORS[i % 5]);
      const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.45, metalness: 0.2, roughness: 0.3 }));
      m.position.x = x - bb.min.x; pg.add(m); x += bb.max.x - bb.min.x + 0.7;
    }
    pg.position.set(0, -4.6, PLANS_Z - 4.3); scene.add(pg);
    // JOIN THE CALL
    joinGroup = new THREE.Group();
    const jm = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xb8c8ff, emissiveIntensity: 0.3, metalness: 0.1, roughness: 0.4 });
    const jg = geo('JOIN THE CALL', 3, 0.9); jg.center();
    joinWidth = jg.boundingBox.max.x - jg.boundingBox.min.x;
    joinGroup.add(new THREE.Mesh(jg, jm)); joinGroup.position.set(0, 0.8, JOIN_Z); scene.add(joinGroup);
  } catch (e) { console.warn('Voice Blender: 3D words skipped (font not loaded)', e); }

  /* 5. HTML cards in 3D */
  const cards = Array.from(document.querySelectorAll('#tour-cards .tc')).map((el, i) => {
    const d = el.dataset, w = +d.w || 400;
    el.style.width = w + 'px';
    const o = new CSS3DObject(el);
    const side = +(d.x || 0);
    const c = { el, o, i, w, side, z: +d.z, y: +(d.y || 0), plan: d.plan != null ? +d.plan : null, bot: d.bot != null ? +d.bot : null,
      planNote: !!d.planNote, wide: !side && d.plan == null, rx: (Math.random() - 0.5) * 0.12, rz: (Math.random() - 0.5) * 0.05, ry: -side * 0.34 + (Math.random() - 0.5) * 0.08, op: -1, blur: -1 };
    c.gate = GATES.filter((g) => g > c.z).reduce((a, g) => Math.min(a, g), Infinity);
    cssScene.add(o);
    return c;
  });
  document.getElementById('tour-cards').style.display = 'block';

  /* layout (depends on aspect) */
  let W = 1, H = 1, vh = innerHeight, tourTop = 0, stacked = false, stops = {};
  const tanH = Math.tan(THREE.MathUtils.degToRad(48 / 2));
  const viewW = (d) => 2 * d * tanH * (W / H);
  function layout() {
    stacked = W / H < 1.25;
    for (const c of cards) {
      const dRead = c.wide ? 12 : 9.5;
      let s = Math.min(1, (viewW(dRead) * 0.9) / (c.w * 0.01));
      let x = 0, y = c.y, z = c.z, ry = c.ry;
      if (c.side) {
        const xMag = Math.max(0, Math.min(3.4, viewW(dRead) / 2 - (c.w * 0.01 * s) / 2 - 0.6));
        x = c.side * xMag; ry = c.ry * Math.min(1, xMag / 3);
      } else ry = 0;
      if (c.bot != null) {
        const m = mascots[c.bot];
        if (x === 0 || stacked) { y = -1.4; m.s.position.set(0, 2.1, z); }
        else m.s.position.set(c.side * Math.max(0.2, Math.abs(x) - (c.w * 0.01 * s) / 2 - 2.0), 0.3, z + 0.5);
        m.g.position.copy(m.s.position); m.g.position.z -= 0.3;
        m.s.scale.setScalar((stacked ? 2.4 : 3.4) * M3); m.g.scale.setScalar(stacked ? 3 : 4.2);
      }
      if (c.plan != null) {
        if (stacked) { z = -470 - c.plan * 15; x = (c.plan - 1) * 0.3; y = 0; ry = 0; s = Math.min(1, (viewW(9) * 0.86) / (c.w * 0.01)); }
        else {
          const sp = Math.min(4.05, viewW(10) / 3.1);
          s = Math.min(1, (sp * 0.92) / (c.w * 0.01));
          x = (c.plan - 1) * sp; z = c.z + (c.plan === 1 ? 0.8 : 0); y = c.plan === 1 ? 0.25 : 0; ry = -(c.plan - 1) * 0.2;
        }
      }
      if (c.planNote && stacked) { z = -516; y = -0.5; }
      c.bx = x; c.by = y; c.o.position.set(x, y, z); c.o.rotation.set(c.wide ? -0.04 : c.rx, ry, c.wide ? 0 : c.rz); c.o.scale.setScalar(0.01 * s);
    }
    if (joinGroup) joinGroup.scale.setScalar(Math.min(1, (viewW(12) * 0.86) / joinWidth));
    stops = { start: 0, inside: uAt(-24), what: uAt(-77), how: uAt(-158), features: uAt(-226), 'use-cases': uAt(-296), bots: uAt(-350), pricing: stacked ? uAt(-454) : uAt(-482), join: U };
  }
  function measure() {
    vh = innerHeight;
    tourEl.style.height = Math.round((U + 1) * vh) + 'px';
    tourTop = tourEl.getBoundingClientRect().top + scrollY;
  }
  function resize() {
    const nw = glHost.clientWidth || innerWidth, nh = glHost.clientHeight || innerHeight;
    const widthChanged = nw !== W;
    W = nw; H = nh;
    renderer.setSize(W, H, false); css.setSize(W, H); composer.setSize(W, H);
    camera.aspect = W / H; camera.updateProjectionMatrix();
    hero.setPixel(H, renderer.getPixelRatio());
    tunnelMat.uniforms.uPixel.value = H * renderer.getPixelRatio() * 0.034;
    if (widthChanged || Math.abs(innerHeight - vh) > 140) measure();
    layout();
  }

  /* post */
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.75, 0.5, 0.3);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  /* input */
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') { mouse.tx = (e.clientX / innerWidth) * 2 - 1; mouse.ty = (e.clientY / innerHeight) * 2 - 1; } }, { passive: true });
  addEventListener('resize', resize);
  let cur = 0, target = 0;
  const readScroll = () => { target = Math.min(U, Math.max(0, (scrollY - tourTop) / vh)); };
  addEventListener('scroll', readScroll, { passive: true });

  /* section dots + nav */
  const dotBtns = Array.from(document.querySelectorAll('.tour-dots button'));
  const go = (id) => {
    if (!(id in stops)) return false;
    scrollTo({ top: tourTop + stops[id] * vh + 2, behavior: 'instant' });
    return true;
  };
  dotBtns.forEach((b) => b.addEventListener('click', () => go(b.dataset.stop)));
  VB.tourGo = go;

  /* zones */
  const DARK = new THREE.Color('#070a24'), ROOM = new THREE.Color('#05060f'), BRIGHT = new THREE.Color('#f4efff'), PINK = new THREE.Color('#fff2f8');
  function zone(z) {
    if (z > -71) return { c: DARK, light: false, bloom: 0.75 };
    if (z > VOICE_Z - 2.5) return { c: BRIGHT, light: true, bloom: 0 };
    if (z > PLANS_Z - 2) return { c: ROOM, light: false, bloom: 0.6 };
    if (z > -500) return { c: PINK, light: true, bloom: 0 };
    const t = smooth(-500, -512, z);
    return { c: PINK.clone().lerp(DARK, t), light: t < 0.5, bloom: 0.45 * t };
  }

  let running = false, visible = true, time = 0, last = 0, lastTone = -1, dotIdx = -1;
  function frame(now) {
    if (!running) return;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016; last = now;
    time += dt;
    cur += (target - cur) * (1 - Math.exp(-dt * (Math.abs(target - cur) > 3 ? 5 : 3.2)));
    if (Math.abs(target - cur) < 0.0005) cur = target;
    render(dt);
    requestAnimationFrame(frame);
  }
  function render() {
    const camZ = zAt(cur);
    mouse.x += (mouse.tx - mouse.x) * 0.05; mouse.y += (mouse.ty - mouse.y) * 0.05;
    // calm the camera while threading the letter gaps
    const calm = Math.min(smooth(3, 12, Math.abs(camZ - VOICE_Z + 2)), smooth(3, 12, Math.abs(camZ - PLANS_Z + 2)));
    const heroT = smooth(0.4, 9.2, camZ);
    const px = mouse.x * (0.5 + heroT * 0.6) * calm + Math.sin(time * 0.25) * 0.15 * calm * (1 - heroT);
    const py = -mouse.y * (0.35 + heroT * 0.25) * calm + Math.cos(time * 0.21) * 0.1 * calm * (1 - heroT);
    camera.position.set(px, py - 0.75 * heroT, camZ);
    camera.lookAt(px * 0.4, (py - 0.75 * heroT) * 0.4 - 0.75 * heroT * 0.6, camZ - 10);

    // zone colors
    const zn = zone(camZ);
    if (camZ > 0.8) { scene.background = heroBg; fog.color.copy(DARK); }
    else { bgColor.copy(zn.c); scene.background = bgColor; fog.color.copy(zn.c); }
    fog.near = zn.light ? 18 : 16; fog.far = zn.light ? 80 : 70;
    bloom.strength = zn.bloom; bloom.enabled = zn.bloom > 0.01;
    const tone = zn.light ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping;
    if (tone !== lastTone) { renderer.toneMapping = tone; lastTone = tone; }
    hemi.intensity = zn.light ? 1.6 : 0.6;
    dir.position.set(camera.position.x + 4, 8, camZ + 4); dir.target.position.set(0, 0, camZ - 20);
    camLights.forEach((l) => l.position.copy(camera.position).add(l.userData.off));

    // hero + tunnel
    const heroOn = camZ > -22;
    hero.world.visible = hero.front.visible = heroOn;
    if (heroOn) {
      hero.world.rotation.x = 0.12 * heroT; hero.world.rotation.y = Math.sin(time * 0.07) * 0.18 * heroT + mouse.x * 0.1 * heroT;
      hero.front.rotation.copy(hero.world.rotation);
      hero.vortexMat.uniforms.uFade.value = smooth(-12, 0, camZ);
      hero.update(time + 6);
    }
    tunnel.visible = camZ < 4 && camZ > -80;
    tunnelMat.uniforms.uTime.value = time;
    flash.style.opacity = (Math.max(smooth(3, 0.7, camZ) * smooth(-5, -1.2, camZ), smooth(-63, -69.5, camZ) * smooth(-75, -71, camZ))).toFixed(3);

    // floaters, cubes, mascots
    for (const m of floaters) {
      const dz = camZ - m.userData.b.z; m.visible = dz > -6 && dz < 90;
      if (!m.visible) continue;
      m.rotation.set(time * 0.2 + m.userData.r, time * 0.27 + m.userData.r, 0);
      m.position.y = m.userData.b.y + Math.sin(time * 0.6 + m.userData.r) * 0.3;
    }
    const tm = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sv = new THREE.Vector3(), pv = new THREE.Vector3();
    cubeData.forEach((c, i) => { e.set(time * 0.3 + c.r, time * 0.2 + c.r, 0); q.setFromEuler(e); pv.set(c.x, c.y + Math.sin(time * 0.5 + c.r) * 0.4, c.z); sv.setScalar(c.s); cubes.setMatrixAt(i, tm.compose(pv, q, sv)); });
    cubes.instanceMatrix.needsUpdate = true;
    cubes.visible = grid.visible = grid2.visible = camZ < -140 && camZ > -470;
    let anyTeam = false;
    mascots.forEach((m, i) => {
      const d = camZ - m.s.position.z;
      const op = smooth(34, 18, d) * smooth(0.8, 4, d) * (camZ < VOICE_Z ? 1 : 0);
      m.s.visible = m.g.visible = op > 0.01;
      if (m.s.visible) anyTeam = true;
      m.s.userData.mats.forEach((mt) => { mt.opacity = op; mt.depthWrite = op > 0.98; });
      m.s.userData.setFade(op); m.s.userData.update(time + i * 0.9, 0.75);
      m.g.material.opacity = op * 0.3;
      _me.set(Math.sin(time * 0.7 + i * 1.7) * 0.18, Math.sin(time * 0.55 + i * 1.7) * 0.36, Math.sin(time * 0.9 + i) * 0.12);
      m.s.quaternion.copy(camera.quaternion).multiply(_mq.setFromEuler(_me));
      m.s.position.y += (Math.sin(time * 1.1 + i) * 0.004);
    });
    teamLights.visible = anyTeam;

    // cards: fade in as you approach, depth-of-field blur near and far
    const far0 = small ? 26 : 34, far1 = small ? 15 : 19;
    for (const c of cards) {
      const d = camZ - c.o.position.z;
      let op = smooth(far0, far1, d) * smooth(1.0, 4.2, d);
      if (c.gate !== Infinity) op *= smooth(c.gate + 1, c.gate - 2.5, camZ);
      const vis = op > 0.01;
      if (c.o.visible !== vis) c.o.visible = vis;
      if (!vis) continue;
      const q2 = Math.round(op * 50) / 50;
      if (q2 !== c.op) { c.el.style.opacity = q2; c.op = q2; }
      let b = d > 15 ? Math.min(5, (d - 15) * 0.3) : d < 6.5 ? Math.min(8, (6.5 - d) * 1.7) : 0;
      b = Math.round(b * 2) / 2;
      if (b !== c.blur) { c.el.style.filter = b ? 'blur(' + b + 'px)' : 'none'; c.blur = b; }
      c.o.position.y = c.by + Math.sin(time * 0.6 + c.i) * 0.06;
    }

    // hero copy fades as you scroll in
    const hc = 1 - smooth(0.05, 0.75, cur);
    heroCopy.style.opacity = hc.toFixed(3); heroCopy.style.visibility = hc < 0.01 ? 'hidden' : '';
    if (heroCue) heroCue.style.opacity = (1 - smooth(0.02, 0.3, cur)).toFixed(3);

    composer.render();
    renderer.autoClear = false; renderer.clearDepth(); renderer.render(overlay, camera); renderer.autoClear = true;
    css.render(cssScene, camera);

    // progress + dots
    bar.style.width = (cur / U * 100).toFixed(2) + '%';
    let idx = 0; dotBtns.forEach((b, i) => { if (cur + 0.25 >= stops[b.dataset.stop]) idx = i; });
    if (idx !== dotIdx) { dotBtns.forEach((b, i) => { b.classList.toggle('active', i === idx); if (i === idx) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); }); dotIdx = idx; }
    dotsNav.classList.toggle('done', scrollY > tourTop + (U + 0.6) * vh);
  }

  function play() { if (running || !visible || document.hidden) return; running = true; last = 0; requestAnimationFrame(frame); }
  function pause() { running = false; }
  document.addEventListener('visibilitychange', () => (document.hidden ? pause() : play()));
  new IntersectionObserver((en) => { visible = en[0].isIntersecting; visible ? play() : pause(); }).observe(tourEl);
  renderer.domElement.addEventListener('webglcontextlost', (ev) => { ev.preventDefault(); VB.toPlain && VB.toPlain('WebGL context lost'); });
  VB.tourStop = () => { pause(); VB.tourGo = null; try { renderer.dispose(); } catch (e) {} glHost.innerHTML = ''; cssHost.innerHTML = ''; };
  VB.tourJumpU = (u) => { scrollTo({ top: tourTop + u * vh, behavior: 'instant' }); cur = target = u; render(); };
  VB.tourJump = (z) => { const u = uAt(z); scrollTo({ top: tourTop + u * vh, behavior: 'instant' }); cur = target = u; render(); };   // used by automated screenshots

  W = 0; resize(); measure(); readScroll(); cur = target;
  render();
  VB.tourReady = true;
  play();
}
