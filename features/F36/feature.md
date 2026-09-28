# F36 — Capability Library wirksam machen

## ID
F36

## Titel
Capability Library wirksam machen

## Status
Status: IN_ARBEIT

Neu geschnitten: Stefan, 28.09.2026 (vorher „Capability Library Expansion“) — Anlass F-774: Katalog, Scout und Freigabe enden im Register und erreichen keinen Lauf.

Gültige Status-Werte (geprüft vom Gate): ENTWURF, READY_FOR_TECH, WORKSTREAM_SCHNITT_GENEHMIGT, IN_ARBEIT, FEATURE_GATE, ABGESCHLOSSEN, BLOCKIERT, ABGEBROCHEN.

## Ziel
Eine im Katalog (`ressourcen.json`) freigegebene Fähigkeit — Skill,
Agent oder lokaler MCP-Server — kommt in einem echten `ausfuehrung`-Lauf
an, wird dort empfohlen und ihre Nutzung ist beobachtbar. Durchstich:
**Katalog → Freigabe → Lauf → Empfehlung → Beobachtung.**

Ausgangslage (Fakt, init-Zeilen realer haushaltsbuch2-Läufe vom
28.09.2026 in `kontrollzustand-roh/`): `tools` = `Bash, Edit, GetTask,
Glob, Grep, Read, Write` — `Skill` und `Agent` fehlen; die Projekt-Agents
`qa`, `code-reviewer`, `architecture-advisor` sind geladen, aber nicht
aufrufbar; `mcp_servers` = `[]` (E-187). 0 Skill-/Agent-Aufrufe in 5
Läufen (F-769, F-774). Grundlage: `docs/projekt/zielfassung.md` §13.6
E-M5-5, E-M5-16, E-F36-2, E-F36-3, E-F36-4.

## Nicht-Ziele
- **Schritt-Empfehlung** (Katalog schlägt einen zusätzlichen Workflow-
  Schritt vor, z. B. einen `qa`-Schritt) — V1-Backlog (E-F36-2 = A).
  Auslöser: eine Rolle mit Output-Schema und Urteil steht zur Verfügung,
  die als eigener Schritt empfohlen werden könnte.
- **Automatische Scout-Läufe** — Scout bleibt vom Menschen angestoßen.
- **Externe, nur lesende MCPs** (`wirkung: extern_lesend`, z. B.
  Perplexity, Context7) — auch für recherchierende Rollen (Coach,
  Architekt, Scout). V1-Backlog (F-778). Auslöser: Der Mensch setzt
  `installation` bei einem `extern_lesend`-Eintrag; Jarvis meldet das als
  Empfehlung (E-M5-16). Bis dahin bleibt ein solcher Eintrag nach E-F36-4
  nicht freigebbar.
- **MCPs mit Schreibwirkung nach außen** (E-Mail, Tickets, Cloud-Dokumente,
  Deployments) — V1-Backlog (E-F36-4 = A). Auslöser: ein Projekt braucht
  nachweislich eine Außenwirkung, die kein lokaler Weg abdeckt, und Stefan
  benennt sie in einer Feature-Akte.
- **Nutzer-Agents außerhalb des Katalogs** — nur freigegebene
  Katalog-Einträge kommen ins Projekt-`.claude/`; Nutzer-/Plugin-Skills, die
  heute ungefragt in der init-Zeile erscheinen (F-770), werden in WS-4 nur
  sichtbar gemacht, nicht begrenzt.
- **Agents als eigene Werkzeugsatz-Rolle** — in V1 nur als
  Subagent-Empfehlung innerhalb der Ausführung (E-F36-3 = A).

## Workstreams
- **WS-0 — Probelauf Werkzeugsatz.** Reale Messung mit unverändertem
  `baueAufruf`/`starteProzess`, ob Skill, Agent und ein lokaler
  MCP-Server mit dem schreibenden Werkzeugsatz (E-F754) erreichbar sind
  und ob ein Subagent die Sperren des Elternlaufs erbt. Ergebnis:
  `state/spike-f36-werkzeugsatz.md`, Skript
  `scripts/spike-f36-werkzeugsatz.mjs` (Wegwerf). **Erledigt 28.09.2026.**
- **WS-1 — Katalog.** `schemas/ressourcen.schema.json` und
  `validiereRessourcenDaten`: Typ `agent` (Herkunft
  `.claude/agents/<name>.md`, name/beschreibung aus dem Frontmatter, R1/R3);
  `extern.unterart` `skill | agent | mcp` (Pflicht); `extern.wirkung`
  `lokal | extern_lesend | extern_schreibend` (Pflicht nur bei `mcp`);
  Feld `installation` (R4: skill/agent `{pfad, version}`, mcp `{version,
  mcp_server {command, args}, werkzeuge}` mit Einzelnamen
  `mcp__<id>__<name>`, keine Wildcard) mit R2 nach E-M5-5 (extern
  `FREIGEGEBEN` nur mit `installation`, löst F-724) und E-F36-4 (mcp
  `FREIGEGEBEN` nur mit `wirkung: lokal`); `anwendbar_wenn` mit
  `task_typen_any` und `pfad_muster_any` (ODER innerhalb, UND zwischen den
  Schlüsseln). Reine Funktionen `pruefeAnwendbarkeit` (Aufrufer ab WS-3)
  und `fehltFuerEinsatz` (Zeile „Fehlt für Einsatz“ in der
  Capabilities-Ansicht, nur Anzeige). `loeseRessourcenAuf` löst `agent`
  über das Frontmatter auf, extern skill/agent über `installation.pfad`,
  extern mcp ohne Prozessstart („Serverstart nicht geprüft“). Katalog:
  Agents `qa`, `code-reviewer`, `architecture-advisor`, `scout` als
  `typ: agent`; extern-Einträge mit `unterart`/`wirkung`, weiter `OFFEN`
  ohne `installation` (setzt der Mensch). Kein Laufzeit-Code.
- **WS-2 — Laufzeit.** Der Werkzeugsatz der Ausführung wird aus dem
  Katalog ergänzt (`Skill`, `Agent`, freigegebene `mcp__<server>__<name>`);
  freigegebene Skills/Agents werden ins Projekt-`.claude/` gelegt;
  freigegebene lokale MCPs gezielt in `mcpConfig` (nur `ausfuehrung`,
  nur wenn empfohlen und angezeigt, E-F36-4). Ausführungs-Instruktion
  verlangt Subagenten im Vordergrund (WS-0: sonst geht der Bericht im
  `-p`-Lauf verloren).
- **WS-3 — Empfehlung.** Deterministische Auswertung von `anwendbar_wenn`
  im Kern (E-F36-2), Anzeige am ZWINGEND-Start der Ausführung, eine Zeile
  im Auftrag.
- **WS-4 — Beobachtung (F-730).** Läuft parallel auf
  `feat/f36-ws4-beobachtung`: init-Zeile (tools, agents, skills,
  mcp_servers) und tatsächliche Skill-/Agent-/MCP-Aufrufe je Lauf sichtbar.

WS-1 bis WS-3 werden nach WS-0 präzisiert (eigene Challenge vor dem Bau).

## Akzeptanzkriterien
- AK1 (WS-0) `state/spike-f36-werkzeugsatz.md` hält je Probe P1–P4
  init-Zeile, Aufrufe, `permission_denials` und Rohstrom-Pfad fest und
  urteilt je Frage HÄLT / HÄLT NICHT / UNKLAR. Prüfweg: Akte lesen,
  Rohströme stichprobenartig gegen die Tabelle.
- AK2 (WS-1) Ein Katalogeintrag vom Typ `agent` sowie `extern` mit
  `unterart` und `installation` ist gültig und darf `FREIGEGEBEN` sein;
  ohne `installation` bleibt `FREIGEGEBEN` für `extern` abgelehnt.
  Prüfweg: Unit-Tests `validiereRessourcenDaten` (Grün/Rot), Gate
  `check-f19-ressourcen` bleibt grün.
- AK3 (WS-1) `anwendbar_wenn` (`task_typen_any`, `pfad_muster_any`) wird
  validiert; unbekannte Schlüssel werden abgelehnt. Prüfweg: Unit-Tests.
- AK4 (WS-2) Ein `ausfuehrung`-Lauf mit freigegebenem, empfohlenem Skill
  zeigt `Skill` in `init.tools`; ohne Freigabe fehlt es. Prüfweg:
  Gate mit gestubbtem Starter prüft die Tokens; ein Reallauf belegt die
  init-Zeile.
- AK5 (WS-2) Ein freigegebener lokaler MCP erscheint nur im
  `ausfuehrung`-Schritt in `mcpConfig`, nur mit seinen freigegebenen
  Einzelnamen in `--allowedTools`; jede andere Rolle behält
  `{"mcpServers":{}}`. Prüfweg: Gate auf `baueAufruf`-Tokens je Rolle.
- AK6 (WS-2) Freigegebene Skills/Agents liegen nach der Vorbereitung im
  Projekt-`.claude/`; nicht freigegebene nicht. Prüfweg: Gate gegen ein
  Wegwerf-Projekt.
- AK7 (WS-3) Die Empfehlung ist deterministisch (gleicher Auftrag +
  Katalog → gleiche Liste) und erscheint am ZWINGEND-Start sowie als
  Zeile im Auftrag. Prüfweg: Unit-Test + Gate am HTTP-Rundlauf.
- AK8 (WS-4) Je Lauf sind init-Zeile und Skill-/Agent-/MCP-Aufrufe in der
  Laufansicht sichtbar. Prüfweg: Gate + Render-Nachweis.
- AK9 `npm run check` ist grün.

## Dependencies
- F19 (Ressourcen-Katalog) — `schemas/ressourcen.schema.json`,
  `validiereRessourcenDaten`, die WS-1 erweitert.
- F27 (Scout) — liefert Kandidaten; Freigabe bleibt beim Menschen.
- F29 WS-0 / E-M5-5 — Feld `installation` und R2-Lockerung (F-724).
- F31 WS-3c / E-187 — MCP-Sperre als Default in `baueAufruf`, die WS-2
  nur für `ausfuehrung` und nur gezielt öffnet (§9.1 Nachtrag E-F36-4).
- E-F754 — schreibender Werkzeugsatz und `WERKZEUG_EINTRAG_MUSTER`
  (`src/startvorlage/index.ts`), in das WS-2 Einzelnamen einträgt.
- F-730 — Beobachtung (WS-4).

## Bekannte Grenzen
- WS-0 c): Ob ein Subagent außerhalb des Arbeitsverzeichnisses schreiben
  kann, ist nicht gemessen — das Modell verweigerte den Versuch selbst.
  Braucht einen Messweg ohne Modellurteil (F-780: ob Write in der
  Ausführung außerhalb des Arbeitsverzeichnisses gesperrt ist, ist
  unbelegt; Maßnahme Hook-Testfall oder erzwungener Aufruf).
- `--tools` begrenzt MCP-Werkzeuge nicht; alle Werkzeuge eines Servers
  stehen im Angebotssatz, nur `--allowedTools` sperrt den Aufruf (WS-0 P3).
- Der Scout-Vormerken-Auftrag (`baueVormerkenAuftragstext`) nennt
  `unterart`/`wirkung` noch nicht; ein so vorgemerkter `extern`-Eintrag
  scheitert seit WS-1 am Gate (F-781).
- `verfuegbar` für extern skill/agent heißt in WS-1 nur „freigegeben und
  `installation.pfad` existiert“ — ob dort eine `SKILL.md` bzw. eine
  Agent-Datei mit Frontmatter liegt, prüft der Katalog nicht. WS-2 (Ablage
  ins Projekt-`.claude/`) und WS-3 (Empfehlung) dürfen sich darauf nicht
  verlassen.
