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

  /* ── GLI ARRIVI in home: al massimo due, i più recenti ─────────── */
  const inNegozio = arrivi
    .filter((a) => !gia.has(a.articolo) && !posseduti.has(a.articolo))
    .slice()
    .sort((x, y) => String(y.data).localeCompare(String(x.data)))
    .slice(0, ARRIVI_IN_HOME)
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
      scelte: tre
    };
  }
  const promo = promoViva ? {
    tipo: "promo",
    occhiello: "Dal " + giornoEMese(promoViva.dal) + " al " + giornoEMese(promoViva.al),
    titolo: promoViva.nome || "Una promozione del negozio",
    riga: promoViva.testo || "",
    nota: "In negozio, al banco. Nessun codice."
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
    arrivi: inNegozio, promo, compleanno, ritorno,
    fine: "Non c’è altro, per ora."
  };
}

/* ═══════════════════════════════════════════════════════════════════
   PARTE SECONDA — LA VISTA. Da qui in giu' si tocca il DOM.
   ═══════════════════════════════════════════════════════════════════ */

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
function leggiPromemoria(s){
  return (s && Array.isArray(s.promemoria)) ? s.promemoria : [];
}
function segnaPromemoria(store, dato){
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
function figura(p, classe, opz = {}){
  const senza = () => e("div", {class: "redatto " + classe},
    opz.muto ? [] : [e("span", {class: "t-cap1", testo: p.nome})]);
  if(!p.foto) return senza();
  const img = e("img", {class: classe, src: p.foto, alt: "",
    loading: "lazy", decoding: "async"});
  img.addEventListener("error", () => { img.replaceWith(senza()); }, {once: true});
  return img;
}

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

/* la mini-fila di pallini della riga di elenco: pieni = posseduti */
function pallini(c){
  return e("span", {class: "pallini", "aria-hidden": "true"},
    c.posti.map((p) => e("i", {class: "pallino" + (p.ha ? " ha" : "")})));
}

/* ── LA CARD DEL BLOCCO GRANDE — 361 × 452 ──────────────────────── */
function cardGrande(b, suClick){
  return e("button", {
    type: "button", class: "card-grande", "data-f5-blocco": b.regola || "pezzo",
    "aria-label": b.nome + (b.riga ? ". " + b.riga : ""),
    suClick
  }, [
    e("span", {class: "card-grande-foto"}, [figura(b, "grande-fig", {muto: true})]),
    e("b", {class: "t-2 card-nome", testo: b.nome}),
    b.riga ? e("span", {class: "t-sub card-riga", testo: b.riga}) : null,
    b.perche ? e("span", {class: "t-foot tenue card-perche", testo: b.perche}) : null
  ].filter(Boolean));
}

/* ── IL RAIL — card 160 × 200, passo 172 ──────────────────────────── */
function railDom(r, suPezzo, soldi){
  const carte = r.pezzi.map((p) => e("button", {
    type: "button", class: "card-rail", "data-pezzo": p.id,
    "aria-label": p.nome + ", " + soldi(p.prezzo),
    suClick: () => suPezzo(p.id)
  }, [
    e("span", {class: "card-rail-foto"}, [figura(p, "rail-fig")]),
    e("b", {class: "t-foot card-rail-nome", testo: p.nome}),
    e("span", {class: "t-foot tenue cifra", testo: soldi(p.prezzo)})
  ]));
  /* NIENTE SCORRIMENTO INFINITO (NN/g): l'elenco è finito e lo dice.
     L'ultima card è una frase, non un'esca. */
  if(r.altri > 0) carte.push(e("div", {class: "card-rail coda-rail"},
    [e("span", {class: "t-foot tenue", testo:
      "In negozio ce ne sono altri " + r.altri + "."})]));
  return e("section", {class: "rail-blocco", "data-rail": r.regola}, [
    e("h2", {class: "t-2 rail-testa", testo: r.titolo}),
    r.sotto ? e("p", {class: "t-foot tenue rail-sotto", testo: r.sotto}) : null,
    e("div", {class: "rail", role: "list", "aria-label": r.titolo},
      carte.map((c) => { c.setAttribute("role", "listitem"); return c; }))
  ].filter(Boolean));
}

/* ── P4 · LA CARD A RIGHE FISSE (promo · compleanno · arrivo) ──────
   Lo stesso modulo per tre contenuti: maiuscoletto con le DATE SCRITTE,
   Bodoni 22 col fatto, Inter 15 col dove/come, Inter 13 col perché o
   l'azione. Nessun timer, nessun bottone pieno, nessun «solo per te». */
function cardP4(d, azione){
  return e("section", {class: "p4", "data-p4": d.tipo}, [
    e("span", {class: "occhiello foot p4-occhiello", testo: d.occhiello}),
    e("b", {class: "t-2 p4-titolo", testo: d.titolo}),
    d.riga ? e("p", {class: "t-sub p4-riga", testo: d.riga}) : null,
    d.nota ? e("p", {class: "t-foot tenue p4-nota", testo: d.nota}) : null,
    azione || null
  ].filter(Boolean));
}

/* ═══ IL MONTAGGIO ═════════════════════════════════════════════════ */
export function monta(el, store){
  vestiti();
  const {leggi, iscrivi, soldi} = store;

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
  registraSchermo("collezioni", (id, dove) =>
    id === "tutte" ? schermoHub(dove) : schermoCollezione(id, dove));
  registraSchermo("collezione", (id, dove) => schermoCollezione(id, dove));
  registraSchermo("chiusura", (id, dove) => schermoChiusura(id, dove));

  const vaiAlPezzo = (id) => spingi("pezzo/" + id);

  /* ══ P0 · PER TE ═══════════════════════════════════════════════ */
  function disegna(){
    const d = dati();
    const pagina = schermo(el, {titolo: "Per te"});

    /* 2 · la riga del ritorno — solo se c'è un fatto */
    if(d.ritorno) pagina.append(e("p", {class: "t-sub accento riga-ritorno", testo: d.ritorno}));

    /* le card P4 che vanno IN CIMA: nella tabella «evento → grado →
       forma» il compleanno è di grado grande, e sta sopra il blocco. */
    if(d.compleanno) pagina.append(cardP4(d.compleanno));
    if(d.promo) pagina.append(cardP4(d.promo));

    /* 3 · IL BLOCCO GRANDE, uno solo, e il titolo È la regola */
    if(d.blocco) pagina.append(e("section", {class: "blocco", "data-regola": d.blocco.regola}, [
      e("h2", {class: "occhiello foot blocco-testa", testo: d.blocco.occhiello}),
      cardGrande(d.blocco, () => {
        if(d.blocco.regola === "chiude_collezione" && d.blocco.collezione)
          spingi("collezioni/" + d.blocco.collezione);
        else vaiAlPezzo(d.blocco.articolo);
      })
    ]));

    /* 4-6 · i rail, al massimo tre */
    for(const r of d.rail) pagina.append(railDom(r, vaiAlPezzo, soldi));

    /* 7 · le tue collezioni. In coda al gruppo, l'unica porta per l'hub:
       una sezione raggiungibile solo da un indirizzo scritto a mano è
       una sezione che non esiste. */
    if(d.mie.length) pagina.append(e("section", {class: "lista-blocco"}, [
      e("h2", {class: "occhiello foot lista-testa", testo: "Le tue collezioni"}),
      e("div", {class: "lista", role: "list"}, [...d.mie.map((c) => e("button", {
        type: "button", role: "listitem", class: "cella due coll-riga", "data-coll": c.id,
        "aria-label": c.nome + ", " + c.ha + " di " + c.totale +
          (c.manca === 1 ? ", ti manca " + c.mancanti[0].nome : ""),
        suClick: () => spingi("collezioni/" + c.id)
      }, [
        e("div", {class: "testo"}, [
          e("b", {testo: c.nome}),
          e("span", {class: "cifra", testo: c.ha + " di " + c.totale +
            (c.manca === 1 ? " · ti manca " + c.mancanti[0].nome
             : c.manca ? " · te ne mancano " + c.manca : " · completa")})]),
        pallini(c),
        segno("chevron", {misura: 14, classe: "frec"})
      ])),
      cella({titolo: "Tutte le collezioni",
        sotto: numero(d.collezioni.length) + " in negozio, " +
               numero(d.mie.length) + (d.mie.length === 1 ? " tua" : " tue"),
        etichetta: "Tutte le collezioni del negozio",
        suClick: () => spingi("collezioni/tutte")})]
        .map((n) => { n.setAttribute("role", "listitem"); return n; }))
    ]));

    /* 8 · in negozio da… (al massimo due card evento) */
    if(d.arrivi.length){
      const sez = e("section", {class: "arrivi-blocco"},
        /* «ARRIVI», non «IN NEGOZIO DA…». La testata di un gruppo dice
           COSA c'è dentro; i puntini di sospensione promettevano una
           data che la testata non poteva portare, e la data — quella
           vera, col giorno della settimana — sta già DENTRO ogni card
           («In vetrina da giovedì 17 settembre»). Una parola, e il
           quando lo dice il pezzo di cui si parla. */
        [e("h2", {class: "occhiello foot lista-testa", testo: "Arrivi"})]);
      for(const a of d.arrivi) sez.append(cardArrivo(a));
      pagina.append(sez);
    }

    /* 9 · LA FINE, DICHIARATA. Non «carica altro»: l'elenco è finito e
       si dice che è finito (NN/g, alternative allo scorrimento
       infinito). */
    pagina.append(e("p", {class: "t-foot tenue la-fine", testo: d.fine}));
  }

  /* ── P4 · LA CARD DELL'ARRIVO, con «Ricordamelo» ──────────────── */
  function cardArrivo(a){
    const fatto = () => leggiPromemoria(leggi()).some((x) => x.id === a.id);
    const eti = () => fatto()
      ? "Te lo ricordiamo " + soloGiorno(a.avviso) + " alle 9"
      : "Ricordamelo";
    const t = tasto(eti(), {tipo: "terziario", etichetta: eti(), suClick: () => {
      if(fatto()) return;
      segnaPromemoria(store, {id: a.id, articolo: a.articolo,
        quando: a.avviso, creato: OGGI});
      vestiTasto(t, eti());
      t.setAttribute("aria-label", eti());
      t.setAttribute("aria-pressed", "true");
      t.dataset.segnato = "1";
      toast("Te lo ricordiamo " + soloGiorno(a.avviso) + " alle 9.");
      annuncia(a.nome + ". Te lo ricordiamo " + soloGiorno(a.avviso) + " alle 9.");
    }});
    if(fatto()){ t.setAttribute("aria-pressed", "true"); t.dataset.segnato = "1"; }

    return e("article", {class: "p4 p4-arrivo", "data-p4": "arrivo", "data-arrivo": a.id}, [
      e("button", {type: "button", class: "arrivo-foto",
        "aria-label": a.nome + ", guarda il pezzo",
        suClick: () => vaiAlPezzo(a.articolo)}, [figura(a, "arrivo-fig", {muto: true})]),
      e("span", {class: "occhiello foot p4-occhiello", testo: a.occhiello}),
      e("b", {class: "t-2 p4-titolo", testo: a.nome}),
      a.riga ? e("p", {class: "t-sub p4-riga", testo: a.riga}) : null,
      t
    ].filter(Boolean));
  }

  /* ══ P1 · L'HUB DELLE COLLEZIONI ═══════════════════════════════ */
  function schermoHub(dove){
    const d = dati();
    const pagina = schermo(dove, {titolo: "Collezioni", indietro: torna,
      etichettaIndietro: "Torna a Per te"});
    for(const c of d.mie) pagina.append(sezioneCollezione(c));
    /* LE ALTRE non prendono una fila: «mai una barra a zero». Si dicono
       per nome, perché esistono, e ci si entra comprandone uno. */
    if(d.altre.length) pagina.append(lista("Le altre, in negozio", d.altre.map((c) => cella({
      titolo: c.nome, sotto: numero(c.totale) + " pezzi · " + (c.stagione || "in negozio"),
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
  function schermoCollezione(id, dove){
    const d = dati();
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

    /* IL PEZZO CHE CHIUDE — la stessa card grande di P0, perché è la
       stessa cosa detta nello stesso posto della pagina. */
    const m = c.mancanti[0];
    if(m){
      pagina.append(e("h2", {class: "t-2 sotto-testa", testo: "Il pezzo che chiude"}));
      pagina.append(cardGrande({
        nome: m.nome, foto: m.foto,
        riga: c.chiude ? "Con questo ricevi " + c.chiude.nome : "Con questo la chiudi",
        perche: c.chiude ? c.chiude.nota : null
      }, () => vaiAlPezzo(m.articolo)));
      if(c.arrivo) pagina.append(e("p", {class: "t-foot coll-dove", testo: c.arrivo.testo}));
    }

    /* I TUOI PEZZI DI … — righe con la data in cui sono diventati suoi */
    const s = leggi();
    const quando = new Map((s.esemplari || []).filter((x) => !x.rimosso && x.data_vendita)
      .map((x) => [x.articolo, x.data_vendita]));
    const suoi = c.posti.filter((p) => p.ha);
    if(suoi.length) pagina.append(lista("I tuoi pezzi di " + c.nome, suoi.map((p) => cella({
      id: p.articolo, foto: p.foto, titolo: p.nome,
      sotto: quando.has(p.articolo) ? "Tuo dal " + dataCorta(quando.get(p.articolo)) : "Tuo",
      etichetta: p.nome + ", tuo",
      suClick: () => vaiAlPezzo(p.articolo)
    }))));

    /* «RICORDAMELO PER GIOVEDÌ» — azione testuale, una notifica sola.
       Niente permesso push qui: si chiede DOPO il primo momento di
       valore, mai dentro una schermata di contenuto. */
    if(c.arrivo){
      const idPr = "coll-" + c.id;
      const avviso = giorniFra(d.oggi, c.arrivo.data) >= 1
        ? isoMeno(c.arrivo.data, 1) : isoPiu(d.oggi, 1);
      const fatto = () => leggiPromemoria(leggi()).some((x) => x.id === idPr);
      const eti = () => fatto()
        ? "Te lo ricordiamo " + soloGiorno(avviso) + " alle 9"
        : "Ricordamelo per " + soloGiorno(c.arrivo.data);
      const t = tasto(eti(), {tipo: "terziario", etichetta: eti(), suClick: () => {
        if(fatto()) return;
        segnaPromemoria(store, {id: idPr, articolo: c.arrivo.articolo,
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
     dissolvenza di 200 e basta (il tetto del ridotto e' 150-200). */
  function schermoChiusura(id, dove){
    const d = dati();
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

    /* IL PREMIO ENTRA, e porta la firma: la reciprocita' funziona
       quando ha un mittente (Strohmetz 2002). «da Regina», non «hai
       guadagnato». */
    /* «IL FILO» È IL NOME DI UN PEZZO, e i nomi dei pezzi in questa app
       si scrivono in Bodoni: 22, come il nome sotto la card grande e
       come il titolo di una collezione. In Inter 17 — il corpo di una
       riga di lista — il premio della chiusura si leggeva come
       un'etichetta di stato, e la scena di grado GRANDE finiva con la
       tipografia di una ricevuta. */
    const premio = e("div", {class: "lista premio", "data-f5-premio": "1"}, [
      e("div", {class: "cella due piatta"}, [
        e("div", {class: "testo"}, [
          e("b", {class: "t-2 premio-nome",
            testo: c.chiude ? c.chiude.nome : "Il pezzo che chiude"}),
          e("span", {testo: c.chiude && c.chiude.nota
            ? c.chiude.nota : "Ti aspetta in negozio."})]),
        e("span", {class: "t-2 firma", testo: "Regina"})])]);
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
    if(!prima) return;
    if(s.esemplari !== prima.esemplari || s.arrivi !== prima.arrivi ||
       s.ricorrenze !== prima.ricorrenze || s.promozioni !== prima.promozioni ||
       s.ritorno !== prima.ritorno || s.promemoria !== prima.promemoria ||
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
    promemoria: () => leggiPromemoria(leggi())
  });

  /* `?demo=chiusura` — la scena di P3 senza dover chiudere davvero una
     collezione. Un giro dopo, perché la rotta di partenza si posi. */
  const q = new URLSearchParams(location.search);
  if(q.get("demo") === "chiusura")
    setTimeout(() => window.__perte.chiusura(q.get("coll") || null), 220);
}
