# Plan v1 — F42 Projekt-Harness WS-1

Slug: `f42-projekt-harness-ws1`. Advisor-Pass fällig: JA — neues Gate
(`scripts/check-f42-projekt-harness.mjs`), Änderung an einer bestehenden
Schema-tragenden Startvorlagenerzeugung (`schreibeStartvorlageUndProfil`),
neue produktivrelevante Datei-Kopierlogik in einem schreibenden HTTP-Pfad
(`POST /api/projekte`). Kein Auth-/Geld-Bezug.

Auftraggeber-Kontext: `state/tasks/` (dieser Handoff kam als Prompt, nicht
als Datei) — Ziel, In/Out-of-Scope, AK, DoD, Findings-Texte siehe
Gesprächsverlauf. Referenzen: `features/F41/feature.md`,
`docs/projekt/zielfassung.md` §13.6 (Zeile 58, v1.28→v1.29-Eintrag —
kündigt „Projekt-Harness (E-F41-3, noch nicht im Detail entschieden)"
bereits an), `state/findings.md` F-667, F-673, F-684, F-685, F-690, F-702.

## 1. Skelett-Snapshot

Quelle: `git show 9189959:<pfad>` aus dem bereits vorhandenen Remote
`template` (`https://github.com/DerStefan89/claude-projekt-template.git`,
`git fetch template --tags` bereits ausgeführt, Commit verifiziert:
`9189959 Merge pull request #12 from DerStefan89/harness-fix/8-start-klein`).

Ziel-Ordner: `vorlagen/projekt-skelett/` (neuer Root-Ordner, nicht unter
`docs/`/`scripts/`, damit keine Kollision mit ai-workforce-eigenen
Gate-Scans entsteht — siehe Abschnitt 2).

**Whitelist** (25 Dateien, jede Zeile = ein `git show 9189959:<pfad> >
vorlagen/projekt-skelett/<pfad>`):

Explizit vom Auftrag benannt:
- `CLAUDE.md`, `ARCHITECTURE.md`
- `.claude/agents/architecture-advisor.md`, `.claude/agents/code-reviewer.md`, `.claude/agents/qa.md`
- `.claude/skills/advisor-pass/SKILL.md`, `.claude/skills/git-flow/SKILL.md`, `.claude/skills/handoff-vertrag/SKILL.md`, `.claude/skills/ponytail/SKILL.md`, `.claude/skills/ponytail/LICENSE`, `.claude/skills/repo-audit/SKILL.md`, `.claude/skills/spec-schreiben/SKILL.md`, `.claude/skills/werkzeug-auswahl/SKILL.md`
- `docs/guide/00-START-HIER.md` … `08-EIGENES-PROJEKT.md` (9 Dateien)
- `scripts/check-docs.mjs`, `scripts/check-rules.mjs`, `scripts/check-contract.mjs`
- `package.json`
- `state/tasks/.gitkeep`

Zusätzlich, begründet („was nötig ist, damit check-docs im neuen Projekt
keine toten Verweise findet" + „state/-Vorlagen"):
- `docs/STATUS.md` — von `CLAUDE.md` per Pfad referenziert (`` `docs/STATUS.md` ``); reines `[FÜLLUNG]`-Skelett, kein Fremdinhalt.
- `docs/kommentar-standard.md` — von `CLAUDE.md` UND `ARCHITECTURE.md` referenziert.
- `docs/harness/werkzeug-katalog.md` — von `.claude/skills/werkzeug-auswahl/SKILL.md` referenziert; projektübergreifendes Nachschlagewerk, kein Fremdinhalt.
- `state/tooling.md` — von `.claude/skills/werkzeug-auswahl/SKILL.md` referenziert. **Bekannte Grenze:** der Template-Commit trägt hier bereits ausgefüllte Beispielzeilen (gitleaks, ponytail — Werkzeugstand DES TEMPLATE-PROJEKTS selbst). Wird unverändert mitkopiert (Snapshot = literale Kopie, keine Content-Bereinigung — Füllung ist WS-1 explizit Nicht-Ziel), aber in `HERKUNFT.md` als bekannte Unschärfe vermerkt: die Tabelle beschreibt das Template, nicht das neue Projekt, und muss beim ersten echten `werkzeug-auswahl`-Lauf im neuen Projekt korrigiert werden.
- `state/gates.md`, `state/memory-map.md`, `state/assumption-ledger.md`, `state/reibung.md`, `state/triggers.md`, `state/zwischenstand/VORLAGE.md` — reine `[PROJEKTNAME]`-Skelette (geprüft, kein Fremdinhalt), fallen unter „state/-Vorlagen" aus dem Auftrag; nicht strikt für check-docs nötig, aber ohne sie wäre `state/tooling.md`/`.gitkeep` eine willkürliche Auswahl aus derselben Kategorie. **Offener Punkt:** falls zu breit ausgelegt, auf `state/tooling.md` + `state/tasks/.gitkeep` allein zurückschneiden — siehe „Offene Punkte" unten.

**AUSGESCHLOSSEN** (explizit vom Auftrag):
- `.claude/settings.json`, `.claude/hooks/*` — Baseline gewinnt (E-F41-1 bleibt unverändert).
- `state/tasks/harness-fix-*.md`, `state/tasks/phase0-artefakte-committen.md` — Template-eigene Historie.

**Ebenfalls ausgeschlossen** (nicht angefordert, kein Bedarfsnachweis):
`README.md`, `START-KLEIN.md`, `SETUP.md`, `LICENSE`, `.github/workflows/ci.yml`,
`.gitattributes`, `.gitignore` (neues Projekt bekommt seines aus
`schreibeStartvorlageUndProfil`), `.worktreeinclude`, `.claudeignore`,
`.claude/commands/lessons.md`, `docs/adr/TEMPLATE.md`, `docs/examples/*`,
`docs/harness/HARNESS-*.md`, `docs/harness/zaehne-taxonomie.md`,
`docs/onboarding/*`, `specs/.gitkeep`, `state/advisor-findings-*.md`,
`state/plan-v1/v2-*.md` (Template-eigene Advisor-Historie, kein Skelett).

**Herkunftsdatei** `vorlagen/projekt-skelett/HERKUNFT.md`: Quelle-URL,
Commit-SHA `9189959`, Datum des Snapshots, die vollständige Whitelist mit
Begründung je Zeile (wie oben), der `state/tooling.md`-Hinweis, und der
Hinweis „nicht gehasht, kann von der Quelle driften (F-700)".

## 2. Kollisionsprüfung gegen ai-workforce-eigene Gates

Geprüft (Lesen von `scripts/check-docs.mjs` — **muss vor Bau gegen die
ai-workforce-eigene Fassung erneut verglichen werden, ich habe nur die
Template-Fassung gelesen, Annahme: beide sind noch identisch, unten als
Risiko markiert**):
- Prüfung 1 (tote Verweise) scannt nur fest benannte Root-Dateien
  (`CLAUDE.md`, `ARCHITECTURE.md`, `README.md`, `START-KLEIN.md`,
  `.claude/agents/*.md`, `.claude/skills/*/SKILL.md`,
  `.claude/commands/*.md`) — `vorlagen/projekt-skelett/CLAUDE.md` liegt
  außerhalb, wird nicht erfasst.
- Prüfung 3/4 (Stand-Marker) rekursiert nur ab `docs/harness/` und `state/`
  (Root-relativ) — `vorlagen/projekt-skelett/docs/harness/...` und
  `vorlagen/projekt-skelett/state/...` liegen außerhalb dieser Wurzeln,
  werden nicht erfasst.
- **Ergebnis: keine Gate-Ausnahme nötig**, sofern ai-workforces eigene
  `check-docs.mjs` mechanisch identisch zur Template-Fassung ist (gleiche
  Scan-Wurzeln). Wird in Schritt 0 der Umsetzung real verifiziert, bevor
  der Snapshot geschrieben wird; falls abweichend, hier nachgezogen.
- `check-rules.mjs` (leeres Regel-Gate) und `check-contract.mjs`
  (scannt nur `state/tasks/*.md`, root-relativ) sind aus demselben Grund
  unberührt.

## 3. `src/projekt-anlegen/index.ts`: neue Funktion `kopiereSkelett`

```
export function kopiereSkelett(installWurzel: string, zielRepoWurzel: string): string[]
```

Liest `vorlagen/projekt-skelett/` unter `installWurzel` (= `repoWurzel` des
Serverprozesses; `POST /api/projekte` läuft ausschließlich im
unpräfigierten defaultHandler, dort ist `repoWurzel === installWurzel`
immer wahr — kein neuer Parameter am Aufrufer nötig). Kopiert rekursiv
JEDE Datei unter `vorlagen/projekt-skelett/` außer `HERKUNFT.md` selbst,
mit `copyFileSync` (Muster `kopiereBaseline` — bytegenau, keine
Interpretation). Vor jedem Einzel-Copy `existsSync(zielDatei)` — existiert
sie, **überspringen, nicht überschreiben** (Auftrag Punkt 3: „nur Dateien
anlegen, die noch nicht existieren"). Gibt die Liste der tatsächlich
kopierten (nicht: übersprungenen) repo-relativen Pfade zurück. Kein
Try/Catch — ein Wurf (fehlendes Quellverzeichnis, Rechtefehler) propagiert
unverändert in den bestehenden `try` von `POST /api/projekte`, dessen
`catch` bereits den Rückbau übernimmt (kein zweiter Mechanismus).

Aufrufreihenfolge in `POST /api/projekte`
(`scripts/leitstand-server.mjs:4799-4802`): `kopiereBaseline` →
**`kopiereSkelett`** (neu) → `schreibeStartvorlageUndProfil`. Kein
Pfadkonflikt zwischen den dreien (Baseline: `.claude/settings.json` +
Hooks + `state/aktuelle-autorisierung.json`; Skelett: siehe Whitelist;
Startvorlage/Profil/`.gitignore`: eigene, vom Skelett nicht berührte
Pfade) — die „existiert bereits"-Prüfung in `kopiereSkelett` ist
defensiv/Idempotenz-Absicherung, kein real erwarteter Kollisionsfall.

## 4. Startvorlage: `pruefbefehl` statt Löschung

`schreibeStartvorlageUndProfil`
(`src/projekt-anlegen/index.ts:201-229`): Zeilen 203-204
(`delete startvorlage.pruefbefehl; delete startvorlage.pruefZeitgrenzeMs`)
werden ersetzt durch:
```
startvorlage.pruefbefehl = ['npm', 'run', 'check:template']
startvorlage.pruefZeitgrenzeMs = 120000
```
120000 ms als Default — `check:template` ruft nur drei reine
Node-Skripte ohne Netzwerk/Install auf (siehe Probe, Abschnitt 8),
gemessen typischerweise <5s; 120s lässt für einen kalten,
cloud-synchronisierten Ordner (CLAUDE.md „Bekannte Fallen") reichlich
Puffer, ohne im Fehlerfall ewig zu hängen. **Offener Punkt:** kein
gemessener Referenzwert aus einem zweiten Projekt vorhanden — Wert ist
eine begründete Schätzung, kein Messwert.

`NeueStartvorlageEckdaten`-Rückgabetyp bleibt unverändert (die drei Felder
für Startbedingung 2 sind von `pruefbefehl` unabhängig).

## 5. Coach: `baueAuftragAusProjektentwurf` bedingter Prüftext

**Offener Punkt — zentrale Design-Entscheidung, bitte prüfen:**
`baueAuftragAusProjektentwurf` (`src/product-coach/index.ts:622`) ist eine
REINE Funktion ohne `repoWurzel`-Zugriff, aufgerufen browserseitig
(`public/leitstand/views/chat.js:640`) aus einer bytegenauen JS-Kopie
(`public/leitstand/auftrag-aus-projektentwurf.js`, Gate-Gleichheit
`scripts/check-f34-product-coach.mjs` Prüfung (q)). Um „ai-workforce selbst
vs. Fremdprojekt" und den echten `pruefbefehl` zu kennen, braucht die
Funktion neue Eingaben — die Daten selbst liegen nur serverseitig vor
(`vorlage.pruefbefehl`, `repoWurzel === installWurzel`, closure-Variablen
in `erzeugeRequestHandler`, siehe `GET /api/startvorlage/werkzeugsaetze`
als Präzedenzfall für eine bereits bestehende, schmale
Startvorlagen-Projektion Richtung Browser).

Geplanter Weg:
1. Signatur wird additiv erweitert:
   `baueAuftragAusProjektentwurf(projekt, modus, kontext?: { pruefbefehl?: string[]; istAiWorkforce?: boolean })`.
   Fehlt `kontext` (bestehende Aufrufer, z. B. Tests, die nur Titel/Struktur
   prüfen): Verhalten wie „kein Prüfbefehl konfiguriert" UND KEINE
   ai-workforce-spezifischen Zeilen — sicherer Default, „nichts erfinden".
2. `GET /api/zustand` (`scripts/leitstand-server.mjs:5092-5106`) bekommt
   zwei additive Felder `pruefbefehl` (aus der Closure-Variable `vorlage`,
   bereits im Scope) und `istAiWorkforce` (`repoWurzel === installWurzel`,
   beide bereits im Scope) — rein additiv, kein bestehender Verbraucher
   liest neue Felder, kein Format-Bruch (Muster F28 WS-1 `aktiverLauf`:
   „additiv … direkt aus bereits vorhandenem Zustand gespiegelt").
3. `chat.js` pollt `/api/zustand` bereits (für `aktiverLauf` u. a.) — der
   zuletzt geladene Wert wird beim Bau des Auftragstexts
   (Zeile 640) als `kontext` durchgereicht.
4. Browser-Kopie (`auftrag-aus-projektentwurf.js`) bekommt denselben
   dritten Parameter, bytegenau gespiegelt (bestehendes Muster der Datei).
5. Gate-Gleichheitstest (`check-f34-product-coach.mjs` Prüfung (q)) bekommt
   zusätzliche Fixture-Kombinationen: `kontext` fehlt / `istAiWorkforce:
   true` / `istAiWorkforce: false` mit/ohne `pruefbefehl`.

Textänderung in `auftragstext` (ersetzt die drei hartkodierten Zeilen
622-704, insbesondere 702-704):
- Zeile „`docs/projekt/roadmap.json` … muss `validiereRoadmapDaten`
  bestehen" und die `check-feature.mjs`-Zeile: nur wenn
  `kontext?.istAiWorkforce === true`.
- Letzte Zeile: wenn `kontext?.pruefbefehl` gesetzt ist →
  `` `${kontext.pruefbefehl.join(' ')} muss danach grün sein.` ``; sonst
  wörtlich `Kein Prüfbefehl konfiguriert — die Änderungen werden nicht
  automatisch geprüft.` (kein Erfinden eines Ersatzbefehls).

**Alternative, falls Advisor Schritt 2 (neues `/api/zustand`-Feld) für zu
breit hält:** ein neuer, schmaler Endpunkt
`GET /api/projekt-kontext` mit exakt `{ pruefbefehl, istAiWorkforce }` statt
einer Erweiterung des bereits stark frequentierten Aggregat-Endpunkts.
Beide Varianten additiv, keine Breaking Change — Entscheidung an Advisor
delegiert.

## 6. Trust-Erkennung (E-PH-1 = B, löst Teil von F-702)

Neue, reine, exportierte Funktion in `src/projekt-anlegen/index.ts`:
```
export interface TrustStatus { status: 'true' | 'false' | 'fehlend'; cwdPfad: string; claudeJsonPfad: string }
export function pruefeWorkspaceTrust(cwdPfad: string, optionen: { claudeJsonPfad?: string } = {}): TrustStatus
```
- `claudeJsonPfad` Default `join(os.homedir(), '.claude.json')` (Muster
  `optionen.startfreigabeRepoWurzel`: überschreibbar für Tests/Gate —
  AK4/AK7e verlangen Fixture statt echter Datei).
- **Liest read-only**, schreibt NIE (E-PH-1 = B, ARCHITECTURE.md §3-Analogon
  — der Kern erzeugt kein Freigabeartefakt und hier auch keinen
  Trust-Eintrag).
- Lookup-Schlüssel: `cwdPfad.split(sep).join('/')` — derselbe
  Normalisierungs-Idiom wie bereits `baueNeuenProjektEintrag`s
  `repo_pfad`-Bau (`src/projekt-anlegen/index.ts:332`), kein neu
  erfundenes Muster. Exakter String-Vergleich gegen
  `projects[<normalisiert>].hasTrustDialogAccepted`, KEIN Raten über
  Groß-/Kleinschreibung des Laufwerksbuchstabens (real beobachtete
  Inkonsistenz in `~/.claude.json`, F-702) — bewusst keine Heuristik, die
  falsch-positiv würde.
- Rückgabe: `'true'` wenn der Schlüssel existiert und
  `hasTrustDialogAccepted === true`; `'false'` wenn der Schlüssel
  existiert, aber der Wert nicht `true` ist; `'fehlend'` wenn die Datei
  nicht existiert, kein gültiges JSON ist, oder der Schlüssel fehlt. Wirft
  nie (Muster `leseAktuelleAutorisierung`: Rot-Fall als Wert, nicht als
  Exception).
- **Bekannte Grenze (in Feature-Akte + F-702-Fortschreibung zu
  dokumentieren):** ein Trust, der unter einer anderen
  Schreibweise desselben Pfades (anderer Laufwerksbuchstabe-Case, anderer
  Trenner) gesetzt wurde, wird als `'fehlend'` gemeldet, obwohl Claude Code
  ihn ggf. real akzeptiert (Windows-Pfade sind case-insensitive, die
  Trust-Datei nicht zwingend). Bewusst in Kauf genommen statt eines
  Ratens, das in die andere Richtung falsch läge — löst F-702 NICHT
  vollständig, sondern liefert die vom Auftrag verlangte „Erkennung auf
  exakten Worker-cwd" verlässlich für den einen Pfadstring, den DIESER
  Server tatsächlich verwendet.

**Nächste-Schritte-Antwort** (`scripts/leitstand-server.mjs:4837-4840`)
bekommt ein additives Feld:
```
trust: {
  status: '<true|false|fehlend>',
  pfad: ziel,
  hinweis: status !== 'true'
    ? `Workspace-Trust fehlt für '${ziel}'. Einmal 'claude' in genau diesem Ordner starten und den Trust-Dialog bestätigen, bevor ein schreibender Lauf gegen dieses Projekt gestartet wird — sonst greift die kopierte Permission-Allowlist nicht (F-690).`
    : null,
}
```
Harte Sperre (Auftrag Punkt 6 „harte Sperre nur für F41-angelegte Projekte
und nur, wenn der Worker-cwd eindeutig ist"): **WS-1-Scope-Entscheidung —
nur Anzeige + Warnung, KEINE harte Sperre.** Begründung: der Worker-cwd für
ein frisch angelegtes F42/F41-Projekt ist zwar deterministisch `ziel`
(einziger `repo_pfad`-Eintrag für diese `id`, keine Mehrdeutigkeit), aber
eine harte Sperre vor jedem künftigen Lauf gegen dieses Projekt bräuchte
einen Eingriff in `starteGateway`/den Execution Controller (F6a/F8) —
außerhalb des Auftragsumfangs „`POST /api/projekte`-Antwort +
Warnung". Diese Lesart wird dem Advisor als **eigener offener Punkt**
vorgelegt: entweder bestätigen (Anzeige reicht für WS-1, harte Sperre wäre
Scope-Creep in F6a/F8) oder als Blocker zurückweisen, falls „harte Sperre"
als AK4-Pflichtbestandteil dieses WS gemeint war.

## 7. Gate: `scripts/check-f42-projekt-harness.mjs` (neue Datei)

Entscheidung: NEUE Datei statt Erweiterung von
`check-f41-projekt-anlegen.mjs` — F41 ist `ABGESCHLOSSEN` mit eigenem,
stabilem Gate; jedes andere Feature in diesem Repo hat sein eigenes
`check-fXX-*.mjs` (etablistes Muster, kein Einzelfall). Prüfungen (je mit
kalibriertem Rot-Fall, `state/gates.md`-Pflicht):
- (a) Skelett vorhanden: `vorlagen/projekt-skelett/CLAUDE.md` +
  `HERKUNFT.md` existieren, `HERKUNFT.md` nennt die SHA `9189959`. Rot:
  Whitelist-Datei fehlt.
- (b) Baseline unverändert: `kopiereBaseline` kopiert nach WS-1 exakt
  dieselben drei Pfad-Kategorien wie vor WS-1 (Regressionstest gegen
  `ermittleHookPfade`-Ausgabe) — `kopiereSkelett` schreibt nie unter
  `.claude/settings.json`, `.claude/hooks/`. Rot: ein Whitelist-Eintrag
  läge (versehentlich) unter einem der Baseline-Pfade.
- (c) `pruefbefehl` gesetzt: `schreibeStartvorlageUndProfil` gegen ein
  Wegwerfverzeichnis aufgerufen, Ergebnisdatei enthält
  `["npm","run","check:template"]`. Rot: alte Fassung (Feld fehlt).
- (d) Coach-Text: `baueAuftragAusProjektentwurf` mit
  `istAiWorkforce: false, pruefbefehl: ['npm','run','check:template']`
  darf NICHT `validiereRoadmapDaten`/`check-feature.mjs` enthalten, MUSS
  `npm run check:template muss danach grün sein.` enthalten; mit
  `istAiWorkforce: true` weiterhin beide Zeilen; ohne `kontext` die
  „kein Prüfbefehl konfiguriert"-Zeile. Rot: alte, unbedingte Fassung.
- (e) Trust-Erkennung: `pruefeWorkspaceTrust` gegen drei Fixture-Dateien
  (`status: true`, `status: false`, Datei fehlt) statt der echten
  `~/.claude.json` (`optionen.claudeJsonPfad`). Rot: falsches Ergebnis bei
  einer der drei Fixtures.

## 8. Probe (AK2)

Kein permanentes Script — einmaliger Nachweis während der Umsetzung:
`kopiereBaseline` + `kopiereSkelett` + `schreibeStartvorlageUndProfil`
direkt (nicht über HTTP) gegen ein Verzeichnis unter
`%TEMP%\projekt-harness-probe-<random>` aufrufen (außerhalb aller
Repo-Arbeitsbäume), danach `cd` dorthin und `npm run check:template`
ausführen — erwartet Exit 0. Anschließend Temp-Verzeichnis löschen.
Ergebnis (Exit-Code + letzte Konsolenzeilen) geht in den Abschlussbericht.

## 9. Doku

- `docs/projekt/zielfassung.md`: neuer Changelog-Eintrag
  `v1.29 → v1.30`, Titelzeile auf v1.30, neuer Entscheidungseintrag
  `E-F41-3` (Schichtenmodell: Baseline/Skelett/Füllung, wie im Auftrag
  Kontext beschrieben) und `E-PH-1 = B` unter §13.6, `F42 Projekt-Harness`
  in die Feature-Liste/Reihenfolge eingefügt (`F41 → F42 → F35`).
- `features/F42/feature.md` — neue Akte nach dem etablierten Muster
  (`scripts/check-feature.mjs`-Pflichtabschnitte: Ziel, Nicht-Ziele,
  Akzeptanzkriterien, Dependencies), Status `IN_ARBEIT` bis Abschluss.
- `docs/STATUS.md` — F42 unter Meilenstein 5 nachtragen, Reihenfolge
  `F41 → F42 → F35` korrigieren.
- `state/findings.md` — F-699…F-702 wie im Auftrag vorgegeben, im
  etablierten Format (Titel/Beschreibung/Fundstelle/Auswirkung/
  Maßnahme/Status/Feature-Run, Muster F-690 oben).
- `state/gates.md` — neuer Eintrag für `check-f42-projekt-harness.mjs` mit
  den fünf Rot-/Grün-Fällen aus Abschnitt 7.

## Offene Punkte, nicht stillschweigend entschieden

1. **check-docs.mjs-Identität** (Abschnitt 2): Plan geht davon aus, dass
   ai-workforces `scripts/check-docs.mjs` dieselben Scan-Wurzeln hat wie
   die Template-Fassung, die ich gelesen habe — noch nicht gegeneinander
   diff't. Risiko: falls ai-workforce eigene Erweiterungen hat (z. B.
   rekursiver Scan über weitere Wurzeln), könnte der Snapshot doch eine
   Gate-Ausnahme brauchen.
2. **`state/`-Whitelist-Umfang** (Abschnitt 1): sechs zusätzliche
   `state/*.md`-Skelette über das explizit Geforderte hinaus. Enger
   möglich (nur `state/tooling.md` + `state/tasks/.gitkeep`).
3. **Kanal für `pruefbefehl`/`istAiWorkforce` zum Browser** (Abschnitt 5):
   additives Feld an bestehendem `/api/zustand` vs. neuer schmaler
   Endpunkt.
4. **Harte Sperre vs. reine Warnung bei fehlendem Trust** (Abschnitt 6):
   Plan entscheidet sich für „nur Warnung", da eine harte Sperre in
   `starteGateway`/F6a/F8 eingreifen müsste — außerhalb des textlich
   benannten Umfangs „`POST /api/projekte`-Antwort".
5. **`pruefZeitgrenzeMs: 120000`** (Abschnitt 4): Schätzwert, kein
   Messwert aus einem realen zweiten Projekt.
