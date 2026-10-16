/* La scena in scala: muro scuro, una persona di 1,80 m, le due insegne (scritta e logo) nella stessa posizione
   del marchio. Tutto in centimetri veri: la scena misura 340 x 270 cm, il fondo delle insegne sta a 105 cm da terra.
   Le tre misure sono tre gruppi già calcolati dal motore (solco 8 mm e aria 20 mm restano veri a ogni misura). */
(function () {
  var NS = 'http://www.w3.org/2000/svg';
  var W = 340, H = 270, ANCORA_X = 214, FONDO_Y = 168;   // fondo insegne a 105 cm da terra (270-165)

  var T = { top: '#27402f', bot: '#0c150e', wash: '#b9e36a', washOp: .30, persA: 'rgb(255 255 255 / .09)', persB: 'rgb(185 227 106 / .36)', persLine: 'rgb(255 255 255 / .30)', plexFill: 'rgb(236 247 228 / .10)', plexLine: 'rgb(255 255 255 / .78)', pav: '#070c08', testo: '#fff', quota: 'rgb(255 255 255 / .55)' };

  function dPath(p) { return p.chiuso ? p.d + ' Z' : p.d; }

  function gruppoInsegna(ins, tipo, ox, oy) {
    var cls = tipo === 'scritta' ? 'bianco' : 'verde';
    var tubi = ins.paths.map(function (p) { return '<path class="tubo ' + cls + '" d="' + dPath(p) + '"/>'; }).join('');
    var anime = ins.paths.map(function (p) { return '<path class="anima ' + cls + '" d="' + dPath(p) + '"/>'; }).join('');
    return '<g class="insegna ' + tipo + '" data-tipo="' + tipo + '" data-on="true">' +
      '<path class="plex" d="' + ins.plex + '"/>' +
      '<g class="neon" filter="url(#alone-' + cls + ')">' + tubi + '</g>' + anime + '</g>';
  }

  // silhouette di 180 cm (y verso l'alto), metà destra come curve; la sinistra è lo specchio in ordine inverso
  var P0 = [4.6, 158];
  var META = [
    ['C', 10, 156.5, 19, 155.5, 23.5, 150.5], ['C', 26.5, 147, 27.5, 141, 27.8, 134],
    ['C', 28.5, 120, 29.5, 100, 30.2, 86], ['C', 30.6, 82, 30.4, 79.6, 28.2, 79], ['L', 25.2, 79.2],
    ['C', 24.8, 95, 22.8, 112, 20.8, 126], ['C', 19.8, 118, 18, 112, 17.6, 104], ['C', 17.6, 100, 18.8, 96, 18.8, 92],
    ['C', 18.6, 70, 14.8, 40, 12.6, 14], ['C', 12.2, 8, 12.2, 5.6, 12.8, 3.8], ['C', 15, 3.2, 15.8, 1.4, 14.8, 0], ['L', 3.8, 0],
    ['C', 3.4, 4, 3.4, 8, 3.8, 14], ['C', 3.2, 40, 1.6, 66, 0.8, 86]
  ];
  function corpoD() {
    var d = 'M' + P0.join(' '), pts = [P0];
    META.forEach(function (s) { d += s[0] + s.slice(1).join(' '); pts.push(s.slice(-2)); });
    d += 'L0 86';
    for (var i = META.length - 1; i >= 0; i--) {
      var s = META[i], p = pts[i], m = function (x) { return -x; };
      if (s[0] === 'L') d += 'L' + m(p[0]) + ' ' + p[1];
      else d += 'C' + m(s[3]) + ' ' + s[4] + ' ' + m(s[1]) + ' ' + s[2] + ' ' + m(p[0]) + ' ' + p[1];
    }
    return d + 'Z';
  }

  function persona() {
    var d = corpoD();
    return '<g class="persona" transform="translate(84 ' + H + ') scale(1 -1)">' +
      '<g fill="url(#pers)" stroke="' + T.persLine + '" stroke-width=".7" stroke-linejoin="round" filter="url(#ombrapers)">' +
      '<path d="' + d + '"/>' +
      '<ellipse cx="0" cy="168.4" rx="8.9" ry="11.3"/>' +
      '</g>' +
      // linee di costruzione appena accennate: spalle, cintura, scarpe
      '<g fill="none" stroke="' + T.persLine + '" stroke-width=".45" opacity=".75"><path d="M-17.6 100.5 C-7 98.5 7 98.5 17.6 100.5"/><path d="M-20.6 125 C-8 129 8 129 20.6 125"/></g>' +
      '<g fill="' + T.persLine + '" opacity=".5"><path d="M-12.8 3.8 C-15 3.2 -15.8 1.4 -14.8 0 L-3.8 0 L-3.9 3.6 Z"/><path d="M12.8 3.8 C15 3.2 15.8 1.4 14.8 0 L3.8 0 L3.9 3.6 Z"/></g>' +
      '</g>' +
      '<g class="quotatura"><g class="quota" stroke="' + T.quota + '" stroke-width="0.5" fill="none">' +
      '<path d="M116 ' + (H - 180) + ' V' + H + ' M112 ' + (H - 180) + ' H120 M112 ' + (H - 0.5) + ' H120"/></g>' +
      '<text x="123" y="' + (H - 94) + '" font-size="9" fill="' + T.testo + '" font-family="Geist, system-ui, sans-serif">1,80 m</text></g>';
  }

  function costruisci(host, dati) {
    var m = dati.misure;
    var defs = '<defs>' +
      '<linearGradient id="muro" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + T.top + '"/><stop offset="1" stop-color="' + T.bot + '"/></linearGradient>' +
      '<radialGradient id="luce" cx="' + (ANCORA_X / W) + '" cy=".42" r=".62"><stop offset="0" stop-color="' + T.wash + '" stop-opacity="' + T.washOp + '"/><stop offset="1" stop-color="' + T.wash + '" stop-opacity="0"/></radialGradient>' +
      '<linearGradient id="pers" gradientUnits="userSpaceOnUse" x1="-30" y1="0" x2="30" y2="0"><stop offset="0" stop-color="' + T.persA + '"/><stop offset="1" stop-color="' + T.persB + '"/></linearGradient>' +
      '<filter id="ombrapers" x="-30%" y="-10%" width="170%" height="120%"><feDropShadow dx="' + 5 + '" dy="0" stdDeviation="' + 4 + '" flood-color="#000" flood-opacity="' + .4 + '"/></filter>' +
      '<filter id="rilievo" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".022 .03" numOctaves="4" seed="9" result="n"/><feDiffuseLighting in="n" surfaceScale="2.2" diffuseConstant="1" lighting-color="#fff" result="l"><feDistantLight azimuth="225" elevation="52"/></feDiffuseLighting><feColorMatrix in="l" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -3.2 0 0 0 2.35"/></filter>' +
      '<filter id="rilievoL" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".022 .03" numOctaves="4" seed="9" result="n"/><feDiffuseLighting in="n" surfaceScale="2.2" diffuseConstant="1" lighting-color="#fff" result="l"><feDistantLight azimuth="225" elevation="52"/></feDiffuseLighting><feColorMatrix in="l" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  3.4 0 0 0 -2.75"/></filter>' +
      '<filter id="rugosa"><feTurbulence type="fractalNoise" baseFrequency=".6" numOctaves="2" seed="3"/><feColorMatrix values="0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 .22 0"/></filter>' +
      '<filter id="alone-bianco" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur in="SourceGraphic" stdDeviation="1.0" result="b1"/><feGaussianBlur in="SourceGraphic" stdDeviation="3.6" result="b2"/><feComponentTransfer in="b2" result="b2d"><feFuncA type="linear" slope=".75"/></feComponentTransfer><feMerge><feMergeNode in="b2d"/><feMergeNode in="b1"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
      '<filter id="alone-verde" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur in="SourceGraphic" stdDeviation="1.0" result="b1"/><feGaussianBlur in="SourceGraphic" stdDeviation="3.8" result="b2"/><feComponentTransfer in="b2" result="b2d"><feFuncA type="linear" slope=".9"/></feComponentTransfer><feMerge><feMergeNode in="b2d"/><feMergeNode in="b1"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
      '<filter id="ombra" x="-15%" y="-15%" width="130%" height="140%"><feDropShadow dx="0.6" dy="1.6" stdDeviation="2.2" flood-color="#000" flood-opacity=".5"/></filter>' +
      '<filter id="grana"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="4"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .05 0"/></filter>' +
      '</defs>';
    var stile = '<style>' +
      '.plex{fill:' + T.plexFill + ';stroke:' + T.plexLine + ';stroke-width:.45;filter:url(#ombra)}' +
      '.tubo{fill:none;stroke-linecap:round;stroke-linejoin:round;stroke-width:.8}' +
      '.anima{fill:none;stroke-linecap:round;stroke-linejoin:round;stroke-width:.3}' +
      '.tubo.bianco{stroke:#f4ffe0}.anima.bianco{stroke:#ffffff}' +
      '.tubo.verde{stroke:#9fd43f}.anima.verde{stroke:#f2ffd2}' +
      '.insegna[data-on=false] .plex{fill:rgb(240 248 235 / .035);stroke:rgb(255 255 255 / .25)}' +
      '.insegna .plex{transition:fill .26s,stroke .26s}' +
      '</style>';
    var R = '<rect x="-900" y="-500" width="2200" height="' + (H + 540) + '"';
    var sfondo = R + ' fill="url(#muro)"/>' +
      R + ' filter="url(#rilievo)" opacity=".5"/>' + R + ' filter="url(#rilievoL)" opacity=".16"/>' +
      R + ' filter="url(#rugosa)"/>' +
      R + ' fill="url(#luce)"/>' +
      '<rect x="-900" y="' + (H - 10) + '" width="2200" height="50" fill="' + T.pav + '"/><rect x="-900" y="' + (H - 11) + '" width="2200" height="1.2" fill="rgb(255 255 255 / .12)"/>';
    var gruppi = m.map(function (mi, i) {
      var L = mi.lockup_cm[0], A = mi.lockup_cm[1];
      var tx = ANCORA_X - L / 2, ty = FONDO_Y - A;
      return '<g transform="translate(' + tx.toFixed(2) + ' ' + ty.toFixed(2) + ')"><g class="misura" data-i="' + i + '" data-on="' + (i === 1) + '">' +
        gruppoInsegna(mi.scritta, 'scritta') + gruppoInsegna(mi.logo, 'logo') + '</g></g>';
    }).join('');
    host.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="' + (host.getAttribute('data-fit') || 'xMidYMid slice') + '" role="img" aria-label="Le due insegne su un muro, accanto a una persona alta 1,80 metri, per capire la misura">' +
      defs + stile + sfondo + persona() + gruppi + '</svg>';
    var svg = host.querySelector('svg');
    var vbStretto = host.getAttribute('data-vb-stretto') || '36 48 268 250';
    var vbLargo = host.getAttribute('data-vb-largo') || '-40 0 480 280';
    function inquadra() {
      var w = host.clientWidth, h = host.clientHeight;
      if (w < 1024 || !h) {
        var sp = host.querySelector('.persona'), qt = host.querySelector('.quotatura'), tx = host.querySelector('.quotatura text');
        var tel = w < 700;
        if (sp) sp.setAttribute('transform', 'translate(' + (tel ? 112 : 84) + ' ' + H + ') scale(1 -1)');
        if (qt) qt.setAttribute('transform', tel ? 'translate(-42 0)' : '');
        if (sp) sp.setAttribute('opacity', tel ? '.8' : '1');
        if (tx) { tx.setAttribute('x', tel ? 112 : 123); tx.setAttribute('text-anchor', tel ? 'middle' : 'start'); tx.setAttribute('font-size', tel ? 10 : 9); tx.setAttribute('transform', tel ? 'rotate(-90 112 ' + (H - 90) + ')' : ''); }
        if (tel) {
          var sc = Math.min(w / 212, h / 250), vw2 = w / sc, vh2 = h / sc;
          svg.setAttribute('viewBox', (171 - vw2 / 2).toFixed(2) + ' ' + (292 - vh2).toFixed(2) + ' ' + vw2.toFixed(2) + ' ' + vh2.toFixed(2));
          svg.setAttribute('preserveAspectRatio', 'xMinYMin meet');
        } else {
          svg.setAttribute('viewBox', vbStretto);
          svg.setAttribute('preserveAspectRatio', host.getAttribute('data-fit-stretto') || 'xMidYMin meet');
        }
        return;
      }
      // PC: la composizione sta nello spazio libero a sinistra del pannello, tutta intera e centrata lì
      var pan = document.querySelector('.b-pannello'), libero = pan ? Math.max(320, pan.getBoundingClientRect().left - 24) : w;
      var s = Math.min(h / 280, (libero * 0.9) / 240);
      var vw = w / s, vh = h / s;
      svg.setAttribute('viewBox', (175 - (libero / 2) / s).toFixed(2) + ' ' + (292 - vh).toFixed(2) + ' ' + vw.toFixed(2) + ' ' + vh.toFixed(2));
      svg.setAttribute('preserveAspectRatio', 'xMinYMin meet');
    }
    inquadra();
    if (window.ResizeObserver) new ResizeObserver(inquadra).observe(host); else window.addEventListener('resize', inquadra);
  }

  function aggiorna(host, stato) {
    host.querySelectorAll('.misura').forEach(function (g) { g.setAttribute('data-on', String(+g.getAttribute('data-i') === stato.m)); });
    host.querySelectorAll('.insegna.scritta').forEach(function (g) { g.setAttribute('data-on', String(!!stato.scritta)); });
    host.querySelectorAll('.insegna.logo').forEach(function (g) { g.setAttribute('data-on', String(!!stato.logo)); });
  }

  window.Scena = { costruisci: costruisci, aggiorna: aggiorna };
})();
