/* ═══════════════════════════════════════════════════════════════════════
   I PROVINI — segnaposto, non fotografie.

   Ognuno di questi 22 file è un fotogramma della scena 3D
   (`studio/prova3d/spazio.html`): il pezzo portato al livello 2 — il pezzo
   scelto, in primo piano, con l'espositore velato — il cromo spento, il
   FONDO CHE È QUELLO DELLA SCENA (la fodera del cofanetto e la stanza
   fuori fuoco), ritagliato 4:5 col 12 per cento di margine attorno al
   pezzo. 800x1000, webp qualità 82.

   NON SONO LO SCATTO. Esistono perché 29 articoli su 34 non hanno una
   fotografia e le card della vetrina e del «Per te» restavano vuote: una
   card vuota è peggio di un provino dichiarato. Chi li mostra deve dirlo
   — la didascalia del `provino3d` in `catalogo.js` dice già «Il pezzo
   vero, in tre dimensioni». Il giorno che arriva lo shooting di Regina,
   `foto_url` prende il posto e questa mappa scende sotto, poi sparisce.

   I 12 articoli fuori scena non ce l'hanno e non possono averlo: non
   hanno un alloggio nel cofanetto, quindi non hanno un modello da
   fotografare.

   Rifatti da: `node _SC_provini.mjs` in `studio/prova3d`.
   ═══════════════════════════════════════════════════════════════════════ */

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

export const provinoDi = (id) => PROVINI[id] || null;
export default PROVINI;
