# Advisor-Pass F45 B5b-2c „Roadmap: Pflege & Fixes, Kanban · Priorität, Bug-Felder“ (Plan v1)

**Gegenstand:** `features/F45/plan-b5b2c.md` (Basis `d3b217e`, Branch `f45/b5b2c-pflege-kanban`)
**Rolle:** architecture-advisor mit frischem Kontext, nur Read/Grep/Glob, 25.10.2026. Abgelegt von der bauenden Sitzung, Inhalt
unverändert.
**Was ich nicht prüfen konnte:** Die Zahlen aus §0 (746, 314, 240/74, F-1186) — keine Shell für `parseFindings`. Die Darstellung im
Browser (hell/dunkel, 390 px, 5 Spalten). Ob bestehende Tests von `roadmap-anzeige` feste Zeilenzahlen von `oben` prüfen (laut Plan
unverändert ohne Zuordnung). Ob `--ebene-bug-blass` im hellen Theme neu berechnet wird.

## Urteil: **Freigegeben mit Hinweisen** — weiterer Schnitt: **ja**

Die A-Punkte gehören in Plan v2. Einen zweiten Advisor-Pass braucht es dafür nicht.

## A — vor dem Bau klären

- **A1 Zuschnitt** [Schlussfolgerung]: Der Plan ist zu groß für einen Baudurchgang plus eine Korrekturrunde.
  - Er berührt die statischen Modus-Knöpfe ohne Handler und Zustand (`views/workboard.js:318-320`), neue Container in `index.html`
    und das Board-Raster, das fest auf 4 Spalten steht (`style.css:6502-6506`).
  - Dazu kommen `ganttZeilen` und mindestens 8 Stellen in `views/roadmap.js`, die von `art` abhängen (336, 355, 418, 444, 510, 598,
    927), die Bereinigungsliste, 4 Wörterbücher, 5 Testdateien und ein Nachweis mit präparierter Kopie.
  - 2a, 2b-1 und 2b-2 brauchten je eine Korrekturrunde mit 4–5 neuen Befunden (F-1195..F-1207).
  - Vorschlag: **2c-1 = (a) + (c) + (d)** (Entwicklung: Zuordnung, Kanban, Bug-Felder) und **2c-2 = (b) + (e)** (Roadmap: Pflege &
    Fixes, Restpunkte). Das folgt Plan §7 („Kanban vor Pflege“): Der Link „+ n weitere“ führt ins Kanban, das dann schon existiert.
- **A2 P4: keine eigene Spalte.** P4-Karten stehen in „P3 · Später“, die Karte zeigt ihre echte Priorität „P4“ (`boardKarte` zeigt
  `prioritaet` schon, `workboard.js:339`). Die Zahl im Spaltenkopf zählt sie mit, darunter „davon n P4 (Alt-Bestand)“. Gründe:
  - [Fakt] Akten kennen nur P0–P3 (`src/workboard/feature-planung.ts:32`).
  - [Fakt] Neue P4-Vergabe ist verboten, die 21 alten stehen auf einer Allowlist (`scripts/check-f21-workboard.mjs:248-276`).
  - [Schlussfolgerung] Mit dem Ziehen (B5b′) werden Spalten zu Ablagezielen; eine P4-Spalte wäre Ziel für eine verbotene Priorität.
  - [Schlussfolgerung] Eine Spalte nur bei n > 0 macht das Layout von den Daten abhängig.
  - [Fakt] Der Vermerk zu F-917 nennt „P0–P4 + ohne Priorität“ (`state/findings.md:6908`) — beim Erledigen die Abweichung nennen.
- **A3 Filter „Pflege & Fixes“ im Kanban** [Schlussfolgerung]: `ordneBefundeZu` liefert nur P0–P2, das Kanban zeigt auch P3 und
  „ohne“ — mit dem Filter wären diese Spalten ohne Erklärung leer. Festlegen: mit dem Filter stehen P3 und „ohne“ leer mit dem Satz
  „Pflege & Fixes umfasst offene P0–P2 ohne Feature-Bezug“ (Zahl = Roadmap, 74). Scheitert die Roadmap, ist der Filter gesperrt mit
  Grund.
- **A4 Feature-Prioritäten aus GET /api/roadmap** [Fakt, entlastend]: passt zu „Quelle Workitems, nicht Projektion“, keine
  Serveränderung (`scripts/leitstand/routen-roadmap.mjs:27-28`: „B5b-2 leitet sie aus /api/workitems und prioritaet ab“);
  `prioritaet` in `FeatureWorkitem` nicht zwingend.
  - **In den Plan** [Fakt]: Das Detail zeigt die Feature-Priorität fest als „ohne Priorität“ (`views/workboard-detail.js:960`) —
    sobald eine Akte `Priorität:` trägt, widersprechen sich Kanban und Detail. Das Detail hat `sicht.roadmap` schon
    (`workboard.js:1342-1347`, `meilensteinText` in `workboard-detail.js:254-261`); Priorität dort aus derselben Projektion lesen.
  - [Schlussfolgerung] Ein offenes Feature außerhalb von `roadmap.json` steht immer unter „ohne“ — ein Satz unter dem Board.

## B — beim Bau beachten

- **B1** [Fakt] Zuordnung in `ganttLage()` berechnen (`views/roadmap.js:211-216`), nicht „je Render“ — `jarvisEntwurf` (925) und
  `gewaehltesAnpassen` (936) bauen sonst eine Lage ohne Pflege-Zeilen (Rückfall der Auswahl, falscher Jarvis-Bezug).
- **B2** [Fakt] „danach“: Wurzelzeilen werden per `findIndex` sortiert (`roadmap-anzeige.js:588`); die Pflege-Zeile bekäme -1 und
  stünde vorn. Pflege-Zeile aus der Wurzel-Geschwisterliste nehmen; Befund-Zeilen „danach“ = null.
- **B3** [Schlussfolgerung] „+ n weitere“ nicht als Eintrag in `zeilen` (Rückfall auf `sichtbar[0]`, 622-628, Geschwisterliste);
  besser Feld `weitere: n` an der Pflege-Zeile, die View setzt den Link hinter das letzte Kind.
- **B4** [Fakt] `statusKategorie('OFFEN')` = 'unbekannt' (`roadmap-anzeige.js:41-58`) ⇒ „?“ in Zeile (418) und Detailkopf (512);
  `typ.${art}` in `kurzinfo` (355), `typChip(art)` (510), `jarvisEntwurf` (927) fänden `typ.pflege`/`typ.befund` nicht (i18n-Gate
  prüft dynamische Schlüssel nicht, `check-f44-i18n.mjs:31-33`). Lösung: Status 'geplant' wie die Vorlage (`Main.dc.html:376-377`);
  Typ über `chipTypVonWorkitem` und `typChip(…, { zusatz: Pn })` (`typ-chip.js:37-53`); in `teilVon` (444-449) eigener Zweig.
- **B5** [Fakt, entlastend] `anpassbar` gibt für 'pflege'/'befund' `{ nein, grund: null }` (`roadmap-anpassen.js:55`). Befund-Zeilen
  nie `art: 'fixpaket'` (`SCHAETZ_ARTEN`, Zeile 45).
- **B6** [Fakt] Pflege-Zeile standardmäßig zu (nicht in `standardOffen`, 407-411); „Alles aufklappen“ öffnet sie mit (606-608) — im
  Test festhalten.
- **B7** [Fakt] Bug-Felder: die Kachel „Regressionstest“ gibt es schon mit „kommt“ in `behebungBlock` (`workboard-detail.js:916`) —
  dort befüllen. Test `views/workboard-detail.test.mjs:202` erwartet „kommt“ mit F-975 ⇒ anpassen. Schritt `nachstellen` in
  `behebungsSchritte` (855) bleibt „kommt“ (Schritt, kein Feld). Die fünf Felder liegen im Workitem vor (`types.ts:26-31`).
- **B8** [Fakt] Helper für die Token-Grenze existiert: `nenntFeature`/`befundeAusFeature` (`eintrag-bausteine.js:164-180`) — daneben
  legen bzw. teilen. Je Feature gibt es dann zwei Zahlen (Detail: offen von gesamt, alle Prioritäten, jede ID; Roadmap: P0–P2, erstes
  gewinnt) ⇒ jeder Roadmap-Text trägt „(P0–P2)“.
- **B9** [Fakt] `--text-secondary` gibt es nicht, vorhanden `--muted` (`style.css:95/290`). Board fest 4 Spalten (`style.css:6504`,
  mobil 2 bei 6699) ⇒ Modifikator-Klasse für 5. `--ebene-bug`/`-blass` vorhanden (158/164/331).
- **B10** [Fakt] F-1206: `<details>` in `<label class="rm-bereinigung-option">` (`roadmap-bereinigung.js:217`) ist ungültiges HTML
  und wählt beim Klick das Radio. Einfacher: Folgentext in der Auswahl weglassen oder auf eine Zeile kürzen; vollständig nur im
  Bestätigungsschritt (255).
- **B11** [Fakt] `neuerEintragsStand` hat zwei Aufrufer (`views/roadmap.js:1155`, `roadmap-bereinigung.js:341`) — beide mit Eintrag;
  Vorauswahl nur, wenn `feature_abgeschlossen` möglich.
- **B12** Workboard lädt die Roadmap mit eigenem Anfragezähler, verwirft sie beim Projektwechsel, nie aus dem Poll (Muster
  `ladeRoadmap`, `views/roadmap.js:865-917`; Kopf `workboard.js:24-28`).
- **B13** [Schlussfolgerung] Suche im Kanban weglassen (weder Vorlage noch Status-Kanban; zweiter Zustand neben `suchText`,
  `workboard.js:212`); Typ-Chips und Pflege-Filter reichen. „Alle n anzeigen“ als Aufklappen ok, aber anderer Text als im
  Status-Board (358-364 springt in einen Reiter), etwa „Alle n hier zeigen“. Export `oeffneKanbanPrioritaet` nach
  `oeffneEntwicklungsRegister` (741-747): ok.
- **B14** [Fakt, entlastend] Kein Gate prüft „kommt“ an `#workboard-modi` oder `feldKommt`; f21-ws2 (f) verlangt nur `hole*`-Importe
  und kein POST (`check-f21-ws2-workboard-oberflaeche.mjs:180-219`), `holeRoadmap` ist importiert (`workboard.js:84`). Der alte
  Nachweis F44 ws3a (`erzeuge-nachweis.mjs:195`) zielt auf den gesperrten Prio-Knopf, wird nicht neu erzeugt. Brechen:
  `workboard-detail.test.mjs:202`, evtl. Bereinigungstests mit „keine Vorauswahl“.
- **B15** [Fakt] Die Vorlage färbt die Pflege-Zeile grau („Spur“, #9caeb5) und nur die Befunde rot (`Main.dc.html:376/384`); der
  Auftrag will die Zeile rot — als bewusste Abweichung nennen.

## Geprüft und in Ordnung

- [Fakt] ARCHITECTURE.md: kein neuer Schreibweg, Wachstumsbremse unberührt (gilt nur für `leitstand-server.mjs`, ARCHITECTURE.md:57).
- [Fakt] „offen“ = `status === 'OFFEN'` stimmt mit `waehleEntwicklungsstand` überein (`roadmap-anzeige.js:209-232`); „entschieden“
  und „teilweise“ zählen als SONSTIGES (`findings.ts:49-54`) und fallen bewusst heraus.
