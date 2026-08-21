SCHRITT 0: Arbeitsverzeichnis ausgeben und gegen das im Auftrag genannte
Zielverzeichnis prüfen. Bei Abweichung: abbrechen, melden, nichts ändern.

Zielverzeichnis: C:\Users\stefa\Projekte\ai-workforce

## TASK: harness-setup-0a-baseline-commit

GOAL:
Der erste Commit auf `main` trägt exakt den Baum des gepinnten
Template-Stands. Prüfbar: nach dem Commit liefern
`git rev-parse HEAD^{tree}` und `git rev-parse template-baseline^{tree}`
denselben Hash, und `git diff --stat template-baseline HEAD` ist leer.

CONTEXT:
- [Fakt] `main` ist ein Orphan-Branch ohne Commit. Alle 79 Template-Pfade
  stehen bereits im Index, ohne dass je `git add` gelaufen wäre — Folge von
  `git checkout --orphan`. Belegt durch `git status --short` vom 21.08.2026:
  79 Zeilen `A`/`AM`, 4 Zeilen `??`.
- [Schlussfolgerung] `git add <pfad>` begrenzt hier NICHT, was in den Commit
  kommt; `git commit` schreibt den gesamten Index. Die Begrenzung entsteht in
  diesem Auftrag über `git read-tree`, nicht über `git add`. `git add` hat
  hier nur eine Aufgabe: den Index für die 16 `AM`-Pfade zu aktualisieren.
- [Fakt] 16 Pfade stehen auf `AM` — Inhalt im Working Tree, nicht im Index:
  die 15 Dateien in `docs/harness/programm-historie/` (Kopfblock nach dem
  `git mv` ergänzt) und `state/tooling.md` (Abschnitt „Harness-Herkunft").
- [Fakt] Branch `template-baseline` ist gepinnt auf
  `9189959a7d4de0486a4fee1e30b57ea8e5644661`.
- [Fakt] `.claude/hooks/commit-guard.js`, Kopfkommentar: `git commit`/
  `git push` werden ohne frische `state/freigabe-commit.md` verweigert
  (Frischefenster 10 Minuten); bei gültiger Freigabe wird die Datei vor dem
  Befehl gelöscht — eine Freigabe gilt für genau einen Git-Vorgang.
- [Fakt] `.claude/skills/git-flow/SKILL.md` Punkt 4: stagen ausschließlich
  mit expliziten Pfaden, nie `-A` oder `.`.
- [Schlussfolgerung] Nach diesem Commit weichen HEAD (Baseline-Baum) und
  Working Tree (AP-0-Stand) absichtlich voneinander ab. Das ist der geplante
  Zwischenzustand, kein Fehler, und wird nicht „repariert" — Vertrag 0b löst
  ihn auf.

SCOPE:
1. Diesen Auftrag wortgetreu nach
   `state/tasks/harness-setup-0a-baseline-commit.md` schreiben.
2. `git rev-parse template-baseline` ausgeben.
3. `git status --short` ausgeben.
4. Genau diese 17 Pfade stagen, in einem `git add`-Aufruf, jeder Pfad
   einzeln genannt:
   docs/harness/programm-historie/advisor-findings-phase1-vertraege.md
   docs/harness/programm-historie/advisor-findings-phase2-adoptionsfaehigkeit.md
   docs/harness/programm-historie/harness-fix-1-hooks-und-zwischenstand.md
   docs/harness/programm-historie/harness-fix-2-commit-guard.md
   docs/harness/programm-historie/harness-fix-3-dokugate-und-ci.md
   docs/harness/programm-historie/harness-fix-4-pruefkette-und-vertragspruefung.md
   docs/harness/programm-historie/harness-fix-5-commit-guard-haerten.md
   docs/harness/programm-historie/harness-fix-6-werkzeug-katalog.md
   docs/harness/programm-historie/harness-fix-7-reibung-und-doktrin.md
   docs/harness/programm-historie/harness-fix-8-start-klein.md
   docs/harness/programm-historie/phase0-artefakte-committen.md
   docs/harness/programm-historie/plan-v1-phase1-vertraege.md
   docs/harness/programm-historie/plan-v1-phase2-adoptionsfaehigkeit.md
   docs/harness/programm-historie/plan-v2-phase1-vertraege.md
   docs/harness/programm-historie/plan-v2-phase2-adoptionsfaehigkeit.md
   state/tooling.md
   state/tasks/harness-setup-0-repository-anlegen.md
5. `git status --short` erneut ausgeben. Erwartung: kein `AM` mehr, der
   AP-0-Vertrag steht jetzt auf `A`.
6. `git write-tree` ausführen. Den vollständigen Hash ausgeben und im
   Bericht ausdrücklich als `T_AP0` benennen. Vertrag 0b braucht ihn.
7. `git read-tree template-baseline` ausführen — nur den Index, ohne `-u`.
   Der Working Tree wird dabei nicht angefasst.
8. `git diff --cached template-baseline` ausgeben. Erwartung: leere Ausgabe.
   Das ist der Beweis, dass der Index exakt den Baseline-Baum trägt; ein
   79-Dateien-Diff wäre als Freigabe-Grundlage wertlos, diese eine leere
   Ausgabe ist es nicht.
9. `npm run check:template` ausführen und die Ausgabe vollständig zeigen.
10. Nach meiner Freigabe committen. Message:
    `Template-Baseline 9189959 als Ausgangsstand des Projekt-Repos übernehmen`
    Danach `git rev-parse HEAD^{tree}` und
    `git rev-parse template-baseline^{tree}` ausgeben.

NICHT:
- `git add -A`, `git add .` oder ein Verzeichnis als Pfadspec verwenden.
- Die drei untracked Dateien `state/plan-v1-harness-setup.md`,
  `state/plan-v2-harness-setup.md`,
  `state/advisor-findings-harness-setup.md` stagen. Sie gehören in
  Vertrag 0c.
- `state/freigabe-commit.md` anlegen, lesen, löschen oder in einem
  Bash-Befehl referenzieren.
- Den Working Tree verändern: kein `read-tree -u`, kein `checkout`, kein
  `reset`, kein `stash`, kein `clean`.
- Inhalte anfassen: weder den Kopfblock der 15 Dateien noch den Abschnitt
  „Harness-Herkunft" in `state/tooling.md` korrigieren, kürzen oder
  umformatieren.
- Pushen, branchen, mergen, rebasen.
- `.claude/settings.json` anfassen.

BUDGET:
Ein Durchgang. Keine Korrekturrunde vorgesehen — scheitert ein Schritt, ist
das ein Fall für ESCALATE, nicht für einen zweiten Versuch mit anderer
Methode.

OUTPUT:
- Datei `state/tasks/harness-setup-0a-baseline-commit.md`.
- Der Hash `T_AP0` aus Schritt 6, vollständig, im Bericht deutlich
  hervorgehoben.
- Die Ausgaben der Schritte 2, 3, 5, 8 und 9 im Wortlaut.
- Genau ein Commit auf `main`.
- Die beiden Tree-Hashes aus Schritt 10, nebeneinander gestellt.
- Kein Push.

ESCALATE:
- Das Arbeitsverzeichnis weicht ab → anhalten, nichts ändern.
- `git rev-parse template-baseline` liefert nicht
  `9189959a7d4de0486a4fee1e30b57ea8e5644661` → anhalten, melden, nicht
  nachpinnen.
- Nach Schritt 4 steht noch ein Pfad auf `AM`, oder es fehlt einer der 17
  → anhalten, Ausgabe zeigen.
- Schritt 8 liefert eine nicht-leere Ausgabe → anhalten, Ausgabe
  vollständig zeigen. Nicht mit weiteren `read-tree`/`add`-Versuchen
  „nachbessern".
- `npm run check:template` wird rot → Ausgabe vollständig zeigen, anhalten.
  Die beanstandete Datei nicht anpassen, bis geklärt ist, ob das Gate recht
  hat.
- Der Commit-Guard verweigert (Freigabe abgelaufen oder verbraucht) →
  anhalten und melden. Keine neue Freigabe erzeugen, keinen Umweg suchen.
- `git write-tree` schlägt fehl → anhalten, nichts committen.

FOLGT:
- `harness-setup-0b-ap0-delta-commit` — braucht `T_AP0` aus Schritt 6.
- `harness-setup-0c-arbeitsstand-commit`.
