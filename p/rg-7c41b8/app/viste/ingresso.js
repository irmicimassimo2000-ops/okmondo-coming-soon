/* ═══════════════════════════════════════════════════════════════════
   app/viste/ingresso.js — F1 · LA PORTA.

   Quattro schermate a tutto schermo, senza barra: S0 il codice, S1 la
   consegna (la cerimonia del cofanetto), S2 le due domande, S3 la
   tessera. Poi la barra sale e comincia l'app.

   PERCHÉ NON È UNA VISTA COME LE ALTRE. Le quattro sezioni di
   `app/rotta.js` sono PARI e sempre montate: si scelgono. L'ingresso
   invece è una FILA — s0 → s1 → s2 → s3 — e si percorre una volta
   sola. Metterlo fra i tab avrebbe voluto dire una quinta voce nella
   barra approvata, o una vista senza voce: due modi di sbagliare.
   Sta perciò SOPRA la scocca (`#ingresso`, fisso, sopra la barra), e
   la barra non esiste finché non ha finito (regola del 45: «la tab bar
   di vetro NON esiste durante F1»).

   L'INDIRIZZO. `#/ingresso/s0|s1|s2|s3`, un `pushState` per schermata,
   e il tasto indietro torna alla precedente. La prima schermata entra
   con `replaceState` e non con un push: a s0 «indietro» deve uscire
   dall'app, non lasciare l'ingresso a metà con la barra ancora
   nascosta. `app/rotta.js` legge gli indirizzi a COPPIE `tipo/id` e i
   suoi tab sono quattro nomi dichiarati: `#/ingresso/s2` non è nessuno
   dei due, quindi le passa accanto senza toccarla.

   IL SALTO. Chi arriva da `?c=RJ00042` o da `#/c/<codice>` — il link
   che la cassa manda per SMS — non vede S0: il codice ce l'ha già in
   mano, e richiederglielo sarebbe chiederlo due volte (Cartier, Prada:
   la chiave è l'oggetto che il cliente ha addosso).

   CIO' CHE IL CODICE FA E CIO' CHE NON FA. Il codice valido è UNO —
   `cliente.tessera_numero` del seme — e un codice sconosciuto non
   rivela niente: nessun «questo cliente non esiste», nessun conteggio
   di tentativi mostrato, nessun elenco. Dice dove si trova il codice
   giusto e, dal quinto errore, apre il ramo umano.

   I NUMERI DI MOTO sono quelli del corpus (reference 45), e non sono
   arrotondabili: sono la differenza fra una scatola che si apre e una
   scatola che scatta. Stanno tutti in `CERIMONIA`, in un posto solo,
   perché la sonda `_F1_cerimonia.mjs` li rilegge da lì.
   ═══════════════════════════════════════════════════════════════════ */

import { e, svuota, annuncia } from "app/ui/dom.js";
import { segno } from "app/ui/segni.js";
import { tasto, vestiTasto } from "app/ui/tasto.js";
import { apriFoglio, chiudiFoglio } from "app/ui/foglio.js";
import { molla, lineare, RIDOTTO, dueGiri } from "app/moto.js";
import { NEGOZIO, waNegozio } from "app/dati/negozio.js";
import { tessera } from "app/ui/tessera.js";

/* ── I NUMERI ──────────────────────────────────────────────────────
   Ingresso di una schermata: 320 ms, ease-out iOS, 24 pt di
   scorrimento più dissolvenza, testi in stagger da 40.
   La cerimonia: sei tempi, e l'ultimo è 1600. */
const CURVA = "cubic-bezier(.2,.8,.2,1)";
const T_SCHERMATA = 320, SCORRE = 24, STAGGER = 40;

/* la molla del pezzo che si posa: 400 ms, smorzamento 0,8. `lineare()`
   CAMPIONA la molla vera e la consegna al CSS come `linear(...)`; una
   cubic-bezier che la imita sbaglia la coda, ed è la coda che fa la
   differenza fra «si posa» e «si ferma». L'omega si ricava dalla
   durata voluta: l'inviluppo scende sotto lo 0,4% a ln(1/0,004)/(z*w),
   quindi w = 5,52/(0,8 * 0,400) = 17,25. */
const MOLLA_PEZZO = lineare({ omega: 17.25, zeta: 0.8, punti: 30 });
/* la barra che sale alla fine: 420 ms, smorzamento 0,85 →
   w = 5,52/(0,85 * 0,420) = 15,47. */
const BARRA_OMEGA = 15.47, BARRA_ZETA = 0.85, BARRA_SALITA = 56;

export const CERIMONIA = {
  pressione: 80,                       /* il tasto a 0,98 prima di tutto */
  coperchio: { da: 0, a: 700, gradi: -105 },
  luce: { da: 300, a: 800 },
  pezzo: { da: 600, a: 1000, alza: 12 },
  picco: 900,
  uscita: { da: 1000, a: 1350 },
  testi: { da: 1250, a: 1500 },
  etichetta: 1400,                     /* «Apri» diventa «Continua» */
  fine: 1600,
  ridotto: 200                         /* dissolvenza incrociata (tetto
                                          del ridotto: 150-200) */
};

/* ── IL CODICE ─────────────────────────────────────────────────────
   Prefisso fisso «RJ» più cinque cifre. Il campo è UNO e di sistema
   (`inputmode=numeric autocomplete=one-time-code`): sei caselle
   disegnate a mano rompono l'autofill e l'incolla, e Apple lo dice
   esplicitamente. Il prefisso non sta DENTRO il valore — sta accanto,
   come etichetta — così non si può cancellare e non entra
   nell'autofill. */
const cinqueCifre = (n) => String(n ?? "").replace(/\D/g, "").padStart(5, "0").slice(-5);
const leggibile = (n) => "RJ " + cinqueCifre(n);

/* «RJ00042», «RJ 00042», «rj-00042», «00042» → «00042». Un codice
   dettato al telefono o incollato da un SMS arriva in tutti e quattro i
   modi, e rifiutarne tre per pignoleria è un errore nostro travestito
   da errore suo. */
const soloCifre = (s) => String(s || "").replace(/\D/g, "").slice(-5);

/* ── LA DATA ─────────────────────────────────────────────────────── */
const MESI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno",
  "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
function dataLunga(iso) {
  const p = String(iso || "").split("-");
  if (p.length !== 3) return "";
  return Number(p[2]) + " " + MESI[Number(p[1]) - 1] + " " + p[0];
}

/* ── LA MISURA DI CIO' CHE SI MUOVE ────────────────────────────────
   Una maniglia dichiarata, come `window.__regina` e `window.__elenco`:
   la sonda della cerimonia deve poter FERMARE l'orologio e leggere la
   rotazione del coperchio e la posizione del pezzo a un millisecondo
   preciso, invece di campionare a caso sperando nel frame rate. Legge
   la trasformazione VERA calcolata dal browser, non i parametri che le
   abbiamo dato: se un giorno il CSS la contraddice, si vede. */
function matrice(el) {
  const t = getComputedStyle(el).transform;
  if (!t || t === "none") return null;
  /* SI TAGLIA IL NOME DELLA FUNZIONE PRIMA DI LEGGERE I NUMERI. In
     «matrix3d(...)» il 3 fa parte del NOME, e un'espressione regolare
     che cerca cifre se lo porta dentro come primo valore: i sedici
     numeri diventano diciassette, la matrice sembra bidimensionale e la
     rotazione del coperchio si legge sempre 0. Costato un rosso. */
  const dentro = t.slice(t.indexOf("(") + 1);
  const n = (dentro.match(/-?[\d.e+-]+/g) || []).map(Number);
  return n.length >= 6 ? n : null;
}
function leggiMoto(el) {
  const m = matrice(el);
  const op = Number(getComputedStyle(el).opacity);
  if (!m) return { gradi: 0, y: 0, opacita: op };
  if (m.length === 16) {
    /* matrix3d: per un rotateX puro m[5]=cos, m[6]=sin, m[13]=ty */
    return {
      gradi: Math.atan2(m[6], m[5]) * 180 / Math.PI,
      y: m[13], opacita: op
    };
  }
  /* matrix(a,b,c,d,tx,ty) */
  return { gradi: 0, y: m[5], opacita: op };
}

/* ═══════════════════════════════════════════════════════════════════
   IL MONTAGGIO
   ═══════════════════════════════════════════════════════════════════ */
export function montaIngresso(store, opz = {}) {
  const s = store.leggi();
  const seme = store.seme || {};
  const cliente = (s && s.cliente) || seme.cliente || {};
  const ATTESO = cinqueCifre(cliente.tessera_numero);

  /* il pezzo della consegna: il PRIMO esemplare che la persona ha
     davvero (non `venduto`, non rimosso). È quello che nel cofanetto
     sta in cima, ed è quello che il cartoncino accompagnava. */
  const perId = new Map((store.catalogo || []).map((a) => [a.id, a]));
  const consegna = ((s && s.esemplari) || []).find(
    (x) => !x.rimosso && x.stato !== "venduto") || null;
  const art = consegna ? perId.get(consegna.articolo) : null;
  /* NEL COFANETTO CI STA IL PEZZO, non la campagna. La foto che
     `innesto.js` mette in `foto` è lo scatto migliore che c'è: per i
     29 articoli senza shooting è il PROVINO (il pezzo solo, sul
     fondo crema della scena in tre dimensioni), ma per i pochi che
     hanno una foto vera è uno scatto indossato — una spalla, un
     collo — e dentro un cofanetto quella foto si legge come una
     macchia di pelle, non come un gioiello. Dentro il vano si posa
     SEMPRE il provino, se c'è; la foto indossata resta dov'è giusta
     (la vetrina, la carta). */
  const PEZZO = {
    nome: (consegna && (consegna.nome || (art && art.nome))) || "Il tuo pezzo",
    foto: ((art && (art.scatti || []).find(x => x.tipo === "provino3d")) || {}).src ||
          (consegna && (consegna.foto || (art && art.foto))) || null,
    quando: (consegna && (consegna.quando || dataLunga(consegna.data_vendita))) || ""
  };
  /* la fodera scelta nel seme veste il velluto del cofanetto: chi ha
     provato il turchese al banco lo ritrova alla consegna. */
  const FODERA = ((s && s.preferenze) || {}).fodera || "velluto";

  /* ── la scocca dell'ingresso ───────────────────────────────────── */
  const radice = e("div", {
    id: "ingresso", "data-tema": "chiaro", role: "region",
    "aria-label": "Ingresso"
  });
  document.body.appendChild(radice);
  document.body.dataset.ingresso = "1";

  let corrente = null;             /* "s0" | "s1" | "s2" | "s3" */
  let chiuso = false;
  let tentativi = 0;
  let codice = (s && s.ingresso && s.ingresso.codice) || null;
  let nome = "", quando = "";

  /* ═══ S0 · IL CODICE ═════════════════════════════════════════════ */
  function s0() {
    const campo = e("input", {
      class: "f1-cifre", type: "text", inputmode: "numeric",
      autocomplete: "one-time-code", maxlength: 5, id: "f1-codice",
      "aria-label": "Le cinque cifre del codice, dopo RJ",
      /* niente `pattern`/`required`: la validazione nativa qui
         mostrerebbe una bolla di sistema in inglese sopra il campo. */
      autocapitalize: "off", spellcheck: false
    });
    const errore = e("p", { class: "f1-errore t-foot", role: "alert" });
    const apri = tasto("Apri", { tipo: "primario", largo: true, spento: true });

    const aggiorna = () => {
      const v = soloCifre(campo.value);
      if (campo.value !== v) campo.value = v;
      apri.disabled = v.length !== 5;
    };
    campo.addEventListener("input", () => { svuotaErrore(); aggiorna(); });
    /* incollare «RJ 00042» deve funzionare: `maxlength` taglia prima
       che `input` arrivi, quindi il testo si prende dall'evento. */
    campo.addEventListener("paste", (ev) => {
      const t = (ev.clipboardData || window.clipboardData).getData("text");
      const v = soloCifre(t);
      if (!v) return;
      ev.preventDefault(); campo.value = v; svuotaErrore(); aggiorna();
    });
    campo.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" && !apri.disabled) { ev.preventDefault(); prova(); }
    });
    function svuotaErrore() {
      if (errore.textContent || errore.firstChild) svuota(errore);
      campo.classList.remove("sbagliato");
    }
    apri.addEventListener("click", prova);

    function prova() {
      const v = soloCifre(campo.value);
      if (v.length !== 5) return;
      if (v === ATTESO) {
        codice = leggibile(v);
        store.invia("ingresso/codice", { codice });
        vai("s1");
        return;
      }
      tentativi++;
      campo.classList.add("sbagliato");
      svuota(errore);
      /* IL RIMEDIO STA NEL TESTO, e cambia al quinto tentativo. Non un
         alert, non uno scuotimento: una riga che dice dove cercare, e
         poi una persona a cui chiedere. Il lusso non blocca. */
      if (tentativi < 5) {
        errore.append(e("span", { testo: "Questo codice non lo troviamo. È sul cartoncino, sotto il nome." }));
      } else {
        /* dal quinto: il rimedio diventa un COMANDO, e prende la riga
           intera. Un link di tre parole dentro una frase da 13 px non
           è un bersaglio da 44, e chi è già al quinto tentativo è
           esattamente la persona a cui non si può chiedere mira. */
        errore.append(ramoUmano());
      }
      annuncia(errore.textContent);
      campo.focus();
    }

    const sch = schermata("s0", [
      /* IL MARCHIO COMPLETO, e nella misura in cui sta anche nello
         splash: così il caricamento non sposta niente. Mai ridotto,
         mai un monogramma — è il canone, ed è il motivo per cui
         l'app non ha un favicon. */
      e("img", {
        class: "f1-marchio", src: "marchio.png",
        alt: "Regina Jewels", decoding: "async"
      }),
      e("h1", { class: "t-large f1-titolo", testo: "Il tuo cofanetto ti aspetta." }),
      e("p", { class: "t-sub tenue f1-sotto", testo: "Il codice è sul cartoncino, sotto il nome." }),
      e("div", { class: "f1-campo" }, [
        e("label", { class: "f1-rj", for: "f1-codice", testo: "RJ" }),
        campo
      ]),
      errore,
      apri,
      e("p", {
        class: "t-foot tenue f1-privacy",
        testo: "Il codice serve solo a trovare il tuo pezzo. Nessun account, nessuna password."
      })
    ]);
    /* la tastiera si apre da sola: è l'unica cosa da fare in questa
       schermata, e farla aspettare un tocco in più è un tocco in
       più. Dopo l'entrata, altrimenti il browser scorre a metà moto. */
    setTimeout(() => { try { campo.focus(); } catch (_) { /* niente */ } }, T_SCHERMATA + 40);
    return sch;
  }

  /* IL RAMO UMANO DEL QUINTO TENTATIVO, COLLEGATO (F3b, 15/09).
     Fino a ieri il comando si DICHIARAVA in arrivo, e per una ragione
     buona: il numero del negozio non stava nei dati, e un numero
     inventato dentro un rimedio è peggio del rimedio mancante. Adesso
     il numero c'è, sta in `app/dati/negozio.js` (vero, dal profilo
     pubblico) e lo legge anche l'assistenza: chi è al quinto tentativo
     scrive a una persona invece di leggere il nome di una fase.
     IL TESTO È GIÀ SCRITTO. Chi apre WhatsApp con un campo vuoto deve
     ancora inventarsi come dirlo, e chi è bloccato da cinque tentativi
     ha già speso tutta la pazienza che aveva. */
  function ramoUmano() {
    const DETTO = "Chiedilo in negozio · WhatsApp";
    const numero = (seme.negozio && (seme.negozio.whatsapp || seme.negozio.telefono)) ||
                   NEGOZIO.whatsapp;
    const href = (seme.negozio && seme.negozio.whatsapp)
      ? "https://wa.me/" + String(numero).replace(/\D/g, "") + "?text=" +
        encodeURIComponent("Ciao, non trovo il mio codice del cofanetto.")
      : waNegozio("Ciao, non trovo il mio codice del cofanetto.");
    return e("a", {
      class: "f1-umano", testo: DETTO, href,
      rel: "noopener", target: "_blank", "data-vivo": "1"
    });
  }

  /* ── IL COFANETTO VERO ──────────────────────────────────────────
     `app/dati/cofanetto.js` (15/09) porta il cofanetto fotografato
     dalla stessa macchina del banco, in quattro vesti e su fondo
     trasparente: `base-<fodera>` (la base col vano già vestito e la sua
     ombra), `coperchio-chiuso` (il solo coperchio, senza ombra) e
     `aperto-<fodera>` (il fotogramma vero a coperchio aperto). Il
     cofanetto disegnato in CSS resta come RIPIEGO — se il modulo non
     c'è, o le immagini non arrivano, la cerimonia va lo stesso.

     I FILE SI RISOLVONO CONTRO `app/`, non contro la pagina. `C.radice`
     è «./dati/cofanetto/», relativa alla cartella del modulo che la
     dichiara; da qui (`app/viste/`) si risale di uno. Chiederle alla
     radice del sito è il 404 che si è già visto una volta: questa app
     non sta in radice, sta in `p/rg-7c41b8/`.

     LA ROTAZIONE SI FERMA A -70, e non è un compromesso: lo dichiara il
     modulo (`rotazione_in_css.sicuro`), perché oltre quell'angolo un
     `rotateX` su una fotografia di tre quarti si assottiglia in una
     lama e smette di somigliare a un coperchio. Da lì si dissolve sul
     fotogramma vero. I tempi del corpus 45 restano: 0→700 la
     rotazione, 450→700 la dissolvenza, e il resto non si tocca. */
  let GRADI = CERIMONIA.coperchio.gradi;   /* -105 col CSS, -70 col render */
  let apertoImg = null;                    /* il fotogramma vero */

  async function vestiColRender(cof, coperchioDentro) {
    try {
      const m = await import("app/dati/cofanetto.js");
      const C = m.COFANETTO || m.default;
      if (!C || !C.base || !C.coperchio || !C.aperto) return false;
      const fodera = cof.dataset.fodera;
      const nomeBase = C.base[fodera], nomeAperto = C.aperto[fodera];
      if (!nomeBase || !nomeAperto) return false;

      const dentro = new URL("../", import.meta.url);
      const dove = (f) => new URL((C.radice || "./dati/cofanetto/") + f, dentro).href;
      const carica = (src) => new Promise((ok, no) => {
        const i = new Image();
        i.decoding = "async"; i.alt = "";
        i.onload = () => ok(i); i.onerror = no; i.src = src;
      });
      /* SI ASPETTA CHE LE TRE IMMAGINI CI SIANO DAVVERO prima di
         cambiare la scena: montare un render a metà vorrebbe dire far
         partire la cerimonia su una scatola che non c'è ancora. */
      const [base, cima, aperto] = await Promise.all(
        [dove(nomeBase), dove(C.coperchio), dove(nomeAperto)].map(carica));
      base.className = "f1-cof-base";
      cima.className = "f1-cof-cima";
      aperto.className = "f1-cof-aperto";

      const scatola = cof.querySelector(".f1-cof-scatola");
      const velo = cof.querySelector(".f1-cof-fodera");
      if (velo) velo.remove();
      /* l'ordine conta: base sotto, poi il fotogramma aperto (che si
         accende quando la rotazione si ferma), poi il pezzo nel vano,
         poi il coperchio che ruota sopra tutto. */
      scatola.prepend(aperto);
      scatola.prepend(base);
      coperchioDentro.prepend(cima);
      const o = (C.cerniera || {}).origine;
      if (o && isFinite(o.x) && isFinite(o.y))
        coperchioDentro.style.transformOrigin = o.x + "% " + o.y + "%";
      const sicuro = (C.rotazione_in_css || {}).sicuro;
      if (isFinite(sicuro)) GRADI = sicuro;
      apertoImg = aperto;
      cof.dataset.render = "1";
      return true;
    } catch (_) {
      /* niente modulo, o immagini che non arrivano: resta il cofanetto
         in CSS, che è il ripiego dichiarato. */
      return false;
    }
  }

  /* ═══ S1 · LA CONSEGNA ═══════════════════════════════════════════
     IL COFANETTO È DISEGNATO, non fotografato e non in tre
     dimensioni: la scena in tre dimensioni vive nell'iframe del banco e
     montarla qui costerebbe dieci mega prima del primo valore. È un
     oggetto a strati — scatola, fodera di velluto, vassoio, pezzo,
     coperchio — con un velo di luce che entra dall'alto quando il
     coperchio si alza. La cerniera è in ALTO e la prospettiva sta sul
     contenitore: il coperchio ruota all'indietro come una scatola
     vera, non «sparisce». */
  function s1() {
    const pezzoImg = PEZZO.foto
      ? e("img", { class: "f1-pezzo-fig", src: PEZZO.foto, alt: "", decoding: "async" })
      : e("div", { class: "f1-pezzo-fig redatto" }, [e("span", { testo: PEZZO.nome })]);

    const pezzo = e("div", { class: "f1-cof-pezzo" }, [
      pezzoImg,
      e("i", { class: "f1-cof-ombra", "aria-hidden": "true" })
    ]);
    const luce = e("i", { class: "f1-cof-luce", "aria-hidden": "true" });
    const coperchioDentro = e("div", { class: "f1-cof-coperchio" }, [
      e("i", { class: "f1-cof-bordo", "aria-hidden": "true" }),
      e("img", { class: "f1-cof-marchio", src: "marchio.png", alt: "", decoding: "async" })
    ]);
    /* due nodi per il coperchio e non uno: uno RUOTA sulla cerniera,
       l'altro ESCE dall'alto. Due trasformazioni sullo stesso elemento
       si sovrascrivono a vicenda — la seconda animazione butterebbe via
       la rotazione della prima. */
    const coperchio = e("div", { class: "f1-cof-fuori" }, [coperchioDentro]);

    const cof = e("div", {
      class: "f1-cof", "data-fodera": FODERA, "aria-hidden": "true"
    }, [
      e("div", { class: "f1-cof-scatola" }, [
        e("i", { class: "f1-cof-fodera" }),
        pezzo, luce
      ]),
      coperchio
    ]);

    const nomePezzo = e("b", { class: "t-2 f1-pezzo-nome", testo: PEZZO.nome });
    const daQuando = e("span", {
      class: "t-sub tenue f1-pezzo-da",
      testo: PEZZO.quando ? "Tuo dal " + PEZZO.quando : "Tuo"
    });
    const testi = e("div", { class: "f1-pezzo-testi" }, [nomePezzo, daQuando]);

    const apri = tasto("Apri", { tipo: "primario", largo: true });
    /* il render si monta mentre la persona legge la schermata; la
       cerimonia lo ASPETTA, così non parte su una scatola a metà. Al
       momento del tocco la promessa è già risolta in ogni caso reale:
       tre immagini leggere, dallo stesso server della pagina. */
    const pronto = vestiColRender(cof, coperchioDentro);
    let fatta = false;
    apri.addEventListener("click", () => {
      if (!fatta) { fatta = true; pronto.then(cerimonia, cerimonia); return; }
      vai("s2");
    });

    const sch = schermata("s1", [
      e("p", { class: "occhiello f1-occhiello", testo: codice || leggibile(ATTESO) }),
      e("h1", { class: "t-1 f1-titolo-s1", testo: "Il tuo cofanetto" }),
      e("div", { class: "f1-scena" }, [cof, testi]),
      e("div", { class: "f1-fondo" }, [apri])
    ], { pieno: true });

    /* ── LA CERIMONIA ──────────────────────────────────────────────
       Sei animazioni con la loro attesa, tutte create nello stesso
       istante: così `currentTime` di ognuna è il TEMPO DELLA SCENA, e
       una sonda che lo fissa a 700 legge davvero cio' che si vede a 700.
       Nessun suono, nessun tremore, una sola rivelazione. */
    const A = {};
    function cerimonia() {
      cof.dataset.aperto = "1";
      if (RIDOTTO.matches) {
        /* meno movimento = lo stesso picco, senza moto: una
           dissolvenza incrociata da chiuso ad aperto, e i testi
           subito. Il grado della celebrazione scende di uno, non
           sparisce (carta psicologica). */
        cof.dataset.ridotto = "1";
        coperchio.animate([{ opacity: 1 }, { opacity: 0 }],
          { duration: CERIMONIA.ridotto, easing: "linear", fill: "forwards", id: "F1-uscita" });
        luce.animate([{ opacity: 0 }, { opacity: 1 }],
          { duration: CERIMONIA.ridotto, easing: "linear", fill: "forwards", id: "F1-luce" });
        testi.animate([{ opacity: 0 }, { opacity: 1 }],
          { duration: CERIMONIA.ridotto, easing: "linear", fill: "forwards", id: "F1-testi" });
        vestiTasto(apri, "Continua");
        apri.setAttribute("aria-label", "Continua");
        annuncia(PEZZO.nome + ". " + daQuando.textContent);
        window.__cerimonia.finita = true;
        return;
      }

      /* la pressione del tasto: 80 ms a 0,98. È la prima cosa che
         dice «ti ho sentito», e viene prima di qualunque altra. */
      apri.animate([{ transform: "scale(1)" }, { transform: "scale(.98)" }, { transform: "scale(1)" }],
        { duration: CERIMONIA.pressione, easing: "linear" });

      const c = CERIMONIA;
      A.coperchio = coperchioDentro.animate(
        [{ transform: "rotateX(0deg)" }, { transform: "rotateX(" + GRADI + "deg)" }],
        { duration: c.coperchio.a - c.coperchio.da, delay: c.coperchio.da,
          easing: CURVA, fill: "both", id: "F1-coperchio" });

      /* LA DISSOLVENZA SUL FOTOGRAMMA VERO. Solo col render: la
         rotazione in CSS è fedele fino a -70, e gli ultimi 250 ms del
         tempo del coperchio servono a scambiarla col fotogramma di
         quello stesso istante — stessa macchina, stessa luce. Il
         coperchio che ruota se ne va insieme, o si vedrebbero due
         coperchi nello stesso quadro. */
      if (apertoImg) {
        const da = c.coperchio.a - c.ridotto;
        A.aperto = apertoImg.animate([{ opacity: 0 }, { opacity: 1 }],
          { duration: c.ridotto, delay: da, easing: "linear",
            fill: "both", id: "F1-aperto" });
        A.copVia = coperchioDentro.animate([{ opacity: 1 }, { opacity: 0 }],
          { duration: c.ridotto, delay: da, easing: "linear",
            fill: "both", id: "F1-coperchio-via" });
      }

      A.luce = luce.animate([{ opacity: 0 }, { opacity: 1 }],
        { duration: c.luce.a - c.luce.da, delay: c.luce.da,
          easing: CURVA, fill: "both", id: "F1-luce" });

      A.pezzo = pezzo.animate(
        [{ transform: "translateY(" + c.pezzo.alza + "px)" }, { transform: "translateY(0px)" }],
        { duration: c.pezzo.a - c.pezzo.da, delay: c.pezzo.da,
          easing: MOLLA_PEZZO.curva, fill: "both", id: "F1-pezzo" });

      A.uscita = coperchio.animate(
        [{ transform: "translateY(0%)", opacity: 1 },
         { transform: "translateY(-160%)", opacity: 0 }],
        { duration: c.uscita.a - c.uscita.da, delay: c.uscita.da,
          easing: CURVA, fill: "both", id: "F1-uscita" });

      A.testi = testi.animate(
        [{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "none" }],
        { duration: c.testi.a - c.testi.da, delay: c.testi.da,
          easing: CURVA, fill: "both", id: "F1-testi" });

      /* il tasto cambia NOME a 1400, e lo fa in dissolvenza: due parole
         che si scambiano di colpo sotto il dito sono uno sfarfallio.
         La dissolvenza chiude a 1600, che è la fine della scena. */
      A.tasto = apri.animate(
        [{ opacity: 1 }, { opacity: 0, offset: .5 }, { opacity: 1 }],
        { duration: c.fine - c.etichetta, delay: c.etichetta,
          easing: "linear", fill: "both", id: "F1-tasto" });
      setTimeout(() => {
        vestiTasto(apri, "Continua");
        apri.setAttribute("aria-label", "Continua");
      }, c.etichetta + (c.fine - c.etichetta) / 2);

      setTimeout(() => {
        window.__cerimonia.finita = true;
        annuncia(PEZZO.nome + ". " + daQuando.textContent);
      }, c.fine);
      window.__cerimonia.avviata = true;
    }

    /* la maniglia della sonda: ferma l'orologio, lo porta a `t` e
       restituisce cio' che il browser sta davvero disegnando. */
    window.__cerimonia = {
      numeri: CERIMONIA, avviata: false, finita: false,
      /* quanto ruota DAVVERO il coperchio: -105 col cofanetto in CSS,
         -70 col render (il limite dichiarato dal modulo). La sonda
         legge di qui invece di tenersi un numero in tasca. */
      get gradi(){ return GRADI; },
      get render(){ return !!apertoImg; },
      parti: () => { if (!fatta) { fatta = true; cerimonia(); } },
      a(t) {
        for (const k in A) { try { A[k].pause(); A[k].currentTime = t; } catch (_) { /* niente */ } }
        /* un giro di lettura forzata: senza, lo stile calcolato può
           essere ancora quello del fotogramma precedente. */
        void coperchioDentro.offsetHeight;
        return {
          t,
          coperchio: leggiMoto(coperchioDentro).gradi,
          aperto: apertoImg ? leggiMoto(apertoImg).opacita : null,
          luce: leggiMoto(luce).opacita,
          pezzo: leggiMoto(pezzo).y,
          uscita: leggiMoto(coperchio).y,
          testi: leggiMoto(testi).opacita,
          etichetta: apri.textContent.trim()
        };
      }
    };
    return sch;
  }

  /* ═══ S2 · LE DUE DOMANDE ════════════════════════════════════════
     Una schermata sola, due campi, nessun passo 2a/2b. L'anteprima
     dell'incisione si aggiorna a ogni tasto sul RETRO di una piccola
     tessera: è l'effetto IKEA della carta psicologica — il lavoro
     della cliente si vede mentre lo fa. */
  function s2() {
    const MAX = 12;
    const anteprima = e("span", { class: "t-2 f1-incisa", testo: "" });
    const contatore = e("span", { class: "t-cap2 cifra f1-conta", testo: "0/" + MAX });

    const campoNome = e("input", {
      class: "f1-testo", type: "text", maxlength: MAX, id: "f1-nome",
      autocomplete: "given-name", autocapitalize: "words", spellcheck: false,
      "aria-describedby": "f1-nome-nota"
    });
    campoNome.addEventListener("input", () => {
      nome = campoNome.value.trim();
      anteprima.textContent = nome;
      contatore.textContent = campoNome.value.length + "/" + MAX;
      salva();
    });

    const campoData = e("input", {
      class: "f1-testo", type: "date", id: "f1-data",
      /* il selettore a ruota di iOS è quello di sistema: un calendario
         nostro sarebbe più brutto e meno familiare. */
      max: "2100-12-31", min: "1900-01-01"
    });
    campoData.addEventListener("change", () => { quando = campoData.value; salva(); });
    campoData.addEventListener("input", () => { quando = campoData.value; salva(); });

    function salva() {
      store.invia("ingresso/dati", { nome: nome || null, ricorrenza: quando || null });
    }

    const avanti = tasto("Continua", {
      tipo: "primario", largo: true, suClick: () => { salva(); vai("s3"); }
    });
    const fondo = e("div", { class: "f1-fondo f1-fondo-tastiera" }, [
      avanti,
      e("p", { class: "t-foot tenue f1-nota-fondo", testo: "Puoi cambiarle dal cofanetto." })
    ]);

    const sch = schermata("s2", [
      e("h1", { class: "t-1 f1-titolo-s1", testo: "Due cose, poi è tuo." }),
      e("p", { class: "t-sub tenue f1-sotto", testo: "Servono per l’incisione e per ricordarci di te." }),

      e("div", { class: "f1-gruppo" }, [
        e("label", { class: "occhiello f1-etichetta", for: "f1-nome", testo: "Nome per l’incisione" }),
        e("div", { class: "f1-campo f1-campo-conta" }, [campoNome, contatore]),
        e("p", { class: "t-foot tenue", id: "f1-nome-nota", testo: "Comparirà così sul retro." }),
        /* IL RETRO DELLA TESSERA, in piccolo. Non un'illustrazione: la
           stessa materia della tessera vera di S3, girata. */
        e("div", { class: "f1-retro", "aria-hidden": "true" }, [anteprima])
      ]),

      e("div", { class: "f1-gruppo" }, [
        e("label", { class: "occhiello f1-etichetta", for: "f1-data", testo: "Una data" }),
        e("div", { class: "f1-campo" }, [campoData])
      ]),
      fondo
    ]);

    /* ── IL TASTO SOPRA LA TASTIERA ────────────────────────────────
       Su iOS la tastiera non rimpicciolisce la finestra: copre. Il
       tasto resterebbe sotto, e chi ha appena scritto il proprio nome
       non troverebbe come andare avanti. `visualViewport` dice quanto
       ne resta scoperto, e il fondo si alza di quella differenza. */
    const vv = window.visualViewport;
    if (vv) {
      const segui = () => {
        const coperto = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
        fondo.style.transform = coperto > 40 ? "translateY(-" + Math.round(coperto) + "px)" : "";
        fondo.dataset.alzato = coperto > 40 ? "1" : "";
      };
      vv.addEventListener("resize", segui);
      vv.addEventListener("scroll", segui);
      sch.__stacca = () => {
        vv.removeEventListener("resize", segui);
        vv.removeEventListener("scroll", segui);
      };
    }
    setTimeout(() => { try { campoNome.focus(); } catch (_) { /* niente */ } }, T_SCHERMATA + 40);
    return sch;
  }

  /* ═══ S3 · LA TESSERA ════════════════════════════════════════════
     Anteprima FEDELE del pass nel registro di Apple Wallet: fondo
     crema (mai bianco piatto, dice la HIG), il marchio nel campo del
     logo, il campo primario col codice, i secondari col nome e il
     livello, il credito in alto a destra, il codice a barre
     RETTANGOLARE in basso (mai quadrato).

     PERCHÉ IL TASTO NON AGGIUNGE DAVVERO NIENTE. Un pass vero è un
     `.pkpass` FIRMATO con il certificato Pass Type ID di Apple
     intestato a Regina: senza quel certificato — che si chiede
     dall'account sviluppatore del negozio — nessun file si apre in
     Wallet, e un tasto che finge di aggiungerlo sarebbe una bugia al
     primo tocco. Finché non c'è, il tasto dice la verita' in un
     foglio. Il badge è disegnato a filo secondo le regole Apple
     (nero, altezza 50, testo bianco, mai animato, mai attenuato): il
     giorno del certificato si sostituisce con l'SVG ufficiale.

     E1: LA CARTA NON È PIÙ SCRITTA QUI. La disegna
     `app/ui/tessera.js`, che è la stessa di R0 e del foglio del
     livello — stesso HTML, dati diversi. Qui resta cio' che è di S3:
     il badge, il foglio onesto e «Più tardi». */
  function s3() {
    const nomeInciso = nome || cliente.nome_incisione || cliente.nome || "";
    const liv = (store.leggi().livelli || [])
      .filter((l) => (cliente.speso_totale || 0) >= (l.soglia ?? l.soglia_spesa ?? 0)).pop();
    const credito = store.soldi(cliente.credito || 0);
    const numero = codice || leggibile(ATTESO);

    /* QUI LA CARTA SI GIRA, e in nessun altro posto dell'app si impara
       a farlo: il retro — il codice a barre e «Mostra al banco» — è
       cio' che si porge in negozio, e un gesto che nessuno ha mai visto
       non esiste. In R0 lo stesso oggetto fa un'altra cosa (apre il
       credito), e va bene: lì la carta è una riga di elenco
       travestita da carta, qui è la carta. */
    const carta = tessera({
      codice: numero,
      nome: nomeInciso,
      livello: (liv && liv.nome) || "Primo",
      credito,
      fodera: FODERA,
      retro: { codice: numero }
    }, {
      etichetta: "La tua tessera: " + numero +
        (nomeInciso ? ", " + nomeInciso : "") + ", credito " + credito +
        ". Tocca per girarla e vedere il codice da mostrare al banco."
    });

    /* il badge. Nero, 50 di altezza, testo bianco, spazio libero >= 5
       (0,1x l'altezza): sono le misure delle linee guida. Il segno è
       il nostro «tessera», non il marchio Apple — quello si può usare
       solo dentro il badge ufficiale, e il badge ufficiale arriva col
       certificato. */
    const badge = e("button", {
      type: "button", class: "f1-badge",
      "aria-label": "Aggiungi la tessera al Wallet",
      suClick: () => apriFoglio({
        titolo: "La tessera",
        contenuto: e("div", { class: "pagina f1-foglio" }, [
          e("p", { class: "t-body", testo: "Nella prova la tessera si aggiunge dal negozio." }),
          e("p", { class: "t-sub tenue", testo: "Il pass vero è un file firmato con il certificato Apple intestato a Regina. Appena il negozio lo attiva, questo tasto lo aggiunge davvero al Wallet." }),
          /* il foglio è informativo, non un vicolo: si chiude e
             l'ingresso prosegue come dopo «Più tardi». */
          tasto("Ho capito", { tipo: "primario", largo: true,
            suClick: () => { chiudiFoglio(); setTimeout(finisci, 320); } })
        ])
      })
    }, [
      segno("tessera", { misura: 20 }),
      e("span", { class: "f1-badge-testo", testo: "Aggiungi a Wallet" })
    ]);

    const dopo = tasto("Più tardi", {
      tipo: "terziario", suClick: () => finisci()
    });

    return schermata("s3", [
      e("h1", { class: "t-1 f1-titolo-s1", testo: "La tua tessera" }),
      e("p", { class: "t-sub tenue f1-sotto", testo: "Nel Wallet, come le carte d’imbarco. Senza app da cercare." }),
      e("div", { class: "f1-pass-posto" }, [carta]),
      e("div", { class: "f1-fondo" }, [badge, dopo])
    ], { pieno: true });
  }

  /* ═══ LA SCHERMATA, COME CONTENITORE ═════════════════════════════
     Entra in 320 ms con 24 pt di scorrimento e una dissolvenza; i
     testi la seguono in stagger da 40. Una schermata che esce non si
     anima: sotto c'è quella nuova, e due cose che si muovono insieme
     in direzioni diverse sono rumore. */
  function schermata(id, figli, opz = {}) {
    const n = e("div", {
      class: "f1-s f1-" + id + (opz.pieno ? " pieno" : ""),
      "data-schermata": id
    }, figli);
    return n;
  }

  function entra(n) {
    if (RIDOTTO.matches) return;
    n.animate([{ opacity: 0, transform: "translateY(" + SCORRE + "px)" },
               { opacity: 1, transform: "none" }],
      { duration: T_SCHERMATA, easing: CURVA });
    const pezzi = [...n.children].slice(0, 6);
    pezzi.forEach((p, i) => p.animate(
      [{ opacity: 0 }, { opacity: 0, offset: Math.min(.6, i * STAGGER / T_SCHERMATA) }, { opacity: 1 }],
      { duration: T_SCHERMATA + i * STAGGER, easing: CURVA }));
  }

  /* ═══ LA FILA ════════════════════════════════════════════════════ */
  const COSTRUISCI = { s0, s1, s2, s3 };
  const TITOLI = {
    s0: "Il tuo cofanetto ti aspetta", s1: "Il tuo cofanetto",
    s2: "Due cose, poi è tuo", s3: "La tua tessera"
  };

  function mostra(id) {
    const vecchia = radice.firstElementChild;
    if (vecchia && vecchia.__stacca) vecchia.__stacca();
    svuota(radice);
    const n = COSTRUISCI[id]();
    radice.appendChild(n);
    corrente = id;
    radice.dataset.schermata = id;
    entra(n);
    annuncia(TITOLI[id]);
    const h = n.querySelector("h1");
    if (h) {
      if (!h.hasAttribute("tabindex")) h.setAttribute("tabindex", "-1");
      setTimeout(() => { try { h.focus({ preventScroll: true }); } catch (_) { /* niente */ } }, 30);
    }
  }

  /* un PUSH per schermata: il tasto indietro del telefono e il gesto
     dal bordo devono tornare alla precedente, e l'unico modo perché lo
     facciano è che ogni passo avanti abbia lasciato un passo da fare
     all'indietro. La prima, no: a s0 «indietro» esce dall'app. */
  function vai(id, modo) {
    if (!COSTRUISCI[id] || chiuso) return;
    const h = "#/ingresso/" + id;
    try {
      if (modo === "sostituisci" || location.hash === h) history.replaceState(null, "", h);
      else history.pushState(null, "", h);
    } catch (_) { /* niente */ }
    mostra(id);
  }

  function seguiIndirizzo() {
    if (chiuso) return;
    const m = location.hash.match(/^#\/ingresso\/(s[0-3])$/);
    if (m) { if (m[1] !== corrente) mostra(m[1]); return; }
    /* fuori dalla fila mentre l'ingresso non è finito: la porta tiene.
       Si rimette l'indirizzo dov'era, senza aggiungere un passo. */
    try { history.replaceState(null, "", "#/ingresso/" + corrente); } catch (_) { /* niente */ }
  }
  addEventListener("popstate", seguiIndirizzo);
  addEventListener("hashchange", seguiIndirizzo);

  /* ═══ LA FINE: LA BARRA SALE ═════════════════════════════════════ */
  async function finisci() {
    if (chiuso) return;
    chiuso = true;
    store.invia("ingresso/fatto", { quando: new Date().toISOString() });
    removeEventListener("popstate", seguiIndirizzo);
    removeEventListener("hashchange", seguiIndirizzo);

    const vecchia = radice.firstElementChild;
    if (vecchia && vecchia.__stacca) vecchia.__stacca();

    /* l'ingresso esce in dissolvenza e la barra sale da sotto: +56 pt
       con la molla a 420 ms, smorzamento 0,85. Non è l'ingresso che
       «finisce»: è l'app che comincia, e la barra è cio' che lo dice. */
    const barra = document.getElementById("barra");
    const via = RIDOTTO.matches
      ? radice.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 150, easing: "linear", fill: "forwards" })
      : radice.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 250, easing: CURVA, fill: "forwards" });

    delete document.body.dataset.ingresso;
    if (barra) {
      if (RIDOTTO.matches) { barra.style.transform = ""; }
      else {
        barra.style.transform = "translateY(" + BARRA_SALITA + "px)";
        await dueGiri();
        molla(BARRA_SALITA, 0, {
          omega: BARRA_OMEGA, zeta: BARRA_ZETA,
          passo: (v) => { barra.style.transform = "translateY(" + v.toFixed(2) + "px)"; },
          fine: () => { barra.style.transform = ""; if (window.__barra) window.__barra.posa(true); }
        });
      }
    }
    try { await via.finished; } catch (_) { /* niente */ }
    radice.remove();
    try { history.replaceState(null, "", "#/cofanetto"); } catch (_) { /* niente */ }
    dispatchEvent(new HashChangeEvent("hashchange"));
    if (window.__vai) window.__vai("cofanetto");
    annuncia("Il tuo cofanetto.");

    /* IL BANNER ARRIVA DOPO IL VALORE, non prima: 1,5 s dopo la
       tessera, una volta sola (web.dev: «wait until user demonstrates
       interest», memorizzato, mai come tasto «Installa»). */
    setTimeout(() => bannerInHome(store), 1500);
  }

  /* ═══ L'AVVIO DELLA FILA ═════════════════════════════════════════
     Chi arriva col codice in mano (`?c=RJ00042`, o `#/c/<codice>`: è
     il link che la cassa manda per SMS) entra direttamente sulla
     consegna. Il codice si accetta scritto in qualunque modo. */
  const q = new URLSearchParams(location.search);
  const daLink = soloCifre(q.get("c") || (location.hash.match(/^#\/c\/(.+)$/) || [])[1] || "");
  if (daLink && daLink === ATTESO) {
    codice = leggibile(daLink);
    store.invia("ingresso/codice", { codice });
    vai("s1", "sostituisci");
  } else {
    const m = location.hash.match(/^#\/ingresso\/(s[0-3])$/);
    vai(m ? m[1] : "s0", "sostituisci");
  }

  /* la maniglia dichiarata, come le altre */
  window.__ingresso = {
    get schermata() { return corrente; },
    get chiuso() { return chiuso; },
    vai: (id) => vai(id),
    codiceAtteso: ATTESO,
    finisci
  };
  return window.__ingresso;
}

/* ═══════════════════════════════════════════════════════════════════
   F1.4 · IL BANNER «TIENI REGINA IN HOME»

   iOS non ha un'API di installazione né un banner di sistema: l'invito
   è nostro, ed è DIDATTICO — tre mosse da leggere, non un tasto
   «Installa» che non esiste. Sale dal basso sopra la barra, resta
   finché non lo si chiude (non è uno snackbar: ha del testo), e non
   torna prima di 90 giorni. Se l'app è già in Home — `display-mode:
   standalone` — non esiste affatto: sarebbe un invito a fare una cosa
   già fatta.
   ═══════════════════════════════════════════════════════════════════ */
const NOVANTA = 90 * 24 * 60 * 60 * 1000;

export function bannerInHome(store) {
  if (matchMedia("(display-mode: standalone)").matches) return null;
  if (navigator.standalone) return null;          /* iOS 17/18 */
  const s = store.leggi();
  const visto = s && s.ingresso && s.ingresso.banner;
  if (visto && (Date.now() - Date.parse(visto)) < NOVANTA) return null;
  if (document.getElementById("f1-banner")) return null;

  /* la prima mossa cambia col sistema: da iOS 26 la scorciatoia è il
     «⋯» accanto alla barra degli indirizzi, prima era il quadrato con
     la freccia al centro della barra. Il segno «condividi» della
     libreria è quel quadrato, ed è quello che la gente riconosce. */
  const passo = (sg, testo) => e("div", { class: "f1-passo" }, [sg, e("span", { class: "t-foot", testo })]);

  /* il secondo segno — il quadrato col più — non sta nella libreria:
     è l'unico posto dell'app dove serve, ed è disegnato con la stessa
     penna del sistema (griglia 24, area viva 20, tratto 1,7, giunti
     tondi). Quando F8 rifara' la taratura dei pesi ottici entrera' in
     `app/ui/segni.js` con la sua scala. */
  const quadratoPiu = () => {
    const t = document.createElement("template");
    t.innerHTML = '<svg class="segno-filo m20" viewBox="0 0 24 24" aria-hidden="true" ' +
      'fill="none" stroke="currentColor">' +
      '<rect x="3.6" y="3.6" width="16.8" height="16.8" rx="4.6"/>' +
      '<path d="M12 8.2v7.6"/><path d="M8.2 12h7.6"/></svg>';
    return t.content.firstElementChild;
  };

  const chiudi = () => {
    store.invia("ingresso/banner", { quando: new Date().toISOString() });
    if (RIDOTTO.matches) { n.remove(); return; }
    n.animate([{ transform: "none", opacity: 1 },
               { transform: "translateY(120%)", opacity: 0 }],
      { duration: 250, easing: CURVA, fill: "forwards" })
      .finished.then(() => n.remove(), () => n.remove());
  };

  const n = e("div", {
    id: "f1-banner", class: "f1-banner", "data-tema": "chiaro", role: "dialog",
    "aria-label": "Tieni Regina in Home"
  }, [
    e("div", { class: "f1-banner-testa" }, [
      /* NIENTE LOGO QUI. A 19 punti l'icona era il marchio ridotto che
         il canone non ammette, e non diceva niente che la frase sotto
         non dicesse già: il banner sta sopra l'app di Regina. La riga
         comincia dalla frase (verdetto del critic, 15/09). */
      e("b", { class: "t-sub", testo: "Tieni Regina in Home" }),
      tasto("Non ora", { tipo: "terziario", suClick: chiudi })
    ]),
    e("div", { class: "f1-banner-mosse" }, [
      passo(segno("condividi", { misura: 20 }), "Condividi"),
      segno("chevron", { misura: 14, classe: "f1-freccia" }),
      passo(quadratoPiu(), "Aggiungi alla schermata Home"),
      segno("chevron", { misura: 14, classe: "f1-freccia" }),
      passo(segno("spunta", { misura: 20 }), "Aggiungi")
    ])
  ]);
  document.body.appendChild(n);
  if (!RIDOTTO.matches)
    n.animate([{ transform: "translateY(120%)", opacity: 0 }, { transform: "none", opacity: 1 }],
      { duration: T_SCHERMATA, easing: CURVA });
  annuncia("Tieni Regina in Home: condividi, aggiungi alla schermata Home, aggiungi.");

  /* si chiude anche scorrendolo in basso: è il gesto che la gente
     prova per primo su una cosa che è salita dal fondo. */
  let y0 = null;
  n.addEventListener("pointerdown", (ev) => { if (ev.isPrimary) y0 = ev.clientY; }, { passive: true });
  n.addEventListener("pointerup", (ev) => {
    if (y0 !== null && ev.clientY - y0 > 40) chiudi();
    y0 = null;
  }, { passive: true });
  return n;
}

/* ═══════════════════════════════════════════════════════════════════
   F1.3 · LA RIGA DEL RITORNO — cosa dirle, e quando non dirle niente.

   Si confronta la FOTOGRAFIA dell'ultima apertura con i dati di adesso.
   Tre fatti, in quest'ordine: un pezzo nuovo nel cofanetto, il credito
   cambiato, una collezione arrivata a un pezzo dalla chiusura. Se non
   è cambiato niente, non torna NIENTE — il silenzio è la forma
   corretta del «bentornata» (Twitter la mostrava a chi mancava, non a
   chi c'era). Mai i giorni contati, mai «ci sei mancato».
   ═══════════════════════════════════════════════════════════════════ */
export function fotografia(store) {
  const s = store.leggi();
  const vivi = (s.esemplari || []).filter((x) => !x.rimosso && x.stato !== "venduto");
  const posseduti = new Set(vivi.map((x) => x.articolo));
  const auno = [];
  const mappa = store.collezioni || {};
  for (const id of Object.keys(mappa)) {
    const el = (mappa[id] && mappa[id].pezzi) || [];
    if (!el.length) continue;
    const ha = el.filter((p) => posseduti.has(p)).length;
    if (ha && el.length - ha === 1) auno.push(id);
  }
  return {
    pezzi: vivi.length,
    credito: (s.cliente && s.cliente.credito) || 0,
    auno: auno.sort()
  };
}

export function riga(store, prima) {
  if (!prima) return null;                /* prima volta: niente da dire */
  const ora = fotografia(store);
  const s = store.leggi();

  if (ora.pezzi > prima.pezzi) {
    const n = ora.pezzi - prima.pezzi;
    return n === 1
      ? "Nel cofanetto c’è un pezzo in più."
      : "Nel cofanetto ci sono " + n + " pezzi in più.";
  }
  if (ora.credito !== prima.credito) {
    const d = ora.credito - prima.credito;
    return d > 0
      ? "Regina ti ha riconosciuto " + store.soldi(d) + "."
      : "Hai usato " + store.soldi(-d) + " di credito.";
  }
  const nuove = ora.auno.filter((x) => !prima.auno.includes(x));
  if (nuove.length) {
    const c = (store.collezioni || {})[nuove[0]] || {};
    return "A " + (c.nome || "una collezione") + " manca un pezzo solo.";
  }
  /* il livello è un fatto quanto gli altri, e si vede dal nome */
  if (s.cliente && prima.livello && s.cliente.livello !== prima.livello) {
    return "Sei salita di livello.";
  }
  return null;
}
