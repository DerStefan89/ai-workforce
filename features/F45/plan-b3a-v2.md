# F45 B3a — Plan v2 (nach Advisor-Pass)

Grundlage: `features/F45/plan-b3a.md` (v1). Advisor-Pass im frischen Kontext (29.10.2026, Subagent
`architecture-advisor`): **Nicht freigegeben**, kein Schnitt („passt in einen Baudurchgang plus eine Korrekturrunde,
sobald A1–A3 geklärt sind“). v2 ändert nur die unten genannten Punkte; alles andere gilt aus v1.

## Vor dem Bau geklärt

- **A1 Biome nur auf Code-Dateien.** `files.includes` zählt Code-Endungen auf (`**/*.ts`, `**/*.tsx`, `**/*.mts`,
  `**/*.cts`, `**/*.js`, `**/*.jsx`, `**/*.mjs`, `**/*.cjs`) plus die Ausnahmen, dazu
  `vcs: { enabled: true, clientKind: "git", useIgnoreFile: true }`. Grund: in Workforce-Projekten liegen kompakte JSON-
  Dateien (`kontrollzustand/`, `startvorlagen/`, `profiles/`, `state/aktuelle-autorisierung.json`), die der Formatierer
  sonst rot macht. Wie in der Workforce (`biome.json:4`, Code-Dateien aufgezählt). `.claude/settings.json` fällt damit von
  selbst heraus; `!.claude` bleibt wegen der Hooks.
- **A2 Freigabe der Agents in bestehenden Projekten (DEKLARIERT, Folge des Auftrags).** `katalogFreigaben`
  (`src/faehigkeiten/index.ts:568`) hasht die Agent-Dateien der Workforce zur Laufzeit; `ressourcen.json` führt
  code-reviewer und architecture-advisor als FREIGEGEBEN. Nach B3a gelten die alten Fassungen in bestehenden Projekten als
  „abweichend“ und nicht freigegeben, bis die neue Fassung im Projekt liegt oder Stefan den Inhalt freigibt. Neue Projekte
  bekommen die neue Fassung aus dem Skelett und sind freigegeben — deshalb Byte-Gleichheit Skelett ↔ Workforce als Test
  (siehe unten). Kein Code dafür in B3a; Benennung in F-1249, im Bericht und als Freigabepunkt für Stefan.
- **A3 Ausnahmeliste richtig begründet.** `.claude/`, `check-contract.mjs`, `check-docs.mjs`, `check-rules.mjs` sind
  Template-Bestand; `check-gates.mjs` und `tests-mit-untergrenze.mjs` sind eigener Skelett-Code aus B1a-2 („lokal neu“) und
  verfehlen die neue Grenze (Formatierung, Komplexität `check-gates.mjs:205`, checkJs-Fehler). Ausnahme bleibt, die Vorlage
  sagt das offen; neues offenes Finding F-1251 (`TECH_DEBT` P3) für das Aufräumen der beiden Dateien.

## Beim Bau

- **B1** `check-dateigroesse` überspringt `.claude` wie Biome und tsc (Workforce-Projekte bekommen `commit-guard.cjs` mit
  719 Zeilen über `kopiereBaseline`; Harness, kein Projektcode).
- **B2** Probelauf mit Lock-Datei läuft mit Netz (`npm audit` ohne Netz ist rot, `check-gates.mjs:147-155`); gitleaks
  fehlt lokal ⇒ gelber Hinweis.
- **B3** Schritt 1 der Vorlage: `node_modules/` in `.gitignore` aufnehmen.
- **B4** DEKLARIERT: `vorlagen/` steht nicht im Biome der Workforce; dass `check-dateigroesse.mjs` Biome- und checkJs-sauber
  ist, belegt der Probelauf (einmalig), nicht ein laufendes Gate.
- **B5** Probelauf zusätzlich „Workforce-ähnlich“: kompakte JSON-Dateien in `kontrollzustand/` (gitignoriert) und
  `startvorlagen/`, `npm install` real ausgeführt.
- **B6** `nachruesten.ts:181` sagt „vorne“ — Logik (`includes`) bleibt richtig, Text leicht ungenau; Workforce-Code, nicht
  geändert, im Bericht benannt.
- **tsc ohne Eingaben** (Fakt, Vorab-Probe): `tsc` mit `include` ohne Treffer endet mit TS18003 (rot) — auch die heutige
  Vorlage. Weil `scripts/check-dateigroesse.mjs` nicht ausgenommen ist, hat `tsc` immer eine Eingabe.

## Pflichtfragen (Antworten aus dem Advisor-Pass übernommen)

- **Builder-Regel:** keine neue Zeile. Zeile 116 der Skelett-`CLAUDE.md` („Vor dem Schreiben neuer Utility-/Format-/Auth-
  Funktionen IMMER erst …“) wird an Ort und Stelle auf neuen Code verallgemeinert („Vor neuem Code IMMER erst vorhandene
  Helfer suchen und nutzen — …“). Erfüllt den Auftrag ohne Zeilenzuwachs.
- **Byte-Gleichheit:** nicht im Dateigrößen-Test, sondern in `scripts/check-skelett-herkunft.test.mjs`: jede Skelett-Agent-
  Datei, die `ressourcen.json` mit Pfad `.claude/agents/<n>.md` als FREIGEGEBEN führt, ist byte-gleich zur Workforce (A2).
- **Neuer Test** `scripts/skelett-check-dateigroesse.test.mjs`: `zaehleZeilen`, 800/801, `node_modules` und `.claude`
  übersprungen, eine Ausnahme, echtes Skelett grün, Exit-Codes 0/1.
- **F-1250** bleibt und deckt beide Rollen: der Advisor-Schritt im Lauf baut einen eigenen Auftragstext
  (`src/architecture-advisor/index.ts:63`); beim Reviewer erreicht der Checklistenpunkt den Lauf (`leseCheckliste`), der
  Abschnitt „Was kann weg?“ im Ausgabeformat nicht (Stopp an der nächsten `##`, `src/projektkarte/index.ts:277`). Deshalb
  steht die Zeilenangabe schon im Checklistenpunkt.
- **O2** `--error-on-warnings` übernommen. **O3** versionsfrei, in der Vorlage als DEKLARIERT gekennzeichnet; Probelauf
  mit der Version der Workforce.

## Findings

F-1249 (`HARNESS_IMPROVEMENT` P2, erledigt durch B3a), F-1250 (`HARNESS_IMPROVEMENT` P2, offen: Pflichtfragen im
Workforce-Lauf), F-1251 (`TECH_DEBT` P3, offen: `check-gates.mjs`/`tests-mit-untergrenze.mjs` unter die Skelett-Grenze).

## Zuschnitt

Unverändert ein Baudurchgang plus eine Korrekturrunde. Advisor-Nachpass entfällt nicht ganz: kurzer Delta-Pass im
frischen Kontext gegen diese Datei vor dem Bau.

## Nachtrag Delta-Advisor (29.10.2026)

Urteil **Freigegeben mit Hinweisen**. Übernommen: B3 heißt „`.gitignore` anlegen oder ergänzen“ (das Skelett liefert keine,
Workforce-Projekte haben nur `kontrollzustand/`); der Byte-Gleichheits-Test sichert genau qa, code-reviewer und
architecture-advisor zu (nicht leer); Zeile 116 behält `[FÜLLUNG: Pfade]` und die Ordnerangaben. Offene Unsicherheit
`vcs` ohne Ignore-Datei — geklärt per Probe (Fakt, Biome der Workforce): ohne `.gitignore` bricht `biome check` mit
„couldn't find an ignore file … configuration resulted in errors“ ab (rot, fail-closed); mit `.gitignore` bleiben
gitignorierte Code-Dateien außen vor; `biome.json` selbst prüft Biome immer mit (die Vorlage zeigt sie formatiert).
`vcs` bleibt deshalb (respektiert auch projekteigene Build-Ordner); Probelauf-Fall „ohne `.gitignore`“ belegt das Rot.
`kontrollzustand/` der Workforce enthält nur JSON (1 783 Dateien, Fakt) — `check-dateigroesse` braucht dafür keine Ausnahme.
