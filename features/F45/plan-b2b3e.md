# F45 B2b-3e — Plan v1 (Budget-Feld + Formular-Reste + Pfade in Screenshots)

Branch `f45/b2b3e-budget-feld` (Basis = main `63c343b`, nach #350). Grundlage: F-1122 (1), F-1123 (5)(9)(10)(11)(12)(14)(15),
F-1125, Kleinkram (Fixture `stefan` → `nutzer`, F-1128 → P1). Ablauf: Plan v1 → Advisor-Pass → erst nach dessen Urteil
Code (F-1124). Rot-Nachweis je Gate-Fall gegen main per `git archive` (F-1127).

Grenzen (unverändert übernommen): Rückfrage-Kanal unberührt und aus; Argv bitgleich; `starteWorkflowSchritt(` in
`scripts/leitstand-server.mjs` weiter 6×; keine gesperrten Dateien; `package.json` nur Gate-Zeile; `kontrollzustand/`
nie stagen; Historie der Screenshots nicht bereinigen.

## 1 Eine Regel für die Arbeitspaket-Felder (F-1123 (5), F-1122 (1) „dieselbe Regel“)

Heute: Formular `public/leitstand/arbeitspaket-felder.js` (`leseBereiche`: absolut, `..`, `*` mitten im Eintrag) und Server
`src/auftrag/index.ts` (`validiereAuftragBereiche`: nur nicht leer / nicht doppelt) prüfen verschieden; `budget_tokens`
prüft nur der Server (`validiereArbeitspaketFelder`, ganze Zahl ≥ 1).

**Vorschlag:** Die Regel je Eintrag lebt **einmal** als reines JS in `public/leitstand/arbeitspaket-felder.js`:
- `pruefeBereich(eintrag)` ⇒ `null` (gültig) oder ein Grund-Code `'leer' | 'absolut' | 'eltern' | 'muster'`.
  Reihenfolge: leer/Leerraum ⇒ `leer`; `^(?:[\\/]|[A-Za-z]:)` ⇒ `absolut`; ein Segment `..` ⇒ `eltern`; danach Endungen
  wegnehmen wie `normalisiereBereich` in `src/umfang` (Schleife: abschließendes `/`/`\`, `/**`, `/*`; `*`/`**` als ganzer
  Eintrag bleibt) und bleibt ein `*` ⇒ `muster`. Damit gilt `src/**/` (Server liest `src`) als gültig (F-1123 (9)).
- `pruefeBudgetTokens(wert)` ⇒ `true`, wenn `Number.isInteger(wert) && wert >= 1` (heutige Server-Regel, wörtlich).
- `leseBereiche(text)` nutzt `pruefeBereich` und liefert bei Fehler zusätzlich `grund` (Code).
- `leseBudget(text)` ⇒ leer ⇒ `{ ok: true, budget: undefined }`; Ziffern mit optionalen Tausendertrennern
  (Leerzeichen, NBSP, U+202F, `.`, `,` je 3 Ziffern) ⇒ Zahl; dann `pruefeBudgetTokens` ⇒ sonst `{ ok: false }`.

Server: `src/auftrag/index.ts` importiert `pruefeBereich`/`pruefeBudgetTokens` aus
`../../public/leitstand/arbeitspaket-felder.js`; Typen über eine Deklarationsdatei daneben
(`public/leitstand/arbeitspaket-felder.d.ts`, tsc löst `./x.js` auf `x.d.ts` auf; kein `allowJs`, `tsconfig` unverändert).
`validiereAuftragBereiche` meldet je Eintrag den Grund deutsch (`'bereiche[i]' ('src/*.ts') ist ein Muster — erlaubt ist
'*' nur als ganzer Eintrag oder am Ende (src/**)` usw.); `validiereArbeitspaketFelder` nutzt `pruefeBudgetTokens`.
Präzedenz: `scripts/leitstand-server.mjs` importiert schon `cdZeile` aus `public/leitstand/code-daten.js` („die eine Quelle“).

Groß-/Kleinschreibung einheitlich: Formular, Server-Regel und Abgleich (`src/umfang`, Plan B2b-3d §1 „kein Groß/Klein-Abgleich,
git ist case-sensitiv“) unterscheiden sie gleich — `Src/` und `src/` sind zwei verschiedene, gültige Einträge, in
Formular und Server (Doppelten-Prüfung nach exaktem Text, wie heute in beiden). Das steht als Satz im Kopf der Regel und im
Hinweistext des Felds („Groß-/Kleinschreibung wie im Projekt“); ein Test je Seite belegt es.

### Offener Punkt 1 (nicht stillschweigend entschieden): Ort der einen Regel
(a) wie oben: eine Implementierung in `public/`, `src/auftrag` importiert sie (+ `.d.ts`). Neu: `src/` hängt an `public/`.
(b) Zwilling: Regel in `src/auftrag` (TS) und Spiegel im Browser-Modul, Paritäts-Fall im Gate über eine Fall-Tabelle
(Präzedenz `check-f34-product-coach.mjs` `…Browser`, Kommentar „Zwilling“ in `leitstand-server.mjs` Z. 1664).
Auftrag sagt „eine Regel, keine zweite“ ⇒ Empfehlung (a). Bitte prüfen, ob (a) gegen ARCHITECTURE §1/§7 verstößt.

### Offener Punkt 2: strengere Regel trifft gespeicherte Aufträge
`validiereAuftragDaten` läuft bei jeder neuen Auftragsversion (`registriereAuftrag`; „Budget erhöhen“, Einrichtung abhaken über
`optionenAusAuftrag`). Ein seit B2b-3d (16.10.) über die API gesetzter Eintrag wie `src/*.ts` würde dann beim „Budget erhöhen“
abgewiesen (Fehler statt neue Version). Vorschlag: so lassen (Feld seit einem Tag, nur Test-/Spike-Daten; die Fehlermeldung
nennt den Eintrag) und als Risiko dokumentieren — keine Altlast-Sonderregel.

## 2 Formular „Budget“ (F-1122 (1))

`public/leitstand/index.html`: zweites `<details id="auftrag-budget-bereich" class="auftrag-kontext">` direkt nach
„Vereinbarte Bereiche“: Zusammenfassung „Budget · optional“, Label „Budget (Tokens)“, `<input type="text"
id="auftrag-budget" inputmode="numeric" autocomplete="off" aria-describedby="auftrag-budget-hinweis">`, Hinweis „Tokens für das
ganze Arbeitspaket über alle Schritte. Leer = Standard der Kontrolltiefe. Wird es erreicht, hält der Ablauf nach dem Schritt
an — du kannst es erhöhen.“ i18n in allen Sprachen (`check-f44-i18n`).

`views/projekt.js`: `legeAuftragAusFormularAn` liest `leseBudget`; ungültig ⇒ Feld klappt auf, Fehlerzeile
`auftrag.budget.fehler` („„{eintrag}“ ist keine ganze Zahl ab 1 …“), kein POST. Gültig ⇒ `budget_tokens` im POST-Körper
(nur gesetzt, wenn nicht leer). `leereAuftragsFelder` leert auch das Budget.

### Offener Punkt 3: „Standardwert der gewählten Kontrolltiefe“ als Platzhalter
Im Formular ist noch keine Kontrolltiefe gewählt — der Router schlägt sie erst nach „Ablauf vorbereiten“ vor
(`views/workflow-entscheiden.js`, Freigabe). Vorschlag: Platzhalter nennt die Defaults aller Kontrolltiefen aus
`BUDGET_DEFAULTS` (eine Quelle, `src/budget`): „Standard: 5 300 000 (Fast-Lane) · 14 700 000 (Standard, Hoch)“
(Zahlen über `formatiereZahl`). Weg zum Browser: additives Feld `budget_defaults` in der bestehenden Leseroute
GET …/code (`scripts/leitstand/routen-code.mjs`, beim Betreten von `#/projekt` geladen, `code-stand.js`); keine neue Route.
Ohne Daten (alter Server, Fehler, noch ladend) ⇒ Platzhalter „Leer = Standard der Kontrolltiefe“. Alternative: neue Leseroute
GET /api/budget/defaults. Alternative 2: Platzhalter ohne Zahlen.

## 3 Formular-Reste F-1123

- (9) Fehlergrund je Code: `auftrag.bereiche.fehler.absolut` (Laufwerk/führender Schrägstrich), `.eltern` („..“),
  `.muster` („`*` nur als ganzer Eintrag oder am Ende, z. B. src/** — der Abgleich kennt Ordner und Dateien, keine Muster wie
  src/*.ts“). Bisheriger Schlüssel `auftrag.bereiche.fehler` entfällt. Test im Formular (`views/projekt.test.mjs`):
  `src/*.ts` ⇒ Muster-Text, kein POST; `src/**/` ⇒ POST mit `bereiche: ['src/**/']`.
- (10) Kommentare: `legeAuftragAusFormularAn` und Kopf von `arbeitspaket-felder.test.mjs` nennen `*`.
- (11) `ausgangslage()` leert „Bereiche“ und „Budget“.
- (12) `umfangKennung` nimmt `bereiche` auf (sonst zeichnet der Poll nach geänderten Bereichen nicht neu).
- (14) „Vereinbart: …“ gekappt: höchstens 10 Bereiche, dann „… und n weitere“ (neuer i18n-Schlüssel
  `abnahme.umfang.vereinbartWeitere`), `overflow-wrap: anywhere` für lange Einträge.
- (15) CSS: `.workflow-seite .entscheiden-inhalt > p.abnahme-umfang { margin: 0 }` (graue Zeile „nicht bestimmbar“).

## 4 Keine persönlichen Pfade in Screenshots (F-1125)

- Neu `scripts/neutrale-umgebung.mjs` (Seiteneffekt-Modul, als **erster** Import): setzt `HOME`, `USERPROFILE`, `TEMP`, `TMP`
  auf `<wurzel>/home` bzw. `<wurzel>/temp`, `<wurzel>` = `AIW_NEUTRAL_WURZEL` oder `C:\aiw-nachweis` (win32) bzw.
  `/tmp/aiw-nachweis`; legt die Ordner an; bricht ab, wenn die Wurzel selbst das Muster der Probe trifft. `os.tmpdir()` und
  `os.homedir()` lesen diese Variablen zur Aufrufzeit (lokal geprüft). Kindprozesse (git, Attrappen) erben sie.
  `LOCALAPPDATA` bleibt (Playwright findet Chromium dort).
  Hinweis: Das Scratchpad liegt unter `C:\Users\<name>\AppData\…` und ist deshalb nicht neutral.
- Alle 13 `features/F45/nachweise/*/instanz.mjs` und `scripts/render-nachweis.mjs` importieren es als ersten Import (eine
  Zeile je Datei, ES-Module werten Importe in Reihenfolge aus ⇒ vor jedem `tmpdir()`).
- Neu `scripts/render-pfadprobe.mjs` (rein): `findePersoenlichePfade(text)` mit
  `/Users[\\/]+[^\\/<]+|AppData|C:[\\/]+Users/gi`; ausgenommen sind Treffer, deren Pfadsegment nach `Users\` mit `<` beginnt
  (`C:\Users\<name>`) und `AppData`, dem ein Platzhalter-Segment `<…>` vorausgeht (`<HOME>\AppData`). Unit-Test
  `scripts/render-pfadprobe.test.mjs`.
- `render-nachweis.mjs`: vor **jedem** Screenshot liest eine DOM-Probe `document.body.innerText` plus `value` aller sichtbaren
  `input`/`textarea` und `title`-Attribute nicht (nur sichtbarer Text); Treffer ⇒ Abbruch mit Fundstelle, kein Bild. Spalte
  „Pfadprobe“ (`sauber`) im Protokoll als Beleg.
- Neue Screenshots dieses Auftrags: `features/F45/nachweise/b2b3e/` (eigene `instanz.mjs` nach Muster b2b3d, Port 4405, ein
  Ablauf mit 12 Bereichen für (14) und ohne Abgleich-Ergebnis für (15)?) — siehe Offener Punkt 4.

### Offener Punkt 4: Umfang des Render-Nachweises
Formular (Budget-Feld aufgeklappt mit Platzhalter; Fehler Budget; Fehler `src/*.ts`) in de 1440 dunkel/hell, de 390,
ru 390 hell, de 1440 200 %; Abnahme mit 12 Bereichen (Kappung) de 1440 + de 390. (15) „nicht bestimmbar“ braucht einen
Ablauf mit Bereichen ohne festgehaltenen Abgleich — per `anfragenAntworten` des Render-Helfers statt eines zweiten Ablaufs.

## 5 Gate `scripts/check-f45-b2b3e-budget-feld.mjs` (neu, in `check:gates` hinter b2b3d)

- (r1) eine Regel: `validiereAuftragBereiche` weist `src/*.ts` (Muster), `/etc/`, `C:\x` (absolut), `a/../b` (eltern) ab und
  nimmt `src/**/`, `*`, `src/**` an; Quelltext von `src/auftrag/index.ts` importiert `pruefeBereich` aus
  `arbeitspaket-felder.js` und enthält keine eigene `ABSOLUT`-Regex.
- (r2) Tabelle: `leseBereiche` (Formular) und `validiereAuftragBereiche` (Server) urteilen über dieselbe Fall-Tabelle gleich
  (inkl. `Src/` + `src/` beide gültig).
- (r3) POST /api/auftraege mit `bereiche: ['src/*.ts']` ⇒ 400 mit Muster-Grund; mit `src/**/` ⇒ 201.
- (b1) `leseBudget`: `''` ⇒ undefined, `'2 000 000'`/`'2.000.000'` ⇒ 2000000, `'0'`/`'1,5'`/`'abc'` ⇒ ungültig; POST mit
  `budget_tokens` aus dem Formular ⇒ 201, Auftrag trägt es; `validiereArbeitspaketFelder` nutzt `pruefeBudgetTokens`.
- (b2) GET …/code liefert `budget_defaults` gleich `BUDGET_DEFAULTS`.
- (p1) `findePersoenlichePfade`: Treffer für `C:\Users\anna\AppData`, `/Users/anna/x`, `c:/users/anna`; keiner für
  `C:\Users\<name>\…`, `<HOME>\AppData\…`, `C:\aiw-nachweis\temp\…`.
- (p2) `render-nachweis.mjs` ruft die Probe vor `knappesScreenshot` auf und bricht ab (Quelltext-Fall); alle `instanz.mjs` und
  `render-nachweis.mjs` haben `neutrale-umgebung.mjs` als ersten Import.
- (p3) nach Import von `neutrale-umgebung.mjs` (Kindprozess): `os.tmpdir()`/`os.homedir()` ohne Probe-Treffer.
- (i) Invarianten: `starteWorkflowSchritt(` 6× in `leitstand-server.mjs`.

## 6 Kleinkram

- `src/rueckfrage/protokoll.test.ts`: Pfad-Fixture `stefan` → `nutzer` (Z. 57–69; die Enum-Werte `stefan_abgelehnt` bleiben).
- `state/findings.md`: F-1128 P2 → P1 (Grund: (1)–(5) blockieren B2b-3b-2); Nachträge in F-1122 (1) erledigt, F-1123
  (5)(9)(10)(11)(12)(14)(15) erledigt, F-1125 erledigt (für neue Screenshots; Historie bleibt).
- ARCHITECTURE §1 Satz zu `src/auftrag` (Regel der Arbeitspaket-Felder liegt in `public/leitstand/arbeitspaket-felder.js`)
  — falls (a).

## 7 Tests (rot → grün)

`arbeitspaket-felder.test.mjs` (pruefeBereich je Code, `src/**/`, leseBudget), `src/auftrag/*.test.ts` (Server-Gründe,
Budget), `views/projekt.test.mjs` (Muster-Text, Budget im POST, Budget-Fehler, Felder geleert), `workflow-abnahme`-Test
(Kappung, Kennung mit Bereichen), `scripts/render-pfadprobe.test.mjs`.

## 8 Risiken

- (a) koppelt `src/` an eine Browser-Datei; ein Umbau dort bricht den Server (Gate (r1) fängt es).
- Offener Punkt 2 (gespeicherte Alt-Einträge).
- Neutrale Wurzel im Laufwerk-Stamm: auf einer Maschine ohne Schreibrecht in `C:\` ⇒ `AIW_NEUTRAL_WURZEL` setzen.
- Andere sichtbare Pfade (Installwurzel `C:\Users\…\Projekte\ai-workforce`) — die Probe bricht dann ab; Behebung im Nachweis,
  nicht durch Abschalten der Probe.
- Zuschnitt: drei Themen (Regel, Feld, Screenshots) — ein Baudurchgang ist knapp; Schnittvorschlag falls zu groß: F-1125 als
  B2b-3e-2.
