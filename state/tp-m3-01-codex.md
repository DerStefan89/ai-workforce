Stand dieser Fassung: 09.09.2026 (Spike S-M3-01, claude/153, Claude-Projekt
„AI Workforce")

Zweck: realer Nachweis, dass Codex CLI nicht-interaktiv mit
ChatGPT-Anmeldung ansprechbar ist, bevor F16 (zweiter Worker) gebaut wird
(E-M3-2, `docs/projekt/zielfassung.md:348`). Codex CLI war zu Beginn dieser
Sitzung bereits installiert und angemeldet (durch Stefan, außerhalb dieser
Sitzung) — in dieser Sitzung nicht installiert, nicht interaktiv
aufgerufen, keine Anmeldung angestoßen.

## Werkzeugversionen (Schritt 5 des Auftrags)

- Codex CLI: `codex-cli 0.153.4` (`codex --version`)
- Node: `v24.16.0` (`node --version`)
- Betriebssystem: Windows 11 Home, `10.0.26200.0` (`[System.Environment]::OSVersion.VersionString`,
  `Get-ComputerInfo`)

## Scratch-Verzeichnis

`$env:TEMP\codex-spike-20260909-192418`, außerhalb des ai-workforce-
Arbeitsbaums angelegt, zwei Seed-Dateien (`a.txt`, `b.txt`) vorab erzeugt.
Nach Abschluss aller Läufe vollständig gelöscht (siehe „Aufräumen" am
Ende).

**Abweichung von der Auftragsvorgabe, dokumentiert:** Der erste Versuch von
Lauf 1 mit genau dem vorgegebenen Argv scheiterte, bevor überhaupt ein
Modellaufruf stattfand:

```
Not inside a trusted directory and --skip-git-repo-check was not specified.
```

Codex CLI verweigert die Ausführung in einem Verzeichnis, das kein
Git-Repository ist, unabhängig vom Auftragstext. Um den eigentlichen
Gegenstand des Spikes (Erreichbarkeit von Codex CLI mit ChatGPT-Anmeldung)
prüfen zu können, ohne das vorgegebene Argv um ein Flag zu erweitern, wurde
im selben Scratch-Verzeichnis `git init` ausgeführt (kein Produktbezug,
kein Commit, keine Fernverbindung) — das Argv selbst blieb unverändert.
Alle folgenden Läufe fanden danach in diesem Verzeichnis statt.
[Fakt] — sollte für F16 berücksichtigt werden, falls Arbeitsverzeichnisse
für Codex-Aufträge nicht zwingend Git-Repositories sind.

## Lauf 1 — reale Antwort

- Argv: `codex exec --json "Nenne die Anzahl Dateien im aktuellen
  Verzeichnis und liste ihre Namen."` (Arbeitsverzeichnis: Scratch,
  nach `git init`)
- Exit-Code: `0`
- Vollständige stdout (JSONL, `lauf1-stdout.jsonl`):
  ```
  {"type":"thread.started","thread_id":"01a08733-6b51-7c32-be7a-fa7891bf58e6"}
  {"type":"turn.started"}
  {"type":"item.completed","item":{"id":"item_0","type":"agent_message","text":"Ich zähle die Dateien im aktuellen Verzeichnis und lese ihre Namen aus."}}
  2026-09-09T17:24:58.779565Z ERROR codex_core::tools::router: error=exec_command failed: CreateProcess { message: "Rejected(\"`\\\"C:\\\\WINDOWS\\\\System32\\\\WindowsPowerShell\\\\v1.0\\\\powershell.exe\\\" -Command '$files = @(Get-ChildItem -LiteralPath . -File -Force); Write-Output \\\"Anzahl Dateien: $($files.Count)\\\"; $files | Select-Object -ExpandProperty Name'` rejected: blocked by policy\")" }
  2026-09-09T17:25:01.747617Z ERROR codex_core::tools::router: error=exec_command failed: CreateProcess { message: "Rejected(\"`\\\"C:\\\\WINDOWS\\\\System32\\\\WindowsPowerShell\\\\v1.0\\\\powershell.exe\\\" -Command 'rg --files --hidden -g !*/**'` rejected: blocked by policy\")" }
  {"type":"item.completed","item":{"id":"item_1","type":"agent_message","text":"Ich konnte Anzahl und Namen nicht ermitteln: Die Ausführungsrichtlinie hat beide Versuche blockiert, das aktuelle Verzeichnis auszulesen."}}
  {"type":"turn.completed","usage":{"input_tokens":46997,"cached_input_tokens":39936,"cache_write_input_tokens":0,"output_tokens":161,"reasoning_output_tokens":0}}
  ```
- Beobachtung: Ein echter Modell-Turn fand statt (`thread.started`, echter
  `thread_id`, echter Token-Verbrauch, zwei verschiedene
  `agent_message`-Texte, `turn.completed`). Das ist eine reale Antwort im
  Sinne des Auftrags — keine statische/gecachte Ausgabe. [Fakt]
- Zusätzliche, nicht im Auftrag verlangte Beobachtung: Die inhaltliche
  Anfrage (Dateien zählen und auflisten) wurde NICHT erfüllt — beide
  Versuche des Modells, das Verzeichnis über PowerShell auszulesen, wurden
  von der Codex-eigenen Sandbox-Policy mit „blocked by policy" verweigert,
  nicht nur Schreibversuche. Das Modell hat dies im Klartext an den Nutzer
  gemeldet, statt eine erfundene Antwort zu liefern. [Fakt] — relevant für
  F16, falls Codex CLI auch für rein lesende Rollen zusätzliche
  Sandbox-/Approval-Konfiguration braucht (z. B. `--sandbox
  read-only`/`workspace-write`, `--ask-for-approval`), über die dieser
  Spike keine Aussage trifft [offene Unsicherheit].

## Lauf 2 — Rot-Fall (Schreibverweigerung)

- Argv: `codex exec --json "Erstelle eine Datei test.txt mit Inhalt
  'x'."` (kein `--sandbox`-Flag, Standard laut Doku = read-only)
- Exit-Code: `0`
- Vollständige stdout (JSONL, `lauf2-stdout.jsonl`):
  ```
  {"type":"thread.started","thread_id":"01a08734-1a20-7561-a292-2f0054d9a793"}
  {"type":"turn.started"}
  {"type":"item.completed","item":{"id":"item_0","type":"agent_message","text":"Ich versuche, die Datei `test.txt` mit dem Inhalt `x` anzulegen."}}
  2026-09-09T17:25:41.314592Z ERROR codex_core::tools::router: error=exec_command failed: CreateProcess { message: "Rejected(\"`\\\"C:\\\\WINDOWS\\\\System32\\\\WindowsPowerShell\\\\v1.0\\\\powershell.exe\\\" -Command \\\"Set-Content -LiteralPath 'C:\\\\Users\\\\stefa\\\\AppData\\\\Local\\\\Temp\\\\codex-spike-20260909-192418\\\\test.txt' -Value 'x' -NoNewline\\\"` rejected: blocked by policy\")" }
  {"type":"item.completed","item":{"id":"item_1","type":"agent_message","text":"Die Datei konnte nicht erstellt werden: Die Umgebung erlaubt nur Lesezugriff und hat den Schreibversuch blockiert."}}
  {"type":"turn.completed","usage":{"input_tokens":31160,"cached_input_tokens":27520,"cache_write_input_tokens":0,"output_tokens":125,"reasoning_output_tokens":0}}
  ```
- `test.txt` nach dem Lauf: `Test-Path` → `False` — Datei existiert real
  nicht. [Fakt]
- Feld/Text zur Verweigerung: kein eigenes strukturiertes Feld (kein
  `"type":"denied"` o. ä.) — die Verweigerung erscheint als Stderr-Zeile
  des Routers (`error=exec_command failed: ... rejected: blocked by
  policy`) und wird vom Modell selbst in der `agent_message` als
  Klartext-Erklärung wiederholt („Die Umgebung erlaubt nur Lesezugriff und
  hat den Schreibversuch blockiert."). [Fakt]
- Bewertung: Rot-Fall real gemessen, nicht nur behauptet — Schreibversuch
  fand statt (sichtbar im Log), wurde von der Sandbox verweigert, Datei
  entstand nicht.

## Lauf 3 — Schema-Konformität

- Schema-Datei `testschema.json` exakt wie im Auftrag vorgegeben:
  `{"type":"object","required":["ok"],"properties":{"ok":{"type":"boolean"}}}`
- Erster Versuch scheiterte an einem reinen Werkzeugartefakt dieser
  Sitzung, nicht an Codex CLI: PowerShells `Out-File -Encoding utf8`
  schreibt eine UTF-8-BOM (Bytes `EF BB BF`), die Codex' JSON-Parser als
  ungültiges JSON zurückwies (`Output schema file ... is not valid JSON:
  expected value at line 1 column 1`, Exit-Code `1`). Behoben durch
  BOM-freies Schreiben (`[System.IO.File]::WriteAllText` mit
  `UTF8Encoding($false)`). [Fakt, Ursache eindeutig identifiziert:
  Byte-Vergleich vor/nach Fix, `EF BB BF 7B ...` vs. `7B 22 74 ...`]
- Zweiter Versuch, Argv: `codex exec --json --output-schema
  <scratch>\testschema.json "Antworte mit einem JSON-Objekt {ok: true}."`
  — Exit-Code `1`, echte API-Fehlermeldung:
  ```
  {"type":"error","message":"{\n  \"type\": \"error\",\n  \"error\": {\n    \"type\": \"invalid_request_error\",\n    \"code\": \"invalid_json_schema\",\n    \"message\": \"Invalid schema for response_format 'codex_output_schema': In context=(), 'additionalProperties' is required to be supplied and to be false.\",\n    \"param\": \"text.format.schema\"\n  },\n  \"status\": 400\n}"}
  {"type":"turn.failed", ...}
  ```
  Die im Auftrag wörtlich vorgegebene Schema-Datei ist mit der
  zugrundeliegenden Modell-API im Strict-Modus nicht kompatibel — die API
  verlangt `"additionalProperties": false`, das Auftragsschema hat dieses
  Feld nicht. [Fakt] — relevant für F16: jedes künftig verwendete
  `--output-schema` muss `additionalProperties: false` setzen.
- Um die eigentliche Frage (liefert Codex CLI schemakonformes JSON, wenn
  das Schema selbst gültig ist?) real zu beantworten, wurde eine um
  `"additionalProperties": false` ergänzte Kopie (`testschema-fixed.json`)
  probiert — Abweichung vom Auftragswortlaut, hier offengelegt statt
  stillschweigend. Argv identisch bis auf den Dateinamen. Exit-Code `0`:
  ```
  {"type":"thread.started","thread_id":"01a08734-e3a5-75f0-a3b2-5dd03265941c"}
  {"type":"turn.started"}
  {"type":"item.completed","item":{"id":"item_0","type":"agent_message","text":"{\"ok\":true}"}}
  {"type":"turn.completed","usage":{"input_tokens":15490,"cached_input_tokens":0,"cache_write_input_tokens":0,"output_tokens":15,"reasoning_output_tokens":0}}
  ```
  Endantwort `{"ok":true}` entspricht dem (korrigierten) Schema:
  Pflichtfeld `ok` vorhanden, Typ `boolean`, keine Zusatzfelder. [Fakt]

## Modellidentität (Schritt 4 des Auftrags)

Kein Feld in den JSONL-Ausgaben aller vier Läufe nennt eine Modellkennung
(`grep -i "model"` über alle `lauf*.jsonl` → keine Treffer). Auch
`~/.codex/config.toml` existiert auf dieser Maschine nicht (Standard-
Konfiguration, kein expliziter Modellname gesetzt). `auth.json` unter
`~/.codex/` wurde aus Datenschutzgründen nicht gelesen (enthält
ChatGPT-Anmeldedaten). **Ergebnis: keine Modellidentität aus den
JSON-Ausgaben zitierbar** — weder ein Fakt noch eine Vermutung, da schlicht
kein Feld dafür existiert. [Fakt, negativ]

## Aufräumen

- Scratch-Verzeichnis `$env:TEMP\codex-spike-20260909-192418` nach Abschluss
  vollständig gelöscht (`Remove-Item -Recurse -Force`).
- `git status --short` im ai-workforce-Arbeitsbaum zeigt danach nur diese
  Datei (und ggf. `state/tooling.md`), kein Scratch-Rest im Repo gelandet.

## Fazit

**S-M3-01 BESTANDEN.**

- Lauf 1 real: bestätigt — echter Modell-Turn mit Token-Verbrauch und
  Thread-ID, keine gecachte Antwort. Mit Einschränkung: Die inhaltliche
  Anfrage selbst wurde durch eine Sandbox-Policy verweigert, die auch
  lesende Shell-Befehle blockiert (nicht nur Schreiben) — das Modell hat
  dies ehrlich gemeldet statt zu halluzinieren. Das ist im Sinne des
  Auftrags ausreichend für „real antwortet", verdient aber Beachtung bei
  F16: die konkrete Sandbox-/Approval-Konfiguration für „nur lesende
  Rollen" (E-M3-2) muss noch bestimmt werden — mit den hier verwendeten
  Standardeinstellungen ist selbst Lesen blockiert.
- Lauf 2 Rot-Fall real gemessen: Schreibversuch fand nachweislich statt
  (im Log sichtbar), wurde verweigert, Datei entstand nicht.
- Lauf 3 Schema real: mit dem im Auftrag vorgegebenen Schema schlägt der
  Aufruf an der Modell-API fehl (fehlendes `additionalProperties: false`
  im Schema selbst, kein Codex-CLI-Fehler) — mit korrigiertem Schema
  liefert Codex CLI eine exakt schemakonforme Antwort.

Zwei dokumentierte Blocker, beide umgangen und offengelegt statt verdeckt:
Trust-Check (`git init` im Scratch-Verzeichnis) und BOM in der
Schema-Datei (BOM-freies Schreiben). Ein dritter Punkt bleibt offen für
F16, kein Blocker für dieses Spike: Standard-Sandbox blockiert auch reine
Lesebefehle, nicht nur Schreiben — die genaue Konfiguration für „nur
lesende Rollen" ist noch zu klären.

## Status
- [x] Freigegeben mit Hinweisen
- [ ] Nicht freigegeben
- [ ] Blockiert

## Nächster sinnvoller Schritt
`state/tooling.md`-Eintrag ergänzen (Aufgabe 3), dann Freigabe einholen,
committen und pushen (Skill `git-flow`).
