/* La Tavola dell'Ultima Notte · app-film
   Il film 3D spezzato in battute, comandato dal tocco. JS puro, nessuna libreria.

   PER SOSTITUIRE I CLIP DEFINITIVI A 1080: sovrascrivere i file in clip/ e poster/ con gli
   stessi nomi (stessi tempi). Nient'altro da toccare. Voce: audio/f0..f8.mp3.
   SOTTOFONDO: quando il file esiste, mettere audio/sottofondo.mp3 e impostare SOTTOFONDO qui sotto
   (con null non si richiede nulla, quindi nessun 404 in console). Per provare senza toccare il codice:
   ?sf=audio/sottofondo.mp3 */

const SOTTOFONDO = 'audio/sottofondo.mp3';               // 'audio/sottofondo.mp3' quando il file c'e'
const VOL_FONDO = 0.22;                // volume del sottofondo
const VOL_FONDO_VOCE = 0.07;           // abbassamento mentre parla la voce
const MS_INVITO = 600;                 // attesa prima dell'invito a toccare
const S_GUARDIA = 1.0;                 // nei primi secondi di un clip i tocchi non fanno nulla (giro del foglio)

/* voceA = secondi dall'inizio del clip (TEMPI-v2: inizio voce - inizio battuta, battuta arrotondata al fotogramma) */
const CLIP = [
  { id: 'intro', voce: 'f0', voceA: 2.500, testo: ['La Tavola dell’Ultima Notte', 'Menù del Gran Cenone di San Silvestro'] },
  { id: 'p1', voce: 'f1', voceA: 2.892, testo: ['C’era una volta l’ultima notte dell’anno. Ogni dicembre arrivava a una casa di pietra chiara, in fondo a un viale di candele, e ogni volta trovava la tavola pronta.'] },
  { id: 'p2', voce: 'f2', voceA: 1.995, testo: ['Capitolo primo · Il forno', 'Prima ancora di aprire la porta, la notte sentì il profumo del pane.',
      '- Centrali di Focaccia della Casa ai Pomodorini: soffice impasto lievitato naturalmente con pomodorini dolci e origano',
      '- Focaccia Golosa con Patate e Stracciatella: croccante fuori e morbida dentro, mantecata a crudo con stracciatella pugliese'] },
  { id: 'p3', voce: 'f3', voceA: 2.010, testo: ['Capitolo secondo · Il benvenuto', 'Le fecero posto, e la tavola cominciò a raccontare.',
      '- Centrali di Veli di Prosciutto Crudo di Parma 16 Mesi: serviti con pere Williams fresche marinate al timo',
      '- Lonzino di Maiale Cotto a Bassa Temperatura: su letto di rucola selvatica e scaglie di Grana Padano',
      '- Carpaccio di Manzo: condito con emulsione alla citronette, miele millefiori e gherigli di noci sabbiati',
      '- Cheesecake Salata: base croccante con crema soffice di ricotta e Mortadella Bologna IGP'] },
  { id: 'p4', voce: 'f4', voceA: 1.988, testo: ['Capitolo terzo · Il casaro', 'C’era un casaro che intrecciava il latte a mano, e a ogni nodo legava un desiderio.',
      '- Centrali di Burratine Artigianali: adagiate su un giardino di foglie tenere e scorze di limone candito',
      '- Ricottine Fresche: impreziosite da chicchi di melograno augurali e riduzione di vincotto',
      '- Nodi di Fior di Latte Pugliese: intrecciati a mano e serviti al naturale'] },
  { id: 'p5', voce: 'f5', voceA: 1.983, testo: ['Capitolo quarto · Il calore', 'Poi arrivò il piatto che scalda, e nessuno guardò più l’orologio.',
      '- Lasagnetta impiattata con Salsiccia e Funghi di Stagione: con sugo di pomodorino del Piennolo scoppiettato al basilico fresco'] },
  { id: 'p6', voce: 'f6', voceA: 1.980, testo: ['Capitolo quinto · La promessa', 'Dicono che ogni lenticchia sia una moneta per l’anno che viene. Quella notte nessuno le contò.',
      '- Centrali di Medaglione di Cotechino Artigianale: servito su soffice letto di lenticchie stufate agli aromi'] },
  { id: 'p7', voce: 'f7', voceA: 2.020, testo: ['Capitolo sesto · La dolcezza', 'Restava un’ultima pagina, e profumava di festa.', '- Dolci lievitati della tradizione natalizia'] },
  { id: 'p8', voce: 'f8', voceA: 2.017, testo: ['Il finale non è ancora scritto. Si scrive a mezzanotte, a tavola.'] },
  { id: 'fine', voce: null, voceA: 0, testo: ['31 dicembre · Feudo della Selva, Foggia'] },
];
const N = CLIP.length;                 // 10
const url = (i) => `clip/${CLIP[i].id}.mp4`;
const poster = (i) => `poster/${CLIP[i].id}-in.jpg`;

const $ = (id) => document.getElementById(id);
const palco = $('palco');
const vids = [$('v0'), $('v1')];
const q = new URLSearchParams(location.search);
const ingresso = 'a';   // «il libro al buio», scelta di Massimo 25/11/2026
document.body.dataset.ingresso = ingresso;
palco.dataset.ingresso = ingresso;
const sfUrl = q.get('sf') || SOTTOFONDO;
const riduci = matchMedia('(prefers-reduced-motion: reduce)').matches;

let stato = 'ingresso';                // ingresso | carico | gioca | tenuta | errore | fine
let idx = -1;                          // clip corrente
let fronte = 1;                        // indice del video davanti (il primo clip si carica in v0)
let audioOn = true;
let t0 = 0;                            // quando e' partito il clip (performance.now)
let token = 0;                         // invalida i callback di un clip superato
let timerInvito = 0;

/* ---------- tacche e testo accessibile ---------- */
const tacche = $('tacche');
for (let i = 0; i < N; i++) tacche.appendChild(document.createElement('span'));
function aggiornaTacche() {
  [...tacche.children].forEach((li, i) => { li.className = i < idx ? 'fatta' : i === idx ? 'ora' : ''; });
  tacche.setAttribute('aria-valuenow', Math.max(idx, 0) + 1);
  tacche.setAttribute('aria-valuetext', `Pagina ${Math.max(idx, 0) + 1} di ${N}`);
  $('indietro').disabled = idx <= 0 || stato === 'ingresso';
}
function annuncia(i) {
  const box = $('testo');
  box.textContent = '';
  CLIP[i].testo.forEach((riga) => { const p = document.createElement('p'); p.textContent = riga; box.appendChild(p); });
}

/* ---------- audio: voce su due elementi sbloccati, sottofondo su Web Audio ---------- */
const SILENZIO = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAABErAAABAAgAZGF0YQAAAAA=';
const voci = [new Audio(), new Audio()];
voci.forEach((a) => { a.preload = 'auto'; a.setAttribute('playsinline', ''); });
let vociIdx = 0;
let ctx = null, gain = null, fondo = null, fondoPronto = false;

function sbloccaAudio() {
  voci.forEach((a) => { a.src = SILENZIO; const p = a.play(); if (p) p.catch(() => {}); });
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    gain = ctx.createGain(); gain.gain.value = 0; gain.connect(ctx.destination);
    if (ctx.state === 'suspended') ctx.resume();
  } catch (e) { ctx = null; }
  if (sfUrl && ctx) {
    fondo = new Audio();
    fondo.loop = true; fondo.preload = 'auto'; fondo.crossOrigin = 'anonymous';
    fondo.addEventListener('error', () => { fondoPronto = false; }, { once: true });
    fondo.src = sfUrl;
    try { ctx.createMediaElementSource(fondo).connect(gain); fondoPronto = true; } catch (e) { fondoPronto = false; }
    const p = fondo.play(); if (p) p.catch(() => {});
  }
}
function volFondo(v, s) {
  if (!ctx || !gain || !fondoPronto) return;
  gain.gain.cancelScheduledValues(ctx.currentTime);
  gain.gain.setTargetAtTime(audioOn ? v : 0, ctx.currentTime, s / 3);
}
function riparteFondo() { volFondo(VOL_FONDO, 2.5); }

let voceAttiva = null;
function preparaVoce(i) {
  const c = CLIP[i];
  if (!c || !c.voce) return null;
  const a = voci[(vociIdx + 1) % 2];
  const src = `audio/${c.voce}.mp3`;
  if (!a.src.endsWith(src)) { a.src = src; a.load(); }
  return a;
}
function avviaVoce(i) {
  const c = CLIP[i];
  if (!c.voce || !audioOn) return;
  vociIdx = (vociIdx + 1) % 2;
  const a = voci[vociIdx];
  if (!a.src.endsWith(`audio/${c.voce}.mp3`)) { a.src = `audio/${c.voce}.mp3`; }
  a.currentTime = 0;
  voceAttiva = a;
  volFondo(VOL_FONDO_VOCE, 0.5);
  a.onended = () => { if (voceAttiva === a) { voceAttiva = null; volFondo(VOL_FONDO, 1.2); } };
  const p = a.play();
  if (p) p.catch(() => { $('avviso-audio').classList.add('visibile'); });
}
function fermaVoce(dolce) {
  const a = voceAttiva; voceAttiva = null;
  if (!a) return;
  if (!dolce) { a.pause(); return; }
  let v = 1; const f = setInterval(() => { v -= 0.2; if (v <= 0) { clearInterval(f); a.pause(); a.volume = 1; } else a.volume = v; }, 30);
  volFondo(VOL_FONDO, 1.2);
}

/* ---------- video: due elementi sovrapposti, il successivo si precarica sotto ---------- */
function carica(v, i) {
  if (v.dataset.clip === String(i)) return;
  v.dataset.clip = i;
  v.poster = poster(i);
  v.src = url(i);
  v.load();
}
function pronto(v) {
  return new Promise((ok, ko) => {
    if (v.readyState >= 3) return ok();
    const fine = () => { v.removeEventListener('canplay', su); v.removeEventListener('error', giu); };
    const su = () => { fine(); ok(); };
    const giu = () => { fine(); ko(new Error('rete')); };
    v.addEventListener('canplay', su); v.addEventListener('error', giu);
  });
}

async function vai(i) {
  const mio = ++token;
  clearTimeout(timerInvito);
  $('invito').classList.remove('visibile');
  $('velo-errore').classList.remove('visibile');
  $('chiusura').classList.remove('pronta', 'visibile');
  fermaVoce(true);
  const dietro = 1 - fronte;
  const v = vids[dietro];
  carica(v, i);
  const lento = setTimeout(() => { if (mio === token && v.readyState < 3) $('velo-carico').classList.add('visibile'); }, 700);
  try {
    await pronto(v);
  } catch (e) {
    clearTimeout(lento);
    if (mio !== token) return;
    $('velo-carico').classList.remove('visibile');
    stato = 'errore'; idx = i; aggiornaTacche();
    $('velo-errore').classList.add('visibile'); $('riprova').focus({ preventScroll: true });
    v.dataset.clip = '';
    return;
  }
  clearTimeout(lento);
  if (mio !== token) return;
  $('velo-carico').classList.remove('visibile');
  v.currentTime = 0;
  try { await v.play(); } catch (e) { /* muted: non dovrebbe fallire */ }
  if (mio !== token) return;
  const vecchio = vids[fronte];
  v.className = 'davanti';
  if (vecchio !== v) vecchio.className = 'sotto';
  fronte = dietro;
  idx = i; stato = 'gioca'; t0 = performance.now();
  palco.classList.add('attivo');
  aggiornaTacche(); annuncia(i);
  voceFatta = false;
  // quando il nuovo clip e' a schermo il vecchio si libera e si precarica il successivo
  setTimeout(() => {
    if (mio !== token) return;
    vecchio.className = '';
    if (i + 1 < N) carica(vecchio, i + 1);
    if (i + 1 < N) preparaVoce(i + 1);
  }, 400);
  v.onended = () => { if (mio === token) tenuta(); };
  requestAnimationFrame(controllaVoce);
}

let voceFatta = false;
function controllaVoce() {
  if (stato !== 'gioca') return;
  const v = vids[fronte];
  if (!voceFatta && v.currentTime >= CLIP[idx].voceA) { voceFatta = true; avviaVoce(idx); }
  requestAnimationFrame(controllaVoce);
}

function tenuta() {
  if (idx === N - 1) {
    stato = 'fine';
    palco.classList.remove('attivo');
    const c = $('chiusura');
    c.classList.add('visibile');
    requestAnimationFrame(() => requestAnimationFrame(() => { c.classList.add('pronta'); $('rileggi').focus({ preventScroll: true }); }));
    volFondo(0, 3);
    annuncia(idx);
    return;
  }
  stato = 'tenuta';
  const mio = token;
  if (idx <= 1) timerInvito = setTimeout(() => { if (mio === token) $('invito').classList.add('visibile'); }, MS_INVITO);   // l'invito serve solo sulle prime due pagine
}

/* ---------- gesti ---------- */
function avanti() {
  if (stato === 'tenuta') vai(idx + 1);
  else if (stato === 'gioca' && (performance.now() - t0) / 1000 > S_GUARDIA) {
    // secondo tocco durante un clip: salta alla tenuta (ultimo fotogramma), la voce si spegne in 0,3 s
    const v = vids[fronte];
    fermaVoce(true);
    if (isFinite(v.duration)) v.currentTime = Math.max(0, v.duration - 0.05);
  }
}
function indietro() {
  if (idx <= 0 || stato === 'ingresso' || stato === 'carico') return;
  // indietro = si rilegge la pagina precedente: il suo clip riparte da capo, con la sua voce
  vai(idx - 1);
}

palco.addEventListener('pointerup', (e) => {
  if (e.target.closest('button, a')) return;
  if (stato === 'tenuta' || stato === 'gioca') avanti();
});
document.addEventListener('keydown', (e) => {
  const suBottone = e.target.closest && e.target.closest('button');
  if (e.key === 'ArrowLeft') { e.preventDefault(); indietro(); }
  else if (e.key === 'ArrowRight' || (e.key === ' ' && !suBottone)) { e.preventDefault(); avanti(); }
});

$('indietro').addEventListener('click', indietro);
$('audio').addEventListener('click', () => impostaAudio(!audioOn));
function impostaAudio(on) {
  audioOn = on;
  const b = $('audio');
  b.textContent = on ? 'Voce' : 'Silenzio';
  b.setAttribute('aria-pressed', String(on));
  b.setAttribute('aria-label', on ? 'Voce accesa. Tocca per il silenzio' : 'Silenzio. Tocca per riattivare la voce');
  if (!on) { fermaVoce(true); volFondo(0, 0.4); }
  else { $('avviso-audio').classList.remove('visibile'); if (ctx && ctx.state === 'suspended') ctx.resume(); if (fondo && fondo.paused) fondo.play().catch(() => {}); riparteFondo(); }
}
$('attiva-audio').addEventListener('click', () => {
  $('avviso-audio').classList.remove('visibile');
  sbloccaAudio(); impostaAudio(true);
  if (stato === 'gioca') { voceFatta = false; }
});
$('riprova').addEventListener('click', () => vai(idx));
$('rileggi').addEventListener('click', () => { idx = -1; vai(0); riparteFondo(); });

/* ---------- ingresso ---------- */
function entra(conAudio) {
  if (stato !== 'ingresso' && stato !== 'carico') return;
  const sez = $('ing-' + ingresso);
  sbloccaAudio();
  impostaAudio(conAudio);
  stato = 'carico';
  sez.querySelectorAll('.leggi').forEach((b) => b.setAttribute('aria-busy', 'true'));
  const intro = vids[0];
  carica(intro, 0);
  pronto(intro).then(() => {
    sez.classList.add('esce');
    setTimeout(() => { sez.style.display = 'none'; }, riduci ? 0 : 1150);
    if (conAudio) volFondo(VOL_FONDO, 2.5);
    vai(0);
  }).catch(() => {
    sez.querySelectorAll('.leggi').forEach((b) => b.removeAttribute('aria-busy'));
    stato = 'ingresso';
    $('velo-errore').classList.add('visibile');
    $('riprova').onclick = () => { $('velo-errore').classList.remove('visibile'); intro.dataset.clip = ''; entra(conAudio); };
  });
}
document.querySelectorAll('.ing .leggi').forEach((b) => b.addEventListener('click', () => entra(true)));
document.querySelectorAll('.ing .silenzio').forEach((b) => b.addEventListener('click', () => entra(false)));
document.querySelectorAll('.ing .silenzio-b').forEach((b) => b.addEventListener('click', () => entra(false)));

/* il primo clip si precarica gia' sulla schermata d'ingresso */
$('velo-carico').classList.remove('visibile');
carica(vids[0], 0);
aggiornaTacche();

document.addEventListener('visibilitychange', () => {
  const v = vids[fronte];
  if (document.hidden) { if (stato === 'gioca') v.pause(); if (voceAttiva) voceAttiva.pause(); if (fondo) fondo.pause(); }
  else { if (stato === 'gioca') v.play().catch(() => {}); if (voceAttiva) voceAttiva.play().catch(() => {}); if (fondo && audioOn) fondo.play().catch(() => {}); }
});
