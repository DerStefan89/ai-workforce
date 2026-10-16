# F45 B2b-3e-2 — Plan v2 (Budget-Feld, eine Regel für `bereiche`, Formular-Reste, Aufräumen alter Laufordner)

Plan v1: `features/F45/plan-b2b3e.md` (bleibt unverändert). Advisor-Pass: `features/F45/advisor-b2b3e.md` (Nicht
freigegeben, nur wegen A1/A2). Entscheidungen Challenger (16.10.2026): **A1** Schnitt — 3e-1 (F-1125) ist gemergt
(`06db04c`, #351); dies ist 3e-2. **A2 = (b) Zwilling.** **A5 = nein** (`npm run check` legt nichts außerhalb des Repos an).
Hier umgesetzt: A3, A4, A8, A9 (Variante „Zahlen im Hinweistext“ ohne neue Route, s. §2), A10, Hinweise 11 (`steuerzeichen`,
`MAX_SAFE_INTEGER`, ru-Plural). Neu gegenüber v1: §5 Aufräumen alter `lauf-*`-Ordner (F-1125-Restpunkt), F-1123 (13).

Branch `f45/b2b3e2-formular`, Basis main `06db04c`. Grenzen: Rückfrage-Kanal unberührt und aus; Argv bitgleich;
`scripts/leitstand-server.mjs` **wird nicht angefasst** (W1; `starteWorkflowSchritt(` bleibt 6×); keine gesperrten Dateien;
`package.json` nur die Gate-Zeile; `kontrollzustand/` nie stagen; alte `instanz.mjs` unverändert.

## CONTEXT

Abhängig von B2b-3e-1 (gemergt): `scripts/neutrale-umgebung*.mjs`, `scripts/render-pfadprobe.mjs`, Pfadprobe in
`scripts/render-nachweis.mjs`, Gate `check-f45-b2b3e1-pfade` ((p2b): neue Instanzen haben `neutrale-umgebung-starten.mjs`
als ersten Import; das Startmodul importiert nur `node:` und `./neutrale-umgebung.mjs`). POST /api/auftraege nimmt
`bereiche` und `budget_tokens` schon an (`validiereArbeitspaketFelder`, leitstand-server.mjs:1837).

## 1 Eine Regel für `bereiche` und `budget_tokens` als Zwilling (A2 = b, A3, F-1123 (5)(9))

**Original (TS) `src/auftrag/index.ts`**, neu exportiert:
- `type BereichGrund = 'leer' | 'steuerzeichen' | 'absolut' | 'eltern' | 'muster'`
- `pruefeBereich(eintrag: string): BereichGrund | null` — Reihenfolge: `e = eintrag.trim()` (A3: trimmen vor allen
  Prüfungen); `e === ''` ⇒ `leer`; `/[\u0000-\u001f\u007f]/` ⇒ `steuerzeichen`; `/^(?:[\\/]|[A-Za-z]:)/` ⇒ `absolut`; ein
  Segment (Trenner `/` oder `\`) gleich `..` ⇒ `eltern`; dann Endungen wegnehmen in einer Schleife mit
  `/[\\/](?:\*\*?)?$/` (abschließender Trenner, `/*`, `/**`, `\*`, `\**` — beide Trenner gleich, A3), bis stabil; bleibt
  danach ein `*` und ist der Rest nicht genau `*` oder `**` ⇒ `muster`; sonst `null`.
  Folge: `src/**/`, `src\**`, `src\**\` gültig (F-1123 (9)); `src/*.ts`, `src/**/x`, `**/x`, `src/***` ⇒ `muster`.
- `pruefeBudgetTokens(wert: unknown): boolean` — `Number.isSafeInteger(wert) && wert >= 1` (Hinweis 11; bisher
  `Number.isInteger`, also auch `1e300`).
- `validiereAuftragBereiche` nutzt `pruefeBereich` je Eintrag; Doppelte weiter nach exaktem Text (Groß/klein unterschieden,
  `Src/` und `src/` sind zwei gültige Einträge — wie Abgleich `src/umfang`, git ist case-sensitiv). Meldung je Grund deutsch,
  z. B. `'bereiche[0]' ('src/*.ts') ist ein Muster — '*' nur als ganzer Eintrag oder am Ende (src/**)`.
  `validiereArbeitspaketFelder` nutzt `pruefeBudgetTokens` (Meldung „ganze Zahl ≥ 1 und ≤ 9007199254740991“).
- Kopfkommentar: Zwilling in `public/leitstand/arbeitspaket-felder.js`, Gleichheit im Gate (r1)/(b1); Groß/klein-Satz.

**Kopie (JS) `public/leitstand/arbeitspaket-felder.js`**, ohne Importe (keine Abhängigkeit src → public, kein `.d.ts`):
- `pruefeBereich`, `pruefeBudgetTokens` wörtlich gleich (Kommentar „Zwilling von src/auftrag …“).
- `leseBereiche(text)` nutzt `pruefeBereich` (leere Zeilen weiter still übersprungen, Doppelte still entfernt — das Formular
  normalisiert, der Server weist ab) und liefert bei Fehler `{ ok: false, eintrag, grund }`.
- `leseBudget(text)` — getrimmt; `''` ⇒ `{ ok: true, budget: undefined }`; `^\d+$` oder Dreiergruppen mit **einem** Trenner
  aus Leerzeichen, NBSP, U+202F, `.`, `,` (`2 000 000`, `2.000.000`, `2,000,000`) ⇒ Zahl; dann `pruefeBudgetTokens`;
  sonst `{ ok: false, eintrag }`. `1,5`, `0`, `-5`, `abc`, `2 00 000` ⇒ ungültig.
- `BUDGET_STANDARD` = `{ 'fast-lane': 5300000, standard: 14700000, hoch: 14700000 }` — Zwilling von
  `BUDGET_DEFAULTS` (`src/budget`), Gate (b3) vergleicht.

**Offener Punkt 2 / A8 (vollständig):** `validiereAuftragDaten` läuft bei jeder neuen Auftragsversion — „Budget erhöhen“
(POST …/budget), Einrichtung abhaken und die automatische Übernahme der Einrichtung im Nachlauf des Architekten
(leitstand-server.mjs:6199). Ein vor diesem Stand über die API gesetzter, jetzt ungültiger Eintrag (`src/*.ts`, `/etc/`)
ließe dort die neue Version scheitern: Budget-Erhöhung ⇒ Fehler; Übernahme der Einrichtung ⇒ Bau gesperrt; einen Weg zum
Ändern von `bereiche` gibt es nicht (neuer Auftrag nötig). Bestand: lokal 0 Aufträge mit `bereiche` im Kontrollzustand
(Feld seit B2b-3d, 16.10.). Entscheidung: **keine Altlast-Sonderregel**, Risiko hier und in F-1123 vermerkt. Schema-
Beschreibung von `bereiche` (`schemas/kontrollzustand-auftrag-payload.schema.json:44`) nennt die Regel (nur `description`,
keine Strukturänderung).

## 2 Formularfeld „Budget“ (F-1122 (1), A9)

`public/leitstand/index.html`: `<details id="auftrag-budget-bereich" class="auftrag-kontext">` direkt nach
`#auftrag-bereiche-bereich`: Zusammenfassung „Token-Budget · optional“ (`auftrag.budget.zusammenfassung`), Label „Token-Budget
des Arbeitspakets“, `<input type="text" id="auftrag-budget" inputmode="numeric" autocomplete="off" spellcheck="false"
aria-describedby="auftrag-budget-hinweis">`, `<small id="auftrag-budget-hinweis">` **ohne** `data-i18n` (Parameter).
Kein Platzhalter mit Zahlen (Advisor 8: bei 390 px abgeschnitten); Platzhalter „Leer lassen = Standard“.

Hinweis (`auftrag.budget.hinweis`, gesetzt in `initAuftragFormular` per `t(…, { fastLane, standard, hoch })` mit
`formatiereZahl(BUDGET_STANDARD[…])`; ein Sprachwechsel lädt neu, i18n.js:199): „Tokens für das ganze Arbeitspaket über alle
Schritte — nicht das Kontextbudget eines Laufs. Leer = Standard der Kontrolltiefe: Fast-Lane {fastLane}, Standard {standard},
Hoch {hoch}. Wird es erreicht, hält der Ablauf nach dem Schritt an; du kannst es dann erhöhen.“ Drei Zahlen statt
„Standard und Hoch“ — keine Annahme über Gleichheit. Abgrenzung „Kontextbudget“ (auftrag-umgebung.js:278) im Text (A9).
Weg der Zahlen: Zwilling `BUDGET_STANDARD` statt Feld in GET …/code (A9 „sonst“) — keine Server-Änderung, kein Ladezustand.

`views/projekt.js`: `auftragsFelder` + `budget`; `legeAuftragAusFormularAn` prüft erst Bereiche, dann `leseBudget`; ungültig ⇒
`#auftrag-budget-bereich` klappt auf, Meldung `auftrag.budget.fehler` („„{eintrag}“ ist keine ganze Zahl ab 1 — zum Beispiel
2000000 oder 2 000 000.“), kein POST. Gültig ⇒ `budget_tokens` im Körper nur, wenn gesetzt. `leereAuftragsFelder` leert auch
Budget. i18n de/en/ru/tr.

## 3 Formular-Reste F-1123

- (9) Meldung je Grund: `auftrag.bereiche.fehler.{steuerzeichen,absolut,eltern,muster}` (`leer` entsteht im Formular nicht);
  `muster`: „„{eintrag}“ ist ein Muster — „*“ ist nur als ganzer Eintrag oder am Ende erlaubt (z. B. src/**). Der Abgleich kennt
  Ordner und Dateien, keine Muster wie src/*.ts.“ Bisheriger Schlüssel `auftrag.bereiche.fehler` entfällt (Advisor: sicher
  entfernbar). Test in `views/projekt.test.mjs`: `src/*.ts` ⇒ Muster-Text, kein POST; `src/**/` ⇒ POST mit `['src/**/']`.
- (10) Kommentare in `legeAuftragAusFormularAn` und Kopf von `arbeitspaket-felder.test.mjs` nennen `*` und den Zwilling.
- (11) `ausgangslage()` leert Bereiche und Budget.
- (12) `umfangKennung` nimmt `bereiche` auf.
- (13) `src/umfang` `gleicheUmfangAb`: liegt der neue Pfad unter einer Ausnahme, der `alter_pfad` aber außerhalb (und nicht
  selbst Ausnahme), wird der **alte** Pfad gemeldet (wie ein Löschen). Bisheriger Test „Umbenennung in einen Ausnahme-Pfad wird
  nicht gemeldet“ wird umgekehrt (bewusste Verhaltensänderung). Kopf/JSDoc angepasst.
- (14) „Vereinbart: …“ höchstens 10 Bereiche, dann `abnahme.umfang.vereinbartWeitere` (Plural, ru one/few/many/other);
  `overflow-wrap: anywhere` für `.workflow-seite .abnahme-umfang p`.
- (15) CSS: Selektor `.workflow-seite .entscheiden-inhalt > p.abnahme-umfang` zur Regel `margin: 0` (style.css ~7632).

## 4 Render-Nachweis (neue Instanz, neutrale Umgebung)

Neu `features/F45/nachweise/b2b3e2/instanz.mjs` (Muster b2b3e1: erster Import `neutrale-umgebung-starten.mjs`, Port 4406,
Wegwerf-Projekt unter `tmpdir()`) und `render/erzeuge-nachweis.mjs`. Fälle je **de 1440** und **de 390** (`#/projekt`,
Ausschnitt `#auftrag-formular`): f1 beide Felder aufgeklappt mit Hinweistext (Zahlen); f2 Budget `1,5` ⇒ Fehlerzeile;
f3 Bereich `src/*.ts` ⇒ Muster-Fehlerzeile. Pfadprobe vor jedem Screenshot und Protokoll (Render-Helfer). Kein Klick löst
einen gültigen POST aus. Alte Instanzen unverändert. Die Abnahme-Teile (14)(15) werden nicht gerendert (F-1123 (16) bleibt
offen; Scope des Auftrags: „neue Formularteile“).

## 5 Aufräumen alter Laufordner (F-1125-Restpunkt)

Neu in `scripts/neutrale-umgebung.mjs` (rein, `fs` injizierbar, kein Seiteneffekt beim Import):
- `markiereLauf(laufordner, { fs, pid })` schreibt `<laufordner>/pid` (Prozess-ID).
- `raeumeAlteLaeufeAuf({ wurzel, eigener, fs, istAktiv, jetzt, warne })` — je Eintrag der Wurzel, der ein Ordner ist und
  `/^lauf-[A-Za-z0-9]{6}$/` trifft, außer dem eigenen: `pid` lesbar ⇒ entfernen, wenn `istAktiv(pid)` false
  (`process.kill(pid, 0)`; `EPERM` zählt als aktiv); ohne lesbare `pid` (Altbestand aus 3e-1, z. B. `lauf-5d4ot5`, oder ein
  gerade angelegter Lauf vor `markiereLauf`) ⇒ entfernen nur, wenn `mtime` älter als 60 s. Entfernen mit
  `rmSync(recursive, force, maxRetries 10, retryDelay 100)`; Fehler (z. B. unter Windows belegt) ⇒ Warnung, weiter.
  Rückgabe: Liste der entfernten Pfade.
- `neutrale-umgebung-starten.mjs`: nach `richteNeutraleUmgebungEin` erst `markiereLauf`, dann `raeumeAlteLaeufeAuf`;
  Ausgabe der entfernten Ordner. Importe weiter nur `./neutrale-umgebung.mjs` (Gate 3e-1 (p2b)).
- Warum nicht in `richteNeutraleUmgebungEin`: dessen Aufruffolge prüfen Test und Gate 3e-1 (p3a/p3b) mit einem `fs` ohne
  `readdirSync`/`writeFileSync` — unverändert lassen.
- Grenze: PID-Wiederverwendung (Windows) ⇒ ein toter Lauf bleibt stehen (sichere Richtung).
- Unit-Tests `scripts/neutrale-umgebung.test.mjs` mit injiziertem `fs`.

## 6 Gate `scripts/check-f45-b2b3e2-formular.mjs` (neu, in `check:gates` hinter b2b3e1)

Jeder Fall lädt seine Module dynamisch in eigenem try (A4) ⇒ gegen main je Fall rot statt Ladeabbruch.
- (r1) Zwilling Bereich: Fall-Tabelle `{ eintrag, grund }` — TS `pruefeBereich` und JS `pruefeBereich` liefern je Fall
  genau `grund`. Tabelle u. a.: `' /etc/'`→absolut, `'C:\x'`, `'\\server\f'`→absolut, `'a/../b'`, `'..'`→eltern,
  `'src/*.ts'`, `'src/**/x'`, `'**/x'`, `'src/***'`→muster, `'a\tb'`→steuerzeichen, `''`, `'  '`→leer, gültig: `'src/**/'`,
  `'src\**'`, `'src\**\'`, `'src/**'`, `'*'`, `'**'`, `'./'`, `'src/..ordner/'`, `'Src/'`, `'src/'`.
- (r2) Listenebene: `validiereAuftragBereiche([e])` leer ⇔ `grund === null`; `leseBereiche(e)` (nicht leer) `ok` ⇔
  `grund === null`, bei Fehler `grund` gleich; `['Src/', 'src/']` in beiden gültig.
- (r3) Regel ↔ Abgleich (A10): je gültigem Eintrag mit Beispielpfad liegt dieser per `gleicheUmfangAb` innerhalb
  (`src/**/`, `src\**`, `src\**\` ⇒ `src/a.ts`); `Src/` ⇒ `src/a.ts` außerhalb. Plus (13): Umbenennung `docs/x.md` →
  `kontrollzustand/y.json` bei `['src/']` meldet `docs/x.md`.
- (r4) POST /api/auftraege (Handler wie Gate b2b3d (u5)): `bereiche: ['src/*.ts']` ⇒ 400, Grund nennt „Muster“;
  `['src/**/']` ⇒ 201.
- (b1) Zwilling Budget: Werte `1, 2000000, MAX_SAFE, 0, -1, 1.5, '5', NaN, MAX_SAFE+1, 1e300` — TS/JS `pruefeBudgetTokens`
  gleich dem erwarteten Wert; `validiereArbeitspaketFelder({ budget_tokens })` leer ⇔ erwartet.
- (b2) `leseBudget`-Tabelle wie §1.
- (b3) `BUDGET_STANDARD` deepEqual `BUDGET_DEFAULTS`; `auftrag.budget.hinweis` enthält in allen vier Sprachen
  `{fastLane}`, `{standard}`, `{hoch}`.
- (f1) Formular: `index.html` hat `#auftrag-budget` in `details#auftrag-budget-bereich` direkt nach
  `#auftrag-bereiche-bereich`; `views/projekt.js` sendet `budget_tokens` (Quelltext) — Verhalten belegt der View-Test.
- (a1) Aufräumen: `raeumeAlteLaeufeAuf` mit injiziertem `fs`: entfernt toten Lauf und Altbestand > 60 s, lässt eigenen,
  aktiven, jungen ohne pid und Fremdnamen stehen; `neutrale-umgebung-starten.mjs` ruft `markiereLauf` vor
  `raeumeAlteLaeufeAuf` (Quelltext).
- (i) Invarianten (gegen main grün): `starteWorkflowSchritt(` 6× in `leitstand-server.mjs`; Rückfrage-Kanal-Schalter
  unverändert aus (Quelltext wie Gate b2b3b1).

Rot gegen main per `git archive main | tar -x` in den Scratchpad, Gate dorthin kopiert, je Fall (F-1127).

## 7 Tests (rot → grün)

`public/leitstand/arbeitspaket-felder.test.mjs` (pruefeBereich je Grund, `src/**/`, Trim, leseBudget, pruefeBudgetTokens),
`src/auftrag/auftrag.test.ts` (Meldungen je Grund, Budget-Grenze), `views/projekt.test.mjs` (Muster-Text kein POST, `src/**/`
POST, Budget im Körper, Budget-Fehler mit aufgeklapptem Feld, Felder geleert), `views/workflow-abnahme.test.mjs` (Kappung 10 +
weitere, Kennung mit Bereichen), `src/umfang/umfang.test.ts` ((13)), `scripts/neutrale-umgebung.test.mjs` (§5).

## 8 Dateien (≈ 20)

src/auftrag/index.ts, src/auftrag/auftrag.test.ts, src/umfang/index.ts, src/umfang/umfang.test.ts,
public/leitstand/arbeitspaket-felder.js(+test), public/leitstand/index.html, public/leitstand/views/projekt.js(+test),
public/leitstand/views/workflow-abnahme.js(+test), public/leitstand/style.css, public/leitstand/i18n/{de,en,ru,tr}.js,
schemas/kontrollzustand-auftrag-payload.schema.json (description), scripts/neutrale-umgebung.mjs(+test),
scripts/neutrale-umgebung-starten.mjs, scripts/check-f45-b2b3e2-formular.mjs, package.json (Gate-Zeile),
features/F45/nachweise/b2b3e2/**, state/findings.md, docs/STATUS.md (falls ein Gate es verlangt).

## 9 Risiken

- Zwilling driftet ⇒ Gate (r1)(b1)(b3) rot.
- Offener Punkt 2 (§1): strengere Regel trifft gespeicherte Altaufträge beim nächsten Versionsschreiben.
- `1.500` heißt 1500 (Tausendertrenner), nicht 1,5 — für Tokens gewollt, im Fehlertext durch Beispiel belegt.
- Aufräumen löscht einen Ordner eines laufenden Prozesses, der seine `pid` noch nicht schrieb und älter als 60 s ist — nur
  ein Prozess mit alter (3e-1-)Startdatei; nach dem Merge gibt es keinen.
- Render 390: Hinweistext lang (drei Zahlen) ⇒ Umbruch prüfen (design-guardian).

## Nachtrag nach dem Delta-Advisor-Pass (`features/F45/advisor-b2b3e2-delta.md`, Freigegeben mit Auflagen)

Entscheidungen Stefan (16.10.2026):
- **B1 = abtrennen:** §5 (Aufräumen alter `lauf-*`-Ordner) und Gate-Fall (a1) entfallen hier; sie gehen mit den
  F-1125-Restpunkten (R1–R8) und den Auflagen aus Befund 1–3 (24 h ohne `pid`, nur positive Ganzzahl als `pid`, nur `ESRCH` =
  tot, festes Verhalten bei scheiterndem `markiereLauf`, Dirent/`isDirectory`, Starter nie importieren) in **B2b-3e-3**.
  `scripts/neutrale-umgebung*.mjs` bleiben in 3e-2 unberührt.
- **B2 = „je Ablauf“:** `auftrag.budget.hinweis` = „Tokens je Ablauf dieses Auftrags, über alle Schritte einschließlich
  Korrekturrunde — nicht das Kontextbudget eines Laufs. Leer = Standard der Kontrolltiefe: Fast-Lane {fastLane}, Standard
  {standard}, Hoch {hoch}. Wird es erreicht, hält der Ablauf nach dem Schritt an; du kannst es dann erhöhen.“

Übernommene Auflagen (ohne weiteren Pass):
- (6) `pruefeBudgetTokens`: `typeof wert === 'number' && Number.isSafeInteger(wert) && wert >= 1` in beiden Zwillingen;
  Schema `budget_tokens` `"maximum": 9007199254740991`; Fehlertext „ganze Zahl von 1 bis 9 007 199 254 740 991“ (Server) bzw.
  Formular „keine ganze Zahl ab 1 (höchstens 9 007 199 254 740 991)“.
- (7) innere `.`-Segmente (`src/./`, `a/./b`) ⇒ neuer Grund `punkt` (abgewiesen; führendes `./` bleibt erlaubt wie im
  Abgleich); in (r1)/(r3). Doppelte am Server nach getrimmtem Text.
- (9) (r3)-A10-Teil und (r4) `['src/**/'] ⇒ ok` als Invarianten gekennzeichnet; (r4) über das reine `pruefeAuftragsformular`.
- (5) Schlüssel `auftrag.budget.platzhalter`; F-1121-Maßnahme um den JS-Zwilling `BUDGET_STANDARD` ergänzen.
- (8) JSDoc/Kommentar `src/umfang` (:78-79, :87).
