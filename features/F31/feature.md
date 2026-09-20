# F31 — Jarvis-Chat-Erfahrung

## ID
F31

## Titel
Jarvis-Chat-Erfahrung

## Status
Status: IN_ARBEIT

Gültige Status-Werte (geprüft vom Gate): ENTWURF, READY_FOR_TECH, WORKSTREAM_SCHNITT_GENEHMIGT, IN_ARBEIT, FEATURE_GATE, ABGESCHLOSSEN, BLOCKIERT, ABGEBROCHEN.

## Ziel
Den Chat im Leitstand praxistauglich machen: ein laufender Lauf lässt sich
abbrechen, der Chat hat eine große Ansicht, ein Gesprächsgedächtnis mit
Zusammenfassung und gefühlt flüssigere Antworten — ohne den Rahmen von
E-M4-3 (kein echtes Token-Streaming) zu verlassen.

## Nicht-Ziele
- Echtes Token-Streaming (E-M4-3 bleibt in Kraft).
- Bild-/Screenshot-Upload im Chat — von Stefan descoped.
- Automatische Kontext-voll-Erkennung.
- Änderung an `schemas/ergebnis-jarvis.schema.json` oder an bestehenden
  Rollenverträgen.

## Workstreams
- **WS-1 — Abbruch-Button + große Chat-Ansicht.** Abbruch-Button im
  Jarvis-Chat (nutzt den F14-Abbruch-Endpunkt), erreichbar große
  Chat-Ansicht auf `#/chat`. **Gemergt (#192).**
- **WS-2 — Gesprächsgedächtnis + „Zusammenfassen & neu starten".** Jarvis
  bekommt ein begrenztes Verlaufsfenster aus `lineage chat-<projektId>` (ab
  der letzten Zusammenfassung, max. 8 Turns / 12000 Zeichen). Ein
  Zusammenfassungs-Turn trägt `istZusammenfassung: true` und wird neuer
  Startpunkt für Prompt und Standardansicht. Löst [[F-488]] (Jarvis ist
  bislang gedächtnislos). **Offen.**
- **WS-3 — Typewriter-Darstellung.** Rein clientseitige
  Typewriter-Darstellung der fertigen Antwort (kein echtes Streaming).
  **Offen, nach WS-2.**

## Akzeptanzkriterien
- AK1 (WS-1, erfüllt): Ein laufender Jarvis-Lauf lässt sich im Chat über
  einen Abbruch-Button abbrechen; `#/chat` zeigt eine große Chat-Ansicht.
- AK2 (WS-2, offen): `baueJarvisAuftragstext` (bzw. der Aufrufpfad in
  `POST /api/chat`) erhält ein Verlaufsfenster aus `lineage
  chat-<projektId>` (ab letzter Zusammenfassung, max. 8 Turns / 12000
  Zeichen) statt nur der aktuellen Nachricht. „Zusammenfassen & neu
  starten" erzeugt einen Turn mit `istZusammenfassung: true`, der Prompt
  und Standardansicht auf sich zurücksetzt.
- AK3 (WS-3, offen): Eine fertige Jarvis-Antwort wird im Chat clientseitig
  per Typewriter-Effekt dargestellt; kein neuer Server-Endpunkt, kein
  echtes Streaming.

## Dependencies
- F26 — Jarvis Chat v1, dessen Rolle `jarvis` und Chat-Mechanik F31
  erweitert.
- F14 — liefert den Abbruch-Endpunkt, den WS-1 nutzt.
- F29 — Komponentenvokabular, auf das die große Chat-Ansicht (WS-1) und
  künftige Chat-UI-Arbeit aufsetzen.
- E-M4-3 — Entscheidungsrahmen „kein echtes Token-Streaming in Fassung 1",
  den F31 nicht verlässt.

## Bekannte Grenzen
- **Akte nachgezogen (dieser PR, 20.09.2026):** WS-1 wurde bereits als
  #192 gemergt, bevor diese Akte existierte ([[F-489]]). Diese Datei
  dokumentiert WS-1 nachträglich; kein Code aus WS-1 wurde für diesen
  Nachzug verändert.
- **Arbeitsname F30 (dieser PR, 20.09.2026):** WS-1 wurde unter dem
  Arbeitsnamen F30 gemergt (PR #192, Commit 'feat(f30-ws1)', Branches
  feat/f30-*). Die Nummer F30 ist laut zielfassung.md für Dogfooding +
  Team reserviert; f30-Branch-/Commitnamen dieses Features sind Alias für
  F31.

## Feature Review
WS-1 real gebaut und gemergt (#192): Abbruch-Button im Jarvis-Chat, große
Chat-Ansicht auf `#/chat`. WS-2 und WS-3 sind offen, kein Feature-Gate
fällig.
