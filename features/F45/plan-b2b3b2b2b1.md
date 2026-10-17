# Plan v1 — F45 B2b-3b-2b-2b-1 „Rückfrage-Kanal: Vorbereitung echter Nachweislauf“

Stand 17.10.2026, Branch `f45/b2b3b2b2b1-nachweis-vorbereitung`, Basis main nach #359 (2a-3). Reihenfolge F-1124: Plan → Advisor-Pass →
Code → code-reviewer, qa (design-guardian nur für Punkt 1).

## Briefing
1. **Ziel:** Stefan fährt nach Anleitung einen echten Lauf mit `LEITSTAND_RUECKFRAGE=1` in einem Projekt; ein lesendes Werkzeug wertet
   ihn je Prüfpunkt aus (erfüllt / nicht erfüllt / nicht belegbar, mit Fundstelle). Dazu E-R3-Sichtung = B und die Kanal-Argv in der
   Startfreigabe-Anleitung. Kein Umschalten auf Standard „an“ (2b-2b-2), kein echter Lauf in dieser Iteration.
2. **Referenz:** F-1126 (5)(6), F-1128 (4), F-1132 (2)(6)(9), F-1133, F-1135 (7); ARCHITECTURE §3/§4; Spike `features/F45/nachweise/b2b3a/`;
   `docs/harness/startfreigabe-erneuern.md`; Sichtung `public/leitstand/views/workflow-eingriffe.js` (`renderSichtungDialog`),
   `views/workflows.js` (Kennzeichen :825, Aktion `sichtung` :1333), R3-Meldung `rueckfrage-abnahme.js` (`renderRueckfrageAbweichung`).
3. **Module:** s. §1–§4. Daten: Laufakte `laufakte-<laufId>` (Lineage, `rohstrom_referenz` mit Hash), Rohstrom
   `kontrollzustand-roh/<laufId>/rohstrom.json` relativ zur Installationswurzel (F-683), Protokoll `rueckfragen-<laufId>` (Versionen, nur
   Zuwachs), Terminalmarke (Checkpoint-Kette `<laufId>`, `daten.rueckfrage_*`) — alle im Kontrollzustand der Instanz des Projekts.
4. **Zustände:** Sichtung ohne Kanal / Kanal ohne R3 (unverändert) / R3 Schritt 1 / R3 Schritt 2; Werkzeug: Lauf fehlt, Lauf nicht
   terminal, Rohstrom fehlt oder Hash weicht ab, kein Protokoll, keine Prozesszeile, Formfehler.
5. **Akzeptanzkriterien:** AK1–AK6 unten.
6. **Risiken:** R-a Argv/mcp-config ist nicht persistiert (Rohstrom trägt nur `werkzeugStartziel`) ⇒ env/timeout/url nur über eine
   Momentaufnahme der Prozess-Befehlszeile belegbar (O1); R-b Token steht in dieser Befehlszeile (O2); R-c Windows-Quoting der
   Befehlszeile (Parser); R-d `[hidden]`-Fallen beim Dialogwechsel (F-622) ⇒ kein `hidden`, sondern Einsetzen in einen Container.

## §1 E-R3-Sichtung = B (Stefan 17.10.2026, F-1135 (7))
- `renderSichtungDialog(workflowId, sichtung)`: hat `sichtung.kanal?.abweichung` einen nicht leeren Text ⇒ Schritt 1: Folge-Satz,
  Pflichtbegründung wie bisher, darunter Hinweis „Für diesen Lauf liegt eine Protokoll-Abweichung vor …“ und statt „Sichtung bestätigt –
  weiter“ der Knopf „Protokoll-Abweichung ansehen“ (`data-aktion="sichtung-r3"`), dazu leerer Container `#wf-sichtung-r3`.
- Klick ⇒ `views/workflows.js` setzt `renderSichtungR3Schritt(workflowId, abweichung)` in den Container (bestehende
  `renderRueckfrageAbweichung` — Text escaped, täuschende Zeichen maskiert) mit dem Knopf „Abweichung gesehen – Sichtung bestätigt –
  weiter“ (`data-aktion="sichtung"`, derselbe Schreibweg `bestaetigeSichtung`), entfernt den Schritt-1-Knopf, Fokus auf die Meldung. Die
  Begründung bleibt stehen (kein Neuaufbau des Dialogs).
- Ohne R3 (kein Kanal, Kanal ohne `abweichung`): HTML bitgleich zum Bestand (Unit-Test gegen den Bestand-Wortlaut, Gate (a)).
- Kennzeichen (`workflows.js:825`) nimmt zusätzlich `abweichung !== null` auf — kommt R3 nach dem Öffnen dazu, baut sich der Dialog neu
  (sonst stünde ein Ein-Klick-Dialog offen).
- Durchsetzung DEKLARIERT: Bedien-Hürde in der Oberfläche; der Server prüft den zweiten Schritt nicht (Server netto ≤ 0, und jeder lokale
  Prozess kann die Route ohnehin aufrufen, §3).
- i18n de/en/tr/ru: `eingriff.sichtung.r3.hinweis`, `.ansehen`, `.bestaetigen`, `.schritt` (Überschrift Schritt 2).
- Render-Nachweis über die neutrale Testinstanz von 2a-3 (`features/F45/nachweise/b2b3b2b2a3/instanz.mjs`, Lauf `lauf-kanal-r3`):
  b1 Dialog ohne R3, b2 R3 Schritt 1, b3 R3 Schritt 2 (Klicktabelle), de 1440 dunkel/hell, de 390, tr/ru 390.

## §2 Auswertungswerkzeug `scripts/leitstand/nachweis-rueckfrage-auswerten.mjs` (+ Test)
Aufruf: `node scripts/leitstand/nachweis-rueckfrage-auswerten.mjs --lauf <laufId> [--projekt <id>] [--prozesszeile <json>] [--aus <md>]`.
- `--projekt` (Standard `ai-workforce`): Registereintrag aus `projekte.json` + `projekte.lokal.json` (`ladeProjektregisterMitLokal`,
  `loeseProjektPfade`) ⇒ Kontrollzustand der Instanz und erwarteter url-Pfad (`/api` für die Workforce-Instanz, sonst
  `/api/projekte/<id>`); Installationswurzel = cwd (Rohstrom, F-683).
- Aufbau: `leseNachweisDaten` (nur lesen: `ladeArtefaktVersion`, `listeVersionen`, `ladeGueltigeCheckpoints`, `stelleLaufstatusFest`,
  `readFileSync`) ⇒ reine `werteNachweisAus(daten)` ⇒ `alsMarkdown(bericht)`. Schreiben nur `--aus` (Markdown), abgelehnt, wenn das Ziel
  unter dem Kontrollzustand oder `kontrollzustand-roh` liegt; ohne `--aus` auf stdout.
- Rohstrom nur mit passendem Hash (`rohstrom_referenz.inhalts_hash`), sonst alle Rohstrom-Punkte „nicht belegbar (Hash)“.
- Prüfpunkte (je Ergebnis + Fundstelle „Rohstrom Z<n>“, „Protokoll Eintrag <i>“, „Terminalmarke daten.<feld>“, „Prozesszeile“):
  - **P1 F-1128 (4) Eingabe:** je `permission_denials[i]` mit Protokolleintrag gleicher ID: `sha256(kanonischesJson(tool_input ?? null))`
    = `input_hash`. erfüllt ⇔ ≥ 1 Paar und alle gleich.
  - **P2 F-1128 (4) doppelte IDs** in `permission_denials` (Liste der IDs). erfüllt ⇔ keine.
  - **P3 F-1128 (4) `--resume`:** Zahl der init-Zeilen, `session_id`, `--resume` in der Prozesszeile. Ohne Resume ⇒ nicht belegbar mit
    Grund „Lauf ohne --resume (die Workforce ruft die CLI nie mit --resume auf; vorgaengerLaufId ist ein neuer Lauf)“.
  - **P4 O6 Ablehnungstext:** je `stefan_abgelehnt` mit ID: jedes tool_result dieser ID `is_error` und `content` als String mit
    `sha256 = ablehnung_hash`. **P4b** dasselbe für Zeilen mit `parent_tool_use_id` (Subagent) — ohne solche Zeile nicht belegbar
    („Werkzeugsatz ohne Agent-Werkzeug“ als Hinweis).
  - **P5 F-1126 (6) unbekannte Bash-Felder:** auto_deny-Gründe gezählt (Gruppen nach Text vor dem ersten „:“). erfüllt ⇔ kein Grund
    „unbekanntes Eingabefeld“ und ≥ 1 Bash-Anfrage ging an Stefan; nicht erfüllt nennt die Felder.
  - **P6 F-1132 (2) API-Basis:** (a) Prozesszeile: url des Servers `rueckfrage` = Loopback-http mit erwartetem Pfad; (b) indirekt:
    Protokoll mit ≥ 1 Eintrag im Kontrollzustand dieser Instanz (das MCP-Skript erreichte mit dem Lauf-Token genau diese Instanz).
  - **P7 F-1132 (9) init:** `mcp_servers` enthält `{ name: 'rueckfrage', status: 'connected' }`, `tools` enthält `FRAGE_WERKZEUG`, nicht
    `RECHTE_WERKZEUG`.
  - **P8 mcp-config env/timeout (Prozesszeile):** Server `rueckfrage` = `{ command, args: [<Installation>/scripts/leitstand/rueckfrage-mcp.mjs],
    env: genau URL/TOKEN/FRIST_MS, timeout }`, Token 64 Hex (nie ausgegeben), `FRIST_MS = String(W + SKRIPT_FRIST_ZUSATZ_MS)`,
    `timeout = W + CLI_TIMEOUT_ZUSATZ_MS`, W = `WARTE_GRENZE_MS`; dazu `--permission-prompt-tool RECHTE_WERKZEUG`, `--strict-mcp-config`,
    `FRAGE_WERKZEUG` in `--allowedTools`. Ohne Prozesszeile nicht belegbar.
  - **P9 F-1132 (6) Zählung Ende zu Ende:** `daten.rueckfrage_zaehlung` der Terminalmarke = Zählung aus der Protokoll-Datei mit derselben
    Regel wie die Vermittlung (`zaehleProtokollEintraege`, aus `zaehlungVon` herausgelöst, exportiert; offen 0, ohne Eintrag 0). Abweichung
    nur in `automatisch` (Marke größer) ⇒ nicht erfüllt mit Hinweis „Ablehnungen über der Protokollgrenze ohne Eintrag?“.
  - Kopf (kein Prüfpunkt): Projekt, Lauf, Status/Ergebnis, `rueckfrage_abgleich`, `rueckfrage_abweichung`, `abgelehnt_durch_stefan`,
    Rohstrom-Hash ok, Protokoll zusammensetzbar.
- Ausgabe: Markdown; Pfade neutralisiert (`neutralisiereText`: Installation, Temp, Home), Texte maskiert (`maskiereGeheimnisse`),
  Steuerzeichen als `⟦U+XXXX⟧`; Token nie. Exit 0 bei vollständiger Auswertung (auch mit „nicht erfüllt“), Exit 1 bei Aufruf-/Lesefehler.
- Prozesszeile (O1): JSON aus `Get-CimInstance Win32_Process` (`ProcessId`, `Name`, `CommandLine`; Objekt oder Liste). Parser nach den
  Regeln von `CommandLineToArgvW` (2n Backslashes, `\"`, `""` in Anführung), nimmt die Zeile mit `--permission-prompt-tool`.

## §3 Anleitung `docs/harness/rueckfrage-nachweislauf.md`
Für Stefan, PowerShell, je Schritt ein vollständiger Block, Blöcke beginnen mit `Set-Location '<voller Pfad>'`:
0. Vorbedingung: Startfreigabe gültig (kein Band „CLI-Version geändert“), Projekt (z. B. `haushaltsbuch`, nicht die Workforce-Instanz)
   mit Startfreigabe, sauberer Arbeitsbaum, kein aktiver Lauf.
1. Leitstand mit `$env:LEITSTAND_RUECKFRAGE = '1'; npm run leitstand`; Konsole zeigt „Rückfrage-Kanal: an“, Band im Leitstand.
2. Im Projekt Auftrag anlegen (Titel, Ergebnis wörtlich aus der Anleitung; Kontrolltiefe Fast-Lane empfohlen — nur Ausführung), Ablauf
   vorbereiten, prüfen, freigeben. Auftrag provoziert nacheinander (a) Bash `node -e …` (einmal erlauben), (b) zweiter Bash `node -e …`
   (ablehnen), (c) Write auf einen absoluten Pfad im Temp-Ordner (auto_deny), (d) `frage_stefan` mit Optionen.
3. Während (a) wartet: Prozesszeile sichern (Block mit `Get-CimInstance`, Datei im Temp-Ordner) — dann „Einmal erlauben“.
4. (b) „Ablehnen“, (d) Option wählen; was Stefan sieht (Karten, Band, Zahl, Restzeit, „Zuletzt entschieden“).
5. Erwartetes Ende: VERWEIGERT (Grund automatisch wegen (c)), F-760-Sichtung, Block „Rückfrage-Kanal im Lauf“; Ablauf stoppen oder
   Sichtung bestätigen (ohne R3 ein Klick).
6. Auswertung: Werkzeug mit `--lauf`, `--projekt`, `--prozesszeile`, `--aus features/F45/nachweise/b2b3b2b2b/auswertung-<projekt>.md`;
   danach Prozesszeilen-Datei löschen (`Remove-Item`).
7. Rückmeldung: Auswertungsdatei, laufId, was im Leitstand anders war als beschrieben, ob die Karte erschien (F-1133 (1)).
- Optional: Wiederholung mit der Workforce-Instanz (url `/api`). F-1126 (5): Katalog-Kollision braucht einen Katalog-Eintrag mit id
  `rueckfrage` (Repo-Änderung + Freigabe), Fortsetzung ohne url ist im Produkt nicht erreichbar (`rueckfrageOptionFuer`) ⇒ „nicht belegt“
  (Gate-Belege genannt).

## §4 `docs/harness/startfreigabe-erneuern.md`
Neuer Abschnitt „Mit Rückfrage-Kanal (ab 2b-2b-2)“: Argv-Teile (`--permission-prompt-tool mcp__rueckfrage__rechte_pruefen`,
`--strict-mcp-config --mcp-config` mit Server `rueckfrage` = `{ command: <node>, args: [<Installation>\scripts\leitstand\rueckfrage-mcp.mjs],
env: { WORKFORCE_RUECKFRAGE_URL, …_TOKEN, …_FRIST_MS }, timeout }`, `mcp__rueckfrage__frage_stefan` in `--allowedTools`); Gültigkeitsschlüssel
unberührt (Spike Frage 6); nach einem CLI-Update zusätzlich den Nachweislauf (§3) wiederholen — das Flag steht nicht in `claude --help`;
Soll: alle Prüfpunkte wie im letzten Nachweis; `$BELEG` um die Auswertungsdatei ergänzen. Bis 2b-2b-2 nur vorbereitend (Kanal Opt-in).

## Gate `scripts/check-f45-b2b3b2b2b1-nachweis.mjs` (in `package.json`)
- (a) Sichtung: ohne Kanal / Kanal ohne R3 bitgleich zum Bestand; mit R3 kein `data-aktion="sichtung"` in Schritt 1, `sichtung-r3`
  vorhanden; Schritt 2 mit escaptem, maskiertem R3-Text (`<img>`, U+202E) und `data-aktion="sichtung"`; Kennzeichen mit `abweichung`.
- (b) Werkzeug an einer Fixture (Temp-Kontrollzustand, Laufakte über `registriereKernArtefakt`, Rohstrom mit Hash, Protokoll über
  `erzeugeRueckfrageProtokollSchreiber`, Terminalmarke mit `run_prepared`): grün alle P erfüllt; rot je P ein Fall (Eingabe abweichend,
  doppelte ID, Ablehnungstext anders, unbekanntes Feld, falsche url, falscher timeout, Zählung abweichend); ohne Prozesszeile P6a/P8
  nicht belegbar; Rohstrom-Hash falsch ⇒ Rohstrom-Punkte nicht belegbar.
- (c) nur lesend: Schnappschuss (Pfade + Hash) von Kontrollzustand und Rohstrom-Ordner vor/nach gleich; `--aus` in den Kontrollzustand
  abgelehnt.
- (d) Token (zur Laufzeit zusammengesetzt, F-1134) steht nie in der Ausgabe.
- (e) Doku: Anleitung und Startfreigabe-Abschnitt tragen Werkzeugname, `LEITSTAND_RUECKFRAGE`, `--permission-prompt-tool`.
Rot-Nachweis: `git archive main` in den Scratchpad, Gate hineinkopiert (F-1127).

## Invarianten
Server unverändert (0 Zeilen; Grenze 13.416), `starteWorkflowSchritt(` 6×, `scripts/_rueckfrage-aus-pruefung.mjs` unverändert; ohne
`LEITSTAND_RUECKFRAGE` Argv/Auftragstext/`daten` bitgleich (keine Änderung an Gateway, Controller, Evaluator); keine neuen Evaluator-Codes
(GRUND_SCHLUESSEL unberührt); keine neue Route.

## Akzeptanzkriterien
- AK1 Ohne R3 ist die Sichtung bitgleich; mit R3 braucht „weiter“ zwei Klicks, der zweite zeigt den R3-Text escaped (Test + Render).
- AK2 Werkzeug liefert je P1–P9 genau ein Ergebnis mit Fundstelle; nie „erfüllt“ ohne Beleg (fail closed ⇒ nicht belegbar).
- AK3 Werkzeug schreibt nichts im Kontrollzustand oder Rohstrom-Ordner; Token erscheint nie.
- AK4 Anleitung: jeder Schritt ein vollständiger PowerShell-Block, Erwartung je Schritt, Rückmeldung definiert.
- AK5 Startfreigabe-Anleitung nennt die Kanal-Argv.
- AK6 Gate grün auf dem Branch, rot gegen main; lokale Tests (public/leitstand, betroffene Gates, i18n, lint) grün.

## Offene Punkte für den Advisor
- **O1** Prozesszeile als einzige Quelle für env/timeout/url — oder als „nicht belegbar“ stehen lassen und erst in 2b-2b-2 eine Ablage der
  (maskierten) mcp-config in der Laufakte bauen? (Letzteres änderte Gateway/Laufakte-Schema ⇒ außerhalb Scope.)
- **O2** Token in der Prozesszeilen-Datei: liegt im Temp-Ordner, Lauf-Token gilt nur bis Lauf-Ende, Anleitung löscht die Datei; das
  Werkzeug gibt ihn nie aus. Ausreichend?
- **O3** `zaehleProtokollEintraege` aus der Vermittlung herauslösen (eine Regel) statt im Werkzeug nachzubauen?
- **O4** Fast-Lane empfehlen (nur Ausführung) — oder Standard, damit Review/qa den Kanal-Lauf sehen?
- **O5** Erwartetes Ende VERWEIGERT (wegen (c)) — reicht das, oder braucht P9/ERFOLGREICH mit `abgelehnt_durch_stefan` einen zweiten,
  optionalen Lauf nur mit (b)?
