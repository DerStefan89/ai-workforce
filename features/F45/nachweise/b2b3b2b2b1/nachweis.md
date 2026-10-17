# Nachweis F45 B2b-3b-2b-2b-1 „Rückfrage-Kanal: Vorbereitung echter Nachweislauf“

Stand 17.10.2026. Plan `features/F45/plan-b2b3b2b2b1-v2.md`, Advisor `features/F45/advisor-b2b3b2b2b1.md`.

## Gate `scripts/check-f45-b2b3b2b2b1-nachweis.mjs`
Branch: alle Fälle grün ((a) ×5, (b) ×14, (c), (d), (e) ×2, (w) ×4; nach der Korrekturrunde und E-F-1136 (1) = B: andere CLI-Version ⇒ „erfüllt mit Abweichung“).

Rot gegen main (F-1127: `git archive main` in den Scratchpad, nur das neue Gate hineinkopiert, `node_modules` als Junction): 8 Befunde (nach der Korrekturrunde).
Echt rot: (a) ×4 — auch „Kanal-Stand nicht ladbar ⇒ keine Bestätigung“; auf main steht mit R3 „Sichtung bestätigt – weiter“ in Schritt 1 (ein Klick), Schritt 2 und Aktion `sichtung-r3` fehlen;
(w) `zaehlungVon` ohne gemeinsame Zählregel. Nur „fehlt“ (M13): (b)–(d) Modul `nachweis-rueckfrage-auswerten.mjs` fehlt, (e) ×2 Doku fehlt.
Auf main grün: (a) ohne R3 (unverändert, so gewollt), (w) Zeilenzahl, `starteWorkflowSchritt(` 6×, Hash von `_rueckfrage-aus-pruefung.mjs`.

Geänderte Bestands-Gates: keine. Lokal zusätzlich grün: `node --test "public/leitstand/**/*.test.mjs"` mit
`scripts/leitstand/rueckfrage-vermittlung.test.mjs`, `nachweis-rueckfrage-auswerten.test.mjs` und `src/rueckfrage/*.test.ts` (722 Tests), Gates f45-b2b3b1-rueckfrage,
-b2b3b1b-auswertung, -b2b3b2a-absicherung, -b2b3b2b1a-rest, -b2b3b2b1b-r1, -b2b3b2b2a-einschalten, -b2b3b2b2a2-anzeige, -b2b3b2b2a3-abnahme,
f21-ws2, f44-i18n, f813-csrf, wachstumsbremse-server, check-docs, f20-design-tokens; `npm run lint`, `npm run typecheck`.

## Render-Nachweis `render/`
Testinstanz von 2a-3 (`features/F45/nachweise/b2b3b2b2a3/instanz.mjs`, neutrale Umgebung, Port 4408, Lauf-Detail echt von der Instanz,
Workflow-Detail als feste Antwort im F-760-Halt). Erzeugt mit `render/erzeuge-nachweis.mjs`; Pfadprobe in allen Folgen „sauber“, kein
waagerechter Überlauf, `<img>` nie gerendert:
- `b1-ohne-r3-*` — Halt auf `lauf-kanal-verweigert` (Kanal-Grund, keine Abweichung): Dialog wie bisher mit „Sichtung bestätigt – weiter“.
- `b3-r3-*` — Halt auf `lauf-kanal-r3`: `01` Schritt 1 mit Hinweis und „Protokoll-Abweichung ansehen“ (keine Bestätigung im Dialog);
  `02` nach dem Klick die R3-Meldung (`<img …>` als Text, U+202E als ⟦U+202E⟧) und „Abweichung gesehen – Sichtung bestätigt – weiter“ an der
  Stelle des Hauptknopfs, Begründung bleibt; `03` nach 5 s (mehr als zwei Poll-Takte) unverändert.
- Ansichten: de 1440 dunkel/hell, de 390 dunkel/hell, tr/ru 390, de 1440 Zoom 200 %.
- Korrekturrunde (design-guardian): Hinweis vor dem Pflichtfeld, in Schritt 2 entfernt, Überschrift „Protokoll-Abweichung gesehen?“,
  Maske ⟦U+202E⟧ im Dialog rot hervorgehoben — alle Folgen neu gerendert. Grenze: die Spalte „Begründung“ der Klicktabelle liest den Text
  statt des Feldwerts (leer); dass die Begründung bleibt, zeigen die Bilder 02/03 (F-1136 (8)).

## Werkzeug
Rauchprobe gegen einen echten Bestandslauf ohne Kanal (Jarvis-Lauf im Kontrollzustand): Exit 0, alle Kanal-Punkte „nicht belegbar“, P7
„nicht erfüllt“ (kein Server `rueckfrage`), P10 „nicht belegbar“ (Lauf ohne Kanal-Argv — nach der Rauchprobe korrigiert, vorher fälschlich
„erfüllt“).
