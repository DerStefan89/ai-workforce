# Advisor-Pass F45 B2b-4a-2 „Bereit zum Sichern — Anzeige und Befehlsform“ — Plan v1

Geprüft: `features/F45/plan-b2b4a2.md` (v1) gegen `7a56d86`. Subagent `architecture-advisor`, frischer Kontext, nur Read/Grep/Glob,
19.10.2026. Inhaltlich übernommen, Gliederung gestrafft. Nichts ausgeführt; Workboard-Abschnitt nur an der Phasenlogik nachvollzogen.

## Befunde — vor Bau

- **V1 Schlüssel = workflowStatus reicht nicht (Delta 12).** [Fakt] Nach dem Aufräumen wird der Ordner `ENTFERNT`
  (`arbeitsordner-anzeige.js:100`), der Ablauf bleibt `ABGESCHLOSSEN` ⇒ kein Neuladen, Karte zeigt Befehle für einen gelöschten Ordner;
  eine Anpassungsrunde wird ebenso nicht erkannt (Laden nur bei Abnahme/BEENDET). Korrektur: reine Funktion `sichernSchluessel(detail)` =
  `status|ao.status|ao.vorbereitungLaeuft|versionSequenz`, Unit-Test, Gate-Fall „Aufräumen ⇒ neuer Schlüssel“. [Fakt] `versionSequenz`
  liefert der Server (`leitstand-server.mjs:9070`), `aktuellesDetail` speichert sie nicht (`workflows.js:1151`) — ergänzen.
- **V2 `gekappt`/`nurNodeModules` unterdrücken den push-Block.** [Fakt] `MAX_DATEIEN = 500` (`routen-code.mjs:63`); node_modules ohne
  `.gitignore` ⇒ `gekappt`. [Schlussfolgerung] Nach dem Commit der echten Dateien bleibt „bereit (commit)“, kein push-Block trotz
  `voraus > 0` — Sackgasse. Korrektur: push-Block hängt nur an `voraus > 0` + Branch/origin; Hinweis `nodeModules` auch bei `gekappt`;
  Gate (f) Rotfall.
- **V3 Aufräumen im Abschnitt unklar (Delta 8/14).** [Fakt] Karte hat schon einen Knopf (`arbeitsordner-anzeige.js:163-166`); Plan setzt
  zusätzlich Schritt 3 = `aufraeumenHtml`, `ohneAufraeumen` nur für Modus null ⇒ auf der Abnahme zwei Knöpfe oder keiner. [Fakt] Mit
  `arbeitsordner.sichern` (`i18n/de.js:2534`) fällt „Aufräumen erst nach deiner Abnahme“ weg (`aufraeumenMoeglich` sperrt, `:190`).
  Korrektur: mit `kontext.sichern` wandert der Kartenknopf in Schritt 3 (genau einer); bei offener Abnahme „nach deiner Abnahme“; Modus
  null: Hinweis auf den Knopf unter den Aktionen.
- **V4 Beleg „Ort bleibt nach `& { }` gesetzt“ fehlt in einer Datei.** [Annahme, plausibel] Ort ist Sitzungszustand. Korrektur: als Fall
  (d) in den Nachweis vor dem Bau; O1 hängt daran.

## Mitlaufen (Bauauflagen)

1. `ablauf-code-stand.js` ruft `setzeKopfAusCodeStand` nicht (`code-stand.js:46`), sonst zeigen VS Code/GitHub im Kopf auf den Arbeitsordner.
2. Fehlgeschlagener Abruf zählt als gelaufen (Gate „Fehler, 5 Ticks ⇒ 1 Abruf“); nach Fehler keine Blöcke aus altem Stand (`veraltet`).
3. Gate (a) statt textueller Aufruferprüfung: kein `cdZeile(` in `public/` außer `code-daten.js`, kein Literal `'cd ` in `views/`, dazu
   Verhaltensproben der Erzeuger; Grenze Chat/Jarvis → 4b benennen. Gate (d): Views rufen `stelleAblaufCodeStandSicher(…, sichernSchluessel(`.
4. `befehlsBlock` `null` bei relativem Pfad — `auftrag-umgebung.js:249` muss das abfangen.
5. GESTOPPT mit `voraus > 0` und 0 Änderungen: eigener Text.
6. `nichtBestimmbar`: node_modules als mögliche Ursache nennen (`ablauf-sichern.mjs:22-25`).
7. `routen-code.test.mjs:351`: `exit $LASTEXITCODE` hinter den Block; Prüfung bleibt `porcelain`.
8. i18n: vorhandene `code.sichern.grund.*` wiederverwenden (`de.js:2210-2344`); neu nur keinOrt, losgeloest, fremderBranch, keinOrigin,
   nodeModules, nurNodeModules.
9. [Fakt, entlastend] Golden-Liste deckt Delta 9; `code-daten.test.mjs` Z. 110/114 bleiben mit `ersterBlock` = `slice(2, -1)` gültig.

## Entlastend

`ablauf.arbeitsordner.pfad` = Quelle der Wurzel (`:6422`, `:6447`); GESTOPPT liefert `offeneAenderungen`/`voraus`
(`ablauf-sichern.mjs:86-89`); Workboard „abgeschlossen“ nur bei ABGESCHLOSSEN, danach kein Auffrischen (`workboard.js:1237-1256`);
`arbeitsordner` in jeder Detail-Antwort (`:9080`); `workflows.js` in Node mit DOM-Attrappe importierbar (`workflows-dialog.test.mjs:64-122`);
`block.length !== 4` im Gate b2a3b schlüssig.

## Offene Punkte

- O1: ja, nach dem Beleg V4.
- O2: Begründung trägt nicht — `#/code` zeigt das **aktive** Projekt (`api.js:68-69`, `:259`), Fremdprojekte ohne node_modules in der
  `.gitignore`. Empfehlung: Ausschluss in die gemeinsame innere Funktion (eine Regel); Golden unberührt.
- O3: kein Projektordner-Rückfall, aber fester Hinweis mit Link `#/workflows/<id>` statt „lädt“.

## Zuschnitt

[Schlussfolgerung] Knapp zu groß (vier Golden-Dateien, Stand-Modul, Karte, zwei Views, i18n ×4, Gate mit neun Teilen, Render-Matrix
6 Lagen × de/ru × 1440/390 × hell/dunkel × 200 %); mit V1–V3 zweite Korrekturrunde wahrscheinlich. Vorschlag:
- **4a-2a Blockform:** Teil 1, `zaehleBefehle`, `auftrag-umgebung`, Golden-Dateien, Gate (a)(b), Nachweis Delta 18 und V4, Render-Nachweis
  nur #/code bei 390 (Delta 17). Schließt F-1088 (5).
- **4a-2b Anzeige:** der Rest. Naht: `befehlsBlock`, `ablaufSicherBefehle`.
Ohne Schnitt mindestens Render-Matrix verkleinern (ru und 200 % nur für „bereit (commit)“).

## Urteil: Nicht freigegeben

## Nächster sinnvoller Schritt

Stefan entscheidet Schnitt (4a-2a/4a-2b oder kleinere Matrix) und O2; danach Plan v2 mit V1–V4 und Bauauflagen 1–9, kurzer Delta-Pass.
