// VIBES · scheda prodotto · logica di pagina e scena 3D (three r185, già in uso su FUTURA).
// Stato nell'URL, prezzo, telecomandino con tre effetti (Fade, Flash, Strobe) e velocità.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { toCreasedNormals } from "three/addons/utils/BufferGeometryUtils.js";

const D = window.DATI, NUM = D.whatsapp, TELE = D.telecomandino;
const MISURE = Object.keys(D.misure);
const $ = (s, r = document) => r.querySelector(s);
const tutti = (s, f) => document.querySelectorAll(s).forEach(f);
const RIDOTTO = matchMedia("(prefers-reduced-motion: reduce)").matches;
const EFFETTI = ["fisso", "fade", "flash", "strobe"];

/* ---------------- stato (vive nell'URL) ---------------- */
const q = new URLSearchParams(location.search);
const s = {
  misura: MISURE.includes(q.get("misura")) ? q.get("misura") : "110",
  tele: q.get("tele") === "1",
  effetto: EFFETTI.includes(q.get("effetto")) ? q.get("effetto") : "fisso",
  vel: q.has("vel") ? Math.min(1, Math.max(0, +q.get("vel"))) : 0.45,
  acceso: q.get("spento") !== "1",
  giorno: q.get("giorno") === "1",
  rapido: false,   // la velocità oltre i 3 Hz si sblocca a mano, ogni volta
  quote: false,
};
if (!s.tele) s.effetto = "fisso";

const euro = n => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") + " €";
const prezzo = (m = s.misura) => D.misure[m].prezzo + (s.tele ? TELE : 0);
const descrizione = () => "Insegna VIBES " + s.misura + " cm" + (s.tele ? ", con telecomandino" : ", luce fissa");
const wa = (testo) => "https://wa.me/" + NUM + "?text=" + encodeURIComponent(testo);
const urlScelta = () => {
  const n = new URLSearchParams();
  n.set("misura", s.misura);
  if (s.tele) { n.set("tele", "1"); n.set("effetto", s.effetto); n.set("vel", s.vel.toFixed(2)); }
  if (!s.acceso) n.set("spento", "1");
  if (s.giorno) n.set("giorno", "1");
  return n;
};
const nomeVel = v => v < 0.2 ? "lenta" : v < 0.45 ? "media-lenta" : v < 0.7 ? "media" : v < 0.88 ? "veloce" : "massima";

/* ---------------- interfaccia ---------------- */
function disegna() {
  const m = D.misure[s.misura];
  tutti("[data-misura]", b => { const on = b.dataset.misura === s.misura; b.setAttribute("aria-checked", String(on)); b.tabIndex = on ? 0 : -1; });
  tutti("[data-titolo-misura]", e => e.textContent = s.misura + " cm");
  tutti("[data-dimensioni]", e => e.textContent = s.misura + " × " + m.h + " cm · profondità 4 cm");
  tutti("[data-acceso]", b => { b.setAttribute("aria-checked", String(s.acceso)); b.querySelector(".testo-sw").textContent = s.acceso ? "Accesa" : "Spenta"; });
  tutti("[data-tele]", b => b.setAttribute("aria-checked", String(s.tele)));
  tutti("[data-giorno]", b => b.setAttribute("aria-pressed", String((b.dataset.giorno === "1") === s.giorno)));
  const tc = $("[data-telecomando]"); tc.hidden = !s.tele;
  $("[data-nota-tele]").hidden = s.tele;
  tutti("[data-effetto]", b => b.setAttribute("aria-pressed", String(b.dataset.effetto === s.effetto)));
  const vel = $("[data-velocita]"); vel.value = s.vel; vel.disabled = s.effetto === "fisso";
  const fe = freqEff(), fr = freqRichiesta(), ap = (s.effetto === "flash" || s.effetto === "strobe") && fr > SOGLIA_SICURA;
  $("[data-vel-val]").textContent = s.effetto === "fisso" ? "–" : s.effetto === "fade" ? (7.5 - 6.3 * s.vel).toFixed(1).replace(".", ",") + " s" : fmtHz(fe);
  const bt = $("[data-rapido]"); bt.hidden = !ap; bt.setAttribute("aria-pressed", String(s.rapido));
  bt.textContent = s.rapido ? "Velocità massima attiva · torna alla sicura" : "Mostra la velocità massima (" + fmtHz(fr) + ")";
  $("[data-avviso]").hidden = !(ap && s.rapido);
  tutti("[data-quote]", b => b.setAttribute("aria-pressed", String(s.quote)));
  $("[data-nota-effetto]").textContent = RIDOTTO
    ? "Il tuo dispositivo chiede meno movimento: gli effetti qui restano fermi. Sull'insegna vera funzionano."
    : "Fade: la luce sale e scende. Flash: si accende e si spegne. Strobe: lampi brevi, fino a tre al secondo.";
  tutti("[data-prezzo]", e => e.textContent = euro(prezzo()));
  tutti("[data-descrizione]", e => e.textContent = descrizione());
  const msg = "Ciao Massimo, per VIBES scegliamo: " + descrizione() + ", " + euro(prezzo()) + ". " + location.origin + location.pathname + "?" + urlScelta();
  tutti("[data-scegli]", a => a.href = wa(msg));
  tutti("[data-foto-parete]", a => a.href = wa("Ciao Massimo, per VIBES ti mando la foto della parete dove va: " + descrizione() + ". Ci fate la simulazione sulla nostra parete?"));
  tutti("[data-tabella] tbody tr", r => { if (r.dataset.m === s.misura) r.setAttribute("aria-current", "true"); else r.removeAttribute("aria-current"); });
  history.replaceState(null, "", "?" + urlScelta());
}

// tabella di tutte le misure e i prezzi
(function tabella() {
  const tb = $("[data-tabella] tbody");
  MISURE.forEach(m => {
    const d = D.misure[m], r = document.createElement("tr"); r.dataset.m = m;
    r.innerHTML = '<td><button type="button" class="riga-misura" data-riga="' + m + '">' + m + " cm<small>" + m + " × " + d.h + " cm</small></button></td>" +
      '<td class="n">' + euro(d.prezzo) + '</td><td class="n">' + euro(d.prezzo + TELE) + "</td>";
    tb.appendChild(r);
  });
})();

document.addEventListener("click", e => {
  const t = e.target.closest("button"); if (!t) return;
  const d = t.dataset;
  if (d.misura) cambiaMisura(d.misura);
  else if (d.riga) { cambiaMisura(d.riga); scrollTo({ top: 0, behavior: RIDOTTO ? "auto" : "smooth" }); }
  else if ("acceso" in d) s.acceso = !s.acceso;
  else if ("rapido" in d) s.rapido = !s.rapido;
  else if ("quote" in d) s.quote = !s.quote;
  else if (d.giorno) s.giorno = d.giorno === "1";
  else if ("tele" in d) { s.tele = !s.tele; if (!s.tele) s.effetto = "fisso"; else if (s.effetto === "fisso") s.effetto = "fade"; s.acceso = true; s.rapido = false; }
  else if (d.effetto) { s.effetto = d.effetto; s.acceso = true; s.rapido = false; }
  else if ("condividi" in d) { condividi(); return; }
  else return;
  disegna();
});
document.addEventListener("input", e => { if (e.target.matches("[data-velocita]")) { s.vel = +e.target.value; disegna(); } });
document.addEventListener("keydown", e => {
  const g = e.target.closest && e.target.closest("[data-misure]"); if (!g) return;
  const i = MISURE.indexOf(s.misura); let j = i;
  if (e.key === "ArrowRight" || e.key === "ArrowDown") j = Math.min(MISURE.length - 1, i + 1);
  else if (e.key === "ArrowLeft" || e.key === "ArrowUp") j = Math.max(0, i - 1);
  else if (e.key === "Home") j = 0; else if (e.key === "End") j = MISURE.length - 1; else return;
  e.preventDefault(); cambiaMisura(MISURE[j]); disegna(); g.querySelector('[data-misura="' + MISURE[j] + '"]').focus();
});

async function condividi() {
  const url = location.origin + location.pathname + "?" + urlScelta();
  const testo = "Guarda questa: " + descrizione() + ", " + euro(prezzo()) + ".";
  const st = $("[data-stato-cond]");
  try { if (navigator.share) { await navigator.share({ title: "VIBES · insegna 3D", text: testo, url }); st.textContent = "Inviato."; return; } }
  catch (err) { if (err && err.name === "AbortError") return; }
  window.open("https://wa.me/?text=" + encodeURIComponent(testo + " " + url), "_blank", "noopener");
  st.textContent = "Si apre WhatsApp con il link già scritto.";
}

// la barra del prezzo si ritira quando la chiusura con il suo pulsante è in vista: mai due pieni insieme
(() => {
  const barra = $("[data-barra]"), cta = $("[data-cta]"), conto = $(".conto"); let attesa = false;
  const dentro = e => { const r = e.getBoundingClientRect(); return r.top < innerHeight - 40 && r.bottom > 40; };
  const aggiorna = () => { attesa = false; barra.classList.toggle("ceduta", cta.getBoundingClientRect().top < innerHeight - 40 || dentro(conto)); };
  addEventListener("scroll", () => { if (!attesa) { attesa = true; requestAnimationFrame(aggiorna); } }, { passive: true });
  addEventListener("resize", aggiorna); aggiorna();
})();

/* ---------------- effetti del telecomandino ---------------- */
// Frequenze dei due effetti a lampi, in Hz, dal più lento al più veloce. Il telecomando fornito arriva a 3 Hz (scelta di Massimo, 04/11):
// i massimi sono qui (si cambiano solo queste due righe).
const FREQ = { flash: [0.35, 3], strobe: [1, 3] };
const SOGLIA_SICURA = 3;   // oltre 3 lampi al secondo su un'area grande può dare fastidio a chi è sensibile: si mostra solo se lo chiede
const lerp = (a, b, k) => a + (b - a) * k;
const freqRichiesta = () => (s.effetto === "flash" || s.effetto === "strobe") ? lerp(FREQ[s.effetto][0], FREQ[s.effetto][1], s.vel) : 0;
const freqEff = () => { const f = freqRichiesta(); return s.rapido ? f : Math.min(f, SOGLIA_SICURA); };
const fmtHz = f => f.toFixed(1).replace(".", ",") + " Hz";

// intensità 0..1 al tempo t.
function intensita(t) {
  if (!s.acceso) return 0;
  if (!s.tele || s.effetto === "fisso" || RIDOTTO) return 1;
  if (s.effetto === "fade") { const P = 7.5 - 6.3 * s.vel; return 0.1 + 0.9 * (0.5 - 0.5 * Math.cos(2 * Math.PI * t / P)); }
  const f = freqEff();
  if (s.effetto === "flash") return ((t * f) % 1) < 0.5 ? 1 : 0.04;
  return ((t * f) % 1) < 0.14 ? 1 : 0.03;   // strobe: lampi brevi
}

/* ---------------- scena 3D ---------------- */
// Come su FUTURA: l'insegna sospesa sul nero, con l'alone morbido della sua luce dietro. Niente scroll a fasi: si gira col dito.
const scena = $("[data-scena]"), tela = $("[data-tela]"), statoTxt = $("[data-stato-testo]");
const stato3d = { set textContent(t) { statoTxt.textContent = t; } };   // il micro-stato «Sta scrivendo» è il caricamento vero
let R = null;   // renderer + composer + oggetti, solo se WebGL parte
// «Sala soffusa»: parete grigio caldo con una pozza di luce, così il nero delle lettere si legge. «Luce accesa»: parete chiara, LED quasi spenti alla vista.
const NOTTE = { esposizione: 1.1, env: 0.3, bloom: 0.55, alone: 0.6, muro: 0.62 };
const GIORNO = { esposizione: 1.15, env: 0.55, bloom: 0.1, alone: 0.06, muro: 1.7 };
const SF_NOTTE = new THREE.Color(0x14120f), SF_GIORNO = new THREE.Color(0x4a4744);

function avviaScena() {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas: tela, antialias: true, powerPreference: "high-performance" }); }
  catch (err) { return errore("Il 3D non parte su questo dispositivo: vedi il render."); }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = SF_NOTTE.clone();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;   // riflessi morbidi sul PETG nero
  const cam = new THREE.PerspectiveCamera(28, 1, 0.05, 30);

  // materiali: i nomi arrivano dal GLB (Blender), qui diventano quelli veri
  const mat = {
    nero: new THREE.MeshStandardMaterial({ color: 0x070708, roughness: 0.62, metalness: 0.0 }),
    griglia: new THREE.MeshStandardMaterial({ color: 0x0a0a0b, roughness: 0.7, metalness: 0.0 }),
    barra: new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.85 }),
    led: new THREE.MeshBasicMaterial({ color: 0xff1a0a, side: THREE.DoubleSide }),
    opale: new THREE.MeshStandardMaterial({ color: 0x200604, roughness: 0.55, emissive: 0xff0a02, emissiveIntensity: 1.0 }),
  };
  mat.opale.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying float vYo;").replace("#include <begin_vertex>", "#include <begin_vertex>\nvYo = position.y;");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying float vYo;").replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\ntotalEmissiveRadiance *= mix(0.5, 1.0, smoothstep(0.02, 0.27, vYo));");
  };
  scene.add(new THREE.HemisphereLight(0xb5a79c, 0x1a1512, 0.55));
  const chiave = new THREE.DirectionalLight(0xffe3c8, 1.9); chiave.position.set(-1.3, 1.7, 2.4);
  chiave.castShadow = true; chiave.shadow.mapSize.set(2048, 2048); chiave.shadow.bias = -0.0004; chiave.shadow.normalBias = 0.002; chiave.shadow.radius = 5;
  Object.assign(chiave.shadow.camera, { left: -1.1, right: 1.1, top: 0.7, bottom: -0.7, near: 0.5, far: 7 }); chiave.shadow.camera.updateProjectionMatrix();
  scene.add(chiave);
  const riempi = new THREE.DirectionalLight(0xdfe6ff, 0.5); riempi.position.set(1.8, 0.1, 2.0); scene.add(riempi);
  const taglio = new THREE.DirectionalLight(0xc8d4ff, 0.8); taglio.position.set(1.6, 0.6, -1.1); scene.add(taglio);   // luce di taglio: dà spessore ai fianchi
  const lucePunto = new THREE.PointLight(0xff2a14, 1, 2.0, 2); lucePunto.position.set(0, 0, 0.42); scene.add(lucePunto);

  // parete: pozza di luce al centro, ombra morbida delle lettere sopra
  const cv = document.createElement("canvas"); cv.width = 512; cv.height = 320;
  const cg = cv.getContext("2d"), gr = cg.createRadialGradient(256, 150, 20, 256, 160, 330);
  gr.addColorStop(0, "#6a625b"); gr.addColorStop(0.45, "#3a3531"); gr.addColorStop(1, "#0d0b0a");
  cg.fillStyle = gr; cg.fillRect(0, 0, 512, 320);
  const tm = new THREE.CanvasTexture(cv); tm.colorSpace = THREE.SRGBColorSpace;
  const muroMat = new THREE.MeshBasicMaterial({ map: tm });
  const muro = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 2.9), muroMat); muro.position.z = -0.07; scene.add(muro);
  const ombra = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 2.9), new THREE.ShadowMaterial({ opacity: 0.22 })); ombra.position.z = -0.0695; ombra.receiveShadow = true; scene.add(ombra);

  // alone: la sagoma luminosa sfocata (da Blender), dietro l'insegna, in additivo
  const alone = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }));
  alone.renderOrder = -1; scene.add(alone);
  new THREE.TextureLoader().load("assets/img/halo-vibes-3.png", t => { t.colorSpace = THREE.SRGBColorSpace; alone.material.map = t; alone.material.needsUpdate = true; });

  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(256, 256, { type: THREE.HalfFloatType, samples: q.get("msaa") === "1" ? 4 : 0 }));   // MSAA solo su richiesta (?msaa=1): su alcune GPU il target a virgola mobile multisample resta nero
  composer.addPass(new RenderPass(scene, cam));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.5, 0.5, 0.88);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  const gruppo = new THREE.Group(); scene.add(gruppo);
  R = { renderer, scene, cam, composer, bloom, mat, gruppo, lucePunto, alone, muroMat, ombra, W: 1.1, H: 0.29, yaw: 0, pitch: 0.1, zoom: 1, yawT: 0, pitchT: 0.1, zoomT: 1, mosso: false, cache: new Map(), amb: { ...NOTTE } };
  ridimensiona(); new ResizeObserver(ridimensiona).observe(scena);
  gesti();
  caricaMisura(s.misura, true);
  requestAnimationFrame(ciclo);
}

function errore(testo) { stato3d.textContent = testo; scena.classList.remove("pronta", "carica"); scena.classList.add("errore"); }

function ridimensiona() {
  if (!R) return;
  const w = Math.max(200, scena.clientWidth), h = Math.max(160, scena.clientHeight);
  R.renderer.setSize(w, h, false); R.composer.setPixelRatio(Math.min(Math.max(devicePixelRatio || 1, 1) * 1.5, 2)); R.composer.setSize(w, h);   // sovracampionato 1,5x: bordi lisci senza MSAA
  R.cam.aspect = w / h; adatta(); R.cam.updateProjectionMatrix();
}
function adatta() {   // la camera sta alla distanza in cui l'insegna entra con un po' d'aria, in larghezza e in altezza
  const vf = THREE.MathUtils.degToRad(R.cam.fov), asp = R.cam.aspect;
  const dW = (R.W * 1.24) / (2 * Math.tan(vf / 2) * asp), dH = (R.H * 2.9) / (2 * Math.tan(vf / 2));
  R.dist = Math.max(dW, dH);
}

// normali lisce dove le facce si incontrano con meno di 35°, spigoli vivi dove sono veri (cassa, griglia, bordi)
function leviga(o) {
  o.traverse(m => {
    if (!m.isMesh) return;
    const n = m.material && m.material.name;
    if (n === "led") return;
    m.geometry = toCreasedNormals(m.geometry, THREE.MathUtils.degToRad(35));
    m.castShadow = true;
  });
}

function caricaMisura(m, primo) {
  if (!R) return;
  let p = R.cache.get(m);
  if (!p) {
    p = new Promise((ok, ko) => new GLTFLoader().load("assets/glb/vibes-" + m + ".glb", gl => {
      gl.scene.traverse(o => { if (o.isMesh) { const n = o.material && o.material.name; if (R.mat[n]) { o.userData.nome = n; o.material = R.mat[n]; } } });
      leviga(gl.scene);
      ok(gl.scene);
    }, undefined, ko));
    R.cache.set(m, p);
    p.catch(() => R.cache.delete(m));   // un fallimento non resta in cache: il tocco successivo riprova
  }
  stato3d.textContent = primo ? "Sta scrivendo" : "Sta scrivendo · " + m + " cm";
  if (!primo) scena.classList.add("carica");
  p.then(o => {
    if (m !== s.misura) return;   // nel frattempo ha scelto un'altra misura
    const box = new THREE.Box3().setFromObject(o), ctr = box.getCenter(new THREE.Vector3());
    R.W = box.max.x - box.min.x; R.H = box.max.y - box.min.y;
    o.position.set(-ctr.x, -ctr.y, 0);
    R.gruppo.clear(); R.gruppo.add(o);
    const lw = R.W * 1.5; R.alone.scale.set(lw, lw / 3, 1); R.alone.position.set(0, 0, box.min.z - ctr.z - 0.03);
    adatta(); scena.classList.remove("errore", "carica"); scena.classList.add("pronta");
    $("[data-fig]").textContent = "Fig. 01 · VIBES " + m + " cm · modello 3D";
  }).catch(() => {
    if (m !== s.misura) return;
    errore("Il modello 3D da " + m + " cm non si carica" + (m !== "110" ? ": la foto è la 110 cm." : ": resta il render."));
  });
}
function cambiaMisura(m) { s.misura = m; caricaMisura(m); }

function gesti() {
  const P = new Map();   // puntatori attivi: uno ruota, due fanno il pinch
  let dist0 = 0, zoom0 = 1;
  const tocca = () => { if (!R.mosso) { R.mosso = true; R.yawT = R.yaw; scena.classList.add("toccata"); } };
  const reset = () => { tocca(); R.yawT = 0; R.pitchT = 0.1; R.zoomT = 1; };
  const d2 = () => { const [a, b] = [...P.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
  tela.addEventListener("pointerdown", e => { P.set(e.pointerId, { x: e.clientX, y: e.clientY }); tela.setPointerCapture(e.pointerId); tocca(); if (P.size === 2) { dist0 = d2(); zoom0 = R.zoomT; } });
  tela.addEventListener("pointermove", e => {
    const p = P.get(e.pointerId); if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
    if (P.size === 2) { R.zoomT = THREE.MathUtils.clamp(zoom0 * dist0 / Math.max(40, d2()), 0.5, 1.5); return; }
    R.yawT = THREE.MathUtils.clamp(R.yawT + dx * 0.0065, -1.2, 1.2);
    if (e.pointerType === "mouse") R.pitchT = THREE.MathUtils.clamp(R.pitchT + dy * 0.004, -0.3, 0.45);
  });
  const su = e => { P.delete(e.pointerId); };
  tela.addEventListener("pointerup", su); tela.addEventListener("pointercancel", su);
  tela.addEventListener("dblclick", reset);
  tela.addEventListener("wheel", e => { if (!e.ctrlKey && !e.shiftKey) return; e.preventDefault(); tocca(); R.zoomT = THREE.MathUtils.clamp(R.zoomT * (1 + e.deltaY * 0.001), 0.5, 1.5); }, { passive: false });
  tela.addEventListener("keydown", e => {
    const k = e.key; tocca();
    if (k === "ArrowLeft") R.yawT = Math.max(-1.2, R.yawT - 0.1); else if (k === "ArrowRight") R.yawT = Math.min(1.2, R.yawT + 0.1);
    else if (k === "ArrowUp") R.pitchT = Math.max(-0.3, R.pitchT - 0.05); else if (k === "ArrowDown") R.pitchT = Math.min(0.45, R.pitchT + 0.05);
    else if (k === "+" || k === "=") R.zoomT = Math.max(0.5, R.zoomT - 0.1); else if (k === "-") R.zoomT = Math.min(1.5, R.zoomT + 0.1);
    else if (k === "0") reset(); else return;
    e.preventDefault();
  });
}

let t0 = performance.now(), visibile = true;
new IntersectionObserver(es => { visibile = es[0].isIntersecting; }).observe(scena);
const spia = $("[data-spia]");
function ciclo(now) {
  requestAnimationFrame(ciclo);
  if (!visibile || !R) return;
  const t = (now - t0) / 1000, I = intensita(t);
  const tgt = s.giorno ? GIORNO : NOTTE, A = R.amb;   // notte e giorno si fondono: niente scatto
  for (const k in tgt) A[k] = lerp(A[k], tgt[k], 0.12);
  R.scene.background.lerp(s.giorno ? SF_GIORNO : SF_NOTTE, 0.12);
  R.renderer.toneMappingExposure = A.esposizione; R.scene.environmentIntensity = A.env;
  // pendolo finché non la tocca: mostra la profondità; con «meno movimento» resta in tre quarti
  R.yaw += (R.yawT - R.yaw) * 0.16; R.pitch += (R.pitchT - R.pitch) * 0.16; R.zoom += (R.zoomT - R.zoom) * 0.16;   // inerzia: il gesto non scatta
  const yaw = R.mosso ? R.yaw : (RIDOTTO ? -0.38 : -0.34 * Math.sin(t * 0.55));
  const pitch = R.pitch, d = R.dist * R.zoom;
  R.cam.position.set(Math.sin(yaw) * Math.cos(pitch) * d, Math.sin(pitch) * d, 0.02 + Math.cos(yaw) * Math.cos(pitch) * d);
  R.cam.lookAt(0, 0, 0.02);
  const k = s.acceso ? 0.14 + 0.8 * I : 0.04;
  R.mat.led.color.setRGB(1.0 * k, 0.004 * k, 0.002 * k);
  R.muroMat.color.setScalar(A.muro);
  R.mat.opale.emissiveIntensity = s.acceso ? 0.08 + 0.95 * I : 0;
  R.mat.opale.color.setHex(s.acceso ? 0x200604 : 0x4a3c38);
  R.lucePunto.intensity = s.acceso ? 1.2 * I : 0;
  R.alone.material.opacity = s.acceso ? A.alone * (0.15 + 0.85 * I) : 0;
  R.bloom.strength = A.bloom;
  R.composer.render();
  if (spia) spia.classList.toggle("on", I > 0.5 && s.acceso);
  disegnaQuote();
}

// quote proiettate sull'insegna: larghezza sotto, altezza a destra
const svgQuote = $("[data-quote-svg]");
function disegnaQuote() {
  if (!svgQuote) return;
  if (!s.quote) { if (svgQuote.innerHTML) svgQuote.innerHTML = ""; return; }
  R.cam.updateMatrixWorld();
  const w = scena.clientWidth, h = scena.clientHeight, V = new THREE.Vector3();
  const pr = (x, y) => { V.set(x, y, 0.045).project(R.cam); return [(V.x * 0.5 + 0.5) * w, (0.5 - V.y * 0.5) * h]; };
  const hw = R.W / 2, hh = R.H / 2, dy = hh + 0.04, dx = hw + 0.045;
  const [a1, a2] = [pr(-hw, -dy), pr(hw, -dy)], [b1, b2] = [pr(dx, -hh), pr(dx, hh)];
  const ln = (p, q) => `<line x1="${p[0]}" y1="${p[1]}" x2="${q[0]}" y2="${q[1]}"/>`;
  const tk = (p, vert) => vert ? `<line x1="${p[0] - 5}" y1="${p[1]}" x2="${p[0] + 5}" y2="${p[1]}"/>` : `<line x1="${p[0]}" y1="${p[1] - 5}" x2="${p[0]}" y2="${p[1] + 5}"/>`;
  const tx = (p, q, t) => `<text x="${(p[0] + q[0]) / 2}" y="${(p[1] + q[1]) / 2 + 16}" text-anchor="middle">${t}</text>`;
  svgQuote.innerHTML = ln(a1, a2) + tk(a1) + tk(a2) + ln(b1, b2) + tk(b1, true) + tk(b2, true) + tx(a1, a2, s.misura + " cm") + (b1[0] + 54 > w ? `<text x="${b1[0] - 10}" y="${(b1[1] + b2[1]) / 2}" text-anchor="end">${D.misure[s.misura].h} cm</text>` : `<text x="${b1[0] + 10}" y="${(b1[1] + b2[1]) / 2}" text-anchor="start">${D.misure[s.misura].h} cm</text>`);
}

disegna();
if ("WebGLRenderingContext" in window) avviaScena(); else errore("Il 3D non parte su questo dispositivo: vedi il render.");
window.__vibes = { s, get R() { return R; } };
