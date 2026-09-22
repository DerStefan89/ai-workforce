# Lagebild — abgeleitete Datei, NICHT von Hand ändern

Erzeugt von `scripts/erzeuge-lagebild.mjs` aus `docs/STATUS.md`
(Abschnitt "Aktuelle Phase") und `state/findings.md` (offene P1-Findings,
ID + Titel). Neu erzeugen statt bearbeiten: `node
scripts/erzeuge-lagebild.mjs`.

Findings-Liste deckt nur `state/findings.md` ab — neuere Findings können
fehlen, wenn diese Datei seit deren Eintragung nicht neu erzeugt wurde.

## Aktuelle Phase

Ebene 1 (Produktgrundlage) und Ebene 2 (Technische Grundlage) sind
abgeschlossen. Die Vertragsschiene (1, 2, Option B, 3, 4, 5) ist
abgeschlossen. Meilenstein 1 und Meilenstein 2 (Bedienbarer Leitstand,
`docs/projekt/zielfassung.md` §13.3) sind abgeschlossen (Stand
09.09.2026). Meilenstein 3 (Intelligente Orchestrierung,
`docs/projekt/zielfassung.md` §13.4) ist abgeschlossen (Stand 11.09.2026,
alle drei Sätze der Bestehensbedingung real erfüllt). F19 (Capability
Foundation), ein eigenständiges Bridge-Feature zwischen Meilenstein 3 und
4, ist `ABGESCHLOSSEN` (12.09.2026 real gebaut, 20.09.2026 formal per
E-M5-1 auf `ABGESCHLOSSEN` gesetzt — Restfinding F-346 bleibt offen,
M5-Backlog). Meilenstein 4 (Jarvis Workspace,
`docs/projekt/zielfassung.md` §13.5) gilt als geschlossen (20.09.2026,
E-M5-1, mit ausdrücklich benannten Übertragungen nach F30: Import-Wizard
F25 WS-2b, Health-Projektion F25 WS-3, Kollege-Durchlauf und ≥3 Tage
protokolliertes Dogfooding); F20–F27 sind umgesetzt (F24/F26/F27
`ABGESCHLOSSEN`, F22 `FEATURE_GATE`, F23 `ABGESCHLOSSEN` seit E-M5-1 —
Restfindings F-378/F-389/F-392 bleiben offen, M5-Backlog, F25
`FEATURE_GATE` mit offenem WS-2b/WS-3 → F30), F28/F29 `ABGESCHLOSSEN`,
F30 noch nicht begonnen, F31 `ABGESCHLOSSEN` (WS-1 #192, WS-2 #194, WS-3
#196, WS-3b #197, WS-3c #198). Das Projekt ist in Meilenstein 5
(`docs/projekt/zielfassung.md` §13.6; Zielsatz/Bestehensbedingung noch
offen, RC): F32 Verbrauch & Kontingent `IN_ARBEIT` (WS-1 Verbrauch-
Erfassung PR #200, `fc68d2d`; WS-2 UI-Ansicht im Leitstand noch nicht
begonnen, siehe `features/F32/feature.md`), F33 Projektkontext & Roadmap
`IN_ARBEIT` (WS-0 Spike + WS-1 Repo-Dateien + Context-Builder-Einspeisung,
`features/F33/feature.md`), F34–F39 noch nicht begonnen, F40 (Jarvis-
Latenz: Streaming + Lagebild) `ABGESCHLOSSEN` (alle vier Workstreams
gebaut und gemergt: WS-0 Spike #203, WS-1 Streaming-Reaktion auf die
result-Zeile #204, WS-2 Lagebild-Einspeisung #206, WS-3
Auto-Memory-Sperre für jarvis/router #207 — abgenommen durch Stefan am
22.09.2026, Restfindings F-581/F-583 bleiben offen, `features/F40/
feature.md`) (Stand 22.09.2026).

## Offene P1-Findings

- F-013 · PROCESS_IMPROVEMENT · Claude-Projekt-GitHub-Sync liefert keine Repo-Dateien in dieses Projekt.
- F-031 · PROCESS_IMPROVEMENT · Werkzeug-/Bedarfsauswahl (MCP, APIs, Agents, Tools, Skills) hat bereits einen manuellen Vorläufer im Harness — Feature direkt nach S3 einplanen.
- F-036 · PROCESS_IMPROVEMENT · Findings-Register war in zwei unabhängig fortgeschriebene Kopien gespalten (dieses Repo-Register vs. Claude-Projekt „AI Workforce").
- F-038 · HARNESS_IMPROVEMENT · `docs/harness/werkzeug-katalog.md` ist leer und nicht maschinenlesbar — harte Vorbedingung für jedes Automatisierungs-Feature der Werkzeugauswahl.
- F-051 · PROCESS_IMPROVEMENT · Umsetzungsplan-Tabellenzeilen 6/7 verschweigen die F6/F7-
- F-072 · PROCESS_IMPROVEMENT · Challenger-Sitzungen liefern Verträge aus, ohne sie gegen `scripts/check-contract.mjs` zu prüfen.
- F-073 · PROCESS_IMPROVEMENT · Challenger hat eine Abwesenheit aus einem einzigen Ort geschlossen und daraus eine Vertragsprämisse gemacht.
- F-076 · PROCESS_IMPROVEMENT · Git-Kommandos über die Geräte-Brücke hinterlassen eine stale `.git/index.lock` und blockieren Stefans Terminal.
- F-082 · PROCESS_IMPROVEMENT · Challenger-Sitzung hat Findings im Chat definiert, aber nicht in einem lesbaren Ort persistiert — Muster wie F-072/F-073/F-076.
- F-090 · TECH_DEBT · Drei-Ebenen-Zustandsmodell (Workstream → Execution → Lauf, §16.8 Punkt 6 / A4) existiert im Kern nicht und wird in Fassung 1 bewusst nicht gebaut.
- F-092 · PROCESS_IMPROVEMENT · Challenger-Handoffs referenzieren Claude-Projekt-Dokumente per Pfad, die für die bauende Sitzung nicht erreichbar sind — Muster wiederholt sich jetzt auf Dokumentebene, nicht nur bei einzelnen Finding-IDs.
- F-114 · PROCESS_IMPROVEMENT · Zwei Claude-Sitzungen haben real gleichzeitig in dasselbe Arbeitsverzeichnis geschrieben — Verstoß gegen „Ein Schreiber pro Arbeitsverzeichnis".
- F-122 · PROCESS_IMPROVEMENT · F-100 zum dritten Mal verletzt — `git status` aus der Bridge.
- F-123 · PROCESS_IMPROVEMENT · F-100 zum vierten Mal verletzt — `git fetch` aus der Bridge, diesmal mit realem Schaden.
- F-126 · PROCESS_IMPROVEMENT · Fünfte Verletzung von "aus der Bridge nur lesende Git-Befehle" (F-100/F-118/F-122/F-123), folgenlos.
- F-154 · PROCESS_IMPROVEMENT · Bridge-Git-Sicherheitsregel zum zweiten Mal in Folge verletzt.
- F-156 · PROCESS_IMPROVEMENT · F-152 bis F-155 wurden nicht ins Register übernommen.
- F-164 · PROCESS_IMPROVEMENT · Findings-Register-Nachtrag bleibt Handarbeit — dritte Wiederholung.
- F-183 · PROCESS_IMPROVEMENT · M3-Zielbild kollidiert an neun Stellen mit der geltenden Sollquelle
- F-211 · HARNESS_IMPROVEMENT · Neue Gates werden nicht auf Rot kalibriert.
- F-273 · PROCESS_IMPROVEMENT · Der Spike-Rot-Fall (Lauf 2) belegt nicht, dass ein Read-Only-Sandbox den
- F-280 · TECH_DEBT · Alle npm-Shims von Codex scheitern an `pruefeStartziel` — nur der native
- F-281 · TECH_DEBT · Eine Verbotsliste ist für Codex strukturell untauglich — es braucht eine
- F-283 · TECH_DEBT · Der Result Evaluator ist durchgehend Claude-Code-spezifisch — ohne
- F-287 · TECH_DEBT · Die B1-Auflage hat keinen Durchsetzungsmechanismus.
- F-299 · TECH_DEBT · `windows.sandbox = "unelevated"` in `~/.codex/config.toml` ist auf
- F-300 · TECH_DEBT · Ein an der Ausführungsrichtlinie gescheiterter Befehl erzeugt KEIN
- F-302 · TECH_DEBT · `-c` ersetzt die gesamte Nutzerkonfiguration am Argv vorbei.
- F-303 · TECH_DEBT · Eine Lesebereich-Verengung für `codex exec` existiert nicht.
- F-304 · TECH_DEBT · Der Vorgabe-Lesebereich der Windows-Sandbox ist maschinenweit.
- F-308 · TECH_DEBT · Bei `--output-schema` ist nur die LETZTE `agent_message`
- F-326 · PROCESS_IMPROVEMENT · Der Leitstand startet ohne `LEITSTAND_STARTVORLAGE_PFAD` gegen
- F-402 · TECH_DEBT · Kein projektlokaler Ort für Fähigkeiten.
- F-426 · HARNESS_IMPROVEMENT · `git diff` über die Bridge hinterließ ein reales `.git/index.lock`
- F-432 · PROCESS_IMPROVEMENT · Feature-Freigabe trotz offenem P1-BUG auf demselben Feature.
- F-433 · PROCESS_IMPROVEMENT · Review-Verfahren läuft entgegen PlanV1 §2 seit F23 nicht im Produkt.
- F-501 · TECH_DEBT · Jarvis-Chat-Turn kostet ~7-10s CLI-Prozessstart je Nachricht.
- F-523 · TECH_DEBT · Greenfield-Projekt über Jarvis ist strukturell blockiert.
- F-553 · PROCESS_IMPROVEMENT · Challenger bezifferte den Nutzen einer Option ohne direkte Messung.
- F-556 · BUG · Langlaufender Leitstand-Prozess braucht ~2 s je GET /api/zustand (frisch ~0,1 s).
- F-589 · HARNESS_IMPROVEMENT · Lesendes git über die Remote-Bridge hinterlässt trotz --no-optional-locks ein .git/index.lock.
