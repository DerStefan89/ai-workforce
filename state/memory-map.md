<!-- Ziel-Pfad im Repo: state/memory-map.md -->
# Memory Map — [PROJEKTNAME]

Wo welche Art von Information zuhause ist — damit nichts doppelt und an
zwei Stellen leicht widersprüchlich gepflegt wird (vgl. G7-Falle:
derselbe Fakt an drei Stellen im Quell-Projekt dieses Templates).

| Info-Typ | Heimat | Nicht hierhin |
|---|---|---|
| Stack, Regeln, Definition of Done | `CLAUDE.md` | |
| Verbindliche Code-Konventionen | `ARCHITECTURE.md` | |
| Aktueller Phasenstand, Scope | `docs/STATUS.md` | nicht in CLAUDE.md duplizieren |
| Architekturentscheidungen mit Alternativen | `docs/adr/*.md` | nicht nur im Chat/PR-Text |
| Objektive Gates + Kalibrierung | `state/gates.md` | |
| Trigger für menschliche/Agent-Handlungen | `state/triggers.md` | |
| Offene Annahmen | `state/assumption-ledger.md` | |
| Werkzeug-Bestand | `state/tooling.md` | |
| Mehrschritt-Aufträge an andere Session/Kontext | `state/tasks/*.md` (Handoff-Vertrag) | nicht nur als Chat-Prompt |
| Zyklus-/Lernstand des Harness selbst | `docs/harness/HARNESS-LEARNING-STATE.md` | |
| Strukturänderungen am Harness | `docs/harness/HARNESS-CHANGELOG.md` | |
| Begriffe mit projektspezifischer Bedeutung | `docs/harness/HARNESS-GLOSSARY.md` | |
| Zwischenstand einer unterbrochenen Aufgabe | `state/zwischenstand/<branch>.md` | nicht committen außer VORLAGE.md |
| Spec: das WAS eines Vorhabens | `specs/` | Pläne und Verträge (das WIE) — die gehören nach `state/tasks/*.md` |
| Was es an Werkzeugen gibt und wann es sich lohnt | `docs/harness/werkzeug-katalog.md` | was in diesem Projekt läuft |
| Was in diesem Projekt läuft oder abgelehnt wurde | `state/tooling.md` | allgemeine Werkzeugkunde |
| Warum diese Stack-Entscheidung fiel | `docs/adr/*.md` | Werkzeug-Katalog — eine Backend- oder Datenbankwahl ist eine Architekturentscheidung, kein Werkzeug |
| Reibungsvorfälle | `state/reibung.md` | nicht in `state/assumption-ledger.md` (dort stehen offene Annahmen, keine Vorfälle) und nicht in ein separates Repo |
| Abgespaltener Architektur-Teilbereich | eigene Datei plus memory-map-Zeile plus Rückverweis aus `ARCHITECTURE.md` | keine Abspaltung ohne die drei Bedingungen aus der Aufteilungsregel (`ARCHITECTURE.md`, Kopfkommentar) |
| Datenbankschema | erzeugt aus den Migrationen | keine von Hand gepflegte Schema-Datei unter `docs/` |
| API-Vertrag | erzeugt aus dem Code | keine von Hand gepflegte API-Datei unter `docs/`. Was an beiden **Regel** ist (Namenskonvention, wer darf schreiben, Versionierung, Fehlerformat), bleibt in `ARCHITECTURE.md` |
| Zielbild, Rollen, Grenzen, Fassung-1-Scope | `docs/projekt/zielfassung.md` | nicht in `ARCHITECTURE.md` (dort stehen ausschließlich Code-Konventionen) und nicht in einen Chat |
| Deliverables, Feature-Reihenfolge, Backlog | `docs/projekt/umsetzungsplan-fassung-1.md` | nicht in `docs/STATUS.md`, dort steht nur der aktuelle Stand |
| Einzelne Architekturentscheidung samt Begründung und verworfener Alternative | `docs/adr/` | nicht in `ARCHITECTURE.md`, dort steht nur die geltende Regel ohne Herleitung |
| Findings (Bugs, Harness-Verbesserungen, technische Schulden, Prozessverbesserungen) | `state/findings.md` | nicht in `state/reibung.md` (dort stehen Reibungsvorfälle) und nicht in `state/assumption-ledger.md` (dort stehen offene Annahmen) |
| Feature-Akte (Status, Ziel, Nicht-Ziele, Akzeptanzkriterien, Dependencies, Workstreams) | `features/<id>/feature.md` | nicht `specs/` (dort steht nur die Spec, das WAS) und nicht `state/tasks/` (dort stehen Handoff-Verträge) |
| Datenformat-Schema (JSON Schema für `profiles/`/`kontrollzustand/`) | `schemas/*.schema.json` + `schemas/examples/` | nicht direkt unter `profiles/`/`kontrollzustand/` — die tragen nur echte Produktivdaten |
| Checkpoint-Payload-Schema (typ: "checkpoint") | `schemas/kontrollzustand-checkpoint-payload.schema.json` + `schemas/examples/kontrollzustand-checkpoint*` | nicht in `schemas/kontrollzustand.schema.json` (F0, gemergter Hülle-Vertrag) |
| Checkpoint-Store-Modul (Schreiben, Laden, Kettenvalidierung, seit F1B auch Wirkungsmarke) | `src/checkpoint-store/` | keine Ausführungslogik — das bleibt Execution Controller |
| Wirkungsmarke-Payload-Schema (typ: "wirkungsmarke") | `schemas/kontrollzustand-wirkungsmarke-payload.schema.json` + `schemas/examples/kontrollzustand-wirkungsmarke*` | nicht in `schemas/kontrollzustand.schema.json` (F0, gemergter Hülle-Vertrag) und nicht in `schemas/kontrollzustand-checkpoint-payload.schema.json` (F1, anderer `typ`-Wert) |
| Lineage-Payload-Schema (`checkpoint.payload.daten` bei `daten.typ === "lineage"`) | `schemas/kontrollzustand-lineage-payload.schema.json` + `schemas/examples/kontrollzustand-lineage*` | nicht in `schemas/kontrollzustand.schema.json` (F0, gemergter Hülle-Vertrag) — beschreibt nur `checkpoint.payload.daten` |
| Lineage-Registry-Modul (Artefakt-Registrierung, STALE-Prüfung/-Entscheidung) | `src/lineage-registry/` | kein Abhängigkeitsgraph, keine Impact-Klassifikation, keine Invalidierungspropagation, keine Ausführungslogik, kein eigener Dateibaum unter `kontrollzustand/` — jede Schreiboperation läuft über F1s `schreibeCheckpoint` |
| Authorization-Boundary-Modul (prüft eine Freigabe-/Verweigerungsentscheidung gegen ein externes Git-Repo, ruft F1Bs `schreibeWirkungsmarke` bei Verweigerung) | `src/authorization-boundary/` | keine Erzeugung der externen Autorisierungsdatei oder ihrer Referenz (Aufrufer-Verantwortung), kein Eingriff in `src/checkpoint-store/`, keine Invocation Policy/Prozessstart |
| Autorisierung-Payload-Schema (Struktur der externen Freigabe-/Verweigerungsdatei, F3) | `schemas/kontrollzustand-autorisierung-payload.schema.json` | keine Entscheidungsinhalte im Produkt-Repo — nur Struktur, der externe Ort trägt die echten Daten |
