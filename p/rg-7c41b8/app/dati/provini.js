/* ═══════════════════════════════════════════════════════════════════════
   I PROVINI — segnaposto, non fotografie. Ma PACKSHOT, non ambienti.

   Ognuno di questi 22 file e' un fotogramma della scena 3D
   (`studio/prova3d/spazio.html`): il pezzo portato al livello 2, con la
   SUA luce e il SUO ambiente — la scatola di luce da vetrina non si tocca,
   quindi il metallo e' lo stesso dell'app — ma con la stanza, il mobile,
   il banco e gli espositori SPENTI, e il fondo portato a una tinta
   uniforme #E7E0D3 (`--provino`). Niente bokeh: un fondo piatto non ha
   niente da sfocare.

   PERCHE'. La prima tornata usava il fondo della scena — la stanza fuori
   fuoco e il filo del banco. Sulla carta ogni cella diventava una
   tessera scura e il pezzo ci spariva dentro; le ancore vere (Net-a-
   Porter, Cettire, Louis Vuitton) hanno tutte il packshot su campo
   chiaro e uniforme. Il fondo non e' decorazione: e' quello che fa
   leggere il pezzo in una griglia.

   LA SCALA E' DI GRUPPO, NON DI PEZZO. Dentro un gruppo il riquadro di
   ritaglio e' uno solo — quello che serve al pezzo piu' grande — cosi'
   un Anello Piccolo resta piu' piccolo di un Anello Grande. Gli
   orecchini sono spezzati in tre gruppi (creole, pendenti, perni)
   apposta: insieme, i tre perni sarebbero tre puntini dentro un quadro
   dettato dalla lunghezza dei pendenti. I perni e le creole sono quindi
   inquadrati PIU' STRETTO degli altri, ed e' una scelta dichiarata.

   DUE TAGLI. `PROVINI` e' il 4:5 a 800x1000 (scheda, card alte);
   `PROVINI_QUADRATI` e' l'1:1 a 800x800 per le celle della vetrina.
   Stesso scatto, stesso centro, stesso colore di fondo. webp q85.

   NON SONO LO SCATTO. Esistono perche' 29 articoli su 34 non hanno una
   fotografia e le card della vetrina e del «Per te» restavano vuote: una
   card vuota e' peggio di un provino dichiarato. Chi li mostra deve dirlo
   — la didascalia del `provino3d` in `catalogo.js` dice gia' «Il pezzo
   vero, in tre dimensioni». Il giorno che arriva lo shooting di Regina,
   `foto_url` prende il posto e questa mappa scende sotto, poi sparisce.

   I 12 articoli fuori scena non ce l'hanno e non possono averlo: non
   hanno un alloggio nel cofanetto, quindi non hanno un modello da
   fotografare.

   Rifatti da: `node _SC2_packshot.mjs` in `studio/prova3d`.
   ═══════════════════════════════════════════════════════════════════════ */

/* il colore del campo: chi impagina una cella la tinge di questo, e il
   provino ci si fonde dentro senza bordo */
export const PROVINO_FONDO = "#E7E0D3";

export const PROVINI = {
  "anello-cabochon": "app/dati/provini/anello-cabochon.webp",
  "anello-filo": "app/dati/provini/anello-filo.webp",
  "anello-grande": "app/dati/provini/anello-grande.webp",
  "anello-fedina": "app/dati/provini/anello-fedina.webp",
  "anello-piccolo": "app/dati/provini/anello-piccolo.webp",
  "collana-maglia": "app/dati/provini/collana-maglia.webp",
  "collana-punto": "app/dati/provini/collana-punto.webp",
  "collana-onda": "app/dati/provini/collana-onda.webp",
  "pendente-turchese": "app/dati/provini/pendente-turchese.webp",
  "creola-media": "app/dati/provini/creola-media.webp",
  "perno-turchese": "app/dati/provini/perno-turchese.webp",
  "pendente-perla": "app/dati/provini/pendente-perla.webp",
  "creola-grande": "app/dati/provini/creola-grande.webp",
  "perno-perla": "app/dati/provini/perno-perla.webp",
  "pendente-cabochon": "app/dati/provini/pendente-cabochon.webp",
  "creola-piccola": "app/dati/provini/creola-piccola.webp",
  "perno-cabochon": "app/dati/provini/perno-cabochon.webp",
  "bracciale-maglia-larga": "app/dati/provini/bracciale-maglia-larga.webp",
  "bracciale-maglia": "app/dati/provini/bracciale-maglia.webp",
  "costa-smeralda": "app/dati/provini/costa-smeralda.webp",
  "tulum": "app/dati/provini/tulum.webp",
  "bora-bora": "app/dati/provini/bora-bora.webp",
};

export const PROVINI_QUADRATI = {
  "anello-cabochon": "app/dati/provini/quadrati/anello-cabochon.webp",
  "anello-filo": "app/dati/provini/quadrati/anello-filo.webp",
  "anello-grande": "app/dati/provini/quadrati/anello-grande.webp",
  "anello-fedina": "app/dati/provini/quadrati/anello-fedina.webp",
  "anello-piccolo": "app/dati/provini/quadrati/anello-piccolo.webp",
  "collana-maglia": "app/dati/provini/quadrati/collana-maglia.webp",
  "collana-punto": "app/dati/provini/quadrati/collana-punto.webp",
  "collana-onda": "app/dati/provini/quadrati/collana-onda.webp",
  "pendente-turchese": "app/dati/provini/quadrati/pendente-turchese.webp",
  "creola-media": "app/dati/provini/quadrati/creola-media.webp",
  "perno-turchese": "app/dati/provini/quadrati/perno-turchese.webp",
  "pendente-perla": "app/dati/provini/quadrati/pendente-perla.webp",
  "creola-grande": "app/dati/provini/quadrati/creola-grande.webp",
  "perno-perla": "app/dati/provini/quadrati/perno-perla.webp",
  "pendente-cabochon": "app/dati/provini/quadrati/pendente-cabochon.webp",
  "creola-piccola": "app/dati/provini/quadrati/creola-piccola.webp",
  "perno-cabochon": "app/dati/provini/quadrati/perno-cabochon.webp",
  "bracciale-maglia-larga": "app/dati/provini/quadrati/bracciale-maglia-larga.webp",
  "bracciale-maglia": "app/dati/provini/quadrati/bracciale-maglia.webp",
  "costa-smeralda": "app/dati/provini/quadrati/costa-smeralda.webp",
  "tulum": "app/dati/provini/quadrati/tulum.webp",
  "bora-bora": "app/dati/provini/quadrati/bora-bora.webp",
};

export const provinoDi = (id) => PROVINI[id] || null;
export const provinoQuadroDi = (id) => PROVINI_QUADRATI[id] || null;
export default PROVINI;
