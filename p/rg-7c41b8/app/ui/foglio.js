/* app/ui/foglio.js — IL FOGLIO DAL BASSO.
   Su un <dialog> vero, perche' il top layer, il fuoco trattenuto,
   l'Esc e lo sfondo inerte li fa gia' il browser meglio di come li
   faremmo noi. Noi mettiamo le quattro cose che il browser non fa:
     · la MANIGLIA 36x5 a 5 punti e i due fermi (meta' e piena dell'altezza vera);
     · il TRASCINAMENTO 1:1, che parte solo quando il contenuto e' in
       cima (scrollTop = 0): altrimenti si chiuderebbe il foglio ogni
       volta che si scorre indietro un elenco;
     · la CHIUSURA PER PROIEZIONE — oltre meta' o lanciato a piu' di
       800 px/s: non «dove sei», «dove stavi andando»;
     · lo SFONDO CHE ARRETRA, scala 0,92 e raggio 12. E' quello che
       trasforma un pannello in un foglio appoggiato sopra una cosa.
   L'entrata la fa `@starting-style` in CSS: il foglio esiste gia' fuori
   schermo nel momento in cui diventa aperto, e sale da solo. */
import { molla, proietta, RIDOTTO } from "app/moto.js";
import { svuota } from "app/ui/dom.js";

let dlg = null, tit = null, corpo = null, maniglia = null;
let suChiusura = null;

function prendi(){
  if(dlg) return;
  dlg = document.getElementById("foglio");
  tit = dlg.querySelector("h2");
  corpo = dlg.querySelector(".corpo");
  maniglia = dlg.querySelector(".maniglia");
  arma();
}

export function apriFoglio(opz = {}){
  prendi();
  /* IL FOGLIO PRENDE IL TEMA DELLA SCHERMATA DA CUI SALE. Un <dialog>
     modale vive nel top layer: sta fuori da <main data-tema=scuro>, e
     quindi da solo si vestirebbe di carta mentre la vista sotto e' di
     velluto. Non e' una svista di CSS che si aggiusta cablando "scuro"
     qui: il giorno in cui una vista chiara apre un foglio, quel cablato
     sarebbe sbagliato al contrario. Si COPIA il tema di chi lo apre. */
  const sorgente = document.querySelector(".vista.qui");
  const tema = sorgente && sorgente.closest("[data-tema]");
  if(tema) dlg.dataset.tema = tema.dataset.tema;
  else delete dlg.dataset.tema;
  tit.textContent = opz.titolo || "";
  svuota(corpo);
  if(opz.contenuto) corpo.append(opz.contenuto);
  dlg.dataset.fermo = opz.fermo === "alto" ? "alto" : "basso";
  suChiusura = opz.suChiusura || null;
  dlg.style.transform = "";
  document.body.classList.add("arretrato");
  if(!dlg.open) dlg.showModal();
  /* il fuoco sul TITOLO, non sul primo tasto: chi ascolta deve sapere
     dove e' arrivato prima di sapere cosa puo' fare. */
  requestAnimationFrame(() => { try{ tit.focus({preventScroll:true}); }catch(_){} });
  return dlg;
}

export function chiudiFoglio(){
  if(!dlg || !dlg.open) return;
  const H = dlg.getBoundingClientRect().height || 1;
  document.body.classList.remove("arretrato");
  if(RIDOTTO.matches){ finisci(); return; }
  dlg.style.transition = "transform var(--d-sheet) var(--ios)";
  dlg.style.transform = "translateY(" + H + "px)";
  setTimeout(finisci, 520);
}
function finisci(){
  dlg.style.transition = ""; dlg.style.transform = "";
  try{ dlg.close(); }catch(_){}
  svuota(corpo);
  const f = suChiusura; suChiusura = null;
  if(f) try{ f(); }catch(e){ console.error(e); }
}

function arma(){
  /* l'Esc passa dal nostro congedo, cosi' anche da tastiera il foglio
     scende invece di sparire */
  dlg.addEventListener("cancel", (ev) => { ev.preventDefault(); chiudiFoglio(); });
  /* il tocco sullo sfondo: un <dialog> riceve il click anche fuori dal
     suo riquadro, e li' fuori c'e' il backdrop */
  dlg.addEventListener("click", (ev) => {
    const r = dlg.getBoundingClientRect();
    if(ev.clientY < r.top || ev.clientX < r.left || ev.clientX > r.right) chiudiFoglio();
  });

  let preso = false, y0 = 0, uy = 0, ut = 0, v = 0, H = 1, id = -1;

  const puoPartire = (ev) =>
    ev.target.closest(".maniglia") || corpo.scrollTop <= 0;

  dlg.addEventListener("pointerdown", (ev) => {
    if(!ev.isPrimary || !puoPartire(ev)) return;
    preso = true; id = ev.pointerId; y0 = uy = ev.clientY;
    ut = ev.timeStamp || performance.now(); v = 0;
    H = dlg.getBoundingClientRect().height || 1;
    dlg.style.transition = "none";
    try{ dlg.setPointerCapture(id); }catch(_){}
  }, {passive:true});

  dlg.addEventListener("pointermove", (ev) => {
    if(!preso || ev.pointerId !== id) return;
    const t = ev.timeStamp || performance.now(), dt = t - ut;
    if(dt > 0) v = (ev.clientY - uy) / dt * 1000;
    uy = ev.clientY; ut = t;
    const dy = ev.clientY - y0;
    /* verso l'alto la resistenza e' 1:3 — il foglio ha un tetto, e un
       tetto che non si sente e' un tetto che si prova a sfondare */
    dlg.style.transform = "translateY(" + (dy > 0 ? dy : dy/3).toFixed(1) + "px)";
  }, {passive:true});

  function lascia(ev){
    if(!preso || (ev && ev.pointerId !== id)) return;
    preso = false;
    try{ dlg.releasePointerCapture(id); }catch(_){}
    const dy = uy - y0;
    const proiettato = dy + proietta(v);
    dlg.style.transition = "";

    if(proiettato > H/2 || v > 800){ chiudiFoglio(); return; }
    if(dy < -40 && dlg.dataset.fermo === "basso"){
      dlg.dataset.fermo = "alto"; dlg.style.transform = ""; return;
    }
    if(proiettato > H*0.18 && dlg.dataset.fermo === "alto"){
      dlg.dataset.fermo = "basso"; dlg.style.transform = ""; return;
    }
    if(RIDOTTO.matches){ dlg.style.transform = ""; return; }
    molla(dy > 0 ? dy : dy/3, 0, {v0:v,
      passo:(p) => { dlg.style.transform = "translateY(" + p.toFixed(1) + "px)"; },
      fine:() => { dlg.style.transform = ""; }});
  }
  dlg.addEventListener("pointerup", lascia, {passive:true});
  dlg.addEventListener("pointercancel", lascia, {passive:true});
  maniglia.addEventListener("click", () => {
    dlg.dataset.fermo = dlg.dataset.fermo === "alto" ? "basso" : "alto";
  });
  maniglia.setAttribute("data-vivo", "1");
}
