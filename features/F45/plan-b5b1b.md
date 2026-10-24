# Plan B5b-1b „Planungsdaten schreiben“ — v1

Stand 24.10.2026. Grundlage: `main` mit B5b-1a (#376), `features/F45/plan-b5b1-v2.md` (Schnitt A1, offene Punkte für 1b),
`features/F45/advisor-b5b1.md` (A2, A3, B3, B4, B6, C4, O4, O5), `docs/projekt/fixpaket-f45.md` §2 R1/R6, Schreibmuster B5a-1
(`scripts/leitstand/routen-f35.mjs`, `src/feature-auftrag/akte-schreiben.ts`). Entscheidungen Challenger 24.10.2026
([EMPFEHLUNG]): A2, A3, O5, B6, Kennzahl ohne ABGEBROCHEN, „kein ABGESCHLOSSEN ohne Bestätigung, genau EIN Eintrag“.
Abhängigkeit 1b → 1a: `feature-planung.ts` (Format), `roadmap-regeln.ts` (R1), `roadmap-ausnahmen.json`, `roadmap_hash` in
GET /api/roadmap.

## 0 Reihenfolge
1. ARCHITECTURE.md §2 Ausnahme (A2) zuerst, Detailtext in `docs/architektur/arbeitsordner.md`; dann Code.
2. Reine Module + node:test, 3. Routen-Modul, 4. Server-Block mit Ausgleich, 5. Gate, 6. Doku/Findings/Migration P.

## 1 ARCHITECTURE.md §2 (A2, B6)
Kern: „im Projektordner bleibt der Kern lesend, außer der Feature-Akte auf Eingabe (F45 B5a-1, Gate f45-b5a1)“ wird zu
„… außer der Feature-Akte, `roadmap.json`, `roadmap-ausnahmen.json` und `STATUS.md` auf Eingabe (F45 B5a-1/B5b-1b, Gates
f45-b5a1/-b5b1b)“. Deckel `scripts/architektur-kern.json` 17 800 B, heute 17 765 B ⇒ ≈ 35 B frei; die Zeile braucht ≈ 70 B
mehr ⇒ Ausgleich durch Kürzung einer Formulierung im selben Absatz ohne Regelverlust (siehe Offener Punkt 7).
Detail (arbeitsordner.md, neuer Punkt nach „Feature-Akte im Projektordner“): Ziele genau `docs/projekt/roadmap.json` (bzw.
`roadmapPfad` der Instanz), `roadmap-ausnahmen.json` daneben, `docs/STATUS.md` der `repoWurzel`; nur über PUT
`…/features/<id>/planung` und POST `/api/roadmap/bereinigung/bestaetigen`. ERZWUNGEN (Gate f45-b5b1b): Hash je Datei (409),
Pflichtgrund (400), Sperre (409), CRLF in roadmap.json/Ausnahmen/STATUS.md ⇒ 422 (A3, §7 unverändert: der Kern schreibt dort
LF), nur Werte/`features`-Literale/eine Ausnahmezeile/ein Status-Wort textuell ersetzt, Rest bytegleich, Rundlauf (JSON.parse
gleich der erwarteten Struktur, `validiereRoadmapDaten`), Gates vor dem Schreiben (nur neue Befunde blockieren), Rücklesen.
DEKLARIERT: Rückbau über mehrere Dateien best effort (nichts committet; Antwort nennt alle Dateien und „git diff prüfen“),
nicht atomar, „nur auf Eingabe“ wie B5a-1.

## 2 Reine Module
### 2.1 `src/feature-auftrag/planung-schreiben.ts` (Akte; src/feature-auftrag darf src/workboard importieren)
- `pruefePlanungAenderung(daten)` → 400-Gründe. Körper genau `{ prioritaet?, meilenstein?, workstreams?, grund, hash,
  roadmap_hash? }`; mindestens eines von prioritaet/meilenstein/workstreams; `grund` wie B5a-1 (Steuerzeichen, Länge 500,
  Whitespace normalisiert); `hash` sha256; `roadmap_hash` Pflicht genau dann, wenn `meilenstein` da ist (sonst 400 „fehlt“
  bzw. „nur mit meilenstein“); `prioritaet` ∈ P0–P3; `meilenstein` nicht-leerer String; `workstreams` 1–100 Einträge
  `{ id, schaetzung_min, schaetzung_max }`, id eindeutig, beide Zahlen endlich ≥ 0 mit höchstens 2 Nachkommastellen und
  min ≤ max, oder beide null (= „–“).
- `bearbeitePlanungInAkte(inhalt, featureId, aenderung, datum, meilensteinText?)` → `{ ok, inhalt, geaendert }` | 422:
  Status ABGESCHLOSSEN/ABGEBROCHEN ⇒ 422 (STATUS_NICHT_BEARBEITBAR). Priorität: bestehende erste `Priorität:`-Zeile ⇒ nur der
  Wert ersetzt; sonst neue Zeile direkt hinter der ersten `Status:`-Zeile. Schätzung: strenger Abschnitt Pflicht (sonst 422
  „## Workstreams ohne Tabelle — von Hand“), Tabelle ohne Formfehler (lesePlanung) sonst 422, jede id muss eine Zeile sein;
  nur der Inhalt der Zelle „Schätzung AT“ wird ersetzt (Leerraum der Zelle bleibt), Format `x` bzw. `min–max` mit Komma
  (`0,4–0,5`), null ⇒ `–`. Unveränderter Wert zählt nicht als Änderung; nichts geändert (auch kein Meilenstein-Wechsel) ⇒ 422.
  Änderungszeile `- <datum> · <Felder> · <grund>` unter `## Änderungen` (exakte Überschrift; fehlt ⇒ am Dateiende angelegt) —
  Felder z. B. „Priorität P1, Meilenstein M5 → V1-Backlog, Schätzung B5b-2“ (E-B5-3). Zeilenende der Akte erhalten.
  Rundlauf: lesePlanung(neu) liefert genau die angefragten Werte, Status unverändert, pruefeFeatureAkteInhalt nur alte
  Befunde (`schonVorher` wie B5a-1).
- `setzeAkteAbgeschlossen(inhalt, featureId, { datum, grund, meilenstein })` → Status-Wert der ersten `Status:`-Zeile ⇒
  ABGESCHLOSSEN, Zeile `Abgenommen: <datum> (Bereinigung: <grund>)` hinter der Status-Zeile (O4; steht schon eine
  `Abgenommen:`-Zeile ⇒ 422 „von Hand“), Änderungszeile `- <datum> · Status ABGESCHLOSSEN (Bereinigung <M>) · <grund>`;
  Rundlauf wie oben.
- Aus `akte-schreiben.ts` exportiert statt kopiert: `wendeAn`, `hinterLetzterZeile`, `enthaeltSteuerzeichen`.

### 2.2 `src/workboard/roadmap-schreiben.ts` (rein; JSON-Texte und STATUS.md)
- `verschiebeFeature(text, featureId, ziel)`: Ausgangs-Meilenstein = der eine, der die ID führt (keiner = Einplanen einer
  ENTWURF-Akte; mehrere ⇒ 422); Ziel unbekannt ⇒ 422; gleich ⇒ keine Änderung. Textuell: je Meilenstein-Objekt der Bereich ab
  `"id": "<M>"` bis zum nächsten `"id":`, darin genau ein `"features": [ … ]`-Literal (sonst 422 „roadmap.json von Hand“);
  das Literal wird neu als `["F1", "F2"]` geschrieben, ID ans Ende des Ziels. Rundlauf: JSON.parse(neu) tiefengleich der
  erwarteten Struktur, `validiereRoadmapDaten` leer.
- `setzeMeilensteinStatus(text, id, status)`: dasselbe Fenster, genau ein `"status": "<…>"` ⇒ nur der Wert ersetzt; Rundlauf.
- `entferneAusnahmen(text, treffer)`: jedes Objekt-Literal in `status_ausnahmen` einzeln geparst; die passenden samt Komma
  (vorn bzw. hinten) entfernt; Rundlauf gegen die erwartete Liste; Datei bleibt auch mit leerer Liste.
- `setzeStatusMdStatus(text, featureId, status)`: Standardform-Muster aus `check-status-akten.mjs` (als Konstante
  hierher gezogen und dort importiert, eine Regel); genau ein Treffer für die ID ⇒ nur das Wort zwischen den Backticks
  ersetzt; 0 oder > 1 ⇒ 422 „STATUS.md von Hand“ (B6).
- `bereinigungsVorschlaege(abweichung)`: `feature_abgeschlossen` („F18 → ABGESCHLOSSEN“, Nebenwirkung „Akte, STATUS.md,
  Ausnahme M3/F18“) — nur wenn eine Akte mit Status ≠ ABGEBROCHEN existiert; `meilenstein_laeuft` („M3 → LAEUFT“, Nebenwirkung
  „M3 wird ein laufender Meilenstein (aktueller Meilenstein der Anzeige, B6); alle Ausnahmen von M3 entfallen“).

### 2.3 Kennzahl (Entscheidung Challenger)
`berechneKennzahlen`: `features_abgenommen.gesamt` ohne Status ABGEBROCHEN; Meilensteine unverändert. Test + Kopf.

## 3 Routen-Modul `scripts/leitstand/routen-planung.mjs` (Zwischenmuster F-1131, ohne `.method`)
- `erkennePlanungRoute(pfad)` → `{ art: 'planung', rohId }` (`/api/features/<id>/planung`) | `{ art: 'bereinigung' }`
  (`/api/roadmap/bereinigung`) | `{ art: 'bestaetigen' }` (`/api/roadmap/bereinigung/bestaetigen`) | null.
- `fuehrePlanungRouteDurch(route, koerper, kontext)`; kontext `{ repoWurzel, roadmapPfad, workflows(), auftraege(), datum?,
  schreibe? (nur Tests: Rückbau) }`. Aus routen-f35.mjs exportiert statt kopiert: `loeseFeatureAktePfadAuf`, `sha256`,
  `lokalesDatum`, `antwort`, `baueGitBlock` (verallgemeinert auf eine Pfadliste, C4; Aufrufer in routen-f35 angepasst).
- **PUT planung** (Reihenfolge wie B5a-1): 400 id → 404 Akte → 400 Körper → 409 Sperre (`findeSperrendenAblauf`) → ab hier
  synchron: Akte lesen, Hash ⇒ 409 `{ hash }`, UTF-8 ⇒ 422; bei `meilenstein`: roadmap.json lesen, CRLF ⇒ 422 (A3), Hash ⇒
  409 `{ roadmap_hash }`, Ausnahmen-Datei lesen; Akte bearbeiten (422); Roadmap verschieben (422); Gates auf dem neuen Stand:
  `pruefeAkteMeilenstein` (IDs, E-B5-2) und `pruefeMeilensteinStatus` (R1) — neue Befunde ⇒ 422 „erst bereinigen“ mit
  `verstoesse` (B4); schreiben (Akte, dann roadmap.json), je Datei zurücklesen; Fehler ⇒ bereits geschriebene Dateien mit
  alten Bytes zurück (best effort) ⇒ 500 mit Liste. 200 `{ status:'ok', id, hash, roadmap_hash?, geaendert, git }`, Git-Block
  mit allen geänderten Pfaden.
- **GET bereinigung**: liest roadmap.json, Akten-Status aller Roadmap-IDs, Ausnahmen, STATUS.md; `pruefeMeilensteinStatus`
  ⇒ `{ status:'ok', hashes: { roadmap, ausnahmen, status_md } (null = Datei fehlt), befunde, eintraege: [{ eintrag:'M3/F18',
  meilenstein, feature, featureStatus, ausnahme, quelle, akte_hash, vorschlaege: [{ entscheidung, text, nebenwirkung }] }] }`;
  roadmap fehlt/ungültig ⇒ 200 `{ status: 'nicht_vorhanden' | 'ungueltig' }` (Muster Projektion, kein 500).
- **POST bestaetigen** `{ eintrag, entscheidung, grund, hashes: { roadmap, ausnahmen, akte, status_md } }`: 400 Körper → bei
  feature_abgeschlossen 409 Sperre → synchron: alle vier Dateien lesen, Hashes ⇒ 409 mit aktuellen; CRLF in roadmap/
  Ausnahmen/STATUS.md ⇒ 422; Eintrag muss eine aktuelle Abweichung sein, Entscheidung einer ihrer Vorschläge (sonst 422).
  `feature_abgeschlossen`: Akte (2.1), STATUS.md-Zeile (B6, sonst 422 nichts geschrieben), Ausnahme M/F entfernt (falls da).
  `meilenstein_laeuft`: roadmap.json-Status, alle Ausnahmen von M entfernt (sonst verwaist ⇒ R1 rot), keine Änderungszeile
  (O5), Grund in der Commit-Nachricht. Gate vor dem Schreiben: R1 auf dem neuen Stand — der Eintrag ist keine Abweichung
  mehr, keine neuen Befunde; Akte-Gate nur alte Befunde. Schreiben, Rücklesen, Rückbau wie PUT. 200 `{ status:'ok', eintrag,
  entscheidung, geschrieben: [Pfade], hashes, hinweis, git }`. Genau ein Eintrag je Aufruf; kein Sammel-Endpunkt.

## 4 Server (Zeilen 13 264 dürfen nicht steigen)
Ein Block direkt hinter dem Akte-Block: `erkennePlanungRoute(pfad)`; Methode je `art` im Server (`'planung'` ⇒ PUT,
`'bereinigung'` ⇒ GET, `'bestaetigen'` ⇒ POST, sonst 405; B3), Körper `leseJsonBegrenzt(req, 65536)` nur für
schreibende Arten, Rückrufe `sammleWorkflows`/`sammleAuftraege`. ≈ 9 Zeilen + 1 Import. Ausgleich: einen reinen, nicht
schreibenden Helfer des Servers nach `scripts/leitstand/*.mjs` auslagern (Offener Punkt 5).

## 5 Gate `scripts/check-f45-b5b1b-planung-schreiben.mjs` (in check:gates), Rot-Nachweis je Fall
Attrappenprojekt im tmp, echter Handler über HTTP plus Multi-Projekt-Dispatcher.
(a) PUT 400 (grund leer; meilenstein ohne roadmap_hash; unbekanntes Feld) · (b) 409 Sperre · (c) 409 Akte-Hash · (d) 409
Roadmap-Hash · (e) 422 (Gate rot: Verschieben aus einem ABGESCHLOSSEN-Meilenstein mit Ausnahme ⇒ „erst bereinigen“) ·
(f) Erfolg: Priorität neu + Schätzung, LF und CRLF-Akte, bytegleich außerhalb (Priorität-Zeile, Zelle, Änderungen),
Zurücklesen = Hash, Git-Block · (g) Meilenstein-Wechsel: ID am Ende des Ziels, roadmap.json sonst bytegleich, Git-Block mit
beiden Pfaden · (h) CRLF-roadmap ⇒ 422, nichts geschrieben · (i) Bereinigung: GET listet die Abweichungen mit Vorschlägen;
POST feature_abgeschlossen schreibt Akte + STATUS.md + entfernt genau diese Ausnahme, R1 danach ohne Befund für den Eintrag,
check-status-akten-Regel grün auf der Attrappe; POST meilenstein_laeuft ohne Änderungszeile; STATUS.md mit 0 bzw. 2
Standardformen ⇒ 422 nichts geschrieben; zweiter Eintrag bleibt unberührt · (j) Kennzahl: ABGEBROCHEN nicht in gesamt
(Gegenprobe ohne ABGEBROCHEN) · (k) CSRF je Route (Origin/Sec-Fetch-Site fremd ⇒ 403, direkt und über den Präfix), Host
fremd ⇒ 403 · (l) 405 je Route · (m) Rückbau: zweites Schreiben scheitert ⇒ 500, erste Datei bytegleich zurück, Antwort
nennt beide Pfade und „git diff“ · (n) Server: `erkennePlanungRoute(pfad)` genau einmal.
Dazu node:test `src/feature-auftrag/planung-schreiben.test.ts`, `src/workboard/roadmap-schreiben.test.ts`.

## 6 Doku/Findings/Migration
F45-Akte: Entscheidungen (Kennzahl ohne ABGEBROCHEN; genau ein Eintrag; A2 um STATUS.md erweitert), Workstreams: B5b-1a
erledigt (#376, 2026-10-24), B5b-1b laeuft (Begonnen 2026-10-24), P Ist `1,25` (Notiz: „≈ 6 h Messung nicht eingerechnet“,
einheitlich zu B0), Abschnitt „Stand B5b-1b“. STATUS.md, findings.md (neuer BUG ab F-1186; Nachträge F-976, F-944, F-990,
F-984, F-1010), Lagebild. Gate-Liste `state/gates.md` falls dort geführt.

## 7 Gates/Tests einzeln
Neues Gate, check-f45-b5a1-akte, check-f45-b5b1a-planung, check-feature, check-akte-meilenstein, check-status-akten,
check-docs, check-f813-csrf, check-f814-host, check-wachstumsbremse-server, Architektur-Kern-Deckel, Lint, Typprüfung,
betroffene node:test-Dateien. Kein voller check:gates.

## Offene Punkte, nicht stillschweigend entschieden
1. **meilenstein_laeuft entfernt alle Ausnahmen des Meilensteins** (M4: F20, F21, F22, F25 auf einmal) — eine Entscheidung,
   mehrere Ausnahmezeilen. Ist das mit „genau EIN Eintrag“ vereinbar, oder nur zulassen, wenn der Meilenstein genau eine
   Abweichung hat?
2. **STATUS.md fehlt** (Fremdprojekt): überspringen (DEKLARIERT, Hinweis) oder 422?
3. **Ausplanen** (`meilenstein: null`) nicht unterstützt (400) — ok?
4. **Vorhandene `Abgenommen:`-Zeile** bei feature_abgeschlossen ⇒ 422 statt ersetzen — ok?
5. **Server-Ausgleich**: welcher Helfer; alternativ die Planungsarten in den Akte-Block falten (eine Erkennung, Methode je art).
6. **Vorschläge**: ABGEBROCHEN oder ohne Akte ⇒ nur meilenstein_laeuft.
7. **ARCHITECTURE-Deckel**: Kürzung im selben Absatz vs. Detail auslagern.
8. **Hashes im POST**: immer alle vier Schlüssel (string|null) statt je Entscheidung.
9. Textuelles Fenster `"id"` bis nächstes `"id"` — trägt das bei Schlüsselreihenfolge ≠ id-zuerst? (Rundlauf fängt es ⇒ 422.)
