/* ═══════════════════════════════════════════════════════════════════
   app/viste/vetrina.js — F4 · LA VETRINA.

   Il negozio dentro l'app, e non è un e-commerce: 34 pezzi a due
   colonne sono sei schermate scarse, e su sei schermate la ricerca,
   l'ordinamento e il foglio dei filtri sono rumore da marketplace
   (reference 47, §0). Un asse solo di filtro — la famiglia — e il chip
   acceso È il filtro applicato.

   Quattro schermate, e una quinta che non è nostra:
     · IL CATALOGO, radice del tab.               #/vetrina
     · IL PEZZO, spinto da destra.                #/vetrina/pezzo/<id>
     · DA PARTE, la lista.                        #/vetrina/lista
     · IL NEGOZIO.                                #/vetrina/negozio
     · LA LISTA DI CHI REGALA, senza conto.       #/l/<token>
   La stanza della vetrina in tre dimensioni NON si fa (reference 47,
   §4.5): dodici pezzi su trentaquattro non hanno un modello, e una
   stanza che mente su un terzo della merce è peggio di nessuna stanza.

   ── COME LE ROTTE STANNO IN PIEDI ───────────────────────────────────
   `app/rotta.js` legge l'indirizzo a COPPIE (`tipo/id`): `pezzo/<id>`
   ci sta, `lista` e `negozio` no — sono un segmento solo. `spingi()`
   però li accetta (guarda solo il tipo) e li scrive nell'indirizzo, e
   il ritorno funziona perché una pila più lunga dell'indirizzo si
   accorcia da sola. Quello che NON funziona da solo è l'ingresso
   diretto da fuori: `avviaRotta` non le ricostruisce. Perciò questa
   vista si legge l'indirizzo di partenza PRIMA che il navigatore lo
   riscriva (`INDIRIZZO_0`, valutato all'importazione) e spinge lei.
   Nessuna riga di `rotta.js` è stata toccata.

   `#/l/<token>` non è nemmeno un tab: è la pagina di chi ha ricevuto
   il link e non ha l'app. Vive come STRATO SOPRA tutto, comandato
   dall'indirizzo, e si comporta bene con il navigatore perché entra e
   esce sempre attraverso un cambio di TAB (il navigatore, su un tab che
   non riconosce, ripiega su `cofanetto`): quel ramo di `popstate`
   esce prima di toccare le pile, quindi la pila della vetrina resta
   dov'era.

   ── LO STORE, DAL 15/09, CE L'HA ────────────────────────────────────
   La messa da parte era `wishlist/aggiungi`: un insieme di id, senza
   data — e una riserva senza scadenza non è una riserva. Le quattro
   azioni che servivano (`daparte/aggiungi|togli|confermato`,
   `lista/inviata`) erano scritte qui come funzioni PURE, pronte da
   fondere; F3b le ha fuse nel riduttore di `app/stato.js`. Da qui si
   inviano e basta, e la scadenza e lo stato «Inviata» sopravvivono al
   ricarico invece di vivere in memoria per la sola sessione.
   ═══════════════════════════════════════════════════════════════════ */

import { e, annuncia } from "app/ui/dom.js";
import { segno } from "app/ui/segni.js";
import { cella, lista } from "app/ui/cella.js";
import { vuoto } from "app/ui/vuoto.js";
import { tasto, vestiTasto } from "app/ui/tasto.js";
import { toast } from "app/ui/toast.js";
import { apriFoglio, chiudiFoglio } from "app/ui/foglio.js";
import { schermo } from "app/ui/barra-nav.js";
import { spingi, registraSchermo, torna, vaiA, tabCorrente } from "app/rotta.js";
import { misura, flip, RIDOTTO } from "app/moto.js";
import { diAlBanco } from "app/canale3d.js";
import { NEGOZIO } from "app/dati/negozio.js";

/* ── IL FOGLIO DI STILE DELLA VISTA ────────────────────────────────
   Si porta il suo, e se lo mette da solo: il telaio non deve sapere che
   esiste una fase 4. Il timbro di versione è quello del modulo — se
   l'importazione è `?v=2026-09-15c`, il CSS arriva con lo stesso
   timbro, e non capita mai di servire il foglio vecchio col codice
   nuovo. */
(function vestiti(){
  if(document.querySelector('link[data-f4="vetrina"]')) return;
  const u = new URL("vetrina.css", import.meta.url);
  u.search = new URL(import.meta.url).search;
  document.head.append(e("link",
    {rel:"stylesheet", href:u.href, "data-f4":"vetrina"}));
})();

/* L'INDIRIZZO COM'ERA AL PRIMO ISTANTE. Va letto ADESSO, all'importazione:
   `avviaRotta()` lo riscrive di lì a poco. */
const INDIRIZZO_0 = location.hash;

/* ════════════════════════════════════════════════════════════════
   LE AZIONI SONO NELLO STORE (F3b, 15/09).
   Fino alla fusione stavano qui, come funzioni pure pronte da
   trapiantare: `daparte/aggiungi|togli|confermato` e `lista/inviata`.
   Adesso sono nel riduttore di `app/stato.js`, e da qui si INVIANO e
   basta. Il ponte in memoria che teneva le scadenze per la sola
   sessione è stato tolto: una riserva che spariva al ricarico non era
   una riserva, era una schermata.
   `TENUTA_GIORNI` resta di questa vista perché è una regola del
   NEGOZIO (sette giorni di tenuta), non una regola dei dati: chi invia
   calcola la scadenza, il riduttore la scrive e basta.
   ════════════════════════════════════════════════════════════════ */
export const TENUTA_GIORNI = 7;

/* I FATTI DEL NEGOZIO stanno in `app/dati/negozio.js` dal 15/09: li
   leggono anche l'Ingresso (il ramo umano del quinto tentativo) e le
   Azioni della carta (assistenza, condividi). Tre copie dello stesso
   numero di telefono sono tre numeri che un giorno saranno diversi.
   Vero e inventato restano separati la', riga per riga. */
const ORDINE_GIORNI = [1, 2, 3, 4, 5, 6, 0];

/* L'ORDINE DELLE FAMIGLIE È DICHIARATO, non dedotto: dedotto
   cambierebbe da solo il primo chip il giorno che arriva un orologio
   prima di una collana, e un filtro che si riordina non si impara.
   (stessa scelta, stessa riga, di `viste/cofanetto.js`.) */
const FAMIGLIE = ["Anelli", "Orecchini", "Collane", "Bracciali", "Orologi"];

/* ── IL TEMPO, detto come lo dice una persona ──────────────────────── */
const due = (n) => String(n).padStart(2, "0");
const gg = (d) => due(d.getDate()) + "/" + due(d.getMonth() + 1);
const isoDi = (d) => d.getFullYear() + "-" + due(d.getMonth()+1) + "-" + due(d.getDate());
const daIso = (s) => { const p = String(s || "").split("-"); return p.length === 3
  ? new Date(+p[0], +p[1] - 1, +p[2]) : null; };
const piuGiorni = (d, n) => { const x = new Date(d.getTime()); x.setDate(x.getDate() + n); return x; };
const oggi = () => { const d = new Date(); d.setHours(0,0,0,0); return d; };

/* ── I SOLDI E LE PAROLE ───────────────────────────────────────────── */
const pezziDetti = (n) => n + (n === 1 ? " pezzo" : " pezzi");

/* ── I NUMERI DETTI A PAROLE ───────────────────────────────────────
   «Ventidue pezzi in tre dimensioni», non «22 pezzi»: la riga
   d'apertura del catalogo è una FRASE — Bodoni 22, la voce del
   negozio — e una cifra in mezzo a una frase è un'etichetta di
   magazzino. Zero-novantanove basta e avanza: il catalogo di Regina sta
   in due cifre, e il giorno che non ci stara' la riga uscira' in cifre
   e si vedra' subito. Il NUMERO È VERO: si conta il catalogo, non si
   scrive «ventidue» a mano (il giorno che i modelli diventano ventitre'
   la frase lo dice da sola). */
const UNITA = ["zero", "uno", "due", "tre", "quattro", "cinque", "sei", "sette",
  "otto", "nove", "dieci", "undici", "dodici", "tredici", "quattordici",
  "quindici", "sedici", "diciassette", "diciotto", "diciannove"];
const DECINE = ["", "", "venti", "trenta", "quaranta", "cinquanta", "sessanta",
  "settanta", "ottanta", "novanta"];
function aParole(n){
  n = Math.max(0, Math.round(Number(n) || 0));
  if(n < 20) return UNITA[n];
  if(n > 99) return String(n);
  const d = Math.floor(n / 10), u = n % 10;
  /* l'elisione dell'italiano: ventuno, ventotto — la vocale finale
     della decina cade davanti a «uno» e a «otto». */
  const base = (u === 1 || u === 8) ? DECINE[d].slice(0, -1) : DECINE[d];
  return base + (u ? UNITA[u] : "");
}
const conMaiuscola = (s) => String(s).charAt(0).toUpperCase() + String(s).slice(1);

/* la misura che si mostra in una riga: quello che il pezzo ha davvero.
   Un campo che non c'è NON diventa «non disponibile»: la riga non
   esiste (reference 47, anti-pattern 5). */
function misureDi(p){
  const a = p.attributi || {};
  const righe = [];
  if(a.misura) righe.push(["Misura", String(a.misura)]);
  if(a.lunghezza_cm) righe.push(["Lunghezza", a.lunghezza_cm + " cm"]);
  if(a.diametro_mm) righe.push(["Diametro", a.diametro_mm + " mm"]);
  if(a.peso_g) righe.push(["Peso", a.peso_g + " g"]);
  if(a.quadrante) righe.push(["Quadrante", String(a.quadrante)]);
  if(a.impermeabilita) righe.push(["Impermeabilità", String(a.impermeabilita)]);
  return righe;
}
/* la materia in poche parole: la `materia` dei dati porta già la
   misura in coda («… · misura 14»), e in una riga che dice la misura
   accanto sarebbe detta due volte. */
const materiaCorta = (p) => String(p.materia || "").split(" · ")[0];
/* LA RISERVA DELLA MATERIA, quando due righe da 13 non bastano. Non è
   un troncamento con tre puntini — «…cabocho…» non dice niente a
   nessuno — è la materia PRINCIPALE: quello che il pezzo È, prima di
   quello che porta addosso. «Acciaio dorato e cabochon turchese»
   diventa «Acciaio dorato». Si applica SOLO se la cella misurata sfora
   davvero (vedi `sistemaMaterie`), mai per prudenza. */
const materiaPrincipale = (t) => {
  const s = String(t || "");
  const p = s.split(/\s+e\s+/i)[0].trim();
  return p || s;
};
const misuraCorta = (p) => {
  const a = p.attributi || {};
  if(a.misura) return "Misura " + a.misura;
  if(a.lunghezza_cm) return a.lunghezza_cm + " cm";
  if(a.diametro_mm) return a.diametro_mm + " mm";
  return "";
};
const codiceDi = (p) => p.codice_scena || p.codice_fornitore || p.id;

/* ── IL SEGNO «3D» ─────────────────────────────────────────────────
   Un cubo a filo sulla griglia 24, area viva 20, terminali piatti: le
   stesse regole di `app/ui/segni.js`, che non si tocca (altri esecutori
   ci lavorano). Vive qui perché serve a una vista sola. */
const CUBO = '<path d="M12 3.2 20 7.6 12 12 4 7.6Z"/>' +
             '<path d="M4 7.6v8.8L12 20.8l8-4.4V7.6"/><path d="M12 12v8.8"/>';
function segnoCubo(misuraPx = 14){
  const t = document.createElement("template");
  t.innerHTML = '<svg class="segno-filo' + (misuraPx !== 24 ? " m" + misuraPx : "") +
    '" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor">' +
    CUBO + "</svg>";
  return t.content.firstElementChild;
}

/* ── LA FOTOGRAFIA, O IL REDATTO ───────────────────────────────────
   Dodici articoli su trentaquattro non hanno uno scatto (Regina non ha
   packshot: gli scatti veri ritraggono la collezione). Il posto lo
   tiene un redatto MONOCROMO e FERMO col nome dentro — la regola 5
   vieta lo shimmer, e un rettangolo muto non dice quale pezzo è. */
/* GLI SCATTI DI UN PEZZO, uno o più. `app/innesto.js` schiaccia
   l'elenco `foto:[{tipo,src}]` dei dati su un indirizzo solo (`foto`
   come stringa), quindi oggi la galleria ha quasi sempre UNA pagina:
   si legge l'elenco se per caso c'è ancora, altrimenti l'indirizzo
   singolo. Il giorno che l'innesto tiene anche l'elenco (`scatti`), le
   pagine diventano tante senza toccare una riga di qui. */
function scattiDi(p){
  const da = Array.isArray(p.scatti) ? p.scatti
           : Array.isArray(p.foto) ? p.foto : null;
  if(da){
    const v = da.map(f => typeof f === "string" ? f : (f && f.src))
               .filter(Boolean);
    if(v.length) return v;
  }
  const uno = typeof p.foto === "string" && p.foto ? p.foto : (p.foto_url || null);
  return uno ? [uno] : [];
}

function figura(p, classe){
  const senza = () => e("div", {class:"redatto senza-foto " + classe},
    [e("span", {testo:p.nome})]);
  const src = scattiDi(p)[0];
  if(!src) return senza();
  const img = e("img", {class:"fig " + classe, src, alt:"",
    loading:"lazy", decoding:"async"});
  img.addEventListener("error", () => img.replaceWith(senza()), {once:true});
  return img;
}

/* ═══════════════════════════════════════════════════════════════════
   IL MONTAGGIO
   ═══════════════════════════════════════════════════════════════════ */
export function monta(el, store){
  const {leggi, invia, iscrivi, soldi} = store;
  const catalogo = store.catalogo || [];
  const perId = new Map(catalogo.map(a => [a.id, a]));
  const seme = store.seme || {};
  const dettagli = seme.wishlist_dettagli || {};

  /* gli arrivi veri: l'occhiello «Nuovo» si mette a chi il negozio ha
     davvero appena ricevuto, non a chi ci fa comodo. */
  const nuovi = new Set((seme.arrivi || []).map(a => a.id).filter(Boolean));

  /* ── LA MESSA DA PARTE, DALLO STORE ──────────────────
     La scadenza sta in `s.daparte`, e ci sta da quando F3b ha fuso le
     azioni nel riduttore: sopravvive al ricarico, che è tutto cio' che
     le si chiedeva.
     IL SEME RESTA UNA SORGENTE, e non è un doppione: le riserve che il
     negozio ha già aperto arrivano dai dati (`wishlist_dettagli`, con
     la loro data vera) e non sono mai passate da un tocco in questa
     app. Prima si guarda cio' che la persona ha fatto qui, poi cio' che
     il negozio aveva già scritto. */
  const daSeme = (id) => {
    const d = dettagli[id] || {};
    return d.tenuto_fino || d.scadenza || d.ritiro_entro ||
      (d.creata_il ? isoDi(piuGiorni(daIso(d.creata_il), TENUTA_GIORNI)) : null);
  };
  const scadenzaDi = (id) => {
    const r = (leggi().daparte || []).find(x => x.id === id);
    return (r && r.fino) || daSeme(id) || null;
  };
  /* «fino al 22/09» solo se la data è ancora davanti. Una riserva
     scaduta non si annuncia come viva: si dice quello che è vero, cioè
     che il negozio non l'ha ancora confermata. */
  function statoDaParte(id){
    const f = scadenzaDi(id);
    const d = f ? daIso(f) : null;
    if(d && d >= oggi()) return {testo:"fino al " + gg(d), viva:true};
    return {testo:"In attesa", viva:false};
  }
  const inLista = (id) => (leggi().wishlist || []).includes(id);
  /* LA LISTA È PARTITA UNA VOLTA SOLA, e il momento è un fatto dello
     store: il tasto legge quello, non una variabile di questa sessione. */
  const inviataIl = () => { const l = leggi().lista; return (l && l.inviata_il) || null; };

  /* UN EVENTO SOLO, e porta la data. `daparte/aggiungi` mette il pezzo
     anche in `wishlist` (e `daparte/togli` lo toglie da tutt'e due), per
     cui chi legge solo la lista - `viste/cofanetto.js` - continua a
     vedere quello che vedeva. */
  function mettiDaParte(id){
    const d0 = oggi(), fino = piuGiorni(d0, TENUTA_GIORNI);
    invia("daparte/aggiungi", {id, dal:isoDi(d0), fino:isoDi(fino)});
    return gg(fino);
  }
  function togliDaParte(id){ invia("daparte/togli", {id}); }

  /* il token del link da girare a chi regala: è dei dati (il gestionale
     lo genera già), non se ne inventa uno. */
  const TOKEN = (() => {
    for(const k of Object.keys(dettagli)) if(dettagli[k] && dettagli[k].token)
      return dettagli[k].token;
    return "wl-" + (seme.cliente && seme.cliente.tessera_numero || 0);
  })();
  const nomeCliente = (seme.cliente && seme.cliente.nome) || "la cliente";

  /* ── I LINK VERSO FUORI ─────────────────────────────────────────── */
  const wa = (testo) =>
    "https://wa.me/" + NEGOZIO.whatsapp + "?text=" + encodeURIComponent(testo);
  const mappe = "https://maps.apple.com/?daddr=" +
    encodeURIComponent(NEGOZIO.via + ", " + NEGOZIO.citta) + "&dirflg=d";
  const passoAVederlo = (p) => wa("Ciao, passo a vedere " + p.nome +
    " (" + codiceDi(p) + ").");
  /* «Regina · San Severo». Il marchio si scrive intero e nudo; la
     provincia fra parentesi è roba da anagrafe e nella riga di una
     scheda non serve — la città si legge dai dati del negozio, non si
     scrive a mano, così il giorno che Regina apre il secondo punto
     vendita la riga cambia da sola. */
  const provenienza = () =>
    "Regina · " + String(NEGOZIO.citta || "").replace(/\s*\([^)]*\)\s*$/, "").trim();

  registraSchermo("pezzo",   (id, dove) => schedaPezzo(id, dove));
  registraSchermo("lista",   (_id, dove) => schedaLista(dove));
  registraSchermo("negozio", (_id, dove) => schedaNegozio(dove));

  /* ═══ S1 · IL CATALOGO ══════════════════════════════════════════ */
  let famiglia = "Tutti";
  let griglia = null;
  let conta = null;     /* la capsula col conteggio, per aggiornarla */
  let rigaDaParte = null;

  const visti = () => famiglia === "Tutti"
    ? catalogo : catalogo.filter(p => p.tipo === famiglia);

  function disegna(){
    const pagina = schermo(el, {
      titolo:"Vetrina",
      azione: capsulaLista()
    });
    /* LA RIGA D'APERTURA — l'unica cosa di Regina che una griglia di
       gioielli non ha per conto suo. Accanto a Cartier e a Mejuri la
       griglia è «di qualsiasi gioielleria»: quello che la fa di
       QUESTO negozio non è un fregio, è una FRASE che dichiara cosa
       c'è qui dentro e cosa no. I due numeri sono contati sui dati, e
       la seconda metà («gli altri li vedi in negozio») è la tesi
       dell'app intera: l'app non vende, il negozio vende. */
    pagina.append(aperturaCatalogo());
    pagina.append(chip());
    griglia = grigliaPezzi();
    pagina.append(griglia);
    sistemaMaterie(griglia);
    pagina.append(codaCatalogo());
  }

  function aperturaCatalogo(){
    const in3d = catalogo.filter(p => p.in_3d).length;
    return e("p", {class:"t-2 vt-apertura",
      testo: conMaiuscola(aParole(in3d)) +
        " pezzi in tre dimensioni. Gli altri li vedi in negozio."});
  }

  /* la capsula in alto a destra: il conteggio dei pezzi da parte. Il
     bersaglio è 44 pieni, la pastiglia che si VEDE è più piccola —
     lo stesso scavalco trasparente della capsula del cofanetto. */
  function capsulaLista(){
    const n = (leggi().wishlist || []).length;
    const eti = e("span", {class:"vt-conto cifra", testo:String(n)});
    conta = eti;
    return e("button", {type:"button", class:"vt-cap",
      "aria-label":"I tuoi pezzi da parte, " + pezziDetti(n),
      suClick: () => spingi("lista")
    }, [e("span", {class:"vt-cap-pil"}, [segno("cuore", {misura:20}), eti])]);
  }

  function chip(){
    const voci = ["Tutti", ...FAMIGLIE.filter(f => catalogo.some(p => p.tipo === f))];
    return e("div", {class:"elenco-seg", role:"group",
      "aria-label":"Filtra per famiglia"},
      voci.map(v => {
        const on = famiglia === v;
        const n = v === "Tutti" ? catalogo.length
                                : catalogo.filter(p => p.tipo === v).length;
        return e("button", {type:"button", class:"chip-tocco",
          "aria-label": v + ", " + pezziDetti(n),
          "aria-current": on ? "true" : null,
          "data-fam": v,
          suClick: () => cambiaFamiglia(v, n)
        }, [e("span", {class:"chip" + (on ? " acceso" : "")}, [e("span", {testo:v})])]);
      }));
  }

  /* ── IL CAMBIO DI CHIP, COL FLIP ────────────────────────────────
     Si misura prima, si ricostruisce, si misura dopo, si anima la
     differenza (`app/moto.js`). Non `startViewTransition`: una
     transizione nativa fotografa TUTTO il documento, e in questa app
     dentro il documento c'è anche la cornice del banco in tre
     dimensioni col suo contesto WebGL. Il FLIP tocca solo le celle che
     si spostano davvero. */
  function cambiaFamiglia(v, n){
    if(famiglia === v) return;
    famiglia = v;
    const prima = new Map();
    if(griglia) for(const nodo of griglia.querySelectorAll("[data-flip]"))
      prima.set(nodo.dataset.flip, misura(nodo));

    for(const b of el.querySelectorAll(".chip-tocco")){
      const on = b.dataset.fam === v;
      b.toggleAttribute("aria-current", on);
      if(on) b.setAttribute("aria-current", "true");
      b.querySelector(".chip").classList.toggle("acceso", on);
    }
    const nuova = grigliaPezzi();
    griglia.replaceWith(nuova);
    griglia = nuova;
    sistemaMaterie(griglia);

    if(!RIDOTTO.matches) for(const nodo of griglia.querySelectorAll("[data-flip]")){
      const p = prima.get(nodo.dataset.flip);
      if(p) flip(nodo, p, misura(nodo), {durata:300});
      else nodo.animate([{opacity:0}, {opacity:1}], {duration:200, easing:"linear"});
    }
    annuncia(v + ": " + pezziDetti(n));
  }

  function grigliaPezzi(){
    return e("div", {class:"griglia-pezzi vt-griglia", role:"list"},
      visti().map(cellaPezzo));
  }

  function cellaPezzo(p){
    const sopra = [figura(p, "")];
    if(nuovi.has(p.id))
      sopra.push(e("span", {class:"occhiello vt-nuovo", testo:"Nuovo"}));
    if(p.in_3d)
      sopra.push(e("span", {class:"vt-3d", "aria-hidden":"true"}, [segnoCubo(14)]));

    const n = e("button", {type:"button", role:"listitem",
      class:"pezzo-cella vt-cella",
      "data-pezzo": p.id,
      "aria-label": p.nome + ", " + materiaCorta(p) + ", " + soldi(p.prezzo) +
        (p.in_3d ? ", con modello in tre dimensioni" : "") +
        (nuovi.has(p.id) ? ", nuovo" : ""),
      suClick: () => spingi("pezzo/" + p.id)
    }, [
      e("div", {class:"vt-scatto"}, sopra),
      e("b", {testo:p.nome}),
      /* LA MATERIA STA SU DUE RIGHE, non su una tagliata. Il posto è
         alto due righe SEMPRE (lo fissa `vetrina.css`), perché una
         cella che cresce di 18 px disallinea i prezzi fra le due
         colonne — e una griglia si misura, non si spera. La riserva
         (`data-principale`) entra in gioco solo se la misura dice che
         nemmeno due righe bastano. */
      e("span", {class:"vt-materia", testo:materiaCorta(p),
        "data-principale": materiaPrincipale(materiaCorta(p))}),
      e("span", {class:"vt-prezzo cifra", testo:soldi(p.prezzo)})
    ]);
    n.dataset.flip = p.id;
    return n;
  }

  /* ── LA MATERIA CHE NON CI STA: SI MISURA, NON SI INDOVINA ────────
     Due righe da 13 tengono tutte le materie del catalogo di oggi. Per
     quelle di domani non si mette un troncamento preventivo: si guarda
     l'altezza VERA del riquadro (`scrollHeight` contro `clientHeight`)
     e, solo dove sfora, si scende alla materia principale. Si aspetta
     che i caratteri siano caricati — misurare con il ripiego di sistema
     è misurare un'altra tipografia. */
  function sistemaMaterie(dentro){
    if(!dentro) return;
    const giro = () => {
      if(!dentro.isConnected) return;
      for(const n of dentro.querySelectorAll(".vt-materia")){
        if(n.dataset.ridotta === "1") continue;
        if(n.scrollHeight > n.clientHeight + 1){
          n.textContent = n.dataset.principale || n.textContent;
          n.dataset.ridotta = "1";
        }
      }
    };
    requestAnimationFrame(giro);
    if(document.fonts && document.fonts.ready)
      document.fonts.ready.then(() => requestAnimationFrame(giro)).catch(() => {});
  }

  /* le due porte in fondo al catalogo: la lista e il negozio. Sono una
     lista raggruppata, non due tasti: sono destinazioni, non azioni. */
  function codaCatalogo(){
    const n = (leggi().wishlist || []).length;
    const riga = cella({
      titolo:"I tuoi pezzi da parte",
      sotto: n ? pezziDetti(n) + " · te li teniamo in negozio"
               : "Nessuno, per ora",
      coda: String(n),
      etichetta:"I tuoi pezzi da parte, " + pezziDetti(n),
      suClick: () => spingi("lista")
    });
    rigaDaParte = riga;
    return lista("Il negozio", [
      riga,
      cella({titolo:"Il negozio", sotto: NEGOZIO.via + ", " + NEGOZIO.citta,
        etichetta:"La scheda del negozio",
        suClick: () => spingi("negozio")})
    ]);
  }

  /* il conteggio si aggiorna senza ridisegnare la schermata: ridisegnare
     il catalogo per un numero significherebbe perdere il chip scelto e
     la posizione di scorrimento. */
  function aggiornaConteggi(){
    const n = (leggi().wishlist || []).length;
    if(conta){
      conta.textContent = String(n);
      const b = conta.closest("button");
      if(b) b.setAttribute("aria-label", "I tuoi pezzi da parte, " + pezziDetti(n));
    }
    if(rigaDaParte && rigaDaParte.isConnected){
      const c = rigaDaParte.querySelector(".coda");
      if(c) c.textContent = String(n);
      const s = rigaDaParte.querySelector(".testo span");
      if(s) s.textContent = n ? pezziDetti(n) + " · te li teniamo in negozio"
                              : "Nessuno, per ora";
    }
  }

  /* ═══ S2 · LA PAGINA DEL PEZZO ═════════════════════════════════ */
  function schedaPezzo(id, dove){
    const p = perId.get(id) || {id, nome:id, materia:"", prezzo:0, foto:null,
      attributi:{}, tipo:""};
    const pagina = schermo(dove, {titolo:p.nome, indietro:torna,
      etichettaIndietro:"Torna alla vetrina"});

    pagina.append(galleria(p));

    /* IL NOME NON SI SCRIVE DUE VOLTE. `schermo()` lo porta già in
       Bodoni 34 come titolo grande (e in Inter 17 nella barra quando si
       scorre): ripeterlo in Bodoni 28 sotto la galleria era una
       gerarchia doppia, e a schermo si vedeva. Sotto la galleria
       restano le due righe che il titolo non dice. */
    /* LA PROVENIENZA, IN OCCHIELLO. Due parole che nessuna scheda di
       marketplace ha: questo pezzo sta in un negozio, e il negozio ha
       un nome e una via. È la seconda metà della firma di Regina
       (l'altra è la riga d'apertura del catalogo) e sta dove va la
       provenienza — sopra la materia, sotto il nome. In `--testo-2`:
       è un fatto, non uno stato e non un comando, e il turchese in
       questa app vuol dire «si può fare qualcosa». */
    /* IL PREZZO NON STA PIÙ QUI: sta nella fascia ancorata, accanto al
       tasto (vedi in fondo). Lasciato sotto la galleria finiva DIETRO la
       fascia a pagina ferma — misurato: il prezzo a 665, la fascia da
       654 in giu' — e un prezzo coperto dal proprio tasto è la cosa
       peggiore che una scheda possa fare. Cartier e Mejuri tengono
       prezzo e invito nello stesso rettangolo in fondo, ed è lì che
       vanno: sopra la piega tutti e due, sempre, senza dipendere da
       quanto è alta la fotografia. */
    pagina.append(e("div", {class:"vt-testa"}, [
      e("p", {class:"occhiello foot vt-provenienza", testo:provenienza()}),
      e("p", {class:"t-sub tenue vt-materia-pdp", testo:p.materia})
    ]));

    /* LA SCHEDA — le misure, e la riga del 3D solo per i 22. La MATERIA
       non ci sta: è già la frase sotto il titolo, e ripeterla in una
       riga è la stessa informazione scritta due volte a due pesi
       diversi (visto a schermo, e tolto). */
    const righe = [];
    for(const [k, v] of misureDi(p)) righe.push(cella({titolo:k, coda:v}));
    if(p.in_3d) righe.push(cella({
      titolo:"Vedi in 3D", sotto:"Il pezzo vero, sul banco",
      etichetta:"Vedi " + p.nome + " in tre dimensioni",
      suClick: () => vediIn3D(p)
    }));
    if(righe.length) pagina.append(lista("La scheda", righe));

    /* LA MISURA, spiegata. Solo per gli anelli: la circonferenza meno
       quaranta è la regola italiana degli anelli, e applicarla a una
       collana sarebbe una bugia in una riga sola. */
    if(p.tipo === "Anelli") pagina.append(bloccoMisura(p));

    /* LA COLLEZIONE. Tondi contati, come nel cofanetto: pieno = è tuo,
       a filo = manca, e questo pezzo ha il suo anello acceso. */
    const coll = collezioneDi(p);
    if(coll) pagina.append(coll);

    /* IL TASTO, UNO SOLO, e la frase che dice cos'e'. Il modello è la
       riserva senza pagamento: se il tasto non lo dice, sembra un
       carrello (reference 47, anti-pattern 6). */
    const t = tasto("Metti da parte", {tipo:"primario",
      suClick: () => scambia()});
    function veste(){
      const c = inLista(p.id);
      const st = statoDaParte(p.id);
      vestiTasto(t, c ? "Messo da parte · " + st.testo : "Metti da parte");
      t.setAttribute("aria-pressed", String(c));
      t.classList.toggle("vt-tenuto", c);
    }
    function scambia(){
      if(inLista(p.id)){
        togliDaParte(p.id);
        veste();
        toast("Tolto dalla lista.", {annulla:() => { mettiDaParte(p.id); veste(); }});
        annuncia(p.nome + ", tolto dalla lista.");
        return;
      }
      const fino = mettiDaParte(p.id);
      veste();
      /* grado MEDIO (carta psicologica): il tasto diventa lo stato, e
         una pillola dal basso con «Annulla». Niente di più. */
      toast("Te lo teniamo fino al " + fino + ".",
        {annulla:() => { togliDaParte(p.id); veste(); }});
      annuncia("Messo da parte fino al " + fino + ".");
    }
    veste();

    /* IL PERCORSO UMANO resta IN PAGINA: non è un'azione da tenere
       sotto il pollice, è l'alternativa per chi preferisce scrivere.
       E scende da capsula bordata a TASTO DI TESTO, per la stessa
       ragione per cui ci è sceso «Lo regalo io» nella lista: adesso che
       il primario è ancorato in fondo allo schermo, una seconda capsula
       della stessa misura è un secondo primario. Sotto un'unica capsula
       piena stanno due azioni di testo — «Passo a vederlo» e «Come
       misuro il dito» — che condividono la stessa forma e sono perciò
       UN SOLO turchese, non due. È l'anatomia del pezzo su Cartier e su
       Mejuri: un invito pieno, e sotto i percorsi scritti. */
    pagina.append(e("div", {class:"vt-sotto"}, [
      e("a", {class:"tasto terziario", href:passoAVederlo(p),
        target:"_blank", rel:"noopener",
        "aria-label":"Passo a vederlo: scrivi al negozio su WhatsApp"},
        [e("span", {testo:"Passo a vederlo"})])
    ]));

    /* la cura e la consegna: due righe, non un accordion di parole. */
    const coda = [];
    if(p.cura) coda.push(e("p", {class:"t-sub tenue vt-riga-testo", testo:p.cura}));
    if(p.consegna) coda.push(e("p", {class:"t-sub tenue vt-riga-testo", testo:p.consegna}));
    if(coda.length) pagina.append(e("section", {class:"vt-coda"}, coda));

    /* ── LA FASCIA ANCORATA ────────────────────────────────────────
       Cartier e Mejuri tengono prezzo e azione SOPRA LA PIEGA: la
       fotografia è alta 4:5 e il tasto, lasciato in fondo alla
       colonna, viveva sotto lo schermo — bisognava scorrere per sapere
       che si poteva fare qualcosa. Il primario si ancora perciò sopra
       la barra delle sezioni (`position:sticky`), su MATERIALE REGULAR
       (30/.72, la regola dei materiali: solo barre e fogli), e si porta
       dentro la riga che dice cos'e'. La riga NON è cortesia: senza,
       la capsula piena legge come un carrello, e questa è una riserva
       senza pagamento.
       Resta l'ULTIMO figlio della pagina apposta: così la sua
       posizione a riposo è in fondo alla colonna e lo `sticky` la
       tiene alzata solo finché c'è pagina sotto. */
    pagina.append(e("div", {class:"vt-fascia vetro regular"}, [
      e("div", {class:"vt-fascia-riga"}, [
        e("span", {class:"t-head cifra vt-prezzo-pdp", testo:soldi(p.prezzo)}),
        t
      ]),
      e("p", {class:"t-foot tenue vt-nota",
        testo:"Si compra in negozio. Te lo teniamo 7 giorni."})
    ]));

    annuncia(p.nome + ", " + soldi(p.prezzo));
  }

  /* ── LA GALLERIA A PAGINE ──────────────────────────────────────
     Scorrimento orizzontale con i fermi, e i punti sotto — 6 px, come
     il badge-punto del sistema. I punti compaiono solo se c'è più di
     una pagina: un punto solo non è una paginazione, è un puntino. */
  function galleria(p){
    const scatti = scattiDi(p);
    if(!scatti.length)
      return e("div", {class:"vt-gal-uno"}, [figura(p, "vt-gal-fig")]);

    const pagine = scatti.map((src, i) => e("div", {class:"vt-gal-pag"},
      [e("img", {class:"vt-gal-fig", src, alt:"",
        loading: i ? "lazy" : "eager", decoding:"async"})]));
    const nastro = e("div", {class:"vt-gal", role:"group",
      "aria-label":"Fotografie di " + p.nome}, pagine);
    if(scatti.length === 1) return e("div", {class:"vt-gal-avvolge"}, [nastro]);

    const punti = scatti.map((_, i) =>
      e("i", {class:"vt-punto" + (i ? "" : " qui")}));
    const barra = e("div", {class:"vt-punti", "aria-hidden":"true"}, punti);
    let atteso = false;
    nastro.addEventListener("scroll", () => {
      if(atteso) return;
      atteso = true;
      requestAnimationFrame(() => {
        atteso = false;
        const w = nastro.clientWidth || 1;
        const i = Math.round(nastro.scrollLeft / w);
        punti.forEach((n, k) => n.classList.toggle("qui", k === i));
      });
    }, {passive:true});
    return e("div", {class:"vt-gal-avvolge"}, [nastro, barra]);
  }

  /* ── «LA MISURA» ───────────────────────────────────────────────
     La regola scritta, non un rimando: misura = circonferenza del dito
     in millimetri meno quaranta. E la guida in un foglio a mezza
     altezza, quattro righe, col terzo percorso umano in fondo. */
  function bloccoMisura(p){
    const a = p.attributi || {};
    const tua = (seme.cliente && seme.cliente.misura_anello) || null;
    const parti = [
      e("h2", {class:"occhiello foot lista-testa", testo:"La misura"}),
      e("div", {class:"vt-misura"}, [
        e("p", {class:"t-body",
          testo:"La misura è la circonferenza del dito in millimetri, meno 40."}),
        e("p", {class:"t-sub tenue", testo: a.misura
          ? "Questo pezzo è misura " + a.misura + "." +
            (tua ? " La tua, dai nostri registri, è la " + tua + "." : "")
          : "Questo pezzo non ha una misura: si porta come viene."}),
        tasto("Come misuro il dito", {tipo:"terziario",
          suClick: () => apriFoglio({
            titolo:"Come misuro il dito",
            fermo:"basso",
            contenuto: guidaMisura()
          })})
      ])
    ];
    return e("section", {class:"lista-blocco"}, parti);
  }

  function guidaMisura(){
    const righe = [
      ["Hai un anello che ti va bene?",
       "Misura il diametro interno in millimetri e moltiplicalo per 3,14: quella è la circonferenza."],
      ["Non ce l’hai?",
       "Una striscia di carta stretta alla base del dito, un segno dove si sovrappone, e si misura in millimetri."],
      ["Togli 40.",
       "Circonferenza 54 mm significa misura 14. Fra due misure, prendi la più grande."],
      ["Fallo a fine giornata.",
       "Le dita calde sono mezza misura più grandi, ed è la misura che porterai davvero."]
    ];
    const dentro = e("div", {class:"vt-guida"},
      righe.map(([t, s]) => e("div", {class:"vt-guida-riga"}, [
        e("b", {class:"t-head", testo:t}),
        e("p", {class:"t-sub tenue", testo:s})])));
    dentro.append(e("p", {class:"t-foot tenue vt-nota",
      testo:"Oppure vieni in negozio: te la prendiamo in un minuto."}));
    dentro.append(tasto("Il negozio", {tipo:"secondario", largo:true,
      suClick: () => { chiudiFoglio(); setTimeout(() => spingi("negozio"), 60); }}));
    return dentro;
  }

  function collezioneDi(p){
    const mappa = store.collezioni || {};
    const c = mappa[p.collezione];
    if(!c || !c.pezzi || !c.pezzi.length) return null;
    const s = leggi();
    const posseduti = new Set((s.esemplari || [])
      .filter(x => !x.rimosso).map(x => x.articolo));
    const tondi = c.pezzi.map(id => e("i", {
      class:"tondo" + (posseduti.has(id) ? " ha" : "") + (id === p.id ? " questo" : "")}));
    const ha = c.pezzi.filter(id => posseduti.has(id)).length;
    const riga = e("div", {class:"cella coll-cella piatta"}, [
      e("div", {class:"coll-alto"}, [
        e("div", {class:"testo"}, [
          e("b", {class:"coll-nome", testo:c.nome}),
          e("span", {class:"cifra",
            testo: ha + " di " + c.pezzi.length + " · questo è uno di loro"})])]),
      e("div", {class:"coll-tondi", "aria-hidden":"true"}, tondi)
    ]);
    riga.setAttribute("role", "listitem");
    return lista("La collezione", [riga]);
  }

  /* IL 3D: si manda il fatto sul canale e si porta la persona dove il
     fatto si vede. Se il banco non c'è ancora (non è mai stato
     montato), `vaiA("cofanetto")` lo monta: è `avvio.js` che lo fa al
     primo ingresso nella sezione. Il messaggio parte comunque — il
     banco lo raccogliera' quando ascoltera' il canale (F2). */
  function vediIn3D(p){
    diAlBanco("banco/mostra", {id:p.id, fam:p.famiglia, k:p.k});
    annuncia(p.nome + ", sul banco.");
    if(tabCorrente() !== "cofanetto") vaiA("cofanetto");
  }

  /* ═══ S3 · DA PARTE ════════════════════════════════════════════ */
  function schedaLista(dove){
    const pagina = schermo(dove, {titolo:"Da parte", indietro:torna,
      etichettaIndietro:"Torna alla vetrina"});
    /* SI RIDISEGNA UN CONTENITORE, NON LA PAGINA. Il titolo grande vive
       DENTRO `.pagina` (`schermo()` ci mette la `.testa-pagina`): una
       lista che si ridisegna svuotando la pagina si porta via il proprio
       titolo, e la barra compatta resta a raccontare una schermata che
       non ha più testa. Difetto vero, trovato dalla sonda. */
    const corpo = e("div", {class:"vt-corpo"});
    pagina.append(corpo);
    disegnaLista(corpo);
    annuncia("Da parte: " + pezziDetti((leggi().wishlist || []).length));

    function disegnaLista(dentro){
      dentro.textContent = "";
      const ids = (leggi().wishlist || []).filter(id => perId.has(id));
      if(!ids.length){
        dentro.append(vuoto({
          segno:"vetrina",
          titolo:"Niente da parte",
          testo:"I pezzi che metti da parte li trovi qui, e in negozio.",
          azione:"Guarda la vetrina",
          suAzione: () => torna()
        }));
        return;
      }

      const righe = ids.map(id => rigaLista(perId.get(id), () => disegnaLista(dentro)));
      dentro.append(lista("I tuoi pezzi", righe));

      const totale = ids.reduce((n, id) => n + (perId.get(id).prezzo || 0), 0);
      dentro.append(e("div", {class:"vt-totale"}, [
        e("span", {class:"t-body", testo:"In tutto"}),
        e("span", {class:"t-body cifra", testo:soldi(totale)})
      ]));

      const manda = tasto(inviataIl() ? "Inviata" : "Manda la lista al negozio",
        {tipo:"primario", largo:true, suClick: () => {
          if(inviataIl()) return;
          invia("lista/inviata", {quando:new Date().toISOString(),
                                  letta_da:nomeCliente});
          vestiTasto(manda, "Inviata");
          manda.setAttribute("aria-pressed", "true");
          manda.classList.add("vt-tenuto");
          toast("Al banco: " + nomeCliente + " legge la tua lista.");
          annuncia("Lista inviata al negozio.");
        }});
      if(inviataIl()){ manda.setAttribute("aria-pressed", "true"); manda.classList.add("vt-tenuto"); }

      /* UN PRIMARIO SOLO, E UN'AZIONE DI TESTO. «Lo regalo io» era una
         capsula bordata larga quanto «Manda la lista»: due capsule
         della stessa misura una sopra l'altra sono due primari, e la
         schermata non diceva più qual è la cosa da fare. Scende a
         tasto di testo (bersaglio 44 pieno, `.tasto.terziario`) ed è
         l'UNICO turchese della schermata oltre al primario — per questo
         i tre «Togli» e le righe di stato sono passati a `--testo-2`
         nel foglio di stile. */
      dentro.append(e("div", {class:"vt-azioni"}, [
        manda,
        e("p", {class:"t-foot tenue vt-nota",
          testo:"Il negozio conferma su WhatsApp. Il pezzo resta da parte fino alla chiusura del giorno scritto."}),
        e("div", {class:"vt-riga-testuale"}, [
          tasto("Lo regalo io", {tipo:"terziario",
            etichetta:"Manda la lista a chi te lo regala",
            suClick: () => apriFoglio({
              titolo:"Lo regalo io", fermo:"basso", contenuto: foglioRegalo()
            })})
        ])
      ]));
    }

    function rigaLista(p, ridisegna){
      const st = statoDaParte(p.id);
      const sotto = soldi(p.prezzo) +
        (misuraCorta(p) ? " · " + misuraCorta(p) : "");
      const togli = e("button", {type:"button", class:"vt-togli",
        "aria-label":"Togli " + p.nome + " dai pezzi da parte",
        suClick: (ev) => {
          ev.stopPropagation();
          togliDaParte(p.id);
          toast("Tolto dalla lista.", {annulla:() => {
            mettiDaParte(p.id); ridisegna(); }});
          ridisegna();
        }}, [e("span", {testo:"Togli"})]);

      /* TRE RIGHE IMPILATE, non una colonna di stato a destra: lo stato
         messo accanto rubava larghezza al nome, e «Anello Onda» andava
         a capo mentre le righe sopra no — tre altezze diverse nella
         stessa lista. Lo stato sta SOTTO la cosa di cui parla, che è
         anche la regola 5 del sistema. */
      return e("div", {class:"cella con-foto vt-riga", role:"listitem"}, [
        figura(p, "fig"),
        e("div", {class:"testo"}, [
          e("b", {testo:p.nome}),
          e("span", {testo:sotto}),
          e("span", {class:"vt-stato" + (st.viva ? " viva" : ""),
            testo: st.viva ? "Da parte " + st.testo : st.testo})]),
        togli
      ]);
    }

    function foglioRegalo(){
      const url = location.origin + location.pathname + "#/l/" + TOKEN;
      const dentro = e("div", {class:"vt-regalo"}, [
        e("p", {class:"t-body",
          testo:"Mandi un link con la tua lista: chi lo apre vede i pezzi e la misura, non il prezzo."}),
        e("p", {class:"t-foot tenue vt-link cifra", testo:url})
      ]);
      const copia = tasto("Copia il link", {tipo:"secondario", largo:true,
        suClick: async () => {
          try{ await navigator.clipboard.writeText(url); }
          catch(_){ /* niente appunti: resta il link scritto sopra */ }
          toast("Link copiato.");
        }});
      dentro.append(e("div", {class:"colonna-tasti"}, [
        e("a", {class:"tasto primario largo",
          href: wa("Ciao, questa è la mia lista da Regina: " + url),
          target:"_blank", rel:"noopener",
          "aria-label":"Manda la lista su WhatsApp"},
          [e("span", {testo:"Manda su WhatsApp"})]),
        copia,
        tasto("Vedi la pagina che ricevono", {tipo:"terziario",
          suClick: () => { chiudiFoglio();
            setTimeout(() => { location.hash = "#/l/" + TOKEN; }, 60); }})
      ]));
      return dentro;
    }
  }

  /* ═══ S4 · IL NEGOZIO ══════════════════════════════════════════ */
  function schedaNegozio(dove){
    const pagina = schermo(dove, {titolo:NEGOZIO.nome, indietro:torna,
      etichettaIndietro:"Torna alla vetrina"});

    /* LA FOTO DELLA VETRINA non esiste (nessuno l'ha scattata). Al suo
       posto un piano col MARCHIO INTERO — mai ridotto, mai un pittogramma
       ritagliato — che è la cosa che una persona riconosce da fuori. */
    pagina.append(e("div", {class:"vt-insegna"},
      [e("img", {src:"marchio.png", alt:NEGOZIO.nome, class:"vt-marchio",
        decoding:"async"})]));

    const o = statoOrario();
    pagina.append(e("div", {class:"vt-testa"}, [
      e("p", {class:"t-body", testo: NEGOZIO.via + ", " + NEGOZIO.citta}),
      e("p", {class:"t-body vt-aperto" + (o.aperto ? " si" : ""), testo:o.detto})
    ]));

    const ora = new Date().getDay();
    pagina.append(lista("Orari", ORDINE_GIORNI.map(i => {
      const g = NEGOZIO.orari[i];
      const c = cella({titolo:g.g,
        coda: g.f.length ? g.f.map(x => x[0] + "–" + x[1]).join(" · ") : "Chiuso"});
      if(i === ora) c.classList.add("vt-oggi");
      return c;
    })));

    pagina.append(lista("Contatti", [
      collegamento("Indicazioni", mappe, "Apri le indicazioni in Mappe"),
      collegamento("Chiama", "tel:" + NEGOZIO.telefono,
        "Chiama il negozio al " + NEGOZIO.telefono_detto),
      collegamento("Scrivi su WhatsApp",
        wa("Ciao, vi scrivo dall’app Regina."), "Scrivi al negozio su WhatsApp")
    ]));

    pagina.append(e("p", {class:"t-foot tenue vt-nota",
      testo:"Il negozio risponde su WhatsApp negli orari di apertura."}));
    annuncia(NEGOZIO.nome + ". " + o.detto);
  }

  /* una riga della lista raggruppata che porta FUORI dall'app: è un
     <a>, non un <button> con un `location.href` dentro. Chi tiene
     premuto vede l'indirizzo, chi usa la tastiera lo apre in una scheda
     nuova, il lettore di schermo dice «collegamento». */
  function collegamento(testo, href, etichetta){
    return e("a", {class:"cella vt-esterno", href, target:"_blank",
      rel:"noopener", role:"listitem", "aria-label":etichetta}, [
      e("div", {class:"testo"}, [e("b", {testo})]),
      segno("chevron", {misura:14, classe:"frec"})]);
  }

  function statoOrario(){
    const d = new Date();
    const min = d.getHours() * 60 + d.getMinutes();
    const in_ = (s) => { const [h, m] = s.split(":").map(Number); return h * 60 + m; };
    const oggiF = NEGOZIO.orari[d.getDay()].f;
    for(const [a, b] of oggiF)
      if(min >= in_(a) && min < in_(b)) return {aperto:true, detto:"Aperto · chiude alle " + b};
    for(const [a] of oggiF)
      if(min < in_(a)) return {aperto:false, detto:"Chiuso · apre alle " + a};
    /* il primo giorno, da domani, che ha una fascia */
    for(let k = 1; k <= 7; k++){
      const i = (d.getDay() + k) % 7;
      const f = NEGOZIO.orari[i].f;
      if(f.length) return {aperto:false,
        detto:"Chiuso · apre " + (k === 1 ? "domani" : NEGOZIO.orari[i].g.toLowerCase()) +
              " alle " + f[0][0]};
    }
    return {aperto:false, detto:"Chiuso"};
  }

  /* ═══ S3b · LA LISTA DI CHI REGALA ═════════════════════════════
     Nessun conto, nessun prezzo, e la misura sempre: chi regala deve
     sapere che anello prendere, non quanto costa il pensiero di un
     altro. Vive fuori dalle quattro sezioni — è una pagina pubblica
     che per caso è dentro lo stesso file. */
  let strato = null;

  function apriOspite(token){
    if(strato) return;
    const ids = (leggi().wishlist || []).filter(id => perId.has(id));
    /* LA PAGINA PUBBLICA È DI CARTA, e lo dichiara. Non è una delle
       quattro sezioni — è quello che vede chi ha solo un link — e il
       marchio di Regina è scuro su chiaro: sul velluto sparirebbe
       (misurato: 1,1:1). Il tema si scrive, non si eredita per caso dal
       fatto che questo strato vive fuori dal <main>. */
    strato = e("div", {class:"vt-ospite", role:"region", "data-tema":"chiaro",
      "aria-label":"La lista di " + nomeCliente});
    const dentro = e("div", {class:"vt-ospite-dentro"});

    dentro.append(e("div", {class:"vt-insegna vt-insegna-piccola"},
      [e("img", {src:"marchio.png", alt:NEGOZIO.nome, class:"vt-marchio",
        decoding:"async"})]));
    dentro.append(e("h1", {class:"t-1", tabindex:"-1",
      testo:"La lista di " + nomeCliente}));
    dentro.append(e("p", {class:"t-sub tenue",
      testo: NEGOZIO.nome + " · " + NEGOZIO.citta}));

    if(!ids.length){
      dentro.append(e("p", {class:"t-body vt-riga-testo",
        testo:"La lista è vuota, per ora."}));
    } else {
      dentro.append(lista("I pezzi", ids.map(id => {
        const p = perId.get(id);
        /* NIENTE PREZZO. La misura si', ed è il motivo per cui questa
           pagina esiste. */
        return cella({foto:scattiDi(p)[0], titolo:p.nome,
          sotto: [materiaCorta(p), misuraCorta(p)].filter(Boolean).join(" · ")});
      })));
    }

    dentro.append(e("div", {class:"vt-azioni"}, [
      e("a", {class:"tasto primario largo",
        href: wa("Ciao, passo a vedere un pezzo della lista di " + nomeCliente + "."),
        target:"_blank", rel:"noopener",
        "aria-label":"Passo a vederlo: scrivi al negozio su WhatsApp"},
        [e("span", {testo:"Passo a vederlo"})]),
      e("p", {class:"t-foot tenue vt-nota",
        testo: nomeCliente + " non vede chi ha scelto cosa. Si compra in negozio."}),
      tasto("Chiudi", {tipo:"terziario", suClick: () => { history.back(); }})
    ]));

    strato.append(dentro);
    document.body.append(strato);
    document.body.dataset.ospite = "1";
    const h = strato.querySelector("h1");
    try{ h.focus({preventScroll:true}); }catch(_){}
    annuncia("La lista di " + nomeCliente + ", " + pezziDetti(ids.length));
  }
  function chiudiOspite(){
    if(!strato) return;
    strato.remove(); strato = null;
    delete document.body.dataset.ospite;
  }

  /* ── L'INDIRIZZO COMANDA ────────────────────────────────────────
     `#/l/<token>` non è un tab: il navigatore, che non lo riconosce,
     ripiega su `cofanetto` e ESCE dal proprio gestore prima di toccare
     le pile — quindi la pila della vetrina sopravvive al giro. Qui si
     apre e si chiude lo strato, e basta. */
  const guardaOspite = () => {
    const m = /^#\/l\/([^/]+)$/.exec(location.hash);
    if(m) apriOspite(decodeURIComponent(m[1]));
    else chiudiOspite();
  };
  addEventListener("hashchange", guardaOspite);
  addEventListener("popstate", guardaOspite);

  /* ── IL PRIMO DISEGNO E L'INDIRIZZO DI PARTENZA ─────────────────── */
  disegna();

  iscrivi((s, ev, prima) => {
    if(!prima) return;
    if(s.wishlist !== prima.wishlist) aggiornaConteggi();
    if(ev.tipo === "demo/reset"){ disegna(); }
  });

  /* chi arriva da fuori su `#/vetrina/lista`, `#/vetrina/negozio` o
     `#/l/<token>` deve trovarci quello che ha chiesto. `avviaRotta()`
     non ricostruisce le pile a un segmento solo (e non è un difetto: è
     scritto in rotta.js, e riguarda anche `#/cofanetto/elenco`), quindi
     la ricostruzione la fa la vista che quelle rotte le possiede. */
  const dirittoAlPunto = (() => {
    const l = /^#\/l\/([^/]+)$/.exec(INDIRIZZO_0);
    if(l) return () => { try{ history.replaceState(null, "", INDIRIZZO_0); }catch(_){}
                         apriOspite(decodeURIComponent(l[1])); };
    const m = /^#\/vetrina\/(lista|negozio)$/.exec(INDIRIZZO_0);
    if(m) return () => { if(tabCorrente() !== "vetrina") vaiA("vetrina");
                         spingi(m[1]); };
    return null;
  })();
  if(dirittoAlPunto) setTimeout(dirittoAlPunto, 80);

  /* la maniglia per le sonde, dichiarata come `window.__regina`. */
  window.__vetrina = {
    get famiglia(){ return famiglia; },
    get visti(){ return visti().map(p => p.id); },
    get daparte(){ return [...(leggi().wishlist || [])]; },
    /* le scadenze si leggono come le legge la vista: prima lo store,
       poi il seme. Una maniglia che guarda in un posto diverso da quello
       dove guarda la schermata collauda la maniglia, non la schermata. */
    get scadenze(){
      const m = {};
      for(const id of (leggi().wishlist || [])){
        const f = scadenzaDi(id);
        if(f) m[id] = f;
      }
      return m;
    },
    get inviata(){ return inviataIl(); },
    token: TOKEN,
    negozio: NEGOZIO
  };
}
