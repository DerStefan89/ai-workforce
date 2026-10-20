# F45 B2b-4a-2b „Bereit zum Sichern – Anzeige“ — Plan v2

> **Geteilt → 4a-2b-1 (dieser Branch `f45/b2b4a2b-anzeige`) / 4a-2b-2 folgt** (Advisor `advisor-b2b4a2b.md`: Freigegeben mit Hinweisen,
> Zuschnitt knapp zu groß; Entscheidung Challenger 20.10.2026: Schnitt wie unten vorgeschlagen). 4a-2b-1 „Regeln und node_modules“ = §1, §2,
> Hinweis in `#/code`, Gate `scripts/check-f45-b2b4a2b1-regeln.mjs`, Render-Nachweis `nachweise/b2b4a2b1/`. 4a-2b-2 „Anzeige“ (§3–§7 ohne
> die Regeln: Stand je Ablauf, Karte, Abnahme mit Kopieren, Workboard, Enter-Hinweis-Text, ein Aufräumen, volle Render-Matrix; schließt
> F-979, F-1087, Rest F-1157) ist ein eigener Auftrag nach dem Merge.

Stand: 20.10.2026, Branch `f45/b2b4a2b-anzeige` = `origin/main` `0bf84ff` (#367, 4a-2a gemergt). Verlauf: `plan-b2b4a2.md` (v1, Teil 2–5) →
`advisor-b2b4a2.md` (V1–V4, Bauauflagen 1–9, O1–O3) → Schnitt 4a-2a/4a-2b → `plan-b2b4a2a.md` §7 (Vormerkung) → `advisor-b2b4a2a-delta.md`
→ dieser Plan (Teil 4a-2b). Schließt **F-979, F-1087, F-1157**.

## CONTEXT

- Baut auf 4a-1 (`scripts/leitstand/ablauf-sichern.mjs`, GET `/api/code?workflow=<id>`: 200 mit `ablauf.{workflowStatus, bedarf,
  arbeitsordner: { pfad, branch } | null, sichern}` | 400/404 `grund_schluessel: null` | 409 mit Schlüssel) und 4a-2a (`befehlsBlock`,
  Blockform, Enter-Hinweis).
- **`leitstand-server.mjs` unverändert** (Ratsche 13.366, `starteWorkflowSchritt(` 6×). Einziger Servereingriff: `scripts/leitstand/routen-code.mjs`
  `leseDateien` (O2, siehe §1) — eigenes Modul, nicht die Ratsche. Keine Route, kein Schema, keine Hooks/settings/`.claude/`.
- Nicht im Umfang: Jarvis (4b), Titel im Commit-Vorschlag (F-1156; `commitVorschlag` unverändert), Upstream-Vergleich (F-1155), F-1158,
  F-1159 (`sicherBefehle`-Folge ohne `$LASTEXITCODE`-Abbruch bleibt).

## 1 — Eine node_modules-Regel (O2 = ja)

- `code-daten.js` neu `istNodeModulesPfad(pfad)` (rein): `node_modules/` am Anfang oder `/node_modules/` als Pfadteil — die eine Regel.
- `routen-code.mjs` `leseDateien`: Einträge mit `istNodeModulesPfad` (Pfad oder `alterPfad`) werden **vor** der Kappung herausgenommen;
  `anzahl` und `gekappt` zählen ohne sie; neues Feld `dateien.nodeModules` (Anzahl, 0 wenn keine). Der Server importiert aus `public/` wie
  schon `cdZeile`. Wirkung: `#/code`-Liste, Sichern-Block, `ablauf.sichern.offeneAenderungen` zählen node_modules nicht — ein Arbeitsordner
  nur mit node_modules ist nicht mehr „bereit (commit)“ (F-1157 (1) an der Wurzel). Diff-Allowlist (`leseStatusListe`) bleibt.
- Sichtbar, nie still: bei `nodeModules > 0` Hinweis „node_modules ausgelassen – fehlt in .gitignore ({zahl} Dateien)“
  (`code.sichern.hinweis.nodeModules`) in `#/code` (Dateiliste) und im Ablauf-Abschnitt. Zusätzlich filtert die gemeinsame commit-Folge
  (§2) node_modules-Pfade (Gegenwehr bei altem Server) — nie in `git add`.
- Grenze: übersteigt die Ausgabe von `git status` den Puffer (Tausende node_modules-Dateien), bleibt `nichtBestimmbar`; dessen Text nennt
  node_modules ohne `.gitignore` als mögliche Ursache (Bauauflage 6).
- `routen-code.test.mjs`: Fall mit node_modules (neu + Unterordner) ⇒ nicht in `eintraege`, `anzahl` ohne, `nodeModules` = n; Kappung ohne.

## 2 — Reine Regeln (`public/leitstand/code-daten.js`)

- `sichernQuelle(ao)`: `kein_bedarf` → `keinBedarf` (nichts zu sichern), `bestand` → `projekt` (Projektordner, heutiger Weg), `null`/
  `undefined` → `unbekannt`, jeder andere Status → `ablauf` (immer `?workflow=`, nie still Projektordner). F-1157 (7), Befund 6.
- `sichernSchluessel(detail)` (V1) = `status|ao.status|ao.vorbereitungLaeuft|versionSequenz` aus `{ daten.status, arbeitsordner,
  versionSequenz }` — Aufräumen (`ENTFERNT`), Vorbereitung und Anpassungsrunde (neue Fassung) ⇒ neuer Schlüssel.
- `commitFolge(daten)` (innere Funktion, aus `sicherBefehle` herausgezogen, Golden unverändert): Gründe wie heute, node_modules-Pfade nie
  in `git add`; liefert `{ zeilen }` oder `{ grund }`. `sicherBefehle` nutzt sie; Hinweis `nodeModules` bei `dateien.nodeModules > 0`.
- `ablaufSicherBefehle(antwort)` nur bei `ablauf.sichern.bereit`:
  - Ort nur aus `ablauf.arbeitsordner.pfad/branch` (nie `workflowId`, nie `absoluterPfad`); fehlt einer → `{ grund: 'keinOrt' }` (F-1157 (3)).
  - Branchprüfung vor jedem Block (F-1157 (2)): `branch.status ok` (sonst `branchFehler`), nicht losgelöst (`losgeloest`), `branch.name ===
    arbeitsordner.branch` (`fremderBranch`), nicht main/master (`aufMain`) ⇒ sonst `{ grund }`, kein Block.
  - commit-Block nur bei `art === 'commit'` über `commitFolge`; scheitert sie (z. B. `gekappt`), steht `commitGrund` im Ergebnis.
  - push-Block (V2) nur bei `origin === true` und (`voraus > 0` **oder** commit-Block davor) — nie an Dateiliste/Kappung gebunden; ohne
    origin Hinweis `keinOrigin`. Zeile „{n} Commits noch nicht auf main“ (Wortlaut F-1155).
  - Ergebnis `{ bloecke: [{ art: 'commit'|'push', zeilen }], hinweise, commitGrund?, voraus, nodeModules }` oder `{ grund }`.

## 3 — Stand je Ablauf (`public/leitstand/ablauf-code-stand.js`, neu; F-1157 (4))

- je workflowId `{ zustand: leer|laedt|ok|lage|fehler, daten, http, grundSchluessel, fehler, geladenAm, schluessel }`; Abonnenten; Projekt-
  wechsel verwirft alles; Überholschutz (Zähler); Fehler geloggt, nie geworfen; kein `setzeKopfAusCodeStand` (Bauauflage 1).
- `stelleAblaufCodeStandSicher(id, schluessel)`: Netz nur, wenn für die id noch kein Abruf mit diesem Schlüssel lief; ein Fehlschlag zählt
  als gelaufen (Bauauflage 2). `ladeAblaufCodeStand(id, { neu: true })` nur aus dem Klick „Aktualisieren“.
- `api.js` `holeAblaufCode(id)` → `{ http, koerper }` (`/code?workflow=${encodeURIComponent(id)}`, `CODE_ZEITLIMIT_MS`; 4xx lesbar, Netz wirft).
- Aufrufer nur die gerenderte Karte (Abnahme/Modus null) bzw. das offene Workboard-Detail — nie Board-Render, nie `zustand.js`.

## 4 — Anzeige (`views/ablauf-sichern-anzeige.js`, neu, rein) und Karte

`renderSichernAbschnitt({ workflowId, stand, aufraeumen })` — `aufraeumen = { art: 'knopf'|'nachAbnahme'|'aktionen'|'link' }`:
- laedt/leer: „Stand des Arbeitsordners wird gelesen …“; fehler (Netz, 400, 404, 5xx): Fehlertext + „Aktualisieren“, keine Blöcke aus
  altem Stand.
- 409 (F-1157 (5)): Lage, keine Fehlerfarbe; `aufgeraeumt` = „Erledigt: Der Arbeitsordner ist aufgeräumt“ (Endzustand); übrige Schlüssel
  `arbeitsordner.sichernGrund.<k>`.
- 200 bereit: Badge „Bereit zum Sichern“ (bestehende Klasse), Zeile Änderungen / „{n} Commits noch nicht auf main“, Schrittliste
  `sichern-schritte`: 1 Sichern (Blöcke über `renderBefehlsblock(…, { echteWerte: true })` oder Grund + Hinweise) → 2 „Pull Request und
  Merge im Web“ → 3 **genau ein** „Aufräumen“ (V3): `knopf` (Kartenknopf wandert hierher) | `nachAbnahme` („nach deiner Abnahme“) |
  `aktionen` (Modus null: Verweis auf den Knopf unter den Aktionen) | `link` (Workboard: `#/workflows/<id>`). Stand-Zeitpunkt, „Aktualisieren“.
- 200 nicht bereit: `nichtAbgeschlossen` + GESTOPPT mit `offeneAenderungen > 0` ⇒ „gestoppt; {n} offene Änderungen. Weg: Aufräumen — mit
  „Änderungen verwerfen“, wenn du sie nicht willst“ (F-1157 (6)); GESTOPPT nur `voraus > 0` ⇒ eigener Text (Bauauflage 5); `nichtsOffen`
  ⇒ „Nichts offen — weiter mit Aufräumen“; übrige ⇒ Grundtext. Schritt 3 erscheint auch hier genau einmal.
- `renderArbeitsordnerKarte(ao, codeStand, kontext)`: neues `kontext.sichern = { stand, aufraeumen }` ⇒ Abschnitt statt der alten Zeile; der
  Kartenknopf entfällt dann (er ist Schritt 3). Ohne `kontext.sichern` bitgleich zu heute minus alte Zeile; Schlüssel `arbeitsordner.sichern`
  entfällt (Text „bis … kommt“ veraltet).
- `projekt`: Satz „Im Projektordner gearbeitet — Sichern über Code“ + Link `#/code`; `keinBedarf`: „Schreibt keine Dateien — nichts zu
  sichern“ (getrennte Schlüssel, F-1157 (7)); `unbekannt` (O3): fester Hinweis mit Link `#/workflows/<id>`.

## 5 — Einbau

- **Abnahme (`views/workflows.js` `zeichneEntscheiden`)**: Modus `abnahme` und neu Modus null bei ABGESCHLOSSEN/GESTOPPT ⇒ Karte mit
  Abschnitt bei Quelle `ablauf` (Modus null: `aufraeumen: aktionen`, Modus abnahme: `nachAbnahme` bzw. `knopf`); `projekt`/`keinBedarf`
  als Satz. `stelleAblaufCodeStandSicher(id, sichernSchluessel(aktuellesDetail))` nur dort; `aktuellesDetail.versionSequenz` neu.
  Abonnent zeichnet nur, wenn `aktuellesDetail.workflowId` passt.
- **Kopieren/Aktualisieren**: exportiert `behandleEntscheidenKlick(ereignis, abh)` (Abhängigkeiten als Parameter, in Node testbar), an
  `#workflow-entscheiden` gehängt: `[data-befehl-kopieren]` → `kopiereBefehlsblock`, `[data-sichern-aktualisieren]` → `ladeAblaufCodeStand(id,
  { neu: true })`. Bestehende `.wf-aktion`-Delegation bleibt.
- **Workboard (`renderTerminalBlock`, Phase „abgeschlossen“)**: `ablauf` ⇒ Stand-Modul + Abschnitt (`aufraeumen: link`); `projekt` ⇒ heutiger
  Weg; `keinBedarf`/`unbekannt` ⇒ Satz. `codeStandNachAblauf`-Neuladen nur bei `projekt`. Delegation `#workboard-bearbeitung`:
  `[data-sichern-aktualisieren]`. Abonnent zeichnet nur das offene Detail.
- **`#/code`**: Hinweis node_modules in Dateiliste und Sichern (§1).
- **Enter-Hinweis** `befehl.enterHinweis` neu de/en/tr/ru: „Nach dem Einfügen Enter drücken – erscheint „>>“, noch einmal Enter.“
- i18n de/en/tr/ru: `arbeitsordner.sichernAbschnitt.*`, `arbeitsordner.sichernGrund.<SICHERN_GRUENDE>` (neun), neu nur keinOrt, losgeloest,
  fremderBranch, keinOrigin, nodeModules — sonst `code.sichern.grund.*` wiederverwenden (Bauauflage 8). Keine Kennung im Text. CSS: nur
  Tokens, höchstens `sichern-schritte`.

## 6 — Gate `scripts/check-f45-b2b4a2b-anzeige.mjs` (in `check:gates`), Attrappen zur Laufzeit
(a) `?workflow=`: `sichernQuelle` je Status (`fehlt`, IN_VORBEREITUNG, BEREIT, FEHLGESCHLAGEN, ENTFERNT, unbekannt ⇒ `ablauf`);
`holeAblaufCode` mit `encodeURIComponent`. (b) kein Abruf im Poll: 5× gleicher Schlüssel ⇒ 1 Abruf; Fehler + 5× ⇒ 1; neuer Schlüssel ⇒ 2;
Quelltext: `zustand.js` importiert weder Stand-Modul noch `holeAblaufCode`; `holeAblaufCode` nur im Stand-Modul; Views rufen
`stelleAblaufCodeStandSicher(…, sichernSchluessel(`; `ladeAblaufCodeStand(` in Views nur mit `neu: true`. (c) push-Block: fremder Branch,
losgelöst, main, ohne origin ⇒ kein `git push`; passend ⇒ genau ein push-Block mit `psArgument(arbeitsordner.branch)`; Pfad aus
`arbeitsordner.pfad`; **gekappt + voraus > 0 ⇒ push-Block** (V2). (d) genau ein Aufräumen je Abschnitt in allen vier Arten und Lagen;
Karte mit `sichern` ohne eigenen Knopf. (e) node_modules: nie in `git add`, Hinweis sichtbar (`#/code` und Abschnitt), `leseDateien`
zählt sie nicht. (f) V1: Aufräumen/Vorbereitung/neue Fassung ⇒ neuer Schlüssel. (g) Kopieren-Handler mit Attrappe + Delegation registriert.
(h) i18n vierfach, ohne `wf/`, `workflow-`, `F-1`. (i) `starteWorkflowSchritt(` = 6, Server 13.366.
Rotfälle je Teil im Gate selbst (Quelle `projekt` für BEREIT, Laden je Aufruf, push trotz fremdem Branch, push an Kappung gebunden, zwei
Aufräumen, node_modules in add, Hinweis fehlt, alter Schlüssel, Handler ohne Kopieren, fehlender ru-Schlüssel).
Unit-Tests: `code-daten.test` (neue Regeln), `ablauf-code-stand.test` (neu), `ablauf-sichern-anzeige.test` (neu, je Lage),
`arbeitsordner-anzeige.test`, `routen-code.test` (node_modules), `workflows-sichern.test` (Handler).

## 7 — Render-Nachweis `features/F45/nachweise/b2b4a2b/`
Neutrale Instanz (Muster `b2b3b2b2a3/instanz.mjs`, neutrales HOME/TEMP, feste Antworten für GET …/code?workflow=, Pfadprobe je Bild).
Lagen: bereit (commit), bereit (push), node_modules ausgelassen, aufgeräumt (409), GESTOPPT mit Änderungen, ohne Arbeitsordner; Abnahme mit
Kopieren (Klicktabelle: Zwischenablage = Blockzeilen). de 1440/390 hell/dunkel; ru 390; 200 % und reduzierte Bewegung nur für „bereit
(commit)“; scrollWidth/clientWidth bei 390. Workboard-Fall nur, wenn die Instanz Click-to-Work abbildet — sonst Abnahme Modus null, Abweichung
benannt.

## 8 — Findings/Doku
F-979, F-1087, F-1157 erledigt (Reste benannt); neues Finding (nächste freie ID) PROCESS_IMPROVEMENT P3 „Challenger-Commit-Block prüfte
‚NICHT GESTAGT‘ mit `git status --short` (listet auch Gestagtes) → Fehlabbruch; Regel: `git diff --name-only` + `git ls-files --others`“,
Status erledigt (Regel angewandt ab 19.10.2026). `docs/projekt/fixpaket-f45.md`: 4a-2b gebaut. `features/F45/feature.md` nachziehen.

## Abhaken
F-1157: (1) §1 + Gate (e) · (2) `ablaufSicherBefehle` + Gate (c) · (3) dto. · (4) §3 + Gate (b) · (5) §4 409 · (6) §4 GESTOPPT · (7) §2
`sichernQuelle` + getrennte Texte · (8) Delta 8 (`aufraeumen`-Art), 12→V1, 13 (Branch/origin), 14 (Kartensignatur), 15 (Workboard-Delegation),
16 (Kommentare), 20 (kein `.method`), Befund 6 (`sichernQuelle`); 9/10/17/18 in 4a-2a erledigt, 11 in 4a-1, 19 entfällt.
V1 §2/§5 + Gate (f) · V2 §2 + Gate (c) · V3 §4 + Gate (d). Bauauflagen 1, 2, 5, 6, 8 oben; 3 Gate (b); 4/7/9 in 4a-2a.

## Prüfpass nach dem Bau
`code-reviewer`, `qa`, `design-guardian` (frischer Kontext), höchstens eine Korrekturrunde. Nur betroffene Tests/Gates (oben, dazu
`check-f45-b2b4a1-sichern`, `check-f45-b2b4a2a-blockform`, `check-f45-b2a3b-review-stand`, `check-f44-i18n`, `check-f813-csrf`,
`check-wachstumsbremse-server`, Lint/Typprüfung). Vollen Check fährt Stefan. Nicht committen.

## Advisor `advisor-b2b4a2b.md`: Freigegeben mit Hinweisen, Zuschnitt knapp zu groß — Bauauflagen (Planklarstellung)
- [x] 1 Filter in `leseDateien` nur `art === '??'` (getrackte/gestagte node_modules bleiben sichtbar; `alterPfad` entfällt); Grenze zu
  `src/arbeitsordner/index.ts:347` (andere Regel der Vorbereitung) im Kopf von `code-daten.js` — 4a-2b-1.
- [x] 2 Hinweis `nodeModules` unabhängig vom Ergebnis, auch neben `{ grund }`; fehlendes Feld = 0 (alter Server) — 4a-2b-1.
- [ ] 3 Aufräumen-Art rein aus demselben `aufraeumenMoeglich(...)` wie `renderArbeitsordnerAktion`: `aktionen` nur bei wahr, sonst
  `nachAbnahme` bzw. neutraler Text; Art `knopf` gestrichen (nie erreichbar); Gate (d) entsprechend — **4a-2b-2**.
- [x] 4 `remoteWebUrl.status !== 'ok'` ⇒ sichtbarer Hinweis `originUnbekannt` (nur wenn ein push anstünde) — 4a-2b-1.
- [x] 5 Köpfe: `code-daten.js` „Wird aufgerufen von: routen-code.mjs“; `routen-code.mjs` Feld `dateien` und Allowlist — 4a-2b-1.
- [ ] 6 Grenze: Workboard frischt nach „abgeschlossen“ nicht auf — V1 wirkt dort nur über „Aktualisieren“ — **4a-2b-2** (Workboard).

**Prüfpass 4a-2b-1** (code-reviewer, qa, design-guardian je „Freigegeben mit Hinweisen“), eine Korrekturrunde: Kappung vor „nur
node_modules“ (älterer Server, cr 1); origin-Hinweis nur bei fälligem push (cr 3); Regel erfasst auch „node_modules“ ohne Schrägstrich
(Verknüpfung, qa 1); Grund „Ausgabe von git status zu groß“ nennt node_modules ohne .gitignore (Plan §1 Grenze, cr 2/qa 2 — für die
Dateiliste); Kopf `ablauf-sichern.mjs` nachgezogen (qa 3); Texte: Abhilfe genannt, kein „gestagt“, Geviertstrich, ein Satz weniger bei nur
node_modules (qa 4, dg 2–4); `.code-node-modules` 12 px (dg 1); Tests/Gate: >500 echte Dateien, Ende-zu-Ende bis `leiteSichernLageAb`
(qa 9), weitere Gegenproben (cr 4, qa 10/11); ru-Bild (dg 6).
**Für 4a-2b-2 / Grenzen:** Text `nichtBestimmbar` (`ablauf-sichern.mjs` `SICHERN_GRUND_TEXT`, Übersetzung `arbeitsordner.sichernGrund.*`)
nennt node_modules als mögliche Ursache erst mit der Anzeige; Workboard rendert `hinweise` nicht (cr 6); „Bereit zum Start?“ und die
Projektordner-Zeile der Karte zählen ohne node_modules und zeigen keinen Hinweis (qa 5); ein älterer Serverprozess mit neuem `public/`
zeigt node_modules ungefiltert (sicher, nie in `git add`; qa 6); eine gewollte Datei unter einem Ordner node_modules fällt heraus (qa 7).

**Schnitt (Entscheidung Stefan offen):** 4a-2b-1 „Regeln und node_modules“ = §1, §2, Hinweis `#/code`, Gate `sichernQuelle`/(c)/(e)/(f),
Tests `code-daten`/`routen-code`, Render-Nachweis nur `#/code` mit node_modules 1440/390 · 4a-2b-2 „Anzeige“ = §3–§7, Gate (b)(d)(g)(h).
Naht: `ablaufSicherBefehle`, `sichernQuelle`, `sichernSchluessel`, `istNodeModulesPfad`.

## Risiken
- `leseDateien` ändert `anzahl` (ohne neue node_modules-Dateien) auch für `#/code`, die Ableitung, `auftrag-umgebung.js` (:86, :205),
  die Projektordner-Zeile der Karte (`arbeitsordner-anzeige.js:77`) und `bereitschaft` („Bereit zum Start?“ warnt bei reinem node_modules
  nicht mehr) — gewollt (O2), sichtbar über den Hinweis.
- Umfang: zwei neue Module, zwei Views, Karte, i18n ×4, Gate, Render-Matrix — der vom Advisor vorgeschlagene 4a-2b-Rest; die Render-Matrix ist
  bereits verkleinert (ru/200 % nur „bereit (commit)“).
- Workboard „abgeschlossen“ erscheint nur nach Click-to-Work in derselben Sitzung (bestehende Grenze).
