// FUTURA · schede prodotto v2 · motore 3D in tempo reale (three r185 vendorizzato, MIT).
// Geometria VERA dai file CNC (assets/3d/*.json, preparati da _strumenti/prepara_v2.py). Un solo motore per i 4 prodotti.
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const CORRE = ["scia", "onda", "riempimento", "scintille"];   // effetti in cui la luce corre lungo il tratto
export const MODI = { fisso: 0, dimmer: 1, fluido: 2, staccato: 3, scia: 4, onda: 5, respiro: 6, riempimento: 7, scintille: 8 };
const TELEFONO = matchMedia("(pointer: coarse)").matches || innerWidth < 700;
const LUCI_MAX = TELEFONO ? 4 : 8;                       // al massimo 4 luci sul telefono
const SCALA = { "120": 1, "140": 144 / 124, "160": 163 / 124 };
// esploso: un solo asse (la perpendicolare alla parete), vano costante in frazioni dell'ALTEZZA dell'insegna, camera di tre quarti
// come l'ancora v5_3_tretquarti (speculare: da destra, così le lastre dietro sporgono verso la colonna della legenda).
// luceMin: quanto resta acceso il neon a pila aperta (il resto torna quando la pila si chiude)
const ESPLOSO = Object.assign({ vano: 0.3, az: 0.55, el: 0.38, gioco: 0.06, luceMin: 0.45, luceMinInfinity: 0.9 }, globalThis.__ESPLOSO || {});

// ---------- intensità: stessa formula nello shader e sulla CPU ----------
const fr = x => x - Math.floor(x);
const hash = x => fr(Math.sin(x * 127.1) * 43758.5453);
export function intensita(s, t, u) {
  const v = s.velocita, m = MODI[s.modo];
  if (m === 1) return 0.06 + 0.94 * s.livello;
  if (m === 2) return 0.1 + 0.9 * (0.5 + 0.5 * Math.sin(t * (0.4 + 2.6 * v) * 6.2832));
  if (m === 3) return fr(t * (1 + 9 * v)) < 0.5 ? 1 : 0.02;
  if (m === 4) { const d = fr(fr(t * (0.08 + 0.5 * v)) - u); return 0.16 + Math.exp(-d * 4.5) * 1.35; }
  if (m === 5) return 0.12 + 0.88 * (0.5 + 0.5 * Math.sin(6.2832 * (u * 3 - t * (0.2 + 1.2 * v))));
  if (m === 6) return 0.1 + 0.9 * Math.pow(0.5 + 0.5 * Math.sin(t * (0.3 + 1.2 * v) * 6.2832), 2);
  if (m === 7) return u < fr(t * (0.1 + 0.4 * v)) ? 1 : 0.05;
  if (m === 8) return hash(Math.floor(u * 60) + Math.floor(t * (2 + 10 * v)) * 7.3) > 0.78 ? 1.1 : 0.12;
  return 1;
}
const GLSL_INTENSITA = `
float fr1(float x){ return x - floor(x); }
float hs(float x){ return fr1(sin(x * 127.1) * 43758.5453); }
float intenF(float t, float u, float fase){
  float v = uVel; float m = uModo;
  if (m < 0.5) return 1.0;
  if (m < 1.5) return 0.06 + 0.94 * uLivello;
  if (m < 2.5) return 0.1 + 0.9 * (0.5 + 0.5 * sin(t * (0.4 + 2.6 * v) * 6.2832));
  if (m < 3.5) return fr1(t * (1.0 + 9.0 * v)) < 0.5 ? 1.0 : 0.02;
  if (m < 4.5) { float d = fr1(fr1(t * (0.08 + 0.5 * v) + fase) - u); return 0.16 + exp(-d * 4.5) * 1.35; }
  if (m < 5.5) return 0.12 + 0.88 * (0.5 + 0.5 * sin(6.2832 * (u * 3.0 - t * (0.2 + 1.2 * v))));
  if (m < 6.5) { float b = 0.5 + 0.5 * sin(t * (0.3 + 1.2 * v) * 6.2832); return 0.1 + 0.9 * b * b; }
  if (m < 7.5) return u < fr1(t * (0.1 + 0.4 * v)) ? 1.0 : 0.05;
  return hs(floor(u * 60.0) + floor(t * (2.0 + 10.0 * v)) * 7.3) > 0.78 ? 1.1 : 0.12;
}
float inten(float t, float u){ return intenF(t, u, uFase); }`;
// il tubo: silicone lattiginoso da 6 mm. Acceso: rosso pieno col cuore appena più caldo (il bagliore fa l'alone).
// Spento: silicone bianco traslucido; nell'esploso (uEsp) si vede anche di notte.
const VERT = `varying vec2 vUv; varying vec3 vN; varying vec3 vV;
void main(){ vUv = uv; vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`;
const UNI = `uniform float uTempo, uModo, uVel, uLivello, uFase, uAtt, uAcceso, uGiorno, uEsp, uForza, uEspo; uniform vec3 uTinta; varying vec2 vUv; varying vec3 vN; varying vec3 vV;`;
const FRAG = `${UNI}
${GLSL_INTENSITA}
void main(){
  float i = inten(uTempo, vUv.x) * uAcceso * uAtt;
  float ndv = clamp(dot(normalize(vN), normalize(vV)), 0.0, 1.0);
  float nucleo = pow(ndv, 3.0);
  vec3 rosso = vec3(1.0, 0.04, 0.045);
  // sotto la soglia in cui ACES desatura il rosso verso il rosa: il colore resta pieno, l'alone lo fa il bagliore
  float ic = min(i, 1.0);   // il tubo resta ROSSO anche sulla testa della scia (oltre 1 ACES lo porterebbe al rosa)
  vec3 c = rosso * ic * (0.62 + 0.5 * nucleo);
  c += vec3(0.38, 0.03, 0.02) * pow(nucleo, 6.0) * smoothstep(0.7, 1.0, ic) * ic;
  vec3 spento = vec3(0.8, 0.78, 0.76) * (0.05 + 0.62 * max(uGiorno, 0.55 * uEsp)) * (0.35 + 0.65 * ndv);   // silicone bianco traslucido
  c += spento * (1.0 - clamp(i, 0.0, 1.0)) * uAtt;
  gl_FragColor = vec4(c * uTinta, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
const FRAG_ALONE = `${UNI}
${GLSL_INTENSITA}
// guaina d'alone: tubo più largo, additivo, che sfuma verso il bordo (Fresnel): è la luce del neon anche senza bagliore di post-produzione
void main(){ float i = inten(uTempo, vUv.x) * uAcceso * uAtt; float ndv = clamp(dot(normalize(vN), normalize(vV)), 0.0, 1.0);
  gl_FragColor = vec4(vec3(1.0, 0.035, 0.05) * uTinta * i * pow(ndv, uEspo) * uForza, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
const ALONI = [];
// alone CUOCIUTO: texture gaussiana fatta offline (morbida su ogni telefono); R/G della texture larga = posizione lungo il tratto e
// indice del tratto, letti al centro del texel (vicino esatto): così l'alone segue anche gli effetti digitali (scia, onda...)
const FRAG_COTTO = `${UNI}
uniform sampler2D tHalo, tIndice; uniform vec2 uSize; uniform float uCanale;
${GLSL_INTENSITA}
void main(){
  vec2 uvI = (floor(vUv * uSize) + 0.5) / uSize;
  vec4 ix = texture2D(tIndice, uvI);
  float fase = floor(ix.g * 255.0 / 64.0 + 0.5) * 0.25;
  float a = uCanale < 0.5 ? texture2D(tHalo, vUv).r : texture2D(tIndice, vUv).b;
  // effetti che corrono lungo il tratto: qui solo una base fissa (la luce che corre la portano gli sprite); gli altri: intensità comune
  float corre = (abs(uModo - 4.0) < 0.5 || abs(uModo - 5.0) < 0.5 || abs(uModo - 7.0) < 0.5 || abs(uModo - 8.0) < 0.5) ? 1.0 : 0.0;
  float i = mix(intenF(uTempo, 0.5, 0.0), 0.0, corre) * uAcceso * uAtt;   // tratto spento = parete spenta
  gl_FragColor = vec4(vec3(1.0, 0.035, 0.05) * uTinta * a * i * uForza * (1.0 - 0.75 * uGiorno), 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
// sprite della luce che corre: punti lungo il tratto, intensità dalla stessa formula del tubo, forma da una texture gaussiana
const VERT_SPRITE = `attribute float aU; attribute float aFase; uniform float uPx, uDim; varying float vU; varying float vF;
void main(){ vU = aU; vF = aFase; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = uDim * uPx / max(0.05, -mv.z); }`;
const FRAG_SPRITE = `${UNI}
uniform sampler2D tGauss; varying float vU; varying float vF;
${GLSL_INTENSITA}
void main(){
  float corre = (abs(uModo - 4.0) < 0.5 || abs(uModo - 5.0) < 0.5 || abs(uModo - 7.0) < 0.5 || abs(uModo - 8.0) < 0.5) ? 1.0 : 0.0;
  float a = texture2D(tGauss, gl_PointCoord).r;
  float i = max(intenF(uTempo, vU, vF) - 0.2, 0.0) / 0.8 * uAcceso * uAtt * corre;   // sopra il fondo dell'effetto: un tratto spento non illumina
  gl_FragColor = vec4(vec3(1.0, 0.035, 0.05) * a * i * uForza * (1.0 - 0.75 * uGiorno), 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
function spriteScia(neonPoly, base, z, forza) {
  const pos = [], uu = [], ff = [];
  neonPoly.forEach((pl, k) => { const L = [0]; for (let i = 1; i < pl.length; i++) L.push(L[i - 1] + Math.hypot(pl[i][0] - pl[i - 1][0], pl[i][1] - pl[i - 1][1]));
    const tot = L[L.length - 1], n = Math.max(8, Math.round(tot / 14));   // uno sprite ogni ~14 mm
    for (let j = 0; j <= n; j++) { const d = j / n * tot; let i = 1; while (i < L.length - 1 && L[i] < d) i++; const f = (d - L[i - 1]) / Math.max(1e-6, L[i] - L[i - 1]);
      pos.push((pl[i - 1][0] + (pl[i][0] - pl[i - 1][0]) * f) / 1000, (pl[i - 1][1] + (pl[i][1] - pl[i - 1][1]) * f) / 1000, z); uu.push(d / tot); ff.push(k * 0.25); } });
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("aU", new THREE.Float32BufferAttribute(uu, 1)); g.setAttribute("aFase", new THREE.Float32BufferAttribute(ff, 1));
  const u = Object.assign({}, base.uniforms, { tGauss: { value: null }, uPx: { value: 500 }, uDim: { value: 0.07 }, uForza: { value: forza }, uEspo: { value: 1 } });
  const m = new THREE.ShaderMaterial({ uniforms: u, vertexShader: VERT_SPRITE, fragmentShader: FRAG_SPRITE, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  m.userData.forza = forza; ALONI.push(m);
  const pt = new THREE.Points(g, m); pt.visible = false; pt.frustumCulled = false; return pt;
}
function materialeCotto(base, canale, forza) {
  const u = Object.assign({}, base.uniforms, { tHalo: { value: null }, tIndice: { value: null }, uSize: { value: new THREE.Vector2(1, 1) }, uCanale: { value: canale }, uForza: { value: forza }, uEspo: { value: 1 } });
  const m = new THREE.ShaderMaterial({ uniforms: u, vertexShader: VERT, fragmentShader: FRAG_COTTO, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  m.userData.forza = forza; ALONI.push(m); return m;
}   // guaine d'alone: la forza si dimezza quando c'è anche il bagliore di post-produzione
function materialeAlone(base, forza = 0.33, espo = 2.2) {
  const u = Object.assign({}, base.uniforms, { uForza: { value: forza }, uEspo: { value: espo } });
  const m = new THREE.ShaderMaterial({ uniforms: u, vertexShader: VERT, fragmentShader: FRAG_ALONE, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  m.userData.forza = forza; ALONI.push(m); return m;
}
// il neon: tubo + guaina sottile a Fresnel sul bordo; la luce intorno la fanno gli aloni cuociuti (texture)
function tuboNeon(gr, poly, z, m) {
  gr.add(new THREE.Mesh(tubo(poly, z, 0.003), m));
  gr.add(new THREE.Mesh(tubo(poly, z, 0.0052), materialeAlone(m, 0.33, 2.2)));
}
function materialeNeon(fase) {
  const u = { uTempo: { value: 0 }, uModo: { value: 0 }, uVel: { value: 0.5 }, uLivello: { value: 1 }, uFase: { value: fase },
              uAtt: { value: 1 }, uAcceso: { value: 1 }, uGiorno: { value: 0 }, uEsp: { value: 0 }, uForza: { value: 1 }, uEspo: { value: 1 }, uTinta: { value: new THREE.Vector3(1, 1, 1) } };
  return new THREE.ShaderMaterial({ uniforms: u, vertexShader: VERT, fragmentShader: FRAG });
}
const forma = (poly, buchi = []) => {
  const s = new THREE.Shape(poly.map(p => new THREE.Vector2(p[0] / 1000, p[1] / 1000)));
  for (const b of buchi) s.holes.push(new THREE.Path(b.map(p => new THREE.Vector2(p[0] / 1000, p[1] / 1000))));
  return s;
};
const area = poly => Math.abs(poly.reduce((a, p, i) => { const q = poly[(i + 1) % poly.length]; return a + p[0] * q[1] - q[0] * p[1]; }, 0) / 2);
const cx = poly => poly.reduce((a, p) => a + p[0], 0) / poly.length;
function tubo(poly, z, raggio, leggero) {
  const c = new THREE.CatmullRomCurve3(poly.map(p => new THREE.Vector3(p[0] / 1000, p[1] / 1000, z)), false, "centripetal");
  return new THREE.TubeGeometry(c, Math.max(40, poly.length * (leggero ? 1.5 : 3)) | 0, raggio, leggero ? 6 : (TELEFONO ? 10 : 14), false);
}
function puntiLungo(neon, n) {
  const segs = []; let tot = 0;
  for (const poly of neon) for (let i = 1; i < poly.length; i++) { const l = Math.hypot(poly[i][0] - poly[i - 1][0], poly[i][1] - poly[i - 1][1]); segs.push([poly[i - 1], poly[i], tot, l]); tot += l; }
  const out = [];
  for (let k = 0; k < n; k++) { const d = (k + 0.5) / n * tot; const s = segs.find(s => d <= s[2] + s[3]) || segs[segs.length - 1]; const f = (d - s[2]) / s[3];
    out.push([s[0][0] + (s[1][0] - s[0][0]) * f, s[0][1] + (s[1][1] - s[0][1]) * f, k / n]); }
  return out;
}

// sagome degli strati (coordinate locali in metri): servono alla legenda per sapere cosa copre cosa sullo schermo
const chiusa = (poly, z) => ({ pts: poly.map(p => [p[0] / 1000, p[1] / 1000]), z, chiuso: true });
const aperta = (poly, z) => ({ pts: poly.map(p => [p[0] / 1000, p[1] / 1000]), z, chiuso: false });
const quadro = (x, y, r, z) => ({ pts: [[x - r, y - r], [x + r, y - r], [x + r, y + r], [x - r, y + r]], z, chiuso: true });
// filo di luce sullo spigolo di una lastra (quello che prende la luce): appare con l'esploso
function bordo(poly, z, mat) { const m = new THREE.Mesh(tubo(poly.concat([poly[0]]), z, 0.0011, true), mat); m.userData.bordo = true; return m; }
// distanziale cromato: canna da 20 mm, 15 mm di lunghezza, testa smussata e foro della vite
function distanziale(M) {
  const g = new THREE.Group();
  const canna = new THREE.Mesh(new THREE.CylinderGeometry(0.010, 0.010, 0.013, 40, 1, true), M.cromo); canna.rotation.x = Math.PI / 2; g.add(canna);
  const testa = new THREE.Mesh(new THREE.TorusGeometry(0.0092, 0.0011, 10, 40), M.cromo); testa.position.z = 0.0065; g.add(testa);
  const piano = new THREE.Mesh(new THREE.RingGeometry(0.0025, 0.0093, 40), M.cromo); piano.position.z = 0.0075; g.add(piano);
  const foro = new THREE.Mesh(new THREE.CircleGeometry(0.0025, 24), new THREE.MeshBasicMaterial({ color: 0x050505 })); foro.position.z = 0.0076; g.add(foro);
  return g;
}

// ---------- i due prodotti: ogni strato è un gruppo, la PILA li elenca dal retro al fronte ----------
function montaGen2(geo, neonMat, M) {
  const g = new THREE.Group();
  const forex = new THREE.MeshStandardMaterial({ color: 0x0c0b0b, roughness: 0.62, metalness: 0.0 });
  const lame = geo.pannelli.slice().sort((a, b) => cx(b) - cx(a));      // [destra, sinistra]
  const lama = poly => { const gr = new THREE.Group(); gr.add(new THREE.Mesh(new THREE.ExtrudeGeometry(forma(poly), { depth: 0.010, bevelEnabled: true, bevelThickness: 0.0012, bevelSize: 0.0012, bevelSegments: 2, curveSegments: 1 }), forex)); return gr; };
  const lamaD = lama(lame[0]), lamaS = lama(lame[1]);
  const neon = new THREE.Group();
  geo.neon.forEach((poly, i) => tuboNeon(neon, poly, 0.0095, neonMat(i * 0.25)));
  const distanziali = new THREE.Group(); const sagDist = [];
  const [W, H] = geo.ingombro_mm.map(v => v / 1000);
  for (const [x, y] of [[-0.27, 0.04], [-0.08, -0.2], [0.08, 0.2], [0.27, -0.04]]) {   // POSIZIONE E MISURA INDICATIVE: il file CNC non le fissa
    const d = distanziale(M); d.position.set(x * W, y * H, -0.0075); distanziali.add(d); sagDist.push(quadro(x * W, y * H, 0.011, 0));
  }
  for (const [gr, poly] of [[lamaD, lame[0]], [lamaS, lame[1]]]) gr.add(bordo(poly, 0.0112, M.bordoForex));
  const lameG = new THREE.Group(); lameG.add(lamaD, lamaS);
  g.add(lameG, neon, distanziali);
  g.position.z = 0.015;                                    // i distanziali la tengono staccata dalla parete
  const pila = [
    { k: "distanziali", testo: "Distanziali cromati", mm: "15 mm, indicativi", grp: distanziali, slot: 0, sagome: sagDist },
    // le due lame stanno sullo STESSO piano (due pezzi di Forex affiancati): uno strato, due pezzi
    { k: "lame", testo: "Due lame · Forex nero", mm: "10 mm", grp: lameG, slot: 1, sagome: [chiusa(lame[0], 0.011), chiusa(lame[1], 0.011)] },
    { k: "neon", testo: "Neon Split nel solco", mm: "6 mm", grp: neon, slot: 2, sagome: geo.neon.map(pl => aperta(pl, 0.0095)) }];
  return { g, pila, pacchetto: "Spessore montata · 25 mm\npannello 10 + distanziale 15, indicativo", forex: [forex], zAlone: 0.0115, zSprite: 0.0155 };
}
function montaInfinity(geo, neonMat, qualita, M) {
  const g = new THREE.Group();
  const bat = geo.battuta.slice().sort((a, b) => area(b) - area(a));
  const esterni = bat.slice(0, 2), interni = bat.slice(2);
  const forex = new THREE.MeshStandardMaterial({ color: 0x0c0b0b, roughness: 0.62 });
  const specMontato = new THREE.MeshBasicMaterial({ color: 0x070606 });   // montato: il riflesso vero è il tunnel, niente puntini
  const base = new THREE.Group();
  for (const poly of geo.pannelli) base.add(new THREE.Mesh(new THREE.ExtrudeGeometry(forma(poly), { depth: 0.010, bevelEnabled: true, bevelThickness: 0.001, bevelSize: 0.001, bevelSegments: 2, curveSegments: 1 }), forex));
  const specchio = new THREE.Group();
  for (const poly of interni) { const m = new THREE.Mesh(new THREE.ExtrudeGeometry(forma(poly), { depth: 0.003, bevelEnabled: false, curveSegments: 1 }), specMontato); m.position.z = 0.0101; m.userData.scambio = [specMontato, M.specchio]; specchio.add(m); }
  const corsia = new THREE.Group();
  esterni.forEach((poly, i) => { const m = new THREE.Mesh(new THREE.ExtrudeGeometry(forma(poly, [interni[i]]), { depth: 0.033, bevelEnabled: false, curveSegments: 1 }), M.dibond); m.position.z = 0.010; corsia.add(m); });
  const neon = new THREE.Group();
  geo.neon.forEach((poly, i) => tuboNeon(neon, poly, 0.016, neonMat(i * 0.25)));
  // il TUNNEL: copie del neon ogni 2d dietro lo specchio (d = 30 mm), sempre più deboli, più scure/verdi (il vetro dello specchio) e più sfocate.
  // Si vedono solo dove lo specchio è davvero in vista (stencil sul piano dello specchio, col test di profondità: corsia e neon lo coprono);
  // dentro, la profondità si azzera e le PARETI VIRTUALI della corsia (riflesse, ripetute ogni 2d) coprono le copie quando la si guarda di sbieco.
  const tunnel = new THREE.Group(); const copie = [], aloniTunnel = [];
  const N = qualita.copie, R = 0.66, DD = 0.060, ATT0 = 0.3;   // le copie più scure del neon vero (come l'ancora Blender)
  const sten = m => { m.stencilWrite = true; m.stencilRef = 1; m.stencilFunc = THREE.EqualStencilFunc; m.stencilZPass = THREE.KeepStencilOp; return m; };
  for (let k = 1; k <= N; k++) {
    const tinta = new THREE.Vector3(Math.pow(0.9, k), Math.pow(0.97, k), Math.pow(0.93, k));
    geo.neon.forEach((poly, i) => {
      const mat = sten(neonMat(i * 0.25)); mat.uniforms.uAtt.value = ATT0 * Math.pow(R, k); mat.uniforms.uTinta.value = tinta;
      const z = 0.016 - k * DD;
      const m = new THREE.Mesh(tubo(poly, z, 0.003 + 0.0005 * k, true), mat); m.renderOrder = 2; m.userData.k = k; tunnel.add(m); copie.push(m);
      if (i === 0) aloniTunnel.push({ k, mat, z: 0.0136 - k * DD });
    });
    // pareti virtuali della corsia per questo tratto (solo i fianchi: i tappi sono invisibili); più chiare dove c'è la copia del neon
    for (const poly of interni) {
      const gg = new THREE.ExtrudeGeometry(forma(poly), { depth: DD, bevelEnabled: false, curveSegments: 1 });
      const pos = gg.attributes.position, col = new Float32Array(pos.count * 3);
      for (let v = 0; v < pos.count; v++) { const f = Math.max(0, 1 - pos.getZ(v) / DD); const l = (0.012 + 0.075 * f * f * f) * Math.pow(0.7, k);   // Dibond nero: appena scaldato dalla copia del neon vicina
        col[v * 3] = l; col[v * 3 + 1] = l * 0.1; col[v * 3 + 2] = l * 0.1; }
      gg.setAttribute("color", new THREE.BufferAttribute(col, 3));
      const parete = sten(new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide }));
      const m = new THREE.Mesh(gg, [new THREE.MeshBasicMaterial({ visible: false }), parete]); m.position.z = 0.0131 - k * DD; m.renderOrder = 2; m.userData.k = k; tunnel.add(m); copie.push(m);
    }
  }
  const finestra = new THREE.Group();   // (la finestra ora sta sul piano dello specchio, nel gruppo dello specchio)
  const mStencil = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, stencilWrite: true, stencilRef: 1, stencilZPass: THREE.ReplaceStencilOp });
  const azzera = new THREE.ShaderMaterial({ vertexShader: "void main(){ gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position.z = gl_Position.w; }",
    fragmentShader: "void main(){ gl_FragColor = vec4(0.0); }", colorWrite: false, depthWrite: true, depthFunc: THREE.AlwaysDepth });
  sten(azzera);
  for (const poly of interni) {
    const m = new THREE.Mesh(new THREE.ShapeGeometry(forma(poly)), mStencil); m.position.z = 0.0135; m.renderOrder = 1; specchio.add(m);
    const a = new THREE.Mesh(new THREE.ShapeGeometry(forma(poly)), azzera); a.position.z = 0.0135; a.renderOrder = 1.5; specchio.add(a);
  }
  const frontale = new THREE.Group();
  const vetroMontato = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false });
  // riflesso del frontale semiriflettente: cresce con l'angolo (Fresnel), non risponde alle luci puntiformi (niente puntini)
  const riflFront = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vV;
    void main(){ float ndv = clamp(abs(dot(normalize(vN), normalize(vV))), 0.0, 1.0); float f = 0.03 + 0.5 * pow(1.0 - ndv, 3.0);
      gl_FragColor = vec4(vec3(0.62, 0.6, 0.6) * f * 0.45, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  for (const poly of esterni) { const gg = new THREE.ExtrudeGeometry(forma(poly), { depth: 0.003, bevelEnabled: false, curveSegments: 1 });
    const m = new THREE.Mesh(gg, vetroMontato); m.position.z = 0.0431; m.renderOrder = 3; m.userData.scambio = [vetroMontato, M.vetro]; frontale.add(m);
    const r = new THREE.Mesh(gg, riflFront); r.position.z = 0.0431; r.renderOrder = 4; r.userData.soloMontato = true; frontale.add(r); }
  frontale.add(finestra);
  for (const poly of esterni) frontale.add(bordo(poly, 0.0463, M.bordoVetro), bordo(poly, 0.0431, M.bordoVetro));   // i due spigoli della lastra
  for (const poly of geo.pannelli) base.add(bordo(poly, 0.0102, M.bordoForex));
  const supporti = new THREE.Group(); const sagSup = [];
  const [W, H] = geo.ingombro_mm.map(v => v / 1000);
  for (const [fx, fy] of [[-0.38, 0.1], [-0.18, -0.25], [0, 0.35], [0.18, 0.25], [0.38, -0.1], [0, -0.35]]) {
    const L = new THREE.Group(); const a = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.002, 0.02), M.inox); a.position.z = -0.01; const b = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.002), M.inox); b.position.set(0, -0.015, -0.02);
    L.add(a, b); L.position.set(fx * W, fy * H * 0.6, 0); supporti.add(L); sagSup.push(quadro(fx * W, fy * H * 0.6 - 0.013, 0.011, -0.015));   // sulla staffa vera (scende sotto l'origine)
  }
  g.add(base, specchio, corsia, neon, tunnel, frontale, supporti);
  g.position.z = 0.02;
  const pila = [
    { k: "supporti", testo: "Supporti a L · inox nero", mm: "", grp: supporti, slot: 0, sagome: sagSup },
    { k: "base", testo: "Base · Forex nero", mm: "10 mm", grp: base, slot: 1, sagome: geo.pannelli.map(pl => chiusa(pl, 0.010)) },
    { k: "specchio", testo: "Specchio · Dibond", mm: "3 mm", grp: specchio, slot: 2, sagome: interni.map(pl => chiusa(pl, 0.0131)) },
    { k: "neon", testo: "Neon nel solco", mm: "6 mm", grp: neon, slot: 3, segue: tunnel, sagome: geo.neon.map(pl => aperta(pl, 0.016)) },
    { k: "corsia", testo: "Corsia · Dibond nero", mm: "40 mm", grp: corsia, slot: 4, sagome: esterni.map(pl => chiusa(pl, 0.043)) },
    { k: "frontale", testo: "Frontale semiriflettente", mm: "3 mm", grp: frontale, slot: 5, sagome: esterni.map(pl => chiusa(pl, 0.0461)) }];
  const spegniTunnel = e => { const f = Math.max(0, 1 - e / 0.25); tunnel.visible = f > 0; for (const m of copie) if (m.material.uniforms) m.material.uniforms.uAtt.value = ATT0 * Math.pow(R, m.userData.k) * f; };   // a pila aperta solo il neon vero
  return { g, pila, pacchetto: "Spessore montata · 46 mm", spegniTunnel, forex: [forex], tunnel, aloniTunnel, sten, zAlone: 0.0136, zSprite: 0.021 };   // frontale: solo specchio spia
}

// ---------- la sala: parete grigia e quieta, pavimento. L'insegna è la protagonista ----------
export async function costruisci({ tela, geo, prodotto, stato, qualita = {} }) {
  const PROVA = stato.prova || {};
  const renderer = new THREE.WebGLRenderer({ canvas: tela, antialias: false, stencil: true, powerPreference: "high-performance", precision: PROVA.prec || "highp" });
  let dpr = PROVA.dpr || Math.min(window.devicePixelRatio || 1, TELEFONO ? 1.6 : 1.75); renderer.setPixelRatio(dpr);
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05; renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = false;   // strati distanti: un'ombra portata non fa contatto, raddoppia solo le sagome
  const scena = new THREE.Scene(); const sfondo = new THREE.Color(0x060505); scena.background = sfondo;
  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 60);
  const Q = { copie: qualita.copie || (TELEFONO ? 5 : 8) };
  // mappa d'ambiente solo per i materiali che riflettono (specchio, frontale, metalli): la scena resta buia
  const pmrem = new THREE.PMREMGenerator(renderer); const amb = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const M = {
    // specchio: Dibond a specchio, scuro e riflettente (la stanza d'ambiente PMREM dà il gradiente del riflesso)
    amb,
    specchio: new THREE.MeshStandardMaterial({ color: 0x1a1a1c, metalness: 1.0, roughness: 0.09, envMap: amb, envMapIntensity: 0.85 }),
    bordoForex: new THREE.MeshStandardMaterial({ color: 0x3a3634, roughness: 0.45, metalness: 0.0, envMap: amb, envMapIntensity: 0.25, transparent: true, opacity: 0 }),
    bordoVetro: new THREE.MeshStandardMaterial({ color: 0x6e686b, roughness: 0.12, metalness: 0.3, envMap: amb, envMapIntensity: 0.5, transparent: true, opacity: 0 }),
    // frontale fumé nell'esploso: una LASTRA (riempimento fumé al 40% con riflesso, lucida), non un contorno
    vetro: new THREE.MeshStandardMaterial({ color: 0x3e383b, metalness: 0.2, roughness: 0.08, envMap: amb, envMapIntensity: 1.0, transparent: true, opacity: 0.4, depthWrite: false, side: THREE.DoubleSide }),
    dibond: new THREE.MeshStandardMaterial({ color: 0x1b1b1d, metalness: 0.2, roughness: 0.7, envMap: amb, envMapIntensity: 0.08 }),
    inox: new THREE.MeshStandardMaterial({ color: 0x1c1c1d, metalness: 0.85, roughness: 0.55, envMap: amb, envMapIntensity: 0.6 }),
    cromo: new THREE.MeshStandardMaterial({ color: 0xbcbcbc, metalness: 1.0, roughness: 0.2, envMap: amb, envMapIntensity: 0.45 })
  };

  const parete = new THREE.Mesh(new THREE.PlaneGeometry(240, 60), new THREE.MeshStandardMaterial({ color: 0x3a3432, roughness: 0.93, dithering: true, emissive: 0x151517 }));   // un grigio di sala: il muro si legge anche dove non arriva la luce
  parete.position.set(0, 0, 0); parete.geometry = new THREE.PlaneGeometry(240, 120); parete.receiveShadow = true; scena.add(parete);
  const pav = new THREE.Mesh(new THREE.PlaneGeometry(40, 20), new THREE.MeshStandardMaterial({ color: 0x0b0a0a, roughness: 0.55, dithering: true }));
  pav.rotation.x = -Math.PI / 2; pav.position.set(0, 0, 10); scena.add(pav);

  const materiali = []; ALONI.length = 0;
  const neonMat = fase => { const m = materialeNeon(fase); materiali.push(m); return m; };
  const P = prodotto === "infinity" ? montaInfinity(geo, neonMat, Q, M) : montaGen2(geo, neonMat, M);
  const insegna = new THREE.Group(); insegna.add(P.g); insegna.position.y = 2.3; scena.add(insegna);
  const reali = P.pila.filter(s => !s.virtuale);
  for (const s of reali) { s.z0 = s.grp.position.z; s.x0 = s.grp.position.x; s.grp.traverse(o => { if (o.isMesh && !o.material.isShaderMaterial) { o.castShadow = o.receiveShadow = true; } }); }
  // punti di campionamento di ogni strato (vertici veri), per le ancore sul bordo visibile e per la maschera proiettata
  for (const s of reali) {
    const pts = []; s.grp.traverse(o => { if (!o.isMesh || !o.visible || o.material.colorWrite === false) return; const pos = o.geometry.attributes.position; const passo = Math.max(1, Math.floor(pos.count / 260));
      for (let i = 0; i < pos.count; i += passo) pts.push([o, i]); });
    s.campioni = pts;
  }
  const larg = geo.ingombro_mm[0] / 1000, alt = geo.ingombro_mm[1] / 1000;

  // dentro la finestra dello specchio la profondità è azzerata (tunnel): l'alone e l'ombra della parete lì non devono passare
  const fuoriFinestra = m => { m.stencilWrite = true; m.stencilRef = 1; m.stencilFunc = THREE.NotEqualStencilFunc; m.stencilZPass = THREE.KeepStencilOp; };
  // ALONI CUOCIUTI (texture offline, morbide su ogni telefono). Rettangoli in mm come in _strumenti/cuoci_aloni.py; arrivano dopo la scena.
  const [Wmm, Hmm] = geo.ingombro_mm, rett = (pad, mmpx) => [Math.ceil((Wmm + 2 * pad) / mmpx) * mmpx / 1000, Math.ceil((Hmm + 2 * pad) / mmpx) * mmpx / 1000];
  const baseNeon = P.pila.find(x => x.k === "neon").grp.children[0].material;
  const pianoCotto = (dim, mat) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(dim[0], dim[1]), mat); m.visible = false; return m; };
  const aloneVicino = pianoCotto(rett(70, 2), materialeCotto(baseNeon, 0, PROVA.fv || 0.025)); aloneVicino.position.z = P.zAlone; P.pila.find(x => x.k === "neon").grp.add(aloneVicino);
  const aloneParete = pianoCotto(rett(450, 6), materialeCotto(baseNeon, 1, PROVA.fp || 0.14)); aloneParete.position.z = 0.002 - P.g.position.z; fuoriFinestra(aloneParete.material); P.g.add(aloneParete);
  const sprite = spriteScia(geo.neon, baseNeon, P.zSprite, 0.25);  P.pila.find(x => x.k === "neon").grp.add(sprite);   // ~5 sprite si sovrappongono (70 mm ogni 14 mm)
  // la cometa illumina anche la parete: sprite larghi sul piano della parete (un tratto spento lascia la parete spenta)
  const spriteParete = spriteScia(geo.neon, baseNeon, 0.002 - P.g.position.z, 0.04);  spriteParete.material.uniforms.uDim.value = 0.26; fuoriFinestra(spriteParete.material); P.g.add(spriteParete);   // ~19 sprite si sovrappongono (260 mm ogni 14 mm)
  const aloniCopie = (P.aloniTunnel || []).map(({ k, mat, z }) => { const m = pianoCotto(rett(70, 2), P.sten(materialeCotto(mat, 0, 0.3 * Math.pow(0.88, k))));
    m.material.depthTest = true; m.position.z = z; m.renderOrder = 2; P.tunnel.add(m); return m; });
  const nomeAloni = prodotto === "infinity" ? "infinity" : "gen2";
  (async () => {
    try {
      const L = new THREE.TextureLoader(), base = "assets/3d/aloni/" + nomeAloni, v = "?v=" + (qualita.versione || "");
      const [tS, tL, tO, tG] = await Promise.all([base + "-stretto.png", base + "-largo.png", base + "-ombra.png", "assets/3d/aloni/gauss.png"].map(x => L.loadAsync(x + v)));
      for (const sp of [sprite, spriteParete]) { sp.material.uniforms.tGauss.value = tG; sp.visible = true; }
      tL.generateMipmaps = false; tL.minFilter = tL.magFilter = THREE.LinearFilter;   // la texture-indice si legge al centro del texel
      for (const m of [aloneVicino, aloneParete, ...aloniCopie]) { const u = m.material.uniforms; u.tHalo.value = tS; u.tIndice.value = tL; u.uSize.value.set(tL.image.width, tL.image.height); m.visible = true; }
      ombra.material.alphaMap = tO; ombra.material.needsUpdate = true; ombra.visible = true;
    } catch (e) { console.warn("aloni non caricati", e); }
  })();

  const luci = puntiLungo(geo.neon, LUCI_MAX).map(([x, y, u]) => { const l = new THREE.PointLight(0xff1a1a, 0, 2.2, 2); l.position.set(x / 1000, y / 1000, 0.32); l.userData.u = u; insegna.add(l); return l; });
  const ambiente = new THREE.AmbientLight(0xffffff, 0.03); scena.add(ambiente);
  const cielo = new THREE.HemisphereLight(0xf2eee8, 0x2a2624, 0); scena.add(cielo);
  const chiave = new THREE.DirectionalLight(0xfff6ee, 0.35); chiave.position.set(-2, 4, 4); scena.add(chiave);
  const bordo = new THREE.DirectionalLight(0xffffff, 0.55); bordo.position.set(0.6, 6, 1.2); scena.add(bordo);
  // esploso: luce chiave radente con ombre portate (schermo largo) + luce di bordo da dietro per staccare ogni lastra
  const radente = new THREE.DirectionalLight(0xfff4ee, 0); scena.add(radente, radente.target);
  radente.castShadow = !TELEFONO; radente.shadow.mapSize.set(1024, 1024); radente.shadow.bias = -0.0004; radente.shadow.normalBias = 0.01;
  Object.assign(radente.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 0.1, far: 30 });
  const rim = new THREE.DirectionalLight(0xffffff, 0); scena.add(rim, rim.target);

  const radenteParete = new THREE.SpotLight(0xffeee4, 0, 5, 0.95, 1.0, 1.4); radenteParete.position.set(0, 4.6, 0.28); radenteParete.target.position.set(0, 1.2, 0); scena.add(radenteParete, radenteParete.target);
  // ombra morbida dei pannelli sulla parete: anche lei cuociuta (texture offline usata come alfa), arriva con gli aloni
  const ombra = new THREE.Mesh(new THREE.PlaneGeometry(...rett(60, 4)), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0, depthWrite: false })); ombra.visible = false;
  ombra.position.z = 0.0015 - P.g.position.z; P.g.add(ombra); fuoriFinestra(ombra.material);

  // bagliore su un bersaglio HDR con stencil (serve al tunnel) e MSAA (niente scalini sui bordi)
  const rt = new THREE.WebGLRenderTarget(2, 2, { type: PROVA.rt8 ? THREE.UnsignedByteType : THREE.HalfFloatType, stencilBuffer: true, depthBuffer: true, samples: TELEFONO ? 2 : 4 });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scena, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.62, 0.5, 0.4);
  composer.addPass(bloom); composer.addPass(new OutputPass());
  let conBloom = stato.bloom !== false;

  const vista = { w: 1, h: 1, verticale: false, tanH: 0.27, tanV: 0.27 };
  function misura() {
    const w = tela.clientWidth, h = tela.clientHeight; if (!(w > 0 && h > 0)) return;
    vista.w = w; vista.h = h; vista.verticale = h > w;
    renderer.setSize(w, h, false); composer.setSize(w, h); bloom.resolution.set(w * dpr / 2, h * dpr / 2);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    vista.tanH = Math.tan(camera.fov * Math.PI / 360) * w / h; vista.tanV = Math.tan(camera.fov * Math.PI / 360);
  }
  new ResizeObserver(misura).observe(tela); misura();

  let giorno = stato.giorno ? 1 : 0, acceso = stato.acceso === false ? 0 : 1, scala = SCALA[stato.misura];
  const colParNotte = new THREE.Color(0x3d3c40), colParGiorno = new THREE.Color(0x8d8782);
  const ss = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
  const tmpV2 = new THREE.Vector2();
  const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3(), box = new THREE.Box3(), sfera = new THREE.Sphere();
  let esp = 0;
  // ---- inquadratura dell'insegna montata nel palco ----
  const AZMAX = 0.95, MARGINE = 16,   // AZMAX: il massimo del trascinamento; l'inquadratura a riposo vale per il PENDOLO (stato.azPendolo)
    MV = { d: 3, px: 0, py: 0, pronto: false }, provaM = new THREE.PerspectiveCamera();
  const quadriM = {};
  const centroInsegna = () => new THREE.Vector3(0, 2.3, 0);
  function puntiARiposo() {   // i punti veri degli strati, riportati alla posizione montata (senza lo spostamento dell'esploso)
    insegna.updateMatrixWorld(true); const out = [], v = new THREE.Vector3();
    for (const st of reali) { const dz = scala * (st.grp.position.z - st.z0);
      for (let k = 0; k < st.campioni.length; k += 4) { const [o, i] = st.campioni[k]; v.fromBufferAttribute(o.geometry.attributes.position, i).applyMatrix4(o.matrixWorld); out.push(new THREE.Vector3(v.x, v.y, v.z - dz)); } }
    return out;
  }
  // ingombro sullo schermo (px) dell'insegna, su tutti gli angoli raggiungibili, con la camera VERA (distanza d, insegna portata in px,py):
  // con l'insegna di sbieco i punti vicini si spostano più dei lontani, quindi si misura e si corregge, non si stima
  function ingombri(pts, d, px, py, A) {
    const C = centroInsegna(); let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    provaM.fov = camera.fov; provaM.aspect = camera.aspect; provaM.near = camera.near; provaM.far = camera.far; provaM.updateProjectionMatrix();
    for (let k = -4; k <= 4; k++) { const az = A * k / 4, R = new THREE.Vector3(Math.cos(az), 0, -Math.sin(az));
      const sh = R.multiplyScalar(-(px - vista.w / 2) / (vista.w / 2) * d * vista.tanH).add(new THREE.Vector3(0, (py - vista.h / 2) / (vista.h / 2) * d * vista.tanV, 0));
      provaM.position.set(Math.sin(az) * d, 0, Math.cos(az) * d).add(C).add(sh); provaM.lookAt(C.clone().add(sh)); provaM.updateMatrixWorld(true);
      for (const q of pts) { const r = q.clone().project(provaM); const x = (r.x * 0.5 + 0.5) * vista.w, y = (-r.y * 0.5 + 0.5) * vista.h; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } }
    return [x0, x1, y0, y1];
  }
  function inquadraMontata(A) {
    const P0 = stato.palco || { x0: 0, y0: 0, x1: vista.w, y1: vista.h * 0.6 };
    const mx = Math.max(MARGINE, P0.mx || 0);   // da PC l'insegna a riposo occupa circa l'80% della sua colonna
    const x0 = P0.x0 + mx, x1 = P0.x1 - mx, y0 = P0.y0 + MARGINE, y1 = Math.max(P0.y0 + MARGINE + 40, P0.y1 - MARGINE);
    const chiave = [vista.w, vista.h, x0, x1, y0, y1].map(v => Math.round(+v)).join(",") + "," + scala.toFixed(3) + "," + A.toFixed(2);
    if (quadriM[chiave]) return quadriM[chiave];
    const pts = puntiARiposo(), dMin = (larg * scala / (vista.verticale ? 0.92 : 0.64) / 2) / vista.tanH;   // mai più grande del disegno di prima
    let d = Math.max(dMin, 3 * scala), px = (x0 + x1) / 2, py = (y0 + y1) / 2;
    for (let it = 0; it < 6; it++) {
      const [a0, a1, b0, b1] = ingombri(pts, d, px, py, A);
      d = Math.max(dMin, d * Math.max((a1 - a0) / (x1 - x0), (b1 - b0) / (y1 - y0)) * 1.01);
      const [c0, c1, e0, e1] = ingombri(pts, d, px, py, A);
      px += (x0 + x1) / 2 - (c0 + c1) / 2; py += (y0 + y1) / 2 - (e0 + e1) / 2;
    }
    if (Object.keys(quadriM).length > 24) for (const k in quadriM) delete quadriM[k];   // cache piccola: la si svuota
    return (quadriM[chiave] = { d, px, py });
  }
  function aggiorna(t, p, azUtente) {
    giorno += ((stato.giorno ? 1 : 0) - giorno) * 0.12; acceso += ((stato.acceso === false ? 0 : 1) - acceso) * 0.25;
    scala += (SCALA[stato.misura] - scala) * 0.18; insegna.scale.setScalar(scala);
    // esploso guidato dallo scroll: si apre entrando nella tappa (0,10-0,26), resta aperto per leggere la legenda (fino a 0,42),
    // poi lo scroll lo richiude (0,42-0,66): il vano va a zero e il neon torna alla piena luce
    const e = ss(0.10, 0.26, p) * (1 - ss(0.42, 0.66, p)); esp = e;
    const lm = prodotto === "infinity" ? ESPLOSO.luceMinInfinity : ESPLOSO.luceMin;   // l'Infinity perde il tunnel a pila aperta: il neon resta più acceso
    const luceE = lm + (1 - lm) * (1 - e);
    const m = MODI[stato.modo];
    for (const mt of materiali) { const u = mt.uniforms; u.uTempo.value = t; u.uModo.value = m; u.uVel.value = stato.velocita; u.uLivello.value = stato.livello; u.uAcceso.value = acceso * luceE; u.uGiorno.value = giorno; u.uEsp.value = 0; }
    P.spegniTunnel && P.spegniTunnel(e);
    let media = 0;
    for (const l of luci) { const i0 = intensita(stato, t, l.userData.u), i = (CORRE.includes(stato.modo) ? Math.max(i0 - 0.2, 0) / 0.8 : i0) * acceso * luceE;  l.intensity = (0.1 / Math.sqrt(LUCI_MAX / 4)) * Math.min(i, 1.2) * (1 - 0.6 * giorno); media += i; }   // effetti che corrono: un tratto spento non illumina la parete
    media /= luci.length;
    for (const a of ALONI) a.uniforms.uForza.value = a.userData.forza * (conBloom ? 0.55 : 1);   // col bagliore le guaine si alleggeriscono
    aloneParete.material.uniforms.uForza.value *= 1 - 0.7 * e;   // a pila aperta il neon è lontano dalla parete: lì arriva meno luce
    ambiente.intensity = 0.1 + 0.55 * giorno + 0.03 * e; radenteParete.intensity = (7 + 10 * giorno) * (1 - 0.4 * e); pav.visible = e < 0.3; ombra.material.opacity = (0.1 + 0.45 * giorno) * (1 - e); cielo.intensity = 1.1 * giorno; chiave.intensity = 0.35 + 0.9 * giorno;
    parete.material.color.copy(colParNotte).lerp(colParGiorno, giorno);   // la stessa sala del montato: è il neon che la scalda   // nell'esploso il fondale si schiarisce un grado sfondo.copy(new THREE.Color(0x060505)).lerp(new THREE.Color(0x3a3634), giorno);
    // strati: un solo asse (profondità), passo costante; nell'esploso i materiali che riflettono diventano veri
    const passo = ESPLOSO.vano * alt;
    for (const s of reali) { s.grp.position.z = s.z0 + e * passo * s.slot; if (s.segue) s.segue.position.z = s.grp.position.z; }
    M.bordoForex.opacity = M.bordoVetro.opacity = Math.min(1, e * 1.6); M.bordoForex.visible = M.bordoVetro.visible = e > 0.01;
    P.g.traverse(o => { if (o.userData.scambio) o.material = o.userData.scambio[e > 0.02 ? 1 : 0]; if (o.userData.soloMontato) o.visible = e <= 0.02; });
    // CAMERA MONTATA: l'insegna sta nel PALCO (il riquadro libero che la pagina misura: sotto la testata, sopra testo e comandi, accanto al
    // pannello laterale), con 16 px di margine A OGNI ANGOLO raggiungibile (pendolo, swipe, giroscopio: fino a ±AZMAX), non solo a riposo.
    const azM = Math.max(-AZMAX, Math.min(AZMAX, azUtente));
    // a riposo: inquadrata per il pendolo; se il dito la porta oltre, si allontana piano fino all'inquadratura per ±AZMAX (mai sotto il testo)
    const Ap = Math.min(AZMAX, stato.azPendolo || AZMAX), qa = inquadraMontata(Ap);
    let quadro = qa;
    if (Math.abs(azM) > Ap + 0.01) { const qb = inquadraMontata(AZMAX), f = Math.min(1, (Math.abs(azM) - Ap) / (AZMAX - Ap));
      quadro = { d: qa.d + (qb.d - qa.d) * f, px: qa.px + (qb.px - qa.px) * f, py: qa.py + (qb.py - qa.py) * f }; }
    MV.d += (quadro.d - MV.d) * (MV.pronto ? (quadro.d > MV.d ? 0.45 : 0.15) : 1);  MV.px += (quadro.px - MV.px) * (MV.pronto ? 0.15 : 1); MV.py += (quadro.py - MV.py) * (MV.pronto ? 0.15 : 1); MV.pronto = true;   // ad allontanarsi è svelta (il testo non va mai sopra), a tornare morbida
    const Cm = centroInsegna(), Rm = new THREE.Vector3(Math.cos(azM), 0, -Math.sin(azM));
    const sx = -(MV.px - vista.w / 2) / (vista.w / 2) * MV.d * vista.tanH, sy = (MV.py - vista.h / 2) / (vista.h / 2) * MV.d * vista.tanV;
    const spost = Rm.clone().multiplyScalar(sx).add(new THREE.Vector3(0, sy, 0));
    tmpA.set(Math.sin(azM) * MV.d, 0, Math.cos(azM) * MV.d).add(Cm).add(spost);   // posizione montata: orbita intorno all'insegna + traslazione nel piano dell'immagine
    const bersM = Cm.clone().add(spost);
    // camera dell'esploso: assonometria da destra in alto, adattata alla pila (sfera che la contiene)
    const E = e * e * (3 - 2 * e);
    if (E > 0.0005) {
      insegna.updateMatrixWorld(true); box.makeEmpty(); for (const s of reali) box.expandByObject(s.grp); box.getBoundingSphere(sfera);
      // distanza adattata al riquadro PROIETTATO della pila (non alla sfera): larga al massimo il 62%, alta il 45% (sotto c'è la legenda)
      const az0 = ESPLOSO.az + azUtente * ESPLOSO.gioco,   // gioco stretto: sotto az 0.70 i fili della 2ª gen toccano il neon
        el0 = ESPLOSO.el, dir = new THREE.Vector3(Math.sin(az0) * Math.cos(el0), Math.sin(el0), Math.cos(az0) * Math.cos(el0));
      // i punti VERI degli strati (non gli spigoli del riquadro 3D, che per una fila diagonale cadono lontano dagli strati)
      const angoli = []; const vv = new THREE.Vector3();
      for (const st of reali) for (let k = 0; k < st.campioni.length; k += 6) { const [o, i] = st.campioni[k]; angoli.push(vv.fromBufferAttribute(o.geometry.attributes.position, i).applyMatrix4(o.matrixWorld).clone()); }
      const prova = camera.clone(); let dE = sfera.radius * 2.2;
      for (let it = 0; it < 3; it++) { prova.position.copy(dir).multiplyScalar(dE).add(sfera.center); prova.lookAt(sfera.center); prova.updateMatrixWorld(true);
        let x0 = 1, x1 = -1, y0 = 1, y1 = -1; for (const a of angoli) { const q = a.clone().project(prova); x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y); }
        const fw = (x1 - x0) / 2, fh = (y1 - y0) / 2, lw = vista.verticale ? 0.9 : 0.66, lh = vista.verticale ? 0.36 : 0.45;
        dE *= Math.max(fw / lw, fh / lh); }
      // la pila si centra sullo schermo (non sulla sfera: una fila diagonale proietta di lato) dentro la fascia libera:
      // sotto la barra in alto, sopra la tappa (e sopra la colonna della legenda a schermo largo). Se non ci sta, la camera arretra.
      const bersE = sfera.center.clone(); tmpB.copy(dir).multiplyScalar(dE).add(bersE);
      const limAlto = 64, limBasso = stato.riservaSotto > 0 ? vista.h - stato.riservaSotto : vista.h * (vista.verticale ? 0.52 : 0.62);
      const cxVoluto = vista.w * (stato.centroX || 0.5), largMax = vista.w * (stato.larghezza || (vista.verticale ? 0.92 : 0.62));
      const r3 = new THREE.Vector3(), u3 = new THREE.Vector3();
      const misuraP = () => { prova.position.copy(tmpB); prova.lookAt(bersE); prova.updateMatrixWorld(true);
        let xL = 1e9, xR = -1e9, yT = 1e9, yB = -1e9; for (const a of angoli) { const q = a.clone().project(prova); const x = (q.x * 0.5 + 0.5) * vista.w, y = (-q.y * 0.5 + 0.5) * vista.h;
          xL = Math.min(xL, x); xR = Math.max(xR, x); yT = Math.min(yT, y); yB = Math.max(yB, y); } return [xL, xR, yT, yB]; };
      for (let it = 0; it < 8; it++) {
        const [xL, xR, yT, yB] = misuraP(), fascia = Math.max(40, limBasso - limAlto);
        const f = Math.max((yB - yT) / (fascia * 0.96), (xR - xL) / largMax);
        if (Math.abs(f - 1) > 0.005) { dE *= f; tmpB.copy(dir).multiplyScalar(dE).add(bersE); continue; }                   // prima la scala (anche avvicinandosi)
        const dx = cxVoluto - (xL + xR) / 2, dy = (limAlto + limBasso) / 2 - (yT + yB) / 2;                                   // poi il centro
        if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) break;
        r3.setFromMatrixColumn(prova.matrixWorld, 0); u3.setFromMatrixColumn(prova.matrixWorld, 1);
        const sp = new THREE.Vector3().addScaledVector(r3, -dx / vista.w * 2 * dE * vista.tanH).addScaledVector(u3, dy / vista.h * 2 * dE * vista.tanV);
        bersE.add(sp); tmpB.add(sp);
      }
      camera.position.lerpVectors(tmpA, tmpB, E); camera.lookAt(bersM.lerp(bersE, E));
      radente.intensity = 1.5 * E; radente.position.copy(sfera.center).add(new THREE.Vector3(3, 6, 5)); radente.target.position.copy(sfera.center);
      rim.intensity = 2.2 * E; rim.position.copy(sfera.center).add(new THREE.Vector3(-4, 3, -3)); rim.target.position.copy(sfera.center);
    } else { camera.position.copy(tmpA); camera.lookAt(bersM); radente.intensity = 0; rim.intensity = 0; }
    return e;
  }
  const proj = (v) => { v.project(camera); return [(v.x * 0.5 + 0.5) * vista.w, (-v.y * 0.5 + 0.5) * vista.h]; };
  const ok = a => Number.isFinite(a[0]) && Number.isFinite(a[1]);
  function scafo(pts) {   // inviluppo convesso (catena monotona) dei punti proiettati: la maschera dello strato
    const q = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]); if (q.length < 3) return q;
    const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [], hi = [];
    for (const p of q) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
    for (let i = q.length - 1; i >= 0; i--) { const p = q[i]; while (hi.length >= 2 && cr(hi[hi.length - 2], hi[hi.length - 1], p) <= 0) hi.pop(); hi.push(p); }
    return lo.slice(0, -1).concat(hi.slice(0, -1));
  }
  let fps = [], conta = 0, fin = performance.now();
  return {
    disegna(t, p, az) { const e = aggiorna(t, p, az); const px = renderer.getDrawingBufferSize(tmpV2).y / (2 * vista.tanV); sprite.material.uniforms.uPx.value = spriteParete.material.uniforms.uPx.value = px; conBloom ? composer.render() : renderer.render(scena, camera); return e; },
    misuraFps(ora) { conta++; if (ora - fin > 1000) { fps.push(conta * 1000 / (ora - fin)); conta = 0; fin = ora; window.__fps = fps.slice();
      if (fps.length === 3 && Math.min(...fps.slice(1)) < 26 && conBloom) conBloom = false;
      if (fps.length === 6 && Math.min(...fps.slice(4)) < 22 && dpr > 1) { dpr = 1; renderer.setPixelRatio(1); misura(); } } },
    // gli strati dell'esploso sullo schermo, dal retro al fronte: ancora sul bordo visibile più basso, riquadro e maschera
    fili() {   // gli strati dell'esploso sullo schermo, dal retro al fronte: sagome vere proiettate, riquadro e inviluppo
      if (!(vista.w > 0 && vista.h > 0)) return null;
      scena.updateMatrixWorld(true); const v = new THREE.Vector3(); const out = [];
      for (const s of reali) {
        const pts = [];
        for (const [o, i] of s.campioni) { v.fromBufferAttribute(o.geometry.attributes.position, i).applyMatrix4(o.matrixWorld); const q = proj(v); if (ok(q)) pts.push(q); }
        if (!pts.length) continue;
        const sagome = (s.sagome || []).map(sg => { const passo = Math.max(1, Math.floor(sg.pts.length / 90)); const q = [];
          for (let k = 0; k < sg.pts.length; k += passo) { v.set(sg.pts[k][0], sg.pts[k][1], sg.z).applyMatrix4(s.grp.matrixWorld); const r = proj(v); if (ok(r)) q.push(r); }
          if (!sg.chiuso && (sg.pts.length - 1) % passo) { const u = sg.pts[sg.pts.length - 1]; v.set(u[0], u[1], sg.z).applyMatrix4(s.grp.matrixWorld); const r = proj(v); if (ok(r)) q.push(r); }
          return { pts: q, chiuso: sg.chiuso }; }).filter(sg => sg.pts.length > 1);
        const xs = pts.map(q => q[0]), ys = pts.map(q => q[1]);
        out.push({ k: s.k, testo: s.testo, mm: s.mm, riquadro: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)], maschera: scafo(pts), sagome });
      }
      return out;
    },
    ingombroPx() { const v = new THREE.Vector3(); let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; scena.updateMatrixWorld(true);
      for (const st of reali) for (let k = 0; k < st.campioni.length; k += 2) { const [o, i] = st.campioni[k]; v.fromBufferAttribute(o.geometry.attributes.position, i).applyMatrix4(o.matrixWorld); const q = proj(v);
        if (ok(q)) { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); } }
      return [x0, y0, x1, y1]; },
    pila: P.pila.map(s => ({ k: s.k, testo: s.testo, mm: s.mm })), pacchetto: P.pacchetto, esploso: () => esp,
    riquadro() { box.makeEmpty(); for (const s of reali) box.expandByObject(s.grp); let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) { const q = proj(new THREE.Vector3(x, y, z));
        x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); }
      return [x0, y0, x1, y1]; },
    vista, camera, insegna,
    strato(k) { const st = P.pila.find(x => x.k === k); return st ? st.grp : null; },   // per le prove automatiche
    info() { let tri = 0; scena.traverse(o => { if (o.isMesh) { const g = o.geometry; tri += (g.index ? g.index.count : g.attributes.position.count) / 3; } });
      return { triangoli: Math.round(tri), luci: luci.length, copie_tunnel: prodotto === "infinity" ? Q.copie : 0, bagliore: conBloom, dpr }; }
  };
}
