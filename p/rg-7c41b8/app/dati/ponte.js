/* ═══════════════════════════════════════════════════════════════════════
   IL PONTE fra la STANZA e il LIBRETTO.

   PERCHÉ ESISTONO DUE CODICI, e perché è giusto che restino due.

   La scena 3D chiama un pezzo `RJ-ANE-001`. Quel codice è una POSIZIONE:
   famiglia + indice nel ripiano. Serve al modello per sapere quale mesh
   accendere, e non può essere altro — il file .glb ha cinque anelli in
   fila e li distingue per ordine, non per storia. Due clienti che aprono
   la stessa stanza vedono lo stesso `RJ-ANE-001`, ed è corretto: è lo
   stesso modello.

   Il gestionale chiama un pezzo `RJ-CM4-PR7-G9D`. Quel codice è un
   ESEMPLARE: è L'ANELLO DI LUCIA, comprato il 12 luglio, regalato da
   Antonio, con dentro scritto «Il primo.». Non è ripetibile, è quello
   che finisce nel QR della Carta del Pezzo, è quello che apre
   `/c/<codice>` a chi scarta il regalo, e deve poter essere DETTATO al
   telefono (per questo l'alfabeto è senza 0/O e senza 1/I/L).

   Unificarli sembra una pulizia e invece è la rottura: se la stanza usa
   il codice dell'esemplare, la stanza diventa personale e il modello 3D va
   ricostruito per cliente; se il Libretto usa il codice della posizione,
   due anelli uguali comprati in due giorni diversi diventano lo stesso
   oggetto e le due dediche si sovrascrivono.

   Quindi restano due, e si toccano SOLO qui. Ogni altro file dell'app
   chiede a questo modulo e non fa aritmetica sui codici per conto suo.

   Un ESEMPLARE può non avere posizione (`fam`/`k` a null): è un pezzo
   vero che il modello 3D non conosce — si vede in elenco, non nella
   stanza. E un POSTO può essere vuoto: nessuno possiede quel modello.
   Il ponte torna `null` in entrambi i casi, e non è un errore: è il
   caso normale. Ventidue posti, dieci esemplari.
   ═══════════════════════════════════════════════════════════════════════ */

import { PER_SCENA, PER_ID, codiceScena } from "./catalogo.js";
import { esemplari } from "./seme.js";

/* il formato del codice esemplare, così come lo genera
   `regina_genera_codice_esemplare()` nel gestionale: nove caratteri
   dell'alfabeto senza forme ambigue, a gruppi di tre. */
export const ALFABETO = "ACDEFGHJKMNPQRTUVWXY3479";
export const RE_CODICE = /^RJ-[ACDEFGHJKMNPQRTUVWXY3479]{3}-[ACDEFGHJKMNPQRTUVWXY3479]{3}-[ACDEFGHJKMNPQRTUVWXY3479]{3}$/;
export const codiceValido = (c) => typeof c === "string" && RE_CODICE.test(c);

/* ── gli indici del ponte, costruiti una volta sola ───────────────────
   Una `find` sull'elenco degli esemplari a ogni tocco del dito costa poco
   con dieci righe e costa tutto con diecimila. Si paga una volta qui. */

const PER_POSTO = new Map();   // "anelli:0"        → esemplare
const PER_CODICE = new Map();  // "RJ-CM4-PR7-G9D"  → esemplare

for (const e of esemplari) {
  PER_CODICE.set(e.codice, e);
  if (typeof e.k === "number" && e.fam) {
    const posto = e.fam + ":" + e.k;
    /* due esemplari sullo stesso posto vorrebbe dire che Lucia possiede
       due volte lo stesso modello: legittimo nella vita, ma la stanza ha
       un alloggio solo e mostrerebbe il primo. Meglio saperlo subito. */
    if (PER_POSTO.has(posto))
      console.warn("ponte: due esemplari sullo stesso posto 3D —", posto);
    PER_POSTO.set(posto, e);
  }
}

/* ── i quattro attraversamenti ────────────────────────────────────────── */

/** dal posto nella stanza al codice della Carta del Pezzo. */
export function codiceDiScena(fam, k) {
  return PER_POSTO.get(fam + ":" + k)?.codice ?? null;
}

/** dal codice della Carta del Pezzo al posto nella stanza. */
export function scenaDiCodice(codice) {
  const e = PER_CODICE.get(codice);
  if (!e || typeof e.k !== "number" || !e.fam) return null;
  return { fam: e.fam, k: e.k };
}

/** dal posto nella stanza all'ARTICOLO (il modello: nome, prezzo, foto). */
export function articoloDiScena(fam, k) {
  return PER_SCENA.get(fam + ":" + k) ?? null;
}

/** dal posto nella stanza all'ESEMPLARE (la storia: quando, dove, dedica). */
export function esemplareDiScena(fam, k) {
  return PER_POSTO.get(fam + ":" + k) ?? null;
}

/** dal codice all'esemplare, e dall'esemplare al suo articolo. */
export const esemplareDiCodice = (codice) => PER_CODICE.get(codice) ?? null;
export const articoloDiCodice = (codice) => {
  const e = PER_CODICE.get(codice);
  return e ? PER_ID.get(e.articolo) ?? null : null;
};

/* ── la vista che serve alla stanza ────────────────────────────────────
   Per ogni posto: cosa c'è (articolo) e se è di Lucia (esemplare).
   `possesso` è `false` anche quando l'esemplare esiste ma è ancora
   `venduto`: la carta è stampata, ma nessuno l'ha inquadrata, e in quel
   caso il pezzo NON deve comparire nel cofanetto — è la sorpresa. */

export function posto(fam, k) {
  const a = articoloDiScena(fam, k);
  const e = esemplareDiScena(fam, k);
  return {
    fam,
    k,
    codice_scena: codiceScena(fam, k),
    articolo: a,
    esemplare: e,
    codice: e?.codice ?? null,
    possesso: !!e && e.stato !== "venduto",
  };
}

/* gli esemplari che NON hanno un posto nella stanza: è l'elenco che
   l'interfaccia deve saper mostrare da qualche altra parte, altrimenti
   quei pezzi spariscono dall'app pur essendo pagati. */
export const senzaPosto = () =>
  esemplari.filter((e) => typeof e.k !== "number" || !e.fam);

export default {
  codiceDiScena, scenaDiCodice, articoloDiScena, esemplareDiScena,
  esemplareDiCodice, articoloDiCodice, posto, senzaPosto, codiceValido,
};
