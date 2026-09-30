// FUTURA · schede v2 · logica di pagina: stato nell'URL, prezzo dei 4 prodotti, comandi, telecomando RF, app, condivisione, 3D a tappe.
// NIENTE import statico del motore: three scende dentro avvia3d(), contato dalla barra sui byte.
(function () {
  "use strict";
  document.documentElement.classList.add("js");
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
    frontale: q.get("frontale") === "pellicola" ? "pellicola" : "spia",
    modo: "fisso", velocita: q.has("vel") ? Math.min(1, Math.max(0, +q.get("vel"))) : 0.45,
    livello: q.has("liv") ? Math.min(1, Math.max(0.06, +q.get("liv"))) : 0.7,
    acceso: q.get("spento") !== "1", giorno: q.get("giorno") === "1"
  };
  const eff = q.get("effetto");
  if (s.luce === "digitale") s.modo = EFF_APP.includes(eff) ? eff : "scia";
  else if (s.tele && EFF_TELE.includes(eff)) s.modo = eff;
  window.__stato = s;

  const euro = n => { const [i, d] = (Math.round(n * 100) / 100).toFixed(2).split("."); const I = i.replace(/\B(?=(\d{3})+(?!\d))/g, "."); return (d === "00" ? I : I + "," + d) + " €"; };
  const tutti = (sel, f) => document.querySelectorAll(sel).forEach(f);
  const tele = () => s.luce === "fissa" && s.tele;
  function conto() {
    if (PROD === "infinity") { const r = D.infinity[s.misura][s.luce]; return { prezzo: r[s.frontale] + (tele() ? D.telecomandino : 0), pdf: r.pdf, ing: D.infinity[s.misura].ingombro }; }
    const r = D.gen2[s.misura][s.luce]; return { prezzo: r.prezzo + (tele() ? D.telecomandino : 0), pdf: r.pdf, ing: D.gen2[s.misura].dim + " cm" };
  }
  const descLuce = () => s.luce === "digitale" ? "luce digitale" : (s.tele ? "luce fissa con telecomandino" : "luce fissa");
  const descrizione = () => NOME + " " + s.misura + " cm, " + descLuce() + (PROD === "infinity" ? ", frontale " + (s.frontale === "spia" ? "specchio spia" : "pellicola specchio") : "");
  function urlScelta() {
    const n = new URLSearchParams(); n.set("misura", s.misura); n.set("luce", s.luce);
    if (PROD === "infinity") n.set("frontale", s.frontale);
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
    tutti("[data-frontale]", b => b.setAttribute("aria-pressed", String(b.dataset.frontale === s.frontale)));
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
    if (d.frontale) s.frontale = d.frontale;
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
    img.addEventListener("load", pronta); img.addEventListener("error", () => fig.classList.add("rotta")); if (img.complete && img.naturalWidth) pronta(); });
  disegna();
  // la barra fissa si ritira quando la tavola rossa con il suo «Scegli» è in vista: mai due pieni insieme
  const barraF = document.querySelector("[data-barra-fissa]"), cta = document.querySelector("[data-cta]");
  if (barraF && cta && "IntersectionObserver" in window) new IntersectionObserver(es => barraF.classList.toggle("ceduta", es[0].isIntersecting)).observe(cta);

  // ---------- corsa: lo scroll smonta e rimonta ----------
  const corsa = document.querySelector("[data-corsa]");
  const progresso = () => { if (REG && q.has("p")) return +q.get("p"); if (!corsa) return 0; const r = corsa.getBoundingClientRect(); return Math.min(1, Math.max(0, -r.top / (r.height - innerHeight))); };
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
      // trascinamento orizzontale che non ruba lo scroll verticale
      let az = 0, x0 = null;
      tela.addEventListener("pointerdown", e => { x0 = e.clientX; tela.setPointerCapture(e.pointerId); });
      tela.addEventListener("pointermove", e => { if (x0 === null) return; az = Math.max(-0.9, Math.min(0.9, az + (e.clientX - x0) * 0.006)); x0 = e.clientX; });
      tela.addEventListener("pointerup", () => { x0 = null; });
      // etichette dell'esploso: testo vero, posizione proiettata
      const anc = [...document.querySelectorAll("[data-ancora]")];
      // etichette dell'esploso: una colonna fuori dall'oggetto, fili che finiscono sul proprio strato, >= 24 px fra le etichette.
      // Sotto i 600 px niente testo sopra la geometria: c'è l'elenco nella tappa.
      const fili = document.querySelector("[data-fili]");
      function etichette(e) {
        const stretto = mondo.vista.w < 600, vis = e > 0.55 && !stretto;
        if (fili) fili.style.opacity = vis ? 1 : 0;
        const punti = anc.map(el => ({ el, xy: mondo.punto(el.dataset.ancora, +(el.dataset.fx || 0.5), +(el.dataset.fy || 0.5)) })).filter(a => a.xy);
        punti.sort((a, b) => a.xy[1] - b.xy[1]);
        const w = mondo.vista.w, h = mondo.vista.h, colX = w - Math.min(400, w * 0.3), passo = 44, y0 = Math.max(h * 0.2, h * 0.5 - passo * (punti.length - 1) / 2);
        let linee = "";
        punti.forEach((a, k) => {
          const y = y0 + k * passo; a.el.style.transform = "translate(" + colX + "px," + y + "px) translateY(-50%)"; a.el.style.opacity = vis ? 1 : 0;
          linee += '<line x1="' + (colX - 10) + '" y1="' + y + '" x2="' + a.xy[0] + '" y2="' + a.xy[1] + '"/><circle cx="' + a.xy[0] + '" cy="' + a.xy[1] + '" r="3"/>';
        });
        if (fili) { fili.setAttribute("viewBox", "0 0 " + w + " " + h); fili.innerHTML = linee; }
      }
      const etAsta = document.querySelector("[data-etichetta-asta]");
      function passo(t) {
        mondo.frontale(s.frontale);
        const e = mondo.disegna(t, progresso(), REG ? Math.sin(t * 0.7) * (innerWidth < 600 ? 0.25 : 0.5) : az); etichette(e);   // in registrazione la camera oscilla: si vede la parallasse
        if (etAsta) { const tp = mondo.testaPx(); const x = tp.spalle[2] + 10, y = tp.testa[1];   // accanto alla testa, all'altezza del viso: mai sopra
          etAsta.style.opacity = !mondo.persona.visible || x > mondo.vista.w - 60 ? 0 : 1;
          etAsta.style.transform = "translate(" + x + "px," + y + "px) translateY(-50%)"; }
      }
      if (REG) { window.__fotogramma = passo; passo(0.001); }
      else { const t0 = performance.now(); const ciclo = ora => { passo((ora - t0) / 1000); mondo.misuraFps(ora); requestAnimationFrame(ciclo); }; requestAnimationFrame(ciclo); }
      clearTimeout(spia); velo.dataset.stato = "pronto"; window.__pronto = true;
    } catch (err) { clearTimeout(spia); console.error(err); velo.dataset.stato = "errore"; msg.textContent = "Il 3D non si è caricato. La foto resta qui."; }
  })();
})();
