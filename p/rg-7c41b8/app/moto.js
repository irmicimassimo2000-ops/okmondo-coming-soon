/* ═══════════════════════════════════════════════════════════════════
   app/moto.js — IL MOTO, in un posto solo.
   La molla della barra è già approvata (OMEGA 14, ZETA 0,825) e vive
   nel telaio. Questa è LA STESSA molla, riscritta come modulo perché
   la usino anche il foglio, il gesto dal bordo e il toast: una app dove
   due cose si muovono con due leggi diverse si sente, anche se non si
   sa dire perché.
   ═══════════════════════════════════════════════════════════════════ */

export const OMEGA = 14.0, ZETA = 0.825;
export const RIDOTTO = matchMedia("(prefers-reduced-motion: reduce)");

/* ── LA MOLLA ──────────────────────────────────────────────────────
   Oscillatore smorzato integrato a rAF. Prende una velocita' iniziale
   (quella del dito che ha lasciato) e si può interrompere a metà: un
   gesto che non si può interrompere è un video, non un'interfaccia.
   Ritorna un oggetto con `.ferma()` e `.a(nuovaMeta)`. */
export function molla(da, a, opz = {}){
  const w = opz.omega ?? OMEGA, z = opz.zeta ?? ZETA;
  const passo = opz.passo || (() => {});
  const fine  = opz.fine  || (() => {});
  let x = da, v = opz.v0 || 0, meta = a, viva = true, t0 = 0;

  if(RIDOTTO.matches){          /* meno movimento = nessuna molla */
    passo(meta, 0); fine(meta);
    return {ferma(){}, a(){}, get viva(){ return false }};
  }
  function giro(t){
    if(!viva) return;
    const dt = t0 ? Math.min((t - t0) / 1000, 1/30) : 1/60; t0 = t;
    const acc = -w*w*(x - meta) - 2*z*w*v;
    v += acc*dt; x += v*dt;
    if(Math.abs(x - meta) < .4 && Math.abs(v) < 3){
      x = meta; v = 0; viva = false; passo(x, 0); fine(x); return;
    }
    passo(x, v);
    requestAnimationFrame(giro);
  }
  requestAnimationFrame(giro);
  return {
    ferma(){ viva = false; },
    a(m){ meta = m; },
    get viva(){ return viva },
    get v(){ return v }
  };
}

/* ── LA PROIEZIONE ─────────────────────────────────────────────────
   Dove finirebbe una cosa lanciata a `v` px/s se rallentasse con
   decelerazione esponenziale. lambda 0,998 è il valore di UIKit
   (`UIScrollView.DecelerationRate.normal`): il fattore è
   lambda/(1-lambda) = 499 ms di corsa residua.
   Serve per decidere DURANTE il gesto, non alla fine: è la differenza
   fra «ha superato metà» e «stava andando lì». */
export function proietta(v, lambda = 0.998){
  return v * lambda / (1000 * (1 - lambda));
}

/* ── FLIP ──────────────────────────────────────────────────────────
   Si MISURA prima, si misura dopo, e si anima la differenza. Mai `left`
   o `top` in transizione: quelli ricalcolano il layout a ogni
   fotogramma e su un telefono si vedono. */
export function misura(el){ return el.getBoundingClientRect(); }

export function flip(el, prima, poi, opz = {}){
  const dx = prima.left - poi.left, dy = prima.top - poi.top;
  const sx = poi.width  ? prima.width  / poi.width  : 1;
  const sy = poi.height ? prima.height / poi.height : 1;
  if(RIDOTTO.matches || (Math.abs(dx) < .5 && Math.abs(dy) < .5 &&
     Math.abs(sx - 1) < .01 && Math.abs(sy - 1) < .01)) return null;
  return el.animate(
    [{transform:`translate(${dx}px,${dy}px) scale(${sx},${sy})`},
     {transform:"none"}],
    {duration: opz.durata ?? 350, easing: opz.curva ?? "cubic-bezier(.2,.8,.2,1)",
     composite:"replace"});
}

/* ── LA MOLLA, DETTA IN CSS ────────────────────────────────────────
   Safari 17.2 e Chrome 113 accettano `linear(...)` come funzione di
   temporizzazione: si campiona la molla e si consegna al CSS la sua
   forma vera, invece della `cubic-bezier` che la imita e sbaglia la
   coda. Restituisce ANCHE la durata, perché una curva senza la sua
   durata è mezza informazione. */
export function lineare(opz = {}){
  const w = opz.omega ?? OMEGA, z = opz.zeta ?? ZETA, n = opz.punti ?? 24;
  /* durata: quando l'inviluppo e^(-z*w*t) scende sotto lo 0,4% */
  const durata = Math.min(2, Math.log(1/0.004) / (z*w));
  const wd = w * Math.sqrt(Math.max(1 - z*z, 1e-6));
  const p = [];
  for(let i = 0; i <= n; i++){
    const t = durata * i / n;
    const e = Math.exp(-z*w*t);
    const y = 1 - e * (Math.cos(wd*t) + (z*w/wd) * Math.sin(wd*t));
    p.push(y.toFixed(4).replace(/0+$/,"").replace(/\.$/,""));
  }
  p[0] = "0"; p[n] = "1";
  return {curva:"linear(" + p.join(",") + ")", durata:Math.round(durata*1000)};
}
/* pronta all'uso, calcolata una volta */
export const MOLLA_CSS = lineare();

/* ── LE VIEW TRANSITIONS ───────────────────────────────────────────
   Esistono da Safari 18. Le usiamo per i cambi di CONTENUTO dentro una
   vista (un elenco che si riordina, uno stato vuoto che si riempie):
   lì il DOM cambia davvero e la transizione nativa è migliore di
   qualunque FLIP scritto a mano.
   NON le usiamo per il cambio di tab né per il push: una transizione
   nativa è uno scatto fotografico che non si può interrompere, e il
   gesto dal bordo deve seguire il dito 1:1 in ogni istante. */
export function conTransizione(fn){
  if(RIDOTTO.matches || !document.startViewTransition){ fn(); return Promise.resolve(); }
  const t = document.startViewTransition(fn);
  /* SI SPENGONO TUTTE E TRE LE PROMESSE, non solo `finished`. Quando
     una seconda transizione parte prima che la prima sia pronta, il
     browser SALTA la prima e rifiuta la sua `ready` con un AbortError:
     nessuno l'ascolta, e finisce come errore di pagina — un rosso nel
     collaudo per una cosa che è successa apposta. Capita ogni volta
     che due eventi di store arrivano ravvicinati. */
  t.ready.catch(() => {});
  t.updateCallbackDone.catch(() => {});
  return t.finished.catch(() => {});
}

/* ── IL TEMPO CHE PASSA, se serve aspettarlo ── */
export const attesa = (ms) => new Promise(r => setTimeout(r, ms));
/* due fotogrammi: uno per far esistere l'elemento, uno per farlo
   misurare dal browser prima di cambiargli la classe. */
export const dueGiri = () => new Promise(r =>
  requestAnimationFrame(() => requestAnimationFrame(r)));
