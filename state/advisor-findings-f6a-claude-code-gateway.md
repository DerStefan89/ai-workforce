# Advisor-Findings — Plan v1 F6a: Claude-Code-Gateway, Lesepfad

Slug: f6a-claude-code-gateway
Stand: 2026-08-31
Rolle: Advisor (frischer Kontext, Repo-Lesezugriff über device_bash,
kein Schreibrecht)
Geprüfter Plan: `state/plan-v1-f6a-claude-code-gateway.md`

## Kopf — was gegen welche Quellen geprüft wurde

- `state/plan-v1-f6a-claude-code-gateway.md` (vollständig)
- `features/F6a/feature.md`, `features/F6a/journal.md` (vollständig)
- `docs/projekt/zielfassung.md` §9.4 (E-182 bis E-190), §16.2
  (Modultabelle), §16.3, §16.4 („Startbedingungen des schreibenden
  Pfades"), §16.5, §16.6, §16.8 (Punkte 3, 4, 5, 8)
- `ARCHITECTURE.md` §1–§8 (vollständig, insbesondere §3 „Auth", §4
  „Fehlerbehandlung", §7 „Verbotene Patterns")
- `src/invocation-policy/index.ts` (vollständig, 420 Zeilen) und
  `verbotene-aufrufparameter.ts` (vollständig)
- `src/checkpoint-store/index.ts`: `schreibeWirkungsmarke` (530–575),
  `stelleLaufstatusFest` (697–755), Schema-Validierung 246–261
- `src/lineage-registry/index.ts`: `registriereKernArtefakt` (85–111),
  `registriereWerkzeugReferenz` (116–145)
- `state/tp-nachtrag.md` (vollständig, insbesondere TP-01e)
- `state/findings.md`: F-030, F-048, F-051, F-052, F-053 im Volltext
- `features/F4/feature.md` (Ziel, Scope, Nicht-Ziele)
- `state/advisor-findings-f4-invocation-policy.md` (Formatvorbild UND
  inhaltlich relevant — Fokus 1 dort nimmt exakt das Thema von Befund 1
  hier vorweg)
- `.claude/settings.json` (`permissions.allow`, Gegenprobe zu F-030)
- `.gitignore` (Gegenprobe zu Design-Entscheidung 4)
- `state/plan-v1-f4-invocation-policy.md`, `state/plan-v1-f5-context-
  builder.md` (nur Stilvergleich, wie beauftragt)

**Rollengrenze:** Nur Lesezugriff. Kein Code unter `src/claude-code-
gateway/` existiert; die Prüfung bleibt auf Ebene Plan-Text gegen
Sollquelle/realen Code, nicht auf real ausgeführtem Testlauf.

## Marker-Legende

`[Fakt]` im Code/Dokument belegt · `[Schlussfolgerung]` aus Fakten
abgeleitet · `[Vermutung]` plausibel, nicht abschließend geprüft ·
`[offene Unsicherheit]` weder belegt noch widerlegt.

## Befunde

### Befund 1 — `pruefeStartfreigabe` ist laut Sollquelle für den
schreibenden Pfad skaliert; der Plan wendet es unbesehen auf den
Lesepfad an

**[Fakt]** `ARCHITECTURE.md` §3, zweite Schicht, wörtlich: „**Invocation
Policy / Protection Validator** — vor jeder Execution **mit
Schreibwirkung**, lokal und ohne Werkzeugaufruf: ist die
Werkzeugkonfiguration gültig … und liegt ein gültiger
Wirksamkeitsnachweis für den Gültigkeitsschlüssel vor." `docs/projekt/
zielfassung.md` §16.4 trägt den Titel „**Startbedingungen des
schreibenden Pfades**" (Zeile 346) für exakt dieselben zwei Bedingungen
(E-183, E-188). `features/F4/feature.md`, Ziel: „Für einen **geplanten
schreibenden Lauf** stellt eine lokale … Prüfung fest …". Der
Kopfkommentar von `src/invocation-policy/index.ts` (Zeile 3–8): „Stellt
für eine **geplante schreibende Execution** fest, ob …". Vier
unabhängige Quellen, alle wortgleich in der Einschränkung.

**[Fakt]** `pruefeStartfreigabe` (`index.ts:385`) prüft unconditioniert
beide Bedingungen — `pruefeStartbedingung1` (Baseline/Schutzskript-Hash,
verlangt `baselineReferenz` **und** `istZustand.schutzskripte`) und
`pruefeStartbedingung2` (E-188, verlangt ein
`wirksamkeitsnachweis`-Objekt, dessen Schema laut
`validiereWirksamkeitsnachweisEintrag` (`index.ts:187–232`) ein
Pflichtfeld `rot_fall_beleg` als nicht-leeren String erzwingt). Es gibt
keinen Parameter, der Bedingung 2 für eine nicht-schreibende Execution
abschaltet.

**[Fakt]** Der Plan (Abschnitt 2, Punkt 5; Abschnitt 0, Bullet 3;
`features/F6a/feature.md` AK4) lässt `starteGateway` vor **jedem**
Prozessstart — auch dem rein lesenden F6a-Lauf — unverändert
`pruefeStartfreigabe` aufrufen, ohne diese Einschränkung zu erwähnen
oder zu adressieren.

**[Schlussfolgerung, hohe Relevanz]** Das erzeugt einen realen
Widerspruch, keinen kosmetischen:

- `state/findings.md` F-053 begründet explizit „Auswirkung: … **null
  bei F6a**", weil „F6a führt keine Schreibwirkung aus". Diese Aussage
  ist nur richtig, wenn F6a `pruefeStartbedingung2` (E-188,
  `rot_fall_beleg`) gar nicht durchläuft. Läuft F6a — wie der Plan
  vorsieht — doch durch, dann **ist F-053 auch für F6a blockierend**:
  jeder reale F6a-Lauf bräuchte einen `wirksamkeitsnachweis` mit einem
  Rot-Fall-Beleg, den es laut F-053 nie gab.
- `features/F6a/feature.md`, Dependencies: „Ausdrücklich **nicht**
  Voraussetzung: F-053 … F6a schreibt nicht, die Lücke wird erst für
  F6b blockierend." Dieselbe Spannung.
- Der bereits vorliegende F4-Advisor-Pass (`state/advisor-findings-f4-
  invocation-policy.md`, F1–F3) hatte diese Lücke exakt benannt und
  ausdrücklich „an einen Aufrufer (F6) … dem gegenüber diese Erwartung
  nirgends schriftlich fixiert ist" delegiert. Der F6a-Plan ist die
  erste Gelegenheit, das zu klären — tut es aber nicht, sondern
  übernimmt den Aufruf unkommentiert.
- Praktische Konsequenz für WS3 (`scripts/verify-f6a-real-run.mjs`,
  AK11): dieser reale Nachweis-Lauf würde über denselben
  `starteGateway`-Pfad laufen und bräuchte damit ebenfalls einen
  gültigen `wirksamkeitsnachweis` — der Plan sagt nicht, woher der für
  einen reinen Lesepfad kommen soll, ohne entweder (a) einen
  Fake-Beleg zu produzieren (schema-technisch möglich, da
  `rot_fall_beleg` nur auf nicht-leeren String geprüft wird, nicht auf
  Echtheit) oder (b) F-053 real zu schließen.

**[offene Unsicherheit]** Zwei plausible Auflösungen, keine im Plan
entschieden:
1. F6a ruft für den Lesepfad nur `pruefeAufrufparameter` (E-182, gilt
   laut eigenem Wortlaut „Der Core ruft nie …" uneingeschränkt für jeden
   Aufruf) auf, nicht die volle `pruefeStartfreigabe`. Das deckt sich
   mit ARCHITECTURE §3 und §16.4 wörtlich, widerspräche aber
   `features/F6a/feature.md` AK4, das bereits „vor jedem Prozessstart"
   sagt — AK4 selbst müsste dann korrigiert werden.
2. F6a ruft bewusst die volle `pruefeStartfreigabe` auch für Lesepfade
   auf (Defense-in-Depth), akzeptiert aber explizit, dass F-053 dann
   auch F6a blockiert, und macht das in Dependencies/Nicht-Ziele
   sichtbar statt es zu verschweigen.

Das ist keine Kleinigkeit, die „im Bau mitläuft" — sie entscheidet, ob
WS1 wirklich „ohne jeden Prozessstart" isoliert testbar ist (Abschnitt 7
des Plans) oder bereits eine Wirksamkeitsnachweis-Fixture-Infrastruktur
braucht, und ob WS3 überhaupt ohne F-053-Fix ausführbar ist.

### Befund 2 — F2 (Lineage Registry) ist harte, erfüllte Abhängigkeit
laut `feature.md`, kommt im Plan aber kein einziges Mal vor

**[Fakt]** `features/F6a/feature.md`, Dependencies: „Hard, erfüllt: **F2**
(Lineage Registry) — Registrierung der Laufakte als kern-erzeugtes
Artefakt." `src/lineage-registry/index.ts` exportiert genau die dafür
passenden Primitiven: `registriereKernArtefakt` (Zeile 85, für
kern-erzeugte Artefakte mit eigener Identität) und
`registriereWerkzeugReferenz` (Zeile 116, für werkzeug-erzeugte
Artefakte als Referenz — Pfad, Inhalts-Hash, zitierter Bereich). Die
Modultabelle (`zielfassung.md` §16.2, Zeile „Artifact Registry /
Lineage") ordnet genau diese Unterscheidung der Laufakte (kern-erzeugt,
eigene Identität) und dem Rohereignisstrom (werkzeug-erzeugt, Referenz)
zu.

**[Fakt]** Eine Volltextsuche über `state/plan-v1-f6a-claude-code-
gateway.md` nach „F2", „lineage" oder „registriereKernArtefakt" liefert
null Treffer.

**[Schlussfolgerung]** Der Plan legt in Abschnitt 2.9 die Laufakte
(`LAUFAKTE_V0`) und in Abschnitt 5 ihren Ablagepfad
(`kontrollzustand/`) fest, sagt aber nirgends, **wann und wodurch** die
Laufakte als kern-erzeugtes Artefakt in der Lineage Registry
registriert wird — obwohl das laut `feature.md` explizit Teil der
Abhängigkeit ist und ARCHITECTURE §2 verlangt, dass Artefakte versioniert
statt überschrieben werden und „die einzige Stelle, die den aktuellen
Stand benennt, … der letzte Checkpoint" ist. Ohne
`registriereKernArtefakt`-Aufruf bleibt unklar, wie ein späterer Leser
(z. B. F7) die Laufakte über die Lineage Registry auffindet, statt sie
nur über den Rohpfad zu kennen. Für den Rohereignisstrom fehlt
symmetrisch die Frage, ob er über `registriereWerkzeugReferenz`
referenziert werden soll (er ist werkzeug-erzeugt) — der Plan
referenziert ihn nur „aus der Laufakte über seinen Inhalts-Hash", was
mit F2s Rolle kollidieren oder sie schlicht auslassen könnte, ungeklärt.

**Auswirkung:** Lücke in der technischen Konkretisierung gegenüber
einer in `feature.md` selbst benannten harten Abhängigkeit — nicht
architekturverletzend, aber eine AK-nahe Anforderung, die plan-v2 vor
dem Handoff-Vertrag schließen muss, sonst entscheidet der Bauende das
stillschweigend.

### Befund 3 — AK11 verlangt einen Eintrag in `state/gates.md`; der Plan
committet sich nirgends darauf

**[Fakt]** `features/F6a/feature.md`, AK11: „Der reale Nachweis … wird
als eigenständiges, manuell auszuführendes Skript geführt und **in
`state/gates.md` dokumentiert** — bewusst nicht in die Standardkette
eingehängt, nach dem Präzedenzfall `scripts/verify-rename-atomicity.mjs`."

**[Fakt]** Der Plan erwähnt `state/gates.md` genau einmal (Abschnitt 6,
Zeile „Zuschnitt-Heuristik CLAUDE.md … F1, `state/gates.md` Zeile 970")
— als Zitat des **F1-Präzedenzfalls**, nicht als eigene Verpflichtung
für F6a. Abschnitt 5 (Ablageort) listet
`scripts/verify-f6a-real-run.mjs`, aber keinen Eintrag „wird nach
erfolgreichem WS3-Lauf in `state/gates.md` dokumentiert".

**[Schlussfolgerung]** Kleine, aber echte AK-Deckungslücke — leicht in
plan-v2 nachzutragen (ein Satz in Abschnitt 5 oder 6), kein
struktureller Mangel.

### Befund 4 — `modell_beobachtet`: Extraktionsregel aus der
Laufausgabe bleibt unspezifiziert

**[offene Unsicherheit]** Abschnitt 2.9 nennt das Feld
`modell_beobachtet` (Rang `OBSERVED`) als Teil von `LAUFAKTE_V0`, sagt
aber nicht, aus welchem Feld der `"type":"result"`-JSON-Ausgabe
(`state/tp-nachtrag.md` zeigt `result`, `permission_denials`,
`web_fetch_requests` etc., aber in den zitierten Ausschnitten kein
`model`-Feld) dieser Wert gelesen wird. Nicht geprüft, ob das Feld in
der realen Ausgabe überhaupt vorhanden ist — TP-Nachtrag zitiert es an
keiner Stelle wörtlich. Geringe Auswirkung (WS2/WS3-Detail, kein
Scope-Problem), aber eine „technische Konkretisierung" sollte das vor
dem Handoff-Vertrag klären, nicht erst beim Bau entdecken.

## Entlastende Befunde

**[Fakt, entlastend]** F-048-Diagnose exakt am Code verifiziert:
`verbotene-aufrufparameter.ts:19` prüft `parameter.includes(verbotenerWert)`
elementweise; `'--permission-mode bypassPermissions'` ist Zeile 15 ein
einzelner String mit eingebettetem Leerzeichen. Der Plan zitiert das
korrekt und platziert den Fix richtig in F4 (D5-konform), nicht in F6a.

**[Fakt, entlastend]** Die Behauptung „kein neuer Terminalzustand
nötig" (Design-Entscheidung 5) ist am Code exakt bestätigt:
`ERGEBNIS_WERTE` (`checkpoint-store/index.ts:25`) kennt nur
`ERFOLGREICH`/`VERWEIGERT`/`FEHLGESCHLAGEN`; `schreibeWirkungsmarke`
wirft bei `art:'terminal'` und fehlendem/ungültigem `ergebnis`
(Zeile 541–544) statt einen vierten Wert zuzulassen.
`stelleLaufstatusFest` liefert bei offener `run_prepared`-Sequenz ohne
zugeordnetes Terminal korrekt `KLAERUNG_ERFORDERLICH` (Zeile 726–738).
Kein Denkfehler.

**[Fakt, entlastend]** F6a/F7-Grenze sauber gehalten: die Laufakte in
Abschnitt 2.9 trägt explizit **nicht** `ergebnis`-Klassifikation oder
`permission_denials`-Auswertung; `beobachtungsbasis_vollstaendig: false`
(Abschnitt 2.10) ist rein mechanisch (Vorhandensein eines
`"type":"result"`-Objekts), keine Erfolgs-/Verweigerungsdeutung. Das
AK12-Gate (Grep gegen `permission_denials`/`non_execution_kind`/
Terminalausgangs-Code) ist mechanisch scharf genug, diese Grenze im Bau
zu erzwingen.

**[Fakt, entlastend]** F-030-Prüfung stimmt mit dem realen Stand
überein: `.claude/settings.json` `permissions.allow` enthält exakt die
fünf genannten `npm run …`-Einträge, keinen freien Bash-Weg.

**[Fakt, entlastend]** TP-01e-Referenz korrekt: `state/tp-nachtrag.md`
Abschnitt „TP-01 e" (Zeile 227ff.) enthält tatsächlich die zwei
Fehllaufformen, auf die sich der Plan für die AK9/AK10-Fixtures stützt.

**[Fakt, entlastend]** Design-Entscheidung 4 (`kontrollzustand-roh/`)
ist gegen `.gitignore` geprüft: Der Pfad existiert dort noch nicht — der
Plan benennt das selbst korrekt als offene Unsicherheit 3, statt es zu
verschweigen. Der gewählte Top-Level-Name folgt demselben Muster wie
das bestehende `kontrollzustand-test/`-Ignore (eigener Pfad statt
Ausnahme innerhalb von `kontrollzustand/`), konsistent mit Abschnitt 16.3
der Zielfassung.

**[Fakt, entlastend]** WS1/WS2-Trennung entlang F-030 ist im
Kern korrekt: WS1 (Tokens-Array, `pruefeAufrufparameter`, reine
Funktionen) braucht keinen Prozessstart und damit keinen Bash-Kanal —
unabhängig von Befund 1, der die Frage betrifft, welche F4-Funktion(en)
WS1 aufruft, nicht ob WS1 isoliert baubar ist.

## Urteil

**Freigegeben mit Hinweisen.**

Begründung: Der Plan liest den realen Code sorgfältig und belegt seine
Kernbehauptungen (F-048, Terminalzustände, TP-01e, F-030) korrekt am
Quelltext statt sie nur zu behaupten — das Verifikations-Muster in
Abschnitt 0 hält, was es verspricht. Die F6a/F7-Grenze ist mechanisch
sauber gezogen und entspricht §16.2/§334-335 sowie dem Challenge-Urteil.
Kein Befund verlangt einen Umbau des Modulzuschnitts (ein Modul,
Tokens-Array, zwei Ablagen, drei Workstreams bleiben tragfähig).

**Vor oder spätestens während des Baus verbindlich zu klären** (kein
reines Doku-Nacharbeiten — Befund 1 entscheidet reale Buildbarkeit von
WS1/WS3 und den tatsächlichen Blockierungsstatus von F-053 für F6a):

- **Befund 1** — Soll F6a für den Lesepfad die volle
  `pruefeStartfreigabe` (E-183+E-188, inkl. `rot_fall_beleg`) aufrufen,
  obwohl ARCHITECTURE §3 und zielfassung §16.4 diese Prüfung wörtlich
  auf „Execution mit Schreibwirkung" begrenzen? Das ist eine echte
  Verzweigung mit Konsequenz für F-053s Blockierungsstatus — sollte als
  ❓ ENTSCHEIDUNG MENSCH an Stefan gehen, nicht in plan-v2 stillschweigend
  in eine Richtung entschieden werden.
- **Befund 2** — Wo im Ablauf (`starteGateway`, nach Prozessende, oder
  separat) ruft F6a `registriereKernArtefakt`/`registriereWerkzeugReferenz`
  auf? Muss in plan-v2 Abschnitt 2/5 konkret werden, sonst entscheidet
  der Bauende die F2-Anbindung ungeplant.

**Dürfen mit dem Bau mitlaufen** (im Executor-Schritt entscheiden und
dokumentieren):

- **Befund 3** — Satz zu `state/gates.md`-Eintrag für den WS3-Nachweis
  in Abschnitt 5 oder 6 ergänzen.
- **Befund 4** — konkretes Ausgabefeld für `modell_beobachtet`
  benennen, sobald die reale JSON-Struktur (WS3 oder ein erneuter Blick
  in `state/tp-nachtrag.md`-Rohdaten) vorliegt.

**Kein Blocker im engeren Sinn:** Befund 1 erfordert keine
Architekturänderung — ARCHITECTURE.md und zielfassung.md sind bereits
eindeutig; der Plan muss sich nur an die bestehende Festlegung
anpassen (oder Stefan entscheidet bewusst, sie für F6a zu erweitern).
Trotzdem hoch genug, um vor dem Handoff-Vertrag geklärt zu sein, nicht
erst beim Bau überrascht zu werden.

## Nächster sinnvoller Schritt

1. Befund 1 als ❓ ENTSCHEIDUNG MENSCH an Stefan: volle
   `pruefeStartfreigabe` für den Lesepfad ja/nein, mit Konsequenz für
   F-053s Status bei F6a.
2. plan-v2 mit Befund 1 (entsprechend der Entscheidung), Befund 2
   (F2-Anbindung konkretisieren), Befund 3 (gates.md-Satz) nachziehen —
   plan-v1 bleibt unverändert stehen.
3. Erst danach Handoff-Vertrag `state/tasks/f6a-claude-code-gateway.md`
   erstellen.
