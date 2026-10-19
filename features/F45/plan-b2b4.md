# F45 B2b-4 „Bereit zum Sichern“ — Plan v1

> **Geteilt → `plan-b2b4a.md` / 4b folgt** (Advisor `advisor-b2b4.md`: zu groß; Entscheidung Challenger 19.10.2026:
> 4a = A–C, 4b = D–E). Diese Fassung bleibt als Verlauf unverändert stehen.

Stand: 19.10.2026, Branch `f45/b2b4-sichern` von `origin/main` = `d7f207c` (#365). Löst F-979, F-1087, F-1085 (5).

## Befunde (gegen d7f207c bestätigt)

- `src/workflow/index.ts` Z. 88: `WORKFLOW_STATUS` kennt nichts zwischen `ABGESCHLOSSEN` und Merge (F-979).
- `scripts/leitstand-server.mjs` Z. 8497–8516: GET `/api/code` und `/api/code/diff` bauen immer im Projektordner
  (`repoWurzel`), ein einziger `codeProjektionLaufend` (F-1087).
- `ermittleLaufort` (Z. 6496) liefert `{ ok, wurzel, arbeitsordner: { pfad, branch } | null }` fail-closed; sein `grund`
  nennt `Workflow '<id>'` (interne Kennung — nicht sichtbar weitergeben).
- Jarvis bekommt nur `baueProjektCdZeile(repoWurzel)` (Z. 10803, 10854; `src/jarvis` `baueCdRegelZeile`) (F-1085 (5)).
- POST `…/arbeitsordner-aufraeumen` existiert (Z. 12233), gesperrt bei offener Abnahme; `branch -d` nur gemergt.
- Server = 13.416 Zeilen = Grenze. `starteWorkflowSchritt(` = 6×.

## A — Ableitung „Bereit zum Sichern“ (kein neuer Status)

Neues Modul `scripts/leitstand/ablauf-sichern.mjs` (rein, kein I/O):

`leiteSichernLageAb({ workflowStatus, abnahmeErgebnis, arbeitsordner, ordnerVorhanden, projektion })` →
`{ bereit: boolean, grund: null | 'nichtAbgeschlossen' | 'abgelehnt' | 'keinArbeitsordner' | 'aufgeraeumt' | 'ordnerFehlt' | 'nichtBestimmbar' | 'nichtsOffen', offeneAenderungen: number|null, voraus: number|null }`

Reihenfolge der Regeln:
1. `workflowStatus !== 'ABGESCHLOSSEN'` → `nichtAbgeschlossen`
2. `abnahmeErgebnis === 'ABGELEHNT'` → `abgelehnt` (abgelehntes Ergebnis wird nicht zum Sichern angeboten; Zusatz zum
   Auftrag, Advisor bitte bewerten)
3. kein Arbeitsordner (`null`) → `keinArbeitsordner`
4. `aufraeumen !== null` oder Status `ENTFERNT` → `aufgeraeumt`
5. Status ≠ `BEREIT` oder Ordner fehlt → `ordnerFehlt`
6. Projektion nicht `ok` / `dateien` oder `basis` nicht `ok` → `nichtBestimmbar`
7. `dateien.anzahl > 0` oder `basis.voraus > 0` → **bereit**
8. sonst → `nichtsOffen` (gemergt oder nichts geändert)

Grenze (DEKLARIERT): „gemergt“ = `voraus === 0` gegen `origin/main` bzw. `main`. Nach einem Squash-Merge im Web bleibt
`voraus > 0` — der Ablauf bleibt „Bereit zum Sichern“, bis aufgeräumt ist. Neues Finding (P3).

Unit-Tests `scripts/leitstand/ablauf-sichern.test.mjs`: alle 8 Zweige, Reihenfolge, fehlende Felder.

## B — `?workflow=<id>` an `/api/code` und `/api/code/diff` (keine neue Route)

Ablauf im Server (bestehender Block, Herkunftsprüfung zuerst, unverändert):
1. `pruefeCodeHerkunft` → 403 wie heute.
2. `const ort = loeseCodeOrt(angefragteUrl.searchParams.get('workflow'))` (Server-Closure, nur lesend):
   - Parameter fehlt → `{ wurzel: repoWurzel, ablauf: null }` → Antwort **bitgleich** wie heute.
   - Formprüfung zuerst (rein, `pruefeAblaufKennung` im Modul: String, 1–200 Zeichen, kein `/`, `\`, `..`, Steuerzeichen —
     dieselbe Zeichenregel wie `LAUFID_UNZULAESSIGE_ZEICHEN`) → 400, noch vor jedem Dateizugriff.
   - `ladeArtefaktVersion('workflow-<id>')` null → 404 `{ grund: 'Ablauf nicht gefunden', grund_schluessel: 'unbekannt' }`.
   - `ermittleLaufort` nicht ok → 409 `{ grund, grund_schluessel }` mit eigenem Text ohne Kennung;
     Schlüssel `nichtAngelegt` | `nichtBereit` | `ordnerFehlt` | `aufgeraeumt` (rein abgeleitet im Modul aus der
     Arbeitsordner-Lage: `codeOrtGrund(lage)`).
   - ok → `{ wurzel: laufort.wurzel, ablauf: { workflowId, arbeitsordner: laufort.arbeitsordner, sichern } }`.
3. `/api/code`: `codeProjektionLaufend` wird `Map<wurzel, Promise>` (gleichzeitige Abrufe je Laufort teilen einen Aufbau).
   Mit `ablauf` hängt der Server das Feld `ablauf` an (inkl. `sichern` = `leiteSichernLageAb(...)`); ohne Parameter kein
   Zusatzfeld.
4. `/api/code/diff`: `baueCodeDiff({ repoWurzel: ort.wurzel, pfad })` — Allowlist wie heute, nur im Laufort.
5. Die id ist nie ein Git-Argument: sie geht nur in `ladeArtefaktVersion` und `ermittleLaufort`; `cwd` = Pfad aus dem
   Kontrollzustand. Für den Nachweis bekommt der Handler eine Test-Option `codeGit` (Default `fuehreGitAus`), an
   `baueCodeProjektion`/`baueCodeDiff` durchgereicht (1 Zeile).

## C — Sichern-Block je Ablauf (Oberfläche)

- `public/leitstand/api.js`: `holeAblaufCode(workflowId)` — `fetch(mitPraefix('/code?workflow=…'))`, liefert
  `{ http, koerper }` (409/404 mit `grund_schluessel` bleiben lesbar). `holeCode()` unverändert.
- Neu `public/leitstand/ablauf-code-stand.js`: Zwischenspeicher je workflowId (`ladeAblaufCodeStand(id, { neu })`,
  `aktuellerAblaufCodeStand(id)`, `abonniereAblaufCodeStand(fn)`), nie aus dem Poll, Überholschutz wie `code-stand.js`.
- Neu `public/leitstand/views/sichern-anzeige.js` (rein): `renderSichernBlock({ workflowId, stand, aufraeumenHtml })` —
  Kennzeichen „Bereit zum Sichern“ (Badge), Befehlsblöcke aus `sicherBefehle(stand.daten)` (cd auf den Arbeitsordner,
  Branch `wf/<id>`: [cd, add…, commit] und getrennt [cd, push] — unverändert aus `code-daten.js`), die nächsten Schritte
  (1 sichern → 2 PR/Merge im Web → 3 „Aufräumen“), 409-Grund übersetzt über `grund_schluessel`, Zustände
  laedt/fehler/nichtsOffen. Test `sichern-anzeige.test.mjs`.
- `views/workboard.js` `renderTerminalBlock`: hat der Ablauf einen Arbeitsordner (`workflowDetail.arbeitsordner.status
  === 'BEREIT'`), lädt er einmal je Ablauf `?workflow=` und zeichnet `renderSichernBlock` (Aufräumen als Link auf
  `#/workflows/<id>`, dort der bestehende Dialog). Sonst der heutige Weg — **bitgleich**.
- `views/workflows.js` `zeichneEntscheiden`: Abnahme-Modus → Arbeitsordner-Karte + Sichern-Block; nach entschiedener
  Abnahme (Modus null) bei `ABGESCHLOSSEN` + Arbeitsordner `BEREIT` → nur Sichern-Block (das ist der Zustand aus F-979).
  Knopf „Aufräumen“ = bestehendes `data-aktion="aufraeumen-oeffnen"` (nur wenn `aufraeumenMoeglich`). Ohne Arbeitsordner
  `''` wie heute.
- `#/code` bleibt beim Projektordner (kein Parameter).
- i18n de/en/tr/ru: Kennzeichen, Schritte, Gründe (`sichern.grund.*`, `sichern.ort.*`). Keine internen Kennungen.
- CSS: nur bestehende Tokens/Klassen (`ablauf-status`, `befehlsblock`, `note`), höchstens eine Listenklasse.

## D — Jarvis: cd-Zeilen offener Arbeitsordner

- `src/jarvis`: `JarvisAuftragOptionen.ablaufCdZeilen?: readonly { titel: string; cdZeile: string }[]`. Nicht leer →
  nach `baueCdRegelZeile` zusätzlich:
  `- Arbeitet ein Ablauf in seinem eigenen Arbeitsordner, beginnt jeder Block für diesen Ablauf stattdessen mit dessen cd-Zeile:`
  je Eintrag `  - Ablauf „<titel>“: <cdZeile>` und
  `- Wähle nie stillschweigend einen Ordner: ist unklar, welcher Ablauf gemeint ist, frage nach.`
  Leer/fehlend → Text **bitgleich** (Golden-Hash des heutigen Texts im Gate).
- Modul `ablauf-sichern.mjs`: `baueAblaufCdZeilen(eintraege)` — offene (wirksam `BEREIT`, `aufraeumen` null, Ordner
  vorhanden), neueste zuerst (`aktualisiert_am`), höchstens 5, Titel = `ziel` einzeilig, Steuerzeichen raus, ≤ 80 Zeichen;
  `cdZeile` aus `code-daten.js`.
- Server: Closure `sammleArbeitsordnerEintraege()` (aus GET `/api/arbeitsordner` herausgezogen, dort wiederverwendet) +
  `jarvisAblaufCdZeilen()`; beide Jarvis-Aufrufe geben `ablaufCdZeilen` mit.

## E — Findings/Doku

- F-979, F-1087, F-1085 (5) erledigt (Fundstellen); F-1085 (10) Nachtrag „aus B2b-4 genommen: das Skelett hat keine
  ADR-Konvention; Auslöser R bzw. erstes Projekt mit ADRs“.
- Neu HARNESS_IMPROVEMENT P2 „Voller npm run check bricht in der Claude-Code-Sitzung mit Speichermangel ab …“ (nur Eintrag).
- Neu P3 „Squash-Merge gilt nicht als gemergt“ (Grenze aus A).
- `docs/STATUS.md` ~Z. 103, `docs/projekt/kontext/lagebild.md` ~Z. 104: W1, B2b-3b-2 gemergt, B2b-4 gebaut.
- `fixpaket-f45.md`: B2b-4 gebaut → B2b abgeschlossen (gilt nach dem Merge). `features/F45/feature.md` nachziehen.
- ARCHITECTURE.md: voraussichtlich keine Änderung (keine neue Regel; „Wachstumsbremse“ und §2 Arbeitsordner gelten).

## Server-Zeilen (Ratsche)

Zuwachs geschätzt +15 (loeseCodeOrt ~10, Map-Umbau ±0, codeGit +1, Jarvis-Closure ~6, Sammlung −2).
Ausgleich: reine Helfer `entferneCodezaun`, `entferneAeusserstenCodezaun`, `extrahiereErstesJsonObjekt` (Z. ~3958–4045,
kein I/O, nicht schreibend) nach `scripts/leitstand/text-auszug.mjs`, im Server `import` + `export { … } from` (Gates
importieren sie aus dem Server). Netto ≤ 0; liegt das Ist unter 13.416, wird die Grenze in
`scripts/wachstumsbremse-server.json` auf das Ist gesenkt (erlaubt, (a3)). Keine neue Route, `starteWorkflowSchritt(` 6×.

## Gate `scripts/check-f45-b2b4-sichern.mjs` (in `check:gates`)

- (a) Ableitung: alle Zweige + Rotfälle (je eine Bedingung gekippt ⇒ anderes Ergebnis).
- (b) HTTP mit echtem Handler, Attrappen zur Laufzeit (tmp-Repo, Worktree über den echten Startweg mit Attrappen-Worker,
  Muster `check-f45-b2b3b2b2b2b1-projekt-cli.mjs`): `?workflow=<id>` ok → `absoluterPfad` = Arbeitsordner, Branch
  `wf/<id>`, `ablauf.sichern.bereit`; unbekannt → 404; unzulässig → 400; Pflicht ohne Ordner → 409 mit Schlüssel, Grund
  ohne id; `/api/code/diff?workflow=` im Arbeitsordner.
- (c) ohne Parameter bitgleich: Antwort = `baueCodeProjektion({ repoWurzel, vorlage, startvorlagePfad })` direkt (gleiche
  Schlüssel, kein `ablauf`), `/api/code/diff` ohne Parameter wie heute.
- (d) id nie in Git-Argv: Spion über `codeGit` — kein argv-Element enthält die id; `cwd` ist der Arbeitsordner.
- (e) Jarvis: Golden-Hash ohne Ordner; mit Ordnern höchstens 5, neueste zuerst, Rotfall (6 Einträge ⇒ 5).
- (f) Ratsche: `check-wachstumsbremse-server` grün, `starteWorkflowSchritt(` = 6, kein neues Routen-Literal.
- (g) Gegenproben: 403 fremde Herkunft auch mit `?workflow=`.

## Render-Nachweis `features/F45/nachweise/b2b4/`

Workboard „Bereit zum Sichern“ mit/ohne Arbeitsordner, Abnahme mit Block, 409-Grund; de/ru, 1440/390, hell/dunkel, 200 %;
scrollWidth/clientWidth bei 390; neutrales HOME/TEMP (F-1125), Pfade geschwärzt.

## Nicht im Umfang

F-1085 (10), F-1107, F-1147, F-1153, F-1088 (5) (cd+Folge in einer Zeile), UX-Durchgang, Hooks/settings, `.claude/`,
`projekte.json`, `ressourcen.json`, `vorlagen/`, `.githooks`, `workflow-vorlagen`, `kontrollzustand/`.

## Offene Punkte (nicht stillschweigend entschieden)

- O1: Regel 2 „abgelehnt ⇒ nicht bereit“ geht über den Auftrag hinaus. Alternative: weglassen (dann bot der Leitstand
  an, ein abgelehntes Ergebnis zu sichern).
- O2: Abnahme offen ⇒ „bereit“ (Auftrag: Anzeige auch auf der Abnahme). Alternative: erst nach `ANGENOMMEN`.
- O3: „gemergt“ nur über `voraus === 0` — Squash-Merge bleibt unerkannt. Alternative wäre ein Abgleich über den
  Patch-Inhalt (`git cherry`), teurer und nicht nötig für den Bedienfluss.
- O4: Test-Option `codeGit` im Handler (1 Serverzeile) statt einer statischen Prüfung für „id nie in Git-Argv“.
- O5: Zuschnitt — A–E in einem Paket; vorgeschlagener Schnitt bei „zu groß“: 4a = A–C, 4b = D–E.

## Risiken

- Projektion im Worktree: `baueStartvorlageAuszug` macht den Startvorlagenpfad dann zum Dateinamen (Anzeige, harmlos).
- Abnahme offen ⇒ trotzdem „bereit“; Schritt 3 „Aufräumen“ erst nach der Abnahme (bestehende Sperre).
- Neu-Laden des Ablauf-Stands nur beim Betreten/Abschluss — kein Poll (Git-Last).
