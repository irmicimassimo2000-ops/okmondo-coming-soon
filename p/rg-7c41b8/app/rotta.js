/* ═══════════════════════════════════════════════════════════════════
   app/rotta.js — LA NAVIGAZIONE, nella lingua di iOS.

   Due movimenti, e non si somigliano, perché non dicono la stessa cosa:

   · IL CAMBIO DI TAB è un INCROCIO di 200 ms con la entrante che si
     apre da 0,98 a 1. Nessuna traslazione laterale: le quattro sezioni
     sono PARI, non in fila, e farle scorrere racconterebbe un percorso
     che non esiste. Ogni tab tiene la sua pila e la sua posizione di
     scorrimento: si torna dove si era.
   · IL PUSH è una vista che ENTRA DA DESTRA in 350 ms mentre quella
     sotto scivola del -30% sotto un velo allo 0,3. Quella si' racconta
     un percorso, e infatti si torna indietro dal bordo.

   L'INDIRIZZO è la verita': `#/vetrina`, `#/vetrina/pezzo/rg-fl-004`.
   Il cambio di tab lo RIMPIAZZA (replaceState): quattro tab non sono
   quattro passi di cronologia, e chi torna indietro dal profilo deve
   uscire dall'app, non fare il giro delle sezioni. Il push invece
   AGGIUNGE (pushState), perché lì un passo c'è stato davvero.
   ═══════════════════════════════════════════════════════════════════ */

import { invia, leggi } from "app/stato.js";
import { molla, proietta, RIDOTTO } from "app/moto.js";
import { annuncia } from "app/ui/dom.js";
export { annuncia };

export const TABS = ["cofanetto", "vetrina", "perte", "profilo"];
const T_TAB = 200, T_PUSH = 350;
const BORDO = 20;        /* la fascia da cui parte il gesto di ritorno */
export const CAROSELLO_DA = 24;  /* da qui in poi comandano i caroselli */

const sezioni = {};      /* tab -> <section data-vista> */
const radici  = {};      /* tab -> lo strato radice */
const pile = {cofanetto:[], vetrina:[], perte:[], profilo:[]};
const schermi = new Map();   /* tipo -> (id, el) => void */

let tab = "cofanetto";
let occupato = false;
let daGesto = false;
let suCambio = () => {};

/* ── LA REGISTRAZIONE ──────────────────────────────────────────────── */
export function registraTab(id, sezione, radice){
  sezioni[id] = sezione; radici[id] = radice;
}
/* uno SCHERMO è cio' che un push mostra. Si registra per tipo:
   registraSchermo("pezzo", (id, el) => …) risponde a #/vetrina/pezzo/<id> */
export function registraSchermo(tipo, fn){ schermi.set(tipo, fn); }

export const tabCorrente = () => tab;
export const profondita  = (t = tab) => pile[t].length;

/* ── L'INDIRIZZO ───────────────────────────────────────────────────── */
function leggiHash(){
  let h = location.hash.replace(/^#/, "");
  if(h && h[0] !== "/") h = "/" + h;              /* i vecchi `#cofanetto` */
  const pz = h.split("/").filter(Boolean);
  const t = TABS.includes(pz[0]) ? pz[0] : "cofanetto";
  const pila = [];
  for(let i = 1; i + 1 < pz.length + 1; i += 2){
    if(pz[i] && pz[i+1] && schermi.has(pz[i])) pila.push(pz[i] + "/" + pz[i+1]);
  }
  return {tab:t, pila};
}
function scriviHash(t, pila, modo){
  const h = "#/" + [t, ...pila].join("/");
  if(location.hash === h) return;
  try{ history[modo === "push" ? "pushState" : "replaceState"](null, "", h); }catch(_){}
}

/* ── IL FUOCO E LA VOCE ────────────────────────────────────────────
   Al cambio di vista il fuoco va sul titolo della vista che è
   arrivata. Senza, chi naviga da tastiera o con VoiceOver resta col
   fuoco su un tasto della barra e non sa che la pagina è cambiata. */
function inCima(t = tab){
  const p = pile[t];
  return p.length ? p[p.length-1].el : radici[t];
}
function prendiIlFuoco(el){
  const h = el && el.querySelector("h1, [data-titolo]");
  if(!h) return;
  if(!h.hasAttribute("tabindex")) h.setAttribute("tabindex", "-1");
  try{ h.focus({preventScroll:true}); }catch(_){ h.focus(); }
}

/* ══ IL CAMBIO DI TAB ═══════════════════════════════════════════════ */
function incrocia(da, a){
  const vA = sezioni[a], vD = sezioni[da];
  vA.hidden = false;
  /* un fotogramma per far esistere la vista, uno perché il browser la
     misuri: senza, la classe arriva insieme al display e la transizione
     non parte mai. */
  requestAnimationFrame(() => requestAnimationFrame(() => {
    vA.classList.add("qui");
    if(vD && vD !== vA) vD.classList.remove("qui");
  }));
  if(vD && vD !== vA) setTimeout(() => { if(!vD.classList.contains("qui")) vD.hidden = true; }, T_TAB + 30);
}

export function vaiA(nuovo, opz = {}){
  if(!TABS.includes(nuovo)) return;
  if(nuovo === tab){
    /* tap sul tab ATTIVO: si torna alla radice di quel tab. È la
       scorciatoia di iOS, e chi la conosce la cerca. */
    if(pile[tab].length) history.go(-pile[tab].length);
    return;
  }
  const da = tab; tab = nuovo;
  incrocia(da, nuovo);
  if(!opz.daIndirizzo) scriviHash(tab, pile[tab].map(x => x.rotta), "replace");
  invia("nav/tab", {tab}, {locale:true});
  suCambio(tab);
  prendiIlFuoco(inCima());
}

/* ══ IL PUSH ════════════════════════════════════════════════════════ */
function costruisciSchermo(rotta){
  const [tipo, id] = rotta.split("/");
  const fn = schermi.get(tipo);
  const el = document.createElement("div");
  el.className = "strato spinto";
  el.dataset.rotta = rotta;
  if(fn) fn(id, el);
  return el;
}

function posiziona(sopra, sotto, x, W){
  const p = Math.max(0, Math.min(1, x / W));
  sopra.style.transform = "translateX(" + (p*100).toFixed(3) + "%)";
  if(sotto){
    sotto.style.transform = "translateX(" + (-30*(1-p)).toFixed(3) + "%)";
    sotto.style.setProperty("--velo", (0.3*(1-p)).toFixed(3));
  }
}
/* il velo vive in un `::after`, e un pseudo-elemento non si tocca da JS:
   si tocca la variabile che lo comanda. */
function vestiVelo(el){ el && el.classList.add("sotto"); }

export async function spingi(rotta, opz = {}){
  if(occupato || !schermi.has(rotta.split("/")[0])) return;
  occupato = true;
  const sotto = inCima();
  const el = costruisciSchermo(rotta);
  sezioni[tab].appendChild(el);
  vestiVelo(sotto);
  pile[tab].push({rotta, el});

  if(!opz.daIndirizzo) scriviHash(tab, pile[tab].map(x => x.rotta), "push");
  invia("nav/push", {tab, rotta}, {locale:true});

  if(RIDOTTO.matches){
    el.style.transition = "opacity 200ms linear";
    el.style.opacity = "0"; el.style.transform = "none";
    requestAnimationFrame(() => requestAnimationFrame(() => { el.style.opacity = "1"; }));
    await new Promise(r => setTimeout(r, 220));
    el.style.transition = "";
  } else {
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    el.classList.add("anima"); if(sotto) sotto.classList.add("anima");
    posiziona(el, sotto, 0, 1);
    await new Promise(r => setTimeout(r, T_PUSH + 30));
    el.classList.remove("anima"); if(sotto) sotto.classList.remove("anima");
  }
  occupato = false;
  prendiIlFuoco(el);
}

/* il ritorno: `torna()` chiede alla cronologia, la cronologia chiama
   popstate, popstate chiama `stacca()`. Una via sola, così il tasto
   indietro del telefono e il gesto dal bordo finiscono nello stesso
   posto. */
export function torna(){ history.back(); }

async function stacca(opz = {}){
  const p = pile[tab];
  if(!p.length){ occupato = false; return; }
  occupato = true;
  const {el} = p[p.length - 1];
  const sotto = p.length > 1 ? p[p.length-2].el : radici[tab];

  if(!opz.gia && !RIDOTTO.matches){
    const W = el.getBoundingClientRect().width || 1;
    el.classList.add("anima"); if(sotto) sotto.classList.add("anima");
    posiziona(el, sotto, W, W);
    await new Promise(r => setTimeout(r, T_PUSH + 30));
  } else if(!opz.gia){
    el.style.transition = "opacity 200ms linear"; el.style.opacity = "0";
    await new Promise(r => setTimeout(r, 220));
  }
  p.pop();
  el.remove();
  if(sotto){
    sotto.classList.remove("anima", "sotto");
    sotto.style.transform = ""; sotto.style.removeProperty("--velo");
  }
  invia("nav/pop", {tab}, {locale:true});
  occupato = false;
  prendiIlFuoco(inCima());
}

/* ══ IL GESTO DAL BORDO ═════════════════════════════════════════════
   Parte solo entro 20 px dal bordo sinistro; i caroselli partono da 24
   in poi (vedi CAROSELLO_DA). Segue il dito 1:1 — non è una soglia che
   fa partire un'animazione, è la vista ATTACCATA al dito — e decide
   con la proiezione: non «dove sei», ma «dove stavi andando». */
function armaIlGesto(dentro){
  let attivo = false, x0 = 0, W = 1, sopra = null, sotto = null;
  let ultimoX = 0, ultimoT = 0, vel = 0, id = -1;

  dentro.addEventListener("pointerdown", (e) => {
    if(occupato || !e.isPrimary) return;
    if(!pile[tab].length) return;
    const r = dentro.getBoundingClientRect();
    if(e.clientX - r.left > BORDO) return;
    attivo = true; id = e.pointerId;
    x0 = e.clientX; W = r.width || 1;
    ultimoX = e.clientX; ultimoT = e.timeStamp || performance.now(); vel = 0;
    const p = pile[tab];
    sopra = p[p.length-1].el;
    sotto = p.length > 1 ? p[p.length-2].el : radici[tab];
    sopra.classList.remove("anima"); if(sotto) sotto.classList.remove("anima");
    /* il dito è nostro: i caroselli e lo scroller non lo vedono più */
    try{ dentro.setPointerCapture(id); }catch(_){}
  }, {passive:true});

  dentro.addEventListener("pointermove", (e) => {
    if(!attivo || e.pointerId !== id) return;
    const t = e.timeStamp || performance.now();
    const dt = t - ultimoT;
    if(dt > 0) vel = (e.clientX - ultimoX) / dt * 1000;   /* px/s */
    ultimoX = e.clientX; ultimoT = t;
    posiziona(sopra, sotto, Math.max(0, e.clientX - x0), W);
  }, {passive:true});

  function chiudi(e){
    if(!attivo || (e && e.pointerId !== id)) return;
    attivo = false;
    try{ dentro.releasePointerCapture(id); }catch(_){}
    const x = Math.max(0, ultimoX - x0);
    const proiettato = x + proietta(vel);
    const va = proiettato > W/2;          /* oltre metà, o lanciato oltre metà */
    const elS = sopra, elG = sotto;
    occupato = true;
    molla(x, va ? W : 0, {
      v0: vel,
      passo: (v) => posiziona(elS, elG, v, W),
      fine: () => {
        occupato = false;
        if(va){
          /* il disegno è già a destinazione: la cronologia deve solo
             mettersi in pari, e popstate non deve rianimare. */
          daGesto = true;
          stacca({gia:true}).then(() => { history.back(); });
        } else {
          elS.style.transform = "";
          if(elG){ elG.style.transform = ""; elG.style.removeProperty("--velo"); }
          posiziona(elS, elG, 0, W);
        }
      }
    });
  }
  dentro.addEventListener("pointerup", chiudi, {passive:true});
  dentro.addEventListener("pointercancel", chiudi, {passive:true});
}

/* ══ L'AVVIO E LA CRONOLOGIA ════════════════════════════════════════ */
export function avviaRotta(opz = {}){
  suCambio = opz.suCambio || (() => {});
  const dentro = document.getElementById("dentro");
  armaIlGesto(dentro);

  addEventListener("popstate", async () => {
    if(daGesto){ daGesto = false; return; }   /* il gesto ha già fatto tutto */
    const m = leggiHash();
    if(m.tab !== tab){
      const da = tab; tab = m.tab;
      incrocia(da, tab);
      invia("nav/tab", {tab}, {locale:true});
      suCambio(tab);
      prendiIlFuoco(inCima());
      return;
    }
    while(pile[tab].length > m.pila.length) await stacca();
    while(pile[tab].length < m.pila.length)
      await spingi(m.pila[pile[tab].length], {daIndirizzo:true});
  });

  /* l'indirizzo di partenza */
  const m = leggiHash();
  tab = m.tab;
  sezioni[tab].hidden = false;
  sezioni[tab].classList.add("qui");
  for(const t of TABS) if(t !== tab){ sezioni[t].hidden = true; sezioni[t].classList.remove("qui"); }
  scriviHash(tab, [], "replace");
  invia("nav/tab", {tab}, {locale:true});
  suCambio(tab);
  /* le pile non si ricostruiscono all'avvio: aprire l'app dentro una
     scheda di prodotto senza mai aver visto l'elenco è un vicolo cieco
     con un tasto «indietro» che non torna da nessuna parte. Si apre la
     radice del tab, e l'eventuale pila dell'indirizzo si spinge dopo. */
  if(m.pila.length) setTimeout(() => {
    (async () => { for(const r of m.pila) await spingi(r, {daIndirizzo:true}); })();
  }, 60);
  return tab;
}
