# Spike F36 WS-2s — Ort für externe Skills/Agents, Schreibgrenze, Playwright-Begrenzung

Stand 28.09.2026, Basis `main` `bc755e1` (#270). Skript:
`scripts/spike-f36-ws2s.mjs` (Wegwerf). Reale Claude-CLI (`2.1.284`,
`claude-sonnet-5`), Tokens aus dem unveränderten `baueAufruf()`, Spawn über
das unveränderte `starteProzess()`. Nur für die Messung werden `--add-dir`
bzw. `--agents` vor `-p` eingeschoben.

**Werkzeugsatz** = `startvorlagen/ai-workforce.json` `werkzeugsaetze.schreibend`
+ `Skill` + `Agent` (wie der WS-2-Entwurf vor S6 ihn vorsah — gebaut wurde nach S6 Variante 3b ohne beide); bei S5 zusätzlich
`mcp__playwright__browser_navigate`, `…_snapshot`, `…_take_screenshot`.

**Arbeitsverzeichnis** je Probe: frische Kopie von `vorlagen/projekt-skelett`
in `%TEMP%\spike-f36-ws2s-<probe>-XXXXXX` mit eigenem `git init` + Commit. Nie
haushaltsbuch2, nie dieses Repo. **Fähigkeiten-Ordner (Ort B)**:
`%TEMP%\spike-f36-ws2s-cap-XXXXXX` mit `.claude/skills/probe-skill/SKILL.md`
(Codewort `KAP-SKILL-4711`) und `.claude/agents/probe-agent.md` (`tools: Read`,
Codewort `KAP-AGENT-0815`). Rohströme: `%TEMP%\spike-f36-ws2s\<probe>.ndjson`,
Zusammenfassung daneben (flüchtig, nicht versioniert).

## Gesamturteil

| Frage | Urteil | Beleg |
|---|---|---|
| S1 Skill nur in `<cap>/.claude/skills/`: lädt `--add-dir <cap>` ihn? | **HÄLT** (Grün + Rot) | S1a: `init.skills` enthält `probe-skill`; `Skill {"skill":"probe-skill"}` → „Launching skill: probe-skill“, Antwort `KAP-SKILL-4711`, 0 Denials. S1b ohne `--add-dir`: nicht in `init.skills`, kein Aufruf |
| S2 Agent nur in `<cap>/.claude/agents/`: lädt `--add-dir <cap>` ihn? | **HÄLT** (Grün + Rot) | S2a: `init.agents` enthält `probe-agent`; `Agent {subagent_type:"probe-agent", run_in_background:false}` → `KAP-AGENT-0815`. S2b ohne `--add-dir`: nicht in `init.agents` |
| S3 `--agents '<json>'` inline | **HÄLT** (technisch) | `init.agents` enthält `probe-agent`; `Agent`-Aufruf im Vordergrund läuft im `-p`-Modus, 0 Denials. Aber: der Subagent wertete den Inline-`prompt` als eingeschleuste Anweisung und verweigerte das Codewort (Modellurteil, einmalig beobachtet) — die Datei-Variante (S2a) befolgte denselben Inhalt |
| S4 Schreibrecht in `<cap>` mit `--add-dir` | **HÄLT NICHT** (ohne Sperre) | S4a: `Write` nach `<cap>\geschrieben.txt` → „File created successfully“, Datei existiert, 0 Denials. `--add-dir` gibt Schreibrecht |
| S4 Sperre per `--disallowedTools "Write(<cap>/**)" "Edit(<cap>/**)"` | **HÄLT** mit Form `C:/…/cap/**` · **HÄLT NICHT** mit `//C:/…` | S4b (`Write(C:/Users/…/cap/**),Edit(…)`): Write erzwungen → „File is in a directory that is denied by your permission settings.“, `permission_denials` = 1× Write, Datei fehlt. S4c (`Write(//C:/Users/…/cap/**)`): Datei geschrieben, 0 Denials |
| S5 `--output-dir <tmp>/pw-out`: entsteht `.playwright-mcp/` im Projekt? | **HÄLT** | S5a/S5c: Snapshot `.yml` und Screenshot `.png` landen in `pw-out`, Projekt-`git status` leer. Gegenprobe S5b ohne Flag: drei Dateien unter `.playwright-mcp/` untracked im Projekt |
| S5 `--allowed-origins "http://localhost;http://127.0.0.1"` | **HÄLT NICHT** (in dieser Form) | S5a: auch `http://127.0.0.1:<port>` → `net::ERR_BLOCKED_BY_CLIENT` — die Origin schließt den Port ein. S5c mit `http://localhost:<port>;http://127.0.0.1:<port>`: lokal Titel `KAP-LOKAL`, `https://example.com` → `ERR_BLOCKED_BY_CLIENT`. Kalibrierung S5b ohne Flag: example.com erreichbar (`Example Domain`) |

### S6 — begrenzt `--allowedTools` Skill/Agent auf Einzelregeln? (Nachtest, Challenger 28.09.2026)

Gleiches Setup, Werkzeugsatz = schreibend + Einzelregeln; `baueAufruf`
leitet `--tools` daraus als `…,Skill,Agent` ab. Belegt über erzwungene
Aufrufe und `permission_denials`, nicht über Modellurteil. Je Probe ein
Lauf; Rohströme `%TEMP%\spike-f36-ws2s\S6a_skill_regel.ndjson`,
`S6b_agent_regel.ndjson`, `S6c_ohne_allowed.ndjson`, `S6d_sperrliste.ndjson`
(S6d = zweiter Versuch). Gegenstück ohne `Skill`/`Agent` in `--tools`: WS-0
P4 (`state/spike-f36-werkzeugsatz.md`) — dort nicht verfügbar, 0 Aufrufe.

| Frage | Urteil | Beleg |
|---|---|---|
| `Skill(ponytail)`/`Agent(qa)` bestehen `WERKZEUG_EINTRAG_MUSTER` und `pruefeErlaubteWerkzeuge` | **HÄLT** | Muster `true` für `Skill(ponytail)`, `Skill(advisor-pass)`, `Agent(qa)`, `Agent(code-reviewer)`, `Agent(architecture-advisor)`; `pruefeErlaubteWerkzeuge` → `[]` für `schreibend` und `lesend` |
| S6a `--allowedTools …,Skill(ponytail),Agent(qa)`: `ponytail` erlaubt, `advisor-pass` verweigert? | **HÄLT NICHT** | `Skill ponytail` → „Launching skill: ponytail“; `Skill advisor-pass` → „Launching skill: advisor-pass“; `permission_denials: []` |
| S6b dasselbe für Agent: `qa` erlaubt, `general-purpose`/`statusline-setup` verweigert? | **HÄLT NICHT** | alle drei `Agent`-Aufrufe (Vordergrund) liefen und berichteten; `permission_denials: []` |
| S6c Kalibrierung: `Skill`/`Agent` nur in `--tools`, gar nicht in `--allowedTools` | aufrufbar | `advisor-pass` und `general-purpose` laufen, 0 Denials — Skill/Agent brauchen im `-p`-Lauf keine Freigabe; `--allowedTools` kann sie nicht begrenzen |
| S6d Sperrliste `--disallowedTools Skill(advisor-pass),Agent(general-purpose)` | **HÄLT** (gezielte Sperre) | `ponytail` ok; `advisor-pass` → „Skill execution blocked by permission rules“ (in `permission_denials`); `qa` ok; `general-purpose` → „Agent type 'general-purpose' has been denied by permission rule 'Agent(general-purpose)' from cliArg.“ Erster Versuch mit „Messlauf“-Rahmung: Modell verweigerte alle Aufrufe, zweiter mit schlichtem Auftrag ausgewertet. `init.skills`/`init.agents` bleiben ungefiltert |

**Folge (Variante 3b):** Eine Freigabeliste über `--allowedTools` trägt
nicht; `Skill`/`Agent` in `--tools` öffnet jeden geladenen Skill/Agent,
also auch die ungeprüften Nutzer-/Plugin-Skills (F-770). WS-2 nimmt sie
deshalb nicht in den Werkzeugsatz; F-770 auf P1 („blockiert
F36-Reallauf“). Ein Weg über die Sperrliste (S6d) setzt voraus, dass die
nicht freigegebenen Einträge vor dem Start vollständig bekannt sind.

**Flag-Syntax `@playwright/mcp@0.0.82`** (`--help`):
`--allowed-origins <origins>` — semikolongetrennt, Default „allow all“; die
Hilfe sagt wörtlich: „*does not* serve as a security boundary and *does not*
affect redirects“. `--output-dir <path>` — für automatisch benannte Dateien;
„Files with an explicit name are resolved against the workspace root instead
and are not affected by this option“. Gestartet ohne `cmd /c` (Semikolon):
`command` = `node.exe`, `args` = `[npx-cli.js, -y, @playwright/mcp@0.0.82,
--headless, --isolated, --output-dir, <pw-out>, --allowed-origins,
http://localhost:<port>;http://127.0.0.1:<port>]`.

## Je Probe

Allen Proben gemeinsam: `init.tools` = `Task, Bash, Edit, GetTask, Glob, Grep,
Read, Skill, Write` (S5 zusätzlich alle 34 `mcp__playwright__browser_*`,
bestätigt WS-0 P3: `--tools` begrenzt MCP nicht). `beendigungsart` `null`,
`stderr` leer.

- **S1a** `--add-dir <cap>`: `skills` 26 Einträge inkl. `probe-skill`; Aufruf
  `Skill` → Codewort; 3 Turns.
- **S1b** ohne: `probe-skill` fehlt; Antwort „nicht in der Liste der
  verfügbaren Skills“.
- **S2a** `--add-dir <cap>`: `agents` inkl. `probe-agent`; Aufruf mit
  `run_in_background: false`, Bericht kam an (`KAP-AGENT-0815`). Nebenbefund:
  `--add-dir` lädt Skills UND Agents des Ordners zugleich.
- **S2b** ohne: `probe-agent` fehlt in `agents`.
- **S3** `--agents '{"probe-agent":{description,prompt,tools:["Read"]}}'`:
  in `agents`; Aufruf läuft, Bericht kommt an; Inhalt siehe Tabelle.
- **S4a** `--add-dir <cap>`, erzwungener Write: Datei geschrieben.
- **S4b** + `--disallowedTools Bash(git:*),Write(C:/…/cap/**),Edit(C:/…/cap/**)`
  (über `baueAufruf`, kommagetrennt): Write verweigert, 1 Denial.
- **S4c** wie S4b mit `//`-Präfix: Regel greift nicht, Datei geschrieben.
- **S4d** ohne `--add-dir`: Modell verweigerte den Aufruf selbst (Skelett-
  CLAUDE.md „ein Zielverzeichnis pro Auftrag“), kein Write-Aufruf → zur
  Frage „Write außerhalb ohne `--add-dir`“ weiter **UNKLAR** (F-780 bleibt offen).
- **S5a** `--output-dir` + Origins ohne Port: beide Navigationen blockiert,
  Screenshot der Chrome-Sperrseite in `pw-out`.
- **S5b** ohne Flags: alles erreichbar, `.playwright-mcp/` im Projekt.
- **S5c** `--output-dir` + Origins mit Port: lokal ok, extern blockiert,
  Projekt sauber.

## Feststellung Ort A / B (nur feststellend, ohne Umsetzung)

- **(B) Workforce-Ordner per `--add-dir`** trägt technisch: Skills und Agents
  aus einem Ordner außerhalb des Projekts erscheinen in `init` und sind
  aufrufbar (S1a, S2a); der Projekt-Arbeitsbaum bleibt sauber, die
  Vorbedingung „sauberer Arbeitsbaum“ schreibender Läufe wird nicht berührt.
  Voraussetzung: der Ordner wird zusätzlich schreibgesperrt, und zwar mit
  der Regelform `Write(C:/…/**)`/`Edit(C:/…/**)` (S4b) — nicht mit `//` (S4c),
  sonst darf der Lauf die freigegebenen Fähigkeiten selbst verändern (S4a).
  `--add-dir` lädt immer alles im Ordner (Skills und Agents gemeinsam), eine
  Auswahl je Lauf braucht also einen Ordner je Auswahl oder eine andere
  Begrenzung.
- **(B') `--agents '<json>'`** trägt für Agents technisch (S3), ist aber
  anfälliger: der Inline-Prompt wurde vom Subagenten als Injektion gewertet.
  Kein Weg für Skills.
- **(A) ins Projekt und committen** ist durch S1b/S2b indirekt bestätigt
  (nur geladen, was im Projekt oder per `--add-dir` liegt; WS-0 P1/P2 zeigt
  Projekt-Skills/-Agents aufrufbar). Es verlangt einen Commit im Projekt
  vor dem Lauf (Arbeitsbaum muss sauber sein) — also einen menschlichen
  Schritt oder einen Kern-Commit außerhalb der Laufvorbereitung.

Beide Orte tragen; B trägt ohne Eingriff ins Projekt, braucht aber die
Schreibsperre aus S4b.

**Festgehalten (Challenger, 28.09.2026): Ort = B.** Je Eintrag ein
`--add-dir <cap>/<id>` plus `--disallowedTools Write(C:/…/<id>/**),Edit(C:/…/<id>/**)`;
kein `--agents` (S3). Umsetzung in WS-5 (`features/F36/feature.md`).
Achtung aus S6: auch über `--add-dir` geladene Skills/Agents sind nur dann
auf die Freigabe begrenzt, wenn F-770 gelöst ist.

**E-F36-7 = A** (Stefan, 28.09.2026) zu S5: playwright-mcp bleibt
`wirkung: lokal`, nur mit `--allowed-origins` auf die Projekt-URL mit Port
und `--output-dir` außerhalb des Projekts; Weiterleitungen bleiben bekannte
Grenze (F-790).

## Folgerungen für WS-3/WS-5 (nur feststellen)

1. Playwright-MCP: `--output-dir` außerhalb des Projekts ist Pflicht, sonst
   landet `.playwright-mcp/` im Arbeitsbaum. Snapshots mit explizitem
   Dateinamen folgen dem Flag laut Hilfe nicht — nicht gemessen.
2. `--allowed-origins` braucht den Port (`http://127.0.0.1:<port>`), der
   Katalogwert `http://localhost;http://127.0.0.1` sperrt jeden lokalen
   Server mit Port. Die Hilfe bezeichnet das Flag ausdrücklich als keine
   Sicherheitsgrenze und ohne Wirkung auf Redirects — relevant für die
   Entscheidung „bleibt `wirkung: lokal`“ (F-786).
3. Schreibsperren auf Windows in der Form `Write(C:/pfad/**)`; `//C:/…`
   greift nicht.
