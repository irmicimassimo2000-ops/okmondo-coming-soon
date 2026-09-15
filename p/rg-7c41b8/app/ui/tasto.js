/* app/ui/tasto.js — TRE TASTI, e non di piu'.
   Primario: capsula piena da 50, --accento con --accento-testo. Uno
     solo per schermo: due primari sono due modi di dire «e' questo».
   Secondario: la stessa capsula svuotata, filo hairline, testo accento.
   Terziario: solo testo, bersaglio 44.
   Il `:active` scala a 0,97 in 100 ms — e' l'unica cosa che dice «ti ho
   sentito» prima che accada qualunque altra cosa, e senza, su un
   telefono, ogni tocco sembra perso.
   Il quarto caso non e' un quarto tasto: e' un tasto qualunque marcato
   `inArrivo:"F4"`, che si dichiara invece di restare muto. */
import { e, dichiaraInArrivo } from "app/ui/dom.js";
import { segno } from "app/ui/segni.js";

export function tasto(testo, opz = {}){
  const dentro = [];
  if(opz.segno) dentro.push(segno(opz.segno, {misura:20}));
  dentro.push(e("span", {testo}));

  const n = e("button", {
    type:"button",
    class:"tasto " + (opz.tipo || "primario") + (opz.largo ? " largo" : ""),
    disabled: !!opz.spento,
    "aria-pressed": opz.premuto === undefined ? null : String(!!opz.premuto),
    "aria-label": opz.etichetta || null,
    suClick: opz.inArrivo ? null : (opz.suClick || null)
  }, dentro);
  if(opz.inArrivo){
    n.append(e("span", {class:"fase", testo:opz.inArrivo}));
    dichiaraInArrivo(n, opz.inArrivo, opz.etichetta || testo);
  }
  return n;
}

/* il testo di un tasto gia' costruito: la vista che lo cambia non deve
   sapere com'e' fatto dentro (c'e' un segno? c'e' la fase?). */
export function vestiTasto(n, testo){
  const s = n.querySelector("span:not(.fase)");
  if(s) s.textContent = testo; else n.textContent = testo;
}
