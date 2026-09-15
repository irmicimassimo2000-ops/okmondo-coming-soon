/* app/ui/foglio.js — IL FOGLIO DAL BASSO.
   Su un <dialog> vero, perché il top layer, il fuoco trattenuto,
   l'Esc e lo sfondo inerte li fa già il browser meglio di come li
   faremmo noi. Noi mettiamo le quattro cose che il browser non fa:
     · la MANIGLIA 36x5 a 5 punti e i due fermi (metà e piena dell'altezza vera);
     · il TRASCINAMENTO 1:1, che parte solo quando il contenuto è in
       cima (scrollTop = 0): altrimenti si chiuderebbe il foglio ogni
       volta che si scorre indietro un elenco;
     · la CHIUSURA PER PROIEZIONE — oltre metà o lanciato a più di
       800 px/s: non «dove sei», «dove stavi andando»;
     · lo SFONDO CHE ARRETRA, scala 0,92 e raggio 12. È quello che
       trasforma un pannello in un foglio appoggiato sopra una cosa.
   L'entrata la fa `@starting-style` in CSS: il foglio esiste già fuori
   schermo nel momento in cui diventa aperto, e sale da solo. */
import { molla, proietta, RIDOTTO } from "app/moto.js";
import { svuota } from "app/ui/dom.js";

let dlg = null, tit = null, corpo = null, maniglia = null, azione = null;
let suChiusura = null;

function prendi(){
  if(dlg) return;
  dlg = document.getElementById("foglio");
  tit = dlg.querySelector("h2");
  corpo = dlg.querySelector(".corpo");
  maniglia = dlg.querySelector(".maniglia");
  /* IL POSTO DELL'AZIONE, accanto al titolo. Nasce qui e non in
     index.html per una ragione sola: il telaio non deve sapere che
     esiste un foglio con un comando in testa. Chi non passa `azione`
     trova un contenitore vuoto, che non occupa niente (`:empty` in
     sistema.css) e non cambia di un pixel i fogli già fatti. */
  azione = dlg.querySelector(".fog-azione");
  if(!azione){
    azione = document.createElement("div");
    azione.className = "fog-azione";
    dlg.insertBefore(azione, corpo);
  }
  arma();
}

export function apriFoglio(opz = {}){
  prendi();
  /* IL FOGLIO PRENDE IL TEMA DELLA SCHERMATA DA CUI SALE. Un <dialog>
     modale vive nel top layer: sta fuori da <main data-tema=scuro>, e
     quindi da solo si vestirebbe di carta mentre la vista sotto è di
     velluto. Non è una svista di CSS che si aggiusta cablando "scuro"
     qui: il giorno in cui una vista chiara apre un foglio, quel cablato
     sarebbe sbagliato al contrario. Si COPIA il tema di chi lo apre. */
  const sorgente = document.querySelector(".vista.qui");
  const tema = sorgente && sorgente.closest("[data-tema]");
  if(tema) dlg.dataset.tema = tema.dataset.tema;
  else delete dlg.dataset.tema;
  tit.textContent = opz.titolo || "";
  svuota(corpo);
  svuota(azione);
  /* l'azione NON entra nell'<h2>: il <dialog> prende da lì il proprio
     nome accessibile (`aria-labelledby`), e un tasto dentro il titolo
     farebbe leggere «I tuoi gioielli 9 Stanza». Sta accanto. */
  if(opz.azione) azione.append(opz.azione);
  if(opz.contenuto) corpo.append(opz.contenuto);
  delete dlg.dataset.vista;
  dlg.dataset.fermo = opz.fermo === "alto" ? "alto" : "basso";
  suChiusura = opz.suChiusura || null;
  dlg.style.transform = "";
  document.body.classList.add("arretrato");
  if(!dlg.open) dlg.showModal();
  /* il fuoco sul TITOLO, non sul primo tasto: chi ascolta deve sapere
     dove è arrivato prima di sapere cosa può fare. */
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
  svuota(azione);
  delete dlg.dataset.vista;
  const f = suChiusura; suChiusura = null;
  if(f) try{ f(); }catch(e){ console.error(e); }
}

function arma(){
  /* l'Esc passa dal nostro congedo, così anche da tastiera il foglio
     scende invece di sparire */
  dlg.addEventListener("cancel", (ev) => { ev.preventDefault(); chiudiFoglio(); });
  /* il tocco sullo sfondo: un <dialog> riceve il click anche fuori dal
     suo riquadro, e lì fuori c'è il backdrop.
     LA PRIMA CONDIZIONE NON È PIGNOLERIA, È UN DIFETTO PAGATO. Il
     controllo era solo sulle coordinate, e un click che NON viene da un
     dito le ha a zero: l'attivazione da TASTIERA (Invio su un tasto
     dentro il foglio) e ogni `.click()` da codice cadono a (0,0), cioè
     «sopra e a sinistra del foglio», cioè sul backdrop — e il foglio
     si chiudeva sotto le dita di chi aveva appena premuto Invio. Il
     backdrop è il <dialog> STESSO come bersaglio: qualunque cosa ci
     sia dentro è un figlio, e un figlio non è il backdrop. */
  dlg.addEventListener("click", (ev) => {
    if(ev.target !== dlg) return;
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
    /* verso l'alto la resistenza è 1:3 — il foglio ha un tetto, e un
       tetto che non si sente è un tetto che si prova a sfondare */
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
