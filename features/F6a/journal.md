# Journal — F6a: Claude-Code-Gateway, Lesepfad

## 31.08.2026 — Challenge und Zuschnitt (Rolle: Technical Challenger)

Feature #6 des Umsetzungsplans wurde gegen Zielfassung §9.4/§16.8/§334-335,
ARCHITECTURE §3/§4/§7, die Exports von F1/F1B/F2/F3/F4/F5 und die reale
Messbasis in `state/tp-nachtrag.md` gechallengt. Urteil:
`HUMAN_DECISION_REQUIRED` — nicht wegen fachlicher Unklarheit, sondern
wegen des Zuschnitts und zweier offener Vorbedingungen.

Fünf materielle Befunde:

1. **Die Klassifikation gehört nicht ins Gateway.** Zielfassung §334 gibt
   dem Gateway ausdrücklich „keine fachliche Bewertung, keine
   Fließtextdeutung"; §335 gibt die Klassifikation von Läufen dem Result
   Evaluator. Die drei Terminalausgänge aus ARCHITECTURE §4 und E-184
   (`permission_denials[]`) sind damit F7-Scope. Der naive Zuschnitt hätte
   sie in F6 gebaut — dasselbe Duplikat-Muster, das D5 verhindern soll.
2. **Daraus folgt: F6a allein kann keinen Lauf schließen.** F1B verlangt zu
   jeder `RUN_PREPARED`-Marke ein Terminalartefakt; ohne F7 endet jeder Lauf
   in `KLAERUNG_ERFORDERLICH`. Spannung zur Zuschnitt-Heuristik in
   `CLAUDE.md` („eigenständig prüfbares Artefakt").
3. **Zwei harte Vorbedingungen:** F-030 (kein freigegebener Bash-Weg für
   einen Prozessstart, ausdrücklich „blockierend bei Feature 6") und F-048
   (Aufrufrepräsentation ungeklärt, `pruefeAufrufparameter` fail-open bei
   genau dem gefährlichsten E-182-Eintrag).
4. **E-188 ist heute eine ungedeckte Zusage.** `pruefeStartbedingung2` prüft,
   dass ein Wirksamkeitsnachweis zum Gültigkeitsschlüssel passt — nicht, dass
   er je durch einen echten Rot-Fall verdient wurde (§16.8 Punkt 3). Solange
   nur gelesen wird, folgenlos; ab dem ersten Schreiblauf ist F4s
   `FREIGEGEBEN` eine Behauptung. Als F-053 erfasst, blockierend für F6b.
5. **Die Messbasis steht bereits.** `state/tp-nachtrag.md` enthält reale
   `claude -p --output-format json`-Läufe mit echten
   `permission_denials`-Payloads sowie Abbruch (Exit 137) und
   Zeitüberschreitung (Exit 124) inkl. Befund „kein terminales
   Ergebnisobjekt, kein Restprozess". Ein Erkundungs-Spike ist nicht nötig;
   §16.8 Punkt 5 ist faktisch gemessen, aber noch als offen geführt (F-052).
   Ungemessen bleiben Messfall C (Kontingentgrenze) und Messfall 3
   (MCP-Kanal → E-187 bleibt einmechanismig, `DEKLARIERT` ist korrekt).

## 31.08.2026 — Entscheidungen (Stefan)

- **Zuschnitt (Option B):** Feature #6 wird geteilt in F6a (Lesepfad, diese
  Akte), F7 (Result Evaluator), F6b (Schreibwirkung). Reihenfolge 6a → 7 →
  6b statt 6 → 7. Begründung: F6 als ein Feature wären mindestens vier
  Baudurchgänge und die Klassifikation läge an der falschen Systemgrenze.
- **Abnahme von F6a (Option A):** F6a schreibt nur `RUN_PREPARED`; Läufe
  bleiben bis F7 in `KLAERUNG_ERFORDERLICH`. Abnahmekriterium ist die
  Vollständigkeit und Hashbarkeit der Beobachtungsbasis, nicht der
  geschlossene Lauf. Kein vorläufiges Terminalartefakt aus mechanischen
  Signalen — das wäre die Klassifikation, die §335 dem Evaluator zuweist,
  als Wegwerfcode, der erfahrungsgemäß bleibt.

## Offen vor dem Bau

- F-030 muss durch einen eigenen Harness-Vertrag geschlossen sein
  (Berechtigungsfläche `.claude/settings.json` — Sicherheitsentscheidung,
  gehört nicht in diese Akte).
- Danach: plan-v1 → Advisor-Pass (frischer Kontext) → plan-v2 →
  Handoff-Vertrag → Bau → Reviewer-/QA-Pass vor dem Merge
  (Definition of Done, seit F-046 verbindlich).

## 31.08.2026 — Advisor-Pass (frischer Kontext, Subagent)

Urteil: **Freigegeben mit Hinweisen**. Vier Befunde, zwei davon vor dem
Handoff-Vertrag verbindlich zu klären:

- **Befund 1 (Kern):** plan-v1 ließ F6a die volle `pruefeStartfreigabe`
  (E-183+E-188, inkl. `rot_fall_beleg`) für den Lesepfad aufrufen —
  widerspricht ARCHITECTURE §3 und Zielfassung §16.4 („Startbedingungen
  des **schreibenden** Pfades", wortgleich in vier Quellen belegt) und
  hätte F-053 auch für F6a blockierend gemacht, obwohl die 6a/6b-
  Trennung aus dem Challenge genau das vermeiden sollte. Als
  ❓ ENTSCHEIDUNG MENSCH an Stefan gegeben.
  **Entschieden: Option A** — F6a ruft nur `pruefeAufrufparameter`
  (E-182) auf, nicht die volle `pruefeStartfreigabe`. `feature.md` AK4,
  der Scope-Punkt „Startfreigabe" und die F4-Dependency-Zeile wurden
  entsprechend korrigiert. F6a bleibt damit unabhängig von F-053.
- **Befund 2:** F2 (Lineage Registry) war in plan-v1 trotz harter
  Dependency in `feature.md` nicht konkretisiert (wann/wie
  `registriereKernArtefakt`/`registriereWerkzeugReferenz` aufgerufen
  wird) — Nacharbeit für plan-v2.
- **Befund 3:** AK11 (Nachweis-Eintrag in `state/gates.md`) in plan-v1
  nur beiläufig als F1-Präzedenzfall zitiert, nicht als eigene Zusage —
  Nacharbeit für plan-v2.
- **Befund 4:** Extraktionsregel für `modell_beobachtet` aus der realen
  Laufausgabe in plan-v1 unspezifiziert — darf mit dem Bau mitlaufen
  (WS2/WS3), kein Scope-Problem.

Entlastend bestätigt: F-048-Fix-Ort, „kein neuer Terminalzustand"-
Behauptung, F6a/F7-Grenze, F-030-Stand, TP-01e-Referenz,
`kontrollzustand-roh/`-Design — alle exakt am Code/Repo verifiziert.

Fundstelle: `state/advisor-findings-f6a-claude-code-gateway.md`.

## 31.08.2026 — WS1-Ausführung (Aufrufkonstruktion und Startfreigabe)

Vertrag `state/tasks/f6a-claude-code-gateway-ws1.md` umgesetzt, ohne jeden
Prozessstart (WS2/WS3 folgen als eigener Vertrag):

- F-048-Fix in `src/invocation-policy/verbotene-aufrufparameter.ts`:
  `pruefeAufrufparameter` erkennt mehrwortige Verbotseinträge zusätzlich
  als zusammenhängendes Token-Fenster im Tokens-Array, additiv zum
  bestehenden `includes`-Pfad, einwortige Einträge unverändert. Zwei neue
  Testfälle in `invocation-policy.test.ts` (isoliert und eingebettet).
- Neues, eigenständiges Modul `src/claude-code-gateway/` (`types.ts`,
  `index.ts`): `baueAufruf` konstruiert den Aufruf ausschließlich als
  Tokens-Array (`--model` pflicht, `--output-format json`,
  `--setting-sources project`, `--tools`), wirft synchron ohne `modell`.
  `pruefeUndVerweigereBeiTreffer` prüft über F4s `pruefeAufrufparameter`
  (E-182) und ruft bei Treffer F4s `verweigereStart` auf — kein
  Prozessstart, bewusst nicht `starteGateway` genannt (AK1-4).
- Gate-Skript `scripts/check-f6a-claude-code-gateway.mjs` (Muster wie
  F4-Gate), in `npm run check` und `check:template` eingehängt.
- `state/memory-map.md`, `package.json` aktualisiert.

Ergebnis: `npm run check` und `npm run check:template` grün, alle
Kalibrierungen (Grün-/Rot-Fälle, F-048-Fenster-Fall) real ausgelöst,
Regressionsbestand unverändert grün. Freigabe-Halt vor Commit/Push
eingehalten (Vertragsvorgabe).
