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

## 2026-09-21 — WS-3 gebaut, Auto-Memory-Zugriff für jarvis/router gesperrt (F-567)

Ursache geklärt (`claude --help`, WebFetch gegen `code.claude.com/docs/en/
headless` §"Start faster with bare mode"): "auto memory" ist kein
Settings-Wert, sondern ein eigener CLI-Systemprompt-Baustein — `--setting-
sources` steuert ausschließlich, welche Settings-DATEIEN geladen werden,
nicht diesen Baustein. Einziger offizieller Abschaltweg ist `--bare`
("skips auto-discovery of hooks, skills, custom commands, subagents,
plugins, MCP servers, auto memory, and CLAUDE.md" — von Anthropic sogar als
künftiger Default für `-p` angekündigt). `--bare` ist in diesem Repo aber
für JEDEN Aufruf per E-182 verboten
(`src/invocation-policy/verbotene-aufrufparameter.ts`,
`VERBOTENE_AUFRUFPARAMETER`) — eine bestehende, bewusste Policy-Entscheidung,
nicht Teil dieses Auftrags. `--bare` schaltet außerdem mehr ab als nur
Auto-Memory (Hooks, CLAUDE.md, Attribution) und hätte für `router`
(`--setting-sources` default `project`) real die projektweiten Hooks aus
`.claude/settings.json` deaktiviert — kein gezielter Fix. Deshalb der in
der Aufgabenstellung vorgesehene Fallback: `--disallowedTools
'Read(~/.claude/**)'` (Permission-Rule-Syntax, `code.claude.com/docs/en/
permissions#read-and-edit`: Deny-Regeln für `Read` gelten laut Doku auch
für Grep/Glob).

Umgesetzt: `AufrufEingaben.disallowedTools` (neu, Muster settingSources/
mcpConfig/umgebungsvariablen) — `baueAufruf` hängt `--disallowedTools
<wert>` additiv an, wenn gesetzt. Gesetzt auf `'Read(~/.claude/**)'`
ausschließlich für `jarvis` (`starteJarvisChatLauf`) und `router` (POST
`/api/auftraege/<id>/routen`) in `scripts/leitstand-server.mjs` — Rolle
`ausfuehrung` unverändert. `pruefeStartauftrag` lehnt
`aufrufEingaben.disallowedTools` im Body von `POST /api/laeufe` für jede
Rolle ab (Muster der drei bestehenden Rotfälle).

Tests/Gates: `execution-controller.test.ts` (zwei neue Fälle: ohne Feld
kein `--disallowedTools`, mit Feld landet der Wert unverändert in den
Tokens; bestehender Codex-Test um `disallowedTools` ergänzt — Codex-Zweig
trägt es nicht ins Argv, Muster settingSources/mcpConfig).
`check-f11-auftrag.mjs` AK5 um den Rotfall ergänzt. `check-f31-gedaechtnis.mjs`
(a) um dieselbe Erwartung am echten `POST /api/chat`-Pfad ergänzt. Red-Case
real gezeigt: alle drei erweiterten Prüfungen kopiert in einen `git
worktree` auf `main` (974757c) — schlagen dort real fehl (`check-f11-
auftrag.mjs`/`check-f31-gedaechtnis.mjs` Exit 1, der neue `node:test`-Fall
`AssertionError`), auf diesem Branch alle grün.

Realer Nachweis: (1) isolierte Kausalprobe direkt gegen `claude.exe`
(dieselben Tokens wie `baueAufruf`, `-p` mit derselben Aufforderung, den
echten `MEMORY.md`-Pfad zu lesen) — OHNE `--disallowedTools` liest der
Prozess real `~/.claude/projects/…/memory/MEMORY.md` und gibt dessen
Inhalt zurück; MIT `--disallowedTools 'Read(~/.claude/**)'` antwortet
derselbe Aufruf `DENIED`. (2) Dieselben 5 Statusfragen wie im WS-2-Nachweis
erneut gegen den echten Leitstand gestellt (`LEITSTAND_PORT=4181`): 0 von 5
Läufen griffen auf `~/.claude/**` zu (WS-2: 1 von 5, Turn "Ist F32 schon
abgeschlossen?" hatte real `MEMORY.md` gelesen) — derselbe Turn liest jetzt
in 1 Turn ohne jeden Werkzeugaufruf. (3) Ein realer `router`-Lauf (echter
Testauftrag geroutet) griff auf ein Projektdateiziel zu (Read
`check-f31-gedaechtnis.mjs`, weiterhin funktionsfähig — die Deny-Regel ist
korrekt auf `~/.claude/**` begrenzt), 0 Zugriffe auf `~/.claude/**`.
`state/nachweis-jarvis-latenz.md` Abschnitt "F40 WS-3".

`npm run check`: Exit 0, 620/620 Tests grün, keine neuen Befunde.

Reviewer-/QA-Pass (frischer Kontext, Muster CLAUDE.md): code-reviewer
"Freigegeben mit Hinweisen" (ein Verbesserungsvorschlag: den doppelt
literalen Wert `'Read(~/.claude/**)'` in `scripts/leitstand-server.mjs`
in eine gemeinsame Konstante ziehen — umgesetzt, `AUTO_MEMORY_DENY_REGEL`).
QA "Freigegeben mit Hinweisen", ein echter Befund (mittel): `check-f31-
gedaechtnis.mjs` (a) deckte nur den Jarvis-Chat-Pfad ab, kein Äquivalent
für den Router-Pfad — eine künftige versehentliche Entfernung von
`disallowedTools` am Router-Lauf-Handler wäre von `npm run check`
unentdeckt geblieben. Korrigiert: neuer Abschnitt (k) prüft dieselbe
Erwartung real am echten `POST /api/auftraege/<id>/routen`-Pfad (Muster
`check-f22-click-to-work.mjs` (b): echter Auftrag registriert, echt
geroutet, `fuehreAufgabeDurchFn`-Stub erfasst die tatsächlich übergebenen
`aufrufEingaben`). Red-Case dafür ebenfalls real gegen `main` gezeigt
(zweiter `git worktree`, Exit 1 vor dem Fix). Zwei niedrigwertige
Dokumentationsbefunde (Randfälle der Deny-Regel, unvollständige
Token-Auflistung in der Kausalprobe) in `features/F40/feature.md`
"Bekannte Grenzen" bzw. `state/nachweis-jarvis-latenz.md` nachgetragen.
`npm run check` nach der Korrekturrunde erneut Exit 0, 620/620 (ein
einmaliger `EPERM`-Fehlschlag beim Verzeichnis-Aufräumen eines
Test-Verzeichnisses — bekannte Falle laut `CLAUDE.md`, im Retry grün).

Bewusst nicht in WS-3: `--bare` (siehe oben, E-182-Policy), eine
allgemeine Sperre für jede Rolle (nur jarvis/router betroffen laut
Auftrag — `ausfuehrung` braucht Zugriff auf ihre eigene Arbeitsumgebung
unverändert), ein automatisierter Vorher/Nachher-A/B-Vergleich (die 5
Statusfragen sind derselbe Fragensatz wie WS-2, aber kein kontrollierter
Doppellauf gegen denselben Zustand).

## 2026-09-21 — F40 formal abgeschlossen (Doku-only), Status bleibt FEATURE_GATE

Alle vier Workstreams gebaut und gemergt: WS-0 Spike #203, WS-1
Streaming-Reaktion #204, WS-2 Lagebild-Einspeisung #206, WS-3
Auto-Memory-Sperre #207. Alle Hebel der Spike-Empfehlung
(`state/spike-f40-streaming.md` §5) sind damit umgesetzt; Token-Streaming
bleibt bewusst Nicht-Ziel (Spike-Befund: Gewinn < 0,1 s bei typischen
kurzen Antworten, Aufwand/Risiko unverhältnismäßig).

Status-Übergang geprüft gegen `docs/projekt/zielfassung.md` §Workstream
(`TECH_PLAN → ADVISOR → HANDOFF → PRE_BUILD_HALT → BAU → PRÜFUNG → ABNAHME
→ ABGESCHLOSSEN`, `ABNAHME` ist Aktivität, `ABGESCHLOSSEN` terminal) und
gegen den realen Präzedenzfall in diesem Repo: F19/F21/F22/F23/F25 bleiben
trotz vollständig erfüllter Akzeptanzkriterien alle bei `FEATURE_GATE`
stehen — F21 sogar mit dokumentiertem `AK8: ACCEPT, 14.09.2026 (Stefan,
Realtest)` für WS-1, aber weiterhin `FEATURE_GATE`, weil WS-2 noch offen
ist. Für F40 liegt weder eine solche dokumentierte Abnahme noch ein
eigener Feature-Review-Pass vor — Status bleibt deshalb bewusst bei
`FEATURE_GATE`, NICHT `ABGESCHLOSSEN`, wie in der Aufgabenstellung als
Fallback vorgesehen.

`features/F40/feature.md`: Status `IN_ARBEIT` → `FEATURE_GATE`; WS-3 mit
PR #207 nachgetragen; neuer Abschnitt "Offene Reste" mit F-581 (Lagebild
nur durch Gate erzwungen, nicht automatisch erzeugt — bereits als
"Bekannte Grenze" benannt, F-581 ist der noch nicht nachgetragene
Findings-Registereintrag dafür) und F-583 (ungeklärt: lädt Auto-Memory
`MEMORY.md` in manchen CLI-Versionen ohne Read-Werkzeugaufruf direkt in
den Systemprompt — in den WS-3-Nachweisläufen nicht beobachtet, aber nicht
systematisch ausgeschlossen); "Feature Review"-Abschnitt aktualisiert (nicht
mehr "noch nicht fällig" — alle Workstreams sind fertig, ein eigener
Feature-Review-Pass und Stefans Abnahme stehen aber noch aus).

`docs/STATUS.md`: F40 in "Aktuelle Phase" und in der M4-Liste auf
`FEATURE_GATE` mit allen vier PR-Nummern aktualisiert; Icon in der
M4-Liste auf ✅ gesetzt (Muster F19/F22/F23/F25: ✅ markiert dort
"Build vollständig", nicht "Status ABGESCHLOSSEN" — ⏳ ist ausschließlich
Features mit noch offenen Workstreams vorbehalten, z. B. F32/F33; F40 hat
keine offenen Workstreams mehr).

`node scripts/erzeuge-lagebild.mjs` erneut gelaufen (STATUS.md geändert),
`npm run check`: siehe Bericht dieses Auftrags für das Gesamtergebnis.

Nicht Teil dieses Abschluss-Auftrags: der eigentliche Feature-Review-Pass,
Stefans Abnahme, der Nachtrag von F-581/F-583 in `state/findings.md` selbst
(nur referenziert, nicht neu registriert — das bleibt eigene
Aufräumarbeit, F-534-Muster).

## 2026-09-22 — Stefans Abnahme, Status FEATURE_GATE → ABGESCHLOSSEN

Stefan hat F40 am 22.09.2026 abgenommen. `features/F40/feature.md`: Status
`FEATURE_GATE` → `ABGESCHLOSSEN`, mit Satz "Abgenommen durch Stefan am
22.09.2026." und Verweis auf die weiterhin offenen Restfindings F-581
(Lagebild nur durch das Gate erzwungen, nicht automatisch erzeugt) und
F-583 (ungeklärt, ob Auto-Memory `MEMORY.md` ohne Read-Werkzeugaufruf
direkt in den Systemprompt lädt); "Feature Review"-Abschnitt entsprechend
aktualisiert. `docs/STATUS.md`: F40 in "Aktuelle Phase" und in der
Meilenstein-5-Liste ebenfalls auf `ABGESCHLOSSEN`, Hinweis "Feature-Review-
Pass und Abnahme stehen noch aus" entfernt, dieselben Restfindings genannt.
`node scripts/erzeuge-lagebild.mjs` erneut gelaufen (STATUS.md geändert).
`npm run check`: siehe Bericht dieses Auftrags für das Gesamtergebnis.

Nicht Teil dieses Auftrags: Nachtrag von F-581/F-583 in `state/findings.md`
selbst (weiterhin nur referenziert, F-534-Muster).
