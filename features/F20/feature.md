# F20 — Jarvis Shell v1

## ID

F20

## Titel

Jarvis Shell v1 (Navigation, Routing, Design-Tokens, Aggregat-Endpunkt)

## Status

Status: READY_FOR_TECH

Gültige Status-Werte (geprüft vom Gate, siehe A3a–e in
`features/AF-F001/feature.md`): `ENTWURF, READY_FOR_TECH,
WORKSTREAM_SCHNITT_GENEHMIGT, IN_ARBEIT, FEATURE_GATE, ABGESCHLOSSEN,
BLOCKIERT, ABGEBROCHEN`.

## Ziel

Ein Rahmen, in dem alle M4-Bereiche als Views leben: Navigation
(Dashboard · Projekt · Workboard · Runs · Capabilities), Hash-Routing mit
verlinkbaren Läufen/Workflows, CSS-Variablen als Design-Tokens, ein
Aggregat-Endpunkt `GET /api/zustand` statt drei Poll-Timern, ein leerer
Persona-Container in der Kopfzeile. Die sechs bestehenden Bedienflüsse
(Auftrag anlegen, Lauf starten, Freigabe, Stopp, Reparaturfassung,
Entscheidung) bleiben funktional unverändert. `public/leitstand/` wird in
native ES-Module aufgeteilt (`router.js`, `api.js`, `render.js`,
`views/*.js`), ohne Build-Schritt und ohne Framework.

## Nicht-Ziele

Neue Fachfunktionen · Persona-Animation (F28) · Design-Politur (F29) ·
SSE/WebSockets · Frontend-Framework · Änderung an Endpunkten außer dem
neuen `GET /api/zustand` · Änderung an Kontrollzustand oder Schemas.

## Akzeptanzkriterien

- **AK1** Alle 15 bestehenden Endpunkte erreichbar; die sechs Bedienflüsse
  laufen real unverändert (Nachweis über die bestehenden Gates F10–F15
  plus manuellen Durchlauf).
- **AK2** Jede View hat eine URL (`#/dashboard`, `#/projekt`, `#/workboard`,
  `#/runs`, `#/runs/<laufId>`, `#/workflows/<id>`, `#/capabilities`); Reload
  stellt die View wieder her.
- **AK3** Im Grundzustand genau ein periodischer Poll auf `GET /api/zustand`;
  Detail-Polls nur in geöffneter Detailansicht.
- **AK4** Keine hart codierte Farbe außerhalb der Token-Definition in
  `style.css` (Gate prüft per Regex).
- **AK5** `scripts/check-f15-workflow-oberflaeche.mjs` auf die neue
  Dateistruktur kalibriert, mit Rot-Fall (gelöschte Container-ID wird
  gemeldet); `public/` in den Biome-Scope aufgenommen.
- **AK6** `npm run check` grün. Zusätzlich, als Nachweis für die sechs
  Bedienflüsse (AK1) nach der Modul-Aufteilung: `node
  scripts/check-f20-leitstand-shell.mjs` grün — ein isolierter
  Sandbox-Testserver plus echtem, headless Chrome klickt Auftrag anlegen,
  Lauf starten, Freigabe erteilen, Stoppen, Reparaturfassung einreichen und
  Entscheidung real durch. Bewusst NICHT in `npm run check` eingehängt
  (Chrome/Edge-Abhängigkeit, ~10-15s echte Browserzeit) — manueller Lauf vor
  PR/Merge und vor dem AK7-Feature-Review.
- **AK7** Feature Review nach WS-1 mit Stefan (ACCEPT/ADJUST/REJECT) vor
  Beginn von F21.

## Dependencies

Keine harten Abhängigkeiten. Blockiert F21–F29. Setzt auf: `public/leitstand/*`,
`scripts/leitstand-server.mjs` (nur additiver GET-Endpunkt),
`scripts/check-f15-workflow-oberflaeche.mjs`, `biome.json`.

## Workstreams

- WS-1: Module, Routing, Tokens, Migration der bestehenden Views,
  Dashboard-Platzhalter, Persona-Container. Danach Feature Review.
- WS-2: `GET /api/zustand`, Poll-Konsolidierung, Gate-Kalibrierung, Biome-
  Scope.

## Risiken

Gate-Kopplung an IDs (F-352) · Poll-vs-Formular-Konflikt an drei bereits
handgelösten Stellen in `app.js` · `public/` bisher außerhalb Lint/Typecheck.
