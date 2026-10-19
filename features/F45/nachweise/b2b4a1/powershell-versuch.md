# Nachweis F45 B2b-4a-1 — PowerShell-Vorabversuch zur Blockform (F-1088 (5))

Stand 19.10.2026, vor dem Bau ausgeführt. Laut Entscheidung des Challengers bekommen alle Befehlsblöcke des Leitstands
diese Blockform; gebaut wird sie in 4a-2. Geprüft wird hier nur das Verhalten der Shell, kein Leitstand-Code.

## Aufbau

- **Shell:** Windows PowerShell 5.1.26100 (`powershell.exe -NoProfile -NonInteractive`).
- **Block** (im Versuch mit zwei Leerzeichen Einzug; der Einzug ist für PowerShell ohne Bedeutung, 4a-2 baut ohne Einzug):

  ```powershell
  & {
    Set-Location -LiteralPath '<pfad>' -ErrorAction Stop
    git rev-parse --is-inside-work-tree
    git --version
  }
  ```

  Die beiden git-Folgezeilen zeigen, ob nach dem `Set-Location` noch etwas läuft.
- **Übergabe** je auf zwei Arten:
  - (c1) als ein Eingabepuffer: `-Command <Text>`. So übergibt PSReadLine einen eingefügten Block.
  - (c2) zeilenweise über stdin: `-Command -`, mit Fortsetzung `>>` wie beim Einfügen ohne PSReadLine.
- **Schwärzung:** Versuchsordner → `<TEMP>`, übrige Benutzerpfade → `<HOME>…`. Das erzeugende Skript lag im Scratchpad
  der Sitzung und ist nicht eingecheckt (F-1134).

## Ergebnis

| Fall | Pfad | Übergabe | Exit | stdout | stderr (erste Zeile) |
|---|---|---|---|---|---|
| (a) Ordner vorhanden | `'<TEMP>\mit ordner [1]'` | c1 | 0 | `true` · `git version 2.54.0.windows.1` | leer |
| (a) Ordner vorhanden | `'<TEMP>\mit ordner [1]'` | c2 | 0 | `true` · `git version 2.54.0.windows.1` | leer |
| (b) Ordner fehlt | `'<TEMP>\gibt es nicht'` | c1 | 1 | leer | `Set-Location : Der Pfad "<HOME>…` |
| (b) Ordner fehlt | `'<TEMP>\gibt es nicht'` | c2 | 1 | leer | `Set-Location : Der Pfad "<HOME>…` |
| (b) Ordner fehlt, Apostroph | `'<TEMP>\it''s weg'` | c1 | 1 | leer | `Set-Location : Der Pfad "<HOME>…` |
| (b) Ordner fehlt, Apostroph | `'<TEMP>\it''s weg'` | c2 | 1 | leer | `Set-Location : Der Pfad "<HOME>…` |

- Liegt der Ordner vor, laufen beide git-Zeilen.
- Fehlt der Ordner, bricht der Block nach `Set-Location` ab: stdout bleibt leer, kein git-Befehl läuft. Das gilt auch für
  einen Pfad mit Platzhalterzeichen (`[1]`, deshalb `-LiteralPath`) oder mit verdoppeltem Apostroph.
- Beide Übergabearten verhalten sich gleich.

## Grenzen

- pwsh 7 ist auf diesem Rechner nicht installiert und wurde daher nicht geprüft.
- Echtes Einfügen von Hand in ein interaktives Fenster ist nur nachgebildet. Stefan prüft es in 4a-2 im Leitstand.
- Geprüft sind nur git-Befehle, die nach stdout schreiben. Ein git-Befehl, der nach stderr schreibt (z. B. `git push`), ist
  nicht geprüft; das geht als Bauauflage an 4a-2 (Advisor-Delta 18).
