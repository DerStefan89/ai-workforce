## Architecture-Advisor-Bericht — F25 WS-1 (Projektregister, Handler-Instanzen, cwd-Threading)

**Geprüft:** `state/plan-v1-f25-ws1-projektregister.md` gegen `features/F25/feature.md` (AK1-AK9), `ARCHITECTURE.md` und den realen Quelltext von `src/claude-code-gateway/{prozessstart,types,index}.ts`, `src/codex-gateway/{index,types}.ts`, `src/execution-controller/{types,index}.ts`, `scripts/leitstand-server.mjs`, `scripts/check-f15-instanzlock.mjs`, `scripts/check-f11-auftrag.mjs`, `scripts/check-datenformate.mjs`, `scripts/check-f19-ressourcen.mjs`, `src/router/index.ts`, `src/ressourcen/index.ts`, `schemas/ressourcen.schema.json`, `package.json`.

**Rollengrenze:** Diese Prüfung bewertet ausschließlich den Plan als Text vor dem Bau — keine Aussage über noch nicht existierenden Code. Nur Lesezugriff verwendet, keine Codeänderung, kein Bash/Git.

**Marker-Legende:** [Fakt] = am Quelltext verifiziert · [Fakt, entlastend] = am Quelltext verifiziert, spricht für den Plan · [Schlussfolgerung] = aus Fakten abgeleitet · [Annahme] = nicht am Code verifizierbar/plausibel, aber ungeprüft · [offene Unsicherheit] = weder be- noch widerlegt in der verfügbaren Zeit.

---

### Befunde, nach Schwere sortiert

**1. [HOCH] [Fakt] Der geplante D13-Rename bricht ein bestehendes, in `npm run check` eingebundenes Gate — vom Plan nicht erkannt, obwohl AK2 genau das ausschließt.**
`scripts/check-f11-auftrag.mjs:280-316` liest den REALEN Quelltext von `scripts/leitstand-server.mjs` (`readFileSync`) und sucht darin wörtlich `text.indexOf('if (laufAktiv)')` (Zeile 297) sowie `/laufAktiv\s*=\s*false/` (Zeile 312) — findet die Prüfung diese Literale nicht, gilt der D13-Vertrag als nicht erfüllt und das Gate schlägt fehl. Plan-Abschnitt 4 sieht vor, *alle* Vorkommen von `laufAktiv`/`laufAktivLaufId`/`laufAktivAbortController` in `leitstand-server.mjs` durch `globalerLaufZustand.aktiv`/`.laufId`/`.abortController` zu ersetzen. Damit verschwindet der Literal-String `if (laufAktiv)` vollständig aus dem Quelltext, und `check-f11-auftrag.mjs` bricht — ein Gate, das AK2 ausdrücklich schützt ("kein bestehendes F10-F24-Gate darf sich ändern müssen"), läuft nachweislich in `npm run check` (`package.json:20`).

**2. [HOCH] [Fakt] Die cwd-Threading-Kette (Abschnitt 2) ist unvollständig — der Codex-Worker-Pfad bekommt kein `cwd`.**
`src/execution-controller/index.ts` hat zwei Aufrufstellen für den Werkzeugstart: den Codex-Zweig (`starteCodexGateway`, Zeilen 338-345) und den Claude-Code-Zweig (`starteGateway`, Zeilen 347-367). `CodexGatewayOptionen` (`src/codex-gateway/types.ts:78-85`) kennt kein `cwd`-Feld, `starteCodexGateway`s `starteProzess`-Aufruf (`src/codex-gateway/index.ts:283-288`) reicht kein `cwd` durch — beide nutzen aber denselben `starteProzess`/`echterStarter`. Ein Registereintrag mit codex-basierten Workflow-Schritten würde weiterhin mit `process.cwd()` statt der projektspezifischen `repoWurzel` laufen, ohne Fehlermeldung.

**3. [MITTEL] [Fakt] Widersprüchlicher Validierungsweg für `projekte.json`.**
`scripts/check-datenformate.mjs` ist explizit "Feature-0"-Gate, kein generischer JSON-Schema-Validator (hartcodierte Beispiel-Liste für `profile.*`/`kontrollzustand.*`). `ressourcen.json` läuft stattdessen über ein eigenes Gate mit handgeschriebener `validiereRessourcenDaten`-Funktion (Muster F19). Plan-Abschnitt 1 behauptet fälschlich "Muster ressourcen.*.json" für `check-datenformate.mjs`, während Abschnitt 7 (richtig) vorsieht, dass `check-f25-projekte.mjs` selbst validiert — zwei sich widersprechende Vorschläge im selben Plan.

**4. [MITTEL] [Schlussfolgerung] Interner Widerspruch: Dispatcher "nicht exportiert" vs. "vom Gate direkt aufgerufen".**
Abschnitt 3 sagt im selben Absatz, der Dispatcher existiere "nur im CLI-Bindeblock, nicht als exportierte Funktion" UND `check-f25-projekte.mjs` rufe ihn "direkt" auf — ein Gate in einer separaten Datei kann das nur, wenn die Funktion exportiert ist (Muster aller bestehenden Gate-Skripte).

**5. [NIEDRIG] [Fakt] Abschnitt 4 unterschätzt den Umfang der `laufAktiv`-Fundstellen.**
Reale Fundstellen (Code, nicht Kommentare): mindestens 5 `if (laufAktiv)`-409-Blöcke, mindestens 3 Sperr-Setz-Blöcke, 2 Reset-Blöcke, plus einzelne Lesestellen — deutlich über 15 Stellen über >2300 Zeilen, nicht "ca. 4".

**6. [NIEDRIG] [Fakt] Zitierfehler in Abschnitt 0.** `STANDARD_AKTUELLE_AUTORISIERUNG_PFAD` steht real in `src/claude-code-gateway/index.ts:81`, nicht in `scripts/leitstand-server.mjs` (0 Treffer dort). Folgenlos für den weiteren Plantext, aber ein Fehler in einer als "real gelesen" deklarierten Sektion.

---

### Entlastende Befunde

- **[Fakt, entlastend]** Die als "offener Punkt" markierte Annahme zu `check-f15-instanzlock.mjs` Prüfung (d) **hält**: die Prüfung verlangt nur, dass jedes `belegeInstanzLock(`-Vorkommen textlich nach dem CLI-Bindeblock-Marker liegt — eine Schleife mit einem Aufruf-Vorkommen im Bindeblock besteht die Prüfung unverändert.
- **[Fakt, entlastend]** Alle bestehenden Gate-Skripte instanziieren ihren eigenen Server über `createServer(erzeugeRequestHandler(optionen))` direkt und unabhängig — keines geht über einen künftigen Dispatcher; der geplante Dispatcher kollidiert strukturell nicht mit bestehenden Tests.
- **[Fakt, entlastend]** Die D13-Default-Isolation ist im Plan korrekt beschrieben (drei closure-lokale `let`, `leitstand-server.mjs:2751-2755`).
- **[Fakt, entlastend]** Die cwd-Kette für den Claude-Code-Pfad selbst (Abschnitt 2, Schritte 1-4) ist vollständig und korrekt gegen den Ist-Zustand beschrieben.
- **[Fakt, entlastend]** Die zwei realen `repoWurzel`-Konsumenten (`waehleWorkflowVorlage`, `loeseRessourcenAuf`) sind exakt wie im Plan beschrieben.
- **[Fakt, entlastend]** Der geplante Envelope-Schema-Zuschnitt entspricht dem Muster in `schemas/ressourcen.schema.json` — nur der Validierungs-*Mechanismus* dahinter war falsch zugeordnet (Befund 3), die Schema-*Form* ist ein korrektes Vorbild.

---

## Status
- [ ] Freigegeben
- [ ] Freigegeben mit Hinweisen
- [x] **Nicht freigegeben**
- [ ] Blockiert

**Begründung:** Zwei Befunde mit hoher Schwere (1, 2) berühren die riskantesten Teile des Plans — den D13-Sicherheitsmechanismus und den Prozessstart-Pfad — und sind vor dem Bau zu lösen, aber ohne Grundsatzentscheidung lösbar (kein "Blockiert").

## Nächster sinnvoller Schritt
Plan v2 mit: (a) D13 additiv statt per Rename lösen (lokale `laufAktiv`-Literale bleiben unverändert stehen, ein zusätzlicher, echt geteilter `globalerLaufZustand` wird PARALLEL geprüft/gesetzt/zurückgesetzt — kein bestehendes Gate ändert sich); (b) `cwd` zusätzlich durch `CodexGatewayOptionen`/`starteCodexGateway` fädeln; (c) Validierungsmechanismus vereinheitlichen (eigene `validiereProjekteDaten`-Funktion, Muster F19, `check-datenformate.mjs` unangetastet); (d) Export-Widerspruch auflösen (Fabrikfunktionen exportieren).
