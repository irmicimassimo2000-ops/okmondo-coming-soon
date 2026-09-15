/* ═══════════════════════════════════════════════════════════════════════
   LE COLLEZIONI.

   Una collezione e' un ELENCO DI ARTICOLI con una frase che li tiene
   insieme e un pezzo che la CHIUDE. Il pezzo che chiude non si compra: si
   riceve avendo tutti gli altri. E' la meccanica che fa tornare una
   persona per il quarto pezzo invece che per il primo.

   DA DOVE VENGONO
   ───────────────
   `filo` e `turchese` sono copiate alla lettera da `const COLLEZIONI` in
   `spazio.html`: i nomi, i pezzi, il nome di chi chiude, la nota e il
   testo delle promo sono quelli. `perla` e `onda` sono DICHIARATE da noi
   per mostrare come si comporta l'app con piu' di due collezioni
   (l'elenco, il filtro, la carta «te ne manca uno»). Sono inventate.

   LA DIFFERENZA COL 3D
   ────────────────────
   In spazio.html un pezzo della collezione e' `{nome, fam, k}` se si HA e
   `{nome, prezzo}` se MANCA: il possesso stava dentro l'elenco. Qui no.
   Qui la collezione dice solo QUALI ARTICOLI la compongono; chi possiede
   cosa lo dice `seme.js` con gli esemplari. E' la correzione di un difetto
   vero: scritto all'altro modo, l'elenco era giusto per Lucia e sbagliato
   per chiunque altro, e la stessa collezione andava riscritta per ogni
   cliente.

   LE PROMO SONO TESTO, ma legato allo STATO. Scritte come un elenco fisso,
   la carta diceva «ti manca un pezzo solo» mentre ne mancavano tre —
   perche' due dei quattro che hai sono arrivati in regalo e non contano.
   Restano parole nostre, modificabili collezione per collezione: cambia
   solo il fatto che ognuna dichiara QUANDO vale.
   ═══════════════════════════════════════════════════════════════════════ */

import { PER_ID } from "./catalogo.js";

export const COLLEZIONI = [
  {
    id: "filo",
    nome: "Filo di Luce",
    racconto:
      "Un filo solo, che gira e non si interrompe mai. Cinque pezzi che si " +
      "portano insieme senza che nessuno prenda il posto dell'altro.",
    stagione: "2026 · continuativa",
    pezzi: [
      "collana-maglia",
      "anello-cabochon",
      "creola-media",
      "bracciale-maglia",
      "pendente-filo",
    ],
    /* chi CHIUDE non e' un articolo del catalogo: non ha prezzo, non ha
       codice fornitore, non si puo' mettere in lista. Per questo
       `articolo` resta null — e il giorno che Stefano decide di
       codificarlo a magazzino basta metterci l'id. */
    chiude: {
      nome: "Il Filo",
      nota:
        "Il pezzo che chiude. Non si compra: si riceve avendo tutti gli " +
        "altri, con il tuo nome incisso dentro.",
      articolo: null,
    },
    promo: {
      manca1:
        "Ti manca un pezzo solo: quello che resta e’ tuo al 20% fino al 30 settembre.",
      manca: "Ne mancano {n}: alla chiusura quello che resta va in sconto.",
      chiusa:
        "Collezione chiusa. Il Filo ti aspetta in negozio con il tuo nome incisso dentro.",
      sempre:
        "A collezione chiusa l’incisione e’ compresa, e l’astuccio grande e’ in regalo.",
    },
  },

  {
    id: "turchese",
    nome: "Turchese",
    racconto:
      "La pietra e' la stessa in tutti e cinque, e in nessuno e' tagliata " +
      "uguale. E' un cabochon: si guarda dall'alto, non in trasparenza.",
    stagione: "2026 · estate",
    pezzi: [
      "pendente-turchese",
      "anello-filo",
      "perno-turchese",
      "collana-onda",
      "girocollo-turchese",
    ],
    chiude: {
      nome: "La Pietra",
      nota: "Il pezzo che chiude. Non si compra, e ogni anno ne escono dodici.",
      articolo: null,
    },
    promo: {
      manca1: "Ti manca un pezzo solo: quello che resta e’ tuo al 20%.",
      manca: "Ne mancano {n}: alla chiusura quello che resta va in sconto.",
      chiusa: "Collezione chiusa. La Pietra ti aspetta in negozio.",
      sempre: null,
    },
  },

  /* ── DA QUI IN GIU': COLLEZIONI DICHIARATE DA NOI ─────────────────── */

  {
    id: "perla",
    nome: "Perla d'Estate",
    racconto:
      "Perla d'acqua dolce, quindi mai due uguali: la forma e' quella che " +
      "e' venuta. Sei pezzi che stanno bene sulla pelle abbronzata e " +
      "peggio sotto il profumo.",
    stagione: "2027 · estate",
    pezzi: [
      "collana-perla",
      "bracciale-perla",
      "creola-perla",
      "anello-perla",
      "pendente-perla",
      "perno-perla",
    ],
    chiude: {
      nome: "La Goccia",
      nota:
        "Il pezzo che chiude. Una sola perla, scelta al banco fra quelle " +
        "del cassetto: la si guarda prima di portarla via.",
      articolo: null,
    },
    promo: {
      manca1: "Ti manca un pezzo solo: quello che resta e’ tuo al 20%.",
      manca: "Ne mancano {n}: alla chiusura quello che resta va in sconto.",
      chiusa: "Collezione chiusa. La Goccia si sceglie in negozio, una per volta.",
      sempre: null,
    },
  },

  {
    id: "onda",
    nome: "Onda",
    racconto:
      "La stessa maglia ondulata portata in cinque punti diversi: collo, " +
      "polso, caviglia, orecchio, dito. Si compra un pezzo e si finisce " +
      "per volerli tutti nello stesso posto.",
    stagione: "2027 · primavera",
    pezzi: [
      "collana-smalto",
      "bracciale-onda",
      "cavigliera-onda",
      "creola-smalto",
      "anello-onda",
    ],
    chiude: {
      nome: "L'Onda Lunga",
      nota:
        "Il pezzo che chiude. E' la cavigliera nella misura lunga, che non " +
        "sta a listino e si fa su misura del piede.",
      articolo: null,
    },
    promo: {
      manca1: "Ti manca un pezzo solo: quello che resta e’ tuo al 20%.",
      manca: "Ne mancano {n}: alla chiusura quello che resta va in sconto.",
      chiusa: "Collezione chiusa. L'Onda Lunga si misura al banco.",
      sempre: null,
    },
  },
];

export const PER_ID_COLLEZIONE = new Map(COLLEZIONI.map((c) => [c.id, c]));
export const collezione = (id) => PER_ID_COLLEZIONE.get(id) || null;

/* gli articoli veri di una collezione, gia' risolti. Se un id non esiste
   nel catalogo qui torna `undefined` e la verifica lo grida: e' il modo
   piu' veloce per accorgersi di un pezzo rinominato in un posto solo. */
export const pezziDi = (id) =>
  (collezione(id)?.pezzi || []).map((pid) => PER_ID.get(pid));

/* LO STATO della collezione per UNA persona: quanti ne ha, quanti ne
   mancano, e QUALE frase di promo vale adesso. `posseduti` e' l'insieme
   degli id articolo che quella persona ha davvero (glielo passa il seme).
   La regola del regalo sta fuori di qui: chi chiama decide se un pezzo
   ricevuto conta o no, e passa l'insieme gia' filtrato. */
export function statoCollezione(id, posseduti) {
  const c = collezione(id);
  if (!c) return null;
  const ha = c.pezzi.filter((pid) => posseduti.has(pid));
  const mancano = c.pezzi.filter((pid) => !posseduti.has(pid));
  const n = mancano.length;
  const frase =
    n === 0 ? c.promo.chiusa : n === 1 ? c.promo.manca1 : c.promo.manca.replace("{n}", n);
  return {
    collezione: c,
    totale: c.pezzi.length,
    ha,
    mancano,
    chiusa: n === 0,
    frase,
    /* `sempre` e' la riga che vale a collezione chiusa e che si mostra
       ACCANTO a `frase`, non al suo posto: sono due cose diverse: una
       dice a che punto sei, l'altra cosa ti spetta. */
    sempre: n === 0 ? c.promo.sempre : null,
  };
}

export default COLLEZIONI;
