/* Voice Blender: shared 3D building blocks (hero vortex, mascots, glass bot shapes, textures). */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const VB = window.VB || (window.VB = {});
export const BOT_COLORS = ['#2f8bff', '#ff3dc8', '#2ee86f', '#ffa424', '#9b5cff'];

/* Hero: two mirrored particle vortexes, core glow, tiny figure, white waveform, five streams + mascots.
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
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: mascotTexture(bot), transparent: true, depthWrite: false, toneMapped: false }));
    sprite.scale.setScalar(small ? 0.7 : 0.85); sprite.renderOrder = 10; front.add(sprite);
    return { i, pg, ps, offs, lg, sprite };
  });

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
      s.sprite.material.rotation = Math.sin(time * 0.8 + s.i) * 0.14;
    });
  }
  function setPixel(h, pr) { vortexMat.uniforms.uPixel.value = h * pr * 0.034; }
  return { world, front, update, setPixel, vortexMat, core };
}

/* Glossy 3D versions of the five bot shapes. */
export function glassMaterial(c, opacity = 0.88) {
  return new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.18, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.1, emissive: new THREE.Color(c).multiplyScalar(0.25), transparent: opacity < 1, opacity });
}
export function makeBotShape(i, scale = 1) {
  const c = BOT_COLORS[i];
  let m;
  if (i === 0) m = new THREE.Mesh(new THREE.SphereGeometry(0.7, 32, 24), glassMaterial(c));
  else if (i === 1) {
    const s = new THREE.Shape(), R = 1, k = 0.3;
    s.moveTo(0, R); s.quadraticCurveTo(k, k, R, 0); s.quadraticCurveTo(k, -k, 0, -R); s.quadraticCurveTo(-k, -k, -R, 0); s.quadraticCurveTo(-k, k, 0, R);
    m = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.35, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.08, bevelSegments: 4, curveSegments: 16 }).center(), glassMaterial(c));
  } else if (i === 2) m = new THREE.Mesh(new RoundedBoxGeometry(1.2, 1.2, 1.2, 4, 0.3), glassMaterial(c));
  else if (i === 3) { m = new THREE.Mesh(new RoundedBoxGeometry(1.1, 1.1, 1.1, 4, 0.25), glassMaterial(c)); m.rotation.z = Math.PI / 4; }
  else {
    m = new THREE.Group();
    [[-0.55, -0.1, 0.45], [0, 0.15, 0.62], [0.55, -0.08, 0.45], [0, -0.3, 0.5]].forEach(([x, y, s]) => { const b = new THREE.Mesh(new THREE.SphereGeometry(s, 24, 18), glassMaterial(c)); b.position.set(x, y, 0); m.add(b); });
  }
  m.scale.setScalar(scale);
  return m;
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
