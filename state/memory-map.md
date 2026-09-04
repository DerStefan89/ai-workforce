<!-- Ziel-Pfad im Repo: state/memory-map.md -->
# Memory Map — AI Workforce

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
| Human-Transport-Modul (`BEDARF_V0` erfassen, Transportpaket erzeugen/aushändigen/importieren, F2s `pruefeStale`/`haltFestStaleEntscheidung` gegen die Transportpaket-Eingaben, F1Bs `RUN_PREPARED`/Terminalartefakt) | `src/human-transport/` | kein Touch an `src/checkpoint-store/` oder `src/lineage-registry/`, keine Automatisierung der Werkzeug-/Bedarfsauswahl (bleibt manuell, F-031 ist ein eigenes, späteres Feature), keine Browserautomatisierung/HTTP-Client-Aufrufe |
| Bedarf-/Transport-Payload-Schema (`daten.daten`, wenn `bedarf_schema`/`transport_schema === "v0"`, F9) | `schemas/kontrollzustand-bedarf-payload.schema.json`, `schemas/kontrollzustand-transport-payload.schema.json` | keine Checkpoint-/Lineage-Hülle — die beschreiben weiterhin ausschließlich `schemas/kontrollzustand-lineage-payload.schema.json` (F2) |
| Context-Builder-Modul (baut ein begrenztes Kontextpaket je Auftrag/Rolle aus einer Anfrageliste — Rollenfilter, Duplikat-/Widerspruchserkennung, zweiphasige Budget-vs-Evidenz-Vergabe, Registrierung über F2, F5) | `src/context-builder/` | kein Touch an `src/lineage-registry/`, keine Rollentabelle unter `profiles/` (Rollen sind Kern, D1/D14/§16.7), kein Dateilesen durch das Modul selbst (Aufrufer liefert Inhalt), kein Runtime-/Modell-Feld (E-191 N1/N2) |
| Kontextpaket-Payload-Schema (`daten.daten`, wenn `kontextpaket_schema === "v0"`, F5) | `schemas/kontrollzustand-kontextpaket-payload.schema.json` | keine Checkpoint-/Lineage-Hülle — die beschreiben weiterhin ausschließlich `schemas/kontrollzustand-lineage-payload.schema.json` (F2) |
| Laufakte-Payload-Schema (`daten.daten`, wenn `laufakte_schema === "v0"`, F6a WS2) | `schemas/kontrollzustand-laufakte-payload.schema.json` | keine Checkpoint-/Lineage-Hülle — die beschreiben weiterhin ausschließlich `schemas/kontrollzustand-lineage-payload.schema.json` (F2) |
| Rohereignisstrom eines Claude-Code-Laufs (F6a WS2, E-190, nicht committet) | `kontrollzustand-roh/<lauf_id>/` | keine kanonische Laufakte — die liegt unter `kontrollzustand/` und referenziert den Rohstrom nur über seinen Inhalts-Hash |
| Regel für lesende Verifikation über die Geräte-Brücke gegen ein parallel genutztes Repo | `docs/harness/geraete-bruecke-verifikation.md` | nicht in `state/findings.md` — dort steht nur der Befund (F-034/F-045), nicht die dauerhafte Regel |
| Invocation-Policy-Modul (lokale, werkzeuglose Startfreigabe-Prüfung: Baseline-Hash-Vergleich E-183, Wirksamkeitsnachweis-Drift-Vergleich E-188, E-182-Verbotsliste, ruft F1Bs `schreibeWirkungsmarke` bei ABGELEHNT, ruft F3s additiv exportierte `leseAusCommit`/`gitattributesPinntZeilenenden`/`leiteRepoRelativenPfadAb` von außen auf) | `src/invocation-policy/` | kein Eingriff in `src/authorization-boundary/` über den additiven Export hinaus, kein Prozessstart des geprüften Werkzeugs (F6, AC8-Gate-Grep), keine Baseline- oder Wirksamkeitsnachweis-**Instanz** im Produkt-Repo (nur Schema, nie Inhalt — analog F3) |
| Invocation-Policy-Baseline-/Wirksamkeitsnachweis-Payload-Schema (Struktur der externen Baseline- bzw. Nachweisdatei, F4) | `schemas/kontrollzustand-invocation-policy-baseline-payload.schema.json`, `schemas/kontrollzustand-invocation-policy-wirksamkeitsnachweis-payload.schema.json` | keine Entscheidungsinhalte im Produkt-Repo — nur Struktur, der externe Ort trägt die echten Daten (analog `kontrollzustand-autorisierung-payload.schema.json`, F3) |
| Claude-Code-Gateway-Modul (WS1) (Aufrufkonstruktion als Tokens-Array, Prüfung vor jeder Weitergabe über F4s `pruefeAufrufparameter`/`verweigereStart`) | `src/claude-code-gateway/` | kein Touch an `src/invocation-policy/index.ts` außer den bereits vorhandenen Re-Exporten, keine Prozessstart-Logik vor WS2 |
| Execution-Controller-Modul (F8 WS-1/WS-2a/WS-2b, vollständig) (führt einen Lauf vollständig durch F5 `baueKontextpaket` → F6a `baueAufruf`/`starteGateway` → F7 `klassifiziereLauf` → bei `VERWEIGERT` mit `bypass_verdacht_anzahl > 0` E-186-Eskalation über F9 (`erfasseBedarf`/`erzeugeTransportpaket`/`haendigeAus`) unter eigener `laufId` → F1B `stelleLaufstatusFest(ausloesenderLaufId)`, feste Reihenfolge, bricht bei F5/F6a-Ablehnung mit deren unverändertem Grund ab; bei gesetztem `eingaben.vorgaengerLaufId` wird vor `baueKontextpaket` die Laufakte des Vorgängerlaufs über `ladeArtefaktVersion` geladen und der Anfragenliste als `notwendig:true`-Eintrag vorangestellt (Lineage-Verweis, AK7) — fehlt sie, wirft die Funktion) | `src/execution-controller/` | kein Touch an F1B/F5/F6a/F7/F9 (nur von außen aufgerufen, D1), keine eigene Prüf-/Klassifikationsregel (AK1/AK3-Gate), kein eigener `schreibeWirkungsmarke`-Aufruf für die Haupt-`laufId` (D5), ein Wurf aus einem der drei F9-Eskalationsaufrufe propagiert unverändert als Promise-Rejection (plan-v2 Delta 1, kein vierter Ergebnis-Zweig), kein STALE-Prüfpfad für die Laufakte-Lineage-Referenz (SCOPE Punkt 6), kein Codepfad, der die Vorgänger-`laufId` an `schreibeWirkungsmarke`/`schreibeCheckpoint`/`starteGateway` übergibt — der Vorgängerlauf bleibt unverändert (WS-2b, AK7) |
