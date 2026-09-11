# F19 — Bekannte Capability-Lücken

Legt fest, welche Capabilities aktuell OHNE verfügbare Ressource sind —
gelesen und geprüft von `scripts/check-f19-ressourcen.mjs` Regel 7: jede in
`ROLLENVERTRAEGE.benoetigte_capabilities` genannte Capability muss entweder
über mindestens eine Ressource registriert sein (unabhängig von `verfuegbar`)
oder hier benannt sein.

Stand 12.09.2026: **keine der von `ROLLENVERTRAEGE` benötigten Capabilities
ist ungedeckt** — `CODE_WRITE`, `CODE_REVIEW`, `REPO_READ`, `PLAN_REVIEW`,
`TEST_DESIGN`, `TASK_CLASSIFICATION`, `STRUCTURED_OUTPUT` sind alle über
`claude-code` und/oder `codex` registriert (siehe `ressourcen.json`, F-346
für die eine bekannte STRUCTURED_OUTPUT-Einschränkung bei `claude-code`).
Diese Datei ist deshalb heute rein informativ und wird erst load-bearing,
sobald eine Rolle eine der unten genannten Capabilities in ihre
`benoetigte_capabilities` aufnimmt.

## Externe Kandidaten ohne verfügbare Ressource

Alle 13 externen Kandidaten in `ressourcen.json` (`typ: "extern"`) tragen
`freigabe: "OFFEN"` — Registrierung erzeugt keine Verfügbarkeit (R2). Ihre
Capabilities sind heute ausschließlich über diese nicht verfügbaren Einträge
abgedeckt:

| Capability | Ressource(n) |
|---|---|
| `BROWSER_AUTOMATION` | `playwright-mcp`, `claude-in-chrome` |
| `UI_VISUAL_TESTING` | `playwright-mcp` |
| `DATABASE_ACCESS` | `supabase-mcp` |
| `WEB_RESEARCH` | `firecrawl-mcp`, `perplexity-mcp` |
| `LIBRARY_DOCS` | `context7-mcp` |
| `UI_COMPONENT_GENERATION` | `magic-21st-dev-mcp` |
| `NOTES_ACCESS` | `obsidian-mcp` |
| `UI_UX_DESIGN` | `frontend-design`, `taste-skill`, `impeccable`, `ui-ux-pro-max` |
| `UI_ANIMATION` | `animate-skill` |

Eine Rolle, die künftig eine dieser Capabilities benötigt, kann sie erst
real erfüllen, wenn der betroffene externe Kandidat freigegeben wird
(Skill `werkzeug-auswahl`) — nicht durch eine Änderung an diesem Modul.
