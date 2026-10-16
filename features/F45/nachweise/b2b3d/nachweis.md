# Nachweis F45 B2b-3d — Umfangs-Abgleich + Eingabefeld Bereiche

16.10.2026. Plan `features/F45/plan-b2b3d.md` (v1) und `features/F45/plan-b2b3d-v2.md` (v2 nach Advisor-Pass,
FREIGEGEBEN MIT HINWEISEN; Budget-Feld nach B2b-3e abgetrennt, Formular nur „Auftrag & Start“ — Entscheidungen Challenger).

## Render

Testinstanz `instanz.mjs` (Port 4404, Wegwerf-Ablage, Projekt = Wegwerf-Repo mit CLAUDE.md dieses Repos und getrackten
Ordnern). Auftrag über POST /api/auftraege mit Bereich `src/export/`; die Attrappe ändert `src/export/csv.ts` (innerhalb),
`README.md`, `src/konto.ts` und eine Datei mit langem Pfad unter `lib/…` (außerhalb). Klickfolgen
`render/erzeuge-nachweis.mjs`, je Ordner Screenshot, `klickfolge.json` und `protokoll.md` (Klicktabelle mit
`scrollWidth/clientWidth`).

| Folge | Zeigt | scrollWidth/clientWidth |
|---|---|---|
| `abnahme-de-1440`, `-de-1440-hell`, `-de-390`, `-ru-390-hell`, `-de-1440-zoom200` | Abnahme „entscheidbar“: unter den Kacheln der amber Hinweis „Außerhalb der vereinbarten Bereiche geändert“, Satz „Nur ein Hinweis — der Ablauf wurde nicht angehalten …“, Liste der drei Dateien (`README.md`, langer Pfad umgebrochen, `src/konto.ts`); Abnehmen bleibt möglich | 1440/1440, 1440/1440, 390/390, 390/390, 720/720 |
| `formular-de-1440`, `-de-1440-hell`, `-de-390`, `-ru-390-hell`, `-de-1440-zoom200` | „Auftrag & Start“: „Vereinbarte Bereiche · optional“ aufgeklappt, Feld „Bereiche“ mit Platzhalter „Zum Beispiel src/export/“ und Hinweis | 1440/1440, 1440/1440, 390/390, 390/390, 720/720 |
| `formular-fehler-de-1440` | Eintrag `/etc/` + „Ablauf vorbereiten“ ⇒ Fehlerzeile „„/etc/“ ist kein Pfad relativ zum Projekt …“, nichts angelegt | 1440/1440 |

Kein waagerechter Überlauf in einer Ansicht.

Nicht gerendert: Zustand „nicht bestimmbar“ (graue Zeile; Unit-Test, Gate (u6)) und der Hinweis im Block „vorab“ nach einem
Halt (Unit-Test).

Korrekturrunde nach dem Prüferpass (code-reviewer, qa, design-guardian — alle „freigegeben mit Hinweisen“): Notiz unter den
Kacheln ohne eigenen Rand (Abstand nur aus `gap`, design-guardian 1), Zeile „Vereinbart: …“ in der Notiz (qa 1); Nachweis neu
erzeugt (Instanz neu gestartet), alle Ansichten weiter ohne Überlauf.

Gate-Abweichung vom Plan v2: statt (u7) „Projekt ohne git“ prüft (u6) eine neu registrierte Übersicht ohne Feld — ohne git
hält schon die Startprüfung bzw. Regel 1j; der Zweig „degradiert ⇒ kein Feld“ ist per Unit-Test belegt.
