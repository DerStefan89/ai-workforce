# F36 WS-5a — Echter Installationsnachweis (einmalig, nicht in `npm run check`)

Stand 29.09.2026, Worktree `aiw-f36-ws5a`, node v24.16.0, npm 11.18.0.

## Durchführung

`node features/F36/nachweis-ws5a-installation/echter-nachweis.mjs` ruft
`bereiteInstallationVor` und `installiereRessource`
(`src/ressourcen/installation.ts`) mit den **echten Runnern** auf — echtes
`npm view`/`npm install` gegen die Registry, echter Serverstart mit MCP
`initialize` + `tools/list` — gegen:

- eine **temporäre Kopie** des echten `ressourcen.json` (Eintrag
  `playwright-mcp` mit `herkunft.paket` `npm:@playwright/mcp` und
  `installation_vorlage`),
- einen **temporären cap-Ordner** unter `%TEMP%`.

Beides wird am Ende gelöscht. Das Skript prüft selbst, dass das echte
`ressourcen.json` bitgleich bleibt (sha256 vorher/nachher) und
`~/.ai-workforce` nicht entsteht; zusätzlich vorher/nachher
`git hash-object ressourcen.json` = `b294046d…` und `~/.ai-workforce` nicht
vorhanden. Vollständige Ausgabe des letzten Laufs: `ergebnis.json`. Zwei Läufe am 29.09.2026, beide grün; der zweite nach den Korrekturen aus Reviewer-/QA-Pass (Installieren verlangt den `eintragHash` aus dem Vorbereiten).

## Ergebnis

| Größe | Wert |
|---|---|
| Paket | `@playwright/mcp` |
| Version (aus `npm view …@latest`) | `0.0.83` |
| integrity (Registry = Lockfile) | `sha512-oNcl+Ae2/IAjhfPeP46BfIkSakfmprY+aOtkv5MjrQ4lPav4/yNtPhL0iq8SlIM90oApWgBDUxaNKvktazUKOg==` |
| Lizenz (Registry) | Apache-2.0 |
| Dauer Vorbereiten (`npm view`) | 18,5 s (1. Lauf, kalter npm-Cache) · 0,8 s (2. Lauf mit Endstand des Codes inkl. `eintragHash`) |
| Dauer Installieren (npm install + Prüfungen + Katalog schreiben) | 7,9 s (1. Lauf) · 2,3 s (2. Lauf) |
| bin | `cli.js` (Paket-`package.json`: `"bin": {"playwright-mcp": "cli.js"}`) |
| Katalogkopie danach | gültig, `freigabe: FREIGEGEBEN`, `installation.mcp_server` = node-Pfad + `[<cap>/playwright-mcp/node_modules/@playwright/mcp/cli.js, --headless, --isolated, --output-dir, {ausgabe_ordner}, --allowed-origins, {projekt_origins}]` |

Vom Server per `tools/list` gemeldete Werkzeuge (25):
`browser_close`, `browser_resize`, `browser_console_messages`,
`browser_handle_dialog`, `browser_emulate_media`, `browser_evaluate`,
`browser_file_upload`, `browser_drop`, `browser_find`, `browser_fill_form`,
`browser_press_key`, `browser_type`, `browser_navigate`,
`browser_navigate_back`, `browser_network_requests`,
`browser_network_request`, `browser_run_code_unsafe`,
`browser_take_screenshot`, `browser_snapshot`, `browser_click`,
`browser_drag`, `browser_hover`, `browser_select_option`, `browser_tabs`,
`browser_wait_for`.

Alle acht freigegebenen Einzelnamen der Vorlage sind darunter:
`browser_navigate`, `browser_snapshot`, `browser_take_screenshot`,
`browser_click`, `browser_type`, `browser_wait_for`,
`browser_console_messages`, `browser_close`.

## Grenzen dieses Nachweises

- Der Serverstart wurde mit Testwerten der Platzhalter geprüft
  (`--allowed-origins http://localhost:9;http://127.0.0.1:9`), ohne
  Browser-Aktion. Ob der Browser startet (vorhandenes Chrome/Chromium, keine
  Playwright-Browser-Binärdateien wegen `--ignore-scripts`) und dass eine
  fremde Origin verweigert wird (Rot-Fall S5c), belegt erst der Reallauf
  nach WS-5b.
- Die Dauern schwanken stark mit Netz und npm-Cache.
