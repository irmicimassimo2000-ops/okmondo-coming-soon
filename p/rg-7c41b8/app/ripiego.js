/* ═══════════════════════════════════════════════════════════════════
   app/ripiego.js — IL SEME DI RIPIEGO, e nient'altro.
   I dati veri stanno in `app/dati/` e li scrive un altro esecutore.
   Finche' quella cartella non c'e', l'app deve comunque ACCENDERSI —
   un telaio che non parte perche' manca il catalogo non si puo'
   collaudare, e un collaudo rimandato e' un collaudo che non si fa.
   Questo seme NON inventa merce: ricopia esattamente cio' che oggi sta
   scritto nelle tre pagine statiche (vetrina.html, perte.html,
   profilo.html), che sono materiale gia' approvato. Il campo `semeId`
   dice «ripiego» proprio perche' si veda a occhio quando l'app sta
   girando senza i dati veri.
   ═══════════════════════════════════════════════════════════════════ */

export const semeRipiego = {
  versione_schema: 1,
  id: "ripiego",
  cliente: {
    id: "RJ00042", nome: "Lucia", cognome: "Sabatini",
    tessera: "RJ 00042", dal: "2025", livello: "secondo",
    credito: 2500                      /* in centesimi: mai un float sui soldi */
  },
  livelli: [
    {id:"primo",  nome:"Primo",  sconto:3, soglia:0},
    {id:"secondo",nome:"Secondo",sconto:5, soglia:26000},
    {id:"terzo",  nome:"Terzo",  sconto:8, soglia:80000}
  ],
  /* gli esemplari sono i pezzi POSSEDUTI: il cofanetto. Il seme di
     ripiego non ne conosce nessuno con certezza — le tre pagine
     statiche non lo dicono — e un elenco inventato sarebbe peggio di un
     elenco vuoto: manderebbe in produzione uno stato vuoto mai visto. */
  esemplari: [],
  movimenti_credito: [
    {id:"mc-1", data:"2026-06-11", segno:+1, importo:1500, causale:"Acquisto in negozio"},
    {id:"mc-2", data:"2026-08-02", segno:+1, importo:1000, causale:"Acquisto in negozio"}
  ],
  ricorrenze: [
    {id:"ric-1", giorno:16, mese:9, titolo:"Anniversario di matrimonio",
     nota:"con Antonio", avviso:9},
    {id:"ric-2", giorno:24, mese:9, titolo:"Il tuo compleanno",
     nota:"", avviso:17}
  ],
  wishlist: [],
  preferenze: {fodera:"velluto", ambiente:"boutique", insieme:true},
  notifiche: [
    {id:"nt-1", data:"2026-09-09", titolo:"Il mese del tuo compleanno",
     testo:"Dal 24 settembre il credito che hai vale il doppio, per una settimana.",
     letta:false}
  ],
  arrivi: [
    {id:"rg-fl-001", nome:"Anello Cabochon",  materia:"Argento 925 e cabochon",
     prezzo:3900, foto:"pezzi/rg-fl-001.jpg", collezione:"filo-di-luce"},
    {id:"rg-fl-003", nome:"Bracciale Maglia", materia:"Argento 925",
     prezzo:5400, foto:"pezzi/rg-fl-003.jpg", collezione:"filo-di-luce"}
  ]
};

/* il catalogo di ripiego: i due pezzi che la vetrina statica mostra
   davvero, piu' i due arrivi. Stessi id, stesse fotografie, stessi
   prezzi — nulla di inventato. */
export const catalogoRipiego = [
  {id:"rg-fl-004", nome:"Creola Media", materia:"Argento 925 · 16 mm",
   prezzo:2800, foto:"pezzi/rg-fl-004.jpg", collezione:"filo-di-luce",
   tipo:"orecchini", chiude:"filo-di-luce"},
  {id:"8054321000456", nome:"Pendente Turchese", materia:"Acciaio dorato e cabochon",
   prezzo:2600, foto:"pezzi/8054321000456.jpg", collezione:"filo-di-luce",
   tipo:"collane", chiude:"filo-di-luce"},
  {id:"rg-fl-001", nome:"Anello Cabochon", materia:"Argento 925 e cabochon",
   prezzo:3900, foto:"pezzi/rg-fl-001.jpg", collezione:"filo-di-luce", tipo:"anelli"},
  {id:"rg-fl-003", nome:"Bracciale Maglia", materia:"Argento 925",
   prezzo:5400, foto:"pezzi/rg-fl-003.jpg", collezione:"filo-di-luce", tipo:"bracciali"}
];

export const collezioniRipiego = {
  "filo-di-luce": {id:"filo-di-luce", nome:"Filo di Luce",
    frase:"Un filo che passa da un pezzo all'altro."}
};
