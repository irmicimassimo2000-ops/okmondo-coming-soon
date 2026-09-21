/* ═══════════════════════════════════════════════════════════════════
   app/ui/segni.js — I SEGNI A FILO.
   Una famiglia sola, disegnata qui e in nessun altro posto. Le regole
   del sistema (SISTEMA-DESIGN.md, «Segni»):
     · griglia 24, area viva 20 (i tratti stanno fra 2 e 22);
     · tratto 1,7 — 1,5 a 20 px accanto a Inter 400, 2,0 a 28 nei tasti;
       il tratto lo dichiara il CSS (`--tratto`) e `non-scaling-stroke`
       lo tiene in pixel di schermo, così lo stesso disegno a misure
       diverse non ingrassa;
     · giunti arrotondati, terminali PIATTI;
     · mezzo pixel: i membri ortogonali stanno su coordinate .5, così
       un tratto dispari cade dentro il pixel invece che a cavallo.

   ── I PESI OTTICI ──────────────────────────────────────────────────
   Quattro disegni con lo stesso tratto NON pesano uguale: una scatola
   chiusa deposita il doppio dell'inchiostro di una spunta. Ogni segno
   porta perciò la sua SCALA OTTICA `k`, misurata contando i pixel
   d'inchiostro a 48 px (sonda `_A2_segni.mjs`, tratto 3,4 = 1,7 alla
   scala del disegno). La forbice chiesta è +-12% sulla media.
   I NUMERI SONO MISURATI, NON STIMATI: la tabella sta nel rapporto.

   NB: la barra delle sezioni ha i SUOI segni, dentro index.html, ed è
   approvata dal cliente. Quelli non si toccano e non si spostano: qui
   dentro ci sono i segni che servono alle VISTE. Cofanetto, vetrina,
   stella e profilo compaiono in entrambi apposta — la barra li vuole
   anche pieni, le viste li vogliono solo a filo.
   ═══════════════════════════════════════════════════════════════════ */

/* ── LE FORME ─────────────────────────────────────────────────────── */
export const FORME = {
  /* il cofanetto: corpo squadrato, coperchio a cupola bassa, serratura.
     Con la cupola alta sembra una cassetta della posta. */
  cofanetto:
    '<path d="M4.9 12.2v-.6a9.5 9.5 0 0 1 14.2 0v.6"/>' +
    '<path d="M4.9 12.2h14.2v5.4a1.8 1.8 0 0 1-1.8 1.8H6.7a1.8 1.8 0 0 1-1.8-1.8z"/>' +
    '<path d="M12 12.2v2.3"/>',

  /* la vetrina: cassa ad arco col ripiano, CHIUSA in basso. Aperta in
     basso e col ripiano a mezz'altezza si legge una «A». */
  vetrina:
    '<path d="M5.5 19.5v-8a6.5 6.5 0 0 1 13 0v8z"/>' +
    '<path d="M5.5 15.5h13"/>',

  /* la stella a quattro punte: cio' che il negozio sceglie per te */
  stella:
    '<path d="M12 3c.9 6 2.4 7.5 8.4 8.4-6 .9-7.5 2.4-8.4 8.4-.9-6-2.4-7.5-8.4-8.4 6-.9 7.5-2.4 8.4-8.4z"/>',

  /* il busto: tondo della testa e cupola delle spalle */
  profilo:
    '<circle cx="12" cy="8.4" r="3.6"/>' +
    '<path d="M4.9 19.5a7.1 7.1 0 0 1 14.2 0"/>',

  /* il cuore: due lobi e una punta sola. La punta cade sull'asse, e i
     due lobi hanno lo stesso raggio — un cuore storto si vede subito. */
  cuore:
    '<path d="M12 19.4C7.3 16.2 4.6 13.4 4.6 10.3A3.9 3.9 0 0 1 12 8.2a3.9 3.9 0 0 1 7.4 2.1c0 3.1-2.7 5.9-7.4 9.1z"/>',

  /* il regalo: scatola, fascia, fiocco. La fascia è un membro solo che
     attraversa tutto: due mezze fasce non si allineano mai. */
  regalo:
    '<path d="M4.8 9.6h14.4v9.1a1.3 1.3 0 0 1-1.3 1.3H6.1a1.3 1.3 0 0 1-1.3-1.3z"/>' +
    '<path d="M12 9.6v10.4"/>' +
    '<path d="M12 9.6C9.4 6.6 7 5.6 6.3 7.1c-.6 1.3.9 2.2 5.7 2.5z"/>' +
    '<path d="M12 9.6c2.6-3 5-4 5.7-2.5.6 1.3-.9 2.2-5.7 2.5z"/>',

  /* la collezione: quattro anelli, due e due. Non è una griglia di
     pallini — sono anelli, e un anello è il pezzo che Regina vende. */
  collezione:
    '<circle cx="8.6" cy="8.6" r="3"/>' +
    '<circle cx="15.4" cy="8.6" r="3"/>' +
    '<circle cx="8.6" cy="15.4" r="3"/>' +
    '<circle cx="15.4" cy="15.4" r="3"/>',

  /* l'assistenza: la lente del gioielliere, col manico dritto e la
     base. Diversa dalla lente della RICERCA, che ha il manico in
     diagonale: due lenti uguali per due mestieri diversi sono un
     errore, non un'economia. */
  assistenza:
    '<circle cx="11.5" cy="9.2" r="5.4"/>' +
    '<path d="M11.5 14.6v4.9"/>' +
    '<path d="M8.9 19.5h5.2"/>',

  /* condividi: il quadrato e la freccia che esce */
  condividi:
    '<path d="M12 15V4.2"/>' +
    '<path d="M8.2 8 12 4.2 15.8 8"/>' +
    '<path d="M7.8 10.5H5.5v8a1.5 1.5 0 0 0 1.5 1.5h10a1.5 1.5 0 0 0 1.5-1.5v-8h-2.3"/>',

  /* rimuovi: il cestino */
  rimuovi:
    '<path d="M4.5 7.2h15"/>' +
    '<path d="M9.4 7.2V5.1a1.1 1.1 0 0 1 1.1-1.1h3a1.1 1.1 0 0 1 1.1 1.1v2.1"/>' +
    '<path d="M6.6 7.2l.9 11.1a1.4 1.4 0 0 0 1.4 1.3h6.2a1.4 1.4 0 0 0 1.4-1.3l.9-11.1"/>',

  /* il chevron: il verso della pila */
  chevron: '<path d="M9.3 4.8 16.5 12l-7.2 7.2"/>',

  /* la croce: chiudere */
  croce: '<path d="M6 6l12 12"/><path d="M18 6L6 18"/>',

  /* cerca: la lente col manico in diagonale */
  cerca:
    '<circle cx="10.6" cy="10.6" r="6.1"/>' +
    '<path d="M14.9 14.9 19.8 19.8"/>',

  /* il filtro: l'imbuto. Tre righe con le manopole sono un pannello di
     impostazioni, non un filtro. */
  filtro:
    '<path d="M3.5 5.5h17l-6.6 7.9v5.4l-3.8 2.2v-7.6z"/>',

  /* il calendario: le due date del cliente vivono qui */
  calendario:
    '<path d="M5 6.9h14v11.7a1.3 1.3 0 0 1-1.3 1.3H6.3A1.3 1.3 0 0 1 5 18.6z"/>' +
    '<path d="M5 10.6h14"/>' +
    '<path d="M8.6 4.6v3.6"/><path d="M15.4 4.6v3.6"/>',

  /* la tessera: la banda e il taglio del chip */
  tessera:
    '<path d="M5.1 7h13.8a1.3 1.3 0 0 1 1.3 1.3v7.4a1.3 1.3 0 0 1-1.3 1.3H5.1a1.3 1.3 0 0 1-1.3-1.3V8.3A1.3 1.3 0 0 1 5.1 7z"/>' +
    '<path d="M3.8 10.6h16.4"/>' +
    '<path d="M6.6 14h4"/>',

  /* il credito: la moneta con la E incisa */
  credito:
    '<circle cx="12" cy="12" r="7.3"/>' +
    '<path d="M14.9 9.4a3.8 3.8 0 1 0 0 5.2"/>' +
    '<path d="M8.2 11.2h4.4"/><path d="M8.2 12.9h4.4"/>',

  /* la campanella: gli avvisi */
  campanella:
    '<path d="M12 4.1a5.6 5.6 0 0 1 5.6 5.6c0 4.4 1.6 5.8 1.6 5.8H4.8s1.6-1.4 1.6-5.8A5.6 5.6 0 0 1 12 4.1z"/>' +
    '<path d="M10 17.9a2 2 0 0 0 4 0"/>',

  /* la spunta: fatto */
  spunta: '<path d="M4.8 12.4 9.7 17.3 19.2 6.6"/>',

  /* ── I SEGNI DEL NEGOZIO (21/09, vetrina «Boutique») ───────────────
     Stessa griglia 24, area viva 20, stesso tratto dal CSS. Sono i
     disegni delle tavole scelte (`ventaglio-vetrina/_costruisci.py`),
     portati qui perché un segno vive in un posto solo. */
  /* la borsa: il sacchetto a trapezio coi manici ad arco */
  borsa:
    '<path d="M5.5 8.5h13l.9 11H4.6z"/>' +
    '<path d="M8.8 8.5V7a3.2 3.2 0 0 1 6.4 0v1.5"/>',
  /* il più e il meno dello stepper: punteggiatura, come la croce */
  piu: '<path d="M12 5.5v13"/><path d="M5.5 12h13"/>',
  meno: '<path d="M5.5 12h13"/>',
  /* l'avviso: il tondo con la «i». Sta accanto a una riga d'errore */
  avviso:
    '<circle cx="12" cy="12" r="8.5"/>' +
    '<path d="M12 11v5"/><path d="M12 7.6v.9"/>',
  /* il negozio: la tenda, il muro, la porta. Sta nella riga del ritiro */
  negozio:
    '<path d="M4.5 9.5l1.2-4h12.6l1.2 4"/>' +
    '<path d="M4.5 9.5h15v10h-15z"/>' +
    '<path d="M9.5 19.5v-5h5v5"/>',
};

/* ── LE SCALE OTTICHE ──────────────────────────────────────────────
   MISURATE, non decise: vedi l'intestazione. Chi aggiunge un segno
   lascia 1 qui, rilancia `_A2_segni.mjs` e ci scrive il numero che
   esce. Un `k` inventato è peggio di nessun `k`. */
export const K = {
  cofanetto:0.973,
  vetrina:0.934,
  stella:1.188,
  profilo:1.28,
  cuore:1.246,
  regalo:0.82,
  collezione:0.834,
  assistenza:1.28,
  condividi:1.037,
  rimuovi:1.02,
  chevron:1.245,
  croce:0.82,
  cerca:1.262,
  filtro:1.047,
  calendario:0.821,
  tessera:0.822,
  credito:0.82,
  campanella:1.125,
  spunta:1.19,
  /* i cinque del negozio: 1 finché `_A2_segni.mjs` non li misura. Un `k`
     inventato è peggio di nessun `k` (vedi sopra). */
  borsa:1, piu:1, meno:1, avviso:1, negozio:1,
};

/* ── LE DUE CLASSI DI PESO ─────────────────────────────────────────
   L'inchiostro si pareggia DENTRO una classe, non fra classi diverse,
   e la ragione è geometrica, non pigrizia: un chevron è un tratto
   solo lungo 20 unita', un calendario ne ha 72. Per portarli allo
   stesso inchiostro il chevron dovrebbe crescere di due volte e mezzo,
   cioè diventare una freccia grassa in mezzo a una riga di testo.
   Quindi:
     · OGGETTI — i pittogrammi chiusi, quelli che stanno da soli in una
       cella, in uno stato vuoto o in un tasto. Si guardano insieme, e
       insieme devono pesare uguale.
     · GLIFI — chevron, croce, spunta. Non sono immagini di qualcosa:
       sono segni di punteggiatura dell'interfaccia, vivono accanto al
       testo a 20 px e si pareggiano fra loro.
   Misurato a 48 px col tratto alla scala del disegno (3,4). */
export const CLASSI = {
  oggetti: ["cofanetto","vetrina","stella","profilo","cuore","regalo",
            "collezione","assistenza","condividi","rimuovi","cerca",
            "filtro","calendario","tessera","credito","campanella",
            "borsa","avviso","negozio"],
  glifi:   ["chevron","croce","spunta","piu","meno"],
};

export const NOMI = Object.keys(FORME);

/* ── IL SEGNO, IN MARCATURA ────────────────────────────────────────
   `misura` sceglie la classe (20 / 24 / 28 / 56) e con essa il tratto:
   il disegno non cambia mai, cambia la penna. `aria-hidden` sempre: un
   segno non è un testo, e chi ascolta ha già l'etichetta accanto. */
export function segnoHTML(id, opz = {}){
  const forma = FORME[id];
  if(!forma) return "";
  const k = opz.k ?? K[id] ?? 1;
  const classe = "segno-filo" +
    (opz.misura && opz.misura !== 24 ? " m" + opz.misura : "") +
    (opz.classe ? " " + opz.classe : "");
  const g = k === 1 ? forma
    : '<g transform="translate(12 12) scale(' + k.toFixed(4).replace(/0+$/,"").replace(/\.$/,"") +
      ') translate(-12 -12)">' + forma + '</g>';
  return '<svg class="' + classe + '" viewBox="0 0 24 24" aria-hidden="true" ' +
         'fill="none" stroke="currentColor">' + g + '</svg>';
}

/* ── IL SEGNO, COME NODO ───────────────────────────────────────────
   Passa da un <template>: `innerHTML` su un contenitore HTML non
   costruisce elementi SVG nel giusto spazio dei nomi in tutti i
   browser, e un <path> nello spazio sbagliato non disegna niente. */
export function segno(id, opz = {}){
  const t = document.createElement("template");
  t.innerHTML = segnoHTML(id, opz);
  return t.content.firstElementChild;
}
