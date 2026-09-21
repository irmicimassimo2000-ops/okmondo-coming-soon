/* ═══════════════════════════════════════════════════════════════════
   app/viste/vetrina-corpo.js — LA VETRINA «BOUTIQUE» (direzione A).
   Un negozio come lo conosce chi compra online, costruito sulle tavole
   scelte da Massimo il 21/09 (`studio/ventaglio-vetrina/A/`, ancore
   Net-a-Porter e Cettire, regole in `studio/riferimenti/ECOMMERCE.md`):
     ELENCO    titolo + borsa · chip di famiglia · «Filtri · N pezzi» e
               ordinamento · «Preferiti · N» · griglia a due colonne col
               cuore nell'immagine · i pezzi senza fotografia in fondo,
               di solo testo · le porte del negozio.
     SCHEDA    galleria al 50 % · disponibilità · nome · prezzo + cuore ·
               riga Misura → foglio · riga del ritiro sopra i tasti ·
               UN primario (Apple Pay nero dove c'è) + secondario in tono.
     BORSA     foglio a misura del contenuto, copre la barra.
     PAGAMENTO contatto dalla tessera · radio ritiro/spedizione ·
               riepilogo · riga legale · tasti · errore SOTTO i tasti.
     CONFERMA  titolo · quando · dove · i pezzi · 4 tappe · «Come arrivare».
   RESTANO, dentro questa struttura, le tre cose che c'erano già:
   «Metti da parte» per 7 giorni (azione di testo in scheda + schermata
   `lista`), la lista di chi regala `#/l/<token>` e la pagina `negozio`.
   Si carica A RICHIESTA da `vetrina.js` (la soglia). Il pagamento passa
   SOLO da `app/pagamento/adattatore.js`: qui non c'è una chiave, una
   chiamata di rete o un nome di fornitore.
   ═══════════════════════════════════════════════════════════════════ */
import { e, annuncia, svuota } from "app/ui/dom.js";
import { segno } from "app/ui/segni.js";
import { cella, lista } from "app/ui/cella.js";
import { vuoto } from "app/ui/vuoto.js";
import { tasto, vestiTasto } from "app/ui/tasto.js";
import { toast } from "app/ui/toast.js";
import { apriFoglio, chiudiFoglio } from "app/ui/foglio.js";
import { schermo } from "app/ui/barra-nav.js";
import { spingi, torna, vaiA, tabCorrente, profondita } from "app/rotta.js";
import { misura, flip, RIDOTTO } from "app/moto.js";
import { diAlBanco } from "app/canale3d.js";
import { NEGOZIO, mappeNegozio, waNegozio } from "app/dati/negozio.js";
import { provinoDi, provinoQuadroDi } from "app/dati/provini.js";
import { adattatore } from "app/pagamento/adattatore.js";
export const TENUTA_GIORNI = 7;
/* INVENTATI E DICHIARATI (README dei dati): il costo e i tempi */
const SPEDIZIONE_CENT = 590;
const SPEDIZIONE_GIORNI = [2, 4];
const FAMIGLIE = ["Anelli", "Orecchini", "Collane", "Bracciali", "Orologi"];
const FASCE = [
  {id:"bassa", nome:"Fino a 30 €",  min:0,    max:3000},
  {id:"media", nome:"Da 30 a 50 €", min:3001, max:5000},
  {id:"alta",  nome:"Oltre 50 €",   min:5001, max:Infinity}
];
const ORDINI = [
  {id:"consigliati", nome:"Consigliati"},
  {id:"prezzo-su",   nome:"Prezzo crescente"},
  {id:"prezzo-giu",  nome:"Prezzo decrescente"},
  {id:"novita",      nome:"Novità"}
];
const ORDINE_GIORNI = [1, 2, 3, 4, 5, 6, 0];
const MESI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio",
  "agosto", "settembre", "ottobre", "novembre", "dicembre"];
const GIORNI = ["domenica", "lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato"];
/* ── IL TEMPO ──────────────────────────────────────────────────────── */
const due = (n) => String(n).padStart(2, "0");
const gg = (d) => due(d.getDate()) + "/" + due(d.getMonth() + 1);
const isoDi = (d) => d.getFullYear() + "-" + due(d.getMonth() + 1) + "-" + due(d.getDate());
const daIso = (s) => { const p = String(s || "").slice(0, 10).split("-"); return p.length === 3
  ? new Date(+p[0], +p[1] - 1, +p[2]) : null; };
const piuGiorni = (d, n) => { const x = new Date(d.getTime()); x.setDate(x.getDate() + n); return x; };
const mezzanotte = (d) => { const x = new Date(d.getTime()); x.setHours(0, 0, 0, 0); return x; };
const oggi = () => mezzanotte(new Date());
const dataDetta = (d) => GIORNI[d.getDay()] + " " + d.getDate() + " " + MESI[d.getMonth()];
const giornoCorto = (d) => d.getDate() + " " + MESI[d.getMonth()];
const oraDetta = (d) => d.getHours() + ":" + due(d.getMinutes());
/* ── I SOLDI ───────────────────────────────────────────────────────
   «39 €», non «39,00 €»: in un negozio da 22-89 € i due zeri sono
   rumore in ogni cella (tavole di A). I centesimi compaiono solo quando
   ci sono («5,90 €»). Il credito e i movimenti del profilo restano con
   `store.soldi`, che i centesimi li vuole sempre. */
const euro = (cent) => {
  const n = (cent | 0) / 100;
  return n.toLocaleString("it-IT", {
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2}) + " €";
};
const pezziDetti = (n) => n + (n === 1 ? " pezzo" : " pezzi");
const maiuscola = (s) => String(s).charAt(0).toUpperCase() + String(s).slice(1);
/* il numero non si stacca dalla sua unità: «42 cm» va a capo intero */
const materiaCorta = (p) => String(p.materia || "").split(" · ")
  .filter(x => !/^misura\s/i.test(x)).join(" · ")
  .replace(/(\d) (cm|mm|g|ATM)(?![a-z])/g, "$1\u00a0$2");
const materiaPrincipale = (t) => {
  const s = String(t || "").split(" · ")[0];
  return s.split(/\s+e\s+/i)[0].trim() || s;
};
const metalloDi = (p) => (p.attributi && p.attributi.metallo) ? maiuscola(p.attributi.metallo) : null;
const codiceDi = (p) => p.codice_scena || p.codice_fornitore || p.id;
function attributiDi(p){
  const a = p.attributi || {};
  const righe = [];
  if(a.lunghezza_cm) righe.push(["Lunghezza", a.lunghezza_cm + " cm"]);
  if(a.diametro_mm) righe.push(["Diametro", a.diametro_mm + " mm"]);
  if(a.quadrante) righe.push(["Quadrante", maiuscola(a.quadrante)]);
  if(a.impermeabilita) righe.push(["Impermeabilità", String(a.impermeabilita)]);
  return righe;
}
/* il codice dell'ordine: 6 caratteri leggibili al banco (Mango «C1EY4T»),
   senza le coppie che si confondono a voce e a vista (0/O, 1/I/L) */
const ALFABETO = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
function nuovoCodice(presi){
  for(let giro = 0; giro < 50; giro++){
    let c = "";
    const caso = new Uint32Array(6);
    (crypto && crypto.getRandomValues) ? crypto.getRandomValues(caso)
      : caso.forEach((_, i) => { caso[i] = Math.floor(Math.random() * 1e9); });
    for(const n of caso) c += ALFABETO[n % ALFABETO.length];
    if(!presi.has(c)) return c;
  }
  return Date.now().toString(36).toUpperCase().slice(-6);
}
/* ── IL FOGLIO DI STILE ────────────────────────────────────────────── */
function vestiti(versione){
  if(document.querySelector('link[data-f4="vetrina"]')) return;
  const u = new URL("vetrina.css", import.meta.url);
  u.search = versione || new URL(import.meta.url).search;
  document.head.append(e("link", {rel:"stylesheet", href:u.href, "data-f4":"vetrina"}));
}
/* il cuore PIENO: lo stesso disegno, riempito. Il riempimento è del
   CSS (`.va-pieno`), così il segno resta uno solo in `ui/segni.js`. */
const chevronGiu = (m = 14) => segno("chevron", {misura:m, classe:"va-giu"});
/* ═══════════════════════════════════════════════════════════════════
   IL MONTAGGIO
   ═══════════════════════════════════════════════════════════════════ */
export function monta(el, store, opz = {}){
  vestiti(opz.versione);
  const {leggi, invia, iscrivi} = store;
  const catalogo = store.catalogo || [];
  const perId = new Map(catalogo.map(a => [a.id, a]));
  const seme = store.seme || {};
  const cliente = seme.cliente || {};
  const dettagli = seme.wishlist_dettagli || {};
  const nuovi = new Set((seme.arrivi || []).map(a => a.id).filter(Boolean));
  const paga = adattatore();
  const INDIRIZZO_0 = opz.indirizzo || "";
  /* ── LE FIGURE ────────────────────────────────────────────────────
     Il packshot è il provino (1:1 in cella, 4:5 in scheda) sul suo
     campo `--provino`, in `contain`. Dodici articoli non ce l'hanno e
     NON prendono un riquadro vuoto: diventano celle di solo testo, in
     fondo all'elenco. */
  const quadroDi = (p) => provinoQuadroDi(p.id);
  const haFigura = (p) => !!quadroDi(p);
  /* ── «CONSIGLIATI» — LE FAMIGLIE SI ALTERNANO A GIRO ────────────────
     Gli anelli del catalogo condividono i MODELLI (Cabochon/Grande/
     Piccolo sono lo stesso disegno a tre misure, Filo/Fedina l'altro):
     messi in fila com'erano nel catalogo, l'elenco apriva con cinque
     anelli — la tavola scelta (A, 21/09) apre invece su famiglie
     diverse riga per riga. Qui si prende UN pezzo per famiglia, nel
     giro dei chip (Anelli, Orecchini, Collane, Bracciali, Orologi), e
     dentro ogni famiglia l'ordine è novità (`nuovi`, gli `arrivi` del
     seme) poi prezzo crescente. Un'ultima passata sposta avanti un
     pezzo se quello appena prima ha la STESSA immagine (due misure
     dello stesso modello, es. Cabochon/Piccolo): un doppione affiancato
     si legge come una fotografia che non ha caricato, non come varietà.
     IL GIRO SI FA DENTRO OGNI GRIGLIA, non sui 34 messi insieme: tre dei
     dodici pezzi «di solo testo» sono anche loro novità (Collana Perla,
     Bracciale Onda) e, mescolati, si prendevano il turno della loro
     famiglia SENZA comparire — la griglia con le foto restava povera
     mentre la famiglia «c'era» solo sulla carta. `visti()` separa già
     figura da testo dopo aver ordinato: si ordina ognuno per conto suo,
     PRIMA di sommarli, così il giro che si vede è quello vero. */
  function ordinaAGiro(v){
    const gruppi = new Map();
    for(const p of v){
      const f = p.tipo;
      if(!gruppi.has(f)) gruppi.set(f, []);
      gruppi.get(f).push(p);
    }
    for(const arr of gruppi.values())
      arr.sort((a, b) => (nuovi.has(b.id) ? 1 : 0) - (nuovi.has(a.id) ? 1 : 0) || a.prezzo - b.prezzo);
    const ordineFamiglie = FAMIGLIE.filter(f => gruppi.has(f));
    const out = [];
    let restano = true;
    while(restano){
      restano = false;
      for(const f of ordineFamiglie){
        const coda = gruppi.get(f);
        if(coda.length){ out.push(coda.shift()); restano = true; }
      }
    }
    for(let i = 1; i < out.length; i++){
      const prima = quadroDi(out[i - 1]), qui = quadroDi(out[i]);
      if(!prima || !qui || prima !== qui) continue;
      let j = i + 1;
      while(j < out.length && quadroDi(out[j]) === qui) j++;
      if(j < out.length){ const t = out[i]; out[i] = out[j]; out[j] = t; }
    }
    return out;
  }
  function ordinaConsigliati(v){
    return [...ordinaAGiro(v.filter(haFigura)), ...ordinaAGiro(v.filter(p => !haFigura(p)))];
  }
  function pagineDi(p){
    const pag = [];
    const alto = provinoDi(p.id);
    if(alto) pag.push({src:alto, modo:"contieni"});
    for(const s of (p.scatti || []))
      if(s && s.src && s.tipo !== "provino3d") pag.push({src:s.src, modo:"copri"});
    return pag;
  }
  /* ── LA DISPONIBILITÀ ─────────────────────────────────────────────
     Quello che dice il catalogo (dato di prova, dichiarato) MENO quello
     che questa persona ha già comprato: un «Ultimo pezzo» pagato non
     può restare in vendita nella stessa app che l'ha venduto. */
  const haMisure = (p) => !!p.disponibili && typeof p.disponibili === "object";
  const misureDi = (p) => haMisure(p) ? Object.keys(p.disponibili) : [];
  function venduti(id, mis){
    let n = 0;
    for(const o of leggi().ordini || []) for(const r of o.righe || [])
      if(r.id === id && (mis == null || String(r.misura) === String(mis))) n += r.quanti | 0;
    return n;
  }
  function dispo(p, mis){
    const d = p.disponibili;
    if(haMisure(p)){
      if(mis == null) return misureDi(p).reduce((n, m) => n + dispo(p, m), 0);
      return Math.max(0, (d[mis] | 0) - venduti(p.id, mis));
    }
    return Math.max(0, (d == null ? 2 : d | 0) - venduti(p.id, null));
  }
  /* la misura di partenza: la sua, se c'è; altrimenti la prima che c'è */
  const scelte = new Map();
  function misuraDi(p){
    if(!haMisure(p)) return null;
    if(scelte.has(p.id)) return scelte.get(p.id);
    const tua = cliente.misura_anello ? String(cliente.misura_anello) : null;
    const m = (tua && dispo(p, tua) > 0) ? tua
      : (misureDi(p).find(x => dispo(p, x) > 0) || tua || misureDi(p)[0]);
    return m;
  }
  function etichettaDi(p){
    const n = dispo(p, null);
    if(n === 0) return "Esaurito";
    if(n === 1) return "Ultimo pezzo";
    if(nuovi.has(p.id)) return "Nuovo";
    return null;
  }
  /* ── LA BORSA E I PREFERITI, LETTI ─────────────────────────────── */
  const borsa = () => leggi().borsa || [];
  const inBorsa = () => borsa().reduce((n, r) => n + (r.quanti | 0), 0);
  const preferiti = () => (leggi().preferiti || []).filter(id => perId.has(id));
  const ePreferito = (id) => (leggi().preferiti || []).includes(id);
  const righeDi = (elenco) => elenco.filter(r => perId.has(r.id)).map(r => {
    const p = perId.get(r.id);
    return {id:r.id, nome:p.nome, misura:r.misura, quanti:r.quanti | 0, prezzo:p.prezzo};
  });
  const sommaDi = (righe) => righe.reduce((n, r) => n + r.prezzo * r.quanti, 0);
  /* ── LA MESSA DA PARTE (com'era) ─────────────────────────────────── */
  const daSemeFino = (id) => {
    const d = dettagli[id] || {};
    return d.tenuto_fino || d.scadenza || d.ritiro_entro ||
      (d.creata_il ? isoDi(piuGiorni(daIso(d.creata_il), TENUTA_GIORNI)) : null);
  };
  const scadenzaDi = (id) => {
    const r = (leggi().daparte || []).find(x => x.id === id);
    return (r && r.fino) || daSemeFino(id) || null;
  };
  function statoDaParte(id){
    const d = scadenzaDi(id) ? daIso(scadenzaDi(id)) : null;
    if(d && d >= oggi()) return {testo:"fino al " + gg(d), viva:true};
    return {testo:"In attesa", viva:false};
  }
  const inLista = (id) => (leggi().wishlist || []).includes(id);
  const inviataIl = () => { const l = leggi().lista; return (l && l.inviata_il) || null; };
  function mettiDaParte(id){
    const d0 = oggi(), fino = piuGiorni(d0, TENUTA_GIORNI);
    invia("daparte/aggiungi", {id, dal:isoDi(d0), fino:isoDi(fino)});
    return gg(fino);
  }
  const togliDaParte = (id) => invia("daparte/togli", {id});
  const TOKEN = (() => {
    for(const k of Object.keys(dettagli)) if(dettagli[k] && dettagli[k].token) return dettagli[k].token;
    return "wl-" + (cliente.tessera_numero || 0);
  })();
  const nomeCliente = cliente.nome || "la cliente";
  /* ── LA BARRA DI VETRO SOTTO I MODALI ─────────────────────────────
     Borsa e pagamento COPRONO la barra (la Bag di Apple Store fa così):
     la barra è approvata e non si tocca — si nasconde, con lo stesso
     gancio che usa già la pagina pubblica. Si guarda lo strato in cima
     alla pila della sezione viva, dopo ogni movimento del navigatore. */
  function aggiornaCopertura(){
    requestAnimationFrame(() => {
      const sez = document.querySelector('[data-vista="' + tabCorrente() + '"]');
      const cima = sez && sez.lastElementChild;
      if(cima && cima.classList.contains("va-copre")) document.body.dataset.vaCopre = "1";
      else delete document.body.dataset.vaCopre;
      /* LA PILLOLA SI POSA SOPRA LA FASCIA DEI TASTI. La zona dei
         riscontri è del sistema e sta 96 punti sopra il fondo: dove una
         schermata ha una fascia fissa (scheda, conferma) cadrebbe SUI
         tasti, e per quattro secondi il primario non si tocca. Si
         dichiara l'altezza della fascia (tolti i 48 che stanno già
         dietro la barra) e il CSS alza la zona di quel tanto; `toast.js`
         non cambia, e le altre viste non se ne accorgono. */
      const fascia = cima && cima.dataset.tema === "chiaro" ? cima.querySelector(".va-fondo") : null;
      if(fascia){
        document.body.dataset.vaFascia = "1";
        document.body.style.setProperty("--va-fascia-h", Math.max(0, fascia.offsetHeight - 48) + "px");
      } else {
        delete document.body.dataset.vaFascia;
        document.body.style.removeProperty("--va-fascia-h");
      }
    });
  }
  /* ═══ S1 · L'ELENCO ═════════════════════════════════════════════ */
  const filtri = {famiglia:null, materie:new Set(), fascia:null, soloDisponibili:false};
  let ordina = "consigliati";
  let nodi = {};
  const materieDelCatalogo = [...new Set(catalogo.map(metalloDi).filter(Boolean))];
  const filtriAttivi = () => filtri.materie.size + (filtri.fascia ? 1 : 0) +
    (filtri.soloDisponibili ? 1 : 0);
  function visti(){
    const fascia = FASCE.find(f => f.id === filtri.fascia);
    let v = catalogo.filter(p =>
      (!filtri.famiglia || p.tipo === filtri.famiglia) &&
      (!filtri.materie.size || filtri.materie.has(metalloDi(p))) &&
      (!fascia || (p.prezzo >= fascia.min && p.prezzo <= fascia.max)) &&
      (!filtri.soloDisponibili || dispo(p, null) > 0));
    if(ordina === "prezzo-su") v = [...v].sort((a, b) => a.prezzo - b.prezzo);
    else if(ordina === "prezzo-giu") v = [...v].sort((a, b) => b.prezzo - a.prezzo);
    else if(ordina === "novita") v = [...v].sort((a, b) => (nuovi.has(b.id) ? 1 : 0) - (nuovi.has(a.id) ? 1 : 0));
    else if(ordina === "consigliati") v = ordinaConsigliati(v);
    /* CHI HA LA FIGURA PRIMA, chi non ce l'ha in fondo — sempre, con
       qualunque ordinamento: una cella di solo testo in mezzo a una
       griglia di packshot si legge come una fotografia che non ha
       caricato. L'ordinamento vale DENTRO i due gruppi. */
    return {figure: v.filter(haFigura), testi: v.filter(p => !haFigura(p)), tutti: v};
  }
  function disegna(){
    svuota(el);
    el.classList.add("va-elenco");
    const conto = e("span", {class:"va-conto cifra", testo:String(inBorsa())});
    const tastoBorsa = e("button", {type:"button", class:"va-borsa",
      "aria-label":"Borsa, " + pezziDetti(inBorsa()),
      suClick: () => spingi("borsa/aperta")}, [segno("borsa"), conto]);
    conto.hidden = inBorsa() === 0;
    const testa = e("header", {class:"va-testa"}, [
      e("h1", {class:"va-titolo", tabindex:"-1", testo:"Vetrina"}), tastoBorsa]);
    const pagina = e("div", {class:"va-pagina"});
    const chips = e("div", {class:"va-chips", role:"group", "aria-label":"Famiglie"},
      FAMIGLIE.filter(f => catalogo.some(p => p.tipo === f)).map(f =>
        e("button", {type:"button", class:"va-chip", "data-fam":f,
          "aria-pressed": String(filtri.famiglia === f),
          suClick: () => cambiaFamiglia(f)}, [e("span", {testo:f})])));
    const quanti = e("span", {class:"va-quanti cifra"});
    const nFiltri = e("b", {testo:"Filtri"});
    const bFiltri = e("button", {type:"button", class:"va-strumento",
      suClick: apriFiltri}, [segno("filtro", {misura:20}), nFiltri, quanti]);
    const scelta = e("b", {testo:ORDINI.find(o => o.id === ordina).nome});
    const menu = e("select", {class:"va-select", "aria-label":"Ordina i pezzi",
      suChange: () => { ordina = menu.value;
        scelta.textContent = ORDINI.find(o => o.id === ordina).nome;
        ridisegnaGriglia(true);
        annuncia("Ordinati per " + scelta.textContent.toLowerCase() + "."); }},
      ORDINI.map(o => e("option", {value:o.id, testo:o.nome, selected:o.id === ordina})));
    const bOrdina = e("label", {class:"va-strumento va-ordina"},
      [e("span", {testo:"Ordina"}), scelta, chevronGiu(14), menu]);
    const rigaPref = e("button", {type:"button", class:"va-riga-pref",
      suClick: () => spingi("preferiti/tutti")});
    const corpo = e("div", {class:"va-corpo-elenco"});
    pagina.append(chips, e("div", {class:"va-strumenti"}, [bFiltri, bOrdina]),
      rigaPref, corpo, codaElenco());
    el.append(testa, pagina);
    nodi = {conto, tastoBorsa, quanti, nFiltri, bFiltri, rigaPref, corpo, chips};
    vestiPreferiti();
    ridisegnaGriglia(false);
    let posata = false;
    el.addEventListener("scroll", () => {
      const ora = el.scrollTop > 4;
      if(ora !== posata){ posata = ora; testa.classList.toggle("posata", ora); }
    }, {passive:true});
  }
  function vestiStrumenti(n){
    const a = filtriAttivi();
    nodi.nFiltri.textContent = a ? "Filtri · " + a : "Filtri";
    nodi.quanti.textContent = pezziDetti(n);
    nodi.bFiltri.setAttribute("aria-label", "Filtri" + (a ? ", " + a + " attivi" : "") +
      ", " + pezziDetti(n));
  }
  function vestiPreferiti(){
    const r = nodi.rigaPref;
    if(!r) return;
    const n = preferiti().length;
    r.hidden = n === 0;
    svuota(r);
    r.append(segno("cuore", {misura:20, classe:"va-pieno"}),
      e("span", {class:"va-riga-pref-t", testo:"Preferiti · " + n}),
      segno("chevron", {misura:14, classe:"va-freccia"}));
    r.setAttribute("aria-label", "Preferiti, " + pezziDetti(n));
  }
  function vestiBorsa(){
    if(!nodi.conto) return;
    const n = inBorsa();
    nodi.conto.textContent = String(n);
    nodi.conto.hidden = n === 0;
    nodi.tastoBorsa.setAttribute("aria-label", "Borsa, " + pezziDetti(n));
  }
  function ridisegnaGriglia(conFlip){
    const prima = new Map();
    if(conFlip && !RIDOTTO.matches)
      for(const n of nodi.corpo.querySelectorAll("[data-flip]")) prima.set(n.dataset.flip, misura(n));
    const v = visti();
    svuota(nodi.corpo);
    vestiStrumenti(v.tutti.length);
    if(!v.tutti.length){
      nodi.corpo.append(vuoto({segno:"filtro", titolo:"Nessun pezzo così",
        testo:"Con questi filtri la vetrina resta vuota. Allargali, o guarda tutto.",
        azione:"Azzera i filtri", suAzione: azzeraFiltri}));
      return;
    }
    if(v.figure.length)
      nodi.corpo.append(e("div", {class:"va-griglia", role:"list"}, v.figure.map(cellaPezzo)));
    if(v.testi.length)
      nodi.corpo.append(e("div", {class:"va-griglia va-testi", role:"list"}, v.testi.map(cellaPezzo)));
    sistemaMaterie(nodi.corpo);
    if(prima.size) for(const n of nodi.corpo.querySelectorAll("[data-flip]")){
      const p = prima.get(n.dataset.flip);
      if(p) flip(n, p, misura(n), {durata:300});
      else n.animate([{opacity:0}, {opacity:1}], {duration:200, easing:"linear"});
    }
  }
  function cambiaFamiglia(f){
    filtri.famiglia = filtri.famiglia === f ? null : f;
    for(const b of nodi.chips.querySelectorAll(".va-chip"))
      b.setAttribute("aria-pressed", String(b.dataset.fam === filtri.famiglia));
    ridisegnaGriglia(true);
    annuncia((filtri.famiglia || "Tutta la vetrina") + ": " + pezziDetti(visti().tutti.length));
  }
  function azzeraFiltri(){
    filtri.famiglia = null; filtri.materie.clear(); filtri.fascia = null;
    filtri.soloDisponibili = false;
    for(const b of nodi.chips.querySelectorAll(".va-chip")) b.setAttribute("aria-pressed", "false");
    ridisegnaGriglia(true);
    annuncia("Filtri azzerati: " + pezziDetti(visti().tutti.length));
  }
  /* ── LA CELLA ─────────────────────────────────────────────────────
     Due comandi FRATELLI dentro un contenitore: la cella intera apre la
     scheda, il cuore alterna il preferito. Un tasto dentro un tasto non
     esiste, e un cuore che apre la scheda nemmeno. */
  function cellaPezzo(p){
    const eti = etichettaDi(p);
    const conFig = haFigura(p);
    const sopra = [];
    if(conFig){
      const img = e("img", {class:"va-fig", src:quadroDi(p), alt:"", loading:"lazy",
        decoding:"async", width:800, height:800});
      img.addEventListener("error", () => { const c = img.closest(".va-cella");
        if(c) c.classList.add("va-senza"); img.parentNode.remove(); }, {once:true});
      sopra.push(e("span", {class:"va-foto"}, [img]));
    }
    const testi = [];
    /* senza fotografia la prima riga dice COSA È: famiglia · materia */
    if(!conFig) testi.push(e("span", {class:"va-eti",
      testo: [p.tipo, eti].filter(Boolean).join(" · ")}));
    else if(eti) testi.push(e("span", {class:"va-eti", testo:eti}));
    testi.push(e("span", {class:"va-nome", testo:p.nome}),
      e("span", {class:"va-materia", testo:materiaCorta(p),
        "data-principale":materiaPrincipale(materiaCorta(p))}),
      e("span", {class:"va-prezzo cifra", testo:euro(p.prezzo)}));
    const apri = e("button", {type:"button", class:"va-cella-apri",
      "aria-label": [p.nome, materiaCorta(p), euro(p.prezzo), eti].filter(Boolean).join(", "),
      suClick: () => spingi("pezzo/" + p.id)},
      [...sopra, e("span", {class:"va-cella-testi"}, testi)]);
    const n = e("div", {class:"va-cella" + (conFig ? "" : " va-senza"), role:"listitem",
      "data-pezzo":p.id}, [apri, tastoCuore(p, "va-cuore")]);
    n.dataset.flip = p.id;
    return n;
  }
  function tastoCuore(p, classe){
    const b = e("button", {type:"button", class:classe,
      suClick: (ev) => { ev.stopPropagation(); alternaPreferito(p); }},
      [e("span", {class:"va-cuore-disco"}, [segno("cuore", {misura:20})])]);
    b.dataset.cuore = p.id;
    vestiCuore(b, p);
    return b;
  }
  function vestiCuore(b, p){
    const si = ePreferito(p.id);
    b.setAttribute("aria-pressed", String(si));
    b.setAttribute("aria-label", (si ? "Togli dai preferiti: " : "Aggiungi ai preferiti: ") + p.nome);
    const s = b.querySelector(".segno-filo");
    if(s) s.classList.toggle("va-pieno", si);
  }
  function alternaPreferito(p){
    invia("preferito/alterna", {id:p.id});
    annuncia(p.nome + (ePreferito(p.id) ? ", nei preferiti." : ", tolto dai preferiti."));
  }
  /* ogni cuore a schermo (elenco, scheda, preferiti) si riveste da sé */
  function rivestiCuori(){
    for(const b of document.querySelectorAll("[data-cuore]")){
      const p = perId.get(b.dataset.cuore);
      if(p) vestiCuore(b, p);
    }
  }
  /* la materia sta su UNA riga; se non ci sta, scende alla materia
     principale invece di farsi tagliare («…cabocho…» non dice niente).
     Si misura, non si indovina, e si rimisura a caratteri caricati. */
  function sistemaMaterie(dentro){
    const giro = () => {
      if(!dentro.isConnected) return;
      for(const n of dentro.querySelectorAll(".va-materia")){
        if(n.dataset.ridotta === "1") continue;
        if(n.scrollWidth > n.clientWidth + 1){
          n.textContent = n.dataset.principale || n.textContent;
          n.dataset.ridotta = "1";
        }
      }
    };
    requestAnimationFrame(giro);
    if(document.fonts && document.fonts.ready)
      document.fonts.ready.then(() => requestAnimationFrame(giro)).catch(() => {});
  }
  /* LE PORTE DEL NEGOZIO, in fondo: destinazioni, non azioni. */
  function codaElenco(){
    const blocco = e("div", {class:"va-coda"});
    function riempi(){
      svuota(blocco);
      const nOrd = (leggi().ordini || []).length;
      const nParte = (leggi().wishlist || []).length;
      blocco.append(lista("Il negozio", [
        cella({titolo:"I tuoi ordini", coda: nOrd ? String(nOrd) : null,
          etichetta:"I tuoi ordini" + (nOrd ? ", " + nOrd : ""),
          suClick: () => spingi("ordini/tutti")}),
        cella({titolo:"Da parte", sotto:"Te li teniamo 7 giorni, senza pagare",
          coda: nParte ? String(nParte) : null,
          etichetta:"Da parte, " + pezziDetti(nParte),
          suClick: () => spingi("lista")}),
        cella({titolo:"Il negozio", sotto: NEGOZIO.via + ", " + cittaNuda(),
          etichetta:"Il negozio, " + NEGOZIO.via, suClick: () => spingi("negozio")}),
        cella({titolo:"Termini, recesso e privacy",
          suClick: () => spingi("legale/testi")})
      ]));
    }
    riempi();
    blocco.riempi = riempi;
    nodi.coda = blocco;
    return blocco;
  }
  const cittaNuda = () => String(NEGOZIO.citta || "").replace(/\s*\([^)]*\)\s*$/, "").trim();
  /* ── IL FOGLIO DEI FILTRI ─────────────────────────────────────────
     I filtri si applicano MENTRE si toccano (l'elenco dietro il velo
     cambia, il tasto conta): chi chiude il foglio con un gesto non
     perde quello che ha scelto. Il tasto in fondo chiude e basta. */
  function apriFiltri(){
    const mostra = tasto("", {tipo:"primario", largo:true, suClick: () => chiudiFoglio()});
    const azzera = tasto("Azzera i filtri", {tipo:"terziario", suClick: () => {
      azzeraFiltri(); ridipingi(); }});
    const gruppi = e("div", {class:"va-filtri"});
    function capsula(nome, premuta, suTocco){
      return e("button", {type:"button", class:"va-capsula", "aria-pressed":String(premuta),
        suClick: () => { suTocco(); ridisegnaGriglia(false); ridipingi(); }},
        [e("span", {testo:nome})]);
    }
    function ridipingi(){
      svuota(gruppi);
      gruppi.append(
        e("h3", {class:"va-filtri-t", testo:"Materia"}),
        e("div", {class:"va-capsule", role:"group", "aria-label":"Materia"},
          materieDelCatalogo.map(m => capsula(m, filtri.materie.has(m), () => {
            filtri.materie.has(m) ? filtri.materie.delete(m) : filtri.materie.add(m); }))),
        e("h3", {class:"va-filtri-t", testo:"Prezzo"}),
        e("div", {class:"va-capsule", role:"group", "aria-label":"Prezzo"},
          FASCE.map(f => capsula(f.nome, filtri.fascia === f.id, () => {
            filtri.fascia = filtri.fascia === f.id ? null : f.id; }))),
        e("h3", {class:"va-filtri-t", testo:"Disponibilità"}),
        e("div", {class:"va-capsule", role:"group", "aria-label":"Disponibilità"},
          [capsula("Solo disponibili", filtri.soloDisponibili, () => {
            filtri.soloDisponibili = !filtri.soloDisponibili; })]));
      const n = visti().tutti.length;
      vestiTasto(mostra, n ? "Mostra " + pezziDetti(n) : "Nessun pezzo: allarga i filtri");
      azzera.hidden = filtriAttivi() === 0;
    }
    ridipingi();
    const dlg = apriFoglio({titolo:"Filtri",
      contenuto: e("div", {class:"va-foglio-corpo"}, [gruppi, mostra, azzera])});
    if(dlg) dlg.dataset.vista = "va";
  }
  /* ═══ S2 · LA SCHEDA ════════════════════════════════════════════ */
  function schedaPezzo(id, dove){
    const p = perId.get(id);
    svuota(dove);
    if(!p){
      const pag = schermo(dove, {titolo:"Pezzo", indietro:torna});
      pag.append(vuoto({segno:"vetrina", titolo:"Questo pezzo non c’è più",
        testo:"Può essere uscito dal catalogo. La vetrina è tutta qui.",
        azione:"Guarda la vetrina", suAzione: torna}));
      return;
    }
    dove.classList.add("va-scheda-strato");
    const pagine = pagineDi(p);
    const chiudi = e("button", {type:"button", class:"va-chiudi",
      "aria-label":"Chiudi la scheda", suClick: torna},
      [e("span", {class:"va-chiudi-disco"}, [segno("croce")])]);
    const scheda = e("article", {class:"va-scheda" + (pagine.length ? "" : " va-scheda-testo")});
    if(pagine.length) scheda.append(galleria(p, pagine, chiudi));
    else scheda.append(e("div", {class:"va-scheda-barra"}, [chiudi]));
    /* — la testa: disponibilità · famiglia / nome / prezzo + preferito — */
    const occhiello = e("p", {class:"va-occhiello"});
    const bCuore = e("button", {type:"button", class:"va-preferito",
      suClick: () => alternaPreferito(p)},
      [e("span", {class:"va-preferito-t", testo:"Preferito"}), segno("cuore", {misura:20})]);
    bCuore.dataset.cuore = p.id;
    vestiCuore(bCuore, p);
    const testa = e("div", {class:"va-testa-pezzo"}, [
      occhiello,
      e("h1", {class:"va-nome-pezzo", tabindex:"-1", testo:p.nome}),
      e("div", {class:"va-prezzo-riga"}, [
        e("span", {class:"va-prezzo-pezzo cifra", testo:euro(p.prezzo)}), bCuore])
    ]);
    let rigaMisura = null, valoreMisura = null;
    if(haMisure(p)){
      valoreMisura = e("span", {class:"va-ev-valore cifra"});
      rigaMisura = e("button", {type:"button", class:"va-ev", suClick: () => apriMisura(p, vesti)},
        [e("span", {class:"va-ev-eti", testo:"Misura"}), valoreMisura,
         segno("chevron", {misura:14, classe:"va-freccia"})]);
      testa.append(rigaMisura);
    }
    scheda.append(testa);
    /* — sotto la piega: materia, misure, 3D, collezione, cura, da parte — */
    const sotto = e("div", {class:"va-sotto"});
    /* la materia SENZA le misure in coda: quelle hanno la loro riga, e
       «38 cm» detto due volte a due righe di distanza è un refuso */
    const fatti = [["Materia", String(p.materia || "").split(" · ")[0]], ...attributiDi(p)];
    sotto.append(e("dl", {class:"va-fatti"}, fatti.flatMap(([k, v]) =>
      [e("dt", {testo:k}), e("dd", {testo:v})])));
    if(p.in_3d) sotto.append(e("button", {type:"button", class:"va-ev va-ev-azione",
      "aria-label":"Vedi " + p.nome + " in tre dimensioni", suClick: () => vediIn3D(p)},
      [e("span", {class:"va-ev-eti", testo:"Vedi in 3D"}),
       e("span", {class:"va-ev-valore", testo:"Sul banco"}),
       segno("chevron", {misura:14, classe:"va-freccia"})]));
    const coll = collezioneDi(p);
    if(coll) sotto.append(coll);
    if(p.cura) sotto.append(e("p", {class:"va-nota-pezzo", testo:p.cura}));
    /* «METTI DA PARTE» resta, ma di TESTO: è la strada di chi vuole
       vederlo in negozio senza pagare, non un secondo modo di comprare.
       NIENTE PILLOLA dopo il tocco: lo stato è già scritto nel tasto
       («Messo da parte · fino al…»), e un secondo tocco annulla — la
       stessa cosa detta due volte (nel tasto e in una pillola) è un
       doppione. Si annuncia solo per chi usa VoiceOver. */
    const bParte = tasto("", {tipo:"terziario", suClick: () => {
      if(inLista(p.id)){
        togliDaParte(p.id);
        annuncia("Tolto dai pezzi da parte.");
      } else {
        const fino = mettiDaParte(p.id);
        annuncia("Messo da parte fino al " + fino + ".");
      }
      vesti();
    }});
    bParte.classList.add("va-daparte");
    const rigaParte = e("div", {class:"va-daparte-riga"}, [bParte,
      e("p", {class:"va-nota-pezzo", testo:"Senza pagare: lo vedi in negozio, e decidi lì."})]);
    sotto.append(rigaParte);
    scheda.append(sotto);
    /* — il fondo ancorato: la riga del ritiro e i tasti, senza scroll — */
    const erroreRiga = e("p", {class:"va-errore", role:"alert", hidden:true});
    const ritiro = e("p", {class:"va-ritiro"}, [segno("negozio", {misura:14}),
      e("span", {testo:"Ritiro in negozio · " + prontoCorto() + " · spedizione in 2 giorni"})]);
    const zonaTasti = e("div", {class:"va-tasti"});
    const fondo = e("div", {class:"va-fondo"}, [ritiro, zonaTasti, erroreRiga]);
    scheda.append(fondo);
    dove.append(scheda);
    let appenaAggiunto = false;
    function vesti(){
      const mis = misuraDi(p);
      const n = dispo(p, mis);
      const tua = cliente.misura_anello ? String(cliente.misura_anello) : null;
      if(valoreMisura) valoreMisura.textContent = mis + (mis === tua ? " · la tua" : "");
      if(rigaMisura) rigaMisura.setAttribute("aria-label", "Misura " + mis +
        (mis === tua ? ", la tua" : "") + ". Cambia misura");
      occhiello.textContent = (n === 0 ? (haMisure(p) ? "Misura " + mis + " esaurita" : "Esaurito")
        : n === 1 ? "Ultimo pezzo in negozio" : "Disponibile in negozio") + " · " + p.tipo;
      vestiTasto(bParte, inLista(p.id)
        ? "Messo da parte · " + statoDaParte(p.id).testo : "Metti da parte per 7 giorni");
      bParte.setAttribute("aria-pressed", String(inLista(p.id)));
      svuota(zonaTasti);
      ritiro.hidden = n === 0;
      /* ESAURITO: sparisce «Metti da parte» insieme alla sua nota — un
         pezzo che non c'è non si può nemmeno vedere in negozio fra sette
         giorni. Resta solo «Avvisami quando torna». */
      rigaParte.hidden = n === 0;
      if(n === 0){
        /* esaurito: un tasto solo, e non vende */
        zonaTasti.className = "va-tasti";
        zonaTasti.append(tastoAvvisami(p, mis, "va-tono"));
        return;
      }
      const riga = borsa().find(r => r.id === p.id && r.misura === (mis == null ? null : String(mis)));
      const pieno = riga && riga.quanti >= n;
      const bAggiungi = e("button", {type:"button", class:"tasto va-tasto-largo",
        suClick: () => {
          if(riga && (appenaAggiunto || pieno)){ spingi("borsa/aperta"); return; }
          invia("borsa/aggiungi", {id:p.id, misura:mis, massimo:n});
          appenaAggiunto = true;
          annuncia(p.nome + " nella borsa.");
          vesti();
        }}, [e("span", {testo: riga && (appenaAggiunto || pieno)
          ? "Vai alla borsa · " + inBorsa() : "Aggiungi alla borsa"})]);
      if(paga.disponibile() && paga.applePay()){
        /* UN primario: Apple Pay nero, a destra (HIG). «Aggiungi» in tono,
           stessa misura. */
        bAggiungi.classList.add("va-tono");
        zonaTasti.className = "va-tasti va-coppia";
        zonaTasti.append(bAggiungi, tastoApplePay(() => compraSubito(p, mis, erroreRiga)));
      } else {
        bAggiungi.classList.add("primario");
        zonaTasti.className = "va-tasti";
        zonaTasti.append(bAggiungi);
      }
    }
    vesti();
    aggiornaCopertura();
    const via = iscrivi((s, _ev, prima) => {
      if(!dove.isConnected){ via(); return; }
      if(prima && (s.borsa !== prima.borsa || s.ordini !== prima.ordini ||
                   s.daparte !== prima.daparte || s.wishlist !== prima.wishlist)) vesti();
    });
    annuncia(p.nome + ", " + euro(p.prezzo));
  }
  function tastoApplePay(suTocco){
    const b = e("button", {type:"button", class:"tasto va-applepay",
      "aria-label":"Paga con Apple Pay", suClick: suTocco});
    /* il marchio è di Apple e non si ridisegna: dove il browser lo sa
       disegnare (`-apple-pay-button`, cioè ovunque esista Apple Pay) lo
       disegna lui; il glifo qui sotto è il ripiego per il banco di
       prova, che gira in Chrome. */
    b.innerHTML = '<span class="va-applepay-ripiego" aria-hidden="true">' +
      '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/></svg>' +
      '<span>Pay</span></span>';
    return b;
  }
  function tastoAvvisami(p, mis, classe){
    const chiave = "torna:" + p.id + (mis == null ? "" : ":" + mis);
    const gia = () => (leggi().promemoria || []).some(x => x.id === chiave);
    const cosa = mis == null ? "" : " la " + mis;
    const b = e("button", {type:"button", class:"tasto va-tasto-largo " + classe,
      suClick: () => {
        if(gia()) return;
        invia("promemoria/segna", {id:chiave, articolo:p.id, creato:new Date().toISOString()});
        b.querySelector("span").textContent = "Ti avvisiamo quando torna" + cosa;
        b.setAttribute("aria-pressed", "true");
        annuncia("Fatto: ti avvisiamo quando torna" + cosa + ".");
      }}, [e("span", {testo: gia() ? "Ti avvisiamo quando torna" + cosa
                                     : "Avvisami quando torna" + cosa})]);
    b.setAttribute("aria-pressed", String(gia()));
    return b;
  }
  /* «pronto domani»: il primo giorno d'apertura DOPO oggi, detto corto */
  function prossimaApertura(da){
    const base = mezzanotte(da || new Date());
    for(let k = 1; k <= 8; k++){
      const d = piuGiorni(base, k);
      const f = NEGOZIO.orari[d.getDay()].f;
      if(f.length) return {giorno:d, dalle:f[0][0], fra:k};
    }
    return {giorno:piuGiorni(base, 1), dalle:"9:30", fra:1};
  }
  function prontoCorto(){
    const a = prossimaApertura();
    return "pronto " + (a.fra === 1 ? "domani" : GIORNI[a.giorno.getDay()]);
  }
  /* ── LA GALLERIA ──────────────────────────────────────────────────
     Metà dello schermo VERO (`--alt-vera`), pagine con i fermi del
     browser, trattini solo se le pagine sono più di una. */
  function galleria(p, pagine, chiudi){
    const nastro = e("div", {class:"va-gal-nastro", role:"group", tabindex:"0",
      "aria-label": pagine.length > 1
        ? "Immagini di " + p.nome + ", " + pagine.length + " pagine" : "Immagine di " + p.nome},
      pagine.map((g, i) => e("div", {class:"va-gal-pag"}, [
        e("img", {class:"va-gal-fig va-" + g.modo, src:g.src,
          alt: i === 0 ? p.nome : p.nome + ", dal catalogo di Regina",
          loading: i ? "lazy" : "eager", decoding:"async"})])));
    const gal = e("div", {class:"va-gal"}, [nastro, chiudi]);
    if(pagine.length > 1){
      const tr = pagine.map((_, i) => e("i", {class: i ? "" : "qui"}));
      gal.append(e("div", {class:"va-trattini", "aria-hidden":"true"}, tr));
      let atteso = false;
      nastro.addEventListener("scroll", () => {
        if(atteso) return;
        atteso = true;
        requestAnimationFrame(() => { atteso = false;
          const i = Math.round(nastro.scrollLeft / (nastro.clientWidth || 1));
          tr.forEach((n, k) => n.classList.toggle("qui", k === i)); });
      }, {passive:true});
    }
    return gal;
  }
  /* ── IL FOGLIO DELLA MISURA ───────────────────────────────────────
     Le esaurite si VEDONO, barrate, e si possono scegliere: chi tocca
     la 13 non trova un muro, trova l'UNICO messaggio che le riguarda —
     «Avvisami quando torna la 13». Un tasto solo, che cambia mestiere
     con la misura scelta; nessun paragrafo che dica un'altra cosa. */
  function apriMisura(p, dopo){
    const tua = cliente.misura_anello ? String(cliente.misura_anello) : null;
    let scelta = misuraDi(p);
    const capsule = e("div", {class:"va-capsule va-misure", role:"radiogroup",
      "aria-label":"Misure di " + p.nome});
    const piede = e("div", {class:"va-misura-piede"});
    function ridipingi(){
      svuota(capsule); svuota(piede);
      for(const m of misureDi(p)){
        const finita = dispo(p, m) === 0;
        capsule.append(e("button", {type:"button", role:"radio",
          class:"va-capsula va-misura" + (finita ? " va-finita" : ""),
          "aria-checked":String(m === scelta),
          "aria-label": m + (finita ? ", esaurita" : dispo(p, m) === 1 ? ", ultimo pezzo" : "") +
            (m === tua ? ", la tua" : ""),
          suClick: () => { scelta = m; ridipingi(); }},
          [e("span", {class:"cifra", testo:m})]));
      }
      if(dispo(p, scelta) === 0) piede.append(tastoAvvisami(p, scelta, "va-tono"));
      else piede.append(tasto("Conferma la " + scelta, {tipo:"primario", largo:true,
        suClick: () => { scelte.set(p.id, scelta); chiudiFoglio(); dopo();
          annuncia("Misura " + scelta + "."); }}));
    }
    ridipingi();
    const corpo = e("div", {class:"va-foglio-corpo"}, [
      e("p", {class:"va-misura-tua", testo: tua ? "La tua è la " + tua
        : "La misura è la circonferenza del dito in millimetri, meno 40."}),
      capsule, piede]);
    const dlg = apriFoglio({titolo:"Misura", contenuto:corpo});
    if(dlg) dlg.dataset.vista = "va";
  }
  function collezioneDi(p){
    const c = (store.collezioni || {})[p.collezione];
    if(!c || !c.pezzi || !c.pezzi.length) return null;
    /* POSSEDUTO = registrato nel Libretto, non «in vendita». Un
       esemplare `venduto` è già pagato ma ancora nel cassetto del
       negozio (la sorpresa che aspetta): contarlo fra i posseduti
       gonfiava «N di M» col pezzo che è ancora in vetrina, mai col
       pezzo che la cliente ha davvero in mano. Stessa regola di
       `profilo.js` (`!rimosso && stato !== "venduto"`), qui mancava. */
    const posseduti = new Set((leggi().esemplari || [])
      .filter(x => !x.rimosso && x.stato !== "venduto").map(x => x.articolo));
    const ha = c.pezzi.filter(id => posseduti.has(id)).length;
    return e("div", {class:"va-collezione"}, [
      e("div", {class:"va-collezione-t"}, [
        e("span", {class:"va-ev-eti", testo:"Collezione"}),
        e("span", {class:"va-ev-valore cifra", testo:c.nome + " · " + ha + " di " + c.pezzi.length})]),
      e("div", {class:"coll-tondi", "aria-hidden":"true"}, c.pezzi.map(id => e("i", {
        class:"tondo" + (posseduti.has(id) ? " ha" : "") + (id === p.id ? " questo" : "")})))
    ]);
  }
  function vediIn3D(p){
    diAlBanco("banco/mostra", {id:p.id, fam:p.famiglia, k:p.k});
    annuncia(p.nome + ", sul banco.");
    if(tabCorrente() !== "cofanetto") vaiA("cofanetto");
  }
  /* ═══ S3 · LA BORSA ═════════════════════════════════════════════
     Un FOGLIO a misura del contenuto, col tasto in fondo: due righe
     non lasciano mezzo schermo di vuoto sopra il totale (il difetto
     della tavola, segnato dal critic). È una rotta vera
     (`borsa/aperta`): il ritorno del telefono la chiude, il ricarico
     la ritrova. */
  function schermoBorsa(_id, dove){
    svuota(dove);
    dove.setAttribute("role", "dialog");
    dove.setAttribute("aria-modal", "true");
    dove.setAttribute("aria-label", "Borsa");
    const velo = e("button", {type:"button", class:"va-velo", tabindex:"-1",
      "aria-label":"Chiudi la borsa", suClick: torna});
    const pannello = e("div", {class:"va-pannello"});
    dove.append(velo, pannello);
    sentiLUscita(dove);
    function dipingi(){
      svuota(pannello);
      const righe = borsa().filter(r => perId.has(r.id));
      const n = inBorsa();
      pannello.append(
        e("span", {class:"va-maniglia", "aria-hidden":"true"}),
        e("div", {class:"va-pannello-testa"}, [
          e("button", {type:"button", class:"va-x", "aria-label":"Chiudi la borsa",
            suClick: torna}, [segno("croce")]),
          e("h2", {class:"va-pannello-titolo cifra", tabindex:"-1", "data-titolo":"1",
            testo: n ? "Borsa · " + n : "Borsa"}),
          e("span", {class:"va-x-posto"})]));
      if(!righe.length){
        pannello.append(e("div", {class:"va-borsa-vuota"}, [
          segno("borsa", {misura:56}),
          e("b", {testo:"La borsa è vuota"}),
          e("p", {testo:"I pezzi che aggiungi restano qui anche se chiudi l’app. " +
            "I tuoi preferiti sono in Vetrina, in cima."})]),
          e("div", {class:"va-pannello-piede"}, [
            tasto("Vai alla vetrina", {tipo:"primario", largo:true,
              suClick: () => history.go(-profondita())})]));
        return;
      }
      pannello.append(e("div", {class:"va-pannello-corpo", role:"list"},
        righe.map((r, i) => rigaBorsa(r, i))));
      const tot = sommaDi(righeDi(righe));
      pannello.append(e("div", {class:"va-pannello-piede"}, [
        e("div", {class:"va-somme"}, [
          e("div", {class:"va-somma"}, [e("span", {testo:"Subtotale"}),
            e("b", {class:"cifra", testo:euro(tot)})]),
          e("div", {class:"va-somma"}, [e("span", {testo:"Ritiro in negozio"}), e("b", {testo:"Gratis"})]),
          e("div", {class:"va-somma va-totale"}, [e("span", {testo:"Totale"}),
            e("b", {class:"cifra", testo:euro(tot)})])]),
        tasto("Vai al pagamento", {tipo:"primario", largo:true,
          suClick: () => { acquisto = null; spingi("pagamento/ora"); }})]));
    }
    function rigaBorsa(r, posto){
      const p = perId.get(r.id);
      const max = dispo(p, r.misura);
      const ultimo = max <= 1;
      const sotto = (r.misura != null ? "Misura " + r.misura : materiaPrincipale(materiaCorta(p))) +
        (ultimo ? " · ultimo pezzo" : "");
      const meno = e("button", {type:"button", class:"va-passo",
        "aria-label": r.quanti > 1 ? "Uno in meno: " + p.nome : "Togli dalla borsa: " + p.nome,
        suClick: () => {
          if(r.quanti > 1){
            invia("borsa/quanti", {id:r.id, misura:r.misura, quanti:r.quanti - 1, massimo:max});
            annuncia(p.nome + ": " + (r.quanti - 1) + "."); return; }
          invia("borsa/togli", {id:r.id, misura:r.misura});
          toast("Tolto dalla borsa.", {annulla: () => invia("borsa/rimetti", {riga:r, posto})});
          annuncia(p.nome + ", tolto dalla borsa.");
        }}, [segno("meno", {misura:20})]);
      const pieno = r.quanti >= max;
      const piu = e("button", {type:"button", class:"va-passo",
        "aria-label": pieno ? "In negozio non ce ne sono altri: " + p.nome : "Uno in più: " + p.nome,
        "aria-disabled": pieno ? "true" : null,
        suClick: () => {
          if(pieno){ annuncia("In negozio non ce ne sono altri."); return; }
          invia("borsa/quanti", {id:r.id, misura:r.misura, quanti:r.quanti + 1, massimo:max});
          annuncia(p.nome + ": " + (r.quanti + 1) + ".");
        }}, [segno("piu", {misura:20})]);
      const parti = [];
      if(haFigura(p)) parti.push(e("span", {class:"va-mini"},
        [e("img", {src:quadroDi(p), alt:"", loading:"lazy", decoding:"async", width:160, height:160})]));
      parti.push(
        e("div", {class:"va-riga-testi"}, [
          e("span", {class:"va-riga-nome", testo:p.nome}),
          e("span", {class:"va-riga-sotto", testo:sotto}),
          e("span", {class:"va-riga-prezzo cifra", testo:euro(p.prezzo * r.quanti)})]),
        e("div", {class:"va-stepper", role:"group", "aria-label":"Quantità di " + p.nome},
          [meno, e("span", {class:"va-q cifra", "aria-live":"polite", testo:String(r.quanti)}), piu]));
      return e("div", {class:"va-riga" + (haFigura(p) ? "" : " va-riga-nuda"), role:"listitem"}, parti);
    }
    dipingi();
    const via = iscrivi((s, _ev, prima) => {
      if(!dove.isConnected){ via(); return; }
      if(prima && (s.borsa !== prima.borsa || s.ordini !== prima.ordini)) dipingi();
    });
    annuncia("Borsa, " + pezziDetti(inBorsa()));
  }
  /* IL FOGLIO SCENDE QUANDO LA ROTTA LO STACCA. `rotta.js` congeda uno
     strato facendolo scivolare a destra (`translateX`): un foglio che
     esce di lato non è un foglio. Il CSS ignora quella traslazione, e
     qui si guarda quando arriva per farlo scendere. */
  function sentiLUscita(dove){
    const occhio = new MutationObserver(() => {
      const m = /translateX\(\s*(-?[\d.]+)(px|%)/.exec(dove.style.transform || "");
      dove.classList.toggle("va-esce", !!m && parseFloat(m[1]) > 0.5);
    });
    occhio.observe(dove, {attributes:true, attributeFilter:["style"]});
  }
  /* ═══ S4 · IL PAGAMENTO ═════════════════════════════════════════ */
  /* la consegna scelta e l'eventuale acquisto diretto (Apple Pay dalla
     scheda: QUEL pezzo, non la borsa) vivono per la sessione */
  const consegna = {tipo:"ritiro", indirizzo:null};
  let acquisto = null;          /* null = si paga la borsa */
  let erroreInSospeso = null;   /* un rifiuto arrivato dalla scheda */
  const righeDaPagare = () => righeDi(acquisto ? [acquisto] : borsa());
  const costoConsegna = () => consegna.tipo === "spedizione" ? SPEDIZIONE_CENT : 0;
  const indirizzoDetto = (a) => a ? a.via + ", " + a.cap + " " + a.citta + " (" + a.provincia + ")" : "";
  function ordineDaPagare(metodo){
    const righe = righeDaPagare();
    return {
      righe, totale: sommaDi(righe) + costoConsegna(), metodo,
      consegna: {tipo:consegna.tipo, costo:costoConsegna(),
        indirizzo: consegna.tipo === "spedizione" ? {...consegna.indirizzo} : null},
      contatto: {nome:[cliente.nome, cliente.cognome].filter(Boolean).join(" "),
        email:cliente.email || null, telefono:cliente.telefono || null}
    };
  }
  function registra(ordine, esito){
    const presi = new Set((leggi().ordini || []).map(o => o.codice));
    const codice = nuovoCodice(presi);
    invia("ordine/crea", {daBorsa: !acquisto, ordine: {
      codice, quando:new Date().toISOString(), righe:ordine.righe, totale:ordine.totale,
      consegna:ordine.consegna, pagamento:{id:esito.id, metodo:ordine.metodo, prova:!!paga.prova}}});
    acquisto = null;
    return codice;
  }
  function messaggioRifiuto(metodo){
    if(metodo === "applepay")
      return "Apple Pay non è andato a buon fine: nessun addebito. Riprova, o paga con carta.";
    return "La banca ha rifiutato la carta: nessun addebito. Riprova con un’altra carta" +
      (paga.applePay() ? " o paga con Apple Pay." : ".");
  }
  /* dalla scheda: 1 tocco. La misura è già scelta, il ritiro è il
     default; l'adattatore chiede la conferma (il foglio di Apple Pay). */
  let pagando = false;
  async function compraSubito(p, mis, erroreRiga){
    if(pagando) return;
    pagando = true;
    acquisto = {id:p.id, misura: mis == null ? null : String(mis), quanti:1};
    const ordine = ordineDaPagare("applepay");
    let esito;
    try{ esito = await paga.paga(ordine); }
    catch(_){ esito = {esito:"rifiutato", motivo:"rete"}; }
    pagando = false;
    if(esito.esito === "pagato"){ spingi("ordine/" + registra(ordine, esito)); return; }
    if(esito.esito === "rifiutato"){
      /* il rimedio sta nella pagina del pagamento, dove c'è la carta */
      erroreInSospeso = "applepay";
      spingi("pagamento/ora");
      return;
    }
    acquisto = null;
    if(erroreRiga) erroreRiga.hidden = true;
  }
  function schermoPagamento(_id, dove){
    svuota(dove);
    dove.classList.add("va-pag-strato");
    const righe = righeDaPagare();
    const totale = e("span", {class:"va-pag-totale cifra"});
    dove.append(e("header", {class:"va-pag-testa"}, [
      e("button", {type:"button", class:"va-x", "aria-label":"Torna indietro", suClick: torna},
        [segno("chevron", {classe:"va-sx"})]),
      e("h1", {class:"va-pannello-titolo", tabindex:"-1", testo:"Pagamento"}), totale]));
    if(!righe.length){
      totale.textContent = "";
      dove.append(vuoto({segno:"borsa", titolo:"Niente da pagare",
        testo:"La borsa è vuota: i pezzi si aggiungono dalla scheda.",
        azione:"Vai alla vetrina", suAzione: () => history.go(-profondita())}));
      return;
    }
    const colonna = e("div", {class:"va-pag-colonna"});
    /* — CONTATTO: collassato, dai dati della tessera — */
    const nome = [cliente.nome, cliente.cognome].filter(Boolean).join(" ");
    const dettaglio = e("div", {class:"va-contatto-dettaglio", hidden:true}, [
      e("p", {testo:"Telefono · " + (cliente.telefono || "non indicato")}),
      e("p", {testo:"Dalla tua tessera" + (cliente.tessera_numero
        ? " RJ " + String(cliente.tessera_numero).padStart(5, "0") : "") +
        ": si cambia dal Profilo."})]);
    const freccia = chevronGiu(20);
    const bContatto = e("button", {type:"button", class:"va-collassata", "aria-expanded":"false",
      suClick: () => { const apre = dettaglio.hidden; dettaglio.hidden = !apre;
        bContatto.setAttribute("aria-expanded", String(apre));
        freccia.classList.toggle("va-su", apre); }}, [
      e("span", {class:"va-collassata-testi"}, [
        e("span", {class:"va-eti", testo:"Contatto"}),
        e("span", {class:"va-collassata-valore", testo:[nome, cliente.email].filter(Boolean).join(" · ")})]),
      freccia]);
    colonna.append(bContatto, dettaglio);
    /* — CONSEGNA: radio, la prima preselezionata; il luogo si MOSTRA — */
    const a = prossimaApertura();
    const gruppo = "va-consegna-" + Date.now();
    const sottoSped = e("span", {class:"va-scelta-sotto"});
    const cambia = e("button", {type:"button", class:"va-cambia", hidden:true,
      suClick: () => apriIndirizzo(vestiConsegna, () => {})}, [e("span", {testo:"Cambia indirizzo"})]);
    const rRitiro = e("input", {type:"radio", name:gruppo, value:"ritiro"});
    const rSped = e("input", {type:"radio", name:gruppo, value:"spedizione"});
    rRitiro.addEventListener("change", () => { consegna.tipo = "ritiro"; vestiConsegna(); });
    rSped.addEventListener("change", () => {
      if(consegna.indirizzo){ consegna.tipo = "spedizione"; vestiConsegna(); return; }
      /* senza indirizzo la spedizione non è una scelta compiuta: lo si
         chiede adesso, e chi chiude il foglio torna al ritiro */
      apriIndirizzo(() => { consegna.tipo = "spedizione"; vestiConsegna(); },
                    () => { consegna.tipo = "ritiro"; vestiConsegna(); });
    });
    colonna.append(e("div", {class:"va-blocco"}, [
      e("span", {class:"va-eti", id:gruppo + "-t", testo:"Consegna"}),
      e("div", {class:"va-scelta", role:"radiogroup", "aria-labelledby":gruppo + "-t"}, [
        e("label", {class:"va-scelta-riga"}, [rRitiro,
          e("span", {class:"va-scelta-testi"}, [
            e("span", {class:"va-scelta-nome", testo:"Ritiro in negozio"}),
            e("span", {class:"va-scelta-sotto", testo: NEGOZIO.via + ", " + cittaNuda() + " · pronto da " +
              (a.fra === 1 ? "domani" : GIORNI[a.giorno.getDay()]) + " dalle " + a.dalle})]),
          e("span", {class:"va-scelta-costo", testo:"Gratis"})]),
        e("label", {class:"va-scelta-riga"}, [rSped,
          e("span", {class:"va-scelta-testi"}, [
            e("span", {class:"va-scelta-nome", testo:"Spedizione a casa"}), sottoSped]),
          e("span", {class:"va-scelta-costo cifra", testo:euro(SPEDIZIONE_CENT)})])]),
      cambia]));
    /* — RIEPILOGO — */
    const riepilogo = e("div", {class:"va-blocco va-riepilogo"}, [
      e("span", {class:"va-eti", testo:"Riepilogo"}),
      ...righe.map(r => { const p = perId.get(r.id);
        const parti = [];
        if(haFigura(p)) parti.push(e("span", {class:"va-mini va-mini-44"},
          [e("img", {src:quadroDi(p), alt:"", loading:"lazy", decoding:"async", width:88, height:88})]));
        const sotto = [r.misura != null ? "Misura " + r.misura : null,
          r.quanti > 1 ? r.quanti + " pezzi" : null].filter(Boolean).join(" · ");
        parti.push(e("div", {class:"va-riga-testi"}, [
          e("span", {class:"va-riga-nome", testo:p.nome}),
          sotto ? e("span", {class:"va-riga-sotto", testo:sotto}) : null]),
          e("span", {class:"va-riga-prezzo cifra", testo:euro(r.prezzo * r.quanti)}));
        return e("div", {class:"va-riga va-riga-compatta"}, parti); })]);
    const rigaSped = e("div", {class:"va-somma", hidden:true}, [
      e("span", {testo:"Spedizione"}), e("b", {class:"cifra", testo:euro(SPEDIZIONE_CENT)})]);
    riepilogo.append(rigaSped);
    colonna.append(riepilogo);
    dove.append(colonna);
    /* — IL PIEDE: legale su una riga, tasti, e l'errore SOTTO i tasti — */
    const errore = e("p", {class:"va-errore", role:"alert", hidden:true});
    const bCarta = e("button", {type:"button", class:"tasto va-tasto-largo",
      suClick: () => procedi("carta")}, [e("span", {testo:"Paga con carta"})]);
    const tasti = e("div", {class:"va-tasti"});
    const conApple = paga.disponibile() && paga.applePay();
    let bApple = null;
    if(conApple){
      bCarta.classList.add("va-tono");
      tasti.classList.add("va-coppia");
      bApple = tastoApplePay(() => procedi("applepay"));
      tasti.append(bCarta, bApple);
    } else {
      bCarta.classList.add("primario");
      tasti.append(bCarta);
    }
    const legale = e("p", {class:"va-legale"}, [
      "Recesso entro 14 giorni · ",
      e("a", {href:"#", suClick: (ev) => { ev.preventDefault(); spingi("legale/testi"); }, testo:"Termini"}),
      " · ",
      e("a", {href:"#", suClick: (ev) => { ev.preventDefault(); spingi("legale/testi"); }, testo:"Privacy"})]);
    dove.append(e("div", {class:"va-pag-piede"}, [legale, tasti, errore]));
    function vestiConsegna(){
      rRitiro.checked = consegna.tipo === "ritiro";
      rSped.checked = consegna.tipo === "spedizione";
      sottoSped.textContent = consegna.indirizzo
        ? indirizzoDetto(consegna.indirizzo) + " · " + SPEDIZIONE_GIORNI.join("-") + " giorni lavorativi"
        : SPEDIZIONE_GIORNI.join("-") + " giorni lavorativi · ti chiediamo l’indirizzo";
      cambia.hidden = !(consegna.tipo === "spedizione" && consegna.indirizzo);
      rigaSped.hidden = consegna.tipo !== "spedizione";
      totale.textContent = euro(sommaDi(righe) + costoConsegna());
    }
    function mostraErrore(metodo){
      svuota(errore);
      errore.append(segno("avviso", {misura:20}), e("span", {testo:messaggioRifiuto(metodo)}));
      errore.hidden = false;
      bCarta.querySelector("span").textContent = "Riprova con carta";
    }
    async function procedi(metodo){
      if(pagando) return;
      pagando = true;
      errore.hidden = true;
      for(const b of [bCarta, bApple]) if(b){ b.disabled = true; b.setAttribute("aria-busy", "true"); }
      const ordine = ordineDaPagare(metodo);
      let esito;
      try{ esito = await paga.paga(ordine); }
      catch(_){ esito = {esito:"rifiutato", motivo:"rete"}; }
      pagando = false;
      for(const b of [bCarta, bApple]) if(b){ b.disabled = false; b.removeAttribute("aria-busy"); }
      if(esito.esito === "pagato"){ confermaQui(dove, registra(ordine, esito)); return; }
      if(esito.esito === "rifiutato") mostraErrore(metodo);
      else annuncia("Pagamento annullato: nessun addebito.");
    }
    vestiConsegna();
    if(erroreInSospeso){ mostraErrore(erroreInSospeso); erroreInSospeso = null; }
    annuncia("Pagamento, " + totale.textContent);
  }
  /* LA CONFERMA PRENDE IL POSTO DEL PAGAMENTO, nello stesso strato: a
     ordine fatto la pagina del pagamento non è un passo a cui tornare.
     L'indirizzo lo dice (`…/ordine/<codice>` al posto di
     `…/pagamento/ora`: stesso numero di coppie, la pila di `rotta.js`
     non se ne accorge) e un ricarico ritrova la conferma. */
  function confermaQui(dove, codice){
    try{
      history.replaceState(null, "", location.hash.replace(/pagamento\/ora$/, "ordine/" + codice));
    }catch(_){ /* l'indirizzo resta quello di prima: la conferma si vede lo stesso */ }
    dove.classList.remove("va-copre", "va-pag-strato");
    /* la borsa (vuota) che sta sotto non deve riaffiorare quando la
       conferma si chiude */
    const sotto = dove.previousElementSibling;
    if(sotto && sotto.classList.contains("va-foglio-strato")) sotto.classList.add("va-spento");
    schermoOrdine(codice, dove);
    aggiornaCopertura();
    const h = dove.querySelector("h1");
    if(h) try{ h.focus({preventScroll:true}); }catch(_){}
  }
  function apriIndirizzo(fatto, annullato){
    let salvato = false;
    const v = consegna.indirizzo || {};
    const campi = [
      {id:"via", nome:"Via e numero civico", auto:"street-address", val:v.via,
        prova: (x) => x.trim().length >= 5 && /\d/.test(x), errore:"Scrivi la via col numero civico."},
      {id:"cap", nome:"CAP", auto:"postal-code", modo:"numeric", val:v.cap,
        prova: (x) => /^\d{5}$/.test(x.trim()), errore:"Il CAP ha cinque cifre."},
      {id:"citta", nome:"Città", auto:"address-level2", val:v.citta,
        prova: (x) => x.trim().length >= 2, errore:"Scrivi la città."},
      {id:"provincia", nome:"Provincia (sigla)", auto:"address-level1", val:v.provincia, max:2,
        prova: (x) => /^[A-Za-z]{2}$/.test(x.trim()), errore:"Due lettere: FG, BA, MI…"}
    ];
    const nodiCampo = campi.map(c => {
      const inp = e("input", {class:"campo", type:"text", id:"va-" + c.id, name:c.id,
        autocomplete:c.auto, inputmode:c.modo || null, maxlength:c.max || null,
        value:c.val || "", "aria-describedby":"va-" + c.id + "-e"});
      const err = e("p", {class:"va-campo-errore", id:"va-" + c.id + "-e", hidden:true});
      inp.addEventListener("input", () => { if(!err.hidden && c.prova(inp.value)){
        err.hidden = true; inp.removeAttribute("aria-invalid"); } });
      return {c, inp, err, nodo: e("div", {class:"va-campo"},
        [e("label", {for:"va-" + c.id, class:"va-eti", testo:c.nome}), inp, err])};
    });
    const salva = tasto("Spedisci a questo indirizzo", {tipo:"primario", largo:true, suClick: () => {
      let primo = null;
      for(const n of nodiCampo){
        const ok = n.c.prova(n.inp.value);
        n.err.hidden = ok; n.err.textContent = ok ? "" : n.c.errore;
        ok ? n.inp.removeAttribute("aria-invalid") : n.inp.setAttribute("aria-invalid", "true");
        if(!ok && !primo) primo = n.inp;
      }
      if(primo){ primo.focus(); return; }
      const val = (id) => nodiCampo.find(n => n.c.id === id).inp.value.trim();
      consegna.indirizzo = {via:val("via"), cap:val("cap"), citta:val("citta"),
        provincia:val("provincia").toUpperCase()};
      salvato = true;
      chiudiFoglio();
    }});
    const dlg = apriFoglio({titolo:"Dove spediamo", fermo:"alto",
      contenuto: e("form", {class:"va-foglio-corpo va-indirizzo", novalidate:true,
        suSubmit: (ev) => { ev.preventDefault(); salva.click(); }},
        [...nodiCampo.map(n => n.nodo), salva]),
      suChiusura: () => salvato ? fatto() : annullato()});
    if(dlg) dlg.dataset.vista = "va";
  }
  /* ═══ S5 · LA CONFERMA, E LO STATO DELL'ORDINE ══════════════════ */
  const TAPPE = {
    ritiro:     [["ricevuto", "Ricevuto"], ["preparazione", "In preparazione"],
                 ["pronto", "Pronto"], ["ritirato", "Ritirato"]],
    spedizione: [["ricevuto", "Ricevuto"], ["preparazione", "In preparazione"],
                 ["spedito", "Spedito"], ["consegnato", "Consegnato"]]
  };
  function frasiOrdine(o){
    const n = (o.righe || []).reduce((k, r) => k + (r.quanti | 0), 0);
    const uno = n === 1;
    const fatto = new Date(o.quando);
    const tipo = o.consegna && o.consegna.tipo === "spedizione" ? "spedizione" : "ritiro";
    const tappa = (st) => (o.tappe || []).find(t => t.stato === st);
    const ilGiorno = (st) => { const t = tappa(st); return t && t.quando ? giornoCorto(new Date(t.quando)) : null; };
    if(tipo === "ritiro"){
      const a = prossimaApertura(fatto);
      const fra = Math.round((mezzanotte(a.giorno) - oggi()) / 864e5);
      const quando = (fra === 1 ? "domani, " : fra === 0 ? "oggi, " : "") + dataDetta(a.giorno) + ", dalle " + a.dalle;
      const pr = uno ? "Pronto" : "Pronti";
      if(o.stato === "ritirato") return {titolo:"Ordine ritirato",
        quando:(uno ? "Ritirato" : "Ritirati") + (ilGiorno("ritirato") ? " il " + ilGiorno("ritirato") : ""), tipo};
      if(o.stato === "pronto") return {titolo: uno ? "Il tuo pezzo ti aspetta" : "I tuoi pezzi ti aspettano",
        quando: pr + " in negozio: passa quando vuoi", tipo};
      return {titolo: uno ? "Il tuo pezzo ti aspetta" : "I tuoi pezzi ti aspettano",
        quando: pr + " da " + quando, tipo};
    }
    const entro = dataDetta(giorniLavorativi(fatto, SPEDIZIONE_GIORNI[1]));
    if(o.stato === "consegnato") return {titolo:"Ordine consegnato",
      quando:(uno ? "Consegnato" : "Consegnati") + (ilGiorno("consegnato") ? " il " + ilGiorno("consegnato") : ""), tipo};
    return {titolo: uno ? "Il tuo pezzo arriva a casa" : "I tuoi pezzi arrivano a casa",
      quando: (o.stato === "spedito" ? (uno ? "Spedito" : "Spediti") + ": in consegna entro " : "In consegna entro ") + entro, tipo};
  }
  function giorniLavorativi(da, n){
    let d = mezzanotte(da);
    while(n > 0){ d = piuGiorni(d, 1); if(d.getDay() !== 0 && d.getDay() !== 6) n--; }
    return d;
  }
  function schermoOrdine(codice, dove){
    svuota(dove);
    dove.classList.add("va-ordine-strato");
    const o = (leggi().ordini || []).find(x => x.codice === codice);
    /* si chiude TUTTO il percorso d'acquisto in un gesto: conferma,
       pagamento e borsa stanno sulla pila uno sopra l'altro */
    const esci = () => {
      /* si contano gli strati VERI sotto questo (la pila nello store può
         essere quella di una sessione passata) */
      let n = 1, sotto = dove.previousElementSibling;
      while(sotto && /^(ordine|pagamento|borsa)\//.test(sotto.dataset.rotta || "")){
        n++; sotto = sotto.previousElementSibling; }
      history.go(-n);
    };
    dove.append(e("div", {class:"va-scheda-barra"}, [
      e("button", {type:"button", class:"va-x", "aria-label":"Chiudi", suClick: esci}, [segno("croce")])]));
    if(!o){
      dove.append(vuoto({segno:"borsa", titolo:"Ordine non trovato",
        testo:"Il codice " + codice + " non è fra i tuoi ordini su questo telefono.",
        azione:"Vai ai tuoi ordini", suAzione: () => { torna(); }}));
      return;
    }
    const f = frasiOrdine(o);
    const dovE = f.tipo === "ritiro" ? NEGOZIO.via + ", " + cittaNuda()
      : indirizzoDetto(o.consegna.indirizzo);
    const colonna = e("div", {class:"va-conferma"}, [
      e("h1", {class:"va-nome-pezzo", tabindex:"-1", testo:f.titolo}),
      e("p", {class:"va-conferma-quando", testo:f.quando}),
      e("p", {class:"va-conferma-dove cifra",
        /* «Pagamento di prova» SOLO se l'adattatore lo era davvero
           (`o.pagamento.prova`, scritto da `registra()` al momento
           dell'ordine): il giorno di Stripe questa riga torna a dire
           «pagato» da sola, senza toccare la vista. */
        testo:"Ordine " + o.codice + " · " + dovE + " · " +
          ((o.pagamento && o.pagamento.prova) ? "Pagamento di prova · " : "pagato ") + euro(o.totale)})]);
    const conFig = o.righe.filter(r => perId.has(r.id) && haFigura(perId.get(r.id)));
    if(conFig.length) colonna.append(e("div", {class:"va-conferma-pezzi" +
      (conFig.length === 1 ? " va-uno" : "")}, conFig.slice(0, 4).map(r =>
        e("img", {src:quadroDi(perId.get(r.id)), alt:r.nome, decoding:"async", width:800, height:800}))));
    const senza = o.righe.filter(r => !conFig.includes(r));
    if(senza.length || o.righe.some(r => r.quanti > 1) || conFig.length > 4)
      colonna.append(e("p", {class:"va-conferma-dove", testo: o.righe.map(r =>
        (r.quanti > 1 ? r.quanti + " × " : "") + r.nome + (r.misura != null ? " (misura " + r.misura + ")" : "")).join(" · ")}));
    const tappe = TAPPE[f.tipo];
    const qui = Math.max(0, tappe.findIndex(t => t[0] === o.stato));
    const ol = e("ol", {class:"va-tappe", "aria-label":"Stato dell’ordine"},
      tappe.map((t, i) => e("li", {class: i === qui ? "qui" : i < qui ? "fatta" : "",
        "aria-current": i === qui ? "step" : null, testo:t[1]})));
    ol.style.setProperty("--fatto", String(qui / (tappe.length - 1)));
    colonna.append(ol);
    dove.append(colonna);
    dove.append(e("div", {class:"va-fondo va-fondo-conferma"}, [
      f.tipo === "ritiro"
        ? e("a", {class:"tasto primario va-tasto-largo", href:mappeNegozio(), target:"_blank",
            rel:"noopener", "aria-label":"Come arrivare: apri le indicazioni in Mappe"},
            [e("span", {testo:"Come arrivare"})])
        : e("a", {class:"tasto primario va-tasto-largo", target:"_blank", rel:"noopener",
            href:waNegozio("Ciao, vi scrivo per l’ordine " + o.codice + "."),
            "aria-label":"Scrivi al negozio su WhatsApp per questo ordine"},
            [e("span", {testo:"Scrivi al negozio"})])]));
    annuncia(f.titolo + ". " + f.quando + ". Ordine " + o.codice.split("").join(" "));
  }
  /* ═══ S6 · I TUOI ORDINI ════════════════════════════════════════
     Lo stato è una FRASE con la data (Shop), non un'etichetta. */
  function schermoOrdini(_id, dove){
    const pagina = schermo(dove, {titolo:"I tuoi ordini", indietro:torna,
      etichettaIndietro:"Torna alla vetrina"});
    const ordini = leggi().ordini || [];
    if(!ordini.length){
      pagina.append(vuoto({segno:"borsa", titolo:"Ancora nessun ordine",
        testo:"Quello che compri dall’app lo ritrovi qui, con lo stato e il giorno del ritiro.",
        azione:"Guarda la vetrina", suAzione: torna}));
      return;
    }
    pagina.append(e("div", {class:"va-ordini"}, ordini.map(o => {
      const f = frasiOrdine(o);
      const n = o.righe.reduce((k, r) => k + (r.quanti | 0), 0);
      const prima = o.righe.map(r => perId.get(r.id)).find(p => p && haFigura(p));
      const parti = [e("span", {class:"va-riga-testi"}, [
        e("span", {class:"va-ordine-frase", testo:f.quando}),
        e("span", {class:"va-riga-sotto cifra", testo:"Ordine " + o.codice + " · " +
          pezziDetti(n) + " · " + euro(o.totale)})])];
      if(prima) parti.push(e("span", {class:"va-mini va-mini-44"},
        [e("img", {src:quadroDi(prima), alt:"", loading:"lazy", decoding:"async", width:88, height:88})]));
      parti.push(segno("chevron", {misura:14, classe:"va-freccia"}));
      return e("button", {type:"button", class:"va-ordine",
        "aria-label":"Ordine " + o.codice + ": " + f.quando,
        suClick: () => spingi("ordine/" + o.codice)}, parti);
    })));
    annuncia("I tuoi ordini: " + ordini.length);
  }
  /* ═══ S7 · I PREFERITI ══════════════════════════════════════════ */
  function schermoPreferiti(_id, dove){
    const pagina = schermo(dove, {titolo:"Preferiti", indietro:torna,
      etichettaIndietro:"Torna alla vetrina"});
    const corpo = e("div", {class:"va-corpo-elenco"});
    pagina.append(corpo);
    function dipingi(){
      svuota(corpo);
      const ids = preferiti();
      if(!ids.length){
        corpo.append(vuoto({segno:"cuore", titolo:"Nessun preferito",
          testo:"Tocca il cuore su un pezzo: lo ritrovi qui, anche fra un mese.",
          azione:"Guarda la vetrina", suAzione: torna}));
        return;
      }
      const pezzi = ids.map(id => perId.get(id));
      const fig = pezzi.filter(haFigura), testi = pezzi.filter(p => !haFigura(p));
      if(fig.length) corpo.append(e("div", {class:"va-griglia", role:"list"}, fig.map(cellaPezzo)));
      if(testi.length) corpo.append(e("div", {class:"va-griglia va-testi", role:"list"}, testi.map(cellaPezzo)));
      sistemaMaterie(corpo);
    }
    dipingi();
    const via = iscrivi((s, _ev, prima) => {
      if(!dove.isConnected){ via(); return; }
      if(prima && s.preferiti !== prima.preferiti) dipingi();
    });
    annuncia("Preferiti: " + pezziDetti(preferiti().length));
  }
  /* ═══ S8 · LE PAGINE DI LEGGE ═══════════════════════════════════
     UNA schermata di testo, coi segnaposto DICHIARATI: il testo lo
     scrive il consulente di Regina, non l'app. */
  function schermoLegale(_id, dove){
    const pagina = schermo(dove, {titolo:"Termini, recesso e privacy", indietro:torna});
    const SEGNAPOSTO = "Testo da far scrivere al consulente di Regina.";
    const voci = [
      ["Recesso", "Chi compra a distanza può ripensarci entro 14 giorni dalla consegna o dal ritiro, senza dare motivi."],
      ["Resi e rimborsi", "Come si rende un pezzo, in quanto tempo arriva il rimborso e su quale metodo di pagamento."],
      ["Termini di vendita", "Prezzi, disponibilità, ritiro in negozio, spedizione e garanzia legale di conformità."],
      ["Privacy", "Quali dati tiene Regina (tessera, ordini, preferiti), perché, per quanto tempo e come chiederne la cancellazione."],
      ["Chi vende", "Ragione sociale, sede, partita IVA e contatti del venditore."]
    ];
    pagina.append(e("div", {class:"va-legale-testo"}, voci.flatMap(([t, cosa]) => [
      e("h2", {class:"va-legale-t", testo:t}),
      e("p", {class:"va-legale-p", testo:cosa}),
      e("p", {class:"va-legale-segnaposto", testo:SEGNAPOSTO})])));
    /* DATI DI PROVA, DICHIARATI: una riga sola, in fondo, non a ogni
       voce — chi legge «Chi vende» non deve incontrare tre volte lo
       stesso avviso. */
    pagina.append(e("p", {class:"va-legale-segnaposto",
      testo:"Bozza dimostrativa: articoli, prezzi, giacenze e ordini sono di prova."}));
    annuncia("Termini, recesso e privacy");
  }
  /* ═══ S9 · DA PARTE (la riserva senza pagamento, com'era) ═══════ */
  function schedaLista(_id, dove){
    const pagina = schermo(dove, {titolo:"Da parte", indietro:torna,
      etichettaIndietro:"Torna alla vetrina"});
    const corpo = e("div", {class:"vt-corpo"});
    pagina.append(corpo);
    const wa = (t) => waNegozio(t);
    dipingi();
    annuncia("Da parte: " + pezziDetti((leggi().wishlist || []).length));
    function dipingi(){
      svuota(corpo);
      const ids = (leggi().wishlist || []).filter(id => perId.has(id));
      if(!ids.length){
        corpo.append(vuoto({segno:"vetrina", titolo:"Niente da parte",
          testo:"I pezzi che metti da parte li trovi qui, e in negozio.",
          azione:"Guarda la vetrina", suAzione: torna}));
        return;
      }
      corpo.append(lista("I tuoi pezzi", ids.map(id => riga(perId.get(id)))));
      const totale = ids.reduce((n, id) => n + (perId.get(id).prezzo || 0), 0);
      corpo.append(e("div", {class:"vt-totale"}, [
        e("span", {class:"t-body", testo:"In tutto"}),
        e("span", {class:"t-head cifra", testo:euro(totale)})]));
      const manda = tasto(inviataIl() ? "Inviata" : "Manda la lista al negozio",
        {tipo:"primario", largo:true, suClick: () => {
          if(inviataIl()) return;
          invia("lista/inviata", {quando:new Date().toISOString(), letta_da:nomeCliente});
          vestiTasto(manda, "Inviata");
          manda.setAttribute("aria-pressed", "true"); manda.classList.add("vt-tenuto");
          toast("Al banco: " + nomeCliente + " legge la tua lista.");
          annuncia("Lista inviata al negozio.");
        }});
      if(inviataIl()){ manda.setAttribute("aria-pressed", "true"); manda.classList.add("vt-tenuto"); }
      corpo.append(e("div", {class:"vt-azioni"}, [manda,
        e("p", {class:"t-foot tenue vt-nota",
          testo:"Il negozio conferma su WhatsApp. Il pezzo resta da parte fino alla chiusura del giorno scritto."}),
        e("div", {class:"vt-riga-testuale"}, [tasto("Lo regalo io", {tipo:"terziario",
          etichetta:"Manda la lista a chi te lo regala",
          suClick: () => apriFoglio({titolo:"Lo regalo io", fermo:"basso", contenuto:foglioRegalo()})})])]));
    }
    function riga(p){
      const st = statoDaParte(p.id);
      const togli = e("button", {type:"button", class:"vt-togli",
        "aria-label":"Togli " + p.nome + " dai pezzi da parte",
        suClick: (ev) => { ev.stopPropagation(); togliDaParte(p.id);
          toast("Tolto dalla lista.", {annulla: () => { mettiDaParte(p.id); dipingi(); }});
          dipingi(); }}, [e("span", {testo:"Togli"})]);
      const parti = [];
      if(haFigura(p)) parti.push(e("img", {class:"fig vt-fig", src:quadroDi(p), alt:"", loading:"lazy"}));
      parti.push(e("div", {class:"testo"}, [e("b", {testo:p.nome}),
        e("span", {testo:euro(p.prezzo) + " · " + materiaPrincipale(materiaCorta(p))}),
        e("span", {class:"vt-stato" + (st.viva ? " viva" : ""),
          testo: st.viva ? "Da parte " + st.testo : st.testo})]), togli);
      return e("div", {class:"cella con-foto vt-riga", role:"listitem"}, parti);
    }
    function foglioRegalo(){
      const url = location.origin + location.pathname + "#/l/" + TOKEN;
      const dentro = e("div", {class:"vt-regalo"}, [
        e("p", {class:"t-body", testo:"Mandi un link con la tua lista: chi lo apre vede i pezzi e la misura, non il prezzo."}),
        e("p", {class:"t-foot tenue vt-link cifra", testo:url})]);
      dentro.append(e("div", {class:"colonna-tasti"}, [
        e("a", {class:"tasto primario largo", href:wa("Ciao, questa è la mia lista da Regina: " + url),
          target:"_blank", rel:"noopener", "aria-label":"Manda la lista su WhatsApp"},
          [e("span", {testo:"Manda su WhatsApp"})]),
        tasto("Copia il link", {tipo:"secondario", largo:true, suClick: async () => {
          try{ await navigator.clipboard.writeText(url); }catch(_){ /* resta il link scritto sopra */ }
          toast("Link copiato."); }}),
        tasto("Vedi la pagina che ricevono", {tipo:"terziario", suClick: () => { chiudiFoglio();
          setTimeout(() => { location.hash = "#/l/" + TOKEN; }, 60); }})]));
      return dentro;
    }
  }
  /* ═══ S10 · IL NEGOZIO (com'era) ════════════════════════════════ */
  function schedaNegozio(_id, dove){
    const pagina = schermo(dove, {titolo:NEGOZIO.nome, indietro:torna,
      etichettaIndietro:"Torna alla vetrina"});
    pagina.append(e("div", {class:"vt-insegna"},
      [e("img", {src:"marchio.png", alt:NEGOZIO.nome, class:"vt-marchio", decoding:"async"})]));
    const o = statoOrario();
    pagina.append(e("div", {class:"vt-testa"}, [
      e("p", {class:"t-body", testo:NEGOZIO.via + ", " + NEGOZIO.citta}),
      e("p", {class:"t-body vt-aperto" + (o.aperto ? " si" : ""), testo:o.detto})]));
    const ora = new Date().getDay();
    pagina.append(lista("Orari", ORDINE_GIORNI.map(i => {
      const g = NEGOZIO.orari[i];
      const c = cella({titolo:g.g, coda: g.f.length ? g.f.map(x => x[0] + "–" + x[1]).join(" · ") : "Chiuso"});
      if(i === ora) c.classList.add("vt-oggi");
      return c; })));
    const fuori = (testo, href, etichetta) => e("a", {class:"cella vt-esterno", href, target:"_blank",
      rel:"noopener", role:"listitem", "aria-label":etichetta}, [
      e("div", {class:"testo"}, [e("b", {testo})]), segno("chevron", {misura:14, classe:"frec"})]);
    pagina.append(lista("Contatti", [
      fuori("Indicazioni", mappeNegozio(), "Apri le indicazioni in Mappe"),
      fuori("Chiama", "tel:" + NEGOZIO.telefono, "Chiama il negozio al " + NEGOZIO.telefono_detto),
      fuori("Scrivi su WhatsApp", waNegozio("Ciao, vi scrivo dall’app Regina."), "Scrivi al negozio su WhatsApp")]));
    pagina.append(e("p", {class:"t-foot tenue vt-nota",
      testo:"Il negozio risponde su WhatsApp negli orari di apertura."}));
    pagina.append(e("p", {class:"t-foot tenue vt-nota",
      testo:"Bozza dimostrativa: indirizzo, orari, articoli, prezzi e ordini sono di prova."}));
    annuncia(NEGOZIO.nome + ". " + o.detto);
  }
  function statoOrario(){
    const d = new Date();
    const min = d.getHours() * 60 + d.getMinutes();
    const in_ = (s) => { const [h, m] = s.split(":").map(Number); return h * 60 + m; };
    const f0 = NEGOZIO.orari[d.getDay()].f;
    for(const [a, b] of f0) if(min >= in_(a) && min < in_(b)) return {aperto:true, detto:"Aperto · chiude alle " + b};
    for(const [a] of f0) if(min < in_(a)) return {aperto:false, detto:"Chiuso · apre alle " + a};
    for(let k = 1; k <= 7; k++){
      const i = (d.getDay() + k) % 7, f = NEGOZIO.orari[i].f;
      if(f.length) return {aperto:false, detto:"Chiuso · apre " +
        (k === 1 ? "domani" : NEGOZIO.orari[i].g.toLowerCase()) + " alle " + f[0][0]};
    }
    return {aperto:false, detto:"Chiuso"};
  }
  /* ═══ S11 · LA LISTA DI CHI REGALA (com'era) ════════════════════ */
  let strato = null;
  function apriOspite(){
    if(strato) return;
    const ids = (leggi().wishlist || []).filter(id => perId.has(id));
    strato = e("div", {class:"vt-ospite", role:"region", "data-tema":"chiaro",
      "aria-label":"La lista di " + nomeCliente});
    const dentro = e("div", {class:"vt-ospite-dentro"});
    dentro.append(e("div", {class:"vt-insegna vt-insegna-piccola"},
      [e("img", {src:"marchio.png", alt:NEGOZIO.nome, class:"vt-marchio", decoding:"async"})]),
      e("h1", {class:"t-1", tabindex:"-1", testo:"La lista di " + nomeCliente}),
      e("p", {class:"t-sub tenue", testo:NEGOZIO.nome + " · " + NEGOZIO.citta}));
    if(!ids.length) dentro.append(e("p", {class:"t-body vt-riga-testo", testo:"La lista è vuota, per ora."}));
    else dentro.append(lista("I pezzi", ids.map(id => { const p = perId.get(id);
      /* NIENTE PREZZO. La misura sì: è il motivo per cui la pagina esiste. */
      return cella({foto:quadroDi(p), titolo:p.nome,
        sotto:[materiaCorta(p), haMisure(p) && cliente.misura_anello
          ? "misura " + cliente.misura_anello : null].filter(Boolean).join(" · ")}); })));
    dentro.append(e("div", {class:"vt-azioni"}, [
      e("a", {class:"tasto primario largo", target:"_blank", rel:"noopener",
        href:waNegozio("Ciao, passo a vedere un pezzo della lista di " + nomeCliente + "."),
        "aria-label":"Passo a vederlo: scrivi al negozio su WhatsApp"}, [e("span", {testo:"Passo a vederlo"})]),
      e("p", {class:"t-foot tenue vt-nota", testo:nomeCliente + " non vede chi ha scelto cosa."}),
      tasto("Chiudi", {tipo:"terziario", suClick: () => { history.back(); }})]));
    strato.append(dentro);
    document.body.append(strato);
    document.body.dataset.ospite = "1";
    try{ strato.querySelector("h1").focus({preventScroll:true}); }catch(_){}
    annuncia("La lista di " + nomeCliente + ", " + pezziDetti(ids.length));
  }
  function chiudiOspite(){
    if(!strato) return;
    strato.remove(); strato = null;
    delete document.body.dataset.ospite;
  }
  const guardaOspite = () => {
    if(/^#\/l\/([^/]+)$/.test(location.hash)) apriOspite(); else chiudiOspite();
  };
  addEventListener("hashchange", guardaOspite);
  addEventListener("popstate", guardaOspite);
  /* ── IL PRIMO DISEGNO ─────────────────────────────────────────── */
  disegna();
  iscrivi((s, ev, prima) => {
    if(/^nav\//.test(ev.tipo)) aggiornaCopertura();
    if(!prima) return;
    if(s.borsa !== prima.borsa) vestiBorsa();
    if(s.preferiti !== prima.preferiti){ vestiPreferiti(); rivestiCuori(); }
    if(s.ordini !== prima.ordini){ if(nodi.coda) nodi.coda.riempi(); if(nodi.corpo) ridisegnaGriglia(false); }
    if(s.wishlist !== prima.wishlist && nodi.coda) nodi.coda.riempi();
    if(ev.tipo === "demo/reset") disegna();
  });
  addEventListener("popstate", aggiornaCopertura);
  aggiornaCopertura();
  /* chi arriva da fuori su una rotta a segmento solo o sulla pagina
     pubblica: `avviaRotta()` non le ricostruisce, lo fa chi le possiede */
  {
    const l = /^#\/l\/([^/]+)$/.exec(INDIRIZZO_0);
    const m = /^#\/vetrina\/(lista|negozio)$/.exec(INDIRIZZO_0);
    if(l && !/^#\/l\//.test(location.hash)) setTimeout(() => {
      try{ history.replaceState(null, "", INDIRIZZO_0); }catch(_){}
      apriOspite(); }, 80);
    else if(l) apriOspite();
    else if(m && !profondita("vetrina")) setTimeout(() => {
      if(tabCorrente() !== "vetrina") vaiA("vetrina");
      spingi(m[1]); }, 80);
  }
  /* la maniglia per le sonde, dichiarata come `window.__regina` */
  window.__vetrina = {
    get famiglia(){ return filtri.famiglia; },
    get visti(){ return visti().tutti.map(p => p.id); },
    get daparte(){ return [...(leggi().wishlist || [])]; },
    get scadenze(){ const m = {};
      for(const id of (leggi().wishlist || [])){ const f = scadenzaDi(id); if(f) m[id] = f; }
      return m; },
    get inviata(){ return inviataIl(); },
    get borsa(){ return borsa().map(r => ({...r})); },
    get preferiti(){ return [...preferiti()]; },
    get ordini(){ return (leggi().ordini || []).map(o => ({...o})); },
    disponibili: (id, mis) => perId.has(id) ? dispo(perId.get(id), mis == null ? null : String(mis)) : 0,
    /* IL NEGOZIO CHE AVANZA L'ORDINE: oggi questa maniglia, domani il
       gestionale. Nessun comando a schermo lo fa, ed è giusto. */
    avanza: (codice, stato) => invia("ordine/stato", {codice, stato, quando:new Date().toISOString()}),
    adattatore: paga.nome, token: TOKEN, negozio: NEGOZIO
  };
  return {schermi: {
    pezzo: schedaPezzo, borsa: schermoBorsa, pagamento: schermoPagamento,
    ordine: schermoOrdine, ordini: schermoOrdini, preferiti: schermoPreferiti,
    legale: schermoLegale, lista: schedaLista, negozio: schedaNegozio
  }};
}
