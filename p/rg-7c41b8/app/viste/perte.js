/* app/viste/perte.js — PER TE.
   SCHELETRO ONESTO: barra di navigazione col titolo grande, gli arrivi
   letti dallo store, le date che si avvicinano, e lo stato vuoto. Le
   proposte vere (cosa chiude una collezione, cosa sta per scadere,
   cosa e' stato guardato) sono F5. */
import { e } from "app/ui/dom.js";
import { cella, lista } from "app/ui/cella.js";
import { vuoto } from "app/ui/vuoto.js";
import { tasto } from "app/ui/tasto.js";
import { schermo } from "app/ui/barra-nav.js";
import { spingi } from "app/rotta.js";
import { conTransizione } from "app/moto.js";

const MESI = ["gen","feb","mar","apr","mag","giu","lug","ago","set","ott","nov","dic"];
const quando = (d) => d.giorno + " " + (MESI[(d.mese|0) - 1] || "") +
                      (d.nota ? " · " + d.nota : "");

export function monta(el, store){
  const {leggi, iscrivi, soldi} = store;

  function disegna(){
    const s = leggi();
    const arrivi = s.arrivi || [];
    const date = s.ricorrenze || [];
    const pagina = schermo(el, {titolo:"Per te", occhiello:"Proposte"});

    if(!arrivi.length && !date.length){
      pagina.append(vuoto({
        segno:"stella",
        titolo:"Ancora niente da proporti",
        testo:"Le proposte nascono da cosa hai nel cofanetto e da quando cadono le tue date.",
        azione:"Guarda la vetrina",
        suAzione:() => { location.hash = "#/vetrina"; }
      }));
      return;
    }

    if(arrivi.length) pagina.append(lista("Arrivati in negozio", arrivi.map(p => cella({
      id:p.id, foto:p.foto, titolo:p.nome, sotto:p.materia, coda:soldi(p.prezzo),
      etichetta:p.nome + ", " + soldi(p.prezzo),
      suClick:() => spingi("pezzo/" + p.id)
    }))));

    if(date.length) pagina.append(lista("Le tue date", date.map(d => cella({
      titolo:d.titolo, sotto:quando(d)
    }))));

    /* la promozione vera — cosa ci prendi col credito raddoppiato — e'
       una schermata sua, ed e' F5. Qui si dichiara. */
    const promo = (s.promozioni || [])[0];
    if(promo) pagina.append(e("section", {class:"riquadro"}, [
      e("h2", {class:"t-2", testo:promo.nome || promo.titolo || "Il mese del tuo compleanno"}),
      e("p", {class:"t-body tenue riquadro-testo",
        testo:promo.testo || promo.descrizione || ""}),
      tasto("Vedi cosa ci prendi", {tipo:"primario", largo:true, inArrivo:"F5",
        etichetta:"Vedi cosa ci prendi con il credito"})
    ]));

    const nuove = (s.notifiche || []).filter(n => !n.letta);
    if(nuove.length) pagina.append(lista("Da leggere", nuove.map(n => cella({
      id:n.id, titolo:n.titolo, sotto:n.testo,
      suClick:() => store.invia("notifica/letta", {id:n.id})
    }))));
  }

  disegna();
  iscrivi((s, ev, prima) => {
    if(!prima || s.notifiche !== prima.notifiche || s.arrivi !== prima.arrivi)
      conTransizione(disegna);
  });
}
