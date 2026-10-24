# Plan B5b-1b — v2 (Teilpaket B5b-1b-1 „Planung schreiben“)

Stand 24.10.2026. Grundlage: Plan v1 `features/F45/plan-b5b1b.md` (bleibt unverändert), Advisor `features/F45/advisor-b5b1b.md`
(Nicht freigegeben, Schnitt A1), Entscheidungen Challenger 24.10.2026 ([EMPFEHLUNG]; Wortlaut in `features/F45/feature.md` →
Entscheidungen): A1 geschnitten (B5b-1b-1 ≈ 0,3–0,4 AT → B5b-1b-2 ≈ 0,3–0,4 AT), A2 Ist von P bleibt „–“ (Punkt 5 des Auftrags
entfällt), B4 für 1b-2. Kein zweiter Advisor-Pass (Regel 3a). Danach code-reviewer und qa mit frischem Kontext, höchstens eine
Korrekturrunde. Abhängigkeit 1b-1 → B5b-1a (Format `feature-planung.ts`, R1 `roadmap-regeln.ts`, `roadmap_hash` in
GET /api/roadmap); 1b-2 → 1b-1 (Routen-Modul, Schreib-/Rückbau-Helfer, §2-Satz).

## 1 ARCHITECTURE.md §2 (A2, nur roadmap.json) — B7, B8
Kern Z. 95–97, vorher: „… (`.claude/`; DEKLARIERT, Pfadprüfung ERZWUNGEN, Gate f45-fb1b); im Projektordner bleibt der Kern
lesend, außer der Feature-Akte auf Eingabe (F45 B5a-1, Gate f45-b5a1). Der Fingerabdruck … Filter-Treiber (Gate f45-b2a3b (a)).“
Nachher: Gate-Namen raus (sie stehen wörtlich im Detail, `arbeitsordner.md:21, :41, :81`), Satz „… außer der Feature-Akte und
`docs/projekt/roadmap.json` auf Eingabe (F45 B5a-1, B5b-1b-1)“. Byte-Nachweis gegen 17 800 B im Bericht. Detail
`docs/architektur/arbeitsordner.md`: Z. 15 „einzige Ausnahme die Feature-Akte“ → „Ausnahmen Feature-Akte und Roadmap (nächste
Punkte)“; neuer Punkt „Roadmap im Projektordner“ mit ERZWUNGEN/DEKLARIERT und den Gate-Namen.

## 2 Reine Module
### 2.1 `src/feature-auftrag/akte-schreiben.ts` (Export statt Kopie, C6)
`wendeAn`, `hinterLetzterZeile` exportiert; neuer Helfer `pruefeGrund(wert)` (Steuerzeichen, leer, 500, Whitespace normalisiert),
von `pruefeAkteAenderung` selbst genutzt (Verhalten gleich).

### 2.2 `src/feature-auftrag/planung-schreiben.ts`
- `pruefePlanungAenderung(daten)` → 400: genau `{ prioritaet?, meilenstein?, workstreams?, grund, hash, roadmap_hash? }`,
  mindestens eines der drei; `meilenstein` ohne `roadmap_hash` ⇒ 400, `roadmap_hash` ohne `meilenstein` ⇒ 400; `meilenstein:
  null` ⇒ 400 „Ausplanen nicht unterstützt — von Hand“ (DEKLARIERT); `prioritaet` P0–P3; `workstreams` 1–100 `{ id,
  schaetzung_min, schaetzung_max }`, id eindeutig nicht leer, beide null oder beide Zahlen 0–1000 mit ≤ 2 Nachkommastellen
  (C3), min ≤ max.
- `bearbeitePlanungInAkte(inhalt, aenderung, wechsel, datum)` → `{ ok, inhalt, geaendert }` | 422. Status ABGESCHLOSSEN/
  ABGEBROCHEN ⇒ 422. Priorität: erste `Priorität:`-Zeile ersetzt, sonst neue Zeile hinter der ersten `Status:`-Zeile (C12
  kosmetisch). Schätzung: strenger Abschnitt ohne Formfehler Pflicht (sonst 422 „von Hand“), jede id eine Zeile, nur der
  Zellinhalt „Schätzung AT“ ersetzt (Leerraum bleibt), `x` bei min = max, sonst `min–max`, Komma; null ⇒ `–`. Gleicher Wert
  zählt nicht; nichts geändert und kein Wechsel ⇒ 422. Änderungszeile `- <datum> · <Felder> · <grund>` unter `## Änderungen`
  (exakt; fehlt ⇒ am Dateiende), Felder „Priorität P1“, „Meilenstein M5 → V1-Backlog“, „Schätzung B5b-2“ (E-B5-3). Zeilenende
  der Akte. Rundlauf: lesePlanung(neu) liefert die angefragten Werte, Status gleich. **Akte-Gate wie B5a-1 (B1): jeder Befund von
  `pruefeFeatureAkteInhalt(neu)` ⇒ 422**, Meldung „schon vor der Bearbeitung“, wenn alle schon vorher bestanden.

### 2.3 `src/workboard/roadmap-schreiben.ts` (rein, importiert nichts aus src/feature-auftrag — C1)
`verschiebeFeature(text, featureId, ziel)` → `{ ok, text, von, geaendert }` | 422. Meilenstein-Fenster ab `"id"\s*:\s*"<M>"`
(genau einmal in der Datei) bis zum nächsten `"id"\s*:`; darin genau ein `"features"\s*:\s*\[…\]` (sonst 422 „roadmap.json von
Hand“); Ausgang = Meilenstein, der die ID führt (mehrere ⇒ 422; keiner = Einplanen); Ziel unbekannt ⇒ 422; gleich ⇒
`geaendert: false`. Literal neu `["F1", "F2"]`, ID ans Ende. Rundlauf (O9): JSON.parse(neu) tiefengleich der erwarteten ganzen
Struktur, `validiereRoadmapDaten` leer, Invariante „ID genau einmal, im Ziel“ (B2 statt `pruefeAkteMeilenstein`).

### 2.4 Kennzahl (Entscheidung Challenger)
`berechneKennzahlen`: `features_abgenommen.gesamt` ohne ABGEBROCHEN. Kopf, `roadmap-planung.test.ts:133` und Gate b5b1a (i2)
nachziehen (C5); check-f33-roadmap-projektion einzeln (C9).

## 3 `scripts/leitstand/routen-f35.mjs` (Export statt Kopie)
`loeseFeatureAktePfadAuf`, `sha256`, `lokalesDatum`, `antwort` exportiert; `baueGitBlock(repoWurzel, pfade, nachricht)` auf
eine Pfadliste verallgemeinert (C4; beide Aufrufer angepasst, Ausgabe für einen Pfad gleich).

## 4 `scripts/leitstand/routen-planung.mjs` (Zwischenmuster F-1131, kein `.method` — C4)
`erkennePlanungRoute(pfad)` → `{ art: 'planung', rohId }` | null; `fuehrePlanungRouteDurch(route, koerper, kontext)`, kontext
`{ repoWurzel, roadmapPfad, workflows(), auftraege(), datum?, schreibe? }` (`schreibe` nur Tests: Rückbau-Fall, C8).
Reihenfolge: 400 Kodierung/id → 404 Akte → 400 Körper → 409 Sperre (`findeSperrendenAblauf`) → **ab hier synchron (B10)**: Akte
lesen, Hash ⇒ 409 `{ hash }`, UTF-8 ⇒ 422; mit `meilenstein`: roadmap.json fehlt ⇒ 422; Bytes lesen, UTF-8 ⇒ 422, CRLF ⇒ 422
(A3), Hash ⇒ 409 `{ roadmap_hash }`, JSON/Schema ungültig ⇒ 422; `verschiebeFeature`; R1 auf altem und neuem Stand (Aktenstatus
aller Roadmap-IDs frisch über `loeseFeatureAktePfadAuf` + `leseFeatureStatus`, Ausnahmen-Datei neben roadmap.json, C7) — nur
**neue** Befunde ⇒ 422 „erst bereinigen“ mit `verstoesse` und Handweg „Ausnahme in roadmap-ausnahmen.json von Hand entfernen,
dann verschieben“ (B1, B6). Dann Akte bearbeiten (422). Schreiben in fester Reihenfolge Akte → roadmap.json, je Datei zurücklesen;
**Fehler oder Abweichung ⇒ Rückbau aller Dateien bis einschließlich der scheiternden** mit den alten Bytes, danach zurücklesen
(B3); 500 mit `rueckbau: [{ pfad, zurueckgesetzt }]` und „git diff prüfen“. Prozessabbruch zwischen zwei Schreibvorgängen ohne
Rückbau (DEKLARIERT). 200 `{ status:'ok', id, hash, roadmap_hash?, geaendert, git }`; Git-Block mit allen geänderten Pfaden.

## 5 Server (13 264 Zeilen, dürfen nicht steigen) — B9
`findeReviewSchritt`, `findeQaSchritt`, `findeReviewVorQa` (rein) nach `scripts/leitstand/workflow-schritte.mjs`; kein Gate liest
ihren Quelltext (Grep). Neuer Block hinter dem Akte-Block: `erkennePlanungRoute(pfad)`, `req.method !== 'PUT'` ⇒ 405 (hinter
dem CSRF-Haken), Körper `leseJsonBegrenzt(req, 65536)`, Rückrufe. Grenze in `wachstumsbremse-server.json` auf den neuen Stand
gesenkt.

## 6 Gate `scripts/check-f45-b5b1b1-planung-schreiben.mjs` (in check:gates), Rot-Nachweis je Fall
Attrappe im tmp, echter Handler über HTTP plus Multi-Projekt-Dispatcher: (a) 400 (grund leer; meilenstein ohne roadmap_hash;
unbekanntes Feld) · (b) 409 Sperre, Gegenprobe abgeschlossener Ablauf ⇒ 200 · (c) 409 Akte-Hash · (d) 409 Roadmap-Hash · (e) 422
Akte-Gate (Formfehler in der Tabelle) und 422 R1 neu (Verschieben aus ABGESCHLOSSEN-Meilenstein mit Ausnahme), Grün-Fall: ein
alter R1-Befund blockiert ein anderes Verschieben nicht (B1) · (f) Erfolg LF und CRLF-Akte: Priorität neu + Schätzung, bytegleich
außerhalb der geänderten Zeilen, Zeilenende erhalten, Hash = Datei, Git-Block · (g) Meilenstein-Wechsel: ID am Ende des Ziels,
roadmap.json außerhalb der zwei Literale bytegleich, neuer roadmap_hash = Datei, Git-Block mit beiden Pfaden · (h) CRLF-roadmap ⇒
422, nichts geschrieben · (i) Rückbau: roadmap-Schreiben scheitert nach Teilschreiben ⇒ 500, Akte und roadmap.json bytegleich
zurück, Antwort nennt beide · (j) Kennzahl ohne ABGEBROCHEN, Gegenprobe · (k) CSRF (Origin/Sec-Fetch-Site fremd ⇒ 403, direkt und
über den Präfix) und Host fremd ⇒ 403, nichts geschrieben · (l) 405 · (m) Server: `erkennePlanungRoute(pfad)` genau einmal.
node:test: `src/feature-auftrag/planung-schreiben.test.ts`, `src/workboard/roadmap-schreiben.test.ts`.

## 7 Doku/Findings
F45-Akte: Entscheidungen (A1-Schnitt, A2, B4, Kennzahl ohne ABGEBROCHEN, kein ABGESCHLOSSEN ohne Bestätigung/genau ein Eintrag),
Workstreams: B5b-1a erledigt (#376, 2026-10-24), B5b-1b → B5b-1b-1 (laeuft, Begonnen 2026-10-24) + B5b-1b-2 (geplant), P
unverändert; Abschnitt „Stand B5b-1b-1“. `fixpaket-f45.md` Zeile B5b-1b ersetzt. STATUS.md. Findings ab F-1186: BUG P2 „Zwei Tests
mit Wartezeit fallen unter Last aus“; „Verschieben als Bereinigungsweg“ (B6, für B5b-1b-2/B5b-2); Restfunde; Nachträge F-976,
F-944, F-990, F-984, F-1010. Lagebild.

## 8 Gates/Tests einzeln
Neues Gate, check-f45-b5a1-akte, check-f45-b5b1a-planung, check-feature, check-akte-meilenstein, check-status-akten, check-docs,
check-f45-k-kontext (Deckel), check-f813-csrf, check-f814-host, check-wachstumsbremse-server, check-f33-roadmap-projektion,
check-f23-abnahme (Helfer ausgelagert), Lint, Typprüfung, betroffene node:test-Dateien.

## Offene Punkte für B5b-1b-2 (aus dem Advisor, nicht in diesem Bau)
- B4 (entschieden): „Meilenstein → LAEUFT“ nur bei genau einer R1-Abweichung im Meilenstein (heute M3/F18); keine eigene
  Eintragsart, keine Sammel-Bestätigung.
- §2-Satz um `roadmap-ausnahmen.json` und „Status-Wort genau einer Standardform in `docs/STATUS.md`“ erweitern (A2 + B6, B7).
- B5: STATUS.md fehlt oder ohne jede Standardform ⇒ überspringen mit Hinweis; mit Konvention 0 oder > 1 Treffer ⇒ 422.
- B3: Ausnahmen-Datei mit Befunden ⇒ 422 „von Hand“; UTF-8-Probe je Schreibziel.
- B10: Vorschlagstext nennt Nebenwirkungen (aktueller Meilenstein; Features zurück in der Prognose, `ohne_schaetzung`).
- C2 (`standardForm` mit `/g` nur über `matchAll`), C8 (bytegleich je Ziel), C10 (`eintrag`-Format 400 vor Sperre), C11
  (Vorschlag nennt `featureStatus`), O4/O6/O8 aus der Tabelle des Advisors (vorhandene `Abgenommen:` ⇒ 422; ABGEBROCHEN/ohne
  Akte ⇒ nur Meilenstein-Vorschlag; immer vier Hash-Schlüssel).
- CSRF-Probe nur PUT/POST, Host-Probe alle Routen (C4).
