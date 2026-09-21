/* ═══════════════════════════════════════════════════════════════════
   app/pagamento/adattatore.js — IL PAGAMENTO, DIETRO UNA PORTA SOLA.

   Il backend NON è ancora scelto (21/09/2026: Stripe hosted, Stripe
   embedded o Shopify — vedi `studio/riferimenti/ECOMMERCE.md`). La
   vetrina perciò non sa CHI incassa: conosce un contratto, e basta.

     adattatore = {
       nome,                    "prova" | "stripe" | …
       prova,                   true se non muove denaro: la vista lo DICE
       disponibile()            → boolean: si può pagare adesso?
       applePay()               → boolean: si mostra il tasto Apple Pay?
       paga(ordine)             → Promise<{esito, id, motivo?}>
     }
     ordine = {righe:[{id,nome,misura,quanti,prezzo}], totale (centesimi),
               consegna:{tipo:"ritiro"|"spedizione", costo, indirizzo?},
               contatto:{nome,email,telefono}, metodo:"applepay"|"carta"}
     esito  = "pagato" | "rifiutato" | "annullato"
     motivo = "carta_rifiutata" | "rete" | …     solo se rifiutato

   QUI DENTRO C'È UN ADATTATORE SOLO, ED È DI PROVA: nessuna chiave,
   nessuna chiamata di rete, nessun pacchetto. Si dichiara a schermo —
   titolo del foglio «Pagamento di prova», corpo «Nessun addebito.»,
   senza dirlo due volte — nel punto esatto in cui un pagamento vero
   chiederebbe la conferma (il foglio di Apple Pay, la pagina della
   carta): è lì che una persona deve saperlo, non in una nota a piè di
   pagina.
   Il giorno di Stripe si scrive `stripe.js` con lo stesso contratto e
   si cambia la riga in fondo. La vista non si tocca.

   IL COLLAUDO: `?paga=rifiuta` fa rifiutare il PRIMO tentativo della
   sessione (il secondo passa: è il ramo «Riprova con carta»);
   `?paga=annulla` chiude il foglio da solo, come chi ci ripensa.
   ═══════════════════════════════════════════════════════════════════ */
import { e } from "app/ui/dom.js";
import { tasto } from "app/ui/tasto.js";
import { apriFoglio, chiudiFoglio } from "app/ui/foglio.js";

const euro = (cent) => {
  const n = (cent | 0) / 100;
  return n.toLocaleString("it-IT", {
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2}) + " €";
};

let tentativi = 0;
const comando = () => new URLSearchParams(location.search).get("paga");

const PROVA = {
  nome: "prova",
  prova: true,
  disponibile(){ return true; },
  /* Apple Pay si offre SOLO dove esiste (Safari su un dispositivo con
     Wallet): altrove il tasto sarebbe una promessa che il telefono non
     può mantenere. */
  applePay(){ return typeof window !== "undefined" && !!window.ApplePaySession; },

  paga(ordine){
    return new Promise((risolvi) => {
      /* L'ESITO SI CONSEGNA A FOGLIO CHIUSO: la vista che lo riceve
         spinge una schermata o scrive una riga d'errore, e farlo mentre
         il foglio sta ancora scendendo sono due movimenti insieme. */
      let esito = null;
      const metodo = ordine.metodo === "applepay" ? "Apple Pay" : "Carta";
      const consegna = ordine.consegna && ordine.consegna.tipo === "spedizione"
        ? "Spedizione a casa" : "Ritiro in negozio";

      const conferma = tasto("Conferma il pagamento di prova",
        {tipo:"primario", largo:true, suClick: () => {
          if(conferma.disabled) return;
          conferma.disabled = true;
          conferma.setAttribute("aria-busy", "true");
          conferma.querySelector("span").textContent = "Pagamento in corso…";
          /* 700 ms: il tempo di una risposta vera, perché lo stato
             «invio» si veda e si possa collaudare. */
          setTimeout(() => {
            tentativi++;
            const rifiuta = comando() === "rifiuta" && tentativi === 1;
            esito = rifiuta
              ? {esito:"rifiutato", id:null, motivo:"carta_rifiutata"}
              : {esito:"pagato", id:"prova_" + Date.now().toString(36)};
            chiudiFoglio();
          }, 700);
        }});

      const dentro = e("div", {class:"va-foglio-corpo"}, [
        /* il titolo del foglio dice già «Pagamento di prova»: ripeterlo
           nella prima riga del corpo era la stessa frase due volte a
           due punti di distanza. Qui resta solo il fatto che serve —
           nessun addebito — dichiarato lo stesso, una volta sola. */
        e("p", {class:"t-body va-prova-detto",
          testo:"Nessun addebito."}),
        e("div", {class:"va-somme"}, [
          e("div", {class:"va-somma"}, [e("span", {testo:"Metodo"}), e("b", {testo:metodo})]),
          e("div", {class:"va-somma"}, [e("span", {testo:"Consegna"}), e("b", {testo:consegna})]),
          e("div", {class:"va-somma va-totale"}, [e("span", {testo:"Totale"}),
            e("b", {class:"cifra", testo:euro(ordine.totale)})])
        ]),
        conferma
      ]);

      const dlg = apriFoglio({titolo:"Pagamento di prova", contenuto:dentro,
        /* chi chiude il foglio senza confermare ha annullato: è quello
           che fa il foglio di Apple Pay quando si tocca fuori. */
        suChiusura: () => risolvi(esito || {esito:"annullato", id:null})});
      if(dlg) dlg.dataset.vista = "va";
      if(comando() === "annulla") setTimeout(chiudiFoglio, 400);
    });
  }
};

/* ── LA RIGA DA CAMBIARE IL GIORNO DI STRIPE ───────────────────────── */
export function adattatore(){ return PROVA; }
export default adattatore;
