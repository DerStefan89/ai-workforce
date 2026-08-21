SCHRITT 0: Arbeitsverzeichnis ausgeben und gegen das im Auftrag genannte
Zielverzeichnis prüfen. Bei Abweichung: abbrechen, melden, nichts ändern.

Zielverzeichnis: C:\Users\stefa\Projekte\ai-workforce

## TASK: harness-setup-0d-push-origin

GOAL:
Die drei lokalen Commits auf `main` (Baseline, AP-0-Delta, Arbeitsstand)
liegen auf `origin` und sind dort identisch zum lokalen Stand. Prüfbar:
`git rev-parse main` und `git rev-parse origin/main` nach dem Push
identisch.

CONTEXT:
- [Fakt] `origin` zeigt auf `https://github.com/DerStefan89/ai-workforce.git`,
  öffentlich, Free-Tarif, laut letztem bekannten Stand leer — noch kein
  Push erfolgt.
- [Fakt] Drei lokale Commits liegen bereit:
  `3b4f124` (Baseline) → `54ea586` (AP-0-Delta) → `648c877`
  (Arbeitsstand). `git status --short` ist leer.
- [Fakt] `.claude/hooks/commit-guard.js`: `git push` wird ohne frische
  `state/freigabe-commit.md` verweigert, exakt wie `git commit` — eine
  Freigabe pro Git-Vorgang, Frischefenster 10 Minuten.
- [Klarstellung] Der NICHT-Punkt zu `state/freigabe-commit.md` verbietet
  nur dir, die Datei anzulegen, zu lesen oder per Bash zu referenzieren.
  Legt Stefan sie selbst an, ist das der Normalfall.
- [Fakt] `gh`-CLI ist auf dieser Maschine nicht installiert — bewusst
  vertagt auf AP 3, hier nicht installieren und keinen PR-Status über `gh`
  prüfen.
- [Schlussfolgerung] Da dies der allererste Push auf einen bisher leeren
  Remote ist, ist ein Konflikt unwahrscheinlich, aber nicht denkbar
  unmöglich (z. B. falls beim Anlegen über die Web-UI doch ein initialer
  Commit entstanden ist). Deshalb wird das vor dem Push geprüft, nicht
  angenommen.
- [Schlussfolgerung] Ein vorheriger Versuch dieses Vertrags scheiterte an
  ESCALATE, weil er sich selbst als erster Schritt auf die Platte
  geschrieben hat — die entstandene untrackte Datei hat dann die eigene
  Status-Prüfung ausgelöst. Dieser Vertrag hat keinen Commit-Schritt, der
  sie einsammeln könnte. Deshalb steht das Schreiben dieses Vertrags auf
  die Platte hier bewusst als **letzter** SCOPE-Schritt, nach dem Push,
  nicht als erster.

SCOPE:
1. `git remote -v` ausgeben.
2. `git ls-remote origin` ausgeben — Prüfung, ob der Remote bereits Refs
   trägt.
3. `git status --short` ausgeben (Erwartung: leer) und `git log --oneline`
   (Erwartung: die drei genannten Commits).
4. Nach meiner Freigabe: `git push -u origin main`.
5. Danach `git rev-parse main` und `git rev-parse origin/main` ausgeben
   und gegenüberstellen.
6. Erst jetzt diesen Auftrag wortgetreu nach
   `state/tasks/harness-setup-0d-push-origin.md` schreiben — als
   Nachweis-Dokument, nicht als Vorbedingung für Schritt 3.

NICHT:
- `gh` installieren oder `gh`-Befehle verwenden.
- `--force` oder `--force-with-lease` verwenden, unter keinen Umständen.
- Einen anderen Branch als `main` pushen.
- `state/freigabe-commit.md` anlegen, lesen, löschen oder in einem
  Bash-Befehl referenzieren.
- Irgendetwas committen — reiner Push-Vorgang.
- Diesen Vertrag vor Schritt 6 auf die Platte schreiben.
- `.claude/settings.json` anfassen.

BUDGET:
Ein Durchgang.

OUTPUT:
- Ausgaben der Schritte 1, 2, 3 im Wortlaut.
- Bestätigung des erfolgreichen Push.
- Die beiden Hashes aus Schritt 5, nebeneinander gestellt.
- Datei `state/tasks/harness-setup-0d-push-origin.md`, geschrieben in
  Schritt 6.

ESCALATE:
- Das Arbeitsverzeichnis weicht ab → anhalten.
- `git status --short` in Schritt 3 ist nicht leer → anhalten, melden,
  nicht pushen. (Diesmal ohne die Selbstschreib-Ursache aus dem
  vorherigen Versuch — ein Treffer hier wäre ein echter, neuer Befund.)
- `git ls-remote origin` zeigt bereits einen `main`-Ref → anhalten, melden,
  NICHT pushen, erst recht nicht forcen. Das wäre ein echter Befund, kein
  Normalfall.
- Der Push scheitert (Auth, Netzwerk, Remote lehnt ab) → anhalten,
  Fehlermeldung vollständig zeigen, nicht mit `--force` nachhelfen.
- Der Commit-Guard verweigert, obwohl Stefan eine frische Freigabe angelegt
  hat → anhalten und melden.
- Die Hashes aus Schritt 5 weichen voneinander ab → anhalten, melden, nicht
  erneut pushen ohne Rückmeldung.

FOLGT:
- `harness-setup-1-pruefkette-fuellen` (AP 1) — danach.
