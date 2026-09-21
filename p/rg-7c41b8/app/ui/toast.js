/* app/ui/toast.js — LA CONFERMA.
   Il verdetto del cliente, e il sistema lockato lo scrive nella regola
   5: «la conferma sta in fondo, dove sta il pollice», ed è UNA pillola
   da 36 — --vano su --luce — che entra in 100 ms ed esce in 250.

   UNA. Non una pila: se ne arriva un'altra, la prima se ne va subito.
   Due conferme sovrapposte sono due cose da leggere nel tempo di
   leggerne mezza, e la seconda vince comunque.

   Sta SOPRA la barra, non sotto: sotto la copre il vetro, e un avviso
   coperto non è un avviso. `role="status"` perché venga letto senza
   rubare il fuoco: un avviso che sposta il fuoco interrompe quello che
   si stava facendo, ed è il contrario del suo mestiere.
   («Annulla» è un bersaglio da 44 dentro una pillola da 36: lo
   scavalco è trasparente, quindi la pillola resta 36 a vedersi e 44 a
   toccarsi. Vedi `.toast .annulla` in sistema.css.) */
import { e } from "app/ui/dom.js";
import { molla, proietta, RIDOTTO } from "app/moto.js";
import { iscrivi } from "app/stato.js";

const DURATA = 4000;
let zona = null;
let inScena = null;      /* la pillola viva: ce n'e' al massimo una */

/* LA PILLOLA MUORE AL CAMBIO DI ROTTA (corretto 21/09, trovato su
   Fodera: «Data tolta · Annulla», nata in «Le tue date», restava a
   galleggiare sopra la pagina dopo). Una conferma con un'azione parla
   di UNA schermata; se resta sopra quella dopo, offre di annullare un
   gesto che non si vede più dove fare. `app/rotta.js` manda `nav/push`,
   `nav/pop` e `nav/tab` a ogni suo movimento — il foglio (`ui/foglio.js`)
   non ne manda nessuno, e giustamente: non ha un indirizzo, e una
   pillola non deve sparire solo perché sopra si è aperto un foglio.
   `via()` è già idempotente (`andato`): chiamarla due volte non fa
   niente la seconda. */
iscrivi((s, ev) => {
  if(inScena && (ev.tipo === "nav/push" || ev.tipo === "nav/pop" || ev.tipo === "nav/tab"))
    inScena();
});

export function toast(testo, opz = {}){
  zona = zona || document.getElementById("toast-zona");
  if(!zona) return null;
  if(inScena) inScena();                 /* niente pile: la prima esce */

  /* LA PILLOLA DICHIARA IL PROPRIO TEMA, e non è un dettaglio: la
     regola 5 dice `--vano` su `--luce` IN TUTTI I TEMI, e quei due
     sono materia fissa — restano scuro su chiaro ovunque. Ma
     «Annulla» è un ACCENTO, e `--accento` in una vista di carta è
     `--firma` (#106068), che su `--vano` fa 2,6:1: illeggibile. Con
     `data-tema="scuro"` addosso, dentro la pillola l'accento è
     `--firma-fuoco` (5,7:1) — il ruolo giusto, non un hex scritto a
     mano — e resta tale il giorno in cui la zona dei toast finisse
     dentro un contenitore chiaro. */
  const n = e("div", {class:"toast entra", role:"status", "aria-live":"polite",
    "data-tema":"scuro"},
    [e("span", {testo})]);
  if(opz.annulla)
    n.append(e("button", {type:"button", class:"annulla", testo:"Annulla",
      suClick: () => { try{ opz.annulla(); }catch(err){ console.error(err); } via(); }}));
  zona.append(n);
  requestAnimationFrame(() => requestAnimationFrame(() => n.classList.remove("entra")));

  let orologio = setTimeout(via, opz.durata || DURATA);
  let andato = false;
  inScena = via;

  function via(){
    if(andato) return; andato = true;
    if(inScena === via) inScena = null;
    clearTimeout(orologio);
    n.classList.add("via");
    n.style.opacity = "0";
    n.style.transform = "translateY(10px)";
    setTimeout(() => n.remove(), 260);
  }

  /* SCORRE VIA COL DITO: orizzontale, 1:1, e se ne va per proiezione.
     La stessa legge del gesto dal bordo — in un'app dove due gesti
     obbediscono a due leggi diverse si sente, anche senza saperlo dire. */
  let x0 = 0, ux = 0, ut = 0, v = 0, preso = false, id = -1;
  n.addEventListener("pointerdown", (ev) => {
    if(!ev.isPrimary || ev.target.closest(".annulla")) return;
    preso = true; id = ev.pointerId; x0 = ux = ev.clientX;
    ut = ev.timeStamp || performance.now(); v = 0;
    clearTimeout(orologio);
    n.style.transition = "none";
    try{ n.setPointerCapture(id); }catch(_){}
  }, {passive:true});
  n.addEventListener("pointermove", (ev) => {
    if(!preso || ev.pointerId !== id) return;
    const t = ev.timeStamp || performance.now(), dt = t - ut;
    if(dt > 0) v = (ev.clientX - ux) / dt * 1000;
    ux = ev.clientX; ut = t;
    const dx = ev.clientX - x0;
    n.style.transform = "translateX(" + dx.toFixed(1) + "px)";
    n.style.opacity = String(Math.max(0, 1 - Math.abs(dx) / 260));
  }, {passive:true});
  function lascia(ev){
    if(!preso || (ev && ev.pointerId !== id)) return;
    preso = false;
    try{ n.releasePointerCapture(id); }catch(_){}
    const dx = ux - x0, W = n.offsetWidth || 1;
    n.style.transition = "";
    if(Math.abs(dx + proietta(v)) > W/2 || Math.abs(v) > 800){
      if(RIDOTTO.matches){ via(); return; }
      andato = true; if(inScena === via) inScena = null;
      molla(dx, dx > 0 ? W*1.3 : -W*1.3, {v0:v,
        passo:(p) => { n.style.transform = "translateX(" + p.toFixed(1) + "px)";
                       n.style.opacity = String(Math.max(0, 1 - Math.abs(p)/260)); },
        fine:() => n.remove()});
    } else {
      molla(dx, 0, {v0:v,
        passo:(p) => { n.style.transform = "translateX(" + p.toFixed(1) + "px)";
                       n.style.opacity = String(Math.max(0, 1 - Math.abs(p)/260)); },
        fine:() => { n.style.transform = ""; n.style.opacity = "";
                     orologio = setTimeout(via, DURATA); }});
    }
  }
  n.addEventListener("pointerup", lascia, {passive:true});
  n.addEventListener("pointercancel", lascia, {passive:true});

  return {via};
}
