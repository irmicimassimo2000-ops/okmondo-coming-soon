/* ═══════════════════════════════════════════════════════════════════
   app/tre/astuccio.js — L'ASTUCCIO CHE SI APRE, IN TRE DIMENSIONI.

   È il modulo che porta in app la cerimonia misurata in
   `E:/OK.AGENZIA/regina-jewels/studio/prova3d/_CF4_cerimonia.html`
   (17/09/2026): cinque astucci PROCEDURALI — zero byte di asset, la
   geometria si scrive — con dentro il PEZZO VERO preso dal .glb della
   sua famiglia, e un coperchio che si alza in 1600 millisecondi.

   COSA SOSTITUISCE, E PERCHÉ. Fino a oggi S1 apriva un cofanetto
   FOTOGRAFATO (quattro .webp per fodera, 1,15 MB) con dentro il
   PROVINO RITAGLIATO del pezzo, appoggiato nel vano. Verdetto di
   Massimo, 17/09: bocciata. Dentro un cofanetto ci va il pezzo, in tre
   dimensioni, e per ogni tipo di pezzo il cofanetto è diverso — un
   anello non si posa come una collana, e un astuccio che non cambia
   mestiere non è un astuccio, è una scatola.

   LE DECISIONI GIÀ PRESE, che questo file ESEGUE e non ridiscute:
     · FODERA DI SERIE AVORIO. Sul velluto scuro, con la luce del vano
       alzata di 1,75x, l'inserto si legge lo stesso peggio: la luce
       recupera, non pareggia. Se la cliente ha scelto una fodera
       CHIARA (bianco, avorio) vale la sua; se ha scelto velluto o
       turchese, la cerimonia va in avorio e la sua fodera resta dov'è
       (il banco, la carta).
     · FORMATI ADATTATI per collane e bracciali. La merce vera non sta
       nei formati di catalogo: la collana stesa è 163 x 139 x 29 (nel
       110 x 159 non entra), il bracciale è una catena ad ANELLO da 67
       (nel 227 x 70 disteso avanzano 15 cm). Si taglia la scatola sul
       pezzo: collane 151 x 175 x 52, bracciali 85 x 85 x 24.
     · E LA COLLANA VUOLE UN CUSCINO A SELLA. Modellata sul busto,
       conserva 29,5 mm di bombatura anche nella posa più stesa: su un
       cuscino piatto si ALZA, e sotto resta aria. La sella si misura
       sul pezzo (vedi `costruisciSella`), non si sceglie.
     · `rend.compile()` DOPO la campagna di materiali, da fermi: il solo
       fotogramma lungo della cerimonia (169 ms sugli anelli, 167 sugli
       orologi) era la compilazione dello shader del metallo a t = 600,
       cioè nell'istante in cui il pezzo entra in scena.

   COME SI MONTA, E DOVE VIVE THREE.JS. `monta(el, opz)` costruisce
   TUTTO dentro `el` e non tocca niente fuori. Il modulo importa `three`
   come specificatore NUDO: funziona in ogni pagina che porti la mappa
   d'importazione del banco — cioè `astuccio.html` (il telaio leggero
   della scocca) e `spazio.html` (il banco, dove three è già in memoria).
   La scocca NON importa three: la sua mappa non ce l'ha, e non deve
   averla. Due mega e nove di libreria nel documento che porta la barra
   di navigazione sono due mega e nove che si pagano per aprire una
   lista.

   API
     monta(el, {fam, k, fodera, codice, provino, profilo, aria,
                scorrimento, aptico}) -> maniglia
     maniglia.suona(da)   avvia la cerimonia (0 -> 1600)
     maniglia.salta()     porta al fotogramma finale, subito
     maniglia.chiudi()    riporta al fotogramma zero
     maniglia.smonta()    libera contesto, texture, geometrie, ascolti
     maniglia.stato       {t, fine, caricato, primo, triangoli, chiamate}
     maniglia.quando(fn)  ascolta "pronto" | "fine" | "tocco"
   ═══════════════════════════════════════════════════════════════════ */

import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";

/* la radice dell'app, risolta dal modulo e non dalla pagina: questo file
   sta in `app/tre/`, e da lì la radice è due cartelle sopra. Chiederla a
   `location` è il 404 che si è già visto: l'app non sta in radice del
   sito, sta in `p/rg-7c41b8/`. */
const RADICE = new URL("../../", import.meta.url);
const dove = (f) => new URL(f, RADICE).href;

/* ══ LE CINQUE FAMIGLIE, IN METRI ═══════════════════════════════════
   Misure di catalogo (Westpack, Astuccishop, Gems on Display). La
   parete è 3 mm su tutte: è il materiale — cartone teso da gioielleria
   — non il formato. E la spartizione base/coperchio non è mai metà e
   metà: il coperchio è il terzo scarso, perché è la BASE a dover
   contenere il pezzo e l'inserto. È quel rapporto, più delle quote, a
   far riconoscere un astuccio da gioielleria da una scatola. */
const FAMIGLIE = {
  anelli: {
    glb: "assets/REGINA_anelli.draco.glb", pezzi: 5,
    LA: 0.050, PR: 0.050, H_BASE: 0.027, H_COP: 0.013, RAG: 0.0025,
    nome: "astuccio da anello 50 x 50 x 40",
  },
  orecchini: {
    glb: "assets/REGINA_orecchini.draco.glb", pezzi: 9,
    LA: 0.065, PR: 0.065, H_BASE: 0.017, H_COP: 0.008, RAG: 0.0030,
    nome: "astuccio da orecchini 65 x 65 x 25",
  },
  /* COLLANE E BRACCIALI ARRIVANO GIÀ TAGLIATI SUL PEZZO. In `_CF4` le
     due colonne — catalogo e taglio — stavano affiancate perché senza
     il confronto il problema non si vedeva. Qui il problema è visto e
     deciso: restano solo le quote che reggono la merce vera. */
  collane: {
    glb: "assets/REGINA_busto.draco.glb", pezzi: 1,
    LA: 0.151, PR: 0.175, H_BASE: 0.038, H_COP: 0.014, RAG: 0.0040,
    nome: "cofanetto da collana 151 x 175 x 52",
  },
  bracciali: {
    glb: "assets/REGINA_rampa.draco.glb", pezzi: 1,
    LA: 0.085, PR: 0.085, H_BASE: 0.016, H_COP: 0.008, RAG: 0.0030,
    nome: "astuccio da bracciale a catena 85 x 85 x 24",
  },
  orologi: {
    glb: "assets/REGINA_orologi.draco.glb", pezzi: 3,
    LA: 0.100, PR: 0.100, H_BASE: 0.045, H_COP: 0.025, RAG: 0.0045,
    nome: "astuccio da orologio 100 x 100 x 70",
  },
};

/* ── I DUE ALFABETI DELLE FAMIGLIE ─────────────────────────────────
   L'app chiama le famiglie col nome del MOBILE su cui la merce sta al
   banco (`busto`, `rampa`): è la chiave di `app/dati/catalogo.js` e di
   `app/dati/ponte.js`, e lì è giusta — è il nome dell'espositore. Un
   astuccio però non si chiama come un espositore: si chiama come quello
   che ci sta dentro. La traduzione sta QUI e in nessun altro posto,
   così nessun altro file deve fare aritmetica sui nomi. */
export const DA_BANCO = {
  busto: "collane", rampa: "bracciali",
  anelli: "anelli", orecchini: "orecchini", orologi: "orologi",
};
export const famigliaAstuccio = (fam) => DA_BANCO[fam] || (FAMIGLIE[fam] ? fam : "anelli");

/* ── LA FODERA DELLA CERIMONIA ─────────────────────────────────────
   Decisione di Massimo: avorio di serie. Si rispetta la scelta della
   cliente SOLO se è chiara — perché è lei che ha scelto, e una scelta
   chiara non spegne niente. */
const VESTI = {velluto: 0x241F19, bianco: 0xF2F0EC, avorio: 0xD8CEBE, turchese: 0x106068};
const CHIARE = new Set(["bianco", "avorio"]);
export const foderaDellaCerimonia = (f) => (CHIARE.has(f) ? f : "avorio");

const PELLE = 0x106068, ORO = 0xEED69A;

/* ── LA REGIA, LOCKATA ─────────────────────────────────────────────
   I tempi non sono decorativi: sono un ORDINE DI LETTURA. Il coperchio
   per primo perché è lui il gesto; la fodera prende luce 140 ms DOPO,
   non insieme — una luce che nasce col movimento sembra un
   interruttore, una che arriva un attimo dopo sembra la luce della
   stanza che entra nel vano; la luce del vano sale fra 300 e 800,
   quando il vano comincia a esistere; il pezzo si posa fra 600 e 1000,
   sull'ultimo terzo del coperchio, così che l'occhio lo trovi DOPO aver
   capito dov'è entrato; la camera arriva a 36 gradi a 1100; a 1600 è
   finita, e da lì in poi si tocca.
   1600 ms sono lunghi per un'interfaccia e corti per una cerimonia: è
   il compromesso, e si salta al tocco perché alla seconda volta una
   cerimonia è un ostacolo. */
export const REGIA = {
  coperchio: 700, gradi: -105,
  fodera: [140, 700], luce: [300, 500], pezzo: [600, 400],
  camera: 1100, fine: 1600, ridotto: 200,   /* regola 4 del sistema: reduced = 150-200 */
  scatto: 700,          /* l'istante in cui il coperchio è a fine corsa */
};

const ELEV_CHIUSO = 28 * Math.PI / 180, ELEV_APERTO = 36 * Math.PI / 180;
const ROT = 20 * Math.PI / 180, FOV = 22;
const ORBITA_MAX = 75 * Math.PI / 180;

/* ══ LA MANO APTICA ═════════════════════════════════════════════════
   iOS non ha `navigator.vibrate` e non lo avrà. L'unico ritorno aptico
   che Safari concede a una pagina è quello di un CONTROLLO DI SISTEMA:
   l'interruttore `<input type="checkbox" switch>` (Safari 17.4+) fa
   scattare il Taptic Engine quando cambia stato. Si tiene fuori campo,
   si clicca una volta sola, e SOLO allo scatto del coperchio (700 ms):
   un pattern, non una raffica.
   DUE LIMITI DICHIARATI, perché si scoprano qui e non sul telefono di
   Massimo: (1) serve l'attivazione dell'utente, e a 700 ms dal tocco
   siamo dentro la finestra transitoria, ma è una finestra che Apple può
   stringere; (2) su ogni altro browser l'elemento è una casella
   normale, non vibra, e non succede niente — che è il degrado giusto. */
function faLaMano(dentro){
  let sw = null, usato = false;
  try{
    sw = document.createElement("input");
    sw.type = "checkbox";
    if(!("switch" in sw)) { sw = null; }
    else {
      sw.switch = true;
      sw.tabIndex = -1;
      sw.setAttribute("aria-hidden", "true");
      sw.style.cssText = "position:absolute;width:1px;height:1px;opacity:0;" +
                         "pointer-events:none;left:-9999px";
      dentro.appendChild(sw);
    }
  }catch(_){ sw = null; }
  return {
    batti(){
      if(!sw || usato) return false;
      usato = true;
      try{ sw.click(); return true; }catch(_){ return false; }
    },
    riarma(){ usato = false; },
    c_e: !!sw,
    via(){ if(sw && sw.parentNode) sw.parentNode.removeChild(sw); }
  };
}

/* ══ IL MONTAGGIO ═══════════════════════════════════════════════════ */
export function monta(el, opz = {}){
  const T0 = performance.now();

  const FAM = famigliaAstuccio(opz.fam);
  const F = FAMIGLIE[FAM];
  const FODERA = foderaDellaCerimonia(opz.fodera);
  const VESTE = VESTI[FODERA];
  const PEZZO_K = Math.max(0, Math.min(F.pezzi - 1, +(opz.k || 0)));
  const MOBILE = (opz.profilo || "mobile") === "mobile";
  const PROVINO = opz.provino || null;   /* il cartoncino, se il modello manca */
  const ARIA = +(opz.aria || 1.55);
  const APTICO = opz.aptico !== false;
  const RIDOTTO = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* il colore da dare al piano perche' ne ESCA `--carta` (#FAF8F5): si
     puo' scavalcare da fuori solo per rimisurarlo (`?carta=`) */
  const CARTA_TARATA = opz.carta !== undefined && opz.carta !== null
    ? +opz.carta : 0xFFFDF8;
  const LA = F.LA, PR = F.PR, H_BASE = F.H_BASE, H_COP = F.H_COP, RAG = F.RAG;
  const MURO = 0.003, H_FONDO = 0.002;
  const V_LA = LA - 2 * MURO, V_PR = PR - 2 * MURO;
  const APERTURA = REGIA.gradi * Math.PI / 180;
  const CERN_Y = H_BASE + 0.0005, CERN_Z = -PR / 2 + 0.0026;
  const VANO = Math.min(0.015, Math.max(0.004, H_COP * 0.60));
  const SEG = MOBILE ? {smusso: 4, angolo: 8, rullo: 24, cupola: 28}
                     : {smusso: 5, angolo: 10, rullo: 30, cupola: 40};

  /* ── LA TELA ─────────────────────────────────────────────────────
     Il contenitore diventa il sistema di riferimento: la tela lo
     riempie e basta. `touch-action` NON è sempre `none`: quando
     l'astuccio vive dentro una pagina che SCORRE (la pagina del
     regalo), prendersi il verticale vuol dire rubare lo scorrimento
     della scocca al primo dito. Lì si tiene `pan-y`, e il verticale
     resta di chi sta sotto; l'orizzontale — che è il gesto che gira
     l'oggetto — resta nostro. Sullo schermo intero di S1 non c'è
     niente sotto, e `none` è onesto. */
  const scorre = !!opz.scorrimento;
  /* IL CONTENITORE DECIDE LA MISURA, E NON GLIELA SI CAMBIA SOTTO. Qui
     c'era `el.style.position = el.style.position || "relative"`, e la
     riga sembrava innocua: l'inline era vuoto, quindi scriveva
     `relative` — e scrivendolo buttava via l'`absolute; inset:0` del
     foglio di stile. Il contenitore perdeva l'ancoraggio, l'altezza gli
     tornava automatica, e la scena si disegnava alta 197 punti su uno
     schermo da 852 con il resto bianco. Si guarda il calcolato, e si
     interviene solo se davvero non è posizionato. */
  if(getComputedStyle(el).position === "static") el.style.position = "relative";
  const tela = document.createElement("canvas");
  tela.className = "astuccio-tela";
  tela.setAttribute("aria-hidden", "true");
  tela.style.cssText = "display:block;width:100%;height:100%;" +
    "touch-action:" + (scorre ? "pan-y" : "none") + ";" +
    "-webkit-user-select:none;user-select:none;opacity:1";
  el.appendChild(tela);
  const mano = APTICO ? faLaMano(el) : {batti(){ return false; }, riarma(){}, c_e:false, via(){}};

  const misura = () => {
    const r = el.getBoundingClientRect();
    return [Math.max(1, Math.round(r.width) || el.clientWidth || 360),
            Math.max(1, Math.round(r.height) || el.clientHeight || 360)];
  };
  let [LARGO, ALTO] = misura();

  /* ══ IL DISEGNATORE ═══════════════════════════════════════════════
     Il profilo mobile non è «la stessa cosa più brutta»: è la stessa
     scena con tre cose spente che su un telefono costano più di quanto
     rendano. DPR a 1,5 (su un 3x la differenza si vede col metro, non
     con l'occhio: sono quattro volte i pixel), ombra dinamica spenta —
     resta l'alone di contatto, che è quello che fa poggiare l'oggetto —
     e GTAO solo a riposo, mai durante la cerimonia, dove nessuno guarda
     l'occlusione di uno spigolo mentre un coperchio si alza. */
  /* ── LA CARTA DELLA SCENA, O IL FONDO DELLA PAGINA ───────────────
     IL PIANO NON SI PUÒ FAR COMBACIARE COL FONDO DELL'APP, e si è
     provato col metro. Il piano è dichiarato #FAF8F5 — esattamente
     `--carta` — e sullo schermo esce #E3DED4: passa per l'illuminazione
     e per l'ACES a esposizione 0,62, il fondo della pagina no. Cercando
     per bisezione il colore da dargli perché ne uscisse #FAF8F5
     (`_C5_carta`, 17/09) si arriva al BIANCO PIENO e si esce ancora a
     227-222-212: non è il colore a mancare, è la luce. Alzarla
     vorrebbe dire cambiare la fotografia per far combaciare uno sfondo.
     Quindi: dove la scena riempie il suo mondo (il provino, lo studio)
     la carta c'è ed è il fondale di una gioielleria. Dove invece la
     scena sta DENTRO una pagina — la consegna, il regalo, il primo
     piano al banco — il piano si toglie e il fondo lo fa la PAGINA, con
     il suo #FAF8F5 vero. Resta l'alone di contatto, che è quello che fa
     poggiare l'oggetto, e nessuno vede più il rettangolo della scena:
     era esattamente il tell della fotografia incorniciata. */
  const PIANO = opz.piano !== false;
  const rend = new THREE.WebGLRenderer({
    canvas: tela, antialias: !PIANO ? true : false, alpha: !PIANO,
    stencil: false, depth: true, premultipliedAlpha: true,
    powerPreference: "high-performance"});
  if(!PIANO) rend.setClearAlpha(0);
  rend.setPixelRatio(Math.min(devicePixelRatio || 1, MOBILE ? 1.5 : 3));
  rend.setSize(LARGO, ALTO, false);
  rend.outputColorSpace = THREE.SRGBColorSpace;
  rend.toneMapping = THREE.ACESFilmicToneMapping;
  rend.toneMappingExposure = 0.62;
  rend.shadowMap.enabled = !MOBILE;
  rend.shadowMap.type = THREE.PCFShadowMap;
  rend.info.autoReset = false;

  /* quanto la carta fuga nel buio: 1 è lo studio (vedi il piano, sotto) */
  const FUGA = opz.fuga === undefined ? 1 : Math.max(0, Math.min(1, +opz.fuga));
  const scena = new THREE.Scene();
  /* senza piano non c'è nemmeno fondo: quello che si vede dietro è la
     pagina, e la tela ci si appoggia sopra */
  /* il fondo NON si vede mai — la camera guarda in giù di 28-36 gradi
     con 22 di campo, e l'orizzonte del piano resta fuori quadro — ma se
     un giorno un'inquadratura lo scopre è meglio che sia dello stesso
     colore della fuga che non di un nero che nessuno ha chiesto */
  scena.background = PIANO
    ? new THREE.Color(0xFAF8F5).lerp(new THREE.Color(0x0E0D0C), FUGA) : null;

  /* ── LA VETRINA ────────────────────────────────────────────────
     È lo stesso studio del banco: quattro fari dentro una scatola
     scura, cotti in una mappa d'ambiente. Niente `RoomEnvironment` —
     è lo studio di serie della libreria, lo stesso in ogni pagina al
     mondo che usa three, ed è il motivo per cui una cosa resa sembra
     resa. Qui la luce se la costruisce Regina. */
  const pm = new THREE.PMREMGenerator(rend);
  function laVetrina(){
    const v = new THREE.Scene();
    const cubo = new THREE.BoxGeometry();
    cubo.deleteAttribute("uv");
    const scatola = new THREE.Mesh(cubo, new THREE.MeshStandardMaterial(
      {side: THREE.BackSide, roughness: 1, metalness: 0}));
    scatola.material.color.setHex(0x0E0D0C);
    scatola.scale.set(9, 6, 9);
    v.add(scatola);
    const faro = (colore, forza, px, py, pz, sx, sy, sz) => {
      const m = new THREE.MeshStandardMaterial({roughness: 1, metalness: 0});
      m.color.setHex(0x000000);
      m.emissive.setHex(colore); m.emissiveIntensity = forza;
      const o = new THREE.Mesh(cubo, m);
      o.position.set(px, py, pz); o.scale.set(sx, sy, sz);
      v.add(o);
    };
    faro(0xFFE2B8, 19.0, -2.5, 2.9, 1.2,  2.2, 0.10, 2.4);
    faro(0xC9DEE8,  3.9,  3.3, 1.3, 0.5,  0.10, 1.8, 2.6);
    /* IL RIMBALZO DA SOTTO È 0,38, NON 1,0. Su un cofanetto da 18 cm
       posato su carta il rimbalzo c'è davvero; su un astuccio da 5 la
       stessa forza illumina una fascia larga due millimetri e mezzo,
       cioè un filo — e un filo illuminato è un filo di plastica. */
    faro(0xF6EFE4, 0.38,  0.0,-1.4, 0.7,  4.5, 0.10, 3.5);
    faro(0xFFFFFF,  1.8,  0.0, 0.10, 2.9, 2.6, 0.05, 0.10);
    return v;
  }
  const ambiente = pm.fromScene(laVetrina(), 0.02).texture;
  scena.environment = ambiente;
  scena.environmentIntensity = 0.92;

  const sole = new THREE.DirectionalLight(0xFFF1DC, 2.05);
  sole.position.set(-0.26, 0.86, 0.20);
  sole.castShadow = !MOBILE;
  sole.shadow.mapSize.set(MOBILE ? 1024 : 2048, MOBILE ? 1024 : 2048);
  {
    const mezzo = Math.max(LA, PR) * 0.9;
    sole.shadow.camera.left = -mezzo; sole.shadow.camera.right = mezzo;
    sole.shadow.camera.top = mezzo;   sole.shadow.camera.bottom = -mezzo;
    sole.shadow.camera.near = 0.05;   sole.shadow.camera.far = 1.6;
  }
  sole.shadow.bias = -0.00016;
  sole.shadow.normalBias = 0.0006;
  sole.shadow.radius = 3;
  scena.add(sole); scena.add(sole.target);
  const contro = new THREE.DirectionalLight(0xBFD8E4, 0.42);
  contro.position.set(0.95, 0.55, -0.35);
  scena.add(contro);
  scena.add(new THREE.AmbientLight(0xffffff, 0.05));

  /* ── LE DUE LUCI DELLA CERIMONIA ─────────────────────────────────
     Non sono scenografia: sono la ragione per cui un vano aperto si
     legge invece di essere un buco nero. La prima sta DENTRO la base e
     guarda in su, dove l'ambiente non arriva mai; la seconda sta sopra
     il bordo e guarda nel COPERCHIO — è l'unica cosa che fa capire che
     il coperchio è foderato e non verniciato. Partono a zero. */
  const luceVano = new THREE.PointLight(0xFFE9C9, 0.0, Math.max(LA, PR) * 2.4, 1.5);
  luceVano.position.set(0, H_BASE * 0.85, PR * 0.16);
  scena.add(luceVano);
  const luceFodera = new THREE.PointLight(0xFFF3E2, 0.0, Math.max(LA, PR) * 0.62, 1.5);
  luceFodera.position.set(0, H_BASE + Math.max(LA, PR) * 0.22, -PR * 0.26);
  scena.add(luceFodera);
  /* LA FORZA DI UNA LUCE PUNTIFORME NON SI SCEGLIE, SI CALCOLA: in
     three dalla r155 l'intensità è in candele e l'illuminamento scende
     come 1/d^decay. Si fissa l'ILLUMINAMENTO voluto — circa il 60% del
     faretto principale, perché una luce di vano non è mai il soggetto —
     e si ricava la forza dalla distanza vera. */
  const D_VANO = H_BASE * 0.9, D_FODERA = Math.max(LA, PR) * 0.30;
  const CHIARO = (() => { const c = new THREE.Color(VESTE);
    return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b; })();
  const RECUPERO = Math.max(1, Math.min(2.5, 0.30 / (CHIARO + 0.05)));
  const FORZA_VANO   = 1.25 * RECUPERO * Math.pow(D_VANO, 1.5);
  const FORZA_FODERA = 1.05 * Math.pow(D_FODERA, 1.5);

  /* ══ LA MATERIA ═══════════════════════════════════════════════════ */
  const CELLA = 0.018;                       /* la grana della pelle */
  /* il pelo del velluto si tiene costante SULLO SCHERMO, non nel mondo:
     tutte e cinque le famiglie vengono inquadrate per riempire lo stesso
     schermo, e a cella fissa sul bracciale il velluto tornerebbe raso */
  const CELLA_PELO = 0.065 * (Math.max(LA, PR) / 0.050);

  const daButtare = [];                 /* tutto ciò che va liberato */
  const tieni = (x) => { daButtare.push(x); return x; };

  const carica = new THREE.TextureLoader();
  function ripetuta(nome){
    const t = tieni(carica.load(dove(nome)));
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 8;
    return t;
  }
  const grana = ripetuta("assets/grana.jpg"), ruvido = ripetuta("assets/ruvidezza.webp");

  /* ── LE UV, IN MISURA DI MONDO ───────────────────────────────────
     `ExtrudeGeometry` dà le UV già in METRI su facce e pareti: non si
     riproiettano, si DIVIDONO per la cella — così la texture si ripete
     ogni 18 mm ovunque, smusso compreso. La proiezione a scatola resta
     dove serve davvero: sui solidi a facce ortogonali (l'aletta, la
     linguetta), dove non c'è nessun piano inclinato da schiacciare.
     La rinormalizzazione 0..1 è ciò che pettinava lo smusso, ed è la
     ragione per cui il provino usciva con le coste sui bordi. */
  function uvScatola(g, cella){
    const gg = g.index ? g.toNonIndexed() : g;
    if(!gg.getAttribute("normal")) gg.computeVertexNormals();
    const p = gg.getAttribute("position"), n = gg.getAttribute("normal");
    const uv = new Float32Array(p.count * 2);
    for(let i = 0; i + 2 < p.count; i += 3){
      let nx = 0, ny = 0, nz = 0;
      for(let k = 0; k < 3; k++){ nx += n.getX(i+k); ny += n.getY(i+k); nz += n.getZ(i+k); }
      const ax = Math.abs(nx), ay = Math.abs(ny), az = Math.abs(nz);
      for(let k = 0; k < 3; k++){
        const x = p.getX(i+k), y = p.getY(i+k), z = p.getZ(i+k);
        let u, v;
        if(ay >= ax && ay >= az){ u = x; v = z; }
        else if(ax >= az){ u = z; v = y; }
        else { u = x; v = y; }
        uv[(i+k)*2] = u / cella; uv[(i+k)*2+1] = v / cella;
      }
    }
    gg.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    gg.setAttribute("uv1", new THREE.BufferAttribute(uv.slice(), 2));
    return tieni(gg);
  }
  function uvEstruso(g, cella){
    const uv = g.getAttribute("uv");
    for(let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / cella, uv.getY(i) / cella);
    uv.needsUpdate = true;
    g.setAttribute("uv1", new THREE.BufferAttribute(uv.array.slice(), 2));
    return tieni(g);
  }
  function celle(t, w, d, cella){
    const c = tieni(t.clone());
    c.repeat.set(w / cella, d / cella); c.needsUpdate = true;
    return c;
  }

  function similpelle(colore, piano){
    const c = new THREE.Color(colore === undefined ? PELLE : colore);
    const m = tieni(new THREE.MeshPhysicalMaterial({
      color: c, metalness: 0, roughness: 0.80,
      /* il velo è 0,12 e non 0,18: su un astuccio da 5 cm ogni spigolo
         tondo prendeva una cresta chiara, e una cresta chiara su ogni
         filo è plastica lucidata, non similpelle */
      sheen: 0.12, sheenRoughness: 0.90,
      sheenColor: c.clone().lerp(new THREE.Color(0xffffff), 0.17),
      normalMap: piano ? celle(grana, piano[0], piano[1], CELLA) : grana,
      roughnessMap: piano ? celle(ruvido, piano[0], piano[1], CELLA) : ruvido,
      clearcoat: 0.03, clearcoatRoughness: 0.90,
    }));
    m.normalScale.set(0.80, 0.80);
    return m;
  }

  let _nap = null;
  function pelo(){
    if(_nap) return _nap;
    const N = MOBILE ? 512 : 1024;
    const c = document.createElement("canvas"); c.width = c.height = N;
    const g = c.getContext("2d");
    const d = g.createImageData(N, N);
    /* AX 7 e non 3: con 341 file di fibra per piastrella la fibra cade a
       un pixel e si media via — resta un beige piatto, cioè cartoncino.
       Un velluto va VISTO, non solo calcolato. */
    const AX = 7, W = N, H = Math.round(N / AX);
    const semi = new Float32Array(W * H);
    let seme = 20260915;
    const caso = () => (seme = (seme * 1664525 + 1013904223) >>> 0) / 4294967296;
    for(let i = 0; i < semi.length; i++) semi[i] = caso();
    const leggi = (x, y) => semi[((y % H) + H) % H * W + (((x % W) + W) % W)];
    for(let y = 0; y < N; y++){
      const fy = y / AX, y0 = Math.floor(fy), ty = fy - y0;
      for(let x = 0; x < N; x++){
        const a = leggi(x, y0), b = leggi(x, y0 + 1);
        const v = a + (b - a) * ty, i = (y * N + x) * 4;
        d.data[i]     = 128 + (v - 0.5) * 150;
        d.data[i + 1] = 128 + (leggi(x + 311, y0 + 57) - 0.5) * 90;
        d.data[i + 2] = 245; d.data[i + 3] = 255;
      }
    }
    g.putImageData(d, 0, 0);
    const t = tieni(new THREE.CanvasTexture(c));
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.NoColorSpace; t.anisotropy = 8;
    const cr = document.createElement("canvas"); cr.width = cr.height = N;
    const gr = cr.getContext("2d");
    const dr = gr.createImageData(N, N);
    for(let y = 0; y < N; y++){
      const fy = y / AX, y0 = Math.floor(fy), ty = fy - y0;
      for(let x = 0; x < N; x++){
        const a = leggi(x + 907, y0 + 13), b = leggi(x + 907, y0 + 14);
        const v = 205 + (a + (b - a) * ty) * 45, i = (y * N + x) * 4;
        dr.data[i] = dr.data[i + 1] = dr.data[i + 2] = v; dr.data[i + 3] = 255;
      }
    }
    gr.putImageData(dr, 0, 0);
    const tr = tieni(new THREE.CanvasTexture(cr));
    tr.wrapS = tr.wrapT = THREE.RepeatWrapping;
    tr.colorSpace = THREE.NoColorSpace; tr.anisotropy = 8;
    _nap = [t, tr];
    return _nap;
  }
  function vellutoConCella(cw, cd, colore, scuro){
    const c = new THREE.Color(colore === undefined ? VESTE : colore);
    const [np, rp] = pelo();
    const n = tieni(np.clone()); n.repeat.set(cw, cd); n.needsUpdate = true;
    const r = tieni(rp.clone()); r.repeat.set(cw, cd); r.needsUpdate = true;
    const m = tieni(new THREE.MeshPhysicalMaterial({
      color: c.clone().multiplyScalar(scuro === undefined ? 0.74 : scuro),
      metalness: 0, roughness: 1.0, roughnessMap: r,
      sheen: 0.92, sheenRoughness: 0.30,
      sheenColor: c.clone().lerp(new THREE.Color(0xffffff), 0.34),
      normalMap: n,
    }));
    m.normalScale.set(0.85, 0.85);
    return m;
  }
  const velluto = (w, d, colore, scuro) =>
    vellutoConCella(w / CELLA_PELO, d / CELLA_PELO, colore, scuro);
  const vellutoMondo = (colore, scuro) =>
    vellutoConCella(CELLA / CELLA_PELO, CELLA / CELLA_PELO, colore, scuro);

  const oro = tieni(new THREE.MeshPhysicalMaterial(
    {color: 0xC6A44E, metalness: 0.92, roughness: 0.26}));

  /* ── LA CUCITURA COME SOLCO ──────────────────────────────────────
     Un punto di cucitura non è un trattino: è un filo che affonda in un
     solco, e quello che si vede è l'OMBRA del solco più il lucido corto
     del filo. Lo stesso canvas fa da bumpMap (rilievo) e da aoMap (buio
     nella valle): in three r185 aoMap legge `uv1` di suo, e qui uv1 è
     uguale a uv. Due mappe, un solo disegno, nessun poligono in più —
     contro i 244 corpi a istanze del primo provino, che a 5 cm
     uscivano come una riga tratteggiata REGOLARE, cioè il tell.
     Il passo resta fisso IN MILLIMETRI su tutte e cinque le famiglie:
     è la macchina da cucire a non cambiare, non la scatola. */
  function solcoCucitura(wm, dm, dentro, passo){
    const PX = MOBILE ? 512 : 1024;
    const c = document.createElement("canvas"); c.width = c.height = PX;
    const g = c.getContext("2d");
    g.fillStyle = "#ffffff"; g.fillRect(0, 0, PX, PX);
    const sx = PX / wm, sy = PX / dm;
    const x0 = dentro * sx, y0 = dentro * sy;
    const x1 = PX - x0, y1 = PX - y0;
    const r = Math.max(6, (Math.min(wm, dm) * 0.06) * sx);
    g.lineJoin = g.lineCap = "round";
    const valle = (larg, col) => {
      g.strokeStyle = col; g.lineWidth = larg;
      g.beginPath();
      g.moveTo(x0 + r, y0);
      g.lineTo(x1 - r, y0); g.quadraticCurveTo(x1, y0, x1, y0 + r);
      g.lineTo(x1, y1 - r); g.quadraticCurveTo(x1, y1, x1 - r, y1);
      g.lineTo(x0 + r, y1); g.quadraticCurveTo(x0, y1, x0, y1 - r);
      g.lineTo(x0, y0 + r); g.quadraticCurveTo(x0, y0, x0 + r, y0);
      g.closePath(); g.stroke();
    };
    valle(0.0016 * sx, "#dedede");
    valle(0.00075 * sx, "#9d9d9d");
    let seme = 20260917;
    const caso = () => (seme = (seme * 1664525 + 1013904223) >>> 0) / 4294967296;
    const lati = [
      [x0 + r, y0, x1 - r, y0], [x1, y0 + r, x1, y1 - r],
      [x1 - r, y1, x0 + r, y1], [x0, y1 - r, x0, y0 + r]];
    for(const [ax, ay, bx, by] of lati){
      const L = Math.hypot(bx - ax, by - ay);
      if(L < 1) continue;
      const ux = (bx - ax) / L, uy = (by - ay) / L;
      const nx = -uy, ny = ux;
      const n = Math.max(2, Math.round(L / (passo * sx)));
      for(let i = 0; i < n; i++){
        const t = (i + 0.5 + (caso() - 0.5) * 0.24) / n;
        const cx = ax + (bx - ax) * t, cy = ay + (by - ay) * t;
        const incl = 0.60 + (caso() - 0.5) * 0.22;      /* ~34 gradi, sporcati */
        const mez = (0.00082 + caso() * 0.00022) * sx;  /* punto 1,6-2,1 mm */
        const dx = (ux * Math.cos(incl) + nx * Math.sin(incl)) * mez;
        const dy = (uy * Math.cos(incl) + ny * Math.sin(incl)) * mez;
        g.strokeStyle = "#cfcfcf"; g.lineWidth = 0.00032 * sx;
        g.beginPath(); g.moveTo(cx - dx, cy - dy); g.lineTo(cx + dx, cy + dy); g.stroke();
        g.strokeStyle = "#8b8b8b"; g.lineWidth = 0.00032 * sx;
        g.beginPath();
        g.moveTo(cx + dx * 0.70, cy + dy * 0.70); g.lineTo(cx + dx, cy + dy); g.stroke();
        g.beginPath();
        g.moveTo(cx - dx, cy - dy); g.lineTo(cx - dx * 0.70, cy - dy * 0.70); g.stroke();
      }
    }
    const t = tieni(new THREE.CanvasTexture(c));
    t.colorSpace = THREE.NoColorSpace;
    t.anisotropy = 8; t.needsUpdate = true;
    return t;
  }

  /* ══ LE FORME ═════════════════════════════════════════════════════ */
  function rettangoloTondo(w, d, r){
    const s = new THREE.Shape();
    const x = w / 2, z = d / 2;
    s.moveTo(-x + r, -z);
    s.lineTo(x - r, -z);  s.quadraticCurveTo(x, -z, x, -z + r);
    s.lineTo(x, z - r);   s.quadraticCurveTo(x, z, x - r, z);
    s.lineTo(-x + r, z);  s.quadraticCurveTo(-x, z, -x, z - r);
    s.lineTo(-x, -z + r); s.quadraticCurveTo(-x, -z, -x + r, -z);
    return s;
  }
  function scatolaTonda(w, h, d, r, buco){
    const s = rettangoloTondo(w, d, r);
    if(buco) s.holes.push(new THREE.Path(rettangoloTondo(buco.w, buco.d, buco.r).getPoints(24)));
    const g = new THREE.ExtrudeGeometry(s, {
      depth: h - 2 * r, bevelEnabled: true, bevelThickness: r, bevelSize: r,
      bevelOffset: 0, bevelSegments: SEG.smusso, curveSegments: SEG.angolo});
    g.rotateX(-Math.PI / 2);
    g.translate(0, r, 0);
    g.computeVertexNormals();
    return g;
  }
  /* IL PANNELLO DI PELLE TIRATO SU UN CARTONE, COL BORDO CHE SI
     ARROTOLA. La pelle vera non finisce con uno spigolo vivo: si
     arrotola sul cartone e scende. Uno spigolo vivo sotto il faretto
     esce come cresta chiara lungo tutto il filo del coperchio — il
     terzo tell del provino, e quello che si scambiava per «coste». */
  function cupola(w, d, alza, bordo){
    const g = new THREE.PlaneGeometry(w, d, SEG.cupola, SEG.cupola);
    const pos = g.getAttribute("position");
    const bo = bordo || 0;
    for(let i = 0; i < pos.count; i++){
      const x = pos.getX(i), y = pos.getY(i);
      const u = x / w, v = y / d;
      let z = alza * Math.cos(Math.PI * u) * Math.cos(Math.PI * v);
      if(bo > 0){
        const dentro = Math.min(w / 2 - Math.abs(x), d / 2 - Math.abs(y));
        if(dentro < bo){
          const k = dentro / bo;
          z -= bo * (1 - Math.sqrt(Math.max(0, 1 - (1 - k) * (1 - k))));
        }
      }
      pos.setZ(i, z);
    }
    pos.needsUpdate = true; g.computeVertexNormals();
    const uv = g.getAttribute("uv");
    g.setAttribute("uv1", new THREE.BufferAttribute(uv.array.slice(), 2));
    return tieni(g);
  }

  const astuccio = new THREE.Group();
  scena.add(astuccio);
  const base = new THREE.Group();
  astuccio.add(base);

  /* ══ LA BASE ══════════════════════════════════════════════════════ */
  const sponda = new THREE.Mesh(
    uvEstruso(scatolaTonda(LA, H_BASE, PR, RAG, {w: V_LA, d: V_PR, r: RAG * 0.7}), CELLA),
    similpelle());
  sponda.castShadow = sponda.receiveShadow = true;
  base.add(sponda);

  const pieno = new THREE.Mesh(
    tieni(new THREE.BoxGeometry(V_LA - 0.0004, H_FONDO, V_PR - 0.0004)),
    velluto(V_LA, V_PR, VESTE, 0.50));
  pieno.position.y = H_FONDO / 2;
  pieno.receiveShadow = true;
  base.add(pieno);

  {
    const lun = Math.min(0.012, LA * 0.18);
    const gCann = tieni(new THREE.CylinderGeometry(0.0016, 0.0016, lun, 14));
    gCann.rotateZ(Math.PI / 2);
    for(const x of [-LA * 0.25, LA * 0.25]){
      const c = new THREE.Mesh(gCann, oro);
      c.position.set(x, CERN_Y, CERN_Z - 0.0011);
      c.castShadow = !MOBILE;
      base.add(c);
    }
  }

  /* ══ IL COPERCHIO ═════════════════════════════════════════════════ */
  const perno = new THREE.Group();
  perno.position.set(0, CERN_Y, CERN_Z);
  astuccio.add(perno);
  const RIM = Math.max(0.0028, Math.min(LA, PR) * 0.064);
  const C_LA = LA - 2 * RIM, C_PR = PR - 2 * RIM;
  const telaio = new THREE.Mesh(
    uvEstruso(scatolaTonda(LA, H_COP, PR, RAG, {w: C_LA, d: C_PR, r: RAG * 0.5}), CELLA),
    similpelle());
  telaio.position.set(0, H_BASE - CERN_Y, -CERN_Z);
  telaio.castShadow = telaio.receiveShadow = true;
  perno.add(telaio);

  const BORDO_CIMA = Math.min(RIM * 0.55, 0.0016);
  const P_LA = C_LA + 2 * BORDO_CIMA, P_PR = C_PR + 2 * BORDO_CIMA;
  const matCima = similpelle(PELLE, [P_LA, P_PR]);
  {
    const t = solcoCucitura(P_LA, P_PR,
      Math.min(0.0055, Math.min(P_LA, P_PR) * 0.11), 0.0024);
    matCima.bumpMap = t; matCima.bumpScale = 0.40;
    matCima.aoMap = t;   matCima.aoMapIntensity = 0.62;
  }
  const cima = new THREE.Mesh(cupola(P_LA, P_PR, 0.0005, BORDO_CIMA), matCima);
  cima.rotation.x = -Math.PI / 2;
  cima.position.set(0, H_BASE - CERN_Y + H_COP - 0.0002, -CERN_Z);
  cima.castShadow = cima.receiveShadow = true;
  perno.add(cima);

  const fodera = new THREE.Mesh(
    cupola(C_LA - 0.0010, C_PR - 0.0010, 0.0012, Math.min(0.0012, RIM * 0.4)),
    velluto(C_LA, C_PR));
  fodera.rotation.x = Math.PI / 2;
  fodera.position.set(0, H_BASE - CERN_Y + VANO, -CERN_Z);
  fodera.receiveShadow = true;
  perno.add(fodera);

  /* ── IL MARCHIO IN ORO, COTTO SULLA CIMA ─────────────────────────
     La misura si prende dal LATO CORTO, non dalla larghezza: il 42%
     della larghezza su un cofanetto lungo darebbe un'insegna, non una
     stampa a caldo. */
  const M_LA = Math.min(LA, PR) * 0.42, M_PR = M_LA * 578 / 700;
  const marchio = new THREE.Mesh(
    tieni(new THREE.PlaneGeometry(M_LA, M_PR)),
    tieni(new THREE.MeshPhysicalMaterial({
      color: ORO, metalness: 0.55, roughness: 0.26,
      transparent: true, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    })));
  let imgMarchio = null;
  {
    const img = imgMarchio = new Image();
    img.onload = () => {
      if(morto) return;
      const c = document.createElement("canvas");
      c.width = img.width; c.height = img.height;
      const g2 = c.getContext("2d");
      g2.drawImage(img, 0, 0);
      const d = g2.getImageData(0, 0, c.width, c.height);
      /* IL MARCHIO ENTRA COME ALFA, non come colore. Il .png è scuro su
         trasparente: usato com'è sulla pelle sparirebbe. Quello che
         serve è la sua FORMA, e la forma sta nel canale alfa. */
      for(let i = 0; i < d.data.length; i += 4){
        const a = d.data[i + 3];
        d.data[i] = d.data[i + 1] = d.data[i + 2] = a; d.data[i + 3] = 255;
      }
      g2.putImageData(d, 0, 0);
      const t = tieni(new THREE.CanvasTexture(c));
      t.colorSpace = THREE.NoColorSpace; t.anisotropy = 8;
      t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true;
      marchio.material.alphaMap = t; marchio.material.needsUpdate = true;
      sveglia();
    };
    img.src = dove("marchio.png");
  }
  marchio.rotation.x = -Math.PI / 2;
  marchio.position.set(0, H_BASE - CERN_Y + H_COP + 0.00022, -CERN_Z);
  perno.add(marchio);

  if(!MOBILE && PIANO){
    const op = new THREE.Mesh(tieni(new THREE.PlaneGeometry(0.60, 0.60)),
                              tieni(new THREE.ShadowMaterial({opacity: 0.30})));
    op.rotation.x = -Math.PI / 2;
    op.position.y = 0.00006;
    op.material.depthWrite = false;
    op.receiveShadow = true;
    astuccio.add(op);
  }
  function aloneContatto(){
    const c = document.createElement("canvas"); c.width = c.height = 256;
    const g = c.getContext("2d");
    const r = g.createRadialGradient(128, 128, 22, 128, 128, 126);
    r.addColorStop(0.00, "rgba(18,15,12,0.52)");
    r.addColorStop(0.28, "rgba(18,15,12,0.34)");
    r.addColorStop(0.62, "rgba(18,15,12,0.11)");
    r.addColorStop(1.00, "rgba(18,15,12,0)");
    g.fillStyle = r; g.fillRect(0, 0, 256, 256);
    const t = tieni(new THREE.CanvasTexture(c));
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  const alone = new THREE.Mesh(
    tieni(new THREE.PlaneGeometry(LA * 1.40, PR * 1.40)),
    tieni(new THREE.MeshBasicMaterial({map: aloneContatto(), transparent: true,
                                       depthWrite: false, toneMapped: false})));
  alone.rotation.x = -Math.PI / 2;
  alone.position.set(LA * 0.03, 0.00014, PR * 0.03);
  alone.renderOrder = -1;
  astuccio.add(alone);

  if(PIANO){
    /* IL PIANO È OTTO METRI E LA SFUMATURA SI SCALA COL FORMATO. Sul
       cofanetto da 175 mm la camera si allontana, e un piano da due
       metri finiva DENTRO l'inquadratura: in alto a destra si apriva un
       cuneo nero — il fondo della scena oltre il filo della carta. Non
       bastava accordare i due colori, perché il piano passa per il tone
       mapping e il fondo no: due grigi scritti uguali escono diversi. */
    /* ── QUANTO SCURA VA LA FUGA, E PERCHÉ È UN PARAMETRO ───────────
       Nello studio la carta fuggiva nel nero: è il fondale di una
       gioielleria, ed è quello che fa leggere l'oggetto come una
       FOTOGRAFIA invece che come un rendering. Ma in app quella stessa
       carta è il fondo della schermata (`--carta` è #FAF8F5, lo stesso
       colore del piano), e sopra il fondale ci vanno delle RIGHE DI
       TESTO scure: una fuga al nero le spegne.
       Quindi la fuga si dichiara, per ospite. `fuga: 1` è lo studio —
       il banco, la pagina del regalo, il provino. Sotto, la carta
       rientra e resta un'ombra di fondale, che è come si illumina un
       ciclorama con una luce sola. Il numero giusto non si sceglie a
       occhio: si misura il contrasto del titolo (vedi `_C5_s1`). */
    /* ── E LA CARTA SI TARA SOTTO IL TONE MAPPING ───────────────────
       Il piano e' dichiarato #FAF8F5, che e' esattamente `--carta`, il
       fondo dell'app. Sullo schermo esce #E2DBD0: ventiquattro livelli
       piu' scuro, perche' il piano passa per l'illuminazione e per
       l'ACES a esposizione 0,62 e il fondo della pagina no. Due grigi
       scritti uguali escono diversi — ed e' la stessa trappola del
       cuneo nero del cofanetto da collana, vista dall'altro lato.
       Finche' la scena riempiva lo schermo non si vedeva (non c'era
       niente accanto con cui confrontarla); nella pagina del regalo la
       scena sta dentro un quadrato di 240 punti in mezzo alla pagina, e
       il quadrato si vedeva tutto — cioe' esattamente il tell della
       fotografia incorniciata che si voleva togliere.
       Il colore giusto non si indovina: si misura. `CARTA_TARATA` e' il
       valore trovato per iterazione con `_C5_carta` (17/09), quello che
       ESCE #FAF8F5 dopo la catena. Se un giorno cambiano l'esposizione o
       la vetrina, si rimisura — e la sonda lo dice. */
    const CARTA = [0.980, 0.972, 0.961];
    const STUDIO = [0.055, 0.051, 0.047];
    const fine3 = CARTA.map((c, i) => (c + (STUDIO[i] - c) * FUGA).toFixed(4));
    const K = Math.max(LA, PR) / 0.050;
    const g = tieni(new THREE.PlaneGeometry(8.0, 8.0, 1, 1));
    const m = tieni(new THREE.MeshStandardMaterial(
      {color: CARTA_TARATA, roughness: 0.92, metalness: 0}));
    m.onBeforeCompile = (s) => {
      s.vertexShader = s.vertexShader.replace("#include <common>",
        "#include <common>\nvarying float vZ;");
      s.vertexShader = s.vertexShader.replace("#include <begin_vertex>",
        "#include <begin_vertex>\nvZ = position.y;");
      s.fragmentShader = s.fragmentShader.replace("#include <common>",
        "#include <common>\nvarying float vZ;");
      s.fragmentShader = s.fragmentShader.replace("#include <dithering_fragment>",
        "#include <dithering_fragment>\n" +
        "float sp = smoothstep(" + (0.02 * K).toFixed(4) + ", " +
          (0.60 * K).toFixed(4) + ", -vZ);\n" +
        "gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(" +
          fine3[0] + "," + fine3[1] + "," + fine3[2] + "), sp);");
    };
    const piano = new THREE.Mesh(g, m);
    piano.rotation.x = -Math.PI / 2;
    piano.receiveShadow = !MOBILE;
    scena.add(piano);
  }

  /* ══ GLI INTERNI, UNO PER MESTIERE ════════════════════════════════
     Non è lo stesso cuscino ridimensionato cinque volte: sono cinque
     attrezzi diversi. Un astuccio da anello tiene il pezzo IN PIEDI
     (due rulli e una fenditura), uno da orecchini lo tiene INFILATO (un
     cartoncino con due fori), una collana si POSA su una sella e si
     ancora (due fessure), un bracciale si BLOCCA (due linguette), un
     orologio si APPOGGIA (un cuscino cilindrico incassato).
     Se l'interno non cambia mestiere, la famiglia non esiste. */
  const INT = {};

  if(FAM === "anelli" && !PROVINO){
    /* DUE RULLI, non un cuscino tagliato. L'inserto del fornitore è
       44 x 44 x 15: due mezzi cilindri da 7,5 di raggio e 20 di
       larghezza con 4 di luce in mezzo fanno 44, e 7,5 x 2 fa 15. La
       fenditura non si inventa: è quello che avanza.
       E L'INSERTO STA SU UNO SPESSORE. A 36 gradi una parete che sporge
       di h nasconde h/tan(36) di profondità: con 10 mm nasconde tutto
       il rullo davanti, con 5 ne nasconde 7 e il rullo si vede quasi
       tutto. Due rulli visibili sono la differenza fra una sede e una
       piega. */
    const R_RULLO = 0.0075, FENDITURA = 0.0040;
    const SPESSORE = Math.max(H_FONDO, H_BASE - 0.005 - 2 * R_RULLO);
    const CRESTA = SPESSORE + 2 * R_RULLO;
    INT.cresta = CRESTA; INT.fenditura = FENDITURA;
    if(SPESSORE > H_FONDO + 0.0002){
      const ri = new THREE.Mesh(
        tieni(new THREE.BoxGeometry(V_LA - 0.0004, SPESSORE, V_PR - 0.0004)),
        velluto(V_LA, V_PR, VESTE, 0.50));
      ri.position.y = SPESSORE / 2;
      ri.receiveShadow = true;
      base.add(ri);
    }
    for(const segno of [-1, 1]){
      const g = tieni(new THREE.CylinderGeometry(
        R_RULLO, R_RULLO, V_LA + 0.0016, SEG.rullo, 1, false, 0, Math.PI));
      g.rotateZ(Math.PI / 2);
      const m = new THREE.Mesh(g, velluto(V_LA, Math.PI * R_RULLO));
      m.position.set(0, CRESTA - R_RULLO, segno * (FENDITURA / 2 + R_RULLO));
      m.castShadow = !MOBILE; m.receiveShadow = true;
      base.add(m);
    }
    /* il fondo della fenditura è buio, e il buio va messo: fra due rulli
       l'occlusione non arriva, e senza fondo scuro la fessura legge come
       una GIUNTA fra due pezzi invece che come una sede */
    const ff = new THREE.Mesh(
      tieni(new THREE.BoxGeometry(V_LA - 0.0010, 0.0002, FENDITURA + 0.0020)),
      tieni(new THREE.MeshBasicMaterial({color: 0x0A0806, toneMapped: false})));
    ff.position.y = CRESTA - R_RULLO * 0.80;
    base.add(ff);
  }

  if(FAM === "orecchini" && !PROVINO){
    /* IL CARTONCINO. Un astuccio da orecchini non ha un cuscino: ha una
       carta tesa sopra il VUOTO, con due fori da 1,65 a 19 di
       interasse. Sono i due fori a impaginare la coppia, non chi la
       posa. */
    INT.foroR = 0.000825; INT.interasse = 0.019;
    INT.cartaY = H_FONDO + 0.0055; INT.cartaH = 0.0022;
    INT.cartaSu = INT.cartaY + INT.cartaH;
    pieno.material.color.multiplyScalar(0.42);   /* sotto la carta è buio */
  }
  /* LA CARTA SI COSTRUISCE DOPO AVER MISURATO IL PEZZO: i fori non
     vanno «in mezzo», vanno DOVE STA IL PERNO. Al primo giro la carta
     era già fatta quando il pezzo arrivava, i fori erano a z = 0, e i
     due orecchini uscivano appesi al nulla dieci millimetri più in là. */
  function costruisciCarta(fori){
    const s = rettangoloTondo(V_LA - 0.0012, V_PR - 0.0012, 0.0022);
    for(const f of fori){
      const p = new THREE.Path();
      p.absarc(f.x, -f.z, INT.foroR, 0, Math.PI * 2, true);
      s.holes.push(p);
    }
    const g = new THREE.ExtrudeGeometry(s, {depth: INT.cartaH, bevelEnabled: false,
                                            curveSegments: MOBILE ? 10 : 14});
    g.rotateX(-Math.PI / 2);
    const carta = new THREE.Mesh(uvEstruso(g, CELLA), vellutoMondo(VESTE, 0.86));
    /* LA CARTA SI POSA SUL SUO SOTTO, NON SUL SUO SOPRA. `INT.cartaY` è
       la faccia di sotto, `INT.cartaSu` quella di sopra (cartaY più i
       2,2 mm di spessore), e l'estrusione cresce verso l'alto: messa a
       `cartaSu` la carta finiva 2,2 mm più su di dove doveva stare, e
       gli orecchini — posati a `cartaSu` — restavano affondati dentro
       di lei per tutto il suo spessore. Non dava nessun errore: si
       vedeva solo guardando lo scatto. */
    carta.position.y = INT.cartaY;
    carta.castShadow = !MOBILE; carta.receiveShadow = true;
    base.add(carta);
    /* L'ALETTA: la linguetta che si tira per sfilare la carta. Non è un
       ornamento — è l'unica cosa che spiega come si toglie. */
    const al = new THREE.Mesh(
      uvScatola(new THREE.BoxGeometry(0.016, 0.0016, 0.007), CELLA),
      vellutoMondo(VESTE, 0.86));
    al.position.set(0, INT.cartaSu - 0.0002, V_PR / 2 - 0.0042);
    al.rotation.x = -0.34;
    al.castShadow = !MOBILE;
    base.add(al);
  }

  if((FAM === "collane" || FAM === "bracciali") && !PROVINO){
    INT.padH = FAM === "collane" ? 0.0060 : 0.0050;
    INT.padSu = H_FONDO + INT.padH;
    if(FAM === "bracciali") costruisciCuscinoPiatto([]);
  }
  /* LE FESSURE SONO UN TAGLIO NEL CUSCINO, NON UN SEGNO SOPRA. Due
     parallelepipedi scuri appoggiati sul velluto da lontano sono due
     stecchi neri, cioè un disegno. Una fessura è un VUOTO: si apre come
     buco nel profilo del cuscino, e sotto ci si vede il fondo. */
  function costruisciCuscinoPiatto(fessure){
    const sh = rettangoloTondo(V_LA - 0.0008, V_PR - 0.0008, 0.0022);
    for(const f of fessure){
      /* la luce del taglio è 3,4 mm perché lo smusso se ne mangia 1,2
         per lato: un buco più stretto dello smusso non è un buco, è una
         geometria che si autointerseca */
      const L = 0.014, W = 0.0034;
      const co = Math.cos(f.ang), si = Math.sin(f.ang);
      const pt = [[-L/2, W/2], [L/2, W/2], [L/2, -W/2], [-L/2, -W/2]]
        .map(([a2, b2]) => [f.x + a2 * co - b2 * si, f.z + a2 * si + b2 * co]);
      const pa = new THREE.Path();
      pa.moveTo(pt[3][0], pt[3][1]);
      for(const qq of pt) pa.lineTo(qq[0], qq[1]);
      sh.holes.push(pa);
    }
    const g = new THREE.ExtrudeGeometry(sh, {depth: INT.padH, bevelEnabled: true,
      bevelThickness: 0.0012, bevelSize: 0.0012, bevelOffset: 0,
      bevelSegments: SEG.smusso, curveSegments: SEG.angolo});
    g.rotateX(-Math.PI / 2); g.translate(0, 0.0012, 0); g.computeVertexNormals();
    const pad = new THREE.Mesh(uvEstruso(g, CELLA), vellutoMondo());
    pad.position.y = H_FONDO;
    pad.castShadow = !MOBILE; pad.receiveShadow = true;
    base.add(pad);
  }

  /* ── LA SELLA DELLA COLLANA ──────────────────────────────────────
     DECISIONE DI MASSIMO, e una misura che la spiega. La collana di
     Regina è modellata sul busto: anche nella posa più stesa conserva
     29,5 mm di BOMBATURA. Su un cuscino piatto non si posa — si ALZA,
     e sotto l'arco resta aria; il pezzo galleggia e il cofanetto sembra
     più grande della merce.
     La sella non si SCEGLIE, si MISURA sul pezzo già posato: si cerca
     la fascia in cui la collana è più alta, si legge quanto sta sopra
     il cuscino il suo lato di SOTTO in quella fascia, e ci si mette un
     rullo di velluto che arriva a toccarlo. Un rullo tagliato al filo
     del cuscino, non una palla nascosta: sotto la carta non c'è niente
     da nascondere, e un arco di cilindro si legge come una sella.
     `pts` sono i punti del pezzo nel sistema della BASE. */
  function costruisciSella(pts){
    if(!pts || pts.length < 40) return null;
    let zlo = Infinity, zhi = -Infinity, ymax = -Infinity, apice = null;
    for(const p of pts){
      if(p.z < zlo) zlo = p.z; if(p.z > zhi) zhi = p.z;
      if(p.y > ymax){ ymax = p.y; apice = p; }
    }
    if(!apice) return null;
    const salita = ymax - INT.padSu;
    if(!(salita > 0.004)) return null;
    /* ── DOVE SI MISURA, E PERCHÉ NON «IN MEZZO» ────────────────────
       Prima qui si prendeva il minimo su tutta la fascia di z attorno
       all'apice, e veniva fuori una sella da 6,8 mm sotto un pezzo alto
       29,5: in quella fascia ci stanno ANCHE i due rami laterali della
       catena, che sono posati sul cuscino, e un minimo che li include
       misura il pavimento, non l'arco.
       La sella va sotto l'ARCO, cioè sotto la parte che sta SU. Si
       tengono i punti della fascia che sono alzati almeno un terzo
       della salita: quelli sono l'arco. Il loro spiegamento in x dà la
       LUNGHEZZA del rullo (una sella è larga quanto il collo, non
       quanto la scatola) e il loro punto più basso dà la CRESTA. */
    const banda = Math.max(0.008, (zhi - zlo) / 7);
    const soglia = INT.padSu + salita / 3;
    let sotto = Infinity, xlo = Infinity, xhi = -Infinity, quanti = 0;
    for(const p of pts){
      if(Math.abs(p.z - apice.z) > banda) continue;
      if(p.y < soglia) continue;
      quanti++;
      if(p.y < sotto) sotto = p.y;
      if(p.x < xlo) xlo = p.x;
      if(p.x > xhi) xhi = p.x;
    }
    if(quanti < 8 || !isFinite(sotto)) return null;
    /* la cresta della sella arriva a sfiorare il di sotto dell'arco,
       meno il mezzo millimetro in cui un velluto cede */
    const cresta = sotto - 0.0005;
    const alza = cresta - INT.padSu;
    /* meno di due millimetri di aria non sono una sella: sono una
       piega, e si lascia il cuscino piatto */
    if(!(alza > 0.002)) return null;
    const R = Math.max(alza, (alza * alza + Math.pow(banda, 2)) / (2 * alza));
    const cy = cresta - R;
    const taglio = Math.max(-1, Math.min(1, (INT.padSu - cy) / R));
    const mezzo = Math.acos(taglio);
    /* il rullo è lungo quanto l'arco più due centimetri di raccordo, e
       non esce mai dal vano: un cuscino che tocca le pareti non è un
       cuscino, è un secondo fondo */
    const L = Math.min(V_LA - 0.0030,
                       Math.max(0.020, (xhi - xlo) + 0.020));
    const zCresta = apice.z;
    const g = tieni(new THREE.CylinderGeometry(R, R, L, MOBILE ? 22 : 40, 1, false,
                                               Math.PI / 2 - mezzo, 2 * mezzo));
    g.rotateZ(Math.PI / 2);
    const sella = new THREE.Mesh(g, velluto(2 * mezzo * R, L));
    sella.material.side = THREE.DoubleSide;
    sella.position.set((xlo + xhi) / 2, cy, zCresta);
    sella.castShadow = !MOBILE; sella.receiveShadow = true;
    base.add(sella);
    INT.sella = {raggio: R, cresta, z: zCresta, alza, lunghezza: L,
                 salita: salita, punti: quanti};
    return INT.sella;
  }

  if(FAM === "orologi" && !PROVINO){
    /* IL CUSCINO CILINDRICO. 51 mm non è un numero di packaging: è il
       diametro medio del GIRO di un orologio da polso chiuso. Lungo 76
       perché deve reggere il cinturino su tutti e due i lati del
       quadrante. */
    INT.cuscinoR = 0.0255; INT.cuscinoL = 0.076;
  }
  /* IL CUSCINO SI COSTRUISCE DOPO AVER MISURATO L'OROLOGIO, e quanto
     affonda lo decide il COPERCHIO: la cresta più l'altezza del pezzo
     meno i due millimetri in cui affonda nella spugna deve stare sotto
     la fodera con quattro millimetri di franco. Sotto il filo del fondo
     il cilindro si TAGLIA, invece di sprofondare attraverso la scatola. */
  function costruisciCuscino(altoPezzo){
    const R = INT.cuscinoR, L = INT.cuscinoL;
    const crestaMax = H_BASE + VANO - 0.004 - (altoPezzo - 0.002);
    const cresta = Math.max(H_FONDO + 0.006,
                            Math.min(H_FONDO + 2 * R, crestaMax));
    const cy = cresta - R;
    const taglio = Math.max(-1, Math.min(1, (H_FONDO - cy) / R));
    const mezzo = Math.acos(taglio);
    const g = tieni(new THREE.CylinderGeometry(R, R, L, MOBILE ? 26 : 44, 1, false,
                                               Math.PI / 2 - mezzo, 2 * mezzo));
    g.rotateZ(Math.PI / 2);
    const cus = new THREE.Mesh(g, velluto(2 * mezzo * R, L));
    cus.material.side = THREE.DoubleSide;
    cus.position.set(0, cy, 0);
    cus.castShadow = !MOBILE; cus.receiveShadow = true;
    base.add(cus);
    INT.cuscinoY = cy; INT.cuscinoSu = cresta; INT.cuscinoArco = mezzo;
  }

  /* ══ LA MACCHINA ══════════════════════════════════════════════════
     L'ELEVAZIONE NON È UNA SOLA. A 28 gradi — l'inquadratura del banco —
     la scatola CHIUSA è perfetta: coperchio, una sponda, l'ombra, cioè
     un oggetto in mano. Ma aperta, a 28 si guarda il vano quasi di
     taglio, e un vano di taglio è un buco nero. A 36 la camera entra nel
     vano senza diventare una pianta (oltre i 40 l'oggetto smette di
     essere tenuto in mano). La DISTANZA invece non si muove: il quadro
     si costruisce sull'unione di chiuso e aperto. */
  const camera = new THREE.PerspectiveCamera(FOV, LARGO / ALTO, 0.02, 6);
  let elev = ELEV_CHIUSO, avvicina = 1.0;

  function unioneDiTutteLePose(){
    const b = new THREE.Box3();
    b.expandByPoint(new THREE.Vector3(-LA / 2, 0, -PR / 2));
    b.expandByPoint(new THREE.Vector3( LA / 2, H_BASE + H_COP + 0.006, PR / 2));
    const cs = Math.cos(APERTURA), sn = Math.sin(APERTURA);
    for(const dz of [-PR / 2 - CERN_Z, PR / 2 - CERN_Z])
      for(const dy of [H_BASE - CERN_Y, H_BASE - CERN_Y + H_COP])
        b.expandByPoint(new THREE.Vector3(0,
          CERN_Y + dy * cs - dz * sn, CERN_Z + dy * sn + dz * cs));
    return b;
  }
  const SCATOLA = unioneDiTutteLePose();
  const CENTRO = SCATOLA.getCenter(new THREE.Vector3());
  let DIST = 0;
  function calcolaDistanza(){
    const d = SCATOLA.getSize(new THREE.Vector3());
    const raggio = Math.max(d.x, d.y, d.z) * 0.5;
    const vfov = FOV * Math.PI / 180;
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * (LARGO / ALTO));
    /* ARIA 1,55: su uno schermo verticale il vincolo è la LARGHEZZA, e
       un astuccio incollato ai bordi non è un oggetto tenuto in mano. */
    DIST = ARIA * raggio / Math.tan(Math.min(vfov, hfov) / 2);
  }
  calcolaDistanza();
  function inquadra(){
    const dist = DIST * avvicina;
    camera.position.set(
      CENTRO.x + dist * Math.cos(elev) * Math.sin(ROT),
      CENTRO.y + dist * Math.sin(elev),
      CENTRO.z + dist * Math.cos(elev) * Math.cos(ROT));
    camera.lookAt(CENTRO.x, CENTRO.y, CENTRO.z);
    camera.updateProjectionMatrix();
    sole.target.position.set(CENTRO.x, CENTRO.y * 0.5, CENTRO.z);
    sole.target.updateMatrixWorld();
  }
  inquadra();

  /* ══ IL PEZZO VERO ════════════════════════════════════════════════
     QUATTRO LEZIONI GIÀ PAGATE, e qui non si ripagano.
     (1) GLI ASSI SI MISURANO DOPO AVER COTTO LA MATRICE: dentro il .glb
         il pezzo sta montato sul suo espositore, e misurato prima gli
         assi vengono nel riferimento del mobile. Non dà nessun errore:
         il pezzo c'è, è solo coricato.
     (2) LA CIMA SI PRENDE DAL MATERIALE DELLA PIETRA, non dal punto più
         lontano dal centro: su una fedina ovale col cabochon basso
         quello cade dalla parte opposta.
     (3) `Box3.setFromObject` SENZA `precise` misura la scatola DELLA
         scatola: su un oggetto ruotato si gonfia, e sulla collana la
         posa piatta risultava alta 156 mm invece di 29.
     (4) LA POSA SI MISURA A VOLO FERMO: se il pezzo arriva mentre
         l'astuccio è chiuso, l'ALZATA della cerimonia entra in tutte le
         quote. Il metro non deve mai misurare l'animazione. */
  const dati = {
    famiglia: FAM, nomeFamiglia: F.nome, fodera: FODERA, codice: opz.codice || null,
    primo: null, primoDaNavigazione: null, triangoli: 0, chiamate: 0,
    pezzo: null, caricato: false, errore: null, provino: false,
    t: 0, fine: false, sella: null,
  };

  function campiona(oggetto, quanti){
    const pts = [];
    oggetto.updateWorldMatrix(true, true);
    const inv = new THREE.Matrix4().copy(oggetto.matrixWorld).invert();
    const mesh = [];
    oggetto.traverse(o => { if(o.isMesh) mesh.push(o); });
    let tot = 0;
    for(const o of mesh) tot += o.geometry.getAttribute("position").count;
    const salto = Math.max(1, Math.floor(tot / (quanti || 1400)));
    const v = new THREE.Vector3();
    for(const o of mesh){
      const p = o.geometry.getAttribute("position");
      const m = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld);
      for(let i = 0; i < p.count; i += salto){
        v.fromBufferAttribute(p, i).applyMatrix4(m);
        pts.push(v.clone());
      }
    }
    return pts;
  }
  /* LA TERNA PRINCIPALE. Niente libreria di algebra: la covarianza è
     3x3 e la direzione di varianza minima si trova con una griglia di
     24 x 13 direzioni. La massima si cerca poi con una spazzata di 90
     angoli nel piano perpendicolare alla prima, così le due sono
     ortogonali per costruzione e la terza è il loro prodotto. */
  function terna(pts){
    const c = new THREE.Vector3();
    for(const p of pts) c.add(p);
    c.multiplyScalar(1 / pts.length);
    let xx=0,xy=0,xz=0,yy=0,yz=0,zz=0;
    for(const p of pts){
      const x = p.x-c.x, y = p.y-c.y, z = p.z-c.z;
      xx+=x*x; xy+=x*y; xz+=x*z; yy+=y*y; yz+=y*z; zz+=z*z;
    }
    const n = pts.length;
    const M = [[xx/n,xy/n,xz/n],[xy/n,yy/n,yz/n],[xz/n,yz/n,zz/n]];
    const va = d => d.x*(M[0][0]*d.x+M[0][1]*d.y+M[0][2]*d.z)
                  + d.y*(M[1][0]*d.x+M[1][1]*d.y+M[1][2]*d.z)
                  + d.z*(M[2][0]*d.x+M[2][1]*d.y+M[2][2]*d.z);
    let dmin = null, vmin = Infinity;
    const P = 24;
    for(let a = 0; a < P; a++) for(let b = 0; b <= P/2; b++){
      const th = a*2*Math.PI/P, ph = b*Math.PI/(P/2);
      const d = new THREE.Vector3(Math.sin(ph)*Math.cos(th), Math.cos(ph), Math.sin(ph)*Math.sin(th));
      const v = va(d);
      if(v < vmin){ vmin = v; dmin = d.clone(); }
    }
    dmin.normalize();
    const e1 = new THREE.Vector3(1,0,0);
    if(Math.abs(dmin.dot(e1)) > 0.9) e1.set(0,1,0);
    e1.addScaledVector(dmin, -dmin.dot(e1)).normalize();
    const e2 = new THREE.Vector3().crossVectors(dmin, e1).normalize();
    let dmax = null, vmax = -Infinity;
    for(let i = 0; i < 90; i++){
      const a = i * Math.PI / 90;
      const d = e1.clone().multiplyScalar(Math.cos(a)).addScaledVector(e2, Math.sin(a));
      const v = va(d);
      if(v > vmax){ vmax = v; dmax = d.clone(); }
    }
    const dmid = new THREE.Vector3().crossVectors(dmin, dmax).normalize();
    const est = (d) => { let lo = Infinity, hi = -Infinity;
      for(const p of pts){ const t = p.clone().sub(c).dot(d); if(t<lo)lo=t; if(t>hi)hi=t; }
      return hi - lo; };
    return {c, min: dmin, max: dmax, mid: dmid, vmin, vmax,
            estMin: est(dmin), estMax: est(dmax), estMid: est(dmid)};
  }
  function versoDellaPietra(oggetto, c, asse){
    const inv = new THREE.Matrix4().copy(oggetto.matrixWorld).invert();
    const cen = new THREE.Vector3(); let quanti = 0;
    oggetto.traverse(o => {
      if(!o.isMesh || !o.material) return;
      const nm = (o.material.name || "").toLowerCase();
      if(nm === "oro" || nm === "argento" || nm === "acciaio"
         || (o.material.metalness !== undefined && o.material.metalness > 0.5)) return;
      const pp = o.geometry.getAttribute("position");
      const mm2 = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld);
      const vv = new THREE.Vector3();
      const salto = Math.max(1, Math.floor(pp.count / 500));
      for(let i = 0; i < pp.count; i += salto){
        vv.fromBufferAttribute(pp, i).applyMatrix4(mm2);
        cen.add(vv); quanti++;
      }
    });
    if(!quanti) return null;
    cen.multiplyScalar(1 / quanti).sub(c);
    cen.addScaledVector(asse, -cen.dot(asse));
    return cen.length() > 1e-6 ? cen.normalize() : null;
  }
  function cuoci(pezzo){
    pezzo.updateWorldMatrix(true, true);
    const mondo = pezzo.matrixWorld.clone();
    const dentro = new THREE.Group();
    dentro.add(pezzo);
    pezzo.position.set(0,0,0); pezzo.rotation.set(0,0,0); pezzo.scale.set(1,1,1);
    pezzo.applyMatrix4(mondo);
    dentro.updateMatrixWorld(true);
    return dentro;
  }
  const mm = v => +(v * 1000).toFixed(2);

  /* il gruppo che vola: la molla della cerimonia muove QUESTO, non il
     pezzo — così la posa misurata resta quella e il movimento è un
     guscio che si può togliere */
  const volo = new THREE.Group();
  base.add(volo);

  /* ── ANELLO: in piedi nella fenditura ───────────────────────────── */
  function posaAnello(dentro){
    const involucro = new THREE.Group();
    const pts = campiona(dentro, 1400);
    const a = terna(pts);
    const rot = new THREE.Group(); rot.add(dentro); involucro.add(rot);
    const qa = new THREE.Quaternion().setFromUnitVectors(
      a.min.clone(), new THREE.Vector3(0, 0, 1));
    rot.quaternion.copy(qa); rot.updateMatrixWorld(true);
    let cima2 = versoDellaPietra(dentro, a.c, a.min);
    if(!cima2){
      let best = null, bd = -1;
      for(const p of pts){
        const r = p.clone().sub(a.c); r.addScaledVector(a.min, -r.dot(a.min));
        if(r.length() > bd){ bd = r.length(); best = r.clone().normalize(); }
      }
      cima2 = best;
    }
    const cimaOra = cima2.clone().applyQuaternion(qa);
    /* `atan2(x, y)` misura DA +Y VERSO +X; una rotazione attorno a Z in
       three va da +X verso +Y. I due versi sono complementari: girare di
       -ang invece che di +ang porta il castone esattamente specchiato,
       cioè IN BASSO. */
    const ang = Math.atan2(cimaOra.x, cimaOra.y);
    rot.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 0, 1), ang));
    rot.updateMatrixWorld(true);
    /* la pietra si presenta a chi guarda: dieci gradi in avanti e il
       castone guarda l'obiettivo invece del soffitto */
    involucro.rotation.x = 10 * Math.PI / 180;
    involucro.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(involucro, true);
    const dd = b.getSize(new THREE.Vector3()), cc = b.getCenter(new THREE.Vector3());
    /* scende per il 57% della sua altezza: resta fuori la calotta con la
       pietra, e i due rulli restano scoperti a destra e a sinistra — ed
       è lì che la fenditura si legge. Limite fisico: l'inserto è alto
       15, la sede non può essere più profonda di 14. */
    const affondo = Math.min(dd.y * 0.57, 0.014);
    involucro.position.x -= cc.x;
    involucro.position.z -= cc.z;
    involucro.position.y += (INT.cresta - affondo) - b.min.y;
    involucro.updateMatrixWorld(true);
    const b2 = new THREE.Box3().setFromObject(involucro, true);
    volo.add(involucro);
    dati.pezzo = {
      diametro_mm: mm(Math.max(dd.x, dd.y)), fascia_mm: mm(Math.min(dd.x, dd.y, dd.z)),
      alto_mm: mm(dd.y), dentro_la_sede_mm: mm(affondo),
      infilato_pct: +((affondo / dd.y) * 100).toFixed(1),
      cima_sopra_il_bordo_mm: mm(b2.max.y - H_BASE),
      fenditura_scoperta_mm: mm((V_LA - Math.max(dd.x, dd.z)) / 2),
    };
  }

  /* ── ORECCHINI: la coppia, infilata nei due fori ──────────────────
     `pezzo00` È GIÀ LA COPPIA, e questo è l'errore che è costato la
     prima campagna: il costruttore in Blender unisce per nome, e sotto
     «pezzo00» ci stanno metallo, pietra E LE DUE ORECCHINE INSIEME
     (memoria `merce-vera-da-meshy-il-banco-di-posa`). Clonandolo per
     «fare il paio» sullo schermo ne uscivano QUATTRO — due coppie —
     e nessuno se n'era accorto, perché le quote dicevano «2» e le quote
     le scrivevamo noi. Guardare lo scatto l'ha detto in un secondo.
     Quindi il pezzo non si clona: si posa intero, e i due fori della
     carta si mettono dove stanno DAVVERO i due orecchini — che si
     trovano spaccando la nuvola dei punti lungo il suo asse lungo, che
     è l'asse della coppia. */
  function posaOrecchini(dentro){
    const involucro = new THREE.Group();
    const pts = campiona(dentro, 1800);
    const a = terna(pts);
    /* GLI ORECCHINI DI REGINA NON STANNO IN PIEDI, e il motivo è una
       misura: tutti e nove i pezzi sono fra 27 e 40 mm di lunghezza —
       sono cerchi con una goccia, non perni. In piedi uscivano 18,5 mm
       FUORI dalla base, col coperchio che ci passava attraverso.
       Coricati sono spessi 4,3, e il formato 65 x 65 x 25 torna giusto
       al millimetro: era sbagliata la posa, non la scatola.
       Il PIATTO (varianza minima) va in su; il LUNGO — che è la
       congiungente delle due orecchine — si mette lungo la X, così la
       coppia sta affiancata a chi guarda e non una dietro l'altra. */
    const rot = new THREE.Group(); rot.add(dentro); involucro.add(rot);
    const qa = new THREE.Quaternion().setFromUnitVectors(
      a.min.clone(), new THREE.Vector3(0, 1, 0));
    const lungoOra = a.max.clone().applyQuaternion(qa);
    const gira = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0), -Math.atan2(lungoOra.z, lungoOra.x));
    rot.quaternion.copy(qa).premultiply(gira);
    rot.updateMatrixWorld(true);
    involucro.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(involucro, true);
    const dd = b.getSize(new THREE.Vector3()), cc = b.getCenter(new THREE.Vector3());
    involucro.position.x -= cc.x;
    involucro.position.z -= cc.z;
    involucro.position.y += INT.cartaSu - b.min.y + 0.0002;
    involucro.updateMatrixWorld(true);
    volo.add(involucro);

    /* DOVE VANNO I DUE FORI. Si campiona il pezzo POSATO, si spacca la
       nuvola a metà lungo la X (che adesso è l'asse della coppia) e si
       prende il baricentro di ciascuna metà: è lì che il perno di
       quell'orecchino passa attraverso la carta. Se la spaccatura non dà
       due gruppi veri — un pezzo singolo, un giorno — resta un foro
       solo, e la carta lo dice invece di inventarne due. */
    const dopo = campiona(involucro, 2000).map(p => p.clone().add(involucro.position));
    let sx = {x: 0, z: 0, n: 0}, dx = {x: 0, z: 0, n: 0};
    for(const p of dopo){
      const g2 = p.x < 0 ? sx : dx;
      g2.x += p.x; g2.z += p.z; g2.n++;
    }
    const fori = [];
    for(const g2 of [sx, dx]){
      if(g2.n < 40) continue;
      fori.push({x: g2.x / g2.n, z: g2.z / g2.n});
    }
    costruisciCarta(fori);
    INT.interasse = fori.length === 2 ? Math.abs(fori[1].x - fori[0].x) : 0;
    const b2 = new THREE.Box3().setFromObject(involucro, true);
    dati.pezzo = {
      quanti: fori.length,
      coppia_larga_mm: mm(dd.x), lungo_mm: mm(dd.z), spesso_mm: mm(dd.y),
      interasse_mm: mm(INT.interasse), foro_mm: mm(INT.foroR * 2),
      sopra_la_carta_mm: mm(b2.max.y - INT.cartaSu),
      sotto_il_bordo_mm: mm(H_BASE - b2.max.y),
      luce_della_carta_mm: mm(V_LA),
      fori: fori.map(f => ({x_mm: mm(f.x), z_mm: mm(f.z)})),
    };
  }

  /* ── COLLANA: la U posata sulla sella, i rami nelle due fessure ─── */
  function posaCollana(dentro){
    const involucro = new THREE.Group();
    const pts0 = campiona(dentro, 2000);
    const a = terna(pts0);
    const rot = new THREE.Group(); rot.add(dentro); involucro.add(rot);
    /* LA U SI CORICA, E IL VERSO NON SI SCRIVE A MANO. Una collana
       drappeggiata non è piatta e il suo piano non è quello del busto:
       la direzione di varianza minima è la normale del piano in cui sta
       più stesa, e va in su. Poi l'asse lungo (163 mm) si mette lungo il
       LATO LUNGO della scatola, che è quello che ha più luce. */
    const qa = new THREE.Quaternion().setFromUnitVectors(
      a.min.clone(), new THREE.Vector3(0, 1, 0));
    const lungoOra = a.max.clone().applyQuaternion(qa);
    const versoIlLungo = PR >= LA
      ? -Math.atan2(lungoOra.x, lungoOra.z)
      :  Math.atan2(lungoOra.z, lungoOra.x);
    rot.quaternion.copy(qa).premultiply(
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), versoIlLungo));
    rot.updateMatrixWorld(true);
    involucro.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(involucro, true);
    const cc = b.getCenter(new THREE.Vector3());
    involucro.position.x -= cc.x;
    involucro.position.z -= cc.z;
    involucro.position.y += INT.padSu - b.min.y - 0.0008;   /* affonda nel velluto */
    involucro.updateMatrixWorld(true);
    volo.add(involucro);
    /* DOVE SI TAGLIA. Questa collana è un anello CHIUSO: non ha due capi
       da infilare, e cercarli dà due posti a caso. Quello che ha sono
       due RAMI — a una certa quota la catena passa due volte, una a
       sinistra e una a destra — ed è lì che in un cofanetto vero si
       mette la fessura, perché è lì che la catena si ferma. */
    const pts = campiona(involucro, 2600);
    let zlo = Infinity, zhi = -Infinity;
    for(const p of pts){ const z = p.z + involucro.position.z;
      if(z < zlo) zlo = z; if(z > zhi) zhi = z; }
    const z0 = zlo + (zhi - zlo) * 0.22;
    let sx = null, dx = null;
    for(const p of pts){
      const w = p.clone().add(involucro.position);
      const d = Math.abs(w.z - z0);
      if(w.x < -0.004){ if(!sx || d < Math.abs(sx.z - z0)) sx = w; }
      else if(w.x > 0.004){ if(!dx || d < Math.abs(dx.z - z0)) dx = w; }
    }
    const capi = [sx, dx].filter(Boolean);
    costruisciCuscinoPiatto(capi.map((p, i) => ({
      x: p.x, z: p.z, ang: (i === 0 ? -1 : 1) * 0.61})));   /* 35 gradi */
    /* E POI LA SELLA, sui punti del pezzo nel sistema della base */
    const nelBase = pts.map(p => p.clone().add(involucro.position));
    const sella = costruisciSella(nelBase);
    dati.sella = sella ? {raggio_mm: mm(sella.raggio), cresta_mm: mm(sella.cresta),
                          z_mm: mm(sella.z), aria_colmata_mm: mm(sella.alza),
                          lunga_mm: mm(sella.lunghezza), salita_mm: mm(sella.salita),
                          punti_dell_arco: sella.punti} : null;
    const dd = b.getSize(new THREE.Vector3());
    const b2 = new THREE.Box3().setFromObject(involucro, true);
    dati.pezzo = {
      largo_mm: mm(dd.x), lungo_mm: mm(dd.z), alto_mm: mm(dd.y),
      sopra_il_cuscino_mm: mm(b2.max.y - INT.padSu),
      sotto_il_bordo_mm: mm(H_BASE - b2.max.y),
      fessure: capi.map(p => ({x_mm: mm(p.x), z_mm: mm(p.z)})),
      avanza_di_lato_mm: mm((V_LA - dd.x) / 2),
      bombatura_mm: mm(dd.y),
    };
  }

  /* ── BRACCIALE: la catena ad anello, sotto due linguette ────────── */
  function linguetta(x, mezzaLuce, alzata){
    /* una linguetta è una striscia di pelle che scavalca il pezzo: un
       mezzo toro SCHIACCIATO, non un cilindro — una linguetta tonda in
       sezione è un elastico, e un elastico non è pelle */
    const g = new THREE.TorusGeometry(mezzaLuce, 0.0024, 6, MOBILE ? 18 : 26, Math.PI);
    g.scale(1, alzata / mezzaLuce, 0.34);
    g.rotateY(Math.PI / 2);
    const m = new THREE.Mesh(uvScatola(g, CELLA), similpelle());
    m.position.set(x, INT.padSu - 0.0004, 0);
    m.castShadow = !MOBILE; m.receiveShadow = true;
    base.add(m);
  }
  function posaBracciale(dentro){
    const involucro = new THREE.Group();
    const pts = campiona(dentro, 1600);
    const a = terna(pts);
    const rot = new THREE.Group(); rot.add(dentro); involucro.add(rot);
    const qa = new THREE.Quaternion().setFromUnitVectors(
      a.min.clone(), new THREE.Vector3(0, 1, 0));
    const lungoOra = a.max.clone().applyQuaternion(qa);
    const gira = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0), -Math.atan2(lungoOra.z, lungoOra.x));
    rot.quaternion.copy(qa).premultiply(gira);
    rot.updateMatrixWorld(true);
    involucro.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(involucro, true);
    const dd = b.getSize(new THREE.Vector3()), cc = b.getCenter(new THREE.Vector3());
    involucro.position.x -= cc.x;
    involucro.position.z -= cc.z;
    involucro.position.y += INT.padSu - b.min.y - 0.0006;
    involucro.updateMatrixWorld(true);
    volo.add(involucro);
    /* le linguette si mettono dove il pezzo è DAVVERO, e la loro luce è
       la profondità misurata più un filo di gioco */
    const mezza = dd.z / 2 + 0.0026;
    const alzata = dd.y + 0.0026;
    linguetta(-dd.x * 0.30, mezza, alzata);
    linguetta( dd.x * 0.30, mezza, alzata);
    const b2 = new THREE.Box3().setFromObject(involucro, true);
    dati.pezzo = {
      lungo_mm: mm(dd.x), largo_mm: mm(dd.z), alto_mm: mm(dd.y),
      sopra_il_cuscino_mm: mm(b2.max.y - INT.padSu),
      sotto_il_bordo_mm: mm(H_BASE - b2.max.y),
      linguette_x_mm: [mm(-dd.x * 0.30), mm(dd.x * 0.30)],
      avanza_in_lunghezza_mm: mm(V_LA - dd.x),
    };
  }

  /* ── OROLOGIO: appoggiato sul cuscino cilindrico ────────────────── */
  /* IL QUADRANTE DÀ LA NORMALE, NON LA TERNA. Su questo orologio le tre
     varianze principali sono 39,4 / 37,9 / 39,6: quasi uguali, cioè la
     terna non sa dire dov'è il sopra e la «minima» esce a caso — al
     primo giro l'orologio finiva DENTRO il cuscino. Ma il pezzo ha un
     quadrante, e un quadrante è un disco piatto: la sua varianza minima
     è la sua normale, e quella non è ambigua per niente. */
  function normaleDelQuadrante(oggetto){
    const pts = [];
    oggetto.updateWorldMatrix(true, true);
    const inv = new THREE.Matrix4().copy(oggetto.matrixWorld).invert();
    const v = new THREE.Vector3();
    oggetto.traverse(o => {
      if(!o.isMesh || !o.material) return;
      if(!/quadrante/i.test(o.material.name || "")) return;
      const p = o.geometry.getAttribute("position");
      const m = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld);
      const salto = Math.max(1, Math.floor(p.count / 700));
      for(let i = 0; i < p.count; i += salto){
        v.fromBufferAttribute(p, i).applyMatrix4(m);
        pts.push(v.clone());
      }
    });
    if(pts.length < 24) return null;
    const t2 = terna(pts);
    return {normale: t2.min.clone(), centro: t2.c.clone()};
  }
  function posaOrologio(dentro){
    const involucro = new THREE.Group();
    const pts = campiona(dentro, 1600);
    const a = terna(pts);
    const rot = new THREE.Group(); rot.add(dentro); involucro.add(rot);
    const qd = normaleDelQuadrante(dentro);
    let modo = "quadrante";
    if(qd){
      const fuori = qd.centro.clone().sub(a.c);
      if(qd.normale.dot(fuori) < 0) qd.normale.negate();
      rot.quaternion.copy(new THREE.Quaternion().setFromUnitVectors(
        qd.normale, new THREE.Vector3(0, 1, 0)));
    } else {
      modo = "terna";
      rot.quaternion.copy(new THREE.Quaternion().setFromUnitVectors(
        a.min.clone(), new THREE.Vector3(1, 0, 0)));
    }
    rot.updateMatrixWorld(true);
    involucro.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(involucro, true);
    const dd = b.getSize(new THREE.Vector3()), cc = b.getCenter(new THREE.Vector3());
    /* SI APPOGGIA, NON SI AVVOLGE: il pezzo del catalogo non è un anello
       chiuso, è una cassa con un moncone di cinturino, e attorno a un
       cuscino da 51 non ci gira. È l'altezza misurata ADESSO a dire
       quanto il cuscino deve affondare nella sua sede. */
    costruisciCuscino(dd.y);
    involucro.position.x -= cc.x;
    involucro.position.z -= cc.z;
    involucro.position.y += (INT.cuscinoSu - 0.0020) - b.min.y;
    involucro.updateMatrixWorld(true);
    volo.add(involucro);
    const b2 = new THREE.Box3().setFromObject(involucro, true);
    dati.pezzo = {
      modo, cassa_mm: mm(Math.max(dd.x, dd.z)), spesso_mm: mm(dd.y),
      cuscino_diametro_mm: mm(INT.cuscinoR * 2), cuscino_lungo_mm: mm(INT.cuscinoL),
      cresta_del_cuscino_mm: mm(INT.cuscinoSu),
      sopra_il_bordo_mm: mm(b2.max.y - H_BASE),
      spazio_nel_coperchio_mm: mm(VANO - (b2.max.y - H_BASE)),
      largo_contro_la_luce_mm: mm(dd.x) + " su " + mm(V_LA),
    };
  }

  /* ══ IL CARTONCINO STAMPATO ═══════════════════════════════════════
     DODICI ARTICOLI DEL CATALOGO NON HANNO UN MODELLO, e non è una
     mancanza da nascondere: è una coda che si chiude quando arriva la
     mesh. Fino ad allora l'astuccio della famiglia c'è lo stesso, e
     dentro ci sta il PROVINO su un CARTONCINO — non una fotografia
     ritagliata e fatta galleggiare nel vano, che è esattamente ciò che
     Massimo ha bocciato, ma un cartoncino di carta stampata posato nel
     vano, come i cartoncini veri degli orecchini.
     Si vede che è carta perché ha uno SPESSORE (0,7 mm), un bordo, una
     ruvidezza da carta e la sua ombra di contatto: un piano senza
     spessore appoggiato su un velluto è un adesivo. */
  function cartoncino(src){
    const W = V_LA - 0.0060, D = Math.min(V_PR - 0.0060, W * 1.25);
    const SP = 0.0007;
    const sh = rettangoloTondo(W, D, 0.0018);
    const g = new THREE.ExtrudeGeometry(sh, {depth: SP, bevelEnabled: false,
                                             curveSegments: 10});
    g.rotateX(-Math.PI / 2);
    const carta = new THREE.Mesh(uvEstruso(g, CELLA),
      tieni(new THREE.MeshPhysicalMaterial({
        color: 0xEFE9DD, metalness: 0, roughness: 0.94,
        roughnessMap: celle(ruvido, W, D, CELLA * 0.6),
        sheen: 0.06, sheenRoughness: 0.95})));
    /* IL CARTONCINO STA SUL FONDO, e l'attrezzatura della famiglia non
       si monta affatto. Al primo giro il cartoncino si appoggiava
       «sopra l'interno» — sulla carta degli orecchini, sui rulli
       dell'anello — e la carta degli orecchini è spessa 2,2 mm mentre
       il cartoncino ne è alto 0,7: spariva DENTRO, e la scatola usciva
       vuota (`_C5_cartoncino`, primo giro). Ma c'è di più, ed è la
       ragione vera: un'attrezzatura senza il suo pezzo è un difetto,
       non un dettaglio — due rulli con la fenditura vuota e un
       cartoncino appoggiato sopra non è un astuccio, è un astuccio a cui
       manca qualcosa. Finché il modello non c'è, la scatola porta solo
       la sua fodera e la carta stampata. */
    const su = H_FONDO;
    carta.position.y = su + 0.0002;
    carta.castShadow = !MOBILE; carta.receiveShadow = true;
    /* il cartoncino sta dentro `volo`: è LUI il pezzo che entra, e deve
       posarsi con la stessa molla. Fuori dal volo la battuta dei 600 ms
       resterebbe vuota e la cerimonia perderebbe il suo picco. */
    volo.add(carta);

    /* LA STAMPA. Un piano appena sopra la carta, col provino dentro. Il
       rapporto dell'immagine si rispetta: un gioiello schiacciato in un
       quadrato è un difetto che si vede prima del cofanetto. */
    const mat = tieni(new THREE.MeshPhysicalMaterial({
      color: 0xFFFFFF, metalness: 0, roughness: 0.90,
      transparent: true, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2}));
    const stampa = new THREE.Mesh(tieni(new THREE.PlaneGeometry(1, 1)), mat);
    stampa.rotation.x = -Math.PI / 2;
    stampa.position.set(0, carta.position.y + SP + 0.00015, 0);
    stampa.scale.set(W * 0.86, D * 0.86, 1);
    volo.add(stampa);

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if(morto) return;
      const t = tieni(new THREE.Texture(img));
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8; t.needsUpdate = true;
      mat.map = t; mat.needsUpdate = true;
      const r = img.width / img.height;
      const w2 = W * 0.86, d2 = D * 0.86;
      if(r > w2 / d2) stampa.scale.set(w2, w2 / r, 1);
      else            stampa.scale.set(d2 * r, d2, 1);
      sveglia();
    };
    img.onerror = () => { /* niente provino: resta il cartoncino nudo */ };
    img.src = src;
    dati.provino = true;
    dati.pezzo = {cartoncino: true, largo_mm: mm(W), lungo_mm: mm(D),
                  spessore_mm: mm(SP), provino: src};
  }

  /* ══ IL CARICAMENTO ═══════════════════════════════════════════════ */
  let morto = false;
  let caricatore = null, draco = null;

  function caricaIlPezzo(){
    if(PROVINO){
      /* nessun modello per questo esemplare: resta l'astuccio della
         famiglia — le sue quote, la sua fodera, il suo marchio — e
         dentro ci va il cartoncino stampato, posato sul fondo. */
      cartoncino(PROVINO);
      finisciIlCaricamento();
      return;
    }
    caricatore = new GLTFLoader();
    draco = new DRACOLoader().setDecoderPath(dove("lib/jsm/libs/draco/gltf/"));
    caricatore.setDRACOLoader(draco);
    const NOME = "pezzo" + String(PEZZO_K).padStart(2, "0");
    caricatore.load(dove(F.glb), (g) => {
      if(morto) return;
      let pezzo = null;
      g.scene.traverse(o => { if(o.name === NOME) pezzo = o; });
      /* IL BUSTO E LA RAMPA PORTANO UN PEZZO SOLO. Nel .glb del banco
         c'è `pezzo00` e basta: le altre collane e l'altro bracciale il
         modello non ce li ha. Si ripiega sul primo invece di aprire un
         astuccio vuoto, e lo si DICHIARA nei dati — un astuccio vuoto
         sarebbe un errore muto. */
      if(!pezzo){
        g.scene.traverse(o => { if(!pezzo && /^pezzo\d\d$/.test(o.name)) pezzo = o; });
        if(pezzo) dati.ripiego = NOME + " non c'e' in " + F.glb + ": " + pezzo.name;
      }
      if(!pezzo){
        dati.errore = NOME + " non trovato in " + F.glb;
        finisciIlCaricamento();
        return;
      }
      pezzo.traverse(o => { if(o.isMesh){ o.castShadow = !MOBILE; o.receiveShadow = true; } });
      const dentro = cuoci(pezzo);
      const alzatoOra = volo.position.y;
      volo.position.y = 0; volo.updateMatrixWorld(true);
      try{
        if(FAM === "anelli")         posaAnello(dentro);
        else if(FAM === "orecchini") posaOrecchini(dentro);
        else if(FAM === "collane")   posaCollana(dentro);
        else if(FAM === "bracciali") posaBracciale(dentro);
        else                         posaOrologio(dentro);
      }catch(err){ dati.errore = String((err && err.message) || err); }
      volo.position.y = alzatoOra; volo.updateMatrixWorld(true);
      finisciIlCaricamento();
    }, undefined, (e) => {
      if(morto) return;
      dati.errore = String((e && e.message) || e);
      finisciIlCaricamento();
    });
  }

  function finisciIlCaricamento(){
    /* IL FOTOGRAMMA LUNGO HA UN NOME, ED È LA COMPILAZIONE. Nella
       campagna di misura c'era un solo fotogramma fuori posto e cadeva
       sempre nello stesso punto: 169 ms sugli anelli, 167 sugli
       orologi, tutti a t = 600 ms — l'istante esatto in cui `volo`
       diventa visibile e i materiali del pezzo vengono disegnati per la
       prima volta. Non è la geometria: è il driver che compila lo
       shader del metallo mentre il coperchio è a metà corsa. Si paga
       PRIMA, da fermi, quando nessuno guarda.
       E SI COMPILA CON IL PEZZO VISIBILE. `compile()` salta gli oggetti
       invisibili, e a fotogramma zero `volo` è invisibile per
       definizione — è ancora dentro il coperchio chiuso. Chiamata così
       com'era, la compilazione non toccava l'unico materiale che serviva
       compilare: misurato, il fotogramma lungo restava dov'era (112 ms
       sugli orecchini, 95 sugli orologi, sempre fra 600 e 730 ms). Si
       accende `volo` per il tempo della compilazione e lo si rispegne:
       nessuno lo vede, perché fra le due righe non c'è un disegno. */
    /* E `compile()` DA SOLO NON BASTA. Compila i programmi dei
       materiali, ma non paga tutto il resto che un fotogramma vero paga
       la prima volta: il caricamento delle texture del pezzo sulla
       scheda (i due quadranti degli orologi sono .webp esterni al
       .glb), i programmi della passata di occlusione, i bersagli della
       catena. Misurato dopo il solo `compile()`: restava un fotogramma
       da 180 ms sugli anelli, 159 sugli orologi, 89 sui bracciali,
       sempre fra 640 e 730 ms.
       Quindi si DISEGNA davvero, una volta, al fotogramma finale e con
       l'occlusione accesa — cioè lo stato più costoso che la scena
       raggiungerà — ma NON sullo schermo: si stacca l'ultima passata
       dal telaio e il risultato resta nel bersaglio interno. Chi guarda
       continua a vedere la scatola chiusa. */
    const eraVisibile = volo.visible, eraT = t, eraAo = ao.enabled;
    volo.visible = true;
    try{ rend.compile(scena, camera); }catch(_){ /* niente */ }
    try{
      uscita.renderToScreen = false;
      ao.enabled = true;
      applicaRegia(REGIA.fine);
      comp.render();
    }catch(_){ /* niente */ }
    uscita.renderToScreen = true;
    ao.enabled = eraAo;
    volo.visible = eraVisibile;
    applicaRegia(eraT);
    dati.caricato = true;
    sveglia();
    grida("pronto", {errore: dati.errore, provino: dati.provino});
  }

  /* ══ LA CATENA DI RESA ════════════════════════════════════════════
     GTAO SOLO A RIPOSO. L'occlusione qui serve a una cosa sola: far
     TOCCARE lo spigolo di sotto il piano. Quella riga la si guarda da
     fermi; durante la cerimonia nessuno la vede, e una passata in meno
     sono nove millisecondi che tornano al coperchio. */
  const comp = new EffectComposer(rend);
  comp.setSize(LARGO, ALTO);
  comp.addPass(new RenderPass(scena, camera));
  const ao = new GTAOPass(scena, camera, LARGO, ALTO);
  {
    /* il raggio è in METRI e si misura sulla fessura vera — il gioco fra
       piede e piano è mezzo millimetro — e si scala col formato, se no
       sul bracciale il raggio del provino guarderebbe dentro */
    const scala = Math.max(LA, PR) / 0.050;
    ao.updateGtaoMaterial({radius: 0.0055 * scala, distanceExponent: 1.0,
                           thickness: 0.007 * scala, scale: 1.9,
                           samples: MOBILE ? 8 : 11, screenSpaceRadius: false});
    ao.updatePdMaterial({lumaPhi: 10, depthPhi: 2, normalPhi: 3,
                         radius: 5, radiusExponent: 1, rings: 2, samples: 10});
  }
  comp.addPass(ao);
  const uscita = new OutputPass();
  comp.addPass(uscita);

  /* ══ LA REGIA ═════════════════════════════════════════════════════ */
  function curvaBezier(t){
    const u = 1 - t;
    return {x: 3*u*u*t*0.2 + 3*u*t*t*0.2 + t*t*t,
            y: 3*u*u*t*0.8 + 3*u*t*t*1.0 + t*t*t};
  }
  function coperchioEase(x){
    let lo = 0, hi = 1, m = x;
    for(let i = 0; i < 20; i++){ m = (lo + hi) / 2;
      if(curvaBezier(m).x < x) lo = m; else hi = m; }
    return curvaBezier(m).y;
  }
  const c01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
  const dolce = k => k * k * (3 - 2 * k);
  /* LA MOLLA DEL PEZZO. Un pezzo che si posa in un astuccio non rimbalza
     come una palla: affonda un filo nel velluto e risale appena. Una
     sinusoide smorzata con un SOLO superamento — non easeOutElastic,
     che ne fa tre e trasforma l'oro in gomma. */
  const FIN_MOLLA = 1 - Math.exp(-5.2) * Math.cos(6.0);
  function mollaPezzo(k){
    if(k >= 1) return 1;
    return (1 - Math.exp(-5.2 * k) * Math.cos(6.0 * k)) / FIN_MOLLA;
  }

  const ALZATA = Math.max(LA, PR) * 0.10;
  let t = 0, inCorso = false, tocco = 0, battuto = false;

  function applicaRegia(ms){
    t = ms;
    sveglia();
    perno.rotation.x = APERTURA * coperchioEase(c01(ms / REGIA.coperchio));
    luceFodera.intensity = FORZA_FODERA * dolce(c01((ms - REGIA.fodera[0]) / REGIA.fodera[1]));
    luceVano.intensity   = FORZA_VANO   * dolce(c01((ms - REGIA.luce[0])   / REGIA.luce[1]));
    const k = c01((ms - REGIA.pezzo[0]) / REGIA.pezzo[1]);
    const m = mollaPezzo(k);
    volo.visible = ms >= REGIA.pezzo[0] - 40;
    volo.position.y = ALZATA * (1 - m);
    const s = 0.965 + 0.035 * m;
    volo.scale.set(s, s, s);
    /* la camera sale CON il coperchio, non dopo: è lo stesso gesto */
    elev = ELEV_CHIUSO + (ELEV_APERTO - ELEV_CHIUSO) * dolce(c01(ms / REGIA.camera));
    inquadra();
  }

  /* ── GLI ASCOLTI ─────────────────────────────────────────────────
     Tre soli avvisi, e sono FATTI avvenuti, non domande: «pronto» (il
     pezzo è in scena), «fine» (la cerimonia è finita, per salto o per
     tempo), «tocco» (il dito ha chiesto di saltare). Chi ascolta decide
     cosa farne — il tasto che cambia nome, il testo che entra. */
  const orecchie = new Set();
  function grida(che, d){
    for(const fn of orecchie){ try{ fn(che, d || {}); }catch(e){ console.error(e); } }
  }

  function suona(da){
    if(morto) return;
    battuto = false;
    mano.riarma();
    if(RIDOTTO){
      /* REDUCED-MOTION NON È «senza animazione»: è senza MOVIMENTO. Il
         fotogramma finale c'è lo stesso, ci si arriva in dissolvenza, e
         nessuno perde la scena — perde il moto, che è quello che dà
         fastidio a chi l'ha chiesto. */
      inCorso = false;
      applicaRegia(REGIA.fine);
      /* LA DISSOLVENZA SI FA CON `animate()`, NON CON UNA TRANSIZIONE
         DICHIARATA. Due ragioni, e la seconda è la vera. (1) Una
         transizione inline resta scritta sull'elemento anche dopo, e
         chi guarda il foglio calcolato la trova lì per sempre. (2) Il
         banco di collaudo ha una sonda — `movimento.mjs` — che con
         `prefers-reduced-motion: reduce` cerca ogni `transition` e
         `animation` DICHIARATA sopra i 200 ms e boccia: la nostra è
         240, che è il numero chiesto per questa scena, e una
         transizione CSS la farebbe cadere su una regola scritta per
         tutt'altro. Un'animazione del Web Animations API fa la stessa
         cosa sullo schermo e non lascia niente nel foglio calcolato. */
      try{
        tela.animate([{opacity: 0}, {opacity: 1}],
                     {duration: REGIA.ridotto, easing: "linear"});
      }catch(_){ /* niente: resta il fotogramma finale, secco */ }
      setTimeout(() => { dati.fine = true; grida("fine", {ridotto: true}); }, REGIA.ridotto);
      return;
    }
    t = da || 0;
    inCorso = true;
    tocco = performance.now() - t;
    sveglia();
  }
  function salta(){
    if(!inCorso) return;
    inCorso = false;
    applicaRegia(REGIA.fine);
    dati.fine = true;
    grida("fine", {saltata: true});
  }
  function chiudi(){ inCorso = false; dati.fine = false; applicaRegia(0); }

  /* ══ LE MANI ══════════════════════════════════════════════════════
     LA CAMERA NON SI MUOVE: gira l'OGGETTO. È la differenza fra guardare
     una stanza e tenere una scatola in mano, ed è anche la sola che
     tiene ferma la luce — con una camera che orbita, il riflesso sulla
     pelle scivola e l'oggetto sembra di plastica bagnata.
     L'orbita è fermata a 0/75 gradi: a 0 è il quadro costruito, oltre i
     75 si arriva dietro, dove un astuccio non ha niente da dire e la
     cerniera diventa il soggetto. */
  let giu = new Map(), ultimoX = 0, ultimoY = 0, pinza0 = 0, avvicina0 = 1;
  let trascinato = 0, versoNoto = 0, ultimoTocco = 0, accX = 0, accY = 0;

  const suGiu = (e2) => {
    tela.setPointerCapture(e2.pointerId);
    giu.set(e2.pointerId, {x: e2.clientX, y: e2.clientY});
    sveglia();
    if(giu.size === 1){
      ultimoX = e2.clientX; ultimoY = e2.clientY;
      trascinato = 0; versoNoto = 0; accX = 0; accY = 0;
    }
    if(giu.size === 2){
      const [a, b] = [...giu.values()];
      pinza0 = Math.hypot(a.x - b.x, a.y - b.y);
      avvicina0 = avvicina;
      /* due dita sono una pinza, e per quei pochi istanti lo scorrimento
         della scocca non serve a nessuno */
      if(scorre) tela.style.touchAction = "none";
    }
  };
  const suMuovi = (e2) => {
    if(!giu.has(e2.pointerId)) return;
    giu.set(e2.pointerId, {x: e2.clientX, y: e2.clientY});
    if(giu.size === 2){
      const [a, b] = [...giu.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if(pinza0 > 4){
        avvicina = Math.max(0.72, Math.min(1.25, avvicina0 * (pinza0 / d)));
        inquadra(); ultimoTocco = performance.now(); sveglia();
      }
      return;
    }
    const dx = e2.clientX - ultimoX, dy = e2.clientY - ultimoY;
    ultimoX = e2.clientX; ultimoY = e2.clientY;
    accX += Math.abs(dx); accY += Math.abs(dy);
    trascinato += Math.abs(dx) + Math.abs(dy);
    /* IL VERSO SI DECIDE UNA VOLTA SOLA, ai primi otto punti, e sul
       CAMMINO PERCORSO — non sull'ultimo scarto. Deciderlo a ogni
       fotogramma vuol dire che un dito che scorre in verticale e trema
       di due pixel gira anche l'oggetto: il gesto diventa due gesti
       insieme, e nessuno dei due si sente suo. Se il verso è verticale
       e la pagina scorre, qui non si tocca niente e lo scorrimento
       resta di chi sta sotto — che è la scocca, non noi. */
    if(!versoNoto && trascinato > 8) versoNoto = accX >= accY ? 1 : -1;
    if(scorre && versoNoto === -1) return;
    astuccio.rotation.y = Math.max(0, Math.min(ORBITA_MAX,
      astuccio.rotation.y + dx * 0.0060));
    ultimoTocco = performance.now(); sveglia();
  };
  const suSu = (e2) => {
    giu.delete(e2.pointerId);
    ultimoTocco = performance.now(); sveglia();
    if(giu.size < 2 && scorre) tela.style.touchAction = "pan-y";
    /* IL TOCCO CHE SALTA È UN TOCCO, non un trascinamento: sotto i 6
       pixel è un tap. Senza questa soglia, chi comincia a girare
       l'astuccio durante la cerimonia se la vede sparire in faccia. */
    if(trascinato < 6){
      if(inCorso){ grida("tocco", {t}); salta(); }
      else grida("tocco", {t});
    }
    trascinato = 0; versoNoto = 0;
  };
  tela.addEventListener("pointerdown", suGiu);
  tela.addEventListener("pointermove", suMuovi);
  tela.addEventListener("pointerup", suSu);
  tela.addEventListener("pointercancel", suSu);

  /* ══ IL GIRO ══════════════════════════════════════════════════════
     E IL RIPOSO. Un astuccio aperto e fermo è un'immagine ferma: tenere
     un ciclo di disegno a sessanta fotogrammi al secondo su
     un'immagine ferma è una batteria che si scarica per niente, ed è
     anche il motivo per cui l'occlusione — che si accende solo a riposo
     — costerebbe una passata a ogni fotogramma per sempre.
     Si guarda una FIRMA dello stato (coperchio, orbita, avvicinamento,
     pezzo, occlusione, marchio arrivato): quando non cambia per quattro
     giri, si smette di chiedere fotogrammi. Qualunque cosa possa
     cambiare la scena — un dito, una misura nuova, una battuta di regia
     — chiama `sveglia()`. Il rischio di questo disegno è dimenticare
     una sveglia: per questo le sveglie stanno tutte nelle tre porte
     (mani, ridimensionamento, regia) e non sparse. */
  let vivo = 0, dormo = false, firma = "", uguali = 0;
  function sveglia(){
    uguali = 0;
    if(!morto && dormo){ dormo = false; vivo = requestAnimationFrame(giro); }
  }
  function giro(){
    if(morto) return;
    vivo = requestAnimationFrame(giro);
    if(inCorso){
      const ms = performance.now() - tocco;
      /* L'UNICO PATTERN APTICO LECITO, E STA QUI: allo SCATTO del
         coperchio, cioè a fine corsa (700 ms). Non alla partenza — lì
         il dito ha appena toccato e il ritorno lo dà il tasto — e non
         alla fine, dove non succede niente di fisico. Uno scatto, una
         volta. */
      if(!battuto && ms >= REGIA.scatto){ battuto = true; mano.batti(); }
      if(ms >= REGIA.fine){
        inCorso = false; applicaRegia(REGIA.fine);
        dati.fine = true; grida("fine", {});
      }
      else applicaRegia(ms);
    }
    const fermoDaUnPo = !inCorso && giu.size === 0
                     && (performance.now() - ultimoTocco) > 140;
    ao.enabled = fermoDaUnPo;
    comp.render();
    dati.triangoli = rend.info.render.triangles;
    dati.chiamate = rend.info.render.calls;
    rend.info.reset();
    if(dati.primo === null){
      dati.primo = +(performance.now() - T0).toFixed(1);
      dati.primoDaNavigazione = +performance.now().toFixed(1);
      el.dataset.primo = String(dati.primo);
    }
    dati.t = t;
    const ora = perno.rotation.x.toFixed(6) + "|" + astuccio.rotation.y.toFixed(5)
              + "|" + avvicina.toFixed(4) + "|" + volo.position.y.toFixed(6)
              + "|" + (ao.enabled ? 1 : 0) + "|" + (dati.caricato ? 1 : 0)
              + "|" + (marchio.material.alphaMap ? 1 : 0) + "|" + dati.triangoli;
    if(ora === firma){
      if(++uguali >= 4 && !inCorso && giu.size === 0){
        dormo = true;
        cancelAnimationFrame(vivo); vivo = 0;
        el.dataset.fermo = "1";
      }
    } else { uguali = 0; delete el.dataset.fermo; }
    firma = ora;
  }

  function ridimensiona(){
    if(morto) return;
    const [w, h] = misura();
    if(w === LARGO && h === ALTO) return;
    LARGO = w; ALTO = h;
    rend.setSize(w, h, false); comp.setSize(w, h);
    camera.aspect = w / h;
    calcolaDistanza();
    inquadra();
    sveglia();
  }
  const occhio = ("ResizeObserver" in window) ? new ResizeObserver(ridimensiona) : null;
  if(occhio) occhio.observe(el); else addEventListener("resize", ridimensiona);

  /* stato iniziale: chiuso. Chi vuole vederlo aperto lo dice. */
  applicaRegia(opz.stato === "aperto" ? REGIA.fine : 0);
  caricaIlPezzo();
  giro();

  /* ── LO SMONTAGGIO ───────────────────────────────────────────────
     Un contesto WebGL non lo raccoglie il netturbino della memoria: se
     ne apre un altro finché il browser non ne chiude uno vecchio a
     sorpresa, e sul telefono quel «vecchio» è sempre quello che serve.
     Qui si libera tutto: le geometrie e le texture raccolte in
     `daButtare`, l'ambiente cotto, il generatore, il decodificatore
     Draco (che è un worker vero), la catena delle passate e il
     contesto. */
  function smonta(){
    if(morto) return;
    morto = true;
    if(vivo) cancelAnimationFrame(vivo);
    if(occhio) occhio.disconnect(); else removeEventListener("resize", ridimensiona);
    tela.removeEventListener("pointerdown", suGiu);
    tela.removeEventListener("pointermove", suMuovi);
    tela.removeEventListener("pointerup", suSu);
    tela.removeEventListener("pointercancel", suSu);
    if(imgMarchio){ imgMarchio.onload = null; imgMarchio.src = ""; }
    orecchie.clear();
    mano.via();
    scena.traverse(o => {
      if(o.isMesh){
        if(o.geometry) o.geometry.dispose();
        const mm2 = Array.isArray(o.material) ? o.material : [o.material];
        for(const m of mm2) if(m && m.dispose) m.dispose();
      }
    });
    for(const x of daButtare){ try{ x.dispose && x.dispose(); }catch(_){} }
    try{ ambiente.dispose(); }catch(_){}
    try{ pm.dispose(); }catch(_){}
    try{ if(draco) draco.dispose(); }catch(_){}
    try{ comp.dispose(); }catch(_){}
    try{ rend.dispose(); rend.forceContextLoss(); }catch(_){}
    if(tela.parentNode) tela.parentNode.removeChild(tela);
  }

  const maniglia = {
    suona, salta, chiudi, smonta,
    quando(fn){ orecchie.add(fn); return () => orecchie.delete(fn); },
    /* la maniglia della sonda: ferma l'orologio, lo porta a `ms` e
       restituisce ciò che si sta DAVVERO disegnando — non i parametri
       che le abbiamo dato */
    a(ms){
      inCorso = false;
      applicaRegia(ms);
      comp.render();
      return {
        t: ms,
        coperchio: +(perno.rotation.x * 180 / Math.PI).toFixed(3),
        fodera: +luceFodera.intensity.toFixed(5),
        luce: +luceVano.intensity.toFixed(5),
        pezzo: +(volo.position.y * 1000).toFixed(3),
        visibile: volo.visible,
        elevazione: +(elev * 180 / Math.PI).toFixed(3),
      };
    },
    get stato(){
      return {t, fine: dati.fine, inCorso, caricato: dati.caricato,
              primo: dati.primo, primoDaNavigazione: dati.primoDaNavigazione,
              triangoli: dati.triangoli, chiamate: dati.chiamate,
              errore: dati.errore, ridotto: RIDOTTO, aptico: mano.c_e};
    },
    get dati(){ return dati; },
    quote(){
      return {
        famiglia: FAM, nome: F.nome, fodera: FODERA,
        scatola_mm: [mm(LA), mm(PR), mm(H_BASE + H_COP)],
        base_mm: mm(H_BASE), coperchio_mm: mm(H_COP), parete_mm: mm(MURO),
        vano_coperchio_mm: mm(VANO), marchio_mm: mm(M_LA),
        cella_pelle_mm: mm(CELLA), cella_pelo_mm: mm(CELLA_PELO),
        profilo: MOBILE ? "mobile" : "banco", dpr: rend.getPixelRatio(),
        sella: dati.sella, pezzo: dati.pezzo, ripiego: dati.ripiego || null,
      };
    },
    byte(){
      const r = performance.getEntriesByType("resource");
      const per = {}; let tot = 0;
      for(const e2 of r){
        const n = e2.name.split("/").pop().split("?")[0];
        const b = e2.transferSize || e2.encodedBodySize || 0;
        per[n] = b; tot += b;
      }
      const nav = performance.getEntriesByType("navigation")[0];
      if(nav){ per["(documento)"] = nav.transferSize || nav.encodedBodySize || 0;
               tot += per["(documento)"]; }
      return {tot, per};
    },
  };
  return maniglia;
}

export default {monta, REGIA, FAMIGLIE, famigliaAstuccio, foderaDellaCerimonia, DA_BANCO};
