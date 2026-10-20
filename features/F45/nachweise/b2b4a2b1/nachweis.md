# Nachweis F45 B2b-4a-2b-1 — Regeln und node_modules

Stand 20.10.2026 (nach der Korrekturrunde). Plan `features/F45/plan-b2b4a2b.md` (Schnitt 4a-2b-1), Gate
`scripts/check-f45-b2b4a2b1-regeln.mjs`.

## Render-Nachweis

Erzeugt mit `render/erzeuge-nachweis.mjs` (Playwright über `scripts/render-nachweis.mjs`) gegen die neutrale Testinstanz
`features/F45/nachweise/b2b3b2b2a3/instanz.mjs` (Port 4408, neutrales HOME/TEMP). GET …/api/code ist eine feste Antwort in der Form von
`routen-code.mjs` `leseDateien` (neutraler Pfad `C:\Projekte\haushaltsbuch`, `dateien.nodeModules = 1532`, die getrackte
`node_modules/vendored-datum/index.js` bleibt in der Liste). Pfadprobe vor jedem Bild „sauber“, kein waagerechter Überlauf.

| Ordner | Bild | Zu sehen | scrollWidth/clientWidth |
|---|---|---|---|
| `render/code-de-390-dunkel/` | `01-…` | Lage „node_modules ausgelassen“: Dateiliste (3 Dateien, darunter die getrackte node_modules-Datei), darunter klein „node_modules ausgelassen — fehlt in .gitignore: 1.532 neue Dateien darunter stehen in keinem Befehl. Abhilfe: node_modules/ in die .gitignore eintragen.“; Sichern: `git add` ohne neue node_modules-Dateien, push-Block, „Neue Dateien unter node_modules stehen in keinem git add.“ | 390/390 |
| | `02-…` | Lage „nur node_modules offen“: „Keine Änderungen außer 1.532 neuen Dateien unter node_modules — node_modules fehlt in .gitignore; dort eintragen.“ (statt „sauber“); Sichern: „Nichts zu sichern — nur neue Dateien unter node_modules, und die kommen in keinen git add.“ | 390/390 |
| `render/code-de-390-hell/` | `01-…`, `02-…` | dasselbe hell | 390/390 |
| `render/code-de-1440-dunkel/` | `01-…`, `02-…` | dasselbe bei 1440 | 1440/1440 |
| `render/code-de-1440-hell/` | `01-…`, `02-…` | dasselbe hell bei 1440 | 1440/1440 |
| `render/code-ru-390-dunkel/` | `01-…`, `02-…` | ru (längster Text, Pluralform „1 532 новых файла“) | 390/390 |

Bekannte Spuren, kein Befund dieser Änderung: „Diff nicht ladbar: fatal: not a git repository …“ (GET …/code/diff nicht nachgebildet, die
Instanz hat kein Repo); der schwebende Knopf „Frag Jarvis“ liegt bei 390 über dem unteren Rand der Karte (bestehendes Verhalten, auch in
`b2b4a2a`). 200 % und reduzierte Bewegung nicht gerendert (Auftrag: nur de 390/1440 hell/dunkel; der Hinweis ist ein umbrechender Absatz).
