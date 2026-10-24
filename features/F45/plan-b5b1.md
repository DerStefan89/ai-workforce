# Plan B5b-1 „Planungsdaten“ — v1

Stand 24.10.2026, Branch `f45/b5b1-planungsdaten`, Basis `main` = `e750e94` (B5a-2, #375). Auftrag: Bauauftrag F45 B5b-1
(Challenger, 24.10.2026). Grundlage `docs/projekt/fixpaket-f45.md` §2 R1–R6, E-B5-1 = A, E-B5-3, E-B5-5, E-B5-6 = B,
E-KANBAN = A. Daten und Server, kein UI. Muster: B5a-1 (`features/F45/plan-b5a1-v2.md`, `scripts/leitstand/routen-f35.mjs`,
`src/feature-auftrag/akte-schreiben.ts`).

## 1 Ziel der Iteration
Planungsdaten (Priorität, Abnahmedatum, Workstreams mit Schätzung/Ist/Daten) als strenges, geprüftes Format in der Akte;
Gate R1 (Meilensteinstatus gegen Aktenstatus) mit begründeten Ausnahmen; Bereinigungsliste als Daten mit Bestätigung je
Eintrag; Schreibroute „Anpassen“; Projektion für Gantt, Kennzahlen R2/R5, Kanban, „Pflege & Fixes“; Bug-Felder im
Findings-Parser. Migration F45-Tabelle, F30-Akte als ENTWURF.

## 2 Bestand (gelesen)
- `src/workboard/feature-akte-pruefung.ts` `pruefeFeatureAkteInhalt` — eine Regel für `check-feature`, `routen-f35` (PUT/POST).
- `scripts/check-akte-meilenstein.mjs` — IDs Akte ↔ Roadmap, `AUSNAHMEN` (`ohne_meilenstein` AF-F001, `ohne_akte` F30),
  verwaiste Ausnahme = Befund; Statusregel R1 fehlt (Kommentar verweist auf B5b-1).
- `scripts/leitstand/routen-roadmap.mjs` `baueRoadmapProjektion` — GET /api/roadmap, v0, wirft nie.
- `docs/projekt/roadmap.json` v0; Meilensteinstatus `GEPLANT|LAEUFT|ABGESCHLOSSEN` (`src/projektkontext/index.ts:26`).
- R1 heute verletzt: M3 (F18 FEATURE_GATE), M4 (F20, F21, F22, F25 FEATURE_GATE) — wird im Gate-Bau nachgezählt.
- **18 Akten tragen schon `## Workstreams` als Bullet-Liste** (F20–F23, F25–F29, F31–F36, F39–F41). F35 trägt
  `Abgenommen: Stefan, 28.09.2026 (…)` (kein ISO). Keine Akte trägt `Priorität:`.
- `state/findings.md`: kein Eintrag nutzt heute die Label Nachstellen/Erwartet/Tatsächlich/Ursache/Regressionstest am
  Zeilenanfang (grep 0) — die Erweiterung ändert kein bestehendes Parse-Ergebnis.
- Server `scripts/leitstand-server.mjs` 13.264 Zeilen = Grenze (`scripts/wachstumsbremse-server.json`).
- Nächste freie Finding-ID: F-1184 (höchste F-1183).

## 3 Akte-Format (eine Quelle: neues `src/workboard/feature-planung.ts`, rein)
- `Priorität: P0|P1|P2|P3` — erste Zeile am Zeilenanfang (`^Priorität:[ \t]*(\S+)`, m), optional; fehlt = `null`. Wert
  außerhalb P0–P3 ⇒ Gate-Befund.
- `Abgenommen: JJJJ-MM-TT[ Freitext]` — optional. Ist die Akte **mit strengem Workstreams-Abschnitt**, muss der Wert mit einem
  gültigen ISO-Datum beginnen, und bei Status ABGESCHLOSSEN ist die Zeile Pflicht. Ohne strengen Abschnitt kein Befund; die
  Projektion liefert `abgenommen` nur, wenn der Wert mit ISO beginnt (F35 ⇒ `null`). (Offener Punkt O2)
- `## Workstreams` ist **streng, wenn seine erste nicht-leere Zeile mit `|` beginnt** (Tabelle). Bullet-Abschnitte bleiben
  Prosa (Feature zählt als „ohne Workstream-Daten“). Streng heißt:
  - Kopfzeile exakt `| ID | Art | Titel | Status | Schätzung AT | Ist AT | Begonnen | Abgenommen | Notiz |`, dann
    Trennzeile `|---|…|` (9 Spalten), dann 0..n Zeilen mit genau 9 Zellen; danach darf Prosa folgen (erste Zeile ohne `|`
    beendet die Tabelle).
  - ID: nicht leer, ohne `|`, eindeutig in der Akte. Art ∈ workstream|fixpaket|design. Status ∈ geplant|laeuft|erledigt|verworfen.
  - Schätzung: `–` | `x` | `min–max` (Dezimal mit Komma oder Punkt, ≥ 0; Trenner `–` oder `-`); min ≤ max.
  - Ist AT: `–` | Zahl. Begonnen/Abgenommen: `–` | gültiges ISO-Datum. erledigt ⇒ Abgenommen gesetzt.
  - Zellen mit `\|` werden nicht unterstützt (Zelle darf kein `|` tragen) — DEKLARIERT.
- `lesePlanung(inhalt)` → `{ prioritaet, abgenommen, workstreams: null | [{ id, art, titel, status, schaetzung: {min,max}|null,
  ist: number|null, begonnen, abgenommen, notiz }], befunde: string[] }`; `pruefePlanung` = befunde.
- `pruefeFeatureAkteInhalt` ruft `pruefePlanung` mit ⇒ `check-feature`, PUT/POST Akte und die neuen Schreibrouten prüfen
  dieselbe Regel. Zeilenenden LF und CRLF.

## 4 Migration F45 und F30
- F45: neuer Abschnitt `## Workstreams` direkt hinter `## Scope`. Die Scope-Tabelle verliert die Spalten „Schätzung AT“ und
  „Ist“ (keine zweite Kopie derselben Zahlen) und behält WS | Inhalt | Findings | Abhängig von | Prüfmodus als Prosa-Tabelle.
  Je Scope-Zeile eine strenge Zeile, ID = WS-Kürzel, Titel = Kurzname (erster Satzteil vor „:“ aus „Inhalt“, wörtlich).
  - Schätzung nur, wo eine Zahl/Spanne steht („≈ 0,6“ ⇒ 0,6; „Teil von 1,25–1,5“, „Schätzung fehlt“ ⇒ `–`), sonst `–`;
    Zusätze wörtlich in Notiz („(ohne F-1072)“, „(Ist ≈ 0,5)“).
  - Ist nur bei genau einer AT-Zahl ohne weitere Größe (B0 „≈ 1 AT, gemergt …“ ⇒ 1; B2a-3a „(Ist ≈ 0,5)“ ⇒ 0,5); P
    („≈ 1,25 AT + ≈ 6 h Messung“) und F-3 (Summe aus Teilwerten) ⇒ `–`, Text wörtlich in Notiz.
  - Status/Abgenommen aus Belegen: Merge-Commit auf main (git log, Datum des Merge-Commits, PR-Nummer in Notiz). Zeile
    erledigt nur, wenn alle genannten Teilpakete gemergt sind; sonst laeuft (B5b) bzw. geplant (B3, R, R2). Begonnen `–`
    (keine Quelle).
  - Art: workstream; B3 und R2 design (Design & Motion); die Teilpakete des laufenden Blocks B5 als fixpaket (O3).
  - Satz „Die Spalte „Ist“ trägt der Challenger …“ wird auf den neuen Abschnitt umgestellt.
- F30: `features/F30/feature.md` neu, Status ENTWURF, Titel „Dogfooding: Opportunity Scanner“ (E-M5-15), Ziel aus E-M5-15 und
  Zielsatz M5, Nicht-Ziele aus E-M5-16/E-M5-17 (F37/F38, Kollege-Durchlauf, Import-Wizard, Health-Projektion im V1-Backlog),
  AK aus der Bestehensbedingung M5/V1 Punkte 1–5 (Punkt 6 ist Messung, als Notiz), E-F30-3 als Dependency (F43). Offenes als
  „offen“. `## Workstreams` streng mit Kopf und ohne Zeilen, darunter „Workstreams noch nicht geschnitten (offen)“.
  Ausnahme `ohne_akte` F30 in `check-akte-meilenstein.mjs` entfernt.

## 5 Gate R1 und Ausnahmen
- Reine Regel in neuem `src/workboard/roadmap-regeln.ts`: `pruefeMeilensteinStatus(roadmap, aktenStatus, ausnahmen)` →
  `{ abweichungen: [{ meilenstein, feature, featureStatus, ausnahme? }], befunde }`: Meilenstein ABGESCHLOSSEN ⇒ jedes Feature
  ABGESCHLOSSEN oder Ausnahme `(meilenstein, feature)`; Ausnahme ohne Grund, doppelt, oder die nicht mehr greift (Feature
  ABGESCHLOSSEN, Meilenstein nicht ABGESCHLOSSEN, Feature nicht im Meilenstein) ⇒ Befund.
- **Ausnahmen als Daten**: `docs/projekt/roadmap-ausnahmen.json` `{ "schema": "v0", "status_ausnahmen": [{ meilenstein,
  feature, grund }] }` neben roadmap.json (Pfad aus roadmapPfad abgeleitet). Grund: POST Bereinigung muss die Ausnahme
  entfernen — der Server schreibt keine Skriptdatei, und Fremdprojekte haben kein `check-akte-meilenstein.mjs` (O1). Die
  fünf Einträge mit grund „Bereinigung offen — Bestätigung Stefan (Bereinigungsliste)“. Fehlende Datei = keine Ausnahmen.
- `check-akte-meilenstein.mjs` ruft die Regel zusätzlich (Befunde gemeinsam ausgegeben); `pruefeAkteMeilenstein` bleibt.
- F-1010 berichtigt (Satz „Kein Gate prüft …“ ⇒ Nachtrag mit Stand), F-1175 erledigt.

## 6 Routen (neues `scripts/leitstand/routen-planung.mjs`, Zwischenmuster F-1131)
`erkennePlanungRoute(pfad)` → `{ art, methode, rohId? }`; der Server prüft `req.method === route.methode` hinter dem
CSRF-Haken, liest den Körper (65536) und ruft `fuehrePlanungRouteDurch(route, koerper, kontext)` mit
`{ repoWurzel, roadmapPfad, workflows(), auftraege() }` (Rückrufe wie B5a-1). Gemeinsame Helfer aus `routen-f35.mjs`
exportiert (Pfadauflösung, sha256, lokalesDatum, Git-Block, findeSperrendenAblauf).

### 6.1 GET /api/roadmap/bereinigung
`{ status: 'ok', hash, eintraege: [{ eintrag: '<M>', meilenstein, quelle: ['docs/projekt/roadmap.json', 'features/<id>/feature.md'…],
abweichungen: [{ feature, featureStatus }], vorschlaege: [{ ziel: 'F18', status: 'ABGESCHLOSSEN' } …, { ziel: 'M3', status:
'LAEUFT' }], text: ['F18 → ABGESCHLOSSEN', 'M3 → LAEUFT'] }] }`. Ein Eintrag je abweichendem Meilenstein (auch mit Ausnahme,
die Ausnahme macht nur das Gate grün). `hash` = sha256 über roadmap.json + roadmap-ausnahmen.json + Akten der Abweichungen
(feste Reihenfolge, Längenpräfix).

### 6.2 POST /api/roadmap/bereinigung/bestaetigen `{ eintrag, entscheidung: { ziel, status }, grund, hash }`
400 Körper/grund · 409 Stand-Hash · 404/422 Eintrag unbekannt oder Entscheidung nicht unter den Vorschlägen · 409 Sperre
(Feature-Entscheidung, offener Ablauf mit feature_ref) · sonst genau eine Änderung:
- Feature → ABGESCHLOSSEN: Status-Zeile der Akte (nur der Wert), Änderungszeile `- <datum> · Status · <grund>` (E-B5-3),
  Ausnahme dieses Paars entfernt. Ist die Akte streng, ist `Abgenommen:` Pflicht ⇒ wird mit Datum gesetzt (O4).
- Meilenstein → LAEUFT: Status in roadmap.json (textuell, nur der Wert), alle Ausnahmen dieses Meilensteins entfernt
  (sonst verwaist), Änderungszeile in jeder betroffenen Akte? (O5)
- Gate vor dem Schreiben (Akte: pruefeFeatureAkteInhalt; Roadmap: validiereRoadmapDaten + Rundlauf), Zurücklesen, Zeilenende
  erhalten, Rückbau bei Fehler im zweiten Schreibvorgang, Git-Block mit allen geänderten Pfaden.

### 6.3 PUT /api/features/<id>/planung `{ prioritaet?, meilenstein?, workstreams?: [{ id, schaetzung_min, schaetzung_max }], grund, hash, roadmap_hash? }`
- 400: Körper (genau diese Felder, mindestens eines von prioritaet/meilenstein/workstreams), grund Pflicht (≤ 500,
  Steuerzeichen), hash sha256; prioritaet P0–P3 oder null (Zeile entfernen); schaetzung: beide Zahl 0–100 (≤ 2 Nachkommastellen,
  min ≤ max) oder beide null (`–`); meilenstein ohne roadmap_hash ⇒ 400.
- 404 Akte · 409 Sperre (findeSperrendenAblauf) · 409 Akten-Hash · 409 roadmap_hash · 422: Status ABGESCHLOSSEN/ABGEBROCHEN
  (C15), Workstream-ID unbekannt, Akte ohne strengen Abschnitt bei workstreams, Ziel-Meilenstein unbekannt oder ABGESCHLOSSEN,
  keine Änderung, Gate nach Bearbeitung rot.
- Akte: Priorität-Zeile ersetzen/entfernen/einfügen (hinter der Status-Zeile), nur die Zelle „Schätzung AT“ je genannter Zeile
  ersetzen (Format `0,6` bzw. `0,6–0,8`, Komma), Änderungszeile `- <datum> · Priorität, Schätzung <ids>, Meilenstein · <grund>`
  über den aus `akte-schreiben.ts` herausgelösten Anhänge-Helfer.
- Roadmap: ID aus dem alten Meilenstein entfernen, ans Ende des Ziels; nur die beiden `"features": [...]`-Literale werden
  textuell ersetzt (einzeilig wie Bestand); Rundlauf JSON.parse(neu) ≡ erwartet, sonst 422.
- Schreibreihenfolge Roadmap → Akte; scheitert die Akte, Roadmap mit den Originalbytes zurück (500 mit Hinweis). Antwort
  `{ status:'ok', id, hash, roadmap_hash?, geaendert, git }`.

## 7 Projektion GET /api/roadmap (additiv; v0-Felder unverändert)
- je Feature zusätzlich `prioritaet`, `abgenommen`, `workstreams` (null = keine Daten), `planung_befunde` (Formfehler sichtbar,
  wirft nicht).
- top-level `pflege: { titel: 'Pflege & Fixes', befunde: [...] }` — offene P0–P2-Findings ohne Bezug (O6), mit Bug-Feldern.
- `zeitachse` aus reinen Funktionen (`src/workboard/roadmap-planung.ts`, Parameter `heute`):
  - Reihenfolge = Roadmap (Meilenstein, Feature, Tabellenzeile); offene Einträge (geplant/laeuft) mit Schätzung:
    `start_at` = Σ min davor, `ende_min_at` = start + min, `ende_max_at` = Σ max bis einschließlich.
  - ohne Schätzung: `fruehestens_ab_at` = Σ min davor, **keine Länge**; Features ohne Workstream-Daten und nicht
    ABGESCHLOSSEN/ABGEBROCHEN zählen als ein Eintrag ohne Schätzung.
  - Ist-Zone: erledigte Einträge mit Abgenommen ⇒ `ist_ende_at` = −Arbeitstage(Abgenommen, heute); `ist_start_at` aus
    Begonnen, sonst ende − Ist AT, sonst nur Punkt. Arbeitstage Mo–Fr.
- `kennzahlen`: R2 `meilensteine { abgeschlossen, gesamt }`, `features_abgenommen { abgenommen, gesamt }` gegen die Akten
  (Aktenstatus ABGESCHLOSSEN, Roadmap-Features); R5 `bis_fertig: [{ meilenstein, berechenbar, min, max, ohne_schaetzung }]` je
  nicht abgeschlossenem Meilenstein (kumuliert bis einschließlich), `plan_gegen_ist { anzahl, plan_min, plan_max, ist,
  eintraege }` über erledigte Einträge mit Schätzung und Ist.
- `kanban: { spalten: [{ prioritaet: 'P0'…'P3'|null, features: [{ id, titel, status }] }] }` über nicht abgeschlossene/
  abgebrochene Roadmap-Features (E-KANBAN = A, lesend in B5b-2).

## 8 Bug-Felder (F-975, E-B5-5)
`FELD_MUSTER`/`FELD_NAME_ZU_SCHLUESSEL` um Nachstellen, Erwartet, Tatsächlich, Ursache, Regressionstest; `FindingWorkitem`
additiv `nachstellen … regressionstest: string|null`. Keine Pflicht, keine Rückmigration. Projektion liefert sie in
`pflege` (und über /api/workitems ohnehin).

## 9 Server
Ein Block (≈ 7 Zeilen) für die drei Routen + Import. Ausgleich durch Auslagern eines reinen, nicht schreibenden Helfers aus dem
Server nach `scripts/leitstand/*.mjs` (Kandidat beim Bau bestimmen); Zeilen ≤ 13.264, JSON-Grenze ggf. gesenkt.

## 10 Gate `scripts/check-f45-b5b1-planung.mjs` (in check:gates)
Rot-Nachweis je Regel an Kopien/Fixtures: (a) Formfehler Workstreams (Kopf, Zellenzahl, Art, Status, Datum), (b) min > max,
(c) erledigt ohne Abgenommen, (d) R1-Verstoß ohne Ausnahme, (e) verwaiste Ausnahme, (f) PUT planung Hash-409, Sperre-409,
Grund-400, 422, (g) Meilenstein-Wechsel mit roadmap_hash (409 bei Drift, Erfolg schreibt ans Ende, bytegleich sonst), (h)
Bereinigung bestätigt genau einen Eintrag (andere Ausnahmen/Akten bytegleich), (i) Projektion „Schätzung fehlt“ ohne Länge,
(j) „Bis M5“ nicht berechenbar bei fehlender Schätzung, (k) LF und CRLF (Leser und Schreiber), (l) echte Akten F45/F30
bestehen, F30-Ausnahme weg. Dazu node:test je neues Modul.

## 11 Doku/Findings
STATUS.md, fixpaket-f45.md (B5b-1 gebaut; B5b-2 + „Prioritäts-Kanban lesend (E-KANBAN = A, F-917)“, 1–1,4 AT; E-B5-6 = B,
E-KANBAN = A), F45-Akte (Entscheidungen, Stand B5b-1), ARCHITECTURE.md §2 (Ausnahme „Feature-Akte im Projektordner“ um
roadmap.json/roadmap-ausnahmen.json über Planung/Bereinigung erweitern) + docs/architektur/arbeitsordner.md; findings:
F-1177 Nachtrag, F-1175 erledigt, F-976/944/990/984/1010/975 Restpunkt „Anzeige B5b-2“, F-1184 PROCESS_IMPROVEMENT (PR-Schritt),
neue Restfunde ab F-1185. Lagebild.

## 12 Risiken
- Umfang: drei Routen mit zwei Schreibzielen plus Projektion plus Migration ⇒ 0,6–0,8 AT ist knapp (O7).
- Textuelles Bearbeiten von roadmap.json: abgesichert durch Rundlauf; Formatabweichung ⇒ 422 statt Schaden.
- Zwei Dateien ohne Transaktion: Rückbau best effort, DEKLARIERT.
- Neue Gate-Regel greift auf alle Akten: Bullet-Abschnitte bleiben gültig (Regel „streng = Tabelle“).

## Offene Punkte, nicht stillschweigend entschieden
- **O1** Ausnahmen R1 als Datendatei `docs/projekt/roadmap-ausnahmen.json` statt `AUSNAHMEN` im Skript — der Auftrag sagt
  „bestehender Mechanismus“; der Server darf aber keine Skriptdatei schreiben. Alternative: Ausnahme als Zeile in der Akte.
- **O2** `Abgenommen:` nur mit strengem Abschnitt streng (F35 bleibt gültig) — oder überall streng und F35 umformatieren?
- **O3** F45-Migration: Teilpakete (B5a-1 …) als fixpaket-Zeilen zusätzlich zu den groben Zeilen B5a/B5b führt zu
  Doppelzählung. Vorschlag: B5a/B5b durch ihre Teilpakete ersetzen (Schätzungen aus fixpaket-f45.md §3, alte Grobschätzung in
  Notiz), übrige grobe Zeilen bleiben. Ist das „nichts erfinden“-konform?
- **O4** Bereinigung Feature → ABGESCHLOSSEN: `Abgenommen:` setzen (nur bei strenger Akte nötig) — Datum der Bestätigung?
- **O5** Bereinigung Meilenstein → LAEUFT: Änderungszeile in jeder Akte des Meilensteins mit entfernter Ausnahme, oder keine?
- **O6** „Ohne Feature-/Meilenstein-Bezug“: Bezug = Maßnahme nennt eine Akten-ID (`\bF\d+[A-Za-z]?\b`) oder Meilenstein-ID;
  „Feature/Run“ ignorieren (fast jedes Finding nennt dort den Fundort, nicht die Zuordnung)?
- **O7** Zuschnitt: passt das in einen Baudurchgang + eine Korrekturrunde? Möglicher Schnitt: B5b-1a (Format, Gate R1,
  Migration, Projektion, Bug-Felder) / B5b-1b (Schreibrouten Planung und Bereinigung).
