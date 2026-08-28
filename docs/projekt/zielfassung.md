# AI Workforce — Ziel-Fassung v1.8 (konsolidierte Sollquelle)

Stand: 24.08.2026
Grundlage: Entscheidungsregister 001–176, Challenge 2 (`10_...`), TECHNICAL_PROOF (`13_...`), Architektur-Council (`16_` bis `20_`), realer Harness `main` HEAD `9189959`, zweite Challenge-Runde gegen den realen Harness (`54_...`, `57_...`), STALE-Korrekturen (`58_...`, `59_...`), Architekturphase A1–A9 (`40_ARCHITEKTUR_A1_A9.md`).

v1.2 → v1.3: **Architektur-Baseline aufgenommen (Abschnitt 16)** · sechzehn Drivers verbindlich · E-189 und E-190 ergänzt · 142a korrigiert · Durchsetzungsgrad-Tabelle um zwei Zeilen erweitert · TP-Stand nachgezogen.

v1.3 → v1.4: **Harness-Kandidat 9 ergänzt** (Abschnitt 11) — Harness-Fix-Programm-Altlast in `main`s `state/`/`state/tasks/`, gefunden im Advisor-Pass zu `HARNESS_SETUP`, 20.08.2026. Kein Umsetzungsauftrag; nur Meldung, wie bei den Kandidaten 1–8.

v1.4 → v1.5: **Vier `STALE`-Korrekturen aus der zweiten Challenge-Runde eingearbeitet**, entschieden im Projektchat am 24.08.2026 (`claude/59_STALE_PUNKTE_ENTSCHIEDEN.md`): §9.1 Zeile 1 (ERZWUNGEN → DEKLARIERT, Freigabedatei-Pflicht seit 23.08.2026 aus dem Harness entfernt) · §9.2 Stufe 6 und „Verbrauchter Schlüssel" (Abhängigkeitsvermerk auf Vertrag 5) · §11 (`commit-guard.js` nur noch für `settings.json`-Sperre) · §13.2 Fassung-2-Kandidat 1 (falsifizierte Begründung entfernt, Fassung-1-Verpflichtung für Ersatzmechanismus über Vertrag 5 ergänzt).

v1.5 → v1.6: **Änderungsliste aus `claude/40_ARCHITEKTUR_A1_A9.md` Abschnitt 2 eingearbeitet** (A1–A9, „Freigegeben mit Hinweisen", 22.08.2026), entschieden im Projektchat am 24.08.2026: §15/§16.1 (Stack entschieden, A1) · §16.2 (Checkpoint Store, Execution Controller, Artifact Registry, A2/A4/A5/A7) · §16.3 (Pfadlayout `src/`/`kontrollzustand/`/`profiles/`, A2/A3) · §16.4/§16.6 (Terminologie `Checkpoint`/`Wirkungsmarke`, A5) · §16.8 (Punkte 1, 2, 6, 7, 9 geschlossen) · §9.1 (Merge-auf-`main`-Zeile zweizeilig, B1/Advisor B-02) · §9.2 Punkt 5 (Bindung an Arbeitsbranch-Head, B3) · §11 (`git-flow`-Vorbehalt bis Vertrag 1 „Aufgabe 4" gemergt ist, B3).

v1.6 → v1.7: **Vertrag 5 abgeschlossen und unabhängig verifiziert** (PR #12, Merge-Commit `19a5d07`, 28.08.2026): §9.1 Zeile 1 (DEKLARIERT → ERZWUNGEN, gemessener Rot-/Grün-Fall inklusive Lade-/Smoke-Test auf realer Zielmaschine, `node v24.16.0`; neue Zeile für den zusätzlichen Edit/Write-Schutz der Freigabedatei) · §9.2 Stufe 6 und „Verbrauchter Schlüssel" (Mechanismus jetzt im Harness vorhanden) · §11 (`commit-guard.cjs` wieder vier Aufgaben, `guard-settings.js` zusätzlich mit Edit/Write-Schutz für die Freigabedatei) · §13.2 Fassung-2-Kandidat 1 (Ersatzmechanismus umgesetzt, volle Core-Eigentümerschaft bleibt Fassung-2) · §14 (Bash-Pfadsperre für die Git-Freigabe-Datei jetzt gemessen). Damit ist die gesamte Vertragsschiene (1, 2, Option B, 3, 4, 5) abgeschlossen — siehe `claude/41_VERTRAGSPAKET.md`.

v1.7 → v1.8: **§15 nachgetragen** — Datenformate, Oberflächentechnik und Profilinhalte waren bereits am 28.08.2026 entschieden und in `docs/projekt/umsetzungsplan-fassung-1.md` Abschnitt 0 festgehalten, aber nie nach §15 dieser Ziel-Fassung zurückgespiegelt worden. Kein neuer inhaltlicher Entscheid — reine Bookkeeping-Korrektur, analog zum A1-Nachtrag vom 24.08.2026.

---

## 0. Geltung und Autorität

Führende Sollquelle für Zielbild, Rollen, Lifecycle, Sicherheits- und Evidenzmodell, Architektur-Baseline und Fassung-1-Umfang.

Autoritätsreihenfolge: **1.** wirksame Artefakte des **Arbeitsbaums** (E-181, 123) · **2.** diese Ziel-Fassung · **3.** Register 001–176 plus E-177…E-190 · **4.** `06_AUSGANGSPLAN` (historisch, nicht als Sollquelle verwenden).

Änderungen nur über eine neue Stefan-Entscheidung mit Nummer. Evidenz-Marker gelten durchgehend.

---

## 1. Zielbild

Lokale Orchestrierungsanwendung, die ein Vorhaben von der Idee bis zum abgenommenen Ergebnis durch klar getrennte KI-Positionen führt. Stefan ist Vorarbeiter und einzige Entscheidungsinstanz.

Domänen langfristig: Software/App, API, Web3, Data Science/ML, KI-Video, Automatisierung. Kern domänenunabhängig, Prüfmittel in Profilen *(3)*. Profile konfigurieren Gates, DoD, Werkzeuge und Review-Regeln — sie injizieren **keine** neuen Rollen oder Zustände *(14)*.

Der Claude-Code-Harness ist die bestehende Ausführungs- und Governance-Basis. Die Workforce orchestriert ihn; sie ersetzt und dupliziert ihn nicht.

---

## 2. Nicht-Ziele

Mehrbenutzerbetrieb, Registrierung, Abrechnung, Hosting · direkte Modell-zu-Modell-Kommunikation ohne Artefakt · Prüfrolle ohne Dateizugriff · Eingriff in fremde Weboberflächen, inoffizielle Endpunkte, synthetische Tastenanschläge *(11)* · vollautomatische Umsetzung ohne Halt; Commit durch den Core *(142a)* · Profil ohne echtes Projekt *(44)* · Datenbank als führender Zustandsspeicher *(45)*.

---

## 3. Grundprinzipien

**P1 Durchsetzungsgrad** *(E-179)* — `ERZWUNGEN` oder `DEKLARIERT`. Nur `ERZWUNGEN` ist eine Sicherheitsaussage. Ohne Angabe gilt `DEKLARIERT`.

**P2 Herkunft von Autorisierungen** *(E-177, E-189)* — Autorisierungsartefakte entstehen ausschließlich aus direkter menschlicher Eingabe, und ihre Bezeugung muss gegen Erzeugung und Veränderung durch das Ausführungswerkzeug geschützt sein.

**P3 Evidenz statt Etikett** *(E-178)* — Ein Gate wirkt nur kalibriert. Ausdrücklich leere Gates sind neutral. Unkalibrierte Gates mit Prüfanspruch tragen keine Beweislast.

**P4 Prüfen ist eine Entscheidung** *(E-180)* — durchgeführt oder ausdrücklich begründet übersprungen; der Mensch entscheidet. Für die harte Fälligkeitsliste gilt keine Ausnahme.

**P5 Rang von Repo-Prosa** *(E-181, 54)* — Repo-Inhalte sind untrusted evidence: weder automatisch Befehl noch automatisch wahr. Führend sind die wirksamen Artefakte **des Arbeitsbaums**.

**P6 Beweispflicht** *(9, 57, 132)* — Evidenz-Marker, Belege mit Pfad und Bereich, Eskalationen decision-ready.

**P7 Interaktives Entscheidungsverfahren** *(76)* — Befund → Optionen → Empfehlung → Stefan entscheidet.

---

## 4. Rollenmodell

Fünf Verantwortungen *(172 neu)*; eine Position ist ein Paar aus Verantwortung und Gegenstand. Prompt-Contracts pro Verantwortung, parametrisiert nach Gegenstand *(75 neu)*.

| Verantwortung | Darf | Darf nicht | Durchsetzung |
|---|---|---|---|
| **Autor** | Spec, Architektur-Entwurf, TECH_PLAN, Handoff erzeugen | persistieren, freigeben, ausführen | `DEKLARIERT` |
| **Prüfer** | lesen, Findings mit Belegstelle, vierstufig urteilen | schreiben, integrieren, Befunde wegräumen *(68)* | `ERZWUNGEN` |
| **Ausführer** | Dateien im freigegebenen Pfad ändern, Gates laufen lassen | committen ohne Freigabe, externe Wirkung | `ERZWUNGEN` für den Git-Pfad, sonst `DEKLARIERT` |
| **Entscheider** (Stefan) | alles | — | — |
| **Begleiter** | beraten, durch manuelle Schritte führen | Projektwahrheit ändern, Geheimniswerte entgegennehmen | `DEKLARIERT` |

Gegenstände: Autor → Produktbasis · Architektur · technischer Plan · Handoff. Prüfer → Produktbasis · Architektur · Plan · Code · Nutzersicht.

**Vier Review-Urteile** *(6)*: `freigegeben` · `mit_hinweisen` · `nicht_freigegeben` · `blockiert`.

**Besetzung Fassung 1** *(13)*: Prüfer/Plan = `architecture-advisor` *(67)* · Prüfer/Code = `code-reviewer` · Prüfer/Nutzersicht = `qa` *(64)* · Ausführer = Claude Code. Keine Cross-Model-Unabhängigkeit behauptet *(5)*. Prüfer für Produktbasis und Architektur sind die einzige echte Rollen-Lücke.

**Nicht als Position:** Handoff *(15 neu, 40, 41)* · Helpdesk *(28/29 neu)* · Verdichter *(23, 156)*.

**Unabhängigkeit = frischer Kontext** *(27, 58)*. Technischer Kontext je Workstream frisch *(38)*.

---

## 5. Arbeitsstruktur und Workflow-Layer

### 5.1 Hierarchie *(85)*
`Vision/Ziel → Meilenstein → Deliverable → Feature → Workstream`

Deliverables mit eigenen Akzeptanzkriterien *(93)* · Features mit mehreren Workstreams *(90)* · `hard`/`soft`-Abhängigkeiten *(86)* · deterministisches Dependency-Gate *(87)* · Workforce empfiehlt Priorität, Stefan wählt *(71)* · Core bestimmt ausführbare Workstreams, Stefan entscheidet den Start *(108)* · Roadmap versioniert und evidenzbasiert aktualisierbar *(83)* · neue Ideen sind `BACKLOG_KANDIDAT`, planungsneutral *(98, 99)* · nur freigegebene `ARCHITECTURE_DRIVERS` wirken *(112)* · progressive Detaillierung bis `READY_FOR_TECH` *(111)*.

### 5.2 Vier Workflow-Layer *(147)*

| Layer | Inhalt | Exit-Gate *(78)* |
|---|---|---|
| **1 Produktgrundlage** | Vision, Ziel, Nicht-Ziele, Meilensteine, Deliverables, Features, Roadmap | frischer Challenge *(95)* + genau ein Final-Recheck *(116)* |
| **2 Technische Grundlage** | Architektur-Baseline, Drivers, Stack, Security-/Betriebsprinzipien, projektweite Gates/DoD | Architecture Council *(84)*, danach `HARNESS_SETUP` mit sechs Kriterien *(80 neu, 122)* |
| **3 Implementierung je Feature** | Feature wählen → `READY_FOR_TECH` *(89)* → Workstream-Schnitt genehmigt *(90)* → je Workstream TECH_PLAN *(39)* → Advisor → Handoff → Pre-Build-Halt → BAU | Pre-Build-Freigabe *(43, 136)* |
| **4 Qualität je Feature** | Post-Build-Review, Feature-Gesamtprüfung, lokaler Test | Feature-Gate *(91)*, Meilenstein-Gate *(92)* |

Technische Planung geteilt *(81)* · Layer 2 startet mit frischen Sitzungen *(96)* · Layer 1–2 einmalig, 3–4 je Feature *(82)* · Architektur-`REOPEN` nur bei belegter Notwendigkeit *(167)*, als versioniertes Delta *(168)* · Layer 2 konfiguriert den Projekt-Harness, ändert den Core-Harness nicht automatisch *(79)*.

### 5.3 Planungskorridor
TECH_PLAN → Advisor → ggf. eine Revision → Handoff → **harter Pre-Build-Halt** *(109)*. Recheck begrenzt *(69)*. TECH_PLAN und Handoff im selben frischen Kontext *(41)*.

---

## 6. Lifecycle und Zustände

**Getrennte Dimensionen** *(146)*, Projekt-Lifecycle separat *(147)*. Fachlicher Zustand und Betriebsstatus getrennt *(1)*.

**Workstream:** `TECH_PLAN → ADVISOR → HANDOFF → PRE_BUILD_HALT → BAU (mit Gate-Unterphase) → PRÜFUNG → ABNAHME → ABGESCHLOSSEN`. `ABNAHME` ist Aktivität, `ABGESCHLOSSEN` terminal *(7)*. Gate 1 → eine Korrekturrunde → Gate 2; zweites Rot eskaliert *(62, 8)*.

**Nebenlagen:** `BLOCKIERT` mit `blocker_id`, Grund, Evidenz, Auflösungsbedingung, Resume-Ziel *(169)* · `ABGEBROCHEN` terminal und objektbezogen *(53, 170)* · `human_action_required` + `wait_type` getrennt von der Arbeitslage *(171)*.

**Publikation** separat: `NICHT_GEPUSHT | PUSH_BEREIT | GEPUSHT | PUSH_BLOCKIERT` *(145)*.

**Projektabschluss** nach freigegebenem Zielzustand *(148)*, terminal, `REOPEN` impact-basiert *(149, 150)*.

**Zustandsgültigkeit:** State gilt erst bei vollständig persistiertem Artefakt; Neustart prüft Konsistenz *(60)*. Unterbrochener BAU wird nie automatisch neu gestartet *(61)*.

---

## 7. Executions, Pinning, Checkpoints

`Execution` = zusammengehörige Prüf-/Entscheidungskette. Jede pinnt Modelle, Prompt-Contracts, Schemas, Profil, **Harness-Verhalten des Arbeitsbaums** und Context-Base *(158, 123 neu)*.

Kein stiller Modell-Fallback *(159)* · Wiederaufnahme nur ab validem Checkpoint *(160)* · Checkpoint = validiertes Manifest mit Hashes und Gate-/Schema-Ergebnis *(161)* · Modellidentität `VERIFIED | OBSERVED | CONFIGURED | UNKNOWN` *(165)* · Environment-Manifest *(164)* · `request_id` single-use und idempotent *(2, 49, 52)* · wiederholbarer Lauf = reproduzierbarer Input *(37)*.

**Harness-Pinning:** Verhalten pinnen, nicht Prosa. Template zusätzlich als nur lesendes Remote; Upgrade und Rückfluss als gezielter Diff/Cherry-Pick, nie als Merge in `main` *(123 neu)*.

---

## 8. Artefakt- und Evidenzmodell

Lokaler Workspace ist Single Source of Truth *(73)*; Chats haben keine Projektwahrheit *(153)* · nur der Core persistiert kanonische Steuerungsartefakte *(106)* · Artefakte versioniert, keine Überschreibung *(65)*; versioniertes Artefakt führend, Harness-Pfade sind Projektion *(66)* · führende Quelle je Informationstyp *(102)*, artefaktübergreifend über Dokumentenpaare, `Stand dieser Fassung:` und `repo-audit` *(102 neu)*.

**Staleness** *(103 neu)*: Inputs mit Pfad, Version/Hash und zitiertem Bereich; geänderter zitierter Bereich → `STALE`, konservativ. Am `STALE`-Artefakt entscheidet der Mensch: neu erzeugen · Nachtrag · unverändert gültig *(104 neu)*.

**Plan-Drift** *(33)* deterministisch über die Planungsdateien; Workforce-State-Pfade ausgenommen *(36)*.

Context-Manifest statt Vollkopie *(59)* · Historie auditierbar, kein aktiver Kontext *(107)* · Rohlogs getrennt *(133)* · Schemaversionen historisch stabil *(162, 163)* · formale Normalisierung erlaubt, Erfinden nicht *(46)* · Secret-Gate vor Persistierung *(131)* · versioniertes Entscheidungsregister außerhalb von Chats *(101)*.

---

## 9. Sicherheits- und Freigabemodell

### 9.1 Grenzen mit Durchsetzungsgrad

Stand der Messung: 20.08.2026, Claude Code 2.1.237, Windows. Belege in `13_...`. Zeile 1 aktualisiert 24.08.2026 nach `59_...`; Merge-Zeile aufgeteilt nach `40_...` Abschnitt 2 (B1/Advisor B-02); Zeile 1 erneut aktualisiert 28.08.2026 nach Abschluss und unabhängiger Verifikation von Vertrag 5 (PR #12, `19a5d07`), neue Zeile für den Edit/Write-Schutz der Freigabedatei ergänzt — siehe Nachträge unter der Tabelle.

| Grenze | Träger | Grad | Messung |
|---|---|---|---|
| `git commit`/`push` nur mit frischer, vom Menschen angelegter Freigabe-Datei | `commit-guard.cjs` (Aufgabe 3+4, wiederhergestellt Vertrag 5) | **ERZWUNGEN** | **gemessen** — PR #12, Merge-Commit `19a5d07` (28.08.2026): Rot-Fall (`git commit` ohne Freigabedatei → verweigert) und Grün-Fall (frische, gültige Freigabedatei → durchgelassen, danach automatisch gelöscht, Commit `867d5ef`) real durchlaufen; zusätzlich gemessener Lade-/Smoke-Test auf der realen Zielmaschine (`node v24.16.0`). Historischer Wortlaut vor B6-Entfernung git-verifiziert (`git show f8d11f6^:...`), keine Abweichung. Geerbte, bewusst nicht behobene Grenzen: Pfadbildung über `eingabe.cwd || process.cwd()`, TOCTOU-Fenster bei Einmalgebrauch (siehe `state/assumption-ledger.md`) |
| Edit/Write auf `state/freigabe-commit.md` gesperrt | `guard-settings.js` (neuer Eintrag, Vertrag 5) | **ERZWUNGEN** | **gemessen** — Schreibversuch per Write-Werkzeug auf die Freigabedatei verweigert; Regressionsnachweis, dass der bestehende Schutz für `.claude/settings.json` unverändert bleibt. Schließt eine Lücke, die schon vor B6 im Ursprungsdesign bestand (Datei war zuvor nur gegen Bash geschützt, nicht gegen das Editier-Werkzeug) |
| Bash-Zugriff auf `.claude/settings.json` gesperrt | `commit-guard.js` | **ERZWUNGEN** | **gemessen** |
| Schreibzugriff außerhalb des Arbeitsverzeichnisses | Werkzeugplattform | **ERZWUNGEN** | **gemessen** — trägt E-189 |
| Werkzeugsatz und Berechtigungsquellen je Aufruf | `--tools`, `--setting-sources`, `--disallowedTools` | **ERZWUNGEN** | **gemessen** |
| Prüfer haben keine Schreibrechte | `tools:`-Frontmatter | **ERZWUNGEN** | nicht gemessen, plattformseitig |
| Edit/Write auf geteilte Konfigurationsdateien | `guard-settings.js` | **ERZWUNGEN** | nicht direkt ausgelöst |
| Manuelle Compaction ohne frischen Zwischenstand | `zwischenstand-pruefen.js` | **ERZWUNGEN**, nur `trigger: manual` | nicht gemessen |
| Kalibrierte Gates | `check-docs.mjs` Prüfung 1, 2 | **ERZWUNGEN** | im Repo kalibriert |
| Direkter `git push` auf `main` ohne grünen Status-Check | Branch Protection | offen | tarifabhängig |
| Merge auf `main` über den `gh`-CLI-Pfad (`gh pr merge`) ohne grünen Status-Check | Branch Protection (Abdeckung ungeprüft) | **offen, ungegatet** | `[offene Unsicherheit]` Befund B1 (`36_...`) als „hoch" bewertet; adressiert durch Vertrag 1 „Aufgabe 4" (`harness-b1b3-merge-guard-und-git-flow`) — laut `57_.../58_...` auf `main` **nicht fertiggestellt, nicht gemergt** (nur der Vertragstext, PR #5). Zustand real offen |
| **Hook-Skripte selbst** | — | **DEKLARIERT** | `[Fakt]` `.claude/hooks/*.js` liegen in Schreibreichweite des Werkzeugs. Abgefangen durch E-188 in der präzisierten Fassung; **Harness-Kandidat 8** |
| MCP-Werkzeuge im Ausführungslauf | — | **DEKLARIERT** | `--tools` begrenzt sie nicht → E-187 |
| Capability-Modell nach Wirkung *(135)* | — | **DEKLARIERT** | Werkzeugnamen statt Wirkungen; `Bash(...)` deckt `PowerShell` nicht |
| Secret-Ausschluss aus Modellkontext *(35)* | `.claudeignore` nach Ergänzung | **DEKLARIERT** | — |
| „Core-Harness wird nicht still verändert" *(79)* | — | **DEKLARIERT** | — |

Was `DEKLARIERT` ist, wird nicht „gesperrt" genannt.

`[Fakt]` **Nachtrag 24.08.2026 (`59_...`):** Rückstufung von Zeile 1 auf `ERZWUNGEN` erst zulässig, wenn Vertrag 5 einen gemessenen Rot-/Grün-Fall **inklusive Lade-/Smoke-Test des Hook-Skripts unter der Ziel-Laufzeitkonfiguration** liefert (nicht nur „Freigabedatei fehlt → Commit blockiert"). Grund: B6 zeigte, dass ein als `ERZWUNGEN` behaupteter Hook unbemerkt nicht laden kann.

`[Fakt]` **Nachtrag 24.08.2026 (`40_...`, B1/Advisor B-02):** Die vormals einzeilige Aussage „Merge auf `main` ohne grünen Status-Check | offen | tarifabhängig" deckte den `gh`-CLI-Merge-Pfad nicht sichtbar ab. Aufgeteilt in direkten `git push` (weiterhin tarifabhängig offen) und `gh pr merge` (eigenständig offen und ungegatet, bis Vertrag 1 „Aufgabe 4" fertiggestellt und gemergt ist).

`[Fakt]` **Nachtrag 28.08.2026:** Vertrag 5 (`harness-freigabedatei-wiederherstellung`) abgeschlossen — PR #12, Merge-Commit `19a5d07`, unabhängig gegen den realen Repo-Stand verifiziert (Diff-Inhalt, Commit-Objekte im Objekt-Store, GitHub-Actions-API für den CI-Lauf). Zeile 1 damit auf `ERZWUNGEN` zurückgestuft, wie in der Nachtrag-Bedingung vom 24.08.2026 verlangt: gemessener Rot-/Grün-Fall inklusive Lade-/Smoke-Test auf der realen Zielmaschine liegt vor. Zusätzlich zur ursprünglichen Mindestauflage: Advisor-Pass (`.claude/skills/advisor-pass/SKILL.md`) vor Ausführung durchlaufen, Urteil „Freigegeben mit Hinweisen"; ein während der Planung gefundener Seitenkanal (Freigabedatei war nur gegen Bash geschützt, nicht gegen das Edit/Write-Werkzeug) wurde als Erweiterung mit umgesetzt (siehe neue Zeile oben). Geerbte, bewusst nicht behobene Grenzen (Pfadbildung über `cwd`, TOCTOU-Fenster) bleiben offen — dokumentiert, nicht Teil dieses Vertrags.

### 9.2 Freigabekette

1. **Pre-Build-Freigabe** *(43, 136 neu)* — versionsgebunden für Workstream, TECH_PLAN/Handoff, Base-Revision und **effektiven** Permission-Stand. Relevante Änderung macht sie `STALE`.
2. **Working-Tree-Bedingung** *(139)* — frei von unzugeordneten Änderungen; Workforce-State ausgenommen.
3. **Lokale Abnahme** *(47, 48, 137)* — `angenommen | anpassung_noetig | abgebrochen`, gebunden an Change-Set, Hashes, Gates, Review, Risiken. Ursachenklassifikation durch Stefan *(50)*.
4. **`LOKAL_FINALISIEREN`** *(142a korrigiert)* — manifestgebundene Entscheidung, autorisiert **Produkt-Commit und Metadaten-Commit**.
5. **Push-Freigabe** *(138, 143, 144)* — eigene Entscheidung, gebunden an den erwarteten **Head des Arbeitsbranches** *(B3, `40_...`)*; Leseweg `git ls-remote origin <branch>`, nicht `main`. Divergenz hält an; kein automatischer Merge, Rebase oder Force-Push.
6. **Ausführungsbestätigung je Git-Vorgang** — jeder der drei Vorgänge verlangt zusätzlich eine eigene, vom Menschen im Editor angelegte Freigabe-Datei. Der Core erzeugt sie nie. `[Fakt, Nachtrag 28.08.2026]` **Mechanismus im Harness vorhanden — Vertrag 5 abgeschlossen, PR #12, Merge-Commit `19a5d07`.** Der Harness-Mechanismus deckt bislang `git commit`/`push` generisch ab (Aufgabe 3 aus `commit-guard.cjs`); ob das die hier gemeinten drei getrennten Workforce-Git-Vorgänge (Produkt-Commit, Metadaten-Commit, Push) im vollen Sinn dieses Abschnitts abbildet, ist beim Bau der Workforce gegen das dann reale Aufrufmuster zu prüfen, nicht hier unterstellt.

**Verbrauchter Schlüssel:** Ist eine Freigabe-Datei verbraucht, ohne dass der Vorgang stattfand, bleibt die zugehörige Kern-Entscheidung gültig, solange ihre Bindung gilt — das Manifest für die Commits, der Remote-Head für den Push. Der Core zeigt den Grund, verlangt eine ausdrückliche Bestätigung des Wiederholungsversuchs und wartet auf eine neue Datei. Eine neue fachliche Abnahme eines unveränderten Ergebnisses ist nicht erforderlich. Hat sich der Remote-Head bewegt, ist die Push-Entscheidung `STALE`. `[Fakt, Nachtrag 28.08.2026]` Mechanismus im Harness vorhanden — siehe Nachtrag zu Punkt 6 oben.

Getrennte Pfade, **kein `git add .`** *(42)* · Commit stagt nur das Acceptance-Manifest *(140)* · Produkt- und Metadaten-Commits getrennt, Rohlogs in keinem *(141, E-190)*.
Das Anlegen der Freigabe-Datei ist die Freigabe selbst, keine Transportaktion *(110)*.

### 9.3 Ausführung
Core liest Produktpfade read-only *(32)* · Produktdateien ändert nur Claude Code im freigegebenen Pfad · Secrets nie in Kontext oder Logs *(35)* · manuelle Schritte deterministisch verifiziert, sonst `human_attestation` *(152)*.

### 9.4 Ausführungsvertrag mit Claude Code

**E-182** — Der Core ruft nie in einer Form auf, die eine Schutzschicht abwählt: kein `--bare`, `--safe-mode`, `--dangerously-skip-permissions`, `--allow-dangerously-skip-permissions`, `--permission-mode bypassPermissions`, `--fallback-model` *(159)*. Der Aufruf wird je Execution protokolliert und gepinnt.

**E-183** *(präzisiert)* — Vor jeder Execution mit Schreibwirkung prüft der Core **lokal**: Ist die Werkzeugkonfiguration gültig, und existiert jedes von ihr referenzierte Schutzskript mit dem erwarteten Hash? Scheitert eine der beiden Prüfungen, startet keine Execution.

**E-184** — Ein Lauf gilt nur als erfolgreich, wenn `permission_denials[]` leer ist. `is_error` allein ist kein Erfolgssignal. `non_execution_kind` unterscheidet die Verweigerungsart.

**E-185** — `--model` je Execution explizit setzen. Modellidentität aus der Laufausgabe hat Rang `OBSERVED`.

**E-186** — Verweigerung mit Umgehungsparameter im `tool_input` wird eskaliert und getrennt gezählt.

**E-187** — Werkzeugsatz über `--tools` **und** MCP-Konfiguration begrenzen.

**E-188** *(präzisiert)* — Die Wirksamkeit der Schutzschichten wird gegen einen bekannten Rot-Fall nachgewiesen, nicht aus ihrer Existenz gefolgert. Der Nachweis gilt für einen **Gültigkeitsschlüssel** aus mindestens: Hash der Werkzeugkonfiguration, **Hashes der referenzierten Schutzskripte**, Version des Ausführungswerkzeugs, Berechtigungskontext des Aufrufs, Pfad des Arbeitsverzeichnisses. Ändert sich ein Bestandteil, wird erneut geprüft.

**E-189** — Der Execution Controller akzeptiert eine Autorisierung nur, wenn ihre Bezeugung nachweislich gegen Erzeugung und Veränderung durch das Ausführungswerkzeug geschützt ist. Eine im Produkt-Repository sichtbare Kopie oder Referenz ist niemals alleinige Autoritätsquelle.

**E-190** — Ein Werkzeuglauf erzeugt zwei getrennte Ablagen. Die **kanonische Laufakte** trägt ausschließlich, was Zustand, Freigabe oder Qualitätsdaten verbraucht, und ist Teil des Metadaten-Commits. Der **Rohereignisstrom** dient Audit und Diagnose, wird nicht committet und ist aus der Laufakte über seinen Hash referenziert. Kein Modellkontext wird aus dem Rohstrom gebildet *(107, 133)*.

---

## 10. Gates und Qualität

**Gate-Objekt** *(62 neu)*: die Produkt-Prüfkette, nie die Harness-Selbstprüfung. Gate 1 liefert den vollständigen Befundstand über alle Glieder.
**Wirkung** *(P3)*: Auswertung pro Glied — kalibriert trägt Evidenz, ausdrücklich leer ist neutral, unkalibriert mit Prüfanspruch trägt nichts.
**Gate-Umfang** *(44)*: ein Mechanismus für ein Profil; Abstraktion erst mit dem zweiten.
**Findings** *(18, 22 neu, 9)*: nur bestätigte und relevante zählen; Bestätigung durch Mensch, **kalibriertes** Gate/Test oder reproduzierbaren Fehlerbeleg.
**Severity/Blocking** *(117)*, **`FIXED`/`RISK_ACCEPTED`** *(118, 119)*, **Repair-Bündelung** *(120, 121)*, **Qualitätsdaten** nach Entdeckungsphase *(51, 19)*, absolute Qualität *(17)*, **`docs_impact`** *(100)*, **Prüfdurchläufe** *(P4)*.

---

## 11. Harness-Nutzung

**Unverändert wiederverwenden:** drei Prüf-Agents · sieben Skills, **davon `git-flow` mit Vorbehalt** — `[Fakt, Nachtrag 24.08.2026, B3/`40_...`]` erst ohne Vorbehalt „unverändert wiederverwenden", sobald die Merge-Guard-Korrektur aus Vertrag 1 „Aufgabe 4" (`harness-b1b3-merge-guard-und-git-flow`) gemergt ist — laut `58_...` Abschnitt 4 aktuell unkommittiert und real offen auf `main` · `commit-guard.cjs` — `[Fakt, Nachtrag 28.08.2026]` **wieder vier Aufgaben: Bash-Sperre auf `.claude/settings.json`, `gh`-Merge-Pfad-Sperre, Freigabedatei-Pflicht für `git commit`/`push` und Bash-Sperre auf die Freigabedatei selbst — Vertrag 5 (PR #12, `19a5d07`) abgeschlossen. `guard-settings.js` zusätzlich neu mit Edit/Write-Sperre für die Freigabedatei** · Zwischenstand-Loop · `check-docs.mjs`, `check-rules.mjs`, `check-contract.mjs` · `state/gates.md`, `memory-map.md`, `triggers.md`, `tasks/` · Worktree-Mechanik.

**Projektbezogen konfigurieren:** die sechs `HARNESS_SETUP`-Kriterien *(80 neu)* · `.env`/`.env.local` in `.claudeignore` · Baseline der Schutzskript-Hashes für E-183/E-188.

**Core ergänzt:** Prüfer für Produktbasis und Architektur · Bereichs-`STALE` · Wirkungssperre für unkalibrierte Gates · Setzen und Pinnen des Berechtigungskontexts · Beistellung des Ist-Zustands *(4 neu)* · Zustandsführung, Posteingang, Transport, Leitstand · den Ausführungsvertrag aus 9.4.

**Nicht bauen:** eigene Commit-/Push-Autorisierung · eigenes Gate-Register · eigene Prüfkette · eigenes Permission-System · zusätzlicher Advisor · Handoff-Schreiber als Position · Helpdesk als Objekt · Abhängigkeitsgraph, Impact-Klassifikation, Invalidierungspropagation · eigener Doku-Konsistenzprüfer · eigenes Harness-Versionsverwaltungssystem.

**Lernen** *(124, 125, 126 neu, 55, 56)*: Reichweiten `project | profile | core_candidate | harness_candidate`; Promotion- und Removal-Reviews ohne Automatik. Erstes Dokumentenpaar: Changelog ↔ Learning-State.

**Werkzeuge** *(72, 88, 174)*: Discovery nur bei konkretem Problem, sonst `NOT_REQUIRED`; immer über `werkzeug-auswahl`, Ergebnis nach `state/tooling.md`, auch negativ.

**Harness-Kandidaten, gemeldet:** 1–5 aus Challenge 2 · **8: Die Schutzschichten decken Konfiguration und Freigabe-Datei ab, nicht die Hook-Skripte, die sie ausführen.** Ein Guard, dessen eigenes Skript beschreibbar ist, schützt sich nicht selbst. · **9 (neu, 20.08.2026): `main` bei `9189959` trägt in `state/` und `state/tasks/` rund 140 KB Artefakte des abgeschlossenen Harness-Fix-Programms (Phasen 0–2: neun Vertragsdateien, vier Plan-/Findings-Dateien, `reibung.md`).** `check-contract.mjs` prüft jede `.md` in `state/tasks/` auf das Sieben-Sektionen-Format und verarbeitet diese Fremdverträge mit; `check-docs.mjs` Prüfung 3 prüft rekursiv über `state/**` und schließt ihre `Stand dieser Fassung:`-Marker in den Staleness-Vergleich ein. Beide gehören nicht zu einem ableitenden Projekt. Gefunden im Advisor-Pass zu `HARNESS_SETUP`, Plan v2, AP 0. Kein Fix am Template in dieser Meldung — nur Registrierung; Umsetzung nur als gezielter Diff/Cherry-Pick nach Abschnitt 7, als eigene, spätere Entscheidung.

---

## 12. Betrieb und Transport

Abo-basiert, keine API-Schlüssel *(30)* · Transport minimal *(10, 31)* · Automation und Transportaktion getrennt *(110)* · Nachrichtenvertrag an der Systemgrenze *(21)* · rollenbezogene Context Views *(113)* · deterministischer Mindestkontext *(26, 34)* · Nachforderungen begründet und begrenzt *(114)* · Evidenz vor Budget *(115)* · Session-Handoff schema-geprüft *(155, 156)*, Persistenz je Position *(154)*, Lineage *(74)* · Preflight prüft und führt *(77, 173)* · Learning kontextabhängig *(94)*.

**Kontingent** *(12)*: Die Laufausgabe liefert Fenstertyp (`five_hour`, `seven_day`), `resetsAt`, `utilization`, `status` und Warnschwelle. Anzeige ausschließlich daraus; keine eigene Schätzung. Rang `OBSERVED`.

---

## 13. Fassung 1

### 13.1 Bestehensbedingung
Vollständig belegter End-to-End-Durchlauf über alle vier Layer *(97, 127)*, alle notwendigen Workstreams abgeschlossen *(128)*, jeder Passtyp mindestens einmal *(P4)*, genau ein aktiver Workstream *(25)*.
Mechanik-Gate und Baseline-Vergleich strikt getrennt *(130)*; Baseline misst Prozessreibung *(129, 166)*. Bewiesen wird die Mechanik, nicht Qualitätsüberlegenheit *(16, 24)*.

**Referenzfeature:** Belegschaftskonfiguration an der AI Workforce selbst — welche Position mit welchem Modell und welcher Version besetzt wird, als Konfiguration statt als Code, geladen, validiert, je Execution gepinnt und protokolliert. Begründung und Alternativen in der Chat-Vorlage vom 20.08.2026.

### 13.2 Nicht in Fassung 1
Mehrbenutzerbetrieb, Hosting, Abrechnung · Provider-Adapter *(13)* · parallele Workstreams *(25)* · autonome produktive/externe/irreversible Aktionen *(63)* · vollautomatische Rechnerinstallation *(173)* · Cross-Project-Lernsystem *(126)* · Analytics-Dashboard *(19)* · automatisches Werkzeug-Sammeln *(174)* · Browser-/UI-Fernsteuerung *(11)* · generische Gates vor dem zweiten Profil *(44)* · vorsorgliche Architektur für Backlog-Kandidaten *(99, 112)* · alles aus Abschnitt 11 „Nicht bauen".

**Fassung-2-Kandidaten:**
- **Core als Halter der Git-Freigabe.** `[Fakt, Nachtrag 24.08.2026]` Bleibt Fassung-2-Kandidat — keine volle Core-Eigentümerschaft über `git commit`/`push` in Fassung 1 (kollidiert potenziell mit D3, keine gemessene Baseline für diesen größeren Umbau). Die ursprüngliche Begründung „der Guard ist gemessen wirksam" ist falsifiziert (B6: neun Commits ungeschützt; Freigabedatei-Pflicht seit 23.08.2026 ersatzlos aus dem Harness entfernt) und entfällt ersatzlos. **Für Fassung 1 umgesetzt:** kleinerer Ersatzmechanismus über Vertrag 5 (Wiederherstellung der Freigabedatei-Pflicht im Harness, inklusive Lade-/Smoke-Test-Nachweis, zusätzlich Edit/Write-Schutz der Freigabedatei) — Entscheidung `59_...`, Umsetzung `41_...`, abgeschlossen und unabhängig verifiziert: PR #12, Merge-Commit `19a5d07`, 28.08.2026. Volle Core-Eigentümerschaft über `git commit`/`push` bleibt Fassung-2-Kandidat.
- **Core-kontrollierte Ausführungsumgebung.** Wiedervorlage bei belegtem Vorfall mit Schreibwirkung außerhalb des Zielverzeichnisses.
- **Sicherung des Bezeugungsbereichs.** Die Decision-Ablage außerhalb des Produkt-Repositoriums braucht eine eigene Sicherung; ihr Verlust blockiert alles.

---

## 14. Technische Beweise

`TECHNICAL_PROOF` *(20, 176)* für **TP-01, TP-03, TP-05, TP-07 abgeschlossen und bestätigt** (`13_...`). `[Fakt, Nachtrag 22.08.2026, `40_...`, B2/B4/B5]` Ehrlicher gefasst: **TP-07 vollständig, TP-01/03/05 nur teilweise belegt.**
Offen: **TP-11** (gliedweise Auswertbarkeit der Prüfkette) — gehört zu `HARNESS_SETUP`. **TP-12** für die aktuelle Umgebung unkritisch. **TP-13** (pfadgranulare Werkzeugbeschränkung) — durch die Entscheidung zu E-189 **vom kritischen Pfad genommen**; bleibt Verbesserung, nicht Voraussetzung.
`[Fakt, Nachtrag 28.08.2026]` Die Bash-Pfadsperre für die Git-Freigabe-Datei ist jetzt gemessen (Vertrag 5, PR #12, Merge-Commit `19a5d07`) — kein offener Punkt mehr an dieser Stelle.

**Randbedingung für die Stackwahl:** Der gepinnte Harness verpflichtet die Zielmaschine auf eine Node-Laufzeit für fünf Hooks.

---

## 15. Was diese Fassung nicht entscheidet

Ein ChatGPT-Chat pro Position oder pro Projekt · Zeitbudget.

`[Fakt, Nachtrag 24.08.2026, A1]` **Technischer Stack, Programmiersprache und Testwerkzeug sind entschieden** — siehe §16.1. Nicht mehr Teil dieser offenen Liste.

`[Fakt, Nachtrag 28.08.2026]` **Datenformate, Oberflächentechnik und Profilinhalte sind entschieden** — festgehalten in `docs/projekt/umsetzungsplan-fassung-1.md` Abschnitt 0, in derselben Planungssitzung am 28.08.2026 entschieden wie der Umsetzungsplan selbst: `kontrollzustand/` als JSON/JSONL mit gepinnter Profil-Referenz, `profiles/` als JSON (Datenformate) · Leitstand als lokale Web-Oberfläche statt CLI/Terminal (Oberflächentechnik) · Ein-Ebenen-Modell, jedes Projekt eine vollständige eigenständige Profildatei, kein Domänen-Profil mit Projekt-Overlay (Profilinhalte). Nicht mehr Teil dieser offenen Liste.

Die **Architektur-Baseline ist entschieden** und steht in Abschnitt 16, jetzt einschließlich der Architekturbefunde A1–A9 (`claude/40_ARCHITEKTUR_A1_A9.md`, „Freigegeben mit Hinweisen", gegen den realen Harness geprüft).

---

## 16. Architektur-Baseline

Verbindlich. Ausführliche Fassung: Draft B (Architektur-Council, 20.08.2026) mit den vier Entscheidungen aus dem Abschluss des Final-Reviews, ergänzt um A1–A9 (`40_...`). Bei Widerspruch gilt dieser Abschnitt.

### 16.1 Architecture Drivers — sechzehn, verbindlich *(112)*

**D1** Dateien und Git sind der führende Zustand; eine Datenbank nur als wegwerfbarer Index.
**D2** Jeder Zustand überlebt einen Absturz: vollständige Persistierung vor Gültigkeit, Startvalidierung, Wiederaufnahme nur ab validiertem Checkpoint, kein automatischer Restart unterbrochener Bauläufe.
**D3** *(korrigiert)* Der Kern ruft auf, er führt nicht aus. **Produktdateien** ändert ausschließlich das Ausführungswerkzeug im freigegebenen Baupfad. Seinen **eigenen Kontrollzustand** persistiert der Kern selbst, auf getrennten Pfaden im selben Repository.
**D4** Autorisierungen haben genau eine Quelle: den Menschen. Strukturanforderung, keine Konvention.
**D5** Der Berechtigungskontext wird je Aufruf gesetzt, nicht geerbt.
**D6** Verweigerung ist ein eigener Ergebnistyp: erfolgreich · verweigert · fehlgeschlagen.
**D7** Node-Laufzeit auf der Zielmaschine, unabhängig von der Sprache der Anwendung.
**D8** Windows mit PowerShell: Pfadtrennung, Zeilenenden und unterschiedliche Werkzeugnamen sind Architekturthemen.
**D9** Beobachtbarkeit ausschließlich aus strukturierter Laufausgabe.
**D10** Evidenz schlägt Fortschritt; Blockieren ist ein normaler Ausgang.
**D11** Der Mensch ist der Transportweg; kein Zeitverhalten baut auf schnelle Antworten.
**D12** Die knappe Ressource ist Kontingent, nicht Geld.
**D13** Genau ein aktiver Arbeitsstrang; keine Sperren, kein paralleler Zustand.
**D14** Domänenunabhängiger Kern, Prüfmittel im Profil; Naht sichtbar, nicht abstrahiert.
**D15** Artefakte versioniert, Inputs mit Pfad, Version/Hash und zitiertem Bereich.
**D16** Autorisierungsartefakte liegen außerhalb der Schreibreichweite des Ausführungswerkzeugs.

**Bewusste Nicht-Anforderungen:** Mehrbenutzerbetrieb, Rechteverwaltung, Hosting, Abrechnung · Nebenläufigkeit und Skalierung · Hochverfügbarkeit · Antwortzeit als Qualitätsmerkmal · Austauschbarkeit der Modellanbieter · Portabilität auf andere Betriebssysteme · Erweiterbarkeit durch Dritte · Datenmigration.

**Technischer Stack** *(A1, entschieden 22.08.2026, `40_...`, gegen realen Harness `ai-workforce@3179fe0` geprüft, „Freigegeben mit Hinweisen"):* TypeScript auf Node 24, strip-only (kein Build-Schritt), Biome + `tsc` + `node:test`. Als Randbedingung dokumentiert, ADR nach `docs/adr/TEMPLATE.md` vorgesehen. Auflage erfüllt: Prüfung gegen §16.2. Auflage offen: Ausweitung des Prüfketten-Umfangs (`npm run check`) vom Harness-Pfad `scripts/` auf den Produktpfad `src/` — Vertrag 4 (`41_...`), Text steht, Ausführung ausstehend.

### 16.2 Modulschnitt

| Modul | Verantwortung | Tut nicht |
|---|---|---|
| **Execution Controller** | besitzt **zwei** Automaten — Workstream-Ebene und Execution-Ebene *(A4)* — prüft Übergänge, veranlasst Checkpoints | keine Produktänderung, keine Shell-Aktion, keine Prosa als Übergang |
| **Checkpoint Store** | persistiert zwei Artefakttypen in einer gemeinsamen, append-only Hash-Kette im Arbeitsbaum: `Checkpoint` je Execution-Übergang und `Wirkungsmarke` vor/nach jedem Lauf; kein Commit pro Übergang *(A2, A5)* | keine Produktdateien, keine Bewertung, keine Autorisierung |
| **Artifact Registry / Lineage** | Identität, Version, Herkunft, Input-Beziehungen; Veraltungsprüfung. Identitätsregel nach Eigentümerschaft *(A7)*: kern-erzeugt = Kontrollartefakt mit eigener Identität; werkzeug-erzeugt = Referenz (Pfad, Inhalts-Hash, zitierter Bereich, später Git-Blob-Id) | keine fachliche Relevanzbewertung |
| **Authorization Boundary** | eigener Eingang für menschliche Entscheidungen; hält beide Schlüsselarten auseinander | keine Deutung von Modelltext als Freigabe; erzeugt nie die Git-Freigabe-Datei |
| **Context Builder** | begrenztes Kontextpaket je Auftrag, mit Herkunftsreferenzen | keine Zustandsentscheidung |
| **Invocation Policy / Protection Validator** | Startfreigabe: Berechtigungskontext materialisieren, beide Startbedingungen erzwingen | keine Schutzschicht abschalten, kein Modellwechsel |
| **Claude-Code-Gateway** | einzige Komponente, die Werkzeugprozesse startet; behandelt Pfade, Shell-Semantik, Werkzeugnamen, Zeilenenden | keine fachliche Bewertung, keine Fließtextdeutung |
| **Result Evaluator** | klassifiziert Läufe ausschließlich aus Ergebnishülle und Ereignisstrom | keine Ableitung aus Konsolentext |
| **Human Transport** | Transportpakete erzeugen, Antworten als untrusted Input übernehmen und schemaprüfen | keine Browserautomatisierung |
| **Leitstand** | Projektion des persistierten Zustands | keine eigene Wahrheit, keine versteckten Übergänge |

### 16.3 Zustandsablage

- **Kontrollzustand im Produkt-Repository**, auf eigenen Pfaden unterhalb des Projektverzeichnisses *(A3)*: `src/` Kern-Code · `kontrollzustand/` Kontrollzustand als JSON/JSONL — Checkpoints, Artefakte, Lineage, Transportpakete, Profilkonfiguration, wegwerfbarer Index · `profiles/` Profilkonfiguration. `state/` bleibt Harness-Gedächtnis, kein Kontrollzustand der Workforce. Kontrollzustand ist **nicht pro Übergang committet**, sondern Momentaufnahme im Metadaten-Commit *(A2)*.
- **Bezeugungen menschlicher Freigaben außerhalb des Produkt-Repositoriums**, in einem eigenen Git-Repository des Kerns. Der Checkpoint trägt Referenz und Hash; der Controller validiert gegen den geschützten Ort, nie gegen die Referenz allein *(E-189, D16)*.
- **Rohereignisströme gitignoriert**, referenziert aus der Laufakte über ihren Hash *(E-190)*. Die Gitignore-Auflage ist zwingend: Andernfalls meldet die Working-Tree-Prüfung aus 139 sie als unzugeordnete Änderung und blockiert jeden Baulauf.
- Pauschales Stagen des Arbeitsbaums ist in allen Git-Schritten ausgeschlossen.

### 16.4 Startbedingungen des schreibenden Pfades

Zwei getrennte Bedingungen, beide lokal, beide ohne Werkzeugaufruf:
1. Konfiguration gültig **und** jedes referenzierte Schutzskript existiert mit erwartetem Hash *(E-183)*.
2. Gültiger Wirksamkeitsnachweis für den Gültigkeitsschlüssel *(E-188)*.

Scheitert eine, startet kein Lauf. Erst danach `RUN_PREPARED`-**Wirkungsmarke** *(A5 — `RUN_PREPARED` ist eine Wirkungsmarke, kein Checkpoint)*, dann Werkzeugstart.

### 16.5 Laufergebnis

Drei terminale Ausgänge *(D6)*. Klassifikationsreihenfolge: **ungültige Beobachtungsbasis → FEHLGESCHLAGEN; gültige Verweigerung → VERWEIGERT; sonst bei erfüllten Erfolgskriterien → ERFOLGREICH.** Ein allgemeines Erfolgsflag überstimmt nie eine konkrete Verweigerung.

Laufakte und Rohstrom getrennt *(E-190)*.

### 16.6 Wiederaufnahme

`RUN_PREPARED` (**Wirkungsmarke**, nicht Checkpoint — *A5*) ohne validiertes terminales Laufartefakt → kein neuer Lauf, blockierter Klärzustand, menschliche Entscheidung, danach neuer Lauf mit **eigener Identität** *(61, 160)*.

### 16.7 Naht Kern/Profil

Der Kern besitzt Lebenszyklus, Positionen, Übergangslogik, Autorisierungsgrenze und die drei Laufausgänge. Das Profil liefert **Auswahl, Schwellwerte und Zuordnung** vorhandener Prüfmittel an festen Prüfstellen — es dupliziert keine Prüfmittel und erzeugt weder Rollen noch Zustände *(14, 44, 102)*. Kein Plugin- oder Erweiterungsmodell in Fassung 1.

### 16.8 Offene Punkte der Baseline

Aus Draft B und dem Final-Review, für die technische Planung:

1. Identität eines Artefakts — was eigenständiges Kontrollartefakt ist und was Referenz auf ein Produktartefakt. **Geschlossen (A7):** Eigentümerschaft entscheidet — kern-erzeugt = Kontrollartefakt mit eigener Identität, werkzeug-erzeugt = Referenz (Pfad, Inhalts-Hash, zitierter Bereich, später Git-Blob-Id).
2. Checkpoint-Granularität — je Zustandsübergang oder zusätzlich vor und nach jedem externen Seiteneffekt. Für D2 spricht Letzteres. **Geschlossen (A5):** Zwei Artefakttypen — `Checkpoint` je Execution-Übergang, `Wirkungsmarke` vor und nach jedem Lauf, nie Wiederaufnahmepunkt; beide in derselben Hash-Kette.
3. Der konkrete bekannte Rot-Fall der Wirksamkeitsprüfung. *(Weiterhin offen — an die Kalibrierungen aus Vertrag 1 und Vertrag 2 gebunden.)*
4. Welche zwei unabhängigen Mechanismen den Werkzeugsatz begrenzen *(E-187)*. *(Weiterhin offen — an Vertrag 2, Messfall 3 gebunden.)*
5. Erkennung eines nach Absturz möglicherweise noch laufenden Werkzeugprozesses. *(Weiterhin offen — an Vertrag 3 gebunden.)*
6. Positionen und fachliche Hauptzustände der ersten Execution-Kette. **Geschlossen (A4):** Drei Zustandsebenen — Workstream → Execution → Lauf. Execution = eine Position an einem Gegenstand, die Pinning-Einheit. Controller besitzt Workstream- und Execution-Automat, Gateway den Lauf.
7. Versionierungssemantik des Kontrollbereichs — wann welcher Versionsstand entsteht. **Geschlossen (A8):** Inhaltsadressiert, kein mutierbarer Zeiger. Version = Inhalts-Hash; der letzte Checkpoint ist die einzige Stelle, die den aktuellen Stand benennt. Pfade dürfen Artefakttyp und Execution-Identität im Klartext tragen.
8. Repräsentation des Gültigkeitsschlüssels und Normalisierung des Arbeitsverzeichnispfads. *(Weiterhin offen — Vertrag 5 hat die geerbte `cwd`-Abhängigkeit im commit-guard sichtbar gemacht und in `state/assumption-ledger.md` dokumentiert, aber ausdrücklich nicht behoben; bestätigt weiterhin offen.)*
9. **Zeilenenden** — Verantwortung dafür ist noch keiner Systemgrenze zugeordnet *(D8)*. **Geschlossen (A9):** Keine Normalisierung; der Hash beschreibt die Bytes auf der Platte. Kern schreibt ausnahmslos LF; `eol=lf` wird in Vertrag 2 kalibriert; Git-Blob-Id beim Metadaten-Commit.

`[Fakt]` Fünf von neun Punkten (1, 2, 6, 7, 9) sind mit A1–A9 geschlossen. Vier bleiben an noch nicht ausgeführte Verträge gebunden (3, 4, 5, 8).

---

## 17. Herkunftsabgleich

**Ersetzt:** 70 → 146/147 · 151 → 171 · 157 → 158 · 23 → 156 · 142 → 142a *(zweimal korrigiert: zuerst drei Vorgänge unter einer Freigabe, dann getrennte Push-Freigabe nach 138/143)*.
**Gestrichen:** 105.
**Aufgegangen ohne eigene Zeile:** 20 · 27 · 39 · 40 · 58 · 81 · 96 · 111 · 5.
**Neu:** E-177 bis E-181 *(Grundprinzipien)* · E-182 bis E-190 *(Ausführungsvertrag, 9.4)* · D1 bis D16 *(Architecture Drivers, 16.1)* · A1 bis A9 *(Architekturphase, `40_...`, in Abschnitt 16 eingearbeitet)*.
**Prozessentscheidung außerhalb der Sollquelle:** 175 — erfüllt.

`[Fakt]` Jede der 176 Entscheidungen hat eine Fundstelle, einen Ersatz oder ist gestrichen. Verwaiste Entscheidungen: keine.
