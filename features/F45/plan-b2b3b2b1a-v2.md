# Plan v2 — F45 B2b-3b-2b-1a „Rückfrage-Kanal: Rest-Absicherung, mechanischer Teil“

Stand 16.10.2026. Nach Advisor-Pass `features/F45/advisor-b2b3b2b1.md` (Nicht freigegeben, Zuschnitt anders) und Entscheidung
Stefans (Challenger). Plan v1 (`plan-b2b3b2b1.md`) bleibt unverändert stehen. Kanal bleibt AUS.

## Entscheidungen Stefans (eingearbeitet)
- E1 Schnitt: jetzt **2b-1a** = R2, R3, Schema v1 (`ab` + `herkunft`), je Version nur neue Einträge, E-B7-Herkunft.
  **R1 kommt in 2b-1b** (eigener Bauauftrag): eindeutiger Ablehnungstext je Ablehnung, zählt nur, wenn das CLI-Ergebnis zu dieser
  `tool_use_id` genau diesen Text trägt (`is_error: true`, Beleg `features/F45/nachweise/b2b3a/rohstrom-deny.ndjson:9`);
  Ordnungsregel/Takt entfällt; Gate-Fall r1d rot gegen main. In 2b-1a nichts davon, auch keine Vorstufe.
- E2 F-1128 bleibt offen; Nachtrag: R2, R3, Speichergröße, B7 erledigt; (6) Schreibfehler nur auf der Konsole ist bewusst, weil
  sie über R3 als Abweichung in der Startfehlerliste sichtbar werden.
- Grenzen unverändert: kein Produktaufrufer setzt `rueckfrage`; Argv bitgleich; keine neuen Routen (F-1131); Server netto ≤ 0,
  `check-wachstumsbremse-server` grün, Grenze/Bestand unverändert; `starteWorkflowSchritt(` 6×; package.json nur die Gate-Zeile;
  keine gesperrten Dateien; `kontrollzustand/` nie stagen; nicht selbst committen.

## 1. R2 — Löschlisten-Sperre am Speicherstand (Advisor B7: in Ordnung)
- Vermittlung `beendeLauf(laufId)` gibt die Zahl der `stefan_abgelehnt`-Einträge des Laufs zurück (gezählt vor dem Ablehnen der
  offenen; 0, wenn nicht offen). Bestehende Aufrufer, die den Wert ignorieren, bleiben unverändert.
- Server `leitstand-server.mjs:6871`: `const stefanAbgelehntImLauf = rueckfrageVermittlung.beendeLauf(laufId)`; 6932:
  `fuehreLoeschlisteAus(…, (ergebnis.klassifikation?.abgelehnt_durch_stefan ?? 0) > 0 || stefanAbgelehntImLauf > 0)`.
  ODER bleibt als zweite Sicherung (redundant, netto 0). Jede `stefan_abgelehnt` zählt, auch eine, die die Auswertung später
  verwirft (sichere Richtung).

## 2. R3 — Abweichung in die Startfehlerliste (Advisor B6, B8, B15)
- `AusfuehrungsOptionen.rueckfrageSpeicher` wird ersetzt durch
  `rueckfrageZugang?: { speicher(): unknown; meldeAbweichung(grund: string): void }` (je Lauf gebunden). Kommentar D5 in
  `types.ts` (Ausnahmen: `zeitmessung`, `rueckfrageZugang`) und `VERBOTENE_OPTIONEN_FELDER` (`'rueckfrageSpeicher'` →
  `'rueckfrageZugang'`) synchron.
- Vermittlung: `zugang(laufId, melde)` liefert `{ speicher: () => eintraegeVon(laufId), meldeAbweichung }`. **Der Lauf wird erst
  beim Aufruf nachgeschlagen** (B6: `laufOptionen` entsteht vor `oeffneLauf`, auch für Läufe ohne Kanal) — ohne offenen Lauf
  liefert `speicher()` null. `meldeAbweichung(grund)` ruft
  `melde(\`Rückfrage-Protokoll von Lauf '<id>' nicht bestätigt — Auswertung VERWEIGERT: ${grund}\`)`; ein Wurf von `melde`
  wird gefangen und geloggt.
- Server `6829/6830` (Kommentar + Option ersetzt, netto 0):
  `rueckfrageZugang: rueckfrageVermittlung.zugang(laufId, (fehler) => startfehlerListe.push({ zeitstempel: new Date().toISOString(), laufId, fehler })),`
  — bestehender Weg `startfehlerListe` → `GET /api/startfehler` → Leitstand-Gruppe „startproblem“ (B8).
- Controller `ermittleRueckfrageProtokoll(laufId, basisVerzeichnis, zugang)`: Speicher über `zugang?.speicher()` (Wurf ⇒ null,
  wie heute); bei `ok:false` und nicht `leer` wie heute `console.error` **und** `zugang?.meldeAbweichung(grund)` (Wurf gefangen).
  Gilt für jede Abweichung: Fälschung, Länge, Speicher fehlt, Datei fehlt/lückenhaft (§3). Klassifikationsstelle (Gate b2b3b2a
  (a2) prüft ihren Text) ändert sich nur im Optionsnamen.

## 3. Speichergröße — je Version nur neue Einträge (Advisor B9–B11)
- Schema `schemas/kontrollzustand-rueckfragen-payload.schema.json` **v1** (eine Änderung, zusammen mit E-B7):
  `{ rueckfragen_schema: 'v1', lauf_id, ab, eintraege }`; `ab` ganze Zahl ≥ 0 = Index des ersten Eintrags dieser Version,
  `eintraege` nur die neuen. Ein zusammengesetztes Protokoll hat dieselbe Form mit `ab: 0` (Eingabe des Evaluators). Eintrag
  zusätzlich optional `herkunft` (§4). Kanal war nie an, keine `rueckfragen-*` im Kontrollzustand ⇒ keine Migration (B11).
  Beispiele `schemas/examples/kontrollzustand-rueckfragen-payload.*.json` auf v1; `check-datenformate` muss grün bleiben.
- Validator `validiereRueckfrageProtokoll` (handgeschrieben, synchron zum Schema): `'v1'`, `ab` ganze Zahl ≥ 0.
  `gleicheAblehnungenAb` verlangt zusätzlich `ab === 0` (ein einzelner Zuwachs ist nie ein ganzes Protokoll).
- Vermittlung: `lauf.geschrieben` (Zahl bestätigt geschriebener Einträge). Rückruf
  `protokolliere(laufId, eintrag, { arbeitsordner, ab: lauf.geschrieben, eintraege: lauf.protokoll.slice(lauf.geschrieben) })`;
  ohne Wurf ⇒ `geschrieben = protokoll.length`; mit Wurf bleibt der Stand ⇒ die nächste Entscheidung holt nach (wie heute).
  Nebenwirkung: keine O(N²)-Kopie mehr im Speicher.
- Schreiber `rueckfrage-protokoll.mjs`: Version `{ rueckfragen_schema: 'v1', lauf_id, ab: kontext.ab, eintraege: neue }`,
  Validierung je Version wie heute.
- Leser: reine Funktion `setzeProtokollZusammen(versionen, laufId)` in `src/rueckfrage/protokoll.ts` — Versionen aufsteigend; je
  Version Schema v1 gültig, `lauf_id === laufId`, `ab === bisherige Länge`; Ergebnis `{ ok: true, daten: { v1, lauf_id, ab: 0,
  eintraege: alle } }` oder `{ ok: false, grund }` (z. B. „Version n lückenhaft (ab 3, erwartet 2)“). Keine Version ⇒
  `{ ok: true, daten: null }`. `leseRueckfrageProtokoll` nutzt `listeVersionen` (liest wie heute `ladeArtefaktVersion` alle
  Versionen, B9) und gibt `daten` oder bei `ok:false` null mit `console.error` zurück (Signatur unverändert; der Grund erscheint
  über R3 als „Datei fehlt oder ist kein Protokoll“).
- Bekannte Grenze (B10): wirft der Rückruf, nachdem die Version geschrieben ist, schreibt die nächste Version mit gleichem `ab`
  ⇒ „lückenhaft“ ⇒ VERWEIGERT (sichere Richtung, über R3 sichtbar). Praktisch kaum erreichbar (Server gibt keinen `schreiber`
  mit). In ARCHITECTURE §4 und im Datei-Kopf vermerkt, keine weitere Logik.
- Messung: Skript im Scratchpad (`messe-protokoll.mjs`, echter Schreiber und Leser, 200 von Stefan abgelehnte Bash-Befehle à ~1900
  Zeichen). Vorher (main): 200 Versionen, **42,94 MB**, Lesen 182–249 ms. Nachher im Bericht; Ziel deutlich darunter (Schätzung
  ~0,6 MB), Lesen ≤ 234 ms.

## 4. E-B7 — Herkunft je Antwort (Advisor B12)
- Reine Funktion `herkunftDerAntwort(headers)` (exportiert aus der Vermittlung): `'browser'`, wenn `sec-fetch-site ===
  'same-origin'` oder ein `origin`-Kopf, dessen Host dem `host`-Kopf gleicht; sonst `'nicht_browser'` (auch `none`). Header
  sind fälschbar ⇒ Hinweis, kein Schutz.
- `beantworte(id, antwort, herkunft = 'nicht_browser')` legt `herkunft` in den Protokolleintrag der Antwort (`stefan_erlaubt`,
  `stefan_abgelehnt`, `frage_beantwortet`); Schreiber übernimmt das Feld. Nicht Teil von `eintraegeVon`/Abgleich.
- Server Antwort-Route 8400: `beantworte(antwortWeg[1], body.daten, herkunftDerAntwort(req.headers))`; Import-Zeile 548 erweitert
  (netto 0).
- Schema/Validator: `herkunft` optional, Enum `browser` | `nicht_browser`; nur an den drei Antwort-Arten zulässig (Validator
  meldet `herkunft` an anderer Art).
- ARCHITECTURE §3: ein Satz zu E-B7 (jeder lokale Prozess kann antworten — DEKLARIERT; Herkunft je Antwort im Protokoll,
  Anzeige in 2b-2).

## 5. Gate und Tests
Neues Gate `scripts/check-f45-b2b3b2b1a-rest.mjs` (package.json: eine Zeile in `check:gates`). Neue Exporte je Fall geprüft
(Muster Delta H3), damit jeder Fall gegen main (git archive) seinen eigenen Befund zeigt:
- (r2) Echter Server mit Kanal (Muster b2b3b2a (l1)), Arbeitsordner, `zu_loeschen`-Block: im Lauf Bash-Rückfrage über die
  Token-Route, Ablehnung über die Antwort-Route; Klassifikation der Attrappe ERFOLGREICH **ohne** `abgelehnt_durch_stefan`
  (Ablehnung fehlt in permission_denials) ⇒ `alt.txt` bleibt, `LOESCHLISTE_AUSGESETZT`. Gegenprobe ohne Ablehnung ⇒ gelöscht.
  Rot gegen main: löscht.
- (r3) Echter Server mit Kanal: Attrappe fälscht die Protokoll-Datei und ruft `ermittleRueckfrageProtokoll(laufId, basis,
  optionen.rueckfrageZugang)` ⇒ null und `GET /api/startfehler` enthält „nicht bestätigt“ mit der laufId. Zusätzlich: Zugang vor
  `oeffneLauf` gebaut, danach wirksam (B6, Vermittlung direkt). Rot gegen main: Option fehlt.
- (g) 200 von Stefan abgelehnte lange Bash-Befehle über Vermittlung + echten Schreiber ⇒ Summe der Versionsdateien < 5 MB,
  zusammengesetztes Protokoll = Speicher (`bestaetigeProtokoll` ok) und Abgleich ⇒ ERFOLGREICH. Rot gegen main: ~43 MB.
- (b7) `herkunftDerAntwort`: same-origin ⇒ browser; passender Origin ⇒ browser; ohne Kopf / `none` ⇒ nicht_browser; über den
  echten Server geschriebene Antwort trägt `herkunft` im Protokoll; Schema-Datei kennt das Feld. Rot gegen main.
- (f) Grenzen: `starteWorkflowSchritt(` im Server 6×; kein Produktaufrufer übergibt `rueckfrage:`; ARCHITECTURE §3 nennt E-B7
  (rot gegen main).
Nachziehen (Verhalten/Name geändert, im jeweiligen Kopf ehrlich vermerkt): Gate b2b3b2a ((a2) `rueckfrageZugang` statt
`rueckfrageSpeicher`, Fälschung als neue Zuwachs-Version), Gate b2b3b1b (v1-Payloads), Unit-Tests
`rueckfrage-vermittlung.test.mjs`, `protokoll.test.ts` (Validator v1/`ab`/`herkunft`, `setzeProtokollZusammen`),
`execution-controller.test.ts` (Zugang, `meldeAbweichung`), `result-evaluator.test.ts` (v1).

Prüfkette: Tests rot → grün; betroffene Gates (neues, b2b3b2a, b2b3b1b, b2b3b1, wachstumsbremse-server, f813-csrf,
datenformate, f10) + `npm run lint/typecheck/test`; volle Kette nur bei genug Speicher. Danach code-reviewer + qa, höchstens eine
Korrekturrunde.

## 6. Doku
- ARCHITECTURE §3 (E-B7-Satz), §4 (Protokoll als Zuwachs-Versionen v1, Abweichung ⇒ Startfehlerliste, Grenze B10).
- `state/findings.md` F-1128: Nachtrag (E2).
- Server-Zeilenbilanz im Bericht je Zeile (548, 1999/2000, 6829/6830, 6871, 6932, 8400).

## Nachtrag nach Delta-Advisor (`advisor-b2b3b2b1a-delta.md`, Freigegeben mit Hinweisen), vor dem Bau
- D2: Gate b2b3b1b (p3) liest zusammengesetzt (`leseRueckfrageProtokoll`), Kopf ehrlich umgeschrieben.
- D3: Gate b2b3b2a (a2): Fälschung = angehängte Version mit `ab` = aktuelle Länge und `stefan_abgelehnt` für t3 (nie über den
  Kanal), Ablehnungen [t1, t3]: mit Zugang ⇒ VERWEIGERT („Länge abweichend“); alter Pfad (`setzeProtokollZusammen` ohne Speicher)
  ⇒ ERFOLGREICH. `echtArten` zusammengesetzt. „art weicht ab“ bleibt in (a1).
- D4: `scripts/leitstand/rueckfrage-protokoll.test.mjs` in die Nachziehliste.
- D5: `leseRueckfrageProtokoll` gibt bei `ok:false` die Markierung `{ ungueltig: grund }` zurück (nicht null);
  `bestaetigeProtokoll` meldet sie mit Grund auch bei leerem Speicher. Evaluator bekommt sie nie (nur bestätigte Daten gehen weiter).
- D6: Meldetext „Rückfrage-Protokoll von Lauf '<id>' nicht bestätigt — Ablehnungen durch Stefan zählen nicht: <grund>“.
- D7: F-1128-Nachtrag: Schreibfehler vor der Auswertung über R3 sichtbar, danach (Lauf-Ende) nur Konsole.
- D9/D10: `zugang` wirft nie (Test); `herkunftDerAntwort` mit try/catch, kein `.method`.
- D11: Beispiele prüft b2b3b1b (p2); „herkunft nur an Antwort-Arten“ nur im Validator, Satz in der Schema-`description`.
- D12: veraltende Köpfe/Kommentare mitziehen. D13: Grenze „gleiche laufId neu geöffnet“ mit B10 in §4. D15: `npm run check`
  lokal oder CI als Nachweis im Bericht.
