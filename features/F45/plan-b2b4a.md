# F45 B2b-4a „Bereit zum Sichern“ (Ableitung, ?workflow=, Sichern-Block) — Plan v2

> **Geteilt → `plan-b2b4a1.md` / 4a-2 folgt** (Delta-Advisor `advisor-b2b4a-delta.md`: zu groß; Entscheidung Challenger
> 19.10.2026: 4a-1 = A+B, 4a-2 = C). Diese Fassung bleibt als Verlauf unverändert stehen.

Stand: 19.10.2026, Branch `f45/b2b4-sichern` = `origin/main` `d7f207c` (#365). Vorgänger: `plan-b2b4.md` (v1, geteilt),
Advisor `advisor-b2b4.md` (Nicht freigegeben: zu groß). Entscheidungen Challenger 19.10.2026: 4a = A–C, 4b = D–E; O1
behalten; F-1088 (5) in 4a; Commit-Vorschlag für `wf/<id>` aus dem Titel. Schließt **F-979, F-1087, F-1088 (5)**.

## CONTEXT

- 4b (Jarvis-cd-Zeilen offener Arbeitsordner, F-1085 (5), F-1085 (10)-Nachtrag, Gate b2a3 (g), D13-Lücke im Chat-Pfad)
  folgt; es baut auf dem Ableitungsmodul `scripts/leitstand/ablauf-sichern.mjs` aus 4a auf und braucht einen eigenen
  Ausgleich der Server-Zeilen (4a senkt die Grenze auf das Ist; der Überschuss steht 4b nicht zur Verfügung).
- Unverändert: Hooks/settings, `.claude/`, `projekte.json`, `ressourcen.json`, `vorlagen/`, `.githooks`,
  `workflow-vorlagen`, `kontrollzustand/`; `starteWorkflowSchritt(` 6×; keine neue Route; kein neuer Workflow-Status,
  kein Schema.

## Vorab-Beleg PowerShell (F-1088 (5), vor dem Bau ausgeführt)

Windows PowerShell 5.1.26100 (pwsh 7 ist auf diesem Rechner nicht installiert — nicht geprüft). Block
`& {` / `  Set-Location -LiteralPath '<pfad>' -ErrorAction Stop` / `  git rev-parse --is-inside-work-tree` /
`  git --version` / `}`:
- (a) Ordner vorhanden (Pfad mit Leerzeichen und `[1]`): Exit 0, beide git-Zeilen laufen.
- (b) Ordner fehlt (auch Pfad mit Apostroph, `''`-gequotet): Exit 1, stdout leer — kein git-Befehl lief.
- (c) je als ein Eingabepuffer (`-Command <Text>`, so übergibt PSReadLine eingefügten Text) und zeilenweise über stdin
  (`-Command -`, Fortsetzung `>>`): gleiches Ergebnis. Echtes Einfügen in ein interaktives Fenster ist damit nachgebildet,
  nicht von Hand ausgeführt.
Beleg (geschwärzt) kommt nach `features/F45/nachweise/b2b4/powershell-versuch.md`.

## A — Ableitung (eine Quelle der Gründe)

Neues Modul `scripts/leitstand/ablauf-sichern.mjs` (rein, kein I/O, kein `.method` im Text — `check-f813-csrf` (4)):

- `SICHERN_GRUENDE` (eine Liste): `nichtAbgeschlossen`, `abgelehnt`, `keinArbeitsordner`, `nichtAngelegt`,
  `inVorbereitung`, `fehlgeschlagen`, `aufgeraeumt`, `ordnerFehlt`, `nichtBestimmbar`, `nichtsOffen`.
- `arbeitsordnerGrund(ao)` — Teilregel für den Ordner allein (`ao` = Projektionsform `{ status (wirksam), aufraeumen,
  ordnerVorhanden }` bzw. `null`): `null` → `nichtAngelegt`; `aufraeumen !== null` oder `ENTFERNT` → `aufgeraeumt`;
  `IN_VORBEREITUNG` → `inVorbereitung`; `FEHLGESCHLAGEN` → `fehlgeschlagen`; `BEREIT` ohne Ordner → `ordnerFehlt`;
  `BEREIT` mit Ordner → `null`.
- `leiteSichernLageAb({ workflowStatus, abnahmeErgebnis, bedarf, arbeitsordner, projektion })` →
  `{ bereit, art: 'commit' | 'push' | null, grund: <SICHERN_GRUENDE> | null, offeneAenderungen, voraus }`:
  1. `workflowStatus !== 'ABGESCHLOSSEN'` → `nichtAbgeschlossen` (bewusste Grenze: `GESTOPPT` mit offenen Änderungen wird
     nicht angeboten; dort bleibt „Aufräumen“, ggf. mit „Änderungen verwerfen“)
  2. `abnahmeErgebnis === 'ABGELEHNT'` → `abgelehnt` (O1, Entscheidung: behalten)
  3. `bedarf !== 'pflicht'` → `keinArbeitsordner`
  4. `arbeitsordnerGrund(ao) !== null` → dieser Grund
  5. Projektion nicht `ok` oder `dateien`/`basis` nicht `ok` → `nichtBestimmbar`
  6. `dateien.anzahl > 0` → bereit, `art: 'commit'`
  7. `basis.voraus > 0` → bereit, `art: 'push'` (nur ungepushte Commits)
  8. sonst → `nichtsOffen`
- Abnahme offen ⇒ bereit (O2, Advisor 8 entlastend); Aufräumen bleibt bis zur Entscheidung gesperrt (bestehende Regel).
- Grenze (DEKLARIERT, Advisor 6): „gemergt“ = `voraus === 0` gegen den lokal bekannten `origin/main`/`main`; die
  Projektion holt nie (`fetch`). Nach einem Merge im Web — hier in der Regel Squash — bleibt `voraus > 0`; der normale
  Weg ist „gepusht/gemergt → Aufräumen“, das beendet die Anzeige. Neues Finding P3.
- Tests `scripts/leitstand/ablauf-sichern.test.mjs`: jeder Zweig, Reihenfolge (z. B. abgelehnt vor Ordnerlage),
  fehlende Felder, jeder Grund in `SICHERN_GRUENDE`.

Im Routenpfad (B) erreicht die volle Ableitung nur die Regeln 1–3 und 5–8; die Ordnerlage (Regel 4) kommt dort als 409
mit demselben Schlüssel aus `arbeitsordnerGrund` (dokumentiert im Modulkopf). Der Client wendet die volle Ableitung nicht
selbst an — er zeigt `ablauf.sichern` bzw. den 409-Schlüssel.

`LAUFID_UNZULAESSIGE_ZEICHEN` zieht in dieses Modul (eine Quelle, Advisor 9a); der Server importiert sie statt der
eigenen Konstante. `pruefeAblaufKennung(roh)`: `null` → fehlt; `''`, nicht String, > 200 Zeichen oder Treffer der
Zeichenregel → Grund (400).

## B — `?workflow=<id>` an `/api/code` und `/api/code/diff`

Bestehender Block im Server, Reihenfolge 403 → 400 → 404 → 409 → 200:
1. `pruefeCodeHerkunft(req)` → 403 (unverändert, gilt auch mit Parameter).
2. `const ort = loeseCodeOrt(angefragteUrl.searchParams.get('workflow'))` (Closure im Handler, nur lesend):
   - `null` → `{ http: 200, wurzel: repoWurzel, ablauf: null }` ⇒ Antwort ohne Zusatzfeld, **bitgleich** wie heute.
   - `pruefeAblaufKennung` → 400 vor jedem Dateizugriff (auch leerer Wert).
   - `ladeArtefaktVersion('workflow-<id>')` null → 404 `{ grund: 'Ablauf nicht gefunden', grund_schluessel: null }`.
   - `ermittleLaufort` nicht ok → 409 `{ grund: <eigener Text ohne Kennung>, grund_schluessel: arbeitsordnerGrund(Projektion) }`
     (Projektion = `baueArbeitsordnerProjektion`, wirksamer Status).
   - ok → `{ http: 200, wurzel: laufort.wurzel, ablauf: { workflowId, bedarf, workflowStatus, abnahmeErgebnis,
     arbeitsordner: laufort.arbeitsordner } }`; `abnahmeErgebnis` aus `ladeArtefaktVersion(abnahmeEntscheidungsId(id))`.
   - Die id ist nie Git-Argument und nie `cwd`: sie geht nur in `ladeArtefaktVersion`, `ermittleLaufort`,
     `baueArbeitsordnerProjektion`; `cwd` ist der Pfad aus dem Kontrollzustand.
3. `/api/code`: `codeProjektionLaufend` wird `Map<wurzel, Promise>`, Löschen in `finally` (Aufbau je Laufort geteilt). Mit
   `ablauf` antwortet der Server `{ ...projektion, ablauf: { ...ablauf, sichern: leiteSichernLageAb({...ablauf, projektion}) } }`
   (Helfer `mitAblauf` im Modul).
4. `/api/code/diff`: `baueCodeDiff({ repoWurzel: ort.wurzel, pfad, git })` — Allowlist unverändert, im Laufort.
5. Handler-Option `codeGit` (Default `fuehreGitAus`, nur Konstruktor, nie aus der Anfrage) an beide Aufrufe (Advisor 10).
6. Kopf von `scripts/leitstand/routen-code.mjs` und Serverkommentar nachziehen: `cwd` = Repo-Wurzel der Instanz oder,
   mit `?workflow=`, der Arbeitsordner aus dem Kontrollzustand (Advisor 17).

## C — Sichern in der Oberfläche

**Befehlsform (F-1088 (5))** in `public/leitstand/code-daten.js`, eine Quoting-Quelle (`psArgument`):
- neu `ortZeile(pfad)` = `Set-Location -LiteralPath ${psArgument(pfad)} -ErrorAction Stop` (immer `-LiteralPath`).
- `befehlsBloecke(pfad, folgen, { abbruch })`: mit `abbruch: true` je Folge `['& {', '  ' + ortZeile, ...folge.map('  ' + z), '}']`;
  ohne `abbruch` unverändert `[cdZeile, ...folge]`.
- `sicherBefehle` ruft `befehlsBloecke(…, { abbruch: true })` ⇒ **jeder** Sichern-Block (commit- und push-Block, in
  Workboard, Abnahme und #/code) hat die neue Form. `pruefstandBefehle` bleibt bei `cd` (kein Sichern-Block, kein
  schreibender git-Befehl) — **offener Punkt P1**.
- `sicherBefehle(daten, { veraltet, titel, nurPush })`: `nurPush: true` und 0 Dateien und `basis.voraus > 0` ⇒ nur der
  push-Block (gleiche Form); sonst wie heute. `nurPush` setzt nur der Ablauf-Block (#/code unverändert).
- `commitVorschlag(branch, titel)`: Branch beginnt mit `wf/` und `titel` nicht leer ⇒ Vorschlag aus dem Titel über
  dieselbe Säuberung (innere Funktion `saeubere`, aus dem heutigen Rumpf herausgezogen, keine zweite Regel); sonst wie
  heute. Ergebnis leer ⇒ heutiges Verhalten. Unit-Test: Sonderzeichen (`$`, `` ` ``, `"`), Anführungszeichen, Umlaute.
- `befehlsblock.js` `zaehleBefehle` zählt die Klammerzeilen `& {` und `}` nicht mit (sonst „5 Befehle“ für 3).

**Ablauf-Stand** `public/leitstand/ablauf-code-stand.js` (neu): je workflowId `{ zustand: leer|laedt|ok|fehler,
daten, http, grundSchluessel, fehler, geladenAm }`; `ladeAblaufCodeStand(id, { neu })`, `aktuellerAblaufCodeStand(id)`,
`abonniereAblaufCodeStand(fn)`; nie aus dem Poll; Überholschutz (Zähler) wie `code-stand.js`. `api.js`:
`holeAblaufCode(id)` → `{ http, koerper }` (409/404 lesbar), `holeCode()` unverändert.

**Anzeige — bestehende Karte erweitern, kein zweiter Block** (`views/arbeitsordner-anzeige.js`):
- neu `renderSichernAbschnitt({ workflowId, stand, titel, aufraeumen })` (rein): Badge „Bereit zum Sichern“ (bestehende
  Klasse `ablauf-status`), Befehlsblöcke (`renderBefehlsblock`, `echteWerte`), Schritte (1 sichern → 2 PR/Merge im Web →
  3 „Aufräumen“), Knopf „Aktualisieren“ (`data-sichern-aktualisieren`, Advisor 13), Zustände laedt/fehler/
  409-Grund (übersetzt über `grund_schluessel`)/`nichtsOffen`/`abgelehnt` (Grund + Weg „Aufräumen“ bzw. „Änderungen
  verwerfen“ über den bestehenden Dialog).
- `renderArbeitsordnerKarte(ao, codeStand, kontext)`: bei `ABGESCHLOSSEN` + `BEREIT` ersetzt `renderSichernAbschnitt` die
  heutige Zeile `arbeitsordner.sichern`; der Knopf „Aufräumen“ bleibt der eine der Karte. Sonst bitgleich.
- `views/workflows.js` `zeichneEntscheiden`: Abnahme-Modus wie heute (Karte, jetzt mit Abschnitt); zusätzlich Modus null
  bei `ABGESCHLOSSEN` + Arbeitsordner `BEREIT` ⇒ dieselbe Karte (Zustand aus F-979). Lädt den Ablauf-Stand einmal je
  workflowId; Abonnent zeichnet nur für die offene workflowId. Neue Delegation `[data-befehl-kopieren]` →
  `kopiereBefehlsblock` und `[data-sichern-aktualisieren]` auf `#workflow-entscheiden`. Ohne Arbeitsordner `''` wie heute.
- `views/workboard.js` `renderTerminalBlock(zustand)`: hat der Ablauf `arbeitsordner.status === 'BEREIT'`, lädt er
  einmal je Ablauf `?workflow=` und zeigt `renderSichernAbschnitt` (Aufräumen = Link `#/workflows/<id>`); sonst der
  heutige Weg (mit der neuen Befehlsform aus `sicherBefehle`).
- `#/code` bleibt beim Projektordner.
- i18n de/en/tr/ru unter `arbeitsordner.sichernAbschnitt.*` und `arbeitsordner.sichernGrund.<SICHERN_GRUENDE>`; keine
  internen Kennungen. CSS nur bestehende Tokens; höchstens eine Klasse für die Schrittliste.

## Golden-Erwartungen, die bewusst geändert werden

- `public/leitstand/code-daten.test.mjs` Z. 85 (`block[0] === CD`) → `& {` / `ortZeile` / `}`; Z. 33-36 Hilfe
  `ersterBlock` (Zeilen ohne Kopf/Fuß und Einzug).
- `scripts/leitstand/routen-code.test.mjs` Z. 348 (`cd.startsWith('cd ')`).
- `scripts/check-f45-b2a3b-review-stand.mjs` (d) `pruefeBloecke('Sichern', …, CD, …)` → neue Form; Prüfstand bleibt `CD`.
- `befehlsblock`-Tests zu `zaehleBefehle` (Klammerzeilen).
Jede geänderte Erwartung wird im Bericht einzeln genannt.

## Server-Zeilen (Ratsche)

Zuwachs geschätzt +20 (`loeseCodeOrt` ~14, Routenblock +3, `codeGit` +1, Import +2). Ausgleich: `entferneCodezaun`,
`entferneAeusserstenCodezaun`, `extrahiereErstesJsonObjekt` samt Doku (Z. ~3958–4040, rein, nicht schreibend) nach
`scripts/leitstand/text-auszug.mjs`; Server `import` + `export { … } from` (Laufzeit-Importe in `check-f22-click-to-work`,
`check-f31-gedaechtnis`). `LAUFID_UNZULAESSIGE_ZEICHEN` mit Doku (−2). Netto ≈ −60; die Grenze in
`scripts/wachstumsbremse-server.json` wird auf das Ist gesenkt. Kein Routen-Literal neu (Query-Parameter).

## Gate `scripts/check-f45-b2b4a-sichern.mjs` (in `check:gates`)

- (a) Ableitung: jeder Zweig, Reihenfolge, Rotfälle (je eine Bedingung gekippt ⇒ anderes Ergebnis), jeder Schlüssel in
  `SICHERN_GRUENDE` hat einen Text in de/en/tr/ru.
- (b) HTTP mit echtem Handler, Attrappen zur Laufzeit (tmp-Repo mit Commit auf `main`, Arbeitsbranch, Worktree über den
  echten Startweg mit Attrappen-Worker — Muster `check-f45-b2b3b2b2b2b1-projekt-cli.mjs`; Basis-Ref vorhanden, Advisor 18):
  ok → `absoluterPfad` = Arbeitsordner, `branch.name` = `wf/<id>`, `ablauf.sichern` bereit/commit; nach Commit im Worktree
  → bereit/push; unbekannt → 404; leer/unzulässig → 400; Pflicht ohne Ordner → 409 `nichtAngelegt`, Grund ohne id;
  `/api/code/diff?workflow=` liefert den Diff aus dem Arbeitsordner; fremde Herkunft mit Parameter → 403.
- (c) ohne Parameter bitgleich: Schlüsselmenge und Werte = direkter Aufruf `baueCodeProjektion({ repoWurzel, vorlage,
  startvorlagePfad })` ohne zeitabhängige Felder (`freigabeCommit.alterMinuten`, `verlauf.eintraege[].abstandMinuten`);
  kein Feld `ablauf`; `/api/code/diff` ohne Parameter wie heute.
- (d) id nie in Git-Argv: Spion über `codeGit` — kein argv-Element enthält die id, `cwd` ist der Arbeitsordner.
- (e) Befehlsform: jeder Sichern-Block `& {` / `Set-Location -LiteralPath <psArgument> -ErrorAction Stop` / … / `}`, mit
  und ohne Platzhalterzeichen; push-Block getrennt; `nurPush`; Prüfstand bleibt `cd`; Rotfall: Block ohne `-ErrorAction Stop`.
- (f) Commit-Vorschlag `wf/<id>` aus dem Titel, ohne Titel wie heute, keine id bei Titel.
- (g) Ratsche: `check-wachstumsbremse-server` grün, `starteWorkflowSchritt(` = 6.

## Render-Nachweis `features/F45/nachweise/b2b4/`

Neutrale Testinstanz mit festen Antworten (Muster `nachweise/b2b3b2b2a3/instanz.mjs`, neutrales HOME/TEMP, F-1125):
Workboard „Bereit zum Sichern“ mit Arbeitsordner und ohne Arbeitsordner, Abnahme mit Karte, nach der Abnahme (Modus
null), 409-Grund, `abgelehnt`; de/ru, 1440/390, hell/dunkel, 200 %; scrollWidth/clientWidth bei 390; Kopieren auf der
Abnahme-Seite (Klicktabelle); Pfadprobe/Schwärzung. Dazu `powershell-versuch.md`.

## E (Teil 4a) — Findings/Doku

- F-979, F-1087, F-1088 (5) erledigt (Fundstellen).
- Neu HARNESS_IMPROVEMENT P2 „Voller npm run check bricht in der Claude-Code-Sitzung mit Speichermangel ab (3 von 4
  Läufen am 18.10.; im frischen Terminal stabil grün, ~4,7 min)“ — Maßnahme `--test-concurrency` begrenzen + Laufzeit
  messen; nur Eintrag.
- Neu P3 „gemergt wird lokal nicht erkannt (Squash, kein fetch)“.
- `docs/STATUS.md` ~Z. 103, `docs/projekt/kontext/lagebild.md` ~Z. 104: W1, B2b-3b-2 gemergt, B2b-4a gebaut, 4b folgt.
- `docs/projekt/fixpaket-f45.md`: B2b-4 geteilt (4a gebaut, 4b offen). `features/F45/feature.md` nachziehen.
- ARCHITECTURE.md: keine Änderung erwartet.

## Offene Punkte (für den Delta-Pass)

- P1: `pruefstandBefehle` behält `cd` (kein Sichern-Block). Alternative: auch dort `abbruch`.
- P2: `nurPush` nur im Ablauf-Block; #/code zeigt bei 0 Dateien weiter „keine Änderungen“.
- P3: Commit-Vorschlag aus dem Titel ohne Längenkappung (Säuberung wie heute). Alternative: auf 72 Zeichen kappen.
- P4: Workboard lädt den Ablauf-Stand nur beim Erreichen von „abgeschlossen“ und per „Aktualisieren“ — ein späteres
  Aufräumen sieht man erst beim nächsten Laden (dann 409 `aufgeraeumt`).

## Risiken

- Die neue Befehlsform ändert sichtbare Blöcke in #/code und Workboard (gewollt, Entscheidung 3).
- Größe: weiterhin mittel (Modul, Route, zwei Views, Stand-Modul, i18n ×4, Render-Nachweis, Gate) — D/Jarvis ist raus.
