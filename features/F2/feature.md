# F2 — Artifact Registry / Lineage

## ID

F2

## Titel

Artifact Registry / Lineage

## Status

Status: ABGESCHLOSSEN

Gültige Status-Werte (geprüft vom Gate, siehe A3a–e in
`features/AF-F001/feature.md`): `ENTWURF, READY_FOR_TECH,
WORKSTREAM_SCHNITT_GENEHMIGT, IN_ARBEIT, FEATURE_GATE, ABGESCHLOSSEN,
BLOCKIERT, ABGEBROCHEN`. Ein fehlendes `Status:`-Feld oder ein Wert
außerhalb dieser Menge gilt als Fehler.

## Ziel

Die Artifact Registry hält für jedes von der AI Workforce erzeugte oder
referenzierte Artefakt Identität, Version und Herkunft so fest, dass sich
später mechanisch prüfen lässt, ob eine zitierte Eingabe seit der
Registrierung geändert wurde, und eine daraufhin getroffene menschliche
STALE-Entscheidung unveränderlich nachvollziehbar bleibt. Die
Identitätsregel folgt der Eigentümerschaft (`docs/projekt/
zielfassung.md` Abschnitt 16.2, A7): ein kern-erzeugtes Artefakt trägt
eine eigene, inhaltsadressierte Identität; ein werkzeug-erzeugtes
Artefakt wird nur als Referenz (Pfad, Inhalts-Hash, zitierter Bereich)
gehalten.

## Scope

- Registrierung eines kern-erzeugten Kontrollartefakts mit eigener,
  inhaltsadressierter Identität.
- Registrierung eines werkzeug-erzeugten Artefakts als reine Referenz
  (Pfad, zitierter Bereich, Inhalts-Hash), ohne eigenen Inhalt zu tragen.
- Festhalten der Eingaben (Pfad, zitierter Bereich, Inhalts-Hash), aus
  denen ein abgeleitetes Artefakt entstanden ist.
- Mechanische Prüfung, ob eine referenzierte Eingabe seit der
  Registrierung geändert wurde (STALE-Erkennung über Hash-Vergleich).
- Unveränderliches Festhalten einer menschlichen STALE-Entscheidung
  (neu erzeugen, Nachtrag, unverändert gültig) für ein betroffenes
  Artefakt.
- Auflisten und Laden vorhandener Artefakt-Versionen einer Kette.

Technische Konkretisierung (Ablageform, Modul-API, Schema, Gate-Muster):
`state/plan-v1-feature2-artifact-registry-lineage.md` und
`state/plan-v2-feature2-artifact-registry-lineage.md` (Delta, löst
Advisor-Befund B1/B4 aus `state/advisor-findings-feature2-artifact-
registry-lineage.md`; plan-v2 gilt bei Widerspruch, bei dessen Schweigen
plan-v1).

## Nicht-Ziele

- Ein eigener Dateibaum unter `kontrollzustand/<artefakt_id>/` — jede
  Schreiboperation läuft über die echte, unveränderte
  `schreibeCheckpoint`-Funktion aus `src/checkpoint-store/index.ts` (F1);
  Lineage-Einträge sind Checkpoints, keine eigene Ablageform.
- Eine eigene `version_sequenz`-Zählung — Version eines Artefakt-Eintrags
  ist die Checkpoint-`sequenz`, die F1 bereits vergibt.
- Abhängigkeitsgraph über mehrere Artefakte, Impact-Klassifikation,
  Invalidierungspropagation oder Visualisierung.
- Automatische Neuerzeugung, Nachtrag oder Freigabe eines
  STALE-Artefakts — die Entscheidung liegt beim Menschen,
  `haltFestStaleEntscheidung` verlangt immer eine vom Aufrufer gelieferte
  Entscheidung.
- Lesen von Dateien oder Bereichen durch die Registry selbst — jeder zu
  prüfende Inhalt wird als String vom Aufrufer übergeben.
- Execution Controller, Workstream-/Execution-Automat oder jede
  Orchestrierungslogik.
- Eine eigene Struktur/ein eigenes Format für `herkunft` oder
  `eingaben[].pfad` erfinden — bleiben unstrukturiert.

## Akzeptanzkriterien

1. Ein kern-erzeugtes Artefakt kann mit eigener, inhaltsadressierter
   Identität registriert und anschließend inhaltlich identisch wieder
   geladen werden.
2. Ein werkzeug-erzeugtes Artefakt kann als reine Referenz (Pfad,
   zitierter Bereich, Inhalts-Hash) registriert werden, ohne eigenen
   Inhalt zu tragen.
3. Werden für dasselbe Artefakt mehrere Versionen registriert, bleibt
   jede ältere Version unverändert erhalten und über ihre Version
   referenzierbar.
4. Das Schreiben einer neuen Artefakt-Version verändert keine bereits
   bestehende Checkpoint-Datei einer älteren Version.
5. Für ein abgeleitetes Artefakt können die Eingaben festgehalten werden,
   aus denen es entstanden ist (Pfad, zitierter Bereich, Inhalts-Hash).
6. Eine mechanische Prüfung stellt fest, ob eine referenzierte Eingabe
   seit der Registrierung inhaltlich verändert wurde.
7. Eine STALE-Entscheidung (neu erzeugen, Nachtrag, unverändert gültig)
   wird ausschließlich durch eine explizite menschliche Angabe getroffen,
   nie automatisch.
8. Eine getroffene STALE-Entscheidung wird unveränderlich festgehalten
   und bleibt der Version zugeordnet, auf die sie sich bezieht.
9. Eine STALE-Entscheidung `unverändert gültig` verlangt zwingend eine
   Begründung — ohne Begründung wird sie zurückgewiesen, bevor etwas
   geschrieben wird.
10. Alle Versionen eines Artefakts können aufgelistet werden, ohne dass
    STALE-Entscheidungen fälschlich als eigene Version gezählt werden.
11. Jede Schreiboperation der Registry läuft ausschließlich über die
    bestehende, unveränderte Checkpoint-Store-Hash-Kette (F1) — kein
    eigener, paralleler Dateibaum.
12. Registrieren, Laden, STALE-Prüfung und STALE-Entscheidung erzeugen
    strukturierte Laufausgaben, die maschinell ausgewertet werden können.

Technische Ausprägung dieser Kriterien als A1–A20 (Dateien, Modul,
Gate-Skript, Doku-Einträge): `state/plan-v2-feature2-artifact-registry-
lineage.md` Abschnitt „Akzeptanzkriterien — Delta-Tabelle".

## Zuordnung

Meilenstein 1 (einziger in Fassung 1), Deliverable 1 —
Kontrollzustand-Fundament, Feature #2 — Artifact Registry / Lineage:
„Baut auf der Checkpoint-Store-Hash-Kette auf (A7)"
(`docs/projekt/umsetzungsplan-fassung-1.md` Abschnitt 2, Tabellenzeile 2).

## Dependencies

- Hard, erfüllt: F1 (Checkpoint Store) — gemergt, `main` Commit
  `0f303e8`. Liefert `schreibeCheckpoint`, `ladeGueltigeCheckpoints`,
  `validiereCheckpointEintrag`, `kanonischesJson`, `sha256Hex` aus
  `src/checkpoint-store/index.ts`.
- Keine Rückabhängigkeit: Execution Controller (Deliverable 1, #8) folgt
  danach und orchestriert u. a. die Artifact Registry — nicht umgekehrt.

## Workstream-Liste

- WS1 — Artifact Registry / Lineage umsetzen (Payload-Schema, Modul,
  Gate, Doku-Einträge). Einziger Workstream — reine Erweiterung der
  Checkpoint-Store-Hash-Kette ohne eigene Ablageform, eine Aufteilung
  wäre unbegründete Vorab-Abstraktion (YAGNI); siehe Zuschnitt-Bewertung
  in `state/plan-v2-feature2-artifact-registry-lineage.md` Delta 3.

## Entscheidungs-Referenzen

- `docs/projekt/zielfassung.md` Abschnitt 16.2 (Modulschnitt) — Artifact
  Registry / Lineage: Identität, Version, Herkunft, Input-Beziehungen,
  Veraltungsprüfung; Identitätsregel nach Eigentümerschaft (A7).
- `docs/projekt/zielfassung.md` Abschnitt „Staleness" (103 neu) —
  geänderter zitierter Bereich → `STALE`, konservativ; am STALE-Artefakt
  entscheidet der Mensch (neu erzeugen · Nachtrag · unverändert gültig).
- `ARCHITECTURE.md` Abschnitt 2, Zeile 39–41 — bindend: Schreibzugriff
  auf `kontrollzustand/` ausschließlich über die append-only Hash-Kette
  des Checkpoint Store; Grundlage für Stefans Architekturentscheidung
  Option A (plan-v2), die Advisor-Befund B1 auflöst.
- `state/advisor-findings-feature2-artifact-registry-lineage.md` —
  Advisor-Urteil zu plan-v1: NICHT FREIGEGEBEN (B1 Architekturkonflikt,
  B4 fehlende Testdatei), beide durch plan-v2 aufgelöst.
- `state/plan-v1-feature2-artifact-registry-lineage.md` — ursprünglicher
  technischer Plan, Grundlage für plan-v2.
- `state/plan-v2-feature2-artifact-registry-lineage.md` — Delta zu
  plan-v1, löst B1 (Lineage-Einträge sind Checkpoints) und B4
  (Testdatei), Ergebnis dieser Feature-Akte.
- `state/tasks/f2-artifact-registry-lineage.md` — Handoff-Vertrag,
  Grundlage der Umsetzung.

## Spec-Referenz

Noch keine — `spec.md` entsteht über den bestehenden Skill
`spec-schreiben`, falls die Ausführungsrolle das für den Umfang dieses
Features für nötig hält (Vorbild: `specs/F0/spec.md`).
