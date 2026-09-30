// FUTURA · schede prodotto v2 · motore 3D in tempo reale (three r185 vendorizzato, MIT).
// Geometria VERA dai file CNC (assets/3d/*.json, preparati da _strumenti/prepara_v2.py). Un solo motore per i 4 prodotti.
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

export const MODI = { fisso: 0, dimmer: 1, fluido: 2, staccato: 3, scia: 4, onda: 5, respiro: 6, riempimento: 7, scintille: 8 };
const TELEFONO = matchMedia("(pointer: coarse)").matches || innerWidth < 700;
const LUCI_MAX = TELEFONO ? 4 : 8;                       // 12 luci -> al massimo 4 sul telefono
const SCALA = { "120": 1, "140": 144 / 124, "160": 163 / 124 };

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
float inten(float t, float u){
  float v = uVel; float m = uModo;
  if (m < 0.5) return 1.0;
  if (m < 1.5) return 0.06 + 0.94 * uLivello;
  if (m < 2.5) return 0.1 + 0.9 * (0.5 + 0.5 * sin(t * (0.4 + 2.6 * v) * 6.2832));
  if (m < 3.5) return fr1(t * (1.0 + 9.0 * v)) < 0.5 ? 1.0 : 0.02;
  if (m < 4.5) { float d = fr1(fr1(t * (0.08 + 0.5 * v) + uFase) - u); return 0.16 + exp(-d * 4.5) * 1.35; }
  if (m < 5.5) return 0.12 + 0.88 * (0.5 + 0.5 * sin(6.2832 * (u * 3.0 - t * (0.2 + 1.2 * v))));
  if (m < 6.5) { float b = 0.5 + 0.5 * sin(t * (0.3 + 1.2 * v) * 6.2832); return 0.1 + 0.9 * b * b; }
  if (m < 7.5) return u < fr1(t * (0.1 + 0.4 * v)) ? 1.0 : 0.05;
  return hs(floor(u * 60.0) + floor(t * (2.0 + 10.0 * v)) * 7.3) > 0.78 ? 1.1 : 0.12;
}`;
// il tubo: silicone lattiginoso da 6 mm. Acceso: cuore caldo quasi bianco dove guarda l'occhio, rosso pieno sui fianchi (il bagliore fa l'alone).
// Spento: silicone rosato, illuminato solo dal giorno.
const VERT = `varying vec2 vUv; varying vec3 vN; varying vec3 vV;
void main(){ vUv = uv; vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`;
const FRAG = `uniform float uTempo, uModo, uVel, uLivello, uFase, uAtt, uAcceso, uGiorno; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
${GLSL_INTENSITA}
void main(){
  float i = inten(uTempo, vUv.x) * uAcceso * uAtt;
  float ndv = clamp(dot(normalize(vN), normalize(vV)), 0.0, 1.0);
  float nucleo = pow(ndv, 3.0);
  vec3 rosso = vec3(1.0, 0.028, 0.045);
  // sotto la soglia in cui ACES desatura il rosso verso il rosa: il colore resta pieno, l'alone lo fa il bagliore
  vec3 c = rosso * i * (0.62 + 0.48 * nucleo);
  c += vec3(0.35, 0.02, 0.02) * pow(nucleo, 6.0) * smoothstep(0.7, 1.0, i) * i;
  c += vec3(1.0, 0.45, 0.4) * max(i - 1.05, 0.0) * 2.2 * (0.4 + 0.6 * nucleo);   // la testa della scia: calda, quasi bianca, come nella foto approvata
  vec3 spento = vec3(0.8, 0.78, 0.76) * (0.05 + 0.62 * uGiorno) * (0.35 + 0.65 * ndv);   // silicone bianco traslucido
  c += spento * (1.0 - clamp(i, 0.0, 1.0)) * uAtt;
  gl_FragColor = vec4(c, 1.0);
}`;

const FRAG_ALONE = `uniform float uTempo, uModo, uVel, uLivello, uFase, uAtt, uAcceso, uGiorno; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
${GLSL_INTENSITA}
void main(){ float i = inten(uTempo, vUv.x) * uAcceso * uAtt; float ndv = clamp(dot(normalize(vN), normalize(vV)), 0.0, 1.0);
  gl_FragColor = vec4(vec3(1.0, 0.03, 0.05) * i * pow(ndv, 2.2) * 0.3, 1.0); }`;
function materialeAlone(base) {
  return new THREE.ShaderMaterial({ uniforms: base.uniforms, vertexShader: VERT, fragmentShader: FRAG_ALONE, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
}
function materialeNeon(fase) {
  const u = { uTempo: { value: 0 }, uModo: { value: 0 }, uVel: { value: 0.5 }, uLivello: { value: 1 }, uFase: { value: fase },
              uAtt: { value: 1 }, uAcceso: { value: 1 }, uGiorno: { value: 0 } };
  return new THREE.ShaderMaterial({ uniforms: u, vertexShader: VERT, fragmentShader: FRAG });
}
const forma = (poly, buchi = []) => {
  const s = new THREE.Shape(poly.map(p => new THREE.Vector2(p[0] / 1000, p[1] / 1000)));
  for (const b of buchi) s.holes.push(new THREE.Path(b.map(p => new THREE.Vector2(p[0] / 1000, p[1] / 1000))));
  return s;
};
const area = poly => Math.abs(poly.reduce((a, p, i) => { const q = poly[(i + 1) % poly.length]; return a + p[0] * q[1] - q[0] * p[1]; }, 0) / 2);
function tubo(poly, z, raggio, leggero) {
  const c = new THREE.CatmullRomCurve3(poly.map(p => new THREE.Vector3(p[0] / 1000, p[1] / 1000, z)), false, "centripetal");
  return new THREE.TubeGeometry(c, Math.max(40, poly.length * (leggero ? 1.5 : 3)) | 0, raggio, leggero ? 6 : (TELEFONO ? 10 : 14), false);
}
// punti del neon distribuiti per lunghezza (per le luci e le ancore)
function puntiLungo(neon, n) {
  const segs = []; let tot = 0;
  for (const poly of neon) for (let i = 1; i < poly.length; i++) { const l = Math.hypot(poly[i][0] - poly[i - 1][0], poly[i][1] - poly[i - 1][1]); segs.push([poly[i - 1], poly[i], tot, l]); tot += l; }
  const out = [];
  for (let k = 0; k < n; k++) { const d = (k + 0.5) / n * tot; const s = segs.find(s => d <= s[2] + s[3]) || segs[segs.length - 1]; const f = (d - s[2]) / s[3];
    out.push([s[0][0] + (s[1][0] - s[0][0]) * f, s[0][1] + (s[1][1] - s[0][1]) * f, k / n]); }
  return out;
}
// alone sulla parete: i tracciati VERI disegnati spessi e sfocati in una texture (misura, non disegno)
function texAlone(geo) {
  const [W, H] = geo.ingombro_mm, sc = 0.35, pad = 260;
  const cv = document.createElement("canvas"); cv.width = Math.round((W + pad * 2) * sc); cv.height = Math.round((H + pad * 2) * sc);
  const g = cv.getContext("2d"); g.fillStyle = "#000"; g.fillRect(0, 0, cv.width, cv.height);
  g.filter = "blur(" + Math.round(38 * sc * 2.2) + "px)"; g.strokeStyle = "#fff"; g.lineWidth = 70 * sc; g.lineCap = g.lineJoin = "round";
  for (const poly of geo.neon) { g.beginPath(); poly.forEach((p, i) => { const x = (p[0] + W / 2 + pad) * sc, y = (H / 2 - p[1] + pad) * sc; i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke(); }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  return { t, w: (W + pad * 2) / 1000, h: (H + pad * 2) / 1000 };
}

// ---------- i due prodotti ----------
function montaGen2(geo, neonMat) {
  const g = new THREE.Group(), strati = {};
  const forex = new THREE.MeshStandardMaterial({ color: 0x0b0a0a, roughness: 0.42, metalness: 0.0 });
  strati.pannelli = new THREE.Group();
  for (const poly of geo.pannelli) strati.pannelli.add(new THREE.Mesh(new THREE.ExtrudeGeometry(forma(poly), { depth: 0.010, bevelEnabled: true, bevelThickness: 0.0012, bevelSize: 0.0012, bevelSegments: 2, curveSegments: 1 }), forex));
  strati.neon = new THREE.Group();
  geo.neon.forEach((poly, i) => { const m = neonMat(i * 0.25); strati.neon.add(new THREE.Mesh(tubo(poly, 0.0095, 0.003), m)); strati.neon.add(new THREE.Mesh(tubo(poly, 0.0095, 0.0048), materialeAlone(m))); });
  strati.distanziali = new THREE.Group();
  const cromo = new THREE.MeshStandardMaterial({ color: 0xd8d8d8, roughness: 0.16, metalness: 1.0 });
  const [W, H] = geo.ingombro_mm.map(v => v / 1000);
  for (const [x, y] of [[-0.27, 0.04], [-0.08, -0.2], [0.08, 0.2], [0.27, -0.04]]) {   // POSIZIONE E MISURA INDICATIVE: il file CNC non le fissa
    const d = new THREE.Mesh(new THREE.CylinderGeometry(0.0085, 0.0085, 0.015, 20), cromo); d.rotation.x = Math.PI / 2; d.position.set(x * W, y * H, -0.0075); strati.distanziali.add(d);
  }
  g.add(strati.pannelli, strati.neon, strati.distanziali);
  g.position.z = 0.015;                                    // i distanziali la tengono staccata dalla parete
  const esplodi = e => { strati.distanziali.position.z = -e * 0.10; strati.pannelli.position.z = e * 0.14; strati.neon.position.z = e * 0.42; };
  return { g, strati, esplodi, zRetro: -0.015, neonTubi: strati.neon.children };
}
function montaInfinity(geo, neonMat, qualita) {
  const g = new THREE.Group(), strati = {};
  // coppie della battuta: per ogni cassa il contorno esterno e quello interno (corsia di 3,3 mm)
  const bat = geo.battuta.slice().sort((a, b) => area(b) - area(a));
  const esterni = bat.slice(0, 2), interni = bat.slice(2);
  const forex = new THREE.MeshStandardMaterial({ color: 0x121010, roughness: 0.5 });
  const dibond = new THREE.MeshStandardMaterial({ color: 0x0d0d0e, roughness: 0.32, metalness: 0.35 });
  const spec = new THREE.MeshBasicMaterial({ color: 0x070606 });   // lo specchio non riflette le luci come puntini: il suo riflesso vero è il tunnel
  strati.base = new THREE.Group();
  for (const poly of geo.pannelli) strati.base.add(new THREE.Mesh(new THREE.ExtrudeGeometry(forma(poly), { depth: 0.010, bevelEnabled: true, bevelThickness: 0.001, bevelSize: 0.001, bevelSegments: 2, curveSegments: 1 }), forex));
  strati.specchio = new THREE.Group();
  for (const poly of interni) { const m = new THREE.Mesh(new THREE.ShapeGeometry(forma(poly)), spec); m.position.z = 0.0131; strati.specchio.add(m); }
  strati.corsia = new THREE.Group();
  esterni.forEach((poly, i) => { const m = new THREE.Mesh(new THREE.ExtrudeGeometry(forma(poly, [interni[i]]), { depth: 0.033, bevelEnabled: false, curveSegments: 1 }), dibond); m.position.z = 0.010; strati.corsia.add(m); });
  strati.neon = new THREE.Group();
  geo.neon.forEach((poly, i) => { const m = neonMat(i * 0.25); strati.neon.add(new THREE.Mesh(tubo(poly, 0.016, 0.003), m)); strati.neon.add(new THREE.Mesh(tubo(poly, 0.016, 0.0048), materialeAlone(m))); });
  // il TUNNEL: copie del neon ogni 2d dietro lo specchio (d = 30 mm), sempre più deboli; si vedono solo dentro l'apertura (stencil)
  strati.tunnel = new THREE.Group(); const copie = [];
  const N = qualita.copie, R = 0.66;
  for (let k = 1; k <= N; k++) geo.neon.forEach((poly, i) => {
    const mat = neonMat(i * 0.25); mat.uniforms.uAtt.value = Math.pow(R, k);
    mat.stencilWrite = true; mat.stencilRef = 1; mat.stencilFunc = THREE.EqualStencilFunc; mat.depthTest = false; mat.depthWrite = false;
    const m = new THREE.Mesh(tubo(poly, 0.016 - k * 0.060, 0.003, true), mat); m.renderOrder = 2; m.userData.k = k; strati.tunnel.add(m); copie.push(m);
  });
  const finestra = new THREE.Group();   // l'apertura sul frontale: scrive lo stencil, non il colore
  const mStencil = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, stencilWrite: true, stencilRef: 1, stencilZPass: THREE.ReplaceStencilOp });
  for (const poly of interni) { const m = new THREE.Mesh(new THREE.ShapeGeometry(forma(poly)), mStencil); m.position.z = 0.0431; m.renderOrder = 1; finestra.add(m); }
  strati.frontale = new THREE.Group();
  const vetro = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false });
  for (const poly of esterni) { const m = new THREE.Mesh(new THREE.ShapeGeometry(forma(poly)), vetro); m.position.z = 0.0445; m.renderOrder = 3; strati.frontale.add(m); }
  strati.frontale.add(finestra);
  // supporti a L inox nero sul retro
  strati.supporti = new THREE.Group();
  const inox = new THREE.MeshStandardMaterial({ color: 0x1a1a1b, roughness: 0.35, metalness: 0.9 });
  const pb = geo.pannelli.flat(); const [W, H] = geo.ingombro_mm.map(v => v / 1000);
  for (const [fx, fy] of [[-0.38, 0.1], [-0.18, -0.25], [0, 0.35], [0.18, 0.25], [0.38, -0.1], [0, -0.35]]) {
    const L = new THREE.Group(); const a = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.002, 0.02), inox); a.position.z = -0.01; const b = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.002), inox); b.position.set(0, -0.015, -0.02);
    L.add(a, b); L.position.set(fx * W, fy * H * 0.6, 0); strati.supporti.add(L);
  }
  g.add(strati.base, strati.specchio, strati.corsia, strati.neon, strati.tunnel, strati.frontale, strati.supporti);
  g.position.z = 0.02;
  const esplodi = e => {
    strati.specchio.position.z = e * 0.11; strati.corsia.position.z = e * 0.22; strati.neon.position.z = e * 0.33;
    strati.frontale.position.z = e * 0.46; strati.supporti.position.z = -e * 0.12; strati.tunnel.position.z = e * 0.33;
    for (const m of copie) m.material.uniforms.uAtt.value = Math.pow(R, m.userData.k) * (1 - e);   // smontata, il tunnel non esiste
  };
  const frontale = tipo => { vetro.opacity = tipo === "pellicola" ? 0.22 : 0.3; };
  return { g, strati, esplodi, frontale, zRetro: -0.02, neonTubi: [...strati.neon.children, ...copie] };
}

// ---------- la sala: parete scura e quieta, pavimento, asta da 175 cm. L'insegna è la protagonista ----------
export async function costruisci({ tela, geo, prodotto, stato, qualita = {} }) {
  const renderer = new THREE.WebGLRenderer({ canvas: tela, antialias: !TELEFONO, stencil: true, powerPreference: "high-performance" });
  let dpr = Math.min(window.devicePixelRatio || 1, TELEFONO ? 1.6 : 1.75); renderer.setPixelRatio(dpr);
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05; renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scena = new THREE.Scene(); const sfondo = new THREE.Color(0x060505); scena.background = sfondo;
  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 40);
  const Q = { copie: qualita.copie || (TELEFONO ? 5 : 8) };

  const parete = new THREE.Mesh(new THREE.PlaneGeometry(40, 12), new THREE.MeshStandardMaterial({ color: 0x3a3432, roughness: 0.93 }));
  parete.position.set(0, 5.5, 0); scena.add(parete);
  const pav = new THREE.Mesh(new THREE.PlaneGeometry(40, 20), new THREE.MeshStandardMaterial({ color: 0x0b0a0a, roughness: 0.55 }));
  pav.rotation.x = -Math.PI / 2; pav.position.set(0, 0, 10); scena.add(pav);

  const materiali = [];
  const neonMat = fase => { const m = materialeNeon(fase); materiali.push(m); return m; };
  const P = prodotto === "infinity" ? montaInfinity(geo, neonMat, Q) : montaGen2(geo, neonMat);
  const insegna = new THREE.Group(); insegna.add(P.g); insegna.position.y = 2.3; scena.add(insegna);

  // alone sulla parete, costruito dai tracciati veri
  const A = texAlone(geo);
  const alone = new THREE.Mesh(new THREE.PlaneGeometry(A.w, A.h), new THREE.MeshBasicMaterial({ map: A.t, color: new THREE.Color(1, 0.05, 0.07), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 }));
  alone.position.z = 0.002 - P.g.position.z; P.g.add(alone);   // sta sulla parete, cresce con l'insegna

  // luci: neon (al massimo 4 sul telefono), chiave, bordo per il Forex, giorno
  const luci = puntiLungo(geo.neon, LUCI_MAX).map(([x, y, u]) => { const l = new THREE.PointLight(0xff1a1a, 0, 2.2, 2); l.position.set(x / 1000, y / 1000, 0.32); l.userData.u = u; insegna.add(l); return l; });
  const ambiente = new THREE.AmbientLight(0xffffff, 0.03); scena.add(ambiente);
  const cielo = new THREE.HemisphereLight(0xf2eee8, 0x2a2624, 0); scena.add(cielo);
  const chiave = new THREE.DirectionalLight(0xfff6ee, 0.35); chiave.position.set(-2, 4, 4); scena.add(chiave);
  const bordo = new THREE.DirectionalLight(0xffffff, 0.55); bordo.position.set(0.6, 6, 1.2); scena.add(bordo);  // luce radente dall'alto: disegna il bordo del Forex
  const radente = new THREE.DirectionalLight(0xfff4ee, 0); radente.position.set(-2.5, 3, 2); scena.add(radente);  // per l'esploso

  // riferimento di scala: una persona di 175 cm (sagoma scura da primitive: una misura, non un disegno), davanti alla parete
  // metà destra della sagoma frontale di un adulto di 175 cm (metri); la sinistra è speculare
  const MEZZA = [[0, 1.75], [0.05, 1.735], [0.078, 1.69], [0.085, 1.64], [0.078, 1.59], [0.055, 1.545], [0.05, 1.5], [0.12, 1.46], [0.2, 1.43], [0.228, 1.38],
                 [0.245, 1.1], [0.248, 0.88], [0.232, 0.79], [0.205, 0.8], [0.2, 0.9], [0.192, 1.22], [0.172, 1.27], [0.162, 1.05], [0.172, 0.9],
                 [0.158, 0.46], [0.138, 0.06], [0.15, 0.0], [0.035, 0.0], [0.04, 0.4], [0.02, 0.8], [0, 0.83]];
  const sag = new THREE.Shape(); const giro = MEZZA.concat(MEZZA.slice(1, -1).reverse().map(([x, y]) => [-x, y]));
  giro.forEach(([x, y], k) => k ? sag.lineTo(x, y) : sag.moveTo(x, y));
  const persona = new THREE.Group();
  const corpo = new THREE.Mesh(new THREE.ShapeGeometry(sag), new THREE.MeshBasicMaterial({ color: 0x5a5351 }));   // tono medio, piatto: non concorre con la luce
  persona.add(corpo);
  persona.position.set(-0.12, 0, 0.75); scena.add(persona);
  const ombraP = new THREE.Mesh(new THREE.CircleGeometry(0.34, 32), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.55, depthWrite: false }));
  ombraP.rotation.x = -Math.PI / 2; ombraP.scale.set(1, 0.45, 1); ombraP.position.set(-0.12, 0.002, 0.75); scena.add(ombraP);
  const asta = { position: new THREE.Vector3(-0.12, 0, 0.75) };            // l'etichetta «175 cm» si ancora accanto alla testa
  // luce radente dall'alto, vicina alla parete: la parete si legge come piano, senza diventare protagonista
  const radenteParete = new THREE.SpotLight(0xffeee4, 0, 5, 0.95, 1.0, 1.4); radenteParete.position.set(0, 4.6, 0.28); radenteParete.target.position.set(0, 1.2, 0); scena.add(radenteParete, radenteParete.target);
  // ombra di contatto del Forex sulla parete (si vede di giorno)
  const ombra = (() => { const [W, H] = geo.ingombro_mm, sc = 0.55, pad = 60; const cv = document.createElement("canvas"); cv.width = Math.round((W + 2 * pad) * sc); cv.height = Math.round((H + 2 * pad) * sc);
    const g = cv.getContext("2d"); g.filter = "blur(" + Math.round(9 * sc) + "px)"; g.fillStyle = "rgba(0,0,0,1)";
    for (const poly of geo.pannelli) { g.beginPath(); poly.forEach((p, k) => { const x = (p[0] + W / 2 + pad) * sc, y = (H / 2 - p[1] + pad) * sc + 6 * sc; k ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath(); g.fill(); }
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
    return new THREE.Mesh(new THREE.PlaneGeometry((W + 2 * pad) / 1000, (H + 2 * pad) / 1000), new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: 0, depthWrite: false })); })();
  ombra.position.z = 0.0015 - P.g.position.z; P.g.add(ombra);

  // bagliore su un bersaglio HDR con stencil (serve al tunnel)
  const rt = new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType, stencilBuffer: true, depthBuffer: true });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scena, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.62, 0.5, 0.4);
  composer.addPass(bloom); composer.addPass(new OutputPass());
  let conBloom = true;

  const vista = { w: 1, h: 1, dist: 4, verticale: false };
  function misura() {
    const w = tela.clientWidth, h = tela.clientHeight; vista.w = w; vista.h = h; vista.verticale = h > w;
    renderer.setSize(w, h, false); composer.setSize(w, h); bloom.resolution.set(w * dpr / 2, h * dpr / 2);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    vista.tanH = Math.tan(camera.fov * Math.PI / 360) * w / h; vista.tanV = Math.tan(camera.fov * Math.PI / 360);
  }
  new ResizeObserver(misura).observe(tela); misura();

  let giorno = stato.giorno ? 1 : 0, acceso = stato.acceso === false ? 0 : 1, scala = SCALA[stato.misura];
  const colParNotte = new THREE.Color(0x312b2a), colParGiorno = new THREE.Color(0x8d8782);
  function aggiorna(t, p, azUtente) {
    giorno += ((stato.giorno ? 1 : 0) - giorno) * 0.12; acceso += ((stato.acceso === false ? 0 : 1) - acceso) * 0.25;
    scala += (SCALA[stato.misura] - scala) * 0.18; insegna.scale.setScalar(scala);
    const m = MODI[stato.modo];
    for (const mt of materiali) { const u = mt.uniforms; u.uTempo.value = t; u.uModo.value = m; u.uVel.value = stato.velocita; u.uLivello.value = stato.livello; u.uAcceso.value = acceso; u.uGiorno.value = giorno; }
    let media = 0;
    for (const l of luci) { const i = intensita(stato, t, l.userData.u) * acceso; l.intensity = (0.1 / Math.sqrt(LUCI_MAX / 4)) * Math.min(i, 1.2) * (1 - 0.6 * giorno); media += i; }
    media /= luci.length;
    alone.material.opacity = Math.min(1, media) * 0.36 * (1 - 0.75 * giorno);
    ambiente.intensity = 0.1 + 0.55 * giorno; radenteParete.intensity = 7 + 10 * giorno; ombra.material.opacity = 0.1 + 0.45 * giorno; cielo.intensity = 1.1 * giorno; chiave.intensity = 0.35 + 0.9 * giorno;
    parete.material.color.copy(colParNotte).lerp(colParGiorno, giorno); sfondo.copy(new THREE.Color(0x060505)).lerp(new THREE.Color(0x3a3634), giorno);
    // esploso guidato dallo scroll (p) e camera
    const ss = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
    const e = ss(0.12, 0.42, p) * (1 - ss(0.66, 0.86, p));
    P.esplodi(e); radente.intensity = 1.3 * e; persona.visible = ombraP.visible = e < 0.25;
    persona.rotation.y = Math.atan2(camera.position.x - persona.position.x, camera.position.z - persona.position.z);
    corpo.material.color.setHex(0x5a5351).lerp(new THREE.Color(0x7c7471), giorno);
    for (const mt of materiali) if (mt.uniforms.uAtt.value >= 0.999) mt.uniforms.uAcceso.value = acceso * (1 - 0.5 * e);
    // in verticale la larghezza è l'unica misura senza margine: la distanza è quella che fa l'insegna (misura scelta) larga il 92%
    const Wm = geo.ingombro_mm[0] / 1000 * scala;
    const quota = vista.verticale ? 0.92 : 0.64;
    const dist = (Wm / quota / 2) / vista.tanH * (1 + (vista.verticale ? 0.3 : 0.35) * e);
    const az = (vista.verticale ? Math.max(-0.3, Math.min(0.3, azUtente)) : azUtente) + e * (vista.verticale ? 0.42 : 0.72) + (stato.fermo ? 0 : Math.sin(t * 0.18) * 0.03);   // in verticale la deriva resta corta: la persona intera in quadro   // sul telefono, esploso: fermo immagine
    const alto = vista.verticale ? 0.44 : 0.12 * (1 - e);                  // in verticale il centro dell'insegna sta al 28% dall'alto
    const destra = vista.verticale ? 0 : ss(0.8, 1, p) * 0.3;               // a 1440, «Accendila»: insegna a destra, comandi a sinistra
    let ty = 2.3 - alto * dist * vista.tanV, tx = -destra * dist * vista.tanH;
    if (vista.verticale && e > 0.001) { const bb = new THREE.Box3(); for (const g of Object.values(P.strati)) bb.union(new THREE.Box3().setFromObject(g)); const c = bb.getCenter(new THREE.Vector3()); tx += (c.x - tx) * e; }
    camera.position.set(tx + Math.sin(az) * dist, 2.3 + e * 0.2 - (vista.verticale ? 0.18 : 0), Math.cos(az) * dist);
    camera.lookAt(tx, ty, 0);
    return e;
  }
  let fps = [], conta = 0, fin = performance.now();
  return {
    disegna(t, p, az) { const e = aggiorna(t, p, az); conBloom ? composer.render() : renderer.render(scena, camera); return e; },
    // un telefono lento perde prima il bagliore, poi la densità; mai la scena
    misuraFps(ora) { conta++; if (ora - fin > 1000) { fps.push(conta * 1000 / (ora - fin)); conta = 0; fin = ora; window.__fps = fps.slice();
      if (fps.length === 3 && Math.min(...fps.slice(1)) < 38 && conBloom) conBloom = false;
      if (fps.length === 6 && Math.min(...fps.slice(4)) < 30 && dpr > 1) { dpr = 1; renderer.setPixelRatio(1); misura(); } } },
    // punto di uno strato intero (riquadro reale, in coordinate del mondo) proiettato sullo schermo
    punto(nome, fx, fy) { const g = P.strati[nome]; if (!g) return null; const b = new THREE.Box3().setFromObject(g); if (b.isEmpty()) return null;
      const v = new THREE.Vector3(b.min.x + (b.max.x - b.min.x) * fx, b.min.y + (b.max.y - b.min.y) * fy, b.max.z).project(camera);
      return [(v.x * 0.5 + 0.5) * vista.w, (-v.y * 0.5 + 0.5) * vista.h]; },
    // riquadro dell'insegna sullo schermo (solo gli strati veri: niente alone, niente ombra)
    riquadro() { const b = new THREE.Box3(); for (const g of Object.values(P.strati)) b.union(new THREE.Box3().setFromObject(g)); let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) { const v = new THREE.Vector3(x, y, z).project(camera);
        const sx = (v.x * 0.5 + 0.5) * vista.w, sy = (-v.y * 0.5 + 0.5) * vista.h; x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy); }
      return [x0, y0, x1, y1]; },
    proietta(v) { const q = v.clone(); insegna.localToWorld(q); q.project(camera); return [(q.x * 0.5 + 0.5) * vista.w, (-q.y * 0.5 + 0.5) * vista.h]; },
    ancore: P.strati, frontale: P.frontale || (() => {}), asta, persona, vista, camera, insegna,
    // testa e spalle della persona sullo schermo: per l'etichetta «175 cm» accanto al viso e per il controllo «sempre in quadro»
    testaPx() { const P2 = (x, y) => { const v = new THREE.Vector3(x, y, 0); persona.localToWorld(v); v.project(camera); return [(v.x * 0.5 + 0.5) * vista.w, (-v.y * 0.5 + 0.5) * vista.h]; };
      const t = P2(0, 1.645), c = P2(0, 1.75), l = P2(-0.2, 1.43), r = P2(0.2, 1.43);
      return { testa: t, cima: c[1], spalle: [Math.min(l[0], r[0]), r[1], Math.max(l[0], r[0])] }; },
    info() { let tri = 0; scena.traverse(o => { if (o.isMesh) { const g = o.geometry; tri += (g.index ? g.index.count : g.attributes.position.count) / 3; } });
      return { triangoli: Math.round(tri), luci: luci.length, copie_tunnel: prodotto === "infinity" ? Q.copie : 0, bagliore: conBloom, dpr }; }
  };
}
