# F45 W2b-1 — Gates umbaufest — Plan v1

Stand 27.10.2026, Branch `f45/w2b1-umbaufest` (Basis main `ba0a253`, #388). Grundlage: `w2-gate-inventur.md`
(Befunde 1, 2, 5, Tabelle). Ziel: Ein Server- oder Frontend-Umbau soll nicht Dutzende Gates gleichzeitig rot färben.
Nicht-Ziel: Gates in Tests umschreiben (Challenger 27.10.2026 — verschiebt nur Laufzeit; „ersetzen durch Test“ nur, wenn
der Bereich ohnehin angefasst wird), Wegwerf-Ordner/`mkdtemp`/Fristen (W2b-2), Biome/Formatierer (W2c).

## 1. Zählungen im Server-Quelltext

**`starteWorkflowSchritt(` = 6:** steht heute in 30 Gates als Prüfung (Kommentare und die Frontend-Funktion gleichen
Namens in `check-f15-workflow-oberflaeche` zählen nicht). **Zentral bleibt `check-f45-b2b3b1-rueckfrage` (f)** — Begründung:
Kandidat „behalten“ (sicherheitsnah, läuft also dauerhaft), prüft dort schon im selben Block den Server-Quelltext
(Opt-in-Regel), kein neuer Code nötig. Alternative `check-wachstumsbremse-server` (Invariante, thematisch passender)
verworfen: Zählung dort wäre neue Gate-Logik. Gestrichen in 29 Gates:
`b2a1-projektkarte` (h, nur der Zählteil; `baueProjektkarte(` 1× bleibt), `b2a2-arbeitspaket` (g, nur Zählteil),
`b2a3-codex-review` (g + Selbsttest „siebenmal“), `b2a3b-review-stand` (f + Selbsttest), `b2b2-pruefer` (f),
`b2b3b1b-auswertung` (f), `b2b3b2a-absicherung` (f), `b2b3b2b1a-rest` (f), `b2b3b2b1b-r1` (f),
`b2b3b2b2a-einschalten` (o3, nur Zählteil; Startzeile bleibt), `b2b3b2b2a3-abnahme` (w), `b2b3b2b2b1-nachweis` (w),
`b2b3c-budget` (f), `b2b3d-umfang` (f), `b2b3e1-pfade` (i), `b2b3e2-formular` (i), `b2b4a1-sichern` (e),
`b2b4a2a-blockform` (c), `b2b4a2b2-anzeige` (h + Selbsttest), `b2b4b-jarvis` (e), `f2b-sammlung` (e),
`f2b2-pruefung` (h, nur Zählteil), `f3a-plugins` (e + Selbsttest), `f3a2-anzeige` (g + Selbsttest),
`f3b1-freigabe` (g), `f3b2-lauf` (m, nur Zählteil + Selbsttest-Fall), `fb1-faehigkeit-vorschlag` (e),
`fb1b-faehigkeit-uebernehmen` (e), `fb2-faehigkeit-anzeige` (h, nur Zählteil + Selbsttest-Fall).
Kopfkommentare der Gates nennen den gestrichenen Punkt nicht mehr bzw. verweisen auf b2b3b1 (f).

**Workflow-Schreiber 14 / `.eingefroren` 13 (F-228):** Herkunft und strukturelle Prüfung (jede Aufrufstelle liest den
GESTOPPT-Schutz) liegen in `check-f15-workflow` (F-228-Block). Die reine Zählung in `b2b3b1` (f), `b2b3c` (f) und
`b2b3d` (f) ist Doppel ⇒ alle drei gestrichen; in b2b3b1 (f) bleibt nur `starts === 6`. b2b3c (f) und b2b3d (f) entfallen
ganz (Block enthält nichts anderes) — damit ist auch die Doppelung „b2b3d (f) = b2b3c (f)“ aus Punkt 3 erledigt.

**Server-Zeilenratsche:** bleibt allein in `check-wachstumsbremse-server`; gestrichen in `b2b3b2b2b1-nachweis` (w),
`b2b4a2b2-anzeige` (h), `fb2-faehigkeit-anzeige` (h), `b5b1b2-bereinigung` (Stelle Z. 532). Übrige Prüfungen derselben
Blöcke bleiben.

## 2. Pins

- `b2b3b2b2a3-abnahme` (w) und `b2b3b2b2b1-nachweis` (w), sha256 auf `scripts/_rueckfrage-aus-pruefung.mjs`: Invariante
  „Regel bleibt streng“ trägt schon die Verhaltensprüfung in `b2b3b2b2a-einschalten` (o3) mit acht Rotfällen (feste
  Adresse, fremde Basis, injizierte Vermittlung, zweite Stand-Quelle, veränderter Stand, Live-Form, Vorab-Objekt,
  Vorgabe „an“) ⇒ Pin streichen, `REGEL_HASH` entfällt.
- `f36-ws3-empfehlung` (e), Text-Schnappschuss F-833: die Invariante „leere Liste ändert den Auftragstext nicht“ tragen
  der Relativvergleich gegen den Start ohne Anzeige plus die Negativprobe „keine Zeile ‚Katalog-Fähigkeiten‘“; der Hash
  schützt nur den Wortlaut ⇒ streichen, `AUFTRAGSTEXT_OHNE_EMPFEHLUNG_SHA256` und der `createHash`-Import entfallen.

## 3. Lösch-Kandidaten und belegte Doppelungen

| Fall | Prüfung des Belegs | Entscheidung |
|---|---|---|
| `check-f24-capabilities` | `capabilities-ansicht.test.ts`: AK1 (extern/OFFEN ≠ technisch fehlend), AK5 (ASSESSED benannt leer), AK6 (startvorlagePfad) je eigener Test; (1) „verlustfrei“ ist `aufgeloest.map(...)` per Bau, reale `ressourcen.json` prüft `check-f19-ressourcen` | Gate löschen |
| `check-f15-workflow-oberflaeche` | Syntax (f): Biome liest seit `biome.json` `public/**/*.js` (parst jede Datei); Verhalten der Workflow-Module tragen `views/workflow-detail.test.mjs`, `workflow-eingriffe.test.mjs`, `workflows-dialog.test.mjs`; der Rest sind Bezeichner-/String-Pins (F-261, F-563) | Gate löschen; F-261/F-563 → erledigt (Gate entfällt) |
| `check-f8-execution-controller` | Kein Test trägt die Grenze „Controller enthält keine F4/F5/F6a/F7-Regelbezeichner“ (Entscheidung Stefan 04.09.2026); die Inventur nennt „besser als Importregel“ — die gibt es nicht. 103 Zeilen, 0,2 s, kein Serverbezug, blockiert keinen Umbau | **Kandidat verworfen, Gate bleibt** (Inventur: „behalten — Grenze ohne Ersatz, W2b-1“) |
| `f28-persona` (1) | `check-f20-design-tokens` (2) prüft rekursiv alle `*.js`/`*.html` unter `public/leitstand/` (inkl. persona.js, persona-state.js, index.html) mit mindestens gleich strengem Muster | (1) streichen; Kommentar in f20 (Kopf) nachziehen |
| `f21-ws2` (d) | `attention-daten.test.mjs` prüft haltFreigabe/haltKlaerung drin, `weiter` draußen, FEHLGESCHLAGEN + kenntnisgenommen false drin, true draußen | (d) streichen |
| `b2b3d` (f) | siehe 1. | gestrichen mit 1. |

`GATES` in `scripts/check-kette.mjs`: zwei Einträge raus (120 Gates); keiner der beiden steht in `SERIELL`. Kopfkommentar
„alle 122 Gates“ bezieht sich auf die Messung und bleibt. Kommentarverweise auf die gelöschten Dateien in Produktcode
(`src/capabilities-ansicht/index.ts`, `types.ts`, `public/leitstand/views/workflow-detail.js`, `workflow-eingriffe.js`)
nachziehen; historische Dokumente (Journale, Archiv, Nachweise) und „Muster …“-Erwähnungen in anderen Gates bleiben
(DEKLARIERT).

Inventur: Tabelle nachziehen (Kandidat „erledigt W2b-1“ bzw. Teilpunkt gestrichen), Summen neu, kaputte Zeile 1
(Summentabellen-Reste vor der Überschrift, auf main) entfernen.

## 4. Wettlauf Zeitgrenze 0

Befund: **Code-Fehler.** Die Doku von `fuehreGitAsync` sagt „0 heißt sofortiger Abbruch“, der Code startet git aber und
setzt `setTimeout(…, 0)` (Node: ≥ 1 ms). Endet ein schnelles git (Linux-CI, `check-ignore`) vor dem ersten Timer-Durchlauf,
kommt der Rückruf mit Exit 0 und das Ergebnis ist ein Erfolg ⇒ `[true, true]`. Der Test erwartet zu Recht `[null, null]`.
Behebung: `zeitgrenzeMs` vor dem Start prüfen; `!(zeitgrenzeMs > 0)` (auch NaN/negativ) ⇒ sofort
`{ code: null, stdout: '', stderr: 'Zeitgrenze von … ms überschritten', abbruch: 'zeitgrenze' }`, kein `execFile`.
Test in `src/git-starter/git-starter.test.ts` (o. ä.): 0 und -1 ⇒ `abbruch: 'zeitgrenze'`, auch mit nicht existentem `cwd`
(beweist: kein Start). `vorschlag.test.ts` bleibt unverändert.

## 5. Findings, Akte, Lagebild

Neue Findings ab F-1227: HARNESS_IMPROVEMENT P2 (Parallelität ohne Zeitgewinn), TECH_DEBT P3 (60 Gates „ersetzen durch
Test“ beim Anfassen), PROCESS_IMPROVEMENT P3 (Challenger-Heuristik Codeform), BUG P2 (Zeitgrenze 0, Status erledigt in
W2b-1). F-261, F-563 auf erledigt (Gate gelöscht). Akte F45 „Stand W2b-1“, W2-Zeile Notiz ergänzt. Lagebild neu erzeugen.

## Prüfung in der Sitzung

Nur geänderte Gates einzeln (≈ 33), `node --test` für `src/git-starter`, `src/faehigkeiten/vorschlag.test.ts`,
`scripts/check-kette.test.mjs`, `npm run lint`, `npm run typecheck`, `check-docs`, `check-f40-lagebild`. Je gestrichener
Zählung eine Stichprobe: Server mit siebtem `starteWorkflowSchritt(` ⇒ nur b2b3b1 rot (Mutation in einer Kopie über die
reine Funktion, nicht am echten Server). Voller Gate-Lauf und `npm run test` im Commit-Block.

## Risiken

- Ein gestrichener Selbsttest war der einzige Rotbeleg einer Hilfsfunktion, die noch andere Teile prüft (z. B.
  `pruefeServer` in fb2/b2b4a2b2) ⇒ beim Streichen die Funktion auf den verbleibenden Teil reduzieren, Rotfälle für den
  Rest behalten.
- Ungenutzte Importe/Variablen nach dem Streichen (`createHash`, `sha256Hex`, `REGEL_HASH`, `RATSCHE`) ⇒ Biome/tsc.
