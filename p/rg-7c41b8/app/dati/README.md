# I dati della bozza — Regina Jewels

Quattro moduli ES nativi, nessuna dipendenza. `import` diretto dal browser.

- **`catalogo.js`** — 34 ARTICOLI (il modello). I primi 22 sono la verità della scena 3D:
  nome, materia e prezzo copiati alla lettera da `const RIPIANI` in `spazio.html`, con `k`
  = posizione nel ripiano. Gli altri 12 hanno `in_3d: false`: esistono in vetrina, non
  hanno un alloggio nel cofanetto. Nomi di campo presi da `regina_articoli`.
- **`collezioni.js`** — 4 collezioni. `filo` e `turchese` verbatim dal 3D (nomi, pezzi,
  chi chiude, testi promo). `perla` e `onda` sono dichiarate da noi. `statoCollezione()`
  calcola quanti ne mancano e quale frase di promo vale adesso.
- **`seme.js`** — lo stato di UNA persona: Lucia Sabatini, tessera RJ 00042. 10 ESEMPLARI
  (il pezzo singolo, con la sua carta e il suo codice), credito, livelli, date, lista,
  notifiche, arrivi, preferenze. È il file che si butta il giorno che si attacca Supabase.
- **`ponte.js`** — l'unico punto in cui i due codici si toccano: `RJ-ANE-001` è una
  POSIZIONE nel modello 3D, `RJ-CM4-PR7-G9D` è UN esemplare venduto a una persona.
  Restano due apposta — il perché è scritto in testa al file.

**Verifica:** `node _D_verifica.mjs` (esce 1 se qualcosa non torna). Controlla i 22 pezzi
contro il 3D, i codici esemplare (formato e unicità), i riferimenti incrociati, il credito
come somma dei movimenti, il livello come conseguenza dello speso.

**Cosa è vero** — i 22 pezzi, le 2 collezioni, le 8 date/dediche di possesso (tutto dal
3D); le 5 fotografie in `pezzi/`; i nomi di tabella, l'alfabeto del codice e il formato
`RJ-XXX-XXX-XXX` (dal gestionale); i dati di Lucia delle pagine leggere (tessera, credito
25,00 €, «Secondo», mancano 260,00 €, fodera turchese, le 2 ricorrenze, la promo del 24).

**Cosa è inventato e dichiarato** — i 12 articoli fuori scena; le collezioni `perla` e
`onda`; i `codice_fornitore` (stessa forma dei due già presenti nella bozza, non sono EAN
validi); telefono, email, misure e `cliente_dal` di Lucia; le 4 soglie dei livelli (nel
gestionale la tabella nasce vuota apposta); i 10 movimenti di credito; i 10 codici
esemplare; le note di cura e consegna. **Divergenza voluta:** `vetrina.html` metteva in
lista Creola Media e Pendente Turchese — secondo il 3D Lucia li possiede già, quindi la
lista punta ai due pezzi che le mancano davvero (Girocollo Turchese, Collana Onda).

**Aggiungere un pezzo:** una riga `P({...})` in `ARTICOLI`. Con `k` se sta nel modello 3D
(e allora nome/materia/prezzo devono combaciare con `RIPIANI`), senza `k` se sta solo in
vetrina. `id` e `codice_scena` si derivano da soli. Se gli dai una `coll`, aggiungi il suo
`id` anche ai `pezzi` di quella collezione: la verifica controlla i due versi. Poi
`node _D_verifica.mjs`.
