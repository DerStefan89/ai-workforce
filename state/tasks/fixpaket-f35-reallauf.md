SCHRITT 0: Arbeitsverzeichnis ausgeben und gegen C:\Users\stefa\Projekte\ai-workforce prüfen. Bei Abweichung: abbrechen, melden, nichts ändern.
Vorbedingung: `git branch --show-current` = main; `git --no-pager diff --cached --stat` leer; `git --no-pager log -1 --oneline` zeigt bf22c83 (Merge #263, Harness-Gedächtnis) oder später. Sonst STOPPEN und berichten.
Dann: `git checkout -b fix/f35-reallauf-fixpaket`.

## TASK: fixpaket-f35-reallauf

GOAL: Ein Feature-Bau im Pfad `hoch` (Architekt → Advisor → Ausführung → Review) erzeugt echten, geprüften Produktcode in einem Fremdprojekt. Der Architekt respektiert entschiedene ADRs, die Ausführung baut das Feature (nicht nur den Entwurf zurückschreiben), trägt eine Stack-Entscheidung in jedem Modus nach und darf Paket- und Prüfbefehle per Bash ausführen. Findings F-744 bis F-754 stehen im Repo. Dieser Vertrag liegt als state/tasks/fixpaket-f35-reallauf.md im Repo.

CONTEXT:
- Reallauf F35 gegen haushaltsbuch2 (28.09.2026), Workflow router-8b138eac-36a8-4266-998f-ff79fd41a159: Routing hoch ✓, gesammelte Halte 1h/1j ✓, Urteil je AK ✓, ADJUST durch den Kern ✓. Inhaltlich: Die Ausführung (Lauf 7873df97) schrieb nur ADR 0004, ein Schema, scripts/check-schemas.mjs und Akte-Abschnitte, KEINEN Produktcode. Eigene Begründung des Laufs: „Deliberately out of scope … per the task's explicit 4-bullet translation instructions … writing the actual TypeScript/SQLite implementation“ und „no shell execution capability“. Review (codex) daraufhin BLOCKIERT, AK1–AK3 NICHT_ERFUELLT; der Kern hat Iteration 1/3 angelegt. Der Workflow wartet jetzt auf die Freigabe von Iteration 2. Der Auftragstext der Ausführung wird beim Start gebaut, diese Iteration soll nach diesem Fix mit der neuen Instruktion laufen.
- Ursachen im Code:
  1. F-752: src/architekt/index.ts baueUmsetzungsInstruktion('feature') hängt nur vier Rückschreib-Bullets an („Setze ihn wie folgt um: ADR / Schema / Akte-Abschnitte / Entscheidung Mensch“). Dass danach das Feature zu bauen ist, steht nirgends.
  2. F-753: scripts/leitstand-server.mjs ~Z. 4364 hängt baueStackEntscheidungsInstruktion NUR bei modus === 'projekt' an; die 1h-Prüfung (stackNichtGefuellt, stackPruefkettenPfadeFehlen, ~Z. 4793ff.) läuft modusunabhängig. Im Feature-Modus verlangt der Halt etwas, das nie beauftragt wurde.
  3. F-750: Der Architekt (codex) bekommt nur Auftragstext + Profil. istStackOffen (src/architekt/index.ts:407) prüft nur den [FÜLLUNG]-Marker in CLAUDE.md; haushaltsbuch2 hat ADR 0003 „Entschieden: TypeScript/Node.js/SQLite“, aber CLAUDE.md-Stack noch [FÜLLUNG]. STACK_OFFEN_HINWEIS erzwang daher eine Stack-Frage, und der Architekt empfahl Browser-Speicher, also genau die in ADR 0003 verworfene Option. Der Advisor (claude-code) las docs/adr/ ebenfalls nicht.
  4. F-754: Werkzeugsatz 'schreibend' in startvorlagen/ai-workforce.json = Read, Grep, Glob, Write, Edit, ohne Bash. Die Ausführung kann weder `npm install` noch Typecheck/Tests laufen lassen. Neue Projekte erben die werkzeugsaetze aus ai-workforce.json (src/projekt-anlegen/index.ts ~Z. 258).
- Entscheidung E-F754 = A (Stefan, 28.09.2026): Die Ausführung bekommt Bash nur über eine feste Allowlist von Paket- und Prüfbefehlen; git und alles andere bleiben verboten. ZWINGEND-Freigabe vor jedem schreibenden Lauf bleibt.
- ARCHITECTURE.md §7 verbietet Bash nicht ausdrücklich; die Kommentare in src/pruefschritt/index.ts (~Z. 6) und src/startvorlage/types.ts (~Z. 44) behaupten „kein Werkzeugsatz trägt Bash“. Sie sind nach dem Fix falsch.
- Laufakte.arbeitsverzeichnis_pfad ist bewusst process.cwd() des Servers (claude-code-gateway/index.ts ~Z. 183, AK7); der Kindprozess bekommt optionen.cwd. Mit Bash MUSS der Kindprozess eines 'ausfuehrung'-Laufs im Projekt-Repo (repoWurzel des aktiven Projekts) laufen, nicht in ai-workforce.
- Harness-Einordnung:
  - Ebene: Produktcode + Startvorlagen-Konfiguration + neuer Gate-Block (Ebene 3).
  - Advisor-Pass: JA (Subagent architecture-advisor, vor dem Bau auf den Plan zu Punkt 4/5), weil F-754 die Sicherheitsfläche der Ausführung erweitert.
  - Prüfpass: Subagents code-reviewer UND qa in frischem Kontext auf den Diff.
  - Doku-Heimaten laut state/memory-map.md: Entscheidung → docs/adr/, Gate → state/gates.md, Findings → state/findings.md, Startvorlagen-Felder → ARCHITECTURE.md §1.
  - Kein Harness-Changelog-Eintrag: produktseitige Änderung, keine Harness-Regel.
- Pflichtlektüre: ARCHITECTURE.md, state/memory-map.md, src/architekt/index.ts, src/architecture-advisor/index.ts, scripts/leitstand-server.mjs (Schrittstart ~Z. 4300–4380, Nachlauf ~Z. 4600–4830), startvorlagen/ai-workforce.json, src/startvorlage/index.ts.

SCOPE:
1. Architektur-Plan zu Punkt 4/5 (Bash-Allowlist, cwd) als kurze Skizze an den Subagent architecture-advisor geben; dessen Urteil vor dem Bau einholen und in den Bericht übernehmen. Bei BLOCKIERT: ESCALATE.
2. F-752, src/architekt/index.ts baueUmsetzungsInstruktion('feature'): Neu formulieren, sodass klar ist:
   a. Der Auftrag ist der BAU des Features laut Auftragstext; alle Akzeptanzkriterien müssen durch lauffähigen Code erfüllt und durch Tests belegt sein.
   b. Die vier Rückschreib-Punkte bleiben als ERSTER Teil (unverändert im Inhalt).
   c. Danach: Feature implementieren; Tests je AK anlegen; `npm run check` (bzw. den pruefbefehl des Projekts) selbst ausführen, bis grün, soweit die Werkzeuge vorhanden sind.
   d. Sind lint/typecheck/test im Projekt noch Platzhalter: Werkzeuge nach dem Projekt-Skill .claude/skills/werkzeug-auswahl wählen (falls vorhanden) und eintragen. Verlangt der Skill eine menschliche Wahl: als Rückfrage stellen statt raten.
   e. ARCHITECTURE.md: Abschnitte, die dieser Bau erstmals festlegt (Ordnerstruktur, Datenzugriff/Transaktionsgrenzen, Fehlerbehandlung/Logging, Tests), befüllen und deren [FÜLLUNG]-Marker entfernen.
   f. Satz: „Das Zurückschreiben des Entwurfs allein erfüllt den Auftrag NICHT.“
   Modus 'projekt' bleibt bitgenau unverändert.
3. F-753, scripts/leitstand-server.mjs: Die Bedingung `modus === 'projekt'` um das Anhängen von baueStackEntscheidungsInstruktion entfernen. Die übrigen Vorbedingungen (Stack-Entscheidung im referenzierten Architekt-Lauf UND erfasste menschliche Antwort) bleiben, damit Instruktion und 1h-Prüfung exakt dieselbe Vorbedingung haben. Kommentar anpassen.
4. F-750, Projektentscheidungen für Architekt und Advisor:
   a. Neue reine Funktion in src/architekt/index.ts (Name frei, z. B. leseEntschiedeneAdrs(repoWurzel)): liest docs/adr/*.md außer TEMPLATE.md; berücksichtigt nur Dateien mit einer Zeile „Status: Entschieden“ (Groß-/Kleinschreibung tolerant); liefert je ADR Titelzeile + Abschnitt „## Entscheidung“ (gekürzt auf max. 1500 Zeichen je ADR, Kürzung sichtbar markieren). Fehlt der Ordner: leerer Text, kein Wurf.
   b. baueArchitektAuftragstext und baueArchitectureAdvisorAuftragstext bekommen diesen Block (nur wenn nicht leer) unter der Überschrift „Bereits entschiedene Projektentscheidungen (bindend)“ plus die Regel: „Entschiedene ADRs nicht neu verhandeln. Widerspricht der Auftrag einem ADR, das als eigene Entscheidung (kategorie 'sonstig') mit Verweis auf das ADR vorlegen.“
   c. Zusätzlich im Architekt-Text, wenn stackOffen UND ein entschiedenes ADR vorliegt: „Legt ein entschiedenes ADR den Stack bereits fest, nenne genau diese Wahl als 'empfehlung' deiner Stack-Entscheidung und begründe mit dem ADR.“ (Der Validator verlangt bei offenem Stack weiterhin die Stack-Entscheidung; das bleibt.)
   d. Aufrufer in leitstand-server.mjs: repoWurzel des PROJEKTS übergeben (Muster istStackOffen(repoWurzel)), nicht installWurzel.
5. F-754, Bash-Allowlist:
   a. startvorlagen/ai-workforce.json, werkzeugsaetze.schreibend.erlaubte_werkzeuge ergänzen um genau: "Bash(npm install:*)", "Bash(npm ci:*)", "Bash(npm run check:*)", "Bash(npm run lint:*)", "Bash(npm run typecheck:*)", "Bash(npm run test:*)", "Bash(npm run build:*)", "Bash(npx tsc:*)". Kein allgemeines `npm run *` (z. B. zustand:sichern führt git aus).
   b. src/startvorlage/index.ts Validator: 'erlaubte_werkzeuge' darf kein nacktes "Bash", kein "Bash(*)" / "Bash(:*)" und keinen Eintrag enthalten, dessen Bash-Präfix mit "git" beginnt. Verstoß = Validierungsfehler (fail-closed).
   c. Prüfen und im Bericht belegen: Der Kindprozess eines 'ausfuehrung'-Laufs startet mit cwd = repoWurzel des aktiven Projekts (Aufrufkette im Server bis optionen.cwd). Ist das nicht so: ESCALATE, nichts umbauen.
   d. Kommentare in src/pruefschritt/index.ts und src/startvorlage/types.ts korrigieren (Ausführung trägt Bash-Allowlist seit E-F754; der Kern-Prüfschritt bleibt unverändert der verbindliche Nachweis).
   e. docs/adr/ausfuehrung-bash-allowlist.md nach docs/adr/TEMPLATE.md: Entscheidung E-F754 = A (Stefan, 28.09.2026), Alternativen (B: Installation als eigener Kern-Schritt), Konsequenzen (postinstall-Skripte laufen; begrenzt durch ZWINGEND-Freigabe, Allowlist, Validator, commit-guard; der Kern-Prüfschritt bleibt maßgeblich).
   f. ARCHITECTURE.md §1, Eintrag startvorlagen/: einen Satz ergänzen: „Der Werkzeugsatz 'schreibend' trägt eine Bash-Allowlist für Paket- und Prüfbefehle (E-F754, docs/adr/ausfuehrung-bash-allowlist.md); nacktes Bash und git-Befehle weist der Validator ab.“
6. Neues Gate scripts/check-fixpaket-f35-reallauf.mjs, in package.json `check` vor `npm run test` einhängen. Fälle (Rot und Grün jeweils real laufen lassen, Muster check-fixpaket-f30-vorbedingungen.mjs):
   (a) Feature-Instruktion enthält Baupflicht und den Satz aus 2f; Projekt-Instruktion bitgenau wie vorher (Vergleich gegen festen Erwartungstext).
   (b) Realer Aufrufpfad (Regel e, F-708): Auftragstext eines 'ausfuehrung'-Schritts im Feature-Modus mit erfasster Stack-Entscheidung enthält die Stack-Instruktion; ohne Stack-Entscheidung nicht.
   (c) Architekt-Auftragstext: mit einem Test-ADR „Status: Entschieden“ enthält er den Block; mit „Status: Vorgeschlagen“ oder nur TEMPLATE.md nicht; ohne docs/adr kein Wurf.
   (d) Advisor-Auftragstext analog (c), Grünfall genügt plus ein Rotfall.
   (e) Validator: "Bash" nackt → Fehler; "Bash(git status:*)" → Fehler; "Bash(*)" → Fehler; die Allowlist aus 5a → gültig; startvorlagen/ai-workforce.json validiert.
   (f) cwd: Falls mit vertretbarem Aufwand testbar, belegen, dass der 'ausfuehrung'-Start optionen.cwd = Projekt-repoWurzel setzt; sonst im Bericht als [offene Unsicherheit] mit Fundstelle.
   Bestehende Gates, die den alten Feature-Text bitgenau prüfen, gezielt anpassen und im Bericht nennen.
7. state/gates.md: neue Tabellenzeile für das Gate (Gate | Datei | Prüft | Rot-Fall | Grün-Fall), Durchsetzungsgrad nur ERZWUNGEN, wenn Rot und Grün real laufen; Kalibrierungs-Log ergänzen.
8. state/findings.md, im bestehenden Format (**F-7xx** · `TYP` · P · Status; Titel, Beschreibung, Fundstelle, Auswirkung, Maßnahme, Status, Feature/Run):
   - F-744 · BUG · P2 · offen. Titel: Ein gescheiterter Worker-Lauf zeigt im Leitstand nur „kein Ergebnistext im Rohstrom“, nicht die Ursache (z. B. 401, Verbindungsabbruch). Maßnahme: bei exit ≠ 0 ohne Ergebnis die letzte type:"error"-Meldung (codex-stdout) bzw. stderr anzeigen, API-Schlüssel maskiert; nur Anzeige, keine Klassifikation aus Konsolentext (ARCHITECTURE.md §4/§7). Feature/Run: F35-Reallauf Z1, 26.09.2026.
   - F-745 · BUG · P3 · offen. Titel: Die Workflow-Ansicht öffnet entscheidung-router-*-Artefakte als ungültigen Workflow, mit aktiven Knöpfen. Feature/Run: F35-Reallauf, 26.09.2026.
   - F-746 · TECH_DEBT · P2 · offen. Titel: Reviewer (standard/hoch) und Architekt (hoch) hängen allein am Worker codex, ohne erklärten Fallback. Maßnahme: im Design-Schnitt bzw. F30 bewerten; kein stiller Fallback (ARCHITECTURE.md §4). Feature/Run: F35-Reallauf, 26.09.2026 (Codex-Störung).
   - F-747 · HARNESS_IMPROVEMENT · P3 · offen. Titel: codex-CLI schreibt „failed to refresh available models: request timed out“ auf stderr, läuft aber weiter. Maßnahme: beobachten, ob der Leitstand das als Ursache anzeigt (Bezug F-744).
   - F-748 · BUG · P2 · offen. Titel: Router-`rueckfragen` werden außer der Validierung (src/router/index.ts ~Z. 125) nirgends verwendet: nicht angezeigt, nicht an Folgeschritte übergeben, kein Halt. Maßnahme: anzeigen und Antwort als Auftragsergänzung übernehmen oder halten.
   - F-749 · BUG · P3 · offen. Titel: Laufakte deklariert `codex-cli 0.153.4` statisch; installiert war 0.157.0. Maßnahme: Version beim Start lesen.
   - F-750 · BUG · P1 · behoben (dieser PR). Titel: Architekt und Advisor kannten entschiedene ADRs nicht; istStackOffen sieht nur den CLAUDE.md-Marker; Stack-Frage gegen ADR 0003 neu eröffnet. Restgrenze: istStackOffen bleibt marker-basiert (siehe 4c).
   - F-751 · TECH_DEBT · P2 · offen. Titel: Urteil des architecture-advisor (real BEREIT_NACH_KORREKTUR) ist nicht maschinenlesbar und hält den Workflow nie. Maßnahme: schematisieren oder im Freigabe-Block der Ausführung anzeigen; Kopplung an F36-Backlog „Rolle mit Output-Schema und Urteil“.
   - F-752 · BUG · P1 · behoben (dieser PR). Titel: Feature-Modus-Umsetzungsinstruktion beschränkte die Ausführung auf das Zurückschreiben des Entwurfs; kein Produktcode.
   - F-753 · BUG · P1 · behoben (dieser PR). Titel: 1h im Feature-Modus geprüft, Stack-Instruktion nur im Projektmodus angehängt.
   - F-754 · BUG · P1 · behoben (dieser PR). Titel: Werkzeugsatz 'schreibend' ohne Bash; ein echter Bau mit Abhängigkeiten war unmöglich. Entscheidung E-F754 = A.
   Alle Feature/Run ohne Angabe: F35-Reallauf haushaltsbuch2, 28.09.2026. Ist eine ID bereits vergeben: ESCALATE.
9. state/tasks/fixpaket-f35-reallauf.md: diesen Vertrag wörtlich ablegen (von „SCHRITT 0“ bis „ESCALATE“ einschließlich). Vertrags-Gate grün.

NICHT:
- Keine Änderung an Regeln 1e–1j selbst, an der ADJUST-Automatik oder an Workflow-Vorlagen.
- Kein allgemeines Bash, kein git über Bash, keine Änderung an .claude/settings.json oder den Hooks.
- Keine Änderung an istStackOffen oder dem Stack-Validator (nur Instruktionstext, 4c).
- Nichts in haushaltsbuch2 oder anderen Projekt-Repos ändern (deren Startvorlage trägt der Mensch nach).
- Nichts unter kontrollzustand/. Kein -A. Kein Commit, kein Push.
- F-744–F-749, F-751 nur erfassen, nicht beheben.

BUDGET: ein Baudurchgang plus höchstens eine Korrekturrunde. Modell Opus.

OUTPUT:
- `npm run check` Exit 0.
- Rot/Grün des neuen Gates real gelaufen, im Kalibrierungs-Log.
- Advisor-Urteil (Punkt 1), code-reviewer- und qa-Urteil (frischer Kontext) im Bericht.
- Beleg zu 5c (cwd) mit Fundstellen.
- Gezielt stagen, `git --no-pager diff --cached --stat` in den Bericht.
- Bericht knapp: Dateien · Checks mit Ergebnis · Kalibrierung · Urteile Advisor/code-reviewer/qa · Beleg cwd · angepasste Alt-Gates · Abweichungen · Blocker · diff --cached --stat · Modell.

ESCALATE: Anhalten und berichten statt selbst entscheiden, wenn:
- der Kindprozess der Ausführung NICHT im Projekt-Repo startet (5c);
- der architecture-advisor den Plan zu Punkt 4/5 als BLOCKIERT bewertet;
- eine Finding-ID F-744–F-754 bereits vergeben ist;
- ein bestehendes Gate nur durch Aufweichen einer Sicherheitsprüfung grün würde;
- Claude Code das Muster "Bash(<präfix>:*)" in --allowedTools nachweislich nicht als Präfix-Allowlist behandelt (dann keine breitere Freigabe als Ausweg).
