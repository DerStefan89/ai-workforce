# Nachweis F45 B2b-4a-2a — Blockform

Stand 19.10.2026. Plan `features/F45/plan-b2b4a2a.md`, Shell-Verhalten `powershell-versuch.md` (dieser Ordner).

## Render-Nachweis

Erzeugt mit `render/erzeuge-nachweis.mjs` (Playwright über `scripts/render-nachweis.mjs`) gegen die neutrale Testinstanz
`features/F45/nachweise/b2b3b2b2a3/instanz.mjs` (Port 4408, neutrales HOME/TEMP). GET …/api/code ist eine feste Antwort mit neutralem
Pfad `C:\Projekte\haushaltsbuch`, 15 geänderten Dateien mit langen Pfaden (lange `git add`-Zeile) und origin. Pfadprobe vor jedem Bild
„sauber“, kein waagerechter Überlauf.

| Ordner | Bild | Zu sehen | scrollWidth/clientWidth |
|---|---|---|---|
| `render/code-de-390/` | `01-de-390.webp` | #/code dunkel: „Sichern“ mit commit-Block (`& {`, `Set-Location -LiteralPath 'C:\Projekte\haushaltsbuch' -ErrorAction Stop`, `git add …` umbrochen mit hängendem Einzug, Commit-Zeile, `}`; „3 Befehle“) und push-Block (2 Befehle), „Prüfstand“-Block — unter jedem Block „Nach dem Einfügen einmal Enter drücken.“ | 390/390 |
| | `02-de-390.webp` | nach „Kopieren“ am commit-Block: Knopf „Kopiert“, Zwischenablage beginnt mit `& { ⏎ Set-Location -LiteralPath 'C:\Projekte\haushaltsbuch' -ErrorAction Stop ⏎ git add …` (Hinweis nicht mitkopiert) | 390/390 |
| `render/code-de-390-hell/` | `01-…`, `02-…` | dasselbe hell | 390/390 |

Bekannte Spur, kein Befund dieser Änderung: „Diff nicht ladbar: fatal: not a git repository …“ in der Dateiliste — GET …/code/diff ist nicht
nachgebildet; die Instanz hat kein Git-Repo.
