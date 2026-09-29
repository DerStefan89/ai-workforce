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
  - nur von der Katalog-Adresse (`herkunft.url` bzw. bei Registry-Paketen
    `herkunft.paket`, E-F36-9),
  - nur in fester Version (Commit bzw. Paketversion),
  - in einen eigenen Ordner, danach ins Projekt-`.claude/` (überholt für
    Skills/Agents: Ort B ohne Ablage im Projekt, E-F36-8);
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
- **E-F36-8 = B** (Stefan, 28.09.2026): „Eigener Raum“. Der
  Ausführungslauf lädt keine ungeprüften Skills oder Agents. Sichtbar ist
  nur, was die Workforce nach Freigabe in ihren eigenen Ordner installiert:
  `--add-dir <cap>/<id>` mit Write/Edit-Sperre, kein `--agents` (Ort B).
  Ist S7 negativ, fällt die Entscheidung auf A zurück (Sperrliste).
  Stand Spike S7 (29.09.2026, `state/spike-f36-ws2s.md` S7):
  - Im Wortlaut **HÄLT NICHT**, und zwar an (b) für Agents. Projekt-Agents
    bleiben in `init.agents`, weil das Laden von `--add-dir` an der Quelle
    `project` hängt.
  - Die Kombination V4a (`disableBundledSkills` + `skillOverrides` off +
    Sperrliste `Skill(…)`/`Agent(…)`) lässt nur Ort-B-Einträge aufrufbar;
    alle anderen sind erzwungen gesperrt.
  - Challenger-Präzisierung ([EMPFEHLUNG] 29.09.2026), keine Entscheidung
    Stefans: **S7 HÄLT mit
    V4a.** „Sichtbar, aber deterministisch gesperrt“ genügt für
    Projekt-Agents (siehe AK4).
  - Die Namensliste der eingebauten Einträge driftet mit der CLI-Version
    (F-791).
- **E-F36-9 = A** (Stefan, 29.09.2026): MCP-Server, die als Registry-Paket
  verteilt werden, installiert die Workforce nur aus der ausdrücklichen
  Katalog-Adresse `herkunft.paket` (z. B. „npm:@playwright/mcp“), in exakter
  Version; `herkunft.url` bleibt die Informationsadresse. `herkunft.paket`
  wird vor dem Klick zusammen mit Lizenz, Kosten und Wirkung angezeigt.

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
  Katalog-Einträge kommen in den Workforce-Ordner (Ort B, E-F36-8). Die
  Skills, die heute ungefragt in der init-Zeile erscheinen, sind laut S7
  eingebaut (F-770). WS-4 macht sie nur sichtbar, begrenzt werden sie in
  WS-5 über V4a und F-791.
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
    `Agent(<name>)` begrenzen nichts. Das öffnete die ungeprüften Skills
    (F-770; laut S7 eingebaut, nicht Nutzer-/Plugin-Skills) und eingebaute
    Agents wie `statusline-setup`;
    AK4 („ohne Freigabe fehlt es“) bleibt im Wortlaut (Challenger-
    Entscheidung). `--disallowedTools Skill(<id>)`/`Agent(<name>)` sperrt
    dagegen gezielt (S6d), setzt aber eine vollständige Sperrliste voraus.
    Gebaut ist nur der MCP-Weg: Regel `erhaeltKatalogFaehigkeiten`
    (`ausfuehrung` + `schreibend`), `baueMcpAufruf` fail-closed,
    `mcpEintraege` in WS-2 leer (WS-3 befüllt ihn). Alle anderen
    Rollen/Arten bleiben bitgenau unverändert. Gate:
    `scripts/check-f36-ws2-laufzeit.mjs`. Skill/Agent in der Ausführung
    bleiben blockiert, bis F-770 gelöst ist (blockiert den F36-Reallauf).
    Lösungsweg nach S7: V4a + F-791 in WS-5.
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
  - **Stand: gemergt (#275, 29.09.2026).** Zuschnitt nach
    Challenger-[EMPFEHLUNG] 29.09.2026 (die zweite Liste heißt jetzt
    „Passt, nicht im Lauf“):
    - Reine Funktion `baueEmpfehlung` (`src/ressourcen/index.ts`).
      „Wird genutzt“ = nur, was der Start übergibt: extern/mcp,
      `FREIGEGEBEN`, `installation`, `wirkung: lokal`, verfügbar.
      Skill/Agent nie (Variante 3b, erst WS-5). „Passt, nicht im Lauf“ =
      alle übrigen anwendbaren Einträge mit Grund (`fehltFuerEinsatz`,
      bei Skill/Agent zusätzlich „erst ab WS-5“). MCP mit `wirkung` ≠
      `lokal` nur als Zählzeile. Rangfolge: beide `anwendbar_wenn`-
      Schlüssel vor einem, dann id; höchstens 3 je Liste (F-788).
    - Kontext: `task_typen` aus `router-<auftragId>` (fehlt es: `[]`,
      Hinweis „keine Router-Klassifikation“), Pfade = `git ls-files` der
      Projekt-Wurzel.
    - Anzeige = Start (E-F36-4): `GET /api/workflows/<id>` trägt am
      ZWINGEND-Start einer `ausfuehrung` mit schreibendem Werkzeugsatz das
      Feld `empfehlung`; Leitstand (Workflow-Bedienung und Workboard)
      zeigt beide Listen. Die angezeigten ids gehen als `empfehlungIds`
      mit der Freigabe (bzw. im Startauftrag von `POST /api/laeufe`) mit;
      der Start rechnet neu und bricht bei Abweichung ab (Freigabe 409,
      nichts festgehalten; `POST /api/laeufe` 400). Nur dann gehen genau
      die angezeigten MCPs als `optionen.mcpEintraege` in den Lauf, und
      eine Zeile kommt an den Auftrag. Ohne `empfehlungIds` bleibt jeder
      Start bitgenau wie vor WS-3.
    - Architekt: bei offenem Stack Auszug der Stack-Liste aus der
      Installationswurzel (`leseStackKandidatenAuszug`).
    - Gate: `scripts/check-f36-ws3-empfehlung.mjs`.
- **WS-5 — Installation (E-F36-6).** „Freigeben & installieren" aus der
  Liste „Passt, nicht im Lauf": Anzeige von Lizenz, Kosten und Wirkung
  vor dem Klick; Installation nur von der Katalog-Adresse (`herkunft.url`
  bzw. `herkunft.paket`, E-F36-9), nur in fester Version (Commit bzw.
  Paketversion), in den Workforce-Ordner `<cap>/<id>` (Ort B, E-F36-8;
  keine Ablage im Projekt-`.claude/`); setzt `installation` und
  `freigabe: FREIGEGEBEN`. Prüfung je `unterart` fail-closed (F-786):
  skill — `SKILL.md` mit Frontmatter; agent — `.md` mit Frontmatter;
  mcp — Serverstart mit den freigegebenen Einzelnamen.
  Geteilt am 29.09.2026 (Challenger-[EMPFEHLUNG]) in **WS-5a** (MCP-
  Installation) und **WS-5b** (Skill/Agent).
- **WS-5a — MCP-Installation.** **Stand: gebaut, nicht gemergt
  (29.09.2026).** Zuschnitt nach Challenger-[EMPFEHLUNG] 29.09.2026 und
  E-F36-9 = A:
  - **Katalog:** `herkunft.paket` (`npm:<name>` nach npm-Namensregeln,
    nur extern mcp) und `installation_vorlage` `{bin, args, werkzeuge}`
    (nur extern mcp; `bin` relativ im Paket, `werkzeuge` Einzelnamen nach
    R4). In `args` von Vorlage und `installation` sind nur die Platzhalter
    `{projekt_origins}` und `{ausgabe_ordner}` erlaubt, jeder andere
    `{…}` wird abgelehnt. `playwright-mcp` trägt `npm:@playwright/mcp`,
    `bin` `cli.js` (aus dem Paket geprüft) und acht Werkzeugnamen (gegen
    `tools/list` geprüft); `freigabe` bleibt `OFFEN`, keine `installation`.
  - **Projekt-URL (E-F36-7):** Feld `vorschau_url` im Projektregister
    (`projekte.json`/`projekte.lokal.json`, `loeseProjektPfade`), nur
    `http://localhost:<port>` bzw. `http://127.0.0.1:<port>`. Beim Start:
    `{projekt_origins}` → `http://localhost:<port>;http://127.0.0.1:<port>`,
    `{ausgabe_ordner}` → `~/.ai-workforce/laufausgabe/<laufId>`. Ohne
    `vorschau_url` steht ein Eintrag mit `{projekt_origins}` in „Passt,
    nicht im Lauf“ („Projekt-URL (vorschau_url) fehlt“) und kommt nie in den
    Lauf. Die Empfehlung zeigt die Projekt-URL an.
  - **Installation** (`src/ressourcen/installation.ts`, nur extern + mcp +
    `wirkung: lokal` + `herkunft.paket`, sonst 400):
    `POST /api/ressourcen/<id>/installation/vorbereiten` (`npm view`, nur
    lesend: exakte Version + integrity) und `POST
    /api/ressourcen/<id>/installation` mit genau dieser Version + integrity
    und dem `eintragHash` der angezeigten Katalogfelder (geändert → 409):
    `npm install <paket>@<version> --prefix ~/.ai-workforce/cap/<id>
    --ignore-scripts --save-exact --no-audit --no-fund` (asynchron, eine zur
    Zeit, Zeitgrenze). Danach fail-closed (F-786): Version und integrity im
    Lockfile = angezeigte, `bin` existiert, Serverstart mit den
    Vorlagen-args (Testwerte) liefert per `initialize` + `tools/list` alle
    `werkzeuge`, Prozess beendet. Erst dann `installation` (`command` =
    absoluter node-Pfad, `args` = [bin im cap-Ordner, …Vorlagen-args mit
    Platzhaltern]) und `FREIGEGEBEN` in `ressourcen.json` — nur der Text
    dieses Eintrags wird ersetzt. Kein npx zur Laufzeit. Jeder Fehlschlag:
    `ressourcen.json` unverändert, eigener Zielordner entfernt, Klartext-
    Grund. Runner injizierbar.
  - **Oberfläche:** Knopf „Freigeben & installieren“ in „Passt, nicht im
    Lauf“ (Workflow-Bedienung und Workboard) → Bestätigungsblock (Paket,
    Version, integrity, Lizenz, Kosten, Wirkung, Werkzeuge, Zielordner) →
    „Installieren“ → Ergebnis, danach Empfehlung neu geladen.
  - **F-808:** `empfehlungIds` sind `<id>@<sha256 der kanonischen
    installation>`; der Start vergleicht id und Hash.
  - **Beobachtung (E-F36-7):** `navigate_adressen` (input.url je
    `mcp__<id>__browser_navigate`) in der Laufakte und der Laufansicht.
  - **Poll-Last:** die Anzeige am ZWINGEND-Start wird zwischengespeichert
    (auftragId, mtime/Größe von `ressourcen.json`, HEAD des Projekts); der
    Start rechnet frisch.
  - Gate `scripts/check-f36-ws5a-installation.mjs` (a)–(k) + Zwischenspeicher;
    echter Installationsnachweis `features/F36/nachweis-ws5a-installation/`
    (`@playwright/mcp` 0.0.83, alle acht Namen gefunden); Render-Nachweis
    `features/F36/nachweis-ws5a-ui/`.
- **WS-5b — Skill/Agent (offen).** Ort B, V4a, Prüfung der init-Zeile,
  Scan vor dem Start, F-791, offene QA-Punkte; dazu aus WS-5:
  - **playwright-mcp**: Rot-Fall „fremde Origin wird verweigert“ (S5c) mit
    der installierten Fassung, spätestens im Reallauf. Bekannte Grenze:
    Weiterleitungen umgehen die Origin-Sperre, das Flag ist laut Playwright
    keine Sicherheitsgrenze.
  - **open-code-review**: `unterart` `skill` ist vermutet; WS-5 prüft
    fail-closed auf `SKILL.md`.
  - **V4a-Startkombination** (E-F36-8 = B, Präzisierung S7;
    `state/spike-f36-ws2s.md` S7). Gilt nur für `ausfuehrung`, sobald ein
    Ort-B-Eintrag freigegeben ist, zusätzlich zum heutigen `baueAufruf`
    (`--setting-sources project`, `--strict-mcp-config`):
    `Skill`/`Agent` in `--tools`; je freigegebenem Eintrag
    `--add-dir <cap>/<id>` + `Write(C:/…/<id>/**),Edit(C:/…/<id>/**)` in
    `--disallowedTools`; `--settings` mit `enabledPlugins` aller aktiven
    Plugins auf `false` (so gemessen; ohne diesen Schlüssel nicht gemessen),
    `disableBundledSkills: true` und
    `skillOverrides` „off“ für `design`, `doctor` und die nicht
    freigegebenen Projekt-Skills; `--disallowedTools` `Skill(…)` für
    dieselben Namen und `Agent(…)` für die eingebauten Agents (`claude`,
    `Explore`, `general-purpose`, `Plan`, `statusline-setup`, Stand CLI
    2.1.284) und die nicht freigegebenen Projekt-Agents. Die Projektnamen
    liest der Start vor dem Lauf aus `<projekt>/.claude/skills|agents`.
    Freigegebene Katalogeinträge, auch Projekt-Skills/-Agents, fallen aus
    der Sperrliste heraus.
  - **Init-Gate und Vorstart-Scan (F-791)**:
    (1) Das init-Gate kennt nur die Menge „freigegeben ∪ bewusst gesperrt“;
    jeder andere Name in `init.skills`/`init.agents` → Lauf abbrechen.
    (2) Vorstart-Scan: Existiert unterhalb der Projektwurzel ein weiteres
    `.claude/skills` oder `.claude/agents` außer dem der Wurzel → Lauf
    abbrechen (fail-closed gegen verschachtelte, erst beim Dateizugriff
    nachgeladene Skills).
    (3) Das Gate wird beim CLI-Versionswechsel rot, wenn sich die Menge der
    eingebauten Namen ändert.
    Aus dem QA-Pass S7, bestätigt (Challenger-[EMPFEHLUNG], 29.09.2026):
    (4) Keine Selbstanlage: `Write(**/.claude/**)` und `Edit(**/.claude/**)`
    in `--disallowedTools`.
    (4a) Rotfall in WS-5: Ein Lauf legt im selben Lauf einen Skill unter
    `.claude/skills/` an, einmal per `Write` und einmal per `Bash`, und
    versucht ihn aufzurufen. Ist er aufrufbar, eskaliert WS-5 an den
    Challenger.
    (4b) Enthält der Laufdiff Änderungen unter `.claude/`, ist das
    Laufergebnis rot.
    Den Folgelauf deckt bereits das init-Gate (1) ab: Ein im Vorlauf
    angelegter Name ist weder freigegeben noch bewusst gesperrt.
    (5) Namenskollision: Ein Ort-B-Eintrag mit dem Namen eines eingebauten
    oder eines Projekt-Skills/-Agents wird bei der Freigabe abgelehnt und
    beim Start erneut geprüft (Treffer → Lauf abbrechen, fail-closed).
    Grund: `skillOverrides` und `Skill()`/`Agent()` greifen nach Namen,
    nicht nach Herkunft.
  - **Offen für die WS-5-Challenge** (QA-Pass S7):
    - Kollision zweier Ort-B-Einträge mit gleichem Namen (von (5) nicht
      erfasst).
    - Sperrnamen aus dem Frontmatter-Feld `name` lesen, nicht aus Datei-
      oder Ordnernamen.
    - `.claude/commands` in Sperrliste und Scan aufnehmen.
    - Das Init-Gate prüft zusätzlich `init.plugins`, `mcp_servers` und
      `slash_commands`. Jeder Name mit `:` gilt als unbekannt.
    - Für Skills gilt strenger `init.skills` ⊆ freigegeben.
    - Abbruch vor dem ersten `tool_use`.
    - Die Referenzmenge je CLI-Version und ihre Abhängigkeit vom
      Anmeldestatus (`schedule`) festlegen.
    - Scan-Umfang festlegen: `node_modules`, `.git`, Junctions/Symlinks.
    - Ort-B-Layout festschreiben: nur `<cap>/<id>/.claude/skills|agents/…`,
      keine eigene `settings.json`.
    - Sind mehrere `--add-dir` und ein freigegebener Projekt-Agent unter
      V4a aufrufbar? Das ist noch nicht gemessen.
    - Sperren über den Text des `tool_result` erkennen, denn
      `permission_denials` bleibt leer.
    - Grenze der Windows-Kommandozeile prüfen.
    - `browser-use` (Datennachtrag 29.09.2026): Der Skill braucht die
      browser-use-CLI, die Prüfung auf `SKILL.md` allein reicht nicht; er
      wirkt über den Browser nach außen, das Schema kennt `wirkung` aber
      nur bei `mcp`.
- **Reallauf** (nach WS-5b, mit `playwright-mcp` und `frontend-design`).
  Ein nicht installierter Eintrag wird empfohlen,
  freigegeben, installiert und im selben Durchstich genutzt (init-Zeile und
  Aufruf beobachtet, WS-4). Zusätzlich wird beobachtet, ob das Modell
  gesperrte Agents ansteuert. Geschieht das wiederholt, wird die
  S7-Präzisierung zu E-F36-8 verworfen. Vor dem Reallauf festzulegen
  (QA-Pass S7):
  - Zählgröße: `Agent`-`tool_use` mit `subagent_type` aus der Sperrliste,
    erkannt am Denial-Text;
  - Schwelle und Stichprobe;
  - ein Auftrag ohne Aufforderung zu gesperrten Agents;
  - wer urteilt.
- **WS-4 — Beobachtung (F-730).** Gemergt (#269): init-Zeile (tools,
  agents, skills, mcp_servers) und tatsächliche Skill-/Agent-/MCP-Aufrufe je Lauf sichtbar.

Reihenfolge ab 28.09.2026 (E-F36-5/6): WS-1b → WS-2 Laufzeit → WS-3
Empfehlung → WS-5a MCP-Installation → WS-5b Skill/Agent → Reallauf. Stand 29.09.2026 gebaut und
gemergt: WS-0 (#267), WS-1 (#268), WS-4 (#269), WS-1b (#270), WS-2 (#271),
Spike S7 (#272), WS-3 (#275). WS-5a gebaut, nicht gemergt. Offen: WS-5b, Reallauf. Jeder Workstream wird vor dem
Bau präzisiert (eigene Challenge).

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
  Stand S7 (29.09.2026): Der Grünfall ist über Ort B + V4a real belegt
  (`probe-skill`/`probe-agent` aufgerufen, alles andere gesperrt;
  `state/spike-f36-ws2s.md` S7). **Challenger-Präzisierung ([EMPFEHLUNG]
  29.09.2026) zu E-F36-8 = B, keine Entscheidung Stefans: „S7 HÄLT mit
  V4a.“** AK4 heißt
  „nicht aufrufbar ohne Freigabe“, nicht „unsichtbar“:
  - Projekt-Agents dürfen im init sichtbar sein, wenn `--disallowedTools`
    sie deterministisch sperrt.
  - Freigegebene Katalogeinträge (auch Projekt-Agents/-Skills) fallen aus
    der Sperrliste heraus.
  - Verwerfen, wenn das Modell im Reallauf wiederholt gesperrte Agents
    ansteuert.
  AK4 bleibt offen, bis WS-5 die Kombination samt Init-Gate (F-791) baut
  und der Reallauf sie belegt.
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
  Stand WS-3 (29.09.2026, gemergt #275): belegt durch Unit-Tests
  `baueEmpfehlung` (Rangfolge, Obergrenze, Determinismus, Skill/Agent nie
  genutzt, `wirkung` ≠ `lokal` in keiner Liste, leere `task_typen`) und
  `scripts/check-f36-ws3-empfehlung.mjs` (a)–(h), gestubbter Starter.
  „Gleicher Auftrag“ heißt dabei: gleiche Router-`task_typen` und gleicher
  Dateistand des Projekts (`git ls-files`). Render-Nachweis (Workflow-
  Ansicht 400 px und breit, Workboard mit Freigabe und 409-Fall):
  `features/F36/nachweis-ws3-ui/`. Offen: Beleg im Reallauf.
- AK8 (WS-4) Je Lauf sind init-Zeile und Skill-/Agent-/MCP-Aufrufe in der
  Laufansicht sichtbar. Prüfweg: Gate + Render-Nachweis.
- AK9 `npm run check` ist grün.
- AK10 (WS-1b) Jeder der 38 Kandidaten („Aufnehmen"/„Pilot") steht in
  `features/F36/katalog-uebernahme.md` mit Gruppe und Ziel; jeder Eintrag
  der Gruppe 1 steht in `ressourcen.json` als `extern`, `OFFEN`, ohne
  `installation`; `lizenz`/`kosten` sind nur bei `extern` zulässig.
  Prüfweg: Unit-Tests `validiereRessourcenDaten` (Grün/Rot), Gates
  `check-f19-ressourcen` und `check-f24-capabilities` grün.
- AK11 (WS-5) Eine Installation nutzt nur die Katalog-Adresse (`herkunft.url`
  bzw. `herkunft.paket`, E-F36-9) und eine feste
  Version, legt erst in einen eigenen Ordner, dann ins Projekt-`.claude/`
  (für MCP: nur in den eigenen Ordner, Ort B),
  und zeigt vorher Lizenz, Kosten und Wirkung. Prüfweg: wird vor dem Bau
  präzisiert.
  Präzisiert für MCP (WS-5a, 29.09.2026, E-F36-9): Ein MCP-Eintrag (extern,
  `wirkung: lokal`, `herkunft.paket`) wird nur aus `herkunft.paket` in der
  vor dem Klick angezeigten exakten Version installiert, in
  `~/.ai-workforce/cap/<id>` (Ort B, nichts im Projekt); vorher angezeigt:
  Paket, Version, integrity, Lizenz, Kosten, Wirkung, Werkzeuge, Zielordner.
  Freigegeben wird erst nach bestandener Prüfung (Lockfile-Version und
  -integrity, `bin`, Serverstart mit allen Werkzeugen); jeder Fehlschlag
  lässt `ressourcen.json` unverändert. Prüfweg: Gate
  `scripts/check-f36-ws5a-installation.mjs` (a)–(f), (j); einmaliger echter
  Nachweis `features/F36/nachweis-ws5a-installation/`; Render-Nachweis
  `features/F36/nachweis-ws5a-ui/`. Für Skill/Agent präzisiert WS-5b.
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
- WS-3 Pfadquelle: `pfad_muster_any` wird gegen die versionierten Dateien
  des Projekts geprüft (`git ls-files`), heißt also „Projekt enthält
  passende Dateien“, nicht „Auftrag betrifft sie“ (F-806). Maßnahme bei
  Rauschen im Reallauf: Pfade aus den Architekt-Modulen ableiten.
- WS-3 Anzeige: Nur ein Start mit mitgeschickten `empfehlungIds` bekommt
  Katalog-Fähigkeiten — heute nur `POST .../freigabe` aus dem Leitstand.
  Ein Ausführungsschritt, der über `POST .../starten` oder die
  automatische Fortsetzung startet (z. B. ein nicht-ZWINGEND-Schritt in
  einem eigenen Workflow), läuft ohne Katalog-MCPs.
- WS-3 „angezeigt“ ist eine Aussage des Clients: Der Server prüft, dass die
  mitgeschickten ids der neu berechneten Liste entsprechen, nicht, dass sie
  wirklich angezeigt wurden. Ein API-Client (`POST /api/laeufe`, für den
  der Leitstand keine Anzeige hat, oder `POST .../freigabe`) kann die
  richtigen ids ohne Anzeige mitschicken (Einzelnutzer, lokal). Verglichen
  wurde bis WS-5a nur die Menge der ids, nicht die `installation` dahinter
  (F-808) — seit WS-5a tragen die ids den Hash der `installation`.
- WS-3 Last (erledigt in WS-5a, F-809): Die Anzeige am ZWINGEND-Start wird
  zwischengespeichert (auftragId, mtime/Größe von `ressourcen.json`, HEAD
  des Projekts). Eine Änderung, die weder Katalog noch HEAD berührt (z. B.
  eine neue, nicht committete Datei für `pfad_muster_any` oder eine neue
  Router-Klassifikation desselben Auftrags), erscheint erst
  nach dem nächsten Start oder Commit; der Start selbst rechnet immer frisch.
  Ändert sich die Empfehlung tatsächlich, rendert die Workflow-Ansicht den
  Freigabe-Block weiterhin neu.
- WS-5a Integrität: Geprüft wird die Registry-Integrität (integrity aus
  `npm view` = integrity im Lockfile), keine eigene Signaturprüfung des
  Pakets. Exakt gebunden ist nur das Hauptpaket; transitive Abhängigkeiten
  löst npm beim Installieren nach ihren Versionsbereichen auf, sie werden
  nicht angezeigt.
- WS-5a cap-Ordner: `~/.ai-workforce/cap` ist für alle Checkouts/Worktrees
  gemeinsam, `ressourcen.json` gehört je Checkout. Bricht eine Installation
  hart ab (Serverneustart), bleibt `cap/<id>` liegen; der nächste Versuch
  meldet 409 „existiert bereits“ mit dem Hinweis, erst zu prüfen, ob ein
  anderer Katalog ihn nutzt. Eine installierte Fassung, deren absoluter
  node- oder bin-Pfad fehlt (gelöschter Ordner, Node-Update), gilt als
  nicht verfügbar und kommt nicht in den Lauf.
- WS-5a Anfragen fremder Seiten: Die beiden Installationsrouten lehnen
  Browser-Anfragen einer fremden Seite ab (`Sec-Fetch-Site` nicht
  same-origin/none bzw. fremder `Origin` → 403, Gate (j)). Ohne beide Header
  (Nicht-Browser-Client auf dem Rechner) bleibt die Anfrage zulässig. Die
  übrigen POST-Routen des Leitstands prüfen weiterhin nichts davon (bestand
  schon vorher, F-813).
- WS-5a Neuinstallation: Ist eine Installation kaputt (cap-Ordner gelöscht,
  Node-Pfad geändert), gilt sie als nicht verfügbar; einen Weg zur
  Neuinstallation über die Oberfläche gibt es nicht — `installation`/
  `freigabe` in `ressourcen.json` von Hand zurücksetzen und `cap/<id>`
  löschen.
- WS-5a Routen: Die zwei Installationsrouten stehen in
  `scripts/leitstand-server.mjs` (erlaubte Pfade des Auftrags), nicht nach
  Arbeitsregel M5 in `scripts/leitstand/routen-<feature>.mjs`; die Logik
  liegt in `src/ressourcen/installation.ts`.
- WS-5a Render-Nachweis: belegt die Workflow-Bedienung; im Workboard nutzt
  derselbe Baustein denselben Ablauf, einen eigenen Klickweg-Nachweis dort
  gibt es nicht.
- WS-5a Anzeigezustand: Offene Bestätigungsblöcke sind je Katalog-id im
  Browser gehalten, nicht je Workflow oder Projekt; die Erfolgsmeldung
  erscheint nur in Blöcken, in denen der Eintrag unter „Wird genutzt“ steht.
- WS-5a `--ignore-scripts`: Pakete, die Install-Skripte brauchen, können
  dadurch unbrauchbar installiert werden; die Serverstart-Prüfung fängt
  das nur ab, wenn der Server dann nicht startet oder Werkzeuge fehlen.
- WS-5a Browser: Die Browser-Binärdateien von Playwright werden nicht
  installiert (`--ignore-scripts`, kein `playwright install`); playwright-mcp
  braucht ein vorhandenes Chrome/Chromium. Die Installationsprüfung startet
  keinen Browser.
- WS-5a Katalog im Repo: `ressourcen.json` ist versioniert; eine
  Installation schreibt dort `installation` (mit absoluten Pfaden dieses
  Rechners) und `FREIGEGEBEN`. Nach einer Installation committet Stefan
  (F-812); arbeitet die Workforce an sich selbst, sperrt der geänderte
  Arbeitsbaum bis dahin jeden schreibenden Lauf.
