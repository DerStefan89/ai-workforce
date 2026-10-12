# Nachweis F45 F-2b-2a — Eignungsprüfung (12.10.2026)

## Echte Prüfläufe (`pruefung.mjs`)

Eigene Leitstand-Instanz der Workforce (`istWorkforceInstanz`, repoWurzel = cwd = diese Installation, echte Startfreigabe),
Wegwerf-Kontrollzustand und Rohstrom in `%TEMP%` (nicht im Repo). Wege der Oberfläche: `POST /api/sammlung/pruefung/vorbereiten`
→ `POST /api/sammlung/pruefung` (202) → `GET /api/sammlung/pruefung/<laufId>`. Modell der Startvorlage (`claude-sonnet-5`),
CLI 2.1.296. Nichts installiert, nichts freigegeben.

| Eintrag | Pin | Lauf | Urteil | Dauer | Kosten | Init-Zeile |
|---|---|---|---|---|---|---|
| context7-mcp (MCP) | `npm:@upstash/context7-mcp@4.3.0`, `sha512-fuDt5nWj…rPA==` | `eignungspruefung-context7-mcp-e6a326e8-…` | **MIT_AUFLAGEN** | 147 s | 0,51 USD | skills `[]`, plugins `[]`, mcp_servers `[]`, tools Glob/Grep/Read |
| impeccable (Skill), Versuch 1 ganzes Repo | `github.com/pbakaus/impeccable` @ `919dbeba…` | `eignungspruefung-impeccable-f5c98728-…` | — („Quelle zu groß für die Prüfung: 3884 Dateien (höchstens 3000)“, kein Lauf, Sperre frei) | — | — | — |
| impeccable (Skill), Pfad `.claude/skills/impeccable` | dieselbe SHA | `eignungspruefung-impeccable-87331e24-…` | **NICHT_GEEIGNET** | 172 s | 0,38 USD | skills `[]`, plugins `[]`, mcp_servers `[]`, tools Glob/Grep/Read |

Dateien: `bericht-context7-mcp.json`, `bericht-impeccable.json` (Payload der Kernartefakte), `lauf-context7-mcp.json`,
`lauf-impeccable.json` (Init-Zeile, Verweigerungen: keine, Kosten), `ablauf.json` (letzter Aufruf).

**Paketangabe context7-mcp** (Auftrag, O8): `herkunft.paket = "npm:@upstash/context7-mcp"` nach Bestätigung durch Stefan
(12.10.2026). Beleg: README von `github.com/upstash/context7` Z. 7 und 127 sowie `packages/mcp/package.json` (`name`), Commit
`33414e6`; npm-Registry `repository = git+https://github.com/upstash/context7.git`, `directory = packages/mcp`.

**impeccable — Pfad statt ganzes Repo:** das Repo ist ein Monorepo (≈ 75 MB, 3 884 Dateien ≤ 1 MB, derselbe Skill in rund 20
Werkzeug-Ordnern). Die Grenze greift zu Recht; geprüft wird die Claude-Code-Fassung des Skills (Feld `pfad`), die eine
Ort-B-Installation kopieren würde. Im Prüfordner liegt sie neutral (relativ zum Pfad, ohne `.claude`-Segment).

### Wichtigste Befunde

- **context7-mcp — MIT_AUFLAGEN:** keine Installationsskripte (Fakten: `lebenszyklus {}`, bin `context7-mcp`, 13
  Abhängigkeiten); Anfragen gehen an `https://context7.com/api` (Befund installationsweg/mittel); Feld `instructions` des
  Servers verlangt bevorzugte Nutzung (modell_anweisungen/gering); HTTP-Transport öffnet Port + Prometheus-Metriken nur auf
  ausdrücklichen Wunsch. Auflagen: keine vertraulichen Inhalte in Abfragen; Transport stdio beibehalten. Lizenz MIT belegt.
- **impeccable — NICHT_GEEIGNET:** der Launcher (`scripts/impeccable`, `impeccable.cmd`) lädt beim ersten Lauf ein
  geschlossenes Engine-Binary von GitHub-Releases nach `~/.impeccable/bin/` und führt es aus (installationsweg/hoch); `hooks on`
  schreibt Hook-Manifeste u. a. in `.claude/settings.local.json` (hooks_hintergrund/hoch); der Inhalt verlangt Shell, Browser-
  Automatisierung und einen dauerhaften Hintergrund-Poll (modell_anweisungen/mittel). Lizenz nur im Frontmatter (Apache 2.0),
  keine LICENSE im Skill-Ordner.

## Render-Nachweis (`render/`)

Instanz `render/instanz.mjs` (Port 4393, echte Sammlung und echter Katalog), Klickfolgen `render/erzeuge-nachweis.mjs`
(`scripts/render-nachweis.mjs`, Chromium headless). Pin, Start und Zustand des Prüflaufs über Antwort-Attrappen; der Bericht
MIT_AUFLAGEN ist der echte Bericht context7-mcp, GEEIGNET/NICHT_GEEIGNET sind daraus abgeleitete, im Text als „Attrappe“
gekennzeichnete Varianten.

| Ordner | Zeigt |
|---|---|
| `auswaehlen-typwahl`, `-390` | Detail eines Eintrags mit unbestimmtem Typ → „Auswählen“ → Typwahl → Bestätigung (Pin, „Pfad im Repo“, Kostenhinweis) |
| `auswaehlen-ausnahme` | ausgeschlossener Eintrag → Pflichtfeld „Ausnahme“ → zu kurze Begründung → Meldung |
| `pruefung-laeuft` | „Prüfung starten“ → „Prüflauf läuft …“ mit Lauf-Link |
| `bericht-geeignet`, `bericht-mit-auflagen` (`-390`, `-hell`), `bericht-nicht-geeignet` (`-zoom200`) | Bericht im Detail: Fakten vor dem Urteil (Installationsskripte/Hooks hervorgehoben), Zusammenfassung, Auflagen, Befunde |
| `freigabe-gesperrt` (`-390`, `-zoom200`), `freigabe-nicht-geeignet` | Capability Library → Katalog → „Prüfen & freigeben“: Sperrgrund, kein „Installieren“ |
| `freigabe-mit-bericht` (`-hell`) | passender Bericht MIT_AUFLAGEN im Freigabedialog, „Installieren“ vorhanden |

Bekannt und nicht Teil dieses Auftrags: der schwebende Knopf „Frag Jarvis“ verdeckt bei 390 px und Zoom 200 % Text (F-1060
(13)); das Detail sitzt in der Namensspalte (F-1068 (3), F-2b-2b).
