<!-- Ziel-Pfad im Repo: docs/harness/geraete-bruecke-verifikation.md -->
# Geräte-Brücke: Regel für lesende Verifikation

Mehrfach real beobachtet (F-034, zuletzt F-045, 30./31.08.2026): ein
lesender Git-Befehl über die Geräte-Brücke (`mcp__remote-devices__device_bash`
o. ä.) gegen ein Repo, das gleichzeitig von einer lokalen Sitzung genutzt
wird, kann mit deren laufendem Git-Prozess kollidieren. Beobachtete Folgen:
eine verwaiste `.git/index.lock`, die reales `git commit` blockiert (F-034),
und einmal eine `main`, die nicht mehr zum Arbeitsverzeichnis synchron
stand, nachdem ein `checkout`/`pull`-artiger Befehl über die Brücke lief
(F-045).

## Regel

Externe Verifikation eines Repo-Zustands über die Geräte-Brücke ausschließlich
mit index-neutralen Befehlen:

- `git log`
- `git show <rev>:<pfad>`
- `git diff <revA> <revB>`

Kein `git checkout`, `git pull`, `git reset`, `git status` (kann je nach
Git-Version den Index berühren) auf einem Repo, das potenziell parallel von
einer anderen Sitzung genutzt wird. Ist eine Zustandsänderung (nicht nur
Lesen) nötig, gehört sie in die lokale Sitzung, die das Repo aktiv führt —
nicht in eine externe Lese-Verifikation.

Tritt trotzdem eine `.git/index.lock` auf: vor dem nächsten Terminal-Block
prüfen, ob wirklich kein Git-Prozess mehr läuft, erst dann die Lock-Datei
entfernen (nicht blind vorab, siehe F-034-Maßnahme in `state/findings.md`).
