/* app/dati/cofanetto — IL COFANETTO, UNO SOLO.

   Nell'app ce n'erano due disegnati in CSS: un rettangolo con un gradiente
   per la scheda della fodera e un trapezio per la cerimonia di apertura.
   Il critic li ha bocciati, e aveva ragione: non erano lo stesso oggetto
   della scena 3D del banco.
   Adesso c'è un oggetto solo, costruito in `studio/prova3d/_CO_cofanetto.html`
   con la materia che il banco usa già per la base col marchio — similpelle
   turchese #106068, marchio in oro, fodera di velluto nelle quattro vesti —
   e fotografato su fondo trasparente sempre dalla STESSA macchina.

   Quella macchina ferma è l'unica ragione per cui la cerimonia funziona:
   `base` e `coperchio` non sono due disegni, sono due strati della stessa
   fotografia. Si sovrappongono senza sfalsamento (`offset` è zero), e la
   scocca ruota il coperchio in CSS attorno a `cerniera.origine`, che è
   dove sta davvero il perno nel quadro.

   Questo file lo GENERA `_CO_consegna.py`. Non si scrive a mano: i numeri
   qui dentro sono misurati sulla scena, e riscriverli a mano vuol dire
   scollare i due strati.

   Il pezzo NON è dentro: lo mette la scocca, sopra `base`.
*/
export const COFANETTO = {
  /* dove stanno i file, e quanto è grande il quadro (lo stesso per tutti) */
  radice: "./dati/cofanetto/",
  quadro: {w: 1800, h: 1385},
  proporzione: 1.29964,                    /* w / h */

  /* IL COFANETTO INTERO */
  chiuso: "chiuso.webp",
  aperto: {
    bianco:   "aperto-bianco.webp",
    turchese: "aperto-turchese.webp",
    velluto:  "aperto-velluto.webp",
    avorio:   "aperto-avorio.webp",
  },

  /* I DUE STRATI DELLA CERIMONIA.
     `base` è la base aperta, con la sua ombra: è lo strato di sotto e
     non si muove mai. `coperchio` è il solo coperchio in posizione
     CHIUSA, senza ombra: parte sovrapposto alla base (sembra chiuso) e
     ruota fino a `apertura` attorno a `cerniera.origine`. */
  base: {
    bianco:   "base-bianco.webp",
    turchese: "base-turchese.webp",
    velluto:  "base-velluto.webp",
    avorio:   "base-avorio.webp",
  },
  coperchio: "coperchio-chiuso.webp",

  /* FINO A DOVE REGGE LA ROTAZIONE IN CSS — e da dove non regge più.
     Questo è il numero più importante del file, ed è MISURATO, non
     stimato: `_CO_strati.py` rifa' in Python la stessa affine che fa il
     CSS e mette i fotogrammi accanto a quello vero reso in 3D.
     Il coperchio è una FOTOGRAFIA di un oggetto visto di tre quarti: un
     `rotateX` lo comprime in verticale, che è esattamente cio' che fa la
     rotazione vera finché l'angolo è piccolo. Fino a circa -70 gradi i
     due sono indistinguibili. Oltre, il coseno cambia segno, l'immagine
     si ribalta oltre la cerniera e si assottiglia fino a una lama: il
     fotogramma finale in CSS NON assomiglia al coperchio aperto vero.
     Quindi la cerimonia si fa così: si ruota in CSS da 0 a `sicuro`, e
     da lì si dissolve su `aperto[fodera]`, che è il fotogramma vero
     dello stesso istante e dalla stessa macchina. È anche quello che
     l'ingresso già faceva — il coperchio si dissolveva — ma adesso si sa
     PERCHÉ e a quale grado. */
  rotazione_in_css: {sicuro: -70, oltre: "dissolvi su aperto[fodera]"},

  cerniera: {
    /* in percentuale del quadro: valgono a qualunque misura l'immagine
       venga mostrata */
    origine: {x: 53.354, y: 51.484},     /* transform-origin */
    riquadro: {x: 39.350, y: 47.568, w: 28.684, h: 8.003},
    apertura: -105,                        /* gradi, rotateX */
    offset: {x: 0, y: 0},                    /* fra i due strati: nessuno */
  },

  /* la scatola chiusa dentro il quadro, in %: serve a chi vuole allineare
     una didascalia o posare il pezzo sul cuscinetto */
  riquadro_chiuso:    {x: 15.917, y: 40.921, w: 61.784, h: 53.499},
  riquadro_coperchio: {x: 15.917, y: 40.921, w: 61.784, h: 39.231},

  /* l'oggetto vero, in millimetri: 18 x 12 x 6, spigolo 4 */
  misure: {larghezza: 180, profondita: 120, altezza: 60, raggio: 4},
};

export default COFANETTO;
