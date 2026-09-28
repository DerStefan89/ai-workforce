SCHRITT 0: Arbeitsverzeichnis ausgeben und gegen C:\Users\stefa\Projekte\ai-workforce prüfen. Bei Abweichung abbrechen.
Vorbedingung: Branch main; `git --no-pager diff --cached --stat` leer; `git --no-pager log -1 --oneline` zeigt den Merge von #264 (F35-Reallauf-Fixpaket) oder später. Sonst STOPPEN. Dann `git checkout -b fix/f760-verweigert-bau`.

## TASK: fix-f760-verweigert-bau

GOAL: Ein Ausführungslauf, dessen einzige Auffälligkeit abgelehnte Probebefehle sind, führt nicht mehr in eine Sackgasse. Die Ausführung kennt ihre erlaubten Shell-Befehle abschließend. Die Kette bis zum Review bleibt durch menschliche Sichtung erreichbar. Die Klassifikation VERWEIGERT selbst bleibt unverändert.

CONTEXT:
- Reallauf F35, Iteration 2 (haushaltsbuch2, Lauf 08c84cd7, 28.09.2026): Die Ausführung hat F1 vollständig gebaut (Code, 19 Tests, eigener `npm run check` grün), endete aber VERWEIGERT. permission_denials: `git status`/`git log` (3×), `node -e …` (2×), `node_modules/.bin/biome check --write .`, `npm run lint:fix`. Alle korrekt abgelehnt (Allowlist E-F754, Sperre Bash(git:*)).
- src/result-evaluator/index.ts ~Z. 281–293: jede Verweigerung ⇒ VERWEIGERT (F7-Invariante, bleibt). Für VERWEIGERT legt scripts/leitstand-server.mjs weder Änderungsübersicht noch Prüfergebnis an. Der Review-Schritt (Eingaben aenderungsuebersicht-@/pruefergebnis-@) ist damit unerreichbar.
- Muster für menschliche Sichtung: Regel 1j (Halt mit Grund, Fortsetzung per Reparaturfassung, cursor auf den Folgeschritt).
- Harness-Einordnung: Produktcode + Instruktionstext; Advisor-Pass NEIN (keine neue Sicherheitsfläche, Klassifikation unverändert, fail-closed bleibt: Halt statt Fortschritt); Prüfpass code-reviewer + qa in frischem Kontext; Doku-Heimaten state/gates.md, state/findings.md.

SCOPE:
1. src/architekt/index.ts, baueUmsetzungsInstruktion('feature'), Teil 2: eine Zeile ergänzen, sinngemäß: „Shell: Du darfst ausschließlich diese Befehle ausführen: npm install, npm ci, npm run check|lint|typecheck|test|build (jeweils ohne weitere Skripte). Keine git-Befehle, kein `node -e`, keine direkten Aufrufe aus node_modules/.bin, keine weiteren npm-Skripte. Jeder andere Befehl wird abgelehnt und macht den Lauf zu VERWEIGERT. Commits macht der Mensch.“ Die Befehlsliste aus ERLAUBTE_BASH_REGELN (src/startvorlage/index.ts) ableiten, nicht doppelt pflegen. Nur anhängen, wenn der Werkzeugsatz des Schritts Bash-Regeln trägt; sonst unverändert.
2. scripts/leitstand-server.mjs: Endet ein 'ausfuehrung'-Lauf mit VERWEIGERT UND bypass_verdacht_anzahl === 0, Änderungsübersicht und Prüfschritt genauso registrieren wie bei ERFOLGREICH. Den Workflow mit KLAERUNG_ERFORDERLICH halten, Grund: „Lauf endete VERWEIGERT (ohne Bypass-Verdacht). Abgelehnte Befehle: <Liste, gekürzt> — menschliche Sichtung vor Fortsetzung (F-760)“. Die Nachlauf-Regeln 1g/1h/1j für diesen Fall mit auswerten und im selben Grund sammeln (Muster F-718). Bei bypass_verdacht_anzahl > 0: Verhalten unverändert (kein Registrieren, Halt wie bisher).
3. Die Fortsetzung zum Review per Reparaturfassung (cursor = Folgeschritt, Schritt behält status VERWEIGERT und lauf_id) muss funktionieren. Die Eingabeauflösung `aenderungsuebersicht-@`/`pruefergebnis-@` muss den VERWEIGERT-Lauf akzeptieren, wenn die Artefakte existieren. Falls dafür eine Regel geändert werden muss, die heute nur ERFOLGREICH-Vorgänger zulässt: minimal, nur für diesen Fall, und im Bericht nennen.
4. Gate: scripts/check-fixpaket-f35-reallauf.mjs um Fälle erweitern (Rot/Grün real):
   (g) Instruktion enthält die Befehlsliste, abgeleitet aus ERLAUBTE_BASH_REGELN.
   (h) VERWEIGERT ohne Bypass-Verdacht: Artefakte registriert, Halt mit Grund inkl. Befehlsliste.
   (i) VERWEIGERT mit Bypass-Verdacht: keine Artefakte, Verhalten wie vorher.
   (j) Reparaturfassung mit cursor auf dem Review löst die Eingaben des VERWEIGERT-Vorgängers auf.
   state/gates.md: Zeile und Kalibrierungs-Log ergänzen.
5. state/findings.md im bestehenden Format:
   - F-760 · BUG · P1 · behoben (dieser PR). Titel: Mit Bash-Allowlist endete ein vollständiger Baulauf wegen abgelehnter Probebefehle als VERWEIGERT ohne Änderungsübersicht und Prüfergebnis; die Kette zum Review riss ab.
   - F-761 · PROCESS_IMPROVEMENT · P3 · offen. Titel: Die Projekt-CLAUDE.md-Vorlage lässt die Ausführung „Status: Blockiert“ ausgeben, obwohl nur der Commit durch den Menschen aussteht.
   - F-759 · BUG · P3 · offen. Titel: Ein direkter Link #/workflows/<id> sucht im gerade aktiven Projekt und endet sonst in 404, ohne das Projekt zu nennen (public/leitstand/projekt-kontext.js). Maßnahme: Projekt in die Route oder Hinweis im 404; Design-Schnitt.
   Ist eine ID vergeben: ESCALATE.
6. state/tasks/fix-f760-verweigert-bau.md: diesen Vertrag wörtlich ablegen (SCHRITT 0 bis ESCALATE). Vertrags-Gate grün.

NICHT:
- Keine Änderung an result-evaluator/Klassifikation, an ERLAUBTE_BASH_REGELN, an der Startvorlage oder an Regeln 1e–1j.
- Kein automatischer Fortschritt nach VERWEIGERT; immer Halt zur menschlichen Sichtung.
- Nichts in haushaltsbuch2, nichts unter kontrollzustand/. Kein -A. Kein Commit, kein Push.

BUDGET: ein Baudurchgang plus höchstens eine Korrekturrunde. Modell Opus.

OUTPUT:
- `npm run check` Exit 0; Rot/Grün der neuen Fälle real gelaufen und im Kalibrierungs-Log.
- Urteile code-reviewer und qa.
- Gezielt stagen; `git --no-pager diff --cached --stat`.
- Bericht knapp: Dateien · Checks · Kalibrierung · Urteile · Abweichungen · Blocker · diff --cached --stat · Modell.

ESCALATE: Anhalten und berichten, wenn:
- Punkt 2 oder 3 nur durch Aufweichen der Klassifikation oder eines fail-closed-Pfads lösbar wäre;
- die Eingabeauflösung für VERWEIGERT-Vorgänger eine Regel berührt, die auch andere Rollen betrifft;
- eine Finding-ID vergeben ist.
