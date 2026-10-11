# Startfreigabe nach einem Claude-Code-Update erneuern

Stand F45 B1b-2. Zeigt der Leitstand beim Start das Band **„CLI-Version geändert — Startfreigabe neu erzeugen“**,
weicht die installierte Claude-Code-Version von `werkzeugVersionDeklariert` in `startvorlagen/ai-workforce.json`
ab. Die Belege der Startfreigabe (Rot-Fälle, Hook-Wirkung) gelten dann nur für die alte Version. Die Workforce
erneuert die Freigabe nie selbst: Nachweise erzeugt ein Skript, den Commit im Autorisierungs-Repo und die
Verweisdatei setzt Stefan (E3, ARCHITECTURE.md §3).

Die Schritte entsprechen dem Vorgehen aus F45 B1b-1 (`features/F45/feature.md`, Abschnitt „Stand B1b-1“, Nachtrag
„Startfreigabe“). Alle Befehle laufen in PowerShell.

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
Wirksamkeitsnachweis geschrieben wird) und `$COMMIT` (Schritt 5, Commit-Hash im Autorisierungs-Repo).

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

Beide Skripte laufen nur gegen Wegwerf-Ordner unter dem Temp-Ordner, nie gegen ein Projekt, und brauchen keine gültige
Startfreigabe (sie rufen die CLI direkt).

```powershell
Set-Location $REPO
node features/F45/nachweise/b1b1/realer-lauf.mjs
node features/F45/nachweise/b1b1/powershell-eingabe.mjs
node features/F45/nachweise/b1b2/hooks-nachweis.mjs
```

Erwartung (aus `features/F45/nachweise/b1b1/nachweis.md`): Write außerhalb des Arbeitsordners verweigert, guard-settings
verweigert das Edit auf `settings.json`, commit-guard verweigert `Remove-Item -Recurse -Force` über das
PowerShell-Werkzeug, kein Hintergrund-Aufruf angenommen. Die Zählungen liegen danach als `zaehlung-*.json` neben den
Skripten. Weicht ein Ergebnis ab: hier anhalten — die neue Version verhält sich anders, die Freigabe wird nicht
erneuert.

`hooks-nachweis.mjs` schreibt `features/F45/nachweise/b1b2/zaehlung-hooks.json` mit SHA-256 und Matcher jedes Hooks.
Haben sich in Schritt 1 ein Matcher oder ein Hook geändert, in `harness-abgleich/standard.json` bei `commit-guard` und
`guard-settings` die Felder `beleg.skript_sha256` und `beleg.matcher` aus dieser Datei übernehmen — sonst zeigt der
Harness-Abgleich beide Hooks „ohne Beleg“, und der Test „standard.json … keinen ohne Beleg“ in `npm run check` ist rot.

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

```powershell
Set-Location $AUTH
git status
git add invocation-policy-baseline invocation-policy-wirksamkeitsnachweis
git commit -m "Startfreigabe nach Claude-Code-Update auf $NEU"
$COMMIT = (git rev-parse HEAD).Trim()
$COMMIT
```

`git status` vorher zeigt genau die zwei neuen Dateien aus Schritt 4.

## 6 Verweisdatei `state/aktuelle-autorisierung.json`

In `$REPO\state\aktuelle-autorisierung.json` beide Referenzen ersetzen:
- `baselineReferenz.pfad` und `.datei_hash` = Baseline-Pfad und Datei-Hash aus der Ausgabe von Schritt 4,
- `wirksamkeitsnachweisReferenz.pfad` und `.datei_hash` = Nachweis-Pfad und Datei-Hash aus Schritt 4,
- beide `commit_hash` = `$COMMIT` aus Schritt 5.

## 7 Prüfung

1. Leitstand neu starten (`npm run leitstand` aus `$REPO`): das Band „CLI-Version geändert“ erscheint nicht mehr.
2. Einen lesenden Lauf starten (z. B. eine Jarvis-Frage im Chat): er startet, statt mit E-183/E-188 verweigert zu
   werden.
3. `npm run check` → Exit 0.
4. Commit in `$REPO`: `startvorlagen/ai-workforce.json`, `state/aktuelle-autorisierung.json`, ggf.
   `harness-abgleich/standard.json` und die neuen `zaehlung-*.json` (Rohströme bleiben lokal, ARCHITECTURE.md §4).

Neue Projekte, die danach angelegt werden, bekommen die erneuerte Verweisdatei mit (E-F41-1). Projekte, die vorher
angelegt wurden, tragen eine eigene Kopie der alten Verweisdatei; ob sie nachgezogen werden muss, zeigt ein lesender
Lauf in diesem Projekt (Verweigerung mit E-183/E-188 = nachziehen).
