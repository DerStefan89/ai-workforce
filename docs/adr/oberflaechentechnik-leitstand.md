# ADR-0003 — Oberflächentechnik Leitstand

**Datum:** 2026-08-28
**Status:** Entschieden

## Kontext

Der Leitstand — die Projektion des persistierten Zustands für den Menschen — brauchte eine Entscheidung zwischen CLI und einer grafischen Oberfläche. Fundstelle: `docs/projekt/zielfassung.md` §15 (Nachtrag 28.08.2026) und `docs/projekt/umsetzungsplan-fassung-1.md` Abschnitt 0.

## Optionen

Bei dieser bereits getroffenen Entscheidung wurden folgende Alternativen erwogen:

1. **CLI** — keine zusätzliche Laufzeitkomponente, aber schlechtere Projektion des Zustands für den Menschen.
2. **Lokale Web-Oberfläche** — bessere Projektion, aber eine zusätzliche Laufzeitkomponente.

## Entscheidung

Lokale Web-Oberfläche statt CLI.

## Begründung

Der Leitstand hält keine eigene Wahrheit und löst nur Aufrufe an den Execution Controller aus — die zusätzliche Laufzeitkomponente bleibt damit auf reine Projektion beschränkt und führt keinen zweiten Zustand ein.
