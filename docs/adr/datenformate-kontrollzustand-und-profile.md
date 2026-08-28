# ADR-0002 — Datenformate: Kontrollzustand und Profile

**Datum:** 2026-08-22
**Status:** Entschieden

## Kontext

Der Kontrollzustand der Workforce (Checkpoints, Wirkungsmarken, Artefakt- und Lineage-Einträge, Transportpakete) und die Profilkonfiguration brauchten ein Ablageformat und eine Zugriffsregel zwischen beiden. Entschieden in der Architekturphase A2/A3, Fundstelle: `docs/projekt/zielfassung.md` Abschnitt 16.3, „Zustandsablage".

## Optionen

Keine Alternativoptionen in der Sollquelle dokumentiert; die Entscheidung liegt als bereits getroffen vor.

## Entscheidung

`kontrollzustand/` als JSON/JSONL; hält vom verwendeten Profil nur eine gepinnte Referenz (Pfad, Hash, Version), nie eine Kopie. `profiles/` als JSON, alleinige editierbare Quelle für Profilinhalte.

## Begründung

Dateien und Git sind der führende Zustand (D1); eine Kopie des Profils im Kontrollzustand würde zwei Wahrheiten über denselben Inhalt erzeugen. Die gepinnte Referenz macht die Bindung an eine konkrete Profilversion nachvollziehbar, ohne die alleinige editierbare Quelle zu duplizieren.
