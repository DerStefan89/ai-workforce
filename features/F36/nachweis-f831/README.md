# F-831: Messung von `init.slash_commands` (30.09.2026)

Erzeugt mit `node features/F36/nachweis-f831/erzeuge-nachweis.mjs messung` und
`… gegenpruefung <name…>`. Das Skript läuft einmalig von Hand und ist nicht Teil von `npm run check`.
Es nutzt den Produktionsweg wie `nachweis-ws5b` (`loeseAusfuehrungsEingabenAuf` → `baueAufruf` →
`starteProzess`), aber mit eigener cap-Wurzel unter `%TEMP%\f831-nachweis\`. Dort liegen auch die
Rohströme; sie sind flüchtig und nicht im Repo. Zum Zeitpunkt der Messung installiert war die
CLI **2.1.285 (Claude Code)**, als Modell galt das der Startvorlage.

Aufbau: ein Ort-B-Skill (`pruef-skill`) in einem Wegwerf-Projekt. Das Projekt ist eine Kopie von
`vorlagen/projekt-skelett` und bringt 7 Projekt-Skills mit. Dazu kommen die Projekt-Commands
`lessons` und `sub/tief`. In den JSON-Dateien sind Home- und Temp-Pfade maskiert, cwd und Argv
wurden nicht übernommen.

## messung.json

- Der Auftrag lautete „Antworte nur mit OK“; die Dauer lag bei rund 4 s, es gab 0 Aufrufe.
- `init.slash_commands`: 37 Einträge, nämlich `pruef-skill` und 36 weitere. Die 36 stimmen
  genau mit 9b′/9b″ unter 2.1.284 überein. Gesperrte Projekt-Skills und -Commands stehen nicht darin.
- `init.plugins`: `cc-plugin-telemetry@builtin`. Unter 2.1.284 hieß der Eintrag noch
  `telemetry@builtin`. Er wird nicht geprüft (Grenze, siehe feature.md).
- Das Init-Gate mit der neuen Prüfung ergab `bestanden`.

## gegenpruefung.json (Muster 9b″)

| Name | tool_result |
|---|---|
| `pruef-skill` (Ort B) | „Launching skill: pruef-skill“ |
| `clear`, `skill-doctor` | „… is a built-in CLI command / UI command, not a skill“ |
| `insights`, `__remote-workflow`, `team-onboarding` | „cannot be used with Skill tool due to disable-model-invocation“ |
| `security-review` | „disabled … by the disableBundledSkills setting“ |
| `lessons` (Projekt-Command) | „disabled for model invocation in skillOverrides settings“ |

Die Referenzmenge `src/claude-code-gateway/slash-commands-referenz.json` enthält die 36 Namen.
Aufrufbar ist keiner davon; das zeigen diese Gegenprüfung und 9b′/9b″, wo unter 2.1.284 alle
36 Namen geprüft wurden.
