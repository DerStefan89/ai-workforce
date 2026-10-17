# Plan v2 — F45 B2b-3b-2b-2a-2 „Rückfrage-Kanal: Oberfläche“, Teil A Warteschlange (Punkte 1, 4, 6)

Stand 17.10.2026. Nach Advisor-Pass `features/F45/advisor-b2b3b2b2a2.md`: v1 als Ganzes „nicht freigegeben“ (zu groß) ⇒ vorab
freigegebener Schnitt; **Teil A „Freigegeben mit Hinweisen“** unter Aufnahme von V1–V4/V6. Plan v1 (`plan-b2b3b2b2a2.md`) bleibt
stehen. **Teil B (Punkte 2, 3, 5: Abnahme, Zählung F-1132 (1), Regel F-1132 (5)) geht als B2b-3b-2b-2a-3 mit eigenem Plan und
Advisor-Pass** (Auflage M10). Hier nur Teil A; gegenüber v1 §A geändert bzw. ergänzt. Kein Delta-Pass: der Advisor nennt ihn
„empfohlen, nicht Pflicht, wenn Plan v2 die Abhilfen wie beschrieben übernimmt“ — v2 übernimmt V2/V3 wörtlich.

## Ziel (M2 präzisiert)
Mit `LEITSTAND_RUECKFRAGE=1` sieht und beantwortet Stefan Rückfragen im Leitstand, eine wartende Rückfrage fällt auch außerhalb
„Deine Entscheidungen“ auf. Ohne Kanal: `GET /api/zustand` bekommt `rueckfrageStatus: { an: false }`, `GET /api/rueckfragen` das Feld
`entschieden: []` (die Vermittlung entsteht immer); Terminalmarke unberührt; keine neuen sichtbaren Elemente.

## Änderungen gegenüber v1 Teil A
- **M1** Feld `rueckfrageStatus` statt `rueckfrageKanal` (Name schon für `eingaben.rueckfrageKanal`/Token belegt), ohne `grund`:
  `rueckfrageAn ? { an: true, warteGrenzeMs } : { an: false }`.
- **M3/M11** Vermittlung: `entschiedene()` liest einen Ringpuffer (Speicher, ≤ 20, neueste zuerst) der Entscheidungen von
  Warteschlangeneinträgen — auch beendeter Läufe (Lauf-Ende-Ablehnungen eingeschlossen); auto_deny ohne Warteschlangeneintrag nicht.
  Befehl und freie Antwort darin über `maskiereGeheimnisse` (die offene Karte bleibt wörtlich). Grenze in ARCHITECTURE §3: ohne Token
  für jeden lokalen Prozess lesbar (wie die offene Liste), nach Neustart leer.
- **V6** `instanzPraefixDesLaufs(projekte, aktiverLauf)`: `laufId === null` ⇒ kein aktiver Lauf; gemerkt wird nur ein Treffer
  (`laufAktiv: true`), ohne Treffer gilt `/api` nur für diesen Takt. Register über neue `holeProjekteBegrenzt()` mit
  `AbortSignal.timeout(POLL_ZEITLIMIT_MS)`.
- **V1** `baueEntscheidungen(zustand, workitems, referenz, optionen = {})`: Gruppe `kanal` nur, wenn `'kanal' in optionen`
  (Liste | null | undefined wie bisher); fehlt der Schlüssel, ist die Gruppe nicht vorhanden. `zaehler`, `eintraege`, `defekt`,
  `alleLeer`, `zaehleJeFilter` (nur vorhandene Gruppen je Filter) und die Quellenzeilen der View gehen nur über vorhandene Gruppen.
  Kanal aus ⇒ Schlüssel fehlt; an ohne Lauf ⇒ `[]`. Alle bisherigen Aufrufer (ohne viertes Argument) bitgleich, per Test.
  `zaehleOffeneEntscheidungen(zustand, kanal?)` analog.
- **V2/V3** Die Kanal-Gruppe gehört DOM- und schreibseitig allein `public/leitstand/rueckfrage-kanal.js`: stabiles DOM je
  Rückfrage-id in `#attention-kanal` (Karte nur bei neuer id gebaut, bei verschwundener entfernt), Restzeit in eigenem Element per
  `textContent` je Takt, eigener delegierter Klick-Listener, Knöpfe und Feld beim Senden gesperrt, danach lokal „gesendet“ und ein
  Nachlauf-Abruf (M6, Muster `zustand.js`). `views/attention.js` liest den Stand nur (`kanalStand`, `abonniereKanal`), schaltet die
  Sektion nach Filter/Leer sichtbar und importiert nichts Schreibendes. Kopf von `views/attention.js` nennt die Ausnahme.
- **V4** `rueckfrage-kanal.js` hat ein eigenes `abonniereKanal(fn)`: attention.js (Sichtbarkeit, Zahlen), `entscheidungen-zaehler.js`
  (Zahl am Navigationspunkt = Poll-Zahl + offene Kanal-Rückfragen) und das Band `#rueckfrage-kanal-hinweis` (note amber): bei N > 0
  „N Rückfrage(n) warten auf dich — nächste Frist in mm:ss“ mit Link `#/attention`, bei 0 eine schlanke Zeile „Rückfrage-Kanal an —
  Rückfragen erscheinen unter „Deine Entscheidungen“ und warten höchstens 10 min“.
- **M4** Karte: Bash in `<ol>`-artiger Zeilenliste mit Zeilennummer am Rand, Kopf „N Zeilen · M Zeichen“; maskiert werden Cc, Cf, Cs,
  Zl, Zp und die Markenzeichen ⟦ ⟧ selbst (Bash: `\n` bleibt Zeilenwechsel, `\t` bleibt; Frage: `\n` bleibt, `\t` maskiert; Option:
  beide maskiert). Option leer oder nur Leerzeichen ⇒ Knopf gesperrt (Server lehnt sie mit 400 ab). Nicht erfasst (Grenze §3): NBSP und
  andere Zs, Variationsselektoren, Homoglyphen.
- **M5** Art `kanal`: `typ-chip.js` Farbe `rueckfrage` (bestehendes `--art-rueckfrage`, keine neue Farbe); attention.js `GRUPPEN`,
  `QUELLEN`, `IMMER_VOLLSTAENDIG`, `gruppeImFilter`; Section `attention-abschnitt-kanal` in index.html (zuerst); i18n
  `attention.{art,frage,quelle,nichtVerfuegbar}.kanal`; kein Hauptknopf auf Kanal-Karten (`hash: null`), „Einmal erlauben“ nie
  primär. „Zuletzt entschieden“: Kanal-Teil `#attention-kanal-zuletzt` im bestehenden Abschnitt (index.html:885-888), nur mit Einträgen;
  je Eintrag Projekt bzw. Lauf, Ergebnis, Herkunft, `nicht_browser` als rote Marke „nicht aus dem Browser“. Die Karte nennt das Projekt
  (Instanz).
- **M7** Render-Instanz über `erzeugeMultiProjektDispatcher` mit Workforce-Handler und Projekt-Handler `p1` (Kanal an, injizierte
  Vermittlung, Laufordner im `basisVerzeichnis` von p1, Register mit p1) ⇒ `instanzPraefixDesLaufs` löst auf `/api/projekte/p1` auf; die
  Antwort im Browser belegt `herkunft: 'browser'` über das Präfix.
- **M8** Gate-Fall (e) „keine neue Route“ entfällt (Wachstumsbremse (b1)/(b3)); (e) prüft nur „genau ein `setInterval`“ über f20.
- **M9** Startzeile und ARCHITECTURE §3 behalten „noch nicht für echte Läufe nutzen“; Verweis auf die Auswertungsanzeige (2a-3) und den
  echten Lauf (2b-2b) statt „Anzeige folgt mit 2a-2“.

## Geänderte Bestands-Gates
- `check-f21-ws2-workboard-oberflaeche.mjs` (f) (V3): bleibt wie bisher (kein `method: 'POST…'` in attention.js/workboard.js) und
  bekommt zusätzlich: attention.js importiert aus `api.js` nur `hole*`, aus `rueckfrage-kanal.js` nichts Schreibendes (kein
  `sendeRueckfrageAntwort`/`beantworte*`); `sendeRueckfrageAntwort` wird in `public/leitstand/**` nur von `rueckfrage-kanal.js`
  importiert; Rot-Kalibrierung mit synthetischen Texten. Keine bisherige Bedingung entfällt.

## Gate `scripts/check-f45-b2b3b2b2a2-anzeige.mjs`
(a) echter Handler + Dispatcher (`/api/projekte/p1/…`): offen + `entschieden` (Herkunft browser/nicht_browser, Maskierung in der
Historie, Ringpuffer nach `beendeLauf`); (b) `/api/zustand` `rueckfrageStatus` mit/ohne Kanal, übrige Schlüssel gleich, ohne Kanal
`entschieden: []`; (c) Karten-Render (vollständig, Zeilennummern, Escape, Masken inkl. ⟦ ⟧, zwei Entscheidungen, leere Option gesperrt);
(d) `instanzPraefixDesLaufs` (Treffer, kein Treffer, laufId null); (v) `baueEntscheidungen` ohne viertes Argument bitgleich, mit Kanal
zuerst, `alleLeer` falsch bei wartender Rückfrage, Kanal aus ⇒ keine Quelle; (e) genau ein `setInterval`. Rot gegen main per `git archive`.

## Wachstumsbremse
Server ±0 (Zeilen `:8387` und `:9208` geändert). Grenze bleibt 13 445. `starteWorkflowSchritt(` 6×.

## Doku
ARCHITECTURE §3 (Anzeige, `entschieden`, `rueckfrageStatus`, Grenzen M4/M11), fixpaket-f45 (Zeile 2b-2a-2 = Teil A, neue Zeile 2b-2a-3 =
Teil B), Nachträge F-1126 (3)-Anzeige, F-1128 (3) Teil Warteschlange, F-1132 (3).

## Status
- [x] Freigegeben mit Hinweisen (Advisor, Teil A)

## Nächster sinnvoller Schritt
Teil A bauen, dann code-reviewer, qa, design-guardian.

## Nachtrag Bau (17.10.2026) — Abweichungen vom Plan, gleichwertig
- V1 Zahl am Navigationspunkt: statt `zaehleOffeneEntscheidungen(zustand, kanal?)` addiert `zaehlerAnzeige(zustand, kanalOffen)` die Kanal-Zahl
  (entscheidungen-zaehler.js); ist eine Poll-Quelle defekt, steht die Kanal-Zahl allein (Korrekturrunde qa 2).
- M5: `attention.frage.kanal`/`.satz.kanal`/`.knopf.kanal` entfallen — Kanal-Karten rendert `rueckfrage-anzeige.js` mit eigenen Schlüsseln
  (`rueckfrage.*`), `karte()` der View sieht sie nie.
- Korrekturrunde nach code-reviewer, qa, design-guardian: Karten bleiben bei fehlgeschlagenem Abruf stehen; endgültig gesperrt nur nach 409/404;
  Band „nicht abrufbar“; Fokus auf die Meldung bzw. nach dem Entfernen auf die nächste Karte; kein gefüllter Hauptknopf, wenn eine Kanal-Karte oben
  steht; „Zuletzt entschieden“ nur im Platzhalterteil „kommt“; Feld nach Seitenmuster; Befehlszeilen `bidi-override`; f-kanal erkennt
  Namespace-/dynamische Importe; Render-Nachweis mit Zoom 200 %, tr, Freitext über zwei Takte, leere Antwort, Band „an“.
