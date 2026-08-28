# ADR-0001 — Technischer Stack

**Datum:** 2026-08-22
**Status:** Entschieden

## Kontext

Der Kern der AI Workforce brauchte eine Sprache, Laufzeit und Test-/Lint-Kette. Entschieden in der Architekturphase A1, gegen den realen Harness `ai-workforce@3179fe0` geprüft, Urteil „Freigegeben mit Hinweisen". Fundstelle: `docs/projekt/zielfassung.md` Abschnitt 16.1, „Technischer Stack".

Randbedingung: Der gepinnte Harness verpflichtet die Zielmaschine ohnehin auf eine Node-Laufzeit für die Hooks (`docs/projekt/zielfassung.md` Abschnitt 14).

## Optionen

Keine Alternativoptionen in der Sollquelle dokumentiert; die Entscheidung liegt als bereits getroffen vor.

## Entscheidung

TypeScript auf Node 24, strip-only (kein Build-Schritt), Biome für Lint, `tsc` für Typprüfung, `node:test` für Tests.

## Begründung

Der Harness verpflichtet die Zielmaschine bereits auf eine Node-Laufzeit; TypeScript strip-only entfällt der Build-Schritt für den Kern. Biome, `tsc` und `node:test` sind die bestehenden Harness-Prüfwerkzeuge, keine zusätzliche Werkzeugwahl nötig.

**Offene Messung:** `mock.module` unter Node 24 ist nicht gemessen; relevant beim Test des Claude-Code-Gateways.
