/* ═══════════════════════════════════════════════════════════════════
   app/canale3d.js — IL PONTE COL BANCO IN TRE DIMENSIONI.

   Il banco (spazio.html) resta in un iframe: pesa dieci mega di modelli
   e di three.js, e tenerlo in un contesto suo significa che quando la
   GPU tossisce tossisce LI', non nella scocca. Il prezzo di quella
   scelta e' che la scocca e il banco non si vedono le variabili: si
   parlano.
   Si parlano su UN canale solo, BroadcastChannel("regina"), perche' un
   BroadcastChannel non ha bisogno del riferimento alla finestra, non ha
   bisogno di `targetOrigin`, e regge anche una seconda scheda aperta.

   ── LO STATO DELLE COSE, OGGI (F0.1) ───────────────────────────────
   Il banco NON parla ancora il canale. Legge e scrive direttamente
   quattro chiavi di localStorage, che restano la sua verita' e che in
   questa fase non si toccano:
     · `regina.veste`      la fodera del cofanetto  (velluto|bianco|avorio|turchese)
     · `regina.ambiente`   lo sfondo della stanza   (boutique|…)
     · `regina.insieme`    se suggerire gli insiemi ("si"|"no")
     · `regina.occlusione` (sessionStorage) se l'occlusione e' stata spenta
   La scocca percio' fa DUE cose: manda il messaggio sul canale (che il
   banco ancora non ascolta, e che in F2 ascoltera') e, per i tre campi
   che il banco legge all'avvio, allinea anche la chiave di
   localStorage. E' un ponte con una gamba sola: regge, e si vede da qui
   quale gamba manca.

   ── IL CONTRATTO DEI MESSAGGI (da attuare in F2) ────────────────────
   Ogni messaggio e' un oggetto piatto:  {da, t, d}
     `da`  chi parla:  "scocca" | "banco"          (mai rispondere a se stessi)
     `t`   il tipo, identico al tipo di evento dello store
     `d`   il carico, sempre un oggetto

   DALLA SCOCCA AL BANCO
     {t:"preferenze/fodera",    d:{fodera:"turchese"}}   cambia la veste, con dissolvenza
     {t:"preferenze/ambiente",  d:{ambiente:"boutique"}}
     {t:"preferenze/insieme",   d:{insieme:true}}
     {t:"wishlist/aggiungi",    d:{id:"rg-fl-004"}}      accende il pezzo sul banco
     {t:"wishlist/togli",       d:{id:"rg-fl-004"}}
     {t:"esemplare/rimosso",    d:{id:"…"}}              toglie il pezzo dal banco
     {t:"esemplare/ripristinato",d:{id:"…"}}
     {t:"banco/mostra",         d:{id:"rg-fl-004"}}      porta la camera sul pezzo
     {t:"banco/torna",          d:{}}                    riporta la camera al banco
     {t:"banco/sospendi",       d:{}}                    la sezione non e' piu' visibile:
                                                         ferma il rAF, tieni la scena
     {t:"banco/riprendi",       d:{}}                    la sezione e' tornata visibile
     {t:"demo/reset",           d:{}}                    ricarica tutto dal seme

   DAL BANCO ALLA SCOCCA
     {t:"banco/pronto",         d:{versione:"…"}}        i modelli sono in scena
     {t:"banco/aperto",         d:{id:"rg-fl-004"}}      si e' toccato un pezzo:
                                                         la scocca spinge la scheda
     {t:"banco/chiuso",         d:{}}                    si e' tornati al banco
     {t:"preferenze/fodera",    d:{fodera:"…"}}          la veste e' stata cambiata DAL banco
     {t:"preferenze/insieme",   d:{insieme:false}}
     {t:"banco/cadenza",        d:{fps:38, ao:false}}    diagnostica, per il pannello ?diag=1

   REGOLE
   1. Chi riceve un messaggio NON lo rimanda: `da` serve a questo.
   2. Un messaggio e' un FATTO avvenuto, non un ordine da confermare:
      nessun messaggio aspetta risposta.
   3. Tutto cio' che viaggia deve essere clonabile in modo strutturato:
      niente funzioni, niente nodi del DOM, niente oggetti three.js.
   4. Il tipo e' lo stesso dell'evento dello store: cosi' il ponte non
      deve tradurre, e una traduzione in meno e' un bug in meno.
   ═══════════════════════════════════════════════════════════════════ */

import { ilCanale, iscrivi } from "app/stato.js";

/* le chiavi che il banco legge oggi all'avvio: finche' non ascolta il
   canale, la scocca gliele scrive. Si tolgono in F2, e si toglie anche
   questa tabella. */
const PONTEGGIO = {
  "preferenze/fodera":   (d) => d.fodera ? ["regina.veste", d.fodera] : null,
  "preferenze/ambiente": (d) => d.ambiente ? ["regina.ambiente", d.ambiente] : null,
  /* ATTENZIONE, due «insieme» diversi. Nel banco `regina.insieme` e' un
     interruttore ("si"|"no"): suggerire o no gli insiemi. Nei dati di
     `app/dati/seme.js` invece `preferenze.insieme` e' la FORMA dei
     suggerimenti (`?sugg=a|b|c`: riga, carte velate, rail) — un'altra
     cosa con lo stesso nome. Qui si scrive la chiave del banco SOLO
     quando l'evento porta davvero un booleano; la lettera passa sul
     canale e la legge il banco, che sa cosa farne. */
  "preferenze/insieme":  (d) => typeof d.insieme === "boolean"
                                ? ["regina.insieme", d.insieme ? "si" : "no"] : null
};

let ascoltatori = new Map();

/* si ascolta un tipo di messaggio in arrivo DAL banco */
export function quandoIlBancoDice(tipo, fn){
  if(!ascoltatori.has(tipo)) ascoltatori.set(tipo, new Set());
  ascoltatori.get(tipo).add(fn);
  return () => ascoltatori.get(tipo).delete(fn);
}

/* si parla al banco fuori da un evento di store (sospendi/riprendi) */
export function diAlBanco(t, d = {}){
  const c = ilCanale();
  try{ c && c.postMessage({da:"scocca", t, d}); }catch(_){}
}

export function apriIlPonte(){
  const c = ilCanale();
  if(c){
    /* lo store filtra gia' la propria eco; qui si smistano solo i tipi
       che il banco manda e che lo store non conosce (banco/*). */
    const prima = c.onmessage;
    c.onmessage = (ev) => {
      if(prima) prima(ev);
      const m = ev.data;
      if(!m || m.da === "scocca" || !m.t) return;
      const set = ascoltatori.get(m.t);
      if(set) for(const fn of set){ try{ fn(m.d || {}); }catch(e){ console.error(e); } }
    };
  }
  /* ogni evento di preferenza aggiorna anche la chiave che il banco
     legge davvero, oggi. */
  iscrivi((_s, ev) => {
    const mappa = PONTEGGIO[ev.tipo];
    if(!mappa) return;
    const [k, v] = mappa(ev.dato);
    if(v === undefined || v === null) return;
    try{ localStorage.setItem(k, String(v)); }catch(_){}
  });
}
