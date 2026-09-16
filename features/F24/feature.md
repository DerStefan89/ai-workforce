# F24 — Capabilities v1

## ID
F24

## Titel
Capabilities v1 (Library, Coverage, Rollen-View — read-only)

## Status
Status: READY_FOR_TECH

Gültige Status-Werte (geprüft vom Gate): ENTWURF, READY_FOR_TECH,
WORKSTREAM_SCHNITT_GENEHMIGT, IN_ARBEIT, FEATURE_GATE, ABGESCHLOSSEN,
BLOCKIERT, ABGEBROCHEN.

## Ziel
F19 (Capability Foundation) verständlich sichtbar machen: Library, Detail,
Coverage je Rolle, Gaps, Rollen/Worker/Modell-Übersicht — als reine
Projektion über bereits bestehende Quellen (ressourcen.json,
ROLLENVERTRAEGE, Laufakten). Keine zweite Registry. Beantwortet "Was kann
meine Workforce?", ohne ressourcen.json von Hand zu öffnen. Grundlage für
den späteren Scout (F27).

## Nicht-Ziele
- Schreiben (Freigabe, Hinzufügen von Ressourcen). "Hinzufügen" ist F27
  vorbehalten ("Kandidat vormerken").
- Rollen-Overrides (C6).
- Separate Taxonomie-Datei.
- Befüllung der ASSESSED-Phase — sie bleibt in v1 strukturell leer (kein
  Scout-Artefakt vorhanden, siehe AK5), wird mit F27 nachgezogen.
- Parsen von docs/harness/werkzeug-katalog.md oder anderen Kandidaten-
  Markdown-Dateien in die View.

## Vorbedingung
F-391 ist vor Beginn dieses Schritts behoben (Schritt 0 dieses Auftrags).

## Akzeptanzkriterien
- AK1: GET /api/ressourcen liefert alle 22 Einträge mit korrekter
  Verfügbarkeit gegen die real geladene Startvorlage (loeseRessourcenAuf).
  Deckt zusätzlich den Fall "installiert, aber OFFEN" ab: für Einträge mit
  typ: extern und freigabe: OFFEN (z. B. claude-in-chrome, playwright-mcp)
  zeigt der grund-Text erkennbar "vom Menschen noch nicht freigegeben",
  nicht denselben Text wie ein technisch nicht vorhandenes Werkzeug. Keine
  Schema-Änderung — nur die Projektionslogik unterscheidet freigabe-Status
  von technischer Verfügbarkeit.
- AK2: GET /api/ressourcen/abdeckung pro Rolle; F-346-Ausnahmen klar
  markiert.
- AK3: Gap-Einträge verlinken zum Workboard (F21).
- AK4: Rollen-View (read-only) zeigt für einen realen Workflow alle vier
  Ebenen: Rollenvertrag, Vorlagen-Besetzung, letzte reale Besetzung aus
  Laufakten (Zielbild §32.4).
- AK5: Library-View zeigt vier Phasen als reine Projektion: DISCOVERED =
  extern+OFFEN, ASSESSED = Scout-Artefakt vorhanden, APPROVED =
  FREIGEGEBEN, AVAILABLE = verfügbar. ASSESSED bleibt in v1 strukturell
  leer und wird als benannte Leerstelle ausgewiesen (Text in der View,
  z. B. "Scout-Artefakt kommt mit F27" statt einer leeren Liste ohne
  Erklärung).
- AK6: Library-View (und Rollen-View) zeigt sichtbar, welche Startvorlage
  aktuell geladen ist (Pfad/Name).
- AK7: Gate scripts/check-f24-capabilities.mjs prüft AK1 (inkl. dem
  "installiert-aber-OFFEN"-Fall als eigener Rot-Fall), AK5 (benannte
  Leerstelle statt stiller leerer Liste), AK6 (Startvorlagen-Anzeige
  vorhanden).

## Dependencies
- F19 — Capability Foundation (`ressourcen.json`, `src/ressourcen/index.ts`,
  `ROLLENVERTRAEGE.benoetigte_capabilities`), auf dessen reiner
  Abfragezeit-Auflösung (`loeseRessourcenAuf`) F24 ausschließlich als
  Projektion aufsetzt — keine zweite Registry.
- F20 — Jarvis Shell v1 (`#/capabilities`-Route, `view-capabilities`-
  Container), den F24 mit echter Datenanbindung befüllt (siehe
  `public/leitstand/views/capabilities.js`, bisher bewusster Platzhalter).

## Realer Test
Stefan startet den Leitstand mit Default-Vorlage → Warnung beim Start
(Schritt 0) plus Library-View zeigt Codex "nicht verfügbar" mit Grund und
die aktiv geladene Startvorlage (AK6); Neustart mit
LEITSTAND_STARTVORLAGE_PFAD=startvorlagen/ai-workforce.json → Codex
verfügbar, Anzeige wechselt. Separat: claude-in-chrome erscheint in der
Library mit erkennbar anderem Status/Grund als ein technisch nicht
vorhandenes Werkzeug (AK1).
