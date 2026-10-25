# Plan v1 — F45 B5b-2b „Roadmap: Anpassen + Bereinigungsliste“

Auftrag: Challenger, 25.10.2026 (Schnitt B5b-2 in `feature.md`, Abschnitt „Stand B5b-2a“). Basis `ec2ec13`.
Sollvorgabe Stefan §5 Punkt 7 (Detailpanel, aufklappbar „Anpassen“, Begründung Pflicht, Jarvis schlägt nur vor).

## 1 Umfang

- (a) „Anpassen“ im Detailpanel → vorhandene Route `PUT /api/features/<id>/planung`.
- (b) Bereinigungsliste auf der Roadmap-Seite → vorhandene Routen `GET /api/roadmap/bereinigung`,
  `POST /api/roadmap/bereinigung/bestaetigen`; F-1189-Restpunkte qa2, qa3, qa6, qa7, qa8 (qa9 → W2).
- (c) F-1197 (Status-Pille, Auswahl nicht in Gold), F-1201 (Nachweisskript wartet auf geladene Abschnitte).
- Nicht: Pflege & Fixes, Kanban, Bug-Felder (2c), Balken ziehen (Teil 2), „+ Eintrag erfassen“ (bleibt „kommt“).

## 2 Server — einzige Änderung: Vorprüfung je Vorschlag (qa3)

Datei `scripts/leitstand/routen-planung.mjs` (Routen-Modul, nicht der Server; Wachstumsbremse unberührt).

- Neue interne Funktion `bereiteBestaetigungVor(stand, akte, eintrag, entscheidung, grund, datum)` → `{ ok: true, ziele, hinweis }`
  | `{ ok: false, antwort }`. Inhalt = der heutige Block in `bestaetigeBereinigung` ab „Vorschlag vorhanden?“ bis einschließlich
  R1-Gate vor dem Schreiben (Akte abschließen inkl. unbekanntem Status/`Abgenommen:`, STATUS.md genau eine Standardform/CRLF/UTF-8,
  roadmap.json CRLF und `setzeMeilensteinStatus`, Ausnahmen CRLF und `entferneStatusAusnahme`, neue R1-Befunde/„bliebe Abweichung“).
  Rein im Sinne von: liest nichts selbst, schreibt nichts; alle Bytes kommen aus `leseBereinigungsStand`/`leseEintragsAkte`.
- POST ruft sie nach der Hash-Prüfung auf (Verhalten bitgleich; Sperre und Hash-409 bleiben davor).
- GET ruft sie je Vorschlag jedes Eintrags auf (Grund-Platzhalter „Vorprüfung“, Datum `lokalesDatum()`), ergänzt
  `moeglich: boolean`, `grund: string | null` (= `antwort.koerper.grund` bei `ok: false`). Kein Doppelcode.
- Nicht in der Vorprüfung (DEKLARIERT, Kopfkommentar): Sperre durch einen offenen Ablauf (ändert sich ohne Dateiänderung; der POST
  bleibt maßgeblich, 409) und Hash-Abweichung. Der Grund-Text des POST kann von der Vorprüfung nur im Grund abweichen
  (`pruefeGrund` läuft vorher; Steuerzeichen im Grund ⇒ 400, nicht 422).
- Tests: neue Datei `scripts/leitstand/routen-planung-vorpruefung.test.mjs` (node:test, Temp-Repo im tmp, Modulaufruf
  `fuehrePlanungRouteDurch` wie Gate b5b1b2 (n)). Je Sperrgrund ein Fall „GET `moeglich: false` mit Grund ⇔ POST 422 mit demselben
  Grund, nichts geschrieben“: unbekannter Akten-Status, vorhandene `Abgenommen:`-Zeile, STATUS.md ohne Standardform, STATUS.md mit
  zwei Standardformen, CRLF in STATUS.md, CRLF in Ausnahmen-Datei, CRLF in roadmap.json (LAEUFT), verwaiste Ausnahme (LAEUFT, R1).
  Je ein Fall „`moeglich: true` ⇒ POST 200“ für beide Entscheidungen.
- Gate b5b1b2 (a) nur sachlich nachziehen: jeder Vorschlag trägt `moeglich`/`grund`; im Attrappenstand F21 (STATUS.md umbrochen) =
  „Feature → ABGESCHLOSSEN“ nicht möglich mit Grund. Gate b5b1b1 unverändert, außer eine Stelle prüft die Vorschlagsform.

## 3 Client — neue reine Module (kein DOM, kein fetch), View rendert nur

- `public/leitstand/roadmap-anpassen.js` (+ `.test.mjs`):
  - `anpassenWerte(zeile)`: Feature-Zeile → `{ prioritaet: '' (keine Änderung), meilenstein: <aktueller>, grund: '' }`;
    Workstream/Fixpaket/Design-Zeile → `{ min, max }` als Text aus `zeile.schaetzung` (Komma), `grund: ''`; Meilenstein/Gruppe → null.
  - `leseSchaetzzahl(text)`: Komma oder Punkt, 0–1000, höchstens zwei Nachkommastellen (dieselbe Regel wie `istSchaetzZahl`); leer = null.
  - `pruefeAnpassen(werte, zeile)` → `{ aenderungen: string[], fehler: string[] }` — Min ≤ Max, beide leer (= keine Schätzung) oder beide
    gesetzt; „echte Änderung“ = Priorität gewählt und ≠ heute, Meilenstein ≠ heute, Schätzung ≠ heute.
  - `darfAnpassenSpeichern(werte, zeile, phase)`: Grund nicht leer, ≥ 1 Änderung, keine Fehler, nicht `speichert`.
  - `baueAnpassenKoerper(werte, zeile, hash, roadmapHash)`: genau der Serververtrag. Abweichung vom Auftragstext: der Server erwartet je
    Workstream `{ id, schaetzung_min, schaetzung_max }` (beide null = keine Schätzung), nicht `{ id, schaetzung: { min, max } }` —
    `pruefePlanungAenderung` ist maßgeblich. `roadmap_hash` genau dann, wenn sich der Meilenstein ändert.
  - `deutePlanungAntwort(status, koerper)`: 200 → ok (git, geaendert, hash, roadmap_hash); 409 mit `workflowId` → gesperrt; 409 sonst →
    konflikt; 400/422 → abgelehnt (grund, verstoesse); sonst fehler.
  - `anpassenHtml(stand)`: `<details>` „Anpassen“ (aufklappbar, ersetzt den kommt-Knopf); Felder je Zeilenart; Begründung Pflicht;
    „Änderung speichern“ disabled bis `darfAnpassenSpeichern`; Meldung je Phase (Servertext wörtlich, bei 409/422 Knopf „Neu laden“);
    Erfolg: „gespeichert, nicht committet“ + Git-Block über `gitBlockHtml` aus `akte-bearbeiten.js` (Muster B5a-2).
- `public/leitstand/roadmap-bereinigung.js` (+ `.test.mjs`):
  - `deuteBereinigung(antwort)` → `{ zustand: 'ok' | 'nicht_vorhanden' | 'ungueltig' | 'fehler', eintraege, fehler }`.
  - `baueBestaetigung(eintrag, entscheidung, grund)` → `{ eintrag, entscheidung, grund, hashes }` (hashes unverändert aus dem GET-Eintrag).
  - `deuteBestaetigungAntwort(status, koerper)`.
  - `bereinigungHtml(stand)`: Abschnitt „Bereinigungsliste“ mit Zähler; Satz qa8 („Dauerhaft begründete Ausnahmen trägst du von Hand in
    roadmap-ausnahmen.json ein.“); je Eintrag Meilenstein/Feature, Feature-Status, Vorschläge als Radio (Text + Nebenwirkung; nicht
    möglich ⇒ disabled, Grund sichtbar, „von Hand“), Pflicht-Begründung, „Bestätigen…“ ⇒ Bestätigungsschritt im Eintrag (role=group,
    Fokus darauf): „Feature → ABGESCHLOSSEN“ mit Datumshinweis qa6; „Meilenstein → LAEUFT“ mit Hinweis „im Leitstand nicht
    zurücknehmbar, nur von Hand in roadmap.json“ und Pflicht-Häkchen (qa2); „Jetzt schreiben“ / „Zurück“. Erfolg (oben im Abschnitt,
    bleibt nach dem Neuladen stehen): Git-Block, fester Hinweis qa7, `hinweis` der Antwort zusätzlich. Genau ein Eintrag je Klick.
- `public/leitstand/api.js`: `speicherePlanung(id, koerper)` (PUT, rohe Response), `holeBereinigung()` (holeJsonOderWirf),
  `bestaetigeBereinigung(koerper)` (POST, rohe Response).
- `public/leitstand/views/roadmap.js`:
  - Zustand `anpassen` (Schlüssel = Feature-ID + Workstream-ID, nicht der Zeilenschlüssel — der ändert sich beim Meilenstein-Wechsel),
    `bereinigung` (Liste, je Eintrag Wahl/Grund/Phase/Meldung, letzter Erfolg).
  - Speichern: Hash frisch lesen (GET …/akte; mit Meilenstein-Wechsel zusätzlich GET /api/roadmap für `roadmap_hash`), PUT; nach 200
    Roadmap und Bereinigung neu laden ohne „Lädt“-Zwischenstand (`ladeRoadmap({ behalten: true })`), Auswahl behalten (bei
    Meilenstein-Wechsel auf den neuen Zeilenschlüssel umsetzen); nach 409/422 Servertext + „Neu laden“, Eingaben bleiben.
  - Bereinigung: lädt mit der Roadmap parallel und scheitert für sich (Fehlerzustand im Abschnitt); nach 200 Roadmap + Liste neu, nach
    jedem 409/422 Liste neu (Meldung bleibt am Eintrag, falls er noch da ist, sonst oben).
  - Eingaben: `input`-Ereignis schreibt in den Zustand und schaltet nur den Speichern-Knopf (kein Neuschreiben ⇒ Fokus bleibt);
    `fokusSchluessel` kennt die neuen data-Attribute.
  - Trennzeile: „… · n Abweichungen“ mit Sprung zum Abschnitt, wenn n > 0.
  - Doppelklick-Sperre über die Phase im Zustand. Antworten für ein inzwischen anderes Projekt werden verworfen (Anfragezähler).
- Texte: neue Schlüssel `roadmap.anpassen.*`, `roadmap.bereinigung.*` in de/en/tr/ru.

## 4 Design (F-1197)

- Status in Zeile und Detailpanel als Pille: `border: 1px solid currentColor` mit Deckkraft über `color-mix(... currentColor ...)`,
  `border-radius: 999px`, kleines Padding; Farbe bleibt Kategoriefarbe (vorhandene Tokens).
- Auswahl: Fläche `--note-bg`, Streifen `--mint` (Akzent) statt `--amber`; Detailpanel-Rahmen `--line` statt Amber. Aktueller
  Meilenstein bleibt mit `--note-bg` unterscheidbar über den fehlenden Streifen. Keine neuen Farbwerte.
- Formular/Bereinigung nur mit vorhandenen Klassen (`note amber|red`, `button`, `akte-feld`-Muster) plus wenigen Layoutregeln.

## 5 Nachweis

- Wegwerf-Kopie: `git clone --local` nach `%TEMP%`, geänderte und neue Dateien des Arbeitsbaums hineinkopieren (ohne
  `kontrollzustand/`), `node_modules` als Verzeichnisverbindung, Leitstand aus der Kopie auf eigenem Port; ~/.ai-workforce-Pfade per
  Umgebungsvariablen auf Temp. Nach dem Nachweis: Prozess stoppen, Lock nur bei beendetem Prozess entfernen, Kopie löschen.
- Skript `features/F45/nachweise/b5b2b/erzeuge-nachweis.mjs` (Muster 2a, WebP über Canvas, ≤ 8 MB): Anpassen offen (Feature,
  Workstream), Speichern deaktiviert ohne Begründung, Erfolg mit Git-Block (echter PUT gegen die Kopie), 409 mit „Neu laden“ (PUT im
  Browser mit 409 beantwortet — der Hash wird frisch gelesen, ein echter Konflikt ist nur im Millisekundenfenster möglich; im Protokoll
  vermerkt); Bereinigungsliste mit möglichem und deaktiviertem Vorschlag (echte Daten der Kopie; falls kein deaktivierter vorkommt, die
  Kopie gezielt präparieren), Dialog LAEUFT, Erfolg mit STATUS.md-Hinweis (echter POST gegen die Kopie); Pille und Auswahl dunkel/hell,
  1440/390. Warten auf „Entwicklungsstand“ und „Noch nicht eingeplant“ ohne „Lädt …“ (F-1201), ebenso im Skript von 2a.

## 6 Offene Punkte, nicht stillschweigend entschieden

- O1: Vorprüfung im GET über dieselbe Funktion wie der POST — reicht ein Grund-Platzhalter, oder kann ein Grund die Prüfung ändern
  (Akte-Gate auf der Änderungszeile)?
- O2: Bestätigungsschritt inline im Eintrag statt `<dialog>` — genügt das für „zusätzliche Bestätigung im Dialog“ (qa2)?
- O3: Frischer Hash vor dem Speichern (Auftrag) gegen Hash beim Öffnen (Muster B5a-2) — siehe R4.
- O4: Zwei neue Client-Module plus View-Verdrahtung in einem Paket — trägt das die Zuschnitt-Heuristik (ein Baudurchgang, höchstens eine
  Korrekturrunde)?

## 7 Risiken

- R1: `routen-planung.mjs` Refaktor verändert POST-Verhalten → Gate b5b1b2 vollständig + neue Tests.
- R2: Vorprüfung im GET kostet je Eintrag ein Akte-Gate (`pruefeFeatureAkteInhalt`) — bei 5 Einträgen vernachlässigbar.
- R3: Die View wächst (866 Zeilen); Formulare deshalb in eigenen Modulen, View nur Verdrahtung.
- R4: Frischer Hash vor dem Speichern heißt: eine zwischen Öffnen und Speichern von außen geänderte Schätzung wird überschrieben
  (Auftrag so; der Server prüft Hash nur gegen den Moment des Speicherns). DEKLARIERT im Kopfkommentar.
