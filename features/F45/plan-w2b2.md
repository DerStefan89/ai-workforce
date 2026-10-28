# F45 W2b-2 — Wegwerf-Ordner und Fristen — Plan v1

Stand 27.10.2026, Branch `f45/w2b2-wegwerf-ordner` (Basis main `8c3e3a8`, nach #389). Auftrag: Challenger 27.10.2026
(„F45 W2b-2 Wegwerf-Ordner und Fristen“). Grundlage `w2-gate-inventur.md` Befunde 3 und 4, F-590, F-1215, F-1230.

## Basis (lesend geprüft)

- **Wegwerf-Ordner relativ zur Repo-Wurzel** (BELEGT `grep -rln kontrollzustand-test scripts src`): 54 Gates der Kette
  plus `check-f20-leitstand-shell` (CI-Schritt außerhalb der Kette), 8 Testdateien unter `scripts/` und 11 unter `src/`
  (`BASIS = 'kontrollzustand-test'` bzw. `` `kontrollzustand-test-<fall>-${randomUUID()}` ``). Formen: (a) fester Name
  `'kontrollzustand-test-f10-ak3'`, (b) Name mit UUID, (c) gemeinsame Basis `'kontrollzustand-test'` mit Unterordner je
  `laufId`. Aufräumen heute je Fall in `finally` über `raeumeVerzeichnis` (R1), aber nicht bei Abbruch (F-590). In der
  Wurzel liegen gerade 20 Reste (`ls kontrollzustand-test*`).
- Produktcode nimmt absolute Basisverzeichnisse ohne Sonderfall (BELEGT `src/checkpoint-store/index.ts:86`
  `join(basisVerzeichnis, laufId, …)`); `join(repoWurzel, basisverzeichnis)` gibt es nur für Projektregister-Einträge
  (`scripts/leitstand/projekt-pfade.mjs:24`, `leitstand-server.mjs:13103`) — die betroffenen Gates (f25, f41) legen ihre
  Projekte schon unter `os.tmpdir()` an bzw. prüfen dort die reine Pfadauflösung.
- **startvorlagen/**: `check-f10-leitstand` (`startvorlagen/test-f14-ws4-zeitgrenze.json`), `check-f14-abbruch` und
  `check-f15-automat-real` (je `join('startvorlagen', dateiname)`) schreiben feste Dateien; `check-f16` (e) liest jede Datei
  dort. `startvorlagePfad` ist bereits Handler-Option und darf absolut sein (BELEGT `src/ressourcen/index.ts:634`
  `resolve(repoWurzel, startvorlagePfad)`); `profil_pfad` in der Vorlage bleibt repo-relativ wie bisher.
- **kontrollzustand-roh/**: die Gateways schreiben `rohstrom.json` nach `rohBasisVerzeichnis ?? 'kontrollzustand-roh'`
  (`src/claude-code-gateway/index.ts:1221`, `src/codex-gateway/index.ts:377`). Der Server reicht sein ganzes
  `optionen`-Objekt an F8 durch (BELEGT `leitstand-server.mjs:6524` `...optionen`), F8 reicht `rohBasisVerzeichnis` an
  beide Gateways (`src/execution-controller/index.ts:571/593`). ⇒ **Keine Produktänderung nötig**: f14/f15-automat-real
  geben `rohBasisVerzeichnis` als Handler-Option mit. Lokal liegen 13 050 Rohstrom-Ordner (überwiegend `node -e`-Läufe aus
  f14/f15, `f14a-`/`f14b-`/`jarvis-jarvis-chat-`). Leser des Rohstroms (`result-evaluator` `readFileSync(pfad)`,
  `leitstand-server.mjs:3898`) nehmen den Pfad aus der Laufakte wörtlich, absolut geht; nur die Anzeige-Projektion
  (`baueRohstromProjektion`, gegen `installWurzel`) fände ihn nicht — f14/f15 fragen sie nicht ab.
- **Fristen ≤ 10 s** in den 11 Gates der Spalte Parallel-Risiko: `warteBis(…, 2000–6000)`, `pruefZeitgrenzeMs: 10000`,
  `while (Date.now() - beginn < 10000)`, `warte(…, ms = 10000)`. Zeitfaktor: `scripts/_zeitfaktor.ts` `skaliert(ms)`,
  Standard 1.
- **Wegwerf-Git-Repos:** 75 Dateien unter Gates/Tests rufen `git init` (≈ 90 echte Aufrufstellen, davon fast alle mit
  Commit). Die drei Einstellungen setzt bisher nur `check-f45-b2a3b-review-stand` `legeRepoAn()` (F-1230, PR #389 grün).
  Produkt-Git-Aufrufe laufen mit bereinigter Umgebung (`src/git-starter/index.ts:103` entfernt jede `GIT_*`-Variable) —
  eine Umgebungslösung (`GIT_CONFIG_COUNT`) erreichte sie nicht; die Einstellung muss in die Repo-Konfiguration.

## Vorgehen

1. **Helfer `scripts/_wegwerf.ts`** (neu, ≈ 30 Zeilen; Ort und Importrichtung wie `scripts/_aufraeumen.ts`):
   - `wegwerfOrdner(kennung)` → `mkdtempSync(join(tmpdir(), 'aiw-<kennung>-'))`, registriert einmal
     `process.on('exit', () => raeumeVerzeichnis(pfad))` (R1: `rmSync` mit `maxRetries` über `raeumeVerzeichnis`,
     F-590-Toleranz bleibt). Der Exit-Hook ist das `finally` auf Prozessebene: er läuft auch nach `process.exit(1)` am Ende
     eines roten Gates, wo ein `finally` nicht mehr läuft; bei hartem Abbruch bleibt der Rest im Temp-Ordner des Systems
     statt in der Repo-Wurzel.
   - `schalteGitWartungAb(repo)` → hängt `[gc] auto = 0`, `[maintenance] auto = false, autoDetach = false` an
     `<repo>/.git/config` (kein Kindprozess; gleiche Wirkung wie dreimal `git config`, PR #389).
   Ein gemeinsamer Helfer spart Zeilen: je Datei 1 Import + 1 Zeile statt 3 Importe + mkdtemp + Hook.
2. **Gates und Tests umstellen** (mechanisch, je Datei geprüft): je Datei eine Konstante
   `const WEGWERF = wegwerfOrdner('<gate>')`; dann (a) `'kontrollzustand-test-xyz'` → `join(WEGWERF, 'xyz')`,
   (b) `` `kontrollzustand-test-xyz-${randomUUID()}` `` → `` join(WEGWERF, `xyz-${randomUUID()}`) ``,
   (c) `BASIS = 'kontrollzustand-test'` → `BASIS = WEGWERF`. Die bestehenden `finally`-Aufräumer je Fall bleiben unverändert
   (sie räumen jetzt im Temp-Ordner); die Pfade existieren wie bisher erst, wenn der Code sie anlegt — keine
   Semantikänderung außer dem Ort. Projektregister-Einträge (`basisverzeichnis` relativ zu `repo_pfad` unter `os.tmpdir()`)
   bleiben, weil sie schon im Temp-Ordner liegen. Kommentare, die `kontrollzustand-test/` als Ort nennen, ziehe ich in den
   geänderten Dateien nach. `.gitignore`-Eintrag `kontrollzustand-test*/` bleibt (Netz für alte Stände/Worktrees).
3. **startvorlagen/ und Rohströme (f10, f14, f15-automat-real):** Wegwerf-Startvorlagen nach `join(WEGWERF, dateiname)`
   (Pfad an den Server wie bisher als `startvorlagePfad`); f14/f15-automat-real geben zusätzlich
   `rohBasisVerzeichnis: join(WEGWERF, 'roh')` an jeden Testserver bzw. direkten F8-Aufruf. Kein Produktcode geändert.
4. **Fristen (11 Gates):** jede feste Frist ≤ 10 s, mit der ein Gate auf Server-, Workflow- oder Kindprozess-Zustand wartet,
   läuft über `skaliert(ms)`; Fristen > 10 s und Produktwerte wie `zeitgrenze_ms: 600000` bleiben. Kopf von
   `_zeitfaktor.ts` „Wird aufgerufen von“ ergänzt.
5. **SERIELL** (`scripts/check-kette.mjs`): heraus die Repo-Baum-Läufer (check-docs, check-rules, check-f45-k-kontext,
   check-secrets) und die startvorlagen-Gruppe (f10, f14, f15-automat-real) ⇒ 23 → 16. Bleiben, je mit Kommentar: die 15
   Zeit-/Frist-Gates (Frist jetzt skalierbar, der Läufer fährt aber Standard 1 — herausnehmen erst nach einer Messung mit
   Last, F-1215) und f3b1 (echtes `~/.ai-workforce`). Kopfkommentar des Läufers (Abweichung (1)) nachziehen.
   Voraussetzung für das Herausnehmen der Repo-Baum-Läufer: kein Gate schreibt während des Laufs mehr in den Repo-Baum —
   Beleg in der Sitzung: vor/nach jedem einzeln gelaufenen geänderten Gate Liste der Repo-Wurzel, Anzahl
   `kontrollzustand-roh/*`, Liste `startvorlagen/` und `git status --porcelain --ignored` vergleichen (nur Gates, die ich
   anfasse; die übrigen schrieben laut Inventur schon nicht in den Baum).
6. **git-Hintergrundwartung (F-1230):** `schalteGitWartungAb(repo)` direkt nach jedem `git init` eines Wegwerf-Repos in
   Gates und Tests, in denen danach committet wird (maintenance/gc --auto läuft nach Commit; „git-Zustand messen“ tut
   danach praktisch jede dieser Dateien — Status, HEAD, Diff, `.git/index` bzw. `.git/objects` in routen-code.test.mjs und
   b2a3b). `legeRepoAn()` in b2a3b behält seine drei `git config`-Aufrufe (dort belegt, nicht anfassen). Repos ohne Commit
   bleiben. F-1230 → erledigt.
7. **Messen und Doku:** Zusammenfassungszeile des Läufers aus dem Commit-Block (Wanduhr, Σ Einzelzeiten) neben W2a/W2b-1
   lokal 739/826/719 s im Bericht und in der Akte. Akte F45 „Stand W2b-2“, Inventur „Stand W2b-2“ (Befunde 3/4, Spalte
   Parallel-Risiko nicht Zeile für Zeile — ein Satz), Findings (Auftrag Punkt 7), E-PRUEF-2 = B in Akte F45
   (Entscheidungen) und `docs/projekt/fixpaket-f45.md` neben E-PRUEF-1, Lagebild neu.

## Prüfung

- Jedes geänderte Gate einzeln (seriell, im Hintergrund, mit Vorher/Nachher-Vergleich aus 5.), geänderte Testdateien mit
  `node --test`, `npm run lint`, `npm run typecheck`, `check-docs`, `check-kette.test.mjs`, `check-rules`.
- Rotprobe Helfer: Test `scripts/_wegwerf.test.ts` — Ordner liegt unter `tmpdir()`, ist nach Prozessende weg (Kindprozess),
  `.git/config` nach `schalteGitWartungAb` mit `git config --get` 0/false/false.
- Voller Lauf nur im Commit-Block (Auftrag: plattformsensibel ⇒ voller lokaler Lauf).

## Risiken

- Ein Gate verlässt sich darauf, dass das Basisverzeichnis unter der Repo-Wurzel liegt (Evidenzpfade gegen
  `repoWurzel`/`installWurzel` aufgelöst) — fällt beim Einzellauf rot auf; dann bleibt der Fall mit Kommentar im Repo und
  der Repo-Baum-Läufer-Teil von 5. wird neu bewertet (STOPP, kein stilles Umgehen).
- `tmpdir()` liegt unter Windows auf C:, Repo ebenfalls; Virenscanner im Temp-Ordner — F-590-Toleranz bleibt.
- Diffgröße: ≈ 75 Dateien, überwiegend 1–3 Zeilen je Fundstelle.

## Nicht im Umfang

Gate-Aussagen abschwächen/streichen; Biome/Formatierer (W2c); Gates in Tests umschreiben (F-1228); Produktverhalten;
Frist-Gates aus SERIELL nehmen.
