/* app/ui/cella.js — LA LISTA RAGGRUPPATA.
   Il modo in cui iOS elenca le cose da vent'anni, detto coi ruoli del
   sistema: un gruppo `--piano` con raggio 10, rientrato di --margine,
   celle da 44 (52 con due righe, 60 con la foto), e un separatore
   hairline che parte DOPO il testo — un separatore che tocca il bordo
   divide il gruppo invece di dividere le righe.
   Una cella che si tocca è un <button>: così la tastiera la trova, il
   lettore di schermo la annuncia, e il bersaglio è quello vero.
   Nessuna misura e nessun colore vivono qui: stanno in sistema.css. */
import { e, dichiaraInArrivo } from "app/ui/dom.js";
import { segno } from "app/ui/segni.js";

export function cella(d = {}){
  const dentro = [];
  if(d.foto) dentro.push(e("img", {class:"fig", src:d.foto, alt:"", loading:"lazy"}));
  if(d.pastiglia) dentro.push(e("span", {class:"pastiglia", stile:d.pastiglia}));
  const testo = [e("b", {testo:d.titolo || ""})];
  if(d.sotto) testo.push(e("span", {testo:d.sotto}));
  dentro.push(e("div", {class:"testo"}, testo));
  if(d.coda) dentro.push(e("span", {class:"coda", testo:d.coda}));
  if(d.inArrivo) dentro.push(e("span", {class:"fase", testo:d.inArrivo}));

  const tocca = !!(d.suClick || d.inArrivo);
  if(d.suClick && !d.inArrivo) dentro.push(segno("chevron", {misura:14, classe:"frec"}));

  const n = e(tocca ? "button" : "div", {
    class: "cella" + (tocca ? "" : " piatta") +
           (d.sotto ? " due" : "") + (d.foto ? " con-foto" : ""),
    type: tocca ? "button" : null,
    "aria-label": d.etichetta || null,
    "data-id": d.id || null,
    suClick: d.inArrivo ? null : (d.suClick || null)
  }, dentro);
  if(d.inArrivo) dichiaraInArrivo(n, d.inArrivo, d.etichetta || d.titolo);
  return n;
}

/* Il blocco: intestazione in occhiello Footnote più il gruppo. */
export function lista(titolo, celle){
  const fuori = [];
  if(titolo) fuori.push(e("h2", {class:"occhiello foot lista-testa", testo:titolo}));
  fuori.push(e("div", {class:"lista", role:"list"},
    [].concat(celle).filter(Boolean).map(c => { c.setAttribute("role","listitem"); return c; })));
  return e("section", {class:"lista-blocco"}, fuori);
}
