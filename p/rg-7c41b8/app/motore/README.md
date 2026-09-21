# Il motore delle proposte personali

`app/motore/proposte.js` — ES module, zero dipendenze, zero DOM, zero `new Date()`.
Gira in node così com'è. Le prove stanno in
`E:\OK.AGENZIA\regina-jewels\studio\prova3d\_MP_motore.mjs` (122 prove, `node _MP_motore.mjs`).

Metodo: `~/.claude/skills/interfacce/reference/11-proposte-personali-senza-ml.md`
(che a sua volta poggia su `grafica/reference/48` §0, §5.1, §5.2, §5.4 e sulla
carta psicologica di Regina, righe 16-17 e «Da NON fare»).

Con trentaquattro articoli e un negozio solo non c'è niente da addestrare:
una regola di associazione ha bisogno di diverse centinaia di transazioni
prima di essere statisticamente qualcosa. Quello che c'è sono i dati che il
gestionale ha già, più un punteggio trasparente che il negozio può correggere
a mano — che è poi quello che fanno a monte del ML anche Amazon («Customers
who bought X also bought Y» nomina il pezzo che possiedi), Stitch Fix
(l'algoritmo ordina, la stilista decide) e Shopify (pin manuale con
precedenza dichiarata e vincolo di stock).

---

## La catena, in ordine

```
catalogo (34)
  → FILTRI DURI            posseduto · in attesa · bloccato · rifiutato < 90 gg
                           · esaurito · misura diversa
  → PUNTEGGIO 0-100        Σ w_k · s_k, dieci componenti a pesi dichiarati
  → UNA REGOLA PER PROPOSTA  vince il componente col contributo maggiore
                           FRA QUELLI CHE SANNO SCRIVERE UNA FRASE
  → DIVERSITÀ E FRESCHEZZA MMR λ 0,7 · tetto 2 per famiglia · 7 giorni
  → SPIEGAZIONE            una riga, ≤ 60 caratteri, un dato vero dentro
  → SCHERMO                1 blocco grande + ≤ 3 rail (≥ 3 pezzi l'uno)
```

Il punteggio **non decide da solo**: decide quale regola ha vinto, e la regola
è ciò che si scrive nel titolo del blocco. Fra le regole comanda l'ordine
fisso; dentro una regola comanda il punteggio.

---

## L'API

```js
import { proposte, spiega, applicaVerdetto, pin, blocca, PESI }
  from "app/motore/proposte.js";

const esito = proposte(
  { s, catalogo, collezioni, oggi },      // il fascio — oppure `s` da solo
  { oggi, pesi, sessione, esauriti, co_acquisti, rail_massimo, card_per_rail }
);
// → { grande, rail, registro, … }
```

| Uscita | Cos'è |
|---|---|
| `grande` | una proposta, o `null`. Mai un ripiego: se nessuna regola grande scatta, non c'è blocco grande |
| `rail` | `[{regola, gruppo, titolo, pezzi:[proposta], tetto_sospeso, altri}]`, al massimo 3, ≥ 3 pezzi l'uno |
| `registro` | il registro NUOVO (mostrate per regola + freschezza + sessione). Il motore non scrive: torna, e chi chiama persiste |
| `date` | le ricorrenze in finestra da mostrare **senza pezzi** (persona senza dati) |
| `stati` | i pezzi esauriti che chiuderebbero una collezione: uno stato, non una proposta |
| `scarti` | `{articolo: motivo}` — perché ogni escluso è stato escluso |
| `pin_non_attivi` | i pin che un filtro duro ha spento, col motivo, per il backoffice |
| `fine` | `FINE` · `FINE_TUTTO` (ha tutto) · `FINE_SESSIONE` (secondo «Non fa per me») |

Una **proposta** è sempre:

```js
{ articolo, id, punteggio, componenti: {…}, regola, frase, dati: […],
  chiave, gruppo }
```

Altre funzioni:

- `spiega(proposta)` → la riga «Perché:», o `null` se la frase non regge le regole.
- `applicaVerdetto(stato, {articolo, esito, regola, oggi, sessione, frase})`
- `pin(stato, {articolo, motivo, chi, quando, abbina_a, in_cima, fino, cliente})`
- `blocca(stato, {articolo, motivo, chi, quando, cliente, attivo})`
- `taleRate(stato)` → la tabella per regola, con take-rate, accettazione, rifiuto.

`oggi` è **obbligatorio** e in ISO. Senza, il motore solleva un errore invece
di leggere l'orologio: una bozza guardata fra due mesi direbbe
«l'anniversario era sessanta giorni fa», e una funzione che legge l'ora non è
collaudabile.

---

## Segnale → componente → peso → frase

| # | Componente (regola) | Peso | Segnale · `s` vale 1 quando | Frase (esempio vero) |
|---|---|---|---|---|
| 1 | `chiude_collezione` / `collezione` | **40** (+10 se è l'ultimo che manca) | è in una collezione dove ha ≥ 1 pezzo **comprato** e che non è chiusa | «Ti chiude la collezione Filo di Luce — 4 su 5» · «Della collezione del tuo Anello Uno» |
| 2 | `data_vicina` | **35** (+10 se la persona è nota) | c'è una ricorrenza entro 14 giorni | «Per il tuo compleanno, il 24 settembre» · «Per Marta, il 3 ottobre — della sua misura» |
| 3 | `da_prendere` | **30** | è nella lista «Da prendere» | «Lo hai messo da parte il 30 agosto» |
| 4 | `pin` | **25** | il negozio l'ha messo, con mittente e data | «Regina lo abbina al tuo Anello Uno» |
| 5 | `co_acquisto` | **20** | `n ≥ 5` **e** `lift ≥ 1,5` con un pezzo che possiede; `s = min(1, (lift−1)/2)` | «7 clienti con l'Anello Uno l'hanno preso» |
| 6 | `arrivo_in_collezione` | **12** | arrivo di ≤ 30 giorni, nella sua collezione o nella sua materia | «In vetrina da giovedì, in argento come i tuoi» |
| 7 | `materia` | **10** | stessa materia di ≥ 2 pezzi che possiede | «Nella tua materia (acciaio dorato)» |
| 8 | `famiglia_mancante` | **8** | ha ≥ 3 pezzi e zero in questa famiglia | «Non hai ancora una collana» |
| 9 | `prezzo` | **8** / **−10** | dentro `[0,6× ; 1,6×]` della mediana di ciò che ha **pagato lei** / oltre `2,5×` del suo massimo | **nessuna, mai** |
| 10 | `misura` | **6** | misura uguale alla sua | «Della tua misura (14)» |

> **21/09/2026 — decisione di Massimo: la data viene prima.** Fino al 21
> settembre `da_prendere` valeva 35 e `data_vicina` 30. Sono invertiti, e non
> per simmetria: **la data scade, il pezzo da parte resta.** Un compleanno
> mancato non torna per un anno; un pezzo messo da parte è ancora lì domani.
> Fra due cose vere si mette avanti quella che ha una scadenza. Invertito
> anche in `ORDINE_REGOLE`, che è ciò che decide a parità di punteggio.
> `chiude_collezione` resta in testa (40, +10 se è l'ultimo).

`S = min(100, Σ w_k · s_k)`. Tie-break dichiarato: prezzo più vicino alla
mediana → arrivo più recente → id (nessuna casualità: una proposta che cambia
a ogni apertura non si può verificare e non si può difendere al banco).

**Il prezzo non scrive frasi e quindi non può vincere da solo**: se il
contributo più alto è la fascia di prezzo, la proposta non esce. Il prezzo non
è un perché.

### Chi può prendersi il blocco grande

`chiude_collezione` › `data_vicina` › `da_prendere` › `pin` › `co_acquisto` ›
`arrivo_in_collezione`.

`collezione` (quando i mancanti sono più di uno), `materia`,
`famiglia_mancante`, `misura` e `misura_ignota` restano **solo rail**: un rail
promosso a blocco è una promessa più grande del suo fondamento.

### Precedenza (dichiarata, in quest'ordine)

```
blocco  >  filtro duro  >  pin «in cima»  >  ordine fisso delle regole  >  punteggio
```

---

## Le regole della frase

Tutte e quattro insieme, o la frase non esce (e allora quel componente non
può vincere):

1. nomina un dato **del cliente** (il suo pezzo, la sua misura, la sua data,
   la sua persona) o un fatto contabile del negozio (un numero vero, una data
   vera, il nome di chi ha scelto);
2. **≤ 60 caratteri**;
3. verificabile aprendo il cofanetto o il profilo;
4. mai «per te», «consigliato», «potrebbe piacerti», «ti piacerà».

`scegliFrase(...varianti)` prende le varianti dalla più ricca alla più povera
e consegna la prima che sta nei sessanta. **Non si taglia mai una frase a metà
parola**: una frase troncata è una frase che il cliente non può verificare.
Gli accenti si scrivono con l'accento (`è`, non `e'`) — la sonda lo controlla.

Vietati anche fuori dalle frasi: countdown, «ultimi pezzi», riprova sociale
senza numero, barre a zero. Non è gusto: CMA/Emma Sleep (28/05/2026), DMCC Act
(06/04/2025), carta psicologica «Da NON fare».

---

## Diversità e freschezza

- **MMR semplificato** (Carbonell & Goldstein 1998), λ = 0,7: dopo ogni pezzo
  scelto, `−15` ai candidati con stessa famiglia **e** stessa materia, `−8` con
  la sola famiglia uguale.
- **Tetto di famiglia: 2 per rail.** È la garanzia dura sotto la penalità
  morbida. Non vale per i rail che sono di una famiglia sola per costruzione
  (`misura`, `misura_ignota`, `famiglia_mancante`). E si **sospende**, con
  `tetto_sospeso: true`, quando togliere il terzo pezzo porterebbe il rail
  sotto il minimo: il tetto è una preferenza, l'esistenza del rail è un fatto.
- **Freschezza: 7 giorni.** Lo stesso pezzo non torna nello **stesso posto**
  prima di una settimana; può cambiare posto se cambia la regola che lo
  motiva. Il timbro lo mette `registro.mostrate`, che il motore restituisce e
  lo store persiste.
- **Un rail esiste solo con ≥ 3 pezzi veri.** Meno di tre: il rail non compare,
  e non si allunga con pezzi a punteggio basso.

---

## Il registro, e la valutazione senza tracking

Non si traccia la navigazione. Si contano le azioni che esistono già.

```
registro.regole   {<regola>: {mostrate, aperte, daparte, comprate, rifiuti, frasi}}
registro.mostrate {<articolo>: {posto, regola, quando}}     ← la freschezza
registro.sessione {id, rifiuti}                             ← le rigenerazioni
```

Esiti, dal più forte: `comprato` › `da_parte` › `aperto` › `nessuno` ›
`rifiuto`. Uno per proposta: si tiene il più forte ricevuto — chi apre e poi
compra ha comprato. **`nessuno` non è un no** (Hu, Koren, Volinsky 2008) e pesa
zero.

Metriche (`taleRate`): take-rate `comprate/mostrate` (Netflix), accettazione
`(comprate+daparte)/mostrate`, rifiuto `rifiuti/mostrate`. Con zero mostrate
il take-rate è `null`, non `0`: non si divide per un fatto che non c'è.

**I pesi si correggono a mano, mai da soli.** Dopo ≥ 30 proposte mostrate: se
una regola ha take-rate sotto metà della media, si dimezza il peso (o si
spegne); se ha rifiuto sopra il 20 %, si rilegge **la frase** prima di toccare
il peso — quasi sempre è la frase a essere sbagliata, non la regola. Niente
A/B: un negozio e poche decine di clienti al mese non reggono due varianti.

---

## Il «Non fa per me»

Un rifiuto fa tre cose insieme:

1. conta nel registro della sua regola;
2. **esclude l'articolo per 90 giorni** (`proposte.rifiuti[id] = oggi`);
3. spende **una** delle rigenerazioni della sessione.

La prima rigenerazione porta il secondo candidato della **stessa regola**. Al
secondo no la sessione si chiude e la card diventa `FINE_SESSIONE` — «Va bene,
ci risentiamo lunedì». Se il no rigenerasse all'infinito il pulsante sarebbe
una slot machine (ricompensa variabile sul SE, vietata dalla carta
psicologica).

**«Lunedì» è una data vera, non una frase (critic 20/09).** Fino al 20/09 la
chiusura era `sessione.rifiuti >= 2`: un fatto della SESSIONE, e una sessione
nuova (un ricarico) la smentiva nell'istante in cui la si rileggeva — «ci
risentiamo lunedì» seguito da un F5 e la proposta tornava. Al secondo rifiuto
`applicaVerdetto` scrive `proposte.chiusa_fino` — il **lunedì vero**,
`prossimoLunedi(oggi)` — e `proposte()` confronta `sessione_chiusa` con quella
data, **in qualunque sessione**: la promessa resta vera finché `oggi` non la
supera, e riapre da sola esattamente quel lunedì (se `oggi` è già lunedì, il
prossimo è a **+7**, mai 0 — un lunedì che torna sé stesso non è un lunedì
futuro). I due pezzi rifiutati restano comunque fuori i loro novanta giorni,
chiusura o non chiusura.

---

## Il ramo nello store

`app/stato.js`, schema **V5** (passo 4 → 5; `chiusa_fino` è un campo in più
con default `null` dentro lo stesso ramo — non un cambio di forma, non serve
una V6):

```js
proposte: {
  verdetti: [],   // [{articolo, regola, esito, quando, frase}]
  rifiuti:  {},   // {<articolo>: "aaaa-mm-gg"}
  pin:      [],   // [{articolo, motivo, chi, quando, abbina_a, in_cima, fino, cliente}]
  blocchi:  [],   // [{articolo, motivo, chi, quando, cliente}]
  registro: {regole:{}, mostrate:{}, sessione:{id, rifiuti}},
  chiusa_fino: null   // ISO o null — il lunedì vero, scritto al secondo rifiuto
}
```

Eventi: `proposta/verdetto` · `proposta/pin` · `proposta/blocca`.

I tre riduttori dello store sono **copiati alla riga** da `applicaVerdetto`,
`pin` e `blocca`. Lo store non importa il motore e il motore non importa lo
store: il motore deve poter girare in node senza store, e lo store non deve
dipendere da un modulo che un giorno potrebbe stare sul server. Le prove
(§ 7 della sonda) confrontano le due copie sullo stesso ingresso; se un giorno
divergono, **quella sbagliata è quella dello store**.

Il passo 4 → 5 apre il ramo vuoto e non inventa niente: verdetti, rifiuti e
registro sono fatti che non si ricostruiscono a posteriori — chi non ha mai
detto «non fa per me» non ha detto di sì, e un registro inventato falserebbe
il primo take-rate che il negozio legge.

---

## I casi limite (§8 del metodo) — tutti provati

| Caso | Cosa fa il motore |
|---|---|
| **Cliente con 1 pezzo** | nessuna collezione «si chiude» (1 su 5 non è «ti chiude»: la frase sarebbe falsa). Niente blocco grande, a meno di una ricorrenza in finestra, un pin del negozio o un co-acquisto sopra soglia. Restano i rail veri: «Della collezione del tuo Anello Uno», e «Della tua misura (14)» se ci sono ≥ 3 anelli della sua misura |
| **Cliente che ha tutto** | `grande: null`, `rail: []`, `fine: FINE_TUTTO` — «Hai tutto quello che c'è, per ora.» Nessun ripiego: un «Per te» riempito con pezzi a punteggio otto è peggio di un «Per te» che finisce |
| **Pezzo esaurito che chiude una collezione** | non è una proposta, è uno **stato** in `stati`: «Torna in vetrina — avvisami». Mai «ultimi pezzi» |
| **Pezzo ricevuto in regalo** | escluso (lo possiede) ma **non rende sua** la collezione: «ti chiude» si dice a chi ne ha scelto almeno uno. Conta per materia e misura, che sono fatti del polso |
| **Misura ignota** | nessun anello nel blocco grande; escono nel rail «Anelli — misura da prendere in negozio», che dichiara il buco invece di nasconderlo |
| **Persona della ricorrenza senza dati** | il componente non scatta: la data si mostra **da sola**, in `date` («Il compleanno di Marta è il 24 settembre»). Con la sua misura in archivio, il regalo si può proporre |
| **Due misure in archivio** | vale **l'acquisto più recente**; `misura_fonte` dice da dove viene, così il profilo la può mostrare e lei la può smentire |
| **Pin su un pezzo esaurito** | il filtro duro vince sul pin; il pezzo non esce e il backoffice lo legge in `pin_non_attivi` con il motivo |

Più uno che il metodo non elenca ma che i dati veri impongono: **un pezzo
`venduto` e non ancora scartato** (il Pendente Filo di Lucia, pagato da
Antonio). Non è posseduto — la fila della collezione dice che manca — quindi
resta candidato **per la sola regola che lo nomina come mancante** e non entra
in nessun rail. Se la stessa schermata dicesse «ti manca un pezzo solo» e poi
lo nascondesse, direbbe due verità diverse nello stesso posto.

---

## Quando questo motore non basta più

- Catalogo oltre qualche centinaio di pezzi, più negozi, o un e-commerce con
  dati di navigazione: le regole a mano non bastano più a ordinare e serve un
  ranking appreso.
- Quando del cliente non si sa **nulla** (nessun pezzo, nessuna data, nessuna
  lista): non si fa «Per te», si fa vetrina. Un «Per te» vuoto è peggio di
  nessun «Per te».
- Dove l'obiettivo è la conversione a ogni costo: questo motore rinuncia per
  scelta alla pressione.
