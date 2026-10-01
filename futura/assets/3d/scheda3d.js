// FUTURA · schede v2 · logica di pagina: stato nell'URL, prezzo dei 4 prodotti, comandi, telecomando RF, app, condivisione, 3D a tappe.
// NIENTE import statico del motore: three scende dentro avvia3d(), contato dalla barra sui byte.
(function () {
  "use strict";
  document.documentElement.classList.add("js");
  // la scheda si apre sempre dall'inizio: il browser non deve riportarla a «Accendila»
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  const inCima = () => { if (!location.hash) scrollTo(0, 0); };
  inCima(); addEventListener("load", inCima);
  addEventListener("pageshow", e => { if (e.persisted) inCima(); });   // anche quando il browser la riprende dalla cache avanti/indietro
  const D = window.DATI, VER = D.versione, NUM = D.whatsapp;
  const corpo = document.body, PROD = corpo.dataset.prodotto;             // "infinity" | "gen2"
  const NOME = PROD === "infinity" ? "Infinity mirror" : "Insegna LED 2ª generazione";
  const M = ["120", "140", "160"];
  const q = new URLSearchParams(location.search), REG = q.get("registra") === "1";
  const EFF_TELE = ["dimmer", "fluido", "staccato"], EFF_APP = ["scia", "onda", "respiro", "staccato", "riempimento", "scintille"];
  const s = {
    misura: M.includes(q.get("misura")) ? q.get("misura") : "140",
    luce: q.get("luce") === "digitale" ? "digitale" : "fissa",
    tele: q.get("tele") === "1",
    modo: "fisso", velocita: q.has("vel") ? Math.min(1, Math.max(0, +q.get("vel"))) : 0.45,
    livello: q.has("liv") ? Math.min(1, Math.max(0.06, +q.get("liv"))) : 0.7,
    acceso: q.get("spento") !== "1", giorno: q.get("giorno") === "1",
    bloom: q.get("bloom") !== "0",   // bloom=0: il bagliore di post-produzione spento (come su un telefono che rallenta)
    vista: "pendolo"   // l'insegna si guarda girandola: pendolo + dito (+ giroscopio sul telefono)
  };
  const eff = q.get("effetto");
  if (s.luce === "digitale") s.modo = EFF_APP.includes(eff) ? eff : "scia";
  else if (s.tele && EFF_TELE.includes(eff)) s.modo = eff;
  window.__stato = s;

  const euro = n => { const [i, d] = (Math.round(n * 100) / 100).toFixed(2).split("."); const I = i.replace(/\B(?=(\d{3})+(?!\d))/g, "."); return (d === "00" ? I : I + "," + d) + " €"; };
  const tutti = (sel, f) => document.querySelectorAll(sel).forEach(f);
  const tele = () => s.luce === "fissa" && s.tele;
  function conto() {
    if (PROD === "infinity") { const r = D.infinity[s.misura][s.luce]; return { prezzo: r.prezzo + (tele() ? D.telecomandino : 0), pdf: r.pdf, ing: D.infinity[s.misura].ingombro }; }
    const r = D.gen2[s.misura][s.luce]; return { prezzo: r.prezzo + (tele() ? D.telecomandino : 0), pdf: r.pdf, ing: D.gen2[s.misura].dim + " cm" };
  }
  const descLuce = () => s.luce === "digitale" ? "luce digitale" : (s.tele ? "luce fissa con telecomandino" : "luce fissa");
  const descrizione = () => NOME + " " + s.misura + " cm, " + descLuce() + (PROD === "infinity" ? ", frontale specchio spia" : "");
  function urlScelta() {
    const n = new URLSearchParams(); n.set("misura", s.misura); n.set("luce", s.luce);
    if (tele()) n.set("tele", "1");
    if (s.luce === "digitale" || tele()) n.set("effetto", s.modo);
    if (s.giorno) n.set("giorno", "1"); if (!s.acceso) n.set("spento", "1");
    return n;
  }
  const wa = (testo, numero = NUM) => "https://wa.me/" + (numero || "") + "?text=" + encodeURIComponent(testo);

  // ---------- disegno dello stato ----------
  function disegna() {
    const c = conto();
    tutti("[data-misura]", e => { if (e.tagName === "INPUT") { e.value = M.indexOf(s.misura); e.setAttribute("aria-valuetext", s.misura + " cm, ingombro " + c.ing); } });
    tutti("[data-luce]", b => b.setAttribute("aria-pressed", String(b.dataset.luce === s.luce)));
    tutti("[data-tele]", b => b.setAttribute("aria-checked", String(s.tele)));
    tutti("[data-acceso]", b => b.setAttribute("aria-checked", String(s.acceso)));
    tutti("[data-giorno]", b => b.setAttribute("aria-pressed", String((b.dataset.giorno === "1") === s.giorno)));
    tutti("[data-se-luce]", e => e.hidden = e.dataset.seLuce !== s.luce);
    tutti("[data-se-tele]", e => e.hidden = !(tele() === (e.dataset.seTele === "1")) || s.luce !== "fissa");
    tutti("[data-effetto]", b => b.setAttribute("aria-pressed", String(b.dataset.effetto === s.modo && (s.luce === "digitale" || tele()))));
    tutti("[data-prezzo]", e => e.textContent = euro(c.prezzo));
    tutti("[data-misura-testo]", e => e.textContent = s.misura + " cm · " + c.ing);
    tutti("[data-descrizione]", e => e.textContent = descrizione());
    tutti("[data-scegli]", a => a.href = wa("Ciao Massimo, per FUTURA scegliamo: " + descrizione() + ", " + euro(c.prezzo) + "."));
    tutti("[data-foto-parete]", a => a.href = wa("Ciao Massimo, per FUTURA ti mando la foto della parete dove va: " + descrizione() + ". Ci fate la bozza realistica sulla nostra parete?"));
    tutti("[data-pdf]", a => { a.href = c.pdf + "?v=" + VER; a.textContent = "Scarica il preventivo " + s.misura + " cm, " + descLuce() + " (PDF)"; });
    tutti("[data-velocita]", e => { e.value = s.modo === "dimmer" ? s.livello : s.velocita; });
    tutti("[data-nome-cursore]", e => e.textContent = s.modo === "dimmer" ? "Intensità" : "Velocità");
    tutti("[data-foto-luce]", img => { const src = img.dataset["src" + (s.luce === "digitale" ? "Digitale" : "Fissa")]; if (src && !img.src.endsWith(src)) img.src = src; });
    tutti("[data-slot-video]", e => { const v = e.querySelector("video"); const src = v && v.getAttribute("data-src-" + s.luce); if (!src) { e.hidden = true; return; } if (!v.src.endsWith(src)) v.src = src; e.hidden = false; });
    const led = document.querySelector("[data-led]"); if (led) { led.classList.remove("lampo"); void led.offsetWidth; led.classList.add("lampo"); }
    history.replaceState(null, "", "?" + urlScelta().toString());
  }

  // ---------- gesti ----------
  document.addEventListener("click", e => {
    const t = e.target.closest("button,[data-condividi]"); if (!t) return;
    const d = t.dataset;
    if (d.luce) { s.luce = d.luce; s.modo = s.luce === "digitale" ? "scia" : (s.tele ? "fluido" : "fisso"); }
    if ("tele" in d) { s.tele = !s.tele; s.modo = s.tele ? "fluido" : "fisso"; }
    if ("acceso" in d) s.acceso = !s.acceso;
    if (d.giorno) s.giorno = d.giorno === "1";
    if (d.effetto) { s.modo = d.effetto; s.acceso = true; }
    if (d.tasto) tasto(d.tasto);
    if ("condividi" in d) { condividi(); return; }
    if ("opzioni" in d) { const aperto = t.getAttribute("aria-expanded") !== "true"; t.setAttribute("aria-expanded", String(aperto)); const pn = document.getElementById(t.getAttribute("aria-controls")); if (pn) pn.classList.toggle("aperto", aperto); return; }
    disegna();
  });
  document.addEventListener("input", e => {
    if (e.target.matches("input[data-misura]")) s.misura = M[+e.target.value];
    if (e.target.matches("[data-velocita]")) { if (s.modo === "dimmer") s.livello = Math.max(0.06, +e.target.value); else s.velocita = +e.target.value; }
    disegna();
  });
  // il telecomando RF a 14 tasti: ogni tasto fa partire l'effetto sull'insegna 3D
  function tasto(k) {
    s.acceso = k !== "OFF";
    const lv = { "10%": 0.1, "25%": 0.25, "50%": 0.5, "75%": 0.75, "100%": 1 };
    if (k in lv) { s.modo = "dimmer"; s.livello = lv[k]; }
    if (k === "PIU") { s.modo = "dimmer"; s.livello = Math.min(1, s.livello + 0.15); }
    if (k === "MENO") { s.modo = "dimmer"; s.livello = Math.max(0.06, s.livello - 0.15); }
    if (k === "FLASH") { s.modo = "staccato"; s.velocita = 0.85; }
    if (k === "STROBE") { s.modo = "staccato"; s.velocita = 0.35; }
    if (k === "FADE") s.modo = "fluido";
    if (k === "SPEEDPIU") s.velocita = Math.min(1, s.velocita + 0.15);
    if (k === "SPEEDMENO") s.velocita = Math.max(0, s.velocita - 0.15);
    tutti("[data-tasto]", b => b.setAttribute("aria-pressed", String(b.dataset.tasto === k)));
  }
  // «Manda al socio»: la configurazione nel link; share nativo, se manca WhatsApp senza numero
  async function condividi() {
    const url = location.origin + location.pathname + "?" + urlScelta().toString();
    const testo = "Guarda questa: " + descrizione() + ", " + euro(conto().prezzo) + " (bozza).";
    const st = document.querySelector("[data-stato-condividi]");
    try { if (navigator.share) { await navigator.share({ title: NOME + " · FUTURA", text: testo, url }); if (st) st.textContent = "Inviato."; return; } } catch (err) { if (err && err.name === "AbortError") return; }
    window.open(wa(testo + " " + url, ""), "_blank", "noopener");
    if (st) st.textContent = "Si apre WhatsApp con il link già scritto.";
  }
  // foto: attesa nel formato vero, poi pronta; se non arriva, lo dice (senza questo il CSS le terrebbe invisibili)
  tutti(".media img", img => { const fig = img.parentElement; const pronta = () => { fig.classList.add("pronta"); fig.classList.remove("rotta"); };
    img.addEventListener("load", pronta); img.addEventListener("error", () => fig.classList.add("rotta")); if (img.complete && img.naturalWidth) pronta();
    if (img.decode) img.decode().then(pronta).catch(() => {}); });   // anche se l'evento load si perde, la foto non resta un riquadro vuoto
  disegna();
  // la barra fissa si ritira quando la tavola rossa con il suo «Scegli» è in vista: mai due pieni insieme
  const barraF = document.querySelector("[data-barra-fissa]"), cta = document.querySelector("[data-cta]");
  if (barraF && cta && "IntersectionObserver" in window) new IntersectionObserver(es => barraF.classList.toggle("ceduta", es[0].isIntersecting)).observe(cta);

  // ---------- corsa: lo scroll smonta e rimonta ----------
  const corsa = document.querySelector("[data-corsa]");
  let tReg = 0;   // registrazione: con pda/pa/dur lo scroll si simula nel tempo (da pda a pa in dur secondi)
  const progresso = () => { if (REG && q.has("pda")) { const k = Math.min(1, Math.max(0, tReg / +(q.get("dur") || 6))); return +q.get("pda") + (+q.get("pa") - +q.get("pda")) * k; }
    if (REG && q.has("p")) return +q.get("p"); if (!corsa) return 0; const r = corsa.getBoundingClientRect(); return Math.min(1, Math.max(0, -r.top / (r.height - innerHeight))); };
  const tappe = [...document.querySelectorAll("[data-tappa]")]; let tappaOra = -1;
  function mostraTappa(p) { const k = p < 0.2 ? 0 : p < 0.72 ? 1 : 2; s.fermo = k === 1 && innerWidth < 600; if (k === tappaOra) return; tappaOra = k; tappe.forEach(e => e.hidden = +e.dataset.tappa !== k); tutti("[data-tacca]", (e, i) => e.classList.toggle("su", +e.dataset.tacca === k)); }
  mostraTappa(progresso());
  addEventListener("scroll", () => mostraTappa(progresso()), { passive: true });

  // ---------- 3D a tappe ----------
  const velo = document.querySelector("[data-velo]"), tela = document.querySelector("[data-tela]");
  if (!velo || !tela) return;
  const barra = velo.querySelector("[data-barra]"), msg = velo.querySelector("[data-msg]");
  const gl = (() => { try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch (e) { return false; } })();
  const ridotto = matchMedia("(prefers-reduced-motion: reduce)").matches && !REG;
  if (!gl || ridotto) { velo.dataset.stato = "statico"; msg.textContent = gl ? "" : "Questo dispositivo non mostra il 3D: ecco la foto."; return; }
  async function scarica(url, sulByte) {
    const r = await fetch(url, { cache: "force-cache" }); if (!r.ok) throw new Error("HTTP " + r.status + " " + url);
    const rd = r.body.getReader(); const parti = [];
    for (;;) { const { done, value } = await rd.read(); if (done) break; parti.push(value); sulByte(value.length); }
    return new Blob(parti);
  }
  (async function avvia3d() {
    const spia = setTimeout(() => { velo.dataset.stato = "errore"; msg.textContent = "Il 3D non si è caricato. La foto resta qui."; }, 45000);
    try {
      const man = await (await fetch("assets/3d/manifesto.json?v=" + VER)).json();
      let fatti = 0; const sulByte = n => { fatti += n; barra.style.transform = "scaleX(" + Math.min(1, fatti / man.totale) + ")"; };
      await Promise.all(man.file.map(f => scarica(f, sulByte)));
      const geo = JSON.parse(await (await scarica(man.geometria[PROD], sulByte)).text());
      const { costruisci } = await import(man.motore);
      const mondo = await costruisci({ tela, geo, prodotto: PROD, stato: s, qualita: {} });
      window.__mondo = mondo;
      let az = 0;
      // ---- COME SI GUARDA L'INSEGNA: pendolo lento da solo, il dito la gira con inerzia, il telefono inclinato ci guarda dentro ----
      const ssv = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
      const AMP = PROD === "infinity" ? 0.6 : 0.26, MAXD = 0.9, PERIODO = 7;   // pendolo ±35° (2ª gen ±15°), dito fino a ±50°
      const V = { az: 0, v: 0, ultimo: -1e9, tocco: false, giro: null, x: null, tPrec: 0, fase: null };
      let px = null, pt = 0;
      tela.addEventListener("pointerdown", ev => { px = ev.clientX; pt = performance.now(); V.tocco = true; V.v = 0; try { tela.setPointerCapture(ev.pointerId); } catch (e) {} });
      tela.addEventListener("pointermove", ev => {
        if (!matchMedia("(pointer: coarse)").matches) { const r = tela.getBoundingClientRect(); V.x = (ev.clientX - r.left) / r.width * 2 - 1; }   // parallasse del mouse
        if (px === null) return; const ora = performance.now(), d = (ev.clientX - px) * 0.006;
        V.az = Math.max(-MAXD, Math.min(MAXD, V.az + d)); V.v = d / Math.max(8, ora - pt) * 16; px = ev.clientX; pt = ora; V.ultimo = ora / 1000; });
      const lascia = () => { px = null; V.tocco = false; V.ultimo = performance.now() / 1000; };
      tela.addEventListener("pointerup", lascia); tela.addEventListener("pointercancel", lascia);
      const telefono = matchMedia("(pointer: coarse)").matches || innerWidth < 700;
      if (PROD === "infinity" && telefono && window.DeviceOrientationEvent) {
        // il telefono è il punto di vista: iOS chiede il permesso con un gesto, per questo c'è il pulsante
        const btn = document.createElement("button"); btn.type = "button"; btn.className = "muovi"; btn.textContent = "Muovi il telefono per guardarci dentro";
        document.querySelector(".fermo").appendChild(btn); V.btn = btn;
        const ascolta = () => addEventListener("deviceorientation", ev => { if (ev.gamma == null) return; if (V.g0 == null) V.g0 = ev.gamma; V.giro = Math.max(-1, Math.min(1, (ev.gamma - V.g0) / 35)); });
        btn.addEventListener("click", async () => { try { if (DeviceOrientationEvent.requestPermission) { if (await DeviceOrientationEvent.requestPermission() !== "granted") return; } ascolta(); } catch (e) {} });
      }
      function azVista(t) {
        if (REG && q.has("az")) return +q.get("az");          // registrazione: angolo fisso (confronto con le ancore)
        if (REG && q.has("nosway")) return 0;                  // registrazione: di fronte, ferma (misure)
        if (REG && !q.get("demo")) return AMP * Math.sin(t * 2 * Math.PI / PERIODO);   // registrazione: il pendolo puro, deterministico
        V.tPrec = t;
        if (REG && q.get("demo") === "giro") { if (V.btn) V.btn.hidden = t > 2.2; if (t > 2.2) { V.giro = Math.sin((t - 2.2) * 0.9); } }
        if (V.giro != null) { V.az += (V.giro * 0.62 - V.az) * 0.12; V.ultimo = t; return V.az; }   // il giroscopio guida, al posto del pendolo
        if (REG && q.get("demo") === "gesto") {                // registrazione: un trascinamento, il rilascio con l'inerzia, poi il pendolo
          if (t < 0.5) V.ultimo = -1e9;
          else if (t < 1.7) { const n = -0.8 * ssv(0.5, 1.7, t); V.v = n - V.az; V.az = n; V.ultimo = t; }
          else { V.az += V.v; V.v *= 0.9; if (Math.abs(V.v) > 0.002) V.ultimo = t; }
        } else if (!REG && !V.tocco) { V.az = Math.max(-MAXD, Math.min(MAXD, V.az + V.v)); V.v *= 0.92; if (Math.abs(V.v) > 0.002) V.ultimo = performance.now() / 1000; }
        const oraS = REG ? t : performance.now() / 1000;
        const fermo = REG && q.get("demo") !== "gesto" ? 1e9 : oraS - V.ultimo, pesoP = ssv(1.2, 2.4, fermo);   // ~2 s di riposo e torna il pendolo
        if (pesoP > 0) {
          if (V.fase == null) V.fase = Math.asin(Math.max(-1, Math.min(1, V.az / AMP))) - t * 2 * Math.PI / PERIODO;
          const pend = AMP * Math.sin(t * 2 * Math.PI / PERIODO + V.fase); V.az += (pend - V.az) * Math.min(1, 0.12 * pesoP);
        } else V.fase = null;
        return V.az + (V.x != null ? V.x * 0.12 : 0);
      }
      // LEGENDA DELL'ESPLOSO. Strati numerati nell'ordine della pila (retro -> fronte).
      // Schermo largo: colonna accanto all'oggetto; ogni filo parte da un punto dello strato che NESSUNO strato davanti copre,
      // scende o sale in verticale fino alla sua riga e va dritto alla colonna, senza toccare le sagome degli altri strati né gli altri fili.
      // Schermo stretto: numeri piccoli sui punti visibili di ogni strato (distanziati) + elenco nella tappa.
      const contAncore = document.querySelector(".ancore"), fili = document.querySelector("[data-fili]");
      contAncore.querySelectorAll("[data-ancora]").forEach(e => e.remove());
      const etich = mondo.pila.map((st, k) => { const el = document.createElement("p"); el.className = "ancora"; el.dataset.k = st.k;
        el.innerHTML = '<span class="num-strato">' + (k + 1) + '</span><span class="lungo"> ' + st.testo + (st.mm ? ' · ' + st.mm : '') + '</span>'; contAncore.appendChild(el); return el; });
      const quota = document.createElement("p"); quota.className = "ancora quota-pacchetto"; quota.textContent = mondo.pacchetto; contAncore.appendChild(quota);
      const legenda = document.querySelector(".tappa[data-tappa='1'] .legenda");
      if (legenda) legenda.innerHTML = mondo.pila.map(st => "<li>" + st.testo + (st.mm ? " · " + st.mm : "") + "</li>").join("") + '<li class="quota-voce">' + mondo.pacchetto.replace("\n", " · ") + "</li>";
      const PASSO = 50;   // riga 24 px + 26 px di aria
      // --- geometria sullo schermo
      const dentro = (p, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j];
        if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
      const incr = (a, b, c, d) => { const o = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
        return o(c, d, a) * o(c, d, b) < 0 && o(a, b, c) * o(a, b, d) < 0; };
      const distSeg = (p, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy || 1; const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L));
        return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy); };
      const scatola = pts => { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const q of pts) { x0 = Math.min(x0, q[0]); y0 = Math.min(y0, q[1]); x1 = Math.max(x1, q[0]); y1 = Math.max(y1, q[1]); } return [x0, y0, x1, y1]; };
      // il segmento a-b tocca la sagoma? (lastra: bordo attraversato o estremo dentro; neon: tubo a meno di 4 px)
      function tocca(a, b, sg) {
        const r = sg.box, m = 5; if (Math.max(a[0], b[0]) < r[0] - m || Math.min(a[0], b[0]) > r[2] + m || Math.max(a[1], b[1]) < r[1] - m || Math.min(a[1], b[1]) > r[3] + m) return false;
        const P = sg.pts, n = P.length, lati = sg.chiuso ? n : n - 1;
        for (let i = 0; i < lati; i++) { const c = P[i], d = P[(i + 1) % n]; if (incr(a, b, c, d)) return true; if (!sg.chiuso && (distSeg(c, a, b) < 4 || distSeg(a, c, d) < 4)) return true; }
        return sg.chiuso && (dentro(a, P) || dentro(b, P));
      }
      const coperto = (q, davanti) => davanti.some(f => f.sagome.some(sg => sg.chiuso ? dentro(q, sg.pts) || sg.pts.some((c, i) => distSeg(q, c, sg.pts[(i + 1) % sg.pts.length]) < 3)
                                                                         : sg.pts.some((c, i) => i && distSeg(q, sg.pts[i - 1], c) < 5)));
      function candidati(F, j, w, h) {   // punti del bordo dello strato j che nessuno strato davanti copre, ogni ~10 px
        const out = [], davanti = F.slice(j + 1);
        for (const sg of F[j].sagome) { let ult = null; const bx = scatola(sg.pts), passoC = Math.max(2, Math.min(10, (bx[2] - bx[0] + bx[3] - bx[1]) / 6));   // pezzi piccoli: punti più fitti
          const giro = sg.chiuso && sg.pts.length < 12 ? sg.pts.flatMap((q, i) => { const r = sg.pts[(i + 1) % sg.pts.length]; return [q, [(q[0] + r[0]) / 2, (q[1] + r[1]) / 2]]; }) : sg.pts;
          for (const q of giro) { if (ult && Math.hypot(q[0] - ult[0], q[1] - ult[1]) < passoC) continue; ult = q;
            if (q[0] < 8 || q[1] < 56 || q[0] > w - 8 || q[1] > h - 8) continue; if (!coperto(q, davanti)) out.push(q); } }
        return out;
      }
      // impaginazione: per ogni strato (retro -> fronte) un punto visibile e una riga, righe nell'ordine della pila a >= PASSO;
      // ricerca in profondità con budget: le opzioni più corte prima, fili che non toccano le sagome degli altri né i fili già posati
      function impagina(F, X, yMin, yMax) {
        const n = F.length; let budget = 6000;
        const pulito = (k, pl) => [0, 1].every(t => { const a = pl[t], b = pl[t + 1]; if (Math.hypot(a[0] - b[0], a[1] - b[1]) < 0.5) return true;
          return F.every((f, i) => i === k || f.sagome.every(sg => !tocca(a, b, sg))); });
        const nonIncrocia = (pl, linee) => linee.every(o => [0, 1].every(t => [0, 1].every(u => !incr(pl[t], pl[t + 1], o[u], o[u + 1]))));
        function passo(k, yPrev, linee) {
          if (k === n) return [];
          const lo = k ? yPrev + PASSO : yMin, hi = yMax - (n - 1 - k) * PASSO; if (lo > hi) return null;
          const opz = [];
          for (const q of F[k].cand) { if (q[0] > X - 16) continue;
            for (const d of [0, 12, -12, 24, -24, 48, -48, 96, -96]) { const y = q[1] + d; if (y >= lo && y <= hi) opz.push([q, y]); }
            for (const y of [lo, lo + 12, lo + 24]) if (y <= hi) opz.push([q, y]); }
          opz.sort((a, b) => (Math.abs(a[0][1] - a[1]) + X - a[0][0]) - (Math.abs(b[0][1] - b[1]) + X - b[0][0]));
          let prove = 0;
          for (const [q, y] of opz) {
            if (--budget < 0) return null;
            const pl = [q, [q[0], y], [X - 10, y]];
            if (!nonIncrocia(pl, linee) || !pulito(k, pl)) continue;
            const resto = passo(k + 1, y, linee.concat([pl])); if (resto) return [pl].concat(resto);
            if (++prove >= 5) break;
          }
          return null;
        }
        const linee = passo(0, 0, []);
        return linee ? { linee } : null;
      }
      function etichette(e) {
        const w = mondo.vista.w, h = mondo.vista.h;
        if (!(w > 0 && h > 0)) return;                                     // tela non ancora misurata
        const vis = e > 0.55;
        const F = vis ? mondo.fili() : null;
        if (!F || !F.length) { etich.forEach(el => el.style.opacity = 0); quota.style.opacity = 0; if (fili) { fili.style.opacity = 0; fili.innerHTML = ""; } window.__fili = null; return; }
        for (const f of F) for (const sg of f.sagome) sg.box = scatola(sg.pts);
        F.forEach((f, j) => { f.cand = candidati(F, j, w, h); });
        const tuttiPts = F.flatMap(f => f.sagome.flatMap(sg => sg.pts)), ogg = scatola(tuttiPts);
        const stretto = w < 1024;
        const dati = { stretto, oggetto: ogg, strati: F.map(f => ({ k: f.k, riquadro: f.riquadro, maschera: f.maschera, sagome: f.sagome.map(sg => ({ pts: sg.pts.map(q => [+q[0].toFixed(1), +q[1].toFixed(1)]), chiuso: sg.chiuso })) })), etichette: [], linee: [] };
        if (stretto) {
          // numeri piccoli sui punti visibili: per ogni strato il punto più lontano dai numeri già messi (almeno 22 px)
          const posti = [];
          F.forEach((f, k) => { let best = null, bd = -1;
            for (const q of f.cand) { const d = posti.length ? Math.min(...posti.map(p => Math.hypot(p[0] - q[0], p[1] - q[1]))) : 1e6; const dd = Math.min(d, 60) - (q[1] - ogg[1]) * 0.02; if (dd > bd) { bd = dd; best = q; } }
            if (!best) best = f.maschera[0]; posti.push(best); dati.strati[k].ancora = best; });
          etich.forEach((el, k) => { const a = posti[k]; el.classList.add("solo-numero");
            el.style.transform = "translate(" + a[0] + "px," + a[1] + "px) translate(-50%,-50%)"; el.style.opacity = 1; });
          quota.style.opacity = 0; if (fili) { fili.style.opacity = 0; fili.innerHTML = ""; }
          dati.numeri = posti; window.__fili = dati; return;
        }
        const X = Math.min(ogg[2] + 36, w - 24 - Math.max(...etich.map(el => el.querySelector(".lungo").offsetWidth + 34)));
        const yMin = 64, yMax = h - (s.riservaSotto || 0) - 60;   // la colonna (e la quota sotto) resta sopra la tappa
        let lay = impagina(F, X, yMin, yMax);
        if (!lay) {   // nessuna combinazione pulita: fili dal punto visibile più vicino alla riga (la prova automatica lo segnala)
          const righe = F.map((_, k) => (ogg[1] + ogg[3]) / 2 + (k - (F.length - 1) / 2) * PASSO);
          lay = { linee: F.map((f, k) => { const y = righe[k]; const q = (f.cand.length ? f.cand : f.maschera).reduce((a, b) => (Math.abs(b[1] - y) + X - b[0] < Math.abs(a[1] - y) + X - a[0] ? b : a)); return [q, [q[0], y], [X - 10, y]]; }) };
        }
        dati.pulito = !!lay.linee && !lay.ripiego;
        let linee = "";
        lay.linee.forEach((pl, k) => {
          const el = etich[k], y = pl[2][1]; el.classList.remove("solo-numero");
          el.style.transform = "translate(" + X + "px," + y + "px) translateY(-50%)"; el.style.opacity = 1;
          linee += '<polyline points="' + pl.map(q => q[0].toFixed(1) + "," + q[1].toFixed(1)).join(" ") + '"/><circle cx="' + pl[0][0].toFixed(1) + '" cy="' + pl[0][1].toFixed(1) + '" r="3"/>';
          dati.linee.push({ k: F[k].k, punti: pl }); dati.strati[k].ancora = pl[0];
        });
        const y0 = lay.linee[0][2][1] - 10, y1 = lay.linee[lay.linee.length - 1][2][1] + 10, xq = X - 22;
        linee += '<path class="graffa" d="M' + (xq + 6) + ',' + y0 + ' H' + xq + ' V' + y1 + ' H' + (xq + 6) + '"/>';
        quota.style.transform = "translate(" + X + "px," + (y1 + 18) + "px)"; quota.style.opacity = 1;
        if (fili) { fili.setAttribute("viewBox", "0 0 " + w + " " + h); fili.innerHTML = linee; fili.style.opacity = 1; }
        const c = contAncore.getBoundingClientRect();
        dati.etichette = etich.map(el => { const r = el.getBoundingClientRect(); return { k: el.dataset.k, riquadro: [r.left - c.left, r.top - c.top, r.right - c.left, r.bottom - c.top] }; });
        const rq = quota.getBoundingClientRect(); dati.colonna = [X, Math.max(...dati.etichette.map(e => e.riquadro[2]), rq.right - c.left)];
        window.__fili = dati;
      }
      function passo(t) {
        tReg = t;
        // spazio che serve sotto la pila nell'esploso a schermo largo: la tappa visibile + la colonna della legenda
        { const tp = document.querySelector(".tappa:not([hidden])"); const top = tp ? tp.getBoundingClientRect().top : mondo.vista.h; s.riservaSotto = (mondo.vista.h - top) + 24; }
        // a schermo largo oggetto al 62% e colonna accanto (<= 25%): il gruppo sta al centro; stretto: oggetto al 92%, centrato
        s.centroX = mondo.vista.w >= 1024 ? 0.39 : 0.5; s.larghezza = mondo.vista.w >= 1024 ? 0.62 : 0.92;
        const e = mondo.disegna(t, progresso(), azVista(t) * (1 - mondo.esploso())); etichette(e);   // il pendolo è dell'insegna montata: a pila aperta la camera sta ferma e la legenda si legge
        if (V.btn && !(REG && q.get("demo") === "giro")) V.btn.hidden = V.giro != null || e > 0.05;   // il pulsante del giroscopio solo sull'insegna montata   // in registrazione la camera oscilla: si vede la parallasse
        // (la sagoma di 175 cm è stata tolta: la scala la danno le misure scritte e lo slider)
      }
      if (REG) { window.__fotogramma = passo; passo(0.001); }
      else { const t0 = performance.now(); const ciclo = ora => { passo((ora - t0) / 1000); mondo.misuraFps(ora); requestAnimationFrame(ciclo); }; requestAnimationFrame(ciclo); }
      clearTimeout(spia); velo.dataset.stato = "pronto"; window.__pronto = true;
    } catch (err) { clearTimeout(spia); console.error(err); velo.dataset.stato = "errore"; msg.textContent = "Il 3D non si è caricato. La foto resta qui."; }
  })();
})();
