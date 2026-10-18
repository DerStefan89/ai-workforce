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
- Zeilenenden-Schutz (F45 B2b-3b-2b-2b-2a, Umsetzungsdetail zu „Worktree nur über git angelegt“, keine eigene Regel):
  `git worktree add` läuft mit `-c core.autocrlf=false -c core.eol=lf` — ohne autocrlf-Umwandlung, text-Dateien ohne
  eigenes `eol` mit LF. E-183 hasht bewusst Rohbytes; sonst bekäme der Arbeitsordner unter Windows CRLF und jeder
  schreibende Lauf scheiterte an der Startprüfung. Das Skelett trägt zusätzlich `vorlagen/projekt-skelett/.gitattributes`
  (`* text=auto eol=lf`); Nachrüsten legt sie nur an, wenn sie fehlt (eine abweichende bleibt); im Arbeitsordner wirkt sie
  erst nach dem Commit, in der Arbeitskopie des Projekts erst nach erneutem Auschecken. Ein wiederaufgenommener Arbeitsordner
  mit CR (von vor der Korrektur) bekommt im E-183-Grund den Rat „Arbeitsordner aufräumen“. Grenzen: ein `eol=crlf`-Attribut
  oder ein Filter des Projekts wirkt weiter; spätere Checkouts im Arbeitsordner folgen der gemeinsamen Repo-Konfiguration;
  die Startfreigabe folgt der Arbeitskopie, der Arbeitsordner dem Commit — eine von git mit CRLF ausgecheckte Arbeitskopie
  ohne `eol=lf` (vor der Korrektur zufällig grün) scheitert jetzt an E-183 ohne eigenen Rat (Abwägung, F-1143).
- Lesender Fingerabdruck (F45 B2a-3b, `src/review-stand`): nur Git-Plumbing mit `--no-optional-locks` (`rev-parse`,
  `ls-tree`, `diff-index`, `ls-files --others`, `check-attr`, `hash-object --stdin-paths` OHNE `-w`), nie `git status`,
  `update-index` oder `write-tree` — der Index wird nicht geschrieben und in `.git/objects` entsteht nichts (Gate
  f45-b2a3b (a) misst beides je Aufruf). Ausnahmen (`kontrollzustand/` u. a.) fallen in JS weg (`istAusnahmePfad`), nicht
  per Pathspec. Gesetzter Filter-Treiber (z. B. LFS) → nicht bestimmbar statt eines fremden Programms im Leitstand.
