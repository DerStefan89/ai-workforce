# Nachweis F45 B2b-4a-2a — PowerShell-Versuch zur gebauten Blockform (F-1088 (5))

Stand 19.10.2026, nach dem Bau. Vorgänger: `features/F45/nachweise/b2b4a1/powershell-versuch.md` (Vorabversuch mit Einzug). Hier
laufen die Blöcke, die der Leitstand jetzt erzeugt (`public/leitstand/code-daten.js` `befehlsBlock`, ohne Einzug).

## Aufbau

- **Shell:** Windows PowerShell 5.1.26100 (`powershell.exe -NoProfile -NonInteractive`); pwsh 7 ist nicht installiert.
- **Block** (erzeugt mit `befehlsBlock(<pfad>, ['git rev-parse --is-inside-work-tree', 'git --version'])`):

  ```powershell
  & {
  Set-Location -LiteralPath '<TEMP>\mit ordner [1]' -ErrorAction Stop
  git rev-parse --is-inside-work-tree
  git --version
  }
  ```

- **Übergabe:** (c1) als ein Eingabepuffer `-Command <Text>` — so übergibt PSReadLine einen eingefügten Block; (c2) zeilenweise über
  stdin `-Command -` wie beim Einfügen ohne PSReadLine (Fortsetzung `>>`).
- **Schwärzung:** Versuchsordner → `<TEMP>`; kein Benutzerpfad. Das erzeugende Skript lag im Scratchpad der Sitzung, nicht eingecheckt (F-1134).

## Ergebnis

| Fall | Pfad | Übergabe | Exit | stdout | stderr (erste Zeile, gekürzt) |
|---|---|---|---|---|---|
| (a) Ordner vorhanden | `<TEMP>\mit ordner [1]` | c1 | 0 | `true` · `git version 2.54.0.windows.1` | leer |
| (a) Ordner vorhanden | `<TEMP>\mit ordner [1]` | c2 + Leerzeile | 0 | `true` · `git version 2.54.0.windows.1` | leer |
| (b) Ordner fehlt | `<TEMP>\gibt es nicht` | c1 | 1 | leer | `Set-Location : Der Pfad "<TEMP>\gibt es nicht" kann nicht gefunden …` |
| (b) Ordner fehlt | `<TEMP>\gibt es nicht` | c2 + Leerzeile | 1 | leer | `Set-Location : Der Pfad "<TEMP>\gibt es nicht" kann nicht gefunden …` |
| (b) Ordner fehlt, Apostroph | `<TEMP>\it's weg` (gequotet `''`) | c1 | 1 | leer | `Set-Location : Der Pfad "<TEMP>\it's weg" kann nicht gefunden …` |
| (b) Ordner fehlt, Apostroph | `<TEMP>\it's weg` (gequotet `''`) | c2 + Leerzeile | 1 | leer | `Set-Location : Der Pfad "<TEMP>\it's weg" kann nicht gefunden …` |
| (d) Ort nach dem Block | `<TEMP>\mit ordner [1]` | c1, danach `(Get-Location).Path` | 0 | `<TEMP>\mit ordner [1]` | leer |
| (e) git schreibt nach stderr | `<TEMP>\mit ordner [1]` | c1, `git rev-parse --verify gibtsnicht` · `git --version` | 0 | `git version 2.54.0.windows.1` | `fatal: Needed a single revision` |
| (f) zeilenweise, ohne Leerzeile nach `}` | `<TEMP>\mit ordner [1]` | c2 | 0 | leer — nichts lief | leer |
| (f) zeilenweise, mit Leerzeile nach `}` | `<TEMP>\mit ordner [1]` | c2 | 0 | `git version 2.54.0.windows.1` | leer |

- (a)–(c): Liegt der Ordner vor, laufen die git-Zeilen. Fehlt er, bricht der Block nach `Set-Location` ab: stdout leer, kein git-Befehl lief —
  auch bei Platzhalterzeichen (`[1]`, deshalb immer `-LiteralPath`) und verdoppeltem Apostroph. Beide Übergabearten gleich.
- (d) Der Ordnerwechsel bleibt nach `& { … }` bestehen (der Ort ist Sitzungszustand, nicht an den Block gebunden). Der reine Orts-Block in
  „Auftrag anlegen“ (`befehlsBlock(pfad, [])`) navigiert damit wie früher `cd`.
- (e) **Grenze:** Ein git-Befehl, der nach stderr schreibt oder scheitert, bricht den Block **nicht** ab — die Folgezeilen laufen weiter
  (unter 5.1 ohne Umleitung kein NativeCommandError). Abgebrochen wird nur, wenn `Set-Location` scheitert. Ein fehlgeschlagenes `git add` hält
  das nachfolgende Commit also nicht auf — wie vor der Blockform.
- (f) Zeilenweise Eingabe ohne PSReadLine: der Block läuft erst nach einer Leerzeile nach `}` (der `>>`-Prompt endet erst damit). Der
  kopierte Text endet ohne Zeilenumbruch; deshalb steht unter jedem Block „Nach dem Einfügen einmal Enter drücken“. Mit PSReadLine (Standard in
  Windows PowerShell 5.1 und pwsh) genügt nach dem Einfügen ein Enter; ohne PSReadLine sind es zwei (Enter, dann leeres Enter am `>>`).

## Grenzen

- pwsh 7 nicht geprüft (nicht installiert). Nicht geprüft und für pwsh 7 zu erwarten (qa 3): werden zwei Blöcke ohne Enter dazwischen
  eingefügt, entsteht `}& {` — unter 5.1 ein Parse-Fehler (nichts läuft); unter pwsh 7 ist `&` am Zeilenende der Hintergrund-Operator, der
  erste Block liefe dann unsichtbar als Job. Deshalb nach jedem Block erst Enter, dann den nächsten einfügen.
- **Nur PowerShell** (qa 5): In cmd.exe oder Git-Bash greift die Abbruchgarantie nicht — `& {`, `Set-Location` und `}` scheitern dort
  einzeln, git-Zeilen liefen im aktuellen Ordner der Shell (mit `cd '…'` war das vorher in cmd genauso). Der einzige Hinweis ist das Etikett
  POWERSHELL am Block.
- Ein git-Fehler mitten im Block bricht nicht ab ((e)); bei mehreren `git add`-Zeilen kann ein Commit einen Teilstand sichern — Folge-Finding
  F-1159.
- Echtes Einfügen von Hand in ein interaktives Fenster ist nur nachgebildet (c1/c2). Stefan prüft es im Leitstand mit den beiden
  Probeblöcken aus dem Bericht (Ordner vorhanden / Ordner fehlt).
- Der Gate-Teil (b) in `scripts/check-f45-b2b4a2a-blockform.mjs` wiederholt (a)/(b) mit c1 bei jedem `npm run check:gates`; ohne PowerShell
  wird er übersprungen.
