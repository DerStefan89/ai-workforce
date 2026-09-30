# F36 — Capability Library wirksam machen

## ID
F36

## Titel
Capability Library wirksam machen

## Status
Status: ABGESCHLOSSEN

Abgenommen durch Stefan am 29.09.2026 nach Review-Pass und Fixpaket (#282).

Neu geschnitten: Stefan, 28.09.2026 (vorher „Capability Library Expansion“) — Anlass F-774: Katalog, Scout und Freigabe enden im Register und erreichen keinen Lauf.

Gültige Status-Werte (geprüft vom Gate): ENTWURF, READY_FOR_TECH, WORKSTREAM_SCHNITT_GENEHMIGT, IN_ARBEIT, FEATURE_GATE, ABGESCHLOSSEN, BLOCKIERT, ABGEBROCHEN.

## Ziel
Eine im Katalog (`ressourcen.json`) freigegebene Fähigkeit — Skill,
Agent oder lokaler MCP-Server — kommt in einem echten `ausfuehrung`-Lauf
an, wird dort empfohlen und ihre Nutzung ist beobachtbar. Durchstich:
**Katalog → Freigabe → Lauf → Empfehlung → Beobachtung.**

Gebauter Umfang (Review-Pass 29.09.2026): Skills (Ort B) und lokale MCPs
kommen in den Lauf. Agents (extern und Projekt) und Projekt-Skills bleiben in
der Ausführung gesperrt, `Agent` steht nie in `--tools` (F-815, Bekannte
Grenzen). Das Ziel ist für Agents damit nicht erreicht.

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
  (`OFFEN`, ohne `installation`, `anwendbar_wenn` als Vorschlag; seit #281
  sind `frontend-design` und `playwright-mcp` `FREIGEGEBEN`), Gruppe 2
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
- **WS-5a — MCP-Installation.** **Stand: gemergt (#276,
  29.09.2026).** Zuschnitt nach Challenger-[EMPFEHLUNG] 29.09.2026 und
  E-F36-9 = A:
  - **Katalog:** `herkunft.paket` (`npm:<name>` nach npm-Namensregeln,
    nur extern mcp) und `installation_vorlage` `{bin, args, werkzeuge}`
    (nur extern mcp; `bin` relativ im Paket, `werkzeuge` Einzelnamen nach
    R4). In `args` von Vorlage und `installation` sind nur die Platzhalter
    `{projekt_origins}` und `{ausgabe_ordner}` erlaubt, jeder andere
    `{…}` wird abgelehnt. `playwright-mcp` trägt `npm:@playwright/mcp`,
    `bin` `cli.js` (aus dem Paket geprüft) und acht Werkzeugnamen (gegen
    `tools/list` geprüft); `freigabe` blieb mit WS-5a `OFFEN`, keine
    `installation` (seit dem Reallauf, #281: `FREIGEGEBEN`, 0.0.83).
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
- **WS-5b — Ort-B-Skills.** **Stand: gemergt (#278, 29.09.2026).**
  Zuschnitt nach Challenger-[EMPFEHLUNG] 29.09.2026 (GO_STANDARD):
  - **Umfang:** Nur `extern`-Einträge mit `unterart` `skill`. `Agent` bleibt
    aus `--tools`.
    - Projekt-Skills (`<projekt>/.claude/skills`) und eingebaute Skills
      bleiben im Lauf gesperrt, auch wenn sie im Katalog `FREIGEGEBEN` sind
      (Grund in der Empfehlung: „Projekt-Skill im Lauf gesperrt“).
    - Extern-Agents: keine Installation, keine Laufzeit. Vorbereiten und
      Installieren antworten 400 „erst später“. In der Empfehlung bleibt der
      Grund „erst ab WS-5“.
    - Kein `enabledPlugins`, kein `claude plugin list` beim Start.
  - **Katalog:**
    - `installation_vorlage` `{skill_pfad}` für extern skill: relativ zum
      Unterpfad der `herkunft.url`, ohne `..`. Ohne Vorlage ist der Skill
      nicht installierbar, die Empfehlung zeigt den Grund (z. B.
      `browser-use`).
    - `installation` für extern skill: `{pfad, version = 40-stellige
      Commit-SHA, inhalt_hash = sha256}` (R4). Agent bleibt `{pfad, version}`.
    - `frontend-design` trägt `skill_pfad` `skills/frontend-design`, geprüft
      an der realen Plugin-Struktur (`features/F36/nachweis-ws5b/README.md`).
      Er blieb mit WS-5b `OFFEN`, ohne `installation`; seit dem Reallauf
      (#281) ist er `FREIGEGEBEN` und installiert.
  - **Installation** (`src/ressourcen/installation.ts` +
    `skill-installation.ts`, dieselben Routen, derselbe `eintragHash`-/409-
    Mechanismus, eine Installation zur Zeit, Zeitgrenze):
    - `herkunft.url` ist nur zulässig als
      `https://github.com/<owner>/<repo>[/tree/<ref>/<unterpfad>]`, sonst 400.
      Eine Commit-SHA als Ref ist abgelehnt. Grund: GitHub liefert über die
      Original-URL auch Commits aus Forks aus, also nur Branch oder Tag
      (Reviewer-Pass).
    - git läuft ohne `GIT_*`-Umgebung des Servers, ohne System- und
      Nutzerkonfiguration (auch bei `ls-remote`) und mit leerem
      `credential.helper`.
    - Vorbereiten: `git ls-remote` → Commit-SHA. Gewertet wird nur der exakte
      Name `refs/heads/<ref>`, `refs/tags/<ref>` oder `HEAD`, weil
      `ls-remote … main` real auch `…/main` meldet. Angezeigt werden Repo,
      Ref, SHA, skill_pfad, Lizenz, Kosten, Zielordner und der Hinweis
      „Skill-Dateien können Skripte enthalten; ausgeführt werden nur Befehle, die der Werkzeugsatz der Ausführung zulässt – lesende Befehle lässt die CLI auch ohne Eintrag zu“ (Challenger-Nachtrag 29.09.2026, nach
      Nachweis 9c).
    - Installieren genau dieser SHA. Zeigt die Ref inzwischen woandershin →
      409. Ablauf:
      - temporäres Repo, flacher Fetch der SHA;
      - `git ls-tree` über `<unterpfad>/<skill_pfad>`: Symlink oder
        Submodul → Abbruch;
      - Checkout nur dieses Pfads. git läuft ohne System- und
        Nutzerkonfiguration (keine Filter, kein LFS), mit `core.hooksPath` auf
        ein leeres Verzeichnis und `core.symlinks=false`;
      - Kopie nach `~/.ai-workforce/cap/<id>/.claude/skills/<name>/`.
        Enthält der Skill-Ordner ein `.claude`-Segment oder eine `CLAUDE.md`,
        wird abgebrochen.
    - Fail-closed-Prüfung (F-786 Teil skill):
      - `SKILL.md` mit Frontmatter `name` + `description`;
      - `name` nach `[a-z0-9-]`;
      - keine Kollision mit den 18 eingebauten Skills aus S7 (Konstante nur
        für diese Prüfung) oder einem anderen Ort-B-Skill des Katalogs.
    - Erst danach werden `installation` + `FREIGEGEBEN` geschrieben (nur der
      Text dieses Eintrags). Jeder Fehlschlag: `ressourcen.json` unverändert,
      Zielordner entfernt, Klartext-Grund. Der git-Runner ist injizierbar.
  - **Empfehlung** (`baueEmpfehlung`): extern skill `FREIGEGEBEN` +
    `installation` + verfügbar kommt in „Wird genutzt“, mit `empfehlungId`
    `<id>@<hash>` (F-808). Verfügbar heißt: Ordner da, `SKILL.md` mit
    Frontmatter, `inhalt_hash` stimmt.
  - **Start** (nur `ausfuehrung` mit schreibendem Werkzeugsatz und nur mit
    ≥1 übergebenem Ort-B-Skill, sonst bitgenau wie vorher; `baueOrtBSkillStart`
    in `src/ressourcen/ort-b-start.ts`):
    - `--tools …,Skill` (auch `--allowedTools`), kein `Agent`;
    - je Skill `--add-dir <cap>/<id>` und in `--disallowedTools`
      `Write(C:/…/<id>/**)`, `Edit(C:/…/<id>/**)` (S4b-Form);
    - zusätzlich in `--disallowedTools`: `Write(**/.claude/**)`,
      `Edit(**/.claude/**)`, `Skill(design)`, `Skill(doctor)` und
      `Skill(<Projekt-Skill>)`. Die Projekt-Skill-Namen kommen aus Ordnername
      UND Frontmatter-`name`;
    - ebenso die **Projekt-Commands** `.claude/commands/**.md` (Dateiname,
      Unterordner als Namensraum `sub:name`, Frontmatter-`name`). Real
      gemessen (Reviewer-Befund, Nachweis 9b′): Commands stehen nicht in
      `init.skills`, sind ohne Sperre aber per Skill-Werkzeug aufrufbar;
    - `--settings {disableBundledSkills: true, skillOverrides: design/doctor/
      Projekt-Skills "off"}`.
    - Vor dem Spawn, jeweils fail-closed (Lauf startet nicht, Grund mit Pfad):
      - `inhalt_hash` jedes übergebenen Skills neu berechnen;
      - `installation.pfad` = `<capWurzel>/<id>/.claude/skills/<name>`;
        der cap-Pfad darf die Regelsyntax nicht brechen (kein Leerzeichen,
        Komma, Klammer, `*`);
      - Ort-B-Layout: nur `.claude/skills/<name>` im cap-Ordner;
      - Namenskollision Ort-B ↔ eingebaut, Projekt und Ort-B;
      - Vorstart-Scan unterhalb der Projektwurzel (ohne `.git`, ohne Junctions
        und Symlinks zu folgen, mit `node_modules`): jedes weitere
        `.claude/skills|agents|commands`.
  - **Init-Gate** (Gateway, an der init-Zeile): `init.skills` ⊆
    übergebene Ort-B-Namen, `Agent` ∉ `init.tools`, `init.mcp_servers` =
    übergebene MCPs. Seit F-831 außerdem `init.slash_commands` ⊆
    Referenzmenge (`src/claude-code-gateway/slash-commands-referenz.json`)
    ∪ gesperrte Namen (`Skill(…)`/`skillOverrides`) ∪ Ort-B-Skills; fehlt
    das Feld oder ist es kein Array, ist das ein Verstoß.
    - Das Gate reagiert auf die init-Zeile im Datenstrom. Steht sie wie
      gemessen vor jedem `tool_use`, endet der Lauf vor dem ersten Aufruf.
      Kommt ein `tool_use` vor der init-Zeile, wird der Lauf beendet, aber
      nicht verhindert: Die CLI hat das Werkzeug dann schon ausgeführt.
    - Bei einem Verstoß, einem `tool_use` vor der init-Zeile oder einem
      regulären Ende ohne init-Zeile wird der Prozess über den bestehenden
      Abbruchweg beendet bzw. der Lauf rot gewertet. Startfehler und manueller
      Abbruch bleiben, was sie sind. Real belegt (9d): Abbruch nach 1,7 s,
      0 `tool_use`. Klassifikation:
      `FEHLGESCHLAGEN` `init_gate_verstoss`, die unbekannten Namen stehen im
      Grund.
    - Gilt nur für Läufe mit Ort-B-Skills.
  - **Ergebnis:** Enthält der Laufdiff eines solchen Laufs Änderungen unter
    `.claude/`, ist das Ergebnis `FEHLGESCHLAGEN` `claude_ordner_veraendert`
    (Bewertung in `klassifiziereLauf`, der Diff kommt aus dem Execution
    Controller).
  - **Oberfläche:** „Freigeben & installieren“ auch für installierbare
    Skills. Der Bestätigungsblock zeigt die Felder aus „Installation“.
  - Gate `scripts/check-f36-ws5b-skill.mjs` (a)–(o), kalibriert: Das Gate
    wird rot, wenn Init-Gate, Vorstart-Scan, inhalt_hash-Prüfung,
    Laufdiff-Prüfung oder Symlink-Prüfung fehlen.
  - Echte Nachweise `features/F36/nachweis-ws5b/`: Installation
    `frontend-design`, CLI-Lauf mit zwei Ort-B-Skills, Rotfall 4a.
    Render-Nachweis: `features/F36/nachweis-ws5b-ui/`.
  - **Zurückgestellt** (F-815):
    - Agents (extern + Projekt), Projekt-Skills in der Ausführung, E-F36-3;
    - ~~Rot-Fall „fremde Origin wird verweigert“ mit installiertem
      playwright-mcp (Reallauf)~~ — belegt in `nachweis-reallauf/` A
      (`ERR_BLOCKED_BY_CLIENT`);
    - `open-code-review`: `unterart` weiter vermutet, installierbar erst mit
      `installation_vorlage`.
  - **Offene QA-Punkte aus S7, Stand WS-5b:**
    - erledigt: Kollision zweier Ort-B-Einträge; Sperrnamen aus Frontmatter
      UND Ordnername; `.claude/commands` im Scan; `init.mcp_servers` im Gate;
      strenger `init.skills` ⊆ Ort-B; Abbruch vor dem ersten `tool_use`;
      Scan-Umfang (`node_modules` ja, `.git` nein, keine Links); Ort-B-Layout
      nur `.claude/skills/<name>`; Sperren am `tool_result`-Text (siehe
      Reallauf); `.claude/commands` in der Sperrliste (9b′).
    - erledigt (F-831): `init.slash_commands` im Gate gegen eine gemessene
      Referenzmenge (`features/F36/nachweis-f831/`).
    - offen: `init.plugins` im Gate; die Abhängigkeit der Referenzmenge vom
      Anmeldestatus; mehrere
      `--add-dir` mit freigegebenem Projekt-Agent; Grenze der
      Windows-Kommandozeile; `browser-use` (`wirkung` bei Skills, F-817).
- **Reallauf** (nach WS-5b, mit `playwright-mcp` und `frontend-design`).
  Ein nicht installierter Eintrag wird empfohlen, freigegeben, installiert
  und im selben Durchstich genutzt (init-Zeile und Aufruf beobachtet, WS-4).
  Kriterium (Challenger-Zuschnitt WS-5b, 29.09.2026):
  - Zählgröße: `Skill`-`tool_use` mit einem Namen außerhalb der
    freigegebenen Menge, erkannt am Text des `tool_result`. Erwartet: 0.
  - Jeder Treffer wird dokumentiert, der Challenger beurteilt ihn.
  - Agents sind nicht aufrufbar: `Agent` fehlt in `init.tools`.
  - Vorschlag QA (Challenger entscheidet): zwei Zählgrößen.
    - (a) Erfolgreiche fremde Aufrufe („Launching skill: …“) — erwartet 0,
      jeder ist rot.
    - (b) Verweigerte Versuche — dokumentieren, der Challenger urteilt.
    - Dazu: Der Auftrag verlangt die Nutzung von frontend-design
      ausdrücklich (AK12 „genutzt“).
  - Vorbedingungen:
    - F-814 ist behoben;
    - `~/.ai-workforce/cap/frontend-design` existiert nicht;
    - passende UI-Dateien in haushaltsbuch2 sind committet;
    - der Router ordnet den Auftrag als `neues-feature` ein
      (`anwendbar_wenn`);
    - Trockenlauf `scanneVerschachtelteClaudeOrdner` auf haushaltsbuch2
      (nach `npm install`): Liefert ein Paket in `node_modules` ein
      `.claude/skills|agents|commands` mit, startet kein Lauf;
    - im Reallauf-Protokoll die volle init-Zeile ablegen. Zu prüfen sind
      `init.skills` = erwartete Ort-B-Skills (das Gate prüft nur ⊆) und der
      Status von `mcp_servers`.
  - **Stand 29.09.2026:**
    - Beleg im Repo (Review-Pass H-B): `features/F36/nachweis-reallauf/`
      Abschnitt C und `auszug-laeufe.json` — init-Zeilen, Skill-/MCP-
      `tool_use` samt `tool_result`, `permission_denials` und sha256 der
      Rohströme aller vier Läufe; dazu cap-Zeitstempel, Installation (#281)
      und Freigabe-Entscheidungen. Nicht gespeichert und daher nicht belegt:
      die Anzeige der Empfehlung und der Klickweg für `playwright-mcp`
      (F-825, F-838 (4)). Die Nutzung von `frontend-design` folgte im
      Folge-Workflow F3, nicht im selben Durchstich wie die Installation.
    - F2 in haushaltsbuch2 über die hoch-Kette gebaut und abgenommen
      (Workflow `router-59f6cbd8…`, Läufe `1c4a1163`/`7b6d0f40`, Review
      `fbb5839e` BEREIT, AK1–3 ERFUELLT).
    - Über den Leitstand installiert: `frontend-design` (`fbe07fb6…`) und
      `playwright-mcp`.
    - Korrekturlauf `7b6d0f40`: `init.skills` = [`frontend-design`],
      `mcp_servers` = [`playwright-mcp` connected], kein Agent, 0 Denials.
      Skill und MCP waren verfügbar, wurden aber nicht aufgerufen (der Aufruf
      folgte im F3-Lauf `8cee6c98`). `GetTask` stand in `init.tools`, wurde aber
      nicht aufgerufen (F-791).
    - Playwright-Grenzen mit der installierten Fassung
      (`features/F36/nachweis-reallauf/`, F-786): Fremde Origin →
      `ERR_BLOCKED_BY_CLIENT`, Projekt-Origin erlaubt. `init.tools` zeigt
      alle 25 Playwright-Werkzeuge. `browser_run_code_unsafe` und
      `browser_evaluate` wurden im echten Lauf verweigert, und zwar am
      tool_result-Text.
    - F3 in haushaltsbuch2 über die standard-Kette gebaut und abgenommen
      (Workflow `router-8f1b8883…`, Läufe `8cee6c98` (Iteration 1) und
      `74290fb5` (Korrektur), Review `b7a88cce` BEREIT, AK1–3 ERFUELLT).
    - AK12 erfüllt: Lauf `8cee6c98` hat `frontend-design` real aufgerufen
      (Skill-`tool_use`, „Launching skill: frontend-design“). Dabei war
      `init.skills` = [`frontend-design`], `playwright-mcp` connected, kein
      Agent.
    - Playwright im echten Lauf:
      - `8cee6c98`: kein Aufruf. Das Modell wollte `npm run dev` selbst
        starten und wurde verweigert.
      - `74290fb5`: `browser_navigate` auf `file:///…/public/index.html`.
        Playwright hat das blockiert („Access to "file:" protocol is
        blocked“). Die Sperre hält also auch gegen `file:`.
    - Zählregel Reallauf: In allen vier Ausführungsläufen (`1c4a1163`,
      `7b6d0f40`, `8cee6c98`, `74290fb5`) gab es 0 Skill-`tool_use` mit einem
      Namen außerhalb der freigegebenen Menge.
    - Befunde aus dem Reallauf:
      - F-824 (Akte → Architekt)
      - F-825 (Obergrenze verdrängt Installierbare)
      - F-826 (Hinweis am ZWINGEND-Start)
      - F-827 (Vorschau im Auftrag nennen)
      - F-828 (Klärzustand bei laufendem Lauf)
      - F-829 (Review-Maßstab)
      - F-830 (DoD im Skelett)
      - Vermerk an F-764 (alle vier Läufe VERWEIGERT nur wegen Probebefehlen)
- **WS-4 — Beobachtung (F-730).** Gemergt (#269): init-Zeile (tools,
  agents, skills, mcp_servers) und tatsächliche Skill-/Agent-/MCP-Aufrufe je Lauf sichtbar.

Reihenfolge ab 28.09.2026 (E-F36-5/6): WS-1b → WS-2 Laufzeit → WS-3
Empfehlung → WS-5a MCP-Installation → WS-5b Skill/Agent → Reallauf. Stand 29.09.2026 gebaut und
gemergt: WS-0 (#267), WS-1 (#268), WS-4 (#269), WS-1b (#270), WS-2 (#271),
Spike S7 (#272), WS-3 (#275), WS-5a (#276), WS-5b (#278). Reallauf erledigt (29.09.2026, F2 und F3 in haushaltsbuch2). Jeder Workstream wird vor dem
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
  - Projekt-Agents dürfen im init sichtbar sein, wenn sie deterministisch
    nicht aufrufbar sind (gebaut: `Agent` fehlt in `--tools`).
  - Freigegebene Katalogeinträge (auch Projekt-Agents/-Skills) fallen aus
    der Sperrliste heraus. **Gebaut ist das nicht:** Projekt-Skills bleiben
    auch bei `FREIGEGEBEN` gesperrt (Identität ungeklärt, F-816), Agents
    sind zurückgestellt (F-815). Aus der Sperrliste fallen nur Ort-B-Skills.
  - Verwerfen, wenn das Modell im Reallauf wiederholt gesperrte Agents
    ansteuert.
  AK4 bleibt offen, bis WS-5 die Kombination samt Init-Gate (F-791) baut
  und der Reallauf sie belegt.
  Stand WS-5b (29.09.2026, gemergt #278): Für Ort-B-Skills gebaut
  und belegt.
  - Mit installiertem, freigegebenem und empfohlenem Skill steht `Skill` in
    `--tools` (Gate `check-f36-ws5b-skill` (c)); ohne Ort-B-Skill fehlt es
    (Gate (o), `check-f36-ws2-laufzeit`).
  - Echter Lauf `features/F36/nachweis-ws5b/` (9b, 9b′): `init.tools` mit
    `Skill`, ohne `Agent`; `init.skills` = nur die zwei Ort-B-Skills.
    Erzwungen nicht aufrufbar sind die Projekt-Skills und -Commands sowie
    jeder Name aus `init.skills` und `init.slash_commands` dieser
    CLI-Version (9b′, 9b″: alle Namen per Skill-Werkzeug geprüft, alle
    verweigert). Ein neuer Name in `init.skills` stoppt das Init-Gate.
    Ebenso ein neuer Name in `init.slash_commands`, der weder in der
    gemessenen Referenzmenge noch unter den gesperrten Namen oder den
    Ort-B-Skills steht (F-831; Messung und Gegenprüfung
    `features/F36/nachweis-f831/`). Die Referenzmenge wird bei einem
    solchen Abbruch nachgemessen; aufgenommen werden nur Namen, die per
    Skill-Werkzeug verweigert werden.
  - Agents sind nicht Teil von WS-5b (F-815). Der Reallauf belegt AK4 im
    Durchstich.
  Stand Reallauf (29.09.2026): real belegt. Im Korrekturlauf `7b6d0f40`
  (haushaltsbuch2) stand der installierte, freigegebene und (nur mittelbar
  belegt, siehe Reallauf) empfohlene `frontend-design` in `init.skills` (einziger Eintrag). Kein Agent, 0
  Denials. Für Agents gilt weiter F-815. Beleg:
  `features/F36/nachweis-reallauf/auszug-laeufe.json` (`7b6d0f40`; zum
  Vergleich `1c4a1163` vor der Installation: kein `Skill` in `init.tools`).
  Seit dem Review-Pass lehnt der Startvorlage-Validator `Skill`, `Agent`,
  `Task` und `mcp__…` in `erlaubte_werkzeuge` ab (H-A); ohne Ort-B-Skill
  kann auch eine Projekt-Startvorlage `Skill`/`Agent` nicht öffnen (Gate
  `check-f36-ws2-laufzeit` (e), Test `startvorlage.test.ts`).
- AK5 (WS-2) Ein freigegebener lokaler MCP erscheint nur im
  `ausfuehrung`-Schritt in `mcpConfig`, nur mit seinen freigegebenen
  Einzelnamen in `--allowedTools`; jede andere Rolle behält
  `{"mcpServers":{}}`. Prüfweg: Gate auf `baueAufruf`-Tokens je Rolle.
  Stand Reallauf (29.09.2026): real belegt.
  - Korrekturlauf `7b6d0f40`: `mcp_servers` = [`playwright-mcp`
    connected].
  - `features/F36/nachweis-reallauf/` (B): Über den Produktionsweg stehen
    in `--allowedTools` genau die 8 freigegebenen Einzelnamen. Die übrigen
    Werkzeuge sind im init sichtbar, aber nicht aufrufbar
    (`browser_run_code_unsafe` und `browser_evaluate` verweigert).
  - Auszug der Rohströme: `features/F36/nachweis-reallauf/auszug-laeufe.json`
    (`7b6d0f40` init, `74290fb5` `browser_navigate` auf `file:` → blockiert).
    Das Argv (`--allowedTools`) steht nicht im Rohstrom; die 8 Einzelnamen
    belegt Nachweis B über denselben Produktionsweg.
- AK6 (WS-2, an Ort B angepasst in WS-5b) Freigegebene Ort-B-Skills liegen
  nach der Installation in `~/.ai-workforce/cap/<id>/.claude/skills/<name>/`
  und kommen je Lauf per `--add-dir <cap>/<id>` (schreibgesperrt) in die
  Ausführung. Ins Projekt-`.claude/` wird nichts gelegt; ein Lauf, der dort
  etwas ändert, ist rot (`claude_ordner_veraendert`). Nicht freigegebene
  kommen nicht in den Lauf. Prüfweg: Gate `scripts/check-f36-ws5b-skill.mjs`
  (a), (c), (n) gegen ein Wegwerf-Projekt; echter Lauf
  `features/F36/nachweis-ws5b/`.
  Stand WS-2 (28.09.2026): nach WS-5 verschoben und an Ort B angepasst
  (Workforce-Ordner per `--add-dir`, Spike WS-2s) — schreibende Läufe
  verlangen einen sauberen Arbeitsbaum, beim Laufstart wird nichts ins
  Projekt kopiert.
  Endstand (Review-Pass 29.09.2026): erfüllt. Gate `check-f36-ws5b-skill`
  (a), (c), (n); echter Lauf `nachweis-ws5b/` 9b/9c; im Reallauf lag
  `frontend-design` unter `~/.ai-workforce/cap/frontend-design/.claude/skills/`
  (`nachweis-reallauf/` C). Grenze: Der Laufdiff sah keine ignorierten
  Dateien (F-832); seit Fixpaket PR 2 nach F36 prüft ein
  Dateisystem-Vergleich `<projekt>/.claude` vor/nach dem Lauf.
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
  `features/F36/nachweis-ws3-ui/`.
  Endstand (Review-Pass 29.09.2026): erfüllt über Unit-Tests, Gate und
  Render-Nachweis. Im Reallauf wurde die Empfehlung am ZWINGEND-Start
  angezeigt und beobachtet (F-825, F-826). Gespeichert ist die Anzeige in
  keinem Artefakt, einen Reallauf-Beleg im Repo gibt es dafür nicht.
- AK8 (WS-4) Je Lauf sind init-Zeile und Skill-/Agent-/MCP-Aufrufe in der
  Laufansicht sichtbar. Prüfweg: Gate + Render-Nachweis.
  Endstand (Review-Pass 29.09.2026): erfüllt. Tests `beobachtung.test.ts`,
  `beobachtung-zeile.test.mjs`, Render-Nachweis `nachweis-ws4-ui/`. Ein
  eigenes WS-4-Gate-Skript gibt es nicht, die Tests laufen in `npm run
  check`. Im Reallauf trägt die Laufakte `beobachtung` (`init_skills`,
  `init_tools`, `init_mcp_server`, `init_agents`, `skill_aufrufe`), z. B.
  `8cee6c98`: `skill_aufrufe` = [`frontend-design`].
- AK9 `npm run check` ist grün.
  Endstand (Review-Pass 29.09.2026): siehe Abschnitt „Review-Pass
  29.09.2026“.
- AK10 (WS-1b) Jeder der 38 Kandidaten („Aufnehmen"/„Pilot") steht in
  `features/F36/katalog-uebernahme.md` mit Gruppe und Ziel; jeder Eintrag
  der Gruppe 1 steht in `ressourcen.json` als `extern`, `OFFEN`, ohne
  `installation`; `lizenz`/`kosten` sind nur bei `extern` zulässig.
  Prüfweg: Unit-Tests `validiereRessourcenDaten` (Grün/Rot), Gates
  `check-f19-ressourcen` und `check-f24-capabilities` grün.
  Endstand (Review-Pass 29.09.2026): erfüllt für den Stand von WS-1b. Seit
  dem Reallauf (#281) sind `frontend-design` und `playwright-mcp` als
  einzige Gruppe-1-Einträge `FREIGEGEBEN` mit `installation`, alle übrigen
  bleiben `OFFEN` ohne `installation`.
- AK11 (WS-5) Eine Installation nutzt nur die Katalog-Adresse (`herkunft.url`
  bzw. `herkunft.paket`, E-F36-9) und eine feste
  Version, legt nur in einen eigenen Ordner (Ort B, `~/.ai-workforce/cap/<id>`;
  die ursprüngliche Ablage „danach ins Projekt-`.claude/`“ ist durch
  E-F36-8 überholt, nichts kommt ins Projekt)
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
  Präzisiert für Skill (WS-5b, 29.09.2026):
  - Ein externer Skill mit `installation_vorlage` `{skill_pfad}` wird nur
    von der `herkunft.url` (`https://github.com/<owner>/<repo>[/tree/<ref>/<unterpfad>]`)
    installiert, und zwar in der vor dem Klick angezeigten Commit-SHA
    (`git ls-remote`). Zeigt die Ref beim Installieren woandershin → 409.
  - Geholt wird nur `<unterpfad>/<skill_pfad>`: flacher Fetch, ohne Hooks,
    Filter und Symlinks. Ziel ist `~/.ai-workforce/cap/<id>/.claude/skills/<name>/`
    (Ort B, nichts im Projekt).
  - Vorher angezeigt: Repo, Ref, SHA, skill_pfad, Lizenz, Kosten, Zielordner,
    Skript-Hinweis.
  - Freigegeben wird erst nach bestandener Prüfung: `SKILL.md` mit name +
    description, Name nach `[a-z0-9-]`, keine Kollision mit eingebauten oder
    Ort-B-Skills. Dann steht `installation` `{pfad, version = SHA,
    inhalt_hash}` im Katalog. Jeder Fehlschlag lässt `ressourcen.json`
    unverändert.
  - Extern-Agents: 400 „erst später“.
  - Prüfweg: Gate `scripts/check-f36-ws5b-skill.mjs` (a), (d)–(j);
    einmaliger echter Nachweis `features/F36/nachweis-ws5b/` (9a,
    frontend-design); Render-Nachweis `features/F36/nachweis-ws5b-ui/`.
- AK12 (Reallauf) Ein zuvor nicht installierter Eintrag wird empfohlen,
  freigegeben, installiert und genutzt. Prüfweg: Laufakte mit init-Zeile
  und Aufruf (WS-4).
  Stand Reallauf (29.09.2026): erfüllt (Lauf `8cee6c98`).
  - `frontend-design` und `playwright-mcp` wurden über den Leitstand
    installiert.
  - In `7b6d0f40` standen beide bereit, wurden aber nicht aufgerufen.
  - In `8cee6c98` (F3) wurde `frontend-design` per Skill-`tool_use`
    aufgerufen („Launching skill: frontend-design“).
  - `playwright-mcp` wurde nicht wirksam genutzt (F-827).
  - Beleg im Repo: `features/F36/nachweis-reallauf/auszug-laeufe.json`
    (Rohstrom `8cee6c98`, sha256 `84910fc0…`: `tool_use` `Skill`
    `{"skill":"frontend-design"}`, `tool_result` „Launching skill:
    frontend-design“, `is_error: false`). „Empfohlen“ ist nur mittelbar
    belegt (siehe Reallauf, Stand 29.09.2026).

## Review-Pass 29.09.2026
Feature-Review-Pass vor FEATURE_GATE über #267–#281 (dazu #277 F-813 und
#279 F-814). Subagenten `code-reviewer` und `qa` mit frischem Kontext.

- **Erster Pass:** beide „nicht freigegeben“. Drei HOCH-Befunde:
  - H-A: Eine Projekt-Startvorlage konnte `Skill`, `Agent`, `Task` und
    `mcp__…` öffnen (F-839).
  - H-B: Die Reallauf-Belege standen nur in Prosa.
  - H-C: Die Sicherheitsgrenzen waren veraltet, das Ziel nannte Agents.
  - MITTEL/NIEDRIG → F-831 bis F-838.
- **Fixpaket (Branch `docs/f36-feature-review`):**
  - H-A: Validator plus Rotfälle (`startvorlage.test.ts`, Gate
    `check-f36-ws2-laufzeit` (e), kalibriert).
  - H-B: `nachweis-reallauf/` Abschnitt C mit `auszug-laeufe.json` aus den
    vorhandenen Rohströmen.
  - H-C und F-837: Doku nachgezogen.
  - F-832: nur der Satz korrigiert, der Code-Fix bleibt offen (über dem
    Umfang, siehe Finding).
- **Kurz-Review-Pass über das Fixpaket:** `code-reviewer` (H-A) und `qa`
  (H-B, H-C) beide „freigegeben mit Hinweisen“. Die Hinweise sind
  eingearbeitet:
  - ADR-Satz zu F-839;
  - `readonly`;
  - Verweis AK9 auf diesen Abschnitt;
  - WS-1b-, AK4- und Origin-Rotfall-Zeilen;
  - Zählregel-Vermerk im Reallauf-README.
- **`npm run check`** auf dem Endstand des Fixpakets (Basis `54d6eb6` plus
  uncommittete Änderungen, 29.09.2026): Exit 0, 1060/1060 Tests.

| AK | Urteil | Beleg |
|---|---|---|
| AK1 | erfüllt | `state/spike-f36-werkzeugsatz.md` P1–P4, Rohstrom stichprobenartig geprüft |
| AK2 | erfüllt | `ressourcen.test.ts`, Gate `check-f19-ressourcen` |
| AK3 | erfüllt | `ressourcen.test.ts` (`anwendbar_wenn`) |
| AK4 | erfüllt für Skills (Ort B); Agents zurückgestellt (F-815) | Gates ws5b (c)/(o), ws2 (a)/(e); `nachweis-ws5b/` 9b/9b′/9b″; Reallauf `7b6d0f40` (`auszug-laeufe.json`) |
| AK5 | erfüllt | Gate ws2 (b)/(c); `nachweis-reallauf/` B; Reallauf `7b6d0f40`/`74290fb5` (C) |
| AK6 | erfüllt, Grenze F-832 | Gate ws5b (a)/(c)/(n); `nachweis-ws5b/` 9b/9c; Reallauf C |
| AK7 | erfüllt; Reallauf-Anzeige nicht als Artefakt gespeichert | Unit-Tests `baueEmpfehlung`, Gate ws3 (a)–(h), `nachweis-ws3-ui/` |
| AK8 | erfüllt | `beobachtung.test.ts`, `beobachtung-zeile.test.mjs`, `nachweis-ws4-ui/`; Laufakte `8cee6c98` `skill_aufrufe` |
| AK9 | erfüllt | `npm run check` Exit 0, 1060/1060 Tests (29.09.2026, Endstand Fixpaket) |
| AK10 | erfüllt (Stand WS-1b; seit #281 zwei Einträge FREIGEGEBEN) | `katalog-uebernahme.md`, Gates `check-f19-ressourcen`, `check-f24-capabilities` |
| AK11 | erfüllt (MCP und Skill) | Gates ws5a (a)–(k), ws5b (a), (d)–(j); `nachweis-ws5a-installation/`, `nachweis-ws5b/` 9a; UI-Nachweise |
| AK12 | erfüllt; „empfohlen“ nur mittelbar belegt | Reallauf `8cee6c98` (`auszug-laeufe.json`: Skill-`tool_use` + „Launching skill: frontend-design“) |

Offen für die Abnahme (keine Blocker, alle als Findings):
- F-831 bis F-836, F-838;
- F-832 (Code);
- F-815/F-816 (Agents, Projekt-Skills);
- F-791 (Namensdrift, GetTask);
- F-818, F-822, F-823;
- F-824 bis F-830.

Nachtrag (Fixpaket PR 1 und PR 2 nach F36, 30.09.2026): Die Tabelle oben ist der
Stand der Abnahme vom 29.09.2026. Behoben (PR folgt bzw. #284) sind seither F-764,
F-768, F-827 (PR 1) sowie F-823, F-824, F-825, F-826, F-828, F-830, F-832 (Code, damit
entfällt die Grenze bei AK6 bis auf die unter „Bekannte Grenzen“ genannten Reste) und
F-833 (PR 2). F-831 (Init-Gate prüft `init.slash_commands`) ist behoben (PR folgt). Offen
bleiben F-829, F-834 bis F-836, F-838, F-815/F-816, F-791, F-818, F-822.

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
  verlassen. Seit WS-5b gilt für extern skill zusätzlich: `SKILL.md` mit
  Frontmatter und `inhalt_hash` = gespeicherter Wert.
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
  (Nicht-Browser-Client auf dem Rechner) bleibt die Anfrage zulässig. Seit
  F-813 (#277) gilt derselbe CSRF-Haken zentral für alle nicht lesenden
  Leitstand-Routen (Gate `check-f813-csrf`).
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
  Arbeitsbaum bis dahin jeden schreibenden Lauf. Seit #281 stehen die
  Installationen von `frontend-design` und `playwright-mcp` mit absoluten
  Pfaden dieses Rechners (`C:\Users\stefa\…`, node-Pfad) im versionierten
  Katalog. Auf einem anderen Rechner oder unter einem anderen Nutzerpfad
  gelten sie als nicht verfügbar; alle Checkouts und Worktrees desselben
  Rechners nutzen dieselben Installationen in `~/.ai-workforce/cap`.
- WS-5b Laufdiff: `claude_ordner_veraendert` prüft zwei Wege. Der
  git-Weg (`git status`) sieht alle nicht ignorierten Änderungen mit einem
  Segment `.claude`, auch verschachtelt. Seit F-832 (Fixpaket PR 2 nach
  F36) kommt ein Dateisystem-Vergleich von `<projekt>/.claude` hinzu:
  Momentaufnahme vor dem Start (relativer Pfad plus sha256, inklusive
  git-ignorierter Dateien), Vergleich nach dem Ende. Neue, geänderte oder
  gelöschte Pfade sind rot. Damit ist der Umweg über ein npm-Skript plus
  `.gitignore` geschlossen. Eine vor dem Lauf vorhandene, unveränderte
  ignorierte Datei (z. B. `.claude/settings.local.json`) bleibt grün.
  Write/Edit auf `.claude/` sperrt `Write(**/.claude/**)` davon unabhängig
  (9c gemessen). Grenzen: Beide Wege greifen nur bei Ort-B-Läufen
  (`eingaben.ortBLauf`). Der Dateisystem-Vergleich deckt nur
  `<projekt>/.claude` ab; ein verschachteltes, ignoriertes `sub/.claude/`
  sieht keiner der beiden Wege (Folgeläufe schützt der Vorstart-Scan). Ist
  `.claude` vor dem Start nicht lesbar (z. B. ein gesperrter Datei-Handle),
  fehlt die Momentaufnahme, und es gilt nur der git-Weg (Vorgabe des
  Auftrags); ist es nach dem Lauf nicht lesbar, ist der Lauf rot. Der
  Vergleich liest den ganzen Ordner ohne Größengrenze; liegt dort z. B.
  `.claude/worktrees/` mit Repo-Kopien, kostet das Zeit, und eine parallele
  Sitzung, die dort schreibt, macht den Lauf rot (fail-closed, F-843). Nach einem Serverneustart gibt es keinen laufenden
  Lauf, dessen Momentaufnahme fehlen könnte, denn ein unterbrochener Lauf
  wird nie fortgesetzt (ARCHITECTURE.md §4). In den Reallauf-Serien vom
  28./29.09.2026 schrieb die CLI nichts unter `haushaltsbuch2/.claude`
  (keine Datei jünger als 25.09.2026), eine Ausnahme ist nicht nötig.
- WS-5b lesende Bash-Befehle: Im Rotfall-Lauf 9c lief `pwd && ls -la
  .claude/skills` ohne Allowlist-Eintrag. Die CLI lässt lesende Befehle
  offenbar zu. Der Skript-Hinweis im Bestätigungsblock sagt das seit dem
  Challenger-Nachtrag 29.09.2026 ausdrücklich.
- WS-5b Vorstart-Scan: Junctions und Symlinks im Projekt werden nicht
  verfolgt. Ein `.claude` hinter einem Link außerhalb eines `.claude`-Namens
  sieht der Scan nicht; ein verschachteltes `.claude`, das selbst ein Link
  ist, zählt als Treffer. Der Scan läuft über den ganzen Baum samt
  `node_modules` (Dauer wächst mit der Projektgröße).
- WS-5b Namensliste: Die 18 eingebauten Skill-Namen (S7, CLI 2.1.284) dienen
  nur der Kollisionsprüfung. Gesperrt werden `design`/`doctor` (Reste nach
  `disableBundledSkills`). Eine neue eingebaute Fähigkeit hält das Init-Gate
  auf (F-791).
- WS-5b Identität: Projekt-Skills werden nach Namen gesperrt. Eine
  Freischaltung von Projekt-Skills/-Agents braucht vorher eine Klärung der
  Identität (F-816).
- WS-5b Anfragen fremder Seiten: F-814 (Host-Header, DNS-Rebinding) ist
  erledigt (#279): Der Host-Haken prüft vor allen Routen, zulässig ist nur
  `127.0.0.1|localhost|[::1]:<gebundener Port>` (Gate `check-f814-host`).
  Offen sind F-822 (404-Orakel des Projekt-Dispatchers vor dem Host-Haken,
  P3) und F-823 (eine ungültige absolute Request-URI beendet den
  Leitstand-Prozess, P2).
- WS-5b Lesen gesperrter Skills: „Nicht aufrufbar“ gilt für das
  Skill-Werkzeug. Den Inhalt eines gesperrten Projekt-Skills kann der Lauf mit
  Read lesen und befolgen (9c: `ponytail/SKILL.md` gelesen). Die Zählgröße im
  Reallauf erfasst das nicht; entschieden (Challenger, 29.09.2026): Read auf
  `.claude/skills|commands` wird nicht mitgezählt.
- WS-5b Init-Gate: Geprüft wird nur die erste init-Zeile. Eine spätere
  `system`/`init`-Zeile, etwa nach einer Kontext-Zusammenfassung, bleibt
  ungeprüft. `init.slash_commands` prüft das Gate gegen die gemessene
  Referenzmenge (F-831); ein unbekannter Name bricht den Lauf ab, auch wenn
  er in Wahrheit nicht aufrufbar wäre (fail-closed, dann nachmessen).
  `init.plugins` prüft das Gate nicht. Der Eintrag hat sich zwischen zwei
  CLI-Versionen umbenannt (`telemetry@builtin` → `cc-plugin-telemetry@builtin`);
  dass die Namen, die ein Plugin dem Skill-Werkzeug liefert, in
  `init.skills` oder `init.slash_commands` erscheinen und damit geprüft
  werden, ist abgeleitet, nicht gemessen. Das Gate reagiert auf die
  init-Zeile: Ein `tool_use` vor ihr beendet den Lauf, verhindert den
  Aufruf aber nicht.
- WS-5b Referenzmenge Slash-Commands (F-831, Entscheidung im Fix): Die Menge
  gilt versionsunabhängig und nach Namen. Eine Menge je CLI-Version würde bei
  jedem Update ohne neuen Namen rot und verlangte eine Messung, die nichts
  Neues zeigt; neue Namen fängt das Gate auch so. Zwei Fälle erkennt das Gate
  deshalb nicht: (1) Ein Name der Menge wird in einer neuen CLI-Version oder
  unter anderen Settings aufrufbar (`security-review` ist nur wegen
  `disableBundledSkills` verweigert). (2) Ein Nutzer-Command
  (`~/.claude/commands`), ein Plugin-Command oder ein Ort-B-Skill trägt
  denselben Namen wie ein Eintrag der Menge; welcher Eintrag dann gilt, ist
  nicht gemessen. Gegenmittel ist die Nachmessung (`nachweis-f831/`) bei
  einem CLI-Update. Die Referenzdatei wird bei jedem Ort-B-Start neu gelesen;
  fehlt sie oder ist sie kaputt, startet kein Ort-B-Lauf (fail-closed).
- WS-5b Refs: Eine Commit-SHA als Ref in `herkunft.url` ist abgelehnt (nur
  Branch/Tag). Eine Ref mit „/“ (`tree/release/v2/x`) wird als Ref `release`
  plus Unterpfad gelesen; das bleibt fail-closed, wenn es den Pfad dort nicht
  gibt.
- WS-5b cap-Pfad: Enthält der Home-Pfad Leerzeichen oder Kommas, startet kein
  Ort-B-Lauf, weil die Sperrregel sonst zerfiele (fail-closed). Bricht eine
  Skill-Installation hart ab, bleibt `cap/<id>` liegen; es gilt dasselbe wie
  in „WS-5a Neuinstallation“.
- Agents (Review-Pass 29.09.2026): Weder externe noch Projekt-Agents sind in
  der Ausführung aufrufbar, `Agent` steht nie in `--tools`. Projekt-Skills
  bleiben auch bei `FREIGEGEBEN` gesperrt. Zurückgestellt nach F-815
  (Identität F-816). E-F36-3 (Agent als Subagent-Empfehlung) ist damit nicht
  umgesetzt.
- GetTask: `GetTask` steht in `init.tools` jedes Ausführungslaufs (auch im
  Reallauf), obwohl es der Werkzeugsatz nicht nennt. Das Init-Gate prüft es
  nicht, seine Wirkung ist nicht gemessen (F-791).
- Vorstart-Scan auf ai-workforce selbst: Das Skelett trägt verschachtelte
  `.claude`-Ordner, deshalb startet auf ai-workforce kein Ort-B-Lauf (F-818,
  vor F30 zu entscheiden).
- Playwright-Navigation: Die Origin-Sperre ist ein Katalogdatum von
  `playwright-mcp` (`--allowed-origins`), keine allgemeine Regel.
  Weiterleitungen und Navigation per `browser_click`/`browser_type` auf eine
  fremde Origin sind nicht gemessen; `navigate_adressen` erfasst nur
  `browser_navigate` (F-834). `file:` blockiert Playwright (Reallauf
  `74290fb5`).
- Startvorlage (Review-Pass H-A, behoben): Der Validator lehnt `Skill`,
  `Agent`, `Task` und `mcp__…` in `erlaubte_werkzeuge` ab. Vorher hätte eine
  Projekt-Startvorlage diese Werkzeuge am Katalog, an V4a und am Init-Gate
  vorbei öffnen können.
- Bitgenau-Zusage: Für Läufe ohne Katalog-Einträge ist nur das Argv
  erzwungen (Snapshot `claude-code-gateway.test.ts`, Gates ws2 (a)/(b), ws5b
  (o)). Für den Auftragstext und für das Gateway ohne `initGate` gibt es
  keinen Rotfall gegen den Stand vor F36 (F-833).
