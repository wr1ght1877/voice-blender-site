/* Voice Blender: 3D hero (three.js r169 from jsDelivr, pinned).
   Tiny figure between two mirrored particle vortexes, a white voice waveform rising
   from the mouth, and five colored streams with the bot mascots peeling off.
   Falls back to the 2D canvas (vortex2d.js) if WebGL or the CDN is unavailable. */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const VB = window.VB || (window.VB = {});

function start() {
  if (VB.heroMode) return; // fallback already running
  const host = document.getElementById('hero3d');
  const hero = document.querySelector('.hero');
  if (!host || !hero) return;

  const reduce = !!VB.reduceMotion;
  const BOTS = VB.BOTS || [];
  const small = Math.min(window.innerWidth, window.innerHeight) < 700;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: !small, powerPreference: 'high-performance' });
    if (!renderer.getContext()) throw new Error('no context');
  } catch (e) {
    VB.useFallback && VB.useFallback('WebGL unavailable');
    return;
  }
  VB.heroMode = '3d';
  hero.classList.add('mode-3d');
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.5 : 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = makeBackground();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  const world = new THREE.Group();
  scene.add(world);
  // mascots + figure render after bloom so their faces stay crisp
  const overlay = new THREE.Scene();
  const front = new THREE.Group();
  overlay.add(front);

  /* ---------- lights (colorful) ---------- */
  scene.add(new THREE.AmbientLight(0x6070ff, 0.5));
  const lightDefs = [[0x2f8bff, -5, 3, 3], [0xff3dc8, 5, 2, 2], [0x2ee86f, -4, -3, 2], [0xffa424, 4, -3, 3], [0x9b5cff, 0, 4, -2]];
  const lights = lightDefs.map(([c, x, y, z]) => { const l = new THREE.PointLight(c, 40, 18, 1.6); l.position.set(x, y, z); scene.add(l); return l; });

  /* ---------- mirrored particle vortexes (GPU animated) ---------- */
  const N = small ? 4200 : 9000;
  const seed = new Float32Array(N * 4), side = new Float32Array(N), col = new Float32Array(N * 3);
  const blues = ['#5aa0ff', '#3c78ff', '#8cd2ff', '#6e82ff', '#b8e2ff', '#2f8bff'].map(h => new THREE.Color(h));
  const botCols = ['#2f8bff', '#ff3dc8', '#2ee86f', '#ffa424', '#9b5cff', '#22d3ee'].map(h => new THREE.Color(h));
  for (let i = 0; i < N; i++) {
    seed[i * 4] = Math.random();
    seed[i * 4 + 1] = Math.random() * Math.PI * 2;
    seed[i * 4 + 2] = 0.4 + Math.random() * 0.8;
    seed[i * 4 + 3] = (0.6 + Math.random() * 1.2) * (Math.random() < 0.04 ? 2.6 : 1);
    side[i] = i % 2 ? 1 : -1;
    const c = Math.random() < 0.26 ? botCols[(Math.random() * botCols.length) | 0] : blues[(Math.random() * blues.length) | 0];
    col.set([c.r, c.g, c.b], i * 3);
  }
  const vg = new THREE.BufferGeometry();
  vg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
  vg.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
  vg.setAttribute('aSide', new THREE.BufferAttribute(side, 1));
  vg.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
  vg.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 10);
  const vortexMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uR: { value: 4.4 }, uH: { value: 3.0 }, uPixel: { value: 30 } },
    vertexShader: `
      attribute vec4 aSeed; attribute float aSide; attribute vec3 aColor;
      uniform float uTime, uR, uH, uPixel;
      varying vec3 vColor; varying float vAlpha;
      void main(){
        float u = fract(aSeed.x - uTime * aSeed.z * 0.035);
        float r = u * uR;
        float th = aSeed.y + aSide * (uTime * aSeed.z * 0.22 + 2.4 / (u + 0.2));
        vec3 p = vec3(cos(th) * r, aSide * uH * pow(u, 1.35), sin(th) * r * 0.9);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        float dist = -mv.z;
        float bok = smoothstep(7.0, 4.2, dist);               // near-camera bokeh
        vAlpha = smoothstep(0.0, 0.07, u) * smoothstep(1.0, 0.72, u) * mix(1.0, 0.22, bok);
        vColor = aColor * (1.2 - u * 0.4);
        gl_PointSize = aSeed.w * uPixel * (1.0 + bok * 3.5) / dist;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      varying vec3 vColor; varying float vAlpha;
      void main(){
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d);
        float core = smoothstep(0.2, 0.0, d);
        gl_FragColor = vec4(vColor * a + vec3(core * 0.8), a * vAlpha);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  });
  world.add(new THREE.Points(vg, vortexMat));

  /* ---------- core glow + tiny figure ---------- */
  const glowTex = radialTexture([[0, 'rgba(255,255,255,1)'], [0.12, 'rgba(170,205,255,.85)'], [0.4, 'rgba(70,120,255,.25)'], [1, 'rgba(40,60,200,0)']]);
  const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  core.scale.setScalar(2.4); world.add(core);

  const fig = new THREE.Sprite(new THREE.SpriteMaterial({ map: figureTexture(), transparent: true, depthWrite: false, toneMapped: false }));
  fig.scale.set(0.34, 0.68, 1); fig.position.set(0, -0.03, 0.05); fig.center.set(0.5, 0.5);
  fig.renderOrder = 5; front.add(fig);

  /* ---------- white voice waveform rising from the mouth ---------- */
  const voice = new THREE.Group(); world.add(voice);
  const BARS = small ? 29 : 41, WAVE_W = 2.3, WAVE_Y = 1.25;
  const barMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  const bars = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), barMat, BARS);
  voice.add(bars);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, WAVE_Y, 6), new THREE.MeshBasicMaterial({ color: 0xcfe0ff, transparent: true, opacity: 0.8, toneMapped: false }));
  stem.position.y = WAVE_Y / 2 + 0.02; voice.add(stem);
  const pulses = [0, 1, 2].map(() => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 10), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, toneMapped: false })); voice.add(m); return m; });
  const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpS = new THREE.Vector3(), tmpP = new THREE.Vector3();

  /* ---------- five colored streams + mascots ---------- */
  const SPTS = small ? 220 : 380, LPTS = 160;
  const streams = BOTS.map((bot, i) => {
    const c = new THREE.Color(bot.color);
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(SPTS * 3), 3));
    const pc = new Float32Array(SPTS * 3), ps = new Float32Array(SPTS);
    const offs = new Float32Array(SPTS * 3);
    for (let k = 0; k < SPTS; k++) {
      const b = 0.6 + Math.random() * 0.8;
      pc.set([c.r * b, c.g * b, c.b * b], k * 3);
      ps[k] = Math.random();
      offs.set([(Math.random() - 0.5) * 0.12, (Math.random() - 0.5) * 0.12, (Math.random() - 0.5) * 0.12], k * 3);
    }
    pg.setAttribute('color', new THREE.BufferAttribute(pc, 3));
    pg.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 10);
    const pts = new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.07, map: dotTexture(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true }));
    world.add(pts);

    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(LPTS * 3), 3));
    const lc = new Float32Array(LPTS * 3);
    for (let k = 0; k < LPTS; k++) { const t = k / (LPTS - 1); const a = Math.min(1, t * 6) * (1 - Math.pow(t, 5) * 0.9); lc.set([c.r * a * 1.6, c.g * a * 1.6, c.b * a * 1.6], k * 3); }
    lg.setAttribute('color', new THREE.BufferAttribute(lc, 3));
    lg.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 10);
    const line = new THREE.Line(lg, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    world.add(line);

    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: mascotTexture(bot), transparent: true, depthWrite: false, toneMapped: false }));
    sprite.scale.setScalar(small ? 0.7 : 0.85); sprite.renderOrder = 10; front.add(sprite);
    return { i, pts, pg, ps, offs, line, lg, sprite };
  });

  const P = new THREE.Vector3();
  function streamPoint(i, t, time, out) {
    const base = i * (Math.PI * 2 / 5);
    const a = base + t * 2.5 + time * 0.12;
    const r = Math.pow(t, 0.9) * 3.9;
    const incl = (i - 2) * 0.16;
    const y = r * incl + Math.sin(t * 9 - time * 1.6 + i) * 0.16 * t + Math.sin(t * Math.PI) * 0.25;
    return out.set(Math.cos(a) * r, y, Math.sin(a) * r * 0.85);
  }

  /* ---------- glassy 3D bot shapes floating in the depth ---------- */
  const shapes = new THREE.Group(); scene.add(shapes);
  const glass = (c) => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.18, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.1, emissive: new THREE.Color(c).multiplyScalar(0.25), transparent: true, opacity: 0.88 });
  const starShape = new THREE.Shape();
  { const R = 1, k = 0.3; starShape.moveTo(0, R); starShape.quadraticCurveTo(k, k, R, 0); starShape.quadraticCurveTo(k, -k, 0, -R); starShape.quadraticCurveTo(-k, -k, -R, 0); starShape.quadraticCurveTo(-k, k, 0, R); }
  const cloud = new THREE.Group();
  [[-0.55, -0.1, 0.45], [0, 0.15, 0.62], [0.55, -0.08, 0.45], [0, -0.3, 0.5]].forEach(([x, y, s]) => { const m = new THREE.Mesh(new THREE.SphereGeometry(s, 24, 18), glass('#9b5cff')); m.position.set(x, y, 0); cloud.add(m); });
  const shapeDefs = [
    [new THREE.Mesh(new THREE.SphereGeometry(0.7, 32, 24), glass('#2f8bff')), -6.2, 2.2, -5],
    [new THREE.Mesh(new THREE.ExtrudeGeometry(starShape, { depth: 0.35, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.08, bevelSegments: 4, curveSegments: 16 }).center(), glass('#ff3dc8')), 6.4, 2.0, -5.5],
    [new THREE.Mesh(new RoundedBoxGeometry(1.2, 1.2, 1.2, 4, 0.3), glass('#2ee86f')), -6.8, -2.4, -6],
    [new THREE.Mesh(new RoundedBoxGeometry(1.1, 1.1, 1.1, 4, 0.25), glass('#ffa424')), 6.6, -2.2, -5.2],
    [cloud, 0.4, 4.4, -8]
  ];
  shapeDefs.forEach(([m, x, y, z], i) => { m.position.set(x, y, z); m.userData.base = new THREE.Vector3(x, y, z); m.userData.i = i; if (i === 3) m.rotation.z = Math.PI / 4; shapes.add(m); });

  /* ---------- post: bloom ---------- */
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.7, 0.5, 0.28);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  /* ---------- layout, parallax ---------- */
  let W = 1, H = 1, baseZ = 9, worldY = 0.7;
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  let scrollP = 0;
  function resize() {
    W = host.clientWidth || window.innerWidth; H = host.clientHeight || window.innerHeight;
    renderer.setSize(W, H, false);
    composer.setSize(W, H);
    camera.aspect = W / H; camera.updateProjectionMatrix();
    const aspect = W / H;
    baseZ = aspect < 0.75 ? 15.5 : aspect < 1.2 ? 12 : 9.2;
    worldY = aspect < 0.75 ? 1.9 : aspect < 1.2 ? 1.2 : 0.75;
    vortexMat.uniforms.uPixel.value = H * renderer.getPixelRatio() * 0.034;
    if (reduce || !running) renderFrame(6);
  }
  if (!reduce) {
    window.addEventListener('pointermove', (e) => { mouse.tx = (e.clientX / window.innerWidth) * 2 - 1; mouse.ty = (e.clientY / window.innerHeight) * 2 - 1; }, { passive: true });
    window.addEventListener('deviceorientation', (e) => { if (e.gamma == null) return; mouse.tx = Math.max(-1, Math.min(1, e.gamma / 30)); mouse.ty = Math.max(-1, Math.min(1, (e.beta - 45) / 30)); }, { passive: true });
    window.addEventListener('scroll', () => { scrollP = Math.min(1, window.scrollY / Math.max(1, window.innerHeight)); }, { passive: true });
  }
  window.addEventListener('resize', resize);

  function renderFrame(time) {
    mouse.x += (mouse.tx - mouse.x) * 0.05; mouse.y += (mouse.ty - mouse.y) * 0.05;
    camera.position.set(mouse.x * 1.1, 0.35 - mouse.y * 0.6 + scrollP * 1.2, baseZ - scrollP * 2.8);
    camera.lookAt(0, worldY * 0.25 - scrollP * 0.4, 0);
    world.position.y = worldY;
    world.rotation.x = 0.12 + scrollP * 0.45;
    world.rotation.y = Math.sin(time * 0.07) * 0.18 + mouse.x * 0.12;

    vortexMat.uniforms.uTime.value = time;
    core.scale.setScalar(2.2 + Math.sin(time * 0.9) * 0.18);

    // voice waveform
    for (let b = 0; b < BARS; b++) {
      const d = Math.abs(b - (BARS - 1) / 2) / ((BARS - 1) / 2);
      const env = Math.pow(1 - d, 1.6);
      const n = 0.55 + 0.45 * Math.sin(time * 1.6 + b * 1.7) * Math.sin(time * 0.7 + b * 0.6);
      const h = 0.62 * env * n + 0.03;
      tmpP.set(-WAVE_W / 2 + (b + 0.5) * WAVE_W / BARS, WAVE_Y, 0);
      tmpS.set(WAVE_W / BARS * 0.42, h, 0.03);
      bars.setMatrixAt(b, tmpM.compose(tmpP, tmpQ, tmpS));
    }
    bars.instanceMatrix.needsUpdate = true;
    pulses.forEach((m, k) => { const ph = (time * 0.35 + k / 3) % 1; m.position.y = 0.05 + ph * (WAVE_Y - 0.1); m.material.opacity = (1 - ph) * 0.95; });

    // streams + mascots
    streams.forEach((s) => {
      const lp = s.lg.attributes.position.array;
      for (let k = 0; k < LPTS; k++) { streamPoint(s.i, k / (LPTS - 1), time, P); lp[k * 3] = P.x; lp[k * 3 + 1] = P.y; lp[k * 3 + 2] = P.z; }
      s.lg.attributes.position.needsUpdate = true;
      const pp = s.pg.attributes.position.array;
      for (let k = 0; k < SPTS; k++) {
        const t = (s.ps[k] + time * 0.06) % 1;
        streamPoint(s.i, t, time, P);
        const spread = 0.3 + t * 2.2;
        pp[k * 3] = P.x + s.offs[k * 3] * spread; pp[k * 3 + 1] = P.y + s.offs[k * 3 + 1] * spread; pp[k * 3 + 2] = P.z + s.offs[k * 3 + 2] * spread;
      }
      s.pg.attributes.position.needsUpdate = true;
      // mascot rides near the end and peels off the stream
      const tt = 0.8 + Math.sin(time * 0.35 + s.i * 1.3) * 0.07;
      streamPoint(s.i, tt, time, P);
      const peel = 0.5 + 0.5 * Math.sin(time * 0.5 + s.i * 2.1);
      const rl = Math.hypot(P.x, P.z) || 1;
      s.sprite.position.set(P.x + (P.x / rl) * peel * 0.35, P.y + 0.28 + peel * 0.3, P.z + (P.z / rl) * peel * 0.35);
      s.sprite.material.rotation = Math.sin(time * 0.8 + s.i) * 0.14;
    });

    // floating glass shapes
    shapes.children.forEach((m) => {
      const b = m.userData.base, i = m.userData.i;
      m.position.set(b.x - mouse.x * 0.8, b.y + Math.sin(time * 0.6 + i) * 0.25 + mouse.y * 0.5, b.z);
      m.rotation.x = time * 0.15 + i; m.rotation.y = time * 0.22 + i * 0.5;
    });
    lights.forEach((l, i) => { l.position.x = lightDefs[i][1] + Math.sin(time * 0.4 + i) * 1.2; });

    composer.render();
    front.position.copy(world.position); front.rotation.copy(world.rotation);
    renderer.autoClear = false;
    renderer.clearDepth();
    renderer.render(overlay, camera);
    renderer.autoClear = true;
  }

  /* ---------- loop ---------- */
  let running = false, visible = true, t0 = performance.now(), elapsed = 6, last = 0;
  function frame(now) {
    if (!running) return;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0; last = now;
    elapsed += dt;
    renderFrame(elapsed);
    requestAnimationFrame(frame);
  }
  function play() { if (reduce || running || !visible || document.hidden) return; running = true; last = 0; requestAnimationFrame(frame); }
  function pause() { running = false; }
  document.addEventListener('visibilitychange', () => (document.hidden ? pause() : play()));
  if ('IntersectionObserver' in window) new IntersectionObserver((en) => { visible = en[0].isIntersecting; visible ? play() : pause(); }).observe(hero);
  renderer.domElement.addEventListener('webglcontextlost', (e) => { e.preventDefault(); pause(); host.innerHTML = ''; VB.heroMode = null; hero.classList.remove('mode-3d'); VB.useFallback && VB.useFallback('WebGL context lost'); });

  resize();
  renderFrame(6);
  VB.hero3dReady = true;
  if (!reduce) play();
}

/* ---------- textures ---------- */
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function radialTexture(stops) {
  const c = canvas(128, 128), g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  stops.forEach(([o, s]) => gr.addColorStop(o, s));
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
let _dot;
function dotTexture() {
  if (_dot) return _dot;
  _dot = radialTexture([[0, 'rgba(255,255,255,1)'], [0.25, 'rgba(255,255,255,.8)'], [0.6, 'rgba(255,255,255,.15)'], [1, 'rgba(255,255,255,0)']]);
  return _dot;
}
function makeBackground() {
  const c = canvas(512, 512), g = c.getContext('2d');
  g.fillStyle = '#070a24'; g.fillRect(0, 0, 512, 512);
  const blobs = [[256, 215, 260, 'rgba(40,70,200,.75)'], [60, 80, 230, 'rgba(47,139,255,.35)'], [470, 90, 230, 'rgba(255,61,200,.32)'], [60, 470, 230, 'rgba(46,232,111,.18)'], [470, 460, 240, 'rgba(255,164,36,.22)'], [256, 40, 200, 'rgba(155,92,255,.35)']];
  blobs.forEach(([x, y, r, col]) => { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 512, 512); });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function mascotTexture(bot) {
  const c = canvas(256, 256), g = c.getContext('2d');
  VB.drawMascot(g, bot, 128, 128, 50, { lookY: 0.25 });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function figureTexture() {
  // tiny dark silhouette with a blue rim glow; mouth sits at the texture center
  const w = 128, h = 256, c = canvas(w, h), g = c.getContext('2d');
  const cx = w / 2, headR = 13, hy = h / 2 - 4;
  g.shadowColor = 'rgba(140,195,255,1)'; g.shadowBlur = 14;
  g.fillStyle = '#02030c';
  for (let pass = 0; pass < 2; pass++) {
    g.beginPath(); g.arc(cx, hy, headR, 0, Math.PI * 2); g.fill();
    const top = hy + headR * 0.9, sw = 22, fh = 100;
    g.beginPath();
    g.moveTo(cx - 5, top); g.lineTo(cx + 5, top);
    g.quadraticCurveTo(cx + sw, top + 3, cx + sw, top + 12);
    g.lineTo(cx + sw * 0.8, top + fh * 0.45); g.lineTo(cx + sw * 0.5, top + fh * 0.47);
    g.lineTo(cx + sw * 0.55, top + fh * 0.86); g.lineTo(cx + sw * 0.12, top + fh * 0.86);
    g.lineTo(cx, top + fh * 0.5); g.lineTo(cx - sw * 0.12, top + fh * 0.86);
    g.lineTo(cx - sw * 0.55, top + fh * 0.86); g.lineTo(cx - sw * 0.5, top + fh * 0.47);
    g.lineTo(cx - sw * 0.8, top + fh * 0.45); g.lineTo(cx - sw, top + 12);
    g.quadraticCurveTo(cx - sw, top + 3, cx - 5, top); g.closePath(); g.fill();
    g.shadowBlur = 0;
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

try { start(); }
catch (e) { console.warn('Voice Blender 3D hero failed:', e); VB.heroMode = null; const h = document.getElementById('hero3d'); if (h) h.innerHTML = ''; VB.useFallback && VB.useFallback('3D error'); }
