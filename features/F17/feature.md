# F17 — Rollenvertrag

## ID

F17

## Titel

Rollenvertrag (Rolle als Vertrag statt Kontextfilter)

## Status

Status: READY_FOR_TECH

Gültige Status-Werte (geprüft vom Gate, siehe A3a–e in
`features/AF-F001/feature.md`): `ENTWURF, READY_FOR_TECH,
WORKSTREAM_SCHNITT_GENEHMIGT, IN_ARBEIT, FEATURE_GATE, ABGESCHLOSSEN,
BLOCKIERT, ABGEBROCHEN`.

## Ziel

Eine Rolle ist im Kern ein maschinenlesbarer Vertrag: Sie legt fest, mit
welcher Art von Werkzeugsatz, auf welchem Worker und mit welchem
Ausgabeschema sie ausgeführt werden darf. Eine geplante Besetzung, die
diesen Vertrag verletzt, startet keinen Worker. Der Vertrag ist die einzige
Stelle im Repo, die Rollen definiert.

## Scope

- Neues Kern-Modul `src/rollen/` mit den Verträgen der vier real
  existierenden Rollen.
- Migration von `ROLLEN_AUSSCHLUSSMUSTER` aus
  `src/context-builder/types.ts` dorthin — keine zweite Rollenliste.
- Planzeitprüfung in `validiereWorkflowDaten`: `schritt.rolle` muss im
  Register stehen.
- Startzeitprüfung in `loeseAusfuehrungsEingabenAuf`: Werkzeugsatz-Art,
  Worker und Ausgabeschema des geplanten Schritts müssen den Vertrag der
  Rolle erfüllen.
- F-323 nach Weg (a): der Werkzeugsatz eines `codex`-Schritts bleibt
  Plandatum mit Durchsetzungsgrad `DEKLARIERT` und wird in der
  Leitstand-Projektion als solcher gekennzeichnet.
- Gate `scripts/check-f17-rollenvertrag.mjs`, in `npm run check`
  eingereiht.
- Realer Grün- und Rot-Nachweis über den Leitstand.

## Nicht-Ziele

- **Keine Schemaprüfung des Codex-Ergebnisses** (F-313 bleibt offen,
  Entscheidung Stefan 11.09.2026 — es ist ein Evaluator-Problem, kein
  Rollenproblem).
- **Keine projektabhängige Rollenverfügbarkeit.** Profile erzeugen weder
  Rollen noch Zustände (§16.7, D1/D14).
- **Keine eigene Assignment-/Besetzungsschicht und keine
  `besetzung`-Tabelle.** Die feste Besetzung lebt je `WORKFLOW_V0`-Schritt
  (E-M3-3 präzisiert, F-288).
- **Keine Capability-Ontologie**, kein Worker→Capability-Register. Bei zwei
  Workern mit fest bekannten Eigenschaften ist das Indirektion ohne
  Informationsgewinn; `erlaubte_worker` sagt dasselbe prüfbar.
- **Keine neuen Rollen**, kein `planner`, keine englischen Rollennamen.
- **Kein Systemprompt je Rolle** (eigener Wirkmechanismus, nicht Teil des
  Vertrags).
- **Keine Vertragsfelder** `fallback_policy` (widerspricht E-159),
  `stop_conditions`, `escalation_conditions`, `control_requirements`,
  `input_contract`, `permission_profile`, `allowed_tools`.
- **Kein Router-Eval-Gate, kein Szenario A/B** — eigener
  Nachweis-Workstream nach F17.
- **Keine Rollenverwaltung im Leitstand** (M4).
- **Kein verpflichtendes Ausgabeschema je Rolle** (siehe AK5).

## Akzeptanzkriterien

- **AK1** *(WS-1)* — `src/rollen/` ist die einzige Stelle im Repo, die
  Rollennamen definiert. `ROLLEN_AUSSCHLUSSMUSTER` existiert nicht mehr als
  eigene Liste; `src/context-builder/index.ts` bezieht die Ausschlussmuster
  aus `ROLLENVERTRAEGE`. Vom Gate per Grep belegt.
- **AK2** *(WS-1)* — Jede der vier realen Rollen (`architecture-advisor`,
  `code-reviewer`, `qa`, `ausfuehrung`) trägt `zweck`,
  `erlaubte_werkzeugsatz_arten`, `erlaubte_worker`,
  `erlaubtes_output_schema` und `ausschlussmuster`. Die
  Ausschlussmuster sind byte-gleich zu den vor der Migration gültigen
  Werten.
- **AK3** *(WS-1)* — Das Verhalten des Context Builders bleibt unverändert:
  unbekannte Rolle → `{ ok: false, grund: 'unbekannte_rolle' }` als
  allererste Prüfung, vor jeder Schreibwirkung; kein bestehender
  F5-Testfall musste angepasst werden außer dem Importpfad.
- **AK4** *(WS-2)* — `validiereWorkflowDaten` lehnt einen Schritt mit
  unbekannter `rolle` ab und nennt die bekannten Rollen.
  `schemas/examples/kontrollzustand-workflow.valid.json` bleibt gültig; ein
  neues Invalid-Beispiel `…invalid-unbekannte-rolle.json` wird abgelehnt.
- **AK5** *(WS-2)* — `loeseAusfuehrungsEingabenAuf` lehnt VOR dem
  Workerstart ab, jeweils als ALLOWLIST formuliert und in die bestehende
  Ablehnungszählung eingereiht:
  (a) `werkzeugsatz.art ∉ rolle.erlaubte_werkzeugsatz_arten`;
  (b) `worker ∉ rolle.erlaubte_worker`;
  (c) `output_schema ≠ null` und `≠ rolle.erlaubtes_output_schema`.
  `erlaubtes_output_schema` ist eine Allowlist, keine Pflicht: `null` als
  Schritt-Angabe bleibt für jede Rolle erlaubt — ein Pflichtschema nagelte
  `code-reviewer` wegen Regel 4b faktisch auf `codex` fest.
- **AK6** *(WS-2)* — Rot, je einzeln kalibriert: `code-reviewer` +
  schreibender Werkzeugsatz; `ausfuehrung` + `worker: 'codex'`;
  `code-reviewer` + fremdes `output_schema`; `qa` + irgendein
  `output_schema`. Grün: die Besetzung aus
  `schemas/examples/kontrollzustand-workflow.valid.json` passiert alle vier
  Prüfungen.
- **AK7** *(WS-2, F-323 Weg a)* — Die Leitstand-Projektion eines
  `codex`-Schritts weist den Werkzeugsatz als `DEKLARIERT` aus; bei
  `claude-code` als `ERZWUNGEN`. Der Kopfkommentar der Worker-Weiche
  benennt, dass `baueCodexAufruf` kein Werkzeugsatz-Feld kennt.
- **AK8** *(WS-3)* — Grün, real: der zweistufige Workflow aus F16 AK12
  (`nachweis/ws3b/L1.json`, Codex `code-reviewer` lesend → Claude Code
  `ausfuehrung` schreibend) läuft unverändert über den Leitstand durch,
  ohne manuellen Zwischenstart. Kein neuer Workflow.
- **AK9** *(WS-3)* — Rot, real: derselbe Plan mit
  `rolle: "code-reviewer"` und schreibendem Werkzeugsatz startet den
  Schritt nicht; der Workflow hält sichtbar an, der `grund` nennt Rolle und
  Werkzeugsatz-Art. Nachweis nach Muster `features/F16/nachweis-ak12.md`.
  F-272 beachten: keine Sicherung im Aufbau, die denselben Ausgang erzeugt
  wie der zu belegende Mechanismus.
- **AK10** *(WS-3)* — Der Durchsetzungsgrad der neuen Grenze ist mit
  kalibriertem Rot- und Grün-Fall belegt und heißt deshalb `ERZWUNGEN`
  (`ARCHITECTURE.md` §8). F-184 geschlossen, F-323 geschlossen, F-336
  angelegt.

## Entschieden

Stefan, 11.09.2026, nach Challenge von PlanV0:

- F17 bleibt schmal: Rollenvertrag, sonst nichts.
- F-313 (Schemakonformität des Codex-Ergebnisses) bleibt außerhalb von F17.
- F-323 nach Weg (a): `DEKLARIERT` + Anzeige, keine Schemaänderung.
  Weg (b) hätte die real wirksame Ablehnung „codex + nicht-lesender
  Werkzeugsatz" (F16 AK10) ihrer Grundlage beraubt.
- Rollenregister als Kern-Modul `src/rollen/` (TypeScript-Konstante), nicht
  als `rollen/<name>.json`. Abweichung von der Maßnahme in F-184: §16.7
  weist Rollen dem Kern zu, und Datendateien kosten Loader, Schema,
  Pfadsicherheit und Gate-Abdeckung ohne heutigen Verbraucher. Neu zu
  stellen, sobald ein Mensch Rollen ohne Code-Änderung pflegen soll (M4).
- `erlaubtes_output_schema` ist eine Allowlist, keine Pflicht (siehe AK5).
- `erlaubte_werkzeugsatz_arten` und `erlaubte_worker` sind Listen, keine
  Einzelwerte — eine spätere zweite Art oder ein dritter Worker kostet dann
  einen Eintrag statt einer Schemaänderung.

## Dependencies

- F5 — `baueKontextpaket`, `ROLLEN_AUSSCHLUSSMUSTER` (wird migriert).
- F15 — `WORKFLOW_V0`, `validiereWorkflowDaten`, `ermittleNaechstenSchritt`
  (Regel 4/4b), `loeseSchrittEingabenAuf`.
- F16 — `loeseAusfuehrungsEingabenAuf` (Ablehnungszählung),
  `schemas/ergebnis-code-reviewer.schema.json`, Nachweis AK12.
- F11 — Startvorlage, `werkzeugsaetze[].art`.
- Findings: F-184 (löst), F-323 (löst), F-313 (ausdrücklich nicht),
  F-336 (anlegen).
