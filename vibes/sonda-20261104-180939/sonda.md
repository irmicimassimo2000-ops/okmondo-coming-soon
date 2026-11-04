# Sonda — http://localhost:8947/

Eseguita il 20261104-180939. Viewport: 375x812, 768x1024, 1440x900.

## Checklist

| Check | Valore | Soglia | Esito |
|---|---|---|---|
| Font primario generico | geist | non in lista black-list | PASS |
| Numero font-size distinte | 5 | <=7 | PASS |
| Spaziature non multiple di 4px | 12.6% (23/183) | <=15% | PASS |
| Border-radius distinti | 2 | <=4 | PASS |
| Elementi con box-shadow | 0% | <=20% | PASS |
| Gradienti viola-blu (tell AI) | 0 | 0 | PASS |
| Emoji nei nodi di testo | 0 | 0 | PASS |
| Contrasto WCAG sotto soglia | 0/63 (0%) | 4.5:1 (3:1 se >=24px o >=18.66px bold) | PASS |
| Bersagli di tocco < 24x24 | 0 | 0 | PASS |
| html[lang] presente | si | presente | PASS |
| Numero h1 | 1 | ==1 | PASS |
| Salti nei livelli dei titoli | 0 | 0 | PASS |
| Landmark main/nav/header/footer | main=True nav=False header=True footer=True | main presente | PASS |
| img senza alt | 0/3 | 0 | PASS |
| Bottoni/link senza nome accessibile | 0 | 0 | PASS |
| Input senza label associata | 0 | 0 | PASS |
| Lorem ipsum nel contenuto | no | assente | PASS |
| CTA generiche (Submit/Click here/...) | 0 | 0 | PASS |
| Testo centrato | 9.1% (6/66) | <=40% | PASS |
| Media query prefers-reduced-motion | si | presente | PASS |
| Transizioni su proprieta' di layout | 0 | 0 | PASS |
| Durate animazione >500ms | 0 | 0 | PASS |
| outline:none senza :focus-visible | no | assente | PASS |
| Overflow orizzontale @ 375x812 | scrollWidth=375 innerWidth=375 | scrollWidth <= innerWidth | PASS |
| Overflow orizzontale @ 768x1024 | scrollWidth=768 innerWidth=768 | scrollWidth <= innerWidth | PASS |
| Overflow orizzontale @ 1440x900 | scrollWidth=1440 innerWidth=1440 | scrollWidth <= innerWidth | PASS |
| Errori console | 0 | 0 | PASS |
| Eccezioni JS non gestite | 0 | 0 | PASS |
| Richieste di rete fallite | 0 | 0 | PASS |
| axe: violazioni critical+serious | 0 (critical=0 serious=0 moderate=0 minor=0, tot=0) | 0 (WARN se solo moderate) | PASS |

**Riepilogo:** 30 PASS, 0 WARN, 0 FAIL (su 30 check).

## Tell AI

- Font generico da template: **no**
- Gradiente viola-blu: **0** occorrenze
- Emoji come icone: **0** occorrenze
- Card/blocchi identici a gruppi di 3+: **3** gruppi
- Testo centrato: **9.1%** dei blocchi
- Glassmorphism (backdrop-filter blur): **0** elementi
- Lorem ipsum: **no**
- CTA generiche: **0**

## Accessibilità (axe-core 4.13.0)

**Violazioni:** 0 totali — critical=0 serious=0 moderate=0 minor=0.

Nessuna violazione rilevata.

## Screenshot

- `375x812_light.png`
- `375x812_dark.png`
- `768x1024_light.png`
- `768x1024_dark.png`
- `1440x900_light.png`
- `1440x900_dark.png`
