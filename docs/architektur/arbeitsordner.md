# Arbeitsordner und lesender Fingerabdruck — Einzelheiten zu ARCHITECTURE.md §2

Herkunft: wörtlich aus `ARCHITECTURE.md` §2 verschoben (F45 K „Kontext-Diät“, 17.10.2026), nicht gekürzt. Die Regeln
stehen als Sätze im Kern `ARCHITECTURE.md` §2. Dieser Text ist gleich verbindlich; bei Widerspruch gilt der Kern, und
jeder Widerspruch ist ein Befund; eine Regeländerung ändert Kern und Detail gemeinsam. §-Angaben im Text meinen `ARCHITECTURE.md`. Lesen nur bei Bedarf — wenn eine Aufgabe das
Thema berührt.

---

- Produktdateien im freigegebenen Baupfad ändert ausschließlich das Ausführungswerkzeug. Der Kern liest sie read-only.
  Einzige Ausnahme: der Arbeitsordner je Ablauf (E-F45-3 = A, F45 B1a-1, `src/arbeitsordner/`). Der Kern legt den
  Git-Worktree eines schreibenden Ablaufs ausschließlich über git an und entfernt ihn ebenso (Git-Starter), führt
  darin `npm ci --ignore-scripts` aus und löscht nach einem Lauf der Rolle `ausfuehrung` ausschließlich geprüfte
  reguläre Dateien aus dessen Löschliste — nur innerhalb des Arbeitsordners, nie unter `.git`, `.claude/` oder
  `kontrollzustand/`. Im Projektordner selbst bleibt der Kern lesend.
- Lesender Fingerabdruck (F45 B2a-3b, `src/review-stand`): nur Git-Plumbing mit `--no-optional-locks` (`rev-parse`,
  `ls-tree`, `diff-index`, `ls-files --others`, `check-attr`, `hash-object --stdin-paths` OHNE `-w`), nie `git status`,
  `update-index` oder `write-tree` — der Index wird nicht geschrieben und in `.git/objects` entsteht nichts (Gate
  f45-b2a3b (a) misst beides je Aufruf). Ausnahmen (`kontrollzustand/` u. a.) fallen in JS weg (`istAusnahmePfad`), nicht
  per Pathspec. Gesetzter Filter-Treiber (z. B. LFS) → nicht bestimmbar statt eines fremden Programms im Leitstand.
