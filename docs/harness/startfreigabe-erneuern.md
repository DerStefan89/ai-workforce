# Startfreigabe nach einem Claude-Code-Update erneuern

Stand Startfreigabe-Erneuerung CLI 2.1.300 (15.10.2026). Zeigt der Leitstand beim Start das Band **„CLI-Version geändert — Startfreigabe neu erzeugen“**,
weicht die installierte Claude-Code-Version von `werkzeugVersionDeklariert` in `startvorlagen/ai-workforce.json`
ab. Die Belege der Startfreigabe (Rot-Fälle, Hook-Wirkung) gelten dann nur für die alte Version. Die Workforce
erneuert die Freigabe nie selbst: Nachweise erzeugt ein Skript, den Commit im Autorisierungs-Repo und die
Verweisdatei setzt Stefan (E3, ARCHITECTURE.md §3).

Die Schritte entsprechen dem Vorgehen aus F45 B1b-1 (`features/F45/feature.md`, Abschnitt „Stand B1b-1“, Nachtrag
„Startfreigabe“). Alle Befehle laufen in PowerShell.

## Automatisches Update

Ein Selbstupdate von Claude Code sperrt die Workforce ohne Vorwarnung (F-1101). Deshalb ist es abgeschaltet —
einmalige Einrichtung, bei späteren Updates nur noch prüfen:

```powershell
setx DISABLE_AUTOUPDATER 1          # Benutzer-Umgebungsvariable; das laufende Terminal sieht sie noch nicht
```

Danach ein **neues** Terminal öffnen und dort `claude doctor` aufrufen: beim automatischen Update steht „disabled“.
`setx` wirkt nur auf Prozesse, die danach starten — Leitstand und offene Claude-Code-Sitzungen, die vorher liefen,
einmal neu starten (der Leitstand gibt seine Umgebung an die CLI weiter).

`$CLI` (`C:\Program Files\claude\claude.exe`) ist eine Verknüpfung auf die npm-global-Installation (F-087);
`claude doctor`, `claude update` und `$CLI` meinen also dasselbe Programm. Ein Update nur bewusst mit
`claude update` — danach sofort diese Anleitung ab Schritt 1 durchlaufen.

## Variablen

Einmal am Anfang setzen; jeder spätere Befehl benutzt nur diese Variablen.

```powershell
$REPO = 'C:\Users\stefa\Projekte\ai-workforce'        # Installation von ai-workforce = Startordner des Leitstands
$AUTH = 'C:\Users\stefa\ai-workforce-autorisierung'    # Autorisierungs-Repo (außerhalb der Schreibreichweite der Workforce)
$CLI  = 'C:\Program Files\claude\claude.exe'            # werkzeugStartziel aus startvorlagen/ai-workforce.json
$NEU  = (& $CLI --version).Trim()                        # installierte Version, z. B. "2.1.297 (Claude Code)"
$NEU
```

Im Lauf der Anleitung kommen zwei Variablen hinzu: `$BELEG` (Schritt 4, Kurztext des Rot-Fall-Belegs, der in den
Wirksamkeitsnachweis geschrieben wird) und `$COMMIT` (Schritt 5, Commit-Hash im Autorisierungs-Repo, vom Block als
`$global:COMMIT` gesetzt).

- `$REPO` muss genau der Ordner sein, aus dem der Leitstand startet — die Startfreigabe ist an ihn gebunden (E-188).
- `$CLI` ist der erste Eintrag von `werkzeugStartziel` in der Startvorlage; ändert sich der Installationsort, zuerst
  dort nachziehen.
- `$NEU` ist der exakte Text, den der Leitstand vergleicht (getrimmt, sonst unverändert).

## 1 Matcher prüfen

In `.claude/settings.json` (nur im eigenen Editor, Team-Policy) unter `hooks.PreToolUse`:
- `Edit|Write` → `guard-settings.js`
- `Bash|PowerShell` → `commit-guard.cjs`

Im Changelog der neuen Version nachsehen, ob ein Werkzeug dazukam oder umbenannt wurde, das Dateien schreibt oder
Befehle ausführt. Wenn ja: Matcher ergänzen. Jede Änderung an `settings.json` oder an einem Hook ändert den
Gültigkeitsschlüssel — sie gehört deshalb vor Schritt 4.

## 2 Nachweise mit der neuen Version erzeugen

Die drei Skripte laufen nur gegen Wegwerf-Ordner unter dem Temp-Ordner, nie gegen ein Projekt, und brauchen keine gültige
Startfreigabe (sie rufen die CLI direkt).

```powershell
Set-Location $REPO
node features/F45/nachweise/b1b1/realer-lauf.mjs
node features/F45/nachweise/b1b1/powershell-eingabe.mjs
node features/F45/nachweise/b1b2/hooks-nachweis.mjs
```

Erwartung (aus `features/F45/nachweise/b1b1/nachweis.md`), je Zählung neben den Skripten:

| Zählung | Soll |
|---|---|
| `b1b1/zaehlung-haertung.json` | zwei `permission_denials` (Write), `datei_ausserhalb_existiert` und `datei_projektordner_existiert` `false`, `datei_im_arbeitsordner_existiert` `true`, `hintergrund_aufrufe: []` |
| `b1b1/zaehlung-kontrolle.json` | Kontrolle ohne Sperre: `hintergrund_aufrufe` nicht leer, `klassifikation` = `FEHLGESCHLAGEN` / `hintergrund_ausfuehrung` (so gewollt) |
| `b1b1/zaehlung-hooks.json` | `edit_verweigert: 1`, `settings_byte_gleich: true` |
| `b1b1/zaehlung-npm-mit.json` / `-npm-ohne.json` | `prepare_lief` `false` / `true` |
| `b1b1/zaehlung-powershell.json` | Denial für `Remove-Item … -Recurse -Force` mit Grund „commit-guard“, `ordner_ziel_existiert_noch: true` |
| `b1b2/zaehlung-hooks.json` | Denials für Edit, PowerShell und Bash, `settings_byte_gleich: true` |

Weicht ein Ergebnis ab: hier anhalten — die neue Version verhält sich anders, die Freigabe wird nicht erneuert.
Ausnahme F-1103: ohne jeden Werkzeugaufruf (das Modell hat den Auftrag selbst abgelehnt) ist der Lauf kein Befund —
einmal wiederholen.

`hooks-nachweis.mjs` schreibt `features/F45/nachweise/b1b2/zaehlung-hooks.json` mit SHA-256 und Matcher jedes Hooks.
Haben sich in Schritt 1 ein Matcher oder ein Hook geändert, in `harness-abgleich/standard.json` bei `commit-guard` und
`guard-settings` die Felder `beleg.skript_sha256` und `beleg.matcher` aus dieser Datei übernehmen — sonst zeigt der
Harness-Abgleich beide Hooks „ohne Beleg“, und der Test „standard.json … keinen ohne Beleg“ in `npm run check` ist rot.

## 2a Zählungen schwärzen

Die Zählungen enthalten Benutzer- und Temp-Pfade (F-1111 (3)). Vor dem Commit schwärzen — Temp-Ordner → `<TEMP>`,
Benutzerordner → `<HOME>`, jede Datei als ganzes JSON-Dokument, danach `JSON.parse`:

```powershell
Set-Location $REPO
node features/F45/nachweise/b2b1b/schwaerze.mjs --json (Get-ChildItem features/F45/nachweise/b1b1/zaehlung-*.json).FullName features/F45/nachweise/b1b2/zaehlung-hooks.json
```

Ist eine Datei danach kein gültiges JSON oder steht der Name des Benutzerordners noch als Pfadsegment darin
(Restprüfung), bricht das Skript mit Exit 1 ab und lässt diese Datei unverändert — dann die Datei ansehen, nicht
committen. Ein zweiter Lauf auf schon geschwärzten Dateien ändert nichts. Die SHA-256-Werte der Hooks in
`zaehlung-hooks.json` ändern sich durch die Schwärzung nicht.

## 3 Deklarierte Version in der Startvorlage

In `startvorlagen/ai-workforce.json` das Feld `werkzeugVersionDeklariert` auf den Wert von `$NEU` setzen. Ab hier
verweigert jeder Lauf mit „Drift im Gültigkeitsschlüssel: 'werkzeug_version_deklariert' (E-188)“, bis Schritt 6
erledigt ist — gewollt.

## 4 Baseline und Wirksamkeitsnachweis schreiben

```powershell
Set-Location $REPO
$BELEG = "=== rot_fall_beleg ===`nstand: CLI $NEU`nbelege: features/F45/nachweise/b1b1/nachweis.md, zaehlung-*.json (Lauf vom heutigen Tag), scripts/commit-guard.test.mjs`n=== Ende rot_fall_beleg ==="
node scripts/erzeuge-invocation-policy-nachweise.mjs `
  --repo-wurzel "$AUTH" `
  --werkzeug-version "$NEU" `
  --berechtigungskontext profil-standard `
  --arbeitsverzeichnis-pfad "$REPO" `
  --startziel-pfad "$CLI" `
  --rot-fall-beleg "$BELEG"
```

- `--berechtigungskontext` ist der Wert `berechtigungskontext` der Startvorlage (`profil-standard`).
- Das Skript misst `.claude/settings.json` und jeden darin genannten Hook, schreibt je eine Datei nach
  `$AUTH\invocation-policy-baseline\` und `$AUTH\invocation-policy-wirksamkeitsnachweis\` und gibt beide Pfade mit ihrem
  `datei_hash` aus. Es committet nicht.

## 5 Commit im Autorisierungs-Repo (Stefan)

In die ersten zwei Zeilen die beiden Pfade aus der Ausgabe von Schritt 4 einsetzen, so wie sie dort stehen
(„Baseline geschrieben: …“, „Wirksamkeitsnachweis geschrieben: …“); der Block leitet daraus die Pfade relativ zu
`$AUTH` ab.

```powershell
& {
  $BASELINE = '<Baseline-Pfad aus Schritt 4>'
  $NACHWEIS = '<Nachweis-Pfad aus Schritt 4>'
  if (-not $AUTH -or -not $NEU) { throw 'Erst den Abschnitt Variablen ausführen ($AUTH, $NEU fehlen)' }
  $B = 'invocation-policy-baseline/' + (Split-Path -Leaf $BASELINE)
  $W = 'invocation-policy-wirksamkeitsnachweis/' + (Split-Path -Leaf $NACHWEIS)
  Push-Location $AUTH -ErrorAction Stop
  try {
    git status --short
    if (@(git diff --cached --name-only).Count -ne 0) { throw 'Index ist vorher nicht leer - Abbruch' }
    git add -- $B $W
    if ($LASTEXITCODE -ne 0) { throw "git add fehlgeschlagen (Exit $LASTEXITCODE)" }
    $staged = @(git diff --cached --name-only)
    if ($staged.Count -ne 2 -or $staged -notcontains $B -or $staged -notcontains $W) {
      throw "Erwartet genau 2 gestagte Dateien, gefunden $($staged.Count): $($staged -join ', ')"
    }
    git commit -m "Startfreigabe nach Claude-Code-Update auf $NEU"
    if ($LASTEXITCODE -ne 0) { throw "git commit fehlgeschlagen (Exit $LASTEXITCODE)" }
    $global:COMMIT = (git rev-parse HEAD).Trim()
    "COMMIT=$global:COMMIT"
  } finally {
    Pop-Location
  }
}
```

- Gehärtet nach F-1102: explizite Pfade statt Ordner, `$LASTEXITCODE` nach `add` und `commit`, genau zwei gestagte
  Dateien. Der Block steht in `& { … }`, damit ein `throw` den Rest abbricht — eingefügte Einzelzeilen liefen sonst
  nach einem Fehler weiter. `Push-Location`/`Pop-Location`: das Terminal steht danach wieder im vorherigen Ordner.
- `git status --short` vorher zeigt genau die zwei neuen Dateien aus Schritt 4.
- Bricht der Block nach `git add` ab, bleibt der Index gefüllt und ein zweiter Versuch endet mit „Index ist vorher
  nicht leer“. Zurücksetzen: `git -C $AUTH restore --staged -- invocation-policy-baseline invocation-policy-wirksamkeitsnachweis`.
- `$COMMIT` für Schritt 6 ist der ausgegebene Hash.

## 6 Verweisdatei `state/aktuelle-autorisierung.json`

In `$REPO\state\aktuelle-autorisierung.json` beide Referenzen ersetzen (Schritt 4 gibt je Referenz eine Kopiervorlage
aus, nur `commit_hash` fehlt darin):
- `baselineReferenz.pfad` und `.datei_hash` = Baseline-Pfad und Datei-Hash aus der Ausgabe von Schritt 4,
- `wirksamkeitsnachweisReferenz.pfad` und `.datei_hash` = Nachweis-Pfad und Datei-Hash aus Schritt 4,
- beide `commit_hash` = `$COMMIT` aus Schritt 5.

## 7 Prüfung

1. Leitstand neu starten (`npm run leitstand` aus `$REPO`): das Band „CLI-Version geändert“ erscheint nicht mehr.
2. Einen lesenden Lauf starten (z. B. eine Jarvis-Frage im Chat): er startet, statt mit E-183/E-188 verweigert zu
   werden.
3. `npm run check` → Exit 0.
4. Commit in `$REPO` mit expliziten Pfaden (F-1102): `startvorlagen/ai-workforce.json`,
   `state/aktuelle-autorisierung.json`, ggf. `harness-abgleich/standard.json` und die nach Schritt 2a geschwärzten
   `features/F45/nachweise/b1b1/zaehlung-*.json` sowie `features/F45/nachweise/b1b2/zaehlung-hooks.json` (Rohströme
   bleiben lokal, ARCHITECTURE.md §4).

Neue Projekte, die danach angelegt werden, bekommen die erneuerte Verweisdatei mit (E-F41-1). Projekte, die vorher
angelegt wurden, tragen eine eigene Kopie der alten Verweisdatei; ob sie nachgezogen werden muss, zeigt ein lesender
Lauf in diesem Projekt (Verweigerung mit E-183/E-188 = nachziehen).
