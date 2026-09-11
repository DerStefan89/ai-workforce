# F16 — Zweiter Worker (Codex CLI, nur lesend)

## ID

F16

## Titel

Zweiter Worker (Codex CLI, nur lesend)

## Status

Status: WORKSTREAM_SCHNITT_GENEHMIGT

Gültige Status-Werte (geprüft vom Gate, siehe A3a–e in
`features/AF-F001/feature.md`): `ENTWURF, READY_FOR_TECH,
WORKSTREAM_SCHNITT_GENEHMIGT, IN_ARBEIT, FEATURE_GATE, ABGESCHLOSSEN,
BLOCKIERT, ABGEBROCHEN`.

## Ziel

Ein Workflow-Schritt mit `worker: "codex"` läuft real über den Leitstand
auf OpenAI Codex CLI (ChatGPT-Anmeldung, E-M3-2), strukturell nur lesend,
mit typisiertem Ergebnis, und wird vom bestehenden Execution-Controller-/
Evaluator-Pfad genauso verarbeitet wie ein Claude-Code-Schritt. Bewiesen
wird die Multi-Worker-Mechanik, nicht Qualität (§13.1).

## Scope

- `src/codex-gateway/` — Aufrufkonstruktion, Argv-Allowlist, JSONL-Parser,
  Prozessstart über `src/claude-code-gateway/prozessstart.ts`.
- Additive Laufakte-Felder `worker` und `modell_deklariert`.
- Optionaler `worker.codex`-Block in der Startvorlage.
- `schemas/ergebnis-code-reviewer.schema.json`.
- Codex-Zweig im Result Evaluator, ausschließlich auf strukturierten
  JSONL-Ereignissen.
- Worker-abhängige Auflösung von Startziel, Version und
  Berechtigungskontext in `loeseAusfuehrungsEingabenAuf`.
- Worker-Schalter im Execution Controller.
- Dispatch von `codex`-Schritten: Regel 4 in `src/workflow/index.ts`,
  `loeseSchrittEingabenAuf`, Auflösung von `output_schema`.
- Leitstand zeigt `worker` und `modell_deklariert`.
- Realer Rot-Fall mit eingerichteter Sandbox.
- Realer zweistufiger Workflow.

## Nicht-Ziele

- **Kein schreibender Codex-Lauf.** Schreibende Execution bleibt
  ausschließlich Claude Code (E-M3-2).
- **Keine `besetzung`-Tabelle in der Startvorlage.** Der Verbraucher
  kommt mit F17 WS-2.
- **Keine Context-Builder-`extern`-Ausschlüsse** (F-276).
- **Kein `@openai/codex-sdk`.** Der Aufruf geht direkt über `execFile`.
- **Kein WSL-Startziel.**
- **Kein Rollenvertrag** (F-184/F17).
- **Kein Ergebnis-Artefakt zwischen Schritten** (F-270).
- **Keine automatische Modellwahl** (E-M3-3).
- **Keine Vorabprüfung der Anmeldung.**
- **Keine `VERWEIGERT`-Klassifikation aus `stderr`**
  (`ARCHITECTURE.md` §7, F-275).

## Akzeptanzkriterien

- **AK1** *(WS-1)* — `baueCodexAufruf` liefert ausschließlich ein
  Tokens-Array `['exec', '--json', '--sandbox', 'read-only', '--model',
  <m>, optional '--output-schema', <abs. Pfad>, <prompt>]`; wirft bei
  leerem `modell`/`prompt` und bei `prompt`, das mit `-` beginnt.
- **AK2** *(WS-1)* — `pruefeCodexAufruf` ist eine ALLOWLIST: jedes Token
  muss aus der erlaubten Grammatik stammen (`exec` an Position 0;
  `--json` höchstens einmal; `--sandbox read-only` genau einmal;
  `--model <wert>`; `--output-schema <abs. Pfad>`; genau ein
  abschließendes Prompt-Token ohne führendes `-`); jedes andere Token
  wird abgelehnt, auch ein heute unbekanntes. Zusätzlich einzeln rot
  kalibriert: die real existierenden abwählenden Parameter von
  `codex exec` 0.153.4 (`--dangerously-bypass-approvals-and-sandbox`,
  `--dangerously-bypass-hook-trust`, `--ignore-user-config`,
  `--ignore-rules`, `--enable`, `--disable`, `-p`/`--profile`,
  `--add-dir`, `-C`/`--cd`, `--oss`, `--local-provider`,
  `--approve-for-me`, `--skip-git-repo-check`), jedes `-c`/`--config`,
  sowie `-s`/`--sandbox` mit `workspace-write` oder `danger-full-access`.
- **AK3** *(WS-1)* — `leseCodexEreignisse` parst JSONL zeilenweise; die
  vier Spike-Läufe aus `state/tp-m3-01-codex.md` sind wörtliche Fixtures;
  `turn.completed`, `turn.failed`, `{"type":"error"}`, letzte
  `agent_message` und `unparsbare_zeilen` werden erkannt/gezählt. Die
  ERROR-Tracing-Zeilen sind ein eigener Fixture-Fall, NICHT als belegte
  `stdout`-Zeilen von Lauf 1/2 (F-296).
- **AK4** *(WS-1)* — `LAUFAKTE_V0` trägt additiv `worker?`
  (`'claude-code' | 'codex'`) und `modell_deklariert?`; Typ, Schema und
  `validiereLaufakteDaten` sind synchron; jede bestehende Beispiel-Laufakte
  bleibt gültig; fehlendes `worker` bedeutet `claude-code`.
- **AK5** *(WS-1)* — Startvorlage: optionaler Block
  `worker.codex { startziel: string[], versionDeklariert: string,
  sandbox: "read-only" }`; `startvorlage_schema` bleibt `v0`;
  `startvorlagen/ai-workforce.json` bleibt ohne Block gültig; Validator
  und Schema sind synchron; die Schema-`description` benennt die
  Asymmetrie (Claude-Code-Felder flach, Codex genestet) als bewusste
  v0-Schuld.
- **AK6** *(WS-1)* — `schemas/ergebnis-code-reviewer.schema.json`
  existiert, trägt `additionalProperties: false` auf jeder Objektebene,
  ist BOM-frei und LF; das Gate `scripts/check-f16-codex-gateway.mjs`
  prüft das und die Grep-Regeln.
- **AK7** *(WS-2)* — `starteCodexGateway`: bei Allowlist-Treffer kein
  Prozessstart (Spy-Starter), keine Wirkungsmarke, keine Laufakte; sonst
  `run_prepared` → `starteProzess` → Rohstrom `{ werkzeugStartziel,
  tokens, stdout, stderr, exitCode, startfehler, beendigungsart }` →
  Laufakte mit `worker: 'codex'`, `modell_beobachtet: null`,
  `modell_deklariert`, `berechtigungskontext:
  'codex-sandbox-read-only'`. Keine `pruefeStartfreigabe`-Prüfung (§16.4
  gilt für den schreibenden Pfad), im Kopfkommentar begründet, mit
  ausdrücklichem Bezug auf E-193: die Allowlist liegt IM Gateway, nie im
  Aufrufer.
- **AK8** *(WS-2)* — Der Result Evaluator verzweigt nach
  `laufakte.worker ?? 'claude-code'` VOR dem Aufruf von
  `leseErgebnisobjekt` (das `JSON.parse` über das gesamte `stdout` macht
  und `type: "result"` verlangt — für Codex-JSONL scheitert das immer,
  F-283). Codex-Zweig, Reihenfolge: `rohstrom_fehlt`/
  `rohstrom_integritaet` → `timeout`/`abgebrochen_manuell` →
  `beobachtungsbasis_unvollstaendig` → `turn_failed` (Ereignis
  `{"type":"error"}` oder `turn.failed`) → `exit_code` (≠ 0) →
  `ergebnis_nicht_schemakonform` (`tokens` enthält `--output-schema` und
  die letzte `agent_message` ist kein JSON-Objekt) → `ERFOLGREICH`; je
  rot kalibriert; ein Gate-Grep belegt, dass der Codex-Zweig `stderr`
  nicht liest.
- **AK9** *(WS-2)* — Realer Rot-Fall mit Sandbox
  (`verify-f16-codex-rotfall.mjs`, Wegwerf-Repo mit `git init`):
  Schreibauftrag über `starteCodexGateway`, Zustandsvergleich vorher/
  nachher byteweise gleich, `features/F16/nachweis-rotfall.md`.
  Kalibrierungspflicht: im selben Lauf muss ein Lesebefehl gelingen;
  scheitern Lesen und Schreiben gleich, ist der Rot-Fall nicht kalibriert
  (F-273/F-289).
- **AK10** *(WS-3)* — `codex`-Schritte sind dispatchbar (Regel 4);
  `codex` + schreibender Werkzeugsatz → Ablehnung; fehlender
  `worker.codex`-Block → Ablehnung; `output_schema` wird als Schemaname
  zu `schemas/<name>.schema.json` aufgelöst (kein Pfadtrennzeichen
  erlaubt), die Datei muss existieren, BOM-frei sein und
  `additionalProperties: false` auf der Wurzel tragen; `claude-code` +
  `output_schema` ≠ `null` → `haltKlaerung` in `ermittleNaechstenSchritt`,
  NICHT in `validiereWorkflowDaten` (F-277/F-285).
- **AK11** *(WS-3)* — `loeseAusfuehrungsEingabenAuf` wählt
  `werkzeugStartziel`, `werkzeugVersionDeklariert` und
  `berechtigungskontext` nach `schritt.worker` statt pauschal aus
  `vorlage.*`; Claude-Code-Schritte bleiben byte-identisch (F-286).
- **AK12** *(WS-3)* — Realer zweistufiger Workflow über den Leitstand:
  Codex `code-reviewer` (lesend, schemakonformes Ergebnis in der letzten
  `agent_message`) → Claude Code `ausfuehrung` (schreibend), ohne
  manuellen Zwischenstart; das Leitstand-Laufdetail zeigt `worker` und
  `modell_deklariert`; Nachweis nach dem Muster
  `features/F15/nachweis-ak10.md`; F-272 beachten (keine Sicherung im
  Aufbau, die denselben Ausgang erzeugt wie der zu belegende
  Mechanismus).

## Entschieden

Stefan, 10./11.09.2026, nach Challenger-Gegenprüfung:

- Codex CLI direkt per `execFile`, kein SDK.
- Zweites Gateway nach F6a-Muster statt generischem Worker-Contract.
- `modell_beobachtet` bleibt für Codex `null`, neu `modell_deklariert`
  (Rang `DEKLARIERT`, E-185).
- `worker` in der Laufakte optional, fehlend = `claude-code`.
- Startvorlage bleibt `v0` ohne `besetzung`-Tabelle; kein `extern` in v1.
- Startbedingung für Codex = bestandene Argv-Allowlist, keine
  E-183/E-188-Prüfung, Durchsetzung im Gateway (E-193).
- `output_schema` bei `claude-code` → `haltKlaerung` im Dispatcher.
- `--sandbox read-only` wird zusätzlich zur `config.toml` am Argv
  gepinnt (F-290).
- Windows-Sandbox unelevated (Entscheidung A1).
- Lesebereich akzeptiert mit Auflage, Durchsetzungsgrad `DEKLARIERT`
  (E-M3-4).

## Dependencies

- F6a — `prozessstart.ts`, `LaufakteV0Daten`.
- F4 — `verweigereStart`.
- F7, F8.
- F11 — Startvorlage.
- F15 — `WORKFLOW_V0`, Regel 4, `loeseSchrittEingabenAuf`.
- F1B/F2.
- Spike `state/tp-m3-01-codex.md` + Nachtrag S-M3-01b.
- Offene Findings mit F16-Bezug: F-185, F-188, F-270, F-271, F-273 bis
  F-298.
