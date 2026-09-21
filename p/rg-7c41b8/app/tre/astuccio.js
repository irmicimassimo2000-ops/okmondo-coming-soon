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
       pezzo — ma DENTRO la famiglia giusta, che è quella che dicono le
       foto: collane 175 x 175 x 41 (quadrato e basso), bracciali
       90 x 90 x 41 (il quadrato profondo dei rigidi).
     · LE COSTRUZIONI VENGONO DALLE FOTO, NON DALLE SCHEDE. Il 21/09,
       con 108 foto vere di astucci sul disco (`riferimenti/ASTUCCI.md`),
       tre interni su cinque sono risultati oggetti che in gioielleria
       non esistono — i due rulli dell'anello, la carta forata degli
       orecchini, la sella con le asole della collana — e sono stati
       rifatti sull'ancora vera, una per tipologia. Il registro è quello
       dell'astuccio italiano a cerniera da 1-2,50 euro, che è il
       proporzionato a uno scontrino da 22-89: filetto d'oro, cielo in
       raso col marchio stampato, pad estraibile. Niente bottoncino in
       ottone, che è firma Cartier e su un bijou suona falsa.
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
  /* 65 x 65 x 25 ERA LA SCATOLA SBAGLIATA, e la foto lo dice in un
     secondo: quel formato è il Westpack Boston ECO, cioè CARTONE con
     dentro la SPUGNA e il coperchio separato — il registro economico.
     L'astuccio a cerniera da orecchini della stessa serie è alto 39
     (Oslo 64 x 64 x 39, Madrid 68 x 68 x 41), perché dentro non c'è una
     carta tesa sul vuoto: c'è un'ALETTA che si alza, e un'aletta vuole
     l'altezza. Vedi `riferimenti/astucci/or-finer-majestic-aletta-due-tagli.jpg`. */
  orecchini: {
    glb: "assets/REGINA_orecchini.draco.glb", pezzi: 9,
    LA: 0.065, PR: 0.065, H_BASE: 0.026, H_COP: 0.013, RAG: 0.0030,
    nome: "astuccio da orecchini 65 x 65 x 39",
  },
  /* COLLANE E BRACCIALI ARRIVANO GIÀ TAGLIATI SUL PEZZO. In `_CF4` le
     due colonne — catalogo e taglio — stavano affiancate perché senza
     il confronto il problema non si vedeva. Qui il problema è visto e
     deciso: restano solo le quote che reggono la merce vera.
     E IL TAGLIO SI FA DENTRO LA FAMIGLIA GIUSTA, non fuori. La collana
     vera è un astuccio QUADRATO e BASSO (Oslo 160 x 160 x 34, Madrid
     168 x 169 x 41, New York 165 x 165 x 40): quadrato lo era già a
     metà — 151 x 175 — e basso non lo era per niente, 52. Qui torna
     quadrato, e l'altezza scende al tetto reale della serie (Madrid,
     41). Il lato è 175 e non 160 perché la merce vera è lunga 163,7 e
     nel 160 di catalogo NON ENTRA: si taglia la scatola sul pezzo, come
     era già deciso. I 41 non sono un capriccio: la collana di Regina è
     modellata sul busto e conserva 29,5 mm di bombatura anche stesa —
     in 36 mm il coperchio non si chiude sopra il pezzo. Dichiarato.
     Il BRACCIALE non è più 85 x 85 x 24 (Milano ECO, cartone) e non è
     nemmeno il lungo 220 x 52 degli elastici: quello è l'astuccio della
     catena DISTESA, e la nostra è una catena chiusa ad ANELLO da 67 mm
     che non si stende senza rimodellarla. Il formato vero di un anello
     chiuso è il quadrato profondo — Oslo «pendant/bangle» 90 x 90 x 41,
     ed è esattamente la foto `br-finer-duet-rigido-b.jpg`: pad piatto,
     cerchio posato, la scatola che finisce dove finisce il pezzo. In un
     220 x 52 lo stesso anello lascerebbe sette centimetri di vuoto per
     parte. Dichiarato: il giorno che la catena si rimodella distesa,
     l'astuccio giusto torna a essere il lungo con i due elastici. */
  collane: {
    glb: "assets/REGINA_busto.draco.glb", pezzi: 1,
    LA: 0.175, PR: 0.175, H_BASE: 0.027, H_COP: 0.014, RAG: 0.0040,
    nome: "cofanetto da collana 175 x 175 x 41",
  },
  bracciali: {
    glb: "assets/REGINA_rampa.draco.glb", pezzi: 1,
    LA: 0.090, PR: 0.090, H_BASE: 0.027, H_COP: 0.014, RAG: 0.0035,
    nome: "astuccio da bracciale 90 x 90 x 41",
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

/* ── UN MODELLO SOLO, TRE ARTICOLI: IL METALLO LI DISTINGUE ────────
   VERIFICATO, non supposto (`_R3_glb.json`): `REGINA_busto.draco.glb`
   porta `pezzo00` e basta — una collana sola, materiale `oro` —
   e `REGINA_rampa.draco.glb` porta `pezzo00` e basta, materiale
   `argento`. Le tre collane e i due bracciali del catalogo sono lo
   STESSO filo: quello che li distingue davvero è il metallo, e il
   catalogo lo dichiara.
   Il banco lo fa già da sempre (`METALLI` in `spazio.html`: le copie
   dell'espositore ricolorano il metallo del pezzo). L'astuccio no: si
   limitava a schiacciare `k` sull'unico modello e a scrivere
   `dati.ripiego` in un campo che nessuno guarda — cioè apriva la
   scatola della Collana Punto d'argento e ci metteva dentro quella
   d'oro, in silenzio.
   Questa tabella è lo SPECCHIO di quella del banco e dei campi
   `att.metallo` di `app/dati/catalogo.js`; chi monta può scavalcarla
   con `opz.metallo` quando ha il dato vero in mano. */
const METALLI_DEL_BANCO = {
  busto: [0xC6A44E, 0xCFD2D4, 0xA8ADB1],  /* maglia dorata · punto argento · onda acciaio */
  rampa: [0xCFD2D4, 0xC6A44E],            /* maglia larga argento · maglia dorata */
};

/* ── I TRE PERNI NON SONO UNO SPECCHIO ─────────────────────────────
   La stessa correzione del banco, con le stesse misure: vedi il
   commento esteso di `rimediaPerni` in `studio/prova3d/spazio.html`.
   In due parole: il bordo dei tre perni è un disco decagonale piatto a
   metalness 1 e roughness 0,14, cioè uno specchio rivolto alla
   macchina, e quello che riflette è la scatola scura della vetrina —
   da cui il buco nero. Ammorbidire le normali peggiora (misurato: il
   metallo va al 100 % sotto L 0,20, perché si perdono le due facce che
   pescavano un faro). Si abbassa lo specchio, e basta.
   Chi è un perno lo dicono gli indici del catalogo, non un nome di
   mesh: `orecchini` k = 2, 5, 8 sono Perno Turchese, Perno Perla,
   Perno Cabochon. */
const PERNI = {orecchini: new Set([2, 5, 8])};
const PERNO_METALLO = {roughness: 0.50, metalness: 0.70};

/* ── I TAGLI DEGLI INTERNI, in metri ───────────────────────────────
   Stanno QUI e non dentro `monta` per una ragione di ordine di
   esecuzione già pagata: gli interni si costruiscono nel corpo del
   modulo, cioè PRIMA della riga in cui un `const` dichiarato là dentro
   sarebbe inizializzato, e una costante letta nella sua zona morta non
   è un valore mancante — è un errore che uccide il modulo.

   ASOLA  il labbro smussato comune a tutti i tagli (capi tondi).
   FESSURA la fenditura del cuscinetto da anello: luce 4,2 (ci passa una
           fascia da 2-3 mm con gioco), lunga al massimo 30 — nelle foto
           il taglio non arriva mai ai due fianchi del cuscino.
   TACCA  l'intaglio nel bordo di dietro del cuscino da collana: largo
           10, profondo 12. Non è un buco: è un VARCO aperto sul filo,
           da cui la catena sale e gira dietro il cuscino
           (`co-westpack-oslo-160x160x34.jpg`, `co-astuccishop-newyork`).
   ALETTA il pannello inclinato degli orecchini: 58 gradi dal pavimento,
           che è l'inclinazione delle foto Finer/Astuccishop. */
/* I MILLIMETRI DELLE QUOTE STANNO FUORI DA `monta`, e non è pedanteria:
   gli interni si costruiscono nel corpo del modulo e scrivono le loro
   quote mentre si costruiscono. Se `mm` fosse un `const` dichiarato più
   in basso dentro `monta`, la prima quota scritta lo leggerebbe nella
   sua zona morta — l'errore che una volta ha impedito ai bracciali di
   montarsi affatto. */
const mm = v => +(v * 1000).toFixed(2);

const ASOLA   = {L: 0.013, W: 0.0050, smusso: 0.0012};
const FESSURA = {W: 0.0042, Lmax: 0.030};
const TACCA   = {larg: 0.013, prof: 0.017};
/* LE DUE INCLINAZIONI NON SONO LA STESSA, e le foto lo dicono a colpo
   d'occhio: l'aletta dei PERNI è RIPIDA (Finer Majestic, Astuccishop
   Velvet: sta su come un leggio, sui 55-60 gradi, perché deve tenere in
   vista due pezzi piccolissimi), il cuscino dei PENDENTI è quasi
   COLCATO (Finer Premier pad reversibile, Westpack Oslo: una rampa
   dolce sui 30, perché ci deve stare un pezzo lungo 15-40 mm che
   scende). Tenerne una sola è stato l'errore del primo giro: a 58 gradi
   il pannello dei pendenti è lungo 24 mm dentro una base da 26, i pezzi
   finivano in fondo e il muro davanti se li mangiava. */
const ALETTA  = {gradi: 58, gradiPad: 32, spessa: 0.0028, spessaPad: 0.0060,
                 tagliaW: 0.0026, s_perni: 0.55, s_pendenti: 0.88};

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
  /* IL K CHIESTO E IL K CHE IL MODELLO HA sono due cose diverse, e
     tenerle separate è tutta la differenza fra «si usa lo stesso filo
     con il metallo giusto» e «si apre un'altra collana senza dirlo». */
  const K_CHIESTO = Math.max(0, +(opz.k || 0));
  const PEZZO_K = Math.min(F.pezzi - 1, K_CHIESTO);
  const METALLO = (opz.metallo !== undefined && opz.metallo !== null)
    ? +opz.metallo
    : ((METALLI_DEL_BANCO[opz.fam] || [])[K_CHIESTO]);
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
  /* ── QUANTO È PROFONDO IL COPERCHIO, DAVVERO ─────────────────────
     `VANO` è l'altezza a cui sta la fodera dentro il coperchio, cioè lo
     spazio utile sopra il bordo della base. Era `H_COP * 0,60`, che su
     un coperchio da 13 mm lascia 5,2 mm di imbottitura: una fodera
     spessa mezzo centimetro non esiste in nessuna delle foto — il raso
     è teso su un cartoncino e sta a due o tre millimetri dal cielo.
     Presa così, la misura rubava spazio al pezzo: sull'anello erano i
     7,8 mm che costringevano a infilare l'anello per il 57 % della sua
     altezza, cioè a seppellirlo. Adesso la fodera sta dove sta davvero,
     3,5 mm sotto il cielo, e l'anello può stare infilato a metà fascia
     come nelle foto. */
  const VANO = Math.min(0.022, Math.max(0.004, H_COP - 0.0035));
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

  /* ── IL FILETTO, CHE NON È UNA MINUTERIA ─────────────────────────
     La riga d'oro che corre sul coperchio e sul perimetro non è ottone:
     è una STAMPA A CALDO, una foglia premuta dentro la pelle. Quindi
     non è uno specchio — metalness 0,70 e roughness 0,36 — e il suo
     colore è quello del marchio, non quello della cerniera: sono la
     stessa lavorazione, e due ori diversi sullo stesso coperchio si
     vedono. */
  const filoOro = tieni(new THREE.MeshPhysicalMaterial(
    {color: ORO, metalness: 0.70, roughness: 0.36}));

  /* ── IL RASO DEL CIELO ───────────────────────────────────────────
     Il cielo del coperchio non è velluto, ed è la differenza che si
     vede per prima in tutte le foto: dentro l'astuccio ci sono DUE
     tessuti, il velluto/microfibra opaco del vano e il RASO lucido del
     coperchio, ed è il secondo a raccogliere la luce e a portare il
     marchio stampato. Un coperchio foderato dello stesso velluto del
     fondo legge come una scatola imbottita, non come un astuccio da
     gioielliere.
     Il raso si costruisce all'opposto del velluto: ruvidezza bassa
     invece che 1,0, velo stretto (0,14) invece che largo (0,30), e la
     trama della grana tirata a un terzo di cella — il riflesso lungo
     del filo, non il pelo corto. */
  function raso(w, d, colore){
    const c = new THREE.Color(colore === undefined ? VESTE : colore);
    const m = tieni(new THREE.MeshPhysicalMaterial({
      color: c.clone().multiplyScalar(0.95),
      metalness: 0, roughness: 0.34,
      sheen: 0.85, sheenRoughness: 0.14,
      sheenColor: c.clone().lerp(new THREE.Color(0xffffff), 0.55),
      normalMap: celle(grana, w, d, CELLA * 0.34),
      clearcoat: 0.10, clearcoatRoughness: 0.42,
    }));
    m.normalScale.set(0.22, 0.22);
    return m;
  }

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

  /* ── LO STADIO: UN TAGLIO A CAPI TONDI ───────────────────────────
     Ogni taglio di questo astuccio — la fenditura dell'anello, i due
     tagli dell'aletta — è uno STADIO: due tratti dritti e due
     semicerchi ai capi. Non un rettangolo: un'asola da cofanetto è
     tagliata e poi rifinita, non incisa con una lama tirata, e uno
     spigolo vivo su un taglio di velluto legge come un graffio.
     Le coordinate sono quelle della FORMA (dove la y della forma è il
     -z del mondo, per via del `rotateX(-90)` che tutte le estrusioni
     fanno dopo): chi ragiona in coordinate di mondo passa `-z`. È
     l'errore che c'era nelle vecchie asole della collana — messe a
     `f.z` invece che a `-f.z`, finivano specchiate sull'altro lato, e
     le quote dicevano il contrario di quello che si disegnava. */
  function pathStadio(cx, cy, ang, L, W){
    const r = W / 2, dritto = Math.max(0.0004, L / 2 - r);
    const co = Math.cos(ang), si = Math.sin(ang);
    const qua = (a2, b2) => [cx + a2 * co - b2 * si, cy + a2 * si + b2 * co];
    const N = MOBILE ? 7 : 10;
    const punti = [];
    punti.push(qua(-dritto, -r), qua(dritto, -r));
    for(let i = 1; i < N; i++){
      const a2 = -Math.PI / 2 + Math.PI * i / N;
      punti.push(qua(dritto + r * Math.cos(a2), r * Math.sin(a2)));
    }
    punti.push(qua(dritto, r), qua(-dritto, r));
    for(let i = 1; i < N; i++){
      const a2 = Math.PI / 2 + Math.PI * i / N;
      punti.push(qua(-dritto + r * Math.cos(a2), r * Math.sin(a2)));
    }
    const pa = new THREE.Path();
    pa.moveTo(punti[punti.length - 1][0], punti[punti.length - 1][1]);
    for(const qq of punti) pa.lineTo(qq[0], qq[1]);
    return pa;
  }

  /* ── IL BORDO DI DIETRO CON LE TACCHE ────────────────────────────
     La tacca della collana non è un'asola e non è un buco: è un VARCO
     aperto sul FILO del cuscino, verso l'alto. Lo si vede nelle foto
     Westpack Oslo e Astuccishop New York — negli angoli alti del
     cuscino ci sono due intagli, e la catena sale, ci entra e gira
     DIETRO il cuscino, dove il fermaglio sparisce. Un buco in mezzo al
     velluto non lo farebbe: la catena non ha dove andare.
     Qui si riscrive solo il lato di dietro del rettangolo tondo, che
     nella forma è quello a y = +d/2 (il -z del mondo). */
  function formaConTacche(w, d, r, tacche){
    const s = new THREE.Shape();
    const X = w / 2, Z = d / 2;
    s.moveTo(-X + r, -Z);
    s.lineTo(X - r, -Z);  s.quadraticCurveTo(X, -Z, X, -Z + r);
    s.lineTo(X, Z - r);   s.quadraticCurveTo(X, Z, X - r, Z);
    const ord = (tacche || []).slice()
      .filter(t => t.x + t.larg / 2 < X - r && t.x - t.larg / 2 > -X + r)
      .sort((a, b) => b.x - a.x);
    for(const t of ord){
      const hw = t.larg / 2, pr = Math.min(t.prof, d * 0.35);
      const rr = Math.min(hw, pr) * 0.55;
      s.lineTo(t.x + hw, Z);
      s.lineTo(t.x + hw, Z - pr + rr);
      s.quadraticCurveTo(t.x + hw, Z - pr, t.x + hw - rr, Z - pr);
      s.lineTo(t.x - hw + rr, Z - pr);
      s.quadraticCurveTo(t.x - hw, Z - pr, t.x - hw, Z - pr + rr);
      s.lineTo(t.x - hw, Z);
    }
    s.lineTo(-X + r, Z);  s.quadraticCurveTo(-X, Z, -X, Z - r);
    s.lineTo(-X, -Z + r); s.quadraticCurveTo(-X, -Z, -X + r, -Z);
    return s;
  }

  /* ══ IL FILETTO D'ORO ═══════════════════════════════════════════════
     È il segno che, in tutte le foto degli astucci italiani a cerniera,
     dice «gioielleria» prima ancora che si apra la scatola: una riga
     d'oro impressa a caldo che corre sul piano del coperchio e attorno
     al perimetro, una sul bordo basso del coperchio e una sul bordo
     alto della base — due righe parallele che, con la linea di
     chiusura in mezzo, fanno il carattere dell'oggetto
     (`an-finer-premier-chiuso-filetto-oro.jpg`,
     `or-finer-premier-perni-aperto.jpg`, `br-finer-premier-*`).
     Le larghezze si scalano col formato, perché una riga da mezzo
     millimetro su un cofanetto da 175 sparisce e una da due su un
     astuccio da 50 è un nastro. */
  const FIL_W = Math.max(0.00035, Math.min(0.0016, Math.min(LA, PR) * 0.011));
  /* il rientro NON è una percentuale del lato: su un cofanetto da 175
     il sette per cento farebbe una cornice a 12 mm dal filo, cioè un
     riquadro; nelle foto la riga corre SEMPRE a tre-cinque millimetri
     dal bordo, qualunque sia il formato. Si scala, ma con un tetto. */
  const FIL_IN = Math.max(0.0030, Math.min(0.0075, Math.min(LA, PR) * 0.070));
  /* la riga del perimetro sporge di sei centesimi di millimetro: è una
     foglia premuta DENTRO la pelle, non un anello infilato sopra */
  function filettoBordo(w, d, r, y, z0, dentro){
    const s = rettangoloTondo(w, d, r);
    const sp = 0.00034;
    s.holes.push(new THREE.Path(
      rettangoloTondo(w - 2 * sp, d - 2 * sp, Math.max(0.0002, r - sp)).getPoints(26)));
    const g = tieni(new THREE.ExtrudeGeometry(s, {depth: FIL_W, bevelEnabled: false,
                                                  curveSegments: SEG.angolo}));
    g.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(g, filoOro);
    m.position.set(0, y, z0 || 0);
    dentro.add(m);
    return m;
  }
  /* e la riga sul PIANO del coperchio, rientrata di un settimo del lato */
  function filettoPiano(w, d, r, y, z0, dentro){
    const s = rettangoloTondo(w, d, r);
    s.holes.push(new THREE.Path(
      rettangoloTondo(w - 2 * FIL_W, d - 2 * FIL_W,
                      Math.max(0.0002, r - FIL_W)).getPoints(26)));
    const g = tieni(new THREE.ExtrudeGeometry(s, {depth: 0.00012, bevelEnabled: false,
                                                  curveSegments: SEG.angolo}));
    g.rotateX(-Math.PI / 2);
    const mat = tieni(filoOro.clone());
    mat.polygonOffset = true; mat.polygonOffsetFactor = -2; mat.polygonOffsetUnits = -2;
    const m = new THREE.Mesh(g, mat);
    m.position.set(0, y, z0 || 0);
    dentro.add(m);
    return m;
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

  /* la riga d'oro della base corre appena sotto il filo, dove nelle
     foto sta sempre: è la gemella di quella del coperchio, e le due
     insieme incorniciano la linea di chiusura. La distanza dalla
     chiusura è la STESSA per le due righe — se no non sono una coppia,
     sono due righe — e si scala col formato ma con un tetto, se no su
     un cofanetto da 175 finirebbero a mezzo centimetro dal filo. */
  const FIL_DA = Math.max(0.0014, Math.min(0.0030, Math.min(LA, PR) * 0.035));
  filettoBordo(LA + 0.00012, PR + 0.00012, RAG,
               H_BASE - FIL_W - FIL_DA, 0, base);

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

  /* ── LE DUE RIGHE D'ORO DEL COPERCHIO ────────────────────────────
     Una sul PIANO, rientrata — è quella che si vede per prima quando
     l'astuccio è chiuso — e una attorno alla gonna, appena sopra il
     filo basso: nelle foto il coperchio ne porta sempre due, e la
     seconda è quella che, insieme alla riga della base, fa leggere la
     linea di chiusura come una cucitura d'oro invece che come una
     fessura. */
  filettoPiano(LA - 2 * FIL_IN, PR - 2 * FIL_IN, Math.max(0.0008, RAG),
               H_BASE - CERN_Y + H_COP + 0.00018, -CERN_Z, perno);
  filettoBordo(LA + 0.00012, PR + 0.00012, RAG,
               H_BASE - CERN_Y + FIL_DA, -CERN_Z, perno);

  /* ── IL CIELO: RASO CHIARO COL MARCHIO STAMPATO ──────────────────
     Qui c'era un pannello di velluto, ed era il tell più grosso del
     coperchio: in ogni astuccio delle foto — Finer Premier, Westpack
     Oslo, Astuccishop New York — il cielo è in RASO, e sul raso c'è il
     MARCHIO. È lì che un astuccio da gioielleria dice chi è: non sul
     coperchio fuori, che si vede solo prima di aprire, ma dentro, nel
     momento esatto in cui la scatola si apre e la luce entra.
     Il marchio dentro è più grande di quello fuori (un terzo del lato,
     contro il 42 % del lato corto sulla cima) ed è COMPLETO: il file è
     sempre `marchio.png`, mai una sua riduzione. */
  const ALZA_FOD = 0.0008;
  const fodera = new THREE.Mesh(
    cupola(C_LA - 0.0010, C_PR - 0.0010, ALZA_FOD, Math.min(0.0012, RIM * 0.4)),
    raso(C_LA, C_PR));
  fodera.rotation.x = Math.PI / 2;
  fodera.position.set(0, H_BASE - CERN_Y + VANO, -CERN_Z);
  fodera.receiveShadow = true;
  perno.add(fodera);

  const MD_LA = Math.min(C_LA, C_PR) * 0.46, MD_PR = MD_LA * 578 / 700;
  /* IL MARCHIO STAMPATO STA ADDOSSO AL RASO, e per starci davvero si
     appende ALLA FODERA invece che al coperchio: così eredita la sua
     giacitura e resta a distanza costante dalla superficie, invece di
     affondarci dentro dove la cupola si alza. Lo scarto è il colmo
     della cupola più mezzo decimo. */
  const marchioDentro = new THREE.Mesh(
    tieni(new THREE.PlaneGeometry(MD_LA, MD_PR)),
    tieni(new THREE.MeshPhysicalMaterial({
      /* è una STAMPA su tessuto, non una foglia su pelle: meno
         specchio, più opaca, e appena trasparente perché sotto si deve
         continuare a leggere la trama del raso */
      color: ORO, metalness: 0.28, roughness: 0.46,
      transparent: true, opacity: 0.92, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    })));
  marchioDentro.position.set(0, 0, ALZA_FOD + 0.0004);
  fodera.add(marchioDentro);

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
      /* LO STESSO DISEGNO SERVE DUE MARCHI: quello impresso a caldo
         sulla cima e quello stampato sul raso del cielo. Un'immagine,
         una texture, due materiali — e nessun rischio che i due
         marchi dello stesso astuccio siano due file diversi. */
      marchio.material.alphaMap = t; marchio.material.needsUpdate = true;
      marchioDentro.material.alphaMap = t; marchioDentro.material.needsUpdate = true;
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
     attrezzi diversi. Un astuccio da anello tiene il pezzo IN PIEDI (un
     cuscinetto con UNA fenditura), uno da orecchini lo tiene su un
     PANNELLO INCLINATO (aletta coi due tagli per i perni, cuscino coi
     due tagli in alto per i pendenti), una collana si POSA su un
     cuscino piatto e sale nelle DUE TACCHE del bordo di dietro, un
     bracciale si POSA e viene FERMATO da due elastici, un orologio si
     APPOGGIA su un GUANCIALE.
     Se l'interno non cambia mestiere, la famiglia non esiste.

     ── E TRE DI QUESTI CINQUE MESTIERI ERANO INVENTATI ──
     Quello che c'era prima non veniva dalle foto: veniva dalle schede
     dei fornitori lette senza guardare i pixel, e dove la scheda non
     diceva niente, dal buon senso. Il 21/09, con 108 foto vere sul
     disco (`riferimenti/ASTUCCI.md`), tre costruzioni su cinque sono
     risultate cose che in gioielleria non esistono:
       · DUE RULLI per l'anello. I rulli (i «ring roll») stanno nei
         PORTAGIOIE A VANI — Stackers, WOLF, il vassoio alto di Pandora
         — dove si allineano dieci anelli. Nell'astuccio singolo c'è un
         cuscinetto UNICO con una fenditura tagliata in mezzo, e
         l'anello ci sta dentro in piedi, infilato a metà fascia
         (`an-finer-majestic-con-anello.jpg`,
         `an-westpack-oslo-crema.jpg`, `an-finer-premier-fenditura.jpg`).
       · UNA CARTA FORATA per gli orecchini. La carta con i buchi è il
         cartellino del banco, non l'interno dell'astuccio: lì c'è
         un'ALETTA rialzata e inclinata con due tagli
         (`or-finer-majestic-aletta-due-tagli.jpg`,
         `or-astuccishop-velvet-aletta.jpg`).
       · UNA SELLA CON DUE ASOLE per la collana. Non compare in nessun
         fornitore: la collana sta su un cuscino PIATTO ed estraibile,
         con due TACCHE negli angoli alti dove la catena sale e gira
         dietro (`co-westpack-oslo-160x160x34.jpg`,
         `co-astuccishop-newyork-165x165.jpg`).
     Tenere una costruzione perché «l'abbiamo già misurata» è il modo
     più veloce di fare un oggetto misurato bene e sbagliato. */
  const INT = {};

  if(FAM === "anelli" && !PROVINO){
    /* UN CUSCINETTO SOLO, CON UNA FENDITURA IN MEZZO.
       La cresta resta dov'era, 22 mm: non è un numero di gusto, è la
       misura che lascia 5 mm di parete sopra il cuscino — e a 36 gradi
       una parete che sporge di h nasconde h/tan(36) di profondità, cioè
       con 10 mm si perde tutto il davanti della sede e con 5 se ne
       perdono 7. Quello che cambia è che sopra quei 22 mm adesso c'è UN
       pezzo di velluto e non due, e la fenditura è un TAGLIO dentro di
       lui invece che l'avanzo fra due cilindri.
       La fenditura è lunga 30 e larga 4,2: nelle foto non arriva mai ai
       fianchi del cuscino — resta un dito di velluto per parte, ed è
       quel dito a far vedere che il cuscino è uno solo. */
    INT.cresta = 0.022;
    INT.fenditura = FESSURA.W;
    INT.fenditura_lunga = Math.min(V_LA - 0.014, FESSURA.Lmax);
    costruisciCuscinoFesso();
  }
  /* il cuscinetto si costruisce in una funzione perché legge `INT`, e
     `INT` lo riempie la riga qui sopra: dichiararlo inline vorrebbe
     dire scrivere le stesse tre misure due volte */
  function costruisciCuscinoFesso(){
    const W = V_LA - 0.0008, D = V_PR - 0.0008;
    const H = INT.cresta - H_FONDO;
    const SM = 0.0016;                    /* il labbro, tondo come nelle foto */
    const sh = rettangoloTondo(W, D, 0.0026);
    sh.holes.push(pathStadio(0, 0, 0, INT.fenditura_lunga, INT.fenditura));
    const g = new THREE.ExtrudeGeometry(sh, {depth: H - SM, bevelEnabled: true,
      bevelThickness: SM, bevelSize: SM, bevelOffset: 0,
      bevelSegments: SEG.smusso, curveSegments: SEG.angolo});
    g.rotateX(-Math.PI / 2); g.translate(0, SM, 0);
    /* ── E POI SI GONFIA, PERCHÉ È UN CUSCINO ──────────────────────
       Un blocco di velluto a facce piane è un inserto di spugna, e si
       vede. Un cuscinetto da astuccio è imbottito: si alza fra la
       fenditura e i due fianchi, e torna giù sul filo. La bombatura
       vale zero ESATTAMENTE sul labbro della fenditura — se no la sede
       si alzerebbe sotto l'anello e tutte le quote della posa si
       sposterebbero senza dirlo — e zero sul filo esterno, dove il
       velluto è tirato e incollato. */
    {
      const pos = g.getAttribute("position");
      const D2 = D / 2, W2 = W / 2;
      const BORDO = INT.fenditura / 2 + SM;
      const ALZA = 0.0013;
      for(let i = 0; i < pos.count; i++){
        const y = pos.getY(i);
        if(y < H - 0.0030) continue;                 /* solo la faccia di sopra */
        const z = pos.getZ(i), x = pos.getX(i);
        const fz = Math.min(1, Math.max(0, (Math.abs(z) - BORDO) / Math.max(1e-6, D2 - BORDO)));
        const fx = Math.min(1, Math.abs(x) / W2);
        pos.setY(i, y + ALZA * Math.sin(Math.PI * fz) * Math.cos(Math.PI * 0.5 * fx));
      }
      pos.needsUpdate = true;
    }
    g.computeVertexNormals();
    const pad = new THREE.Mesh(uvEstruso(g, CELLA), vellutoMondo());
    pad.position.y = H_FONDO;
    pad.castShadow = !MOBILE; pad.receiveShadow = true;
    base.add(pad);
    /* IL FONDO DELLA FENDITURA È BUIO, e il buio va messo: dentro un
       taglio da 4 mm l'occlusione non arriva, e senza fondo scuro la
       fessura legge come una GIUNTA fra due pezzi invece che come una
       sede. Sta tre millimetri sotto il labbro: abbastanza da dare
       profondità, non tanto da diventare una riga nera. */
    const ff = new THREE.Mesh(
      tieni(new THREE.BoxGeometry(INT.fenditura_lunga + 0.0020, 0.0002,
                                  INT.fenditura + 0.0016)),
      tieni(new THREE.MeshBasicMaterial({color: 0x0A0806, toneMapped: false})));
    ff.position.y = INT.cresta - 0.0030;
    base.add(ff);
    INT.cuscino = {largo_mm: mm(W), lungo_mm: mm(D), alto_mm: mm(H),
                   fenditura_lunga_mm: mm(INT.fenditura_lunga),
                   fenditura_luce_mm: mm(INT.fenditura),
                   labbro_mm: mm(SM), parete_sopra_mm: mm(H_BASE - INT.cresta)};
  }

  if(FAM === "orecchini" && !PROVINO){
    /* ── IL PANNELLO INCLINATO, IN DUE MESTIERI ────────────────────
       Un astuccio da orecchini non ha una carta forata, e non ha
       nemmeno un cuscino piatto: ha un PANNELLO che si alza dal
       pavimento davanti e si corica all'indietro, a 58 gradi. Perché è
       inclinato: un orecchino appoggiato piatto si guarda dall'alto,
       uno su un pannello inclinato si guarda in FACCIA — e chi apre
       l'astuccio lo guarda da 36 gradi, non da 90.
       I due mestieri sono due pannelli diversi, e li distingue il
       PEZZO, non la famiglia:
         · PERNI (catalogo k = 2, 5, 8) → ALETTA: un pannello SOTTILE
           (2,8 mm) con il vuoto dietro, due tagli a metà salita. Il
           perno passa nel taglio, la farfallina resta dietro. È la
           scheda Finer Majestic alla lettera: «two slits on the raised
           flap to secure stud earrings».
         · PENDENTI E CERCHI → CUSCINO: un pannello SPESSO (6 mm)
           appoggiato su un corpo pieno, coi due tagli IN ALTO, e i
           pezzi che ci PENDONO sotto. Foto: Finer Premier pad
           reversibile, Westpack Oslo orecchini/pendente.
       I due tagli non sono simmetrici per decreto: si mettono dove
       stanno DAVVERO i due orecchini, che si trovano spaccando la
       nuvola dei punti del pezzo posato. */
    INT.perni = (PERNI[FAM] || new Set()).has(K_CHIESTO);
    INT.gradi = INT.perni ? ALETTA.gradi : ALETTA.gradiPad;
    INT.incl = INT.gradi * Math.PI / 180;
    /* la salita è quella che il pannello può fare senza uscire dalla
       base: lunga quanto basta a non superarne il filo di tre
       millimetri, e comunque non più della profondità utile */
    INT.pannelloL = Math.min(V_PR - 0.010,
      (H_BASE - H_FONDO - 0.0030) / Math.sin(INT.incl));
    /* ── IL PANNELLO NON PARTE DAL MURO DAVANTI ────────────────────
       La cerniera stava attaccata al filo anteriore, ed era la posizione
       che il buon senso suggerisce: il pannello si alza dal davanti e si
       corica all'indietro. Solo che l'astuccio si guarda da 36 gradi, e
       da 36 gradi una parete alta 26 nasconde 36 di profondità: l'aletta
       partiva DENTRO il cono d'ombra della parete, e nello scatto i due
       tagli — cioè l'unica cosa che dice che quello è un astuccio da
       orecchini — non c'erano. Nella foto Majestic, infatti, davanti
       all'aletta si vede un bel tratto di fondo: il pannello sta in
       MEZZO alla base, non contro il muro. Si centra la sua impronta, e
       i tagli escono dall'ombra. */
    INT.pannelloZ = Math.min(V_PR / 2 - 0.0035,
      (INT.pannelloL * Math.cos(INT.incl)) / 2);
    INT.pannelloW = V_LA - (INT.perni ? 0.0070 : 0.0030);
    INT.pannelloT = INT.perni ? ALETTA.spessa : ALETTA.spessaPad;
    INT.pannelloS = INT.pannelloL * (INT.perni ? ALETTA.s_perni : ALETTA.s_pendenti);
    /* LA TERNA DEL PANNELLO, una volta sola e in coordinate di mondo:
       `nSu` è la normale della faccia (guarda avanti e in su), `eY` la
       salita lungo il pannello, `eX` la larghezza. Tutto quello che si
       posa sul pannello — il pezzo, i tagli — si misura in questa terna
       e non in quella della scatola, se no ogni conto porta dentro un
       seno e un coseno scritti a mano. */
    INT.nSu = new THREE.Vector3(0, Math.cos(INT.incl), Math.sin(INT.incl));
    INT.eY  = new THREE.Vector3(0, Math.sin(INT.incl), -Math.cos(INT.incl));
    INT.eX  = new THREE.Vector3(1, 0, 0);
    INT.cerniera = new THREE.Vector3(0, H_FONDO, INT.pannelloZ);
    /* sotto un'aletta sottile c'è il VUOTO, e il vuoto è buio: è quello
       che fa capire che l'aletta è ALZATA e non incollata al fondo */
    if(INT.perni) pieno.material.color.multiplyScalar(0.42);
  }

  /* IL PANNELLO SI COSTRUISCE DOPO AVER MISURATO IL PEZZO: i tagli non
     vanno «in mezzo», vanno DOVE STA L'ORECCHINO. Al primo giro la
     carta era già fatta quando il pezzo arrivava, i fori erano a z = 0,
     e i due orecchini uscivano appesi al nulla dieci millimetri più in
     là. La lezione vale identica per i tagli dell'aletta. */
  function costruisciPannello(tagli){
    const W = INT.pannelloW, L = INT.pannelloL, T = INT.pannelloT;
    const BV = 0.0006;
    const sh = rettangoloTondo(W, L, 0.0022);
    for(const t of tagli)
      sh.holes.push(pathStadio(t.x, t.s - L / 2, Math.PI / 2, t.L, t.W));
    const g = new THREE.ExtrudeGeometry(sh, {depth: Math.max(0.0004, T - 2 * BV),
      bevelEnabled: true, bevelThickness: BV, bevelSize: BV, bevelOffset: 0,
      bevelSegments: Math.max(2, SEG.smusso - 1), curveSegments: SEG.angolo});
    /* dal piano del pannello al mondo: prima si porta la salita a
       partire da zero (la forma è centrata), poi si inclina di
       (58 - 90) gradi attorno a X — che è l'unica rotazione che manda
       la y della forma sulla salita e la sua estrusione sulla normale —
       e infine si appoggia sulla cerniera, davanti in basso. */
    g.translate(0, L / 2, BV);
    g.rotateX(INT.incl - Math.PI / 2);
    g.translate(INT.cerniera.x, INT.cerniera.y, INT.cerniera.z);
    g.computeVertexNormals();
    const pan = new THREE.Mesh(uvEstruso(g, CELLA), vellutoMondo());
    pan.castShadow = !MOBILE; pan.receiveShadow = true;
    base.add(pan);
    /* IL CORPO PIENO, solo per i pendenti. Un pannello sottile in un
       astuccio alto 39 legge come una linguetta sospesa; il cuscino dei
       pendenti è un pezzo pieno che arriva alla parete di dietro. Sta
       tre millimetri DIETRO la faccia, così dentro i due tagli resta un
       vuoto vero, e porta un velluto più scuro — la luce lì non arriva,
       e un taglio che dà su un velluto della stessa luce si richiude
       all'occhio. */
    if(!INT.perni){
      const GIU = 0.0030;
      const zT = INT.pannelloZ - L * Math.cos(INT.incl);
      const yT = H_FONDO + L * Math.sin(INT.incl);
      const dz = -Math.sin(INT.incl) * GIU, dy = -Math.cos(INT.incl) * GIU;
      const zB = -V_PR / 2 + 0.0010;
      const s = new THREE.Shape();
      s.moveTo(INT.pannelloZ + dz, H_FONDO + dy);
      s.lineTo(zT + dz, yT + dy);
      s.lineTo(zB, yT + dy);
      s.lineTo(zB, H_FONDO);
      s.closePath();
      const WC = V_LA - 0.0016;
      const gc = tieni(new THREE.ExtrudeGeometry(s, {depth: WC, bevelEnabled: false,
                                                     curveSegments: 4}));
      gc.rotateY(-Math.PI / 2);
      gc.translate(WC / 2, 0, 0);
      gc.computeVertexNormals();
      const corpo = new THREE.Mesh(gc, vellutoMondo(VESTE, 0.30));
      corpo.receiveShadow = true;
      base.add(corpo);
    }
    INT.pannello = {
      mestiere: INT.perni ? "aletta" : "cuscino",
      gradi: INT.gradi, largo_mm: mm(W), salita_mm: mm(L), spesso_mm: mm(T),
      cima_mm: mm(H_FONDO + L * Math.sin(INT.incl)),
      tagli: tagli.map(t => ({x_mm: mm(t.x), salita_mm: mm(t.s),
                              lungo_mm: mm(t.L), luce_mm: mm(t.W)})),
    };
  }

  if((FAM === "collane" || FAM === "bracciali") && !PROVINO){
    /* IL CUSCINO DELLA COLLANA È SOTTILE E QUELLO DEL BRACCIALE È
       SPESSO, e non è un capriccio: è la stessa regola della parete
       vista da due parti. La collana è alta 29 e il coperchio è alto
       14 — ogni millimetro di cuscino è un millimetro che manca sopra,
       quindi il cuscino è 4 e basta, come nelle foto Westpack dove il
       pad della collana è una lastra di velour sottile. Il bracciale è
       alto 7 dentro una base da 27: se il cuscino fosse sottile
       resterebbero venti millimetri di parete, e a 36 gradi una parete
       di venti nasconde ventotto di profondità — cioè un terzo del
       cuscino. Il cuscino sale finché sopra restano sei millimetri di
       filo, che è il labbro che si vede in `br-finer-duet-rigido-b`. */
    INT.padH = FAM === "collane"
      ? 0.0040
      : Math.max(0.0050, H_BASE - H_FONDO - 0.0060);
    INT.padSu = H_FONDO + INT.padH;
    if(FAM === "bracciali") costruisciCuscinoPiatto([]);
  }
  /* LE FESSURE SONO UN TAGLIO NEL CUSCINO, NON UN SEGNO SOPRA. Due
     parallelepipedi scuri appoggiati sul velluto da lontano sono due
     stecchi neri, cioè un disegno. Una fessura è un VUOTO: si apre come
     buco nel profilo del cuscino, e sotto ci si vede il fondo. */
  /* DUE ASOLE, NON DUE GRAFFI. Il primo giro tagliava due rettangoli
     da 14 x 3,4 mm con gli spigoli vivi: lunghi, stretti e squadrati,
     cioè la forma del GRAFFIO — e infatti negli scatti leggevano come
     due righe su un velluto nuovo. Un'asola da cofanetto è un'altra
     cosa, e ha tre caratteri che qui mancavano tutti e tre:
       · è a CAPI TONDI (uno stadio), perché è tagliata e poi rifinita,
         non incisa con una lama tirata;
       · è LARGA abbastanza da accogliere la catena — 5 mm di luce, non
         3,4: una fessura più stretta del pezzo che ci deve entrare non
         è un alloggiamento, è un segno;
       · ha un FILO D'OMBRA in fondo. Il buco passa da parte a parte e
         sotto c'è il fondo della base, che è dello stesso velluto e
         alla stessa luce: senza niente sotto, il taglio si richiude
         all'occhio. Un fondello scuro due decimi sotto il filo dà la
         profondità che il bordo arrotondato da solo non dà.
     Il bordo resta smussato di 1,2 mm per lato — è quello a fare il
     labbro arrotondato — e la luce si misura AL NETTO dello smusso.
     Le misure stanno FUORI da `monta` (vedi `ASOLA`, in cima al file):
     il cuscino dei bracciali si costruisce nel corpo del modulo, cioè
     PRIMA della riga in cui un `const` qui dentro sarebbe inizializzato,
     e una costante letta nella sua zona morta non è un valore mancante —
     è un errore che uccide il modulo. Pagata: l'astuccio dei bracciali
     non si montava affatto. */
  function costruisciCuscinoPiatto(fessure){
    const sh = rettangoloTondo(V_LA - 0.0008, V_PR - 0.0008, 0.0022);
    const fondelli = [];
    for(const f of fessure){
      const L = (f.L || ASOLA.L), W = (f.W || ASOLA.W);
      /* IL SEGNO DAVANTI A `f.z` NON È UN DETTAGLIO. Nella forma la y è
         il -z del mondo (lo fa il `rotateX(-90)` che viene dopo), e qui
         il taglio veniva messo a `f.z` invece che a `-f.z`: le asole si
         disegnavano specchiate rispetto al punto misurato sulla catena,
         e le quote dichiaravano il contrario di quello che si vedeva.
         Trovato il 21/09 mentre si smontavano le asole per le tacche. */
      sh.holes.push(pathStadio(f.x, -f.z, -f.ang, L, W));
      fondelli.push({x: f.x, z: f.z, ang: f.ang, L, W});
    }
    const g = new THREE.ExtrudeGeometry(sh, {depth: INT.padH, bevelEnabled: true,
      bevelThickness: ASOLA.smusso, bevelSize: ASOLA.smusso, bevelOffset: 0,
      bevelSegments: SEG.smusso, curveSegments: SEG.angolo});
    g.rotateX(-Math.PI / 2); g.translate(0, ASOLA.smusso, 0); g.computeVertexNormals();
    const pad = new THREE.Mesh(uvEstruso(g, CELLA), vellutoMondo());
    pad.position.y = H_FONDO;
    pad.castShadow = !MOBILE; pad.receiveShadow = true;
    base.add(pad);
    /* IL FILO D'OMBRA. Un fondello di velluto scurissimo appena sotto il
       filo del cuscino: non si vede come oggetto, si vede come fondo del
       taglio. Largo quanto l'asola più un millimetro, così il bordo del
       fondello non compare mai dentro la luce. */
    for(const f of fondelli){
      const gg = new THREE.PlaneGeometry(f.L + 0.0020, f.W + 0.0020);
      gg.rotateX(-Math.PI / 2); gg.rotateY(-f.ang);
      const m = new THREE.Mesh(tieni(gg), vellutoMondo(VESTE, 0.16));
      m.position.set(f.x, H_FONDO + 0.0003, f.z);
      m.receiveShadow = true;
      base.add(m);
    }
    INT.asole = fondelli.map(f => ({x_mm: mm(f.x), z_mm: mm(f.z),
      lunga_mm: mm(f.L), luce_mm: mm(f.W),
      gradi: +(f.ang * 180 / Math.PI).toFixed(1)}));
  }

  /* ── IL CUSCINO DELLA COLLANA, E PERCHÉ LA SELLA È STATA TOLTA ───
     Qui c'era una SELLA: un profilo misurato sotto l'arco della
     collana, ventiquattro fette lungo z, estruso lungo x e sgonfiato ai
     capi. Era misurata bene — colmava venti millimetri su ventotto di
     bombatura — ed era un oggetto che in gioielleria non esiste. Nessun
     fornitore, su centotto foto, mette una sella dentro un astuccio da
     collana: ci mette un CUSCINO PIATTO estraibile, e in alto due
     TACCHE dove la catena sale e gira dietro
     (`co-westpack-oslo-160x160x34.jpg`, `co-astuccishop-newyork-165x165.jpg`,
     `co-finer-majestic-clip-negli-angoli.jpg`).
     La sella nasceva da una domanda giusta — la collana di Regina è
     modellata sul busto e conserva 29,5 mm di bombatura anche stesa,
     quindi sotto di lei resta aria — ma dava una risposta da officina
     invece che da gioielleria. La risposta vera è un'altra, ed è nella
     scatola: l'astuccio da collana è ALTO abbastanza (Madrid 41) perché
     l'aria sotto l'arco non sia un difetto ma il normale gioco di una
     catena posata. Quello che non deve succedere è che il pezzo tocchi
     la fodera, e questo lo si misura (`spazio_nel_coperchio_mm`).
     DICHIARATO: la nostra catena è un ANELLO CHIUSO modellato sul
     busto, non una collana stesa a U con due capi. I due rami che
     salgono verso il fondo sono veri e vanno nelle tacche; il fermaglio
     no, perché il modello non ce l'ha. Il giorno che arriva una catena
     modellata aperta, le tacche sono già dove servono. */
  function costruisciCuscinoCollana(tacche){
    const W = V_LA - 0.0010, D = V_PR - 0.0010, SM = 0.0010;
    const sh = formaConTacche(W, D, 0.0030, tacche);
    const g = new THREE.ExtrudeGeometry(sh, {depth: Math.max(0.0008, INT.padH - SM),
      bevelEnabled: true, bevelThickness: SM, bevelSize: SM, bevelOffset: 0,
      bevelSegments: SEG.smusso, curveSegments: SEG.angolo});
    g.rotateX(-Math.PI / 2); g.translate(0, SM, 0); g.computeVertexNormals();
    const pad = new THREE.Mesh(uvEstruso(g, CELLA), vellutoMondo());
    pad.position.y = H_FONDO;
    pad.castShadow = !MOBILE; pad.receiveShadow = true;
    base.add(pad);
    /* DENTRO LA TACCA CI VUOLE IL BUIO. La tacca è un varco aperto sul
       fondo della base, che è dello stesso velluto e alla stessa luce:
       senza niente sotto, l'intaglio si richiude all'occhio e resta un
       bordo appena ondulato. Un fondello scurissimo sul pavimento,
       largo quanto la tacca più un millimetro, la fa leggere come un
       passaggio. */
    for(const t of tacche){
      const gg = new THREE.PlaneGeometry(t.larg + 0.0020, t.prof + 0.0020);
      gg.rotateX(-Math.PI / 2);
      const m = new THREE.Mesh(tieni(gg), vellutoMondo(VESTE, 0.16));
      m.position.set(t.x, H_FONDO + 0.0003, -D / 2 + t.prof / 2);
      m.receiveShadow = true;
      base.add(m);
    }
    /* LA LINGUETTA PER SFILARE IL CUSCINO. Un pad estraibile si dichiara
       da solo: è l'unica cosa che spiega come si toglie, ed è in tutte
       le foto — Finer la chiama «easy lift tab». Sta davanti, dalla
       parte opposta alle tacche. */
    const al = new THREE.Mesh(
      uvScatola(new THREE.BoxGeometry(Math.min(0.022, W * 0.16), 0.0016, 0.008), CELLA),
      vellutoMondo(VESTE, 0.86));
    al.position.set(0, INT.padSu - 0.0004, D / 2 - 0.0050);
    al.rotation.x = -0.30;
    al.castShadow = !MOBILE;
    base.add(al);
    INT.tacche = tacche.map(t => ({x_mm: mm(t.x), larga_mm: mm(t.larg),
                                   profonda_mm: mm(t.prof)}));
  }

  if(FAM === "orologi" && !PROVINO){
    /* ── UN GUANCIALE, NON UN CILINDRO ────────────────────────────
       Qui c'era un arco di cilindro tagliato al filo del fondo: un
       solido geometrico perfetto, la firma del procedurale. Nelle foto
       — `ow-astuccishop-cuscino-microfibra-11x11x8.jpg`,
       `ow-astuccishop-dubai-100x100x70-2.jpg`,
       `ow-finer-majestic-aperto-con-orologio.jpg` — dentro l'astuccio da
       orologio c'è un GUANCIALE: un sacchetto imbottito, largo quanto la
       base meno un dito, gonfio in mezzo e raccolto ai quattro angoli,
       con le pieghe della stoffa che si vedono. I fornitori italiani lo
       chiamano «cuscino morbido», e morbido è esattamente la parola: un
       cilindro non si schiaccia sotto il cinturino, un guanciale sì.
       La forma è una SUPERELLISSE bombata: l'altezza va a zero sul filo
       come una potenza alta (p = 3, cioè quasi un rettangolo in pianta,
       come un cuscino cucito) e sale in mezzo con un esponente basso
       (q = 0,52, cioè una calotta piena e non una punta). */
    INT.guancialeW = Math.min(0.080, V_LA - 0.014);
    INT.guancialeD = Math.min(0.068, V_PR - 0.026);
  }
  /* IL GUANCIALE SI COSTRUISCE DOPO AVER MISURATO L'OROLOGIO, e non si
     misura solo QUANTO È ALTO il pezzo: si misura se il pezzo è un
     ANELLO CHIUSO. Il commento del 17/09 diceva «è una cassa con un
     moncone di cinturino, e attorno a un cuscino da 51 non ci gira»:
     era una supposizione, ed era sbagliata. Misurato il 21/09
     (`_S2_diagnosi.json`): il pezzo è alto 41,1 mm, largo 20,6 sul
     cinturino, e a mezza altezza fra i due tratti c'è un VUOTO di 31
     mm. È un bracciale chiuso con la cassa in cima. Quindi il guanciale
     non gli va SOTTO — gli va DENTRO, e il cinturino gli gira attorno
     esattamente come in `ow-finer-majestic-aperto-con-orologio.jpg`.
     Le misure del guanciale le detta il vuoto: profondo quanto il buco
     meno sei millimetri di gioco, alto fino a toccare il di sotto della
     cassa, e LUNGO quanto la scatola — perché un guanciale si vede ai
     due fianchi del cinturino, ed è lì che si capisce che è morbido. */
  function costruisciCuscino(gu){
    const W = gu.L, D = gu.D, HP = gu.HP;
    const N = MOBILE ? 34 : 54;
    const g = tieni(new THREE.PlaneGeometry(W, D, N, N));
    const pos = g.getAttribute("position");
    const P = 3.0, Q = 0.52;
    for(let i = 0; i < pos.count; i++){
      const u = pos.getX(i) / (W / 2), v = pos.getY(i) / (D / 2);
      const f = Math.max(0, (1 - Math.pow(Math.abs(u), P))
                          * (1 - Math.pow(Math.abs(v), P)));
      /* ── LE PIEGHE ─────────────────────────────────────────────
         La stoffa di un guanciale non è tesa: si raccoglie verso i
         quattro angoli, dove la cucitura la tira. Quattro onde attorno
         all'asse, forti sul bordo e nulle sul colmo — se fossero forti
         anche in mezzo diventerebbero un fiore, che è un altro tell. */
      const piega = 1 + 0.055 * Math.cos(4 * Math.atan2(v, u)) * (1 - f);
      pos.setZ(i, HP * Math.pow(f, Q) * piega);
    }
    pos.needsUpdate = true;
    g.rotateX(-Math.PI / 2);
    g.computeVertexNormals();
    {
      const uv = g.getAttribute("uv");
      g.setAttribute("uv1", new THREE.BufferAttribute(uv.array.slice(), 2));
    }
    const cus = new THREE.Mesh(g, velluto(W, D));
    cus.material.side = THREE.DoubleSide;
    cus.position.set(0, H_FONDO, gu.z || 0);
    cus.castShadow = !MOBILE; cus.receiveShadow = true;
    base.add(cus);
    INT.cuscinoY = H_FONDO; INT.cuscinoSu = H_FONDO + HP;
    INT.guanciale = {dentro_il_cinturino: !!gu.dentro,
                     largo_mm: mm(W), profondo_mm: mm(D), alto_mm: mm(HP),
                     z_mm: mm(gu.z || 0), cresta_mm: mm(H_FONDO + HP),
                     parete_sopra_mm: mm(H_BASE - H_FONDO - HP)};
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
    /* ── A METÀ FASCIA, NON SEPPELLITO ──────────────────────────────
       Scendeva per il 57 % della sua altezza, e non era una scelta: era
       il coperchio. Con la fodera messa a `H_COP * 0,60` restavano 7,8
       mm di vano, e un anello alto 21 che sporge di più li tocca —
       quindi lo si infilava fin quasi a metà pietra. Adesso la fodera
       sta dove sta nelle foto (3,5 mm sotto il cielo) e il vano è 9,5:
       l'anello può stare infilato a METÀ FASCIA come in
       `an-finer-majestic-con-anello.jpg` e `an-westpack-oslo-crema.jpg`,
       cioè per poco più di due quinti, con tutta la calotta e il
       castone fuori.
       Il 44 % è quello che si VUOLE; quello che si PUÒ lo dice il
       coperchio, e fra i due vince il coperchio — un anello che tocca
       la fodera è un difetto, un anello infilato un millimetro più giù
       è una posa. Si dichiarano tutti e due. */
    const VUOLE = dd.y * 0.44;
    const MAX_SU = VANO - 0.0025;                    /* quanto può sporgere */
    const SERVE  = (INT.cresta + dd.y - H_BASE) - MAX_SU;
    const affondo = Math.min(0.016, Math.max(VUOLE, SERVE, 0.0020));
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
      infilato_voluto_pct: 44,
      comandato_dal_coperchio: SERVE > VUOLE,
      cima_sopra_il_bordo_mm: mm(b2.max.y - H_BASE),
      spazio_nel_coperchio_mm: mm(VANO - (b2.max.y - H_BASE)),
      cuscino: INT.cuscino || null,
      velluto_di_fianco_mm: mm((V_LA - INT.fenditura_lunga) / 2),
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
    const N = INT.nSu, EX = INT.eX, EY = INT.eY, C = INT.cerniera;
    /* GLI ORECCHINI DI REGINA NON STANNO IN PIEDI, e il motivo è una
       misura: tutti e nove i pezzi sono fra 27 e 40 mm di lunghezza —
       sono cerchi con una goccia, non perni. In piedi uscivano 18,5 mm
       FUORI dalla base, col coperchio che ci passava attraverso.
       Ma nemmeno coricati sul fondo, che era la correzione di prima:
       coricati si guardano dall'alto, e chi apre l'astuccio li guarda da
       36 gradi. Stanno APPOGGIATI AL PANNELLO, che è a 58 gradi: il
       piatto del pezzo contro la faccia, il LUNGO — che è la
       congiungente delle due orecchine — lungo la larghezza, così la
       coppia sta affiancata a chi guarda e non una dietro l'altra. */
    const rot = new THREE.Group(); rot.add(dentro); involucro.add(rot);
    const qa = new THREE.Quaternion().setFromUnitVectors(a.min.clone(), N);
    const lungoOra = a.max.clone().applyQuaternion(qa);
    const ang = Math.atan2(lungoOra.dot(EY), lungoOra.dot(EX));
    rot.quaternion.copy(qa).premultiply(
      new THREE.Quaternion().setFromAxisAngle(N, -ang));
    rot.updateMatrixWorld(true);
    involucro.updateMatrixWorld(true);

    /* ── LE MISURE SI PRENDONO NELLA TERNA DEL PANNELLO ─────────────
       `Box3` dà una scatola allineata agli assi del MONDO, e su un
       pezzo appoggiato a un piano inclinato quella scatola non dice
       niente di utile: né quanto è largo sul pannello, né quanto scende
       lungo la salita, né quanto stacca dalla faccia. Si campiona e si
       proietta sui tre versori del pannello — è la stessa lezione del
       `precise` sulla collana, vista da un'altra parte. */
    const q = campiona(involucro, 2000);
    let xl = Infinity, xh = -Infinity, yl = Infinity, yh = -Infinity;
    let nl = Infinity, nh = -Infinity;
    for(const p of q){
      const u = p.dot(EX), v = p.dot(EY), w = p.dot(N);
      if(u < xl) xl = u; if(u > xh) xh = u;
      if(v < yl) yl = v; if(v > yh) yh = v;
      if(w < nl) nl = w; if(w > nh) nh = w;
    }
    const mezzo = (xl + xh) / 2;
    /* ── IL TAGLIO DEVE RESTARE IN VISTA ───────────────────────────
       Un taglio esattamente grande come il pezzo che ci sta sopra è un
       taglio che non si vede: è la stessa lezione dei fori della carta,
       dove l'orecchino si copriva il proprio foro e il cartoncino
       usciva liscio. Qui non si sposta il taglio di lato — su
       un'aletta il perno passa dove passa — si fa il taglio PIÙ LUNGO
       del pezzo, di sei millimetri, così ne resta tre sopra e tre
       sotto. Sui pendenti il problema non c'è: il taglio sta in cima e
       il pezzo scende.
       E IL TAGLIO SI CALCOLA PRIMA DELLA POSA, non dopo. Al primo giro
       il pezzo si posava su `INT.pannelloS` e il taglio finiva dove la
       tagliola del bordo lo lasciava stare: quattro millimetri più in
       basso, cioè DIETRO il pezzo invece che in cima. Non dava nessun
       errore — si vedeva solo nello scatto, con gli orecchini appesi a
       niente in fondo al pannello. Un'altezza usata due volte si
       decide una volta sola. */
    const ALTO = yh - yl;
    const L_T = INT.perni
      ? Math.min(INT.pannelloL * 0.60, ALTO + 0.006)
      : 0.010;
    const sTag = Math.min(INT.pannelloL - L_T / 2 - 0.0025,
                          Math.max(L_T / 2 + 0.0025, INT.pannelloS));
    /* i perni si CENTRANO sul taglio (il gambo passa lì e la farfallina
       resta dietro); i pendenti ci si APPENDONO, quindi è la loro CIMA
       ad arrivare al taglio e il resto scende lungo la faccia */
    const off = new THREE.Vector3();
    off.addScaledVector(EX, -mezzo);
    off.addScaledVector(EY, C.dot(EY) + sTag - (INT.perni ? (yl + yh) / 2 : yh));
    off.addScaledVector(N, (C.dot(N) + INT.pannelloT + 0.0004) - nl);
    involucro.position.copy(off);
    involucro.updateMatrixWorld(true);
    volo.add(involucro);

    /* DOVE VANNO I DUE TAGLI. Si spacca la nuvola a metà lungo la
       larghezza del pannello (che adesso è l'asse della coppia) e si
       prende il baricentro di ciascuna metà: è lì che quell'orecchino
       incontra il pannello. Se la spaccatura non dà due gruppi veri —
       un pezzo singolo, un giorno — resta un taglio solo, e il pannello
       lo dice invece di inventarne due. */
    let sx = {u: 0, n: 0}, dx = {u: 0, n: 0};
    for(const p of q){
      const u = p.dot(EX);
      const g2 = u < mezzo ? sx : dx;
      g2.u += u; g2.n++;
    }
    const bordoX = INT.pannelloW / 2 - ALETTA.tagliaW / 2 - 0.0025;
    const tagli = [];
    for(const g2 of [sx, dx]){
      if(g2.n < 40) continue;
      const x = g2.u / g2.n - mezzo;
      tagli.push({x: Math.max(-bordoX, Math.min(bordoX, x)),
                  s: sTag, L: L_T, W: ALETTA.tagliaW});
    }
    costruisciPannello(tagli);
    INT.interasse = tagli.length === 2 ? Math.abs(tagli[1].x - tagli[0].x) : 0;
    const b2 = new THREE.Box3().setFromObject(involucro, true);
    dati.pezzo = {
      quanti: tagli.length, mestiere: INT.perni ? "perni sull'aletta"
                                                : "pendenti dal cuscino",
      coppia_larga_mm: mm(xh - xl), lungo_mm: mm(ALTO), spesso_mm: mm(nh - nl),
      interasse_mm: mm(INT.interasse),
      taglio_lungo_mm: mm(L_T), taglio_luce_mm: mm(ALETTA.tagliaW),
      taglio_scoperto_mm: INT.perni ? mm(L_T - ALTO) : mm(L_T / 2),
      cima_sopra_il_bordo_mm: mm(b2.max.y - H_BASE),
      spazio_nel_coperchio_mm: mm(VANO - (b2.max.y - H_BASE)),
      pannello: INT.pannello || null,
    };
  }

  /* ── COLLANA: posata sul cuscino piatto, i due rami nelle tacche ── */
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
    involucro.position.y += INT.padSu - b.min.y - 0.0008;   /* affonda nel velluto */
    /* ── LA COLLANA NON SI CENTRA: SI APPOGGIA ALLE TACCHE ──────────
       Centrata in profondità, la catena restava in mezzo al cuscino e
       le tacche del bordo di dietro erano due intagli che non
       c'entravano niente con lei. In un astuccio vero è il contrario:
       la collana si posa CONTRO il filo di dietro — è lì che sale e
       gira — e quello che avanza avanza DAVANTI, dove sta il pendente.
       Il di dietro del pezzo finisce a metà della profondità della
       tacca, così i due rami sono dentro il varco e non davanti. */
    /* il di dietro della catena cade dentro la tacca: la bocca
       dell'intaglio resta scoperta dietro di lei, e si vede che il filo
       ci ENTRA invece di fermarsi contro il bordo.
       MA NON SI SPINGE OLTRE LA PARETE. Questa collana è lunga 163,7 in
       un vano da 169: spostandola indietro di undici millimetri usciva
       DAVANTI di quasi tre, cioè entrava nel muro — e il muro, a quel
       punto, la taglia. Il posto giusto è il più indietro dei due
       vincoli, non quello voluto. */
    const zDietro = Math.min(-V_PR / 2 + TACCA.prof * 0.66,
                             V_PR / 2 - 0.0015 - (b.max.z - b.min.z));
    involucro.position.z = zDietro - b.min.z;
    involucro.updateMatrixWorld(true);
    volo.add(involucro);
    /* DOVE VANNO LE TACCHE. Questa collana è un anello CHIUSO: non ha
       due capi da infilare, e cercarli dà due posti a caso. Quello che
       ha sono due RAMI — vicino al fondo la catena passa due volte, una
       a sinistra e una a destra — ed è lì che in un astuccio vero si
       mette la tacca, perché è lì che la catena sale e gira dietro. */
    /* ── IL RAMO NON È L'INGOMBRO, E NEMMENO IL PUNTO PIÙ INDIETRO ──
       Due tentativi sbagliati, e vale la pena scriverli tutti e due.
       (1) La x MINIMA e la x MASSIMA dei punti vicini al fondo: davano
       -60 e +20, cioè la larghezza della catena, non i suoi rami; due
       intagli sbilenchi su un cuscino leggono come un errore di taglio.
       (2) Il punto PIÙ INDIETRO di ciascuna metà: su un arco largo e
       piatto il minimo cade dove capita, e le due tacche venivano a
       -20 e +7, cioè appiccicate in mezzo.
       Il ramo vero è dove la catena ATTRAVERSA una certa profondità
       mentre sale: si fissa una quota dodici millimetri davanti al suo
       punto più arretrato e si cerca, in ciascuna metà, il punto che ci
       passa più vicino. Su un arco simmetrico i due vengono simmetrici
       da soli, e stanno negli ANGOLI ALTI — che è dove le foto le
       mettono. */
    const pts = campiona(involucro, 2600)
      .map(p => p.clone().add(involucro.position));
    let zlo = Infinity;
    for(const p of pts) if(p.z < zlo) zlo = p.z;
    const quota = zlo + 0.012;
    let sx = null, dx = null;
    for(const p of pts){
      const d = Math.abs(p.z - quota);
      if(p.x < -0.006){ if(!sx || d < Math.abs(sx.z - quota)) sx = p; }
      else if(p.x > 0.006){ if(!dx || d < Math.abs(dx.z - quota)) dx = p; }
    }
    let misurate = !!(sx && dx);
    let xlo = sx ? sx.x : -V_LA * 0.22, xhi = dx ? dx.x : V_LA * 0.22;
    if(!misurate || xhi - xlo < 0.010){
      /* nessun ramo leggibile: si ripiega su due tacche simmetriche, e
         lo si DICHIARA invece di far finta che siano misurate */
      misurate = false; xlo = -V_LA * 0.22; xhi = V_LA * 0.22;
    }
    const bordoT = V_LA / 2 - TACCA.larg / 2 - 0.0060;
    const tacche = [xlo, xhi].map(x => ({
      x: Math.max(-bordoT, Math.min(bordoT, x)),
      larg: TACCA.larg, prof: TACCA.prof}));
    costruisciCuscinoCollana(tacche);
    dati.sella = null;                 /* la sella non c'è più: vedi sopra */
    dati.asole = null;
    dati.tacche = INT.tacche || null;
    dati.tacche_misurate = misurate;
    const dd = b.getSize(new THREE.Vector3());
    const b2 = new THREE.Box3().setFromObject(involucro, true);
    dati.pezzo = {
      largo_mm: mm(dd.x), lungo_mm: mm(dd.z), alto_mm: mm(dd.y),
      sopra_il_cuscino_mm: mm(b2.max.y - INT.padSu),
      cima_sopra_il_bordo_mm: mm(b2.max.y - H_BASE),
      spazio_nel_coperchio_mm: mm(VANO - (b2.max.y - H_BASE)),
      rami_nelle_tacche: misurate,
      avanza_di_lato_mm: mm((V_LA - dd.x) / 2),
      avanza_davanti_mm: mm(V_PR / 2 - (b2.max.z)),
      bombatura_mm: mm(dd.y),
    };
  }

  /* ── BRACCIALE: la catena posata, sotto due elastici ─────────────
     LA LINGUETTA DI PELLE ERA L'OGGETTO SBAGLIATO, e la scheda del
     fornitore lo diceva già: Finer Premier, astuccio da bracciale,
     «removable base pad with an easy lift tab at the top and two
     matching colour ELASTICS at either end». La linguetta è UNA, sta
     davanti e serve a SOLLEVARE il cuscino; quello che tiene fermo il
     bracciale sono DUE ELASTICI, e un elastico è tessuto dello stesso
     colore della fodera, non pelle cucita. Si vede benissimo in
     `br-westpack-oslo-lungo-219x55x23.jpg`, dove le due fasce sono di
     scamosciato come il cuscino, e in `br-finer-premier-elastici-e-
     linguetta.jpg`, dove i due tratti attraversano il pad alle
     estremità del pezzo.
     Resta vera la misura pagata al primo giro: una fascia da un
     millimetro e mezzo non è una fascia, è un filo. Nove millimetri di
     larghezza, uno e otto di spessore — il tubo del toro si allarga
     lungo il proprio asse fino a quella misura e si schiaccia in
     altezza sull'alzata del pezzo. */
  const LING = {larga: 0.0090, spessa: 0.0018};
  function elastico(x, mezzaLuce, alzata){
    const tubo = LING.spessa / 2;
    const g = new THREE.TorusGeometry(mezzaLuce, tubo, MOBILE ? 8 : 10,
                                      MOBILE ? 20 : 30, Math.PI);
    g.scale(1, alzata / mezzaLuce, LING.larga / (2 * tubo));
    g.rotateY(Math.PI / 2);
    g.computeVertexNormals();
    const uv = g.getAttribute("uv");
    g.setAttribute("uv1", new THREE.BufferAttribute(uv.array.slice(), 2));
    /* stesso tessuto del cuscino, appena più chiaro: un elastico è
       teso, e un tessuto teso riflette più di uno incollato. Appena:
       a 0,86 le due fasce uscivano più chiare del cuscino e leggevano
       come due manici di plastica. */
    const m = new THREE.Mesh(tieni(g), vellutoMondo(VESTE, 0.80));
    m.position.set(x, INT.padSu - 0.0004, 0);
    m.castShadow = !MOBILE; m.receiveShadow = true;
    base.add(m);
    INT.elastico = {larga_mm: mm(LING.larga), spessa_mm: mm(LING.spessa),
                    luce_mm: mm(2 * mezzaLuce), alzata_mm: mm(alzata)};
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
    /* gli elastici si mettono dove il pezzo è DAVVERO, alle sue due
       estremità, e la loro luce è la profondità misurata più un filo di
       gioco: un elastico più stretto del pezzo che deve tenere è un
       segno disegnato, uno più largo è una fascia che casca */
    const mezza = dd.z / 2 + 0.0026;
    const alzata = dd.y + 0.0026;
    elastico(-dd.x * 0.32, mezza, alzata);
    elastico( dd.x * 0.32, mezza, alzata);
    const b2 = new THREE.Box3().setFromObject(involucro, true);
    dati.pezzo = {
      /* DICHIARATO: questa catena è un ANELLO CHIUSO da 67 mm, non una
         catena distesa. L'astuccio lungo 220 x 52 con i due elastici —
         che è il formato vero di un bracciale a catena — le lascerebbe
         sette centimetri di vuoto per parte. Qui sta nel quadrato
         profondo dei rigidi (Oslo 90 x 90 x 41), che è la scatola che
         un anello chiuso riceve davvero. */
      posa: "anello chiuso posato piatto",
      lungo_mm: mm(dd.x), largo_mm: mm(dd.z), alto_mm: mm(dd.y),
      sopra_il_cuscino_mm: mm(b2.max.y - INT.padSu),
      cima_sopra_il_bordo_mm: mm(b2.max.y - H_BASE),
      spazio_nel_coperchio_mm: mm(VANO - (b2.max.y - H_BASE)),
      elastici_x_mm: [mm(-dd.x * 0.32), mm(dd.x * 0.32)],
      elastico: INT.elastico || null,
      avanza_di_lato_mm: mm((V_LA - dd.x) / 2),
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
    /* ── SI AVVOLGE, E LO DICE LA MISURA ───────────────────────────
       In ogni fetta orizzontale si cerca il BUCO più largo lungo z: se
       in tre fette su quattro c'è un vuoto di almeno dodici millimetri,
       il cinturino è un anello chiuso e il guanciale ci va dentro. Se
       non c'è, il pezzo è aperto e il guanciale torna a stare sotto,
       grande quanto la base. Nessuno dei due casi è scritto a mano. */
    const q = campiona(involucro, 2200);
    let ylo = Infinity, yhi = -Infinity;
    for(const p of q){ if(p.y < ylo) ylo = p.y; if(p.y > yhi) yhi = p.y; }
    const H = yhi - ylo;
    let sommaZ = 0, minAmp = Infinity, cima = ylo, quante = 0;
    for(const f of [0.25, 0.40, 0.55, 0.68]){
      const y0 = ylo + H * f, sp = H * 0.05, zz = [];
      for(const p of q) if(Math.abs(p.y - y0) < sp) zz.push(p.z);
      zz.sort((x, y) => x - y);
      let buco = 0, dove = 0;
      for(let i = 1; i < zz.length; i++)
        if(zz[i] - zz[i - 1] > buco){ buco = zz[i] - zz[i - 1]; dove = (zz[i] + zz[i - 1]) / 2; }
      if(buco > 0.012){ quante++; sommaZ += dove; cima = y0;
                        if(buco < minAmp) minAmp = buco; }
    }
    const chiuso = quante >= 3;
    involucro.position.x -= cc.x;
    involucro.position.z -= cc.z;
    if(chiuso){
      /* il cinturino POGGIA sul fondo, come nelle foto: è il guanciale a
         salire dentro di lui, non lui a salire sul guanciale */
      involucro.position.y += (H_FONDO + 0.0008) - b.min.y;
      costruisciCuscino({
        dentro: true,
        z: sommaZ / quante - cc.z,
        D: Math.max(0.010, Math.min(0.030, minAmp - 0.0035)),
        HP: Math.max(0.008, Math.min(0.032, (cima - ylo) - 0.0010)),
        L: Math.min(0.082, V_LA - 0.018),
      });
    } else {
      /* pezzo aperto: il guanciale sta sotto e il pezzo ci si appoggia */
      costruisciCuscino({
        dentro: false, z: 0, D: INT.guancialeD, L: INT.guancialeW,
        HP: Math.max(0.008, Math.min(0.030,
          (H_BASE + VANO - 0.004 - (dd.y - 0.002)) - H_FONDO)),
      });
      involucro.position.y += (INT.cuscinoSu - 0.0020) - b.min.y;
    }
    involucro.updateMatrixWorld(true);
    volo.add(involucro);
    const b2 = new THREE.Box3().setFromObject(involucro, true);
    dati.pezzo = {
      modo, cassa_mm: mm(Math.max(dd.x, dd.z)), spesso_mm: mm(dd.y),
      guanciale: INT.guanciale || null,
      cresta_del_guanciale_mm: mm(INT.cuscinoSu),
      cinturino_avvolge: chiuso,
      vuoto_nel_cinturino_mm: chiuso ? mm(minAmp) : null,
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
    /* IL FONDO DEL CARTONCINO È IL FONDO DEL PROVINO, e non è un
       dettaglio di gusto: il provino è un packshot su campo uniforme
       #E7E0D3 (`PROVINO_FONDO` in `app/dati/provini.js`), stampato su
       un cartoncino che era #EFE9DD. Due beige diversi alla stessa luce
       fanno quello che si vedeva negli scatti — un RETTANGOLO DENTRO UN
       RETTANGOLO, cioè si legge la stampa invece del pezzo. Stesso
       albedo e stessa ruvidezza, e il campo della stampa sparisce dentro
       la carta: resta solo il gioiello. Si può scavalcare da fuori
       (`opz.provinoFondo`) il giorno che il fondo dei provini cambia. */
    const FONDO_PROVINO = (opz.provinoFondo !== undefined && opz.provinoFondo !== null)
      ? +opz.provinoFondo : 0xE7E0D3;
    const carta = new THREE.Mesh(uvEstruso(g, CELLA),
      tieni(new THREE.MeshPhysicalMaterial({
        color: FONDO_PROVINO, metalness: 0, roughness: 0.94,
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
    /* la stampa prende la STESSA ruvidezza della carta: con 0,90 contro
       0,94 il campo del provino aveva un velo appena diverso, e a
       fondo uguale bastava quello a ridisegnare il rettangolo */
    const mat = tieni(new THREE.MeshPhysicalMaterial({
      color: 0xFFFFFF, metalness: 0, roughness: 0.94,
      sheen: 0.06, sheenRoughness: 0.95,
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

  /* ── IL PEZZO SI VESTE PRIMA DI POSARSI ───────────────────────────
     Due correzioni, un passaggio solo, e tutte e due sul MATERIALE —
     la geometria del .glb non si tocca mai da qui.
       · il METALLO dell'articolo, quando la famiglia porta un modello
         solo per più articoli (collane, bracciali): stesso filo,
         metallo giusto, e la variante scritta in `dati.variante`;
       · lo SPECCHIO dei tre perni, che su fondo chiaro leggeva come un
         buco (vedi `PERNO_METALLO`, sopra).
     Si clona sempre prima di toccare: nel .glb degli orecchini il
     materiale `oro` è lo STESSO oggetto per i perni e per i pendenti, e
     un pendente è una superficie curva che lo specchio se lo merita. */
  function vestiIlPezzo(pezzo){
    const ePerno = (PERNI[FAM] || new Set()).has(K_CHIESTO);
    const stessoFilo = PEZZO_K !== K_CHIESTO;
    const vuoleMetallo = METALLO !== undefined && stessoFilo;
    /* LA VARIANTE SI DICHIARA SEMPRE, anche quando il metallo non si
       sa: chi chiama con il nome dell'ASTUCCIO invece che con quello
       del BANCO (`collane` invece di `busto`) non ha una tabella che
       gli risponda, e il silenzio è proprio la cosa che si sta
       togliendo. */
    if(stessoFilo) dati.variante = {
      chiesto: "pezzo" + String(K_CHIESTO).padStart(2, "0"),
      modello: "pezzo" + String(PEZZO_K).padStart(2, "0"),
      perche: F.glb + " porta un modello solo per questa famiglia",
      metallo: METALLO === undefined ? null
             : "#" + METALLO.toString(16).padStart(6, "0")};
    if(!ePerno && !vuoleMetallo) return;
    let toccati = 0;
    pezzo.traverse(o => {
      if(!o.isMesh || !o.material || !(o.material.metalness > 0.4)) return;
      const v = tieni(o.material.clone());
      v.name = o.material.name;
      if(vuoleMetallo) v.color.setHex(METALLO);
      if(ePerno){ v.roughness = PERNO_METALLO.roughness;
                  v.metalness = PERNO_METALLO.metalness; }
      v.needsUpdate = true;
      o.material = v;
      toccati++;
    });
    if(dati.variante) dati.variante.mesh_vestite = toccati;
    if(ePerno) dati.perno = {roughness: PERNO_METALLO.roughness,
                             metalness: PERNO_METALLO.metalness,
                             mesh_toccate: toccati};
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
      /* IL BUSTO E LA RAMPA PORTANO UN PEZZO SOLO, ed è verificato
         (`_R3_glb.json`): un `pezzo00`, una `posa00`, un materiale
         metallico. Le tre collane e i due bracciali del catalogo sono
         lo stesso filo — quello che cambia è il METALLO. Prima qui si
         schiacciava `k` sull'unico modello e si scriveva un
         `dati.ripiego` che non leggeva nessuno: si apriva l'astuccio
         della Collana Punto d'argento con dentro quella d'oro, in
         silenzio. Adesso si usa lo stesso modello con il metallo
         dell'articolo, come fa il banco, e la variante si DICHIARA. */
      if(!pezzo){
        g.scene.traverse(o => { if(!pezzo && /^pezzo\d\d$/.test(o.name)) pezzo = o; });
      }
      if(!pezzo){
        dati.errore = NOME + " non trovato in " + F.glb;
        finisciIlCaricamento();
        return;
      }
      pezzo.traverse(o => { if(o.isMesh){ o.castShadow = !MOBILE; o.receiveShadow = true; } });
      vestiIlPezzo(pezzo);
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
        /* IL FILETTO E IL MARCHIO DEL CIELO SONO QUOTE, non decorazioni:
           sono le due cose che, nelle foto, separano un astuccio da
           gioielleria da una scatola foderata, e una sonda deve poterle
           leggere senza guardare un pixel. */
        filetto_mm: mm(FIL_W), filetto_rientro_mm: mm(FIL_IN),
        marchio_nel_cielo_mm: mm(MD_LA),
        sella: dati.sella, pezzo: dati.pezzo,
        /* `ripiego` non c'è più: era una riga di testo che diceva «ho
           aperto un altro pezzo» e che non leggeva nessuno. Al suo
           posto c'è `variante`, che dice QUALE modello si è usato, con
           che metallo e perché. */
        variante: dati.variante || null,
        perno: dati.perno || null,
        asole: dati.asole || null,
        tacche: dati.tacche || null,
        tacche_misurate: dati.tacche_misurate === undefined ? null : dati.tacche_misurate,
        provino: dati.provino || false,
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
