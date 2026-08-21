SCHRITT 0: Arbeitsverzeichnis ausgeben und gegen das im Auftrag genannte
Zielverzeichnis prüfen. Bei Abweichung: abbrechen, melden, nichts ändern.

Zielverzeichnis: C:\Users\stefa\Projekte\ai-workforce

## TASK: harness-setup-0b-ap0-delta-commit

GOAL:
Der zweite Commit auf `main` trägt genau das AP-0-Delta gegen die
Template-Baseline: 15 Verschiebungen nach `docs/harness/programm-historie/`
samt Kopfblock, den Abschnitt „Harness-Herkunft" in `state/tooling.md` und
den AP-0-Vertrag als neue Datei. Prüfbar: `git diff --cached -M --stat` zeigt
vor dem Commit genau diese Pfade und keine anderen; `git status --short`
zeigt danach ausschließlich noch untrackte Dateien.

CONTEXT:
- [Fakt] Vertrag 0a hat einen Commit erzeugt, dessen Baum identisch mit
  `template-baseline^{tree}` ist. Diese Vorbedingung wird in SCOPE 2 erneut
  geprüft, nicht angenommen.
- [Fakt] `T_AP0` = `ad280a02cfe99f5219eff27b7fdb3464a4838eb7` — der von 0a
  mit `git write-tree` erzeugte Baum: Baseline plus die 15 Umzüge mit
  Kopfblock, plus `state/tooling.md`, plus den AP-0-Vertrag.
- [Schlussfolgerung] `git read-tree <T_AP0>` stellt den Index in einem
  Schritt wieder her, ohne `git add` und ohne den Working Tree zu berühren.
  Der Commit enthält dadurch exakt das, was in 0a geprüft wurde.
- [Fakt] Im Orphan-Index erschienen die 15 Umzüge als `A`, nicht als `R`,
  weil es kein HEAD zum Vergleich gab. Gegen den Baseline-Commit sind sie
  jetzt als Rename erkennbar — deshalb `-M`.
- [Fakt] `.claude/hooks/commit-guard.js`: eine Freigabe gilt für genau einen
  Git-Vorgang, Frischefenster 10 Minuten, Datei wird vor dem Befehl gelöscht.
- [Fakt] Der Working Tree wurde seit 0a nicht verändert; Index und Working
  Tree stimmen nach `read-tree <T_AP0>` überein. Wird das in SCOPE 5
  widerlegt, greift ESCALATE.

SCOPE:
1. Diesen Auftrag wortgetreu nach
   `state/tasks/harness-setup-0b-ap0-delta-commit.md` schreiben.
2. Vorbedingung prüfen: `git rev-parse HEAD^{tree}` und
   `git rev-parse template-baseline^{tree}` ausgeben. Sind sie nicht
   identisch, abbrechen.
3. `git read-tree <T_AP0>` ausführen.
4. `git diff --cached -M --stat` ausgeben. Erwartung: 15 Renames,
   `state/tooling.md` als Änderung, `state/tasks/harness-setup-0-
   repository-anlegen.md` als neue Datei. Nichts sonst.
5. `git status --short` ausgeben. Erwartung: kein `AM`, keine ungestagten
   Änderungen an den 17 Pfaden, nur noch die drei untrackten
   `state/plan-*`- bzw. `state/advisor-findings-*`-Dateien und die
   Vertragsdateien aus 0a/0b.
6. `git diff --cached -M` vollständig ausgeben.
7. `npm run check:template` ausführen und die Ausgabe zeigen.
8. Nach meiner Freigabe committen. Message:
   `AP 0: Harness-Fix-Programm-Altlast nach docs/harness/programm-historie verschieben und Herkunft in state/tooling.md dokumentieren`
   Danach `git status --short` und `git log --oneline` ausgeben.

NICHT:
- `git add` in irgendeiner Form verwenden. Der Index kommt vollständig aus
  `read-tree`.
- Die drei untrackten Planungsdateien stagen. Sie gehören in Vertrag 0c.
- `state/freigabe-commit.md` anlegen, lesen, löschen oder in einem
  Bash-Befehl referenzieren.
- Den Working Tree verändern oder Dateiinhalte korrigieren.
- Pushen, branchen, mergen, rebasen, den Baseline-Commit ändern oder
  amenden.
- `.claude/settings.json` anfassen.

BUDGET:
Ein Durchgang. Keine Korrekturrunde.

OUTPUT:
- Datei `state/tasks/harness-setup-0b-ap0-delta-commit.md`, mit dem echten
  `T_AP0` im CONTEXT statt des Platzhalters.
- Die Ausgaben der Schritte 2, 4, 5, 6 und 7 im Wortlaut.
- Genau ein Commit auf `main`.
- `git status --short` und `git log --oneline` nach dem Commit.
- Kein Push.

ESCALATE:
- Das Arbeitsverzeichnis weicht ab → anhalten.
- Die beiden Tree-Hashes aus Schritt 2 sind nicht identisch → anhalten,
  melden. Der Baseline-Commit ist dann nicht das, wofür er gehalten wird;
  das ist ein Befund, keine Formalie.
- `<T_AP0>` ist nicht bekannt oder `git read-tree` weist ihn zurück →
  anhalten und melden. Den Index NICHT per `git add` nachbauen; die
  Rekonstruktion ist möglich, aber sie ist eine Entscheidung von Stefan,
  keine Ausweichroute in diesem Vertrag.
- Schritt 4 zeigt zusätzliche, fehlende oder andere Pfade als erwartet →
  anhalten, vollständige Ausgabe zeigen, nichts stagen oder entfernen.
- Schritt 5 zeigt ungestagte Änderungen an einem der 17 Pfade → anhalten;
  der Working Tree hat sich seit 0a verändert.
- `npm run check:template` wird rot → Ausgabe zeigen, anhalten.
- Der Commit-Guard verweigert → anhalten und melden, keine neue Freigabe
  erzeugen.

FOLGT:
- `harness-setup-0c-arbeitsstand-commit`.
