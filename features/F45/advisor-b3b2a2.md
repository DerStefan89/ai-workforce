# Advisor-Pass F45 B3b-2a-2 „Karte Darstellung (Render-Nachweis) in der Abnahme“ zu Plan v1

Geprüft: `features/F45/plan-b3b2a2.md` gegen main `ae2d89b` (architecture-advisor, frischer Kontext, 29.10.2026).
Marker: [BELEGT] Fakt mit Datei:Zeile, [SCHLUSS] Schlussfolgerung, [ANNAHME] nicht selbst nachgeprüft, [OFFEN] offene Unsicherheit.

## Urteil

**Freigegeben mit Hinweisen.** Nicht zu groß. P1–P3 sind Ergänzungen am Plantext (v1.1), keine Neukonzeption; kein Delta-Pass.

## Pflichtkorrekturen

- **P1 Ratsche verlangt Gleichheit, nicht „≤ 977“.** [BELEGT] `scripts/check-ratsche.mjs:10` „(b) Ist < Bestand ⇒ rot
  (Bestand senken: --aktualisiere)“; `:16` (g3) neue Code-Dateien in `formatiert`. Bilanz neu: `:155-159` sind 5 Zeilen,
  −1 (`:83`), +1 (Import), Kopfkommentar-Nachtrag mitzählen; Re-Export über `:121` kostet 0. `--aktualisiere` in den
  Plan, neue Dateien formatiert in die Liste; Akzeptanz „Ratsche = neuer Ist-Wert, eingetragen“.
- **P2 Lage „vorab“ fehlt im Render-Nachweis.** [BELEGT] Eigener CSS-Kontext: Karte mit Rahmen im kompakten Block
  (`.abnahme-vorab`, `style.css:8870`), h4 ohne Regel (nur `h2` der Karte gestaltet, `style.css:10982`), Nachbarn ohne
  Kartenrahmen (`harness-abgleich-anzeige.js:251`). [SCHLUSS] Genau diese Fehlerklasse findet nur der Render-Nachweis
  (F-622). Vorab-Fall aufnehmen (Review BLOCKIERT bei `max_replans 0`, Muster (d) in `b2b2b2/instanz.mjs:16`, 1440 hell
  plus 390) oder Vorab-Einbindung streichen und als Finding führen. Empfehlung: aufnehmen.
- **P3 F-1272 darf nicht „unverändert“ bleiben.** [BELEGT] Maßnahme `state/findings.md:9316` nennt „M3, N1, N8 mit
  B3b-2a-2“; der Plan liefert keinen davon (laut Auftrag gewollt) ⇒ Maßnahme auf neues Ziel umstellen.

## Hinweise

- H1 Badge-Farbe: Präzedenz design-guardian 1 (Badge in der Farbe seiner Notiz, `workflow-abnahme.js:249-259`, `:377-381`).
  Rotes Badge neben amber Notiz ⇒ wahrscheinlicher Befund. Empfehlung `warten` bei Nicht-GRÜN.
- H2 Platz in „entscheidbar“: direkt nach den Kacheln (`:816-818`) schöbe eine meist grüne Karte Kanal, Umfangs-Hinweis,
  Fähigkeiten und qa-Karte nach unten; hinter `renderQaKarte` (`:822`, ±0) stünde sie neben der Prüfung aus Nutzersicht
  (ab B3b-2b Bewertung der Darstellung). Vorab-Einbindung im `ergebnis`-Ausdruck (`:886`) korrekt; „entschieden“/„offen“
  ohne Karte schlüssig.
- H3 Kennzeichen-Begründung falsch, Kennzeichen sinnvoll: Render läuft vor `meldeLaufende`
  (`leitstand-server.mjs:6711-6715`, `:6736`), währenddessen Lage „offen“. Echte Gründe: vorübergehender Ladefehler
  ('fehlt' ⇒ 'ok', `abnahme-pruefung.mjs:66-69`), nachträgliche Registrierung. Beleg per Unit-Test der Kennung.
- H4 Testinstanz realistisch: Musterinstanz ohne `pruefbefehl` (`b2b2b2/instanz.mjs:47`); Render real nur nach GRÜN
  (`leitstand-server.mjs:6712`) ⇒ zusätzlich `pruefergebnis-<laufId>` GRÜN registrieren. Rückfall „neue Version“ trägt
  (`lineage-registry/index.ts:181-182`).
- H5 Escaping/Kennungen: `ausgabe_ende` ist Rohausgabe, FEHLER-Gründe können absolute Pfade tragen (`render.ts:146`,
  `:167`) — „kein Pfad“ gilt nur für den Kartentext, die Ausgabe roh und escaped (`workflow-abnahme.js:55-57`). Tests:
  unbekanntes `ergebnis` mit `<`/`&`, `renderNachweisKennung(undefined)`.
- H6 FEHLER: `<details open>` (Grund im Ausgabe-Ende, F-1267), Muster `:589`.
- H7 Notiz-Abstand in der Karte: `.v10-seite .note` `margin: 20px 0` (`style.css:3073-3079`); Selektor an
  `style.css:8830-8833` anhängen.
- H8 CSS für `<pre>`: `.workflow-seite .entscheiden-auftrag-text` (`style.css:11116-11127`) trägt 390 px.
- H9 Ortssatz optional mit Verweis „Wo gearbeitet wird“ (`workflows.js:39-42`).
- H10 Modulname `abnahme-render.js` neben `../render.js` mehrdeutig; optional `abnahme-darstellung.js`.
- H11 [OFFEN] Texte F-1273/F-1274 im Plan nicht sichtbar.

## In Ordnung

Kein Importzyklus (neues Modul nur `../i18n.js`, `../render.js`); Nutzer von `pruefWertText`/`PRUEF_WERTE` nur
`workflow-abnahme.js` und `workflows.js:78`, `:1548`; Schlüssel `abnahme.pruefung.wert.*` in allen vier Sprachen;
`workflows.js` Zeilen 78/256 ±0 (nicht formatiert); Komplexität unverändert; `workflow-abnahme.test.mjs` 710 Zeilen;
Projektion 'ok' nur nach Schemaprüfung; Fixpaket-Zeile, K3, K4, H9 gedeckt.

## Größe

[SCHLUSS] Nicht zu groß — ein Baudurchgang, Korrekturrunde in der UI-Schleife; mit P2 ≈ 0,2 AT.

## Nächster sinnvoller Schritt

P1–P3 als Plan v1.1, H1/H2/H7 vorab entscheiden, bauen ohne weiteren Advisor-Pass.
