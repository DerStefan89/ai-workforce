# Advisor-Pass F45 B5b-1b „Planungsdaten schreiben“ — Plan v1

Abgelegt wörtlich aus dem Bericht des Subagenten `architecture-advisor` (frischer Kontext, nur Read/Grep/Glob), 24.10.2026.
Geprüfter Plan: `features/F45/plan-b5b1b.md` (v1). Urteil: **Nicht freigegeben** — Schnitt B5b-1b-1/B5b-1b-2 vorgeschlagen
(A1); der Bauende schneidet nicht selbst (Bauauftrag), Bau gestoppt, kein Code geschrieben.

Anmerkung des Bauenden (kein Teil des Berichts): Der Advisor kannte den Wortlaut des Bauauftrags nicht, nur eine
Zusammenfassung ohne Punkt 5. Der Bauauftrag beauftragt die Korrektur von P ausdrücklich („Kleinfix Migration (P3): F45-Workstream
„P“ — Ist aus der Notiz übernehmen, wenn dort eine AT-Zahl steht (≈ 1,25), einheitlich zu B0; sonst begründen“). Befund A2
betrifft damit nur noch den Widerspruch zur Regel in `features/F45/plan-b5b1-v2.md:55` („+ 6 h“ ⇒ `–`), den Stefan beim
Entscheid über A1 mit bestätigt.

---

**Geprüfter Plan:** `features/F45/plan-b5b1b.md` (v1, 141 Zeilen).

**Geprüft gegen:**
- `ARCHITECTURE.md`: §1 :53–63, §2 :70–100, §3 :112, §7 :170, §8 :181
- `docs/architektur/arbeitsordner.md` (:10–31) und `docs/architektur/wachstumsbremse.md` (:10)
- `scripts/architektur-kern.json`, `scripts/wachstumsbremse-server.json`
- `features/F45/plan-b5b1-v2.md`, `features/F45/advisor-b5b1.md` (A2, A3, B3, B4, B6, C4, O4, O5)
- `features/F45/feature.md`: Entscheidungen :43–56, Workstreams :86–142
- `docs/projekt/fixpaket-f45.md` :38, :43, :113–114
- `scripts/leitstand/routen-f35.mjs`, `src/feature-auftrag/akte-schreiben.ts`
- `src/workboard/roadmap-regeln.ts`, `src/workboard/feature-planung.ts`, `src/workboard/roadmap-planung.ts` (:148–239), `src/workboard/feature-akte-pruefung.ts`
- `src/projektkontext/index.ts` :24–124
- `scripts/leitstand/routen-roadmap.mjs`, `scripts/leitstand/routen-projektakte.mjs` :147
- `scripts/check-akte-meilenstein.mjs`, `scripts/check-status-akten.mjs`, `scripts/check-f813-csrf.mjs` (:119–155, :301–308), `scripts/check-f45-b5a1-akte.mjs` :253–255, `scripts/check-f45-b5b1a-planung.mjs` :234–242
- `scripts/leitstand-server.mjs`: :4876–4893, :8117–8146, :9504–9536, :13055–13084, :13264
- `docs/projekt/roadmap.json`, `docs/projekt/roadmap-ausnahmen.json`
- `docs/STATUS.md` :410–509
- `features/F18/feature.md` :1–30; die Zeilen `Status:`/`Abgenommen:`/`Priorität:`/`## Workstreams`/`## Änderungen` aller Akten
- `state/findings.md` (höchste ID), `.gitattributes`

**Rollengrenze:** nur Read, Grep und Glob. Kein Bash, kein git, nichts ausgeführt, nichts geschrieben.

**Nicht geprüft:**
- **Bytegröße von `ARCHITECTURE.md`:** Die 17 765 B stammen aus dem Auftrag und sind ohne Werkzeug nicht messbar.
- **Zeilenenden auf der Platte:** Read zeigt kein CR. Ich verlasse mich auf `.gitattributes:13` `* text=auto eol=lf`.
- **Ob Gates und Tests heute grün sind.**
- **Merge-Datum von B5b-1a** (#376) für die Workstream-Zeile.
- **Ob ein Gate den Quelltext des Ausgleichs-Kandidaten liest.** Geprüft habe ich nur check-f31 und check-f34, siehe B9.
- **Der Wortlaut des Bauauftrags selbst.** Grundlage ist allein die Zusammenfassung des Aufrufers.

## Marker-Legende
- [Fakt]: belegt (Datei:Zeile).
- [Fakt, entlastend]: belegt und in Ordnung.
- [Schlussfolgerung]: abgeleitet, nicht ausgeführt.
- [Annahme]: plausibel, aber unbelegt.
- [offene Unsicherheit]: mit diesen Rechten nicht entscheidbar.

---

## A. Vor dem Bau zu entscheiden (Challenger/Stefan)

**A1 Der Zuschnitt passt nicht verlässlich in einen Baudurchgang plus eine Korrekturrunde. Es folgt ein Schnittvorschlag.**
- [Fakt] Der Plan umfasst drei Routen (PUT planung, GET bereinigung, POST bestaetigen) und bis zu vier Schreibziele je Aufruf: Akte, `roadmap.json`, `roadmap-ausnahmen.json`, `STATUS.md` (plan-b5b1b.md:77–95).
- [Fakt] Dazu kommen zwei reine Module mit zusammen acht Funktionen (:28–66), sieben aus anderen Modulen exportierte Helfer, ein verallgemeinerter `baueGitBlock` (:50, :75–76), ein Server-Block mit Ausgleich (:97–101) und ein Gate mit 14 Fällen (a)–(n), mehrere davon je Route und je Pfadform (:103–115).
- [Fakt] Vergleich mit B5a-1: zwei Schreibrouten auf **eine** Datei bei 0,5–0,6 AT (`features/F45/feature.md:132`), schon damals „grenzwertig“ (`advisor-b5b1.md:35`, Verweis auf `advisor-b5a1.md:63`).
- [Fakt] Bei Paketen mit Advisor-Auflagen lag das Ist real etwa beim Doppelten (F-3b-1: 0,5 → 0,95, `features/F45/feature.md:103`).
- [Schlussfolgerung] Jeder der beiden Pfade (PUT planung, Bereinigung) hat für sich etwa die Größe von B5a-1. Die Schätzung 0,35–0,45 AT (`fixpaket-f45.md:113`) ist nicht tragfähig, realistisch sind 0,6–0,8 AT.
- **Schnittvorschlag:**
  - **B5b-1b-1 „Planung schreiben“:** PUT …/planung. Schreibt Akte und `roadmap.json`. Kern-Ausnahme §2 nur für `roadmap.json`, Server-Block mit Ausgleich, Kennzahl ohne ABGEBROCHEN. Gate (a)–(h), (j), (k)–(n) für die PUT-Route.
  - **B5b-1b-2 „Bereinigungsliste“:** GET/POST bereinigung. Schreibt Akte, `roadmap-ausnahmen.json`, `STATUS.md` und den Status in `roadmap.json`. Kernsatz um diese Dateien ergänzt. Die Methoden-Tabelle im Server-Block wird nur erweitert (±0 Zeilen). Gate (i), (k)–(m) für beide Routen.
  - Die Abhängigkeit 1b-2 → 1b-1 steht im CONTEXT. Jeder Teil hat ein eigenes prüfbares Artefakt.
- **Alternative:** bewusst ein Paket, dann mit korrigierter Schätzung in `fixpaket-f45.md:113` und in der Workstream-Zeile `feature.md:135`.

**A2 „Migration P“ ist nicht beauftragt und weicht von der Regel in Plan v2 ab.**
- [Fakt] Plan §0/§6 setzt für P Ist `1,25` mit der Notiz „≈ 6 h Messung nicht eingerechnet“ (plan-b5b1b.md:12, :120).
- [Fakt] `plan-b5b1-v2.md:55` legt für P fest: „+ 6 h“ ⇒ `–`. Der Bestand folgt dem (`features/F45/feature.md:91`).
- [Fakt] Die Vorgaben des Bauauftrags nennen keine Ist-Korrektur. „Ist-Fortschreibung“ steht dort sogar unter NICHT.
- [Schlussfolgerung] Das ist eine stille Änderung einer Migrationsregel. Empfehlung: aus B5b-1b streichen, oder Stefan bestätigt den Wert ausdrücklich und Plan v2 nennt den Beleg.

---

## B. In Plan v2 festlegen (ohne neue Entscheidung)

**B1 Gate-Semantik: Die Akte und die dateiübergreifenden Gates folgen verschiedenen Regeln, und der Plan beschreibt B5a-1 falsch.**
- [Fakt] B5a-1 blockiert **jeden** Befund. `schonVorher` ändert nur die Meldung (`akte-schreiben.ts:374–378`: `verstoesse.length > 0` ⇒ immer 422).
- [Fakt] Der Plan schreibt „pruefeFeatureAkteInhalt nur alte Befunde (`schonVorher` wie B5a-1)“ (:44–45) und „Akte-Gate nur alte Befunde“ (:93–94). Das würde Schreiben trotz Altbefund erlauben, also gerade nicht „wie B5a-1“.
- [Schlussfolgerung] Für Plan v2 empfehle ich:
  - Akte-Gate genau wie B5a-1: jeder Befund ⇒ 422, `schonVorher` nur für die Meldung. Eine Regel für alle Schreiber der Akte; die Grenze C9 ist schon DEKLARIERT.
  - R1 und Akte↔Meilenstein: nur neue Befunde blockieren. Deren Altbefunde können außerhalb der bearbeiteten Akte liegen (Fremdprojekt, B2).
  - „Neu“ heißt: Befundtext auf dem neuen Stand, der auf dem alten Stand mit denselben Eingaben fehlt.
- [Fakt] `ARCHITECTURE.md:181` verlangt für ERZWUNGEN einen Rot- und einen Grün-Fall. Gate (e) ist nur der Rot-Fall. Es fehlt ein Grün-Fall: ein Altbefund in R1 steht und blockiert nicht.

**B2 `pruefeAkteMeilenstein` liegt in einem Gate-Skript, der Plan importiert es in ein Routen-Modul.**
- [Fakt] Die Funktion steht in `scripts/check-akte-meilenstein.mjs:70`. Ihr Standard sind die repo-eigenen `AUSNAHMEN` (AF-F001, :54–60).
- [Fakt] Kein Modul unter `scripts/leitstand/` und auch der Server importiert heute aus `scripts/check-*` (Grep ohne Treffer).
- [Fakt] Die R1-Regel wurde gerade deshalb nach `src/` gezogen: „Fremdprojekte haben kein Gate-Skript“ (`roadmap-regeln.ts:6–7`).
- [Schlussfolgerung] In einem Fremdprojekt erzeugte AF-F001 immer den Altbefund „veraltet: keine Akte“.
- [Schlussfolgerung] Ein Verschieben ändert nur die Fundstelle einer existierenden ID. Neue Befunde von `pruefeAkteMeilenstein` sind dabei nur durch einen Fehler in `verschiebeFeature` möglich.
- **Empfehlung (einfacher):** `pruefeAkteMeilenstein` in der Route weglassen. Den Rundlauf von `verschiebeFeature` um die Invariante ergänzen: „ID steht genau einmal, und zwar im Ziel“. Ein Einplanen aus ENTWURF (E-B5-2) ist damit abgedeckt.
- **Alternative:** die ID-Regel nach `src/workboard/roadmap-regeln.ts` ziehen; `AUSNAHMEN` bleibt als Parameter im Skript.
- [Fakt] Ebenso liegt der Leser für den Aktenstatus nur im Skript (`leseAktenStatus`, :144). Die Route braucht einen eigenen Leser über die Roadmap-IDs mit `loeseFeatureAktePfadAuf` (vgl. `baueFeatureEintrag`, `routen-roadmap.mjs:55–73`).

**B3 Rückbau über mehrere Dateien: die Fehlerpfade schärfen.**
- [Fakt] Der Plan setzt nur „bereits geschriebene Dateien mit alten Bytes zurück“ (:81–82).
- [Schlussfolgerung] Scheitert `writeFileSync` mitten im Schreiben oder weicht das Rücklesen ab, ist **die gerade geschriebene Datei** schon verändert. Sie muss in den Rückbau.
- Plan v2 legt fest:
  1. Rückbau = alle Dateien bis einschließlich der scheiternden, jeweils mit den alten Bytes.
  2. Nach dem Rückbau jede Datei zurücklesen. Die Antwort nennt je Pfad „zurückgesetzt“ bzw. „nicht zurückgesetzt“ und „git diff prüfen“.
  3. Feste Schreibreihenfolge, festgehalten im Kopf.
  4. Ein Prozessabbruch zwischen zwei Schreibvorgängen bleibt ohne Rückbau (DEKLARIERT). Gates und `git diff` zeigen den Zustand, nichts ist committet.
- [Fakt] Die UTF-8-Rundlaufprüfung nennt der Plan nur für die Akte (:78; Vorbild `routen-f35.mjs:286–287`). Sie gehört vor jedes Schreibziel, weil sonst „Rest bytegleich“ nicht gilt.
- [Fakt] `leseStatusAusnahmen` meldet eine ungültige Datei als Befund, ohne zu werfen (`roadmap-regeln.ts:46–60`). Der Plan regelt nicht, was dann passiert. Empfehlung: Ausnahmen-Datei mit Befunden ⇒ 422 „roadmap-ausnahmen.json von Hand“, nichts geschrieben.

**B4 Offener Punkt 1: `meilenstein_laeuft` bei mehreren Abweichungen ist faktisch eine Sammel-Bestätigung.**
- [Fakt] M4 hat vier Ausnahmen: F20, F21, F22, F25 (`roadmap-ausnahmen.json:5–8`).
- [Fakt] Alle Ausnahmen von M müssen weg, sonst sind sie verwaist (`roadmap-regeln.ts:116`). Der Plan ist darin konsequent (:92).
- [Fakt] Vorgaben: „genau EIN Eintrag“ und „NICHT Sammel-Bestätigung“; Fixpaket: „genau eine Änderung, Ausnahme entfernt“ (`fixpaket-f45.md:113`).
- [Schlussfolgerung] Mit einem Klick auf M4/F20 würden vier Einträge erledigt.
- **Empfehlung (a):** `meilenstein_laeuft` nur anbieten und annehmen, wenn M genau eine Abweichung hat (heute nur M3/F18). Sonst gibt es den Vorschlag nicht bzw. 422 mit Ausweg: „erst die übrigen Einträge bestätigen oder von Hand“. Das erfüllt die Vorgabe wörtlich ohne neue Entscheidung.
- Wer stattdessen Meilenstein-Einträge will (Eintrag „M4“ als eigene Art), braucht dafür eine Challenger-Entscheidung.

**B5 Offener Punkt 2: Was gilt, wenn STATUS.md fehlt oder die Standardform nicht kennt?**
- [Fakt] `check-status-akten` läuft nur in diesem Repo, das Skelett trägt es nicht (Grep: nur `package.json`, `state/gates.md`, Skript und Pläne).
- [Fakt] Hier hat jedes Bereinigungs-Feature genau eine Standardform: F18 `STATUS.md:421`, F20 :481, F21 :487–488, F22 :491–492, F25 :501. Die Zeilen :446 und :485 tragen keinen Status und zählen nicht (Regex `check-status-akten.mjs:49`).
- [Schlussfolgerung] Wörtlich angewandt würde B6 in einem Fremdprojekt mit einer STATUS.md ohne diese Konvention jede Bestätigung auf ABGESCHLOSSEN dauerhaft mit 422 sperren.
- **Empfehlung:**
  - Datei fehlt ⇒ überspringen und in der Antwort darauf hinweisen (DEKLARIERT).
  - Datei vorhanden, aber ohne jede Standardform (für irgendeine ID) ⇒ ebenso überspringen.
  - Datei mit Konvention, aber 0 oder mehr als 1 Treffer für diese ID ⇒ 422 „STATUS.md von Hand“ (B6).
  - Im Hash-Objekt steht dann `status_md: null` bzw. der Hash der Datei.

**B6 „Erst bereinigen“ beim Verschieben aus einem ABGESCHLOSSEN-Meilenstein führt in eine Sackgasse.**
- [Fakt] Wird F18 aus M3 verschoben, verwaist M3/F18 (`roadmap-regeln.ts:117`). Das ist ein neuer Befund ⇒ 422 (plan-b5b1b.md:79–81, Gate (e)).
- [Fakt] Die Bereinigungsliste bietet nur ABGESCHLOSSEN oder M → LAEUFT (:64–66).
- [Schlussfolgerung] Der eigentlich gewünschte Weg, etwa F25 ins V1-Backlog (`advisor-b5b1.md:105`), ist im Leitstand gar nicht möglich. „Erst bereinigen“ verweist auf eine Liste, die genau dieses Ergebnis nicht anbietet.
- **Empfehlung:** den 422-Text um den Handweg ergänzen („Ausnahme von Hand entfernen, dann verschieben“), die Grenze DEKLARIEREN und ein Finding ab F-1186 für „Verschieben als Bereinigungsweg“ (B5b-2) anlegen. Keine Erweiterung des Umfangs.

**B7 STATUS.md als Schreibziel sprengt A2 nicht, die Grundlage muss aber richtig benannt werden.**
- [Fakt] A2 nennt nur `roadmap.json` und `roadmap-ausnahmen.json` (`features/F45/feature.md:51`). B6 verlangt das Mitschreiben der STATUS.md-Zeile (:56).
- [Schlussfolgerung] Materiell deckt B6 das Schreiben von STATUS.md. Der Plan trägt aber „A2 um STATUS.md erweitert“ als eigene Entscheidung ein (:119); niemand hat sie so getroffen. Richtig ist: „Kernsatz nach A2 + B6“.
- [Schlussfolgerung] STATUS.md hat eine andere Natur: Harness-Gedächtnis mit Freitext, keine Planungsdaten. Kern und Detail müssen den Umfang eng fassen: „nur das Status-Wort genau einer Standardform“.
- [Fakt] Mitzuziehen ist `docs/architektur/arbeitsordner.md:15`: „Im Projektordner selbst bleibt der Kern lesend — einzige Ausnahme die Feature-Akte“. Plan §1 fügt nur einen neuen Punkt hinzu (:19). Ohne Anpassung widersprechen sich Kern und Detail, und laut `arbeitsordner.md:4–5` ist das ein Befund.

**B8 Offener Punkt 7: Der Deckel von ARCHITECTURE.md reicht nicht.**
- [Fakt] Deckel 17 800 B (`scripts/architektur-kern.json:2`). Anheben nur mit Entscheidung Stefans (`ARCHITECTURE.md:25–27`).
- [Schlussfolgerung, von Hand aus dem Wortlaut plan-b5b1b.md:15–16 gezählt] Der neue Satz kostet etwa 73 B, frei sind etwa 35 B.
- **Empfehlung:** im selben Absatz kürzen, statt auszulagern, und die Gate-Namen in den Detailtext verschieben. Zum Beispiel „(F45 B5a-1, Gate f45-b5a1)“ → „(F45 B5a-1/B5b-1b)“; die Gates stehen dann im Detail.
- Plan v2 zeigt Vorher und Nachher mit Byte-Zahl. Im Kern bleiben die drei Dateinamen als Regel stehen.

**B9 Offener Punkt 5: Der Server-Ausgleich muss im Plan benannt sein.**
- [Fakt] `scripts/leitstand-server.mjs` hat genau 13 264 Zeilen (letzte Zeile :13264) und steht damit auf der Grenze (`wachstumsbremse-server.json:2`).
- [Schlussfolgerung] Jede neue Zeile braucht einen Ausgleich, der schon im Plan v2 feststeht.
- [Schlussfolgerung] Ein möglicher Kandidat ist `baueChatFehlerText` (`leitstand-server.mjs:4876–4893`, 18 Zeilen, liest nur seine Parameter).
- [Fakt] check-f31 und check-f34 prüfen den Text nur über das Verhalten (`check-f31-gedaechtnis.mjs:519`, `check-f34-product-coach.mjs:522`), nicht über den Quelltext.
- [offene Unsicherheit] Andere Gates habe ich nicht abgesucht.
- **Empfehlung:** einen eigenen Block hinter dem Akte-Block. Dann bleiben der gemergte B5a-1-Block und dessen Gate (l) (`check-f45-b5a1-akte.mjs:253–255`) unberührt, (n) zählt eindeutig. Das Falten in den Akte-Block spart etwa 5 Zeilen, koppelt aber `routen-f35` und `routen-planung` in einer Methodenweiche.

**B10 Der synchrone Abschnitt muss alle Leseeingaben der Gates umfassen.**
- [Fakt] R1 braucht den Status jedes Features der Roadmap (`roadmap-regeln.ts:98–106`). Der Plan nennt für POST „alle vier Dateien lesen“ (:89), nicht die übrigen Akten.
- [Schlussfolgerung] Plan v2 muss sagen: In PUT (bei `meilenstein`) und POST werden Roadmap-IDs und Aktenstatus im selben synchronen Abschnitt frisch gelesen (kein await). Ebenso wird geprüft, ob der Eintrag noch eine aktuelle Abweichung ist.
- [Fakt] Nebenwirkungen von `meilenstein_laeuft`, die in den Vorschlagstext gehören:
  - M3/M4 wird aktueller Meilenstein, weil die Anzeige den ersten LAEUFT nimmt (`routen-projektakte.mjs:147`). Das steht schon im Plan.
  - Neu: die Features von M fallen wieder in die Prognose. Ohne strengen Abschnitt zählen sie als „ohne Schätzung“ (`roadmap-planung.ts:149–150`) und erhöhen `ohne_schaetzung` aller späteren Meilensteine, also auch von „Bis M5“.

---

## C. Mitlaufend im Bau

- **C1** [Fakt] `src/feature-auftrag` importiert `src/workboard` (`akte-schreiben.ts:32`; `feature-planung.ts:24–25` „kein Ring“). `src/workboard/roadmap-schreiben.ts` darf deshalb weder `wendeAn` noch `enthaeltSteuerzeichen` aus `akte-schreiben.ts` importieren. Was beide brauchen, gehört nach `src/workboard`.
- **C2** [Fakt] `standardForm` trägt das Flag `/g` (`check-status-akten.mjs:49`). Als gemeinsame Konstante nur über `matchAll` oder eine frische Kopie verwenden, nie `.test` oder `.exec` mit geteiltem `lastIndex`.
- **C3** Schätzzahlen: Obergrenze festlegen (z. B. ≤ 1000), sonst erzeugt `toString` Exponenten. `min === max` ⇒ als `x` schreiben. Die Leseregel steht in `feature-planung.ts:71–72, 101–108`.
- **C4** CSRF-Probe nur für PUT und POST. GET bereinigung liegt bewusst nicht hinter dem CSRF-Haken (`leitstand-server.mjs:8132`); für alle drei Routen gilt die Host-Probe. Kein `.method` unter `scripts/leitstand/`, auch nicht in Tests oder Kommentaren (`check-f813-csrf.mjs:301`, `wachstumsbremse.md:10`).
- **C5** [Fakt] Gate b5b1a (i2) vergleicht `gesamt === roadmapFeatures.length` (`check-f45-b5b1a-planung.mjs:235`). Nach der Kennzahl-Änderung beim Nachzählen ABGEBROCHEN herausnehmen; heute grün nur, weil keine Akte ABGEBROCHEN ist. Den node:test in `roadmap-planung.test.ts:133` ebenso anpassen.
- **C6** Die Prüfung von `grund` (`akte-schreiben.ts:155–158`) als Helfer exportieren, nicht kopieren.
- **C7** [Fakt] Der Pfad der Ausnahmen-Datei steht im Gate fest (`check-akte-meilenstein.mjs:49`), die Route will „neben `roadmapPfad`“. Ein Ableitungsweg; ein abweichender `roadmapPfad` im Fremdprojekt wird DEKLARIERT.
- **C8** Gate (i) prüft zusätzlich „bytegleich außer dem ersetzten Wort bzw. der entfernten Zeile“ für STATUS.md und Ausnahmen. Gate (m) wird über den Modulaufruf mit `schreibe` bedient, über HTTP geht das nicht; im Plan sagen.
- **C9** §7-Liste um `check-f33-roadmap-projektion` ergänzen: Die Kennzahl ändert die Projektion.
- **C10** POST: Format von `eintrag` (`M/F`, Feature-ID nach `FEATURE_ID_MUSTER`) als 400 vor der Sperrprüfung.
- **C11** Der Vorschlagstext nennt den aktuellen `featureStatus`. Heute wäre ABGESCHLOSSEN auch aus BLOCKIERT oder ENTWURF anklickbar; Stefan soll sehen, wovon er abschließt.
- **C12** `Priorität:` bzw. `Abgenommen:` direkt hinter `Status:` (F18: `feature.md:13`) wird im Markdown mit der Status-Zeile ein Absatz. Das ist nur kosmetisch; der Leser bleibt korrekt (`feature-planung.ts:68–69`).

---

## Offene Punkte 1–9

| Punkt | Urteil | Empfehlung, Beleg |
|---|---|---|
| 1 `meilenstein_laeuft` entfernt alle Ausnahmen von M | so nicht vereinbar mit „genau EIN Eintrag“ | (a) nur bei genau einer Abweichung in M, sonst kein Vorschlag bzw. 422 mit Ausweg (B4). Meilenstein-Einträge nur mit Entscheidung. `roadmap-ausnahmen.json:5–8`, `fixpaket-f45.md:113` |
| 2 STATUS.md fehlt | überspringen mit Hinweis | ebenso bei STATUS.md ohne jede Standardform; 0 oder mehr als 1 Treffer bei vorhandener Konvention ⇒ 422 (B5) |
| 3 Ausplanen (`meilenstein: null`) ⇒ 400 | tragfähig | R6 verlangt es nicht (`fixpaket-f45.md:43`). Eigener 400-Text „Ausplanen nicht unterstützt — von Hand“ statt „nicht-leerer String“; DEKLARIERT |
| 4 vorhandene `Abgenommen:` ⇒ 422 | tragfähig | kein Fall im Bestand: einzige Zeile `features/F35/feature.md:12`, F35 liegt in M5 (LAEUFT). Fail-closed |
| 5 Server-Ausgleich | im Plan v2 benennen | eigener Block; Helfer z. B. `baueChatFehlerText` (:4876–4893), vorher prüfen, ob ein Gate den Quelltext liest (B9) |
| 6 ABGEBROCHEN oder ohne Akte ⇒ nur `meilenstein_laeuft` | tragfähig | zusammen mit Punkt 1 kann ein ABGEBROCHEN-Feature in einem Meilenstein mit mehreren Abweichungen nur von Hand bereinigt werden; DEKLARIERT. „Ausnahme mit echtem Grund behalten“ wird nicht angeboten (Hand) |
| 7 ARCHITECTURE-Deckel | im selben Absatz kürzen | Gate-Namen ins Detail, Vorher/Nachher mit Byte-Zahl, Deckel nicht anheben (B8) |
| 8 immer alle vier Hash-Schlüssel | tragfähig, empfohlen | immer `{ roadmap, ausnahmen, akte, status_md }` mit `string\|null`, alle vier vergleichen (eine Regel, fail-closed; ein unnötiges 409 kostet nur ein neues GET); fehlender Schlüssel ⇒ 400 |
| 9 textuelles Fenster von `"id"` bis zum nächsten `"id"` | tragfähig | `additionalProperties: false` verbietet verschachtelte `id` (`projektkontext/index.ts:25, 60`); Bestand mit `id` zuerst (`roadmap.json:6–45`). Bedingungen: `"id"\s*:\s*"<M>"` genau einmal in der Datei; im Fenster genau ein `features`- bzw. `status`-Literal, sonst 422; Rundlauf über die **ganze** geparste Struktur (dann fängt er eine andere Schlüsselreihenfolge) |

---

## Entlastende Befunde (geprüft und in Ordnung)

- [Fakt, entlastend] **Hash und Wettlauf:**
  - Der Abschnitt vom Lesen bis zum Schreiben ist synchron (Vorbild `routen-f35.mjs:276–301`).
  - PUT …/akte und PUT …/planung bzw. POST bestaetigen prüfen beide den Hash der Akte. Einer von zwei Konkurrenten bekommt 409.
  - Ein Ablauf schreibt im eigenen Worktree, deshalb ist für `roadmap.json` und STATUS.md keine Sperre nötig (`arbeitsordner.md:30–31`).
- [Fakt, entlastend] **Wachstumsbremse:**
  - Der Dispatch über `erkennePlanungRoute(pfad)` ist kein Literal- oder Regex-Dispatch an `pfad`.
  - Keine Kollision mit `/api/roadmap` (Liste „gleich“, `wachstumsbremse-server.json:30`) oder mit `…/akte|auftrag` (`leitstand-server.mjs:9509, 9527`).
  - Der Multi-Projekt-Dispatcher reicht jeden Restpfad weiter (:13063–13081).
  - check-f813 (3) sieht `req.method !==` nicht (:134). Die eigene Probe je Route ist deshalb Pflicht (`wachstumsbremse.md:10`); der Plan hat sie in Gate (k).
- [Fakt, entlastend] Ein Routen-Modul, das im Projektordner schreibt, hat ein Vorbild: `routen-f35.mjs:293` (B5a-1), sobald §2 es trägt.
- [Fakt, entlastend] R1-Folgen richtig erkannt: Bei `feature_abgeschlossen` muss die Ausnahme weg (`roadmap-regeln.ts:118`), bei `meilenstein_laeuft` alle von M (:116).
- [Fakt, entlastend] CRLF ⇒ 422 auch für Ausnahmen und STATUS.md stimmt mit `ARCHITECTURE.md:170` ohne neue Ausnahme überein (A3, `feature.md:52`). Im Repo gilt `.gitattributes:13` `eol=lf`.
- [Schlussfolgerung, entlastend] `ARCHITECTURE.md:112` („Kern erzeugt niemals ein Freigabeartefakt“) wird nicht verletzt: ABGESCHLOSSEN entsteht nur auf Eingabe und wird nicht committet; den Commit macht Stefan über den Git-Block. „Nur auf Eingabe“ ist wie bei B5a-1 DEKLARIERT.
- [Fakt, entlastend] **Bestand der fünf Bereinigungs-Features:**
  - F18, F20, F21, F22 und F25 tragen weder `Abgenommen:` noch `Priorität:`; im ganzen Bestand gibt es nur `F35:12`.
  - Sie haben keinen strengen Workstreams-Abschnitt, also keine Abgenommen-Pflicht (`feature-planung.ts:264`).
  - Keine hat `## Änderungen`; der Abschnitt wird am Dateiende angelegt, wie in B5a-1.
- [Fakt, entlastend] Keine Akte ist heute ABGEBROCHEN. Die Kennzahl-Änderung verschiebt also keine aktuelle Zahl.
- [Fakt, entlastend] Helfer werden exportiert statt kopiert (plan :50, :75–76). Der Hash kommt aus demselben Lesevorgang (`routen-roadmap.mjs:91–94`).
- [Fakt, entlastend] Die nächste freie ID ist F-1186 (höchste: F-1185, `state/findings.md:8765`).
- [Fakt, entlastend] Aus `advisor-b5b1.md` übernommen: A2 (§1), A3, B3 (§4, (k)), B4 (§3, (e)), B6 (Vorschlagstext, STATUS.md), C4, O4, O5. Die Vorgaben „NICHT Anzeige/CSS, Balken ziehen, Sammel-Endpunkt“ sind eingehalten (:95). Die Sammel-Bestätigung über Punkt 1 ist offen, siehe B4.

---

## Status
- [ ] Freigegeben
- [ ] Freigegeben mit Hinweisen
- [x] Nicht freigegeben
- [ ] Blockiert

**Begründung nach Schwere:** Die Grundanlage trägt. Das Schreibmuster aus B5a-1 ist sauber übernommen, Hash und Wettlauf sind gelöst, die Wachstumsbremse ist erreichbar und die Ausnahme in §2 kommt zuerst.

1. **Vor dem Bau:** Der Zuschnitt passt nicht verlässlich (A1), der Bauende schneidet nicht selbst. Die Migration P ist nicht beauftragt (A2).
2. **Plan v2:**
   - B1: Die Gate-Semantik der Akte widerspricht dem eigenen Vorbild.
   - B3: Die scheiternde Datei fehlt im Rückbau.
   - B4: `meilenstein_laeuft` wird bei M4 zur Sammel-Bestätigung.
   - B2: Neue Abhängigkeit von einem Gate-Skript.
   - B5–B10: STATUS.md-Regel, Sackgasse beim Verschieben, Grundlage A2 + B6 und `arbeitsordner.md:15`, Byte- und Zeilenplan, Leseeingaben im synchronen Abschnitt.
3. **Mitlaufend:** C1–C12.

Nicht „Blockiert“: Jeder Punkt hat einen kleinen Ausweg. Entscheidet der Challenger A1 bewusst gegen einen Schnitt (mit korrigierter Schätzung) und fällt A2 heraus, bleiben nur B- und C-Punkte. Mit diesen eingearbeitet wäre Plan v2 „Freigegeben mit Hinweisen“.

## Nächster sinnvoller Schritt
1. Challenger/Stefan entscheidet A1: Schnitt B5b-1b-1/-1b-2 oder ein Paket mit etwa 0,6–0,8 AT. Dazu A2: P-Ist streichen oder belegt bestätigen. Bis dahin stoppt der Bauende.
2. Plan v2 (je Teilpaket) arbeitet B1–B10 und die Empfehlungen der Tabelle ein. Kein zweiter Advisor-Pass (Regel 3a).
3. Im Bau: zuerst Kern und Detail in §2 einschließlich `arbeitsordner.md:15`, mit Byte-Nachweis gegen 17 800 B; dann der Code; Server-Ausgleich vor dem neuen Block. Danach code-reviewer und qa mit frischem Kontext, höchstens eine Korrekturrunde.
4. Der Bauende misst, was ich nicht messen konnte: Bytes von `ARCHITECTURE.md`, Merge-Datum von #376, und ob ein Gate den Quelltext des Ausgleichs-Kandidaten liest.
