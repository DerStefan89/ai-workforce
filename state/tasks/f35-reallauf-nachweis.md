SCHRITT 0: Arbeitsverzeichnis ausgeben und gegen C:\Users\stefa\Projekte\ai-workforce prüfen. Bei Abweichung abbrechen.
Vorbedingung: Branch main; `git --no-pager diff --cached --stat` leer; `git --no-pager log -1 --oneline` zeigt den Merge von #265 (F-760) oder später. Sonst STOPPEN. Dann `git checkout -b docs/f35-reallauf-nachweis`.

## TASK: f35-reallauf-nachweis

GOAL: Der F35-Reallauf gegen haushaltsbuch2 ist im Repo nachgewiesen, ein neutraler Review-Pass über F35 liegt vor, F35 steht auf FEATURE_GATE (Abnahme durch Stefan folgt), die offenen Findings dieses Laufs stehen in state/findings.md.

CONTEXT: Fakten aus dem Reallauf, 28.09.2026; Kontrollzustand liegt in C:\Users\stefa\Projekte\haushaltsbuch2\kontrollzustand, lesend verwenden.
- Workflow router-8b138eac-36a8-4266-998f-ff79fd41a159, Auftrag 8b138eac… (haushaltsbuch2/F1, „Kategorien verwalten“, AK1–AK3).
- Z1 Routing: Kontrolltiefe hoch (Persistenz), Vorlage hoch (architekt → architecture-advisor → ausfuehrung → code-reviewer).
- Iteration 1 (Lauf 7873df97): nur Rückschreiben, kein Code → F-752/F-753/F-754, behoben in #264. Halt 1h(F-714)+1h(F-735)+1j gesammelt (F-718-Nachweis). Review BLOCKIERT, AK1–3 NICHT_ERFUELLT, ADJUST 1/3 durch den Kern (nicht gestartet).
- Iteration 2, Lauf 08c84cd7: Code gebaut, VERWEIGERT durch abgelehnte Probebefehle → Sackgasse → F-760, behoben in #265. Wiederholung Lauf 2f6509a1: Halt F-760+1j, Kern-Prüfung npm run check GRÜN (17 Tests), Review BLOCKIERT („nicht über die Anwendung bedienbar“), ADJUST 2/3.
- Iteration 3, Lauf 630e4282: HTTP-Server (127.0.0.1) + Oberfläche + ADR 0006, Kern-Prüfung GRÜN (25 Tests), Review 0b95e8c2 BEREIT_NACH_KORREKTUR, AK1–AK3 ERFUELLT, 2× MITTEL (UI-Fehleranzeige). Abnahme Stefan ANGENOMMEN 2026-09-28T14:03:05Z.
- haushaltsbuch2 Commits: 0c92af2 (Iteration 2), 6fc21d0 (Iteration 3).
- Harness-Einordnung: reine Doku, Advisor-Pass NEIN (keine Code-/Sicherheitsänderung); Prüfpass = der neutrale Review-Pass unten; Doku-Heimaten laut state/memory-map.md.

SCOPE:
1. features/F35/nachweis-reallauf.md (Muster features/F42/nachweis-ws3-reallauf.md): Prüfpunkte Z1–Z7 mit Beleg (Lauf-/Artefakt-IDs aus dem Kontrollzustand von haushaltsbuch2 selbst gelesen, nicht aus diesem Prompt abgeschrieben), Iterationen, Halte, gefundene und behobene Fehler (F-752, F-753, F-754, F-760), Dauer je Lauf aus den Checkpoints. Z7 als „offen, folgt nach Merge“.
2. Review-Pass: EIN Subagent code-reviewer in frischem Kontext, neutraler Auftrag ohne Bewertungsvorgabe (F-665), sinngemäß: „Prüfe features/F35/feature.md (AK und Workstreams) gegen den Code auf main und gegen features/F35/nachweis-reallauf.md. Welche AK sind durch Code, Gates und Reallauf belegt, welche nicht, welche nur teilweise? Nenne Lücken mit Fundstelle. Urteil nach .claude/skills/advisor-pass.“ Ergebnis wörtlich in features/F35/review-pass.md (Muster features/F42/review-pass.md). Nichts am Urteil glätten.
3. features/F35/feature.md: Status IN_ARBEIT → FEATURE_GATE; Abschnitt „Bekannte Grenzen“ um offene Punkte aus dem Review-Pass ergänzen (nur Verweise, keine Duplikate).
4. docs/STATUS.md: F35-Zeile aktualisieren (FEATURE_GATE, Reallauf-Nachweis).
5. state/findings.md, im bestehenden Format; vorher prüfen, ob die ID frei ist (sonst ESCALATE):
   - F-762 · TECH_DEBT · P2 · offen. Titel: Race in fuehreNachlaufAus (scripts/aufraeumen-nachlauf.mjs ~Z. 33–41): readdirSync listet Je-PID-Dateien paralleler Testprozesse, readFileSync scheitert mit ENOENT, wenn ein anderer Prozess seine Datei zwischenzeitlich löscht → sporadisch rotes CI (PR #265). Maßnahme: ENOENT je Datei tolerieren.
   - F-763 · BUG · P2 · offen. Titel: Abnahme-Knöpfe (Annehmen/Ablehnen/Anpassung) sind im Workflow-Detail aktiv, während die Ausführung LAEUFT. Maßnahme: vorher prüfen, ob der Server den Klick mit 409 ablehnt (dann P3, reiner Anzeigefehler); Knöpfe nur bei erlaubter Abnahme zeigen.
   - F-764 · HARNESS_IMPROVEMENT · P2 · offen. Titel: Der Allowlist-Satz in der Ausführungs-Instruktion verhindert Probebefehle nicht (real: verkettete cd/echo/sed/cat, node -v, git status/log, find); jeder Baulauf endet VERWEIGERT und braucht menschliche Sichtung. Maßnahme: harmlose Lesebefehle erlauben oder zusammengesetzte Befehle aus erlaubten Teilen gesondert behandeln; Advisor-Pass (Sicherheitsfläche).
   - F-765 · BUG · P2 · offen. Titel: Die Ausführung schreibt eine Kern-Entscheidung dem Menschen zu (haushaltsbuch2 ADR 0006: „menschliche Abnahme-Entscheidung“, tatsächlich automatische ADJUST durch den Kern, erzeuger kern) und setzt „Status: Entschieden“. Bezug F-757. Maßnahme: erzeuger (mensch/kern) der Entscheidungs-Eingaben im Auftragstext sichtbar machen; Instruktion: Kern-Entscheidungen nie als menschliche dokumentieren.
   - F-766 · TECH_DEBT · P2 · offen. Titel: Kontrollzustand von Fremdprojekten ist gitignored (haushaltsbuch2 .gitignore Zeile 1), ai-workforce trackt seinen (F-733). Reallauf-Evidenz im Projekt ist ungesichert. Maßnahme: Projekt-Skelett + zustand:sichern ausweiten oder bewusst lokal lassen (Entscheidung Stefan).
   - F-767 · PROCESS_IMPROVEMENT · P2 · offen. Titel: Coach-Akten formulieren AK ohne Zugangsweg („kann angelegt werden“); Review verlangte Bedienbarkeit über die Anwendung → zusätzliche ADJUST-Iteration. Maßnahme: AK-Vorlage nennt den Zugangsweg (Oberfläche/API/CLI).
   - F-768 · PROCESS_IMPROVEMENT · P2 · offen. Titel: Fortsetzung nach Sichtung erfordert vollständiges Workflow-JSON per Copy-Paste in der Reparaturfassung (4× im Reallauf). Bezug F-653. Maßnahme: Knopf „Sichtung bestätigt – weiter“ mit Pflichtbegründung als Entscheidungsartefakt; Design-Schnitt.
   Feature/Run jeweils: F35-Reallauf haushaltsbuch2, 28.09.2026.
6. state/tasks/f35-reallauf-nachweis.md: diesen Vertrag wörtlich (SCHRITT 0 bis ESCALATE). Vertrags-Gate grün.

NICHT:
- Kein Produktcode, keine Gates, nichts in haushaltsbuch2 schreiben, nichts unter kontrollzustand/.
- F35 nicht auf ABGESCHLOSSEN setzen (das ist Stefans Abnahme).
- Kein -A. Kein Commit, kein Push.

BUDGET: ein Durchgang plus höchstens eine Korrekturrunde. Modell Opus.

OUTPUT:
- npm run check Exit 0.
- Urteil des Review-Passes wörtlich im Bericht.
- Gezielt stagen; git --no-pager diff --cached --stat.
- Bericht knapp: Dateien · Checks · Review-Pass-Urteil · Abweichungen (u. a. vom Prompt abweichende Fakten aus dem Kontrollzustand) · Blocker · diff --cached --stat · Modell.

ESCALATE: anhalten und berichten, wenn eine Finding-ID vergeben ist, wenn der Kontrollzustand einer Aussage im CONTEXT widerspricht, oder wenn der Review-Pass eine AK von F35 als unbelegt einstuft, die für FEATURE_GATE zwingend ist.
