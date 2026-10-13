# F45 F-2b-2b — Plan (npm-Strukturfix Variante C; Sammlung/Capability Library)

Branch `f45/f2b2b-npm-strukturfix`, Basis `2af1b54` (main mit F-2b-2a, #326). Grundlage: Auftrag F45 F-2b-2b (12.10.2026),
Entscheidung Stefan 12.10.2026 (Challenger claude/599): **Variante C „Prüfen, was npm selbst schreibt“**. Der Plan aus
F-1075 „Rest“ (a)–(c) (Lockfile-Bindung der `node_modules`-Ausnahme, Tar-Leser als Positivliste, Vergleichstest gegen
node-tar) wird nicht umgesetzt. Keine neue Abhängigkeit.

## Plan v1

### Befund vorab (mit dem npm des Repos bestätigt, 13.10.2026)

Node 24.16.0, **npm 11.18.0** (der Challenger hatte 10.9.4). Selbst gebauter Tarball `probe-paket-1.0.0` mit
`package/index.js` zweimal („geprueft“, dann „letzter“), `package/link.js` als Symlink, `package/node_modules/hidden/index.js`,
ohne `bundleDependencies`; `npm install <tgz> --prefix <ziel> --ignore-scripts --save-exact --no-audit --no-fund --offline`:

- `node_modules/probe-paket/node_modules/hidden/index.js` liegt auf der Platte, im Lockfile nur `node_modules/probe-paket`.
- `link.js` fehlt (Symlink verworfen).
- `index.js` = „letzter“ (letzter Eintrag gewinnt).

Damit ist die eigentliche Lücke die Ausnahme `ohne: ['node_modules']` in `vergleicheInhalt` (über `baueInhaltPruefer`):
ein verschachtelter Ordner wird installiert, aber nie verglichen. Jede andere Leser-Abweichung endet heute schon als 422
(Abgleich der Dateiliste). Variante C schließt die Klasse ganz: geprüft wird künftig nicht ein Tarball, sondern genau der
Paketordner, den npm mit denselben Argumenten selbst geschrieben hat.

Probe `@upstash/context7-mcp@4.3.0` (echt, Registry): 104 Pakete in ≈ 11 s, Paketordner 29 Dateien / 250 KB, kein
verschachteltes `node_modules`, Serverstart `tools/list` = `resolve-library-id`, `query-docs`.

### TEIL 1 — Strukturfix npm

**1.1 Gemeinsame Funktion** (`src/ressourcen/installation.ts`, exportiert):

```
installiereNpmPaketInOrdner({ paket, version, integrity, ordner, wurzelName, npm, timeoutMs })
  → { ok: true, paketOrdner } | { ok: false, status: 422, grund }
```

1. schreibt `<ordner>/package.json` = `{ name: wurzelName, private: true }` (Installation: `aiw-cap-<id>` wie heute;
   Prüflauf: `aiw-cap-pruefung`). `ordner` existiert und ist leer (Aufrufer legt ihn an).
2. ruft genau `npm install <paket>@<version> --prefix <ordner> --ignore-scripts --save-exact --no-audit --no-fund`
   (cwd = ordner). Wurf / Zeitgrenze / Exit ≠ 0 → 422 mit den heutigen Texten der Installation.
3. Lockfile `packages["node_modules/<paket>"]`: `version` und `integrity` = angezeigt, sonst 422 (heutige Texte).
4. Paketordner `<ordner>/node_modules/<paket>` per `lstat`: keine reguläre Verzeichnis (fehlt, Symlink/Junction) → 422.
5. existiert `<paketOrdner>/node_modules` (lstat, jeder Typ) → 422 „verschachtelte Abhängigkeiten oder bundleDependencies im
   Paketordner nicht unterstützt (F-1075)“.

Getrennt exportiert als `pruefeNpmInstallation(ordner, paket, version, integrity)` (Schritte 3–5), damit der Test mit echtem
npm gegen eine lokale `.tgz` dieselbe Prüfung fahren kann. `installiereGesperrt` ersetzt seine Schritte (1)–(2) durch den
Aufruf; Zeitgrenze `installMs`, Fehler gehen wie heute über `scheitere` (Zielordner weg). Schritt (3) bin, (3b) Inhalts-
Abgleich, (4) Serverstart, (5) Katalog bleiben.

**1.2 `holeNpmInhalt` neu** (`src/sammlung/quelle.ts`): `SHA512_INTEGRITY` wie heute (422). `<wurzel>/install` anlegen,
gemeinsame Funktion mit `QUELL_ZEITGRENZEN.installMs` (neu, 300 000; `npmMs` bleibt für `npm view`). Danach
`lesePaketordner(paketOrdner)` rekursiv mit `lstat`:
- Symlink, Junction oder sonstiger Nicht-Datei-/Nicht-Ordner-Eintrag → 422 (kein Überspringen; npm hat Symlinks schon
  verworfen, ein solcher Eintrag heißt: der Ordner ist nicht der, den npm schrieb).
- Dateien: dieselben Filter wie heute — `pruefePfad` → `pfad_abgelehnt`, `> maxDateiBytes` → `zu_gross` (ohne Lesen),
  `istBinaer` → `binaer` (alles Fakt; die Installation scheitert dann am Abgleich, wie heute).
- frühe Grenze beim Lesen: mehr als `GRENZEN.maxDateien` ausgewählte Dateien oder `maxBytes` → sofort 422 (kein Vollladen).
- dann `pruefeGrenzen`, `schreibeInhalt` (Neutralisierung, Zwillinge 422), `dateiListe` mit sha256 der Original-Bytes.
`npm pack`, `sriSha512` und das Tarball-Lesen entfallen; die Integrity-Bindung läuft über das Lockfile (npm prüft das
Tarball gegen die Registry-Integrity, wir prüfen Lockfile = angezeigt). Den Temp-Ordner räumt wie heute der Aufrufer.
`hatInhalt` bleibt. Status bei npm-Fehlern im Prüflauf: 422 aus der gemeinsamen Funktion (statt 502 aus `rufeNpm`) —
bewusst einheitlich; der Prüflauf läuft nach 202 im Hintergrund, der Status erscheint nur im Fehlerstand.

**1.3 Tar-Leser weg**: `leseTarGz`, `pruefeTarName`, `TarErgebnis`, Hilfen `oktal`/`textFeld`/`lesePax` und ihre Tests in
`src/sammlung/inhalt.test.ts` entfernen (keine weiteren Nutzer); `GRENZEN.maxEntpacktBytes` entfällt; Dateikopf
nachziehen. Gate (h): statt „Tar-Leser rot“ — `inhalt.ts` exportiert kein `leseTarGz`, `quelle.ts` ruft kein `npm pack`,
`holeNpmInhalt` und `installiereGesperrt` rufen `installiereNpmPaketInOrdner` (Quelltext-Prüfung).

**1.4 `vergleicheInhalt`**: Option `ohne` und die Berichts-Prüfung auf ausgenommene Ordner entfallen; `leseInstalliert`
liest jeden Eintrag. `baueInhaltPruefer` übergibt nur `unterpfad`.

**1.5 Sperre aufheben**: `NPM_SPERRE` und `npmInstallationNachPruefung` entfallen (`routen-pruefung.mjs`:
`ergaenzeVorbereitung(daten, berichte)`, `baueBerichtPruefer(basis, schreiber)`; `leitstand-server.mjs` Option und
Durchreichung; Gates `check-f36-ws5a-installation.mjs`, `check-f45-f2b2-pruefung.mjs`). Oberfläche unverändert (der
deaktivierte Knopf gilt für jede `pruefbericht_sperre`), nur Kommentar in `empfehlung-installation.js`.
Gate (i) neu, über die HTTP-Routen mit Attrappen-npm:
- (i1) echter Prüflauf `pw-mcp` (Katalog, MCP) → Bericht mit `inhalt.dateien` = was die Attrappe schrieb; danach
  Installation → 200. Argv des `npm install` aus Prüflauf und Installation sind nach Ersetzen des `--prefix`-Werts gleich.
- (i2) Attrappe schreibt zusätzlich `node_modules/@fixture/pw/node_modules/hidden/index.js` → Prüflauf Fehlerstand mit
  „verschachtelte Abhängigkeiten … (F-1075)“, kein Bericht; Installation (Bericht per Testhilfe) → 422 gleicher Grund,
  Katalog unverändert, Zielordner weg.
- (i3) Installation schreibt eine Datei, die nicht im Bericht steht → 422 „nicht geprüft“ ((f) „anders“ deckt den
  Hash-Fall).

**1.6 Tests (rot → grün)**, Attrappen-npm:
- `installation.test.ts`: (a) verschachteltes `node_modules` → 422, Zielordner weg; (d) Lockfile-Integrity abweichend →
  422 (Version gibt es schon); Paketordner als Junction → 422; Argv der gemeinsamen Funktion exakt.
- `quelle.test.ts` (ersetzt den pack-Test): Erfolg (Dateiliste + Lebenszyklus-Fakt, Original-Pfade bei `.claude`);
  (a) verschachteltes `node_modules` → 422; (c) Junction im Paketordner → 422; (d) Lockfile-Version/-Integrity → 422;
  Argv Prüflauf = Argv Installation (bis auf den Ordner) über denselben Attrappen-Runner.
- `pruefbericht.test.ts`: (b) Datei unter `node_modules/` im installierten Ordner zählt jetzt (→ „nicht geprüft“).
- **echtes npm** (`src/ressourcen/npm-echt.test.ts`, neu): baut eine `.tgz` (eigener minimaler ustar-Schreiber im Test),
  `npmReal` mit denselben Flags + `--offline` gegen die Datei; belegt (a) `hidden` verschachtelt ohne Lockfile-Eintrag →
  `pruefeNpmInstallation` 422; Symlink verworfen; doppelter Eintrag → letzter gewinnt, und der Paketordner-Leser des
  Prüflaufs sieht genau diesen Stand (Tarball ohne `node_modules`). Übersprungen nur, wenn `npm-cli.js` neben node fehlt
  (`t.skip` mit Grund). Laufzeit ≈ 2 × 12 s.

**1.7 Echter Nachweis** `features/F45/nachweise/f2b2b/`: Skript `nachweis.mjs` (Muster `f2b2/pruefung.mjs`): eigene
Leitstand-Instanz, Wegwerf-Kontrollzustand, `installWurzel` = Temp-Ordner mit Kopie von `ressourcen.json` und der
Sammlungsdateien, `capWurzel` Temp. (1) Prüflauf context7-mcp (`@latest` = 4.3.0, Modelllauf). (2) Installation über die
Route gegen dieselbe Temp-`installWurzel` — dort ist `context7-mcp` in der **Kopie** auf `wirkung: lokal` mit
`installation_vorlage { bin: dist/index.js, args: [], werkzeuge: [resolve-library-id, query-docs] }` gesetzt (im echten
Katalog ist er `extern_lesend` und nicht installierbar, E-F36-4/F-3 — Fixture-Abweichung im Nachweis benannt). Das
Skript prüft sha256 des echten `ressourcen.json` vorher/nachher. Ergebnis `bericht-context7-mcp.json`, `installation.json`
(Dauer, Dateien, Größe), `nachweis.md`.

**1.8 F-1074** (8) `auswahl` (src/sammlung/index.ts) prüft Katalog- und Sammlungs-Paket mit `paketNameAus` wie die Route;
(9) `validierePruefberichtDaten` prüft `quelle.integrity` gegen `SHA512_INTEGRITY` (aus `quelle.ts`).

**1.9 F36-Nachweise**: `features/F36/nachweis-ws5a-installation/README.md`, `nachweis-ws5b/README.md` als historisch
markieren; `echter-nachweis.mjs` / `erzeuge-nachweis.mjs` enden vor jedem Netz-/Modellaufruf mit Exit 1 und „seit F-2b-2a
nur mit Prüfbericht; historischer Nachweis — siehe features/F45/nachweise/f2b2b/“ statt 500.

### TEIL 2 — Sammlung/Capability Library (danach, falls der Zuschnitt trägt)

10. Vormerken/Katalog für Sammlungseinträge ohne Katalog (`typ extern`, `unterart`, Ref-URL, Paket; F-1056 Rest) über den
    bestehenden Vormerken-Weg (`public/leitstand/vormerken-auftrag.js`, `views/capabilities.js`), kein neuer Schreibweg.
11. „Eignung prüfen“ im Detail der Capability Library (gleiche Route `POST /api/sammlung/pruefung[/vorbereiten]` mit
    `katalog_id`).
12. Detail als eigene volle Tabellenzeile (`colspan`, F-1068 (3)).
13. F-1061 (1): letzter bekannter Hash der lokalen Fähigkeiten-Datei persistent (atomar bei nachRoute/bestaetige),
    Vergleich beim Serverstart, Abweichung = „neustart“-Fremdänderung, gesperrt bis Bestätigung; Ablage: Kontrollzustand der
    Workforce (oder eine bestehende Ablage, falls der Advisor eine nennt); ARCHITECTURE.md §2 anpassen.

### Doku/Register
F-1075 → erledigt (Nachtrag Variante C); Nachträge F-1074 (8)/(9); bei TEIL 2 F-1056, F-1061 (1), F-1068 (3). Neu F-1077
(K33, Jarvis weist Produktprojekte ab, P2, B5a), F-1078 (K35, verschachtelte npm-Abhängigkeiten nicht installierbar, P3).
Fixpaket-Zeile F-2b-2b, Akte `features/F45/feature.md`, `docs/STATUS.md`, `docs/projekt/kontext/lagebild.md` (F-1075-Zeile).
ARCHITECTURE.md nennt den Tar-Leser nicht (nur §2 bei TEIL 2).

### Invarianten
Keine Abhängigkeit in `package.json`. `.claude/settings.json`, Hooks, `projekte.json`, `ressourcen.json`, `vorlagen/`
unverändert. `starteWorkflowSchritt(` 6× im Server. Keine Rohströme, keine `*.lokal.json` im Repo.

### Risiken / offene Punkte an den Advisor
- R1: Der Prüflauf führt jetzt ein vollständiges `npm install` (mit Abhängigkeiten) aus — mit `--ignore-scripts` kein Code
  der Quelle; Netzlast und Temp-Platz höher (context7: 56 MB node_modules). Zeitgrenze 300 s.
- R2: Hochgezogene Abhängigkeiten werden weiter nie inhaltlich geprüft und können sich zwischen Prüflauf und Installation
  ändern (Ranges, neue Registry-Versionen) — „installiert = geprüft“ gilt nur für den Paketordner (wie F-1075 (9)). Ändert
  ein neuer Stand die Verschachtelung, endet die Installation fail-closed in 422.
- R3: Datei-Filter (zu groß/binär/abgelehnt) bleiben Fakt im Prüflauf und 422 bei der Installation — Pakete mit Binär-
  dateien sind weiter nicht installierbar (bekannt, unverändert).
- R4: Zuschnitt — TEIL 1 allein ist ein voller Baudurchgang (Gate, 4 Testdateien, echter Nachweis mit Modelllauf). Vorschlag:
  TEIL 2 als F-2b-2c abtrennen.

## Advisor-Pass (13.10.2026, frischer Kontext, `architecture-advisor`)

Urteil: **TEIL 1 freigegeben mit Hinweisen; TEIL 1 + TEIL 2 zu groß** → nur TEIL 1 auf diesem Branch, TEIL 2 wird
**F-2b-2c** (Fixpaket, Akte). Entlastend belegt: E1 Sicherheit hängt am Byte-Vergleich der Installation (jede Abweichung
422, egal ob Cache/Registry/npm-Update); E2 `--prefix` setzt `localPrefix` direkt (keine `.npmrc` aus Elternordnern);
E3 das Modell sieht nur `inhalt/`; E4 422 statt 502 im Prüflauf ohne Wirkung (nur `grund` zählt).
Findings: F1 `~/.npmrc` (install-strategy, package-lock=false) kann npm dauerhaft fail-closed machen (gering); F2 Wurzelname
weicht ab (gering); F3 Vorbedingung „Ordner leer“ und `node_modules`/`@scope` per lstat in die Funktion (gering);
**F4** voller Abhängigkeitsbaum schon beim Auswählen — git-Abhängigkeiten mit prepare klont pacote und startet ein inneres
`npm install`, `--ignore-scripts` wirkt dort nur über die vererbte Umgebung (mittel); F5 Platz/Zeit, D13 bis 5 min (gering);
F6 Aufräumen unter Windows (`maxRetries`, `install/` vor dem Modelllauf löschen) (gering); F7 Gesamtzahl besuchter
Einträge deckeln (gering); F8 Integrity-Bindung nur über das Lockfile = Annahme F-786 (gering); F9 Fakt „Symlink im
Tarball“ entfällt (gering); **F10** echter-npm-Test liefe in CI nie (npm unter `../lib/node_modules`) (mittel); F11 Rot-Tests
zu F3/F4; F12 F-1061 (1) hat keine bestehende Ablage — Kern-Artefakt der Workforce-Ablage, eigener Advisor-Pass in F-2b-2c.

## Plan v2 (nur TEIL 1)

Änderungen gegenüber v1:
- **1.1** gemeinsame Funktion zusätzlich: `ordner` muss existieren und leer sein, sonst 422 (F3); nach npm `lstat` auf
  `<ordner>/node_modules`, bei Scope auf `node_modules/@scope` und den Paketordner — jeweils echtes Verzeichnis, kein
  Symlink/Junction (F3). **F4 fail-closed angenommen** (Entscheidung dokumentiert, von Stefan umkehrbar): jeder
  Lockfile-Eintrag außer der Wurzel braucht `resolved` mit `https://` und eine `integrity`, kein `link: true` — sonst 422
  „Abhängigkeit nicht aus der Registry (git/file/link) — nicht unterstützt (F-1075)“. Weil diese Prüfung erst nach dem
  Holen greift, setzt die Funktion zusätzlich `npm_config_ignore_scripts=true` ausdrücklich in die Umgebung des npm-
  Aufrufs (statt sich auf die Vererbung zu verlassen). F1 (feste `--install-strategy`/`--package-lock`) wird **nicht**
  übernommen — der Auftrag nennt die Argumente „genau“; als Hinweis in F-1078 notiert. F2: Namen bleiben
  (`aiw-cap-<id>` / `aiw-cap-pruefung`), die Differenz ist in Gate (i1) benannt.
- **1.2** `lesePaketordner` deckelt die besuchten Einträge (`GRENZEN.maxEintraege` = 10 000, darüber 422, F7);
  `<wurzel>/install` wird nach `schreibeInhalt` und vor der Rückgabe entfernt (`rmSync` mit `maxRetries`, F6); `raeumeAuf`
  bekommt `maxRetries`.
- **1.6** Rot-Tests ergänzt: Ordner nicht leer (`.npmrc`) → 422; Lockfile-Eintrag `resolved: git+…` bzw. `link: true` →
  422 (F11). Echter-npm-Test: sucht `npm-cli.js` neben node **und** unter `../lib/node_modules` (F10), `--cache <tmp>`,
  prüft den Grund-Text (Schritt „verschachtelt“, nicht Lockfile).
- **R1** ergänzt um F4/F5 (git-/URL-/file-Abhängigkeiten, Platz, D13 bis 300 s); F8/F9 als bekannte Grenzen in F-1075.
- TEIL 2 (Punkte 10–13) entfällt hier → F-2b-2c.
