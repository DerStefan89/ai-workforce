# F36 WS-5a — Render-Nachweis „Freigeben & installieren“ (F-622)

Stand 29.09.2026, Worktree `aiw-f36-ws5a`. Chromium headless über
`scripts/render-nachweis.mjs`; alle Bilder sind Ausschnitte von
`#workflow-bedienung` (PNG).

## Erzeugung

`node features/F36/nachweis-ws5a-ui/erzeuge-nachweis.mjs` (nicht Teil von
`npm run check`). Je Klickfolge ein frischer Fixture-Leitstand auf Port 4177
(`erzeugeRequestHandler`, Muster `features/F36/nachweis-ws3-ui/`):

- **Installationswurzel (Wegwerf):** Fixture-`ressourcen.json` mit dem
  installierbaren lokalen MCP `playwright-mcp` (`herkunft.paket`
  `npm:@playwright/mcp`, `installation_vorlage`, `OFFEN`, ohne
  `installation`) und einem offenen externen Skill.
- **cap- und Laufausgabe-Wurzel:** Wegwerf-Ordner (Optionen `capWurzel`,
  `laufausgabeWurzel`) — `~/.ai-workforce` bleibt unberührt.
- **Runner gestubbt:** `npm view`/`npm install` ohne Netz (Version `0.0.83`
  und integrity aus dem echten Nachweis), Serverstart-Prüfung meldet die
  Werkzeugnamen. Im Fehlerszenario weicht die integrity im Lockfile ab.
- **Workflow:** Auftrag, Router-Artefakt (`bugfix`) und Workflow
  `f36-ws5a-nachweis` mit einem ZWINGEND-Ausführungsschritt (schreibend).
- **Projekt-URL:** Szenario „erfolg“ mit `vorschauUrl`
  `http://localhost:5173`, Szenario „fehler“ ohne.

## Bilder

| Datei | Viewport | Größe | Zu sehen |
|---|---|---|---|
| `erfolg/01-knopf.png` | 1100 px | 770×900, 134 KB | Empfehlungsblock mit Projekt-URL; `playwright-mcp` unter „Passt, nicht im Lauf“ mit Knopf „Freigeben & installieren“ |
| `erfolg/02-bestaetigung.png` | 1100 px | 770×900, 171 KB | Bestätigungsblock: Paket `npm:@playwright/mcp`, Version `0.0.83`, integrity, Lizenz (Katalog + Registry), Kosten, Wirkung, Werkzeuge, Zielordner, Informationsadresse; Knöpfe „Installieren“/„Abbrechen“ |
| `erfolg/03-erfolg.png` | 1100 px | 770×900, 150 KB | nach „Installieren“: Erfolgsmeldung oben im Block, `playwright-mcp` jetzt unter „Wird genutzt“; der Freigeben-Knopf trägt `data-empfehlung-ids` (Protokoll) |
| `bestaetigung-400/01-bestaetigung-400.png` | 400 px | 270×1400, 107 KB | Bestätigungsblock schmal: integrity, Werkzeugnamen und Zielordner brechen um, nichts läuft aus der Karte |
| `erfolg-ohne-url/01-erfolg-ohne-url.png` | 1100 px | siehe Protokoll | ohne `vorschau_url`, Installation gelingt: Erfolgsmeldung mit Commit-Hinweis oben im Block; der Eintrag bleibt mit „Projekt-URL (vorschau_url) fehlt“ in „Passt, nicht im Lauf“ |
| `fehler/01-fehler.png` | 1100 px | 770×700, 122 KB | ohne `vorschau_url`: Hinweis „Projekt-URL: nicht gesetzt …“, Grund „Projekt-URL (vorschau_url) fehlt“ am Eintrag; nach „Installieren“ die Ablehnung „integrity im Lockfile ≠ angezeigte … nichts freigegeben“ |

Je Ordner liegen `protokoll.md`/`protokoll.json` (Klicktabelle), daneben
die Klickfolgen `klickfolge-*.json`. Klicktabelle „erfolg“: Knopf → Bestätigungsblock
und „Installieren“ vorhanden → nach dem Klick Erfolgsmeldung, Knopf und
Bestätigungsblock weg (der Eintrag ist in „Wird genutzt“ gewandert).

## Hinweise

- Das Workboard nutzt denselben Baustein (`empfehlung-installation.js`),
  sein Klickweg ist hier nicht eigens belegt (Bekannte Grenze in
  `features/F36/feature.md`).
- Die Screenshots zeigen den Fixture-Zielordner unter `%TEMP%`; im echten
  Betrieb steht dort `~/.ai-workforce/cap/<id>`.
- `render-nachweis.mjs` klickt innerhalb eines Schritts vor dem Warten; die
  Klickfolgen trennen deshalb „warten“ und „klicken“ in eigene Schritte.
