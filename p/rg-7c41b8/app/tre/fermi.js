/* ═══════════════════════════════════════════════════════════════════
   app/tre/fermi.js — LE IMMAGINI FERME DELL'ASTUCCIO (generato).

   Scritto da `studio/elementi/costruzione-ingresso-2/banco/fermi.mjs`:
   NON si ritocca a mano. Le immagini sono fotografie della scena VERA
   (`app/tre/astuccio.js` dentro `astuccio.html`, profilo mobile, DPR
   1,5 = quello del disegnatore sul telefono), ferme al fotogramma in cui
   la scocca le mostra. Per questo quando il 3D arriva non cambia niente
   a vista: è la stessa scena, ferma e poi viva.

   S1 (consegna, regia B): la scena di riferimento è 393 x 720 (S1 su un
   iPhone 393 x 852); ogni immagine è il QUADRATO di lato 393 al suo
   centro. Su uno schermo verticale il quadro lo detta la larghezza, e
   la scena mette il centro dell'astuccio chiuso al centro della tela:
   quindi l'immagine sta al centro della scena, larga quanto il lato
   corto. (Su un rapporto molto diverso la prospettiva cambia di un
   filo; lo scambio è comunque una dissolvenza di 200 ms.)
     tutto     il fotogramma 0: sovrascatola sull'astuccio (il riposo)
     astuccio  l'astuccio chiuso, senza sovrascatola (fotogramma 700)
     manicotto la sola sovrascatola, per sfilarla nel ripiego
     scia      dove va a schermo la sovrascatola mentre si sfila:
               [ms, dx, dy] in punti della scena di riferimento
   REGALO (regia A): 240 x 240, l'astuccio chiuso al fotogramma 0.
   ═══════════════════════════════════════════════════════════════════ */
export const FERMI_LATO = {s1: 393, regalo: 240};
export const DA_BANCO = {busto: "collane", rampa: "bracciali",
  anelli: "anelli", orecchini: "orecchini", orologi: "orologi"};
const FAMIGLIE = new Set(["anelli", "orecchini", "collane", "bracciali", "orologi"]);
export const famigliaFerma = (fam) => DA_BANCO[fam] || (FAMIGLIE.has(fam) ? fam : "anelli");
export const SCIA = {"anelli":[[0,0,0],[50,-1.3,-0.2],[100,-9.1,-1.5],[150,-27.1,-4.6],[200,-56.1,-9.6],[250,-94.8,-16.2],[300,-140.4,-24],[350,-189.2,-32.3],[400,-237.1,-40.5],[450,-280.5,-47.9],[500,-316.3,-54],[550,-342.4,-58.4],[600,-358.4,-61.2],[650,-365.2,-62.3],[700,-366.4,-62.5]],"orecchini":[[0,0,0],[50,-1.3,-0.2],[100,-9.1,-1.6],[150,-27.1,-4.6],[200,-56.1,-9.6],[250,-94.8,-16.2],[300,-140.4,-24],[350,-189.2,-32.3],[400,-237.1,-40.5],[450,-280.5,-47.9],[500,-316.2,-54],[550,-342.4,-58.5],[600,-358.3,-61.2],[650,-365.2,-62.4],[700,-366.3,-62.6]],"collane":[[0,0,0],[50,-1.3,-0.2],[100,-9.1,-1.6],[150,-27.1,-4.6],[200,-56.1,-9.6],[250,-94.8,-16.2],[300,-140.4,-24],[350,-189.2,-32.3],[400,-237.1,-40.5],[450,-280.4,-47.9],[500,-316.2,-54],[550,-342.4,-58.5],[600,-358.3,-61.2],[650,-365.2,-62.4],[700,-366.3,-62.6]],"bracciali":[[0,0,0],[50,-1.3,-0.2],[100,-9.1,-1.5],[150,-27.1,-4.6],[200,-56.1,-9.6],[250,-94.8,-16.2],[300,-140.4,-24],[350,-189.2,-32.3],[400,-237.1,-40.5],[450,-280.5,-47.9],[500,-316.2,-54],[550,-342.4,-58.5],[600,-358.3,-61.2],[650,-365.2,-62.4],[700,-366.3,-62.6]],"orologi":[[0,0,0],[50,-1.3,-0.2],[100,-9.1,-1.6],[150,-27.1,-4.6],[200,-56.1,-9.6],[250,-94.8,-16.2],[300,-140.4,-24],[350,-189.2,-32.3],[400,-237.1,-40.5],[450,-280.5,-47.9],[500,-316.2,-54],[550,-342.4,-58.5],[600,-358.3,-61.2],[650,-365.2,-62.4],[700,-366.3,-62.6]]};
const v = () => (window.VERSIONE ? "?v=" + encodeURIComponent(window.VERSIONE) : "");
export function fermiS1(fam){
  const f = famigliaFerma(fam);
  return {tutto: "assets/astuccio/s1-" + f + "-tutto.webp" + v(),
          astuccio: "assets/astuccio/s1-" + f + "-astuccio.webp" + v(),
          manicotto: "assets/astuccio/s1-" + f + "-manicotto.webp" + v(),
          scia: SCIA[f]};
}
export const fermoRegalo = (fam) =>
  "assets/astuccio/regalo-" + famigliaFerma(fam) + ".webp" + v();
export default {fermiS1, fermoRegalo, famigliaFerma, FERMI_LATO, SCIA};
