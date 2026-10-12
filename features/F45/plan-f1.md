# F45 WS F-1 — Plan (Fähigkeiten im Lauf: Aktivierung je Projekt, Projekt-Agents/-Skills nach Inhalt, Status)

Branch `f45/f1-faehigkeiten-im-lauf` (Basis `581269a` = main mit #322). Grundlage: Bauauftrag F-1 (Challenger,
11.10.2026), `docs/projekt/fixpaket-f45.md` (WS F, Beleg 13), F-815, F-816, F-910, F-1012, `docs/projekt/zielfassung.md`
§9.1 Nachtrag E-F36-4, §13.6 E-F36-3, E-F46-2. Spike: `state/spike-f45-f1-agents.md` (S1 hält nicht → Fallback
Sperrliste; S3: `init.plugins` nicht leer, zwei eingebaute Plugins). Server/Lauf, keine UI.

## Plan v1

### Grundsatz
- Projekt-Agents/-Skills kommen nur in einen Lauf, der heute schon Katalog-Fähigkeiten bekommt
  (`erhaeltKatalogFaehigkeiten`: `ausfuehrung` + `schreibend`, mit angezeigten Empfehlungs-ids). Jeder andere Lauf:
  unverändert.
- Ohne aktiven Projekt-Agent/-Skill und ohne Ort-B-Skill bleibt das Argv bitgleich (auch ein reiner MCP-Lauf).
- Identität nach Inhalt, beim Start im **Arbeitsordner des Laufs** neu berechnet (nicht im Projektordner).
- Lokale Aktivierungsdatei schreibt nur der Server auf direkte Eingabe; `projekte.json`, `ressourcen.json`,
  `.claude/settings.json` und Hooks bleiben unberührt (E-F46-2).

### 1 Lokale Datei `faehigkeiten.lokal.json` (Installationswurzel, gitignoriert)
- Form: `{ "faehigkeiten_lokal_schema": "v0", "projekte": { "<projekt_id>": { "aus": [...], "inhalt_freigaben": { "agent:<name>": "<sha256>", "skill:<name>": "<sha256>" } } } }`.
  `aus`-Einträge: Katalog-id (`^[a-z0-9][a-z0-9-]*$`) oder `agent:<name>` / `skill:<name>` (`<name>` nach
  `SPERRBARER_NAME` aus `ort-b-start.ts`, ohne `:`). Keine Doppelten. Schema `schemas/faehigkeiten-lokal.schema.json`,
  Validator `validiereFaehigkeitenLokal` (handgeschrieben, Muster `validiereProjekteDaten`), Beispiel unter
  `schemas/examples/` (check-datenformate).
  - Offen: Feld `faehigkeiten_lokal_schema` ist eine Ergänzung zur Auftragsform (Muster `projekte_schema`).
- Laden `ladeFaehigkeitenLokal(pfad)` → `{ zustand: 'fehlt' | 'gueltig' | 'verworfen', daten, grund? }`. Fehlt → leer
  (alles Standard = aktiv, keine Inhaltsfreigaben). Kaputt (kein JSON, Schema verletzt) → **verworfen**: eine Zeile
  auf stderr, Ergebnis wie „fehlt“, der Rest des Servers läuft (Muster `ladeProjektregisterMitLokal`).
- Schreiben nur über die POST-Endpunkte (Punkt 6): Lesen–Ändern–Schreiben (temp-Datei + rename, LF), prozessweite
  Sperre „eine Änderung zur Zeit“ (Muster `installationLaeuft`), **nie über eine verworfene Datei** (409 „Datei
  ungültig — erst von Hand reparieren“).
- `.gitignore`: `faehigkeiten.lokal.json`.

### 2 Identität (F-816) — neues Modul `src/faehigkeiten/` (index.ts, types.ts, faehigkeiten.test.ts)
- `leseProjektFaehigkeiten(wurzel)`: `.claude/agents/*.md` (nur reguläre Dateien, eine Ebene) → `{ typ: 'agent', name:
  <Dateiname ohne .md>, frontmatter_name, hash: sha256(Dateibytes) }`; `.claude/skills/<ordner>/` mit `SKILL.md` →
  `{ typ: 'skill', name: <ordner>, frontmatter_name, hash: berechneInhaltHash(ordner) }` (Ort-B-Form, Symlink → Wurf →
  Eintrag gesperrt mit Grund). Verknüpfung als Agent-Datei/Skill-Ordner → gesperrt („Verknüpfung“).
- `katalogFreigaben(katalog, installWurzel)`: für jeden **FREIGEGEBEN**-Eintrag typ `agent`/`skill` (interne Herkunft)
  Name = Dateiname bzw. Ordnername aus `herkunft.pfad`, Hash derselben Form über die Datei **der Workforce**
  (`installWurzel/<pfad>`). Nicht lesbar → kein Katalog-Hash (fail-closed: gilt nicht als freigegeben).
- `bewerteProjektFaehigkeit(eintrag, katalogHash, projektHash, aus)` → `{ freigabe: 'katalog' | 'projekt' | null,
  aktiv, grund }`:
  - freigegeben, wenn `hash === katalogHash` (Quelle katalog) oder `hash === inhalt_freigaben["<typ>:<name>"]` (Quelle
    projekt);
  - sonst gesperrt: „Inhalt weicht von der Freigabe ab“ (es gibt einen Katalog- oder Projekt-Hash, aber anderen) bzw.
    „keine Freigabe (weder Katalog noch Projekt)“;
  - zusätzlich gesperrt: Frontmatter-`name` fehlt oder ≠ Datei-/Ordnername („Name im Frontmatter weicht ab“ — die CLI
    führt den Agent unter dem Frontmatter-Namen, die Freigabe gilt dem Dateinamen); Name nicht sperrbar → Lauf startet
    nicht (fail-closed, Muster Ort-B);
  - aktiv = freigegeben ∧ `"<typ>:<name>"` ∉ aus ∧ (Quelle katalog ⇒ Katalog-id ∉ aus).

### 3 Empfehlung und Start
- **„aus“ für Katalog-Einträge** (MCP, Ort-B-Skill): `baueEmpfehlung(…, laufKontext.aus)` — ein Eintrag in `aus`
  kommt nie in „Wird genutzt“, sondern in „Passt, nicht im Lauf“ mit Grund „im Projekt deaktiviert“. Ohne `aus`
  bitgleich. Damit fehlt er in mcpConfig/allowedTools bzw. im Ort-B-Start (bestehender Weg).
- **Projekt-Agents/-Skills sind nicht Teil von „Wird genutzt“** (Obergrenze 3, Anzeige = Start mit angezeigten ids —
  die Oberfläche kennt sie erst ab F-2): sie werden beim Start im Arbeitsordner ermittelt (Punkt 2) und laufen in
  jedem Lauf mit, der Katalog-Fähigkeiten bekommt. In „Passt, nicht im Lauf“ ersetzt ein aktiver Projekt-Eintrag den
  alten Grund `SKILL_AGENT_ERST_AB_WS5`/`PROJEKT_SKILL_GESPERRT` nicht — der Eintrag wird ausgelassen; ein gesperrter
  bekommt seinen Sperrgrund (optional, `laufKontext.projektStatus`, ohne Feld bitgleich).
  - Offen: Anzeige = Start gilt für Projekt-Agents/-Skills in F-1 nur über den Hash beim Start, nicht über angezeigte
    ids (UI F-2). Alternative: in „Wird genutzt“ aufnehmen — scheitert an Obergrenze 3 und an der Kopplung an die UI.
- **Start** `loeseAusfuehrungsEingabenAuf` (nur `erhaeltKatalogFaehigkeiten`, nur mit Katalog-Kontext aus
  starteWorkflowSchritt bzw. POST /api/laeufe): neue Option `faehigkeitenKontext = { katalogFreigaben, lokal (aus,
  inhalt_freigaben), projektId }`. Im Arbeitsordner (`repoWurzel` dieser Funktion = laufWurzel) Projekt-Fähigkeiten
  lesen und bewerten. Neues `baueFaehigkeitenStart(...)` in `src/faehigkeiten/start.ts`:
  - aktive Agents: `Agent(<name>)` in erlaubte_werkzeuge (→ `--tools …,Agent`, `--allowedTools …,Agent(<name>)`),
    `--disallowedTools Agent(<n>)` für `EINGEBAUTE_AGENTS` (`claude`, `Explore`, `general-purpose`, `Plan`,
    `statusline-setup`, Spike) und jeden nicht aktiven Projekt-Agent (Datei- und Frontmatter-Name);
  - aktive Skills: `Skill(<name>)` in erlaubte_werkzeuge (→ `--tools …,Skill`), nicht in skillOverrides off/Skill(…)-Sperre;
  - immer, sobald ein aktiver Projekt-Agent/-Skill **oder** ein Ort-B-Skill im Lauf ist: `--settings` mit
    `disableBundledSkills: true`, `enabledPlugins` aller `EINGEBAUTE_PLUGINS` auf false (Spike S3),
    `skillOverrides` off für `design`, `doctor` und jeden nicht aktiven Projekt-Skill/-Command;
    `--disallowedTools Skill(<dieselben>)`, `Write/Edit(**/.claude/**)`; Vorstart-Scan (Ort-B-Funktion samt
    Skelett-Ausnahme); Init-Gate.
  - Mit Ort-B-Skills: `baueOrtBSkillStart` bleibt unverändert (Prüfungen, Kollision, Scan) — sein Ergebnis wird
    nachbearbeitet: aktive Projekt-Skills aus skillOverrides/Skill(…) nehmen, `enabledPlugins` ergänzen,
    Agent-Teil anhängen. Damit ändert sich das Argv eines Ort-B-Laufs um `enabledPlugins` (Spike Folge 3: ohne das
    bricht das Ort-B-Init-Gate an `plugin-authoring` ab).
  - Instruktionszeile an den Auftragstext (nur mit aktiven Projekt-Einträgen): „Projekt-Fähigkeiten in diesem Lauf:
    Subagenten <namen> — nur im Vordergrund aufrufen (run_in_background: false); Skills <namen>.“
  - Rückgabe zusätzlich `faehigkeitenImLauf` (Punkt 5) und die Init-Gate-Erwartung über das bestehende Feld
    `ortBLauf` (erweitert, Name bleibt; Laufdiff unter `.claude/` gilt damit auch für Projekt-Fähigkeiten-Läufe).
- Server: starteWorkflowSchritt und POST /api/laeufe laden `faehigkeiten.lokal.json` und den Katalog (bereits
  geladen in bereiteEmpfehlungFuerStartVor) und reichen `faehigkeitenKontext` durch. `starteWorkflowSchritt(` bleibt
  6-mal im Server.

### 4 Init-Gate (`pruefeInitZeile`, InitGateErwartung additiv)
- `agents?: { erlaubt, gesperrt }`: gesetzt → `Task`/`Agent` in init.tools zulässig, `init.agents ⊆ erlaubt ∪ gesperrt`,
  sonst Abbruch („init.agents enthält unbekannte Agents: …“). Nicht gesetzt → wie heute (Agent/Task in init.tools = Verstoß).
- `init.plugins` muss ein Array und leer sein, sonst Abbruch („init.plugins nicht leer: <namen> — Referenzliste
  EINGEBAUTE_PLUGINS nachmessen“). Gilt für jeden Lauf mit Init-Gate (Ort-B und Projekt-Fähigkeiten).
- `init.skills ⊆ Ort-B-Namen ∪ aktive Projekt-Skills`; slash_commands-Regel unverändert mit erweiterter Menge.

### 5 Laufakte `faehigkeiten_im_lauf`
- Beim Start eingefroren (in den AusfuehrungsEingaben, nicht mehr änderbar), von starteGateway in die Laufakte
  geschrieben (optional, append-only, Muster `beobachtung`): je Eintrag `{ id, name, typ: 'mcp'|'skill'|'agent',
  quelle: 'katalog'|'projekt', hash?, aktiv, grund?, benutzt }`.
  - katalog: MCP und Ort-B-Skill aus „Wird genutzt“ (aktiv, hash = Hash-Teil der empfehlungId bzw. inhalt_hash) und
    jeder anwendbare Katalog-MCP/-Ort-B-Skill in `aus` (aktiv false, Grund „im Projekt deaktiviert“);
  - projekt: jeder Projekt-Agent/-Skill im Arbeitsordner (aktiv oder gesperrt mit Grund).
- Join am Ende (starteGateway, aus `beobachtung`): agent → `subagent_aufrufe`, skill → `skill_aufrufe` (Name), mcp →
  `mcp_aufrufe` mit Präfix `mcp__<id>__`; `benutzt: true|false`, ohne Beobachtung `null`.
- Schema `schemas/kontrollzustand-laufakte-payload.schema.json` + `validiereLaufakteDaten`.

### 6 Endpunkte (je Projektinstanz, `/api/projekte/<id>/faehigkeiten…`; Modul `scripts/leitstand/routen-faehigkeiten.mjs`)
- `GET /api/faehigkeiten` → `{ projekt_id, lokale_datei: { zustand, grund? }, letzter_lauf_id, eintraege: [{ id, name,
  typ, quelle, installiert, freigabe, hash?, aktiv, grund?, benutzt_im_letzten_lauf }] }`. Projekt-Einträge aus dem
  **Projektordner** (Anzeige), Katalog aus der Installation; „benutzt im letzten Lauf“ aus `faehigkeiten_im_lauf` der
  Laufakte des jüngsten Ausführungsschritts (Muster `findeLetzteRealeBesetzung`), sonst null. Nicht im Poll.
- `POST /api/faehigkeiten/aktivierung` `{ eintrag, aktiv: boolean }` → 200 `{ aus }`; 400 Form (Katalog-id unbekannt
  oder typ worker; `agent:`/`skill:`-Form verletzt), 409 Sperre/Datei verworfen, 500 Schreiben. Wirkt ab dem
  nächsten Lauf.
- `POST /api/faehigkeiten/freigabe` `{ eintrag: 'agent:<n>'|'skill:<n>', hash }` → Hash im Projektordner neu
  berechnen; ≠ angezeigter Hash → 409 („Inhalt hat sich seit der Anzeige geändert“, Muster eintragHash); Datei fehlt →
  404; sonst `inhalt_freigaben[eintrag] = hash`. Die Freigabe gilt für genau diesen Inhalt; im Lauf zählt der Hash im
  Arbeitsordner.
- CSRF/Host: zentrale Haken (F-813/F-814) greifen vor jeder Route.

### 7 Register, Textfix, Akte
- Findings K15–K18 als F-IDs ab F-1049 (K-Nummer im Titel), F-859 Zuordnung → F30, F-815/F-816 erledigt,
  F-1012/F-910 teilweise; neue Findings aus dem Bau (Ort-B + plugin-authoring, Grenzen).
- `harness-abgleich/standard.json`: `fehlt_im_ablauf.begruendung` → „Kontrolltiefe fast-lane (Router) — bewusst ohne
  Review; für den Referenzauftrag R nicht zulässig“ (alle Vorkommen).
- `features/F45/feature.md`: Stand F-1, F-2 als nächster Schritt.

### Tests
- `src/faehigkeiten/faehigkeiten.test.ts`: Validator (gültig/kaputt), Laden (fehlt/kaputt → verworfen), Hash-Identität
  (gleich Katalog / abweichend / Projekt-Freigabe / Frontmatter-Name abweichend), aus (Agent/Skill), baueFaehigkeitenStart
  (Argv-Bausteine, Ort-B-Nachbearbeitung), Join benutzt.
- `src/ressourcen/ressourcen.test.ts`: baueEmpfehlung mit aus (MCP, Ort-B-Skill) und ohne (bitgleich).
- `src/claude-code-gateway`: pruefeInitZeile agents/plugins rot+grün; Laufakte mit faehigkeiten_im_lauf (Validator).
- Server (`scripts/leitstand/routen-faehigkeiten.test.mjs`): GET, aktivieren/deaktivieren, Freigabe mit Hash-Wechsel → 409,
  kaputte Datei → GET zeigt verworfen, POST 409.
- loeseAusfuehrungsEingabenAuf: ohne aktive Fähigkeiten bitgleich; mit aktivem qa Agent im Argv, Sperrliste.
- Reallauf haushaltsbuch2 (oder Testprojekt): qa aktiv → aufgerufen; qa aus → nicht verfügbar.

### Offene Punkte (nicht stillschweigend entschieden)
1. **Kaputte lokale Datei = verworfen = alles aktiv.** Ein von Stefan deaktivierter MCP wäre dann wieder aktiv
   (fail-open für „aus“). Alternative: kaputte Datei → Projekt-Agents/-Skills gesperrt und Katalog-Fähigkeiten aus
   (fail-closed für den Lauf). Auftrag sagt „verworfen, Rest läuft“.
2. **Projekt-Agents/-Skills ohne Anzeige-Bindung** (siehe Punkt 3) — Hash beim Start ist die einzige Bindung bis F-2.
3. **Alle freigegebenen + aktiven Projekt-Agents/-Skills im Lauf, unabhängig von `anwendbar_wenn`** (VS-Code-Parität,
   Wortlaut Auftrag Punkt 3). Folge: In Skelett-Projekten sind qa, code-reviewer, architecture-advisor und 7 Skills ab
   Standard aktiv; das Argv solcher Läufe ändert sich gegenüber heute.
4. **Ort-B-Argv ändert sich** um `enabledPlugins` (Spike Folge 3) — „Ort-B-Prüfung unverändert“ gilt für die Prüfungen,
   nicht für die Settings.
5. **Init-Gate-Referenzlisten** `EINGEBAUTE_AGENTS`/`EINGEBAUTE_PLUGINS` driften mit der CLI (fail-closed über das Gate).
6. **Bytes-Hash und Zeilenenden**: Worktree-Checkout mit `core.autocrlf` kann andere Bytes erzeugen als die Datei der
   Workforce → Projekt-Agent gilt dann als abweichend (fail-closed, sichtbar am Grund).

## Advisor-Pass (frischer Kontext, architecture-advisor, 12.10.2026)

Urteil: **Nicht freigegeben** (Architektur trägt; Entscheidung + Sicherheitslücken vor dem Bau). Rollengrenze: nur
Read/Grep/Glob, kein `npm run check`, keine CLI-Messung, keine Hash-Berechnung.

Vor Baubeginn:
1. „Ohne Datei bitgleich“ und E-F36-3 (Subagent-*Empfehlung* über `anwendbar_wenn`) werden durch „alle freigegebenen
   Projekt-Einträge standardmäßig aktiv“ verletzt; Skelett-CLAUDE.md („Prüfrollen in der Ausführung nicht
   aufrufbar“) und `harness-abgleich/standard.json` (code-reviewer „statt Subagent im Lauf“) widersprächen dem Lauf.
   → Entscheidung Stefan.
2. Frontmatter ungeprüft: Agent-/Skill-Dateien können Felder tragen, die Schutzschichten umgehen könnten
   (`permissionMode`, `mcpServers`, `hooks`, `skills`, `allowed-tools`, `context: fork` — [Annahme, CLI-Doku]).
   → Positivliste als Sperrgrund (Agent: name, description, tools, model, color; `tools` Pflicht, ohne Agent/Task/Skill;
   Skill: name, description).
3. Identität über Namen umgehbar: Unterordner in `.claude/agents`, doppelte Frontmatter-Namen, Kollision mit
   eingebauten Namen. → rekursiv lesen, Verknüpfung = Lauf startet nicht, aktive Namen eindeutig (ohne Groß/Klein),
   eingebaute Namen gesperrt, Frontmatter-Name nur schlicht.
4. Kaputte lokale Datei öffnet Sperren („aus“ fällt weg). → Entscheidung Stefan.
5. Lauf kann sich selbst freigeben: Datei an der Installationswurzel liegt für POST /api/laeufe (ai-workforce) im
   Schreibbereich `Edit(./**)`; POST-Routen von einem Lauf aus erreichbar. → Ablage außerhalb jedes Repos + Laufsperre
   (`pruefeGlobaleLaufSperre`) auf den POST-Routen. → Entscheidung Stefan (Ablageort).

Darf mitlaufen: 6 Hash gegen Snapshot im Controller vor dem Start; 7 Init-Gate fehlende Felder = Verstoß, Gates
check-f36-ws5b (c)/(m) anpassen, neues Gate Rot/Grün Agent-Sperre, Controller-Mapping `agents`; 8 echter Ort-B-Lauf
als Beleg für `enabledPlugins`; 9 „versucht“ gegen „benutzt“ (is_error) + Zahl verweigerter Aufrufe; 10 Cache-Schlüssel
der Anzeige um die lokale Datei; 11 keine Schreibsperre (synchron); 12 ein gemeinsamer Leser für Skill-/Command-Namen;
13 Skelett-Agents bei Installation = Projekt; 14 `herkunft.pfad` exakt prüfen; 15 Referenzlisten als JSON; 16 Bytes-Hash
bleibt, Grund nennt beide Präfixe; 17 Anzeige-Bindung Projekt-Einträge ausdrücklich bis F-2; 18 Fortsetzungsstarts
ohne Fähigkeiten benennen; 19 ein Routenpfad, projekt_id nur aus der Instanz.

## Entscheidungen Stefan (12.10.2026, nach dem Advisor-Pass)
- **E-F45-6 = Opt-in je Projekt:** Projekt-Agents/-Skills sind nur aktiv, wenn Stefan sie je Projekt einschaltet
  (`an`). Ohne Datei bitgleich wie heute. MCP/Ort-B-Skills bleiben Standard aktiv, abschaltbar über `aus`.
- **E-F45-7 = kaputte Datei sperrt:** Ist `faehigkeiten.lokal.json` vorhanden, aber nicht lesbar oder ungültig, bricht
  jeder Start mit Katalog-Fähigkeiten ab („reparieren oder löschen“); Server und alle anderen Läufe laufen weiter.
- **E-F45-8 = Ablage `~/.ai-workforce/faehigkeiten.lokal.json`:** außerhalb jedes Repos und Arbeitsordners
  (Ausnahme ARCHITECTURE.md §2); POST-Routen 409, solange ein Lauf aktiv ist.

## Plan v2 (gilt; Abweichungen von v1)
1. **Datei** `~/.ai-workforce/faehigkeiten.lokal.json` (Option `faehigkeitenLokalPfad`, Tests überschreiben), nicht im
   Repo, kein `.gitignore`-Eintrag. Form `{ faehigkeiten_lokal_schema: 'v0', projekte: { <id>: { an?: ['agent:<n>'|'skill:<n>'],
   aus?: [<katalog-id>|'agent:<n>'|'skill:<n>'], inhalt_freigaben?: { 'agent:<n>'|'skill:<n>': <sha256> } } } }`.
   `ladeFaehigkeitenLokal` → `fehlt | gueltig | ungueltig` (auch EBUSY o. Ä. = ungueltig). ungueltig → Start mit
   Katalog-Kontext bricht ab; GET zeigt den Grund; POST 409 („erst reparieren oder löschen“). Schreiben synchron
   (temp + rename, LF), keine Prozesssperre (A11), POST zusätzlich `pruefeGlobaleLaufSperre` (409 bei aktivem Lauf).
2. **Aktiv:** Katalog-MCP/-Ort-B-Skill aktiv ⇔ id ∉ aus. Projekt-Agent/-Skill aktiv ⇔ `<typ>:<n>` ∈ an ∧ ∉ aus ∧ freigegeben
   ∧ keine Sperre aus 3. Aktivieren eines Katalogeintrags vom typ agent/skill (interne Herkunft) per id → 400 („als
   agent:/skill:<name> schalten“); worker → 400.
3. **Identität und Sperrgründe** (`src/faehigkeiten/`):
   - `.claude/agents` rekursiv; Agent-Name = Frontmatter-`name` (schlicht, `^[A-Za-z0-9][A-Za-z0-9._-]*$`, genau einmal);
     Datei liegt nicht direkt unter `agents/` oder Stamm ≠ name → gesperrt. Verknüpfung irgendwo unter
     `.claude/agents|skills` → Lauf startet nicht (nur wenn ≥1 Projekt-Eintrag eingeschaltet ist).
   - Skills `.claude/skills/<ordner>/SKILL.md`, name = Ordnername (sonst gesperrt). Skill-/Command-Namen für Sperren nur
     über `leseProjektSkillNamen` (A12).
   - Frontmatter-Positivliste (A2): Agent {name, description, tools, model, color}, `tools` Pflicht, jeder Eintrag ∈
     Werkzeugnamen des Laufs ohne Agent/Task/Skill; Skill {name, description, argument-hint, license}. Fortsetzungszeilen
     (eingerückt) nur unter description. Sonst gesperrt mit Feldnamen im Grund.
   - Eindeutigkeit (A3): ein eingeschalteter Name, der (ohne Groß/Klein) mehrfach vorkommt (zweite Agent-Datei,
     Frontmatter-Name, Command, anderer Skill-Ordner), → Lauf startet nicht; Name eines eingebauten Agents/Skills
     (Referenzliste, `EINGEBAUTE_SKILLS_S7`, `EINGEBAUT_REST_SKILLS`) → gesperrt.
   - Katalog-Hash nur, wenn `herkunft.pfad` exakt `.claude/agents/<n>.md` bzw. `.claude/skills/<n>` (A14). Grund
     „Inhalt weicht von der Freigabe ab (Datei <12 hex>…, Freigabe <12 hex>…)“ (A16).
   - Installation = Projekt (A13): Agent-Namen aus `vorlagen/projekt-skelett/.claude/agents` gesperrt, außer gleicher
     Name eingeschaltet → gleicher Hash Pflicht, sonst Lauf startet nicht.
4. **Referenzlisten** `src/faehigkeiten/eingebaut-referenz.json` `{ cli_version, agents, plugins }` (A15), je Start gelesen;
   nicht lesbar → Start mit Fähigkeiten bricht ab.
5. **Empfehlung:** `aus` über `zusatz`/laufKontext an Anzeige und Start; Cache-Schlüssel um mtime+Größe der lokalen Datei
   (A10). Projekt-Einträge nicht in „Wird genutzt“; Anzeige-Bindung bis F-2 ausdrücklich offen (A17, F-2 muss eine
   Kennung im Start-Body vergleichen). Fortsetzungsstarts ohne angezeigte ids laufen ohne Katalog- und Projekt-Fähigkeiten
   (wie heute, A18).
6. **Start:** wie v1 §3; zusätzlich Controller vergleicht vor dem Spawn die Hashes von `faehigkeiten_im_lauf` (Projekt) mit
   `erfasseClaudeOrdner` → Abweichung: Abbruch vor dem Start (A6). POST /api/laeufe: gehasht wird im Projektordner (=cwd).
   Grenze: Änderung während des Laufs fängt nur der Laufdiff (rot).
7. **Init-Gate:** fehlendes/nicht-Array `init.agents` (bei gesetztem `agents`) und `init.plugins` = Verstoß (A7);
   Controller-Mapping um `agents`.
8. **Laufakte:** `beobachtung.fehlgeschlagene_aufrufe` (optional, `Agent:<n>`/`Skill:<n>` mit `is_error`), je Eintrag in
   `faehigkeiten_im_lauf`: `versucht` (Aufruf da) und `benutzt` (≥1 Aufruf ohne Fehler), ohne Beobachtung null (A9).
9. **Routen** `scripts/leitstand/routen-faehigkeiten.mjs`, je Instanz `GET /api/faehigkeiten`, `POST
   /api/faehigkeiten/aktivierung`, `POST /api/faehigkeiten/freigabe`; von außen `/api/projekte/<id>/faehigkeiten…`;
   projekt_id nur aus der Instanz (A19).
10. **Tests/Gates zusätzlich:** check-f36-ws5b-skill (c) `enabledPlugins`, (m) Init-Zeilen mit `plugins: []`; neues Gate
    `scripts/check-f45-f1-faehigkeiten.mjs` mit Rot/Grün (Agent-Sperre im Argv, Init-Gate agents/plugins, Opt-in bitgleich,
    Frontmatter/Name-Sperren); Reallauf zusätzlich ein Ort-B-Lauf (`init.plugins = []`, kein `plugin-authoring`) (A8).
11. **Doku:** ARCHITECTURE.md §2 Ausnahme Ablageort; E-F45-6/7/8 in der Akte.

## Delta-Advisor-Pass auf Plan v2 (frischer Kontext, 12.10.2026)
Urteil: **Freigegeben mit Hinweisen.** A1–A19 und E-F45-6/7/8 schlüssig umgesetzt. Übernommen in den Bau (v2.1):
- B1 Ein Lauf kann über npm-Skripte `~/.ai-workforce/faehigkeiten.lokal.json` direkt schreiben (ADR
  ausfuehrung-bash-allowlist: npm run check:* führt beliebigen Code aus). → Controller hasht die Datei vor und nach dem
  Lauf; Abweichung = Lauf rot (Muster `claude_ordner_veraendert`). Grenze in der Akte: ein abgekoppelter Prozess, der
  erst nach Laufende schreibt, bleibt unentdeckt.
- B2 Strenge Frontmatter-Grammatik: Begrenzer genau `---`; jede Zeile ist `<feld>: <wert>` mit Feld aus der
  Positivliste (höchstens einmal, ohne Anführungszeichen am Schlüssel) oder eine eingerückte Fortsetzung unter
  `description`, die nicht wie ein Schlüssel aussieht; leere Zeilen nur als Fortsetzung. Alles andere → gesperrt.
  `tools` ist eine Komma-Liste schlichter Namen (keine YAML-Liste/Klammern).
- B3 Hat irgendeine Agent-Datei einen nicht sperrbaren Namen (Stamm oder Frontmatter), startet ein Lauf mit ≥1 aktivem
  Agent nicht. Sperrliste (--disallowedTools) und Gate-`gesperrt` aus derselben Quelle.
- B4 `an` nur `agent:`/`skill:`, `aus` nur Katalog-ids (Validator lehnt anderes ab). POST aktivierung: Projekt-Eintrag →
  `an` setzen/entfernen; Katalog-id (MCP/extern skill) → `aus` entfernen/setzen; worker, interne agent/skill-id → 400.
- B5 Cache-Schlüssel enthält `aus` als Wert (fehlende Datei = leere Liste, kein null-Schlüssel).
- B6 `pruefeGlobaleLaufSperre` an das Routen-Modul übergeben; Test „POST bei aktivem Lauf → 409“.
- B7 Kein Standardpfad ins echte Home im Request-Handler: ohne `faehigkeitenLokalPfad` gilt „keine Datei“; nur der
  CLI-Bindeblock setzt `~/.ai-workforce/faehigkeiten.lokal.json`. POST ohne Pfad → 500 mit Grund.
- B8 `aus` nach der Anzeige geändert → Start bricht fail-closed ab (die neu berechnete „Wird genutzt“-Menge weicht ab).
- B9 Reallauf: Agent-Aufruf mit anderer Groß-/Kleinschreibung beobachten (Init-Gate/Sperre), soweit im Lauf möglich.
- B10 GET-Grund bei kaputter Datei nennt, dass Läufe mit Fähigkeiten in allen Projekten stehen.

## Nachtrag v2.2 — Bau und Korrekturrunde (12.10.2026)
Abweichungen vom Plan v2 (bewusst):
- §8: statt `versucht`/`benutzt` und `beobachtung.fehlgeschlagene_aufrufe` trägt `faehigkeiten_im_lauf` je Eintrag
  `aufrufe`/`fehlgeschlagen` (benutzt = aufrufe − fehlgeschlagen > 0) und `fremde_aufrufe` (Aufrufe ohne Eintrag, z. B.
  gesperrte eingebaute Agents); `beobachtung` bleibt unverändert. Die Status-Route liefert je Eintrag `letzter_lauf:
  { im_lauf: aktiv | nicht_aktiv | nicht_im_lauf | ohne_erfassung, benutzt }`.
- „im Projekt deaktiviert“ steht im Feld `deaktiviert` der Empfehlung (ohne Obergrenze), nicht in „Passt, nicht im Lauf“.
- Die Empfehlungs-Tests mit `aus` liegen in `src/faehigkeiten/faehigkeiten.test.ts`.
- Im Installationsprojekt selbst ist ein aktiver Projekt-Skill mit Skelett-Namen zulässig, wenn der Skelett-Ordner denselben
  inhalt_hash hat (Muster Skelett-Agents); sonst Start abgelehnt.
Prüfpass: code-reviewer „nicht freigegeben“ (1 hoch: Name aus verworfenem Frontmatter fehlte in Sperrliste/Eindeutigkeit),
qa „freigegeben mit Hinweisen“. Korrekturrunde: nachsichtiger Namensleser `alleFrontmatterNamen` für Sperrliste,
Eindeutigkeit und B3; Skelett-Prüfung in beiden Zweigen; lstat in try, Verknüpfung als `.claude/agents|skills` = Hindernis;
Referenzliste nur bei Bedarf Pflicht; lokale Datei je Start einmal gelesen; Pfad der lokalen Datei für jeden schreibenden
Lauf (Vorher/Nachher-Hash); `ID_MUSTER`/`SHA256_MUSTER` importiert; `model` nur `inherit`; eingeschaltet, aber im
Arbeitsordner nicht aktiv → Start abgelehnt (QA 1); Einschalten nur für vorhandene Einträge, Schreibweise wird genannt (QA 2);
Init-Gate verlangt eingeschaltete Agents/Skills im init (QA 4); `letzter_lauf` eindeutig (QA 5); Reallauf L3 ohne Ort-B (QA 6).
Offen als Befund: QA 8 (Join nach Groß-/Kleinschreibung, `fremde_aufrufe` nicht angezeigt), QA 9 (GET prüft gegen den
Werkzeugsatz `schreibend`), B8 ohne eigenen Test → F-1054/F-1055.
Delta-Nachpass code-reviewer (frischer Kontext): „freigegeben mit Hinweisen“; Rest von Befund 1 (Name in der Folgezeile → nicht sperrbar) und 3 (exaktes Frontmatter-Ende) noch in der Korrekturrunde geschlossen, 2/4/5 → F-1055 (5)–(7).
