/* ═══════════════════════════════════════════════════════════════════
   app/ui/barra-nav.js — LA BARRA DI NAVIGAZIONE E IL TITOLO GRANDE.
   L'anatomia di iOS, quella vera: 44 punti di barra più la safe-area,
   e sotto 52 punti di titolo grande in Bodoni 34. Si scorre, il titolo
   grande esce e quello compatto entra — Inter 600 a 17.

   Perché una DISSOLVENZA INCROCIATA e non un titolo che rimpicciolisce:
   sono due caratteri diversi. Bodoni 34 e Inter 17 non si interpolano —
   non hanno le stesse aste, non hanno lo stesso asse, non hanno la
   stessa larghezza. Un morphing fra i due è una terza cosa sbagliata
   che passa davanti agli occhi per 200 ms. Si scambiano, e basta.

   La barra vive DENTRO lo scroller, appiccicata in alto (`sticky`):
   ogni strato della pila ha il suo scroller, quindi ogni schermata
   spinta porta la propria barra, il proprio titolo e il proprio
   indietro — che è esattamente cio' che fa una UINavigationController.
   ═══════════════════════════════════════════════════════════════════ */
import { e } from "app/ui/dom.js";
import { segno } from "app/ui/segni.js";

const ALTEZZA_BARRA = 44;

/* ── LO SCHERMO ────────────────────────────────────────────────────
   Svuota lo strato e ci costruisce la forma iOS. Ritorna la `.pagina`:
   è lì dentro che la vista mette il suo contenuto.
     titolo    il titolo grande (e quello compatto: sono lo stesso)
     occhiello facoltativo, la riga in maiuscoletto accanto al titolo
     indietro  funzione: se c'è, la barra porta il ritorno */
export function schermo(strato, opz = {}){
  strato.textContent = "";

  const compatto = e("span", {class:"compatto", testo: opz.titolo || "",
    "aria-hidden":"true"});

  const sinistra = e("span", {class:"lato"});
  if(opz.indietro){
    const b = e("button", {type:"button", class:"indietro",
      "aria-label": opz.etichettaIndietro || "Indietro",
      suClick: opz.indietro}, [segno("chevron", {misura:20}),
                               e("span", {testo:"Indietro"})]);
    sinistra.append(b);
  }
  const destra = e("span", {class:"lato destra"});
  if(opz.azione) destra.append(opz.azione);

  const barra = e("header", {class:"barra-nav"}, [sinistra, compatto, destra]);

  const titolone = e("h1", {class:"titolone", tabindex:"-1", testo: opz.titolo || ""});
  const testa = [titolone];
  if(opz.occhiello) testa.push(e("span", {class:"occhiello", testo:opz.occhiello}));
  const pagina = e("div", {class:"pagina"},
    [e("div", {class:"testa-pagina"}, testa)]);

  strato.append(barra, pagina);
  agganciaIlTitolo(strato, barra, titolone);
  return pagina;
}

/* ── L'INCROCIO ────────────────────────────────────────────────────
   Una classe sola, `posata`, e la fa il CSS: la barra prende il vetro e
   il filo, il compatto entra, il titolo grande esce (regola di
   fratellanza in sistema.css). Qui si decide solo QUANDO.
   La soglia è il punto in cui il titolo grande finisce di passare
   dietro la barra — non un numero fisso: un titolo su due righe ha una
   soglia diversa, e un numero fisso lo scoprirebbe tardi.
   Il listener è passivo e strozzato a un fotogramma: lo scroll di un
   telefono non aspetta che noi finiamo di pensare. */
function agganciaIlTitolo(strato, barra, titolone){
  let inAttesa = false, posata = false;
  const alto = () => {
    const safe = parseFloat(getComputedStyle(barra).paddingTop) || 0;
    return ALTEZZA_BARRA + safe;
  };
  function guarda(){
    inAttesa = false;
    const soglia = Math.max(0, titolone.offsetTop + titolone.offsetHeight - alto() - 6);
    const ora = strato.scrollTop > soglia;
    if(ora === posata) return;
    posata = ora;
    barra.classList.toggle("posata", ora);
  }
  strato.addEventListener("scroll", () => {
    if(inAttesa) return;
    inAttesa = true;
    requestAnimationFrame(guarda);
  }, {passive:true});
  guarda();
}
