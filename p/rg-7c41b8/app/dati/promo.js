/* ═══════════════════════════════════════════════════════════════════
   app/dati/promo.js — LE PROMOZIONI DI «DAL NEGOZIO», DATI DI PROVA.

   Il modello dei campi è quello dichiarato in
   `E:\OK.AGENZIA\regina-jewels\studio\elementi\tavole-perte-2\
   PROMO-CONTRATTO.md`: il contratto che la schermata del gestionale di
   Stefano dovrà scrivere un giorno. QUI NON C'È UN GESTIONALE — sono
   DATI DIMOSTRATIVI, dichiarati come tali, e non un'altra invenzione:
   stesso nome, stesse date, stessa collezione della promozione GIÀ
   VERA in `app/dati/seme.js` (`promozioni`, `promo-doppio` e
   `promo-compleanno`) — quella che il blocco P4 di «Per te» leggeva
   fino al 21/09. «Dal negozio» (F6, 28/09) la legge da qui, nella
   forma più ricca che il contratto chiede (immagine, priorità,
   pubblico, `fonte`), invece di ricostruirla a mano nella vista.

   L'IMMAGINE è una delle fotografie lifestyle di Regina (`pezzi/*.jpg`,
   `app/dati/catalogo.js`, tolte dalle schede prodotto lo stesso giorno):
   qui, in un banner promozionale del negozio, una foto lifestyle è
   esattamente il registro giusto — non finge di essere il packshot di
   un articolo.
   ═══════════════════════════════════════════════════════════════════ */

export const PROMOZIONI = [
  {
    id: "promo-doppio",
    titolo: "Il credito vale il doppio",
    sottotitolo: "Dal 15 al 21 settembre, su tutta la collezione Filo di Luce. Nessun codice.",
    immagine: { src: "pezzi/8054321000123.jpg" },
    collegamento: { tipo: "collezione", id: "filo" },
    priorita: 5,
    dal: "2026-09-15", al: "2026-09-21",
    pubblico: { tipo: "tutti" },
    fonte: "negozio",
    superfici: ["hero", "sezione"],
  },
  {
    id: "promo-compleanno",
    titolo: "Il mese del tuo compleanno",
    sottotitolo: "Dal 24 settembre il credito che hai vale il doppio, per una settimana.",
    immagine: { src: "pezzi/rg-fl-002.jpg" },
    collegamento: { tipo: "collezione", id: "turchese" },
    priorita: 3,
    dal: "2026-09-24", al: "2026-10-01",
    pubblico: { tipo: "tutti" },
    fonte: "negozio",
    superfici: ["hero"],
  },
  /* DUE PROMO IN PIÙ (28/09, coordinatore, mossa #1): il carosello
     dell'hero deve reggere N promo, non una sola — qui due in più,
     attive oggi insieme a «promo-doppio», così il negozio locale mostra
     davvero i puntini invece di dichiararli solo nel codice. Stesse
     regole: dati dimostrativi, foto lifestyle di Regina, collegate a
     collezioni vere. */
  {
    id: "promo-perla",
    titolo: "Perla d’Estate è ancora in vetrina",
    sottotitolo: "Dal 8 al 20 settembre, la collezione con la perla che non è mai uguale a sé stessa.",
    immagine: { src: "pezzi/rg-fl-004.jpg" },
    collegamento: { tipo: "collezione", id: "perla" },
    priorita: 4,
    dal: "2026-09-08", al: "2026-09-20",
    pubblico: { tipo: "tutti" },
    fonte: "negozio",
    superfici: ["hero"],
  },
  {
    id: "promo-onda",
    titolo: "La collezione Onda, appena rinnovata",
    sottotitolo: "Dal 12 al 22 settembre, i pezzi nuovi della collezione Onda.",
    immagine: { src: "pezzi/8054321000456.jpg" },
    collegamento: { tipo: "collezione", id: "onda" },
    priorita: 2,
    dal: "2026-09-12", al: "2026-09-22",
    pubblico: { tipo: "tutti" },
    fonte: "negozio",
    superfici: ["hero"],
  },
];

/* le promo ATTIVE oggi, per priorità decrescente — la stessa lettura
   che farebbe l'hero a carosello (E08): oggi ne sono attive tre
   insieme (doppio, perla, onda), e il carosello regge anche con una
   sola — i puntini si spengono da soli sotto i due. */
export function promoAttive(elenco, oggi) {
  return (elenco || [])
    .filter((p) => p && p.dal && p.al && p.dal <= oggi && oggi <= p.al)
    .sort((a, b) => (b.priorita || 0) - (a.priorita || 0));
}

export default PROMOZIONI;
