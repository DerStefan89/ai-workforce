# Journal — F40

Anhängeprotokoll. Neue Einträge unten anfügen, bestehende nicht ändern.

## 2026-09-21 — WS-0 Spike (#203)

Messfrage: lohnt sich Streaming für Jarvis-Chat, und wo gehen die
Werkzeug-Runden tatsächlich hin? Real gemessen gegen 15 Mehrrunden-Läufe
plus gezielte Spike-Läufe (TTFT, Format-Kompatibilität, Abbruch mitten im
Stream). Ergebnis: `--output-format stream-json --verbose` + Reaktion auf
die `result`-Zeile bringt 590–730 ms je Lauf, Token-Streaming lohnt sich
nicht. Größerer Hebel: `docs/STATUS.md` war in 11 von 15 Läufen der erste
Zugriff, `state/findings.md` (592 KB) wurde in 4 von 15 Läufen mehrfach
gegrept. Empfehlung: kompakter STATUS-Auszug + vorberechnete Liste offener
P1-Findings als vierte Context-Builder-Einspeisung.
`state/spike-f40-streaming.md`.

## 2026-09-21 — WS-1 gebaut (#204, F-570)

Umgesetzt: `stream-json --verbose` statt `json`; früher Erfolgspfad bei der
ersten vollständigen `result`-Zeile (`darfFruehAufloesen`,
Nachlauffrist 5 s); Werkzeug-Fortschritt live über den bestehenden
500-ms-Poll. Korrekturrunde nach Code-Review/QA-Pass: F-570-Sperre als
reine, testbare Funktion, Nachlauffrist-Rot-Fall, Laufansicht zeigt
„— (bei der Ergebniszeile vor Prozessende aufgelöst)" statt „unbekannt".
Real gemessen: 561–610 ms Gewinn je Lauf, 5 von 5 echten Turns.
`state/nachweis-jarvis-latenz.md` Abschnitt "F40 WS-1".

## 2026-09-21 — WS-2 gebaut, Lagebild als vierte Einspeisung

`scripts/erzeuge-lagebild.mjs` (neu) baut `docs/projekt/kontext/
lagebild.md` deterministisch aus `docs/STATUS.md` (Abschnitt "Aktuelle
Phase", wörtlich) und `state/findings.md` (alle offenen P1-Findings, ID +
Titel, sortiert). `--check`-Modus erkennt Drift (Exit 1). `scripts/
check-f40-lagebild.mjs` (neu, in `npm run check`) prüft Grün-Fall gegen
die reale Datei, zwei Rot-Fälle (reine Funktionsebene und echte CLI gegen
Wegwerf-Pfade) und die Parser-Grenze (P0/„gelöst" ausgeschlossen). Rot-Fall
zusätzlich real gegen die tatsächliche committete Datei reproduziert
(Zeile angehängt → Gate real Exit 1 → wiederhergestellt → Exit 0).

`baueProjektkontextAnfragen` (`scripts/leitstand-server.mjs`) bekommt eine
vierte, `notwendig: true`-Anfrage auf `${kontextPfad}/lagebild.md`, für
`jarvis` und `router`, über die bestehende `filtereExistierendeAnfragen`
gefiltert (F33-Muster, kein zweiter Einspeisungsweg). `scripts/
check-f33-projektkontext.mjs` Abschnitt (e) auf vier statt drei erwartete
Elemente angepasst — der einzige bestehende Check, der die Anzahl der
Anfragen fest annahm.

`docs/STATUS.md` vor der Lagebild-Erzeugung korrigiert (Schritt 3 des
Auftrags): F32 stand als `ABGESCHLOSSEN`, `features/F32/feature.md` sagt
real `IN_ARBEIT` (WS-2 UI-Ansicht offen, PR #200 deckte nur WS-1) — STATUS
war falsch, zugunsten der Feature-Akte korrigiert (zwei Stellen: "Aktuelle
Phase"-Absatz und die F32-Zeile unter "Offene Punkte"). F40 fehlte in
STATUS.md komplett, ergänzt. F30 ("noch nicht begonnen") war bereits
korrekt — keine Akte, keine Commits; die einzigen Treffer für "f30-ws1" im
Git-Log (`#192`) sind eine Commit-Message-Verwechslung mit F31 WS-1 (siehe
`features/F31/feature.md` Zeile 30: dieselbe PR #192 dort korrekt als F31
WS-1 geführt), keine reale F30-Arbeit.

Realer Nachweis (AK8, 5 echte Jarvis-Chat-Turns gegen den lokalen
Leitstand, `LEITSTAND_ZEITMESSUNG=1 LEITSTAND_PORT=4180`): 0 von 5 Läufen
riefen `docs/STATUS.md` oder `state/findings.md` als Werkzeug auf (geprüft
direkt am Rohstrom `tool_use`, nicht nur an der Antwort) — gegenüber 11/15
bzw. 4/15 im WS-0-Spike. Alle fünf Antworten inhaltlich korrekt, inkl.
korrekt referenziertem F32-Fix in der Phasenstand-Antwort. Ein Lauf
(„Ist F32 schon abgeschlossen?") griff zusätzlich gezielt auf
`features/F32/feature.md` zu (erwartet, Lagebild trägt nur die
Kurzfassung) und real reproduzierbar auch auf `~/.claude/projects/…/
memory/MEMORY.md` — derselbe im WS-0-Spike bereits gefundene Nebenbefund
(F-567), außerhalb des Scopes dieses Auftrags, nicht behoben.
`state/nachweis-jarvis-latenz.md` Abschnitt "F40 WS-2".

`npm run check`: siehe Bericht dieses Auftrags für das Gesamtergebnis der
vollen Kette.

Bewusst nicht in WS-2: Token-Streaming (bereits in WS-0 verworfen),
`MEMORY.md`-Zugriff unterbinden (F-567), Findings-Nachtrag F-505–F-578
(F-534), automatische Lagebild-Erzeugung per Pre-Commit-Hook.
