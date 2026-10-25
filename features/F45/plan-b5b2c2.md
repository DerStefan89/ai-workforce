# Plan v1 — F45 B5b-2c-2 „Roadmap: Pflege & Fixes im Gantt, Restpunkte, Entscheidungen nachziehen“

Auftrag: Challenger, 25.10.2026 (letztes Teilpaket von B5b-2, Schnitt in `feature.md` „Stand B5b-2a“). Basis `57451b9` (#384),
Branch `f45/b5b2c2-pflege-gantt`. Vorarbeit: `plan-b5b2c.md` §2/§5 und `advisor-b5b2c.md` B1–B6, B10, B11, B15 (gelten weiter).
Keine Serveränderung, kein neues Gate (F-1190), ARCHITECTURE.md unverändert (kein neuer Schreibweg, F-1191). Drei Teile; schneidet
der Advisor, kommt Teil C zuerst als eigenes Paket (reine Doku + Test-Einstufung), dann A+B.

## Teil A — Gantt „Pflege & Fixes“ (lesend, Quelle `befund-zuordnung.js` aus 2c-1)

- **Lage** (`roadmap-anzeige.js`, rein): `ganttZeilen(roadmap, zustand)` nimmt optional `zustand.zuordnung` (= `ordneBefundeZu`;
  null/undefined ⇒ wie heute, keine Pflege-Zeile, Zähler `null`). Berechnet in `ganttLage()` der View (B1), nicht je Render.
- **Pflege-Zeile** `art: 'pflege'`, `farbe: 'pflege'` (grau = `--muted`, wie Vorlage „Spur“ #9caeb5 = `--muted`; Vorgabe „rot“
  aufgehoben, Entscheidung „B5b-2c geteilt“), Ebene 0, Status `geplant` (wie Vorlage), am Ende von `oben` (nach den offenen
  Meilensteinen, wie Vorlage nach V1-Backlog). Kurzinfo „n offene Befunde ohne Zuordnung (P0–P2)“; Standard zu (nicht in
  `standardOffen`), „Alles aufklappen“ öffnet sie mit (B6). Leere Spur — kein Balken, keine Marke. Bei n = 0: Kurzinfo „keine …“,
  nicht aufklappbar.
- **Kinder** `art: 'befund'`, Ebene 1, höchstens 20 (`PFLEGE_MAX`) in der Reihenfolge von `ordneBefundeZu` (P0 → P2, dann Quelle);
  `farbe: 'bug'` (rotes Quadrat `--ebene-bug`) bei Typ BUG, sonst `farbe: 'befund'` (neutral `--muted`). Name „Titel“, Kurzinfo
  „F-NNN · Typ · Pn“, Status `geplant`. Rest als Feld `weitere: n` an der Pflege-Zeile (B3, keine Zeile in `zeilen`); die View setzt
  hinter das letzte Kind eine nicht wählbare Zeile „+ n weitere“ mit Knopf „In der Entwicklung ansehen →“ (siehe unten).
- **„danach“**: `pflege` und `befund` stehen nicht in den Geschwisterlisten (B2) ⇒ `danach = null`; die Meilenstein-Sortierung
  bleibt.
- **Zähler je Feature und Meilenstein**: Feature-Zeile `befundeOffen = jeFeature.get(id)?.length ?? 0` (null ohne Zuordnung).
  Meilenstein-Zeile `befundeOffen = direkt (jeMeilenstein) + Summe seiner Features`, dazu `befundeDirekt`. Kurzinfo nur bei n > 0:
  „n offene Befunde (P0–P2)“. Detailpanel Feld „Offene Befunde“: „n (P0–P2)“ bzw. am Meilenstein „n (P0–P2), davon m direkt am
  Meilenstein“, „keine“, ohne Zuordnung „Lädt…“ bzw. „nicht verfügbar“. Ein Feature in zwei Meilensteinen zählt an beiden (wie die
  Projektion, `zaehleRoadmap`).
- **Trennzeile**: `trenner.befunde` = Summe `befundeOffen` der abgeschlossenen Meilensteine; Text zusätzlich „· n offene Befunde“
  (nur n > 0). „Einblenden“ zeigt die Zahlen an den Features (fällt aus den Zählern ab).
- **Detail der neuen Zeilen**: Pflege — Inhalt „n offene P0–P2-Befunde ohne Feature- oder Meilenstein-Bezug“ + Regel in einem Satz,
  Schätzung „–“. Befund — ID, Teil von „Pflege & Fixes“, Inhalt Titel, Schätzung „fehlt (Befunde tragen keine Schätzung)“, Link
  „Befund öffnen →“ `#/workboard/<id>`; Kopf-Chip über `chipTypVonWorkitem(typ)` + Priorität (B4), Pflege-Chip neutral „Spur“.
  `anpassbar()` gibt für beide `{ nein, grund: null }` (B5) ⇒ kein „Anpassen“. `teilVon`, `typChip`, `jarvisEntwurf`, `kurzinfo`
  bekommen eigene Zweige (keine Schlüssel `typ.pflege`/`typ.befund` dynamisch — B4); Status `geplant` ⇒ kein „?“.
- **Link „In der Entwicklung ansehen“**: neuer Export `oeffneKanbanPrioritaet({ pflege: true })` in `views/workboard.js` (Muster
  `oeffneEntwicklungsRegister`): Register Board, Modus Priorität, Pflege-Filter als „vorgemerkt“ — angewandt, sobald die Kanban-
  Roadmap ok geladen ist (das Betreten lädt sie neu und setzt den Filter heute zurück); scheitert sie, bleibt der Filter gesperrt
  mit Grund.
- **Befund-Detail „Zugeordnet zu“** (F-1208 qa 6, `views/workboard-detail.js`): statt „kommt“ aus derselben Regel —
  neuer reiner Baustein `zuordnungAnzeige(befund, roadmap)` in `befund-zuordnung.js` → `{ art, id, titel }` (für jeden Befund,
  jede Priorität und jeden Status — die Regel hängt nur am Feld „Feature/Run“). Text „F45 · Titel“ (Link `#/workboard/F45`),
  „M5 · Titel (Meilenstein)“ oder „Pflege & Fixes“; ohne Roadmap „Lädt…“/„nicht verfügbar“. Quelle im Workboard: die schon
  geladene Kanban-Roadmap (`kanbanRoadmap`, Betreten/„Neu laden“, nie Poll); kommt sie an, rendert auch das offene Detail neu.
- **CSS**: `#view-roadmap [data-farbe='pflege'|'befund']` mit `--muted` (blass über `color-mix` wie die anderen — Ausdruck, kein
  neuer Farbwert), `[data-farbe='bug']` mit `--ebene-bug(-blass)`; Zeile „+ n weitere“ wie eine Zeile ohne Spur. Legende um „Bug“
  und „Pflege & Fixes“ ergänzt.

## Teil B — Restpunkte

- **Bereinigung Standard**: `neuerEintragsStand(eintrag)` wählt „Feature → ABGESCHLOSSEN“ vor, wenn dieser Vorschlag möglich ist
  (B11, beide Aufrufer übergeben den Eintrag); „Meilenstein → LAEUFT“ mit Klasse `nachrangig` (kleinere Schrift, `--muted`, kein
  Fettdruck), unverändert wählbar. Kopfkommentar („keine Vorauswahl“) nachziehen.
- **F-1206 (dg 3)**: Folgentext nur noch im Bestätigungsschritt (B10: kein `<details>` im `<label>`); in der Auswahl entfällt er.
- **Nachweis-Wartehilfe**: neu `scripts/nachweis-laden.mjs` mit `ladePlatzhalter(woerterbuch)` (rein: alle Werte von Schlüsseln
  auf `.laedt`/`Laedt`, länger als ein Wort, z. B. „Lädt…“, „Diff lädt …“) und `warteBisGeladen(seite, woerterbuch, selektor)`
  (Playwright: `innerText` des Bereichs — nur Sichtbares — enthält keinen Platzhalter). Test `scripts/nachweis-laden.test.mjs` für
  den reinen Teil (de/en/tr/ru nicht leer, „lädt“ allein nicht dabei). `nachweise/b5b2c1/erzeuge-nachweis.mjs` nutzt sie in
  `warteKanban`/`warteDetail` (ganzes `#workboard-detail`, deckt Ablauf und „Was als Nächstes“); der neue Nachweis ebenso. Die
  Bilder von b5b2c1 werden nicht neu erzeugt.
- **STATUS.md** Z. 502: nur der Freitext „WS-2b/WS-3 — Health, Import — noch offen“ → „WS-2b/WS-3 (Import, Health) im V1-Backlog
  laut E-M5-17“.
- **teste.mjs**: `src/git-starter/git-starter.test.ts` in `SERIELL` (Kommentar: Test :159, 25.10.2026 zweimal nach 30 s unter Last,
  einzeln ≈ 6 s); neues Finding F-1209 (BUG P2, erledigt mit diesem Paket).
- **findings.md**: F-1010 erledigt („R1-Bereinigung F18/F20/F21/F22/F25 durch Stefan bestätigt, 25.10.2026, #383“). F-1186: Kopf
  „offen (behoben …)“ → „behoben (F45 T, …)“ — der Parser liest das erste Wort (Leitstand zeigte „offen“), Text sagt „behoben F45 T“;
  F-1206 teilweise (dg 3); F-1208 qa 6 erledigt.

## Teil C — Entscheidungen Stefan 25.10.2026 (wörtlich)

- `features/F45/feature.md`: E-BRAIN-2 und E-R-1 = A wörtlich unter „## Entscheidungen“; Scope-Zeile R „entfällt (E-R-1 = A)“;
  `## Workstreams`: R → Status `verworfen`, Notiz „entfällt — E-R-1 = A (Stefan, 25.10.2026): Referenzauftrag = F30-M1“ (verworfen
  braucht kein Abgenommen-Datum, Gate (c) gilt nur für erledigt); neue Zeilen nach R2: `Brain-2 | workstream | Brain Stufe 2:
  LLM-Wiki, Fragen mit Quelle, Rollen-Kontext | geplant | 1,5–2,5` und `Brain-3 | workstream | Brain Stufe 3: Brain-Graph und
  Graphify | geplant | 1–2`; Reihenfolge-Satz.
- `docs/projekt/fixpaket-f45.md`: §2 Bestehensbedingung ergänzt („Referenzauftrag = F30-M1, E-R-1 = A“), §3 R (entfällt), R2
  („Stufen 2/3 vor F30, E-BRAIN-2“, abhängig W2 statt R), zwei Brain-Zeilen, neuer Reihenfolge-Absatz oben (ältere bleiben als
  Verlauf).
- `features/F30/feature.md`: Nicht-Ziel R ersetzt durch den vorgegebenen Satz; Messpunkt Brain (a)/(b) beim Absatz „Messung, kein
  Bestehenskriterium“.
- `state/findings.md`: F-1202 Nachtrag (vor F30 statt nach F30, Methoden Stufe 2/3, Obsidian optional); F-980 Nachtrag
  (Referenzauftrag = F30-M1).
- Gates einzeln: check-f45-b5b1a-planung, check-feature, check-docs, check-status-akten, check-akte-meilenstein.

## i18n, Tests, Nachweis, Akte

- Texte de/en/tr/ru (`roadmap.pflege.*`, `roadmap.befunde.*`, `eintrag.spalte.zuordnung.*`).
- Tests: `roadmap-anzeige.test.mjs` (Pflege-Zeile da/fehlt, zu/auf, Max 20 + weitere, Kinderfarbe bug/befund, Zähler Feature/
  Meilenstein/Trennzeile, „danach“ unberührt, „Alles aufklappen“ öffnet Pflege), `befund-zuordnung.test.mjs` (`zuordnungAnzeige`),
  `roadmap-bereinigung.test.mjs` (Vorauswahl nur wenn möglich, nachrangig, kein Folgentext in der Auswahl),
  `views/workboard-detail.test.mjs` („Zugeordnet zu“ je Art, lädt, Fehler), `scripts/nachweis-laden.test.mjs`, `teste.test.mjs`
  (bleibt grün).
- Gates: f20-design-tokens, f44-i18n, f21-workboard, f21-ws2-workboard-oberflaeche, f45-b5b1b2-bereinigung, Teil-C-Gates; dann
  `npm run test` (Abbruch ⇒ melden, F-1205).
- Nachweis `nachweise/b5b2c2/` ≤ 8 MB WebP gegen Wegwerf-Kopie (Muster b5b2c1, Wartehilfe), Kopie mit präparierter Abweichung für
  die Bereinigungsliste (eine Ausnahme + Akte zurück auf FEATURE_GATE): Gantt Pflege zu/auf, Feature-/Meilenstein-Zähler (Kurzinfo +
  Detail), Trennzeile mit Befunden, eingeblendet, Befund-Detail „Zugeordnet zu“, Bereinigung mit Standard-Option; de dunkel/hell
  1440/390.
- Akte: „Stand B5b-2c-2“, Schnitt-Tabelle 2c-2 abgeschlossen, Workstream B5b-2 erledigt mit Ist (Abgenommen-Datum = Merge, setzt
  der Challenger; bis dahin `laeuft`?) — siehe Frage F2.

## Fragen an den Advisor

- F1 Meilenstein-Zähler: Summe (direkt + Features) mit „davon m direkt“ — oder nur direkt?
- F2 Workstream B5b-2 „erledigt mit Ist“ verlangt ein Abgenommen-Datum (Gate (c)); bisher setzt das Merge-Datum der Challenger.
  Vorschlag: `erledigt`, Abgenommen 2026-10-25 (Datum dieses Pakets), Ist = Summe der Teilpakete laut Berichten (≈ 1,4–1,6, Notiz).
- F3 Schnitt: A+B+C in einem Durchgang (≈ 0,5–0,6 AT) oder C vorab?

## Risiken

- `views/roadmap.js` wächst (keine Wachstumsbremse für Views). Pflege-Zeile ändert `oben` — Tests, die `oben` zählen, laufen ohne
  Zuordnung unverändert.
- Der Kanban-Vormerker ist neuer Zustand in `views/workboard.js` (kein Test der Verdrahtung, F-1208 qa 9) — nur Nachweis.
