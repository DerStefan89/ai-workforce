# Journal — F0

Anhängeprotokoll. Neue Einträge unten anfügen, bestehende nicht ändern.

## 2026-08-29 — Akte angelegt (Nachtrag, retroaktiv)

Coach-Feature-Akte v0 (Ziel/Scope/Nicht-Ziele/Akzeptanzkriterien) von
Stefan erstellt und als `features/F0/feature.md` übernommen,
`Status: READY_FOR_TECH`.

## 2026-08-29 — Challenge (Nachtrag, retroaktiv)

Technical-Challenger-Prüfung der Feature-Akte v0: Urteil
`GO_FAST_PROTOTYPE`, kein Widerspruch zu bereits Entschiedenem, vier
Empfehlungen zur Konkretisierung (Version ≠ Hash, Scope-Grenze
Kontrollzustand-Hülle, Ablageort `schemas/`, Gate-Muster). Schließt
`F-010`. Findet `F-017` (GitKraken-Plugin im Projektchat nicht
authentifiziert, P3, kein Blocker).

## 2026-08-29 — plan-v1 (Nachtrag, retroaktiv)

`state/plan-v1-feature0-datenformate.md`: technischer Plan, reale
Repo-Verifikation (F-013-Muster: nicht angenommen, geprüft), SCOPE 1-9,
NICHT, Design-Entscheidungen D1-D5 (u. a. kein `ajv`), Akzeptanzkriterien
A1-A13, drei Offene Punkte (Feature-ID, Feature-Akte-Volltext,
F-010-Abschlusskonvention).

## 2026-08-29 — Advisor-Pass (Nachtrag, retroaktiv)

`architecture-advisor`, frischer Kontext, gegen `ARCHITECTURE.md`,
ADR-0002, ADR-0004, `docs/projekt/umsetzungsplan-fassung-1.md`,
`state/findings.md`, `state/gates.md`, `state/memory-map.md`,
`features/F0/feature.md` geprüft. Urteil: **FREIGEGEBEN MIT HINWEISEN**.
Findings F-A bis F-D vor dem Handoff-Vertrag zu klären (`journal.md`-Lücke,
`check`/`check:template`-Formulierung, `additionalProperties`-Grenze,
Testabdeckung der drei `profilReferenz`-Pflichtfelder), F-E/F-F/F-G
nicht blockierend. Ergebnis: `state/advisor-findings-feature0-datenformate.md`.

## 2026-08-29 — plan-v2 (Nachtrag, retroaktiv)

`state/plan-v2-feature0-datenformate.md`: Delta zu plan-v1, löst F-A bis
F-D. Delta 1 (`journal.md`/`spec.md` als SCOPE-Punkte), Delta 2
(`check`/`check:template` als zwei unabhängige Skript-Strings), Delta 3
(Kontrollzustand-Hülle mit `additionalProperties: false`, snake_case
Feldnamen `schema_version`/`profil_referenz`, `erzeugtAm` entfällt), Delta
4 (drei getrennte Invalid-Fixtures für `profil_referenz`).

## 2026-08-29 — Handoff-Vertrag und Ausführung

Handoff-Vertrag `state/tasks/f0-datenformate.md` ausgeführt. Artefakte:
`schemas/profile.schema.json`, `schemas/kontrollzustand.schema.json`,
`schemas/examples/*` (6 Dateien), `profiles/.gitkeep`,
`kontrollzustand/.gitkeep`, `scripts/check-datenformate.mjs` (eingehängt
in `npm run check` und `npm run check:template`), `specs/F0/spec.md`,
`features/F0/journal.md` (diese Datei). `F-010` auf `gelöst` gesetzt.
Vier Rot-Fälle (je ein Invalid-Beispiel) und der Grün-Zustand real
kalibriert, Beleg in `state/gates.md`.

## 2026-09-04 — Statuskorrektur (F-088-Nachtrag)

`feature.md`-Status stand seit dem Bau fälschlich auf `READY_FOR_TECH`,
obwohl WS1 gemäß diesem Journal, `state/plan-v2-feature0-datenformate.md`
und `state/advisor-findings-feature0-datenformate.md` real abgeschlossen
ist. Beleg: Commit `8559400` (`feature: F0 datenformate - schemas, gate,
feature-akte`) auf `main`, `schemas/profile.schema.json` und
`schemas/kontrollzustand.schema.json` real vorhanden, `npm run check`
Exit 0. Status auf `ABGESCHLOSSEN` korrigiert (Nachtrag zu F-088, siehe
`state/findings.md`).
