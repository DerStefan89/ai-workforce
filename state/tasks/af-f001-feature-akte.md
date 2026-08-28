SCHRITT 0: Arbeitsverzeichnis ausgeben und gegen das im Auftrag genannte Zielverzeichnis prüfen. Bei Abweichung: abbrechen, melden, nichts ändern.

Zielverzeichnis: Repo DerStefan89/ai-workforce, main oder ein von main
abgeleiteter Feature-Branch (vor Ausführung mit Stefan bestätigen).

## TASK: af-f001-feature-akte

GOAL: `features/AF-F001/` existiert, ist gate-grün, und die
Akzeptanzkriterien A1–A8 aus `state/plan-v2-af-f001-feature-akte.md` §6
sind erfüllt. Eine frische Claude-Code-Sitzung kann danach allein aus
`features/AF-F001/feature.md` benennen, was das Feature ist, was nicht
dazugehört und woran Fertigkeit erkannt wird (A8) — ohne Zugriff auf das
Claude-Projekt.

CONTEXT:
- [Fakt] Vollständiger Plan: `state/plan-v2-af-f001-feature-akte.md`
  (ersetzt `plan-v1`, der unverändert stehen bleibt). Dieser Vertrag ist
  eine Ausführungsanweisung dazu — bei Widerspruch gilt `plan-v2`.
- [Fakt] Advisor-Urteil zu `plan-v1`: FREIGEGEBEN MIT HINWEISEN, siehe
  `state/advisor-findings-af-f001-feature-akte.md`. Alle 8 Findings sind
  in `plan-v2` aufgelöst.
- [Fakt] Referenzmuster für das Gate: `scripts/check-contract.mjs`
  (Verzeichnis-Iteration, `existsSync`-Check, Exit 0 bei fehlendem/leerem
  Verzeichnis mit je eigener Meldung, Zeile 26-38).
- [Fakt] `state/memory-map.md` weist `specs/` bereits als alleinige
  Heimat für Spec-Artefakte aus — `spec.md` für AF-F001 entsteht dort,
  NICHT unter `features/AF-F001/`. Korrektur gegenüber der `FOLGT`-
  Ankündigung in `state/tasks/ebene2-architektur-in-repo-nachziehen.md`,
  die noch `spec.md` unter `features/<id>/` nannte — überholt durch den
  Advisor-Pass, `plan-v2` gilt.
- [Fakt] Gültige `Status`-Werte laut `docs/projekt/zielfassung.md` §6:
  `ENTWURF, READY_FOR_TECH, WORKSTREAM_SCHNITT_GENEHMIGT, IN_ARBEIT,
  FEATURE_GATE, ABGESCHLOSSEN, BLOCKIERT, ABGEBROCHEN`.

SCOPE:
1. `specs/AF-F001/spec.md` mit dem Skill `spec-schreiben` erzeugen
   (Problem, V-Aussagen, Nicht-Ziele, Constraints, offene Fragen — Inhalt:
   die Feature-Akte-Konvention selbst, siehe `plan-v2` §1–4).
2. `features/AF-F001/feature.md` anlegen mit allen Pflichtfeldern: ID,
   Titel, `Status: READY_FOR_TECH`, Ziel, Scope, Nicht-Ziele,
   Akzeptanzkriterien, Zuordnung (Meilenstein 1 / Vorarbeit laut
   `docs/projekt/umsetzungsplan-fassung-1.md:192-196`), Dependencies
   (hard/soft — hier keine harten), Workstream-Liste,
   Entscheidungs-Referenzen, Spec-Referenz (`specs/AF-F001/spec.md`).
3. `features/AF-F001/journal.md` anlegen (Anhängeprotokoll, erster
   Eintrag: „Akte angelegt, Handoff-Vertrag af-f001-feature-akte
   ausgeführt").
4. `scripts/check-feature.mjs` bauen, exakt nach
   `state/plan-v2-af-f001-feature-akte.md` §6 (A1–A8, insbesondere
   A3a–e, A4a–b). Einhängen in `npm run check:template`.
5. Zeile in `state/memory-map.md`: „Feature-Akte →
   `features/<id>/feature.md`" mit „nicht hierhin"-Spalte (nicht
   `specs/`, nicht `state/tasks/`).
6. Eintrag in `docs/STATUS.md` zum Stand von AF-F001.

NICHT:
- Execution Controller/Orchestrator, Checkpoint Store, Artifact Registry,
  Human Transport, Leitstand, ChatGPT-API-Anbindung, automatischer
  Rollenaufruf — eigene, spätere Features (`plan-v2` §3).
- Änderungen an `commit-guard.cjs`, `guard-settings.js`.
- Reparatur des `cwd`-Fehlers in `commit-guard.cjs`.
- Jede Änderung an `ARCHITECTURE.md`, `CLAUDE.md`, `docs/adr/*` —
  bereits erledigt.
- Migration des Entscheidungsregisters 001–176.

BUDGET: Ein Baudurchgang plus höchstens eine Korrekturrunde.

OUTPUT:
- Neue Dateien: `specs/AF-F001/spec.md`, `features/AF-F001/feature.md`,
  `features/AF-F001/journal.md`, `scripts/check-feature.mjs`.
- Geänderte Dateien: `package.json` (`check:template` um
  `check-feature.mjs` erweitert), `state/memory-map.md`, `docs/STATUS.md`.
- Beleg: `npm run check:template` und `npm run check` grün, Konsolen-
  Ausgabe im Bericht zeigen. Kalibrierungstest: für mindestens A3a–e und
  A4a–b je einen echten Rot-Fall provozieren, Exit-Code/Meldung im
  Bericht zeigen, danach den Rot-Fall wieder entfernen.
- Commit ausschließlich mit expliziten Pfaden (nie `-A`/`.`), `git-flow`-
  Skill nutzen, kein Commit ohne frische `state/freigabe-commit.md`,
  Push separat autorisiert.
- Bericht: was geändert wurde, welche Checks liefen, Ergebnis, echte
  Blocker.

ESCALATE:
- `state/plan-v2-af-f001-feature-akte.md` fehlt oder widerspricht diesem
  Vertrag → abbrechen, melden, nichts anlegen.
- Der Kalibrierungstest für einen Rot-Fall (A3a–e, A4a–b) reproduziert
  sich nicht wie erwartet → anhalten, welchen Fall betrifft es, was
  tatsächlich passierte, melden. Nicht das Skript so lange anpassen, bis
  irgendein Fehler auftritt (F-004).
- `npm run check` wird rot an einem Glied, das dieser Auftrag nicht
  angefasst hat → anhalten und melden. Kein Nachziehen fremder Stellen,
  um grün zu werden.
- Eine der vorgegebenen Formulierungen (SCOPE/AK) widerspricht
  `state/plan-v2-af-f001-feature-akte.md` oder
  `docs/projekt/zielfassung.md` → anhalten, beide Stellen zitieren,
  melden. Nicht selbst entscheiden, welche gilt.
- `git commit` oder `git push` wird ohne frische Freigabedatei verlangt
  → nicht ausführen.
