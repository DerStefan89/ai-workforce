SCHRITT 0: Arbeitsverzeichnis ausgeben und gegen das im Auftrag genannte Zielverzeichnis prüfen. Bei Abweichung: abbrechen, melden, nichts ändern.

Zielverzeichnis: Repo DerStefan89/ai-workforce, Branch
`feature/f6a-gateway-lesepfad` (bereits vorhanden, von `main` abgezweigt
— weiterarbeiten, nicht neu abzweigen).

## TASK: f6a-claude-code-gateway-ws1

GOAL: Workstream 1 von F6a — Aufrufkonstruktion und Startfreigabe für
das Claude-Code-Gateway, **ohne jeden Prozessstart** (WS2/WS3 folgen als
eigener Vertrag). Ein neues, eigenständiges Modul
`src/claude-code-gateway/` konstruiert einen Aufruf ausschließlich als
Tokens-Array (`--model` pflicht, `--output-format json`,
`--setting-sources project`, Werkzeugsatz `DEKLARIERT`), lässt ihn vor
jeder Weitergabe durch F4s `pruefeAufrufparameter` (E-182) prüfen — und
zusätzlich wird `pruefeAufrufparameter` selbst in F4 gehärtet, damit ein
mehrwortiger Verbotseintrag (`'--permission-mode bypassPermissions'`)
auch dann erkannt wird, wenn er im Tokens-Array auf zwei Elemente
verteilt ist (F-048). Bei einem Treffer: `verweigereStart` (F4). Erfüllt
AK1-4 aus `features/F6a/feature.md` sowie den F-048-Teil von AK2 exakt.
**Nicht** Teil dieses Vertrags: `pruefeStartfreigabe` (E-183/E-188),
Prozessstart, Wirkungsmarken, Laufakte, F2-Registrierung — diese gehören
laut Advisor-Pass Befund 1 zu F6b bzw. laut plan-v1/v2 zu WS2.

CONTEXT:
- [Fakt] Vollständiger Plan: `state/plan-v1-f6a-claude-code-gateway.md`
  (Grundmechanik, unverändert gültig für alles, was plan-v2 nicht
  überschreibt) plus `state/plan-v2-f6a-claude-code-gateway.md` (drei
  Deltas — **maßgeblich bei Widerspruch**). Dieser Vertrag ist die
  Ausführungsanweisung für **WS1 allein**; bei Widerspruch gilt dieser
  Vertrag, bei dessen Schweigen plan-v2, bei dessen Schweigen plan-v1.
- [Fakt] Advisor-Pass: `state/advisor-findings-f6a-claude-code-gateway.md`
  — **Freigegeben mit Hinweisen.** Befund 1 (F6a darf nicht die volle
  `pruefeStartfreigabe` aufrufen) ist durch Stefans Entscheidung Option A
  aufgelöst und bereits in `features/F6a/feature.md` (AK4, Scope-Punkt
  „Startfreigabe", F4-Dependency-Zeile) sowie plan-v2 Delta 1
  eingearbeitet — dieser Vertrag übernimmt das wörtlich. Befund 2 (F2-
  Anbindung) und Befund 3 (`state/gates.md`-Zusage) betreffen WS2/WS3,
  nicht diesen Vertrag. Befund 4 (`modell_beobachtet`) betrifft WS2/WS3.
- [Fakt] Feature-Akte: `features/F6a/feature.md`, `Status:
  READY_FOR_TECH`, alle vier von `scripts/check-feature.mjs` verlangten
  Abschnitte vorhanden (`node scripts/check-feature.mjs` lief zuletzt
  grün, 10 Akten). Bei Widerspruch gilt `feature.md` für WAS, der Plan
  für WIE.
- [Fakt] F-048 real am Code verifiziert:
  `src/invocation-policy/verbotene-aufrufparameter.ts:18-24`
  (`pruefeAufrufparameter`) prüft `parameter.includes(verbotenerWert)`
  elementweise gegen `VERBOTENE_AUFRUFPARAMETER` (Zeile 9-16). Der
  Eintrag `'--permission-mode bypassPermissions'` (Zeile 14) ist ein
  einzelner String mit eingebettetem Leerzeichen — matcht nie gegen ein
  Tokens-Array der Form `['--permission-mode', 'bypassPermissions']`.
- [Fakt] `verweigereStart` (`src/invocation-policy/index.ts:413-419`):
  Signatur `(laufId: string, profilReferenz: ProfilReferenz, grund:
  string, optionen: SchreibOptionen = {})`, Rückgabe `{ pfad: string;
  selbstHash: string }`. Dünner Aufrufer von F1Bs `schreibeWirkungsmarke`
  mit `art: 'terminal'`, `ergebnis: 'VERWEIGERT'` — unverändert von außen
  aufrufen (D5), kein Nachbau.
- [Fakt] `ProfilReferenz` (`src/checkpoint-store/types.ts:15-19`):
  `{ pfad: string; hash: string; version: number }`.
- [Fakt] `SchreibOptionen` (`src/invocation-policy/index.ts:56-59`, lokal,
  nicht exportiert): `{ schreiber?: CheckpointSchreiber;
  basisVerzeichnis?: string }` — `src/claude-code-gateway/` definiert
  eine eigene, lokale `Optionen`-Form nach demselben Muster (D1), kein
  Import einer privaten F4-Schnittstelle.
- [Fakt] `pruefeAufrufparameter` und `VERBOTENE_AUFRUFPARAMETER` sind
  bereits aus `src/invocation-policy/index.ts:42-43` re-exportiert —
  `src/claude-code-gateway/` importiert sie von dort (Modulgrenze wie
  F5/F9 gegenüber F2), nicht direkt aus
  `verbotene-aufrufparameter.ts`.
- [Fakt] Namens-Kollisionsvorsicht (F5-Präzedenz, plan-v2-f5 Delta 6):
  `src/human-transport/types.ts:33` trägt bereits ein Feld `executor:
  string`. Keine neue Nutzung des Bezeichners `executor` als Typ- oder
  Rollenname in `src/claude-code-gateway/` — falls ein Rollenbezug nötig
  wird, `ausfuehrung` verwenden (F5-Konvention).
- [Fakt] `package.json` Zeile 17/18 (`check`/`check:template`): enden
  aktuell auf `... && node scripts/check-f4-invocation-policy.mjs [&&
  npm run test]`. `check-f6a-claude-code-gateway.mjs` in beide direkt
  danach eintragen.
- [Fakt] Referenzmuster für das Gate-Skript:
  `scripts/check-f4-invocation-policy.mjs` — importiert Kernfunktionen
  direkt aus dem Modul statt einen zweiten Regelsatz nachzubauen.

SCOPE:
1. **F-048-Fix in F4 (additiv, kein Verhaltensbruch für bestehende
   Tests):** `src/invocation-policy/verbotene-aufrufparameter.ts` —
   `pruefeAufrufparameter` ergänzen: für jeden Eintrag aus
   `VERBOTENE_AUFRUFPARAMETER`, der ein Leerzeichen enthält, den Eintrag
   bei Leerzeichen in Tokens zerlegen (`verbotenerWert.split(' ')`) und
   zusätzlich zum bestehenden `parameter.includes(verbotenerWert)`-Pfad
   prüfen, ob diese Token-Folge als zusammenhängendes Fenster im
   `parameter`-Array vorkommt (jede Startposition `i` von `0` bis
   `parameter.length - tokens.length`, elementweiser Stringvergleich
   `parameter[i+k] === tokens[k]` für alle `k`). Einwortige Einträge
   bleiben ausschließlich über den bestehenden `includes`-Pfad geprüft
   (kein Verhalten ändern). Rückgabe bei Fenstertreffer: identisches
   Format `{ ok: false, grund: `verbotener Aufrufparameter (E-182):
   '${verbotenerWert}'` }` — derselbe Grundtext wie beim
   `includes`-Treffer, damit kein Aufrufer zwischen den beiden
   Erkennungspfaden unterscheiden muss.
2. `src/invocation-policy/invocation-policy.test.ts` ergänzen (additiv,
   bestehende Fälle unverändert): Testfall, der
   `['--permission-mode', 'bypassPermissions']` als Tokens-Array gegen
   `pruefeAufrufparameter` prüft → `ok: false` mit dem
   `'--permission-mode bypassPermissions'`-Grundtext (schließt F-048,
   AK2 der Feature-Akte). Zusätzlich ein Testfall mit dieser Token-Folge
   eingebettet in ein größeres Array (z. B. `['--model', 'x',
   '--permission-mode', 'bypassPermissions', '--output-format',
   'json']`), um die Fenster-Suche unabhängig von der Array-Position zu
   belegen.
3. `src/claude-code-gateway/types.ts` — neues, eigenständiges Modul (D1,
   D5, kein F1/F1B/F2/F3/F4/F5-Touch außer den vorgesehenen
   Außenaufrufen):
   - `export type AufrufTokens = string[]`
   - `export interface WerkzeugsatzBegrenzung { modus: 'DEKLARIERT';
     erlaubte_werkzeuge: string[] }` (E-187, Rang `DEKLARIERT` wie F4 —
     kein Codepfad darf `'ERZWUNGEN'` erzeugen, analog
     `werkzeugsatz_begrenzung` in F4s `Starturteil`).
   - `export interface AufrufEingaben { modell: string;
     werkzeugsatz: WerkzeugsatzBegrenzung }` (E-185: `modell` ist
     Pflichtfeld, kein optionaler/impliziter Wert).
   - Lokale `Optionen`-Schnittstelle nach `SchreibOptionen`-Muster
     (`{ schreiber?: ...; basisVerzeichnis?: string }`), nicht
     exportiert.
4. `src/claude-code-gateway/index.ts`:
   - `export function baueAufruf(eingaben: AufrufEingaben):
     AufrufTokens` — konstruiert `['--model', eingaben.modell,
     '--output-format', 'json', '--setting-sources', 'project',
     '--tools', eingaben.werkzeugsatz.erlaubte_werkzeuge.join(',')]`
     (Reihenfolge dokumentiert, nicht durch Test erzwungen). Wirft
     synchron (D4-Ausnahme wie F1Bs `schreibeWirkungsmarke` bei
     ungültigem `art`/`ergebnis`, vor jeder Rückgabe), wenn
     `eingaben.modell` leer oder fehlt — E-185 ist eine
     Aufrufer-Vertragsverletzung, kein externer Rot-Fall, deshalb Wurf
     statt `{ ok: false }`.
   - `export function pruefeUndVerweigereBeiTreffer(tokens:
     AufrufTokens, laufId: string, profilReferenz: ProfilReferenz,
     optionen: Optionen = {}): { ok: true } | { ok: false; grund: string
     }` — ruft `pruefeAufrufparameter(tokens)` (F4, importiert aus
     `../invocation-policy/index.ts`) auf. Bei `ok: false`:
     `verweigereStart(laufId, profilReferenz, ergebnis.grund, optionen)`
     (F4) aufrufen, dann `{ ok: false, grund: ergebnis.grund }`
     zurückgeben. Bei `ok: true`: `{ ok: true }` zurückgeben. **Kein**
     Prozessstart in dieser Funktion — das ist WS2. Diese Funktion ist
     bewusst der einzige Gateway-Code, der vor WS2 existiert, und heißt
     nicht `starteGateway`, um keinen falschen Eindruck laufender
     Prozesse zu erwecken.
5. `src/claude-code-gateway/claude-code-gateway.test.ts` —
   `node:test`-Fälle: `baueAufruf` Grünfall (alle Pflichtfelder
   gesetzt, erwartetes Tokens-Array), `baueAufruf` wirft ohne `modell`,
   `pruefeUndVerweigereBeiTreffer` Grünfall (unauffällige Tokens →
   `{ ok: true }`), `pruefeUndVerweigereBeiTreffer` Rot-Fall (Tokens
   enthalten `'--dangerously-skip-permissions'` → `{ ok: false, grund }`,
   `verweigereStart` real aufgerufen, über F1Bs `stelleLaufstatusFest`
   verifizieren, dass eine `VERWEIGERT`-Terminalmarke entstanden ist —
   Muster wie F4s eigener AC7-Test), `pruefeUndVerweigereBeiTreffer`
   Rot-Fall für den F-048-Fenster-Fall (Tokens `['--permission-mode',
   'bypassPermissions']` eingebettet in ein größeres Array).
6. `scripts/check-f6a-claude-code-gateway.mjs` — Gate-Skript, Muster wie
   `check-f4-invocation-policy.mjs`: importiert `baueAufruf` und
   `pruefeUndVerweigereBeiTreffer` direkt aus dem Modul, ein
   Grünfall-Lauf, ein Rot-Fall-Lauf (verbotener Aufrufparameter), ein
   F-048-Fenster-Rot-Fall-Lauf. Eingehängt in `npm run check` UND `npm
   run check:template`, direkt nach `check-f4-invocation-policy.mjs`.
   **Nicht Teil dieses Gates:** alles, was WS2 liefert (Prozessstart,
   Laufakte, Rohereignisstrom) — das Skript wird in WS2 um die
   entsprechenden Prüfungen erweitert, nicht durch ein zweites Skript
   ersetzt.
7. `state/memory-map.md` — neue Zeile „Claude-Code-Gateway-Modul (WS1)"
   → `src/claude-code-gateway/`, „nicht hierhin": kein Touch an
   `src/invocation-policy/index.ts` außer den bereits vorhandenen
   Re-Exporten, keine Prozessstart-Logik vor WS2.
8. `features/F6a/journal.md` — Nachtrag: dieser Vertrag, WS1-Ausführung,
   Ergebnis.

NICHT:
- Prozessstart, Prozessstart-Primitiv (`starteProzess`), `RUN_PREPARED`-
  Wirkungsmarke, Laufakte (`LAUFAKTE_V0`), Rohereignisstrom,
  F2-Registrierung, `state/gates.md`-Eintrag — WS2/WS3, eigener Vertrag.
- `pruefeStartfreigabe` (E-183/E-188), `baselineReferenz`,
  `istZustand.schutzskripte`, `wirksamkeitsnachweis` — laut Advisor-Pass
  Befund 1/Option A ausdrücklich nicht Teil von F6a.
- Änderung von `src/invocation-policy/index.ts` (nur
  `verbotene-aufrufparameter.ts` wird geändert, `index.ts` bleibt
  unangetastet — die Re-Exporte dort sind bereits vorhanden).
- Änderung von `src/checkpoint-store/`, `src/context-builder/`,
  `src/lineage-registry/`, `src/authorization-boundary/`,
  `src/human-transport/` in jeder Form.
- `--tools`-Wert gegen eine reale Werkzeugliste validieren — der Inhalt
  von `erlaubte_werkzeuge` wird vom Aufrufer vorgegeben, nicht von
  diesem Modul geprüft (E-187 bleibt `DEKLARIERT`).
- `kontrollzustand-roh/`, `.gitignore`-Eintrag dafür — WS2.
- F-030 (Bash-Kanal-Freigabe) — für diesen Vertrag irrelevant, da kein
  Prozessstart stattfindet.
- `git add`/`git commit`/`git push` ohne frische Freigabe.

BUDGET: Ein Baudurchgang plus höchstens eine Korrekturrunde. Zweites Rot
auf demselben Gate ⇒ BLOCKIERT ⇒ Mensch.

OUTPUT:
- Neue Dateien: `src/claude-code-gateway/{index,types}.ts`,
  `src/claude-code-gateway/claude-code-gateway.test.ts`,
  `scripts/check-f6a-claude-code-gateway.mjs`.
- Geänderte Dateien: `src/invocation-policy/verbotene-aufrufparameter.ts`
  (F-048-Fix), `src/invocation-policy/invocation-policy.test.ts`
  (zwei neue Testfälle), `package.json` (`check` und `check:template`),
  `state/memory-map.md`, `features/F6a/journal.md`.
- Beleg: `npm run check` und `npm run check:template` grün, Konsolen-
  Ausgabe im Bericht zeigen. Kalibrierungstest für das Gate-Skript
  (SCOPE.6): Grünfall, Rot-Fall (verbotener Parameter), F-048-Fenster-
  Rot-Fall je einmal real auslösen, erwarteten Rot-/Grün-Ausgang zeigen.
  Kalibrierungstest für `claude-code-gateway.test.ts`: jeden Testfall aus
  SCOPE.5 real auslösen (temporäre Fixture-/Codemanipulation),
  Fehlschlag zeigen, zurücknehmen, Grün-Zustand zeigen. Regressionsbeleg:
  `invocation-policy.test.ts` (alle bisherigen Fälle inkl. F-047),
  `checkpoint-store.test.ts`, `lineage-registry.test.ts`,
  `authorization-boundary.test.ts`, `human-transport.test.ts`,
  `context-builder.test.ts` bleiben unverändert grün (58/58 vor diesem
  Vertrag, jetzt plus die neuen F6a/F-048-Fälle).
- Commit ausschließlich mit expliziten Pfaden (nie `-A`/`.`), `git-flow`-
  Skill nutzen, kein Commit ohne frische Freigabe, Push separat
  autorisiert.
- Bericht: was gebaut wurde, welche Checks liefen (alle
  Rot-/Grün-Kalibrierungen), Ergebnis, echte Blocker.

ESCALATE:
- `state/plan-v2-f6a-claude-code-gateway.md` oder
  `state/advisor-findings-f6a-claude-code-gateway.md` fehlt oder
  widerspricht diesem Vertrag → abbrechen, melden, nichts anlegen.
- Einer der Kalibrierungstests reproduziert sich nicht wie hier
  beschrieben → anhalten, welcher Fall betrifft es, was tatsächlich
  passierte, melden. Nicht das Skript/den Test so lange anpassen, bis
  irgendein Fehler auftritt.
- `npm run check` wird rot an einem Glied, das dieser Auftrag nicht
  angefasst hat (insbesondere `invocation-policy.test.ts` AC10-Fälle,
  `checkpoint-store.test.ts`, `lineage-registry.test.ts`,
  `authorization-boundary.test.ts`, `human-transport.test.ts`,
  `context-builder.test.ts`) → anhalten und melden. Kein Nachziehen
  fremder Stellen.
- Der F-048-Fix in `verbotene-aufrufparameter.ts` würde einen
  bestehenden, bereits grünen Testfall aus `invocation-policy.test.ts`
  auf Rot ziehen (z. B. weil die Fenster-Suche einen einwortigen Eintrag
  fälschlich doppelt matcht oder einen unbeteiligten Parameter trifft)
  → anhalten, exakten Fall zitieren, melden. Nicht die Fenster-Logik so
  lange anpassen, bis der bestehende Test wieder grün wird, ohne den
  Grund zu verstehen.
- `git commit` oder `git push` wird ohne frische Freigabedatei verlangt
  → nicht ausführen.

Vertrag endet mit Freigabe-Halt: kein Bau, kein Commit, kein Push in
diesem Schritt. Ausführung erst nach Stefans expliziter, frischer
Freigabe.
