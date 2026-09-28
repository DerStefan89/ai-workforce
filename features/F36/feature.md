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
E-M5-5, E-M5-16, E-F36-2, E-F36-3, E-F36-4, E-F36-5, E-F36-6.

## Entscheidungen
- **E-F36-5 = A** (Stefan, 28.09.2026): Die Recherche
  `docs/harness/kandidaten-2026-09-15.md` wird übernommen.
  - Gruppe 1 = Laufzeit-Fähigkeiten (Skill/Agent/MCP) → Katalog
    `ressourcen.json`, `freigabe: OFFEN`, mit `anwendbar_wenn`.
  - Gruppe 2 = Produkt-Bibliotheken → Stack-Liste für den Architekten
    (`docs/harness/stack-kandidaten.md`).
  - Gruppe 3 = Referenzen → Design-Schnitt (F-725/F-776).
  - Vorab wird NICHTS installiert. Freigabe und Installation erfolgen
    erst, wenn ein Eintrag empfohlen wird.
- **E-F36-6 = A** (Stefan, 28.09.2026): Die Workforce installiert nach
  Freigabe selbst (WS-5):
  - nur von der Katalog-Adresse (`herkunft.url`),
  - nur in fester Version (Commit bzw. Paketversion),
  - in einen eigenen Ordner, danach ins Projekt-`.claude/`;
  - Lizenz, Kosten und Wirkung werden vor dem Klick „Freigeben &
    installieren" angezeigt (Katalogfelder `lizenz`, `kosten`, `wirkung`).
- **E-F36-7 = A** (Stefan, 28.09.2026, Spike WS-2s S5): playwright-mcp
  bleibt `wirkung: lokal`, nur mit diesen Startbedingungen:
  - `--allowed-origins` auf die Projekt-URL MIT Port (Semikolon-Liste,
    z. B. `http://localhost:<port>;http://127.0.0.1:<port>`);
  - `--output-dir` außerhalb des Projekts.
  Bekannte Grenze: Weiterleitungen umgehen die Origin-Sperre, das Flag ist
  laut Playwright keine Sicherheitsgrenze
  (`docs/projekt/zielfassung.md` §13.6).

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
- **WS-1b — Übernahme der Recherche (E-F36-5).** Die 38 Kandidaten mit
  Urteil „Aufnehmen" (21) und „Pilot" (17) aus
  `docs/harness/kandidaten-2026-09-15.md` sind eingeordnet:
  `features/F36/katalog-uebernahme.md` (Gruppe, Ziel, Grund/Unsicherheit
  je Kandidat). Gruppe 1 als `extern`-Einträge in `ressourcen.json`
  (`OFFEN`, ohne `installation`, `anwendbar_wenn` als Vorschlag), Gruppe 2
  in `docs/harness/stack-kandidaten.md` (noch nicht verdrahtet, das ist
  WS-3). Schema-Ergänzung `lizenz`/`kosten` (nur `extern`, optional) für
  die Anzeige vor „Freigeben & installieren". Dazu F-781 (Vormerken-
  Auftragstext) und F-782 (`check-f24-capabilities` zählt nicht mehr fest).
  Nur Daten, Doku, Schema, kein Laufzeit-Code.
- **WS-2 — Laufzeit.** (Ursprünglicher Schnitt; gebaut ist nur der
  MCP-Weg, siehe „Gebauter Zuschnitt“ unten.) Der Werkzeugsatz der Ausführung wird aus dem
  Katalog ergänzt (`Skill`, `Agent`, freigegebene `mcp__<server>__<name>`);
  freigegebene Skills/Agents werden ins Projekt-`.claude/` gelegt;
  freigegebene lokale MCPs gezielt in `mcpConfig` (nur `ausfuehrung`,
  nur wenn empfohlen und angezeigt, E-F36-4). Ausführungs-Instruktion
  verlangt Subagenten im Vordergrund (WS-0: sonst geht der Bericht im
  `-p`-Lauf verloren).
  - **Gebauter Zuschnitt (28.09.2026, nach Spike WS-2s S6, Variante 3b):**
    `Skill`/`Agent` kommen NICHT in den Werkzeugsatz der Ausführung
    (`--tools` wie vor WS-2). S6 hat gemessen: beide brauchen im `-p`-Lauf
    keine `--allowedTools`-Freigabe — steht der Name in `--tools`, ist jeder
    geladene Skill/Agent aufrufbar; Einzelregeln `Skill(<id>)`/
    `Agent(<name>)` begrenzen nichts. Das öffnete die ungeprüften Nutzer-/
    Plugin-Skills (F-770) und eingebaute Agents wie `statusline-setup`;
    AK4 („ohne Freigabe fehlt es“) bleibt im Wortlaut (Challenger-
    Entscheidung). `--disallowedTools Skill(<id>)`/`Agent(<name>)` sperrt
    dagegen gezielt (S6d), setzt aber eine vollständige Sperrliste voraus.
    Gebaut ist nur der MCP-Weg: Regel `erhaeltKatalogFaehigkeiten`
    (`ausfuehrung` + `schreibend`), `baueMcpAufruf` fail-closed,
    `mcpEintraege` in WS-2 leer (WS-3 befüllt ihn). Alle anderen
    Rollen/Arten bleiben bitgenau unverändert. Gate:
    `scripts/check-f36-ws2-laufzeit.mjs`. Skill/Agent in der Ausführung
    bleiben blockiert, bis F-770 gelöst ist (blockiert den F36-Reallauf).
    Wenn `Agent` später aufgenommen wird, gehört der Satz „Subagenten nur im
    Vordergrund mit `run_in_background: false`“ in den Auftragstext jedes
    Startwegs dazu (Workflow und `POST /api/laeufe`; WS-0 P2) — in WS-2 schon
    einmal gebaut und mit 3b wieder entfernt.
    Übergabepunkt WS-3: `optionen.mcpEintraege` von
    `loeseAusfuehrungsEingabenAuf` aus der Empfehlung setzen, in beiden
    Aufrufern (`loeseSchrittEingabenAuf`, `POST /api/laeufe`).
  - **Ort für externe Skills/Agents = B** (Spike WS-2s S1–S4, festgehalten
    28.09.2026, Umsetzung in WS-5): Workforce-Ordner, je Eintrag ein
    `--add-dir <cap>/<id>` plus Schreibsperre
    `--disallowedTools Write(C:/…/<id>/**),Edit(C:/…/<id>/**)` (die Form
    `//C:/…` greift nicht, S4c). Kein `--agents`: der Subagent hat den
    eingebetteten Prompt als Injektion verweigert (S3). AK6 (Ablage ins
    Projekt-`.claude/`) wird in WS-5 an Ort B angepasst.
- **WS-3 — Empfehlung.** Deterministische Auswertung von `anwendbar_wenn`
  im Kern (E-F36-2), Anzeige am ZWINGEND-Start der Ausführung, eine Zeile
  im Auftrag. Zwei Listen: „Wird genutzt" (freigegeben und installiert) und
  „Passt, nicht installiert" (anwendbar, aber `OFFEN` oder ohne
  `installation`); dazu die Stack-Liste (`docs/harness/stack-kandidaten.md`)
  für den Architekten.
- **WS-5 — Installation (E-F36-6).** „Freigeben & installieren" aus der
  Liste „Passt, nicht installiert": Anzeige von Lizenz, Kosten und Wirkung
  vor dem Klick; Installation nur von `herkunft.url`, nur in fester Version
  (Commit bzw. Paketversion), erst in einen eigenen Ordner, dann ins
  Projekt-`.claude/`; setzt `installation` und `freigabe: FREIGEGEBEN`.
  Prüfung je `unterart` fail-closed (F-786): skill — `SKILL.md` mit
  Frontmatter; agent — `.md` mit Frontmatter; mcp — Serverstart mit den
  freigegebenen Einzelnamen.
  - **playwright-mcp** (E-F36-7 = A, 28.09.2026): `wirkung` bleibt
    `lokal`. Start nur mit `--allowed-origins` auf die Projekt-URL MIT Port
    (z. B. `http://localhost:<port>;http://127.0.0.1:<port>` — ohne Port
    sperrt das Flag auch den lokalen Server, Spike WS-2s S5a) und
    `--output-dir` außerhalb des Projekts; WS-5 belegt das mit einem
    Rot-Fall (fremde Origin wird verweigert, S5c). Bekannte Grenze:
    Weiterleitungen umgehen die Origin-Sperre, das Flag ist laut Playwright
    keine Sicherheitsgrenze.
  - **Adresse jedes `browser_navigate`** in der Beobachtung festhalten
    (heute erfasst WS-4 nur den Werkzeugnamen; E-F36-7).
  - **open-code-review**: `unterart` `skill` ist vermutet; WS-5 prüft
    fail-closed auf `SKILL.md`.
- **Reallauf.** Ein nicht installierter Eintrag wird empfohlen,
  freigegeben, installiert und im selben Durchstich genutzt (init-Zeile und
  Aufruf beobachtet, WS-4).
- **WS-4 — Beobachtung (F-730).** Läuft parallel auf
  `feat/f36-ws4-beobachtung`: init-Zeile (tools, agents, skills,
  mcp_servers) und tatsächliche Skill-/Agent-/MCP-Aufrufe je Lauf sichtbar.

Reihenfolge ab 28.09.2026 (E-F36-5/6): WS-1b → WS-2 Laufzeit → WS-3
Empfehlung → WS-5 Installation → Reallauf. WS-0, WS-1 und WS-4 sind
gebaut. Jeder Workstream wird vor dem Bau präzisiert (eigene Challenge).

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
  Stand WS-2 (28.09.2026): nur der Rotfall ist belegt (kein `Skill`/`Agent`
  ohne Freigabe, `scripts/check-f36-ws2-laufzeit.mjs` (a)/(d)); der
  Grünfall ist blockiert durch F-770 (Spike WS-2s S6).
- AK5 (WS-2) Ein freigegebener lokaler MCP erscheint nur im
  `ausfuehrung`-Schritt in `mcpConfig`, nur mit seinen freigegebenen
  Einzelnamen in `--allowedTools`; jede andere Rolle behält
  `{"mcpServers":{}}`. Prüfweg: Gate auf `baueAufruf`-Tokens je Rolle.
- AK6 (WS-2) Freigegebene Skills/Agents liegen nach der Vorbereitung im
  Projekt-`.claude/`; nicht freigegebene nicht. Prüfweg: Gate gegen ein
  Wegwerf-Projekt.
  Stand WS-2 (28.09.2026): nach WS-5 verschoben und an Ort B angepasst
  (Workforce-Ordner per `--add-dir`, Spike WS-2s) — schreibende Läufe
  verlangen einen sauberen Arbeitsbaum, beim Laufstart wird nichts ins
  Projekt kopiert.
- AK7 (WS-3) Die Empfehlung ist deterministisch (gleicher Auftrag +
  Katalog → gleiche Liste) und erscheint am ZWINGEND-Start sowie als
  Zeile im Auftrag. Prüfweg: Unit-Test + Gate am HTTP-Rundlauf.
- AK8 (WS-4) Je Lauf sind init-Zeile und Skill-/Agent-/MCP-Aufrufe in der
  Laufansicht sichtbar. Prüfweg: Gate + Render-Nachweis.
- AK9 `npm run check` ist grün.
- AK10 (WS-1b) Jeder der 38 Kandidaten („Aufnehmen"/„Pilot") steht in
  `features/F36/katalog-uebernahme.md` mit Gruppe und Ziel; jeder Eintrag
  der Gruppe 1 steht in `ressourcen.json` als `extern`, `OFFEN`, ohne
  `installation`; `lizenz`/`kosten` sind nur bei `extern` zulässig.
  Prüfweg: Unit-Tests `validiereRessourcenDaten` (Grün/Rot), Gates
  `check-f19-ressourcen` und `check-f24-capabilities` grün.
- AK11 (WS-5) Eine Installation nutzt nur `herkunft.url` und eine feste
  Version, legt erst in einen eigenen Ordner, dann ins Projekt-`.claude/`,
  und zeigt vorher Lizenz, Kosten und Wirkung. Prüfweg: wird vor dem Bau
  präzisiert.
- AK12 (Reallauf) Ein zuvor nicht installierter Eintrag wird empfohlen,
  freigegeben, installiert und genutzt. Prüfweg: Laufakte mit init-Zeile
  und Aufruf (WS-4).

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
- Der Scout-Vormerken-Auftrag (`public/leitstand/vormerken-auftrag.js`)
  nennt seit WS-1b name, beschreibung, unterart und bei mcp wirkung
  (F-781 erledigt). Der Scout-Kandidat selbst trägt weder `beschreibung`
  noch `unterart`/`wirkung` — die ausführende Rolle bestimmt sie aus der
  Quelle; ob sie das richtig tut, prüft erst das Gate `check-f19-ressourcen`.
- WS-1b-Einordnung (Entscheidung Challenger, 28.09.2026): Headroom,
  Doberman, Airship, Ontology Atlas, OrcaReplay und Shannon stehen in der
  eigenen Rubrik „Harness-Kandidaten (nicht im Katalog)" — Werkzeuge für
  die Workforce selbst bzw. Sonderwerkzeuge. `graft` ist aus dem Katalog
  entfernt (Identität unklar, Auswahlfilter: zurückstellen)
  (`features/F36/katalog-uebernahme.md`).
- `unterart` ist bei `open-code-review` (skill) nicht aus der Recherche
  belegt, sondern vermutet; WS-5 prüft fail-closed auf `SKILL.md`.
- `verfuegbar` für extern skill/agent heißt in WS-1 nur „freigegeben und
  `installation.pfad` existiert“ — ob dort eine `SKILL.md` bzw. eine
  Agent-Datei mit Frontmatter liegt, prüft der Katalog nicht. WS-2 (Ablage
  ins Projekt-`.claude/`) und WS-3 (Empfehlung) dürfen sich darauf nicht
  verlassen.
