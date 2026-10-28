# Ratsche für Codequalität — Einzelheiten zu ARCHITECTURE.md §1

Herkunft: F45 W2c-1 (28.10.2026; Plan `features/F45/plan-w2c1.md`/`plan-w2c1-v2.md`, Advisor `advisor-w2c1.md` und
`advisor-w2c1-delta.md`). Die Regel steht als Satz im Kern `ARCHITECTURE.md` §1 (`scripts/`). Dieser Text ist gleich verbindlich; bei
Widerspruch gilt der Kern, und jeder Widerspruch ist ein Befund; eine Regeländerung ändert Kern und Detail gemeinsam.
Lesen nur bei Bedarf — wenn eine Aufgabe Lint, Formatierung, Dateigröße oder checkJs berührt.

---

- **Ziel:** Codequalität wird nicht schlechter. Der Bestand ist in `scripts/ratsche.json` eingefroren und darf je Datei nur
  sinken; neue Dateien erfüllen die Regeln von Anfang an. Der Bestand wird nicht umgebaut (kein Formatierer-Massen-Commit,
  Entscheidung Stefan E-FMT-1 = B).
- **Code-Dateien:** Endungen ts, mjs, js unter `scripts/` und `src/`, js und mjs unter `public/`, aus
  `git ls-files --cached --others --exclude-standard` (vorhandene Dateien). `biome.json` `files.includes` deckt diese Menge
  (Test); Biome läuft ohne Ignore-Datei.
- **Gezählt je Datei:** (1) Biome-Befunde je Regel, alle Schweren — empfohlene Regeln (`preset`) und kognitive Komplexität
  höchstens 15; Regeln mit Bestand stehen in `biome.json` auf `info`, alle anderen scheitern zusätzlich in `npm run lint`
  (`--error-on-warnings`), soweit ihre Standard-Schwere warn oder error ist. (2) Zeilen über 800 — ausgenommen
  `scripts/leitstand-server.mjs` (eigene Ratsche, §1 Wachstumsbremse) und die i18n-Wörterbücher `public/leitstand/i18n/*.js`
  (Daten, Entscheidung Stefan E-RATSCHE-1 = A). (3) checkJs-Fehler (`tsconfig.checkjs.json`, strict) für
  `scripts/leitstand/*.mjs` ohne Tests; Fehler in importierten, nicht gelisteten Dateien zählen nicht.
- **Formatierer:** Biome im bestehenden Stil (2 Leerzeichen, einfache Anführungszeichen, Semikolon nur bei Bedarf, Breite 120,
  Kommas am Ende nach ES5, Klammern um Pfeil-Parameter immer — die Kombination mit der kleinsten Abweichung vom Bestand). Er
  gilt nur für die Liste `formatiert` in `scripts/ratsche.json`: am Start jede Datei, die schon formatiert war, und jede neue.
  Eine neue Code-Datei wird mit `npx biome format --write <datei>` formatiert und mit
  `node scripts/check-ratsche.mjs --aktualisiere` aufgenommen.
- **Regeln** (Gate `scripts/check-ratsche.mjs`): (a) Ist > Bestand; (b) Ist < Bestand (senken mit `--aktualisiere`);
  (c) Bestandswert höher als auf der merge-base mit main; (d) Listeneintrag von main fehlt, obwohl die Datei existiert;
  (e) Befund oder Datei ohne Bestandseintrag; (f) JSON fehlt, ist kaputt, oder eine Werkzeugausgabe ist unlesbar,
  unvollständig oder trägt eine fremde Kategorie, oder eine Code-Datei ist so groß, dass Biome sie überspringt;
  (g1) gelistete Datei unformatiert; (g2) gelisteter Pfad ohne Code-Datei; (g3) Code-Datei, die auf der merge-base nicht
  existiert und nicht in der Liste steht. `--aktualisiere` schreibt nur Senkungen, Entfernungen und Erweiterungen der Liste.
- **Durchsetzungsgrad:** ERZWUNGEN für (a)–(g3); (c), (d) und (g3) bei lesbarer Referenz (merge-base mit `origin/main` bzw.
  `main`; die CI checkt mit voller Historie aus). DEKLARIERT: Bearbeiten von Gate, `scripts/ratsche.json`, `biome.json`,
  `tsconfig.checkjs.json` und Unterdrückungen im Code (`biome-ignore`, `@ts-nocheck`, `@ts-expect-error`) — sie senken das Ist;
  Formatierung durch einen Editor außerhalb der Liste; Änderungen an importierten, nicht gelisteten `public/leitstand/*.js`
  verschieben die checkJs-Zählung einer gelisteten Datei; checkJs erfasst nur `scripts/leitstand/*.mjs` (keine Unterordner,
  keine js-Dateien dort). Eine Datei mit JS/TS-Endung außerhalb der Code-Dateien (cjs, mts, tsx, ts unter `public/`) macht
  das Gate rot (f).
- **Werkzeug-Update** (Biome, TypeScript): neue Befunde in Bestandsdateien melden (e); `--aktualisiere` legt keine neuen
  Schlüssel an. Auswege: Befunde im selben Paket beheben, oder den Bestand anheben — nur mit Entscheidung Stefans, (c) ist
  dann bewusst einmal rot. Ändert der Formatierer sein Verhalten, melden gelistete Dateien (g1): im selben Paket formatieren.
- **Dateigröße:** Biome überspringt Dateien ab 1 MiB still; die Ratsche meldet sie (f). `scripts/leitstand-server.mjs` liegt
  nahe darunter (W1 deckelt Zeilen, nicht Bytes).
- **Folgen:** Bestandsdateien über 800 Zeilen sind zeilenneutral zu ändern. Neue Module unter `scripts/leitstand/` (auch
  ausgelagerte Server-Helfer, §1) brauchen 0 checkJs-Fehler, Komplexität ≤ 15 und Formatierung; wer eine komplexe Funktion in
  eine Bestandsdatei verschiebt, erhöht deren Zählung. Eine umbenannte Bestandsdatei gilt als neu — ihr Eintrag erhöht den
  Bestand; das geht nur mit Entscheidung Stefans, (c) ist dann bewusst einmal rot.
