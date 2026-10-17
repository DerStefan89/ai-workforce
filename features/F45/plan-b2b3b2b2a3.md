# Plan v1 — F45 B2b-3b-2b-2a-3 „Rückfrage-Kanal: Abnahme“ (Teil B aus 2a-2)

Stand 17.10.2026. Branch `f45/b2b3b2b2a3-abnahme`, Basis main nach #358. Vorlage: `plan-b2b3b2b2a2.md` §Teil B (B1–B4), Advisor
`advisor-b2b3b2b2a2.md` M10. Findings: F-1128 (3), F-1132 (1)(5), F-1133 (10), F-1134. Kein echter CLI-Lauf (2b-2b).

## Ziel
Die Abnahme eines Laufs (Lauf-Detail, Workflow-Sichtung beim F-760-Halt, „Deine Entscheidungen“) zeigt, was der Rückfrage-Kanal bewirkt
hat, und unterscheidet eine Verweigerung wegen des Kanals von einer echten. Ohne Kanal: `daten` der Terminalmarke bitgleich, keine neuen
sichtbaren Elemente.

## 1 Zählung (F-1132 (1)) — Vermittlung, Controller, Evaluator
- `zaehlungVon` (scripts/leitstand/rueckfrage-vermittlung.mjs:444) zusätzlich, aus dem Speicherstand:
  - `abgelaufen`: `zeitueberschreitung` + `frage_ohne_antwort` mit Grund `GRUND_WARTEGRENZE` („Wartegrenze erreicht“);
  - `lauf_ende`: `lauf_beendet` + `frage_ohne_antwort` mit Grund `GRUND_LAUF_ENDE` („Lauf beendet“) + zum Lesezeitpunkt noch offene
    Warteschlangeneinträge. Begründung (M10 „Wartegrenze kann zwischen Lesen und `beendeLauf` feuern“): der Controller liest nach dem
    Prozessende der CLI — eine dann noch offene Rückfrage kann den Lauf nicht mehr beeinflussen, egal ob danach Timer oder `beendeLauf`
    sie ablehnt. Sie zählt als „bis zum Lauf-Ende unbeantwortet“; das Protokoll kann für sie später `zeitueberschreitung` tragen
    (DEKLARIERT, ARCHITECTURE §4).
  - `automatisch`: `auto_deny`, übrige `frage_ohne_antwort` (ID doppelt, zu viele offene) und Ablehnungen über der Protokollgrenze ohne
    Eintrag (neuer Zähler `ohneEintrag` am Lauf, in `stelle`).
  Grund-Texte als Modulkonstanten statt Literale (gleicher Wortlaut ⇒ Protokoll bitgleich).
- Controller: `ZAEHLUNG_FELDER` (src/execution-controller/index.ts:348) und Typ `RueckfrageZaehlung` (src/result-evaluator/types.ts:43)
  um die drei Felder; `leseRueckfrageZaehlung` liefert alle sieben, fremde Form ⇒ undefined wie bisher.
- Evaluator (src/result-evaluator/index.ts:454): Bedingung `teilergebnis.ergebnis !== 'FEHLGESCHLAGEN'` entfällt ⇒ Zählung auch bei
  FEHLGESCHLAGEN (TIMEOUT/ABBRUCH während eine Rückfrage wartet). Reihenfolge der Abgleichsprüfungen unberührt (nur `kanalDaten`-Zeile).
  Kein neuer Grund-Code (`grund: '…'`) im Evaluator ⇒ `GRUND_SCHLUESSEL` unverändert; Drift-Test chat-laufstand.test.mjs läuft lokal mit.
- Ohne Kanal: `rueckfrageZaehlung` fehlt in den Eingaben ⇒ `daten` bitgleich (Test für ERFOLGREICH, VERWEIGERT, FEHLGESCHLAGEN/TIMEOUT).
- Bestands-Test `src/result-evaluator/result-evaluator.test.ts` (~:1293, „keine Zählung bei FEHLGESCHLAGEN“) wird umgekehrt —
  beabsichtigte Änderung; Controller-Tests mit vollständiger Zählung (`execution-controller.test.ts` ~:1764) um die drei Felder.

## 2 Server-Projektion (netto ≤ 0)
- Neues Helfermodul `scripts/leitstand/lauf-terminal-projektion.mjs`: `baueVerweigertDatenProjektion` zieht unverändert dorthin um
  (Server :933–962, drei Aufrufer :4233/:8444/:9873 bleiben über Import), dazu `baueRueckfrageKanalProjektion(laufId, laufStatus,
  basisVerzeichnis)`: nur bei `ABGESCHLOSSEN` (jedes Ergebnis) aus `daten` der Terminalmarke; `null`, wenn keines der Felder
  `rueckfrage_zaehlung`/`rueckfrage_abgleich`/`rueckfrage_abweichung` vorkommt (ohne Kanal). Sonst
  `{ ergebnis, zaehlung: {7 Felder} | null (fremde Form), abgleich: { art, grund } | null, abweichung: string | null,
  abgelehntDurchStefan: number | null }` — jedes Feld formgeprüft, nie geraten.
- `GET /api/laeufe/<id>`: eine Zeile `rueckfrageKanal: baueRueckfrageKanalProjektion(…)` neben `verweigertDaten`.
- R3 in der Startfehlerliste (Advisor M10 „Präfix brüchig ⇒ Feld `art`“): Zeile :6832 bekommt `art: 'rueckfrage_abweichung'` im
  gepushten Objekt (gleiche Zeile). `GET /api/startfehler` trägt das Feld mit; übrige Einträge unverändert.
- Bilanz: −~30 (Funktion + Kopf) +1 Import +1 Antwortzeile ⇒ deutlich negativ; `scripts/wachstumsbremse-server.json`
  `obergrenze_zeilen` auf das Ist senken (Ratsche (a3)). `starteWorkflowSchritt(` 6× unberührt; `_rueckfrage-aus-pruefung.mjs` unberührt.

## 3 Anzeige
- Neues reines Modul `public/leitstand/rueckfrage-abnahme.js` (kein DOM, kein fetch; testbar mit node:test):
  - `renderRueckfrageAbnahme(kanal)` ⇒ `''` bei `null`. Sonst Block „Rückfrage-Kanal im Lauf“ (`.note`, bzw. `.note.red` für R3):
    Antworten (einmal erlaubt, abgelehnt, Fragen beantwortet, davon nicht aus dem Browser) mit Beschriftung „Die Zählung enthält auch
    Ablehnungen, die die Auswertung nicht bestätigt hat“ (B10); getrennt „unbeantwortet“ (abgelaufen, bei Lauf-Ende abgelehnt,
    automatisch abgelehnt); alle sieben 0 ⇒ „Kanal war an, keine Rückfrage im Lauf“ (unterscheidbar von „kein Kanal“ = kein Block);
    Zählung `null` ⇒ „Zählung nicht lesbar“.
  - `abgleichGrundText(abgleich)` ⇒ `{ titel, text, wasTun }` je `art`: `abgleich` mit Grund aus `ABGLEICH_GRUENDE` (je Code ein Satz,
    unbekannter Code ⇒ allgemeiner Satz + Code escaped), `nicht_geprueft`/`umgehungsverdacht`, `kein_protokoll`, `abweichung` (Grund =
    Freitext ⇒ escaped). „Was tun“ je Art (z. B. Ablehnungstext passt nicht ⇒ Formatwechsel der CLI möglich, Rohstrom prüfen, Lauf
    wiederholen; Umgehungsverdacht ⇒ E-186-Weg).
  - R3 (`abweichung`): eigene dauerhafte Meldung `.note.red`: „Protokoll nicht bestätigt — Fälschung oder Schreibfehler; Ablehnungen durch
    Stefan zählen nicht“, Grundtext escaped (kann aus einer gefälschten Datei stammen; Steuerzeichen über die Maske aus
    `rueckfrage-anzeige.js`, falls vorhanden), „was tun: Kontrollzustand des Laufs prüfen, Lauf wiederholen“.
- Lauf-Detail (`views/runs.js` `zeichneLaufDetail`, `views/lauf-detail.js` `renderLaufNotiz`): bei VERWEIGERT mit `abgleich` ersetzt der
  Kanal-Grund die Zeile „Ursache in Klartext [kommt]“ (neue Option `rueckfrageKanal` an `renderLaufNotiz`); der Block
  `renderRueckfrageAbnahme` steht unter der Notiz (gleiches `setzeDetailHtml`). Ohne Kanal bitgleiches HTML (Test).
- Workflow-Sichtung beim F-760-Halt (`views/workflow-eingriffe.js` `renderSichtungNotiz`): mit Kanal-Grund ersetzt
  `abgleichGrundText` den Standardsatz `eingriff.sichtung.text`; Schritt/Lauf-Verweis und Knopf bleiben. Quelle: `views/workflows.js`
  holt das Lauf-Detail der `sichtung.laufId` einmal (Map laufId → Projektion; die Terminalmarke ist unveränderlich), Kennzeichen um
  die Art des Grunds erweitert. Server-Grund (F-760-Halt) bleibt wortgleich (F-768-Erkennung).
- „Deine Entscheidungen“ (`attention-daten.js`, `views/attention.js`, `typ-chip.js`): Startfehler mit `art: 'rueckfrage_abweichung'`
  bleiben in der Gruppe „Läufe & Starts“, aber Chip „Protokoll-Abweichung“ (Farbe `fehler`, keine neue Farbe), Frage „Rückfrage-Protokoll
  nicht bestätigt“ statt „Ein Lauf konnte nicht starten.“, Link `#/runs/<laufId>` (dort die dauerhafte Meldung). Kein Hauptknopf-Sonderfall.
- i18n de/en/tr/ru für alle neuen Schlüssel (check-f44-i18n).

## 4 Regel (F-1132 (5))
- Test (src/rueckfrage/index.test.ts): in `RUECKFRAGE_REGEL` steht `frage_stefan` vor „'- [x] Blockiert'“ in derselben Zeile, „Zuerst“
  wörtlich.
- Entscheidung „Frage ungültig — nicht an Stefan gestellt“: einmal korrigiert neu fragen (kürzer, höchstens 10 Optionen, keine leere
  Frage); scheitert auch das, gilt es wie „keine Antwort“ ⇒ Hinweis zu '- [x] Blockiert'. Neue vierte Regelzeile; der Test koppelt den
  Wortlaut „Frage ungültig — nicht an Stefan gestellt“ an `scripts/leitstand/rueckfrage-mcp.mjs:154` (Quelltext-Probe). ARCHITECTURE §3.
- Die Regel geht nur mit Kanal in den Auftragstext (Server :7520) ⇒ ohne Kanal unverändert.

## 5 Gate `scripts/check-f45-b2b3b2b2a3-abnahme.mjs` (package.json)
(z) echte Vermittlung: Zählung mit allen drei unbeantworteten Arten (Fake-Timer bzw. kleine Wartegrenze, offene beim Lesen, Grenze ohne
Eintrag); (f) echter Evaluator: FEHLGESCHLAGEN/TIMEOUT mit Zählung, ohne Kanal keine `rueckfrage_*`-Schlüssel; (p) Projektion aus einer
echten Terminalmarke (mit/ohne Kanal, fremde Form ⇒ null-Felder); (s) echter Handler `GET /api/laeufe/<id>` liefert `rueckfrageKanal`,
`GET /api/startfehler` R3-Eintrag mit `art`; (a) Render: Block, alle-0-Satz, Abgleich-Grund je Art statt Standardtext, R3 escaped
(`<img …>`), ohne Kanal ''; (g) Regelwortlaut. Rot gegen main per `git archive` (F-1127).
Test-Attrappen mit Geheimnis-Form nur zur Laufzeit zusammengesetzt (F-1134) — hier voraussichtlich keine nötig.

## Geänderte Bestands-Gates/Tests (erwartet)
- `result-evaluator.test.ts` FEHLGESCHLAGEN-ohne-Zählung ⇒ umgekehrt (beabsichtigt, siehe 1).
- Controller-/Vermittlungs-Tests mit Zählungsobjekt um drei Felder ergänzt (keine Bedingung entfällt, nur Erwartungswert erweitert).
- `scripts/wachstumsbremse-server.json` Grenze gesenkt (Ratsche verlangt es).
- Falls ein Gate `wirkungsmarkeFelder`/die Startfehler-Zeile wörtlich pinnt: Zeile nur ergänzt.

## Render-Nachweis (neutrale Umgebung, F-1125)
`features/F45/nachweise/b2b3b2b2a3/instanz.mjs` (erster Import `neutrale-umgebung-starten.mjs`): Kontrollzustand mit drei Läufen, deren
Terminalmarken über den echten `klassifiziereLauf` geschrieben werden (VERWEIGERT mit `ablehnungstext_passt_nicht`, ERFOLGREICH mit
Zählung inkl. unbeantwortet, ERFOLGREICH/VERWEIGERT mit R3-Abweichung mit `<img>`-Text), ein Workflow im F-760-Halt auf den VERWEIGERT-Lauf,
ein R3-Startfehler-Eintrag. Screenshots de 1440/390, tr/ru 390, hell, Zoom 200 %.

## Doku
ARCHITECTURE §3 (Regel „Frage ungültig“), §4 (Zählung inkl. unbeantwortet und FEHLGESCHLAGEN, Lesezeitpunkt/`lauf_ende`, Anzeige);
fixpaket-f45 Zeile 2b-2a-3; Nachträge F-1128 (3) erledigt, F-1132 (1)(5) erledigt, F-1133 (10) „E-Hauptknopf = A, Stefan 17.10.2026“.

## Offene Punkte, nicht stillschweigend entschieden
- O1 Workflow-Sichtung: ein zusätzlicher Abruf des Lauf-Details aus der 2-s-Poll-Seite (einmal je laufId gecacht). Alternative: nur
  Verweis „Grund im Lauf-Detail“ und den Kanal-Grund allein im Lauf-Detail zeigen — kleiner, aber der Standardsatz bliebe auf der
  Workflow-Seite stehen. Zuschnitt?
- O2 `lauf_ende` enthält zum Lesezeitpunkt offene Einträge (siehe 1) statt „zusammenfassen“ (M10). Trägt die Begründung?
- O3 Chip-Ersatz für R3 über ein Zusatzfeld des Eintrags statt einer neuen Entscheidungsart (vermeidet ENTSCHEIDUNGS_ARTEN/Filter) —
  vertretbar?
- O4 `rueckfrageKanal` als eigenes Feld in `GET /api/laeufe/<id>` statt über `wirkungsmarkeFelder` in der Checkpoint-Liste (Plan v1 2a-2):
  ein Leser, gleiche Form wie `verweigertDaten`.
- O5 Zuschnitt: Zählung + Projektion + vier Anzeigeorte + Regel + Gate + Render — ein Baudurchgang plus eine Korrekturrunde?

## Risiken
- Lauf-Detail-Abruf ist schwer (Kette, Laufakte); die Sichtung holt ihn nur bei F-760-Halt und einmal je laufId.
- Escape: R3-Text und unbekannte Grund-Codes stammen aus Dateien/Daten, nie als HTML.
- `kappeGrund` kann ein Surrogatpaar teilen (F-1132 (8)) — Anzeige maskiert einzelne Surrogate.

## Status
- [ ] Freigegeben

## Nächster sinnvoller Schritt
Advisor-Pass (frischer Kontext) auf diesen Plan.
