/* ═══════════════════════════════════════════════════════════════════
   app/viste/azioni.js — LE AZIONI DELLA CARTA, lato scocca (F3b).

   Questa vista NON ha un tab, e non è una dimenticanza: le azioni di un
   pezzo non sono un posto dove si va, sono cose che si fanno a una carta
   che sta già davanti. La carta vive nel banco in tre dimensioni
   (spazio.html, dentro un iframe); il suo NASTRO manda sul canale
   «qualcuno ha toccato Dedica su questo pezzo», e da qui sale un foglio
   sopra qualunque schermata ci fosse.

   ── PERCHÉ I FOGLI STANNO QUI E NON NEL BANCO ──────────────────────
   Perché dentro ci si SCRIVE. Un campo di testo dentro un iframe, su
   iPhone, apre la tastiera di sistema che copre metà schermo e sposta
   il viewport dell'iframe, non quello della pagina: il tasto «Salva»
   finisce sotto la tastiera e non c'è `visualViewport` dell'iframe che
   lo riporti su. Fuori, invece, `window.visualViewport` dice quanto ne
   resta scoperto e il fondo si alza di quella differenza (è la stessa
   cosa che fa S2 dell'ingresso). Il banco disegna la carta; la scocca
   scrive sulla carta.

   ── IL CONTRATTO SUL CANALE ─────────────────────────────────────────
   DAL BANCO A QUI
     {t:"azione/dedica",     d:{id}}   apre il foglio della dedica
     {t:"azione/regala",     d:{id}}   apre il foglio del regalo
     {t:"azione/assistenza", d:{id}}   apre il foglio dell'assistenza
     {t:"azione/condividi",  d:{id}}   Web Share, o il foglio di ripiego
     {t:"nav/vetrina",       d:{}}     lo stato vuoto del banco manda in Vetrina
     {t:"banco/aperto",      d:{id}}   una carta è stata aperta: mandale i dati
   DA QUI AL BANCO
     {t:"esemplare/dati",    d:{id, esemplare:{…}}}   il retro della carta
     {t:"esemplare/nuovo",   d:{id}}   un pezzo è appena entrato nel cofanetto

   `esemplare/dati` parte a ogni cambiamento dei rami che lo compongono
   (esemplari, dediche, regali, assistenze) e non solo su richiesta: il
   banco non deve chiedere, e una carta che mostra una dedica vecchia è
   peggio di una carta senza dedica.

   ── COSA NON C'E' MAI, QUI DENTRO ───────────────────────────────────
   Il PREZZO (46: nessun passaporto lo mostra, e un link che prezza un
   regalo è un'offesa a chi l'ha fatto), le parole «trasferisci»,
   «proprietario», «wallet», il COGNOME dell'altra persona, e «Regala»
   su un pezzo ricevuto in regalo — che si OMETTE, non si nega in grigio.
   ═══════════════════════════════════════════════════════════════════ */

import { e, annuncia } from "app/ui/dom.js";
import { segno } from "app/ui/segni.js";
import { tasto, vestiTasto } from "app/ui/tasto.js";
import { toast } from "app/ui/toast.js";
import { apriFoglio, chiudiFoglio } from "app/ui/foglio.js";
import { vaiA, tabCorrente } from "app/rotta.js";
import { RIDOTTO } from "app/moto.js";
import { diAlBanco, quandoIlBancoDice } from "app/canale3d.js";
import { storiaDi } from "app/stato.js";
import { NEGOZIO, waNegozio, mappeNegozio } from "app/dati/negozio.js";
import { telaioAstuccio } from "app/tre/telaio.js";

/* ── IL FOGLIO DI STILE SE LO PORTA LA VISTA ───────────────────────
   Col timbro di versione del modulo, come fanno vetrina.js e perte.js:
   un CSS senza `?v=` è un CSS che Safari serve vecchio a un JS nuovo. */
(function vestiti(){
  if(document.getElementById("css-azioni")) return;
  const u = new URL("azioni.css", import.meta.url);
  u.search = new URL(import.meta.url).search;
  const l = document.createElement("link");
  l.id = "css-azioni"; l.rel = "stylesheet"; l.href = u.href;
  document.head.append(l);
})();

/* L'INDIRIZZO COM'ERA AL PRIMO ISTANTE: `avviaRotta()` lo riscrive di lì
   a poco, e `#/c/<codice>` non è un tab che il navigatore sappia
   riconoscere. Va letto ADESSO. */
const INDIRIZZO_0 = location.hash;

/* ═══════════════════════════════════════════════════════════════════
   IL QR, SCRITTO IN CASA
   Byte mode, livello M, versioni 1-10: il nostro contenuto è un URL da
   una cinquantina di caratteri e sta in versione 4. Non è una libreria:
   è il minimo che serve. Il motore è quello di
   `studio/prova3d/_F3_qr_prova.mjs`, già collaudato due volte — matrice
   per matrice contro l'encoder di riferimento Python `qrcode`, e con la
   decodifica vera del PNG in OpenCV. Un quadrato che «ha l'aria» di un
   QR lo si scopre la prima volta che qualcuno lo inquadra al banco, e a
   quel punto il regalo è già in mano all'altra persona.
   ═══════════════════════════════════════════════════════════════════ */
const EXP = new Uint8Array(512), LOG = new Uint8Array(256);
(() => { let x = 1;
  for(let i = 0; i < 255; i++){ EXP[i] = x; LOG[x] = i;
    x <<= 1; if(x & 0x100) x ^= 0x11D; }
  for(let i = 255; i < 512; i++) EXP[i] = EXP[i - 255]; })();
const mulGF = (a, b) => (a && b) ? EXP[LOG[a] + LOG[b]] : 0;

function genPoly(n){
  let g = [1];
  for(let i = 0; i < n; i++){
    const nu = new Array(g.length + 1).fill(0);
    for(let j = 0; j < g.length; j++){ nu[j] ^= mulGF(g[j], EXP[i]); nu[j + 1] ^= g[j]; }
    g = nu;
  }
  /* il prodotto esce col termine noto in testa; il resto del calcolo
     vuole il coefficiente di grado massimo per primo. Senza questa riga
     l'ECC è plausibile e sbagliato: i dati si leggono, la correzione
     no (misurato: 36 codeword su 36 diverse dal riferimento). */
  return g.reverse();
}
function eccQR(dati, n){
  const g = genPoly(n), r = new Array(n).fill(0);
  for(const d of dati){
    const f = d ^ r[0];
    r.shift(); r.push(0);
    if(f) for(let i = 0; i < n; i++) r[i] ^= mulGF(g[i + 1], f);
  }
  return r;
}
/* livello M, versioni 1-10: [ec per blocco, [blocchi g1, dati], [g2, dati]] */
const TAB_M = {
  1:[10,[1,16]],      2:[16,[1,28]],        3:[26,[1,44]],
  4:[18,[2,32]],      5:[24,[2,43]],        6:[16,[4,27]],
  7:[18,[4,31]],      8:[22,[2,38],[2,39]], 9:[22,[3,36],[2,37]],
  10:[26,[4,43],[1,44]]
};
const ALLIN = {1:[], 2:[6,18], 3:[6,22], 4:[6,26], 5:[6,30], 6:[6,34],
  7:[6,22,38], 8:[6,24,42], 9:[6,26,46], 10:[6,28,50]};
const capacita = v => TAB_M[v].slice(1).reduce((s, g) => s + g[0] * g[1], 0);

function codewords(byte, v){
  const tot = capacita(v), bit = [];
  const push = (val, n) => { for(let i = n - 1; i >= 0; i--) bit.push((val >> i) & 1); };
  push(4, 4);
  push(byte.length, v <= 9 ? 8 : 16);
  for(const b of byte) push(b, 8);
  for(let i = 0; i < 4 && bit.length < tot * 8; i++) bit.push(0);
  while(bit.length % 8) bit.push(0);
  const cw = [];
  for(let i = 0; i < bit.length; i += 8)
    cw.push(bit.slice(i, i + 8).reduce((a, b) => (a << 1) | b, 0));
  const tappo = [0xEC, 0x11];
  for(let i = 0; cw.length < tot; i++) cw.push(tappo[i % 2]);
  return cw;
}
function interleava(cw, v){
  const t = TAB_M[v], nEc = t[0], blocchi = [];
  let p = 0;
  for(const g of t.slice(1))
    for(let i = 0; i < g[0]; i++){ blocchi.push(cw.slice(p, p + g[1])); p += g[1]; }
  const eccs = blocchi.map(b => eccQR(b, nEc));
  const out = [];
  const maxD = Math.max.apply(null, blocchi.map(b => b.length));
  for(let i = 0; i < maxD; i++) for(const b of blocchi) if(i < b.length) out.push(b[i]);
  for(let i = 0; i < nEc; i++) for(const x of eccs) out.push(x[i]);
  return out;
}
function telaio(v){
  const n = v * 4 + 17, m = [], ris = [];
  for(let i = 0; i < n; i++){ m.push(new Array(n).fill(0)); ris.push(new Array(n).fill(0)); }
  const metti = (r, c, val) => { m[r][c] = val; ris[r][c] = 1; };
  const cercatore = (R, C) => {
    for(let r = -1; r <= 7; r++) for(let c = -1; c <= 7; c++){
      const rr = R + r, cc = C + c;
      if(rr < 0 || cc < 0 || rr >= n || cc >= n) continue;
      const dentro = r >= 0 && r <= 6 && c >= 0 && c <= 6;
      const anello = dentro && (r === 0 || r === 6 || c === 0 || c === 6);
      const cuore = dentro && r >= 2 && r <= 4 && c >= 2 && c <= 4;
      metti(rr, cc, (anello || cuore) ? 1 : 0);
    }
  };
  cercatore(0, 0); cercatore(0, n - 7); cercatore(n - 7, 0);
  for(let i = 8; i < n - 8; i++){ metti(6, i, i % 2 === 0 ? 1 : 0);
                                 metti(i, 6, i % 2 === 0 ? 1 : 0); }
  const A = ALLIN[v], ult = A.length ? A[A.length - 1] : 0;
  for(const r of A) for(const c of A){
    if((r === 6 && c === 6) || (r === 6 && c === ult) || (r === ult && c === 6)) continue;
    for(let dr = -2; dr <= 2; dr++) for(let dc = -2; dc <= 2; dc++)
      metti(r + dr, c + dc, (Math.max(Math.abs(dr), Math.abs(dc)) !== 1) ? 1 : 0);
  }
  metti(n - 8, 8, 1);
  for(let i = 0; i < 9; i++){
    if(!ris[8][i]){ ris[8][i] = 1; m[8][i] = 0; }
    if(!ris[i][8]){ ris[i][8] = 1; m[i][8] = 0; }
  }
  for(let i = 0; i < 8; i++){
    if(!ris[8][n - 1 - i]){ ris[8][n - 1 - i] = 1; m[8][n - 1 - i] = 0; }
    if(!ris[n - 1 - i][8]){ ris[n - 1 - i][8] = 1; m[n - 1 - i][8] = 0; }
  }
  if(v >= 7) for(let i = 0; i < 18; i++){
    const r = Math.floor(i / 3), c = i % 3;
    ris[r][n - 11 + c] = 1; m[r][n - 11 + c] = 0;
    ris[n - 11 + c][r] = 1; m[n - 11 + c][r] = 0;
  }
  return {m, ris, n};
}
function posa(t, dati){
  const m = t.m, ris = t.ris, n = t.n, bit = [];
  for(const c of dati) for(let i = 7; i >= 0; i--) bit.push((c >> i) & 1);
  let p = 0, su = true;
  for(let col = n - 1; col > 0; col -= 2){
    if(col === 6) col--;
    for(let i = 0; i < n; i++){
      const r = su ? n - 1 - i : i;
      for(let d = 0; d < 2; d++){
        const c = col - d;
        if(ris[r][c]) continue;
        m[r][c] = p < bit.length ? bit[p] : 0;
        p++;
      }
    }
    su = !su;
  }
}
const MASCHERA = [
  (r, c) => (r + c) % 2 === 0,
  (r) => r % 2 === 0,
  (r, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
  (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0
];
function penalita(m, n){
  let p = 0;
  for(let k = 0; k < 2; k++)
    for(let i = 0; i < n; i++){
      let run = 1;
      for(let j = 1; j < n; j++){
        const a = k ? m[j - 1][i] : m[i][j - 1], b = k ? m[j][i] : m[i][j];
        if(a === b) run++; else { if(run >= 5) p += 3 + (run - 5); run = 1; }
      }
      if(run >= 5) p += 3 + (run - 5);
    }
  for(let r = 0; r < n - 1; r++) for(let c = 0; c < n - 1; c++){
    const v = m[r][c];
    if(v === m[r][c + 1] && v === m[r + 1][c] && v === m[r + 1][c + 1]) p += 3;
  }
  const A = [1,0,1,1,1,0,1,0,0,0,0], B = [0,0,0,0,1,0,1,1,1,0,1];
  const guarda = (get) => {
    for(let i = 0; i + 11 <= n; i++){
      let a = true, b = true;
      for(let j = 0; j < 11; j++){ const v = get(i + j);
        if(v !== A[j]) a = false;
        if(v !== B[j]) b = false; }
      if(a) p += 40;
      if(b) p += 40;
    }
  };
  for(let i = 0; i < n; i++){ guarda(j => m[i][j]); guarda(j => m[j][i]); }
  let scuri = 0;
  for(let r = 0; r < n; r++) for(let c = 0; c < n; c++) scuri += m[r][c];
  p += Math.floor(Math.abs(scuri * 100 / (n * n) - 50) / 5) * 10;
  return p;
}
function formatoBit(mask){
  const d = mask;                       /* livello M = 00, poi 3 bit di maschera */
  let v = d << 10;
  for(let i = 4; i >= 0; i--) if(v & (1 << (i + 10))) v ^= 0x537 << i;
  return ((d << 10) | v) ^ 0x5412;
}
function versioneBit(v){
  let r = v << 12;
  for(let i = 5; i >= 0; i--) if(r & (1 << (i + 12))) r ^= 0x1F25 << i;
  return (v << 12) | r;
}
export function matriceQR(testo){
  const byte = Array.from(new TextEncoder().encode(testo));
  let v = 0;
  for(let i = 1; i <= 10; i++){
    const intestazione = 2 + (i <= 9 ? 1 : 2);
    if(byte.length + intestazione <= capacita(i)){ v = i; break; }
  }
  if(!v) throw new Error("testo troppo lungo per il QR: " + byte.length);
  const dati = interleava(codewords(byte, v), v);
  const t = telaio(v);
  posa(t, dati);
  const n = t.n;
  let scelta = null;
  for(let k = 0; k < 8; k++){
    const m = t.m.map(r => r.slice());
    for(let r = 0; r < n; r++) for(let c = 0; c < n; c++)
      if(!t.ris[r][c] && MASCHERA[k](r, c)) m[r][c] ^= 1;
    const f = formatoBit(k);
    /* riga = y, colonna = x: la prima copia SCENDE lungo la colonna 8 e
       poi CORRE lungo la riga 8. Scritta al contrario, il QR resta
       leggibile a occhio e illeggibile a macchina — il lettore trova un
       livello di correzione che non è quello con cui i dati sono stati
       protetti. */
    const bitF = i => (f >> i) & 1;
    for(let i = 0; i <= 5; i++) m[i][8] = bitF(i);
    m[7][8] = bitF(6); m[8][8] = bitF(7); m[8][7] = bitF(8);
    for(let i = 9; i <= 14; i++) m[8][14 - i] = bitF(i);
    for(let i = 0; i <= 7; i++) m[8][n - 1 - i] = bitF(i);
    for(let i = 8; i <= 14; i++) m[n - 15 + i][8] = bitF(i);
    m[n - 8][8] = 1;
    if(v >= 7){
      const vb = versioneBit(v);
      for(let i = 0; i < 18; i++){
        const b = (vb >> i) & 1;
        m[Math.floor(i / 3)][n - 11 + (i % 3)] = b;
        m[n - 11 + (i % 3)][Math.floor(i / 3)] = b;
      }
    }
    const p = penalita(m, n);
    if(!scelta || p < scelta.p) scelta = {p, m, k};
  }
  return {m: scelta.m, n, v, maschera: scelta.k};
}

/* il QR come SVG: un `<path>` solo, moduli uniti per righe. Un rettangolo
   per modulo sono 1.089 nodi per una versione 4, e a schermo si sente. */
export function svgQR(testo, opz = {}){
  const q = matriceQR(testo), m = q.m, n = q.n;
  const z = opz.quiet == null ? 4 : opz.quiet;
  const lato = n + z * 2;
  let d = "";
  for(let r = 0; r < n; r++){
    let c = 0;
    while(c < n){
      if(!m[r][c]){ c++; continue; }
      let w = 1;
      while(c + w < n && m[r][c + w]) w++;
      d += "M" + (c + z) + " " + (r + z) + "h" + w + "v1h-" + w + "z";
      c += w;
    }
  }
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 " + lato + " " + lato);
  svg.setAttribute("shape-rendering", "crispEdges");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  const fondo = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  fondo.setAttribute("width", String(lato));
  fondo.setAttribute("height", String(lato));
  fondo.setAttribute("fill", opz.chiaro || "#F2ECE1");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("fill", opz.scuro || "#14110E");
  path.setAttribute("d", d);
  svg.append(fondo, path);
  return svg;
}

/* ═══════════════════════════════════════════════════════════════════
   IL TEMPO, DETTO COME LO DICE UNA PERSONA
   ═══════════════════════════════════════════════════════════════════ */
const MESI = ["gennaio","febbraio","marzo","aprile","maggio","giugno",
  "luglio","agosto","settembre","ottobre","novembre","dicembre"];
const due = (n) => String(n).padStart(2, "0");
const isoDi = (d) => d.getFullYear() + "-" + due(d.getMonth()+1) + "-" + due(d.getDate());
const daIso = (s) => { const p = String(s || "").split("-");
  return p.length === 3 ? new Date(+p[0], +p[1]-1, +p[2]) : null; };
const dettoLungo = (iso) => { const d = daIso(iso);
  return d ? d.getDate() + " " + MESI[d.getMonth()] + " " + d.getFullYear() : ""; };
const piuGiorni = (d, n) => { const x = new Date(d.getTime()); x.setDate(x.getDate()+n); return x; };

/* ═══════════════════════════════════════════════════════════════════
   IL MONTAGGIO
   ═══════════════════════════════════════════════════════════════════ */
export function monta(store){
  const {leggi, invia, iscrivi} = store;
  const seme = store.seme || {};
  const catalogo = store.catalogo || [];
  const perArticolo = new Map(catalogo.map(a => [a.id, a]));

  /* IL GIORNO DELLA DEMO, non l'orologio del computer che la guarda.
     `innesto.js` porta `seme.oggi` da F3b in poi; chi non ce l'ha legge
     l'orologio vero e la demo invecchia da sola. */
  const oggi = () => {
    const d = seme.oggi ? daIso(seme.oggi) : null;
    if(d) return d;
    const x = new Date(); x.setHours(0,0,0,0); return x;
  };
  const adesso = () => {
    /* l'ORA vera dentro il GIORNO della demo: la storia vuole una data,
       il registro vuole un istante, e se il giorno è finto l'istante
       deve stare dentro quel giorno o le righe escono fuori ordine. */
    if(!seme.oggi) return new Date().toISOString();
    const ora = new Date(), d = daIso(seme.oggi);
    d.setHours(ora.getHours(), ora.getMinutes(), ora.getSeconds());
    return new Date(d.getTime() - d.getTimezoneOffset()*60000).toISOString();
  };

  const esemplareDi = (id) => (leggi().esemplari || []).find(x => (x.id || x.codice) === id) || null;
  const articoloDi = (es) => (es && perArticolo.get(es.articolo)) || null;
  const nomeDi = (es) => (es && (es.nome || (articoloDi(es) || {}).nome)) || "";
  const materiaDi = (es) => (es && (es.materia || (articoloDi(es) || {}).materia)) || "";
  const fotoDi = (es) => {
    if(!es) return null;
    if(Array.isArray(es.scatti) && es.scatti.length && es.scatti[0].src) return es.scatti[0].src;
    if(typeof es.foto === "string" && es.foto) return es.foto;
    const a = articoloDi(es);
    return (a && a.foto) || null;
  };
  /* la dedica VERA: quella scritta dall'app vince su quella del seme —
     è la più recente, e l'unica che la persona ha potuto correggere. */
  const dedicaDi = (id) => {
    const d = (leggi().dediche || {})[id];
    if(d) return d.testo;
    const es = esemplareDi(id);
    return (es && es.dedica) || "";
  };
  const dedicaBloccata = (id) => {
    const d = (leggi().dediche || {})[id];
    return !!(d && d.bloccata);
  };
  /* UN PEZZO RICEVUTO IN REGALO NON SI RIGIRA. La regola etica, e si
     applica a quello che arriva dal seme (`regalo:true` con un `da`) e a
     quello aperto qui (`stato:"ricevuto"`). Chi non può regalare non
     vede il comando: si omette, non si nega in grigio. */
  const puoRegalare = (es) => !!es && es.stato !== "ricevuto" &&
    es.stato !== "in_attesa" && !(es.regalo && es.da);

  const nomeCliente = () => {
    const c = leggi().cliente || {};
    return c.nome_incisione || c.nome || "";
  };

  /* ── IL LINK PUBBLICO DELLA CARTA ────────────────────────────────
     Assoluto, perché finisce in un messaggio: un `#/c/…` da solo non è
     un indirizzo, è un frammento. */
  const linkDi = (codice) =>
    location.origin + location.pathname + "#/c/" + encodeURIComponent(codice);

  /* ══ IL RETRO DELLA CARTA, VERSO IL BANCO ════════════════════════
     Il banco disegna; i dati glieli manda la scocca, perché qui c'è
     lo store e lì no. */
  let ultimoId = null;          /* l'ultima carta di cui il banco ha parlato */
  let cartaAperta = null;       /* la carta che il banco sta MOSTRANDO adesso */
  let ultimoDati = null;        /* per le sonde */
  let ultimoWa = null;          /* l'ultimo wa.me costruito, per le sonde */

  function datiDi(id){
    const es = esemplareDi(id);
    if(!es) return null;
    const s = leggi();
    /* SI PARTE DALL'ESEMPLARE INTERO e non da un estratto: il contratto
       del canale dice che il banco legge `codice, fam, k, quando |
       data_vendita, dove, da, dedica, regalo, stato, per, regalato_a,
       misura`, e un estratto scritto a mano è un elenco che va
       aggiornato ogni volta che il banco impara a leggere un campo in
       più. Quello che NON deve viaggiare si toglie dopo, e si toglie in
       modo che si veda: il PREZZO. Nessuno dei cinque passaporti
       verificati lo mostra, e questo è un certificato — per giunta di
       un pezzo che potrebbe essere un regalo. */
    const {prezzo, prezzo_vendita, ...pulito} = es;   /* eslint-disable-line no-unused-vars */
    return {
      ...pulito,
      id,
      codice: es.codice || id,
      nome: nomeDi(es),
      materia: materiaDi(es),
      foto: fotoDi(es),
      dedica: dedicaDi(id),
      dedica_bloccata: dedicaBloccata(id),
      stato: es.stato || null,
      per: es.per || null,
      /* il banco chiama `regalato_a` quello che qui si chiama `per`:
         viaggiano tutt'e due, così nessuno dei due deve tradurre. */
      regalato_a: es.per || null,
      da: es.da || null,
      quando: es.quando || es.data_vendita || null,
      data_vendita: es.data_vendita || null,
      dove: es.dove || (NEGOZIO.nome + ", " + NEGOZIO.citta),
      cura: (articoloDi(es) || {}).cura || null,
      link: linkDi(es.codice || id),
      /* `{quando, fatto}` è la forma che il banco si aspetta; `testo` è
         come la chiama `storiaDi`. Si manda il campo con tutt'e due i
         nomi invece di rinominarlo: chi legge l'uno o l'altro trova
         quello che cerca, e nessuna carta resta senza storia per una
         lettera. */
      storia: storiaDi(es, s).map(r => ({quando:r.quando, fatto:r.testo, testo:r.testo})),
      /* quali voci del nastro hanno senso su QUESTA carta. «Regala» su un
         pezzo ricevuto non si disabilita: si omette. */
      azioni: {
        dedica: !dedicaBloccata(id),
        regala: puoRegalare(es),
        assistenza: true,
        condividi: true
      },
      negozio: {
        nome: NEGOZIO.nome, via: NEGOZIO.via, citta: NEGOZIO.citta,
        telefono: NEGOZIO.telefono, telefono_detto: NEGOZIO.telefono_detto,
        whatsapp: NEGOZIO.whatsapp
      }
    };
  }
  function mandaDati(id){
    if(!id) return null;
    const d = datiDi(id);
    if(!d) return null;
    ultimoDati = d;
    diAlBanco("esemplare/dati", {id, esemplare: d});
    return d;
  }

  /* ══════════════════════════════════════════════════════════════════
     I PEZZI DI DISEGNO CONDIVISI
     ══════════════════════════════════════════════════════════════════ */

  /* IL PEZZO IN TESTA AL FOGLIO — foto 56 + nome 17 + materia 13.
     Nessun campo da compilare per dire QUALE pezzo: si vede. */
  function testaPezzo(es){
    const src = fotoDi(es);
    const fig = src
      ? e("img", {class:"az-fig", src, alt:"", decoding:"async"})
      : e("div", {class:"az-fig redatto"}, [e("span", {testo:nomeDi(es)})]);
    return e("div", {class:"az-testa"}, [
      fig,
      e("div", {class:"az-testa-testi"}, [
        e("b", {class:"t-body", testo:nomeDi(es)}),
        e("span", {class:"t-foot tenue", testo:materiaDi(es)})
      ])
    ]);
  }

  /* IL SEGMENTED a due o tre voci, 32 di altezza dentro una riga da 44
     (`.seg`, lo scavalco di bersaglio del sistema). */
  function segmentato(voci, scelta, suScelta, etichetta){
    const riga = e("div", {class:"seg az-seg", role:"radiogroup",
      "aria-label":etichetta || ""});
    const bottoni = voci.map(v => {
      const b = e("button", {type:"button", class:"chip az-chip",
        role:"radio", "aria-checked":String(v.id === scelta),
        suClick: () => {
          for(const x of bottoni){ x.classList.remove("acceso");
                                   x.setAttribute("aria-checked", "false"); }
          b.classList.add("acceso"); b.setAttribute("aria-checked", "true");
          suScelta(v.id);
        }}, [e("span", {testo:v.testo})]);
      if(v.id === scelta) b.classList.add("acceso");
      return b;
    });
    for(const b of bottoni) riga.append(b);
    return riga;
  }

  /* IL FONDO CHE SALE SOPRA LA TASTIERA.
     Su iPhone la tastiera copre il basso dello schermo e il tasto
     primario ci finisce sotto: `visualViewport` dice quanto ne resta
     scoperto, e il fondo si alza di quella differenza. Si alza il FONDO
     e non il foglio intero: il foglio ha un `transform` suo, che è il
     trascinamento del dito, e due trasformazioni sullo stesso nodo si
     annullano a vicenda nel momento peggiore. */
  function fondoTastiera(dentro){
    const vv = window.visualViewport;
    if(!vv) return () => {};
    const segui = () => {
      const coperto = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      dentro.style.transform = coperto > 40 ? "translateY(-" + Math.round(coperto) + "px)" : "";
      dentro.dataset.alzato = coperto > 40 ? "1" : "";
    };
    vv.addEventListener("resize", segui);
    vv.addEventListener("scroll", segui);
    segui();
    return () => { vv.removeEventListener("resize", segui);
                   vv.removeEventListener("scroll", segui); };
  }

  /* IL TASTO CHE DIVENTA LO STATO (49 §3): stessa cella, stessa
     larghezza, crossfade 300 in entrata e 250 in uscita, e il colore
     passa da primario a piano col filo. L'etichetta di stato porta un
     dato al passato, mai una spunta e mai «Fatto». */
  function diventaStato(btn, testo){
    vestiTasto(btn, testo);
    btn.classList.remove("primario"); btn.classList.add("secondario", "az-fatto");
    btn.setAttribute("aria-pressed", "true");
    btn.disabled = true;
    if(!RIDOTTO.matches)
      btn.animate([{opacity:.35},{opacity:1}],
        {duration:300, easing:"cubic-bezier(.2,.8,.2,1)"});
  }

  /* ══════════════════════════════════════════════════════════════════
     3.2 · LA DEDICA — un'incisione, non una chat
     ══════════════════════════════════════════════════════════════════ */
  const MAX_DEDICA = 60;

  function foglioDedica(id){
    const es = esemplareDi(id);
    if(!es) return;
    if(dedicaBloccata(id)){
      toast("Questa dedica è già incisa.", {durata:3000});
      annuncia("La dedica non si può più cambiare: il regalo è stato aperto.");
      return;
    }
    let testo = dedicaDi(id) || "";

    /* L'ANTEPRIMA VIVA, come Pandora mostra il pezzo finito prima del
       carrello: una tesserina col retro della carta, la dedica in Bodoni
       corsivo 22 e la firma di chi la scrive in Inter 13. */
    const riga = e("p", {class:"az-ded-testo", testo});
    const firma = e("span", {class:"t-foot tenue az-ded-firma",
      testo: nomeCliente() ? "— " + nomeCliente() : ""});
    const tessera = e("div", {class:"az-ded-tessera"}, [riga, firma]);

    const contatore = e("span", {class:"t-cap2 tenue az-ded-conta",
      testo: testo.length + "/" + MAX_DEDICA});

    const campo = e("textarea", {class:"campo az-ded-campo", id:"az-ded-campo",
      rows:2, maxLength:MAX_DEDICA, value:testo,
      enterKeyHint:"done", autocapitalize:"sentences",
      "aria-describedby":"az-ded-conta az-ded-nota"});
    contatore.id = "az-ded-conta";

    const salva = tasto("Salva", {tipo:"primario", largo:true,
      suClick: () => conferma()});
    salva.disabled = !testo.trim();

    function aggiorna(){
      /* IL LIMITE SI TAGLIA QUI, non solo in `maxlength`: un incollato
         lungo passa oltre l'attributo su più di un browser, e sessanta
         caratteri è una regola dell'incisione, non del campo.
         NIENTE EMOJI, filtrate senza dire niente (46 §3.2): un messaggio
         d'errore per un'emoji è una lezione, e qui nessuno sta
         sbagliando. */
      let v = String(campo.value || "")
        .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, "");
      if(v.length > MAX_DEDICA) v = v.slice(0, MAX_DEDICA);
      if(v !== campo.value) campo.value = v;
      testo = v;
      riga.textContent = v;
      contatore.textContent = v.length + "/" + MAX_DEDICA;
      contatore.classList.toggle("az-limite", v.length >= MAX_DEDICA);
      salva.disabled = !v.trim();
    }
    campo.addEventListener("input", aggiorna);

    function conferma(){
      const v = testo.trim();
      if(!v) return;
      invia("dedica/scrivi", {id, testo:v, quando:adesso()});
      /* GRADO PICCOLO (49 §7.9): il testo si POSA in corsivo — 250 di
         dissolvenza e sei punti che si fermano — e non «appare». */
      if(!RIDOTTO.matches)
        riga.animate([{opacity:0, transform:"translateY(6px)"},
                      {opacity:1, transform:"none"}],
          {duration:250, easing:"cubic-bezier(.2,.8,.2,1)"});
      const fuori = !cartaAschermo(id);
      chiudiFoglio();
      /* IL TOAST SOLO SE LA CARTA NON È A SCHERMO. Se la carta si vede,
         lo stato è già lì e un toast sarebbe l'eco di una cosa che si
         sta guardando. */
      if(fuori) toast("Salvata", {durata:2500});
      annuncia("Dedica salvata.");
    }

    const dlg = apriFoglio({
      titolo:"La dedica", fermo:"basso",
      contenuto: e("div", {class:"az-foglio az-dedica"}, [
        e("p", {class:"t-foot tenue az-riga", id:"az-ded-nota",
          testo:"Una dedica si scrive una volta."}),
        tessera,
        e("div", {class:"az-campo-riga"}, [campo, contatore]),
        e("p", {class:"t-foot tenue az-riga",
          testo:"Puoi cambiarla finché non lo apre."}),
        e("div", {class:"az-fondo az-fondo-tastiera"}, [salva])
      ])
    });
    dlg.dataset.vista = "azioni";
    const stacca = fondoTastiera(dlg.querySelector(".az-fondo-tastiera"));
    dlg.addEventListener("close", stacca, {once:true});
    aggiorna();
    setTimeout(() => { try{ campo.focus(); }catch(_){ /* niente */ } }, 320);
  }

  /* ══════════════════════════════════════════════════════════════════
     3.3 · REGALA — due vie, uno stato solo
     ══════════════════════════════════════════════════════════════════ */
  function foglioRegala(id){
    const es = esemplareDi(id);
    if(!es) return;
    if(!puoRegalare(es)){
      /* non si nega: si dice cos'e' vero. */
      toast(es.stato === "in_attesa"
        ? "E’ già in attesa."
        : "Un regalo si tiene.", {durata:3000});
      return;
    }
    const codice = es.codice || id;
    const link = linkDi(codice);
    let via = "persona";

    /* IL NOME STA IN TESTA, non dentro «A distanza» (46 S3.3.2): serve a
       tutt'e due le vie, perché è il nome che finisce sul badge «In
       attesa — per Anna» anche quando il codice si fa inquadrare a
       tavola. Solo il nome di battesimo: va sulla carta, e sulla carta
       non ci va il cognome di nessuno. */
    const campoA = e("input", {class:"campo", type:"text", id:"az-reg-a",
      placeholder:"Anna", autocomplete:"off", autocapitalize:"words",
      enterKeyHint:"done", maxLength:24});

    const corpoVia = e("div", {class:"az-via"});
    const fondo = e("div", {class:"az-fondo az-fondo-tastiera"});

    /* IL SIGILLO CHE SI CHIUDE — grado medio, 600 ms (49 §7.3):
       un disco da 28 parte da −8 e scala 1,1, si posa in 300 con la
       molla (la cera che si schiaccia), la «R» dissolve a 300 in 150, e
       da 250 la carta passa a 0,72 in 250. */
    function sigillo(suCosa){
      const r = e("span", {class:"az-sigillo-r", testo:"R"});
      const disco = e("span", {class:"az-sigillo", "aria-hidden":"true"}, [r]);
      suCosa.append(disco);
      if(RIDOTTO.matches){
        disco.style.opacity = "1"; r.style.opacity = "1";
        suCosa.style.opacity = ".72";
        return Promise.resolve();
      }
      disco.animate([{opacity:0, transform:"translateY(-8px) scale(1.1)"},
                     {opacity:1, transform:"none"}],
        {duration:300, easing:"cubic-bezier(.22,1,.36,1)", fill:"both"});
      r.animate([{opacity:0},{opacity:1}],
        {duration:150, delay:300, easing:"cubic-bezier(.2,.8,.2,1)", fill:"both"});
      suCosa.animate([{opacity:1},{opacity:.72}],
        {duration:250, delay:250, easing:"cubic-bezier(.2,.8,.2,1)", fill:"both"});
      return new Promise(r2 => setTimeout(r2, 600));
    }

    const testa = testaPezzo(es);

    async function parte(canale){
      const nome = (campoA.value || "").trim();
      invia("regalo/invia", {id, canale, a: nome || null, quando: adesso()});
      await sigillo(testa);
      chiudiFoglio();
      toast("Il codice è partito", {durata:3000});
      annuncia(nome ? "Regalo in attesa, per " + nome + "." : "Regalo in attesa.");
      mandaDati(id);
    }

    function disegnaVia(){
      corpoVia.textContent = "";
      fondo.textContent = "";
      if(via === "persona"){
        const q = e("div", {class:"az-qr", role:"img",
          "aria-label":"Codice da inquadrare per " + nomeDi(es)});
        q.append(svgQR(link, {quiet:4}));
        corpoVia.append(q);
        corpoVia.append(e("p", {class:"t-sub az-riga az-centro",
          testo:"Lo inquadra dal suo telefono."}));
        corpoVia.append(e("p", {class:"t-foot tenue az-riga az-centro",
          testo:"Il pezzo resta tuo finché non lo apre."}));
        fondo.append(tasto("Gliel’ho fatto inquadrare",
          {tipo:"primario", largo:true, suClick: () => parte("qr")}));
      } else {
        const manda = e("a", {class:"tasto primario largo az-wa",
          href: waTesto(), target:"_blank", rel:"noopener", "data-vivo":"1",
          "aria-label":"Manda il codice su WhatsApp"},
          [e("span", {testo:"Manda su WhatsApp"})]);
        manda.addEventListener("click", () => { parte("link"); });
        corpoVia.append(e("p", {class:"t-foot tenue az-riga",
          testo:"Il pezzo resta tuo finché non lo apre."}));
        fondo.append(manda);
        fondo.append(tasto("Copia il link", {tipo:"terziario", largo:true,
          suClick: async (ev) => {
            const b = ev.currentTarget;
            /* SOLO L'URL negli appunti: se si passa anche il testo, iOS
               copia il testo e non il link (Keith 2020). */
            try{ await navigator.clipboard.writeText(link); }
            catch(_){ /* niente appunti: il QR resta la via */ }
            vestiTasto(b, "Copiato");
            setTimeout(() => vestiTasto(b, "Copia il link"), 2000);
          }}));
        campoA.addEventListener("input", () => { manda.href = waTesto(); });
      }
    }
    function waTesto(){
      const nome = (campoA.value || "").trim();
      const chi = nomeCliente() || "Qualcuno";
      const testo = chi + " ti regala " + nomeDi(es) +
        " — apri il tuo cofanetto: " + link;
      return "https://wa.me/?text=" + encodeURIComponent(testo);
    }

    const dlg = apriFoglio({
      titolo:"Regala", fermo:"alto",
      contenuto: e("div", {class:"az-foglio az-regala"}, [
        testa,
        e("label", {class:"t-cap2 occhiello az-eti", for:"az-reg-a",
          testo:"PER CHI È"}),
        campoA,
        segmentato([{id:"persona", testo:"Di persona"},
                    {id:"distanza", testo:"A distanza"}], via,
          (v) => { via = v; disegnaVia(); }, "Come glielo dai"),
        corpoVia,
        fondo
      ])
    });
    dlg.dataset.vista = "azioni";
    const stacca = fondoTastiera(fondo);
    dlg.addEventListener("close", stacca, {once:true});
    disegnaVia();
  }

  /* ══════════════════════════════════════════════════════════════════
     3.4 · ASSISTENZA — quattro richieste, un negozio, una persona
     ══════════════════════════════════════════════════════════════════ */
  const MOTIVI = ["Riparazione", "Pulizia", "Misura", "Altro"];

  function foglioAssistenza(id){
    const es = esemplareDi(id);
    if(!es) return;
    let motivo = null, quandoScelto = "oggi", fascia = "mattina";
    let giornoIso = isoDi(oggi());

    const manda = tasto("Manda la richiesta", {tipo:"primario", largo:true,
      suClick: () => conferma()});
    manda.disabled = true;

    const righe = MOTIVI.map(m => {
      const spunta = segno("spunta", {misura:20, classe:"az-spunta"});
      const b = e("button", {type:"button", class:"az-riga-scelta",
        role:"radio", "aria-checked":"false",
        suClick: () => {
          motivo = m;
          for(const x of righe){ x.classList.remove("az-scelta");
                                 x.setAttribute("aria-checked", "false"); }
          b.classList.add("az-scelta"); b.setAttribute("aria-checked", "true");
          manda.disabled = false;
        }}, [e("span", {class:"t-body", testo:m}), spunta]);
      return b;
    });

    const dataCampo = e("input", {class:"campo az-data", type:"date",
      value:giornoIso, min:isoDi(oggi()),
      "aria-label":"Il giorno in cui passi"});
    dataCampo.hidden = true;
    dataCampo.addEventListener("input", () => {
      if(dataCampo.value) giornoIso = dataCampo.value;
    });

    function quandoDetto(){
      if(quandoScelto === "oggi") return "oggi";
      if(quandoScelto === "domani") return "domani";
      return dettoLungo(giornoIso) || "un altro giorno";
    }

    function conferma(){
      if(!motivo) return;
      const iso = quandoScelto === "oggi" ? isoDi(oggi())
                : quandoScelto === "domani" ? isoDi(piuGiorni(oggi(), 1))
                : giornoIso;
      invia("assistenza/richiesta",
        {id, motivo, giorno:iso, fascia, quando:adesso()});
      /* GRADO MEDIO, di servizio e non di festa (49 §7.10): il tasto
         diventa lo stato, il toast dice il PROSSIMO PASSO, e non c'è
         nessun numero di ticket — la conferma la da' una persona. */
      diventaStato(manda, "Richiesta inviata");
      toast("Al banco: ti confermano su WhatsApp", {durata:3000});
      annuncia("Richiesta inviata: " + motivo + ", " + quandoDetto() + " " + fascia + ".");
      mandaDati(id);
      const testo = "Assistenza per " + nomeDi(es) + " (" + (es.codice || id) + "): " +
        motivo.toLowerCase() + ", " + quandoDetto() + " " + fascia + ".";
      const url = waNegozio(testo);
      ultimoWa = url;
      try{ window.open(url, "_blank", "noopener"); }catch(_){ /* bloccato */ }
      setTimeout(chiudiFoglio, 900);
    }

    const dlg = apriFoglio({
      titolo:"Assistenza", fermo:"alto",
      contenuto: e("div", {class:"az-foglio az-assistenza"}, [
        testaPezzo(es),
        e("div", {class:"az-scelte", role:"radiogroup",
          "aria-label":"Di cosa ha bisogno"}, righe),
        e("p", {class:"t-foot tenue az-riga",
          testo:"La pulizia è gratis, anche senza appuntamento."}),
        e("span", {class:"t-cap2 occhiello az-eti", testo:"QUANDO PASSI?"}),
        segmentato([{id:"oggi", testo:"Oggi"},
                    {id:"domani", testo:"Domani"},
                    {id:"altro", testo:"Un altro giorno"}], quandoScelto,
          (v) => { quandoScelto = v; dataCampo.hidden = v !== "altro";
                   if(v === "altro") setTimeout(() => {
                     try{ dataCampo.focus(); }catch(_){ /* niente */ } }, 40); },
          "Quando passi"),
        dataCampo,
        segmentato([{id:"mattina", testo:"Mattina"},
                    {id:"pomeriggio", testo:"Pomeriggio"}], fascia,
          (v) => { fascia = v; }, "La fascia"),
        e("div", {class:"az-fondo"}, [manda])
      ])
    });
    dlg.dataset.vista = "azioni";
  }

  /* ══════════════════════════════════════════════════════════════════
     3.5 · CONDIVIDI — il foglio lo fa iOS, se c'è
     ══════════════════════════════════════════════════════════════════ */
  function condividi(id){
    const es = esemplareDi(id);
    if(!es) return;
    const link = linkDi(es.codice || id);
    const titolo = "Regina";
    const testo = "Il mio " + nomeDi(es) + " da Regina";
    if(navigator.share){
      /* NIENTE `files`: su WhatsApp un file con del testo mostra solo il
         testo, e l'anteprima la fa già l'Open Graph del link. */
      navigator.share({title:titolo, text:testo, url:link}).catch(() => {});
      annuncia("Condividi aperto.");
      return;
    }
    const dlg = apriFoglio({
      titolo:"Condividi", fermo:"basso",
      contenuto: e("div", {class:"az-foglio az-condividi"}, [
        testaPezzo(es),
        e("p", {class:"t-foot tenue az-riga",
          testo:"Chi apre il link vede la scheda del pezzo e dove trovarlo. Non vede il prezzo."}),
        e("div", {class:"az-fondo"}, [
          tasto("Copia", {tipo:"primario", largo:true, suClick: async (ev) => {
            const b = ev.currentTarget;
            try{ await navigator.clipboard.writeText(link); }catch(_){ /* niente */ }
            vestiTasto(b, "Copiato");
            annuncia("Link copiato.");
            setTimeout(() => vestiTasto(b, "Copia"), 2000);
          }}),
          e("a", {class:"tasto secondario largo az-wa",
            href:"https://wa.me/?text=" + encodeURIComponent(testo + " " + link),
            target:"_blank", rel:"noopener", "data-vivo":"1"},
            [e("span", {testo:"WhatsApp"})])
        ])
      ])
    });
    dlg.dataset.vista = "azioni";
  }

  /* ══════════════════════════════════════════════════════════════════
     LA PAGINA PUBBLICA  #/c/<codice>
     Non è un tab: è quello che vede chi ha in mano un link o ha appena
     inquadrato un codice, e può non avere mai aperto l'app. Vive come
     strato sopra tutto, di CARTA (il marchio di Regina è scuro: sul
     velluto sparirebbe, 1,1:1), e senza barra delle sezioni.
     ══════════════════════════════════════════════════════════════════ */
  let strato = null;
  const tempi = {};             /* per la sonda: quando ogni battuta è entrata */
  let regiaCorrente = null;     /* `statoA(t)`: la regia come funzione del tempo */

  let telaioVivo = null;
  function chiudiCarta(){
    if(!strato) return;
    /* IL TELAIO SI SMONTA A MANO. Un contesto grafico non lo raccoglie
       il netturbino della memoria: togliere il nodo dal documento non
       libera niente, e sul telefono il contesto che il browser chiude a
       sorpresa per far posto è sempre quello che serve. */
    if(telaioVivo){ try{ telaioVivo.via(); }catch(_){ /* niente */ } telaioVivo = null; }
    strato.remove(); strato = null;
    delete document.body.dataset.carta;
  }

  function apriCarta(codice){
    if(strato) return;
    const es = (leggi().esemplari || [])
      .find(x => (x.codice || x.id) === codice || (x.id || "") === codice) || null;

    strato = e("div", {class:"az-carta", role:"region", "data-tema":"chiaro",
      "aria-label":"Regina"});
    document.body.append(strato);
    document.body.dataset.carta = "1";

    if(!es){ cartaSconosciuta(); return; }
    if(es.stato === "in_attesa") regiaRegalo(es);
    else cartaVetrina(es);
  }

  /* IL CODICE CHE NON ESISTE — sobria, e con un rimedio umano. Nessun
     alert, nessun rosso: una riga che dice cos'e' successo e una persona
     a cui chiedere. */
  function cartaSconosciuta(){
    const dentro = e("div", {class:"az-carta-dentro"}, [
      e("img", {class:"az-marchio-piccolo", src:"marchio.png",
        alt:"Regina", decoding:"async"}),
      e("h1", {class:"t-1", tabindex:"-1", testo:"Questo codice non è più valido."}),
      e("p", {class:"t-body tenue az-riga",
        testo:"Può essere già stato aperto, oppure non è mai stato di Regina."}),
      e("div", {class:"az-fondo"}, [
        e("a", {class:"tasto primario largo", "data-vivo":"1",
          href: waNegozio("Ciao, ho un codice che non funziona."),
          target:"_blank", rel:"noopener"}, [e("span", {testo:"Scrivi al negozio"})])
      ])
    ]);
    strato.append(dentro);
    try{ dentro.querySelector("h1").focus({preventScroll:true}); }catch(_){ /* niente */ }
    annuncia("Questo codice non è più valido.");
  }

  /* LA SCHEDA, SENZA PREZZO — chi apre il link di un pezzo già di
     qualcuno vede la creazione e dove trovarla, non un negozio. */
  function cartaVetrina(es){
    const src = fotoDi(es);
    const dentro = e("div", {class:"az-carta-dentro"}, [
      e("img", {class:"az-marchio-piccolo", src:"marchio.png",
        alt:"Regina", decoding:"async"}),
      src ? e("img", {class:"az-pezzo-foto", src, alt:"", decoding:"async"})
          : e("div", {class:"az-pezzo-foto redatto"}, [e("span", {testo:nomeDi(es)})]),
      e("h1", {class:"t-1", tabindex:"-1", testo:nomeDi(es)}),
      e("p", {class:"t-sub tenue az-riga", testo:materiaDi(es)}),
      e("span", {class:"t-cap2 occhiello az-eti", testo:"LO TROVI DA REGINA"}),
      e("p", {class:"t-body", testo: NEGOZIO.via + ", " + NEGOZIO.citta}),
      e("div", {class:"az-fondo"}, [
        e("a", {class:"tasto primario largo", "data-vivo":"1",
          href: waNegozio("Ciao, mi piace " + nomeDi(es) + ". Ce l’avete?"),
          target:"_blank", rel:"noopener"}, [e("span", {testo:"Scrivi su WhatsApp"})]),
        e("a", {class:"tasto terziario largo", "data-vivo":"1",
          href: mappeNegozio(), target:"_blank", rel:"noopener"},
          [e("span", {testo:"Apri in Mappe"})])
      ]),
      e("p", {class:"az-piede", testo:"Regina, " + NEGOZIO.citta})
    ]);
    strato.append(dentro);
    try{ dentro.querySelector("h1").focus({preventScroll:true}); }catch(_){ /* niente */ }
  }

  /* ══ LA REGIA DI 1,7 s — LOCKATA ═══════════════════════════════════
     marchio (0-400) → «Da <chi>» (400-800) → il pezzo (800-1300, con la
     molla) → la dedica in corsivo (1300-1700). Quattro battute a passo
     di 400-500 ms: leggibile, nessuna sovrapposta, picco sul pezzo, fine
     sotto i due secondi (carta psicologica).
     LA SCENA RESTA LA PAGINA: alla fine non c'è un «OK» da premere,
     c'è la carta ferma col suo tasto. Con meno movimento la scena non
     si salta — cambia il modo: dissolvenza 200 col frame finale già
     tutto in posto. */
  const REGIA = [
    {chi:"marchio", a:0},
    {chi:"da",      a:400},
    {chi:"pezzo",   a:800},
    {chi:"dedica",  a:1300}
  ];
  const FINE_REGIA = 1700;

  function regiaRegalo(es){
    const id = es.id || es.codice;
    const src = fotoDi(es);
    /* CHI DA' sta nel registro dei regali, non sull'esemplare: `per` è
       chi riceve, e chi riceve non è chi manda. Se il registro non c'è
       (un pezzo arrivato da un altro telefono) vale il `da` dei dati. */
    const reg = (leggi().regali || []).filter(r => r.id === id);
    const mittente = (reg.length && reg[reg.length-1].da) || es.da || "Regina";
    const ded = dedicaDi(id);

    const marchio = e("img", {class:"az-r-marchio", src:"marchio.png",
      alt:"Regina", decoding:"async"});
    const da = e("h1", {class:"az-r-da", tabindex:"-1", testo:"Da " + mittente});
    /* ── IL PEZZO È L'ASTUCCIO CHE SI APRE ────────────────────────
       17/09/2026. Qui c'era la fotografia del gioiello, quadrata, 240
       punti. Ma chi apre questo indirizzo sta SCARTANDO un regalo, e un
       regalo non è una fotografia: è una scatola che si apre. La regia
       resta quella lockata di 1,7 s — marchio 0-400, «Da X» 400-800,
       il pezzo 800-1300, la dedica 1300-1700 — e nella battuta del
       pezzo, adesso, il coperchio si alza.
       LA CERIMONIA È PIÙ LUNGA DELLA SUA BATTUTA, ed è voluto: 1600 ms
       partiti a 800 finiscono a 2400, mentre la dedica arriva a 1300 e
       la coda a 1700. Non si accorciano i tempi della scatola per farla
       stare dentro una battuta — si lascia che la dedica si scopra
       mentre il pezzo si posa, che è l'ordine in cui uno legge davvero:
       prima vede cos'è, poi legge chi gliel'ha scritto.
       L'INQUADRATURA È PIÙ LARGA che alla consegna (`aria` 1,62 contro
       1,55), e per una ragione che si è vista in faccia: qui il quadro è
       un QUADRATO di 240 punti, non uno schermo verticale. Su uno
       schermo alto l'aria avanza in altezza e il vincolo è la larghezza;
       dentro un quadrato i due vincoli sono lo stesso, e col numero
       della consegna il piede della scatola finiva tagliato dal bordo di
       sotto. */
    const famBanco = es.fam || "anelli";
    const haModello = typeof es.k === "number";
    const telaio = telaioAstuccio({
      fam: famBanco, k: haModello ? es.k : null,
      fodera: ((leggi().preferenze || {}).fodera) || "avorio",
      codice: es.codice || null, aria: 1.62, scorre: true,
      provino: haModello ? null : src,
      classe: "az-r-astuccio", titolo: "Il tuo astuccio"
    });
    /* il ripiego, se la scheda grafica non dà il contesto: la stessa
       fotografia di prima, che non è sbagliata — è soltanto meno */
    const fig = src
      ? e("img", {class:"az-r-fig", src, alt:"", decoding:"async"})
      : e("div", {class:"az-r-fig redatto"}, [e("span", {testo:nomeDi(es)})]);
    const scena = e("div", {class:"az-r-fig az-r-scena"}, [telaio.nodo]);
    let inTre = false;
    telaio.pronto.then((ok) => {
      inTre = !!ok;
      if(ok){ fig.hidden = true; scena.dataset.pronto = "1"; }
      else scena.hidden = true;
    });
    telaioVivo = telaio;
    const nome = e("p", {class:"az-r-nome", testo:nomeDi(es)});
    const pezzo = e("div", {class:"az-r-pezzo"}, [scena, fig, nome]);
    const dedica = e("p", {class:"az-r-dedica", testo: ded || ""});

    const metti = tasto("Metti nel cofanetto", {tipo:"primario", largo:true,
      suClick: () => {
        invia("regalo/ricevuto", {id, quando: adesso()});
        /* IL BANCO DEVE SAPERLO: il pezzo entra nel cofanetto, e la
           cerimonia la fa lui (grado grande, ~1,4 s: il vassoio sale, il
           pezzo si posa). `esemplare/nuovo` porta l'esemplare INTERO e
           non il solo id, perché quel codice il banco non lo conosce
           ancora — è lì che il ponte dei codici impara la riga. */
        mandaDati(id);
        diAlBanco("esemplare/nuovo", {id, esemplare: datiDi(id)});
        chiudiCarta();
        /* ── E SE NON HA MAI APERTO L'APP ─────────────────────────
           Chi riceve un regalo può non essere mai stato da Regina:
           `avvio.js` in quel caso ha tenuto la porta ferma sotto (la
           pagina del regalo sta sopra) e ha lasciato qui una maniglia.
           Il pezzo è già suo — è appena entrato nel cofanetto — e
           quindi la porta non riparte da S0 («le cinque cifre del tuo
           codice»: cifre che non ha) ma da S2, «Due cose, poi è tuo»:
           il nome per l'incisione e una data. Il codice glielo ha già
           scritto `avvio.js`. Da lì la fila prosegue come sempre, S3 e
           la tessera. */
        const porta = store.portaDopoRegalo;
        if(porta && !((leggi().ingresso || {}).fatto)){
          annuncia(nomeDi(es) + " è tuo.");
          porta();
          return;
        }
        location.hash = "#/cofanetto";
        annuncia(nomeDi(es) + " è nel tuo cofanetto.");
      }});

    const coda = e("div", {class:"az-r-coda"}, [
      e("div", {class:"az-fondo"}, [metti]),
      /* LA REGOLA ETICA, scritta con garbo e in una riga sola. Non si
         aggiunge «e non chiude collezioni»: dichiararlo suona da
         regolamento, e la collezione semplicemente non lo conta. */
      e("p", {class:"t-foot tenue az-r-etica",
        testo:"Il pezzo è registrato a nome tuo dal negozio. Chi te lo ha regalato non vede più la scheda."})
    ]);

    const dentro = e("div", {class:"az-carta-dentro az-regia"},
      [marchio, da, pezzo, dedica, coda]);
    strato.append(dentro);
    if(!ded) dedica.classList.add("az-senza");

    const parti = {marchio, da, pezzo, dedica};

    if(RIDOTTO.matches){
      for(const k in parti) parti[k].classList.add("az-in");
      coda.classList.add("az-in");
      dentro.animate([{opacity:0},{opacity:1}], {duration:200, easing:"linear"});
      for(const b of REGIA) tempi[b.chi] = 0;
      tempi.inizio = 0; tempi.fine = 200;
      annuncia("Un regalo da " + mittente + ": " + nomeDi(es) + ".");
      return;
    }

    /* ── L'OROLOGIO PARTE QUANDO IL SIPARIO È SU ──────────────────
       Una regia di 1,7 secondi con quattro battute a 400 ms l'una non
       tollera un filo principale occupato: chi si prende il ritardo è
       il timer che capita in quel momento, e a schermo si vede come una
       battuta che arriva in ritardo mentre le altre no (misurato prima
       di questa riga: la battuta dei 400 ms arrivava a 693, il pezzo e
       la fine in orario).
       Prima di far partire l'orologio si aspettano TRE cose, che sono
       esattamente quelle che costano quando arrivano tardi:
         · le due fotografie DECODIFICATE (`decode()`);
         · il CARATTERE pronto (`document.fonts.ready`) — la scena è
           quattro righe di Bodoni, e il primo uso di una faccia che non
           è ancora arrivata la fa caricare e comporre proprio mentre il
           marchio deve entrare;
         · due giri di rAF, perché i livelli promossi da `will-change`
           siano già disegnati quando l'orologio segna zero.
       Non è una taratura del collaudo: è come si alza un sipario — si
       alza quando dietro sono pronti. Il tetto è 700 ms, perché una
       fotografia che non arriva non può tenere fermo un regalo: dopo,
       la scena parte lo stesso e il posto resta redatto.
       `decode()` non c'è su tutti i browser: il `catch` tratta
       l'immagine come già pronta, che è il caso peggiore accettabile. */
    const figure = [marchio, fig].filter(x => x && x.tagName === "IMG");
    const pronte = Promise.all([
      ...figure.map(x => {
        try{ return x.decode().catch(() => {}); }catch(_){ return Promise.resolve(); }
      }),
      telaio.pronto,
      (document.fonts && document.fonts.ready) || Promise.resolve()
    ]);
    /* IL SIPARIO ASPETTA ANCHE LA SCATOLA. Il telaio dice «pronto»
       quando il pezzo è in scena: farlo partire prima vorrebbe dire una
       battuta su un rettangolo vuoto. Il tetto vale anche per lui — una
       scheda grafica lenta non può tenere fermo un regalo. */
    const tetto = new Promise(r => setTimeout(r, 700));
    pronte.then(() => {}, () => {});

    /* ══ LA REGIA COME FUNZIONE DEL TEMPO ════════════════════
       `statoA(t)` dice com'e' la scena all'istante t, e non lo dice
       «secondo me»: lo dice per tutti e due i mestieri. La scena VIVA è
       un giro di rAF che a ogni fotogramma applica `statoA(adesso)`; il
       collaudo FERMA l'orologio e lo porta a mano di dieci in dieci
       millisecondi sulla stessa funzione. È il modo in cui F1 ha
       misurato la cerimonia del cofanetto, ed è l'unico che misuri la
       COREOGRAFIA invece della macchina che la esegue.
       Non è solo comodo per la sonda: guidare quattro battute con
       quattro `setTimeout` indipendenti significa che un fotogramma
       bloccato sposta quella battuta E tutte quelle dopo; con
       l'orologio, una battuta in ritardo è in ritardo da sola e la
       successiva torna al suo posto. La scena non deriva. */
    const statoA = (t) => ({
      /* il marchio c'è già a zero: è il sipario, non una battuta */
      marchio: 1,
      /* e sale (e si riduce) nello stesso istante in cui entra «Da chi»:
         è la stessa battuta vista dall'altro lato */
      su:     t >= REGIA[1].a ? 1 : 0,
      da:     t >= REGIA[1].a ? 1 : 0,
      pezzo:  t >= REGIA[2].a ? 1 : 0,
      dedica: t >= REGIA[3].a ? 1 : 0,
      coda:   t >= FINE_REGIA ? 1 : 0
    });
    regiaCorrente = statoA;

    const nodi = {marchio, da, pezzo, dedica, coda};
    let suonata = false;
    function applica(st, t){
      for(const k in nodi){
        const acceso = !!st[k];
        if(acceso === nodi[k].classList.contains("az-in")) continue;
        nodi[k].classList.toggle("az-in", acceso);
        if(acceso && tempi[k] === undefined) tempi[k] = Math.round(t);
      }
      marchio.classList.toggle("az-su", !!st.su);
      /* LA SCATOLA SI APRE QUANDO IL PEZZO ENTRA, e non un istante
         prima: la battuta è sua. Una volta sola — `applica` gira a ogni
         fotogramma, e la prova generale a sipario chiuso la accende
         tutta per un giro. */
      if(!suonata && st.pezzo && !dentro.classList.contains("az-preroll")){
        suonata = true;
        if(inTre) telaio.suona();
      }
    }

    /* ── IL PRE-ROLL: la scena si prova a sipario chiuso ──────────
       `decode()` produce la fotografia decompressa, ma NON il disegno
       alla misura in cui si vede: quello lo fa il rasterizzatore la
       prima volta che l'elemento diventa visibile, e senza una scheda
       grafica sotto costa centinaia di millisecondi. Dentro una regia
       lockata a quattro battute di 400 ms quel lavoro non si nota dove
       capita: lo paga il fotogramma successivo. Misurato: la battuta dei
       400 arrivava a 657 con le due fotografie in scena, a 443
       nascondendo il marchio, a 408 nascondendo il pezzo.
       Perciò la scena si disegna TUTTA una volta, col contenitore a
       opacita' zero e le transizioni spente — nessuno la vede, e il
       rasterizzatore ha già fatto il suo lavoro quando serve. È la
       prova generale: si fa a luci spente, e serve a non far aspettare
       il pubblico. */
    Promise.race([pronte, tetto]).then(() => {
      dentro.classList.add("az-preroll");
      applica({marchio:1, su:1, da:1, pezzo:1, dedica:1, coda:1}, 0);
      for(const k in tempi) if(k !== "inizio") delete tempi[k];
      requestAnimationFrame(() => requestAnimationFrame(() => {
        /* ancora a sipario chiuso: si torna al fotogramma zero */
        applica(statoA(0), 0);
        requestAnimationFrame(() => {
          dentro.classList.remove("az-preroll");
          requestAnimationFrame(() => {
            const t0 = performance.now();
            tempi.inizio = 0; tempi.marchio = 0;
            (function giro(){
              const t = performance.now() - t0;
              applica(statoA(t), t);
              if(t < FINE_REGIA + 16){ requestAnimationFrame(giro); return; }
              tempi.fine = Math.round(t);
              /* i livelli promossi si restituiscono: `will-change` tenuto
                 acceso su una scena finita è memoria di video occupata
                 per niente, e su un telefono si paga. */
              dentro.classList.add("az-ferma");
              try{ da.focus({preventScroll:true}); }catch(_){ /* niente */ }
            })();
          });
        });
      }));
    });
    annuncia("Un regalo da " + mittente + ": " + nomeDi(es) + ".");
  }

  /* ── L'INDIRIZZO COMANDA LO STRATO ───────────────────────────────
     Come fa `#/l/<token>` in vetrina.js: un `hashchange` apre, un altro
     chiude, e il navigatore non deve sapere che questa pagina esiste
     (su un tab che non riconosce ripiega su `cofanetto`, e quel ramo
     esce prima di toccare le pile). */
  const guardaCarta = () => {
    const m = /^#\/c\/([^/]+)$/.exec(location.hash);
    if(m) apriCarta(decodeURIComponent(m[1]));
    else chiudiCarta();
  };
  addEventListener("hashchange", guardaCarta);
  addEventListener("popstate", guardaCarta);

  /* ══════════════════════════════════════════════════════════════════
     IL CANALE
     ══════════════════════════════════════════════════════════════════ */
  const APRI = {
    "azione/dedica": foglioDedica,
    "azione/regala": foglioRegala,
    "azione/assistenza": foglioAssistenza,
    "azione/condividi": condividi
  };
  for(const t in APRI) quandoIlBancoDice(t, (d) => {
    if(!d || !d.id) return;
    ultimoId = d.id;
    APRI[t](d.id);
  });

  /* lo stato vuoto del banco ha un'azione sola, e porta in Vetrina. */
  quandoIlBancoDice("nav/vetrina", () => { vaiA("vetrina"); });

  quandoIlBancoDice("banco/aperto", (d) => {
    if(!d || !d.id) return;
    ultimoId = d.id; cartaAperta = d.id;
    mandaDati(d.id);
  });
  quandoIlBancoDice("banco/chiuso", () => { cartaAperta = null; });

  /* LA CARTA È A SCHERMO? Solo se il banco la sta mostrando E la
     sezione del cofanetto è quella in vista. Serve a una cosa sola, e
     precisa: il toast «Salvata» esiste quando l'effetto è ALTROVE, e
     non esiste quando lo si sta guardando (49 §2). */
  const cartaAschermo = (id) =>
    cartaAperta === id && tabCorrente() === "cofanetto" && !strato;

  /* ── IL RETRO SI AGGIORNA DA SOLO ────────────────────────────────
     Quattro rami lo compongono; quando uno cambia, la carta che il banco
     sta mostrando riceve i dati nuovi senza chiederli. */
  iscrivi((s, ev, prima) => {
    if(!prima) return;
    const cambiato = s.esemplari !== prima.esemplari ||
                     s.dediche !== prima.dediche ||
                     s.regali !== prima.regali ||
                     s.assistenze !== prima.assistenze;
    if(ev.tipo === "demo/reset"){ chiudiCarta(); ultimoId = null; cartaAperta = null; return; }
    if(!cambiato) return;
    const id = cartaAperta || ultimoId;
    if(id) mandaDati(id);
  });

  /* ── CHI ARRIVA DA FUORI SU `#/c/<codice>` ───────────────────────
     `avviaRotta()` riscrive l'indirizzo con `#/cofanetto` all'avvio: il
     frammento originale va letto all'importazione e rimesso dopo. È
     esattamente cio' che vetrina.js fa per `#/l/<token>`. */
  const dirittoAllaCarta = /^#\/c\/([^/]+)$/.exec(INDIRIZZO_0);
  if(dirittoAllaCarta) setTimeout(() => {
    try{ history.replaceState(null, "", INDIRIZZO_0); }catch(_){ /* niente */ }
    apriCarta(decodeURIComponent(dirittoAllaCarta[1]));
  }, 80);
  else guardaCarta();

  /* ── LA MANIGLIA DELLE SONDE ─────────────────────────────────────
     Dichiarata, come `window.__vetrina` e `window.__perte`: una sonda
     che deve indovinare un selettore collauda il selettore. */
  window.__azioni = {
    apri: (tipo, id) => { ultimoId = id; (APRI["azione/" + tipo] || (() => {}))(id); },
    dati: (id) => datiDi(id || ultimoId),
    get ultimoDati(){ return ultimoDati; },
    manda: mandaDati,
    get tempi(){ return {...tempi}; },
    get wa(){ return ultimoWa; },
    REGIA, FINE_REGIA, MAX_DEDICA,
    /* L'OROLOGIO CHE SI PUÒ FERMARE. La sonda chiama `regia.a(t)` di
       dieci in dieci e legge la scena all'istante t senza dipendere da
       quanto è veloce la macchina che la esegue: è la stessa funzione
       che guida la scena viva, non una sua descrizione. */
    get regia(){ return regiaCorrente ? {a: regiaCorrente, REGIA, FINE_REGIA} : null; },
    link: linkDi,
    qr: (t) => matriceQR(t),
    negozio: NEGOZIO
  };
}
