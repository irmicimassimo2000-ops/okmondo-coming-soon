/* ═══════════════════════════════════════════════════════════════════════
   IL SEME — lo stato iniziale della demo.

   Il catalogo è del NEGOZIO e non cambia da una persona all'altra. Questo
   file invece è di UNA persona sola: Lucia Sabatini, tessera RJ 00042.
   È quello che nell'app vera arriverebbe da Supabase dopo il login, ed è
   tenuto separato apposta: il giorno che si attacca il gestionale si butta
   questo file, non si riscrive l'app.

   LA REGOLA CHE TIENE INSIEME TUTTO: NIENTE NUMERI SCOLLEGATI.
   Il credito è la SOMMA dei movimenti. Lo speso_totale è la somma di
   quello che Lucia ha pagato DI TASCA SUA (i regali di Antonio non le
   fanno livello: li ha pagati lui). Il livello è quello che le soglie
   dicono a partire dallo speso_totale. `_D_verifica.mjs` ricontrolla tutte
   e tre le catene a ogni esecuzione: se qualcuno tocca un prezzo nel
   catalogo e non qui, la verifica fallisce invece di far uscire una carta
   con dentro un numero falso.

   Le otto righe di `esemplari` con `fam`/`k` sono i POSSESSI della scena
   3D: vengono da `const SCHEDA` in `spazio.html`, chiave `"fam:k"`, e le
   date, i luoghi e le dediche sono copiati alla lettera.
   ═══════════════════════════════════════════════════════════════════════ */

export const versione_schema = 1;

/* la data in cui questa demo «è ambientata». Tutte le scadenze, i
   «mancano N giorni» e i preavvisi si calcolano da qui e non da
   `new Date()`: una bozza che si guarda fra due mesi non deve dire
   «l'anniversario era 60 giorni fa». */
export const oggi = "2026-09-15";

/* ── CHI ────────────────────────────────────────────────────────────── */

export const cliente = {
  id: "cli-lucia",
  nome: "Lucia",
  cognome: "Sabatini",
  /* numero inventato, sulla decade 347 e con un gruppo che non esiste come
     prefisso reale: non deve poter squillare a casa di nessuno. */
  telefono: "+39 347 55 12 908",
  /* DATO DI PROVA, DICHIARATO: un indirizzo chiaramente finto, senza un
     dominio reale di terzi (niente `.it`/`.com` che potrebbe esistere
     davvero) — vedi il README dei dati. */
  email: "lucia@reginajewels.prova",
  consenso_email: true,
  consenso_sms: true,
  consenso_data: "2025-03-08",
  consenso_fonte: "banco",

  /* LE MISURE sono il dato che rende Regina insostituibile per chi deve
     fare un regalo: Antonio non sa che anello porta, il negozio si'. */
  misura_anello: "14",
  misura_bracciale: "18 cm",
  misura_collana: "42 cm",

  credito: 25.0,
  speso_totale: 540.0,
  livello: 1,
  tessera_vip: false,
  tessera_numero: 42,
  /* la tessera come si LEGGE, con gli zeri: è quello che sta stampato
     sulla carta e che compare nella testata di ogni pagina. */
  tessera: "RJ 00042",
  cliente_dal: "2025-03-08",
  importato_da: "aurum",
};

/* ── I LIVELLI ──────────────────────────────────────────────────────────
   Nel gestionale `regina_livelli` nasce VUOTA apposta: finché non si
   conoscono scontrino medio e clienti attivi, il credito non matura. Qui
   le quattro righe sono nostre, tarate su un solo vincolo dato: Lucia sta
   al «Secondo» e le mancano 260,00 € per arrivare al 5%.
     540,00 speso  →  Secondo (soglia 300)
     800,00 − 540,00 = 260,00  →  Terzo, che rende il 5%.
   Se si cambia una soglia, quella frase cambia da sola. */

export const livelli = [
  { id: 0, nome: "Primo", soglia_spesa: 0, percentuale: 2, tessera_vip: false },
  { id: 1, nome: "Secondo", soglia_spesa: 300, percentuale: 3, tessera_vip: false },
  { id: 2, nome: "Terzo", soglia_spesa: 800, percentuale: 5, tessera_vip: false },
  { id: 3, nome: "Regina", soglia_spesa: 1500, percentuale: 8, tessera_vip: true },
];

/* ── GLI ESEMPLARI ──────────────────────────────────────────────────────
   Il `codice` è quello della Carta del Pezzo — quello che finisce nel QR
   e che apre `/c/<codice>` a chi scarta il regalo. Nove caratteri da un
   alfabeto senza forme ambigue (niente 0/O, niente 1/I/L), scritti a
   gruppi di tre, perché devono poter essere DETTATI AL TELEFONO quando il
   QR non si inquadra.

   `fam` e `k` sono la posizione nella scena 3D. Un esemplare può non
   averli: è un pezzo che esiste e che si possiede, ma che nel modello non
   ha un alloggio. Si vede in elenco, non nella stanza. Vedi `ponte.js`.

   `stato` segue il gestionale:
     venduto     · la carta è stampata, nessuno l'ha ancora inquadrata
     registrato  · qualcuno l'ha scansionata: è entrata in un Libretto
     trasferito  · ha cambiato Libretto
   Un esemplare `venduto` NON si conta fra i posseduti: è la sorpresa che
   aspetta in negozio, e contarlo rovinerebbe sia il conteggio della
   collezione sia la sorpresa. */

export const esemplari = [
  {
    codice: "RJ-7QK-D4M-XA3",
    articolo: "collana-maglia",
    fam: "busto", k: 0,
    data_vendita: "2026-07-12",
    quando: "12 luglio 2026",
    dove: "Regina, San Severo",
    da: "Antonio",
    firmato: true,
    dedica:
      "Per i tuoi trent’anni, perché tu abbia sempre qualcosa che brilla " +
      "anche nei giorni in cui non ne hai voglia. E perché quando la metti " +
      "ti ricordi che quel giorno c’eravamo tutti, e che era una bella giornata.",
    occasione: "compleanno",
    regalo: true,
    stato: "registrato",
  },
  {
    codice: "RJ-H9F-3TN-KWY",
    articolo: "collana-punto",
    fam: "busto", k: 1,
    data_vendita: "2026-05-03",
    quando: "3 maggio 2026",
    dove: "Regina, San Severo",
    da: null, firmato: false, dedica: null, occasione: null,
    regalo: false,
    stato: "registrato",
  },
  {
    codice: "RJ-CM4-PR7-G9D",
    articolo: "anello-cabochon",
    fam: "anelli", k: 0,
    data_vendita: "2026-07-12",
    quando: "12 luglio 2026",
    dove: "Regina, San Severo",
    da: "Antonio",
    firmato: true,
    dedica: "Il primo.",
    occasione: "compleanno",
    regalo: true,
    stato: "registrato",
  },
  {
    codice: "RJ-YD3-HK9-QF4",
    articolo: "anello-filo",
    fam: "anelli", k: 1,
    data_vendita: "2026-06-28",
    quando: "28 giugno 2026",
    dove: "Regina, San Severo",
    da: null, firmato: false, dedica: null, occasione: null,
    regalo: false,
    stato: "registrato",
  },
  {
    codice: "RJ-4WX-M7C-RJ9",
    articolo: "pendente-turchese",
    fam: "orecchini", k: 0,
    data_vendita: "2026-08-02",
    quando: "2 agosto 2026",
    dove: "Regina, San Severo",
    da: null, firmato: false, dedica: null, occasione: null,
    regalo: false,
    stato: "registrato",
  },
  {
    codice: "RJ-QN7-9XD-M4H",
    articolo: "creola-media",
    fam: "orecchini", k: 1,
    data_vendita: "2026-07-12",
    quando: "12 luglio 2026",
    dove: "Regina, San Severo",
    da: null, firmato: false, dedica: null, occasione: null,
    regalo: false,
    stato: "registrato",
  },
  {
    codice: "RJ-G3K-YW4-P7C",
    articolo: "bracciale-maglia",
    fam: "rampa", k: 1,
    data_vendita: "2026-08-19",
    quando: "19 agosto 2026",
    dove: "Regina, San Severo",
    da: null, firmato: false, dedica: null, occasione: null,
    regalo: false,
    stato: "registrato",
  },
  {
    codice: "RJ-MTA-4H9-DKX",
    articolo: "tulum",
    fam: "orologi", k: 1,
    data_vendita: "2026-09-01",
    quando: "1 settembre 2026",
    dove: "Regina, San Severo",
    da: null,
    firmato: false,
    /* la dedica che una persona scrive A SE' STESSA. Sta nel 3D e vale la
       pena tenerla: è la riga che dice che questa non è un'app di regali. */
    dedica: "Comprato da sola, e va benissimo così.",
    occasione: null,
    regalo: false,
    stato: "registrato",
  },

  /* ── i due che NON stanno nella stanza ──────────────────────────────
     Servono a collaudare il caso che romperebbe l'app: un pezzo vero,
     con la sua carta e il suo codice, che il modello 3D non conosce. */
  {
    codice: "RJ-K9W-CQ3-F7N",
    articolo: "perno-smalto",
    fam: null, k: null,
    data_vendita: "2025-06-14",
    quando: "14 giugno 2025",
    dove: "Regina, San Severo",
    da: null, firmato: false, dedica: null, occasione: null,
    regalo: false,
    stato: "registrato",
  },
  {
    /* IL PEZZO CHE CHIUDE FILO DI LUCE, già pagato da Antonio e già
       stampato, ma non ancora inquadrato da nessuno. Perciò `venduto` e
       non `registrato`: l'app lo mostra come «ti aspetta in negozio» e
       NON lo conta fra i posseduti. È anche il motivo per cui la carta
       di Filo di Luce dice «ti manca un pezzo solo» e non «chiusa». */
    codice: "RJ-DX4-79M-HTQ",
    articolo: "pendente-filo",
    fam: null, k: null,
    data_vendita: "2026-09-12",
    quando: "12 settembre 2026",
    dove: "Regina, San Severo",
    da: null,
    firmato: false,
    dedica: null,
    occasione: "anniversario",
    regalo: true,
    stato: "venduto",
  },
];

/* ── IL CREDITO, riga per riga ──────────────────────────────────────────
   Nel gestionale il saldo NON si scrive: lo tiene un trigger che somma i
   movimenti. Qui vale la stessa regola, e la verifica la ricontrolla.

   Le percentuali sono quelle dei livelli al momento dell'acquisto: 2% nel
   primo anno (Primo livello), 3% da quando è passata al Secondo.
     2025 · 245,00 € di acquisti al 2%  →  4,90
     2026 · 295,00 € di acquisti al 3%  →  8,85
   La somma delle due fa lo speso_totale: 540,00 €. I due regali di
   Antonio del 12 luglio (Collana Maglia e Anello Cabochon, 98,00 €) non
   ci sono dentro: li ha pagati lui, e il livello è di chi paga. */

export const movimenti_credito = [
  { data: "2025-03-08", tipo: "benvenuto", importo: 10.0,
    motivo: "Tessera RJ 00042 · credito di benvenuto" },
  { data: "2025-09-24", tipo: "compleanno", importo: 5.0,
    motivo: "Il mese del compleanno" },
  { data: "2025-12-19", tipo: "maturato", importo: 4.9,
    motivo: "2% sugli acquisti del primo anno · 245,00 €" },
  { data: "2025-12-23", tipo: "scaricato", importo: -3.75,
    motivo: "Scalato sul regalo di Natale" },
  { data: "2026-05-03", tipo: "maturato", importo: 2.07,
    motivo: "3% su Collana Punto · 69,00 €" },
  { data: "2026-06-28", tipo: "maturato", importo: 0.87,
    motivo: "3% su Anello Filo · 29,00 €" },
  { data: "2026-07-12", tipo: "maturato", importo: 0.84,
    motivo: "3% su Creola Media · 28,00 €" },
  { data: "2026-08-02", tipo: "maturato", importo: 0.78,
    motivo: "3% su Pendente Turchese · 26,00 €" },
  { data: "2026-08-19", tipo: "maturato", importo: 1.62,
    motivo: "3% su Bracciale Maglia · 54,00 €" },
  { data: "2026-09-01", tipo: "maturato", importo: 2.67,
    motivo: "3% su Tulum · 89,00 €" },
];

/* ── LE DATE ────────────────────────────────────────────────────────────
   Il patrimonio vero di una gioielleria non è il magazzino, sono le date.
   `avviso` è calcolabile (sette giorni prima) ma sta scritto: il negozio
   deve poterlo spostare per una data sola senza toccare la regola. */

export const ricorrenze = [
  { id: "ric-anniversario", tipo: "anniversario",
    etichetta: "Anniversario di matrimonio con Antonio",
    giorno: 16, mese: 9, anno: 2018, propria: false,
    avviso: { giorno: 9, mese: 9 } },
  { id: "ric-compleanno", tipo: "compleanno",
    etichetta: "Il tuo compleanno",
    giorno: 24, mese: 9, anno: 1991, propria: true,
    avviso: { giorno: 17, mese: 9 } },
];

/* ── LA LISTA ───────────────────────────────────────────────────────────
   Il ponte fra chi indossa e chi paga. Il `token` è quello che sta
   nell'indirizzo da girare ad Antonio: vale per la lista, non per il
   cliente, così si revoca senza toccare l'account.

   NOTA SU UNA DIVERGENZA. Le pagine leggere della bozza (vetrina.html)
   mettevano in lista «Creola Media» e «Pendente Turchese». Secondo lo
   stato del 3D — che qui è la verita' — Lucia possiede già tutti e due,
   e una lista di pezzi che si hanno già non è una lista: è un errore
   che si vede al primo sguardo. Perciò la lista punta ai due pezzi che le
   mancano DAVVERO per chiudere le sue due collezioni. */

export const wishlist = [
  { id: "wl-1", articolo: "girocollo-turchese", priorita: 1,
    visibilita: "condivisa", token: "wl-3f9c2a7b1e",
    note: "Per chiudere il Turchese.", creata_il: "2026-08-30" },
  { id: "wl-2", articolo: "collana-onda", priorita: 2,
    visibilita: "privata", token: "wl-8d41b6c0a2",
    note: null, creata_il: "2026-09-06" },
];

/* ── COME LUCIA HA LASCIATO L'APP ───────────────────────────────────────
   `fodera` è uno dei quattro velluti del cofanetto 3D (velluto | bianco |
   avorio | turchese) e va ricordato: un cliente che prova il turchese al
   banco e torna a casa deve ritrovarlo. `insieme` è la forma dei
   suggerimenti (`?sugg=a|b|c` in spazio.html: riga · carte velate · rail),
   `carta` è cosa apre la Carta del Pezzo (`?carta=foto|finestra|due`),
   `nav` è la sezione della barra in basso. */

export const preferenze = {
  fodera: "turchese",
  insieme: "b",
  carta: "foto",
  nav: "cofanetto",
};

/* ── QUELLO CHE IL NEGOZIO LE HA DETTO ─────────────────────────────────
   Tre notifiche, tre motivi diversi. Più di tre in una settimana e la
   gente disinstalla. */

export const notifiche = [
  { id: "not-1", tipo: "arrivo", data: "2026-09-10",
    titolo: "Sono arrivate le Creole Grandi",
    testo: "Acciaio dorato, 18 mm. Le teniamo da parte se ci dici di sì.",
    articolo: "creola-grande", letta: true },
  { id: "not-2", tipo: "collezione", data: "2026-09-14",
    titolo: "A Filo di Luce manca un pezzo solo",
    testo: "Il Pendente Filo è l’ultimo. Alla chiusura l’incisione è compresa.",
    collezione: "filo", letta: false },
  { id: "not-3", tipo: "compleanno", data: "2026-09-17",
    titolo: "Dal 24 il tuo credito vale il doppio",
    testo: "Per una settimana, i 25,00 € che hai ne valgono 50,00.",
    promozione: "promo-compleanno", letta: false, programmata: true },
];

/* la promozione a cui punta la terza notifica, e che le pagine leggere
   mostrano per esteso nel blocco «Per te». */
export const promozioni = [
  { id: "promo-doppio", nome: "Il credito vale il doppio",
    dal: "2026-09-15", al: "2026-09-21",
    testo: "Dal 15 al 21 settembre il credito vale il doppio, in negozio, su tutta la collezione Filo di Luce. Nessun codice.",
    perche: "La collezione è completa in vetrina per una settimana sola." },
  { id: "promo-compleanno", nome: "Il mese del tuo compleanno",
    dal: "2026-09-24", al: "2026-10-01",
    testo: "Dal 24 settembre il credito che hai vale il doppio, per una settimana.",
    moltiplicatore: 2 },
];

/* ── QUELLO CHE È ARRIVATO IN NEGOZIO ─────────────────────────────────
   Non è «novità» generica: sono quattro articoli con la data in cui
   sono entrati a magazzino, che è il dato che il gestionale conosce
   davvero (il movimento di carico). */

export const arrivi = [
  { articolo: "anello-grande", data: "2026-09-10" },
  { articolo: "creola-grande", data: "2026-09-17" },
  { articolo: "collana-perla", data: "2026-09-17" },
  { articolo: "bracciale-onda", data: "2026-09-24" },
];

/* ── le due letture che servono ovunque ──────────────────────────────── */

/* cosa Lucia HA DAVVERO: solo gli esemplari entrati nel Libretto. Un
   `venduto` non c'è ancora. */
export const posseduti = new Set(
  esemplari.filter((e) => e.stato !== "venduto").map((e) => e.articolo)
);

/* il livello a partire dallo speso: la soglia più alta che si è
   superata. Scritto come funzione e non come numero per non avere due
   verita' quando Lucia spendera' i prossimi 260 €. */
export function livelloDa(speso) {
  let vinto = livelli[0];
  for (const l of livelli) if (speso >= l.soglia_spesa) vinto = l;
  const prossimo = livelli.find((l) => l.soglia_spesa > speso) || null;
  return {
    livello: vinto,
    prossimo,
    manca: prossimo ? Number((prossimo.soglia_spesa - speso).toFixed(2)) : 0,
  };
}

export const saldoCredito = () =>
  Number(movimenti_credito.reduce((s, m) => s + m.importo, 0).toFixed(2));

export default {
  versione_schema, oggi, cliente, livelli, esemplari, movimenti_credito,
  ricorrenze, wishlist, preferenze, notifiche, promozioni, arrivi,
};
