# Advisor-Pass F45 W2c-1 — Plan v1 (`features/F45/plan-w2c1.md`)

Subagent `architecture-advisor`, frischer Kontext, 28.10.2026. Bericht wörtlich übernommen.

**Geprüft gegen:** Plan (vollständig); `biome.json`, `package.json`, `tsconfig.json`, `tsconfig.checkjs.json`; `scripts/check-wachstumsbremse-server.mjs`, `scripts/check-f45-k-kontext.mjs`, `scripts/check-kette.mjs` (+ `.test.mjs`), `scripts/messe-check.mjs`, `scripts/teste.mjs`, `scripts/check-docs.mjs`, `scripts/check-skelett-herkunft.mjs`, `scripts/check-f45-b2a1-projektkarte.mjs`; `src/aenderungsuebersicht/index.ts` (Regel 1j), `src/projektkarte/index.ts`; `ARCHITECTURE.md`, `scripts/architektur-kern.json`; `state/findings.md` (F-015), `state/memory-map.md`; `docs/STATUS.md:103`, `docs/projekt/fixpaket-f45.md:118`; Biome-Schema `node_modules/@biomejs/biome/configuration_schema.json`; `.gitattributes`, `.gitignore`. Zeilenzahlen per Grep gezählt (Treffer auf `^` je Datei).

**Rollengrenze:** nur Read/Grep/Glob — kein Bash, kein git, kein Werkzeuglauf. Daher nicht selbst geprüft: die Messzahlen des Plans (562/558/1 441), Form und Größe der Biome-JSON-Ausgabe, ob `--max-diagnostics=none` existiert, ob die Fixes von `noUnusedImports`/`noUnusedVariables` als „sicher“ gelten, wie viele empfohlene Regeln Standard-`info` haben, ob `tsconfig.checkjs.json` getrackt ist, die Bytegröße von `leitstand-server.mjs` gegenüber Biomes `files.maxSize`.

---

## Befunde

**1. HOCH — Die i18n-Wörterbücher stehen ohne Begründung im 800-Zeilen-Bestand ⇒ jedes UI-Paket wird rot.**
[Fakt] `public/leitstand/i18n/de.js` 3 498 Zeilen, `en.js` 3 487, `tr.js` 3 487, `ru.js` 3 500; `de.js:11-12` flaches Objekt, „Neue Schlüssel gleichzeitig in en/tr/ru anlegen“. [Schlussfolgerung] Jeder neue Oberflächentext fügt in vier eingefrorenen Dateien je eine Zeile hinzu ⇒ (a) rot; Auswege nur Texte löschen oder die JSON von Hand anheben ((c) rot). Der Plan (Z. 36) zählt die vier still zu den 42 einzufrierenden. Das sind Daten, kein Code mit Wachstumsdruck. V1 Vorschau ist ein UI-Paket und steht kurz nach W2 (`docs/STATUS.md:103`). **Vor dem Bau zu entscheiden (Challenger/Stefan):** `public/leitstand/i18n/*.js` begründet ausnehmen (wie den Server) oder bewusst einfrieren und die Folge benennen.
[Fakt, als Hinweis] Ähnlich, aber gewollt: `views/workboard.js` 2 375, `chat.js` 2 076, `workflows.js` 1 735, `roadmap.js` 1 609, `workboard-detail.js` 1 044, `dashboard.js` 1 035 Zeilen — jede UI-Änderung dort muss künftig zeilenneutral sein. Gehört in Risiken und Akte.

**2. MITTEL — Die Ersterhebung friert die eigenen neuen Dateien des Pakets ein.**
[Fakt] Plan Z. 101-104 und 109-110: Fehlt die JSON, schreibt `--aktualisiere` das Ist aller Dateien; erst danach werden die neuen Dateien formatiert. Vor dem ersten Merge gibt es keine Referenz, (c) ist „nicht geprüft“ (Muster `check-wachstumsbremse-server.mjs:207`). [Schlussfolgerung] Ein Befund in `check-ratsche.mjs`/`.test.mjs` würde Bestand — bei 381 Komplexitäts-Befunden im Bestand nicht unwahrscheinlich; widerspricht „neue Dateien regelkonform“. Reihenfolge: erst erheben, dann formatieren ⇒ (g3) rot, zweiter Lauf nötig. **Vorschlag:** Ersterhebung schreibt Einträge nur für Dateien, die auf der merge-base existieren (die `ls-tree`-Liste ist ohnehin geplant); Ersterhebung nur, wenn die Referenz keine JSON hat, sonst Start von der Referenz-JSON (min(Referenz, Ist)). So schließt `--aktualisiere` das Loch „löschen und neu erheben“ selbst, nicht erst über (c).

**3. MITTEL — Werkzeugausgaben: Größe, Vollständigkeit, fremde Kategorien.**
[offene Unsicherheit] Ob Biomes JSON-Reporter (experimentell) je Diagnose Quelltext mitliefert — ≈ 1 100 Diagnosen (562 Lint, 558 Format). [Fakt] `execFileSync` hat standardmäßig `maxBuffer` 1 MiB ⇒ ENOBUFS (sicher rot, aber Gate unbrauchbar); Vorbild `scripts/teste.mjs:71` 64 MiB. [Annahme] Ist `--max-diagnostics=none` ungültig oder kappt die Ausgabe, zählt das Gate zu wenig ⇒ Abgleich Anzahl Diagnosen gegen die Summenzeile des Reporters, Abweichung rot. `biome lint`/`format` enden bei Befunden mit Exit ≠ 0 — beim Parsen erwarten, nicht als Werkzeugfehler werten. [Fakt] `scripts/**` und `src/**` enthalten JSON (`scripts/architektur-kern.json`, `scripts/wachstumsbremse-server.json`, zwei `src/**/…-referenz.json`, künftig `scripts/ratsche.json`); `biome format` meldet sie. Festlegen: nur Code-Endungen auswerten; Kategorien außerhalb `lint/*`, `format` in Code-Dateien (`parse`, `suppressions/*`, Datei zu groß) ⇒ rot. Parser-Tests mit echten, mitgeschnittenen Ausgaben der gepinnten Werkzeuge, keine handgeschriebenen Beispiele (`ARCHITECTURE.md:181`: ERZWUNGEN braucht kalibrierten Rot- und Grün-Fall).

**4. MITTEL — Code-Dateien und Biomes Prüfumfang nicht gekoppelt.**
[Schlussfolgerung] Eine Code-Datei außerhalb von `files.includes` (`biome.json:4`) meldet Biome nicht — das Gate sähe sie still als formatiert und lint-frei ((g1)/(g3) grün ohne Prüfung). [Schlussfolgerung, entlastend] Die Erweiterung um `public/**/*.mjs` ist darum nötig und richtig; `public/**/*.ts` bliebe außerhalb. **Vorschlag:** Code-Datei-Muster als Konstante im Gate, Test gegen `biome.json` `files.includes`. [Fakt] Dateierhebung: Plan `readdirSync`, Vorbild `teste.mjs:68-80` `git ls-files --cached --others --exclude-standard` (gitignorierte zählen nicht); Biome ohne `vcs.useIgnoreFile`. Beide Seiten brauchen dieselbe Grundlage — ausdrücklich festlegen.

**5. MITTEL — Schlupflöcher außerhalb von (c) nicht benannt.**
`grenze_zeilen` (Plan Z. 73): von (c) nicht abgedeckt (Z. 89-91); anheben ⇒ Dateien zwischen 800 und neuem Wert verlieren ihre Einträge über `--aktualisiere` still. Besser Konstante im Gate (`scripts/check-*`, Regel 1j). Konfiguration/Unterdrückung: in `biome.json` Regel `off`, `maxAllowedComplexity` hoch, `includes` enger; in `tsconfig.checkjs.json` `include` enger; im Code `biome-ignore`, `@ts-nocheck`, `@ts-expect-error` — alle senken das Ist, danach senkt `--aktualisiere` den Bestand. [Fakt] `biome.json`, `tsconfig*.json` stehen im Prüfketten-Muster (`src/aenderungsuebersicht/index.ts:398-408`) — Workforce-Läufe halten daran an, Handarbeit nicht. Im Gate-Kopf und ARCHITECTURE-Satz als DEKLARIERT nennen (Plan Z. 113 nennt nur „Gate/JSON“).

**6. MITTEL — Folgekosten für das „Auslagern“ nicht benannt.**
[Fakt] `ARCHITECTURE.md:59-61`: Server-Zeilen werden durch Auslagern reiner Helfer nach `scripts/leitstand/` ausgeglichen. [Schlussfolgerung] Ab W2c-1 muss jedes neue Modul dort unter strict-checkJs 0 Fehler haben (JSDoc an jedem Parameter; 41 von 43 bestehenden haben heute Fehler, Plan Z. 38), formatiert sein, Komplexität ≤ 15 und alle empfohlenen Regeln einhalten. Wird eine komplexe Funktion in eine bestehende Datei verschoben, steigt dort die Zählung ⇒ (a)/(c) rot. Das will der Auftrag, verteuert aber jedes künftige Paket am Server — in Risiken und Akte.

**7. NIEDRIG — Autofix: wenig Ertrag, Risiko. Streichen empfohlen.**
[Fakt] Plan Z. 63-66: höchstens 21 von 562 Befunden. [offene Unsicherheit] Ist der Fix von `noUnusedVariables` nicht sicher, ändert `--write` ohne `--unsafe` nichts ⇒ höchstens 8 Importe. Risiken: [Annahme] Biome wertet JSDoc-Nutzung nicht als Verwendung — ein nur in JSDoc genutzter Import fiele, checkJs-Fehler stiegen; Import mit Nebenwirkung; Server berührt ⇒ W1 rot ((a3) straff, `check-wachstumsbremse-server.mjs:120`); Gates lesen Quelltext als Text; jede Stelle braucht Einzelprüfung. Der Auftrag sagt „nur sichere Autofixes“, nicht „Autofixes müssen sein“; die Ratsche (b) erlaubt jedem späteren Paket die Bereinigung.

**8. NIEDRIG — (g4) verlangt der Auftrag nicht.**
[Fakt] `--aktualisiere` nimmt formatierte Dateien ohnehin auf (Plan Z. 102). [Schlussfolgerung] (g4) macht „Datei ist besser geworden“ zu einem roten Lauf ohne Qualitätsaussage; (g1)–(g3) und (d) genügen. [Schlussfolgerung, entlastend] Mengensemantik von (d) ist richtig — ein Längenvergleich wäre bei Löschen plus Hinzufügen falsch.

**9. Hinweis — Eigene Referenz-Funktion vertretbar.**
[Fakt] `leseReferenz` hängt an `BREMSE_PFAD`/`ladeBremse` (`check-wachstumsbremse-server.mjs:171-208`). [Schlussfolgerung, entlastend] Die Ratsche braucht zusätzlich den merge-base-Commit für `ls-tree`. [Fakt] Es wäre die dritte Kopie (zweite: `check-f45-k-kontext.mjs:205-242`) — als Finding für die W2-Aufräumung. Präzisieren: (g3) nimmt `ls-tree` immer an der merge-base, nie an der Spitze von main.

**10. Hinweis — Import von `zaehleZeilen` zulässig, aber unnötig.**
[Fakt, entlastend] Regel 1j schützt `scripts/check-*` und `scripts/_*` (`src/aenderungsuebersicht/index.ts:398-408`); viele Gates importieren `scripts/_*.ts` (z. B. `check-f16-codex-gateway.mjs:84-85`); „nur node:“ in `check-kette.mjs:40-41` meint Importe aus `src/`; der Import ist ohne Nebenwirkung (Haupteinstieg geschützt, `check-wachstumsbremse-server.mjs:210`). [Fakt] W2 soll die W1-Ratsche ablösen (`fixpaket-f45.md:118`). [Schlussfolgerung] Vier Zeilen kopieren ist einfacher als Kopplung an ein Gate, das wegfallen soll.

**11. Hinweis — Lint-Schwere trägt, mit klarer Zuordnung.**
[Fakt, entlastend] Gruppenwert `"error"` schaltet alle Regeln der Gruppe ein (`configuration_schema.json:2169-2196`); `preset` kennt `recommended|all|none` (`:7821-7825`). [Schlussfolgerung, entlastend] Die Ratsche zählt alle Schweren und meldet jeden neuen Befund (e) ⇒ „Regeln ohne Bestand“ ERZWUNGEN durch `check-ratsche`, bei warn/error zusätzlich durch `npm run lint`; gegenüber heute (2 Regeln) nur strenger. Im ARCHITECTURE-Satz „ERZWUNGEN durch check-ratsche“, nicht „error im Lint“. [offene Unsicherheit] Zahl der empfohlenen Regeln mit Standard-`info` nicht geprüft — unkritisch, die Ratsche fängt sie.

**12. Hinweis — ARCHITECTURE-Deckel: Streichen zulässig, aber mehr streichen.**
[Fakt, entlastend] Kein Gate liest den Kopfkommentar: Grep auf den Wortlaut trifft nur `ARCHITECTURE.md` und `vorlagen/projekt-skelett/ARCHITECTURE.md`; `check-f45-k-kontext.mjs:161` und `src/projektkarte/index.ts:166` entfernen HTML-Kommentare vor der Prüfung; `check-f45-b2a1-projektkarte.mjs:111` verlangt nur „beschrieben“; `check-skelett-herkunft.mjs:5-6,30` prüft nur die Skelett-Kopie; `check-docs` vergleicht den Kopf nicht; kein Treffer unter `harness-abgleich/`. [Schlussfolgerung] Z. 6-7 plus Leerzeile ≈ 140 Bytes — mit 19 freien Bytes reicht das nicht für ≈ 230 ⇒ E-RATSCHE-1 fast sicher fällig. **Besser:** das offene F-015 (`state/findings.md:74-80`) verlangt ausdrücklich, den Kopfkommentar zu entfernen: Z. 2-8 streichen (Marker `[FÜLLUNG — GANZE DATEI]` mit Erklärung und „Fülle sie erst …“), ≈ 350 Bytes; die Aufteilungsregel (Z. 9-18) bleibt, sie ist eine echte Regel. Damit keine Deckel-Entscheidung nötig. `harness-fix-7…md:122` („bleibt unverändert“) ist Historie, durch F-015 überholt. [Fakt] Die neue `docs/architektur/ratsche.md` darf keine Versionsnummer tragen ((v3), `check-f45-k-kontext.mjs:17,166`); Plan Z. 11 „Biome 2.5.9“ nicht übernehmen. [Fakt, entlastend] memory-map deckt die Datei über den Platzhalter-Eintrag ab (`state/memory-map.md:36`).

**13. Hinweis — Kette, Tests, Aufruf, Windows in Ordnung.**
[Fakt, entlastend] Keine GATES-Zählung festgeschrieben (`check-kette.test.mjs:82-96` nur Pflichteinträge; `messe-check.mjs:132-138` liest dynamisch; `pruefeListe` nur Dubletten und Existenz, `check-kette.mjs:237-251`). Parallele Gruppe passt (Gate liest nur). `node_modules/@biomejs/biome/bin/biome` und `node_modules/typescript/bin/tsc` existieren; Aufruf über `execFile(process.execPath, …)` ohne Shell. `.gitattributes:13` `* text=auto eol=lf` ⇒ Formatprüfung stabil gegen CRLF-Checkouts. `tsconfig.checkjs.json` liegt schon im Arbeitsbaum mit dem geplanten Inhalt, `noEmit` erbt es (`tsconfig.json:11`); Plan Z. 67 sagt „neu“ — beim Bau prüfen, ob Probe-Rest oder Endfassung. Glob als Dateiliste ist die einfachste Form.

**14. Hinweis — Bedienbarkeit und Grenzfälle.**
Den Befehl `npx biome format --write <datei>` in die Rotmeldung von (g3) und in die Befehlsübersicht, sonst ist jeder Erstlauf rot (auch in Workforce-Läufen auf dieses Repo). Umbenennen ist nach Plan Z. 134 praktisch gesperrt (neuer Schlüssel ⇒ (c) rot) — Ausweg nach dem Muster des Deckels nennen: „Anheben nur mit Entscheidung Stefans, bewusst einmal rot“ (`ARCHITECTURE.md:26-27`). checkJs: Die Fehlerzahl einer gelisteten Datei ändert sich auch durch Änderungen an importierten, nicht gelisteten `public/leitstand/*.js` ⇒ ein Paket wird rot, das die Datei nicht angefasst hat — DEKLARIEREN.

---

## Ist ein Schnitt des Paketes nötig?

**Nein.** Die vier Dimensionen teilen Erhebung, JSON, Referenz und Prüfregeln; ein Schnitt ergäbe vier fast gleiche Gates. Ohne Autofix (7) und (g4) (8) ist das Paket ein Baudurchgang mit eigenständig prüfbarem Ergebnis. Bleibt der Autofix, ihn eher streichen als schneiden.

## Was kann weg?

1. Autofix-Schritt (Befund 7).
2. (g4) (Befund 8).
3. `grenze_zeilen` in `scripts/ratsche.json` ⇒ Konstante im Gate (Befund 5).
4. Import von `zaehleZeilen` ⇒ vier Zeilen kopieren (Befund 10).
5. Optional `docs/architektur/ratsche.md`, wenn der Gate-Kopf die Einzelheiten trägt (spart Bytes im Kern; Vorbild `wachstumsbremse.md` spricht eher fürs Behalten).

## Urteil

- [ ] Freigegeben
- [ ] Freigegeben mit Hinweisen
- [x] Nicht freigegeben
- [ ] Blockiert

**Begründung:** Der Kern trägt (Lint-Schwere, Glob als checkJs-Liste, Mengensemantik, eigene Referenz-Funktion, Deckel-Weg). Vor dem Bau offen: (1) i18n-Wörterbücher — Entscheidung Challenger/Stefan, sonst wird jedes UI-Paket rot; (2) Ersterhebung darf die neuen Paketdateien nicht einfrieren (Konstruktionsfehler); (3)/(4) Ausgabegröße, Vollständigkeit, Fremdkategorien und Kopplung Code-Dateien ↔ Biome-Umfang festlegen; (5) `grenze_zeilen`-Schlupfloch, Konfigurations-Schlupflöcher deklarieren. Alles mit kleinen Planänderungen lösbar; Plan v2 mit diesen Punkten reicht als Delta-Prüfung.

## Nächster sinnvoller Schritt

Challenger/Stefan entscheiden Befund 1 (i18n ausnehmen oder bewusst einfrieren). Danach Plan v2 mit Befunden 2–6, Streichliste und F-015-Weg für den Deckel (Befund 12), dann Delta-Advisor-Pass.
