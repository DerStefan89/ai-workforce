# Plan B5b-1b-2 „Bereinigungsliste“ — v2

Stand 24.10.2026. Grundlage: Plan v1 `features/F45/plan-b5b1b2.md` (bleibt unverändert), Advisor `features/F45/advisor-b5b1b2.md`
(Freigegeben mit Hinweisen; bedingter Schnittvorschlag B6 ⇒ Stopp und Bericht), Entscheidungen Challenger 24.10.2026
([EMPFEHLUNG], Wortlaut in `features/F45/feature.md` → Entscheidungen): kein Schnitt, ein Durchgang mit den Kürzungen des
Advisors (≈ 0,45–0,6 AT); A1 = Weg (b): CRLF in `docs/STATUS.md` ⇒ 422 „von Hand“, keine §7-Ausnahme; A2 = B4 dynamisch.
Kein zweiter Advisor-Pass (Regel 3a). Danach code-reviewer und qa mit frischem Kontext, höchstens eine Korrekturrunde.
Abhängigkeit 1b-2 → 1b-1 wie v1.

## 1 ARCHITECTURE.md §2 (A2 + B6), nur §2
Kern vorher 17 756 B: „… außer der Feature-Akte und `docs/projekt/roadmap.json` auf Eingabe (F45 B5a-1, B5b-1b-1). Der Fingerabdruck
… schreibt weder Index noch `.git/objects` und startet keinen Filter-Treiber.“ Nachher: „… außer der Feature-Akte,
`docs/projekt/roadmap.json`, `roadmap-ausnahmen.json` und `docs/STATUS.md` (Status-Wort) auf Eingabe (F45 B5). Der Fingerabdruck
… schreibt weder Index noch `.git/objects`, startet keinen Filter-Treiber.“ ⇒ 17 798 B (Node gemessen; Deckel 17 800). Wenn
Bytes übrig bleiben, „(nur Status-Wort)“ (Advisor Punkt 5) — sie reichen nicht (17 802 B). §7 unverändert (A1 = b).
Detail `arbeitsordner.md`: Einleitungssatz „(nächste zwei Punkte)“ → „(nächste drei Punkte)“; im Punkt „Roadmap“ „wird hier nur
gelesen (Schreiben erst B5b-1b-2)“ → „wird hier nur gelesen“ (C9); neuer Punkt „Bereinigungsliste“ mit Paketkennungen, Gate
f45-b5b1b2, „nur das Status-Wort genau einer Standardform“, CRLF in STATUS.md, roadmap.json, Ausnahmen-Datei ⇒ 422 (A3, A1 = b).

## 2 Reine Module
### 2.1 `src/workboard/status-md.ts` (neu, ohne Importe; B5)
`STATUS_MD_STANDARDFORM` (Quelle aus `check-status-akten.mjs:49`, dort importiert, eine Regel; nur `matchAll`, C2).
`setzeStatusMdStatus(text | null, featureId, status)` → `{ ok: true, geaendert: false, hinweis }` (Datei fehlt oder ohne jede
Standardform, Advisor-1b B5) | `{ ok: false, grund }` (Konvention vorhanden, 0 oder > 1 Treffer ⇒ „STATUS.md von Hand“; CRLF ⇒
„von Hand“, A1 = b) | `{ ok: true, geaendert: true, text, zeile }`. Nur das Wort zwischen den Backticks; Rundlauf: alle anderen
Angaben gleich, die der ID genau einmal mit neuem Wort.

### 2.2 `src/workboard/roadmap-schreiben.ts` (erweitert)
- `featuresLiteral` → `literalImFenster(text, meilensteinId, muster, name)`; `verschiebeFeature` unverändert im Verhalten.
- `setzeMeilensteinStatus(text, id, status)`: genau ein `"status"`-Literal im Fenster, nur der Wert; Rundlauf ganze Struktur +
  `validiereRoadmapDaten`.
- `entferneStatusAusnahme(text, meilenstein, feature)` zeilenbasiert (B5): genau eine Zeile, deren Inhalt ohne Leerraum und
  Endkomma ein JSON-Objekt mit genau diesem Paar ist; ist sie die letzte des Arrays (nächste nicht leere Zeile beginnt mit `]`),
  entfällt zusätzlich das Endkomma der vorigen Elementzeile; einziges Element ⇒ Zeile weg, Array bleibt `[` … `]`. Jede andere
  Form ⇒ 422 „von Hand“. Rundlauf: JSON.parse(neu) tiefengleich der erwarteten Struktur, `leseStatusAusnahmen(neu).befunde` leer.
  Importiert `leseStatusAusnahmen` aus `roadmap-regeln.ts` (kein Ring).

### 2.3 `src/workboard/roadmap-regeln.ts` (erweitert)
- `neueR1Befunde({ roadmapAlt, roadmapNeu, statusAlt, statusNeu, ausnahmenAlt, ausnahmenNeu })` → Befunde auf dem neuen Stand,
  deren Text auf dem alten fehlt (B3); `routen-planung.mjs` (PUT) nutzt ihn ebenfalls (eine Regel).
- `bereinigungsEintraege(abweichungen)` (statt eigenem Modul — klein, gleiche Daten): je Abweichung `{ eintrag: 'M/F', meilenstein,
  feature, featureStatus, ausnahme, vorschlaege }`. `feature_abgeschlossen` nur bei `featureStatus !== null && !== 'ABGEBROCHEN'`
  (C2), Text mit `featureStatus` (C11), Nebenwirkung Akte/STATUS.md/Ausnahme, Datum = Tag der Bestätigung (C4).
  `meilenstein_laeuft` dynamisch, sobald M im aktuellen Stand genau eine Abweichung hat (A2), Nebenwirkung (B10 aus 1b: aktueller
  Meilenstein, Prognose, `ohne_schaetzung`; Überschrift „… abgeschlossen“ in STATUS.md von Hand, C3). Kein Verschieben (F-1187).
- `pruefeEintrag(text)` → `{ meilenstein, feature }` | null (`<M>/<F>`, genau ein `/`, F nach `FEATURE_ID_MUSTER` — als Parameter
  hereingereicht bzw. eigene Kopie des Musters? ⇒ Muster aus `src/projektkontext` importieren, kein Ring). Meilenstein-ID mit
  `/` nicht adressierbar (DEKLARIERT, C8).

### 2.4 `src/feature-auftrag/akte-schreiben.ts` + `akte-abschliessen.ts`
Gemeinsamer Helfer `haengeAenderungAn(inhalt, aenderungsZeile, eol)` → Ersetzung (B5); `planung-schreiben.ts` nutzt ihn (gleiches
Verhalten; `bearbeiteFeatureAkte` bleibt, weil es fehlende Abschnittsblöcke davor einfügt — DEKLARIERT im Kopf). Neu
`setzeAkteAbgeschlossen(inhalt, { datum, grund, meilenstein })` wie v1 2.3 (Status fehlt/ABGESCHLOSSEN/ABGEBROCHEN ⇒ 422,
vorhandene `Abgenommen:` ⇒ 422, Status-Wort, `Abgenommen: <datum>` dahinter, Änderungszeile, Zeilenende, `pruefeAkteGate`,
Rundlauf). `findeAbschnitt` ist schon exportiert (Korrektur v1).

## 3 Routen (`scripts/leitstand/routen-planung.mjs`)
`erkennePlanungRoute(pfad)` → `{ art, rohId? }` plus ein Feld mit der erwarteten HTTP-Methode für den Server; das Modul verzweigt
nur über `art` und enthält die Zeichenfolge `.method` nirgends (B2; Feldname `verb`). GET/POST wie v1 §3, mit:
- UTF-8 nur für geparste Dateien und Schreibziele (C1); CRLF ⇒ 422 für jedes Schreibziel inkl. STATUS.md (A1 = b, Punkt 4).
- Sperre für das Feature des Eintrags bei beiden Entscheidungen (Punkt 1, DEKLARIERT: ein Ablauf an F18 sperrt M3 → LAEUFT).
- Abweichung ohne Ausnahme: gelistet und bestätigbar, nur ohne Ausnahme-Entfernung (Punkt 3).
- Gate vor dem Schreiben über `neueR1Befunde`; eine verwaiste Ausnahme in M ändert bei LAEUFT ihren Text ⇒ 422 (fail-closed,
  DEKLARIERT, B3). Eintrag danach keine Abweichung mehr.
- Reihenfolge Akte → STATUS.md → roadmap.json → Ausnahmen; Abbruch zwischen zwei Schreibvorgängen ⇒ R1 rot, sichtbar (DEKLARIERT,
  B4); Rückbau über `schreibeMitRueckbau`.
- 200 trägt die neuen Hashes des bestätigten Eintrags; vor der nächsten Bestätigung neu laden (C7, Antwortvertrag in der Akte).
- Köpfe nachziehen (C9).

## 4 Server ±0 (wie v1 §4, Feldname `verb`)

## 5 Gate `scripts/check-f45-b5b1b2-bereinigung.mjs` — wie v1 §5 mit:
(a) Attrappe exakt 5, LAEUFT nur bei M3/F18; echtes Repo: Einträge = Paare der Ausnahmen-Datei, LAEUFT genau bei Meilensteinen mit
einer Abweichung · (e) zusätzlich CRLF in STATUS.md ⇒ 422 · (g) M4/F20 → LAEUFT ⇒ 422; Grün-Fall A2: nach drei Bestätigungen in M4
bietet GET „M4 → LAEUFT“ für F25 · Grün-Fall B3: ein Altbefund (F19 ohne Ausnahme in einem anderen ABGESCHLOSSEN-Meilenstein)
blockiert keine Bestätigung; Rot: verwaiste Ausnahme in M ⇒ LAEUFT 422 · Abweichung ohne Ausnahme bestätigbar · (h)/(i) die beiden
Gate-Skripte sind in der Attrappe schon VORHER grün (C6; Standardformen auch für F15–F17) · (j) Rückbau über den Modulaufruf mit
`schreibe` (C6). F-1188-Restfälle draußen (Entscheidung 1). node:test: `status-md.test.ts`, `roadmap-schreiben.test.ts`,
`roadmap-regeln.test.ts`, `akte-abschliessen.test.ts` (erweitert bzw. neu).

## 6 b5b1a (i) entschärfen (B1)
`paare` ⊆ der fünf, jede mit `GRUND_BEREINIGUNG_OFFEN`; Rot-Nachweis im Gate selbst: ein fremdes Paar ⇒ Prädikat falsch.

## 7 Doku/Findings
F45-Akte: Entscheidungen (kein Schnitt, A1 = b, A2 dynamisch), Workstreams B5b-1b-1 erledigt (#377), B5b-1b-2 laeuft (0,45–0,6),
`fixpaket-f45.md` Zeile B5b-1b-2 auf 0,45–0,6; Abschnitt „Stand B5b-1b-2“ mit Antwortvertrag. STATUS.md. Findings: F-1010 offen,
Nachtrag „Mechanik erledigt“ (C5); F-1187 „bleibt so, Bereinigung nur über Status/LAEUFT“; F-1188 unverändert offen; Restpunkte
F-1189. Lagebild.

## 8 Gates/Tests einzeln
Neues Gate, b5b1b1, b5b1a, b5a1, check-akte-meilenstein, check-status-akten, check-feature, check-docs, check-f45-k-kontext,
check-f813-csrf, check-f814-host, check-wachstumsbremse-server, check-f33-roadmap-projektion, Lint, Typprüfung, node:test-Dateien.
