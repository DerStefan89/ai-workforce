# F45 B2b-4a-1 „Bereit zum Sichern“ — Server-Teil (Ableitung, ?workflow=) — Plan v3

Stand: 19.10.2026, Branch `f45/b2b4-sichern` = `origin/main` `d7f207c` (#365). Verlauf: `plan-b2b4.md` (v1) →
`advisor-b2b4.md` → `plan-b2b4a.md` (v2) → `advisor-b2b4a-delta.md` → dieser Plan. Entscheidungen Challenger 19.10.2026:
Schnitt A (4a-1 = A+B, 4a-2 = C, 4b = D–E); Regel „abgelehnt“ gestrichen; Titel im Commit-Vorschlag zurückgestellt; Blockform
in 4a-2; „voraus“ = „noch nicht auf main“ als Grenze.

## CONTEXT

- 4a-1 ist **nur Server**: keine Oberfläche, kein Render-Nachweis, kein i18n. Schließt **kein** Finding; F-979 und F-1087
  bekommen den Nachtrag „Server-Teil gebaut (B2b-4a-1)“.
- 4a-2 (eigener Auftrag nach dem Merge von 4a-1): Blockform `& { Set-Location -LiteralPath … -ErrorAction Stop … }` für alle
  Befehlsblöcke des Leitstands (ohne Einzug, Prüfstand eingeschlossen), Anzeige in Karte/Abnahme/Workboard, Render-Nachweis;
  schließt F-979, F-1087, F-1088 (5) für den Leitstand. Baut auf `scripts/leitstand/ablauf-sichern.mjs` und `?workflow=`
  aus 4a-1 auf. Die Bauauflagen 8–20 aus `advisor-b2b4a-delta.md`, soweit sie C betreffen, gehen an 4a-2.
- 4b (Jarvis-cd-Zeilen, F-1085 (5), Gate b2a3 (g), D13-Lücke, Jarvis-Blockregel) baut auf demselben Modul auf und braucht
  einen eigenen Ratschen-Ausgleich (4a-1 senkt die Grenze auf das Ist).
- Unverändert: Hooks/settings, `.claude/`, `projekte.json`, `ressourcen.json`, `vorlagen/`, `.githooks`,
  `workflow-vorlagen`, `kontrollzustand/`; `public/` ganz; `starteWorkflowSchritt(` 6×; keine neue Route; kein neuer
  Workflow-Status, kein Schema; `commitVorschlag` unverändert.

## A — Ableitung `scripts/leitstand/ablauf-sichern.mjs` (rein)

Eine Quelle der Gründe: `SICHERN_GRUENDE = ['nichtAbgeschlossen', 'keinArbeitsordner', 'nichtAngelegt', 'inVorbereitung',
'fehlgeschlagen', 'aufgeraeumt', 'ordnerFehlt', 'nichtBestimmbar', 'nichtsOffen']`, je Schlüssel ein deutscher Servertext
ohne Kennung (`SICHERN_GRUND_TEXT`; Übersetzung über den Schlüssel folgt in 4a-2).

**Ordnerlage — nur für den 409-Pfad:** `arbeitsordnerGrund(ao)` mit `ao` = Ergebnis von `baueArbeitsordnerProjektion`
(Server `:6651`, Form `{ status, aufraeumen?, vorbereitungLaeuft?, ordnerVorhanden? }`):
- `kein_bedarf` | `bestand` → `null` (kein Arbeitsordner)
- `fehlt` → `nichtAngelegt`
- `ENTFERNT` oder `aufraeumen` gesetzt → `aufgeraeumt`
- `vorbereitungLaeuft === true` oder `IN_VORBEREITUNG` → `inVorbereitung`
- `FEHLGESCHLAGEN` → `fehlgeschlagen`
- `BEREIT` und `ordnerVorhanden === false` → `ordnerFehlt`
- `BEREIT` und Ordner vorhanden → `null`
- sonst (unbekannt, keine Form) → `nichtBestimmbar`

**Sichern-Lage — nur nach `ermittleLaufort.ok`:** `leiteSichernLageAb({ workflowStatus, bedarf, projektion })` →
`{ bereit, art: 'commit' | 'push' | null, grund: <SICHERN_GRUENDE> | null, offeneAenderungen, voraus }`:
1. `workflowStatus !== 'ABGESCHLOSSEN'` → `nichtAbgeschlossen`. O1 („abgelehnt ⇒ nicht bereit“) gilt hierüber: eine
   abgelehnte Abnahme setzt den Ablauf auf `GESTOPPT` (Server `:12750-12758`); eine Reparatur mit neuem Bau macht die alte
   Entscheidung veraltet (`ermittleAbnahmeStand`), dann gilt der neue Bau. Bewusste Grenze: `GESTOPPT` mit offenen
   Änderungen wird nicht angeboten — dort bleibt „Aufräumen“ (ggf. „Änderungen verwerfen“).
2. `bedarf !== 'pflicht'` → `keinArbeitsordner`
3. Projektion nicht `ok` oder `dateien`/`basis` nicht `ok` → `nichtBestimmbar`
4. `dateien.anzahl > 0` → bereit, `art: 'commit'`
5. `basis.voraus > 0` → bereit, `art: 'push'` („Commits noch nicht auf main“)
6. sonst → `nichtsOffen`

Abnahme offen ⇒ bereit (O2, belegt `advisor-b2b4.md` 8); Aufräumen bleibt bis zur Entscheidung gesperrt (bestehende Regel).

**Grenze (DEKLARIERT):** `voraus` zählt Commits **noch nicht auf main** (`rev-list <origin/main|main>...HEAD`,
`routen-code.mjs:372-378`) gegen den lokal bekannten Ref; die Projektion holt nie (`fetch`). Weder „gepusht“ noch „gemergt“
wird erkannt: nach `git push` und nach einem Merge im Web (hier in der Regel Squash) bleibt `voraus > 0`, bis aufgeräumt
ist. Kein Upstream-Vergleich (Entscheidung 5). Neues Finding P3.

`mitAblauf(projektion, ablauf)` → `{ ...projektion, ablauf: { ...ablauf, sichern: leiteSichernLageAb(...) } }`.

Tests `scripts/leitstand/ablauf-sichern.test.mjs`: jeder Zweig beider Funktionen, Reihenfolge, fehlende Felder, jeder
Grund in `SICHERN_GRUENDE` hat einen Text. Kein `.method` in Modul und Test (`check-f813-csrf` (4)).

## Kennung `scripts/leitstand/kennung.mjs` (rein, neutral — Advisor-Delta 11)

`LAUFID_UNZULAESSIGE_ZEICHEN` (wörtlich samt Kommentar „Spiegel von pruefeLaufId“) zieht aus dem Server hierher; der Server
importiert sie (rund 40 Verwendungen bleiben unverändert). `pruefeAblaufKennung(roh)`: `null` → `null` (fehlt);
`''`, > 200 Zeichen oder Treffer der Zeichenregel → Grundtext (400). Die 200-Zeichen-Grenze ist eine neue Regel nur für
`?workflow=` (im Modulkopf genannt). Test `kennung.test.mjs`.

## B — `?workflow=<id>` an `/api/code` und `/api/code/diff` (keine neue Route)

Reihenfolge 403 → 400 → 404 → 409 → 200 im bestehenden Block:
1. `pruefeCodeHerkunft(req)` → 403 (unverändert, auch mit Parameter).
2. `const ort = loeseCodeOrt(angefragteUrl.searchParams.get('workflow'))` (Closure im Handler, nur lesend):
   - `null` → `{ http: 200, wurzel: repoWurzel, ablauf: null }` ⇒ Antwort **bitgleich** wie heute (kein Zusatzfeld).
   - `pruefeAblaufKennung` ≠ `null` → 400 `{ grund }` — vor jedem Dateizugriff.
   - `ladeArtefaktVersion('workflow-<id>')` `null` → 404 `{ grund: 'Ablauf nicht gefunden', grund_schluessel: null }`.
   - `ermittleLaufort` nicht ok → 409 `{ grund: SICHERN_GRUND_TEXT[s], grund_schluessel: s }` mit
     `s = arbeitsordnerGrund(baueArbeitsordnerProjektion(id, daten)) ?? 'nichtBestimmbar'` (Wettlauf `existsSync`:
     `ok:false` ergibt nie `null`). Kein `Workflow '<id>'` im Text.
   - ok → `{ http: 200, wurzel: laufort.wurzel, ablauf: { workflowId, bedarf, workflowStatus, arbeitsordner:
     laufort.arbeitsordner } }`. Ohne Arbeitsordner (`kein_bedarf`, `bestand`) ist `wurzel` der Projektordner; jeder Ablauf
     mit Arbeitsordner — auch „nicht bereit“ — geht über den Arbeitsordner oder die 409, nie still über den Projektordner.
   - Die id ist nie Git-Argument und nie `cwd`: sie geht nur in `ladeArtefaktVersion`, `ermittleLaufort`,
     `baueArbeitsordnerProjektion`; `cwd` ist der Pfad aus dem Kontrollzustand.
3. `/api/code`: `codeProjektionLaufend` wird `Map<wurzel, Promise>` (Löschen in `finally`; gleichzeitige Abrufe je Laufort
   teilen einen Aufbau). Mit `ablauf` → `mitAblauf(projektion, ablauf)`; ohne → die Projektion unverändert.
4. `/api/code/diff`: `baueCodeDiff({ repoWurzel: ort.wurzel, pfad, git })` — Allowlist unverändert, im Laufort.
5. Handler-Option `codeGit` (Default `fuehreGitAus`, nur Konstruktor, nie aus der Anfrage) an beide Aufrufe.
6. Kommentare nachziehen: Kopf `scripts/leitstand/routen-code.mjs` (Z. 31, 35-38) und Serverkommentar (Z. ~8489-8496):
   `cwd` = Repo-Wurzel der Instanz oder, mit `?workflow=`, der Arbeitsordner aus dem Kontrollzustand.

## Ratsche

`entferneCodezaun`, `entferneAeusserstenCodezaun`, `extrahiereErstesJsonObjekt` samt Doku (Server Z. ~3958–4040, rein, nicht
schreibend) nach `scripts/leitstand/text-auszug.mjs`; im Server `import { … }` + `export { … } from` (Laufzeit-Importe
`check-f22-click-to-work.mjs:62`, `check-f31-gedaechtnis.mjs:49`). Hinweise auf den Ort nachziehen (Serverkopf `:19`,
`src/capabilities-ansicht/index.ts:109`, soweit sie den Ort nennen). Zuwachs ≈ +20, Ausgleich ≈ −83 + 3, LAUFID −1 ⇒ netto ≈ −60.
Danach `obergrenze_zeilen` in `scripts/wachstumsbremse-server.json` auf das Ist. Kein neues Routen-Literal.

## Gate `scripts/check-f45-b2b4a1-sichern.mjs` (in `check:gates`)

- (a) Ableitung: jeder Zweig von `arbeitsordnerGrund` und `leiteSichernLageAb`, Reihenfolge, Rotfälle (je eine Bedingung
  gekippt ⇒ anderes Ergebnis); jeder Schlüssel hat einen Text; kein Text enthält eine Kennung.
- (b) HTTP mit echtem Handler, Attrappen zur Laufzeit (tmp-Repo mit Commit auf `main` und Arbeitsbranch, Worktree über den
  echten Startweg mit Attrappen-Worker, Muster `check-f45-b2b3b2b2b2b1-projekt-cli.mjs`):
  - ok, Datei im Worktree geändert → `absoluterPfad` = Arbeitsordner, `branch.name` = `wf/<id>`, `ablauf.sichern` bereit/commit;
  - nach Commit im Worktree → bereit/push; Ablauf nicht ABGESCHLOSSEN → `nichtAbgeschlossen`;
  - Ablauf ohne Arbeitsordner → Projektordner, `keinArbeitsordner`;
  - unbekannte id → 404; leer / `../x` / > 200 Zeichen → 400;
  - Pflicht ohne angelegten Ordner → 409 `nichtAngelegt`; Ordner von Hand entfernt → 409 `ordnerFehlt`; Grund ohne id;
  - `/api/code/diff?workflow=<id>&pfad=…` liefert den Diff aus dem Arbeitsordner, ein Pfad nur im Projektordner → 400;
  - fremde Herkunft mit Parameter → 403.
- (c) ohne Parameter bitgleich: Antwort = direkter `baueCodeProjektion({ repoWurzel, vorlage, startvorlagePfad })` ohne
  zeitabhängige Felder (`freigabeCommit.alterMinuten`, `verlauf.eintraege[].abstandMinuten`), kein Feld `ablauf`;
  `/api/code/diff` ohne Parameter wie heute.
- (d) id nie in Git-Argv: Spion über `codeGit` — kein argv-Element enthält die id, `cwd` ist der Arbeitsordner.
- (e) Ratsche: `check-wachstumsbremse-server` grün (Zeilen = Grenze, Bestand unverändert), `starteWorkflowSchritt(` = 6.
Nach dem Bau: Gegenprobe je Teil (Mutation am Modul bzw. am Server, danach zurückgesetzt) im Bericht.

## Doku (4a-1)

- F-979, F-1087: Nachtrag „Server-Teil gebaut (B2b-4a-1): Ableitung `ablauf-sichern.mjs`, `?workflow=`; Anzeige folgt in 4a-2“.
- Neu HARNESS_IMPROVEMENT P2: „Voller npm run check bricht in der Claude-Code-Sitzung mit Speichermangel ab (3 von 4 Läufen
  am 18.10.; im frischen Terminal stabil grün, ~4,7 min)“ — Maßnahme: `--test-concurrency` im test-Skript begrenzen +
  Laufzeit messen; nur Eintrag.
- Neu TECH_DEBT P3: „‚noch nicht auf main‘ ist nicht ‚ungepusht‘: gepusht und gemergt (Squash, kein fetch) werden lokal nicht
  erkannt“ — Maßnahme: beobachten; Upstream-Vergleich nur bei realem Bedarf.
- Neu TECH_DEBT P3: „Commit-Vorschlag für wf/<id>-Branches enthält die interne Ablauf-ID; Quelle für einen Titel wäre der
  Auftragstitel (Serverfeld ablauf.titel)“ — Maßnahme: UX-Runde nach R.
- `docs/STATUS.md` ~Z. 103 und `docs/projekt/kontext/lagebild.md` ~Z. 104: W1 und B2b-3b-2 gemergt, B2b-4a-1 gebaut,
  4a-2/4b folgen.
- `docs/projekt/fixpaket-f45.md`: Teilung B2b-4 (4a-1 / 4a-2 / 4b). `features/F45/feature.md` nachziehen.
- `features/F45/nachweise/b2b4a1/powershell-versuch.md`: Vorabversuch Windows PowerShell 5.1 (a/b/c), geschwärzt; Grenzen:
  pwsh 7 nicht installiert, echtes Einfügen von Hand nur nachgebildet — Stefan prüft es in 4a-2 im Leitstand.
- ARCHITECTURE.md: keine Änderung (keine neue Regel; Wachstumsbremse und §2 Arbeitsordner gelten; `?workflow=` liest nur).

## Prüfpass nach dem Bau

`code-reviewer` und `qa` (frischer Kontext). `design-guardian` entfällt (keine UI-Änderung). Nur betroffene Tests/Gates:
`ablauf-sichern.test.mjs`, `kennung.test.mjs`, `text-auszug`-Abdeckung über `check-f22-click-to-work` und
`check-f31-gedaechtnis`, `routen-code.test.mjs`, neues Gate, `check-wachstumsbremse-server`, `check-f813-csrf`,
`check-f814-host`, Lint/Typprüfung der geänderten Dateien.

## Risiken

- Projektion im Worktree: `baueStartvorlageAuszug` macht den Startvorlagenpfad dort zum Dateinamen (Anzeige, harmlos).
- Map-Schlüssel: unterschiedlich geschriebene Pfade teilen keinen Aufbau (harmlos).
- Ohne UI in 4a-1 hat der Server-Teil noch keinen sichtbaren Nutzen; F-1087 bleibt bis 4a-2 sichtbar.
