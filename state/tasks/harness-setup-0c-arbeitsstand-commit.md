SCHRITT 0: Arbeitsverzeichnis ausgeben und gegen das im Auftrag genannte
Zielverzeichnis prüfen. Bei Abweichung: abbrechen, melden, nichts ändern.

Zielverzeichnis: C:\Users\stefa\Projekte\ai-workforce

## TASK: harness-setup-0c-arbeitsstand-commit

GOAL:
Der dritte Commit nimmt den Planungs- und Vertragsstand des Workstreams
`HARNESS_SETUP` in die Versionskontrolle auf. Prüfbar: `git status --short`
ist danach leer.

CONTEXT:
- [Fakt] Sechs Dateien sind untracked: die drei Planungsdateien
  `state/plan-v1-harness-setup.md`, `state/plan-v2-harness-setup.md`,
  `state/advisor-findings-harness-setup.md` sowie die drei Vertragsdateien
  `state/tasks/harness-setup-0a-baseline-commit.md`,
  `state/tasks/harness-setup-0b-ap0-delta-commit.md` und dieser Vertrag.
- [Schlussfolgerung] Untracked lassen scheidet aus: `git status` wäre nie
  sauber, und die in mehreren Verträgen des Repos verankerte Stop-Grenze
  „`git status` zu Beginn nicht sauber → anhalten" würde jeden Folgeauftrag
  blockieren.
- [Fakt] `.claude/skills/handoff-vertrag/SKILL.md`: der Vertrag gehört als
  Datei nach `state/tasks/<slug>.md`, nicht nur ins Fenster — sonst
  überlebt er keine Compaction und keinen Sitzungswechsel.
- [Fakt] Präzedenz `state/tasks/phase0-artefakte-committen.md`: ein Vertrag
  wird mit seinem eigenen Ergebnis committet.
- [Schlussfolgerung] Ab diesem Commit ist das Repo die autoritative Fassung
  von Plan v1/v2 und der Advisor-Befunde; die Kopien im Claude-Projekt
  (`claude/21`, `claude/24`, `claude/25`) sind nachgeführte Kopien. Eine
  Drift zwischen beiden ist bereits einmal aufgetreten und dokumentiert.

SCOPE:
1. Diesen Auftrag wortgetreu nach
   `state/tasks/harness-setup-0c-arbeitsstand-commit.md` schreiben.
2. `git status --short` ausgeben.
3. Genau diese sechs Pfade stagen, jeder einzeln genannt:
   state/plan-v1-harness-setup.md
   state/plan-v2-harness-setup.md
   state/advisor-findings-harness-setup.md
   state/tasks/harness-setup-0a-baseline-commit.md
   state/tasks/harness-setup-0b-ap0-delta-commit.md
   state/tasks/harness-setup-0c-arbeitsstand-commit.md
4. `git diff --cached` vollständig ausgeben.
5. `npm run check:template` ausführen und die Ausgabe zeigen. Der
   Vertrags-Check sieht jetzt vier Verträge in `state/tasks/`.
6. Nach meiner Freigabe committen. Message:
   `HARNESS_SETUP: Planungsstand und die drei AP-0-Commit-Verträge aufnehmen`
   Danach `git status --short` und `git log --oneline` ausgeben.

NICHT:
- `git add -A`, `git add .` oder ein Verzeichnis als Pfadspec verwenden.
- Inhalte der sechs Dateien anfassen, kürzen oder umformatieren.
- `state/freigabe-commit.md` anlegen, lesen, löschen oder in einem
  Bash-Befehl referenzieren.
- Pushen. Der Push ist ein eigener Git-Vorgang und braucht eine eigene
  Freigabe und einen eigenen Auftrag.
- Branchen, mergen, rebasen, frühere Commits amenden.
- `.claude/settings.json` anfassen.

BUDGET:
Ein Durchgang. Keine Korrekturrunde.

OUTPUT:
- Datei `state/tasks/harness-setup-0c-arbeitsstand-commit.md`.
- Die Ausgaben der Schritte 2, 4 und 5 im Wortlaut.
- Genau ein Commit auf `main`.
- `git status --short` nach dem Commit — Erwartung: leer.
- `git log --oneline` mit den nun drei Commits.
- Kein Push.

ESCALATE:
- Das Arbeitsverzeichnis weicht ab → anhalten.
- `git status --short` in Schritt 2 zeigt mehr oder andere Einträge als die
  sechs erwarteten `??`-Zeilen → anhalten, Ausgabe zeigen, nichts stagen.
- Eine der sechs Dateien fehlt auf der Platte → anhalten, nichts neu
  erzeugen.
- `npm run check:template` wird rot → Ausgabe vollständig zeigen, anhalten.
  Insbesondere ein Befund des Vertrags-Gates an einer der drei neuen
  Vertragsdateien ist zu melden, nicht stillschweigend zu reparieren.
- Der Commit-Guard verweigert → anhalten und melden.
- `git status --short` nach dem Commit ist nicht leer → melden, nicht
  nachstagen.

FOLGT:
- Push-Auftrag für die drei Commits nach `origin` (eigener Vertrag, eigene
  Freigabe).
- `harness-setup-1-pruefkette-fuellen` (AP 1).
