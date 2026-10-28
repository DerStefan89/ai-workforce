# Delta-Advisor-Pass F45 W2c-1 — Plan v2 (`features/F45/plan-w2c1-v2.md`)

Subagent `architecture-advisor`, frischer Kontext, 28.10.2026. Bericht wörtlich übernommen.

**Geprüft gegen:** `plan-w2c1.md`, `advisor-w2c1.md`, `plan-w2c1-v2.md`; `biome.json`, `package.json`, `.gitignore`, Biome-Schema `node_modules/@biomejs/biome/configuration_schema.json`, Zeichenketten im gepinnten Biome-Binary (`node_modules/@biomejs/cli-win32-x64/biome.exe`, per Grep); `scripts/_wegwerf.ts`, `scripts/teste.mjs`, `scripts/check-wachstumsbremse-server.mjs`, `scripts/check-docs.mjs`; `ARCHITECTURE.md:1-28`; `state/findings.md` (F-015, freie IDs); alle Leser von `ARCHITECTURE.md` in `scripts/`, `src/` (Grep).

**Grenzen der Prüftiefe:** nur Read/Grep/Glob — kein Bash, kein git, kein Werkzeuglauf. Nicht selbst geprüft: Form/Felder des Biome-JSON-Reporters (`summary.infos`), Schwere der Biome-Meldung „couldn't find an ignore file“, ob es heute getrackte und zugleich ignorierte Dateien gibt (`git ls-files -ci`), die Bytegröße von `scripts/leitstand-server.mjs` (nur geschätzt); die bereits im Arbeitsbaum liegende Gate-Datei `scripts/check-ratsche.mjs` (Code ist nicht meine Rolle).

---

## A. Befunde 1–14 des ersten Passes

| # | Status | Evidenz |
|---|---|---|
| 1 i18n | aufgelöst | [Fakt] E-RATSCHE-1 = A, v2 Z. 4-5, 9. [Fakt, entlastend] Unter `public/leitstand/i18n/` liegen nur `de/en/ru/tr.js` (Glob) — der Glob `*.js` ist vollständig; 43 − 1 − 4 = 38 stimmt mit v1 Z. 36. |
| 2 Ersterhebung | aufgelöst, eine Unschärfe | → N2 |
| 3 Ausgaben | weitgehend aufgelöst | [Fakt, entlastend] Binary enthält „max-diagnostics … Use `none` to remove the limit.“ — das Flag existiert; Zeichenkette `diagnosticsNotPrinted` vorhanden. Rest → N4 |
| 4 Kopplung | aufgelöst, aber über einen neuen Fehler | → N1 |
| 5 Schlupflöcher | aufgelöst | [Schlussfolgerung, entlastend] Der Kopplungstest „jede Code-Datei in `files.includes`“ (v2 Z. 12) ERZWINGT zusätzlich, dass `includes` nicht enger wird. Lücke: `.gitignore` fehlt in der DEKLARIERT-Liste, solange `vcs` bleibt (N1). |
| 6 Folgekosten | aufgelöst | v2 Z. 14 |
| 7 Autofix | aufgelöst (gestrichen) | v2 Z. 15 |
| 8 (g4) | aufgelöst (nur Hinweis) | v2 Z. 16 |
| 9 Referenz | aufgelöst | [Fakt, entlastend] `ls-tree` immer an der merge-base (v2 Z. 17); F-1241 ist frei (kein `**F-1235**`…`**F-124x**` in `state/`). |
| 10 zaehleZeilen | aufgelöst | v2 Z. 18; Muster `execFileSync('git', …)` mit reinen `node:`-Importen existiert (`check-wachstumsbremse-server.mjs:171`). |
| 11 Lint-Schwere | aufgelöst | v2 Z. 19 |
| 12 Deckel | aufgelöst, Hinweise | [Fakt, entlastend] `ARCHITECTURE.md:2-8` ≈ 350 Bytes, passt zur Rechnung. Den Wortlaut („Fülle sie erst“, „ist Füllung, nicht Skelett“) liest kein Gate — nur in `ARCHITECTURE.md`, `vorlagen/projekt-skelett/ARCHITECTURE.md` und Planakten. `check-f45-k-kontext.mjs:161` entfernt Kommentare vor der Prüfung; `check-f45-b2a1-projektkarte.mjs:111` und `src/projektkarte/projektkarte.test.ts:50` verlangen „beschrieben“ — ohne Marker erst recht erfüllt; übrige Leser (`check-f45-b2b3*`) schneiden per Abschnittsanker `## 3.`/`## 4.`. Rest → N7 |
| 13 tsconfig | aufgelöst | [Fakt] `tsconfig.checkjs.json` liegt im Arbeitsbaum (Glob). |
| 14 Bedienung | aufgelöst | v2 Z. 22 |

---

## B. Neue Befunde aus v2

**N1. MITTEL — `vcs.useIgnoreFile` öffnet ein stilles Loch und wird nicht gebraucht.**
[Fakt] Laut Schema (`configuration_schema.json:17388-17390`) ignoriert Biome dann Dateien aus „`.gitignore`, `.ignore`, and Git's local exclude file“. [Fakt] `git ls-files --cached` listet getrackte Dateien unabhängig von Ignore-Mustern (Vorbild `teste.mjs:71`). Die Grundlagen sind gerade **nicht** gleich: eine getrackte, zugleich ignorierte Code-Datei (`git add -f`, neues `.gitignore`-Muster für eine getrackte Datei) steht in der Code-Menge des Gates, Biome überspringt sie ⇒ das Gate sieht sie als formatiert und befundfrei ((g1)/(g3) grün ohne Prüfung), ihr Bestand fällt über (b)/`--aktualisiere` still auf 0. `.ignore` wirkt nur auf Biome, nicht auf git.
[Schlussfolgerung, entlastend] Umfang von `npm run lint` heute praktisch unverändert: unter `scripts/`, `src/`, `public/` keine `dist/build/out/coverage/node_modules` (Glob); `scripts/.aufraeumen-reste/` enthält PID-Dateien, keinen Code (`_aufraeumen.ts:68`); keine Root-`.ignore`.
[offene Unsicherheit] Binary enthält „Biome couldn't find an ignore file in the following folder“ — Schwere unbekannt; ohne `.gitignore` (Wegwerf-Ordner) könnte daraus eine Fremdkategorie werden (rot nach v2 Z. 11), als Warnung bräche sie mit `--error-on-warnings` auch `npm run lint`. Ebenfalls offen, ob in einem git-Worktree (`.git` ist Datei) die „local exclude file“ ohne Meldung gelesen wird.
**Einfachere Lösung:** den `vcs`-Block nicht einführen. Das Gate filtert die Biome-Diagnosen auf die Code-Menge aus `git ls-files`; da kein Ignore-File wirkt, sieht Biome jede Datei dieser Menge, und der Kopplungstest sichert die `includes`. Wer `vcs` behalten will: Rot bei nicht leerer Schnittmenge `git ls-files -ci --exclude-standard` ∩ Code-Menge und `.gitignore` in die DEKLARIERT-Liste.
[Fakt] Der Kopf von `scripts/check-ratsche.mjs:19` nennt `vcs.useIgnoreFile` schon — die Änderung trifft auch den bereits geschriebenen Stand.

**N2. NIEDRIG — Ersterhebung vs. Liste `formatiert` unklar.**
[Fakt] v2 Z. 10: „nur Einträge für Dateien, die auf der merge-base existieren“, „Neue Paketdateien bekommen nie einen Eintrag“. [Fakt] (g3) (v2 Z. 29) verlangt aber, dass neue Code-Dateien **in** `formatiert` stehen. [Schlussfolgerung] Gilt die Einschränkung auch für `formatiert`, ist (g3) direkt nach der Ersterhebung für `check-ratsche.mjs`/`.test.mjs` rot (zweiter Lauf nötig). Festlegen: Einschränkung nur für Bestandswerte (`zeilen`/`lint`/`checkjs`); formatierte Dateien nimmt die Liste immer auf, auch neue.

**N3. NIEDRIG — Randfälle der Dateiquelle `git ls-files`.**
[Fakt] `teste.mjs:78` filtert `existsSync` und `node_modules`; `--cached` liefert auch getrackte, im Arbeitsbaum gelöschte Dateien — v2 nennt den Filter nicht, ohne ihn scheitert das Zeilenzählen. [Schlussfolgerung] Umgekehrte Richtung der Kopplung: Biome-`includes` `scripts/**`/`src/**` erfassen auch `.cjs/.tsx/.mts`, `CODE_MUSTER` nicht. Heute keine solche Datei (Glob); eine künftige würde gelintet, aber in der Ratsche nicht gezählt. Als Hinweis im Gate-Kopf genügt.

**N4. NIEDRIG — Vollständigkeitsprüfung präzisieren.**
[Schlussfolgerung] Vergleich „Anzahl Diagnosen = Summe aus `summary`“ **vor** dem Filtern auf Code-Dateien ziehen — `biome format scripts src public` meldet auch die JSON-Dateien unter `scripts/` und `src/`, und die stehen in der Summe. [offene Unsicherheit] Ob `summary.infos` existiert, ist ungeprüft; fehlt das Feld, ergibt die Summe NaN ⇒ Gate dauerhaft rot (ausfallsicher, fällt beim Bau auf). [Fakt] Binary enthält „Removing the limit of --max-diagnostics, because of a reporter list contains a reporter different from the default one“ — mit JSON-Reporter ist das Flag vermutlich überflüssig; ob eine zusätzliche Meldung in der Ausgabe landet, klärt der echte Kalibrierlauf.

**N5. NIEDRIG — Biomes `files.maxSize` überspringt große Dateien.**
[Fakt] Schema `:1884`: „Biome ignores larger files. Defaults to `1 MiB`.“ [Schlussfolgerung] `leitstand-server.mjs` grob ≈ 0,85–0,9 MB (Grep: 13 198 Zeilen, 7 634 mit ≥ 50, 2 318 mit ≥ 100, 422 mit ≥ 160 Zeichen) — heute unter der Grenze; W1 deckelt aber Zeilen, nicht Bytes. Überspringt Biome still, gilt die Datei als formatiert und befundfrei; erzeugt das Überspringen eine Diagnose, macht v2 sie rot (ausfallsicher). Empfehlung: Gate prüft „Code-Datei ≥ maxSize ⇒ rot“ selbst (eine `statSync`-Zeile), alternativ verarbeitete Dateien laut `summary` = Code-Menge ([offene Unsicherheit], ob `summary` das liefert).

**N6. Hinweis — Wegwerf-Test mit echtem Biome trägt unter Bedingungen.**
[Fakt, entlastend] `wegwerfOrdner` legt unter `os.tmpdir()` an und räumt beim Prozessende (`scripts/_wegwerf.ts:32-35`). [Schlussfolgerung] Bedingungen: Biome sucht `biome.json` vom Arbeitsverzeichnis aufwärts ⇒ `cwd` = Wegwerf-Ordner; Probedateien unter `scripts/` (`files.includes`), sonst „keine Dateien“; `git init` nur nötig, wenn der Test die ganze Erhebung samt `ls-files` fährt (dann `schalteGitWartungAb`). [Annahme] `$schema` (URL mit derselben Version) wird zur Laufzeit nicht geladen, kein Netz nötig. Mit `vcs` bräuchte der Ordner zusätzlich eine `.gitignore` (N1); ohne `vcs` entfällt das. Der echte Lauf ist gerechtfertigt (Kalibrierung, erster Pass Befund 3) — eine mitgeschnittene Fixture würde ein Biome-Update nicht bemerken.

**N7. Hinweis — ARCHITECTURE-Kopfkommentar, F-015 und Byte-Budget.**
[Fakt] F-015 (`state/findings.md:74-79`) verlangt, den ganzen Kommentar Z. 1–18 zu entfernen; v2 streicht nur Z. 2–8. Festlegen: F-015 bleibt offen mit Restumfang oder wird mit Begründung („Aufteilungsregel ist eine echte Regel“) geschlossen — „F-015 Nachtrag“ allein ist unklar. [Schlussfolgerung] Budget ≈ 19 + 350 ≈ 370 Bytes; der §6-Satz wird durch v2 länger (DEKLARIERT-Liste aus Befund 5, Zuordnung aus Befund 11) — beim Bau messen; passt er nicht: STOPP wie in v1. Die Kennung E-RATSCHE-1 ist inzwischen mit der i18n-Entscheidung belegt; eine Deckel-Entscheidung bräuchte eine neue ID. [Fakt] Kommentare und Testnamen zitieren Zeilennummern (z. B. `src/checkpoint-store/types.ts:73` „ARCHITECTURE.md:61“, `src/human-transport/index.ts:82,277`) — sie verschieben sich um 7 Zeilen; kein Gate prüft sie, ohnehin driftanfällig. Nur erwähnt.

**N8. Hinweis — Reihenfolge Plan vor Bau.**
[Fakt] `scripts/check-ratsche.mjs` liegt schon im Arbeitsbaum (Glob); nicht geprüft (Rolle). N1/N2/N3/N5 betreffen sie — bei Übernahme muss der Code nachgezogen werden, bevor `code-reviewer`/`qa` laufen.

---

## Muss das existieren? / Was kann weg?

1. `vcs`-Block in `biome.json` (N1) — weg; Filterung auf die `ls-files`-Menge im Gate genügt.
2. `--max-diagnostics=none` vermutlich überflüssig mit JSON-Reporter (N4), aber harmlos — behalten, wenn der Kalibrierlauf keine Zusatzmeldung zeigt.
3. Der Rest ist schlank (Autofix und (g4) gestrichen, `zaehleZeilen` kopiert, `grenze_zeilen` Konstante).

## Schnitt nötig?

**Nein.** v2 bleibt ein Baudurchgang mit eigenständig prüfbarem Artefakt.

## Urteil

- [ ] Freigegeben
- [x] Freigegeben mit Hinweisen
- [ ] Nicht freigegeben
- [ ] Blockiert

**Begründung:** Befunde 1–14 tragfähig aufgelöst; der Kern trägt (i18n-Ausnahme, Ersterhebung nur über merge-base-Dateien, ausfallsichere Vollständigkeit, Kopplungstest, Deckel über das Streichen des Kopfkommentars). v2 bringt mit `vcs.useIgnoreFile` einen neuen, heute nur theoretischen Fehler (getrackte, ignorierte Code-Dateien gälten still als sauber) — mit einer Planzeile behebbar (N1: `vcs` weglassen, im Gate filtern); gehört vor den Bau bzw. vor das Nachziehen von `check-ratsche.mjs`, braucht aber keinen weiteren Advisor-Pass. N2–N7 sind Präzisierungen für den Bau.

## Nächster sinnvoller Schritt

N1 entscheiden (Empfehlung: `vcs` weglassen); N2 (`formatiert` bei Ersterhebung), N3 (`existsSync`-Filter), N4 (Summenvergleich vor dem Filtern), N5 (maxSize-Prüfung) als Bauvorgaben übernehmen; dann `check-ratsche.mjs` danach ausrichten, Ersterhebung fahren, §6-Satz gegen das Budget ≈ 370 Bytes messen, dann `code-reviewer` + `qa`.

---

## Übernahme (Autor, 28.10.2026)

N1 übernommen: `vcs` nicht eingeführt; `git ls-files` nur mit Pfadangabe `scripts src public` (auch Laufzeit: ohne Pfadangabe listet `--others` die ≈ 13 000 ungetrackten Ordner unter `kontrollzustand*/`). N2: Einschränkung nur für Bestandswerte; die Liste nimmt jede formatierte Datei auf. N3: `existsSync`-Filter vorhanden; `.cjs/.tsx/.mts` als Hinweis im Gate-Kopf. N4: Summenvergleich vor dem Filtern. N5: `statSync` ≥ 1 MiB ⇒ (f). N7: F-015 erledigt mit Begründung (Marker und Vorlagenanweisung entfernt, Aufteilungsregel bleibt als Regel). Kein weiterer Advisor-Pass.
