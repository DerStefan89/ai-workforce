# Journal — F8

Anhängeprotokoll. Neue Einträge unten anfügen, bestehende nicht ändern.

## 2026-09-04 — Feature-Akte angelegt

`features/F8/feature.md` angelegt, `Status: READY_FOR_TECH`. Ziel/Scope/
Nicht-Ziele/Akzeptanzkriterien AK1–AK9, Workstream-Vorschlag WS-1
(Kette) / WS-2 (Eskalation und erneuter Anlauf). Commit `898079b`
(#60).

## 2026-09-04 — plan-v1, Advisor-Pass, plan-v2, WS-1-Vertrag

`state/plan-v1-f8-execution-controller.md`: technischer Plan, reale
Repo-Verifikation (F-013-Muster), SCOPE 2.1 (WS-1-Ablauf) / 2.2 (WS-2a) /
2.3 (WS-2b), NICHT, Design-Entscheidungen D1–D5, Akzeptanzkriterien-
Zuordnung, vier Offene Fragen (Abschnitt 10).

Advisor-Pass (`architecture-advisor`, frischer Kontext): Urteil
**FREIGEGEBEN MIT HINWEISEN**, `state/advisor-findings-f8-execution-
controller.md`. Kein Abweichungsfund bei den real gegengelesenen
Signaturen (Befund 8). Findings zu D2 (Lauf-zu-Lauf-Lineage, Befund 7)
und zur Aufrufreihenfolge Eskalation/Schritt 5 (Befund 12) betreffen
ausschließlich WS-2.

`state/plan-v2-f8-execution-controller.md`: Delta zu plan-v1. Delta 1
(Fehlerpfad WS-2a — ein Wurf propagiert unverändert, kein vierter
Ergebnis-Zweig), Delta 2 (feste Reihenfolge Eskalation vor Schritt 5),
Delta 3 (Offene Frage 1/D2 gilt durch den Advisor-Pass als beantwortet).
Fragen 2–4 aus plan-v1 Abschnitt 10 bleiben offen, keine betrifft WS-1.

`state/tasks/f8-execution-controller-ws1.md`: Handoff-Vertrag für
WS-1 (AK1, AK2, AK3, AK5, AK8, AK9), löst die Optionen-Form-Frage
(plan-v1 Abschnitt 10 Frage 4) innerhalb des Vertrags statt sie auf
WS-2 zu vertagen. Commit `4664b32` (#64).

## 2026-09-04 — WS-1-Bauauftrag ausgeführt

Handoff-Vertrag `state/tasks/f8-execution-controller-ws1.md`
ausgeführt. Artefakte: `src/execution-controller/{index,types,
execution-controller.test}.ts`, `scripts/check-f8-execution-
controller.mjs` (eingehängt in `npm run check` und `npm run
check:template`), `features/F8/journal.md` (diese Datei).

Reale Signaturen (F5 `baueKontextpaket`, F6a `baueAufruf`/
`starteGateway`, F7 `klassifiziereLauf`, F1B `stelleLaufstatusFest`) vor
dem Bau gegengelesen — keine Abweichung vom Vertrag gefunden.

Optionen-Form-Frage (SCOPE Punkt 2 des Vertrags) gelöst: `Ausfuehrungs-
Optionen` mit einem einzigen, nullstelligen `schreiber?: () => void`
(Muster F6as `GatewayOptionen.schreiber`) plus einem gemeinsamen
`basisVerzeichnis?` und den vier F6a-spezifischen Durchreichungsfeldern
(`rohBasisVerzeichnis`, `starter`, `settingsPfad`,
`aktuelleAutorisierungPfad`, `startfreigabeRepoWurzel`) — unverändert an
F5/F6a/F7/F1B durchgereicht, keines vom Controller selbst interpretiert
(D5).

AK1-Grep und AK3-Grep real kalibriert (zwei separate, temporäre
Codeeingriffe, je geprüft und zurückgenommen) — Beleg in
`state/gates.md`. Dabei eine im Vertrag selbst angelegte Asymmetrie
real bestätigt: AK1-Grep nimmt `*.test.ts` ausdrücklich aus, AK3-Grep
laut Vertragswortlaut nicht — die Testdatei
`execution-controller.test.ts` baut die F4-Startfreigabe-Fixture deshalb
ohne die einzelne F4-Messfunktion (deren Name AK3 verbietet) zu
benennen, sondern setzt den Ist-Zustand aus `sha256Hex` (F1B) und dem
additiv exportierten `ermittleHookPfade` (F4) zusammen — Ergebniswert
identisch, nur der Berechnungsweg unterscheidet sich (Begründung im
Kopfkommentar der Testdatei).

`npm run check` und `npm run check:template` grün, `tests 118, pass
118, fail 0`. WS-2 (E-186-Eskalation über F9, erneuter Anlauf) bewusst
nicht Teil dieses Baudurchgangs (Vertrag-SCOPE, hängt an der noch
offenen D2-Anwendungsfrage).

## 2026-09-04 — Korrekturrunde WS-1 (AK3-Asymmetrie aufgehoben, F-103/F-104)

Berichtigung zum Eintrag "WS-1-Bauauftrag ausgeführt" oben (Anhängeprotokoll
— jener Eintrag bleibt unverändert stehen): die dortige Aussage, die
F4-Startfreigabe-Fixture in `execution-controller.test.ts` sei "inhaltlich
dasselbe Muster wie claude-code-gateway.test.ts", war sachlich falsch —
dort ruft die Fixture `ermittleIstZustand` direkt auf
(`claude-code-gateway.test.ts:114`), die F8-Fixture tat das nicht. Real
war: ein Widerspruch zwischen AK3-Grep (verbietet `ermittleIstZustand`
ausnahmslos, auch in Testdateien) und dem AK8-Fixture-Bedarf (die Fixture
muss denselben Ist-Zustand liefern wie `starteGateway` selbst misst),
zunächst durch Duplikation der Hash-/Hook-Pfad-Berechnung gelöst statt
eskaliert.

Entscheidung Stefan (04.09.2026, verbindlich): AK3-Grep erhält dieselbe
`*.test.ts`-Ausnahme wie AK1 — löst den Widerspruch auf, statt ihn zu
umgehen. Umgesetzt:

- `scripts/check-f8-execution-controller.mjs`: AK3-Schleife läuft jetzt
  über `produktionsdateien()` statt `alleDateien()`, wie AK1. Real
  kalibriert — Rot-Fall in einer Produktionsdatei (`index.ts`) → Exit 1,
  Grün-Fall mit demselben Bezeichner nur in der Testdatei → Exit 0
  (Beleg in `state/gates.md`).
- `execution-controller.test.ts`: die handgebaute Ist-Zustand-Berechnung
  (`WERKZEUG_KONFIGURATION_HASH`/`HOOK_PFADE`/`SCHUTZSKRIPTE` aus
  `sha256Hex` + `ermittleHookPfade`) ersatzlos entfernt, ersetzt durch den
  direkten Aufruf `ermittleIstZustand(SETTINGS_PFAD)` — jetzt tatsächlich
  dasselbe Muster wie `claude-code-gateway.test.ts:114`. Import von
  `ermittleHookPfade` entfällt (ungenutzt).

Zusätzlich zwei Testkorrekturen an AK2 (F-103) und ein neuer Testfall,
ohne neuen Scope (WS-2a/2b weiterhin ausgeschlossen):

- **Nichtaufruf-Nachweis repariert (F-103):** die bisherige Assertion
  `ladeArtefaktVersion(laufakte-<laufId>) === null` war eine
  Vakuum-Assertion — dieses Artefakt schreibt `starteGateway` erst am Ende
  seines Erfolgspfads, im Rot-Fall wird die Stelle nie erreicht, unabhängig
  davon ob F8 `klassifiziereLauf` aufruft. Ersetzt durch einen Nachweis,
  der real an `klassifiziereLauf` hängt: `klassifiziereLauf` schreibt eine
  `terminal`-Wirkungsmarke — aber F6as eigenes
  `pruefeUndVerweigereBeiTreffer`/`verweigereStart` schreibt bei diesem
  E-182-Rot-Fall bereits selbst eine (real per Probe-Skript bestätigt, vor
  jeder F8-Beteiligung). Die tragfähige Assertion ist deshalb nicht "kein
  terminal-Eintrag", sondern "kein ZWEITER" — die Kette bleibt bei genau 1
  terminal-Eintrag statt bei 2, wenn `klassifiziereLauf` zusätzlich liefe.
  Pflicht-Kalibrierung real erbracht: Early-Return
  (`execution-controller/index.ts:77-79`) temporär deaktiviert
  (`if (false && !gatewayErgebnis.ok)`, `TEMP-ROT-FALL-KALIBRIERUNG`) →
  `klassifiziereLauf` lief real im Rot-Fall, Kette wuchs auf 2
  terminal-Einträge, Testlauf rot (`AssertionError`); danach zurückgebaut,
  Testlauf wieder grün, kein `TEMP-ROT-FALL`-Rest (`grep -rn`).
- **Grund-Identität statt Teilstring (Punkt 3):** `assert.match` auf
  `E-182`/`--dangerously-skip-permissions` ersetzt durch
  `assert.strictEqual` gegen den real von `starteGateway` gelieferten Wert
  — unabhängiger Referenzaufruf im Test mit identischen Eingaben (eigene
  `laufId`, um die geprüfte Kette nicht mitzubeschreiben), `grund` direkt
  verglichen. Beweist Passthrough über die Modulgrenze, nicht nur
  Inhaltsähnlichkeit.
- **Neuer Testfall (F5-Gegenstück zu AK2):** `unbekannte-rolle-fixture`
  als Rolle löst `baueKontextpaket`s Rot-Fall (`ok:false,
  grund:'unbekannte_rolle'`) aus. Belegt: `fuehreAufgabeDurch` bricht
  sofort mit `stufe:'kontextpaket'` ab, der Ergebniswert ist identisch zu
  einem unabhängigen `baueKontextpaket`-Aufruf mit denselben Eingaben
  (`deepStrictEqual`), der Spy-Starter wurde nie gerufen, kein
  `laufakte`-Artefakt entstand.

AK1 "genau einmal": keine Nacharbeit. Die wörtliche Vertragsabweichung
(Indirektnachweis über F2-`versionSequenz`/FIFO-Paarung statt
Spy/Zähler, weil ein Modul-Mock D1 verletzen würde) bleibt eine bewusste,
im Bauauftrag entschiedene Abweichung — siehe Kopfkommentar der Testdatei.

Ergebnis: `node --test execution-controller.test.ts` → `tests 3, pass 3,
fail 0` (AK1/AK5/AK8 Grün-Durchlauf, AK2/AK8 F6a-Rot-Fall, F5-Abbruchzweig
kontextpaket-Rot-Fall — nicht 4, wie im Korrekturauftrag als Erwartung
genannt; der Auftrag benennt nur einen einzigen neuen Testfall (Punkt 4),
Punkte 2/3 modifizieren die bestehende AK2-Prüfung, keine Aufspaltung in
zwei Testfälle vorgenommen, da beide Assertionen zu derselben
AK2-Vertragsklausel gehören). `npm run check` und `npm run check:template`
grün, `tests 119, pass 119, fail 0`.

## 2026-09-04 — WS-1 freigegeben, committet

WS-1 (AK1, AK2, AK3, AK5, AK8, AK9) umgesetzt: `src/execution-
controller/` führt einen Lauf vollständig durch F5 (`baueKontextpaket`)
→ F6a (`baueAufruf`/`starteGateway`) → F7 (`klassifiziereLauf`) → F1B
(`stelleLaufstatusFest`), in fester Reihenfolge, ohne eine der
orchestrierten Prüf-/Klassifikationsregeln nachzubauen (AK1/AK3-Gate,
`scripts/check-f8-execution-controller.mjs`). Eine Korrekturrunde (siehe
Eintrag oben, F-103/F-104) hat die AK3-Asymmetrie aufgehoben und den
AK2-Nichtaufruf-Nachweis repariert.

Reviewer-/QA-Pass (Subagenten `code-reviewer` + `qa`, je frischer
Kontext) vor dieser Freigabe durchlaufen — nicht retroactiv nachgeholt
(F-046):

- `code-reviewer`: **Freigegeben mit Hinweisen**. Verifiziert real (per
  Codelesung, u. a. `result-evaluator/index.ts:132`,
  `invocation-policy/index.ts:527-534`): die AK2-Assertion "kein
  zweiter terminal-Eintrag" ist ein tragfähiger Nichtaufruf-Beweis, der
  unabhängige `starteGateway`-Referenzaufruf im Test ist sauber isoliert
  (eigene `laufId`, eigenes Aufräumen), die `AusfuehrungsOptionen`-
  Durchreichung ist tatsächlich rein (keine Interpretation im
  Controller). Ein Hinweis (F-107, s. u.), keine kritischen Befunde.
- `qa`: **Freigegeben mit Hinweisen**. Die drei vorhandenen Testfälle
  decken AK1/AK2/AK3/AK5/AK8/AK9 im WS-1-Scope strukturell ab; die
  WS-2-Grenze (E-186-Eskalation, AK4/AK6/AK7) ist sauber eingehalten,
  kein Codepfad täuscht F9-Verhalten vor. Zwei Hinweise mit Schweregrad
  „mittel" (F-105, F-106, s. u.), zwei mit „niedrig" (nicht als
  eigene Findings aufgenommen: Scope-Abschnitt in `feature.md` liest
  sich ohne Weiterlesen zur Workstream-Liste so, als läge die
  F9-Eskalation bereits in F8 insgesamt; fehlende Bestätigungstests für
  leere `anfragen`-Liste und weitere F5/F6a-Ablehnungsgründe).

Drei Findings aus den beiden Pässen in `state/findings.md` aufgenommen
(kein Blocker für diese Freigabe, alle P2/P3, offen):

- **F-105** (`TECH_DEBT`, P2): ungültige `laufId` wirft in
  `fuehreAufgabeDurch` unbehandelt statt ein strukturiertes
  `AusfuehrungsErgebnis` zu liefern — weder getestet noch dokumentiert.
- **F-106** (`TECH_DEBT`, P3): AK2 ist am Controller nur über eine von
  vier genannten `starteGateway`-Verweigerungsquellen (Aufrufparameter)
  real getestet, nicht über Startziel/Autorisierung/Ist-Zustand.
- **F-107** (`TECH_DEBT`, P3): `starteGateway`-Aufruf reicht
  `GatewayOptionen` feldweise statt strukturell durch — ein künftiges
  F6a-Optionsfeld würde still nicht mitgereicht.

Stand freigegeben. `features/F8/feature.md` Status bleibt bewusst auf
`READY_FOR_TECH` — F8 ist erst mit WS-2a (Eskalation über F9) und WS-2b
abgeschlossen, kein Statuswechsel auf `ABGESCHLOSSEN` für einen
Teil-Workstream (vermeidet den in F-093 beschriebenen Drift-Musterfall
in die andere Richtung). WS-2a/2b offen, hängen weiterhin an der noch
unbeantworteten D2-Anwendungsfrage (F-094/F-096).
