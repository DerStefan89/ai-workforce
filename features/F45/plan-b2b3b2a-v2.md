# Plan v2 — F45 B2b-3b-2a-1 „Rückfrage-Kanal: Absicherung vor dem Einschalten“

Stand 16.10.2026. Nach Advisor-Pass `features/F45/advisor-b2b3b2a.md` (Nicht freigegeben, Zuschnitt anders) und Entscheidung
Stefans (Challenger): nur **2a-1**. Plan v1 (`plan-b2b3b2a.md`) bleibt unverändert stehen. Kanal bleibt AUS.

## Entscheidungen Stefans (eingearbeitet)
- E1 Schnitt: nur §1–§4 + findings + eigenes Gate. **Kein Routen-Umzug** — weder hier noch später in B2b; er geht nach W2.
  Gate `check-f813-csrf` bleibt unverändert.
- E2 Neues Finding **F-1131** (HARNESS_IMPROVEMENT, P2): W1-Regel „neue Routen nur in `scripts/leitstand/routen-*.mjs`“
  (ARCHITECTURE §1) kollidiert mit `check-f813-csrf` (4) (kein `.method` in `scripts/leitstand/*.mjs`) — Muster für
  Routen-Module mit Methodenweiche und CSRF-Haken in W2 festlegen; bis dahin keine neuen Routen. ARCHITECTURE §1 bei der W1-Regel:
  ein Satz mit Verweis auf F-1131.
- E3 Wachstumsbremse: Grenze und Bestand bleiben (13455, Bestand unverändert). Server-Bilanz je Zeile belegen (unten); > 0 ⇒
  im selben berührten Abschnitt ausgleichen.
- E4 B2–B5 übernommen. E5 B7 nur in F-1128 vermerken („vor dem Einschalten in 3b-2b Entscheidung Stefan“).

## 1. F-1128 (1): Speicher der Vermittlung ist Quelle der Wahrheit
- Vermittlung (`scripts/leitstand/rueckfrage-vermittlung.mjs`): `eintraegeVon(laufId)` → für einen offenen Lauf neue Objekte
  nur mit `{ tool_use_id, tool_name, input_hash, art }` je Eintrag von `lauf.protokoll` (B10: kein Rohtext, keine geteilten
  Referenzen); sonst `null` (nicht geöffnet, nach `beendeLauf`).
- `src/rueckfrage/protokoll.ts`: reine Funktion `bestaetigeProtokoll(datei, speicher)` →
  `{ ok: true, daten: datei }` nur wenn `speicher` Array, `datei` Objekt mit Array `eintraege`, gleiche Länge, je Index die vier
  Felder strikt gleich (`===`); sonst `{ ok: false, grund }` (Gründe: Speicher fehlt / Datei fehlt / Länge abweichend (n vs m) /
  Eintrag i weicht ab (Feld)). Schema-/lauf_id-Prüfung bleibt im Abgleich A6 (`gleicheAblehnungenAb`).
- Controller (`src/execution-controller/index.ts`): exportierte Funktion
  `ermittleRueckfrageProtokoll(laufId, basisVerzeichnis, speicherLeser)` (B3): ruft `speicherLeser?.(laufId)` in try/catch (Wurf
  ⇒ null), liest `leseRueckfrageProtokoll(...)` direkt danach (synchron, E2), `bestaetigeProtokoll`; bei `ok:false` und mindestens
  einer vorhandenen Seite `console.error` mit Grund (B9) und Rückgabe `null`. Zeile 568 ruft genau diese Funktion mit
  `optionen.rueckfrageSpeicher`. Evaluator unverändert (null ⇒ wie fehlend ⇒ VERWEIGERT).
- `AusfuehrungsOptionen.rueckfrageSpeicher?: (laufId: string) => unknown` (types.ts); Kommentar D5 (types.ts:56) ehrlich
  nachziehen: Ausnahme wie `zeitmessung`, der Controller ruft diesen Rückruf selbst (B6).
- Server: `laufOptionen` + `rueckfrageSpeicher`; `VERBOTENE_OPTIONEN_FELDER` + `'rueckfrageSpeicher'` (f10 AK3 iteriert dynamisch).
- ARCHITECTURE §4 (Zeile 144): Quelle = Speicher der Vermittlung (gleicher Prozess), Datei = Audit, Abweichung/fehlender Speicher
  ⇒ VERWEIGERT; DEKLARIERT bleibt wegen der Antwort-Route (§3). Gate b2b3b1b (f) verlangt dort weiter
  „abgelehnt_durch_stefan“, „ERFOLGREICH“, „DEKLARIERT“.
- Gate b2b3b1b: Kopf (p3) Zeile 21–23 ehrlich nachziehen („prüft den Evaluator mit der Datei; Controller-Pfad siehe
  check-f45-b2b3b2a-absicherung (a2)“) — Code von (p3) unverändert (B6).

## 2. F-1128 (2): Löschliste bei abgelehnt_durch_stefan > 0 aussetzen
- `src/arbeitsordner/index.ts` neben `leseLoeschliste` (B5): `fuehreLoeschlisteAus(arbeitsordner, ergebnistext, stefanAbgelehnt)`
  → `undefined` (kein Block) | bisherige Block-Ablehnung (`ungueltig`) | `loescheDateien(...)` | bei `stefanAbgelehnt` und `ok`:
  `{ geloescht: [], abgelehnt: pfade.map((p) => ({ pfad: String(p), grund: LOESCHLISTE_AUSGESETZT })) }` (Hinweis, kein
  Schemawechsel; Anzeige zeigt `abgelehnt[]` mit Grund, E5). Konstante `LOESCHLISTE_AUSGESETZT` exportiert.
- Server: Aufruf mit `(ergebnis.klassifikation?.abgelehnt_durch_stefan ?? 0) > 0` inline (keine eigene `const`).

## 3. Obergrenzen je Lauf (F-1128 (5), F-1126 (2))
- `MAX_OFFENE_JE_LAUF = 20`, `MAX_PROTOKOLL_JE_LAUF = 200` (exportiert). **offen = Einträge mit `entscheidung === null`**
  (Filter über `lauf.eintraege`; B2).
- `stelle`, nach Formprüfung (400 bleibt ohne Eintrag), VOR Doppel-ID: `protokoll.length + offen ≥ 200` ⇒ `deny` bzw.
  `KEINE_ANTWORT` ohne Protokolleintrag, Grund „Obergrenze der Protokolleinträge je Lauf erreicht (200)“, einmal
  `console.error` je Lauf. Invariante `protokoll.length + offen ≤ 200` (E3).
- Nach Vorentscheidung, vor dem Einreihen: `offen ≥ 20` ⇒ auto_deny (Rechte) bzw. frage_ohne_antwort (Frage) MIT Eintrag, Grund
  „zu viele offene Rückfragen je Lauf (20)“.
- Menge (B8): Worst Case 200 Einträge ⇒ 20 100 Eintrags-Kopien über alle Versionen, ~60 MB je Lauf (ASCII, ~3 KB/Eintrag),
  bis ~250 MB (`\u00XX`/CJK). 200 ist Stefans Vorgabe; in F-1128 als Restpunkt beziffert. Beim Bau einmal mit dem echten
  Schreiber gemessen (Skript im Scratchpad, Zahl im Bericht).

## 4. F-1126 (3): Steuer-/Formatzeichen ⇒ auto_deny
- `vorentscheidung`, Bash-Zweig nach „Befehl fehlt“: `command.replace(/[\t\n]/g, '')` gegen
  `/[\p{Cc}\p{Cf}\p{Cs}\p{Zl}\p{Zp}]/u` ⇒ auto_deny „Befehl mit Steuer- oder Formatzeichen (\r, ANSI, Bidi …) wird nicht
  vorgelegt“. Modulkopf: nicht erfasst sind Variationsselektoren, NBSP/Zs, Homoglyphen (E11). `\n`/`\t` bleiben erlaubt (O6).
- Auflage für 3b-2b in F-1126 (3): vollständige Anzeige mit Zeilenzahl, Steuerzeichen in Fragen/Optionen sichtbar (B12).

## 5. Server-Zeilenbilanz je Zeile (B4)
| Stelle | Änderung | Δ |
|---|---|---|
| Import `../src/arbeitsordner/index.ts` (525–526) | `leseLoeschliste,` + `loescheDateien,` → `fuehreLoeschlisteAus,` | −1 |
| `VERBOTENE_OPTIONEN_FELDER` (~1999) | Kommentarzeile + `'rueckfrageSpeicher',` | +2 |
| `laufOptionen` (~6826) | Kommentarzeile + `rueckfrageSpeicher: (id) => rueckfrageVermittlung.eintraegeVon(id),` | +2 |
| Löschliste-Kommentar (6922–6924) | 3 Zeilen → 2 (inkl. Hinweis F-1128 (2)) | −1 |
| Löschliste-Logik (6930–6932) | 3 Zeilen → 1 (`loeschliste = fuehreLoeschlisteAus(...)`) | −2 |
| **Summe** | | **0** |
Ergibt sich beim Bau > 0 (z. B. Formatierung), wird im selben Abschnitt gekürzt; Nachweis `git diff --stat` + `wc -l` = 13455.

## 6. Tests und Gate
- node:test: `rueckfrage-vermittlung.test.mjs` (eintraegeVon Projektion/null nach beendeLauf; 21. offene ⇒ auto_deny mit Grund;
  25 nacheinander beantwortete erreichen alle Stefan (B2); 200er mit Reservierung, Stub-`protokolliere`); `rueckfrage.test.ts`
  (Zeichen); `protokoll.test.ts` (`bestaetigeProtokoll` inkl. datei kein Objekt / eintraege keine Liste, B11);
  `arbeitsordner.test.ts` (`fuehreLoeschlisteAus` 4 Zweige); `execution-controller.test.ts` (bestehender Fall nun mit
  `rueckfrageSpeicher`; neu: Speicher fehlt bzw. weicht ab ⇒ VERWEIGERT); `leitstand-arbeitsordner.test.mjs` (Attrappe mit
  `abgelehnt_durch_stefan: 1` ⇒ Datei bleibt).
- Gate `scripts/check-f45-b2b3b2a-absicherung.mjs` (+1 Gate-Zeile in `check:gates` nach b2b3b1b), Module dynamisch geladen:
  (a1) rein über `bestaetigeProtokoll` + `klassifiziereLauf`: gefälschte Datei (stefan_abgelehnt für eine im Speicher auto_deny-ID)
       ⇒ VERWEIGERT; Speicher null ⇒ VERWEIGERT; Länge abweichend ⇒ VERWEIGERT; gleich ⇒ ERFOLGREICH (Gegenprobe).
  (a2) echter Server (Kanal an über Option `rueckfrage`, nur im Gate), Attrappe hält den Lauf offen und ruft die **exportierte**
       `ermittleRueckfrageProtokoll(laufId, optionen.basisVerzeichnis, optionen.rueckfrageSpeicher)` mit den echten laufOptionen:
       Stefan lehnt t1 über die Antwort-Route ab ⇒ ERFOLGREICH; auto_deny t2 über die Token-Route, dann gefälschte Dateiversion
       (registriereKernArtefakt) mit t2 stefan_abgelehnt ⇒ VERWEIGERT; Speicher fehlt / Lauf nicht offen (ohne Leser bzw.
       `eintraegeVon` nach `beendeLauf`) ⇒ VERWEIGERT. Quelltext: Controller ruft an der Klassifikationsstelle
       `ermittleRueckfrageProtokoll(laufId, optionen.basisVerzeichnis, optionen.rueckfrageSpeicher)`.
  (l1) echter Server, Arbeitsordner, Attrappe schreibt `alt.txt` und Laufakte mit `zu_loeschen: ["alt.txt"]`, liefert
       `abgelehnt_durch_stefan: 1` ⇒ `alt.txt` bleibt, `loeschliste.abgelehnt[0].grund === LOESCHLISTE_AUSGESETZT`; Gegenprobe ohne
       ⇒ gelöscht.
  (o1) Vermittlung mit Stub: 21. offene ⇒ auto_deny mit Grund; nach Beantworten wieder Platz; 201. ⇒ deny ohne Eintrag,
       Protokoll bleibt ≤ 200, offene Einträge werden trotzdem protokolliert entschieden.
  (z1) `vorentscheidung`: `\r`, `ESC[31m`, U+009B, U+202E, U+2066, U+0007, U+200B, U+2028, einzelnes Surrogat ⇒ auto_deny;
       `\n`, `\t` ⇒ frage_stefan.
  (f)  Grenzen (gegen main nicht rot, B11): `starteWorkflowSchritt(` im Server 6×; kein Produktaufrufer übergibt `rueckfrage:` an
       `erzeugeRequestHandler` (Muster Gate b2b3b1 (f)); ARCHITECTURE §1 nennt F-1131; Bremse unverändert gegenüber main (Grenze,
       Bestand).
- Rot gegen main je Fall (a1, a2, l1, o1, z1) per `git archive main` in den Scratchpad (F-1127).

## 7. findings.md
- F-1128: (1)(2)(5) erledigt mit Belegen; B7 („einmal erlauben“/„ablehnen“ durch lokalen Prozess über die Antwort-Route ohne
  Token — vor dem Einschalten in 3b-2b Entscheidung Stefan); B8-Menge; (3)(4)(6)–(10) offen.
- F-1126: (2)(3) erledigt; Auflage B12 für 3b-2b; (4)–(7) offen.
- F-1131 neu (E2).

## Grenzen
Kanal aus (kein Produktaufrufer setzt `rueckfrage`); Argv bitgleich (Gate b2b3b1); `starteWorkflowSchritt(` 6×;
check-wachstumsbremse-server grün ohne JSON-Änderung; check-f813-csrf unverändert; keine gesperrten Dateien; package.json nur die
Gate-Zeile; `kontrollzustand/` nie stagen; kein Commit.

## Nachtrag nach Delta-Advisor-Pass (`features/F45/advisor-b2b3b2a-delta.md`, Freigegeben mit Hinweisen)
- D1: `bestaetigeProtokoll` prüft je Index zuerst „Eintrag ist Objekt“ (sonst `ok:false`, Grund „Eintrag i ist kein Objekt“);
  `ermittleRueckfrageProtokoll` liegt ganz in try/catch (Wurf ⇒ null + console.error). Test `eintraege: [null]`.
- D2: Speicher `[]` und Datei fehlt ⇒ null ohne Log (Normalfall ohne Rückfrage).
- D3: Bremse-Klausel aus Gate (f) gestrichen; Bilanz genau 0 (§5), sonst Ausgleich im selben Abschnitt.
- H1–H11 im Bau: keine `permission_denials`/`rueckfrage: {` in neuem src-Text; Exporte je Fall mit `typeof` prüfen; Quelltextprüfung
  (a2) nach H4; Gegenprobe alter Pfad in (a2) (H5); Messung Schreiben UND Lesen (H6); `tool_name` > 200 in der Projektion wie der
  Schreiber auf `<zu lang>` (H7; Konstante bleibt in rueckfrage-protokoll.mjs, die Projektion übernimmt die Regel); Köpfe nach H8;
  (f) nur neue Prüfungen (F-1131 in §1, `starteWorkflowSchritt(` 6×, kein Produktaufrufer mit `rueckfrage:`); Server-Ende-zu-Ende
  der Löschliste nur in Gate (l1), in `leitstand-arbeitsordner.test.mjs` keine zweite (H9); CRLF im Modulkopf (H10); Import H11.
