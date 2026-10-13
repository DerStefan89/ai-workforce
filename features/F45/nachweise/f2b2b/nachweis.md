# F45 F-2b-2b — Nachweis „geprüft = installiert“ für npm (F-1075 Variante C)

Stand 13.10.2026, Branch `f45/f2b2b-npm-strukturfix` (Basis `2af1b54`), Node 24.16.0, npm 11.18.0, Claude Code CLI
2.1.296, Modell `claude-sonnet-5` (Startvorlage).

## Durchführung

`node features/F45/nachweise/f2b2b/nachweis.mjs` (einmalig von Hand, nicht Teil von `npm run check`):

1. **Prüflauf** über die Routen der Oberfläche (`POST /api/sammlung/pruefung/vorbereiten` → `POST /api/sammlung/pruefung` →
   `GET …/pruefung/<laufId>`) gegen eine eigene Leitstand-Instanz der Workforce (installWurzel = dieses Repo,
   Wegwerf-Kontrollzustand in `%TEMP%`). Neues Verfahren: `installiereNpmPaketInOrdner` installiert genau
   `@upstash/context7-mcp@4.3.0` in `<temp>/install` (dieselben Argumente wie „Freigeben & installieren“), der Paketordner
   wird von der Platte gelesen, neutralisiert in den Prüfordner kopiert, `install/` vor dem Modelllauf entfernt.
2. **Installation** über `POST /api/ressourcen/context7-mcp/installation[/vorbereiten]` gegen eine zweite Instanz mit
   derselben Berichtsablage, aber einer **Temp-installWurzel**: Kopie von `ressourcen.json`, in der `context7-mcp` auf
   `wirkung: lokal` mit `installation_vorlage { bin: dist/index.js, args: [], werkzeuge: [resolve-library-id, query-docs] }`
   steht. **Fixture-Abweichung:** im echten Katalog ist der Eintrag `extern_lesend` und nach E-F36-4 nicht installierbar
   (extern_lesend-MCPs folgen mit F-3); der Nachweis belegt die Mechanik, nicht eine Freigabe. cap-Ordner in `%TEMP%`.

Das echte `ressourcen.json` blieb bitgleich (sha256 vorher/nachher im Skript geprüft). Die Wegwerf-Wurzel
(`%TEMP%/f45-f2b2b-nachweis-*`, mit Kontrollzustand, Rohstrom und cap-Ordner samt `node_modules`, ≈ 45 MB) bleibt zur Einsicht
stehen und wird von Hand gelöscht.

## Ergebnis

| Größe | Wert |
|---|---|
| Pin (npm view @latest) | `@upstash/context7-mcp` 4.3.0, `sha512-fuDt5nWjE5JkAPLjU0m+m0LlJphxyegAvAmcwHoA5jrzAhKo/rVV0RFA8TOwODGdDVdt/nPxNslkxeDIDp/rPA==` |
| Prüflauf: Holen (npm install + Lesen) | ≈ 17 s |
| Prüflauf gesamt (mit Modelllauf) | 143 s, 0,45 USD |
| Urteil | MIT_AUFLAGEN (3 Auflagen: stdio-Transport, keine sensiblen Daten in Suchanfragen, Auslösehäufigkeit beobachten) |
| Geprüfte Dateien (Bericht) | 29, nichts übersprungen |
| Init-Zeile des Prüflaufs | skills ∅, plugins ∅, mcp_servers ∅, tools Glob/Grep/Read, keine Verweigerungen |
| Installation | 200 in 24,8 s, Serverstart `tools/list` = resolve-library-id, query-docs |
| Paketordner `node_modules/@upstash/context7-mcp` | 29 Dateien, 202 409 Bytes — Abgleich gegen den Bericht (Pfade + sha256) grün |
| `node_modules` gesamt (hochgezogene Abhängigkeiten, nicht inhaltlich geprüft) | 6 610 Dateien, 43,7 MB |
| Freigabe in der Katalog-Kopie | FREIGEGEBEN |

Dateien: `ablauf.json`, `bericht-context7-mcp.json` (Payload des Prüfberichts), `lauf-context7-mcp.json` (Init-Zeile, CLI,
Kosten), `installation.json`. Kein Rohstrom, kein Inhalt der Quelle.

## Ergänzend belegt (Tests, `npm run check`)

- `src/ressourcen/npm-echt.test.ts` — echtes npm gegen eine lokal gebaute `.tgz` (offline, eigener Cache): `package/node_modules/hidden`
  landet ohne bundleDependencies verschachtelt und ohne Lockfile-Eintrag → `pruefeNpmInstallation` 422; Symlink verworfen;
  doppelter Eintrag → letzter gewinnt, und der Prüflauf liest genau diesen Stand.
- `scripts/check-f45-f2b2-pruefung.mjs` (i) — Prüflauf → Bericht → Installation 200 über die Routen; Argv beider Seiten gleich bis
  auf den Ordner; verschachteltes `node_modules` → Prüflauf Fehlerstand und Installation 422; Inhalt ≠ Bericht → 422.

Hinweis: Der Lauf fand vor der einen Korrekturrunde des Prüfpasses statt (13.10.2026). Die Korrekturen ändern weder die
npm-Argumente noch die Prüfreihenfolge (nur: Umgebungsname ohne andere Schreibweise, kaputtes Lockfile → 422 statt Wurf,
klarere Gründe, Aufräumen mit Wiederholung); Tests und Gate laufen auf dem Endstand.
