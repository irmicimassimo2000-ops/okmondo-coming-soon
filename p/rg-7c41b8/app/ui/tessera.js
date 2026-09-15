/* ═══════════════════════════════════════════════════════════════════
   app/ui/tessera.js — UNA TESSERA, E UNA SOLA.

   Fino al 15/09/2026 la tessera esisteva due volte: marcatura dentro
   `s3()` in `viste/ingresso.js` e una copia ricostruita a mano in
   `viste/profilo.js`. Due copie della stessa carta sono due carte: la
   prima che cambia lascia l'altra indietro, e il cliente se ne accorge
   perché è lo stesso oggetto in due posti dell'app. Il critic l'ha
   scritto come mossa (3): UNA tessera condivisa fra S3, il profilo e
   il foglio del livello.

   COS'È. Un oggetto a due facce, 358 x 220 (361 sullo schermo da 393:
   la colonna meno i margini, e mai oltre 361), che si gira su se
   stessa. Il FRONTE è il pass di Wallet — marchio, credito, codice,
   intestazione, livello. Il RETRO è ciò che si mostra al banco: il
   codice e il suo codice a barre.

   LE DUE DECISIONI DI QUESTA PASSATA (E1), e il perché.

   · IL MARCHIO A 60, O NIENTE. A 34 punti il corsivo «jewels» del
     lockup diventa una macchia grigia: non è un marchio piccolo, è un
     marchio illeggibile. Il canone di Massimo non ammette il segno
     ridotto (niente monogramma, niente favicon), quindi l'alternativa
     sarebbe stata toglierlo del tutto e scrivere «REGINA» in Inter —
     che è un marchio ridotto travestito da testo. Sta a 60, in alto a
     sinistra, nel campo del logo come vuole la HIG di Wallet, e la
     griglia del pass si è ricomposta intorno a lui.
   · IL CODICE A BARRE STA SUL RETRO. È ciò che ha liberato i 60 punti.
     E ha un senso suo: le barre non sono decorazione del pass, sono il
     gesto del banco — si gira la carta e si porge. Il fronte dice chi
     sei, il retro ti fa entrare.

   Il codice a barre è un DISEGNO DETERMINISTICO del messaggio (stesso
   codice, stesse barre) e NON un Code 128 valido: il pass vero lo
   firma il server insieme al certificato, e disegnare qui un codice
   davvero scansionabile vorrebbe dire far credere che questa anteprima
   sia il pass. Non lo è, e il foglio del badge lo dice.

   LA GIRATA. rotateY 600 ms con il keyframe a 90 gradi al 50 % (300):
   la metà del giro è FISSATA nel tempo, così la faccia cambia
   esattamente quando la carta è di taglio e non si vede mai il retro
   in trasparenza. Chi ha chiesto meno movimento non ha un giro più
   corto: ha una dissolvenza incrociata da 200 (corpus 49 §10, formula
   E — il grado della celebrazione scende di uno, non sparisce).
   ═══════════════════════════════════════════════════════════════════ */
import { e, annuncia } from "app/ui/dom.js";
import { RIDOTTO } from "app/moto.js";

export const GIRO = 600;          /* 2 x --d-ct-in, keyframe a 300     */
export const GIRO_RIDOTTO = 200;  /* la dissolvenza, non il giro       */
/* 200 e non 250: il tetto del movimento ridotto e' 200 ms (SISTEMA-DESIGN
   regola 4, «dissolvenze 150-200»), e una dissolvenza che lo sfonda e'
   movimento che chi ne ha chiesto meno riceve lo stesso. */

/* ── IL CODICE A BARRE ──────────────────────────────────────────────
   Rettangolare, mai quadrato (HIG Wallet). 52 barre di tre larghezze,
   estratte da un generatore congruenziale seminato col messaggio: lo
   stesso codice disegna sempre le stesse barre, e due codici diversi
   non disegnano mai le stesse. */
export function barre(messaggio){
  const dentro = [];
  let h = 7;
  for(let i = 0; i < messaggio.length; i++) h = (h * 31 + messaggio.charCodeAt(i)) >>> 0;
  for(let i = 0; i < 52; i++){
    h = (h * 1103515245 + 12345) >>> 0;
    dentro.push(e("i", {stile: "flex:" + (1 + (h >>> 28) % 3)}));
  }
  return e("div", {class: "f1-barre", "aria-hidden": "true"}, [
    e("div", {class: "f1-barre-riga"}, dentro),
    e("span", {class: "t-cap2 cifra", testo: messaggio})
  ]);
}

/* ── IL FRONTE ──────────────────────────────────────────────────────
   Tre blocchi e un solo verso di lettura: il marchio e il credito in
   testa (chi firma, quanto vale), il codice al centro (il primario di
   Wallet), le due voci secondarie in fondo.
   IL LIVELLO SENZA PERCENTUALE. «Secondo · 3%» su una carta si legge
   come un progresso — quanto manca, a che punto sono — e una carta non
   è una barra di avanzamento. La percentuale vive dove si spiega:
   nello schermo del credito. Qui resta il NOME del livello. */
function fronte(d){
  return e("div", {class: "f1-pass f1-pass-fronte", "data-fodera": d.fodera || null}, [
    e("div", {class: "f1-pass-testa"}, [
      e("img", {class: "f1-pass-marchio", src: "marchio.png", alt: "",
                decoding: "async"}),
      e("div", {class: "f1-pass-credito"}, [
        e("span", {class: "occhiello", testo: "Credito"}),
        e("b", {class: "cifra", testo: d.credito})
      ])
    ]),
    e("div", {class: "f1-pass-corpo"}, [
      e("span", {class: "occhiello", testo: "Tessera"}),
      e("b", {class: "t-1 cifra f1-pass-codice", testo: d.codice})
    ]),
    e("div", {class: "f1-pass-righe"}, [
      e("div", {}, [
        e("span", {class: "occhiello", testo: "Intestata a"}),
        e("b", {class: "t-head", testo: d.nome || "—"})
      ]),
      e("div", {}, [
        e("span", {class: "occhiello", testo: "Livello"}),
        e("b", {class: "t-head", testo: d.livello || "Primo"})
      ])
    ])
  ]);
}

/* ── IL RETRO ───────────────────────────────────────────────────────
   Il codice, il suo segno da mostrare e la riga che dice cosa farne.
   `retro.qr` accetta un NODO già disegnato (l'encoder QR vero vive in
   `viste/azioni.js` e nel banco): se arriva, prende il posto delle
   barre. Non si chiama l'encoder da qui perché una carta non deve
   sapere come si fa un QR — deve sapere dove metterlo. */
function retroFaccia(d){
  const r = d.retro || {};
  const codice = r.codice || d.codice;
  return e("div", {class: "f1-pass f1-pass-retro", "data-fodera": d.fodera || null}, [
    e("div", {class: "f1-pass-dietro"}, [
      e("div", {class: "f1-pass-corpo"}, [
        e("span", {class: "occhiello", testo: "Tessera"}),
        e("b", {class: "t-1 cifra f1-pass-codice", testo: codice})
      ]),
      r.qr || barre(codice),
      e("span", {class: "t-sub f1-pass-banco", testo: "Mostra al banco"})
    ])
  ]);
}

/* ═══ LA TESSERA ════════════════════════════════════════════════════
   Restituisce la SCENA (il contenitore con la prospettiva), che è ciò
   che si appende alla pagina, e le appende addosso quel che serve:
     .gira()   gira la carta e restituisce il verso nuovo
     .carta    il bersaglio (è lui che ruota)
     .fronte / .retro   le due facce, per chi deve rivestirne una
                        (il foglio della salita di livello)

   LA PROSPETTIVA STA SUL CONTENITORE, non sulla carta: se la si mette
   sull'elemento che ruota, la fuga si gira insieme a lui e la carta
   sembra scivolare invece di voltarsi.
   IL TEMA CHIARO STA SULLA SCENA: la carta è crema anche dentro una
   vista di velluto, e i ruoli dentro devono saperlo — senza, `--testo-2`
   diventerebbe `--quieto` su crema (2,0:1) e `--credito` diventerebbe
   `--firma-fuoco` (2,8:1).

   opz.suClick — la carta diventa un COMANDO che fa quella cosa (in R0
     apre «Credito e livello»: la tessera è il tasto, e la lista che
     ripeteva le stesse due righe sotto è sparita). Senza, la carta è
     un comando che GIRA — ed è il caso di S3 e del foglio del livello.
   opz.etichetta — l'aria-label, quando la frase di serie non basta. */
export function tessera(d = {}, opz = {}){
  const f = fronte(d);
  const r = retroFaccia(d);
  const faccia1 = e("div", {class: "tessera-faccia fronte"}, [f]);
  const faccia2 = e("div", {class: "tessera-faccia retro"}, [r]);

  const descrizione = "Tessera " + d.codice + (d.nome ? ", " + d.nome : "") +
    ", livello " + (d.livello || "Primo") + ", credito " + d.credito;
  const carta = e("button", {
    type: "button", class: "tessera-carta",
    "aria-label": opz.etichetta ||
      (descrizione + (opz.suClick ? ". Apre il credito." : ". Tocca per girarla.")),
    "aria-pressed": opz.suClick ? null : "false",
    suClick: opz.suClick || (() => gira())
  }, [faccia1, faccia2]);

  const scena = e("div", {class: "tessera-scena", "data-tema": "chiaro"}, [carta]);

  /* movimento ridotto: il retro non sta a 180 gradi (lo toglie il CSS),
     quindi coprirebbe il fronte; parte spento e si scambia in
     dissolvenza. */
  if(RIDOTTO.matches) faccia2.style.opacity = "0";

  let giro = 0, anim = null;
  function gira(){
    giro += 180;
    const dietro = (giro / 180) % 2 === 1;
    if(!opz.suClick) carta.setAttribute("aria-pressed", String(dietro));
    annuncia(dietro ? "Il retro della tessera: " + (d.retro && d.retro.codice || d.codice) +
                      ", mostralo al banco."
                    : "Il fronte della tessera.");
    if(anim) try{ anim.cancel(); }catch(_){ /* già finita */ }
    if(RIDOTTO.matches){
      faccia1.animate([{opacity: dietro ? 1 : 0}, {opacity: dietro ? 0 : 1}],
        {duration: GIRO_RIDOTTO, easing: "linear", fill: "both", id: "T-gira"});
      faccia2.animate([{opacity: dietro ? 0 : 1}, {opacity: dietro ? 1 : 0}],
        {duration: GIRO_RIDOTTO, easing: "linear", fill: "both", id: "T-gira-retro"});
      return dietro;
    }
    anim = carta.animate([
      {transform: "rotateY(" + (giro - 180) + "deg)",
       easing: "cubic-bezier(.4,0,.6,1)"},
      {transform: "rotateY(" + (giro - 90) + "deg)", offset: .5,
       easing: "cubic-bezier(.2,.8,.2,1)"},
      {transform: "rotateY(" + giro + "deg)"}
    ], {duration: GIRO, fill: "forwards", id: "T-gira"});
    return dietro;
  }

  scena.gira = gira;
  scena.carta = carta;
  scena.fronte = f;
  scena.retro = r;
  scena.facciaRetro = faccia2;
  return scena;
}
