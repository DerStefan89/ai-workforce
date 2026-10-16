# F45 B2b-3c — Plan v2 (Budget je Arbeitspaket)

Plan v1: `features/F45/plan-b2b3c.md` (bleibt stehen). Advisor-Pass zu v1 (frischer Kontext, 15.10.2026): **UEBERARBEITEN**,
Zuschnitt **teilen** — B2b-3c Budget (Server, Anzeige, Gate, Render-Nachweis zusammen), **B2b-3d Umfangs-Abgleich**
(eigener Bau, zusammen mit einer Quelle für `bereiche`: heute setzt kein Produktionsweg `bereiche`, F-1083 (1); der
Abgleich ergäbe in jedem echten Ablauf „kein Abgleich“, Advisor B5). Dieser Plan ersetzt v1 für den Bau. Was v1 sagt und
hier nicht geändert ist, gilt weiter (Defaults §1, Module §2, Grenzen und NICHT-Liste).

Stand vor v2 (Advisor B16 — der Bau hatte vor dem Pass begonnen): `src/budget` (index, Tests, inkl. `istBudgetHaltGrund`),
`budget_tokens` im Auftrag (Schema, Validierung, `optionenAusAuftrag`, Test), `scripts/leitstand/budget-stand.mjs`. Der
vorab gebaute `src/umfang` ist aus dem Repo genommen und geht mit B2b-3d.

## Änderungen gegenüber v1 (je Advisor-Befund)

**B1 (HOCH) Automatik nach Budget-Halt.** Im Nachlauf-Updater bleibt der Roh-Ausgang `naechsterRoh`; erst daraus
`naechster = wendeBudgetAn(naechsterRoh, stand)`. Die Bedingung der automatischen Korrekturrunde und `mitRueckwegGrund`
lesen `naechsterRoh` — ein aufgeschobener Review (Roh `starte` qa) löst damit auch im Budget-Halt keine Runde aus; der
Halt steht mit Cursor auf dem qa. Gate (b6).

**B2 (HOCH) Erhöhbar aus der Lage, nicht aus dem Status.** `erhoehbar = ueberschritten ∧ kein Lauf aktiv (laufAktiv,
aufrufAktiv, globale Sperre) ∧ ermittleNaechstenSchritt(daten).art ∈ { starte, haltFreigabe }`; dieselbe Vorbedingung in
POST …/budget (sonst 409 mit Grund). Damit sind auch OFFEN/WARTET_FREIGABE/abgelehnte Starts und der Bestand lösbar.
Zusätzlich `wendeBudgetAn` in den bestehenden Updatern von `setzePrueferZurueck` (POST …/pruefer-wiederholen) und POST
…/entscheidung (F-228 bleibt 14/13). Gate (b7).

**B3 (HOCH) „Prüfung wiederholen“.** In POST …/pruefung-wiederholen vor der Verzweigung `naechster = wendeBudgetAn(…)`;
der bestehende Halt-Schreiber schreibt dann den Budget-Halt mit Cursor auf dem Review (statt eines Startfehler-Halts auf
der Ausführung). Gate (b8).

**B4 (MITTEL) Anzeige nach der Erhöhung.** Die Freigabe-Karte hängt an `naechster.art === 'haltFreigabe'`
(`public/leitstand/views/workflow-entscheiden.js:52`), nicht am Status. Deshalb: GET /api/workflows/<id> projiziert
`naechster` über `wendeBudgetAn` (im Budget-Halt keine Freigabe-Karte); nach der Erhöhung ist das Budget nicht mehr
überschritten ⇒ `haltFreigabe` ⇒ die bestehende Freigabe-Karte erscheint (Klick „Budget erhöhen“ lädt das Detail neu;
bei `starte` ruft er danach POST …/starten). Der gespeicherte Grund „Budget erreicht“ bleibt bis zum nächsten Schreiben
in Liste und Technik-Tabelle stehen (kein neuer Schreiber); die Abnahme und der Blick zeigen den Halt allein aus der
Projektion (`budget.ueberschritten`), nie aus dem Grund. Render-Nachweis: Lage „nach Erhöhung, Freigabe“ zusätzlich.

**B5/B6 Umfang** → B2b-3d (inkl. `istAusnahmePfad`-Filter).

**B7 (MITTEL) Synchron, Reihenfolge.** `ermittleBudgetStand` bleibt synchron (nur `listeVersionen`/
`ladeArtefaktVersion`). In `starteWorkflowSchritt` steht die Prüfung vor der Einrichtungsprüfung und vor jeder
Zustandsänderung.

**B8 (MITTEL) Poll-Last.** Zwischenspeicher der Lauf-Summe je `(workflowId, versionSequenz)` (Menge der `lauf_id` ändert
sich nur mit einer neuen Version; ein Lauf ohne Laufakte — läuft noch — wird nicht gespeichert, solange er fehlt).
`budget_tokens` wird immer frisch aus dem Auftrag gelesen. Die Routen reichen die schon geladene Workflow-Version durch.

**B9 (NIEDRIG) Kontrolltiefe nur aus den Schritten** zur Laufzeit (`kontrolltiefeAusSchritten`); das Router-Ergebnis
nur im Ableitungsskript. Gilt auch nach einer Reparaturfassung.

**B10 (NIEDRIG) Begründung hoch ≥ standard** korrigiert: der Median-Ablauf hoch (4 753 252) ist voll gemessen (5/5);
die Regel trägt strukturell — hoch enthält alle Schritte von standard plus Architekt und Advisor, ein kleinerer Default
wäre ein Stichprobenartefakt.

**B11 (NIEDRIG)** Die gemessenen Abläufe stammen von vor „qa live“ (#345, ein Claude-Schritt mehr je Runde) — in das
Kalibrierungs-Finding.

**B12 (NIEDRIG) Erhöhungsschritt = aktuelles Budget:** `neu = summe + tokens` („noch einmal das gesetzte Budget“).

**B13 (NIEDRIG)** `lauf_id` ohne Laufakte zählt weder gemessen noch „ohne Messung“ (geheilte Starts, laufende Läufe).

**B14 (NIEDRIG) Durchsetzungsgrad:** DEKLARIERT im Sinne von ARCHITECTURE.md §8 — fail-open (nicht bestimmbar ⇒ kein
Halt), geprüft nach dem Schritt (Überschreitung um bis zu einen Schritt möglich). ARCHITECTURE.md §1 nachziehen
(`src/budget`, `budget-stand.mjs`, „Budget erhöhen“ als weiterer Weg zu einer Auftragsversion über `registriereAuftrag`).

**B15 (NIEDRIG) Route:** Laufsperre wie POST …/einrichtung, Wurf von `registriereAuftrag` ⇒ 500 mit Grund; Route neben
…/einrichtung, nicht im Block `/api/entscheidungen` (check-f13); neue Kommentare ohne die von F-228 gezählten Muster.

**Zu Frage 1 des Advisors:** Die Erhöhung gilt für das ganze Arbeitspaket (jede weitere Fassung desselben Auftrags);
die Auftragsversion trägt keine Begründung und keinen Ablaufbezug, die Lineage-Zeit ist die Spur. Als Entscheidung für
Stefan im Bericht genannt (E-B2b-3c-1), gebaut wie hier beschrieben.

## Gate `scripts/check-f45-b2b3c-budget.mjs` (neu, in `check:gates`)

- (b1) Budget überschritten nach dem Ausführungslauf ⇒ KLAERUNG_ERFORDERLICH mit Budget-Grund, Review startet nicht,
  Cursor auf dem Review; GET …/abnahme `budget.ueberschritten`, `erhoehbar`; GET /api/workflows/<id> `naechster` =
  haltKlaerung.
- (b2) POST …/starten im Budget-Halt ⇒ 409, kein Lauf; POST …/freigabe ⇒ 409, nichts festgehalten.
- (b3) POST …/budget ⇒ neue Auftragsversion mit `budget_tokens = summe + budget`, danach …/starten ⇒ Review läuft,
  ABGESCHLOSSEN; keine Kern-Abnahme-Version (kein Rückweg).
- (b4) Arbeitspaket ohne `budget_tokens` ⇒ Default (`quelle: 'default'`, `BUDGET_DEFAULTS[kontrolltiefe]`).
- (b5) letzter Schritt über Budget ⇒ ABGESCHLOSSEN (kein Halt), Abnahme zeigt überschritten, `erhoehbar` false.
- (b6) Review beanstandet + qa startbereit + Budget überschritten ⇒ Halt mit Cursor auf dem qa, keine Kern-Abnahme.
- (b7) POST …/pruefer-wiederholen im überschrittenen Budget ⇒ Budget-Halt statt LAEUFT; Ablauf auf WARTET_FREIGABE mit
  überschrittenem Budget ⇒ `erhoehbar` true, POST …/budget 200, danach Freigabe möglich.
- (b8) POST …/pruefung-wiederholen GRÜN im überschrittenen Budget ⇒ Budget-Halt mit Cursor auf dem Review; nach der
  Erhöhung startet der Review.
- (b9) Korrekturrunde bei überschrittenem Budget ⇒ Halt mit Budget-Grund am Neubau statt Freigabe-Frage.
- (f) Quelltext: `starteWorkflowSchritt(` 6×, Workflow-Schreiber 14 / `.eingefroren` 13.

## Anzeige (unverändert aus v1, ohne Umfang)

Abnahme und Ablauf-Detail (Blick): „Verbrauch: X von Y Tokens“ (amber bei Überschreitung), Halt-Notiz mit Knopf
„Budget erhöhen“ bei `erhoehbar` (Abnahme-Vorab und Ablauf-Seite). i18n de/en/ru/tr. Render-Nachweis
`features/F45/nachweise/b2b3c/`: Budget-Halt mit Knopf; Abnahme mit Verbrauch über Budget; nach Erhöhung mit Freigabe —
Ansichten de 1440 dunkel/hell, de 390, ru 390 hell, de 1440 200 %, `scrollWidth`; danach design-guardian.
(Die im Auftrag genannte Lage „Abnahme mit Umfangs-Hinweis“ entfällt mit dem Umfang nach B2b-3d.)

## Schätzung

≈ 0,6–0,75 AT (Advisor). B2b-3d (Umfang + Quelle für `bereiche`) ≈ 0,3–0,4 AT, folgt.
