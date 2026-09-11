# F19 — Capability Foundation

## ID

F19

## Titel

Capability Foundation (Register der Ressourcen, die Capabilities bereitstellen)

## Status

Status: FEATURE_GATE

Gültige Status-Werte (geprüft vom Gate, siehe A3a–e in
`features/AF-F001/feature.md`): `ENTWURF, READY_FOR_TECH,
WORKSTREAM_SCHNITT_GENEHMIGT, IN_ARBEIT, FEATURE_GATE, ABGESCHLOSSEN,
BLOCKIERT, ABGEBROCHEN`.

## Ziel

Ein eigenständiges Bridge-Feature zwischen Meilenstein 3 (abgeschlossen) und
Meilenstein 4: Capability wird als Kernkonzept eingeführt — eine Fähigkeit,
getrennt von der Ressource (Worker, Skill, externer Kandidat), die sie
bereitstellt. Grundlage: `docs/projekt/zielfassung.md` §13.4, E-M3-3 (feste,
vom Menschen gepflegte Besetzung Rolle → Worker → Modell; F19 prüft und
meldet, es wählt nicht automatisch).

## Scope

- `schemas/ressourcen.schema.json` — Vertrag für das Ressourcen-Register
  (`RESSOURCEN_V0`) — WS-1.
- `ressourcen.json` (Repo-Wurzel) — Initialbestand: 21 Einträge (2 Worker,
  6 Skills, 13 externe Kandidaten) — WS-1.
- `src/rollen/types.ts`/`src/rollen/index.ts` — additives Pflichtfeld
  `benoetigte_capabilities` je Rollenvertrag, Zwilling der
  `capabilities`-Werte in `ressourcen.json` — WS-1.
- Abgrenzungssätze in `state/tooling.md` und
  `docs/harness/werkzeug-katalog.md` gegen eine dritte Bestandsliste
  (F-342) — WS-1.
- `src/ressourcen/index.ts` mit `validiereRessourcenDaten` (Muster
  `validiereStartvorlageDaten`) — WS-2.
- Verfügbarkeitsableitung zur Abfragezeit (kein gespeichertes Statusfeld)
  — WS-2.
- Gate `scripts/check-f19-ressourcen.mjs`, eingehängt in `npm run check`
  — WS-2.

## Nicht-Ziele

- **Keine automatische Worker- oder Modellwahl.** E-M3-3
  (`docs/projekt/zielfassung.md` §13.4): die Besetzung Rolle → Worker →
  Modell bleibt eine vom Menschen gepflegte feste Besetzung, gepinnt je
  `WORKFLOW_V0`-Schritt. F19 prüft und meldet, es entscheidet nicht.
- **Keine zweite Permission-/Tooling-/Versions-Wahrheit.** Sandbox,
  erlaubte Werkzeuge, Berechtigungskontext und deklarierte Versionen
  bleiben ausschließlich in `startvorlagen/*.json`. Dev-Werkzeuge (Biome,
  `tsc`, `node:test`, `gh`, gitleaks) bleiben ausschließlich in
  `state/tooling.md`.
- **Kein gespeicherter Verfügbarkeitszustand.** Kein Feld `status`, kein
  Wert `AVAILABLE` in `ressourcen.json` — Verfügbarkeit wird erst zur
  Abfragezeit abgeleitet (WS-2), weil sie umgebungsabhängig ist.
- **Keine Projektfreigaben/Allowlists.** `profiles/*.json` bleibt
  unangetastet.
- **Keine Taxonomie-Datei, keine UI, keine Scouts, keine automatische
  Installation, keine URL-/Repo-Analyse, keine Versionsverwaltung.**

## Akzeptanzkriterien

- **AK1** *(WS-1)* — `schemas/ressourcen.schema.json` (JSON Schema draft
  2020-12) beschreibt Wurzel und Eintragsform inklusive der drei
  `herkunft`-Varianten (`startvorlage`/`skill`/`extern`), mit
  `additionalProperties: false` auf jeder Ebene.
- **AK2** *(WS-1)* — `ressourcen.json` trägt genau die 21 realen Einträge
  (2 Worker `FREIGEGEBEN`, 6 Skills `FREIGEGEBEN`, 13 externe Kandidaten
  `OFFEN`), jeweils schemakonform gegen AK1.
- **AK3** *(WS-2)* — `validiereRessourcenDaten` (`src/ressourcen/index.ts`)
  erzwingt zur Laufzeit die drei semantischen Regeln, die das Schema
  allein nicht abbilden kann: R1 (nur `typ: "extern"` trägt `name`/
  `beschreibung`, dort Pflicht), R2 (`typ: "extern"` ausschließlich
  `freigabe: "OFFEN"`), R3 (`herkunft.art` passt zu `typ`). **Erfüllt.**
  Real geprüft: 19 Fälle in `src/ressourcen/ressourcen.test.ts` (je ein
  Rot-Fall pro Regel plus id-Eindeutigkeit), Gate-Regeln 1/4/5 in
  `scripts/check-f19-ressourcen.mjs` gegen die reale `ressourcen.json`.
- **AK4** *(WS-1)* — Jeder der fünf Rollenverträge in `ROLLENVERTRAEGE`
  (`src/rollen/index.ts`) trägt `benoetigte_capabilities` als Zwilling der
  `capabilities`-Werte aus `ressourcen.json`; das Feld ist in
  `src/rollen/types.ts` typisiert. Real geprüft: bestehendes
  `scripts/check-f17-rollenvertrag.mjs` bleibt grün (Feldprüfung dort ist
  additiv, keine erschöpfende Feldliste).
- **AK5** *(WS-1 teilweise, Rest WS-2)* — Keine dritte Bestandsliste neben
  `ressourcen.json` (F-342). WS-1 liefert die beiden Abgrenzungssätze in
  `state/tooling.md` und `docs/harness/werkzeug-katalog.md`. **Erfüllt.**
  Der WS-2-Rest ist mechanisch, statt als eigener Repo-Scan: Gate-Regeln 6/7
  in `scripts/check-f19-ressourcen.mjs` behandeln `ressourcen.json` als
  einzige Quelle, gegen die `ROLLENVERTRAEGE.benoetigte_capabilities`
  abgeglichen wird (Regel 7 verlangt zusätzlich, dass jede ungedeckte
  Capability in `features/F19/bekannte-luecken.md` benannt ist statt in
  einer eigenen vierten Liste zu verschwinden).
- **AK6** *(WS-2)* — `src/ressourcen/index.ts` mit `validiereRessourcenDaten`
  (Muster `validiereStartvorlageDaten`, D5 — kein zweiter, von Hand
  nachgebauter Regelsatz). **Erfüllt.** Nachweis: `features/F19/
  nachweis-ws2.md`.
- **AK7** *(WS-2)* — Verfügbarkeit einer Ressource wird ausschließlich zur
  Abfragezeit aus der laufenden Umgebung abgeleitet (z. B. fehlender
  `worker.codex`-Block in der Startvorlage), nie aus einem gespeicherten
  Feld — real belegt mit einem Grün- und einem Rot-Fall. **Erfüllt.**
  Nachweis: `features/F19/nachweis-ws2.md` (Green, Red 1-3, Change).
- **AK8** *(WS-2)* — Gate `scripts/check-f19-ressourcen.mjs`
  (Muster `check-f18-router.mjs`), eingehängt in `npm run check`.
  **Erfüllt.** `npm run check`: Exit 0, siehe `features/F19/
  nachweis-ws2.md`.

## Entschieden

- **F-346 bleibt `offen`, nicht `gelöst`.** Der Bauauftrag sah vor,
  `erlaubte_worker` von `code-reviewer` UND `router` auf `['codex']` zu
  verengen (nach Prüfung, dass keine Workflow-Vorlage sie auf `claude-code`
  plant). Diese Prüfung war für beide Rollen negativ — die Verengung wurde
  trotzdem für beide real verworfen: `router` läuft über den direkten `POST
  /api/laeufe`-Pfad strukturell IMMER als `worker: 'claude-code'` (eine
  Verengung hätte den Mechanismus unbenutzbar gemacht, Rückfrage an Stefan,
  12.09.2026); `code-reviewer`s Verengung brach real 85 Assertions in
  `scripts/check-f15-workflow.mjs`, dessen geteilte Testfixtur den Default
  `code-reviewer`/`claude-code` für einen claude-code-spezifischen Rotfall
  braucht. Beide Fälle bekamen stattdessen dieselbe, bereits für `router`
  entschiedene Lösung: eine eng benannte, geprüfte Gate-Ausnahme
  (`F346_AUSNAHMEN` in `scripts/check-f19-ressourcen.mjs`), die
  AUSSCHLIESSLICH `STRUCTURED_OUTPUT` für `claude-code` bei diesen beiden
  Rollen duldet. Details: `state/findings.md` F-346, `features/F19/
  nachweis-ws2.md` ("Real gefundener Blocker").
- `src/rollen/index.ts` ist damit gegenüber dem WS-1-Stand UNVERÄNDERT
  (`erlaubte_worker` beider Rollen bleibt `['claude-code', 'codex']`) — die
  einzige Änderung liegt im Gate (`scripts/check-f19-ressourcen.mjs`), das
  die Lücke seither mechanisch sichtbar hält, statt sie stillschweigend
  bestehen zu lassen.

## Dependencies

- F17 — Rollenvertrag (`ROLLENVERTRAEGE`, `src/rollen/types.ts`), auf den
  `benoetigte_capabilities` additiv aufsetzt.
- `startvorlagen/*.json` (F11 WS-2, F16 WS-1) — Quelle der worker-
  abhängigen Startfelder, gegen die WS-2 Verfügbarkeit ableitet.
