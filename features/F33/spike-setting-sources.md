# F33 WS-0 — Spike: Lädt `--setting-sources ''` die CLAUDE.md?

Wegwerfbar, kein Produktcode. Beantwortet die in `features/F33/feature.md`
(Auftrag) gestellte Messfrage für `src/claude-code-gateway/index.ts:288-289`
(`--setting-sources`, Vorgabe `'project'`; Rolle `jarvis` läuft seit F31 WS-3
mit `''`).

## Vorgehen

Temporäre, eindeutige Markerzeile `SPIKE-MARKER-F33-WS0-ZAHL: 84213` in
`CLAUDE.md` (als sichtbare Markdown-Zeile, NICHT im HTML-Kommentarblock am
Dateianfang — ein erster Versuch mit der Markerzeile im Kommentarblock lieferte
in beiden Läufen `UNKNOWN`; ein Kontrolllauf mit einer offenen Frage nach dem
Dateiinhalt zeigte, dass der Kommentarblock selbst nicht in den geladenen
Kontext gelangt — der erste Versuch war damit methodisch ungültig, nicht das
Ergebnis). Zwei reale `claude -p`-Läufe, `--tools ""`/`--allowedTools ""`
(keine Werkzeuge — die Antwort kann nur aus bereits geladenem Kontext kommen,
nicht aus einem selbst gelesenen `CLAUDE.md`), einmal mit
`--setting-sources project`, einmal mit `--setting-sources ''`. Frage nur über
die Markerzeile beantwortbar. Markerzeile danach wieder entfernt (`git diff
CLAUDE.md` bestätigt leer).

## Argv (identisch bis auf `--setting-sources`)

```
claude -p "In deinem Systemkontext steht ggf. eine Projektdatei CLAUDE.md mit einer Zeile, die mit SPIKE-MARKER-F33-WS0-ZAHL beginnt, gefolgt von einer Zahl. Nenne ausschliesslich diese Zahl als Antwort. Steht diese Zeile nicht in deinem Kontext, antworte exakt mit UNKNOWN." --model claude-sonnet-5 --output-format json --setting-sources project --tools "" --allowedTools ""
```
```
claude -p "<dieselbe Frage>" --model claude-sonnet-5 --output-format json --setting-sources '' --tools "" --allowedTools ""
```

Ausgeführt im Arbeitsverzeichnis `C:\Users\stefa\claude-worktrees\ai-workforce-f33`.

## Ergebnis

| Lauf | `--setting-sources` | Exit-Code | `is_error` | Antwort (`result`) |
|---|---|---|---|---|
| E | `project` | 0 | false | `84213` |
| F | `''` | 0 | false | `UNKNOWN` |

Session-IDs: E `2b3d0815-1220-4186-a284-486bf8b9df56`, F
`f14d14a9-15b6-4ee4-9512-eab287a9c4bd`.

## Schlussfolgerung

`--setting-sources ''` lädt die `CLAUDE.md` des Arbeitsverzeichnisses NICHT
(Lauf F kennt den Marker nicht, Lauf F mit `project` kennt ihn) —
Konsequenz für WS-1: die Rolle `jarvis` (läuft seit F31 WS-3 mit `''`)
bekommt Projektkontext ausschließlich über eine explizite Einspeisung, `CLAUDE.md`
allein deckt sie nicht ab; `router` behält die Vorgabe `'project'` und lädt
`CLAUDE.md` weiterhin selbst, bekommt die drei neuen Kontextdateien aber
trotzdem über den Context Builder eingespeist, weil `roadmap.json` und
`docs/projekt/kontext/*` nicht Teil der `CLAUDE.md` sind und von keiner
Einstellungsquelle automatisch geladen werden.
