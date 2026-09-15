/* app/ui/scheletro.js — IL REDATTO.
   Non è una rotella. Una rotella dice «aspetta»; il redatto dice
   «aspetta, e sarà fatto così» — e quando il contenuto arriva non
   salta niente, perché occupava già quel posto.
   MONOCROMO E FERMO: la regola 5 vieta lo shimmer. Una luce che scorre
   sopra qualcosa che non esiste ancora è l'unica animazione dell'app
   che non porta informazione — e sotto movimento ridotto andrebbe
   spenta comunque, cioè è una cosa che a volte c'è e a volte no.
   `aria-hidden`: a chi ascolta non si legge la forma di cio' che non
   c'è; glielo dice `#annunci` quando c'è. */
import { e } from "app/ui/dom.js";

export const osso = (w, h, opz = {}) =>
  e("div", {class:"redatto", stile:
    "width:" + w + ";height:" + h + ";" +
    (opz.raggio ? "border-radius:" + opz.raggio + ";" : "") +
    (opz.su ? "margin-top:" + opz.su + ";" : "")});

/* n celle finte, con la stessa altezza delle celle vere */
export function scheletroLista(n = 3){
  const righe = [];
  for(let i = 0; i < n; i++)
    righe.push(e("div", {class:"cella piatta con-foto"},
      [osso("44px","44px",{raggio:"6px"}),
       e("div", {stile:"flex:1"},
         [osso("62%","13px"), osso("38%","11px",{su:"7px"})])]));
  return e("div", {class:"lista", "aria-hidden":"true"}, righe);
}
