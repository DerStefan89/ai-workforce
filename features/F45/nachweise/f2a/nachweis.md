# F45 F-2a — Nachweis Beleg 13 (Fähigkeiten im echten Lauf über die Oberfläche)

Stand 12.10.2026, Branch `f45/f2a-faehigkeiten-oberflaeche` (Basis `849fda5`), Stand nach der Korrekturrunde. Skript
`beleg13.mjs` (Hand, nicht in `npm run check`). CLI `2.1.296`, Modell `claude-haiku-4-5`. Eigene Leitstand-Instanz
(`erzeugeRequestHandler` mit Oberfläche, Port 4391) für ein Wegwerf-Testprojekt mit dem Skelett-Harness (Hooks, Agents
qa/code-reviewer/architecture-advisor, 7 Skills), Wegwerf-Kontrollzustand und Wegwerf-`faehigkeiten.lokal.json`;
Startfreigabe über eine F4-Fixture (Muster F-1). playwright-mcp und frontend-design sind die auf diesem Rechner
installierten Katalog-Einträge (`~/.ai-workforce/cap`, nur gelesen). Rohströme und Kontrollzustand blieben in
`%TEMP%\f45-f2a-beleg13-*` (nicht committet); hier nur `zaehlung-<lauf>.json` und `ablauf.json`.

Weg der Oberfläche: Schalter = `POST …/faehigkeiten/aktivierung`; Freigabeblock = `GET /api/workflows/<id>`; Freigabe
mit genau den angezeigten Kennungen (`empfehlungIdsFuerFreigabe`: Katalog-Kennungen plus `agent:qa@<sha256>`).

| Lauf | Lauf-ID | Einstellung | Ergebnis |
|---|---|---|---|
| L1 | `d39439f0-425e-406c-9810-6463cb449b21` | `agent:qa` eingeschaltet; playwright-mcp und frontend-design an (Standard) | Ablauf ABGESCHLOSSEN |
| L2 | `c54315c6-b1c5-48b3-9496-cf6b22aebb04` | `agent:qa` über den Schalter ausgeschaltet | Ablauf ABGESCHLOSSEN |

**L1** — gesendet: `frontend-design@d97a00cd…`, `playwright-mcp@400dcf35…`, `agent:qa@5aed8133…`. `faehigkeiten_im_lauf`:
playwright-mcp (katalog) aktiv, 1 Aufruf, 0 Fehler; frontend-design (katalog) aktiv, 1 Aufruf, 0 Fehler; `agent:qa`
(projekt) aktiv, 1 Aufruf, 0 Fehler; die übrigen Projekt-Einträge aus (Opt-in) bzw. „Inhalt weicht von der Freigabe ab“
(git-flow, handoff-vertrag — Skelett ≠ Katalog-Datei, F-1060 (9)); keine fremden Aufrufe. `init.plugins = []`,
`init.skills = [frontend-design]`, MCP `playwright-mcp` verbunden. Antwort: Skill geladen, Seitentitel „Beleg 13
Testseite“, qa „OK-QA“.

**L2** — gesendet nur die Katalog-Kennungen (qa ist aus). `agent:qa` aktiv false, 0 Aufrufe; Antwort: „Das
Agent-Werkzeug ist nicht in den verfügbaren Tools vorhanden.“ MCP und Skill weiter je 1 Aufruf.

**Oberfläche** (`render/`): Workforce „Dieses Projekt“ nach L2 zeigt playwright-mcp und frontend-design „aktiv ·
benutzt · 1 Aufruf“, qa „aus · im Lauf aus“ (`workforce-mit-eintraegen-*`); Lauf-Detail L1 „3 aktiv · 3 benutzt · 9 aus ·
0 fremde Aufrufe“ mit qa aktiv/1 (`lauf-detail-l1`), L2 „2 aktiv · 2 benutzt · 10 aus“ (`lauf-detail-l2`); Abnahme L1
mit Kurzzeile „Fähigkeiten im Lauf“ (`abnahme-l1`).

**Fehlversuch vor dem Nachweis (Init-Gate wirkt):** Im ersten Anlauf fehlte der Testinstanz `cwd: projekt` (der echte
Server setzt es je Projekt) — die CLI lief im Prozessordner ai-workforce und lud dessen Agents. Das Init-Gate brach den
Lauf vor dem ersten Werkzeugaufruf ab: „init.agents enthält unbekannte Agents: design-guardian, scout“. Skript korrigiert,
Läufe wiederholt.

**Render-Zustände** (`render/<zustand>/`, `scripts/render-nachweis.mjs`, 19 Folgen, alle aus dem Endstand vom 12.10.2026
nach der Entscheidung zu F-1061 (3)): mit Einträgen (de 1440/390, ru 390, en 1440, hell, Zoom 200 %), leer, Ladefehler,
ungültige Datei, Lauf aktiv (Schalter gesperrt), außerhalb geändert mit „Datei geprüft – Stand übernehmen“ (Knopf, 409 bei
erneuter Änderung, Knopf im Lauf gesperrt), Inhalt weicht ab (Knopf → Bestätigungsblock mit Pfad und Hash → 409 „Nicht
freigegeben“), Lauf-Detail L1/L2 (+ ru 390, hell, Zoom 200 %), Abnahme L1. Fachzustände ohne echten Anlass über Antwort-Attrappen (`anfragenAntworten`) auf der echten Antwort.


Nachtrag Restrunde (12.10.2026): Stapelung der Lauf-Detail-Tabelle unter 900 px (Zoom 200 %); `lauf-detail-l1-zoom200` und `lauf-detail-l1-ru-390` neu gerendert gegen dieselbe Testinstanz (`instanz-erneut.mjs <Wegwerf-Wurzel>`, keine neuen Läufe, gleiche Lauf-IDs). design-guardian-Bestätigung: „freigegeben mit Hinweisen“ (Hinweise in F-1060 (12)–(14)).
