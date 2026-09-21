/* ═══════════════════════════════════════════════════════════════════
   app/viste/perte.js — F5 · «PER TE», IL MOTORE DEL RITORNO.

   Da dove viene. Fino al 15/09 questa vista era uno scheletro onesto:
   gli arrivi in una lista, le date in un'altra, un riquadro di promo
   con un tasto dichiarato «F5». Niente di quello era sbagliato — era
   solo un ELENCO DI CAMPI. Un elenco di campi non fa tornare nessuno.

   La legge che comanda tutto il file (48 §0, Netflix TMIS 2016,
   Baymard). NESSUN BLOCCO SI CHIAMA «PER TE» O «CONSIGLIATI». Il titolo
   di ogni blocco È LA REGOLA che l'ha generato, scritta in italiano
   che la cliente può verificare da sola: «Ti chiude la collezione Filo
   di Luce», «Della tua misura (14)». Baymard ha registrato il danno di
   un'etichetta vaga: «When they say "Recommended for you," I assume
   they will fit» — e la custodia non stava sulla fotocamera. Se non si
   riesce a scrivere la regola in una riga, QUEL BLOCCO NON ESISTE.

   Il motore non è un modello: è una TABELLA DI QUATTRO REGOLE in
   ordine fisso, e la prima che scatta si prende il blocco grande.
     1 chiude_collezione   2 data_vicina (≤ 14 gg)
     3 arrivo_in_collezione   4 misura/materia/come_regalato (solo rail)
   Sta tutta in `proposte(stato)`, che è PURA e non tocca il DOM: la si
   collauda in node con quattro stati costruiti a mano (sonda
   `_F5_motore.mjs`), ed è il motivo per cui nella prima metà di
   questo file non c'è una riga che chiami `document`. Chi la sposta,
   la rompe.

   Cio' che NON si fa, e non per gusto (carta psicologica, «Da NON
   fare»): niente countdown — le finestre si scrivono con le DATE per
   esteso; niente «ultimi pezzi» senza numero; niente barre a zero — una
   collezione in cui non hai niente non è «tua» e non prende una fila;
   niente coriandoli, stelle, suoni; niente ricompensa variabile sul SE.

   Il debito, chiuso il 15/09. «Ricordamelo» aveva bisogno di un ramo
   nello store, e F3b gliel'ha dato: `s.promemoria` esiste, il riduttore
   conosce `promemoria/segna`, e il ponte in localStorage è sparito.
   `riduciPromemoria` resta qui, puro ed esportato, perché è la stessa
   funzione che il riduttore applica e le prove del motore la usano da
   sola, fuori dalla pagina.
   ═══════════════════════════════════════════════════════════════════ */

import { e, annuncia } from "app/ui/dom.js";
import { segno } from "app/ui/segni.js";
import { tasto, vestiTasto } from "app/ui/tasto.js";
import { cella, lista } from "app/ui/cella.js";
import { schermo } from "app/ui/barra-nav.js";
import { toast } from "app/ui/toast.js";
import { spingi, registraSchermo, torna, vaiA, tabCorrente } from "app/rotta.js";
import { conTransizione, RIDOTTO, lineare } from "app/moto.js";
import { osso } from "app/ui/scheletro.js";
import { vuoto } from "app/ui/vuoto.js";
/* IL TITOLARE, per la riga del pin del negozio («Stefano ha pensato a
   te», F6 21/09): il nome vero vive in `dati/negozio.js` e non si
   scrive a mano una seconda volta qui. Modulo leggero (un oggetto),
   import statico come `provini.js` qui sotto. */
import { NEGOZIO } from "app/dati/negozio.js";
/* F5b — IL MOTORE, MAI STATICO (banco prestazioni 20/09: 616 KB di JS
   all'avvio, e la causa era proprio questo `import` — 60 KB di motore
   dentro una vista che a boot non è nemmeno quella attiva, delle
   quattro). `proposte()` di QUESTO file resta quello di sempre (le
   quattro regole storiche, che collezioni/promo/arrivi continuano a
   leggere invariate): il blocco grande e i rail, soli, vengono dal
   motore — caricato con `import()` DINAMICO, vedi `caricaMotore` più
   giù, non da qui. */
/* il colore di fondo dei provini (non un ruolo del sistema: è un dato
   del modulo dei provini, quindi si porta da lì e si scrive in linea —
   mai un hex dentro `perte.css`). Serve solo quando il blocco grande
   mostra una foto: vedi `cardProposta`. Questo modulo è leggero
   (una mappa di stringhe): resta un import statico. */
import { PROVINO_FONDO } from "app/dati/provini.js";

/* ═══════════════════════════════════════════════════════════════════
   PARTE PRIMA — IL MOTORE. Da qui fino a «PARTE SECONDA» non si tocca
   il DOM e non si chiama niente di importato: è la metà del file che
   gira in node.
   ═══════════════════════════════════════════════════════════════════ */

export const GIORNI_DATA_VICINA = 14;   /* 48 §5.1, regola 2 */
export const RAIL_MINIMO = 3;           /* 48 §5.1: «solo se ha ≥ 3 pezzi veri» */
export const RAIL_MASSIMO = 3;          /* 48 §5.1: «1 grande + al massimo 3 rail» */
export const CARD_PER_RAIL = 6;
export const ARRIVI_IN_HOME = 2;

const NUMERI = ["Nessun", "Un", "Due", "Tre", "Quattro", "Cinque", "Sei",
                "Sette", "Otto", "Nove", "Dieci"];
export const numero = (n) => NUMERI[n] || String(n);

/* ── LE DATE ───────────────────────────────────────────────────────
   Tutto in UTC e per giorni interi: `new Date("2026-09-15")` letto in
   fuso locale può cadere il 14 alle 23, e un «mancano 14 giorni»
   sbagliato di uno è esattamente il difetto che nessuno vede in bozza
   e tutti vedono in mano al cliente. */
const GIORNO = 86400000;
export function aGiorni(iso){
  const p = String(iso || "").split("-");
  if(p.length !== 3) return NaN;
  return Date.UTC(+p[0], +p[1] - 1, +p[2]) / GIORNO;
}
export const giorniFra = (da, a) => aGiorni(a) - aGiorni(da);
export const meseDi = (iso) => +String(iso || "").slice(5, 7);
export const annoDi = (iso) => +String(iso || "").slice(0, 4);

function isoDa(g){
  const d = new Date(g * GIORNO);
  return d.getUTCFullYear() + "-" + String(d.getUTCMonth() + 1).padStart(2, "0") +
         "-" + String(d.getUTCDate()).padStart(2, "0");
}
export function isoMeno(iso, n){ return isoDa(aGiorni(iso) - n); }
export function isoPiu(iso, n){ return isoDa(aGiorni(iso) + n); }
export function ultimoDelMese(iso){
  const a = annoDi(iso), m = meseDi(iso);
  return isoDa(Date.UTC(m === 12 ? a + 1 : a, m === 12 ? 0 : m, 1) / GIORNO - 1);
}
export const oggiVero = () => isoDa(Math.floor(Date.now() / GIORNO));

let _fLunga = null, _fCorta = null, _fMese = null;
const fLunga = () => (_fLunga = _fLunga || new Intl.DateTimeFormat("it-IT",
  {weekday: "long", day: "numeric", month: "long", timeZone: "UTC"}));
const fCorta = () => (_fCorta = _fCorta || new Intl.DateTimeFormat("it-IT",
  {day: "numeric", month: "long", year: "numeric", timeZone: "UTC"}));
const fMese  = () => (_fMese  = _fMese  || new Intl.DateTimeFormat("it-IT",
  {month: "long", timeZone: "UTC"}));

/* «giovedì 18 settembre» — il giorno della settimana c'è sempre: è
   cio' che trasforma una data in un APPUNTAMENTO (48 §5.4, Apple Store
   «Sessions»: data + ora + luogo + un'azione). */
export function dataLunga(iso){
  const g = aGiorni(iso); if(!isFinite(g)) return "";
  return fLunga().format(new Date(g * GIORNO));
}
export function dataCorta(iso){
  const g = aGiorni(iso); if(!isFinite(g)) return "";
  return fCorta().format(new Date(g * GIORNO));
}
export function nomeMese(mese){
  return fMese().format(new Date(Date.UTC(2026, (mese | 0) - 1, 1)));
}
/* il giorno e il mese, senza anno: «16 settembre» */
export function giornoEMese(iso){
  const g = aGiorni(iso); if(!isFinite(g)) return "";
  const d = new Date(g * GIORNO);
  return d.getUTCDate() + " " + nomeMese(d.getUTCMonth() + 1);
}
/* solo il giorno della settimana: «giovedì». Serve a «Te lo ricordiamo
   mercoledì alle 9», dove la data per esteso sarebbe rumore. */
export function soloGiorno(iso){
  return String(dataLunga(iso)).split(" ")[0] || "";
}
/* «lunedì 22» — giorno della settimana + numero, SENZA il mese: la
   forma scelta da Massimo per «Va bene: torno a proporti qualcosa
   lunedì 22» (E08-C, 21/09). `dataLunga` porta anche il mese, che qui
   sarebbe la terza informazione in una frase che ne vuole due. */
export function giornoBreve(iso){
  const g = aGiorni(iso); if(!isFinite(g)) return "";
  return soloGiorno(iso) + " " + new Date(g * GIORNO).getUTCDate();
}

/* Nessun countdown, mai: la carta psicologica lo vieta, e Sephora e
   Starbucks — che di programmi fedelta' vivono — scrivono le date. */
export function daQuandoInVetrina(iso){
  return "In vetrina da " + dataLunga(iso);
}

/* la prossima volta che cade una ricorrenza {giorno, mese}: quest'anno
   se non è ancora passata, altrimenti l'anno prossimo. */
export function prossimaRicorrenza(r, oggi){
  const a0 = annoDi(oggi);
  const iso = (a) => a + "-" + String(r.mese).padStart(2, "0") + "-" +
                     String(r.giorno).padStart(2, "0");
  const q = iso(a0);
  return giorniFra(oggi, q) >= 0 ? q : iso(a0 + 1);
}

/* ── COME SI CHIAMA UNA DATA ───────────────────────────────────────
   I dati portano un'`etichetta` scritta da una persona («Il tuo
   compleanno», «Anniversario di matrimonio con Antonio»): una
   concatenazione cieca «Per » + etichetta produce «Per anniversario di
   matrimonio», che non è italiano. Si passa perciò dal `tipo`, che è
   un dato vero, e l'etichetta resta la scorta. */
export function titoloData(r, oggi){
  const q = prossimaRicorrenza(r, oggi);
  const quando = ", il " + giornoEMese(q);
  const et = String(r.titolo || r.etichetta || "").trim();
  if(r.tipo === "compleanno"){
    if(r.propria) return "Per il tuo compleanno" + quando;
    const chi = et.replace(/^.*?\bdi\s+/i, "");
    return "Per il compleanno di " + (chi || et) + quando;
  }
  if(r.tipo === "anniversario") return "Per il tuo anniversario" + quando;
  if(!et) return "Per la tua data" + quando;
  return "Per " + et.charAt(0).toLowerCase() + et.slice(1) + quando;
}

/* ── LA MATERIA CHE PORTA ──────────────────────────────────────────
   Non è una preferenza dichiarata: è cio' che ha comprato. Si conta
   il metallo degli articoli che possiede e vince il più frequente. Con
   un pezzo solo non c'è nessuna prevalenza — c'è un pezzo — e il rail
   non nasce: è la differenza fra una regola e una supposizione. */
export function materiaPrevalente(articoliPosseduti){
  const conta = new Map();
  for(const a of articoliPosseduti){
    const m = a && a.attributi && a.attributi.metallo;
    if(!m) continue;
    conta.set(m, (conta.get(m) || 0) + 1);
  }
  let vinto = null, n = 0;
  for(const [m, c] of conta) if(c > n){ vinto = m; n = c; }
  return n >= 2 ? vinto : null;
}
const haMetallo = (a, m) => !!(a && a.attributi && a.attributi.metallo === m);

/* ── IL REGALO PER UNA DATA ────────────────────────────────────────
   48 §5.1 regola 2: «pezzi nella materia/misura … se nota». L'ordine è
   DICHIARATO: prima chi combacia, poi il pezzo più importante, poi
   l'id. Nessuna casualita': una proposta che cambia a ogni apertura non
   si può verificare, e non si può nemmeno difendere al banco. */
export function regaloPer(candidati, cliente, mat){
  const punti = (a) => {
    let p = 0;
    if(cliente.misura_anello && a.attributi &&
       String(a.attributi.misura) === String(cliente.misura_anello)) p += 2;
    if(mat && haMetallo(a, mat)) p += 1;
    return p;
  };
  return candidati.slice().sort((x, y) =>
    punti(y) - punti(x) || (y.prezzo | 0) - (x.prezzo | 0) ||
    String(x.id).localeCompare(String(y.id)))[0] || null;
}

/* ── LA FRASE DELLA COLLEZIONE ─────────────────────────────────────
   Le promo stanno nei dati (`collezioni.js`) e dichiarano QUANDO
   valgono. Qui si sceglie quella che vale adesso, e non se ne inventa
   nessuna: se il dato non c'è, la riga non c'è.

   DA DUE MANCANTI IN SU LA FRASE NON ESISTE (critic, 15/09). Il dato
   porta «Ne mancano 3: alla chiusura quello che resta va in sconto», e
   con tre pezzi mancanti quella è una ricompensa PROMESSA a chi è
   lontano dal traguardo: la carta psicologica la vieta (gradiente di
   scopo — la spinta si da' a UNO dalla chiusura, non a tre) e a schermo
   suonava come una vendita. A due o più mancanti si dice il numero e
   basta. */
export function frasePromo(c, manca){
  const p = (c && c.promo) || {};
  if(manca === 0) return p.chiusa || null;
  if(manca === 1) return p.manca1 || null;
  return null;
}

/* ══ IL RIDUTTORE DEL PROMEMORIA — FUSO IN app/stato.js IL 15/09 ════
   Evento: `promemoria/segna` {id, articolo, quando, creato}.
   Puro, immutabile a un livello, idempotente: toccarlo due volte non
   raddoppia la riga — e «Ricordamelo» si tocca due volte, sempre.
   Il riduttore vero è quello di `app/stato.js`, riga per riga identico
   a questo. Questa copia resta esportata perché le prove del motore la
   provano DA SOLA, senza pagina e senza store: una funzione che si può
   collaudare in isolamento è una funzione di cui si sa qualcosa. Se un
   giorno le due divergono, quella sbagliata è questa. */
export const EVENTO_PROMEMORIA = "promemoria/segna";
export function riduciPromemoria(s, dato = {}){
  const pr = s.promemoria || [];
  if(!dato.id || pr.some((x) => x.id === dato.id)) return s;
  return {...s, promemoria: [...pr, {
    id: dato.id,
    articolo: dato.articolo || null,
    quando: dato.quando || null,      /* il giorno in cui si avvisa, ISO */
    creato: dato.creato || null
  }]};
}

/* ── LA RIGA DI STATO DI UNA COLLEZIONE: UNA SOLA ──────────────────
   Sull'hub erano TRE, una sotto l'altra: il conteggio («4 di 5 · ti
   manca: Pendente Filo»), il premio in turchese («Chiudi con Pendente
   Filo: ricevi Il Filo») e la frase della promo («Ti manca un pezzo
   solo: quello che resta è tuo al 20% …»). Tre righe che dicono la
   stessa cosa a tre gradi diversi sono tre voci che parlano insieme, e
   accanto a Mejuri si vedeva: la sezione non aveva più una gerarchia,
   aveva un elenco di avvisi.
   Da qui in avanti è UNA riga — il conteggio — e la coda che dice
   cosa si riceve compare SOLO a uno dalla chiusura, che è il momento
   in cui la carta psicologica vuole la spinta. Sotto, UNA azione. */
export function rigaStato(c){
  const base = c.ha + " di " + c.totale;
  if(c.manca === 0) return base + " · completa";
  if(c.manca === 1){
    if(c.premio) return base + " · " +
      c.premio.charAt(0).toLowerCase() + c.premio.slice(1);
    return base + " · ti manca: " + (c.mancanti[0] ? c.mancanti[0].nome : "un pezzo");
  }
  return base + " · te ne mancano " + c.manca;
}

/* ══════════════════════════════════════════════════════════════════
   `proposte(stato)` — IL MOTORE, PURO.
   stato = {s, catalogo, collezioni, oggi}
     s          lo stato dello store (esemplari, arrivi, ricorrenze, …)
     catalogo   gli articoli già innestati (app/innesto.js)
     collezioni la mappa id -> collezione
     oggi       ISO. È un INGRESSO e non `new Date()`: una bozza che si
                guarda fra due mesi non deve dire «l'anniversario era
                sessanta giorni fa» (seme.js, `oggi`).
   ══════════════════════════════════════════════════════════════════ */
export function proposte(stato = {}){
  const s = stato.s || {};
  const catalogo = stato.catalogo || [];
  const mappaColl = stato.collezioni || {};
  const oggi = stato.oggi || "1970-01-01";
  const cliente = s.cliente || {};

  const perId = new Map(catalogo.map((a) => [a.id, a]));
  const vivi = (s.esemplari || []).filter((x) => !x.rimosso);

  /* «POSSEDUTI» NON È «TUTTI GLI ESEMPLARI». Un `venduto` è pagato ma
     non ancora scartato: sta in negozio ed è la sorpresa. Contarlo
     chiuderebbe una collezione nella testa dell'app mentre in quella
     della cliente ne manca ancora uno — e allora la regola 1 non
     scatterebbe proprio il giorno in cui serve. Due insiemi, non uno:
     non si conta fra i posseduti, e non si ripropone in vetrina. */
  const posseduti = new Set(vivi.filter((x) => x.stato !== "venduto").map((x) => x.articolo));
  const inAttesa = new Set(vivi.filter((x) => x.stato === "venduto").map((x) => x.articolo));
  const quando = new Map();
  for(const x of vivi) if(x.data_vendita) quando.set(x.articolo, x.data_vendita);

  const suoi = [...posseduti].map((id) => perId.get(id)).filter(Boolean);
  const materia = materiaPrevalente(suoi);

  const arrivi = (s.arrivi || []).filter((a) => a && a.articolo && perId.has(a.articolo));
  const arrivoDi = new Map(arrivi.map((a) => [a.articolo, a]));

  /* ── LE COLLEZIONI, con la fila ────────────────────────────────── */
  const collezioni = [];
  for(const id of Object.keys(mappaColl)){
    const c = mappaColl[id];
    const elenco = (c && c.pezzi) || [];
    if(!elenco.length) continue;
    const posti = elenco.map((pid) => {
      const a = perId.get(pid) || null;
      return {articolo: pid, nome: (a && a.nome) || pid, foto: (a && a.foto) || null,
              prezzo: a ? a.prezzo : 0, ha: posseduti.has(pid)};
    });
    const ha = posti.filter((p) => p.ha).length;
    const mancanti = posti.filter((p) => !p.ha);
    const manca = mancanti.length;
    const date = elenco.filter((p) => posseduti.has(p)).map((p) => quando.get(p))
                       .filter(Boolean).sort();
    const arr = mancanti.map((p) => arrivoDi.get(p.articolo)).find(Boolean) || null;
    collezioni.push({
      id, nome: (c && c.nome) || id, racconto: (c && c.racconto) || "",
      stagione: (c && c.stagione) || "",
      totale: posti.length, ha, manca, chiusa: manca === 0,
      posti, mancanti, chiude: (c && c.chiude) || null,
      frase: frasePromo(c, manca),
      /* IL PREMIO SI SCRIVE IN CHIARO, e viene dal dato della collezione
         (Topps «Sets & Awards»: il premio ha un tipo e un nome). Se la
         collezione non dichiara chi la chiude, la riga non esiste.

         E SI SCRIVE SOLO A UNO DALLA CHIUSURA. Fino al 15/09 usciva da
         `manca > 0`, e sull'hub si leggeva «Chiudi con Perno Turchese:
         ricevi La Pietra» sotto un conteggio che diceva «te ne mancano
         3». Era falso due volte: non basta quel pezzo, e il premio
         veniva promesso a chi non è in vista del traguardo. La carta
         psicologica mette la spinta a UN pezzo dalla chiusura, e questa
         riga È la spinta. */
      premio: (c && c.chiude && manca === 1)
        ? "Chiudi con " + (mancanti[0] ? mancanti[0].nome : "l’ultimo") +
          ": ricevi " + c.chiude.nome
        : null,
      arrivo: arr ? {articolo: arr.articolo, data: arr.data,
                     testo: "Dove: in vetrina da " + dataLunga(arr.data)} : null,
      da: date[0] || null, a: date[date.length - 1] || null
    });
  }
  /* «mai una fila a zero» (Nunes & Dreze 2006, dote reale): una
     collezione in cui non hai niente NON È TUA, e non prende né fila
     né conteggio. Si entra comprandone uno. */
  const mie = collezioni.filter((c) => c.ha > 0);
  const altre = collezioni.filter((c) => c.ha === 0);

  /* ── LE QUATTRO REGOLE, IN ORDINE FISSO ────────────────────────── */
  let blocco = null;

  /* 1 · chiude_collezione */
  const chiudibile = mie.find((c) => c.manca === 1 && c.mancanti[0]);
  if(chiudibile){
    const m = chiudibile.mancanti[0];
    blocco = {
      regola: "chiude_collezione", collezione: chiudibile.id,
      occhiello: "Ti chiude la collezione " + chiudibile.nome,
      articolo: m.articolo, nome: m.nome, foto: m.foto, prezzo: m.prezzo,
      riga: "Ne hai " + chiudibile.ha + " su " + chiudibile.totale +
            (chiudibile.chiude ? " · con questo ricevi " + chiudibile.chiude.nome
                               : " · con questo la chiudi"),
      perche: chiudibile.frase
    };
  }

  /* 2 · data_vicina (≤ 14 giorni) */
  const vicine = (s.ricorrenze || [])
    .map((r) => { const q = prossimaRicorrenza(r, oggi);
                  return {r, q, giorni: giorniFra(oggi, q)}; })
    .filter((x) => x.giorni >= 0 && x.giorni <= GIORNI_DATA_VICINA)
    .sort((a, b) => a.giorni - b.giorni);
  if(!blocco && vicine.length){
    const v = vicine[0];
    const p = regaloPer(
      catalogo.filter((a) => !posseduti.has(a.id) && !inAttesa.has(a.id)), cliente, materia);
    if(p) blocco = {
      regola: "data_vicina", data: v.q, ricorrenza: v.r.id,
      occhiello: titoloData(v.r, oggi),
      articolo: p.id, nome: p.nome, foto: p.foto, prezzo: p.prezzo,
      riga: p.materia || "",
      perche: (p.attributi && String(p.attributi.misura) === String(cliente.misura_anello))
        ? "Della tua misura (" + cliente.misura_anello + ")"
        : (materia && haMetallo(p, materia) ? "Nella tua materia (" + materia + ")" : null)
    };
  }

  /* 3 · arrivo_in_collezione */
  if(!blocco){
    const idMie = new Set(mie.map((c) => c.id));
    for(const a of arrivi){
      const art = perId.get(a.articolo);
      if(!art || posseduti.has(art.id) || inAttesa.has(art.id)) continue;
      const c = collezioni.find((x) => x.id === art.collezione && idMie.has(x.id));
      if(!c) continue;
      blocco = {
        regola: "arrivo_in_collezione", collezione: c.id, data: a.data,
        occhiello: daQuandoInVetrina(a.data),
        articolo: art.id, nome: art.nome, foto: art.foto, prezzo: art.prezzo,
        riga: "Collezione " + c.nome + (c.manca === 1 ? " · è il pezzo che ti manca"
                                                      : " · te ne mancano " + c.manca),
        perche: c.frase
      };
      break;
    }
  }

  /* 4 · i RAIL. Mai il blocco grande: sono l'altra metà della tabella,
     e un rail promosso a blocco è una promessa più grande del suo
     fondamento. Esistono solo con ≥ 3 pezzi veri in negozio. */
  const gia = new Set(blocco ? [blocco.articolo] : []);
  const libero = (a) => !posseduti.has(a.id) && !inAttesa.has(a.id) && !gia.has(a.id);
  const rail = [];

  if(cliente.misura_anello){
    const p = catalogo.filter((a) => libero(a) && a.attributi &&
      String(a.attributi.misura) === String(cliente.misura_anello));
    if(p.length >= RAIL_MINIMO){
      const tuo = suoi.find((a) => a.attributi &&
        String(a.attributi.misura) === String(cliente.misura_anello));
      rail.push({regola: "misura",
        titolo: "Della tua misura (" + cliente.misura_anello + ")",
        sotto: tuo ? "Anelli come il tuo " + tuo.nome : "Anelli che ti entrano",
        pezzi: p.slice(0, CARD_PER_RAIL), altri: Math.max(0, p.length - CARD_PER_RAIL)});
    }
  }
  if(materia){
    const p = catalogo.filter((a) => libero(a) && haMetallo(a, materia));
    if(p.length >= RAIL_MINIMO) rail.push({regola: "materia",
      titolo: "Nella tua materia (" + materia + ")",
      sotto: "Come i pezzi che porti già",
      pezzi: p.slice(0, CARD_PER_RAIL), altri: Math.max(0, p.length - CARD_PER_RAIL)});
  }
  /* `regalato_a` non esiste ancora nei dati (gli esemplari portano `da`,
     cioè chi ha regalato A LEI). Finché non c'è, il rail non c'è:
     un rail «Come quello che hai regalato a …» senza un regalo fatto è
     un'etichetta che la cliente non può verificare — proprio il danno
     che Baymard ha misurato. */
  const donato = vivi.find((x) => x.regalato_a);
  if(donato){
    const base = perId.get(donato.articolo) || null;
    const p = catalogo.filter((a) => libero(a) && base && a.collezione === base.collezione);
    if(p.length >= RAIL_MINIMO) rail.push({regola: "come_regalato",
      titolo: "Come quello che hai regalato a " + donato.regalato_a,
      sotto: base ? base.nome : "",
      pezzi: p.slice(0, CARD_PER_RAIL), altri: Math.max(0, p.length - CARD_PER_RAIL)});
  }

  /* ── GLI ARRIVI: l'elenco intero, i più recenti in testa ──────────
     F6 (21/09, verdetto di Massimo, riga «Arrivi» del gruppo di lista):
     la radice non mostra più le card degli arrivi — mostra la RIGA che
     apre l'elenco intero. `arriviTutti` è quell'elenco, senza taglio;
     `arrivi` resta il vecchio taglio a due (ARRIVI_IN_HOME) perché
     `_F5_motore.mjs` lo misura così da prima del 21/09 — due campi,
     stessa fonte, un solo `.map`. */
  const arriviTutti = arrivi
    .filter((a) => !gia.has(a.articolo) && !posseduti.has(a.articolo))
    .slice()
    .sort((x, y) => String(y.data).localeCompare(String(x.data)))
    .map((a) => {
      const art = perId.get(a.articolo) || {};
      const c = collezioni.find((x) => x.id === art.collezione) || null;
      return {
        id: "arr-" + a.articolo, articolo: a.articolo, data: a.data,
        nome: art.nome || a.articolo, foto: art.foto || null, prezzo: art.prezzo || 0,
        occhiello: daQuandoInVetrina(a.data),
        riga: c ? ("Collezione " + c.nome +
                   (c.ha > 0 && c.manca === 1 ? " · è il pezzo che ti manca" : ""))
                : (art.materia || ""),
        /* l'avviso è il giorno PRIMA, se un giorno prima c'è ancora;
           altrimenti domani. L'anticipo non lo sceglie la cliente (Nike
           lo lascia scegliere, noi no): il budget è ≤ 1 a settimana. */
        avviso: giorniFra(oggi, a.data) >= 1 ? isoMeno(a.data, 1) : isoPiu(oggi, 1)
      };
    });
  const inNegozio = arriviTutti.slice(0, ARRIVI_IN_HOME);

  /* ── LE CARD P4: promo attiva OGGI, e il mese del compleanno ────── */
  const promoViva = (s.promozioni || []).find((p) =>
    p && p.dal && p.al && giorniFra(p.dal, oggi) >= 0 && giorniFra(oggi, p.al) >= 0) || null;

  const comp = (s.ricorrenze || []).find((r) => r.tipo === "compleanno" && r.propria);
  let compleanno = null;
  if(comp && +comp.mese === meseDi(oggi)){
    /* il regalo è UN PEZZO FRA TRE, sotto i 30 €, e si ritira in
       negozio (Sephora: in-store è l'unico canale senza minimo;
       Nespresso: il MESE, non il giorno — la finestra larga toglie
       l'ansia). La variabilita' è sul COSA, mai sul SE. */
    const tre = catalogo
      .filter((a) => !posseduti.has(a.id) && !inAttesa.has(a.id) && (a.prezzo | 0) <= 3000)
      .sort((x, y) => (y.prezzo | 0) - (x.prezzo | 0) || String(x.id).localeCompare(String(y.id)))
      .slice(0, 3);
    const fine = ultimoDelMese(oggi);
    compleanno = {
      tipo: "compleanno",
      occhiello: nomeMese(meseDi(oggi)) + " è il tuo mese",
      titolo: "Un pezzo per te, fino a 30 €",
      riga: "Lo scegli in negozio, entro il " + giornoEMese(fine) + ".",
      nota: tre.length === 3 ? "Tre a scelta: " + tre.map((a) => a.nome).join(", ") + "." : null,
      scelte: tre,
      /* F6 — QUANDO SCADE, non solo quando è nato (riga «Per te questo
         mese» del gruppo di lista, che sceglie fra compleanno e promo
         quella più vicina alla fine): il regalo di compleanno chiude
         all'ultimo del mese, la stessa data che `riga` già scrive a
         parole. `al` è quella data in ISO, per il confronto. */
      al: fine
    };
  }
  const promo = promoViva ? {
    tipo: "promo",
    occhiello: "Dal " + giornoEMese(promoViva.dal) + " al " + giornoEMese(promoViva.al),
    titolo: promoViva.nome || "Una promozione del negozio",
    riga: promoViva.testo || "",
    nota: "In negozio, al banco. Nessun codice.",
    al: promoViva.al
  } : null;

  /* la riga del ritorno: SOLO se lo store ha davvero un fatto da dire.
     Senza `ultimaApertura` non c'è nessuna fotografia di prima, e una
     riga di ritorno inventata è peggio di nessuna riga. */
  const ritorno = (s.ultimaApertura && s.ritorno)
    ? (typeof s.ritorno === "string" ? s.ritorno : (s.ritorno.testo || s.ritorno.riga || null))
    : null;

  return {
    oggi, posseduti, inAttesa, materia, cliente,
    blocco, rail: rail.slice(0, RAIL_MASSIMO), collezioni, mie, altre,
    arrivi: inNegozio, arriviTutti, promo, compleanno, ritorno,
    fine: "Non c’è altro, per ora."
  };
}

/* ═══════════════════════════════════════════════════════════════════
   PARTE SECONDA — LA VISTA. Da qui in giu' si tocca il DOM.
   ═══════════════════════════════════════════════════════════════════ */

/* F5b — IL MOTORE, CARICATO A RICHIESTA (banco prestazioni 20/09: 616
   KB di JS all'avvio, e la causa era l'import STATICO di questo modulo
   — 60 KB — dentro una vista che a boot non è nemmeno quella attiva).
   Una variabile di MODULO, non di `monta()`: due montaggi (non dovrebbe
   succedere, ma) non chiederebbero il pacchetto due volte, e una volta
   arrivato resta per tutta la vita della pagina. `caricaMotore()` non
   tocca il DOM e non sa di `monta()`: chi la chiama decide quando
   ridisegnare. */
let motoreProposte = null;
let motoreCaricamento = null;
/* CARICAMENTO ≠ FALLIMENTO: finché è in corso si mostra lo scheletro;
   se fallisce (rete assente) la sezione non compare più, nemmeno come
   scheletro — uno scheletro che non finisce mai di caricare sarebbe una
   bugia, non un'attesa. */
let motoreFallito = false;
function caricaMotore(){
  if(motoreProposte) return Promise.resolve(motoreProposte);
  if(!motoreCaricamento){
    motoreCaricamento = import("app/motore/proposte.js")
      .then((mod) => { motoreProposte = mod; return mod; })
      /* rete assente: NESSUN errore in console. Il resto della pagina
         (promo, collezioni, arrivi) non dipende da questo modulo, e la
         sezione delle proposte resta semplicemente muta — mai un
         segnaposto rotto al posto di uno che carica. */
      .catch(() => { motoreFallito = true; return null; });
  }
  return motoreCaricamento;
}

/* IL FOGLIO DI STILE SE LO PORTA LA VISTA. Non sta in `sistema.css`
   perché quelle sono le regole di TUTTA l'app e queste sono le misure
   di una schermata sola; non sta in `index.html` perché il telaio non
   sa nulla delle viste. Una volta sola, con l'id come fermo, e con la
   stessa `?v=` dei moduli — un CSS senza versione è un CSS che Safari
   serve vecchio a un JS nuovo. */
function vestiti(){
  if(document.getElementById("css-perte")) return;
  const u = new URL("perte.css", import.meta.url);
  u.search = new URL(import.meta.url).search;
  const l = document.createElement("link");
  l.id = "css-perte"; l.rel = "stylesheet"; l.href = u.href;
  document.head.append(l);
}

/* ── IL PROMEMORIA, DALLO STORE ────────────────────────
   Il ponte in localStorage («regina:perte:promemoria») è stato tolto
   con la fusione di F3b: il ramo `s.promemoria` esiste, il riduttore
   conosce `promemoria/segna`, e una seconda copia della stessa cosa è
   solo il posto dove un giorno si trovera' scritta la risposta
   sbagliata. `riduciPromemoria` resta esportato: è esattamente la
   funzione che il riduttore applica, e le prove del motore la usano da
   sola, fuori dalla pagina. */
/* esportate (bilancio JS, coordinatore 21/09): `perte-collezioni.js`
   — caricato a richiesta, solo per hub/collezione/chiusura — le
   riusa per «Ricordamelo per giovedì» invece di duplicarle. */
export function leggiPromemoria(s){
  return (s && Array.isArray(s.promemoria)) ? s.promemoria : [];
}
export function segnaPromemoria(store, dato){
  store.invia(EVENTO_PROMEMORIA, dato);
  return leggiPromemoria(store.leggi());
}

/* ── I PEZZI DI DISEGNO ────────────────────────────────────────────── */

/* LA FOTO, O IL REDATTO — la stessa scelta del cofanetto (F2.4): non
   c'è un packshot per articolo (memoria «Regina non ha packshot»), e
   un rettangolo grigio muto non dice quale pezzo è. Il redatto porta
   il nome, e lo shimmer resta vietato.
   `muto` è per i riquadri GRANDI (il blocco, la card dell'arrivo): lì
   il nome sta già sotto in Bodoni 22, e scriverlo due volte nello
   stesso sguardo è la spia di un pezzo montato senza guardarlo.
   Il documento chiede «silhouette con luce se il pezzo non è ancora
   fotografato»: il riquadro muto porta perciò una pozza di luce dal
   foglio di stile, non un pannello piatto. */
/* esportata: `perte-collezioni.js` la riusa per la fila e la chiusura
   (bilancio JS, coordinatore 21/09) — la stessa funzione, non una
   copia. */
export function figura(p, classe, opz = {}){
  const senza = () => e("div", {class: "redatto " + classe},
    opz.muto ? [] : [e("span", {class: "t-cap1", testo: p.nome})]);
  if(!p.foto) return senza();
  const img = e("img", {class: classe, src: p.foto, alt: "",
    loading: "lazy", decoding: "async"});
  img.addEventListener("error", () => { img.replaceWith(senza()); }, {once: true});
  return img;
}

/* `fila()` — spostata in `perte-collezioni.js` (bilancio JS,
   coordinatore 21/09): qui in P0 non serve più (la home usa i
   pallini), la usano solo l'hub, la collezione e la chiusura, che
   sono già caricati a richiesta. */

/* esportata: usata qui (E12, riga hub sulla radice) e da
   `perte-collezioni.js` (hub, chiusura) — stessa funzione. */
export function pallini(c){
  return e("span", {class: "pallini", "aria-hidden": "true"},
    c.posti.map((p) => e("i", {class: "pallino" + (p.ha ? " ha" : "")})));
}

/* ── L'ETICHETTA-MOTIVO ═════════════════════════════════════════════
   F6, verdetto di Massimo (21/09, tavole «Per te», tabella «Etichette-
   motivo» di SCELTE-MASSIMO.md): sei righe, una per regola del motore,
   ciascuna un'etichetta corta (segno ✦ + maiuscoletto, ≤ 26 caratteri —
   oltre, si ripiega sul generico e il nome scende nella riga sotto) più
   una riga sotto con UN dato vero. Non tocca `app/motore/proposte.js`:
   legge `g.dati` — che il motore scrive già per ogni componente vinto —
   e traduce, non inventa. */
function campoDati(g, nome){
  const d = (g.dati || []).find((x) => x.campo === nome);
  return d ? d.valore : null;
}
function tempoRelativo(giorni){
  if(giorni <= 0) return "oggi";
  if(giorni === 1) return "domani";
  if(giorni < 14) return "tra " + giorni + " giorni";
  return "tra " + Math.round(giorni / 7) + " settimane";
}
const ETICHETTE_GENERICHE = {
  da_prendere: "MESSO DA PARTE", co_acquisto: "PRESO INSIEME AL TUO",
  materia: "SI ABBINA AI TUOI", misura: "DELLA TUA MISURA",
  famiglia_mancante: "TI MANCA ANCORA"
};
function etichettaMotivo(g, s){
  const chiave = g.chiave || g.regola;
  if(chiave === "chiude_collezione" || chiave === "collezione"){
    const nome = String(campoDati(g, "collezione") || "");
    const lunga = "L’ULTIMO DI " + nome.toUpperCase();
    return lunga.length <= 26
      ? {etichetta: lunga, sotto: "Ti manca solo questo"}
      : {etichetta: "L’ULTIMO DELLA COLLEZIONE", sotto: "Ti manca solo " + nome};
  }
  if(chiave === "data_vicina"){
    const r = ((s && s.ricorrenze) || []).find((x) => x.id === g.gruppo);
    const etichetta = r && r.tipo === "anniversario" ? "PER L’ANNIVERSARIO"
      : r && r.tipo === "compleanno" ? "PER IL COMPLEANNO" : "PER LA TUA DATA";
    const data = campoDati(g, "data"), giorni = campoDati(g, "giorni");
    return {etichetta, sotto: data
      ? giornoEMese(data) + (giorni != null ? ", " + tempoRelativo(giorni) : "")
      : g.frase};
  }
  if(chiave === "arrivo_in_collezione"){
    const arr = campoDati(g, "arrivo");
    return {etichetta: "NUOVO IN VETRINA", sotto: arr ? "Da " + dataLunga(arr) : g.frase};
  }
  if(chiave === "pin"){
    const chi = String(campoDati(g, "chi") || "Regina");
    const primo = (chi === "Regina" ? (NEGOZIO.proprietario || chi) : chi).split(" ")[0];
    return {etichetta: "TE LO CONSIGLIA IL NEGOZIO", sotto: primo + " ha pensato a te"};
  }
  /* le regole senza una riga propria in tabella (misura, materia sul
     rail, famiglia mancante…): l'etichetta resta il nome della regola,
     la riga sotto è la frase che il motore ha già scritto — verificata
     (≤ 60 caratteri, un dato vero dentro), mai un testo nuovo. */
  return {etichetta: ETICHETTE_GENERICHE[chiave] || "SCELTO PER I TUOI DATI", sotto: g.frase};
}

/* ── LA SCHEDA DELLA PROPOSTA — 361 di larghezza, CON o SENZA foto ═══
   F6 (21/09): sostituisce le vecchie `cardGrande`/`cardGrandeCompatta`,
   due funzioni che disegnavano la stessa idea in due misure di nome
   diverse (28 senza foto, 22 con — il difetto che E07 chiude alla
   radice). Un'ossatura sola: l'etichetta-motivo SOPRA (E02-B/E04-B),
   la foto se c'è (mai un riquadro quando non c'è — E03-B/E13-C), nome
   e prezzo sulla STESSA riga a 22 px sempre (E05-B: il prezzo un
   gradino sopra, colore pieno), la riga del motivo sotto.
   Esportata: «Il pezzo che chiude» (P2, `perte-collezioni.js`) la
   riusa — la stessa scheda, non una seconda. */
export function cardProposta(d, suClick, opz = {}){
  const parti = [];
  if(d.etichetta) parti.push(e("span", {class: "motivo-pillola"}, [
    segno("stella", {misura: 14}),
    e("span", {class: "occhiello", testo: d.etichetta})]));
  if(d.foto){
    const fig = figura(d, "grande-fig", {muto: true});
    if(opz.contain && fig.tagName === "IMG"){
      fig.classList.add("grande-fig-contain");
      fig.style.backgroundColor = PROVINO_FONDO;
    }
    parti.push(e("span", {class: "card-grande-foto"}, [fig]));
  }
  parti.push(e("div", {class: "riga-nome-prezzo"}, [
    e("b", {class: "t-2 card-nome", testo: d.nome}),
    d.prezzo != null ? e("span", {class: "t-sub card-prezzo", testo: d.prezzo}) : null
  ].filter(Boolean)));
  if(d.sotto) parti.push(e("span", {class: "t-sub tenue card-riga", testo: d.sotto}));
  if(d.nota) parti.push(e("span", {class: "t-foot tenue card-nota", testo: d.nota}));
  return e("button", {
    type: "button", class: "card-grande", "data-f5-blocco": d.chiave || "pezzo",
    "aria-label": d.nome + (d.sotto ? ". " + d.sotto : ""),
    suClick
  }, parti);
}

/* UN'AZIONE PRINCIPALE, UNA NO (critic 20/09). Un tasto «terziario»
   nasce in --accento (sistema.css): giusto per «Ricordamelo» (il
   turchese di questa schermata, un ruolo solo oltre al primario —
   ACCENTI lo misura), sbagliato per ENTRAMBI questi due comandi, che
   non sono lo stato di questa schermata ma due verdetti su UN
   consiglio — e uguali com'erano (`azione-tenue` su tutt'e due) si
   leggevano come «nessun comando» a occhi strizzati: --testo pieno,
   peso 600 (il corpo del tasto lo da' già, `--t-head`) per «Metti da
   parte» — è l'azione che tiene il pezzo; --testo-2, peso 400 per «Non
   fa per me» — è quella che lo scarta. Stesso corpo, stesso bersaglio
   (44, lo da' già `.tasto.terziario`), zero turchese su entrambi. */
function vestiPrincipale(t){ t.classList.add("azione-principale"); return t; }
function vestiSecondaria(t){ t.classList.add("azione-secondaria"); return t; }

/* IL FATTO IN PIÙ DELLA CELLA SENZA FOTO — MAI IL NOME (critic 20/09):
   il nome sta già sotto la card una volta sola (`.card-rail-nome»).
   Nel rail PER MATERIA il titolo dice già la materia: la cella porta
   allora la FAMIGLIA (anello, creola…), che è il fatto in più (critic
   20/09, seconda verifica). Negli altri rail resta la materia. */
function testoRail(p, r){
  const perMateria = r && /materia/.test(String(r.regola || ""));
  return perMateria ? (p.tipo || p.famiglia_nome || p.materia) : p.materia;
}

/* ── LA CELLA SENZA FOTO — TEXTURE, MAI UN RIQUADRO MUTO ────────────
   E11-C, verdetto di Massimo (21/09), corretto dal coordinatore lo
   stesso giorno: il fatto in più (materia/famiglia) NON scende più in
   una terza riga sotto il nome — sfalsava la griglia contro le celle
   fotografate, che ne hanno due. Vive DENTRO la texture, in piccolo,
   come una didascalia posata sulla superficie (`.rail-fig-eti`,
   perte.css): la cella resta a due righe (nome, prezzo) sempre. */
function figuraRail(p, r){
  const eti = testoRail(p, r);
  const vuoto = () => e("div", {class: "redatto rail-fig"},
    eti ? [e("span", {class: "rail-fig-eti", testo: eti})] : []);
  if(!p.foto) return vuoto();
  const img = e("img", {class: "rail-fig", src: p.foto, alt: "", loading: "lazy", decoding: "async"});
  img.addEventListener("error", () => { img.replaceWith(vuoto()); }, {once: true});
  return img;
}

/* ── IL CUORE DELLA CELLA DEL RAIL (E10-B, verdetto di Massimo) ─────
   Comando FRATELLO della cella, come in Vetrina (`viste/vetrina-corpo.js`,
   `tastoCuore`): un cuore dentro il tasto che apre la scheda non
   esiste. Stesso evento `preferito/alterna`, stesso ramo `s.preferiti`
   — non una seconda lista di preferiti, la STESSA, letta da qui. Solo
   sulle celle fotografate: la texture di E11 non lo porta. */
function ePreferitoRail(id, leggi){ return ((leggi().preferiti) || []).includes(id); }
function vestiCuoreRail(b, p, leggi){
  const si = ePreferitoRail(p.id, leggi);
  b.setAttribute("aria-pressed", String(si));
  b.setAttribute("aria-label", (si ? "Togli dai preferiti: " : "Aggiungi ai preferiti: ") + p.nome);
  const s = b.querySelector(".segno-filo");
  if(s) s.classList.toggle("rail-cuore-pieno", si);
}
function cuoreRail(p, leggi, invia){
  /* stessa anatomia del cuore di Vetrina (`vetrina-corpo.js`,
     `tastoCuore`): un disco separato dentro il tasto, non la misura
     dell'icona forzata — `.segno-filo` porta già le sue quattro
     classi di misura (sistema.css) e qui non se ne inventa una nuova. */
  const b = e("button", {type: "button", class: "card-rail-cuore",
    suClick: (ev) => {
      ev.stopPropagation();
      invia("preferito/alterna", {id: p.id});
      vestiCuoreRail(b, p, leggi);
      annuncia(p.nome + (ePreferitoRail(p.id, leggi) ? ", nei preferiti." : ", tolto dai preferiti."));
    }
  }, [e("span", {class: "card-rail-cuore-disco"}, [segno("cuore", {misura: 20})])]);
  b.dataset.cuorePerte = p.id;
  vestiCuoreRail(b, p, leggi);
  return b;
}

/* ── IL RAIL — card 160 × 200, passo 172 ──────────────────────────── */
function railDom(r, suPezzo, soldi, leggi, invia){
  /* CORREZIONE (coordinatore, 21/09): i pezzi CON foto vengono prima —
     ordinamento stabile, non tocca quale regola ha scelto quali pezzi,
     solo l'ordine di presentazione. Con ≥ 2 fotografati nelle prime
     tre visibili non cade mai più di UNA cella a texture: è una
     conseguenza dell'ordine, non una regola a parte da mantenere. */
  const pezzi = r.pezzi.map((p, i) => ({p, i}))
    .sort((a, b) => (b.p.foto ? 1 : 0) - (a.p.foto ? 1 : 0) || a.i - b.i)
    .map((x) => x.p);
  const conFotoN = pezzi.filter((p) => p.foto).length;

  const testa = [
    /* E09-B (verdetto di Massimo): sans semibold, come Apple Music —
       non più Bodoni 22: il rail è uno SCAFFALE dentro la pagina, non
       un titolo di sezione a sé. */
    e("h2", {class: "t-head rail-testa", testo: r.titolo}),
    r.sotto ? e("p", {class: "t-foot tenue rail-sotto", testo: r.sotto}) : null
  ].filter(Boolean);

  /* MENO DI DUE PEZZI FOTOGRAFATI: uno scaffale orizzontale non ha il
     peso visivo per reggersi — diventa una lista compatta di righe
     (nome · materia · prezzo, 44-60 pt, senza riquadro), lo stesso
     componente della lista raggruppata (`app/ui/cella.js`). */
  if(conFotoN < 2){
    const righe = pezzi.map((p) => {
      const eti = testoRail(p, r);
      return cella({
        titolo: p.nome, sotto: eti || null, coda: soldi(p.prezzo),
        etichetta: p.nome + (eti ? ", " + eti : "") + ", " + soldi(p.prezzo),
        suClick: () => suPezzo(p.id)
      });
    });
    return e("section", {class: "rail-blocco", "data-rail": r.regola}, [
      ...testa,
      e("div", {class: "lista rail-compatta", role: "list"},
        righe.map((n) => { n.setAttribute("role", "listitem"); return n; }))
    ]);
  }

  const carte = pezzi.map((p) => {
    const conFoto = !!p.foto;
    const eti = testoRail(p, r);
    const apri = e("button", {
      type: "button", class: "card-rail-apri", "data-pezzo": p.id,
      "aria-label": p.nome + (!conFoto && eti ? ", " + eti : "") + ", " + soldi(p.prezzo),
      suClick: () => suPezzo(p.id)
    }, [
      e("span", {class: "card-rail-foto"}, [figuraRail(p, r)]),
      e("b", {class: "t-foot card-rail-nome", testo: p.nome}),
      e("span", {class: "t-foot tenue cifra", testo: soldi(p.prezzo)})
    ]);
    return e("div", {class: "card-rail", role: "listitem"},
      conFoto ? [apri, cuoreRail(p, leggi, invia)] : [apri]);
  });
  /* NIENTE SCORRIMENTO INFINITO (NN/g): l'elenco è finito e lo dice.
     L'ultima card è una frase, non un'esca. */
  if(r.altri > 0) carte.push(e("div", {class: "card-rail coda-rail", role: "listitem"},
    [e("span", {class: "t-foot tenue", testo:
      "In negozio ce ne sono altri " + r.altri + "."})]));
  return e("section", {class: "rail-blocco", "data-rail": r.regola}, [
    ...testa,
    e("div", {class: "rail", role: "list", "aria-label": r.titolo}, carte)
  ]);
}

/* ── LO SCHELETRO DEL BLOCCO, MENTRE IL MOTORE ARRIVA ──────────────
   Monocromo e fermo (niente shimmer — regola 5): occupa già il posto
   che avrà il nome, la frase e i due comandi, così quando il motore
   arriva non salta niente. Niente rail finché non c'è: un rail è una
   proposta, e non si propone col catalogo mezzo scaricato. */
function scheletroBlocco(){
  return e("div", {class: "blocco-scheletro", "aria-hidden": "true"}, [
    osso("42%", "11px", {raggio: "3px"}),
    osso("72%", "28px", {su: "8px", raggio: "5px"}),
    osso("90%", "15px", {su: "8px", raggio: "3px"}),
    osso("22%", "13px", {su: "8px", raggio: "3px"})
  ]);
}

/* ── P4 · LA CARD A RIGHE FISSE (promo · compleanno · arrivo) ──────
   Lo stesso modulo per tre contenuti: maiuscoletto con le DATE SCRITTE,
   Bodoni 22 col fatto, Inter 15 col dove/come, Inter 13 col perché o
   l'azione. Nessun timer, nessun bottone pieno, nessun «solo per te». */
/* esportata: la riusano `perte-collezioni.js` (P5 «Per te questo mese» —
   le stesse due card, compleanno e promo, che prima vivevano solo in
   radice) e questo file più giù non la chiama più direttamente (F6
   21/09: le card P4 non stanno più sotto il titolo, vive chi le apre). */
export function cardP4(d, azione){
  return e("section", {class: "p4", "data-p4": d.tipo}, [
    e("span", {class: "occhiello foot p4-occhiello", testo: d.occhiello}),
    e("b", {class: "t-2 p4-titolo", testo: d.titolo}),
    d.riga ? e("p", {class: "t-sub p4-riga", testo: d.riga}) : null,
    d.nota ? e("p", {class: "t-foot tenue p4-nota", testo: d.nota}) : null,
    azione || null
  ].filter(Boolean));
}

/* ── LA CARD DELL'ARRIVO, con «Ricordamelo» ────────────────────────
   F6 (21/09): non vive più dentro `monta()` — la radice non disegna
   più le card degli arrivi, solo la riga che apre il loro elenco (P5
   «Arrivi», `perte-collezioni.js`). Portata a livello di modulo ed
   esportata perché quella pagina è caricata a richiesta e la chiama da
   fuori: `ctx = {store, oggi, vaiAlPezzo}` sostituisce le variabili di
   chiusura (`store`, `OGGI`, `vaiAlPezzo`) che prima erano libere nello
   scope di `monta()`. */
export function cardArrivo(a, ctx){
  const {store, oggi, vaiAlPezzo} = ctx;
  const fatto = () => leggiPromemoria(store.leggi()).some((x) => x.id === a.id);
  const eti = () => fatto()
    ? "Te lo ricordiamo " + soloGiorno(a.avviso) + " alle 9"
    : "Ricordamelo";
  const t = tasto(eti(), {tipo: "terziario", etichetta: eti(), suClick: () => {
    if(fatto()) return;
    segnaPromemoria(store, {id: a.id, articolo: a.articolo,
      quando: a.avviso, creato: oggi});
    vestiTasto(t, eti());
    t.setAttribute("aria-label", eti());
    t.setAttribute("aria-pressed", "true");
    t.dataset.segnato = "1";
    toast("Te lo ricordiamo " + soloGiorno(a.avviso) + " alle 9.");
    annuncia(a.nome + ". Te lo ricordiamo " + soloGiorno(a.avviso) + " alle 9.");
  }});
  if(fatto()){ t.setAttribute("aria-pressed", "true"); t.dataset.segnato = "1"; }

  /* CORREZIONE (coordinatore, 21/09): senza fotografia niente
     riquadro — E03-B, la stessa forma di solo testo della scheda
     della proposta. Un contenitore immagine vuoto (la «pozza di
     luce» su un fondo già chiaro leggeva come un vano bianco) non è
     più un'opzione qui: o la foto c'è, o il riquadro non esiste. */
  return e("article", {class: "p4 p4-arrivo" + (a.foto ? "" : " senza-foto"),
    "data-p4": "arrivo", "data-arrivo": a.id}, [
    a.foto ? e("button", {type: "button", class: "arrivo-foto",
      "aria-label": a.nome + ", guarda il pezzo",
      suClick: () => vaiAlPezzo(a.articolo)}, [figura(a, "arrivo-fig", {muto: true})]) : null,
    e("span", {class: "occhiello foot p4-occhiello", testo: a.occhiello}),
    e("b", {class: "t-2 p4-titolo", testo: a.nome}),
    a.riga ? e("p", {class: "t-sub p4-riga", testo: a.riga}) : null,
    t
  ].filter(Boolean));
}

/* ═══ IL MONTAGGIO ═════════════════════════════════════════════════ */
export function monta(el, store){
  vestiti();
  /* F6 — IL TEMA CHIARO (verdetto di Massimo, 21/09: tavole «Per te»,
     ASSIEME_A, coerente con la Vetrina A approvata lo stesso giorno).
     Stessa leva di `viste/vetrina.js`, non un secondo set di token: si
     scrive `data-tema="chiaro"` sulla sezione, e il telaio
     (`index.html`, `fondoScocca`) legge da lì il fondo del documento;
     `sistema.css` (blocco «LA BARRA DI VETRO SULLA CARTA») dà la
     stessa tinta di vetro alla barra quando `data-sez="perte"`. */
  const sezionePerte = el.closest(".vista");
  if(sezionePerte) sezionePerte.dataset.tema = "chiaro";
  const {leggi, iscrivi, soldi, invia} = store;

  /* F5b — LA SESSIONE. Un id per apertura dell'app, non per rendering:
     il motore conta i «Non fa per me» DENTRO una sessione (due e si
     ferma), e «una sessione nuova riapre la proposta» — che è esattamente
     cosa succede a un ricarico, dove `monta()` gira di nuovo e questa
     riga assegna un id diverso. Non è `sessionStorage`: il motore non
     deve sapere che gira in un browser (`app/motore/README.md`). */
  const SESSIONE = "s-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  /* la stessa regola di `app/viste/vetrina.js` (TENUTA_GIORNI): sette
     giorni di riserva. Ridichiarata qui invece che importata — le due
     viste non devono dipendere l'una dall'altra per un numero. */
  const TENUTA_GIORNI_DAPARTE = 7;

  /* LA DATA DELLA DEMO. `app/innesto.js` non porta ancora `seme.oggi`
     (è scritto nel rapporto): finché non lo fa, la si chiede al
     modulo dei dati e, se manca anche quello, si usa il giorno vero.
     Il motore la riceve come INGRESSO — è l'unica cosa che lo tiene
     verificabile. */
  let OGGI = (store.seme && store.seme.oggi) || oggiVero();
  import("app/dati/seme.js").then((m) => {
    if(m && m.oggi && m.oggi !== OGGI){ OGGI = m.oggi; disegna(); }
  }).catch(() => { /* si resta sul giorno vero */ });

  const dati = () => proposte({
    s: leggi(), catalogo: store.catalogo || [],
    collezioni: store.collezioni || {}, oggi: OGGI
  });

  /* F5b — IL BLOCCO GRANDE E I RAIL, DAL MOTORE — SE È ARRIVATO. Stesso
     `OGGI` della vista (mai `new Date()`), catalogo e collezioni già
     innestati — il motore legge `articolo.foto` che `app/innesto.js` ha
     già riempito col provino packshot, quindi qui non c'è nessuna
     scelta di foto da fare. `motoreProposte` è la variabile di modulo
     di `caricaMotore()`: `motore()` non si chiama finché non è vera. */
  const motore = () => motoreProposte.proposte(
    {s: leggi(), catalogo: store.catalogo || [], collezioni: store.collezioni || {}, oggi: OGGI},
    {sessione: SESSIONE}
  );

  /* SI CHIEDE UNA VOLTA SOLA, quando questa tab È quella attiva —
     mai prima. `app/rotta.js` manda `nav/tab` a OGNI cambio, avvio
     incluso (anche aprendo l'app direttamente su `#/perte`): lo
     ascolta l'`iscrivi` più giù. `tMotoreChiesto` è il momento
     dell'attivazione, misurato per il banco (`window.__perte.tempi
     Motore()`). */
  let motoreChiesto = false, tMotoreChiesto = null, tBloccoDisegnato = null;
  function chiediMotoreSeAttiva(){
    if(motoreChiesto || tabCorrente() !== "perte") return;
    motoreChiesto = true;
    tMotoreChiesto = performance.now();
    caricaMotore().then((mod) => { if(mod) disegna(); });
  }

  /* ── RISPOSTA AL TOCCO SUL RIFIUTO (critic 20/09) ───────────────────
     «La card cambia a scatto» — non più: `nonFaPerMe` cattura il nodo
     vecchio PRIMA di mandare l'evento (fra un giro e l'altro lo stato
     cambia SINCRONO, vedi `invia`, e `disegna()` lo distrugge súbito
     dopo), e `disegna()` lo consegna ad `animaCambioBlocco` appena il
     nuovo è in pagina. Il vecchio si sovrappone (overlay `fixed`, perché
     il resto della schermata intorno può essersi mosso) al nuovo e i
     due sfumano insieme — durata e curva sono `--d-alert` e `--ios`
     (sistema.css): 200 ms, «linear» sotto movimento ridotto perché
     quelle due variabili CAMBIANO SOLE sotto quel media query — 150 ms.
     Mai zero: un cambio di candidato senza nessun segno è indistinguibile
     da un errore. */
  /* IMPORTANTE: si cattura il nodo vecchio PRIMA che `schermo(el, …)`
     svuoti il contenitore (è la prima riga di `disegna()`) — dopo, quel
     nodo è già stato staccato dal documento, e animarlo staccato non fa
     niente. Per questo `nonFaPerMe` non cattura il nodo lei stessa: alza
     solo una bandiera, e la cattura vera è in cima a `disegna()`. */
  let animaBloccoAlProssimoDisegno = false;
  const valoreCSS = (nome) => getComputedStyle(document.documentElement).getPropertyValue(nome).trim();
  function animaCambioBlocco(vecchio, nuovo){
    if(!vecchio || !nuovo) return;
    const durata = parseFloat(valoreCSS("--d-alert")) || 200;
    const curva = valoreCSS("--ios") || "ease";
    const r = vecchio.getBoundingClientRect();
    vecchio.style.position = "fixed";
    vecchio.style.left = r.left + "px";
    vecchio.style.top = r.top + "px";
    vecchio.style.width = r.width + "px";
    vecchio.style.margin = "0";
    vecchio.style.zIndex = "5";
    vecchio.style.pointerEvents = "none";
    document.body.appendChild(vecchio);
    nuovo.style.opacity = "0";
    const via = vecchio.animate([{opacity: 1}, {opacity: 0}], {duration: durata, easing: curva, fill: "forwards"});
    const entra = nuovo.animate([{opacity: 0}, {opacity: 1}], {duration: durata, easing: curva, fill: "forwards"});
    via.finished.catch(() => {}).then(() => vecchio.remove());
    entra.finished.catch(() => {}).then(() => { nuovo.style.opacity = ""; });
  }

  /* ── LE DUE AZIONI DEL BLOCCO GRANDE ────────────────────────────────
     Un rifiuto e una messa da parte sono entrambi un VERDETTO
     (`proposta/verdetto`): il motore li conta nel registro della sua
     regola, e un rifiuto esclude l'articolo per novanta giorni e spende
     una delle due rigenerazioni della sessione — al secondo la sezione
     si ferma da sola («Va bene, ci risentiamo lunedì», e stavolta è
     vera anche a un ricarico: il motore la scrive nello stato, non nella
     sessione), il motore lo decide, questa vista si limita a
     ridisegnare. */
  function nonFaPerMe(g){
    animaBloccoAlProssimoDisegno = true;
    invia("proposta/verdetto", {
      articolo: g.id, esito: "rifiuto", regola: g.regola, oggi: OGGI, sessione: SESSIONE
    });
    annuncia(g.articolo.nome + ", non fa per te.");
  }
  function metterlaDaParte(g){
    const fino = isoPiu(OGGI, TENUTA_GIORNI_DAPARTE);
    /* lo stesso evento di `viste/vetrina.js` (`mettiDaParte`): il pezzo
       entra DAVVERO nella riserva, non solo nel registro del motore. */
    invia("daparte/aggiungi", {id: g.id, dal: OGGI, fino});
    invia("proposta/verdetto", {
      articolo: g.id, esito: "da_parte", regola: g.regola, oggi: OGGI, sessione: SESSIONE
    });
    toast(g.articolo.nome + " messo da parte, fino al " + giornoEMese(fino) + ".");
    annuncia(g.articolo.nome + ", messo da parte.");
  }

  /* ── GLI SCHERMI CHE QUESTA VISTA APRE ─────────────────────────
     `collezioni/<id>` è la forma vera dell'indirizzo: `app/rotta.js`
     legge a COPPIE, quindi un `#/perte/collezioni` senza secondo
     segmento non entrerebbe nella pila e il tasto indietro non avrebbe
     niente da togliere. L'hub prende perciò l'id riservato `tutte`.
     `collezione/<id>` resta registrato perché è l'indirizzo che
     `viste/cofanetto.js` spinge già oggi: il registro degli schermi è
     globale e l'ultima registrazione vince, quindi da qui in avanti
     quel tocco apre la collezione VERA invece delle due righe
     dichiarate «in arrivo nella fase F5». */
  /* CARICATE A RICHIESTA (bilancio JS, coordinatore 21/09: 607.679 B
     contro il tetto di 600.000 — la stessa via del motore, misura 1 di
     `viste/vetrina.js`/`vetrina-corpo.js`). Hub, collezione e chiusura
     sono sotto-pagine: nessuna delle tre disegna la radice, quindi
     nessuna delle tre deve pesare sull'avvio. `ctxCollezioni` porta
     solo i due ganci che quelle tre schermate leggono davvero — `dati`
     (la stessa funzione pura di sempre, mai una seconda) e `store`
     (per `leggi`/`invia`, es. «Ricordamelo per giovedì»). */
  let corpoCollezioniPromessa = null;
  function caricaCorpoCollezioni(){
    if(!corpoCollezioniPromessa) corpoCollezioniPromessa = import("app/viste/perte-collezioni.js");
    return corpoCollezioniPromessa;
  }
  const ctxCollezioni = {store, dati};
  const nonCaricato = (dove) => dove.append(e("p", {class: "t-body tenue",
    testo: "Non si è caricato. Controlla la connessione e riprova."}));
  registraSchermo("collezioni", (id, dove) => {
    caricaCorpoCollezioni()
      .then((m) => id === "tutte" ? m.schermoHub(dove, ctxCollezioni)
                                   : m.schermoCollezione(id, dove, ctxCollezioni))
      .catch((err) => { console.error(err); nonCaricato(dove); });
  });
  registraSchermo("collezione", (id, dove) => {
    caricaCorpoCollezioni().then((m) => m.schermoCollezione(id, dove, ctxCollezioni))
      .catch((err) => { console.error(err); nonCaricato(dove); });
  });
  registraSchermo("chiusura", (id, dove) => {
    caricaCorpoCollezioni().then((m) => m.schermoChiusura(id, dove, ctxCollezioni))
      .catch((err) => { console.error(err); nonCaricato(dove); });
  });
  /* LE DUE NUOVE PORTE (F6, 21/09) — dietro le righe «Arrivi» e «Per te
     questo mese» del gruppo di lista: `arrivi/tutti` e `mese/questo`,
     la stessa via delle collezioni (a coppie, caricate a richiesta,
     nessun peso sull'avvio). */
  registraSchermo("arrivi", (id, dove) => {
    caricaCorpoCollezioni().then((m) => m.schermoArrivi(dove, ctxCollezioni))
      .catch((err) => { console.error(err); nonCaricato(dove); });
  });
  registraSchermo("mese", (id, dove) => {
    caricaCorpoCollezioni().then((m) => m.schermoMese(dove, ctxCollezioni))
      .catch((err) => { console.error(err); nonCaricato(dove); });
  });

  const vaiAlPezzo = (id) => spingi("pezzo/" + id);

  /* ══ P0 · PER TE ═══════════════════════════════════════════════ */
  function disegna(){
    /* si cattura QUI, prima che `schermo()` svuoti il contenitore (vedi
       la nota sopra `animaBloccoAlProssimoDisegno`). */
    const vecchioPerAnimazione = animaBloccoAlProssimoDisegno
      ? el.querySelector(".blocco") : null;
    animaBloccoAlProssimoDisegno = false;

    const d = dati();
    const pagina = schermo(el, {titolo: "Per te"});

    /* 1 · IL TITOLO CON LE INIZIALI (E01-B, verdetto di Massimo 21/09):
       niente occhiello sopra («Aggiornato oggi» — 18 pt di altezza in
       più, per un fatto che la pagina già dimostra da sola), un cerchio
       «LS» sulla riga del titolo — conferma chi è loggata senza foto né
       generazioni, tocca e apre il Profilo (ANCORA Apple, App Store
       «Per te»: l'avatar vive sulla riga del Large Title). */
    const testaPagina = pagina.querySelector(".testa-pagina");
    if(testaPagina){
      testaPagina.classList.add("f5-testa");
      const iniziali = (String(d.cliente.nome || "").charAt(0) +
        String(d.cliente.cognome || "").charAt(0)).toUpperCase();
      if(iniziali) testaPagina.append(e("button", {
        type: "button", class: "f5-iniziali",
        "aria-label": "Apri il profilo di " +
          [d.cliente.nome, d.cliente.cognome].filter(Boolean).join(" "),
        suClick: () => vaiA("profilo")
      }, [e("span", {"aria-hidden": "true", testo: iniziali})]));
    }

    /* 2 · la riga del ritorno — solo se c'è un fatto. In --testo, non
       --accento (critic 20/09): il turchese di questa schermata è già
       preso da «Ricordamelo» (ACCENTI, un solo ruolo oltre al primario),
       e quando il ritorno compare INSIEME al blocco erano due. */
    if(d.ritorno) pagina.append(e("p", {class: "t-sub riga-ritorno", testo: d.ritorno}));

    /* 3 · IL BLOCCO GRANDE — F5b, dal motore, CARICATO A RICHIESTA
       (banco prestazioni 20/09): `chiediMotoreSeAttiva()` lo chiede
       solo quando questa tab è quella attiva, mai all'avvio per le
       altre tre. Finché non arriva (o se non arriva mai: rete assente)
       il posto resta lo scheletro — niente rail, niente errore.
       SUBITO SOTTO IL TITOLO: è la risposta alla domanda della pagina
       («cosa c'è per te oggi»), e vince il primo sguardo — le card P4
       (compleanno, promo) sono vere ma non sono LA risposta, e scendono
       più giù (misura 6). Il titolo-regola È LA FRASE della proposta
       (accenti veri, ≤ 60 caratteri): non più un'etichetta SOPRA la
       foto, ma la riga che spiega il pezzo, sotto il suo nome. Sotto la
       card, le due azioni: «Metti da parte» (principale, --testo 600) e
       «Non fa per me» (secondaria, --testo-2 400). */
    chiediMotoreSeAttiva();
    const m = motoreProposte ? motore() : null;
    let nuovoBloccoNodo = null;
    if(!m){
      /* in corso → lo scheletro. Fallito (rete assente) → niente: il
         resto della pagina (promo, collezioni, arrivi) resta com'è, e
         qui non c'è nessun errore, solo silenzio. */
      if(!motoreFallito){ nuovoBloccoNodo = scheletroBlocco(); pagina.append(nuovoBloccoNodo); }
    } else if(m.sessione_chiusa){
      /* E08-C (verdetto di Massimo, 21/09): la data VERA, non «lunedì»
         da solo — un testo che non invecchia male se l'app si riapre
         un altro giorno. `m.chiusa_fino` è il lunedì vero che il motore
         ha già calcolato (`prossimoLunedi`, non toccato: qui si legge).
         Allineata a sinistra (critic 20/09): oggi era l'unico testo
         centrato della pagina. */
      const testoChiuso = m.chiusa_fino
        ? "Va bene: torno a proporti qualcosa " + giornoBreve(m.chiusa_fino) + "."
        : m.fine;
      nuovoBloccoNodo = e("p", {class: "t-sub tenue blocco-fine", testo: testoChiuso});
      pagina.append(nuovoBloccoNodo);
    } else if(m.grande){
      const g = m.grande;
      const suClick = () => {
        invia("proposta/verdetto", {
          articolo: g.id, esito: "aperto", regola: g.regola, oggi: OGGI, sessione: SESSIONE
        });
        vaiAlPezzo(g.id);
      };
      /* E02-B/E03-B/E07-C (verdetto di Massimo, 21/09): un'ossatura
         sola con o senza foto — `cardProposta` decide da sé, mai un
         riquadro vuoto quando la foto manca. L'etichetta-motivo prende
         il posto dell'occhiello famiglia·materia: `etichettaMotivo`
         traduce la regola vinta dal motore, e la riga sotto resta un
         dato vero (`g.frase`, quando la tabella non ne ha uno più
         specifico). */
      const mot = etichettaMotivo(g, leggi());
      const card = cardProposta({
        nome: g.articolo.nome, foto: g.articolo.foto,
        prezzo: soldi(g.articolo.prezzo),
        etichetta: mot.etichetta, sotto: mot.sotto, chiave: g.chiave
      }, suClick, {contain: true});
      nuovoBloccoNodo = e("section", {class: "blocco", "data-regola": g.regola}, [
        card,
        /* E06-C (verdetto di Massimo): due capsule — «Metti da parte»
           piena, «Non fa per me» in tono. Non due primari: il colore è
           nella FORMA (piena vs in tono), non nel turchese — che resta
           di «Ricordamelo» (ACCENTI, critic 20/09). */
        e("div", {class: "blocco-azioni"}, [
          vestiPrincipale(tasto("Metti da parte", {tipo: "terziario", suClick: () => metterlaDaParte(g)})),
          vestiSecondaria(tasto("Non fa per me", {tipo: "terziario", suClick: () => nonFaPerMe(g)}))
        ])
      ]);
      pagina.append(nuovoBloccoNodo);
    } else if(m.tutto_suo){
      /* «Hai tutto quello che c’è, per ora.» — mai un rail a punteggio
         basso per non lasciare il posto vuoto: un «Per te» riempito con
         pezzi deboli è peggio di un «Per te» che finisce (motore §8). */
      nuovoBloccoNodo = e("p", {class: "t-sub tenue blocco-fine", testo: m.fine});
      pagina.append(nuovoBloccoNodo);
    }
    /* 4 · UNO SCAFFALE SOLO — F6 (21/09, verdetto di Massimo: «la radice
       è tornata piena»). Fino a ieri qui finivano fino a tre rail, uno
       sotto l'altro; oggi ne resta UNO, il più pertinente alla proposta
       appena mostrata — quello col punteggio più alto fra i rail che il
       motore ha preparato. Gli altri due non spariscono: restano nel
       motore (`m.rail`), pronti a diventare loro il rail scelto la
       prossima volta che la regola grande cambia. Il punteggio di un
       rail è il più alto fra i suoi pezzi (`p.punteggio`, scritto dal
       motore): un rail con un solo pezzo fortissimo vince su uno con
       tre pezzi mediocri, ed è la stessa logica che sceglie il blocco
       grande. */
    let railScelto = null;
    if(m) for(const r of m.rail){
      const punti = r.pezzi.reduce((mx, p) => Math.max(mx, p.punteggio || 0), 0);
      if(!railScelto || punti > railScelto.punti) railScelto = {r, punti};
    }

    /* 5 · UN GRUPPO DI LISTA, AL MASSIMO TRE RIGHE DI RIMANDO — la
       stessa riga di tutta l'app (E07 variante B, `riferimenti/
       APPLE-NATIVO.md` §3: valore in tenue prima del chevron). Tutto
       ciò che fino a ieri riempiva la radice — l'elenco delle
       collezioni, le card degli arrivi, le card di compleanno/promo —
       non è sparito: vive nelle SUE pagine, e questa riga è la porta.
       Una riga che non ha contenuto non compare: mai un rimando a
       vuoto. */
    const righe = [];
    if(d.mie.length){
      /* la collezione più vicina alla chiusura, non la prima della
         lista: è il fatto che vale la pena scrivere sotto il numero. */
      const primaAChiudere = d.mie.filter((c) => c.manca > 0)
        .sort((a, b) => a.manca - b.manca)[0];
      const sottoColl = primaAChiudere
        ? primaAChiudere.nome + ": " + (primaAChiudere.manca === 1
            ? "ti manca 1 pezzo" : "te ne mancano " + primaAChiudere.manca)
        : null;
      righe.push(cella({
        titolo: "Le tue collezioni", coda: String(d.mie.length), sotto: sottoColl,
        etichetta: "Le tue collezioni, " + d.mie.length + (sottoColl ? ", " + sottoColl : ""),
        suClick: () => spingi("collezioni/tutte")
      }));
    }
    if(d.arriviTutti.length){
      /* il primo di `arriviTutti` è già il più recente (la stessa
         regola che sceglieva le due card di prima, F5b): qui diventa
         il fatto della riga, non solo il primo di un elenco troncato. */
      const primo = d.arriviTutti[0];
      const sottoArrivi = primo.nome + ", da " + giornoBreve(primo.data);
      righe.push(cella({
        titolo: "Arrivi", coda: String(d.arriviTutti.length), sotto: sottoArrivi,
        etichetta: "Arrivi, " + d.arriviTutti.length + ", " + sottoArrivi,
        suClick: () => spingi("arrivi/tutti")
      }));
    }
    /* compleanno e promo sono le due sole forme di «promozione attiva
       questo mese» che il motore conosce: quella più vicina a scadere
       (`al`, ISO) vince la riga — non la prima trovata. */
    const mese = [d.compleanno, d.promo].filter(Boolean)
      .sort((a, b) => giorniFra(OGGI, a.al) - giorniFra(OGGI, b.al))[0];
    if(mese){
      const sottoMese = mese.titolo + ", fino al " + giornoEMese(mese.al);
      righe.push(cella({
        titolo: "Per te questo mese", sotto: sottoMese,
        etichetta: "Per te questo mese, " + sottoMese,
        suClick: () => spingi("mese/questo")
      }));
    }

    /* E15-A (verdetto di Massimo, 21/09): persona senza dati (nessun
       candidato e non "tutto suo") — se la pagina non ha PROPRIO
       NIENTE d'altro da dire (nessuno scaffale, nessuna riga di
       rimando, nessun ritorno), lo stato vuoto del sistema prende il
       posto del blocco: segno + Title2 + Body + un'azione, mai una
       sezione muta. */
    const emptyTotale = !!m && !m.grande && !m.sessione_chiusa && !m.tutto_suo &&
      !railScelto && !righe.length && !d.ritorno;
    if(emptyTotale){
      nuovoBloccoNodo = vuoto({
        segno: "collezione", titolo: "Non c’è ancora nulla qui",
        testo: "Le tue proposte nascono dai pezzi che porti: comincia in negozio.",
        azione: "Scopri la vetrina", suAzione: () => vaiA("vetrina")
      });
      pagina.append(nuovoBloccoNodo);
    }

    /* RISPOSTA AL TOCCO (critic 20/09): un rifiuto non sostituisce la
       card a scatto. `vecchioPerAnimazione` è stato catturato in cima a
       questa funzione, PRIMA che `schermo()` lo staccasse; appena il
       nuovo è nel documento, i due sfumano insieme. */
    if(vecchioPerAnimazione && nuovoBloccoNodo)
      animaCambioBlocco(vecchioPerAnimazione, nuovoBloccoNodo);
    if(motoreProposte && tBloccoDisegnato == null) tBloccoDisegnato = performance.now();

    /* CORREZIONE (coordinatore, 21/09, ereditata): il titolo dello
       scaffale «Si abbinano ai tuoi» non nomina più la materia fra
       parentesi — il nome vero (un dato del cliente) scende nella riga
       sotto, dove `rail-sotto` lo scrive già. Solo per la regola
       «materia»: le altre hanno la frase già completa nel titolo. */
    if(railScelto) pagina.append(railDom({
      regola: railScelto.r.regola, titolo: railScelto.r.titolo,
      sotto: (railScelto.r.regola === "materia" && railScelto.r.gruppo)
        ? railScelto.r.gruppo.charAt(0).toUpperCase() + railScelto.r.gruppo.slice(1) : null,
      altri: railScelto.r.altri,
      pezzi: railScelto.r.pezzi.map((p) => ({
        id: p.id, nome: p.articolo.nome, foto: p.articolo.foto, prezzo: p.articolo.prezzo,
        materia: p.articolo.attributi && p.articolo.attributi.metallo,
        tipo: p.articolo.tipo, famiglia_nome: p.articolo.famiglia_nome
      }))
    }, vaiAlPezzo, soldi, leggi, invia));

    /* il gruppo di lista, in coda: massimo tre righe, mai «Non c'è
       altro, per ora» sotto — la lista stessa chiude la pagina. */
    if(righe.length){
      /* critic 22/09: fra lo scaffale e il gruppo c'erano 7 pt, e i due
         blocchi si leggevano incollati. 24, come fra i gruppi di Impostazioni. */
      const gruppo = lista(null, righe);
      gruppo.classList.add("pt-rimandi");
      pagina.append(gruppo);
    }
  }

  /* ── LA SCHERMATA PIENA E LA BARRA ─────────────────────────────
     La barra delle sezioni è del telaio e non si tocca: si dice al
     <body> che una schermata piena è in scena, e il foglio di stile di
     questa vista la ritira in 250 ms. Chi torna indietro la rivede: è
     l'indirizzo a comandare, come dappertutto. */
  const seguiPieno = () => {
    if(/\/chiusura\//.test(location.hash)) document.body.dataset.pieno = "1";
    else delete document.body.dataset.pieno;
  };
  addEventListener("popstate", seguiPieno);
  addEventListener("hashchange", seguiPieno);

  disegna();
  iscrivi((s, ev, prima) => {
    /* F5b — SI CHIEDE IL MOTORE QUI: `nav/tab` arriva a OGNI cambio di
       tab, avvio incluso (anche aprendo l'app direttamente su
       `#/perte`) — prima di qualunque redraw, e fuori dal guard
       `!prima` qui sotto perché all'avvio `prima` non è mai nullo (lo
       stato esiste già quando le viste montano), ma la chiarezza vale
       la riga in più. */
    if(ev.tipo === "nav/tab" && ev.dato && ev.dato.tab === "perte") chiediMotoreSeAttiva();
    if(!prima) return;
    /* F5b — UN RIFIUTO NON PASSA DA `conTransizione`: se lo facesse, la
       View Transition nativa farebbe dissolvere TUTTA la pagina (un
       crossfade che il critic non ha chiesto), sovrapposta alla
       dissolvenza mirata che `animaCambioBlocco` fa già solo sul
       blocco. `disegna()` diretto, e la risposta al tocco la fa lei. */
    if(ev.tipo === "proposta/verdetto" && ev.dato && ev.dato.esito === "rifiuto" &&
       s.proposte !== prima.proposte){ disegna(); return; }
    if(s.esemplari !== prima.esemplari || s.arrivi !== prima.arrivi ||
       s.ricorrenze !== prima.ricorrenze || s.promozioni !== prima.promozioni ||
       s.ritorno !== prima.ritorno || s.promemoria !== prima.promemoria ||
       /* F5b — un verdetto (rifiuto/da_parte/aperto), una messa da parte
          o la lista cambiano quello che il motore propone qui (il pezzo
          esce, torna a "da_prendere", o la sessione si ferma): senza
          questi tre rami «Non fa per me» non ridisegnerebbe niente. */
       s.proposte !== prima.proposte || s.daparte !== prima.daparte ||
       s.wishlist !== prima.wishlist ||
       /* E10-B — il cuore del rail (F6, 21/09): stesso ramo della
          Vetrina, e questa vista deve ridisegnarsi quando cambia anche
          se il tocco è arrivato da qui. */
       s.preferiti !== prima.preferiti ||
       ev.tipo === "demo/reset") conTransizione(disegna);
  });

  /* la maniglia dichiarata, come `window.__elenco` del cofanetto: le
     sonde non devono indovinare un selettore, e la demo della chiusura
     dev'essere raggiungibile senza un tasto finto in mezzo alla
     pagina. */
  window.__perte = Object.assign(window.__perte || {}, {
    get dati(){ return dati(); },
    proposte,
    chiusura: (id) => {
      if(tabCorrente() !== "perte") vaiA("perte");
      const d = dati();
      const c = d.mie.find((x) => x.id === id) || d.mie[0];
      if(c) spingi("chiusura/" + c.id);
    },
    promemoria: () => leggiPromemoria(leggi()),
    /* F5b — per il banco prestazioni: il tempo fra l'attivazione della
       tab e il blocco grande disegnato. `null` finché l'uno o l'altro
       non è successo — la sonda aspetta sul valore, non su un timeout
       fisso. */
    tempiMotore: () => ({
      chiesto: tMotoreChiesto, disegnato: tBloccoDisegnato,
      arrivato: motoreChiesto && !!motoreProposte,
      attesa_ms: (tMotoreChiesto != null && tBloccoDisegnato != null)
        ? Math.round(tBloccoDisegnato - tMotoreChiesto) : null
    })
  });

  /* `?demo=chiusura` — la scena di P3 senza dover chiudere davvero una
     collezione. Un giro dopo, perché la rotta di partenza si posi. */
  const q = new URLSearchParams(location.search);
  if(q.get("demo") === "chiusura")
    setTimeout(() => window.__perte.chiusura(q.get("coll") || null), 220);
}
