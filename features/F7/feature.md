# F7 — Result Evaluator

## ID

F7

## Titel

Result Evaluator

## Status

Status: ABGESCHLOSSEN

Gültige Status-Werte (geprüft vom Gate, siehe A3a–e in
`features/AF-F001/feature.md`): `ENTWURF, READY_FOR_TECH,
WORKSTREAM_SCHNITT_GENEHMIGT, IN_ARBEIT, FEATURE_GATE, ABGESCHLOSSEN,
BLOCKIERT, ABGEBROCHEN`.

## Ziel

Ein von F6a abgeschlossener Claude-Code-Lauf (Laufakte + Rohstrom) wird
ausschließlich aus seiner strukturierten Ergebnishülle und dem
Ereignisstrom in genau einen der drei Terminalausgänge klassifiziert
(`ERFOLGREICH`/`VERWEIGERT`/`FEHLGESCHLAGEN`, ARCHITECTURE §4) und als
`terminal`-Wirkungsmarke über F1B festgehalten — ohne Konsolentext-
Deutung und ohne die Wirkungsmarken-/Ergebnisobjekt-Parsing-Logik
anderer Module ein zweites Mal zu bauen (D5).

## Scope

- Neues, eigenständiges Modul `src/result-evaluator/`, ruft F1B, F6a
  und F4 ausschließlich von außen auf — kein Nachbau ihrer Logik.
- `klassifiziereLauf(laufId, profilReferenz, eingaben, optionen):
  KlassifikationsErgebnis` — `eingaben.laufakte` trägt die vom Aufrufer
  bereits geladene `LaufakteV0Daten` (F7 baut **keinen** eigenen
  Laufakte-Lesepfad, Design-Entscheidung 2 in
  `state/plan-v1-f7-result-evaluator.md` Abschnitt 4 — Korrektur
  gegenüber einer früheren Formulierung dieses Abschnitts, siehe
  `state/findings.md` F-063). Liest den referenzierten Rohstrom
  (`rohstrom_referenz.pfad`), prüft den Rohstrom-Hash gegen
  `rohstrom_referenz.inhalts_hash`, klassifiziert nach ARCHITECTURE §4,
  exakter Reihenfolge:
  1. `beobachtungsbasis_vollstaendig === false` oder Rohstrom-Hash
     stimmt nicht → `FEHLGESCHLAGEN` (ungültige Beobachtungsbasis).
  2. Sonst: strukturiertes Ergebnisobjekt aus `stdout` extrahieren
     — über F6as `leseErgebnisobjekt` (wird dafür exportiert, siehe
     Dependencies, F-062), nicht neu implementiert. Nicht-leeres
     `permission_denials[]` (E-184, real belegtes Feld, siehe
     `state/tp-nachtrag.md` TP-03d Messfall 1/2) → `VERWEIGERT`.
  3. Sonst → `ERFOLGREICH`.
- E-186: jede Verweigerung wird zusätzlich gegen F4s
  `VERBOTENE_AUFRUFPARAMETER` geprüft — `tool_input` (Objekt, kein
  Tokens-Array) wird dafür über einen neuen, kleinen Adapter in Tokens
  übersetzt, bevor `pruefeAufrufparameter` (F4, wiederverwendet) läuft
  (Korrektur nach Advisor-Pass, 31.08.2026: kein reiner Aufruf ohne
  eigenen Code, siehe `state/plan-v1-f7-result-evaluator.md` Design-
  Entscheidung 5). Ein Treffer wird separat gezählt/markiert (Feld
  `bypass_verdacht_anzahl`), nicht in `ergebnis` selbst kodiert. **Nur
  das Zählen ist Teil dieses Features** — die von E-186 zusätzlich
  verlangte Eskalation braucht einen Aufrufer/Adressaten, der heute
  nicht existiert (F8 nicht gebaut), siehe Nicht-Ziele.
- `is_error`/`non_execution_kind` (von E-184 erwähnt) werden, falls im
  Ergebnisobjekt vorhanden, informativ mitgeführt — **nicht** als
  Voraussetzung für die Klassifikation selbst. Grund: beide Felder sind
  in `state/tp-nachtrag.md` an keiner Stelle real belegt (nur
  `permission_denials` und `result` wurden tatsächlich beobachtet) —
  siehe Finding F-061.
- Schreibt nach Klassifikation `schreibeWirkungsmarke(laufId,
  profilReferenz, 'terminal', { ergebnis })` (F1B, unverändert
  wiederverwendet) — **kein** eigenes Klassifikationsartefakt parallel
  zur Wirkungsmarke, solange plan-v1 das nicht ausdrücklich begründet
  (Redundanzvermeidung, wird dort verbindlich entschieden).
- F6a: `leseErgebnisobjekt` (`src/claude-code-gateway/index.ts:71`)
  muss exportiert werden — aktuell modulintern, F7 braucht exakt diese
  Parsing-Logik extern (D5). Kleine, rückwärtskompatible
  Sichtbarkeitsänderung, kein Verhaltensunterschied (F-062).
- Gate-Skript `scripts/check-f7-result-evaluator.mjs`, eingehängt in
  `npm run check` und `npm run check:template`.

Technische Konkretisierung: `state/plan-v1-f7-result-evaluator.md`.

## Nicht-Ziele

- **Prozessstart, Beobachtungsbasis erzeugen.** F7 ist reiner Konsument
  der Laufakte/des Rohstroms — F6a bleibt die einzige Komponente, die
  einen Werkzeugprozess startet.
- **„Blockiert"-Zustand/Blocker-Kennung.** Bereits vollständig durch
  F1Bs `stelleLaufstatusFest` (`KLAERUNG_ERFORDERLICH`, mit
  Blocker-Kennung/Grund/Evidenz/Auflösungsbedingung/Resume-Ziel,
  ARCHITECTURE §4) abgedeckt. F7 erzeugt diesen Zustand nicht aktiv,
  sondern schließt ihn durch das Schreiben der Terminal-Wirkungsmarke.
- **Autorisierung/Startfreigabe (F3/F4).** F7 läuft strikt nach dem
  Lauf, nie davor.
- **Eskalation eines E-186-Treffers.** F7 zählt/markiert, eskaliert
  aber nicht (kein Aufrufer/Adressat vorhanden, F8 nicht gebaut) —
  Korrektur nach Advisor-Pass, 31.08.2026.
- **Orchestrierung, Wiederaufnahme, Resume-Ziele.** Execution
  Controller (Deliverable 3, Feature #8, nicht gebaut).
- **Konsolentext-Deutung in irgendeiner Form** (ARCHITECTURE §7,
  verbotenes Pattern) — Klassifikation ausschließlich aus dem
  strukturierten Ergebnisobjekt und `permission_denials[]`.

## Akzeptanzkriterien

1. Klassifikation folgt exakt der ARCHITECTURE §4-Reihenfolge:
   ungültige Beobachtungsbasis → `FEHLGESCHLAGEN` vor gültiger
   Verweigerung → `VERWEIGERT` vor `ERFOLGREICH`.
2. `beobachtungsbasis_vollstaendig: false` führt immer zu
   `FEHLGESCHLAGEN`, unabhängig vom Inhalt von `permission_denials`.
3. Nicht-leeres `permission_denials[]` führt immer zu `VERWEIGERT`
   (E-184) — kein allgemeines Erfolgsflag überstimmt eine konkrete
   Verweigerung.
4. Kein Codepfad leitet ein Ergebnis aus `stdout`-Fließtext ab, nur aus
   dem strukturierten Ergebnisobjekt — mechanisch per Grep geprüft
   (Muster AK12 aus F6a).
5. `leseErgebnisobjekt` wird von F6a importiert, nicht in F7 neu
   implementiert (D5, schließt F-062).
6. `schreibeWirkungsmarke(..., 'terminal', { ergebnis })` läuft
   ausschließlich über F1B, kein eigener Wirkungsmarken-Schreibcode in
   F7.
7. Der Rohstrom-Hash wird vor der Klassifikation gegen
   `rohstrom_referenz.inhalts_hash` geprüft; bei Abweichung
   `FEHLGESCHLAGEN` (Integritätsschutz).
8. `is_error`/`non_execution_kind` werden, falls vorhanden, informativ
   übernommen, sind aber nirgends Voraussetzung für einen der drei
   Klassifikationszweige (F-061).
9. E-186: Verweigerungen mit einem `VERBOTENE_AUFRUFPARAMETER`-Treffer
   im `tool_input` werden gezählt/markiert, nicht wie normale
   Verweigerungen stillschweigend behandelt.
10. `npm run check` → Exit 0.

### Nachweis (Baudurchgang, state/tasks/f7-result-evaluator.md, 02.09.2026)

Alle zehn AK real erfüllt, Modul `src/result-evaluator/`
(`index.ts`/`types.ts`/`result-evaluator.test.ts`) plus
`scripts/check-f7-result-evaluator.mjs` (in `npm run check` und
`npm run check:template` eingehängt).

1. `ermittleErgebnis` (`index.ts`) prüft in exakt dieser Reihenfolge:
   Rohstrom-Integrität/-Fehlen → `beobachtungsbasis_vollstaendig` →
   `leseErgebnisobjekt`-Ergebnis → `permission_denials` → sonst
   `ERFOLGREICH`. Testfall „AK2" belegt real, dass FEHLGESCHLAGEN vor
   VERWEIGERT gewinnt.
2. Testfall „AK2: beobachtungsbasis_vollstaendig:false gewinnt gegen ein
   gleichzeitig nicht-leeres permission_denials" — real grün.
3. Testfälle TP-03d Messfall 2/3 (`VERWEIGERT` trotz `result`-Fließtext,
   das für sich genommen keine Verweigerung nahelegt) — real grün.
4. Gate-Abschnitt (a): Grep gegen `.includes(`/`.match(`/`.indexOf(`/
   `.search(`/RegExp-`.test(` in `src/result-evaluator/*.ts` (ohne
   `*.test.ts`), Selbsttest mit vier simulierten Verstoßformen, zusätzlich
   real per TEMP-ROT-FALL-Injektion gegen den eigenen Code kalibriert
   (Befund erschien, danach zurückgenommen).
5. `leseErgebnisobjekt` in `src/claude-code-gateway/index.ts` exportiert
   (reine Sichtbarkeitsänderung), `index.ts` importiert sie statt einer
   eigenen Reimplementierung — F-062 gelöst.
6. Gate-Abschnitt (c): Ende-zu-Ende-Lauf `RUN_PREPARED` →
   `klassifiziereLauf` → `stelleLaufstatusFest` liefert `ABGESCHLOSSEN`
   mit demselben `ergebnis` — belegt real, dass ausschließlich F1Bs
   `schreibeWirkungsmarke` schreibt.
7. Testfälle „Rohstrom-Hash weicht ab", „rohstrom_referenz.pfad
   existiert nicht" (beide `FEHLGESCHLAGEN`, Gründe
   `rohstrom_integritaet`/`rohstrom_fehlt`) sowie zwei ergänzte
   Diagnosefälle für den dritten FEHLGESCHLAGEN-Grund
   (`kein_ergebnisobjekt`): defekter Rohstrominhalt trotz passendem Hash,
   und ein syntaktisch valides, aber nicht `"type":"result"`-Objekt trotz
   `beobachtungsbasis_vollstaendig:true` (Reviewer-Befund vom
   02.09.2026 nachgezogen).
8. Testfall „is_error/non_execution_kind werden informativ
   durchgereicht" (ERFOLGREICH-Zweig) sowie ein ergänzter Testfall für
   denselben Durchreichungsmechanismus im VERWEIGERT-Zweig
   (QA-Befund vom 02.09.2026 nachgezogen) — beide Felder erscheinen im
   Rückgabeobjekt, `ergebnis` bleibt unverändert.
9. Testfälle „E-186: konstruierter tool_input.command mit Verbotswert"
   (einfaches Token) und „E-186 (plan-v1 8.4): in Shell-Quoting
   eingebetteter Verbotswert" (Adapter tokenisiert `command` am
   Leerzeichen, entfernt danach umschließende Anführungszeichen je
   Token) — beide zählen `bypass_verdacht_anzahl: 1`, keine Eskalation.
   **Dokumentierte Grenze** (QA-/Reviewer-Befund vom 02.09.2026, siehe
   `state/findings.md` F-066): ein Verbotswert ohne Wortgrenze
   (angehängtes Suffix statt eigenständigem Token, z. B.
   `test--dangerously-skip-permissions`) wird von `pruefeAufrufparameter`
   (F4, exakter Tokenvergleich) NICHT gezählt — eigener Testfall belegt
   dieses Verhalten explizit, statt es unverifiziert zu lassen.
10. `npm run check` → Exit 0, 87/87 Tests grün (Lauf 02.09.2026, nach
    Reviewer-/QA-Nachbesserung).

## Zuordnung

Deliverable 3, Feature #7 — Ausführungspfad
(`docs/projekt/umsetzungsplan-fassung-1.md` Zeile 74, Tabellenzeile 7
„Verarbeitet die Ausgabe des Gateways"). Reihenfolge 6a → 7 → 6b bereits
in `features/F6a/feature.md` (Zuordnung) entschieden, 31.08.2026 —
Grund: F6a kann ohne F7 keinen Lauf terminal abschließen (bleibt in
`KLAERUNG_ERFORDERLICH`).

## Dependencies

- Hard, erfüllt (nach diesem Feature): **F6a** — `LaufakteV0Daten`,
  Rohstrom-Konvention, `leseErgebnisobjekt` (Export wird Teil dieses
  Features, F-062).
- Hard, erfüllt: **F1B** (Checkpoint Store) —
  `schreibeWirkungsmarke`, `stelleLaufstatusFest`.
- Weich, erfüllt: **F4** (Invocation Policy) — `VERBOTENE_AUFRUFPARAMETER`,
  wiederverwendet für E-186, kein neuer Vertrag nötig.
- Ausdrücklich **nicht** Voraussetzung: **F8** (Execution Controller,
  nicht gebaut) — F7 funktioniert unabhängig; `KLAERUNG_ERFORDERLICH`
  bleibt der sichtbare Zustand, bis F8 orchestriert.
- Offene Vorfrage, in plan-v1 zu klären: `is_error`/`non_execution_kind`
  real unbelegt (F-061) — beeinflusst nur informative Felder, nicht die
  Kernklassifikation (siehe Scope/AK8).

## Workstream-Liste

Vermutlich **ein** Workstream — kein Prozessstart, keine
Plattformabhängigkeit, keine externe Wirkung, deutlich kleiner als F6a.
Wird in plan-v1 verbindlich bestätigt oder widerlegt.

## Entscheidungs-Referenzen

- `ARCHITECTURE.md` §4 (drei Terminalausgänge, Klassifikationsreihenfolge,
  zwei Ablagen, „Klassifiziert wird ausschließlich aus Ergebnishülle und
  strukturiertem Ereignisstrom").
- `docs/projekt/zielfassung.md` §9.4 — E-184, E-186.
- `docs/projekt/zielfassung.md` §16.2 Modultabelle, Zeile 335 — Result
  Evaluator „klassifiziert Läufe ausschließlich aus Ergebnishülle und
  Ereignisstrom", „keine Ableitung aus Konsolentext".
- `state/tp-nachtrag.md` — TP-03d Messfall 1/2 (`permission_denials`,
  `result` real belegt), TP-01e Messfall A/B (`beobachtungsbasis_vollstaendig`
  real belegt).
- `state/findings.md` — F-061 (`is_error`/`non_execution_kind`
  unbelegt), F-062 (`leseErgebnisobjekt`-Export).
- `src/claude-code-gateway/index.ts`, `src/checkpoint-store/index.ts`,
  `src/invocation-policy/index.ts` — die wiederzuverwendenden Module.

## Spec-Referenz

Noch keine — `spec.md` entsteht über den Skill `spec-schreiben`, falls
die Ausführungsrolle das für den Umfang für nötig hält.
