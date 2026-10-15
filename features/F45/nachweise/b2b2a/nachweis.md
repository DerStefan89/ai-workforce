# Nachweis F45 B2b-2a — Render („Review vollständig“: BEREIT mit schwerem Befund, Claude-Reviewer)

Testinstanz `features/F45/nachweise/b2b2a/instanz.mjs` (Port 4401, Wegwerf-Ablage, Projekt = Wegwerf-Repo mit CLAUDE.md
dieses Repos). Ausführung und Review laufen als Attrappe (kein CLI, kein Netz) über den echten HTTP-Pfad; der Review ist
ein claude-code-Reviewer mit `output_schema: ergebnis-code-reviewer` (seit B2b-2a zulässig) und urteilt BEREIT mit einem
HOCH- und einem NIEDRIG-Befund (lange Fundstelle). Klickfolgen `render/erzeuge-nachweis.mjs`, je Ordner Screenshot,
`klickfolge.json` und `protokoll.md` (Klicktabelle mit Überlaufmessung). 15.10.2026.

| Folge | Zeigt |
|---|---|
| `render/bereit-hoch-de-1440`, `-de-1440-hell`, `-de-390`, `-ru-390-hell`, `-de-1440-zoom200` | Abnahme „entscheidbar“: Kachel „Review“ mit Badge „Bereit“ in amber (nicht grün) und Reviewer „Claude“; amber Notiz „Hinweise zum Review“ mit „Das Review sagt „bereit“, meldet aber einen schweren Befund (kritisch oder hoch). Prüfe ihn, bevor du abnimmst, oder wünsche eine Anpassung.“ (ru mit Pluralform: „о 1 серьёзном замечании“); keine rote Notiz; „Abnehmen“ bleibt angeboten (kein Halt); Befunde unter „Nachweise im Einzelnen“ mit ID, Evidenz und Korrekturrichtung |

Korrekturrunde (Prüfpass 15.10.2026, design-guardian 1/3/4): Badge „Bereit“ amber statt grün, wenn der Hinweis vorliegt
(Kachel und „Auf einen Blick“, eine Ableitung `urteilFarbe`); Satz mit Pluralform statt „…: 1. Prüfe …“ (las sich als
Aufzählung); „Das Review“. Alle fünf Folgen danach gegen eine frische Instanz neu erzeugt.

Überlaufmessung: in allen fünf Folgen kein waagerechter Überlauf — 1440 px ⇒ 1440/1440, 390 px ⇒ 390/390 (de und ru),
200 % ⇒ 720/720 CSS-px.

Grenzen: Die Zahl der Hinweise in „Auf einen Blick“ ist nur in der Klicktabelle belegt (`Zahl im Blick` true), nicht
eigens im Bild gezeigt. Die Begründung einer automatischen Anpassung bleibt unverändert
(Entscheidung A1 = a), deshalb kein Render dieser Lage.
