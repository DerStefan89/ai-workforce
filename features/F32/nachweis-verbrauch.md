# Nachweis: verbrauch-Feld gegen reale Daten + realer Grün-Fall (F32 WS-1)

Datum: 20.09.2026. Anlass: Challenger-Befund vor der Commit-Freigabe —
`leseVerbrauch` (`src/claude-code-gateway/index.ts`) verlangt in `usage`
exakt `input_tokens`, `output_tokens`, `cache_read_input_tokens`,
`cache_creation_input_tokens` als Integer ≥ 0 und liefert sonst `null`; ob
ein realer claude-code-Lauf alle vier Felder immer trägt, war zum
Zeitpunkt des Befunds nicht belegt.

## 1. Corpus-Analyse: claude-code-`usage`-Schlüsselbild über reale Läufe

Quelle: `kontrollzustand-roh/` im Hauptrepo (`C:\Users\stefa\Projekte\ai-workforce`,
gitignored, nur gelesen — 5269 Rohereignisstrom-Verzeichnisse insgesamt).
Ein Nachweislauf über den GESAMTEN Bestand, gefiltert auf
`werkzeugStartziel[0]` = real `claude.exe`/`claude` (die überwiegende
Mehrheit der Verzeichnisse sind Test-/Gate-Fixtures mit
`node.exe -e "..."` als Startziel, keine echten CLI-Läufe — z. B.
`kontrollzustand-roh/001bfbfc-.../rohstrom.json`:
`werkzeugStartziel: ["...\\node.exe","-e","setTimeout(...=> {type:\"result\"})"]`,
`usage` fehlt dort komplett, weil der Prozess gar nicht `claude.exe` ist).

Ergebnis:

| Kennzahl | Wert |
|---|---:|
| Rohstrom-Verzeichnisse insgesamt | 5269 |
| Davon `werkzeugStartziel` = reales `claude(.exe)` | 90 |
| Davon `"type":"result"` geparst | 87 |
| Davon MIT `usage`-Objekt | 87 |
| Davon OHNE `usage`-Objekt | 0 |

Rollenverteilung der 87 realen Läufe mit `usage`-Objekt (über
`kontextpaket-<laufId>`-Lineage aufgelöst):

| Rolle | Anzahl |
|---|---:|
| `router` | 41 |
| `jarvis` | 28 |
| `ausfuehrung` | 16 |
| `scout` | 2 |

**(a)/(b) Schlüsselbild:** Von 87 realen Läufen mit `usage`-Objekt trugen
**alle 87** die vier von `leseVerbrauch` erwarteten Schlüssel
(`input_tokens`, `output_tokens`, `cache_read_input_tokens`,
`cache_creation_input_tokens`) — 0 Läufe ohne mindestens einen davon.
Beispiel-Schlüsselmenge (identisch über alle 87 Läufe):
`cache_creation`, `cache_creation_input_tokens`, `cache_read_input_tokens`,
`inference_geo`, `input_tokens`, `iterations`, `output_tokens`,
`output_tokens_details`, `server_tool_use`, `service_tier`, `speed`.

**(c) Negative/nicht-ganzzahlige Werte:** 0 von 87 — jeder geprüfte Wert
(`input_tokens`, `output_tokens`, `cache_read_input_tokens`,
`cache_creation_input_tokens`, `duration_ms`) war ein nicht-negativer
Integer.

**(d) Läufe ohne Cache-Write:** **0 von 87** Läufen hatten
`cache_creation_input_tokens === 0` — jeder real geprüfte Lauf hatte
mindestens etwas Cache-Write. Diese Teilfrage bleibt damit **ohne reales
Gegenbeispiel unbeantwortet**: ob ein claude-code-Lauf ganz ohne
Cache-Write ein anderes Schlüsselbild trägt (z. B. das Feld fehlt statt
`0` zu sein), ist im vorhandenen Corpus nicht zu belegen. Siehe „Bekannte
Grenzen" in `features/F32/feature.md`.

**Ergebnis Punkt 2 des Auftrags:** Da alle vier erwarteten Schlüssel in
JEDEM der 87 real geprüften Läufe vorkamen, greift die im Auftrag
genannte Bedingung „wenn ein erwarteter Schlüssel nicht durchgängig
vorkommt" nicht — **kein Code-Änderungsbedarf** an `leseVerbrauch` für
die Cache-Felder. `leseVerbrauch`s Alles-oder-nichts-Prüfung bleibt
unverändert; ihre JSDoc zitiert jetzt diesen Befund (87/87).

## 2. Analyseskript

Reines Lesekript, nicht Teil des Produktcodes (Scratchpad, nicht
committet). Kernlogik: pro Verzeichnis `rohstrom.json` laden,
`werkzeugStartziel[0]`-Basisname gegen `claude.exe`/`claude` prüfen,
`stdout` als `"type":"result"`-JSON parsen, `usage`-Schlüssel/-Werte
sammeln, Rolle über `kontrollzustand/lineage-kontextpaket-<laufId>`
auflösen.

## 3. Codex: `reasoning_output_tokens`-Gegenprüfung

Vorheriger Stand (Code-Review-Nachtrag): Behauptung „in jedem real
geprüften Rohstrom" stützte sich auf GENAU EINEN Strom
(`kontrollzustand-roh/router-4d225f56-*`). Jetzt gegen ALLE im Hauptrepo
vorhandenen `turn.completed`-Ereignisse mit `usage`-Objekt geprüft (Filter:
`werkzeugStartziel[0]`-Basisname enthält `codex`):

| Kennzahl | Wert |
|---|---:|
| Rohstrom-Verzeichnisse mit `codex`-Startziel | 14 |
| Davon mit `turn.completed`-Ereignis | 12 |
| Davon mit `usage`-Objekt | 12 |
| Davon mit `reasoning_output_tokens`-Feld | 12 |

`reasoning_output_tokens` ist in **allen 12** geprüften Ereignissen
vorhanden (kein Fehlen) und in **jedem** Fall kleiner als `output_tokens`:

| `laufId` (gekürzt) | `reasoning_output_tokens` | `output_tokens` |
|---|---:|---:|
| `0f5a8206-...` | 9 | 231 |
| `95d030d6-...` | 9 | 210 |
| `cd50dac9-...` | 22 | 750 |
| `jarvis-...38d653cc` | 0 | 666 |
| `jarvis-...e6ee6198` | 0 | 45 |
| `jarvis-...eaa0a215` | 77 | 204 |
| `router-376b6439-...` | 61 | 183 |
| `router-4d225f56-...` | 58 | 175 |
| `router-5d99a6be-...` | 39 | 198 |
| `router-abcd6a25-...` | 42 | 183 |
| `router-d45f7901-...` | 76 | 235 |
| `router-ffd35533-...` | 55 | 193 |

**Ergebnis Punkt 3 des Auftrags:** Die Behauptung „`reasoning_output_tokens`
ist eine Teilmenge von `output_tokens`, kein zusätzlicher Verbrauch" ist
jetzt auf 12 reale Ströme gestützt (vorher 1) — kein `[Annahme]`-Rückzug
nötig, der Satz in `leseVerbrauchCodex`s JSDoc zitiert jetzt n=12 statt
eines Einzelbelegs.

## 4. Realer Grün-Fall

**Befehl (Auszug, `baueAufruf`-Ausgabe für Rolle `jarvis`,
`werkzeugsatz.lesend`):**

```
claude --model claude-sonnet-5 --output-format json \
  --setting-sources '' \
  --tools Read,Grep,Glob --allowedTools Read,Grep,Glob \
  --strict-mcp-config --mcp-config '{"mcpServers":{}}' \
  -p "<Jarvis-Rolleninstruktion + Nachricht: 'F32 WS-1 Nachweis (realer
      Gruen-Fall): Antworte ausschliesslich mit dem JSON
      {\"art\":\"antwort\",\"antwort\":\"OK\"}'>"
```

**Methodischer Hinweis:** Der direkte HTTP-Weg über die auf Port 4183
gestartete Leitstand-Instanz dieses Worktrees (`POST /api/chat`) wurde
zuerst versucht und **real vom F4-Gültigkeitsschlüssel abgelehnt**
(`laufId jarvis-jarvis-chat-3213a735-...`, `GET /api/startfehler`:
`"F6a-Ablehnung: Drift im Gültigkeitsschlüssel: 'arbeitsverzeichnis_pfad'
(E-188)"`) — der reale, von Stefan erteilte Wirksamkeitsnachweis
(`state/aktuelle-autorisierung.json` →
`C:\Users\stefa\ai-workforce-autorisierung\...`) ist auf
`arbeitsverzeichnis_pfad: "C:\Users\stefa\Projekte\ai-workforce"` gepinnt,
nicht auf den Worktree-Pfad. Das ist E-188 korrekt wirksam, kein Bug.
Der abgelehnte Versuch (VERWEIGERT-Wirkungsmarke, keine Laufakte) wurde
aus `kontrollzustand/` wieder entfernt (nicht Teil des Nachweises).

Für einen echten Grün-Fall wurde `starteGateway` (Worktree-Code)
**direkt** aufgerufen, mit `process.chdir()` auf den real gepinnten Pfad
unmittelbar vor dem Aufruf (E6-Muster, wie
`scripts/verify-f6b-ws-f-rotfall.mjs`) — `basisVerzeichnis`/
`rohBasisVerzeichnis` blieben dabei absolute Pfade in diesen Worktree
hinein, keine Schreibwirkung auf den Hauptrepo. `startvorlagen/
beispielprojekt.json` liefert `werkzeugVersionDeklariert: "2.1.258
(Claude Code)"`, `berechtigungskontext: "profil-standard"`,
`werkzeugStartziel: ["C:\\Program Files\\claude\\claude.exe"]` — exakt die
im Wirksamkeitsnachweis gepinnten Werte, keine Fabrikation.

**Roh-Auszug** (`kontrollzustand-roh/jarvis-f32-nachweis-9b0b23e1-.../rohstrom.json`,
`stdout` als `"type":"result"` geparst):

```json
{
  "usage": {
    "input_tokens": 2,
    "cache_creation_input_tokens": 7240,
    "cache_read_input_tokens": 6271,
    "output_tokens": 20,
    "output_tokens_details": { "thinking_tokens": 0 }
  },
  "duration_ms": 2106,
  "duration_api_ms": 2732,
  "num_turns": 1,
  "modelUsage": {
    "claude-haiku-4-5-20251001": { "inputTokens": 1459, "outputTokens": 25, "...": "..." },
    "claude-sonnet-5": { "inputTokens": 2, "outputTokens": 20, "...": "..." }
  },
  "result": "{\"art\":\"antwort\",\"antwort\":\"OK\"}"
}
```

`modelUsage` trägt hier ZWEI Schlüssel (Haiku-Subagent + Sonnet-Antwort) —
`leseModellBeobachtet` liefert deshalb korrekt `null` (mehrdeutig, nicht
geraten, F-059/F-061, unverändert seit F6a) — real beobachtete Illustration
der in `features/F32/feature.md` „Bekannte Grenzen" dokumentierten
überladenen `null`-Gruppierung.

**Laufakte-Auszug** (`starteGateway`-Rückgabe,
`kontrollzustand/lineage-laufakte-jarvis-f32-nachweis-9b0b23e1-.../checkpoints/1-*.json`):

```json
{
  "laufakte_schema": "v0",
  "lauf_id": "jarvis-f32-nachweis-9b0b23e1-4e54-4d5d-8dc2-717e3ffca134",
  "werkzeug_version_deklariert": "2.1.258 (Claude Code)",
  "berechtigungskontext": "profil-standard",
  "modell_beobachtet": null,
  "beobachtungsbasis_vollstaendig": true,
  "verbrauch": {
    "input_tokens": 2,
    "output_tokens": 20,
    "cache_read_tokens": 6271,
    "cache_write_tokens": 7240,
    "dauer_ms": 2106,
    "dauer_api_ms": 2732,
    "turns": 1,
    "quelle": "claude-code"
  }
}
```

**API-Antwort-Auszug** (`GET /api/verbrauch` gegen die reale, laufende
Leitstand-Instanz dieses Worktrees, Port 4183 — 124 historische
Vor-F32-Läufe + dieser eine reale F32-Lauf):

```json
{
  "laeufeGesamt": 125,
  "ohneBeobachtungGesamt": 124,
  "gruppen": [
    {
      "rolle": "jarvis",
      "worker": "claude-code",
      "modell": null,
      "auftragId": null,
      "anzahlLaeufe": 1,
      "ohneBeobachtung": 0,
      "verbrauch": {
        "inputTokens": 2,
        "outputTokens": 20,
        "cacheReadTokens": 6271,
        "cacheWriteTokens": 7240,
        "dauerMs": 2106
      }
    }
  ]
}
```

Genau eine Gruppe mit Summe > 0 (die 124 historischen Läufe zählen
korrekt unter `ohneBeobachtungGesamt`, gehen in keine Summe ein) — AK4
real belegt, nicht nur über Fixtures.

## Ergebnis

1. Corpus-Befund (Punkt 1/2 des Auftrags): 87/87 reale claude-code-Läufe
   (4 Rollen) tragen alle vier erwarteten `usage`-Schlüssel als
   nicht-negative Integer — kein Code-Änderungsbedarf. Offen bleibt real
   unbelegt: das Schlüsselbild eines Laufs ganz ohne Cache-Write (0/87
   Beispiele im Corpus) — als „Bekannte Grenze" dokumentiert.
2. Codex-Gegenprüfung (Punkt 3): `reasoning_output_tokens` in 12/12 realen
   `turn.completed`-Ereignissen vorhanden und durchgehend < `output_tokens`
   — Behauptung jetzt auf n=12 statt n=1 gestützt, JSDoc entsprechend
   nachgezogen.
3. Realer Grün-Fall (Punkt 4): ein echter `claude.exe`-Lauf über den
   Worktree-Code liefert eine Laufakte mit befülltem `verbrauch` und
   erscheint in `GET /api/verbrauch` als eigene Gruppe mit Summe > 0.

## Status
- [x] Freigegeben
- [ ] Freigegeben mit Hinweisen
- [ ] Nicht freigegeben
- [ ] Blockiert

## Nächster sinnvoller Schritt
`features/F32/feature.md` um AK6 (realer Grün-Fall belegt) und den
Corpus-Befund unter „Bekannte Grenzen" ergänzen, dann `npm run check`
erneut grün bestätigen und die Freigabe zum Commit einholen.
