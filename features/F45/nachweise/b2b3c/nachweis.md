# Nachweis F45 B2b-3c — Budget je Arbeitspaket

15.10.2026. Plan `features/F45/plan-b2b3c.md` (v1) und `features/F45/plan-b2b3c-v2.md` (v2 nach Advisor-Pass, Delta-Pass
FREIGEGEBEN_MIT_AUFLAGEN, Auflage D1 umgesetzt).

## Ableitung der Defaults

`budget-ableitung.mjs` (nur lesend), Ergebnis `budget-ableitung.json` — Aufruf mit den Wurzeln `kontrollzustand`
(dieses Repo), `../haushaltsbuch2/kontrollzustand`, `../haushaltsbuch/kontrollzustand` und den Worktree-Kopien
`../aiw-f725-ws1a`, `../aiw-main-ansicht` (nur Duplikate, zählen einmal). Tabelle und Regeln in Plan v1 §1:
standard 14 700 000, hoch 14 700 000 (gemessen 14 300 000, angehoben auf standard), fast-lane 5 300 000 (fester Wert aus
dem Median der 19 Ausführungsläufe × 3; kein gemessener fast-lane-Ablauf, F-1121).

## Render

Testinstanz `instanz.mjs` (Port 4403, Wegwerf-Ablage, Projekt = Wegwerf-Repo mit CLAUDE.md dieses Repos, Attrappe mit
Laufakten samt `verbrauch`, Arbeitspaket-Budget 2 000 000), Klickfolgen `render/erzeuge-nachweis.mjs`, je Ordner
Screenshot, `klickfolge.json` und `protokoll.md` (Klicktabelle mit `scrollWidth/clientWidth`).

| Folge | Zeigt |
|---|---|
| `halt-de-1440`, `-de-1440-hell`, `-de-390`, `-ru-390-hell`, `-de-1440-zoom200` | Budget-Halt nach dem Bau (2 412 345 von 2 000 000): oben bei den Eingriffen die amber Notiz „Budget erreicht“ mit Zahlen nach Sprache, Ausweg-Satz („lehne ihn unten ab oder stoppe ihn“), neuem Budget (4.412.345) und Hauptknopf „Budget erhöhen“, daneben nachrangig „Ablauf reparieren“; keine zweite Notiz in der Abnahme; Blick „Verbrauch“ amber; kein „Hinweise zum Review“ (der Halt gehört nicht dem Review). Kein waagerechter Überlauf (1440/1440, 390/390, 720/720 bei 200 %) |
| `abnahme-de-1440`, `-de-390` | Überschreitung erst im letzten Schritt: Ablauf ABGESCHLOSSEN, Abnahme „entscheidbar“, Verbrauch amber in Kachel Nachweise und Blick, kein Knopf |
| `korrektur-klick-de-1440` | Korrekturrunde über Budget: Budget-Halt am Neubau; Klick „Budget erhöhen“ ⇒ Seite „Darf der Ablauf starten?“ mit Freigabe-Spalte, Meldung „Budget erhöht. Neues Budget: 4.100.000 Tokens — gib jetzt den nächsten Schritt frei.“, keine Reparatur-Notiz (Spalte „Reparatur-Notiz“ false) |
| `halt-klick-de-1440` | Klick „Budget erhöhen“ ⇒ POST …/budget, dann …/starten; der Review läuft, Abnahme „entscheidbar“, Verbrauch 2.712.345 von 4.412.345 Tokens |

Korrektur vor dem Prüferpass (erster Render): im Budget-Halt ordnete GET …/abnahme den Halt-Grund dem Review bzw. qa zu
(„Hinweise zum Review — Review nicht gelaufen: Budget erreicht …“), und die Notiz oben nannte nur „Ablauf reparieren“.
Behoben (Server: `istBudgetHaltGrund` in `reviewHaltGrund` und `baueQaAbnahmeProjektion`; Anzeige: Notiz-Variante
„Der Ablauf steht am Budget.“), Gate (b1)/(b6) ergänzt, Nachweis neu erzeugt.

Korrekturrunde nach dem Prüferpass (code-reviewer, qa, design-guardian — alle „nicht freigegeben“): Budget-Regel in einer
Projektion für Liste und Detail (`baueNaechsterProjektion` über `wendeBudgetAn`; „Wartet auf dich“ sieht den Halt), Notiz mit
Hauptknopf oben bei den Eingriffen statt unten in der Abnahme, gesperrter Knopf mit Satz bei einem fremden Lauf, keine
Reparatur-Notiz nach der Erhöhung (`budget.grundVeraltet`), Texte (Bezug „ab dem bisherigen Verbrauch“ und neues Budget, „ablehnen oder
stoppen“, tr „X / Y token“, keine Kennung). Gate (k)(b10)–(b12) und (b9) bis zum Abschluss ergänzt; Nachweis neu erzeugt.

Grenzen: Der gespeicherte Grund „Budget erreicht …“ bleibt nach der Erhöhung bis zum nächsten Schreiben in Liste und
Technik-Tabelle stehen (kein neuer Workflow-Schreiber, F-228); die Abnahme zeigt den Halt allein aus der Projektion. Die Liste (Kopfdaten) verwirft nach der
Erhöhung ihren Zwischenspeicher und zeigt dasselbe Verdikt wie das Detail (Nachpass, Gate (k)). Die Screenshots zeigen noch den
Satz „Er setzt erst fort …“ (danach geglättet: „Er läuft erst weiter …“); die Spalte „Meldung“ der Klicktabelle liest die
Abnahme-Meldung, die Budget-Meldung steht in der Bedien-Meldung und ist nur im Bild belegt (F-1122 (10)). Nicht gerendert:
Budget-Halt bei aktivem Fremdlauf (gesperrter Knopf, nur Unit-Test) und im Status WARTET_FREIGABE (Gate (b7), Unit-Test).
