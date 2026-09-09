# F14 — Timeout und Abbruch

## ID

F14

## Titel

Timeout und Abbruch

## Status

Status: READY_FOR_TECH

Gültige Status-Werte (geprüft vom Gate, siehe A3a–e in
`features/AF-F001/feature.md`): `ENTWURF, READY_FOR_TECH,
WORKSTREAM_SCHNITT_GENEHMIGT, IN_ARBEIT, FEATURE_GATE, ABGESCHLOSSEN,
BLOCKIERT, ABGEBROCHEN`.

## Ziel

Eine aktive externe Ausführung muss kontrolliert beendet werden können, ohne
einen inkonsistenten Kontrollzustand oder verwaiste Executor-Prozesse zu
hinterlassen — automatisch bei Überschreiten einer harten Wanduhr-Grenze, oder
manuell durch Stefan über den Leitstand.

Heute ist das nicht möglich: `src/claude-code-gateway/prozessstart.ts:81-109`
ruft `execFile` mit Callback und verwirft das zurückgegebene ChildProcess-
Objekt. Es gibt im gesamten Repo weder eine PID noch ein Kill-Handle. Ein
Timeout-Lauf (Exit 137, leeres stdout — TP-01e Messfall A) wird von
`src/result-evaluator/index.ts:96-102` als `FEHLGESCHLAGEN /
grund: 'kein_ergebnisobjekt'` klassifiziert und ist damit von einem Absturz
nicht unterscheidbar.

Die Sollquelle sieht einen Abbruchzustand bereits vor
(`docs/projekt/zielfassung.md:131`, „`ABGEBROCHEN` terminal und
objektbezogen") und verbietet zugleich jeden Automatismus danach
(`zielfassung.md:137`, „Unterbrochener BAU wird nie automatisch neu
gestartet").

Entschieden (Stefan, 08.09.2026):

- **E-M2-7** — Abbruch und Timeout werden additiv als `FEHLGESCHLAGEN` mit
  eigenem, maschinenlesbarem `grund` festgehalten, nicht als vierter
  Terminalwert. Die Menge der drei Terminalausgänge bleibt unangetastet.
- **E-M2-8** — Ein Abbruch wirkt auf genau eine `laufId`. Das Auftragsartefakt
  (F11/F12) bleibt unberührt.

## Scope

- Prozessgriff und Abbruchfähigkeit im Gateway (AK1).
- Harte, konfigurierbare Wanduhr-Grenze pro Invocation (AK2).
- Timeout und Abbruch strukturell unterscheidbar (AK3).
- Unterprozesse sterben unter Windows mit (AK4).
- Eindeutige Klassifikation und vollständige Nachweisfelder (AK5, AK6).
- Manueller Abbruch über den Leitstand (AK7).
- Kein Schreibpfad kann einem aktiven Lauf ein Terminalergebnis zuschreiben
  (AK8).
- Gate und realer Nachweis (AK9, AK10).

## Nicht-Ziele

- **Kein Inaktivitäts-/Heartbeat-Timeout.** Ein Executor kann legitim lange
  ohne sichtbaren Output arbeiten; ohne Heartbeat lässt sich aus fehlendem
  Output nichts ableiten. Späteres eigenes Konzept, hier als Finding.
- **Kein globaler Workflow-Timeout.** Wartezeiten auf menschliche
  Entscheidungen dürfen nicht gegen eine Invocation-Grenze laufen.
- **Kein automatisches Retry, keine Retry-Strategie, kein automatischer
  Neustart** eines abgebrochenen Laufs (`zielfassung.md:137`).
- **Kein vierter Terminalwert** (E-M2-7). Kein Eingriff in
  `schemas/kontrollzustand-wirkungsmarke-payload.schema.json:59`,
  `checkpoint-store/types.ts:37`, `LaufStatus` oder
  `ENTSCHEIDUNG_ERGEBNIS_WERTE`.
- **Kein Auftragsabbruch** (E-M2-8). Ein abgebrochener Lauf sperrt den Auftrag
  nicht.
- **Keine neue Recovery-Architektur.**

## Akzeptanzkriterien

- **AK1** — Der `Starter`-Vertrag trägt eine Abbruchfähigkeit; ein laufender
  Prozess kann auf Anforderung beendet werden. Rot-/Grün-Fall mit Attrappe.
- **AK2** — Harte Wanduhr-Grenze pro Invocation, konfigurierbar von F8
  (`AusfuehrungsOptionen`) bis F6a durchgereicht; kein fachlich fest codierter
  Wert. Das neue Feld steht zugleich in `VERBOTENE_OPTIONEN_FELDER`
  (`scripts/leitstand-server.mjs:725`).
- **AK3** — `ProzessErgebnis` unterscheidet Timeout und Abbruch von einem
  regulären Ende und von einem Startfehler. Additiv, keine Bedeutungsänderung
  bestehender Felder.
- **AK4** — Unter Windows sterben Unterprozesse des Kindprozesses mit. Realer
  Rot-/Grün-Nachweis auf der Zielmaschine, nicht nur mit Attrappe.
- **AK5** — F7 klassifiziert einen Timeout- oder Abbruchlauf als
  `FEHLGESCHLAGEN` mit eigenem `grund` (`'timeout'` bzw.
  `'abgebrochen_manuell'`), unterscheidbar von `'kein_ergebnisobjekt'`.
- **AK6** — Die Terminalmarke trägt in `daten` nachvollziehbar: betroffene
  `laufId`, Zeitpunkt, Art (`MANUELL` / `TIMEOUT`), Abbruchgrund, letzter
  gültiger Checkpoint, Ergebnis der Beendigungsoperation.
- **AK7** — Manueller Abbruch über den Leitstand wirkt auf genau eine
  `laufId`. Die aktive Invocation wird beendet, BEVOR die Terminalmarke
  geschrieben wird — nie umgekehrt.
- **AK8** — Kein Schreibpfad kann einem noch aktiven Lauf ein Terminalergebnis
  zuschreiben. Ein aktiver Lauf ist strukturell von `KLAERUNG_ERFORDERLICH`
  unterscheidbar. Löst F-175 und F-172.
- **AK9** — Gate-Skript `scripts/check-f14-abbruch.mjs`, Teil von
  `npm run check`.
- **AK10** — Realer Nachweislauf: ein echter Claude-Code-Kindprozess läuft in
  den Timeout, stirbt samt Unterprozessen, das Ergebnis ist als Timeout
  erfasst, und ein Folgelauf trägt es nachweislich im Kontextpaket.
  Protokoll nach dem Muster `features/F13/nachweis-ws3.md`.

## Dependencies

- F6a (Claude Code Gateway) — `starteProzess`, `Starter`, `ProzessErgebnis`.
- F7 (Result Evaluator) — Klassifikation, drei Terminalausgänge.
- F1B (Wirkungsmarke) — Terminalartefakt, `stelleLaufstatusFest`.
- F8 (Execution Controller) — `AusfuehrungsOptionen`-Durchreichung.
- F10/F12/F13 (Leitstand) — Bedienpfad, `laufAktiv`-Sperre (D13),
  Entscheidungs-Schreibpfad.
- Offene Findings: F-172, F-175, F-176.
