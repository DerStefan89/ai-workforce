# F25 WS-2a — Realer Nachweis (AK15)

Datum: 17.09.2026. Echter Leitstand-Serverprozess (`LEITSTAND_PROJEKTE_PFAD`
auf eine nicht committete lokale Registerkopie mit zwei Einträgen), echter
headless Chrome über das Chrome-DevTools-Protokoll (Wiederverwendung von
`starteChrome`/`beendeProzessUndWarte` aus
`scripts/check-f20-leitstand-shell.mjs` in einem einmaligen, nicht
committeten Treiberskript — kein Mock).

## Aufbau

- **ai-workforce** — Starteintrag, unverändert.
- **projekt-b** — Wiederverwendung des bereits real eingerichteten
  `f25-testprojekt-b` aus dem F25-WS-1-Realtest (AK8,
  `features/F25/nachweis-ws1.md`): eigenes Repo, eigene Mini-Baseline
  (`.claude/settings.json`, `state/aktuelle-autorisierung.json`), vier
  reale Läufe aus dem WS-1-Test bereits in dessen `kontrollzustand/`.

## Ablauf und Ergebnis

1. Server mit beiden Registereinträgen gestartet, `GET /api/projekte`
   real geprüft: liefert beide Einträge mit `laufAktiv:false`.
2. `#/projekte-uebersicht` im echten Browser geöffnet: beide Karten
   (AI Workforce, F25 Testprojekt B) sichtbar, je mit id/status und
   "kein aktiver Lauf"-Badge (AK12, Screenshot `1-uebersicht.png`).
3. Klick auf "Öffnen" der Projekt-B-Karte: Navigation zu `#/dashboard`,
   Kopfzeile zeigt "Aktives Projekt: F25 Testprojekt B" (AK13/AK14). Der
   Zustands-Poll (2-Sekunden-Takt) lieferte nach dem nächsten Tick real
   Projekt Bs eigene, kleine Zahlen (4 Läufe) statt ai-workforces echten
   89 — Screenshot `2-nach-wechsel-dashboard.png`.
4. `#/runs` aufgerufen: `GET /api/projekte/projekt-b/laeufe` liefert
   real die eigene, von ai-workforce getrennte Laufliste (4 Einträge aus
   dem WS-1-Test) — Screenshot `3-runs-projekt-b.png`.
5. Über "Projekt wechseln" zurück zur Übersicht, Klick auf "Öffnen" bei
   AI Workforce: Kopfzeile zeigt wieder "AI Workforce", `#/runs` zeigt
   nach dem nächsten Poll-Tick wieder die echten 89 Einträge von
   `GET /api/laeufe` (unpräfigiert) — Screenshot `4-runs-ai-workforce.png`.
   Kein Poll-Fehlerhinweis in beiden Richtungen.

## Realer Fund und Behebung (der eigentliche Wert dieses Realtests)

Der erste Testlauf (vor der Behebung) zeigte nach jedem Projektwechsel
"Aktualisierung fehlgeschlagen" im Shell-Header und veraltete
ai-workforce-Zahlen auf dem Dashboard für Projekt B. Ursache: AK10 baute
den Fetch-Präfix falsch zusammen.

`scripts/leitstand-server.mjs`s `erzeugeMultiProjektDispatcher` (F25 WS-1)
erwartet für ein präfigiertes Projekt `/api/projekte/<id>/<Rest-Pfad ohne
eigenes '/api'>` (Beleg: `features/F25/nachweis-ws1.md` — `GET
/api/projekte/projekt-b/laeufe`, nicht `.../api/laeufe`) — der Dispatcher
setzt selbst ein `/api` vor den Rest nach der id. `api.js`s erste Fassung
verkettete jedoch den vollen bisherigen `'/api/...'`-Pfad hinter den
Projekt-Präfix (`'/api/projekte/projekt-b' + '/api/laeufe'`), was
`/api/projekte/projekt-b/api/laeufe` ergab — der Dispatcher baute daraus
`/api/api/laeufe`, eine nicht existierende Route (404, kein JSON-Body,
`r.json()` wirft, vom Zustands-Poll als Fehlschlag gemeldet).

Kein bis dahin gelaufenes Gate hatte das gefangen, weil der isolierte
api.js-Unit-Test (`check-f25-projekte.mjs`, Abschnitt (6)) nur gegen seine
EIGENE (damals ebenfalls falsche) Erwartung prüfte, nicht gegen den echten
Dispatcher — real erst in diesem Browser-Realtest sichtbar geworden.

Behoben: `mitPraefix()` in `api.js` trägt jetzt nur noch Rest-Pfade ohne
eigenes `/api` (`/laeufe` statt `/api/laeufe`), Default-Präfix ist `/api`
(statt `''`) — für `ai-workforce` unverändertes Verhalten.
`projekt-kontext.js` setzte für den Rückwechsel zu `ai-workforce`
ursprünglich denselben, jetzt falschen Leerstring-Präfix (derselbe
Fehler in die andere Richtung) — ebenfalls auf `/api` korrigiert.

Zusätzlich zum Browser-Realtest kalibriert: `check-f25-projekte.mjs`
Abschnitt (7) baut jetzt einen ECHTEN `erzeugeMultiProjektDispatcher` und
ruft `api.js`s `holeLaeufe()` mit gesetztem Projekt-Präfix real dagegen
auf (Rot-Fall real reproduziert: die alte, doppelte `/api/api/...`-Form
lieferte dort real 404 statt einer Laufliste) — der reine (6)-Unit-Test
allein bleibt bewusst bestehen (schnell, ohne Server), gilt aber seither
nicht mehr als hinreichender Beleg für den Dispatcher-Kontrakt.

## Reviewer-/QA-Pass (frischer Kontext, F-046)

Reviewer freigegeben mit Hinweisen: (1) **hart, mechanisch** — jeder
Codekommentar zu WS-2a nutzte noch die ursprüngliche, nur für WS-2a
lokale Zählung AK1–AK7 statt der tatsächlichen, mit WS-1
zusammengeführten AK10–AK16 (identisch mit WS-1s eigenen AK1–AK9,
kollidierend) — durchgängig korrigiert (`api.js`, `projekt-kontext.js`,
`views/projekte-uebersicht.js`, `index.html`, `leitstand-server.mjs`,
alle vier Gate-Dateien, diese Datei). (2) `GET /api/projekte` ist über
einen Projekt-Präfix technisch erreichbar und liefert dort still eine
leere Liste statt 404 (`baueProjektHandlerMap` reicht `projekte` nicht an
Projekt-Instanzen durch) — ungefährlich (`holeProjekte()` ruft nie
präfigiert auf), jetzt in `scripts/leitstand-server.mjs` direkt am
Endpunkt dokumentiert. (3) `.badge` ohne Variantenklasse hatte keine
Hintergrundfarbe — neue `.badge.neutral` (bestehende Tokens
`--color-surface-muted`/`--color-text-muted` wiederverwendet, kein neues
Farbpaar) für "kein aktiver Lauf". (4) AK14 sprach von einem "Link", real
ist es ein `<button>` (Muster der übrigen Navigations-Bedienungen im
Leitstand, z. B. "Zum Workboard" in `views/capabilities.js`) —
Formulierung in `features/F25/feature.md` und den Codekommentaren
angepasst.

QA freigegeben mit Hinweisen, zwei echte Randfall-Befunde: (1) **hoch** —
der aktive Projekt-Kontext ging bei jedem Seiten-Reload kommentarlos auf
`ai-workforce` zurück (reine In-Memory-Modulvariable), während der
Hash erhalten blieb — ein Schreibvorgang (z. B. "Auftrag anlegen") direkt
nach einem unbeabsichtigten Reload wäre unbemerkt im falschen Projekt
gelandet. Behoben: `projekt-kontext.js` merkt sich das aktive Projekt in
`sessionStorage` (überlebt einen Reload, nicht aber ein neues Tab/Fenster
— ein alter Tab soll ein längst geschlossenes Fremdprojekt nicht dauerhaft
"merken") und stellt es beim Modul-Laden wieder her, bevor irgendeine View
initialisiert. (2) **mittel** — ein registrierter, aber handler-seitig
fehlgeschlagener Projekteintrag (bekannter WS-1-Fall: fehlende
Startvorlage) sieht in der Übersicht normal aus; nach der Auswahl liefert
der Dispatcher für jede Folgeanfrage 404, aber die meisten lesenden
`api.js`-Wrapper prüfen `r.ok` nicht und reichen den 404-Körper
unbemerkt als "gültiges" Datenaggregat weiter (stiller UI-Ausfall statt
einer sichtbaren Fehlermeldung) — zusätzlich verschärft durch einen
Feldnamen-Mismatch (Dispatcher sendete `fehler`, jeder andere
Fehlerpfad in dieser Datei `grund`), der selbst den einen Schreibpfad,
der den Statuscode auswertet, nur "unbekannter Fehler" statt der
eigentlich vorhandenen Meldung zeigen ließ. Der Feldnamen-Mismatch ist
behoben (`grund` durchgängig). Das breitere Muster (kein `r.ok`-Check in
den meisten GET-Wrappern) ist bewusst NICHT in WS-2a behoben — das
berührt praktisch jeden lesenden Endpunkt aus F10–F24, nicht nur WS-2a,
und ist als eigene "Bekannte Grenze" in `features/F25/feature.md`
festgehalten statt an dieser Stelle unter Zeitdruck breit anzufassen.
`npm run check` nach allen Korrekturen erneut grün bestätigt (528 Tests),
der Browser-Realtest (oben) mit den korrigierten Dateien wiederholt.

## Aufräumen nach dem Test

Lokale Registerkopie (`projekte-test-f25-ws2a-ak6.json`, nie committet)
entfernt. `f25-testprojekt-b` bleibt unverändert als reales,
wiederverwendbares Testprojekt bestehen (Muster WS-1).
