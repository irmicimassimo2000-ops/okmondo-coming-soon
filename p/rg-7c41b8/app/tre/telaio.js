/* ═══════════════════════════════════════════════════════════════════
   app/tre/telaio.js — LA MANIGLIA DELL'ASTUCCIO, DALLA PARTE DELLA
   SCOCCA.

   La scena in tre dimensioni vive in `astuccio.html`, che è un
   documento suo. Questo file è l'unico posto della scocca che sa come
   si apre quel telaio, come gli si parla e come lo si chiude — così i
   due posti che lo usano (la consegna in `viste/ingresso.js` e la
   pagina del regalo in `viste/azioni.js`) non ne tengono due copie che
   poi divergono.

   PERCHÉ LA SCOCCA NON IMPORTA THREE. La mappa d'importazione di
   `index.html` non porta `three`, e non deve: due mega e nove di
   libreria nel documento che porta la barra di navigazione si
   pagherebbero per aprire una lista. Nel telaio si pagano una volta,
   quando serve una scatola — e dalla stessa cache del banco.
   MISURATO (17/09, `_C5_via`, profilo mobile): dal montaggio al primo
   fotogramma 276 ms col telaio leggero, 97 ms mettendo la scena dentro
   il banco; ma il banco alla consegna non c'è, e averlo costa 1.121 ms
   e 2,6 MB in più. Dentro il banco (C2) la scena si monta in casa, con
   lo stesso modulo: là il motore c'è già.
   ═══════════════════════════════════════════════════════════════════ */

import { e } from "app/ui/dom.js";

/* IL PROFILO NON È LA LARGHEZZA DELLA FINESTRA E BASTA. Un portatile
   stretto ha una scheda grafica vera; un telefono largo no. Si guarda
   se il dito c'è: `maxTouchPoints` è la domanda giusta, la larghezza è
   la rete di sicurezza. */
export const PROFILO = (innerWidth < 900 || (navigator.maxTouchPoints || 0) > 0)
  ? "mobile" : "banco";

export function indirizzoAstuccio(p){
  const q = new URLSearchParams();
  q.set("fam", p.fam || "anelli");
  if(p.k !== null && p.k !== undefined) q.set("k", String(p.k));
  q.set("fodera", p.fodera || "avorio");
  q.set("profilo", p.profilo || PROFILO);
  if(p.provino) q.set("provino", p.provino);
  if(p.aria) q.set("aria", String(p.aria));
  if(p.fuga !== undefined) q.set("fuga", String(p.fuga));
  /* dentro una pagina il piano si toglie: il fondo lo fa lei (vedi
     `app/tre/astuccio.js`, «LA CARTA DELLA SCENA, O IL FONDO DELLA
     PAGINA»). Chi vuole lo studio lo chiede. */
  if(p.piano === undefined || p.piano === false) q.set("piano", "0");
  if(p.scorre) q.set("scorre", "1");
  if(p.codice) q.set("codice", p.codice);
  /* IL TIMBRO. La scocca e la scena hanno due cache: senza versione, una
     scocca aggiornata può servire un astuccio vecchio, ed è il difetto
     che si vede solo DOPO un aggiornamento — il peggiore da rincorrere. */
  if(window.VERSIONE) q.set("v", window.VERSIONE);
  return "astuccio.html?" + q.toString();
}

/* IL TELAIO SI MONTA MENTRE LA PERSONA LEGGE, non al tocco. Il primo
   fotogramma costa 276 ms: pagati durante la lettura sono zero, pagati
   al tocco sono un quarto di secondo di niente fra il dito e la
   scatola. `pronto` è la promessa che il pezzo è in scena. */
export function telaioAstuccio(p){
  const nodo = e("iframe", {
    class: p.classe || "f1-astuccio", src: indirizzoAstuccio(p),
    title: p.titolo || "Il tuo astuccio", tabindex: "-1", "aria-hidden": "true",
    scrolling: "no"
  });
  const ascolta = {fine: null, tocco: null, pronto: null};
  let gia = false, dirlo = null;
  const pronto = new Promise((ok) => { dirlo = ok; });
  /* TETTO A 4 SECONDI, e non è pessimismo: una scheda grafica che non dà
     il contesto non lo dice con un errore, lo dice col silenzio.
     Scaduto il tetto si va avanti lo stesso col ripiego, che è sempre
     meglio di un tasto che non risponde. */
  const scade = setTimeout(() => { if(!gia){ gia = true; dirlo(false); } }, 4000);
  function daLui(ev){
    if(!nodo.contentWindow || ev.source !== nodo.contentWindow) return;
    const m = ev.data;
    if(!m || m.da !== "astuccio") return;
    if(m.t === "pronto" && !gia){ gia = true; clearTimeout(scade); dirlo(true); }
    const fn = ascolta[m.t];
    if(fn) fn(m.d || {});
  }
  addEventListener("message", daLui);
  const di = (t) => {
    try{ nodo.contentWindow.postMessage({t}, "*"); }catch(_){ /* niente */ }
  };
  return {
    nodo, pronto, ascolta,
    suona: () => di("suona"), salta: () => di("salta"), chiudi: () => di("chiudi"),
    /* la scena è sulla stessa origine: una sonda ci arriva dritta, senza
       passare per i messaggi e senza aspettare un giro */
    dentro: () => { try{ return nodo.contentWindow.__astuccio; }catch(_){ return null; } },
    via: () => {
      removeEventListener("message", daLui);
      clearTimeout(scade);
      di("smonta");
      if(nodo.parentNode) nodo.parentNode.removeChild(nodo);
    }
  };
}

export default {telaioAstuccio, indirizzoAstuccio, PROFILO};
