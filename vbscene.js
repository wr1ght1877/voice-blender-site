/* Voice Blender: shared 3D building blocks (hero vortex, sound-wave bots, textures). */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const VB = window.VB || (window.VB = {});
export const BOT_COLORS = ['#2f8bff', '#ff3dc8', '#2ee86f', '#ffa424', '#9b5cff'];

/* Hero: two mirrored particle vortexes, core glow, tiny figure, white waveform, five streams + sound-wave bots.
   `world` goes in the main (bloomed) scene; `front` holds crisp sprites drawn after bloom. */
export function createHero({ small = false } = {}) {
  const BOTS = VB.BOTS || [];
  const world = new THREE.Group();
  const front = new THREE.Group();

  const N = small ? 4200 : 9000;
  const seed = new Float32Array(N * 4), side = new Float32Array(N), col = new Float32Array(N * 3);
  const blues = ['#5aa0ff', '#3c78ff', '#8cd2ff', '#6e82ff', '#b8e2ff', '#2f8bff'].map(h => new THREE.Color(h));
  const botCols = [...BOT_COLORS, '#22d3ee'].map(h => new THREE.Color(h));
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
    uniforms: { uTime: { value: 0 }, uR: { value: 4.4 }, uH: { value: 3.0 }, uPixel: { value: 30 }, uFade: { value: 1 } },
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
        float dist = max(-mv.z, 0.05);
        float bok = smoothstep(7.0, 4.2, dist);
        vAlpha = smoothstep(0.0, 0.07, u) * smoothstep(1.0, 0.72, u) * mix(1.0, 0.22, bok) * step(0.0, -mv.z);
        vColor = aColor * (1.2 - u * 0.4);
        gl_PointSize = min(aSeed.w * uPixel * (1.0 + bok * 3.5) / dist, 90.0);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform float uFade;
      varying vec3 vColor; varying float vAlpha;
      void main(){
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d);
        float core = smoothstep(0.2, 0.0, d);
        gl_FragColor = vec4(vColor * a + vec3(core * 0.8), a * vAlpha * uFade);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  });
  world.add(new THREE.Points(vg, vortexMat));

  const glowTex = radialTexture([[0, 'rgba(255,255,255,1)'], [0.12, 'rgba(170,205,255,.85)'], [0.4, 'rgba(70,120,255,.25)'], [1, 'rgba(40,60,200,0)']]);
  const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  core.scale.setScalar(2.4); world.add(core);

  const fig = new THREE.Sprite(new THREE.SpriteMaterial({ map: figureTexture(), transparent: true, depthWrite: false, toneMapped: false }));
  fig.scale.set(0.34, 0.68, 1); fig.position.set(0, -0.03, 0.05);
  fig.renderOrder = 5; front.add(fig);

  const voice = new THREE.Group(); world.add(voice);
  const BARS = small ? 29 : 41, WAVE_W = 2.3, WAVE_Y = 1.25;
  const bars = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), BARS);
  voice.add(bars);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, WAVE_Y, 6), new THREE.MeshBasicMaterial({ color: 0xcfe0ff, transparent: true, opacity: 0.8, toneMapped: false }));
  stem.position.y = WAVE_Y / 2 + 0.02; voice.add(stem);
  const pulses = [0, 1, 2].map(() => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 10), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, toneMapped: false })); voice.add(m); return m; });
  const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpS = new THREE.Vector3(), tmpP = new THREE.Vector3();

  const SPTS = small ? 220 : 380, LPTS = 160;
  const dot = dotTexture();
  const streams = BOTS.map((bot, i) => {
    const c = new THREE.Color(bot.color);
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(SPTS * 3), 3));
    const pc = new Float32Array(SPTS * 3), ps = new Float32Array(SPTS), offs = new Float32Array(SPTS * 3);
    for (let k = 0; k < SPTS; k++) {
      const b = 0.6 + Math.random() * 0.8;
      pc.set([c.r * b, c.g * b, c.b * b], k * 3);
      ps[k] = Math.random();
      offs.set([(Math.random() - 0.5) * 0.12, (Math.random() - 0.5) * 0.12, (Math.random() - 0.5) * 0.12], k * 3);
    }
    pg.setAttribute('color', new THREE.BufferAttribute(pc, 3));
    pg.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 10);
    world.add(new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.07, map: dot, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(LPTS * 3), 3));
    const lc = new Float32Array(LPTS * 3);
    for (let k = 0; k < LPTS; k++) { const t = k / (LPTS - 1); const a = Math.min(1, t * 6) * (1 - Math.pow(t, 5) * 0.9); lc.set([c.r * a * 1.6, c.g * a * 1.6, c.b * a * 1.6], k * 3); }
    lg.setAttribute('color', new THREE.BufferAttribute(lc, 3));
    lg.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 10);
    world.add(new THREE.Line(lg, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })));
    const sprite = makeMascot3D(bot, i, small ? 0.7 / 0.85 : 1); front.add(sprite);
    return { i, pg, ps, offs, lg, sprite };
  });

  /* soft lighting for the 3D bots (overlay scene only has these lit meshes) */
  addMascotLights(front);
  /* keep each bot turned toward the camera, with a gentle 3D sway, and animate its sound waves */
  const _q = new THREE.Quaternion(), _pq = new THREE.Quaternion(), _e = new THREE.Euler();
  let clock = 0, hooked = null;
  function faceCamera(r, sc, cam) {
    if (!front.visible) return;
    front.getWorldQuaternion(_pq).invert();
    streams.forEach((s) => {
      const m = s.sprite, t = clock + s.i * 1.7;
      _e.set(Math.sin(t * 0.7) * 0.18, Math.sin(t * 0.55) * 0.36, Math.sin(clock * 0.8 + s.i) * 0.14);
      m.quaternion.copy(_pq).multiply(cam.quaternion).multiply(_q.setFromEuler(_e));
      m.userData.update(clock + s.i * 0.9, 0.75);
    });
    front.updateMatrixWorld(true);
  }

  const P = new THREE.Vector3();
  function streamPoint(i, t, time, out) {
    const a = i * (Math.PI * 2 / 5) + t * 2.5 + time * 0.12;
    const r = Math.pow(t, 0.9) * 3.9;
    const y = r * (i - 2) * 0.16 + Math.sin(t * 9 - time * 1.6 + i) * 0.16 * t + Math.sin(t * Math.PI) * 0.25;
    return out.set(Math.cos(a) * r, y, Math.sin(a) * r * 0.85);
  }

  function update(time) {
    vortexMat.uniforms.uTime.value = time;
    core.scale.setScalar(2.2 + Math.sin(time * 0.9) * 0.18);
    for (let b = 0; b < BARS; b++) {
      const d = Math.abs(b - (BARS - 1) / 2) / ((BARS - 1) / 2);
      const n = 0.55 + 0.45 * Math.sin(time * 1.6 + b * 1.7) * Math.sin(time * 0.7 + b * 0.6);
      tmpP.set(-WAVE_W / 2 + (b + 0.5) * WAVE_W / BARS, WAVE_Y, 0);
      tmpS.set(WAVE_W / BARS * 0.42, 0.62 * Math.pow(1 - d, 1.6) * n + 0.03, 0.03);
      bars.setMatrixAt(b, tmpM.compose(tmpP, tmpQ, tmpS));
    }
    bars.instanceMatrix.needsUpdate = true;
    pulses.forEach((m, k) => { const ph = (time * 0.35 + k / 3) % 1; m.position.y = 0.05 + ph * (WAVE_Y - 0.1); m.material.opacity = (1 - ph) * 0.95; });
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
      const tt = 0.8 + Math.sin(time * 0.35 + s.i * 1.3) * 0.07;
      streamPoint(s.i, tt, time, P);
      const peel = 0.5 + 0.5 * Math.sin(time * 0.5 + s.i * 2.1);
      const rl = Math.hypot(P.x, P.z) || 1;
      s.sprite.position.set(P.x + (P.x / rl) * peel * 0.35, P.y + 0.28 + peel * 0.3, P.z + (P.z / rl) * peel * 0.35);
    });
    clock = time;
    const root = front.parent;
    if (root && root.isScene && hooked !== root) {
      const prev = root.onBeforeRender;
      root.onBeforeRender = function (r, sc, cam, ...rest) { faceCamera(r, sc, cam); return prev.call(this, r, sc, cam, ...rest); };
      hooked = root;
    }
  }
  function setPixel(h, pr) { vortexMat.uniforms.uPixel.value = h * pr * 0.034; }
  return { world, front, update, setPixel, vortexMat, core };
}

/* Sound-wave bots: each bot is its own 3D voice visual in its color (no faces).
   0 mirrored waveform, 1 radial ring, 2 bar drum on a disc, 3 VU-meter columns, 4 twisted ribbon. */
const tint = (hex, w) => new THREE.Color(hex).lerp(new THREE.Color('#ffffff'), w);
let _glowTex = null;
function glowTexture() {
  if (_glowTex) return _glowTex;
  const c = canvas(128, 128), g = c.getContext('2d'), img = g.createImageData(128, 128);
  for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
    const r = Math.hypot(x - 63.5, y - 63.5) / 64, v = r >= 1 ? 0 : Math.exp(-r * r * 5.5) * (1 - r * r) * (1 - r * r);
    const k = (y * 128 + x) * 4; img.data[k] = img.data[k + 1] = img.data[k + 2] = 255; img.data[k + 3] = Math.round(255 * v);
  }
  g.putImageData(img, 0, 0); return (_glowTex = tex(c));
}
function glowSprite(color, size, opacity) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: new THREE.Color(color), transparent: true, opacity, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending }));
  s.scale.setScalar(size); return s;
}
function makeBar(r, mat) {
  const g = new THREE.Group();
  const cyl = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, 16, 1, true), mat);
  const capGeo = new THREE.SphereGeometry(r, 16, 8);
  const a = new THREE.Mesh(capGeo, mat), b = new THREE.Mesh(capGeo, mat);
  g.add(cyl, a, b);
  g.userData.setLen = (h) => { h = Math.max(h, 0.001); cyl.scale.y = h; a.position.y = h / 2; b.position.y = -h / 2; };
  g.userData.setLen(1); return g;
}
export function soundwaveBot(i, { coreGlow: withCoreGlow = true } = {}) {
  const color = new THREE.Color(BOT_COLORS[i]);
  const root = new THREE.Group();
  const mat = new THREE.MeshPhysicalMaterial({ color, emissive: color, emissiveIntensity: 0.32, roughness: 0.22, metalness: 0.15, clearcoat: 1, clearcoatRoughness: 0.1 });
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.15, 24, 16), new THREE.MeshBasicMaterial({ color: tint(BOT_COLORS[i], 0.75) }));
  const coreGlow = withCoreGlow ? glowSprite(color, 1.3, 0.85) : null;
  const bars = [];
  const add = (obj, base, phase, place) => { root.add(obj); bars.push({ obj, base, phase, place }); };
  let holder = root;
  if (i === 0) {
    const n = 9;
    for (let k = 0; k < n; k++) {
      const env = Math.exp(-Math.pow((k - 4) / 2.6, 2)), b = makeBar(0.075, mat); b.position.x = (k - (n - 1) / 2) * 0.24;
      add(b, 0.35 + 1.45 * env * (0.75 + 0.25 * Math.cos(k * 2.1)), k * 0.7, (h) => b.userData.setLen(h));
    }
    core.position.set(0, 0, 0.32);
  } else if (i === 1) {
    const n = 18;
    for (let k = 0; k < n; k++) {
      const ang = (k / n) * Math.PI * 2, b = makeBar(0.06, mat), dx = Math.cos(ang), dy = Math.sin(ang); b.rotation.z = ang - Math.PI / 2;
      add(b, k % 2 ? 0.3 : 0.55 + 0.15 * Math.sin(k), k * 0.9, (h) => { b.userData.setLen(h); const r = 0.42 + h / 2; b.position.set(dx * r, dy * r, 0); });
    }
    root.add(new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.035, 12, 48), mat));
  } else if (i === 2) {
    const n = 16, R = 0.72; holder = new THREE.Group(); holder.rotation.x = 0.42; root.add(holder);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.16, R + 0.2, 0.08, 40), new THREE.MeshPhysicalMaterial({ color: '#141a3a', roughness: 0.3, metalness: 0.6, clearcoat: 1 }));
    disc.position.y = -0.62; holder.add(disc);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(R + 0.18, 0.02, 8, 48), new THREE.MeshBasicMaterial({ color: tint(BOT_COLORS[i], 0.3) }));
    rim.rotation.x = Math.PI / 2; rim.position.y = -0.58; holder.add(rim);
    for (let k = 0; k < n; k++) {
      const ang = (k / n) * Math.PI * 2, b = makeBar(0.065, mat);
      b.position.set(Math.cos(ang) * R, 0, Math.sin(ang) * R); holder.add(b);
      bars.push({ obj: b, base: 0.45 + 0.75 * (0.5 + 0.5 * Math.sin(ang * 2 + 0.6)), phase: k * 0.6, place: (h) => { b.userData.setLen(h); b.position.y = -0.55 + h / 2; } });
    }
    core.position.set(0, -0.05, 0);
  } else if (i === 3) {
    const seg = new RoundedBoxGeometry(0.24, 0.13, 0.24, 2, 0.05);
    [2, 3, 5, 3, 2].forEach((cnt, c) => {
      const col = new THREE.Group(); col.position.x = (c - 2) * 0.33; root.add(col);
      for (let s = -cnt; s <= cnt; s++) { if (!s) continue; const m = new THREE.Mesh(seg, mat); m.position.y = Math.sign(s) * (Math.abs(s) - 0.5) * 0.17; col.add(m); }
      bars.push({ obj: col, base: 1, phase: c * 1.3, place: (h) => col.scale.set(1, 0.85 + 0.15 * h, 1) });
    });
    core.position.set(0, 0, 0.3);
  } else {
    const n = 15;
    for (let k = 0; k < n; k++) {
      const piv = new THREE.Group(), b = makeBar(0.058, mat); piv.add(b);
      piv.position.x = (k - (n - 1) / 2) * 0.15; piv.rotation.x = k * 0.2 - 1.4; root.add(piv);
      const env = Math.sin((k + 0.5) / n * Math.PI);
      bars.push({ obj: piv, base: 0.3 + 1.4 * env * (0.7 + 0.3 * Math.sin(k * 1.7)), phase: k * 0.5, place: (h) => b.userData.setLen(h) });
    }
  }
  holder.add(core); if (coreGlow) { coreGlow.position.copy(core.position); holder.add(coreGlow); }
  root.userData.fade = 1;
  root.userData.update = (t, talk = 0.6) => {
    for (const b of bars) b.place(b.base * (0.72 + 0.28 * talk * (0.5 + 0.5 * Math.sin(t * 5.5 + b.phase))));
    const p = 0.75 + 0.25 * Math.sin(t * 4.2 + i);
    core.scale.setScalar(0.85 + 0.3 * p);
    if (coreGlow) coreGlow.material.opacity = (0.45 + 0.4 * p) * root.userData.fade;
  };
  root.userData.update(1.3 * i, 0.6);
  return root;
}

/* Static sound-wave bot for background floaters: same look, merged into a few meshes (cheap to draw). */
const _floatGeo = {};
function floatParts(i) {
  if (_floatGeo[i]) return _floatGeo[i];
  const bot = soundwaveBot(i, { coreGlow: false }); bot.updateMatrixWorld(true);
  const groups = new Map();
  bot.traverse((o) => {
    if (!o.isMesh) return;
    const g = o.geometry.clone().applyMatrix4(o.matrixWorld);
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal'].includes(k)) g.deleteAttribute(k);
    const key = o.material.uuid; if (!groups.has(key)) groups.set(key, { mat: o.material, geos: [] });
    groups.get(key).geos.push(g.index ? g.toNonIndexed() : g);
  });
  return (_floatGeo[i] = [...groups.values()].map(({ mat, geos }) => ({ mat, geo: mergeGeometries(geos) })));
}
export function makeBotShape(i, scale = 1) {
  const g = new THREE.Group();
  floatParts(i).forEach(({ mat, geo }) => g.add(new THREE.Mesh(geo, mat)));
  g.scale.setScalar(scale * 0.72);
  return g;
}

/* The bots in the opening tornado and the team section: animated sound-wave bots.
   Sized to match the old mascot sprites (body radius ~0.17 world units). */
const MASCOT_S = 0.195 * 0.85;
const BOT_K = 1.3;    // sound-wave bot units -> mascot units (about the old mascot width)
export function addMascotLights(group) {
  const hemiL = new THREE.HemisphereLight(0xffffff, 0x3a2a90, 1.0); group.add(hemiL);
  const keyL = new THREE.DirectionalLight(0xffffff, 2.0); keyL.position.set(-2.5, 4, 6); group.add(keyL);
  const rimL = new THREE.DirectionalLight(0xb8c8ff, 1.2); rimL.position.set(3, -1, -2); group.add(rimL);
  return group;
}
export const MASCOT_SIZE = MASCOT_S;
export function makeMascot3D(bot, i, scale = 1, { glow: withGlow = true } = {}) {
  const s = MASCOT_S, root = new THREE.Group();
  const body = soundwaveBot(i); body.scale.setScalar(s * BOT_K);
  root.add(body);
  if (withGlow) {
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: radialTexture([[0, bot.color + 'aa'], [0.45, bot.color + '44'], [1, bot.color + '00']]), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false }));
    glow.scale.setScalar(s * 5); glow.position.z = -s * 0.6; glow.renderOrder = 9; root.add(glow);
  }
  root.userData.bot = body;
  root.userData.update = (t, talk) => body.userData.update(t, talk);
  root.userData.setFade = (f) => { body.userData.fade = f; };
  root.scale.setScalar(scale);
  root.traverse((o) => { if (o.isMesh) o.renderOrder = 10; });
  return root;
}

/* ---------- textures ---------- */
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function tex(c) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
export function radialTexture(stops) {
  const c = canvas(128, 128), g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  stops.forEach(([o, s]) => gr.addColorStop(o, s));
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  return tex(c);
}
let _dot;
export function dotTexture() {
  return _dot || (_dot = radialTexture([[0, 'rgba(255,255,255,1)'], [0.25, 'rgba(255,255,255,.8)'], [0.6, 'rgba(255,255,255,.15)'], [1, 'rgba(255,255,255,0)']]));
}
export function makeBackground() {
  const c = canvas(512, 512), g = c.getContext('2d');
  g.fillStyle = '#070a24'; g.fillRect(0, 0, 512, 512);
  [[256, 215, 260, 'rgba(40,70,200,.75)'], [60, 80, 230, 'rgba(47,139,255,.35)'], [470, 90, 230, 'rgba(255,61,200,.32)'], [60, 470, 230, 'rgba(46,232,111,.18)'], [470, 460, 240, 'rgba(255,164,36,.22)'], [256, 40, 200, 'rgba(155,92,255,.35)']]
    .forEach(([x, y, r, col]) => { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 512, 512); });
  return tex(c);
}
export function mascotTexture(bot, px = 256) {
  const c = canvas(px, px), g = c.getContext('2d');
  VB.drawMascot(g, bot, px / 2, px / 2, px * 0.195, { lookY: 0.25 });
  const t = tex(c); t.anisotropy = 4; return t;
}
function figureTexture() {
  const w = 128, h = 256, c = canvas(w, h), g = c.getContext('2d');
  const cx = w / 2, headR = 13, hy = h / 2 - 4;
  g.shadowColor = 'rgba(140,195,255,1)'; g.shadowBlur = 14; g.fillStyle = '#02030c';
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
  return tex(c);
}
