# F9 — Human Transport

## ID

F9

## Titel

Human Transport

## Status

Status: ABGESCHLOSSEN

Gültige Status-Werte (geprüft vom Gate, siehe A3a–e in
`features/AF-F001/feature.md`): `ENTWURF, READY_FOR_TECH,
WORKSTREAM_SCHNITT_GENEHMIGT, IN_ARBEIT, FEATURE_GATE, ABGESCHLOSSEN,
BLOCKIERT, ABGEBROCHEN`. Ein fehlendes `Status:`-Feld oder ein Wert
außerhalb dieser Menge gilt als Fehler.

## Ziel

Ein minimaler Bedarf lässt sich erfassen, zu einem Handoff-Paket für eine
menschliche Brücke bündeln, und die danach von außen zurückkommende
Antwort lässt sich als nicht vertrauenswürdige Eingabe schemaprüfen,
über die bestehende Artifact Registry (F2) mit Herkunft und Eingaben
registrieren, und gegen veraltete Eingaben absichern (F2 `pruefeStale`) —
ohne Browserautomatisierung, ohne automatischen Versand oder Abruf, und
ohne dass Stufe 1 (manuelle Auslösung durch den Menschen,
`docs/projekt/umsetzungsplan-fassung-1.md` Abschnitt 1) verlassen wird.

## Scope

- `BEDARF_V0` — minimales, neu definiertes Datenformat für einen
  erfassten Bedarf (kein Vorgängerformat im Repo vorhanden, siehe
  Verifikation in `state/plan-v1-f9-human-transport.md` Abschnitt 0),
  inklusive eines Platzhalterfelds für spätere Werkzeug-/Bedarfsauswahl
  (Verweis auf `docs/harness/werkzeug-katalog.md`/`state/tooling.md`),
  vorerst ausschließlich manuell befüllt.
- Handoff-Paket (Transportpaket) aus einem registrierten `BEDARF_V0`
  erzeugen, referenziert dessen Version als Eingabe.
- Wirkungsmarke `RUN_PREPARED` (F1B) vor der Aushändigung des Pakets an
  die menschliche Brücke — die Außenwirkung beginnt mit dem manuellen
  Verlassen des Systems, nicht erst mit der Rückkehr der Antwort.
- Import einer zurückkommenden Antwort als nicht vertrauenswürdige
  Eingabe, Schemaprüfung vor jeder Registrierung.
- Registrierung der geprüften Antwort als neue Version desselben
  Transportpaket-Artefakts über F2s `registriereKernArtefakt`, mit
  Herkunft und Eingaben.
- Terminalartefakt (F1B `schreibeWirkungsmarke`, `art: "terminal"`) nach
  Import — `ERFOLGREICH`/`VERWEIGERT` bei gültiger Antwort je nach
  menschlicher Einstufung, `FEHLGESCHLAGEN` bei Schemaverstoß
  (`ARCHITECTURE.md:58`, ungültige Beobachtungsbasis).
- Vor jeder Freigabe/Weiterverwendung der importierten Antwort: Aufruf
  von F2s `pruefeStale` gegen ihre Eingaben — `stale: true` blockiert.
- Minimale Erweiterung der bestehenden, rein lesenden Leitstand-Ansicht
  (`public/leitstand/`, `scripts/leitstand-server.mjs`) um Aufgabe,
  Status, Freigabestatus (falls vorhanden), Executor, Ergebnis.

## Nicht-Ziele

- Execution Controller (Deliverable 3, Feature #8), Claude-Code-Gateway
  (#6), Context Builder (#5), Invocation Policy (#4) — keiner dieser
  Bausteine ist Teil dieser Akte.
- Automatische Bedarfsanalyse oder Werkzeugempfehlung — das
  Platzhalterfeld für Werkzeug-/Bedarfsauswahl bleibt bewusst manuell
  befüllt (bewusst zurückgestellt, real belegt durch **F-031** in
  `state/findings.md`, `PROCESS_IMPROVEMENT`, P1, offen — Feature direkt
  nach S3 einplanen; siehe `state/plan-v1-f9-human-transport.md`
  Abschnitt 0 für die Prüfspur).
- Jede Stufe-2-Orchestrierung (System empfiehlt/startet automatisch) —
  Stufe 1 bleibt für ganz Fassung 1 verbindlich
  (`docs/projekt/umsetzungsplan-fassung-1.md` Abschnitt 1).
- Browserautomatisierung — wörtliches Nicht-Ziel des Human-Transport-
  Moduls (`docs/projekt/zielfassung.md` Zeile 336).
- Ein neuer Autorisierungsmechanismus oder eine OS-seitige Absicherung
  des externen Austauschwegs — Freigaben bleiben F3s Zuständigkeit; F9
  zeigt einen vorhandenen Freigabestatus im Leitstand nur an, erzeugt und
  prüft ihn nicht.
- Zusammenführung mehrerer `kontrollzustand`-Ketten zu einer einzigen
  Leitstand-Aufgabenzeile — jede Kette (Bedarf, Transportpaket, F1B-
  Wirkungsmarken) bleibt ein eigener Abschnitt, wie in der bestehenden
  Leitstand-Ansicht heute.

## Akzeptanzkriterien

1. Ein `BEDARF_V0` kann für eine `lauf_id` erfasst und über F2s
   `registriereKernArtefakt` als kern-erzeugtes Artefakt registriert
   werden, inklusive eines zunächst unbefüllten
   Werkzeug-/Bedarfsauswahl-Platzhalterfelds.
2. Ein Handoff-Paket wird aus einem registrierten `BEDARF_V0` erzeugt und
   ebenfalls über F2 registriert, mit einer Eingaben-Referenz auf die
   `BEDARF_V0`-Version, aus der es entstand.
3. Vor der Aushändigung des Handoff-Pakets wird eine `RUN_PREPARED`-
   Wirkungsmarke (F1B `schreibeWirkungsmarke`) für dieselbe `lauf_id`
   geschrieben.
4. Eine importierte Antwort wird gegen ein eigenes Schema geprüft, bevor
   sie registriert wird — nie ungeprüft übernommen.
5. Eine schemawidrige Antwort führt nie zu einer stillschweigend
   akzeptierten Registrierung, sondern zu einem Terminalartefakt
   `FEHLGESCHLAGEN`.
6. Eine gültige Antwort wird als neue Version des Transportpaket-
   Artefakts registriert und schließt den Lauf über ein F1B-
   Terminalartefakt (`ERFOLGREICH` oder `VERWEIGERT`, je nach
   menschlicher Einstufung der Antwort) ab.
7. Vor jeder Freigabe/Weiterverwendung der importierten Antwort wird F2s
   `pruefeStale` gegen ihre Eingaben aufgerufen; `stale: true` blockiert
   die Weiterverwendung und verlangt eine explizite, über F2s
   `haltFestStaleEntscheidung` festgehaltene menschliche Entscheidung
   (`neu_erzeugen`/`nachtrag`/`unveraendert_gueltig`), bevor die Antwort
   als gültig gilt (D6, `state/plan-v1-f9-human-transport.md` Abschnitt 4).
8. Eine `RUN_PREPARED`-Marke ohne zugeordnetes Terminalartefakt führt
   über F1Bs `stelleLaufstatusFest` zu `KLAERUNG_ERFORDERLICH`, nie zu
   automatischem Neustart.
9. Der Leitstand zeigt für einen Human-Transport-Lauf Aufgabe
   (Bedarf-Beschreibung), Status, Freigabestatus (falls vorhanden),
   Executor und Ergebnis — als Erweiterung der bestehenden Ansicht, ohne
   neue Schreibpfade nach `kontrollzustand/`.
10. Kein Codepfad dieser Akte löst einen Versand, Abruf oder eine
    Browserinteraktion selbst aus — jeder Übergang der Außenwirkung ist
    eine manuelle menschliche Handlung.
11. `npm run check` → Exit 0 (nach Umsetzung).

## Zuordnung

Meilenstein 1, Deliverable 4 — Mensch-Schnittstelle, Feature #9 „Human
Transport" (`docs/projekt/umsetzungsplan-fassung-1.md` Abschnitt 2,
Tabellenzeile 9: „Für die minimale Freigabedatei-Autorisierung (Vertrag
5) nicht zwingend vorausgesetzt [Annahme] — für strukturierte
Entscheidungs-/Findings-Übergaben gebraucht. Parallel zu Deliverable 3
möglich"). Im Auftrag dieser Sitzung zusätzlich als dritte Scheibe (S3)
des ersten Ende-zu-Ende-Nachweises nach F1B (S1) und F3 (S2, PR #26
gemerged) eingeordnet — diese Einordnung steht nur im Auftragstext
dieser Sitzung, nicht im Umsetzungsplan selbst.

## Dependencies

- Hard, erfüllt: F1B (Wirkungsmarke/RUN_PREPARED/Terminalartefakt) —
  gemergt (PR #25). Nutzt `schreibeWirkungsmarke`
  (`src/checkpoint-store/index.ts:530`) und `stelleLaufstatusFest`
  (`src/checkpoint-store/index.ts:697`) unverändert von außen — kein
  F1/F1B-Touch (Muster wie F3 gegenüber F1B, nicht wie F1B gegenüber F1).
- Hard, erfüllt: F2 (Artifact Registry/Lineage) — gemergt. Nutzt
  `registriereKernArtefakt` (`src/lineage-registry/index.ts:85`) und
  `pruefeStale` (`src/lineage-registry/index.ts:209`) unverändert von
  außen, exakt das Muster, das F2 selbst gegenüber F1 etabliert hat.
- Soft: F3 (Authorization Boundary) — F9 erzeugt und prüft keine
  Autorisierung selbst; ein vorhandener F3-Freigabestatus wird im
  Leitstand nur angezeigt (AC9), F9 führt dafür keinen eigenen
  Prüfpfad ein.
- Soft: F10-Leitstand-Prototyp (`scripts/leitstand-server.mjs`,
  `public/leitstand/`) — real vorhanden, aber bewusst wegwerfbar
  markiert (kein Vertrag, kein Advisor-Pass, siehe Kopfkommentar
  `scripts/leitstand-server.mjs:1-19`), keine formal abgeschlossene
  Feature-Akte. F9 erweitert diesen Stand minimal, ohne ihn zu einer
  vollständigen F10-Akte auszubauen.
- Keine Rückabhängigkeit: Execution Controller (Deliverable 3, #8) folgt
  danach, falls überhaupt in Fassung 1 — nicht umgekehrt.

## Workstream-Liste

- WS1 — Human Transport umsetzen (`BEDARF_V0`- und Transportpaket-
  Payload-Schemas, eigenständiges Modul `src/human-transport/`, das F1B
  und F2 ausschließlich von außen aufruft, Schemaprüfung der
  importierten Antwort, Gate, Leitstand-Erweiterung, Doku-Einträge).
  Einziger Workstream — der fachliche Ablauf (Bedarf → Paket → Import →
  Registrierung → Anzeige) ist eine zusammenhängende Kette ohne
  unabhängig prüfbaren Zwischenschnitt; eine Aufteilung wäre unbegründete
  Vorab-Abstraktion (YAGNI, analog F1B/F2/F3-Präzedenz).

## Entscheidungs-Referenzen

- `docs/projekt/zielfassung.md` Zeile 336 (Modul-Tabelle) — „**Human
  Transport** | Transportpakete erzeugen, Antworten als untrusted Input
  übernehmen und schemaprüfen | keine Browserautomatisierung".
- `docs/projekt/zielfassung.md` Zeile 341 (Kontrollzustand-Struktur) —
  `kontrollzustand/` trägt bereits „Transportpakete" als vorgesehenen
  Artefakttyp, neben Checkpoints/Artefakten/Lineage/Profilkonfiguration.
- `ARCHITECTURE.md:27` — identische Aufzählung als verbindliche
  Ordnerstruktur-Konvention.
- `ARCHITECTURE.md:41` — „Artefakte werden versioniert, nicht
  überschrieben" — trägt die Antwort-Import-Versionierung (AC6).
- `ARCHITECTURE.md:58` — Klassifikationsreihenfolge der drei
  Terminalzustände, trägt AC5 (`FEHLGESCHLAGEN` bei ungültiger
  Beobachtungsbasis).
- `docs/projekt/umsetzungsplan-fassung-1.md` Abschnitt 1
  (Orchestrierungs-Grundsatz Stufe 1) und Abschnitt 2, Deliverable 4,
  Tabellenzeile 9.
- `features/F1B/feature.md` und `src/checkpoint-store/index.ts` — die
  wiederzuverwendenden Funktionen `schreibeWirkungsmarke`,
  `stelleLaufstatusFest`.
- `features/F2/feature.md` und `src/lineage-registry/index.ts` — die
  wiederzuverwendenden Funktionen `registriereKernArtefakt`,
  `pruefeStale`.
- `state/plan-v1-f9-human-transport.md` — technischer Plan zu dieser Akte.

## Spec-Referenz

Noch keine — `spec.md` entsteht über den bestehenden Skill
`spec-schreiben`, falls die Ausführungsrolle das für den Umfang dieses
Features für nötig hält.
