/* ═══════════════════════════════════════════════════════════════════
   app/viste/profilo.js — F6 · IL PROFILO, cioè IL REGISTRO.

   Da dove viene. Fino al 15/09 questa vista era uno scheletro onesto:
   una tessera, tre liste, quattro celle marcate «F6». Non era sbagliato
   — era un ELENCO DI CAMPI, e un elenco di campi non è un registro.

   La legge che comanda tutto il file (48 §6.1, e la carta psicologica
   alla voce Reciprocita'): IL CREDITO LO DA' IL NEGOZIO, E LO FIRMA.
   Non si scrive mai «hai guadagnato», non si scrive mai «punti», non si
   celebra mai un accredito come una vincita. Ogni riga del registro
   porta il MITTENTE («da Regina») e la regola che l'ha generata («3% di
   89,00 €»). Un credito senza mittente è un punteggio, e un punteggio
   è l'unica cosa che questa app non deve diventare.

   La seconda legge (Dreze & Nunes 2009, JCR): I LIVELLI HANNO UN NOME E
   UN GRADINO SOTTO. Mai «3 su 10», mai una barra che parte da zero —
   chi è entrato con un pezzo da 89 € è a 89 su 300, e quel primo
   pezzo si vede nel filo. Il gradino già passato resta a schermo,
   attenuato, perché è cio' che fa sentire dove si è arrivati.

   Sei schermate, e il loro indirizzo:
     R0 · Profilo, radice del tab                 #/profilo
     R1 · Credito e livello                       #/profilo/credito
     R2 · Le tue date                             #/profilo/date
          (e il foglio «Una data», che non è una schermata)
     R3 · Fodera                                  #/profilo/fodera
     R4 · Impostazioni                            #/profilo/impostazioni
          Cosa sappiamo di te                     #/profilo/dati
          Il negozio                              #/profilo/profilo-negozio
          Aiuto                                   #/profilo/aiuto
   Più il foglio della SALITA DI LIVELLO, che compare una volta sola al
   primo avvio dopo che il livello è salito (`?demo=livello` lo prova).

   ── COME LE ROTTE STANNO IN PIEDI ───────────────────────────────────
   `app/rotta.js` legge l'indirizzo a COPPIE (`tipo/id`). Un segmento
   solo — `credito`, `fodera` — non entra nella pila quando l'indirizzo
   si RILEGGE, ma `spingi()` lo accetta (guarda solo il tipo) e lo
   scrive; il ritorno funziona perché una pila più lunga
   dell'indirizzo si accorcia da sola. È la stessa scelta già presa da
   `viste/vetrina.js` per `#/vetrina/lista` e `#/vetrina/negozio`, ed è
   dichiarata lì come qui. Nessuna riga di `rotta.js` è stata toccata.
   Il foglio «Una data» NON ha indirizzo: un <dialog> e uno strato
   spinto sono due cose diverse, e dargli una rotta vorrebbe dire
   spingere uno strato vuoto sotto il foglio.

   ── LO STORE LE HA (15/09) ──────────────────────────────────────────
   Le cinque azioni stanno qui sotto come funzioni PURE (`AZIONI_F6`) e
   sono state FUSE in `riduci()` di `app/stato.js` (schema V4): `date`,
   `notifiche_pref` e `livello_visto` sono rami dello store. Il ponte
   provvisorio in `localStorage` (`regina:profilo:*`) è stato tolto —
   e la vista non ha cambiato una riga di marcatura per farlo, che era
   il patto scritto il giorno in cui è stato costruito.
   ═══════════════════════════════════════════════════════════════════ */

import { e, annuncia } from "app/ui/dom.js";
import { segno } from "app/ui/segni.js";
import { cella, lista } from "app/ui/cella.js";
import { tasto } from "app/ui/tasto.js";
import { toast } from "app/ui/toast.js";
import { apriFoglio, chiudiFoglio } from "app/ui/foglio.js";
/* LA TESSERA È UN COMPONENTE, non una copia: la stessa di S3 e del
   foglio del livello (`app/ui/tessera.js`, dal 15/09). */
import { tessera } from "app/ui/tessera.js";
import { schermo } from "app/ui/barra-nav.js";
import { spingi, registraSchermo, registraAliasUnSegmento, torna, tabCorrente } from "app/rotta.js";
import { conTransizione, RIDOTTO } from "app/moto.js";
/* le date si contano in un posto solo in tutta l'app. Sono funzioni
   PURE già esportate da F5 (UTC, giorni interi): riscriverle qui
   significherebbe avere due aritmetiche del calendario, e la seconda
   sbaglierebbe di un giorno il giorno che cambia l'ora legale. */
import { aGiorni, giorniFra, annoDi, oggiVero,
         giornoEMese, nomeMese, prossimaRicorrenza } from "app/viste/perte.js";
/* IL NEGOZIO STA IN UN POSTO SOLO. Quando F6 è partita questo file non
   c'era e i fatti erano chiusi dentro `viste/vetrina.js`, non esportati;
   nel frattempo F3 li ha estratti qui. Si legge da qui: tre copie dello
   stesso numero di telefono sono tre numeri che un giorno saranno
   diversi. Gli orari arrivano nella forma del gestionale (coppie
   da/a, indicizzate come `Date.getDay()`), e si impaginano qui. */
import { NEGOZIO, waNegozio } from "app/dati/negozio.js";

/* IL FOGLIO DI STILE SE LO PORTA LA VISTA, col timbro di versione del
   modulo: un CSS senza versione è un CSS che Safari serve vecchio a un
   JS nuovo. */
(function vestiti(){
  if(document.getElementById("css-profilo")) return;
  const u = new URL("profilo.css", import.meta.url);
  u.search = new URL(import.meta.url).search;
  const l = document.createElement("link");
  l.id = "css-profilo"; l.rel = "stylesheet"; l.href = u.href;
  document.head.append(l);
})();

/* ═══════════════════════════════════════════════════════════════════
   PARTE PRIMA — LE AZIONI DELLO STORE, PURE.
   Da fondere in `riduci()` di `app/stato.js`. Ogni funzione prende lo
   stato e il `dato` dell'evento e torna lo stato nuovo, immutabile a un
   livello — la stessa disciplina degli altri rami, così `iscrivi` può
   confrontare `prima.date !== dopo.date` e sapere se ridisegnare.

   I tre rami nuovi:
     s.date            {aggiunte:[…], tolte:[…], pezzi:{…}}
     s.notifiche_pref  {date:bool, collezioni:bool, negozio:bool}
     s.livello_visto   numero (l'indice del livello già festeggiato)
   ═══════════════════════════════════════════════════════════════════ */

export const DATE_VUOTE = {aggiunte: [], tolte: [], pezzi: {}};
export const NOTIFICHE_SPENTE = {date: false, collezioni: false, negozio: false};

/* I QUATTRO ANTICIPI, e non un campo libero. Apple Calendario ne da'
   quattro per i compleanni; il default è DUE SETTIMANE perché per un
   regalo serve il tempo di passare in negozio (GiftList/Giftster: 2-3
   settimane). `g` è il numero di giorni, ed è anche la chiave. */
export const AVVISI = [
  {g: 0,  corto: "Il giorno",   lungo: "il giorno stesso"},
  {g: 1,  corto: "1 giorno",    lungo: "1 giorno prima"},
  {g: 7,  corto: "1 settimana", lungo: "1 settimana prima"},
  {g: 14, corto: "2 settimane", lungo: "2 settimane prima"}
];
export const AVVISO_DEFAULT = 14;

export const TIPI_DATA = [
  {id: "compleanno",   nome: "Compleanno",   chiede: true},
  {id: "anniversario", nome: "Anniversario", chiede: false},
  {id: "festa",        nome: "Festa",        chiede: false},
  {id: "altro",        nome: "Altro",        chiede: true}
];

export const AZIONI_F6 = {
  /* {id, tipo, nome, giorno, mese, anno, avviso} — `avviso` in GIORNI,
     uno dei quattro di `AVVISI`. L'id lo fa la vista (`d-<tempo>`) per
     poter annullare il toast senza aspettare un ritorno dallo store. */
  "date/aggiungi": (s, d) => {
    const dt = s.date || DATE_VUOTE;
    if(!d || !d.id || (dt.aggiunte || []).some(x => x.id === d.id)) return s;
    return {...s, date: {...dt, aggiunte: [...(dt.aggiunte || []), {...d}]}};
  },
  /* toglie una data AGGIUNTA, oppure segna come tolta una del seme:
     il seme è catalogo, non si modifica — si annota la sottrazione. */
  "date/togli": (s, d) => {
    const dt = s.date || DATE_VUOTE;
    const agg = (dt.aggiunte || []).filter(x => x.id !== d.id);
    const era = agg.length !== (dt.aggiunte || []).length;
    if(era) return {...s, date: {...dt, aggiunte: agg}};
    if((dt.tolte || []).includes(d.id)) return s;
    return {...s, date: {...dt, tolte: [...(dt.tolte || []), d.id]}};
  },
  /* l'ANNULLA di una data del negozio: non si «riaggiunge» (non è
     nostra), si toglie dalle tolte. È la stessa azione, al contrario. */
  "date/rimetti": (s, d) => {
    const dt = s.date || DATE_VUOTE;
    if(!(dt.tolte || []).includes(d.id)) return s;
    return {...s, date: {...dt, tolte: (dt.tolte || []).filter(i => i !== d.id)}};
  },
  /* l'opt-in per riga dell'anniversario del pezzo: {pezzo, acceso}.
     Nasce SPENTO — l'anniversario si scrive da solo nel cofanetto e non
     consuma lo slot settimanale di notifica finché non lo si accende. */
  "date/avviso": (s, d) => {
    const dt = s.date || DATE_VUOTE;
    const p = {...(dt.pezzi || {})};
    if(!!p[d.pezzo] === !!d.acceso) return s;
    if(d.acceso) p[d.pezzo] = true; else delete p[d.pezzo];
    return {...s, date: {...dt, pezzi: p}};
  },
  /* {tipo:"date"|"collezioni"|"negozio", acceso:bool}. Il PERMESSO del
     browser non si chiede qui: qui si salva una preferenza, e il
     permesso si chiedera' alla prima notifica lecita (carta psicologica:
     «Il permesso si chiede DOPO il primo momento di valore»). */
  "notifiche/preferenza": (s, d) => {
    const n = s.notifiche_pref || NOTIFICHE_SPENTE;
    if(!(d.tipo in NOTIFICHE_SPENTE) || !!n[d.tipo] === !!d.acceso) return s;
    return {...s, notifiche_pref: {...n, [d.tipo]: !!d.acceso}};
  },
  /* {livello:<indice>} — il livello di cui la salita è già stata
     mostrata. Serve a far comparire il foglio UNA volta sola. */
  "livello/visto": (s, d) => {
    if(s.livello_visto === d.livello) return s;
    return {...s, livello_visto: d.livello};
  }
};

/* ═══════════════════════════════════════════════════════════════════
   PARTE SECONDA — I CONTI, PURI.
   Niente DOM da qui alla riga «PARTE TERZA».
   ═══════════════════════════════════════════════════════════════════ */

/* IL SALDO È LA SOMMA DEI MOVIMENTI, in centesimi interi. Non si legge
   `cliente.credito`: un saldo scritto accanto alle righe che dovrebbero
   produrlo è un saldo che un giorno non combacia. */
export const saldo = (movimenti) =>
  (movimenti || []).reduce((t, m) => t + (m.importo | 0), 0);

/* IL LIVELLO È QUELLO CHE DICONO LE SOGLIE, a partire dallo speso. */
export function livelloDa(speso, livelli){
  const L = livelli || [];
  let i = 0;
  for(let k = 0; k < L.length; k++) if((speso | 0) >= (L[k].soglia | 0)) i = k;
  const prossimo = L[i + 1] || null;
  return {
    indice: i,
    attuale: L[i] || null,
    prossimo,
    manca: prossimo ? Math.max(0, (prossimo.soglia | 0) - (speso | 0)) : 0
  };
}

/* LA QUOTA DEL FILO. Mai zero: il primo pezzo conta, e un filo
   invisibile non è un filo. Sopra il 4 % dice la verita' nuda. */
export const QUOTA_MINIMA = 4;
export function quotaFilo(speso, prossimo){
  if(!prossimo) return 100;
  const s = (prossimo.soglia | 0);
  if(s <= 0) return 100;
  return Math.max(QUOTA_MINIMA, Math.min(100, ((speso | 0) / s) * 100));
}

/* COME SI LEGGE UNA RIGA DEL REGISTRO. Il mittente c'è sempre; la
   regola che ha generato l'importo anche. I dati portano un `motivo`
   scritto da una persona («3% su Tulum · 89,00 €»): si smonta, non si
   ripete, perché ripetuto diventerebbe «3% su Tulum · 89,00 € · da
   Regina · 3% di 89,00 €». */
export function vociMovimento(m, tessera){
  const testo = String((m && (m.causale || m.motivo)) || "");
  const tipo = (m && m.tipo) || "";
  if(tipo === "maturato"){
    const q = /^(\d+%)\s+su(?:gli)?\s+(.+?)\s+·\s+(.+)$/.exec(testo);
    if(q) return {titolo: q[2], regola: q[1] + " di " + q[3]};
    return {titolo: "Credito maturato", regola: testo};
  }
  if(tipo === "benvenuto")
    return {titolo: "Credito di benvenuto", regola: "tessera " + (tessera || "")};
  if(tipo === "compleanno")
    return {titolo: "Il mese del tuo compleanno", regola: "un pensiero del negozio"};
  if(tipo === "scaricato")
    return {titolo: "Usato in negozio", regola: testo.replace(/^Scalato\s+/i, "")};
  return {titolo: testo || "Movimento", regola: ""};
}

/* IL REGISTRO, RAGGRUPPATO PER MESE, dal più recente. Il gruppo è il
   modo in cui Apple Card scrive l'attivita': il periodo è l'unita' di
   lettura di un conto. */
export function perMese(movimenti){
  const mappa = new Map();
  for(const m of movimenti || []){
    const k = String(m.data || "").slice(0, 7);
    if(!mappa.has(k)) mappa.set(k, []);
    mappa.get(k).push(m);
  }
  return [...mappa.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([k, righe]) => ({
      chiave: k,
      titolo: titoloMese(k),
      righe: righe.slice().sort((a, b) => (a.data < b.data ? 1 : -1))
    }));
}
export function titoloMese(chiave){
  const a = +String(chiave).slice(0, 4), m = +String(chiave).slice(5, 7);
  const n = nomeMese(m);
  return n.charAt(0).toUpperCase() + n.slice(1) + " " + a;
}

/* LE DATE, TUTTE INSIEME. Quelle del seme (che le ha messe il negozio)
   più quelle aggiunte dalla persona, meno quelle tolte, ordinate per
   la PROSSIMA volta che cadono — che è l'unico ordine che serve a chi
   guarda: la prima riga è la prossima cosa che succede. */
export function dateUnite(s, oggi){
  const dt = s.date || DATE_VUOTE;
  const tolte = new Set(dt.tolte || []);
  const dal_seme = (s.ricorrenze || []).map(r => ({
    id: r.id, tipo: r.tipo, titolo: r.titolo || r.etichetta || "La tua data",
    giorno: r.giorno, mese: r.mese, anno: r.anno,
    avviso: AVVISO_DEFAULT, dal_negozio: true
  }));
  const mie = (dt.aggiunte || []).map(d => ({...d, dal_negozio: false}));
  return [...dal_seme, ...mie]
    .filter(d => !tolte.has(d.id) && d.giorno && d.mese)
    .map(d => {
      const q = prossimaRicorrenza(d, oggi);
      return {...d, quando: q, fra: giorniFra(oggi, q)};
    })
    .sort((a, b) => a.fra - b.fra);
}

/* COME SI CHIAMA UNA DATA in elenco. I dati del seme portano
   un'etichetta scritta da una persona; le date aggiunte portano tipo e
   nome. Le due strade si incontrano qui. */
export function nomeData(d){
  if(d.titolo) return d.titolo;
  const t = TIPI_DATA.find(x => x.id === d.tipo);
  const n = String(d.nome || "").trim();
  if(d.tipo === "compleanno") return n ? "Compleanno di " + n : "Un compleanno";
  if(d.tipo === "anniversario") return n ? "Anniversario · " + n : "Un anniversario";
  if(n) return n;
  return (t && t.nome) || "Una data";
}
export const testoAvviso = (g) => {
  const a = AVVISI.find(x => x.g === (g | 0)) || AVVISI[AVVISI.length - 1];
  return a.lungo;
};

/* GLI ANNIVERSARI DEI PEZZI. Si scrivono da soli: non sono una data che
   qualcuno ha inserito, sono la conseguenza di un acquisto. Niente
   notifica, se non la si accende riga per riga. */
export function anniversariPezzi(s, oggi, quanti = 4){
  return (s.esemplari || [])
    .filter(x => x && !x.rimosso && x.stato !== "venduto" && x.data_vendita)
    .map(x => {
      const g = x.data_vendita;
      const d = {giorno: +g.slice(8, 10), mese: +g.slice(5, 7)};
      const q = prossimaRicorrenza(d, oggi);
      const anni = annoDi(q) - annoDi(g);
      return {id: x.id || x.codice, nome: x.nome || x.articolo,
              quando: q, fra: giorniFra(oggi, q), anni};
    })
    .filter(x => x.anni >= 1 && isFinite(x.fra))
    .sort((a, b) => a.fra - b.fra)
    .slice(0, quanti);
}
export const NUMERO_ANNI = ["", "Un anno", "Due anni", "Tre anni", "Quattro anni",
                            "Cinque anni", "Sei anni", "Sette anni"];

/* ═══════════════════════════════════════════════════════════════════
   I FATTI CHE NON SONO DATI (ancora)
   ═══════════════════════════════════════════════════════════════════ */

/* LE QUATTRO FODERE. I nomi sono quelli del documento di F6 (Crema ·
   Turchese · Notte · Cipria); gli `id` sono quelli che il BANCO IN TRE
   DIMENSIONI conosce da sempre (`spazio.html`, `const VESTI`: velluto |
   bianco | avorio | turchese) e che il seme salva.
   Il colore della capsula è quello che il banco applichera' DAVVERO —
   non il token del tema con lo stesso nome. Una capsula che mostra un
   cipria e un cofanetto che diventa avorio sono due bugie che si
   scoprono nello stesso secondo. Il giorno che il banco imparera'
   quattro vesti nuove, qui cambiano quattro token e basta. */
export const FODERE = [
  {id: "bianco",   nome: "Crema",    tinta: "var(--fodera-bianco)"},
  {id: "turchese", nome: "Turchese", tinta: "var(--firma)"},
  {id: "velluto",  nome: "Notte",    tinta: "var(--vassoio)"},
  {id: "avorio",   nome: "Cipria",   tinta: "var(--fodera-avorio)"}
];

/* GLI ORARI, COME SI LEGGONO. `app/dati/negozio.js` li porta nella
   forma del gestionale — coppie «da/a», indicizzate come
   `Date.getDay()`, cioè con la domenica in testa. Una settimana che
   comincia di domenica è giusta per una macchina e sbagliata per una
   persona: qui si rimette in ordine e si scrive in italiano. */
export const ORDINE_GIORNI = [1, 2, 3, 4, 5, 6, 0];
export function orariLeggibili(negozio){
  return ORDINE_GIORNI.map(i => {
    const o = (negozio.orari || [])[i] || {g: "", f: []};
    const f = o.f || [];
    return {g: o.g, f: f.length
      ? f.map(([a, b]) => a + " – " + b).join(" · ")
      : "chiuso"};
  });
}

/* LE CINQUE DOMANDE. Cinque, non venti: una schermata di aiuto che si
   scorre è una schermata che nessuno legge. */
export const FAQ = [
  ["Come funziona il credito",
   "Ogni acquisto in negozio lascia una percentuale in credito, decisa dal tuo livello. Il credito si scala in negozio sul prossimo acquisto, su qualsiasi pezzo."],
  ["Come regalo un pezzo",
   "Lo scegli in negozio e chiedi la carta del pezzo: chi lo riceve inquadra il codice e il pezzo entra nel suo cofanetto, con la tua dedica."],
  ["Ho perso il codice",
   "Il codice è stampato sul cartoncino del cofanetto. Se non lo trovi, in negozio lo ritrovano dal tuo nome: il cofanetto non si perde."],
  ["Cambio la misura di un anello",
   "Si fa in negozio. Porta il pezzo e la carta: la misura nuova resta scritta nel tuo profilo, così ai prossimi regali ci pensano loro."],
  ["Assistenza su un pezzo",
   "Pulizia e piccole riparazioni si fanno al banco. Scrivi su WhatsApp con il tuo codice e ti dicono quando passare."]
];

/* ═══════════════════════════════════════════════════════════════════
   PARTE TERZA — LA VISTA. Da qui in giu' si tocca il DOM.
   ═══════════════════════════════════════════════════════════════════ */

/* IL PONTE NON C'È PIÙ, e non serviva che una giornata. Fino al
   15/09 questa vista teneva `date`, `notifiche_pref` e `livello_visto`
   in tre chiavi di `localStorage` (`regina:profilo:*`), perché lo store
   non aveva quei rami: era una SECONDA verità dichiarata provvisoria.
   Lo store adesso li ha (schema V4, `app/stato.js`), e il ripiego se
   n'è andato con le sue cinque funzioni — `leggiPonte`, `scriviPonte`,
   `datePonte`, `notifichePonte`, `livelloVisto` — e con le tre righe di
   `azione()` che ci scrivevano dentro. Resta `azione()`, che manda
   l'evento e basta: è cio' che si era detto il giorno che il ponte è
   stato scritto.

/* il giro della tessera vive in `app/ui/tessera.js` (600 ms, keyframe a
   90 gradi a 300 — 49 §10, formula E): qui non si ridichiara, o
   sarebbero due numeri per un tempo solo. */

export function monta(el, store){
  /* IL TEMA CHIARO (verdetto di Massimo, 21/09: «il Profilo deve avere
     lo stesso tema e la barra identica» di Vetrina e Per te). Stessa
     leva delle altre due — non un terzo set di token — `sistema.css`
     (blocco «LA BARRA DI VETRO SULLA CARTA») dà la stessa tinta alla
     barra quando `data-sez="profilo"`. Il velluto restava dal 15/09,
     prima che il canone chiaro esistesse: qui si allinea, e basta. */
  const sezioneProfilo = el.closest(".vista");
  if(sezioneProfilo) sezioneProfilo.dataset.tema = "chiaro";

  const {leggi, invia, soldi} = store;
  const cliente = () => leggi().cliente || {};

  /* LA DATA DELLA DEMO. `app/innesto.js` non porta ancora `seme.oggi`:
     la si chiede al modulo dei dati e, se manca, si usa il giorno vero.
     Le scadenze di questa vista (la prossima data, gli anniversari dei
     pezzi) si contano da qui e non da `new Date()`. */
  let OGGI = (store.seme && store.seme.oggi) || oggiVero();
  import("app/dati/seme.js").then((m) => {
    if(m && m.oggi && m.oggi !== OGGI){ OGGI = m.oggi; disegna(); }
  }).catch(() => {});

  /* L'AZIONE È UN EVENTO, e nient'altro. Lo store la riduce (gli
     stessi riduttori puri di `AZIONI_F6`, fusi in `app/stato.js`) e
     avvisa chi è iscritto; la vista si ridisegna da lì. Prima qui si
     applicava anche a mano su uno stato finto, per poter salvare nel
     ponte: quel giro è finito col ponte. */
  function azione(tipo, dato){ invia(tipo, dato); }
  const livelloVisto = () => {
    const v = leggi().livello_visto;
    return (v === undefined) ? null : v;
  };

  /* ── I CONTI DELLA VISTA, in un posto solo ───────────────────── */
  function conti(){
    /* LO STATO, E BASTA. `dateUnite()` e le altre leggono `s.date` e
       `s.notifiche_pref`: sono rami dello store (V4), non più del
       ponte, e qui non si innesta più niente — era questa la riga che
       il giorno della fusione doveva sparire. */
    const s = leggi();
    const c = s.cliente || {};
    const mov = s.movimenti_credito || [];
    const l = livelloDa(c.speso_totale | 0, s.livelli || []);
    return {s, c, mov, credito: saldo(mov), ...l,
            speso: c.speso_totale | 0};
  }

  /* ══ GLI SCHERMI ═══════════════════════════════════════════════
     OGNI SCHERMO È UNA COPPIA `tipo/id` (`credito/apri`, non più
     `credito` da solo): `rotta.js` ricostruisce la pila dall'indirizzo
     appaiando due segmenti alla volta, e un tipo senza id non si
     appaiava mai — «indietro» da una schermata nidificata (Dati, dopo
     Impostazioni) saltava dritto alla radice invece di fermarsi a un
     piano intermedio (trovato dal critic, 21/09). L'id è sempre
     "apri": nessuno di questi schermi legge un id vero. I vecchi
     indirizzi a un segmento restano validi — `registraAliasUnSegmento`
     li completa da solo in `rotta.js`. */
  registraSchermo("credito",      (_id, dove) => schermoCredito(dove));
  registraSchermo("date",         (_id, dove) => schermoDate(dove));
  registraSchermo("fodera",       (_id, dove) => schermoFodera(dove));
  registraSchermo("impostazioni", (_id, dove) => schermoImpostazioni(dove));
  registraSchermo("dati",         (_id, dove) => schermoDati(dove));
  /* LA CHIAVE È SUA, E NON «negozio». `registraSchermo` tiene UNA mappa
     per tutta l'app, non una per tab: `viste/vetrina.js` registra già
     «negozio» (la scheda del negozio con gli orari e le mappe), e
     l'ultima registrazione vinceva su tutt'e due i tab — da
     `#/vetrina/negozio` si apriva la scheda del Profilo, o viceversa,
     a seconda di chi si montava per ultimo. Due schermate diverse non
     possono avere lo stesso nome in una mappa sola. Il prezzo è
     l'indirizzo, che diventa `#/profilo/profilo-negozio/apri`: brutto
     da leggere ma univoco. Il giorno che `rotta.js` terrà una mappa per
     tab, questa chiave torna «negozio» e l'indirizzo torna
     `#/profilo/negozio/apri`. */
  registraSchermo("profilo-negozio", (_id, dove) => schermoNegozio(dove));
  registraSchermo("aiuto",        (_id, dove) => schermoAiuto(dove));
  for(const tipo of ["credito", "date", "fodera", "impostazioni", "dati", "profilo-negozio", "aiuto"])
    registraAliasUnSegmento(tipo, "apri");

  /* ═══════════════════════════════════════════════════════════════
     LA TESSERA — LA STESSA, non una copia.

     Fino a ieri questo file ridisegnava la carta di S3 riga per riga,
     e il commento spiegava perché: in `viste/ingresso.js` la tessera
     non era una funzione di modulo ma marcatura dentro `s3()`, e non
     c'era una riga di `export` da cui tirarla fuori. Il critic l'ha
     bocciato per quel che era — due carte dove ce n'è una — e la
     mossa (3) è stata farne un COMPONENTE: `app/ui/tessera.js`. Qui
     restano solo i DATI e cio' che il tocco fa in questa vista.
     ═══════════════════════════════════════════════════════════════ */

  function datiTessera(){
    const d = conti();
    const c = d.c;
    return {
      codice: c.tessera || "RJ 00000",
      nome: c.nome_incisione || [c.nome, c.cognome].filter(Boolean).join(" "),
      credito: soldi(d.credito),
      /* IL LIVELLO SENZA PERCENTUALE. «Secondo · 3%» su una carta si
         legge come un progresso — quanto manca, a che punto sono — e
         una carta non è una barra di avanzamento. La percentuale sta
         dove si spiega: nello schermo del credito, dove c'è anche la
         scala e la riga «Ogni acquisto lascia il 3% in credito». */
      livello: d.attuale ? d.attuale.nome : "Primo",
      fodera: (d.s.preferenze || {}).fodera || FODERE[0].id
    };
  }

  /* ── LE INIZIALI DELL'AVATAR, «LS» da «Lucia Sabatini» ────────────
     Prima e ultima parola del nome per l'incisione (o nome+cognome):
     due lettere, come Wallet/Contatti — mai una foto vera senza che il
     cliente ce l'abbia data. */
  function iniziali(nome){
    const parti = String(nome || "").trim().split(/\s+/).filter(Boolean);
    if(!parti.length) return "";
    const a = parti[0][0] || "";
    const b = parti.length > 1 ? parti[parti.length - 1][0] : "";
    return (a + b).toUpperCase();
  }
  /* «SET», non «settembre»: la tessera-calendario (E20·A) porta il mese
     in tre lettere maiuscole, come il badge di un evento in Wallet. */
  const meseCorto = (m) => nomeMese(m).slice(0, 3).toUpperCase();
  function scomponiData(iso){
    const g = aGiorni(iso);
    if(!isFinite(g)) return {giorno: "", mese: 1};
    const dt = new Date(g * 86400000);
    return {giorno: dt.getUTCDate(), mese: dt.getUTCMonth() + 1};
  }
  /* LA TESSERA-CALENDARIO. Non è un segno del sistema (`ui/segni.js`):
     porta due CIFRE vere, non un pittogramma, e vive solo qui. */
  function badgeCalendario(iso){
    const {giorno, mese} = scomponiData(iso);
    return e("span", {class: "f6-cal", "aria-hidden": "true"}, [
      e("span", {class: "f6-cal-mese", testo: meseCorto(mese)}),
      e("span", {class: "f6-cal-gg cifra", testo: String(giorno)})
    ]);
  }

  /* L'ANELLO DI AVANZAMENTO DEL LIVELLO. Un SVG vero (non un segno del
     sistema): `ui/dom.js` non costruisce nodi SVG (namespace sbagliato),
     quindi passa dal template — lo stesso trucco di `ui/segni.js`. */
  function anelloLivello(quota){
    const R = 10, C = 2 * Math.PI * R;
    const off = Math.max(0, C * (1 - quota / 100));
    const t = document.createElement("template");
    t.innerHTML =
      '<svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">' +
      '<circle cx="13" cy="13" r="' + R + '" fill="none" stroke="var(--incavo)" stroke-width="4"/>' +
      '<circle cx="13" cy="13" r="' + R + '" fill="none" stroke="var(--accento)" stroke-width="4" ' +
      'stroke-dasharray="' + C.toFixed(2) + '" stroke-dashoffset="' + off.toFixed(2) +
      '" stroke-linecap="round" transform="rotate(-90 13 13)"/></svg>';
    return t.content.firstElementChild;
  }

  /* L'INTESTAZIONE DI GRUPPO CHE SI TOCCA (E06·C + chevron): «LE TUE
     DATE» apre l'elenco intero. Non passa da `cella()`/`lista()` — è un
     occhiello con un comando, non una riga di lista. */
  function testaGruppoTasto(titolo, suClick){
    return e("button", {type: "button", class: "f6-testa-gruppo",
      "aria-label": titolo, suClick}, [
      e("span", {class: "occhiello", testo: titolo}),
      segno("chevron", {misura: 14, classe: "frec"})
    ]);
  }

  /* «AGGIUNGI UNA DATA», col segno «+» a sinistra invece del chevron a
     destra: non passa da `cella()` (che il chevron lo mette sempre da
     sé quando c'è un tocco) — qui il segno del comando è un altro. */
  function rigaAggiungiData(suClick){
    return e("button", {type: "button", class: "cella f6-azione", suClick}, [
      e("span", {class: "f6-piu", "aria-hidden": "true"}, [segno("piu", {misura: 14})]),
      e("div", {class: "testo"}, [e("b", {testo: "Aggiungi una data"})])
    ]);
  }

  /* UNA RIGA DI DATA, col badge — per la radice (non si tocca: è
     un'anteprima) e per l'elenco intero (`rigaData`, che invece porta
     anche «Togli»). */
  function rigaDataAnteprima(x){
    return e("div", {class: "cella due piatta", stile: "gap:12px"}, [
      badgeCalendario(x.quando),
      e("div", {class: "testo"}, [
        e("b", {testo: nomeData(x)}),
        e("span", {testo: "avviso " + testoAvviso(x.avviso)})
      ])
    ]);
  }

  /* LA RIGA DELLA PERSONA (E19·A): iniziali su tinta neutra, il codice
     e da quando è cliente — MAI il nome, che vive una sola volta, sulla
     tessera. Apre «I tuoi dati». */
  function rigaAvatarPersona(c){
    const da = c.cliente_dal ? daQuando(c.cliente_dal) : "";
    return e("button", {type: "button", class: "cella due",
      "aria-label": "I tuoi dati. " + (c.tessera || "") +
        (da ? ", cliente " + da : ""),
      suClick: () => spingi("dati/apri")}, [
      e("span", {class: "f6-avatar", "aria-hidden": "true",
        testo: iniziali(c.nome_incisione || [c.nome, c.cognome].filter(Boolean).join(" "))}),
      e("div", {class: "testo"}, [
        e("b", {testo: c.tessera || ""}),
        e("span", {testo: da ? "Cliente " + da : "Cliente"})
      ]),
      segno("chevron", {misura: 14, classe: "frec"})
    ]);
  }

  /* IL BLOCCO FUORI DALLA CARTA (E04·B + E05·C): il credito e «Mostra
     al banco» — che gira la STESSA carta di sopra, non un'altra — e,
     sotto un filo, la riga del livello con l'anello: AL TOCCO apre la
     pagina col registro e con TUTTI i livelli (richiesta esplicita di
     Massimo, 21/09). */
  function bloccoFuoriCarta(d, scena){
    const quota = quotaFilo(d.speso, d.prossimo);
    const nomeAttuale = d.attuale ? d.attuale.nome : "Primo";
    const parole = d.prossimo
      ? "Livello " + nomeAttuale + " · mancano " + soldi(d.manca) + " al " + d.prossimo.nome
      : "Livello " + nomeAttuale + " · sei al livello più alto";
    const riga1 = e("div", {class: "f6-fuori-riga1"}, [
      e("div", {}, [
        e("span", {class: "f6-fuori-et", testo: "Credito"}),
        e("b", {class: "cifra", testo: soldi(d.credito)})
      ]),
      e("button", {type: "button", class: "f6-fuori-tasto",
        "aria-label": "Mostra il codice al banco",
        suClick: () => { try{ scena.gira(); }catch(_){} }},
        [e("span", {testo: "Mostra al banco"})])
    ]);
    const riga2 = e("button", {type: "button", class: "f6-fuori-riga2",
      "aria-label": parole, suClick: () => spingi("credito/apri")}, [
      anelloLivello(quota),
      e("span", {class: "f6-fuori-parole", testo: parole}),
      segno("chevron", {misura: 14, classe: "frec"})
    ]);
    return e("div", {class: "f6-fuori"}, [riga1, e("div", {class: "f6-fuori-sep"}), riga2]);
  }

  /* «I TUOI ACQUISTI» (E13·B): riusa gli SCHERMI GIÀ FATTI della
     Vetrina — non si duplica ordini/preferiti/da-parte in un secondo
     posto. Una riga a zero non si mostra. */
  function bloccoAcquisti(s){
    const nOrdini = (s.ordini || []).length;
    const nParte = (s.wishlist || []).length;
    const nPref = (s.preferiti || []).length;
    const righe = [];
    if(nOrdini) righe.push(cella({titolo: "I tuoi ordini", coda: String(nOrdini),
      etichetta: "I tuoi ordini, " + nOrdini, suClick: () => spingi("ordini/tutti")}));
    if(nParte) righe.push(cella({titolo: "Da parte", coda: String(nParte),
      etichetta: "Da parte, " + nParte, suClick: () => spingi("lista")}));
    if(nPref) righe.push(cella({titolo: "Preferiti", coda: String(nPref),
      etichetta: "Preferiti, " + nPref, suClick: () => spingi("preferiti/tutti")}));
    return righe.length ? lista("I tuoi acquisti", righe) : null;
  }

  /* ══ R0 · IL PROFILO ═══════════════════════════════════════════
     Rimontata sulla B2a (21/09, secondo giro): riga-avatar sotto il
     titolo, poi la tessera, il blocco fuori-carta, le date come
     tessere-calendario, «I tuoi acquisti», e il resto invariato. */
  function disegna(){
    const d = conti();
    const c = d.c;
    const pagina = schermo(el, {titolo: "Profilo"});

    /* ── La riga della persona (E19·A) ── */
    pagina.append(lista(null, [rigaAvatarPersona(c)]));

    /* ── La tessera: il tocco gira, non apre più «Credito» da qui
       (E04·B — «Mostra al banco» e la carta fanno la STESSA cosa). ── */
    const scena = tessera(datiTessera(), {senzaCredito: true});
    pagina.append(scena);
    pagina.append(bloccoFuoriCarta(d, scena));

    /* ── Le tue date (E20·A): al massimo due, il resto dietro «tutte»
       — l'intestazione stessa è il comando verso l'elenco. ── */
    const date = dateUnite(d.s, OGGI);
    const righeDate = date.length
      ? date.slice(0, 2).map(rigaDataAnteprima)
      : [e("div", {class: "cella due piatta"}, [
          e("div", {class: "testo"}, [
            e("b", {testo: "Nessuna data"}),
            e("span", {testo: "Le tue ricorrenze staranno qui."})
          ])
        ])];
    righeDate.push(rigaAggiungiData(foglioData));
    pagina.append(e("section", {class: "lista-blocco"}, [
      testaGruppoTasto("LE TUE DATE", () => spingi("date/apri")),
      e("div", {class: "lista"}, righeDate)
    ]));

    /* ── I tuoi acquisti (E13·B) ── */
    const acquisti = bloccoAcquisti(d.s);
    if(acquisti) pagina.append(acquisti);

    /* ── Fodera ── */
    const f = FODERE.find(x => x.id === (d.s.preferenze || {}).fodera) || FODERE[0];
    pagina.append(lista("Fodera", [
      cella({titolo: "Il cofanetto", sotto: f.nome,
        pastiglia: "background:" + f.tinta,
        etichetta: "La fodera del cofanetto, adesso " + f.nome,
        suClick: () => spingi("fodera/apri")})
    ]));

    /* ── Il resto ── */
    pagina.append(lista(null, [
      cella({titolo: "Impostazioni", suClick: () => spingi("impostazioni/apri")}),
      cella({titolo: "I tuoi dati",  suClick: () => spingi("dati/apri")}),
      cella({titolo: "Il negozio",   coda: NEGOZIO.citta,
        suClick: () => spingi("profilo-negozio/apri")}),
      cella({titolo: "Aiuto",        suClick: () => spingi("aiuto/apri")})
    ]));

    pagina.append(pieVersione(c.tessera));
  }

  /* ══ IL PIE' — E QUELLO CHE C'E' SOTTO ══════════════════════════
     «Regina Jewels 1.0 · RJ 00042» è la firma in fondo al Profilo.
     Cinque tocchi entro due secondi aprono la DIAGNOSTICA: è il
     pattern «Info su» di iOS, dove il numero di build si tocca finché
     non si apre quello che serve a chi ripara.
     PERCHÉ ESISTE. Il difetto dell'altezza non si riproduce in
     cornice: Chrome impagina onesto, iOS in standalone no, e fra i due
     non c'è un ponte. I numeri li ha in mano Massimo, e finora
     arrivavano come fotografie da misurare a mano. Qui si leggono, si
     copiano e si mandano.
     NON È UNA FUNZIONE DEL COFANETTO. Non ha segno, non ha cella, non
     ha voce nella barra: si apre solo se la si cerca, e chi non la
     cerca non la trova mai. Per questo il pie' resta uno `span` e non
     diventa un comando — un `button` in fondo al Profilo direbbe al
     cliente che lì c'è qualcosa da fare. */
  const WA_DIAGNOSTICA = "393208599301";   /* il telefono di Massimo, non il negozio */

  function pieVersione(tess){
    const n = e("span", {class: "t-foot f6-pie",
      testo: "Regina Jewels 1.0 · " + (tess || "")});
    let colpi = 0, primo = 0;
    n.addEventListener("click", () => {
      const ora = Date.now();
      if(ora - primo > 2000){ colpi = 0; primo = ora; }
      colpi++;
      if(colpi >= 5){ colpi = 0; primo = 0; foglioDiagnostica(); }
    });
    return n;
  }

  function foglioDiagnostica(){
    const d = window.__diagnostica ? window.__diagnostica()
            : {righe: [["diagnostica", "il telaio non la espone"]], testo: ""};
    const registro = e("dl", {class: "f6-diag"});
    for(const [k, v] of d.righe){
      registro.append(e("dt", {testo: k}));
      registro.append(e("dd", {testo: String(v)}));
    }
    /* I DUE COMANDI STANNO NEL CONTENUTO, non accanto al titolo: il
       posto dell'azione del foglio ne tiene UNA, e queste sono due
       strade pari — una porta il testo negli appunti, l'altra lo porta
       via dal telefono. */
    const tasti = e("div", {class: "f6-diag-tasti"}, [
      tasto("Copia", {tipo: "secondario", suClick: () => {
        const scritto = (navigator.clipboard && navigator.clipboard.writeText)
          ? navigator.clipboard.writeText(d.testo)
          : Promise.reject(new Error("niente appunti"));
        scritto.then(() => toast("Copiata"))
               .catch(() => toast("Gli appunti non rispondono"));
      }}),
      tasto("WhatsApp", {tipo: "primario", suClick: () => {
        location.href = "https://wa.me/" + WA_DIAGNOSTICA +
                        "?text=" + encodeURIComponent(d.testo);
      }})
    ]);
    const dentro = e("div", {class: "f6-foglio"}, [
      e("p", {class: "t-sub tenue", testo:
        "I numeri di questo iPhone, come li dichiara adesso. Servono a capire perché l'applicazione si impagina diversa da come si vede in prova."}),
      /* I COMANDI STANNO SOPRA IL REGISTRO. Le righe sono venticinque e
         su un telefono finiscono sotto il bordo: se «Copia» sta in
         fondo, per copiare bisogna prima scorrere tutto quello che si
         vuole copiare. Qui l'elenco è la PROVA, non la lettura. */
      tasti,
      registro
    ]);
    apriFoglio({titolo: "Diagnostica", fermo: "alto", contenuto: dentro});
  }

  /* ══ R1 · CREDITO E LIVELLO ════════════════════════════════════ */
  function schermoCredito(dove){
    const d = conti();
    /* LA SOMMA È IL TITOLO GRANDE: Bodoni 34, cifre tabulari, e quando
       si scorre passa da sola nella barra compatta. Non si ripete
       sotto. */
    const pagina = schermo(dove, {titolo: soldi(d.credito), indietro: torna,
      etichettaIndietro: "Profilo"});

    /* IL MARCHIO, NON LA FIRMA A TESTO. Sotto la somma c'era la parola
       «Regina» in Bodoni corsivo: un marchio ridotto a testo, che il
       canone di Massimo vieta (come «REGINA» in Inter l'avrebbe
       vietato) — non conta la famiglia scelta, conta che sia lettering
       al posto del segno. Qui va il marchio vero, quello che apre la
       tessera (`marchio.png`, `app/ui/tessera.js`), a un'altezza che lo
       tiene leggibile: non un monogramma, non un pittogramma. */
    pagina.append(e("img", {class: "f6-marchio", src: "marchio.png",
      alt: "Regina Jewels", decoding: "async"}));

    /* IL BLOCCO DEI LIVELLI, IN CIMA (richiesta di Massimo, 21/09): chi
       tocca la riga del livello in radice arriva qui per vedere TUTTI i
       livelli — se quella risposta sta sotto lo storico dei movimenti,
       la prima cosa che legge è un mese di acquisti, non i livelli che
       è venuto a cercare. Il registro resta intero, solo più sotto. */
    pagina.append(e("span", {class: "occhiello foot f6-occhiello-livello",
      testo: d.attuale
        ? "Livello " + d.attuale.nome + " · " + d.attuale.sconto + "%"
        : "Livello"}));

    /* LA SCALA. Quattro righe, tre stati, e il gradino sotto resta. */
    pagina.append(lista(null, (d.s.livelli || []).map((l, i) => {
      const r = cella({
        titolo: l.nome + " · " + l.sconto + "%",
        coda: i < d.indice ? "passato"
            : i === d.indice ? "sei qui"
            : "da " + soldi(l.soglia)
      });
      r.classList.add("f6-liv",
        i < d.indice ? "passato" : i === d.indice ? "qui" : "avanti");
      if(i === d.indice) r.setAttribute("aria-current", "true");
      return r;
    })));

    /* IL PROGRESSO, IN PAROLE. Mai una percentuale, mai un countdown:
       euro, che è l'unica unita' che la persona può verificare. */
    const parole = d.prossimo
      ? "Sei a " + soldi(d.speso) + " · al " + d.prossimo.nome +
        " mancano " + soldi(d.manca)
      : "Sei a " + soldi(d.speso) + " · sei al livello più alto";
    const quota = quotaFilo(d.speso, d.prossimo);
    pagina.append(e("div", {class: "f6-avanzamento"}, [
      e("span", {class: "t-sub f6-parole", testo: parole}),
      e("span", {class: "f6-filo", role: "img",
        "aria-label": parole,
        stile: "--quota:" + quota.toFixed(1) + "%"}, [e("i", {})])
    ]));

    /* IL REGISTRO, SOTTO I LIVELLI. È la risposta a «da dove vengono
       questi 25 euro?», e resta subito leggibile — solo che adesso i
       livelli, che sono ciò che si è venuti a cercare dal tocco sulla
       radice, non stanno più sotto un mese di movimenti. */
    for(const mese of perMese(d.mov)){
      pagina.append(lista(mese.titolo, mese.righe.map(m => {
        const v = vociMovimento(m, d.c.tessera);
        const meno = (m.importo | 0) < 0;
        const sotto = [giornoEMese(m.data),
                       meno ? "in negozio" : "da Regina",
                       v.regola].filter(Boolean).join(" · ");
        const r = cella({titolo: v.titolo, sotto,
          coda: (meno ? "−" : "+") + soldi(Math.abs(m.importo | 0))});
        r.classList.add("f6-mov");
        if(meno) r.classList.add("meno");
        const coda = r.querySelector(".coda");
        if(coda) coda.classList.add("cifra");
        return r;
      })));
    }

    pagina.append(e("h2", {class: "occhiello foot lista-testa", testo: "Come funziona"}));
    const p = d.attuale ? d.attuale.sconto : 2;
    pagina.append(e("div", {class: "f6-regola"}, [
      e("p", {class: "t-sub", testo:
        "Ogni acquisto in negozio lascia il " + p + "% in credito."}),
      e("p", {class: "t-sub", testo:
        "Il credito si spende in negozio, su qualsiasi pezzo."}),
      e("p", {class: "t-sub", testo:
        "Non scade finché passi almeno una volta l’anno."})
    ]));
  }

  /* ══ R2 · LE TUE DATE ══════════════════════════════════════════ */
  function schermoDate(dove){
    const d = conti();
    const pagina = schermo(dove, {titolo: "Le tue date", indietro: torna,
      etichettaIndietro: "Profilo"});

    const date = dateUnite(d.s, OGGI);
    const righe = date.length
      ? date.map(x => rigaData(x, () => ridisegnaSchermo(dove, schermoDate)))
      : [e("div", {class: "cella due piatta"}, [
          e("div", {class: "testo"}, [
            e("b", {testo: "Ancora nessuna data"}),
            e("span", {testo: "Compleanni e anniversari: te li ricordiamo noi."})
          ])
        ])];
    righe.push(rigaAggiungiData(foglioData));
    pagina.append(lista(null, righe));
    pagina.append(e("span", {class: "t-foot f6-pie-gruppo",
      testo: "L’avviso arriva solo se hai acceso «Le tue date» in Impostazioni."}));

    /* GLI ANNIVERSARI DEI PEZZI — righe che si scrivono da sole. */
    const ann = anniversariPezzi(d.s, OGGI);
    if(ann.length){
      const pref = (leggi().date || DATE_VUOTE).pezzi || {};
      pagina.append(gruppoInterruttori("Gli anniversari dei tuoi pezzi", ann.map(a =>
        rigaInterruttore({
          titolo: (NUMERO_ANNI[a.anni] || a.anni + " anni") + " di " + a.nome,
          sotto: giornoEMese(a.quando),
          acceso: !!pref[a.id],
          suCambio: (v) => {
            azione("date/avviso", {pezzo: a.id, acceso: v});
            annuncia(v ? "Avviso acceso per " + a.nome
                       : "Avviso spento per " + a.nome);
          }
        }))));
      pagina.append(e("span", {class: "t-foot f6-pie-gruppo",
        testo: "Si scrivono da sole, dal giorno in cui il pezzo è entrato. Nessun avviso, se non lo accendi."}));
    }
  }

  function rigaData(x, poi){
    const r = e("div", {class: "cella piatta due f6-data-riga", stile: "gap:12px"}, [
      badgeCalendario(x.quando),
      e("div", {class: "testo"}, [
        e("b", {testo: nomeData(x)}),
        e("span", {testo: "avviso " + testoAvviso(x.avviso)})
      ]),
      e("button", {type: "button", class: "f6-togli", testo: "Togli",
        "aria-label": "Togli " + nomeData(x),
        suClick: () => {
          const copia = {...x};
          azione("date/togli", {id: x.id});
          annuncia(nomeData(x) + " tolta.");
          toast("Data tolta", {annulla: () => {
            azione(copia.dal_negozio ? "date/rimetti" : "date/aggiungi",
                   copia.dal_negozio ? {id: copia.id} : copia);
            poi();
          }});
          poi();
        }})
    ]);
    return r;
  }

  /* IL FOGLIO «UNA DATA». Mezza altezza, due tocchi: il tipo e la
     ruota. L'avviso ha già il suo valore giusto (due settimane) e non
     si tocca se va bene — un default che va bene è un tocco in meno.
     Non ha indirizzo: un <dialog> non è uno strato della pila. */
  function foglioData(){
    let tipo = "compleanno";
    let quando = "";
    let avviso = AVVISO_DEFAULT;
    let nome = "";

    const chips = e("div", {class: "f6-chips"},
      TIPI_DATA.map(t => e("button", {
        type: "button", class: "f6-chip", "aria-pressed": String(t.id === tipo),
        suClick: (ev) => {
          tipo = t.id;
          for(const b of chips.children)
            b.setAttribute("aria-pressed", String(b === ev.currentTarget));
          /* si nasconde il BLOCCO, non il campo: `[hidden]` è una
             regola del browser, e `.campo{display:block}` — che è
             nostra — la scavalcherebbe. Un `<div>` nudo non ha regole
             nostre, quindi `hidden` funziona come dice il nome. */
          boxNome.hidden = !TIPI_DATA.find(x => x.id === tipo).chiede;
          aggiorna();
        }
      }, [e("span", {testo: t.nome})])));

    const campoNome = e("input", {
      class: "campo", type: "text", placeholder: "Di chi? (facoltativo)",
      maxlength: "30", "aria-label": "Di chi è la data"
    });
    campoNome.addEventListener("input", () => { nome = campoNome.value.trim(); });

    const campoData = e("input", {
      class: "campo f6-data", type: "date", "aria-label": "Il giorno"
    });
    campoData.addEventListener("input", () => { quando = campoData.value; aggiorna(); });
    campoData.addEventListener("change", () => { quando = campoData.value; aggiorna(); });

    const seg = e("div", {class: "f6-seg", role: "group",
      "aria-label": "Quando avvisarti"},
      AVVISI.map(a => e("button", {
        type: "button", "aria-pressed": String(a.g === avviso),
        "aria-label": "Avvisami " + a.lungo,
        suClick: (ev) => {
          avviso = a.g;
          for(const b of seg.children)
            b.setAttribute("aria-pressed", String(b === ev.currentTarget));
        }
      }, [e("span", {testo: a.corto})])));

    const fine = tasto("Fine", {tipo: "primario", largo: true, suClick: salva});
    fine.disabled = true;

    function aggiorna(){ fine.disabled = !quando; }

    function salva(){
      if(!quando) return;
      const dato = {
        id: "d-" + Date.now().toString(36),
        tipo, nome,
        giorno: +quando.slice(8, 10), mese: +quando.slice(5, 7),
        anno: +quando.slice(0, 4), avviso
      };
      azione("date/aggiungi", dato);
      chiudiFoglio();
      annuncia(nomeData(dato) + " aggiunta, avviso " + testoAvviso(avviso) + ".");
      toast("Data aggiunta", {annulla: () => {
        azione("date/togli", {id: dato.id});
        aggiornaDate();
      }});
      aggiornaDate();
    }

    const boxNome = e("div", {},
      [e("span", {class: "t-foot f6-eti", testo: "Di chi"}), campoNome]);
    /* «FINE» NON STA DENTRO CIÒ CHE SCORRE (corretto 21/09). Un primo
       tentativo lo fissava con `position:sticky` DENTRO lo stesso
       flusso dei campi: a 393x852 i campi arrivano quasi al bordo del
       fermo da soli, e il tasto incollato in fondo finiva SOPRA
       l'ultimo campo (Avvisami) invece che sotto — sovrapposto, non
       tagliato, ma comunque sbagliato (visto nello screenshot).
       La cura è tenere i due ruoli SEPARATI: `.f6-campi` è la zona che
       scorre (i quattro campi, altezza libera), `fine` sta FUORI, un
       fratello suo — non dentro il suo flusso — e per questo ha
       SEMPRE il suo spazio, mai conteso. */
    const campi = e("div", {class: "f6-campi"}, [
      e("div", {}, [e("span", {class: "t-foot f6-eti", testo: "Che cos’è"}), chips]),
      boxNome,
      e("div", {}, [e("span", {class: "t-foot f6-eti", testo: "Il giorno"}), campoData]),
      e("div", {}, [e("span", {class: "t-foot f6-eti", testo: "Avvisami"}), seg])
    ]);
    const dentro = e("div", {class: "f6-foglio f6-foglio-data"}, [campi, fine]);
    boxNome.hidden = !TIPI_DATA.find(x => x.id === tipo).chiede;
    apriFoglio({titolo: "Una data", contenuto: dentro, fermo: "basso"});
  }

  /* ══ R3 · LA FODERA ════════════════════════════════════════════ */
  function schermoFodera(dove){
    const pagina = schermo(dove, {titolo: "Fodera", indietro: torna,
      etichettaIndietro: "Profilo"});
    const attuale = () => (leggi().preferenze || {}).fodera || FODERE[0].id;

    /* IL COFANETTO È QUELLO VERO, APERTO, NELLA VESTE SCELTA.
       Il trapezio disegnato in CSS che stava qui è stato bocciato dal
       critic, e aveva ragione: non era lo stesso oggetto della scena in
       tre dimensioni, era un disegno che gli somigliava. Adesso è il
       render di `app/dati/cofanetto.js` — la stessa fotografia, la
       stessa macchina, le stesse quattro vesti — e si vede APERTO,
       perché un cofanetto chiuso non mostra la fodera, che è l'unica
       cosa che questa schermata serve a scegliere.
       Il cofanetto in CSS resta come ripiego finché le immagini non
       sono arrivate: la schermata non deve mai essere vuota. */
    const cof = e("div", {class: "f1-cof", "data-fodera": attuale(),
      "aria-hidden": "true"}, [
      e("div", {class: "f1-cof-scatola"}, [
        e("i", {class: "f1-cof-fodera"}),
        e("i", {class: "f1-cof-luce"})
      ]),
      e("div", {class: "f1-cof-fuori"}, [
        e("div", {class: "f1-cof-coperchio"}, [
          e("i", {class: "f1-cof-bordo"}),
          e("img", {class: "f1-cof-marchio", src: "marchio.png", alt: "",
                    decoding: "async"})
        ])
      ])
    ]);
    const posto = e("div", {class: "f6-cofanetto"}, [cof]);
    pagina.append(posto);

    /* LE QUATTRO IMMAGINI, UNA SOPRA L'ALTRA, e solo quella scelta
       accesa: il cambio è una DISSOLVENZA da 250, non uno scatto. Una
       scatola che cambia colore di colpo sembra un'altra scatola; una
       che si dissolve è la stessa che si riveste. Si montano tutte e
       quattro perché la seconda scelta dev'essere immediata quanto la
       prima — sono 4 file leggeri, e la persona le proverà tutte. */
    let vestiRender = null;
    (async () => {
      try{
        const m = await import("app/dati/cofanetto.js");
        const C = m.COFANETTO || m.default;
        if(!C || !C.aperto) return;
        const dentro = new URL("../", import.meta.url);
        const dove = (f) => new URL((C.radice || "./dati/cofanetto/") + f, dentro).href;
        const strati = {};
        const scena = e("div", {class: "f6-render", "aria-hidden": "true"});
        await Promise.all(FODERE.map(f => new Promise((ok) => {
          const nome = C.aperto[f.id];
          if(!nome) return ok();
          const i = new Image();
          i.decoding = "async"; i.alt = "";
          i.className = "f6-strato";
          i.onload = () => ok(); i.onerror = () => ok();
          i.src = dove(nome);
          strati[f.id] = i;
          scena.append(i);
        })));
        if(!Object.keys(strati).length || !posto.isConnected) return;
        posto.replaceChildren(scena);
        vestiRender = (id) => {
          for(const k in strati) strati[k].classList.toggle("su", k === id);
        };
        vestiRender(attuale());
      }catch(_){ /* resta il cofanetto in CSS: è il ripiego */ }
    })();

    const capsule = e("div", {class: "f6-fodere", role: "group",
      "aria-label": "Il colore della fodera"},
      FODERE.map(f => e("button", {
        type: "button", class: "f6-fodera",
        "aria-pressed": String(f.id === attuale()),
        "aria-label": "Fodera " + f.nome,
        suClick: () => {
          /* niente toast: il cambio SI VEDE. Un avviso che ripete cio'
             che l'occhio ha già letto è rumore (49 §2). */
          invia("preferenze/fodera", {fodera: f.id});
          cof.dataset.fodera = f.id;
          if(vestiRender) vestiRender(f.id);
          for(const b of capsule.children)
            b.setAttribute("aria-pressed",
              String(b.dataset.fodera === f.id));
          annuncia("Fodera " + f.nome + ".");
        }
      }, [
        e("span", {class: "f6-pastiglia", stile: "--f6-tinta:" + f.tinta}),
        e("b", {testo: f.nome})
      ])));
    for(let i = 0; i < capsule.children.length; i++)
      capsule.children[i].dataset.fodera = FODERE[i].id;
    pagina.append(capsule);

    pagina.append(e("span", {class: "t-foot f6-nota",
      testo: "Cambia il cofanetto e la tessera. Non c’è niente da salvare."}));
  }

  /* ══ R4 · IMPOSTAZIONI ═════════════════════════════════════════ */
  function schermoImpostazioni(dove){
    const pagina = schermo(dove, {titolo: "Impostazioni", indietro: torna,
      etichettaIndietro: "Profilo"});

    const n = leggi().notifiche_pref || NOTIFICHE_SPENTE;
    const VOCI = [
      ["date", "Le tue date", "Compleanni, anniversari, ricorrenze."],
      ["collezioni", "Arrivi che chiudono una collezione", "Solo il pezzo che ti manca."],
      ["negozio", "Il negozio", "Quando c’è qualcosa da sapere."]
    ];
    pagina.append(gruppoInterruttori("Notifiche", VOCI.map(([k, t, s]) =>
      rigaInterruttore({
        titolo: t, sotto: s, acceso: !!n[k],
        suCambio: (v) => {
          azione("notifiche/preferenza", {tipo: k, acceso: v});
          annuncia(t + (v ? " accese." : " spente."));
        }
      }))));
    pagina.append(e("span", {class: "t-foot f6-pie-gruppo",
      testo: "Al massimo una a settimana. Qui salvi solo la preferenza: il permesso te lo chiede il telefono alla prima notifica, non adesso."}));

    /* I TUOI DATI */
    const canc = cella({titolo: "Cancella il cofanetto da questo iPhone",
      suClick: foglioCancella});
    canc.classList.add("f6-pericolo");
    pagina.append(lista("I tuoi dati", [
      cella({titolo: "Cosa sappiamo di te", suClick: () => spingi("dati/apri")}),
      canc
    ]));
    /* FONTE UNICA (E14·B, testo 1, 21/09): la frase intera di privacy
       vive SOLO in «Cosa sappiamo di te». Qui restava una copia
       identica, la stessa ripetuta anche in «I tuoi dati» — un rimando
       breve basta, e porta alla pagina che risponde. */
    pagina.append(e("button", {type: "button", class: "f6-privacy-link",
      suClick: () => spingi("dati/apri")}, [
      e("span", {testo: "La tua privacy"}),
      segno("chevron", {misura: 12, classe: "frec"})
    ]));

    pagina.append(lista("Il negozio", [
      cella({titolo: NEGOZIO.nome, sotto: NEGOZIO.via + ", " + NEGOZIO.citta,
        suClick: () => spingi("profilo-negozio/apri")})
    ]));
    pagina.append(lista("Aiuto", [
      cella({titolo: "Domande frequenti", suClick: () => spingi("aiuto/apri")})
    ]));
    pagina.append(pieVersione(cliente().tessera));
  }

  /* IL FOGLIO DELLA CANCELLAZIONE. È l'unico posto dell'app dove un
     foglio chiede una conferma, e ci sta: cancellare è un DOCUMENTO da
     leggere, non un tocco da dare. La riga che conta è la seconda: i
     pezzi non si perdono, restano in negozio. */
  function foglioCancella(){
    /* COERENZA DISTRUTTIVA (E15·B, 21/09): la riga che apre questo
       foglio è rossa (`.f6-pericolo`), e prima il tasto di conferma era
       turchese — due colori per la stessa azione. Il canone del
       Registro (16/09) vale anche qui: «il colore porta UN solo
       significato». Il tasto diventa `.pericolo`, stesso `--errore`
       della riga che l'ha aperto. */
    const bCancella = tasto("Cancella il cofanetto", {tipo: "primario", largo: true,
      suClick: () => {
        invia("demo/reset", {seme: store.seme});
        chiudiFoglio();
        /* `?reset=1` è il parametro che `app/stato.js` legge all'avvio
           per cancellare la chiave e ripartire dal seme. `replace` e
           non `assign`: cancellare non è un passo della cronologia. */
        location.replace(location.pathname + "?reset=1");
      }});
    bCancella.classList.add("pericolo");
    const dentro = e("div", {class: "f6-foglio"}, [
      e("p", {class: "t-body", testo:
        "Il cofanetto sparisce da questo iPhone: le date che hai messo, la fodera che hai scelto, quello che hai guardato."}),
      e("p", {class: "t-sub tenue", testo:
        "I pezzi restano in negozio: rientri col codice, e ritrovi tutto."}),
      bCancella,
      /* «Annulla», non «Lascia stare» (E15·B, lessico Apple, 21/09):
         è la parola che iOS usa nel tasto gemello di ogni conferma
         distruttiva — «Lascia stare» è un registro colloquiale che qui
         non ha pari altrove nell'app. */
      tasto("Annulla", {tipo: "terziario", suClick: chiudiFoglio})
    ]);
    apriFoglio({titolo: "Cancellare il cofanetto?", contenuto: dentro,
      fermo: "basso"});
  }

  /* ══ COSA SAPPIAMO DI TE ═══════════════════════════════════════ */
  function schermoDati(dove){
    const d = conti();
    const pagina = schermo(dove, {titolo: "I tuoi dati", indietro: torna,
      etichettaIndietro: "Profilo"});
    const date = dateUnite(d.s, OGGI);
    const pezzi = (d.s.esemplari || []).filter(x => x && !x.rimosso &&
      x.stato !== "venduto").length;

    pagina.append(e("p", {class: "t-body f6-dati-testa", testo:
      "Quattro cose, e nessuna in più."}));
    pagina.append(lista(null, [
      cella({titolo: "Il codice della tessera", sotto: d.c.tessera || "—"}),
      cella({titolo: "Il nome per l’incisione",
        sotto: d.c.nome_incisione || d.c.nome || "—"}),
      cella({titolo: "Le date che hai messo",
        sotto: date.length + (date.length === 1 ? " data" : " date")}),
      cella({titolo: "I pezzi presi in negozio",
        sotto: pezzi + (pezzi === 1 ? " pezzo" : " pezzi")})
    ]));
    pagina.append(e("span", {class: "t-foot f6-pie-gruppo",
      testo: "Solo il negozio vede il tuo cofanetto. Nessun tracciamento, nessuna pubblicità, nessun account."}));
  }

  /* ══ IL NEGOZIO ════════════════════════════════════════════════ */
  function schermoNegozio(dove){
    const pagina = schermo(dove, {titolo: NEGOZIO.nome, indietro: torna,
      etichettaIndietro: "Profilo"});
    pagina.append(e("p", {class: "t-body f6-dati-testa",
      testo: NEGOZIO.via + ", " + NEGOZIO.citta}));
    pagina.append(lista(null, [
      cella({titolo: "Chiama", sotto: NEGOZIO.telefono_detto,
        suClick: () => { location.href = "tel:" + NEGOZIO.telefono; }}),
      cella({titolo: "WhatsApp", sotto: "Scrivi al banco",
        suClick: () => apriWhatsApp("Ciao Regina, sono " +
          (cliente().nome || "") + " · " + (cliente().tessera || "") + ". ")})
    ]));
    pagina.append(lista("Orari", orariLeggibili(NEGOZIO).map(o =>
      cella({titolo: o.g, coda: o.f}))));
    pagina.append(e("span", {class: "t-foot f6-pie-gruppo",
      testo: "Via e orari sono da confermare con il negozio."}));
  }
  /* l'indirizzo lo costruisce `dati/negozio.js`: un
     `encodeURIComponent` dimenticato una volta sola tronca il messaggio
     al primo «&», e quel difetto si scopre dal cliente. */
  function apriWhatsApp(testo){
    const u = waNegozio(testo);
    try{ window.open(u, "_blank", "noopener"); }catch(_){ location.href = u; }
  }

  /* ══ AIUTO ═════════════════════════════════════════════════════ */
  function schermoAiuto(dove){
    const pagina = schermo(dove, {titolo: "Aiuto", indietro: torna,
      etichettaIndietro: "Profilo"});
    pagina.append(e("div", {class: "f6-faq"}, FAQ.map(([q, a]) =>
      e("details", {}, [
        e("summary", {}, [e("span", {testo: q}), segno("chevron", {misura: 14})]),
        e("p", {testo: a})
      ]))));
    pagina.append(e("div", {class: "colonna-tasti"}, [
      tasto("Segnala su WhatsApp", {tipo: "secondario", largo: true,
        suClick: () => apriWhatsApp("Ciao Regina, sono " +
          (cliente().nome || "") + " · " + (cliente().tessera || "") +
          ". Ho un problema con: ")})
    ]));
    /* IL DISTACCO DAL TASTO (corretto 21/09). `.f6-pie-gruppo` porta un
       margine NEGATIVO (-14px): serve a riavvicinare la nota quando
       sopra c'è una `lista()`, che ha già il suo spazio sotto. Qui
       sopra c'è un `tasto`, non una lista — lo stesso margine negativo
       mordeva dentro il tasto e la nota gli finiva sopra. La classe
       aggiuntiva `.f6-pie-dopo-tasto` inverte solo QUESTO margine, senza
       toccare le altre cinque righe che usano `.f6-pie-gruppo`. */
    pagina.append(e("span", {class: "t-foot f6-pie-gruppo f6-pie-dopo-tasto",
      testo: "Il messaggio parte già col tuo codice: al banco sanno chi sei."}));
  }

  /* ══ IL PEZZO DI UI CHE MANCA AL SISTEMA: L'INTERRUTTORE ═══════
     51 x 31 come su iOS; il bersaglio è tutta la riga, così si tocca
     il nome e l'interruttore risponde — è così che si comporta
     Impostazioni. `role="switch"` con `aria-checked`: è il ruolo che
     VoiceOver legge come «attivato/disattivato». */
  function rigaInterruttore(opz){
    let acceso = !!opz.acceso;
    const int = e("span", {class: "f6-int", "aria-hidden": "true"}, [e("i", {})]);
    const r = e("button", {
      type: "button", class: "cella due f6-int-riga",
      "aria-checked": String(acceso),
      suClick: () => {
        acceso = !acceso;
        r.setAttribute("aria-checked", String(acceso));
        if(opz.suCambio) opz.suCambio(acceso);
      }
    }, [
      e("div", {class: "testo"}, [
        e("b", {testo: opz.titolo}),
        opz.sotto ? e("span", {testo: opz.sotto}) : null
      ]),
      int
    ]);
    /* IL RUOLO SI METTE A MANO, E DOPO. Due ragioni, e tutt'e due sono
       difetti già pagati: `e()` passa `role` dal ramo `k in n` — cioè
       dalla riflessione ARIA, che non tutti i motori hanno, e dove non
       c'è l'attributo non viene scritto; e `lista()` di `ui/cella.js`
       scrive `role="listitem"` su OGNI figlio, cancellando quello che
       avessimo messo prima. Perciò gli interruttori non passano da
       `lista()` (vedi `gruppoInterruttori`) e il ruolo si scrive qui. */
    r.setAttribute("role", "switch");
    return r;
  }

  /* IL GRUPPO DI INTERRUTTORI. Stessa forma della lista raggruppata, ma
     senza `role="list"`: un `role="switch"` non è un `listitem`, e una
     lista di cose che non sono voci di lista è una lista che il lettore
     di schermo racconta sbagliata. Impostazioni di iOS, del resto, è
     un gruppo di controlli, non un elenco. */
  function gruppoInterruttori(titolo, righe, etichetta){
    const fuori = [];
    if(titolo) fuori.push(e("h2", {class: "occhiello foot lista-testa", testo: titolo}));
    const dentro = e("div", {class: "lista"}, righe);
    dentro.setAttribute("role", "group");
    if(etichetta || titolo) dentro.setAttribute("aria-label", etichetta || titolo);
    fuori.push(dentro);
    return e("section", {class: "lista-blocco"}, fuori);
  }

  /* ══ IL FOGLIO DELLA SALITA DI LIVELLO ═════════════════════════
     Grado medio (carta psicologica): la tessera si gira e cambia nome,
     una riga firmata, un tasto. Compare al PRIMO avvio dopo che il
     livello è salito, e una volta sola — non c'è una notifica
     dedicata: l'evento aspetta che l'app si apra.
     `?demo=livello` lo fa comparire facendo finta che il livello visto
     sia quello di sotto: così la prova mostra la salita VERA (quella
     che Lucia ha fatto arrivando al Secondo), non un livello inventato
     che dopo il foglio non esisterebbe più da nessuna parte. */
  let salitaFatta = false;
  function forseSalita(){
    if(salitaFatta) return;
    /* IL FOGLIO SALE SOLO QUANDO IL PROFILO È LA SEZIONE IN VISTA. La
       vista è montata da sempre — tutte e quattro lo sono — ma un
       foglio che si apre sopra il banco in tre dimensioni parla di una
       cosa che non si sta guardando, e per giunta ruba il top layer a
       chi stava aprendo un pezzo. Se non siamo qui, si aspetta: il
       richiamo arriva dal cambio di tab. */
    if(tabCorrente() !== "profilo") return;
    /* e nemmeno sopra un altro foglio: due <dialog> modali insieme sono
       due top layer sovrapposti, e da lì non si torna indietro. */
    const dlg = document.getElementById("foglio");
    if(dlg && dlg.open) return;
    const d = conti();
    if(!d.attuale) return;
    const demo = new URLSearchParams(location.search).get("demo") === "livello";
    let visto = livelloVisto();
    if(demo) visto = Math.max(0, d.indice - 1);
    if(visto === null || visto === undefined){
      /* primo avvio in assoluto: si prende nota e non si festeggia
         niente. Non si è saliti: si è entrati. */
      salitaFatta = true;
      azione("livello/visto", {livello: d.indice});
      return;
    }
    if(visto >= d.indice){ salitaFatta = true; return; }
    salitaFatta = true;
    azione("livello/visto", {livello: d.indice});
    foglioSalita(d);
  }

  function foglioSalita(d){
    const dati = datiTessera();
    const precedente = (d.s.livelli || [])[d.indice - 1];
    /* il fronte mostra ancora il livello di PRIMA: si gira, e cambia.
       È la stessa tessera di R0 e di S3 — non un oggetto costruito per
       la festa: il livello nuovo si vede sulla carta che si ha in
       tasca, ed è questo che lo rende vero. */
    const t = tessera({...dati, livello: precedente ? precedente.nome : dati.livello},
      {etichetta: "La tua tessera: tocca per girarla e vedere il livello nuovo."});
    /* IL RETRO, QUI, È IL LIVELLO NUOVO e non il codice a barre: una
       carta si gira per mostrare qualcosa, e stasera la cosa da
       mostrare è il gradino. */
    const retro = t.facciaRetro;
    retro.textContent = "";
    retro.append(e("div", {class: "f1-pass", "data-fodera": dati.fodera}, [
      e("div", {class: "f1-pass-dietro"}, [
        e("span", {class: "occhiello", testo: "Livello"}),
        e("b", {class: "t-1", testo: d.attuale.nome}),
        e("span", {class: "t-sub f1-pass-banco",
          testo: dati.nome + " · " + dati.codice})
      ])
    ]));

    /* IL TITOLO DEL FOGLIO È LA FRASE. Prima c'erano due titoli — «Un
       gradino» nell'<h2> del foglio e «Sei al Secondo.» dentro — e il
       secondo spingeva «Continua» sotto il fermo di mezza altezza: un
       tasto primario che si deve cercare scorrendo non è un primario.
       Un titolo solo, e il foglio torna a starci per intero.
       («Regina» in Bodoni corsivo non si ripete qui: la riga sotto È
       già firmata — dice chi riconosce cosa, che è il punto.) */
    const dentro = e("div", {class: "f6-salita"}, [
      t,
      e("span", {class: "t-sub f6-salita-riga",
        testo: "Regina ti riconosce il " + d.attuale.sconto + "% di ogni acquisto."}),
      tasto("Continua", {tipo: "primario", largo: true, suClick: chiudiFoglio})
    ]);
    apriFoglio({titolo: "Sei al " + d.attuale.nome + ".",
      contenuto: dentro, fermo: "basso"});
    /* la tessera si gira da sola dopo mezzo secondo: è la scena, e la
       scena la fa la pagina — non si chiede alla persona di scoprirla. */
    setTimeout(() => { try{ t.gira(); }catch(_){} }, RIDOTTO.matches ? 150 : 500);
  }

  /* ── IL RIDISEGNO DI UNO SCHERMO SPINTO ───────────────────────
     Uno strato spinto non si iscrive allo store: vive quanto la sua
     pila. Quando una sua riga cambia i dati (una data tolta), si
     ricostruisce lui, con la transizione di contenuto. */
  function ridisegnaSchermo(dove, fn){
    conTransizione(() => fn(dove));
  }
  /* e la radice: se l'elenco date è aperto sopra, si ridisegna anche
     quello che sta sotto, così tornando indietro non si trova la riga
     vecchia. */
  function aggiornaDate(){
    conTransizione(disegna);
    const spinto = document.querySelector(
      '.vista[data-vista="profilo"] .strato.spinto[data-rotta="date/apri"]');
    if(spinto) schermoDate(spinto);
  }

  /* ── L'AVVIO DELLA VISTA ──────────────────────────────────────── */
  disegna();
  store.iscrivi((s, ev, prima) => {
    if(ev.tipo === "nav/tab" && s.nav && s.nav.tab === "profilo")
      setTimeout(forseSalita, 260);
    if(!prima) return;
    if(ev.tipo === "demo/reset" ||
       s.cliente !== prima.cliente ||
       s.preferenze !== prima.preferenze ||
       s.movimenti_credito !== prima.movimenti_credito ||
       s.date !== prima.date ||
       s.ricorrenze !== prima.ricorrenze){
      conTransizione(disegna);
    }
  });

  /* il foglio della salita aspetta due cose: che la vista sia quella in
     scena, e che non ci sia già un foglio aperto. Il primo tentativo è
     all'avvio (per chi apre l'app direttamente su `#/profilo`), gli
     altri arrivano da ogni entrata nella sezione. */
  setTimeout(forseSalita, 700);

  /* UNA MANIGLIA SOLA, dichiarata, per le sonde di collaudo. */
  window.__profilo = {
    conti, dateUnite: () => dateUnite(conti().s, OGGI),
    notifiche: () => leggi().notifiche_pref || NOTIFICHE_SPENTE,
    date: () => leggi().date || DATE_VUOTE,
    livelloVisto, oggi: () => OGGI
  };
}

/* ── «DAL» O «DALL'» ──────────────────────────────────────────────
   «dal 8 marzo 2025» è un errore che si sente ad alta voce prima di
   vederlo. L'articolo si elide davanti a vocale, e in italiano gli
   unici giorni del mese che cominciano per vocale sono l'8 (otto) e
   l'11 (undici): «dall'8», «dall'11», e «dal» per tutti gli altri —
   l'1 no, si dice «primo». Sta qui e non in un `if` dentro la vista
   perché la stessa regola serve a ogni riga che dice una data.
   ESPORTATA: la usano anche le righe di servizio degli altri schermi
   il giorno che ne avranno una. */
export function daQuando(iso, articolo = "dal"){
  const g = aGiorni(iso);
  if(!isFinite(g)) return "";
  const giorno = new Date(g * 86400000).getUTCDate();
  const elide = giorno === 8 || giorno === 11;
  /* «dal» + «l'» = «dall'»; vale anche per «nel» → «nell'», «sul» →
     «sull'»: la preposizione articolata raddoppia la elle e poi elide. */
  return (elide ? articolo + "l’" : articolo + " ") + dataInParole(iso);
}

/* ── UNA DATA IN PAROLE, per la riga di servizio ──────────────────── */
function dataInParole(iso){
  const g = aGiorni(iso);
  if(!isFinite(g)) return "";
  const d = new Date(g * 86400000);
  return d.getUTCDate() + " " + nomeMese(d.getUTCMonth() + 1) + " " + d.getUTCFullYear();
}
