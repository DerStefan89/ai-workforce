# Harness-Abgleich ai-workforce — Seite Workforce (ohne Laufbelege)

Erzeugt 2026-10-11T21:06:38.354Z mit `node features/F45/nachweise/b1b2/abgleich-nachweis.mjs` (dieselbe Funktion wie das Feld `abgleich` von GET /api/harness).
Zuordnung: `harness-abgleich/standard.json` (SHA-256 9659f6542164…). Ohne Laufbelege gibt es kein „bestanden“.

**Harness: 5 wirksam · 4 ersetzt · 21 bewusst nicht · 0 offen**

Offen: keine

| Art | Eintrag | Status | Beleg / Ersatz / Begründung |
|---|---|---|---|
| dod | Komponenten/Module sind wiederverwendbar (dod-600f3001) | bewusst_nicht | Das Review bekommt die DoD erst mit B2a (Arbeitspaket mit DoD an Review/qa, F-829); bis dahin kein Ersatz, der die Kriterien kennt. |
| dod | Typisiert, kein `any` (oder Sprachäquivalent) (dod-a472b39f) | wirksam | Prüfschritt (Beleg im Lauf) · Belegt, soweit der Prüfbefehl des Projekts Typprüfung und Lint enthält — für ai-workforce npm run check mit tsc und Biome (noExplicitAny). Ein Projekt, dessen Prüfbefehl das nicht enthält, überschreibt den Eintrag in seiner Projektdatei (harnessZuordnungPfad). |
| dod | Fehlerzustände berücksichtigt (catch + Logging) (dod-44846f57) | bewusst_nicht | Das Review bekommt die DoD erst mit B2a (Arbeitspaket mit DoD an Review/qa, F-829); bis dahin kein Ersatz, der die Kriterien kennt. |
| dod | Leere Zustände berücksichtigt (dod-424cdb7c) | bewusst_nicht | Das Review bekommt die DoD erst mit B2a (Arbeitspaket mit DoD an Review/qa, F-829); bis dahin kein Ersatz, der die Kriterien kennt. |
| dod | [FÜLLUNG, nur UI] Lange Texte zerstören das Layout nicht (dod-be1977f5) | bewusst_nicht | UI-Prüfung im Lauf erst mit dem design-guardian-Schritt und dem Render-Nachweis im Lauf (B2b, B3, F-1031). |
| dod | [FÜLLUNG, nur UI] Mobile Darstellung berücksichtigt; jeder Container mit max-width hat auch width: 100% (dod-bef0bed6) | bewusst_nicht | UI-Prüfung im Lauf erst mit dem design-guardian-Schritt und dem Render-Nachweis im Lauf (B2b, B3, F-1031). |
| dod | [FÜLLUNG, nur UI] Design bleibt treu (Design-Tokens, keine neuen Farben/Schatten ohne Freigabe) (dod-6e75626d) | bewusst_nicht | UI-Prüfung im Lauf erst mit dem design-guardian-Schritt und dem Render-Nachweis im Lauf (B2b, B3, F-1031). |
| dod | Code ist sinnvoll kommentiert (Datei-Header + Funktionsdoku, siehe `docs/kommentar-standard.md`) (dod-f409dc65) | bewusst_nicht | Das Review bekommt die DoD erst mit B2a (Arbeitspaket mit DoD an Review/qa, F-829); bis dahin kein Ersatz, der die Kriterien kennt. |
| dod | `npm run check` → Exit 0 (dod-d5021306) | wirksam | Prüfschritt (Beleg im Lauf) · Der Kern führt den Prüfbefehl der Startvorlage nach jedem schreibenden Lauf selbst aus (F-652). |
| dod | Reviewer-/QA-Pass (Subagenten `code-reviewer` + `qa`, frischer Kontext) vor Freigabe/Commit durchlaufen — nicht optional, nicht retroactiv nachgeholt (F-046) (dod-04a521a7) | ersetzt_durch | Schritt code-reviewer · Review ist eigener Workflow-Schritt mit frischem Kontext; qa als Schritt erst mit B2b (F-1031). |
| dod | [FÜLLUNG, nur UI] UI-Workstreams liefern vor Übergabe an Stefan einen Render-Nachweis per `npm run render-nachweis` (Screenshots + Klicktabelle) — ein Reviewer-/QA-Pass allein findet keine real nur im Browser sichtbaren Fehler wie eine überschriebene `[hidden]`-Regel oder eine fehlende `classList`-Mutation (F-622) (dod-526c5ddb) | bewusst_nicht | Render-Nachweis im Lauf erst mit B2b/B3 (Beleg 5). |
| dod | KEINE Commits ohne explizite Freigabe (dod-86559c82) | wirksam | statischer Nachweis scripts/check-fixpaket-f35-reallauf.mjs · Commits durch die Workforce sind bewusst ausgeschlossen (Beleg 12): der schreibende Werkzeugsatz sperrt git (--disallowedTools Bash(git:*), Gate check-fixpaket-f35-reallauf (e) in npm run check); commit-guard sperrt im -p-Lauf zusätzlich destruktive Befehle (Hook-Nachweis B1b-2). Ein verweigerter Commit-Versuch im Lauf ist nicht eigens belegt. Stefan sichert. |
| hook | guard-settings — PreToolUse · Edit\|Write | wirksam | statischer Nachweis features/F45/nachweise/b1b2/zaehlung-hooks.json (Hash b4cd0f27989f…, Matcher Edit\|Write) · Realer -p-Lauf (B1b-2) mit --setting-sources project: Edit auf die settings.json verweigert, Datei byte-gleich; zuerst belegt in B1b-1 mit der Skelett-Fassung. |
| hook | commit-guard — PreToolUse · Bash\|PowerShell | wirksam | statischer Nachweis features/F45/nachweise/b1b2/zaehlung-hooks.json (Hash 13bc35a0eb59…, Matcher Bash\|PowerShell) · Realer -p-Lauf (B1b-2): rm -rf über Bash und Remove-Item -Recurse -Force über PowerShell verweigert, Ordner unverändert; zuerst belegt in B1b-1 (features/F45/nachweise/b1b1/nachweis.md). |
| hook | session-reminder — UserPromptSubmit | bewusst_nicht | UserPromptSubmit: stream-json meldet nur SessionStart-Hooks, die Wirkung im Lauf ist unbelegt; die Erinnerung alle 30 Nachrichten ist für interaktive Sitzungen gedacht (F-932). |
| hook | zwischenstand-laden — SessionStart · startup\|resume\|compact\|clear\|fork | bewusst_nicht | Feuert als SessionStart auch im -p-Lauf (hook_response outcome success, B1b-2), bleibt dort aber ohne Inhalt: kein Zwischenstand für den Branch wf/<Ablauf>. Rückwärts-Handoff ist Sache der interaktiven Sitzung (F-932). |
| hook | zwischenstand-pruefen — PreCompact · manual\|auto | bewusst_nicht | PreCompact feuert nur bei Kontextverdichtung, im -p-Lauf nicht beobachtet; der Zwischenstand ist Sache der interaktiven Sitzung (F-932). |
| agent | architecture-advisor | ersetzt_durch | Schritt architecture-advisor · Eigener Workflow-Schritt in der Vorlage hoch (workflow-vorlagen/hoch.json). |
| agent | code-reviewer | ersetzt_durch | Schritt code-reviewer · Eigener Workflow-Schritt (Vorlagen standard und hoch) statt Subagent im Lauf. |
| agent | design-guardian | bewusst_nicht | design-guardian-Schritt mit Render-Nachweis im Lauf erst mit B2b; Auslöser je Prüfschritt offen (F-1031). |
| agent | qa | bewusst_nicht | qa-Schritt in der Kette erst mit B2b; Auslöser je Prüfschritt offen (F-1031). |
| agent | scout | bewusst_nicht | Recherche-Rolle der Seite Workforce (F27), kein Schritt eines Bau-Ablaufs. |
| skill | advisor-pass | ersetzt_durch | Schritt architecture-advisor · Der Plan-Prüfpass ist der Advisor-Schritt der Vorlage hoch; Advisor-Schema und Plan v2 kommen mit B2b. |
| skill | git-flow | bewusst_nicht | Stefan sichert (Bereit zum Sichern, B2b); Commits durch die Workforce bewusst nicht (Beleg 12). |
| skill | handoff-vertrag | bewusst_nicht | Übergabeformat der Workforce ist das Arbeitspaket (B2a, F-938), nicht der Handoff-Vertrag. |
| skill | ponytail | bewusst_nicht | Projekt-Skills im Lauf erst mit WS F (F-815/F-816). |
| skill | repo-audit | bewusst_nicht | Sanierungsprüfung zwischen Zyklen, kein Schritt eines Ablaufs. |
| skill | spec-schreiben | bewusst_nicht | Die Spec entsteht vor dem Ablauf (Coach, Feature-Akte), nicht im Lauf. |
| skill | werkzeug-auswahl | bewusst_nicht | Werkzeugwahl trifft Stefan auf der Seite Workforce (F27, WS F). |
| command | lessons | bewusst_nicht | Lernschleife in der Workforce ist Teil 2 (Paket L, F-933). |
