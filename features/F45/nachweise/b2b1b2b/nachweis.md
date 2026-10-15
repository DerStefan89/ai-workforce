# Nachweis F45 B2b-1b-2b — Render („Anzeige“: Plan und Befunde auf der Freigabe-Seite, „Advisor wiederholen“)

Testinstanz `features/F45/nachweise/b2b1b2b/instanz.mjs` (Port 4399, Wegwerf-Ablage, Projekt = Wegwerf-Repo mit CLAUDE.md
dieses Repos ⇒ Stack gefüllt, keine Frage des Architekten). Architekt, Advisor und die übrigen Rollen laufen als Attrappe
(kein CLI, kein Netz) über den echten HTTP-Pfad: Architekt → Advisor → Ausführung → Review, Architekt und Advisor vorab
freigegeben. Klickfolgen `render/erzeuge-nachweis.mjs`, je Ordner Screenshot, `klickfolge.json` und `protokoll.md`
(Klicktabelle mit Überlaufmessung). 15.10.2026.

| Folge | Zeigt |
|---|---|
| `a-de-1440`, `-de-1440-hell`, `-de-390`, `-ru-390-hell`, `-de-1440-zoom200` | Advisor UEBERARBEITEN ⇒ Freigabe des Architekten für Plan v2: Karte „Plan v1 — wird überarbeitet“ (Zusammenfassung, Module, Satz „Plan v1 lässt sich hier nicht unverändert freigeben, weil der Advisor Änderungen verlangt. Mit „Ablehnen“ stoppst du den Ablauf.“ — Knopfname je Sprache aus der Option der Spalte), Karte „Befunde des Advisors“ mit „Diese Befunde gehen an den Architekten.“, Urteil-Badge, drei Befunde (Schwere, Evidenz, Fundstelle, Korrekturrichtung); lange Fundstelle bricht um |
| `b-…` (dieselben fünf) | nach der Freigabe Plan v2 ⇒ Freigabe der Ausführung: „Plan, den du freigibst“ mit Kennzeichen „Plan v2“, Befunde „In Plan v2 eingearbeitet — bitte prüfen.“ |
| `c-…` (dieselben fünf) | `max_replans` 0, FREIGEGEBEN_MIT_AUFLAGEN ⇒ Freigabe der Ausführung mit „Plan v1“ und „Kein Plan v2: Die Vorlage dieses Ablaufs erlaubt keine automatische Korrekturrunde. …“ |
| `d-…` (dieselben fünf) | Advisor-Ergebnis verstößt gegen das Schema (Prosa statt JSON) ⇒ KLAERUNG_ERFORDERLICH: rote Notiz „Der Advisor hat kein verwertbares Ergebnis geliefert.“ (verweist für den Grund auf „Technischer Ablauf & Serverentscheidung“) mit Knopf „Advisor wiederholen“ (in ru übersetzt), darunter die Reparatur-Notiz |
| `d-klick-de-1440` | Klick „Advisor wiederholen“: POST …/pruefer-wiederholen setzt nur den Advisor zurück ⇒ Freigabe des Advisors (Spalte „Deine Entscheidung“), Meldung „Der Advisor ist zurückgesetzt. Er startet nach deiner Freigabe.“; die Notiz verschwindet |

Korrekturrunde (Prüfpass 15.10.2026): Notiz verweist auf den Ort des Grundes (design-guardian 1), Hinweis der Befund-Karte
abgesetzt (font-weight, design-guardian 3), „Plan v2/eingearbeitet“ nur, wenn der Architekt seit dem Rückweg neu lief (qa 2).
Nachweis danach gegen eine frische Instanz neu erzeugt.
Textkorrektur (Challenger zum qa-Befund 1, 15.10.2026): der Satz der Karte „Plan v1 — wird überarbeitet“ nennt die Lage ehrlich
(Plan v1 hier nicht unverändert freigebbar, „Ablehnen“ stoppt den Ablauf); die Folgen `a-*` sind neu erzeugt, 390 px weiter 390/390.

Überlaufmessung (F-1107 (5)): `scripts/render-nachweis.mjs` schreibt bei `ueberlauf` seit B2b-1b-2b zusätzlich
`scrollWidth/clientWidth` des Dokuments. In allen 21 Folgen kein waagerechter Überlauf: 390 px ⇒ 390/390 (a, b, c, d,
je de und ru), 1440 px ⇒ 1440/1440, 200 % ⇒ 720/720 CSS-px.

Grenzen: Der Grund hinter „Kein Plan v2:“ ist ein Servertext (deutsch, wie alle Halt-Gründe) und erscheint auch in ru
deutsch. Fundstellen und Befund-IDs sind Inhalte des Advisors (nicht übersetzt, für den Abgleich mit Plan v2 bewusst sichtbar). Der Grund des Advisor-Halts steht unter „Technischer Ablauf & Serverentscheidung“
(Regel-1d-Text, deutsch mit Schritt- und Lauf-Kennung, F-1085 (8)) — unverändert.
