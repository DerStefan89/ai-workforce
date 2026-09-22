# F40 — Jarvis-Latenz: Streaming + Lagebild

## ID
F40

## Titel
Jarvis-Latenz: Streaming + Lagebild

## Status
Status: ABGESCHLOSSEN

Abgenommen durch Stefan am 22.09.2026. Offene Restfindings: F-581 (Lagebild
wird nur durch das Gate erzwungen, nicht automatisch erzeugt), F-583
(ungeklärt, ob Auto-Memory `MEMORY.md` in manchen CLI-Versionen ohne
Read-Werkzeugaufruf direkt in den Systemprompt lädt) — siehe "Offene Reste"
unten.

Gültige Status-Werte (geprüft vom Gate): ENTWURF, READY_FOR_TECH, WORKSTREAM_SCHNITT_GENEHMIGT, IN_ARBEIT, FEATURE_GATE, ABGESCHLOSSEN, BLOCKIERT, ABGEBROCHEN.

## Ziel
Jarvis-Chat-Antworten auf Statusfragen fühlen sich schneller an — durch echtes
Streaming-Verhalten (auf die `result`-Zeile reagieren statt auf das
Prozessende, Werkzeug-Fortschritt live anzeigen) und durch weniger
Werkzeug-Runden (ein vorberechnetes Lagebild statt wiederholter
`docs/STATUS.md`-Reads und `state/findings.md`-Greps). Grundlage:
`state/spike-f40-streaming.md` (WS-0-Messung).

## Nicht-Ziele
- Token-für-Token-Streaming der Antwort (Spike-Empfehlung §5: Gewinn bei
  typischen kurzen Antworten < 0,1 s, erzwingt Teil-JSON-Parsing — Aufwand
  und Risiko stehen in keinem Verhältnis).
- ~~`~/.claude/projects/…/memory/MEMORY.md`-Zugriff durch Jarvis
  unterbinden~~ — war bis WS-2 Nicht-Ziel dieses Features (eigenständiger,
  im Spike gefundener Nebenbefund, F-567), ist seit WS-3 umgesetzt (siehe
  Workstream unten) — bewusste Aufnahme in den Scope, kein stillschweigend
  überschriebenes Nicht-Ziel.
- Nachtrag der Findings-IDs F-505–F-578 in `state/findings.md` (F-534) —
  unabhängige Aufräumarbeit am Register selbst.
- Automatische Neu-Erzeugung des Lagebilds bei jedem Commit (kein
  Pre-Commit-Hook, kein CI-Schritt) — `npm run check` erkennt Drift beim
  nächsten vollen Lauf, das genügt für Fassung 1.
- UI-Anzeige des Lagebild-Inhalts im Leitstand — reiner Prompt-Kontext für
  `jarvis`/`router`, keine neue Ansicht.

## Workstreams
- **WS-0 — Spike (wegwerfbar, #203).** Messfrage: wie viel bringt
  Streaming real, und was kostet Jarvis tatsächlich Werkzeug-Runden?
  Ergebnis (`state/spike-f40-streaming.md`): `stream-json --verbose` +
  Reaktion auf die `result`-Zeile bringt 590–730 ms je Lauf bei 100 %
  Format-Kompatibilität; Token-Streaming lohnt sich nicht; der größere
  Hebel ist weniger Werkzeug-Runden — `docs/STATUS.md` war in 11 von 15
  Mehrrunden-Läufen der erste Zugriff, `state/findings.md` wurde in 4 von
  15 Läufen mehrfach gegrept.
- **WS-1 — Streaming-Reaktion + Werkzeug-Fortschritt (#204, F-570).**
  `baueAufruf`: `--output-format stream-json --verbose` statt `json`.
  `prozessstart.ts` löst bei der ersten vollständigen `result`-Zeile sofort
  auf (`darfFruehAufloesen`, Nachlauffrist 5 s, Prozessbaum-Kill danach).
  `tool_use`-Zeilen werden live als Fortschritt über den bestehenden
  500-ms-Poll angezeigt (`GET /api/laeufe/<laufId>` Feld `fortschritt`).
  Gemessener Gewinn: 561–610 ms je Lauf, 5 von 5 echten Turns
  (`state/nachweis-jarvis-latenz.md` Abschnitt "F40 WS-1").
- **WS-2 — Lagebild als vierte Context-Builder-Einspeisung (dieser
  Auftrag).** `scripts/erzeuge-lagebild.mjs` baut
  `docs/projekt/kontext/lagebild.md` deterministisch aus `docs/STATUS.md`
  (Abschnitt "Aktuelle Phase", wörtlich) und `state/findings.md` (alle
  offenen P1-Findings, ID + Titel). `baueProjektkontextAnfragen`
  (`scripts/leitstand-server.mjs`) bekommt dafür eine vierte,
  `notwendig: true`-Anfrage, für `jarvis` UND `router`, über die
  bestehende `filtereExistierendeAnfragen` gefiltert (F33-Muster). Gate
  `scripts/check-f40-lagebild.mjs` (Drift-Erkennung, real kalibriert) in
  `npm run check`.
- **WS-3 — Auto-Memory-Zugriff für `jarvis`/`router` unterbunden (löst
  F-567, #207).** Ursache: "Auto Memory" ist kein
  `--setting-sources`-Wert, sondern ein eigener CLI-Systemprompt-Baustein
  (real belegt: `claude --help`, `code.claude.com/docs/en/headless`
  §"bare mode"). Einziger offizieller Abschaltweg ist `--bare`, das dieses
  Repo per E-182 für jeden Aufruf verbietet
  (`VERBOTENE_AUFRUFPARAMETER`) und ohnehin mehr abschaltet als nur
  Auto-Memory (Hooks, CLAUDE.md, Attribution). Fallback:
  `AufrufEingaben.disallowedTools` (neu, Muster settingSources/mcpConfig)
  — `baueAufruf` hängt `--disallowedTools <wert>` additiv an;
  `scripts/leitstand-server.mjs` setzt `'Read(~/.claude/**)'`
  ausschließlich für `jarvis` und `router` (Rolle `ausfuehrung`
  unverändert). `pruefeStartauftrag` lehnt das Feld im Body von
  `POST /api/laeufe` für jede Rolle ab.

## Akzeptanzkriterien
- AK1 (WS-0): reale Spike-Messung mit `stream-json --verbose`,
  TTFT-Vergleich, Format-Kompatibilitätsprüfung, Werkzeug-Rundenanalyse
  über 15 reale Mehrrunden-Jarvis-Läufe, Abbruch-mitten-im-Stream-Test —
  `state/spike-f40-streaming.md`.
- AK2 (WS-1): `starteProzess` löst bei der ersten vollständigen
  `type:"result"`-Zeile auf (kein Fragment, keine Abbruch-/Timeout-/
  maxBuffer-Situation), sonst entscheidet unverändert die
  close-Klassifikation — real getestet (Rot-Fälle: früher Erfolgspfad
  abgeschaltet, Zeilen-Parse ohne try, alter `leseErgebnisobjekt` gegen
  NDJSON).
- AK3 (WS-1): Werkzeug-Fortschritt live über `GET /api/laeufe/<laufId>`
  (`fortschritt`), kein neuer Checkpoint-Typ (In-Memory, D4).
- AK4 (WS-1, real, 21.09.2026): 5 echte Jarvis-Chat-Turns messen
  561–610 ms Gewinn je Lauf (Start→`result` vs. Start→Prozessende,
  derselbe Lauf) — `state/nachweis-jarvis-latenz.md`.
- AK5 (WS-2): `scripts/erzeuge-lagebild.mjs` erzeugt
  `docs/projekt/kontext/lagebild.md` deterministisch (kein Zeitstempel)
  aus dem wörtlichen `## Aktuelle Phase`-Abschnitt von `docs/STATUS.md`
  und allen `**F-NNN** · \`TYP\` · P1 · offen`-Köpfen aus
  `state/findings.md` (ID + `Titel:`-Zeile, sortiert).
- AK6 (WS-2): `baueProjektkontextAnfragen` liefert für `jarvis` UND
  `router` eine vierte, `notwendig: true`-Anfrage auf
  `${kontextPfad}/lagebild.md` — `scripts/check-f33-projektkontext.mjs`
  Abschnitt (e) geprüft für alle vier Elemente (angepasst, vormals drei).
- AK7 (WS-2): `scripts/check-f40-lagebild.mjs` prüft real: Grün-Fall (die
  committete Datei entspricht dem aus den realen Quellen erzeugten
  Inhalt), Rot-Fall real gegen die tatsächliche Datei reproduziert
  (Zeile angehängt → Exit 1 → wiederhergestellt → Exit 0), Rot-Fall über
  die echte CLI (`--check` gegen eine abweichende Wegwerf-Ausgabedatei),
  und die Parser-Grenze (P0/„gelöst" werden korrekt ausgeschlossen, ein
  Textanhang nach „offen" korrekt eingeschlossen). In `npm run check`
  eingehängt.
- AK8 (WS-2, real, 21.09.2026): 5 echte Jarvis-Chat-Turns (Statusfragen)
  gegen den lokalen Leitstand riefen `docs/STATUS.md` bzw.
  `state/findings.md` **0 von 5 Mal** als Werkzeug auf (geprüft direkt am
  Rohstrom, nicht nur an der Chat-Antwort) — gegenüber 11/15 bzw. 4/15 im
  WS-0-Spike. Alle fünf Antworten inhaltlich korrekt gegen den echten
  Projektstand gegengeprüft. `state/nachweis-jarvis-latenz.md` Abschnitt
  "F40 WS-2".
- AK9 (WS-2): `docs/STATUS.md` vor der Lagebild-Erzeugung korrigiert — der
  reale Widerspruch F32 `ABGESCHLOSSEN` (STATUS) vs. `IN_ARBEIT`
  (`features/F32/feature.md`) war zugunsten der Feature-Akte falsch und
  wurde behoben (STATUS.md ist Kurzfassung, Feature-Akte ist Sollquelle je
  Feature). F30 („noch nicht begonnen") war bereits korrekt — keine Akte,
  keine Commits.
- AK10 (WS-3, löst F-567): `baueAufruf` hängt `--disallowedTools <wert>`
  additiv an, wenn `AufrufEingaben.disallowedTools` gesetzt ist — real
  getestet (mit/ohne Feld, plus der bestehende Codex-Test um
  `disallowedTools` ergänzt, das Feld erreicht den Codex-Zweig nicht).
  `scripts/leitstand-server.mjs` setzt `'Read(~/.claude/**)'`
  ausschließlich für `jarvis`/`router`; `pruefeStartauftrag` lehnt das Feld
  im Body von `POST /api/laeufe` ab. Real belegt in zwei Schritten: (1)
  eine isolierte Kausalprobe direkt gegen `claude.exe` (dieselben Tokens
  wie `baueAufruf`) zeigt, dass derselbe Aufruf OHNE `--disallowedTools`
  real `~/.claude/projects/…/memory/MEMORY.md` liest und dessen Inhalt
  zurückgibt, MIT `--disallowedTools 'Read(~/.claude/**)'` dagegen `DENIED`
  antwortet; (2) dieselben 5 Statusfragen wie im WS-2-Nachweis erneut
  gegen den echten Leitstand gestellt: 0 von 5 Läufen griffen auf
  `~/.claude/**` zu (WS-2: 1 von 5), ein realer `router`-Lauf griff
  weiterhin korrekt auf Projektdateien zu (Deny-Regel nicht zu breit).
  `state/nachweis-jarvis-latenz.md` Abschnitt "F40 WS-3".
- AK11 (WS-3): Red-Case real gezeigt — die drei erweiterten Prüfungen
  (`check-f11-auftrag.mjs`, `check-f31-gedaechtnis.mjs`,
  `execution-controller.test.ts`) schlagen gegen `main` (974757c, vor
  diesem Fix, per `git worktree`) real fehl; auf diesem Branch alle grün.

## Dependencies
- F5 (Context Builder) — `baueKontextpaket`, dessen Budget-/Ausschlusslogik
  WS-2 unverändert wiederverwendet.
- F6a (Claude-Code-Gateway) — `starteProzess`/`starteGateway`, die WS-1 um
  die frühe Auflösung bei der `result`-Zeile ergänzt.
- F26 (Jarvis Chat v1) — der Aufrufer, dessen Werkzeug-Runden WS-2 senkt.
- F31 (Jarvis-Chat-Erfahrung) — `--setting-sources ''` für `jarvis`
  (Grundlage der WS-0-Messfrage, warum Projektkontext überhaupt aktiv
  eingespeist werden muss statt aus `CLAUDE.md` zu kommen).
- F32 (Verbrauch & Kontingent) — `verbrauch.turns`/`verbrauch.dauer_ms` in
  der Laufakte, über die WS-2s Nachweis (AK8) gemessen ist.
- F33 WS-1 (Projektkontext & Roadmap) — `baueProjektkontextAnfragen`,
  `filtereExistierendeAnfragen`, `scripts/check-f33-projektkontext.mjs`,
  die WS-2 additiv erweitert (kein zweiter Einspeisungsweg, D5).

## Bekannte Grenzen
- **Lagebild wird nicht automatisch bei jedem `docs/STATUS.md`-Commit neu
  erzeugt (WS-2, bewusst, Nicht-Ziel):** `npm run check` erkennt Drift erst
  beim nächsten vollen Lauf über `scripts/check-f40-lagebild.mjs`, nicht
  sofort beim Ändern der Quelle. Wer `docs/STATUS.md` ändert, muss selbst
  an `node scripts/erzeuge-lagebild.mjs` denken.
- **Mehrzeilige `Titel:`-Texte werden abgeschnitten (WS-2, bewusst):**
  `leseOffeneP1Findings` liest bewusst nur die `Titel:`-Zeile selbst, keine
  Fortsetzungszeile, sonst bräuchte der Parser eine zweite, fragile
  Grenze. Real relevanter als zunächst angenommen (QA-Pass-Befund): in der
  committeten `lagebild.md` sind 11 von 37 Titeln (nicht nur "ein paar")
  mitten im Satz abgeschnitten, z. B. F-051, F-183, F-273, F-280–F-283,
  F-299/F-300, F-308, F-326, F-426. Im Lagebild erscheinen diese Titel
  abgeschnitten, aber nicht falsch — bei Bedarf hilft der ID-Verweis zum
  vollständigen Eintrag in `state/findings.md`.
- **Wachstumsrisiko bei `notwendig: true` (WS-2, QA-Pass-Befund, nicht
  behoben):** die Lagebild-Anfrage ist wie die drei bestehenden
  F33-Anfragen `notwendig: true` — `baueKontextpaket` (F5) lehnt das
  GESAMTE Paket mit `EVIDENZLUECKE` ab, wenn eine notwendige Anfrage nicht
  ins Budget passt, statt sie nur wegzulassen (`src/context-builder/
  index.ts`). Solange `state/findings.md` weiter wächst, wächst auch die
  P1-Liste im Lagebild mit — wird sie irgendwann zusammen mit den übrigen
  drei Elementen zu groß für `standardBudget`, blockiert das `jarvis`/
  `router` komplett statt nur das Lagebild wegzulassen. Aktuell nicht
  ausgelöst (real gegen das reale `standardBudget` geprüft, AK6), aber
  unbeobachtet — kein automatischer Alarm, wenn die Marge kleiner wird.
- **Kein A/B-Vergleich gegen denselben Fragensatz ohne Lagebild (WS-2,
  AK8):** der Nachweis zeigt „0 von 5 Werkzeugaufrufe gegen die beiden
  Zieldateien", keine direkte Zeitersparnis-Zahl gegen einen identischen
  Lauf ohne Lagebild (hätte einen zweiten Branch-Checkout gebraucht).
- **`--bare` bleibt weiterhin für jeden Aufruf verboten (WS-3, bewusst,
  E-182):** WS-3 löst F-567 gezielt über `--disallowedTools`, nicht über
  den offiziell empfohlenen, aber bereits vor diesem Feature per Policy
  verbotenen `--bare`-Weg — eine künftige Änderung an der E-182-Liste
  bleibt außerhalb des Scopes dieses Features.
- **Kein automatisierter A/B-Vergleich für WS-3 (Muster WS-2 AK8):** die 5
  Statusfragen sind derselbe Fragensatz wie im WS-2-Nachweis, aber kein
  kontrollierter Doppellauf gegen denselben Zustand — der Rückgang von 1/5
  auf 0/5 `~/.claude`-Zugriffen ist ein starkes Indiz, kein statistischer
  Beweis (kleine Stichprobe, Modellverhalten variiert von Lauf zu Lauf).
  Die isolierte Kausalprobe (AK10) belegt den Mechanismus dagegen
  deterministisch, unabhängig von Modell-Variation.
- **Zwei ungetestete Randfälle der `Read(~/.claude/**)`-Regel (WS-3,
  QA-Pass-Befund, für dieses Repo aktuell irrelevant):** (1) läge ein
  Projekt-Arbeitsverzeichnis selbst unterhalb von `~/.claude/…` (in diesem
  Repo nicht der Fall, `C:\Users\stefa\Projekte\ai-workforce` liegt
  außerhalb `~/.claude`), würde die Regel auch legitime Projekt-Reads
  blockieren; (2) ein Symlink innerhalb des Repos, der real auf eine Datei
  unter `~/.claude/` zeigt, würde je nach Symlink-Auflösung der
  CLI-Permission-Engine ebenfalls blockiert (laut Doku gilt eine
  Deny-Regel für Symlink-Ziel UND -Pfad) — kein Symlink dieser Art existiert
  aktuell in diesem Repo, nicht real getestet.
- **Findings-Register-Nachtrag F-505–F-578 bleibt offen (F-534, bewusst
  Nicht-Ziel):** das Lagebild liest `state/findings.md` unverändert so, wie
  es vorliegt — ein Nachtrag-Rückstand dort wirkt unverändert auf das
  Lagebild durch.
- **UI/Projektion für F32/F33 WS-2 bleiben unabhängig offen** — F40 WS-2
  ändert daran nichts, nur die STATUS.md-Textdarstellung wurde korrigiert.

## Offene Reste (Abschluss-Auftrag, Doku-only)
- **F-581 — Lagebild wird nur durch das Gate erzwungen, nicht automatisch
  erzeugt:** `scripts/check-f40-lagebild.mjs` erkennt Drift zwischen
  `docs/projekt/kontext/lagebild.md` und seinen Quellen erst beim nächsten
  `npm run check`-Lauf (bereits als "Bekannte Grenze" oben benannt, WS-2,
  bewusstes Nicht-Ziel) — F-581 ist der Findings-Registereintrag dafür,
  noch nicht in `state/findings.md` nachgetragen (Nachtrag ist eigene
  Aufräumarbeit, F-534-Muster, kein Bestandteil dieses Abschluss-Auftrags).
- **F-583 — zu prüfen: lädt Auto-Memory den `MEMORY.md`-Inhalt ohne
  Read-Werkzeugaufruf direkt in den Systemprompt?** WS-3s Nachweis
  (`state/nachweis-jarvis-latenz.md` Abschnitt "F40 WS-3") belegt, dass
  `--disallowedTools 'Read(~/.claude/**)'` einen expliziten `Read`-Aufruf
  auf `MEMORY.md` zuverlässig blockiert. Ungeklärt: ob Auto-Memory den
  Dateiinhalt in manchen CLI-Versionen zusätzlich OHNE Werkzeugaufruf
  (direkt in den System-Prompt eingebettet, analog zu `CLAUDE.md`) lädt —
  in diesem Fall würde die `Read`-Deny-Regel nichts bewirken, weil kein
  Werkzeugaufruf stattfindet, den sie abfangen könnte. In den realen WS-3-
  Nachweisläufen nicht beobachtet (0/5 Jarvis-Turns und der Router-Lauf
  zeigten keinerlei MEMORY.md-Inhalt in den Antworten), aber nicht
  systematisch anhand der CLI-Doku/des Quellcodes ausgeschlossen — noch
  nicht in `state/findings.md` nachgetragen.

## Feature Review
Alle vier Workstreams gebaut, gemergt und real nachgewiesen: WS-0 #203,
WS-1 #204, WS-2 #206, WS-3 #207. Stefans Abnahme (`docs/projekt/
zielfassung.md` §Workstream: `… → ABNAHME → ABGESCHLOSSEN`) liegt am
22.09.2026 vor — Status entsprechend auf `ABGESCHLOSSEN` gesetzt. Offene
Restfindings F-581/F-583 bleiben bestehen, siehe "Offene Reste".
