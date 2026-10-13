## Umsetzung in der Workforce

Kopfabschnitt der Workforce (F45 B2a-3a, 13.10.2026). Unterhalb der Markierung `SPEC-ANFANG` steht Stefans Spec vom
12.10.2026 wörtlich aus dem Bauauftrag F45 B2a-3; das Gate `scripts/check-f45-b2a3-codex-review.mjs` (a) hält diesen
Teil über einen festen sha256 (LF-normalisiert) unverändert. Ob der Wortlaut Stefans Datei trifft, prüft Stefan.

| Spec | Umsetzung | Wo |
|---|---|---|
| §4 kein Prozessaudit | Beobachtungsblock („vorgesehen gegen benutzt“) nur beim Claude-Reviewer; der Codex-Reviewer bekommt keinen; „vorgesehen gegen benutzt“ bleibt im Harness-Abgleich der Abnahme (Beleg 12) | B1b-1, B2a-1 (F-1062) |
| §5 Eingaben | Projektkarte für den Reviewer (Vorhaben, Bestand mit ARCHITECTURE.md/ADRs, Qualität mit DoD und Checkliste), Prüfmaßstab im Stand vor dem Bau | B2a-1, B2a-2 |
| §3, §4, §6, §7 Review-Policy | `src/review-policy` (einzige Quelle, Version `review-policy-1`) im Auftrag jedes code-reviewer-Schritts, Codex und Claude gleich; Vorrang: Policy vor Karte — Prozesspunkte der DoD „nicht anwendbar (Harness-Abgleich)“, Beobachtungsblock beim Claude-Reviewer als ausdrückliche Ausnahme (Dimension `prinzipien`); Version in der Laufakte (`review.policy_version`) | B2a-3a |
| §7 Ausgabeformat | Schema `ergebnis-code-reviewer` v2: je Befund `id`, `dimension`, `evidenz`, `korrekturrichtung` (Strict-Modus: in `required`, nullable), Schwere `KRITISCH`; Zuordnung critical/high/medium/low = KRITISCH/HOCH/MITTEL/NIEDRIG; ohne Befunde der Satz in `empfehlung` | B2a-3a |
| §9.8 Fehlerfälle | Toolausfall/Timeout und nicht gelaufener Review mit Grund in Abnahme und „Auf einen Blick“; leere Befunde ohne den Satz → Halt (Regel 1k); fehlende Pflichtwerte je Befund → sichtbarer Hinweis ohne Halt (Entscheidung Stefan 13.10.2026); unvollständiger Kontext (Lücken der Projektkarte) → sichtbar, kein Halt | B2a-3a |
| §9.6 geprüfter Stand, „Review veraltet“ | `geprueft_stand` vom Server in der Laufakte, Anzeige „Review veraltet“ | B2a-3b |
| §8 Status strittiger Befunde (`accepted`, `rejected-with-reason`, `needs-human-decision`), widersprüchliche Befunde | später | B2b |
| §11 Erfolgsmessung | später | F-1050 (B2b) |

Grenze: Ein claude-code-Reviewer im Ablauf hat kein Ausgabeschema (Regel 4b) — für ihn wirkt die Policy nur als Text,
ohne Vertragsprüfung (Regel 1k) und ohne Abnahme-Anzeige des Urteils.

<!-- SPEC-ANFANG — ab hier wörtlich (Stefan, 12.10.2026) -->
# Codex Technical Code Review – Umsetzungsspezifikation

**Status:** Entwurf zur späteren Implementierung mit Claude Code  
**Datum:** 2026-10-12  
**Ziel:** Ein komplementäres technisches Review durch Codex, ohne die Kontrollen des Claude-Harness zu duplizieren.

## 1. Ausgangslage

- **Codex** übernimmt derzeit Architect, Planner und einen abschließenden Technical Code Review.
- **Claude Code** übernimmt Architecture Challenger und Builder und entwickelt unter dem bestehenden Harness.
- Der bestehende Claude-Harness enthält u. a. **Plan V1 → Advisor → Plan V2**, QA-Agent, Hooks, weitere Gates und **Ponytail**.
- Der genaue technische Umfang einzelner bestehender Komponenten wird vor Umsetzung im Repository ermittelt, nicht vorausgesetzt.
- Codex muss Claude-spezifische Harness-Komponenten **nicht selbst ausführen**. Er benötigt die für das Code Review relevanten technischen Prinzipien und Definitionen.

## 2. Zielbild und Verantwortlichkeiten

**Claude Code + Harness:** Planungsschritte gemäß Workflow, Implementierung, interne QA, Hooks, vorgeschriebene technische Kontrollen.

**Codex als Technical Reviewer:** Unabhängige, ergebnisorientierte Prüfung des fertigen Codes auf verbliebene technische Probleme. Kein zweites Audit des Harness-Prozesses.

**Freigabe:** Befunde werden nach Schweregrad und Evidenz bewertet; bestätigte Probleme gehen an Claude Code zur gezielten Behebung. Erneute Prüfung betroffener Stellen; kein endloser Review-Loop.

## 3. Review-Auftrag (Pflichtumfang)

1. **Bugs und Korrektheit:** Logikfehler, Edge Cases, State- und Concurrency-Probleme, Race Conditions, Fehlerbehandlung, Ressourcenfreigabe.
2. **Funktionsfähigkeit:** Erfüllt die Implementierung Anforderungen und relevante Schnittstellenverträge? Funktionieren Integrationen und erwartete Pfade?
3. **Skalierbarkeit:** Plausible Engpässe, Laufzeit-/Speicherverhalten, Last, parallele Zugriffe, Limits; Risiken im Kontext der tatsächlichen Zielarchitektur bewerten.
4. **Wartbarkeit:** Verständlichkeit, Modularität, Kopplung, Verantwortlichkeit, unnötige Komplexität und langfristige Änderbarkeit.
5. **Technische Prinzipien und Definitionen:** Konformität mit dokumentierter Architektur, technischen Regeln, ADRs, Schnittstellen-/Datenverträgen und relevanten Projektdefinitionen.

**Zusatz:** Relevante Sicherheitsdefekte, die Codex im Code entdeckt, sind zu melden, auch wenn sie nicht in einer separaten Review-Dimension organisiert sind.

## 4. Explizit nicht beauftragt

- Kein erneutes Durchlaufen oder Auditieren von **Plan V1 → Advisor → Plan V2**.
- Keine generelle Prüfung, ob Hooks, QA-Agent, Ponytail oder andere Harness-Schritte stattgefunden haben.
- Keine Wiederholung vorhandener vollständiger Test-Suiten ohne konkreten Grund.
- Keine kosmetischen Stilkorrekturen, irrelevanten Refactorings oder Neugestaltung der Architektur aus Präferenz.
- Keine automatische Übernahme von Reviewer-Vorschlägen als Wahrheit.

**Ausnahme:** Für einen konkreten Fehlerverdacht darf Codex einen gezielten Test ausführen oder vorschlagen. Prozessartefakte können als Kontext dienen, sind aber nicht selbst Gegenstand des Reviews.

## 5. Eingaben für Codex

Die Integration stellt bei einem Review möglichst gezielt bereit:

- ursprüngliche Anforderungen, Akzeptanzkriterien und Scope;
- relevanten Code-Diff sowie bei Bedarf umliegende Implementierung und Abhängigkeiten;
- `ARCHITECTURE.md`, einschlägige ADRs, API-/Datenverträge und technische Definitionen;
- aus `CLAUDE.md` nur die **für Architektur und Codequalität relevanten Regeln** (keine Aufforderung, Claude-spezifische Hooks auszuführen);
- Zielumgebung, Nicht-Ziele und erwartetes Lastprofil, soweit vorhanden;
- vorhandene Testergebnisse bei Bedarf zur Einordnung, nicht als eigenständige Audit-Aufgabe.

Eine schlanke, versionierte **Review-Policy** sollte die Regeln bündeln oder zuverlässig auf vorhandene kanonische Dateien verweisen. Bei Widersprüchen ist die relevante Quelle zu benennen, nicht stillschweigend eine auszuwählen.

## 6. Reviewer-Isolation

- Codex erhält einen separaten Review-Kontext, damit seine frühere Rolle als Architect/Planner nicht als Qualitätsbeweis gilt.
- Der Reviewer darf **auch ursprüngliche Architekturannahmen von Codex** kritisieren.
- Keine implizite Annahme, dass grüne Tests vollständige Korrektheit bedeuten.
- Findings ausschließlich aus überprüfbarem Code-/Anforderungskontext ableiten; Unsicherheit explizit kennzeichnen.

## 7. Ausgabeformat eines Findings

Jeder Befund enthält:

- **ID**, **Schweregrad** (`critical`, `high`, `medium`, `low`), **Dimension**;
- Datei/Zeile bzw. konkrete Code-Stelle;
- beobachtetes oder plausibles Fehlverhalten und **warum** es auftritt;
- betroffene Anforderung oder technisches Prinzip (falls relevant);
- reproduzierbare Schritte/Testidee oder nachvollziehbare statische Begründung;
- vorgeschlagene **minimal-invasive** Korrekturrichtung;
- Evidenzstatus: `confirmed`, `likely`, `needs-validation`.

Falls keine belastbaren Findings vorliegen: **„Keine belastbaren Findings im geprüften Scope“**, nicht „fehlerfrei“.

## 8. Priorisierung und Umgang mit Findings

- **Critical/High:** Reale Defekte oder schwerwiegende, begründete Risiken; Behebung beziehungsweise bewusste dokumentierte Risikoentscheidung vor Freigabe.
- **Medium:** Konkrete technische Schulden oder Risiken mit nachvollziehbarer Auswirkung; priorisieren.
- **Low:** Nur melden, wenn objektiv relevant; keine Stil-Nitpicks.
- Claude Code prüft Befunde gegen Code und Anforderungen, behebt bestätigte Punkte gezielt und führt betroffene Tests aus.
- Bei strittigen Befunden: `accepted`, `rejected-with-reason` oder `needs-human-decision` dokumentieren; kein unendlicher Agentendialog.
- Ein gezielter Re-Review untersucht die geänderten Stellen und mögliche Regressionen, nicht automatisch den gesamten Prozess erneut.

## 9. Umsetzungshinweise für Claude Code

1. Bestehende Architektur, Rollen, Adapter, Agenten, Feature-Akten, Aufrufpolitik und technische Definitionen im Repository **zuerst inspizieren**.
2. Bestehende Mechanismen wiederverwenden; keine parallele zweite Harness-Implementierung bauen.
3. Review-Policy aus kanonischen Architektur- und Definitionsdateien beziehen, möglichst ohne widersprüchliche Regelkopien.
4. Input-/Output-Vertrag des Codex-Reviewers definieren und versionieren.
5. Reviewer darf Code lesen, Diagnosen erstellen und bei Bedarf gezielt testen; Schreibzugriff auf Produktionscode standardmäßig nicht notwendig.
6. Reviewer-Ergebnis strukturiert speichern, mit Feature/Commit/Change-Set verknüpfen und bei relevanten Änderungen als veraltet markieren, soweit vorhandene Registry-/Lineage-Funktionen dies erlauben.
7. Existing Gates beibehalten; keine neuen obligatorischen Schritte ohne klaren Qualitätsnutzen einführen.
8. Fehlerfälle definieren: Toolausfall, unvollständiger Kontext, Timeout, leere Findings, widersprüchliche Befunde.
9. Änderung als kleines Feature mit Tests, Dokumentation und klarer Rückwärtskompatibilität umsetzen.

## 10. Akzeptanzkriterien

- [ ] Codex prüft die fünf festgelegten technischen Dimensionen.
- [ ] Relevante Architekturprinzipien und Definitionen stehen ihm als Kontext zur Verfügung.
- [ ] Keine Pflicht, Claude-spezifische Hooks oder den kompletten Harness auszuführen.
- [ ] Keine redundante Prozess- oder QA-Auditierung als Standardablauf.
- [ ] Findings haben Ort, Schweregrad, technische Begründung, Evidenzstatus und Korrekturrichtung.
- [ ] Eigene frühere Planungsentscheidungen von Codex sind ausdrücklich überprüfbar.
- [ ] Testausführung ist gezielt und optional, nicht reflexhaft vollständig.
- [ ] Confirmed Findings können an Claude zur Behebung übergeben und gezielt nachgeprüft werden.
- [ ] Veraltete Review-Ergebnisse können erkannt bzw. kenntlich gemacht werden.
- [ ] Offene, nicht verifizierbare Annahmen werden nicht als bestanden ausgegeben.

## 11. Erfolgsmessung (optional, spätere Evaluation)

Vergleiche gleiche Features mit und ohne finalen Codex-Review bei ansonsten identischem Harness. Messe echte zusätzliche Bugs, False Positives, Regressionen nach Korrektur, Testabdeckung gezielter Reproduktionen, Token-/Zeitkosten und Review-Loop-Dauer. Qualitätsgewinne müssen gegenüber Mehraufwand nachgewiesen werden.

## 12. Konkreter Implementierungsauftrag für Claude Code

> Analysiere zunächst den aktuellen Harness und die vorhandenen Codex-/Claude-Schnittstellen. Setze dann diese Spezifikation als schlanken, unabhängigen technischen Codex-Review um. Der Reviewer soll Bugs, Funktionsfähigkeit, Skalierbarkeit, Wartbarkeit und Architekturkonformität bewerten. Er soll **nicht** die bereits erfolgten Harness-, Advisor-, QA- oder Hook-Prozesse erneut auditieren. Verwende bestehende Dateien, Policies, State- und Artifact-Mechanismen; entwirf vor Änderungen einen minimalen Umsetzungsplan, benenne offene Repository-spezifische Fragen und arbeite nach den bestehenden Freigabe- und Qualitätsregeln.
