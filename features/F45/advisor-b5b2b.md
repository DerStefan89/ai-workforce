# Advisor-Pass F45 B5b-2b „Roadmap: Anpassen + Bereinigungsliste“ (Plan v1)

**Gegenstand:** `features/F45/plan-b5b2b.md` (Basis `ec2ec13`, Branch `f45/b5b2b-anpassen-bereinigung`)
**Rolle:** architecture-advisor, frischer Kontext, nur Read/Grep/Glob, 25.10.2026. Abgelegt von der bauenden Sitzung, Inhalt
unverändert.

**Rollengrenze:** Ohne Bash/Git weder Tests, Gates noch `npm run check`, kein Diff gegen main, kein Browser. Nur aus dem Code
abgeleitet: Fokus/Caret nach `innerHTML`, Löschverhalten von Windows PowerShell 5.1 bei Verzeichnisverbindungen, tatsächliche Werte
der echten Bereinigungsliste.

## Urteil: **Nicht freigegeben** — weiterer Schnitt: **ja**

Der Server-Entwurf (eine gemeinsame, reine Vorprüfung für GET und POST, POST bitgleich, Sperre und Hash außen vor) ist tragfähig und
ausdrücklich freigegeben. Drei sachlich falsche Aussagen gingen direkt in Tests/Gates ein (A1–A3); zwei Auftragsvorgaben sind
gefährdet (A5 Auswahl/Git-Block, A7 Wegwerf-Kopie); A4 und A6 entscheidet der Plan stillschweigend. Alles in v2 behebbar; setzt v2
genau diese Punkte um, ist nach Regel 3a kein zweiter Pass nötig.

## A — vor Baubeginn zu klären

- **A1 Gate-Erwartung zu F21 falsch.** [Fakt] Die umbrochene F21-Angabe ist genau eine gültige Standardform
  (`check-f45-b5b1b2-bereinigung.mjs:125-126`, `status-md.ts:24`, Gate (a) `:252-253` erwartet `docs/STATUS.md:12`).
  [Schlussfolgerung] In der Attrappe sind alle fünf „Feature → ABGESCHLOSSEN“ vorprüfend möglich; F21 scheitert im POST nur an der
  Sperre (Gate (c) `:287`). Korrektur: (a) erwartet `moeglich: true` für alle fünf; „nicht möglich“ gezielt erzeugen (z. B. zwei
  Standardformen für F20 wie Gate (e)).
- **A2 Sperrgründe unvollständig.** [Fakt] „STATUS.md ohne Standardform“ sperrt nicht (übersprungen mit Hinweis, `status-md.ts:59-61`);
  sperrend ist „Konvention vorhanden, 0 Angaben für diese ID“ (`:64`). CRLF in STATUS.md sperrt nur mit mindestens einer Standardform
  (`:61-62`), CRLF in der Ausnahmen-Datei nur bei Eintrag mit Ausnahme (`routen-planung.mjs:498-499`). Fehlend: Akte kein UTF-8
  (`:480`), STATUS.md kein UTF-8 (`:485`), Akte-Gate rot (`:482`, `akte-abschliessen.ts:51-52`), „bliebe Abweichung“ (`:509-510`),
  Fehler aus `setzeMeilensteinStatus`/`entferneStatusAusnahme` (`:494`, `:501`). Korrektur: jedes `return antwort(4xx…)` des Blocks
  auflisten — Testfall oder „aus einem GET-Vorschlag unerreichbar, weil …“ (z. B. ohne Status-Zeile kein Vorschlag,
  `roadmap-regeln.ts:185`; ABGESCHLOSSEN keine Abweichung, `:109`).
- **A3 qa8-Satz führt in ein rotes Gate.** [Fakt] Gate b5b1a (i) lässt im echten Repo nur die fünf migrierten Paare mit
  `GRUND_BEREINIGUNG_OFFEN` zu (`check-f45-b5b1a-planung.mjs:19-20, 229, 262`; `feature.md:1471`); F-1189 verlangt „offen/begründet
  entscheiden“ (`findings.md:8808, 8811`). Entscheidung Challenger/Stefan: (a) Satz entfällt bzw. „heute nicht vorgesehen“, qa8 → W2,
  oder (b) Gate (i) um eine Form „begründet“ erweitern (Datenformat-/Gate-Entscheidung, nicht dieses Paket).
- **A4 Auswahl-Streifen in `--mint` wiederholt F-1197.** [Fakt] `--ebene-design: var(--mint)` (`style.css:157, 330`), Mint ist
  Statusfarbe (`:4628-4631`); F-1197 schlägt neutral vor, „Stefan entscheidet“ (`findings.md:8880, 8883`). Korrektur: neutraler
  Streifen (`--ink`/`--line`) oder Kontur, ohne neuen Farbwert; Stefans Entscheidung zu F-1197 belegen oder einholen.
- **A5 Meilenstein-Wechsel verliert Auswahl und Git-Block.** [Fakt] Zeilenschlüssel enthält die Meilenstein-ID
  (`roadmap-anzeige.js:455`), nur der aktuelle Meilenstein ist offen (`:408-412`), unsichtbare Auswahl springt auf die Elternzeile
  (`:623`). Korrektur: nach 200 mit Wechsel `aufgeklappt` aus `standardOffen` plus `['m', neu]`, oder Erfolgsmeldung nicht an die
  Zeile binden; reiner Test „M5 → M6, danach liefert gewaehlteZeile das Feature“.
- **A6 Undokumentierte Abweichungen.** [Fakt] Bug-Felder gehören laut Schnitt zu 2b (`feature.md:1507`); F-1201 existiert nicht
  (`findings.md` endet bei F-1199); F-1198/F-1199 tragen „mit B5b-2b“ (`findings.md:8892, 8901`). Korrektur: Verschiebung mit Quelle
  festhalten, F-1201 anlegen oder richtig referenzieren, F-1198/F-1199 ein- oder ausgrenzen.
- **A7 Nachweis kann echte Daten treffen.** [Fakt] Skript 2a hat Standard-URL `http://127.0.0.1:4431`
  (`nachweise/b5b2a/erzeuge-nachweis.mjs:23`). Korrektur: keine Standard-URL; Skript legt die Kopie an, startet ihren Server selbst und
  verweigert Schreiben gegen einen fremden Server. [Annahme/offene Unsicherheit] `Remove-Item -Recurse` (PS 5.1) kann durch eine
  `node_modules`-Verzeichnisverbindung löschen — Verbindung zuerst einzeln entfernen (`cmd /c rmdir`), prüfen, dann die Kopie.
  [Fakt, entlastend] Isolation über `LEITSTAND_PROJEKTE_PFAD`, `LEITSTAND_PROJEKTE_LOKAL_PFAD`, `LEITSTAND_FAEHIGKEITEN_LOKAL_PFAD`,
  `LEITSTAND_PLUGIN_KOPIEN_WURZEL`, `LEITSTAND_PORT` (`leitstand-server.mjs:662, 13075, 13078, 13172-13175, 13181`).
  [offene Unsicherheit] `raeumeVerwaistePruefordner()` beim Start der Kopie (`:13177`) nicht geprüft.

## O1–O4

- **O1 Platzhalter-Grund reicht: ja.** [Fakt] `pruefeGrund` normalisiert auf eine Zeile ohne Steuerzeichen, ≤ 500
  (`akte-schreiben.ts:163-169`); der Grund steht nur in der Änderungszeile (`akte-abschliessen.ts:49`), das Gate prüft
  Zeilenanfänge/Abschnitte (`feature-akte-pruefung.ts:50-62`). Ergänzungen: Datum im GET `kontext.datum ?? lokalesDatum()`
  (`routen-planung.mjs:473`); ein Fall „möglich ⇒ 200“ mit feindlichem Grund.
- **O2 Inline statt `<dialog>`: fachlich ja**, als Entscheidung festhalten; Häkchen, offener Schritt und Wahl müssen im Zustand stehen
  (`views/roadmap.js:696` schreibt alles neu).
- **O3 Frischer Hash: Auftrag folgen**, Lost Update trifft nur das bewusst geänderte Feld (`planung-schreiben.ts:187-226`);
  DEKLARIERT genügt; optional Vergleich mit frischer Projektion. 409 nur über beantwortete Route nachweisbar.
- **O4 Zuschnitt: nein, weiterer Schnitt empfohlen.** [Fakt] Server-Refaktor mit 10+ Fällen, Gate, zwei Module, drei API-Funktionen,
  zwei Zustandsmaschinen, 4 Sprachen, CSS, Nachweis mit echten Schreibvorgängen, fünf F-1189-Punkte; View 866 Zeilen. B5b-1b wurde an
  derselben Naht geteilt (`feature.md:1426-1429, 1459-1462`); 2a (nur lesend) brauchte eine volle Korrekturrunde mit > 10 Punkten
  (`:1515-1520`). Vorschlag: **2b-1 „Anpassen“** (ohne Server, mit F-1197, Nachweis Anpassen) und **2b-2 „Bereinigungsliste“**
  (Server-Vorprüfung mit Tests, Gate (a), Modul, API, Abschnitt, F-1189 qa2/3/6/7, qa8 nach A3, Nachweis Bereinigung); leichte
  Präferenz 2b-1 zuerst, Reihenfolge entscheidet der Challenger.

## B — darf mitlaufen

B1 Meldungs-/Deute-Bausteine aus `akte-bearbeiten.js` exportieren statt dreifach nachbauen (`:105, 130, 140, 153`), `AKTE_GRUND_MAX`
nutzen. B2 Anpassen nur, wo der Server es zulässt (ABGESCHLOSSEN/ABGEBROCHEN, ohne strengen Abschnitt, ohne Akte; Ziel nur offene
Meilensteine). B3 `<details>`-Zustand und Fokus beim Neuschreiben; Caret im Browser prüfen. B4 Überholschutz gegen Projekt-ID und
Formular-Identität, nicht gegen `roadmapAnfrageZaehler` (`workboard.js:1973-1977`). B5 `[data-befehl-kopieren]` in `beiKlick`
verdrahten; zwei Git-Blöcke unterscheidbar. B6 `verstoesse`/`hinweis` im GET-Vorschlag nur mit Zustimmung des Challengers.
B7 Pille im Phone-Layout (`style.css:4740-4743`: `inline-flex`, `align-self: flex-start`). B8 Dateiköpfe und Antwortvertrag
nachziehen (`views/roadmap.js:17, 33-34`, `routen-planung.mjs:22-25`, `feature.md:1478-1487`). B9 „ARCHITECTURE.md unverändert
(F-1191)“ festhalten. B10 „keine aktuelle R1-Abweichung“ bleibt im POST; nur „Vorschlag vorhanden?“ wandert in die Funktion.

## C — geprüft und in Ordnung

Körperform `{ id, schaetzung_min, schaetzung_max }` und `roadmap_hash` nur mit `meilenstein` (`planung-schreiben.ts:92-123`);
Vorprüfung ohne I/O möglich, GET bleibt lesend (`akte-abschliessen.ts:7-8`, `status-md.ts:8`, `roadmap-schreiben.ts:25-26`,
`routen-planung.mjs:303-361, 475`); POST bitgleich machbar (`:441-510`); Sperre/Hash zu Recht außen vor (Gate (c) `:287`); kein neuer
Schreibweg (`ARCHITECTURE.md:95-96`), Wachstumsbremse unberührt; kein neues Codeform-Gate, `teste.mjs` findet ungetrackte Tests
(`:65`); API-Muster passen (`api.js:170-176, 331`); `projekt-wechsel.test.mjs` bleibt grün (`:187, 459-463, 518-522`); Tokens
`--note-bg`/`--line` in beiden Themes; R2 vernachlässigbar (≤ 5 Einträge); eigenes Nachweisskript hat Vorgänger in 2a.

## Was Plan v2 mindestens enthalten muss

A1, A2 (vollständige Zuordnung), A3 (Entscheidung qa8), A4 (neutrale Auswahl + Entscheidung F-1197), A5, A6, A7, O2 als Entscheidung,
Schnitt 2b-1 / 2b-2.

## Status
- [ ] Freigegeben
- [ ] Freigegeben mit Hinweisen
- [x] Nicht freigegeben
- [ ] Blockiert

## Nächster sinnvoller Schritt
Bericht an den Challenger mit drei Entscheidungen: Schnitt 2b-1/2b-2 (Empfehlung ja), qa8 (A3), F-1197 neutral ohne Mint (A4). Danach
Plan v2 je Teilpaket mit A1, A2, A5, A6, A7; nach Regel 3a ohne zweiten Advisor-Pass.
