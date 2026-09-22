# Journal — F32

Anhängeprotokoll. Neue Einträge unten anfügen, bestehende nicht ändern.

## 2026-09-22 — WS-2 Verbrauchsansicht im Leitstand

`public/leitstand/api.js`: `holeVerbrauch(von)` (Muster `holeRoadmap`,
`mitPraefix`, `POLL_ZEITLIMIT_MS`). Neue reine Funktion
`berechneVerbrauchsVon` (`public/leitstand/verbrauch-zeitraum.js`) liefert
für die drei festen Zeiträume 7 Tage/30 Tage/gesamt immer ein gültiges
ISO-8601-`von` bzw. `undefined` — kein freies Datumsfeld, das einen
syntaktisch fehlerhaften Query-Wert erzeugen könnte (WS-1-Bekannte-Grenze
zum Zeitraumfilter dadurch entschärft, nicht behoben).

`public/leitstand/views/dashboard.js` (NICHT `workboard.js`, wie
beauftragt): neue Karte "Verbrauch" mit Zeitraum-Umschalter, zwei
Gesamt-Kacheln (Läufe, ohne Beobachtung) und je einer Tabelle nach Rolle
und nach Modell (Tokens ein/aus/Cache — Cache als eine Spalte, Summe aus
Lese+Schreib, da die API-Projektion selbst feiner gruppiert als die
Anzeige es braucht). `null`-Gruppen erscheinen als "unbekannt" mit
Tooltip. Geladen einmalig beim Bootstrap und bei jedem Zeitraumwechsel
(Klick-Delegation auf `#view-dashboard`, Muster `views/workboard.js`
`ladeRoadmap`/Überholschutz-Zähler) — der bestehende 2-Sekunden-Poll ruft
`holeVerbrauch` nie auf. Keine Kosten in Euro/USD (Entscheidung 30). Neue
CSS-Klassen in `style.css` (`.dashboard-verbrauch`,
`.verbrauch-zeitraum-auswahl`, `.verbrauch-gesamt`, `.verbrauch-karte h4`)
nutzen ausschließlich bestehende Tokens (`--space-*`), keine neue Farbe —
Design-Nachzug bewusst auf die Design-Phase vor F30 verschoben (Muster
F-596).

Gate `scripts/check-f32-verbrauch-ansicht.mjs`: prüft `berechneVerbrauchsVon`
für alle drei Zeiträume gegen einen festen Bezugszeitpunkt, und einen
echten HTTP-Aufruf `GET /api/verbrauch` mit einem client-seitig gebauten
`von`-Wert gegen einen über `erzeugeRequestHandler` erzeugten Testserver
(Muster `check-f33-roadmap-projektion.mjs` Abschnitt (e)) → 200, erwartete
Struktur. In `npm run check` eingehängt.

`features/F32/feature.md`: WS-2-Abschnitt + AK7–AK10, drei "Bekannte
Grenzen"-Einträge aktualisiert (Zeitraumfilter-Formatprüfung durch feste
Zeiträume entschärft, `null`-Gruppierung jetzt sichtbar mit Tooltip statt
unterschieden, Kontingent bleibt offen). Status bleibt `IN_ARBEIT` — Stefans
Verifikation und der formale Feature-Review-Pass stehen aus.

`state/findings.md` F-508: Maßnahme/Beschreibung ergänzt (Verbrauch jetzt
sichtbar über F32 WS-2, Kontingent bleibt offen), Status bleibt `offen`.

Reviewer-/QA-Pass (frischer Kontext, vor Commit-Freigabe): `code-reviewer`
„Freigegeben mit Hinweisen" (keine Blocker; ein Punkt vor Commit behoben —
`catch` in `ladeVerbrauch` protokolliert den Fehler jetzt über
`console.error`, Muster `ladeRoadmap`). `qa` zunächst „Nicht freigegeben"
wegen eines echten Bedienbarkeits-Mangels: ein fehlgeschlagener Abruf des
bereits aktiven Zeitraums (insbesondere des Standardzeitraums `30t` beim
Bootstrap) ließ sich nicht erneut versuchen — behoben (Klick auf den
aktiven Zeitraum-Button löst jetzt neu, wenn dessen letzter Abruf
fehlgeschlagen ist). Zusätzlich behoben: Rolle-Tooltip nannte internes
Artefaktvokabular ("Kontextpaket") statt einer nutzerverständlichen
Umschreibung — vereinfacht, `feature.md` "Bekannte Grenzen" entsprechend
korrigiert. Zwei nicht blockierende Restbefunde als F-601 (kein Gate für
die dashboard.js-internen WS-2-Bausteine) und F-602 (kein Browser-Realtest
bei ~400px, sitebreites Muster) in `state/findings.md` registriert.

`npm run check`: siehe Bericht dieses Auftrags für das Gesamtergebnis.

## 2026-09-22 — Feature-Review-Pass gesamt, Status IN_ARBEIT → FEATURE_GATE

Feature-Review-Pass (`code-reviewer` + `qa`, je frischer Kontext, Muster
F33/F40) über das GESAMTE Feature F32 (WS-1 #200 + WS-2 #216 zusammen, nicht
nur den zuletzt gebauten Workstream). Beide Urteile: „Freigegeben mit
Hinweisen", kein Blocker.

`code-reviewer`: Vertragskonsistenz zwischen WS-1-Projektion und
WS-2-Konsum durchgehend deckungsgleich, Zwei-Worker-Konsistenz
(claude-code/Codex) bestätigt, keine Logik-Duplikation. `qa`:
Zeitraumgrenzen korrekt inklusiv, beide Worker gleich behandelt,
Erstnutzung zeigt verständlichen Leerzustand, keine Verwechslungsgefahr
mit Kontingent (F-508) oder der Roadmap-Karte (F33).

Beide Agenten fanden unabhängig voneinander denselben neuen Fehler (nicht
doppelt registriert): `GET /api/verbrauch` hat keinen "wirft nie"-Vertrag
(anders als `baueRoadmapProjektion`, F33) und `holeVerbrauch` prüft
`response.ok` nicht (anders als `holeRessourcen`/`holeAbdeckung` im
selben Modul) — ein 500 wird stillschweigend als Erfolg übernommen,
`aggregiereVerbrauch` wirft daraufhin einen `TypeError` mitten in der
`render()`-Konstruktion, und das GESAMTE Dashboard (nicht nur die
Verbrauchskarte) friert ohne sichtbaren Fehler und ohne Selbstheilung ein.
Als **F-603** (`BUG`, P2, offen) in `state/findings.md` registriert und in
`features/F32/feature.md` unter "Bekannte Grenzen" referenziert — kein
Blocker (seltener Trigger, kein Datenverlust), aber vor `ABGESCHLOSSEN` zu
beheben. Bereits bekannte Befunde F-601/F-602 wurden von beiden Agenten
erneut bestätigt, nicht doppelt registriert.

`features/F32/feature.md`: Status `IN_ARBEIT` → `FEATURE_GATE` (Muster
F33: Feature-Review-Pass ist Voraussetzung für `FEATURE_GATE`,
`ABGESCHLOSSEN` bleibt an Stefans Abnahme gebunden, F-603 sollte davor
behoben werden). `docs/STATUS.md` entsprechend aktualisiert. `node
scripts/erzeuge-lagebild.mjs` erneut gelaufen (STATUS.md geändert).
`npm run check`: siehe Bericht dieses Auftrags.

Nicht Teil dieses Auftrags (Doku-Auftrag, kein Bau): Behebung von F-603
selbst; Stefans Abnahme.

## 2026-09-22 — Fixpaket F-603 (Branch fix/f603-f598-f595)

F-603 behoben, dreischichtig gehärtet: `holeVerbrauch`
(`public/leitstand/api.js`) nutzt jetzt `holeJsonOderWirf` (dafür um ein
optionales `optionen`-Argument erweitert, Timeout bleibt erhalten);
`baueVerbrauchsProjektion` (`scripts/leitstand/routen-verbrauch.mjs`)
wirft nie mehr (komplette Funktion in try/catch, Muster
`baueRoadmapProjektion`, F33) und liefert `{ status: 'ok', gruppen,
laeufeGesamt, ohneBeobachtungGesamt }` bzw. `{ status: 'fehler', grund }`,
serverseitig über `console.error` geloggt; `ladeVerbrauch`
(`public/leitstand/views/dashboard.js`) normalisiert ein
Fehler-Fachergebnis auf denselben Client-Sentinel `{ fehler: true }` wie
einen Netzwerkfehler, `verbrauchKarte`/`aggregiereVerbrauch` prüfen
zusätzlich defensiv `Array.isArray(gruppen)` — kein `TypeError` mehr
möglich, egal welche Schicht versagt. Überholschutz und Retry-per-Klick
bleiben für beide Fehlerarten einheitlich funktionsfähig.

Gate `scripts/check-f32-verbrauch-ansicht.mjs` um Abschnitte (c)/(d)
ergänzt (Rot-Fall: simulierter IO-Fehler über eine Datei statt eines
Verzeichnisses als `basisVerzeichnis`, direkt UND über echten
HTTP-Aufruf → 200 statt 500). Dabei real einen reproduzierbaren
Windows/Node-Absturz gefunden und behoben: zwei nacheinander geöffnete
und geschlossene HTTP-Server im selben Prozess kollidierten mit einem
`process.exit()` direkt danach ("Assertion failed: !(handle->flags &
UV_HANDLE_CLOSING)", exit 127) — dasselbe Problem, das
`scripts/check-f33-projektkontext.mjs` bereits dokumentiert und mit
`process.exitCode` statt `process.exit()` löst; dasselbe Muster hier
übernommen (kein neuer Workaround).

`features/F32/feature.md`: "Bekannte Grenzen"-Eintrag zu F-603 aktualisiert
(behoben statt offen), Nachtrag-Abschnitt mit Reviewer-/QA-Ergebnis
ergänzt. `state/findings.md`: F-603 auf `erledigt` mit Fundstelle; zwei
neue, nicht blockierende Befunde aus dem Review dieses Fixpakets als
F-604/F-605 registriert (gehören inhaltlich zum F-598-Fix, siehe
`features/F33/journal.md`).

Reviewer-/QA-Pass (frischer Kontext, über das gesamte Fixpaket F-603 +
F-598 + F-595 zusammen): `code-reviewer` „Freigegeben mit Hinweisen" (kein
Blocker), `qa` „Freigegeben" (kein Befund). `npm run check`: siehe Bericht
dieses Auftrags für das Gesamtergebnis.

Nicht Teil dieses Auftrags: F-601/F-602 (unverändert offen); Stefans
Abnahme.
