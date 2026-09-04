# F4 — Invocation Policy / Protection Validator (minimal)

## ID

F4

## Titel

Invocation Policy / Protection Validator (minimal)

## Status

Status: ABGESCHLOSSEN

Gültige Status-Werte (geprüft vom Gate, siehe A3a–e in
`features/AF-F001/feature.md`): `ENTWURF, READY_FOR_TECH,
WORKSTREAM_SCHNITT_GENEHMIGT, IN_ARBEIT, FEATURE_GATE, ABGESCHLOSSEN,
BLOCKIERT, ABGEBROCHEN`. Ein fehlendes `Status:`-Feld oder ein Wert
außerhalb dieser Menge gilt als Fehler.

## Ziel

Für einen geplanten schreibenden Lauf stellt eine lokale, werkzeuglose
Prüfung fest, ob beide Startbedingungen aus `docs/projekt/
zielfassung.md` §16.4 erfüllt sind — gültige Werkzeugkonfiguration samt
unversehrten Schutzskripten (E-183) und ein gültiger Wirksamkeitsnachweis
für den aktuellen Gültigkeitsschlüssel (E-188) — und liefert daraus ein
Datenobjekt mit Starturteil `FREIGEGEBEN` oder `ABGELEHNT` samt Grund.
Kein Prozessstart, keine eigene Autorisierungsquelle.

## Scope

- Baseline-Format: JSON-Schema für die Hash-Baseline der Schutzskripte
  (Werkzeugkonfiguration + referenzierte Schutzskripte je mit erwartetem
  Hash), gelesen ausschließlich über F3s `leseAusCommit` aus dem externen
  Autorisierungs-Repo, nie aus dem Arbeitsbaum dieses Produkt-Repos.
- Prüffunktion für Startbedingung 1 (E-183): Werkzeugkonfiguration
  gültig **und** jedes referenzierte Schutzskript existiert mit dem in
  der Baseline erwarteten Hash.
- Format und Prüffunktion für den Wirksamkeitsnachweis (E-188): Vergleich
  eines im Kontrollzustand oder als Eingabe mitgeführten
  Gültigkeitsschlüssels (Hash der Werkzeugkonfiguration, Hashes der
  referenzierten Schutzskripte, deklarierte Werkzeugversion,
  Berechtigungskontext des Aufrufs, Pfad des Arbeitsverzeichnisses)
  gegen den Ist-Stand. F4 prüft den Nachweis, erzeugt ihn nicht.
- Verbotsliste aus E-182 (keine Schutzschicht-Abwahl:
  `--bare`, `--safe-mode`, `--dangerously-skip-permissions`,
  `--allow-dangerously-skip-permissions`, `--permission-mode
  bypassPermissions`, `--fallback-model`) samt Prüffunktion, die eine
  geplante Aufrufkonfiguration dagegen prüft. F4 liefert die Funktion,
  F6 (Claude-Code-Gateway) ruft sie vor dem tatsächlichen Aufruf auf.
- Rückgabe eines Datenobjekts (validierter Berechtigungskontext +
  Starturteil `FREIGEGEBEN`/`ABGELEHNT` mit Grund) — nie eine
  Kommandozeile, nie ein Prozessstart.
- Bei `ABGELEHNT`: Terminalartefakt `VERWEIGERT` nach F3-/F1B-Muster
  (`schreibeWirkungsmarke` aus `src/checkpoint-store/`, `art:
  "terminal"`) — kein neuer, paralleler Terminalzustand.

## Nicht-Ziele

- Jeder tatsächliche Prozessstart eines Werkzeuglaufs (Claude-Code-
  Gateway, Deliverable 3, Feature #6). F4 entscheidet, F6 startet.
- Erzeugung des Wirksamkeitsnachweises (Messfall/Kalibrierung, an
  Verträge außerhalb dieser Akte gebunden — `docs/projekt/
  zielfassung.md` §16.8 Punkt 3/8, weiterhin offen).
- Schreiben oder Verändern der Hash-Baseline. Die Baseline-**Instanz**
  wird ausschließlich vom Menschen geschrieben; F4 liefert Schema und
  Prüflogik, nie Inhalt.
- Auflösung der dokumentierten Werkzeugversions-Diskrepanz
  (`state/tp-nachtrag.md`, CLI `2.1.241` vs. Extension-Session-Metadatum
  `2.1.250`). Die Werkzeugversion geht als deklarierter, gepinnter Wert
  in den Gültigkeitsschlüssel ein, nicht als zur Laufzeit gemessener.
- Erzwingung des Werkzeugsatzes über `--tools`/`--disallowedTools`
  (E-187). Bleibt laut `docs/projekt/zielfassung.md` §16.8 Punkt 4
  offen (Messfall 3 nicht messbar, kein MCP-Server auf der Zielmaschine,
  `state/tp-nachtrag.md`). F4 weist diese Begrenzung ausschließlich als
  `DEKLARIERT` aus, nie als `ERZWUNGEN`.
- Änderung an `src/authorization-boundary/` (F3). F4 ruft dessen
  Lesepfad (`leseAusCommit`-Muster) von außen auf, ohne zweiten
  Regelsatz (D5-Muster der bestehenden Gates).
- UI (Leitstand-Anzeige eines Starturteils).

## Akzeptanzkriterien

1. Ein JSON-Schema beschreibt die Hash-Baseline (Werkzeugkonfiguration +
   referenzierte Schutzskripte samt erwartetem Hash je Skript) und ist
   gültiges JSON Schema (Draft 2020-12).
2. Die Baseline wird ausschließlich über den externen, commit-gepinnten
   Lesepfad (F3s `leseAusCommit`-Muster) gelesen, nie aus dem Arbeitsbaum
   dieses Produkt-Repos.
3. Startbedingung 1 (E-183): Stimmt der reale Hash jedes referenzierten
   Schutzskripts nicht mit der Baseline überein, oder ist die
   Werkzeugkonfiguration ungültig, liefert die Prüfung `ABGELEHNT` mit
   benanntem Grund — nie ein stillschweigend akzeptiertes `FREIGEGEBEN`.
4. Startbedingung 2 (E-188): Weicht der aktuelle Gültigkeitsschlüssel
   (mindestens Hash der Werkzeugkonfiguration, Hashes der referenzierten
   Schutzskripte, deklarierte Werkzeugversion, Berechtigungskontext,
   Pfad des Arbeitsverzeichnisses) vom im Wirksamkeitsnachweis
   hinterlegten Schlüssel ab, liefert die Prüfung `ABGELEHNT` — auch bei
   sonst gültiger Baseline (Drift-Fall).
5. Erst wenn beide Startbedingungen erfüllt sind, liefert die Prüfung
   `{ starturteil: "FREIGEGEBEN", berechtigungskontext, ... }`.
6. Die E-182-Verbotsliste liegt als eigenständige, von F6 aufrufbare
   Prüffunktion vor; ein Aufrufparameter aus der Liste führt zu
   `ABGELEHNT`.
7. `ABGELEHNT` erzeugt das bestehende Terminalartefakt `VERWEIGERT`
   (`schreibeWirkungsmarke`, `art: "terminal"`) — kein neuer, paralleler
   Terminalzustand.
8. Kein Codepfad in `src/invocation-policy/` startet einen Kindprozess
   des zu prüfenden Werkzeugs (Gate-Grep gegen `child_process`, `spawn`,
   `exec`, `execSync` — Präzedenz F9s AC10-Grep).
9. E-187 (`--tools`/`--disallowedTools`) wird in Dokumentation und
   Rückgabeobjekt ausschließlich als `DEKLARIERT` ausgewiesen, nie als
   `ERZWUNGEN` — unbelegt laut `state/tp-nachtrag.md`, Messfall 3.
10. Tests: gültige Baseline + gültiger Nachweis (`FREIGEGEBEN`),
    manipuliertes/fehlendes Schutzskript (`ABGELEHNT`, E-183), Drift im
    Gültigkeitsschlüssel bei sonst gültiger Baseline (`ABGELEHNT`,
    E-188), verbotener Aufrufparameter (`ABGELEHNT`, E-182).
11. `npm run check` → Exit 0.

## Zuordnung

Deliverable 2, Feature #4 (`docs/projekt/umsetzungsplan-fassung-1.md`
Abschnitt 2, Tabellenzeile 4 „Invocation Policy / Protection Validator —
Braucht Authorization Boundary + Hash-Baseline der Schutzskripte
(E-183/E-188)"). Folgt auf F3, weil `docs/projekt/zielfassung.md` §16.2
„Invocation Policy / Protection Validator" als eigene Modul-Tabellenzeile
neben „Authorization Boundary" führt (nicht als deren Erweiterung), und
weil der Umsetzungsplan die Baseline-Lesegrundlage von F3 als
Voraussetzung nennt.

## Dependencies

- Hard, erfüllt: F3 (`src/authorization-boundary/`) — `leseAusCommit`
  (commit-gepinntes Lesen aus dem externen Repo),
  `gitattributesPinntZeilenenden` (Zeilenenden-Startbedingung),
  `pruefeAutorisierung`/`validiereAutorisierungEintrag` als
  Referenzmuster für Rückgabeform (`{ ok, ... }` bzw. hier
  `{ starturteil, ... }`, nie ein Wurf bei einem erwarteten Rot-Fall).
  F4 ruft diese Funktionen von außen auf, ändert `src/
  authorization-boundary/` nicht.
- Hard, erfüllt: F1B (`schreibeWirkungsmarke`, `src/checkpoint-store/`)
  — F4 ruft sie bei `ABGELEHNT` mit `art: "terminal"`, `ergebnis:
  "VERWEIGERT"` auf, ohne die Signatur zu ändern.
- Soft: `docs/projekt/zielfassung.md` §16.2 (Modulschnitt — „Startfreigabe:
  Berechtigungskontext materialisieren, beide Startbedingungen
  erzwingen"; „Tut nicht: keine Schutzschicht abschalten, kein
  Modellwechsel"), §16.4 (beide Startbedingungen, lokal und ohne
  Werkzeugaufruf), §9.4 E-182 bis E-188, `ARCHITECTURE.md` §3 Punkt 2.
- Keine Rückabhängigkeit: Claude-Code-Gateway (Deliverable 3, #6) und
  der Execution Controller (Deliverable 3, #8) folgen danach und nutzen
  F4 — nicht umgekehrt.
- Ungeklärt, außerhalb dieser Akte: der konkrete bekannte Rot-Fall der
  Wirksamkeitsprüfung (`docs/projekt/zielfassung.md` §16.8 Punkt 3) und
  die Repräsentation des Gültigkeitsschlüssels/Normalisierung des
  Arbeitsverzeichnispfads (§16.8 Punkt 8) — beide „an noch nicht
  ausgeführte Verträge gebunden". F4 baut Schema und Prüflogik so, dass
  sie unabhängig von der endgültigen Klärung dieser zwei Punkte
  funktionieren (siehe plan-v1 [offene Unsicherheit]-Markierungen).

## Workstream-Liste

- WS1 — Invocation Policy umsetzen (Baseline-Schema, E-183-Prüfung,
  E-188-Gültigkeitsschlüssel-Vergleich, E-182-Verbotsliste,
  Wiederverwendung des F1B-Terminalartefakts bei `ABGELEHNT`, Gate,
  Tests). Einziger Workstream — der Scope ist bewusst eng geschnitten
  (siehe Nicht-Ziele); eine weitere Aufteilung wäre unbegründete
  Vorab-Abstraktion.

## Entscheidungs-Referenzen

- `docs/projekt/zielfassung.md` §16.2 (Modulschnitt — „Invocation Policy
  / Protection Validator: Startfreigabe: Berechtigungskontext
  materialisieren, beide Startbedingungen erzwingen. Tut nicht: keine
  Schutzschicht abschalten, kein Modellwechsel").
- `docs/projekt/zielfassung.md` §16.4 (Startbedingungen des schreibenden
  Pfades — zwei getrennte Bedingungen, beide lokal, beide ohne
  Werkzeugaufruf; scheitert eine, startet kein Lauf; erst danach
  `RUN_PREPARED`-Wirkungsmarke, dann Werkzeugstart).
- `docs/projekt/zielfassung.md` §9.4 E-182 bis E-188 (Ausführungsvertrag
  mit Claude Code — Verbotsliste, lokale Prüfung, Erfolgsdefinition,
  Modell-Pinning, Umgehungs-Eskalation, Werkzeugsatz-Begrenzung,
  Wirksamkeitsnachweis-Definition).
- `docs/projekt/zielfassung.md` §16.8 Punkte 3, 4, 8 (offene Punkte der
  Baseline — konkreter Rot-Fall der Wirksamkeitsprüfung, zwei
  unabhängige Werkzeugsatz-Mechanismen, Repräsentation des
  Gültigkeitsschlüssels — alle an noch nicht ausgeführte Verträge
  gebunden, nicht Gegenstand dieser Akte).
- `ARCHITECTURE.md` §3 „Auth" Punkt 2 (verbindliche Code-Konvention,
  identischer Wortlaut wie §16.2/§16.4).
- `docs/projekt/umsetzungsplan-fassung-1.md` Abschnitt 2, Deliverable 2,
  Zeile 4 (Reihenfolge-Begründung „Braucht Authorization Boundary +
  Hash-Baseline der Schutzskripte").
- `state/tp-nachtrag.md` „Schritt 1, Werkzeugversionen" (dokumentierte
  Diskrepanz `2.1.241`/`2.1.250` — Grundlage für die Nicht-Ziel-Regel
  „Werkzeugversion deklariert, nicht gemessen") und „Gültigkeitsschlüssel,
  Ausgangsstand" (bisherige Messhistorie der Schutzskript-Hashes — bleibt
  Messhistorie, ist nicht Referenzstand für F4, siehe Auftrag dieser
  Sitzung).
- `state/findings.md` F-006 (offen, `HARNESS_IMPROVEMENT`) — benennt
  „Gültigkeitsschlüssel"/„Wirksamkeitsnachweis" als in `ARCHITECTURE.md`
  unerklärte Kernbegriffe. F4 löst dieses Finding nicht auf (außerhalb
  des Scopes dieser Akte), verwendet die Begriffe aber im selben
  Wortlaut wie `zielfassung.md`.
- `features/F3/feature.md` und `src/authorization-boundary/index.ts` —
  wiederverwendetes Lesepfad-Muster (`leseAusCommit`,
  `gitattributesPinntZeilenenden`) und Rückgabeform-Präzedenz.
- `features/F9/feature.md` bzw. `scripts/check-f9-human-transport.mjs`
  — Grep-Nachweis-Präzedenz (AC10) für den `child_process`/`spawn`/
  `exec`/`execSync`-Ausschluss dieser Akte (AC8).
- `state/plan-v1-f4-invocation-policy.md` — technischer Plan zu dieser
  Akte.

## Spec-Referenz

Noch keine — `spec.md` entsteht über den bestehenden Skill
`spec-schreiben`, falls die Ausführungsrolle das für den Umfang dieses
Features für nötig hält.
