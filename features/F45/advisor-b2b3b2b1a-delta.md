# Delta-Advisor-Pass: Plan v2 F45 B2b-3b-2b-1a

Geprüft: `features/F45/plan-b2b3b2b1a-v2.md` (16.10.2026) gegen v1 + `advisor-b2b3b2b1.md`. Subagent `architecture-advisor`,
frischer Kontext, nur Read/Grep/Glob (kein Gate-/Testlauf, keine Messung, kein Rot-Nachweis, keine Zeilenzählung — „rot gegen
main“ aus dem Code abgeleitet). Entscheidungen Stefans E1/E2 gesetzt. Inhalt sinngemäß vollständig übernommen.

Marker: [Fakt] · [Fakt, entlastend] · [Schlussfolgerung] · [Annahme] · [offene Unsicherheit].

## Befunde
- **D1 (entlastend)** B6–B15 korrekt eingearbeitet: späte Bindung über `eintraegeVon` (`rueckfrage-vermittlung.mjs:338-340`), 6871
  und 6932 in derselben `.then`-Closure, Startfehlerweg 6405 → 8464 → `attention-daten.js:255-265`, `listeVersionen` liest alle
  Versionen, keine `rueckfragen-*` im Kontrollzustand, Herkunftsregel deckt sich mit 2958-2972, sechs Serverstellen reine
  Ersetzungen, `check-f10-leitstand.mjs:161` iteriert dynamisch. Gateway-Teil aus 2b-1a entfernt, Argv unberührt.
- **D2 (mitlaufend)** Gate b2b3b1b (p3) liest nur die letzte Version (`check-f45-b2b3b1b-auswertung.mjs:335, 341, 357`) — unter
  Zuwachs-Versionen bricht die Bedeutung; (p3) muss zusammengesetzt lesen, Kopf (Z.21-25) ehrlich umschreiben.
- **D3 (mitlaufend, größtes Korrekturrisiko)** Gate b2b3b2a (a2) (`:325-332, 345`): Fälschung `{...echt}` und Gegenprobe
  „alter Pfad ⇒ ERFOLGREICH“ lassen sich nicht 1:1 übertragen (gleiches `ab` ⇒ lückenhaft; `ab: 2` mit t2 ⇒ doppelte ID).
  Empfehlung: angehängte Version mit `ab` = aktuelle Länge und `stefan_abgelehnt` für eine nie über den Kanal gelaufene ID t3,
  Ablehnungen [t1, t3]: mit Speicher „Länge abweichend“ ⇒ VERWEIGERT; alter Pfad (`setzeProtokollZusammen` ohne Speicher) ⇒
  ERFOLGREICH. „art weicht ab“ bleibt in (a1); `echtArten` zusammengesetzt.
- **D4 (mitlaufend)** `scripts/leitstand/rueckfrage-protokoll.test.mjs:34, 43-53, 81` fehlt in der Nachziehliste.
- **D5 (mitlaufend, sichere Richtung)** `leseRueckfrageProtokoll` ⇒ null bei lückenhaft ⇒ bei leerem Speicher `leer` ohne
  Meldung (Rückschritt zu Delta D2, `protokoll.ts:219-220`), Grund geht verloren. Vorschlag: nicht-null Markierung zurückgeben.
- **D6 (mitlaufend)** Meldetext „Auswertung VERWEIGERT“ nicht immer wahr (ohne permission_denials ERFOLGREICH,
  `result-evaluator/index.ts:359-361`) — Text: „Ablehnungen durch Stefan zählen nicht (wie ohne Protokoll)“.
- **D7 (mitlaufend)** Schreibfehler der `lauf_beendet`-Einträge (nach der Auswertung, 6871 / `vermittlung:326-328`) erscheinen
  nie über R3 — F-1128-Nachtrag: „Schreibfehler vor der Auswertung über R3 sichtbar; danach nur Konsole“.
- **D8 (Hinweis)** Straffe Ratsche (`check-wachstumsbremse-server.mjs:120`): „grün und Grenze unverändert“ heißt Bilanz genau 0.
- **D9 (Hinweis)** `zugang(...)` wird für jeden Lauf beim Bau von `laufOptionen` gerufen — darf nie werfen; Unit-Test
  `zugang('unbekannt', melde)` ⇒ `speicher()` null.
- **D10 (mitlaufend)** `herkunftDerAntwort`: `new URL` in try/catch ⇒ `nicht_browser`; eigener Vergleich in der Vermittlung richtig
  (f813 (4) verbietet Aufruf von `istFremdeBrowserAnfrage` aus `scripts/leitstand/`), kein `.method`.
- **D11 (mitlaufend)** Rückfrage-Beispiele prüft `check-f45-b2b3b1b-auswertung.mjs:190-197` (p2), nicht `check-datenformate`.
  [offene Unsicherheit] „herkunft nur an Antwort-Arten“ im Schema oder nur im Validator — festlegen.
- **D12 (mitlaufend)** Veraltende Köpfe/Kommentare: `rueckfrage-vermittlung.mjs:10-14, 22-28, 69-70`, `protokoll.ts:4-6`,
  `rueckfrage-protokoll.mjs:4-8`, Schema-`description`, `execution-controller/index.ts:115-119, 282-289`, `types.ts:82-87`.
- **D13 (entlastend + Grenze)** Zusammensetzen fail closed (verworfene Mitte ⇒ lückenhaft; angehängte Version ⇒ Länge; erste
  Version `ab ≠ 0` ⇒ lückenhaft). Grenze zu B10: `oeffneLauf` derselben laufId setzt `geschrieben` 0 ⇒ lückenhaft ⇒ VERWEIGERT;
  im Server nicht erreichbar (`laufIdBelegt` 6701-6703). [offene Unsicherheit, 2b-2] Anzeige von `herkunft` aus der Vermittlung,
  nicht aus der Datei.
- **D14 (entlastend)** Rot gegen main je Fall aus dem Code abgeleitet (r2, r3, g, b7, f §3); (g): Bytes vor der Exportprüfung
  messen.
- **D15 (mitlaufend)** DoD verlangt `npm run check` Exit 0 — lokal oder CI-Lauf ausdrücklich als Nachweis vor dem Merge.
- **D16 (entlastend)** Zuschnitt realistisch, wenn D2–D4 vor dem Bau im Plan stehen. **Nicht erneut anders schneiden.**

## Urteil
**Freigegeben mit Hinweisen.** D2, D3, D4 vor dem Bau als Nachtrag in den Plan (ohne neuen Pass); D5, D6 günstige Verbesserungen;
D7–D12, D15 mitlaufend.
