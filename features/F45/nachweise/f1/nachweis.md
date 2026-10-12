# F45 F-1 — Nachweis echter Läufe (Fähigkeiten im Lauf)

Stand 12.10.2026, Branch `f45/f1-faehigkeiten-im-lauf` (Basis `581269a`), Stand nach der Korrekturrunde. Skript
`realer-lauf.mjs` (Hand, nicht in `npm run check`; `node realer-lauf.mjs [<lauf>]`). CLI `2.1.296`, Modell
`claude-haiku-4-5`. Echter Startweg: `loeseAusfuehrungsEingabenAuf` (Katalog-Kontext, lokale Datei in tmp) →
`fuehreAufgabeDurch` (Abgleich vor dem Spawn, Init-Gate, Laufakte) → CLI. Testprojekt = Wegwerf-Git-Repo mit dem
`.claude` des Skeletts (Hooks, Agents qa/code-reviewer/architecture-advisor, 7 Skills, Command lessons); Startfreigabe
über eine F4-Fixture in tmp. Rohströme und Kontrollzustand blieben in `%TEMP%\f45-f1-real-*` (nicht committet); hier nur
die Zählungen `zaehlung-<lauf>.json`.

| Lauf | Lauf-ID | Einstellung | Ergebnis |
|---|---|---|---|
| L1 | `f45-f1-l1-qa-an-efe2dad8-3b71-4526-9dbf-9680d531fc85` | `an: [agent:qa]` + Ort-B-Skill frontend-design | ERFOLGREICH |
| L2 | `f45-f1-l2-qa-aus-d0cf66b7-850d-4f65-98a9-71f93946b8fc` | `an` leer (qa aus), ohne Ort-B | ERFOLGREICH |
| L3 | `f45-f1-l3-nur-qa-cd47cf01-2f3d-49e4-bd5f-6906435074ef` | `an: [agent:qa]`, ohne Ort-B | ERFOLGREICH |

**L1** — Init-Gate grün: `init.plugins = []` (eingebaute Plugins per `enabledPlugins` aus), `init.skills =
[frontend-design]` (kein `plugin-authoring`; Beleg F-1053 im echten Ort-B-Lauf), `init.tools` mit `Task`.
`faehigkeiten_im_lauf`: frontend-design (katalog) aktiv, 1 Aufruf; `agent:qa` (projekt, Hash = Katalog) aktiv, 1 Aufruf,
0 fehlgeschlagen; `fremde_aufrufe`: general-purpose mit `fehler: true` — „Agent type 'general-purpose' has been denied by
permission rule 'Agent(general-purpose)' from cliArg.“

**L2** — qa aus: kein `Agent` im Werkzeugsatz (`init.tools` ohne `Task`), kein `--settings`, kein Init-Gate (Argv wie
ohne Fähigkeiten; die eingebauten Plugins stehen deshalb wie heute in `init.plugins`); `agent:qa` `aktiv: false`, 0 Aufrufe;
Antwort: „Agent-Tool ist nicht in meinen verfügbaren Werkzeugen aufgeführt.“

**L3** (QA 6: Zweig ohne Ort-B) — `--settings` mit `disableBundledSkills`, `skillOverrides` off für alle Projekt-Skills/
-Commands und `enabledPlugins` aus; `init.skills = []`, `init.plugins = []`, Init-Gate grün; `agent:qa` 1 Aufruf („OK-QA“);
Explore → „denied by permission rule 'Agent(Explore)' from cliArg.“ (`fremde_aufrufe`, `fehler: true`).

Nicht in diesem Nachweis: Lauf über die Oberfläche/Freigabe (UI in F-2), Lauf in haushaltsbuch2 (dessen Hooks weichen vom
Nachweis ab, F-1047), Groß-/Kleinschreibung in `Agent(<name>)` und Agent-Aufruf ohne `subagent_type` (F-1055 (2)).
