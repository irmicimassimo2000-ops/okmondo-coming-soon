/* ═══════════════════════════════════════════════════════════════════
   app/viste/perte-negozio.js — «DAL NEGOZIO», LA VETRINA EDITORIALE.

   F6 (28/09, verdetto di Massimo): la seconda interfaccia di «Per te»
   — banner che Stefano governa, non il motore personale (quello resta
   «Scopri», in `perte.js`). Caricata a richiesta (`import()` dinamico
   da `perte.js`, la stessa via del motore e di `perte-collezioni.js`):
   la radice si apre su «Scopri», questo modulo non deve pesare
   sull'avvio.

   Ancora: tavole-perte-2, `ASSIEME_VETRINA_A` come radice (hero a
   carosello, collezioni, arrivi) più la riga di scadenza di
   `ASSIEME_VETRINA_B` (E12-B) e il confronto promo/personale di
   `ASSIEME_VETRINA_C` (E11-A/E05-B).

   `ctx = {dati, soldi, invia, leggi, vaiAlPezzo, oggi, giornoEMese,
   giorniFra, senzaFoto}`. `dati` è la STESSA `proposte()` legacy di
   `perte.js` (collezioni, arrivi) — non una seconda copia. `senzaFoto`
   è una funzione: chiede al motore nuovo (se è già arrivato) i
   componenti SENZA immagine, gli stessi che «Scopri» non può mostrare
   come carta (`SCOPERTA-MOTORE.md` §0). Le funzioni di disegno
   (`etichettaMotivo`) restano IMPORTATE da `perte.js`, non duplicate:
   è già residente quando questo modulo arriva. */
import { e } from "app/ui/dom.js";
import { segno } from "app/ui/segni.js";
import { spingi } from "app/rotta.js";
import { etichettaMotivo } from "app/viste/perte.js";
import { PROMOZIONI, promoAttive } from "app/dati/promo.js";

/* ── E08-A · L'HERO A CAROSELLO ────────────────────────────────────── */
function apriCollegamento(promo){
  const c = promo && promo.collegamento;
  if(!c) return;
  if(c.tipo === "collezione") spingi("collezioni/" + c.id);
  else if(c.tipo === "articolo") spingi("pezzo/" + c.id);
}

/* IL NOME DELLA COSA A CUI LA PROMO PUNTA — dai dati veri (`d.mie`/
   `d.altre`, la stessa mappa che disegna i riquadri), mai un testo
   fisso: il tasto deve nominare la cosa, come nella tavola («Scopri
   Filo di Luce»), non un generico «di più». */
function nomeCollegamento(promo, mappaCollezioni){
  const c = promo && promo.collegamento;
  if(!c) return null;
  if(c.tipo === "collezione") return (mappaCollezioni.get(c.id) || {}).nome || null;
  return null;
}

function slideHeroDom(promo, ctx, mappaCollezioni){
  const giorni = Math.max(0, Math.round(ctx.giorniFra(ctx.oggi, promo.al)));
  const nomeColl = nomeCollegamento(promo, mappaCollezioni);
  return e("div", {class: "pt-hero-slide", role: "listitem"}, [
    e("div", {class: "pt-hero"}, [
      e("img", {class: "pt-hero-img", src: promo.immagine.src, alt: ""}),
      e("div", {class: "pt-hero-scrim", "aria-hidden": "true"}),
      e("div", {class: "pt-hero-corpo"}, [
        e("span", {class: "pt-hero-badge", testo: "Promozione"}),
        e("span", {class: "pt-hero-titolo", testo: promo.titolo}),
        promo.sottotitolo ? e("span", {class: "pt-hero-sotto", testo: promo.sottotitolo}) : null,
        /* E12-B: la data per esteso resta la fonte, «N giorni» è solo un
           calcolo derivato — mai un timer che vive di vita propria. */
        e("div", {class: "pt-hero-scadenza"}, [
          e("span", {testo: "Fino al " + ctx.giornoEMese(promo.al)}),
          e("span", {class: "giorni", testo: giorni + (giorni === 1 ? " giorno" : " giorni")})
        ]),
        e("button", {type: "button", class: "pt-hero-tasto",
          suClick: () => apriCollegamento(promo)},
          [e("span", {testo: "Scopri" + (nomeColl ? " " + nomeColl : " di più")})])
      ].filter(Boolean))
    ])
  ]);
}

/* CORREZIONE (coordinatore, 28/09, mossa #1) — UN riquadro-hero a
   CAROSELLO (E08-A/`ASSIEME_VETRINA_A`, ancora Apple TV), non banner
   impilati: un solo scorrimento orizzontale con aggancio, i puntini
   sotto — regge da 1 a N promo senza ridisegnare nulla. Con una sola
   promo attiva (il caso di oggi) i puntini non compaiono. */
function carosHeroDom(attive, ctx, mappaCollezioni){
  const scorrevole = e("div", {class: "pt-hero-carosello", role: "list",
    "aria-label": "Promozioni del negozio"},
    attive.map((p) => slideHeroDom(p, ctx, mappaCollezioni)));
  if(attive.length <= 1) return e("div", {}, [scorrevole]);

  const puntini = e("div", {class: "pt-puntini"},
    attive.map((_, i) => e("i", {class: i === 0 ? "qui" : ""})));
  /* i puntini seguono lo scorrimento vero — non un tocco separato: lo
     stesso aggancio (`scroll-snap`) che porta la promo a centro schermo
     aggiorna anche il segno sotto. */
  let ultimo = 0;
  scorrevole.addEventListener("scroll", () => {
    const larghezza = scorrevole.clientWidth || 1;
    const indice = Math.round(scorrevole.scrollLeft / larghezza);
    if(indice === ultimo) return;
    ultimo = indice;
    [...puntini.children].forEach((n, i) => n.classList.toggle("qui", i === indice));
  }, {passive: true});
  return e("div", {}, [scorrevole, puntini]);
}

/* ── E09-A · I RIQUADRI DELLE COLLEZIONI — sempre con un'immagine ──── */
function riquadriDom(collezioni){
  const utili = collezioni
    .map((c) => ({c, foto: (c.posti.find((p) => p.foto) || {}).foto || null}))
    .filter((x) => x.foto)
    .slice(0, 4);
  if(!utili.length) return null;
  return e("section", {class: "pt-sez"}, [
    e("span", {class: "pt-occ", testo: "Le collezioni"}),
    e("div", {class: "pt-riquadri"}, utili.map(({c, foto}) =>
      e("button", {type: "button", class: "pt-riquadro",
        "aria-label": "Apri la collezione " + c.nome,
        suClick: () => spingi("collezioni/" + c.id)}, [
        e("img", {class: "pt-riquadro-img", src: foto, alt: ""}),
        e("div", {class: "pt-riquadro-scrim", "aria-hidden": "true"}),
        e("div", {class: "pt-riquadro-testo"}, [
          e("span", {class: "pt-riquadro-eti", testo: "Collezione"}),
          e("span", {class: "pt-riquadro-tit", testo: c.nome})
        ])
      ])
    ))
  ]);
}

/* ── E10-A · GLI ARRIVI, A SCAFFALE ────────────────────────────────── */
function arriviDom(d, ctx){
  const arrivi = d.arriviTutti || [];
  if(!arrivi.length) return null;
  const conFoto = arrivi.filter((a) => a.foto);
  const senzaFotoN = arrivi.length - conFoto.length;
  /* niente scaffale a riquadro vuoto: se nessun arrivo ha un'immagine,
     il fatto resta detto dalla riga «Arrivi» del profilo/hub — qui
     un rail intero di texture ripeterebbe il difetto già bocciato. */
  if(!conFoto.length) return null;
  const carte = conFoto.slice(0, 6).map((a) => e("button", {
    type: "button", class: "pt-rail-card",
    "aria-label": a.nome + ", " + ctx.soldi(a.prezzo),
    suClick: () => ctx.vaiAlPezzo(a.articolo)
  }, [
    e("img", {class: "pt-rail-img", src: a.foto, alt: ""}),
    e("span", {class: "pt-rail-nome", testo: a.nome}),
    e("span", {class: "pt-rail-prezzo", testo: ctx.soldi(a.prezzo)})
  ]));
  if(senzaFotoN > 0) carte.push(e("div", {class: "pt-rail-coda"}, [
    e("span", {testo: "+" + senzaFotoN + " altri arrivi"}),
    e("br"),
    e("span", {testo: "ancora senza foto"})
  ]));
  return e("section", {class: "pt-sez"}, [
    e("div", {class: "pt-sez-intest"}, [e("b", {testo: "Arrivi di settembre"})]),
    e("div", {class: "pt-rail", role: "list", "aria-label": "Arrivi di settembre"}, carte)
  ]);
}

/* ── E05-B / E11-A · «ANCHE PER TE» ────────────────────────────────── */
function ancheXTeDom(ctx){
  const senza = ctx.senzaFoto() || [];
  /* CORREZIONE (coordinatore, 28/09): si preferisce il primo pezzo che
     porta davvero un'etichetta-motivo LOCKATA (`SCELTE-MASSIMO.md`) —
     una «collezione» non all'ultimo pezzo non ne ha ancora una, e
     mostrarla qui senza etichetta sarebbe una riga muta al posto della
     riga di un fatto verificabile. */
  const personale = senza.find((g) => etichettaMotivo(g, ctx.leggi()).etichetta) || senza[0] || null;
  const promo = promoAttive(PROMOZIONI, ctx.oggi)[0] || null;
  if(!personale && !promo) return null;

  const righe = [];
  if(personale){
    const mot = etichettaMotivo(personale, ctx.leggi());
    righe.push(e("div", {class: "pt-riga-negozio"}, [
      e("div", {class: "pt-riga-negozio-corpo"}, [
        mot.etichetta
          ? e("span", {class: "pt-badge pers"}, [segno("stella", {misura: 11}), e("span", {testo: mot.etichetta})])
          : null,
        e("span", {class: "pt-riga-negozio-nome",
          testo: personale.articolo.nome + " · " + ctx.soldi(personale.articolo.prezzo)}),
        e("span", {class: "pt-riga-negozio-sotto", testo: "Senza foto — si vede al banco"})
      ].filter(Boolean))
    ]));
  }
  if(promo){
    righe.push(e("button", {type: "button", class: "pt-riga-negozio",
      style: "width:100%;border:0;cursor:pointer;text-align:left",
      suClick: () => apriCollegamento(promo)}, [
      e("img", {class: "pt-riga-negozio-foto", src: promo.immagine.src, alt: ""}),
      e("div", {class: "pt-riga-negozio-corpo"}, [
        e("span", {class: "pt-badge promo"}, [e("span", {testo: "Promozione del negozio"})]),
        e("span", {class: "pt-riga-negozio-nome", testo: promo.titolo}),
        e("span", {class: "pt-riga-negozio-sotto", testo: "Fino al " + ctx.giornoEMese(promo.al)})
      ])
    ]));
  }
  return e("section", {class: "pt-sez"}, [
    e("span", {class: "pt-occ", testo: "Anche per te"}),
    ...righe
  ]);
}

/* ═══ IL MONTAGGIO — dentro il contenitore che `perte.js` ha già
   appeso alla pagina («Per te» resta la stessa radice, la stessa
   barra). Nessuna rotta propria: è un CORPO, non uno schermo. ═════ */
export function monta(dove, ctx){
  const d = ctx.dati();
  const attive = promoAttive(PROMOZIONI, ctx.oggi);
  const tutteLeCollezioni = (d.mie || []).concat(d.altre || []);
  const mappaCollezioni = new Map(tutteLeCollezioni.map((c) => [c.id, c]));

  if(attive.length) dove.append(carosHeroDom(attive, ctx, mappaCollezioni));

  const riquadri = riquadriDom(tutteLeCollezioni);
  if(riquadri) dove.append(riquadri);

  const arrivi = arriviDom(d, ctx);
  if(arrivi) dove.append(arrivi);

  const ancheXTe = ancheXTeDom(ctx);
  if(ancheXTe) dove.append(ancheXTe);

  /* NIENTE DA MOSTRARE — non dovrebbe succedere con i dati di prova,
     ma un negozio nuovo, senza promo né collezioni fotografate, non
     deve restare con una pagina muta. */
  if(!attive.length && !riquadri && !arrivi && !ancheXTe){
    dove.append(e("p", {class: "t-body tenue",
      testo: "Il negozio non ha ancora nulla da mostrare qui."}));
  }
}
