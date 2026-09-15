/* Verifica dei dati della bozza. `node _D_verifica.mjs` dalla cartella.
   Non e' un test unitario: e' il controllo che i numeri di tre file
   separati raccontino la stessa storia. Esce con codice 1 se qualcosa non
   torna, cosi' si puo' mettere in un gancio senza leggere l'output. */

import { ARTICOLI, PER_ID, PER_SCENA, FAMIGLIE, codiceScena, euro } from "./catalogo.js";
import { COLLEZIONI, statoCollezione } from "./collezioni.js";
import * as seme from "./seme.js";
import { codiceValido, codiceDiScena, scenaDiCodice, articoloDiScena, posto } from "./ponte.js";

let errori = 0;
const ok = (c, m) => { if (!c) { errori++; console.error("  ✗ " + m); } };
const titolo = (t) => console.log("\n" + t);

/* ── 1 · i 22 pezzi del 3D, contro `const RIPIANI` di spazio.html ───────
   La tabella qui sotto e' RICOPIATA dal 3D: se qualcuno cambia un prezzo
   nel catalogo e non nella scena (o viceversa), questo blocco lo grida. */
const RIPIANI = {
  anelli: [["Anello Cabochon", "Acciaio dorato e cabochon turchese · misura 14", "39,00"],
           ["Anello Filo", "Argento 925 · misura 12", "29,00"],
           ["Anello Grande", "Acciaio dorato e cabochon · misura 15", "45,00"],
           ["Anello Fedina", "Argento 925 · misura 13", "35,00"],
           ["Anello Piccolo", "Acciaio dorato e cabochon · misura 14", "39,00"]],
  busto: [["Collana Maglia", "Acciaio dorato · 45 cm", "59,00"],
          ["Collana Punto", "Argento 925 · 42 cm", "69,00"],
          ["Collana Onda", "Acciaio · 40 cm", "45,00"]],
  orecchini: [["Pendente Turchese", "Acciaio dorato e cabochon", "26,00"],
              ["Creola Media", "Argento 925 · 16 mm", "28,00"],
              ["Perno Turchese", "Acciaio dorato e cabochon", "22,00"],
              ["Pendente Perla", "Argento 925 e perla", "29,00"],
              ["Creola Grande", "Acciaio dorato · 18 mm", "32,00"],
              ["Perno Perla", "Argento 925 e perla", "24,00"],
              ["Pendente Cabochon", "Acciaio dorato e cabochon", "26,00"],
              ["Creola Piccola", "Argento 925 · 14 mm", "27,00"],
              ["Perno Cabochon", "Acciaio dorato e cabochon", "22,00"]],
  rampa: [["Bracciale Maglia Larga", "Argento 925 · 19 cm", "89,00"],
          ["Bracciale Maglia", "Acciaio dorato · 19 cm", "54,00"]],
  orologi: [["Costa Smeralda", "Verde salvia · 40 mm · 5 ATM", "89,00"],
            ["Tulum", "Verde menta · 40 mm · 5 ATM", "89,00"],
            ["Bora Bora", "Turchese · 40 mm · 5 ATM", "89,00"]],
};

titolo("1 · CATALOGO contro la scena 3D");
let n3d = 0;
for (const [fam, righe] of Object.entries(RIPIANI)) {
  righe.forEach(([nome, materia, prezzo], k) => {
    n3d++;
    const a = PER_SCENA.get(fam + ":" + k);
    ok(a, `manca l'articolo per ${fam}:${k} (${nome})`);
    if (!a) return;
    ok(a.nome === nome, `${fam}:${k} nome «${a.nome}» ≠ «${nome}»`);
    ok(a.materia === materia, `${fam}:${k} materia diversa dal 3D`);
    ok(a.prezzo_vendita === Number(prezzo.replace(",", ".")),
       `${fam}:${k} prezzo ${a.prezzo_vendita} ≠ ${prezzo}`);
    ok(a.codice_scena === codiceScena(fam, k), `${fam}:${k} codice scena sbagliato`);
    ok(a.famiglia_nome === FAMIGLIE[fam], `${fam}:${k} famiglia_nome sbagliato`);
  });
}
const in3d = ARTICOLI.filter((a) => a.in_3d);
ok(n3d === 22, `la tabella del 3D ha ${n3d} pezzi, non 22`);
ok(in3d.length === 22, `articoli con in_3d ${in3d.length}, non 22`);
console.log(`  ${in3d.length}/22 pezzi del 3D combaciano · ${ARTICOLI.length} articoli in catalogo`);

titolo("2 · unicita' e forma del catalogo");
ok(new Set(ARTICOLI.map((a) => a.id)).size === ARTICOLI.length, "id articolo duplicati");
ok(new Set(ARTICOLI.map((a) => a.codice_fornitore)).size === ARTICOLI.length,
   "codice_fornitore duplicati");
for (const a of ARTICOLI) {
  ok(typeof a.prezzo_vendita === "number" && a.prezzo_vendita > 0, `${a.id}: prezzo non numerico`);
  ok(a.prezzo_vendita >= 22 && a.prezzo_vendita <= 89,
     `${a.id}: ${euro(a.prezzo_vendita)} fuori dalla fascia 22–89 € di Regina`);
  ok(!!FAMIGLIE[a.famiglia], `${a.id}: famiglia sconosciuta «${a.famiglia}»`);
  ok(a.descrizione && a.materia && a.cura && a.consegna, `${a.id}: campi di testo mancanti`);
  ok(Array.isArray(a.foto), `${a.id}: foto non e' un elenco`);
}
const conFoto = ARTICOLI.filter((a) => a.foto.some((f) => f.tipo === "scatto"));
console.log(`  ${ARTICOLI.length} articoli · ${conFoto.length} con una fotografia vera · ` +
            `${ARTICOLI.length - in3d.length} solo in vetrina`);

titolo("3 · collezioni");
for (const c of COLLEZIONI) {
  ok(c.nome && c.racconto && c.stagione, `${c.id}: manca nome/racconto/stagione`);
  ok(c.pezzi.length >= 4, `${c.id}: solo ${c.pezzi.length} pezzi`);
  for (const pid of c.pezzi) {
    const a = PER_ID.get(pid);
    ok(a, `${c.id}: il pezzo «${pid}» non esiste in catalogo`);
    if (a) ok(a.collezione === c.id,
              `${c.id}: «${pid}» dichiara collezione «${a.collezione}»`);
  }
  ok(c.chiude && c.chiude.nome && c.chiude.nota, `${c.id}: manca il pezzo che chiude`);
  ok(c.chiude.articolo === null || PER_ID.has(c.chiude.articolo),
     `${c.id}: il pezzo che chiude punta a un articolo inesistente`);
  for (const chiave of ["manca1", "manca", "chiusa"])
    ok(typeof c.promo[chiave] === "string", `${c.id}: promo.${chiave} mancante`);
  ok(c.promo.manca.includes("{n}"), `${c.id}: promo.manca senza {n}`);
}
/* nessun pezzo in due collezioni */
const conteggio = new Map();
for (const c of COLLEZIONI) for (const p of c.pezzi) conteggio.set(p, (conteggio.get(p) || 0) + 1);
for (const [p, n] of conteggio) ok(n === 1, `«${p}» compare in ${n} collezioni`);
/* e viceversa: chi dichiara una collezione dev'esserci dentro */
for (const a of ARTICOLI)
  if (a.collezione)
    ok(COLLEZIONI.find((c) => c.id === a.collezione)?.pezzi.includes(a.id),
       `${a.id} dichiara «${a.collezione}» ma non e' nel suo elenco`);
console.log(`  ${COLLEZIONI.length} collezioni · ${conteggio.size} articoli collezionati`);

titolo("4 · esemplari");
const codici = seme.esemplari.map((e) => e.codice);
ok(new Set(codici).size === codici.length, "due esemplari con lo stesso codice");
for (const e of seme.esemplari) {
  ok(codiceValido(e.codice), `codice fuori formato: ${e.codice}`);
  ok(PER_ID.has(e.articolo), `${e.codice}: l'articolo «${e.articolo}» non esiste`);
  ok(["venduto", "registrato", "trasferito"].includes(e.stato),
     `${e.codice}: stato «${e.stato}» non previsto`);
  ok(!e.firmato || !!e.da, `${e.codice}: firmato ma senza chi firma`);
  ok(!e.dedica || e.dedica.length > 0, `${e.codice}: dedica vuota`);
  if (typeof e.k === "number") {
    const a = articoloDiScena(e.fam, e.k);
    ok(a && a.id === e.articolo,
       `${e.codice}: il posto ${e.fam}:${e.k} tiene «${a?.id}», non «${e.articolo}»`);
  }
}
const con3d = seme.esemplari.filter((e) => typeof e.k === "number");
ok(con3d.length === 8, `esemplari con posto nella stanza: ${con3d.length}, attesi 8`);
console.log(`  ${seme.esemplari.length} esemplari · ${con3d.length} nella stanza · ` +
            `${seme.esemplari.length - con3d.length} solo in elenco · codici tutti validi e unici`);

titolo("5 · il ponte");
for (const e of con3d) {
  ok(codiceDiScena(e.fam, e.k) === e.codice, `codiceDiScena(${e.fam},${e.k}) non torna`);
  const s = scenaDiCodice(e.codice);
  ok(s && s.fam === e.fam && s.k === e.k, `scenaDiCodice(${e.codice}) non torna`);
}
for (const e of seme.esemplari.filter((x) => typeof x.k !== "number"))
  ok(scenaDiCodice(e.codice) === null, `${e.codice}: non ha posto, ma il ponte ne trova uno`);
/* un posto vuoto deve rispondere null senza esplodere */
ok(codiceDiScena("anelli", 4) === null, "un posto vuoto dovrebbe tornare null");
ok(posto("anelli", 0).possesso === true, "posto(anelli,0) dovrebbe essere posseduto");
ok(posto("anelli", 2).possesso === false, "posto(anelli,2) non e' di Lucia");
console.log("  andata e ritorno su tutti gli esemplari · posti vuoti gestiti");

titolo("6 · credito");
const somma = seme.saldoCredito();
ok(somma === seme.cliente.credito,
   `credito ${euro(seme.cliente.credito)} ≠ somma dei movimenti ${euro(somma)}`);
ok(seme.movimenti_credito.every((m) =>
     ["maturato", "scaricato", "benvenuto", "rettifica", "compleanno"].includes(m.tipo)),
   "un movimento ha un tipo che il gestionale non conosce");
ok(seme.movimenti_credito.every((m) => m.tipo !== "scaricato" || m.importo < 0),
   "uno scarico con importo positivo");
/* il saldo non dev'essere mai andato sotto zero, nemmeno per un giorno */
let corsa = 0;
for (const m of [...seme.movimenti_credito].sort((a, b) => a.data.localeCompare(b.data))) {
  corsa = Number((corsa + m.importo).toFixed(2));
  ok(corsa >= 0, `il credito va sotto zero il ${m.data} (${euro(corsa)})`);
}
console.log(`  ${seme.movimenti_credito.length} movimenti · saldo ${euro(somma)} · mai sotto zero`);

titolo("7 · livello e spesa");
const { livello, prossimo, manca } = seme.livelloDa(seme.cliente.speso_totale);
ok(livello.id === seme.cliente.livello,
   `livello ${seme.cliente.livello} ≠ ${livello.id} calcolato da ${euro(seme.cliente.speso_totale)}`);
ok(livello.nome === "Secondo", `il livello dovrebbe chiamarsi «Secondo», non «${livello.nome}»`);
ok(prossimo && prossimo.percentuale === 5, "il prossimo livello dovrebbe rendere il 5%");
ok(manca === 260, `mancano ${euro(manca)} al prossimo, non 260,00 €`);
/* lo speso dev'essere almeno la somma di quello che ha pagato lei */
const suo = seme.esemplari
  .filter((e) => !e.regalo)
  .reduce((s, e) => s + (PER_ID.get(e.articolo)?.prezzo_vendita || 0), 0);
ok(seme.cliente.speso_totale >= suo,
   `speso_totale ${euro(seme.cliente.speso_totale)} < ${euro(suo)} di acquisti suoi`);
console.log(`  ${livello.nome} · speso ${euro(seme.cliente.speso_totale)} · ` +
            `mancano ${euro(manca)} al ${prossimo.nome} (${prossimo.percentuale}%)`);

titolo("8 · lista, date, arrivi");
for (const w of seme.wishlist) {
  ok(PER_ID.has(w.articolo), `lista: «${w.articolo}» non esiste`);
  ok(!seme.posseduti.has(w.articolo), `lista: «${w.articolo}» Lucia ce l'ha gia'`);
  ok(!!w.token, `lista: «${w.articolo}» senza token`);
  ok(["privata", "condivisa", "aperta"].includes(w.visibilita), "visibilita' non prevista");
}
ok(new Set(seme.wishlist.map((w) => w.token)).size === seme.wishlist.length, "token duplicati");
for (const r of seme.ricorrenze) {
  ok(r.giorno >= 1 && r.giorno <= 31 && r.mese >= 1 && r.mese <= 12, `ricorrenza fuori calendario`);
  ok(r.avviso.mese === r.mese && r.avviso.giorno === r.giorno - 7,
     `${r.etichetta}: l'avviso non e' sette giorni prima`);
}
for (const a of seme.arrivi) ok(PER_ID.has(a.articolo), `arrivi: «${a.articolo}» non esiste`);
for (const n of seme.notifiche) {
  if (n.articolo) ok(PER_ID.has(n.articolo), `notifica: «${n.articolo}» non esiste`);
  if (n.collezione) ok(COLLEZIONI.some((c) => c.id === n.collezione), "notifica: collezione ignota");
  if (n.promozione) ok(seme.promozioni.some((p) => p.id === n.promozione), "notifica: promo ignota");
}
console.log(`  ${seme.wishlist.length} in lista · ${seme.ricorrenze.length} date · ` +
            `${seme.arrivi.length} arrivi · ${seme.notifiche.length} notifiche`);

titolo("9 · lo stato delle collezioni per Lucia");
for (const c of COLLEZIONI) {
  const s = statoCollezione(c.id, seme.posseduti);
  console.log(`  ${c.nome.padEnd(16)} ${s.ha.length}/${s.totale}  ${s.frase}`);
}
const filo = statoCollezione("filo", seme.posseduti);
ok(filo.mancano.length === 1, `a Filo di Luce mancano ${filo.mancano.length} pezzi, atteso 1`);
ok(filo.frase.startsWith("Ti manca un pezzo solo"), "la frase di Filo di Luce non e' quella giusta");

console.log("\n" + (errori === 0
  ? "TUTTO TORNA — " + ARTICOLI.length + " articoli, " + COLLEZIONI.length +
    " collezioni, " + seme.esemplari.length + " esemplari, schema v" + seme.versione_schema
  : errori + " PROBLEMI"));
process.exit(errori === 0 ? 0 : 1);
