# F45 B1a-1 — Eigener Arbeitsordner (Git-Worktree) je Ablauf — Plan

Grundlage: Bauauftrag B1a-1 (11.10.2026), `docs/projekt/fixpaket-f45.md` (WS B1a), E-F45-3 = A. Branch
`feat/f45-b1a1-arbeitsordner`, Basis `387f1a3` (= `origin/main`, #318).

## Plan v1

### 0 Kernidee
Ein neues, reines Kernmodul `src/arbeitsordner/` (Pfadregeln, Löschliste, Validierung, Git-Abläufe über den
Git-Starter) und ein neues Kern-Artefakt `arbeitsordner-<workflowId>` (append-only Versionen über
`registriereKernArtefakt`, eigener Payload-Validator). Der Workflow-Datensatz (`WORKFLOW_V0`) bleibt
unverändert — kein neues Feld, kein Eingriff in `validiereWorkflowDaten`, Replans und neue Fassungen
berühren den Arbeitsordner nicht. „Feld fehlt = alter Weg“ heißt hier: **Artefakt fehlt = alter Weg**.

Im Server bekommt jeder Workflow-Schritt eine **Laufwurzel**: Pfad des Arbeitsordners, wenn das Artefakt
`BEREIT` ist, sonst `repoWurzel` (Bestand). Alle Stellen, die heute für Produktdateien `repoWurzel` nehmen,
nehmen im Workflow-Pfad die Laufwurzel. Kontrollzustand (`basisVerzeichnis`, absolut), Installationswurzel,
Startvorlage, Autorisierung und Rohstrom bleiben, wo sie sind.

### a) Wo entsteht der Worktree?
- Pfad: Geschwisterordner `<Projektordner>-laeufe/<workflowId>` (`resolve(repoWurzel, '..', basename(repoWurzel) + '-laeufe', workflowId)`),
  Branch `wf/<workflowId>`, Basis = `git rev-parse HEAD` des Projekts zum Vorbereitungszeitpunkt, im Artefakt
  als `basis_commit` festgehalten. `workflowId` ist bereits gegen `LAUFID_UNZULAESSIGE_ZEICHEN` geprüft;
  zusätzlich `git check-ref-format --branch` über den Git-Starter (Rot: unzulässiger Branchname → Halt).
- Ein Worktree je Workflow. Ein Workflow braucht einen, wenn mindestens ein Schritt einen Werkzeugsatz der
  Art `schreibend` trägt (`loeseWerkzeugsatzAuf(vorlage, s.werkzeugsatz)?.art`, dieselbe Quelle wie
  `starteLaufUndVergiss`). Chat-Rollen (Jarvis, Coach), Router-Läufe und Ad-hoc-Läufe über
  `POST /api/laeufe` bekommen keinen (sie laufen nicht über `starteWorkflowSchritt`).
- Innerhalb eines Workflows mit Arbeitsordner laufen ALLE Schritte darin (auch architekt/advisor/review) —
  eine Regel, keine Ausnahmeliste; lesende Schritte sehen dort denselben Commit plus die Änderungen der
  Ausführung (das ist für Review/Korrektur gerade richtig).

### b) Wie erreicht der Arbeitsordner alle Stellen? (Fundstellen `scripts/leitstand-server.mjs`, Basis 387f1a3)
| Stelle | heute | neu |
|---|---|---|
| `starteWorkflowSchritt` (~5317) | `repoWurzel` für `istStackOffen`, `leseEntschiedeneAdrs`, `loeseSchrittEingabenAuf` | Laufwurzel (einmal am Anfang ermittelt: `ermittleLaufwurzel(workflowId)`) |
| `loeseSchrittEingabenAuf` (3189) → `loeseAusfuehrungsEingabenAuf` (2712) | Evidenzpfade, E-F39-1=B-Vorbedingung gegen `repoWurzel` | Laufwurzel; Vorbedingung im Worktree siehe unten |
| `starteLaufUndVergiss` (5015) | `laufOptionen = {...optionen}` → `cwd`/`settingsPfad` der Instanz | neuer **skalarer** Parameter `laufwurzel` (Muster `zeitgrenzeMsUeberschreibung`, kein Optionen-Objekt — `VERBOTENE_OPTIONEN_FELDER`-Begründung bleibt gültig): setzt `cwd` und `settingsPfad = <laufwurzel>/.claude/settings.json`; `basisVerzeichnis`, `rohBasisVerzeichnis`, `aktuelleAutorisierungPfad`, `startfreigabeRepoWurzel` bleiben |
| Gateway claude-code (`src/claude-code-gateway` 681/770) und Codex (`src/codex-gateway` 363) | `optionen.cwd`, `optionen.settingsPfad` | unverändert, bekommen die Werte über `laufOptionen` |
| Änderungsübersicht (5141, `erzeugeAenderungsuebersichtDaten(laufId, repoWurzel, …)`) | `repoWurzel` | Laufwurzel |
| Prüfschritt (5170, `fuehrePruefungDurch(…, repoWurzel, …)`) | `repoWurzel` | Laufwurzel |
| „Prüfung wiederholen“ (8994) | `repoWurzel` | Laufwurzel des Workflows |
| Ort-B-Init/`.claude`-Vergleich (`ortBLauf.projektWurzel`) | `repoWurzel` | Laufwurzel (der Lauf schreibt dort) |
| Review (Codex/claude-code-Schritt) und Korrekturlauf | sind Workflow-Schritte | erben die Laufwurzel automatisch |
| Render-Nachweis | heute kein Schritt der Kette (kommt mit B2b) | nichts zu tun; B2b nimmt die Laufwurzel |
| Kontrollzustand, Lineage, Rohstrom (`kontrollzustand-roh` unter `process.cwd()`), `state/aktuelle-autorisierung.json` | absolut / Serverprozess | unverändert |

**E-F39-1=B (Vorbedingung schreibender Schritt) im Worktree:** `.git` ist im Worktree eine Datei, das
heutige `readFileSync(<wurzel>/.git/HEAD)` scheitert. Neu für Laufwurzel = Worktree: Branch über
`git symbolic-ref -q HEAD` (Git-Starter) und Vergleich **genau** mit `refs/heads/wf/<workflowId>` (strenger
als heute: nicht nur ≠ main/master). Sauberkeit: im Worktree NICHT verlangt — alle offenen Änderungen dort
gehören zum Ablauf selbst (der Korrekturlauf fände sonst immer die Änderungen des ersten Baus vor). Der
Schutzzweck von E-F39-1=B (Stefans offene Arbeit wird nie vermischt, main nie getroffen) gilt im Worktree
strukturell. **Offene Frage an Advisor/Stefan** — als Entscheidungsbedarf in der Akte, nicht still.

### c) E-183/E-188
- `arbeitsverzeichnis_pfad` bleibt `process.cwd()` des Servers (claude-code-gateway 693/834, codex 400) — keine Zeile dort ändert sich.
- E-183 misst über `ermittleIstZustand(settingsPfad)` (invocation-policy 378): Hash der Settings und Hooks
  relativ zu `dirname(dirname(settingsPfad))`. Mit `settingsPfad = <worktree>/.claude/settings.json` misst
  E-183 den Worktree. Gleicher Commit → gleiche Bytes → gleicher Hash; Hook im Branch geändert → „Hash weicht
  ab (E-183)“ wie heute. Keine Lockerung, keine Codeänderung in invocation-policy/gateway.
- Bekannte Grenze: `.claude/settings.local.json` ist nicht eingecheckt und fehlt im Worktree (Claude Code
  lädt sie dort nicht). Die Workforce gibt Werkzeuge über `--allowedTools`/Werkzeugsatz, nicht über
  settings.local — im realen Nachweis zu bestätigen.

### d) Vorbereitung vor dem ersten Schritt
- Auslöser: die zwei menschlichen Startwege `POST /api/workflows/<id>/starten` (8216) und
  `POST /api/workflows/<id>/freigabe` (8569), jeweils dort, wo heute `starteWorkflowSchritt` gerufen wird,
  und nur wenn (1) der Workflow einen Arbeitsordner braucht, (2) noch kein Schritt `lauf_id` trägt
  (Bestand-Regel i) und (3) das Artefakt nicht `BEREIT` ist.
- Ablauf (asynchron, Event-Loop frei): Artefakt `IN_VORBEREITUNG` → `git rev-parse --show-toplevel` (muss
  `repoWurzel` sein) und `git rev-parse --verify HEAD^{commit}` → `git worktree add -b wf/<id> <pfad> <basis>`
  → wenn `<worktree>/package.json` existiert: `npm ci` im Worktree über `fuehrePruefungDurch` (bestehender
  Prozessstart mit Windows-Kill-Logik und bereinigter Umgebung; Programm: `process.execPath` + npm-cli.js aus
  `npm_execpath` bzw. neben node; Zeitgrenze 10 min) → Artefakt `BEREIT` mit `vorbereitung { worktree_ms,
  npm_ci: { exit_code, ergebnis, dauer_ms, ausgabe_ende } | null }`.
- Antwort: `202 { workflowId, vorbereitung: true }`. Nach `BEREIT` setzt der Server fort wie die
  Auto-Fortsetzung: frisch laden, `ermittleNaechstenSchritt`, D13 prüfen (unverändert, nur lesend); bei
  `starte` → `starteWorkflowSchritt`. Ist D13 belegt oder der Ausgang nicht `starte` → `schreibeStartfehlerHalt`
  mit Grund („Arbeitsordner bereit; Start nicht möglich: …, erneut starten“).
- Fehler (kein Git-Repo, kein Commit, worktree add scheitert, Pfad existiert schon, npm ci ≠ 0 oder
  Zeitgrenze) → Artefakt `FEHLGESCHLAGEN` mit Grund, Workflow über `schreibeStartfehlerHalt` auf
  `KLAERUNG_ERFORDERLICH` mit demselben Grund. Ein halb angelegter Worktree bleibt stehen (kein rm -rf) und ist
  über „Aufräumen“ entfernbar; erneutes Starten legt ihn nicht doppelt an (Pfad existiert → Halt mit Hinweis).
- Doppelklick: instanzlokale Menge `vorbereitungLaeuft` (workflowId) → zweiter Start 409.
- Tiefenverteidigung in `starteWorkflowSchritt`: braucht der Workflow einen Arbeitsordner, ist er nicht im
  Bestand und nicht `BEREIT` (oder Ordner fehlt auf der Platte) → `{ ok:false, art:'konflikt' }` statt Lauf im
  Projektordner.
- D13 bleibt unverändert: die Vorbereitung ist kein Lauf und belegt die Sperre nicht (Auftrag: keine
  Änderung an D13). Folge: während `npm ci` kann ein anderer Lauf starten; dann hält der Workflow mit Grund an.

### e) Löschen (F-715)
- Es gibt **kein** `schemas/ergebnis-ausfuehrung*` — der Ausführungsschritt hat `output_schema: null` und
  liefert Prosa (Blockiert-Zeile, F-689). Vorschlag: ein maschinenlesbarer Block im Ergebnistext, gelesen über
  dieselbe Quelle wie Regel 1e (`leseErgebnistextAusRohstrom`, 3527): ein Codeblock mit Info-String
  `zu_loeschen`, Inhalt JSON `{ "zu_loeschen": ["pfad", …] }`. Neues Schema
  `schemas/ergebnis-ausfuehrung.schema.json` beschreibt genau dieses Objekt (Pflicht `zu_loeschen`, Array von
  Strings, max. 200, `additionalProperties: false`), Validator von Hand in `src/arbeitsordner`.
- Ausführung: in `starteLaufUndVergiss` im schreibenden Erfolgs-/VERWEIGERT-ohne-Bypass-Zweig, **vor** der
  Änderungsübersicht (damit Löschungen in Übersicht und Prüfschritt sichtbar sind), nur wenn eine Laufwurzel
  = Worktree übergeben ist und die Rolle `ausfuehrung` ist.
- Prüfung je Pfad (rein, testbar): String, nicht leer, ≤ 4096, keine Steuerzeichen/NUL, nicht absolut, kein
  Laufwerksbuchstabe, kein `:` (ADS), kein `..`-Segment, kein Segment mit `.`/Leerzeichen am Ende (Windows),
  Trenner `\` = `/`; verboten (Vergleich unter Windows ohne Groß/Klein): `.git` und alles darunter,
  `.claude/settings.json`, `.claude/settings.local.json`, `.claude/hooks/…`, `kontrollzustand/…`. Dann
  Dateisystem: `lstat` muss eine reguläre Datei sein (keine Verzeichnisse, keine Symlinks/Junctions), und
  `realpath` der Datei UND ihres Elternordners liegen innerhalb `realpath(worktree)`; die Verbotsliste wird
  zusätzlich auf den realpath-relativen Pfad angewandt (8.3-Kurznamen). Dann `unlinkSync`.
- Ergebnis `{ geloescht: [...], abgelehnt: [{ pfad, grund }] }` additiv als optionales Feld `loeschliste` in
  der Änderungsübersicht (`schemas/kontrollzustand-aenderungsuebersicht-payload.schema.json` + Validator +
  Beispiel). Abgelehnt → Befund in der Übersicht, kein Halt. Die gelöschten Dateien erscheinen ohnehin als `D`
  in der Dateiliste der Übersicht.
- Instruktion: `starteWorkflowSchritt` hängt für `ausfuehrung` mit Arbeitsordner einen Satz an (Feld, Format,
  „nur Dateien, nur im Arbeitsordner, kein rm“). Werkzeugsätze bleiben unverändert (kein Bash(rm)).

### f) Anzeige vor dem Start (F-954)
- `GET /api/workflows/<id>` bekommt additiv `arbeitsordner`: `{ status: 'kein_bedarf' | 'bestand' | 'geplant' |
  'IN_VORBEREITUNG' | 'BEREIT' | 'FEHLGESCHLAGEN' | 'ENTFERNT', pfad, branch, basis_commit (bei geplant: aktueller
  HEAD), grund, vorbereitung, projektOffeneAenderungen: { status, anzahl } }`. `projektOffeneAenderungen` aus
  `git --no-optional-locks status --porcelain` des Projekts — **nicht im 2-s-Poll synchron**: zwischengespeichert
  mit kurzer Lebensdauer bzw. asynchron (P-Ziele nicht verschlechtern).
- Entscheiden-Seite (`views/workflow-entscheiden.js`, Freigabe-Teil): Block „Wo gearbeitet wird“ mit Branch,
  Arbeitsordner, Basis-Commit, „Projektordner hat N offene Änderungen — blockiert nicht“.
- Auftrag anlegen (`views/auftrag-umgebung.js`, „Wo gearbeitet wird“): Zeile „Eigener Arbeitsordner je Ablauf:
  `<Projektordner>-laeufe\<Ablauf-ID>`, Branch `wf/<Ablauf-ID>`, Basis = aktueller Commit“ und die offenen
  Änderungen aus der vorhandenen Leseroute `GET …/code` (`dateien.anzahl`, `branch.commit`) — keine neue Route.
- Texte über `t()` in de/en/ru/tr, Tokens, keine neuen Farben.

### g) Aufräumen
- `POST /api/workflows/<id>/arbeitsordner-aufraeumen` `{ begruendung, verwerfen?: boolean }`: Herkunfts-/CSRF-
  Prüfung wie die übrigen POSTs; nur wenn Workflow `ABGESCHLOSSEN` oder `GESTOPPT` und Artefakt vorhanden und
  nicht `ENTFERNT`; nicht während eines Laufs dieses Workflows. Pflichtbegründung wie Stopp/Abnahme.
- `git worktree remove <pfad>` (ohne `--force`). Hat der Worktree offene Änderungen, verweigert git → 409 mit
  Grund und Anzahl („erst sichern oder ‚Änderungen verwerfen‘ wählen“). Nur mit `verwerfen: true` (zweite,
  ausdrückliche Bestätigung im Dialog) `git worktree remove --force` — git entfernt nur seinen eigenen
  Worktree, kein rm -rf. Danach `git worktree prune`.
- Branch: `git branch -d wf/<id>` (nie `-D`); git lehnt einen nicht gemergten Branch selbst ab → Branch bleibt,
  Hinweis „Branch wf/<id> bleibt, nicht gemergt“. Tip = Basis (nichts committet) gilt als gemergt → gelöscht.
- Artefakt `ENTFERNT` mit `aufraeumen { begruendung, verworfen, branch_geloescht, hinweis, am }`.
- UI: Knopf „Arbeitsordner aufräumen“ im Detail des Ablaufs (`views/workflow-detail.js`/`workflow-eingriffe.js`),
  nur bei beendetem Ablauf und vorhandenem Arbeitsordner; Dialog mit Pflichtbegründung und Kontrollkästchen
  „Änderungen verwerfen“.
- Liste lesend: `GET /api/arbeitsordner` (je Projektinstanz) aus `git worktree list --porcelain`, gefiltert auf
  `<Projektordner>-laeufe/`, angereichert mit Artefaktstatus; Anzeige als Abschnitt auf der Seite Code.

### h) Fremdprojekte
Dasselbe Verfahren mit deren `repoWurzel` (Projektinstanz, `loeseProjektPfade`). Kein Git-Repo, `rev-parse
--show-toplevel` ≠ repoWurzel, oder kein Commit (`HEAD` nicht auflösbar) → `FEHLGESCHLAGEN` mit klarem Grund
(„Projekt ist kein Git-Repository“ / „Projekt hat noch keinen Commit — erst einen Commit anlegen“), Workflow
`KLAERUNG_ERFORDERLICH`. Kein `package.json` → kein `npm ci` (`npm_ci: null`).

### i) Bestand
- Workflow mit schon gelaufenem Schritt (`lauf_id` ≠ null irgendwo) und ohne Artefakt → alter Weg im
  Projektordner, unverändert.
- Handler-Option `arbeitsordner` (Standard **aus** in `erzeugeRequestHandler`, **an** im CLI-Bindeblock und in
  `baueProjektHandlerMap`): die bestehenden ≈ 20 Gates, die schreibende Workflows über eigene Handler-Instanzen
  mit Platzhalter-Repos fahren, bleiben bitgenau; der reale Server arbeitet immer mit Arbeitsordnern. Test
  belegt, dass beide realen Konstruktionswege die Option setzen.

### Tests (node:test, `--test-concurrency=4`-tauglich, je Test eigenes Temp-Repo)
1. `src/arbeitsordner/arbeitsordner.test.ts`: Pfad/Branch-Ableitung; Löschpfad-Prüfung Rot/Grün (relativ,
   `..`, absolut, Laufwerk, ADS, `.git`, `.GIT/config`, `.claude/settings.json`, `.claude/hooks/x`,
   `kontrollzustand/x`, Verzeichnis, Junction auf Ordner außerhalb, Datei-Symlink außerhalb [übersprungen bei
   EPERM], erlaubt); Löschblock-Parser; Payload-Validator.
2. Git-Abläufe gegen echtes Temp-Repo: worktree add (Pfad, Branch, Basis), kein Repo, kein Commit; Aufräumen:
   sauber + nicht gemergt (Branch bleibt), gemergt (Branch weg), dirty ohne/mit verwerfen.
3. Server (`scripts/leitstand-arbeitsordner.test.mjs`): Workflow mit schreibendem Schritt, Attrappe
   `fuehreAufgabeDurchFn` schreibt eine Datei nach `optionen.cwd` und meldet ERFOLGREICH → cwd = Worktree,
   settingsPfad = Worktree, Änderungsübersicht und Prüfschritt (Attrappen-Befehl schreibt seinen cwd) im
   Worktree, Projektordner `git status` vorher = nachher (Invariante), Löschliste ausgeführt und in der
   Übersicht; Bestand ohne Artefakt läuft mit cwd = repoWurzel; Aufräumen-Route.
4. E-183 im Worktree: `ermittleIstZustand` + `pruefeStartbedingung1` gegen Worktree-Settings — Grün bei
   gleichem Commit, Rot nach geändertem Hook im Branch.
5. Anzeige: reine Renderfunktionen (Entscheiden-Block, Auftrag-anlegen-Zeile, Aufräumen-Knopf/Dialog).

### Risiken
- Event-Loop: `npm ci` und `git worktree add` asynchron; offene Änderungen des Projekts nicht synchron im Poll.
- Windows: Pfadlängen in `<Projekt>-laeufe/<uuid>/node_modules/...` (MAX_PATH) — realer Nachweis misst.
- Speicherplatz: je Worktree eine volle Arbeitskopie plus node_modules — Aufräumen ist Pflichtweg.
- OneDrive/Sync: Geschwisterordner liegt neben dem Projekt; ai-workforce liegt nicht in OneDrive (geprüft:
  `C:\Users\stefa\Projekte`).
- E-F39-1=B-Anpassung im Worktree ist eine Auslegung einer Stefan-Entscheidung → offen zur Bestätigung.
- Halber Worktree nach Fehler bleibt bis „Aufräumen“ liegen.

## Advisor-Pass (architecture-advisor, frischer Kontext, 11.10.2026)

**Urteil: tragfähig mit Änderungen** (Status „Nicht freigegeben“ für v1 in der vorliegenden Form). Blockierend:
(1) Stellen-Tabelle unvollständig — Regel 1j (`lesePackageScriptsStaende(repoWurzel)`, ~5827), Regel 1h
(`istStackOffen`/`traegtAdrVerweisAufEntscheidung(repoWurzel)`, ~5912) und Regel 1c (~5766) lesen weiter den
Projektordner; (2) d) Vorbereitung mit serverseitiger Fortsetzung bricht drei Quelltextverträge
(`check-f15-workflow.mjs`: genau 6× `starteWorkflowSchritt(`, genau 5 D13-Bereiche, genau ein Schreiber von
`freigabe_erteilt`; `check-f11-auftrag.mjs`: erstes `if (laufAktiv)`) und kann den Workflow nach einer Freigabe
festsetzen (LAEUFT ohne laufenden Schritt, Stale-Heilung greift nicht); (3) ARCHITECTURE.md §2 („Der Kern liest
Produktdateien read-only“) verbietet Löschen/worktree add/npm ci durch den Kern — Ausnahme erst dort, dann im Code.
Wichtig: (4) Sackgassen bei Fehler/Neustart/stehengebliebenem Branch; (5) Bestand-Regel öffnet beim Replan den
Projektordner; (6) Durchsetzungsgrad der Invariante (gemeinsames `.git`, npm-Lifecycle-Skripte); (7) Verzicht auf
Sauberkeit im Worktree ist Auslegung einer Stefan-Entscheidung → Bestätigung nötig, Vorschlag: erster schreibender
Schritt verlangt Sauberkeit, danach nur Branch; (8) Option standardmäßig aus vertretbar mit Auflagen (volle Kette im
neuen Test, kein Env-Schalter, Start-Log, check-f25 prüfen); (9) ganzen Ordner `.claude/` sperren,
`realpathSync.native`, normalisierte Vergleiche; (10) eigene Whitelist für `workflowId` als Pfad/Branch statt
`LAUFID_UNZULAESSIGE_ZEICHEN`. Hinweise: Schema+Beispiel für das neue Artefakt; Löschblock im Ergebnistext ist kein
Verstoß gegen §4/§7 (gleiche Quelle wie Regel 1d/1e), Schema nicht „ergebnis-ausfuehrung“ nennen; `npm ci` über den
vorhandenen npm-Runner (`src/ressourcen/installation.ts` npmReal), nicht `fuehrePruefungDurch`, `--ignore-scripts`
erwägen; E-183 am Ende der Vorbereitung prüfen; settings.local.json wird mit `--setting-sources project` ohnehin nie
geladen; Aufräumen nicht während Prüfschritt, gesperrte Dateien → 409; Liste/Code-Abschnitt und Poll-Feld streichbar.

## Plan v2 (Änderungen gegen v1; was nicht genannt ist, gilt aus v1)

**ARCHITECTURE.md §2 (neu, vor dem Code):** eng gefasste Ausnahme „Arbeitsordner je Ablauf (E-F45-3)“: der Kern legt
den Worktree ausschließlich über git an und entfernt ihn ebenso (Git-Starter), führt darin `npm ci --ignore-scripts`
aus und löscht nach einem Lauf der Rolle `ausfuehrung` ausschließlich geprüfte reguläre Dateien der Löschliste im
Arbeitsordner. Sonst bleibt der Kern lesend.

**b) Stellen (ergänzt):** Laufwurzel zusätzlich für Regel 1c (`istStackOffen`), Regel 1j
(`lesePackageScriptsStaende`), Regel 1h (`istStackOffen`, `traegtAdrVerweisAufEntscheidung`) und
`ortBLauf.projektWurzel` (~2913). Bewusst beim Projektordner: `startvorlageImRepo` (~5834, Muster der Startvorlage
relativ zum Projekt) und die Empfehlungs-Vorprüfung in Detail/Freigabe/Start (~5545, ~8728; „Anzeige = Start“).

**d) Vorbereitung — neu gefasst, ohne serverseitige Fortsetzung:**
- `POST …/starten` und `POST …/freigabe` (Zweig FREIGEGEBEN) prüfen **vor jedem Schreibvorgang** synchron, ob der
  Workflow einen Arbeitsordner braucht und ob er `BEREIT` ist. Wenn nicht, wird am Workflow **nichts** geschrieben
  (keine Entscheidung, kein `freigabe_erteilt`), die Vorbereitung wird angestoßen (fire-and-forget, ohne await im
  D13-Bereich), Antwort `202 { workflowId, vorbereitung: true, arbeitsordner }`. Die Oberfläche zeigt „Arbeitsordner
  wird vorbereitet“, beobachtet den Status über `GET /api/workflows/<id>` (Feld `arbeitsordner`) und sendet bei
  `BEREIT` dieselbe Anfrage mit identischem Körper (Begründung, `empfehlungIds`) erneut; bei `FEHLGESCHLAGEN` zeigt
  sie den Grund. Kein neuer Startpfad, keine zusätzlichen `starteWorkflowSchritt(`-Aufrufe, kein neuer D13-Bereich,
  kein `if (laufAktiv)` in einer Hilfsfunktion.
- Tiefenverteidigung in `starteWorkflowSchritt` (Auto-Fortsetzung, Korrekturlauf): braucht der Workflow einen
  Arbeitsordner und ist er nicht `BEREIT` oder fehlt der Ordner auf der Platte → `{ ok:false, art:'konflikt' }`
  (bestehender Haltpfad, nie Lauf im Projektordner).
- Vorbereitung idempotent (Wiederaufnahme statt Abbruch): registrierter Worktree auf `wf/<id>` am Pfad → nur
  `npm ci` und E-183 wiederholen; nur der Branch existiert → `git worktree add <pfad> wf/<id>` ohne `-b`; Pfad
  existiert ohne Worktree → `FEHLGESCHLAGEN` mit Grund. `IN_VORBEREITUNG` ohne Eintrag in der Speicher-Menge gilt als
  veraltet (Serverneustart) — ein neuer Start nimmt die Vorbereitung wieder auf.
- Schritte: Whitelist `workflowId` `^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$`, nicht auf `.`/`.lock` endend, und
  `basename(repoWurzel)` nicht leer → `git rev-parse --show-toplevel` (normalisiert gleich `repoWurzel`) →
  `git rev-parse --verify HEAD^{commit}` → worktree add → `npm ci --ignore-scripts` (wenn `package.json`; npm-Runner
  aus `src/ressourcen/installation.ts`, Zeitgrenze 10 min; `--ignore-scripts`, damit kein Lifecycle-Skript wie
  `prepare` beim Anlegen in das gemeinsame `.git` schreibt) → **E-183-Vorprüfung** gegen den Worktree
  (`ermittleIstZustand` + `pruefeStartbedingung1`, nur lesend) → `BEREIT`. Jeder Fehler → `FEHLGESCHLAGEN` mit Grund;
  der Workflow bleibt unverändert (startbar nach Behebung).
- Dauer je Schritt (`worktree_ms`, `npm_ci.dauer_ms`, `e183_ms`) im Artefakt.

**e) Löschen (geändert):** Schema-Name `schemas/ergebnis-ausfuehrung-loeschliste.schema.json` (+ Beispiele). Verboten
zusätzlich der **ganze** Ordner `.claude/`. Vergleiche über `realpathSync.native` und ohne Groß/Klein. Löschung nur
bei Rolle `ausfuehrung` mit Arbeitsordner.

**E-F39-1=B im Worktree (Entscheidungsbedarf E-F45-5, offen bis Stefan):** neue reine Funktion
`pruefeArbeitsordnerVorbedingung` neben der bestehenden: Branch exakt `refs/heads/wf/<workflowId>` (über
`git symbolic-ref -q HEAD`), Sauberkeit verlangt, solange im Workflow noch kein schreibender Schritt gelaufen ist;
danach nur der Branch (der Korrekturlauf findet die Änderungen des ersten Baus vor). Die bestehende Prüfung für den
Projektordner bleibt bitgenau.

**g) Aufräumen (geändert):** erlaubt bei Workflow `ABGESCHLOSSEN`/`GESTOPPT` **oder** Artefakt `FEHLGESCHLAGEN`;
gesperrt, solange über die Instanz ein Lauf oder Prüfschritt aktiv ist (D13-Zustand nur lesend) oder die
Vorbereitung läuft. Git-Fehler (offene Änderungen ohne „verwerfen“, gesperrte Dateien) → 409 mit git-Meldung,
Artefakt bleibt unverändert. Route in `scripts/leitstand/routen-arbeitsordner.mjs` (Arbeitsregel M5).

**f) Anzeige (vereinfacht):** offene Änderungen des Projektordners aus der vorhandenen Leseroute `…/code`
(`code-stand.js`) auch auf der Entscheiden-Seite — kein Git im 2-s-Poll. Arbeitsordner-Feld im Detail nur aus dem
Artefakt (`status: 'kein_bedarf' | 'bestand' | 'fehlt' | IN_VORBEREITUNG | BEREIT | FEHLGESCHLAGEN | ENTFERNT`); vor
der Vorbereitung zeigt die Seite Pfad- und Branch-Muster und „Basis = aktueller Commit beim Start“, danach die echten
Werte. Liste der Arbeitsordner (Auftrag: „lesend, z. B. Seite Code“): schlanke Leseroute über die Artefakte des
Projekts, Abschnitt auf der Seite Code.

**i) Bestand (geändert):** Bestand = ein **schreibender** Schritt hat bereits eine `lauf_id`, und es gibt kein
Artefakt. Sonst gilt die Arbeitsordner-Pflicht, auch mitten im Workflow (Replan). Handler-Option `arbeitsordner`
standardmäßig aus, an in CLI-Bindeblock und `baueProjektHandlerMap`; kein Env-Schalter; Start-Log „Arbeitsordner je
Ablauf: an“. `check-f25-projekte.mjs` startet keine Workflows (geprüft: kein `starten`/`schreibend`).

**Invariante und Durchsetzungsgrad:** „Arbeitsbaum und Index des Projektordners bleiben unverändert; `.git` erhält
nur `refs/heads/wf/*` und `worktrees/*`.“ Durchsetzungsgrad **geprüft** (Servertest mit Attrappenlauf, realer
Nachweis), nicht ERZWUNGEN. Grenzen: gemeinsames `.git` (Konfiguration/Refs), npm-Lifecycle-Skripte eines späteren
`npm install` im Lauf, Schreibrechte von Claude Code außerhalb des cwd (Rot-Fall im realen Nachweis, soweit ohne
Eingriff in Werkzeugsätze machbar).

**Tests (ergänzt):** Servertest deckt die volle Kette im Worktree ab: Ausführung (cwd, settingsPfad), Löschliste,
Änderungsübersicht, Prüfschritt, Regel 1j (Lauf ändert `package.json`-Skripte im Worktree → Halt), „Prüfung
wiederholen“, 202-vorbereitung ohne Schreibvorgang, Tiefenverteidigung, Bestand, Aufräumen.

**Gestrichen:** `git check-ref-format`, Status `geplant` mit vorläufigem HEAD, serverseitige Fortsetzung nach der
Vorbereitung, `projektOffeneAenderungen` im Poll.

## Nachpass auf v2 d)/e) (architecture-advisor, frischer Kontext, 11.10.2026)

**Urteil: tragfähig mit Änderungen** („Freigegeben mit Hinweisen“). Befund 2 gelöst, wenn die Vorprüfung in der
Freigabe nach der Empfehlungs-Vorprüfung und vor dem Registrieren der Entscheidung steht (nur Zweig FREIGEGEBEN) und
im Start nach `ausgang.art === 'starte'`, vor `starteWorkflowSchritt`; Zählungen in `check-f15-workflow.mjs`
bleiben gleich; im D13-Bereich der Freigabe weder `await `, `async ` noch `.then(` (auch nicht im Kommentar); kein
neues `if (laufAktiv)` oberhalb von POST /api/laeufe. Weitere Befunde: B3 fire-and-forget braucht `.catch` und
`try/finally`; B4 zweiter Start während der Vorbereitung idempotent 202, Nachsenden nur bei unveränderter Fassung;
B5 Wiederaufnahme nur bei sauberem, nicht gesperrtem Worktree auf dem richtigen Branch und der bekannten Basis;
Branch ohne Worktree nur bei Spitze = HEAD; B6 Sauberkeit nach `npm ci` scheitert ohne `node_modules` in
`.gitignore`, `lauf_id` als Marke beim Replan unsicher; B7 nur ein Block, sonst nichts löschen, nur bei ERFOLGREICH,
eigener `try`; B8 npm mit reduzierter Umgebung.

## Plan v3 (Ergänzung zu v2)

- **B1/B2:** Stellen wie oben; in den neuen Codezeilen kein `await`/`async`/`.then(`-Text, kein `if (laufAktiv)`.
- **B3:** `starteVorbereitung(workflowId)` schreibt `IN_VORBEREITUNG` synchron (scheitert das → 500 statt 202) und
  startet dann eine `async`-Funktion außerhalb des Handlers mit `.catch` am Aufruf und `try/finally` im Rumpf
  (Eintrag aus der Speicher-Menge entfernen, bei Wurf `FEHLGESCHLAGEN` schreiben).
- **B4:** Läuft die Vorbereitung schon, liefert ein weiterer Start/eine weitere Freigabe idempotent 202. Die 202
  trägt `versionSequenz` der Workflow-Fassung; die Oberfläche sendet nach `BEREIT` genau einmal erneut und nur, wenn
  die Fassung unverändert ist, sonst Hinweis „Fassung geändert — bitte neu prüfen“ (geprüft, nicht ERZWUNGEN).
- **B5:** Wiederaufnahme nur, wenn der Eintrag in `git worktree list --porcelain` weder `locked` noch `prunable` ist,
  auf `refs/heads/wf/<id>` steht, die Spitze gleich `basis_commit` ist (falls bekannt) und `status --porcelain`
  (ohne `node_modules/`) sauber ist; sonst `FEHLGESCHLAGEN` „Aufräumen, dann neu starten“. Branch ohne Worktree nur,
  wenn seine Spitze gleich dem aktuellen HEAD ist; sonst `FEHLGESCHLAGEN` mit Hinweis. „Pfad existiert ohne
  Worktree“ nennt das manuelle Entfernen. Pfadvergleich über `realpathSync.native` (Fallback normalisiert).
- **B6 (ersetzt die v2-Sauberkeitsregel):** Sauberkeit des frischen Worktrees wird **in der Vorbereitung** festgestellt
  (nach `worktree add`, **vor** `npm ci`). Die Vorbedingung eines schreibenden Schritts im Worktree prüft danach nur
  noch den Branch (exakt `wf/<id>`) — keine Marke, kein Replan-Risiko. Weitergabe über `optionen.arbeitsordner =
  { pfad, branch }` an `loeseAusfuehrungsEingabenAuf`; ohne das Feld bleibt die bestehende Prüfung bitgenau.
  Entscheidungsbedarf **E-F45-5** (Stefan): „Im Arbeitsordner verlangt E-F39-1=B Sauberkeit nur beim Anlegen; danach
  nur den Branch des Ablaufs.“
- **B7:** genau ein `zu_loeschen`-Block; mehrere oder ungültige → nichts löschen, Befund in `loeschliste.abgelehnt`.
  Gelöscht wird nur nach ERFOLGREICH, in eigenem `try` vor der Änderungsübersicht; das Löschergebnis geht auch
  dann in die Startfehlerliste, wenn die Übersicht scheitert.
- **B8:** npm mit Umgebung ohne `LEITSTAND_*` und `GIT_*` (`NpmRunner` optional um `env` erweitert).

## Nachtrag Bau (11.10.2026)

- **Ordnername (F-1025):** realer Versuch 1 scheiterte unter Windows an MAX_PATH. Der Arbeitsordner heißt jetzt
  `<Projektordner>-laeufe/<10 Hex des SHA-256 der Ablauf-ID>`; Branch bleibt `wf/<Ablauf-ID>`. Vor dem Checkout prüft
  `pruefePfadlaengen` den längsten eingecheckten Pfad des Basis-Commits; `git worktree add --quiet`; Gründe zeigen die
  `error:`/`fatal:`-Zeilen.
- **E-183-Vorprüfung** über `pruefeWerkzeugkonfigurationVorab` (src/claude-code-gateway, rein lesend, ohne
  Wirkungsmarke) — dieselbe Lesestelle und Messung wie starteGateway.
- **Routen** in `scripts/leitstand/routen-arbeitsordner.mjs` (Körper, Sperrgründe, Liste); Server registriert
  `POST /api/workflows/<id>/arbeitsordner-aufraeumen` und `GET /api/arbeitsordner`.
- **Oberfläche:** `views/arbeitsordner-anzeige.js` (Karte, Aktion, Dialog, Liste, Muster), Freigabe-Seite,
  „Auftrag anlegen“, Seite Code; 202 `vorbereitung` → einmaliges Nachsenden bei unveränderter Fassung.
- Abweichungen vom Plan: keine weiteren. Offene Entscheidung **E-F45-5** (Sauberkeit nur beim Anlegen).
