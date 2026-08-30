# Advisor-Findings — Feature F1B: Wirkungsmarke / RUN_PREPARED / Terminalartefakt

Slug: f1b-wirkungsmarke
Stand: 2026-08-30
Rolle: Architecture Advisor, frischer Kontext, Subagent `architecture-advisor`

## Kopf

**Geprüft:**
- `state/plan-v1-f1b-wirkungsmarke.md` (vollständig)
- `features/F1B/feature.md` (vollständig — Ziel/Scope/Nicht-Ziele/AC1-8)

**Gegengeprüft (real gelesen, nicht aus dem Plantext übernommen):**
`docs/projekt/zielfassung.md` (§16.2 Modulschnitt-Tabelle Z.329, §16.4
Z.346-352, §16.5 Z.354-356, §16.6 Z.360-362, §16.8 Z.372-373,
Architecture-Driver-Liste D1-D16 Z.303-318), `ARCHITECTURE.md` (ganze
Datei, insbesondere Abschnitt 2 Z.36-44, Abschnitt 4 Z.56-64, Abschnitt 7
Z.74-87), `src/checkpoint-store/index.ts` (vollständig, insbesondere
Z.121-189, 255-361, 370-417, 424-495), `src/checkpoint-store/types.ts`
(vollständig), `src/lineage-registry/index.ts` (vollständig),
`state/plan-v2-feature2-artifact-registry-lineage.md` (Delta 1, „Kernidee"
Z.33-73), `state/advisor-findings-feature2-artifact-registry-lineage.md`
(B1-B5), `schemas/kontrollzustand.schema.json`,
`schemas/kontrollzustand-checkpoint-payload.schema.json`,
`schemas/kontrollzustand-lineage-payload.schema.json`,
`state/plan-v1-feature1-checkpoint-store.md` (Grep auf D2/D9/D10),
`src/checkpoint-store/checkpoint-store.test.ts` (Grep auf `typ`-bezogene
Testfälle — keine Treffer).

**Rollengrenze:** Nur `Read`, `Grep`, `Glob`. Kein Schreibzugriff, kein
Bash, kein Git, keine Ausführung — keine Datei geändert.

**Grenze der Prüftiefe:** `src/checkpoint-store/index.ts` wird geprüft im
heutigen, gemergten Zustand (Commit `0f303e8` und danach). Der geplante
F1B-Code existiert nicht — geprüft wurde ausschließlich Planlogik gegen
real existierenden Code/Doku, kein Implementierungsverhalten.

## Marker-Legende

`[Fakt]` im Code/Dokument belegt · `[Schlussfolgerung]` aus Fakten
abgeleitet · `[Annahme]` unbelegte Prämisse · `[offene Unsicherheit]`
weder belegt noch widerlegt.

## Befunde

### B1 — D1 (eigener Hüllen-`typ: "wirkungsmarke"`) ist textlich sauber und stärker begründet als F2s Option A war
`[Fakt]` + `[Schlussfolgerung, entlastend]`

`docs/projekt/zielfassung.md:352` und `:362` belegen die vom Plan
zitierte Formulierung wörtlich: „`RUN_PREPARED`-**Wirkungsmarke** *(A5 —
`RUN_PREPARED` ist eine Wirkungsmarke, kein Checkpoint)*" bzw.
„`RUN_PREPARED` (**Wirkungsmarke**, nicht Checkpoint — *A5*)".
`zielfassung.md:329` (Modulschnitt-Tabelle) benennt „zwei Artefakttypen"
ausdrücklich als Verantwortung des Checkpoint Store. `ARCHITECTURE.md:27`
listet „Checkpoints, Wirkungsmarken, Artefakt- und Lineage-Einträge" als
vier separate Begriffe im selben Aufzählungssatz — konsistent mit zwei
Artefakttypen, nicht mit einem Typ + innerem Diskriminator.

Zur im Auftrag gestellten Frage („gibt es einen Weg, A5 einzuhalten UND
F2s Muster wörtlich zu übertragen?"): Nein, nicht ohne A5 semantisch zu
unterlaufen. Der Unterschied zu F2 ist real, nicht nur behauptet: Für
Lineage-vs-Checkpoint existiert **keine** vergleichbare A-Entscheidung,
die die beiden Begriffe explizit als Typ-Gegensatz benennt — F2s
B1-Konflikt betraf ausschließlich den *Speicherort* (`ARCHITECTURE.md:
39-41`), nicht die Typ-Bezeichnung. Für Wirkungsmarke existiert dagegen
eine wörtliche, zweimal wiederholte A5-Formulierung, die genau den
Hüllen-`typ` betrifft. D1 ist damit nicht nur nachvollziehbar, sondern
besser belegt als F2s eigene Option-A-Entscheidung war. Kein Fund
widerspricht dieser Lesart.

### B2 — Kettenprüfung (D3) und B6-Fix bleiben bei typ-Dispatch strukturell unberührt — bestätigt
`[Fakt]` + `[Schlussfolgerung, entlastend]`

`src/checkpoint-store/index.ts:334-357` (`istKandidatGueltig`) verkettet
ausschließlich über `eintrag.payload.selbst_hash`/`payload.
vorgaenger_hash`/`payload.sequenz` — Felder, die in jedem Payload-Schema
(Checkpoint wie geplante Wirkungsmarke laut SCOPE.1) identisch benannt
und identisch geregelt sind. Der Rückwärtslauf selbst liest nirgends
`eintrag.typ`. Der B6-Fix (Z.292-300, Dateiname-vs-Inhalt-Hash-Abgleich)
sitzt in `pruefeEinzelnenKandidaten`, nach dem Aufruf der (dispatchten)
Validierungsfunktion, ebenfalls typ-agnostisch. `echterInhaltsHash`
(Z.64-67) hasht den gesamten Eintrag inklusive `typ` — eine Manipulation
des `typ`-Felds würde also den Hash brechen, nicht nur die
Payload-Validierung umgehen.

Der einzige Punkt, an dem der Dispatch **tatsächlich** in bestehende
Logik eingreift, ist `pruefeEinzelnenKandidaten:286`
(`validiereCheckpointEintrag(geparst)` → bedingt). Solange der Dispatch
als echter Dreiwege-Zweig implementiert wird (`typ === 'checkpoint'` →
Checkpoint-Validierung; `typ === 'wirkungsmarke'` → Wirkungsmarke-
Validierung; sonst → Regelverstoß, kein Absturz — wörtlich wie Plan D3
es beschreibt), wird die Kettenmechanik selbst weder geschwächt noch
umgangen. Diese Analyse deckt sich mit der Planbehauptung in Abschnitt
4/D3.

**Aber (siehe B3):** Dieser Dreiwege-Zweig ist im Plan nur als
Prosa-Absicht formuliert, nicht als Akzeptanzkriterium abgesichert.

### B3 — Kein AC/Testfall für gemischte Ketten und für unbekannten `typ` beim Kettenladen — Lücke gegenüber dem vom Auftrag geforderten Fokus A
`[Fakt]` + `[Schlussfolgerung]`

Grep über `checkpoint-store.test.ts` auf `typ`-bezogene Assertions
liefert keinen Treffer — es existiert heute **kein** Test, der prüft,
dass eine Kette mit falschem/unbekanntem `typ` beim Laden korrekt als
Regelverstoß (nicht Absturz, nicht stillschweigende Annahme) behandelt
wird. A1-A19 (Plan Abschnitt 7) decken diesen Fall ebenfalls nicht ab:
A4 prüft Schreiben+Laden einer Wirkungsmarke „in derselben Kette wie
zuvor geschriebene Checkpoints", aber ohne den Rückwärtslauf über eine
**gemischte** Sequenz (z. B. Checkpoint→Wirkungsmarke→Checkpoint→
Wirkungsmarke) end-to-end via `ladeGueltigeCheckpoints` zu erzwingen,
und A9-A13 testen ausschließlich reine Wirkungsmarke-Paare
(`run_prepared`→Terminal) ohne dazwischenliegenden echten Checkpoint.
Ein Eintrag mit `typ` außerhalb von `checkpoint`/`wirkungsmarke`
innerhalb einer Kette wird ebenfalls nirgends real durchgespielt.

Das ist genau die Fehlerpfad-Lücke, nach der der Auftrag in Fokus A
explizit gefragt hat: Die Architektur des Dispatch ist sauber (B2), aber
der Plan belegt die kritische Eigenschaft „unbekannter `typ` bricht die
Kette nicht, wird aber auch nicht stillschweigend akzeptiert" an keiner
Stelle mit einem AC. Vor Bau zu ergänzen: mindestens ein AC/Testfall für
eine gemischte Kette (Checkpoint + Wirkungsmarke, mehrere Sequenzen) und
einer für einen korrupten/unbekannten `typ`-Wert mitten in einer Kette.

### B4 — Offener Punkt 2 (Semantik bei mehreren `run_prepared` in Folge): vorgeschlagener Default ist in einem konkreten Szenario unsicher
`[Schlussfolgerung]`

Der Plan schlägt vor (Abschnitt 3, SCOPE.3; Abschnitt 10, Punkt 2): „die
`sequenz`-höchste `run_prepared`-Marke zählt, ältere werden ignoriert".
Das ist für den reinen Blockierfall (zwei `run_prepared` ohne jedes
Terminalartefakt) folgenlos — beide Lesarten liefern
`KLAERUNG_ERFORDERLICH`, weil kein Terminal folgt.

Kritisch ist ein anderes, durch nichts in F1B strukturell verhindertes
Szenario derselben `lauf_id`: `run_prepared` (sequenz 2) →
[Absturz/Bug, kein Terminal] → `run_prepared` (sequenz 3) → Terminal
`ERFOLGREICH` (sequenz 4). Nach der vorgeschlagenen Regel liefert
`stelleLaufstatusFest` hier `ABGESCHLOSSEN`/`ERFOLGREICH` — und
unterschlägt dabei vollständig, dass der **erste** `RUN_PREPARED`
(sequenz 2) nie ein Terminalartefakt bekam. Genau das ist der Zustand,
den `zielfassung.md:362` (§16.6) als blockierten Klärzustand erzwingen
will: „`RUN_PREPARED` ohne validiertes terminales Laufartefakt → kein
neuer Lauf, blockierter Klärzustand". Zwar setzt AC6/`feature.md:58`
voraus, dass ein bewusst neu gestarteter Lauf eine eigene `lauf_id`
bekommt — aber genau der hier beschriebene Fall (zweites `run_prepared`
**in derselben** `lauf_id`) ist entweder ein Aufrufer-Bug oder ein
Prozessabsturz mit möglicher, nie evidenzierter Außenwirkung des ersten
Versuchs. „Neuestes gewinnt, älteres wird ignoriert" ist in diesem Fall
keine neutrale Vereinfachung, sondern verwischt aktiv genau die
Evidenzlücke, die A19 (Hauptkriterium) und §16.6 aufdecken sollen.

Der Plan hat diesen Punkt selbst als offen markiert (Abschnitt 10, Punkt
2) und explizit „keine Vorgabe aus dem Auftrag, sondern eine Auslegung"
genannt — das ist der korrekte Umgang mit Unsicherheit. Meine
Einschätzung als Advisor: der vorgeschlagene Default sollte **vor** dem
Bau korrigiert werden, nicht nur bestätigt. Ein sichererer Entwurf: eine
zweite `run_prepared`-Marke ohne dazwischenliegendes Terminal in
derselben `lauf_id` ist selbst ein zu meldender Zustand (z. B. eigener
`status`-Wert oder Teil der `KLAERUNG_ERFORDERLICH`-Evidenz, mit Nennung
**aller** offenen `run_prepared`-Sequenzen, nicht nur der höchsten) —
„neuestes gewinnt" ist nur für den Diagnosewert akzeptabel, nicht für
die Statusklassifikation.

### B5 — Offener Punkt 3 (Rückgabeform `stelleLaufstatusFest`): nicht reines Feinschliff — ARCHITECTURE.md:61 stellt eine bindende Mindestanforderung
`[Fakt]` + `[Schlussfolgerung]`

`ARCHITECTURE.md:61` wörtlich: „Blockieren ist ein normaler Ausgang,
kein Fehler. Ein blockierter Zustand trägt Blocker-Kennung, Grund,
Evidenz, Auflösungsbedingung und Resume-Ziel." `KLAERUNG_ERFORDERLICH`
ist exakt ein solcher blockierter Zustand. Der Plan (SCOPE.3,
Z.144-149) beschreibt die Rückgabe für diesen Fall nur vage („liefert
sie `{ status: "KLAERUNG_ERFORDERLICH", ... }`") und stuft die
Rückgabeform in Abschnitt 10, Punkt 3, explizit als „Feinschliff [...],
nicht wörtlich vorgegebenes Interface" ein, das erst in den
Handoff-Vertrag gehöre.

Das ist an dieser Stelle zu großzügig eingestuft: Die *Feldnamen*
(`status` vs. etwas anderes) sind tatsächlich Feinschliff, aber dass die
fünf in `ARCHITECTURE.md:61` benannten Bestandteile (Blocker-Kennung,
Grund, Evidenz, Auflösungsbedingung, Resume-Ziel — Letzteres im Sinne
von „was eine Auflösung erfordert", nicht im Sinne einer automatischen
Wiederaufnahme, was mit dem korrekt ausgeklammerten Non-Scope „keine
automatische Wiederaufnahme" nicht kollidiert) im
`KLAERUNG_ERFORDERLICH`-Rückgabewert **inhaltlich vorhanden sein
müssen**, ist eine architekturelle Mindestanforderung, keine
Geschmacksfrage. SCOPE.3 sollte das vor dem Handoff-Vertrag ausdrücklich
aufnehmen (welche der fünf Bestandteile wie befüllt werden — z. B.
Evidenz = die `run_prepared`-Marke selbst, Auflösungsbedingung =
„gültiges Terminalartefakt oder menschliche Entscheidung", Resume-Ziel =
„neuer Lauf mit eigener `lauf_id`" laut §16.6), nicht dem Executor
überlassen bleiben.

### B6 — `types.ts` erfordert eine Typ-Erweiterung, die im SCOPE nicht benannt ist
`[Fakt]` + `[Schlussfolgerung]`

`src/checkpoint-store/types.ts:24-29`: `KontrollzustandEintrag.payload`
ist fest auf `CheckpointPayload` typisiert, `typ` ist bereits ein loser
`string` (Z.26, vom Plan selbst in Abschnitt 0 als Fakt 1 benannt). Für
`stelleLaufstatusFest`, das `payload.art`/`payload.ergebnis` lesen muss
(Felder, die nur bei einer künftigen `WirkungsmarkePayload` existieren,
nicht bei `CheckpointPayload`), ist ohne Typ-Erweiterung entweder ein
unsauberer Cast oder `any` nötig — `any` ist laut `ARCHITECTURE.md:87`
verboten außer bei begründetem, kommentiertem Einzelfall. SCOPE.5 im
Plan nennt ausdrücklich nur die Erweiterung von `Ereignisname` in
`types.ts`; eine analoge, ebenso notwendige Erweiterung von
`KontrollzustandEintrag`/Einführung einer `WirkungsmarkePayload`-Union
wird an keiner Stelle im SCOPE (Abschnitt 2) benannt.

`[Fakt, entlastend]`: Das Risiko für F2 ist gering —
`src/lineage-registry/index.ts:152-163`
(`artefaktVersionAusEintrag`) und die übrigen F2-Zugriffe auf
`KontrollzustandEintrag.payload` verwenden ausschließlich Felder, die in
beiden Payload-Varianten identisch vorkämen (`sequenz`, `selbst_hash`,
`vorgaenger_hash`, `lauf_id`, `daten`) — eine Erweiterung von `payload`
zu einer Union `CheckpointPayload | WirkungsmarkePayload` würde F2s
bestehenden Code voraussichtlich nicht brechen. Trotzdem gehört diese
Typ-Erweiterung explizit ins SCOPE, nicht implizit vorausgesetzt.

### B7 — Geteilte Prüfschritte zwischen `validiereCheckpointEintrag` und `validiereWirkungsmarkeEintrag`: Refactor-Bedarf real, aber nicht konkretisiert
`[Fakt]` + `[Annahme]`

`validiereCheckpointEintrag` (Z.121-189) prüft Hülle (Z.128-140) und
Kettenfelder (Z.151-179) in einem Funktionskörper, mit einem
hartcodierten `erlaubtePayloadFelder`-Set (Z.151: `lauf_id, sequenz,
vorgaenger_hash, selbst_hash, daten`) — ohne `art`/`ergebnis`. Für
`validiereWirkungsmarkeEintrag` mit denselben Kettenfeldern plus
`art`/`ergebnis` (SCOPE.1) entsteht damit entweder Code-Duplikation der
Kettenfeld-Prüfung oder ein extrahierter, gemeinsamer Helfer. Der Plan
sagt in SCOPE.3 (Z.150-154) nur „geteilte Prüfschritte [...], kein
zweiter Regelsatz für identische Prüfschritte", ohne diesen Helfer
konkret zu benennen. `[Annahme]`: nicht belegt, ob die
Ausführungssitzung dies als echten Refactor (z. B.
`pruefeKettenfelder(payload, zusaetzlicheErlaubteFelder)`) umsetzt oder
als Kopie — beide sind mit dem Plantext vereinbar. Ohne Extraktion droht
ein künftiger B6-artiger Fund (Fix an einer Stelle, vergessen an der
zweiten). Empfehlung: den gemeinsamen Helfer im Handoff-Vertrag konkret
benennen, nicht der Ausführungssitzung überlassen.

### B8 — Docstrings von `ladeGueltigeCheckpoints`/`ladeLetztenGueltigenCheckpoint`/Modulkopf werden nach F1B irreführend, sind nicht im SCOPE
`[Fakt]` + `[Schlussfolgerung]`, geringe Schwere

`src/checkpoint-store/index.ts:1-18` (Modulkopf) und die Docstrings zu
`ladeLetztenGueltigenCheckpoint` (Z.419-423) und `ladeGueltigeCheckpoints`
(Z.459-474) beschreiben das Modul und diese Funktionen ausschließlich im
Vokabular „Checkpoint". Nach F1B liefern beide Funktionen unverändert
(SCOPE.4/D3), aber inhaltlich auch Wirkungsmarke-Einträge zurück — der
Funktionsname und die Doku bleiben dann ein Teil-Misnomer. SCOPE
(Abschnitt 2) benennt keine Aktualisierung dieser Kommentare, obwohl
`CLAUDE.md`s DoD („Code ist sinnvoll kommentiert") und `ARCHITECTURE.md:
5` (Kommentar-Standard) das verlangen. Günstig und billig zu beheben —
sollte in den Handoff-Vertrag aufgenommen werden, blockiert aber nichts.

### B9 — Gemeinsames Verzeichnis `checkpoints/` für Wirkungsmarke-Dateien: bewusste, dokumentierte Vereinfachung, kosmetischer Nebeneffekt
`[Fakt, entlastend]`

`checkpointVerzeichnis` (Z.84-86) liefert immer
`<basis>/<lauf_id>/checkpoints`. SCOPE.4 macht bewusst „kein neues
Verzeichnis" zum Nicht-Ziel-Beleg und begründet das mit dem
F2-Präzedenzfall für gemeinsame `sequenz`-Zählung. Das ist intern
konsistent und spart echte Komplexität (kein zweiter Regelausdruck fürs
Dateisystem). Einziger Nebeneffekt: ein Verzeichnis namens
`checkpoints/` enthält künftig auch Nicht-Checkpoints — rein kosmetisch,
nicht funktional, keine Korrektur nötig.

### B10 — F2s Nutzung von F1s öffentlichen Exporten bleibt unter dem Plan unversehrt
`[Fakt, entlastend]`

`src/lineage-registry/index.ts:21-27` importiert `kanonischesJson,
ladeGueltigeCheckpoints, schreibeCheckpoint, sha256Hex,
validiereCheckpointEintrag` direkt aus F1. `validiereLineageEintrag`
(Z.333-350) ruft `validiereCheckpointEintrag(eintrag)` als
Hüllenprüfung zuerst auf und verlässt sich darauf, dass sie `obj.typ !==
'checkpoint'` ablehnt (Z.138-140 unverändert nach Plan). Da F2s
Lineage-Ketten (`lauf_id = lineage-<artefaktId>`) ausschließlich über
`schreibeCheckpoint` geschrieben werden (weiterhin `typ: 'checkpoint'`
fest verdrahtet, Z.397 laut Non-Scope unverändert) und F2
`schreibeWirkungsmarke` nirgends aufruft, trifft der neue typ-Dispatch
in `pruefeEinzelnenKandidaten` für F2s Ketten immer den
`checkpoint`-Zweig — funktional identisch zum heutigen Verhalten. Diese
Analyse bestätigt die Planbehauptung in Abschnitt 0/D3 wörtlich.

## Bewertung Fokus B — zusammengefasst

1. **D1** (eigener Hüllen-`typ`): tragfähig begründet, kein Redesign
   nötig — siehe B1.
2. **Mehrfaches `run_prepared`**: vorgeschlagener Default ist unsicher
   in einem konkreten, nicht ausgeschlossenen Szenario — siehe B4, vor
   Bau zu korrigieren.
3. **Rückgabeform `stelleLaufstatusFest`**: teils Feinschliff
   (Feldnamen), teils bindende Mindestanforderung aus
   `ARCHITECTURE.md:61` (fünf Bestandteile) — siehe B5, nicht
   vollständig Feinschliff.

## Urteil

**Nicht freigegeben.**

Begründung: Die zentrale, im Plan selbst als kritisch markierte
Design-Entscheidung (D1, Offener Punkt 1) ist bei genauer Prüfung solide
und braucht keinen Umbau — das ist ein entlastender Befund, kein
Hinderungsgrund. Die Kettenmechanik/B6-Fix bleiben beim typ-Dispatch
strukturell intakt (B2). Der Plan scheitert nicht an der Architektur,
sondern an drei konkreten, vor Bau zu schließenden Lücken, von denen
zwei die Kernfunktion des Features (A19, Hauptkriterium) direkt
betreffen:

- **Muss vor Bau geklärt/korrigiert werden** (blockierend für
  Handoff-Vertrag, nicht für die Grundarchitektur):
  - B4 — Semantik bei mehrfachem `run_prepared` in derselben `lauf_id`:
    der vorgeschlagene Default kann ein unaufgelöstes `RUN_PREPARED`
    durch einen späteren erfolgreichen Versuch verdecken, exakt der
    Fall, den §16.6/A19 verhindern sollen.
  - B5 — `stelleLaufstatusFest`-Rückgabe für `KLAERUNG_ERFORDERLICH`
    muss die fünf in `ARCHITECTURE.md:61` geforderten Bestandteile
    inhaltlich vorsehen, nicht als reines Interface-Feinschliff
    verschoben werden.
  - B3 — mindestens ein AC/Testfall für gemischte Ketten
    (Checkpoint+Wirkungsmarke) und für unbekannten `typ` beim
    Kettenladen fehlt; genau der vom Auftrag geforderte
    Fokus-A-Beleg.
- **Sollte vor Bau ins SCOPE aufgenommen werden** (kleiner Aufwand,
  verhindert spätere Nacharbeit):
  - B6 — Typ-Erweiterung in `types.ts` (`WirkungsmarkePayload`, ggf.
    Union) explizit benennen statt implizit vorauszusetzen.
  - B7 — gemeinsamer Helfer für Hüllen-/Kettenfeld-Prüfung zwischen
    `validiereCheckpointEintrag` und `validiereWirkungsmarkeEintrag`
    konkret benennen, um Code-Duplikation/B6-artige Drift zu vermeiden.
- **Darf im Handoff-Vertrag mitlaufen, nicht blockierend**:
  - B8 (Docstring-Pflege), B9 (Verzeichnisname kosmetisch), B10
    (F2-Regression bestätigt unversehrt).

Dieses Urteil entspricht der vom Plan selbst vorgesehenen Rework-Regel
(Abschnitt 6: „Gate 1 rot → eine Korrekturrunde → Gate 2") — eine
überarbeitete plan-v2-Fassung, die B4/B5/B3 konkret auflöst und B6/B7
ins SCOPE aufnimmt, sollte ohne Eskalation an Stefan möglich sein.

## Nächster sinnvoller Schritt

`plan-v2-f1b-wirkungsmarke.md` erstellen (plan-v1 bleibt unverändert
stehen, wie in Abschnitt 9/Schritt 4 des Plans selbst vorgesehen): darin
mindestens (a) eine korrigierte Semantik für mehrfaches `run_prepared`
(z. B. Meldung *aller* offenen `run_prepared`-Sequenzen statt „neuestes
gewinnt"), (b) eine konkrete `KLAERUNG_ERFORDERLICH`-Rückgabeform mit
den fünf `ARCHITECTURE.md:61`-Bestandteilen, (c) zwei zusätzliche
AC/Testfälle (gemischte Kette, unbekannter `typ`), (d) explizite
SCOPE-Zeilen für die `types.ts`-Erweiterung und den gemeinsamen
Kettenfeld-Helfer. Danach erneuter, kurzer Advisor-Pass ausschließlich
auf das Delta — Grundarchitektur (D1-D3) muss nicht erneut geprüft
werden.
