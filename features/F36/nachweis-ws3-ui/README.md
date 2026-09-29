# F36 WS-3 — Render-Nachweis Katalog-Empfehlung am ZWINGEND-Start (AK7, F-622)

Stand 29.09.2026, Worktree `aiw-f36-ws3`. Chromium headless über
`scripts/render-nachweis.mjs`; alle Bilder sind Ausschnitte (PNG).

## Erzeugung

`node features/F36/nachweis-ws3-ui/erzeuge-nachweis.mjs` (nicht Teil von
`npm run check`). Je Szenario ein eigener Fixture-Leitstand auf Port 4176
(`erzeugeRequestHandler`, Muster `features/F36/nachweis-ws4-ui/`):

- **Installationswurzel (Wegwerf):** Fixture-`ressourcen.json` mit einem
  freigegebenen lokalen MCP `playwright-lokal` (mit `installation`,
  `anwendbar_wenn` bugfix + `package.json`), fünf offenen externen Skills
  (einer mit sehr langer Kennung und langem Namen) und einem
  `extern_lesend`-MCP; `schemas/`, `workflow-vorlagen/`, `docs/harness/`
  aus dem Repo kopiert.
- **Projekt (Wegwerf-Git-Repo):** `package.json`, `state/findings.md` mit
  einem Finding `F-001`.
- **Starter gestubbt:** Der Router-Lauf liefert eine feste Klassifikation
  (`task_typen: bugfix`), der Server registriert daraus selbst den
  Workflow (`standard.json`); ein Ausführungslauf bleibt offen („läuft“,
  kein Prozess).
- **Workflow-Szenario:** Auftrag, Router-Artefakt und Workflow
  `f36-ws3-nachweis` (ein ZWINGEND-Ausführungsschritt) direkt registriert.
- **Workboard-Szenarien:** echter Klickweg „Finding öffnen → Bearbeiten →
  Vorschlag → Freigeben“. Für den 409-Fall ändert ein Server-Wrapper den
  Katalog genau beim Eintreffen der Freigabe (MCP wieder `OFFEN`, ohne
  `installation`) — deterministischer Stellvertreter für „Katalog ändert
  sich zwischen Anzeige und Klick“.

## Bilder

| Datei | Viewport | Größe | Zu sehen |
|---|---|---|---|
| `workflow-400/01-workflow-400.png` | 400 px | 270×1000, 83 KB | Workflow-Ansicht, Freigabe-Block: „Wird genutzt“ (`playwright-lokal` mit Grund), „Passt, nicht im Lauf“ (Grund je Eintrag, lange Kennung bricht um), „+2 weitere“, Zählzeile „1 passende Einträge in V1 nicht freigebbar“ |
| `workflow-breit/01-workflow-breit.png` | 1100 px | 770×560, 107 KB | derselbe Block breit; der Freigeben-Knopf trägt `data-empfehlung-ids` (Protokoll) |
| `workflow-breit/02-workflow-gestartet.png` | 1100 px | 770×560, 89 KB | nach „Freigeben“ mit ids: „Freigabe erteilt … der Schritt startet“, Status `LAEUFT` |
| `workboard/01-workboard-vorschlag.png` | 1100 px | 770×574, 139 KB | Workboard, Workflow-Vorschlag mit Katalog-Empfehlung |
| `workboard/02-workboard-gestartet.png` | 1100 px | 770×582, 39 KB | nach „Freigeben“ mit ids: Kette, Status `LAEUFT` |
| `workboard-409/02-workboard-409-liste.png` | 1100 px | 770×334, 73 KB | nach dem 409: Vorschlag bleibt offen, die Empfehlung ist neu geladen („Wird genutzt: keine“, `playwright-lokal` jetzt unter „Passt, nicht im Lauf“) |
| `workboard-409-meldung/03-workboard-409-meldung.png` | 1100 px | 770×72, 32 KB | Meldung „Freigabe nicht erteilt: Katalog-Empfehlung hat sich seit der Anzeige geändert (angezeigt: playwright-lokal; beim Start: keine) … Die Entscheidung wurde NICHT festgehalten.“ |

Je Ordner liegen `protokoll.md`/`protokoll.json` (Klicktabelle), daneben
die Klickfolgen `klickfolge-*.json`.

## Hinweise

- Die Workboard-Karte scrollt intern; die 409-Meldung steht unter dem
  sichtbaren Rand. Deshalb eine zweite Klickfolge, die die Meldung per
  Klick in Sicht holt und nur sie ausschneidet.
- Viewport-Höhe 3000–4000 px: ein Ausschnitt außerhalb des Viewports
  bricht `page.screenshot` ab (wie WS-4).
