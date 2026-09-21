/* ═══════════════════════════════════════════════════════════════════
   app/viste/perte-collezioni.js — L'HUB, LA COLLEZIONE, LA CHIUSURA,
   GLI ARRIVI, IL MESE.

   Spostato fuori da `perte.js` il 21/09/2026 (verdetto del coordinatore:
   bilancio JS a 607.679 B contro il tetto di 600.000). Nessuna delle
   cinque schermate di qui dentro disegna la radice «Per te» — ci si
   arriva solo spingendo un indirizzo (`collezioni/<id>`, `collezione/
   <id>`, `chiusura/<id>`, `arrivi/tutti`, `mese/questo`) — quindi
   nessuna delle cinque deve pesare sull'avvio della tab. Stessa via del
   motore delle proposte (`caricaMotore()` in `perte.js`) e della
   Vetrina (`vetrina.js` → `vetrina-corpo.js`): `import()` dinamico, una
   sola volta, dietro una promessa che si memorizza — la richiama chi ha
   già gli indirizzi registrati.

   F6 (21/09, verdetto di Massimo, «la radice è tornata piena»): le due
   schermate P4 «Arrivi» e P5 «Per te questo mese» sono nuove qui — non
   in radice, che ora porta solo la RIGA che apre ciascuna. Niente di
   quello che prima viveva sotto il titolo è sparito: si è solo spostato
   dietro una porta, con lo stesso componente che lo disegnava prima
   (`cardArrivo`, `cardP4`, importati da `perte.js`, non duplicati).

   `ctx = {store, dati}`. `dati` è la STESSA funzione pura di `perte.js`
   (chiusa sulla `OGGI` vera e sullo store): non una seconda copia, la
   stessa, passata per riferimento. `store` porta `leggi`/`invia`, che
   qui servono per «Ricordamelo» (collezione e arrivi) e per costruire
   `cardArrivo` (che vuole `{store, oggi, vaiAlPezzo}`).

   Le funzioni di disegno (`figura`, `pallini`, `cardProposta`, `cardP4`,
   `cardArrivo`) e le utilità pure (date, `leggiPromemoria`/
   `segnaPromemoria`) restano IMPORTATE da `perte.js`, non duplicate:
   `perte.js` è già residente quando questo modulo arriva (è lui che lo
   carica), quindi importarne gli export non scarica un byte in più.
   ═══════════════════════════════════════════════════════════════════ */
import { e, annuncia } from "app/ui/dom.js";
import { segno } from "app/ui/segni.js";
import { tasto, vestiTasto } from "app/ui/tasto.js";
import { cella, lista } from "app/ui/cella.js";
import { schermo } from "app/ui/barra-nav.js";
import { toast } from "app/ui/toast.js";
import { spingi, torna, vaiA, tabCorrente } from "app/rotta.js";
import { RIDOTTO, lineare } from "app/moto.js";
import {
  figura, pallini, cardProposta, cardP4, cardArrivo, rigaStato, numero,
  dataCorta, giornoEMese, isoMeno, isoPiu, giorniFra, soloGiorno,
  leggiPromemoria, segnaPromemoria
} from "app/viste/perte.js";

const vaiAlPezzo = (id) => spingi("pezzo/" + id);

/* LA FILA — cinque posti da 61 con passo 14 (5 × 61 + 4 × 14 = 361).
   Il posto vuoto NON è una card grigia col punto interrogativo: è una
   SILHOUETTE a tono `--incavo` col nome sotto in Inter 11, cioè un
   posto che aspetta. È il gradiente di scopo di Kivetz, detto senza
   urlare. */
function fila(c, opz = {}){
  const posti = c.posti.map((p, i) => e("div", {
    class: "posto" + (p.ha ? " ha" : " manca"), "data-f5-posto": String(i)
  }, [
    p.ha ? figura(p, "posto-foto") : e("i", {class: "posto-vuoto", "aria-hidden": "true"}),
    e("span", {class: "t-cap2 posto-nome", testo: p.nome})
  ]));
  return e("div", {
    class: "fila" + (opz.classe ? " " + opz.classe : ""), role: "img",
    "aria-label": c.nome + ", " + c.ha + " di " + c.totale +
      (c.manca ? ", ti manca " + c.mancanti.map((m) => m.nome).join(", ") : ", completa")
  }, posti);
}

/* ══ P1 · L'HUB DELLE COLLEZIONI ═══════════════════════════════ */
export function schermoHub(dove, ctx){
  const d = ctx.dati();
  const pagina = schermo(dove, {titolo: "Collezioni", indietro: torna,
    etichettaIndietro: "Torna a Per te"});
  for(const c of d.mie) pagina.append(sezioneCollezione(c));
  /* LE ALTRE non prendono una fila: «mai una barra a zero». Si dicono
     per nome, perché esistono, e ci si entra comprandone uno.
     La regola cifre (INDICE.md, PT-51/52 «Le altre, in negozio»): il
     conteggio dei pezzi di una collezione non posseduta è in cifre,
     come ogni altro conteggio della sezione. */
  if(d.altre.length) pagina.append(lista("Le altre, in negozio", d.altre.map((c) => cella({
    titolo: c.nome, sotto: c.totale + " pezzi · " + (c.stagione || "in negozio"),
    etichetta: c.nome + ", " + c.totale + " pezzi",
    suClick: () => spingi("collezioni/" + c.id)
  }))));
  annuncia("Collezioni · " + d.mie.length + (d.mie.length === 1 ? " tua" : " tue"));
}

/* UNA RIGA DI STATO E UNA AZIONE, per collezione. Sull'hub non
   entrano né la frase della promo né «Dove: in vetrina da …»: sono
   il DETTAGLIO della collezione e vivono nella sua pagina, dove c'è
   spazio per leggerli. L'hub è un indice — nome, fila, dove sei, la
   porta — e un indice che spiega non è più un indice. */
function sezioneCollezione(c){
  const parti = [
    e("h2", {class: "t-2 coll-titolo", testo: c.nome}),
    c.racconto ? e("p", {class: "t-sub tenue coll-racconto", testo: c.racconto}) : null,
    fila(c),
    e("p", {class: "t-foot coll-conto", testo: c.chiusa && c.a
      ? rigaStato(c) + " · dal " + dataCorta(c.a)
      : rigaStato(c)})
  ].filter(Boolean);
  parti.push(e("button", {type: "button", class: "coll-apri",
    "aria-label": "Apri la collezione " + c.nome,
    suClick: () => spingi("collezioni/" + c.id)},
    [e("span", {class: "t-foot", testo: "Apri " + c.nome}),
     segno("chevron", {misura: 14})]));
  return e("section", {class: "coll-sez", "data-coll": c.id}, parti);
}

/* ══ P2 · UNA COLLEZIONE ═══════════════════════════════════════ */
export function schermoCollezione(id, dove, ctx){
  const d = ctx.dati();
  const c = d.collezioni.find((x) => x.id === id);
  /* L'OCCHIELLO «COLLEZIONE» È VIA. `schermo()` lo mette in fondo a
     una `.testa-pagina` allineata al piede dei riquadri, non alle
     BASELINE: accanto a un Bodoni 34 il maiuscoletto da 13 galleggiava
     15 px sopra la riga del titolo, e una parola appesa in aria a
     destra di un nome proprio non è un occhiello, è un refuso.
     Allinearlo avrebbe voluto dire misurare l'ascendente di due
     caratteri diversi dentro `app/ui/barra-nav.js`, che è di un altro
     esecutore. E non manca a nessuno: il titolo È il nome di una
     collezione, ci si arriva da una schermata che si chiama
     «Collezioni», e la parola era l'etichetta di una cosa già detta. */
  const pagina = schermo(dove, {titolo: c ? c.nome : "Collezione",
    indietro: torna, etichettaIndietro: "Torna indietro"});
  if(!c){
    pagina.append(e("p", {class: "t-body tenue", testo: "Questa collezione non c’è più."}));
    return;
  }
  if(c.racconto) pagina.append(e("p", {class: "t-sub tenue coll-racconto", testo: c.racconto}));
  pagina.append(fila(c, {classe: "fila-grande"}));
  /* UNA riga di stato, come sull'hub. Qui sotto può stare la frase
     della promo, che a uno dalla chiusura è un fatto commerciale
     vero («quello che resta è tuo al 20% fino al 30 settembre») e non
     una promessa a chi è lontano: da due mancanti in su `frasePromo`
     non la restituisce più. */
  pagina.append(e("p", {class: "t-foot coll-conto", testo: rigaStato(c)}));
  if(c.frase) pagina.append(e("p", {class: "t-foot tenue coll-frase", testo: c.frase}));

  /* IL PEZZO CHE CHIUDE — la stessa scheda di P0 (E13-C, verdetto di
     Massimo 21/09): «nessun riquadro» vuol dire nessuna area foto
     quando la foto manca (Pendente Filo non ne ha) — la fila di
     cinque qui sopra mostra già il posto vuoto, e `cardProposta` non
     disegna un riquadro che non serve. Il testo resta: l'etichetta è
     la stessa regola «chiude_collezione» vista da questa pagina. */
  const m = c.mancanti[0];
  if(m){
    pagina.append(e("h2", {class: "t-2 sotto-testa", testo: "Il pezzo che chiude"}));
    const lungaColl = "L’ULTIMO DI " + c.nome.toUpperCase();
    pagina.append(cardProposta({
      nome: m.nome, foto: m.foto,
      etichetta: lungaColl.length <= 26 ? lungaColl : "L’ULTIMO DELLA COLLEZIONE",
      sotto: c.chiude ? "Con questo ricevi " + c.chiude.nome : "Con questo la chiudi",
      nota: c.chiude ? c.chiude.nota : null
    }, () => vaiAlPezzo(m.articolo)));
    if(c.arrivo) pagina.append(e("p", {class: "t-foot coll-dove", testo: c.arrivo.testo}));
  }

  /* I TUOI PEZZI DI … — righe con la data in cui sono diventati suoi */
  const s = ctx.store.leggi();
  const quando = new Map((s.esemplari || []).filter((x) => !x.rimosso && x.data_vendita)
    .map((x) => [x.articolo, x.data_vendita]));
  const suoi = c.posti.filter((p) => p.ha);
  if(suoi.length){
    /* CORREZIONE (coordinatore, 21/09): l'occhiello di questo gruppo
       seguiva subito «Il pezzo che chiude» (o la fila, se manca),
       senza l'aria che separa due gruppi di lista — misura 1 della
       Vetrina, copiata: 30 pt sopra, come `.f6-occhiello-livello`
       (profilo.css) e non lo 0 di default (`.lista-testa`,
       sistema.css, pensato per il PRIMO gruppo di una pagina). */
    const seiPezzi = lista("I tuoi pezzi di " + c.nome, suoi.map((p) => cella({
      id: p.articolo, foto: p.foto, titolo: p.nome,
      sotto: quando.has(p.articolo) ? "Tuo dal " + dataCorta(quando.get(p.articolo)) : "Tuo",
      etichetta: p.nome + ", tuo",
      suClick: () => vaiAlPezzo(p.articolo)
    })));
    seiPezzi.classList.add("coll-lista-pezzi");
    pagina.append(seiPezzi);
  }

  /* «RICORDAMELO PER GIOVEDÌ» — azione testuale, una notifica sola.
     Niente permesso push qui: si chiede DOPO il primo momento di
     valore, mai dentro una schermata di contenuto. */
  if(c.arrivo){
    const idPr = "coll-" + c.id;
    const avviso = giorniFra(d.oggi, c.arrivo.data) >= 1
      ? isoMeno(c.arrivo.data, 1) : isoPiu(d.oggi, 1);
    const fatto = () => leggiPromemoria(ctx.store.leggi()).some((x) => x.id === idPr);
    const eti = () => fatto()
      ? "Te lo ricordiamo " + soloGiorno(avviso) + " alle 9"
      : "Ricordamelo per " + soloGiorno(c.arrivo.data);
    const t = tasto(eti(), {tipo: "terziario", etichetta: eti(), suClick: () => {
      if(fatto()) return;
      segnaPromemoria(ctx.store, {id: idPr, articolo: c.arrivo.articolo,
        quando: avviso, creato: d.oggi});
      vestiTasto(t, eti());
      t.setAttribute("aria-label", eti());
      t.setAttribute("aria-pressed", "true");
      t.dataset.segnato = "1";
      toast("Te lo ricordiamo " + soloGiorno(avviso) + " alle 9.");
    }});
    if(fatto()){ t.setAttribute("aria-pressed", "true"); t.dataset.segnato = "1"; }
    pagina.append(e("div", {class: "riga-azione"}, [t]));
  }
  annuncia(c.nome + ", " + c.ha + " di " + c.totale);
}

/* ══ P3 · LA CHIUSURA ══════════════════════════════════════════
   Schermata piena, grado GRANDE. La scena È la pagina: non finisce
   in un modale, non si condivide, non suona. Un oggetto al centro su
   fondo pieno (Apple Fitness), e sotto — già visibile — la
   collezione successiva col suo primo timbro, che è la sola difesa
   contro il vuoto post-premio misurato da Kivetz 2006.
   I tempi sono quelli scritti: stagger 120, molla 400 con smorzamento
   0,8, premio a +1,0 s, fine a 1,5 s. Movimento ridotto: una
   dissolvenza di 200 e basta (il tetto del ridotto è 150-200). */
export function schermoChiusura(id, dove, ctx){
  const d = ctx.dati();
  const c = d.collezioni.find((x) => x.id === id) || d.mie[0];
  if(!c){ schermo(dove, {titolo: "Chiusura", indietro: torna}); return; }

  document.body.dataset.pieno = "1";
  dove.classList.add("schermo-pieno");
  const pagina = e("div", {class: "chiusura"});
  dove.append(pagina);

  /* nella scena la collezione È chiusa: l'ultimo posto si è appena
     riempito, ed è il posto che si posa per ultimo. */
  const finta = {...c, posti: c.posti.map((p) => ({...p, ha: true})),
    ha: c.totale, manca: 0, mancanti: []};
  const laFila = fila(finta, {classe: "fila-chiusura"});
  pagina.append(laFila);

  const titolo = e("h1", {class: "t-large chiusura-titolo", tabindex: "-1",
    testo: c.nome + ", completa."});
  const sotto = e("p", {class: "t-sub tenue chiusura-sotto", testo:
    numero(c.totale) + " pezzi" +
    (c.da && c.a ? ", dal " + giornoEMese(c.da) + " al " + dataCorta(c.a) : "")});
  pagina.append(titolo, sotto);

  /* IL PREMIO ENTRA, e porta il marchio: la reciprocita' funziona
     quando ha un mittente (Strohmetz 2002). «da Regina», non «hai
     guadagnato». */
  /* «IL FILO» È IL NOME DI UN PEZZO, e i nomi dei pezzi in questa app
     si scrivono in Bodoni: 22, come il nome sotto la card grande e
     come il titolo di una collezione. In Inter 17 — il corpo di una
     riga di lista — il premio della chiusura si leggeva come
     un'etichetta di stato, e la scena di grado GRANDE finiva con la
     tipografia di una ricevuta. */
  /* CORREZIONE (verdetto di Massimo, 21/09): «Regina» in corsivo
     turchese era il marchio RIDOTTO A TESTO — vietato (canone Tier-0
     §1: marchio completo o niente). Il mittente ora è il marchio VERO,
     lo stesso file che carica `app/ui/tessera.js` (`marchio.png`, alla
     radice del pacco — l'`<img>` lo risolve contro il documento, non
     contro questo modulo: funziona da qualunque vista lo scriva). Mai
     ricomposto a testo. */
  const premio = e("div", {class: "lista premio", "data-f5-premio": "1"}, [
    e("div", {class: "cella due piatta"}, [
      e("div", {class: "testo"}, [
        e("b", {class: "t-2 premio-nome",
          testo: c.chiude ? c.chiude.nome : "Il pezzo che chiude"}),
        e("span", {testo: c.chiude && c.chiude.nota
          ? c.chiude.nota : "Ti aspetta in negozio."})]),
      e("img", {class: "premio-marchio", src: "marchio.png", alt: "Regina",
        decoding: "async"})])]);
  pagina.append(premio);

  /* LA PROSSIMA, già col primo timbro. Se non esiste una collezione
     successiva in cui la cliente ha già un pezzo, la riga NON si
     inventa: una prossima a zero è esattamente la barra vuota che la
     carta psicologica vieta. */
  const prossima = d.mie.find((x) => x.id !== c.id && x.ha > 0 && !x.chiusa) || null;
  const coda = e("div", {class: "chiusura-coda", "data-f5-coda": "1"}, [
    prossima ? e("button", {type: "button", class: "cella due prossima",
      "aria-label": "Prossima collezione: " + prossima.nome + ", " + prossima.ha +
        " di " + prossima.totale,
      suClick: () => { torna(); setTimeout(() => spingi("collezioni/" + prossima.id), 380); }
    }, [
      e("div", {class: "testo"}, [
        e("b", {testo: "Prossima: " + prossima.nome}),
        e("span", {class: "cifra", testo: prossima.ha + " di " + prossima.totale})]),
      pallini(prossima)]) : null,
    tasto("Torna al cofanetto", {tipo: "primario", largo: true, suClick: () => {
      torna();
      setTimeout(() => { if(tabCorrente() !== "cofanetto") vaiA("cofanetto"); }, 380);
    }})
  ].filter(Boolean));
  pagina.append(coda);

  /* ── LA REGIA ─────────────────────────────────────────────────
     Le animazioni partono quando lo strato È ATTACCATO e la spinta
     si è posata: un elemento staccato dal documento non anima, e una
     scena che parte sotto il velo della spinta è una scena che
     nessuno vede. `tempi` è MISURATO a ogni fotogramma — non
     dichiarato — e resta leggibile da fuori per la sonda. */
  const tempi = {t0: 0, posti: [], premio: null, coda: null, fine: null,
    ridotto: RIDOTTO.matches};
  window.__perte = window.__perte || {};
  window.__perte.tempi = tempi;

  const molla = lineare({zeta: 0.8});
  const nodi = [...laFila.querySelectorAll("[data-f5-posto]")];

  function avvia(){
    const anim = [];
    const t0 = performance.now();
    tempi.t0 = t0;

    if(RIDOTTO.matches){
      /* 200, non 250: il tetto del ridotto (SISTEMA-DESIGN regola 4). */
      anim.push(pagina.animate([{opacity: 0}, {opacity: 1}],
        {duration: 200, easing: "linear", fill: "backwards"}));
    } else {
      nodi.forEach((n, i) => anim.push(n.animate(
        [{opacity: 0, transform: "translateY(10px) scale(.92)"},
         {opacity: 1, transform: "none"}],
        {duration: 400, delay: i * 120, easing: molla.curva, fill: "backwards"})));
      for(const n of [titolo, sotto]) anim.push(n.animate(
        [{opacity: 0}, {opacity: 1}],
        {duration: 250, delay: 520, easing: "linear", fill: "backwards"}));
      anim.push(premio.animate(
        [{opacity: 0, transform: "translateY(8px)"}, {opacity: 1, transform: "none"}],
        {duration: 250, delay: 1000, easing: "linear", fill: "backwards"}));
      /* la coda entra per ultima e la scena CHIUDE a 1.480: il tetto
         dichiarato è 1,5 s, e un tetto raggiunto al millesimo è un
         tetto sfondato al primo fotogramma perso. */
      anim.push(coda.animate([{opacity: 0}, {opacity: 1}],
        {duration: 250, delay: 1230, easing: "linear", fill: "backwards"}));
    }

    /* IL CAMPIONAMENTO, a ogni fotogramma. Si guarda l'opacita' VERA
       calcolata dal browser, non il piano: è l'unico modo di sapere
       se la scena è andata come è scritta. */
    const guarda = [...nodi.map((n, i) => ["posto" + i, n]),
                    ["premio", premio], ["coda", coda]];
    (function giro(){
      const t = performance.now() - t0;
      let restano = false;
      for(const [k, n] of guarda){
        if(tempi[k] != null) continue;
        const o = parseFloat(getComputedStyle(n).opacity);
        if(o > 0.02) tempi[k] = Math.round(t); else restano = true;
      }
      tempi.posti = nodi.map((_, i) => (tempi["posto" + i] == null ? null : tempi["posto" + i]));
      if(restano && t < 4000) requestAnimationFrame(giro);
    })();

    Promise.all(anim.map((a) => a.finished.catch(() => {}))).then(() => {
      tempi.fine = Math.round(performance.now() - t0);
      try{ titolo.focus({preventScroll: true}); }catch(_){ /* niente */ }
    });
    annuncia(c.nome + ", completa.");
  }

  (function attendi(){
    if(dove.isConnected){ setTimeout(avvia, RIDOTTO.matches ? 20 : 380); return; }
    requestAnimationFrame(attendi);
  })();
}

/* ══ P4 · ARRIVI ═════════════════════════════════════════════════
   F6 (21/09, verdetto di Massimo): la porta dietro la riga «Arrivi» del
   gruppo di lista in radice. L'elenco intero (`d.arriviTutti`, non più
   tagliato a due), la stessa `cardArrivo` che prima viveva sotto il
   titolo — foto o testo, «Ricordamelo» compreso — nessuna seconda
   versione della card. */
export function schermoArrivi(dove, ctx){
  const d = ctx.dati();
  const pagina = schermo(dove, {titolo: "Arrivi", indietro: torna,
    etichettaIndietro: "Torna a Per te"});
  const elenco = d.arriviTutti || [];
  if(!elenco.length){
    pagina.append(e("p", {class: "t-body tenue", testo:
      "Non c’è nessun arrivo da mostrarti, per ora."}));
    return;
  }
  for(const a of elenco) pagina.append(cardArrivo(a, {store: ctx.store, oggi: d.oggi, vaiAlPezzo}));
  annuncia("Arrivi · " + elenco.length);
}

/* ══ P5 · PER TE QUESTO MESE ═══════════════════════════════════════
   F6 (21/09, verdetto di Massimo): la porta dietro la riga omonima.
   Compleanno e promo sono le due sole forme di «promozione attiva
   questo mese» che il motore conosce (`app/viste/perte.js`, «LE CARD
   P4»): qui ci sono entrambe, quando ci sono entrambe — non solo la più
   vicina a scadere, che in radice vinceva la riga ma non deve nascondere
   l'altra una volta aperta la pagina. Stessa `cardP4` di sempre. */
export function schermoMese(dove, ctx){
  const d = ctx.dati();
  const pagina = schermo(dove, {titolo: "Per te questo mese", indietro: torna,
    etichettaIndietro: "Torna a Per te"});
  let n = 0;
  if(d.compleanno){ pagina.append(cardP4(d.compleanno)); n++; }
  if(d.promo){ pagina.append(cardP4(d.promo)); n++; }
  if(!n) pagina.append(e("p", {class: "t-body tenue", testo:
    "Non c’è nessuna promozione attiva, per ora."}));
  annuncia("Per te questo mese" + (n ? "" : ", nessuna promozione attiva"));
}
