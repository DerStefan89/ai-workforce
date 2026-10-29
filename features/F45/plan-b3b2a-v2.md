# Plan v2 — F45 B3b-2a-1 „Render-Nachweis im Lauf: Kern + API + Skelett“

Basis: Plan v1 `features/F45/plan-b3b2a.md`, Advisor `features/F45/advisor-b3b2a.md` (Nicht freigegeben, zu groß).
Entscheidungen Stefan 29.10.2026: **Schnitt angenommen** (B3b-2a-1 dieses Paket, B3b-2a-2 „Karte“ danach), **K2 = (b)**
(Build-Zeile bleibt, Gate-Vorlage verlangt die Build-Ausgabe in `.gitignore`, DEKLARIERT), **H4 = nur nach ERFOLGREICH**.
Budget ≈ 0,3 AT.

## 1 Kern-Render nach dem Lauf

`src/pruefschritt/render.ts`:
- `renderNachweisFaellig({ ausfuehrungImArbeitsordner, pruefErgebnis, wurzel })` — true nur bei
  `ausfuehrungImArbeitsordner === true`, `pruefErgebnis === 'GRUEN'` und `render.json` als Datei
  (`statSync(p, { throwIfNoEntry: false })?.isFile() === true` in try, H3). Total, wirft nie.
- `fuehreRenderNachweisDurch(laufId, wurzel, optionen?)` wie v1: check-ignore `.render-nachweis/` (Code 1 ⇒ FEHLER
  „nicht ausgeführt: .render-nachweis/ steht nicht in .gitignore“, sonst ≠ 0 ⇒ FEHLER „nicht auswertbar“), argv
  `[process.execPath, findeNpmCli(), 'run', 'check:render']`, `fuehrePruefungDurch(…, 180 000)`. `optionen.befehl`
  ersetzt das argv (Unit-Tests ohne npm, H6). Import projekt-anlegen bleibt (H7: vertretbar, der Server lädt ihn ohnehin).
- `registriereRenderNachweis(laufId, wurzel, registriere, meldeFehler, optionen?)` wie v1, wirft nie (H5).

Server, im try des Prüfschritts direkt nach `registriereKernArtefakt(\`pruefergebnis-…\`)`:
`if (renderNachweisFaellig({ ausfuehrungImArbeitsordner: laufErfolgreich && laufImArbeitsordner && laufort.loeschliste === true, … }))`
— dasselbe Prädikat wie die Löschliste (K1, H4): nur ERFOLGREICH, nur im Arbeitsordner, nur Rolle 'ausfuehrung'.
Projektordner, ad-hoc `POST /api/laeufe`, VERWEIGERT ohne Bypass, ohne pruefbefehl, ohne GRÜN, ohne render.json:
bitgleich (kein await, kein Artefakt). Kommentar nennt die Kopplung. Zeitgrenze: Kill des Prozessbaums best effort
(F-181) — im Kopf als DEKLARIERT (H11).

## 2 Kein Halt

Unverändert v1 §2 (Leser-Isolation belegt). Integrationstest: Render ROT ⇒ Workflow läuft zu Ende (ABGESCHLOSSEN),
keine Korrekturrunde. F-1271 „Kein Render nach Prüfung wiederholen“.

## 3 API (ohne Karte)

`scripts/leitstand/abnahme-pruefung.mjs` (formatiert, 0 checkJs-Fehler, H1):
- `projizierePruefergebnis(ausfuehrungSchritt, ladeOptionen)` — für GET …/abnahme (bisher `:8699–8712`) UND
  GET `/api/workflows/<id>` (bisher `:8849–8860`, H2). Dort kommt `versionSequenz` additiv hinzu (Hausmuster, kein
  Leser bricht: Tests prüfen status/ergebnis/exitCode).
- `projiziereRenderNachweis(ausfuehrungSchritt, ladeOptionen)` ⇒ `{ status: 'ok', ergebnis, dauer_ms,
  ausgabe_ende: letzteZeilen(…, 40), gestartet_am }` oder `{ status: 'fehlt' }` (auch bei ungültigen Daten).
  `gestartet_am` bleibt (Bauauftrag); `ausgabe_ende` auf 40 Zeilen wie der Halt-Grund (H12, 2-s-Polling).
- Server: `renderNachweis: projiziereRenderNachweis(ausfuehrungSchritt, ladeOptionen),` im Body von GET …/abnahme.

## 4 Skelett

- F-1262 (bereits gebaut, H8 erledigt): `bewerte` ohne LCP-null-Befund, neue reine Funktion `hinweise`, Protokoll
  „## Hinweise“, Konsole `ℹ`, Exit-Code nur aus Befunden; Kopf und `gate-vorlage-node.md` angepasst.
- `gate-vorlage-node.md` UI: mit Build `"check:render": "npm run build && node scripts/render-nachweis.mjs"` und
  (K2 = b) „die Build-Ausgabe (`dist/` o. ä.) gehört in `.gitignore`“ — sonst legt der vom Kern gestartete Build
  ungetrackte Dateien nach der Änderungsübersicht ab.
- `docs/architektur/arbeitsordner.md`: ein Satz — der Kern startet nach grünem Prüfschritt `npm run check:render` im
  Arbeitsordner; erzwungen ist nur „`.render-nachweis/` ist ignoriert“, die Build-Ausgabe in `.gitignore` ist DEKLARIERT.
- `HERKUNFT.md`: Abweichungsabsatz B3b-2a, Prüfsummen über `node scripts/check-skelett-herkunft.mjs --ausgeben`.

## 5 Tests/Nachweis

- `src/pruefschritt/render.test.ts`: Fälligkeit (inkl. Ordner statt Datei, nicht im Arbeitsordner), nicht ignoriert ⇒
  FEHLER ohne Prozess, kein git-Repo ⇒ FEHLER, GRÜN/ROT mit injiziertem argv (`node -e`), werfender Rückruf ⇒
  meldeFehler.
- `scripts/leitstand/abnahme-pruefung.test.mjs`: beide Projektionen (alle Status, ungültige Daten ⇒ 'fehlt',
  40 Zeilen).
- `scripts/render-im-lauf.test.mjs` (SERIELL in `scripts/teste.mjs`, Muster `leitstand-arbeitsordner.test.mjs`):
  (1) Arbeitsordner, render.json, `.render-nachweis/` ignoriert, Stub `check:render` exit 1 (echtes `npm run`,
  deckt findeNpmCli unter Windows und Linux-CI) ⇒ `render-nachweis-<laufId>` ROT, Workflow ABGESCHLOSSEN, GET …/abnahme
  `renderNachweis` ok/ROT; D13: `POST /api/laeufe` während des Renders ⇒ 409. (2) Projektordner (ohne Arbeitsordner)
  mit render.json ⇒ kein Artefakt, `renderNachweis.status === 'fehlt'`.
- `scripts/skelett-render-nachweis.test.mjs`: F-1262 (gebaut).
- `features/F45/nachweise/b3b2a/nachweis.md`.

## 6 Register und Fixpaket

Wie Bauauftrag Punkt 6 (schon eingetragen, F-1256 erst nach dem Bau erledigt, H10). Zusätzlich: Zeile B3b-2a im
Fixpaket in B3b-2a-1 (dieses Paket) und B3b-2a-2 „Karte“ (≈ 0,15 AT: `abnahme-render.js`, Einbindung ohne
Zeilenwachstum, Kennzeichen des Polls in `views/workflows.js`, i18n, View-Test, Render-Nachweis, design-guardian; K3,
K4, H9) teilen; F-1271 neu. Entwurf der Karte liegt außerhalb des Repos bereit (nicht Teil dieses Pakets).

## 7 Zeilenbilanz Server (W1)

+2 Importe, +2 Nachlauf, +1 Abnahme-Feld, −13 (Abnahme-Projektion), −11 (Detail-Projektion) ⇒ ≈ −19; Grenze in
`scripts/wachstumsbremse-server.json` auf das Ist senken.

## Nicht-Ziele

Wie v1, dazu: keine Karte, kein i18n, keine Änderung an `views/` (B3b-2a-2).
