/* app/viste/profilo.js — IL PROFILO.
   SCHELETRO ONESTO: chi sei, quanto credito hai, le tue date, e la
   FODERA del cofanetto — l'unica cosa di questa vista che, oggi,
   attraversa davvero il ponte e arriva al banco in tre dimensioni. E'
   li' apposta: serve un comando vero che parta dalla scocca e cambi
   qualcosa dentro l'iframe, altrimenti il ponte resta una promessa.
   La tessera e' l'unico oggetto che si guarda invece di leggersi, e per
   questo ha una classe sua nel sistema (`.tessera`) con la sua coppia
   di colori gia' misurata: non e' una superficie del tema, e' materia
   di marca. */
import { e } from "app/ui/dom.js";
import { cella, lista } from "app/ui/cella.js";
import { tasto } from "app/ui/tasto.js";
import { toast } from "app/ui/toast.js";
import { apriFoglio, chiudiFoglio } from "app/ui/foglio.js";
import { schermo } from "app/ui/barra-nav.js";
import { conTransizione } from "app/moto.js";

const MESI = ["gen","feb","mar","apr","mag","giu","lug","ago","set","ott","nov","dic"];
/* le quattro fodere sono MATERIA del cofanetto, non ruoli del tema:
   stanno in :root come token e qui si chiamano per nome. */
const FODERE = [
  {id:"velluto",  nome:"Velluto",  tinta:"var(--vassoio)"},
  {id:"bianco",   nome:"Bianco",   tinta:"var(--fodera-bianco)"},
  {id:"avorio",   nome:"Avorio",   tinta:"var(--fodera-avorio)"},
  {id:"turchese", nome:"Turchese", tinta:"var(--firma)"}
];

export function monta(el, store){
  const {leggi, invia, iscrivi, soldi} = store;

  function disegna(){
    const s = leggi();
    const c = s.cliente || {};
    const liv = (s.livelli || []).find(l => l.id === c.livello);
    const pagina = schermo(el, {titolo:"Profilo", occhiello:c.tessera || ""});

    pagina.append(e("div", {class:"tessera"}, [
      e("span", {class:"occhiello", testo:"Il tuo credito"}),
      e("span", {class:"somma", testo:soldi(c.credito || 0)}),
      e("span", {class:"occhiello",
        testo:[c.nome, c.cognome].filter(Boolean).join(" ") +
              (liv ? "  ·  " + liv.nome : "")})
    ]));
    pagina.append(e("p", {class:"t-foot tenue nota-tessera",
      testo:"Si scala in negozio sul prossimo acquisto. Non scade, e cresce ogni volta che compri." +
            (liv ? "  Al livello " + liv.nome + " sale al " + liv.sconto + "%." : "")}));

    pagina.append(lista("Le tue date", (s.ricorrenze || []).length
      ? s.ricorrenze.map(d => cella({
          titolo:d.titolo,
          sotto:d.giorno + " " + (MESI[(d.mese|0)-1] || "") + (d.nota ? " · " + d.nota : ""),
          coda:d.avviso ? "avviso il " + d.avviso : null}))
      : [cella({titolo:"Nessuna data", sotto:"Le aggiunge il negozio."})]));

    const f = FODERE.find(x => x.id === (s.preferenze || {}).fodera) || FODERE[0];
    pagina.append(lista("Il cofanetto", [
      cella({titolo:"La fodera", sotto:f.nome,
        etichetta:"La fodera del cofanetto, adesso " + f.nome + ". Cambia",
        suClick:apriFodere}),
      cella({titolo:"I tuoi pezzi", sotto:(s.esemplari || []).length + " nel Libretto",
        inArrivo:"F6", etichetta:"Il Libretto dei tuoi pezzi"})
    ]));

    pagina.append(lista("Il tuo conto", [
      cella({titolo:"I movimenti del credito",
        sotto:(s.movimenti_credito || []).length + " righe",
        inArrivo:"F6", etichetta:"I movimenti del credito"}),
      cella({titolo:"Le tue misure",
        sotto:[c.misura_anello && "anello " + c.misura_anello,
               c.misura_bracciale, c.misura_collana].filter(Boolean).join(" · "),
        inArrivo:"F6", etichetta:"Le tue misure"})
    ]));

    pagina.append(e("div", {class:"colonna-tasti"}, [
      tasto("Azzera la demo", {tipo:"secondario", largo:true, suClick:() => {
        invia("demo/reset", {seme:store.seme});
        toast("Demo riportata al punto di partenza.");
      }})
    ]));
    pagina.append(e("p", {class:"occhiello firma-seme",
      testo:"Seme «" + (store.seme.id || "?") + "»"}));
  }

  function apriFodere(){
    const dentro = e("div", {});
    dentro.append(lista(null, FODERE.map(f => {
      const in_uso = f.id === (leggi().preferenze || {}).fodera;
      const c = cella({titolo:f.nome, sotto:in_uso ? "in uso" : "",
        pastiglia:"background:" + f.tinta,
        suClick:() => {
          invia("preferenze/fodera", {fodera:f.id});
          chiudiFoglio();
          toast("Fodera " + f.nome.toLowerCase() + ".");
        }});
      if(in_uso) c.setAttribute("aria-current", "true");
      return c;
    })));
    apriFoglio({titolo:"La fodera del cofanetto", contenuto:dentro});
  }

  disegna();
  iscrivi((s, ev, prima) => {
    if(!prima || s.preferenze !== prima.preferenze || s.cliente !== prima.cliente ||
       ev.tipo === "demo/reset") conTransizione(disegna);
  });
}
