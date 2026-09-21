/* ═══════════════════════════════════════════════════════════════════
   app/viste/vetrina.js — LA VETRINA, LA SOGLIA.

   Dal 21/09/2026 la vetrina è un NEGOZIO (direzione A «Boutique», scelta
   da Massimo: elenco, scheda, borsa, pagamento, conferma, ordini). Il
   negozio pesa, e chi apre l'app sul cofanetto non deve pagarlo: questo
   file è la soglia — poche righe caricate con l'app — e il corpo
   (`vetrina-corpo.js`, col suo foglio di stile e l'adattatore del
   pagamento) arriva A RICHIESTA, come `perte.js` fa col motore delle
   proposte. Il tetto di 600 KB di JS all'avvio lo misura il collaudo.

   Tre cose si fanno SUBITO, perché non possono aspettare:
   · IL TEMA. La vetrina è di CARTA (tavole di A, canone del 21/09): la
     sezione porta `data-tema="chiaro"`, e il telaio ci legge il fondo
     del documento e la tinta della barra di vetro.
   · GLI SCHERMI. `app/rotta.js` cerca i tipi registrati già quando legge
     l'indirizzo di partenza: si registrano qui, e ognuno aspetta il
     corpo prima di disegnarsi. Tutte le rotte sono COPPIE `tipo/id`
     (rotta.js legge a coppie e non si tocca):
       #/vetrina                    l'elenco
       #/vetrina/pezzo/<id>         la scheda
       #/vetrina/borsa/aperta       la borsa (foglio)
       #/vetrina/pagamento/ora      il pagamento
       #/vetrina/ordine/<codice>    la conferma / lo stato dell'ordine
       #/vetrina/ordini/tutti       i tuoi ordini
       #/vetrina/preferiti/tutti    i preferiti
       #/vetrina/legale/testi       termini, recesso e privacy
     più le due a segmento solo che esistevano già e restano
     (`lista`, `negozio`) e la pagina pubblica `#/l/<token>`.
   · L'INDIRIZZO DI PARTENZA, letto all'importazione: `avviaRotta()` lo
     riscrive di lì a poco, e il corpo arriva dopo.
   ═══════════════════════════════════════════════════════════════════ */
import { e } from "app/ui/dom.js";
import { registraSchermo } from "app/rotta.js";

export const TENUTA_GIORNI = 7;
const INDIRIZZO_0 = location.hash;

const TIPI = ["pezzo", "borsa", "pagamento", "ordine", "ordini",
              "preferiti", "legale", "lista", "negozio"];
/* gli schermi che sono FOGLI o modali a tutto schermo: devono saperlo
   prima che il corpo arrivi, perché la classe decide come entrano */
const FOGLI = new Set(["borsa"]);
const COPRONO = new Set(["borsa", "pagamento"]);

export function monta(el, store){
  const sezione = el.closest(".vista");
  if(sezione) sezione.dataset.tema = "chiaro";

  let promessa = null;
  function carica(){
    if(!promessa){
      const u = new URL(import.meta.url);
      promessa = import("app/viste/vetrina-corpo.js")
        .then(m => m.monta(el, store, {indirizzo: INDIRIZZO_0, versione: u.search}))
        .catch(err => { promessa = null; console.error(err); fallita(el, carica); throw err; });
    }
    return promessa;
  }

  for(const tipo of TIPI){
    registraSchermo(tipo, (id, dove) => {
      /* uno schermo della vetrina è di carta OVUNQUE lo si apra: «Per
         te» e il cofanetto spingono `pezzo/<id>` dentro la LORO sezione,
         che è di velluto. */
      dove.dataset.tema = "chiaro";
      if(FOGLI.has(tipo)) dove.classList.add("va-foglio-strato");
      if(COPRONO.has(tipo)){
        dove.classList.add("va-copre");
        const fascia = document.getElementById("fascia");
        dove.style.setProperty("--va-sotto", (fascia ? fascia.offsetHeight : 0) + "px");
      }
      carica().then(c => c.schermi[tipo](id, dove)).catch(() => fallita(dove, carica));
    });
  }

  /* LO SCHELETRO DELL'ELENCO: la forma vera (titolo, due righe di
     strumenti, quattro quadri), monocroma e ferma. */
  el.append(e("div", {class:"va-ossa", "aria-hidden":"true"}, [
    e("div", {class:"redatto va-osso-titolo"}),
    e("div", {class:"redatto va-osso-riga"}),
    e("div", {class:"va-ossa-griglia"}, [0, 1, 2, 3].map(() =>
      e("div", {class:"redatto va-osso-quadro"})))
  ]));

  store.iscrivi((_s, ev) => {
    if(ev.tipo === "nav/tab" && ev.dato && ev.dato.tab === "vetrina") carica().catch(() => {});
  });
  if(/^#\/?(vetrina|l\/)/.test(INDIRIZZO_0)) carica().catch(() => {});
}

/* il corpo non è arrivato (rete caduta a metà): si dice, e si riprova */
function fallita(dove, riprova){
  dove.textContent = "";
  const t = e("button", {type:"button", class:"tasto secondario",
    suClick: () => { riprova().then(() => location.reload()).catch(() => {}); }},
    [e("span", {testo:"Riprova a caricare"})]);
  dove.append(e("div", {class:"vuoto"}, [
    e("b", {testo:"La vetrina non si è caricata"}),
    e("p", {testo:"Controlla la connessione: i tuoi pezzi e la borsa sono al sicuro."}),
    t]));
}
