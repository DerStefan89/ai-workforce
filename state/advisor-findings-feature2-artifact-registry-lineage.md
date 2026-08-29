# Advisor-Findings — Feature 2: Artifact Registry / Lineage

Slug: feature2-artifact-registry-lineage
Stand: 2026-08-29
Rolle: Advisor (frischer Kontext, Subagent `architecture-advisor`, Muster: `state/advisor-findings-feature1-checkpoint-store.md`)

## Kopf

**Geprüft:**
- `state/plan-v1-feature2-artifact-registry-lineage.md` (vollständig, einziger Plan-Input — Feature-Akte für F2 existiert noch nicht im Repo)

**Gegengeprüft (Fundstellen real nachgeschlagen, nicht aus dem Plantext übernommen):**
`ARCHITECTURE.md` (ganze Datei), `docs/projekt/zielfassung.md` (Abschnitte 7, 8, 16.2–16.8, gezielt Zeilen 141, 330, 372, 378), `schemas/kontrollzustand.schema.json`, `schemas/kontrollzustand.schema.json:38`, `src/checkpoint-store/index.ts` (vollständig), `src/checkpoint-store/types.ts`, `src/checkpoint-store/checkpoint-store.test.ts` (Import-Zeilen), `docs/adr/datenformate-kontrollzustand-und-profile.md`, `features/F1/feature.md`, `state/advisor-findings-feature1-checkpoint-store.md`, `docs/STATUS.md`, `state/memory-map.md`, `state/gates.md` (Checkpoint-Store-Gate-Zeile), Grep über `atomarSchreiben`/`node:test` im gesamten Repo.

**Rollengrenze:** Nur `Read`, `Grep`, `Glob`. Kein Schreibzugriff, kein Bash, kein Git, keine Ausführung — keine Datei geändert.

**Grenze der Prüftiefe:** `src/lineage-registry/` existiert noch nicht (kein Code gebaut) — geprüft wurde ausschließlich die Planlogik gegen Dokumente/Schemas/bestehenden F1-Code, kein Implementierungsverhalten.

## Marker-Legende

`[Fakt]` im Repo belegt · `[Schlussfolgerung]` aus Fakten abgeleitet ·
`[Annahme]` unbelegte Prämisse von Plan/Spec · `[offene Unsicherheit]` weder belegt noch widerlegt.

## Befunde

### B1 — Kernkonflikt: Unabhängiges Schreiben/Versionieren des Lineage-Registry-Moduls vs. ARCHITECTURE.md:39–41 und zielfassung.md A8 — vom Plan nicht geprüft
`[Fakt]` + `[Schlussfolgerung]`

`ARCHITECTURE.md:39` wörtlich: „Schreibend auf `kontrollzustand/` greift ausschließlich der Kern zu, und nur über die append-only Hash-Kette **des Checkpoint Store**." `ARCHITECTURE.md:41`: „Artefakte werden versioniert, nicht überschrieben. Version ist der Inhalts-Hash; die einzige Stelle, die den aktuellen Stand benennt, ist **der letzte Checkpoint**." „Der Kern" ist in `ARCHITECTURE.md:42` explizit von „das Ausführungswerkzeug" abgegrenzt — der Kern ist der `src/`-Code insgesamt, nicht nur `src/checkpoint-store/`. `docs/projekt/zielfassung.md:378` (vom Plan selbst in Abschnitt 0 als A8-Beleg zitiert): „**Geschlossen (A8):** Inhaltsadressiert, kein mutierbarer Zeiger. Version ist der Inhalts-Hash; der letzte Checkpoint ist die einzige Stelle, die den aktuellen Stand benennt."

`features/F1/feature.md:159–163` behandelt exakt diese Zeilen bereits als bindend, nicht als generisches Prosa-Vorbild: „`ARCHITECTURE.md` Abschnitt 2, Zeile 39–41 — **bindend, nicht neu verhandelt**: Schreibzugriff auf `kontrollzustand/` **ausschließlich** über eine append-only Hash-Kette des Checkpoint Store […]." Das ist die einzige bereits gebaute Präzedenz im Repo dafür, wie dieser Satz gelesen wird — und sie liest ihn wörtlich, nicht als übertragbares Muster.

Der vorliegende Plan entwirft `src/lineage-registry/` demgegenüber als eigenständiges, von F1s Hash-Kette **unabhängiges** Schreib- und Versionierungsmodul:
- D3 (`state/plan-v1-feature2-artifact-registry-lineage.md:361–374`) verwirft explizit jede Verkettung (`vorgaenger_hash`-Äquivalent) für Lineage-Versionen.
- SCOPE.3 (`registriereKernArtefakt`, `registriereWerkzeugReferenz`, `haltFestStaleEntscheidung`) schreibt über die aus F1 importierte `atomarSchreiben`-Funktion direkt in `kontrollzustand/<artefakt_id>/lineage(-entscheidungen)/*.json` — nie über `schreibeCheckpoint` und nie in F1s Hash-Kette.
- SCOPE.3 `ladeArtefaktVersion` ermittelt den „aktuellen Stand" **nicht** über „den letzten Checkpoint" (A8), sondern durch eigenes Scannen des Lineage-Verzeichnisses nach dem höchsten `version_sequenz` — genau das Muster, das A8 wörtlich einer einzigen Stelle vorbehält.

Der Plan verifiziert in Abschnitt 0 gezielt `ARCHITECTURE.md:27` und `:81` (F-013-Muster „nicht annehmen, prüfen"), **prüft aber `ARCHITECTURE.md:39–41` an keiner Stelle** — obwohl diese Zeilen für die gewählte Speicherarchitektur (D3, D6, SCOPE.3, SCOPE.5) die eigentlich entscheidende Randbedingung sind und im selben Absatz stehen wie die geprüfte Zeile 27.

`[offene Unsicherheit]`: Es gibt eine plausible Gegenlesart — `docs/projekt/zielfassung.md:16.2` (Modulschnitt) beschreibt „Checkpoint Store" und „Artifact Registry / Lineage" als zwei separate Modulzeilen mit getrennter Verantwortung, und die Checkpoint-Store-Zeile nennt explizit nur zwei Artefakttypen (`Checkpoint`, `Wirkungsmarke`) für ihre gemeinsame Kette — das könnte dafür sprechen, dass Lineage-Einträge bewusst außerhalb dieser Kette liegen sollen. Diese Lesart steht aber im Widerspruch dazu, wie F1 selbst dieselbe ARCHITECTURE.md-Passage bereits ausgelegt hat, und wird vom Plan nicht diskutiert.

**Warum das wichtig ist:** Diese Frage betrifft nicht nur D5 (die Ein-Zeilen-Export-Ergänzung), sondern die gesamte Speicherarchitektur des Features — D3, D6, SCOPE.3 und SCOPE.5 gehen sämtlich davon aus, dass ein zweites, unabhängiges Modul direkt und ohne Kettenbindung nach `kontrollzustand/` schreiben darf. Ein Fehlurteil hier zwingt zu einem grundsätzlichen Redesign (z. B. Lineage-Einträge als `daten`-Payload eines Checkpoints statt als eigene Dateien, oder eine explizite, dokumentierte Ausnahmeregel in ARCHITECTURE.md), nicht zu einer Korrekturrunde.

### B2 — D1 (ein `typ`-Wert `"lineage"` mit `art`-Diskriminator): bestätigt, mit zusätzlicher stützender Evidenz
`[Fakt]` + `[Schlussfolgerung]`

Die vom Plan zitierten Fundstellen sind beide real: `ARCHITECTURE.md:27` nennt wörtlich „Artefakt- und Lineage-Einträge" (zwei Begriffe im Fließtext), `schemas/kontrollzustand.schema.json:38` nennt tatsächlich nur ein Wort „Lineage" unter den vier committeten Erweiterungsarten (`Checkpoint, Wirkungsmarke, Lineage, Transportpaket`) — exakt wie im Plan zitiert.

Zusätzliche, vom Plan nicht herangezogene Stütze: `docs/projekt/zielfassung.md:330` (Modulschnitt-Tabelle) beschreibt „Artifact Registry / Lineage" als **ein** Modul mit integrierter Verantwortung für „Identität, Version, Herkunft, Input-Beziehungen; Veraltungsprüfung" — Identität/Version und Herkunft/Staleness stehen dort in derselben Tabellenzeile, nicht in zwei getrennten Modulen. Das stützt die Lesart des Plans, dass Artefakt-Identität und Lineage-Herkunft konzeptionell ein zusammengehöriger Gegenstand sind, nicht zwei disjunkte `typ`-Ebenen. Die Analogie des Plans zu F1s `sequenz==1`-vs.-`sequenz>1`-Unterscheidung (ein `typ`-Wert, interne Verzweigung) ist strukturell ähnlich, aber nicht identisch: F1s Unterscheidung ist ein Kontinuum desselben Sachverhalts (Kettenposition), `art: "artefakt_version"` vs. `art: "stale_entscheidung"` sind semantisch weiter auseinander (Artefaktzustand vs. menschliche Entscheidung über einen Artefaktzustand). Das schwächt die Analogie leicht, ohne sie zu widerlegen — auch getrennte `typ`-Werte wären technisch gangbar gewesen.

Kein Fund widerspricht der Lesart des Plans. D1 ist als Design-Entscheidung nachvollziehbar begründet und wird durch eine zusätzliche Quelle gestützt, die der Plan selbst nicht genutzt hat. Bestätigt.

### B3 — D5 (Export-Ergänzung an `atomarSchreiben` in F1): bestätigt, real geprüft
`[Fakt, entlastend]`

`src/checkpoint-store/index.ts:198`: `function atomarSchreiben(...)` trägt real kein `export`-Schlüsselwort — Plan-Behauptung korrekt, exakte Zeilenangabe stimmt. `src/checkpoint-store/checkpoint-store.test.ts:18` importiert nur `kanonischesJson, ladeLetztenGueltigenCheckpoint, schreibeCheckpoint, sha256Hex` aus `./index.ts` — `atomarSchreiben` wird im Test nicht referenziert, weder direkt noch indirekt außer über `schreibeCheckpoint`. Ein repoweiter Grep auf `atomarSchreiben` findet die Funktion nur in ihrer eigenen Definitionsdatei und in Planungsdokumenten (`state/plan-v1-...`, `state/plan-v2-...`, `state/tasks/...`, `state/gates.md`) — kein weiterer Konsument in `scripts/` oder `src/`, der von der aktuellen Nicht-Sichtbarkeit abhinge. `kanonischesJson`/`sha256Hex` sind tatsächlich bereits exportiert (Zeilen 56 und 60).

Das Hinzufügen von `export` ist damit real eine reine Sichtbarkeitsänderung ohne Verhaltensänderung, ohne betroffenen Bestandscode, ohne neue Testpflicht — F1s bestehende Tests bleiben unberührt. Alternative (a) (`src/shared/`) wäre bei zwei Nutzern tatsächlich verfrühte Abstraktion. D5 ist bestätigt — **unabhängig davon, ob B1 zu einem Redesign zwingt**: Sollte B1 dazu führen, dass Lineage-Einträge doch über F1s `schreibeCheckpoint`/Kette laufen müssen, würde sich der Bedarf an dieser Export-Ergänzung ohnehin ändern oder entfallen; D5 ist nur innerhalb der aktuellen, in B1 infrage gestellten Architektur korrekt bewertet.

### B4 — Kein `node:test`-Testfile für `src/lineage-registry/` im SCOPE geplant; Gate-Skript deckt laut eigener Beschreibung nicht alle A-Punkte ab
`[Schlussfolgerung]`

`ARCHITECTURE.md:70–72` legt `node:test` als Test-Werkzeug fest. Ein repoweiter Grep über den Plantext auf `test.ts`/`node:test`/`node --test` liefert genau einen Treffer (`state/plan-v1-feature2-artifact-registry-lineage.md:18`) — und der bezieht sich ausschließlich auf F1s bereits existierende `checkpoint-store.test.ts` als Beleg für den F1-Repo-Stand, nicht auf eine geplante Testdatei für dieses Feature. SCOPE.1–12 (Abschnitt 2) listet kein `src/lineage-registry/lineage-registry.test.ts` oder Äquivalent.

Einzige geplante mechanische Prüfung ist `scripts/check-lineage-registry.mjs` (SCOPE.8), mit selbst beschriebenem Umfang a) sieben Fixtures gegen `validiereLineageEintrag`, b) ein synthetischer Stale-Lauf (`registriereKernArtefakt` + zweifaches `pruefeStale`), c) `haltFestStaleEntscheidung` mit/ohne `begruendung`. Gegen die eigenen A1–A13 (Abschnitt 7) geprüft:
- **A1** (AC1, Schreiben+Laden-Rundlauf, inhaltliche Identität) — nicht in a/b/c abgedeckt (b registriert zwar ein Artefakt, prüft aber nur den Stale-Pfad, nicht den vollständigen Rundlauf).
- **A3/A4** (AC3/AC4, zwei Versionen, ältere Version byteidentisch stehen bleibt) — nicht in a/b/c abgedeckt.
- **A13** (AC13, `listeVersionen`-Vollständigkeit) — `listeVersionen` wird in a/b/c laut Beschreibung nicht aufgerufen.

Das ist strukturell derselbe Befund wie F1s B2 (`state/advisor-findings-feature1-checkpoint-store.md:52–87`) — dort allerdings gegen eine bereits vorhandene, wenn auch lückenhafte, Testdatei geprüft; hier fehlt eine Testdatei für den Modulcode vollständig, nur das Gate-Skript bleibt als mechanischer Beleg. `A2` benennt zwar „Byte-Vergleich der geschriebenen Datei im Gate/Test" (Abschnitt 7, A2), ohne dass klar wird, ob „Test" hier eine nicht im SCOPE genannte Datei meint oder das Gate-Skript selbst — Formulierung bleibt vage.

Zu klären vor Umsetzung: entweder eine `lineage-registry.test.ts` explizit ins SCOPE aufnehmen (analog F1), oder für A1/A3/A4/A13 ausdrücklich Code-Review statt automatisierter Prüfung benennen (wie der Plan es für A8/A9/A10 bereits sauber tut) — nicht implizit offenlassen.

### B5 — Zuschnitt-Sorge ist selbst erkannt, aber angesichts B4 möglicherweise zu optimistisch bewertet
`[Annahme]`

Der Plan benennt in Abschnitt 6 selbst das Risiko: zwei orthogonale Diskriminatoren (`art` × `erzeugungsart`) seien „mehr Verzweigung als F1s einzelne `sequenz==1`-Unterscheidung", bewertet es aber als „in einem Durchgang machbar". Real gezählt: sieben öffentliche Modulfunktionen (`registriereKernArtefakt`, `registriereWerkzeugReferenz`, `ladeArtefaktVersion`, `listeVersionen`, `pruefeStale`, `haltFestStaleEntscheidung`, `validiereLineageEintrag`) gegenüber F1s drei (`schreibeCheckpoint`, `ladeLetztenGueltigenCheckpoint`, `validiereCheckpointEintrag`), sieben Beispiel-Fixtures gegenüber F1s vier, zwei Payload-`art`-Varianten mit je eigenen Pflichtfeldsätzen. In Kombination mit B4 (fehlende Testdatei) ist die Selbsteinschätzung „ein Baudurchgang plus höchstens eine Korrekturrunde" plausibel, aber nicht so sicher belegt, wie der Plan es darstellt — insbesondere wenn B1 zusätzlich eine Architekturänderung erzwingt, ist der Zuschnitt in der aktuellen Form kaum zu halten. Nicht blockierend für den Plan als Textdokument, aber ein Punkt, den `plan-v2`/der Handoff-Vertrag realistischer einschätzen sollte.

## Entlastende Befunde

- `[Fakt, entlastend]` `ARCHITECTURE.md:27` exakt wie im Plan zitiert: „Checkpoints, Wirkungsmarken, Artefakt- und Lineage-Einträge, Transportpakete, wegwerfbarer Index."
- `[Fakt, entlastend]` `ARCHITECTURE.md:81` exakt wie im Plan zitiert: Überschreiben eines persistierten Artefakts ist ausnahmslos verbotenes Pattern — der Plan respektiert dies durchgehend (inhaltsadressierte Dateinamen, `atomarSchreiben` schreibt nie über eine bestehende Zieldatei).
- `[Fakt, entlastend]` `docs/projekt/zielfassung.md:141` exakt wie im Plan zitiert (Entscheidung 103/104, STALE-Mechanik, menschliche Entscheidung).
- `[Fakt, entlastend]` `docs/projekt/zielfassung.md:330` exakt wie im Plan zitiert (A7, Eigentümerschaftsregel kern-/werkzeug-erzeugt) — und liefert wie oben (B2) sogar zusätzliche Stütze für D1, über das vom Plan Zitierte hinaus.
- `[Fakt, entlastend]` `docs/projekt/zielfassung.md:372` exakt wie im Plan zitiert (A7 in der Entscheidungsliste, wortgleiche zweite Bestätigung).
- `[Fakt, entlastend]` `schemas/kontrollzustand.schema.json:38` exakt wie im Plan zitiert.
- `[Fakt, entlastend]` `src/checkpoint-store/index.ts:56,60,198` bestätigen die drei Plan-Behauptungen zu Export-Status exakt (`kanonischesJson`/`sha256Hex` exportiert, `atomarSchreiben` nicht).
- `[Fakt, entlastend]` `git ls-tree`-Nachweis im Plan (Abschnitt 0) korrespondiert mit dem real vorgefundenen Zustand: `src/checkpoint-store/` existiert mit `index.ts`, `types.ts`, `checkpoint-store.test.ts`.
- `[Fakt, entlastend]` Der Plan legt seine eigenen offenen Punkte (Abschnitt 10, drei Stück) selbst offen, statt sie stillschweigend zu entscheiden — entspricht der Vorgabe des Advisor-Pass-Skills. Punkt 2 (D5) benennt sogar korrekt, dass diese Änderung „außerhalb des reinen ‚neuer Ordner unter `src/`'-Rahmens" liegt — der Plan-Autor hat also selbst gespürt, dass hier eine Grenze berührt wird, auch wenn die konkrete ARCHITECTURE.md:39–41-Kollision (B1) nicht gefunden wurde.
- `[Fakt, entlastend]` `state/gates.md`/`docs/STATUS.md`/`state/memory-map.md` sind an den vom Plan referenzierten Stellen (Checkpoint-Store-Gate-Zeile, Feature-1-Eintrag, Checkpoint-Store-Modul-Zeile) real vorhanden und decken sich mit den Plan-Behauptungen zum aktuellen Repo-Stand.

## Urteil

**Nicht freigegeben.**

Zu klären vor Umsetzung (blockiert `plan-v2` in der aktuellen Form):
- **B1** — Kernkonflikt zwischen der geplanten unabhängigen Schreib-/Versionierungsarchitektur des Lineage-Registry-Moduls (D3, D6, SCOPE.3, SCOPE.5) und der wörtlichen, von F1 bereits als „bindend, nicht neu verhandelt" ausgelegten Regel in `ARCHITECTURE.md:39–41` sowie `zielfassung.md` A8 („der letzte Checkpoint" als einzige Stelle, die den aktuellen Stand benennt). Der Plan prüft diese Zeilen an keiner Stelle, obwohl seine eigene Methodik („F-013-Muster — nicht annehmen, prüfen") das für benachbarte Zeilen (27, 81) tut. Auflösung gehört zum Menschen/Architekturverantwortlichen: entweder Redesign (Lineage-Einträge laufen über F1s Kette bzw. `schreibeCheckpoint`), oder eine explizit dokumentierte, im ADR/ARCHITECTURE.md festgehaltene Ausnahme für Artifact-Registry-/Lineage-Schreibzugriffe — nicht stillschweigend im Plan entscheiden.
- **B4** — Fehlende `node:test`-Datei für `src/lineage-registry/` im SCOPE; Gate-Skript deckt A1/A3/A4/A13 laut eigener Beschreibung nicht ab. Vor Umsetzungsbeginn Testabdeckung explizit zuordnen (Testdatei oder benannte Code-Review-Ausnahme wie bei A8–A10).

Dürfen mitlaufen, im Handoff-Vertrag konkretisiert, nicht blockierend:
- **B5** — Zuschnitt-Realismus („ein Durchgang plus eine Korrekturrunde") gegen den tatsächlichen Funktionsumfang (7 öffentliche Funktionen, 2 Diskriminatoren, 7 Fixtures) nachschärfen, insbesondere falls B1 zu einem Redesign zwingt.

Bestätigt, kein offener Klärbedarf:
- **B2** (D1, ein `typ`-Wert `"lineage"` mit `art`-Diskriminator) — plausibel, durch zusätzliche Quelle (`zielfassung.md:330`) gestützt, kein Widerspruch gefunden.
- **B3** (D5, Export-Ergänzung an `atomarSchreiben`) — real geprüft, reine Sichtbarkeitsänderung, keine betroffenen Bestandskonsumenten, F1-Tests unberührt. Bewertung gilt nur innerhalb der aktuellen, durch B1 infrage gestellten Architektur.

Alle im Plantext zitierten Fundstellen (`ARCHITECTURE.md:27/81`, `zielfassung.md:141/330/372/378`, `schemas/kontrollzustand.schema.json:38`, F1-Zeilenangaben) sind real und wortgetreu belegt — keine einzige erwies sich als falsch zitiert. Die Beanstandung betrifft nicht die Genauigkeit der Zitate, sondern eine Lücke in der Prüfabdeckung (die entscheidende Nachbarzeile 39–41 wurde nicht geprüft) und eine fehlende Testfile-Zuordnung.

## Nächster sinnvoller Schritt

B1 zuerst klären — vor jeder weiteren Planarbeit: entweder mit dem Menschen/Architekturverantwortlichen entscheiden, ob Lineage-Einträge über F1s Checkpoint-Kette laufen müssen (Redesign von D3/D6/SCOPE.3/5) oder ob `ARCHITECTURE.md:39–41` um eine explizite, dokumentierte Ausnahme für die Artifact Registry / Lineage ergänzt wird (dann als ADR/ARCHITECTURE.md-Änderung, nicht stillschweigend im Feature-Plan). Erst danach `plan-v2-feature2-artifact-registry-lineage.md` schreiben, das B1 auflöst, B4 mit einer expliziten Test-/Review-Zuordnung schließt, B5 realistischer einschätzt und B2/B3 unverändert übernimmt.
