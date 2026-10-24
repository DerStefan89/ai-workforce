# Plan B5b-1b-2 „Bereinigungsliste“ — v1

Stand 24.10.2026. Grundlage: `main` mit B5b-1b-1 (#377), `features/F45/plan-b5b1b-v2.md` (offene Punkte für 1b-2),
`features/F45/advisor-b5b1b.md` (B3–B7, B10, C2, C4, C8, C10, C11, Tabelle Punkte 1, 2, 4, 6, 8), F-1187, F-1188.
Abhängigkeit 1b-2 → 1b-1: `scripts/leitstand/routen-planung.mjs` (Lese-/Schreib-/Rückbau-Helfer, Server-Block),
`src/workboard/roadmap-schreiben.ts` (Meilenstein-Fenster), `src/workboard/roadmap-regeln.ts` (R1), §2-Satz.

Entscheidungen (Bauauftrag, verbindlich): kein ABGESCHLOSSEN ohne Bestätigung, genau EIN Eintrag je Bestätigung (keine
Sammel-Bestätigung); B4: „Meilenstein → LAEUFT“ nur bei genau einer R1-Abweichung im Meilenstein (heute M3/F18), keine eigene
Eintragsart, M4 nur über vier Einzelbestätigungen; B6: „Feature → ABGESCHLOSSEN“ schreibt Status + `Abgenommen: <heute>` in die
Akte, die STATUS.md-Zeile, entfernt die Ausnahme; STATUS-Zeile nicht eindeutig ⇒ 422 „STATUS.md von Hand“, nichts geschrieben;
O5: „Meilenstein → LAEUFT“ schreibt roadmap.json (Status) und entfernt die Ausnahme, keine Änderungszeile, Grund in der
Commit-Nachricht des Git-Blocks; §2 zuerst; F-1187 nicht anbieten (Vermerk „bleibt so“).

## 0 Reihenfolge
1. ARCHITECTURE.md §2 + `docs/architektur/arbeitsordner.md` (Byte-Nachweis). 2. Reine Module + node:test. 3. Routen-Modul.
4. Server-Block (±0). 5. Gate. 6. Doku/Findings/Lagebild.

## 1 ARCHITECTURE.md §2 (A2 + B6, Advisor B7)
Kern vorher (17 756 B): „… außer der Feature-Akte und `docs/projekt/roadmap.json` auf Eingabe (F45 B5a-1, B5b-1b-1). Der
Fingerabdruck … schreibt weder Index noch `.git/objects` und startet keinen Filter-Treiber.“
Nachher: „… außer der Feature-Akte, `docs/projekt/roadmap.json`, `roadmap-ausnahmen.json` und `docs/STATUS.md`
(Status-Wort) auf Eingabe (F45 B5). Der Fingerabdruck … schreibt weder Index noch `.git/objects`, startet keinen
Filter-Treiber.“ ⇒ 17 798 B (gemessen mit Node, Deckel 17 800). Paketkennungen und Gates stehen im Detail.
Detail `arbeitsordner.md`: Satz „Ausnahmen nur die Feature-Akte und die Roadmap (nächste zwei Punkte)“ → „(nächste drei
Punkte)“; Punkt „Roadmap im Projektordner“: letzter Halbsatz „wird hier nur gelesen (Schreiben erst B5b-1b-2)“ → „wird hier nur
gelesen“; neuer Punkt „Bereinigungsliste“ (Regeln aus §3 unten, ERZWUNGEN Gate f45-b5b1b2, DEKLARIERT-Liste), STATUS.md eng:
„nur das Status-Wort genau einer Standardform `features/<id>/feature.md`, Status `<WERT>` (Regel von check-status-akten)“.

## 2 Reine Module
### 2.1 `src/workboard/roadmap-schreiben.ts` (erweitert; importiert nichts aus src/feature-auftrag, C1)
- `featuresLiteral` → `literalImFenster(text, meilensteinId, muster, name)` (gleiches Fenster `"id": "<M>"` genau einmal bis zum
  nächsten `"id":`; genau ein Literal, sonst 422 „von Hand“); `verschiebeFeature` nutzt es unverändert im Verhalten.
- `setzeMeilensteinStatus(text, meilensteinId, status)` → `{ ok, text }` | `{ ok: false, grund }`: im Fenster genau ein
  `"status"\s*:\s*"…"` ⇒ nur der Wert ersetzt; Rundlauf: ganze Struktur = erwartete, `validiereRoadmapDaten` leer.
- `entferneStatusAusnahme(text, meilenstein, feature)` → `{ ok, text }` | 422: Datei JSON-sicher gescannt (Zeichenweise, Strings
  und Escapes beachtet) — Lage des Arrays `status_ausnahmen` und seiner Top-Level-Elemente; genau ein Element mit diesem Paar
  (geparst); entfernt wird von seinem Start bis zum Start des nächsten Elements, beim letzten vom Ende des vorigen bis zu seinem
  Ende, als einziges ⇒ Array-Literal wird `[]`. Rest bytegleich. Rundlauf: JSON.parse(neu) tiefengleich der erwarteten Struktur,
  `leseStatusAusnahmen(neu).befunde` leer.
- `STATUS_MD_STANDARDFORM` (Quelle `/features\/([A-Za-z0-9-]+)\/\s*feature\.md`,?\s*Status\s*`([A-Z_]+)`/g`) — aus
  `scripts/check-status-akten.mjs` hierher gezogen, dort importiert (eine Regel); nur über `matchAll` (C2).
- `setzeStatusMdStatus(text | null, featureId, status)` → `{ ok: true, text, geaendert: true }` | `{ ok: true, geaendert: false,
  hinweis }` (B5: Datei fehlt oder ohne jede Standardform ⇒ überspringen) | `{ ok: false, grund }` (Konvention vorhanden, 0
  oder > 1 Treffer für die ID ⇒ 422 „STATUS.md von Hand“). Nur das Wort zwischen den Backticks ersetzt (Zeilenenden und Umbrüche
  erhalten). Rundlauf: alle anderen Angaben gleich, die der ID genau einmal mit neuem Wort.

### 2.2 `src/workboard/roadmap-bereinigung.ts` (neu, rein)
`bereinigungsEintraege(abweichungen)` → je R1-Abweichung (`pruefeMeilensteinStatus(...).abweichungen`, auch ohne Ausnahme)
`{ eintrag: 'M3/F18', meilenstein, feature, featureStatus, ausnahme, vorschlaege: [{ entscheidung, text, nebenwirkung }] }`:
- `feature_abgeschlossen` nur bei Akte mit Status ≠ ABGEBROCHEN (Tabelle Punkt 6); Text „F18 → ABGESCHLOSSEN (heute
  FEATURE_GATE)“ (C11), Nebenwirkung „Akte: Status + Abgenommen + Änderungszeile; STATUS.md-Zeile; Ausnahme M3/F18 entfällt“.
- `meilenstein_laeuft` nur, wenn der Meilenstein genau eine Abweichung hat (B4); Text „M3 → LAEUFT“, Nebenwirkung (B10): „M3 wird
  laufender Meilenstein (die Anzeige nimmt den ersten LAEUFT als aktuellen); seine Features zählen wieder in der Prognose, ohne
  Schätzung erhöhen sie `ohne_schaetzung` späterer Meilensteine; Ausnahme M3/F18 entfällt“.
- Kein Vorschlag „Verschieben“ (F-1187).
`pruefeEintrag(text)` → `{ meilenstein, feature }` | null (Format `<M>/<F>`, F nach `FEATURE_ID_MUSTER`, M nicht leer ohne `/`).

### 2.3 `src/feature-auftrag/akte-abschliessen.ts` (neu, rein; darf src/workboard importieren)
`setzeAkteAbgeschlossen(inhalt, { datum, grund, meilenstein })` → `{ ok, inhalt }` | 422: Status fehlt oder ABGESCHLOSSEN/
ABGEBROCHEN ⇒ 422; vorhandene `Abgenommen:`-Zeile ⇒ 422 „von Hand“ (Tabelle Punkt 4); nur das Status-Wort der ersten
`Status:`-Zeile → ABGESCHLOSSEN; `Abgenommen: <datum>` direkt dahinter (C12 kosmetisch); Änderungszeile `- <datum> · Status
ABGESCHLOSSEN (Bereinigung <M>) · <grund>` unter `## Änderungen` (fehlt ⇒ Dateiende, wie B5a-1); Zeilenende der Akte. Akte-Gate
`pruefeAkteGate` (jeder Befund ⇒ 422), Rundlauf `leseFeatureStatus = ABGESCHLOSSEN`, `lesePlanung.abgenommen = datum`.
Nutzt `wendeAn`, `hinterLetzterZeile`, `erkenneZeilenende`, `findeAbschnitt` (Export statt Kopie).

## 3 Routen in `scripts/leitstand/routen-planung.mjs` (Zwischenmuster F-1131, kein `.method`)
`erkennePlanungRoute(pfad)` → `{ art: 'planung', methode: 'PUT', rohId }` | `{ art: 'bereinigung', methode: 'GET' }`
(`/api/roadmap/bereinigung`) | `{ art: 'bestaetigen', methode: 'POST' }` (`…/bereinigung/bestaetigen`) | null. Gemeinsamer
Lese-Schritt `leseBereinigungsStand(kontext)` (synchron): roadmap.json, Ausnahmen-Datei (neben roadmapPfad, C7), STATUS.md
(`docs/STATUS.md` der repoWurzel), Aktenstatus aller Roadmap-IDs frisch (`leseAktenStatus`, B10) — je Datei Bytes, Hash, Text.
- **GET**: roadmap fehlt ⇒ 200 `{ status: 'nicht_vorhanden' }`; JSON/Schema/Ausnahmen ungültig ⇒ 200 `{ status: 'ungueltig',
  fehler }` (Muster Projektion, kein 500). Sonst 200 `{ status: 'ok', befunde (R1-Befunde, Info), eintraege: [{ …2.2, quelle:
  { roadmap: 'docs/projekt/roadmap.json', akte: 'features/F18/feature.md' | null, ausnahme: 'docs/projekt/roadmap-ausnahmen.json'
  | null, status_md: 'docs/STATUS.md:421' | null }, hashes: { roadmap, ausnahmen, akte, status_md } }] }` (immer vier Schlüssel,
  string|null; genau das schickt POST zurück).
- **POST bestaetigen** `{ eintrag, entscheidung, grund, hashes }`: 400 Körper (genau diese vier Schlüssel; `eintrag` String im
  Format 2.2 — Liste oder zweiter Eintrag ⇒ 400 „genau ein Eintrag“; `entscheidung` ∈ {feature_abgeschlossen,
  meilenstein_laeuft}; `grund` über `pruefeGrund`; `hashes` genau vier Schlüssel sha256|null) — vor der Sperre (C10) → 409
  Sperre (`findeSperrendenAblauf` für das Feature des Eintrags, beide Entscheidungen, eine Regel) → **synchron**: Stand lesen;
  Hash je Datei ⇒ 409 `{ hashes (aktuell), abweichend: [Schlüssel] }`; UTF-8 je Datei ⇒ 422; roadmap fehlt/JSON/Schema ⇒ 422;
  Ausnahmen-Datei ungültig ⇒ 422 „von Hand“ (B3); CRLF in roadmap.json bzw. Ausnahmen-Datei, wenn sie Schreibziel ist ⇒ 422 (A3);
  Eintrag keine aktuelle Abweichung ⇒ 422; Entscheidung nicht unter seinen Vorschlägen ⇒ 422 mit Ausweg („erst die übrigen
  Einträge von M4 bestätigen oder von Hand“); Änderungen rechnen (2.1/2.3, je 422); **Gate vor dem Schreiben**: R1 auf dem
  neuen Stand (Status/roadmap/Ausnahmen neu) — der Eintrag ist keine Abweichung mehr, keine neuen Befunde (nur neue blockieren,
  B1); Schreiben in fester Reihenfolge Akte → STATUS.md → roadmap.json → roadmap-ausnahmen.json, je Datei zurücklesen,
  Rückbau aller bis einschließlich der scheiternden (Helfer `schreibeMitRueckbau` aus 1b-1, `[planung]`-Präfix bleibt) ⇒ 500
  mit `rueckbau`. 200 `{ status: 'ok', eintrag, entscheidung, geschrieben: [Pfade], hashes (neu, vier Schlüssel), hinweis?
  (STATUS.md übersprungen), git }`. Commit-Nachricht: `M3/F18: Bereinigung F18 → ABGESCHLOSSEN — <grund>` bzw. `M3/F18:
  Bereinigung M3 → LAEUFT — <grund>` (O5: der Grund steht nur hier).
- `feature_abgeschlossen`: Akte (2.3), STATUS.md (2.1, übersprungen mit Hinweis nach B5), Ausnahme entfernt, falls vorhanden.
  `meilenstein_laeuft`: roadmap.json (Status), Ausnahme entfernt, falls vorhanden; Akte und STATUS.md unberührt.

## 4 Server (13 240 Zeilen, ±0)
Planungsblock: `if (req.method !== planungRoute.methode) return …405`; Körper `planungRoute.methode === 'GET' ? null : await
leseJsonBegrenzt(req, 65536)` (selbe Zeile wie heute); Kommentar um die zwei Routen ergänzt (gleiche Zeilenzahl). Grenze in
`wachstumsbremse-server.json` bleibt 13 240. GET liegt bewusst vor keinem CSRF-Haken (nur Host), POST hinter ihm.

## 5 Gate `scripts/check-f45-b5b1b2-bereinigung.mjs` (in check:gates), Rot-Nachweis je Fall
Attrappe im tmp, die den heutigen Stand nachbildet (M3: F15–F17 ABGESCHLOSSEN, F18 FEATURE_GATE; M4: F20, F21, F22, F25
FEATURE_GATE neben abgeschlossenen; Ausnahmen-Datei mit den fünf; STATUS.md mit je einer Standardform, F21 umbrochen;
AF-F001 als ENTWURF-Akte ohne Meilenstein), echter Handler über HTTP plus Dispatcher:
(a) GET listet genau die 5 Abweichungen, `meilenstein_laeuft` nur bei M3/F18, `feature_abgeschlossen` bei allen fünf, vier
Hash-Schlüssel = Dateien; zusätzlich GET auf das echte Repo (nur lesend): Einträge = Paare aus `roadmap-ausnahmen.json`
(heute 5), LAEUFT nur bei Meilensteinen mit genau einer Abweichung (kein Zeitzünder nach Stefans Bestätigungen) ·
(b) 400: grund leer, unbekannte Entscheidung, `eintrag` als Liste / zweites Feld `eintraege` (zweiter Eintrag abgelehnt), Hash-
Schlüssel fehlt · (c) 409 Sperre · (d) 409 je Datei-Hash (akte, status_md, ausnahmen, roadmap je einzeln, `abweichend`) ·
(e) 422 STATUS-Zeile mehrdeutig (zwei Standardformen für F20) und keine (Konvention vorhanden, F21 fehlt) — nichts geschrieben ·
(f) 422 CRLF in roadmap-ausnahmen.json bzw. roadmap.json (bei LAEUFT) · (g) 422 M4/F20 → LAEUFT (mehrere Abweichungen, B4) ·
(h) Erfolg F20 → ABGESCHLOSSEN: Akte = erwarteter Text (Status, Abgenommen, Änderungszeile, Rest bytegleich), CRLF-Akte erhält
ihr Zeilenende, STATUS.md nur ein Wort anders, Ausnahme-Zeile weg (Rest bytegleich), danach `check-akte-meilenstein` und
`check-status-akten` als Prozess im Attrappen-Ordner grün, Git-Block mit drei Pfaden · (i) Erfolg M3 → LAEUFT: roadmap.json nur
im Status-Wert, Ausnahme weg, Akte F18 und STATUS.md bytegleich, keine Änderungszeile, Grund in der Commit-Nachricht, R1 grün ·
(j) Rückbau: STATUS.md scheitert nach Teilschreiben ⇒ Akte und STATUS.md zurück, Ausnahmen-Datei nie angefasst; Ausnahmen-Datei
scheitert ⇒ alle drei zurück · (k) CSRF für POST (Origin/Sec-Fetch-Site fremd ⇒ 403, direkt und Präfix), Host fremd ⇒ 403 für
GET und POST · (l) 405 (POST/PUT auf …/bereinigung, GET auf …/bestaetigen) · (m) Server: `erkennePlanungRoute(pfad)` genau
einmal, Modul ohne `.method`; Zeilen = Grenze.
node:test: `src/workboard/roadmap-schreiben.test.ts` (erweitert), `src/workboard/roadmap-bereinigung.test.ts`,
`src/feature-auftrag/akte-abschliessen.test.ts`; F-1188-Restfälle (Tab-Rand der Zelle, Status letzte Zeile ohne Zeilenende,
Unicode-Escape in Meilenstein-ID) als Tests nachgezogen, soweit klein.

## 6 Doku/Findings
F45-Akte: Workstreams B5b-1b-1 erledigt (#377), B5b-1b-2 laeuft; Abschnitt „Stand B5b-1b-2“. STATUS.md. Findings: F-1010
erledigt (R1 = Gate + Bereinigungsliste; die fünf Einträge bestätigt Stefan in B5b-2/Hand), F-1187 Vermerk „bleibt so,
Bereinigung nur über Status/LAEUFT“, F-1188 Nachtrag (nachgezogene Tests), Restpunkte als F-1189. Lagebild.

## 7 Gates/Tests einzeln
Neues Gate, check-f45-b5b1b1-planung-schreiben, check-f45-b5a1-akte, check-akte-meilenstein, check-status-akten,
check-feature, check-docs, check-f45-k-kontext, check-f813-csrf, check-f814-host, check-wachstumsbremse-server, Lint (Biome
nur prüfend), Typprüfung, betroffene node:test-Dateien. Kein voller check:gates.

## Offene Punkte, nicht stillschweigend entschieden
1. **Sperre auch bei `meilenstein_laeuft`** (keine Akte wird geschrieben) — eine Regel für beide oder nur bei
   feature_abgeschlossen?
2. **„GET listet heute genau 5“**: wörtlich gegen das echte Repo würde das Gate nach der ersten Bestätigung rot. Plan: exakt
   gegen die Attrappe mit dem heutigen Stand, das echte Repo gegen die Ausnahmen-Datei. Trägt das?
3. **Abweichung ohne Ausnahme** (R1-Befund, Gate schon rot): auch listen und bestätigbar? Plan: ja, Ausnahme-Entfernung entfällt.
4. **CRLF-422 nur bei Schreibziel**: roadmap.json mit CRLF blockiert `feature_abgeschlossen` nicht. Konsistent mit 1b-1?
5. **ARCHITECTURE-Kürzung** „(nur Status-Wort)“ → „(Status-Wort)“ und „und startet“ → „, startet“ (2 B Rest): Regelverlust?
6. **Schreibreihenfolge** Akte → STATUS.md → roadmap.json → Ausnahmen: sinnvoll (Ausnahme zuletzt, damit ein Teilstand nie eine
   ungedeckte Abweichung ohne Ausnahme hinterlässt — umgekehrt wäre R1 zwischendurch rot)?
7. **`Abgenommen: <datum>`** ohne Zusatz (Bauauftrag) statt „(Bereinigung: <grund>)“ aus Plan v1 1b — Grund steht in der
   Änderungszeile.
