# Render-Nachweis F45 B2a-3b — geprüfter Stand, „Review veraltet“, Befehlsblöcke mit cd (13.10.2026)

Testinstanz `instanz.mjs` (Port 4199, danach beendet): Wegwerf-Repo „mein projekt“ (Pfad mit Leerzeichen), zwei echte Abläufe
Ausführung → Review (Codex) über den HTTP-Pfad mit Attrappe; danach ändert die Instanz zwei Dateien im Projekt. Klickfolgen und
Protokolle: `render/erzeuge-nachweis.mjs`, je Ordner `klickfolge.json`, `protokoll.md`, Screenshot.

| Ordner | Zeigt | Beobachtet |
|---|---|---|
| `veraltet-de-1440`, `-1440-hell`, `-de-390` | Abnahme entscheidbar, Review-Kachel „Hinweise zum Review“: „Review veraltet — der Arbeitsordner hat sich seit dem Review geändert.“ | amber (nicht rot), `[data-review-hinweis="reviewVeraltet"]`, Zählzeile im Blick „1 — Details beim Review“, Urteil bleibt grün |
| `unbestimmt-de-1440`, `unbestimmt-ru-390-hell` | „Stand des Reviews nicht bestimmbar: Review aus einem älteren Lauf — geprüfter Stand nicht festgehalten“ (Laufakte ohne `geprueft_stand`) | amber, `standUnbestimmt`; ru: Satz übersetzt, Servergrund deutsch in `lang="de"` (bekannte Grenze F-1085 (8)) |
| `code-de-1440`, `-1440-hell`, `-de-390`, `code-ru-390` | `#/code`: „Sichern“ als zwei Befehlsblöcke [cd, git add, git commit] und [cd, git push], je mit „Kopieren“, Hinweis „je Block am Stück einfügen, Push zuletzt“; „Prüfstand“ [cd, npm --version] über der Zeile „berührt · kommt“ | erste Zeile jedes Blocks `cd '…\mein projekt'` (gequotet), zweiter Block nur push |

Nach der Korrekturrunde neu erzeugt (Text „Review veraltet“ mit nächstem Schritt, Prüfstand-Block vor „berührt · kommt“,
design-guardian 2/4). Nicht gerendert: 200 % Zoom und reduzierte Bewegung (keine Bewegung in diesem Paket).

Nicht gerendert: Workboard-„Sichern“ (Phase „abgeschlossen“ entsteht nur über die interaktive Kette Workitem → Router →
Freigabe im Client). Derselbe Renderweg (`renderBefehlsblock` je Block aus `sicherBefehle(...).bloecke`) ist durch
`code-daten.test.mjs` und Gate f45-b2a3b (d) belegt; der Projektordner-statt-Worktree-Befund dort ist F-1087 (B2b).
