/* A5 = A4 + correzioni del critic (stati di caricamento/errore, focus, prezzo onesto, ruoli, note). Strati serviti da strati_a4/ (non duplicati).
   Motore del configuratore, versione 4 (A4 = A3 + gli strati del lotto del 12/11: tutte le 504 combinazioni hanno gli strati veri; scatola e insegna per fondo; sei colori misurati; caricamento per priorità).
   Versione 3 (giro 2 di rifinitura della direzione A «Creatore»; A3: casuale su tutte le scelte valide, prezzo con spiegazione, nota giorno).
   Versione 2 (giro 1 di rifinitura della direzione A «Creatore»).
   Novità rispetto a core.js: l'anteprima si risolve PER DIMENSIONE (fondo, luce, vista, bordo, colore), non per stato intero:
   mostra sempre la combinazione con strati veri più vicina a ciò che il cliente ha scelto e DICE sull'immagine che cosa ha sostituito.
   Caricamento progressivo degli strati; casuale con blocchi su tutte le categorie. Nessuna libreria. */
'use strict';
(function () {
  const NUM = '393773621181';
  const COL = [
    { v: 'marrone', t: 'Marrone', hex: '#7b5944' },
    { v: 'nero', t: 'Nero', hex: '#1c1c1c' },
    { v: 'grigio', t: 'Grigio', hex: '#6d7072' },
    { v: 'verde', t: 'Verde', hex: '#33603f' },
    { v: 'bordeaux', t: 'Bordeaux', hex: '#6e2230' },
    { v: 'sabbia', t: 'Sabbia', hex: '#b9a27a' }
  ];
  const OPT = {
    costr: [{ v: 'scatolata', t: 'Scatola a vetrina' }, { v: 'pannello', t: 'Pannello unico' }],
    luce: [{ v: 'alone', t: 'Alone' }, { v: 'accese', t: 'Lettere accese' }],
    fondo: [{ v: 'none', t: 'Nessuno' }, { v: 'erba', t: 'Erba' }, { v: 'matt', t: 'Fondo a mattoncino' }],
    stile: [{ v: 'liscio', t: 'Liscio' }, { v: 'merlato', t: 'Merlato' }, { v: 'archetti', t: 'Ad archetti' }, { v: 'corda', t: 'A corda' },
      { v: 'pietra', t: 'A pietra' }, { v: 'buche', t: 'Bucherellato' }, { v: 'matt', t: 'Bordo a mattoncino' }],
    col: COL,
    w: [{ v: '100', t: '100 cm' }, { v: '120', t: '120 cm' }],
    vista: [{ v: 'sera', t: 'Sera' }, { v: 'giorno', t: 'Giorno' }]
  };
  /* categorie del pannello; `dims` = dimensioni dello stato che governa */
  const CAT = [
    { k: 'costr', t: 'Scatola', dims: ['costr'] },
    { k: 'luce', t: 'Luce', dims: ['luce'] },
    { k: 'fondo', t: 'Fondo', dims: ['fondo'] },
    { k: 'stile', t: 'Bordo', dims: ['stile'] },
    { k: 'col', t: 'Colore', dims: ['col'] },
    { k: 'w', t: 'Misura', dims: ['w'] },
    { k: 'vista', t: 'Vista', dims: ['vista'] }
  ];
  const KEYS = { costr: 'c', luce: 'l', fondo: 'f', stile: 's', col: 'k', w: 'w', vista: 'v' };
  const DEF = { costr: 'scatolata', luce: 'accese', fondo: 'none', stile: 'liscio', col: 'marrone', w: '100', vista: 'sera' };

  /* strati serviti da strati_a4/ (copia di lotto/strati_web). Il collaudo verifica ogni nome via HTTP: nessuno strato dichiarato che non esista. */
  const EXT = new URLSearchParams(location.search).get('ext') === 'png' ? 'png' : 'webp';   /* webp lossless; ?ext=png solo per il confronto */
  const FN = [];
  const V2 = ['sera', 'giorno'], L2 = ['alone', 'accese'], F3 = ['none', 'erba', 'matt'], S7 = ['liscio', 'merlato', 'archetti', 'corda', 'pietra', 'buche', 'matt'];
  FN.push('T_mul'); V2.forEach(v => FN.push('wall_' + v, 'reflc_' + v)); L2.forEach(l => FN.push('WL_none_' + l + '_sera'));
  V2.forEach(v => { S7.forEach(s => FN.push('SH_' + s + '_' + v, 'ring_' + s + '_' + v)); L2.forEach(l => F3.forEach(f => FN.push('fondo_' + f + '_' + l + '_' + v, 'shell_' + f + '_' + l + '_' + v, 'ins_' + f + '_' + l + '_' + v))); });
  const FILES = new Set(FN);
  /* albedo lineare della cornice (sei colori misurati nel lotto, ESITO-LOTTO): marrone e nero ASA, gli altri dall'hex della tavolozza; la scatola è resa neutra a 0,5 e qui si moltiplica */
  const s2l = c => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  const hexl = h => [1, 3, 5].map(i => s2l(parseInt(h.slice(i, i + 2), 16) / 255));
  const ASA = { marrone: [.20, .10, .055], nero: [.02, .02, .02] };
  COL.forEach(c => { if (!ASA[c.v]) ASA[c.v] = hexl(c.hex); });
  const tintOf = t => 'rgb(' + ASA[t].map(a => Math.round(255 * Math.pow(a / .5, 1 / 2.2))).join(',') + ')';

  /* Speculare separato (cornice e scatola): somma lineare in canvas, al posto della tinta multiply che tinge anche i riflessi.
     pixel = sRGB( max(lin(N) - lin(S), 0) * (albedo / 0,5) + lin(S) ), con N = strato neutro, S = solo speculare (resi nel lotto). Modo: ?spec=1 (predefinito) | giorno | 0 (solo tinta CSS, per il confronto). Se il canvas non riesce, resta la tinta CSS. */
  const SPECMODE = (new URLSearchParams(location.search).get('spec')) || '1';
  const specOn = e => SPECMODE === '1' || (SPECMODE === 'giorno' && e.vista === 'giorno');
  const SPECF = new Set(); V2.forEach(v => { S7.forEach(s => SPECF.add('specring_' + s + '_' + v)); L2.forEach(l => SPECF.add('specshell_' + l + '_' + v)); });
  const specPairs = e => specOn(e) ? [['shell_' + e.fondo + '_' + e.luce + '_' + e.vista, 'specshell_' + e.luce + '_' + e.vista], ['ring_' + e.stile + '_' + e.vista, 'specring_' + e.stile + '_' + e.vista]] : [];
  const S2L = new Float32Array(256); for (let i = 0; i < 256; i++) S2L[i] = s2l(i / 255);
  const L2S = new Uint8ClampedArray(4097); for (let i = 0; i <= 4096; i++) { const c = i / 4096; L2S[i] = Math.round(255 * (c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055)); }
  const label = (cat, v) => (OPT[cat].find(o => o.v === v) || {}).t || v;
  const eff = s => s.costr === 'pannello' ? Object.assign({}, s, { luce: 'accese', fondo: 'none', stile: 'liscio' }) : s;

  /* ---- risoluzione dell'anteprima ---- */
  const needs = e => ['wall_' + e.vista, 'SH_' + e.stile + '_' + e.vista, 'fondo_' + e.fondo + '_' + e.luce + '_' + e.vista, 'shell_' + e.fondo + '_' + e.luce + '_' + e.vista,
    'ins_' + e.fondo + '_' + e.luce + '_' + e.vista, 'ring_' + e.stile + '_' + e.vista];
  const layersOf = e => { const n = needs(e).concat(['T_mul', 'reflc_' + e.vista]); if (e.fondo === 'none' && e.vista === 'sera') n.push('WL_none_' + e.luce + '_sera'); return n; };
  const CANDS = [];   /* tutte le combinazioni fondo×luce×vista×bordo con strati veri (il colore è solo una tinta) */
  OPT.fondo.forEach(f => OPT.luce.forEach(l => OPT.vista.forEach(v => OPT.stile.forEach(s => {
    const c = { fondo: f.v, luce: l.v, vista: v.v, stile: s.v }; if (needs(c).every(n => FILES.has(n))) CANDS.push(c);
  }))));
  const W = { vista: 8, fondo: 4, luce: 2, stile: 1 };   /* ciò che costa di più cambiare nell'anteprima */
  let touched = null;                                     /* ultima dimensione toccata: la si onora per prima */
  function resolve(s) {
    const e = eff(s), want = { fondo: e.fondo, luce: e.luce, vista: e.vista, stile: e.stile };
    let best = null, bc = 1e9;
    CANDS.forEach(c => {
      let k = 0; Object.keys(W).forEach(d => { if (c[d] !== want[d]) k += W[d] + (d === touched ? 10 : 0); });
      if (k < bc) { bc = k; best = c; }
    });
    const col = ASA[e.col] ? e.col : 'marrone';
    const shown = Object.assign({ costr: 'scatolata', col, w: s.w }, best), subs = [];
    if (s.costr === 'pannello') subs.push({ d: 'costr', asked: 'pannello', shown: 'scatolata' });
    Object.keys(W).forEach(d => { if (best[d] !== want[d]) subs.push({ d, asked: want[d], shown: best[d] }); });
    if (col !== e.col && s.costr !== 'pannello') subs.push({ d: 'col', asked: e.col, shown: col });
    if (s.costr !== 'pannello' && subs.length) console.warn('A5: strati mancanti per', JSON.stringify(want), '-> mostrata', JSON.stringify(best));   /* rete di sicurezza, mai visibile: con 504/504 coperte non deve scattare */
    return { shown, subs, full: subs.length === 0 };
  }
  const renderable = s => s.costr === 'scatolata' && resolve(s).full;
  /* testo sull'immagine: una frase sola */
  /* come si dice ciò che si vede e ciò che manca: sempre un sintagma nominale, così si elenca senza giri di preposizioni */
  const SAY = {
    costr: v => v === 'pannello' ? 'pannello unico' : 'scatola a vetrina',
    vista: v => v === 'sera' ? 'vista di sera' : 'vista di giorno',
    fondo: v => v === 'none' ? 'nessun fondo' : v === 'erba' ? 'fondo erba' : 'fondo mattoncino',
    luce: v => v === 'alone' ? 'luce ad alone' : 'lettere accese',
    stile: v => bordoTxt(v),
    col: v => 'colore ' + label('col', v).toLowerCase()
  };
  const bordoTxt = v => { const t = label('stile', v).toLowerCase(); return /^bordo/.test(t) ? t : 'bordo ' + t; };
  const join = a => a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' e ' + a[a.length - 1];
  function notice(s) {
    const r = resolve(s), e = eff(s), parts = [];
    if (s.costr === 'pannello') parts.push('Qui vedi la scatola a vetrina: il pannello unico te lo mostriamo noi.');
    else if (!r.full) parts.push('Anteprima: ' + join(r.subs.map(x => SAY[x.d](x.shown))) + '. Immagine non disponibile per: ' + join(r.subs.map(x => SAY[x.d](x.asked))) + '.');
    if (s.costr !== 'pannello' && e.fondo === 'none' && e.vista === 'giorno') parts.push('L’ombra doppia dietro le lettere è quella del sole sul muro.');
    if (s.w === '120') parts.push('Immagine a 100 cm: il 120 cm cambia misura e prezzo, non l’immagine.');
    return parts.join(' ');
  }
  /* l'opzione esiste in almeno una combinazione con strato vero? (contrassegno sulla miniatura) */
  function has(cat, v) {
    if (cat === 'costr') return v === 'scatolata';
    if (cat === 'col') return !!ASA[v];
    if (cat === 'w') return true;
    return CANDS.some(c => c[cat] === v);
  }
  function status(cat, v, s) {
    if (s.costr === 'pannello' && (cat === 'luce' || cat === 'fondo' || cat === 'stile' || cat === 'col')) return 'off';
    return has(cat, v) ? 'ok' : 'dafare';
  }
  /* Prezzo onesto (blocco prezzi_funnel di STIMA-COSTI_v1): base 450/540 (alone, fondo scuro, casa a rilievo: «calcolato, parziale»), pannello unico 245/280 (stampa del logo da quotare).
     «da» quando una voce è da quotare: lettere accese (ASA opalino), bordo non liscio, pannello unico. Fondo: nessuno = 0 € (assunto: il fondo scuro è nel prezzo base); erba +100 e mattoncino +70 sono stime di Massimo, non calcolate;
     a 120 cm l'erba +100 è un'assunzione da verificare (moduli 3-4). */
  const FONDO_EUR = { none: 0, erba: 100, matt: 70 };
  function price(s) {
    const e = eff(s), w120 = e.w === '120';
    if (e.costr === 'pannello') return { eur: w120 ? 280 : 245, quote: true, why: ['stampa del logo'], fondo: null };
    const fa = FONDO_EUR[e.fondo], why = [];
    if (e.luce === 'accese') why.push('lettere accese');
    if (e.stile !== 'liscio') why.push(bordoTxt(e.stile));
    return { eur: (w120 ? 540 : 450) + fa, quote: why.length > 0, why, fondo: fa ? { t: e.fondo === 'erba' ? 'erba' : 'a mattoncino', amt: fa, check: e.fondo === 'erba' && w120 } : null };
  }
  const fmt = n => n.toLocaleString('it-IT') + ' €';
  const mainOf = p => (p.quote ? 'da ' : '') + fmt(p.eur);
  function priceText(s) {
    const p = price(s), n = [];
    if (p.fondo) n.push('Fondo ' + p.fondo.t + ' incluso (+' + p.fondo.amt + ' €)' + (p.fondo.check ? ' (a 120 cm lo confermiamo noi)' : '') + '.');
    if (p.why.length) n.push('Da confermare: ' + join(p.why) + '.');
    return { main: mainOf(p), note: n.join(' '), p };
  }
  function delta(cat, v, s) {
    if (cat === 'fondo') return v === 'erba' ? '+100 €' : v === 'matt' ? '+70 €' : '0 €';
    if (cat === 'w' || cat === 'costr') return mainOf(price(Object.assign({}, s, { [cat]: v })));
    if (cat === 'luce') return v === 'accese' ? 'da confermare' : '';
    if (cat === 'stile') return v === 'liscio' ? '' : 'da confermare';
    return '';
  }
  function describe(s) {
    const e = eff(s);
    if (e.costr === 'pannello') return 'pannello unico ' + e.w + ' cm, vista ' + e.vista;
    const fondo = e.fondo === 'none' ? 'senza fondo' : 'fondo ' + (e.fondo === 'erba' ? 'erba' : 'mattoncino');
    return 'scatola a vetrina ' + e.w + ' cm, ' + (e.luce === 'alone' ? 'luce ad alone' : 'lettere accese') + ', ' + fondo + ', ' +
      bordoTxt(e.stile) + ' ' + label('col', e.col).toLowerCase() + ', vista ' + e.vista;
  }
  function url(s) {
    const u = new URL(location.href); u.search = '';
    Object.keys(KEYS).forEach(k => u.searchParams.set(KEYS[k], s[k]));
    return u.toString();
  }
  function message(s) {
    const p = price(s);
    return 'Ciao OK.3D, vorrei questa insegna per La Nuova Torretta: ' + describe(s) + '. Stima ' + mainOf(p) + (p.fondo ? ' (fondo incluso)' : '') + (p.quote ? ', da confermare: ' + join(p.why) : ', da confermare') +
      '. La mia scelta: ' + url(s) + ' Vi mando la foto del muro.';
  }
  const waLink = s => 'https://wa.me/' + NUM + '?text=' + encodeURIComponent(message(s));

  /* ---- stato, storia ---- */
  const L = new Set(), PL = new Set();
  let state = Object.assign({}, DEF), hist = [], idx = -1;
  (function fromURL() {
    const q = new URLSearchParams(location.search);
    Object.keys(KEYS).forEach(k => { const v = q.get(KEYS[k]); if (v && OPT[k].some(o => o.v === v)) state[k] = v; });
    hist = [Object.assign({}, state)]; idx = 0;
  })();
  function commit(ns) {
    state = ns;
    try { history.replaceState(null, '', url(state)); } catch (e) { }
    L.forEach(f => f(state));
  }
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const push = ns => { hist = hist.slice(0, idx + 1); hist.push(ns); idx++; commit(Object.assign({}, ns)); };
  /* casuale: tutte le scelte con anteprima a strati veri (scatola: luce × fondo × bordo × colore × misura × vista = 1008). Il pannello unico non ha anteprima a strati: si sceglie a mano. */
  const ALL = [];
  OPT.luce.forEach(l => OPT.fondo.forEach(f => OPT.stile.filter(st => st.v !== 'archetti').forEach(st => OPT.col.forEach(k => OPT.w.forEach(w => OPT.vista.forEach(v =>
    ALL.push({ costr: 'scatolata', luce: l.v, fondo: f.v, stile: st.v, col: k.v, w: w.v, vista: v.v })))))));
  const api = {
    OPT, CAT, DEF, NUM, FILES, EXT, ALL, label, eff, status, has, price, fmt, delta, describe, url, message, waLink, notice, priceText, resolve, renderable, tintOf, layersOf,
    phase: 'loading', onPhase(f) { PL.add(f); f(api.phase); }, retry() { }, failed: [],
    get state() { return state; },
    get canUndo() { return idx > 0; }, get canRedo() { return idx < hist.length - 1; },
    on(f) { L.add(f); f(state); },
    set(k, v) { if (state[k] === v) return; touched = k; if (api.onSet) api.onSet(); push(Object.assign({}, state, { [k]: v })); },
    undo() { if (idx > 0) { idx--; touched = null; commit(Object.assign({}, hist[idx])); } },
    redo() { if (idx < hist.length - 1) { idx++; touched = null; commit(Object.assign({}, hist[idx])); } },
    reset() { if (same(state, DEF)) return; touched = null; push(Object.assign({}, DEF)); },
    /* casuale: una scelta a caso fra tutte le valide; `locks` = categorie da non toccare. Il risultato entra nella storia (si annulla).
       Ritorna null se i blocchi non lasciano scelta, altrimenti { full } = l'anteprima ha tutti gli strati veri. */
    random(locks) {
      locks = locks || new Set(); const cur = state, e = eff(cur);
      const pool = ALL.filter(c => !same(eff(c), e) && [...locks].every(k => eff(c)[k] === e[k]));
      if (!pool.length) return null;
      const pick = pool[Math.floor(Math.random() * pool.length)]; touched = null; if (api.onSet) api.onSet(); push(pick);
      return { full: resolve(pick).full, n: pool.length };
    },
    async copy() {
      const txt = message(state);
      try { await navigator.clipboard.writeText(txt); return true; } catch (e) {
        const t = document.createElement('textarea'); t.value = txt; t.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(t); t.select();
        let ok = false; try { ok = document.execCommand('copy'); } catch (e2) { } t.remove(); return ok;
      }
    },
    openWA() { window.open(waLink(state), '_blank', 'noopener'); },

    /* ---- anteprima a strati, caricamento per priorità ----
       1) Subito e solo gli strati della scena scelta (circa 9 file, scaricati e decodificati prima di mostrare).
       2) In ozio, in rete soltanto (fetch nella cache HTTP, senza decodificare: la memoria di decodifica resta quella degli strati visti):
          i vicini a UNA scelta di distanza (luce, fondo, bordo, vista opposta), ricalcolati a ogni scelta; il resto si scarica quando serve (?pre=all: tutto).
          Con «risparmio dati» o rete non 4g non si precarica nulla oltre la scena: gli strati si scaricano quando si sceglie.
       Se il cliente sceglie qualcosa i cui strati non sono ancora arrivati, l'immagine resta quella di prima finché non sono pronti (swap atomico). */
    mountPreview(sq) {
      const D = 'strati_a4/', el = {}, order = [], loading = {}, pre = {}, dcache = {}, bust = {}, V = ['sera', 'giorno'], stage = sq.parentElement;
      const src = n => D + n + '.' + EXT + (bust[n] ? '?r=' + bust[n] : '');
      /* fasi dell'anteprima: loading (scheletro, finché non c'è la prima immagine) | ready | switching (decodifica > 300 ms: la scelta è fatta ma l'immagine è la vecchia) | error (uno strato non arriva) */
      let swT = 0, bad = [];
      const setPhase = p => { if (api.phase === p && stage.dataset.phase === p) return; api.phase = p; stage.dataset.phase = p; PL.forEach(f => f(p)); };
      setPhase('loading');
      V.forEach(v => order.push('wall_' + v));
      S7.forEach(s => V.forEach(v => order.push('SH_' + s + '_' + v)));
      L2.forEach(l => order.push('WL_none_' + l + '_sera'));
      F3.forEach(f => L2.forEach(l => V.forEach(v => order.push('fondo_' + f + '_' + l + '_' + v))));
      F3.forEach(f => L2.forEach(l => V.forEach(v => order.push('shell_' + f + '_' + l + '_' + v))));
      F3.forEach(f => L2.forEach(l => V.forEach(v => order.push('ins_' + f + '_' + l + '_' + v))));
      order.push('T_mul'); V.forEach(v => order.push('reflc_' + v));
      S7.forEach(s => V.forEach(v => order.push('ring_' + s + '_' + v)));
      const names = order.filter(n => FILES.has(n));
      if (names.length !== FILES.size) console.warn('A5: ordine di impilamento incompleto', names.length, FILES.size);
      names.forEach(n => {   /* nodi creati tutti subito, nell'ordine di impilamento; il file si scarica solo quando serve */
        let node;
        if (n.startsWith('shell_') || n.startsWith('ring_')) {
          node = document.createElement('div'); node.className = 'grp f off';
          const i = new Image(); i.alt = ''; i.decoding = 'async'; const t = document.createElement('div'); t.className = 'tint';
          const cv = document.createElement('canvas'); cv.width = cv.height = 1000; node.appendChild(i); node.appendChild(t); node.appendChild(cv); node._img = i; node._tint = t; node._cv = cv;
        } else {
          node = new Image(); node.alt = ''; node.decoding = 'async'; node._img = node;
          node.className = 'f off ' + (n.startsWith('SH_') || n === 'T_mul' ? 'mul ' : n.startsWith('WL_') || n.startsWith('reflc') ? 'plus ' : n.startsWith('fondo_') || n.startsWith('ins_') ? 'rf ' : '');
        }
        node.dataset.layer = n; el[n] = node; sq.appendChild(node);
      });
      const ensure = n => {
        if (!loading[n]) {
          const i = el[n]._img, u = src(n);
          i.src = u; if (el[n]._tint) el[n]._tint.style.webkitMaskImage = el[n]._tint.style.maskImage = 'url(' + u + ')';
          loading[n] = i.decode().then(() => true, () => { delete loading[n]; return false; });   /* strato che non arriva: lo si segnala e si può ritentare */
        }
        return loading[n];
      };
      let seq = 0, t0 = 0, queue = [], active = 0;
      api.onSet = () => { t0 = performance.now(); };
      /* precarico in rete: ordine per distanza dalla scena corrente */
      const cn = navigator.connection || {};
      const lazyOk = !cn.saveData && (!cn.effectiveType || cn.effectiveType === '4g') && new URLSearchParams(location.search).get('pre') !== '0', PREALL = new URLSearchParams(location.search).get('pre') === 'all';
      function plan(e) {
        const out = [], seen = new Set(), add = n => { if ((FILES.has(n) || SPECF.has(n)) && !seen.has(n) && !loading[n] && !dcache[n] && !pre[n]) { seen.add(n); out.push(n); } };
        const addL = x => { layersOf(x).forEach(add); specPairs(x).forEach(q => add(q[1])); };
        const alt = (d, vals) => vals.forEach(v => addL(Object.assign({}, e, { [d]: v })));
        const other = V.find(v => v !== e.vista);
        alt('luce', L2); alt('fondo', F3); alt('stile', S7);
        addL(Object.assign({}, e, { vista: other }));
        if (PREALL) V.forEach(v => L2.forEach(l => F3.forEach(f => S7.forEach(st => addL({ vista: v, luce: l, fondo: f, stile: st })))));   /* ?pre=all: tutto il resto (15,8 MB); di serie ci si ferma al vicinato */
        return out;
      }
      const idle = window.requestIdleCallback || (f => setTimeout(f, 300));
      function pump() {
        if (!lazyOk) return;
        while (active < 2 && queue.length) {
          const n = queue.shift(); if (loading[n] || dcache[n] || pre[n]) continue; active++;
          pre[n] = fetch(src(n), { cache: 'force-cache' }).then(r => r.arrayBuffer()).catch(() => { }).then(() => { active--; if (!queue.length && !active) document.documentElement.dataset.all = '1'; idle(pump); });
        }
      }
      const dataOf = n => dcache[n] || (dcache[n] = new Promise(res => {
        const i = new Image(); i.onload = () => { const c = document.createElement('canvas'); c.width = i.naturalWidth; c.height = i.naturalHeight;
          const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(i, 0, 0); res(x.getImageData(0, 0, c.width, c.height)); }; i.onerror = () => { delete dcache[n]; res(null); }; i.src = src(n);
      }));
      async function paint(node, nName, sName, col) {
        const key = nName + '|' + sName + '|' + col; if (node._key === key) return;
        const [N, P] = await Promise.all([dataOf(nName), dataOf(sName)]); if (!N || !P) throw new Error('speculare mancante ' + sName);
        const cv = node._cv, x = cv.getContext('2d'), out = x.createImageData(cv.width, cv.height), a = N.data, b = P.data, o = out.data;
        const m = ASA[col].map(v => v / .5);
        for (let i = 0; i < a.length; i += 4) {
          const al = a[i + 3]; if (!al) continue; o[i + 3] = al;
          for (let k = 0; k < 3; k++) { const sp = S2L[b[i + k]], d = S2L[a[i + k]] - sp; o[i + k] = L2S[Math.min(4096, Math.round(((d > 0 ? d : 0) * m[k] + sp) * 4096))]; }
        }
        x.putImageData(out, 0, 0); node._key = key;
      }
      function apply(s) {
        const r = resolve(s), e = r.shown, lay = layersOf(e), on = new Set(lay), me = ++seq;
        if (!t0) t0 = performance.now();
        clearTimeout(swT); if (api.phase === 'ready') swT = setTimeout(() => { if (me === seq && api.phase === 'ready') setPhase('switching'); }, 300);
        const sp = specPairs(e);
        const spOk = new Set();
        Promise.all(lay.map(ensure).concat(sp.map(([g, q]) => paint(el[g], g, q, e.col).then(() => spOk.add(g), err => console.warn('A5: speculare non applicato, resta la tinta CSS:', err.message))))).then(res => {
          if (me !== seq) return;
          clearTimeout(swT);
          bad = lay.filter((n, i) => res[i] === false);
          if (bad.length) { api.failed = bad.slice(); t0 = 0; setPhase('error'); return; }   /* niente swap: l'immagine vecchia non deve passare per quella della scelta */
          api.failed = [];
          const spOn = spOk;
          Object.keys(el).forEach(n => { el[n].classList.toggle('off', !on.has(n)); if (el[n]._cv) el[n].classList.toggle('spec', spOn.has(n)); });
          sq.style.setProperty('--tint', tintOf(e.col)); sq.dataset.vis = e.vista;
          sq.dataset.shown = JSON.stringify(e); sq.dataset.layers = lay.join(' '); sq.dataset.spec = [...spOn].join(' ');
          sq.dataset.ms = String(Math.round(performance.now() - t0)); sq.dataset.n = String((+sq.dataset.n || 0) + 1); t0 = 0;
          const bg = stage.querySelector('.bgwall'); if (bg && !bg.src.endsWith('wall_' + e.vista + '.' + EXT)) bg.src = src('wall_' + e.vista);
          const nota = stage.querySelector('.sq-nota'), t = notice(s);
          if (nota) { nota.classList.toggle('on', !!t); if (t) nota.textContent = t; nota.dataset.full = r.full ? '1' : '0'; }
          if (!sq.dataset.ready) { sq.dataset.ready = '1'; document.documentElement.dataset.ready = '1'; }
          setPhase('ready');
          queue = plan(e); idle(pump);
        });
      }
      api.retry = () => { bad.forEach(n => { bust[n] = Date.now(); delete loading[n]; delete dcache[n]; delete pre[n]; }); setPhase('loading'); apply(state); };
      api.on(apply);
      api.progress = () => ({ total: names.length, decoded: names.filter(n => loading[n]).length, fetched: names.filter(n => pre[n]).length, queued: queue.length, lazy: lazyOk });
    }
  };

  /* ---- icone e disegni schematici (SVG, currentColor) ---- */
  const S = (p, vb) => '<svg viewBox="' + (vb || '0 0 24 24') + '" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>';
  api.ICON = {
    costr: S('<rect x="3" y="7" width="18" height="10" rx="1.5"/><path d="M7 7V4M17 7V4M3 12h18" stroke-dasharray="0.1 3"/>'),
    luce: S('<path d="M9 17.5c-1.8-1.2-3-3-3-5.2a6 6 0 0 1 12 0c0 2.2-1.2 4-3 5.2V19H9zM9.6 22h4.8"/>'),
    fondo: S('<rect x="3" y="4" width="18" height="16" rx="1.5"/><path d="M3 12h18M8 4v8M15 4v8M11 12v8"/>'),
    stile: S('<rect x="3" y="6" width="18" height="12" rx="1"/><rect x="6.5" y="9.5" width="11" height="5" rx=".5"/>'),
    col: S('<circle cx="12" cy="12" r="8.5"/><circle cx="8.5" cy="10" r="1.1" fill="currentColor"/><circle cx="12" cy="7.5" r="1.1" fill="currentColor"/><circle cx="15.8" cy="10" r="1.1" fill="currentColor"/><path d="M12 20.5c-1.6 0-2-1.4-1.2-2.4.8-1 .2-2.2-1-2.2"/>'),
    w: S('<path d="M3 17h18M3 14v6M21 14v6M7 8h10M12 5v6"/>'),
    vista: S('<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4"/>'),
    sun: S('<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4"/>'),
    moon: S('<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>'),
    undo: S('<path d="M9 7 4 12l5 5M4 12h10a6 6 0 0 1 0 12" transform="translate(0 -4)"/>'),
    redo: S('<path d="m15 7 5 5-5 5M20 12H10a6 6 0 0 0 0 12" transform="translate(0 -4)"/>'),
    reset: S('<path d="M4 12a8 8 0 1 0 2.6-5.9M4 4v4.5h4.5"/>'),
    dice: S('<path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22"/><path d="m18 2 4 4-4 4"/><path d="M2 6h1.9c1.5 0 2.9.9 3.6 2.2"/><path d="M22 18h-5.9c-1.3 0-2.6-.7-3.3-1.8l-.5-.8"/><path d="m18 14 4 4-4 4"/>'),
    copy: S('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>'),
    send: S('<path d="m4 12 16-8-5 16-3.5-6.5z"/>'),
    lock: S('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
    unlock: S('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 7.5-2"/>'),
    close: S('<path d="M6 6l12 12M18 6 6 18"/>'),
    back: S('<path d="m15 5-7 7 7 7"/>'),
    zoom: S('<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5M8.5 11h5M11 8.5v5"/>'),
    check: S('<path d="m5 12.5 4.5 4.5L19 7.5"/>'),
    todo: '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="2.4 2.2"/></svg>'
  };
  /* miniature schematiche (non sono render: servono a riconoscere lo stile) */
  const th = p => '<svg viewBox="0 0 64 44" width="100%" height="100%" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round">' + p + '</svg>';
  api.THUMB = {
    costr: {
      scatolata: th('<rect x="6" y="10" width="52" height="24" rx="2"/><rect x="11" y="15" width="42" height="14" rx="1" stroke-width="1.4" stroke-dasharray="3 3"/>'),
      pannello: th('<rect x="6" y="10" width="52" height="24" rx="2" stroke-dasharray="0"/><path d="M14 22h36" stroke-width="3"/>')
    },
    luce: {
      alone: th('<path d="M14 22h36" stroke-width="5"/><rect x="8" y="9" width="48" height="26" rx="13" stroke-width="1.4" stroke-dasharray="1 4"/>'),
      accese: th('<path d="M14 22h36" stroke-width="5"/><path d="M32 8V4M18 10l-3-3M46 10l3-3M32 36v4M18 34l-3 3M46 34l3 3" stroke-width="2"/>')
    },
    fondo: {
      none: th('<rect x="8" y="8" width="48" height="28" rx="2" stroke-dasharray="3 4"/>'),
      erba: th('<rect x="8" y="8" width="48" height="28" rx="2"/><path d="M14 36v-7m5 7v-10m5 10v-6m5 6v-11m5 11v-7m5 7v-9m5 9v-6m5 6v-8" stroke-width="1.8"/>'),
      matt: th('<rect x="8" y="8" width="48" height="28" rx="2"/><path d="M8 17h48M8 26h48M24 8v9M40 8v9M16 17v9M32 17v9M48 17v9M24 26v10M40 26v10" stroke-width="1.5"/>')
    },
    stile: {
      liscio: th('<rect x="6" y="10" width="52" height="24" rx="2"/><rect x="11" y="15" width="42" height="14" rx="1" stroke-width="1.3"/>'),
      merlato: th('<path d="M6 34V12h6v-4h6v4h6V8h6v4h6V8h6v4h6V8h6v4h6v22z"/><rect x="11" y="17" width="42" height="12" stroke-width="1.3"/>'),
      archetti: th('<path d="M6 34V16a6.5 6.5 0 0 1 13 0 6.5 6.5 0 0 1 13 0 6.5 6.5 0 0 1 13 0 6.5 6.5 0 0 1 13 0V34z" transform="translate(0 -2)"/><rect x="11" y="21" width="42" height="9" stroke-width="1.3"/>'),
      corda: th('<rect x="6" y="10" width="52" height="24" rx="2"/><path d="M6 10c4 5 8-5 12 0s8-5 12 0 8-5 12 0 8-5 12 0M6 34c4-5 8 5 12 0s8 5 12 0 8 5 12 0 8 5 12 0" stroke-width="1.6"/>'),
      pietra: th('<path d="M6 12l8-3 10 1 10-2 12 2 10-1 2 5v18l-8 3-10-1-10 2-12-2-10 1-3-5z"/><path d="M24 10v6M42 10v6M14 20h30M32 20v8M50 17v8M20 28h30" stroke-width="1.2"/>'),
      buche: th('<rect x="6" y="8" width="52" height="28" rx="2"/><circle cx="14" cy="14" r="2"/><circle cx="26" cy="14" r="2"/><circle cx="38" cy="14" r="2"/><circle cx="50" cy="14" r="2"/><circle cx="14" cy="30" r="2"/><circle cx="26" cy="30" r="2"/><circle cx="38" cy="30" r="2"/><circle cx="50" cy="30" r="2"/>'),
      matt: th('<rect x="6" y="8" width="52" height="28" rx="2"/><path d="M6 15h52M6 22h52M6 29h52M20 8v7M38 8v7M12 15v7M30 15v7M48 15v7M20 22v7M38 22v7M12 29v7M30 29v7M48 29v7" stroke-width="1.3"/>')
    },
    w: {
      '100': th('<path d="M10 22h44M10 16v12M54 16v12M22 12h20" />'),
      '120': th('<path d="M4 22h56M4 16v12M60 16v12M16 12h32" />')
    },
    vista: { sera: '', giorno: '' }
  };
  window.Cfg = api;
})();
