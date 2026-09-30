# V9 — Architektur, Datenmodell, Code und Health

Dieses Dokument ergänzt die finale Designübergabe. Es definiert benötigte Daten und Integrationsregeln, keine bereits vorhandenen Server-Endpunkte.

## Nutzerweg

Produktübersicht → Architektur & Code. Innerhalb des aktiven Produkts: Architektur / Datenmodell / Code & Änderungen / Probleme & Fragen / Health & Nachweise. Für jedes Produkt getrennte Inhalte. Die technische Sicht ergänzt die PM-Übersicht; sie darf den Einstieg nicht mit Pflichtfragen belasten.

## Referenzimplementierung

- Architektur: auswählbare Bausteine, Zweck, Verantwortung und Zusammenhänge. Das Beispiel für AI Workforce ist ein konzeptionelles Modell, keine bestätigte Repository-Analyse. Neue Produkte zeigen einen ehrlichen Leerzustand.
- Datenmodell: konzeptionelle Entitäten und Beziehungen. Kein behauptetes Datenbankschema. Reale Modelle erst aus nachprüfbaren Quellen übernehmen.
- Fragen: Kontext (Produkt + Baustein/Entität) wird erfasst und im Product Coach vorbereitet. Offene Fragen erscheinen im Produkt. Kein automatischer Antworttext ohne echte Anbindung.
- Probleme: Titel, Auswirkung, Quelle/Bezugsstand, Bereich und Priorität. Explizite Übernahme als Feature/Bug/Improvement. Derselbe Befund wird nur einmal übernommen; kein automatischer Start.
- Code: HTTPS-Repository-Link ohne Zugangsdaten. Ein hinterlegter Link ist noch keine Repository-Anbindung. Aktive Ausführung und tatsächlich beobachtete Dateiaktivität getrennt darstellen. Der F35-Dateipfad ist ausdrücklich Beispielkontext; sein Inhalt wurde nicht gelesen.
- Zusätzlich lassen sich die echten statischen Dateien dieser Designreferenz schreibgeschützt betrachten/herunterladen. Whitelist: experience.js, style.css, localization.js. Nicht als Produktquellcode ausgeben.
- Health: getrennt für Produkt, AI Workforce und Harness. Ohne vollständige Nachweise keine Zahl. Die Vorschau erfasst manuelle Bewertungen; keine automatischen Prüfungen.

## Produktionsverträge, die Claude prüfen/ergänzen muss

| Objekt | Erforderliche Felder / Verhalten |
| --- | --- |
| ArchitectureSnapshot | projectId, snapshotId, commitSha, analyzedAt, analyzerVersion, nodes, edges, sourceReferences, confidence/provenance; Hypothesen von verifizierten Quellen trennen. |
| DataModelSnapshot | projectId, version, modelType (konzeptionell/logisch/physisch), entities, fields, relationships/cardinalities, migrations/schema sources, observedAt; kein ORM-Modell automatisch als Produktdatenmodell ausgeben. |
| SourceReference | repositoryId, commitSha, repository-relative path, optional line range, read-only excerpt; source permissions respected. |
| CodeActivity | projectId, workflowId, runId, worker, role, actualModel, observedAt, branch, base/head commit, changedFiles and diff summary; ohne Beobachtung unknown. „Zuletzt geändert“ ist nicht automatisch „wird gerade bearbeitet“. |
| TechnicalQuestion | id, projectId, context snapshot/node/entity/source, question, answer status, answer with references, createdAt; Follow-ups behalten ihren Kontext. |
| TechnicalIssue | id, projectId, category, severity/priority, statement, impact, sourceReferences, affected version, status, linkedWorkItemId; idempotente Übernahme. |
| HealthCheck | projectId/scope, criterionId, ruleVersion, result, evidence, evaluatedCommit/configVersion, observedAt, validUntil/stale, provenance (manual/automated); unknown/stale separat. |
| HealthSummary | separate scopes product/workforce/harness, score or null, coverage, blockers, failed checks, calculation version and time; global score darf kritische Befunde nicht verstecken. |

## Health-Methodik der Vorschau

Je Bereich drei gleich gewichtete Prüffelder: pass = 1, warn = 0,5, fail = 0. Score = gerundeter Mittelwert × 100 nur bei 3/3 bewerteten Feldern. Sonst null, keine scheinbare Nullbewertung. Jeder fail bleibt als kritischer Befund sichtbar und wird nicht durch den Durchschnitt grün dargestellt. Nachweis/Bezugsstand ist Pflicht; Datum und manuelle Herkunft werden angezeigt. Diese einfache Formel ist eine transparente Designentscheidung, keine validierte Messung von Softwarequalität oder Sicherheit.

Vor Produktion Prüffelder und Gewichtung fachlich validieren. Komplette Abdeckung allein heißt nicht, dass ein Nachweis aktuell ist. Bei neuer Code-/Harness-Version betroffene Checks auf stale setzen und aus der belastbaren Bewertung nehmen. Freigaben nicht allein von dieser Kennzahl abhängig machen. Eine echte Sicherheitsfreigabe braucht ihren eigenen Prozess.

## Code-Zugriff

Echte Repo-Navigation über vorhandene erlaubte Repository-/Editor-Integration. Keine frei eingegebenen Dateipfade ungeprüft lesen. Read-only Viewer mit Repository-Grenzen, Pfadnormalisierung, begrenzter Größe und Ausschluss von Secrets; keine Credentials in URLs. Viewer liefert Commit, Pfad und Zeilenherkunft. Schreibende Bearbeitung nur als freigegebener Auftrag. Diff-Ansicht mit Basis-/Zielversion ergänzen, sofern echte Daten vorhanden sind. Nicht aus einem aktiven Worker heraus raten, welche Datei er bearbeitet.

## Abnahme

1. Projektwechsel vermischt keine Diagramme, Fragen, Befunde, Repo-Links oder Bewertungen.
2. Leere, unbekannte, veraltete und fehlerhafte Quellen bleiben unterscheidbar.
3. Diagrammknoten und Entitäten lassen sich auch per Tastatur prüfen.
4. Fragen tragen den richtigen Projekt-/Versionskontext; KI-Antworten haben prüfbare Quellen.
5. Problem → Arbeitsvorrat ist idempotent, behält Quelle und Priorität, startet nichts.
6. Fehlende Messungen zeigen keinen Score; negative Checks bleiben sichtbar.
7. Echter Code, Beispielcode und Designreferenz werden nicht verwechselt.
8. Editor-/Repository-Links öffnen im richtigen Projekt/Branch/Commit; Schreibzugriffe bleiben kontrolliert.

Status der Lieferung: Design und Interaktionen vorhanden, Datenquellen simuliert bzw. manuell. Fragen sind offen und im Coach vorbefüllt, keine echte Analyse. Alle neuen Daten nur sitzungsbezogen. Diese Grenzen bei der Integration gezielt schließen.
