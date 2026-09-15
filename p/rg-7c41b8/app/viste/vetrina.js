/* app/viste/vetrina.js — LA VETRINA.
   SCHELETRO ONESTO, e lo dichiara: barra di navigazione col titolo
   grande, l'elenco letto dallo store, lo stato vuoto, e il push sulla
   scheda del pezzo. Il negozio vero — le collezioni, i filtri, la
   stanza — e' F4: quello che serve qui e' che la NAVIGAZIONE e lo STATO
   abbiano qualcosa di reale su cui girare.
   Nessuna misura, nessun colore e nessun corpo di carattere vivono in
   questo file: solo classi e ruoli del sistema. */
import { e } from "app/ui/dom.js";
import { cella, lista } from "app/ui/cella.js";
import { vuoto } from "app/ui/vuoto.js";
import { tasto, vestiTasto } from "app/ui/tasto.js";
import { toast } from "app/ui/toast.js";
import { schermo } from "app/ui/barra-nav.js";
import { spingi, registraSchermo, torna, annuncia } from "app/rotta.js";
import { conTransizione } from "app/moto.js";

export function monta(el, store){
  const {leggi, invia, iscrivi, soldi} = store;

  registraSchermo("pezzo", (id, dove) => schedaPezzo(id, dove, store));

  function disegna(){
    const s = leggi();
    const catalogo = store.catalogo || [];
    const pagina = schermo(el, {
      titolo:"La vetrina",
      occhiello: catalogo.length + (catalogo.length === 1 ? " pezzo" : " pezzi")
    });

    /* la vetrina vera si guarda in due modi — l'elenco e la stanza in
       tre dimensioni. La stanza e' F4: qui si dichiara, non si finge. */
    pagina.append(e("div", {class:"riga-tasti"}, [
      tasto("Elenco", {tipo:"secondario", premuto:true,
        suClick:() => annuncia("Sei gia' nell'elenco.")}),
      tasto("Stanza", {tipo:"secondario", inArrivo:"F4",
        etichetta:"Guarda la vetrina come una stanza"})
    ]));

    if(!catalogo.length){
      pagina.append(vuoto({
        segno:"vetrina",
        titolo:"La vetrina e’ vuota",
        testo:"Il catalogo non e’ ancora arrivato. Quando c’e’, i pezzi compaiono qui.",
        azione:"Vai al cofanetto",
        suAzione:() => { location.hash = "#/cofanetto"; }
      }));
      return;
    }

    /* RAGGRUPPATI PER FAMIGLIA, non in un elenco unico da trenta righe:
       trenta celle di fila senza intestazioni sono un muro, ed e'
       esattamente il motivo per cui una lista iOS porta i titoli di
       gruppo. */
    const perFamiglia = new Map();
    for(const p of catalogo){
      const f = p.tipo || "Pezzi";
      if(!perFamiglia.has(f)) perFamiglia.set(f, []);
      perFamiglia.get(f).push(p);
    }
    for(const [f, pezzi] of perFamiglia) pagina.append(lista(f, pezzi.map(p => cella({
      id:p.id, foto:p.foto, titolo:p.nome, sotto:p.materia,
      coda:soldi(p.prezzo),
      etichetta:p.nome + ", " + soldi(p.prezzo),
      suClick:() => spingi("pezzo/" + p.id)
    }))));

    const w = s.wishlist;
    pagina.append(lista("La tua lista", w.length
      ? w.map(id => {
          const p = catalogo.find(x => x.id === id) || {id, nome:id};
          return cella({id, foto:p.foto, titolo:p.nome, sotto:p.materia,
            suClick:() => spingi("pezzo/" + id)});
        })
      : [cella({titolo:"Nessun pezzo salvato",
                sotto:"Aprine uno e tocca «Salva nella lista»."})]));
  }

  disegna();
  /* si ridisegna solo per i rami che ci riguardano: una vista che si
     ricostruisce a ogni evento perde il fuoco e la posizione. E il
     ridisegno passa da `conTransizione`: QUI il DOM cambia davvero. */
  iscrivi((s, ev, prima) => {
    if(!prima || s.wishlist !== prima.wishlist) conTransizione(disegna);
  });
}

/* ── LA SCHEDA DEL PEZZO (lo schermo che il push apre) ───────────────
   Porta la SUA barra di navigazione, col ritorno: e' la schermata
   spinta, non un pezzo di quella di prima. */
function schedaPezzo(id, dove, store){
  const {leggi, invia, soldi} = store;
  const p = (store.catalogo || []).find(x => x.id === id) ||
            {id, nome:id, materia:"", prezzo:0, foto:""};

  const pagina = schermo(dove, {titolo:p.nome, indietro:torna,
    etichettaIndietro:"Torna alla vetrina"});

  if(p.foto) pagina.append(e("img", {class:"scatto", src:p.foto, alt:""}));
  if(p.materia) pagina.append(e("p", {class:"t-body tenue", testo:p.materia}));
  pagina.append(e("p", {class:"t-2 cifra prezzo", testo:soldi(p.prezzo)}));

  const t = tasto("Salva nella lista", {tipo:"primario", largo:true, suClick:() => {
    const c = leggi().wishlist.includes(id);
    invia(c ? "wishlist/togli" : "wishlist/aggiungi", {id});
    toast(c ? "Tolto dalla lista." : "Salvato nella lista.", {
      annulla:() => invia(c ? "wishlist/aggiungi" : "wishlist/togli", {id})});
    veste();
  }});
  function veste(){
    const c = leggi().wishlist.includes(id);
    vestiTasto(t, c ? "Togli dalla lista" : "Salva nella lista");
    t.setAttribute("aria-pressed", String(c));
  }
  veste();
  pagina.append(e("div", {class:"colonna-tasti"}, [
    t,
    tasto("Mandala a chi la paga", {tipo:"secondario", largo:true, inArrivo:"F4",
      etichetta:"Manda la lista a chi la paga"}),
    tasto("Vedi la collezione", {tipo:"secondario", largo:true, inArrivo:"F4",
      etichetta:"Vedi la collezione di questo pezzo"})
  ]));
  annuncia(p.nome);
}
