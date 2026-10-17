# Nachweis F45 B2b-3b-2b-2a-3 „Rückfrage-Kanal: Abnahme“

Stand 17.10.2026. Plan `features/F45/plan-b2b3b2b2a3-v2.md`, Advisor `features/F45/advisor-b2b3b2b2a3.md`.

## Gate `scripts/check-f45-b2b3b2b2a3-abnahme.mjs`
Branch: alle Fälle grün ((z) ×2, (f), (p) ×2, (s), (a) ×3, (g), (w) ×2).

Rot gegen main (F-1127: `git archive main` in den Scratchpad, nur das neue Gate hineinkopiert, `node_modules` als Junction): 7 Befunde —
(z) ×2 echt rot (Zählung ohne unbeantwortete), (f) echt rot (keine Zählung bei TIMEOUT), (s) echt rot (`rueckfrageKanal` fehlt im
Lauf-Detail), (g) echt rot (keine Regelzeile „Frage ungültig“), (p) und (a) „Modul fehlt“ (lauf-terminal-projektion.mjs,
rueckfrage-abnahme.js). (w) ist auf main grün (Invarianten `starteWorkflowSchritt(` 6×; der Vergleich mit main entfällt im Archiv ohne git).

Geändertes Bestands-Gate: `check-f45-b2b3b2b1a-rest.mjs` (r3) verlangt zusätzlich `art: 'rueckfrage_abweichung'` am Startfehler-Eintrag des
echten Laufs — keine Bedingung entfällt.

## Render-Nachweis `render/`
Testinstanz `instanz.mjs` (neutrale Umgebung, drei Läufe mit Terminalmarken vom echten Evaluator, Port 4408). Erzeugt mit
`render/erzeuge-nachweis.mjs`; Pfadprobe in allen Folgen „sauber“, kein waagerechter Überlauf:
- `a1-verweigert-*` — VERWEIGERT mit `ablehnungstext_passt_nicht`: „Deine Ablehnung nicht bestätigt“ + „Was tun“ statt „Ursache in Klartext
  (kommt)“; Block „Rückfrage-Kanal im Lauf“ mit Antworten, B10-Hinweis, „bestätigt: 0“, unbeantwortet (Frist abgelaufen 1).
- `a2-erfolg-*` — ERFOLGREICH mit voller Zählung (bestätigt 1, unbeantwortet 1/1/2).
- `a3-r3-*` — R3 als rote Meldung, `<img …>` als Text, U+202E als ⟦U+202E⟧.
  Ansichten a1–a3: de 1440 dunkel/hell, de/tr/ru 390, de 1440 Zoom 200 %.
- `a4-sichtung-*` — F-760-Sichtung: „Schritt s1 endete VERWEIGERT wegen des Rückfrage-Kanals …“ mit Grund und „Was tun“; Knopf bleibt.
  Workflow-Detail als feste Antwort, das Lauf-Detail kommt echt von der Instanz (Nachladen im Hintergrund). Die Meldung „Harness-Abgleich
  nicht ladbar: 404“ im Bild kommt von der festen Antwort (Workflow existiert in der Instanz nicht).
- `a5-entscheidungen-*`, `a6-startfehler-*` — R3 als „Protokoll-Abweichung“ mit „Lauf ansehen“ (umrandeter Knopf; gefüllt ist genau ein
  Hauptknopf, „Fehler ansehen“ auf der oberen Karte eines Laufs der Instanz); a6 auf `#/ausfuehrungen` mit der Startfehler-Zeile. Der Startfehler-Eintrag ist als feste Antwort in `/api/zustand` eingesetzt (Form
  wie der Server ihn schreibt); den Server-Weg belegt Gate f45-b2b3b2b1a-rest (r3). a4–a6 in de 1440 dunkel/hell und de 390.
- `a7-r3-lang-*` (de 390, Zoom 200 %) — R3-Grund mit 500 Zeichen ohne Leerzeichen bricht um; `a8-timeout-de-1440` — FEHLGESCHLAGEN mit
  Zählung: „nicht ausgewertet“ statt „bestätigt: 0“.
- Korrektur nach Sichtprüfung: der Kanal-Grund stand bei VERWEIGERT doppelt (Notiz und Block) — der Block zeigt die Auswertung nur noch für
  „echte Verweigerung“ und „nicht geprüft“.
- Korrekturrunde nach code-reviewer, qa, design-guardian (alle Folgen neu gerendert, Pfadprobe sauber, kein Überlauf): a6 zeigte den
  falschen Unterreiter (Route `#/runs` statt `#/ausfuehrungen`); R3-Meldung jetzt vor dem Zahlenblock; „was tun“ bei R3 nur einmal; Maske im
  Lauf-Detail gestaltet wie in „Deine Entscheidungen“; `overflow-wrap` für Grund-Code und R3-Text; „bestätigt“ je Ergebnis; R3-Text nennt
  auch „Kanal für diesen Lauf nicht offen“; Sichtung wartet auf das Lauf-Detail (kein Schließen eines offenen Dialogs beim Nachladen),
  Fehler mit 30 s Rückzug. Restpunkte F-1135.
