# Plan v2 — F45 B5b-2b-1 „Roadmap: Anpassen“

Grundlage: `plan-b5b2b.md` (v1) → `advisor-b5b2b.md` (Nicht freigegeben, Schnitt) → Entscheidungen Challenger 25.10.2026 (Akte F45,
„B5b-2b geteilt“, „Bug-Felder nach 2c“, E-BRAIN-1). Kein zweiter Advisor-Pass (Regel 3a). v1 bleibt unverändert stehen.

## 1 Umfang 2b-1

- (a) „Anpassen“ im Detailpanel → vorhandene Route `PUT /api/features/<id>/planung`. **Keine Serveränderung.**
- (c) F-1197: Status als Pille (Zeile und Detailpanel, wie Canvas `03-roadmap--Main`), Auswahl als neutraler Streifen aus `--ink`
  bzw. `--line`, Detailpanel-Rahmen `--line` — kein Gold, kein Mint, keine neue Farbe (Advisor A4, Entscheidung 3).
- F-1201: Nachweisskripte warten auf das Ende der Ladezustände (2b-1 und 2a).
- Nicht: Bereinigungsliste (2b-2), Bug-Felder (2c), Pflege & Fixes, Kanban, Balken ziehen, „+ Eintrag erfassen“.
- F-1198 (lange Namen) und F-1199 (View-Tests) bleiben draußen (A6): 2b-1 ändert weder die linke Spalte noch das Neuschreiben-Modell;
  die reinen Funktionen des Formulars sind getestet. ARCHITECTURE.md unverändert (F-1191, B9).

## 2 Client

- `public/leitstand/akte-bearbeiten.js`: `grundUndVerstoesse` exportieren (B1; heute intern) — wird vom Anpassen-Formular genutzt.
  `gitBlockHtml`, `AKTE_GRUND_MAX` wiederverwenden.
- Neu `public/leitstand/roadmap-anpassen.js` (rein: kein DOM, kein fetch) + `roadmap-anpassen.test.mjs`:
  - `anpassbar(zeile)` → `{ art: 'feature' | 'schaetzung' } | { art: 'nein', grund }` (B2): Meilenstein/Gruppe nein (ohne Grund, kein
    Formular); Feature ohne Akte, ABGESCHLOSSEN, ABGEBROCHEN ⇒ nein mit Grund; Workstream-Zeile einer solchen Akte ebenso; Feature mit
    `workstreams_fehlerhaft` ⇒ Schätzung gesperrt (Zeile) mit Grund.
  - `anpassenWerte(zeile)`: Feature `{ prioritaet: '', meilenstein: <heutiger>, grund: '' }`; Schätzungszeile `{ min, max, grund }` als
    Text mit Komma aus `zeile.schaetzung` (null ⇒ leer).
  - `leseSchaetzzahl(text)`: leer ⇒ null; Komma oder Punkt; 0–1000; höchstens zwei Nachkommastellen; sonst `NaN`-Marke (ungültig).
    Dieselbe Regel wie `istSchaetzZahl`/`SCHAETZUNG_ZAHL` im Server (Server bleibt maßgeblich).
  - `pruefeAnpassen(werte, zeile)` → `{ aenderungen: string[], fehler: string[] }`: beide leer = keine Schätzung, sonst beide gültig,
    Min ≤ Max; Änderung = Priorität gewählt und ≠ heute; Meilenstein ≠ heute; Schätzung ≠ heute.
  - `meilensteinZiele(roadmap)`: nur nicht abgeschlossene Meilensteine (B2; ein abgeschlossenes Ziel ergäbe R1-422).
  - `darfAnpassenSpeichern(werte, zeile, phase)`: Grund nicht leer, ≥ 1 Änderung, keine Fehler, Phase nicht `speichert`.
  - `baueAnpassenKoerper(werte, zeile, hash, roadmapHash)`: Feature → `prioritaet` nur bei Änderung, `meilenstein` + `roadmap_hash`
    nur bei Wechsel; Schätzungszeile → `workstreams: [{ id, schaetzung_min, schaetzung_max }]` (beide null = keine Schätzung), für
    das Feature der Zeile (`zeile.bezug.feature`). Immer `grund`, `hash`.
  - `deutePlanungAntwort(status, koerper)`: 200 → `{ art: 'ok', git, geaendert, hash, roadmapHash }`; 409 mit Schlüssel `workflowId`
    → `gesperrt`; 409 sonst (`hash`/`roadmap_hash`) → `konflikt`; 400/422 → `abgelehnt` (grund, verstoesse); sonst `fehler`.
  - `offenNachWechsel(standardOffen, aufgeklappt, meilensteinId)` (A5): Aufklappmenge mit `['m', neu]`.
  - `anpassenHtml(stand)`: `<details data-roadmap-anpassen-details>` „Anpassen“ (offen-Zustand im View-Zustand, B3); Felder je Art;
    Begründung Pflicht (`maxlength` = `AKTE_GRUND_MAX`); Hinweis „Jarvis schlägt nur vor, du übernimmst“; „Änderung speichern“
    disabled bis `darfAnpassenSpeichern`; Meldung je Phase (Servertext wörtlich über `grundUndVerstoesse`; bei konflikt/gesperrt/
    abgelehnt Knopf „Neu laden“); Erfolg „gespeichert, nicht committet“ + geänderte Felder + `gitBlockHtml`.
- `public/leitstand/api.js`: `speicherePlanung(id, koerper)` (PUT, rohe Response).
- `public/leitstand/views/roadmap.js` (nur Verdrahtung):
  - Zustand `anpassen = { projektId, featureId, workstream, offen, phase, werte, meldung, ergebnis }` — Identität über Feature-ID +
    Workstream-ID, nicht über den Zeilenschlüssel. Wechsel der Auswahl auf eine andere Zeile verwirft einen nicht gespeicherten
    Stand (wie „Abbrechen“); Projektwechsel verwirft immer.
  - Speichern: Phase `speichert` (Doppelklick-Sperre im Zustand) → `holeFeatureAkte(id)` für `hash`; bei Meilenstein-Wechsel
    zusätzlich `holeRoadmap()` für `roadmap_hash` (frisch, Auftrag; R4 DEKLARIERT) → PUT. Überholschutz gegen Formular-Identität und
    Projekt-ID (B4), ein verworfener Erfolg wird geloggt.
  - Nach 200: Ergebnis im Zustand; bei Meilenstein-Wechsel `auswahl = ['f', neu, id]` und `aufgeklappt = offenNachWechsel(...)` (A5);
    `ladeRoadmap({ behalten: true })` — kein „Lädt“-Zwischenstand, Akte-Cache für das Feature verworfen. Ergebnis + Git-Block bleiben
    stehen, bis „Schließen“ oder eine andere Auswahl.
  - Nach 409/400/422/Fehler: Meldung, Eingaben bleiben; „Neu laden“ lädt Roadmap und Akte neu (`behalten`), Werte bleiben im Formular.
  - Eingaben: `input`/`change` schreiben in den Zustand und schalten nur den Speichern-Knopf (kein Neuschreiben); `toggle` am
    `<details>` merkt den offen-Zustand; `fokusSchluessel` kennt `data-roadmap-anpassen-feld`/`-aktion`; `[data-befehl-kopieren]`
    in `beiKlick` → `kopiereBefehlsblock` (B5).
  - Kopfkommentar und Dateikopf nachziehen (B8: „Keine Schreibaktion auf dieser Seite“ gilt nicht mehr).
- Texte `roadmap.anpassen.*` in de/en/tr/ru.

## 3 Design (F-1197)

- `.roadmap-status` in `.rm-status` und `.rm-detail-kopf` als Pille: `display: inline-flex`, `border: 1px solid` in
  `color-mix(in srgb, currentColor 45%, transparent)`, `border-radius: 999px`, Padding 1px 8px; Phone: `align-self: flex-start`,
  kein Ziehen über die volle Breite (B7).
- `.rm-zeile.gewaehlt`: Fläche `--note-bg`, Streifen `inset 3px 0 0 var(--ink)`; aktueller Meilenstein bleibt `--note-bg` ohne
  Streifen. `.rm-detail` Rahmen `var(--line)`.
- Formular: vorhandene Muster (`note amber|red`, `button`, `akte-feld`-Klassen) plus wenige Layoutregeln; Kontrast über
  vorhandene Tokens.

## 4 Nachweis (A7, Entscheidung 6)

- `features/F45/nachweise/b5b2b/erzeuge-nachweis.mjs` — **keine Standard-URL, kein Fremdserver**: Das Skript
  1. legt selbst `git clone --local <repo> <os.tmpdir()>/aiw-b5b2b-<zufall>` an und kopiert die geänderten und neuen Dateien des
     Arbeitsbaums hinein (`git diff --name-only HEAD`, `git ls-files --others --exclude-standard`, ohne `kontrollzustand/`);
  2. prüft, dass die Kopie im Temp-Verzeichnis liegt und keine Verknüpfung (Junction/Symlink) enthält (`lstat` rekursiv), keine
     `node_modules` (das Produkt hat keine Laufzeit-Abhängigkeiten);
  3. startet den Leitstand der Kopie selbst (`cwd` = Kopie, eigener Port, `LEITSTAND_PROJEKTE_LOKAL_PFAD`,
     `LEITSTAND_FAEHIGKEITEN_LOKAL_PFAD`, `LEITSTAND_PLUGIN_KOPIEN_WURZEL` auf Temp) und schreibt nur gegen diesen Port;
  4. stoppt am Ende den Prozess, entfernt `.leitstand.lock` nur, wenn der Prozess nachweislich beendet ist, prüft erneut „in Temp,
     ohne Verknüpfung“ und löscht die Kopie (`fs.rmSync`).
  Ohne diese selbst angelegte Kopie bricht es ab.
- Schritte (WebP über Canvas, ≤ 8 MB; Warten auf das Ende von „Lädt …“ in Gantt, Entwicklungsstand, Noch nicht eingeplant —
  F-1201): Anpassen offen Feature; Anpassen offen Workstream; Speichern deaktiviert ohne Begründung; Erfolg mit Git-Block (echter PUT
  gegen die Kopie); 409 mit „Neu laden“ (PUT im Browser mit 409 beantwortet — ein echter Konflikt ist bei frischem Hash nur im
  Millisekundenfenster möglich; im Protokoll vermerkt); Status-Pille und Auswahl dunkel/hell, 1440/390. Übrige Schritte nur in
  `protokoll.json`. Im Skript von 2a dieselbe Warte-Bedingung (F-1201).

## 5 Prüfen

`roadmap-anpassen.test.mjs`, `akte-bearbeiten.test.mjs`, `roadmap-anzeige.test.mjs`, `projekt-wechsel.test.mjs`, `i18n.test.mjs`
einzeln; Gates `check-f20-design-tokens`, `check-f44-i18n`, `check-f45-b5b1b1-planung-schreiben`, `check-f45-b5b1b2-bereinigung`
und weitere berührte einzeln; dann `npm run test`. Danach design-guardian, code-reviewer, qa.

## 6 Vorarbeit für 2b-2 (nicht bauen)

- **A1:** In der Attrappe des Gates b5b1b2 ist die umbrochene F21-Angabe genau eine gültige Standardform — alle fünf „Feature →
  ABGESCHLOSSEN“ sind vorprüfend *möglich*; F21 scheitert im POST nur an der Sperre (Gate (c)). Gate (a) erwartet `moeglich: true`
  für alle fünf; „nicht möglich“ gezielt erzeugen (z. B. zwei Standardformen für F20).
- **A2:** Vollständige Zuordnung jedes `return antwort(4xx…)` im extrahierten Block (`routen-planung.mjs:462-510`) zu „Testfall“
  oder „aus einem GET-Vorschlag unerreichbar, weil …“: unbekannter Status, `Abgenommen:`-Zeile, Akte kein UTF-8, Akte-Gate rot,
  STATUS.md: Konvention vorhanden und 0 bzw. 2 Angaben für die ID, CRLF (nur mit Standardform), kein UTF-8; roadmap.json CRLF und
  `setzeMeilensteinStatus`-Fehler (LAEUFT); Ausnahmen CRLF (nur mit Ausnahme) und `entferneStatusAusnahme`-Fehler; neue R1-Befunde,
  „bliebe Abweichung“. Unerreichbar: ohne Status-Zeile (kein Vorschlag), schon ABGESCHLOSSEN (keine Abweichung). „STATUS.md ohne
  Standardform“ bzw. fehlend ist kein Sperrgrund (Hinweis). Datum im GET `kontext.datum ?? lokalesDatum()`; ein Fall mit feindlichem
  Grund (O1). qa8-Text: „Dauerhaft begründete Ausnahmen sind heute nicht vorgesehen.“ Bestätigungsschritt inline statt `<dialog>`
  (O2) mit Häkchen/Wahl im Zustand.

## 7 Risiken

- R1 View-Neuschreiben verliert Eingaben/Fokus → Werte im Zustand, `input` ohne Neuschreiben, `fokusSchluessel` erweitert; Caret im
  Browser prüfen (Nachweis).
- R2 Nachweis schreibt echte Daten → nur selbst angelegte Temp-Kopie, Port selbst gestartet, Abbruch sonst.
- R3 Frischer Hash: eine zwischen Öffnen und Speichern von außen geänderte Priorität/Schätzung wird überschrieben — nur das bewusst
  geänderte Feld (O3); DEKLARIERT im Kopf von `roadmap-anpassen.js`.
