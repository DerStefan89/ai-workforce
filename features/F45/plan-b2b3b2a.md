# Plan v1 — F45 B2b-3b-2a „Rückfrage-Kanal: Absicherung vor dem Einschalten“

Stand 16.10.2026. Branch `f45/b2b3b2a-absicherung` (Basis main nach W1, c7d5934). Kanal bleibt AUS; Einschalten, Anzeige,
echter Lauf: B2b-3b-2b. Pflichtpunkte: state/findings.md F-1128 (1)(2)(5), F-1126 (2)(3).

## CONTEXT
- Vermittlung `scripts/leitstand/rueckfrage-vermittlung.mjs` führt je Lauf `lauf.protokoll` (alle Einträge, Speicher) und
  ruft je Entscheidung den Schreiber (`rueckfrage-protokoll.mjs`) mit der ganzen Liste → Kern-Artefakt `rueckfragen-<laufId>`.
- Controller `src/execution-controller/index.ts:568` liest bei `eingaben.rueckfrageKanal` nur die DATEI
  (`leseRueckfrageProtokoll`) und reicht sie als `eingaben.rueckfragen` an `klassifiziereLauf`; Abgleich A6
  `gleicheAblehnungenAb` (`src/rueckfrage/protokoll.ts`) glaubt der Datei.
- Reihenfolge im Server (`starteLaufUndVergiss`, leitstand-server.mjs ~6866): `fuehreAufgabeDurchFn(...)` (darin
  Klassifikation) → erst danach `rueckfrageVermittlung.beendeLauf(laufId)`. Zur Klassifikation ist der Lauf in der
  Vermittlung also noch offen; Speicher und Controller im selben Prozess.
- Löschliste: leitstand-server.mjs ~6926–6938, läuft bei `laufErfolgreich` — auch bei ERFOLGREICH durch Stefan-Ablehnung.
- Routen: leitstand-server.mjs ~8349–8406 (zwei Blöcke), `leseJsonBegrenzt`/`RUECKFRAGE_BODY_MAX_BYTES` ~5798–5830, nur
  von diesen Routen benutzt (RUECKFRAGE_BODY_MAX_BYTES importiert zusätzlich `scripts/check-f45-b2b3b1-rueckfrage.mjs:53`).
- Wachstumsbremse: Grenze 13455 = Ist; Bestand enthält 2× gleich, 2× beginnt, 2× muster des Rückfrage-Kanals.

## 1. F-1128 (1): Speicher ist Quelle der Wahrheit
- Vermittlung: neue Methode `eintraegeVon(laufId)` → Kopie von `lauf.protokoll` (offener Lauf) oder `null`.
- `src/rueckfrage/protokoll.ts`: neue reine Funktion `bestaetigeProtokoll(datei, speicher)` → `datei`, wenn `speicher` ein
  Array ist und `datei.eintraege` gleich lang ist und je Index `tool_use_id`, `tool_name`, `input_hash`, `art` strikt gleich
  (`===`) sind; sonst `null`. Ein Werkzeugname > 200 Zeichen steht in der Datei als `<zu lang>` ⇒ Abweichung ⇒ null (fail
  closed; ein solches Werkzeug ist ohnehin auto_deny ⇒ VERWEIGERT). `speicher === null/undefined` ⇒ null.
- Controller: neue Option `AusfuehrungsOptionen.rueckfrageSpeicher?: (laufId) => readonly unknown[] | null`. Bei Kanal:
  `rueckfragen = bestaetigeProtokoll(leseRueckfrageProtokoll(...), optionen.rueckfrageSpeicher?.(laufId) ?? null)` (Wurf des
  Rückrufs ⇒ null). Evaluator unverändert (null ⇒ wie fehlend ⇒ VERWEIGERT). Neustart: neue Vermittlung, Lauf nicht offen ⇒
  null ⇒ VERWEIGERT. Datei bleibt Audit.
- Server: `laufOptionen` + `rueckfrageSpeicher: (id) => rueckfrageVermittlung.eintraegeVon(id)`; `VERBOTENE_OPTIONEN_FELDER`
  + `'rueckfrageSpeicher'` (Pflicht laut types.ts-Kommentar, Gate f10 AK3).
- Beide Reads synchron direkt nacheinander ⇒ keine Zwischenentscheidung zwischen Speicher- und Dateistand.
- ARCHITECTURE §4 Satz anpassen: Quelle = Speicher der Vermittlung, Datei = Audit; DEKLARIERT bleibt wegen der Antwort-Route.

## 2. F-1128 (2): Löschliste aussetzen
- `src/arbeitsordner/loeschliste.ts`: `fuehreLoeschlisteAus(arbeitsordner, ergebnistext, stefanAbgelehnt)` = bisherige
  Server-Zeilen (leseLoeschliste → ok: loescheDateien / ungueltig: Block-Ablehnung / keine: undefined) plus: bei
  `stefanAbgelehnt` und `ok` ⇒ nichts löschen, `{ geloescht: [], abgelehnt: pfade.map(p => ({ pfad: String(p), grund: HINWEIS }))
  }` — „nur als Hinweis“ in der Änderungsübersicht, kein Schemawechsel.
- Server: `stefanAbgelehnt = (ergebnis.klassifikation?.abgelehnt_durch_stefan ?? 0) > 0`; Import `leseLoeschliste, loescheDateien`
  → `fuehreLoeschlisteAus` (beide sonst nicht benutzt — beim Bau prüfen).

## 3. Obergrenzen je Lauf (F-1128 (5), F-1126 (2))
- `MAX_OFFENE_JE_LAUF = 20`, `MAX_PROTOKOLL_JE_LAUF = 200` (exportiert).
- In `stelle` nach der Formprüfung (400 bleibt ohne Eintrag): `protokoll.length + offen ≥ 200` ⇒ deny/KEINE_ANTWORT OHNE
  Protokolleintrag, Grund „Obergrenze der Protokolleinträge je Lauf erreicht (200)“ (einmal console.error je Lauf). Jeder offene
  Eintrag hat damit einen reservierten Platz für seine Entscheidung (Antwort, Zeitgrenze, Lauf-Ende) — Invariante
  `protokoll.length + offen ≤ 200`. Ohne Eintrag ⇒ Abgleich VERWEIGERT (sichere Richtung).
- Danach Doppel-ID, Vorentscheidung; vor dem Einreihen: `offen ≥ 20` ⇒ auto_deny (bzw. frage_ohne_antwort) MIT Eintrag, Grund
  „zu viele offene Rückfragen je Lauf (20)“.

## 4. F-1126 (3): Steuer-/Formatzeichen ⇒ auto_deny
- `vorentscheidung`, Bash-Zweig nach „Befehl fehlt“: `command` ohne `\t`/`\n` gegen `/[\p{Cc}\p{Cf}\p{Cs}\p{Zl}\p{Zp}]/u` ⇒
  auto_deny „Befehl mit Steuer- oder Formatzeichen (\r, ANSI, Bidi …) wird nicht vorgelegt“. Deckt `\r`, ESC/CSI (ANSI), C1,
  U+202A–E, U+2066–9, U+200B–F, U+061C, U+FEFF, U+00AD, einzelne Surrogate, U+2028/9.

## 5. Routen nach `scripts/leitstand/routen-rueckfrage.mjs`
- `export async function behandleRueckfrageRoute(req, res, pfad, { vermittlung, sendeJson })` → true, wenn behandelt. Inhalt
  wörtlich aus dem Server; `RUECKFRAGE_BODY_MAX_BYTES` und `leseJsonBegrenzt` ziehen mit (Gate b2b3b1 importiert die Konstante
  dann aus dem Modul). Server an alter Stelle: Kommentar + `if (await behandleRueckfrageRoute(req, res, pfad, { vermittlung:
  rueckfrageVermittlung, sendeJson })) return`. sendeJson wird übergeben (bitgleiche Antworten).
- `scripts/wachstumsbremse-server.json`: 6 Rückfrage-Einträge raus, Grenze auf das neue Ist (senken).
- Netto der übrigen Server-Änderungen: (1) +2, (2) −3 (zwei Zeilen Logik → eine, zwei Importzeilen → eine) ⇒ −1 ≤ 0.

## 6. Tests und Gate
- node:test: vermittlung.test (eintraegeVon, 20/200, Reservierung), rueckfrage.test.ts (Zeichen), protokoll.test.ts
  (bestaetigeProtokoll), arbeitsordner.test.ts (fuehreLoeschlisteAus), execution-controller.test.ts (bestehender Fall braucht nun
  rueckfrageSpeicher; neu: Speicher fehlt / weicht ab ⇒ VERWEIGERT), routen-rueckfrage.test.mjs (404/403-Pfade).
- Neues Gate `scripts/check-f45-b2b3b2a-absicherung.mjs` (+1 Gate-Zeile package.json), Module dynamisch geladen (je Fall rot gegen
  main):
  (a1) rein: gefälschte Datei (stefan_abgelehnt für auto_deny-ID im Speicher), Speicher null, Länge abweichend ⇒ VERWEIGERT;
       gleich ⇒ ERFOLGREICH.
  (a2) echter Server, Kanal an, Attrappe: Stefan lehnt t1 über die Antwort-Route ab ⇒ über Controller-Lesepfad ERFOLGREICH; auto_deny
       t2, dann gefälschte Dateiversion mit t2 stefan_abgelehnt ⇒ VERWEIGERT; ohne rueckfrageSpeicher (Neustart) ⇒ VERWEIGERT.
  (l1) echter Server, Arbeitsordner, Attrappe mit zu_loeschen und abgelehnt_durch_stefan 1 ⇒ Datei bleibt, loeschliste nur Hinweis.
  (o1) 21. offene Rückfrage ⇒ auto_deny mit Grund; 201. Eintrag ⇒ deny ohne Eintrag, Protokoll bleibt 200.
  (z1) \r, ESC[, U+202E, U+0007, U+200B, U+2028 ⇒ auto_deny; \n, \t ⇒ frage_stefan.
  (w1) kein `/api/rueckfrage`-Literal im Server, Modul exportiert Handler; Bremse: Grenze < main, keine Rückfrage-Einträge.
  (f)  starteWorkflowSchritt( 6×; kein Produktaufrufer setzt `rueckfrage:` (Kanal aus); Argv bitgleich deckt Gate b2b3b1.

## Offene Punkte, nicht stillschweigend entschieden
- O1: Antwort-Route bleibt für jeden lokalen Prozess erreichbar — ein vom Worker gestartetes Skript kann eine eigene offene
  Bash-Rückfrage als „Stefan“ ablehnen (Speicher sagt dann stefan_abgelehnt). Nicht Teil des Auftrags; als DEKLARIERT stehen
  lassen und in F-1128 benennen — oder vor 3b-2b schließen?
- O2: Konsistenzprüfung im Controller (Evaluator unverändert) statt im Evaluator. Nebenwirkung: Gate b2b3b1b e1/p3 (direkt
  `klassifiziereLauf` mit Datei) bleiben grün und prüfen nur noch den Evaluator.
- O3: Vergleich der vier Felder je Index (nicht `befehl`/`grund`/`zeit`, die in der Datei neutralisiert/maskiert/gekappt sind).
- O4: Löschliste „als Hinweis“ über `abgelehnt[]` mit Grund statt eigenem Feld (kein Schemawechsel).
- O5: 200er-Grenze ohne Protokolleintrag (sonst wächst das Protokoll weiter) — Audit verliert die überzähligen Anfragen.
- O6: `\n` und `\t` bleiben erlaubt (mehrzeilige Befehle, Heredocs).
- O7: Frage-Texte (`frage_stefan`) werden nicht auf Steuerzeichen geprüft (Auftrag nennt Befehle; eine Antwort gibt kein Recht).
