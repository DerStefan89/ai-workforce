# Spike F45 B3b-2b — bewertet der qa-Schritt die Darstellung aus dem Render-Nachweis?

Stand 29.10.2026, F45 B3b-2b (Branch `feature/f45-b3b2b-qa-darstellung`), E-B3B2-1 = A, F-1268. Claude-Code-CLI 2.1.300
(laut Init-Zeile), Modell `claude-sonnet-5` (wie `schritt-3-qa` in `workflow-vorlagen/standard.json`).

## Aufbau

Skript `spike-qa-darstellung.mjs` (dieser Ordner), Muster `../b2b2b/spike-qa-schema.mjs`: echter Prozessstart der CLI
(`claude.exe` direkt) mit dem Argv-Muster von `baueAufruf` für einen lesenden Werkzeugsatz plus `--json-schema` (Schema
`ergebnis-qa` über `baueClaudeJsonSchema`), Prompt über stdin. Arbeitsordner ist ein Mini-Projekt außerhalb des Repos:
`index.html` mit einer Buchungstabelle (`min-width: 640px` ⇒ waagerechter Überlauf bei 390 px), `style.css` mit Tokens
und einer festen Rahmenfarbe, `CLAUDE.md` mit drei Design-Regeln. Im Ordner `.render-nachweis/` drei PNG im Namensmuster
des Skeletts (`start-desktop-hell-0ms.png`, `start-desktop-hell-400ms.png`, `start-mobil-hell.png`, Playwright) und
`protokoll.md`/`protokoll.json` über `schreibeProtokoll` des Skeletts — genau ein roter Punkt
(`/ (mobil-hell): waagerechter Überlauf`). Prompt = `baueQaAuftragstext` (`src/qa`) mit `darstellung` ROT und dem
Ausgabe-Ende, wie es das Skelett schreibt, plus die drei Eingaben des qa-Schritts als Text (Prompt:
`spike-qa-darstellung-rohstrom-prompt.txt`).

## Ergebnis

Exit 0, 91 s, 9 Turns, **0,22 USD** (`spike-qa-darstellung-ausgabe.txt`, Rohstrom `spike-qa-darstellung-rohstrom.ndjson`).

- **(a) Bilder per Read:** Werkzeugaufrufe `Read index.html`, `Read style.css`, `Read .render-nachweis/protokoll.md`,
  `Glob .render-nachweis/**/*.png`, `Read .render-nachweis/start-desktop-hell-400ms.png`,
  `Read .render-nachweis/start-mobil-hell.png`; zwei `tool_result` mit Inhaltsblock `image` im Ereignisstrom. Gelesen
  wurde je Variante genau das End-Bild — das 0-ms-Bild der Bildfolge nicht (Instruktion befolgt).
- **(b) Roter Punkt als Befund ≥ HOCH:** Q1 HOCH, `fundstelle` „Darstellung: / / mobil-hell (Ursache: style.css:7)“, Beleg
  aus Protokoll und Bild („Betrag ist gar nicht mehr sichtbar“). Dazu ein eigener Design-Befund Q2 MITTEL (feste
  Rahmenfarbe statt Token, `style.css:8`) — gegen die Regeln aus CLAUDE.md, nicht aus dem Protokoll.
- **(c) Schema:** `structured_output` schemagerecht, urteil `BLOCKIERT`, sechs Testfälle, davon drei „Darstellung: …“
  (desktop-hell bestanden, mobil-hell durchgefallen, Token-Gate durchgefallen); `validiereErgebnisQa` ohne Verstoß.

## Schluss

- Fassung: Der Spike lief mit dem Text aus Plan v1. Die Ergänzungen danach (Advisor B1 Bildpfad, B6 Projektfehler, Prüfpass: Abschlusszeilen-Regel ohne Lesen, Fehlerzeile, Hinweise kein Befund, Daten-Kennzeichnung des Ausgabe-Endes) sind nur als Text belegt (`src/qa/qa.test.ts`), nicht in einem zweiten echten Lauf.
- Der Abschnitt „Darstellung“ trägt: die CLI liest PNG per Read, das Modell bewertet das Bild (nicht nur das Protokoll)
  und bildet den roten Punkt als HOCH-Befund in qa-Form ab. Keine Schemaänderung nötig.
- Kosten gegenüber dem qa-Spike ohne Bilder (`../b2b2b/spike-qa-schema.md`, 0,14 USD, 2 Turns): +0,08 USD und +7 Turns bei
  drei Bildern und zwei Ansichten. Bei vielen Seiten wächst der qa-Kontext je Seite um fünf End-Bilder — Beobachtungspunkt
  von E-B3B2-1 („überladener qa-Kontext ⇒ eigener Schritt“).
- Nicht belegt: der Zweig ZEITGRENZE/FEHLER (kein Lesen) und die Abschlusszeilen-Regel bei ROT ohne Aufnahme — beide sind
  Textregeln ohne Werkzeugbedarf, belegt in `src/qa/qa.test.ts` als Text; ob das Modell sie befolgt, zeigt erst R2/F30.
- Schwärzung: Rohstrom mit `../b2b1b/schwaerze.mjs`, Bilddaten (base64) durch ihre Länge ersetzt; Suche nach `Users` und
  dem Benutzernamen in Rohstrom, Prompt und Ausgabe = 0 Treffer.
