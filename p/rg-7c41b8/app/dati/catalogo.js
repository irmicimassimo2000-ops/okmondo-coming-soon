/* ═══════════════════════════════════════════════════════════════════════
   IL CATALOGO — gli ARTICOLI di Regina Jewels.

   Un ARTICOLO è il modello: «Anello Cabochon». Ce ne possono essere venti
   uguali in cassetto. Un ESEMPLARE (vedi `seme.js`) è UNO di quei venti,
   quello che è stato venduto a una persona in una data. Il gestionale
   tiene i due su due tabelle diverse, e qui si rispetta la stessa linea:
   confonderli è l'errore che fa dire all'app «hai già questo pezzo»
   quando invece ne ha comprato un secondo per la sorella.

   DA DOVE VENGONO I NUMERI
   ────────────────────────
   I primi 22 articoli (`in_3d: true`) sono la VERITA' della scena 3D:
   nome, materia e prezzo sono copiati alla lettera da `const RIPIANI` in
   `spazio.html`. Se cambia un prezzo lì, cambia qui — e viceversa il
   ponte si rompe. L'indice `k` è la POSIZIONE nel ripiano del modello:
   è quello che il 3D usa per sapere quale mesh illuminare.

   Gli altri 12 (`in_3d: false`) sono inventati da noi per dare al catalogo
   una profondita' credibile — una gioielleria non ha ventidue referenze.
   Restano dentro la fascia reale di Regina (22–89 €) e dentro i materiali
   reali (acciaio dorato, argento 925, perla, turchese, smalto). Sono
   dichiarati nel README: nessuno di questi è un pezzo che Stefano ha in
   negozio oggi.

   I NOMI DEI CAMPI sono quelli della tabella `regina_articoli` del
   gestionale (codice_fornitore / descrizione / prezzo_vendita / foto_url /
   attributi / categoria). Così il giorno che la bozza si attacca a
   Supabase non si riscrive l'app: si riscrive solo la funzione che carica.
   ═══════════════════════════════════════════════════════════════════════ */

/* le cinque famiglie della scena 3D, col nome che si mostra a una persona.
   `busto` e `rampa` sono nomi di ESPOSITORE — il cliente non deve leggerli
   mai: sono il cuscino del collo e la rampa dei bracciali. */
export const FAMIGLIE = {
  busto: "Collane",
  orecchini: "Orecchini",
  anelli: "Anelli",
  rampa: "Bracciali",
  orologi: "Orologi",
};

/* il codice della SCENA, identico alla funzione `CODICE(fam,k)` di
   spazio.html. Riscritto qui e non importato perché spazio.html non è un
   modulo: è l'unico punto in cui i due mondi si toccano senza ponte, e
   per questo sta scritto a fianco della sua fonte. */
export const codiceScena = (famiglia, k) =>
  "RJ-" + famiglia.slice(0, 3).toUpperCase() + "-" + String(k + 1).padStart(3, "0");

/* LE CURE sono per MATERIA, non per pezzo: sono sei frasi, non trentaquattro.
   Un testo per articolo sarebbe finto (e nessuno lo scriverebbe davvero). */
const CURA = {
  dorato:
    "Si asciuga dopo il mare e si ripone asciutto: il dorato non teme l'acqua, " +
    "teme il sale che resta.",
  argento:
    "Si passa col panno di camoscio. L'argento si ossida: è la sua eta', e si " +
    "toglie in un minuto.",
  turchese:
    "Il turchese è poroso: niente creme, niente profumo, niente ammoniaca. " +
    "Un panno asciutto e basta.",
  perla:
    "La perla si indossa per ultima e si toglie per prima: profumo e lacca la " +
    "opacizzano.",
  smalto:
    "Lo smalto teme l'urto, non l'acqua. Si ripone da solo nella sua tasca.",
  orologio:
    "5 ATM: doccia e piscina si', immersione no. La pila si cambia al banco in " +
    "cinque minuti.",
};

/* LA CONSEGNA è un fatto del negozio, quindi sono tre righe sole. */
const CONSEGNA = {
  banco: "Ritiro in negozio lo stesso giorno · spedizione in 2 giorni lavorativi.",
  ordinazione: "Su ordinazione · in negozio entro 5 giorni lavorativi.",
  orologio:
    "Ritiro in negozio con la pila inserita e le maglie regolate al tuo polso.",
};

/* ── la tabella vera ──────────────────────────────────────────────────
   Ogni riga è compatta di proposito: quello che si può DERIVARE non si
   riscrive (id, codice_scena, famiglia_nome, foto del provino). Riscrivere
   a mano un dato derivabile è il modo più rapido per farne divergere due
   copie. */

const P = (r) => {
  const id = r.nome
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const in_3d = typeof r.k === "number";
  /* le fotografie: prima quelle VERE (lo scatto di Regina, che è una foto di
     collezione e non un packshot per articolo — lo dice la didascalia), poi il
     provino 3D come segnaposto. Il provino non ha `src`: non è un file, è
     la scena che si renderizza da sola. Quando arrivera' lo shooting per
     articolo il provino scendera' in fondo e poi sparira'. */
  const foto = [
    ...(r.foto || []).map((src) => ({
      tipo: "scatto",
      src,
      didascalia:
        "Dal catalogo di Regina. Lo scatto ritrae la collezione, non il solo pezzo.",
    })),
    ...(in_3d
      ? [{ tipo: "provino3d", src: null, famiglia: r.fam, k: r.k, didascalia: "Il pezzo vero, in tre dimensioni." }]
      : []),
  ];
  return {
    id,
    codice_fornitore: r.ean,
    codice_scena: in_3d ? codiceScena(r.fam, r.k) : null,
    in_3d,
    famiglia: r.fam,
    famiglia_nome: FAMIGLIE[r.fam],
    k: in_3d ? r.k : null,
    nome: r.nome,
    descrizione: r.desc,
    materia: r.mat,
    prezzo_vendita: r.prezzo,
    attributi: r.att,
    foto,
    /* `foto_url` esiste perché esiste in `regina_articoli`: è la prima
       fotografia vera, o null se il pezzo non ne ha ancora una. */
    foto_url: (r.foto && r.foto[0]) || null,
    collezione: r.coll ?? null,
    cura: CURA[r.cura],
    consegna: CONSEGNA[r.consegna || (in_3d ? "banco" : "ordinazione")],
  };
};

export const ARTICOLI = [
  /* ── ANELLI · 5 pezzi, dal ripiano `anelli` ───────────────────────── */
  P({ fam: "anelli", k: 0, ean: "8054321000201",
      nome: "Anello Cabochon",
      desc: "Anello in acciaio dorato con cabochon turchese.",
      mat: "Acciaio dorato e cabochon turchese · misura 14",
      prezzo: 39.00,
      att: { misura: "14", pietra: "turchese", metallo: "acciaio dorato" },
      foto: ["pezzi/rg-fl-001.jpg"],
      coll: "filo", cura: "turchese" }),
  P({ fam: "anelli", k: 1, ean: "8054321000202",
      nome: "Anello Filo",
      desc: "Anello a filo continuo in argento 925.",
      mat: "Argento 925 · misura 12",
      prezzo: 29.00,
      att: { misura: "12", metallo: "argento 925" },
      coll: "turchese", cura: "argento" }),
  P({ fam: "anelli", k: 2, ean: "8054321000203",
      nome: "Anello Grande",
      desc: "Anello a fascia larga in acciaio dorato con cabochon.",
      mat: "Acciaio dorato e cabochon · misura 15",
      prezzo: 45.00,
      att: { misura: "15", pietra: "cabochon", metallo: "acciaio dorato" },
      cura: "turchese" }),
  P({ fam: "anelli", k: 3, ean: "8054321000204",
      nome: "Anello Fedina",
      desc: "Fedina sottile in argento 925, da portare in fila.",
      mat: "Argento 925 · misura 13",
      prezzo: 35.00,
      att: { misura: "13", metallo: "argento 925" },
      cura: "argento" }),
  P({ fam: "anelli", k: 4, ean: "8054321000205",
      nome: "Anello Piccolo",
      desc: "Anello minuto in acciaio dorato con cabochon.",
      mat: "Acciaio dorato e cabochon · misura 14",
      prezzo: 39.00,
      att: { misura: "14", pietra: "cabochon", metallo: "acciaio dorato" },
      cura: "turchese" }),

  /* ── COLLANE · 3 pezzi, dal ripiano `busto` ───────────────────────── */
  P({ fam: "busto", k: 0, ean: "8054321000123",
      nome: "Collana Maglia",
      desc: "Collana a maglia piatta in acciaio dorato.",
      mat: "Acciaio dorato · 45 cm",
      prezzo: 59.00,
      att: { lunghezza_cm: 45, metallo: "acciaio dorato" },
      foto: ["pezzi/8054321000123.jpg"],
      coll: "filo", cura: "dorato" }),
  P({ fam: "busto", k: 1, ean: "8054321000206",
      nome: "Collana Punto",
      desc: "Collana a catena fine in argento 925.",
      mat: "Argento 925 · 42 cm",
      prezzo: 69.00,
      att: { lunghezza_cm: 42, metallo: "argento 925" },
      cura: "argento" }),
  P({ fam: "busto", k: 2, ean: "8054321000207",
      nome: "Collana Onda",
      desc: "Collana a maglia ondulata in acciaio.",
      mat: "Acciaio · 40 cm",
      prezzo: 45.00,
      att: { lunghezza_cm: 40, metallo: "acciaio" },
      coll: "turchese", cura: "dorato" }),

  /* ── ORECCHINI · 9 pezzi, dal ripiano `orecchini` ─────────────────── */
  P({ fam: "orecchini", k: 0, ean: "8054321000456",
      nome: "Pendente Turchese",
      desc: "Orecchino pendente in acciaio dorato con cabochon turchese.",
      mat: "Acciaio dorato e cabochon",
      prezzo: 26.00,
      att: { pietra: "turchese", metallo: "acciaio dorato" },
      foto: ["pezzi/8054321000456.jpg", "pezzi/rg-fl-002.jpg"],
      coll: "turchese", cura: "turchese" }),
  P({ fam: "orecchini", k: 1, ean: "8054321000208",
      nome: "Creola Media",
      desc: "Creola a cerchio liscio in argento 925.",
      mat: "Argento 925 · 16 mm",
      prezzo: 28.00,
      att: { diametro_mm: 16, metallo: "argento 925" },
      foto: ["pezzi/rg-fl-004.jpg"],
      coll: "filo", cura: "argento" }),
  P({ fam: "orecchini", k: 2, ean: "8054321000209",
      nome: "Perno Turchese",
      desc: "Orecchino a perno in acciaio dorato con cabochon turchese.",
      mat: "Acciaio dorato e cabochon",
      prezzo: 22.00,
      att: { pietra: "turchese", metallo: "acciaio dorato" },
      coll: "turchese", cura: "turchese" }),
  P({ fam: "orecchini", k: 3, ean: "8054321000210",
      nome: "Pendente Perla",
      desc: "Orecchino pendente in argento 925 con perla.",
      mat: "Argento 925 e perla",
      prezzo: 29.00,
      att: { pietra: "perla", metallo: "argento 925" },
      coll: "perla", cura: "perla" }),
  P({ fam: "orecchini", k: 4, ean: "8054321000211",
      nome: "Creola Grande",
      desc: "Creola a cerchio largo in acciaio dorato.",
      mat: "Acciaio dorato · 18 mm",
      prezzo: 32.00,
      att: { diametro_mm: 18, metallo: "acciaio dorato" },
      cura: "dorato" }),
  P({ fam: "orecchini", k: 5, ean: "8054321000212",
      nome: "Perno Perla",
      desc: "Orecchino a perno in argento 925 con perla.",
      mat: "Argento 925 e perla",
      prezzo: 24.00,
      att: { pietra: "perla", metallo: "argento 925" },
      coll: "perla", cura: "perla" }),
  P({ fam: "orecchini", k: 6, ean: "8054321000213",
      nome: "Pendente Cabochon",
      desc: "Orecchino pendente in acciaio dorato con cabochon.",
      mat: "Acciaio dorato e cabochon",
      prezzo: 26.00,
      att: { pietra: "cabochon", metallo: "acciaio dorato" },
      cura: "turchese" }),
  P({ fam: "orecchini", k: 7, ean: "8054321000214",
      nome: "Creola Piccola",
      desc: "Creola a cerchio stretto in argento 925.",
      mat: "Argento 925 · 14 mm",
      prezzo: 27.00,
      att: { diametro_mm: 14, metallo: "argento 925" },
      cura: "argento" }),
  P({ fam: "orecchini", k: 8, ean: "8054321000215",
      nome: "Perno Cabochon",
      desc: "Orecchino a perno in acciaio dorato con cabochon.",
      mat: "Acciaio dorato e cabochon",
      prezzo: 22.00,
      att: { pietra: "cabochon", metallo: "acciaio dorato" },
      cura: "turchese" }),

  /* ── BRACCIALI · 2 pezzi, dal ripiano `rampa` ─────────────────────── */
  /* il nome dice quello che si vede: è una MAGLIA, non un tennis. La
     lezione sta scritta per esteso nel commento di `RIPIANI` in spazio.html
     e vale anche qui: su una pagina pubblica un nome sbagliato non è una
     sbavatura di resa, è una dichiarazione falsa di prodotto. */
  P({ fam: "rampa", k: 0, ean: "8054321000216",
      nome: "Bracciale Maglia Larga",
      desc: "Bracciale a maglia rolo larga in argento 925.",
      mat: "Argento 925 · 19 cm",
      prezzo: 89.00,
      att: { lunghezza_cm: 19, metallo: "argento 925" },
      cura: "argento" }),
  P({ fam: "rampa", k: 1, ean: "8054321000217",
      nome: "Bracciale Maglia",
      desc: "Bracciale a maglia rolo in acciaio dorato.",
      mat: "Acciaio dorato · 19 cm",
      prezzo: 54.00,
      att: { lunghezza_cm: 19, metallo: "acciaio dorato" },
      foto: ["pezzi/rg-fl-003.jpg"],
      coll: "filo", cura: "dorato" }),

  /* ── OROLOGI · 3 pezzi, il REGINA SWATCH, dal ripiano `orologi` ───── */
  P({ fam: "orologi", k: 0, ean: "8054321000218",
      nome: "Costa Smeralda",
      desc: "Orologio con quadrante verde salvia e cassa da 40 mm.",
      mat: "Verde salvia · 40 mm · 5 ATM",
      prezzo: 89.00,
      att: { diametro_mm: 40, quadrante: "verde salvia", impermeabilita: "5 ATM" },
      cura: "orologio", consegna: "orologio" }),
  P({ fam: "orologi", k: 1, ean: "8054321000219",
      nome: "Tulum",
      desc: "Orologio con quadrante verde menta e cassa da 40 mm.",
      mat: "Verde menta · 40 mm · 5 ATM",
      prezzo: 89.00,
      att: { diametro_mm: 40, quadrante: "verde menta", impermeabilita: "5 ATM" },
      cura: "orologio", consegna: "orologio" }),
  P({ fam: "orologi", k: 2, ean: "8054321000220",
      nome: "Bora Bora",
      desc: "Orologio con quadrante turchese e cassa da 40 mm.",
      mat: "Turchese · 40 mm · 5 ATM",
      prezzo: 89.00,
      att: { diametro_mm: 40, quadrante: "turchese", impermeabilita: "5 ATM" },
      cura: "orologio", consegna: "orologio" }),

  /* ═══════════════════════════════════════════════════════════════════
     DA QUI IN GIU': PEZZI CHE NON STANNO NELLA STANZA.

     Non hanno `k`, quindi il 3D non li conosce. Esistono in VETRINA — si
     vedono in elenco, si mettono in lista, si comprano — ma non hanno un
     alloggio nel cofanetto finché non li si possiede davvero. È la
     stessa distinzione che fa già `COLLEZIONI` in spazio.html fra un
     pezzo con `fam`/`k` (che si HA) e uno col solo prezzo (che MANCA).

     Sono INVENTATI. Nessuno di questi è in negozio da Stefano oggi.
     Servono a togliere l'effetto-demo da ventidue referenze in croce.
     ═══════════════════════════════════════════════════════════════════ */

  P({ fam: "busto", ean: "8054321000221",
      nome: "Collana Perla",
      desc: "Collana in argento 925 con perle d'acqua dolce.",
      mat: "Argento 925 e perle d'acqua dolce · 44 cm",
      prezzo: 62.00,
      att: { lunghezza_cm: 44, pietra: "perla d'acqua dolce", metallo: "argento 925" },
      coll: "perla", cura: "perla" }),
  P({ fam: "busto", ean: "8054321000222",
      nome: "Girocollo Turchese",
      desc: "Girocollo corto in acciaio dorato con cabochon turchese.",
      mat: "Acciaio dorato e cabochon turchese · 38 cm",
      prezzo: 49.00,
      att: { lunghezza_cm: 38, pietra: "turchese", metallo: "acciaio dorato" },
      coll: "turchese", cura: "turchese" }),
  P({ fam: "busto", ean: "8054321000223",
      nome: "Collana Smalto",
      desc: "Collana in acciaio dorato con smalto bianco.",
      mat: "Acciaio dorato e smalto bianco · 42 cm",
      prezzo: 44.00,
      att: { lunghezza_cm: 42, metallo: "acciaio dorato" },
      coll: "onda", cura: "smalto" }),
  P({ fam: "orecchini", ean: "8054321000224",
      nome: "Creola Perla",
      desc: "Creola in argento 925 con perla sospesa.",
      mat: "Argento 925 e perla · 15 mm",
      prezzo: 34.00,
      att: { diametro_mm: 15, pietra: "perla", metallo: "argento 925" },
      coll: "perla", cura: "perla" }),
  P({ fam: "orecchini", ean: "8054321000225",
      nome: "Creola Smalto",
      desc: "Creola in acciaio dorato con smalto turchese.",
      mat: "Acciaio dorato e smalto turchese · 16 mm",
      prezzo: 29.00,
      att: { diametro_mm: 16, metallo: "acciaio dorato" },
      coll: "onda", cura: "smalto" }),
  P({ fam: "orecchini", ean: "8054321000226",
      nome: "Perno Smalto",
      desc: "Orecchino a perno in acciaio dorato con smalto bianco.",
      mat: "Acciaio dorato e smalto bianco · 8 mm",
      prezzo: 23.00,
      att: { diametro_mm: 8, metallo: "acciaio dorato" },
      cura: "smalto" }),
  P({ fam: "orecchini", ean: "8054321000227",
      nome: "Pendente Filo",
      desc: "Pendente a filo continuo in argento 925, sulla sua catena.",
      mat: "Argento 925 · 40 cm",
      prezzo: 31.00,
      att: { lunghezza_cm: 40, metallo: "argento 925" },
      coll: "filo", cura: "argento" }),
  P({ fam: "anelli", ean: "8054321000228",
      nome: "Anello Perla",
      desc: "Anello in argento 925 con perla incassata.",
      mat: "Argento 925 e perla · misura 13",
      prezzo: 36.00,
      att: { misura: "13", pietra: "perla", metallo: "argento 925" },
      coll: "perla", cura: "perla" }),
  P({ fam: "anelli", ean: "8054321000229",
      nome: "Anello Onda",
      desc: "Anello a fascia ondulata in acciaio dorato.",
      mat: "Acciaio dorato · misura 14",
      prezzo: 33.00,
      att: { misura: "14", metallo: "acciaio dorato" },
      coll: "onda", cura: "dorato" }),
  P({ fam: "rampa", ean: "8054321000230",
      nome: "Bracciale Perla",
      desc: "Bracciale in argento 925 con perle in fila.",
      mat: "Argento 925 e perle · 18 cm",
      prezzo: 48.00,
      att: { lunghezza_cm: 18, pietra: "perla", metallo: "argento 925" },
      coll: "perla", cura: "perla" }),
  P({ fam: "rampa", ean: "8054321000231",
      nome: "Bracciale Onda",
      desc: "Bracciale a maglia ondulata in acciaio dorato.",
      mat: "Acciaio dorato · 18 cm",
      prezzo: 42.00,
      att: { lunghezza_cm: 18, metallo: "acciaio dorato" },
      coll: "onda", cura: "dorato" }),
  P({ fam: "rampa", ean: "8054321000232",
      nome: "Cavigliera Onda",
      desc: "Cavigliera a maglia ondulata in acciaio dorato.",
      mat: "Acciaio dorato · 24 cm",
      prezzo: 26.00,
      att: { lunghezza_cm: 24, metallo: "acciaio dorato" },
      coll: "onda", cura: "dorato" }),
];

/* ── gli indici, costruiti una volta ──────────────────────────────────
   Una `find` dentro un ciclo di rendering è il modo più silenzioso di
   rendere lento un elenco. Qui le mappe si costruiscono al caricamento del
   modulo e non si toccano più. */

export const PER_ID = new Map(ARTICOLI.map((a) => [a.id, a]));
export const PER_EAN = new Map(ARTICOLI.map((a) => [a.codice_fornitore, a]));
export const PER_SCENA = new Map(
  ARTICOLI.filter((a) => a.in_3d).map((a) => [a.famiglia + ":" + a.k, a])
);

export const articolo = (id) => PER_ID.get(id) || null;
export const articoloPerEan = (ean) => PER_EAN.get(ean) || null;

/* il prezzo scritto come lo scrive un italiano. Stessa scelta di
   `euro()` nel gestionale: `useGrouping: "always"`, perché altrimenti
   «2900,00 €» e «12.900,00 €» sono due grafie della stessa cosa. */
const EURO = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
  useGrouping: "always",
});
export const euro = (v) => EURO.format(v ?? 0);

export default ARTICOLI;
