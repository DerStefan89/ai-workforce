SCHRITT 0: Arbeitsverzeichnis ausgeben und gegen das im Auftrag genannte
Zielverzeichnis prüfen. Bei Abweichung: abbrechen, melden, nichts ändern.

Zielverzeichnis: `ai-workforce`-Repository-Wurzel (dort, wo `package.json`
und `.claude/settings.json` liegen).

## TASK: f6a-ws2-prozessstart

GOAL:
`starteGateway` in `src/claude-code-gateway/index.ts` startet einen echten
Claude-Code-Subprozess über ein Argv-Array (kein Shell-String), schreibt
vor dem Start eine `RUN_PREPARED`-Wirkungsmarke, wertet das Ergebnis ohne
Klassifikation aus, legt zwei getrennte Ablagen an (Laufakte via F2
registriert, Rohstrom unter `kontrollzustand-roh/`, nicht committet) und
besteht `npm run check` inklusive der neuen AK14 (Grep-Gate gegen
Shell-String-Zusammenbau).

CONTEXT:
- [Fakt] Plan: `state/plan-v1-f6a-ws2-ws3-prozessstart.md` (Fassung 2,
  31.08.2026) — vollständige technische Grundlage. Abschnitte 2 (Scope
  WS2), 4 (Design-Entscheidungen), 5 (Ablageort), 7 (AK-Delta), 8
  (offene Unsicherheiten).
- [Fakt] WS1 bereits gebaut und gemerged: `src/claude-code-gateway/index.ts`
  (PR #37) — `baueAufruf`, `pruefeUndVerweigereBeiTreffer`. Nicht
  verändern, nur von außen aufrufen (D5).
- [Fakt] `features/F6a/feature.md` — Feature-Akte, AK1-13, Nicht-Ziele
  (F7-Grenze, F3/F4-Vollcheck-Ausschluss).
- [Fakt] F1B: `src/checkpoint-store/index.ts:530`
  `schreibeWirkungsmarke(laufId, profilReferenz, art, zusatz, optionen)`.
- [Fakt] F2: `src/lineage-registry/index.ts:85`
  `registriereKernArtefakt(artefaktId, profilReferenz, herkunft, daten, eingaben?, optionen?)`.
- [Fakt] Reale Fixture-Daten: `state/tp-nachtrag.md` (TP-03d Messfall 1/2
  — valides Ergebnisobjekt inkl. `permission_denials: []`; TP-01e
  Messfall A/B — Abbruch/Zeitüberschreitung ohne Ergebnisobjekt, Exit
  137/124, kein Restprozess).
- [Fakt] `.gitignore` fehlt bislang `kontrollzustand-roh/`.
- [Entscheidung Stefan, 31.08.2026, Option B] Kein F3-, kein volles
  F4-Startfreigabe-Gate (E-183/E-188) in WS2/WS3 — nur WS1s bereits
  vorhandener E-182-Check (`pruefeUndVerweigereBeiTreffer`). Diese Frage
  wurde zweimal entschieden, nicht erneut aufrollen.
- [Annahme] Exaktes JSON-Feld für `modell_beobachtet` ist durch
  `state/tp-nachtrag.md` nicht belegt (Volltextsuche „model": null
  Treffer) — im Bau gegen reale Fixture-Daten verifizieren, nicht raten.
- [Fakt] F-057 (`state/findings.md`): Subprozessstart ausschließlich über
  `child_process.execFile` mit Argv-Array, nie über einen
  shell-interpretierten Kommandostring.

SCOPE:
1. `starteGateway(eingaben, optionen): Promise<GatewayErgebnis>` in
   `src/claude-code-gateway/index.ts`. Ablauf: `pruefeUndVerweigereBeiTreffer`
   (WS1, unverändert) → bei `ok: true`:
   `schreibeWirkungsmarke(laufId, profilReferenz, 'run_prepared')` → vor
   dem Start → `starteProzess(tokens, optionen)` (execFile) → Ergebnis
   ohne Klassifikation auswerten → Rohstrom schreiben →
   `registriereKernArtefakt`.
2. `src/claude-code-gateway/prozessstart.ts` — `execFile`-Wrapper +
   austauschbare Attrappe über `optionen.starter` (Muster F1Bs
   `optionen.schreiber`).
3. Attrappen-Fixtures für `npm run test`/`check`: reales Ergebnis-JSON
   (TP-03d) + Abbruch/Zeitüberschreitung (TP-01e), wörtlich aus
   `state/tp-nachtrag.md` übernommen. Kein Netz, kein echter Prozess in
   der Standardkette.
4. `schemas/kontrollzustand-laufakte-payload.schema.json` +
   `schemas/examples/kontrollzustand-laufakte-*.json`
   (`additionalProperties: false`, Muster F5/F9-Schemata).
5. `.gitignore`: `kontrollzustand-roh/` ergänzen.
6. `scripts/check-f6a-claude-code-gateway.mjs` erweitern:
   `LAUFAKTE_V0`-Fixture-Validierung + neue Grep-Regel gegen
   Shell-String-Zusammenbau (AK14, analog bestehender AK1-Regel).
   Bestehende AK12-Regel unverändert lassen.
7. Tests in `src/claude-code-gateway/claude-code-gateway.test.ts`: WS1s
   5 bestehende Fälle unverändert, neue Fälle für `starteGateway`
   (Erfolg, Verweigerung durch WS1-Check, Abbruch/Zeitüberschreitung,
   F2-Registrierung, Grep-Gate greift bei simuliertem Verstoß).

NICHT:
- F3 (Authorization Boundary), volle F4-`pruefeStartfreigabe`
  (E-183/E-188) — Option B, nicht neu diskutieren.
- Echte schreibende Tools im gestarteten Prozess — bleibt
  lese-beschränkt.
- Klassifikation, `permission_denials`-Auswertung, Terminalausgänge —
  F7-Scope, AK12-Grep erzwingt das mechanisch.
- WS3 (`scripts/verify-f6a-real-run.mjs`, echter Lauf) — eigener,
  späterer Vertrag (siehe FOLGT).
- F-053 (E-188-Rot-Fall-Nachweis) — außerhalb dieses Features.

BUDGET: Ein Baudurchgang (Plan Abschnitt 6). Bei rotem `npm run check`
nach dem ersten Durchgang selbst nachbessern, solange die Ursache
innerhalb dieses Scopes liegt — kein zweiter Vertrag nötig.

OUTPUT:
- Code, Tests, Schema, Gate-Erweiterung wie oben.
- `features/F6a/feature.md`: betroffene Akzeptanzkriterien (AK5-9, AK11,
  neu AK14) mit Nachweis/Status ergänzen — Akte selbst nicht
  umschreiben.
- `state/gates.md`: Eintrag für WS2 (Muster bestehender Einträge).
- Alle erzeugten/geänderten Dateien (Code, Feature-Akte, Gates, ggf.
  `state/memory-map.md`) sind Teil desselben Commits (F-005/F-035-Regel)
  — nicht nur der Produktcode.
- Commit-Vorbereitung nach `.claude/skills/git-flow/SKILL.md`. Kein
  Commit ohne Freigabe. Staging ausschließlich mit expliziten Pfaden,
  nie `-A` oder `.`.

ESCALATE:
- `npm run check`/`npm run test` zeigt einen unerwarteten roten Befund
  außerhalb dieses Scopes (z. B. in F1B/F2/F4/WS1-Code) → anhalten,
  melden, nichts an fremdem Code ändern.
- Das Feld für `modell_beobachtet` lässt sich nicht eindeutig aus realen
  Fixture-Daten bestimmen → anhalten, melden, nicht raten.
- `execFile('claude', ...)` verhält sich beim Testlauf unerwartet (z. B.
  Windows-`.cmd`-Wrapper-Problem) → anhalten, melden — reale Klärung ist
  WS3 vorbehalten, keine stillschweigende Anpassung hier.
- Jeder Befund, der F3/volle F4-Startfreigabe/F-053 wieder relevant
  erscheinen lässt → nicht selbst entscheiden, an Stefan eskalieren
  (bereits zweimal Gegenstand einer Entscheidung, siehe CONTEXT).

FOLGT: `state/tasks/f6a-ws3-realer-nachweis.md` — WS3 (manueller
Nachweislauf), eigener Vertrag, erst nach WS2-Merge, von Stefan selbst
ausgeführt/beaufsichtigt.
