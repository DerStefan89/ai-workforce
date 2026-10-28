# Plan F45 V1 — v2 (Delta zu `plan-v1.md` nach `advisor-v1.md`)

`plan-v1.md` bleibt unverändert stehen. Advisor „Nicht freigegeben“, **kein Schnitt**. Gilt v1 mit diesen Änderungen.

## Entscheidungen

- **A1/A2 CSP und Weiterleitung** (Stefan, 28.10.2026, Rückfrage in der Sitzung): meta-CSP
  `frame-src http://localhost:* http://127.0.0.1:*` — **ohne `'self'`** (Abweichung vom Auftragstext, Wunsch Stefans). Da
  `http://localhost:*` auch den Leitstand-Port deckt, zusätzlich **Rahmen-Schutz im Leitstand**: neues Modul
  `public/leitstand/rahmen-schutz.js`, **erster Import** von `app.js` (+1 Zeile). Beim Auswerten: läuft der Leitstand in einem
  Rahmen (`window.self !== window.top`), ersetzt es den Seiteninhalt durch einen kurzen Hinweis (i18n `rahmen.hinweis`) und
  wirft — ein Wurf beim Auswerten des ersten Imports bricht die Auswertung des ganzen Modulgraphen ab, bevor ein anderes Modul
  (Poll, Router, API-Aufruf) läuft. Begründung des Orts: frühester Punkt ohne Inline-Skript-Akrobatik (ein Inline-Skript kann das
  spätere Modul-Skript nicht verhindern); app.js 132 Zeilen, keine Zeilen-Ratsche. Header-Schutz (`frame-ancestors`,
  `X-Frame-Options`) bewusst nicht gesetzt (Serveränderung, Wachstumsbremse) — DEKLARIERT im Gate-Kopf, Restrisiko durch den
  Rahmen-Schutz abgedeckt. Die Aussage „doppelt gesperrt“ in v1 §6 ist damit ersetzt.
- **A3 Platzierung**: wie v1 (Ausklapper unter dem Kreis) — vom Auftrag festgelegt. „Bekommt/Liefert“ entfallen laut Auftrag
  (Abweichung von `docs/design/abgleich-f46.md:121` „K“, im Bericht und für design-guardian benannt). Umschalter mit fester `id`.
- **A4 Zeilenausgleich dashboard.js**: Dateikopf kürzen (Absatz „Entfallen“, Punkt 2c, Teile von „Wichtig“ zusammenfassen),
  Ausklapper-Rendern knapp; Ziel ≤ 1 035, danach `check-ratsche --aktualisiere` bei Senkung.
- **Gate (Befund 8)**: bleibt — vom Auftrag verlangt. Neu `scripts/check-f45-v1-vorschau.mjs`: (a) iframe nur geprüfte URL,
  sandbox exakt, ohne `allow-top-navigation`; (b) kein iframe bei unerreichbar/fehlend/nicht zulässig/Fehler/fremd; (c) meta-CSP
  exakt, **ohne `'self'`**; (d) Poll-Pfad: `vorschau-panel.js` importiert weder `zustand.js` noch `api.js`, und in `dashboard.js`
  steht der Ladeaufruf des Panels nur in `ladeAlles` (DEKLARIERT: Alias/Umweg); (e) Rahmen-Schutz: `pruefeRahmen` mit
  simuliertem `top !== self` wirft und schreibt den Hinweis, ohne Rahmen nicht; `app.js` importiert `rahmen-schutz.js` als
  ersten Import. Je Prüfung ein Rotfall.
- **Test (Befund 7)**: kein eigenes Schein-DOM für das Dashboard. `vorschau-panel.test.mjs` prüft Zustände, Schreibzähler
  (gleicher Schlüssel ⇒ kein Schreiben, also gleiches iframe), Reset (Befund 6), „Neu laden“ setzt `src`, `hole` mit der ID,
  Überholschutz, Abgleich der Client-Regel gegen `vorschauPortAus`. `projekt-wechsel.test.mjs` zeilenneutral: Poll-Fall um
  `/projekt-aufruf` erweitert; Cockpit-Fälle (:503, :1007) auf `-rechts`/`-links` (Befund 5). Identität des echten iframes über
  Poll-Ticks: DOM-Beleg im Render-Nachweis.
- **Befund 6**: `setzeGeruest` setzt den Panel-Cache zurück.
- **Befund 9**: Test-App zählt nur Browser-Anfragen (User-Agent), Serverprüfung getrennt.
- **Befund 10**: Client-Regel = Server-Regel (`^http://(localhost|127\.0\.0\.1):([1-9][0-9]{0,4})$`) plus Port ≠ `location.port`.
- **Befund 11**: Hinweise `keineUrl`/`nichtZulaessig` mit „danach den Leitstand neu starten“; `rel="noopener noreferrer"`.
  `vorschauKurzstand` passt nicht 1:1 (Abruffehler, Grundtexte) — eigene kleine Funktion, Schlüssel unter `vorschau.*`.
- **Befund 12/O7**: W2 bleibt `laeuft`; nur Notiz „W2d … erledigt (#392)“ (Auftragswortlaut). Schließen von W2 samt Umhängen
  von F-1129/F-1130 ist nicht Teil von V1.
- **Befund 13**: „Neu laden“ über die Klick-Delegation in `initBedienung` → `vorschau.neuLaden()`; Risiko: iframe läuft im
  verborgenen `#view-dashboard` weiter (benannt). F-1178: Fundstelle korrigiert, Abweichungen genannt, erledigt.
- **Befund 14/O6**: ein Satz in ARCHITECTURE.md §3 (Leitstand-Grenze iframe/CSP/Rahmen-Schutz mit Durchsetzungsgrad), wenn
  der Deckel es trägt.
- Delta-Advisor: nicht nötig (weder Variante S noch Header-Lösung; Rahmen-Schutz ist reiner Client-Code, Entscheidung Stefans).
