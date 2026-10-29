# Plan F45 B3b-2a-2 „Karte Darstellung (Render-Nachweis) in der Abnahme“ (v1)

Stand 29.10.2026, Branch `feature/f45-b3b2a2-karte`, Basis main `ae2d89b` (#397). Challenger GO_FAST_PROTOTYPE, ≈ 0,15 AT.
Zeile B3b-2a-2 in `docs/projekt/fixpaket-f45.md`; Advisor-Punkte K3, K4, H9 aus `features/F45/advisor-b3b2a.md`.
Abhängigkeit (CONTEXT): B3b-2a-1 liefert in GET …/abnahme `renderNachweis` = `{status:'fehlt'}` |
`{status:'ok', ergebnis, dauer_ms, ausgabe_ende (≤ 40 Zeilen), gestartet_am}` (`scripts/leitstand/abnahme-pruefung.mjs`).

## Ziel

Die Abnahme zeigt den Render-Nachweis des letzten Ausführungslaufs als eigene Karte unter dem Prüfergebnis — sichtbar,
aber nie entscheidend (kein Halt, Abnahme bleibt möglich).

## Bau

1. **Neu `public/leitstand/views/abnahme-render.js`** (rein, ohne DOM, formatiert, ohne Biome-Befund):
   - `renderRenderNachweis(projektion, { ebene = 2 } = {})` ⇒ `''` bei fehlender Projektion oder `status !== 'ok'`.
     Sonst `<section class="entscheiden-karte abnahme-render-karte" aria-labelledby="abnahme-render-titel">`:
     Überschrift „Darstellung (Render-Nachweis)“ (`h${ebene}`), Zeile Badge (`ablauf-status ok` bei GRUEN, sonst
     `fehler` — wie Kachel/Zeile „Prüfung“) · „Dauer 12,3 s“ (`formatiereZahl`), bei ROT/ZEITGRENZE/FEHLER/unbekannt
     `<div class="note amber abnahme-render-hinweis" role="note">` „Darstellung mit Befunden — Abnahme trotzdem
     möglich. …“ (K3), `<details class="abnahme-details">` „Ausgabe-Ende“ mit `<pre class="abnahme-render-ausgabe">`
     (escaped; bei leerem Text der Satz „keine Ausgabe“), Ortssatz (H9) „Bilder und Protokoll liegen im Arbeitsordner
     unter `.render-nachweis/` — solange der Arbeitsordner besteht.“ Keine Lauf-ID, kein Pfad außer dem festen
     Ordnernamen, keine Bild-Route.
   - `renderNachweisKennung(projektion)` für das Poll-Kennzeichen: `status:ergebnis:gestartet_am:dauer_ms`.
   - **Ausgelagert aus `workflow-abnahme.js`** (Ausgleich, kein Importzyklus): `PRUEF_WERTE` + `pruefWertText`
     (die Karte braucht den Wertetext `abnahme.pruefung.wert.*`, H12). `workflow-abnahme.js` importiert und
     re-exportiert `pruefWertText` (Aufrufer `views/workflows.js` unverändert) und nutzt es in `renderPruefergebnis`.
2. **Einbindung in `workflow-abnahme.js`** (Ratsche 977, Ziel ≤ 977): Lage „entscheidbar“ direkt nach der Kachelreihe
   (Prüfung steht dort als Kachel) auf derselben Zeile wie `</section>`; Lage „vorab“ (nach dem Bau, z. B. Review
   BLOCKIERT) im Block nach `renderErgebnisDetails` mit `ebene: 4`. „Entschieden“/„offen“: keine Karte (Entscheidung
   gefallen bzw. kein Ergebnis). Bilanz: −1 (`PRUEF_WERTE`) −4 (`pruefWertText` samt Doku/Leerzeile) +1 (Import) ⇒ ≈ −4.
3. **`views/workflows.js`** (Ratsche 1735, ±0): `renderNachweisKennung(abnahme.renderNachweis)` ans Abnahme-Kennzeichen
   (bestehende Zeile 256; Import über die bestehende Importzeile aus `./workflow-abnahme.js`, Re-Export dort). Ohne das
   käme die Karte erst bei der nächsten anderen Änderung, weil der Render nach dem Prüfergebnis fertig wird.
4. **CSS** `style.css`: `.abnahme-render-ausgabe` an die bestehende Regel `.workflow-seite .entscheiden-auftrag-text`
   anhängen (Selektorliste, keine neuen Farben/Schatten).
5. **i18n** de/en/ru/tr: `abnahme.render.titel`, `.dauer`, `.hinweis`, `.ausgabe`, `.ausgabeLeer`, `.ort` (`{ordner}` als
   `<code>`).
6. **Test `public/leitstand/views/abnahme-render.test.mjs`**: ok GRÜN ohne Hinweis; ROT mit `note amber`; ZEITGRENZE
   mit Hinweis; FEHLER mit Grund im Ausgabe-Ende; 'fehlt'/undefined ⇒ ''; Escaping von `ausgabe_ende`; keine Lauf-ID im
   Text; Kennung ändert sich mit status/ergebnis/gestartet_am. Dazu in `workflow-abnahme.test.mjs` zwei Asserts:
   Karte in „entscheidbar“ nach den Kacheln, in „vorab“ mit h4; ohne `renderNachweis` keine Karte.
7. **Render-Nachweis (K4)** `features/F45/nachweise/b3b2a2/`: Testinstanz nach Muster
   `features/F45/nachweise/b2b2b2/instanz.mjs` (Wegwerf-Ablage, Attrappen, echter HTTP-Pfad) plus
   `registriereKernArtefakt('render-nachweis-<laufId>', …)` für GRÜN bzw. ROT; Klickfolgen über `npm run
   render-nachweis` — GRÜN/ROT × hell/dunkel × 1440 px, dazu ROT 390 px hell/dunkel; Bilder als WebP, Wegwerfpfade
   nicht im Bild (Ausgabe-Ende der Attrappe ohne Pfade). `nachweis.md` mit Klicktabelle und Überlaufmessung.
8. **Register**: F-1273, F-1274 neu (Texte laut Auftrag); F-1256 Nachtrag „Anzeige mit B3b-2a-2“; F-1272 unverändert
   offen (keiner der Punkte passt ohne Zusatzaufwand in die Karte — 'fehlt' bleibt laut Auftrag ohne Karte); Zeile
   B3b-2a-2 im Fixpaket als gebaut; `docs/STATUS.md` knapp; Lagebild neu erzeugen, falls `check-f40-lagebild` es
   verlangt (F-1274).

## Zustände

Default ok/GRÜN · Befund ROT/ZEITGRENZE/FEHLER (amber Hinweis) · Leer 'fehlt' ⇒ keine Karte · Ladend: wie bisher (Abnahme
lädt als Ganzes) · Fehler: unbekannter `ergebnis` ⇒ roher Wert, rotes Badge, Hinweis.

## Akzeptanz

View-Test grün; Ratschen `workflow-abnahme.js` ≤ 977, `workflows.js` ≤ 1735; Gates ratsche, wachstumsbremse-server,
f44-i18n, f40-lagebild, docs, rules grün; Render-Nachweis ohne waagerechten Überlauf bei 390 px; design-guardian ohne
offenen Pflichtpunkt.

## Risiken

- Karte erscheint im Poll nicht ⇒ Kennzeichen (Punkt 3), im Render-Nachweis belegt.
- Testinstanz zu aufwendig ⇒ Rückfall: dieselbe Instanz mit nur einem Ablauf und zwei Artefakt-Versionen (GRÜN, dann
  ROT als neue Version derselben Kennung — die Projektion liest die neueste).

## v1.1 nach dem Advisor-Pass (`features/F45/advisor-b3b2a2.md`, „Freigegeben mit Hinweisen“)

- **P1** Ratsche verlangt Gleichheit: nach dem Bau `node scripts/check-ratsche.mjs --aktualisiere` (gesunkener Wert für
  `workflow-abnahme.js`); `abnahme-render.js` und `abnahme-render.test.mjs` formatiert in `formatiert`. Akzeptanz:
  Ratsche = neuer Ist-Wert, eingetragen; `workflows.js` bleibt 1735.
- **P2** Vorab-Fall in den Render-Nachweis: Review BLOCKIERT bei `max_replans 0` (Muster (d) b2b2b2), 1440 hell und 390.
- **P3** F-1272: Maßnahme umstellen — M3, N1, N8 nicht mit B3b-2a-2 (Auftrag: 'fehlt' ohne Karte), sondern „bei Bedarf“
  bzw. mit B3b-2b.
- **H1** Badge `warten` bei Nicht-GRÜN (Farbe der amber Notiz), `ok` bei GRÜN.
- **H2** Platz in „entscheidbar“: hinter der qa-Karte (gleiche Zeile, ±0) statt direkt nach den Kacheln.
- **H3** Kennzeichen bleibt; Grund: vorübergehender Ladefehler ('fehlt' ⇒ 'ok') und nachträgliche Registrierung. Beleg
  Unit-Test der Kennung (auch `undefined`).
- **H4** Testinstanz registriert zusätzlich `pruefergebnis-<laufId>` GRÜN.
- **H5** Ausgabe-Ende roh und escaped (kann Serverpfade tragen); Test unbekanntes `ergebnis` mit `<`/`&`.
- **H6** FEHLER ⇒ `<details open>`.
- **H7** `.workflow-seite .abnahme-render-karte > .note { margin: 0 }` an die Regel `.abnahme-faehigkeiten > .note`.
- H9/H10 nicht übernommen (Modulname laut Auftrag).
- `docs/STATUS.md` bleibt unverändert (Muster B3b-1/B3b-2a-1: der Stand des Fixpakets steht in `docs/projekt/fixpaket-f45.md`).

## Korrekturrunde nach dem Prüfpass (29.10.2026)

code-reviewer, qa, design-guardian je „Freigegeben mit Hinweisen“. Übernommen: literale i18n-Schlüssel (cr 1); Hinweis ohne
„Bilder“, bei FEHLER kein Ortssatz (qa N1, cr 2 — der erste Satz bleibt laut Auftrag); „vorab“ „… nicht der Grund für den
Halt“ (qa N2) und flach ohne Kartenrahmen (design-guardian 1); Tests „offen“, „vorab“ vor dem Bau, Dauer 0/groß,
Kennzeichen-Einbau, qa-Karte vorhanden (qa N3), doppelter h4-Test entfernt (cr); Kommentare (cr 5); Folge ru-390 und
Folgenzahl (qa M1, N4, cr 3, design-guardian 2). Nicht übernommen: Blattmodul für `pruefWertText` (cr 6, Wartbarkeitshinweis),
Robustheit der Hand-Instanz (cr 7), reduzierte Bewegung/200 % (design-guardian 3, keine Animation), lange Einzelzeile
gemessen (qa N5, `overflow-wrap: anywhere`), Render nach grüner Wiederholung (qa N6 = F-1271).

## Nicht-Ziele

Kein Bild-Endpunkt, keine Änderung an `src/pruefschritt/render.ts` oder am Kern, keine qa-Änderung (B3b-2b), keine
Karte bei 'fehlt' (F-1272 bleibt offen).
