# Nachweis F45 B2b-3b-2b-2a-2 „Rückfrage-Kanal: Oberfläche“, Teil A Warteschlange

Stand 17.10.2026. Plan `features/F45/plan-b2b3b2b2a2-v2.md`, Advisor `features/F45/advisor-b2b3b2b2a2.md`.

## Gate `scripts/check-f45-b2b3b2b2a2-anzeige.mjs`
Branch: alle Fälle grün ((a) ×4, (b) ×2, (c) ×2, (d), (v), (e)).

Rot gegen main (F-1127: `git archive main` in den Scratchpad, nur das neue Gate hineinkopiert, `node_modules` verlinkt):
9 Befunde — (a) ×4 echt rot (`entschieden` fehlt in `GET /api/rueckfragen`), (b) ×2 echt rot (`rueckfrageStatus` fehlt in
`GET /api/zustand`), (c) ×2 „Modul fehlt“ (rueckfrage-anzeige.js, rueckfrage-daten.js), (v) echt rot (keine Gruppe „kanal“); (d) fällt
mit (c) weg (Modul fehlt); (e) ist auf main grün (Invariante „ein setInterval“, kein Rotfall beabsichtigt).

## Render-Nachweis `render/`
Testinstanz `instanz.mjs` (neutrale Umgebung, echter `erzeugeMultiProjektDispatcher`, Projekt „haushaltsbuch“ mit aktivem Lauf; eine
Rückfrage beantwortet die Instanz selbst per HTTP ohne Browser-Kopf). Erzeugt mit `render/erzeuge-nachweis.mjs`:
- `k1-entscheidungen-{de-1440, de-1440-hell, de-390, ru-390}` — Band, drei Karten (Befehl mit Zeilennummern, `<img>`-Text als Text,
  Frage mit ⟦U+202E⟧/⟦U+200B⟧ und gesperrter leerer Option), „Zuletzt entschieden“ mit „nicht aus dem Browser“; kein waagerechter
  Überlauf; Pfadprobe sauber.
- `k2-band-{…}` — Übersicht mit Band (Anzahl, nächste Frist, Link) und Zahl am Navigationspunkt.
- Korrekturrunde: Ansichten zusätzlich `tr-390` und `de-1440-zoom200` (Zoom 200 %); `k4-freitext-de-1440` — leere freie Antwort ⇒
  Fehlermeldung an der Karte, Freitext getippt, nach 5 s (> 2 Poll-Takte) noch da (Spalte „Freitext noch da“ = true, stabiles DOM V2);
  `k5-band-an-de-1440` — nach Ablehnen und Antwort per Option Band „an“ ohne Wartende.
- Nachpass: Spalte „Fokus in der Kanal-Liste“ — in k3 nach „Einmal erlauben“ und Entfernen der Karte weiter true (Fokus auf der Überschrift
  der nächsten Karte); in k4 verschwindet die Meldung „Bitte eine Antwort eintragen.“ beim Tippen (Spalte „Fehlermeldung an Karte“ false).
  Ein fehlgeschlagener Abruf ist nicht gerendert (F-1133 (5)(9)).
- `k3-erlauben-de-1440` — „Einmal erlauben“ im echten Browser über `/api/projekte/haushaltsbuch/…` ⇒ Karte weg, „Zuletzt entschieden“
  zeigt „Einmal erlaubt · aus dem Browser“ (Herkunft über das Projektpräfix belegt, Advisor M7).
