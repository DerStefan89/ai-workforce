# Nachweis F45 B2b-4a-2b-2 — Bereit zum Sichern: Anzeige

Stand 20.10.2026 (nach der Korrekturrunde). Plan `features/F45/plan-b2b4a2b2.md`, Gate `scripts/check-f45-b2b4a2b2-anzeige.mjs`.

## Render-Nachweis

Erzeugt mit `render/erzeuge-nachweis.mjs` (Playwright über `scripts/render-nachweis.mjs`) gegen die neutrale Testinstanz
`features/F45/nachweise/b2b3b2b2a3/instanz.mjs` (Port 4408, neutrales HOME/TEMP). GET `/api/workflows/<id>`, `…/abnahme` und
GET `…/code?workflow=<id>` sind feste Antworten (neutraler Pfad `C:\Projekte\haushaltsbuch-laeufe\a1b2c3d4`). Workboard „abgeschlossen“
über echtes Click-to-Work (Bearbeiten → Auftrag anlegen → Freigeben) mit festen Antworten für Anlegen, Routen, Freigabe und Detail.
Pfadprobe vor jedem Bild „sauber“; in keinem Bild waagerechter Überlauf.

| Ordner | Bilder | Lagen | scrollWidth/clientWidth |
|---|---|---|---|
| `render/ablauf-de-1440-hell/`, `ablauf-de-1440-dunkel/` | je 8 | 01 bereit (commit) · 02 bereit (push) · 03 push-Grund fremder Branch · 04 push-Grund ohne origin · 05 node_modules ausgelassen · 06 aufgeräumt (409) · 07 GESTOPPT mit Änderungen · 08 ohne Arbeitsordner (Projektordner) | 1440/1440 |
| `render/ablauf-de-390-hell/`, `ablauf-de-390-dunkel/` | je 8 | dieselben | 390/390 |
| `render/ablauf-ru-390-dunkel/` | 8 | dieselben, ru (Pluralformen) | 390/390 |
| `render/ablauf-de-1440-200prozent/` | 1 | 01 bereit (commit), 200 % | 720/720 |
| `render/ablauf-de-390-reduziert/` | 1 | 01 bereit (commit), reduzierte Bewegung | 390/390 |
| `render/abnahme-de-1440-hell/`, `abnahme-de-390-dunkel/`, `abnahme-ru-390-dunkel/` | je 2 | 09 Abnahme offen („Aufräumen erst nach deiner Abnahme“) · 10 nach Klick „Kopieren“ | 1440/1440 bzw. 390/390 |
| `render/workboard-de-1440-hell/`, `workboard-de-390-dunkel/`, `workboard-ru-390-dunkel/` | je 1 | 11 Workboard „abgeschlossen“ mit Abschnitt, Aufräumen als Link | 1440/1440 bzw. 390/390 |

## Klicktabelle (Auszug aus den Protokollen)

| Schritt | Ergebnis |
|---|---|
| Ablaufseite, jede Lage | Abschnitt in der Karte „Wo gearbeitet wird“ (kein zweiter Block); Knopf „Arbeitsordner aufräumen“ in der Karte: nie (nur unter den Aktionen); Fehlerfarbe im Abschnitt: nie |
| 06 aufgeräumt (409) | „Erledigt: Der Arbeitsordner ist aufgeräumt.“, kein Aufräumen-Hinweis, kein Block |
| 07 GESTOPPT | „Gestoppt mit 3 offenen Änderungen. Weg: Aufräumen — mit „Änderungen verwerfen“, wenn du sie nicht willst.“ |
| 03/04 push-Grund | fremder Branch: kein Block, Grund in Schritt 1, „Kein Push, solange …“; ohne origin: nur commit-Block, Hinweis „Kein Remote „origin““, Schritt 3 „Übernehmen ohne Remote“ |
| 10 Abnahme: Klick „Kopieren“ (commit-Block) | Knopf zeigt „Kopiert“; Zwischenablage = `& { ⏎ Set-Location -LiteralPath 'C:\Projekte\haushaltsbuch-laeufe\a1b2c3d4' -ErrorAction Stop ⏎ git add src/export/… ⏎ git commit … ⏎ }` |
| Workboard: Klick „Kopieren“ | Zwischenablage = derselbe commit-Block (Ort des Arbeitsordners) |

Bekannte Spuren der Attrappen, kein Befund dieser Änderung: der Status-Chip „nicht bestimmbar – die Fassung validiert nicht“ und
„Deine Abnahme: … · undefined“ auf der Ablaufseite kommen aus dem verkürzten Detail/der verkürzten Abnahme der festen Antworten; „Offene
Änderungen werden gelesen …“ (Projektordner) — die Instanz hat kein Repo. Der schwebende Knopf „Frag Jarvis“ liegt bei 390 über dem Fuß des
Abschnitts (bestehendes Verhalten, F-1112, nicht im Umfang).

## Gates und Tests (Bau)

`node scripts/check-f45-b2b4a2b2-anzeige.mjs` (a)–(h) mit Gegenproben grün; betroffene Gates grün; `npm run lint`, `npm run typecheck` grün;
Tests `ablauf-code-stand`, `ablauf-sichern-anzeige`, `workflows-sichern`, `arbeitsordner-anzeige`, `befehlsblock` u. a. grün. Den vollen
`npm run check` fährt Stefan.
