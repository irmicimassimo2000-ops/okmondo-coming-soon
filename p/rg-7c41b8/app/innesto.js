/* ═══════════════════════════════════════════════════════════════════
   app/innesto.js — L'INNESTO FRA I DATI VERI E LA SCOCCA.

   L'interfaccia dichiarata per F0.1 era:
     seme.js       export const seme = {versione_schema, cliente, livelli,
                     esemplari, movimenti_credito, ricorrenze, wishlist,
                     preferenze, notifiche, arrivi}
     catalogo.js   export const catalogo = [...]
     collezioni.js export const collezioni = {...}

   Quello che è arrivato davvero da `app/dati/` è più ricco e con
   un'altra forma: esportazioni nominate una per campo invece di un solo
   oggetto `seme`, `ARTICOLI` invece di `catalogo`, `COLLEZIONI` come
   ARRAY invece che come mappa, i prezzi e il credito in EURO invece che
   in centesimi, gli esemplari con `codice` invece di `id`, le
   ricorrenze con `etichetta` invece di `titolo`, gli arrivi e la lista
   che puntano a un articolo per riferimento invece di portarselo
   dietro.

   Questo file è il punto UNICO dove le due forme si incontrano, ed è
   di qua: i dati sono di un altro esecutore e non si toccano. Meglio un
   innesto dichiarato in un file solo che trenta letture difensive
   sparse per le viste — quelle non si trovano più quando la forma
   cambia di nuovo.

   Due conversioni contano più delle altre:
   · I SOLDI DIVENTANO CENTESIMI INTERI. 39,00 € in virgola mobile
     sommato dodici volte non fa 468,00: fa 467,99999999999994. In
     un'app che mostra un credito da scalare quella cifra si vede.
   · LA LISTA DIVENTA UN ELENCO DI ID. Lo store di F0.1 tratta la
     wishlist come un insieme di articoli (`wishlist/aggiungi {id}`),
     mentre i dati portano record con priorita', visibilita' e token da
     girare a chi paga. Qui si tiene solo l'id — e in F4, quando la
     lista sarà una schermata e non una riga, l'evento dovra' portare
     il record intero. È un debito, ed è scritto.
   ═══════════════════════════════════════════════════════════════════ */

const cent = (euro) => Math.round((Number(euro) || 0) * 100);
const primo = (...v) => v.find(x => x !== undefined && x !== null);

/* ── GLI SCATTI, AL PLURALE ────────────────────────────────
   `catalogo.js` porta `foto: [{tipo, src, didascalia}]` - più scatti
   veri seguiti dal provino in tre dimensioni, che non ha `src` perché
   non è un file. Il seme, per gli esemplari, può portare la stessa
   forma o un elenco di indirizzi.
   Fino a ieri l'innesto SCHIACCIAVA quell'elenco su un indirizzo solo, e
   la galleria della scheda aveva sempre una pagina: `vetrina.js` sa già
   leggere `scatti` (lo dice il commento di `scattiDi`) e non trovava
   niente da leggere. Qui l'elenco si conserva accanto al `foto`
   singolo - nessuno perde niente, e chi sa contare le pagine le trova.
   Restano solo le voci con un indirizzo vero: il provino 3D non è una
   pagina di galleria, e un riquadro vuoto in un carosello si legge come
   una fotografia che non ha caricato. */
function scattiDi(grezzo){
  const da = Array.isArray(grezzo) ? grezzo : null;
  if(!da) return null;
  const v = da
    .map(f => typeof f === "string" ? {tipo:"scatto", src:f, didascalia:null}
            : (f && f.src) ? {tipo: f.tipo || "scatto", src: f.src,
                              didascalia: f.didascalia || null} : null)
    .filter(Boolean);
  return v.length ? v : null;
}

/* ── IL CATALOGO ───────────────────────────────────────────────────
   Si tengono TUTTI i campi originali e si aggiungono i tre che la
   scocca sa leggere: `prezzo` in centesimi, `foto` come indirizzo
   singolo, `tipo` come nome della famiglia. Niente si butta: F4
   lavorera' sui campi ricchi. */
export function innestaCatalogo(mod, provini){
  const grezzo = mod && (mod.catalogo || mod.ARTICOLI || mod.default);
  if(!Array.isArray(grezzo)) return null;
  /* IL PROVINO ARRIVA COME MODULO, non come import: questo file è il
     punto dove le forme si incontrano, e un innesto che si tira dietro le
     proprie dipendenze non si può più provare da solo in node. Chi non
     lo passa non perde niente - le card restano come prima. */
  const provino = (provini && (provini.provinoDi ||
    ((id) => (provini.PROVINI || provini.default || {})[id] || null))) || (() => null);
  return grezzo.map(a => {
    const veri = scattiDi(a.scatti) || scattiDi(a.foto) ||
                 scattiDi(a.foto_url ? [a.foto_url] : null) || [];
    /* IL PROVINO VA IN CODA, MAI IN TESTA. È un fotogramma della scena
       in tre dimensioni, non uno scatto: dove c'è una fotografia vera,
       la fotografia vera viene prima e il provino è l'ultima pagina
       della galleria. Dove non c'è (ventinove articoli su
       trentaquattro), il provino È la card - e una card con un provino
       dichiarato è meglio di un rettangolo vuoto. */
    const prov = provino(a.id);
    const scatti = (prov && !veri.some(x => x.src === prov))
      ? [...veri, {tipo:"provino3d", src:prov,
                   didascalia:"Il pezzo vero, in tre dimensioni."}]
      : veri;
    const vera = primo(a.foto_url, typeof a.foto === "string" ? a.foto : null,
                       (veri[0] || {}).src, null);
    return {
      ...a,
      id: a.id,
      prezzo: a.prezzo !== undefined && Number.isInteger(a.prezzo)
                ? a.prezzo : cent(primo(a.prezzo_vendita, a.prezzo, 0)),
      /* `foto` resta UN indirizzo (la cella di elenco ne vuole uno solo)
         e `scatti` porta tutte le pagine. Due campi, due mestieri. */
      foto: primo(vera, prov, null),
      scatti,
      tipo: primo(a.famiglia_nome, a.tipo, a.famiglia, "")
    };
  });
}

/* ── LE COLLEZIONI ─────────────────────────────────────────────────
   Dichiarate come mappa, arrivate come array. Si accetta l'una e
   l'altra e si consegna sempre la mappa: una vista che deve sapere se
   i dati sono un array o un oggetto è una vista che sapra' una cosa
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
  /* `seme` se c'è; altrimenti il default; altrimenti si rimette
     insieme dalle esportazioni nominate, che è come è arrivato. */
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
    /* i propri scatti se ce ne sono (un pezzo consegnato può avere la
       SUA fotografia, non quella di catalogo), altrimenti quelli
       dell'articolo. */
    const scatti = scattiDi(e.scatti) || scattiDi(e.foto) ||
                   (a && a.scatti && a.scatti.length ? a.scatti : null);
    /* l'articolo ha già il provino in coda: l'esemplare lo eredita da
       lì. Se il pezzo ha una fotografia sua, quella resta la prima. */
    return {...e,
      id: primo(e.id, e.codice),
      nome: primo(e.nome, a && a.nome, e.articolo),
      materia: primo(e.materia, a && a.materia, ""),
      foto: primo(typeof e.foto === "string" ? e.foto : null,
                  a && a.foto, scatti ? scatti[0].src : null, null),
      scatti: scatti || []};
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
  /* IL RECORD INTERO, DA PARTE. La forma dell'evento di store resta
     `{id}` (e il debito sopra resta scritto), ma buttare priorita',
     note, token e — soprattutto — un'eventuale SCADENZA della messa da
     parte significa che nessuna vista potrà mai dire «fino al 22/09»
     senza rileggersi i dati da sola. Si tiene la mappa accanto:
     l'elenco del cofanetto (F2.4) la interroga, chi non la conosce non
     se ne accorge. */
  const wishlist_dettagli = {};
  for(const w of s.wishlist || []){
    if(!w || typeof w === "string") continue;
    const id = primo(w.articolo, w.id);
    if(id) wishlist_dettagli[id] = w;
  }

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
    /* IL GIORNO DELLA DEMO. `seme.js` dichiara `oggi` (2026-09-15) e
       tutto il seme è tarato su quella data: le proposte di F5, la
       finestra di quattordici giorni, le scadenze della messa da parte.
       Senza, ogni vista leggeva l'orologio vero e la demo invecchiava
       da sola - <in vetrina da giovedì> su un giovedì passato. Chi
       non lo trova continua a leggere `new Date()`: è un DI PIÙ, non
       un obbligo. */
    oggi: primo(s.oggi, null),
    /* i dati non portano un `id`: glielo si da' qui, e serve a una cosa
       sola — se cambia, lo stato salvato di una demo vecchia non viene
       riletto per una demo nuova. */
    id: primo(s.id, "regina-" + primo(s.versione_schema, 1)),
    cliente, livelli, esemplari,
    movimenti_credito: movimenti,
    ricorrenze, wishlist, wishlist_dettagli,
    preferenze: {...(s.preferenze || {})},
    notifiche: (s.notifiche || []).map(n => ({...n})),
    arrivi,
    promozioni: s.promozioni || []
  };
}
