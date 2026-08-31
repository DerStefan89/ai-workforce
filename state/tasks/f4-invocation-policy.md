SCHRITT 0: Arbeitsverzeichnis ausgeben und gegen das im Auftrag genannte Zielverzeichnis prüfen. Bei Abweichung: abbrechen, melden, nichts ändern.

Zielverzeichnis: Repo DerStefan89/ai-workforce, Branch
`feature/f4-invocation-policy` (von `main` abgeleitet, vor Ausführung
mit Stefan bestätigen).

## TASK: f4-invocation-policy

GOAL: Ein neues, eigenständiges Modul `src/invocation-policy/` stellt
für eine geplante schreibende Execution fest, ob (a) die
Werkzeugkonfiguration gültig ist und jedes referenzierte Schutzskript
mit dem in einer extern bezeugten Baseline erwarteten Hash übereinstimmt
(E-183), und (b) ein vorliegender Wirksamkeitsnachweis für den aktuellen
Gültigkeitsschlüssel noch gilt (E-188, kein Drift) — beide Prüfungen
lokal, ohne Werkzeugaufruf. Erst wenn beide zutreffen, liefert die
Prüfung `{ starturteil: "FREIGEGEBEN", berechtigungskontext,
werkzeugsatz_begrenzung: "DEKLARIERT" }`; sonst `{ starturteil:
"ABGELEHNT", grund, werkzeugsatz_begrenzung: "DEKLARIERT" }` plus F1Bs
Terminalartefakt `VERWEIGERT`. Zusätzlich liegt die E-182-Verbotsliste
als eigenständige, von F6 aufrufbare Prüffunktion vor. F4 startet nie
selbst einen Werkzeugprozess (AC8, Gate-Grep). Die Akzeptanzkriterien
A1–A22 aus `state/plan-v1-f4-invocation-policy.md`, korrigiert um die
drei Deltas aus `state/plan-v2-f4-invocation-policy.md`, sind erfüllt.

CONTEXT:
- [Fakt] Vollständiger Plan: `state/plan-v2-f4-invocation-policy.md`
  (Delta zu `state/plan-v1-f4-invocation-policy.md`, der unverändert
  stehen bleibt und für alle nicht in plan-v2 erwähnten Abschnitte
  weiterhin gilt — Abschnitt 0 Verifikation, 1 Ziel, SCOPE.1/2/4/6-12,
  Design-Entscheidungen 1/2/4/5, 5 Ablageort, 6 Budget, 8 Rollen). Dieser
  Vertrag ist eine Ausführungsanweisung dazu; bei Widerspruch gilt
  plan-v2, bei dessen Schweigen plan-v1.
- [Fakt] Advisor-Pass (`state/advisor-findings-f4-invocation-policy.md`):
  **Freigegeben mit Hinweisen.** Kein Blocker, keine Umbau der Modul-/
  Schema-Struktur nötig. F11 (Hash-Querkonsistenz) und F3 (D16-Analogie
  für den künftigen Nachweis-Ablageort) sind in plan-v2 Delta 1/2 gelöst.
  F6 (Export-Umfang F3) ist in plan-v2 Delta 3 entschieden (drei
  einzelne additive Exporte, keine gebündelte Verifikationsfunktion).
- [Fakt] Feature-Akte: `features/F4/feature.md`, `Status:
  READY_FOR_TECH`. Ziel/Scope/Nicht-Ziele/Akzeptanzkriterien dort sind
  die Produktsicht; plan-v2/plan-v1 sind die technische Ausprägung. Bei
  Widerspruch gilt `features/F4/feature.md` für WAS, plan-v2/plan-v1
  für WIE.
- [Fakt] Dependency erfüllt: F3 (`src/authorization-boundary/`),
  gemergt. F4 ruft dessen Lesepfad ausschließlich über die drei in
  SCOPE unten benannten additiven Exporte auf, kein zweiter Regelsatz
  für `git show`-Lesen.
- [Fakt] Dependency erfüllt: F1B (`schreibeWirkungsmarke`, Signatur
  `src/checkpoint-store/index.ts:530-536`,
  `(laufId, profilReferenz, art, zusatz, optionen?)`) — F4 ruft sie bei
  `ABGELEHNT` mit `art: "terminal"`, `ergebnis: "VERWEIGERT"` auf, ohne
  die Signatur zu ändern (identisches Muster wie F3s
  `verweigereAutorisierung`, `src/authorization-boundary/index.ts:
  211-225`).
- **[Fakt, aus plan-v2 Delta 1 — F11-Fix, wörtlich für diesen Vertrag]**
  `pruefeStartbedingung2` nimmt keinen unabhängigen
  `istGueltigkeitsschluessel.werkzeug_konfiguration_hash`/
  `schutzskript_hashes` entgegen. `pruefeStartfreigabe` misst
  `istZustand` (Werkzeugkonfiguration-Hash + Schutzskript-Hashes) genau
  einmal und übergibt dasselbe Objekt an beide `pruefeStartbedingungX`-
  Aufrufe. `pruefeStartbedingung2(wirksamkeitsnachweis, istZustand,
  istUebrigeFelder)` baut den zu vergleichenden
  `istGueltigkeitsschluessel` intern aus `istZustand` (Hash-Felder) plus
  `istUebrigeFelder` (`werkzeug_version_deklariert`,
  `berechtigungskontext`, `arbeitsverzeichnis_pfad`) zusammen und
  vergleicht ihn feldweise gegen `wirksamkeitsnachweis.
  gueltigkeitsschluessel`. Kalibrierungstest (Pflicht, ersetzt/ergänzt
  plan-v1 A6): Bedingung 1 mit aktuellen, baseline-konformen
  `istZustand`-Hashes besteht (`{ ok: true }`), Bedingung 2 mit einem
  Nachweis, dessen `gueltigkeitsschluessel.schutzskript_hashes` von
  genau diesem `istZustand` abweicht, liefert `{ ok: false, grund }`
  (Drift) — **nicht** `FREIGEGEBEN`.
- **[Fakt, aus plan-v2 Delta 2 — D16-Analogie-Auflage]** Der Plan trifft
  keine Ablageort-Entscheidung für die Wirksamkeitsnachweis-Instanz
  (bleibt Parameter, Design-Entscheidung 3 unverändert). Dieser Vertrag
  fügt in `features/F4/feature.md` Abschnitt „Entscheidungs-Referenzen"
  oder `features/F4/journal.md` (Executor entscheidet, wohin — reines
  Dokumentationsdelta, keine Code-Konsequenz) folgende Auflage als
  Nachtrag ein: „Wo immer die Wirksamkeitsnachweis-Instanz später
  abgelegt wird, muss der Ort D16-analog vor dem Ausführungswerkzeug
  geschützt sein (extern oder commit-gepinnt gelesen, nie aus dem
  Arbeitsbaum dieses Produkt-Repos, das dieses Werkzeug selbst schreiben
  kann)." Kein Code-Scope, reine Dokumentationspflicht.
- **[Fakt, aus plan-v2 Delta 3 — Export-Umfang F3, löst [offene
  Unsicherheit 1]]** `src/authorization-boundary/index.ts` erhält einen
  rein additiven Diff: `export` auf drei bereits vorhandenen, aktuell
  modulinternen Funktionen — `leseAusCommit` (Zeile 76),
  `gitattributesPinntZeilenenden` (Zeile 89),
  `leiteRepoRelativenPfadAb` (Zeile 65). Keine Signatur-, Verhaltens-
  oder Rückgabewert-Änderung an diesen drei Funktionen oder an
  `pruefeAutorisierung`/`verweigereAutorisierung`/
  `validiereAutorisierungEintrag`. **Keine** gebündelte
  Verifikationsfunktion in F3 — der Advisor-Vorschlag dazu (F6) wurde in
  plan-v2 Delta 3 bewusst verworfen (Begründung dort: hielte den
  F3-Diff nicht minimal, F3 ist bereits abgeschlossen und gate-geprüft).
  F4 schreibt seine eigene Orchestrierung in `pruefeStartbedingung1`
  (Pfad-Präfix → `.gitattributes` → Hash-Vergleich → Schema-Validierung,
  gleiche vier Schritte wie `pruefeAutorisierung`,
  `index.ts:155-204`, aber gegen Schema 1 statt gegen eine
  Autorisierungsentscheidung).
- [Fakt] `package.json`: `check` und `check:template` sind zwei
  unabhängige Skript-Strings — `check-f4-invocation-policy.mjs` einzeln
  in beide eintragen, als letztes Glied der bestehenden `&&`-Kette
  angehängt.
- [Fakt] Referenzmuster für das Gate-Skript:
  `scripts/check-f9-human-transport.mjs:166-182` (AC8-Grep-Struktur),
  `scripts/check-f3-authorization-boundary.mjs` (Wegwerf-Git-Repo-
  Fixture-Aufbau, `.gitattributes: * -text` vor dem ersten Commit).
- [Fakt] Gültige `Status`-Werte laut `docs/projekt/zielfassung.md` §6:
  `ENTWURF, READY_FOR_TECH, WORKSTREAM_SCHNITT_GENEHMIGT, IN_ARBEIT,
  FEATURE_GATE, ABGESCHLOSSEN, BLOCKIERT, ABGEBROCHEN`.

SCOPE:
1. `src/authorization-boundary/index.ts` — additiver `export` auf
   `leseAusCommit`, `gitattributesPinntZeilenenden`,
   `leiteRepoRelativenPfadAb` (CONTEXT „Export-Umfang F3" oben). Keine
   sonstige Änderung an dieser Datei. Bestehende
   `authorization-boundary.test.ts`-Fälle bleiben unverändert grün.
2. `schemas/kontrollzustand-invocation-policy-baseline-payload.schema.json`
   — Baseline-Schema (E-183) wie plan-v1 SCOPE.2, unverändert durch
   plan-v2. `werkzeug_konfiguration.{pfad,hash}` Pflicht,
   `schutzskripte[]` Pflicht (mind. 1), `hash`-Pattern
   `^[0-9a-fA-F]{64}$`, `additionalProperties: false`. Beispiele unter
   `schemas/examples/`:
   `kontrollzustand-invocation-policy-baseline.valid.json`,
   `kontrollzustand-invocation-policy-baseline.invalid-
   leere-schutzskripte.json`.
3. `schemas/kontrollzustand-invocation-policy-wirksamkeitsnachweis-
   payload.schema.json` — Wirksamkeitsnachweis-Schema (E-188) wie
   plan-v1 SCOPE.3. `gueltigkeitsschluessel` bleibt vollständig wie in
   plan-v1 beschrieben (fünf Pflichtfelder inkl.
   `werkzeug_konfiguration_hash`/`schutzskript_hashes` — Delta 1 ändert
   nur die **Ist-Seite** des Vergleichs in `pruefeStartbedingung2`,
   nicht das Schema des Nachweises selbst). `rot_fall_beleg` Pflicht,
   Freitext. Beispiele:
   `kontrollzustand-invocation-policy-wirksamkeitsnachweis.valid.json`,
   `...invalid-fehlender-rotfallbeleg.json`.
4. `src/invocation-policy/verbotene-aufrufparameter.ts` — E-182-Array
   (`--bare`, `--safe-mode`, `--dangerously-skip-permissions`,
   `--allow-dangerously-skip-permissions`, `--permission-mode
   bypassPermissions`, `--fallback-model`) plus
   `pruefeAufrufparameter(parameter: string[]): { ok: boolean; grund?:
   string }` (plan-v1 SCOPE.4, unverändert durch plan-v2).
5. `src/invocation-policy/index.ts` — neues, eigenständiges Modul:
   - `pruefeStartbedingung1(baselineReferenz, istZustand, optionen?)` —
     liest die Baseline über die drei additiven F3-Exporte (SCOPE.1),
     Ablauf identisch zu `pruefeAutorisierung`
     (Pfad-Präfix → `.gitattributes` → Hash-Vergleich → Schema-
     Validierung gegen Schema 1, SCOPE.2), vergleicht am Ende
     `istZustand`-Hashes gegen die Baseline statt eine
     Autorisierungsentscheidung zu lesen. `{ ok: true }` |
     `{ ok: false; grund }`, kein Wurf bei erwartetem Rot-Fall.
   - `pruefeStartbedingung2(wirksamkeitsnachweis, istZustand,
     istUebrigeFelder)` — Signatur und Ableitungslogik exakt wie CONTEXT
     „F11-Fix" oben. Jede Feldabweichung im zusammengesetzten
     Gültigkeitsschlüssel → `{ ok: false; grund }`.
   - `pruefeAufrufparameter(parameter)` — SCOPE.4.
   - `pruefeStartfreigabe(eingaben, optionen?)` — Orchestrator:
     misst/erhält `istZustand` einmal, ruft `pruefeStartbedingung1`
     dann `pruefeStartbedingung2` (Reihenfolge E-183 vor E-188,
     Design-Entscheidung 5 aus plan-v1, unverändert), Kurzschluss bei
     erstem Fehlschlag. `werkzeugsatz_begrenzung: "DEKLARIERT"` **fest**
     in jedem Rückgabepfad (AC9, plan-v1 SCOPE.5/A12, unverändert).
   - `verweigereStart(laufId, profilReferenz, grund, optionen?)` —
     dünner Aufrufer von `schreibeWirkungsmarke(laufId, ..., "terminal",
     { ergebnis: "VERWEIGERT", daten: { invocation_policy: { grund } }
     })`, identisches Muster wie F3s `verweigereAutorisierung`.
6. `src/invocation-policy/types.ts` — `startfreigabe_geprueft`,
   `startfreigabe_abgelehnt`, eigene `Ereignisname`-Union (kein Eingriff
   in F1Bs oder F3s `Ereignisname`).
7. `src/invocation-policy/invocation-policy.test.ts` —
   `node:test`-Fälle für AC10 (vier Fälle wie plan-v1 SCOPE.8: gültige
   Baseline + gültiger Nachweis → `FREIGEGEBEN`; manipuliertes/fehlendes
   Schutzskript → `ABGELEHNT`, E-183; Drift im Gültigkeitsschlüssel bei
   sonst gültiger Baseline → `ABGELEHNT`, E-188; verbotener
   Aufrufparameter → `ABGELEHNT`, E-182), **plus** den in CONTEXT
   „F11-Fix" oben benannten Pflicht-Testfall (Querkonsistenz zwischen
   Bedingung 1 und 2 über denselben `istZustand`), plus AC7-Fall
   (`verweigereStart` → `schreibeWirkungsmarke` real, Beleg über
   `stelleLaufstatusFest`, F3-A4-Muster: Testfixture schreibt zuerst
   eine `run_prepared`-Marke). Gleiches Wegwerf-Git-Repo-Fixture-Muster
   wie SCOPE.8.
8. `scripts/check-f4-invocation-policy.mjs` — Gate-Skript, Muster wie
   `check-f3-authorization-boundary.mjs`: (a) Wegwerf-Git-Repo,
   `.gitattributes: * -text` vor dem ersten Commit, gültige Baseline
   committet, `pruefeStartbedingung1` Grün-Fall + zwei Rot-Fälle
   (abweichender Schutzskript-Hash, Pfad außerhalb); (b)
   `pruefeStartbedingung2` Grün-Fall + Drift-Fall (inkl. dem
   F11-Querkonsistenz-Fall aus SCOPE.7); (c) `pruefeAufrufparameter`
   Grün-Fall (leere Liste) + Rot-Fall
   (`--dangerously-skip-permissions`); (d) AC8-Grep gegen
   `src/invocation-policy/*.ts`
   (`/\b(child_process|spawn|exec|execSync)\b/`, Präzedenz
   `check-f9-human-transport.mjs:166-182`); (e) Temp-Pfad aufräumen.
   Eingehängt in `npm run check` UND `npm run check:template`, je
   einzeln eintragen, als letztes Glied der bestehenden Kette.
9. `state/gates.md` — neue Tabellenzeile
   `check-f4-invocation-policy.mjs`, Rot-/Grün-Beleg erst nach dem
   realen Lauf eintragen.
10. `state/memory-map.md` — neue Zeile „Invocation-Policy-Modul" →
    `src/invocation-policy/`, die zwei neuen Schemas, „nicht hierhin":
    nicht in `src/authorization-boundary/`, kein Prozessstart (F6),
    keine Baseline-/Nachweis-Instanz im Produkt-Repo.
11. `docs/STATUS.md` — Eintrag unter „Erledigt" nach Bau.
12. `features/F4/journal.md` — Anhängeprotokoll: Advisor-Pass, plan-v2,
    dieser Vertrag, Ausführung. Enthält den D16-Auflage-Nachtrag aus
    CONTEXT oben (oder in `features/F4/feature.md`
    Entscheidungs-Referenzen — Executor wählt den Ort).

NICHT:
- Jeder tatsächliche Prozessstart. F6 (Claude-Code-Gateway) startet, F4
  entscheidet nur. AC8-Grep belegt die Grenze technisch.
- Erzeugung des Wirksamkeitsnachweises oder Kalibrierung des Rot-Falls
  (§16.8 Punkt 3, weiterhin offen, außerhalb dieser Akte).
- Schreiben der Baseline- oder Nachweis-**Instanz**. Beide Instanzen
  schreibt der Mensch bzw. ein späterer Aufrufer, außerhalb dieser
  Sitzung. Dieser Vertrag liefert nur Schema + Prüflogik.
- Auflösung der Werkzeugversions-Diskrepanz (`2.1.241`/`2.1.250`,
  `state/tp-nachtrag.md`) — Werkzeugversion bleibt deklarierter,
  gepinnter Wert im Gültigkeitsschlüssel.
- Erzwingung von `--tools`/`--disallowedTools` (E-187) selbst —
  ausschließlich `DEKLARIERT`, nie `ERZWUNGEN` (A12, fest im
  Rückgabeobjekt).
- Eine gebündelte Verifikationsfunktion in F3 (CONTEXT „Export-Umfang
  F3", Delta 3 — bewusst verworfen). Wird während des Baus sichtbar,
  dass die drei Primitiven tatsächlich dieselbe Sequenz an mehreren
  Stellen duplizieren: **anhalten, nicht selbst bündeln** (siehe
  ESCALATE).
- Änderung an `src/authorization-boundary/` über den additiven `export`
  aus SCOPE.1 hinaus. Keine Signatur-, Verhaltens- oder
  Rückgabewert-Änderung an F3-Funktionen.
- Ablageort-Entscheidung für die Wirksamkeitsnachweis-Instanz treffen
  (Design-Entscheidung 3 bleibt: Parameter, kein fest verdrahteter
  Lesepfad) — nur die D16-Auflage dafür dokumentieren (CONTEXT/SCOPE.12).
- Endgültige Form von `berechtigungskontext` festlegen, über den in
  plan-v2 „Offene Punkte" beschriebenen Rahmen hinaus (siehe unten,
  Punkt „Berechtigungskontext").
- `docs/projekt/zielfassung.md` §16.8 Punkte 3, 4, 5, 8 endgültig
  schließen.
- UI.
- `ai-workforce-autorisierung/` beschreiben — nichts in diesem externen
  Repo wird von dieser Sitzung angelegt oder verändert.
- Committen, Pushen, `state/freigabe-commit.md` anlegen. Vertrag endet
  mit Diff-Vorlage und Warten auf Freigabe.

Offene Executor-Entscheidungen (dürfen mitlaufen, CLAUDE.md-
Entscheidungsregel Punkt 5 — nicht stillschweigend, explizit im Bericht
benennen):
- **Berechtigungskontext (Advisor F6/F7):** ob `pruefeStartbedingung2`
  `berechtigungskontext` weiterhin als opaken, durchgereichten Wert
  behandelt oder eine eigene Materialisierung vornimmt (§16.2 weist
  „Berechtigungskontext materialisieren" F4 zu). Entscheidung + Grund im
  Bericht dokumentieren, unabhängig davon welche Wahl getroffen wird.
- **Pfadvergleichssemantik (Advisor F12):** rohe String-Gleichheit vs.
  eine Normalisierung für `arbeitsverzeichnis_pfad` in
  `pruefeStartbedingung2`. §16.8 Punkt 8 führt das als offen; beide
  Optionen sind fail-closed (führen höchstens zu falschem `ABGELEHNT`).
  Entscheidung + Grund im Bericht dokumentieren.
- Eingabeformat `pruefeAufrufparameter` (`string[]`) — laut Advisor
  bereits tragfähig, keine Änderung nötig.

BUDGET: Ein Baudurchgang plus höchstens eine Korrekturrunde. Zweites Rot
auf demselben Gate ⇒ BLOCKIERT ⇒ Mensch.

OUTPUT:
- Neue Dateien:
  `schemas/kontrollzustand-invocation-policy-baseline-payload.schema.json`,
  `schemas/kontrollzustand-invocation-policy-wirksamkeitsnachweis-
  payload.schema.json` + vier Beispieldateien unter `schemas/examples/`,
  `src/invocation-policy/{index,types,verbotene-aufrufparameter}.ts`,
  `src/invocation-policy/invocation-policy.test.ts`,
  `scripts/check-f4-invocation-policy.mjs`.
- Geänderte Dateien: `src/authorization-boundary/index.ts` (additiver
  `export`, SCOPE.1), `package.json` (`check` und `check:template`),
  `state/gates.md`, `state/memory-map.md`, `docs/STATUS.md`,
  `features/F4/journal.md` (bzw. `features/F4/feature.md`, Executor
  wählt).
- Beleg: `npm run check` und `npm run check:template` grün, Konsolen-
  Ausgabe im Bericht zeigen. Kalibrierungstest für das Gate-Skript: jeden
  Grün-/Rot-Fall aus SCOPE.8 real auslösen, insbesondere den
  F11-Querkonsistenz-Fall. Kalibrierungstest für
  `invocation-policy.test.ts`: für jeden der fünf Testfälle (vier aus
  AC10 + F11-Fall) den Rot-Fall real auslösen, Fehlschlag zeigen,
  zurücknehmen, Grün-Zustand zeigen. Regressionsbeleg: bestehende
  `authorization-boundary.test.ts`-Fälle bleiben unverändert grün (kein
  F3-Verhaltens-Touch).
- Commit ausschließlich mit expliziten Pfaden (nie `-A`/`.`), `git-flow`-
  Skill nutzen, kein Commit ohne frische Freigabe, Push separat
  autorisiert.
- Bericht: was geändert wurde, welche Checks liefen (alle
  Rot-/Grün-Kalibrierungen), Ergebnis, echte Blocker, die drei „offenen
  Executor-Entscheidungen" oben inkl. getroffener Wahl + Begründung.

ESCALATE:
- `state/plan-v2-f4-invocation-policy.md` oder
  `state/advisor-findings-f4-invocation-policy.md` fehlt oder
  widerspricht diesem Vertrag → abbrechen, melden, nichts anlegen.
- Während des Baus zeigt sich, dass die drei additiven F3-Exporte
  (SCOPE.1) tatsächlich dieselbe Sequenz an mehreren Stellen in F4
  duplizieren (nicht nur die vier bereits benannten Einzelschritte,
  sondern eine wiederkehrende Kombination, die eine gemeinsame
  Verifikationsfunktion in F3 nahelegen würde) → **anhalten, nicht
  selbst bündeln.** Melden: welche Stellen, welche konkrete Duplikation,
  Vorschlag für eine Entscheidung — Stefan entscheidet, ob F3 dafür ein
  weiteres Mal angefasst wird.
- Einer der Kalibrierungstests (insbesondere der F11-Querkonsistenz-
  Fall) reproduziert sich nicht wie hier beschrieben → anhalten, welcher
  Fall betrifft es, was tatsächlich passierte, melden. Nicht das
  Skript/den Test so lange anpassen, bis irgendein Fehler auftritt.
- `npm run check` wird rot an einem Glied, das dieser Auftrag nicht
  angefasst hat (insbesondere `authorization-boundary.test.ts`,
  `checkpoint-store.test.ts`) → anhalten und melden. Kein Nachziehen
  fremder Stellen.
- Eine der vorgegebenen Formulierungen (SCOPE/Signaturen aus CONTEXT
  „F11-Fix"/„Export-Umfang F3", Prüfreihenfolge, Fehlermeldungen)
  widerspricht `features/F4/feature.md` oder
  `docs/projekt/zielfassung.md` → anhalten, beide Stellen zitieren,
  melden. Nicht selbst entscheiden, welche gilt.
- `git commit` oder `git push` wird ohne frische Freigabedatei verlangt
  → nicht ausführen.

Vertrag endet mit Freigabe-Halt: kein Bau, kein Commit, kein Push in
diesem Schritt. Ausführung erst nach Stefans expliziter, frischer
Freigabe.
