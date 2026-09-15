/* ═══════════════════════════════════════════════════════════════════
   app/stato.js — LO STATO, uno solo, e si cambia solo mandandogli un
   evento. Nessuna vista tocca i dati: manda `invia("wishlist/aggiungi",
   …)` e aspetta di essere richiamata. E' l'unica disciplina che tiene
   insieme quattro sezioni, un iframe in tre dimensioni e un foglio che
   scrive — senza la quale, fra due settimane, ognuno scrive dove capita.

   Persistenza: localStorage, chiave `regina:v1`, scritta con 50 ms di
   attesa perche' dieci tocchi di fila non diventino dieci scritture su
   disco. La forma e' {v, semeId, aggiornatoIl, dati} — la versione sta
   FUORI dai dati cosi' la si legge senza doverli capire.
   ═══════════════════════════════════════════════════════════════════ */

export const CHIAVE = "regina:v1";
export const V = 1;                 /* la versione dello schema salvato */
export const CANALE = "regina";     /* il BroadcastChannel dell'app */

/* ── LE MIGRAZIONI, A CATENA ───────────────────────────────────────
   Ogni passo porta da una versione alla successiva e basta. Non si
   scrive mai «se vengo dalla 1 o dalla 2 allora…»: si scrive la 1→2 e
   la 2→3, e la catena fa il resto. */
const PASSI = {
  /* 0 → 1 : la prima forma. Qui non c'e' ancora niente da spostare;
     resta come esempio della forma che avranno i passi veri. */
  0: (d) => d
};
export function migra(dati, daV){
  let d = dati, v = daV;
  while(v < V){ const p = PASSI[v]; if(!p) return null; d = p(d); v++; }
  return d;
}

/* ── LA FORMA DEI DATI ─────────────────────────────────────────────
   Dal seme nascono i dati; la navigazione ci sta dentro perche' le
   viste possano leggerla come tutto il resto, ma la verita' della
   navigazione resta l'indirizzo (vedi rotta.js): allo avvio il
   navigatore riscrive questi campi. */
function daSeme(seme){
  return {
    cliente: seme.cliente,
    livelli: seme.livelli || [],
    esemplari: (seme.esemplari || []).map(e => ({...e, rimosso:false})),
    movimenti_credito: seme.movimenti_credito || [],
    ricorrenze: seme.ricorrenze || [],
    wishlist: [...(seme.wishlist || [])],
    preferenze: {...(seme.preferenze || {})},
    notifiche: (seme.notifiche || []).map(n => ({...n})),
    arrivi: seme.arrivi || [],
    promozioni: seme.promozioni || [],
    nav: {tab:"cofanetto", pile:{cofanetto:[],vetrina:[],perte:[],profilo:[]}}
  };
}

/* ── IL RIDUTTORE ──────────────────────────────────────────────────
   Immutabile a un livello: si ricostruisce l'oggetto e si ricopia il
   solo ramo toccato. Non e' purismo — e' il motivo per cui un
   `iscrivi` puo' confrontare `prima.wishlist !== dopo.wishlist` e
   sapere in un colpo se deve ridisegnare. */
function riduci(s, e){
  const {tipo, dato} = e;
  switch(tipo){

    case "nav/tab":
      if(s.nav.tab === dato.tab) return s;
      return {...s, nav:{...s.nav, tab:dato.tab}};

    case "nav/push":{
      const p = {...s.nav.pile};
      p[dato.tab] = [...(p[dato.tab] || []), dato.rotta];
      return {...s, nav:{...s.nav, pile:p}};
    }
    case "nav/pop":{
      const p = {...s.nav.pile};
      p[dato.tab] = (p[dato.tab] || []).slice(0, -1);
      return {...s, nav:{...s.nav, pile:p}};
    }

    case "wishlist/aggiungi":
      if(s.wishlist.includes(dato.id)) return s;
      return {...s, wishlist:[...s.wishlist, dato.id]};
    case "wishlist/togli":
      if(!s.wishlist.includes(dato.id)) return s;
      return {...s, wishlist:s.wishlist.filter(x => x !== dato.id)};

    case "preferenze/fodera":
      if(s.preferenze.fodera === dato.fodera) return s;
      return {...s, preferenze:{...s.preferenze, fodera:dato.fodera}};

    case "esemplare/rimosso":
    case "esemplare/ripristinato":{
      const via = tipo === "esemplare/rimosso";
      let toccato = false;
      const es = s.esemplari.map(x => {
        if(x.id !== dato.id || x.rimosso === via) return x;
        toccato = true; return {...x, rimosso:via};
      });
      return toccato ? {...s, esemplari:es} : s;
    }

    case "notifica/letta":{
      let toccato = false;
      const nt = s.notifiche.map(n => {
        if(n.id !== dato.id || n.letta) return n;
        toccato = true; return {...n, letta:true};
      });
      return toccato ? {...s, notifiche:nt} : s;
    }

    case "demo/reset":
      return daSeme(dato.seme);

    default:
      return s;
  }
}

/* ── IL NEGOZIO ────────────────────────────────────────────────────── */
let stato = null, seme = null, semeId = "", canale = null;
const iscritti = new Set();
let attesaScrittura = 0, zitto = false;

export const leggi = () => stato;
export const ilSeme = () => seme;

export function iscrivi(fn){ iscritti.add(fn); return () => iscritti.delete(fn); }

export function invia(tipo, dato = {}, opz = {}){
  const prima = stato;
  stato = riduci(stato, {tipo, dato});
  /* si avvisa SEMPRE, anche quando lo stato non e' cambiato: chi manda
     un evento vuole sapere che e' arrivato. Chi ridisegna confronta i
     rami e non fa niente se sono gli stessi. */
  for(const fn of iscritti){ try{ fn(stato, {tipo, dato}, prima); }catch(err){ console.error(err); } }
  if(stato !== prima) persisti();
  if(!opz.locale) diffondi({t:tipo, d:dato});
  return stato;
}

function persisti(){
  clearTimeout(attesaScrittura);
  attesaScrittura = setTimeout(() => {
    try{
      localStorage.setItem(CHIAVE, JSON.stringify(
        {v:V, semeId, aggiornatoIl:new Date().toISOString(), dati:stato}));
    }catch(_){ /* modalita' privata, quota piena: l'app resta viva */ }
  }, 50);
}

/* ── IL CANALE ─────────────────────────────────────────────────────
   Un solo BroadcastChannel("regina"), condiviso con l'iframe del banco
   in tre dimensioni. Il contratto dei messaggi sta in ponte.js. */
function diffondi(msg){
  try{ canale && canale.postMessage({da:"scocca", ...msg}); }catch(_){}
}
export const ilCanale = () => canale;

/* ── L'AVVIO ───────────────────────────────────────────────────────── */
export function avvia(semeScelto){
  seme = semeScelto; semeId = semeScelto.id || "?";
  const q = new URLSearchParams(location.search);

  if(q.get("reset") === "1"){
    try{ localStorage.removeItem(CHIAVE); }catch(_){}
    q.delete("reset");
    const resto = q.toString();
    history.replaceState(null, "",
      location.pathname + (resto ? "?" + resto : "") + location.hash);
    stato = daSeme(seme);
  } else {
    stato = ricarica() || daSeme(seme);
  }

  try{ canale = new BroadcastChannel(CANALE); }catch(_){ canale = null; }
  if(canale) canale.onmessage = (ev) => {
    const m = ev.data;
    if(!m || m.da === "scocca") return;      /* mai la propria eco */
    /* un messaggio che arriva da fuori entra come un evento qualunque,
       ma NON riparte sul canale: due schede che si rimbalzano lo stesso
       evento sono un ciclo, e un ciclo si vede solo quando e' tardi. */
    if(m.t) invia(m.t, m.d || {}, {locale:true});
  };

  /* Safari tiene la pagina in memoria e la rianima al tasto indietro:
     con la bfcache lo stato in RAM puo' essere piu' vecchio di quello
     su disco, scritto da un'altra scheda. Si ricarica. */
  addEventListener("pageshow", (ev) => { if(ev.persisted) location.reload(); });

  return stato;
}

function ricarica(){
  let grezzo = null;
  try{ grezzo = localStorage.getItem(CHIAVE); }catch(_){ return null; }
  if(!grezzo) return null;
  let b;
  try{ b = JSON.parse(grezzo); }catch(_){ return null; }
  if(!b || typeof b !== "object" || !b.dati) return null;
  if(b.semeId && b.semeId !== semeId) return null;   /* altro seme, altra demo */
  const d = b.v === V ? b.dati : migra(b.dati, b.v | 0);
  if(!d) return null;
  /* i campi che il seme puo' aver arricchito dopo il salvataggio (una
     ricorrenza nuova, un arrivo nuovo) NON si tengono da localStorage:
     quelli sono catalogo, non scelte della persona. */
  return {...d,
    livelli: seme.livelli || d.livelli,
    ricorrenze: seme.ricorrenze || d.ricorrenze,
    arrivi: seme.arrivi || d.arrivi,
    promozioni: seme.promozioni || d.promozioni || [],
    cliente: {...(seme.cliente||{}), ...(d.cliente||{})},
    nav: d.nav || {tab:"cofanetto", pile:{cofanetto:[],vetrina:[],perte:[],profilo:[]}}};
}

/* ── UN COMODO: i soldi ────────────────────────────────────────────
   I centesimi si formattano in un posto solo, altrimenti fra tre file
   ci sono tre virgole diverse. */
export const soldi = (cent) =>
  (cent / 100).toLocaleString("it-IT", {minimumFractionDigits:2}) + " €";
