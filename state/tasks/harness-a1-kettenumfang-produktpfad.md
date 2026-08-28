SCHRITT 0: Arbeitsverzeichnis ausgeben und gegen das im Auftrag genannte
Zielverzeichnis prüfen. Bei Abweichung: abbrechen, melden, nichts ändern.

## TASK: harness-a1-kettenumfang-produktpfad

GOAL:
`npm run check` erfasst den Produktpfad `src/` mit Lint und Typecheck, und
die beiden Linter-Gate-Zeilen in `state/gates.md` sind für den erweiterten
Geltungsbereich mit echtem Rot- und Grün-Fall neu kalibriert. Ohne diese
Änderung liefe der erste Produktcode grün durch den Required Status Check.

CONTEXT:
- [Fakt] `package.json:12` — `lint` = `biome lint scripts/`. Der
  Geltungsbereich steht im CLI-Argument, nicht in der Konfiguration.
- [Fakt] `tsconfig.json:16` — `include: ["scripts/**/*.ts"]`.
- [Fakt] `biome.json` (15 Zeilen) enthält ausschließlich `linter.rules`,
  keinen `files`-Abschnitt. `$schema` zeigt auf Version `2.5.9`, passend
  zum exakten Pin in `package.json:19`.
- [Fakt] `package.json:14` — `test` = `node --test`. Testdateien werden
  rekursiv gefunden; der Testschritt deckt `src/` bereits ab, Lint und
  Typecheck nicht.
- [Fakt] `state/gates.md:13,14` — beide Linter-Zeilen führen in der
  Prüft-Spalte ausdrücklich „in Dateien unter `scripts/`". Der
  Geltungsbereich ist damit Teil der kalibrierten Aussage, nicht Beiwerk.
- [Fakt] `state/gates.md:16,17` — CI und Branch Protection hängen an
  `npm run check` bzw. am Jobnamen `check`. Der Umfang der Kette ändert
  sich, ihr Name nicht; beide Zeilen bleiben gültig.
- [Fakt] Entscheidung A3 (Projektchat, 22.08.2026): Kern-Code liegt unter
  `src/`, Kontrollzustand unter `kontrollzustand/` als JSON/JSONL, Profile
  unter `profiles/`. `state/` bleibt Harness-Gedächtnis.
- [Schlussfolgerung] `kontrollzustand/` und `profiles/` gehören NICHT in
  den Lint-/Typecheck-Umfang: dort liegen Daten, kein Code.
- [Annahme, für diesen Vertrag festgelegt] `src/` existiert zum Zeitpunkt
  der Ausführung noch nicht oder ist leer. Es wird KEINE Platzhalterdatei
  hinterlassen. Der Rot-Fall entsteht über eine temporäre Datei, die nach
  der Kalibrierung wieder entfernt wird — wie bei AP 4a in
  `scripts/_mode.ts` praktiziert.

SCOPE:
1. `git status` sauber, aktueller `main`, eigener Branch angelegt.
2. Geltungsbereich von Biome aus dem CLI-Argument in `biome.json`
   verlagern: `package.json` → `lint` = `biome lint .`, und in `biome.json`
   einen `files`-Abschnitt ergänzen, der `scripts/**` und `src/**`
   einschließt und alles andere ausschließt. Den korrekten Schlüsselnamen
   gegen das in `biome.json` bereits verlinkte Schema der Version `2.5.9`
   bestimmen und die verwendete Schreibweise im Bericht zeigen — nicht aus
   dem Gedächtnis setzen.
3. `tsconfig.json`: `include` auf `["scripts/**/*.ts", "src/**/*.ts"]`
   erweitern. Ein nicht treffendes Glob ist zulässig, solange mindestens
   eines trifft.
4. Nachweis, dass die Kette ohne vorhandenes `src/` läuft: `npm run check`
   → Exit 0. Wortlaut zeigen. Schlägt einer der beiden Schritte an einem
   fehlenden Verzeichnis fehl, ist das ein Befund, kein Anlass, ein
   Verzeichnis anzulegen — siehe ESCALATE.
5. Rot-Fall `noExplicitAny` im neuen Geltungsbereich: temporäre Datei
   `src/_kalibrierung.ts` mit der Zeile aus AP 4a
   (`const temp_rotfall_any: any = 1`) → `npm run lint` muss Exit 1 und
   den Befund `lint/suspicious/noExplicitAny` melden. Wortlaut zeigen.
6. Rot-Fall `noFloatingPromises` im neuen Geltungsbereich: in derselben
   temporären Datei der Testcode aus AP 4a (async-Funktion plus Aufruf
   ohne `await`/`.then`/`.catch`) → `npm run lint` muss Exit 1 und den
   Befund `lint/nursery/noFloatingPromises` melden. Wortlaut zeigen.
7. Rot-Fall Typecheck im neuen Geltungsbereich: ein echter Typfehler in
   derselben temporären Datei → `npm run typecheck` muss Exit 1 melden.
   Wortlaut zeigen. Dieser Fall fehlt bisher ganz — `state/gates.md` führt
   keine Zeile für den Typecheck.
8. Grün-Fall: temporäre Datei vollständig entfernen, `npm run check` →
   Exit 0. Wortlaut zeigen, `git status` muss `src/` frei von Resten
   zeigen.
9. `state/gates.md`: die beiden Linter-Zeilen auf den erweiterten
   Geltungsbereich nachziehen (Prüft-Spalte und Rot-/Grün-Fall),
   zusätzlich eine neue Zeile für den Typecheck aufnehmen, und einen
   Kalibrierungs-Log-Eintrag mit Datum und allen Wortlauten aus
   Schritt 4–8 ergänzen. Bestehenden Text nicht löschen.
10. Commit über Branch + PR nach `git-flow`, CI-Status melden, NICHT
    selbst mergen. Ein grüner CI-Lauf auf dem PR belegt zugleich, dass die
    erweiterte Kette auf frischer Maschine trägt.

NICHT:
- Eine Platzhalterdatei in `src/` hinterlassen.
- `kontrollzustand/`, `profiles/` oder `state/` in den Lint-/
  Typecheck-Umfang aufnehmen.
- Weitere Linter-Regeln aktivieren oder `recommended` einschalten.
- `.github/workflows/ci.yml` ändern — der Jobname `check` und der Befehl
  `npm run check` bleiben, nur ihr Umfang wächst.
- Die Branch-Protection-Regel anfassen.
- Produktcode schreiben. Dieser Vertrag richtet die Kette ein, er füllt
  sie nicht.
- Projektchat-Dokumente anfassen.

BUDGET:
Ein Baudurchgang plus höchstens eine Korrekturrunde.

OUTPUT:
- `git diff --staged` vollständig zeigen, ausdrückliches „ja" abwarten.
- Verwendete Schreibweise des `files`-Abschnitts in `biome.json` im
  Wortlaut, mit Angabe, woraus sie bestimmt wurde.
- Wortlaut aller Fälle aus Schritt 4–8.
- Aktualisierte Zeilen und Log-Eintrag in `state/gates.md`.
- PR-Link und CI-Status. NICHT selbst mergen.

ESCALATE:
- `npm run check` schlägt bei fehlendem `src/` fehl → anhalten und melden.
  Kein Verzeichnis und keine Platzhalterdatei anlegen, um das Problem
  wegzuräumen — der Umgang damit ist eine Entscheidung für Stefan.
- Ein Rot-Fall aus Schritt 5–7 tritt nicht ein → anhalten, melden, keine
  „kalibriert"-Aussage für den neuen Geltungsbereich eintragen.
- Der `files`-Abschnitt lässt sich unter Version `2.5.9` nicht so
  ausdrücken wie in SCOPE 2 verlangt → anhalten und melden, nicht auf das
  CLI-Argument zurückfallen und nicht die Version wechseln.
- `git status` zu Beginn nicht sauber → anhalten, Ausgabe zeigen.

FOLGT:
- Gitignore-Eintrag für den Rohereignisstrom (§16.3 nennt ihn zwingend).
  Noch kein Vertrag, weil der Pfad erst mit dem Modulentwurf feststeht.
- Erweiterung des Doku-Gates auf `src/` ist ausdrücklich NICHT vorgesehen —
  dort liegt Code, keine Anweisungsdokumentation.
