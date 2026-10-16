# F45 W1 — Wachstumsbremse Leitstand-Server + B2b-3e-3 + F-1123 (18) — Plan v1

Stand 16.10.2026, Branch `f45/w1-wachstumsbremse` (= main `3c46adf`, nach B2b-3e-2). Advisor-Pass fällig: neues blockierendes
Gate, Löschen im Dateisystem (Aufräumen), Schreibpfad der Auftragsversion. Entscheidung Stefan E-WART-1 = A (16.10.2026):
jetzt nur die Bremse, die Aufteilung ist W2.

## CONTEXT

- `scripts/leitstand-server.mjs`: 13 455 Zeilen (gemessen auf main `3c46adf`, Anzahl `\n`); nächstgrößte Datei ≈ 3 500.
- Routen-Dispatch heute ausschließlich im Server über die Variable `pfad` (`const pfad = angefragteUrl.pathname`,
  :8347): 57× `pfad === '…'`, 22× `pfad.startsWith('…')`, 15× `pfad.endsWith('…')` — 39 + 8 + 14 verschiedene Literale.
  Kein `.test(pfad)`/`match` auf dem Request-Pfad. Die Module `scripts/leitstand/routen-*.mjs` enthalten bisher reine
  Logik (Projektionen, Formprüfung), keinen Dispatch (routen-f39.mjs Kopf: D13-Dispatch bleibt im Server).
- F-1125 Nachtrag B2b-3e-2 + `features/F45/advisor-b2b3e2-delta.md` Befund 1–3 + Plan b2b3e2-v2 §5 (Entwurf) und Nachtrag
  (Auflagen) sind die Vorgabe für das Aufräumen.
- F-1123 (18): alter Auftrag mit nach der Regel von B2b-3e-2 ungültigen `bereiche` (oder `budget_tokens` > MAX_SAFE) ⇒ jede
  neue Version scheitert in `registriereAuftrag` → `validiereAuftragDaten` (src/auftrag/index.ts:109-110): „Budget erhöhen“
  500 (leitstand-server.mjs:11503-11507), Einrichtung abhaken 500 (:11578-11582), Übernahme der Einrichtung im Nachlauf des
  Architekten `{ ok: false }` (:6198-6202). Alle drei reichen `optionenAusAuftrag(auftrag.daten)` (src/auftrag:344) durch.
- Grenzen des Auftrags: kein Umbau/Verschieben im Server (W2); Server nur, wenn unvermeidlich und netto ohne Zuwachs;
  `starteWorkflowSchritt(` bleibt 6×; Rückfrage-Kanal unberührt/aus, Argv bitgleich; package.json nur die Gate-Zeile;
  `kontrollzustand/` nie stagen.

## 1 Gate `scripts/check-wachstumsbremse-server.mjs` (neu, letzte Stelle vor `check-secrets` in `check:gates`)

Daten in `scripts/wachstumsbremse-server.json` (neu, eine Quelle für Grenze und Bestand):
`{ "obergrenze_zeilen": 13455, "routen": { "gleich": [...39], "beginnt": [...8], "endet": [...14] } }` — aus dem Code erhoben.

Reine Funktionen (exportiert, Gate läuft nur am Haupteinstieg, Muster check-f46-bestand.mjs:92):
- `zaehleZeilen(text)` = Anzahl `\n` (+1, wenn die letzte Zeile ohne Umbruch endet) — CRLF/LF gleich.
- `erhebeRouten(text)` → `{ gleich, beginnt, endet }` je sortiert/eindeutig über
  `/\bpfad\s*[!=]==\s*'([^']*)'/g`, `/\bpfad\.startsWith\(\s*'([^']*)'\s*\)/g`, `/\bpfad\.endsWith\(\s*'([^']*)'\s*\)/g`
  (auch `"…"`). Literale `'/…'` nur — kein Pfad-Filter, `'/'` gehört dazu.
- `pruefeWachstumsbremse({ serverText, bremse, bremseMain })` → Befundliste:
  - (a1) `zaehleZeilen(serverText) > bremse.obergrenze_zeilen` ⇒ rot („… Zeilen, Grenze …: neue Teile nach
    scripts/leitstand/<thema>.mjs“).
  - (a2) `bremseMain !== null && bremse.obergrenze_zeilen > bremseMain.obergrenze_zeilen` ⇒ rot („Grenze angehoben“).
  - (b1) je Art: Literal im Server, das nicht im Bestand steht ⇒ rot („neue Route im Server — in
    scripts/leitstand/routen-*.mjs“).
  - (b2) `bremseMain !== null`: Bestandseintrag, der auf main nicht im Bestand stand ⇒ rot („Bestand erweitert“).
  - Hinweise (nicht rot): Server unter der Grenze ⇒ „Grenze kann auf N sinken“; Bestandseintrag ohne Literal im Server ⇒
    „kann aus dem Bestand“.
- Referenz `bremseMain`: `git show origin/main:scripts/wachstumsbremse-server.json` (cwd = Wurzel, `execFileSync`, Fehler
  still); scheitert git, fehlt die Datei auf origin/main (erster Merge) oder ist sie kein gültiges JSON ⇒ `null` mit Hinweis
  „Referenz main nicht lesbar — nur Wert in der Datei“. Wurzel = `import.meta.dirname/..` (für den Rot-Nachweis wird das Gate
  in die Kopie gelegt, F-1127-Muster).
- (i) Invariante wie b2b3e2 (i): `starteWorkflowSchritt(` im Server 6×.

Grenze ehrlich benennen (Kopf): Durchsetzungsgrad = Textmuster. Umgehbar durch Dispatch über eine andere Variable, eine
Regex, eine Konstante als Argument oder ein Literal in einem anderen Modul, das der Server mit eigenem Präfix
zusammensetzt; durch Bearbeiten des Gates selbst. Reviewer-Sache, nicht Gate-Sache.

Unit-Tests `scripts/check-wachstumsbremse-server.test.mjs` (node:test, rein, ohne Platte): (a1) rot/grün an der Grenze
(= Grenze grün, +1 rot), CRLF = LF; (a2) Anheben rot, gleich/Senken grün, `bremseMain = null` ⇒ kein (a2); (b1) neues
`pfad === '/api/neu'` rot, `startsWith`/`endsWith` neu rot, `!==` erfasst; Entfernen grün; (b2) Bestand erweitert rot;
Hinweise. Plus: `erhebeRouten` auf dem echten Server = JSON-Bestand (Gleichheit, damit die Datei nicht schon bei Bau
abweicht).

Rot-Nachweis gegen präparierte Kopien (manuell, protokolliert in `features/F45/nachweise/w1/rot-nachweis.md`):
`git archive HEAD | tar -x -C <scratchpad>/w1-kopie-<fall>`; in der Kopie `git init` + ein Commit + `git update-ref
refs/remotes/origin/main HEAD` (eigenes Mini-Repo im Scratchpad, kein Worktree des Projekts); dann je Fall eine Änderung und
`node scripts/check-wachstumsbremse-server.mjs` ⇒ Exit 1 mit genau dem Fall-Befund:
(a1) eine Zeile an den Server anhängen; (a2) `obergrenze_zeilen` +1 im JSON (und Server +1); (b1) `if (pfad ===
'/api/w1-probe') {}` im Server — dazu eine Zeile anderswo entfernen, damit (a1) nicht mitfeuert; (b2) `/api/w1-probe` in
den JSON-Bestand und in den Server (ohne Zuwachs). Grün-Fälle: dasselbe `pfad === '/api/w1-probe'` in
`scripts/leitstand/routen-w1probe.mjs`; eine Route aus dem Server entfernt; Kopie ohne git ⇒ Rückfall, grün.

## 2 B2b-3e-3: alte Laufordner beim Start der neutralen Umgebung aufräumen (F-1125-Restpunkt)

Neu in `scripts/neutrale-umgebung.mjs` (rein, `fs` injizierbar, kein Seiteneffekt beim Import), nach Plan b2b3e2-v2 §5 mit
den Auflagen Delta-Advisor 1–3:
- `markiereLauf(laufordner, { fs, pid })` schreibt `<laufordner>/pid` (`String(pid)`). Scheitert das ⇒ Warnung, der Lauf
  läuft weiter; ein unmarkierter Lauf ist für andere erst nach 24 h räumbar (Ordner-mtime) — festes Verhalten.
- `raeumeAlteLaeufeAuf({ wurzel, eigener, fs, istTot, jetzt, warne })`:
  `readdirSync(wurzel, { withFileTypes: true })` (Fehler ⇒ Warnung, `[]`); je Dirent mit `isDirectory()` (Symlink/Junction
  ⇒ `isDirectory()` false ⇒ übersprungen) und Name `/^lauf-[A-Za-z0-9]{6}$/`, außer `basename(eigener)`:
  - `pid` lesbar und `/^[1-9][0-9]*$/` ⇒ entfernen, wenn `istTot(pid)`;
  - sonst (fehlend, leer, halb, keine positive Ganzzahl) ⇒ entfernen, wenn `jetzt - statSync(ordner).mtimeMs > 24 h`.
  - `istTot(pid)` Standard: `process.kill(pid, 0)` wirft mit `code === 'ESRCH'` ⇒ true; kein Wurf oder jeder andere Code
    (`EPERM`, …) ⇒ false (sichere Richtung).
  - Entfernen `rmSync(recursive, force, maxRetries 10, retryDelay 100)`; Fehler ⇒ Warnung mit Pfad, weiter. Rückgabe: Liste
    der entfernten Pfade.
- `neutrale-umgebung-starten.mjs`: nach `richteNeutraleUmgebungEin` erst `markiereLauf(laufordner, { pid: process.pid })`,
  dann `raeumeAlteLaeufeAuf({ wurzel: dirname(laufordner), eigener: laufordner })`; Ausgabe der entfernten Ordner. Importe
  weiter nur `./neutrale-umgebung.mjs` (+ `node:`), Gate 3e-1 (p2b).
- `richteNeutraleUmgebungEin` unverändert (Test/Gate 3e-1 prüfen seine Aufruffolge).
- Tests (`scripts/neutrale-umgebung.test.mjs`, injiziertes `fs`, keine Platte, Starter nie importiert): fremder Lauf mit
  toter pid ⇒ entfernt; lebende/EPERM ⇒ bleibt; ohne pid jung ⇒ bleibt, alt (> 24 h) ⇒ entfernt; `pid` leer/`0`/`-3`/`12x`
  ⇒ mtime-Regel; eigener nie; Datei `lauf-abcdef` und Symlink ⇒ übersprungen; fremder Name (`andere`, `lauf-zu-lang1`) ⇒
  bleibt; `readdirSync` wirft ⇒ `[]` + Warnung; `rmSync` wirft ⇒ Warnung, nächster wird trotzdem geprüft; `markiereLauf`
  schreibt `pid`, Schreibfehler ⇒ Warnung, kein Wurf; `istTot`-Standard mit injiziertem `kill` (ESRCH/EPERM/kein Wurf).
- Grenzen: PID-Wiederverwendung ⇒ toter Lauf bleibt (sichere Richtung); Rest F-1125 (R1)–(R8) bleibt offen (nicht Teil dieses
  Auftrags).

## 3 F-1123 (18): Bestandsschutz in `registriereAuftrag` statt 500

Entscheidung (Plan): **tolerant lesen als Bestandsschutz**, im Modul statt im Server — deckt alle drei Schreibwege
(Budget, Einrichtung, Nachlauf) ohne Server-Zeile.
- `registriereAuftrag` lädt die letzte Version `auftrag-<id>` (`ladeArtefaktVersion`, gleiche basisVerzeichnis, stiller
  Schreiber). Gibt es sie und ist `daten.bereiche` (bzw. `daten.budget_tokens`) deep-gleich dem Wert dort, prüft
  `validiereAuftragDaten` diesen Wert nur noch strukturell (Array mit ≥ 1 nicht-leerem String bzw. Zahl ≥ 1) statt mit
  `pruefeBereich`/`pruefeBudgetTokens`. Umsetzung: `validiereAuftragDaten(daten, { bestand })` mit optionalem zweiten
  Parameter; ohne `bestand` unverändert (Gate b2b3e2 (r2)/(b1) bleiben grün).
- Ein geänderter oder neuer Wert wird voll geprüft ⇒ ein neuer ungültiger Eintrag bleibt abgewiesen (POST /api/auftraege
  unverändert, `pruefeAuftragsformular` vor dem Schreiben).
- Tests `src/auftrag/auftrag.test.ts`: Altauftrag mit `bereiche: ['src/*.ts', '/etc/']` und `budget_tokens: 1e300` direkt
  über `registriereKernArtefakt` geschrieben ⇒ `registriereAuftrag(..., { ...optionenAusAuftrag(alt), budget_tokens: 5000 })`
  wirft nicht, Version trägt die alten `bereiche`; dieselbe Version mit `bereiche: ['src/*.ts', 'neu/*.ts']` wirft; ohne
  Vorgänger ⇒ wirft wie bisher.
- Gate-Fall: in `scripts/check-f45-b2b3c-budget.mjs` neuer Fall (b13) am realen Pfad: Altauftrag mit ungültigen `bereiche`
  ⇒ POST …/budget 200, neue Version mit erhöhtem Budget und unveränderten `bereiche`.

## 4 Dokumente

- `state/findings.md`: F-371 P2 → P1, Status-Nachtrag (13 455 Zeilen am 16.10.2026, erste Auslagerung `routen-f39.mjs` und
  weitere `routen-*.mjs` mit Logik, Dispatch bleibt im Server; W1 erledigt = Gate; Maßnahme W2). F-509 Verweis auf W1.
  Neu **F-1129** HARNESS_IMPROVEMENT P2 „Datei-Köpfe nach docs/kommentar-standard.md werden von keinem Gate geprüft und
  können veralten“ → W2 (Gate: Kopf vorhanden, „Wird aufgerufen von“-Pfade existieren). Neu **F-1130**
  PROCESS_IMPROVEMENT P3 „Kommentar-Köpfe teils sehr lang (z. B. src/review-stand/index.ts) — Token- und Lesekosten“ → W2
  (Standard verschlanken). F-1123: P3 → P2 (wegen (18)), Nachtrag (18) erledigt. F-1125: Nachtrag 3e-3 erledigt.
- `docs/projekt/fixpaket-f45.md`: §3 Zeilen W1 (erledigt) und W2 (Inhalt aus dem Auftrag, ≈ 1,5–3 AT); §3 Reihenfolge-Zeile
  „ab jetzt: W1 → B2b-3b-2 → B2b-4 → Fähigkeit bauen → B5a/B5b → B3 → W2 → R → R2 → F30“; §5 E-WART-1 = A.
- `docs/STATUS.md` nachziehen, falls das Status-Gate es verlangt.
- `package.json`: nur die Gate-Zeile.

## 5 Dateien (≈ 12)

Neu: `scripts/check-wachstumsbremse-server.mjs`, `.test.mjs`, `scripts/wachstumsbremse-server.json`,
`features/F45/nachweise/w1/rot-nachweis.md`. Geändert: `package.json`, `scripts/neutrale-umgebung.mjs`, `-starten.mjs`,
`.test.mjs`, `src/auftrag/index.ts`, `src/auftrag/auftrag.test.ts`, `scripts/check-f45-b2b3c-budget.mjs`,
`state/findings.md`, `docs/projekt/fixpaket-f45.md` (+ ggf. STATUS). Server: unberührt.

## Offene Punkte, nicht stillschweigend entschieden

1. **Ratchet straff oder locker?** Plan: Unterschreiten der Grenze nur Hinweis. Folge: entfernt jemand 50 Zeilen, dürfen
   später 50 wieder dazukommen, solange niemand die Grenze senkt. Straff (Grenze muss = Ist) erzwingt bei jeder Server-
   Änderung eine Gate-Datei-Änderung — Reibung, aber echte Ratsche.
2. **Referenz `origin/main`** kann lokal veraltet sein (kein fetch im Gate) oder im Cloud-Clone fehlen (Challenger
   `npm ci && npm run check` ⇒ Rückfall auf die Datei, also kein (a2)/(b2)). Alternativen: `main` statt `origin/main`, oder
   `git merge-base`. Plan: `origin/main`, Rückfall still mit Hinweis.
3. **Was zählt als Route?** Nur Literale an `pfad`. Eine neue Route im Server über eine Konstante oder Regex fiele durch.
   Plan: Grenze im Kopf benennen, nicht verschärfen. Alternative: zusätzlich jedes `'/api/…'`-Literal im Server (auch in
   Meldungen/Kommentaren) gegen einen Bestand — robuster, aber Fehlalarme bei neuen Fehlermeldungen.
4. **Wie sieht eine neue Route in `routen-*.mjs` überhaupt aus?** Heute dispatcht kein Modul; ein Modul braucht einen Aufruf
   im Server (≥ 1 Zeile Zuwachs pro Modul, z. B. `if (await behandleXyz(req, res, pfad, kontext)) return`). Mit Ratsche auf
   Ist-Stand muss jeder solche Aufruf durch Kürzung an anderer Stelle bezahlt werden. Soll W1 einen einmaligen Sammel-Hook
   (Liste von Routen-Modulen, eine Schleife) vorsehen? Plan: nein (wäre Umbau im Server, W2); B2b-3b-2 und Folgende
   bezahlen ihre Zeilen.
5. **F-1123 (18): Bestandsschutz vs. 4xx.** Bestandsschutz lässt ungültige Altwerte weiterleben (sie treffen im Umfangs-
   Abgleich still nichts, „Vereinbart: …“ zeigt sie). 4xx wäre ehrlicher am Ort, braucht aber drei Server-Stellen (nicht netto
   null) und lässt den Altauftrag weiter unbenutzbar. Zusätzliche Ladung einer Version je `registriereAuftrag`.
6. **Zuschnitt:** drei unabhängige Teile in einem Auftrag (Gate, Aufräumen, Bestandsschutz). Je klein; gemeinsam ≈ 12 Dateien.
