# QA-Findings — F4: Invocation Policy / Protection Validator

Slug: f4-invocation-policy
Stand: 2026-08-31
Rolle: QA (Subagent `qa`, frischer Kontext, `Read/Grep/Glob`, kein
Schreibrecht)
Anlass: Retroactiver Review-Pass — F4 ist bereits gemergt (PR #33, main HEAD
`d32f10c`). Kein Pre-Merge-Review, keine Nachbesserung durch QA selbst.

## Kopf — was gegen welche Quellen geprüft wurde

- `features/F4/feature.md` (vollständig, 11 Akzeptanzkriterien)
- `src/invocation-policy/index.ts`, `types.ts`, `verbotene-aufrufparameter.ts`
- `src/invocation-policy/invocation-policy.test.ts`
- `schemas/kontrollzustand-invocation-policy-{baseline,wirksamkeitsnachweis}-payload.schema.json`
  + vier Fixtures
- `scripts/check-f4-invocation-policy.mjs`
- `state/plan-v1-f4-invocation-policy.md`, `plan-v2-...`,
  `advisor-findings-f4-invocation-policy.md`, `docs/STATUS.md`,
  `ARCHITECTURE.md`

## Leitfragen

1. **AC10-Testfälle vollständig?** Ja, alle vier verlangten Fälle vorhanden
   plus zwei weitere (F11-Querkonsistenz, AC7-Terminalartefakt). Einschränkung:
   Fall 2 (E-183) deckt nur „manipuliertes" Schutzskript, nicht „fehlendes"
   (siehe Befund 2). Zusätzlich im Gate-Skript über echte Fixtures dupliziert
   — gute doppelte Absicherung (unit + Gate).
2. **Fehlende Randfälle?** Ja, siehe Befunde 1–6 unten.
3. **ABGELEHNT → Terminalartefakt VERWEIGERT echt getestet?** Ja — Test
   schreibt real eine `run_prepared`-Marke, ruft `verweigereStart` auf und
   verifiziert über `stelleLaufstatusFest` den realen Laufstatus (kein Mock).
   Einzige Lücke: kein End-to-End-Test der vollen Kette
   `pruefeStartfreigabe()` → `ABGELEHNT` → `verweigereStart()` (Befund 7,
   geringe Schwere).
4. **E-187 fälschlich als Garantie suggeriert?** Nein. `werkzeugsatz_begrenzung`
   ist als Literal-Typ `'DEKLARIERT'` erzwungen, kein Codepfad kann
   `'ERZWUNGEN'` liefern. Kein Befund.

## Befunde

**[NICHT BLOCKIEREND] Hash-Prüfung ist Multiset-Vergleich, keine Pfad-zu-Hash-Zuordnung (Swap-Lücke)**
Fundstelle: `src/invocation-policy/index.ts:93-102`
(`schutzskriptHashSatz`/`schutzskriptHashSaetzeGleich`), verwendet in
Z.293-296 und Z.333-335; `types.ts:22-25`
(`IstZustand.schutzskript_hashes: string[]`, ohne Pfad-Kopplung).
AC3 verlangt, dass „der reale Hash **jedes referenzierten** Schutzskripts"
mit der Baseline übereinstimmt. Implementiert ist aber nur ein
Mengenvergleich (sortiert, multiset-gleich) — ein Vertauschen zweier
geschützter Skript-Inhalte (Skript A bekommt Inhalt B und umgekehrt) bliebe
`FREIGEGEBEN`, weil die Gesamtmenge der Hashes unverändert bleibt. Kein Test
deckt diesen Vertauschungsfall ab (auch der F11-Test testet nur einen
einzelnen abweichenden Hash). Inhaltlich wichtigster Befund dieses Passes —
nicht blockierend nach CLAUDE.md-Kriterien, aber vor F6-Integration zu
klären: verlangt AC3 eine strengere pfadgebundene Prüfung, oder wird die
Mengen-Semantik bewusst akzeptiert und dokumentiert?

**[NICHT BLOCKIEREND] AC10 Fall 2 deckt nur „manipuliert", nicht „fehlend"**
Fundstelle: `invocation-policy.test.ts:130-152`
feature.md AC10 nennt wörtlich „manipuliertes/**fehlendes** Schutzskript".
Der Test deckt nur Hash-Abweichung bei gleicher Array-Länge ab, nicht ein
komplett fehlendes Schutzskript (kürzeres Array oder nicht lesbare Datei).
Die Längenprüfung in `schutzskriptHashSaetzeGleich` fängt das vermutlich
korrekt ab, aber unbewiesen.

**[NICHT BLOCKIEREND] Keine Testabdeckung für mehrere gleichzeitige Verbotsparameter**
Fundstelle: `invocation-policy.test.ts:176-183`,
`verbotene-aufrufparameter.ts:18-25`. Funktional korrekt (jede Kombination
mit ≥1 Treffer wird abgelehnt), aber ungetestet — reine Testlücke, kein
Nutzerrisiko.

**[NICHT BLOCKIEREND] Keine Fixture für teilweise korrupte `schutzskripte`-Liste**
Fundstelle: `schemas/examples/kontrollzustand-invocation-policy-baseline.invalid-leere-schutzskripte.json`
(nur leeres Array getestet). Einziger Negativfall ist „Array komplett leer",
nicht „ein Eintrag fehlerhaft neben validen".

**[NICHT BLOCKIEREND] Mehrwort-Verbotsparameter strukturell fragil, ungetestete Varianten**
Fundstelle: `verbotene-aufrufparameter.ts:9-16,20`. Deckt sich mit
Code-Reviewer-Befund 1 (`state/code-reviewer-findings-f4-invocation-policy.md`)
— bereits in plan-v1 als „offene Unsicherheit 4" dokumentiert, keine
stillschweigende Annahme. Zusätzlich: Groß-/Kleinschreibung und
Whitespace-Varianten ungetestet (strenger Stringvergleich ohne
Normalisierung).

**[NICHT BLOCKIEREND] Pfad-Normalisierung ohne eigenen Test**
Fundstelle: `src/invocation-policy/index.ts:79-91`
(`normalisierePfadFuerVergleich`, referenziert Advisor F12). Die
Zwischenentscheidung (Trenner-/Groß-Kleinschreibungs-Normalisierung,
fail-closed) ist sauber im Code und Journal dokumentiert (kein
Regelverstoß), aber es fehlt ein Test, der reine Schreibvarianten prüft
(`C:\Foo\Bar` vs. `c:/foo/bar` sollten als identisch gelten). Eine künftige
Regression an dieser Logik bliebe unbemerkt.

**[NICHT BLOCKIEREND] Kein End-to-End-Test der Kette `pruefeStartfreigabe` → `verweigereStart`**
Fundstelle: `invocation-policy.test.ts:130-174` und `:206-219` sind getrennte
Tests. Verdrahtung ist trivial (String-Durchreichung), aber ein
durchgehender Test wäre der realistischere Beweis für F6 als künftigen
Aufrufer.

**[NICHT BLOCKIEREND] AC1 (gültiges JSON Schema Draft 2020-12) nicht automatisiert geprüft**
Fundstelle: `scripts/check-f4-invocation-policy.mjs` validiert nur Fixtures
gegen Handvalidierer, nicht die Schema-Datei selbst gegen das
Draft-2020-12-Metaschema. Projektweites Bestandsmuster (identisch bei F0),
keine F4-spezifische Regression.

## Urteil

- [ ] Freigegeben
- [x] Freigegeben mit Hinweisen
- [ ] Nicht freigegeben
- [ ] Blockiert

Kein Befund erfüllt die CLAUDE.md-Blockade-Kriterien. Der Kernablauf (AC10
vier Fälle inkl. FREIGEGEBEN/ABGELEHNT-Grund-Objekt und realem
VERWEIGERT-Terminalartefakt) ist real und korrekt getestet. Alle acht Punkte
sind Test-/Robustheitslücken bzw. bereits dokumentierte offene Punkte.

## Nächster sinnvoller Schritt

Befund 1 (Multiset-Vergleich ohne Pfad-Hash-Zuordnung) als eigenes Finding in
`state/findings.md` nachtragen und vor F6-Integration entscheiden lassen.
Befunde 2–7 könnten in einer kleinen Nachtrags-Iteration zu
`invocation-policy.test.ts` ergänzt werden, sobald ein Workstream dafür
geöffnet wird — kein eigenständiges Feature nötig.
