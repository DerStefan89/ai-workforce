# Plan v1 — F45 B2b-3b-2b-1 „Rückfrage-Kanal: Rest-Absicherung“

Stand 16.10.2026. Branch `f45/b2b3b2b1-rest-absicherung` (Basis main nach #354). Kanal bleibt AUS. Quelle: Auftrag
(Challenger) mit F-1128 R1–R3, Speichergröße, E-B7 = A (Stefan, 16.10.2026).

Grenzen: kein Produktaufrufer setzt `rueckfrage`; Argv bitgleich; keine neuen Routen (F-1131); `scripts/leitstand-server.mjs`
netto ≤ 0 Zeilen, `check-wachstumsbremse-server` grün, Grenze/Bestand unverändert; `starteWorkflowSchritt(` 6×; keine
gesperrten Dateien; package.json nur Gate-Zeile(n); `kontrollzustand/` nie stagen.

## 0. Ist-Stand (belegt)
- Vermittlung `scripts/leitstand/rueckfrage-vermittlung.mjs`: `stelle` (Token-Route) nimmt jede `tool_use_id` an, die im Lauf
  noch nicht bekannt ist; `beantworte` (Antwort-Route, ohne Token) erzeugt `stefan_abgelehnt`. `eintraegeVon` = Projektion
  `{tool_use_id, tool_name, input_hash, art}`. Rückruf `protokolliere(laufId, eintrag, { arbeitsordner, eintraege })` bekommt
  jedes Mal die volle Liste.
- Schreiber `scripts/leitstand/rueckfrage-protokoll.mjs`: je Entscheidung eine Version von `rueckfragen-<laufId>` mit ALLEN
  Einträgen ⇒ O(N²) Bytes (gemessen 43 MB bei 200 langen Bash-Ablehnungen, Lesen 234 ms).
- Controller `ermittleRueckfrageProtokoll` (`src/execution-controller/index.ts:292`) liest Speicher, dann
  `ladeArtefaktVersion` (liest intern über `listeVersionen` → `ladeGueltigeCheckpoints` ohnehin ALLE Versionen, prüft die Kette),
  `bestaetigeProtokoll`; Abweichung nur `console.error`.
- Server: `beendeLauf` am Anfang von `.then` (`leitstand-server.mjs:6871`); Löschliste danach mit
  `abgelehnt_durch_stefan > 0` aus der Klassifikation (6932). Gateway (`src/claude-code-gateway/index.ts`) meldet live nur
  tool_use-Zeilen (`beiWerkzeugaufruf`), keine tool_result-Zeilen.

## 1. R1 — Stefan-Ablehnung zählt nur, wenn vor der Entscheidung der CLI gestellt
Idee: Im echten Ablauf wartet die CLI auf die Antwort; ihr `tool_result` für diese ID erscheint im Strom **erst nach** der
Entscheidung in der Vermittlung. Beim „Waschen“ einer statischen Ablehnung (Sperrregel ohne Kanal) steht das `tool_result`
schon im Strom, bevor jemand mit dem Token die ID stellt. Nach Prozessende kommt kein `tool_result` mehr.

- Gateway: neue Option `beiWerkzeugergebnis?: (toolUseId: string) => void`, je `tool_result`-Block einer Strom-Zeile live
  gerufen (vorhandener Leser `leseToolResultBloecke`), in `beiStreamZeile` neben `meldeAufrufe` eingehängt; Wurf gefangen und
  geloggt (Muster `meldeWerkzeugaufrufe`). Fehlt die Option ⇒ unverändert (Argv unberührt).
- Controller: reicht `optionen.rueckfrageZugang?.ergebnisGesehen` als `beiWerkzeugergebnis` an `starteGateway` — **nur bei
  `eingaben.rueckfrageKanal !== undefined`**.
- Vermittlung: je Lauf ein logischer Takt (`lauf.takt`, Zähler statt Uhr: keine Gleichstände). `stelle` merkt
  `gestelltTakt`, `entscheide` merkt `entschiedenTakt` am Protokolleintrag (intern, nicht in der Datei);
  `ergebnisGesehen(laufId, id)` merkt je ID den Takt des ersten gesehenen `tool_result` (`lauf.ergebnisse: Map`).
  Projektion (`eintraegeVon`) bekommt ein fünftes Feld `zaehlt` (nur bei `stefan_abgelehnt` sinnvoll):
  `zaehlt = ergebnisse.has(id) && ergebnisse.get(id) > entschiedenTakt` (⇒ auch gestellt vor dem Ergebnis, da gestellt <
  entschieden).
- `bestaetigeProtokoll`: Speicher-Eintrag `art === 'stefan_abgelehnt'` mit `zaehlt !== true` ⇒
  `{ ok:false, grund: 'Eintrag i: Ablehnung durch Stefan nicht vor der Entscheidung der CLI gestellt' }` ⇒ ganzes Protokoll
  null ⇒ VERWEIGERT (fail closed), Grund geht über R3 in die Startfehlerliste.
- Rest (DEKLARIERT, ARCHITECTURE §4): ein Prozess, der die ID aus dem Transkript liest und Anfrage **und** Antwort (B7) schneller
  stellt, als der Server die stdout-Zeile der CLI verarbeitet, gewinnt das Rennen (Millisekunden, zwei HTTP-Rundläufe gegen einen
  Pipe-Chunk). Annahme für den echten Lauf (zu F-1128 (4)): die CLI schreibt für eine über das Prompt-Tool abgelehnte ID ein
  `tool_result`; fehlt es, zählt die Ablehnung nicht (sicher, aber wirkungslos) — in 2b-2 im echten Lauf belegen.

## 2. R2 — Löschlisten-Sperre am Speicherstand
- `beendeLauf(laufId)` gibt die Zahl der `stefan_abgelehnt`-Einträge des Laufs zurück (0, wenn nicht offen).
- Server 6871: `const stefanAbgelehntImLauf = rueckfrageVermittlung.beendeLauf(laufId)`; 6932: Flag
  `(ergebnis.klassifikation?.abgelehnt_durch_stefan ?? 0) > 0 || stefanAbgelehntImLauf > 0` (ODER: Klassifikation bleibt als
  zweite Sicherung; netto 0 Zeilen).

## 3. R3 — Abweichung in die Startfehlerliste
- `AusfuehrungsOptionen.rueckfrageSpeicher` wird ersetzt durch `rueckfrageZugang?: { speicher(): unknown;
  ergebnisGesehen(toolUseId: string): void; meldeAbweichung(grund: string): void }` (je Lauf gebunden).
- Vermittlung: `zugang(laufId, melde)` liefert dieses Objekt; `meldeAbweichung` loggt und ruft
  `melde(\`Rückfrage-Protokoll nicht bestätigt — Auswertung VERWEIGERT: ${grund}\`)`.
- Server (eine Zeile ersetzt eine): `rueckfrageZugang: rueckfrageVermittlung.zugang(laufId, (fehler) => startfehlerListe.push({
  zeitstempel: new Date().toISOString(), laufId, fehler })),` — bestehender Weg `GET /api/startfehler` / Leitstand.
  `VERBOTENE_OPTIONEN_FELDER`: `'rueckfrageSpeicher'` → `'rueckfrageZugang'`.
- Controller `ermittleRueckfrageProtokoll(laufId, basis, zugang)`: bei `ok:false` und nicht `leer` zusätzlich
  `zugang.meldeAbweichung(grund)` (Wurf gefangen). Auch „Speicher fehlt“ und „Datei lückenhaft“ (§4) laufen so.

## 4. Speichergröße — je Version nur der Zuwachs
- Schema `kontrollzustand-rueckfragen-payload` **v1**: `{ rueckfragen_schema: 'v1', lauf_id, ab, eintraege }`, `ab` = Index des
  ersten Eintrags dieser Version (ganze Zahl ≥ 0); `eintraege` = nur neue Einträge. Ein zusammengesetztes Protokoll ist dieselbe
  Form mit `ab: 0` (Eingabe des Evaluators, `gleicheAblehnungenAb` verlangt zusätzlich `ab === 0`). Kanal war nie an ⇒ es
  gibt keine v0-Dateien im Betrieb; Beispiele unter `schemas/examples/` und Tests auf v1.
- Vermittlung: `lauf.geschrieben` (Zahl bestätigt geschriebener Einträge); Rückruf bekommt
  `{ arbeitsordner, ab: lauf.geschrieben, eintraege: lauf.protokoll.slice(lauf.geschrieben) }`; kehrt er ohne Wurf zurück ⇒
  `geschrieben = protokoll.length`. Ein Wurf ⇒ Nachholen mit der nächsten Entscheidung (wie heute).
- Leser: `leseRueckfrageProtokoll` nimmt `listeVersionen` und setzt zusammen — reine Funktion `setzeProtokollZusammen(versionen)`
  in `src/rueckfrage/protokoll.ts`: je Version gültig (v1), gleiche `lauf_id`, `ab === bisherige Länge` (sonst null mit Grund
  „Datei lückenhaft“). Kosten O(N) Bytes; Kettenprüfung wie heute.
- Messung (Skript im Scratchpad, gleiches Szenario wie 16.10.: 200 von Stefan abgelehnte Bash-Befehle à ~1900 Zeichen, echter
  Schreiber, echter Leser): vorher (main per git archive) / nachher, Bytes im Kontrollzustand und Lesezeit. Ziel: deutlich
  unter 43 MB, Lesen ≤ 234 ms.

## 5. E-B7 — Herkunft je Antwort
- Reine Funktion `herkunftDerAntwort(headers)` in der Vermittlung: `'browser'`, wenn `sec-fetch-site === 'same-origin'` oder ein
  Origin-Kopf mit Host = Host-Kopf vorliegt (die CSRF-Haken haben fremde schon abgewiesen), sonst `'nicht_browser'`.
- Server Antwort-Route 8400: `beantworte(antwortWeg[1], body.daten, herkunftDerAntwort(req.headers))` (Import-Zeile 548
  erweitert, netto 0).
- Protokoll-Eintrag + Schema + Validator: optionales Feld `herkunft` (`browser` | `nicht_browser`), nur an Antworten
  (`stefan_erlaubt`, `stefan_abgelehnt`, `frage_beantwortet`). Nicht Teil des Abgleichs. Anzeige in 2b-2.
- ARCHITECTURE §3: ein Satz zu E-B7 (DEKLARIERT bleibt; Herkunft wird je Antwort protokolliert, Header fälschbar ⇒ Hinweis,
  kein Schutz).

## 6. Gate und Tests
Neues Gate `scripts/check-f45-b2b3b2b1-rest.mjs` (package.json: eine Zeile in `check:gates`), Rot gegen main per git archive je
Fall:
- (r1a) Waschen: tool_result für t9 gesehen, danach Token-Anfrage t9 + Ablehnung über die Antwort-Route ⇒ VERWEIGERT, Grund in
  der Startfehlerliste. Gegenprobe (r1b): Anfrage t1 → Ablehnung → tool_result ⇒ ERFOLGREICH. (r1c) nach Prozessende (kein
  tool_result mehr) gestellte und abgelehnte ID ⇒ VERWEIGERT. Echter Server mit Kanal (Muster Gate b2b3b2a (a2)), Attrappe ruft
  `ergebnisGesehen` über `optionen.rueckfrageZugang` und `ermittleRueckfrageProtokoll`.
- (r2) Lauf ERFOLGREICH ohne `abgelehnt_durch_stefan` (Ablehnung fehlt in permission_denials), Speicher hat `stefan_abgelehnt`
  ⇒ `alt.txt` bleibt, `LOESCHLISTE_AUSGESETZT`; Gegenprobe ohne Ablehnung ⇒ gelöscht.
- (r3) gefälschte Datei ⇒ Eintrag in `GET /api/startfehler` mit „nicht bestätigt“.
- (g) Größe: 200 Einträge über die Vermittlung mit echtem Schreiber ⇒ Summe der Versionsdateien < 5 MB; zusammengesetzt = Speicher.
- (b7) Antwort mit `sec-fetch-site: same-origin` ⇒ `herkunft: browser`; ohne Kopf ⇒ `nicht_browser`; Schema kennt das Feld.
- (f) Grenzen: Server `starteWorkflowSchritt(` 6×; kein Produktaufrufer übergibt `rueckfrage:`; ARCHITECTURE §3 nennt E-B7.
Bestehende Gates/Tests mit geändertem Verhalten nachziehen (ehrlich im Kopf vermerkt): b2b3b2a (a2) (Option umbenannt, t1 braucht
ein `tool_result` nach der Antwort), b2b3b1b (v1-Payload), Unit-Tests Vermittlung/Protokoll/Controller/Evaluator/Gateway.

## 7. Doku
- ARCHITECTURE §3 (E-B7), §4 (R1-Regel, Rest DEKLARIERT, Zuwachs-Protokoll).
- `state/findings.md` F-1128: R1–R3, Speichergröße, B7 erledigt (Nachtrag).

## Offener Punkt, nicht stillschweigend entschieden
- O1 R1-Signal: tool_result-Zeitpunkt im Strom (Gateway-Erweiterung) — gibt es ein einfacheres, gleich starkes Signal ohne
  Gateway-Änderung? Reicht stattdessen ein „Annahme schließen beim Lesen der Auswertung“? (Ich halte das allein für zu schwach:
  das Waschen passiert während des Laufs.)
- O2 Ganze Ablehnung des Protokolls bei einem nicht zählenden `stefan_abgelehnt` (statt nur diesen Eintrag zu ignorieren).
- O3 Schema-Bump v0 → v1 statt optionalem `ab` in v0.
- O4 `rueckfrageZugang` als Objekt-Option (ersetzt `rueckfrageSpeicher`) — wegen netto ≤ 0 Serverzeilen; Alternative: drei
  einzelne Optionen (+3–4 Zeilen, Ausgleich durch Kommentarkürzung).
- O5 R2 als ODER mit der Klassifikation statt nur Speicher.
- O6 Herkunftsregel: Origin passend = Host-Kopf; `sec-fetch-site: none` (Adressleiste) gilt als nicht_browser.
