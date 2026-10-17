# Plan v2 — F45 B2b-3b-2b-2a-3 „Rückfrage-Kanal: Abnahme“

Stand 17.10.2026. Nach Advisor-Pass `features/F45/advisor-b2b3b2b2a3.md` („Freigegeben mit Hinweisen“). Plan v1 (`plan-b2b3b2b2a3.md`) bleibt
stehen; hier nur die Änderungen. Kein Delta-Pass (Advisor: nicht nötig, wenn v2 die Abhilfen übernimmt).

## V1 Klassen der Abgleich-Codes
`public/leitstand/rueckfrage-abnahme.js` ordnet `rueckfrage_abgleich` einer Klasse zu (literale Zuordnung, Drift-Test gegen
`ABGLEICH_GRUENDE`, M5):
- `echt`: `abgleich`/`kein_eintrag`, `kein_protokoll` ⇒ **kein** Ersatz des Standardsatzes (Lauf-Detail, Sichtung); im Block nur „mindestens
  eine Ablehnung lief nicht über den Kanal“ bzw. „kein Rückfrage-Protokoll“.
- `automatisch`: `nicht_von_stefan`.
- `nicht_bestaetigt`: `ablehnungstext_passt_nicht`, `werkzeug_abweichend`, `eingabe_abweichend`, `eintrag_mehrfach`, `id_doppelt`, `id_fehlt`,
  `ablehnung_ungueltig`.
- `protokoll`: `protokoll_ungueltig`, `protokoll_fremd`, `art: 'abweichung'`.
- `nicht_geprueft` (E-186): nur im Block (M10).
- unbekannte `art`/Code ⇒ allgemeiner Satz + Code/Text escaped (M6).
Titel, Text („mindestens eine Ablehnung …“) und „was tun“ je Klasse (i18n je Klasse, nicht je Code); der Code steht klein und escaped dabei.

## V2 R3 an allen Stellen
- Startfehler-Eintrag trägt `art: 'rueckfrage_abweichung'` (Server :6832, gleiche Zeile).
- `attention-daten.js`: Startfehler-Einträge übernehmen `abweichung: true` und `hash: '#/runs/<laufId>'`, Art bleibt `startproblem` (Gruppe,
  Filter, Zahl unverändert). `views/attention.js`: Frage `attention.frage.abweichung`, Knopf `attention.knopf.abweichung` („Lauf ansehen“),
  Chip über neue Option `artChip(art, { text })` mit `attention.art.abweichung` („Protokoll-Abweichung“, Farbe `fehler`). Eine Karte ohne
  `abweichung` behält `hash: null` (kein fehlender Knopf-Schlüssel).
- Hauptknopf: die R3-Karte darf den gefüllten Hauptknopf tragen (E-Hauptknopf = A betrifft nur Kanal-Rückfragen; steht eine oben, bleibt es
  bei „kein gefüllter Hauptknopf“).
- Live-Karte (`views/live-anzeige.js:409`): `live.naechstes.art.abweichung` statt `.startproblem`, wenn `e.abweichung`.
- Ausführungen „Startfehler“ (`lauf-detail.js` `renderStartfehlerListe`): R3-Zeile mit Marke „Protokoll-Abweichung — Lauf lief, kein
  Startproblem“ und Link zum Lauf.

## V3 `abgelehnt_durch_stefan`
Block-Zeile „Davon von der Auswertung bestätigt: n“ (nur bei ERFOLGREICH vorhanden; bei VERWEIGERT „0 — siehe Grund“), direkt unter der
B10-Beschriftung.

## Bauauflagen
- **M1** `lauf_ende` = `lauf_beendet` + `frage_ohne_antwort`(Lauf beendet) + beim Lesen offene — Invariante „kein await zwischen Lesen der
  Zählung und `beendeLauf`“ (Kommentar am Controller), Vermittlungs-Test (Lesen, dann `beendeLauf` ⇒ `lauf_ende` gleich). Korrigiert M10
  aus `advisor-b2b3b2b2a2.md:88` (dort: Timer kann dazwischen feuern).
- **M2** geänderte Tests: `result-evaluator.test.ts` 1245/1267/1280/1288 (Typ, 7 Felder), 1293 (umgekehrt); `execution-controller.test.ts`
  1696/1706, 1763/1764; `rueckfrage-vermittlung.test.mjs` 324/332.
- **M3** Projektion: Zählung gilt mit den vier Antwortfeldern; fehlen die drei neuen (Bestandsmarke aus 2a-1/2a-2), stehen sie als `null`
  ⇒ Anzeige „nicht erfasst“. Andere Form ⇒ `zaehlung: null` („nicht lesbar“).
- **M4** eigenes `STILLER_SCHREIBER` im Helfermodul; Kette je Projektion gelesen (wie bisher, kein Umbau).
- **M7** Gate (s): R3-Startfehler über eine `fuehreAufgabeDurchFn`-Attrappe, die `meldeAbweichung` ruft; Terminalmarken in Gate/Render mit
  vorherigem `run_prepared`.
- **M8** Sichtung cacht nur erfolgreiche Antworten mit `laufStatus.status === 'ABGESCHLOSSEN'`.
- **M9** neue Regelzeile beginnt mit `- Wird` (nicht `- [x]`).
- **M11** DEKLARIERT (ARCHITECTURE §4): scheitert `oeffneLauf`, gibt es keine Zählung und keinen Block.
- **M12** im Bericht an Stefan: „Sichtung bestätigt – weiter“ bleibt bei R3 möglich (unverändert, außerhalb Scope).

## Status
- [x] Freigegeben mit Hinweisen (Advisor)

## Nächster sinnvoller Schritt
Bauen; danach code-reviewer, qa, design-guardian.

## Nachtrag Bau (17.10.2026) — Abweichungen vom Plan, gleichwertig
- V2: Chip über Option `schluessel` an `artChip` (Text bleibt im Wörterbuch) statt `{ text }`.
- M8: die Sichtung wartet auf das Lauf-Detail, bevor sie zeichnet (code-reviewer 1: ein Nachladen im Hintergrund änderte das Kennzeichen
  und schloss einen offenen Sichtungs-Dialog); Fehler ⇒ Standardsatz und 30 s Rückzug je Lauf.
- M11 war falsch beschrieben (qa 1): scheitert `oeffneLauf`, entsteht R3 („Speicher fehlt (Lauf nicht offen)“) — R3-Text und ARCHITECTURE §4
  nennen den Fall.
- (w) des Gates pinnt den Hash von `_rueckfrage-aus-pruefung.mjs` (statt Vergleich mit main) und prüft „kein await“ nach dem Lesen der
  Zählung im Controller (M1 als Quelltextprüfung, code-reviewer 4).
- Block: R3-Meldung vor den Zahlen; Auswertung im Block nur für „echt“/„nicht geprüft“ (die übrigen Klassen stehen in der Notiz);
  „bestätigt“ je Ergebnis (ERFOLGREICH Zahl, VERWEIGERT „keine — siehe Grund“, sonst „nicht ausgewertet“).
- Restpunkte F-1135.
