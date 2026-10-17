# Plan v1 — F45 B2b-3b-2b-1b „R1: Stefan-Ablehnung nur mit eindeutigem Ablehnungstext“

Stand 17.10.2026. Branch `f45/b2b3b2b1b-r1` (Basis main nach #355 = 2b-1a). Kanal bleibt AUS. Quelle: Bauauftrag (Challenger),
Entscheidung E1 in `plan-b2b3b2b1a-v2.md` (Marke statt Takt), Advisor `advisor-b2b3b2b1.md` B1 (Gegenmittel), B4, B5, B14.

**CONTEXT / Abhängigkeit:** baut auf 2b-1a (Schema v1 mit `ab`/`herkunft`, `rueckfrageZugang`, `setzeProtokollZusammen`,
`bestaetigeProtokoll` mit Speicher als Wahrheit) — alles auf main.

Grenzen: Kanal aus (kein Produktaufrufer setzt `rueckfrage`); keine neuen Routen (F-1131); `scripts/leitstand-server.mjs` netto ≤ 0
(Ziel: unverändert), `check-wachstumsbremse-server` grün, Grenze/Bestand nicht anheben; `starteWorkflowSchritt(` 6×; keine
gesperrten Dateien; package.json nur die Gate-Zeile; `kontrollzustand/` nie stagen; nicht selbst committen.

## 0. Ist-Stand (belegt)
- Vermittlung `beantworte` (`scripts/leitstand/rueckfrage-vermittlung.mjs:337`): Ablehnung immer mit demselben Text
  `'Stefan hat den Befehl abgelehnt.'`; Protokoll `stefan_abgelehnt` ohne Bezug zum Text.
- MCP-Skript reicht `message` wörtlich als `deny` an die CLI (`scripts/leitstand/rueckfrage-mcp.mjs:139-144`); die CLI schreibt sie
  wörtlich als `tool_result` `{ content: "<message>", is_error: true, tool_use_id }` (`features/F45/nachweise/b2b3a/rohstrom-deny.ndjson:9`);
  statische Sperren haben eigenen CLI-Text (`spike.md` Z23/Z26: „Permission to use Bash with command … has been denied.“).
- Abgleich A6 `gleicheAblehnungenAb(denials, protokoll, laufId)` (`src/rueckfrage/protokoll.ts:190`) prüft nur id, tool_name,
  input_hash, art. Der Evaluator (`src/result-evaluator/index.ts:368`) hat dabei den hash-geprüften Rohstrom (`rohstrom.stdout`,
  Z.273-331) bereits in der Hand.
- B1-Lücke (Advisor): A (Rückfrage) und B (statisch gesperrt) im selben Turn; während Stefan über A nachdenkt, stellt ein Prozess
  mit Token B und lehnt über die Antwort-Route ab ⇒ `stefan_abgelehnt` für B ⇒ main: ERFOLGREICH.

## 1. Regel R1
- Vermittlung, Ablehnung durch Stefan: Text `Stefan hat den Befehl abgelehnt. (Ref <randomUUID>)` je Ablehnung neu; er geht wie heute
  als `message` an den Warter (Long-Poll ⇒ MCP ⇒ CLI). Der Protokolleintrag `stefan_abgelehnt` trägt `ablehnung_hash = sha256Hex(text)`.
  Der Text selbst steht nirgends dauerhaft (nur der Hash) — er ist kein Geheimnis, aber es gibt keinen Grund, ihn abzulegen.
- Speicherstand `eintraegeVon`: fünftes Feld `ablehnung_hash`, **nur wenn vorhanden** (Spread), damit Einträge anderer Arten
  unverändert vier Felder haben. `bestaetigeProtokoll`: `ablehnung_hash` in `VERGLEICHS_FELDER` — sonst könnte eine gefälschte Datei
  für eine echte ID den Hash des statischen CLI-Texts eintragen (Hash ohne Geheimnis nachrechenbar).
- Abgleich: `gleicheAblehnungenAb(denials, protokoll, laufId, ergebnisse)`; `ergebnisse: ReadonlyMap<string, readonly
  { fehler: boolean; text: string | null }[]>` (alle tool_result-Blöcke je tool_use_id aus dem Rohstrom). Eine Ablehnung zählt als
  Stefans nur, wenn zusätzlich zu heute: es gibt ≥ 1 tool_result zu der ID, **jedes** hat `fehler === true` und
  `sha256Hex(text) === eintrag.ablehnung_hash` (`===`, kein Textmuster — Gate f7 (a) bleibt sinngemäß). Sonst `nicht_nur_stefan`
  ⇒ VERWEIGERT (fehlt der Text, weicht er ab, kein tool_result, doppelt mit Abweichung).
- `text` eines tool_result: `content` als String, oder ein Array aus genau einem Block `{ type: 'text', text }`; jede andere Form ⇒
  null (zählt nicht). Belegt ist nur die String-Form.
- Leser des Rohstroms: neue reine, exportierte Funktion `ermittleToolErgebnisse(zeilen)` in `src/claude-code-gateway/index.ts`
  neben `ermittleHintergrundAufrufe` — nutzt `parseObjekt` und erweitert `leseToolResultBloecke` um `text` (dieselbe Zeilenregel,
  Subagent-Zeilen zählen mit wie dort). Keine Gateway-**Option**, kein Argv-Eingriff (Auftrag 2: nicht nötig, der Rohstrom liegt
  nach dem Lauf hash-geprüft beim Evaluator).
- Evaluator: baut `ergebnisse` nur, wenn `rueckfragen !== undefined && bypassVerdachtAnzahl === 0 && denials.length > 0`, aus
  `rohstrom.stdout.split('\n')`, und reicht sie an den Abgleich.
- Takt/Ordnung entfällt (E1). Kein Eingriff in Controller-Optionen, Server oder MCP-Skript.

## 2. Protokoll — Schema v1 erweitert (kein v2)
- `ablehnung_hash`: optional im Schema (`pattern ^[0-9a-f]{64}$`, Beschreibung: sha256 des eindeutigen Ablehnungstexts; nur an
  `stefan_abgelehnt` und dort Pflicht — Validator). Validator: an `stefan_abgelehnt` Pflicht, an anderen Arten verboten
  (Muster `herkunft`). Schreiber `baueEintrag` übernimmt das Feld.
- Warum v1 statt v2: Kanal war nie an, es gibt keine `rueckfragen-*`-Dateien im Betrieb (Advisor B11); ein Bump bräuchte zweite
  Leselogik ohne Nutzen. Beispiel `schemas/examples/kontrollzustand-rueckfragen-payload.valid.json` bekommt den Hash; neues Beispiel
  `…invalid-ablehnung-ohne-hash.json` (in Gate b2b3b1b (p2) aufgenommen, das die Beispiele mit dem Validator prüft).

## 3. Gate und Tests
Neues Gate `scripts/check-f45-b2b3b2b1b-r1.mjs` (package.json: eine Zeile in `check:gates`). Rot gegen main per git archive je Fall.
- (r1d) **echter Controller**: echter Server mit Kanal (`rueckfrage: { an: true, url }`, Arbeitsordner, Muster Gate 2b-1a);
  `fuehreAufgabeDurchFn` ruft das echte `fuehreAufgabeDurch` mit den Server-Eingaben und -Optionen (Kanal, `rueckfrageZugang`,
  `basisVerzeichnis`, `cwd` unverändert) und ergänzt nur die F4-Startfreigabe-Fixture (Muster `check-f14-abbruch.mjs`:
  Wegwerf-Repo, Baseline, Wirksamkeitsnachweis; `werkzeugStartziel = [process.execPath]`, Version/Kontext der Fixture,
  `settingsPfad` der Fixture) und eine Starter-Attrappe. Die Attrappe spielt die CLI: stellt A (`tA`, Bash) über die Token-Route
  wie das MCP-Skript, Stefan lehnt A über die Antwort-Route ab, die „CLI“ holt die Entscheidung über die Long-Poll-Route; ein
  zweiter „Prozess“ mit Token stellt B (`tB`, Bash, statisch gesperrt) nachträglich und lehnt über die Antwort-Route ab. stdout:
  tool_use A+B, tool_result A mit Stefans Text (aus dem Long-Poll), tool_result B mit statischem CLI-Text, result mit
  `permission_denials` [A, B]. Erwartet: Terminal VERWEIGERT. Rot gegen main: ERFOLGREICH (`abgelehnt_durch_stefan: 2`).
- (r1e) Gegenprobe, gleicher Aufbau: nur A, echte Stefan-Ablehnung, tool_result mit dem Text aus dem Long-Poll ⇒ ERFOLGREICH
  (`abgelehnt_durch_stefan: 1`). Gegen main ebenfalls ERFOLGREICH (Gegenprobe, kein Rot-Fall).
- (r1t) rein, Abgleich: tool_result fehlt / `is_error` false / anderer Text / zweiter abweichender Block / Array-Form mit einem
  Textblock (zählt) / gefälschte Datei mit Hash des statischen Texts ⇒ `bestaetigeProtokoll` „weicht ab (ablehnung_hash)“.
  Rot gegen main: Export bzw. Feld fehlt.
- (f) Server unverändert (`git diff` nicht nötig: `starteWorkflowSchritt(` 6×, Option `rueckfrage` von keinem Produktaufrufer);
  ARCHITECTURE §4 nennt die R1-Regel (`ablehnung_hash`).
Nachziehen (Verhalten geändert, im Kopf ehrlich vermerkt): jede Stelle, die heute „Stefan-Ablehnung ⇒ ERFOLGREICH“ ohne
tool_result erwartet — Gate 2b-1a (g) (`klassifiziere` bekommt tool_result-Zeilen), Gate b2b3b2a, b2b3b1b, b2b3b1; Unit-Tests
`protokoll.test.ts`, `result-evaluator.test.ts`, `execution-controller.test.ts`, `rueckfrage-vermittlung.test.mjs`,
`rueckfrage-protokoll.test.mjs`, Gateway-Test für `ermittleToolErgebnisse`.

## 4. Doku
- ARCHITECTURE §4: R1-Satz (eindeutiger Text, Hash im Protokoll und Speicher, zählt nur bei passendem tool_result; Rest DEKLARIERT:
  die Regel setzt voraus, dass die CLI die Ablehnungsnachricht wörtlich als tool_result schreibt — fehlt/ändert sich das, zählt keine
  Stefan-Ablehnung, sicher aber wirkungslos; im echten Lauf in 2b-2 belegen, F-1128 (4)).
- `state/findings.md` F-1128: Nachtrag „R1 erledigt“; F-1128 bleibt offen ((3), (4) + neue Prüfpflicht „tool_result trägt den Text“,
  (7)–(10)).

## Offene Punkte, nicht stillschweigend entschieden
- O1 Ort der Prüfung: im Abgleich (Evaluator, hash-geprüfter Rohstrom) statt live über eine Gateway-Option. Gibt es einen Weg,
  wie ein Prozess mit Token den Rohstrom beeinflussen kann (z. B. ein eigenes Werkzeug, dessen Ergebnis den Text enthält)?
  Annahme: der Text ist erst nach Stefans Entscheidung bekannt und geht nur an den Long-Poll-Warter; das tool_result zu B schreibt
  die CLI selbst.
- O2 „jedes tool_result zur ID muss passen“ statt „mindestens eines“ — strenger, kostet nichts, falls die CLI nie doppelt schreibt.
- O3 Nur Hash statt Text im Protokoll (Auftrag lässt beides zu).
- O4 Wettlauf um eine echte ID: stellt der fremde Prozess A **vor** dem MCP-Skript, bekommt das MCP-Skript „Rückfrage-ID doppelt“
  (auto_deny) ⇒ tool_result mit diesem Text ⇒ passt nicht ⇒ VERWEIGERT (sicher). Richtig?
- O5 r1d mit echtem `fuehreAufgabeDurch`, aber F4-Felder (Startziel, Version, Kontext, settingsPfad) in der Hülle ersetzt — reicht
  das als „echter Controller“?
- O6 Content-Formen außer String (Array mit einem Textblock) annehmen oder nur String?
