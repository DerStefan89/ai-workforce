# Nachweis: MCP-Begrenzung als Standard für alle Rollen (F31 WS-3c, löst F-502)

Datum: 20.09.2026. Claude Code Version: `2.1.258 (Claude Code)` (`claude --version`,
real geprüft). Alle Läufe direkt gegen `C:\Program Files\claude\claude.exe`
im Repo-Ordner (`ai-workforce`), stdin explizit geschlossen (`< /dev/null`,
Muster WS-3/WS-3b). Prompt identisch zu WS-3b: `Antworte ausschließlich mit
dem JSON {"art":"antwort","antwort":"OK"}` — keine reale Datei entsteht,
egal welches Werkzeug angeboten wird.

Auftrag: F31 WS-3b hat die MCP-Begrenzung (`--strict-mcp-config
--mcp-config '{"mcpServers":{}}'`) nur für die Rolle `jarvis` eingeführt
(`AufrufEingaben.mcpConfig`, nur gesetzt wenn vorhanden). `state/findings.md`
F-502 hält offen, dass jede andere Rolle (`architecture-advisor`,
`code-reviewer`, `qa`, `ausfuehrung`) weiterhin ungeprüft mit vollem
Account-MCP-Werkzeugsatz startet. Dieser Nachweis prüft die Lücke für eine
**schreibende Rolle** (`ausfuehrung`, `werkzeugsatz.schreibend` aus
`startvorlagen/beispielprojekt.json`: `Read,Grep,Glob,Write,Edit`,
`--setting-sources project`, kein `settingSources`-Override) — die Rolle,
die im Produktivpfad tatsächlich Dateien ändert.

## 1. Rot-Fall (vor der Änderung / ohne `--strict-mcp-config`)

Kommando (identisch zu `baueAufruf`s Ausgabe VOR dieser Änderung für die
Rolle `ausfuehrung`):

```
claude --model claude-sonnet-5 --output-format stream-json --verbose \
  --setting-sources project \
  --tools Read,Grep,Glob,Write,Edit --allowedTools Read,Grep,Glob,Write,Edit \
  -p "Antworte ausschließlich mit dem JSON {\"art\":\"antwort\",\"antwort\":\"OK\"}" \
  < /dev/null
```

`stream-json`-Init-Nachricht und `type":"result"`-Ausgabe, im Wortlaut
(nur die relevanten Felder):

```
"tools":["Edit","Glob","Grep","Read","Write",
  "mcp__claude_ai_Claude_Docs__batch","mcp__claude_ai_Claude_Docs__create",
  "mcp__claude_ai_Claude_Docs__delete","mcp__claude_ai_Claude_Docs__export",
  "mcp__claude_ai_Claude_Docs__guide","mcp__claude_ai_Claude_Docs__query",
  "mcp__claude_ai_Claude_Docs__read","mcp__claude_ai_Claude_Docs__update"]
"mcp_servers":[{"name":"claude.ai Claude Docs","status":"connected"},
  {"name":"claude.ai Google Drive","status":"needs-auth"}]

"usage":{"input_tokens":2,"cache_creation_input_tokens":11154,
  "cache_read_input_tokens":9522,"output_tokens":238,
  "output_tokens_details":{"thinking_tokens":217}}
"duration_ms":5103,"duration_api_ms":3989
```

Trotz `--tools`/`--allowedTools` nur `Edit,Glob,Grep,Read,Write`: 13
Werkzeuge im tatsächlich angebotenen Satz (5 erlaubte + 8 `mcp__*`), 2
Account-MCP-Server geladen. Dieselbe E-187-Lücke wie in WS-3b für `jarvis`
gemessen, jetzt für eine schreibende Rolle bestätigt.

## 2. Grün-Fall (nach der Änderung / mit Standard-`--strict-mcp-config`)

Kommando (identisch zu `baueAufruf`s Ausgabe NACH dieser Änderung — kein
`mcpConfig`-Feld nötig, der Default greift):

```
claude --model claude-sonnet-5 --output-format stream-json --verbose \
  --setting-sources project \
  --tools Read,Grep,Glob,Write,Edit --allowedTools Read,Grep,Glob,Write,Edit \
  --strict-mcp-config --mcp-config '{"mcpServers":{}}' \
  -p "Antworte ausschließlich mit dem JSON {\"art\":\"antwort\",\"antwort\":\"OK\"}" \
  < /dev/null
```

```
"tools":["Edit","Glob","Grep","Read","Write"]
"mcp_servers":[]

"usage":{"input_tokens":2,"cache_creation_input_tokens":10395,
  "cache_read_input_tokens":7210,"output_tokens":20,
  "output_tokens_details":{"thinking_tokens":0}}
"duration_ms":2673,"duration_api_ms":1820
```

`mcp_servers` geht von zwei Einträgen auf `[]`, die Werkzeugliste von 13 auf
5 Einträge zurück — exakt die 5 in `--tools`/`--allowedTools` genannten,
keine mehr, keine weniger.

## 3. Kontrollierte Messung (5 Läufe je Variante, Median, `--output-format json`)

Gleicher Prompt, gleiches Repo-Verzeichnis, gleiche Rolle (`ausfuehrung`).
`a)` = Rot-Fall-Flags (Abschnitt 1), `b)` = Grün-Fall-Flags (Abschnitt 2).
Wall-Clock über `date +%s%N` um den vollen Prozessstart gemessen (inklusive
Programmstart, Muster WS-3b Abschnitt 3/4).

| Variante | Wall-Clock (Median) | `duration_ms` (Median) | `duration_api_ms` (Median) |
|---|---:|---:|---:|
| a) ohne MCP-Begrenzung | 8,11s | 3,11s | 2,70s |
| b) mit MCP-Begrenzung (neuer Standard) | 5,62s | 2,19s | 1,73s |

Einzelwerte Wall-Clock (ms): a) 9137 · 8108 · 8026 · 8572 · 7955 — b) 5102 ·
5404 · 5820 · 5745 · 5618.

Wall-Clock-Differenz a→b: **2,49s Median (8,11s → 5,62s), ≈31%** — größer
als WS-3bs 1,46s für `jarvis`, plausibel: diese Rolle bietet 5 Werkzeuge
statt 3 an, das MCP-Verbindungsaufbau-/Deklarationsgewicht bleibt aber
gleich groß, fällt also relativ stärker ins Gewicht.

### Tokenersparnis je Lauf

`usage.input_tokens` selbst bleibt in beiden Varianten `2` (dieses Feld
zählt nur den inkrementellen Turn-Anteil, nicht die Werkzeug-/Kontext-
Deklaration) — der reale Unterschied liegt in den Kontext-Tokens
(`cache_creation_input_tokens` + `cache_read_input_tokens`, der Anteil, der
die Werkzeugdeklaration/Systemprompt trägt):

| Variante | `cache_creation_input_tokens` (Median) | `cache_read_input_tokens` (Median) | Summe (Median) |
|---|---:|---:|---:|
| a) ohne MCP-Begrenzung | 6.031 | 14.646 | 20.677 |
| b) mit MCP-Begrenzung | 5.269 | 12.334 | 17.603 |

**Tokenersparnis je Lauf: 3.074 Tokens (Median), ≈14,9%** — die acht
`mcp__claude_ai_Claude_Docs__*`-Werkzeugdeklarationen (Namen, Beschreibungen,
JSON-Schemas) tragen sichtbar zum Kontext bei, obwohl sie nie angeboten
werden sollten.

## 4. Ergebnis

Beide in F-502 genannten Bedingungen sind für eine schreibende Rolle real
bestätigt: (1) MCP-Server/-Werkzeuge sind ohne Begrenzung real aktiv
(Abschnitt 1) und (2) die Begrenzung ist real messbar schneller (2,49s
Wall-Clock-Median, ≈31%, Abschnitt 3) und tokensparender (3.074 Tokens
Median, ≈14,9%). Die Lücke betrifft nicht nur `jarvis`, sondern jede Rolle
mit denselben Account-MCP-Servern im Repo-Ordner — MCP-Begrenzung als
Standard für jeden Aufruf (`src/claude-code-gateway/index.ts` `baueAufruf`)
ist damit gerechtfertigt, nicht nur für `jarvis`.

## Status
- [x] Freigegeben
- [ ] Freigegeben mit Hinweisen
- [ ] Nicht freigegeben
- [ ] Blockiert

## Nächster sinnvoller Schritt
`docs/projekt/zielfassung.md` §9.1 (Zeile „MCP-Werkzeuge im
Ausführungslauf") und `state/findings.md` F-502 auf den gemessenen Stand
nachziehen, dann Reviewer-/QA-Pass und `npm run check`/`check:template`.
