# F45 W2 — Gate-Inventur (W2a)

Stand 27.10.2026, Branch `f45/w2a-gates-laeufer` (Basis main `5ce0b47`). Grundlage für W2b „Codeform-Gates abbauen“. **Nachtrag W2b-1** (27.10.2026, `plan-w2b1-v2.md`): siehe Abschnitt „Stand W2b-1“; Tabelle und Befunde tragen den Stand mit „W2b-1:“. **Nachtrag W2b-2** (27.10.2026, `plan-w2b2-v2.md`): Abschnitt „Stand W2b-2“; die Spalte Parallel-Risiko der Tabelle bleibt Stand W2a (Repo-Wurzel- und startvorlagen-Angaben überholt).
Quelle der Liste: `GATES` in `scripts/check-kette.mjs` (bis W2a die `&&`-Kette `check:gates` in `package.json`, gleiche
122 Einträge in gleicher Reihenfolge).

## Methode

- **Zeilen:** Zeilen der Gate-Datei wie `wc -l` (ohne importierte Module; `npm run lint`/`typecheck` „–“).
- **Dauer:** einzeln gemessen, `features/F45/nachweise/t/messung-teillog.txt` (24.10.2026, Sitzung unter Speicherdruck —
  Werte liegen über einem frischen Terminal, für die Rangfolge reichen sie).
- **Kategorie, Server, Kandidat, Parallel-Risiko:** durch Lesen jeder Gate-Datei (vier Lese-Agenten, 27.10.2026), je Gate
  ein Urteil — DEKLARIERT, keine Messung. Kategorien: **Verhalten** ruft echten Code auf und prüft Ergebnisse
  (kleine Textanteile bis ≈ 10 % bleiben Verhalten); **Invariante** prüft Struktur/Konsistenz von Daten- und
  Doku-Dateien bzw. Werkzeug-Analyse ohne Textmuster (`lint`, `typecheck`); **Codeform** prüft Strings/Regex im
  Quelltext; **gemischt** wesentliche Anteile beider (Codeform-Anteil im Grund); **Sicherheit** csrf, host,
  authorization-boundary, secrets, wirkungsmarke, human-transport — immer „behalten“.
- **Server:** „ja“, wenn das Gate `scripts/leitstand-server.mjs` importiert, startet oder dessen Quelltext liest.
- **Kandidat W2b:** Vorschlag, keine Entscheidung. „löschen“ nur bei belegter Doppelung oder Codeform ohne Schutzwert.
- **Parallel-Risiko:** „(seriell)“ = steht in `SERIELL` des Läufers (23 Gates, Kriterien im Kopf von `SERIELL`; „Frist“ = wartet mit fester Frist ≤ 10 s auf Server-/Workflow-/Kindprozess-Zustand, F-1215); „Repo-Wurzel kontrollzustand-test-*“ = legt
  eindeutig benannte Wegwerf-Ordner in der Repo-Wurzel an (gitignoriert, untereinander kollisionsfrei, aber Grund für
  die serielle Gruppe der Repo-Baum-Läufer).

## Summen

Je Kategorie (Anzahl · Zeilen · Σ Dauer s):

| Kategorie | Gates | Zeilen | Dauer (s) |
|---|---|---|---|
| Verhalten | 74 | 38.351 | 627,6 |
| gemischt | 20 | 8.156 | 35,5 |
| Invariante | 15 | 2.585 | 25,1 |
| Codeform | 7 | 2.076 | 5,2 |
| Sicherheit | 6 | 1.095 | 10,9 |
| **gesamt** | **122** | **52.263** | **704,3** |

Je Kandidat W2b:

| Kandidat | Gates | Zeilen | Dauer (s) |
|---|---|---|---|
| ersetzen durch Test | 60 | 27.954 | 444,0 |
| behalten | 59 | 23.589 | 259,1 |
| löschen | 3 | 720 | 1,2 |

Server „ja“: 85 Gates (45.020 Zeilen).

Summen = Stand W2a. **Stand W2b-1:** 120 Gates (−2: `check-f24-capabilities` Verhalten 116 Zeilen, `check-f15-workflow-oberflaeche` Codeform 501 Zeilen); Kandidat „löschen“ 3 → 2 gelöscht, `check-f8-execution-controller` behalten (Grenze ohne Ersatz). Zeilen der übrigen Gates nicht neu gezählt.

## Stand W2b-1

- **Eine Zählstelle:** `starteWorkflowSchritt(` = 6 sowie Workflow-Schreiber 14 / `.eingefroren` 13 (F-228) zählt nur noch `check-f15-workflow` (AK6b/AK7, F-228-Block); gestrichen in 30 Gates (b2b3c/b2b3d (f) ganz, b2b3b1 (f) behält die Opt-in-Prüfungen). Wird f15-workflow in Tests umgebaut, wandern die drei Zählungen mit. Server-Zeilenratsche nur `check-wachstumsbremse-server` (gestrichen in b2b3b2b2b1 (w), b2b4a2b2 (h), fb2 (h), b5b1b2 (m)).
- **Pins:** sha256 auf `scripts/_rueckfrage-aus-pruefung.mjs` gestrichen (a3 (w), b1 (w)); die Strenge der Regel tragen die Rotfälle in `check-f45-b2b3b2b2a-einschalten` (o3), seit W2b-1 neun (zweite Vorgabe `rueckfrageBasis`). DEKLARIERT: eine neue Form in `ERLAUBT_HANDLER`/`ERLAUBT_KARTE` fällt keinem Rotfall auf. `f36-ws3-empfehlung` (e) bleibt: schließt F-833 (1), hängt an der Ausgabe; jede Wortlautänderung des Auftragstexts färbt es gewollt rot.
- **Gelöscht/gestrichen nach Belegprüfung:** f24 (capabilities-ansicht.test.ts AK1/5/6, Projektion per `map`), f15-workflow-oberflaeche (Syntax: Biome liest `public/**/*.js`, Rotbeleg in der Sitzung; Verhalten: View-Tests), f28 (1) (= f20-design-tokens (2)), f21-ws2 (d) (attention-daten.test.mjs, seit W2b-1 mit ERFOLGREICH-Fall). DEKLARIERTE Restgrenzen nach f15-workflow-oberflaeche: Endpunkt-Zuordnung in `api.js` für `/starten`, `/freigabe` und Reparatur-`POST /workflows`, Container-ids in `index.html` — prüft nur noch der Render-Nachweis.
- **Nicht gestrichen:** f8 (Grenze „Controller ohne F4/F5/F6a/F7-Regelbezeichner“, Entscheidung Stefan 04.09.2026, kein Test trägt sie; „Importregel“ gibt es nicht).
- **60 × „ersetzen durch Test“** bleiben stehen (Challenger 27.10.2026): umgeschrieben wird nur, wenn der Bereich ohnehin angefasst wird (F-1228).

## Stand W2b-2

- **Wegwerf-Ordner:** 52 Gates der Kette, `check-f20-leitstand-shell` und 18 Testdateien legen ihre Ordner über `wegwerfOrdner` (`scripts/_wegwerf.ts`, `mkdtemp` unter `os.tmpdir()`, Aufräumen beim Prozessende über `raeumeVerzeichnis`, R1) an statt als `kontrollzustand-test-*` in der Repo-Wurzel; die Aufräumer je Fall bleiben. Ausnahme: Projektregister-Einträge in `check-f25`/`check-f41` (`basisverzeichnis` relativ zu `repo_pfad`) — reine Validierung oder unter `os.tmpdir()`; der Dispatch-Eintrag in f25 (7) hat `repo_pfad: '.'` und zeigt damit in die Repo-Wurzel, der Ordner wird dort aber nie angelegt (nur GET). Dazu leiten `claude-code-gateway.test.ts` und `execution-controller.test.ts` ihre Rohströme in den Wegwerf-Ordner.
- **startvorlagen/ und Rohströme:** f10, f14, f15-automat-real schreiben ihre Wegwerf-Startvorlagen in den Wegwerf-Ordner; f14 und f15-automat-real geben dem Testserver `rohBasisVerzeichnis` mit (Handler-Option, über `starteLaufUndVergiss` an F8 durchgereicht — kein Produktcode geändert).
- **Fristen:** die 11 Frist-Gates warten über `skaliert` (`AIW_TEST_ZEITFAKTOR`, Standard 1).
- **SERIELL** 23 → 16: Repo-Baum-Läufer und startvorlagen-Gruppe laufen parallel; Zeit-/Frist-Gates und f3b1 bleiben (Kommentare im Läufer).
- **git-Wartung (F-1230):** jedes Wegwerf-Repo in Gates (43 Dateien) und Tests (21 Dateien) schaltet gc/maintenance direkt nach `git init` ab.

## Stand W2c-1

- **Neues Gate** `check-ratsche` (parallel, ≈ 8 s): Ratsche je Datei für Biome-Befunde je Regel (Preset recommended, Komplexität ≤ 15), Zeilen über 800 (ohne Server und i18n) und checkJs-Fehler `scripts/leitstand/*.mjs`, dazu die Liste formatierter Dateien (E-FMT-1 = B, kein Massen-Commit). Bestand `scripts/ratsche.json`; Regel und Durchsetzungsgrad in ARCHITECTURE.md §1, Einzelheiten `docs/architektur/ratsche.md`. Gates jetzt 121.
- **Codeform-Gates und Formatierung:** eine Probe-Formatierung des Bestands färbte 14 Codeform-Prüfungen und die Wachstumsbremse rot (F-1239) — der Bestand bleibt unformatiert; Formatierung einer Bestandsdatei nur, wenn ihre Leser-Gates mitgezogen werden.
- **Dritte Kopie der Referenzlogik** (merge-base) in `check-ratsche` (F-1241): in W2 mit der Ablösung der W1-Ratsche zusammenführen.

## Befunde für W2b

1. **Reine Codeform ist selten, Codeform-Anteile sind überall.** Nur 7 Gates sind reine Codeform, 20 gemischt — aber
   die meisten „Verhalten“-Gates tragen kleine Quelltext-Prüfungen. Die Zählung `starteWorkflowSchritt(` = 6 in
   `leitstand-server.mjs` steht in rund 30 Gates (über 30 Gate-Dateien nennen den Bezeichner), die Server-Zeilenratsche zusätzlich in `b2b3b2b2b1-nachweis`,
   `b2b4a2b2-anzeige`, `fb2-faehigkeit-anzeige`, `b5b1b2-bereinigung` (Doppel zu `check-wachstumsbremse-server`);
   `b2b3c`/`b2b3d`/`b2b3b1` prüfen dieselben Zählungen 6/14/13. Ein Server-Umbau färbt sie alle gleichzeitig rot —
   einmal zentral behalten, Rest streichen. **W2b-1: erledigt** (zentral `check-f15-workflow`, Ratsche `check-wachstumsbremse-server`).
2. **Hash-Pins auf Quelldateien:** `b2b3b2b2a3-abnahme` und `b2b3b2b2b1-nachweis` pinnen den sha256 von
   `scripts/_rueckfrage-aus-pruefung.mjs`; `f36-ws3-empfehlung` (e) einen Text-Schnappschuss. **W2b-1:** Quelldatei-Pins gestrichen; (e) bleibt (F-833).
3. **Wegwerf-Ordner in der Repo-Wurzel:** mindestens 43 Gates legen `kontrollzustand-test-…` relativ zum Arbeitsordner an statt
   unter `os.tmpdir()` (nach Abbruch bleiben Reste, F-590); `f14-abbruch` und `f15-automat-real` schreiben zusätzlich
   feste Dateien nach `startvorlagen/` und Rohströme nach `kontrollzustand-roh/`. Umstellung auf `mkdtemp` ist je Gate
   klein und würde die serielle Gruppe 1 (Repo-Baum-Läufer) des Läufers überflüssig machen; für Gruppe 2 müssten zusätzlich die festen Dateien in `startvorlagen/` umgelenkt werden. **W2b-2: erledigt** (beide Gruppen aus `SERIELL`).
4. **Lastempfindliche Zeitmessungen:** `f43-projekt-aufrufen`, `f20-zustand-poll` (d), `fix-zustand-poll-kosten` (3),
   `f652-pruefschritt` (d) sowie die 11 Gates mit Frist ≤ 10 s (F-1215, Spalte Parallel-Risiko) — Kandidaten für
   Unit-Tests ohne Wanduhr bzw. Fristen mit Zeitfaktor; danach können sie aus `SERIELL`. **W2b-2:** Fristen der 11 Gates mit Zeitfaktor (Standard 1); sie bleiben seriell bis zu einer Messung unter Last.
5. **Belegte Doppelungen:** `f24-capabilities` (capabilities-ansicht.test.ts), `f28-persona` (1) (f20-design-tokens),
   `f21-ws2-workboard-oberflaeche` (d) (attention-daten.test.mjs), `b2b3d` (f) = `b2b3c` (f). **W2b-1: erledigt.**
6. **Gate außerhalb der Kette:** `scripts/check-f20-leitstand-shell.mjs` (Chrome-Klicktest) läuft nur als eigener
   CI-Schritt (`.github/workflows/ci.yml`, `continue-on-error`), nicht in `check:gates` — für W2b mitbetrachten.

## Tabelle

| # | Gate | Zeilen | Dauer (s) | Kategorie | Server | Kandidat W2b — Grund | Parallel-Risiko |
|---|---|---|---|---|---|---|---|
| 1 | `npm run lint` | – | 16,9 | Invariante | nein | behalten — Werkzeug-Lint (Biome), keine Textmuster | – |
| 2 | `npm run typecheck` | – | 1,2 | Invariante | nein | behalten — Typsicherheit, durch nichts sonst abgedeckt | – |
| 3 | `check-docs` | 338 | 1,9 | Invariante | nein | behalten — einzige Prüfung auf Doku-Drift und tote Verweise | Repo-Baum (seriell) |
| 4 | `check-status-akten` | 121 | 0,2 | Invariante | nein | behalten — wendet getestete Regel auf echte STATUS.md/Akten an | – |
| 5 | `check-rules` | 257 | 2,2 | Codeform | nein | behalten — Regel R1 (rmSync ohne maxRetries, F-257) prüft nur Prüfcode | Repo-Baum (seriell) |
| 6 | `check-contract` | 74 | 0,1 | Invariante | nein | behalten — Format der Handoff-Verträge, sonst ungeprüft | – |
| 7 | `check-feature` | 78 | 0,2 | Invariante | nein | behalten — Regeln in Tests, Gate prüft die echten Akten | – |
| 8 | `check-akte-meilenstein` | 200 | 0,3 | Invariante | nein | behalten — Abgleich Roadmap ↔ Akten, sonst ungeprüft | – |
| 9 | `check-datenformate` | 238 | 0,1 | Invariante | nein | behalten — Schemas, Beispiele und echte Daten gegen Validator | liest kontrollzustand/ (nur lesend) |
| 10 | `check-checkpoint-store` | 115 | 0,2 | Verhalten | nein | ersetzen durch Test — reine Modulprüfung, gehört in checkpoint-store.test.ts | Repo-Wurzel kontrollzustand-test/ |
| 11 | `check-lineage-registry` | 145 | 0,2 | Verhalten | nein | ersetzen durch Test — reine Modulprüfung, lineage-registry.test.ts existiert | Repo-Wurzel kontrollzustand-test/ |
| 12 | `check-f1b-wirkungsmarke` | 113 | 0,2 | Sicherheit | nein | behalten — Wirkungsmarke (Sicherheit) | Repo-Wurzel kontrollzustand-test/ |
| 13 | `check-f3-authorization-boundary` | 127 | 2,1 | Sicherheit | nein | behalten — Authorization Boundary (Sicherheit) | – |
| 14 | `check-f9-human-transport` | 195 | 0,2 | Sicherheit | nein | behalten — Human-Transport (Sicherheit) | Repo-Wurzel kontrollzustand-test/ |
| 15 | `check-f5-context-builder` | 154 | 0,2 | Verhalten | nein | ersetzen durch Test — reine Modulprüfung, context-builder.test.ts existiert | Repo-Wurzel kontrollzustand-test/ |
| 16 | `check-f4-invocation-policy` | 321 | 3,7 | Verhalten | nein | ersetzen durch Test — invocation-policy.test.ts existiert; AC8-Grep blockiert Umbau | – |
| 17 | `check-f6a-claude-code-gateway` | 257 | 0,3 | gemischt | nein | ersetzen durch Test — Fixtures und Funktionen testbar; Grep-Teil ≈ 20 % | Repo-Wurzel kontrollzustand-test/ |
| 18 | `check-f7-result-evaluator` | 185 | 0,3 | gemischt | nein | ersetzen durch Test — result-evaluator.test.ts deckt klassifiziereLauf ab; Grep ≈ 30 % | Repo-Wurzel kontrollzustand-test/ |
| 19 | `check-f8-execution-controller` | 103 | 0,2 | Codeform | nein | behalten — W2b-1: Kandidat verworfen, Grenze (Stefan 04.09.2026) ohne Ersatz | – |
| 20 | `check-f10-leitstand` | 862 | 1,6 | Verhalten | ja | ersetzen durch Test — Handler-Tests mit Port 0; AK4 liest Server-Quelltext | schreibt startvorlagen/ (seriell) |
| 21 | `check-f11-auftrag` | 403 | 0,6 | gemischt | ja | ersetzen durch Test — reine Funktionen; Greps auf Controller/Server ≈ 25 % | – |
| 22 | `check-f12-leitstand-ansicht` | 503 | 1,0 | gemischt | ja | ersetzen durch Test — Server-Teil testbar, Frontend-Greps ≈ 20 % ohne Wert | Repo-Wurzel kontrollzustand-test-* |
| 23 | `check-f13-entscheiden` | 700 | 1,5 | Verhalten | ja | ersetzen durch Test — Handler-Tests; Grep auf Server-Quelltext blockiert Umbau | Repo-Wurzel kontrollzustand-test-* |
| 24 | `check-f14-abbruch` | 414 | 10,2 | Verhalten | ja | behalten — einziger E2E-Beleg mit echtem Kindprozess (Timeout/Abbruch) | schreibt startvorlagen/, kontrollzustand-roh/ (seriell) |
| 25 | `check-f15-workflow` | 3.468 | 95,3 | Verhalten | ja | ersetzen durch Test — Attrappen-Automat; seit W2b-1 einzige Zählstelle 6/14/13 (beim Umbau mitnehmen) | Repo-Wurzel kontrollzustand-test-* |
| 26 | `check-f15-workflow-oberflaeche` | 501 | 0,8 | Codeform | nein | erledigt W2b-1 (gelöscht) — Syntax über Biome, Restgrenzen DEKLARIERT | – |
| 27 | `check-f15-instanzlock` | 345 | 2,6 | Verhalten | ja | ersetzen durch Test — Lock-Logik im Wegwerf-Ordner als Unit-Test prüfbar | – |
| 28 | `check-f15-automat-real` | 1.169 | 24,5 | Verhalten | ja | behalten — einziger echter E2E-Lauf der Automatenkette | schreibt startvorlagen/, kontrollzustand-roh/ (seriell) |
| 29 | `check-f16-codex-gateway` | 789 | 0,5 | gemischt | ja | ersetzen durch Test — codex-gateway.test.ts existiert; Codeform ≈ 35 % | liest alle startvorlagen/ |
| 30 | `check-f17-rollenvertrag` | 581 | 1,6 | Verhalten | ja | ersetzen durch Test — rollen.test.ts existiert; Repo-Grep blockiert Umbenennungen | Repo-Wurzel kontrollzustand-test-* |
| 31 | `check-f18-router` | 113 | 0,2 | Verhalten | nein | ersetzen durch Test — Fixture- und Konstantenprüfung, router.test.ts existiert | – |
| 32 | `check-f19-ressourcen` | 171 | 0,2 | Invariante | nein | behalten — ressourcen.json gegen Umgebung, Rollen- und Capability-Abdeckung | – |
| 33 | `check-f20-design-tokens` | 556 | 0,2 | Codeform | nein | behalten — Farb-Lint plus WCAG-Kontrast schützt Token-Disziplin | – |
| 34 | `check-f44-i18n` | 257 | 0,2 | Invariante | nein | behalten — Wörterbücher vollständig; Teil (6) scannt t()-Schlüssel | – |
| 35 | `check-f46-bestand` | 100 | 0,2 | Codeform | nein | behalten — bewusster Bestandsschutz (Stefan); Funktion hat eigenen Test | – |
| 36 | `check-f20-zustand-poll` | 391 | 10,0 | gemischt | ja | ersetzen durch Test — Textmuster (c) überflüssig; Messung (d) lastempfindlich | Zeitgrenze, liest kontrollzustand/ (seriell) |
| 37 | `check-f21-workboard` | 319 | 0,5 | Verhalten | ja | behalten — Parser-Rotfälle plus echte Register-/Archiv-Invariante | Repo-Wurzel kontrollzustand-test-* |
| 38 | `check-f21-ws2-workboard-oberflaeche` | 316 | 0,9 | Codeform | nein | ersetzen durch Test — Wortstrings; (d) erledigt W2b-1 (gestrichen, attention-daten.test.mjs) | – |
| 39 | `check-f22-click-to-work` | 484 | 0,5 | Verhalten | ja | behalten — Router-Ergebnis, Workflow-Kopplung und 409 real über HTTP | Repo-Wurzel kontrollzustand-test-* |
| 40 | `check-f23-abnahme` | 1.092 | 3,6 | Verhalten | ja | behalten — Abnahme-/Entscheidungspfad E2E mit Wegwerf-Git | Repo-Wurzel kontrollzustand-test-* |
| 41 | `check-f24-capabilities` | 116 | 0,2 | Verhalten | nein | erledigt W2b-1 (gelöscht) — AK1/5/6 in capabilities-ansicht.test.ts | – |
| 42 | `check-f27-scout` | 384 | 0,5 | Verhalten | ja | behalten — Rollenvertrag, Schema, HTTP und Laufakten real geprüft | Repo-Wurzel kontrollzustand-test-* |
| 43 | `check-f25-projekte` | 582 | 0,8 | Verhalten | ja | behalten — Multi-Projekt-Dispatcher und cwd-Durchreichung E2E | – |
| 44 | `check-f26-jarvis` | 590 | 0,7 | Verhalten | ja | behalten — Jarvis-Chat, Lineage und Schema über echten Handler | Repo-Wurzel kontrollzustand-test-* |
| 45 | `check-f28-persona` | 170 | 0,5 | gemischt | ja | ersetzen durch Test — (1) erledigt W2b-1 (gestrichen); (2) reine Funktion | – |
| 46 | `check-f31-gedaechtnis` | 664 | 0,7 | Verhalten | ja | behalten — Chat-Gedächtnis und Zusammenfassung real im Auftragstext | Repo-Wurzel kontrollzustand-test-* |
| 47 | `check-f32-verbrauch` | 214 | 0,3 | Verhalten | nein | ersetzen durch Test — reine Validierung/Projektion, gehört in node:test | Repo-Wurzel kontrollzustand-test-* |
| 48 | `check-f32-verbrauch-ansicht` | 286 | 0,5 | Verhalten | ja | behalten — Zeitraum-Rotfälle 400/200 real über HTTP | Repo-Wurzel kontrollzustand-test-* |
| 49 | `check-f33-projektkontext` | 315 | 0,6 | Verhalten | ja | behalten — echte Kontextdateien plus Einspeisung in den Context Builder | Repo-Wurzel kontrollzustand-test-* |
| 50 | `check-f33-roadmap-projektion` | 166 | 0,5 | Verhalten | ja | behalten — echte roadmap.json plus Projektions-Rotfälle und HTTP | Repo-Wurzel kontrollzustand-test-* |
| 51 | `check-f34-product-coach` | 1.519 | 1,2 | gemischt | ja | behalten — Verhalten wertvoll; Codeform-Abschnitte ≈ 15 % auslagern | Repo-Wurzel kontrollzustand-test-* |
| 52 | `check-f39-architekt` | 1.426 | 1,7 | Verhalten | ja | behalten — Architekt-Schrittstart, Schema-Dialekt und Vorlagen real | Repo-Wurzel kontrollzustand-test-* |
| 53 | `check-f652-pruefschritt` | 663 | 15,0 | Verhalten | ja | behalten — Prüfschritt-Automat mit echtem Prozess-Kill | Zeitgrenze 200 ms (seriell) |
| 54 | `check-f656-pruefung-wiederholen` | 430 | 12,2 | Verhalten | ja | behalten — Wiederholen-Pfad (409/Regel 1f) E2E | Frist ≤ 10 s auf Server-/Workflow-Zustand, Repo-Wurzel kontrollzustand-test-* (seriell) |
| 55 | `check-f659-review-korrektur-begruendung` | 315 | 3,5 | Verhalten | ja | behalten — Korrekturrunden-Auftragstext real über den Workflow | Frist ≤ 10 s auf Server-/Workflow-Zustand, Repo-Wurzel kontrollzustand-test-* (seriell) |
| 56 | `check-f40-lagebild` | 198 | 0,6 | Invariante | nein | behalten — Drift lagebild.md gegen STATUS/findings plus CLI-Rotfall | Repo-Wurzel kontrollzustand-test-* |
| 57 | `check-fix-zustand-poll-kosten` | 222 | 1,1 | Verhalten | ja | ersetzen durch Test — Cache-Fälle passen zu zustand-caches.test.mjs | Zeitvergleich kalt/warm (seriell) |
| 58 | `check-fix-f588-sammle-laeufe` | 145 | 0,5 | Verhalten | ja | ersetzen durch Test — zwei HTTP-Fälle, gehören zu zustand-caches.test.mjs | Repo-Wurzel kontrollzustand-test-* |
| 59 | `check-fix-f639-schema-strict-modus` | 244 | 0,2 | Invariante | nein | behalten — zentrale Strict-Prüfung aller Codex-Ausgabeschemata | – |
| 60 | `check-f41-projekt-anlegen` | 666 | 7,8 | Verhalten | ja | behalten — Projekt anlegen E2E mit Fixture-Repos und Rückbau | – |
| 61 | `check-fix-f676-installwurzel` | 284 | 0,5 | Verhalten | ja | behalten — Asset-Auflösung Installation vs. Projekt mit Rotfall | Repo-Wurzel kontrollzustand-test-* |
| 62 | `check-f42-projekt-harness` | 1.044 | 10,4 | Verhalten | ja | behalten — Skelett, Prüfbefehl-Lauf, Trust-Fixtures | – |
| 63 | `check-skelett-herkunft` | 140 | 0,2 | Invariante | nein | behalten — billige Hash-Drift-Prüfung Skelett gegen HERKUNFT.md | – |
| 64 | `check-f35-ws1-feature-auftrag` | 367 | 0,5 | Verhalten | ja | ersetzen durch Test — HTTP-Routentest am Fremdprojekt ohne Repo-Daten | Repo-Wurzel kontrollzustand-test-* |
| 65 | `check-f35-ws2-urteil-je-ak` | 426 | 8,1 | Verhalten | ja | ersetzen durch Test — Integrationstest Automat/Urteil je AK | Frist ≤ 10 s auf Server-/Workflow-Zustand, Repo-Wurzel kontrollzustand-test-* (seriell) |
| 66 | `check-f35-ws3-adjust-automatik` | 519 | 11,7 | Verhalten | ja | ersetzen durch Test — Grenze (c)/(d) teils doppelt zu b2b1 (a) | Frist ≤ 10 s auf Server-/Workflow-Zustand, Repo-Wurzel kontrollzustand-test-* (seriell) |
| 67 | `check-zustand-sichern` | 228 | 16,9 | Verhalten | nein | ersetzen durch Test — Kindprozess in Wegwerf-Repos; Unit-Test existiert | – |
| 68 | `check-git-starter` | 243 | 0,7 | Codeform | ja | behalten — Lint gegen Git-Binary-Planting, eigener Test vorhanden | – |
| 69 | `check-fixpaket-f30-vorbedingungen` | 619 | 20,2 | Verhalten | ja | ersetzen durch Test — Nachlaufregeln über HTTP; Vorlagenprüfung (g) behalten | Repo-Wurzel kontrollzustand-test-* |
| 70 | `check-fixpaket-f35-reallauf` | 834 | 12,8 | Verhalten | ja | ersetzen durch Test — Auftragstext/ADR/Allowlist, Teile schon unit-artig | Repo-Wurzel kontrollzustand-test-* |
| 71 | `check-f36-ws2-laufzeit` | 339 | 2,7 | Verhalten | ja | ersetzen durch Test — Argv-Bitgleichheit, klassischer Integrationstest | Frist ≤ 10 s auf Server-/Workflow-Zustand, Repo-Wurzel kontrollzustand-test-* (seriell) |
| 72 | `check-f36-ws3-empfehlung` | 404 | 16,0 | Verhalten | ja | ersetzen durch Test — Empfehlungsroute; sha256-Schnappschuss bricht bei Textänderung | Repo-Wurzel kontrollzustand-test-* |
| 73 | `check-f36-ws5a-installation` | 592 | 10,7 | Verhalten | ja | ersetzen durch Test — Installationsroute mit Stub-Läufern, kein Repo-Datenbezug | Repo-Wurzel kontrollzustand-test-* |
| 74 | `check-f36-ws5b-skill` | 715 | 31,7 | Verhalten | ja | ersetzen durch Test — Skill-Installation/Argv mit lokalem Fixture-GitHub | Ausfall unter Last F-1215, Repo-Wurzel kontrollzustand-test-* (seriell) |
| 75 | `check-f45-f1-faehigkeiten` | 179 | 1,9 | Verhalten | ja | ersetzen durch Test — Startweg-Tokens; liest echten Katalog nur lesend | – |
| 76 | `check-f45-f2b-sammlung` | 128 | 0,4 | gemischt | ja | ersetzen durch Test — Zahl-Invariante behalten, Server/HTML-Strings ≈ 20 % streichen | – |
| 77 | `check-f45-f2b2-pruefung` | 555 | 7,8 | Verhalten | ja | ersetzen durch Test — Prüfbericht/Freigabe über HTTP; Regex (h) streichen | Repo-Wurzel kontrollzustand-test-* |
| 78 | `check-f45-b2a1-projektkarte` | 374 | 3,5 | Verhalten | ja | ersetzen durch Test — (a)/(k) hängen an echter ARCHITECTURE.md/CLAUDE.md | – |
| 79 | `check-f45-b2a2-arbeitspaket` | 489 | 7,2 | Verhalten | ja | ersetzen durch Test — Vergleichstext fest; Zählungen (g) streichen | – |
| 80 | `check-f45-b2a3-codex-review` | 457 | 13,0 | gemischt | ja | ersetzen durch Test — Spec-Hash (a) behalten, Server-Strings ≈ 20 % streichen | – |
| 81 | `check-f45-b2a3b-review-stand` | 499 | 25,4 | Verhalten | ja | ersetzen durch Test — Fingerabdruck-Logik ist Testmaterial; Quelltext-Fenster spröde | – |
| 82 | `check-f45-f3a-plugins` | 457 | 0,9 | gemischt | ja | ersetzen durch Test — Import-/Literalgrenzen besser als Lint; (e) doppelt | – |
| 83 | `check-f45-f3a2-anzeige` | 396 | 0,7 | gemischt | ja | ersetzen durch Test — XSS-Teil wertvoll; HTML/JS-Text ≈ 25 % | – |
| 84 | `check-f45-f3b1-freigabe` | 1.331 | 5,1 | Verhalten | ja | ersetzen durch Test — Grenzen-Regex (f) als eine Lint-Regel bündeln | vergleicht echtes ~/.ai-workforce (seriell) |
| 85 | `check-f45-f3b2-lauf` | 580 | 1,5 | Verhalten | ja | ersetzen durch Test — D13-Fenster (m) im Quelltext spröde | – |
| 86 | `check-f45-b2b1-rueckweg` | 991 | 22,1 | Verhalten | ja | ersetzen durch Test — Schema-SHA (c0b) als Invariante behalten | Frist ≤ 10 s auf Server-/Workflow-Zustand, Repo-Wurzel kontrollzustand-test-* (seriell) |
| 87 | `check-f45-b2b2-pruefer` | 835 | 43,7 | Verhalten | ja | ersetzen durch Test — Schema-SHA (s0)/(s1) behalten, Zählung (f) doppelt | Frist ≤ 10 s auf Server-/Workflow-Zustand, Repo-Wurzel kontrollzustand-test-* (seriell) |
| 88 | `check-f45-b2b3c-budget` | 628 | 18,3 | Verhalten | ja | ersetzen durch Test — (f) erledigt W2b-1 (gestrichen) | Frist ≤ 10 s auf Server-/Workflow-Zustand, Repo-Wurzel kontrollzustand-test-* (seriell) |
| 89 | `check-f45-b2b3d-umfang` | 270 | 12,3 | Verhalten | ja | ersetzen durch Test — (f) erledigt W2b-1 (gestrichen) | Repo-Wurzel kontrollzustand-test-* |
| 90 | `check-f45-b2b3b1-rueckfrage` | 561 | 15,8 | Verhalten | ja | behalten — sicherheitsnah: Token-403, Deny-Grenzen des Rückfrage-Kanals | – |
| 91 | `check-f45-b2b3b1b-auswertung` | 421 | 3,5 | Verhalten | ja | ersetzen durch Test — Evaluator-Fälle e1–e4 sind reine Unit-Fälle | Frist ≤ 10 s auf Server-/Workflow-Zustand (seriell) |
| 92 | `check-f45-b2b3b2a-absicherung` | 444 | 4,4 | Verhalten | ja | behalten — sicherheitsnah (Fälschung, Steuerzeichen) | – |
| 93 | `check-f45-b2b3b2b1a-rest` | 426 | 4,7 | Verhalten | ja | behalten — Fälschungsfall r3 und Löschlisten-Schutz r2 | – |
| 94 | `check-f45-b2b3b2b1b-r1` | 388 | 6,1 | Verhalten | ja | behalten — einziger E2E-Beleg R1 mit echtem Controller | – |
| 95 | `check-f45-b2b3b2b2a-einschalten` | 435 | 9,7 | Verhalten | ja | behalten — Schalter und URL-Basis über echten Dispatcher und MCP-Skript | – |
| 96 | `check-f45-b2b3b2b2a2-anzeige` | 195 | 0,9 | Verhalten | ja | ersetzen durch Test — Routen- und Render-Proben passen in Handler-/Modultests | – |
| 97 | `check-f45-b2b3b2b2a3-abnahme` | 242 | 0,9 | gemischt | ja | ersetzen durch Test — Evaluator unit-fähig; Hash-Pin erledigt W2b-1 (gestrichen) | – |
| 98 | `check-f45-b2b3b2b2b1-nachweis` | 277 | 0,5 | Verhalten | ja | ersetzen durch Test — hauptprogramm direkt testbar; (w) erledigt W2b-1 (Ratsche, Zählung, Pin gestrichen) | – |
| 99 | `check-f45-b2b3b2b2b2a-crlf` | 117 | 0,3 | gemischt | nein | ersetzen durch Test — Verhalten schon in arbeitsordner.test.ts; Rest Text ≈ 60 % | – |
| 100 | `check-f45-b2b3b2b2b2b1-projekt-cli` | 208 | 7,6 | Verhalten | ja | ersetzen durch Test — Handler-Option installierteCliVersion im Handlertest abbildbar | – |
| 101 | `check-f45-b2b3e1-pfade` | 277 | 0,3 | gemischt | ja | ersetzen durch Test — Probe unit-fähig; Import-/Regex-Prüfungen ≈ 50 % | – |
| 102 | `check-f45-b2b3e2-formular` | 326 | 0,4 | gemischt | ja | ersetzen durch Test — Zwillings-Fall-Tabelle als Test; Codeform ≈ 30 % | – |
| 103 | `check-f45-b2b4a1-sichern` | 400 | 11,1 | Verhalten | ja | behalten — echte Git-/Worktree-Route mit 400/403/404/409 | – |
| 104 | `check-f45-b2b4a2a-blockform` | 298 | 5,1 | Verhalten | ja | behalten — echte PowerShell-Probe „Ordner fehlt ⇒ kein git“ | – |
| 105 | `check-f45-b2b4a2b1-regeln` | 378 | 2,0 | Verhalten | nein | ersetzen durch Test — reine Funktionen aus code-daten.js | – |
| 106 | `check-f45-b2b4a2b2-anzeige` | 562 | 1,9 | gemischt | ja | ersetzen durch Test — Render-Logik testbar; Aufrufstellen-Regex ≈ 40 % | – |
| 107 | `check-f45-b2b4b-jarvis` | 283 | 0,7 | gemischt | ja | ersetzen durch Test — D13-202/409 als Handlertest; Quelltext-Fenster ≈ 40 % | – |
| 108 | `check-f45-fb1-faehigkeit-vorschlag` | 363 | 5,2 | Verhalten | ja | ersetzen durch Test — (e) doppelt zu vorschlag.test.ts; (p)/(r) als Handlertest | – |
| 109 | `check-f45-fb1b-faehigkeit-uebernehmen` | 465 | 36,8 | Verhalten | ja | behalten — schreibende Route: CSRF, Rücknahme, lokale Datei bitgleich | – |
| 110 | `check-f45-fb2-faehigkeit-anzeige` | 445 | 1,4 | gemischt | ja | ersetzen durch Test — Render testbar; Klickweg-Quelltext ≈ 30 % und (h) doppelt | – |
| 111 | `check-f45-b5a1-akte` | 269 | 0,5 | Verhalten | ja | behalten — schreibende Akte-Route mit Sperre, CSRF, Bytegleichheit | – |
| 112 | `check-f45-b5a2-akte-anzeige` | 249 | 0,2 | gemischt | nein | ersetzen durch Test — reine Module testbar; statische Verdrahtung ≈ 45 % | – |
| 113 | `check-f45-b5b1a-planung` | 302 | 1,1 | Verhalten | ja | behalten — prüft echte Planungsdaten (i)/(j); (k) streichen | – |
| 114 | `check-f45-b5b1b1-planung-schreiben` | 437 | 0,7 | Verhalten | ja | behalten — schreibende Planungsroute mit Rückbau, CSRF, Host | – |
| 115 | `check-f45-b5b1b2-bereinigung` | 547 | 2,4 | Verhalten | ja | behalten — schreibt roadmap/STATUS.md; Rückbau und Gate-Folge | – |
| 116 | `check-f813-csrf` | 326 | 3,4 | Sicherheit | ja | behalten — CSRF (Sicherheit) | – |
| 117 | `check-f814-host` | 307 | 4,9 | Sicherheit | ja | behalten — Host-Prüfung (Sicherheit) | – |
| 118 | `check-fixpaket-f36-nachlauf` | 415 | 8,4 | Verhalten | ja | behalten — Sichtungs-Freigabe nach VERWEIGERT mit Bypass-Sperre | Frist ≤ 10 s auf Server-/Workflow-Zustand, Repo-Wurzel kontrollzustand-test-* (seriell) |
| 119 | `check-f43-projekt-aufrufen` | 554 | 17,1 | Verhalten | ja | behalten — echter Prozessstart, Zeitgrenze, Baum-Kill, Vorschau | Zeitgrenze (seriell) |
| 120 | `check-wachstumsbremse-server` | 229 | 0,8 | Invariante | ja | behalten — senkbare Ratsche für Server-Zeilen und Routen | – |
| 121 | `check-f45-k-kontext` | 297 | 2,0 | Invariante | nein | behalten — Deckel und Verweise der Architektur-Doku | Repo-Baum (seriell) |
| 122 | `check-secrets` | 27 | 0,1 | Sicherheit | nein | behalten — Secret-Scan (Sicherheit) | Repo-Baum (seriell) |
