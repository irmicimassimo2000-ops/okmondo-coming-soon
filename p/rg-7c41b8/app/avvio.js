/* ═══════════════════════════════════════════════════════════════════
   app/avvio.js — DOVE SI ACCENDE TUTTO.
   Il telaio (index.html) porta la barra, che è approvata e non si
   tocca, e la scocca vuota. Qui dentro si prendono i dati, si monta lo
   stato, si montano le quattro viste, si apre il ponte col banco in tre
   dimensioni e si da' la parola al navigatore.
   Una regola sola: il telaio non sa nulla delle viste, e le viste non
   sanno nulla del telaio. Si parlano attraverso due funzioni —
   `window.__barra` (che il telaio espone) e `window.__vai` (che questo
   modulo installa) — e sono due apposta: se diventano dieci, la barra
   approvata non è più separabile dal resto.
   ═══════════════════════════════════════════════════════════════════ */

import * as stato from "app/stato.js";
import { avviaRotta, registraTab, vaiA, TABS } from "app/rotta.js";
import { apriIlPonte, diAlBanco, quandoIlBancoDice } from "app/canale3d.js";
import { semeRipiego, catalogoRipiego, collezioniRipiego } from "app/ripiego.js";
import { innestaSeme, innestaCatalogo, innestaCollezioni } from "app/innesto.js";

import { montaIngresso, fotografia, riga } from "app/viste/ingresso.js";

import { monta as montaCofanetto } from "app/viste/cofanetto.js";
import { monta as montaVetrina } from "app/viste/vetrina.js";
import { monta as montaPerte }   from "app/viste/perte.js";
import { monta as montaProfilo } from "app/viste/profilo.js";
/* LE AZIONI DELLA CARTA NON SONO UNA SEZIONE. Non hanno un tab, non
   hanno una pila e non stanno in `VISTE`: ascoltano il canale e aprono
   FOGLI sopra qualunque schermata ci fosse, più la pagina pubblica
   `#/c/<codice>` che è quello che vede chi ha in mano solo un link.
   Montarle come quinta voce di `VISTE` avrebbe voluto dire dare loro
   una sezione vuota nel telaio e una voce nella barra approvata: due
   bugie per far tornare una tabella. */
import { monta as montaAzioni } from "app/viste/azioni.js";

/* ── L'INDIRIZZO DI PARTENZA, letto PRIMA di tutto ─────────────────
   `avviaRotta()` lo riscrive con `#/cofanetto` appena parte, e a quel
   punto nessuno sa più da dove si è entrati. Si legge qui, al
   caricamento del modulo, come fa già `viste/azioni.js` per la sua
   pagina pubblica. */
const INDIRIZZO_0 = location.hash;

/* IL CODICE DI UN ESEMPLARE, non di una persona. Sono due cose diverse
   e si scrivono diverse: `RJ-7QK-D4M-XA3` (nove caratteri a gruppi di
   tre) è il PEZZO, `RJ 00042` (RJ più cinque cifre) è la TESSERA.
   Solo il primo apre la pagina del regalo sopra la porta; il secondo
   resta della porta, che lo sa già leggere da `?c=`. */
const CODICE_ESEMPLARE = /^#\/c\/(RJ-[A-Za-z0-9]{3}-[A-Za-z0-9]{3}-[A-Za-z0-9]{3})$/;
const conUnRegaloInMano = (h) => {
  let x = h;
  try{ x = decodeURIComponent(h); }catch(_){ /* un frammento malformato non è un codice */ }
  return CODICE_ESEMPLARE.test(x);
};

/* LA TESSERA DI CHI NON NE HA ANCORA UNA. Chi riceve un regalo può non
   essere mai entrato in negozio: il numero glielo da' il negozio, e qui
   lo si deriva dal seme (l'ultimo numero più uno). Se il seme non porta
   un numero, `RJ 00043` è INVENTATO e dichiarato — come l'indirizzo e
   gli orari in `dati/negozio.js`. */
function tesseraNuova(seme){
  const n = ((seme && seme.cliente && seme.cliente.tessera_numero) | 0);
  return "RJ " + String(n > 0 ? n + 1 : 43).padStart(5, "0");
}

/* IL COFANETTO È UNA VISTA COME LE ALTRE, con una differenza sola: non
   svuota il proprio strato. Lì dentro ci sono il velo e la cornice del
   banco in tre dimensioni, e una vista che chiamasse `schermo()` li
   butterebbe via — la sezione resterebbe bianca con una barra di
   navigazione sopra. Perciò `viste/cofanetto.js` APPENDE (la capsula
   «Elenco») e per il resto vive nel foglio. */
const VISTE = {cofanetto:montaCofanetto, vetrina:montaVetrina,
               perte:montaPerte, profilo:montaProfilo};

/* ── I DATI ────────────────────────────────────────────────────────
   Li scrive un altro esecutore in `app/dati/`. Finché non ci sono,
   l'app gira sul seme di ripiego e lo DICE (il profilo mostra quale
   seme sta usando): un telaio che non parte perché manca il catalogo
   non si può collaudare, e un collaudo rimandato è un collaudo che
   non si fa. */
async function prendiIDati(V){
  /* si prova a importarli e basta. La prima versione sondava con una
     HEAD prima di importare: una richiesta in più per ogni avvio, e
     Chrome la segnava comunque come fallita nel pannello di rete anche
     quando andava a buon fine — rumore che costa tempo a chi apre gli
     strumenti per cercare un difetto vero. Un `import()` in try/catch
     dice la stessa cosa con una richiesta sola. */
  const q = new URLSearchParams(location.search).get("seed");
  const [S, C, K, P] = await Promise.all([
    import("app/dati/seme.js").catch(e => (console.warn("seme.js:", e.message), null)),
    import("app/dati/catalogo.js").catch(e => (console.warn("catalogo.js:", e.message), null)),
    import("app/dati/collezioni.js").catch(e => (console.warn("collezioni.js:", e.message), null)),
    /* I PROVINI sono un DI PIÙ, e si comportano da di più: se il modulo
       non c'è l'app parte lo stesso e le card restano come prima. Una
       mappa di segnaposto non è una dipendenza dell'avvio. */
    import("app/dati/provini.js").catch(() => null)
  ]);
  /* i dati veri passano dall'INNESTO: la loro forma non è quella
     dichiarata, e il posto dove le due forme si incontrano è uno solo
     (app/innesto.js). Se l'innesto non riconosce niente si torna al
     ripiego invece di montare mezza app. */
  const catalogo = innestaCatalogo(C, P) || catalogoRipiego;
  const collezioni = innestaCollezioni(K) || collezioniRipiego;
  /* `semi` (una mappa id->seme) è l'estensione facoltativa che rende
     utile `?seed=`; se non c'è, il seme è uno solo. */
  const scelto = (q && S && S.semi && S.semi[q]) ? {seme:S.semi[q]} : S;
  const seme = innestaSeme(scelto, catalogo) || semeRipiego;
  return {seme, catalogo, collezioni};
}

/* ── IL BANCO IN TRE DIMENSIONI ────────────────────────────────────
   Resta in un iframe, e si monta al PRIMO ingresso: pesa dieci mega di
   modelli e chi apre l'app sulla vetrina non deve pagarli. Una volta
   montato non si smonta più — ricostruire un contesto WebGL costa più
   che tenerlo — ma quando la sezione non è in vista si chiede al banco
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
     (`pezzo/<id>`), e il navigatore li cerca già quando legge
     l'indirizzo di partenza — che avviene dopo, in `avviaRotta`. */
  for(const t of TABS){
    const sez = document.querySelector('[data-vista="' + t + '"]');
    const radice = sez.querySelector(".strato");
    registraTab(t, sez, radice);
    if(VISTE[t]) VISTE[t](radice, store);
  }

  /* LE AZIONI DELLA CARTA, e con loro la rotta pubblica `#/c/<codice>`.
     Si montano DOPO le quattro sezioni e PRIMA del navigatore: la vista
     legge l'indirizzo di partenza all'importazione (`avviaRotta` lo
     riscrive di lì a poco) e rimette il frammento al suo posto da
     sola, come fa `viste/vetrina.js` per `#/l/<token>`. */
  montaAzioni(store);

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
     la scheda: il ponte è già pronto, manca solo che il banco parli
     (F2). */
  quandoIlBancoDice("banco/aperto", (d) => {
    if(d && d.id) location.hash = "#/cofanetto/pezzo/" + d.id;
  });

  /* UNA MANIGLIA SOLA, e dichiarata. Serve alle sonde di collaudo e al
     banco di prova; è l'unico globale che l'app espone oltre alle due
     funzioni della barra, ed è di sola lettura per chi la usa bene. */
  window.__regina = {
    leggi: stato.leggi, invia: stato.invia, iscrivi: stato.iscrivi,
    seme: dati.seme, catalogo: dati.catalogo, versione: V
  };

  /* ── F1.3 · LA FOTOGRAFIA DELL'APERTURA ──────────────────────────
     Prima di qualunque cosa cambi, si confronta com'e' l'app ADESSO con
     com'era l'ultima volta che è stata aperta, e si tiene da parte la
     riga da dire (se c'è). La riga la mostra il cofanetto; qui si fa
     solo il conto, perché qui ci sono catalogo e collezioni e nello
     store no. Poi si riscrive la fotografia: la prossima apertura si
     confronta con questa. */
  {
    const prima = stato.leggi().istantanea;
    const detto = riga(store, prima);
    stato.invia("apertura/registra", {
      quando: new Date().toISOString(),
      istantanea: fotografia(store),
      ritorno: detto
    }, {locale:true});
  }

  /* ── F1 · LA PORTA ───────────────────────────────────────────────
     Si monta DOPO il navigatore, e per un motivo preciso: `avviaRotta`
     riscrive l'indirizzo con `#/cofanetto` all'avvio, e un ingresso
     montato prima se lo vedrebbe portare via. `?salta=1` la salta senza
     segnarla come fatta — serve al collaudo delle altre fasi, non alla
     persona; `?reset=1` la riporta (lo fa già `stato.avvia`, che
     cancella la chiave salvata). */
  const salta = new URLSearchParams(location.search).get("salta") === "1";
  if(!salta && !stato.leggi().ingresso.fatto){
    /* ── IL REGALO VINCE SULLA PORTA ──────────────────────────────
       Chi riceve un regalo non ha mai aperto l'app: il link che gli è
       arrivato è `#/c/<codice del pezzo>`, e fin qui quella pagina
       stava SOTTO la porta (z 38 contro 60) — si vedeva S0, cioè un
       campo che chiede cinque cifre che quella persona non ha. Un
       regalo che chiede le credenziali non è un regalo.
       Da qui la porta ASPETTA: non si monta affatto finché la pagina
       del regalo è aperta, e si monta dopo — a S2 se il pezzo è stato
       accettato (le due domande, e il cofanetto è suo), a S0 se invece
       si è usciti da quella pagina in un altro modo. */
    if(conUnRegaloInMano(INDIRIZZO_0)) portaCheAspetta(store);
    else montaIngresso(store);
  }

  document.documentElement.dataset.pronto = "1";
  return store;
}

/* ── LA PORTA CHE ASPETTA ──────────────────────────────────────────
   Un solo montaggio, e due modi di arrivarci:
   · `store.portaDopoRegalo()` — lo chiama `viste/azioni.js` quando si
     tocca «Metti nel cofanetto» e l'ingresso non è ancora fatto. Prima
     si scrive la tessera, poi si apre a S2: le due domande servono
     all'incisione, e a quel punto il pezzo è già suo.
   · l'indirizzo che lascia la pagina del regalo per qualunque altro
     motivo (un codice sconosciuto, la scheda di un pezzo già di
     qualcuno, un indietro). Lì la porta torna a essere la porta, da
     S0: senza questo ramo si resterebbe dentro l'app senza averla mai
     aperta.
   Il montaggio è uno solo perché `montaIngresso` crea uno strato e
   registra due ascoltatori: chiamarlo due volte vorrebbe dire due
   porte, una sopra l'altra, che si contendono l'indirizzo. */
function portaCheAspetta(store){
  let aperta = false;
  function apri(schermata){
    if(aperta) return null;
    aperta = true;
    removeEventListener("hashchange", guarda);
    store.portaDopoRegalo = null;
    /* si SOSTITUISCE, non si spinge: la pagina del regalo non è un
       passo indietro a cui tornare — il pezzo è già stato messo nel
       cofanetto, e tornarci mostrerebbe una regia da rifare. */
    if(schermata) try{
      history.replaceState(null, "", "#/ingresso/" + schermata);
    }catch(_){ /* niente */ }
    return montaIngresso(store);
  }
  store.portaDopoRegalo = () => {
    stato.invia("ingresso/codice", {codice: tesseraNuova(store.seme)});
    return apri("s2");
  };
  function guarda(){ if(!conUnRegaloInMano(location.hash)) apri(null); }
  addEventListener("hashchange", guarda);
}
