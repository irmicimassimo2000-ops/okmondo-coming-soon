/* app/ui/dom.js — due funzioni, e nessuna libreria.
   `e()` costruisce un nodo, `svuota()` lo azzera. Servono a togliere di
   mezzo il `innerHTML +=` che è il modo più rapido per farsi entrare
   in casa il testo di un cliente come se fosse marcatura. */
export function e(tag, attr = {}, figli = []){
  const n = document.createElement(tag);
  for(const k in attr){
    const v = attr[k];
    if(v === null || v === undefined || v === false) continue;
    if(k === "class") n.className = v;
    else if(k === "testo") n.textContent = v;
    else if(k === "html") n.innerHTML = v;          /* solo per i segni SVG nostri */
    else if(k === "stile") n.style.cssText = v;
    /* `data-vivo` non è decorazione: è la prova, scritta nel DOM, che
       questo comando FA qualcosa. Il banco di collaudo conta i tasti
       morti cercando chi non ha né `data-vivo` né `aria-disabled`, e
       così un comando che sembra vivo e non lo è non può passare
       inosservato — non perché qualcuno si ricordi di controllarlo, ma
       perché il controllo è automatico. */
    else if(k.startsWith("su")){
      n.addEventListener(k.slice(2).toLowerCase(), v);
      if(k === "suClick") n.setAttribute("data-vivo", "1");
    }
    else if(k.startsWith("data-") || k.startsWith("aria-")) n.setAttribute(k, v);
    else if(k in n) n[k] = v;
    else n.setAttribute(k, v);
  }
  for(const f of [].concat(figli)) if(f) n.append(f);
  return n;
}
export function svuota(n){ while(n.firstChild) n.removeChild(n.firstChild); }

/* ── LA VOCE ───────────────────────────────────────────────────────
   Una sola regione di annunci in tutta l'app (`#annunci`), e si scrive
   solo da qui. Si azzera prima di riempire perché un `role="status"`
   a cui si riscrive lo STESSO testo non annuncia niente: per il lettore
   di schermo non è cambiato nulla. */
export function annuncia(testo){
  const n = document.getElementById("annunci");
  if(!n) return;
  n.textContent = "";
  setTimeout(() => { n.textContent = testo; }, 40);
}

/* ── CIO' CHE NON C'E' ANCORA ──────────────────────────────────────
   Un comando che in questa fase non può fare niente non si toglie e
   non si lascia muto: si DICHIARA. `aria-disabled` (non `disabled`)
   perché resti raggiungibile da tastiera e leggibile — chi esplora ha
   diritto di sapere che la cosa esiste e quando arrivera'; un tasto
   `disabled` sparisce dal giro e non spiega niente. E al tocco parla,
   perché il silenzio è indistinguibile da un guasto. */
export function dichiaraInArrivo(n, fase, cosa){
  n.setAttribute("aria-disabled", "true");
  n.setAttribute("data-fase", fase);
  n.classList.add("inarrivo");
  const detto = (cosa || n.textContent.trim()) + " — in arrivo nella fase " + fase;
  n.setAttribute("aria-label", detto);
  n.addEventListener("click", (ev) => { ev.preventDefault(); ev.stopPropagation();
    annuncia(detto); });
  return n;
}
