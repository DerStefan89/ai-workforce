# F45 B2b-3a — Plan (Spike Rückfrage im Lauf + check:gates)

Branch `f45/b2b3a-spike-rueckfrage` (von origin/main `6049744`, #345). Grundlage: F-1011 (keine Rechte-Rückfrage im
Lauf), F-980 (4) (Rückfrage an Stefan während des Baus), F-1120 (`check:gates`). Kein Produktcode für die Rückfrage
(B2b-3b, nach Entscheidung Stefan); kein `.claude/`, keine Änderung an `startvorlagen/` oder
`state/aktuelle-autorisierung.json`.

## Teil 1 — Spike

Frage: Trägt ein Workforce-Lauf (`claude -p`, Argv aus `baueAufruf`) über einen lokalen stdio-MCP-Server, der je Lauf
per `--mcp-config` mitgegeben wird, (a) Rechte-Anfragen über `--permission-prompt-tool` an uns und (b) eine „Frage an
Stefan“ als MCP-Werkzeug, deren Antwort wir liefern?

Aufbau (`features/F45/nachweise/b2b3a/`):
- `mcp-rueckfrage.mjs`: Mini-stdio-MCP-Server (JSON-RPC zeilenweise, ohne Abhängigkeit) mit zwei Werkzeugen —
  `rechte_pruefen` (Ziel von `--permission-prompt-tool`) und `frage_stefan(frage, optionen)`. Antwortet
  programmgesteuert nach einer Richtliniendatei (allow/deny, Wartezeit, Antworttext) und protokolliert jeden Aufruf
  als NDJSON.
- `spike-rueckfrage.mjs`: Wegwerf-Wurzel unter `os.tmpdir()`, Wegwerf-Git-Projekt mit Skelett-`.claude`
  (`vorlagen/projekt-skelett/.claude/settings.json` + Hooks, plus eine Deny-Probe-Regel nur im Wegwerf-Projekt).
  Argv aus `baueAufruf` (Werkzeugsatz `schreibend` der Startvorlage, `mcpConfig` mit dem Server, Werkzeugname
  `frage_stefan` in den erlaubten Werkzeugen wie `baueMcpAufruf`), zusätzlich `--permission-prompt-tool` vor `-p`,
  Prompt über stdin, Umgebung `WORKFORCE_LAUF_UMGEBUNG`.
- Läufe: L1 allow (Fragen 2, 3), L2 deny (Frage 2), L3 Wartezeit 90 s (Frage 4), L4 Frage-Werkzeug (Frage 5,
  Modell wie Ausführung). Frage 1 aus `claude --help`/Rohstrom, Frage 6 nur lesend aus `src/invocation-policy`.
- Rohströme mit `features/F45/nachweise/b2b1b/schwaerze.mjs` (NDJSON-Modus), Zählungen je Lauf, `spike.md` mit
  Ergebnis je Frage, Belegzeilen, Empfehlung A/B/C und Kosten.

## Teil 2 — check:gates (F-1120)

- `package.json`: `check:gates` = bisherige Kette von `check` bis einschließlich `check-secrets.mjs`;
  `check` = `npm run check:gates && npm run test && node scripts/aufraeumen-nachlauf.mjs`. Einzige Änderung an
  `package.json`.
- Ein Satz zur Rückfallebene in `docs/harness/` (nicht CLAUDE.md, nicht `.claude/`).
- F-1120 → erledigt; `docs/STATUS.md` „Findings bis F-1120“ bleibt.

## Akzeptanz

- `spike.md` beantwortet 1–6 mit Belegzeilen; Rohströme ohne persönliche Pfade.
- `npm run check:gates` grün; `npm run check` grün (oder Speicherabbruch gemeldet).
- code-reviewer-Pass auf `package.json` und Spike-Skripte.

## Risiken

- Schreibrecht über `allow`: Ein vom Werkzeug erlaubter Befehl umgeht den Werkzeugsatz — die Grenze muss vor dem
  Werkzeug liegen (Frage 3). Ergebnis offen, wird gemessen.
- Kosten: vier kurze Läufe, drei mit kleinem Modell.
