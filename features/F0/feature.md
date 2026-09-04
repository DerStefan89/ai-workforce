# F0 — Datenformate

## ID

F0

## Titel

Datenformate

## Status

Status: ABGESCHLOSSEN

Gültige Status-Werte (geprüft vom Gate, siehe A3a–e in
`features/AF-F001/feature.md`): `ENTWURF, READY_FOR_TECH,
WORKSTREAM_SCHNITT_GENEHMIGT, IN_ARBEIT, FEATURE_GATE, ABGESCHLOSSEN,
BLOCKIERT, ABGEBROCHEN`. Ein fehlendes `Status:`-Feld oder ein Wert
außerhalb dieser Menge gilt als Fehler.

## Ziel

Feature 0 schafft einen eindeutigen und prüfbaren Datenvertrag für die
beiden grundlegenden Datenarten der AI Workforce: Projektprofile und
Kontrollzustände. Nach Umsetzung muss eindeutig feststehen, welche
Informationen in welcher Datenart gespeichert werden, welche Angaben
verpflichtend sind und wann ein Datensatz als gültig gilt. Damit
entsteht eine stabile Grundlage für die nachfolgenden Features
Checkpoint Store, Autorisierungsgrenze und Ausführungsmechanik.

## Scope

- Definition des Datenformats für ein vollständiges Projektprofil unter
  `profiles/`.
- Definition des Datenformats für Kontrollzustände unter
  `kontrollzustand/`.
- Ein Projektprofil enthält alle für das jeweilige Projekt benötigten
  Profilinformationen vollständig in einer eigenständigen Datei.
- Profilinhalte existieren ausschließlich in `profiles/`; andere
  Datenstrukturen dürfen diese Inhalte nicht duplizieren.
- Ein Kontrollzustand enthält eine eindeutig gepinnte Referenz auf das
  verwendete Profil bestehend aus: Pfad, Hash, Version.
- Definition der Pflichtangaben und Gültigkeitsregeln für beide
  Datenformate.
- Bereitstellung mindestens eines gültigen Beispieldatensatzes pro
  Datenformat.
- Eine automatisiert prüfbare Validierung stellt fest, ob ein Profil
  beziehungsweise Kontrollzustand dem definierten Datenformat entspricht.

Technische Konkretisierung (Ablageort Schemas/Beispiele, Gate-Muster,
Feldsemantik Version≠Hash): `state/plan-v1-feature0-datenformate.md`.

## Nicht-Ziele

- Kein Checkpoint Store und keine Speicherung oder Wiederherstellung von
  Checkpoints.
- Keine Autorisierungs- oder Freigabelogik.
- Keine Ausführung von Befehlen, Agents oder anderen Aktionen.
- Kein Execution Controller.
- Keine Web-UI und kein Leitstand.
- Keine Versionierungslogik für vollständige Projektzustände über die im
  Kontrollzustand benötigte Profilversion hinaus.
- Keine automatische Auswahl, Erzeugung oder Veränderung eines
  Projektprofils.
- Keine Vererbung zwischen Profilen, keine Domänen-Profile und keine
  Projekt-Overlays.
- Keine Kopie oder Einbettung von Profilinhalten in `kontrollzustand/`.
- Keine Festlegung der internen Architektur nachfolgender Features.

## Akzeptanzkriterien

- Für `profiles/` existiert ein eindeutig definiertes JSON-Datenformat
  mit festgelegten Pflichtangaben und Gültigkeitsregeln.
- Für `kontrollzustand/` existiert ein eindeutig definiertes JSON-
  beziehungsweise JSONL-Datenformat mit festgelegten Pflichtangaben und
  Gültigkeitsregeln.
- Ein gültiges Projektprofil kann als vollständige, eigenständige Datei
  gespeichert werden und benötigt weder ein übergeordnetes Domänen-Profil
  noch ein zusätzliches Overlay.
- Ein gültiger Kontrollzustand referenziert das verwendete Projektprofil
  eindeutig über Pfad, Hash und Version.
- Ein Kontrollzustand enthält keine Kopie der Inhalte des referenzierten
  Projektprofils.
- Für beide Datenformate existiert jeweils mindestens ein Beispiel, das
  die definierte Validierung erfolgreich besteht.
- Für beide Datenformate kann mindestens ein ungültiger Datensatz erzeugt
  werden, der von der Validierung zuverlässig abgelehnt wird.
- Fehlt im Kontrollzustand Pfad, Hash oder Version der Profilreferenz,
  wird der Datensatz als ungültig erkannt.
- Änderungen an einem Projektprofil erfolgen an dessen Datei unter
  `profiles/`; es existiert innerhalb dieses Features keine zweite
  editierbare Quelle für denselben Profilinhalt.
- Die Validierung ist automatisiert ausführbar und liefert für gültige
  und ungültige Beispieldaten ein eindeutig prüfbares Ergebnis.

Technische Ausprägung dieser Kriterien als A1–A13 (Dateien, Gate-Skript,
Doku-Einträge): `state/plan-v1-feature0-datenformate.md` Abschnitt 7.

## Zuordnung

Meilenstein 1 (einziger in Fassung 1), Deliverable 1 —
Kontrollzustand-Fundament, Feature #0
(`docs/projekt/umsetzungsplan-fassung-1.md` Abschnitt 2).

## Dependencies

- Hard, erfüllt: AF-F001 (Feature-Akte-Konvention) — gemerged, PR #17.
- Hard, erfüllt: Ebene-2-Architektur in Repo (`ARCHITECTURE.md`,
  `docs/adr/*`) — gebaut und gemergt; schließt sich mit diesem Feature
  endgültig über `F-010` in `state/findings.md`.
- Keine Rückabhängigkeit: Checkpoint Store, Autorisierungsgrenze und
  Ausführungsmechanik (Deliverable 1 #1/#2, Deliverable 2, Deliverable 3)
  folgen laut Umsetzungsplan **nach** Feature 0, nicht umgekehrt.

## Workstream-Liste

- WS1 — Datenformate umsetzen (zwei Schemas, Beispiele, Gate,
  Doku-Einträge). Einziger Workstream — Scope ist klein und reversibel
  genug, eine Aufteilung wäre unbegründete Vorab-Abstraktion (YAGNI).

## Entscheidungs-Referenzen

- `docs/adr/datenformate-kontrollzustand-und-profile.md` (ADR-0002) —
  `kontrollzustand/` als JSON/JSONL mit gepinnter Profil-Referenz;
  `profiles/` als alleinige editierbare Quelle.
- `docs/adr/ein-ebenen-profilmodell.md` (ADR-0004) — Ein-Ebenen-Modell,
  kein Domänen-Profil mit Projekt-Overlay.
- `docs/projekt/umsetzungsplan-fassung-1.md` Abschnitt 0 — vorgeklärte
  Randfrage Datenformate, bereits in Wirkung für diesen Plan.
- `state/findings.md`, `F-010` — schließt sich mit diesem Feature.
- `state/plan-v1-feature0-datenformate.md` — technischer Plan, Ergebnis
  dieser Feature-Akte plus Technical-Challenger-Ergänzung.

## Spec-Referenz

Noch keine — `spec.md` entsteht über den bestehenden Skill
`spec-schreiben`, falls die Ausführungsrolle das für den Umfang dieses
Features für nötig hält (Vorbild: `specs/AF-F001/spec.md`).
