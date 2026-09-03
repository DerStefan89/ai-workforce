# F6a — Claude-Code-Gateway, Lesepfad

## ID

F6a

## Titel

Claude-Code-Gateway, Lesepfad

## Status

Status: READY_FOR_TECH

Gültige Status-Werte (geprüft vom Gate, siehe A3a–e in
`features/AF-F001/feature.md`): `ENTWURF, READY_FOR_TECH,
WORKSTREAM_SCHNITT_GENEHMIGT, IN_ARBEIT, FEATURE_GATE, ABGESCHLOSSEN,
BLOCKIERT, ABGEBROCHEN`.

## Ziel

Ein realer Claude-Code-Werkzeugprozess kann aus einem Kontextpaket (F5)
und einem Starturteil (F4) heraus gestartet, beobachtet und in zwei
getrennten Ablagen (E-190) festgehalten werden — ohne Schreibwirkung auf
das Produkt-Repository und ohne fachliche Bewertung des Ergebnisses. F6a
ist die einzige Komponente, die einen Werkzeugprozess startet
(Zielfassung §16.2, Modultabelle „Claude-Code-Gateway"); sie besitzt den
Lauf-Lebenszyklus, nicht dessen Deutung.

## Scope

- Neues, eigenständiges Modul `src/claude-code-gateway/`, das F4, F5,
  F1B und F2 ausschließlich von außen aufruft — kein Nachbau ihrer
  Regeln (D5-Muster wie F4 gegenüber F3).
- **Aufrufrepräsentation festlegen und damit F-048 schließen:** der
  Aufruf wird durchgehend als Tokens-Array geführt (`['--model', '…']`,
  analog `process.argv`), nie als zusammengesetzter
  Kommandozeilen-String. F4s `pruefeAufrufparameter` wird gegen genau
  diese Repräsentation aufgerufen; Mehrwort-Verbotseinträge aus
  `VERBOTENE_AUFRUFPARAMETER` müssen dabei als Token-Folge erkannt
  werden.
- Aufrufkonstruktion: `--model` je Lauf explizit (E-185),
  `--output-format json`, `--setting-sources project`, Werkzeugsatz
  explizit begrenzt (E-187, Rang `DEKLARIERT`, siehe Nicht-Ziele).
- Startfreigabe (korrigiert nach Advisor-Pass Befund 1, Option A,
  31.08.2026): F6a ruft für den Lesepfad ausschließlich F4s
  `pruefeAufrufparameter` (E-182) auf, **nicht** die volle
  `pruefeStartfreigabe` (E-183/E-188). ARCHITECTURE.md §3 und
  Zielfassung §16.4 skalieren `pruefeStartfreigabe` wörtlich auf die
  **schreibende** Execution — F6a schreibt nicht (siehe Nicht-Ziele).
  Liefert `pruefeAufrufparameter` einen Treffer: `verweigereStart` (F4)
  und **kein** Prozessstart.
- Materialisierung der beiden Gültigkeitsschlüssel-Anteile, die nur das
  Gateway kennt (E-188): Berechtigungskontext des Aufrufs und Pfad des
  Arbeitsverzeichnisses. F4 reicht beide heute als opake Werte durch —
  F6a legt ihre Repräsentation fest (§16.8 Punkt 8).
- Wirkungsmarke `RUN_PREPARED` vor dem Start über F1Bs
  `schreibeWirkungsmarke`; kein automatischer Neustart nach Abbruch
  (ARCHITECTURE §4).
- Zwei getrennte Ablagen je Lauf (E-190): kanonische Laufakte unter
  `kontrollzustand/` (nur was Zustand, Freigabe oder Qualitätsdaten
  verbraucht) und Rohereignisstrom, nicht committet, aus der Laufakte
  über seinen Hash referenziert.
- Modellidentität aus der Laufausgabe wird mit Rang `OBSERVED`
  festgehalten (E-185), nie als Zusicherung.
- Fehllauf ohne terminales Ergebnisobjekt (Abbruch, Zeitüberschreitung —
  real gemessen in `state/tp-nachtrag.md`, TP-01e Messfall A/B) führt zu
  einer als **unvollständig** gekennzeichneten Beobachtungsbasis, nicht
  zu einer Klassifikation.
- Neues Payload-Schema für die Laufakte (`LAUFAKTE_V0`, Muster F9s
  `BEDARF_V0` / F5s `KONTEXTPAKET_V0`).
- Gate-Skript `scripts/check-f6a-claude-code-gateway.mjs`, eingehängt in
  `npm run check` und `npm run check:template`.

Technische Konkretisierung (Modul-API, Aufrufbau, Laufakte-Schema,
Ablagepfade): folgt in `state/plan-v1-f6a-claude-code-gateway.md`.

## Nicht-Ziele

- **Klassifikation eines Laufs.** Die drei Terminalausgänge
  (`ERFOLGREICH`/`VERWEIGERT`/`FEHLGESCHLAGEN`, ARCHITECTURE §4), die
  Auswertung von `permission_denials[]` (E-184), `non_execution_kind`
  und die Eskalation nach E-186 gehören zum Result Evaluator (F7,
  Zielfassung §335 „klassifiziert Läufe ausschließlich aus Ergebnishülle
  und Ereignisstrom"). Das Gateway leistet laut §334 ausdrücklich „keine
  fachliche Bewertung, keine Fließtextdeutung". F6a liefert die
  Beobachtungsbasis, F7 deutet sie.
- **Execution mit Schreibwirkung.** E-183/E-188 scharf, der bislang nie
  erbrachte Rot-Fall-Nachweis der Wirksamkeitsprüfung (§16.8 Punkt 3,
  Finding F-053) und jeder Lauf, der Produktdateien ändert, gehören zu
  F6b. F6a begrenzt den Werkzeugsatz auf lesende Werkzeuge.
- **`ERZWUNGEN` als Zusicherung für die Werkzeugsatz-Begrenzung.** E-187
  verlangt zwei unabhängige Mechanismen; §16.8 Punkt 4 ist inzwischen
  geschlossen (E7, F-078, 03.09.2026) — der bisher referenzierte
  MCP-Kanal-Messfall 3 gilt als überholt. Die Messung lief in einem
  Wegwerf-Arbeitsverzeichnis außerhalb dieses Repos, nicht gegen F6as
  eigenen Aufruf; eine Hochstufung von F6as `DEKLARIERT` auf `ERZWUNGEN`
  bleibt eine eigene, hier nicht getroffene Entscheidung. F6a führt die
  Begrenzung bis dahin wie F4 als `DEKLARIERT`.
- Orchestrierung mehrerer Executions, Wiederaufnahme, Resume-Ziele —
  Execution Controller (Deliverable 3, Feature #8).
- Kontextpaket bauen (F5), Autorisierung prüfen (F3), Startfreigabe
  entscheiden (F4) — F6a ruft auf, baut nicht nach.
- Deutung von Konsolentext in irgendeiner Form (ARCHITECTURE §7,
  verbotenes Pattern).
- Ein echter Claude-Code-Lauf innerhalb von `npm run check` — die
  Standardkette bleibt deterministisch und netzfrei (siehe AK10/AK11).

## Akzeptanzkriterien

1. Ein Lauf wird ausschließlich aus einem Tokens-Array konstruiert; es
   existiert kein Codepfad, der den Aufruf als zusammengesetzten
   Kommandozeilen-String an den Prozessstart übergibt.
2. Jeder konstruierte Aufruf wird vor dem Start durch F4s
   `pruefeAufrufparameter` geführt. Ein Mehrwort-Verbotseintrag aus
   `VERBOTENE_AUFRUFPARAMETER` wird auch dann erkannt, wenn er im
   Tokens-Array auf zwei Elemente verteilt ist (schließt F-048).
3. Jeder Aufruf trägt `--model` explizit (E-185); es existiert kein
   Codepfad, der ohne `--model` startet oder ein Modell implizit
   auswählt.
4. Vor jedem Prozessstart wird ausschließlich F4s `pruefeAufrufparameter`
   (E-182) geprüft — **nicht** die volle `pruefeStartfreigabe`
   (E-183/E-188), die laut ARCHITECTURE.md §3 und Zielfassung §16.4
   wörtlich auf die schreibende Execution skaliert ist (Advisor-Pass
   Befund 1, Option A, 31.08.2026 — korrigiert AK4 gegenüber der
   ursprünglichen Fassung dieser Akte). Liefert `pruefeAufrufparameter`
   einen Treffer, wird `verweigereStart` (F4) aufgerufen und **kein**
   Prozess gestartet — nachgewiesen durch einen Test, der das
   Prozessstart-Primitiv beobachtbar macht.
5. Vor jedem Start wird eine `RUN_PREPARED`-Wirkungsmarke über F1B
   geschrieben. Nach einem Lauf ohne Terminalartefakt liefert
   `stelleLaufstatusFest` erwartungsgemäß `KLAERUNG_ERFORDERLICH` — das
   ist der vorgesehene Zustand bis F7 existiert, kein Fehler.
6. Ein Lauf erzeugt zwei getrennte Ablagen (E-190): eine kanonische
   Laufakte unter `kontrollzustand/` und einen Rohereignisstrom, der
   nicht committet wird und aus der Laufakte ausschließlich über seinen
   Inhalts-Hash referenziert ist.
7. Der Berechtigungskontext des Aufrufs und der Pfad des
   Arbeitsverzeichnisses werden in einer festgelegten, dokumentierten
   Repräsentation in die Laufakte geschrieben und sind als
   Gültigkeitsschlüssel-Anteile (E-188) an F4 übergebbar.
8. Die Modellidentität aus der Laufausgabe wird mit Rang `OBSERVED`
   festgehalten und nirgends als zugesicherter Wert weiterverwendet.
9. Ein Lauf ohne terminales Ergebnisobjekt (Abbruch, Zeitüberschreitung)
   führt zu einer Laufakte mit ausdrücklich gesetztem Kennzeichen
   „Beobachtungsbasis unvollständig" und **ohne** Terminalausgang —
   nachgewiesen gegen die real gemessenen Fehllaufformen aus
   `state/tp-nachtrag.md` (TP-01e Messfall A/B: kein Ergebnisobjekt,
   leeres stderr, kein Restprozess).
10. Tests laufen gegen ein einsetzbares Prozessstart-Primitiv mit einem
    Attrappen-Werkzeug, das aufgezeichnete Ergebnishüllen aus
    `state/tp-nachtrag.md` ausgibt. `npm run check` startet keinen echten
    Claude-Code-Prozess und braucht kein Netz.
11. Der reale Nachweis (ein echter `claude -p`-Lauf über dieses Modul,
    mit Laufakte und Rohstrom als Beleg) wird als eigenständiges,
    manuell auszuführendes Skript geführt und in `state/gates.md`
    dokumentiert — bewusst **nicht** in die Standardkette eingehängt,
    nach dem Präzedenzfall `scripts/verify-rename-atomicity.mjs` (F1,
    Windows-Rename-Atomaritätsnachweis).
12. Kein `permission_denials`-, `non_execution_kind`- oder
    Terminalausgangs-Auswertungscode im Modul (F7-Grenze) —
    mechanisch per Grep im Gate geprüft, analog F4s AC8.
13. `npm run check` → Exit 0.

14. Kein Codepfad im Modul baut den Prozessaufruf als zusammengesetzten
    Shell-String zusammen (kein `.join(' ')`-artiges Muster, kein
    `shell: true`, kein shell-interpretierender `exec(`-Aufruf) —
    mechanisch per Grep im Gate erzwungen, mit Selbsttest, dass die Regel
    einen simulierten Verstoß auch tatsächlich erkennt (F-057, WS2).

### Status (WS2, state/tasks/f6a-ws2-prozessstart.md)

Nachweis/Status je betroffenem AK — Baudurchgang, `npm run check` grün,
Reviewer-/QA-Pass vor Merge noch ausstehend:

- **AK5** — `starteGateway` schreibt vor jedem `starteProzess`-Aufruf eine
  `RUN_PREPARED`-Wirkungsmarke (F1B); Test „liefert eine vollständige
  Laufakte … Grünfall" und „kennzeichnet die Laufakte als unvollständig …"
  bestätigen je `stelleLaufstatusFest` → `KLAERUNG_ERFORDERLICH` (kein
  Terminalausgang durch das Gateway selbst, wie vorgesehen).
- **AK6** — zwei getrennte Ablagen real umgesetzt: Laufakte über F2s
  `registriereKernArtefakt` unter `kontrollzustand/`, Rohereignisstrom
  unter `kontrollzustand-roh/<lauf_id>/rohstrom.json` (nicht committet,
  `.gitignore` ergänzt), aus der Laufakte nur über `rohstrom_referenz.
  inhalts_hash` referenziert.
- **AK7** — `berechtigungskontext`, `arbeitsverzeichnis_pfad` (roh,
  `process.cwd()`) und `werkzeug_version_deklariert` sind Teil von
  `LAUFAKTE_V0` — deskriptiv, **ohne** F4-Vollcheck (Option B, siehe
  Dependencies-Abschnitt unten), kein Gültigkeitsschlüssel im F4-Sinn.
- **AK8** — real erfüllt seit WS4 SCOPE 7 (02./03.09.2026): das echte
  `"type":"result"`-Objekt trägt ein `modelUsage`-Objekt, dessen
  Schlüssel den Modellnamen bildet. `leseModellBeobachtet`
  (`src/claude-code-gateway/index.ts`) extrahiert ihn nur bei **genau
  einem** Schlüssel — mehrdeutig (kein oder mehrere Schlüssel) bleibt
  `null`, es wird nicht geraten (Muster F-059/F-061). Real gemessen:
  `modell_beobachtet: "claude-sonnet-5"` (`state/gates.md` WS4-Eintrag).
  Schließt F-059.
- **AK9** — Fehllauf ohne Ergebnisobjekt (TP-01e-Muster, Attrappe
  `attrappeOhneErgebnisobjekt`) führt zu `beobachtungsbasis_vollstaendig:
  false`, **keine** Terminal-Wirkungsmarke — Test vorhanden.
- **AK11** — real erfüllt seit WS4 (`scripts/verify-f6a-real-run.mjs`,
  SCOPE 7, 02./03.09.2026): `starteGateway`/`starteProzess` starten unter
  Windows real einen Claude-Code-Prozess (`execFile` gegen die native
  `bin/claude.exe` der npm-Global-Installation, kein aktivierter
  Shell-Modus) und liefern ein valides `"type":"result"`-Objekt.
- **AK14** — neu, siehe oben; Gate-Grep + Selbsttest in
  `scripts/check-f6a-claude-code-gateway.mjs` umgesetzt.
- **AK15** — neu (WS4, Hygiene-Guard, keine Vertrauensgrenze — die
  Vertrauensfrage liegt per Entscheidung E2 beim Aufrufer):
  `pruefeStartziel` (`src/claude-code-gateway/prozessstart.ts`) prüft ein
  Startziel gegen vier billige Regeln (absoluter Pfad, keine
  `.cmd`/`.bat`/`.com`/`.ps1`-Endung über den getrimmten Basisnamen, kein
  Shell-Basisname aus einer Sperrliste, existierende Datei) — greift in
  `starteGateway` vor jeder `RUN_PREPARED`-Wirkungsmarke. Sieben Rot-Fälle
  einzeln plus ein Grün-Fall in
  `scripts/check-f6a-claude-code-gateway.mjs`.

## Zuordnung

Deliverable 3, Feature #6 — Ausführungspfad
(`docs/projekt/umsetzungsplan-fassung-1.md` Abschnitt 2, Tabellenzeile 6
„Startet erst, wenn Invocation Policy (4) freigibt und Context Builder
(5) liefert"). Feature #6 wird bewusst in **F6a** (Lesepfad, diese Akte)
und **F6b** (Schreibwirkung) geteilt; F7 (Result Evaluator) wird zwischen
beide gezogen, weil F6a ohne F7 keinen Lauf schließen kann (AK5). Der
Umsetzungsplan bleibt inhaltlich gültig, die Reihenfolge lautet damit
6a → 7 → 6b. Entschieden mit Stefan am 31.08.2026 (Challenge F6,
Entscheidung 1 Option B / Entscheidung 2 Option A).

## Dependencies

- Hard, erfüllt: **F4** (Invocation Policy) — `pruefeAufrufparameter`,
  `VERBOTENE_AUFRUFPARAMETER`, `verweigereStart` aus
  `src/invocation-policy/index.ts`, unverändert von außen aufgerufen.
  `pruefeStartfreigabe` (E-183/E-188, volle Startfreigabe) wird von F6a
  **nicht** aufgerufen — laut ARCHITECTURE §3/Zielfassung §16.4 auf die
  schreibende Execution skaliert, bleibt F6b vorbehalten (Advisor-Pass
  Befund 1, Option A, 31.08.2026).
- Hard, erfüllt: **F5** (Context Builder) — `baueKontextpaket`,
  `pruefeKontextpaketFrisch` aus `src/context-builder/index.ts`.
- Hard, erfüllt: **F1B/F1** (Checkpoint Store, Wirkungsmarke) —
  `schreibeWirkungsmarke`, `stelleLaufstatusFest`.
- Hard, erfüllt: **F2** (Lineage Registry) — Registrierung der Laufakte
  als kern-erzeugtes Artefakt.
- **Nicht blockierend (korrigiert 31.08.2026): F-030** — Prämisse
  widerlegt. `.claude/settings.json` `permissions.allow` gated nur
  Bash-Aufrufe, die eine Claude-Code-Sitzung selbst als obersten
  Tool-Call vorschlägt, nicht Node-`child_process`-Subprozesse aus
  bereits freigegebenem Code. F6a/WS2 ist gewöhnlicher Node-Code, kein
  Claude-Code-Tool-Call — unterliegt `permissions.allow` nicht. Kein
  eigener Harness-Vertrag nötig. Die tatsächlich offene, engere Frage
  (Argv-Array statt Shell-String beim Subprozessstart) ist als F-057
  erfasst und in WS2 (AK14) umgesetzt. Siehe `state/findings.md` F-030
  Nachtrag, `features/F6a/journal.md` „Challenge F-030".
- Wird in dieser Akte geschlossen: **F-048** (Aufrufrepräsentation,
  siehe Scope und AK2).
- Ausdrücklich **nicht** Voraussetzung: F-053 (E-188 ohne erbrachten
  Rot-Fall) und §16.8 Punkt 3 — F6a schreibt nicht, die Lücke wird erst
  für F6b blockierend. **Bestätigt 31.08.2026 (WS2/WS3-Challenge):**
  Eine Ausweitung auf die volle `pruefeStartfreigabe` für WS2/WS3 wurde
  geprüft und wieder verworfen — `ARCHITECTURE.md` §3/§16.4 skalieren
  diese Prüfung wörtlich auf „Execution mit Schreibwirkung", WS2/WS3
  bleiben laut eigenem Scope lese-beschränkt. Siehe
  `state/plan-v1-f6a-ws2-ws3-prozessstart.md` (Fassung 2) und
  `state/advisor-findings-f6a-ws2-ws3-prozessstart.md` (Befund 1).
- Nachgelagert: **F7** (Result Evaluator) — erster Konsument der von F6a
  erzeugten Beobachtungsbasis; ohne F7 bleibt jeder Lauf in
  `KLAERUNG_ERFORDERLICH` (AK5, bewusst so entschieden).

## Workstream-Liste

- **WS1 — Aufrufkonstruktion und Startfreigabe.** Tokens-Array-
  Repräsentation, F4-Anbindung (`pruefeAufrufparameter`,
  `pruefeStartfreigabe`, `verweigereStart`), F-048-Schluss, `--model`-
  Pflicht, Werkzeugsatz-Begrenzung `DEKLARIERT`. Eigenständig prüfbar
  ohne jeden Prozessstart.
- **WS2 — Prozessstart und Beobachtungsbasis.** Einsetzbares
  Prozessstart-Primitiv (Argv-Array, kein Shell-String — F-057), `RUN_PREPARED`
  vor dem Start, WS1s bereits vorhandener E-182-Check
  (`pruefeUndVerweigereBeiTreffer`) — **kein** F3-, **kein** volles
  F4-Startfreigabe-Gate (geprüft und verworfen, WS2/WS3-Challenge
  31.08.2026, siehe Dependencies-Abschnitt unten), zwei getrennte
  Ablagen (E-190), `LAUFAKTE_V0`-Schema, Gültigkeitsschlüssel-Anteile
  (deskriptiv, ohne F4-Vollcheck), `OBSERVED`-Modellidentität, Fehllauf
  ohne Ergebnisobjekt, Gate + Tests gegen das Attrappen-Werkzeug.
- **WS3 — Realer Nachweis.** Manuell auszuführendes Nachweis-Skript, ein
  echter `claude -p`-Lauf, Eintrag in `state/gates.md`. Nicht in der
  Standardkette.

Drei Workstreams statt einem, weil WS1 ohne jeden Prozessstart
abnehmbar ist und WS3 plattform- und netzabhängig ist — dieselbe
Trennung, die F1 zwischen Standardkette und
`verify-rename-atomicity.mjs` bereits etabliert hat.

## Entscheidungs-Referenzen

- `docs/projekt/zielfassung.md` §9.4 — E-182, E-185, E-187, E-188, E-190.
- `docs/projekt/zielfassung.md` §16.2 Modultabelle, Zeile 334/335 —
  Gateway „keine fachliche Bewertung, keine Fließtextdeutung"; Result
  Evaluator „klassifiziert Läufe ausschließlich aus Ergebnishülle und
  Ereignisstrom". Begründet die F6a/F7-Grenze.
- `docs/projekt/zielfassung.md` §16.8 Punkt 4 (E-187, geschlossen E7/F-078), Punkt 5
  (Absturz-Erkennung, faktisch durch TP-01e gemessen — Finding F-052),
  Punkt 8 (Gültigkeitsschlüssel, wird durch AK7 adressiert).
- `ARCHITECTURE.md` §4 (drei Terminalausgänge, zwei Ablagen, kein
  automatischer Neustart) und §7 (verbotene Patterns: kein Laufergebnis
  aus Konsolentext, kein CRLF).
- `state/tp-nachtrag.md` — reale Messbasis: `claude -p --output-format
  json --setting-sources project`, echte `permission_denials`-Payloads,
  Fehllaufformen Abbruch (Exit 137) und Zeitüberschreitung (Exit 124)
  ohne terminales Ergebnisobjekt und ohne Restprozess.
- `state/findings.md` — F-030 (blockierend), F-048 (wird geschlossen),
  F-051/F-052/F-053 (aus dem F6-Challenge).
- `features/F4/feature.md`, `features/F5/feature.md` — die
  wiederzuverwendenden Module und ihre Nicht-Ziel-Ränder.

## Spec-Referenz

Noch keine — `spec.md` entsteht über den Skill `spec-schreiben`, falls
die Ausführungsrolle das für den Umfang von WS2 für nötig hält.
