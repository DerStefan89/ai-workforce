SCHRITT 0: Arbeitsverzeichnis ausgeben und gegen das im Auftrag genannte Zielverzeichnis prüfen. Bei Abweichung: abbrechen, melden, nichts ändern.

Zielverzeichnis: Repo DerStefan89/ai-workforce, Branch
`feature/f1b-wirkungsmarke` (von `main` abgeleitet, vor Ausführung mit
Stefan bestätigen).

## TASK: f1b-wirkungsmarke

GOAL: `src/checkpoint-store/` schreibt und lädt für eine `lauf_id`
zusätzlich zu Checkpoints auch Wirkungsmarken (`RUN_PREPARED` und ein
Terminalartefakt `ERFOLGREICH`/`VERWEIGERT`/`FEHLGESCHLAGEN`) in
derselben Hash-Kette; eine neue Funktion `stelleLaufstatusFest` stellt
für eine `lauf_id` mechanisch fest, ob eine offene `RUN_PREPARED`-Marke
ohne gültiges Terminalartefakt vorliegt (`KLAERUNG_ERFORDERLICH`) — real
durchspielt, nicht nur in Prosa behauptet. Die Akzeptanzkriterien A1–A22
aus `state/plan-v2-f1b-wirkungsmarke.md` (plan-v1 + Delta 1–4) sind
erfüllt, inklusive der vier Nachbesserungen aus dem zweiten Advisor-Pass
(B11/B12/B13/B15 unten).

CONTEXT:
- [Fakt] Vollständiger Plan: `state/plan-v2-f1b-wirkungsmarke.md` (Delta
  zu `state/plan-v1-f1b-wirkungsmarke.md`, der unverändert stehen bleibt
  und für alle nicht in plan-v2 erwähnten Abschnitte weiterhin gilt —
  Abschnitt 0 Verifikation, 1 Ziel, 4 D1–D2 Design-Entscheidungen, 5
  Ablageort, 6 Budget, 8 Rollen). Dieser Vertrag ist eine
  Ausführungsanweisung dazu; bei Widerspruch gilt plan-v2, bei dessen
  Schweigen plan-v1.
- [Fakt] Erster Advisor-Pass (`state/advisor-findings-f1b-wirkungsmarke.md`):
  NICHT FREIGEGEBEN auf plan-v1 wegen B3/B4/B5 (blockierend) und B6/B7
  (ins SCOPE aufzunehmen). B1/B2 (D1 eigener Hüllen-`typ`, D3
  typ-Dispatch bricht die Kettenmechanik nicht) waren entlastend,
  bestätigt — keine erneute Prüfung der Grundarchitektur nötig.
- [Fakt] Zweiter Advisor-Pass, nur auf das Delta
  (`state/advisor-findings-f1b-wirkungsmarke-v2.md`): **FREIGEGEBEN MIT
  HINWEISEN.** B3 (Delta 3), B5 (Delta 2), B7 (Delta 4) sind inhaltlich
  vollständig gelöst. B4 (Delta 1) ist im Kernszenario gelöst, aber mit
  vier konkreten Nachbesserungen, die dieser Vertrag wörtlich aufnimmt
  (SCOPE.3/SCOPE.5 unten): B11, B12, B13, B15.
- [Fakt] Feature-Akte: `features/F1B/feature.md`, `Status:
  READY_FOR_TECH`. Ziel/Scope/Nicht-Ziele/Akzeptanzkriterien dort sind
  die Produktsicht; plan-v2 ist die technische Ausprägung. Bei
  Widerspruch gilt `features/F1B/feature.md` für WAS, plan-v2/plan-v1
  für WIE.
- [Fakt] Dependency erfüllt: F1 (Checkpoint Store), gemergt (`main`
  Commit `0f303e8`), F2 (Artifact Registry/Lineage), gemergt (`main`
  Commit `49e447d`/PR #23). F1B erweitert `src/checkpoint-store/index.ts`
  und `types.ts` — F1s bestehende Exporte (`schreibeCheckpoint`,
  `ladeLetztenGueltigenCheckpoint`, `ladeGueltigeCheckpoints`,
  `validiereCheckpointEintrag`, `kanonischesJson`, `sha256Hex`) bleiben
  in Signatur und Verhalten unverändert (Regressionsschutz für F2, das
  sie direkt importiert, `src/lineage-registry/index.ts:21-27`).
- [Fakt] Der typ-Dispatch betrifft genau eine Stelle:
  `pruefeEinzelnenKandidaten` (`src/checkpoint-store/index.ts:286`) ruft
  heute `validiereCheckpointEintrag(geparst)` unbedingt auf. Wird ein
  Dreiwege-Zweig (`typ === 'checkpoint'` → Checkpoint-Validierung,
  `typ === 'wirkungsmarke'` → Wirkungsmarke-Validierung, sonst →
  Regelverstoß, kein Absturz) an dieser einen Stelle eingebaut, bleibt
  die Kettenmechanik (`istKandidatGueltig`, Z.323–361, verkettet
  ausschließlich über `payload.selbst_hash`/`payload.vorgaenger_hash`/
  `payload.sequenz`, liest nirgends `typ`) strukturell unberührt — real
  verifiziert im zweiten Advisor-Pass (B15, entlastender Teil).
- [Fakt] `KontrollzustandEintrag.typ` ist im Typsystem ein loser `string`
  (`src/checkpoint-store/types.ts:26`) — bleibt in diesem Vertrag
  unverändert (kein Umbau zu einer discriminated union auf `typ`, siehe
  B15 unten für den gewählten Narrowing-Weg über `payload`).
- **[Fakt, löst B4 — Delta 1] FIFO-Paarung zwischen `RUN_PREPARED` und
  Terminal, offene Liste statt „neuestes gewinnt":**
  `stelleLaufstatusFest` verarbeitet die `wirkungsmarke`-gefilterten,
  nach `sequenz` aufsteigend sortierten Einträge sequenziell mit einer
  Warteschlange `offeneRunPrepared: number[]`. Bei `art: "run_prepared"`
  wird die `sequenz` angehängt; bei `art: "terminal"` wird — falls die
  Warteschlange nicht leer ist — die **älteste** Sequenz entnommen
  (FIFO) und als durch dieses Terminal aufgelöst vermerkt; ist die
  Warteschlange bereits leer, ist das Terminal ein Orphan
  (`terminaleOhneRunPrepared`, siehe unten). **Korrektur B11 (zweiter
  Advisor-Pass):** Der in plan-v2 Delta 1 zusätzlich formulierte
  Formel-Beleg „Anzahl offener `RUN_PREPARED` = max(0, Anzahl
  `run_prepared` − Anzahl `terminal`)" ist als allgemeine Formel
  **nachweislich falsch** (Gegenbeispiel: `run_prepared(1)` →
  `terminal(2)` [matcht 1] → `terminal(3)` [Orphan, Warteschlange schon
  leer] → `run_prepared(4)` — Formel liefert `max(0, 2−2)=0`, real bleibt
  `[4]` offen). Diese Formel ist **nicht** als Korrektheitsbeleg zu
  verwenden oder zu implementieren — allein der oben beschriebene,
  schrittweise FIFO-Warteschlangen-Algorithmus ist die Implementierung
  und der Beleg.
- **[Fakt, löst B5 — Delta 2] `KLAERUNG_ERFORDERLICH`-Rückgabe mit den
  fünf `ARCHITECTURE.md:61`-Bestandteilen** (wörtlich: „Ein blockierter
  Zustand trägt Blocker-Kennung, Grund, Evidenz, Auflösungsbedingung und
  Resume-Ziel"):
  ```
  {
    status: "KLAERUNG_ERFORDERLICH",
    blockerId: `wirkungsmarke-offene-run-prepared:${laufId}`,
    grund: "RUN_PREPARED-Wirkungsmarke(n) ohne zugeordnetes Terminalartefakt",
    evidenz: {
      laufId,
      offeneRunPreparedSequenzen: number[],
      eintraege: KontrollzustandEintrag[]
    },
    aufloesungsbedingung: "Menschliche Entscheidung: gültiges Terminalartefakt für die offene(n) RUN_PREPARED-Sequenz(en) nachtragen (schreibeWirkungsmarke mit art: 'terminal'), oder den Lauf als abgebrochen/geklärt einstufen",
    resumeZiel: "Kein automatischer Neustart dieser lauf_id (AC5) — ein bewusst neu gestarteter Lauf erhält eine eigene lauf_id (AC6, §16.6)"
  }
  ```
  **Korrektur B13 (zweiter Advisor-Pass):** Feldname ist `eintraege`, kein
  Umlaut — jeder andere Bezeichner im Repo ist ASCII-transliteriert
  (`vorgaenger_hash`, `gueltig`, `zusaetzlicheErlaubteFelder`).
- **[Fakt, löst B3 — Delta 3] Drei zusätzliche Testfälle, plus ein
  vierter aus B11:**
  - **A20** — Gemischte Kette (Checkpoint→Wirkungsmarke→Checkpoint→
    Wirkungsmarke, vier Einträge, `sequenz` 1–4) wird über
    `ladeGueltigeCheckpoints` vollständig und in korrekter Reihenfolge
    geladen, Kettenintegrität über die gesamte Folge bestätigt.
  - **A21** — Ein Eintrag mit `typ` außerhalb von
    `checkpoint`/`wirkungsmarke` mitten in einer Kette (direkt ins
    Kettenverzeichnis geschrieben, nicht über die API) wird als
    `checkpoint_validierungsfehler` erkannt, `ladeGueltigeCheckpoints`
    fällt auf den validen Vorgänger zurück, kein Absturz.
  - **A22** — Advisor-Szenario real durchgespielt: `run_prepared`
    (sequenz 2) → `run_prepared` (sequenz 3) → Terminal `ERFOLGREICH`
    (sequenz 4) → `stelleLaufstatusFest` liefert `KLAERUNG_ERFORDERLICH`
    mit `offeneRunPreparedSequenzen: [3]` (FIFO entnimmt die **älteste**
    offene Sequenz — 2 — als durch das Terminal aufgelöst, 3 bleibt
    offen; **Korrektur gegenüber plan-v2s eigenem Recap-Absatz**, der an
    dieser Stelle „bleibt sequenz 2 offen" schreibt — das widerspricht
    der im selben Delta 1 zwei Absätze zuvor korrekt beschriebenen
    Operation „die älteste offene Sequenz entnehmen"; maßgeblich ist die
    Operation, nicht der Recap-Satz), **nicht** `ABGESCHLOSSEN`.
  - **A23 (neu, aus B11)** — Orphan-dann-neue-`run_prepared`-Interleaving:
    `run_prepared(1)` → `terminal(2)` [matcht 1, `ERFOLGREICH`] →
    `terminal(3)` [Orphan, in `terminaleOhneRunPrepared`] →
    `run_prepared(4)` [kein weiteres Terminal folgt] →
    `stelleLaufstatusFest` liefert `KLAERUNG_ERFORDERLICH` mit
    `offeneRunPreparedSequenzen: [4]` — belegt real, dass die in Delta 1
    verworfene Formel keine Rolle spielt, nur der Warteschlangen-
    Algorithmus zählt.
- **[Fakt, löst B6/B7 — Delta 4] `types.ts`-Union + gemeinsamer
  Kettenfeld-Helfer:**
  - Neuer Typ `WirkungsmarkePayload` (`lauf_id`, `sequenz`,
    `vorgaenger_hash`, `selbst_hash`, `art: 'run_prepared' | 'terminal'`,
    `ergebnis?: 'ERFOLGREICH' | 'VERWEIGERT' | 'FEHLGESCHLAGEN'`,
    `daten?`). `KontrollzustandEintrag.payload` wird zur Union
    `CheckpointPayload | WirkungsmarkePayload`. Verifiziert (zweiter
    Advisor-Pass, B15, entlastend): F2s Zugriffe
    (`src/lineage-registry/index.ts:153,156,172,338`) nutzen
    ausschließlich `.payload.daten`/`.payload.sequenz` — Felder, die in
    beiden Varianten identisch vorkommen; die Union bricht F2 nicht.
  - **Korrektur B15 (zweiter Advisor-Pass):** Für `stelleLaufstatusFest`
    selbst reicht die Union allein nicht — sie braucht einen konkreten,
    geprüften Zugriff auf `art`/`ergebnis` (Felder, die nur in
    `WirkungsmarkePayload` existieren), kein ungeprüfter `as`-Cast. Dieser
    Vertrag legt fest: eine Typ-Guard-Funktion
    `istWirkungsmarkePayload(payload: CheckpointPayload |
    WirkungsmarkePayload): payload is WirkungsmarkePayload`, geprüft über
    `'art' in payload`. `stelleLaufstatusFest` filtert die geladene Kette
    zunächst auf `eintrag.typ === 'wirkungsmarke'` (Hüllenfeld, bereits
    vorhanden) und ruft danach den Typ-Guard auf `payload` auf, bevor
    `art`/`ergebnis` gelesen werden — kein Cast an irgendeiner Stelle.
  - Gemeinsamer, privater Helfer `pruefeKettenfelder(payload:
    Record<string, unknown>, zusaetzlicheErlaubteFelder: string[]):
    string[]`, extrahiert aus dem Kettenfeld-Prüfblock von
    `validiereCheckpointEintrag` (`src/checkpoint-store/index.ts:151–179`
    — real verifiziert, Zeilenangabe stimmt mit dem aktuellen Merge-Stand
    überein). Beide `validiereCheckpointEintrag`
    (`zusaetzlicheErlaubteFelder: ['daten']`, unveränderte
    Signatur/Verhalten) und das neue `validiereWirkungsmarkeEintrag`
    (`zusaetzlicheErlaubteFelder: ['art', 'ergebnis', 'daten']`) rufen ihn
    auf.
- [Fakt, löst B12 — zweiter Advisor-Pass] Die Design-Entscheidung „kein
  neuer `status`-Wert für Orphan-Terminals, nur ein zusätzliches
  Diagnosefeld `terminaleOhneRunPrepared`" bleibt bestehen — aber **ohne**
  Bezug auf `ARCHITECTURE.md:58` als Begründung. Diese Zeile regelt die
  drei `ergebnis`-Werte eines Werkzeuglaufs (`ERFOLGREICH`/`VERWEIGERT`/
  `FEHLGESCHLAGEN`), nicht die drei `status`-Werte von
  `stelleLaufstatusFest` (`NICHT_GESTARTET`/`ABGESCHLOSSEN`/
  `KLAERUNG_ERFORDERLICH`, definiert in plan-v1 SCOPE.3) — beide
  Dreiergruppen sind unabhängig. Die Begründung für „kein neuer
  `status`-Wert" ist stattdessen: `stelleLaufstatusFest` hat laut plan-v1
  SCOPE.3 genau drei benannte Ausgänge, ein Orphan-Terminal ist kein
  vierter Fall, sondern ein Diagnosedetail innerhalb der drei bestehenden.
- **[Fakt, löst B11 zweiter Teil — Vierter Fall in SCOPE.3]** SCOPE.3
  (`stelleLaufstatusFest`) hat vier, nicht drei Fälle:
  1. `offeneRunPrepared` nicht leer → `KLAERUNG_ERFORDERLICH`.
  2. `offeneRunPrepared` leer, mindestens eine `run_prepared`-Marke kam
     in der Kette vor, und mindestens ein Terminal wurde ihr zugeordnet
     → `ABGESCHLOSSEN` mit dem `ergebnis` des zuletzt zugeordneten
     Terminals.
  3. **(neu, B11)** Die gefilterte Wirkungsmarke-Liste enthält
     **keine** `run_prepared`-Marke — unabhängig davon, ob sie
     Orphan-Terminals enthält → `NICHT_GESTARTET`. Ersetzt plan-v2s
     engere Formulierung „gesamte gefilterte Liste leer", die eine reine
     Orphan-Terminal-Kette (kein `run_prepared` je) durch keinen der drei
     ursprünglichen Fälle abgedeckt hätte.
  4. Die gefilterte Liste ist komplett leer (keine Wirkungsmarke jeder
     Art) → `NICHT_GESTARTET` (Sonderfall von 3).
  `terminaleOhneRunPrepared: number[]` bleibt in jedem der vier Fälle ein
  zusätzliches, nicht-statusveränderndes Diagnosefeld (leeres Array im
  Normalfall).
- [Fakt] Speicherstruktur unverändert: kein neues Verzeichnis, kein neuer
  Dateiname-Regelausdruck. `kontrollzustand/<lauf_id>/checkpoints/
  <sequenz>-<selbst_hash>.json`, Wirkungsmarke und Checkpoint derselben
  `lauf_id` teilen sich die fortlaufende `sequenz`-Zählung (plan-v1
  SCOPE.4, D1/D2).
- [Fakt] `package.json`: `check` und `check:template` sind zwei
  unabhängige Skript-Strings (`package.json:17-18`) —
  `check-f1b-wirkungsmarke.mjs` einzeln in beide eintragen, direkt nach
  `check-lineage-registry.mjs` (bestehende Reihenfolge-Konvention).
- [Fakt] Referenzmuster für das Gate-Skript:
  `scripts/check-lineage-registry.mjs`/`scripts/check-checkpoint-store.mjs`
  — importiert Validierungs-/Kernfunktionen direkt aus dem Modul statt
  einen zweiten Regelsatz nachzubauen.
- [Fakt] Gültige `Status`-Werte laut `docs/projekt/zielfassung.md` §6:
  `ENTWURF, READY_FOR_TECH, WORKSTREAM_SCHNITT_GENEHMIGT, IN_ARBEIT,
  FEATURE_GATE, ABGESCHLOSSEN, BLOCKIERT, ABGEBROCHEN`.

SCOPE:
1. `schemas/kontrollzustand-wirkungsmarke-payload.schema.json` — Payload-
   Schema für `typ: "wirkungsmarke"` (plan-v1 SCOPE.1): Kettenfelder
   identisch zu `kontrollzustand-checkpoint-payload.schema.json`, plus
   `art: "run_prepared" | "terminal"` (Pflicht), `ergebnis` bei
   `art: "terminal"` Pflicht mit genau den drei Werten
   `ERFOLGREICH`/`VERWEIGERT`/`FEHLGESCHLAGEN`, bei `art: "run_prepared"`
   verboten. `additionalProperties: false`, `oneOf` über die zwei
   `art`-Varianten (Muster wie `schemas/kontrollzustand-lineage-payload.schema.json`).
   Nicht in `schemas/kontrollzustand.schema.json` eingehängt.
2. `schemas/examples/` — sechs neue Beispiele (plan-v1 SCOPE.2):
   `kontrollzustand-wirkungsmarke-run-prepared.valid.json`,
   `kontrollzustand-wirkungsmarke-terminal-erfolgreich.valid.json`,
   `kontrollzustand-wirkungsmarke-terminal-verweigert.valid.json`,
   `kontrollzustand-wirkungsmarke.invalid-fehlendes-ergebnis.json`,
   `kontrollzustand-wirkungsmarke.invalid-ergebnis-ausserhalb-enum.json`,
   `kontrollzustand-wirkungsmarke.invalid-ergebnis-bei-run-prepared.json`.
   `selbst_hash` in den `valid`-Beispielen real berechnet, nicht erfunden.
3. `src/checkpoint-store/index.ts` — F1-Erweiterung, kein neues Modul:
   - `schreibeWirkungsmarke(laufId, profilReferenz, art, zusatz,
     optionen?)` — schreibt `typ: "wirkungsmarke"` in dieselbe Kette wie
     `schreibeCheckpoint`. Bei `art: "terminal"` ohne oder mit ungültigem
     `zusatz.ergebnis` wirft die Funktion **vor** dem Schreiben, kein
     halb geschriebener Zustand.
   - `stelleLaufstatusFest(laufId, optionen?)` — vier Fälle wie oben unter
     CONTEXT „Vierter Fall in SCOPE.3" beschrieben. FIFO-Warteschlange
     `offeneRunPrepared: number[]` (siehe CONTEXT „löst B4"), **keine**
     Implementierung der verworfenen Formel aus B11. Rückgabeform für
     `KLAERUNG_ERFORDERLICH` exakt wie oben unter CONTEXT „löst B5"
     spezifiziert, inklusive `eintraege` (kein Umlaut, B13).
   - `validiereWirkungsmarkeEintrag(eintrag)` — reine Funktion, ruft den
     gemeinsamen Helfer `pruefeKettenfelder` (siehe SCOPE.4) auf, prüft
     zusätzlich `art`/`ergebnis`-Regeln. Rückgabe: Verstoßliste, leer =
     gültig.
   - Typ-Guard `istWirkungsmarkePayload(payload):
     payload is WirkungsmarkePayload` (siehe CONTEXT „Korrektur B15"),
     verwendet von `stelleLaufstatusFest` statt eines `as`-Casts.
   - `pruefeEinzelnenKandidaten` (Z.286): Dreiwege-Dispatch nach `typ`
     des geparsten Eintrags (`checkpoint` → `validiereCheckpointEintrag`,
     `wirkungsmarke` → `validiereWirkungsmarkeEintrag`, sonst →
     Regelverstoß `checkpoint_validierungsfehler`, kein Absturz). F1s
     öffentliche Signaturen (`ladeLetztenGueltigenCheckpoint`,
     `ladeGueltigeCheckpoints`, `schreibeCheckpoint`,
     `validiereCheckpointEintrag`, `kanonischesJson`, `sha256Hex`) bleiben
     unverändert.
4. `src/checkpoint-store/index.ts` — gemeinsamer, privater Helfer
   `pruefeKettenfelder(payload: Record<string, unknown>,
   zusaetzlicheErlaubteFelder: string[]): string[]`, extrahiert aus dem
   Kettenfeld-Prüfblock von `validiereCheckpointEintrag`
   (Z.151–179 — Kettenfelder, Kettenanfangs-Regel bei `sequenz === 1`,
   real echterInhaltsHash-Vergleich bleibt in der jeweiligen
   Validierungsfunktion, nicht im Helfer). `validiereCheckpointEintrag`
   ruft ihn mit `['daten']`, `validiereWirkungsmarkeEintrag` mit
   `['art', 'ergebnis', 'daten']` auf. `validiereCheckpointEintrag`s
   Signatur/Verhalten bleibt unverändert.
5. `src/checkpoint-store/types.ts`:
   - Neuer Typ `WirkungsmarkePayload` (siehe CONTEXT „löst B6/B7").
   - `KontrollzustandEintrag.payload`: `CheckpointPayload |
     WirkungsmarkePayload`.
   - `Ereignisname` erweitert um `wirkungsmarke_geschrieben`,
     `wirkungsmarke_validierungsfehler`, `laufstatus_festgestellt`
     (additiv, kein bestehender Wert entfällt).
6. `src/checkpoint-store/checkpoint-store.test.ts` — Ergänzung (nicht
   neue Datei): `node:test`-Fälle für A9–A13 (plan-v1, vier
   AC7-Fälle: erfolgreicher Lauf, `VERWEIGERT`, fehlendes
   Terminalartefakt, Abbruch zwischen `RUN_PREPARED` und Terminal), A20
   (gemischte Kette), A21 (unbekannter `typ`), A22 (Advisor-Szenario,
   zwei `run_prepared`), **A23 (neu, B11: Orphan-dann-neue-`run_prepared`)**,
   plus ein Regressionsfall „bestehende Checkpoint-Tests bleiben
   unverändert grün".
7. `scripts/check-f1b-wirkungsmarke.mjs` — Gate-Skript, Muster wie
   `check-lineage-registry.mjs`, importiert `validiereWirkungsmarkeEintrag`,
   `schreibeWirkungsmarke`, `stelleLaufstatusFest` direkt aus
   `src/checkpoint-store/index.ts`. Prüft: (a) die sechs neuen Fixtures
   gegen `validiereWirkungsmarkeEintrag`, (b) synthetischer Lauf:
   `RUN_PREPARED` → `KLAERUNG_ERFORDERLICH`, danach Terminalartefakt
   `ERFOLGREICH` → `ABGESCHLOSSEN`, (c) leere Kette → `NICHT_GESTARTET`.
   Eingehängt in `npm run check` UND `npm run check:template`, je einzeln
   eintragen, direkt nach `check-lineage-registry.mjs`.
8. `state/gates.md` — neue Tabellenzeile `check-f1b-wirkungsmarke.mjs`
   (Muster: Lineage-Registry-Gate-Zeile), Rot-/Grün-Beleg erst nach dem
   realen Lauf eintragen. Ergänzung der bestehenden Checkpoint-Store-Zeile
   (neue Funktionen).
9. `state/memory-map.md` — neue Zeile „Wirkungsmarke-Payload-Schema" →
   `schemas/kontrollzustand-wirkungsmarke-payload.schema.json` +
   `schemas/examples/kontrollzustand-wirkungsmarke*`, „nicht hierhin":
   nicht in `schemas/kontrollzustand.schema.json` und nicht in
   `schemas/kontrollzustand-checkpoint-payload.schema.json`. Bestehende
   Zeile „Checkpoint-Store-Modul" ergänzen (trägt jetzt auch
   Wirkungsmarken), keine neue Modul-Zeile.
10. `docs/STATUS.md` — Eintrag unter „Erledigt": F1B (Wirkungsmarke,
    `RUN_PREPARED`, Terminalartefakt, Klärzustands-Feststellung)
    umgesetzt.
11. `features/F1B/journal.md` — Nachträge: Advisor-Pass 1, plan-v2,
    Advisor-Pass 2, dieser Vertrag, Ausführung.

NICHT:
- Prozessstart, Gateway, Freigabeprüfung (F3/Invocation Policy,
  Claude-Code-Gateway — Deliverable 2/3, noch nicht gebaut).
- UI/Leitstand-Anzeige eines Laufstatus.
- Bewertung von Ergebnissen (ob ein `ERFOLGREICH` inhaltlich „gut" war).
- Neues Persistenzformat, neues Verzeichnis, neuer
  Dateiname-Regelausdruck.
- Automatische Wiederaufnahme oder Neustart bei `KLAERUNG_ERFORDERLICH`.
- Vergabe der `lauf_id` für einen bewusst neu gestarteten Lauf (AC6) —
  bleibt Aufrufer-Verantwortung.
- Änderung von `schemas/kontrollzustand.schema.json` oder F1s
  bestehenden Exporten/Signaturen.
- Ein eigenes neues Modul `src/wirkungsmarke/`.
- Umbau von `KontrollzustandEintrag` zu einer discriminated union auf
  `typ` — der in SCOPE.5/CONTEXT „Korrektur B15" festgelegte Typ-Guard
  auf `payload` ist der gewählte, ausreichende Weg für diesen Vertrag.
- Implementierung der in plan-v2 Delta 1 formulierten, im zweiten
  Advisor-Pass (B11) als falsch erkannten Formel — auch nicht als
  Kommentar oder Dokumentation im Code.
- Docstring-Pflege (B8), Verzeichnisname-Kosmetik (B9), F2-Regressionsbeleg
  (B10) — laufen im Handoff mit (SCOPE.6 Regressionsfall deckt B10 ab),
  sind aber kein eigener Prüfpunkt.
- `git add`/`git commit` im Schreibpfad ohne frische Freigabe.

BUDGET: Ein Baudurchgang plus höchstens eine Korrekturrunde. Zweites Rot
auf demselben Gate ⇒ BLOCKIERT ⇒ Mensch.

OUTPUT:
- Neue Dateien:
  `schemas/kontrollzustand-wirkungsmarke-payload.schema.json`,
  `schemas/examples/kontrollzustand-wirkungsmarke*.json` (6 Dateien),
  `scripts/check-f1b-wirkungsmarke.mjs`.
- Geänderte Dateien: `src/checkpoint-store/index.ts`,
  `src/checkpoint-store/types.ts`,
  `src/checkpoint-store/checkpoint-store.test.ts`, `package.json`
  (`check` und `check:template`), `state/gates.md`,
  `state/memory-map.md`, `docs/STATUS.md`, `features/F1B/journal.md`.
- Beleg: `npm run check` und `npm run check:template` grün, Konsolen-
  Ausgabe im Bericht zeigen. Kalibrierungstest für das Gate-Skript: die
  sechs Wirkungsmarke-Fixtures (Rot für jedes Invalid-Beispiel, benannte
  Regelverletzung), den synthetischen RUN_PREPARED→Terminal-Lauf, die
  leere Kette. Kalibrierungstest für `checkpoint-store.test.ts`: für
  A9–A13, A20–A23 je den Rot-Fall real auslösen (temporäre
  Codeänderung oder korrupte Fixture wie in plan-v2 Delta 3 beschrieben),
  Fehlschlag zeigen, zurücknehmen, Grün-Zustand zeigen. Regressionsbeleg:
  bestehende `checkpoint-store.test.ts`- und
  `lineage-registry.test.ts`-Fälle bleiben unverändert grün (B10).
- Commit ausschließlich mit expliziten Pfaden (nie `-A`/`.`), `git-flow`-
  Skill nutzen, kein Commit ohne frische Freigabe, Push separat
  autorisiert.
- Bericht: was geändert wurde, welche Checks liefen (alle
  Rot-/Grün-Kalibrierungen: 6 Gate-Fixtures + mindestens 8 Testfälle
  A9-A13/A20-A23), Ergebnis, echte Blocker.

ESCALATE:
- `state/plan-v2-f1b-wirkungsmarke.md` oder
  `state/advisor-findings-f1b-wirkungsmarke-v2.md` fehlt oder
  widerspricht diesem Vertrag → abbrechen, melden, nichts anlegen.
- Einer der Kalibrierungstests reproduziert sich nicht wie hier
  beschrieben → anhalten, welcher Fall betrifft es, was tatsächlich
  passierte, melden. Nicht das Skript/den Test so lange anpassen, bis
  irgendein Fehler auftritt.
- `npm run check` wird rot an einem Glied, das dieser Auftrag nicht
  angefasst hat (insbesondere `lineage-registry.test.ts`, F2) → anhalten
  und melden. Kein Nachziehen fremder Stellen.
- Eine der vorgegebenen Formulierungen (SCOPE/AK, insbesondere die
  Rückgabeform aus CONTEXT „löst B5" oder die vier Fälle aus „löst B11
  zweiter Teil") widerspricht `features/F1B/feature.md` oder
  `docs/projekt/zielfassung.md` → anhalten, beide Stellen zitieren,
  melden. Nicht selbst entscheiden, welche gilt.
- Der typ-Dispatch in `pruefeEinzelnenKandidaten` bricht einen
  bestehenden F2-Testfall in `lineage-registry.test.ts` → anhalten,
  melden, nicht versuchen, F2s Code anzupassen, um den Bruch zu
  verdecken (das wäre außerhalb dieses Vertrags).
- `git commit` oder `git push` wird ohne frische Freigabedatei verlangt
  → nicht ausführen.

Vertrag endet mit Freigabe-Halt: kein Bau, kein Commit, kein Push in
diesem Schritt. Ausführung erst nach Stefans expliziter, frischer
Freigabe.
