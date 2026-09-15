/* ═══════════════════════════════════════════════════════════════════
   app/avvio.js — DOVE SI ACCENDE TUTTO.
   Il telaio (index.html) porta la barra, che e' approvata e non si
   tocca, e la scocca vuota. Qui dentro si prendono i dati, si monta lo
   stato, si montano le quattro viste, si apre il ponte col banco in tre
   dimensioni e si da' la parola al navigatore.
   Una regola sola: il telaio non sa nulla delle viste, e le viste non
   sanno nulla del telaio. Si parlano attraverso due funzioni —
   `window.__barra` (che il telaio espone) e `window.__vai` (che questo
   modulo installa) — e sono due apposta: se diventano dieci, la barra
   approvata non e' piu' separabile dal resto.
   ═══════════════════════════════════════════════════════════════════ */

import * as stato from "app/stato.js";
import { avviaRotta, registraTab, vaiA, TABS } from "app/rotta.js";
import { apriIlPonte, diAlBanco, quandoIlBancoDice } from "app/canale3d.js";
import { semeRipiego, catalogoRipiego, collezioniRipiego } from "app/ripiego.js";
import { innestaSeme, innestaCatalogo, innestaCollezioni } from "app/innesto.js";

import { monta as montaVetrina } from "app/viste/vetrina.js";
import { monta as montaPerte }   from "app/viste/perte.js";
import { monta as montaProfilo } from "app/viste/profilo.js";

const VISTE = {vetrina:montaVetrina, perte:montaPerte, profilo:montaProfilo};

/* ── I DATI ────────────────────────────────────────────────────────
   Li scrive un altro esecutore in `app/dati/`. Finche' non ci sono,
   l'app gira sul seme di ripiego e lo DICE (il profilo mostra quale
   seme sta usando): un telaio che non parte perche' manca il catalogo
   non si puo' collaudare, e un collaudo rimandato e' un collaudo che
   non si fa. */
async function prendiIDati(V){
  /* si prova a importarli e basta. La prima versione sondava con una
     HEAD prima di importare: una richiesta in piu' per ogni avvio, e
     Chrome la segnava comunque come fallita nel pannello di rete anche
     quando andava a buon fine — rumore che costa tempo a chi apre gli
     strumenti per cercare un difetto vero. Un `import()` in try/catch
     dice la stessa cosa con una richiesta sola. */
  const q = new URLSearchParams(location.search).get("seed");
  const [S, C, K] = await Promise.all([
    import("app/dati/seme.js").catch(e => (console.warn("seme.js:", e.message), null)),
    import("app/dati/catalogo.js").catch(e => (console.warn("catalogo.js:", e.message), null)),
    import("app/dati/collezioni.js").catch(e => (console.warn("collezioni.js:", e.message), null))
  ]);
  /* i dati veri passano dall'INNESTO: la loro forma non e' quella
     dichiarata, e il posto dove le due forme si incontrano e' uno solo
     (app/innesto.js). Se l'innesto non riconosce niente si torna al
     ripiego invece di montare mezza app. */
  const catalogo = innestaCatalogo(C) || catalogoRipiego;
  const collezioni = innestaCollezioni(K) || collezioniRipiego;
  /* `semi` (una mappa id->seme) e' l'estensione facoltativa che rende
     utile `?seed=`; se non c'e', il seme e' uno solo. */
  const scelto = (q && S && S.semi && S.semi[q]) ? {seme:S.semi[q]} : S;
  const seme = innestaSeme(scelto, catalogo) || semeRipiego;
  return {seme, catalogo, collezioni};
}

/* ── IL BANCO IN TRE DIMENSIONI ────────────────────────────────────
   Resta in un iframe, e si monta al PRIMO ingresso: pesa dieci mega di
   modelli e chi apre l'app sulla vetrina non deve pagarli. Una volta
   montato non si smonta piu' — ricostruire un contesto WebGL costa piu'
   che tenerlo — ma quando la sezione non e' in vista si chiede al banco
   di fermare il proprio rAF. */
function faIlBanco(V){
  let telaio = null;
  const sez = document.querySelector('[data-vista="cofanetto"] .strato');
  const velo = document.getElementById("velo");
  return function vaiAlBanco(dentro){
    if(!dentro){ if(telaio) diAlBanco("banco/sospendi"); return; }
    if(telaio){ diAlBanco("banco/riprendi"); return; }
    telaio = document.createElement("iframe");
    telaio.id = "banco";
    telaio.src = "spazio.html?v=" + V;
    telaio.title = "Il cofanetto";
    telaio.allow = "fullscreen";
    telaio.addEventListener("load", () => { if(velo) velo.hidden = true; });
    sez.appendChild(telaio);
  };
}

/* ── L'AVVIO ───────────────────────────────────────────────────────── */
export async function avviaApp(V){
  const dati = await prendiIDati(V);
  stato.avvia(dati.seme);
  apriIlPonte();

  const store = {
    leggi: stato.leggi,
    invia: stato.invia,
    iscrivi: stato.iscrivi,
    soldi: stato.soldi,
    seme: dati.seme,
    catalogo: dati.catalogo,
    collezioni: dati.collezioni
  };

  /* prima si registrano le sezioni, poi si montano le viste: il
     montaggio di una vista registra anche gli SCHERMI del push
     (`pezzo/<id>`), e il navigatore li cerca gia' quando legge
     l'indirizzo di partenza — che avviene dopo, in `avviaRotta`. */
  for(const t of TABS){
    const sez = document.querySelector('[data-vista="' + t + '"]');
    const radice = sez.querySelector(".strato");
    registraTab(t, sez, radice);
    if(VISTE[t]) VISTE[t](radice, store);
  }

  const vaiAlBanco = faIlBanco(V);

  avviaRotta({suCambio: (tab) => {
    document.body.dataset.sez = tab;
    const m = document.querySelector('meta[name=theme-color]');
    if(m) m.setAttribute("content",
      document.body.dataset.nav === "c" && tab === "cofanetto" ? "#FAF8F5" : "#14110E");
    if(window.__barra) window.__barra.segna(tab);
    vaiAlBanco(tab === "cofanetto");
  }});

  /* il telaio chiama questa quando si tocca una voce della barra */
  window.__vai = (id) => vaiA(id);

  /* e quando il banco dira' «hanno aperto un pezzo», la scocca spingera'
     la scheda: il ponte e' gia' pronto, manca solo che il banco parli
     (F2). */
  quandoIlBancoDice("banco/aperto", (d) => {
    if(d && d.id) location.hash = "#/cofanetto/pezzo/" + d.id;
  });

  /* UNA MANIGLIA SOLA, e dichiarata. Serve alle sonde di collaudo e al
     banco di prova; e' l'unico globale che l'app espone oltre alle due
     funzioni della barra, ed e' di sola lettura per chi la usa bene. */
  window.__regina = {
    leggi: stato.leggi, invia: stato.invia, iscrivi: stato.iscrivi,
    seme: dati.seme, catalogo: dati.catalogo, versione: V
  };

  document.documentElement.dataset.pronto = "1";
  return store;
}
