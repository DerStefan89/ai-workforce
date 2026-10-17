# Plan v1 — F45 B2b-3b-2b-2a-2 „Rückfrage-Kanal: Oberfläche“

Stand 17.10.2026. Branch `f45/b2b3b2b2a2-anzeige`, Basis main `9b4f067` (#357, 2a-1). Reihenfolge F-1124: Plan → Advisor-Pass
(`advisor-b2b3b2b2a2.md`) → Code → code-reviewer, qa, design-guardian. Vorab freigegebener Schnitt bei „zu groß“:
**Teil A Warteschlange (1, 4, 6)** | **Teil B Abnahme (2, 3, 5)**.

Kontext: F-1126 (3) Auflage B12, F-1128 (3), F-1131 (keine neuen Routen, kein Routen-Umzug vor W2), F-1132 (1)(3)(5);
ARCHITECTURE §1 (Wachstumsbremse), §3 (Kanal, E-B7), §4 (Klassifikation); `plan-b2b3b2b2a-v2.md` (Umriss 6–9). Kein echter CLI-Lauf (2b-2b).

## Ziel
Mit `LEITSTAND_RUECKFRAGE=1` sieht und beantwortet Stefan Rückfragen im Leitstand; der Kanalstand ist sichtbar. Teil B: die Auswertung
des Laufs zeigt, was der Kanal bewirkt hat. Ohne Kanal: Server-Antworten bis auf ein Feld `rueckfrageKanal: { an: false, … }` in
`GET /api/zustand` gleich, Terminalmarke bitgleich, Oberfläche ohne neue Elemente.

## Teil A — Warteschlange (Punkte 1, 4, 6)

### A1 Vermittlung (`scripts/leitstand/rueckfrage-vermittlung.mjs`, kein Server-Code)
- `entscheide(...)` merkt am Warteschlangeneintrag `ergebnis` (Protokoll-Art), `herkunft` (nur bei Antworten) und `entschieden_am`.
- Neu `entschiedene()` ⇒ entschiedene Warteschlangeneinträge **offener** Läufe (Speicher, D13 — nicht aus der Datei), neueste zuerst,
  höchstens `ENTSCHIEDEN_MAX = 20`: `{ id, lauf_id, art, tool_name, befehl?, frage?, optionen?, ergebnis, herkunft?, antwort?,
  entschieden_am }`. Nach `beendeLauf` leer (Lauf entfernt). auto_deny ohne Warteschlangeneintrag erscheint nicht (Stefan wurde nicht
  gefragt; die Zählung in Teil B nennt sie).
- Rückgabe von `erzeugeRueckfrageVermittlung` um `entschiedene` ergänzt.

### A2 Server (zwei bestehende Antworten, keine neue Route, keine neue Zeile)
- `GET /api/rueckfragen`: `{ rueckfragen: offene(), entschieden: entschiedene() }` (zusätzliches Antwortfeld, F-1131 erlaubt).
- `GET /api/zustand` (F-1132 (3)): zusätzliches Feld `rueckfrageKanal: rueckfrageAn ? { an: true, warteGrenzeMs } : { an: false, grund:
  'nicht_eingeschaltet' }` in der bestehenden `sendeJson`-Zeile. Der genaue Ausschaltgrund (Wert der Variable, Port 0) steht nur in der
  Startzeile der Konsole: der Handler kennt ihn nicht, und eine zusätzliche Handler-Option `rueckfrage…` würde die gemeinsame Regel
  `_rueckfrage-aus-pruefung.mjs` (bleibt unverändert) brechen. Schlüssel heißt `rueckfrageKanal`, nicht `rueckfrage:` (Regel „Schlüssel
  `rueckfrage:` genau einmal“).
- Antwort-Route unverändert (Body `{ entscheidung }` bzw. `{ antwort }`, Herkunft aus den Kopfzeilen). Bilanz Server: ±0.

### A3 Oberfläche
- **Instanz des aktiven Laufs** (`public/leitstand/rueckfrage-daten.js`, rein): `instanzPraefixDesLaufs(projekte, aktiverLauf)` ⇒
  `null` ohne aktiven Lauf; sonst `/api/projekte/<id>` des Registereintrags mit `laufAktiv: true` (GET /api/projekte, unpräfigiert,
  bestehend), sonst `/api` (Workforce-Instanz bzw. Register ohne Treffer). Der Workforce-Eintrag zeigt im Dispatcher auf denselben
  Handler — beide Präfixe treffen dieselbe Vermittlung.
- **Abruf** (`public/leitstand/rueckfrage-kanal.js`): Abnehmer des einen Polls (`abonniere`, kein Timer, Gate f20). Je Tick: Kanal aus
  oder kein aktiver Lauf ⇒ Zustand leer; sonst einmal je laufId das Register laden (Präfix merken), dann `GET <präfix>/rueckfragen`
  (höchstens ein Abruf gleichzeitig, Zeitlimit wie der Poll). Fehler ⇒ Gruppe „nicht verfügbar“ (null), lädt ⇒ undefined (Muster
  attention-daten). Antworten: `POST <präfix>/rueckfragen/<id>/antwort` (api.js `holeRueckfragen(praefix)`,
  `sendeRueckfrageAntwort(praefix, id, koerper)` — explizites Präfix, kein `mitPraefix`), danach `pollJetzt()`. 404/409 (schon
  entschieden, Lauf beendet) ⇒ Meldung an der Karte, kein Absturz.
- **Einordnung** (`attention-daten.js`): neue Art `kanal` (eigene Gruppe `kanal`, getrennt von `rueckfrage` F-689 und dem
  Workflow-Halt); `ENTSCHEIDUNGS_ARTEN` + `GRUPPE_JE_ART` ergänzt; Filter „Rückfragen“ zeigt `['rueckfrage', 'kanal']`.
  `baueEntscheidungen(zustand, workitems, referenz, kanal?)` — viertes Argument optional (`undefined` = Gruppe nicht vorhanden, alle
  bisherigen Aufrufer unverändert); die Gruppe steht **zuerst** (wartet mit Frist, blockiert den Lauf). `zaehleOffeneEntscheidungen`
  bleibt beim Poll (keine Kanal-Zahl am Navigationspunkt, kein zweiter Abruf dort) — offen für den Advisor (Abwägung unten).
- **Karte** (`public/leitstand/rueckfrage-anzeige.js`, reine Render-Funktionen ⇒ HTML-String, Muster workflow-abnahme.js; alles über
  `escapeHtml`, nie Server-HTML):
  - Bash: Befehl **wörtlich und vollständig** in `<pre>` (kein Kürzen, keine Höhenbegrenzung, `white-space: pre-wrap`,
    `overflow-wrap: anywhere`), Kopfzeile „N Zeilen · M Zeichen“; Steuerzeichen außer `\n`/`\t` sichtbar maskiert (Verteidigung in der
    Tiefe — `vorentscheidung` lehnt sie ohnehin ab). Knöpfe nur „Einmal erlauben“ und „Ablehnen“ (`data-entscheidung` =
    `einmal_erlauben` | `ablehnen`), kein „immer“.
  - Frage: Text mit maskierten Steuerzeichen (Cc, Cf, Cs, Zl, Zp; `\n` bleibt Zeilenumbruch in der Frage, in Optionen maskiert), Marke
    `⟦U+XXXX⟧` als eigenes `<span class="rueckfrage-maske">`; je Option ein Knopf (Antwort = Optionstext), dazu freies Textfeld
    (1–2000 Zeichen, Prüfung im Client nur als Hinweis, der Server bleibt maßgeblich) mit „Antworten“.
  - Restzeit bis `frist` („noch 7:42 min“; abgelaufen ⇒ „Frist abgelaufen — wird abgelehnt“), Lauf-ID, seit.
  - „Zuletzt entschieden (Rückfrage-Kanal)“ unter der Gruppe: je Eintrag Ergebnis, Herkunft; `nicht_browser` als rote Marke „nicht aus
    dem Browser“ (Hinweis, kein Schutz — E-B7 DEKLARIERT, Text sagt das).
- **Kanal-Hinweis** (F-1132 (3)): Band `#rueckfrage-kanal-hinweis` (note amber, unter `#start-hinweis`), nur bei `rueckfrageKanal.an`:
  „Rückfrage-Kanal an — Befehle außerhalb der Freigabe und Fragen des Laufs erscheinen unter „Deine Entscheidungen“; jede wartet
  höchstens 10 min und wird dann abgelehnt.“ Wartegrenze aus `warteGrenzeMs`. Nur `textContent`.
- **i18n** de/en/tr/ru, keine Texte im Code; Gate check-f44-i18n.

### A4 Gate `scripts/check-f45-b2b3b2b2a2-anzeige.mjs` (in `check:gates`)
(a) echter Handler mit injizierter Vermittlung und Kanal: Bash- und Frage-Rückfrage stellen ⇒ `GET /api/rueckfragen` zeigt beide offen,
`entschieden` leer; Antwort mit `Sec-Fetch-Site: same-origin` ⇒ `entschieden[0].herkunft === 'browser'`, ohne Kopf ⇒ `nicht_browser`;
dasselbe über `erzeugeMultiProjektDispatcher` mit `/api/projekte/p1/…`. (b) `GET /api/zustand`: mit Kanal `rueckfrageKanal.an === true` und
`warteGrenzeMs`, ohne `{ an: false, grund: 'nicht_eingeschaltet' }`; übrige Schlüssel gleich. (c) rein: Bash mehrzeilig vollständig mit
Zeilenzahl, `<img onerror>`/`</pre>` bleibt Text, U+202E/`\r`/`\u0007`/einzelnes Surrogat in Frage und Optionen maskiert, Rechte-Karte
hat genau die zwei Entscheidungen, Restzeit, `nicht_browser`-Marke. (d) `instanzPraefixDesLaufs`. (e) Quelltext: kein neuer
`setInterval` (f20 bleibt), keine neue Route (Zahl der `pfad === '/api/rueckfragen'`-Stellen und `/api/rueckfrage/`-Präfix gleich).
Rot gegen main per `git archive` (F-1127): (a) `entschieden` fehlt, (b) `rueckfrageKanal` fehlt, (c)(d) Module fehlen (dynamischer Import,
Befund statt Absturz).

### A5 Tests
`rueckfrage-vermittlung.test.mjs` (entschiedene: Reihenfolge, Grenze 20, Herkunft, nach beendeLauf leer), `rueckfrage-daten.test.mjs`,
`rueckfrage-anzeige.test.mjs`, `attention-daten.test.mjs` (Art `kanal`, Filter, Reihenfolge, viertes Argument fehlt ⇒ wie bisher),
`start-hinweis.test.mjs` bzw. neues Band. Lokal: `node --test "public/leitstand/**/*.test.mjs"` (F-1132 (10)), betroffene Gates,
check-f44-i18n, lint.

### A6 Render-Nachweis (F-622, F-1125)
`features/F45/nachweise/b2b3b2b2a2/instanz.mjs` (neutrale Umgebung als erster Import): Handler mit `rueckfrage: { an: true, url }`,
injizierte Vermittlung, offener Lauf, `globalerLaufZustand.aktiv = true`; drei Rückfragen (Bash mehrzeilig mit Tab, Bash mit
`<img>`-Text, Frage mit U+202E in Frage/Option). Klickfolge: Entscheidungen (Band + Karten), „Einmal erlauben“, eine Antwort ohne
Browser-Kopf von außen (Skript), „Zuletzt entschieden“ mit roter Marke; dunkel und 390 px. `.webp`, OCR-tauglich (Text ≥ 13 px),
Pfadprobe des Render-Helfers.

### A7 Doku
ARCHITECTURE §3 (Anzeige, `entschieden`, `rueckfrageKanal`, Grenzen), fixpaket-f45 Zeile 2b-2a-2, Nachträge F-1126 (3)-Anzeige,
F-1128 (3) Teil Anzeige, F-1132 (3).

### Wachstumsbremse
Server ±0 (zwei bestehende Zeilen geändert). `starteWorkflowSchritt(` bleibt 6×. Grenze in `wachstumsbremse-server.json` bleibt 13 445
(Ist 13 445).

## Teil B — Abnahme (Punkte 2, 3, 5)

### B1 Zählung (F-1132 (1))
- `zaehlungVon` zusätzlich `abgelaufen` (`zeitueberschreitung`, Frage mit Grund Wartegrenze), `lauf_ende` (`lauf_beendet`, Frage mit Grund
  Lauf-Ende **und** zum Lesezeitpunkt noch offene Einträge — der Controller liest nach Prozessende, vor `beendeLauf`, sie werden sicher
  abgelehnt), `automatisch` (`auto_deny`, übrige `frage_ohne_antwort`, Ablehnungen über der Protokollgrenze ohne Eintrag — Zähler am
  Lauf). Grund-Texte als Konstanten statt Literalen.
- Controller `ZAEHLUNG_FELDER` + Typ `RueckfrageZaehlung` um die drei Felder; Evaluator: Zählung auch bei FEHLGESCHLAGEN (Bedingung
  `!== 'FEHLGESCHLAGEN'` entfällt). Gateway-Abbruch ohne Klassifikation bleibt ohne Terminalmarke-Daten (unverändert).
- Bestands-Test `result-evaluator.test.ts:1293` („keine Zählung bei FEHLGESCHLAGEN“) wird umgekehrt — beabsichtigte Änderung.

### B2 Anzeige der Auswertung (Punkt 2)
- Server: `wirkungsmarkeFelder` (Checkpoint-Liste von `GET /api/laeufe/<id>`) reicht die Kanal-Felder der terminalen Marke durch
  (`rueckfrage_zaehlung`, `rueckfrage_abgleich`, `rueckfrage_abweichung`, `abgelehnt_durch_stefan`), über einen reinen Helfer; die
  Funktion selbst zieht in das Helfermodul um (bezahlt die Zeile). Ohne Kanal-Felder bitgleich.
- Lauf-Detail: Block „Rückfrage-Kanal im Lauf“ — Zählung beschriftet („enthält auch Ablehnungen, die die Auswertung nicht bestätigt hat“,
  Advisor B10), unbeantwortet getrennt; `{0,…}` ⇒ „keine Rückfrage im Lauf“; VERWEIGERT mit `rueckfrage_abgleich` ⇒ eigener Grund je
  Code (übersetzt) statt des Standardtexts; `rueckfrage_abweichung` als eigene dauerhafte Meldung („Protokoll nicht bestätigt — Fälschung
  oder Schreibfehler; Ablehnungen zählen nicht; Kontrollzustand prüfen, Lauf wiederholen“), Text escaped.
- Workflow-Seite beim F-760-Halt: dieselbe Kanal-Ursache in der Sichtungs-Notiz (Lauf-Detail des Schritts, ein Abruf beim Öffnen). Der
  Server-Grund bleibt wortgleich (sonst verschwände „Sichtung bestätigt – weiter“, F-768).
- Startfehler-Eintrag einer R3-Abweichung: eigene Einordnung statt „Startproblem“ (erkennbar am Präfix der Meldung aus `zugang`).

### B3 Regel (F-1132 (5))
- Test: in `RUECKFRAGE_REGEL` steht `frage_stefan` vor „- [x] Blockiert“ in derselben Zeile, „zuerst“ wörtlich.
- Entscheidung „Frage ungültig — nicht an Stefan gestellt“: einmal korrigiert neu fragen (kürzer, höchstens 10 Optionen); scheitert auch
  das, gilt es wie „keine Antwort“ ⇒ Blockiert-Hinweis. Neue Regelzeile; Test koppelt den Wortlaut an die Meldung des MCP-Skripts.

### B4 Gate-Erweiterung, Doku
Gate-Fälle (z) Zählung inkl. FEHLGESCHLAGEN und unbeantwortet, (w) Checkpoint-Projektion mit/ohne Kanal-Feldern, (g) Regelwortlaut;
ARCHITECTURE §4, Nachträge F-1128 (3), F-1132 (1)(5). Render-Nachweis Lauf-Detail.

## Geänderte Bestands-Gates/Tests (erwartet)
- Teil A: keines (Gate f21-ws2 verlangt die bestehenden Abschnitte, die bleiben). Falls check-f20/f42 die `sendeJson`-Zeile von
  `/api/zustand` wörtlich pinnen: Zeile nur ergänzt, keine Bedingung entfällt.
- Teil B: `result-evaluator.test.ts:1293` (s. B1); Unit-Tests mit vollständiger Zählung (`execution-controller.test.ts:1764`) um die
  neuen Felder.

## Risiken
- Zuschnitt: A und B zusammen sind mehr als ein Baudurchgang plus eine Korrekturrunde (A: Vermittlung, zwei Server-Zeilen, drei neue
  Oberflächen-Module, attention-View/-Daten, Band, i18n ×4, Gate, Render-Instanz; B: Vermittlung/Controller/Evaluator/Typen, Server-Helfer,
  Lauf-Detail, Workflow-Seite, Regel). Empfehlung: Schnitt A | B.
- Herkunft: der Browser sendet `Sec-Fetch-Site: same-origin` — über den Dispatcher (Präfix `/api/projekte/<id>`) im Render-Nachweis real
  belegen.
- Kanal-Zahl nicht am Navigationspunkt: Stefan sieht eine wartende Rückfrage nur über das Band und die Seite. Alternative: Zahl aus dem
  Kanal-Abruf zusätzlich an `zaehleOffeneEntscheidungen` — Advisor bitte abwägen.
- Antwortknöpfe in „Deine Entscheidungen“ brechen die Regel „keine Schreibaktion, jeder Knopf ist ein Link“ der View (Kopf
  views/attention.js) — bewusste, auf die Kanal-Gruppe begrenzte Ausnahme (die Rückfrage wartet mit Frist, ein Umweg kostet Zeit).
- Poll-Last: ein zusätzlicher GET je Tick nur bei Kanal an und aktivem Lauf.

## Status
- [ ] Freigegeben

## Nächster sinnvoller Schritt
Advisor-Pass (frischer Kontext) auf diesen Plan.
