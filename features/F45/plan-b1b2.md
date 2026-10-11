# F45 B1b-2 — Plan (Harness-Abgleich-Tabelle, Kurzliste an die Abnahme, Kleinpunkte)

Branch `feat/f45-b1b2-harness-abgleich` (Basis `febcc86` = main mit #321). Grundlage: Bauauftrag B1b-2 (Challenger,
11.10.2026), `docs/projekt/fixpaket-f45.md` (Beleg 12, B1b), `features/F45/feature.md` (Stand B1b-1), F-937, F-932, F-1039.

## Plan v1

### Grundsatz
Deterministisch, kein KI-Urteil. Status = versionierte Zuordnung (Datei) × Inventar (Dateien des Projekt-Harness) ×
vorhandene Laufdaten (Workflow-Schritte, Prüfergebnis, Laufakte-`beobachtung`). Was die Zuordnung nicht kennt, ist
„offen“ (rot). Kein Schreiben in Projekt- oder Harness-Dateien.

### 1 Kern-Modul `src/harness-abgleich/` (index.ts, types.ts, harness-abgleich.test.ts)
- **Inventar** `leseHarnessInventar(wurzel)` — synchron, wirft nie:
  - Hooks aus `.claude/settings.json`: je Ereignis → Matcher-Eintrag → `hooks[].command` ein Eintrag
    `{ art: 'hook', name, ereignis, matcher, skript }`; `skript` = erstes Token mit `.claude/hooks/…` im Befehl,
    `name` = Dateiname ohne Endung (`commit-guard`); ohne erkennbares Skript ist `name` der ganze Befehl (gekürzt).
  - Agents `.claude/agents/*.md` (Name ohne `.md`), Skills `.claude/skills/<name>/SKILL.md` (Ordner ohne SKILL.md →
    Problemeintrag), Commands `.claude/commands/*.md`. Je Ordner eine Ebene, keine Rekursion, Punktdateien zählen nicht.
  - DoD: in `CLAUDE.md` der Abschnitt unter einer Überschrift `Definition of Done` (beliebige Ebene `##`–`####`) bis
    zur nächsten Überschrift oder `---`; je Aufzählungspunkt (`- [ ]`, `- [x]`, `-`) mit Folgezeilen ein Eintrag.
    Normalisiert: Präfix weg, Folgezeilen mit Leerzeichen verbunden, Leerraum zusammengefasst, getrimmt.
    `name` = `dod-` + erste 8 Hex von SHA-256 des normalisierten Texts (stabil, solange der Text gleich bleibt);
    der Text geht als `detail` mit.
  - Fehlerfälle als eigener Eintrag `{ art: 'quelle', name: <Pfad>, grund }`, nie ein Wurf: `CLAUDE.md` fehlt oder
    ohne DoD-Abschnitt, `settings.json` fehlt/kein JSON/ohne `hooks`, Ordner nicht lesbar (EACCES …), Skill-Ordner ohne
    SKILL.md. Ein fehlender Ordner `agents`/`skills`/`commands` ist kein Fehler (0 Einträge).
- **Zuordnung** `validiereZuordnung(daten)` (handgeschrieben, Muster `validierePruefergebnisDaten`):
  `{ harness_zuordnung_schema: 'v0', eintraege: [{ art: 'hook'|'agent'|'skill'|'command'|'dod', name, status:
  'wirksam'|'ersetzt_durch'|'bewusst_nicht', beleg?, schritt?, begruendung?, text? }] }`.
  - `wirksam` braucht `beleg` mit `art`: `statisch` (+ `quelle`, repo-relativer Pfad eines Nachweises),
    `pruefschritt` (Prüfergebnis GRÜN des Ausführungslaufs), `schritt` (+ `rolle`; Schritt gelaufen, ERFOLGREICH)
    oder `aufruf` (Name taucht in `skill_aufrufe`/`subagent_aufrufe` des Ausführungslaufs auf).
  - `ersetzt_durch` braucht `schritt { rolle, bedingung? }`; `bewusst_nicht` braucht `begruendung` (nicht leer).
  - Doppelter Schlüssel (art+name) ist ein Verstoß. Unbekannte Felder sind Verstöße (additionalProperties: false).
  - `ladeZuordnung(installWurzel, projektPfad?)`: Standard `harness-abgleich/standard.json`, optional eine
    Projektdatei (Pfad aus der Startvorlage, s. 4); Projekt-Einträge ersetzen Standard-Einträge gleichen Schlüssels.
    Ungültige oder unlesbare Datei → Ergebnis mit `fehler` (alle Inventar-Einträge werden „offen“ mit diesem Grund).
- **Abgleich** `berechneHarnessAbgleich({ inventar, zuordnung, laufbelege })` — rein:
  - Ohne Zuordnungseintrag → `offen` (Grund „nicht in der Zuordnung“); Problemeintrag (`art: 'quelle'`) → `offen`.
  - `laufbelege = null` (Seite Workforce): Status = Zuordnung, Beleg nur beschrieben („laut Zuordnung“).
  - Mit Laufbelegen (`{ schritte: [{schritt_id, rolle, status, lauf_id}], pruefergebnis: { ergebnis, laufId } | null,
    beobachtung: BeobachtungV0 | null, ausfuehrungLaufId }`): `wirksam` + `statisch` bleibt wirksam und ist als
    „statisch“ gekennzeichnet; `pruefschritt`/`schritt`/`aufruf` → wirksam mit zitiertem Beleg (Lauf-ID, Schritt-ID,
    Ergebnis, Anzahl), sonst `wirksam_ohne_beleg` („ohne Beleg in diesem Lauf“). `ersetzt_durch` zitiert den Schritt
    (gelaufen + Lauf-ID / nicht gelaufen / nicht in diesem Ablauf) — der Status bleibt `ersetzt_durch`.
    Für jede Agent-/Skill-Zeile steht die Zahl der Aufrufe im Lauf dabei, wenn die Beobachtung sie zeigt.
  - Zählung `{ wirksam, wirksam_ohne_beleg, ersetzt_durch, bewusst_nicht, offen }`, `bestanden = offen === 0`
    (wörtlich Beleg 12). Reihenfolge der Zeilen: offen zuerst, dann DoD, Hooks, Agents, Skills, Commands.
  - **Kurzliste** `baueFaehigkeitenKurzliste(beobachtung, laufId)`: Skills, Subagenten, MCP-Server (aus
    `mcp__<server>__…`) je mit Anzahl, dazu Hintergrund-Aufrufe; ohne Beobachtung `null`.
- **Ergebnis-Artefakt** `harness-abgleich-<workflowId>` (Kern-Artefakt, append-only, eigenes Schema
  `schemas/kontrollzustand-harness-abgleich-payload.schema.json` + Beispiele valid/invalid,
  `validiereHarnessAbgleichDaten`): `{ harness_abgleich_schema: 'v0', workflow_id, wurzel, zuordnung_quellen:
  [{ pfad, sha256 }], bezug: { ausfuehrung_lauf_id, pruefergebnis_version } | null, zaehlung, bestanden, eintraege,
  faehigkeiten, berechnet_am }`.

### 2 Zuordnungsdatei `harness-abgleich/standard.json` (+ Schema `schemas/harness-zuordnung.schema.json`, Beispiele)
Neuer Ordner auf Installationsebene (ARCHITECTURE §1 nachziehen). Ist-Stand, nichts erfunden:
- Hooks: `commit-guard`, `guard-settings` → wirksam, `statisch` `features/F45/nachweise/b1b1/nachweis.md`
  (realer `-p`-Lauf: guard-settings verweigert Edit auf settings.json; commit-guard verweigert Remove-Item über das
  PowerShell-Werkzeug). `zwischenstand-laden` (SessionStart) → wirksam, `statisch` `…/b1b1/nachweis.md` (Rohstrom
  `rohstrom-hooks.json`: `hook_started`/`hook_response` `SessionStart:startup`, `outcome: success`).
  `session-reminder` (UserPromptSubmit) → bewusst_nicht: „im -p-Lauf kein Hook-Ereignis im Rohstrom (B1b-1);
  Erinnerung alle 30 Nachrichten ist für interaktive Sitzungen gedacht; Nutzen im Lauf offen (F-932)“.
  `zwischenstand-pruefen` (PreCompact) → bewusst_nicht: „feuert nur bei Kontextverdichtung; im -p-Lauf nicht
  beobachtet; Zwischenstand ist Sache der interaktiven Sitzung (F-932)“.
- Agents: `code-reviewer` → ersetzt_durch Schritt `code-reviewer`; `architecture-advisor` → ersetzt_durch Schritt
  `architecture-advisor`, Bedingung „Kontrolltiefe hoch“ (Vorlage `hoch.json`); `qa`, `design-guardian` →
  bewusst_nicht bis B2b (F-1031); `scout` → bewusst_nicht: „Recherche-Rolle der Seite Workforce (F27), kein Schritt
  eines Bau-Ablaufs“.
- Skills: `advisor-pass` → ersetzt_durch Schritt `architecture-advisor` (Kontrolltiefe hoch); `git-flow` →
  bewusst_nicht „Stefan sichert (Bereit zum Sichern, B2b); Commits durch die Workforce bewusst nicht (Beleg 12)“;
  `handoff-vertrag` → ersetzt_durch Schritt `architekt` (Auftrag/Plan als Übergabe; Arbeitspaket B2a);
  `spec-schreiben` → bewusst_nicht „Spec entsteht vor dem Ablauf (Coach/Feature-Akte), nicht im Lauf“;
  `repo-audit` → bewusst_nicht „Sanierung zwischen Zyklen, kein Laufschritt“; `werkzeug-auswahl` → bewusst_nicht
  „Werkzeugwahl durch Stefan auf der Seite Workforce (F27/F)“; `ponytail` → bewusst_nicht „Projekt-Skills im Lauf
  erst mit F (F-815/F-816)“.
- Command `lessons` → bewusst_nicht „Teil 2, Lernschleife (F-933)“.
- DoD (IDs aus `CLAUDE.md` von ai-workforce UND aus `vorlagen/projekt-skelett/CLAUDE.md`, wo der Text abweicht):
  „`npm run check` → Exit 0“ → wirksam, `pruefschritt`; „Reviewer-/QA-Pass …“ → ersetzt_durch Schritt
  `code-reviewer` (qa → B2b); „KEINE Commits ohne explizite Freigabe“ → wirksam, `statisch` (commit-guard,
  Werkzeugsatz ohne git, b1b1); „Render-Nachweis“ → bewusst_nicht bis B2b/B3; „Typisiert, kein any“ → wirksam, `pruefschritt`
  (`tsc` und Lint laufen in `npm run check`);
  „Wiederverwendbar“, „Fehlerzustände“, „Leere Zustände“, „Kommentiert“, UI-Punkte → ersetzt_durch Schritt
  `code-reviewer` (Prüfmaßstab des Reviews; DoD an das Review erst B2a — Begründung im Eintrag).
- Kein Eintrag für Unbekanntes: ein neuer Agent/Skill/Hook im Projekt erscheint „offen“.

### 3 Server (`scripts/leitstand-server.mjs`, dünn; Logik im Modul)
- **Kettenende:** im Laufende-Rückruf von `starteWorkflowSchritt`, wenn `naechster?.art === 'fertig'`: synchron
  Inventar (Laufwurzel = Arbeitsordner, sonst Projektordner) + Zuordnung + Laufbelege → `registriereKernArtefakt(
  'harness-abgleich-<workflowId>', …)`; Fehler → Startfehlerliste (Muster Prüfschritt), nie ein Abbruch. Kein
  zusätzlicher Aufruf von `starteWorkflowSchritt(` (bleibt 6×).
- **GET `/api/workflows/<id>/harness-abgleich`** (vor dem Detailendpunkt, nicht gepollt): Artefakt, wenn sein
  `bezug` zum aktuellen Stand passt (Ausführungs-Lauf-ID und Version des Prüfergebnisses), sonst live berechnet
  (`quelle: 'live'`, nicht geschrieben — eine GET-Anfrage schreibt keinen Kontrollzustand). 404 ohne Workflow.
- **GET `/api/harness/abgleich`** (Seite Workforce, nicht gepollt, Herkunft wie `/api/harness`): Inventar von
  `repoWurzel` + Zuordnung, ohne Laufbelege.
- `/api/zustand` unverändert bis auf ein additives, im Speicher gehaltenes Feld `cliHinweis` (s. 5b) — keine
  Datei-Lesung im Poll.

### 4 Startvorlage
- Optionales Feld `harnessZuordnungPfad` (installationsrelativ, gleiche Pfadregel wie `pruefketten_pfade`);
  Validator, Typ, Test. ai-workforce trägt es nicht (Standard reicht).
- 5a: `startvorlagen/ai-workforce.json` `bashZeitgrenzeMs: 1200000` (≤ `zeitgrenzeMs` 1 800 000, Validator erlaubt
  es; Startvorlage geht nicht in den Gültigkeitsschlüssel E-183 ein → keine neue Startfreigabe).

### 5 Anzeige (Texte über `t()`, de/en/ru/tr; bestehende Komponenten `ablauf-tabelle`/`lauf-kopfdaten`, `details`, `note red/amber`)
- Reines Modul `public/leitstand/harness-abgleich-anzeige.js` (+ Test): Zählzeile „Harness: x wirksam · y ersetzt ·
  z bewusst nicht · n offen“ (+ „· m ohne Beleg in diesem Lauf“, wenn m > 0), aufklappbare Tabelle (Art · Eintrag ·
  Status · Beleg / Ersatz / Begründung), offen-Zeilen rot (bestehende Farbtokens), Kurzliste der Fähigkeiten.
- (a) Abnahme (`views/workflow-abnahme.js`): Block in „Nachweise im Einzelnen“ bzw. im kompakten Vorab-Block:
  Zählzeile + Tabelle + Kurzliste. Laden in `views/workflows.js` einmal je (Workflow, Ausführungs-Lauf-ID,
  Prüfergebnis-Status) — nicht bei jedem Poll-Tick.
- (b) Lauf-Detail (`views/lauf-detail.js` Aufklappbereich „Fähigkeiten“): dieselbe Tabelle für den Ablauf des Laufs
  (`workflowZuLauf`), einmal je Lauf geladen (`views/runs.js`).
- (c) Seite Workforce, Register Harness-Aufbau (`views/harness-aufbau.js`): Tabelle unter dem Skelett, Status laut
  Zuordnung, geladen zusammen mit GET /api/harness (Betreten, „Neu laden“, Projektwechsel).

### 6 Kleinpunkte
- **5b CLI-Version:** im CLI-Bindeblock nach dem Binden einmal asynchron `<werkzeugStartziel> --version`
  (execFile, 15 s Zeitgrenze) der Startvorlage des Startprojekts; reine Funktion `vergleicheCliVersion(installiert,
  deklariert)` (getrimmt, exakt). Abweichung → `console.warn` und `prozessCliHinweis = { art: 'cliVersionGeaendert',
  installiert, deklariert, anleitung: 'docs/harness/startfreigabe-erneuern.md' }`, in `/api/zustand` als
  `cliHinweis` (aus dem Speicher). Band oben (`start-hinweis.js`) zeigt „CLI-Version geändert — Startfreigabe neu
  erzeugen“ mit Versionen und Anleitungspfad. Fehlschlag von `--version` → nur `console.warn`, kein Hinweis. Kein
  automatisches Neuerzeugen (E3).
- **Anleitung** `docs/harness/startfreigabe-erneuern.md`: Variablen erklärt (`$NEU` = Ausgabe `claude --version`,
  `$AUTH` = `C:\Users\stefa\ai-workforce-autorisierung`, `$REPO` = Installationsordner …); Schritte: (1) Matcher in
  `.claude/settings.json` prüfen (Werkzeugnamen der neuen CLI, `Bash|PowerShell`, `Edit|Write`), (2) Nachweise neu
  (realer Lauf `features/F45/nachweise/b1b1/realer-lauf.mjs`, `powershell-eingabe.mjs`), (3) `werkzeugVersionDeklariert`
  der Startvorlage auf `$NEU`, (4) `node scripts/erzeuge-invocation-policy-nachweise.mjs …`, (5) Commit im
  Autorisierungs-Repo (Stefan), (6) Verweisdatei `state/aktuelle-autorisierung.json` (pfad, commit_hash, datei_hash),
  (7) Prüfung (Leitstand neu starten → kein Band; ein lesender Lauf startet; `npm run check`).
- **F-1039:** CLI-Test ohne Annahme über `os.tmpdir()`: abgewiesenes Ziel = eine Datei (kein Ordner) in einem eigenen
  Temp-Ordner → Exit 2, Ordner unverändert, auch mit `--anwenden`; „außerhalb der Basis“ prüft weiter der Unit-Test
  in `src/projekt-anlegen/nachruesten.test.ts` mit explizit gesetzter Basis (vorhanden, Z. 167). Keine
  Basis-Überschreibung in der CLI (kein neuer Schalter im Produkt).

### 7 Tests
`src/harness-abgleich/harness-abgleich.test.ts` (Inventar inkl. Fehlerfälle, DoD-Parser/ID, Zuordnungs-Validator,
Override, Abgleich ohne/mit Laufbelegen, unbekannter Agent → offen, Kurzliste, Ergebnis-Validator, Beispiele,
`standard.json` gültig und deckt den Ist-Harness von ai-workforce ohne „offen“ ab), Startvorlage (Feld),
`scripts/leitstand/harness-abgleich-route.test.mjs` (beide GETs, Artefakt vs. live, 404, Kettenende schreibt
Artefakt), `public/leitstand/harness-abgleich-anzeige.test.mjs`, Abnahme-/Lauf-Detail-/Harness-Aufbau-Render,
`start-hinweis.test.mjs` (cliHinweis), `vergleicheCliVersion`, F-1039.

### 8 Nachweise `features/F45/nachweise/b1b2/`
- `abgleich-nachweis.mjs` erzeugt `abgleich-ai-workforce.md` (Seite Workforce) und `abgleich-workflow.md`
  (vorhandener, abgeschlossener Workflow `b1a1-nachweis-325d2a8f`: Ausführung + Review ERFOLGREICH, Prüfergebnis GRÜN,
  Beobachtung vorhanden).
- Fall „unbekannter Agent“: Test-Fixture (offen, rot) + Render-Folge gegen einen Leitstand mit Fixture-Projekt.
- Render-Nachweis: Abnahme und Workforce-Seite, de 1440 und 390, en.
- `/api/zustand` vorher/nachher mit `scripts/messe-chat.mjs --nur-leerlauf 10 --ausgabe b1b2`.

### 9 Akte / Findings
Akte „Stand B1b-2“, Beleg 12 „Mechanik vorhanden, Erbringung in R“; F-937 (Teil Abnahme) und F-1039 setzen; neu
F-1043 (TECH_DEBT P2, Bash-Zeitgrenze) und F-1044 (PROCESS_IMPROVEMENT P3, CLI-Update macht Startfreigabe ungültig).

### Risiken
- DoD-IDs hängen am Wortlaut: jede Textänderung in CLAUDE.md macht den Punkt „offen“ — gewollt (sichtbar, rot), kostet
  aber eine Zuordnungspflege.
- Kettenende-Rechnung im Laufende-Rückruf: synchron, kurz; ein Wurf darf die Kette nicht stören (try/catch).
- Live-Berechnung bei Altbestand ohne Artefakt liest den heutigen Projekt-Harness, nicht den Stand zur Laufzeit —
  in der Anzeige als „live berechnet“ gekennzeichnet.
- Statische Belege sind kein Laufbeleg — als „statisch“ gekennzeichnet.

## Advisor-Pass (frischer Kontext, architecture-advisor, 11.10.2026)
Urteil **tragfähig mit Änderungen** (A0–A5 vor dem Weiterbauen, H1–H8 mitlaufend; kein zweiter Pass nötig).
- A0: Kernmodul, Anleitung und Vorher-Messung lagen beim Pass schon als Entwurf vor (gegen „erst planen, dann
  bauen“) — der Entwurf wird an v2 angeglichen; in der Akte festgehalten.
- A1: `ersetzt_durch` zählte auch ohne gelaufenen Ersatzschritt (Fast-Lane ohne Review „bestand“); `bedingung` als
  Freitext ist nicht maschinell auswertbar.
- A2: `wirksam_ohne_beleg` bestand Beleg 12; ein ROTES Prüfergebnis wäre nicht rot.
- A3: Zuordnung teils unbelegt (zwischenstand-laden wirkt im Lauf nicht; session-reminder-Begründung falsch
  geschlossen; DoD-Punkte „ersetzt durch Review“, obwohl das Review die DoD erst mit B2a bekommt; handoff-vertrag;
  statische Hook-Belege nicht an Skript-Hash/Matcher gebunden — B1b-1 belegte guard-settings mit der Skelett-Fassung
  (anderer Hash als die Root-Fassung)).
- A4: „Startvorlage geht nicht in den Gültigkeitsschlüssel ein“ falsch formuliert (Version, Kontext, Startziel sind
  Schlüsselfelder); `pruefZeitgrenzeMs` 900 000 < Bash 1 200 000.
- A5: Beleg-Arten `schritt`/`aufruf` von keinem Eintrag benutzt (Agents/Skills im Lauf erst mit F).
- H1 Abgleich als Feld in GET /api/harness statt eigener Route; Zählhilfe teilen. H2 benannte, synchrone Hilfsfunktion
  im D13-Bereich (keine verbotenen Zeichenketten), „Harness im Lauf geändert“ kennzeichnen. H3 Bezug über Inhalts-Hash
  des Prüfergebnisses; Client-Schlüssel aus Lauf-IDs/Status aller Schritte. H4 Hinweis gilt prozessweit für die
  Startvorlage des Startprojekts; F-1044-Titel „nicht mehr belegt“ statt „ungültig“; beide Hinweise im Band. H5 F-1039
  schon umgesetzt. H6 Leerzustände (workflowZuLauf undefined/null/Objekt), statische Quelle existiert, Text ↔ Hash,
  Hook-Befehl nicht ausliefern, realpath. H7 nicht inventarisiert: ARCHITECTURE §8, settings.local.json, permissions.
  H8 b1a1-Workflow zeigt nur die Live-Berechnung → Kettenende-Artefakt per Servertest/Fixture belegen.

## Plan v2 (gilt; Abweichungen von v1)

### Status-Semantik (A1, A2, A5)
- Beleg-Arten nur noch `statisch` und `pruefschritt` (`schritt`/`aufruf` gestrichen — kommen mit F). Aufrufe je
  Agent/Skill laut Beobachtung bleiben reine Anzeige.
- `statisch` trägt optional `skript_sha256` und `matcher` (Pflicht bei Hooks): stimmt das Inventar (SHA-256 der
  Hook-Datei, Matcher) nicht überein → `wirksam_ohne_beleg` mit Grund „Hook weicht vom Beleg ab“.
- `pruefschritt` mit Laufbelegen: GRÜN → `wirksam`; ROT/ZEITGRENZE/FEHLER → `offen` (`offen_grund`
  `beleg_negativ`); kein Prüfergebnis → `wirksam_ohne_beleg`.
- `ersetzt_durch` mit Laufbelegen: Schritt der Rolle ERFOLGREICH gelaufen → `ersetzt_durch` (zitiert); steht im
  Ablauf, nicht gelaufen → `offen` (`ersatz_nicht_gelaufen`); fehlt im Ablauf → `offen` (`ersatz_fehlt`), außer der
  Eintrag trägt `fehlt_im_ablauf: { begruendung }` → `bewusst_nicht` mit dieser Begründung. `bedingung` entfällt.
- `bestanden` nur mit Laufbelegen: `offen === 0 && wirksam_ohne_beleg === 0`; ohne Laufbelege (Seite Workforce)
  `null`.

### Zuordnung (A3)
- `zwischenstand-laden` → bewusst_nicht („feuert als SessionStart, im Lauf ohne Inhalt: kein Zwischenstand für den
  Branch wf/<id>“); `session-reminder` → bewusst_nicht („stream-json meldet nur SessionStart-Hooks; Wirkung im Lauf
  unbelegt; für interaktive Sitzungen gedacht, F-932“).
- DoD „wiederverwendbar / Fehlerzustände / Leere Zustände / kommentiert“ → bewusst_nicht („DoD an das Review: B2a,
  F-829“); UI-Punkte bewusst_nicht (B2b/B3); „Reviewer-/QA-Pass“ → ersetzt_durch `code-reviewer`
  (`fehlt_im_ablauf`: „Fast-Lane ohne Review-Schritt (Kontrolltiefe)“).
- `architecture-advisor`, `advisor-pass` → ersetzt_durch `architecture-advisor` mit `fehlt_im_ablauf` („nur in der
  Vorlage hoch“). `handoff-vertrag` → bewusst_nicht („Übergabeformat = Arbeitspaket, B2a“).
- `code-reviewer` → ersetzt_durch `code-reviewer` mit `fehlt_im_ablauf` („Fast-Lane ohne Review-Schritt“).
- `commit-guard`, `guard-settings` → wirksam, `statisch` mit `skript_sha256` + `matcher` der Root-Fassung, Quelle
  ein neuer realer `-p`-Lauf in B1b-2 gegen eine Wegwerf-Kopie der Root-Hooks (`features/F45/nachweise/b1b2/
  hooks-nachweis.mjs` → `zaehlung-hooks.json`, Rohstrom lokal); b1b1 bleibt als ursprünglicher Nachweis genannt.
- DoD-Einträge tragen den vollen Text; Test: `dodId(text) === name`. Test: jede statische `quelle` existiert.

### Inventar (H6, H7)
- Hook-Einträge ohne Befehl (`detail` null — kein Geheimnis-Risiko), dazu `skript_sha256` der Hook-Datei (realpath
  unter der Wurzel, sonst Quellen-Eintrag). CLAUDE.md/settings.json nur gelesen, wenn ihr realpath unter der Wurzel
  liegt.
- Nicht im Inventar (dokumentiert): ARCHITECTURE.md §8, `settings.local.json`, `permissions` (Lauf mit
  `--setting-sources project`).

### Ergebnis-Artefakt (H2, H3)
- `bezug: { ausfuehrung_lauf_id, pruefergebnis_hash }` (Inhalts-Hash statt Version).
- Neues Feld `geaenderte_harness_dateien: string[] | null` aus der Änderungsübersicht des Ausführungslaufs
  (`CLAUDE.md`, `.claude/**`) — Anzeige „Harness im Lauf geändert“.
- `bestanden: boolean | null`.

### Server (H1, H2, H3)
- Kettenende: benannte Hilfsfunktion `schreibeHarnessAbgleichAmKettenende(...)` mit Kopf „MUSS SYNCHRON BLEIBEN“,
  aufgerufen nach dem Rücksprung bei `eingefroren` und vor `if (naechster === null || naechster.art !== 'starte')`,
  nur bei `naechster?.art === 'fertig'`; im Bereich keine verbotenen Zeichenketten (check-f15-workflow). Fehler →
  Startfehlerliste mit Präfix „Harness-Abgleich“.
- GET `/api/workflows/<id>/harness-abgleich` (nicht gepollt): Artefakt, wenn `bezug` passt, sonst live (nicht
  geschrieben, `quelle: 'live'`).
- Seite Workforce: GET `/api/harness` bekommt das Feld `abgleich` (ohne Laufbelege) — keine zweite Route.
- Zählhilfe `zaehleNamen` aus dem Gateway exportiert (dort von `fasseNamenZusammen` benutzt); Kurzliste nutzt sie.

### Anzeige (H3, H4, H6)
- Abnahme lädt den Abgleich einmal je Schlüssel (Workflow-ID + `schritt_id:lauf_id:status` aller Schritte).
- Lauf-Detail: `workflowZuLauf` undefined → nichts laden; null → Satz „Lauf gehört zu keinem Ablauf“; Objekt → laden.
- Band oben: falscher Ordner und CLI-Version je als eigene Zeile, wenn beide gesetzt.

### Kleinpunkte (A4, H4, H5)
- `bashZeitgrenzeMs` ist kein Feld des Gültigkeitsschlüssels (`src/invocation-policy/types.ts`: Konfigurations-Hash,
  Schutzskript-Hashes, deklarierte Version, Berechtigungskontext, Arbeitsverzeichnis, Startziel) → keine neue
  Startfreigabe. `pruefZeitgrenzeMs` 900 000 bleibt (Prüfschritt läuft ohne parallelen Modell-Lauf; 479 s gemessen,
  Reserve ≈ 47 %); Reserve unter Last in F-1043 vermerkt.
- CLI-Hinweis: prozessweit, Startvorlage des Startprojekts; Momentaufnahme beim Start (dokumentiert).
- F-1039: Teständerung steht; Finding setzen.

### Nachweise (H8)
- Kettenende-Artefakt per Servertest mit Attrappe (Kette bis `fertig`, Artefakt gültig, Status je Zeile) und als
  Nachweis-Ausgabe; b1a1-Workflow als Live-Berechnung.
