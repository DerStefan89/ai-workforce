# Aktuelle Übergabe
Wird am Ende jeder Challenger-Runde vollständig überschrieben. Historie: Git-Log dieser Datei.
Stand: 29.09.2026.

## Stand
F36 "Capability Library wirksam machen" IN_ARBEIT. Gemergt: WS-0, WS-1, WS-4, WS-1b, WS-2 (#271, MCP-Weg), Spike S7 (#272), Gedächtnislücken (#273), Datennachtrag (#274), WS-3 Empfehlung (#275), WS-5a MCP-Installation (#276), F-813 CSRF zentral (#277).

WS-5b ist gebaut, nicht gemergt. Worktree `aiw-f36-ws5b`, Branch `feat/f36-ws5b-skill-installation`, Basis `0c5c1f9`. Challenger-Zuschnitt 29.09.2026: nur Ort-B-Skills; Agents, Projekt-Skills und eingebaute Skills bleiben gesperrt; kein enabledPlugins.

- **Katalog:**
  - `installation_vorlage {skill_pfad}` und `installation {pfad, version = Commit-SHA, inhalt_hash}` für extern skill.
  - `frontend-design` trägt `skill_pfad` `skills/frontend-design`, geprüft an der realen Plugin-Struktur. Er bleibt OFFEN, ohne installation.
  - Ohne Vorlage nicht installierbar, mit Grund in der Empfehlung (z. B. `browser-use`).
- **Installation** (gleiche Routen wie WS-5a):
  - `git ls-remote` → SHA; nur der exakte Ref-Name zählt, weil `ls-remote … main` real auch `…/main` meldet.
  - Flacher Fetch genau dieser SHA; `ls-tree` bricht bei Symlink/Submodul ab.
  - Checkout nur des Skill-Pfads, ohne System-/Nutzerkonfiguration, mit leerem hooksPath.
  - Kopie nach `~/.ai-workforce/cap/<id>/.claude/skills/<name>/`.
  - Prüfung: SKILL.md name + description, Namensregel, keine Kollision mit eingebauten oder Ort-B-Skills. Erst dann installation + FREIGEGEBEN.
  - SHA nach der Anzeige geändert → 409. Extern-Agents → 400 „erst später“.
- **Empfehlung:** Installierte Skills stehen in „Wird genutzt“ (id@hash), sobald inhalt_hash stimmt.
- **Start:** Nur mit ≥1 Ort-B-Skill ändert sich etwas, sonst bitgenau wie vorher.
  - `--tools …,Skill` ohne Agent; je Skill `--add-dir` und eine Write/Edit-Sperre (C:/-Form).
  - Sperren `Write/Edit(**/.claude/**)`, `Skill(design|doctor|<Projekt-Skill>|<Projekt-Command>)`; `--settings` mit disableBundledSkills und skillOverrides.
  - Vorher: inhalt_hash neu, Namenskollision auch mit Projekt-Skills, Ort-B-Layout, Vorstart-Scan (verschachteltes `.claude/skills|agents|commands`, mit node_modules).
- **Init-Gate:** Skills ⊆ Ort-B, kein Agent, MCPs = übergebene; sonst Abbruch vor dem ersten tool_use (`init_gate_verstoss`).
- **Laufdiff:** Änderung unter `.claude/` → rot (`claude_ordner_veraendert`).
- **Gate:** `scripts/check-f36-ws5b-skill.mjs` (a)–(o), kalibriert.
- **Echte Nachweise** in `features/F36/nachweis-ws5b/`:
  - Installation frontend-design, SHA `fbe07fb6…`; danach ressourcen.json bitgleich zurückgesetzt.
  - CLI-Lauf mit zwei Ort-B-Skills: nur diese aufrufbar, Agent nicht in tools.
  - Rotfall 4a: Selbstanlage per Write und per Bash verweigert, keine Eskalation.
- **Render-Nachweis:** `features/F36/nachweis-ws5b-ui/`.
- **Findings:** F-786 erledigt (mcp + skill). Vermerke an F-770/F-791. Neu: F-815 (Agents/Projekt-Skills zurückgestellt), F-816 (Identität Projekt-Skills), F-817 (wirkung bei Skills), F-818 (Vorstart-Scan vs. Skelett in ai-workforce), F-819 (Laufzeit npm run check), F-820 (qa-Schritt). Vermerke an F-725 (Scope-Ergänzung) und F-791 (GetTask).
- **Außerhalb der eigenen Dateien angepasst:** `scripts/check-f36-ws3-empfehlung.mjs` (d). Der Grund „erst ab WS-5“ entfällt laut Zuschnitt für Skills; der Fall prüft jetzt den neuen Grund „nicht installierbar: installation_vorlage“.
- **Korrekturrunde nach Reviewer (nicht freigegeben) und QA (mit Hinweisen):**
  - H1: Projekt-Commands real per Skill aufrufbar (fail-open) → jetzt gesperrt, real nachgemessen (9b′, dazu 13 eingebaute bzw. UI-Namen verweigert).
  - git ohne GIT_*-Umgebung und ohne Nutzerkonfiguration, auch bei ls-remote; SHA-Refs abgelehnt (Fork-Netz).
  - installation.pfad an <cap>/<id> gebunden; unsichere cap-Pfade abgelehnt; .claude/CLAUDE.md im Skill-Ordner abgelehnt.
  - „keine init-Zeile“ nur bei regulärem Ende; Umgehungsverdacht bei claude_ordner_veraendert in daten.
  - Gate: Skill+MCP-Kombination, weitere Init-Gate-Zweige; 9c mit Grünseite; 9d Init-Gate gegen die echte CLI (Abbruch nach 1,7 s, 0 tool_use); Kalibrierungsprotokoll in der Nachweis-README.
  - Zweiter Reviewer-/QA-Pass: beide „freigegeben mit Hinweisen“. Nachgezogen: Scan ohne Groß-/Kleinschreibung, normalisierter cap-Pfad in add-dir/Sperrregel, try im Skills-Teil, GIT_CEILING_DIRECTORIES, gemeinsame Zählregel E-186, Tests für die git-Umgebung. Neu gemessen (9b″): alle 29 übrigen init.slash_commands per Skill verweigert.
  - Challenger-Entscheidungen 29.09.2026: siehe unten.
- **Nebenbefund 9c:** Ein lesender Bash-Befehl (`pwd && ls -la …`) lief ohne Allowlist-Eintrag. Der vorgeschriebene Skript-Hinweis ist für lesende Befehle zu stark. Challenger entscheidet über ein Finding.

## Nächste Schritte
1. WS-5b-Merge. Die Challenger-Verifikation vom 29.09.2026 lautet „freigegeben mit Hinweisen“, der Nachtrag ist eingearbeitet.
2. F-814: Host-Allowlist, vor der ersten Installation über den Leitstand.
3. Reallauf haushaltsbuch2 mit playwright-mcp + frontend-design (Vorbedingungen in feature.md „Reallauf“):
   - vorschau_url im Projektregister setzen; „Freigeben & installieren“ für beide über den Leitstand;
   - Zählregel (Challenger 29.09.2026):
     - Gezählt wird nur ein Skill-tool_use mit einem Namen außerhalb der freigegebenen Menge, erkannt am tool_result-Text.
     - Erwartet: 0. Jeder Treffer geht an den Challenger.
     - Read auf gesperrte Skill-Dateien wird nicht gezählt.
   - Rot-Fall „fremde Origin“ mit installiertem playwright-mcp;
   - beobachten, ob GetTask in init.tools Wirkung hat (F-791-Vermerk).
4. Review-Pass → Abnahme F36.
5. Fixpaket (F-764 zuerst; F-765/757, F-767, F-748/751, F-755, F-762).
6. Projekt-Kern „Projekt aufrufen/anzeigen“.
7. Scout Datenanalyse (F-800).
8. Design-Schnitt F-725, mit Scope-Ergänzung vom 29.09.2026.
9. Design-Bau.
10. qa-Schritt (F-820).
11. Opportunity Scanner (F30). Vorher F-818 entscheiden: Der Vorstart-Scan blockiert Ort-B-Läufe auf ai-workforce selbst.

## Entscheidungen Challenger (29.09.2026)
- E-186: claude_ordner_veraendert bleibt FEHLGESCHLAGEN, mit bypass_verdacht_anzahl in daten und ohne Eskalation.
- Der Hinweistext der Skill-Installation nennt jetzt, dass die CLI lesende Befehle auch ohne Eintrag zulässt.
- Reallauf-Zählregel wie in Schritt 3; Read auf gesperrte Skill-Dateien wird nicht gezählt.

## Offene Entscheidungen Stefan
- F-766 (Kontrollzustand von Projekten gitignored).
- Schema-Zwilling navigate_adressen (Laufakten-Payload-Schema) nachziehen: ja/nein.
- Die Freigabe von frontend-design macht Stefan im Reallauf (F-812: danach committen).

## Bedienregeln
- Claude Code committet und pusht in ai-workforce nicht selbst (commit-guard F-787, Ablauf F-789); das weicht bewusst von CLAUDE.md 'Iterationsende' ab, siehe F-799.
- Stefan committet und pusht im eigenen PowerShell-Fenster, ohne PR.
- Der Challenger prüft per Hash; erst dann PR (F-789).
- TERMINAL-Blöcke mit absoluten Pfaden.
- Challenger nur lesend: keine Worktrees einbinden, kein mutierendes git.
- Nach einer echten Installation über den Leitstand ist ressourcen.json geändert — Stefan committet (F-812).
