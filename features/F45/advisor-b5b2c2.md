# Advisor-Pass F45 B5b-2c-2 „Roadmap: Pflege & Fixes im Gantt, Restpunkte, Entscheidungen nachziehen“ (Plan v1)

**Gegenstand:** `features/F45/plan-b5b2c2.md` (Basis `57451b9`, Branch `f45/b5b2c2-pflege-gantt`)
**Rolle:** architecture-advisor mit frischem Kontext, nur Read/Grep/Glob, 25.10.2026. Abgelegt von der bauenden Sitzung, Inhalt
unverändert.

## Urteil: **Freigegeben mit Hinweisen** — weiterer Schnitt: **ja**

- **Teil C kommt zuerst als eigenes Paket.** Es ist reine Doku, die Gates sind unabhängig, und Teil C kollidiert sonst mit den
  Akte-Änderungen von A+B in `features/F45/feature.md`.
- **A+B bleiben ein Durchgang, aber gekürzt.**
  - Die Nachweis-Wartehilfe wird nur im neuen Nachweis benutzt und nicht in `nachweise/b5b2c1/erzeuge-nachweis.mjs` nachgerüstet.
    Dessen Bilder werden nicht neu erzeugt, die Änderung bliebe also unbelegt.
  - Der Kanban-Vormerker ist die Stelle, die am ehesten wegfallen kann: Der Link öffnet dann „Kanban · Priorität“ ohne
    vorgewählten Filter.
- Die A-Punkte gehören in Plan v2. Einen zweiten Advisor-Pass braucht es dafür nicht.

## Antworten auf F1–F3

- **F1: Summe (direkt + Features) mit „davon m direkt“.**
  - [Schlussfolgerung] Die Trennzeile im Plan (`trenner.befunde`) braucht die Summe. Ohne sie verschwinden die Befunde an Features
    in eingeklappten, abgeschlossenen Meilensteinen.
  - [Fakt] Das passt zum bestehenden Meilenstein-Zähler, der über seine Features aggregiert (`roadmap-anzeige.js:136-139`,
    `views/roadmap.js:347`).
  - [Fakt] Ein Feature in zwei Meilensteinen zählt doppelt, wie bei `zaehleRoadmap` (`roadmap-anzeige.js:141-152`). Damit kann
    derselbe Befund in der Trennzeile zweimal zählen. Im Kopf als DEKLARIERT vermerken.
- **F2: Nein. B5b-2 bleibt `laeuft`, nur die Notiz bekommt „2c-2 gebaut“.** Siehe A1.
- **F3: C vorab**, A+B wie oben gekürzt.

## A — vor dem Bau klären

- **A1 F2 würde das Gate rot machen** [Fakt]
  - Die Zelle „Ist AT“ erlaubt nur „–“ oder eine einzelne Zahl (`src/workboard/feature-planung.ts:204-205`). „≈ 1,4–1,6“ erzeugt
    einen Planungsbefund.
  - Gate (i) verlangt `p45.befunde.length === 0` (`scripts/check-f45-b5b1a-planung.mjs:253`).
  - Die Akte legt fest, dass „Abgenommen“ das Merge-Datum aus git ist und dass der Challenger das Ist nachpflegt
    (`features/F45/feature.md:162-163, 166-167`).
  - Präzedenz: B5b-1b-2 und T stehen nach ihrem Merge weiter auf `laeuft` (`feature.md:149-150`).
  - [Schlussfolgerung] Wer das Datum vor dem Merge setzt, schreibt ein falsches Datum, sobald der Merge sich verschiebt.
- **A2 F-1186: Der Kopf „behoben“ ist nicht belegt**
  - [Fakt] Der Kopf „offen (… Bestätigung über Stefans Läufe offen)“ ist so gewollt; als Bestätigung gelten Stefans drei volle Läufe
    (`state/findings.md:8774, 8785`). Dass der Leitstand „offen“ zeigt, ist also kein Fehler.
  - [Schlussfolgerung] Am selben Tag fällt ein weiterer Test unter Last aus (F-1209, git-starter :159). Das spricht gegen „behoben“
    für diese Fehlerklasse.
  - Entweder Stefans Läufe als Beleg nennen, oder F-1186 bleibt offen mit einem Nachtrag „siehe F-1209“.
  - F-1209 analog: „behoben (serielle Gruppe), Bestätigung offen“ statt „erledigt“.
- **A3 „Zugeordnet zu“ für Befunde außerhalb der Spur**
  - [Fakt] `zuordnungVon` ordnet jeden Befund ein, egal welche Priorität und welcher Status (`public/leitstand/befund-zuordnung.js:73-78`).
    Die Spur enthält aber nur offene P0–P2 (`:85-87, :104`).
  - [Schlussfolgerung] Ein P3-Befund oder ein erledigter Befund würde als „Pflege & Fixes“ beschriftet, steht aber nicht in der Spur.
  - Text festlegen, zum Beispiel: Feature bzw. Meilenstein wie geplant; sonst „ohne Feature-/Meilenstein-Bezug“, und den Zusatz
    „(Spur Pflege & Fixes)“ nur bei offen P0–P2.
  - Ohne `roadmap.json` den vorhandenen Schlüssel `entwicklung.detail.planung.keineRoadmap` nutzen (`views/workboard-detail.js:257`),
    nicht „nicht verfügbar“.
- **A4 Regeln für den Vormerker im Plan festschreiben**
  - [Fakt] `ladeKanbanRoadmap` setzt `kanbanPflege = false` (`views/workboard.js:829`). Das Betreten lädt immer neu (`:844-856`,
    `seiteAktiv` wird beim Verlassen false, `:2258-2260`).
  - In `oeffneKanbanPrioritaet` unbedingt `wechsleTab('board', null, false)` aufrufen. Es setzt auch `kanbanTyp` zurück (`:864-874`);
    `oeffneEntwicklungsRegister` ruft es nur bei Reiterwechsel (`:898`). Danach `boardModus = 'prioritaet'`, den Vormerker setzen und
    `renderModi()` aufrufen (`:347-351`).
  - Der Vormerker übersteht den Reset in `ladeKanbanRoadmap`. Er wird nur bei einer aktuellen Antwort (Zähler) mit Zustand `ok`
    übernommen.
  - Er verfällt bei `fehler` oder `nicht_vorhanden`, in `wechsleTab`, in `ladeNachProjektWechsel` (`:2304-2326`), bei einem Klick auf
    einen Kanban-Filterchip und beim Wechsel des Modus.

## B — beim Bau beachten

- **B1** [Fakt] Die neuen Zeilen brauchen `bezug: { meilenstein: null, feature: null, workstream: null }` und
  `spur: baueSpur([], {}, achse)`. Ohne `bezug` stürzen ab: `gewaehlteZeile` (`roadmap-anzeige.js:627`), `detailPanel`
  (`views/roadmap.js:503`) und `featureZeileVon` (`:577`). Ohne `spur` stürzen ab: `spurHtml` (`:419`, `:386-398`) und
  `detailHinweise` (`:473`).
- **B2** [Fakt] Befund-Zeilen haben die Pflege-Zeile als Eltern und bekämen in der Geschwisterschleife ein „danach“ untereinander
  (`roadmap-anzeige.js:581-589`). Die Pflege-Zeile stünde mit `findIndex` −1 vorn (`:588`). Beide Arten ausdrücklich überspringen
  und im Test festhalten.
- **B3** [Fakt] `roadmap-anzeige.test.mjs:386` prüft `lage.trenner` mit `deepEqual` gegen `{ anzahl, abgenommen, gesamt }`.
  `befunde` also nur mit Zuordnung anhängen, oder den Test anpassen.
- **B4** [Fakt] Legende und Chips: `legende()` baut die Schlüssel als `typ.${e}` (`views/roadmap.js:598`). `typ.pflege` gibt es
  nicht, `typ.bug` schon (`i18n/de.js:233-241`). Für „Pflege & Fixes“ einen festen Schlüssel nehmen; das i18n-Gate prüft dynamische
  Schlüssel nicht. `typChip('pflege')` liefert '' (`typ-chip.js:49`). Für „Spur“ braucht es eigenes Markup. Ein unbekannter
  Workitem-Typ ergibt `chipTypVonWorkitem` = null, dann einen leeren Chip. Dafür einen Fallback vorsehen.
- **B5** [Fakt] CSS ohne neue Farbwerte ist machbar. Die anderen Blass-Werte sind `:root`-Tokens (`style.css:159-164`).
  `--ebene-bug(-blass)` gibt es (`:158, :164, :331`). `color-mix(in srgb, var(--muted) 16%, transparent)` gilt im Gate als
  Token-Nutzung (`check-f20-design-tokens.mjs:75-78`). `--muted` = #9caeb5 (`style.css:95`, hell `:290`).
- **B6** [Fakt] Zeitpunkte: `ganttLage()` läuft bei jedem Render und in den Handlern (`views/roadmap.js:609, 925, 936, 1040, 1360,
  1381`). „Nicht je Render“ im Plan ist deshalb missverständlich. Gemeint ist: eine Stelle. Optional nach der Identität von
  (workitems, roadmap) zwischenspeichern. Die Roadmap kann vor den Workitems rendern (`:884-906`). Dann erscheint die Pflege-Zeile
  später, und ein „Alles aufklappen“ dazwischen lässt sie zu (`:1380-1384`). Als DEKLARIERT festhalten.
- **B7** [Fakt] Standard-Vorauswahl der Bereinigung: `bereinigungsStand(id)` ruft `neuerEintragsStand()` ohne Eintrag
  (`views/roadmap.js:1152-1158`). Beide Aufrufer haben den Eintrag zur Hand (`:1172-1174`, `:1234-1236`). Der Testhelfer ruft ohne
  Argument (`roadmap-bereinigung.test.mjs:48`). Ohne Argument gilt also: keine Vorauswahl. F-1206: In der Auswahl entfällt
  `<small>${nebenwirkung}</small>` (`roadmap-bereinigung.js:217`); der Bestätigungsschritt behält ihn (`:255`).
- **B8** Teil C: [Fakt] Neue Workstream-Zeilen brauchen 9 Zellen (`feature-planung.ts:190-191`); im Plan stehen 5. [Fakt]
  `verworfen` ohne Abgenommen-Datum ist zulässig (`:210`). [Fakt] Gate (i2) bleibt unberührt: Die F30-Tabelle ist leer, also ist
  „Bis M5“ ohnehin nicht berechenbar (`check-f45-b5b1a-planung.mjs:245`). [Schlussfolgerung] Sichtbare Widersprüche ohne stilles
  Umdeuten benennen oder als ersetzt markieren: Scope R2 „Abhängig von R, B3“ (`feature.md:95`), E-F45-2 „fällig nach R“ (`:24`),
  E-VORSCHAU-1 „Stufe 2 nach R“ (`:45`), E-BRAIN-1 „Stufen 2/3 nach F30“ (`:66`).
- **B9** Nachweis-Wartehilfe: [Fakt] Die Platzhaltermenge enthält Werte aus mehreren Wörtern wie „wird geprüft“ (`de.js:1553`) und
  „Der Ausführungsstand wird geladen …“ (`de.js:785`). [Schlussfolgerung] Wer auf das ganze `#workboard-detail` wartet, kann hängen
  bleiben, wenn Click-to-Work in der Wegwerf-Kopie nie fertig lädt. Eine Zeitgrenze mit Nennung des restlichen Platzhalters
  vorsehen. Im Modul Playwright nicht auf oberster Ebene importieren, damit der Test den reinen Teil laden kann.
- **B10** [Fakt] Befund-Detail: `ladeKanbanRoadmap` ruft nach dem Eintreffen nur `renderBoard()` (`workboard.js:840`).
  `renderDetailNachtrag()` ergänzen. Das Feld in `baueDetailSicht` aufnehmen (`:1609-1625`). `befund-zuordnung.js` „Wird
  aufgerufen von“ nachziehen (`:20-22`).
- **B11** [Fakt] F-1010 „erledigt“: Den Text auch auf F30 (Akte seit B5b-1a) und AF-F001 (deklarierte Ausnahme ohne Meilenstein)
  beziehen (`findings.md:7383, 7387`). `roadmap-ausnahmen.json` ist leer.
- **B12** [Schlussfolgerung] Den Vormerker mit einem kleinen Verdrahtungstest absichern: `projekt-wechsel.test.mjs` lädt beide Views
  (`:230, :235`). Sonst bleibt nur der Nachweis (F-1208 qa 9).

## Geprüft und in Ordnung

- [Fakt, entlastend] Keine Serveränderung und kein neuer Schreibweg. Die Wachstumsbremse gilt nur für `leitstand-server.mjs`
  (`ARCHITECTURE.md:57`).
- [Fakt, entlastend] Dass eine View eine andere importiert, hat Vorbilder (`views/code.js:41`, `views/runs.js:66`). Es entsteht kein
  Ring: `workboard.js` importiert `roadmap.js` nicht.
- [Fakt, entlastend] `anpassbar` liefert für `pflege`/`befund` `{ nein, grund: null }` (`roadmap-anpassen.js:55`).
- [Fakt, entlastend] Die Pflege-Zeile ist nicht in `standardOffen` (`roadmap-anzeige.js:407-411`). „Alles aufklappen“ nimmt sie aus
  `oben` mit (`:606-608`). Fällt die Wahl weg (eingeklappter Befund), greift die Pflege-Zeile über `eltern` (`:623`).
- [Fakt, entlastend] `kanbanRoadmap` ist für „Zugeordnet zu“ tragfähig: bei jedem Betreten geladen, auch beim Direktlink, mit
  Anfragezähler, beim Projektwechsel verworfen (`workboard.js:824-856, 2319-2323`); dieselbe Quelle wie beim Kanban-Filter;
  `sicht.roadmap` gibt es nur für Features (`:1550-1553`), daher spart das einen zweiten GET.
- [Fakt, entlastend] Der Statuswechsel bei den Findings bricht keine Gates: Archivregel und höchste ID gelten nur für das Archiv,
  F-1209 bleibt im Register (`check-f21-workboard.mjs:58-70`); der Parser liest `startsWith('offen')`, sonst sucht er ein
  Erledigt-Wort (`src/workboard/findings.ts:50-54`); kein Gate prüft den Status von F-1010 oder F-1186.
- [Fakt, entlastend] `teste.test.mjs:81-83` prüft nur, dass die Dateien existieren und nicht doppelt stehen.
  `src/git-starter/git-starter.test.ts` existiert, der Test hat `timeout: 30_000` (:159).
- [Fakt, entlastend] Die STATUS.md-Zeile 500-502 ändert nur Freitext; das Gate liest nur die Standardform. E-M5-17 gibt es
  (`zielfassung.md:875`, `features/F25/feature.md:392`).
- [Fakt, entlastend] Die R1-Bereinigung ist erledigt (`roadmap-ausnahmen.json` leer). Die präparierte Kopie im Nachweis ist deshalb
  nötig.

## Was ich nicht prüfen konnte

- Den wörtlichen Text von E-BRAIN-2 und E-R-1; er steht nur im Auftrag.
- Ob Stefans drei volle Läufe für F-1186 stattgefunden haben.
- Echte Zahlen (Pflege-Menge, „+ n weitere“).
- Darstellung im Browser (hell/dunkel, 390 px) und die Texte in en/tr/ru.
- Gates und Tests habe ich nicht laufen lassen (keine Shell).
