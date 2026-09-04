SCHRITT 0: Arbeitsverzeichnis ausgeben und gegen das im Auftrag genannte Zielverzeichnis prüfen. Bei Abweichung: abbrechen, melden, nichts ändern.

Zielverzeichnis: Repo DerStefan89/ai-workforce, ein von `main` abgeleiteter
Feature-Branch (vor Ausführung mit Stefan bestätigen).

**Vorrangregel dieses Vertrags (F-104):** Findest du an irgendeiner Stelle
einen Widerspruch zwischen diesem Vertrag, `state/plan-v2-f8-execution-
controller.md`, `state/plan-v1-f8-execution-controller.md`,
`features/F8/feature.md` oder dem realen Code — **anhalten, beide Stellen
wörtlich zitieren, melden**. Nicht selbst entscheiden, welche Stelle gilt,
und den Widerspruch nicht durch eine Hilfskonstruktion im Test oder im
Produktcode umgehen. Der WS-1-Lauf hat für beide Ausgänge einen Präzedenzfall
geliefert: F-103 (Widerspruch korrekt zurückgemeldet — erwünscht) und F-104
(Widerspruch einseitig aufgelöst — nicht erwünscht). Siehe ESCALATE.

## TASK: f8-execution-controller-ws2a

GOAL: `fuehreAufgabeDurch` eskaliert einen `VERWEIGERT`-Lauf mit
`bypass_verdacht_anzahl > 0` real über F9 (`erfasseBedarf` →
`erzeugeTransportpaket` → `haendigeAus`) unter einer **eigenen**, vom
auslösenden Lauf verschiedenen `laufId`; bei `bypass_verdacht_anzahl === 0`
nicht. Der Status des auslösenden Laufs bleibt danach `ABGESCHLOSSEN` und
kippt nicht auf `KLAERUNG_ERFORDERLICH`. AK4 und AK6 aus
`features/F8/feature.md` sind erfüllt, AK1/AK2/AK3/AK5/AK8 bleiben erfüllt,
`npm run check` → Exit 0.

CONTEXT:

- [Fakt] Vollständiger Plan: `state/plan-v2-f8-execution-controller.md`
  (Delta zu `state/plan-v1-f8-execution-controller.md`, der für alle nicht in
  plan-v2 genannten Abschnitte unverändert fortgilt — insbesondere Abschnitt
  2.2 WS-2a-Ablauf und der F-091-Nachweis, Abschnitt 3 Nicht-Ziele, Abschnitt
  4 D1/D2/D3/D4/D5). Dieser Vertrag ist eine Ausführungsanweisung dazu; bei
  Widerspruch **nicht selbst auflösen**, sondern melden (siehe Vorrangregel).
- [Fakt] Vorgängervertrag WS-1: `state/tasks/f8-execution-controller-ws1.md`,
  gebaut und gemergt (PR #65). `src/execution-controller/{index,types,
  execution-controller.test}.ts` und `scripts/check-f8-execution-
  controller.mjs` existieren real. Dieser Vertrag **erweitert** sie, er legt
  sie nicht neu an.
- [Fakt] plan-v2 **Delta 2** ist bindende Schrittfolge, kein
  Optimierungsspielraum: Schritt 4 (`klassifiziereLauf`) → **Eskalations-
  prüfung und ggf. WS-2a vollständig** → Schritt 5 (`stelleLaufstatusFest`).
  Der heutige Code ruft Schritt 5 unmittelbar nach Schritt 4
  (`src/execution-controller/index.ts:81-90`); die Eskalation wird **zwischen**
  beide eingesetzt.
- [Fakt] plan-v2 **Delta 1** ist bindend: ein `throw` aus einem der drei
  F9-Aufrufe wird **nicht** gefangen und propagiert unverändert als
  Promise-Rejection an den Aufrufer von `fuehreAufgabeDurch`. Kein vierter
  `AusfuehrungsErgebnis`-Zweig für diesen Fall.
- [Fakt, real gelesen] Auslösekriterium:
  `KlassifikationsErgebnis` ist eine diskriminierte Union;
  `bypass_verdacht_anzahl: number` existiert **ausschließlich** auf dem
  `VERWEIGERT`-Zweig (`src/result-evaluator/types.ts:27-41`). Die Prüfung
  lautet deshalb `klassifikation.ergebnis === 'VERWEIGERT' &&
  klassifikation.bypass_verdacht_anzahl > 0` — kein `?? 0`-Fallback nötig,
  TypeScript verengt die Union bereits über das erste Konjunkt.
- [Fakt, real gelesen] `starteGateway` liefert bei Erfolg
  `{ ok: true; laufakte: LaufakteV0Daten; pfad: string; versionSequenz:
  number }` (`src/claude-code-gateway/types.ts:88-90`). Der heutige Controller
  verwirft `pfad`/`versionSequenz` (`src/execution-controller/index.ts:81-86`)
  — WS-2a braucht `versionSequenz` für `zitierter_bereich` und muss sie
  deshalb festhalten.
- [Fakt, real gelesen] `laufakteArtefaktId(laufId) = 'laufakte-' + laufId`
  (`src/claude-code-gateway/index.ts:139`). `starteGateway` registriert die
  Laufakte **genau einmal** je erfolgreichem Lauf, mit `eingaben: []`
  (`index.ts:301-308`). Es gibt im Repo keinen zweiten Schreibpfad auf dieses
  Artefakt. Konsequenz für SCOPE Punkt 6: die Laufakte ist innerhalb eines
  Laufs unveränderlich.
- [Fakt, real gelesen] F9-Signaturen (`src/human-transport/index.ts`):
  - `erfasseBedarf(laufId, profilReferenz, beschreibung, eingaben = [],
    optionen = {}) → { artefaktId, versionSequenz }` (Zeile 57-80).
    `beschreibung` muss ein **nicht-leerer** String sein
    (`validiereBedarfDaten`, Zeile 187).
  - `erzeugeTransportpaket(laufId, profilReferenz, bedarfVersionSequenz,
    inhalt, executor, optionen = {}) → { artefaktId, versionSequenz }`
    (Zeile 106-142). **Wirft**, wenn die genannte BEDARF-Version nicht
    gefunden wird (Zeile 114-117). `inhalt` und `executor` müssen
    **nicht-leere** Strings sein (`validiereTransportDatenV1`, Zeile 220-221).
  - `haendigeAus(laufId, profilReferenz, optionen = {}) → { pfad, selbstHash }`
    (Zeile 147-149) — ruft `schreibeWirkungsmarke(laufId, …, 'run_prepared',
    …)`, also **unter der übergebenen `laufId`**, nicht unter einer intern
    abgeleiteten.
  - F9s `Optionen` = `{ basisVerzeichnis?: string; schreiber?: () => void }`
    (Zeile 32-36) — strukturell zuweisungskompatibel zu
    `AusfuehrungsOptionen` (`src/execution-controller/types.ts:35-48`), keine
    neue Optionen-Form nötig.
- [Fakt, real gelesen] `pruefeLaufId` (`src/checkpoint-store/index.ts:75-84`)
  verbietet: leerer String, `/`, Rückwärtsschrägstrich, `..`, Steuerzeichen
  (< 32). **Keine Längenprüfung.** Da `starteGateway` in Schritt 3 bereits
  `schreibeWirkungsmarke(laufId, …)` erfolgreich ausgeführt hat, ist
  `ausloesenderLaufId` zum Eskalationszeitpunkt **nachweislich gültig**; die
  Verkettung `${ausloesenderLaufId}-eskalation-${randomUUID()}` fügt nur `-`
  und Hex-Zeichen hinzu und kann daher keines der vier Verbote neu einführen.
  Die Eskalations-`laufId` ist damit strukturell gültig, ohne eigene Prüfung.
  (Das ist der Grund, warum F-105 in diesem Vertrag **kein**
  Akzeptanzkriterium ist — siehe NICHT.)
- [Fakt, real gelesen] `pruefeStale` (`src/lineage-registry/index.ts:209-232`)
  behandelt `eingabe.pfad` als opaken Schlüssel und überspringt eine Referenz
  still, wenn der Aufrufer ihren Inhalt nicht in `aktuelleEingabeInhalte`
  einspeist (Zeile 222, `if (aktuellerInhalt === undefined) continue`) —
  F-097. **Es existiert im Repo kein Aufrufer, der `pruefeStale` auf
  `bedarf-<laufId>` anwendet:** F9s einziger Einstiegspunkt
  `pruefeUndEntscheideStale` prüft `transport-<laufId>` (Zeile 348-360), und
  `baueAktuelleEingabeInhalte` befüllt ausschließlich den
  BEDARF-Schlüssel (Zeile 329-336). Zusammen mit der Unveränderlichkeit der
  Laufakte (oben) folgt: eine STALE-Prüfung dieser Referenz hätte kein
  Aufrufziel und wäre strukturell immer `false`. Siehe SCOPE Punkt 6.
- [Fakt, real gelesen] Die beiden vorhandenen Prozessstart-Attrappen
  (`src/claude-code-gateway/prozessstart.ts:122`, `:134`) erzeugen
  `ERFOLGREICH` (leeres `permission_denials`) bzw. `FEHLGESCHLAGEN` (kein
  Ergebnisobjekt). **Keine erzeugt `VERWEIGERT`.** AK4/AK6 brauchen deshalb
  je eine neue `Starter`-Attrappe. Sie gehört in
  `src/execution-controller/execution-controller.test.ts` — **nicht** in
  `prozessstart.ts` (D1: keine Änderung an F6a). AK8 bleibt erfüllt: der
  Injektionspunkt ist F6as `optionen.starter`, kein echter Prozess, kein Netz.
- [Fakt, real gelesen] F7s Zählweise (`src/result-evaluator/index.ts`,
  `ermittleErgebnis`): `permission_denials.length === 0` → `ERFOLGREICH`;
  sonst `VERWEIGERT`, und `bypass_verdacht_anzahl` zählt nur die Einträge,
  deren `tool_input` über `toolInputZuTokens` einen von
  `pruefeAufrufparameter` verbotenen Token ergibt. Daraus folgen die beiden
  AK4-Fixtures (SCOPE Punkt 5).
- [Fakt] `scripts/check-contract.mjs` prüft dieses Dateiformat (SCHRITT 0 am
  Anfang, acht Marker `## TASK:`/`GOAL:`/`CONTEXT:`/`SCOPE:`/`NICHT:`/
  `BUDGET:`/`OUTPUT:`/`ESCALATE:`).

SCOPE:

1. `src/execution-controller/index.ts` — Eskalationsschritt zwischen Schritt 4
   und Schritt 5 einsetzen (plan-v2 Delta 2). `versionSequenz` aus dem
   `starteGateway`-Erfolgsergebnis festhalten (heute verworfen).
2. `src/execution-controller/index.ts` — Hilfsfunktion
   `eskalationsLaufId(ausloesenderLaufId) =
   `${ausloesenderLaufId}-eskalation-${randomUUID()}`` (plan-v1 Abschnitt 2.2,
   D3). `randomUUID` aus `node:crypto`.
3. `src/execution-controller/types.ts` — der `ok: true`-Zweig von
   `AusfuehrungsErgebnis` erhält ein **optionales** Feld
   `eskalation?: { laufId: string; bedarfVersionSequenz: number;
   transportVersionSequenz: number }`, gesetzt genau dann, wenn eskaliert
   wurde. Begründung: ohne Rückgabe der intern erzeugten `laufId` kann kein
   Test AK6 prüfen und keine Testkette aufräumen — die ID ist sonst nach
   Rückkehr unauffindbar. Die drei bestehenden Zweige bleiben unverändert;
   `laufStatus` bleibt der Status des **auslösenden** Laufs.
4. Eskalationsinhalte, festgelegt (nicht frei wählbar, damit die Tests
   deterministisch sind):
   - `beschreibung`: `` `E-186-Eskalation: Lauf ${ausloesenderLaufId} wurde
     VERWEIGERT mit bypass_verdacht_anzahl ${n}. Menschliche Prüfung der
     Genehmigungsverweigerungen erforderlich.` ``
   - `eingaben` (genau ein Eintrag): `{ pfad:
     `artefakt:laufakte-${ausloesenderLaufId}`, zitierter_bereich:
     `LAUFAKTE_V0 versionSequenz ${laufakteVersionSequenz},
     bypass_verdacht_anzahl ${n}`, inhalts_hash:
     sha256Hex(kanonischesJson(laufakte)) }` — `sha256Hex`/`kanonischesJson`
     aus `src/checkpoint-store/index.ts` (Import von außen, D1 gewahrt).
   - `erzeugeTransportpaket`: `bedarfVersionSequenz` aus dem Rückgabewert von
     `erfasseBedarf`; `inhalt = kanonischesJson(laufakte)`;
     `executor = 'mensch'`.
   - `haendigeAus(eskLaufId, profilReferenz, optionen)`.
   Alle vier F9-Aufrufe erhalten `optionen` unverändert durchgereicht (D5).
5. Tests in `src/execution-controller/execution-controller.test.ts`
   (bestehende Fälle unverändert lassen):
   - Zwei lokale `Starter`-Attrappen (siehe CONTEXT), beide mit
     `type: 'result'` und nicht-leerem `permission_denials`:
     (a) `tool_input: { command: 'claude --dangerously-skip-permissions' }`
     → `VERWEIGERT`, `bypass_verdacht_anzahl === 1`;
     (b) `tool_input: { command: 'ls -la' }`
     → `VERWEIGERT`, `bypass_verdacht_anzahl === 0`.
     Vor der eigentlichen AK4-Assertion einmal belegen, dass die Attrappen
     wirklich die beabsichtigte Klassifikation erzeugen (sonst prüft AK4 an
     einer Fixture vorbei — F-103-Muster).
   - **AK4-positiv:** Attrappe (a) → `ergebnis.eskalation` ist gesetzt,
     `ladeArtefaktVersion('bedarf-' + ergebnis.eskalation.laufId)` liefert
     eine Version, `ergebnis.eskalation.laufId !== laufId`.
   - **AK4-negativ:** Attrappe (b) → `ergebnis.eskalation === undefined`, und
     es existiert **kein** Artefakt `bedarf-*` unter einer von `laufId`
     abgeleiteten Eskalations-ID. Der Nichtaufruf-Nachweis darf keine
     Vakuum-Assertion sein (F-103): er muss an einer Stelle hängen, die im
     Positivfall nachweislich anders aussieht — belege das mit einem
     Rot-Fall-Kalibrierungslauf (Bedingung `> 0` testweise auf `>= 0`
     gesetzt, Test wird rot; zurückgebaut, grün) und zeige beides im Bericht.
   - **AK6-1 (F-091):** `stelleLaufstatusFest(ausloesenderLaufId)` liefert
     **vor und nach** dem Eskalationsschritt `ABGESCHLOSSEN` mit
     `ergebnis: 'VERWEIGERT'` — die Assertion vor der Eskalation über einen
     eigenen, direkten Aufruf, da `fuehreAufgabeDurch` erst danach
     zurückkehrt.
   - **AK6-2 (Lineage):** `ladeArtefaktVersion('bedarf-' + eskLaufId)` →
     `eingaben[0].pfad === 'artefakt:laufakte-' + ausloesenderLaufId` und
     `eingaben[0].inhalts_hash === sha256Hex(kanonischesJson(laufakte))`,
     gegen die real geladene Laufakte
     (`ladeArtefaktVersion('laufakte-' + ausloesenderLaufId)`), nicht gegen
     einen im Test nachgebauten Wert.
   - **AK6-3:** `stelleLaufstatusFest(eskLaufId)` liefert
     `KLAERUNG_ERFORDERLICH` — der korrekte Zustand einer offenen Aushändigung
     (plan-v1 Abschnitt 2.2).
   - **Delta 1 (Wurf):** ein Fall, der einen Wurf in einem der drei
     F9-Aufrufe auslöst, und prüft, dass (a) die Rejection unverändert beim
     Aufrufer ankommt und (b) `stelleLaufstatusFest(ausloesenderLaufId)`
     danach weiterhin `ABGESCHLOSSEN` liefert. Löse den Wurf über einen realen
     Vorbedingungsbruch aus, den F9 selbst wirft (Zeile 114-117), nicht über
     einen Modul-Mock (D1).
   - Aufräumen: `raeumeKette` um die Eskalations-Ketten erweitern
     (`<eskLaufId>`, `lineage-bedarf-<eskLaufId>`,
     `lineage-transport-<eskLaufId>`).
   - **Pfadlängen-Auflage (Windows, F-109):** Test-`laufId`s in den
     WS-2a-Fällen mit einem Präfix von höchstens 4 Zeichen bilden (z. B.
     `esk`). Begründung: der längste entstehende Pfad ist
     `kontrollzustand-test\lineage-transport-<laufId>-eskalation-<uuid>\
     checkpoints\<n>-<64 Hex>.json`; mit dem WS-1-Präfix `gruen-` liegt er bei
     rund 250 Zeichen ab Repo-Wurzel, also ~10 Zeichen unter der
     Windows-MAX_PATH-Grenze von 260. Prüfe die reale Länge einmal im Bericht
     nach.
6. **Kein STALE-Prüfpfad für die Laufakte-Referenz.** Der Verweis
   `artefakt:laufakte-<ausloesenderLaufId>` ist ein Herkunfts-/Lineage-Beleg,
   keine Frischeprüfung: die Laufakte ist unveränderlich (CONTEXT), und es gibt
   keinen Aufrufer, der `pruefeStale` auf `bedarf-<laufId>` anwendet (CONTEXT).
   Ein Test, der die Referenz in `aktuelleEingabeInhalte` einspeist und
   `stale === false` behauptet, wäre eine Vakuum-Assertion (F-103-Muster) und
   ist **nicht** zu bauen. Statt dessen: Dateikopf von
   `src/execution-controller/index.ts` hält in zwei Sätzen fest, dass die
   Referenz Herkunft belegt und bewusst nicht stale-geprüft wird, mit
   Fundstellenangabe (`lineage-registry/index.ts:222`,
   `human-transport/index.ts:348-360`). AK6-2 (SCOPE Punkt 5) ist der
   Nachweis, dass die Referenz **korrekt geschrieben** wird — das ist die
   prüfbare Aussage.
7. `scripts/check-f8-execution-controller.mjs` — unverändert lassen. Die
   AK1-/AK3-Grep-Listen dürfen **nicht** um `bypass_verdacht_anzahl`,
   `erfasseBedarf`, `haendigeAus` o. Ä. erweitert werden: der Controller liest
   eine strukturierte Rückgabe aus und ruft öffentliche Einstiegspunkte auf,
   er bildet keine Regel nach. Prüfe nach dem Bau, dass beide Greps weiterhin
   grün sind (`non_execution_kind` darf im Produktcode nicht auftauchen —
   greife die Klassifikation nur über `ergebnis` und
   `bypass_verdacht_anzahl` ab).
8. `state/gates.md` — F8-Zeile um den WS-2a-Beleg ergänzen (echter Befehl +
   Ausgabe aus dieser Sitzung, erst nach realem Prüflauf).
   `state/memory-map.md`, `docs/STATUS.md` nachziehen.
9. `features/F8/journal.md` — Nachtrag für diesen Vertrag und den Bau.
   `features/F8/feature.md` bleibt auf `READY_FOR_TECH` bzw. `IN_ARBEIT`:
   F8 ist erst mit WS-2b abgeschlossen (F-093-Muster beachten — Statuswechsel
   gehört in denselben Commit wie der letzte Bau-Commit des Features, also
   noch nicht hier).

NICHT:

- **WS-2b** (erneuter Anlauf nach `KLAERUNG_ERFORDERLICH`/`FEHLGESCHLAGEN`,
  AK7, plan-v1 Abschnitt 2.3) — hängt an der offenen Wiederaufnahme-`laufId`-
  Konvention (plan-v1 Abschnitt 10, Frage 2), noch nicht entschieden.
- **F-105** (`fuehreAufgabeDurch` wirft bei ungültiger `laufId`) — bewusst
  **kein** AK dieses Vertrags. Die Eskalations-ID ist strukturell gültig,
  sobald `ausloesenderLaufId` es ist (CONTEXT); WS-2a verschärft das Risiko
  also nicht. F-105 bleibt als eigenes P2-Finding am WS-1-Code offen.
- **F-106** (AK2 nur über eine von vier Verweigerungsquellen getestet) und
  **F-107** (feldweise statt struktureller `GatewayOptionen`-Durchreichung) —
  bekannt, nicht blockierend, nicht Teil dieses Auftrags. Wenn du in
  SCOPE Punkt 1 ohnehin die `starteGateway`-Aufrufstelle anfasst, ist eine
  Behebung von F-107 zulässig, aber nur als eigener, im Bericht benannter
  Punkt — nicht stillschweigend.
- **Mehrfach-Eskalation innerhalb desselben Laufs** (plan-v1 Abschnitt 10,
  Frage 3) — fachlich offen. D3s `randomUUID`-Suffix verhindert nur die
  ID-Kollision; eine Regel „darf ein Lauf zweimal eskalieren" wird hier weder
  gebaut noch verhindert.
- **Änderungen an F1B/F2/F5/F6a/F7/F9 selbst** (D1) — der Controller ruft
  ausschließlich von außen auf. Insbesondere **keine** neue Attrappe in
  `src/claude-code-gateway/prozessstart.ts` und **keine** Erweiterung von
  `baueAktuelleEingabeInhalte` in `src/human-transport/index.ts`.
- **Import der Antwort / Abschluss der Eskalation** (`importiereAntwort`,
  `pruefeUndEntscheideStale`, `entscheideStale`) — F8 erzeugt die Vorlage an
  den Menschen, es begleitet die Antwort nicht zurück. `features/F8/
  feature.md` Scope, unverändert.
- **A4-Zustandsebenen** (E-192, F-090), Konsolentext-Deutung, automatischer
  Neustart einer bestehenden `laufId`, Leitstand-Bedienung, Autorisierungs-/
  Startfreigabeprüfung (bleibt `starteGateway`/F4, E-193) —
  `features/F8/feature.md` Nicht-Ziele, unverändert.

BUDGET: Ein Baudurchgang plus höchstens eine Korrekturrunde
(`CLAUDE.md`-Zuschnitt-Heuristik; WS-1 hat diesen Zuschnitt real bestätigt).
Zweites Rot auf demselben Gate ⇒ BLOCKIERT ⇒ Mensch.

OUTPUT:

- Geänderte Dateien: `src/execution-controller/index.ts`,
  `src/execution-controller/types.ts`,
  `src/execution-controller/execution-controller.test.ts`,
  `state/gates.md`, `state/memory-map.md`, `docs/STATUS.md`,
  `features/F8/journal.md`.
- Keine neuen Dateien erwartet. Legst du doch eine an, benenne sie im Bericht
  mit Begründung.
- Beleg: `npm run check:template` und `npm run check` grün, Konsolenausgabe
  im Bericht zeigen. Zusätzlich die beiden Kalibrierungsläufe aus SCOPE
  Punkt 5 (AK4-negativ, und die Attrappen-Vorprüfung) mit Rot- und
  Grün-Zustand.
- Die reale Länge des längsten erzeugten Pfades aus SCOPE Punkt 5 einmal
  nennen (Zeichenzahl ab Repo-Wurzel).
- Commit ausschließlich mit expliziten Pfaden (nie `-A`/`.`), `git-flow`-Skill
  nutzen, kein Commit ohne frische `state/freigabe-commit.md`, Push separat
  autorisiert.
- Bericht, knapp: was geändert wurde, welche Checks liefen, Ergebnis, echte
  Blocker. Keine Entwicklungserzählung.

ESCALATE:

- **Ein Widerspruch zwischen diesem Vertrag, plan-v1/plan-v2,
  `features/F8/feature.md` und dem realen Code** → anhalten, beide Stellen
  wörtlich zitieren, melden. Nicht selbst auflösen, nicht im Test umgehen
  (F-104).
- Eine reale Signatur (F1B/F2/F5/F6a/F7/F9) weicht von den in CONTEXT
  zitierten Ständen ab → anhalten, Fundstelle zitieren, melden. Nicht
  stillschweigend im Controller kompensieren.
- Eine der beiden Attrappen erzeugt nicht die im Vertrag angenommene
  Klassifikation (`VERWEIGERT` mit `bypass_verdacht_anzahl` 1 bzw. 0) →
  anhalten und melden, was tatsächlich herauskam. **Nicht** die Attrappe so
  lange verändern, bis irgendein `VERWEIGERT` entsteht.
- Ein Kalibrierungslauf reproduziert sich nicht wie erwartet (erwarteter
  Rot-Fall bleibt aus) → anhalten, benennen welche Prüfung, melden.
- `npm run check` wird rot an einem Glied, das dieser Auftrag nicht angefasst
  hat → anhalten und melden. Kein Nachziehen fremder Stellen.
- Eine Assertion lässt sich nur so formulieren, dass sie auch ohne den
  Prüfgegenstand wahr wäre → nicht schreiben, sondern melden (F-103).
- `git commit` oder `git push` wird ohne frische Freigabedatei verlangt →
  nicht ausführen.

Vertrag endet mit Freigabe-Halt: kein Bau, kein Commit, kein Push in diesem
Schritt. Ausführung erst nach Stefans expliziter Freigabe.
