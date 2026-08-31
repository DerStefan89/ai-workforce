SCHRITT 0: Arbeitsverzeichnis ausgeben und gegen das im Auftrag genannte Zielverzeichnis prüfen. Bei Abweichung: abbrechen, melden, nichts ändern.

Zielverzeichnis: Repo DerStefan89/ai-workforce, Branch
`feature/f5-context-builder` (von `main` abzweigen, vor Ausführung mit
Stefan bestätigen).

## TASK: f5-context-builder

GOAL: Ein neues, eigenständiges Modul `src/context-builder/` setzt den
kompletten Ablauf aus `state/plan-v2-f5-context-builder.md` (inkl.
Nachtrag) um: aus einer Anfrageliste (Pfad, Frage, Begründung, Inhalt,
optional `bereichsKennung`/`notwendig`) für eine `lauf_id` und `rolle`
ein Kontextpaket bauen — Rollenfilter zuerst, dann Duplikat-/
Widerspruchs-Erkennung über den zusammengesetzten Element-Schlüssel,
dann zweiphasige Budget-Vergabe (notwendige Anfragen zuerst, kumulativ
gegen das volle Budget) —, das gebaute Paket über F2s
`registriereKernArtefakt` registrieren, und ein bereits gebautes Paket
über F2s `pruefeStale` auf STALE prüfen, bevor es erneut ausgeliefert
wird. Die Akzeptanzkriterien AC1–AC11 aus `features/F5/feature.md`
(AC2/AC5/AC6/AC7 in der durch plan-v2 präzisierten Form) sind erfüllt.

CONTEXT:
- [Fakt] Vollständiger Plan: `state/plan-v1-f5-context-builder.md`
  (Grundmechanik, unverändert gültig für alles, was plan-v2 nicht
  überschreibt) plus `state/plan-v2-f5-context-builder.md` (sechs Deltas
  plus Nachtrag zum zweiten Advisor-Pass — **maßgeblich bei
  Widerspruch**). Dieser Vertrag ist die Ausführungsanweisung dazu; bei
  Widerspruch gilt dieser Vertrag, bei dessen Schweigen plan-v2, bei
  dessen Schweigen plan-v1.
- [Fakt] Erster Advisor-Pass: `state/advisor-findings-f5-context-builder.md`
  — **Nicht freigegeben** (B1 Pfad-Kollision, B5 falsche
  `pruefeStale`-Verifikation, B2 fail-open bei unbekannter Rolle, B4
  Reihenfolgeabhängigkeit Evidenz/Budget, B3 Muster-Matching
  unspezifiziert — alle in plan-v2 aufgelöst).
- [Fakt] Zweiter, auf das Delta beschränkter Advisor-Pass:
  `state/advisor-findings-f5-context-builder-v2.md` — **Freigegeben mit
  Hinweisen.** Drei Nachbesserungen (V11 Phase-A-Pseudocode, V3/V4
  Kollisionsfälle bei Delta 1, V20 AC2-Zuordnung) sind bereits im
  Nachtrag am Ende von `plan-v2-f5-context-builder.md` eingearbeitet —
  dieser Vertrag übernimmt sie unten wörtlich, keine offenen
  Advisor-Punkte mehr außer B9 (Stopp-vs-Teilpaket, bewusst offen, siehe
  plan-v2, kein Blocker).
- [Fakt] Feature-Akte: `features/F5/feature.md`, `Status:
  READY_FOR_TECH`, alle vier von `scripts/check-feature.mjs` bei diesem
  Status verlangten Abschnitte (Ziel, Nicht-Ziele, Akzeptanzkriterien,
  Dependencies) real vorhanden (`node scripts/check-feature.mjs` lief
  bei Anlage grün). Bei Widerspruch gilt `feature.md` für WAS, der Plan
  für WIE.
- [Fakt] Dependency erfüllt: F2 — gemergt, `main`. `registriereKernArtefakt`
  (`src/lineage-registry/index.ts:85-114`, Signatur `(artefaktId,
  profilReferenz, herkunft, daten, eingaben?, optionen?)`, Rückgabe
  `{pfad, versionSequenz, inhaltsHash}`) und `pruefeStale`
  (`src/lineage-registry/index.ts:209-232`) ausschließlich von außen
  aufgerufen, kein Touch an `src/lineage-registry/`.
- [Fakt] `pruefeStale`-Verhalten bei nicht existierender Referenz (real
  geprüft, Delta 5): `ladeArtefaktVersion` liefert `null`
  (`index.ts:182-199`), der `if (version !== null)`-Block
  (`index.ts:219-227`) wird übersprungen, Rückgabe still `{ stale: false,
  geaenderteEingaben: [] }` — **kein Wurf**. `pruefeKontextpaketFrisch`
  reicht das unverändert durch (dünner Aufrufer, keine eigene Logik);
  Test dafür ist Pflicht (SCOPE.4).
- [Fakt] `EingabeReferenz` (`src/lineage-registry/types.ts:14-18`):
  `{ pfad: string; zitierter_bereich: unknown; inhalts_hash: string }`.
  Kontextpaket-Elemente werden 1:1 in dieser Form gehalten (kein zweites
  Referenzformat), `pfad` trägt den zusammengesetzten Element-Schlüssel
  (siehe SCOPE.3 unten), nicht den rohen Anfrage-Pfad.
- [Fakt] Referenzmuster für ein neues, eigenständiges Payload-Schema, das
  nur `daten.daten` beschreibt:
  `schemas/kontrollzustand-bedarf-payload.schema.json` (F9) — die äußere
  Lineage-Hülle bleibt von `validiereLineageEintrag` (F2) geprüft, kein
  zweiter Regelsatz.
- [Fakt] Referenzmuster für das Gate-Skript:
  `scripts/check-f1b-wirkungsmarke.mjs`/`check-f3-authorization-boundary.mjs`
  — importiert Kernfunktionen direkt aus dem Modul statt einen zweiten
  Regelsatz nachzubauen.
- [Fakt] `package.json` Zeile 17/18 (`check`/`check:template`): enden
  aktuell auf `... && node scripts/check-f9-human-transport.mjs [&& npm
  run test]`. `check-f5-context-builder.mjs` in beide direkt danach
  eintragen.
- [Fakt] Kein vorhandenes Glob-/Pattern-Matching-Paket in `package.json`
  — Delta 3 (D6) verlangt bewusst keine neue Dependency.

SCOPE:
1. `schemas/kontrollzustand-kontextpaket-payload.schema.json` (Draft
   2020-12, `additionalProperties: false`) + je ein
   `schemas/examples/kontrollzustand-kontextpaket*.valid.json`/
   `*.invalid*.json` (Muster: `kontrollzustand-bedarf-payload.schema.json`
   + `schemas/examples/kontrollzustand-bedarf*`). Beschreibt
   `KONTEXTPAKET_V0` (plan-v2 Abschnitt 2.4): `kontextpaket_schema:
   "v0"`, `lauf_id`, `rolle`, `elemente[]` (`pfad`, `zitierter_bereich`,
   `inhalts_hash`), `ausgeschlossen[]` (`pfad`, `grund`), `erstellt_am`.
   **Kein** `runtime`-/`modell`-Feld (E-191 N1/N2, AC9).
2. `src/context-builder/types.ts` — `Anfrage`, `Budget`,
   `ROLLEN_AUSSCHLUSSMUSTER: Record<string, string[]>` (Schlüssel:
   `architecture-advisor`, `code-reviewer`, `qa`, `ausfuehrung` — Delta 6,
   **nicht** `executor`, Kollision mit
   `src/human-transport/types.ts:33` vermeiden), eigene
   `KontextBuilderEreignisname`-Union (`kontextpaket_gebaut`,
   `kontextpaket_evidenzluecke`, `kontextpaket_stale_geprueft`,
   `kontextpaket_unbekannte_rolle`, `kontextpaket_ungueltiger_pfad`,
   `kontextpaket_widerspruechliche_anfrage`). Kein Eingriff in
   `src/lineage-registry/types.ts`.
3. `src/context-builder/index.ts` — neues, eigenständiges Modul (D1,
   D5, kein F1/F1B/F2-Touch):
   - `elementSchluessel(a: Anfrage): string` — `a.bereichsKennung ?
     \`${a.pfad}#${a.bereichsKennung}\` : a.pfad` (Delta 1).
   - `passtMuster(pfad: string, muster: string): boolean` — exakte
     Gleichheit oder `/**`-Präfix (Delta 3, D6, Pseudocode wörtlich
     übernehmen).
   - `baueKontextpaket(laufId, rolle, anfragen: Anfrage[], profilReferenz,
     budget: Budget, optionen?)` — Ablauf **in dieser Reihenfolge**:
     1. Rollenprüfung: `rolle` kein Schlüssel in
        `ROLLEN_AUSSCHLUSSMUSTER` → sofort `{ ok: false, grund:
        'unbekannte_rolle', rolle }`, keine weitere Verarbeitung
        (Delta 2).
     2. Für jede Anfrage: `a.pfad` enthält `#` → sofort `{ ok: false,
        grund: 'ungueltiger_pfad', pfad: a.pfad }`, keine weitere
        Verarbeitung (Nachtrag V3).
     3. Rollenfilter auf `a.pfad` (roh, **vor** Schlüsselbildung) gegen
        `ROLLEN_AUSSCHLUSSMUSTER[rolle]` via `passtMuster` — Treffer →
        `ausgeschlossen.push({ pfad: a.pfad, grund: 'rolle' })`.
     4. Für verbleibende Anfragen: `elementSchluessel(a)` bilden. Zwei
        Anfragen mit gleichem Schlüssel und gleichem Inhalts-Hash →
        zweites Vorkommen überspringen (Idempotenz, kein Ausschluss).
        Zwei Anfragen mit gleichem Schlüssel, aber unterschiedlichem
        Inhalts-Hash → sofort `{ ok: false, grund:
        'widerspruechliche_anfrage', pfad: elementSchluessel(a) }`
        (Nachtrag V4).
     5. Budget, zweiphasig (Delta 4 + Nachtrag-Pseudocode wörtlich
        übernehmen): Phase A (`notwendig === true`, kumulative laufende
        Summe gegen das volle `budget`) — passt eine notwendige Anfrage
        nicht mehr, in `nichtAufnehmbar` sammeln, **nicht** vom Budget
        abziehen, weiter mit der nächsten notwendigen Anfrage (kein
        Abbruch beim ersten Treffer). Ist `nichtAufnehmbar` nach Phase A
        nicht leer: sofort `{ ok: false, grund: 'EVIDENZLUECKE',
        nichtAufnehmbar }`, Phase B läuft nicht an. Sonst Phase B
        (`notwendig !== true`, gegen das nach Phase A verbleibende
        Restbudget, gleiche Logik wie plan-v1 2.3 Schritt 3) —
        Anfragen, die nicht passen: `ausgeschlossen.push({ pfad, grund:
        'budget' })`.
     6. Bei Erfolg: `KONTEXTPAKET_V0` zusammensetzen, über
        `registriereKernArtefakt('kontextpaket-' + laufId,
        profilReferenz, { rolle, quelle: 'context-builder' },
        paketDaten, elemente, optionen)` registrieren (`elemente` =
        angenommene `EingabeReferenz[]`, `pfad` = zusammengesetzter
        Schlüssel). Rückgabe `{ ok: true, pfad, versionSequenz,
        inhaltsHash, paket }`.
     Kein Wurf bei einem der benannten Fehlerzustände (D4-Muster) — jede
     Ablehnung ist `{ ok: false, grund, … }`.
   - `pruefeKontextpaketFrisch(laufId, versionSequenz,
     aktuelleEingabeInhalte: Record<string, string>, optionen?)` —
     dünner Aufrufer von `pruefeStale('kontextpaket-' + laufId,
     versionSequenz, aktuelleEingabeInhalte, optionen)`, keine eigene
     Logik (Abschnitt 2.5). `aktuelleEingabeInhalte` wird vom Aufrufer
     mit denselben zusammengesetzten Schlüsseln befüllt, die im
     zurückgegebenen `paket.elemente[].pfad` stehen.
   - Das Modul liest keine Dateien selbst (AC8) — jeder `inhalt`-Wert
     kommt aus der `Anfrage`.
4. `src/context-builder/context-builder.test.ts` — `node:test`-Fälle:
   Grünfall (AC1), Rollenausschluss (AC2), Duplikat-Filterung (AC3),
   Budget-Überlauf ohne `notwendig` (AC4), Budget-Überlauf mit
   `notwendig` → `EVIDENZLUECKE` (AC5, D7-Pseudocode real durchspielen:
   mehrere notwendige Anfragen, von denen nur ein Teil einzeln passen
   würde, gemeinsam aber das Budget überschreiten → `ok: false`),
   Registrierung mit korrekten `eingaben` (AC6), STALE-Blockade einer
   erneuten Auslieferung (AC7), `pruefeKontextpaketFrisch` gegen eine nie
   registrierte `lauf_id` → `{ stale: false, geaenderteEingaben: [] }`,
   kein Wurf (AC10, Delta 5), unbekannte Rolle (Delta 2), `#` im rohen
   Pfad (Nachtrag V3), widersprüchliche Anfrage gleicher Schlüssel
   (Nachtrag V4).
5. `scripts/check-f5-context-builder.mjs` — Gate-Skript, Muster wie
   `check-f1b-wirkungsmarke.mjs`: Payload-Fixtures gegen das neue Schema,
   ein synthetischer Ende-zu-Ende-Lauf (Anfragen → Kontextpaket →
   Registrierung → `pruefeKontextpaketFrisch` frisch), ein
   Rollenausschluss-Fall, ein Evidenzlücke-Fall. Eingehängt in `npm run
   check` UND `npm run check:template`, direkt nach
   `check-f9-human-transport.mjs`.
6. `state/gates.md` — neue Tabellenzeile `F5-Context-Builder-Gate`,
   Rot-/Grün-Beleg erst nach realem Lauf eintragen.
7. `state/memory-map.md` — neue Zeile „Context-Builder-Modul" →
   `src/context-builder/`, `schemas/
   kontrollzustand-kontextpaket-payload.schema.json`, „nicht hierhin":
   kein Touch an `src/lineage-registry/`, keine Rollentabelle unter
   `profiles/` (D1/D14).
8. `docs/STATUS.md` — Eintrag unter „Erledigt" nach Bau.
9. `features/F5/journal.md` — Nachtrag: beide Advisor-Pässe, dieser
   Vertrag, Ausführung.

NICHT:
- Claude-Code-Gateway, Invocation Policy, Execution Controller
  (Features #4, #6, #8) — ausdrücklicher Nicht-Ziel-Rand.
- Ein lebender Aufrufer/Gateway-Integration — Bibliothek mit direktem
  Testaufruf reicht (Muster F1/F2).
- Dateien/Bereiche selbst lesen — jeder Inhalt kommt vom Aufrufer als
  `Anfrage.inhalt`.
- Volle Glob-Unterstützung (`*`, `?`, `{a,b}`) im Muster-Matcher — nur
  exakte Gleichheit oder `/**`-Präfix (Delta 3, D6).
- Ein Runtime-/Modell-Feld im Schema (E-191 N1/N2).
- Caching/automatische Wiederverwendung eines Pakets über Läufe hinweg.
- Eine vollständige, gegen `docs/projekt/zielfassung.md` §4
  abgeglichene Rollentabelle — `ROLLEN_AUSSCHLUSSMUSTER` bleibt bewusst
  auf die vier benannten Besetzungsnamen beschränkt.
- Änderung von `src/lineage-registry/` (Exporte, Signaturen, Typen).
- `git add`/`git commit` im Schreibpfad ohne frische Freigabe.

BUDGET: Ein Baudurchgang plus höchstens eine Korrekturrunde. Zweites Rot
auf demselben Gate ⇒ BLOCKIERT ⇒ Mensch.

OUTPUT:
- Neue Dateien:
  `schemas/kontrollzustand-kontextpaket-payload.schema.json` +
  `schemas/examples/*`, `src/context-builder/{index,types}.ts`,
  `src/context-builder/context-builder.test.ts`,
  `scripts/check-f5-context-builder.mjs`. Zusätzlich (F-005/F-035-Muster
  — Planungsdokumente ins selbe Change-Set, nicht nur Produktcode): die
  bereits vor diesem Vertrag angelegten, aktuell untracked Dateien
  `features/F5/feature.md`, `features/F5/journal.md`,
  `state/plan-v1-f5-context-builder.md`,
  `state/plan-v2-f5-context-builder.md`,
  `state/advisor-findings-f5-context-builder.md`,
  `state/advisor-findings-f5-context-builder-v2.md`,
  `state/tasks/f5-context-builder.md` gehören zum selben Commit.
- Geänderte Dateien: `package.json` (`check` und `check:template`),
  `state/gates.md`, `state/memory-map.md`, `docs/STATUS.md`,
  `features/F5/journal.md`.
- Beleg: `npm run check` und `npm run check:template` grün, Konsolen-
  Ausgabe im Bericht zeigen. Kalibrierungstest für das Gate-Skript
  (SCOPE.5): Grünfall, Rollenausschluss-Fall, Evidenzlücke-Fall je
  einmal real auslösen, erwarteten Rot-/Grün-Ausgang zeigen.
  Kalibrierungstest für `context-builder.test.ts`: jeden Testfall aus
  SCOPE.4 real auslösen (temporäre Fixture-/Codemanipulation),
  Fehlschlag zeigen, zurücknehmen, Grün-Zustand zeigen. Regressionsbeleg:
  `checkpoint-store.test.ts`, `lineage-registry.test.ts`,
  `authorization-boundary.test.ts`, `human-transport.test.ts` bleiben
  unverändert grün (kein F1/F1B/F2/F9-Touch).
- Commit ausschließlich mit expliziten Pfaden (nie `-A`/`.`), `git-flow`-
  Skill nutzen, kein Commit ohne frische Freigabe, Push separat
  autorisiert.
- Bericht: was gebaut wurde, welche Checks liefen (alle
  Rot-/Grün-Kalibrierungen), Ergebnis, echte Blocker.

ESCALATE:
- `state/plan-v2-f5-context-builder.md` (inkl. Nachtrag) oder einer der
  beiden Advisor-Findings fehlt oder widerspricht diesem Vertrag →
  abbrechen, melden, nichts anlegen.
- Einer der Kalibrierungstests reproduziert sich nicht wie hier
  beschrieben → anhalten, welcher Fall betrifft es, was tatsächlich
  passierte, melden. Nicht das Skript/den Test so lange anpassen, bis
  irgendein Fehler auftritt.
- `npm run check` wird rot an einem Glied, das dieser Auftrag nicht
  angefasst hat (insbesondere `checkpoint-store.test.ts`,
  `lineage-registry.test.ts`, `authorization-boundary.test.ts`,
  `human-transport.test.ts`) → anhalten und melden. Kein Nachziehen
  fremder Stellen.
- Eine der vorgegebenen Formulierungen/Signaturen (insbesondere die
  Reihenfolge Rollenprüfung → `#`-Validierung → Rollenfilter →
  Schlüsselbildung/Widerspruchsprüfung → zweiphasiges Budget) widerspricht
  `features/F5/feature.md` oder `state/plan-v2-f5-context-builder.md` →
  anhalten, beide Stellen zitieren, melden. Nicht selbst entscheiden,
  welche gilt.
- `git commit` oder `git push` wird ohne frische Freigabedatei verlangt
  → nicht ausführen.

Vertrag endet mit Freigabe-Halt: kein Bau, kein Commit, kein Push in
diesem Schritt. Ausführung erst nach Stefans expliziter, frischer
Freigabe.
