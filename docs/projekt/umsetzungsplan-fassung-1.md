# Umsetzungsplan Fassung 1 (v1)

Stand: 28.08.2026, korrigiert 28.08.2026 (Reihenfolgefehler Vertragsschiene,
s. Abschnitt 3). Ergebnis der Teilaufgabe „Stack-/Architektur-Finalisierung,
restliche Randfragen + Umsetzungsplan" (`claude/60_...`), entschieden im
Projektchat am 28.08.2026. Grundlage: `docs/projekt/zielfassung.md` (v1.8),
`claude/41_VERTRAGSPAKET.md`, Harness-Konventionen `spec-schreiben`/
`handoff-vertrag`/`state/zwischenstand/` (per Volltext-Read bestätigt),
Stefans Umsetzungswünsche-Dokument (28.08.2026, hochgeladen).

Marker: `[Fakt]` · `[Schlussfolgerung]` · `[Annahme]` · `[offene Unsicherheit]`

---

## 0. Vorgeklärte Randfragen aus §15 der Ziel-Fassung

`[Fakt]` In dieser Sitzung entschieden, bereits in Wirkung für diesen Plan:

- **Datenformate:** `kontrollzustand/` = JSON/JSONL, hält nur eine gepinnte
  *Referenz* (Pfad + Hash + Version) auf das verwendete Profil, keine Kopie.
  `profiles/` = JSON, alleinige editierbare Quelle für Profilinhalte.
- **Oberflächentechnik:** Leitstand wird eine lokale Web-Oberfläche (nicht
  CLI/Terminal) — neue Laufzeitkomponente, §16.1 wird bei Umsetzung um diese
  Randbedingung ergänzt.
- **Profilinhalte:** Ein-Ebenen-Modell — jedes Projekt erhält eine
  vollständige, eigenständige Profil-Datei, kein Domänen-Profil mit
  Projekt-Overlay.

---

## 1. Meilenstein 1 (einziger für Fassung 1)

AI Workforce lauffähig für die Referenzfeature „Belegschaftskonfiguration an
der AI Workforce selbst" (§13.1).

**DoD:** vollständig belegter End-to-End-Durchlauf über alle vier
Workflow-Layer (§13.1, #97, #127), alle notwendigen Workstreams
abgeschlossen (#128), jeder Passtyp mindestens einmal durchlaufen (P4),
genau ein aktiver Workstream (#25), Mechanik-Gate und Baseline-Vergleich
getrennt ausgewiesen (#130). Bewiesen wird die Mechanik, nicht
Qualitätsüberlegenheit.

**Orchestrierungs-Grundsatz für ganz Fassung 1** `[Fakt, entschieden]`:
Stufe 1 (manuelle Auswahl des nächsten Schritts durch den Menschen; kein
System-Vorschlag, kein Auto-Start nichtkritischer Schritte). Stufe 2+
(System empfiehlt/startet automatisch, Phase 16 im Umsetzungswünsche-Dok.)
ist Backlog, nicht Fassung 1. `[Schlussfolgerung]` Das betrifft nur, *wer*
einen Schritt auslöst — die Ausführungs-Sicherheitsinfrastruktur (D3: „Der
Kern ruft auf") ist auch bei rein manueller Auslösung von Anfang an nötig,
weil sie jeden Aufruf absichert, unabhängig davon, wer ihn ausgelöst hat.

---

## 2. Deliverables und Features

### Deliverable 1 — Kontrollzustand-Fundament
| # | Feature | Begründung Reihenfolge |
|---|---|---|
| 0 | Datenformate umsetzen (`kontrollzustand/`, `profiles/`, s. Abschnitt 0) | Bereits entschieden, hier nur Implementierung |
| 1 | **Checkpoint Store** | Reine Persistenzschicht, keine Abhängigkeit auf andere Module |
| 2 | **Artifact Registry / Lineage** | Baut auf der Checkpoint-Store-Hash-Kette auf (A7) |

### Deliverable 2 — Autorisierung & Startvalidierung
| # | Feature | Begründung Reihenfolge |
|---|---|---|
| 3 | **Authorization Boundary** | Eigenes Repo außerhalb der Schreibreichweite (D16) — kann parallel zu Deliverable 1 entstehen |
| 4 | **Invocation Policy / Protection Validator** | Braucht Authorization Boundary + Hash-Baseline der Schutzskripte (E-183/E-188) |

### Deliverable 3 — Ausführungspfad
| # | Feature | Begründung Reihenfolge |
|---|---|---|
| 5 | **Context Builder** | Muss vor dem Gateway stehen — liefert das Kontextpaket |
| 6 | **Claude-Code-Gateway** | Startet erst, wenn Invocation Policy (4) freigibt und Context Builder (5) liefert |
| 7 | **Result Evaluator** | Verarbeitet die Ausgabe des Gateways |
| 8 | **Execution Controller** | Orchestriert 4–7 sowie Checkpoint Store (1); fertig zuletzt in dieser Gruppe, weil abhängig von allen anderen |

### Deliverable 4 — Mensch-Schnittstelle
| # | Feature | Begründung Reihenfolge |
|---|---|---|
| 9 | **Human Transport** | Für die minimale Freigabedatei-Autorisierung (Vertrag 5) nicht zwingend vorausgesetzt `[Annahme]` — für strukturierte Entscheidungs-/Findings-Übergaben gebraucht. Parallel zu Deliverable 3 möglich |
| 10 | **Leitstand** (lokale Web-Oberfläche) — **Scope-Ergänzung:** inklusive minimaler Stufe-1-Bedienung (z. B. „nächsten Schritt starten"), nicht nur passive Projektion. Löst nur Aufrufe an den Execution Controller aus, hält selbst keine Wahrheit (§16.2) | Braucht Daten aus Checkpoint Store/Artifact Registry, um etwas anzuzeigen — daher spät, kann aber parallel zu Deliverable 1 entwickelt werden |

### Deliverable 5 — Erweiterte Projekt-/Rollen-Verwaltung (NACH Meilenstein 1)
`[Fakt, entschieden]` Enthält Stefans Phase-0.1/0.3/0.4-Wünsche aus dem
Umsetzungswünsche-Dokument (Projekt anlegen/verwalten, vollständiges
Rollenmodell mit allen Feldern, Chat-/Kontext-Detailansicht). Bewusst
**nicht** Teil von Meilenstein 1: die Referenzfeature-Bestehensbedingung
(§13.1) braucht nur ein Projekt (AI Workforce selbst) und eine minimale
Besetzungskonfiguration, keine volle Mehrprojekt-Verwaltung. Wird erst nach
Abschluss von Meilenstein 1 geplant (eigener Spec, eigener TECH_PLAN).

`[offene Unsicherheit]` Die Rollenmodell-Felder aus Stefans Dokument (ID,
Anbieter, Modell, Systemprompt, Vorgänger/Nachfolger, erlaubte Tools,
Handoff-Informationen etc.) vermischen Position (§4), Execution (§7) und
Artifact (Artifact Registry, §16.2) in einer flachen Struktur — muss beim
TECH_PLAN für Deliverable 5 auf die bestehende Modultrennung abgebildet
werden, nicht als neue Entity übernommen werden.

---

## 3. Vorbedingungs-Schiene: Harness-Verträge (`41_VERTRAGSPAKET.md`)

Läuft parallel zu den Deliverables, betrifft `scripts/`/Hooks, nicht `src/`.

`[Fakt, korrigiert]` Verbindliche Reihenfolge laut `41_VERTRAGSPAKET.md`
und `claude/60_...`: **1 → 2 → 4 → 5 → 3**
(Vertrag 1 `harness-b1b3-merge-guard-und-git-flow` → Vertrag 2
`tp-03d-wirkungsgrenze-und-hash-baseline` → Vertrag 4
`harness-a1-kettenumfang-produktpfad` → Vertrag 5
`harness-freigabedatei-wiederherstellung` → Vertrag 3
`tp-01e-fehllauf-beobachtungsbasis`, zuletzt, da Kontingent-Erschöpfung
beabsichtigt).

**Korrekturhinweis:** In der Vorversion dieses Dokuments (28.08.2026, vor
dieser Korrektur) fehlte Vertrag 1 in dieser Zeile ("2 → 4 → 5 → 3"). Fehler
gefunden bei erneutem Abgleich mit `claude/37_HANDOFF_VERTRAEGE.md` und
`claude/40_ARCHITEKTUR_A1_A9.md` (dort Abschnitt 5, Hinweis 4: „Die
Reihenfolge der Verträge bleibt verbindlich: 1 → 2 → 4 → 3", vor Einfügung
von Vertrag 5 formuliert).

`[Fakt, Nachtrag 28.08.2026]` Die gesamte Vertragsschiene ist inzwischen
abgeschlossen: sechs Verträge gemerged (PR #7 Vertrag 1, #8 Vertrag 2,
#9 Option B, #10 Vertrag 3, #11 Vertrag 4, #12 Vertrag 5), `main` bei
`19a5d07`. Der in Abschnitt 6 genannte Statuscheck zu Vertrag 1 und die
`[offene Unsicherheit]` zu dessen Merge-Status sind damit erledigt.

**Harte Bedingung:** Vertrag 5 (Freigabedatei-Wiederherstellung, inkl.
Lade-/Smoke-Test-Nachweis) muss abgeschlossen sein, **bevor** der erste
Produkt-Commit unter dem geschützten Pfad tatsächlich committet wird
(§9.1 Zeile 1) — unabhängig vom Fortschritt der Deliverables oben.
Erfüllt seit 28.08.2026.

---

## 4. Geprüfte, nicht aufgenommene Werkzeuge (Befund 7)

`[Fakt]` 14 von Stefan vorgeschlagene Tools/MCPs geprüft (Session
28.08.2026). Zwei mit echtem Konflikt zu bestehenden Entscheidungen:

- **claude-code-router** — widerspricht E-159 (kein stiller Modell-Fallback)
  und E-185 (`--model` je Execution explizit) sowie dem Referenzfeature
  selbst (gepinnte, konfigurierte Modellbesetzung statt automatischem
  Routing).
- **claude-hud** — widerspricht §12 („Anzeige ausschließlich aus der
  Laufausgabe; keine eigene Schätzung, Rang `OBSERVED`"), sofern eigene
  Schätzlogik statt CLI-Laufausgabe verwendet wird.

Rest (cc-switch, codex-plugin-cc, planning-with-files, github-mcp, graphify,
codegraph, claude-mem, playwright-mcp, anthropics/skills,
awesome-claude-skills, wshobson/agents, caveman): kein konkretes Problem
benannt (#174-Gate nicht erfüllt) oder Duplikat bereits geplanter/
vorhandener Mechanismen. Keiner davon Teil dieses Plans. `playwright-mcp`
als einziger Punkt mit Zukunftsbezug im Backlog vermerkt (Abschnitt 5).

---

## 5. Backlog (jenseits Fassung 1 — Name, Begründung, grobe Reihenfolge, kein Feature-Detail)

- Domänen aus §1, nach Software/App: API, Data Science/ML, Automatisierung,
  KI-Video, Web3 — Reihenfolge `[Annahme]`, nicht von Stefan bestätigt.
- Fassung-2-Kandidaten aus §13.2: Core als Halter der Git-Freigabe,
  Core-kontrollierte Ausführungsumgebung, Sicherung des Bezeugungsbereichs.
- Orchestrierungs-Stufen 2–6 (System empfiehlt/startet automatisch,
  Parallelisierung, dynamische Agentenplanung) — Stufe 5 „Parallelisierung"
  steht in Spannung zu D13 („Genau ein aktiver Arbeitsstrang"), nicht
  aufgelöst, nur vermerkt.
- Multi-Provider-Orchestrierung (ChatGPT/andere Modelle als koordinierte,
  API-integrierte Rollen) — kollidiert mit §4/#13 (keine
  Cross-Model-Unabhängigkeit in Fassung 1) und §13.2 (Provider-Adapter nicht
  in Fassung 1). `[Schlussfolgerung]` „Coach = ChatGPT" ist in Fassung 1 nur
  als manueller Kopierblock-Workflow über Human Transport zulässig, keine
  API-Integration.
- Topologien Council/Stern/Loop (mehrere parallele Reviewer/Rollen) —
  gebunden an dieselbe D13-Spannung wie Stufe 5.
- Sandbox-Isolation und Adversarial Security (Phase 12.5/12.6 im
  Umsetzungswünsche-Dok.) — von Stefan selbst als langfristig markiert.
- `playwright-mcp` — erst relevant, wenn Feature 10 (Leitstand) steht und
  ein konkreter QA-Bedarf für dessen eigene Oberfläche entsteht.
- Harness-Kandidaten 1–9: bereits in §11 der Ziel-Fassung verzeichnet, hier
  nur referenziert, nicht dupliziert.
- Deliverable 5 (erweiterte Projekt-/Rollen-Verwaltung): kein Backlog im
  engeren Sinn, aber explizit nach Meilenstein 1 einsortiert (Abschnitt 2).

---

## 6. Nächster Schritt

`[Fakt, korrigiert]` Erster Schritt war ein **Statuscheck** der
Vertragsschiene. `[Fakt, Nachtrag 28.08.2026]` Durchgeführt und erledigt:
alle sechs Verträge gemerged, `main` bei `19a5d07`.

Nächster Schritt ist damit das Nachziehen der Ebene-2-Grundlage in das
Repository (`state/tasks/ebene2-architektur-in-repo-nachziehen.md`), danach
AF-F001 (Feature-Akte im Repo), danach Feature 0 aus Deliverable 1.
Ausführung wie immer außerhalb des Projektchats, in einer separaten
Claude-Code-Sitzung.
