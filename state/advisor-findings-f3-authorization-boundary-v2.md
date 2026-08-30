# Advisor-Findings v2 — Feature F3: Authorization Boundary (minimal) (fokussierter Zweit-Pass auf Delta 1-5)

Slug: f3-authorization-boundary
Stand: 2026-08-30
Rolle: Architecture Advisor, frischer Kontext, Subagent `architecture-advisor`
Scope dieses Passes: ausschließlich `state/plan-v2-f3-authorization-boundary.md` (Delta 1-5) gegen die Befunde B1-B5 aus `state/advisor-findings-f3-authorization-boundary.md`. Die drei von Stefan bereits getroffenen Scope-Entscheidungen (externer Pfad, Pfad-/Prozessgrenze statt OS-Sperre, genau eine Autorisierung je `lauf_id`) wurden **nicht** erneut bewertet, wie im Auftrag vorgegeben. Die entlastenden Befunde B6-B10 wurden ebenfalls nicht erneut geprüft.

## Kopf

**Geprüft:**
- `state/plan-v2-f3-authorization-boundary.md` (vollständig, insbesondere Delta 1-5)
- `state/plan-v1-f3-authorization-boundary.md` (zur Einordnung, insbesondere Abschnitt 0/3/10)
- `state/advisor-findings-f3-authorization-boundary.md` (B1-B5 wörtlich gegengeprüft)

**Real gelesen, nicht aus dem Plantext übernommen:**
`src/checkpoint-store/index.ts` (vollständig, insbesondere Zeilen 530-592 `schreibeWirkungsmarke`, Zeilen 672-756 `stelleLaufstatusFest`); `src/checkpoint-store/checkpoint-store.test.ts` (Zeilen 254-306, 328-345, 396-430 — reale F1B-Testmuster als Präzedenz für Delta 2s Zitat); `src/lineage-registry/index.ts` (Zeilen 85-148, Hashing-Präzedenz `sha256Hex(kanonischesJson(...))` vs. `sha256Hex(inhalt)`); `docs/projekt/zielfassung.md` Zeile 320 (Bewusste Nicht-Anforderungen, „Rechteverwaltung"), §16.2 (Zeilen 324-337); `docs/projekt/umsetzungsplan-fassung-1.md` Zeilen 56-81 (Deliverable-2/3-Zuordnung, Feature-Nummern #3/#4/#8); `ARCHITECTURE.md` (vollständig, insbesondere Zeile 84 „CRLF in Dateien, die der Kern schreibt"); `features/F1B/feature.md` (vollständig, AC6-Wortlaut); `state/plan-v1-f1b-wirkungsmarke.md:228-229` (Beleg für das von Delta 1 zitierte Nicht-Ziel-Muster); `features/F3/feature.md` (vollständig).

**Rollengrenze:** Nur `Read`, `Grep`, `Glob`. Kein Schreibzugriff, kein Bash, kein Git — keine Datei geändert.

**Grenze der Prüftiefe (Delta 3):** Ich kann `git init`, `.gitattributes`-Verhalten, `core.autocrlf` oder einen realen `git show`-Aufruf in dieser Rolle nicht selbst ausführen. Die Aussage zur Wirksamkeit von `* -text` (unten, Befund B18) stützt sich auf dokumentiertes, allgemein bekanntes Git-Verhalten (Clean-/Smudge-Filter wirken beim Commit bzw. Checkout, nicht auf `git cat-file`/`git show`-Objektlesen; `-text` deaktiviert diese Filter vollständig), nicht auf einen realen Testlauf in dieser Umgebung — als `[Schlussfolgerung]`, nicht `[Fakt]`, markiert.

## Marker-Legende

`[Fakt]` im Code/Dokument belegt · `[Schlussfolgerung]` aus Fakten abgeleitet · `[Annahme]` unbelegte Prämisse · `[offene Unsicherheit]` weder belegt noch widerlegt · `[Fakt, entlastend]` geprüft und in Ordnung.

---

## Befunde

### B16 (zu Delta 1 / B1) — korrigierte D3-Formulierung ist ehrlich, Restlücken-Begründung intern konsistent und real belegt
`[Fakt]` + `[Schlussfolgerung, überwiegend entlastend]`

Die korrigierte D3-Formulierung (`plan-v2:58-65`) behauptet nicht mehr „die Lücke" pauschal, sondern trennt explizit Veränderung (geschlossen) von Erzeugung (offen) — genau der von B1 verlangte Overclaim-Fix. Wörtlicher Vergleich mit plan-v1:264-266 zeigt: das frühere „die einzige Stelle in diesem Plan, die diese Lücke schließt" ist ersetzt durch eine zweigeteilte, präzise Aussage. Das ist real ein Formulierungs-, kein Prosa-Fix.

Die Einordnung der Erzeugungs-Lücke als bereits getroffene Scope-Entscheidung ist konsistent und real belegt, nicht nur behauptet:
- `docs/projekt/zielfassung.md:320` (real gelesen): „Bewusste Nicht-Anforderungen: [...] Rechteverwaltung [...]" — Delta 1s Zitat ist wortgetreu.
- `docs/projekt/umsetzungsplan-fassung-1.md:67` (real gelesen): „4 | Invocation Policy / Protection Validator | Braucht Authorization Boundary + Hash-Baseline der Schutzskripte" — Deliverable 2, Feature #4, exakt wie in Delta 1 zitiert.
- `docs/projekt/umsetzungsplan-fassung-1.md:75`: „8 | Execution Controller | [...]" — Deliverable 3, exakt wie in Delta 1s „Execution Controller, Deliverable 3, #8" zitiert.
- `features/F3/feature.md:44-49` (real gelesen): Nicht-Ziele-Abschnitt trägt bereits wörtlich „OS-seitige Durchsetzung der Schreibsperre [...] keine technisch unüberwindbare Schreibverhinderung" — Delta 1s Behauptung, diese Formulierung „bleibt gültig, wird nur präzisiert", ist zutreffend, kein Widerspruch zu vorhandenem Text.

Der „Wer liefert die initiale Referenz"-Abschnitt (`plan-v2:89-100`) beantwortet eine in B1 explizit benannte Verschärfung („SCOPE.3/SCOPE.4 legen nirgends fest, wer den initialen commit_hash/datei_hash einträgt") durch Delegation an einen künftigen Aufrufer (Execution Controller), analog zu F1Bs Muster. Das Analogie-Zitat ist real belegt: `state/plan-v1-f1b-wirkungsmarke.md:228-229` enthält wörtlich „Vergabe der `lauf_id` [...] bleibt Aufrufer-Verantwortung wie in F1" — Delta 1s Formulierung „analog zu F1Bs Nicht-Ziel" ist eine kleine Ungenauigkeit (die Formulierung steht in F1Bs plan-v1, nicht in `feature.md` selbst), inhaltlich aber korrekt zitiert.

**Kein Widerspruch zur bereits bestätigten Scope-Entscheidung:** Delta 1 rollt „Pfad-/Prozessgrenze statt OS-Sperre reicht" nicht neu auf, sondern zieht daraus konsequent, warum die Erzeugungs-Lücke folgerichtig offen bleibt — das ist eine Anwendung der bestehenden Entscheidung, keine neue.

### B17 (zu Delta 2 / B2) — Testaufbau real gegen `stelleLaufstatusFest` verifiziert, exakt wie beschrieben; ein pre-existierender, nicht neu eingeführter Signaturgap bleibt offen
`[Fakt]` + `[offene Unsicherheit]`

**Kern real durchgerechnet, `src/checkpoint-store/index.ts:697-756`:**
- Fixture 1 (A4/A10, korrigiert): `schreibeWirkungsmarke(laufId, ..., 'run_prepared', {})` → Kette: `[{art:'run_prepared', sequenz:1}]`, `offeneRunPrepared=[1]`. Danach `verweigereAutorisierung` → intern `schreibeWirkungsmarke(laufId, ..., 'terminal', {ergebnis:'VERWEIGERT'})` → Schleife: `art !== 'run_prepared'`, `offeneRunPrepared.length>0` → `shift()` (Zeile 717) → `irgendeinPaarAufgeloest=true`, `letztesErgebnis='VERWEIGERT'`. Nach der Schleife: `offeneRunPrepared.length===0` und `irgendeinPaarAufgeloest` wahr → Zweig Zeile 742-749: `{status:'ABGESCHLOSSEN', ergebnis:'VERWEIGERT', ...}`. **Deckt sich exakt mit Delta 2s Behauptung.**
- Fixture 2 (neuer Testfall, „Verweigerung ohne vorangehende RUN_PREPARED-Marke"): nur ein Terminal-Eintrag, `offeneRunPrepared` bleibt leer, Terminal landet in `terminaleOhneRunPrepared` (Zeile 722), `irgendeinPaarAufgeloest` bleibt `false` → Zweig Zeile 750-751: `{status:'NICHT_GESTARTET', terminaleOhneRunPrepared:[1]}`. **Deckt sich exakt mit Delta 2s Behauptung.**

Das Präzedenz-Zitat ist ebenfalls real geprüft, nicht nur behauptet: `src/checkpoint-store/checkpoint-store.test.ts:255-262` und `:268-275` (A9/A10) bauen exakt das von Delta 2 beschriebene Muster — `schreibeWirkungsmarke(..., 'run_prepared', ...)` unmittelbar vor dem Terminal-Aufruf, gleiches `PROFIL_REFERENZ`-Objekt für beide Aufrufe wiederverwendet.

**Offene, nicht neu von Delta 2 eingeführte Lücke:** Plan-v1 SCOPE.4 (Zeile 161) definiert `verweigereAutorisierung(laufId, referenz, begruendung, optionen?)` — vier Parameter, kein `profilReferenz`. `schreibeWirkungsmarke` (real, Zeile 530-536) verlangt `profilReferenz` als zwingenden zweiten Positionsparameter. Woher `verweigereAutorisierung` diesen Wert für seinen internen Aufruf nimmt, bleibt sowohl in plan-v1 als auch in Delta 2 unbenannt (Delta 2 ändert an dieser Signatur explizit nichts: „Keine Änderung an `verweigereAutorisierung` selbst nötig"). Das ist ein vorbestehender Gap aus plan-v1, keine neue Lücke, die Delta 2 einführt — und war nicht Teil von B1-B5. Da Delta 2s eigener Testfixture-Text aber direkt auf diesen Aufruf angewiesen ist, sollte der Handoff-Vertrag `profilReferenz` für `verweigereAutorisierung` explizit benennen (z. B. als fünften Pflichtparameter), bevor die Ausführungssitzung das selbst entscheidet.

### B18 (zu Delta 3 / B3) — `* -text` ist der technisch richtige Mechanismus; die Startbedingung ist dokumentiert, aber nicht aktiv geprüft
`[Schlussfolgerung]`

**Mechanismus korrekt:** Git wendet Clean-/Smudge-Filter (inkl. `core.autocrlf`) beim Commit (Clean: Arbeitsbaum → Objekt) und beim Checkout (Smudge: Objekt → Arbeitsbaum) an; `git show <hash>:<pfad>`/`git cat-file` liest das gespeicherte Objekt roh, ohne Smudge-Filter erneut anzuwenden. `.gitattributes` mit `* -text` deaktiviert die Text-/EOL-Behandlung vollständig für jede Datei im Repo — dadurch entfällt sowohl Clean- als auch Smudge-Konvertierung, und Arbeitsbaum-Bytes bleiben identisch zu Objekt-Bytes. Das schließt die in B3 beschriebene Divergenz strukturell, sofern `.gitattributes` **vor dem ersten Commit** existiert (Delta 3 verlangt das explizit: „bevor die erste Autorisierungsdatei committet wird") — bereits committete Objekte werden durch später hinzugefügte `.gitattributes`-Regeln nicht rückwirkend verändert, die von Delta 3 vorgeschriebene Reihenfolge vermeidet dieses Problem korrekt.

**Lücke, die der Auftrag explizit angefragt hat:** Delta 3 beschreibt `.gitattributes` als SCOPE.1-Ergänzung (Stefans manueller Schritt) und als „Startbedingung [...] Teil des Handoff-Vertrags", aber an keiner Stelle als **aktiv geprüfte** Bedingung — weder `pruefeAutorisierung` noch ein Gate-Skript liest oder verifiziert `.gitattributes` im **externen** (produktiven) Repo zur Laufzeit; nur das **Wegwerf-Testrepo** des Gate-Skripts (SCOPE.6) legt selbst `* -text` an und beweist damit ausschließlich den korrekt-konfigurierten Fall. Vergisst Stefan `.gitattributes` im echten externen Repo, gibt es (a) keinen Frühwarn-Check, der das vor dem ersten Lauf meldet, und (b) keine im Plan spezifizierte, unterscheidende Fehlermeldung in `pruefeAutorisierung` (z. B. „Divergenz — möglicherweise CRLF/Zeilenenden-Ursache, `.gitattributes` prüfen" statt der generischen Divergenz-`grund`), die eine spurious-rote A2 von einer echten Manipulation unterscheidbar macht. Das Risiko bleibt fail-closed (spurious Rot, keine falsche Freigabe) — also kein Sicherheitsproblem, aber eine Robustheitslücke, die B3s ursprüngliche Sorge nur teilweise adressiert (Mechanismus ja, Absicherung gegen „Stefan vergisst es" nein). Damit trifft exakt die im Auftrag vorformulierte Alternative „nur als Empfehlung ohne Prüfung" zu.

### B19 (zu Delta 4 / B4) — Hashing-Präzedenz exakt korrekt zitiert, real gegen beide Codepfade verifiziert
`[Fakt, entlastend]`

`src/lineage-registry/index.ts:94` (real gelesen): `const inhaltsHash = sha256Hex(kanonischesJson(daten))` in `registriereKernArtefakt` — bestätigt den kern-erzeugten Fall.
`src/lineage-registry/index.ts:127` (real gelesen): `const inhaltsHash = sha256Hex(inhalt)` in `registriereWerkzeugReferenz` — bestätigt den werkzeug-/extern-erzeugten Fall, roh, ohne Kanonisierung, exakt wie Delta 4 behauptet. Die korrigierte SCOPE.3-Formulierung zitiert diese Zeilen korrekt.

**Konsistenzprüfung mit Delta 3, entlastend:** `ARCHITECTURE.md:84` (real gelesen): „CRLF in Dateien, die der Kern schreibt | Der Hash beschreibt die Bytes auf der Platte [...]" — bestätigt die im Projekt durchgängige Philosophie „Hash = exakte Bytes", die Delta 4s rohe Hash-Wahl stützt. Das macht Delta 3s `.gitattributes`-Fix (B18) nicht überflüssig, sondern notwendig: da roh (byte-exakt) gehasht wird, ist jede unbeabsichtigte Zeilenenden-Konvertierung sicherheitsrelevant für den Grün-Fall — beide Deltas sind konsistent aufeinander abgestimmt, keine Widersprüchlichkeit.

### B20 (zu Delta 5 / B5) — Präfix-Ableitung technisch fail-closed, aber zwei vom Auftrag genannte Windows-Randfälle unadressiert
`[Fakt]` + `[offene Unsicherheit]`

Delta 5s Regel (`plan-v2:216-223`): Präfix `C:\Users\stefa\ai-workforce-autorisierung\` abschneiden, dann `\`→`/` normalisieren, sonst `{ok:false}`. Für den Normalfall (Referenz exakt wie in SCOPE.3 spezifiziert, `C:\\Users\\stefa\\...`) funktioniert das.

Zwei vom Auftrag explizit angefragte Randfälle bleiben unbenannt:
- **Groß-/Kleinschreibung:** Ein einfacher String-Präfixvergleich (z. B. `pfad.startsWith(praefix)`) ist case-sensitive; Windows-Pfade sind es dateisystemseitig nicht. Käme `referenz.pfad` mit abweichender Groß-/Kleinschreibung herein (z. B. durch eine andere Pfad-Normalisierungsroutine beim künftigen Aufrufer, Delta 1), würde die Präfixprüfung fälschlich `{ok:false, grund:"pfad ausserhalb..."}` liefern, obwohl es dieselbe Datei ist.
- **Gemischte Pfadtrenner vor dem Abschneiden:** Delta 5 normalisiert `\`→`/` erst **nach** dem Präfix-Abschneiden. Enthielte `referenz.pfad` bereits vor diesem Schritt eine Mischung aus `\` und `/` (z. B. durch eine andere Konstruktionsroutine), würde der reine String-Präfixvergleich ebenfalls potenziell fehlschlagen, bevor die Normalisierung greift.

Beide Fälle führen konsequent zu fail-closed (Rot), nicht zu einer falschen Freigabe — Schwere bleibt wie im ersten Pass niedrig. Da `ARCHITECTURE.md` D8 („Windows [...]: Pfadtrennung [...] sind Architekturthemen", zielfassung.md:310) genau diese Klasse von Themen als explizit architekturrelevant benennt, ist die Lücke nicht rein spekulativ, sondern eine im Projekt bereits als Dauerthema anerkannte Fehlerklasse — vor dem Handoff-Vertrag sollte die Ableitungsregel case-insensitive vergleichen (bzw. beide Seiten vor dem Vergleich normalisieren).

---

## Bewertung — Zuordnung zu B1-B5

| Ursprungsbefund | Delta | Geschlossen? |
|---|---|---|
| B1 (D3 überzieht) | Delta 1 | Ja — Formulierung korrekt, Restlücke konsistent begründet, real belegte Zitate (B16) |
| B2 (A4/A10 technisch unerfüllbar) | Delta 2 | Ja, real gegen Code verifiziert (B17); ein vorbestehender, nicht neu eingeführter Signaturgap (`profilReferenz` in `verweigereAutorisierung`) bleibt offen |
| B3 (CRLF/LF-Risiko) | Delta 3 | Mechanismus ja, technisch korrekt (B18); aktive Prüfung/unterscheidende Fehlermeldung fehlt weiterhin — Hinweis, kein Blocker |
| B4 (Hashing-Präzedenz falsch zitiert) | Delta 4 | Ja, vollständig real verifiziert (B19) |
| B5 (Pfad-Ableitung nicht spezifiziert) | Delta 5 | Kern ja; Case-Insensitivität/gemischte Trenner unadressiert (B20) — bleibt niedrige Schwere wie im ersten Pass |

## Urteil

**Freigegeben mit Hinweisen.**

Begründung: Alle vier ursprünglich blockierenden Befunde (B1-B4) sind in plan-v2 nicht nur behauptet, sondern real — gegen den tatsächlichen Code (`src/checkpoint-store/index.ts`, `src/checkpoint-store/checkpoint-store.test.ts`, `src/lineage-registry/index.ts`) und gegen die zitierten Dokumente (`zielfassung.md`, `umsetzungsplan-fassung-1.md`, `ARCHITECTURE.md`, `features/F1B/feature.md`) — verifiziert gelöst. B2 und B4 sind dabei besonders stark belegt: der korrigierte Testaufbau in Delta 2 führt, Schritt für Schritt durch den realen `stelleLaufstatusFest`-Code gerechnet, exakt zu den behaupteten Status-Werten, und das Präzedenzmuster ist sogar wörtlich im bereits gemergten F1B-Test (`checkpoint-store.test.ts:255-275`) vorzufinden — keine Prosa-Behauptung ohne Gegenprobe. B4s Zitat ist zeilenscharf korrekt. B1 überzieht nicht mehr und bleibt konsistent mit Stefans bereits getroffener Scope-Entscheidung, ohne sie neu aufzurollen.

Kein Fund in diesem Pass erschüttert die von Delta 1-4 gewählte Korrektur oder verlangt eine Rückkehr zu plan-v1s Grundmechanik. Die verbleibenden Punkte sind eng umrissen, niedriger bis mittlerer Schwere, konsequent fail-closed (kein Sicherheits-Bypass) und ohne neue Design-Entscheidung im Handoff-Vertrag nachtragbar:

- **Vor/im Handoff-Vertrag zu ergänzen** (kein Blocker, aber nicht der Ausführungssitzung zu überlassen):
  - B17 — `profilReferenz` für `verweigereAutorisierung` explizit als Parameter benennen (fehlt in plan-v1 SCOPE.4s Signatur, wird für den internen `schreibeWirkungsmarke`-Aufruf zwingend gebraucht).
  - B18 — entweder `pruefeAutorisierung` um eine unterscheidende Fehlermeldung bei Hash-Mismatch ergänzen (Hinweis auf mögliche CRLF-Ursache), oder das Gate-Skript/den Handoff-Vertrag um einen expliziten Vorab-Check von `.gitattributes` im externen Repo als Startbedingungs-Prüfung (nicht nur Prosa) ergänzen.
  - B20 — Pfad-Präfixvergleich in Delta 5 case-insensitive gestalten bzw. beide Seiten vor dem Vergleich normalisieren (Trenner **und** Groß-/Kleinschreibung), bevor der Präfix abgeschnitten wird.
- **Entlastend bestätigt, keine Aktion nötig:** B16 (D3-Korrektur real konsistent), B19 (Delta 4 vollständig real verifiziert, inklusive Konsistenz mit Delta 3).

## Nächster sinnvoller Schritt

Die drei B17/B18/B20-Ergänzungen direkt in den Handoff-Vertrag (`state/tasks/f3-authorization-boundary.md`) aufnehmen — sie sind klein genug, um ohne einen dritten Plan-Entwurf (plan-v3) oder einen weiteren vollständigen Advisor-Pass in SCHRITT 0/SCOPE des Vertrags textlich fixiert zu werden. Ein erneuter Advisor-Pass ist nicht zwingend nötig, sofern der Handoff-Vertrag diese drei Punkte wörtlich (nicht sinngemäß) aufnimmt.

Relevante Dateien: `state/plan-v2-f3-authorization-boundary.md`, `state/plan-v1-f3-authorization-boundary.md`, `src/checkpoint-store/index.ts` (Zeilen 530-592, 697-756), `src/checkpoint-store/checkpoint-store.test.ts` (Zeilen 254-306, 414-430), `src/lineage-registry/index.ts` (Zeilen 85-148), `docs/projekt/zielfassung.md` (Zeile 320), `docs/projekt/umsetzungsplan-fassung-1.md` (Zeilen 56-81), `ARCHITECTURE.md` (Zeile 84), `features/F3/feature.md`.
