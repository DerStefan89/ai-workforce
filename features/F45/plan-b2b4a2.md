# F45 B2b-4a-2 „Bereit zum Sichern“ — Anzeige und Befehlsform — Plan v1

> **Geteilt → `plan-b2b4a2a.md` / 4a-2b folgt** (Advisor `advisor-b2b4a2.md`: Nicht freigegeben, knapp zu groß; Entscheidung
> Challenger 19.10.2026: 4a-2a = Blockform, 4a-2b = Anzeige nach dem Merge von 4a-2a). Diese Fassung bleibt als Verlauf stehen.

Stand: 19.10.2026, Branch `f45/b2b4a2-anzeige` = `origin/main` `7a56d86` (#366, B2b-4a-1). Verlauf: `plan-b2b4a.md` (v2, C) →
`advisor-b2b4a-delta.md` (Bauauflagen 8–20) → `plan-b2b4a1.md` (Server) → dieser Plan (Oberfläche). Schließt **F-979, F-1087,
F-1088 (5) für den Leitstand, F-1157**.

## CONTEXT

- Baut auf 4a-1 (gemergt): `scripts/leitstand/ablauf-sichern.mjs` (`SICHERN_GRUENDE`, `arbeitsordnerGrund`, `leiteSichernLageAb`),
  GET `/api/code?workflow=<id>` (200 mit `ablauf.sichern` | 400/404 mit `grund_schluessel: null` | 409 mit Schlüssel),
  `/api/code/diff?workflow=`. Befund-Quelle der Auflagen: F-1157 (1)–(8).
- **Kein Server-Eingriff** (Ratsche 13.366 bleibt), keine Route, kein Schema, keine Hooks/settings, `.claude/`, `vorlagen/`,
  `starteWorkflowSchritt(` 6×. Jarvis-Regel (`cdZeile` im Server, `src/jarvis`) bleibt → 4b. `commitVorschlag` unverändert (F-1156).
  Kein Upstream-Vergleich (F-1155). F-1158 nicht.
- PowerShell-Verhalten der Blockform belegt in `nachweise/b2b4a1/powershell-versuch.md` (a/b/c). Neu belegt (vor dem Bau, 5.1):
  `& { Set-Location … }` wirkt nach dem Block weiter (Ort ist Sitzungszustand) — ein reiner Orts-Block navigiert also wie heute `cd`.

## 1 — Blockform für alle Befehlsblöcke (F-1088 (5))

`public/leitstand/code-daten.js` — eine Regel, eine Quoting-Quelle (`psArgument`):
- neu `ortZeile(pfad)` = `Set-Location -LiteralPath ${psArgument(pfad)} -ErrorAction Stop` (immer `-LiteralPath`).
- neu `befehlsBlock(pfad, folge)` = `['& {', ortZeile(pfad), ...folge, '}']` ohne Einzug (Advisor-Delta 5); `null` ohne absoluten Pfad.
- `befehlsBloecke(pfad, folgen)` baut jeden Block über `befehlsBlock` (leere Folgen entfallen wie heute) ⇒ Sichern (commit, push),
  Prüfstand und neu der Ablauf-Block haben dieselbe Form.
- `views/auftrag-umgebung.js` Z. 249 (Block nur mit `cd`): `befehlsBlock(basis, [])` ⇒ `& {` / `Set-Location …` / `}` — der Ort bleibt
  nach dem Block gesetzt (Beleg oben). Damit ist jeder Befehlsblock des Leitstands in Blockform.
- `cdZeile` bleibt nur für die Jarvis-Regel des Servers (4b); Kopf und Doku sagen das.
- `befehlsblock.js` `zaehleBefehle`: Klammerzeilen `& {` und `}` zählen nicht (Advisor-Delta 10 — wirkt auch im Chat; Chat-Fall
  `befehlsblock.test.mjs` bleibt gleich, neuer Fall mit Klammern).
- Kommentare nachziehen: Kopf `code-daten.js` (Regel „direkt ausführbar“), Doku `befehlsBloecke`/`sicherBefehle`/`pruefstandBefehle`,
  `views/code.js` (Z. 236, 312), `workboard.js` (Z. 773), `befehlsblock.js`-Kopf (Advisor-Delta 16).

**Golden-Erwartungen, die bewusst geändert werden** (Bericht nennt jede einzeln):
- `public/leitstand/code-daten.test.mjs`: Hilfe `ersterBlock` (Z. ~33-37: Zeilen ohne `& {`, Ortszeile, `}`), Z. 85 (`block[0] === CD`),
  91, 102, 107, 126-131 (`befehlsBloecke` UNC, Prüfstand `[CD, 'npm run check']`); `cdZeile`-Tests Z. 120-124 bleiben (Jarvis).
- `scripts/leitstand/routen-code.test.mjs` Z. 347-351: statt `cd` + `${cd}; ${zeile}` wird der **echte Block ohne Commit-Zeile** als ein
  `-Command` ausgeführt (Advisor-Delta 9).
- `scripts/check-f45-b2a3b-review-stand.mjs` (d) `pruefeBloecke`: Kopf `& {`, Ortszeile, Fuß `}`; push-Block = genau eine Befehlszeile
  (`block.length !== 4`); Prüfstand ebenso; Rotfälle Z. 480-482 auf die neue Form (Block ohne Ortszeile, push im ersten Block,
  zweiter Block fehlt). Nicht ausgehebelt, nur auf die Form umgestellt.
- `befehlsblock.test.mjs`: neuer Fall `zaehleBefehle(['& {', 'Set-Location …', 'git status', '}']) === 2`.
- Gate `check-f45-b2a3-codex-review.mjs` prüft nur die Jarvis-cd-Zeile (bleibt), keine Änderung.

## 2 — Anzeige „Bereit zum Sichern“

### Quelle je Ablauf (F-1157 (3), (8)/Befund 6)
`code-daten.js` neu `sichernQuelle(ao)` (rein): `ao.status === 'kein_bedarf'` → `'keinBedarf'` (schreibt nicht, nichts zu sichern);
`'bestand'` → `'projekt'` (Projektordner, heutiger Weg über `code-stand.js`); jeder andere Status (`fehlt`, `IN_VORBEREITUNG`, `BEREIT`,
`FEHLGESCHLAGEN`, `ENTFERNT`, unbekannt) → `'ablauf'` (immer `?workflow=`, nie still Projektordner); `null`/`undefined` → `'unbekannt'`
(Hinweis, kein Befehl).

### Befehle aus dem Ablauf (F-1157 (1), (2), (3))
`code-daten.js` neu `ablaufSicherBefehle(antwort)` (rein), nur bei `ablauf.sichern.bereit`:
- Pfad und Soll-Branch **nur** aus `ablauf.arbeitsordner.pfad/branch` (nie `workflowId`, nie `absoluterPfad`); fehlen sie → `keinOrt`.
- Branch-Prüfung vor jedem Block: `branch.status === 'ok'`, nicht losgelöst (→ `losgeloest`), `branch.name === arbeitsordner.branch`
  (→ `fremderBranch`), nicht `main`/`master` (→ `aufMain`).
- `art: 'commit'`: `dateien.gekappt` → Grund `gekappt` mit Anzahl (kein Block); node_modules-Einträge (`node_modules/` am Anfang oder
  als Pfadteil) werden **nicht** in `git add` übernommen, Anzahl als Hinweis `nodeModules` (gehört in `.gitignore`); bleibt nichts →
  Grund `nurNodeModules`. Nie `git add -A`/`.`. commit-Folge = dieselbe innere Funktion wie `sicherBefehle` (Aufteilung, `:(literal)`,
  `commitVorschlag`), danach push-Block wie unten.
- push-Block (`art: 'push'` allein oder nach commit): nur wenn `remoteWebUrl.status === 'ok' && origin === true`, sonst Hinweis
  `keinOrigin` (bzw. bei `art: 'push'` Grund `keinOrigin`). Text „{n} Commits noch nicht auf main“ (Wortlaut F-1155).
- Ergebnis `{ bloecke, hinweise, nodeModules }` oder `{ grund, anzahl? }`.

### Stand je Ablauf (F-1157 (4))
Neu `public/leitstand/ablauf-code-stand.js` (Muster `code-stand.js`, import-sicher): je workflowId `{ zustand: leer|laedt|ok|lage|fehler,
daten, http, grundSchluessel, fehler, geladenAm, schluessel }`.
- `stelleAblaufCodeStandSicher(id, schluessel)`: lädt **nur**, wenn für die id noch kein Abruf mit diesem `schluessel` lief
  (`schluessel` = workflowStatus, Advisor-Delta 12: eine Anpassungsrunde verlässt ABGESCHLOSSEN und kehrt zurück ⇒ neu geladen).
  Poll-Ticks rufen dies wiederholt auf, Netz nur beim Wechsel.
- `ladeAblaufCodeStand(id, { neu: true })` nur aus dem Klick „Aktualisieren“ (`data-sichern-aktualisieren`).
- Überholschutz (Zähler), Projektwechsel verwirft alles; Fehler geloggt, nie geworfen.
- `api.js` `holeAblaufCode(id)` → `{ http, koerper }` (`/code?workflow=${encodeURIComponent(id)}`, Zeitlimit wie `holeCode`; 4xx lesbar).
- Abruf nur für die geöffnete Karte/Abnahme bzw. das offene Workboard-Detail — nie im Board-Render und nie aus `zustand.js`.

### Abschnitt in der bestehenden Karte (kein zweiter Block)
`views/arbeitsordner-anzeige.js` neu `renderSichernAbschnitt({ workflowId, stand, aufraeumenHtml })` (rein). Lagen:
- laedt/leer: „Stand des Arbeitsordners wird gelesen …“; fehler (Netz, 400, 404, 5xx): Fehlertext + „Aktualisieren“.
- **409** mit `grund_schluessel` → Lage, kein Fehler (F-1157 (5)): Text je Schlüssel; `aufgeraeumt` = „Erledigt: … aufgeräumt“ (normaler
  Endzustand, ohne Fehlerfarbe).
- 200, `bereit` → Badge „Bereit zum Sichern“ (bestehende Klasse `ablauf-status`), Zeile Änderungen/„{n} Commits noch nicht auf main“,
  Schrittliste (1 Sichern: Blöcke (`renderBefehlsblock`, `echteWerte`) bzw. Grund + Hinweise → 2 „Pull Request und Merge im Web“ →
  3 „Aufräumen“ = `aufraeumenHtml`), Zeitpunkt des Stands, „Aktualisieren“.
- 200, nicht bereit: `nichtAbgeschlossen` + GESTOPPT mit `offeneAenderungen > 0` (oder `voraus > 0`) → „Der Ablauf ist gestoppt;
  im Arbeitsordner liegen {n} offene Änderungen. Weg: Aufräumen — mit „Änderungen verwerfen“, wenn du sie nicht willst“ (F-1157 (6));
  `nichtsOffen` → „Nichts offen — weiter mit Aufräumen“; übrige Schlüssel → übersetzter Text.
- `keinBedarf`/`projekt` werden nicht hier, sondern vom Aufrufer behandelt (F-1157 (7): getrennte Texte
  `arbeitsordner.sichernAbschnitt.keinBedarf` / `.projekt`).
- `renderArbeitsordnerKarte(ao, codeStand, kontext)`: neues Feld `kontext.sichern` (`{ stand }`) ersetzt die alte Zeile
  `arbeitsordner.sichern`; `kontext.ohneAufraeumen` lässt den Karten-Knopf weg (Advisor-Delta 8, Modus null hat ihn schon in
  `workflow-aktionen`). Ohne `kontext.sichern` bitgleich zu heute (Freigabe-Seite, Advisor-Delta 14). Alte Zeile/Schlüssel
  `arbeitsordner.sichern` entfällt (Verweis „bis … kommt“ veraltet).

### Abnahme-Seite (`views/workflows.js` `zeichneEntscheiden`)
- Modus `abnahme` (wie heute Karte) und **neu Modus null** bei `BEENDET` (ABGESCHLOSSEN/GESTOPPT) und `sichernQuelle === 'ablauf'` ⇒
  dieselbe Karte mit Abschnitt (Modus null: `ohneAufraeumen`). Ohne Arbeitsordner `''` wie heute.
- `stelleAblaufCodeStandSicher(workflowId, status)` nur in diesen Fällen; Abonnent zeichnet nur, wenn `aktuellesDetail.workflowId` passt.
- Delegation auf `#workflow-entscheiden`: `[data-befehl-kopieren]` → `kopiereBefehlsblock` (Auftrag 3, Test), `[data-sichern-aktualisieren]`
  → `ladeAblaufCodeStand(id, { neu: true })`. Bestehende `.wf-aktion`-Delegation bleibt (Aufräumen-Knopf der Karte).
  Handler als exportierte Funktion `behandleEntscheidenKlick(ereignis, abh)` mit Abhängigkeiten als Parameter ⇒ in Node testbar.

### Workboard (`views/workboard.js` `renderTerminalBlock`, Phase „abgeschlossen“)
- `sichernQuelle(zustand.workflowDetail?.arbeitsordner)`: `ablauf` → `stelleAblaufCodeStandSicher` + `renderSichernAbschnitt`
  (Aufräumen = Link `#/workflows/<id>`); `projekt` → heutiger Weg (code-stand, jetzt Blockform) mit Satz „im Projektordner gearbeitet“;
  `keinBedarf` → „schreibt keine Dateien — nichts zu sichern“ + Link `#/code`; `unbekannt` → Ladehinweis.
- `codeStandNachAblauf`-Neuladen nur noch bei `projekt`.
- Delegation `#workboard-bearbeitung`: `[data-sichern-aktualisieren]` (Advisor-Delta 15). Abonnent zeichnet nur das offene Detail.

### `#/code` bleibt beim Projektordner (Blockform über `sicherBefehle`).

### i18n und CSS
de/en/tr/ru: `arbeitsordner.sichernAbschnitt.*` (Titel, Badge, laedt, fehler, aktualisieren, standVon, schritte, voraus, gestoppt,
nichtsOffen, keinBedarf, projekt, unbekannt), `arbeitsordner.sichernGrund.<SICHERN_GRUENDE>` (alle neun), Gründe/Hinweise
`arbeitsordner.sichernBefehl.<grund>` (keinOrt, losgeloest, fremderBranch, aufMain, gekappt, nurNodeModules, keinOrigin, nodeModules,
dateienFehler, branchFehler, keinVorschlag, keineAenderungen). Keine internen Kennungen im Text (Branch/Pfad nur escaped in `<code>`).
CSS: nur bestehende Tokens; höchstens eine Klasse `sichern-schritte` (Liste).

## 3 — Gate `scripts/check-f45-b2b4a2-anzeige.mjs` (in `check:gates`)
Attrappen zur Laufzeit (F-1134), kein eingechecktes Fixture.
- (a) Blockform aller Blöcke: `sicherBefehle` (commit+push, ohne origin), `pruefstandBefehle`, `ablaufSicherBefehle` (commit, push),
  `befehlsBlock(basis, [])`; Pfade mit Leerzeichen, `[1]`, Apostroph, `’` — Kopf `& {`, Zeile 2 `Set-Location -LiteralPath <psArgument>
  -ErrorAction Stop`, Fuß `}`, kein Einzug; Quelltext-Probe: `views/*.js` rufen `cdZeile` nicht mehr auf, jeder `renderBefehlsblock`-
  Aufrufer mit `sprache: 'powershell'` bezieht Zeilen aus `befehlsBloecke`/`befehlsBlock`/`ablaufSicherBefehle`/`sicherBefehle`/`pruefstandBefehle`.
- (b) Rotfall Ordner fehlt: PowerShell (falls vorhanden, sonst übersprungen mit Meldung) führt den echten Block mit fehlendem Ordner
  aus ⇒ Exit ≠ 0, stdout leer (kein git lief); Gegenprobe Ordner vorhanden ⇒ git lief.
- (c) `?workflow=` bei jedem Ablauf mit Arbeitsordner: `sichernQuelle` für jeden Status; `api.js` `holeAblaufCode` mit
  `encodeURIComponent`; Stand-Modul ruft `holeAblaufCode` (Attrappe).
- (d) kein Abruf im Poll: `stelleAblaufCodeStandSicher` 5× mit gleichem Schlüssel ⇒ 1 Abruf, neuer Schlüssel ⇒ 2.; Quelltext:
  `zustand.js` importiert weder `ablauf-code-stand` noch `holeAblaufCode`; `holeAblaufCode` nur im Stand-Modul; `ladeAblaufCodeStand(`
  in Views nur mit `neu: true` im Klick-Zweig `data-sichern-aktualisieren`; im Board-Render (`renderBoard`/Karten) kein Aufruf.
- (e) push-Block nur bei passendem Branch: fremder Branch, losgelöst, main, ohne origin ⇒ kein `git push`; passend ⇒ genau ein
  push-Block mit `psArgument(arbeitsordner.branch)`; Pfad stammt aus `arbeitsordner.pfad`, nicht aus `absoluterPfad`/`workflowId`.
- (f) node_modules: nie in `git add`, Anzahl im Ergebnis; gekappt ⇒ kein Block.
- (g) Kopieren-Handler: `behandleEntscheidenKlick` mit Attrappe ruft `kopiereBefehlsblock` für `[data-befehl-kopieren]`; Quelltext:
  Delegation auf `workflow-entscheiden` registriert.
- (h) i18n: jeder neue Schlüssel und jeder `SICHERN_GRUENDE`-Schlüssel in de/en/tr/ru; kein Text enthält `wf/`, `workflow-`, `F-1`.
- (i) `starteWorkflowSchritt(` = 6, Server unverändert (Zeilen = 13.366).
- Rotfälle (Gegenprobe im Gate selbst): Block mit Einzug, ohne `-ErrorAction Stop`, mit `cd`; Quelle `projekt` für `BEREIT`; Stand lädt je
  Aufruf; push trotz fremdem Branch; node_modules in add; fehlender ru-Schlüssel; Handler ohne Kopieren.

Unit-Tests: `code-daten.test.mjs` (ortZeile, befehlsBlock, ablaufSicherBefehle, sichernQuelle), `ablauf-code-stand.test.mjs` (neu),
`arbeitsordner-anzeige.test.mjs` (Abschnitt je Lage, Karte mit/ohne `sichern`), `befehlsblock.test.mjs`, `workflows`-Handler-Test.

## 4 — Render-Nachweis `features/F45/nachweise/b2b4a2/`
Neutrale Testinstanz (Muster `nachweise/b2b3b2b2a3/instanz.mjs`, neutrales HOME/TEMP, keine persönlichen Pfade, Pfadprobe je Bild).
Lagen: Karte bereit (commit, mit node_modules-Hinweis), bereit (push), aufgeräumt (409), GESTOPPT mit Änderungen, Ablauf ohne
Arbeitsordner (Workboard `keinBedarf`); Abnahme mit Kopieren (Klicktabelle: Zwischenablage-Text = Blockzeilen). Ansichten de/ru,
1440/390, hell/dunkel, 200 %, reduzierte Bewegung; `scrollWidth/clientWidth` bei 390. Workboard-Fall über das echte Workboard, sofern
die Instanz das Click-to-Work-Detail abbilden kann; sonst über die Abnahme-Seite (Modus null) und Abweichung benennen.

## 5 — Findings/Doku
- F-979, F-1087 erledigt; F-1088 (5) erledigt für den Leitstand (Jarvis-Regel → 4b), F-1088 bleibt `teilweise` ((2)–(4), (6) offen);
  F-1157 erledigt bzw. Reste benennen. Neue Findings ab F-1159 nur bei echten Funden.
- `docs/projekt/fixpaket-f45.md`: 4a-2 gebaut. `features/F45/feature.md` nachziehen. STATUS/Lagebild: nur wenn dort 4a-2 als offen steht.
- ARCHITECTURE.md: keine Änderung erwartet.

## F-1157 — Abhaken (Bau trägt Fundstelle nach)
- [ ] (1) node_modules: Anzahl und Kappung zeigen, nie pauschal stagen — `ablaufSicherBefehle`, Gate (f)
- [ ] (2) vor push Branch/losgelöst/origin prüfen — `ablaufSicherBefehle`, Gate (e)
- [ ] (3) Befehle nur aus `ablauf.arbeitsordner.pfad/branch` — `ablaufSicherBefehle`, Gate (e)
- [ ] (4) Abruf nur für geöffnete Karte/Abnahme — `ablauf-code-stand.js`, Gate (d)
- [ ] (5) 409 als Lage — `renderSichernAbschnitt`
- [ ] (6) GESTOPPT mit Änderungen → Aufräumen/Verwerfen — `renderSichernAbschnitt`
- [ ] (7) Text je Grund übersetzt; `kein_bedarf`/`bestand` getrennt — i18n, `sichernQuelle`
- [ ] (8) Advisor-Delta 8–20 (C-Teil) + Befund 6 — siehe Zuordnung unten

Advisor-Delta 4a (C-Teil): 8 `ohneAufraeumen`; 9 Golden vollständig + echter Block in PowerShell; 10 `zaehleBefehle`; 12 Schlüssel
workflowStatus; 13 Branch/origin + Gründe im Abschnitt; 14 Kartensignatur, Freigabe ohne `sichern`, alter Schlüssel weg; 15 Workboard-
Delegation; 16 Kommentare; 17 #/code-Sichern 390 mit langer `git add`-Zeile im Render-Nachweis, „abgelehnt“ entfällt; 18 PowerShell:
stderr-Fall (`git` schreibt nach stderr ohne Umleitung) im Nachweis ergänzen, Klick-Fall echtes Einfügen = Stefans Probe; 19 entfällt
(Bezeichner); 20 kein `.method` in neuen Dateien (`check-f813-csrf`). Nicht C: 11 (4a-1).

## Prüfpass nach dem Bau
`code-reviewer`, `qa`, `design-guardian` (frischer Kontext), höchstens eine Korrekturrunde. Nur betroffene Tests/Gates:
`code-daten.test`, `befehlsblock.test`, `arbeitsordner-anzeige.test`, `ablauf-code-stand.test`, `workflows`-Tests, `routen-code.test`,
`check-f45-b2a3b-review-stand`, `check-f45-b2a3-codex-review`, `check-f45-b2b4a1-sichern`, neues Gate, `check-f44-i18n`, `check-f813-csrf`,
`check-wachstumsbremse-server`, Lint/Typprüfung. Vollen Check fährt Stefan.

## Offene Punkte
- O1: Blockform auch für den reinen Orts-Block in „Auftrag anlegen“ (Vorschlag: ja, Beleg Ort bleibt gesetzt).
- O2: node_modules-Ausschluss nur im Ablauf-Block, `#/code` (Projektordner der Workforce, hat `.gitignore`) unverändert.
- O3: Workboard bei `unbekannt` (Detail ohne `arbeitsordner`, nur alter Server) kein Projektordner-Rückfall.

## Risiken
- Umfang: Befehlsform (4 Golden-Dateien) + Stand-Modul + Karte + zwei Views + i18n ×4 + Gate + Render-Nachweis — entspricht dem vom
  Advisor-Delta 7 vorgeschlagenen 4a-2-Schnitt, ohne Server und ohne Commit-Vorschlag.
- `zaehleBefehle`-Änderung wirkt im Chat auf Blöcke, die zufällig `& {`/`}` enthalten (gewollt).
- Workboard „abgeschlossen“ erscheint nur nach Click-to-Work in derselben Sitzung (bestehende Grenze).
