/* ═══════════════════════════════════════════════════════════════════
   app/viste/cofanetto.js — F2.4 · LA VISTA ELENCO DEL COFANETTO.

   Da dove viene. `cofanetto.html` (12/09) era una pagina statica: una
   griglia 3x2 «3 di 6 · Filo di Luce» con tre pieni e tre fossette
   incise, più un blocco «In arrivo» con la riga «restano tuoi 14
   minuti». Bella e morta: i tre pieni erano tre <img> scritte a mano,
   il «3 di 6» era un testo, e i 14 minuti erano un contatore senza
   orologio. Qui dentro quella pagina diventa una VISTA: gli stessi tre
   blocchi, letti dallo store, che si ridisegnano quando lo store
   cambia.

   Dove sta, e perché non è una schermata. Il tab Cofanetto è la
   stanza in tre dimensioni, e la stanza occupa lo schermo: non ci sta
   anche un elenco. L'elenco perciò è un FOGLIO che sale sopra la
   stanza, e la stanza resta dietro — è l'unico impianto in cui «cosa
   possiedo» e «guarda cosa possiedo» non si escludono a vicenda. Lo si
   chiama con UNA capsula di vetro in alto a destra, sotto la fascia del
   marchio: la sola cosa che la scocca mette sopra la cornice del banco.

   Perché la capsula sta SOTTO la fascia e non dentro. Nel banco `#alto`
   è una barra `position:fixed` larga tutto lo schermo che porta
   «indietro» a sinistra e il marchio al centro, col velo di carta che
   li tiene leggibili. Una capsula messa dentro quella fascia ne
   coprirebbe il rettangolo per forza (è larga quanto lo schermo) e
   rischierebbe il marchio al primo schermo strano. Si posa perciò
   SOTTO la fascia, e i rettangoli restano disgiunti — misurato, non
   sperato: sonda `_F24_elenco.mjs`, prova «capsula».

   La rotta. `#/cofanetto/elenco` è una voce di cronologia vera
   (`pushState`), non uno stato interno: il tasto indietro del telefono
   e il gesto dal bordo devono chiudere il foglio, e l'unico modo perché
   lo facciano è che aprirlo abbia lasciato un passo indietro da fare.
   Il foglio e la cronologia si tengono allineati in un posto solo (vedi
   `apri`/`chiuso`/`popstate` in fondo): chi chiude il foglio torna
   indietro, chi torna indietro chiude il foglio, e nessuno dei due
   richiama l'altro due volte.
   NB: `app/rotta.js` legge l'indirizzo a COPPIE (`tipo/id`), quindi
   `#/cofanetto/elenco` — un segmento solo — non entra nella sua pila e
   non le da' fastidio. È voluto: il foglio non è uno strato spinto,
   non entra da destra, non ha una barra di navigazione sua.

   Il registro. Chrono24 e Aura: UN solo spazio e tre stati detti a
   parole, non tre schede. Carta psicologica: il cofanetto non nasce mai
   vuoto, il pezzo che manca è un POSTO vuoto disegnato — mai una card
   grigia con un punto di domanda — e la dotazione si chiama «i tuoi»,
   non «acquisti».
   ═══════════════════════════════════════════════════════════════════ */

import { e, annuncia } from "app/ui/dom.js";
import { segno } from "app/ui/segni.js";
import { tasto } from "app/ui/tasto.js";
import { cella, lista } from "app/ui/cella.js";
import { apriFoglio, chiudiFoglio } from "app/ui/foglio.js";
import { schermo } from "app/ui/barra-nav.js";
import { misura, flip, RIDOTTO } from "app/moto.js";
import { spingi, registraSchermo, torna, vaiA, tabCorrente } from "app/rotta.js";
import { diAlBanco, quandoIlBancoDice } from "app/canale3d.js";

const ROTTA = "#/cofanetto/elenco";

/* L'ORDINE DELLE FAMIGLIE È DICHIARATO, non dedotto dai dati. Dedotto,
   cambierebbe da sola la prima voce del filtro il giorno che Lucia
   compra un orologio prima di una collana — e un filtro che si
   riordina sotto il dito è un filtro che non si impara. */
const FAMIGLIE = ["Collane", "Orecchini", "Anelli", "Bracciali", "Orologi"];

/* i campi in cui i dati possono portare la SCADENZA di una messa da
   parte. Nessuno dei tre esiste oggi in `app/dati/seme.js`, e perciò
   oggi nessuna riga dice «fino al …»: si dice la data che c'è
   davvero (quando è stato pagato). Un contatore alla rovescia è
   vietato dalla carta psicologica — «countdown senza data vera» — ed
   è esattamente cio' che faceva la vecchia pagina statica coi suoi
   «14 minuti». Il giorno che il gestionale manda la scadenza, la riga
   diventa «fino al 22/09» senza toccare una riga di qui. */
const CAMPI_SCADENZA = ["tenuto_fino", "scadenza", "ritiro_entro"];

const gg = (iso) => {
  const p = String(iso || "").split("-");
  return p.length === 3 ? p[2] + "/" + p[1] : "";
};
const scadenzaDi = (x) => {
  for (const k of CAMPI_SCADENZA) if (x && x[k]) return x[k];
  return null;
};

/* ── CIO' CHE LA VISTA LEGGE ───────────────────────────────────────
   Una lettura sola, in cima, e poi si disegna. Sparpagliare le letture
   dentro i pezzi di disegno è il modo per avere due conteggi diversi
   nella stessa schermata — il «3 di 6» scritto a mano della vecchia
   pagina nasceva così. */
function raccogli(store) {
  const s = store.leggi();
  const perId = new Map((store.catalogo || []).map((a) => [a.id, a]));
  const vivi = (s.esemplari || []).filter((x) => !x.rimosso);

  /* «I TUOI» NON È «TUTTI GLI ESEMPLARI». Un esemplare `venduto` è un
     pezzo pagato la cui carta non è ancora stata inquadrata da
     nessuno: sta in negozio, ed è la sorpresa. Contarlo qui
     svuoterebbe il regalo prima di darlo (vedi `ponte.js`, `possesso`). */
  const miei = vivi.filter((x) => x.stato !== "venduto");
  const attesa = vivi.filter((x) => x.stato === "venduto");

  const pezzi = miei.map((x) => {
    const a = perId.get(x.articolo) || null;
    return {
      id: x.id,                              /* il codice esemplare */
      articolo: x.articolo,
      nome: x.nome || (a && a.nome) || x.articolo,
      famiglia: (a && a.tipo) || "",
      foto: x.foto || (a && (a.foto || a.foto_url)) || null,
      da: x.da || null,
      /* nella stanza ci sta solo chi ha un posto: `fam`/`k` a null è un
         pezzo vero che il modello non conosce (ponte.js, `senzaPosto`) */
      nella_stanza: !!x.fam && typeof x.k === "number",
      fam: x.fam || null,
      k: x.k
    };
  });

  const conta = { tutti: pezzi.length };
  for (const f of FAMIGLIE) conta[f] = pezzi.filter((p) => p.famiglia === f).length;

  /* LE COLLEZIONI. Chi possiede cosa lo dice il seme, non la
     collezione: `app/dati/collezioni.js` dichiara solo QUALI articoli
     la compongono, ed è la correzione di un difetto vero — un elenco
     che porta dentro il possesso è giusto per una cliente e sbagliato
     per tutte le altre. */
  const posseduti = new Set(pezzi.map((p) => p.articolo));
  const coll = [];
  const mappa = store.collezioni || {};
  for (const id of Object.keys(mappa)) {
    const c = mappa[id];
    const elenco = c && c.pezzi ? c.pezzi : [];
    if (!elenco.length) continue;
    const ha = elenco.filter((p) => posseduti.has(p));
    if (!ha.length) continue;      /* una collezione che non ti riguarda non è tua */
    coll.push({
      id, nome: c.nome || id, chiude: c.chiude || null,
      totale: elenco.length, ha: ha.length, manca: elenco.length - ha.length,
      caselle: elenco.map((p) => posseduti.has(p))
    });
  }

  const arrivi = attesa.map((x) => {
    const a = perId.get(x.articolo) || null;
    const fine = scadenzaDi(x);
    return {
      id: x.id, articolo: x.articolo,
      nome: x.nome || (a && a.nome) || x.articolo,
      foto: x.foto || (a && (a.foto || a.foto_url)) || null,
      riga: "Ti aspetta in negozio" +
        (fine ? " · fino al " + gg(fine)
          : x.data_vendita ? " · pagato il " + gg(x.data_vendita) : "")
    };
  });

  /* i «messi da parte» dello store: entrano SOLO se portano una
     scadenza vera. Senza, sono pezzi di una lista dei desideri, e
     quelli vivono in Vetrina — non in un blocco che promette una data. */
  const dett = (store.seme && store.seme.wishlist_dettagli) || {};
  for (const id of s.wishlist || []) {
    const fine = scadenzaDi(dett[id]);
    if (!fine) continue;
    const a = perId.get(id) || null;
    arrivi.push({
      id, articolo: id, nome: (a && a.nome) || id,
      foto: (a && (a.foto || a.foto_url)) || null,
      riga: "Messo da parte · fino al " + gg(fine)
    });
  }

  return { pezzi, conta, coll, arrivi };
}

/* ── IL MONTAGGIO ───────────────────────────────────────────────────
   `el` è lo strato del tab Cofanetto, e dentro ci sono già il velo e
   (al primo ingresso) la cornice del banco: questa vista NON lo svuota
   e non chiama `schermo()`. Mette una cosa sola sopra la cornice — la
   capsula — e per il resto vive nel foglio. */
export function monta(el, store) {
  let dati = raccogli(store);
  let famiglia = "tutti";
  let aperto = false;
  let dopo = null;              /* cosa fare quando il foglio è GIU' */
  let bancoPronto = false;
  let griglia = null;           /* il contenitore vivo, per il FLIP */

  quandoIlBancoDice("banco/pronto", () => { bancoPronto = true; });

  /* ── LA CAPSULA ─────────────────────────────────────────────────
     Il bersaglio è il <button> (44 pieni); la capsula di vetro che si
     VEDE è il <span> dentro, 34, con lo scavalco trasparente di 5 per
     lato. È lo stesso trucco di «Annulla» nella pillola da 36: si
     vede piccola e si tocca grande. */
  const capsula = e("button", {
    type: "button", class: "cap-elenco", id: "cap-elenco",
    "aria-label": "Elenco dei tuoi gioielli",
    suClick: () => apri(false)
  }, [e("span", { class: "pil vetro thick" }, [
    segno("cofanetto", { misura: 20 }),
    e("span", { class: "eti", testo: "Elenco" })])]);
  el.appendChild(capsula);

  /* ── LA COLLEZIONE INTERA: è F5, e lo dice ─────────────────────
     Lo schermo si registra da qui e non da `app/viste/perte.js` perché
     è questa vista che lo apre; il registro degli schermi è globale
     (rotta.js), quindi funziona anche se il push avviene nel tab «Per
     te». Quando F5 arrivera', questa registrazione si sposta la' e qui
     resta solo il tocco. */
  registraSchermo("collezione", (id, dove) => {
    const c = (store.collezioni || {})[id] || {};
    const pagina = schermo(dove, {
      titolo: c.nome || "Collezione",
      indietro: torna, etichettaIndietro: "Torna a Per te"
    });
    if (c.racconto) pagina.append(e("p", {
      class: "t-body tenue riquadro-testo", testo: c.racconto
    }));
    pagina.append(lista("La collezione", [
      cella({
        titolo: "Tutti i pezzi, uno per uno",
        sotto: (c.pezzi || []).length + " pezzi",
        inArrivo: "F5", etichetta: "La collezione " + (c.nome || id) + ", per intero"
      }),
      cella({
        titolo: "Cosa ti spetta alla chiusura",
        sotto: c.chiude ? c.chiude.nome : "",
        inArrivo: "F5", etichetta: "Cosa ti spetta alla chiusura"
      })
    ]));
  });

  /* ══ IL CORPO DEL FOGLIO ═════════════════════════════════════════ */

  /* ── F1.3 · LA RIGA DEL RITORNO ─────────────────────────────────
     UNA riga sotto la copertina dell'elenco, e solo se c'è un FATTO —
     un pezzo nuovo, il credito cambiato, una collezione arrivata a uno.
     Il fatto lo calcola `app/avvio.js` all'apertura confrontando la
     fotografia dell'ultima volta con adesso, e lo lascia in
     `stato.ritorno`; qui si legge e basta.
     Se non è cambiato niente, NON C'E' NIENTE: il silenzio è la forma
     corretta del «bentornata». Mai i giorni contati, mai un badge, mai
     una modale, mai «ci sei mancato» (carta psicologica, §ritorno).
     Sparisce al tocco, e da sola alla prossima apertura — perché la
     prossima apertura riscrive `ritorno` col fatto nuovo, o con nulla. */
  function rigaRitorno() {
    const detto = (store.leggi() || {}).ritorno;
    if (!detto) return null;
    return e("button", {
      type: "button", class: "ritorno t-sub",
      "aria-label": detto + ". Tocca per nascondere.",
      suClick: (ev) => {
        const n = ev.currentTarget;
        store.invia("ritorno/letto", {});
        if (RIDOTTO.matches) { n.remove(); return; }
        n.animate([{ opacity: 1 }, { opacity: 0 }],
          { duration: 200, easing: "linear", fill: "forwards" })
          .finished.then(() => n.remove(), () => n.remove());
      }
    }, [e("span", { testo: detto })]);
  }

  function corpo() {
    const dentro = e("div", { class: "elenco" });
    const rit = rigaRitorno();
    if (rit) dentro.append(rit);

    if (!dati.pezzi.length) {
      dentro.append(vuotoCofanetto());
      /* un pezzo che ti aspetta in negozio non si nasconde perché il
         cofanetto è vuoto: è proprio la riga che dice che non lo
         restera'. */
      if (dati.arrivi.length) dentro.append(bloccoArrivi());
      griglia = null;
      return dentro;
    }

    dentro.append(segmenti());
    griglia = grigliaPezzi();
    dentro.append(griglia);
    if (dati.coll.length) dentro.append(bloccoCollezioni());
    if (dati.arrivi.length) dentro.append(bloccoArrivi());
    return dentro;
  }

  function segmenti() {
    const voci = [["tutti", "Tutti"]];
    for (const f of FAMIGLIE) voci.push([f, f]);
    return e("div", {
      class: "elenco-seg", role: "group", "aria-label": "Filtra per famiglia"
    }, voci.map(([chiave, nome]) => {
      const on = famiglia === chiave;
      const n = dati.conta[chiave] || 0;
      return e("button", {
        type: "button", class: "chip-tocco",
        "aria-label": nome + ", " + n + (n === 1 ? " pezzo" : " pezzi"),
        "aria-current": on ? "true" : null,
        "data-fam": chiave,
        suClick: () => {
          if (famiglia === chiave) return;
          famiglia = chiave;
          ridisegna();
          annuncia(nome + ": " + n + (n === 1 ? " pezzo" : " pezzi"));
        }
      }, [e("span", { class: "chip" + (on ? " acceso" : "") }, [
        e("span", { testo: nome }),
        e("i", { class: "cifra conto", testo: String(n) })])]);
    }));
  }

  function grigliaPezzi() {
    const visti = famiglia === "tutti"
      ? dati.pezzi : dati.pezzi.filter((p) => p.famiglia === famiglia);
    if (!visti.length)
      return e("p", {
        class: "t-sub tenue niente-qui",
        testo: "Di questa famiglia non hai ancora niente."
      });
    return e("div", { class: "griglia-pezzi", role: "list" },
      visti.map((p) => cellaPezzo(p)));
  }

  function cellaPezzo(p) {
    /* LA FOTO, O IL REDATTO. Non c'è un packshot per articolo (memoria
       «Regina non ha packshot»): gli scatti veri ritraggono la
       collezione. Chi non ne ha ancora uno prende il redatto monocromo
       col proprio nome — la regola 5 vieta lo shimmer, e un rettangolo
       grigio muto non dice quale pezzo è. */
    const senza = () => e("div", { class: "redatto senza-foto" },
      [e("span", { testo: p.nome })]);
    let fig;
    if (p.foto) {
      fig = e("img", {
        class: "fig", src: p.foto, alt: "", loading: "lazy", decoding: "async"
      });
      /* un file che non c'è non deve lasciare un buco: la cella si
         ricuce col redatto. Succede davvero — quattro dei nove pezzi di
         Lucia non hanno uno scatto. */
      fig.addEventListener("error", () => { fig.replaceWith(senza()); }, { once: true });
    } else fig = senza();

    const proprio = !p.da;
    const stato = proprio ? "Tuo" : "Ricevuto da " + p.da;
    const n = e("button", {
      type: "button", role: "listitem",
      class: "pezzo-cella", "data-pezzo": p.id,
      "aria-label": p.nome + ", " + stato,
      suClick: () => tocca(p)
    }, [fig,
      e("b", { testo: p.nome }),
      /* IL COLORE È SOLO DELLA MERCE. Lo stato lo dice il grado del
         colore del testo, non un badge: «TUO» prende l'accento (--firma
         su carta, 6,8:1), «RICEVUTO DA …» resta secondario (5,4:1). */
      e("span", {
        class: "occhiello foot stato" + (proprio ? " mio" : ""), testo: stato
      })]);
    /* il nome del FLIP: la cella si riconosce fra un disegno e l'altro */
    n.dataset.flip = p.id;
    return n;
  }

  function bloccoCollezioni() {
    const righe = dati.coll.map((c) => {
      const caselle = c.caselle.map((ha) =>
        e("i", { class: "tondo" + (ha ? " ha" : "") }));
      if (c.chiude) caselle.push(e("i", { class: "tondo chiude" },
        [segno("stella", { misura: 14 })]));
      const sotto = c.ha + " di " + c.totale +
        (c.manca === 1 ? " · Manca un pezzo" : "");
      const b = e("button", {
        type: "button", role: "listitem", class: "cella coll-cella",
        "data-coll": c.id,
        "aria-label": c.nome + ", " + sotto,
        suClick: () => apriCollezione(c.id)
      }, [
        e("div", { class: "coll-alto" }, [
          e("div", { class: "testo" }, [
            e("b", { class: "coll-nome", testo: c.nome }),
            e("span", { class: "cifra", testo: sotto })]),
          segno("chevron", { misura: 14, classe: "frec" })]),
        e("div", { class: "coll-tondi", "aria-hidden": "true" }, caselle)
      ]);
      /* GRADO PICCOLO (carta psicologica): a un pezzo dalla chiusura la
         riga si posa, 0,96 → 1. Non un urlo, non un badge: un peso. */
      if (c.manca === 1 && !RIDOTTO.matches)
        requestAnimationFrame(() => b.animate(
          [{ transform: "scale(.96)" }, { transform: "none" }],
          { duration: 200, easing: "cubic-bezier(.22,1,.36,1)" }));
      return b;
    });
    return e("section", { class: "lista-blocco" }, [
      e("h2", { class: "occhiello foot lista-testa", testo: "Le tue collezioni" }),
      e("div", { class: "lista", role: "list" }, righe)]);
  }

  function bloccoArrivi() {
    return lista("In arrivo", dati.arrivi.map((a) => cella({
      id: a.id, foto: a.foto, titolo: a.nome, sotto: a.riga,
      etichetta: a.nome + ". " + a.riga,
      suClick: () => vaiInVetrina(a.articolo)
    })));
  }

  function vuotoCofanetto() {
    /* IL VASSOIO, non un'illustrazione. Sei posti vuoti a filo: è la
       stessa forma che nella vecchia pagina erano le «fossette incise»,
       ed è cio' che la carta psicologica chiede — il pezzo che manca è
       un posto, disegnato, non una card grigia. */
    const posti = [];
    for (let i = 0; i < 6; i++) posti.push(e("i", { class: "posto" }));
    return e("div", { class: "vuoto vuoto-cofanetto" }, [
      e("div", { class: "vassoio-vuoto", "aria-hidden": "true" }, posti),
      e("b", { testo: "Il tuo cofanetto è vuoto" }),
      e("p", { testo: "I pezzi che prendi in negozio compaiono qui da soli." }),
      tasto("Vai in vetrina", { tipo: "secondario", suClick: () => vaiInVetrina(null) })
    ]);
  }

  /* ══ I TOCCHI ════════════════════════════════════════════════════ */

  /* UN PEZZO SI APRE NELLA STANZA, se la stanza c'è. Il banco dira'
     «banco/pronto» in F2; finché non lo dice — e finché il pezzo non
     ha un posto nel modello — si ripiega sulla scheda della Vetrina,
     che esiste. Un tocco che non porta da nessuna parte è peggio di un
     tocco che porta nel posto secondo. */
  function tocca(p) {
    if (bancoPronto && p.nella_stanza) {
      diAlBanco("banco/mostra", { id: p.articolo, codice: p.id, fam: p.fam, k: p.k });
      annuncia(p.nome + ", nella stanza.");
      chiudiFoglio();
      return;
    }
    vaiInVetrina(p.articolo);
  }

  /* IL CODICE CHE VIAGGIA NELL'INDIRIZZO È QUELLO DELL'ARTICOLO, non
     quello dell'esemplare, e non è una svista: lo schermo «pezzo» di
     `app/viste/vetrina.js` risolve l'id sul CATALOGO. Un codice
     esemplare (`RJ-CM4-PR7-G9D`) lì aprirebbe una scheda vuota. Il
     giorno che esistera' uno schermo «esemplare» — la Carta del Pezzo,
     F6 — questa riga puntera' a quello. */
  function vaiInVetrina(articolo) {
    dopo = () => {
      if (tabCorrente() !== "vetrina") vaiA("vetrina");
      if (articolo) spingi("pezzo/" + articolo);
    };
    chiudiFoglio();
  }

  function apriCollezione(id) {
    dopo = () => {
      if (tabCorrente() !== "perte") vaiA("perte");
      spingi("collezione/" + id);
    };
    chiudiFoglio();
  }

  /* ══ IL RIDISEGNO, COL FLIP ══════════════════════════════════════
     Si misura la griglia PRIMA, si ricostruisce, si misura DOPO e si
     anima la differenza (`app/moto.js`). Non `startViewTransition`, e
     per una ragione precisa: una transizione nativa fotografa TUTTO il
     documento, e qui sotto il foglio c'è una cornice con un contesto
     WebGL acceso — fotografarla costa, e a volte lampeggia. Il FLIP
     tocca solo le celle che si spostano. */
  function ridisegna() {
    if (!aperto) return;
    const prima = new Map();
    if (griglia) for (const n of griglia.querySelectorAll("[data-flip]"))
      prima.set(n.dataset.flip, misura(n));

    const dlg = document.getElementById("foglio");
    const c = dlg && dlg.querySelector(".corpo");
    if (!c) return;
    c.replaceChildren(corpo());
    const h = dlg.querySelector("h2");
    if (h) h.textContent = titolo();

    if (griglia && prima.size && !RIDOTTO.matches)
      for (const n of griglia.querySelectorAll("[data-flip]")) {
        const p = prima.get(n.dataset.flip);
        if (p) flip(n, p, misura(n), { durata: 300 });
        else n.animate([{ opacity: 0 }, { opacity: 1 }],
          { duration: 200, easing: "linear" });
      }
  }

  const titolo = () => "I tuoi gioielli · " + dati.pezzi.length;

  /* ══ IL FOGLIO E LA CRONOLOGIA, allineati in un posto solo ═══════ */

  function apri(daIndirizzo) {
    if (aperto) return;
    dati = raccogli(store);
    aperto = true;
    if (!daIndirizzo && location.hash !== ROTTA) {
      try { history.pushState(null, "", ROTTA); } catch (_) { /* niente */ }
    }
    const dlg = apriFoglio({
      titolo: titolo(),
      fermo: "alto",
      contenuto: corpo(),
      /* «Stanza» chiude il foglio e riconsegna la stanza: è il verso
         opposto della capsula, e sta nello stesso posto in cui la
         capsula stava. */
      azione: tasto("Stanza", {
        tipo: "terziario", segno: "cofanetto",
        etichetta: "Chiudi l’elenco e torna nella stanza",
        suClick: () => chiudiFoglio()
      }),
      suChiusura: chiuso
    });
    dlg.dataset.vista = "elenco";
    annuncia(titolo());
  }

  function chiuso() {
    aperto = false; griglia = null;
    /* chi ha chiuso il foglio deve anche togliere il passo di
       cronologia che l'apertura aveva aggiunto — altrimenti il tasto
       indietro riaprirebbe un foglio che l'utente ha appena chiuso. */
    if (location.hash === ROTTA) { try { history.back(); } catch (_) { /* niente */ } }
    const f = dopo; dopo = null;
    if (f) setTimeout(f, 0);
  }

  /* L'INDIRIZZO COMANDA, e si ascolta da due parti. `popstate` copre il
     tasto indietro, il gesto dal bordo e `history.back()`; `hashchange`
     copre chi scrive `location.hash` a mano — che nell'app succede
     davvero (avvio.js lo fa quando il banco apre un pezzo) e che secondo
     il browser non è un passo di cronologia percorso a ritroso. Le due
     vie finiscono nella stessa funzione, e `aperto` fa da fermo: chiamata
     due volte, la seconda non fa niente. */
  const seguiIndirizzo = () => {
    const vuole = location.hash === ROTTA;
    if (vuole && !aperto) apri(true);
    else if (!vuole && aperto) chiudiFoglio();
  };
  addEventListener("popstate", seguiIndirizzo);
  addEventListener("hashchange", seguiIndirizzo);

  store.iscrivi((s, ev, prima) => {
    /* il foglio vive dentro il tab Cofanetto: se si cambia sezione
       (per indirizzo, o da codice) scende. */
    if (ev.tipo === "nav/tab" && ev.dato.tab !== "cofanetto" && aperto) {
      chiudiFoglio(); return;
    }
    if (!prima) return;
    if (s.esemplari !== prima.esemplari || s.wishlist !== prima.wishlist ||
      ev.tipo === "demo/reset") {
      dati = raccogli(store);
      ridisegna();
    }
  });

  /* chi apre l'app direttamente sull'indirizzo del foglio lo trova
     aperto. Un giro dopo, perché la cornice del banco e la barra
     devono essersi posate prima che ci salga qualcosa sopra. */
  if (location.hash === ROTTA) setTimeout(() => apri(true), 80);

  /* la maniglia per le sonde: apre e chiude senza dover indovinare un
     selettore. È dichiarata, come `window.__regina`. */
  window.__elenco = {
    apri: () => apri(false), chiudi: chiudiFoglio,
    get aperto() { return aperto; },
    get dati() { return dati; },
    get famiglia() { return famiglia; }
  };
}
