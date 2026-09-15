/* app/ui/vuoto.js — LO STATO VUOTO.
   Il pattern che iOS chiama ContentUnavailableView, e che il sistema
   lockato scrive cosi': segno + Title 2 + Body secondario + UNA azione.
   Sempre in quest'ordine, sempre tutte e quattro. Uno stato vuoto senza
   azione e' un vicolo cieco con le tende.
   Il segno viene dalla libreria di `app/ui/segni.js` — niente disegni
   sciolti in giro per i file: un segno che vive in un solo posto e'
   un segno che si puo' ancora pareggiare con gli altri. */
import { e } from "app/ui/dom.js";
import { tasto } from "app/ui/tasto.js";
import { segno } from "app/ui/segni.js";

export function vuoto(opz = {}){
  const parti = [
    segno(opz.segno || "cofanetto", {misura:56}),
    e("b", {testo: opz.titolo || "Non c’è ancora niente"}),
    e("p", {testo: opz.testo || ""})
  ];
  if(opz.azione)
    parti.push(tasto(opz.azione, {tipo:"secondario", suClick: opz.suAzione}));
  return e("div", {class:"vuoto"}, parti);
}
