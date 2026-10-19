# F45 B2b-4a-2a „Blockform“ — Plan v2

Stand: 19.10.2026, Branch `f45/b2b4a2-anzeige` = `origin/main` `7a56d86` (#366). Verlauf: `plan-b2b4a2.md` (v1) → `advisor-b2b4a2.md`
(Nicht freigegeben, knapp zu groß) → Entscheidung Challenger 19.10.2026: Schnitt wie Advisor-Vorschlag; jetzt nur 4a-2a; 4a-2b folgt
nach dem Merge; O2 = ja (in 4a-2b). Schließt **F-1088 (5) für den Leitstand** (Jarvis-Regel → 4b).

## CONTEXT

- Nur Oberfläche/Client-Regel: `public/leitstand/code-daten.js`, `befehlsblock.js`, `views/auftrag-umgebung.js`, Kommentare in
  `views/code.js`/`views/workboard.js`, i18n ×4, eine CSS-Zeile höchstens. **Kein Server-Eingriff** (Ratsche 13.366 unverändert; der Server
  importiert weiter nur `cdZeile`), keine Route, kein Schema, keine Hooks/settings, `starteWorkflowSchritt(` 6×.
- Unverändert und bewusst außerhalb: Jarvis-Regel (`cdZeile` im Server, `src/jarvis`, Gate `check-f45-b2a3-codex-review`) → 4b. Chat-Blöcke
  aus Modellausgaben werden nicht umgeformt (nur gezählt/angezeigt, siehe 1.3).
- Grundlage Shell-Verhalten: `nachweise/b2b4a1/powershell-versuch.md` (a)–(c); neu (d)–(f) in diesem Paket.

## 1 — Eine Regel für alle Befehlsblöcke

### 1.1 `code-daten.js`
- `BLOCK_KOPF = '& {'`, `BLOCK_FUSS = '}'` (exportiert, eine Quelle für Erzeuger, Zählung und Hinweis).
- `ortZeile(pfad)` = `Set-Location -LiteralPath ${psArgument(pfad)} -ErrorAction Stop` — immer `-LiteralPath` (Platzhalterzeichen egal).
- `befehlsBlock(pfad, folge)` → `[BLOCK_KOPF, ortZeile(pfad), ...folge, BLOCK_FUSS]`, ohne Einzug (Advisor-Delta 4a 5); `null` ohne
  absoluten Pfad (`ABSOLUTER_PFAD`).
- `istBlockform(zeilen)` → `zeilen[0] === BLOCK_KOPF && zeilen.at(-1) === BLOCK_FUSS`.
- `befehlsBloecke(pfad, folgen)`: `{ grund: 'keinPfad' }` wie heute, sonst je nicht leerer Folge `befehlsBlock` ⇒ Sichern (commit, push)
  und Prüfstand in Blockform; push bleibt ein eigener Block.
- `cdZeile` bleibt unverändert und nur noch für die Jarvis-Regel des Servers (Doku: „nicht für Leitstand-Blöcke; Jarvis-Regel → 4b“).
- Kopf und Doku (`befehlsBloecke`, `sicherBefehle`, `pruefstandBefehle`) nachziehen (Advisor-Delta 16).

### 1.2 Block in „Auftrag anlegen“ (`views/auftrag-umgebung.js` Z. 249)
`const ortBlock = basis === null ? null : befehlsBlock(basis, [])` und nur bei `ortBlock !== null` rendern (Bauauflage 4: relativer Pfad ⇒
`null`). Der Ort bleibt nach dem Block gesetzt (Beleg (d)), der Block navigiert also wie bisher `cd`. Import `cdZeile` entfällt dort.

### 1.3 `befehlsblock.js`
- `zaehleBefehle`: Zeilen `BLOCK_KOPF`/`BLOCK_FUSS` (getrimmt) zählen nicht (Advisor-Delta 10; wirkt auch im Chat, gewollt).
- `renderBefehlsblock`: bei `istBlockform(zeilen)` unter dem Code der Hinweis „Nach dem Einfügen einmal Enter drücken“
  (`befehl.enterHinweis`, de/en/tr/ru; Klasse `befehlsblock-enter`, bestehende Tokens — `subtle`-Stil). Damit steht er unter jedem
  Leitstand-Block (alle in Blockform) und unter Chat-Blöcken nur, wenn sie zufällig die Form haben.
- `kopierText` bleibt `join('\n')` ohne abschließenden Zeilenumbruch: der Block läuft erst nach Enter (bewusst, Hinweis oben).
- Importe aus `code-daten.js` (rein, ohne DOM) — keine Gegenrichtung.

## 2 — Golden-Erwartungen, die bewusst geändert werden (Bericht nennt jede einzeln)
1. `public/leitstand/code-daten.test.mjs`: `ersterBlock` = `slice(2, -1)` (Bauauflage 9); Z. 85 erste Zeile `CD` → jeder Block
   `[& {, ORT, …, }]`; Z. 91 push-Block `[& {, ORT, git push …, }]`; Z. 126-129 `befehlsBloecke` UNC → Blockform; Z. 131 Prüfstand →
   Blockform. `cdZeile`-Tests Z. 120-124 bleiben (Jarvis). Neu: `ortZeile`, `befehlsBlock`, `istBlockform`.
2. `scripts/leitstand/routen-code.test.mjs` Z. 345-351: statt `cd` + `${cd}; ${zeile}` läuft der **echte Block ohne Commit-Zeile** als ein
   `-Command` mit `exit $LASTEXITCODE` dahinter (Advisor-Delta 9, Bauauflage 7); Prüfung bleibt `porcelain`.
3. `scripts/check-f45-b2a3b-review-stand.mjs` (d) `pruefeBloecke`: Kopf `& {`, Zeile 2 = Ortszeile, Fuß `}`; push-Block genau
   `[& {, ORT, git push …, }]` (`length !== 4`); Prüfstand ebenso; Rotfälle (g) auf die neue Form (ohne Ortszeile, push im ersten Block,
   zweiter Block fehlt). Umgestellt, nicht ausgehebelt.
4. `public/leitstand/befehlsblock.test.mjs`: neu `zaehleBefehle([& {, Set-Location …, git status, }]) === 2`; Hinweis nur bei Blockform.
5. `public/leitstand/views/auftrag-umgebung.test.mjs` Z. 34 (`cd '…'`) → Blockform (fünfte Datei, im v1 übersehen).
`check-f45-b2a3-codex-review.mjs` prüft nur die Jarvis-cd-Zeile — unverändert.

## 3 — Gate `scripts/check-f45-b2b4a2a-blockform.mjs` (in `check:gates`)
Attrappen zur Laufzeit (F-1134): Pfade und Ordner entstehen im Lauf (`mkdtemp`), nichts eingecheckt.
- **(a) Blockform aller Blöcke** — Verhaltensproben der Erzeuger (Bauauflage 3): `sicherBefehle` (commit+push, ohne origin),
  `pruefstandBefehle`, `befehlsBlock(basis, [])`; je Pfad mit Leerzeichen, `[1]`, `'`, `’`, UNC, POSIX: Kopf `& {`, Zeile 2 genau
  `Set-Location -LiteralPath ${psArgument(p)} -ErrorAction Stop`, Fuß `}`, keine Zeile mit führendem Leerraum, keine Zeile `cd …`;
  `zaehleBefehle` zählt Kopf/Fuß nicht; `renderBefehlsblock` zeigt den Enter-Hinweis bei Blockform und nur dort; `befehl.enterHinweis` in
  de/en/tr/ru. Quelltext (Delta-Advisor 1: nur `public/leitstand/views/**` ohne Tests und `befehlsblock.js`; `code-daten.js` decken die
  Verhaltensproben ab): kein `cdZeile(`, kein Literal `'cd `/`"cd `/`` `cd ``; `auftrag-umgebung.js` nutzt `befehlsBlock(`. Grenze
  ausgegeben: Chat/Jarvis → 4b.
- **(b) Rotfall „Ordner fehlt“ → kein git** — echte PowerShell (`powershell.exe`, sonst `pwsh`; fehlt beides: deutlich „übersprungen“):
  Block `befehlsBlock(<fehlt>, ['git --version'])` als ein `-Command` ⇒ Exit ≠ 0 und stdout ohne `git version`; Gegenprobe vorhandener
  Ordner mit Leerzeichen und `[1]` ⇒ Exit 0, `git version` in stdout.
- **Rotfälle als Gegenprobe im Gate**: Block mit Einzug, ohne `-ErrorAction Stop`, mit `cd`-Zeile, ohne Fuß, mit `-Path` statt `-LiteralPath`
  ⇒ (a) meldet; (b) mit einem Block ohne `-ErrorAction Stop` ⇒ PowerShell führt git trotz fehlendem Ordner aus und (b) meldet das
  (echte Gegenprobe, dass die Prüfung trennt); Quelltext mit `cdZeile(` in einer View ⇒ gemeldet; Hinweis fehlt ⇒ gemeldet.
- `starteWorkflowSchritt(` = 6 und `check-wachstumsbremse-server` unverändert grün (Server nicht angefasst).

## 4 — PowerShell-Nachweis `features/F45/nachweise/b2b4a2a/powershell-versuch.md`
Windows PowerShell 5.1 (pwsh 7 nicht installiert), Skript im Scratchpad (nicht eingecheckt), geschwärzt (`<TEMP>`, kein Benutzerpfad).
(a)–(c) aus 4a-1 wiederholt mit der gebauten Form (ohne Einzug, aus `befehlsBlock` erzeugt); (d) Ort bleibt nach `& { … }` gesetzt
(`Get-Location` danach); (e) git schreibt nach stderr (`git rev-parse --verify <fehlt>`) ⇒ Block läuft weiter — als Grenze: ein
fehlgeschlagener `git add` hält `git commit` nicht auf (wie bisher); (f) zeilenweise über stdin (`-Command -`, ohne PSReadLine): ohne
Leerzeile nach `}` läuft nichts, mit ⇒ läuft. Grenze: echtes Einfügen von Hand = Stefans Probe im Leitstand.

## 5 — Render-Nachweis `features/F45/nachweise/b2b4a2a/`
Nur `#/code` bei 390, de, hell und dunkel: Karte „Sichern“ (commit- und push-Block mit langer `git add`-Zeile, Advisor-Delta 17) und
Prüfstand, Enter-Hinweis sichtbar; `scrollWidth/clientWidth` bei 390. Neutrale Testinstanz `nachweise/b2b3b2b2a3/instanz.mjs`, GET …/code
als feste Antwort mit neutralem Pfad (`C:\Projekte\haushaltsbuch`), Pfadprobe je Bild; dazu Kopieren (Klicktabelle: Knopf „Kopiert“).

## 6 — Findings/Doku
- F-1088: (5) erledigt für den Leitstand (Fundstellen), Status bleibt `teilweise` ((2)–(4), (6) offen; Jarvis-Regel → 4b).
- `docs/projekt/fixpaket-f45.md`: B2b-4a-2 geteilt — 4a-2a gebaut; 4a-2b (Anzeige) folgt nach dem Merge mit V1–V3, Bauauflagen 1–9, F-1157
  und O2. `features/F45/feature.md`: Kopfzeile und Abschnitt „Stand B2b-4a-2a“. `docs/STATUS.md`/`lagebild.md`: gleiche Zeile nachziehen
  (4a-1 gemergt #366, 4a-2a gebaut).
- Neue Findings ab F-1159 nur bei echten Funden. ARCHITECTURE.md: keine Änderung.

## 7 — Vorgemerkt für 4a-2b „Anzeige“ (nicht bauen)
Eigener Auftrag nach dem Merge von 4a-2a, Grundlage `plan-b2b4a2.md` (v1) mit:
- V1 `sichernSchluessel(detail)` = `status|ao.status|ao.vorbereitungLaeuft|versionSequenz` (`versionSequenz` in `aktuellesDetail`), Gate-Fall
  „Aufräumen ⇒ neuer Schlüssel“; V2 push-Block hängt nur an `voraus > 0` + Branch/origin, nie am commit-Teil; V3 genau ein Aufräumen-Knopf
  (Schritt 3), „nach deiner Abnahme“ bei offener Abnahme, Modus null mit Hinweis auf den Knopf unter den Aktionen.
- Bauauflagen 1–9 aus `advisor-b2b4a2.md` (kein `setzeKopfAusCodeStand`, Fehler zählt als gelaufen, Gate (a)/(d) tragfähig, `null`-Pfad,
  GESTOPPT mit `voraus`, `nichtBestimmbar` mit node_modules-Ursache, i18n-Wiederverwendung `code.sichern.grund.*`).
- F-1157 (1)–(8) einzeln abgehakt.
- **O2 = ja:** eine gemeinsame Regel für den Ablauf-Block **und** `#/code`: `node_modules/` wird nie gestagt und nicht in der Dateiliste
  gezählt, aber sichtbar: Hinweis „node_modules ausgelassen – fehlt in .gitignore“, nie still versteckt.
- O3: kein Projektordner-Rückfall; fester Hinweis mit Link `#/workflows/<id>` statt „lädt“.

## Delta-Advisor `advisor-b2b4a2a-delta.md`: Freigegeben mit Hinweisen — Bauauflagen
- [x] 1 Gate (a) Quelltextteil auf `views/**` und `befehlsblock.js` (oben eingearbeitet)
- [x] 2 `zaehleBefehle` zieht Kopf/Fuß nur bei `istBlockform` ab; `istBlockform` getrimmt
- [x] 3 Fall (d) zuerst
- [x] 4 `auftrag-umgebung.test.mjs`: relativer Pfad ⇒ kein Block
- [x] 5 `routen-code.test`: zusätzlich stderr ohne `fatal:`
- [x] 6 Serverkommentar `leitstand-server.mjs:4945` → für 4b vorgemerkt (Server bleibt unangetastet)
- [x] 7 Grenze „Nächste Schritte“ (kein Befehlsblock) im Bericht
- [x] 8 Meldung `check-f45-b2a3b-review-stand.mjs` (d) umstellen

## Prüfpass nach dem Bau
`code-reviewer`, `qa`, `design-guardian` (frischer Kontext), höchstens eine Korrekturrunde. Nur betroffene Tests/Gates: die fünf
Golden-Dateien, `check-f45-b2a3-codex-review`, neues Gate, `check-f44-i18n`, `check-wachstumsbremse-server`, Lint/Typprüfung. Vollen Check
fährt Stefan.

## Risiken
- Sichtbare Änderung aller Blöcke in `#/code`, Workboard, „Auftrag anlegen“ (gewollt). Workboard und Abnahme zeigen bis 4a-2b weiter den
  Projektordner (F-1087 offen).
- Ohne PSReadLine braucht der Block nach dem Einfügen zwei Enter (`>>`-Prompt endet erst mit Leerzeile) — Hinweis nennt „einmal“ (Regelfall
  PSReadLine); Grenze im Nachweis (f).
- Gate (b) braucht PowerShell; ohne sie übersprungen (Meldung), (a) bleibt wirksam.
