# F43 — Projekt aufrufen/anzeigen

## ID
F43

## Titel
Projekt aufrufen/anzeigen (E-F30-3, `docs/projekt/zielfassung.md` E-M5-16),
Variante A (Entscheidung Stefan, 30.09.2026)

## Status
Status: ABGESCHLOSSEN

WS-1 gebaut 30.09.2026, gemergt als #287. Reviewer-/QA-Pass siehe
Abschnitt „Review-Pass“. Abnahme durch Stefan am 30.09.2026, siehe
Abschnitt „Abnahme 30.09.2026“.

## Ziel
Die Workforce ruft ein eigenständiges Projekt auf und zeigt es an, ohne
dass es Teil des Kerns wird — lose Kopplung, kein Prozess-Lebenszyklus.
Erster Verbraucher ist der Opportunity Scanner aus F30; jedes über F41/F42
angelegte Repo kann es nutzen.

- **Anzeigen:** Die Projekte-Übersicht zeigt je Projekt die `vorschau_url`
  aus dem Projektregister mit „Öffnen“ (neuer Tab) und dem Status
  „erreichbar / nicht erreichbar“. Der Server fragt nur die bereits
  validierten `http://localhost:<port>`- bzw. `http://127.0.0.1:<port>`-URLs
  an, Zeitgrenze 2 s, ohne Weiterleitungen zu folgen.
- **Aufrufen:** Drei optionale Felder der Projekt-Startvorlage —
  `startbefehl` (argv, Regeln wie `pruefbefehl`), `startZeitgrenzeMs`
  (1 … 240000, Standard 60000) und `ergebnis_datei` (repo-relativ, Regeln
  wie `pruefketten_pfade`, zusätzlich ohne `*`). Der Knopf „Aufrufen“ führt
  den `startbefehl` einmal in der Repo-Wurzel aus und zeigt Exit-Code,
  Dauer, gekürzte stdout/stderr und den Inhalt von `ergebnis_datei`
  read-only.

Umsetzung: `src/projekt-aufruf/` (Ausführung und Vorschau, nutzt
`starteProzess` und die Helfer von `src/pruefschritt/`),
`src/startvorlage/` (Felder, Validator), `GET/POST /api/projekt-aufruf` in
`scripts/leitstand-server.mjs` (je Projekt über
`/api/projekte/<id>/projekt-aufruf`), Anzeige
`public/leitstand/projekt-aufruf-anzeige.js` +
`public/leitstand/views/projekte-uebersicht.js`.

## Nicht-Ziele
- **Kein Start/Stopp dauerlaufender Prozesse (Variante B).** Ein Aufruf
  endet spätestens an seiner Zeitgrenze; danach wird der Prozessbaum
  beendet. Variante B geht ins V1-Backlog, Auslöser: „F30 belegt, dass der
  Scanner einen Dauerprozess braucht“.
- Kein automatischer Aufruf — nur auf Klick des Menschen.
- Kein Kernartefakt für das Aufrufergebnis (kein neues Schema); das
  Ergebnis bleibt flüchtig im Speicher der Serverinstanz.
- Kein HTML-Rendern von Projektinhalt; keine Vorschau im Leitstand selbst
  (nur Link in neuem Tab).
- Kein Eintragen von `vorschau_url`/`startbefehl` über die Oberfläche —
  die Hinweise nennen Feld und Ort.
- Keine Änderung an `docs/projekt/zielfassung.md` (kein Gate verlangt sie).

## Akzeptanzkriterien
Zugangsweg je AK in Klammern.

- **AK1** (Oberfläche) Die Projekte-Übersicht zeigt je Projekt die
  `vorschau_url`, „erreichbar“/„nicht erreichbar“ mit Grund und „Öffnen“
  (neuer Tab, `rel="noopener noreferrer"`). Beleg: Render-Nachweis 01.
- **AK2** (API) `GET /api/projekte/<id>/projekt-aufruf` prüft die URL mit
  Zeitgrenze 2 s; geschlossener Port und ausbleibende Antwort → nicht
  erreichbar; eine nicht-lokale URL wird nicht angefragt. Beleg: Gate (e).
- **AK3** (Oberfläche) Fehlt `vorschau_url` bzw. `startbefehl`, nennt die
  Karte Feld, Ort und „Leitstand neu starten“. Beleg: Gate (d)/(e),
  Render-Nachweis 01 (f43-leer).
- **AK4** (API) Die Startvorlage ohne die neuen Felder bleibt bitgenau
  gültig; `startbefehl` leer/kein Array/`.cmd`/`.bat`/`.com`/`.ps1`,
  `startZeitgrenzeMs` außerhalb 1 … 240000, `ergebnis_datei` mit `..`,
  absolut, Backslash, `*`/`?`/`[]`/`{}` oder leer werden abgewiesen. Beleg: Gate (a).
- **AK5** (Oberfläche + API) „Aufrufen“ → `POST
  /api/projekte/<id>/projekt-aufruf` führt den `startbefehl` einmal aus
  (cwd Repo-Wurzel, argv ohne Shell) und zeigt Exit-Code, Dauer, stdout-
  und stderr-Ende und `ergebnis_datei` (.md/.json/.txt als Text bis 64 000 Bytes,
  sonst „vorhanden, n Bytes“; eine vor dem Aufruf unveränderte Datei ist
  markiert). Beleg: Gate (b)/(c), Render-Nachweis 02.
- **AK6** (API) Zeitgrenze überschritten → Ausgang ZEITGRENZE; der
  Prozessbaum wird an der Grenze über die PID beendet (`taskkill /T /F`),
  auch ein Enkel, der stdout erbt. Endet der Prozess auch 5 s danach nicht,
  wird der Aufruf trotzdem aufgelöst und „Ausgabe blieb offen“ gemeldet —
  die Sperre fällt immer. Beleg: Gate (b) (Kind + Enkel, Enkel mit
  geerbter Ausgabe, Starter ohne Prozessende), Render-Nachweis 03.
- **AK7** (API) Zweiter paralleler Aufruf → 409; aktiver Workforce-Lauf
  dieses Projekts → 409 (Lauf eines anderen Projekts sperrt nicht);
  während eines Aufrufs lehnt jeder Aufrufer von `pruefeGlobaleLaufSperre`
  in diesem Projekt mit 409 ab (Laufstart, Freigabe, Entscheidung, Abnahme,
  Chat, „Prüfung wiederholen“; im Default-Handler auch `POST
  /api/projekte`). Beleg: Gate (b) (Laufstart).
- **AK8** (API) Eine Anfrage fremder Seite wird vom bestehenden CSRF-Haken
  (F-813) mit 403 abgewiesen, nichts wird ausgeführt. Beleg: Gate (b),
  zusätzlich `check-f813-csrf.mjs` (3) leitet die neue Route ab.
- **AK9** (Oberfläche) HTML in stdout, stderr und `ergebnis_datei` wird
  escaped angezeigt, nie gerendert. Beleg: Gate (d), Render-Nachweis 02.
- **AK10** (Oberfläche) Der letzte Aufruf bleibt nach einem Neuladen der
  Seite sichtbar (Server hält ihn bis zum Neustart). Wird während eines
  Aufrufs neu geladen, zeigt die Karte „Läuft…“ und danach ohne weiteren
  Klick das Ergebnis (Nachladen alle 3 s, solange der Server „aktiv“
  meldet). Beleg: Render-Nachweis 04, 05 und 06.
- **AK12** (Oberfläche) Die Karte zeigt das argv als Liste (Argumentgrenzen
  erkennbar), mit „Stand beim Serverstart“ und dem Pfad der tatsächlich
  geladenen Startvorlage; der Hinweis ohne `startbefehl` nennt diesen
  Pfad. Beleg: Gate (d), Render-Nachweis 01.
- **AK13** (Oberfläche) Mobile Darstellung (400 px Breite): lange argv und
  Ausgaben umbrechen bzw. scrollen im Block, die Karte bleibt heil. Beleg:
  Render-Nachweis `mobil/`.
- **AK11** (API) Regel 1j meldet eine Lauf-Änderung an der im Repo
  liegenden Startvorlage (damit an `startbefehl`). Beleg: Gate (f) als
  Quelltext-Vertrag, Verhalten `check-fixpaket-f30-vorbedingungen.mjs` (m).

## Dependencies
- F25 (Projektregister, Multi-Projekt-Dispatcher), F36 WS-5a
  (`vorschau_url`, E-F36-7), F-652 (Prüfschritt, `starteProzess`),
  F-735 (Regel 1j, Startvorlage in der Prüfkette), F-813/F-814 (CSRF-/Host-
  Schutz).
- Verbraucher: F30 (Opportunity Scanner).

## Security/Permissions
- Ausgeführt wird nur der `startbefehl` der beim Serverstart geladenen
  Startvorlage — nie ein Wert aus der Anfrage. Ändert ein Lauf die
  Startvorlage, wirkt das erst nach einem Neustart, und Regel 1j meldet es
  (Startvorlage im Repo gehört zur Prüfkette, F-735; Grenze F-848). Die
  Karte zeigt das argv vor dem Klick.
- argv ohne Shell: `starteProzess` mit `pruefeStartziel` (absoluter Pfad,
  keine `.cmd/.bat/.com/.ps1`, keine Shell-Basisnamen, existierende Datei);
  derselbe Endungscheck greift schon beim Laden der Vorlage (F-280, F-846).
- Kindprozess ohne `LEITSTAND_*`-Variablen, stdin geschlossen, Zeitgrenze
  immer gesetzt (Standard 60 s, Obergrenze 240 s — mit Nachfrist unter dem
  Antwort-Zeitlimit gängiger Browser, weil der Aufruf synchron läuft).
- `ergebnis_datei`: Formregel beim Laden; zur Laufzeit muss der reale Pfad
  (nach Auflösung von Symlinks/Junctions) in der Repo-Wurzel liegen, sonst
  wird nicht gelesen; Lesen begrenzt auf 64 000 Bytes. Das ist ein Schutz
  gegen versehentliches Herauszeigen, **keine Sicherheitsgrenze**: einen
  Hardlink erkennt die Prüfung nicht, und zwischen Prüfung und Öffnen
  bleibt ein TOCTOU-Fenster. Der `startbefehl` ist ohnehin Projektcode und
  kann jede lesbare Datei nach stdout schreiben, das ebenfalls angezeigt
  wird.
- Vorschau: nur `http://localhost|127.0.0.1:<port>` ohne Pfad, keine
  Weiterleitung, Zeitgrenze 2 s.
- POST unterliegt dem zentralen Host- (F-814) und CSRF-Haken (F-813).
- Anzeige: jeder Projekttext über `escapeHtml` in `<pre>`.

## State/Persistenz
Flüchtig: `letzterAufruf` und `aufrufAktiv` je Projekt-Instanz im
Speicher. Begründung: ein Aufruf ist kein Workforce-Lauf, trägt keine
lauf_id und liefert nichts, was Zustand, Freigabe oder Qualitätsdaten
verbrauchen (ARCHITECTURE.md §4); die dauerhafte Spur ist `ergebnis_datei`
im Projekt-Repo. Ein Kernartefakt bräuchte ein neues Schema
(Architekturfrage, nicht Teil von Variante A).

## Bekannte Grenzen
- Der Baum-Kill an der Zeitgrenze ist mit Node als `startbefehl[0]`
  belegt (Kind, Enkel, Enkel mit geerbter Ausgabe). Für andere Programme
  gilt: `taskkill /T` erreicht nur Prozesse, deren Elternkette zur noch
  lebenden Start-PID führt. Ein *detacht* gestarteter oder ein nach dem
  Ende des direkten Kindes verwaister Enkel überlebt (F-181); die harte
  Nachfrist gibt dann nur die Sperre frei und meldet „Ausgabe blieb
  offen“.
- `taskkill /T /F` selbst braucht real etwa 2 s: ein Aufruf mit 2000 ms
  Grenze endet nach rund 3,9 s (Render-Nachweis 03).
- Wird der Leitstand während eines Aufrufs beendet, laufen dessen
  Prozesse unter Windows weiter, bis sie selbst enden.
- `ergebnis_datei` im Repo macht den Arbeitsbaum unsauber, wenn sie nicht
  gitignoriert ist — die nächste schreibende Ausführung blockiert dann
  (F-847). Die Oberfläche weist darauf nicht hin.
- `vorschau_url` auf dem Leitstand-Port: seit F-849 (Challenger-Einstufung
  P2, behoben, PR folgt) zeigt die Projektkarte „nicht zulässig
  (Leitstand-Port)“ mit Abhilfe, ohne Anfrage und ohne „Öffnen“;
  `{projekt_origins}` bleibt dafür unaufgelöst. Render-Nachweis
  `features/F43/nachweis-f849/`. Grenze: verglichen wird nur mit dem Port
  der eigenen Instanz; eine zweite, parallel laufende Leitstand-Instanz ist
  nicht erfasst (F-855).
- Ein registriertes Projekt mit ungültiger Startvorlage (z. B.
  `startbefehl` mit `.cmd`) fehlt nach dem Serverstart; die Karte meldet
  „beim Serverstart nicht initialisiert“, den Grund nennt nur die Konsole
  (F-850).
- Der Aufruf läuft synchron in der Anfrage; die Oberfläche zeigt „Läuft…“
  bis zum Ende (höchstens Zeitgrenze + 5 s Nachfrist).
- Endet das direkte Kind regulär, während ein Enkel die Ausgabe hält, wird
  an der Zeitgrenze bewusst nicht mehr gekillt (die PID ist frei und könnte
  einem fremden Prozess gehören); die Nachfrist löst dann auf, der Enkel
  läuft weiter. Nach der Nachfrist bleibt der Prozess-Handle im Speicher,
  bis der Enkel endet (Konsole meldet das).
- Die Nachfrist (5 s) läuft ab der Grenze, `taskkill` braucht davon ~2 s;
  unter hoher Last kann ein tatsächlich beendeter Baum als „Ausgabe blieb
  offen“ gemeldet werden.
- Baum-Kill an der Zeitgrenze nur unter Windows (`taskkill /T`); auf
  anderen Plattformen wird nur das direkte Kind beendet, Enkelprozesse
  können weiterlaufen (F-852). Das Gate sichert den Baum-Kill deshalb nur
  unter win32 zu und gibt die Weiche sichtbar aus; sonst prüft es Ende
  binnen Zeitgrenze + Nachfrist, direktes Kind beendet, Sperre gefallen,
  Ausgang ZEITGRENZE, und räumt überlebende Enkel selbst ab (Gate (b)/(g),
  Challenger-Befund CI ubuntu-latest, 30.09.2026).

## Nachweis
- Gate `scripts/check-f43-projekt-aufrufen.mjs` (in `npm run check`),
  Rot-Kalibrierung: Escaping entfernt bzw. Parallelsperre entfernt → 3
  Befunde.
- Realer Durchlauf + Render-Nachweis `features/F43/nachweis-ws1/`
  (`erzeuge-nachweis.mjs`, `klickfolge.json`, `protokoll.md`, 01–06;
  `klickfolge-mobil.json` → `mobil/`):
  drei Wegwerf-Testprojekte, echter Registerlader und Dispatcher, echte
  Node-Prozesse als `startbefehl`, echter Vorschau-Server bzw.
  geschlossener Port.

## Review-Pass
Erster Pass 30.09.2026 (code-reviewer + qa, frischer Kontext): beide „Nicht freigegeben“. Behoben im Korrekturgang: Review P1 (Aufruf konnte bei offener Ausgabe ewig hängen und das Projekt sperren → eigener Baum-Kill an der Zeitgrenze + harte Nachfrist), QA F1 (Hinweis nennt die tatsächlich geladene Startvorlage), QA F2/Review P3 („Läuft…“ nach Neuladen → Nachladen solange aktiv), QA F3 (Klartext statt „Unbekanntes Projekt“; Server-Teil F-850), QA F4 (Obergrenze 240 s), QA F6 (Gate-Fälle ergänzt), QA F7/Review P3 (argv als Liste, Stand Serverstart), QA F9/Review P4 (64 000 Bytes, UTF-8-Grenze, `..`-Präfix, Meldung zu Muster-Zeichen, Umbruch, Mobil-Nachweis). Als Grenze/Finding: Review P3 Hardlink/TOCTOU (Security), QA F5 (F-849), QA F8 (F-847), QA F10 (Grenzen). Delta-Pass: siehe unten.

Delta-Pass 30.09.2026 (frischer Kontext): qa „Freigegeben mit Hinweisen“
(nur P4, in diesem Gang nachgezogen: AK10-Beleg, Nachweisliste,
Schema-Text, eine Nachlade-Kette je Projekt; F-849-Einstufung P3 bleibt
Entscheidung Stefans). code-reviewer „Nicht freigegeben“ wegen P2: der
Timer-Kill konnte nach regulärem Ende des Kindes eine freie, womöglich neu
vergebene PID treffen. Behoben über `StarterOptionen.beiExit` (PID wird
beim `exit` verworfen), Gate-Fall mit Gegenprobe und Rot-Kalibrierung;
im selben Gang: Log nach der Nachfrist, `process.kill`-Rückfall nach
`taskkill`, 409-Text bleibt beim Nachladen stehen, JSDoc und Grenzen
nachgezogen. Abschluss-Review des P2-Fixes (frischer Kontext): „Freigegeben
mit Hinweisen“; P4 nachgezogen (Rest-Risiko taskkill-Fenster im Kopf von
`src/projekt-aufruf/index.ts`, präziser Text bei regulär beendetem Kind,
Gate-Kommentar); das gleiche PID-Muster in `prozessstart.ts` als F-851.

## Abnahme 30.09.2026
Abnahme durch Stefan am 30.09.2026, 15:01, real im Leitstand am Projekt
`haushaltsbuch2`:
- **Vorschau:** bei gestoppter App „nicht erreichbar (ECONNREFUSED)“, bei
  laufender App (`npm run dev`, Port 3000) „erreichbar, HTTP 200“;
  „Öffnen“ zeigt die App.
- **Aufruf:** `startbefehl` `["…node.exe","--version"]` → Exit 0,
  101 ms, stdout „v24.16.0“. Der Befehl ist vor dem Klick sichtbar, mit dem
  Hinweis „Stand beim Serverstart“.
- Dabei gesehen, nicht Teil von F43: Workboard-Kachel „Roadmap“ meldet bei
  `haushaltsbuch2` „Roadmap konnte nicht geladen werden“ (F-854).
