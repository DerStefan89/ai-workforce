SCHRITT 0: Arbeitsverzeichnis ausgeben und gegen das im Auftrag genannte Zielverzeichnis prüfen. Bei Abweichung: abbrechen, melden, nichts ändern.

Zielverzeichnis: Repo DerStefan89/ai-workforce, Branch
`feature/f3-authorization-boundary` (von `main` abgeleitet, vor
Ausführung mit Stefan bestätigen).

## TASK: f3-authorization-boundary

GOAL: Ein neues, eigenständiges Modul `src/authorization-boundary/`
prüft eine Freigabe-/Verweigerungsentscheidung, die in einem lokalen
Git-Repository außerhalb dieses Produkt-Repos liegt
(`C:\Users\stefa\ai-workforce-autorisierung\`), indem es den echten
Inhalt am referenzierten Commit liest (`git show <commit_hash>:<pfad>`)
und gegen eine im Kontrollzustand mitgeführte Referenz aus Pfad +
Commit-Hash + Datei-Hash abgleicht — nie gegen die Referenz allein. Bei
Verweigerung wird F1Bs bestehendes Terminalartefakt `VERWEIGERT`
wiederverwendet. Die Akzeptanzkriterien A1–A18 aus
`state/plan-v1-f3-authorization-boundary.md` (plan-v1 + Delta 1–5 aus
`state/plan-v2-f3-authorization-boundary.md`) sind erfüllt, inklusive
der drei Nachbesserungen aus dem zweiten Advisor-Pass (B17/B18/B20
unten).

CONTEXT:
- [Fakt] Vollständiger Plan: `state/plan-v2-f3-authorization-boundary.md`
  (Delta zu `state/plan-v1-f3-authorization-boundary.md`, der unverändert
  stehen bleibt und für alle nicht in plan-v2 erwähnten Abschnitte
  weiterhin gilt — Abschnitt 0 Verifikation, 1 Ziel, D1/D2
  Design-Entscheidungen, 5 Ablageort, 8 Rollen). Dieser Vertrag ist eine
  Ausführungsanweisung dazu; bei Widerspruch gilt plan-v2, bei dessen
  Schweigen plan-v1.
- [Fakt] Erster Advisor-Pass
  (`state/advisor-findings-f3-authorization-boundary.md`): NICHT
  FREIGEGEBEN auf plan-v1 wegen B1 (D3 überzieht: schließt nur die
  „Veränderung"-Hälfte von E-189), B2 (A4/A10 technisch nicht erfüllbar
  ohne vorherige `RUN_PREPARED`-Marke), B3 (CRLF/LF-Risiko beim
  Arbeitsbaum-vs.-`git show`-Vergleich), B4 (Hashing-Präzedenz falsch
  zitiert). B6-B10 waren entlastend, bestätigt — D1 (eigenes Modul), D2
  (Commit-Pinning), AC2-Umsetzung, Zuordnung, Kein-F1B-Touch-Behauptung
  brauchen keinen Umbau.
- [Fakt] Zweiter Advisor-Pass, nur auf das Delta
  (`state/advisor-findings-f3-authorization-boundary-v2.md`):
  **FREIGEGEBEN MIT HINWEISEN.** B1-B4 sind real gegen den Code
  verifiziert vollständig gelöst (Delta 1-4). B5 (Delta 5) im Kern
  gelöst. Drei konkrete Nachbesserungen, die dieser Vertrag wörtlich
  aufnimmt (SCOPE unten): B17, B18, B20.
- [Fakt] Feature-Akte: `features/F3/feature.md`, `Status:
  READY_FOR_TECH`. Ziel/Scope/Nicht-Ziele/Akzeptanzkriterien dort sind
  die Produktsicht; plan-v2 ist die technische Ausprägung. Bei
  Widerspruch gilt `features/F3/feature.md` für WAS, plan-v2/plan-v1 für
  WIE.
- [Fakt] Dependency erfüllt: F1B (Wirkungsmarke/Terminalartefakt),
  gemergt (`main` Commit `8520714`). `schreibeWirkungsmarke` (Signatur:
  `src/checkpoint-store/index.ts:530-536`,
  `(laufId, profilReferenz, art, zusatz, optionen?)`) und
  `stelleLaufstatusFest` (`src/checkpoint-store/index.ts:672-756`)
  bleiben unverändert — F3 ruft sie ausschließlich von außen auf, kein
  F1B-Touch (real verifiziert, zweiter Advisor-Pass B17).
- [Fakt] `stelleLaufstatusFest` liefert für eine `lauf_id`-Kette ohne
  vorangehende `run_prepared`-Marke `{ status: 'NICHT_GESTARTET',
  terminaleOhneRunPrepared: [...] }`, **nicht** `ABGESCHLOSSEN` — auch
  wenn ein Terminal-Eintrag existiert (`src/checkpoint-store/index.ts:
  697-756`, real durchgerechnet im zweiten Advisor-Pass, B17). Deshalb
  schreibt der Testaufbau in SCOPE.6/7 immer zuerst eine
  `run_prepared`-Marke, bevor `verweigereAutorisierung` aufgerufen wird.
- **[Fakt, löst B17 — zweiter Advisor-Pass] `verweigereAutorisierung`
  nimmt `profilReferenz` als expliziten Pflichtparameter:**
  plan-v1 SCOPE.4 hatte die Signatur `verweigereAutorisierung(laufId,
  referenz, begruendung, optionen?)` ohne `profilReferenz` — der interne
  Aufruf von `schreibeWirkungsmarke` verlangt ihn aber zwingend als
  zweiten Positionsparameter. Korrigierte Signatur für diesen Vertrag:
  `verweigereAutorisierung(laufId: string, profilReferenz:
  ProfilReferenz, referenz: AutorisierungsReferenz, begruendung: string,
  optionen?: Optionen): { pfad: string; selbstHash: string }` — reicht
  `profilReferenz` unverändert an `schreibeWirkungsmarke(laufId,
  profilReferenz, 'terminal', { ergebnis: 'VERWEIGERT', daten: {
  autorisierung: referenz, begruendung } }, optionen)` weiter.
- **[Fakt, löst B18 — zweiter Advisor-Pass] `.gitattributes`-Startbedingung
  aktiv geprüft, unterscheidende Fehlermeldung bei Hash-Mismatch:**
  `pruefeAutorisierung` prüft vor dem eigentlichen Hash-Vergleich, ob im
  externen Repo eine `.gitattributes`-Datei mit `* -text` existiert
  (`git show <commit_hash>:.gitattributes` gegen denselben Commit lesen,
  Inhalt auf `* -text` als eigene Zeile prüfen, whitespace-toleranter
  Vergleich). Fehlt sie oder weicht sie ab: `{ ok: false, grund:
  "externes Repo ohne '.gitattributes: * -text' — Zeilenenden nicht
  gepinnt, Hash-Vergleich nicht zuverlässig" }`, **kein**
  Hash-Vergleich wird überhaupt versucht (fail-closed vor der eigentlichen
  Prüfung, nicht danach). Liegt `.gitattributes` korrekt vor und schlägt
  der Hash-Vergleich trotzdem fehl, bleibt die reguläre
  Divergenz-Fehlermeldung (`{ ok: false, grund: "Inhalt am referenzierten
  Ort weicht von der Referenz ab" }`) unverändert — die
  `.gitattributes`-Prüfung ersetzt die Divergenz-Erkennung nicht,
  sondern schließt eine falsche Diagnoseursache vorab aus. Deckt B18
  vollständig: eine vergessene `.gitattributes` wird jetzt aktiv erkannt
  und mit eigener, unterscheidbarer Meldung gemeldet, statt als generische
  Divergenz durchzugehen.
- **[Fakt, löst B20 — zweiter Advisor-Pass] Case-insensitive,
  trennernormalisierte Präfix-Ableitung für den repo-relativen Pfad:**
  Vor dem Präfixvergleich werden **beide** Seiten (der fest konfigurierte
  Repo-Root aus SCOPE.1 und `referenz.pfad`) auf denselben Normalform
  gebracht: alle `\` zu `/`, danach `.toLowerCase()` (Windows-Pfade sind
  dateisystemseitig case-insensitive). Erst danach greift
  `pfadNormalisiert.startsWith(praefixNormalisiert)`. Der
  **zurückgegebene** repo-relative Pfad für `git show` wird aus dem
  **originalen, nicht kleingeschriebenen** `referenz.pfad` (nur
  trennernormalisiert) extrahiert — die Kleinschreibung dient
  ausschließlich dem Vergleich, nicht der tatsächlichen `git
  show`-Pfadangabe (Groß-/Kleinschreibung im committeten Pfad selbst
  bleibt maßgeblich). Liegt der normalisierte `referenz.pfad` nicht unter
  dem normalisierten Präfix: `{ ok: false, grund: "pfad ausserhalb des
  erwarteten externen Repos" }`, kein `git show`-Aufruf.
- [Fakt] Referenzformat (plan-v2 Delta 4, korrigiert): `{ pfad: string,
  commit_hash: string, datei_hash: string }`. `datei_hash =
  sha256Hex(inhalt)` — roher Dateiinhalt, **keine** Kanonisierung (Muster:
  `registriereWerkzeugReferenz`, `src/lineage-registry/index.ts:127`,
  nicht `kanonischesJson` wie F0/F1s kern-erzeugte Payloads). Beide
  gelesenen Inhalte (Arbeitsbaum via `readFileSync`, Commit via `git
  show`) werden roh gehasht und verglichen; Schema-Validierung passiert
  danach, separat, auf dem geparsten Inhalt.
- [Fakt] Externes Repo `C:\Users\stefa\ai-workforce-autorisierung\` mit
  `.gitattributes` (`* -text`, angelegt **vor** dem ersten Commit) ist
  eine Startbedingung dieses Vertrags, von Stefan vor Ausführung
  anzulegen (D16 — das Ausführungswerkzeug legt es nicht selbst an,
  plan-v1 Abschnitt 3/6). Existiert es beim Start nicht → ESCALATE
  (siehe unten); der reale externe Ordner wird von diesem Vertrag nicht
  angelegt, nur das Wegwerf-Testrepo des Gate-Skripts (SCOPE.6).
- [Fakt] `package.json`: `check` und `check:template`
  (`package.json:17-18`) sind zwei unabhängige Skript-Strings —
  `check-f3-authorization-boundary.mjs` einzeln in beide eintragen,
  direkt nach `check-f1b-wirkungsmarke.mjs` (bestehende
  Reihenfolge-Konvention).
- [Fakt] Referenzmuster für das Gate-Skript:
  `scripts/check-f1b-wirkungsmarke.mjs` — importiert
  Validierungs-/Kernfunktionen direkt aus dem Modul statt einen zweiten
  Regelsatz nachzubauen.
- [Fakt] Gültige `Status`-Werte laut `docs/projekt/zielfassung.md` §6:
  `ENTWURF, READY_FOR_TECH, WORKSTREAM_SCHNITT_GENEHMIGT, IN_ARBEIT,
  FEATURE_GATE, ABGESCHLOSSEN, BLOCKIERT, ABGEBROCHEN`.

SCOPE:
1. `schemas/kontrollzustand-autorisierung-payload.schema.json` —
   Struktur der externen Autorisierungsdatei (plan-v1 SCOPE.2): `lauf_id`,
   `entscheidung: "FREIGEGEBEN" | "VERWEIGERT"`, `zeitstempel`,
   `begruendung` (Pflicht bei `VERWEIGERT`, sonst optional).
   `additionalProperties: false`. Diese Schema-Definition liegt im
   Produkt-Repo (nur Struktur, nie Daten), die Dateien selbst liegen im
   externen Repo.
2. `src/authorization-boundary/index.ts` — neues, eigenständiges Modul
   (D1, kein Checkpoint-Store-Touch):
   - `pruefeAutorisierung(referenz: AutorisierungsReferenz, optionen?):
     { ok: true; entscheidung: 'FREIGEGEBEN' | 'VERWEIGERT'; eintrag } |
     { ok: false; grund: string }` — Ablauf: (1) Pfad-Präfixprüfung
     case-insensitive/trennernormalisiert (siehe CONTEXT „löst B20"),
     fail-closed bei Pfad außerhalb; (2) `.gitattributes`-Startbedingung
     aktiv prüfen (siehe CONTEXT „löst B18"), fail-closed bei fehlender/
     abweichender Regel; (3) Inhalt am Arbeitsbaum-Pfad und via `git show
     <commit_hash>:<repo-relativer-pfad>` lesen, beide roh hashen
     (`sha256Hex`, kein `kanonischesJson`), gegen `referenz.datei_hash`
     vergleichen — Abweichung eines der beiden oder Divergenz zwischen
     beiden → fail-closed mit Divergenz-`grund`; (4) Schema-Validierung
     des geparsten Inhalts gegen SCOPE.1; (5) bei allem grün: `{ ok: true,
     entscheidung, eintrag }`. Kein Wurf bei einem der vier
     Rot-Fälle — regulärer, benannter Ausgang (D4-Muster wie F1Bs
     `stelleLaufstatusFest`).
   - `verweigereAutorisierung(laufId, profilReferenz, referenz,
     begruendung, optionen?)` — Signatur wie CONTEXT „löst B17" oben,
     dünner Aufrufer von `schreibeWirkungsmarke(..., 'terminal', {
     ergebnis: 'VERWEIGERT', daten: { autorisierung: referenz,
     begruendung } })`. Keine eigene Logik über F1Bs bestehende Funktion
     hinaus.
3. `src/authorization-boundary/types.ts` — `AutorisierungsReferenz` (
   `pfad`, `commit_hash`, `datei_hash`), eigene `Ereignisname`-Union
   (`autorisierung_geprueft`, `autorisierung_abgelehnt`) — **kein**
   Eingriff in `src/checkpoint-store/types.ts`s `Ereignisname`.
4. `src/authorization-boundary/authorization-boundary.test.ts` —
   `node:test`-Fälle für plan-v1 AC7 (vier Fälle: echte Freigabe, echte
   Verweigerung inkl. F1B-Terminalartefakt-Beleg über
   `stelleLaufstatusFest`, manipulierte Referenz, fehlender geschützter
   Ort), jeweils mit einem echten Wegwerf-Git-Repo als Fixture
   (`.gitattributes: * -text` vor dem ersten Commit, Muster wie plan-v2
   Delta 3). Zusätzlich: Testfall „`.gitattributes` fehlt im externen
   Repo" → `{ ok: false }` mit der spezifischen B18-Fehlermeldung, nicht
   der generischen Divergenz-Meldung. Zusätzlich: Testfall
   „Verweigerung ohne vorangehende `RUN_PREPARED`-Marke" →
   `stelleLaufstatusFest` liefert real `NICHT_GESTARTET`/
   `terminaleOhneRunPrepared` (Regressionsbeleg gegen B2/B17, kein
   stillschweigendes Umgehen von F1Bs bestehendem Verhalten).
5. `scripts/check-f3-authorization-boundary.mjs` — Gate-Skript, Muster
   wie `check-f1b-wirkungsmarke.mjs`: legt ein Wegwerf-Git-Repo unter
   einem Temp-Pfad an (`git init`, `.gitattributes: * -text` **vor** dem
   ersten Commit, ein Commit mit gültiger Autorisierungsdatei), prüft
   `pruefeAutorisierung` dagegen (Grün-Fall), einen manipulierten Fall
   (Arbeitsbaum nach dem Commit verändert, ohne neuen Commit —
   Divergenz-Fall, Rot erwartet), einen Fehlt-Fall (Pfad existiert
   nicht, Rot erwartet), und einen `\r\n`-Zeilenenden-Fall bei korrekt
   konfiguriertem `.gitattributes` (Grün erwartet, belegt Delta 3/B18).
   Räumt den Temp-Pfad danach auf. Eingehängt in `npm run check` UND
   `npm run check:template`, je einzeln eintragen, direkt nach
   `check-f1b-wirkungsmarke.mjs`.
6. `state/gates.md` — neue Tabellenzeile
   `check-f3-authorization-boundary.mjs`, Rot-/Grün-Beleg erst nach dem
   realen Lauf eintragen.
7. `state/memory-map.md` — neue Zeile „Authorization-Boundary-Modul" →
   `src/authorization-boundary/`,
   `schemas/kontrollzustand-autorisierung-payload.schema.json`, „nicht
   hierhin": nicht in `src/checkpoint-store/`, keine
   Entscheidungsinhalte im Produkt-Repo (nur Schema, nie Daten).
8. `docs/STATUS.md` — Eintrag unter „Erledigt" nach Bau.
9. `features/F3/journal.md` — Nachträge: Advisor-Pass 1, plan-v2,
   Advisor-Pass 2, dieser Vertrag, Ausführung.

NICHT:
- Invocation Policy / Protection Validator (Deliverable 2, Feature #4).
- Jeder Prozessstart, Claude-Code-Gateway (Deliverable 3).
- UI/Leitstand-Anzeige einer Autorisierungsentscheidung.
- OS-seitige Durchsetzung der Schreibsperre — ausdrücklicher Nicht-Ziel-
  Rand (feature.md, plan-v1 Abschnitt 3, plan-v2 Delta 1). Die
  „Erzeugungs"-Hälfte von E-189 (ob der referenzierte Commit tatsächlich
  von einem Menschen stammt) bleibt in diesem Feature ungeprüft — bereits
  entschiedene Scope-Grenze, nicht in diesem Vertrag erneut zu verhandeln.
- Erzeugung der `referenz` (`pfad`/`commit_hash`/`datei_hash`) aus dem
  externen Repo — Aufrufer-Verantwortung, außerhalb von F3, analog zur
  `lauf_id`-Vergabe in F1B (plan-v2 Delta 1).
- Schreiben einer `RUN_PREPARED`-Marke durch F3 selbst — bleibt
  Aufrufer-Verantwortung (Execution Controller); Tests schreiben sie
  über F1Bs bestehende `schreibeWirkungsmarke` als Testvoraussetzung
  (plan-v2 Delta 2).
- Ein neuer, vierter Terminalzustand — `VERWEIGERT` aus F1B wird
  wiederverwendet.
- Eine zweite Hash-Kette für das externe Repo (D2, plan-v1).
- Automatisches `git init`/`.gitattributes`-Anlegen des externen Ordners
  durch das Ausführungswerkzeug — Stefans Aufgabe vor Ausführung, siehe
  ESCALATE.
- Änderung von `src/checkpoint-store/types.ts`s `Ereignisname`-Union oder
  sonstigen F1B-Exporten/-Signaturen.
- Signatursignierung (GPG/SSH) oder sonstige Autor-/Committer-Prüfung des
  externen Commits — Teil der bewusst offen gelassenen
  „Erzeugung"-Lücke (siehe oben), nicht dieses Vertrags.
- `git add`/`git commit` im Schreibpfad ohne frische Freigabe.

BUDGET: Ein Baudurchgang plus höchstens eine Korrekturrunde. Zweites Rot
auf demselben Gate ⇒ BLOCKIERT ⇒ Mensch.

OUTPUT:
- Neue Dateien:
  `schemas/kontrollzustand-autorisierung-payload.schema.json`,
  `src/authorization-boundary/{index,types}.ts`,
  `src/authorization-boundary/authorization-boundary.test.ts`,
  `scripts/check-f3-authorization-boundary.mjs`.
- Geänderte Dateien: `package.json` (`check` und `check:template`),
  `state/gates.md`, `state/memory-map.md`, `docs/STATUS.md`,
  `features/F3/journal.md`.
- Beleg: `npm run check` und `npm run check:template` grün, Konsolen-
  Ausgabe im Bericht zeigen. Kalibrierungstest für das Gate-Skript: Grün-
  Fall, Divergenz-Fall, Fehlt-Fall, CRLF-Fall (SCOPE.5) je einmal real
  auslösen und den erwarteten Rot-/Grün-Ausgang zeigen. Kalibrierungstest
  für `authorization-boundary.test.ts`: für jeden der sechs Testfälle
  (SCOPE.4) den Rot-Fall real auslösen (temporäre Fixture-Manipulation),
  Fehlschlag zeigen, zurücknehmen, Grün-Zustand zeigen. Regressionsbeleg:
  bestehende `checkpoint-store.test.ts`-Fälle bleiben unverändert grün
  (kein F1B-Touch).
- Commit ausschließlich mit expliziten Pfaden (nie `-A`/`.`), `git-flow`-
  Skill nutzen, kein Commit ohne frische Freigabe, Push separat
  autorisiert.
- Bericht: was geändert wurde, welche Checks liefen (alle
  Rot-/Grün-Kalibrierungen), Ergebnis, echte Blocker.

ESCALATE:
- `C:\Users\stefa\ai-workforce-autorisierung\` existiert beim Start nicht
  oder trägt keine `.gitattributes: * -text` → abbrechen, melden, nichts
  anlegen. Das Anlegen ist Stefans Aufgabe (plan-v1 Abschnitt 6), nicht
  Teil dieses Vertrags.
- `state/plan-v2-f3-authorization-boundary.md` oder
  `state/advisor-findings-f3-authorization-boundary-v2.md` fehlt oder
  widerspricht diesem Vertrag → abbrechen, melden, nichts anlegen.
- Einer der Kalibrierungstests reproduziert sich nicht wie hier
  beschrieben → anhalten, welcher Fall betrifft es, was tatsächlich
  passierte, melden. Nicht das Skript/den Test so lange anpassen, bis
  irgendein Fehler auftritt.
- `npm run check` wird rot an einem Glied, das dieser Auftrag nicht
  angefasst hat (insbesondere `checkpoint-store.test.ts`, F1B) →
  anhalten und melden. Kein Nachziehen fremder Stellen.
- Eine der vorgegebenen Formulierungen (SCOPE/Referenzformat/
  Fehlermeldungen, insbesondere die Signaturen aus CONTEXT „löst B17"
  oder die Prüfreihenfolge aus „löst B18"/„löst B20") widerspricht
  `features/F3/feature.md` oder `docs/projekt/zielfassung.md` →
  anhalten, beide Stellen zitieren, melden. Nicht selbst entscheiden,
  welche gilt.
- `git commit` oder `git push` wird ohne frische Freigabedatei verlangt
  → nicht ausführen.

Vertrag endet mit Freigabe-Halt: kein Bau, kein Commit, kein Push in
diesem Schritt. Ausführung erst nach Stefans expliziter, frischer
Freigabe.
