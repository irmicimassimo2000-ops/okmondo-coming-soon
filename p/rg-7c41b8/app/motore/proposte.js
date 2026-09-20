/* ═══════════════════════════════════════════════════════════════════
   app/motore/proposte.js — IL MOTORE DELLE PROPOSTE PERSONALI.

   «Lì ci deve essere l'algoritmo che presenta i prodotti in base al
   cliente, ai suoi dati e i suoi articoli in possesso» (Massimo).

   Con trentaquattro articoli e un negozio non c'è nessun modello da
   addestrare: una regola di associazione ha bisogno di diverse centinaia
   di transazioni prima di dire qualcosa di vero. Quello che c'è sono i
   DATI CHE IL NEGOZIO HA GIÀ — cosa possiede, cosa ha comprato di tasca
   sua, cosa ha messo da parte, quali date ricorrono, che misura porta —
   più un punteggio trasparente che il negozio può correggere a mano.
   Il metodo per esteso sta in
   `~/.claude/skills/interfacce/reference/11-proposte-personali-senza-ml.md`.

   LA CATENA, IN ORDINE, E NON SI SALTA UN ANELLO:
     candidati → FILTRI DURI → punteggio 0-100 a pesi dichiarati
     → una regola per proposta → diversità (MMR λ 0,7) e freschezza
     → spiegazione in una riga ≤ 60 caratteri → 1 grande + ≤ 3 rail.

   LE TRE LEGGI CHE NON SI NEGOZIANO
   ─────────────────────────────────
   1. IL TITOLO DI UN BLOCCO È LA REGOLA, in italiano, verificabile
      aprendo il cofanetto. Mai «Per te», mai «consigliati», mai
      «potrebbe piacerti». Se non sai scrivere la regola in una riga,
      quel blocco non esiste.
   2. IL PUNTEGGIO NON DECIDE DA SOLO: decide QUALE REGOLA HA VINTO, e
      la regola è ciò che si scrive. Il punteggio ordina i pezzi DENTRO
      la regola. Fra le regole comanda l'ordine fisso.
   3. `oggi` È UN INGRESSO. Qui dentro non esiste `new Date()`: una
      bozza guardata fra due mesi non deve dire «l'anniversario era
      sessanta giorni fa», e una funzione che legge l'orologio non è
      collaudabile. Senza `oggi` il motore SOLLEVA un errore: meglio
      rumoroso che silenziosamente sbagliato.

   COSA HA EREDITATO. Le quattro regole già decise in `viste/perte.js`
   (chiude_collezione › data_vicina ≤ 14 gg › arrivo_in_collezione ›
   misura/materia) non sono state buttate: sono diventate quattro dei
   dieci COMPONENTI del punteggio, con lo stesso ordine di precedenza e
   le stesse frasi. Il motore non le contraddice: le mette sotto un
   punteggio e ci aggiunge la lista, il pin del negozio, il co-acquisto,
   la famiglia mancante, la fascia di prezzo.

   ZERO DIPENDENZE, ZERO DOM. Questo file non importa niente e non
   nomina `document`: gira in node così com'è, e le prove stanno in
   `E:\OK.AGENZIA\regina-jewels\studio\prova3d\_MP_motore.mjs`.
   ═══════════════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════════════
   1 · LE COSTANTI DICHIARATE — si leggono, si discutono, si cambiano.
   ═══════════════════════════════════════════════════════════════════ */

/* I PESI. Dichiarati qui e modificabili: il negozio può passarli in
   `opz.pesi` (cursore 0-50 per regola, §7 del metodo) senza che nessuno
   ricompili niente. La correzione è A MANO e mai automatica — dopo
   trenta proposte mostrate, se una regola ha take-rate sotto la metà
   della media si dimezza il peso; se ha rifiuto sopra il 20 % si
   rilegge la FRASE prima di toccare il peso, perché quasi sempre è la
   frase a essere sbagliata, non la regola. */
export const PESI = {
  chiude_collezione: 40,
  da_prendere: 35,
  data_vicina: 30,
  pin: 25,
  co_acquisto: 20,
  arrivo_in_collezione: 12,
  materia: 10,
  famiglia_mancante: 8,
  prezzo: 8,
  misura: 6,
};

/* I BONUS, separati dai pesi perché sono condizioni, non componenti:
   non possono vincere da soli e non producono una frase propria. */
export const EXTRA = {
  chiude_ultimo: 10,        /* è l'ULTIMO che manca, non uno dei tre */
  data_persona_nota: 10,    /* della materia o della misura di quella persona */
  prezzo_fuori_scala: -10,  /* oltre 2,5× il massimo che ha mai speso */
};

export const SOGLIE = {
  giorni_data_vicina: 14,   /* 48 §5.1 regola 2 */
  giorni_rifiuto: 90,       /* «Non fa per me» esclude per tre mesi */
  giorni_freschezza: 7,     /* lo stesso pezzo non torna nello stesso posto */
  giorni_arrivo: 30,        /* «novità» è un arrivo di meno di un mese */
  co_acquisto_n: 5,         /* sotto cinque transazioni non è un fatto */
  co_acquisto_lift: 1.5,    /* lift ≥ 1,5, altrimenti è una coincidenza */
  prezzo_dentro_min: 0.6,   /* fascia: [0,6× ; 1,6×] della sua mediana */
  prezzo_dentro_max: 1.6,
  prezzo_fuori: 2.5,        /* oltre 2,5× del suo massimo: penalità */
  materia_pezzi: 2,         /* «la tua materia» vuole ≥ 2 pezzi, non 1 */
  famiglia_pezzi: 3,        /* «non hai ancora una collana» vuole ≥ 3 pezzi */
  frase_max: 60,            /* caratteri. Oltre, la frase non esce */
};

/* LA DIVERSITÀ. MMR (Carbonell & Goldstein 1998) nella forma semplice
   che il metodo dichiara: dopo ogni pezzo scelto si tolgono punti ai
   candidati che gli somigliano. λ = 0,7 è la taratura, e le due
   penalità sono il modo in cui quella taratura si scrive su un catalogo
   di trentaquattro pezzi in cinque famiglie.

   IL TETTO DI FAMIGLIA è la garanzia dura sotto la penalità morbida:
   due pezzi per famiglia in un rail, mai tre. NON vale per i rail che
   sono per costruzione di una famiglia sola — «Della tua misura (14)»
   sono anelli per definizione, e un tetto di due lo ucciderebbe sotto
   il minimo di tre. Quei due casi sono dichiarati in `RAIL_MONOFAMIGLIA`. */
export const DIVERSITA = {
  lambda: 0.7,
  stessa_famiglia_e_materia: -15,
  stessa_famiglia: -8,
  tetto_famiglia: 2,
};

export const FORMA = {
  rail_massimo: 3,   /* 1 grande + al massimo 3 rail (48 §5.1) */
  rail_minimo: 3,    /* un rail esiste solo con ≥ 3 pezzi VERI */
  card_per_rail: 5,  /* 3-5 card orizzontali */
};

/* L'ORDINE FISSO DELLE REGOLE. È la precedenza, non una preferenza:
   fra le regole comanda questa lista, dentro una regola comanda il
   punteggio. Le prime quattro voci sono, nello stesso ordine, le
   quattro regole già decise in `viste/perte.js` — con la lista e il pin
   del negozio infilati dove il metodo li mette. */
export const ORDINE_REGOLE = [
  "chiude_collezione",
  "da_prendere",
  "data_vicina",
  "pin",
  "co_acquisto",
  "arrivo_in_collezione",
  "collezione",
  "materia",
  "famiglia_mancante",
  "misura",
  "misura_ignota",
];

/* CHI PUÒ PRENDERSI IL BLOCCO GRANDE. Le altre restano rail, sempre:
   un rail promosso a blocco è una promessa più grande del suo
   fondamento. «Della tua misura (14)» non è un motivo per occupare
   mezza schermata. */
export const REGOLE_GRANDI = new Set([
  "chiude_collezione", "da_prendere", "data_vicina", "pin",
  "co_acquisto", "arrivo_in_collezione",
]);

/* I rail che sono di una famiglia sola per costruzione: il tetto di
   famiglia non li tocca (vedi DIVERSITA). */
export const RAIL_MONOFAMIGLIA = new Set(["misura", "misura_ignota", "famiglia_mancante"]);

/* LA PRECEDENZA, dichiarata e in quest'ordine (§7 del metodo). */
export const PRECEDENZA = ["blocco", "filtro_duro", "pin_in_cima", "ordine_regole", "punteggio"];

/* GLI ESITI, dal più forte al più debole. Uno per proposta: si tiene il
   più forte ricevuto. `nessuno` NON è un no (Hu, Koren, Volinsky 2008:
   il feedback implicito non dice il contrario di sé) e pesa zero. */
export const ESITI = ["comprato", "da_parte", "aperto", "nessuno", "rifiuto"];
export const FORZA = { comprato: 4, da_parte: 3, aperto: 2, nessuno: 1, rifiuto: 0 };

/* LE FINI DICHIARATE. Niente «carica altro», niente ripiego. */
export const FINE = "Non c’è altro, per ora.";
export const FINE_TUTTO = "Hai tutto quello che c’è, per ora.";
/* al SECONDO «Non fa per me» della stessa sessione la card si ferma:
   un no che rigenera all'infinito è una slot machine, ed è vietato. */
export const FINE_SESSIONE = "Va bene, ci risentiamo lunedì.";
export const TORNA_IN_VETRINA = "Torna in vetrina — avvisami";

/* i nomi delle famiglie al singolare, per «Non hai ancora …». Una
   concatenazione cieca produrrebbe «Non hai ancora Collane», che non è
   italiano: il plurale della vetrina non è il singolare di una frase. */
const FAMIGLIA_SINGOLARE = {
  busto: "una collana", collane: "una collana",
  orecchini: "un paio di orecchini",
  anelli: "un anello",
  rampa: "un bracciale", bracciali: "un bracciale",
  orologi: "un orologio",
};

/* ═══════════════════════════════════════════════════════════════════
   2 · LE DATE — tutto in UTC e per giorni interi.
   `new Date("2026-09-15")` letto in fuso locale può cadere il 14 alle
   23: un «mancano 14 giorni» sbagliato di uno non si vede in bozza e si
   vede in mano al cliente.
   ═══════════════════════════════════════════════════════════════════ */
const GIORNO = 86400000;

export function aGiorni(iso) {
  const p = String(iso || "").split("-");
  if (p.length !== 3) return NaN;
  return Date.UTC(+p[0], +p[1] - 1, +p[2]) / GIORNO;
}
export const giorniFra = (da, a) => aGiorni(a) - aGiorni(da);
export function isoDa(g) {
  const d = new Date(g * GIORNO);
  return d.getUTCFullYear() + "-" + String(d.getUTCMonth() + 1).padStart(2, "0") +
         "-" + String(d.getUTCDate()).padStart(2, "0");
}
export const isoPiu = (iso, n) => isoDa(aGiorni(iso) + n);
export const isoMeno = (iso, n) => isoDa(aGiorni(iso) - n);
export const annoDi = (iso) => +String(iso || "").slice(0, 4);

let _gg = null, _gm = null;
const fGiorno = () => (_gg = _gg || new Intl.DateTimeFormat("it-IT", { weekday: "long", timeZone: "UTC" }));
const fGM = () => (_gm = _gm || new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", timeZone: "UTC" }));

/* «giovedì» — il giorno della settimana da solo. È ciò che trasforma
   una data in un appuntamento senza spendere venti caratteri. */
export function giornoSettimana(iso) {
  const g = aGiorni(iso);
  if (!isFinite(g)) return "";
  return fGiorno().format(new Date(g * GIORNO));
}
/* «3 ottobre» */
export function giornoEMese(iso) {
  const g = aGiorni(iso);
  if (!isFinite(g)) return "";
  return fGM().format(new Date(g * GIORNO));
}
/* la prossima volta che cade una ricorrenza {giorno, mese} */
export function prossimaRicorrenza(r, oggi) {
  const a0 = annoDi(oggi);
  const iso = (a) => a + "-" + String(r.mese).padStart(2, "0") + "-" + String(r.giorno).padStart(2, "0");
  const q = iso(a0);
  return giorniFra(oggi, q) >= 0 ? q : iso(a0 + 1);
}

/* IL LUNEDÌ VERO (critic 20/09). «Va bene, ci risentiamo lunedì» era
   una FRASE, non un fatto: la sessione era un contatore che un ricarico
   azzerava, e la promessa si smentiva da sola al primo F5. Qui si
   calcola il lunedì DAVVERO, con `oggi` come ingresso (mai `new Date()`
   — stesso vincolo di tutto questo file): `getUTCDay()` su un
   epoch-day usa la stessa aritmetica in UTC di ogni altra data del
   motore, 0 = domenica … 1 = lunedì. Il lunedì è sempre AVANTI: se
   `oggi` è già lunedì il prossimo è fra sette giorni, mai zero — un
   «ci risentiamo lunedì» detto lo stesso lunedì sarebbe una bugia sul
   quando, non solo sul se. */
export function prossimoLunedi(oggi) {
  const g = aGiorni(oggi);
  const dow = new Date(g * GIORNO).getUTCDay();
  const distanza = ((1 - dow + 7) % 7) || 7;
  return isoPiu(oggi, distanza);
}

/* ═══════════════════════════════════════════════════════════════════
   3 · IL RAMO `proposte` DELLO STORE — la forma, in un posto solo.
   ═══════════════════════════════════════════════════════════════════ */

export const registroVuoto = () => ({
  /* per regola: mostrate · aperte · daparte · comprate · rifiuti, e le
     frasi mostrate col loro conteggio. È la tabella che il NEGOZIO
     legge in backoffice, non il codice. */
  regole: {},
  /* la freschezza: per articolo, dove è stato mostrato e quando */
  mostrate: {},
  /* la sessione in corso e quanti «Non fa per me» ha già speso */
  sessione: { id: null, rifiuti: 0 },
});

export const proposteVuote = () => ({
  verdetti: [],    /* [{articolo, regola, esito, quando, frase}] — uno per proposta */
  rifiuti: {},     /* {articolo: "2026-09-15"} — esclusione 90 giorni */
  pin: [],         /* [{articolo, motivo, chi, quando, abbina_a, in_cima, fino, cliente}] */
  blocchi: [],     /* [{articolo, motivo, chi, quando, cliente}] */
  registro: registroVuoto(),
  /* la sessione è chiusa (secondo «Non fa per me») FINO a questa data,
     ISO o null. È un fatto dello STATO, non del contatore di sessione:
     un contatore lo azzera un ricarico, questa data no. */
  chiusa_fino: null,
});

const ramo = (s) => {
  const p = (s && s.proposte) || {};
  return {
    verdetti: p.verdetti || [],
    rifiuti: p.rifiuti || {},
    pin: p.pin || [],
    blocchi: p.blocchi || [],
    registro: {
      regole: (p.registro && p.registro.regole) || {},
      mostrate: (p.registro && p.registro.mostrate) || {},
      sessione: (p.registro && p.registro.sessione) || { id: null, rifiuti: 0 },
    },
    chiusa_fino: p.chiusa_fino != null ? p.chiusa_fino : null,
  };
};

/* ═══════════════════════════════════════════════════════════════════
   4 · LE LETTURE DEI DATI — normalizzate qui una volta sola.
   ═══════════════════════════════════════════════════════════════════ */

/* IL PREZZO IN CENTESIMI INTERI. `app/innesto.js` consegna `prezzo` già
   in centesimi; `app/dati/catalogo.js` crudo porta `prezzo_vendita` in
   euro. Trentanove euro in virgola mobile sommati dodici volte non
   fanno 468: fanno 467,99999999999994, e in una mediana si vede. */
export function prezzoDi(a) {
  if (!a) return 0;
  if (Number.isInteger(a.prezzo)) return a.prezzo;
  if (typeof a.prezzo === "number") return Math.round(a.prezzo * 100);
  return Math.round((Number(a.prezzo_vendita) || 0) * 100);
}
const metalloDi = (a) => (a && a.attributi && a.attributi.metallo) || null;
const misuraDi = (a) => (a && a.attributi && a.attributi.misura != null)
  ? String(a.attributi.misura) : null;
const famigliaDi = (a) => (a && (a.famiglia || a.tipo)) || "";
const nomeFamiglia = (a) => (a && (a.famiglia_nome || a.tipo || a.famiglia)) || "";

/* la mediana, scritta per esteso perché una mediana sbagliata di un
   posto sposta la fascia di prezzo di tutti i candidati. */
export function mediana(v) {
  const x = v.slice().sort((a, b) => a - b);
  if (!x.length) return 0;
  const m = x.length >> 1;
  return x.length % 2 ? x[m] : Math.round((x[m - 1] + x[m]) / 2);
}

/* la materia che PORTA: non una preferenza dichiarata, il metallo che
   ricorre di più nei pezzi che ha. Con un pezzo solo non c'è nessuna
   prevalenza — c'è un pezzo — ed è la differenza fra una regola e una
   supposizione. */
export function materiaPrevalente(articoli) {
  const conta = new Map();
  for (const a of articoli) {
    const m = metalloDi(a);
    if (!m) continue;
    conta.set(m, (conta.get(m) || 0) + 1);
  }
  let vinto = null, n = 0;
  for (const [m, c] of conta) if (c > n || (c === n && vinto && String(m) < String(vinto))) { vinto = m; n = c; }
  return n >= SOGLIE.materia_pezzi ? vinto : null;
}

/* ═══════════════════════════════════════════════════════════════════
   5 · LE FRASI — segnale → regola → frase.

   Regole della frase, tutte e quattro insieme o non esce:
     · nomina un dato del CLIENTE (il suo pezzo, la sua misura, la sua
       data, la sua persona) o un fatto contabile del negozio (un numero
       vero, una data vera, il nome di chi ha scelto);
     · ≤ 60 caratteri;
     · verificabile aprendo il cofanetto o il profilo;
     · mai «per te», «consigliato», «potrebbe piacerti», «ti piacerà».

   `scegliFrase` prende le varianti dalla più ricca alla più povera e
   consegna la prima che sta nei sessanta. Se non ne sta nessuna non
   consegna niente, e il componente non può vincere: NON si taglia una
   frase a metà parola, perché una frase troncata è una frase che il
   cliente non può verificare.
   ═══════════════════════════════════════════════════════════════════ */
const VIETATE = /\bper te\b|consigliat|potrebbe piacer|ti piacer|selezionat[oi] per|scelti per te/i;

export function fraseValida(f) {
  return typeof f === "string" && f.length > 0 &&
         f.length <= SOGLIE.frase_max && !VIETATE.test(f);
}
export function scegliFrase(...varianti) {
  for (const v of varianti) if (fraseValida(v)) return v;
  return null;
}

/* ═══════════════════════════════════════════════════════════════════
   6 · IL MOTORE.

   `proposte(stato, opz)`
     stato   il fascio {s, catalogo, collezioni, oggi} — la stessa forma
             che usa già `viste/perte.js` — oppure direttamente i dati
             dello store, e allora catalogo/collezioni stanno in `opz`.
     opz     {oggi, pesi, sessione, catalogo, collezioni, esauriti,
              co_acquisti, rail_massimo, card_per_rail}
   → {grande, rail, registro, …}

   PURA e DETERMINISTICA: stesso ingresso, stessa uscita, sempre. Non
   scrive niente: il `registro` che torna è quello NUOVO, e tocca a chi
   chiama persisterlo con `proposta/mostrate` o equivalente.
   ═══════════════════════════════════════════════════════════════════ */
export function proposte(stato = {}, opz = {}) {
  /* ── gli ingressi ─────────────────────────────────────────────── */
  const fascio = stato && stato.s ? stato : { s: stato };
  const s = fascio.s || {};
  const catalogo = opz.catalogo || fascio.catalogo || [];
  const mappaColl = opz.collezioni || fascio.collezioni || {};
  const oggi = opz.oggi || fascio.oggi || null;
  if (!oggi || !isFinite(aGiorni(oggi))) {
    throw new Error(
      "proposte: serve `oggi` esplicito in formato ISO (aaaa-mm-gg). " +
      "Qui dentro non si legge l'orologio: una bozza guardata fra due mesi " +
      "direbbe «l'anniversario era sessanta giorni fa»."
    );
  }
  const pesi = { ...PESI, ...(opz.pesi || {}) };
  const cliente = s.cliente || {};
  const R = ramo(s);
  const sessione = opz.sessione != null ? opz.sessione : R.registro.sessione.id;
  const railMax = opz.rail_massimo != null ? opz.rail_massimo : FORMA.rail_massimo;
  const perRail = opz.card_per_rail != null ? opz.card_per_rail : FORMA.card_per_rail;

  const perId = new Map(catalogo.map((a) => [a.id, a]));

  /* ── CHI È LEI, in fatti ───────────────────────────────────────── */
  const vivi = (s.esemplari || []).filter((x) => x && !x.rimosso);
  /* «posseduti» non è «tutti gli esemplari»: un `venduto` è pagato ma
     non ancora scartato — sta in negozio ed è la sorpresa. Contarlo
     chiuderebbe una collezione nella testa dell'app mentre in quella
     della cliente ne manca ancora uno. Due insiemi, non uno. */
  const posseduti = new Set(vivi.filter((x) => x.stato !== "venduto").map((x) => x.articolo));
  const inAttesa = new Set(vivi.filter((x) => x.stato === "venduto").map((x) => x.articolo));
  /* ricevuti in regalo: li possiede (quindi non si propongono) ma non
     contano come gusto suo — regola etica. Contano per materia e
     misura, non per «te la chiude». */
  const ricevuti = new Set(vivi.filter((x) => x.regalo === true && x.stato !== "venduto").map((x) => x.articolo));
  const comprati = new Set([...posseduti].filter((id) => !ricevuti.has(id)));

  const suoi = [...posseduti].map((id) => perId.get(id)).filter(Boolean);
  const materia = materiaPrevalente(suoi);

  /* LA MISURA, E IL CASO DELLE DUE MISURE IN ARCHIVIO.
     Il profilo vince quando c'è: è il dato che il negozio ha scritto e
     che lei può correggere. Quando non c'è, la si legge dagli anelli
     che ha comprato, e fra due misure diverse VALE L'ACQUISTO PIÙ
     RECENTE — le dita cambiano, e la misura di due anni fa fa arrivare
     in negozio un anello che non entra. `misura_fonte` dice da dove
     viene, perché il profilo la deve poter mostrare e smentire. */
  let misuraSua = cliente.misura_anello != null ? String(cliente.misura_anello) : null;
  let misuraFonte = misuraSua ? "profilo" : null;
  if (!misuraSua) {
    const anelli = vivi
      .filter((x) => x.stato !== "venduto")
      .map((x) => ({ x, a: perId.get(x.articolo) }))
      .filter((r) => r.a && misuraDi(r.a))
      .sort((p, q) => String(q.x.data_vendita || "").localeCompare(String(p.x.data_vendita || "")));
    if (anelli.length) {
      misuraSua = misuraDi(anelli[0].a);
      misuraFonte = "ultimo acquisto · " + (anelli[0].x.data_vendita || "");
    }
  }
  const famiglieSue = new Set(suoi.map(famigliaDi).filter(Boolean));

  /* la fascia di prezzo: dai pezzi che ha PAGATO LEI. I regali di
     Antonio dicono il gusto di Antonio. */
  const prezziSuoi = [...comprati].map((id) => prezzoDi(perId.get(id))).filter((p) => p > 0);
  const medianaPrezzo = mediana(prezziSuoi);
  const massimoPrezzo = prezziSuoi.length ? Math.max(...prezziSuoi) : 0;

  const wishlist = new Set((s.wishlist || []).map((w) => (typeof w === "string" ? w : (w && (w.articolo || w.id)))).filter(Boolean));
  const dettagliLista = s.wishlist_dettagli || {};

  const arrivi = (s.arrivi || []).filter((a) => a && (a.articolo || a.id));
  const arrivoDi = new Map(arrivi.map((a) => [a.articolo || a.id, a]));

  /* ── LE COLLEZIONI, con la fila ────────────────────────────────── */
  const collezioni = [];
  for (const id of Object.keys(mappaColl)) {
    const c = mappaColl[id];
    const elenco = (c && c.pezzi) || [];
    if (!elenco.length) continue;
    const ha = elenco.filter((p) => posseduti.has(p));
    const mancanti = elenco.filter((p) => !posseduti.has(p));
    /* «sua» vuole almeno un pezzo COMPRATO: due regali non fanno una
       collezione tua, e «ti chiude» detto a chi non ne ha scelto
       nessuno è una frase che non regge al banco. */
    const suaDavvero = elenco.some((p) => comprati.has(p));
    collezioni.push({
      id, nome: (c && c.nome) || id,
      totale: elenco.length, ha: ha.length, pezzi: elenco,
      posseduti: ha, mancanti, manca: mancanti.length,
      chiusa: mancanti.length === 0, sua: suaDavvero && ha.length > 0,
      chiude: (c && c.chiude) || null,
    });
  }
  const perCollezione = new Map(collezioni.map((c) => [c.id, c]));

  /* ── LE DATE IN FINESTRA (≤ 14 giorni) ─────────────────────────── */
  const dateVicine = (s.ricorrenze || [])
    .map((r) => {
      const q = prossimaRicorrenza(r, oggi);
      return { r, quando: q, giorni: giorniFra(oggi, q) };
    })
    .filter((x) => x.giorni >= 0 && x.giorni <= SOGLIE.giorni_data_vicina)
    .sort((a, b) => a.giorni - b.giorni || String(a.r.id).localeCompare(String(b.r.id)));

  /* ── I CO-ACQUISTI. Senza il dato del gestionale il componente è
     SPENTO, e lo dichiara: preferisco un motore con nove componenti
     accesi a uno con dieci di cui uno inventa. ────────────────────── */
  const coRighe = opz.co_acquisti || s.co_acquisti || null;
  const coSpento = !Array.isArray(coRighe) || !coRighe.length;

  /* ── IL PIN E IL BLOCCO DEL NEGOZIO ────────────────────────────── */
  const miei = (r) => !r.cliente || r.cliente === cliente.id;
  const bloccati = new Set(R.blocchi.filter(miei).map((b) => b.articolo));
  const pinPer = new Map();
  for (const p of R.pin) {
    if (!p || !p.articolo || !miei(p)) continue;
    pinPer.set(p.articolo, p);
  }

  /* ── I FILTRI DURI, prima di qualsiasi punteggio ────────────────── */
  const esauriti = new Set(opz.esauriti || s.esauriti || []);
  const disponibile = (a) => {
    if (esauriti.has(a.id)) return false;
    if (a.esaurito === true) return false;
    if (typeof a.stock === "number" && a.stock <= 0) return false;
    return true;
  };
  const rifiutato = (id) => {
    const q = R.rifiuti[id];
    return !!q && giorniFra(q, oggi) < SOGLIE.giorni_rifiuto;
  };
  const mostratoDi = (id) => R.registro.mostrate[id] || null;
  const frescoPer = (id, posto) => {
    const m = mostratoDi(id);
    if (!m || m.posto !== posto || !m.quando) return true;
    return giorniFra(m.quando, oggi) >= SOGLIE.giorni_freschezza;
  };

  /* UN «VENDUTO» NON È UN POSSEDUTO, ED È IL CASO PIÙ DELICATO DI TUTTI.
     Il Pendente Filo di Lucia è pagato da Antonio e stampato, ma non
     ancora scartato: lei non ce l'ha. La fila della collezione dice
     «ti manca un pezzo solo» — e se la stessa schermata nascondesse
     quel pezzo direbbe due verità diverse nello stesso posto. Quindi:
     un pezzo in attesa RESTA candidato per la sola regola che lo
     nomina come mancante (`chiude_collezione`) e non entra in nessun
     rail, dove sarebbe una raccomandazione generica a comprare una
     cosa che qualcuno ha già comprato per lei. */
  const scarti = {};
  const candidati = [];
  for (const a of catalogo) {
    if (!a || !a.id) continue;
    if (posseduti.has(a.id)) { scarti[a.id] = "posseduto"; continue; }
    if (bloccati.has(a.id)) { scarti[a.id] = "bloccato"; continue; }
    if (rifiutato(a.id)) { scarti[a.id] = "rifiutato"; continue; }
    if (!disponibile(a)) { scarti[a.id] = "esaurito"; continue; }
    /* la misura è una COMPATIBILITÀ FISICA, non un gusto: un anello di
       un'altra misura non «le sta meno bene», non le entra. Filtro
       duro, e prima del punteggio. */
    const mis = misuraDi(a);
    if (mis && misuraSua && mis !== misuraSua) { scarti[a.id] = "misura_diversa"; continue; }
    if (inAttesa.has(a.id)) {
      /* candidato ristretto: solo «ti chiude la collezione». Se quella
         regola non scatta, il pezzo non esce da nessuna parte. */
      const c0 = a.collezione ? perCollezione.get(a.collezione) : null;
      if (!c0 || !c0.sua || c0.manca !== 1) { scarti[a.id] = "in_attesa"; continue; }
    }
    candidati.push(a);
  }

  /* i pin che il filtro duro ha spento: il backoffice lo deve sapere,
     altrimenti il negozio crede di aver messo in cima un pezzo che non
     esce (Shopify: i complementari vogliono stock > 0). */
  const pinNonAttivi = [];
  for (const [id, p] of pinPer) {
    if (scarti[id]) pinNonAttivi.push({ articolo: id, motivo: scarti[id], pin: p });
  }

  /* i pezzi ESAURITI che chiuderebbero una collezione non sono una
     proposta: sono uno STATO nella fila della collezione. Mai «ultimi
     pezzi», mai un countdown: un avviso, uno solo, se lo chiede lei. */
  const stati = [];
  for (const c of collezioni) {
    if (!c.sua || c.manca !== 1) continue;
    const id = c.mancanti[0];
    const a = perId.get(id);
    if (!a) continue;
    if (scarti[id] === "esaurito") {
      stati.push({ articolo: a, collezione: c.id, stato: "esaurito", frase: TORNA_IN_VETRINA });
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     IL PUNTEGGIO. `S = min(100, Σ w_k · s_k)` con `s_k ∈ [0,1]`.
     Ogni componente porta con sé la sua FRASE e i suoi DATI: è ciò
     che rende il punteggio verificabile invece che opinabile.
     ═══════════════════════════════════════════════════════════════ */
  const valutati = candidati.map((a) => valuta(a));
  function valuta(a) {
    const comp = {};
    /* un pezzo in attesa in negozio ha diritto a UN solo componente:
       quello che lo nomina come il pezzo che manca alla sua collezione. */
    const soloCollezione = inAttesa.has(a.id);
    const metti = (k, o) => {
      if (soloCollezione && k !== "chiude_collezione") return;
      const peso = pesi[k] != null ? pesi[k] : (PESI[k] || 0);
      const punti = Math.round(peso * (o.s == null ? 1 : o.s) + (o.bonus || 0));
      if (!punti && !o.spento) return;
      comp[k] = {
        peso, s: o.s == null ? 1 : o.s, punti,
        regola: o.regola || k,
        frase: o.frase || null,
        dati: o.dati || [],
        gruppo: o.gruppo || null,
        spento: !!o.spento,
      };
    };

    /* 1 · CHIUDE COLLEZIONE (40, +10 se è l'ultimo che manca) ───────
       La più forte perché è la sola che parla di una cosa che LEI ha
       già cominciato. La frase cambia con la posizione nella fila:
       a uno dalla chiusura si dice «ti chiude», con un pezzo solo si
       dice di quale suo pezzo è la collezione, in mezzo si conta. */
    const c = a.collezione ? perCollezione.get(a.collezione) : null;
    if (c && c.sua && !c.chiusa && c.mancanti.includes(a.id)) {
      const ultimo = c.manca === 1;
      const conta = c.ha + " su " + c.totale;
      const suo = perId.get(c.posseduti[0]);
      const frase = ultimo
        ? scegliFrase(
            "Ti chiude la collezione " + c.nome + " — " + conta,
            "Ti chiude la collezione " + c.nome,
            "Ti chiude " + c.nome + " — " + conta)
        : (c.ha === 1 && suo)
          ? scegliFrase(
              "Della collezione del tuo " + suo.nome,
              "Della collezione " + c.nome + " — " + conta)
          : scegliFrase(
              "Della tua collezione " + c.nome + " — " + conta,
              "Della collezione " + c.nome);
      metti("chiude_collezione", {
        s: 1, bonus: ultimo ? EXTRA.chiude_ultimo : 0,
        regola: ultimo ? "chiude_collezione" : "collezione",
        gruppo: c.id, frase,
        dati: [
          { campo: "collezione", valore: c.nome },
          { campo: "posseduti", valore: c.ha, pezzi: c.posseduti },
          { campo: "totale", valore: c.totale },
        ],
      });
    }

    /* 2 · DA PRENDERE (35) — il segnale più forte dopo la collezione,
       perché è l'unico che ha scritto lei con un dito. */
    if (wishlist.has(a.id)) {
      const d = dettagliLista[a.id] || {};
      const quando = d.creata_il || d.dal || null;
      metti("da_prendere", {
        s: 1, frase: scegliFrase(
          quando ? "Lo hai messo da parte il " + giornoEMese(quando) : null,
          "Lo hai messo da parte"),
        dati: quando ? [{ campo: "messo_da_parte", valore: quando }] : [],
      });
    }

    /* 3 · DATA VICINA ≤ 14 GIORNI (30, +10 se la persona è nota) ────
       La data è vera e sta nel profilo: è il dato che rende Regina
       insostituibile per chi deve fare un regalo. Per una data di
       QUALCUN ALTRO di cui non si sa niente, senza co-acquisto il
       componente non scatta: la data si mostra da sola, senza pezzi
       (`esito.date`), che è meglio di un regalo indovinato. */
    if (dateVicine.length) {
      const v = dateVicine[0];
      const persona = personaDi(v.r);
      const misuraLoro = persona && persona.misura_anello != null ? String(persona.misura_anello) : null;
      const materiaLoro = persona && persona.materia ? persona.materia : null;
      const combacia = v.r.propria
        ? ((misuraSua && misuraDi(a) === misuraSua) || (materia && metalloDi(a) === materia))
        : ((misuraLoro && misuraDi(a) === misuraLoro) || (materiaLoro && metalloDi(a) === materiaLoro));
      const noto = v.r.propria || !!persona;
      if (noto || !coSpento) {
        const quando = giornoEMese(v.quando);
        const chi = nomeDellaData(v.r);
        const base = v.r.propria
          ? (v.r.tipo === "anniversario" ? "Per il tuo anniversario" : "Per il tuo compleanno")
          : "Per " + chi;
        const frase = scegliFrase(
          combacia && !v.r.propria ? base + ", il " + quando + " — della sua misura" : null,
          combacia && v.r.propria && misuraSua && misuraDi(a) === misuraSua
            ? base + ", il " + quando + " — della tua misura" : null,
          base + ", il " + quando,
          base);
        metti("data_vicina", {
          s: 1, bonus: combacia ? EXTRA.data_persona_nota : 0,
          gruppo: v.r.id, frase,
          dati: [
            { campo: "ricorrenza", valore: v.r.id },
            { campo: "data", valore: v.quando },
            { campo: "giorni", valore: v.giorni },
          ],
        });
      }
    }

    /* 4 · PIN DEL NEGOZIO (25) — Stitch Fix: l'algoritmo ORDINA, la
       persona DECIDE. Ogni pin porta mittente e data: niente pin
       anonimi, e senza una nota la frase non esce (allora il pin
       aggiunge punti ma non può vincere come regola). */
    const p = pinPer.get(a.id);
    if (p) {
      const abb = p.abbina_a ? perId.get(p.abbina_a) : null;
      const chi = p.chi || "Regina";
      const frase = scegliFrase(
        abb && posseduti.has(abb.id) ? chi + " lo abbina al tuo " + abb.nome : null,
        p.motivo ? chi + " l’ha scelto: " + p.motivo : null,
        p.in_cima && p.quando ? "Scelto da " + chi + " il " + giornoEMese(p.quando) : null);
      metti("pin", {
        s: 1, frase,
        dati: [
          { campo: "chi", valore: chi },
          { campo: "quando", valore: p.quando || null },
          ...(p.abbina_a ? [{ campo: "abbina_a", valore: p.abbina_a }] : []),
        ],
      });
    }

    /* 5 · CO-ACQUISTO (20) — con un negozio solo e poche decine di
       transazioni al mese questo dato NON ESISTE finché il gestionale
       non lo manda: `n ≥ 5` e `lift ≥ 1,5`, e il numero che si scrive
       in frase è quello vero, verificabile in cassa. */
    if (coSpento) {
      metti("co_acquisto", { s: 0, spento: true, frase: null, dati: [] });
    } else {
      let best = null;
      for (const r of coRighe) {
        if (!r || r.y !== a.id || !posseduti.has(r.x)) continue;
        if (!(r.n >= SOGLIE.co_acquisto_n) || !(r.lift >= SOGLIE.co_acquisto_lift)) continue;
        if (!best || r.lift > best.lift) best = r;
      }
      if (best) {
        const suo = perId.get(best.x);
        metti("co_acquisto", {
          s: Math.min(1, (best.lift - 1) / 2),
          frase: scegliFrase(
            suo ? best.n + " clienti con l’" + suo.nome + " l’hanno preso" : null,
            suo ? best.n + " che hanno il " + suo.nome + " l’hanno preso" : null,
            best.n + " clienti l’hanno preso con un tuo pezzo"),
          dati: [
            { campo: "n", valore: best.n },
            { campo: "lift", valore: best.lift },
            { campo: "con", valore: best.x },
          ],
        });
      }
    }

    /* 6 · ARRIVO IN COLLEZIONE / NELLA SUA MATERIA (12) — «novità» è
       un movimento di carico con una data, non un'etichetta. La data
       si scrive per esteso: mai un countdown. */
    const arr = arrivoDi.get(a.id);
    if (arr && arr.data) {
      const eta = giorniFra(arr.data, oggi);
      const recente = eta >= -SOGLIE.giorni_arrivo && eta <= SOGLIE.giorni_arrivo;
      const sua = (c && c.sua) || (materia && metalloDi(a) === materia);
      if (recente && sua) {
        const g = giornoSettimana(arr.data);
        const futuro = giorniFra(oggi, arr.data) > 0;
        const frase = scegliFrase(
          c && c.sua ? (futuro ? "In vetrina da " + g + ", collezione " + c.nome
                               : "In vetrina da " + g + ", della collezione " + c.nome) : null,
          materia && metalloDi(a) === materia ? "In vetrina da " + g + ", in " + materia + " come i tuoi" : null,
          "In vetrina da " + g);
        metti("arrivo_in_collezione", {
          s: 1, frase,
          dati: [{ campo: "arrivo", valore: arr.data }],
        });
      }
    }

    /* 7 · MATERIA COERENTE (10) — stessa materia di ≥ 2 pezzi che ha. */
    if (materia && metalloDi(a) === materia) {
      metti("materia", {
        s: 1,
        frase: scegliFrase("Nella tua materia (" + materia + ")"),
        gruppo: materia,
        dati: [{ campo: "materia", valore: materia }],
      });
    }

    /* 8 · FAMIGLIA MANCANTE (8) — ha ≥ 3 pezzi e zero in questa
       famiglia. Con meno di tre pezzi non è un buco: è l'inizio. */
    const fam = famigliaDi(a);
    if (suoi.length >= SOGLIE.famiglia_pezzi && fam && !famiglieSue.has(fam)) {
      const sing = FAMIGLIA_SINGOLARE[String(fam).toLowerCase()] ||
                   FAMIGLIA_SINGOLARE[String(nomeFamiglia(a)).toLowerCase()] || null;
      metti("famiglia_mancante", {
        s: 1, gruppo: fam,
        frase: scegliFrase(sing ? "Non hai ancora " + sing : null),
        dati: [{ campo: "famiglia", valore: nomeFamiglia(a) || fam }],
      });
    }

    /* 9 · FASCIA DI PREZZO (8 / −10) — NON PRODUCE FRASE, MAI. Il
       prezzo non è un perché: è un modo per non proporre a chi compra
       a ventisei euro un pezzo da ottantanove. Non potendo vincere da
       solo, un candidato che ha solo questo componente non esce. */
    const pz = prezzoDi(a);
    if (medianaPrezzo > 0 && pz > 0) {
      if (pz >= medianaPrezzo * SOGLIE.prezzo_dentro_min && pz <= medianaPrezzo * SOGLIE.prezzo_dentro_max) {
        metti("prezzo", { s: 1, frase: null, dati: [] });
      } else if (massimoPrezzo > 0 && pz > massimoPrezzo * SOGLIE.prezzo_fuori) {
        metti("prezzo", { s: 0, bonus: EXTRA.prezzo_fuori_scala, frase: null, dati: [] });
      }
    }

    /* 10 · MISURA GIUSTA (6) — il filtro duro ha già tolto le altre:
       questo è il PREMIO di chi la misura ce l'ha uguale, e la frase
       nomina un numero che sta nel suo profilo. */
    if (misuraSua && misuraDi(a) === misuraSua) {
      metti("misura", {
        s: 1,
        frase: scegliFrase("Della tua misura (" + misuraSua + ")"),
        gruppo: "misura-" + misuraSua,
        dati: [{ campo: "misura", valore: misuraSua }],
      });
    }

    /* la somma, e la regola che ha vinto ──────────────────────────
       Vince il componente col CONTRIBUTO MAGGIORE fra quelli che
       sanno scrivere una frase. Il prezzo non ne scrive: se il
       contributo più alto è il prezzo, la proposta non esce. */
    let punteggio = 0;
    for (const k of Object.keys(comp)) punteggio += comp[k].punti;
    punteggio = Math.max(0, Math.min(100, punteggio));

    let vinto = null;
    for (const k of ORDINE_REGOLE) {
      const x = comp[k];
      if (!x || !x.frase) continue;
      if (!vinto || x.punti > comp[vinto].punti) vinto = k;
    }

    return {
      articolo: a,
      id: a.id,
      punteggio,
      componenti: comp,
      regola: vinto ? comp[vinto].regola : null,
      chiave: vinto,
      gruppo: vinto ? comp[vinto].gruppo : null,
      frase: vinto ? comp[vinto].frase : null,
      dati: vinto ? comp[vinto].dati : [],
    };
  }

  function personaDi(r) {
    const el = (s.persone || []).find((p) => p && (p.id === r.persona || p.nome === r.persona));
    return el || null;
  }
  function nomeDellaData(r) {
    if (r.persona && typeof r.persona === "string") return r.persona;
    const et = String(r.titolo || r.etichetta || "").trim();
    if (r.tipo === "compleanno") {
      const chi = et.replace(/^.*?\bdi\s+/i, "");
      return chi || et || "la tua data";
    }
    return et || "la tua data";
  }

  /* ── il tie-break, DICHIARATO: prezzo più vicino alla mediana, poi
     arrivo più recente, poi l'id. Nessuna casualità: una proposta che
     cambia a ogni apertura non si può verificare e non si può
     difendere al banco. ─────────────────────────────────────────── */
  const distanza = (x) => medianaPrezzo ? Math.abs(prezzoDi(x.articolo) - medianaPrezzo) : 0;
  const arrivoIso = (x) => (arrivoDi.get(x.id) || {}).data || "";
  const ordina = (a, b) =>
    b.punteggio - a.punteggio ||
    distanza(a) - distanza(b) ||
    String(arrivoIso(b)).localeCompare(String(arrivoIso(a))) ||
    String(a.id).localeCompare(String(b.id));

  /* solo chi ha una regola con una frase è una PROPOSTA. Gli altri
     sono pezzi del catalogo, e il loro posto è la vetrina. */
  const proposte_ = valutati.filter((x) => x.regola && x.frase).sort(ordina);

  /* ═══════════════════════════════════════════════════════════════
     IL BLOCCO GRANDE. Precedenza: pin «in cima» → ordine fisso delle
     regole → punteggio. Se nessuna regola grande scatta, NESSUN
     blocco grande: non si riempie col rail.
     ═══════════════════════════════════════════════════════════════ */
  const sessioneCorrente = R.registro.sessione.id === sessione ? R.registro.sessione : { id: sessione, rifiuti: 0 };
  /* LA CHIUSURA È UNA DATA, NON UN CONTATORE DI SESSIONE (critic 20/09).
     Prima era `sessioneCorrente.rifiuti >= 2`: vero SOLO dentro la
     stessa sessione, quindi un ricarico (una sessione nuova) smentiva
     «ci risentiamo lunedì» nell'istante in cui la si leggeva di nuovo.
     `chiusa_fino` lo scrive `applicaVerdetto` al secondo rifiuto, ed è
     un fatto dello STATO: resta vero finché `oggi` non lo supera, IN
     QUALUNQUE SESSIONE — e da quel lunedì riapre da sola, perché il
     confronto torna falso. */
  const chiusa = R.chiusa_fino != null && giorniFra(oggi, R.chiusa_fino) > 0;

  let grande = null;
  if (!chiusa) {
    const perGrande = proposte_.filter((x) =>
      REGOLE_GRANDI.has(x.regola) &&
      frescoPer(x.id, "grande") &&
      /* misura ignota: gli anelli non vanno nel blocco grande. Mai una
         proposta che parla di un pezzo che forse non le entra. */
      !(!misuraSua && misuraDi(x.articolo)));

    const inCima = perGrande.find((x) => {
      const p = pinPer.get(x.id);
      return p && p.in_cima && (!p.fino || giorniFra(oggi, p.fino) >= 0);
    });
    if (inCima) grande = inCima;
    else {
      for (const r of ORDINE_REGOLE) {
        if (!REGOLE_GRANDI.has(r)) continue;
        const q = perGrande.filter((x) => x.regola === r);
        if (q.length) { grande = q[0]; break; }
      }
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     I RAIL. Un rail esiste solo con ≥ 3 pezzi veri: meno di tre e il
     rail NON COMPARE — non si allunga con pezzi a punteggio basso.
     ═══════════════════════════════════════════════════════════════ */
  const presi = new Set(grande ? [grande.id] : []);
  const perRailProposte = proposte_.filter((x) =>
    !presi.has(x.id) && !inAttesa.has(x.id) && frescoPer(x.id, "rail"));

  const gruppi = new Map();
  for (const x of perRailProposte) {
    const k = x.regola + (x.gruppo ? "·" + x.gruppo : "");
    if (!gruppi.has(k)) gruppi.set(k, { regola: x.regola, gruppo: x.gruppo, pezzi: [] });
    gruppi.get(k).pezzi.push(x);
  }

  /* MISURA IGNOTA: gli anelli non spariscono, ma escono dichiarando
     che la misura manca. È l'unico rail che si può scrivere onestamente
     quando del suo dito non si sa niente. */
  if (!misuraSua) {
    const anelli = perRailProposte.filter((x) => misuraDi(x.articolo));
    if (anelli.length >= FORMA.rail_minimo) {
      gruppi.set("misura_ignota", { regola: "misura_ignota", gruppo: null, pezzi: anelli });
    }
  }

  const rail = [];
  for (const r of ORDINE_REGOLE) {
    if (grande && r === grande.regola && r !== "collezione") continue;
    for (const g of gruppi.values()) {
      if (g.regola !== r) continue;
      const tetto = RAIL_MONOFAMIGLIA.has(r) ? Infinity : DIVERSITA.tetto_famiglia;
      let pezzi = diversifica(g.pezzi, tetto).slice(0, perRail);
      /* IL TETTO È UNA PREFERENZA, L'ESISTENZA DEL RAIL È UN FATTO.
         «Della collezione del tuo Anello Uno» con tre pezzi che sono
         tre anelli non è poca varietà: è la collezione, che è fatta
         così. Se il tetto porterebbe il rail sotto i tre pezzi veri, il
         tetto si sospende — e si dichiara, perché il negozio deve
         poterlo vedere nel registro invece che indovinarlo. */
      let sospeso = false;
      if (pezzi.length < FORMA.rail_minimo && g.pezzi.length >= FORMA.rail_minimo) {
        pezzi = diversifica(g.pezzi, Infinity).slice(0, perRail);
        sospeso = pezzi.length >= FORMA.rail_minimo;
      }
      if (pezzi.length < FORMA.rail_minimo) continue;
      rail.push({
        regola: r,
        gruppo: g.gruppo,
        titolo: titoloRail(r, g, pezzi),
        pezzi,
        tetto_sospeso: sospeso,
        altri: Math.max(0, g.pezzi.length - pezzi.length),
      });
      for (const x of pezzi) presi.add(x.id);
      if (rail.length >= railMax) break;
    }
    if (rail.length >= railMax) break;
  }

  /* MMR semplificato (Carbonell & Goldstein 1998), λ = 0,7: dopo ogni
     pezzo scelto si tolgono punti a chi gli somiglia. Sopra la penalità
     morbida c'è il tetto duro di famiglia, che è la garanzia. */
  function diversifica(lista, tetto) {
    const resto = lista.slice().sort(ordina);
    const scelti = [];
    const perFamiglia = new Map();
    while (resto.length) {
      let iMigliore = -1, migliore = -Infinity;
      for (let i = 0; i < resto.length; i++) {
        const x = resto[i];
        const f = famigliaDi(x.articolo);
        if ((perFamiglia.get(f) || 0) >= tetto) continue;
        let p = x.punteggio;
        for (const y of scelti) {
          const stessaFam = famigliaDi(y.articolo) === f;
          const stessaMat = metalloDi(y.articolo) === metalloDi(x.articolo);
          if (stessaFam && stessaMat) p += DIVERSITA.stessa_famiglia_e_materia;
          else if (stessaFam) p += DIVERSITA.stessa_famiglia;
        }
        if (p > migliore) { migliore = p; iMigliore = i; }
      }
      if (iMigliore < 0) break;
      const v = resto.splice(iMigliore, 1)[0];
      scelti.push(v);
      const f = famigliaDi(v.articolo);
      perFamiglia.set(f, (perFamiglia.get(f) || 0) + 1);
    }
    return scelti;
  }

  function titoloRail(r, g, pezzi) {
    const primo = pezzi[0];
    if (r === "collezione") {
      const c = g.gruppo ? perCollezione.get(g.gruppo) : null;
      if (c && c.ha === 1) {
        const suo = perId.get(c.posseduti[0]);
        if (suo) return scegliFrase("Della collezione del tuo " + suo.nome,
                                    "Della collezione " + c.nome) || ("Della collezione " + c.nome);
      }
      return scegliFrase("Della tua collezione " + (c ? c.nome : ""),
                         "Della collezione " + (c ? c.nome : "")) || primo.frase;
    }
    if (r === "misura_ignota") return "Anelli — misura da prendere in negozio";
    if (r === "da_prendere") return "Quello che hai messo da parte";
    if (r === "arrivo_in_collezione") return "Arrivati in negozio";
    if (r === "pin") return "Scelti da Regina";
    if (r === "co_acquisto") return "Presi insieme al tuo";
    /* misura, materia, famiglia_mancante e data_vicina hanno già la
       frase giusta nel componente: il titolo del rail È quella frase. */
    return primo.frase;
  }

  /* ── le date che si mostrano SENZA pezzi ───────────────────────── */
  const date = dateVicine
    .filter((v) => !grande || grande.regola !== "data_vicina" || (grande.dati || [])
      .every((d) => d.campo !== "ricorrenza" || d.valore !== v.r.id))
    .map((v) => ({
      ricorrenza: v.r.id, data: v.quando, giorni: v.giorni,
      titolo: (v.r.propria
        ? (v.r.tipo === "anniversario" ? "Il tuo anniversario" : "Il tuo compleanno")
        : "Il compleanno di " + nomeDellaData(v.r)) + " è il " + giornoEMese(v.quando),
    }));

  /* ── IL REGISTRO NUOVO: mostrate + freschezza. Torna, non si
     scrive: chi chiama lo persiste con `proposta/verdetto`. ──────── */
  const regole = { ...R.registro.regole };
  const mostrate = { ...R.registro.mostrate };
  const segna = (x, posto) => {
    const r = regole[x.regola] || { mostrate: 0, aperte: 0, daparte: 0, comprate: 0, rifiuti: 0, frasi: {} };
    regole[x.regola] = {
      ...r, mostrate: r.mostrate + 1,
      frasi: { ...r.frasi, [x.frase]: (r.frasi[x.frase] || 0) + 1 },
    };
    mostrate[x.id] = { posto, regola: x.regola, quando: oggi };
  };
  if (grande) segna(grande, "grande");
  for (const r of rail) for (const x of r.pezzi) segna(x, "rail");

  /* ── LA FINE, DICHIARATA. Chi ha tutto non riceve un ripiego: si
     dice che non c'è altro, e basta. Un «Per te» riempito con pezzi a
     punteggio otto è peggio di un «Per te» che finisce. ──────────── */
  const tuttoSuo = candidati.length === 0 && posseduti.size > 0;

  return {
    oggi,
    grande,
    rail,
    registro: { regole, mostrate, sessione: sessioneCorrente },
    /* il contorno, per chi disegna la pagina */
    date,
    stati,
    collezioni,
    mie: collezioni.filter((c) => c.sua),
    materia,
    misura: misuraSua,
    misura_fonte: misuraFonte,
    mediana_prezzo: medianaPrezzo,
    candidati: candidati.length,
    valutati,
    scarti,
    pin_non_attivi: pinNonAttivi,
    co_acquisto_spento: coSpento,
    sessione_chiusa: chiusa,
    /* la data vera dietro «ci risentiamo lunedì» — null se non è mai
       scattata, o se il lunedì è già passato (`chiusa` sopra lo sa già
       leggere; questo campo è per chi deve MOSTRARLA o verificarla). */
    chiusa_fino: R.chiusa_fino,
    rigenerazione: { usate: sessioneCorrente.rifiuti, disponibili: Math.max(0, 1 - sessioneCorrente.rifiuti) },
    fine: chiusa ? FINE_SESSIONE : (tuttoSuo ? FINE_TUTTO : FINE),
    tutto_suo: tuttoSuo,
  };
}

/* ═══════════════════════════════════════════════════════════════════
   7 · `spiega(proposta)` — la riga «Perché:».

   Una riga sola, sotto il prezzo. Non aggiunge niente a quello che il
   componente ha già scritto: esiste perché la vista non debba sapere
   che la frase sta in `proposta.frase`, e perché un giorno la riga
   possa cambiare forma in un posto solo.
   ═══════════════════════════════════════════════════════════════════ */
export function spiega(proposta) {
  if (!proposta || !proposta.frase) return null;
  return fraseValida(proposta.frase) ? proposta.frase : null;
}

/* ═══════════════════════════════════════════════════════════════════
   8 · I RIDUTTORI — puri, immutabili a un livello, copiati alla riga in
   `app/stato.js`. Stanno qui perché il motore si collauda in node senza
   store, e stanno là perché lo store non deve importare il motore.
   Se un giorno divergono, quello sbagliato è il riduttore dello store.
   ═══════════════════════════════════════════════════════════════════ */

/* `applicaVerdetto(stato, {articolo, esito, regola, oggi, sessione, frase})`
   Esiti, dal più forte: comprato › da_parte › aperto › nessuno › rifiuto.
   Uno per proposta: si tiene il più forte ricevuto, perché una che apre
   e poi compra ha comprato.
   Il RIFIUTO fa tre cose insieme: conta nel registro, esclude
   l'articolo per novanta giorni, e spende una delle rigenerazioni della
   sessione. La prima rigenerazione porta il secondo candidato della
   STESSA regola; la seconda no — la card diventa «Va bene, ci
   risentiamo lunedì». Se il no rigenerasse all'infinito il pulsante
   sarebbe una slot machine. */
export function applicaVerdetto(stato, dato = {}) {
  const { articolo, esito } = dato;
  if (!articolo || !ESITI.includes(esito)) return stato;
  const oggi = dato.oggi || null;
  if (esito === "rifiuto" && !oggi) {
    throw new Error("applicaVerdetto: un rifiuto ha bisogno di `oggi` — l'esclusione dura novanta giorni da una data vera.");
  }
  const R = ramo(stato);
  const regola = dato.regola ||
    (R.registro.mostrate[articolo] && R.registro.mostrate[articolo].regola) || "ignota";

  /* il verdetto: uno per (articolo, regola), il più forte vince */
  const i = R.verdetti.findIndex((v) => v.articolo === articolo && v.regola === regola);
  let verdetti = R.verdetti;
  if (i < 0) {
    verdetti = [...R.verdetti, { articolo, regola, esito, quando: oggi, frase: dato.frase || null }];
  } else if (FORZA[esito] > FORZA[R.verdetti[i].esito]) {
    verdetti = R.verdetti.slice();
    verdetti[i] = { ...verdetti[i], esito, quando: oggi, frase: dato.frase || verdetti[i].frase };
  }

  /* il registro delle regole: le colonne che il negozio legge */
  const r0 = R.registro.regole[regola] ||
    { mostrate: 0, aperte: 0, daparte: 0, comprate: 0, rifiuti: 0, frasi: {} };
  const colonna = { comprato: "comprate", da_parte: "daparte", aperto: "aperte", rifiuto: "rifiuti" }[esito];
  const regole = { ...R.registro.regole };
  regole[regola] = colonna ? { ...r0, [colonna]: (r0[colonna] || 0) + 1 } : { ...r0 };

  /* la freschezza: un verdetto è un contatto, e il contatto data il
     pezzo anche se il ricalcolo non è ancora passato. */
  const mostrate = { ...R.registro.mostrate };
  if (oggi) {
    const m = mostrate[articolo] || { posto: "grande", regola };
    mostrate[articolo] = { ...m, regola, quando: oggi };
  }

  /* il rifiuto: 90 giorni fuori, e una rigenerazione spesa */
  const rifiuti = { ...R.rifiuti };
  let sessione = R.registro.sessione;
  let chiusaFino = R.chiusa_fino;
  if (esito === "rifiuto") {
    rifiuti[articolo] = oggi;
    const id = dato.sessione != null ? dato.sessione : sessione.id;
    sessione = (sessione.id === id)
      ? { id, rifiuti: (sessione.rifiuti || 0) + 1 }
      : { id, rifiuti: 1 };
    /* AL SECONDO RIFIUTO, LA CHIUSURA DIVENTA UN FATTO (critic 20/09):
       si scrive `chiusa_fino` — il lunedì vero, calcolato da `oggi` —
       e da qui in poi «ci risentiamo lunedì» resta vero anche se la
       pagina si ricarica e la sessione cambia. Un terzo rifiuto dentro
       la stessa finestra (non dovrebbe poter succedere: la card sparisce
       prima) non sposterebbe comunque la data in avanti — `chiusa_fino`
       si scrive una volta per chiusura, al momento in cui scatta —
       `>=` e non `===` per restare corretto anche se qualcuno chiama
       questo riduttore più volte oltre la soglia (i collaudi lo fanno). */
    if (sessione.rifiuti >= 2) chiusaFino = prossimoLunedi(oggi);
  } else if (dato.sessione != null && dato.sessione !== sessione.id) {
    sessione = { id: dato.sessione, rifiuti: 0 };
  }

  return {
    ...stato,
    proposte: { ...R, verdetti, rifiuti, chiusa_fino: chiusaFino, registro: { regole, mostrate, sessione } },
  };
}

/* `pin(stato, {articolo, motivo, chi, quando, abbina_a, in_cima, fino, cliente})`
   Il modello è Shopify Search & Discovery: scelte manuali per pezzo,
   con precedenza dichiarata e vincolo di stock. Ogni pin ha MITTENTE e
   DATA — niente pin anonimi, come i movimenti di credito.
   Il pin NON scavalca un filtro duro: un pin su un pezzo esaurito
   resta scritto e il motore lo segnala in `pin_non_attivi`. */
export function pin(stato, dato = {}) {
  const { articolo } = dato;
  if (!articolo) return stato;
  if (!dato.chi || !dato.quando) {
    throw new Error("pin: servono `chi` e `quando` — un pin anonimo non si può difendere al banco.");
  }
  const R = ramo(stato);
  const riga = {
    articolo,
    motivo: dato.motivo || null,
    chi: dato.chi,
    quando: dato.quando,
    abbina_a: dato.abbina_a || null,
    in_cima: !!dato.in_cima,
    fino: dato.fino || null,
    cliente: dato.cliente || null,
  };
  const altri = R.pin.filter((p) => !(p.articolo === articolo && (p.cliente || null) === (riga.cliente || null)));
  return { ...stato, proposte: { ...R, pin: [...altri, riga] } };
}

/* `blocca(stato, {articolo, motivo, chi, quando, cliente})`
   Il blocco vince su tutto (PRECEDENZA[0]): pezzo in uscita, difettoso,
   o «non proporle X» per questa cliente. `cliente: null` blocca per
   tutti. Passare `attivo: false` toglie il blocco senza cancellare la
   riga storica di chi l'aveva messo. */
export function blocca(stato, dato = {}) {
  const { articolo } = dato;
  if (!articolo) return stato;
  if (!dato.chi || !dato.quando) {
    throw new Error("blocca: servono `chi` e `quando` — un blocco anonimo è un pezzo che sparisce senza un perché.");
  }
  const R = ramo(stato);
  const cliente = dato.cliente || null;
  const altri = R.blocchi.filter((b) => !(b.articolo === articolo && (b.cliente || null) === cliente));
  if (dato.attivo === false) return { ...stato, proposte: { ...R, blocchi: altri } };
  return {
    ...stato,
    proposte: {
      ...R,
      blocchi: [...altri, { articolo, motivo: dato.motivo || null, chi: dato.chi, quando: dato.quando, cliente }],
    },
  };
}

/* il take-rate per regola, che è la metrica di Netflix portata in
   gioielleria: proposte mostrate → acquisti. Si legge in backoffice, e
   i pesi si correggono A MANO. */
export function taleRate(stato) {
  const R = ramo(stato);
  const fuori = {};
  for (const [regola, r] of Object.entries(R.registro.regole)) {
    const m = r.mostrate || 0;
    fuori[regola] = {
      ...r,
      take_rate: m ? (r.comprate || 0) / m : null,
      accettazione: m ? ((r.comprate || 0) + (r.daparte || 0)) / m : null,
      rifiuto: m ? (r.rifiuti || 0) / m : null,
    };
  }
  return fuori;
}

export default proposte;
