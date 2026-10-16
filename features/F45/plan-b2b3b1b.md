# F45 B2b-3b-1b — Plan v1 (Rückfrage-Kanal „Auswertung“, Kanal bleibt aus)

Branch `f45/b2b3b1b-auswertung` (von main `80774cb`, #349). Grundlage: `features/F45/plan-b2b3b1.md` §4/§5,
`features/F45/plan-b2b3b1a-v2.md` (Schnitt 3b-1a → 3b-1b → 3b-2, A5, A6), F-1126 (1).

CONTEXT: baut auf 3b-1a auf — Vermittlung `scripts/leitstand/rueckfrage-vermittlung.mjs` ruft je Entscheidung
`protokolliere(laufId, { tool_use_id, tool_name, input_hash, art, grund, zeit, befehl|frage, antwort? })` VOR der
Auslieferung; `input_hash = sha256Hex(kanonischesJson(input ?? null))`; jede `tool_use_id` je Lauf gemerkt, eine zweite
Anfrage derselben ID ⇒ zweiter Eintrag `auto_deny` „Rückfrage-ID doppelt“. Spike-Beleg: `rechte_pruefen` bekommt
dieselbe `tool_use_id` und dasselbe `input` wie der spätere Eintrag in `permission_denials`
(`features/F45/nachweise/b2b3a/mcp-protokoll-deny.ndjson` Z5 ↔ `rohstrom-deny.ndjson` Z15: `{ tool_name, tool_use_id,
tool_input }`).

Ziel: Eine Ablehnung **allein durch Stefan** macht den Lauf nicht mehr VERWEIGERT, sondern ERFOLGREICH mit
`daten.abgelehnt_durch_stefan`. Alles andere bleibt wie heute. Kanal bleibt aus — in Produktläufen gibt es weder Kanal
noch Protokoll, also ändert sich dort kein Ergebnis.

## 1 Reine Regel in `src/rueckfrage/` (Erweiterung, neu `protokoll.ts` + Tests)

- `RUECKFRAGE_PROTOKOLL_ARTEN` — **einzige Quelle** der sieben Arten; `PROTOKOLL_ARTEN` in der Vermittlung wird daraus
  re-exportiert (nicht zweimal gepflegt).
- `validiereRueckfrageProtokoll(daten): string[]` (handgeschrieben, Muster `validiereAenderungsuebersichtDaten`, kein ajv):
  `{ rueckfragen_schema: 'v0', lauf_id: string≥1, eintraege: Eintrag[] }`, `additionalProperties: false`;
  Eintrag `{ tool_use_id: string(1..200)|null, tool_name: string(1..200), input_hash: /^[0-9a-f]{64}$/, art: Art,
  grund: string(≤500), zeit: string≥1, befehl?: string(≤2000), frage?: string(≤2000), antwort?: string(≤2000) }`,
  `additionalProperties: false`.
- `neutralisiereText(text, { arbeitsordner, home, temp })` — ersetzt in der Reihenfolge Arbeitsordner → Temp → Home je
  die Schreibweisen roh, `\`→`/`, JSON-escaped (`\\`) durch `<ARBEITSORDNER>`, `<TEMP>`, `<HOME>`; win32 ohne
  Groß-/Kleinschreibung; kappt auf 2000 Zeichen. Leere/fehlende Orte werden übersprungen.
- `gleicheAblehnungenAb(denials, protokoll)` → `{ art: 'nur_stefan', anzahl } | { art: 'nicht_nur_stefan' }`
  (Abgleich A6, rein, fail closed):
  1. `validiereRueckfrageProtokoll(protokoll)` nicht leer ⇒ `nicht_nur_stefan` (ungültig = fehlend).
  2. `denials` leer ⇒ `nicht_nur_stefan` (der Aufrufer fragt nur bei > 0).
  3. jede Ablehnung: `tool_use_id` nicht leerer String, **eindeutig** unter den Ablehnungen; im Protokoll **genau ein**
     Eintrag mit dieser ID; dieser hat `art === 'stefan_abgelehnt'`, `tool_name === denial.tool_name`,
     `input_hash === sha256Hex(kanonischesJson(denial.tool_input ?? null))`. Eine Abweichung ⇒ `nicht_nur_stefan`.
  4. sonst `nur_stefan` mit `anzahl = denials.length`.

## 2 Protokoll-Schreiber `scripts/leitstand/rueckfrage-protokoll.mjs` (neu) + Schema

- Schema `schemas/kontrollzustand-rueckfragen-payload.schema.json`, Beispiele `schemas/examples/
  kontrollzustand-rueckfragen-payload.valid.json`, `.invalid-unbekannte-art.json`, `.invalid-unbekanntes-feld.json`.
- `erzeugeRueckfrageProtokollSchreiber({ profilReferenz, basisVerzeichnis, home, temp })` → `(laufId, eintrag,
  { arbeitsordner }) => void`:
  zustandslos — lädt die letzte Version von `rueckfragen-<laufId>` (`ladeArtefaktVersion`, stiller Schreiber), hängt den
  neutralisierten Eintrag an (`befehl`/`frage`/`antwort`/`grund`: `neutralisiereText` dann `maskiereGeheimnisse`),
  prüft `validiereRueckfrageProtokoll` und registriert eine **neue Version** über `registriereKernArtefakt`
  (Kontrollzustand, Hash-Kette, Herkunft `{ erzeuger: 'kern', schritt: 'rueckfrage-protokoll' }`). Vorhandene Version
  ungültig oder neue ungültig ⇒ Wurf (die Vermittlung fängt ihn, Entscheidung unverändert, geloggt) — die Auswertung
  fällt dann für die betroffene Ablehnung auf VERWEIGERT (sichere Richtung).
- Vermittlung: `protokolliere(laufId, eintrag, { arbeitsordner })` — dritter Parameter mit dem Arbeitsordner des Laufs
  (für die Neutralisierung); Lauf-Kontext wird an `entscheide`/`schreibeProtokoll` durchgereicht (auch in `beendeLauf`,
  wo der Lauf schon aus der Map entfernt ist).
- Server `erzeugeRequestHandler`: Standard-Vermittlung erst nach `profilReferenz` erzeugen, mit dem Schreiber
  (`basisVerzeichnis` des Handlers, `homedir()`, `tmpdir()`); injizierte `optionen.rueckfrageVermittlung` bleibt
  unverändert (bisherige Gate-Fälle). Kein Eingriff in D13-Bereich, Routen, `starteWorkflowSchritt`.

## 3 Result Evaluator (`src/result-evaluator`)

- `KlassifikationsEingaben.rueckfragen?: unknown` — die Rohdaten der letzten Protokoll-Version oder `null`.
- An der Stelle `denials.length > 0` (nach allen FEHLGESCHLAGEN-Gründen, Reihenfolge §4 unverändert): nur wenn
  `rueckfragen !== undefined` **und** `bypassVerdachtAnzahl === 0` **und** `gleicheAblehnungenAb(...)` = `nur_stefan`
  ⇒ `{ ergebnis: 'ERFOLGREICH', ...zusatzFelder, daten: { abgelehnt_durch_stefan: anzahl } }`. Sonst unveränderter
  VERWEIGERT-Zweig (gleiche Felder, gleiche `daten`).
- `KlassifikationsErgebnis` ERFOLGREICH: optionales `abgelehnt_durch_stefan?: number`.
- Kein `.includes(`/`.match(`/`.indexOf(`/`.search(`/`.test(` in `src/result-evaluator/*.ts` (Gate f7 (a)).
- Fehlt `rueckfragen` ⇒ exakt heutiger Code-Pfad (kein Laden, kein Abgleich).

## 4 Controller (`src/execution-controller`)

- `AusfuehrungsEingaben.rueckfrageKanal?: { token: string; arbeitsordner: string; werkzeugNamen: string[] }` — das Feld
  setzt der Server schon heute bei eingeschaltetem Kanal (`loeseAusfuehrungsEingabenAuf`), jetzt typisiert.
- Nach dem Gateway, vor `klassifiziereLauf`: nur mit `eingaben.rueckfrageKanal !== undefined` ⇒
  `ladeArtefaktVersion('rueckfragen-<laufId>')?.daten ?? null` ⇒ `rueckfragen`. Ohne Feld kein Lesen, Eingaben an den
  Evaluator unverändert.
- Bekannte Grenze: `lauf_beendet`-Einträge entstehen in `beendeLauf` erst NACH der Klassifikation (`.then` im Server) —
  für die Auswertung irrelevant (offene Rückfrage beim Lauf-Ende ⇒ kein `stefan_abgelehnt` ⇒ VERWEIGERT bzw.
  Zeitgrenze/Abbruch FEHLGESCHLAGEN).

## 5 F-1126 (1) — entschieden: bewusst ohne Eintrag

400/413 der Token-Routen (Formfehler, Body > 64 KiB) erzeugen weiterhin **keine** Protokollzeile: ohne lesbaren Body gibt
es keine verlässliche `tool_use_id`/`input_hash`. Folge über A6: eine solche Ablehnung hat keinen Eintrag ⇒ VERWEIGERT.
Gate belegt beides (413 ⇒ Protokoll unverändert; Ablehnung ohne Eintrag ⇒ VERWEIGERT). F-1126: Punkt (1) erledigt,
Rest offen.

## 6 Gate `scripts/check-f45-b2b3b1b-auswertung.mjs` (neu, eine Quelle, in `check:gates`)

Eigenes Gate (nicht im 3b-1a-Gate), damit der Rot-Nachweis gegen main je Fall zeigt: Module/Exporte werden per
dynamischem `import()` geladen, jeder Fall meldet einzeln. Wegwerf-Kontrollzustand im Temp-Ordner.
- (e1) Ablehnung nur durch Stefan (Protokoll `stefan_abgelehnt`, gleiche ID/Name/Hash) ⇒ ERFOLGREICH, Terminalmarke
  `daten.abgelehnt_durch_stefan = 1` (zwei Ablehnungen ⇒ 2).
- (e2) gemischt (Stefan + auto_deny bzw. Ablehnung ohne Eintrag) ⇒ VERWEIGERT.
- (e3) nur auto_deny / zeitueberschreitung / Werkzeugsatz-Sperre ohne Eintrag ⇒ VERWEIGERT.
- (e4) ohne Protokoll: Feld fehlt, `null`, ungültig ⇒ VERWEIGERT; **bitgleich**: Ergebnis-Objekt und Terminalmarken-
  Payload (ohne Zeit/Hash-Kette) für einen Satz Rohströme (keine Ablehnung, Ablehnungen, mit Verbotswert, kein
  Ergebnisobjekt) mit fehlendem Feld = mit `null`/ungültigem Protokoll.
- (p1) Abgleich A6 Rotfälle: andere `tool_use_id`, anderer `tool_name`, anderer Input (Hash), zwei Einträge je ID
  (doppelte Anfrage), doppelte Ablehnungs-ID, Ablehnung ohne `tool_use_id`, `stefan_abgelehnt` + Verbotswert ⇒ VERWEIGERT.
- (p2) Schema + Validator: Beispiele gültig/ungültig; Schema-Datei JSON; Arten = `RUECKFRAGE_PROTOKOLL_ARTEN` = Enum im
  Schema = `PROTOKOLL_ARTEN` der Vermittlung.
- (p3) Schreiber am echten Server (Kanal an, Muster 3b-1a-Gate, Standard-Vermittlung ohne Injektion): Bash ⇒ ablehnen ⇒
  Artefakt `rueckfragen-<laufId>` mit Eintrag `stefan_abgelehnt`, neue Version je Entscheidung, Befehl ohne
  Arbeitsordner-/Temp-/Home-Pfad (`<ARBEITSORDNER>`), Geheimnis maskiert, Validator grün; 413 ⇒ keine neue Version
  (F-1126 (1)).
- (p4) Controller: `fuehreAufgabeDurch` mit Starter-Attrappe (Ablehnung im Ergebnisobjekt) und vorab registriertem
  Protokoll: mit `rueckfrageKanal` ⇒ ERFOLGREICH; ohne ⇒ VERWEIGERT (liest nicht).
- (f) Quelltext: `starteWorkflowSchritt(` in `scripts/leitstand-server.mjs` 6×; kein Produktaufrufer setzt die
  Einschalt-Option (bleibt im 3b-1a-Gate, hier nur der Zählfall); ARCHITECTURE §4 enthält den Satz.
Unit-Tests: `src/rueckfrage/protokoll.test.ts` (Validator, Neutralisierung, Abgleich), Evaluator-Fälle in
`result-evaluator.test.ts`, Controller-Fall in `execution-controller.test.ts`, Vermittlung (dritter Parameter).

## 7 Doku und Findings

- `ARCHITECTURE.md` §4: ein Satz — „Eine Ablehnung allein durch Stefan über den Rückfrage-Kanal (Protokoll im
  Kontrollzustand, je Ablehnung genau ein Eintrag `stefan_abgelehnt` mit gleicher ID, gleichem Werkzeug und Input-Hash)
  ergibt `ERFOLGREICH` mit `abgelehnt_durch_stefan`; jede andere Ablehnung bleibt `VERWEIGERT`.“ §2 nur, falls die
  Artefaktliste dort Kern-Artefakte einzeln nennt (prüfen).
- `docs/STATUS.md`, `docs/projekt/fixpaket-f45.md` (Zeile B2b-3b-1b), `docs/projekt/kontext/lagebild.md`.
- `state/findings.md`: F-1126 (1) erledigt vermerken; neues Finding (nächste freie ID, F-1127 falls frei)
  HARNESS_IMPROVEMENT P3 „Rot-Nachweis gegen main per Worktree im Scratchpad bleibt registriert hängen, commit-guard
  sperrt das Entfernen (B2b-3b-1a)“, Maßnahme: `git archive`-Abzug als Standardweg für Rot-Nachweise festhalten, Status
  offen. Reste aus Review/qa als weiteres Finding.

## 8 Grenzen (NICHT)

Kanal bleibt aus (keine Oberfläche, kein echter Lauf mit Kanal, kein Einschalten im Produktpfad); Argv bitgleich;
`starteWorkflowSchritt(` 6×; keine gesperrten Dateien (`.claude/`, `CLAUDE.md`, `projekte.json`, `ressourcen.json`,
`vorlagen/`, `.githooks`, `kontrollzustand/`, `startvorlagen/`, `state/aktuelle-autorisierung.json`,
`workflow-vorlagen/`); `package.json` nur die Gate-Zeile. Kein Umbau der Routen oder des D13-Bereichs.

## 9 Rot-Nachweis

`git archive main | tar -x` in ein Scratchpad-Verzeichnis, das neue Gate dorthin kopieren, laufen lassen: je Fall
melden (erwartet rot: e1, p1-Erfolgsgegenfall, p2, p3, p4-mit-Kanal; e2–e4 sind Schutzfälle und auf main grün — so
berichten). Zusätzlich „bitgleich zu main“: dieselben Rohströme mit main-Evaluator und Branch-Evaluator (ohne
`rueckfragen`) klassifizieren, Ergebnis und Marken-Payload vergleichen.

## Offene Punkte, nicht stillschweigend entschieden

- O1 Ort des Abgleichs: reine Funktion in `src/rueckfrage` (Evaluator importiert sie) statt im Evaluator selbst — eine
  Regel neben dem Validator; Evaluator bleibt frei von Regex (Gate f7 (a)). Erzeugt die Kante
  `result-evaluator → rueckfrage → invocation-policy` (kein Zyklus).
- O2 Schreiber zustandslos (letzte Version laden + anhängen) statt Speicher je Lauf — kein Aufräumen nötig, kostet einen
  Lesezugriff je Entscheidung (Menschentempo).
- O3 Controller liest bei `rueckfrageKanal` statt eines eigenen Markers `rueckfrage: { an: true }` (Plan v1 §5) — das
  Feld existiert schon und trägt das Token; der Controller liest nur die Anwesenheit. Alternative: eigener boolescher
  Marker ohne Token.
- O4 ERFOLGREICH-Terminalmarke bekommt erstmals `daten` (`{ abgelehnt_durch_stefan }`); Schema der Wirkungsmarke lässt
  `daten` frei. Prüfen, ob ein Leser (Workflow-Automat, Abnahme, Laufliste) ERFOLGREICH ohne `daten` voraussetzt.
- O5 `bypass_verdacht_anzahl > 0` ⇒ VERWEIGERT trotz Stefan-Ablehnung (E-186 bleibt, Plan v1 O5).
- O6 Eigenes Gate statt Erweiterung des 3b-1a-Gates (Rot je Fall); `package.json` bekommt dafür die eine Gate-Zeile.

## Akzeptanz

Unit-Tests rot → grün; Gate grün auf dem Branch, gegen main je Fall rot bzw. als Schutzfall grün berichtet; Beleg
„ohne Protokoll bitgleich“ (gegen main); `npm run check:gates` grün; code-reviewer + qa, höchstens eine Korrekturrunde.

## Risiken

- `tool_input` in `permission_denials` könnte in echten Läufen vom `input` an `rechte_pruefen` abweichen (CLI ergänzt
  Felder) ⇒ Hash-Abweichung ⇒ VERWEIGERT (sichere Richtung); realer Beleg erst in 3b-2 (Spike zeigt Gleichheit).
- Kanonisierung: `kanonischesJson` muss in Vermittlung und Evaluator dieselbe sein (eine Quelle: checkpoint-store).

Schätzung ≈ 0,35–0,45 AT.
