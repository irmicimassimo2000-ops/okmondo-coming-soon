// FUTURA · schede prodotto. Uno stato per pagina, nell'URL: chi inoltra il link manda la stessa scelta.
(function () {
  "use strict";
  document.documentElement.classList.add("js");
  var D = window.DATI;
  var pagina = document.body.getAttribute("data-pagina");
  var MISURE = ["120", "140", "160"];
  var VDOC = "20260930b";   // versione dei PDF: cambia quando si rigenerano i DOC3
  var FRONTALI = { spia: "specchio spia", pellicola: "pellicola specchio" };

  function euro(n) {
    var p = Number(n).toFixed(2).split(".");
    var i = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return (p[1] === "00" ? i : i + "," + p[1]) + " €";
  }
  function tutti(sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); }
  function testo(sel, t) { tutti(sel, function (e) { e.textContent = t; }); }

  // ---- stato ----
  var q = new URLSearchParams(location.search);
  var s = {
    misura: MISURE.indexOf(q.get("misura")) >= 0 ? q.get("misura") : "140",
    frontale: q.get("frontale") === "pellicola" ? "pellicola" : "spia",
    luce: q.get("luce") === "digitale" ? "digitale" : "fissa",
    telecomando: q.get("telecomando") === "1"
  };

  function calcola() {
    if (pagina === "infinity") {
      var m = D.infinity[s.misura];
      return {
        prezzo: m[s.frontale], nota: s.misura + " cm · frontale " + FRONTALI[s.frontale],
        pdf: m.pdf, pdfTesto: "Scarica il preventivo " + s.misura + " cm (PDF)",
        messaggio: "Ciao Massimo, per FUTURA scegliamo l'Infinity mirror " + s.misura + " cm, frontale " + FRONTALI[s.frontale] + ": " + euro(m[s.frontale]) + ".",
        riepilogo: "Infinity mirror " + s.misura + " cm, " + FRONTALI[s.frontale]
      };
    }
    var g = D.gen2[s.misura], base = g[s.luce].prezzo;
    var tele = s.luce === "fissa" && s.telecomando;
    var prezzo = Math.round((base + (tele ? D.telecomandino : 0)) * 100) / 100;
    var luce = s.luce === "fissa" ? "luce fissa" + (tele ? " con telecomandino" : "") : "luce digitale";
    return {
      prezzo: prezzo, nota: s.misura + " cm · " + luce,
      pdf: g[s.luce].pdf,   // il DOC3 della luce fissa contiene già il telecomandino come riga OPZIONALE e il totale
      pdfTesto: "Scarica il preventivo " + s.misura + " cm" + (tele ? ", con il telecomandino" : "") + " (PDF)",
      messaggio: "Ciao Massimo, per FUTURA scegliamo l'insegna LED 2ª generazione " + s.misura + " cm, " + luce + ": " + euro(prezzo) + ".",
      riepilogo: "Insegna LED 2ª generazione " + s.misura + " cm, " + luce
    };
  }

  function disegna() {
    var c = calcola();
    tutti("[data-misura]", function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-misura") === s.misura)); });
    tutti("[data-frontale]", function (b) {
      var f = b.getAttribute("data-frontale");
      b.setAttribute("aria-pressed", String(f === s.frontale));
      var p = b.querySelector("[data-prezzo-frontale]"); if (p) p.textContent = euro(D.infinity[s.misura][f]);
    });
    tutti("[data-luce]", function (b) {
      var l = b.getAttribute("data-luce");
      b.setAttribute("aria-pressed", String(l === s.luce));
      var p = b.querySelector("[data-prezzo-luce]"); if (p) p.textContent = euro(D.gen2[s.misura][l].prezzo);
    });
    tutti("[data-telecomando]", function (b) { b.setAttribute("aria-checked", String(s.telecomando)); });
    tutti("[data-solo-luce]", function (e) { e.hidden = e.getAttribute("data-solo-luce") !== s.luce; });
    tutti("[data-solo-telecomando]", function (e) { e.hidden = !(s.luce === "fissa" && s.telecomando); });
    tutti("[data-foto-luce]", function (img) {
      var src = img.getAttribute("data-src-" + s.luce);
      if (src && img.getAttribute("src") !== src) { img.parentElement.classList.remove("pronta"); img.src = src; img.alt = img.getAttribute("data-alt-" + s.luce) || ""; }
    });
    testo("[data-prezzo]", euro(c.prezzo));
    testo("[data-prezzo-nota]", c.nota);
    testo("[data-riepilogo]", c.riepilogo + ": " + euro(c.prezzo) + ".");
    testo("[data-misura-testo]", s.misura + " cm");
    if (pagina === "infinity") {
      testo("[data-ingombro]", D.infinity[s.misura].ingombro);
      testo("[data-supporti]", String(D.infinity[s.misura].supporti));
    } else if (pagina === "gen2") {
      testo("[data-ingombro]", D.gen2[s.misura].dim + " cm");
    }
    tutti("[data-scegli]", function (a) { a.href = "https://wa.me/" + D.whatsapp + "?text=" + encodeURIComponent(c.messaggio); });
    tutti("[data-messaggio]", function (e) { e.textContent = c.messaggio; });
    tutti("[data-pdf]", function (a) { a.href = c.pdf + "?v=" + VDOC; a.textContent = c.pdfTesto; });
    document.documentElement.style.setProperty("--scala", { "120": 0.75, "140": 0.875, "160": 1 }[s.misura]);
    if (pagina === "infinity" || pagina === "gen2") {
      var n = new URLSearchParams();
      n.set("misura", s.misura);
      if (pagina === "infinity") n.set("frontale", s.frontale);
      else { n.set("luce", s.luce); if (s.luce === "fissa" && s.telecomando) n.set("telecomando", "1"); }
      history.replaceState(null, "", "?" + n.toString());
    }
  }

  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-misura],[data-frontale],[data-luce],[data-telecomando],[data-copia]");
    if (!t) return;
    if (t.hasAttribute("data-misura")) s.misura = t.getAttribute("data-misura");
    if (t.hasAttribute("data-frontale")) s.frontale = t.getAttribute("data-frontale");
    if (t.hasAttribute("data-luce")) s.luce = t.getAttribute("data-luce");
    if (t.hasAttribute("data-telecomando")) s.telecomando = !s.telecomando;
    if (t.hasAttribute("data-copia")) { copia(); return; }
    disegna();
  });

  // copia del messaggio, per chi non ha WhatsApp sul computer: invio, successo, errore
  function copia() {
    var stato = document.querySelector("[data-stato-copia]");
    var msg = calcola().messaggio;
    function esito(ok) { if (stato) stato.textContent = ok ? "Messaggio copiato. Incollalo a Massimo: +39 320 859 9301." : "Copia non riuscita. Scrivi a Massimo: +39 320 859 9301."; }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(msg).then(function () { esito(true); }, function () { esito(false); });
    else esito(false);
  }

  // foto: attesa nel formato vero, poi pronta; se non arriva, lo dice
  tutti(".media img", function (img) {
    var fig = img.parentElement;
    function pronta() { fig.classList.add("pronta"); fig.classList.remove("rotta"); }
    img.addEventListener("load", pronta);
    img.addEventListener("error", function () { fig.classList.add("rotta"); });
    if (img.complete && img.naturalWidth) pronta();
  });
  // slot video: esistono nel codice ma restano nascosti finché il file non c'è (data-src vuoto).
  // Quando il file arriva: data-src="assets/video/<nome>.mp4" e lo slot prende il posto della foto dell'effetto.
  tutti("[data-slot-video]", function (slot) {
    var v = slot.querySelector("video"), src = v && v.getAttribute("data-src");
    if (!src) { slot.hidden = true; return; }
    v.src = src; slot.hidden = false;
    var foto = slot.parentElement.querySelector("[data-foto-effetto]"); if (foto) foto.hidden = true;
  });
  // video: se non parte, lo dice e offre il file
  tutti(".slot video", function (v) {
    v.addEventListener("error", function () { var n = v.closest(".slot").querySelector(".errore"); if (n) n.hidden = false; }, true);
  });

  if (pagina === "indice") {
    testo("[data-da-infinity]", "da " + euro(D.infinity["120"].pellicola));
    testo("[data-da-gen2]", "da " + euro(D.gen2["120"].fissa.prezzo));
  } else disegna();
})();
