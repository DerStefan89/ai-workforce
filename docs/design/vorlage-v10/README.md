# Designvorlage V10 — Referenz

Referenz für den Design-Schnitt F-725 (`features/F44/feature.md`). **Wird
nicht ausgeliefert**: Nichts aus diesem Ordner gehört nach `public/`, der
Code der Vorlage wird nicht übernommen, nur Gestaltung und Interaktion.

- **Führend** ist `START-HERE-CLAUDE.md` (Stand V10, 26.09.2026). Die
  übrigen Markdown-Dateien ergänzen es; `claude-code-handoff.md` ist
  Historie V1–V10.
- **Maßgebliche Abweichungen** von der Vorlage — was echt angebunden, was
  ergänzt, was Zukunft ist — stehen in `docs/design/abgleich-f725.md`. Wo
  die Vorlage und der Abgleich sich widersprechen, gilt der Abgleich.
- Die Vorlage enthält Beispieldaten, ein Badge „Designvorschau“ und
  Prototyp-Hinweise. Nichts davon kommt ins Produkt.

## Inhalt und Herkunft

Byte-gleiche Kopie der von Stefan mitgebrachten Vorlage (10 Textdateien,
3 Bilder), abgelegt am 30.09.2026. Belegt per SHA-256 gegen das Original:

| Datei | SHA-256 |
|---|---|
| `index.html` | `dea01622b4c8bfc6fcd045ce5b95fa348f74c129ea49b67bfba6202c10f43e1d` |
| `style.css` | `5913836ffc84ff563fe289283186b1719c3b82b3d49fa2fda82ef3981c999166` |
| `app.js` | `20bc457a9a35c0fda52d68a03506cc2bb78a9bdd5df5bf23efe11623f3fa6510` |
| `experience.js` | `449d80ed99ae9800a4762896409f0d170034391ac70bf5de27b0dbccd3a6565b` |
| `localization.js` | `4c87bc36c1c03d12cdf4cdf095da33ba100f574146551651d630a9ee4879aa59` |
| `START-HERE-CLAUDE.md` | `948f4aba7764538ff798fc9b5667a697572e19fd4281aa467c593e2a637e5606` |
| `BRAIN-AND-PHASES.md` | `079b1ea9bf583b802d4e256e8cb7cb660db83050f04f77ca1b9815a803ecaaa8` |
| `TECHNICAL-INSIGHT-CONTRACT.md` | `e4b11ea38cbfae0f8940c25cd3ef72b46da5d0ee50a784a06cb4ec7cee1e9bc5` |
| `UX-FINAL-REVIEW.md` | `6c1d14c54bb97f0f4a8900acf949dce2206081cfbccbacc70d20298082f94fd7` |
| `claude-code-handoff.md` | `0182c9f587425cff989ffbd790187bcd4a33227cde9bd4129b90f490e9d65858` |
| `assets/armillary.png` | `b40f0ec50f0a7a2818e518637b348c7fbbcb1c8e1a880c3f7ff64608021f0ec1` |
| `assets/face.png` | `a8577af9a73139263f394ed4cc254ed1a247e887cddb7ce9cb5cf23ca7de4e92` |
| `assets/gear.png` | `912668df1e5db05a21101f6b385b6efc868b9d0dd1129bbf71badae239788986` |

Nachprüfen: `sha256sum <datei>` im Ordner bzw. `Get-FileHash <datei>` in
PowerShell. Am 30.09.2026 stimmten alle 13 Werte mit dem Original überein
(beidseitig geprüft, `sha256sum -c` und `Get-FileHash`). Die Textdateien
haben LF-Zeilenenden, 0 CR-Bytes. Die Repo-Regel `* text=auto eol=lf` ändert
sie deshalb nicht: `git hash-object` ergibt mit und ohne Filter denselben
Blob.

## Referenz-Screenshots

`screens/`, erzeugt mit `node docs/design/vorlage-v10/erzeuge-screens.mjs`
(kleiner `node:http`-Server auf 127.0.0.1, Playwright/Chromium headless wie
`scripts/render-nachweis.mjs`; nicht Teil von `npm run check`).
Dateiname = Route mit „_“ statt „/“.

| Präfix | Serie |
|---|---|
| `d_` | Desktop 1440×1000, ganze Seite, dunkel — 32 Routen; `d_start` nach 2,6 s |
| `m_` | Mobil 390×844, ganze Seite — 6 Routen |
| `l_` | Hell (`jarvis-theme` = `"light"`), 1440×1000 — 3 Routen |
| `motion_start_*` | `#/start` bei 0 / 800 / 1600 / 2400 ms und mit reduzierter Bewegung |
| `motion_persona_*` | Kopfzeile auf `#/uebersicht` (`persona-arrive`) bei 0 / 350 / 700 ms und mit reduzierter Bewegung |

Laufprotokoll 30.09.2026 (Windows, Playwright-Chromium headless): 50
Screenshots, 0 Seitenfehler, 0 fehlgeschlagene Anfragen, 0 HTTP-Fehler,
Exit 0. Das Skript meldet jeden dieser Fehler und eine Motion-Seite ohne
Animation mit Exit 1. Welches Referenzbild zu welcher Leitstand-Ansicht
gehört, steht in `docs/design/abgleich-f725.md` §9.

Hinweise zum Lesen:
- Die Animationen der Motion-Bilder sind deterministisch: Das Skript hält
  alle Animationen an und setzt sie auf den Zeitpunkt, statt real zu
  warten. Schriften kommen vom System; auf einem anderen Rechner können
  die Bilder daher leicht abweichen.
- In Ganzseitenbildern stehen fest positionierte Elemente (Sidebar,
  „Frag Jarvis“) an ihrer Position im ersten Bildschirm; darunter endet die
  Sidebar. Das ist eine Eigenheit der Ganzseitenaufnahme, kein Layout der
  Vorlage.
- Die Sidebar-Illustration über „Alle Produkte / Nutzung / Einstellungen“
  ist ein Fehler der Vorlage (F-865), keine Vorgabe.
