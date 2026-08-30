# F3 — Authorization Boundary (minimal)

## ID

F3

## Titel

Authorization Boundary (minimal)

## Status

Status: READY_FOR_TECH

Gültige Status-Werte (geprüft vom Gate, siehe A3a–e in
`features/AF-F001/feature.md`): `ENTWURF, READY_FOR_TECH,
WORKSTREAM_SCHNITT_GENEHMIGT, IN_ARBEIT, FEATURE_GATE, ABGESCHLOSSEN,
BLOCKIERT, ABGEBROCHEN`. Ein fehlendes `Status:`-Feld oder ein Wert
außerhalb dieser Menge gilt als Fehler.

## Ziel

Ein freigegebener oder verweigerter Auftrag ist an einem vom Executor
nicht beschreibbaren Ort bezeugt; der Kern prüft gegen diesen Ort, nie
gegen eine bloße Referenz.

## Scope

- Freigabe-/Verweigerungsartefakt in einem eigenen lokalen Git-Ordner
  außerhalb dieses Produkt-Repos.
- Checkpoint/Kontrollzustand referenziert es nur über Pfad + Hash, nie
  über den Inhalt selbst.
- Prüfung liest den geschützten Ort direkt, validiert Referenz gegen
  echten Inhalt.
- Verweigerung führt zu Terminalartefakt VERWEIGERT (F1Bs Typ
  wiederverwenden, kein neuer Zustand).

## Nicht-Ziele

- Invocation Policy (Deliverable 2, Feature #4 — Hash-Baseline der
  Schutzskripte, E-183/E-188).
- Jeder Prozessstart (Claude-Code-Gateway, Deliverable 3).
- UI (Leitstand-Anzeige einer Autorisierungsentscheidung).
- OS-seitige Durchsetzung der Schreibsperre (Dateisystem-ACLs, eigener
  Betriebssystem-Benutzer für den geschützten Ort). Diese Akte liefert
  eine Pfad-/Prozessgrenze plus Manipulationserkennung (Hash-Vergleich
  gegen den echten Ort), keine technisch unüberwindbare
  Schreibverhinderung — siehe plan-v1 Abschnitt 0/4 für die Begründung
  dieser Grenze.

## Akzeptanzkriterien

1. Das Freigabe-/Verweigerungsartefakt liegt nachweislich außerhalb des
   Produkt-Repos, in einem eigenen lokalen Git-Repository.
2. Der Kontrollzustand (Checkpoint/Wirkungsmarke) trägt zu diesem
   Artefakt ausschließlich Pfad + Hash — nie den Entscheidungsinhalt
   selbst als Kopie.
3. Die Prüffunktion liest den Inhalt am referenzierten Ort real (nicht
   die im Kontrollzustand mitgeführte Referenz allein) und vergleicht
   dessen Hash gegen die Referenz, bevor sie eine Entscheidung
   akzeptiert.
4. Eine Abweichung zwischen echtem Inhalt und Referenz (manipulierte
   oder veraltete Referenz) führt zu einer Ablehnung, nie zu einer
   stillschweigend akzeptierten Freigabe.
5. Ein fehlender oder unlesbarer geschützter Ort führt zu einer
   Ablehnung, nie zu einer angenommenen Freigabe (kein impliziter
   Erfolg bei fehlender Evidenz).
6. Eine Verweigerung erzeugt das bestehende Terminalartefakt
   `VERWEIGERT` aus F1B (`schreibeWirkungsmarke`, `art: "terminal"`) —
   kein neuer, paralleler Terminalzustand.
7. Tests: echte Freigabe (Inhalt stimmt mit Referenz überein), echte
   Verweigerung, manipulierte Referenz (Hash-Mismatch), fehlender
   geschützter Ort.
8. `npm run check` → Exit 0.

## Zuordnung

Deliverable 2, Feature #3 — Autorisierung & Startvalidierung
(`docs/projekt/umsetzungsplan-fassung-1.md` Abschnitt 2, Tabellenzeile 3
„Authorization Boundary — Eigenes Repo außerhalb der Schreibreichweite
(D16) — kann parallel zu Deliverable 1 entstehen"). Laut Tabelle
unabhängig von Deliverable 1 (Checkpoint Store/Lineage) baubar; diese
Akte entsteht dennoch nach F1B, weil AC6 F1Bs Terminalartefakt-Typ
`VERWEIGERT` direkt wiederverwendet (kein neuer Terminalzustand,
Auftrag dieser Sitzung) und `docs/projekt/zielfassung.md` §16.2 die
Authorization Boundary ausdrücklich als eigenständiges Modul neben dem
Checkpoint Store führt, nicht als dessen Erweiterung.

## Dependencies

- Hard, erfüllt: F1B (Wirkungsmarke/Terminalartefakt) — gemergt, `main`
  Commit `8520714`. F3 ruft `schreibeWirkungsmarke(..., "terminal", {
  ergebnis: "VERWEIGERT" })` aus `src/checkpoint-store/` bei einer
  Verweigerung auf, ohne diese Signatur zu ändern.
- Soft: `docs/projekt/zielfassung.md` §16.2 (Modulschnitt — Authorization
  Boundary als eigener Modul-Eintrag, „keine Deutung von Modelltext als
  Freigabe; erzeugt nie die Git-Freigabe-Datei"), §16.3 (Zustandsablage
  — Bezeugungen menschlicher Freigaben außerhalb des Produkt-Repos, in
  einem eigenen Git-Repository des Kerns; Checkpoint trägt Referenz und
  Hash), `ARCHITECTURE.md` §3 „Auth" (identischer Text, dort verbindlich
  als Code-Konvention), D16, E-189.
- Keine Rückabhängigkeit: Invocation Policy / Protection Validator
  (Deliverable 2, Feature #4) und der Execution Controller (Deliverable
  3, #8) folgen danach und nutzen F3 — nicht umgekehrt.

## Workstream-Liste

- WS1 — Authorization Boundary umsetzen (externer Git-Ordner-Kontrakt,
  Referenzformat im Kontrollzustand, Prüffunktion gegen den echten Ort,
  Wiederverwendung des F1B-Terminalartefakts bei Verweigerung, Gate,
  Tests). Einziger Workstream — der Scope ist bewusst eng geschnitten
  (siehe Nicht-Ziele); eine weitere Aufteilung wäre unbegründete
  Vorab-Abstraktion.

## Entscheidungs-Referenzen

- `docs/projekt/zielfassung.md` §16.2 (Modulschnitt — Authorization
  Boundary als eigener Eingang für menschliche Entscheidungen, hält
  beide Schlüsselarten auseinander).
- `docs/projekt/zielfassung.md` §16.3 (Zustandsablage — Bezeugungen
  menschlicher Freigaben außerhalb des Produkt-Repositoriums, in einem
  eigenen Git-Repository des Kerns; Checkpoint trägt Referenz und Hash,
  Controller validiert gegen den geschützten Ort, nie gegen die
  Referenz allein).
- `docs/projekt/zielfassung.md` Zeile 50 (P2, E-177/E-189 — Herkunft von
  Autorisierungen ausschließlich aus direkter menschlicher Eingabe).
- `docs/projekt/zielfassung.md` Zeile 215 (E-189 wörtlich — eine im
  Produkt-Repository sichtbare Kopie oder Referenz ist niemals alleinige
  Autoritätsquelle).
- `docs/projekt/zielfassung.md` Zeile 318 (D16 — Autorisierungsartefakte
  liegen außerhalb der Schreibreichweite des Ausführungswerkzeugs).
- `ARCHITECTURE.md` §3 „Auth" (verbindliche Code-Konvention, identischer
  Wortlaut wie §16.3/D16/E-189).
- `docs/projekt/umsetzungsplan-fassung-1.md` Abschnitt 2, Deliverable 2,
  Zeile 3 (Reihenfolge-Begründung „kann parallel zu Deliverable 1
  entstehen").
- `features/F1B/feature.md` und `src/checkpoint-store/types.ts` — der
  wiederzuverwendende Terminaltyp `VERWEIGERT` und
  `schreibeWirkungsmarke`.
- `state/gates.md` / `.claude/hooks/commit-guard.cjs` — verwandtes, aber
  nicht identisches Präzedenzmuster: die Harness-eigene
  `state/freigabe-commit.md` erzwingt „nur vom Menschen im eigenen
  Editor angelegt", bleibt aber innerhalb des Repos und schützt nur den
  Commit-Schritt des Harness, nicht die Produkt-Autorisierung. Das
  Prinzip (menschenauthentifiziertes Artefakt statt Modelltext-Deutung)
  überträgt sich, der Ort (außerhalb des Repos, D16) nicht.
- `state/plan-v1-f3-authorization-boundary.md` — technischer Plan zu
  dieser Akte.

## Spec-Referenz

Noch keine — `spec.md` entsteht über den bestehenden Skill
`spec-schreiben`, falls die Ausführungsrolle das für den Umfang dieses
Features für nötig hält.
