/* Stato della scheda: misura (0..2), scritta sì/no, logo sì/no. Vive nell'indirizzo (?m=2&s=1&l=1) così la scelta si gira al socio.
   Le direzioni del ventaglio cambiano solo il markup: i data-attributi sono gli stessi. */
(function () {
  var D = window.DATI;
  var euro = function (n) { return new Intl.NumberFormat('it-IT').format(n) + ' €'; };
  var q = new URLSearchParams(location.search);
  var stato = {
    m: Math.min(2, Math.max(0, (parseInt(q.get('m'), 10) || 2) - 1)),
    scritta: q.get('s') !== '0',
    logo: q.get('l') !== '0'
  };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var scena = $('[data-scena]');
  if (scena) { try { window.Scena.costruisci(scena, D); } catch (e) { scena.classList.add('errore'); scena = null; } }

  function prezzi(i) { var m = D.misure[i]; return { scritta: m.scritta.prezzo, logo: m.logo.prezzo }; }
  function dimTesto(i) { return D.misure[i].scritta.lastra.replace(/\s/g, ' '); }
  function dimLogo(i) { return D.misure[i].logo.lastra.replace(/\s/g, ' '); }

  function insieme() { var m = D.misure[stato.m]; return stato.scritta && stato.logo && m.insieme ? m.insieme : null; }
  function totale() { var p = prezzi(stato.m); if (insieme()) return insieme().prezzo; return (stato.scritta ? p.scritta : 0) + (stato.logo ? p.logo : 0); }
  function cosa() {
    if (stato.scritta && stato.logo) return 'la scritta e il logo';
    if (stato.scritta) return 'la scritta';
    if (stato.logo) return 'il logo';
    return '';
  }

  function messaggio() {
    var m = D.misure[stato.m];
    return 'Buongiorno, ho visto la proposta di OK per Fratelli D\'Achino. Scelgo ' + cosa() + ', misura ' + (stato.m + 1) +
      ' (testo largo ' + m.larghezza_testo_cm + ' cm), in plexiglass trasparente con neon bianco e verde. Totale ' + new Intl.NumberFormat('it-IT').format(totale()) + ' €. Possiamo sentirci?';
  }

  function prezziTacche() {
    $$('[data-stop-prezzo]').forEach(function (el) {
      el.textContent = euro(D.misure[+el.getAttribute('data-stop-i')][el.getAttribute('data-stop-prezzo')].prezzo);
    });
  }

  function condividi() {
    var msg = $('[data-condividi-msg]');
    var testo = 'Guarda questa scelta per le insegne di Fratelli D’Achino: ' + cosa() + ', misura ' + (stato.m + 1) + ', ' + new Intl.NumberFormat('it-IT').format(totale()) + ' €.';
    var url = location.href;
    if (navigator.share) {
      navigator.share({ title: 'Insegne Fratelli D’Achino', text: testo, url: url }).catch(function () {});
    } else {
      var w = 'https://wa.me/?text=' + encodeURIComponent(testo + ' ' + url);
      window.open(w, '_blank', 'noopener');
      if (msg) msg.textContent = 'Si apre WhatsApp con la scelta già scritta.';
    }
  }

  function render() {
    var i = stato.m, m = D.misure[i], p = prezzi(i);
    $$('[data-slider-input]').forEach(function (el) { el.value = i; el.setAttribute('aria-valuetext', 'Misura ' + (i + 1) + ', testo largo ' + m.larghezza_testo_cm + ' centimetri. Scritta ' + p.scritta + ' euro, logo ' + p.logo + ' euro'); el.style.setProperty('--p', (i * 50) + '%'); });
    $$('[data-slider-binario]').forEach(function (el) { el.style.setProperty('--p', (i * 50) + '%'); });
    $$('[data-tacca]').forEach(function (el, k) { el.classList.toggle('on', k <= i); });
    $$('[data-slider-valore]').forEach(function (el) { el.textContent = 'Misura ' + (i + 1); });
    $$('[data-slider-sotto]').forEach(function (el) { el.textContent = 'testo largo ' + m.larghezza_testo_cm + ' cm · logo Ø ' + Math.round(m.diametro_logo_cm) + ' cm'; });
    $$('[data-stop]').forEach(function (b) { var k = +b.getAttribute('data-stop'); b.setAttribute('aria-pressed', String(k === i)); });
    $$('[data-prezzo]').forEach(function (el) { el.textContent = euro(p[el.getAttribute('data-prezzo')]); });
    $$('[data-dettaglio="scritta"]').forEach(function (el) { el.textContent = dimTesto(i) + ' cm'; });
    $$('[data-dettaglio="logo"]').forEach(function (el) { el.textContent = dimLogo(i) + ' cm'; });
    $$('[data-scelta]').forEach(function (el) { el.checked = !!stato[el.getAttribute('data-scelta')]; });
    var t = totale();
    $$('[data-condividi]').forEach(function (b) { b.disabled = !t; });
    $$('[data-totale]').forEach(function (el) { el.textContent = euro(t); });
    $$('[data-totale-nota]').forEach(function (el) { el.textContent = !t ? 'Scegli almeno un’insegna' : insieme() ? 'Insieme risparmi ' + euro(insieme().risparmio) : cosa().charAt(0).toUpperCase() + cosa().slice(1) + ' · misura ' + (i + 1); });
    $$('[data-cta]').forEach(function (a) {
      if (t) { a.setAttribute('href', 'https://wa.me/' + D.whatsapp + '?text=' + encodeURIComponent(messaggio())); a.removeAttribute('aria-disabled'); a.removeAttribute('tabindex'); }
      else { a.removeAttribute('href'); a.setAttribute('aria-disabled', 'true'); a.setAttribute('tabindex', '-1'); }
    });
    $$('[data-riga]').forEach(function (tr) { var k = +tr.getAttribute('data-riga'); if (k === i) tr.setAttribute('aria-current', 'true'); else tr.removeAttribute('aria-current'); });
    $$('[data-cella]').forEach(function (c) {
      var r = D.misure[+c.getAttribute('data-riga-c')];
      var w = c.getAttribute('data-cella');
      c.textContent = euro(w === 'entrambe' ? r.scritta.prezzo + r.logo.prezzo : r[w].prezzo);
    });
    $$('[data-pick]').forEach(function (b) {
      var r = +b.getAttribute('data-pick-riga'), w = b.getAttribute('data-pick');
      var on = r === i && ((w === 'scritta' && stato.scritta && !stato.logo) || (w === 'logo' && stato.logo && !stato.scritta) || (w === 'entrambe' && stato.scritta && stato.logo));
      b.setAttribute('aria-pressed', String(on));
    });
    if (scena) window.Scena.aggiorna(scena, stato);
    if (typeof segnala === 'function') segnala();
    var u = new URLSearchParams(); u.set('m', i + 1); u.set('s', stato.scritta ? 1 : 0); u.set('l', stato.logo ? 1 : 0);
    try { history.replaceState(null, '', '?' + u.toString()); } catch (e) {}
  }

  $$('[data-slider-input]').forEach(function (el) { el.addEventListener('input', function () { stato.m = +el.value; render(); }); });
  $$('[data-stop]').forEach(function (b) { b.addEventListener('click', function () { stato.m = +b.getAttribute('data-stop'); render(); }); });
  $$('[data-scelta]').forEach(function (el) { el.addEventListener('change', function () { stato[el.getAttribute('data-scelta')] = el.checked; render(); }); });
  $$('[data-riga]').forEach(function (tr) { tr.addEventListener('click', function (e) { if (e.target.closest('a,button')) return; stato.m = +tr.getAttribute('data-riga'); render(); }); });
  $$('[data-pick]').forEach(function (b) {
    b.addEventListener('click', function () {
      var r = +b.getAttribute('data-pick-riga'), w = b.getAttribute('data-pick');
      stato.m = r; stato.scritta = w !== 'logo'; stato.logo = w !== 'scritta'; render();
    });
  });
  $$('[data-condividi]').forEach(function (b) { b.addEventListener('click', condividi); });
  var corpo = $('.b-corpo');
  function segnala() { if (!corpo) return; var resto = corpo.scrollHeight - corpo.clientHeight - corpo.scrollTop; corpo.classList.toggle('altro', resto > 6); }
  if (corpo) { corpo.addEventListener('scroll', segnala, { passive: true }); window.addEventListener('resize', segnala); setTimeout(segnala, 60); }
  var dett = $('.dettagli'); if (dett && window.matchMedia('(min-width: 700px)').matches) dett.open = true;
  prezziTacche();
  render();
})();
