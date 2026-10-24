# Advisor-Pass F45 B5b-1b-2 „Bereinigungsliste“ — Plan v1

Wörtlich übernommen aus dem Bericht des Subagenten `architecture-advisor` (frischer Kontext, nur Read/Grep/Glob), 24.10.2026.
Geprüfter Plan: `features/F45/plan-b5b1b2.md` (v1). Urteil: **Freigegeben mit Hinweisen**. Es gibt einen bedingten
Schnittvorschlag (B6) und zwei Punkte, die vor dem Bau bestätigt werden müssen (A1, A2). Laut Bauauftrag („schlägt der Advisor
einen Schnitt vor: STOPP und berichten“) wurde der Bau gestoppt, es ist kein Code geschrieben.

Anmerkung des Bauenden (gehört nicht zum Bericht): Weg (a) zu A1 wurde nachgemessen. Die §7-Zeile „bestehende Feature-Akte und
`docs/STATUS.md` behalten ihr Zeilenende (F45 B5)“ kostet etwa +19 B. Zusammen mit dem §2-Satz aus Plan v1 (17 798 B) ergibt das
etwa 17 817 B und liegt damit über dem Deckel von 17 800 B. Weg (a) geht also nur mit einer weiteren Kürzung von etwa 17 B oder
einer Entscheidung Stefans.

---

**Geprüfter Plan:** `features/F45/plan-b5b1b2.md` (v1, 144 Zeilen)

**Geprüft gegen:**
- `ARCHITECTURE.md`: §1 :57–63, §2 :91–97, §7 :170, §8 :181
- `docs/architektur/arbeitsordner.md` :15–16, :33–46 und `docs/architektur/wachstumsbremse.md` :10
- `scripts/architektur-kern.json`, `scripts/wachstumsbremse-server.json`
- `features/F45/plan-b5b1b-v2.md` (offene Punkte :96–106), `features/F45/advisor-b5b1b.md`, `features/F45/feature.md` :44–61, :137–143
- `scripts/leitstand/routen-planung.mjs` (ganz), `scripts/leitstand/routen-f35.mjs` :190–269
- `src/workboard/roadmap-schreiben.ts`, `src/workboard/roadmap-regeln.ts`, `src/workboard/feature-akte-pruefung.ts` (alle ganz)
- `src/feature-auftrag/planung-schreiben.ts` :1–60, :175–255, Exporte von `src/feature-auftrag/akte-schreiben.ts`, `src/workboard/feature-planung.ts` (nur die Abgenommen-Regeln)
- `scripts/check-status-akten.mjs`, `scripts/check-akte-meilenstein.mjs` (beide ganz)
- `scripts/check-f813-csrf.mjs` (3)/(4), `scripts/check-f45-b5b1b1-planung-schreiben.mjs` (m) und :348, `scripts/check-f45-b5b1a-planung.mjs` (i)
- `scripts/leitstand-server.mjs` :8075–8111, :9490–9512, :13234–13240
- `docs/projekt/roadmap.json`, `docs/projekt/roadmap-ausnahmen.json`, `docs/STATUS.md` :410–509
- Status- und Abschnittszeilen von F18, F20, F21, F22, F25; F25 :1–60
- `state/findings.md`: F-1010, F-1186 bis F-1188

**Rollengrenze:** nur Read, Grep und Glob. Kein Bash, kein git, nichts ausgeführt, nichts geschrieben.

**Nicht geprüft (blinde Flecken):**
- **Bytegröße von `ARCHITECTURE.md`:** Die 17 756 B vorher und 17 798 B nachher kann ich ohne Werkzeug nicht messen. Meine Byte-Schätzungen sind von Hand gezählt.
- **Ob die Gates und Tests heute grün sind.** Nichts davon ist gelaufen.
- **Zeilenenden:** Grep auf `\r` ist kalibriert. Es findet CR in `features/F44/nachweise/ws8b/klicks/protokoll.md`, in `docs/STATUS.md` und `docs/projekt/*` dagegen 0 Treffer. Das gilt für die Arbeitskopie, nicht für andere Checkouts.
- **Nicht gelesen:** `fixpaket-f45.md`, `zielfassung.md`, die Anzeige-Module (Folgen von LAEUFT für die Oberfläche).
- **Der Bauauftrag selbst:** Grundlage ist nur der Wortlaut, den der Aufrufer wiedergegeben hat.

## Marker-Legende
- [Fakt]: belegt (Datei:Zeile).
- [Fakt, entlastend]: belegt und in Ordnung.
- [Schlussfolgerung]: abgeleitet, nicht ausgeführt.
- [Annahme]: plausibel, aber unbelegt.
- [offene Unsicherheit]: mit diesen Rechten nicht entscheidbar.

---

## A. Vor dem Bau zu entscheiden bzw. zu bestätigen

Keiner der beiden Punkte erzwingt einen Stopp, jeder hat einen Standardweg.

**A1 Wer die Zeilenenden von STATUS.md erhält, braucht eine §7-Ausnahme. Der Plan nennt sie nicht.**
- [Fakt] Die Zeile in §7 verbietet „CRLF in Dateien, die der Kern schreibt“. Ausnahme ist nur die bestehende Feature-Akte (`ARCHITECTURE.md:170`).
- [Fakt] Der Plan ersetzt in STATUS.md nur das Wort und lässt die Zeilenenden stehen (plan :45), ohne 422 bei CRLF. CRLF-422 gilt dort nur für `roadmap.json` und die Ausnahmen-Datei (:82). §1 des Plans ändert nur §2.
- [Fakt] A3 lautet „keine neue Ausnahme in ARCHITECTURE.md §7“ (`feature.md:52`), allerdings bezogen auf `roadmap.json`. Der Advisor B5b-1b empfahl CRLF ⇒ 422 auch für STATUS.md (`advisor-b5b1b.md:207`).
- [Schlussfolgerung] Mit einer CRLF-STATUS.md, etwa in einem Fremdprojekt, schriebe der Kern eine CRLF-Datei ohne Kern-Ausnahme.
- [Schlussfolgerung, von Hand gezählt] Weg (a) kostet etwa 19 B: „bestehende Feature-Akte und `docs/STATUS.md` behalten ihr Zeilenende (F45 B5)“. Nach Plan §1 bleiben 2 B frei. Es müssten also noch etwa 17 B gekürzt werden.
- **Standardweg (a), wörtlich nach Bauauftrag:** die Zeile in §7 erweitern, im selben Schritt wie §2, mit Byte-Nachweis. Reicht der Deckel nicht, entscheidet Stefan.
- **Einfacher (b), braucht den Challenger:** CRLF in STATUS.md ⇒ 422 „von Hand“, analog A3. Hier geht dabei nichts verloren, denn STATUS.md ist LF (Grep) und `.gitattributes` setzt `eol=lf`.

**A2 B4 gilt dynamisch: Nach drei Bestätigungen in M4 wird „M4 → LAEUFT“ angeboten.**
- [Fakt] B4 lautet „nur angeboten, wenn der Meilenstein genau eine R1-Abweichung hat (heute M3/F18)“ (`feature.md:59`). Der Plan liest das als laufende Regel (Gate (a) „kein Zeitzünder“, plan :105).
- [offene Unsicherheit] Der Satz im Bauauftrag „M4 nur über vier Einzelbestätigungen Feature → ABGESCHLOSSEN“ lässt sich auch als Verbot lesen. Nach F20, F21 und F22 stünde M4/F25 → LAEUFT zur Wahl.
- [Fakt] F25 hat offene Workstreams: WS-2b und WS-3 (`STATUS.md:501–502`). Für F25 ist „→ LAEUFT“ fachlich sogar der passendere Weg.
- **Empfehlung:** die Lesart des Plans beibehalten (Wortlaut `feature.md:59`). Stefan bestätigt sie im Bericht; der Plan v2 nennt die Folge ausdrücklich.

---

## B. In Plan v2 festlegen (ohne neue Entscheidung)

**B1 Gate b5b1a (i) wird bei Stefans erster echter Bestätigung rot.**
- [Fakt] `check-f45-b5b1a-planung.mjs:257` verlangt, dass die echte Ausnahmen-Datei genau `['M3/F18','M4/F20','M4/F21','M4/F22','M4/F25']` enthält.
- [Fakt] Der Plan erwähnt das nicht. b5b1a fehlt in der Gate-Liste (§7, :128–130).
- **Empfehlung:**
  - (i) auf „Teilmenge der fünf, jede mit `GRUND_BEREINIGUNG_OFFEN`“ umstellen.
  - b5b1a in §7 aufnehmen.
  - Rot-Nachweis: ein fremdes Paar ⇒ rot.

**B2 Das Feld `.methode` kollidiert mit Gate b5b1b1 (m).**
- [Fakt] (m) prüft `!modul.includes('.method')` (`check-f45-b5b1b1-planung-schreiben.mjs:423`). Jedes `route.methode` oder `planungRoute.methode` in `routen-planung.mjs` trifft das, auch in JSDoc. check-f813 (4) `/\.method\b/` trifft `.methode` dagegen nicht (`check-f813-csrf.mjs:301`).
- [Fakt] Das b5b1b1-Gate ruft `fuehrePlanungRouteDurch({ art: 'planung', rohId })` ohne `methode` auf (:348).
- **Empfehlung:**
  - Das Modul verzweigt nur über `art`. Das Wort `.methode` erscheint dort nirgends, auch nicht in Kommentaren (`wachstumsbremse.md:10`).
  - Der Vergleich `req.method !== planungRoute.methode` bleibt im Server.
  - Den Kopf des Moduls um das Feld ergänzen (DEKLARIERT, Zwischenmuster).

**B3 Gate vor dem Schreiben: Was „neu“ heißt, und es fehlt ein Grün-Fall.**
- [Fakt] In 1b-1 vergleicht R1 vorher und nachher mit derselben Ausnahmenliste (`routen-planung.mjs:216–224`). In 1b-2 unterscheiden sich die Ausnahmen vorher und nachher.
- **Empfehlung:** den Vergleich als Helfer `neueR1Befunde(alt, neu, statusAlt, statusNeu, ausnahmenAlt, ausnahmenNeu)` herausziehen, statt eine zweite Kopie zu schreiben.
- [Schlussfolgerung] Steht in M eine verwaiste Ausnahme, ändert sich bei `meilenstein_laeuft` ihr Befundtext („Feature ist ABGESCHLOSSEN“ wird zu „Meilenstein steht auf LAEUFT“, `roadmap-regeln.ts:116`, :118). Das zählt als neu und ergibt 422. Das ist fail-closed und in Ordnung, gehört aber DEKLARIERT. Der Fall taugt als Rot-Fall.
- [Fakt] `ARCHITECTURE.md:181` verlangt für ERZWUNGEN einen Rot- und einen Grün-Fall. Die Gate-Liste hat keinen Grün-Fall: Ein Altbefund in einem anderen Meilenstein blockiert eine Bestätigung nicht.

**B4 Offener Punkt 6: Die Begründung der Reihenfolge stimmt nicht.**
- [Fakt] Bricht der Prozess nach der Akte ab, ist die Ausnahme verwaist („Feature ist ABGESCHLOSSEN“, `roadmap-regeln.ts:118`). In umgekehrter Reihenfolge entstünde eine Abweichung ohne Ausnahme (:109). Bei LAEUFT gilt „Meilenstein steht auf LAEUFT“ (:116).
- [Schlussfolgerung] Jeder Teilstand ist R1-rot, also sichtbar. Die Reihenfolge kann bleiben. Im Plan v2 heißt es dann: „Abbruch ⇒ R1 rot, sichtbar (DEKLARIERT)“ statt „nie ungedeckt“.

**B5 Unnötige Komplexität.**
- [Fakt] Der Bestand führt jede Ausnahme in genau einer Zeile (`roadmap-ausnahmen.json:4–8`).
  - [Schlussfolgerung] Der zeichenweise JSON-Scanner in `entferneStatusAusnahme` (plan :36–40) ist für einen Fall gebaut.
  - Einfacher: die eine Zeile entfernen, deren Inhalt ohne Komma das Paar ergibt; beim letzten Element das Komma davor entfernen. Dann der Rundlauf wie geplant. Jede andere Form ⇒ 422 „von Hand“.
- [Fakt] Das Anhängen der Änderungszeile gibt es schon zweimal: `akte-schreiben.ts:354–391` und `planung-schreiben.ts:231–239`. `akte-abschliessen.ts` wäre die dritte Kopie. Empfehlung: einen gemeinsamen Helfer in `akte-schreiben.ts` exportieren.
- [Fakt] `findeAbschnitt` ist schon exportiert (`src/feature-auftrag/index.ts:104`). Der Plan behauptet hier fälschlich ein „Export statt Kopie“ (:65).
- [Schlussfolgerung] `STATUS_MD_STANDARDFORM` gehört nicht in `roadmap-schreiben.ts`. Diese Datei importiert `projektkontext` (:23), `check-status-akten` zöge das mit. Besser ein eigenes Modul ohne Importe, z. B. `src/workboard/status-md.ts`.

**B6 Zuschnitt.**
- [Fakt] 1b-2 ist größer als 1b-1:

  | | 1b-1 | 1b-2 |
  |---|---|---|
  | Routen | 1 | 2 |
  | Schreibziele | 2 | 4 |
  | reine Module | 2 | 3 (eines um 4 Funktionen erweitert) |
  | Gate-Fälle | — | 13 (a)–(m), mehrere davon mehrfach |
  | Schätzung | — | 0,3–0,4 AT (`feature.md:141`) |

- [Fakt] Bei Paketen mit Advisor-Auflagen lag das Ist bisher etwa beim Doppelten (`advisor-b5b1b.md:60`).
- [Schlussfolgerung] Ein Baudurchgang plus eine Korrekturrunde reicht knapp, wenn gekürzt wird:
  - die Restfälle aus F-1188 herausnehmen; F-1188 bleibt offen;
  - B5 umsetzen;
  - die Helfer aus 1b-1 wiederverwenden.

  Realistisch sind etwa 0,45–0,6 AT. Die Schätzung im Plan v2 korrigieren.
- **Schnittvorschlag, nur falls der Challenger mehr Sicherheit will:**
  - **1b-2a:** GET plus reine Vorschlagslogik (2.2). Liest nur, ohne §2/§7.
  - **1b-2b:** POST, Schreibhelfer (2.1, 2.3), §2/§7, Gate-Fälle (b)–(l).

  So kommt die Kern-Ausnahme erst mit dem Schreiben.

---

## C. Mitlaufend im Bau

- **C1 UTF-8-Prüfung:** Plan :81 verlangt „UTF-8 je Datei ⇒ 422“ für alle vier Dateien, CRLF aber nur für Schreibziele (Punkt 4). Empfehlung: UTF-8 nur für Schreibziele und geparste Dateien prüfen, eine Regel.
- **C2 Wann `feature_abgeschlossen` angeboten wird:** ausdrücklich nur bei `featureStatus !== null && !== 'ABGEBROCHEN'`. `setzeAkteAbgeschlossen` lehnt „Status fehlt“ ohnehin mit 422 ab (plan :60).
- **C3 STATUS.md-Überschriften:** Nach M → LAEUFT stimmen „Meilenstein 3 — abgeschlossen“ und „Meilenstein 4 — abgeschlossen“ nicht mehr (`STATUS.md:412`, :474). Keine Maschine prüft das. Lösung: ein `hinweis` in der Antwort oder DEKLARIERT.
- **C4 Datum in `Abgenommen:`:** Es ist das Datum der Bestätigung, nicht der Abnahme (F20 AK7 ACCEPT 14.09.2026, `STATUS.md:483–485`). DEKLARIEREN. Das Format trägt es: `feature-planung.ts:11`.
- **C5 F-1010 nicht schließen:** „erledigt“ (plan :123) kommt zu früh. Die Maßnahme umfasst die Bestätigung durch Stefan (`findings.md:7386`), die Anzeige fehlt bis B5b-2, und die fünf Einträge sind offen. Empfehlung: Nachtrag „Mechanik erledigt“, Status offen.
- **C6 Gate-Aufbau:**
  - (j) läuft über einen Modulaufruf mit `schreibe`, über HTTP geht das nicht. Das im Plan sagen (wie `check-f45-b5b1b1:348`).
  - In der Attrappe sind `check-akte-meilenstein` und `check-status-akten` schon vorher grün, sonst beweist „danach grün“ nichts.
  - Dafür braucht die Attrappe Standardformen auch für F15 bis F17 (`check-status-akten.mjs:100–105`).
- **C7 Hashes nach dem POST:** Die Antwort trägt nur die Hashes des bestätigten Eintrags. Roadmap, Ausnahmen und STATUS.md teilen sich alle Einträge, deshalb muss vor der nächsten Bestätigung neu geladen werden. Hinweis für B5b-2 in der Akte.
- **C8 Meilenstein-ID mit `/`:** Ein solcher Meilenstein ist nicht adressierbar (`pruefeEintrag`). DEKLARIEREN.
- **C9 Köpfe nachziehen:**
  - `routen-planung.mjs:4–30`: „Ausnahmen-Datei … wird nur gelesen“ (:26) ist danach falsch.
  - „Wird aufgerufen von“ in `roadmap-schreiben.ts`, `roadmap-regeln.ts:9` und `check-status-akten.mjs`.
  - `arbeitsordner.md:46`.

---

## Offene Punkte 1–7

| Punkt | Urteil | Begründung, Beleg |
|---|---|---|
| 1 Sperre auch bei `meilenstein_laeuft` | eine Regel für beide | Der Bauauftrag sagt „Sperre bei laufendem Ablauf 409“ ohne Unterscheidung; einfacher; fail-closed. Kosten: Ein Ablauf an F18 sperrt M3 → LAEUFT. DEKLARIEREN. `routen-f35.mjs:244–254` |
| 2 „GET listet heute genau 5“ | trägt | Die Attrappe prüft genau 5. Das echte Repo prüft nur Invarianten. Zusätzlich muss b5b1a (i) entschärft werden (B1). |
| 3 Abweichung ohne Ausnahme | listen und bestätigbar | `abweichungen` enthält sie (`roadmap-regeln.ts:108–109`); Fremdprojekte haben keine Ausnahmen-Datei. Das Entfernen der Ausnahme entfällt, der Grün-Fall gehört ins Gate. |
| 4 CRLF-422 nur bei Schreibziel | konsistent mit 1b-1 | `routen-planung.mjs:193` prüft nur, wenn `roadmap.json` beteiligt ist. STATUS.md siehe A1, UTF-8 siehe C1. |
| 5 Kern-Kürzung | „, startet“: kein Verlust; „(Status-Wort)“: leicht schwächer | Das Detail trägt „nur … genau einer Standardform“ und widerspricht dem Kern nicht. Bleiben Bytes übrig (A1 kostet welche), „nur“ behalten. |
| 6 Schreibreihenfolge | Reihenfolge bleibt, Begründung falsch | Jeder Teilstand ist R1-rot (B4). `roadmap-regeln.ts:109`, :116, :118 |
| 7 `Abgenommen: <datum>` ohne Zusatz | tragfähig | Bauauftrag wörtlich, der Grund steht in der Änderungszeile. Das Datum ist das der Bestätigung (C4). |
| F-1187 Verschieben | nicht anbieten, kein Bedarf belegt | Den Handweg gibt es: Ausnahme von Hand entfernen, dann PUT `…/planung`. Der Altbefund blockiert dabei nicht (`routen-planung.mjs:221–224`). Für F25 gibt es nach A2 zusätzlich „M4 → LAEUFT“. |

---

## Entlastende Befunde (geprüft und in Ordnung)

- [Fakt, entlastend] **Server-Zeilen:** Der Server hat 13 240 Zeilen (`leitstand-server.mjs:13240`), genau die Grenze (`wachstumsbremse-server.json:2`). Der Block :9503–9512 bleibt mit Vergleich (:9507) und ternärem Körper (:9509) bei ±0.
- [Fakt, entlastend] **Kein früherer Dispatch fängt die neuen Pfade ab:** `/api/roadmap` wird exakt verglichen (:8266). Es gibt kein Präfix oder Muster für `/api/roadmap/`, kein Suffix `/bereinigung` oder `/bestaetigen` (`wachstumsbremse-server.json:44–75`).
- [Fakt, entlastend] **CSRF und Host:** Der CSRF-Haken lässt nur GET und HEAD durch (:8097), der Host-Haken prüft jede Methode (:8087). Gate (k) mit CSRF-Probe nur für POST und Host-Probe für beide Routen ist richtig.
- [Fakt, entlastend] **STATUS.md:** Jedes der fünf Features hat genau eine Standardform (multiline-Grep: :421, :481, :487–488, :491–492, :501). Der Umbruch bei F21 und F22 ist durch `\s*` abgedeckt (`check-status-akten.mjs:49`).
- [Fakt, entlastend] **Keine CR auf der Platte:** Grep findet kein `\r` in `docs/STATUS.md` und `docs/projekt/*`.
- [Fakt, entlastend] **Die fünf Akten:**
  - Status-Zeilen: F18:13, F20:13, F21:13, F22:14, F25:11.
  - Keine trägt `Abgenommen:`, `Priorität:` oder `## Änderungen`.
  - Workstreams stehen als Aufzählung (F25:38–42), nicht als strenge Tabelle, also gilt keine Abgenommen-Pflicht (`feature-planung.ts:264`).
- [Fakt, entlastend] **Status-Regel:** Gate, Routen und `check-status-akten` lesen den Status mit derselben Regel `^Status:[ \t]*(\S+)` (`feature-akte-pruefung.ts:22`, `check-status-akten.mjs:61`).
- [Fakt, entlastend] **Beide Gate-Skripte laufen auch in der Attrappe:** Sie lesen Daten relativ zum Arbeitsverzeichnis und importieren relativ zum Skript (`check-akte-meilenstein.mjs:49`, :161, :169; `check-status-akten.mjs:44–45`).
- [Fakt, entlastend] **Wiederverwendung statt neuer Helfer:** `schreibeMitRueckbau`, `leseAktenStatus`, `leseBytes` und `alsText` liegen schon im selben Modul (`routen-planung.mjs:63–136`).
- [Fakt, entlastend] **Wettlauf:** Der synchrone Abschnitt (`routen-planung.mjs:172`) verhindert, dass PUT `…/planung` und POST `…/bestaetigen` sich verschränken. PUT liest die Ausnahmen-Datei ohne Hash (:211), aber synchron, das ist unschädlich.
- [Fakt, entlastend] **Status-Fenster in `roadmap.json`:** Fenster plus Rundlauf über die ganze Struktur (`roadmap-schreiben.ts:54–72`, :112) fängt eine abweichende Schlüsselreihenfolge ab. Im Bestand ist die Reihenfolge id, titel, status, features (`roadmap.json:17–22`).
- [Fakt, entlastend] **Entscheidungen richtig übernommen:** B4 (`feature.md:59`), O5 und E-B5-3 (:46), B6 (:56), „genau ein Eintrag“ (:61). Doppelte Ausnahmen meldet schon `leseStatusAusnahmen` (`roadmap-regeln.ts:81–84`), „genau ein Element“ ist dazu konsistent.
- [Fakt, entlastend] **Bauauftrag eingehalten:** §2 kommt zuerst (plan §0), keine Anzeige, kein Verschieben, keine Ist-Fortschreibung.

---

## Status
- [ ] Freigegeben
- [x] Freigegeben mit Hinweisen
- [ ] Nicht freigegeben
- [ ] Blockiert

**Begründung nach Schwere:** Die Grundanlage trägt. Muster, Helfer und Routenform aus 1b-1 werden sauber wiederverwendet, die R1-Folgen sind richtig erkannt, die Serverzeilen bleiben bei ±0, und der Plan entscheidet nichts still.

1. **Vor dem Bau (bestätigen, kein Stopp):**
   - A1: Die §7-Ausnahme für die Zeilenenden von STATUS.md fehlt. Standardweg (a) mit Byte-Nachweis, sonst (b) über den Challenger.
   - A2: Lesart von B4 nach drei Bestätigungen in M4.
2. **Plan v2, sicher eintretende Fehler:**
   - B1: Gate b5b1a (i) wird bei der ersten echten Bestätigung rot.
   - B2: `.methode` macht b5b1b1 (m) rot.
3. **Plan v2, Qualität:**
   - B3: Helfer für „neue Befunde“ mit getrennten Ausnahmen; Rot- und Grün-Fall.
   - B4: Begründung der Reihenfolge korrigieren.
   - B5: JSON-Scanner zeilenbasiert, Änderungszeile als gemeinsamer Helfer, eigenes Modul für die STATUS.md-Regel.
   - B6: Kürzungen, korrigierte Schätzung.
4. **Mitlaufend:** C1–C9.

Nicht „Nicht freigegeben“: Jeder Punkt ist eine örtliche Änderung im Plan v2 ohne neuen Entwurf, und für A1 gibt es einen Standardweg im Rahmen des Bauauftrags.

## Nächster sinnvoller Schritt
1. Der Challenger bzw. Stefan bestätigt A1 (Weg a oder b) und A2 in je einer Zeile. Ohne Antwort gilt bei A1 Weg (a), mit Byte-Nachweis gegen 17 800 B.
2. Plan v2 arbeitet B1–B6 und C1–C9 ein. Kein zweiter Advisor-Pass (Regel 3a).
3. Bau in dieser Reihenfolge:
   - zuerst §2, die Zeile in §7 (bei Weg a) und `arbeitsordner.md`, mit gemessener Bytezahl;
   - dann b5b1a (i) entschärfen, vor dem ersten Lauf des neuen Gates;
   - danach code-reviewer und qa mit frischem Kontext, höchstens eine Korrekturrunde.
4. Der Bauende misst, was ich nicht messen konnte: die Bytes von `ARCHITECTURE.md`, und ob b5b1a, b5b1b1, check-f813, check-f814 und check-wachstumsbremse-server nach dem Bau einzeln grün sind.
