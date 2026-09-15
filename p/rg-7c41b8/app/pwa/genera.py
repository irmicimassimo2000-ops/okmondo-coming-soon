# -*- coding: utf-8 -*-
"""
app/pwa/genera.py — LE ICONE E GLI SPLASH DELL'APP IN HOME (F1.4).

Il codice MISURA e IMPAGINA: qui non si disegna niente: si PRENDE il
marchio completo (`marchio.png`, l'unico marchio ammesso, mai ridotto e
mai un monogramma) e lo si posa al centro di un fondo crema.

DUE VINCOLI DI iOS, non nostri:
  · l'icona e' un PNG quadrato SENZA TRASPARENZA e senza angoli
    arrotondati — gli angoli li arrotonda il sistema; un alfa lascia il
    nero sotto (firt.dev, Apple);
  · lo splash non lo genera iOS: serve un `apple-touch-startup-image`
    per OGNI risoluzione con la sua media query, altrimenti resta
    bianco. E lo splash NON e' un logo che appare: e' la prima
    schermata senza contenuto, col marchio nello STESSO punto e alla
    STESSA misura, cosi' quando la pagina arriva non si sposta niente.
    Per questo il marchio sta a (safe-top + 64) punti, alto 64: sono le
    misure di `.f1-marchio` in app/sistema.css.

Si rilancia con:  python app/pwa/genera.py
"""
from PIL import Image
import os

QUI = os.path.dirname(os.path.abspath(__file__))
RADICE = os.path.abspath(os.path.join(QUI, "..", ".."))
MARCHIO = os.path.join(RADICE, "marchio.png")

CREMA = (250, 248, 245)          # --carta #FAF8F5, lo stesso fondo di S0

# le tre icone che servono: 180 per apple-touch-icon, 192 e 512 per il
# manifest (le due misure che ogni piattaforma cerca).
ICONE = [180, 192, 512]

# i tre iPhone piu' diffusi, con la LORO safe area in alto: e' quella
# che decide dove cade il marchio nella prima schermata, quindi e'
# quella che decide dove cade nello splash.
SPLASH = [
    # (larghezza pt, altezza pt, dpr, safe-top pt, nome)
    (390, 844, 3, 47, "iphone-390x844"),    # 12 / 13 / 14 / 15 / 16
    (393, 852, 3, 59, "iphone-393x852"),    # 14 Pro / 15 Pro / 16 Pro
    (428, 926, 3, 47, "iphone-428x926"),    # 12-14 Pro Max
]

MARCHIO_ALTO = 64          # .f1-marchio { height:64px }
MARCHIO_LARGO_MAX = 0.62   # .f1-marchio { max-width:62% }


def su_crema(larg, alt):
    """Una tela opaca: nessun canale alfa, mai, in nessun file di qui."""
    return Image.new("RGB", (larg, alt), CREMA)


def marchio_alto(px):
    """Il marchio completo, riscalato a un'altezza in pixel."""
    m = Image.open(MARCHIO).convert("RGBA")
    w = max(1, round(m.width * px / m.height))
    return m.resize((w, px), Image.LANCZOS)


def posa(tela, m, x, y):
    """Composizione con l'alfa del marchio: sotto resta il crema."""
    tela.paste(m, (int(x), int(y)), m)


def icone():
    for lato in ICONE:
        t = su_crema(lato, lato)
        # il marchio occupa il 66% del lato: e' la proporzione che
        # tiene il segno leggibile anche a 60 punti sulla Home senza
        # farlo toccare gli angoli che iOS ritaglia.
        m = Image.open(MARCHIO).convert("RGBA")
        largo = round(lato * 0.66)
        alto = max(1, round(m.height * largo / m.width))
        m = m.resize((largo, alto), Image.LANCZOS)
        posa(t, m, (lato - largo) / 2, (lato - alto) / 2)
        f = os.path.join(QUI, "icona-%d.png" % lato)
        t.save(f, "PNG", optimize=True)
        print("icona", lato, "->", os.path.basename(f), os.path.getsize(f), "byte",
              "| alfa:", t.mode)


def splash():
    for larg, alt, dpr, safe, nome in SPLASH:
        t = su_crema(larg * dpr, alt * dpr)
        m = marchio_alto(MARCHIO_ALTO * dpr)
        # e se il marchio sfonda il 62% della larghezza, si rimpicciolisce
        # come fa il CSS: `max-width:62%`.
        tetto = round(larg * dpr * MARCHIO_LARGO_MAX)
        if m.width > tetto:
            m = m.resize((tetto, max(1, round(m.height * tetto / m.width))), Image.LANCZOS)
        posa(t, m, (larg * dpr - m.width) / 2, (safe + MARCHIO_ALTO) * dpr - m.height)
        f = os.path.join(QUI, "avvio-%s.png" % nome)
        t.save(f, "PNG", optimize=True)
        print("splash", nome, "->", os.path.basename(f), os.path.getsize(f), "byte")


if __name__ == "__main__":
    icone()
    splash()
