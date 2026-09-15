/* ═══════════════════════════════════════════════════════════════════
   app/canale3d.js — IL PONTE COL BANCO IN TRE DIMENSIONI.

   Il banco (spazio.html) resta in un iframe: pesa dieci mega di modelli
   e di three.js, e tenerlo in un contesto suo significa che quando la
   GPU tossisce tossisce LÌ, non nella scocca. Il prezzo di quella
   scelta è che la scocca e il banco non si vedono le variabili: si
   parlano.
   Si parlano su UN canale solo, BroadcastChannel("regina"), perché un
   BroadcastChannel non ha bisogno del riferimento alla finestra, non ha
   bisogno di `targetOrigin`, e regge anche una seconda scheda aperta.

   ── LO STATO DELLE COSE, OGGI (F0.1) ───────────────────────────────
   Il banco NON parla ancora il canale. Legge e scrive direttamente
   quattro chiavi di localStorage, che restano la sua verita' e che in
   questa fase non si toccano:
     · `regina.veste`      la fodera del cofanetto  (velluto|bianco|avorio|turchese)
     · `regina.ambiente`   lo sfondo della stanza   (boutique|…)
     · `regina.insieme`    se suggerire gli insiemi ("si"|"no")
     · `regina.occlusione` (sessionStorage) se l'occlusione è stata spenta
   La scocca perciò fa DUE cose: manda il messaggio sul canale (che il
   banco ancora non ascolta, e che in F2 ascoltera') e, per i tre campi
   che il banco legge all'avvio, allinea anche la chiave di
   localStorage. È un ponte con una gamba sola: regge, e si vede da qui
   quale gamba manca.

   ── IL CONTRATTO DEI MESSAGGI (da attuare in F2) ────────────────────
   Ogni messaggio è un oggetto piatto:  {da, t, d}
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
     {t:"banco/sospendi",       d:{}}                    la sezione non è più visibile:
                                                         ferma il rAF, tieni la scena
     {t:"banco/riprendi",       d:{}}                    la sezione è tornata visibile
     {t:"demo/reset",           d:{}}                    ricarica tutto dal seme

   DAL BANCO ALLA SCOCCA
     {t:"banco/pronto",         d:{versione:"…"}}        i modelli sono in scena
     {t:"banco/aperto",         d:{id:"rg-fl-004"}}      si è toccato un pezzo:
                                                         la scocca spinge la scheda
     {t:"banco/chiuso",         d:{}}                    si è tornati al banco
     {t:"preferenze/fodera",    d:{fodera:"…"}}          la veste è stata cambiata DAL banco
     {t:"preferenze/insieme",   d:{insieme:false}}
     {t:"banco/cadenza",        d:{fps:38, ao:false}}    diagnostica, per il pannello ?diag=1

   ── AGGIUNTE DELLA FASE 3 (la carta, le azioni, il pezzo che entra) ──
   Si aggiungono in fondo e non si riscrive niente sopra: il contratto è
   letto da più esecutori insieme, e una riga spostata è una riga che
   qualcuno non ritrova.

   DALLA SCOCCA AL BANCO
     {t:"esemplare/dati",  d:{id:"RJ-CM4-PR7-G9D", esemplare:{…}}}
        la verita' su un esemplare: la scocca la conosce (viene dal seme o
        da Supabase), il banco ne tiene solo una copia in chiaro. Il banco
        la mette in dispensa e, se la carta di QUEL pezzo è aperta, la
        riscrive sul posto — senza chiuderla, senza rigirarla, senza toast.
        `esemplare` è l'oggetto di `app/dati/seme.js`; il banco legge
        `codice, fam, k, quando|data_vendita, dove, da, dedica, regalo,
        stato, per, regalato_a, misura` e, se c'è, `storia: [{quando,
        fatto}]` — che vince sulla storia ricostruita.
     {t:"esemplare/nuovo", d:{id:"RJ-…", esemplare:{…}}}
        un pezzo appena entrato nel cofanetto. È l'unico messaggio che
        apre una SCENA (grado grande, ~1,4 s: il vassoio sale, il pezzo si
        posa, la luce sale dal fondo, arriva il cartellino). Porta
        l'esemplare intero perché il banco quel codice non lo conosce
        ancora: il ponte dei codici impara la riga qui.

   DAL BANCO ALLA SCOCCA
     {t:"azione/dedica",        d:{id, fam, k}}   apri il foglio Dedica
     {t:"azione/regala",        d:{id, fam, k}}   apri il foglio Regala
     {t:"azione/assistenza",    d:{id, fam, k}}   apri il foglio Assistenza
     {t:"azione/condividi",     d:{id, fam, k}}   apri il foglio Condividi
     {t:"azione/metti-da-parte",d:{id, fam, k}}   solo sui pezzi di vetrina
        Le azioni che chiedono di SCRIVERE non aprono niente nell'iframe:
        una tastiera dentro un telaio ridimensiona la scena e porta il
        campo sotto il pollice. Di qua parte il messaggio e il tasto si
        limita a dire che ha sentito il dito (compressione 0,96→1 in 300
        ms). Nessuna risposta è attesa: quando la scocca ha finito manda
        `esemplare/dati` e la carta si aggiorna da sola.
     {t:"esemplare/rimosso",     d:{id, motivo}}
        `motivo` è una delle tre righe del foglio «Cosa gli è successo?»:
        "regalato" | "smarrito" | "archivio". La scena ha già fatto uscire
        il pezzo dal vano e mostra la pillola «Rimosso · Annulla» per 6 s.
        Lo stesso tipo va anche nell'altro verso (scocca→banco, dall'elenco):
        lì la scena fa uscire il pezzo e NON mostra la pillola, perché
        l'annulla lo offre già la schermata da cui l'ordine è partito.
     {t:"esemplare/ripristinato",d:{id, motivo}}  si è premuto Annulla
     {t:"nav/vetrina",           d:{da:"banco"}}
        dal cofanetto vuoto: «Vai in vetrina». È una richiesta di rotta,
        non un fatto della scena — la scocca decide come portarcisi.

   REGOLE
   1. Chi riceve un messaggio NON lo rimanda: `da` serve a questo.
   2. Un messaggio è un FATTO avvenuto, non un ordine da confermare:
      nessun messaggio aspetta risposta.
   3. Tutto cio' che viaggia deve essere clonabile in modo strutturato:
      niente funzioni, niente nodi del DOM, niente oggetti three.js.
   4. Il tipo è lo stesso dell'evento dello store: così il ponte non
      deve tradurre, e una traduzione in meno è un bug in meno.
   ═══════════════════════════════════════════════════════════════════ */

import { ilCanale, iscrivi } from "app/stato.js";

/* le chiavi che il banco legge oggi all'avvio: finché non ascolta il
   canale, la scocca gliele scrive. Si tolgono in F2, e si toglie anche
   questa tabella. */
const PONTEGGIO = {
  "preferenze/fodera":   (d) => d.fodera ? ["regina.veste", d.fodera] : null,
  "preferenze/ambiente": (d) => d.ambiente ? ["regina.ambiente", d.ambiente] : null,
  /* ATTENZIONE, due «insieme» diversi. Nel banco `regina.insieme` è un
     interruttore ("si"|"no"): suggerire o no gli insiemi. Nei dati di
     `app/dati/seme.js` invece `preferenze.insieme` è la FORMA dei
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
    /* lo store filtra già la propria eco; qui si smistano solo i tipi
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

/* ═══════════════════════════════════════════════════════════════════
   F3b · CHI ASCOLTA COSA, DA QUESTA PARTE DEL PONTE (15/09)
   Aggiunto in fondo, senza toccare una riga sopra: il contratto lo
   leggono due esecutori insieme, e una riga spostata è una riga che
   qualcuno non ritrova.

   `app/viste/azioni.js` — montata da `avvio.js`, senza tab — si mette in
   ascolto di:
     azione/dedica · azione/regala · azione/assistenza · azione/condividi
       aprono un FOGLIO della scocca (la tastiera di iOS deve stare fuori
       dall'iframe: dentro, ridimensiona la scena e porta il campo sotto
       il pollice). Del carico si legge il solo `id`; `fam` e `k`
       viaggiano e non servono di qua.
     nav/vetrina            porta alla sezione Vetrina.
     banco/aperto           risponde subito con `esemplare/dati`.
     banco/chiuso           smette di considerare quella carta «a schermo»
                            (serve a una cosa sola e precisa: il toast
                            «Salvata» esiste quando l'effetto è ALTROVE).
   e manda:
     esemplare/dati   a ogni cambiamento dei quattro rami che compongono
                      la carta (esemplari, dediche, regali, assistenze),
                      non solo su richiesta: il banco non deve chiedere, e
                      una carta con una dedica vecchia è peggio di una
                      carta senza dedica.
     esemplare/nuovo  quando si apre un regalo dalla pagina `#/c/<codice>`.
                      Porta l'esemplare intero: quel codice il banco non
                      lo conosce ancora.

   DUE COSE CHE IL CONTRATTO PREVEDE E CHE DA QUESTA PARTE NON HANNO
   ANCORA UN ASCOLTATORE, ed è scritto invece che scoperto:
     azione/metti-da-parte   è della Vetrina (F4), non delle azioni della
                             carta: la scadenza e la lista vivono lì.
     esemplare/rimosso|ripristinato  arrivano fino allo store da soli —
                             il riduttore li conosce già — ma il foglio
                             «Cosa gli è successo?» (46 S3.7) e la
                             pillola con Annulla a 6 s stanno nel banco.
   ═══════════════════════════════════════════════════════════════════ */
