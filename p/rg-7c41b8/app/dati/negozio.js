/* ═══════════════════════════════════════════════════════════════════
   app/dati/negozio.js — IL NEGOZIO, in un posto solo.

   Fino alla fusione di F3 questi fatti vivevano dentro `viste/vetrina.js`,
   e andava bene finché li leggeva una schermata sola. Adesso li leggono
   in tre: la Vetrina (scheda del negozio, «Passo a vederlo», Mappe),
   l'Ingresso (il ramo umano del quinto tentativo: «Chiedilo in negozio ·
   WhatsApp») e le Azioni della carta (assistenza e condividi, che aprono
   la stessa conversazione). Tre copie dello stesso numero di telefono
   sono tre numeri che un giorno saranno diversi.

   ── VERO E INVENTATO, SEPARATI ────────────────────────────────────
   VERI, dal profilo pubblico letto il 06/09/2026:
     telefono 0882 303150 · WhatsApp +39 320 285 5477
   INVENTATI, plausibili e DA CONFERMARE con Stefano:
     la via, il numero civico, gli orari.
   La distinzione non è una nota di cortesia: è la differenza fra una
   persona che trova il negozio aperto e una che trova la saracinesca.
   Finché il gestionale non manda `seme.negozio`, questa è la fonte; il
   giorno che lo manda, `daSeme()` vince e questo file resta il ripiego.

   ── IL NOME ───────────────────────────────────────────────────────
   Il nome pubblico reale è «Regina 1990». L'app si chiama «Regina
   Jewels» finché Massimo non decide, ed è scritto qui perché il
   giorno della decisione si cambi UNA riga.
   ═══════════════════════════════════════════════════════════════════ */

export const NEGOZIO = {
  nome: "Regina Jewels",
  via: "Corso Garibaldi 112",
  citta: "San Severo (FG)",
  telefono: "+390882303150",
  telefono_detto: "0882 303150",
  whatsapp: "393202855477",
  /* indicizzati come `Date.getDay()`: 0 è domenica */
  orari: [
    {g:"Domenica",  f:[]},
    {g:"Lunedì",   f:[["16:30","20:00"]]},
    {g:"Martedì",  f:[["9:30","13:00"], ["16:30","20:00"]]},
    {g:"Mercoledì",f:[["9:30","13:00"], ["16:30","20:00"]]},
    {g:"Giovedì",  f:[["9:30","13:00"], ["16:30","20:00"]]},
    {g:"Venerdì",  f:[["9:30","13:00"], ["16:30","20:00"]]},
    {g:"Sabato",    f:[["9:30","13:00"], ["16:30","20:00"]]}
  ]
};

/* ── LE DUE PORTE VERSO FUORI ──────────────────────────────────────
   Si scrivono qui perché `encodeURIComponent` dimenticato una volta
   sola produce un messaggio troncato al primo «&», e quel difetto si
   scopre dal cliente, non in collaudo. */
export const waNegozio = (testo) =>
  "https://wa.me/" + NEGOZIO.whatsapp +
  (testo ? "?text=" + encodeURIComponent(testo) : "");

export const mappeNegozio = () =>
  "https://maps.apple.com/?daddr=" +
  encodeURIComponent(NEGOZIO.via + ", " + NEGOZIO.citta) + "&dirflg=d";

export default NEGOZIO;
