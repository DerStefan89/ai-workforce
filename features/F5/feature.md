# F5 — Context Builder

## ID

F5

## Titel

Context Builder

## Status

Status: ABGESCHLOSSEN

Gültige Status-Werte (geprüft vom Gate, siehe A3a–e in
`features/AF-F001/feature.md`): `ENTWURF, READY_FOR_TECH,
WORKSTREAM_SCHNITT_GENEHMIGT, IN_ARBEIT, FEATURE_GATE, ABGESCHLOSSEN,
BLOCKIERT, ABGEBROCHEN`. Ein fehlendes `Status:`-Feld oder ein Wert
außerhalb dieser Menge gilt als Fehler.

## Ziel

Für einen Auftrag und eine Rolle lässt sich ein begrenztes Kontextpaket
zusammenstellen — gezielt aus konkreten, begründeten Anfragen statt aus
einer pauschalen Vollkopie —, das ausschließlich Elemente mit
Herkunftsreferenz (Pfad, zitierter Bereich, Inhalts-Hash) trägt, ein
Budget durchsetzt, notwendige Evidenz nie stillschweigend dem Budget
opfert, und dessen Eingaben mechanisch auf STALE prüfbar bleiben. Der
Context Builder trifft dabei selbst keine Zustandsentscheidung und ändert
keine Produktdateien (§16.2 Modultabelle).

## Scope

- Neues, eigenständiges Modul `src/context-builder/`, das F2
  (`registriereKernArtefakt`, `pruefeStale`) ausschließlich von außen
  aufruft — kein F1/F1B/F2-Touch.
- Funktion, die aus einer Liste konkreter Anfragen (Pfad/Muster, Frage,
  Begründung, vom Aufrufer bereits gelesener Inhalt) ein Kontextpaket für
  eine `lauf_id` und eine `rolle` zusammenstellt.
- Rollenbezogene Ausschlussprüfung, Duplikat-Filterung, Budget-
  Durchsetzung (max. Elemente/Bytes) mit sichtbarer, nie stillschweigender
  Ablehnung.
- Vorrang der notwendigen Evidenz vor dem Budget: eine als notwendig
  markierte Anfrage, die nicht ins Budget passt, stoppt den Bau mit einem
  benannten Blockergrund statt eines unvollständigen Pakets.
- Registrierung des gebauten Kontextpakets als kern-erzeugtes Artefakt
  über F2s `registriereKernArtefakt`, mit den aufgenommenen Elementen als
  `eingaben` (gleiche `EingabeReferenz`-Form wie F2).
- STALE-Prüfung eines bereits gebauten Pakets über F2s `pruefeStale`, vor
  jeder erneuten Auslieferung.
- Neues Payload-Schema `schemas/kontrollzustand-kontextpaket-payload.
  schema.json` für die innere `daten.daten`-Form (`KONTEXTPAKET_V0`,
  Muster F9s `BEDARF_V0`).

Technische Konkretisierung (Modul-API, Rollenregeln, Budget-Mechanik,
Schema): `state/plan-v1-f5-context-builder.md`.

## Nicht-Ziele

- Zustandsentscheidung jeder Art — der Context Builder liefert ein
  Paket, er entscheidet nichts über Lifecycle/Freigabe (§16.2, wörtlich
  „Tut nicht: keine Zustandsentscheidung").
- Produktänderung — der Context Builder schreibt keine Produktdateien
  (§16.2, „keine Produktänderung").
- Dateien oder Bereiche selbst lesen — jeder aufzunehmende Inhalt wird
  vom Aufrufer als String übergeben (gleiche Grenze wie F2s `pruefeStale`,
  Nicht-Ziel „Lesen von Dateien oder Bereichen durch die Registry
  selbst").
- Claude-Code-Gateway, jeder Prozessstart (Deliverable 3, Feature #6) —
  eigenes, späteres Feature.
- Invocation Policy / Protection Validator (Deliverable 2, Feature #4)
  und Finding F-030 (Bash-Kanal für Executor-Start) — beide ausdrücklich
  keine Voraussetzung dieser Akte.
- Ein lebender Aufrufer. Wie F1/F2: Bibliothek mit direktem Testaufruf
  reicht; das Claude-Code-Gateway (F6) ist der spätere, hier noch nicht
  existierende reale Aufrufer.
- Ein Runtime-/Modell-Feld im Kontextpaket-Schema. `KONTEXTPAKET_V0`
  trägt in dieser Akte keinen Anbieter-/Modellbezug. Falls eine spätere
  Fassung einen solchen Bezug braucht, gilt E-191 N1/N2
  (`state/nachtrag-e191-vorschlag.md`): eigenes, dediziertes
  Runtime-Feld, nie mit `rolle` kombiniert.
- Caching oder automatische Wiederverwendung eines Pakets über Läufe
  hinweg — Historie ist auditierbar, aber standardmäßig kein aktiver
  Modellkontext (Entscheidung 107); jeder Aufruf baut explizit neu.
- Autorisierungsprüfung (F3) — der Context Builder prüft keine Freigabe,
  er liefert nur Kontext.

## Akzeptanzkriterien

1. Ein Kontextpaket kann für eine `lauf_id` und `rolle` aus einer Liste
   von Anfragen (Pfad/Muster, konkrete Frage, Begründung, Inhalt) gebaut
   werden.
2. Eine Anfrage außerhalb der für die Rolle zulässigen Pfade wird
   ausgeschlossen und im Paket mit Grund vermerkt, nie stillschweigend
   aufgenommen.
3. Zwei Anfragen mit identischem Pfad und identischem zitiertem Bereich
   werden nur einmal aufgenommen.
4. Ein Budget (max. Elemente und/oder Bytes) wird durchgesetzt; eine
   Anfrage, die das Budget überschreitet, wird nicht aufgenommen und im
   Paket als ausgeschlossen vermerkt.
5. Eine als notwendig markierte Anfrage, die nicht mehr ins Budget passt,
   führt zu einem Stopp mit benanntem Blockergrund — nie zu einem
   ausgelieferten, unvollständigen Paket ohne diese Evidenz (Entscheidung
   115, Evidenz vor Budget).
6. Ein gebautes Kontextpaket wird über F2s `registriereKernArtefakt` als
   kern-erzeugtes Artefakt registriert, mit den aufgenommenen Elementen
   als `eingaben` (Pfad, zitierter Bereich, Inhalts-Hash je Element).
7. Vor jeder erneuten Auslieferung eines bereits gebauten Pakets wird F2s
   `pruefeStale` gegen seine Eingaben aufgerufen; `stale: true` blockiert
   die Auslieferung.
8. Das Modul liest keine Dateien selbst — jeder Inhalt kommt vom
   Aufrufer.
9. Kein Feld des Kontextpaket-Schemas kombiniert `rolle` mit einem
   Anbieter-/Modellbezug (E-191 N1/N2, vorsorglich auch ohne aktuelles
   Runtime-Feld).
10. Tests: Grünfall (Budget reicht, alle Anfragen aufgenommen),
    Rollen-Ausschluss, Duplikat-Filterung, Budget-Überlauf ohne notwendige
    Evidenz (nur die überzähligen Anfragen ausgeschlossen), Budget-
    Überlauf mit notwendiger Evidenz (Stopp statt Teilpaket),
    STALE-Blockade einer erneuten Auslieferung.
11. `npm run check` → Exit 0.

## Zuordnung

Deliverable 3, Feature #5 — Ausführungspfad
(`docs/projekt/umsetzungsplan-fassung-1.md` Abschnitt 2, Tabellenzeile 5
„Muss vor dem Gateway stehen — liefert das Kontextpaket"). Nächstes
Feature nach F9 (Deliverable 4, Feature #9, ABGESCHLOSSEN) laut
Umsetzungsplan-Reihenfolge; unabhängig von Deliverable 2 (Authorization
Boundary/Invocation Policy) baubar, da F5 keine Startfreigabe prüft,
sondern nur Kontext liefert.

## Dependencies

- Hard, erfüllt: F2 (Artifact Registry/Lineage) — gemergt. Nutzt
  `registriereKernArtefakt` (`src/lineage-registry/index.ts:85`) und
  `pruefeStale` (`src/lineage-registry/index.ts:209`) unverändert von
  außen, exakt das Muster, das F2 selbst gegenüber F1 und F9 gegenüber F2
  etabliert haben.
- Explizit keine Voraussetzung: F4 (Invocation Policy / Protection
  Validator) und Finding F-030 (Bash-Kanal für einen künftigen
  Executor-Start) — F5 startet keinen Prozess und braucht keine
  Startfreigabe.
- Explizit keine Voraussetzung: F1B (Wirkungsmarke/Terminalartefakt) —
  das Bauen eines Kontextpakets ist selbst kein Lauf mit Außenwirkung im
  Sinne von D2/A5; ein Aufrufer, der den Paketbau als Teil eines
  protokollierten Laufs führt, setzt `RUN_PREPARED` selbst, außerhalb
  dieses Scopes.
- Keine Rückabhängigkeit: Claude-Code-Gateway (Deliverable 3, #6) folgt
  danach und ist der erste vorgesehene reale Aufrufer — nicht umgekehrt.

## Workstream-Liste

- WS1 — Context Builder umsetzen (`KONTEXTPAKET_V0`-Payload-Schema,
  eigenständiges Modul `src/context-builder/`, Rollenregeln,
  Budget-/Evidenz-Mechanik, F2-Aufrufe, Gate, Tests, Doku-Einträge).
  Einziger Workstream — Anfrage-Filterung, Budget-Durchsetzung und
  Registrierung sind eine zusammenhängende Kette ohne unabhängig
  prüfbaren Zwischenschnitt; eine Aufteilung wäre unbegründete
  Vorab-Abstraktion (YAGNI, analog F1B/F2/F3/F9-Präzedenz).

## Entscheidungs-Referenzen

- `docs/projekt/zielfassung.md` §16.2 (Modul-Tabelle) — „**Context
  Builder** | begrenztes Kontextpaket je Auftrag, mit
  Herkunftsreferenzen | keine Zustandsentscheidung".
- `docs/projekt/zielfassung.md` Zeile 145 — „Context-Manifest statt
  Vollkopie (59) · Historie auditierbar, kein aktiver Kontext (107)".
- `docs/projekt/zielfassung.md` Zeile 251 — „rollenbezogene Context Views
  (113) · deterministischer Mindestkontext (26, 34) · Nachforderungen
  begründet und begrenzt (114) · Evidenz vor Budget (115)".
- `docs/projekt/zielfassung.md` §16.3 — Kontrollzustand-Struktur, kein
  neuer Dateibaum, bestehende Hash-Kette wiederverwenden (A2/A7-Muster,
  wie F1B/F2/F9).
- `state/nachtrag-e191-vorschlag.md` — N1/N2 (Anbietername nur in
  dediziertem Runtime-Feld, nie mit Rolle kombiniert), sofern das
  Kontextpaket-Schema künftig einen Runtime-/Modellbezug trägt.
- `features/F2/feature.md` und `src/lineage-registry/index.ts` — die
  wiederzuverwendenden Funktionen `registriereKernArtefakt`,
  `pruefeStale`.
- `state/plan-v1-f5-context-builder.md` — technischer Plan zu dieser
  Akte.

## Spec-Referenz

Noch keine — `spec.md` entsteht über den bestehenden Skill
`spec-schreiben`, falls die Ausführungsrolle das für den Umfang dieses
Features für nötig hält.
