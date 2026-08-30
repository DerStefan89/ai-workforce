# Advisor-Findings v2 — Feature F1B: Wirkungsmarke / RUN_PREPARED / Terminalartefakt (fokussierter Zweit-Pass auf Delta 1-5)

Slug: f1b-wirkungsmarke
Stand: 2026-08-30
Rolle: Architecture Advisor, frischer Kontext, Subagent `architecture-advisor`
Scope dieses Passes: ausschließlich `state/plan-v2-f1b-wirkungsmarke.md` (Delta 1-5) gegen die Befunde B3-B7 aus `state/advisor-findings-f1b-wirkungsmarke.md`. D1-D3 (Grundarchitektur) wurden **nicht** erneut bewertet, wie im Auftrag vorgegeben.

## Kopf

**Geprüft:**
- `state/plan-v2-f1b-wirkungsmarke.md` (vollständig, insbesondere Delta 1-5)
- `state/plan-v1-f1b-wirkungsmarke.md` (zur Einordnung, insbesondere Abschnitt 3/10)
- `state/advisor-findings-f1b-wirkungsmarke.md` (B3-B7 wörtlich gegengeprüft)

**Real gelesen, nicht aus dem Plantext übernommen:**
`ARCHITECTURE.md:56-64` (Abschnitt 4, Fehlerbehandlung, Zeile 58 und 61 wörtlich gegengeprüft), `ARCHITECTURE.md:87` (Verbotene Patterns, `any`), `src/checkpoint-store/index.ts` (vollständig, insbesondere Z.121-189, 255-361), `src/checkpoint-store/types.ts` (vollständig), `src/lineage-registry/index.ts` (Z.1-60, 140-180, 320-350) — zur Verifikation der B6-Entlastung.

**Rollengrenze:** Nur `Read`, `Grep`, `Glob`. Kein Schreibzugriff, keine Datei geändert.

## Marker-Legende

`[Fakt]` im Code/Dokument belegt · `[Schlussfolgerung]` aus Fakten abgeleitet · `[Annahme]` unbelegte Prämisse · `[offene Unsicherheit]` weder belegt noch widerlegt.

---

## Befunde

### B11 (zu Delta 1 / B4) — FIFO-Algorithmus für das Kernszenario korrekt; die begleitende „Sicherheitseigenschaft"-Formel ist mathematisch falsch, und SCOPE.3s Drei-Wege-Klassifikation hat eine unabgedeckte Lücke
`[Fakt]` + `[Schlussfolgerung]`

**Entlastender Teil:** Für das im Auftrag/B4 genannte Kernszenario (`run_prepared` seq2 → `run_prepared` seq3 → Terminal seq4) simuliert der in `state/plan-v2-f1b-wirkungsmarke.md:48-70` beschriebene Schritt-für-Schritt-FIFO-Algorithmus korrekt: Warteschlange `[2,3]` nach den beiden `run_prepared`, das Terminal entnimmt die älteste (`2`), Rest `[3]` bleibt offen → `KLAERUNG_ERFORDERLICH`. Der Algorithmus selbst (die Bulletpoints, nicht die Formel) kann strukturell keine offene `run_prepared`-Marke verschwinden lassen, weil jede verbleibende Warteschlangen-Sequenz am Ende explizit eine nie entnommene Marke repräsentiert. B4s Kernanliegen ist damit real gelöst.

**Aber:** Die in Zeile 72-84 formulierte „Sicherheitseigenschaft" — „Anzahl offener `RUN_PREPARED` am Ende = max(0, Anzahl `run_prepared`-Marken − Anzahl `terminal`-Marken [...] in der Kette)" — ist als allgemeine Formel falsch. Gegenbeispiel: Kette `run_prepared(seq1)` → `terminal(seq2)` [matcht seq1] → `terminal(seq3)` [Warteschlange bereits leer, Orphan] → `run_prepared(seq4)`. Hier: 2 `run_prepared`, 2 `terminal`. Formel sagt `max(0, 2−2) = 0` offene Marken, also (nach der Formel-Lesart) fälschlich „kein Klärzustand nötig". Der tatsächliche, korrekt beschriebene FIFO-Algorithmus liefert aber `offeneRunPrepared = [4]` — also zu Recht `KLAERUNG_ERFORDERLICH`. Der Algorithmus selbst bleibt hier korrekt, aber die Formel, mit der Delta 1 seine eigene Korrektheit *begründet* („der eigentliche Fix für B4"), ist in diesem Interleaving nachweislich falsch. Wer die Korrektheit nur an der Formel statt am simulierten Algorithmus prüft, würde einen echten Fehler übersehen oder einen nötigen Testfall (genau diese Verschachtelung: Orphan-Terminal gefolgt von einer neuen, unresolved `run_prepared`) für entbehrlich halten — A20-A22 decken dieses Interleaving nicht ab.

**Zweiter, unabhängiger Punkt:** SCOPE.3 (Zeilen 89-101) unterscheidet exakt drei Fälle: (a) `offeneRunPrepared` nicht leer → `KLAERUNG_ERFORDERLICH`; (b) leer **und** mindestens ein Terminal zugeordnet → `ABGESCHLOSSEN`; (c) gesamte gefilterte Liste leer → `NICHT_GESTARTET`. Eine Kette, die **ausschließlich** einen Orphan-Terminal enthält (nie eine `run_prepared`-Marke, z. B. nur `terminal(seq1)`), fällt durch **keinen** der drei Fälle: `offeneRunPrepared` ist leer (Fall a entfällt), aber es wurde **kein** Terminal „zugeordnet" (es ging direkt in `terminaleOhneRunPrepared`, Fall b entfällt mangels Zuordnung), und die gefilterte Liste ist nicht leer (Fall c entfällt). Der Rückgabewert für diesen Fall ist damit **nicht spezifiziert** — eine echte Lücke. Das ist zugleich eine Verengung gegenüber plan-v1: dort war die Bedingung „gibt es **keine** `run_prepared`-Marke" (plan-v1 Zeile 143, unabhängig von vorhandenen Terminals) → `NICHT_GESTARTET`; Delta 1 ersetzt das durch „gesamte gefilterte Liste leer", was diesen Fall nicht mehr abdeckt.

Empfehlung vor Handoff: SCOPE.3 um einen expliziten vierten/korrigierten Fall ergänzen (z. B.: „keine `run_prepared`-Marke in der Kette, unabhängig von vorhandenen Orphan-Terminals → `NICHT_GESTARTET`"), die Formel entweder entfernen/korrigieren oder als „gilt nur für monoton geordnete Ketten ohne vorzeitige Orphans" einschränken, und einen zusätzlichen Testfall für das Orphan→neue-`run_prepared`-Interleaving ergänzen.

### B12 (zu Delta 1 / B4, textueller Fund) — Zitat-Verwechslung: `ARCHITECTURE.md:58` regelt `ergebnis`, nicht `status`
`[Fakt]`

Delta 1, Zeile 62-64: „[...] nicht als eigener `status`-Wert (kein neuer Fall außerhalb der drei in `ARCHITECTURE.md:58` benannten Terminalausgänge)." `ARCHITECTURE.md:58` (wörtlich verifiziert): „Ein Werkzeuglauf hat genau drei terminale Ausgänge: `ERFOLGREICH`, `VERWEIGERT`, `FEHLGESCHLAGEN`." Das sind die drei Werte von `ergebnis` (Terminal-Klassifikation eines Werkzeuglaufs), **nicht** die drei Werte von `status` in `stelleLaufstatusFest` (`NICHT_GESTARTET`/`ABGESCHLOSSEN`/`KLAERUNG_ERFORDERLICH`, definiert in plan-v1 SCOPE.3, an keiner Stelle in `ARCHITECTURE.md:58` benannt). Beide Dreiergruppen sind disjunkt und beschreiben unterschiedliche Achsen. Die Design-Entscheidung selbst („kein neuer `status`-Wert für Orphan-Terminals") bleibt vernünftig, aber die zitierte Begründung stützt sie nicht — sie referenziert die falsche Norm. Sollte vor Handoff korrigiert oder entfernt werden, um keine falsche Präzedenzkette zu erzeugen.

### B13 (zu Delta 2 / B5) — alle fünf `ARCHITECTURE.md:61`-Bestandteile inhaltlich belegt, ein Namenskonventions-Fund
`[Fakt]` + `[Schlussfolgerung, überwiegend entlastend]`

`ARCHITECTURE.md:61` wörtlich verifiziert: „Blockieren ist ein normaler Ausgang, kein Fehler. Ein blockierter Zustand trägt Blocker-Kennung, Grund, Evidenz, Auflösungsbedingung und Resume-Ziel." Das Zitat in Delta 2 (Zeile 107-108) ist wortgetreu. Die konkrete Rückgabeform (Zeile 111-124) belegt tatsächlich alle fünf: `blockerId` (Blocker-Kennung), `grund` (Grund), `evidenz` (Evidenz, inkl. `offeneRunPreparedSequenzen` + betroffene Einträge), `aufloesungsbedingung` (Auflösungsbedingung), `resumeZiel` (Resume-Ziel, hier als Policy-Aussage „kein automatischer Neustart dieser lauf_id" statt als Sprung-Ziel interpretiert — eine vertretbare, im Text selbst begründete Lesart, die den korrekt ausgeklammerten Non-Scope „keine automatische Wiederaufnahme" nicht verletzt). B5 ist damit inhaltlich geschlossen.

**Fund:** `evidenz`-Objekt (Zeile 119) nennt das Feld `einträge: KontrollzustandEintrag[]` — mit literalem Umlaut „ä" als tatsächlichem Property-Namen (nicht in Kommentar/String). Grep über `src/` bestätigt: Umlaute kommen im gesamten Code ausschließlich in Kommentaren/Fehlermeldungstexten vor, niemals als Bezeichner — das Repo transliteriert durchgehend (`vorgaenger_hash`, `gueltig`, `zusaetzlicheErlaubteFelder` in Delta 4 selbst). `einträge` weicht von dieser durchgängigen Konvention ab. Kleiner, aber konkreter Fund — vor Handoff zu `eintraege` korrigieren.

### B14 (zu Delta 3 / B3) — A20-A22 schließen die drei geforderten Lücken konkret
`[Fakt]` + `[Schlussfolgerung, entlastend]`

- **Gemischte Kette (A20):** Vier Einträge, alternierend `checkpoint`/`wirkungsmarke`/`checkpoint`/`wirkungsmarke`, explizit über `ladeGueltigeCheckpoints` geprüft, Kettenintegrität über die gesamte gemischte Folge — deckt genau die im ersten Urteil (B3) verlangte End-to-End-Prüfung des typ-Dispatch beim Laden, die A4/A9-A13 aus plan-v1 nicht abdeckten.
- **Unbekannter `typ` mitten in der Kette (A21):** Checkpoint → Datei mit `typ: "unbekannt"` direkt ins Verzeichnis geschrieben (nicht über die API, analog zu F1s bestehendem Muster manueller Korruptionstests, z. B. plan-v1 A12) → weiterer Checkpoint; erwartet: `ladeGueltigeCheckpoints` liefert nur den validen Vorgänger, `checkpoint_validierungsfehler` wird emittiert, kein Absturz. Deckt exakt die zweite von B3 verlangte Lücke.
- **Advisor-Szenario real durchgespielt (A22):** identisch zum in B4 beschriebenen Fall (zwei `run_prepared`, ein Terminal) — zentraler Rot-/Grün-Beleg für Delta 1.

Diese drei Testfälle sind konkret genug (Eingaben, erwartete Ausgänge, Prüfmethode benannt) für einen Handoff-Vertrag. **Residual (siehe B11):** Sie decken nicht die durch Delta 1 selbst neu eingeführte Komplexität um `terminaleOhneRunPrepared`/Orphan-Interleavings ab — das ist aber eine Folge von B11, keine Wiedereröffnung von B3 selbst, da B3 sich ursprünglich nur auf gemischte Ketten und unbekannten `typ` bezog.

### B15 (zu Delta 4 / B6+B7) — Zeilenreferenzen verifiziert korrekt; gemeinsamer Helfer konkret benannt; Union-Erweiterung lässt eine reale Narrowing-Lücke offen
`[Fakt]` + `[Schlussfolgerung]`

**Entlastend, verifiziert:** `src/checkpoint-store/index.ts:151-179` (real gelesen) entspricht exakt dem in Delta 4 referenzierten Kettenfeld-Prüfblock (`erlaubtePayloadFelder`-Set, Pflichtfeld-Checks, Kettenanfangs-Regel bei `sequenz === 1`) — die Zeilenangabe ist nach dem seither ungeänderten Merge-Stand weiterhin akkurat. Der benannte Helfer `pruefeKettenfelder(payload, zusaetzlicheErlaubteFelder: string[])` mit zwei konkret genannten Aufrufstellen (`validiereCheckpointEintrag` mit `['daten']`, neues `validiereWirkungsmarkeEintrag` mit `['art', 'ergebnis', 'daten']`) ist konkret genug benannt, um B7s Kernanliegen („kein zweiter, unabhängig gepflegter Regelsatz") zu schließen — Name, Signatur-Grundform und beide Call-Sites sind fixiert, nicht der Ausführungssitzung überlassen.

Ebenfalls verifiziert (entlastend, erneut bestätigt): `src/lineage-registry/index.ts:153,156,172,338` greifen ausschließlich auf `.payload.daten` und `.payload.sequenz` zu — beide Felder existieren identisch in `CheckpointPayload` und der geplanten `WirkungsmarkePayload`. Eine Union `CheckpointPayload | WirkungsmarkePayload` bricht diese F2-Zugriffe nicht, da TypeScript den Zugriff auf gemeinsame, kompatible Felder einer Union ohne Narrowing erlaubt.

**Aber, neuer Fund:** Delta 4 beschreibt **nur** die Erweiterung von `KontrollzustandEintrag.payload` zu einer Union, **nicht** wie `stelleLaufstatusFest` diese Union anschließend sicher auf `WirkungsmarkePayload` narrowen soll, um `.art`/`.ergebnis` zu lesen (Felder, die nur in `WirkungsmarkePayload` existieren). `KontrollzustandEintrag.typ` bleibt laut Delta 4 unverändert ein loser `string` (`src/checkpoint-store/types.ts:26`, real geprüft, keine Änderung im Delta erwähnt) — `KontrollzustandEintrag` selbst wird **nicht** zu einer echten discriminated union (`{typ:'checkpoint', payload: CheckpointPayload} | {typ:'wirkungsmarke', payload: WirkungsmarkePayload}`) umgebaut. Ohne einen solchen Umbau *oder* eine explizit benannte Typ-Guard-Funktion (z. B. `function istWirkungsmarkePayload(payload: CheckpointPayload | WirkungsmarkePayload): payload is WirkungsmarkePayload`) bleibt der Ausführungssitzung nur ein ungeprüfter Cast (`as WirkungsmarkePayload`) — der genau das B6 ursprünglich beklagte Problem („unsauberer Cast oder `any`", `ARCHITECTURE.md:87` verbietet `any` außer bei begründetem Einzelfall) technisch umgeht, ohne es aufzulösen: ein Cast ist kein `any`, aber ebenso ungeprüft. Delta 4 löst B6 damit für **bestehenden** F2-Code vollständig (entlastend, oben verifiziert), aber nicht vollständig für den **neuen** Code (`stelleLaufstatusFest` selbst), der die Union eigentlich motiviert hat.

Empfehlung vor Handoff: entweder (a) `KontrollzustandEintrag` als discriminated union auf `typ` umbauen, oder (b) eine konkrete Typ-Guard-Funktion im SCOPE benennen — analog präzise wie `pruefeKettenfelder` bereits benannt wurde.

---

## Bewertung — Zuordnung zu B3-B7

| Ursprungsbefund | Delta | Geschlossen? |
|---|---|---|
| B3 (fehlende AC/Tests) | Delta 3 (A20-A22) | Ja — siehe B14, entlastend |
| B4 (Semantik mehrfaches `run_prepared`) | Delta 1 | Kernszenario ja; Formel + Randfall-Klassifikation nein — siehe B11, B12 |
| B5 (`KLAERUNG_ERFORDERLICH`-Rückgabe) | Delta 2 | Ja, inhaltlich vollständig — siehe B13 (nur Namenskonvention) |
| B6 (`types.ts`-Erweiterung nicht im SCOPE) | Delta 4 | Für Bestandscode (F2) ja; für neuen Code (`stelleLaufstatusFest`-Narrowing) nein — siehe B15 |
| B7 (gemeinsamer Kettenfeld-Helfer) | Delta 4 | Ja, konkret benannt — siehe B15 |

## Urteil

**Freigegeben mit Hinweisen.**

Begründung: Die Deltas lösen ihre jeweiligen Befunde überwiegend real und nicht nur in Prosa — B3 ist mit drei konkreten, ausführbaren Testfällen geschlossen (B14), B5 ist inhaltlich vollständig gegen `ARCHITECTURE.md:61` belegt (B13), B7 hat einen konkret benannten, an zwei Stellen verwendeten Helfer (B15). Das Kernanliegen von B4 — dass ein zweites `run_prepared` in derselben `lauf_id` nicht durch ein späteres Terminal verdeckt wird — ist durch den beschriebenen FIFO-Algorithmus tatsächlich strukturell erfüllt (B11, entlastender Teil).

Kein Fund in diesem Pass erschüttert die in Delta 1-4 gewählte Grundmechanik oder verlangt eine Rückkehr zur Grundarchitektur. Alle gefundenen Lücken sind eng umrissen, konkret benennbar und ohne neue Design-Entscheidung im Handoff-Vertrag selbst nachtragbar:

- **Vor/im Handoff-Vertrag zu ergänzen** (kein Blocker, aber nicht der Ausführungssitzung zu überlassen):
  - B11 — SCOPE.3 um den fehlenden vierten Fall („keine `run_prepared`-Marke, unabhängig von Orphan-Terminals" → `NICHT_GESTARTET`) ergänzen; die „Sicherheitseigenschaft"-Formel korrigieren oder entfernen; einen Testfall für das Orphan-dann-neue-`run_prepared`-Interleaving ergänzen.
  - B12 — die `ARCHITECTURE.md:58`-Referenz in Delta 1 korrigieren (betrifft `ergebnis`, nicht `status`).
  - B13 — `evidenz.einträge` → `eintraege` (ASCII-Konvention).
  - B15 — konkreten Narrowing-Mechanismus für `CheckpointPayload | WirkungsmarkePayload` benennen (Typ-Guard-Funktion oder discriminated union), bevor `stelleLaufstatusFest` implementiert wird.
- **Entlastend bestätigt, keine Aktion nötig:** B2 (unverändert aus Pass 1), A20-A22 als Testabdeckung (B14), F2-Regressionssicherheit der Union (B15, Bestandscode-Teil).

## Nächster sinnvoller Schritt

Die vier B11/B12/B13/B15-Korrekturen direkt in den Handoff-Vertrag (`state/tasks/f1b-wirkungsmarke.md`) aufnehmen — sie sind klein genug, um ohne einen dritten Plan-Entwurf (plan-v3) oder einen weiteren vollständigen Advisor-Pass in SCHRITT 0/SCOPE des Vertrags textlich fixiert zu werden. Ein erneuter Advisor-Pass ist nicht zwingend nötig, sofern der Handoff-Vertrag diese vier Punkte wörtlich (nicht sinngemäß) aufnimmt.

Relevante Dateien: `state/plan-v2-f1b-wirkungsmarke.md`, `ARCHITECTURE.md` (Zeilen 58, 61, 87), `src/checkpoint-store/index.ts` (Zeilen 121-189, 255-361), `src/checkpoint-store/types.ts`, `src/lineage-registry/index.ts` (Zeilen 152-163, 333-350).
