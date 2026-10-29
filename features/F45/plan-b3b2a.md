# Plan v1 — F45 B3b-2a „Render-Nachweis im Lauf (Kern)“

Bauauftrag: Challenger 29.10.2026, GO_STANDARD. Basis main `12d5ee9` (#396), Branch `feature/f45-b3b2a-render-im-lauf`.
Ziel: `npm run check:render` des Skeletts läuft nach jedem grünen Ausführungslauf deterministisch durch den Kern (F-1256).
Die Bewertung der Darstellung ist B3b-2b (E-B3B2-1 = A).

## 1 Kern-Render nach dem Lauf

Neues Modul `src/pruefschritt/render.ts` (Muster `src/pruefschritt/index.ts`, kein zweiter Prozessstart-Regelsatz):

- `RENDER_ZEITGRENZE_MS = 180_000`, `RENDER_AUSGABE = '.render-nachweis/'`.
- `renderNachweisFaellig({ ausfuehrung, pruefErgebnis, wurzel })` — rein bis auf `existsSync(join(wurzel, 'render.json'))`:
  true nur bei `ausfuehrung === true` UND `pruefErgebnis === 'GRUEN'` UND render.json ist eine Datei.
- `fuehreRenderNachweisDurch(laufId, wurzel, optionen?)` → `Promise<PruefergebnisV0Daten>`, wirft nie:
  1. `fuehreGitAsync(['--no-optional-locks', 'check-ignore', '-q', '--no-index', '--', '.render-nachweis/'], { cwd: wurzel, zeitgrenzeMs: 5000 })`
     (Muster `pruefeZielIgnoriert`, `src/faehigkeiten/vorschlag.ts`; Probe: `.render-nachweis/` mit Schrägstrich
     liefert 0 bei Muster `.render-nachweis/` und `.render-nachweis`, 1 ohne Eintrag). Code 1 ⇒ FEHLER mit
     `ausgabe_ende` „nicht ausgeführt: .render-nachweis/ steht nicht in .gitignore“; Code ≠ 0/1 oder Abbruch ⇒ FEHLER
     „nicht ausgeführt: git check-ignore nicht auswertbar (…)“. Kein Prozess `npm` in beiden Fällen.
  2. argv `[process.execPath, findeNpmCli(), 'run', 'check:render']` (`findeNpmCli` aus `src/projekt-anlegen/index.ts`,
     dieselbe Form wie der pruefbefehl neuer Projekte; `.cmd` ist in `pruefeStartziel` gesperrt). Wirft `findeNpmCli`
     ⇒ FEHLER mit dessen Meldung.
  3. `fuehrePruefungDurch(laufId, argv, wurzel, RENDER_ZEITGRENZE_MS)` — gleiche Umgebung ohne `LEITSTAND_*`, gleiche
     Klassifikation GRUEN/ROT/ZEITGRENZE/FEHLER, gleiches `ausgabe_ende`.
  `befehl` im FEHLER-Fall ohne Prozess: das geplante argv bzw. `['npm', 'run', 'check:render']`, wenn npm-cli fehlt
  (Schema verlangt nicht-leere Strings, keinen absoluten Pfad).
- `registriereRenderNachweis(laufId, wurzel, registriere, meldeFehler)` — führt aus, validiert mit
  `validierePruefergebnisDaten`, ruft den Rückruf `registriere(daten)` (schreibend, bleibt im Server, ARCHITECTURE.md §1),
  fängt jeden Wurf und meldet ihn über `meldeFehler(text)`. Wirft nie.

Server `scripts/leitstand-server.mjs`, direkt nach `registriereKernArtefakt(\`pruefergebnis-${laufId}\` …)` im try des
Prüfschritts (~6701):

```js
// F45 B3b-2a (F-1256): nach GRÜN der Render-Nachweis (src/pruefschritt/render.ts) — wirft nie, hält nie, keine Korrekturrunde.
if (renderNachweisFaellig({ ausfuehrung: laufort?.loeschliste === true, pruefErgebnis: pruefDaten.ergebnis, wurzel: nachlaufWurzel })) await registriereRenderNachweis(laufId, nachlaufWurzel, (daten) => registriereKernArtefakt(`render-nachweis-${laufId}`, profilReferenz, { erzeuger: 'kern', schritt: 'nach-lauf-render-nachweis' }, daten, [], { basisVerzeichnis, schreiber: STILLER_SCHREIBER }), (fehler) => { startfehlerListe.push({ zeitstempel: new Date().toISOString(), laufId, fehler }); console.error(`[leitstand] ${fehler}`) })
```

- „Nur für die Ausführung“: `laufort.loeschliste` ist heute genau `schritt.rolle === 'ausfuehrung'` (Server ~7992);
  ad-hoc `POST /api/laeufe` hat keinen laufort ⇒ kein Render. Kommentar nennt die Kopplung.
- Ohne pruefbefehl, ohne GRÜN, ohne render.json: kein await, kein Artefakt (bitgleich).
- D13: der Render läuft vor dem Reset von `laufAktiv` (wie der Prüfschritt) — ein zweiter Lauf startet erst danach.
- Laufzeit: bis 180 s zusätzlich vor `meldeLaufende` (der nächste Schritt startet später). Bewusst: das Artefakt muss vor
  dem qa-Schritt stehen (B3b-2b liest es).

## 2 Kein Halt, keine Regeländerung

- Regel 1f (`src/workflow/index.ts`), der Halt-Leser (~7648), „Prüfung wiederholen“ (~11853), die Abnahme (~8705, ~8855)
  und `loeseSchrittEingabenAuf` (`pruefergebnis-@`) lesen alle über das exakte Literal `pruefergebnis-${laufId}`; kein
  Präfix-Scan (grep `startsWith('pruefergebnis` / Regex: keine Treffer). `render-nachweis-<laufId>` wird von keinem
  dieser Leser gefunden. Nachweis im Test: ROT des Render-Nachweises ⇒ Review startet trotzdem.
- „Prüfung wiederholen“ nach ROT ⇒ GRÜN startet KEINEN Render (nicht im Auftrag) ⇒ Abnahme ohne Karte („fehlt“).
  Neues Finding F-1271 (P3, Maßnahme B3b-2b oder bei Bedarf).

## 3 Abnahme

- Neue Datei `scripts/leitstand/abnahme-pruefung.mjs` (rein lesend): `projizierePruefergebnis(ausfuehrungSchritt,
  ladeOptionen)` — bisherige Projektion aus GET …/abnahme (~8699–8712) unverändert ausgelagert (Ausgleich W1) — und
  `projiziereRenderNachweis(ausfuehrungSchritt, ladeOptionen)`: `ladeArtefaktVersion(\`render-nachweis-${lauf_id}\`)`
  ⇒ `{ status: 'ok', ergebnis, dauer_ms, ausgabe_ende, gestartet_am }`, sonst (kein Schritt, keine lauf_id, kein
  Artefakt, ungültige Daten) `{ status: 'fehlt' }`.
- Server: `renderNachweis: projiziereRenderNachweis(ausfuehrungSchritt, ladeOptionen),` im 200-Body; keine neue Route.
- Neue View `public/leitstand/views/abnahme-render.js`: `renderRenderNachweisKarte(projektion)` — '' bei status ≠ 'ok';
  sonst `<section class="entscheiden-karte">` mit h3 „Darstellung (Render-Nachweis)“, Badge (vorhandene Klassen
  `entscheiden-wert-ok/-fehler` bzw. `ablauf-status ok/fehler`), Dauer (Sekunden, `formatiereZahl`), `<details>`
  „Ausgabe-Ende“ mit `<pre>` (escaped), Satz „Bilder und Protokoll liegen im Arbeitsordner unter .render-nachweis/“;
  bei ROT/ZEITGRENZE/FEHLER amber Hinweis (vorhandene Hinweis-Klasse der Abnahme, z. B. `abnahme-hinweis warten`)
  „Darstellung mit Befunden — Abnahme trotzdem möglich“. Keine neuen Farben/Tokens.
- Einbindung in `workflow-abnahme.js` ohne Wachstum (Ratsche 977): Import +1 Zeile, Aufruf an zwei bestehenden Zeilen
  (Seite „entscheidbar“: direkt hinter der Kachel-Sektion mit der Prüfungskachel; Lage „vorab“: im `ergebnis`-Ausdruck
  hinter `renderErgebnisDetails`), Ausgleich −1 Zeile durch Zusammenziehen eines Kommentars ohne Inhaltsverlust.
- i18n de/en/ru/tr: `abnahme.render.titel`, `.dauer`, `.ausgabe`, `.ort`, `.befunde`, `.wert.*` (oder Wiederverwendung
  `abnahme.pruefung.wert.*`).

## 4 Skelett

- `vorlagen/projekt-skelett/scripts/render-nachweis.mjs` (F-1262): `bewerte` meldet „LCP nicht messbar“ nicht mehr;
  neue reine Funktion `hinweise(e, variante)` liefert ihn als Hinweis (nur Variante mit `messen`). Ergebnis trägt
  `hinweise`; Protokoll `## Hinweise` (md + json), Konsole `ℹ …`; Exit-Code nur aus Befunden. Bytes, HTTP, Überlauf,
  laufende Animation unter reduzierter Bewegung, LCP über Budget bleiben Befunde. Datei-Kopf angepasst.
- `docs/harness/gate-vorlage-node.md` Abschnitt UI: mit Build `"check:render": "npm run build && node scripts/render-nachweis.mjs"`
  (Begründung: der Kern führt `check:render` nach jedem Lauf aus), ohne Build unverändert.
- `HERKUNFT.md`/Prüfsummen über das vorhandene Werkzeug des Gates `skelett-herkunft` nachziehen.

## 5 Tests/Nachweis

- `src/pruefschritt/render.test.ts`: `renderNachweisFaellig` (keine render.json ⇒ false, ROT ⇒ false, keine
  Ausführung ⇒ false, alles da ⇒ true); temporäres git-Repo ohne Eintrag ⇒ FEHLER mit Grund, kein npm; mit Eintrag und
  `package.json` `"check:render": "node -e \"process.exit(0)\""` ⇒ GRUEN, `exit 1` ⇒ ROT;
  `registriereRenderNachweis` mit werfendem Rückruf ⇒ meldeFehler, kein Wurf. Pfade über `join`, kein `\` in Erwartungen.
- `scripts/render-im-lauf.test.mjs` (Server-Integration, Muster `check-f652-pruefschritt.mjs`, in `SERIELL` von
  `scripts/teste.mjs`): Repo mit render.json, `.gitignore` mit `.render-nachweis/`, Stub `check:render` exit 1,
  pruefbefehl GRÜN ⇒ `render-nachweis-<laufId>` ROT, Review-Schritt startet (Kette läuft weiter), GET …/abnahme
  `renderNachweis.status === 'ok'`, `ergebnis === 'ROT'`; ohne render.json ⇒ kein Artefakt, `renderNachweis.status === 'fehlt'`.
- `public/leitstand/views/abnahme-render.test.mjs` (Muster `workflow-abnahme.test.mjs`): fehlt ⇒ '', GRUEN ohne
  Hinweis, ROT mit Hinweis, Ausgabe escaped, i18n-Schlüssel in allen vier Sprachen.
- `scripts/skelett-render-nachweis.test.mjs`: LCP null ⇒ kein Befund, ein Hinweis; Bytes über Budget bleibt Befund.
- `features/F45/nachweise/b3b2a/nachweis.md`.

## 6 Register und Fixpaket

Wie im Bauauftrag Punkt 6 (B3b-2 → B3b-2a/B3b-2b, E-B3B2-1, E-B3B-1, E-SEC-1, Q1, „Sicher bauen“ in §6, Reihenfolge;
findings: F-1250 → Q1, F-1072/F-1052 Nachtrag, F-1256 erledigt, F-911 Rest → B3b-2b, neu F-1261 … F-1270), dazu F-1271
(Render nach „Prüfung wiederholen“). STATUS.md-Zeile nur, wenn das Doku-Gate es verlangt.

## 7 Zeilenbilanz Server (W1)

+2 Importe, +2 Nachlauf (Kommentar + Aufruf), +1 Abnahme-Feld, −13 ausgelagerte Prüfergebnis-Projektion ⇒ ≈ −8.
`scripts/wachstumsbremse-server.json` Grenze auf das Ist senken (nur senkbar).

## 8 Risiken

- R1 Laufzeit: Chromium-Start + Seiten ≈ 10–60 s je Lauf; Zeitgrenze 180 s, danach ZEITGRENZE (Prozessbaum-Kill wie
  Prüfschritt).
- R2 `findeNpmCli` hängt an `npm_execpath`/Layout; im Leitstand-Prozess (gestartet über `npm run leitstand`) gesetzt.
- R3 Integrationstest startet echtes `npm run` (≈ 1 s); läuft seriell.
- R4 Abnahme-Polling alle 2 s liest ein Artefakt mehr (eine Datei, klein: `ausgabe_ende` ≤ 16 KB).
- R5 Server-Komplexität: `starteLaufUndVergiss` steht schon über der Grenze; die Zahl der Befunde je Datei (Ratsche)
  wächst nicht.

## Nicht-Ziele

Kein Prüfer-/design-guardian-Schritt, keine Änderung an qa-Auftrag, Regel 1q, Automatik, harness-abgleich/standard.json,
keine Bild-Route, kein Dev-Server, kein neues Startvorlagen-Feld, keine Schemaänderung, keine Änderung am
Leitstand-eigenen `scripts/render-nachweis.mjs`.
