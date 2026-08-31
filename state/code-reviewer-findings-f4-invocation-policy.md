# Code-Reviewer-Findings — F4: Invocation Policy / Protection Validator

Slug: f4-invocation-policy
Stand: 2026-08-31
Rolle: Reviewer (Subagent `code-reviewer`, frischer Kontext, `Read/Grep/Glob`,
kein Schreibrecht)
Anlass: Retroactiver Review-Pass — F4 ist bereits gemergt (PR #33, main HEAD
`d32f10c`). Kein Pre-Merge-Review, keine Nachbesserung durch den Reviewer
selbst.

## Kopf — was gegen welche Quellen geprüft wurde

- `src/invocation-policy/index.ts`, `types.ts`, `verbotene-aufrufparameter.ts`
- `src/invocation-policy/invocation-policy.test.ts`
- `src/authorization-boundary/index.ts` (additiver Diff, indirekt verifiziert
  — siehe Methodik-Hinweis)
- `scripts/check-f4-invocation-policy.mjs`
- `schemas/kontrollzustand-invocation-policy-{baseline,wirksamkeitsnachweis}-payload.schema.json`
  + vier Beispiel-Fixtures
- `package.json`, `state/gates.md`, `features/F4/feature.md`,
  `features/F4/journal.md`, `ARCHITECTURE.md` §3/§4

**Methodik-Hinweis:** Der Reviewer hat nur `Read/Grep/Glob`, kein Bash — der
additive Diff auf `src/authorization-boundary/index.ts` aus Commit `d32f10c`
konnte daher nicht direkt per `git show` geprüft werden. Stattdessen indirekt
verifiziert: (a) `authorization-boundary.test.ts` importiert weiterhin nur
`pruefeAutorisierung`/`verweigereAutorisierung` (unverändertes öffentliches
Verhalten), (b) `state/gates.md` dokumentiert einen realen Regressionslauf
nach dem F4-Merge (`tests 6, pass 6, fail 0`). Belastbar, aber kein selbst
erzeugter Beleg — bei Bedarf durch einen Lauf mit Bash-Zugriff ergänzen.

## Befunde

**[NICHT BLOCKIEREND] Mehrwort-Verbotsparameter matcht nicht bei tokenisiertem Array**
Fundstelle: `src/invocation-policy/verbotene-aufrufparameter.ts:18-24`
`pruefeAufrufparameter` prüft `parameter.includes(verbotenerWert)` elementweise.
Der Eintrag `'--permission-mode bypassPermissions'` ist ein einzelner String
mit eingebettetem Leerzeichen. Übergibt ein künftiger Aufrufer (F6) den
Aufruf als natürliches Tokens-Array (`['--permission-mode',
'bypassPermissions']`, analog `process.argv`), matcht dieser Eintrag nie —
stiller Fail-Open-Fall bei genau dem gefährlichsten Listeneintrag.
Einordnung: bereits in `state/plan-v1-f4-invocation-policy.md` (offene
Unsicherheit 4) und `features/F4/journal.md` als bewusst offengelassene
Entscheidung dokumentiert, nicht stillschweigend in Code verwandelt
(CLAUDE.md-Entscheidungsregel Punkt 5 eingehalten). Kein Testfall für den
Zweitoken-Fall vorhanden.
Empfehlung: vor F6-Anbindung klären und Testfall für die tokenisierte Form
ergänzen.

**[NICHT BLOCKIEREND] Duplizierte Repo-Wurzel-Konstante F3/F4**
Fundstelle: `src/invocation-policy/index.ts:48` vs.
`src/authorization-boundary/index.ts:31`
`STANDARD_REPO_WURZEL` wortidentisch in beiden Modulen dupliziert (bewusste
D1-Modulgrenze, kein Cross-Import einer privaten Konstante) — Wartbarkeits-
hinweis, kein Fehler.

**[NICHT BLOCKIEREND] Schema/Handvalidierer-Duplikation**
Fundstelle: `src/invocation-policy/index.ts:105-231` vs. die beiden
`schemas/kontrollzustand-invocation-policy-*.schema.json`. Durchgängiges
Projektmuster (F3, F1B, F2, F9, F5 identisch), keine F4-spezifische
Neuerung — Drift-Gefahr zwischen Schema-Datei und Handvalidierer bleibt
architektonisch ungelöst, projektweit.

## Positivbefunde

- AC8 (kein Kindprozess) eigenständig per Grep gegengeprüft: einziger Treffer
  `execFileSync('git', …)` liegt in `invocation-policy.test.ts`
  (Wegwerf-Repo-Fixture), nicht in Produktionscode. Gate-Skript grept korrekt
  nur Produktionsdateien.
- AC9/E-187: `werkzeugsatz_begrenzung: 'DEKLARIERT'` als Literal-Typ in allen
  drei Rückgabepfaden fest verdrahtet — kein Codepfad kann `'ERZWUNGEN'`
  erzeugen.
- D5 (kein zweiter Regelsatz): F4 ruft F3s `leseAusCommit`/
  `gitattributesPinntZeilenenden` unverändert von außen auf, baut keine
  eigene Autorisierungsprüfung nach.
- F11-Fix real wirksam: `pruefeStartfreigabe` misst `istZustand` genau
  einmal und reicht ihn an beide Bedingungsprüfungen weiter.
- Kein `any`, `unknown` korrekt für ungeprüfte externe Eingaben.
- Durchgängig D4-Muster (kein Wurf bei erwartetem Rot-Fall).
- Kalibrierung real belegt (fünf TEMP-ROT-FALL-Eingriffe, `state/gates.md`).
- Gate korrekt in `npm run check`/`check:template` verdrahtet.
- Alle vier Fixture-Hashes exakt 64 Hex-Zeichen (frühere 62-Zeichen-Korruption
  bereits behoben) — per Grep verifiziert.

## Urteil

- [ ] Freigegeben
- [x] Freigegeben mit Hinweisen
- [ ] Nicht freigegeben
- [ ] Blockiert

Kein Befund erfüllt die CLAUDE.md-Blockade-Kriterien (echte Verzweigung,
Irreversibles, Verstoß gegen ARCHITECTURE.md/Scope). Alle drei Punkte sind
Wartbarkeits-/Robustheitshinweise, einer davon bereits als offene
Entscheidung dokumentiert.

## Nächster sinnvoller Schritt

Befund 1 (Mehrwort-Verbotsparameter) als Finding in `state/findings.md`
nachtragen, damit er beim Bau von F6 (Claude-Code-Gateway) nicht verloren
geht — dort wird `pruefeAufrufparameter` erstmals real mit einer konkreten
Aufrufrepräsentation aufgerufen. Kein Nacharbeitsbedarf an F4 selbst vor
diesem Zeitpunkt.
