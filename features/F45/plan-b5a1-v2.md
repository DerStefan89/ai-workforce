# F45 B5a-1 „Akte schreiben“ — Plan v2

Nach dem Advisor-Pass `features/F45/advisor-b5a1.md` („Nicht freigegeben“, ohne Blocker). Plan v1
(`features/F45/plan-b5a1.md`) bleibt unverändert stehen. Entscheidungen Stefan (23.10.2026, Rückfrage im Bau):
**A1** Ausnahme „Feature-Akte im Projektordner“ eintragen · **A2** bestehende Akte behält ihr Zeilenende, neue Akte LF ·
**A3** 422-Bearbeitbarkeitsprüfung · **C15** ABGESCHLOSSEN/ABGEBROCHEN nicht bearbeitbar (422). **A4**: zurück zum
Zwischenmuster E-FB1-2 (bestehende Entscheidung, keine neue nötig).

Unverändert aus v1: Ziel §1, O1–O3, O5, O6, Antwortformen, Git-Block nur als Text, Gate-Fälle (a)–(i).

## Änderungen gegenüber v1

### Server (A4, B1)
Methode im Server hinter dem CSRF-Haken, Modul ohne `.method` (auch in Tests/Kommentaren unter `scripts/leitstand/`, C11):
```js
const akteRoute = erkenneAkteRoute(pfad)
if (akteRoute !== null) {
  const lesen = akteRoute.art === 'akte' && req.method === 'GET'
  if (!lesen && req.method !== (akteRoute.art === 'akte' ? 'PUT' : 'POST')) { 405 }
  const koerper = lesen ? null : await leseJsonBegrenzt(req, 65536)
  const antwort = await fuehreAkteRouteDurch({ ...akteRoute, aktion: lesen ? 'lesen' : akteRoute.art === 'akte' ? 'bearbeiten' : 'anlegen' }, koerper, { repoWurzel, workflows: () => sammleWorkflows(basisVerzeichnis), auftraege: () => sammleAuftraege(basisVerzeichnis), bestehendeIds: () => sammleBestehendeIds(repoWurzel, roadmapPfad) })
  sendeJson(res, antwort.status, antwort.koerper); return
}
```
Ersetzt den GET-akte-Block (14 Zeilen). Grenze in `scripts/wachstumsbremse-server.json` und Routen-Bestand sinken mit.

### Gate (B2, B3)
- CSRF-Probe je Route (PUT `…/akte`, POST `/api/features`) direkt und über `/api/projekte/<id>/…`: fremde Herkunft ⇒ 403, Datei
  bytegleich bzw. nicht angelegt.
- `scripts/check-f35-ws1-feature-auftrag.mjs` (g): Erwartung um `hash` und `entscheidungen: []` ergänzt.

### Sperre (B4)
`kontext.auftraege()` (= `sammleAuftraege`) und dieselbe Regel wie die Anzeige (`baueVerknuepfung`,
`public/leitstand/entwicklung-daten.js`: `feature_ref`, sonst `workitem_referenz`): ein Workflow mit Status ∉
{ABGESCHLOSSEN, GESTOPPT} (fehlend/unbekannt sperrt), dessen Auftrag auf `workitem:feature:<id>` zeigt ⇒ 409 `{ grund, workflowId }`.
Trägt ein solcher Workflow eine `auftragId`, die nicht in der Auftragsliste steht (Kette nicht lesbar) ⇒ 409 fail-closed mit
`workflowId`. Workflow ohne `auftragId` kann auf kein Feature zeigen ⇒ sperrt nicht.

### Status (C15, C6)
`leseFeatureStatus(inhalt)` (`^Status:[ \t]*(\S+)`, `m`) einmal in `src/workboard/feature-akte-pruefung.ts`; genutzt von
`pruefeFeatureAkteInhalt`, `routen-f35.mjs` (ersetzt `STATUS_ZEILE_MUSTER`) und `check-akte-meilenstein`. PUT auf
ABGESCHLOSSEN/ABGEBROCHEN ⇒ 422 (`STATUS_NICHT_BAUBAR`).

### Lesen (B6)
GET und PUT lesen die Datei einmal als Buffer; `hash` = sha256 hex dieser Bytes, Text = `toString('utf8')`. PUT zusätzlich:
`Buffer.from(text).equals(roh)` sonst 422 (kein gültiges UTF-8 ⇒ Rest wäre nicht bytegleich).

### Abschnittsgrenzen (B7)
`findeAbschnitt(inhalt, name, exakt) → { kopfEnde, koerperEnde } | null` in `src/feature-auftrag/index.ts`; `leseAbschnitt`
nutzt sie (Verhalten gleich). Der Schreiber ersetzt `[koerperStart, koerperEnde)`, `koerperStart` = nach dem Zeilenumbruch der
Überschriftzeile (`.*$` frisst ein `\r` mit — berücksichtigt). Davor und ab `koerperEnde` bleibt jedes Byte.

### Bearbeitbarkeit (A3)
Ein Listenabschnitt (Nicht-Ziele, AK), der sich ändert, darf nur enthalten: Leerzeilen, Top-Level-Bullets, eingerückte Zeilen,
`keine`/`(keine)`. Sonst 422 „Abschnitt ‚…‘ enthält Text außerhalb der Liste (Zeile n) — von Hand bereinigen“. DEKLARIERT
(R5): ein erlaubter Abschnitt wird ganz neu formatiert (`- AK<n>: …`, Folgezeilen eingerückt, Checkboxen entfallen).
Unveränderte Abschnitte (semantisch gleich) bleiben bytegleich und werden nicht geprüft.

### Normalisierung (B5)
Einmal definiert (`normalisiereEintrag`): Zeilenenden → `\n`, Zeilen getrimmt, leere entfallen. Ziel: Zeilenenden → `\n`,
getrimmt, innere Leerzeilen bleiben. 400: Steuerzeichen außer `\t\n\r`; Eintrag mit Checkbox-Präfix (`[ ] `/`[x] `);
Ziel-/Problemzeile `^##(\s|$)`; Eintrag leer. Vergleich (`geaendert`, Rundlauf-Probe) auf den normalisierten Werten,
Altwerte mit normalisierten Zeilenenden. Rundlauf-Abweichung ⇒ 422.

### POST (C2, C3)
Dieselben Feld-/Normalisierungsregeln für `scope` (Titel einzeilig), dieselbe Rundlauf-Probe; leere Listen (Nicht-Ziele, Scope,
Annahmen, Offene Fragen) ⇒ Zeile `keine`. LF (A2). Ordner, den die Anlage selbst angelegt hat, wird bei Fehler entfernt.

### Schreiben (C4)
`writeFileSync` direkt, danach zurücklesen und Hash vergleichen ⇒ 500 mit Hinweis. DEKLARIERT: nicht atomar (Abbruch mitten
im Schreiben kann die Akte kürzen; git hält den letzten Commit); eine Fremdänderung zwischen Lesen und Schreiben im selben
synchronen Abschnitt ist nicht ausgeschlossen.

### Git-Block (C5)
`git: string[] | null` (`null`, wenn `befehlsBlock` keinen absoluten Pfad bekommt). `grund` mit `"` ⇒ in der Commit-Nachricht
durch `'` ersetzt (PowerShell 5.1), in der Änderungszeile wörtlich. Branch kennt der Block nicht (Hinweis für B5a-2).

### Entscheidungen (C1)
`leseFeatureEntscheidungen(inhalt)` in `src/feature-auftrag/index.ts`: Top-Level-Bullets unter `## Entscheidungen`, deren Text
mit einer Kennung beginnt (optional in `**`): `E-` + Bestandteile aus Buchstaben/Ziffern mit `-`, mindestens eine Ziffer
(`E-188`, `E-F45-1`, `E-B5-2`; nicht `E-Mail`). `{ id, text }`.

### Meilenstein-Gate (C7)
4. Parameter `aktenStatus` (Map, Standard leer ⇒ bisheriges Verhalten). Nur `ENTWURF` befreit; fehlender/unbekannter und jeder
andere Status (auch BLOCKIERT/ABGEBROCHEN) ⇒ Pflicht. Die Formulierung „ab READY_FOR_TECH“ in E-B5-2 meint jeden Status nach
ENTWURF.

### Kleinkram (C12, C14)
Datum lokal im Modul (`JJJJ-MM-TT`), `kontext.datum` nur für Tests. AK-ID `^AK[1-9]\d*$`. Körper `unvollstaendig` bekommt `hash`
und `entscheidungen`, aber keine Teilwerte — Grenze für B5a-2 (Reparatur heißt Neueingabe).

### ARCHITECTURE.md (A1, A2)
- §2 Satz „im Projektordner bleibt der Kern lesend“ um „außer der Feature-Akte auf Eingabe (F45 B5a-1)“ ergänzt; Einzelheiten
  in `docs/architektur/arbeitsordner.md` (neuer Punkt: nur `features/<id>/feature.md`, nur PUT/POST auf direkte Eingabe,
  Hash-409, Sperre, C15, Anlage `wx`; DEKLARIERT „nur auf Eingabe“, nicht atomar; ERZWUNGEN Pfadsicherheit, Hash, nie
  überschreiben — Gate f45-b5a1; Voraussetzung O4: Läufe schreiben im eigenen Worktree).
- §7 CRLF-Zeile: Ausnahme „bestehende Feature-Akte behält ihr Zeilenende (F45 B5a-1)“.
- Deckel 17800 Bytes: Ausgleich durch Kürzen eines bereits im Detail wörtlich stehenden Kernsatzes.

### Risiken (ergänzt)
- R2 Präfix-Treffer: `## Akzeptanzkriterien WS-2` vor `## Akzeptanzkriterien` (F27, F28) — GET und PUT treffen die erste
  Überschrift, wie der Bau-Auftrag. DEKLARIERT.
- R3 `sammleWorkflows` gibt die Event-Loop frei; ein in diesem Fenster angelegter Ablauf wird übersehen; ein vor dem PUT
  registrierter Auftrag trägt den alten Stand. DEKLARIERT.

### Doku
Findings: F-1174…F-1176 stehen bereits; F-1176 und die Nachträge F-912/F-995 nach dem Bau gegen den echten Stand abgleichen;
neue Befunde ab F-1177. Abschnitt „Stand B5a-1“ in `features/F45/feature.md`, STATUS.md, Lagebild.
