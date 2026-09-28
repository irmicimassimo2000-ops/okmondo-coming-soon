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
import { schermo } from "app/ui/barra-nav.js";
import { toast } from "app/ui/toast.js";
import { spingi, registraSchermo, torna, vaiA, tabCorrente } from "app/rotta.js";
import { conTransizione, RIDOTTO, lineare, molla } from "app/moto.js";
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
      riga: "Ne hai " + chiudibile.ha + " di " + chiudibile.totale +
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
/* esportata: F6 (28/09) — «Dal negozio» (`perte-negozio.js`, caricata a
   richiesta) la riusa per la riga E05-B di «Anche per te»: la stessa
   traduzione motore→etichetta, non una seconda. */
export function etichettaMotivo(g, s){
  const chiave = g.chiave || g.regola;
  /* CORREZIONE (coordinatore, 28/09) — «L'ULTIMO DI …» SOLO A UN
     PEZZO DALLA CHIUSURA. Prima il ramo copriva ANCHE `chiave ===
     "collezione"` (una collezione a 2, 3 o 4 dalla chiusura): un fatto
     falso mostrato alla cliente («l'ultimo» quando gliene mancano
     ancora 3), causato da una chiave sbagliata nel motore — corretta
     alla radice in `app/motore/proposte.js`. Qui la riga resta di
     guardia: la tabella etichette-motivo di `SCELTE-MASSIMO.md`
     (21/09) non ha MAI avuto una voce per «appartiene a una collezione
     ma non è l'ultimo pezzo» — quindi quella regola non porta ancora
     nessuna etichetta-motivo lockata. */
  if(chiave === "chiude_collezione"){
    const nome = String(campoDati(g, "collezione") || "");
    const lunga = "L’ULTIMO DI " + nome.toUpperCase();
    return lunga.length <= 26
      ? {etichetta: lunga, sotto: "Ti manca solo questo"}
      : {etichetta: "L’ULTIMO DELLA COLLEZIONE", sotto: "Ti manca solo " + nome};
  }
  if(chiave === "collezione"){
    /* CORREZIONE DEL COORDINATORE (28/09, secondo giro): l'eyebrow di
       `ASSIEME_SCOPERTA_B` — «✦ DELLA TUA COLLEZIONE X» — è vera anche
       qui (la collezione È sua, solo non all'ultimo pezzo); sotto il
       conteggio per esteso, non la frase generica del motore. */
    const nome = String(campoDati(g, "collezione") || "");
    const posseduti = campoDati(g, "posseduti");
    const totale = campoDati(g, "totale");
    const manca = campoDati(g, "manca");
    const sotto = (posseduti != null && totale != null)
      ? posseduti + " di " + totale + (manca > 1 ? " · te ne mancano " + manca : "")
      : g.frase;
    return {etichetta: "DELLA TUA COLLEZIONE " + nome.toUpperCase(), sotto};
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

/* ══════════════════════════════════════════════════════════════════
   F6 (28/09) · «SCOPRI» — IL MAZZO A SCHERMO INTERO, IL GESTO TINDER.
   Ancore: `tavole-perte-2` E02 (carta edge-to-edge) / E03 (gesto e
   affordance) / E04 (dove va il pezzo) / E06 (fine del mazzo),
   `ASSIEME_SCOPERTA_B`. La FORMA è di Regina (la carta, la capsula dei
   due tasti); il MECCANISMO del gesto — soglie, rotazione, timbro,
   lancio — è preso da Tinder/Hinge, mai la pelle (canone 21/09).

   IL MAZZO NON È UNA SECONDA SELEZIONE (`SCOPERTA-MOTORE.md` §0-1):
   `motoreProposte.mazzoScopri(m)` appiattisce grande+rail e tiene solo
   chi ha un'immagine vera. Qui si mostra quella sequenza, una carta
   alla volta, mai rimescolata — un puntatore locale avanza a ogni
   gesto, «Annulla» lo riporta indietro di uno. ═══════════════════════ */

const SOGLIA_DISTANZA = 0.3;    /* 30% della larghezza della carta */
const SOGLIA_VELOCITA = 0.5;    /* px/ms */
const ROTAZIONE_MAX = 12;       /* gradi, come dichiarato dal brief */

/* LA CARTA — edge-to-edge: immagine, scrim, motivo, corpo. Ogni pezzo
   del mazzo ha già un'immagine per costruzione (`mazzoScopri`, §0). */
function cartaScopriDom(g, pos, leggi, soldi){
  const mot = etichettaMotivo(g, leggi());
  const fig = figura(g.articolo, "pt-carta-img", {muto: true});
  if(fig.tagName === "IMG") fig.style.backgroundColor = PROVINO_FONDO;
  return e("div", {class: "pt-carta", "data-pos": String(pos), "data-id": g.id}, [
    fig,
    e("div", {class: "pt-carta-scrim", "aria-hidden": "true"}),
    /* CORREZIONE (coordinatore, 28/09): niente pillola quando la regola
       non ne ha una lockata (`etichettaMotivo` torna `etichetta: null`
       per «collezione», non l'ultimo pezzo) — mai una capsula vuota. */
    mot.etichetta ? e("div", {class: "pt-carta-motivo"}, [segno("stella", {misura: 14}),
      e("span", {testo: mot.etichetta})]) : null,
    pos === 0 ? e("div", {class: "pt-timbro si", "aria-hidden": "true", testo: "Mi interessa"}) : null,
    pos === 0 ? e("div", {class: "pt-timbro no", "aria-hidden": "true", testo: "Non fa per me"}) : null,
    e("div", {class: "pt-carta-corpo"}, [
      e("span", {class: "pt-carta-nome", testo: g.articolo.nome}),
      e("span", {class: "pt-carta-prezzo", testo: soldi(g.articolo.prezzo)}),
      mot.sotto ? e("span", {class: "pt-carta-ragione", testo: mot.sotto}) : null
    ].filter(Boolean))
  ].filter(Boolean));
}

/* I TIMBRI, IN PROPORZIONE ALLA DISTANZA (brief): `t` va da -1 (tutto a
   sinistra) a 1 (tutto a destra) — l'opacità segue `|t|`, mai un salto
   a scatti fra 0 e 1. */
function aggiornaTimbri(cartaEl, t){
  const si = cartaEl.querySelector(".pt-timbro.si");
  const no = cartaEl.querySelector(".pt-timbro.no");
  const a = Math.max(0, Math.min(1, Math.abs(t))).toFixed(3);
  if(si) si.style.opacity = t > 0 ? a : "0";
  if(no) no.style.opacity = t < 0 ? a : "0";
}
/* SOLO TRANSFORM/OPACITY, MAI IL LAYOUT (brief, 60 fps): una
   `translate` più una `rotate` in una riga sola di `style.transform`,
   la rotazione in proporzione a `dx`, tetto a ±12°. */
function applicaTrascina(cartaEl, dx, dy, larghezza){
  const rot = Math.max(-ROTAZIONE_MAX, Math.min(ROTAZIONE_MAX,
    (dx / larghezza) * ROTAZIONE_MAX * 2.2));
  cartaEl.style.transform = "translate(" + dx.toFixed(1) + "px," + dy.toFixed(1) +
    "px) rotate(" + rot.toFixed(2) + "deg)";
  aggiornaTimbri(cartaEl, dx / (larghezza * SOGLIA_DISTANZA));
}

/* LA MOLLA DI RITORNO (sotto soglia): due `molla()` in parallelo, una
   per asse — `moto.js` già rispetta `RIDOTTO` da sola (salta dritta al
   bersaglio sotto movimento ridotto), quindi qui non si ripete il
   controllo. */
function tornaAlCentro(cartaEl, dx0, dy0, vx, vy){
  const larghezza = () => cartaEl.getBoundingClientRect().width || 361;
  let dyCorrente = dy0;
  molla(dy0, 0, {v0: vy, passo: (v) => { dyCorrente = v; }, fine: () => { dyCorrente = 0; }});
  molla(dx0, 0, {v0: vx,
    passo: (v) => applicaTrascina(cartaEl, v, dyCorrente, larghezza()),
    fine: () => { cartaEl.style.transform = ""; aggiornaTimbri(cartaEl, 0); }});
}

/* IL LANCIO OLTRE SOGLIA — WAAPI diretta (non `molla()`: qui la meta è
   fuori schermo, non un punto di riposo). Movimento ridotto = semplice
   dissolvenza (brief), mai la traiettoria. */
function volaFuori(cartaEl, direzione, dyIniziale){
  if(RIDOTTO.matches){
    cartaEl.animate([{opacity: 1}, {opacity: 0}], {duration: 150, easing: "linear", fill: "forwards"});
    return;
  }
  const larghezza = cartaEl.getBoundingClientRect().width || 361;
  const via = (direzione === "destra" ? 1 : -1) * larghezza * 1.6;
  const rot = direzione === "destra" ? 22 : -22;
  cartaEl.animate([
    {transform: cartaEl.style.transform || "translate(0,0) rotate(0deg)", opacity: 1},
    {transform: "translate(" + via.toFixed(0) + "px," + ((dyIniziale || 0) + 70).toFixed(0) +
      "px) rotate(" + rot + "deg)", opacity: 0}
  ], {duration: 260, easing: "cubic-bezier(.2,.8,.2,1)", fill: "forwards"});
}

/* IL GESTO — pointer events con cattura (brief): il dito è nostro dal
   primo tocco, `setPointerCapture` tiene il tracciamento anche se il
   dito esce dai bordi della carta. Solo la carta in cima (`data-pos=0`)
   lo riceve. */
function armaTrascinamento(cartaEl, onDecisione){
  let attivo = false, id = -1, x0 = 0, y0 = 0, ultimoX = 0, ultimoY = 0, ultimoT = 0, vel = 0;
  cartaEl.addEventListener("pointerdown", (ev) => {
    if(!ev.isPrimary || attivo) return;
    attivo = true; id = ev.pointerId;
    x0 = ev.clientX; y0 = ev.clientY;
    ultimoX = x0; ultimoY = y0; ultimoT = ev.timeStamp || performance.now(); vel = 0;
    cartaEl.classList.add("in-trascinamento");
    try{ cartaEl.setPointerCapture(id); }catch(_){}
  });
  cartaEl.addEventListener("pointermove", (ev) => {
    if(!attivo || ev.pointerId !== id) return;
    const t = ev.timeStamp || performance.now();
    const dt = t - ultimoT;
    if(dt > 0) vel = (ev.clientX - ultimoX) / dt;   /* px/ms */
    ultimoX = ev.clientX; ultimoY = ev.clientY; ultimoT = t;
    applicaTrascina(cartaEl, ev.clientX - x0, ev.clientY - y0,
      cartaEl.getBoundingClientRect().width || 361);
  });
  const fine = (ev) => {
    if(!attivo || (ev && ev.pointerId !== id)) return;
    attivo = false;
    cartaEl.classList.remove("in-trascinamento");
    try{ cartaEl.releasePointerCapture(id); }catch(_){}
    const larghezza = cartaEl.getBoundingClientRect().width || 361;
    const dx = ultimoX - x0, dy = ultimoY - y0;
    const oltreSoglia = Math.abs(dx) >= larghezza * SOGLIA_DISTANZA ||
      Math.abs(vel) >= SOGLIA_VELOCITA;
    if(oltreSoglia) onDecisione(dx >= 0 ? "destra" : "sinistra", {dx, dy, vel: vel * 1000});
    else tornaAlCentro(cartaEl, dx, dy, vel * 1000, 0);
  };
  cartaEl.addEventListener("pointerup", fine);
  cartaEl.addEventListener("pointercancel", fine);
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

  /* ══ F6 (28/09) · «PER TE» A DUE INTERFACCE ═══════════════════════
     La MODALITÀ non è persistita: si riapre sempre su «Scopri» (E01-A
     — è il motore personale, la ragione del nome «Per te»). Stato
     locale al montaggio, come `OGGI` e `SESSIONE` qui sopra. */
  let modo = "scopri";

  /* IL MAZZO DI «SCOPRI» — uno snapshot fisso per la sessione
     (`SCOPERTA-MOTORE.md` §1: «non è una lista nuova», e non si
     rimescola a ogni tocco). `null` finché il motore non è arrivato. */
  let mazzoScopriArr = null;
  let posizioneScopri = 0;
  let contDaParteScopri = 0;
  let ultimaAzioneScopri = null;            /* {direzione, g} — «Annulla» */
  let animaSwipeAlProssimoDisegno = null;   /* {direzione, dx, dy} */
  let swipeInCorso = false;                 /* vedi l'ascolto dello store */

  /* «DAL NEGOZIO» — CARICATA A RICHIESTA, stessa via del motore e
     delle collezioni (bilancio JS: si apre su «Scopri», questa non
     deve pesare sull'avvio). */
  let negozioPromessa = null;
  function caricaNegozio(){
    if(!negozioPromessa) negozioPromessa = import("app/viste/perte-negozio.js");
    return negozioPromessa;
  }

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

  /* ── E01-A · IL COMMUTATORE ─────────────────────────────────────── */
  function cambiaModo(nuovo){
    if(nuovo === modo) return;
    modo = nuovo;
    disegna();
  }
  function commutatoreDom(){
    const voce = (id, testo) => e("button", {
      type: "button", class: modo === id ? "attivo" : "",
      role: "tab", "aria-selected": String(modo === id),
      suClick: () => cambiaModo(id)
    }, [e("span", {testo})]);
    return e("div", {class: "pt-commutatore", role: "tablist",
      "aria-label": "Modalità di «Per te»"},
      [voce("scopri", "Scopri"), voce("negozio", "Dal negozio")]);
  }

  /* ── E04 · LA DECISIONE — dove va il pezzo, e come lo si racconta ──
     Destra = «Metti da parte» (lo STESSO evento del tasto di sempre,
     nessun bucket nuovo, `SCOPERTA-MOTORE.md` §2). Sinistra = «Non fa
     per me», il verdetto già lockato. Il puntatore locale avanza
     SUBITO — la carta vola via a schermo, il motore la riscrive nel
     suo registro in parallelo, non prima. */
  function decidi(direzione, trascina){
    if(!mazzoScopriArr || posizioneScopri >= mazzoScopriArr.length) return;
    const g = mazzoScopriArr[posizioneScopri];
    ultimaAzioneScopri = {direzione, g};
    animaSwipeAlProssimoDisegno = {
      direzione, dx: (trascina && trascina.dx) || 0, dy: (trascina && trascina.dy) || 0
    };
    posizioneScopri++;
    if(direzione === "destra") contDaParteScopri++;
    swipeInCorso = true;
    if(direzione === "destra"){
      const fino = isoPiu(OGGI, TENUTA_GIORNI_DAPARTE);
      invia("daparte/aggiungi", {id: g.id, dal: OGGI, fino});
      invia("proposta/verdetto", {
        articolo: g.id, esito: "da_parte", regola: g.regola, oggi: OGGI, sessione: SESSIONE
      });
      /* NIENTE TOAST QUI (a differenza del tasto «Metti da parte» di
         Vetrina): nel mazzo la risposta al tocco è già la carta che
         vola via e il conto che avanza — un toast fisso in fondo allo
         schermo si sovrapporrebbe ai due tasti, proprio dove sta il
         prossimo gesto (misurato: copre `.blocco-azioni` per la sua
         durata, bloccando un secondo tocco rapido). Resta l'annuncio
         per chi ascolta. */
      annuncia(g.articolo.nome + ", messo da parte, fino al " + giornoEMese(fino) + ".");
    } else {
      invia("proposta/verdetto", {
        articolo: g.id, esito: "rifiuto", regola: g.regola, oggi: OGGI, sessione: SESSIONE
      });
      annuncia(g.articolo.nome + ", non fa per te.");
    }
    swipeInCorso = false;
  }

  /* ── E03-B · «ANNULLA» — capacità nuova, piccola, fuori dal motore
     (`SCOPERTA-MOTORE.md` §2): ri-dispatcha l'evento inverso invece di
     scrivere lo stato a mano da qui. */
  function annullaScopri(){
    if(!ultimaAzioneScopri) return;
    const {direzione, g} = ultimaAzioneScopri;
    ultimaAzioneScopri = null;
    posizioneScopri = Math.max(0, posizioneScopri - 1);
    if(direzione === "destra") contDaParteScopri = Math.max(0, contDaParteScopri - 1);
    swipeInCorso = true;
    if(direzione === "destra") invia("daparte/togli", {id: g.id});
    else invia("proposta/annulla_rifiuto", {articolo: g.id, regola: g.regola});
    swipeInCorso = false;
    annuncia(g.articolo.nome + ", annullato.");
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

  /* IL VOLO — WAAPI diretta sulla carta che ha appena lasciato la
     schermata (già spostata in `<body>` da `disegna()`, PRIMA che
     `schermo()` svuoti il contenitore: un nodo staccato non si anima).
     Durata e curva sono le stesse di `--d-ct-in`/`--ios` (sistema.css,
     300 ms): scritte qui come `rotta.js` scrive già le sue — un
     `getComputedStyle` per ogni volo costerebbe un layout in più
     durante il gesto, che il brief vieta. Movimento ridotto = semplice
     dissolvenza, mai la traiettoria. */
  function volaFuori(cartaEl, direzione, dyIniziale){
    if(RIDOTTO.matches){
      cartaEl.animate([{opacity: 1}, {opacity: 0}], {duration: 150, easing: "linear", fill: "forwards"});
      return;
    }
    const larghezza = cartaEl.getBoundingClientRect().width || 361;
    const via = (direzione === "destra" ? 1 : -1) * larghezza * 1.6;
    const rot = direzione === "destra" ? 22 : -22;
    cartaEl.animate([
      {transform: cartaEl.style.transform || "translate(0,0) rotate(0deg)", opacity: 1},
      {transform: "translate(" + via.toFixed(0) + "px," + ((dyIniziale || 0) + 70).toFixed(0) +
        "px) rotate(" + rot + "deg)", opacity: 0}
    ], {duration: 300, easing: "cubic-bezier(.2,.8,.2,1)", fill: "forwards"});
  }

  /* ── E03-B · LA RIGA DI CONTO ──────────────────────────────────── */
  function rigaContoDom(){
    const disabilitato = !ultimaAzioneScopri;
    return e("div", {class: "pt-riga-conto"}, [
      e("button", {type: "button", class: "pt-annulla",
        "aria-disabled": disabilitato ? "true" : null,
        suClick: () => { if(!disabilitato) annullaScopri(); }
      }, [e("span", {testo: "← Annulla"})]),
      e("span", {class: "pt-conto", testo: (posizioneScopri + 1) + " di " + mazzoScopriArr.length})
    ]);
  }

  /* ── E08-C, RIUSATA · LA SESSIONE È CHIUSA (o «tutto suo») ────────── */
  function fineCalmaDom(testo){
    return e("div", {class: "pt-fine"}, [
      segno("stella", {misura: 40}),
      e("span", {class: "pt-fine-titolo t-2", testo})
    ]);
  }

  /* ── E06-A · FINE DEL MAZZO, CON IL RIEPILOGO ─────────────────────── */
  function fineMazzoDom(m){
    return e("div", {class: "pt-fine"}, [
      segno("stella", {misura: 40}),
      e("span", {class: "pt-fine-titolo t-2", testo: (m && m.fine) || "Non c’è altro, per ora."}),
      e("span", {class: "pt-fine-sotto", testo: "Hai visto tutte le proposte di oggi"}),
      e("div", {class: "griglia-riepilogo"}, [
        e("div", {class: "riepilogo-cella"}, [
          e("span", {class: "num", testo: String(mazzoScopriArr.length)}),
          e("span", {class: "et", testo: "pezzi visti"})]),
        e("div", {class: "riepilogo-cella"}, [
          e("span", {class: "num", testo: String(contDaParteScopri)}),
          e("span", {class: "et", testo: "messi da parte"})])
      ]),
      tasto("Guarda le promozioni", {tipo: "primario", largo: true, suClick: () => cambiaModo("negozio")})
    ]);
  }

  /* ── IL CORPO DI «SCOPRI» ──────────────────────────────────────── */
  function disegnaScopri(pagina){
    pagina.classList.add("pt-scopri-pagina");
    chiediMotoreSeAttiva();

    if(!motoreProposte){
      /* in corso → lo scheletro, monocromo e fermo (niente shimmer).
         Fallito (rete assente) → niente: nessun errore, solo silenzio. */
      if(!motoreFallito) pagina.append(e("div", {class: "pt-scena", "aria-hidden": "true"},
        [osso("100%", "100%", {raggio: "0px"})]));
      return;
    }
    if(tBloccoDisegnato == null) tBloccoDisegnato = performance.now();
    const m = motore();

    if(m.sessione_chiusa){
      /* E08-C: la data VERA, non «lunedì» da solo. */
      const testoChiuso = m.chiusa_fino
        ? "Va bene: torno a proporti qualcosa " + giornoBreve(m.chiusa_fino) + "."
        : m.fine;
      pagina.append(fineCalmaDom(testoChiuso));
      return;
    }
    if(mazzoScopriArr == null) mazzoScopriArr = motoreProposte.mazzoScopri(m);

    if(!mazzoScopriArr.length){
      if(m.tutto_suo) pagina.append(fineCalmaDom(m.fine));
      /* E15-A: persona senza dati — segno + Title2 + Body + un'azione. */
      else pagina.append(vuoto({
        segno: "collezione", titolo: "Non c’è ancora nulla qui",
        testo: "Le tue proposte nascono dai pezzi che porti: comincia in negozio.",
        azione: "Scopri la vetrina", suAzione: () => vaiA("vetrina")
      }));
      return;
    }

    if(posizioneScopri >= mazzoScopriArr.length){
      pagina.append(fineMazzoDom(m));
      return;
    }

    pagina.append(rigaContoDom());
    const scena = e("div", {class: "pt-scena"});
    pagina.append(scena);
    /* fino a tre carte impilate: la in cima riceve il gesto, le altre
       due «salgono in scala» sotto di lei (CSS, `data-pos`). */
    mazzoScopriArr.slice(posizioneScopri, posizioneScopri + 3)
      .forEach((g, i) => scena.append(cartaScopriDom(g, i, leggi, soldi)));
    pagina.append(e("div", {class: "blocco-azioni"}, [
      vestiSecondaria(tasto("Non fa per me", {tipo: "terziario", suClick: () => decidi("sinistra")})),
      vestiPrincipale(tasto("Metti da parte", {tipo: "terziario", suClick: () => decidi("destra")}))
    ]));
    const cimaCarta = scena.querySelector('.pt-carta[data-pos="0"]');
    if(cimaCarta) armaTrascinamento(cimaCarta, decidi);
  }

  /* ── IL CORPO DI «DAL NEGOZIO» — caricato a richiesta ─────────────── */
  function disegnaNegozio(pagina){
    chiediMotoreSeAttiva();
    const cont = e("div", {class: "pt-negozio"});
    pagina.append(cont);
    caricaNegozio().then((mod) => {
      if(modo !== "negozio" || !cont.isConnected) return;
      mod.monta(cont, {
        dati, soldi, invia, leggi, vaiAlPezzo,
        oggi: OGGI, giornoEMese, giorniFra,
        senzaFoto: () => motoreProposte ? motoreProposte.senzaFotoScopri(motore()) : []
      });
    }).catch((err) => { console.error(err); nonCaricato(cont); });
  }

  /* ══ P0 · PER TE — LA RADICE, DUE INTERFACCE ═══════════════════════
     F6 (28/09, verdetto di Massimo): «Per te» diventa due schermate
     diverse per meccanica dietro un commutatore (E01-A) — «Scopri», il
     motore personale a swipe, e «Dal negozio», editoriale. Si apre
     sempre su «Scopri». ═══════════════════════════════════════════ */
  function disegna(){
    /* si cattura QUI, PRIMA che `schermo()` svuoti il contenitore: un
       nodo staccato non si anima (`volaFuori` lo vuole ancora attaccato
       per misurarlo). Si sposta SUBITO in `<body>`, fissato alla sua
       posizione vera — sopravvive per davvero alla pulizia, non solo la
       sua referenza JS. */
    let vecchiaCartaVolante = null;
    const animInfo = animaSwipeAlProssimoDisegno;
    animaSwipeAlProssimoDisegno = null;
    if(modo === "scopri" && animInfo){
      const nodo = el.querySelector('.pt-carta[data-pos="0"]');
      if(nodo){
        const r = nodo.getBoundingClientRect();
        nodo.style.position = "fixed";
        nodo.style.left = r.left + "px"; nodo.style.top = r.top + "px";
        nodo.style.width = r.width + "px"; nodo.style.height = r.height + "px";
        nodo.style.margin = "0"; nodo.style.zIndex = "5"; nodo.style.pointerEvents = "none";
        document.body.appendChild(nodo);
        vecchiaCartaVolante = nodo;
      }
    }

    const d = dati();
    const pagina = schermo(el, {titolo: "Per te"});

    /* 1 · IL TITOLO CON LE INIZIALI (E01-B, verdetto di Massimo 21/09) */
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

    /* 2 · la riga del ritorno — solo se c'è un fatto. */
    if(d.ritorno) pagina.append(e("p", {class: "t-sub riga-ritorno", testo: d.ritorno}));

    /* 3 · E01-A · IL COMMUTATORE, sotto il titolo. */
    pagina.append(commutatoreDom());

    /* 4 · il corpo, secondo la modalità. */
    if(modo === "scopri") disegnaScopri(pagina);
    else disegnaNegozio(pagina);

    /* RISPOSTA AL TOCCO: la carta che ha lasciato la schermata vola
       via SOPRA la pagina appena ridisegnata, mentre la prossima è già
       in scena sotto di lei. */
    if(vecchiaCartaVolante){
      if(animInfo){
        volaFuori(vecchiaCartaVolante, animInfo.direzione, animInfo.dy);
        setTimeout(() => vecchiaCartaVolante.remove(), RIDOTTO.matches ? 170 : 320);
      } else vecchiaCartaVolante.remove();
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
    /* F6 (28/09) — UN GESTO DEL MAZZO NON PASSA DA `conTransizione`: se
       lo facesse, la View Transition nativa farebbe dissolvere TUTTA la
       pagina (un crossfade che nessuno ha chiesto), sovrapposta al volo
       mirato che `disegna()` fa già solo sulla carta. `swipeInCorso` è
       alzata da `decidi()`/`annullaScopri()` per la durata dei loro
       `invia()`: `disegna()` diretto, e la risposta al tocco la fa lei. */
    if(swipeInCorso){ disegna(); return; }
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
    /* F6 (28/09) — le due interfacce, per le sonde: non indovinare un
       selettore quando basta chiedere allo stato. */
    modo: () => modo,
    vaiModo: (m) => cambiaModo(m),
    mazzo: () => (mazzoScopriArr ? mazzoScopriArr.map((g) => g.id) : null),
    posizioneScopri: () => posizioneScopri,
    annullaScopri: () => annullaScopri(),
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
