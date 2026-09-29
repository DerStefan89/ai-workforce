# ADR — Bash-Allowlist für die Ausführung (E-F754)

**Datum:** 2026-09-28
**Status:** Entschieden

## Kontext
Im F35-Reallauf gegen haushaltsbuch2 (28.09.2026, Lauf 7873df97) baute die
Rolle `ausfuehrung` keinen Produktcode. Ein Grund: Der Werkzeugsatz
`schreibend` (`startvorlagen/ai-workforce.json`) trug nur Read, Grep, Glob,
Write und Edit. Ohne Bash kann die Ausführung weder Abhängigkeiten
installieren (`npm install`) noch Typprüfung und Tests selbst laufen lassen.
Ein echter Bau mit Abhängigkeiten war damit unmöglich (F-754,
`state/findings.md`). Neue Projekte erben die Werkzeugsätze aus dieser Datei
(`src/projekt-anlegen/index.ts`).

## Optionen
1. **A — Bash über eine feste Allowlist im Werkzeugsatz `schreibend`.** Nur
   Paket- und Prüfbefehle, git und alles andere bleibt verboten.
   Vorteil: Die Ausführung kann installieren und selbst prüfen, bis der
   Prüfbefehl grün ist. Nachteil: Größere Sicherheitsfläche der Ausführung.
2. **B — Installation als eigener Kern-Schritt.** Der Kern führt
   `npm install` deterministisch aus, wie heute den Prüfbefehl
   (`src/pruefschritt/index.ts`). Die Ausführung bleibt ohne Bash.
   Vorteil: Keine Shell für das Modell. Nachteil: Die Ausführung sieht
   Prüffehler erst nach ihrem Lauf; neue Abhängigkeiten brauchen einen
   zusätzlichen Kern-Schritt und eine Rückkopplung.

## Entscheidung
Option A (Stefan, 28.09.2026, E-F754 = A). `werkzeugsaetze.schreibend.erlaubte_werkzeuge`
trägt genau diese Bash-Regeln:
`Bash(npm install)`, `Bash(npm ci)`, `Bash(npm run check:*)`,
`Bash(npm run lint:*)`, `Bash(npm run typecheck:*)`, `Bash(npm run test:*)`,
`Bash(npm run build:*)`. Kein allgemeines `npm run *`, weil Skripte wie
`zustand:sichern` git ausführen. Die ZWINGEND-Freigabe vor jedem schreibenden
Lauf bleibt.

Verengung F-756 (Stefan, 28.09.2026): `npm install` und `npm ci` gelten nur
exakt, ohne `:*`. `npx tsc` ist gestrichen, `npm run typecheck` reicht. Neue
Pakete trägt die Ausführung in `package.json` ein und ruft danach
`npm install` ohne Argumente auf. So ist jede neue Abhängigkeit im Diff
sichtbar. `npm install <paket>`, `npm install -g …` und `--prefix …` sind
nicht erlaubt.

Umsetzung:
- `src/startvorlage/index.ts` (`pruefeErlaubteWerkzeuge`) prüft positiv: Eine
  Bash-Regel außerhalb von `ERLAUBTE_BASH_REGELN` ist ein Validierungsfehler.
  Ebenso nacktes `Bash`, `Bash(*)`, `Bash(:*)`, jede Regel mit git-Präfix,
  `PowerShell` und jeder Eintrag ohne die Form „Name, optional eine
  Klammer-Regel“. `ladeStartvorlage` wirft dann (fail-closed). Seit F-839
  (F36 Review-Pass) auch `Skill`, `Agent`, `Task` (jede Schreibweise, mit
  oder ohne Klammer-Regel) und jedes `mcp__…`: Skills und MCPs kommen nur über
  den Katalog-/Ort-B-Weg in den Lauf.
- `src/claude-code-gateway/index.ts` (`baueAufruf`) gibt `--tools` nur die
  Werkzeugnamen und `--allowedTools` die vollen Regeln. Trägt der Satz eine
  Bash-Regel, kommt `--disallowedTools Bash(git:*)` dazu.

Messung vom 28.09.2026 mit claude 2.1.258 (`-p`, `stream-json`,
`--setting-sources project`):
- Mit `Bash(…)` in `--tools` fehlt Bash im Werkzeugsatz ganz.
- Mit `--tools Read,Bash` und Regeln in `--allowedTools` laufen erlaubte
  Befehle. `git --version` wird abgelehnt und erscheint in
  `permission_denials`.
- `:*` hat eine Wortgrenze: `npm run test:*` lässt `npm run testx` nicht zu.
- Verkettete Befehle (`&&`, `;`) werden für jeden Teil einzeln geprüft.
- Ein `allow: ["Bash"]` aus zusätzlichen Einstellungen hebt die Allowlist
  auf. `--disallowedTools Bash(git:*)` sperrt git trotzdem.
- `Bash(npm install)` ohne `:*` (F-756): `npm install` läuft.
  `npm install -g <paket>` und `npm install <paket>` werden abgelehnt.
  Ebenso lehnt `Bash(npm ci)` den Aufruf `npm ci --ignore-scripts` ab. Alle
  drei stehen in `permission_denials`.

## Begründung
Nur mit A kann die Ausführung ein Feature samt Abhängigkeiten bauen und
bis zum grünen Prüfbefehl korrigieren. Die Grenze liegt in der Konfiguration.
Der Validator prüft sie beim Laden, `baueAufruf` setzt sie bei jedem Aufruf
durch. Der Kern-Prüfschritt bleibt der verbindliche Nachweis. Ein Selbstlauf
der Rolle ersetzt ihn nicht.

## Konsequenzen
- `npm install`/`npm ci` führen Lifecycle-Skripte aus (`postinstall`,
  `prepare`). Dazu gehört auch fremder Code aus Abhängigkeiten. Die Ausführung
  darf außerdem `package.json` schreiben. Damit kann sie über ein erlaubtes
  `npm run …` jeden Befehl erreichen, auch git. Die Allowlist verhindert
  Versehen, sie sperrt nicht sicher ein. „git bleibt verboten“ gilt nur für
  den direkten Aufruf.
- Begrenzt wird das durch fünf Dinge:
  - die ZWINGEND-Freigabe vor jedem schreibenden Lauf,
  - die Allowlist samt Validator; Bash-Regeln sind nur in einem Satz mit
    `art: 'schreibend'` gültig, ein lesender Review- oder Advisor-Lauf
    bekommt kein Bash,
  - die Startfreigabe (`ermittleIstZustand`, `src/invocation-policy/index.ts`):
    Sie hasht `.claude/settings.json` und die Hook-Dateien des Projekts gegen
    die Baseline. Ein eingeschleustes `allow: ["Bash"]` lässt den nächsten
    Start scheitern,
  - den Hook `commit-guard`, soweit das Projekt ihn trägt (Projekte aus dem
    Skelett tragen ihn),
  - den Kern-Prüfschritt, der dasselbe Prüfskript ohnehin ausführt.
- `--tools` schränkt Bash nicht mehr ein. Das tut nur noch die Permission-Achse
  (`--allowedTools`/`--disallowedTools`, im `-p`-Modus ohne Rückfrage
  abgelehnt). Für Werkzeugsätze ohne Bash-Regel bleiben beide Achsen
  unverändert.
- Die exakten Regeln für `npm install`/`npm ci` lassen keine Zusatzargumente
  zu. Braucht ein Projekt z. B. `npm ci --ignore-scripts`, ist das eine neue
  Entscheidung. Die Regel wird dann nicht still erweitert (F-756).
- `LEITSTAND_*`-Umgebungsvariablen des Servers erreichen den Bash-Kindprozess.
  Der Kern-Prüfschritt entfernt sie, der claude-Kindprozess nicht (F-755).
- Bestehende Projekte tragen ihre eigene Kopie der Werkzeugsätze. Die Bash-Regeln
  trägt dort der Mensch nach.
