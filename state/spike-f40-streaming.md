# Spike F40 WS-0 — Streaming & Werkzeug-Runden (Messung, kein Produktcode)

Stand 21.09.2026, Branch `spike/f40-streaming`. Skript:
`scripts/spike-f40-stream.mjs` (Wegwerf). Reale Claude-CLI
(`C:\Program Files\claude\claude.exe`, `claude-sonnet-5`), Tokens aus dem
echten `baueAufruf()` wie in `starteJarvisChatLauf` (`--setting-sources ''`,
leere `--mcp-config` + `--strict-mcp-config`, Werkzeugsatz `lesend` =
Read/Grep/Glob, `MAX_THINKING_TOKENS=0`, stdin `ignore`, cwd = Repo). Einzige
Abweichung: `--output-format stream-json --verbose` (ohne `--verbose` lehnt
die CLI stream-json im `-p`-Modus ab), Variante B zusätzlich
`--include-partial-messages`. Prompt = `baueJarvisAuftragstext(nachricht, [])`
plus die drei F33-Kontextdateien (Näherung, nicht der echte
Kontextpaket-Pfad). Läufe seriell.

**Lastvorbehalt:** zur Messzeit liefen 17 `claude.exe`-Prozesse auf der
Maschine (andere Sitzungen). Absolute Zeiten sind deshalb eher pessimistisch;
die *Abstände innerhalb eines Laufs* (Text → result → Prozessende) sind davon
kaum betroffen.

## 1. TTFT real — erste Inhaltszeile vs. Prozessende

Zeiten in ms seit `spawn()`. „Finale Antwort“ = Zeile mit dem Antworttext des
letzten Turns (`assistant` mit `text`, bzw. in B der letzte `message_start`).

| Lauf | num_turns | init | 1. sichtbarer Text | finale Antwort | `result`-Zeile | Prozessende |
|---|---:|---:|---:|---:|---:|---:|
| A p1 kurz/faktisch | 1 | 2804 | 4971 | 4971 | 5034 | 5767 |
| A p2 Roadmap | 1 | 2423 | 5978 | 5978 | 6036 | 6717 |
| A p3 Grep findings | 5 | 2870 | 9999 (Zwischenprosa) | 24707 | 24810 | 25397 |
| A p4 STATUS lesen | 3 | 2163 | 10821 | 10821 | 10882 | 11532 |
| A p5 mehrere Tools | 5 | 2310 | 11990 | 11990 | 12068 | 12705 |
| B p1 kurz, partial | 1 | 2738 | **4677** (1. `text_delta`) | 4673→4753 gestreamt | 4815 | 5504 |
| B p3 Grep, partial | 3 | 2621 | 4734 (Zwischenprosa) | 10657→14524 gestreamt | 14611 | 15284 |

Befunde:

- **Streaming ist echt, auch im `-p`-Einzelschuss.** Zeilen kommen einzeln
  über die Laufzeit verteilt (`chunks == zeilen` in jedem Lauf, keine
  Sammelausgabe am Ende). Kein STOP-Signal.
- **Ohne `--include-partial-messages`** kommt der Antworttext erst als
  vollständige `assistant`-Zeile, 60–100 ms vor der `result`-Zeile. Gewinn
  gegenüber heute dann nur der Abstand result → Prozessende.
- **`result`-Zeile → Prozessende: konstant 590–730 ms** (7/7 Läufe). Das ist
  der sichere, billige Gewinn: auf die `result`-Zeile reagieren statt auf
  `close`.
- **Mit `--include-partial-messages`** kommen Token-Deltas (`text_delta`) ab
  ~2 s nach init. Bei kurzen Antworten ist der ganze Text aber in < 100 ms
  durch (B p1: 4677→4753) — der Streaming-Gewinn ist dort vernachlässigbar.
  Bei langen Antworten spürbar (B p3: finale Antwort über ~3,9 s gestreamt).
- **Die großen Blöcke sind nicht die Textgenerierung:** CLI-Start bis `init`
  2,1–2,9 s, `init` bis erste Modellausgabe ~2 s, jede Werkzeug-Runde 2–6 s
  (p3: 5 Turns = 22 s gegen p1: 1 Turn = 2,3 s `duration_ms`).
- **Einschränkung für die UI:** Der Antworttext ist ein JSON-Objekt
  (`{"art":…,"antwort":…}`), teils mit Prosa/Codezaun davor (p3, p4, p5 in
  diesem Spike). Rohe Deltas sind so nicht anzeigbar; man müsste das Feld
  `antwort` inkrementell aus dem Teil-JSON herausschälen. Außerdem ist erst mit
  `message_delta.stop_reason = end_turn` klar, dass ein Turn der finale war —
  vorher kann es Zwischenprosa vor einem `tool_use` sein (p3: „I have
  sufficient detail…“).
- **Nutzbar ohne JSON-Problem:** `tool_use`-Zeilen kommen live (z. B. p3
  5678 Grep, 11008 Grep, 15458 Grep, 18077 Read) — reicht für eine
  Fortschrittsanzeige („Jarvis liest docs/STATUS.md …“).

## 2. Format-Kompatibilität: **ja**

Die letzte stream-json-Zeile ist `{"type":"result","subtype":"success",…}`
mit exakt demselben Feldsatz wie das heutige gepufferte `json` (Vergleich
gegen realen Rohstrom `jarvis-jarvis-chat-997da0d1-…`, in allen 7
vollständigen Läufen: 0 fehlende, 0 zusätzliche Felder):

```
duration_api_ms, stop_reason, session_id, total_cost_usd, usage, modelUsage,
permission_denials, terminal_reason, fast_mode_state, subagent_stats,
is_error, num_turns, subtype, api_error_status, result, ttft_ms, type,
duration_ms, uuid, ttft_stream_ms, time_to_request_ms, queued_turn_count
```

Belegzeile (A p1, gekürzt): `{"duration_api_ms":3547,"stop_reason":"end_turn",
"session_id":"fae327bf-…","total_cost_usd":0.036084,"usage":{…},…,
"result":"{\n  \"art\": \"antwort\", …","num_turns":1,"duration_ms":2317,…}`.
`result` ist derselbe String wie heute → `entferneCodezaun` /
`extrahiereErstesJsonObjekt` greifen unverändert. Einzige Anpassung im
Leser: statt `JSON.parse(stdout)` die letzte Zeile mit `type === 'result'`
nehmen. Größe beachten: `user`-Zeilen mit `tool_result` enthalten ganze
Dateien (p4: eine Zeile 57 KB für `docs/STATUS.md`) — der Rohstrom wird
entsprechend größer als heute.

## 3. Wiederkehrende Lesezugriffe (Kandidaten für Context-Builder-Vorabgabe)

Quelle: CLI-Sitzungsprotokolle (`~/.claude/projects/…/<session_id>.jsonl`)
der 15 realen Jarvis-Läufe mit `num_turns ≥ 2` aus `kontrollzustand-roh/`
(der Rohstrom selbst enthält im `json`-Format keine `tool_use`-Details).
126 Werkzeugaufrufe gesamt.

| Pfad | Läufe (von 15) | Bemerkung |
|---|---:|---|
| `docs/STATUS.md` | **11** (+ 2 Grep, + mehrfache Teil-Reads mit offset) | 27 KB; in fast jedem Mehrrunden-Lauf der erste Zugriff |
| `state/findings.md` | 4 (ca. 12 Grep/Read, bis zu 5× im selben Lauf) | 592 KB — nicht vorab mitgebbar; Kandidat: vorberechnete Liste „P1 · offen“ (aktuell 37 Einträge) |
| `~/.claude/projects/…/memory/MEMORY.md` | 4 | **Auffällig:** Jarvis liest das Claude-Code-Gedächtnis des Entwicklers, nicht Projektkontext — trotz `--setting-sources ''`. Gehört eher abgeschaltet als vorab mitgegeben (eigener Befund) |
| `features/F26/feature.md` / `F26/**` | 4 | featurebezogen, kein allgemeiner Kandidat |
| `docs/projekt/zielfassung.md` | 3 (inkl. Teil-Reads) | 77 KB — zu groß am Stück |
| `schemas/ergebnis-jarvis.schema.json` | 2 | Jarvis prüft sein eigenes Ausgabeschema nach — der Vertrag im Auftragstext reicht offenbar nicht immer |
| `scripts/check-f26-jarvis.mjs`, `package.json` | je 2 | Einzelfragen |

Im Spike selbst: p4 und p5 lasen `docs/STATUS.md` erneut, p3 grepte 3× in
`state/findings.md`.

Kandidaten (Priorität):
1. **Kompakter STATUS-Auszug** (aktuelle Phase/Meilenstein, offene Features)
   als vierte Einspeisung neben beschreibung/anweisungen/roadmap. Größter
   Einzelhebel: STATUS ist der häufigste und meist erste Zugriff.
2. **Vorberechnete Liste offener P1-Findings** (ID + Titel), nicht die
   Findings-Datei selbst.
3. Auto-Memory-Zugriff unterbinden (kein Kontext-Kandidat, sondern ein
   Leck bzw. eine unnötige Runde).

## 4. Abbruch mitten im Stream

- **C (Kill fest nach 2 s):** Kill bei 2132 ms, direkt nach der `init`-Zeile.
  Puffer: 1 vollständige Zeile (`system/init`), **kein Fragment**,
  `close(null, 'SIGTERM')`. Das nachgeschobene `taskkill /T /F` meldete
  „Prozess nicht gefunden“ — dasselbe Verhalten wie F-181.
- **D (Kill 300 ms nach dem ersten `text_delta`, partial):** Kill bei
  5411 ms. 36 Zeilen, alle gültiges JSON, **kein Restfragment**, letzte Zeile
  ein vollständiges `content_block_delta` (`"text":"stream WS-1"`), keine
  `result`-Zeile, `SIGTERM`.
- In beiden Fällen und in allen Läufen gilt `chunks == zeilen`: die CLI
  schreibt jede Zeile in einem Stück, auch 57-KB-Zeilen. Ein abgeschnittenes
  Fragment wurde **nicht beobachtet**, ist bei sehr großen Zeilen aber nicht
  ausgeschlossen (2 Fälle sind kein Beweis). Folge für den Leser: bei
  Abbruch fehlt die `result`-Zeile — er darf nicht auf „letzte Zeile ist
  result“ vertrauen und muss eine unparsbare letzte Zeile tolerieren.

## 5. Empfehlung

**F40 „Streaming“: ja, aber nur in der schlanken Form — keine
Token-für-Token-Anzeige der Antwort.**

- Umstellen auf `stream-json --verbose` (ohne `--include-partial-messages`)
  und **auf die `result`-Zeile reagieren statt auf Prozessende**: 0,6–0,7 s
  pro Lauf, in jedem Lauf, bei 100 % Format-Kompatibilität (Punkt 2).
- `tool_use`-Zeilen live als Fortschritt anzeigen: bei Mehrrunden-Läufen
  (10–25 s) der größte gefühlte Gewinn, ohne das JSON-Anzeigeproblem.
- Token-Streaming der Antwort **nicht** umsetzen: Gewinn bei typischen
  kurzen Antworten < 0,1 s (B p1), und es erzwingt Teil-JSON-Parsing plus
  Erkennen des finalen Turns. Aufwand und Risiko stehen in keinem Verhältnis.
- Der eigentliche Zeithebel ist **weniger Werkzeug-Runden** (Punkt 3):
  1 Turn ≈ 2–4 s, jede weitere Runde 2–6 s. STATUS-Auszug vorab mitgeben
  zuerst.

## Nebenbefunde

- Ein `-p`-Wert, der mit `-` beginnt, wird von der CLI als unbekannte Option
  geparst (erster Spike-Lauf: `error: unknown option '--- docs/…'`, Exit 1,
  0,4 s). Der Produktpfad ist nicht betroffen — `promptText` beginnt immer mit
  `Auftrag:` (`src/execution-controller/index.ts:278`).
- 3 von 5 A-Läufen verletzten den Ausgabevertrag (p3 englische Prosa vor dem
  JSON, p4 Prosa + Codezaun, p5 Codezaun). Kann an der Kontext-Näherung
  dieses Spikes liegen; die Extraktions-Fallbacks (F-506) decken diese Fälle ab.
