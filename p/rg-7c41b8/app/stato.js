/* ═══════════════════════════════════════════════════════════════════
   app/stato.js — LO STATO, uno solo, e si cambia solo mandandogli un
   evento. Nessuna vista tocca i dati: manda `invia("wishlist/aggiungi",
   …)` e aspetta di essere richiamata. È l'unica disciplina che tiene
   insieme quattro sezioni, un iframe in tre dimensioni e un foglio che
   scrive — senza la quale, fra due settimane, ognuno scrive dove capita.

   Persistenza: localStorage, chiave `regina:v1`, scritta con 50 ms di
   attesa perché dieci tocchi di fila non diventino dieci scritture su
   disco. La forma è {v, semeId, aggiornatoIl, dati} — la versione sta
   FUORI dai dati così la si legge senza doverli capire.
   ═══════════════════════════════════════════════════════════════════ */

export const CHIAVE = "regina:v1";
export const V = 5;                 /* la versione dello schema salvato */
export const CANALE = "regina";     /* il BroadcastChannel dell'app */

/* ── F1 · L'INGRESSO, VERSIONATO A SE' ─────────────────────────────
   Il ramo `ingresso` porta una PROPRIA versione (`v`) dentro lo stato
   già versionato, e non è un doppione: lo schema dello store cambia
   quando cambia la forma dei dati della persona, mentre questo cambia
   quando cambia il RITO d'ingresso — il giorno che le schermate
   diventano cinque, o che il codice non è più «RJ + 5», chi ha già
   fatto l'ingresso vecchio non deve rifarlo, ma il codice che lo legge
   deve sapere QUALE rito ha fatto. Le due cose si muovono a ritmi
   diversi, e due versioni separate costano una riga. */
export const V_INGRESSO = 1;

/* ── F6 · I TRE RAMI DELLA PERSONA ─────────────────────────────────
   Nascono vuoti e SPENTI. Le costanti stanno qui e non in
   `viste/profilo.js` per il motivo per cui ci sta tutto il resto: la
   forma dei dati la dichiara chi li tiene. `NOTIFICHE_SPENTE` fa anche
   da elenco dei tipi leciti — un `tipo` che non è una sua chiave non
   entra, e così un evento sbagliato non apre un ramo nuovo. */
export const DATE_VUOTE = {aggiunte: [], tolte: [], pezzi: {}};
export const NOTIFICHE_SPENTE = {date: false, collezioni: false, negozio: false};

/* ── F5b · IL RAMO DELLE PROPOSTE ──────────────────────────────────
   Il MOTORE sta in `app/motore/proposte.js` e non si importa qui: lo
   store non deve dipendere dal motore (e il motore, che gira in node
   senza store, non deve dipendere dallo store). I tre riduttori qui
   sotto sono COPIATI ALLA RIGA da `applicaVerdetto`, `pin` e `blocca`
   di quel file, e le prove `_MP_motore.mjs` provano che le due copie
   dicono la stessa cosa. Se un giorno divergono, quella sbagliata è
   questa: la verità del motore sta nel motore.

     verdetti [{articolo, regola, esito, quando, frase}]  uno per proposta
     rifiuti  {<articolo>: "aaaa-mm-gg"}                  «Non fa per me», 90 gg
     pin      [{articolo, motivo, chi, quando, abbina_a, in_cima, fino, cliente}]
     blocchi  [{articolo, motivo, chi, quando, cliente}]
     registro {regole:{<regola>:{mostrate,aperte,daparte,comprate,rifiuti,frasi}},
               mostrate:{<articolo>:{posto,regola,quando}},
               sessione:{id, rifiuti}}

   `mostrate` è la FRESCHEZZA (lo stesso pezzo non torna nello stesso
   posto prima di sette giorni) e `sessione.rifiuti` è il contatore che
   permette UNA rigenerazione dopo un «Non fa per me»: al secondo no la
   card si ferma, perché un no che rigenera all'infinito è una slot
   machine. */
export const ESITI_PROPOSTA = ["comprato", "da_parte", "aperto", "nessuno", "rifiuto"];
export const FORZA_ESITO = {comprato: 4, da_parte: 3, aperto: 2, nessuno: 1, rifiuto: 0};
export const registroProposteVuoto = () => ({regole: {}, mostrate: {}, sessione: {id: null, rifiuti: 0}});
export const PROPOSTE_VUOTE = () => ({
  verdetti: [], rifiuti: {}, pin: [], blocchi: [], registro: registroProposteVuoto()
});
/* la lettura difensiva del ramo: uno stato salvato da una versione
   vecchia, o un riduttore provato a mano, non deve far esplodere una
   vista per un `undefined`. */
function ramoProposte(s){
  const p = (s && s.proposte) || {};
  return {
    verdetti: p.verdetti || [],
    rifiuti: p.rifiuti || {},
    pin: p.pin || [],
    blocchi: p.blocchi || [],
    registro: {
      regole: (p.registro && p.registro.regole) || {},
      mostrate: (p.registro && p.registro.mostrate) || {},
      sessione: (p.registro && p.registro.sessione) || {id: null, rifiuti: 0}
    }
  };
}
const ingressoVuoto = () => ({
  v: V_INGRESSO,
  fatto: false,        /* true solo dopo S3 */
  codice: null,        /* «RJ 00042», come è stato digitato o ricevuto */
  nome: null,          /* il nome per l'incisione (S2) */
  ricorrenza: null,    /* la data data in S2, ISO */
  quando: null,        /* quando l'ingresso è stato chiuso, ISO */
  banner: null         /* quando il banner «in Home» è stato mostrato */
});

/* ── LE MIGRAZIONI, A CATENA ───────────────────────────────────────
   Ogni passo porta da una versione alla successiva e basta. Non si
   scrive mai «se vengo dalla 1 o dalla 2 allora…»: si scrive la 1→2 e
   la 2→3, e la catena fa il resto. */
const PASSI = {
  /* 0 → 1 : la prima forma. Qui non c'è ancora niente da spostare;
     resta come esempio della forma che avranno i passi veri. */
  0: (d) => d,
  /* 1 → 2 : arriva F1. Chi ha già usato l'app prima dell'ingresso NON
     deve vedersi la porta in faccia al primo aggiornamento: `fatto` a
     true, e l'ingresso si considera già avvenuto. La ritrovera' solo
     con `?reset=1`, che è esattamente cio' che quel parametro serve a
     fare. `ultimaApertura` resta nulla: senza una fotografia di prima
     non c'è nessun «cos'e' cambiato» da poter dire, e una riga di
     ritorno inventata è peggio di nessuna riga. */
  1: (d) => ({
    ...d,
    ingresso: {...ingressoVuoto(), fatto: true, quando: null},
    ultimaApertura: null,
    istantanea: null,
    ritorno: null
  }),
  /* 2 → 3 : LA FUSIONE. Fino a ieri tre rami vivevano fuori dallo
     store — le scadenze della messa da parte in memoria di sessione
     (F4), lo stato della lista in memoria (F4), i promemoria in una
     chiave di localStorage tutta loro (F5) — e F3 ne aggiunge altri
     tre (dediche, regali, assistenze). Sono SCELTE della persona, e una
     scelta che non sopravvive a un ricarico non è una scelta: è una
     schermata. Il passo non butta niente e non inventa niente: apre sei
     rami vuoti. Chi aveva messo un pezzo da parte prima di oggi lo
     ritrova in `wishlist` (quello c'era già); la sua SCADENZA no, ed è
     giusto così — una data che non è mai stata scritta non si
     ricostruisce a posteriori. */
  2: (d) => ({
    ...d,
    daparte: d.daparte || [],
    lista: d.lista || null,
    promemoria: d.promemoria || [],
    dediche: d.dediche || {},
    regali: d.regali || [],
    assistenze: d.assistenze || []
  }),
  /* 3 → 4 : F6. Le date che la persona AGGIUNGE (e quelle del negozio
     che toglie), l'avviso per l'anniversario di un pezzo, le tre
     preferenze di notifica e il livello di cui ha già visto la salita.
     Vivevano in tre chiavi di localStorage tutte loro
     (`regina:profilo:*`), e una scelta che sta fuori dallo stato è una
     scelta che nessuna vista può leggere: il foglio delle date le
     mostrava, il cofanetto no. Il passo non inventa niente — apre due
     rami vuoti e un livello non ancora visto. Chi aveva scritto qualcosa
     nel ponte NON se lo ritrova qui, ed è dichiarato: leggere una
     chiave provvisoria per travasarla vorrebbe dire tenerla viva per
     sempre, e il ponte muore oggi. */
  3: (d) => ({
    ...d,
    date: d.date || {aggiunte: [], tolte: [], pezzi: {}},
    notifiche_pref: d.notifiche_pref || {...NOTIFICHE_SPENTE},
    livello_visto: d.livello_visto === undefined ? null : d.livello_visto
  }),
  /* 4 → 5 : F5b, il motore delle proposte. Un ramo vuoto e basta: i
     verdetti, i rifiuti, i pin e il registro delle regole sono fatti
     che NON si possono ricostruire a posteriori — chi non ha mai detto
     «non fa per me» non ha detto di sì, e inventare un registro
     falserebbe il primo take-rate che il negozio legge. Chi aggiorna
     riparte da zero proposte mostrate, ed è la verità. */
  4: (d) => ({
    ...d,
    proposte: d.proposte || PROPOSTE_VUOTE()
  })
};
export function migra(dati, daV){
  let d = dati, v = daV;
  while(v < V){ const p = PASSI[v]; if(!p) return null; d = p(d); v++; }
  return d;
}

/* ── LA FORMA DEI DATI ─────────────────────────────────────────────
   Dal seme nascono i dati; la navigazione ci sta dentro perché le
   viste possano leggerla come tutto il resto, ma la verita' della
   navigazione resta l'indirizzo (vedi rotta.js): allo avvio il
   navigatore riscrive questi campi. */
function daSeme(seme){
  return {
    cliente: seme.cliente,
    livelli: seme.livelli || [],
    esemplari: (seme.esemplari || []).map(e => ({...e, rimosso:false})),
    movimenti_credito: seme.movimenti_credito || [],
    ricorrenze: seme.ricorrenze || [],
    wishlist: [...(seme.wishlist || [])],
    preferenze: {...(seme.preferenze || {})},
    notifiche: (seme.notifiche || []).map(n => ({...n})),
    arrivi: seme.arrivi || [],
    promozioni: seme.promozioni || [],
    /* ── I SEI RAMI DELLA FUSIONE (F3 · F4 · F5) ────────────────
       Nascono VUOTI anche quando il seme è pieno, e non è una
       dimenticanza: sono cio' che la persona FA, non cio' che il
       negozio le ha venduto. Il seme porta i pezzi; la dedica che ci
       scrive sopra, il regalo che ne fa, la riparazione che chiede e il
       promemoria che si mette sono suoi.
         daparte    [{id, dal, fino, stato}]   la riserva, con la data
         lista      {inviata_il, letta_da}     null finché non è partita
         promemoria [{id, articolo, quando, creato}]
         dediche    {<id esemplare>: {testo, quando, bloccata}}
         regali     [{id, canale, a, da, quando, aperto_il}]
         assistenze [{id, motivo, giorno, fascia, quando, stato}] */
    daparte: [],
    lista: null,
    promemoria: [],
    dediche: {},
    regali: [],
    assistenze: [],
    /* ── I TRE RAMI DI F6 ──────────────────────────────────────
       Stessa regola dei sei di sopra: il seme porta le ricorrenze che
       ha messo il NEGOZIO, e quelle restano in `ricorrenze`; qui c'è
       solo cio' che fa la persona — le date che aggiunge, quelle del
       negozio che toglie, gli anniversari dei pezzi che accende.
         date           {aggiunte:[{id,tipo,nome,giorno,mese,anno,avviso}],
                         tolte:[<id>], pezzi:{<id pezzo>: true}}
         notifiche_pref {date, collezioni, negozio}  nate SPENTE
         livello_visto  <indice> | null              mai festeggiato */
    date: {aggiunte: [], tolte: [], pezzi: {}},
    notifiche_pref: {...NOTIFICHE_SPENTE},
    livello_visto: null,
    /* F5b — le proposte. Nasce VUOTO anche col seme pieno, per la
       stessa ragione degli altri rami della persona: il seme porta i
       pezzi che il negozio le ha venduto, questo porta ciò che lei ha
       detto alle proposte e ciò che il negozio ha corretto a mano. */
    proposte: PROPOSTE_VUOTE(),
    /* F1 — la porta. Un cofanetto nuovo non è ancora stato aperto. */
    ingresso: ingressoVuoto(),
    /* F1.3 — il ritorno. `ultimaApertura` è QUANDO, `istantanea` è
       COM'ERA: la riga del ritorno nasce dalla differenza fra la
       fotografia di allora e i dati di adesso, non da un conteggio di
       giorni (la carta psicologica lo vieta: «mai giorni contati»). */
    ultimaApertura: null,
    istantanea: null,
    ritorno: null,
    nav: {tab:"cofanetto", pile:{cofanetto:[],vetrina:[],perte:[],profilo:[]}}
  };
}

/* ── IL RIDUTTORE ──────────────────────────────────────────────────
   Immutabile a un livello: si ricostruisce l'oggetto e si ricopia il
   solo ramo toccato. Non è purismo — è il motivo per cui un
   `iscrivi` può confrontare `prima.wishlist !== dopo.wishlist` e
   sapere in un colpo se deve ridisegnare. */
function riduci(s, e){
  const {tipo, dato} = e;
  switch(tipo){

    case "nav/tab":
      if(s.nav.tab === dato.tab) return s;
      return {...s, nav:{...s.nav, tab:dato.tab}};

    case "nav/push":{
      const p = {...s.nav.pile};
      p[dato.tab] = [...(p[dato.tab] || []), dato.rotta];
      return {...s, nav:{...s.nav, pile:p}};
    }
    case "nav/pop":{
      const p = {...s.nav.pile};
      p[dato.tab] = (p[dato.tab] || []).slice(0, -1);
      return {...s, nav:{...s.nav, pile:p}};
    }

    case "wishlist/aggiungi":
      if(s.wishlist.includes(dato.id)) return s;
      return {...s, wishlist:[...s.wishlist, dato.id]};
    case "wishlist/togli":
      if(!s.wishlist.includes(dato.id)) return s;
      return {...s, wishlist:s.wishlist.filter(x => x !== dato.id)};

    case "preferenze/fodera":
      if(s.preferenze.fodera === dato.fodera) return s;
      return {...s, preferenze:{...s.preferenze, fodera:dato.fodera}};

    case "esemplare/rimosso":
    case "esemplare/ripristinato":{
      const via = tipo === "esemplare/rimosso";
      let toccato = false;
      const es = s.esemplari.map(x => {
        if(x.id !== dato.id || x.rimosso === via) return x;
        toccato = true; return {...x, rimosso:via};
      });
      return toccato ? {...s, esemplari:es} : s;
    }

    case "notifica/letta":{
      let toccato = false;
      const nt = s.notifiche.map(n => {
        if(n.id !== dato.id || n.letta) return n;
        toccato = true; return {...n, letta:true};
      });
      return toccato ? {...s, notifiche:nt} : s;
    }

    /* ══ F1 · L'INGRESSO ═══════════════════════════════════════════
       Quattro eventi e non di più: il codice riconosciuto, le due
       risposte, la chiusura del rito, il banner visto. Le SCHERMATE non
       passano di qui — la schermata corrente è l'indirizzo
       (`#/ingresso/s2`), e un secondo posto dove scriverla sarebbe un
       secondo posto dove sbagliarla. */
    case "ingresso/codice":{
      if(s.ingresso.codice === dato.codice) return s;
      return {...s, ingresso:{...s.ingresso, codice:dato.codice}};
    }
    case "ingresso/dati":{
      const nome = dato.nome === undefined ? s.ingresso.nome : dato.nome;
      const ric  = dato.ricorrenza === undefined ? s.ingresso.ricorrenza : dato.ricorrenza;
      if(nome === s.ingresso.nome && ric === s.ingresso.ricorrenza) return s;
      /* SI TOCCA SOLO IL RAMO `ingresso`, e non anche `cliente`.
         S2 manda questo evento a OGNI TASTO (l'anteprima dell'incisione
         si aggiorna mentre si scrive), e `cliente` è il ramo che il
         profilo osserva per ridisegnarsi con una View Transition: una
         transizione per ogni lettera del nome significa dieci
         transizioni che si annullano a vicenda — e ognuna che si
         annulla lascia una promessa rifiutata. La copia nel cliente si
         scrive una volta sola, quando l'ingresso si chiude. */
      return {...s, ingresso:{...s.ingresso, nome, ricorrenza:ric}};
    }
    case "ingresso/fatto":{
      if(s.ingresso.fatto) return s;
      /* la ricorrenza data in S2 entra nell'elenco vero delle date: è
         il senso della domanda. `propria` resta indecisa — S2 non
         chiede QUALE data è (compleanno, anniversario), apposta. */
      const ric = s.ingresso.ricorrenza;
      const gia = (s.ricorrenze || []).some(r => r.id === "ric-ingresso");
      const ricorrenze = (ric && !gia)
        ? [...(s.ricorrenze || []), {
            id:"ric-ingresso", tipo:"data", titolo:"La tua data",
            giorno:+ric.slice(8,10), mese:+ric.slice(5,7), anno:+ric.slice(0,4),
            propria:true, nota:"scelta all'ingresso"}]
        : (s.ricorrenze || []);
      /* e ORA il nome per l'incisione entra nel cliente: da qui in poi
         è un suo dato, e le viste lo leggono di lì. */
      const cliente = s.ingresso.nome
        ? {...s.cliente, nome_incisione:s.ingresso.nome} : s.cliente;
      return {...s, ricorrenze, cliente,
        ingresso:{...s.ingresso, fatto:true, quando:dato.quando || null}};
    }
    case "ingresso/banner":
      return {...s, ingresso:{...s.ingresso, banner:dato.quando}};

    /* ══ F1.3 · L'APERTURA ═════════════════════════════════════════
       La manda `avvio.js` una volta sola per avvio, DOPO aver calcolato
       la differenza con la fotografia precedente. Qui si registra e
       basta: il calcolo ha bisogno di catalogo e collezioni, che lo
       store non conosce. */
    case "apertura/registra":
      return {...s, ultimaApertura:dato.quando,
        istantanea:dato.istantanea, ritorno:dato.ritorno || null};
    case "ritorno/letto":
      if(!s.ritorno) return s;
      return {...s, ritorno:null};

    /* == F4 . LA MESSA DA PARTE E LA LISTA =========================
       Arrivano da `viste/vetrina.js`, dove erano state scritte come
       funzioni pure apposta per poter essere trapiantate senza
       tradurle. Sono qui identiche: se un giorno divergono, la copia
       sbagliata è quella di la'.
       `fino` lo calcola CHI INVIA, non il riduttore: un riduttore che
       guarda l'orologio non è più puro e non si può più collaudare.
       `wishlist` resta com'era - `daparte` è un SUPERINSIEME con la
       data, e chi non lo conosce (viste/cofanetto.js) non se ne
       accorge. */
    case "daparte/aggiungi":{
      if((s.daparte || []).some(x => x.id === dato.id)) return s;
      return {...s,
        wishlist: s.wishlist.includes(dato.id) ? s.wishlist : [...s.wishlist, dato.id],
        daparte: [...(s.daparte || []),
                  {id:dato.id, dal:dato.dal, fino:dato.fino, stato:"attesa"}]};
    }
    case "daparte/togli":{
      if(!(s.daparte || []).some(x => x.id === dato.id) && !s.wishlist.includes(dato.id)) return s;
      return {...s,
        wishlist: s.wishlist.filter(x => x !== dato.id),
        daparte: (s.daparte || []).filter(x => x.id !== dato.id)};
    }
    /* il negozio ha visto la lista e l'ha confermata: è l'unico modo
       per passare da <In attesa> a <Da parte fino al ...> senza mentire.
       Oggi lo manderebbe il gestionale. */
    case "daparte/confermato":{
      let toccato = false;
      const l = (s.daparte || []).map(x => {
        if(x.id !== dato.id || x.stato === "confermato") return x;
        toccato = true; return {...x, stato:"confermato", fino: dato.fino || x.fino};
      });
      return toccato ? {...s, daparte:l} : s;
    }
    case "lista/inviata":{
      if(s.lista && s.lista.inviata_il) return s;
      return {...s, lista:{inviata_il:dato.quando, letta_da:dato.letta_da || null}};
    }

    /* == F5 . IL PROMEMORIA DI UN ARRIVO ===========================
       Da `viste/perte.js` (`riduciPromemoria`), identico. Idempotente
       apposta: <Ricordamelo> si tocca due volte, sempre. */
    case "promemoria/segna":{
      const pr = s.promemoria || [];
      if(!dato.id || pr.some(x => x.id === dato.id)) return s;
      return {...s, promemoria: [...pr, {
        id: dato.id,
        articolo: dato.articolo || null,
        quando: dato.quando || null,      /* il giorno in cui si avvisa, ISO */
        creato: dato.creato || null
      }]};
    }

    /* == F3 . LA CARTA E LE SUE AZIONI =============================
       Quattro eventi, e ognuno è un FATTO della vita del pezzo. La
       storia (`storiaDi`) non si scrive: si DERIVA da questi quattro
       più la data d'acquisto. Un registro tenuto a mano accanto ai
       fatti è un registro che prima o poi dice una cosa diversa dai
       fatti. */

    /* LA DEDICA È UN'INCISIONE. Sessanta caratteri, tagliati qui e non
       solo nel campo: un evento può arrivare dal canale, e un limite
       che vive solo nell'interfaccia non è un limite. Si riscrive
       finché il regalo non è stato aperto - da quel momento è
       incisa, e `bloccata` lo dice senza doverlo dedurre da uno stato
       di un'altra persona. */
    case "dedica/scrivi":{
      if(!dato.id) return s;
      const vecchia = (s.dediche || {})[dato.id] || null;
      if(vecchia && vecchia.bloccata) return s;
      const testo = String(dato.testo == null ? "" : dato.testo).slice(0, 60);
      if(vecchia && vecchia.testo === testo) return s;
      const dediche = {...(s.dediche || {})};
      if(!testo) delete dediche[dato.id];
      else dediche[dato.id] = {testo, quando: dato.quando || null, bloccata:false};
      return {...s, dediche};
    }

    /* IL REGALO CHE PARTE. Il pezzo NON esce dal cofanetto: si vela e
       porta <In attesa - per Giulia> (46 3.3). Resta fra i posseduti
       perché fino all'apertura è ancora suo - e l'unico stato che
       toglie un pezzo dal conto è <venduto>, che qui non si tocca. */
    case "regalo/invia":{
      if(!dato.id) return s;
      let toccato = false;
      const es = s.esemplari.map(x => {
        if(x.id !== dato.id || x.stato === "in_attesa") return x;
        toccato = true;
        return {...x, stato:"in_attesa", per: dato.a || null};
      });
      if(!toccato) return s;
      return {...s, esemplari:es,
        regali: [...(s.regali || []), {
          id: dato.id,
          canale: dato.canale === "link" ? "link" : "qr",
          a: dato.a || null,
          /* CHI DA' è chi sta usando l'app: si scrive adesso, perché
             quando l'altro aprira' il regalo questo nome dovra' stare
             sulla scena (<Da Marco>) e non si potrà più chiedere. */
          da: (s.cliente && (s.cliente.nome_incisione || s.cliente.nome)) || null,
          quando: dato.quando || null,
          aperto_il: null
        }]};
    }

    /* IL REGALO CHE SI APRE. Da qui il pezzo è di chi l'ha ricevuto:
       `da` è il nome di chi l'ha dato (dal registro, se c'è), e la
       dedica si blocca - un'incisione si scrive una volta. */
    case "regalo/ricevuto":{
      if(!dato.id) return s;
      const reg = (s.regali || []).filter(r => r.id === dato.id);
      const ultimo = reg.length ? reg[reg.length - 1] : null;
      const da = dato.da || (ultimo && ultimo.da) || null;
      let toccato = false;
      const es = s.esemplari.map(x => {
        if(x.id !== dato.id || x.stato === "ricevuto") return x;
        toccato = true;
        return {...x, stato:"ricevuto", per:null,
                da: da || x.da || null,
                regalo: true,
                ricevuto_il: dato.quando || null};
      });
      if(!toccato) return s;
      const regali = (s.regali || []).map(r =>
        (r.id === dato.id && !r.aperto_il) ? {...r, aperto_il: dato.quando || null} : r);
      const dediche = {...(s.dediche || {})};
      if(dediche[dato.id]) dediche[dato.id] = {...dediche[dato.id], bloccata:true};
      return {...s, esemplari:es, regali, dediche};
    }

    /* L'ASSISTENZA. Una riga, stato <inviata>, e nessun numero di
       ticket: la conferma la da' una persona su WhatsApp (46 3.4).
       Due richieste sullo stesso pezzo sono due righe - capita, ed è
       vero: un pezzo si pulisce a settembre e si ripara a marzo. */
    case "assistenza/richiesta":{
      if(!dato.id || !dato.motivo) return s;
      return {...s, assistenze: [...(s.assistenze || []), {
        id: dato.id,
        motivo: dato.motivo,
        giorno: dato.giorno || null,      /* ISO, oppure null per <un altro giorno> */
        fascia: dato.fascia || null,      /* "mattina" | "pomeriggio" */
        quando: dato.quando || null,
        stato: "inviata"
      }]};
    }

    /* == F6 . LE DATE, LE NOTIFICHE, IL LIVELLO ====================
       Sei eventi, copiati IDENTICI da `AZIONI_F6` di
       `viste/profilo.js`, dove erano stati scritti come funzioni pure
       apposta per poter essere trapiantati senza tradurli. Se un giorno
       divergono, la copia sbagliata è quella di la'.

       Il seme è CATALOGO: le ricorrenze che ha messo il negozio non si
       modificano mai: si aggiunge accanto (`aggiunte`) e si annota la
       sottrazione (`tolte`). Così un seme che domani porta una data in
       più non si trova cancellata quella che la persona aveva tolto, e
       una data tolta si rimette senza doverla reinventare. */

    /* {id, tipo, nome, giorno, mese, anno, avviso} - `avviso` in GIORNI
       (0 | 1 | 7 | 14). L'id lo fa la vista (`d-<tempo>`) per poter
       annullare il toast senza aspettare un ritorno dallo store. */
    case "date/aggiungi":{
      const dt = s.date || DATE_VUOTE;
      if(!dato || !dato.id || (dt.aggiunte || []).some(x => x.id === dato.id)) return s;
      return {...s, date: {...dt, aggiunte: [...(dt.aggiunte || []), {...dato}]}};
    }
    /* toglie una data AGGIUNTA, oppure segna come tolta una del seme:
       il seme è catalogo, non si modifica - si annota la sottrazione. */
    case "date/togli":{
      const dt = s.date || DATE_VUOTE;
      const agg = (dt.aggiunte || []).filter(x => x.id !== dato.id);
      const era = agg.length !== (dt.aggiunte || []).length;
      if(era) return {...s, date: {...dt, aggiunte: agg}};
      if((dt.tolte || []).includes(dato.id)) return s;
      return {...s, date: {...dt, tolte: [...(dt.tolte || []), dato.id]}};
    }
    /* l'ANNULLA di una data del negozio: non si <riaggiunge> (non è
       nostra), si toglie dalle tolte. È la stessa azione, al contrario. */
    case "date/rimetti":{
      const dt = s.date || DATE_VUOTE;
      if(!(dt.tolte || []).includes(dato.id)) return s;
      return {...s, date: {...dt, tolte: (dt.tolte || []).filter(i => i !== dato.id)}};
    }
    /* l'opt-in per riga dell'anniversario del pezzo: {pezzo, acceso}.
       Nasce SPENTO - l'anniversario si scrive da solo nel cofanetto e non
       consuma lo slot settimanale di notifica finché non lo si accende. */
    case "date/avviso":{
      const dt = s.date || DATE_VUOTE;
      const p = {...(dt.pezzi || {})};
      if(!!p[dato.pezzo] === !!dato.acceso) return s;
      if(dato.acceso) p[dato.pezzo] = true; else delete p[dato.pezzo];
      return {...s, date: {...dt, pezzi: p}};
    }
    /* {tipo:"date"|"collezioni"|"negozio", acceso:bool}. Il PERMESSO del
       browser non si chiede qui: qui si salva una preferenza, e il
       permesso si chiedera' alla prima notifica lecita (carta psicologica:
       <Il permesso si chiede DOPO il primo momento di valore>). */
    case "notifiche/preferenza":{
      const n = s.notifiche_pref || NOTIFICHE_SPENTE;
      if(!(dato.tipo in NOTIFICHE_SPENTE) || !!n[dato.tipo] === !!dato.acceso) return s;
      return {...s, notifiche_pref: {...n, [dato.tipo]: !!dato.acceso}};
    }
    /* {livello:<indice>} - il livello di cui la salita è già stata
       mostrata. Serve a far comparire il foglio UNA volta sola. */
    case "livello/visto":{
      if(s.livello_visto === dato.livello) return s;
      return {...s, livello_visto: dato.livello};
    }

    /* ══ F5b · LE PROPOSTE ═══════════════════════════════════════
       Tre eventi, copiati alla riga dai riduttori del motore. */

    /* {articolo, esito, regola, oggi, sessione, frase}
       Esiti dal più forte: comprato › da_parte › aperto › nessuno ›
       rifiuto. Uno per (articolo, regola): si tiene il più forte —
       una che apre e poi compra ha comprato.
       Il RIFIUTO fa tre cose insieme: conta nel registro, esclude
       l'articolo per novanta giorni, e spende una delle rigenerazioni
       della sessione. */
    case "proposta/verdetto":{
      const {articolo, esito} = dato;
      if(!articolo || !ESITI_PROPOSTA.includes(esito)) return s;
      const oggi = dato.oggi || null;
      if(esito === "rifiuto" && !oggi) return s;   /* senza data non si esclude nessuno */
      const P = ramoProposte(s);
      const regola = dato.regola ||
        (P.registro.mostrate[articolo] && P.registro.mostrate[articolo].regola) || "ignota";

      const i = P.verdetti.findIndex(v => v.articolo === articolo && v.regola === regola);
      let verdetti = P.verdetti;
      if(i < 0) verdetti = [...P.verdetti,
        {articolo, regola, esito, quando: oggi, frase: dato.frase || null}];
      else if(FORZA_ESITO[esito] > FORZA_ESITO[P.verdetti[i].esito]){
        verdetti = P.verdetti.slice();
        verdetti[i] = {...verdetti[i], esito, quando: oggi,
                       frase: dato.frase || verdetti[i].frase};
      }

      const r0 = P.registro.regole[regola] ||
        {mostrate: 0, aperte: 0, daparte: 0, comprate: 0, rifiuti: 0, frasi: {}};
      const colonna = {comprato: "comprate", da_parte: "daparte",
                       aperto: "aperte", rifiuto: "rifiuti"}[esito];
      const regole = {...P.registro.regole};
      regole[regola] = colonna ? {...r0, [colonna]: (r0[colonna] || 0) + 1} : {...r0};

      const mostrate = {...P.registro.mostrate};
      if(oggi){
        const m = mostrate[articolo] || {posto: "grande", regola};
        mostrate[articolo] = {...m, regola, quando: oggi};
      }

      const rifiuti = {...P.rifiuti};
      let sessione = P.registro.sessione;
      if(esito === "rifiuto"){
        rifiuti[articolo] = oggi;
        const id = dato.sessione != null ? dato.sessione : sessione.id;
        sessione = (sessione.id === id)
          ? {id, rifiuti: (sessione.rifiuti || 0) + 1}
          : {id, rifiuti: 1};
      } else if(dato.sessione != null && dato.sessione !== sessione.id){
        sessione = {id: dato.sessione, rifiuti: 0};
      }

      return {...s, proposte: {...P, verdetti, rifiuti,
                               registro: {regole, mostrate, sessione}}};
    }

    /* {articolo, motivo, chi, quando, abbina_a, in_cima, fino, cliente}
       La correzione a mano del negozio, modello Shopify: `chi` e
       `quando` non sono facoltativi — un pin anonimo non si può
       difendere al banco, e senza mittente il registro non serve. */
    case "proposta/pin":{
      if(!dato.articolo || !dato.chi || !dato.quando) return s;
      const P = ramoProposte(s);
      const riga = {
        articolo: dato.articolo,
        motivo: dato.motivo || null,
        chi: dato.chi,
        quando: dato.quando,
        abbina_a: dato.abbina_a || null,
        in_cima: !!dato.in_cima,
        fino: dato.fino || null,
        cliente: dato.cliente || null
      };
      const altri = P.pin.filter(p =>
        !(p.articolo === riga.articolo && (p.cliente || null) === riga.cliente));
      return {...s, proposte: {...P, pin: [...altri, riga]}};
    }

    /* {articolo, motivo, chi, quando, cliente, attivo}
       Il blocco vince su tutto — è il primo gradino della precedenza.
       `cliente: null` blocca per tutti; `attivo: false` toglie. */
    case "proposta/blocca":{
      if(!dato.articolo || !dato.chi || !dato.quando) return s;
      const P = ramoProposte(s);
      const cliente = dato.cliente || null;
      const altri = P.blocchi.filter(b =>
        !(b.articolo === dato.articolo && (b.cliente || null) === cliente));
      if(dato.attivo === false) return {...s, proposte: {...P, blocchi: altri}};
      return {...s, proposte: {...P, blocchi: [...altri, {
        articolo: dato.articolo, motivo: dato.motivo || null,
        chi: dato.chi, quando: dato.quando, cliente
      }]}};
    }

    case "demo/reset":
      return daSeme(dato.seme);

    default:
      return s;
  }
}

/* ── IL NEGOZIO ────────────────────────────────────────────────────── */
let stato = null, seme = null, semeId = "", canale = null;
const iscritti = new Set();
let attesaScrittura = 0, zitto = false;

export const leggi = () => stato;
export const ilSeme = () => seme;

export function iscrivi(fn){ iscritti.add(fn); return () => iscritti.delete(fn); }

export function invia(tipo, dato = {}, opz = {}){
  const prima = stato;
  stato = riduci(stato, {tipo, dato});
  /* si avvisa SEMPRE, anche quando lo stato non è cambiato: chi manda
     un evento vuole sapere che è arrivato. Chi ridisegna confronta i
     rami e non fa niente se sono gli stessi. */
  for(const fn of iscritti){ try{ fn(stato, {tipo, dato}, prima); }catch(err){ console.error(err); } }
  if(stato !== prima) persisti();
  if(!opz.locale) diffondi({t:tipo, d:dato});
  return stato;
}

function persisti(){
  clearTimeout(attesaScrittura);
  attesaScrittura = setTimeout(() => {
    try{
      localStorage.setItem(CHIAVE, JSON.stringify(
        {v:V, semeId, aggiornatoIl:new Date().toISOString(), dati:stato}));
    }catch(_){ /* modalita' privata, quota piena: l'app resta viva */ }
  }, 50);
}

/* ── IL CANALE ─────────────────────────────────────────────────────
   Un solo BroadcastChannel("regina"), condiviso con l'iframe del banco
   in tre dimensioni. Il contratto dei messaggi sta in ponte.js. */
function diffondi(msg){
  try{ canale && canale.postMessage({da:"scocca", ...msg}); }catch(_){}
}
export const ilCanale = () => canale;

/* ── L'AVVIO ───────────────────────────────────────────────────────── */
export function avvia(semeScelto){
  seme = semeScelto; semeId = semeScelto.id || "?";
  const q = new URLSearchParams(location.search);

  if(q.get("reset") === "1"){
    try{ localStorage.removeItem(CHIAVE); }catch(_){}
    q.delete("reset");
    const resto = q.toString();
    history.replaceState(null, "",
      location.pathname + (resto ? "?" + resto : "") + location.hash);
    stato = daSeme(seme);
  } else {
    stato = ricarica() || daSeme(seme);
  }

  try{ canale = new BroadcastChannel(CANALE); }catch(_){ canale = null; }
  if(canale) canale.onmessage = (ev) => {
    const m = ev.data;
    if(!m || m.da === "scocca") return;      /* mai la propria eco */
    /* un messaggio che arriva da fuori entra come un evento qualunque,
       ma NON riparte sul canale: due schede che si rimbalzano lo stesso
       evento sono un ciclo, e un ciclo si vede solo quando è tardi. */
    if(m.t) invia(m.t, m.d || {}, {locale:true});
  };

  /* Safari tiene la pagina in memoria e la rianima al tasto indietro:
     con la bfcache lo stato in RAM può essere più vecchio di quello
     su disco, scritto da un'altra scheda. Si ricarica. */
  addEventListener("pageshow", (ev) => { if(ev.persisted) location.reload(); });

  return stato;
}

function ricarica(){
  let grezzo = null;
  try{ grezzo = localStorage.getItem(CHIAVE); }catch(_){ return null; }
  if(!grezzo) return null;
  let b;
  try{ b = JSON.parse(grezzo); }catch(_){ return null; }
  if(!b || typeof b !== "object" || !b.dati) return null;
  if(b.semeId && b.semeId !== semeId) return null;   /* altro seme, altra demo */
  const d = b.v === V ? b.dati : migra(b.dati, b.v | 0);
  if(!d) return null;
  /* i campi che il seme può aver arricchito dopo il salvataggio (una
     ricorrenza nuova, un arrivo nuovo) NON si tengono da localStorage:
     quelli sono catalogo, non scelte della persona. */
  return {...d,
    livelli: seme.livelli || d.livelli,
    ricorrenze: seme.ricorrenze || d.ricorrenze,
    arrivi: seme.arrivi || d.arrivi,
    promozioni: seme.promozioni || d.promozioni || [],
    cliente: {...(seme.cliente||{}), ...(d.cliente||{})},
    /* F1: il ramo dell'ingresso è una SCELTA della persona, quindi si
       tiene; se manca (uno stato scritto prima della migrazione o
       troncato) si riparte dal vuoto invece di far cadere l'avvio. */
    ingresso: {...ingressoVuoto(), ...(d.ingresso || {})},
    ultimaApertura: d.ultimaApertura || null,
    istantanea: d.istantanea || null,
    ritorno: d.ritorno || null,
    /* F3 . F4 . F5 - I SEI RAMI SI TENGONO. Sopra si buttano i rami che
       sono CATALOGO (livelli, ricorrenze, arrivi, promozioni): lì il
       seme è più fresco del disco. Questi no: sono cio' che la persona
       ha scelto - un pezzo messo da parte, una lista mandata, una
       dedica scritta, un regalo partito, una riparazione chiesta.
       Riprenderli dal seme significherebbe cancellarli a ogni avvio, ed
       è esattamente il difetto che questa fusione chiude. Il `||` regge
       lo stato scritto prima della migrazione o troncato: un ramo che
       manca riparte vuoto, non fa cadere l'avvio. */
    daparte: d.daparte || [],
    lista: d.lista || null,
    promemoria: d.promemoria || [],
    dediche: d.dediche || {},
    regali: d.regali || [],
    assistenze: d.assistenze || [],
    /* F6 - E ANCHE QUESTI TRE SI TENGONO. Le ricorrenze del seme sopra
       si ributtano (sono catalogo: il negozio può averne aggiunta una);
       queste no. Una data che la persona ha scritto, un anniversario che
       ha acceso, un interruttore delle notifiche e un livello già
       festeggiato sono SUOI: riprenderli dal seme a ogni avvio
       significherebbe cancellarli, e rifestaggiare la stessa salita di
       livello a ogni ricarico. `livello_visto` nasce `null`, e `null` è
       un valore vero (<mai visto>): si legge con `== null` e non con
       `||`, che scambierebbe il livello 0 - il Primo, quello di tutti -
       per <mai visto>. */
    date: d.date || {aggiunte: [], tolte: [], pezzi: {}},
    notifiche_pref: d.notifiche_pref || {...NOTIFICHE_SPENTE},
    livello_visto: d.livello_visto == null ? null : d.livello_visto,
    nav: d.nav || {tab:"cofanetto", pile:{cofanetto:[],vetrina:[],perte:[],profilo:[]}}};
}

/* ══ F3 · LA STORIA DI UN ESEMPLARE, DERIVATA ════════════════
   Il retro della carta porta <la storia in righe datate> (46 S3.1.6), e
   quella storia NON è un ramo dello stato: è la lettura dei fatti che
   già ci sono. Un registro scritto a mano accanto ai fatti è un
   registro che prima o poi dice una cosa diversa dai fatti - e quel
   giorno non si sa più quale dei due credere.
   Cinque sorgenti, un ordine solo (la data), e mai una riga senza data:
   una riga datata <-> si legge come un difetto, e un difetto sul
   certificato di un gioiello non è un dettaglio.
   Torna [{quando (ISO), testo}]; il formato della data lo decide chi
   disegna, non chi conta. */
export function storiaDi(esemplare, s){
  if(!esemplare) return [];
  const id = esemplare.id || esemplare.codice;
  const righe = [];
  const giorno = (x) => (typeof x === "string" && x.length >= 10) ? x.slice(0, 10) : null;

  /* 1 · ENTRATO. Il pezzo esiste da quando il negozio l'ha venduto. */
  const entrato = giorno(esemplare.data_vendita);
  if(entrato) righe.push({quando:entrato, testo:"Acquistato da Regina"});

  /* 2 · LA DEDICA, solo quella SCRITTA dall'app: quella che arriva col
     seme è già incisa e non ha un giorno suo. */
  const ded = (s && s.dediche && s.dediche[id]) || null;
  if(ded && giorno(ded.quando)) righe.push({quando:giorno(ded.quando), testo:"Dedica scritta"});

  /* 3 e 4 · REGALATO e RICEVUTO, dal registro dei regali. */
  for(const r of (s && s.regali) || []){
    if(r.id !== id) continue;
    if(giorno(r.quando))
      righe.push({quando:giorno(r.quando),
                  testo:"Regalato" + (r.a ? " a " + r.a : "")});
    if(giorno(r.aperto_il))
      righe.push({quando:giorno(r.aperto_il),
                  testo:(r.a ? r.a + " l’ha aperto" : "Aperto")});
  }
  /* il pezzo RICEVUTO su questo telefono: non c'è un regalo partito da
     qui, c'è un regalo arrivato. */
  if(giorno(esemplare.ricevuto_il))
    righe.push({quando:giorno(esemplare.ricevuto_il),
                testo:"Ricevuto" + (esemplare.da ? " da " + esemplare.da : "")});

  /* 5 · L'ASSISTENZA. */
  for(const a of (s && s.assistenze) || []){
    if(a.id !== id || !giorno(a.quando)) continue;
    righe.push({quando:giorno(a.quando), testo: a.motivo + " · richiesta inviata"});
  }

  /* l'ordine è la data; a parita' resta quello in cui i fatti sono
     stati messi in fila qui sopra (l'acquisto prima della dedica scritta
     lo stesso giorno). `sort` in JS è stabile dal 2019: non serve un
     secondo criterio. */
  return righe.sort((a, b) => a.quando < b.quando ? -1 : a.quando > b.quando ? 1 : 0);
}

/* ── UN COMODO: i soldi ────────────────────────────────────────────
   I centesimi si formattano in un posto solo, altrimenti fra tre file
   ci sono tre virgole diverse.

   LE MIGLIAIA SI RAGGRUPPANO SEMPRE. L'italiano, per Unicode, ha il
   raggruppamento «min2»: il punto compare solo da cinque cifre in su, e
   1500,00 si scrive «1500,00». Su un credito e su un prezzo quella
   cifra si legge male — «1500,00 €» ha un attimo di esitazione che
   «1.500,00 €» non ha, ed è esattamente cio' che il critic ha bocciato
   (mossa 1). `useGrouping:"always"` lo chiede; le versioni vecchie di
   ECMA-402 conoscono `useGrouping` solo come booleano e una stringa
   non vuota la leggono come `true`, cioè tornano al «min2» senza
   sollevare niente. Perciò il ripiego non si sceglie col `try/catch`
   ma GUARDANDO IL RISULTATO: si formatta 1500 una volta sola all'avvio
   e si controlla che il separatore ci sia. Se non c'è, si raggruppa a
   mano — e a mano vuol dire sull'intero, tre cifre per volta, lasciando
   stare il segno e i decimali. */
const RAGGRUPPA_SEMPRE = (() => {
  try{
    return (1500).toLocaleString("it-IT",
      {minimumFractionDigits:2, useGrouping:"always"}).replace(/\d|,/g, "").length > 0;
  }catch(_){ return false; }
})();

function aMano(n){
  /* si parte dalla formattazione locale SENZA raggruppamento: la virgola
     decimale e il numero di cifre restano quelli di `it-IT`, e l'unica
     cosa che si aggiunge è il punto ogni tre. */
  const t = n.toLocaleString("it-IT", {minimumFractionDigits:2, useGrouping:false});
  const m = /^(-?)(\d+)(.*)$/.exec(t);
  if(!m) return t;
  return m[1] + m[2].replace(/\B(?=(\d{3})+$)/g, ".") + m[3];
}

export const soldi = (cent) => {
  const n = cent / 100;
  return (RAGGRUPPA_SEMPRE
    ? n.toLocaleString("it-IT", {minimumFractionDigits:2, useGrouping:"always"})
    : aMano(n)) + " €";
};
