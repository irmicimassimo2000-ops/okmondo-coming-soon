/* ═══════════════════════════════════════════════════════════════════
   app/innesto.js — L'INNESTO FRA I DATI VERI E LA SCOCCA.

   L'interfaccia dichiarata per F0.1 era:
     seme.js       export const seme = {versione_schema, cliente, livelli,
                     esemplari, movimenti_credito, ricorrenze, wishlist,
                     preferenze, notifiche, arrivi}
     catalogo.js   export const catalogo = [...]
     collezioni.js export const collezioni = {...}

   Quello che e' arrivato davvero da `app/dati/` e' piu' ricco e con
   un'altra forma: esportazioni nominate una per campo invece di un solo
   oggetto `seme`, `ARTICOLI` invece di `catalogo`, `COLLEZIONI` come
   ARRAY invece che come mappa, i prezzi e il credito in EURO invece che
   in centesimi, gli esemplari con `codice` invece di `id`, le
   ricorrenze con `etichetta` invece di `titolo`, gli arrivi e la lista
   che puntano a un articolo per riferimento invece di portarselo
   dietro.

   Questo file e' il punto UNICO dove le due forme si incontrano, ed e'
   di qua: i dati sono di un altro esecutore e non si toccano. Meglio un
   innesto dichiarato in un file solo che trenta letture difensive
   sparse per le viste — quelle non si trovano piu' quando la forma
   cambia di nuovo.

   Due conversioni contano piu' delle altre:
   · I SOLDI DIVENTANO CENTESIMI INTERI. 39,00 € in virgola mobile
     sommato dodici volte non fa 468,00: fa 467,99999999999994. In
     un'app che mostra un credito da scalare quella cifra si vede.
   · LA LISTA DIVENTA UN ELENCO DI ID. Lo store di F0.1 tratta la
     wishlist come un insieme di articoli (`wishlist/aggiungi {id}`),
     mentre i dati portano record con priorita', visibilita' e token da
     girare a chi paga. Qui si tiene solo l'id — e in F4, quando la
     lista sara' una schermata e non una riga, l'evento dovra' portare
     il record intero. E' un debito, ed e' scritto.
   ═══════════════════════════════════════════════════════════════════ */

const cent = (euro) => Math.round((Number(euro) || 0) * 100);
const primo = (...v) => v.find(x => x !== undefined && x !== null);

/* ── IL CATALOGO ───────────────────────────────────────────────────
   Si tengono TUTTI i campi originali e si aggiungono i tre che la
   scocca sa leggere: `prezzo` in centesimi, `foto` come indirizzo
   singolo, `tipo` come nome della famiglia. Niente si butta: F4
   lavorera' sui campi ricchi. */
export function innestaCatalogo(mod){
  const grezzo = mod && (mod.catalogo || mod.ARTICOLI || mod.default);
  if(!Array.isArray(grezzo)) return null;
  return grezzo.map(a => ({
    ...a,
    id: a.id,
    prezzo: a.prezzo !== undefined && Number.isInteger(a.prezzo)
              ? a.prezzo : cent(primo(a.prezzo_vendita, a.prezzo, 0)),
    foto: primo(a.foto_url, typeof a.foto === "string" ? a.foto : null),
    tipo: primo(a.famiglia_nome, a.tipo, a.famiglia, "")
  }));
}

/* ── LE COLLEZIONI ─────────────────────────────────────────────────
   Dichiarate come mappa, arrivate come array. Si accetta l'una e
   l'altra e si consegna sempre la mappa: una vista che deve sapere se
   i dati sono un array o un oggetto e' una vista che sapra' una cosa
   di troppo. */
export function innestaCollezioni(mod){
  const g = mod && (mod.collezioni || mod.COLLEZIONI || mod.default);
  if(!g) return null;
  if(Array.isArray(g)){
    const m = {};
    for(const c of g) m[c.id] = c;
    return m;
  }
  return g;
}

/* ── IL SEME ───────────────────────────────────────────────────────── */
export function innestaSeme(mod, catalogo){
  if(!mod) return null;
  /* `seme` se c'e'; altrimenti il default; altrimenti si rimette
     insieme dalle esportazioni nominate, che e' come e' arrivato. */
  const s = mod.seme || (mod.default && mod.default.cliente ? mod.default : null) || mod;
  if(!s || !s.cliente) return null;

  const perId = new Map((catalogo || []).map(a => [a.id, a]));
  const pezzo = (id) => perId.get(id) || null;

  const livelli = (s.livelli || []).map(l => ({
    ...l,
    sconto: primo(l.sconto, l.percentuale, 0),
    soglia: Number.isInteger(l.soglia) ? l.soglia : cent(primo(l.soglia_spesa, l.soglia, 0))
  }));

  const cliente = {
    ...s.cliente,
    credito: Number.isInteger(s.cliente.credito) && s.cliente.credito > 1000
               ? s.cliente.credito : cent(s.cliente.credito),
    speso_totale: cent(s.cliente.speso_totale)
  };

  const esemplari = (s.esemplari || []).map(e => {
    const a = pezzo(e.articolo);
    return {...e,
      id: primo(e.id, e.codice),
      nome: primo(e.nome, a && a.nome, e.articolo),
      materia: primo(e.materia, a && a.materia, ""),
      foto: primo(e.foto, a && a.foto, null)};
  });

  const movimenti = (s.movimenti_credito || []).map((m, i) => ({
    ...m,
    id: primo(m.id, "mc-" + (i+1)),
    importo: cent(m.importo),
    segno: (Number(m.importo) || 0) < 0 ? -1 : +1,
    causale: primo(m.causale, m.motivo, m.tipo, "")
  }));

  const ricorrenze = (s.ricorrenze || []).map(r => ({
    ...r,
    titolo: primo(r.titolo, r.etichetta, ""),
    nota: primo(r.nota, r.anno ? "dal " + r.anno : "", ""),
    avviso: r.avviso && typeof r.avviso === "object" ? r.avviso.giorno : r.avviso
  }));

  /* la lista: solo gli id degli articoli, nell'ordine di priorita' */
  const wishlist = (s.wishlist || []).map(w =>
    typeof w === "string" ? w : primo(w.articolo, w.id)).filter(Boolean);

  const arrivi = (s.arrivi || []).map(x => {
    if(typeof x === "string") x = {articolo:x};
    const a = pezzo(x.articolo) || {};
    return {...x,
      id: primo(x.id, x.articolo, a.id),
      nome: primo(x.nome, a.nome, x.articolo),
      materia: primo(x.materia, a.materia, ""),
      prezzo: primo(x.prezzo, a.prezzo, 0),
      foto: primo(x.foto, a.foto, null)};
  }).filter(x => x.id);

  return {
    versione_schema: primo(s.versione_schema, 1),
    /* i dati non portano un `id`: glielo si da' qui, e serve a una cosa
       sola — se cambia, lo stato salvato di una demo vecchia non viene
       riletto per una demo nuova. */
    id: primo(s.id, "regina-" + primo(s.versione_schema, 1)),
    cliente, livelli, esemplari,
    movimenti_credito: movimenti,
    ricorrenze, wishlist,
    preferenze: {...(s.preferenze || {})},
    notifiche: (s.notifiche || []).map(n => ({...n})),
    arrivi,
    promozioni: s.promozioni || []
  };
}
