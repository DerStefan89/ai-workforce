# F45 F-3b — Plan (Plugins aus Stefans Claude Code im Workforce-Lauf)

Branch `f45/f3b1-plugins-freigabe`, Basis `origin/main` `8ac4647` (F-3a-2, #334). Grundlage: Auftrag F45 F-3b (14.10.2026),
Fixpaket-Zeile F-3b, Findings F-1090, F-1091, F-1093, F-1051, F-910, Spike `features/F45/nachweise/f3a/spike.md`.
Schnitt (Auftrag): **F-3b-1** Freigabe, gefilterte Kopie, Zuordnung je Rolle, Risiko-Fakten, Drift — **kein Lauf ändert
sich** (kein `--plugin-dir`, `init.plugins` weiter `[]`); **F-3b-2** Plugins im Lauf (nur geplant, eigener Auftrag).

## Entscheidungen (aus dem Auftrag, gehen in Register und Akte)
- **Stefan 14.10.2026:** Plugin-Skills/-Agents sollen im Workforce-Lauf nutzbar sein; Zuordnung je Rolle.
- **E-F3b-1 = A** (Stefan): Plugin-Hooks laufen nie im Lauf. Die Workforce nennt die zugeordneten Skills über die
  bestehende Fähigkeiten-Instruktion im Auftrag (`src/faehigkeiten/start.ts`, Zeile `instruktion`), statt eines
  SessionStart-Hooks wie bei superpowers.
- **E-F3b-2 = A** (Stefan): Brainstorming/Coach erst mit B5a (der Coach läuft über `starteRollenChatLauf`, nicht über
  den Fähigkeiten-Start) — `product-coach` ist in F-3b keine zuordenbare Rolle.
- **Challenger-Empfehlungen (übernommen):** (1) gefilterte, gepinnte Kopie je Plugin (Muster Ort-B) — nur `skills/`,
  `agents/`, `commands/` ohne `allowed-tools`; Hooks, MCP, LSP nie (Anzeige „nicht übernommen“ mit Grund; MCP später mit
  B2b); Manifest der Kopie minimal neu, Inhalts-Hash der Kopie. (2) Freigabe nur mit Prüfbericht über die Kopie
  (Muster F-2b-2/K20). (3) Zuordnung je Projekt + Rolle additiv in der lokalen Fähigkeiten-Datei, Standard leer; im Lauf
  technisch nur die zugeordneten Bestandteile (Lauf-Kopie, F-3b-2). (4) Risiko-Fakten zusätzlich aus Skill-/Agent-/
  Command-Texten und aus `allowed-tools`/`tools` im Frontmatter. (5) Maßgeblich ist die Workforce-Freigabe, nicht
  `enabled` in Claude Code → F-1093 (2) entfällt (begründet schließen). (6) Nur Worker `claude-code`; Codex, Jarvis,
  Coach unverändert.

## Befunde vorab (gelesen 14.10.2026, nur lesend)
- superpowers 6.2.0 bei Stefan: Skills mit Frontmatter nur `name` + `description` (14 SKILL.md, Name = Ordnername); 1
  SessionStart-Hook. Texte nennen `git push`/`git merge` (finishing-a-development-branch), `git worktree`
  (using-git-worktrees), Subagenten (subagent-driven-development, dispatching-parallel-agents) — Beispiele für
  Risiko-Fakten (4), keine Sperrliste.
- Der Prüflauf F-2b-2 (`starteEignungspruefung`, Rolle `eignungspruefung`, Werkzeugsatz exakt Read/Grep/Glob, Prüfordner
  per `--add-dir`) prüft schon heute einen **lokalen Ordner**: nur das Holen (`holeSubjekt`: git/npm in eine Temp-Wurzel)
  ist quellspezifisch. Er ist also wiederverwendbar, wenn das Holen austauschbar wird (siehe B).
- Die lokale Datei `~/.ai-workforce/faehigkeiten.lokal.json` wird von **allen** Checkouts geteilt; ihr Validator lehnt
  unbekannte Felder ab (`validiereFaehigkeitenLokal`). Folge für additive Felder: siehe Risiko R1.
- Ort-B liegt unter `capWurzel` = `~/.ai-workforce/cap` (`scripts/leitstand-server.mjs`, Option `capWurzel`), außerhalb
  jedes Repos und außerhalb `~/.claude`.

## Plan v1 — F-3b-1 (Bau)

### A Gefilterte, gepinnte Kopie — neues Modul `src/plugin-kopie/` (rein + dünne I/O-Hülle)
- `projiziereKopie(plugin, dateien)` **rein**: Eingabe = gelesener Plugin-Eintrag (F-3a-Leser) + Dateiliste der
  Standardordner (rel. Pfad → Bytes, Art). Ausgabe: `{ dateien, manifest, kopie_hash, uebernommen[], nicht_uebernommen[] }`.
  Regeln (fail-closed, jede Ablehnung mit Grund je Bestandteil):
  - **Skills:** nur `skills/<ordner>/SKILL.md` direkt; Frontmatter über den strengen Leser `leseFrontmatterStreng`
    (F-1) mit Positivliste `name, description, license, argument-hint`; Name = Ordnername, `NAME_MUSTER`. Jedes
    andere Feld (u. a. `allowed-tools`, `hooks`, `model`, `context`, `agent`) → nicht übernommen.
  - **Agents:** nur `agents/<n>.md` direkt; Positivliste `name, description, tools, model, color`; `model` nur
    `inherit` (E-185); `tools` (falls da) schlichte Komma-Liste ohne `Agent`/`Task`/`Skill` (Muster F-1
    `VERBOTENE_AGENT_WERKZEUGE`); `hooks`, `permissionMode`, `mcpServers`, `skills` … → nicht übernommen.
  - **Commands:** `commands/**/*.md`; ohne Frontmatter zulässig; mit Frontmatter Positivliste `description,
    argument-hint, disable-model-invocation`; `allowed-tools` → nicht übernommen (Spike S1: erweitert den Werkzeugsatz).
  - **Nie:** `hooks/`, `.mcp.json`, `.lsp.json`, `plugin.json`-Felder `hooks`/`mcpServers`/`lspServers` (eingebettet
    oder Pfad), plugin.json-Pfade für `skills`/`agents`/`commands` außerhalb der Standardordner („nur Standardordner“).
    Grund in der Anzeige: Hooks „laufen nie im Workforce-Lauf“, MCP „aus Plugins noch nicht“, LSP „nicht vorgesehen“.
  - **Inhalt eines übernommenen Bestandteils:** nur reguläre Dateien (kein Link/Junction), keine Einträge mit den
    Sperrnamen `.claude*`, `CLAUDE.md`, `hooks.json`, `.mcp.json`, `.lsp.json`, `plugin.json`, `marketplace.json`,
    `settings*.json` irgendwo darunter, Grenzen Dateien/Bytes wie `STANDARD_HASH_GRENZEN` — sonst der ganze Bestandteil
    nicht übernommen. Bytes unverändert (Hash je Datei = Quelle, nachvollziehbar).
  - Wurzeldateien: nur `LICENSE*`/`COPYING*` (für die Lizenzprüfung im Bericht); alles andere fehlt in der Kopie.
  - **Manifest** `.claude-plugin/plugin.json` neu: nur `name` (Pflicht, `NAME_MUSTER` — sonst Plugin nicht kopierbar),
    `version`, `description`, `license` (nur Strings), JSON mit LF. Das Präfix `<name>:` im Lauf (F-3b-2) kommt hieraus.
  - `kopie_hash` = `hashAusDateien` über alle Dateien der Kopie inkl. Manifest (Form `berechneInhaltHash`).
- `leseKopieQuelle(plugin)` I/O, nur lesend (readFile/readdir/lstat) aus dem Plugin-Ordner.
- `schreibeKopie(capWurzel, pluginId, projektion)`: Ziel `<capWurzel>/plugins/<pluginId>/<kopie_hash>/`
  (inhaltsadressiert, nie überschrieben): erst Temp-Geschwister, dann `rename`; existiert das Ziel mit gleichem Hash →
  wiederverwenden; mit anderem Hash → Fehler „Kopie verändert“, nichts überschrieben (Löschen nur durch Stefan).
- `pruefeKopie(capWurzel, pluginId, kopie_hash)`: Ordner vorhanden und Hash gleich (für Drift und F-3b-2).
- Kein Lauf importiert `src/plugin-kopie` (Gate). Nichts unter `~/.claude` wird geschrieben (Gate, Prüfsumme).

### B Prüfbericht über die Kopie — bestehenden Prüflauf wiederverwenden
- Begründung der Wiederverwendung: Rolle, Werkzeugsatz, P5-Vertrag, Schema, Ablage, Zustands-Abfrage
  (GET `/api/sammlung/pruefung/<laufId>`) sind quellneutral; nur das Holen ist es nicht.
- `starteEignungspruefung(res, subjekt, quelle, herkunft, ausnahme, holen)`: `holen` statt `runner` — bestehender
  Aufruf übergibt `() => holeSubjekt(quelle, runner)` (Verhalten bitgleich), der Plugin-Weg übergibt
  `() => holePluginKopie(…)`: Kopie schreiben/prüfen (A), dann **Temp-Kopie** davon als Prüfordner (die cap-Kopie
  selbst steht nie im `--add-dir` eines Laufs), Fakten über `sammleFakten` (`src/sammlung/inhalt.ts`), Dateiliste mit
  sha256.
- Prüfbericht additiv: `PruefQuelle` + `{ art: 'plugin', plugin_id, kopie_hash, quelle_hash, version, commit }`;
  `versionVon` → `kopie_hash`; `PRUEF_TYPEN` + `plugin` (Ergebnis-Schema `typ`-enum additiv); Regel „katalog_id oder
  sammlung_id“ gilt nicht für `quelle.art = plugin`; `waehleBericht` passt für `plugin` über `plugin_id` + `kopie_hash`.
  Schlüssel `p-<slug(pluginId)>`. Schemas `ergebnis-eignungspruefung` und `kontrollzustand-pruefbericht-payload`
  additiv, Beispiele ergänzt.
- Auftragstext (`baueAuftragstext`): Pin-Zeile für `plugin`, dazu die Liste „nicht übernommen (Grund)“ und die
  Risiko-Fakten als Information; Prüfliste unverändert (Hooks/Hintergrund prüft er an der Kopie, die keine hat).
- Route POST `/api/plugins/pruefung { plugin_id, kopie_hash }` — nur Workforce-Instanz (wie die Sammlung), D13,
  Laufsperre; liest den Bestand frisch, projiziert, `kopie_hash` ≠ angezeigt → 409 „neu laden“. 202 + `laufId`.

### C Freigabe, Rücknahme, Zuordnung — lokale Fähigkeiten-Datei additiv
- Schema `faehigkeiten-lokal` v0 additiv (Validator + JSON-Schema):
  - oben `plugin_freigaben: { "<plugin-id>": { kopie_hash, quelle_hash, pruefbericht: "<artefakt_id>@<version>",
    freigegeben_am } }` — die Freigabe gilt für den Inhalt, nicht je Projekt;
  - je Projekt `plugin_zuordnung: { "<rolle>": ["skill:<plugin-id>:<name>" | "agent:<plugin-id>:<name>"] }`
    (sortiert, ohne Doppelte; leer = fehlt). Standard leer.
- Rein: `setzePluginFreigabe`, `entfernePluginFreigabe` (Rücknahme; Zuordnungen bleiben gespeichert, wirken aber ohne
  gültige Freigabe nicht und sind so markiert), `aenderePluginZuordnung`.
- Zuordenbare Rollen = aus `ROLLENVERTRAEGE`: Worker `claude-code` erlaubt, ohne `jarvis`, `product-coach` (E-F3b-2),
  `router`, `scout`, `eignungspruefung` → `architekt`, `architecture-advisor`, `code-reviewer`, `qa`, `ausfuehrung`
  (Liste im Code mit Grund je Ausschluss; Gate: jede Rolle existiert im Rollenvertrag).
- Routen (alle Instanzen; Laufsperre, CSRF/Host zentral, Wächter und `stand` wie F-1/F-2a über `aendereLokaleDatei`):
  - POST `/api/plugins/freigabe { plugin_id, kopie_hash, stand }` → 409 ohne geltenden Prüfbericht zu genau diesem
    `kopie_hash` (oder NICHT_GEEIGNET), bei Drift (aktuelle Projektion ≠ `kopie_hash`), bei verändertem/fehlendem
    cap-Ordner, bei mehrdeutiger id (gleiche id in mehreren Scopes, F-1091 (4)).
  - POST `/api/plugins/freigabe/ruecknahme { plugin_id, stand }`.
  - POST `/api/plugins/zuordnung { plugin_id, rolle, typ, name, an, stand }` → 409 ohne gültige Freigabe oder wenn der
    Bestandteil nicht übernommen ist; 400 bei unbekannter Rolle/Typ.
- GET `/api/plugins` additiv je Plugin: `kopie` (übernommen / nicht übernommen mit Grund, `kopie_hash` der aktuellen
  Projektion), `freigabe` (`keine` | `freigegeben` | `veraltet` | `kopie_veraendert`, mit Hash, Datum, Bericht-Kurzform),
  `pruefbericht` (neuester zu diesem Plugin: Urteil, Befunde, Auflagen, Zusammenfassung, für welchen Hash),
  `zuordnung` dieses Projekts; oben `rollen` (zuordenbar) und `lokale_datei` (Stand-Hash, gesperrt mit Grund). Weiter
  nur lesend unter `~/.claude`; maskiert wie bisher.

### D Risiko-Fakten aus Texten und Frontmatter (src/claude-plugins, additiv)
- Neue Risiko-Arten (Fakten, keine Sperrliste): `text_veroeffentlichen` (`git push`, `git merge`, `gh pr …`),
  `text_worktree` (`git worktree add`), `text_subagenten` (Erwähnung von Subagenten bzw. Task-/Agent-Werkzeug),
  jeweils mit Datei und erster Zeile + Zahl der Treffer; `agent_werkzeuge` (Agent-`tools` außerhalb des Werkzeugsatzes
  bzw. ohne `tools` = erbt alle Werkzeuge). Wortgrenzen (kein `ghost`→`gh`). Gelesen werden die `.md`-Dateien der
  Bestandteile (SKILL.md und weitere `.md` im Skill-Ordner, Agent-/Command-Datei).
- Anzeige: i18n de/en/tr/ru (dynamische Schlüssel ergänzt).

### E Leitstand (Reiter „Plugins aus deinem Claude Code“)
- Detail additiv, drei Abschnitte: **In die Workforce übernommen** (übernommen / nicht übernommen mit Grund);
  **Prüfung und Freigabe** (Stand, Prüfbericht mit Urteil/Befunden/Auflagen, „Kopie prüfen“ nur in der Workforce-
  Ansicht, „Freigeben“ nur mit passendem Bericht, „Freigabe zurücknehmen“, Hinweis „veraltet: Quelle geändert — neu
  prüfen“ bzw. „Kopie verändert“); **Zuordnung je Rolle** (je Skill/Agent Kästchen je Rolle, Standard leer, nur mit
  gültiger Freigabe bedienbar, Hinweis „wirkt im Lauf erst mit dem nächsten Schritt“, „nur mit Claude Code“).
- Der feste Hinweis „Noch nicht im Workforce-Lauf nutzbar …“ wird zu „Im Workforce-Lauf erst mit dem nächsten Schritt
  wirksam — Freigabe und Zuordnung kannst du schon festlegen.“
- Zustände: Default / leer / ladend / Fehler / Prüfung läuft / gesperrt (Lauf aktiv, Datei ungültig, fremd geändert).
  Jede Zeichenkette der Route nur über `escapeHtml` (XSS-Rotfall für Prüfbericht- und Risiko-Texte). Mobile 390: Kästchen
  als umbrechende Liste je Bestandteil, keine breite Matrix. Keine neuen Farben/Schatten (Tokens).
- Render-Nachweis `npm run render-nachweis`-Muster (Skript unter `features/F45/nachweise/f3b1/render/`): 1440/390,
  hell/dunkel, ru 390, nur Fixture-Bestand (keine persönlichen Pfade/IDs), Persona-Schaltfläche ausgeblendet (F-1093 (5)).

### F Gate `scripts/check-f45-f3b1-freigabe.mjs` (in `npm run check` nach f45-f3a2)
Grün + kalibrierter Rotfall je Prüfung:
(a) Kopie enthält keine Hooks/MCP/LSP und keine Commands mit `allowed-tools` — Rotfälle je Art: `hooks/hooks.json`,
`plugin.json`-`hooks` eingebettet und als Pfad, `mcpServers`/`lspServers` eingebettet und als Datei, Hooks im Frontmatter
eines Skills und eines Agents, `allowed-tools` in Command und Skill, Sperrname im Skill-Ordner, Link im Skill-Ordner;
(b) Freigabe ohne Prüfbericht → 409; Bericht zu anderem Hash → 409; NICHT_GEEIGNET → 409;
(c) Freigabe an Hash gebunden: Quelle ändern (übernommene Datei) → GET `veraltet`, Freigabe 409; nicht übernommene Datei
ändern → bleibt `freigegeben`; cap-Kopie ändern → `kopie_veraendert`;
(d) Zuordnung Standard leer (frische Datei, nach Freigabe); Zuordnung ohne Freigabe → 409;
(e) nichts unter dem simulierten `~/.claude` geschrieben (lstat-Momentaufnahme vor/nach GET, Prüfstart, Freigabe,
Zuordnung, Rücknahme);
(f) Lauf unverändert: `baueAufruf` ohne `--plugin-dir`; `pruefeInitZeile` weist `init.plugins ≠ []` weiter ab;
`loeseAusfuehrungsEingabenAuf` liefert mit und ohne Plugin-Einträge in der lokalen Datei bitgleiche Eingaben; kein Import
von `src/plugin-kopie` oder `src/claude-plugins` in Gateway, Fähigkeiten-Start, Execution-Controller, Ort-B-Start;
`plugin_zuordnung` nur in den erlaubten Dateien;
(g) `starteWorkflowSchritt(` genau 6-mal im Server;
(h) XSS: Nutzlast in Prüfbericht-Befund/Auflage/Zusammenfassung, Risiko-Text, Grund „nicht übernommen“ erscheint nur
escaped;
(i) Rotfall-Selbsttest: jede Prüfung (a)–(h) schlägt bei verfälschtem Eingang an.
Kein Netz, kein CLI-Start, kein Modell (Prüflauf mit Attrappe des Laufstarts), Fixture unter tmpdir.

### G Tests zuerst (F-1092): Fälle vor dem Modul, roter Lauf als Beleg
- `src/plugin-kopie/kopie.test.ts`: T1 superpowers-ähnliches Fixture (3 Skills, Agent `model: inherit`, Command ohne und
  mit `allowed-tools`, Hook, MCP, LSP) → übernommen 3/1/1, nicht übernommen Command/Hook/MCP/LSP mit Grund; T2 Skill mit
  `hooks:`/`allowed-tools:` im Frontmatter → nicht übernommen; T3 Agent mit `hooks`/`model: sonnet`/`tools: Agent` →
  nicht übernommen; T4 plugin.json mit eingebetteten hooks/mcpServers und Fremdpfad für skills → nicht übernommen,
  Manifest nur name/version/description/license; T5 Sperrname/Link im Skill-Ordner; T6 Hash deterministisch, unabhängig
  von `.in_use`/`.git`/README/Hooks, ändert sich mit einer übernommenen Datei; T7 `schreibeKopie` neu / wiederverwendet /
  verändert → Fehler ohne Überschreiben; Quellordner unverändert; T8 Plugin-Name nicht schlicht → nicht kopierbar.
- `src/claude-plugins/plugins.test.ts` (D): Treffer je Art mit Zeile, Wortgrenze, Agent-Werkzeuge.
- `src/faehigkeiten/faehigkeiten.test.ts` (C): Validator gültig/ungültig für beide Felder, reine Änderer, Kompaktierung.
- `src/sammlung/pruefbericht.test.ts` (B): Quelle `plugin` gültig/ungültig, `waehleBericht` gleicher/anderer Hash,
  NICHT_GEEIGNET.
- `scripts/leitstand/routen-plugins.test.mjs` (neu) bzw. Erweiterung: Routen C mit allen 409/400-Fällen, Laufsperre.
- `public/leitstand/plugins-anzeige.test.mjs`: Zustände, Knopf-Sperren, XSS.

### H Register und Doku
Fixpaket: Zeile F-3b geteilt in F-3b-1 (≈ 0,5) / F-3b-2 (≈ 0,45), Entscheidungen §5; findings: F-1090 Stand (F-3b-1),
F-1093 (2) geschlossen (Begründung (5)), F-1091 (5) Stand (Drift nur über die Projektion), F-1091 (12) bleibt Anzeige
(MCP nie in der Kopie), F-1051 Stand, F-910 Nachtrag; Akte F45 „Stand F-3b-1“; STATUS; ARCHITECTURE.md §1 (`src/plugin-
kopie`) und §2 (Kopie unter `capWurzel/plugins`, Zuordnung je Rolle in der lokalen Datei, nichts unter `~/.claude`).

### Nicht in F-3b-1
Startargumente und Init-Gate des Laufs, `--plugin-dir`, Lauf-Kopie, Instruktion im Auftrag; `.claude/**`, Hooks,
`projekte.json`, `ressourcen.json`, `vorlagen/`, `.githooks`, `package.json` außer Gate-Zeile; nichts unter `~/.claude`.

### Risiken
- **R1 Geteilte lokale Datei, ältere Checkouts:** Ein Checkout ohne F-3b-1 hält die Datei nach der ersten Plugin-Freigabe
  für ungültig (unbekanntes Feld) und sperrt dort jeden Start mit Katalog-Fähigkeiten (E-F45-7, sichtbar, fail-closed).
  Gegenmittel: Felder nur bei Inhalt schreiben (leer = fehlt), Hinweis in Akte/Bericht; Alternative wäre eine eigene
  Datei (zweite Ausnahme in §2 samt Wächter) — nicht gewählt, weil der Auftrag „additiv in der lokalen Fähigkeiten-Datei“
  verlangt und Wächter/Bestätigung (F-1061) dann doppelt nötig wären.
- R2 Strenge Positivliste sperrt harmlose Felder (z. B. künftige Frontmatter-Felder) → sichtbar „nicht übernommen“ mit
  Feldnamen; Erweiterung nur nach Messung (Kommentar wie F-1 Delta B2).
- R3 Agents ohne `tools` erben im Lauf alle Werkzeuge des Werkzeugsatzes → als Fakt gezeigt; in F-3b-2 begrenzt `--tools`.
- R4 Zuschnitt: Server (A–D, F, G) und Oberfläche (E) sind getrennt stagebar (Muster F-2b-2c).

## Plan — F-3b-2 (nur geplant, eigener Auftrag)
1. **Spike-Nachmessung** (echtes `claude -p`, Wegwerf-Repo, Attrappe `gh`): S3 erweitert `allowed-tools` im
   Skill-Frontmatter bzw. `tools` im Agent-Frontmatter den Werkzeugsatz? (bestimmt, ob die Positivliste aus A gelockert
   werden darf); S4 Format von `init.plugins`/`init.skills`/`init.agents`/`init.slash_commands` mit einer Lauf-Kopie
   (Präfix = Manifest-`name`); S5 `enabledPlugins` nur für die Lauf-Kopie (`<name>@inline: true`, eingebaute false);
   S6 Datenordner `~/.claude/plugins/data/<name>-inline` — lässt er sich vermeiden/umlenken? Sonst **Entscheidung
   Stefan** (Konflikt mit „nichts unter ~/.claude“).
2. **Lauf-Kopie je Lauf:** Teilmenge der gepinnten Kopie mit nur den der Rolle zugeordneten Skills/Agents, außerhalb des
   Arbeitsordners, Hash in der Laufakte; `--plugin-dir <Lauf-Kopie>` + `enabledPlugins` nur für sie; nur Worker
   `claude-code`.
3. **Init-Gate:** `init.plugins` = Soll (genau die Lauf-Kopien); Skills/Agents/Commands mit Präfix `<plugin>:` ⊆
   Zuordnung, mehr = Abbruch; ohne Zuordnung `init.plugins = []` wie heute.
4. **Hash-Prüfung vor jedem Lauf:** Freigabe vorhanden, Bericht gilt, cap-Kopie = `kopie_hash`, aktuelle Projektion der
   Quelle = `kopie_hash` (Drift → Lauf startet nicht, Grund sichtbar); Vorher/Nachher der Lauf-Kopie.
5. **Instruktion:** die Fähigkeiten-Instruktion nennt die zugeordneten Plugin-Skills als `<plugin>:<skill>` (E-F3b-1).
6. **Ohne Zuordnung Argv bitgleich** (Gate).
7. **Laufakte:** Plugins aktiv/benutzt (Fähigkeiten im Lauf), Anzeige im Lauf-Detail.
8. **Echter Beleg:** `superpowers:systematic-debugging` der Ausführung zugeordnet — init zeigt das Plugin, der
   Beobachtungsblock zählt die Nutzung; eine nicht zugeordnete Rolle sieht es nicht.
Schätzung F-3b-2 ≈ 0,45 AT (Spike 0,1, Start/Init-Gate/Lauf-Kopie 0,2, Laufakte/Anzeige 0,05, echter Lauf 0,1).

## Advisor-Pass (architecture-advisor, frischer Kontext, 14.10.2026) — Urteil ÜBERARBEITEN
Hoch: F1 Commands mit Frontmatter-Varianten (BOM, `--- `, Leerzeile davor) gelten als „ohne Frontmatter“ und kämen mit
`allowed-tools` durch; F3 `mitProjekt`/`projektEinstellungen`/`aendereLokaleDatei` (`src/faehigkeiten/index.ts:171-218`,
`routen-faehigkeiten.mjs:369`) würden die neuen Felder bei jedem Schalten still löschen; F8 nur `ausfuehrung` mit
`schreibend` hat einen Fähigkeiten-Weg in den Lauf (`leitstand-server.mjs:2587-2589`) — Zuordnung für die vier lesenden
Rollen wäre wirkungslos; F14 Zuschnitt zu groß (≈ 0,9–1,1 AT statt 0,5) → teilen in Server/Oberfläche.
Mittel: F2 Grenzen/Pfadregeln des Prüflaufs (`inhalt.ts` GRENZEN, 3000 Dateien) nutzen, weitere SKILL.md darunter
ablehnen, Sperrnamen in Normalform + `CLAUDE.local.md`, Agent-`tools` Pflicht wie F-1 oder Entscheidung, Inline-Shell als
Risiko-Fakt; F4 `holen` liefert nur die Temp-Wurzel (raeumeAuf löscht sie), neutralisierender Schreiber aus
`quelle.ts` exportieren, Feld `plugin_version`, alle `art`-Unterscheidungen vollständig; F5 keine Befehle/Args/URLs nicht
übernommener Teile im Auftragstext (F-1091 (12)); F6 ARCHITECTURE §2 vor dem Code, Freigabe-Body mit angezeigtem Bericht,
Laufsperre nach asynchronem Abruf erneut prüfen, keine echte Plugin-Freigabe in Stefans Datei vor dem Merge; F7 Zustände
`quelle_fehlt`/`unbestimmbar`/`bericht_fehlt`/`mehrdeutig`, eine Auflösungsfunktion, `vergleicheInhalt` statt eigener
Kopie-Prüfung; F9 Commands kopiert, aber nicht zuordenbar; F10 `<capWurzel>/plugins` kollidiert mit einer möglichen
Katalog-id `plugins`, Ort als Entscheidung festhalten, `pluginId` streng prüfen; F11 Gate-Ergänzungen; F12 F-3b-2: `:` in
`NAME_MUSTER`, Anzeige = Start für Plugin-Kennungen, Manifest-Namen eindeutig, Codex-Rolle sichtbar, `Bash(git:*)` gegen
Commands, Schätzung zu knapp. Niedrig: F13 cap-Kopie erst bei der Freigabe schreiben, `quelle_hash` nur Anzeige.
Offene Entscheidungen Stefan: zuordenbare Rollen (F8), Ort der Kopie (F10), Commands (F9), Agent-`tools` (F2d), Teilung (F14).

## Entscheidungen Stefan (14.10.2026, nach dem Advisor-Pass)
- **E-F3b-3 = nur Ausführung:** zuordenbar ist in F-3b nur die Rolle `ausfuehrung` (der einzige Lauf mit
  Fähigkeiten-Weg); das Datenmodell bleibt je Rolle, lesende Rollen später mit eigenem Schritt.
- **E-F3b-4 = eigene Wurzel:** die gepinnte Kopie liegt unter `~/.ai-workforce/plugin-kopien/<plugin-id>/<kopie_hash>/`
  (Option `pluginKopienWurzel` analog `capWurzel`), außerhalb jedes Repos und außerhalb `~/.claude`, ohne Kollision mit
  Katalog-ids. Deutung von „Installationswurzel (Muster Ort-B)“ damit festgehalten.
- **E-F3b-5 = Commands nicht zuordenbar:** Commands ohne `allowed-tools` stehen in der Kopie und im Prüfbericht,
  erreichen den Lauf aber nicht (Grenze, dokumentiert); Zuordnung nur Skills/Agents.
- **E-F3b-6 = Agent-`tools` Pflicht** wie bei Projekt-Agents (F-1, Advisor A2): ohne `tools` nicht übernommen.

## Plan v2 (Änderungen gegen v1; alles Übrige gilt) — Auflagen 1–16
**Zuschnitt (16):** F-3b-1 wird auf diesem Branch in zwei getrennt stagebaren Schritten gebaut: **F-3b-1a Server**
(A–D, F, G; ≈ 0,6 AT) und **F-3b-1b Oberfläche** (E, i18n, Render-Nachweis, design-guardian; ≈ 0,35 AT). Fixpaket-Zeile:
F-3b-1a ≈ 0,6 / F-3b-1b ≈ 0,35 / F-3b-2 ≈ 0,6; „Hook nur nach Freigabe je Hook-Hash“ gestrichen (E-F3b-1 = A).

**A Kopie (1–4, 13):**
- Frontmatter-Erkennung fail-closed für alle drei Arten: Text ohne BOM; beginnt er nach `trimStart` mit `---`, muss er
  exakt mit `---\n`/`---\r\n` beginnen und streng lesbar sein (`leseFrontmatterStreng`), sonst „nicht übernommen
  (Frontmatter nicht eindeutig)“. Nur dann „ohne Frontmatter“ (nur Commands zulässig). Rotfälle: BOM, `--- `,
  Leerzeile davor.
- Grenzen und Pfadregeln des Prüflaufs: `GRENZEN` (3000 Dateien, 25 MB, 1 MB je Datei), `pruefePfad`,
  `findeNamensKonflikt`, `istBinaer` aus `src/sammlung/inhalt.ts`; Binär-/zu große Datei oder abgelehnter Pfad →
  ganzer Bestandteil nicht übernommen (die Kopie hat dann nie übersprungene Dateien; `uebersprungenSperre` greift
  trotzdem auch für `plugin`).
- Weitere `SKILL.md` unterhalb eines Skill-Ordners → nicht übernommen. Sperrnamen in Normalform (NFC, klein) wie
  `neutralisierePfad`: `.claude*`, `claude.md`, `claude.local.md`, `hooks.json`, `.mcp.json`, `.lsp.json`,
  `plugin.json`, `marketplace.json`, `settings*.json`.
- Agent: `tools` Pflicht (E-F3b-6), schlichte Komma-Liste, ohne `Agent`/`Task`/`Skill`; `model` nur `inherit`.
- `pluginId` vor jedem `join` gegen `^[A-Za-z0-9][A-Za-z0-9._-]*@[A-Za-z0-9][A-Za-z0-9._-]*$` (ohne `..`) geprüft;
  sonst Plugin nicht kopierbar.
- Die Kopie unter `pluginKopienWurzel` entsteht **erst bei der Freigabe** (F13); geprüft wird eine Temp-Kopie.

**B Prüflauf (6–8):**
- `holen` liefert nur eine Temp-Wurzel (`raeumeAuf` löscht sie); die Temp-Kopie schreibt der aus `src/sammlung/quelle.ts`
  exportierte neutralisierende Schreiber (`schreibeInhalt`, `.claude-plugin` → `_.claude-plugin`); `dateien` tragen die
  Pfade der Kopie. Gate: Kopie-Wurzel nach Erfolg/Fehler/Abbruch unverändert, `--add-dir` der Attrappe ≠ Kopie-Wurzel.
- `quelle` = `{ art: 'plugin', plugin_id, kopie_hash, plugin_version, commit }` (kein Feld `version`, kein
  `quelle_hash`); jede Unterscheidung nach `art` vollständig (`versionVon`, `gleicheQuelle`/`passt` in `waehleBericht`,
  `kennung`, Pin-Zeile in `baueAuftragstext`, `angezeigteQuelleAus`, `berichtKurz`, `public/leitstand/views/sammlung.js`).
- Auftragstext: nicht übernommene Teile nur mit Art, Name und Grund-Code — keine Befehle, Argumente, URLs (F-1091 (12));
  Risiko-Fakten nur der übernommenen Teile (Text-Fakten mit Datei:Zeile).

**C Lokale Datei und Routen (5, 9, 10):**
- ARCHITECTURE §2 und Schema-Beschreibung **vor** dem Code: neue Schreib-Routen `/api/plugins/freigabe`,
  `/api/plugins/freigabe/ruecknahme`, `/api/plugins/zuordnung` (auch präfigiert je Projekt), globales Feld
  `plugin_freigaben`, je Projekt `plugin_zuordnung`.
- `FaehigkeitenLokal`, `ProjektEinstellungen`, `projektEinstellungen`, `mitProjekt`, alle reinen Änderer und
  `aendereLokaleDatei` erhalten beide Felder; `aendereLokaleDatei` mit vollständiger Fallunterscheidung (unbekannte Art →
  500, nichts geschrieben). Gate-Rotfall: Aktivierung/Inhaltsfreigabe nach Plugin-Freigabe erhält beide Felder.
- `plugin_freigaben.<id>` = `{ kopie_hash, pruefbericht: "<artefakt_id>@<version>", freigegeben_am }`.
- Freigabe-Body `{ plugin_id, kopie_hash, pruefbericht, stand }`: 409, wenn inzwischen ein anderer Bericht gilt. Nach dem
  asynchronen Bestandsabruf werden Laufsperre und `stand` unmittelbar vor dem synchronen `aendereLokaleDatei` erneut
  geprüft (Rotfall).
- Eine Auflösungsfunktion `loesePluginAuf(bestand, pluginId)` → `eindeutig` | `fehlt` | `mehrdeutig` | `unbestimmbar`,
  genutzt von GET, Prüfstart, Freigabe, Zuordnung (und F-3b-2).
- Zustand der Freigabe: `keine` | `freigegeben` | `veraltet` (Projektion ≠ `kopie_hash`) | `kopie_veraendert`
  (`vergleicheInhalt` gegen `inhalt.dateien` des Berichts, auch zusätzliche Dateien/Links) | `quelle_fehlt` |
  `unbestimmbar` (Liste/Lesen gescheitert — nicht „veraltet“) | `bericht_fehlt` | `mehrdeutig`. Kein eigenes
  `pruefeKopie`.
- Zuordnungen bleiben nach einer Rücknahme gespeichert; die Anzeige kennzeichnet „ohne gültige Freigabe — wirkt nicht“
  und nach einer neuen Freigabe „wieder wirksam ab dem nächsten Schritt“.
- R1-Auflage: keine echte Plugin-Freigabe in Stefans realer Datei vor dem Merge nach main; Nachweise nur mit Temp-Datei;
  Hinweis in STATUS.

**D Risiko-Fakten:** zusätzlich `text_shell_inline` (`` !`…` `` in Command-/Skill-Texten); Messung in F-3b-2.

**F Gate (14), zusätzlich:** Felder-Erhalt (F3); Frontmatter-Varianten (F1); Binär-, zu große Datei, > 3000 Dateien (F2a);
weitere SKILL.md; Kopie-Wurzel überlebt den Prüflauf, Prüfordner neutralisiert (F4a/b); Laufsperre nach dem
asynchronen Abruf (F6); Mehrdeutigkeit bei Prüfung und Zuordnung (F7); keine Befehle/Args/URLs im Auftragstext (F5);
`setzePluginFreigabe` nur aus `aendereLokaleDatei` aufgerufen; nur `ausfuehrung` zuordenbar; Commands nicht zuordenbar.

**F-3b-2-Plan (15), ergänzt:** Regeln `Skill(<plugin>:<name>)`/`Agent(<plugin>:<name>)` und das Werkzeug `Agent` für
Plugin-Agents (`NAME_MUSTER` ohne `:` erweitern, nur für Plugin-Kennungen); „Anzeige = Start“ für Plugin-Kennungen
(Muster `vergleicheProjektKennungen`); Manifest-`name` über alle zugeordneten Plugins eindeutig (gleiches Präfix → Lauf
startet nicht); Rolle mit Codex-Worker und Zuordnung → sichtbar „nicht geladen (nur Claude Code)“; `Bash(git:*)` gegen
Plugin-Commands messen; Datenordner S6; Lauf-Kopie mit `vergleicheInhalt` gegen den Bericht. Schätzung F-3b-2 ≈ 0,6 AT.

## Delta-Advisor-Pass (frischer Kontext, 14.10.2026) — FREIGEGEBEN MIT AUFLAGEN
Alle drei Hoch-Findings geschlossen. Neue mittlere Punkte: N1 Reihenfolge/Fehlerpfade der Freigabe, N2 Standard der
Kopie-Wurzel darf nicht in Stefans Home zeigen, N3 Agent-`tools` gegen den Werkzeugsatz wie F-1, N4 Datei-Zuschnitt
1a/1b; niedrig: N5 Bericht nur im Checkout mit dem Bericht, N6 Vorrang der Zustände, N7 v1-Reste ersetzen, N8
Nachverfolgung, N9 `pluginId` mit `pruefePfad`, N10 Gesamtgrenze, N11 BOM, N12 Zuordnung wirkt nur schreibend, N13
Bericht-Schlüssel eindeutig.

## Plan v2.1 (verbindlich für den Bau; ersetzt widersprechende Stellen aus v1/v2)
**Ersetzt aus v1 (N7):** Ziel der Kopie ist `<pluginKopienWurzel>/<plugin-id>/<kopie_hash>/` (nicht `capWurzel/plugins`);
kein `pruefeKopie` (dafür `vergleicheInhalt`); `quelle` ohne `quelle_hash`/`version` (Feld `plugin_version`); zuordenbar
nur `ausfuehrung`; ARCHITECTURE §2 nennt `~/.ai-workforce/plugin-kopien`; Schätzung F-3b-1 ≈ 0,95 (1a ≈ 0,6, 1b ≈ 0,35).

1. **Freigabe-Reihenfolge (N1):** Bestand frisch lesen und projizieren → `kopie_hash` gleich in Body, Projektion und
   geltendem Bericht (Bericht = Body-`pruefbericht`) → Kopie schreiben (Temp-Geschwister + `rename`; Ziel mit anderem
   Inhalt → 409 „Kopie verändert“) → `vergleicheInhalt` gegen den Bericht (Abweichung → 409) → Laufsperre und `stand`
   erneut prüfen → `aendereLokaleDatei` (synchron). Scheitert der letzte Schritt, bleibt eine inhaltsadressierte Kopie
   ohne Freigabe liegen (harmlos, nie gelöscht). Rotfälle: anderes Ziel, Inhalt weicht ab, `stand` nach dem Schreiben
   der Kopie geändert.
2. **Kopie-Wurzel (N2):** Option `pluginKopienWurzel` im Handler Standard `null` (Freigabe dann 500), gesetzt nur im
   CLI-Bindeblock auf `~/.ai-workforce/plugin-kopien`. Gate (e) misst zusätzlich das echte `~/.ai-workforce` (lstat
   vorher/nachher).
3. **Agent-`tools` (N3):** wie F-1 — Pflicht, schlichte Namen, ohne `Agent`/`Task`/`Skill`, jeder Name im Werkzeugsatz
   `schreibend` der Startvorlage (`werkzeugName` der Einträge); Werkzeugsatz nicht bestimmbar → Agents nicht übernommen.
4. **Zuschnitt (N4):** F-3b-1a = ARCHITECTURE/Schemas, `src/plugin-kopie/**`, `src/claude-plugins/**`,
   `src/faehigkeiten/{index,types}.ts`, `src/sammlung/{pruefbericht,quelle}.ts`, `scripts/leitstand/routen-{faehigkeiten,
   pruefung,plugins}.mjs` (+ Tests), `scripts/leitstand-server.mjs`, `public/leitstand/views/sammlung.js` (Ausnahme:
   nur die `art`-Fallunterscheidung), Gate ohne (h), `package.json`-Gate-Zeile. F-3b-1b = `public/leitstand/**` übrige
   (Anzeige, api.js, i18n, index.html, CSS), `plugins-anzeige.test.mjs`, Gate (h), Anpassung Gate f45-f3a2 (b),
   Render-Nachweis. Notschnitt falls eine zweite Korrekturrunde droht: 1a-i (Kopie, Fakten, Prüflauf) / 1a-ii (Datei,
   Routen). Abweichung von N4 „je Schritt eigener Review/Commit“: der Auftrag verlangt einen Prüferpass und einen
   `npm run check` über F-3b-1 und kein Commit — die Prüfer bekommen die Datei-Liste je Schritt, getrennt stagebar.
5. **Vorrang der Zustände (N6):** `unbestimmbar` > `mehrdeutig` > `quelle_fehlt` > `keine` (ohne Freigabe-Eintrag) >
   `bericht_fehlt` > `kopie_veraendert` > `veraltet` > `freigegeben`; Gate-Fall mit zwei zutreffenden Zuständen.
6. **Grenzen und Ids (N9–N11):** übernommene Teile zusammen über `GRENZEN` → ganzes Plugin nicht kopierbar (kein
   reihenfolgeabhängiges Weglassen); `findeNamensKonflikt` über alle Einträge der Standardordner; `pluginId` zusätzlich
   `pruefePfad`, ids mit gleichem `pfadSchluessel` gelten als `mehrdeutig`; ein BOM führt immer zu „nicht übernommen
   (Frontmatter nicht eindeutig)“, wird nie entfernt.
7. **Bericht-Schlüssel (N13):** `p-<slug>-<sha256(pluginId)[0..8]>`.
8. **Grenzen dokumentiert (N5, N12):** Freigabe gilt nur im Checkout, dessen Kontrollzustand den Bericht trägt (sonst
   `bericht_fehlt`); Zuordnung wirkt nur in Ausführungsschritten mit Werkzeugsatz `schreibend` — in Akte, STATUS und
   Anzeige.

### Nachverfolgung Auflage → Stelle → Gate/Test (N8)
| Auflage (Pass 1 / Delta) | Stelle | Gate/Test |
|---|---|---|
| F1 / N11 Frontmatter-Varianten, BOM | v2 A, v2.1 6 | Gate (a) Rotfälle BOM/`--- `/Leerzeile; kopie.test T2 |
| F2a / N10 Grenzen, Pfadregeln | v2 A, v2.1 6 | Gate (a) Binär/zu groß/> 3000; kopie.test T5 |
| F2b/c weitere SKILL.md, Sperrnamen | v2 A | Gate (a); kopie.test T5 |
| F2d / N3 Agent-`tools` | E-F3b-6, v2.1 3 | Gate (a); kopie.test T3 |
| F2e Inline-Shell | v2 D | plugins.test (Fakten) |
| F3 Felder-Erhalt | v2 C | Gate (d2); faehigkeiten.test |
| F4a/b holen, Neutralisierung | v2 B | Gate (e2) Kopie-Wurzel unverändert, Prüfordner neutralisiert |
| F4c `plugin_version`, `art` vollständig | v2 B | pruefbericht.test |
| F5 keine Befehle im Auftrag | v2 B | Gate (j) |
| F6 §2, Body, Laufsperre, R1 | v2 C, v2.1 1 | Gate (b) Bericht-Body, (k) Laufsperre nach Abruf |
| F7 / N6 Zustände, Auflösung | v2 C, v2.1 5 | Gate (c), (c2) Vorrang; routen-plugins.test |
| F8/F9 Rollen, Commands | E-F3b-3/5 | Gate (d3) |
| F10 / N2 / N9 Ort, Wurzel, Id | E-F3b-4, v2.1 2/6 | Gate (e), kopie.test T8 |
| F11 Gate-Ergänzungen | v2 F | Gate selbst |
| F12 F-3b-2 | v2 F-3b-2 | — (Plan) |
| F13 Kopie bei Freigabe | v2 A | Gate (b) |
| F14 / N4 Zuschnitt | v2, v2.1 4 | — |
| N1 Reihenfolge | v2.1 1 | Gate (b2) Rotfälle |
| N5/N12 Grenzen | v2.1 8 | Doku |
| N13 Schlüssel | v2.1 7 | pruefbericht.test |

## Prüfpass und Korrekturrunde (14.10.2026)
code-reviewer „mit Hinweisen“, qa und design-guardian „nicht freigegeben“. Eine Korrekturrunde:
- Projektion für alle Instanzen gegen denselben Werkzeugsatz (Option `pluginWerkzeugsatz` = Workforce-Startvorlage; die Prüfung gegen
  den Werkzeugsatz des Laufs folgt mit F-3b-2); „Kopie prüfen“ nur in der Workforce-Ansicht (`pruefen_hier`), sonst Hinweis.
- Verwaiste Freigaben/Zuordnungen (Plugin nicht mehr installiert) sichtbar und entfernbar; Zuordnungen zu Teilen, die nicht mehr in der
  Kopie stehen, sichtbar und abwählbar; Fremdänderung der lokalen Datei sperrt; Plugin ohne Skill/Agent nicht prüfbar (422).
- Neuer Zustand `bericht_ueberholt` (neuerer Bericht bzw. NICHT_GEEIGNET zum freigegebenen Hash, fail-closed — eigene Entscheidung
  in der Korrekturrunde, Code-Review 4; Stefan kann sie zurücknehmen); Rücknahme/Abwählen ohne Eintrag → 404 ohne Schreiben;
  Quelle nicht lesbar → `unbestimmbar`; Bytes beim Lesen begrenzt; Verknüpfung in der Kopie-Ablage → 409; Fehlertexte ohne Lauf-id,
  Artefakt-id, Pfad, Regex.
- Oberfläche: V10-Knöpfe (`button`/`button primary`, Hauptknopf = nächster sinnvoller Schritt), keine eigene Live-Region (Fokus auf
  Meldung bzw. zurück auf Knopf/Kästchen), Prüfung und Freigabe zuerst, „nicht übernommen“ aufklappbar, Marke in der Liste,
  Schwere übersetzt und gefärbt, `aria-describedby` an gesperrten Bedienelementen, gezeichnete Kästchen auch hell, Texte ohne
  doppeldeutiges „nächster Schritt“; Generation der Steuerung: nach Projektwechsel keine Aktion und kein Neuladen.
- Gate: (k)/(b2) echt kalibriert, (d2) auch Inhaltsfreigabe, neu (l) Bericht überholt, (m) verwaist, (n) Fremdänderung; f3a2 (f)
  Neuladen nur in derselben Generation (Rotfall).
Rest: F-1094.

## Plan v3 — F-3b-2 (Delta nach Spike `features/F45/nachweise/f3b2/spike.md`; ersetzt „Plan — F-3b-2“ und „F-3b-2-Plan (15)“, wo widersprechend)
Branch `f45/f3b2-plugins-im-lauf`, Basis `340d823`. Freigabe Schritt 2 durch den Challenger (14.10.2026), Datenordner
**Variante A**. Spike-Folgen übernommen: S3 Skill-`allowed-tools` erweitert den Werkzeugsatz → die Regel „Skill mit
`allowed-tools` nicht übernommen“ bleibt die zentrale Sperre; S3 Agent-`tools` schränkt nur ein → E-F3b-6 bleibt; git:
`Bash(git:*)` hält gegen Plugin-Skills → keine Zusatzsperre (Gegenprobe im Gate); S4/S5 Format und `enabledPlugins` wie
gemessen; S6 Datenordner entsteht ohne Hooks/MCP nur über `CLAUDE_PLUGIN_DATA` im Text.

**A Kopie (src/plugin-kopie, additiv):** neuer Grund `plugin_daten` — ein Skill, Agent oder Command, in dessen Dateien
(Text, nicht binär) `CLAUDE_PLUGIN_DATA` vorkommt (mit oder ohne `${…}`), wird nicht übernommen (fail-closed, auch
Hilfsdateien im Skill-Ordner). Sichtbar wie jeder Grund: Prüfbericht-Auftrag (nur Grund-Code), Leitstand („nicht
übernommen“, i18n de/en/tr/ru). Ändert `kopie_hash` nur bei betroffenen Plugins (die gepinnte superpowers-Kopie enthält es
nicht).

**B Neues Modul `src/plugin-lauf/`** (rein + dünne I/O-Hülle; einziger Weg vom Plugin in den Lauf):
1. `pluginZuordnungDerRolle(lokal, projektId, rolle)` → Einträge `{ typ, pluginId, name, eintrag }` (rein).
2. `pluginKennungen(lokal, projektId, rolle)` → `plugin:<typ>:<plugin-id>:<name>@<kopie_hash der Freigabe>` (ohne Freigabe
   `@keine`) für „Anzeige = Start“ (rein; Präfix `plugin:` — `skill:`/`agent:` sind Projekt-Kennungen).
3. `async bereitePluginStartVor({ lokal, projektId, rolle, worker, art, leseBestand, berichte, kopienWurzel, werkzeugsatz })`:
   ohne Zuordnung `{ art: 'keine' }`; Worker ≠ `claude-code` oder Art ≠ `schreibend` → `{ art: 'nicht_geladen', eintraege }` mit
   Grund `nur_claude_code` bzw. `nur_schreibend` (heute nicht erreichbar: `ausfuehrung` erlaubt nur `claude-code`, Fähigkeiten
   gibt es nur `schreibend` — Funktion + Test als Netz); sonst je Plugin: Bestand frisch (`leseBestand`) → `loesePluginAuf`
   eindeutig → `ermittlePluginStand` (Quelle-Projektion = `kopie_hash`, gepinnte Kopie = Bericht über `vergleicheInhalt`,
   Bericht gilt und ist nicht überholt) → Zustand muss `freigegeben` sein, sonst Abbruch mit sichtbarem Grund
   (`Plugin <id>: <Zustand>`); jeder zugeordnete Teil steht in `uebernommen`; Manifest-`name` aus der gepinnten Kopie,
   `NAME_MUSTER`, über alle Plugins eindeutig. Ergebnis `{ art: 'plugins', kennungen, plugins: [{ pluginId, name, kopieHash,
   pruefbericht, bericht, gepinntOrdner, skills, agents }] }` oder `{ art: 'fehler', grund }`. Wirft nie.
4. `baueLaufKopie(plugin, laufWurzel)` (synchron, I/O): erneut `vergleicheInhalt(bericht, gepinntOrdner)`; Teilmenge der
   gepinnten Kopie = Manifest + Lizenzdateien der Wurzel + `skills/<s>/**` der zugeordneten Skills + `agents/<a>.md`;
   `lauf_kopie_hash` = `hashAusDateien` dieser Dateien; Ziel `<laufWurzel>/<lauf_kopie_hash>/` (Ordnername = Hash),
   inhaltsadressiert wie `schreibeKopie` (vorhanden mit gleichem Inhalt → wiederverwendet, anders → Abbruch „Lauf-Kopie
   verändert“, Verknüpfung → Abbruch; neu: Temp-Geschwister + `rename`). `laufWurzel` = `<pluginKopienWurzel>/_lauf` (`_` ist
   kein gültiger Anfang einer Plugin-id → keine Kollision; außerhalb jedes Arbeitsordners). Nie gelöscht (Stefan).
5. Datenordner (Variante A): `erfassePluginDatenordner(ordner)` (lstat-Liste + mtime/Größe, nur lesend, Grenze 20 000
   Einträge → „nicht prüfbar“) und `vergleichePluginDatenordner(vorher, nachher)` → relative Abweichungen (`+ data/x-inline`,
   `~ …`, `- …`), keine absoluten Pfade. Ordner = `bestimmeClaudeOrdner(env, homedir)/plugins`.

**C Start (Server; nur `ausfuehrung` mit `schreibend` und nur mit angezeigter Freigabe, wie alle Katalog-/Projekt-Fähigkeiten):**
- Anzeige: `ermittleAusfuehrungsEmpfehlung` setzt mit `zusatz.faehigkeiten` zusätzlich `empfehlung.pluginFaehigkeiten`
  (Eintrag, Anzeige `<name> (<plugin-id>)`, Typ, `kennung`, ohne Freigabe Grund) aus der lokalen Datei (synchron, kein
  CLI-Aufruf im Poll); `zusatz.faehigkeiten.pluginFreigaben` (Hashes) geht in den Cache-Schlüssel. Die Oberfläche zeigt den
  Block „Plugin-Fähigkeiten im Lauf“ in der Empfehlung und schickt die Kennungen mit `empfehlungIds` zurück
  (`empfehlungIdsFuerFreigabe`).
- Asynchrone Vorbereitung **vor** dem D13-Bereich: POST `…/workflows/<id>/freigabe` und POST `/api/laeufe` rufen
  `bereitePluginStartVor` nur, wenn `empfehlungIds` eine `plugin:`-Kennung trägt (sonst kein Aufruf, bitgleich). Das Ergebnis geht
  als 5. Argument an den bestehenden Aufruf `starteWorkflowSchritt(…, body.empfehlungIds, port, pluginStart)` bzw. in die
  Optionen von `/api/laeufe` — keine neue Aufrufstelle (Gate: genau 6×). Fehler → 409 vor dem Festhalten bzw. 400, nichts
  reserviert.
- `bereiteEmpfehlungFuerStartVor`: `trenneAngezeigteIds` liefert zusätzlich `plugin`; angezeigt = `pluginKennungen` frisch aus
  der lokalen Datei = `pluginStart.kennungen`, sonst Abbruch „Anzeige veraltet“.
- `loeseAusfuehrungsEingabenAuf` (synchron): mit `fk.plugins` → `baueLaufKopie` je Plugin; `baueFaehigkeitenStart` bekommt
  `plugins: [{ name, skills, agents }]` und wird auch nur mit Plugins gerufen: `Skill(<name>:<s>)`/`Agent(<name>:<a>)` in
  `erlaubte_werkzeuge` (bei Plugin-Agents Sperre der eingebauten Agents wie F-1), `enabledPlugins["<name>@inline"] = true`
  zusätzlich zu den eingebauten `false` (auch im Ort-B-Zweig), Init-Gate `skills`/`pflichtSkills` mit Präfixnamen,
  `agents.erlaubt` mit Präfixnamen, neu `plugins: ['<name>@inline', …]`; Instruktion zusätzlich „Plugin-Fähigkeiten in diesem
  Lauf (von Stefan der Ausführung zugeordnet): Skills `<name>:<s>` (Skill-Werkzeug); Subagenten …“ (E-F3b-1).
  `aufrufEingaben.pluginDirs` = Lauf-Kopie-Ordner. `faehigkeitenImLauf` + Einträge `quelle: 'plugin'` (`id` = Zuordnungseintrag,
  `name` = `<name>:<teil>`, `hash` = `kopie_hash`). Neues Eingabefeld `pluginsImLauf: { lauf_kopien: [{ plugin_id, name,
  kopie_hash, lauf_kopie_hash, pruefbericht }], datenordner }`.
- `baueAufruf`: `--plugin-dir <ordner>` je Eintrag von `pluginDirs` unmittelbar vor `-p` (nach `--settings`); ohne Feld bitgleich.

**D Init-Gate (`pruefeInitZeile`):** `erwartet.plugins` (Standard `[]`): Menge `init.plugins[].source` = Soll (mehr oder fehlend =
Abbruch; ohne Soll wie heute „nicht leer“); Plugin-Skills über `skills` (deckt `init.skills` und `init.slash_commands`, ~Z. 905);
neu: jeder Name mit `:` in `init.skills`, `init.agents`, `init.slash_commands`, der nicht im Soll steht, ist ein Verstoß — auch
ohne `agents`-Erwartung.

**E Laufakte und Lauf-Detail:** `faehigkeiten_im_lauf` additiv `plugins: { lauf_kopien: […], datenordner: { abweichungen } |
{ grund } }` (Schema + Zwilling im Gateway); `quelle` erlaubt zusätzlich `plugin`. Der Controller erfasst den Datenordner vor
`starteGateway`, das Gateway ruft nach Prozessende `nachLauf()` und schreibt das Ergebnis (kein Abbruch, Befund). Lauf-Detail:
Quelle „Plugin“ in der Tabelle, darunter Lauf-Kopien (Plugin, Kopie-/Lauf-Kopie-Hash gekürzt) und Datenordner („unverändert“ /
Abweichung als Warnung / „nicht prüfbar“), i18n vierfach, escaped. Beobachtungsblock unverändert (zählt `superpowers:<skill>`
über `skill_aufrufe`).

**F Gate `scripts/check-f45-f3b2-lauf.mjs`** (in `npm run check` nach f45-f3b1), je Prüfung kalibrierter Rotfall: (a) Skill mit
`allowed-tools` nicht übernommen (zentrale Sperre, S3); (b) `CLAUDE_PLUGIN_DATA` in Skill/Agent/Command → `plugin_daten`; (c) ohne
Zuordnung bzw. ohne `plugin:`-Kennung Argv bitgleich (auch mit Zuordnung in der lokalen Datei); (d) mit Zuordnung: `--plugin-dir`
genau je Lauf-Kopie, `enabledPlugins` nur `<name>@inline` true + eingebaute false, `Bash(git:*)` weiter in `--disallowedTools`
(Gegenprobe git, Spike P4a/P4b); (e) Init-Gate Soll/mehr/fehlend/fremder Präfix in skills/agents/slash_commands; (f) Drift:
Quelle geändert, gepinnte Kopie verändert, Bericht überholt, Lauf-Kopie verändert, doppelter Manifest-Name, zugeordneter Teil
nicht übernommen → Start abgelehnt mit Grund; (g) Anzeige = Start (Kennung abweichend → abgelehnt); (h) Lauf-Kopie nur
zugeordnete Teile, Ordnername = Hash, außerhalb des Arbeitsordners, Hash in der Laufakte; (i) Datenordner-Abweichung → Befund in
der Laufakte, Lauf nicht abgebrochen, nur lesend; (j) Instruktion nennt `<plugin>:<skill>`; (k) `nicht_geladen` für Worker ≠
claude-code; (l) XSS Lauf-Detail-Block; (m) `starteWorkflowSchritt(` genau 6×, kein `await` in den D13-Bereichen (f15 bleibt grün);
(n) Rot-Selbsttest. Gate f45-f3b1 (f) wird angepasst (der Lauf ändert sich jetzt: Import von `src/plugin-kopie` nur aus
`src/plugin-lauf`, `pruefeInitZeile` mit Soll).

**G Tests zuerst (F-1092):** `src/plugin-lauf/plugin-lauf.test.ts`, Ergänzungen `kopie.test.ts` (`plugin_daten`),
`claude-code-gateway.test.ts` (`pluginDirs`, Init-Gate Soll), `faehigkeiten.test.ts` (`baueFaehigkeitenStart` mit Plugins) — roter
Lauf vor den Modulen als Beleg im Nachweis.

**H Echter Beleg (`features/F45/nachweise/f3b2/beleg.mjs`):** echter Startweg (Muster F-1 `realer-lauf.mjs`):
`bereitePluginStartVor` mit Stefans echter lokaler Datei (nur gelesen; Zuordnung `superpowers:systematic-debugging` → `ausfuehrung`
liegt vor), echtem Bestand und echten Berichten dieses Checkouts → `loeseAusfuehrungsEingabenAuf` → `fuehreAufgabeDurch` → echte
CLI im Wegwerf-Repo (Kontrollzustand in tmp). L1 mit Zuordnung: `init.plugins` = Lauf-Kopie, Skill aufgerufen,
`faehigkeiten_im_lauf` zählt ihn, Beobachtungsblock nennt ihn. L2 ohne `plugin:`-Kennung: `init.plugins` = `[]`. Render-Nachweis
Lauf-Detail und Freigabe-Block (`npm run render-nachweis`).

**I Register/Doku:** ARCHITECTURE §2 (Lauf-Kopien `_lauf/<hash>`), Schema-Doku; F-1090 Spike-Ergebnisse + Stand; neues TECH_DEBT
P2 „Prüflauf (Plugins/Sammlung) ohne Abbrechen und ohne Laufzeitanzeige“; Finding Variante B (`CLAUDE_CODE_PLUGIN_CACHE_DIR` je
Lauf, Auslöser „Vorher/Nachher meldet Abweichung“); Fixpaket-Zeile F-3b-2, STATUS.

**Nicht in F-3b-2:** Hooks, MCP, Commands im Lauf; lesende Rollen; Coach; Codex; Löschen alter Lauf-Kopien; Start ohne angezeigte
Freigabe (wie alle Katalog-/Projekt-Fähigkeiten: ohne Anzeige keine Plugins).

**Risiken:** R1 Zeit zwischen asynchroner Prüfung und synchronem Start — die gepinnte Kopie wird synchron erneut gegen den Bericht
geprüft; nur eine Quellen-Drift in diesem Fenster bliebe bis zum nächsten Lauf unbemerkt (dokumentiert). R2 CLI-Abruf (~1,5 s) bei
jedem Start mit Plugins. R3 die `.in_use`-Marken der CLI-Liste fallen vor die Vorher-Aufnahme (Liste läuft vor dem Controller).
Schätzung ≈ 0,6 AT (unverändert).

## Delta-Advisor-Pass v3 (architecture-advisor, frischer Kontext, 14.10.2026) — FREIGEGEBEN MIT AUFLAGEN
Hoch: A1 die `:`-Regel des Init-Gates bräche heutige Läufe (Projekt-Commands in Unterordnern heißen `sub:tief`, stehen als
gesperrte Namen in `init.slash_commands`). Mittel: A2 Zuordnung ohne gültige Freigabe; A3 D13-Fenster in POST `/api/laeufe`
ungeprüft; A4 Vorbereitung vor dem D13-Bereich der Freigabe ohne geladenen Schritt; A5 zwei Werkzeugsätze (Projektion vs.
Schritt); A6 Hilfsdateien eines Plugin-Skills außerhalb des Arbeitsordners ungemessen; A7 Zuschnitt ≈ 0,9–1,0 AT statt 0,6.
Niedrig: A8 Cache-Schlüssel ohne `plugin_zuordnung`; A9 Vorher/Nachher der Lauf-Kopie fehlt, Lauf-Kopie aus den geprüften
Bytes; A10 Datenordner nur `plugins/data`, `CLAUDE_CODE_PLUGIN_CACHE_DIR` gesetzt → nicht prüfbar; A11 ARCHITECTURE zuerst;
A12 Controller reicht `initGate.plugins` durch; A13 Projekt-Command-Namensraum = Manifest-Name; A14 Beleg schreibt in das echte
`_lauf`, `rename` auf vorhandenes Ziel unter Windows; A15 Gate (c) genau formulieren.

## Plan v3.1 (verbindlich für den Bau; ersetzt widersprechende Stellen aus v3)
1. **Init-Gate (A1):** die `:`-Regel gilt nur mit Plugin-Soll (`erwartet.plugins` gesetzt) und nur für Namen außerhalb Soll ∪
   `gesperrt` ∪ Referenzmenge. Rotfall im Gate (e): Projekt mit `commands/sub/x.md`, ohne Plugin → kein Verstoß; mit Plugin-Soll
   und fremdem `kraft:anders` → Verstoß.
2. **Zuordnung ohne gültige Freigabe (A2) — abgeleitet aus den bestehenden Festlegungen, kein neuer Entscheid:** fehlt der
   Freigabe-Eintrag (Rücknahme, F-3b-1 „ohne gültige Freigabe — wirkt nicht“), wirkt die Zuordnung nicht: keine `plugin:`-Kennung,
   Anzeige „wirkt nicht (keine Freigabe)“, der Lauf startet ohne das Plugin, Laufakte-Eintrag `aktiv: false` mit Grund. Ist eine
   Freigabe da, aber nicht gültig (Drift: `veraltet`, `kopie_veraendert`, `bericht_*`, `quelle_fehlt`, `mehrdeutig`, `unbestimmbar`),
   startet der Lauf nicht, Grund sichtbar (Auftrag F-3b-2 „Hash-/Drift-Prüfung vor jedem Lauf mit sichtbarem Grund“, v2-Plan Punkt
   4). Kennungen tragen damit immer einen Hash (`@keine` entfällt). Stefan kann das umstellen.
3. **POST `/api/laeufe` (A3):** `await bereitePluginStartVor` nur zwischen `pruefeStartauftrag` und `if (laufAktiv)`; Gate (m) prüft
   den Quelltext dieses Fensters (kein `await` zwischen `if (laufAktiv)` und `reserviereLaufId`/Start) mit Rotfall.
4. **POST `…/freigabe` (A4):** Vorbereitung vor dem D13-Bereich nur bei `entscheidung === 'FREIGEGEBEN'` und einer `plugin:`-Kennung
   in `empfehlungIds`, fest mit Rolle `ausfuehrung`, Art `schreibend`, Worker `claude-code`; im Bereich wirkt `pluginStart` nur, wenn
   `erhaeltKatalogFaehigkeiten` für den Schritt gilt und sein Worker `claude-code` ist; die Vorprüfung (vor dem Festhalten) prüft
   `pluginStart` (Fehler → 409) und die Kennungen. Bei ABGELEHNT nie ein CLI-Aufruf.
5. **Werkzeugsätze (A5):** `bereitePluginStartVor` bekommt `kopieWerkzeugsatz` (Projektion/Zustand, = `pluginWerkzeugsatz` der
   Instanz) und `schrittWerkzeugNamen` (Namen des Werkzeugsatzes des Schritts); zugeordnete Agents mit `tools` außerhalb der
   Schritt-Namen → Abbruch mit Grund (löst die Zusage aus der Korrekturrunde F-3b-1).
6. **Beleg (A6, A14):** L1 liest zusätzlich eine Hilfsdatei des Skills (`root-cause-tracing.md`) aus der Lauf-Kopie und belegt das
   Ergebnis; der Beleg schreibt die Lauf-Kopie in Stefans echtes `~/.ai-workforce/plugin-kopien/_lauf/` (wie jeder echte Lauf, im
   Nachweis genannt). Vorhandenes Ziel mit gleichem Inhalt wird wiederverwendet, ein `rename`-Fehler mit inzwischen gleichem
   Ziel ebenso.
7. **Zuschnitt (A7):** auf diesem Branch zwei getrennt stagebare Teile (Muster F-3b-1 v2.1 Punkt 4): **F-3b-2a** Server/Gateway/
   Controller/Schema/Gate/Beleg inkl. `empfehlungIdsFuerFreigabe` (sonst bräche Stefans bestehende Zuordnung jede Ausführung
   mit „Anzeige veraltet“ ab); **F-3b-2b** Anzeigeblock in der Empfehlung, Lauf-Detail, i18n, Render-Nachweis. Ein Prüferpass,
   eine Korrekturrunde, ein `npm run check` über beide (Auftrag). Schätzung ≈ 0,9–1,0 AT (Fixpaket).
8. **Cache (A8):** Schlüssel zusätzlich mit `plugin_zuordnung` des Projekts und den Hashes der `plugin_freigaben`.
9. **Lauf-Kopie (A9):** die gepinnte Kopie wird einmal gelesen, mit der Dateiliste des Berichts verglichen (Menge + sha256) und
   die Teilmenge aus genau diesen Bytes geschrieben; `nachLauf()` vergleicht die Lauf-Kopie nach dem Lauf erneut
   (`vergleicheOrdner`) — Abweichung = Befund in der Laufakte.
10. **Datenordner (A10):** erfasst wird nur `<claude>/plugins/data` (eine Ebene tief genügt nicht — rekursiv, aber nur dort);
    ist `CLAUDE_CODE_PLUGIN_CACHE_DIR` in der Umgebung des Servers gesetzt → „nicht prüfbar“ (Grund in der Laufakte).
11. **ARCHITECTURE (A11)** vor dem Code: §1 (Import-Grenze `src/plugin-kopie`), §2 (`_lauf/<hash>` schreibt der Startweg;
    Datenordner als gemessene CLI-Nebenwirkung).
12. **Controller (A12):** `initGate.plugins` wird durchgereicht; Test über den Controller-Pfad.
13. **Namensraum (A13):** trägt ein gesperrter Projekt-Name das Präfix `<manifest-name>:` → Abbruch (sonst schaltete
    `skillOverrides off` den Plugin-Skill ab).
14. **Gate (c) (A15):** „ohne `empfehlungIds` bzw. ohne `plugin:`-Kennung darin bitgleich, auch mit Zuordnung in der lokalen Datei“.

## Prüfpass und Korrekturrunde F-3b-2 (14.10.2026)
code-reviewer, qa und design-guardian je „freigegeben mit Hinweisen“. Eine Korrekturrunde:
- Server/Lauf: Zuordnung ohne Freigabe steht auch ohne `plugin:`-Kennung als „keine Freigabe — wirkt nicht“ in der Laufakte (CR K2, QA M1;
  Gate (o)); sichtbare Gründe ohne absolute Pfade (Fehlercode, volle Meldung nur im Log, `ohnePfade`; CR K1); Lauf-Kopie verändert nennt
  Ablage und gekürzten Hash (QA N1); eigener Grund ohne Kopie-Wurzel (CR 8); ein Vergleich für gepinnte Kopie und Lauf-Kopie (CR 2);
  POST `/api/laeufe` ruft die CLI nur mit Katalog-Fähigkeiten (CR 1); Abweichungen des Datenordners höchstens 50 + Zähler (CR 6, QA N3);
  nicht geladene Teile heißen `<teil> (<plugin-id>)` (QA N2).
- Gate: (c) über `bereiteEmpfehlungFuerStartVor` — Zuordnung mit Freigabe ohne angezeigte Kennung bricht ab, ohne Freigabe nicht (CR K3);
  (f) doppelter Manifest-Name, (m) `\bawait\b` und Rotfall „Abruf im D13-Bereich“ (CR 3); 26 Rotfälle. ARCHITECTURE §1 nennt Gate f45-f3b1
  (f) für die Import-Grenze (CR 4).
- Oberfläche: Hinweistexte des Plugins-Reiters „noch nicht wirksam“ ersetzt (vier Sprachen, Gate f45-f3a2 (b) nachgezogen; QA M2);
  Lauf-Kopien mit aufklappbarem vollen Hash, Datenordner als Liste mit Art-Wort und Hinweis auf parallele Sitzungen, `h5`, einheitliche
  Chips, Name ohne Doppelung, „wirkt nicht“ als Warn-Chip, Satzbau tr über einen Schlüssel, ru „Замечание“, de „würde … anlegen“
  (design-guardian 1–7); Render-Fixtures stimmig (QA N5).
Rest: F-1100.
