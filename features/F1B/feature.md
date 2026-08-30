# F1B — Wirkungsmarke / RUN_PREPARED / Terminalartefakt

## ID

F1B

## Titel

Wirkungsmarke / RUN_PREPARED / Terminalartefakt

## Status

Status: ABGESCHLOSSEN

Gültige Status-Werte (geprüft vom Gate, siehe A3a–e in
`features/AF-F001/feature.md`): `ENTWURF, READY_FOR_TECH,
WORKSTREAM_SCHNITT_GENEHMIGT, IN_ARBEIT, FEATURE_GATE, ABGESCHLOSSEN,
BLOCKIERT, ABGEBROCHEN`. Ein fehlendes `Status:`-Feld oder ein Wert
außerhalb dieser Menge gilt als Fehler.

## Ziel

Ein Lauf mit möglicher Außenwirkung ist vor dem Start als `RUN_PREPARED`
markiert und endet in genau einem der drei Terminalzustände. Fehlt das
Terminalartefakt, entsteht ein blockierter Klärzustand statt eines
automatischen Neustarts.

## Scope

- Kontrollzustand-Eintrag `typ: "wirkungsmarke"` mit eigenem
  Payload-Schema unter `schemas/`, in derselben Hash-Kette wie die
  Checkpoints derselben `lauf_id` (kein eigener Dateibaum, kein neuer
  Datenbereich — Muster: F2 Option A).
- `RUN_PREPARED` als Wirkungsmarke, nie Wiederaufnahmepunkt (A5).
- Terminalartefakt mit genau drei Werten `ERFOLGREICH` / `VERWEIGERT` /
  `FEHLGESCHLAGEN` und der Klassifikationsreihenfolge aus
  `ARCHITECTURE.md:58`.
- Eine Funktion, die für eine `lauf_id` feststellt: `RUN_PREPARED` ohne
  gültiges Terminalartefakt → `KLAERUNG_ERFORDERLICH`, blockierend.
- Gate-Erweiterung, eingehängt in `npm run check` und
  `npm run check:template`.

## Nicht-Ziele

- Kein Prozessstart, kein Gateway, keine Freigabeprüfung (das ist F3),
  keine UI, keine Bewertung von Ergebnissen, kein neues
  Persistenzformat.

## Akzeptanzkriterien

1. Wirkungsmarke schreib- und ladbar, Payload-Schema maschinell geprüft.
2. Sie liegt in derselben Hash-Kette wie die Checkpoints ihrer `lauf_id`.
3. `RUN_PREPARED` wird vor der möglichen Außenwirkung geschrieben.
4. Die drei Terminalzustände sind ein Typ, kein String; ein allgemeines
   Erfolgsflag überstimmt nie eine konkrete Verweigerung.
5. `RUN_PREPARED` ohne gültiges Terminalartefakt → `KLAERUNG_ERFORDERLICH`,
   nie automatischer Neustart.
6. Ein bewusst neu gestarteter Lauf bekommt eine eigene `lauf_id`.
7. Tests: erfolgreicher Lauf, `VERWEIGERT`, fehlendes Terminalartefakt,
   Abbruch zwischen `RUN_PREPARED` und Terminalartefakt.
8. `npm run check` → Exit 0.

## Zuordnung

Meilenstein 1, Deliverable 1 — Kontrollzustand-Fundament
(`docs/projekt/umsetzungsplan-fassung-1.md` Abschnitt 2, Tabellenzeile 1
„Checkpoint Store"). Kein eigenes Deliverable — F1B ist eine Nachtrags-
Erweiterung von Feature #1 (Checkpoint Store): `docs/projekt/
zielfassung.md` §16.2 beschreibt den Checkpoint Store bereits mit zwei
Artefakttypen („Checkpoint je Execution-Übergang und Wirkungsmarke
vor/nach jedem Lauf"), F1s eigener plan-v1 (`state/plan-v1-feature1-
checkpoint-store.md` Abschnitt 0/3) hat die Wirkungsmarke bewusst
ausgeklammert, aber festgehalten, dass Hülle und Kettenmechanik ihre
spätere Ergänzung nicht strukturell ausschließen dürfen. F1B löst diese
Lücke ein, bevor der Execution Controller (Deliverable 3, #8) darauf
aufbauen kann.

## Dependencies

- Hard, erfüllt: F1 (Checkpoint Store) — gemergt, `main` Commit
  `0f303e8`. F1B erweitert `src/checkpoint-store/` um den Wirkungsmarke-
  Pfad; nutzt/erweitert `schreibeCheckpoint`-Infrastruktur,
  `validiereCheckpointEintrag`-Muster und `ladeGueltigeCheckpoints`.
- Soft: `docs/projekt/zielfassung.md` §16.4 (Startbedingungen des
  schreibenden Pfades, `RUN_PREPARED`), §16.6 (Wiederaufnahme), F2s
  Präzedenz (`state/plan-v2-feature2-artifact-registry-lineage.md`) für
  das Prinzip „keine eigene Ablageform, bestehende Hash-Kette
  wiederverwenden".
- Keine Rückabhängigkeit: Execution Controller (Deliverable 3, #8) und
  Invocation Policy / Protection Validator (Deliverable 2, #4) folgen
  danach und nutzen F1B — nicht umgekehrt.

## Workstream-Liste

- WS1 — Wirkungsmarke/Terminalartefakt umsetzen (Payload-Schema,
  F1-Erweiterung für `typ: "wirkungsmarke"`, Klärzustands-Funktion, Gate,
  Doku-Einträge). Einziger Workstream — reine Erweiterung der
  Checkpoint-Store-Hash-Kette ohne eigene Ablageform, analog zur
  Zuschnitt-Bewertung von F2 (`state/plan-v2-feature2-artifact-registry-
  lineage.md` Delta 3): eine Aufteilung wäre unbegründete
  Vorab-Abstraktion (YAGNI).

## Entscheidungs-Referenzen

- `docs/projekt/zielfassung.md` §16.2 (Modulschnitt Checkpoint Store —
  zwei Artefakttypen in einer gemeinsamen Hash-Kette).
- `docs/projekt/zielfassung.md` §16.4 (Startbedingungen des schreibenden
  Pfades — `RUN_PREPARED`-Wirkungsmarke vor Werkzeugstart).
- `docs/projekt/zielfassung.md` §16.6 (Wiederaufnahme — `RUN_PREPARED`
  ohne validiertes terminales Laufartefakt → blockierter Klärzustand,
  neuer Lauf nur mit eigener Identität).
- `ARCHITECTURE.md:58` — drei terminale Ausgänge, Klassifikationsreihenfolge
  (ungültige Beobachtungsbasis → `FEHLGESCHLAGEN`; gültige Verweigerung →
  `VERWEIGERT`; sonst → `ERFOLGREICH`).
- `schemas/kontrollzustand.schema.json` — F0-Hülle, `payload` bewusst
  offen für spätere Unterarten wie `wirkungsmarke`.
- `state/plan-v1-feature1-checkpoint-store.md` Abschnitt 0/3 — hält
  fest, dass F1 die Wirkungsmarke bewusst nicht baut, aber Hülle/Kette
  ihre spätere Ergänzung nicht ausschließen dürfen.
- `state/plan-v2-feature2-artifact-registry-lineage.md` — Präzedenzfall
  „Option A" (bestehende Hash-Kette wiederverwenden statt eigenem
  Dateibaum) und die Lektion aus Delta 3 (F1-Touch zuerst, dann das
  darauf aufbauende Verhalten).
- `state/plan-v1-f1b-wirkungsmarke.md` — technischer Plan zu dieser
  Akte.

## Spec-Referenz

Noch keine — `spec.md` entsteht über den bestehenden Skill
`spec-schreiben`, falls die Ausführungsrolle das für den Umfang dieses
Features für nötig hält.
