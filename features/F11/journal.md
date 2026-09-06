# Journal — F11

Anhängeprotokoll. Neue Einträge unten anfügen, bestehende nicht ändern.

## 2026-09-06 — Akte angelegt (Status READY_FOR_TECH)

`features/F11/feature.md` neu angelegt auf Grundlage der Meilenstein-2-
Challenge (`docs/projekt/zielfassung.md` §13.3, `docs/projekt/
umsetzungsplan-fassung-1.md` Abschnitt 1b) und der beiden Stefan-
Entscheidungen vom 06.09.2026:

- **E-M2-1** — der Auftragstext bekommt ein eigenes Feld in
  `AusfuehrungsEingaben` und wird dem aus dem Kontextpaket gebauten
  Evidenzteil des Prompts als getrennter Abschnitt vorangestellt. Er
  wird nie ein Kontextpaket-Element — die F-124-Entscheidung bleibt in
  Kraft.
- **E-M2-2** — ein Auftrag ist ein Kontrollartefakt und hält N Läufe,
  ohne Automat. Welcher Lauf als Nächstes startet, wählt weiterhin
  ausschließlich der Mensch (Orchestrierungs-Stufe 1).

Neun Akzeptanzkriterien (AK1–AK9), drei Workstreams (WS-1 → WS-2 → WS-3),
Blocker gegen den Doku-PR, der Meilenstein 2 erst in der Sollquelle
verankert (F-129).

## 2026-09-06 — WS-1 umgesetzt (AK1, AK2, AK3), Status IN_ARBEIT

Grundlage: `state/plan-v1-f11-auftrag-ws1.md` (Advisor-freigegeben mit
Hinweisen, `71cf0c7`), `state/tasks/f11-auftrag-ws1.md`. Vier offene
Fragen des Plans vorab von Stefan entschieden: Option B für den
`leitstand-server.mjs`-Konflikt, Trennzeichen `===`, `check-f11-
auftrag.mjs` bereits ab WS-1, keine eigene `auftrag_id`-Zeichenregel.

- **AK1** — neues, eigenständiges Modul `src/auftrag/{index,types}.ts`
  (D1, ruft F2s `registriereKernArtefakt` nur von außen auf). Ein Auftrag
  wird als `AUFTRAG_V0` unter `auftrag-<auftragId>` registriert, `eingaben:
  []` (D2, Wurzelknoten). Schema `schemas/kontrollzustand-auftrag-payload.
  schema.json` plus drei Beispiele. Ein `node:test`-Fall in
  `src/auftrag/auftrag.test.ts`.
- **AK2** — `AusfuehrungsEingaben` bekommt das Pflichtfeld `auftragstext:
  string`. `fuehreAufgabeDurch` baut `promptText` jetzt als
  `Auftrag:\n<auftragstext>` (leeres Kontextpaket) bzw.
  `Auftrag:\n<auftragstext>\n\n===\n\n<evidenzText>` (nichtleeres
  Kontextpaket) — `bauePromptAusKontextpaket` selbst bleibt unverändert
  (F-124-Vertrag). Zwei neue Tests in `execution-controller.test.ts`
  belegen beide Fälle über die real an F6a übergebenen `-p`-Tokens.
- **AK3** — mechanisch zweistufig geprüft: (a) Grep-Gate in
  `scripts/check-f11-auftrag.mjs` mit Selbsttest, dass `auftragstext` nie
  im anfragen-Konstruktionsblock von `src/execution-controller/index.ts`
  auftaucht, nur im Prompt-Zusammensetzungsteil danach; (b) Laufzeit-Test
  in `execution-controller.test.ts` — zwei reale Läufe mit
  unterschiedlichem `auftragstext` (einer mit UUID-Marke) belegen, dass
  die Marke nie im registrierten Kontextpaket auftaucht und die
  Elementanzahl unverändert bleibt.
- **Option B** (`leitstand-server.mjs`): `ERLAUBTE_STARTAUFTRAG_FELDER`,
  `PFLICHT_STARTAUFTRAG_FELDER` und `pruefeStartauftrag`s
  `eingaben`-Rückgabe um `auftragstext` erweitert — reine Formprüfungs-
  Erweiterung, keine Verhaltens-/Routen-Änderung. `scripts/check-f10-
  leitstand.mjs`s `gueltigerStartauftrag`-Fixture ebenso, plus ein neuer
  Testfall: Startauftrag ohne `auftragstext` → 400 "Pflichtfeld
  'auftragstext' fehlt".
- `scripts/check-f11-auftrag.mjs` in `npm run check` und
  `npm run check:template` eingehängt (`package.json`).
- Nicht angefasst: F6a (`starteGateway`/`GatewayEingaben`),
  `public/leitstand/`, `baueAufruf`, AK4-9, Lauf→Auftrag-Lineage (an WS-2
  delegiert, plan Abschnitt 2.2/D5), keine eigene `auftrag_id`-
  Zeichenregel (D5, erbt F1s `pruefeLaufId`).
- `npm run check` → Exit 0, `tests 137, pass 137, fail 0` (siehe
  `state/gates.md` für die vollständigen Rot-/Grün-Fall-Belege).
- Status `READY_FOR_TECH` → `IN_ARBEIT` (WS-2/WS-3 stehen noch aus, kein
  `ABGESCHLOSSEN`).

**Reviewer-/QA-Pass (frischer Kontext, F-046), beide „Freigegeben mit
Hinweisen", keine Blocker:**

- **code-reviewer:** `FUNKTIONSSTART_MARKER` in `scripts/check-f11-
  auftrag.mjs` weicht bewusst vom Vertragswortlaut (state/tasks/f11-
  auftrag-ws1.md Punkt 9(b), Ganze-Datei-Teilung) ab — notwendige
  Korrektur, da eine Ganze-Datei-Teilung sich an der eigenen
  Dateikopf-Prosa von `src/execution-controller/index.ts` (die
  `auftragstext` bereits vor der Funktion erwähnt) falsch-positiv
  gemeldet hätte (real geprüft). Nachgetragen: erklärender Kommentar im
  Gate-Skript selbst.
- **qa:** AK3(a)-Grep-Gate ist ein reiner Substring-Vergleich, keine
  AST-/Semantikprüfung — ein künftiger, nicht-adversarialer Refactor
  (ausgelagerte Hilfsfunktion/Konstante außerhalb des geprüften Fensters,
  oder ein zweiter `baueKontextpaket`-Aufruf) würde nicht erkannt. Kein
  WS-1-Blocker (das Gate deckt genau den in AK3 benannten Verstoßtyp ab),
  jetzt im Gate-Skript als bekannte Grenze dokumentiert statt implizit.
  Drei weitere, als unkritisch eingestufte Lücken (kein Typ-Check für
  nicht-string `auftragstext` im Leitstand-Body — bewusst, konsistent mit
  den übrigen Feldern ohne Typ-Check, siehe `state/tasks/f11-auftrag-
  ws1.md`; kein Test für `===` im Auftragstext selbst; keine
  Laufzeit-Validierung von `titel`/`auftragstext` auf Nichtleere in
  `registriereAuftrag`, konsistent mit F5s `baueKontextpaket`, das
  ebenfalls nicht zur Laufzeit validiert) — alle drei bewusst nicht in
  WS-1 behoben, ggf. Gegenstand von WS-2.

## 2026-09-06 — WS-2 umgesetzt (AK4, AK5, AK6, AK7, AK9), Status weiterhin IN_ARBEIT

Grundlage: Handoff-Auftrag WS-2 (Startvorlage, erweiterte Feldsperre,
Server-Evidenzlesen, D13-Sperre, Gate-Erweiterung), gebaut ohne separaten
Advisor-Pass-Zyklus (Randbedingungen des Auftrags erlaubten kleine,
reversible Designentscheidungen direkt im Bau).

- AK4 — neuer Top-Level-Ordner `startvorlagen/` (analog `profiles/`,
  eigenes Schema `schemas/startvorlage.schema.json`, eigene Beispiele unter
  `schemas/examples/startvorlage.*.json`) mit einer realen Datei
  `startvorlagen/beispielprojekt.json`. Trägt `werkzeugStartziel`,
  `werkzeugVersionDeklariert`, `berechtigungskontext`, `profilPfad`,
  `modell`, `standardBudget` sowie mindestens einen lesenden und einen
  schreibenden benannten Werkzeugsatz (`art: 'lesend'` bzw. `'schreibend'`,
  geprüft von `validiereStartvorlageDaten` — JSON-Schema allein kann
  "mindestens je ein Eintrag pro Art" nicht ausdrücken). Neues,
  eigenständiges Modul `src/startvorlage/{index,types}.ts` (D1):
  `ladeStartvorlage` liest+prüft einmal beim Serverstart (wirft bei
  Fehlschlag — Konfigurationsfehler, kein Fachergebnis),
  `leiteProfilReferenzAb` berechnet die ProfilReferenz frisch aus dem
  echten Dateiinhalt (Muster: AK1 in `scripts/check-f10-leitstand.mjs`),
  nie aus einem im Repo mitgeführten Hash. Eigener `node:test`-Fall
  `src/startvorlage/startvorlage.test.ts`.
- AK5 — `werkzeugStartziel`, `werkzeugVersionDeklariert`,
  `berechtigungskontext`, `profilReferenz` aus `ERLAUBTE_STARTAUFTRAG_
  FELDER`/`PFLICHT_STARTAUFTRAG_FELDER` entfernt und in einen neuen
  `VERBOTENE_STARTVORLAGE_FELDER`-Satz überführt (gleiches
  Ablehnungsmuster wie `VERBOTENE_OPTIONEN_FELDER`, eigener
  Ablehnungsgrund). Neues Pflichtfeld `werkzeugsatz: string` wählt einen
  benannten Werkzeugsatz aus der Startvorlage; `aufrufEingaben.werkzeugsatz`
  (eine freie `erlaubte_werkzeuge`-Liste) wird jetzt explizit abgelehnt.
  Die bestehende `AusfuehrungsOptionen`-Sperre (F10 AK3) bleibt
  unverändert daneben bestehen.
- AK6 — `anfragen[]` darf kein `inhalt`-Feld mehr enthalten (400,
  `pruefeStartauftrag`). Neue reine Funktion `loeseEvidenzPfadAuf`
  (absoluter Pfad → 400, `..`-Segment → 400, außerhalb der Repo-Wurzel
  aufgelöst → 400 über Wiederverwendung von F3s `leiteRepoRelativenPfadAb`,
  D5). Der Request-Handler prüft danach `existsSync` (fehlende Datei →
  400, nie leerer Inhalt) und liest die Datei erst dann real.
- AK7 (D13) — reine In-Memory-Variable `laufAktiv` in
  `erzeugeRequestHandler`, geprüft VOR der laufId-spezifischen 409-Prüfung
  (eigener, von der laufId-Kollision unterscheidbarer Ablehnungsgrund mit
  "D13" im Text), gesetzt unmittelbar vor dem `fuehreAufgabeDurchFn`-Aufruf,
  zurückgesetzt in JEDEM Rückkehrzweig (`.then` UND `.catch`, unabhängig
  vom `ok`-Wert) — anders als die laufId-Reservierung, die nur bei
  `ok:false`/Wurf freigegeben wird. Nie aus `kontrollzustand/` abgeleitet
  (F-128): ein Serverneustart setzt sie zurück, ein alter, verwaister
  `KLAERUNG_ERFORDERLICH`-Lauf blockiert nicht.
- AK9 — `scripts/check-f11-auftrag.mjs` um vier Blöcke erweitert: (c0)
  Startvorlage-Fixtures + reale Datei gegen `validiereStartvorlageDaten`;
  (c) AK5 direkt gegen `pruefeStartauftrag` (Grün-/Rotfall, ohne Server);
  (d) AK6 direkt gegen `loeseEvidenzPfadAuf` + `pruefeStartauftrag`
  (Grün-/vier Rotfälle); (e) AK7 als Grep+Selbsttest nach dem AK3-Muster
  aus WS-1 (D13-Sperre ist closure-gekapselt, deshalb ohne Live-Server
  nicht direkt aufrufbar). `scripts/check-f10-leitstand.mjs` um drei echte
  Live-Server-Testfälle erweitert: F11 AK5 (verbotenes Startvorlage-Feld
  bzw. freie Werkzeugliste → 400), F11 AK6 (`inhalt`, drei unsichere
  Pfade, fehlende Datei → je 400), F11 AK7 (zweiter Start mit ANDERER
  laufId während laufendem Lauf → 409 mit "D13" im Grund, nach Rückkehr
  gelingt ein neuer Start). Rot-/Grün-Fall-Belege in `state/gates.md`
  nachgetragen.
- Startformular (`public/leitstand/app.js`): `baueWiederaufnahmeVorlage`
  auf die neue Feldmenge umgestellt (kein `profilReferenz`/
  `werkzeugStartziel`/`werkzeugVersionDeklariert`/`berechtigungskontext`
  mehr, stattdessen ein `werkzeugsatz`-Platzhalter); dabei nebenbei eine
  vorbestehende Lücke aus WS-1 behoben — die Vorlage hatte `auftragstext`
  (seit AK2 Pflichtfeld) schlicht vergessen.
- [EMPFEHLUNG] `profilPfad` in der Startvorlage statt eines mitgeführten
  Hash-Werts — der Server berechnet die ProfilReferenz beim Laden der
  Startvorlage einmal frisch aus dem echten Dateiinhalt
  (`leiteProfilReferenzAb`), damit kann ein veralteter, im Repo gepflegter
  Hash nie unbemerkt divergieren.
- [EMPFEHLUNG] benannte Werkzeugsätze tragen ein explizites
  `art: 'lesend'|'schreibend'`-Feld statt die Art aus den enthaltenen
  Werkzeugnamen (z. B. Vorkommen von "Write") zu erraten — vermeidet eine
  stillschweigende Annahme über konkrete Werkzeugbezeichner.
- [EMPFEHLUNG] `standardBudget` steht in der Startvorlage (AK4-Wortlaut
  erfüllt), wird aber nicht automatisch angewendet, wenn der Body ein
  eigenes `budget` mitliefert — AK5 verlangt keine Sperre für `budget`,
  Budget ist nicht sicherheitsrelevant wie die anderen vier Felder (YAGNI,
  keine Vermischung von Konfigurationsvorgabe und Laufzeitparameter ohne
  belegten Bedarf).
- [EMPFEHLUNG] `modell` in der Startvorlage bleibt aus demselben Grund
  wie `standardBudget` ohne Wirkung auf den Request — der Client bestimmt
  das Modell weiterhin frei über `body.aufrufEingaben.modell`. AK5 zählt
  explizit vier zu sperrende Felder auf (`werkzeugStartziel`,
  `werkzeugVersionDeklariert`, `berechtigungskontext`, `profilReferenz`)
  und nennt `modell` dort bewusst nicht — die Startvorlage trägt `modell`
  als dokumentierten Standard-/Referenzwert (AK4-Wortlaut), ohne ihn
  serverseitig durchzusetzen. Reviewer-Pass (2026-09-06) hat diesen Punkt
  als klärungsbedürftig markiert; hiermit nachträglich als bewusste,
  AK5-konforme Entscheidung dokumentiert statt stillschweigend im Code.
- Lauf→Auftrag-Lineage-Mechanismus (`state/plan-v1-f11-auftrag-ws1.md`
  Abschnitt 2.2, D5) — in WS-1 explizit an WS-2 delegiert, aber in
  `feature.md` keiner der neun AK zugeordnet. In WS-2 erneut geprüft:
  keine der bearbeiteten AK4/AK5/AK6/AK7/AK9 verlangt ihn, und der im
  WS-1-Plan skizzierte Kontextpaket-seitige Mechanismus würde AK3s
  Trennung von Auftrag und Evidenz aufweichen. Bewusst weiterhin nicht
  gebaut — offener Punkt, keine stillschweigende Streichung; eine
  Entscheidung darüber (ob überhaupt, und wenn ja in welcher Form) bleibt
  Stefan vorbehalten.
- Nicht angefasst: AK8 (reale Nachweisläufe, WS-3), Zustandsautomat/
  Workstream-Ebene (E-192/F-090, unverändert Nicht-Ziel).
- `npm run check` → Exit 0, `tests 143, pass 143, fail 0` (siehe
  `state/gates.md` für die vollständigen Rot-/Grün-Fall-Belege).

**Reviewer-/QA-Pass (frischer Kontext, F-046), code-reviewer „Freigegeben
mit Hinweisen" (keine Blocker), qa initial „Blockiert" (Verdacht auf
Byte-Korruption, real geklärt, kein Blocker mehr):**

- **code-reviewer:** vier Hinweise, alle behoben oder dokumentiert —
  `leiteProfilReferenzAb` validiert `version` jetzt zur Laufzeit (Integer,
  sonst Wurf) statt eines reinen Typ-Casts; `loeseEvidenzPfadAuf` trägt
  jetzt einen Kommentar zur Symlink-Grenze (reine String-Prüfung, kein
  `realpathSync` — vertretbar im 127.0.0.1-Einzelnutzer-Bedrohungsmodell,
  aber vorher unerwähnt); `modell` und die Lauf→Auftrag-Lineage-Delegation
  oben als bewusste Entscheidungen nachdokumentiert statt stillschweigend
  im Code zu bleiben.
- **qa:** meldete zunächst „Blockiert" wegen eines vermuteten,
  nicht-druckbaren Bytes in `scripts/leitstand-server.mjs` nahe
  `LAUFID_UNZULAESSIGE_ZEICHEN` (Ripgrep/`git diff` zeigen die Datei dort
  als Binärdatei). Real geprüft: Byte-für-Byte-Vergleich gegen
  `origin/main` zeigt denselben Steuerzeichen-Bereich `[\x00-\x1f]` bereits
  in der WS-1-Fassung — vorbestehend, unverändert von WS-2, kein
  Korruptionsschaden, keine adressierte Zeile in diesem Diff (bestätigt
  über `git diff --text` — die Zeile erscheint als reine Kontextzeile,
  kein `+`/`-`). Der Fund selbst bleibt real (rohe Steuerzeichen im
  Quelltext sind für zeilenbasierte Werkzeuge fragil), betrifft aber
  WS-1-Code außerhalb des WS-2-Auftrags — nicht in diesem Schritt
  angefasst, Stefan zur Kenntnis. Zwei der übrigen qa-Funde real
  nachgezogen: (a) `check-f10-leitstand.mjs` bekam einen neuen Testfall,
  der belegt, dass ein verwaister, unabgeschlossener Lauf aus
  `kontrollzustand/` (simuliert eine frühere, abgestürzte Serverinstanz)
  einen neuen Start NICHT blockiert (F-128, AK7 zweite Garantie, bisher nur
  „by construction" begründet, jetzt live getestet); (b) die 409-Antwort
  bei aktiver D13-Sperre nennt jetzt die aktive `laufId`
  (`laufAktivLaufId`) für bessere Diagnostizierbarkeit eines hängenden
  Laufs. Drei weitere, niedrig eingestufte Funde (Symlink — bereits über
  code-reviewer behoben, s. o.; kein Größenlimit vor dem synchronen
  Evidenz-Lese-Loop; keine automatisierte Konsistenzprüfung zwischen
  `app.js`s Platzhaltervorlage und dem Server-Feldvertrag) bewusst nicht
  in WS-2 behoben — passend zum Bedrohungsmodell (127.0.0.1,
  Einzelnutzer) und Nicht-Ziel-Rand (Timeout/Abbruch ist F14).
- `npm run check` → Exit 0, `tests 143, pass 143, fail 0` nach allen
  Nachbesserungen (unverändert gegenüber vorher, die neuen Testfälle sind
  Skript-Assertions, keine `node:test`-Fälle).
- **Selbst gefundener Fehler beim Umsetzen des qa-Hinweises (a):** der
  erste Entwurf des neuen AK7(D13)-Verwaist-Testfalls überließ
  `starteTestserver` ohne eine `fuehreAufgabeDurchFn`-Attrappe — anders als
  jeder andere Testfall in dieser Datei, der tatsächlich bis zum Aufruf
  durchläuft. Der gültige Startauftrag lief dadurch real durch F5/F6a/F4
  gegen das echte `kontrollzustand/` (nicht das Test-Basisverzeichnis, das
  der Server nur für seine eigene laufId-Prüfung nutzt — `eingaben`
  bekommt kein `basisVerzeichnis` mitgegeben). Real geprüft: kein
  Kindprozess wurde gestartet — F4s Invocation Policy hat mit „Drift im
  Gültigkeitsschlüssel: 'startziel_pfad' (E-188)" real VERWEIGERT, bevor
  ein Prozessstart erreicht wurde (Checkpoint-Inhalt geprüft). Trotzdem
  entstanden zwei echte, unbeabsichtigte Lineage-/Wirkungsmarke-Einträge
  unter dem echten `kontrollzustand/` — vor dem Commit entfernt
  (`rm -rf kontrollzustand/check-f11-ak7-verwaist-neu-*` und die
  zugehörigen `lineage-kontextpaket-*`-Verzeichnisse), Testfall um die
  Attrappe ergänzt, `npm run check` erneut Exit 0 ohne neue
  `kontrollzustand/`-Einträge in `git status`.
- **CI-Rotfall-Fix (Vor-Merge, kein eigenständiger Befund):** `isAbsolute()`
  aus `node:path` ist plattformabhängig und erkannte auf dem Linux-CI-Runner
  einen Windows-Laufwerksbuchstaben-Pfad (`C:\...`) nicht als absolut (lokal
  unter Windows unauffällig) — `loeseEvidenzPfadAuf` prüft jetzt zusätzlich
  explizit auf Laufwerksbuchstaben- und UNC-Pfad-Muster, unabhängig vom
  Ausführungs-Betriebssystem; Testfixtures unverändert.

## 2026-09-06 — WS-3 umgesetzt (AK8), Status IN_ARBEIT → ABGESCHLOSSEN

Zwei reale, über `POST /api/laeufe` ausgelöste Läufe mit echtem
Claude-Code-Kindprozess, vollständiger Beleg in
`state/e2e-nachweis-f11-ws3.md`:

- **(a) lesend** (`e2e-f11-ws3-lesend-2026-09-06-v2`, `werkzeugsatz:
  'lesend'`): Auftragstext beantwortet eine Frage zur real vom Server
  gelesenen Evidenzdatei `features/F11/feature.md` — Ergebnis `"9"`
  (korrekte AK-Anzahl), `exitCode 0`, `permission_denials: []`,
  `ABGESCHLOSSEN`/`ERFOLGREICH`.
- **(b1) schreibend, Scratch** (`e2e-f11-ws3-schreibend-scratch-2026-09-06`,
  `werkzeugsatz: 'schreibend'`): Kindprozess erzeugte real
  `scratch-f11-ws3/beweis-schreiblauf.txt` mit exakt dem verlangten
  Inhalt (neuer git-ignorierter Ordner, `.gitignore` ergänzt, Muster
  `scripts/verify-f6b-ws-g-schreiblauf.mjs`, kein `chdir`).
- **(b2) schreibend, echte Datei** (`e2e-f11-ws3-schreibend-real-2026-09-06`,
  Nachtrag `e2e-f11-ws3-schreibend-real-b2fix-2026-09-06`): zunächst
  derselbe Mechanismus gegen `state/e2e-nachweis-f11-ws3.md` selbst
  ([EMPFEHLUNG] — real getrackte, dauerhafte Nachweisdatei statt einer
  thematisch fremden Dokudatei), nach dem Reviewer-/QA-Pass ergänzt um
  einen zweiten Lauf gegen die eigens dafür angelegte, thematisch
  neutrale `state/e2e-beleg-f11-ws3-b2.md`. Beide Läufe: Kindprozess
  fügte real genau eine Zeile mit einem vorab generierten UUID-Marker
  ein, belegt über echten `git diff`, nicht über die Selbstauskunft des
  Kindprozesses.

**Echter Blocker unterwegs, real gelöst (F-136):** der erste Versuch von
Lauf (a) endete `VERWEIGERT` — `startvorlagen/beispielprojekt.json`s
`werkzeugStartziel` (npm-Global-Pfad) driftete gegen den committeten
Wirksamkeitsnachweis (erwartet `C:\Program Files\claude\claude.exe`,
E-188). Ein bisher unentdeckter Konfigurationsfehler aus WS-2, weil die
Startvorlage dort nur gegen Testattrappen geprüft wurde. Fix: einzige
Änderung an `startvorlagen/beispielprojekt.json` (`werkzeugStartziel`
korrigiert), kein Eingriff in `src/`. Danach beide Läufe real
erfolgreich.

Nicht angefasst: `src/`, Gate-Logik (`scripts/check-f11-auftrag.mjs`,
bereits in WS-2 vollständig), keine neuen AK.

`npm run check` → Exit 0, `tests 143, pass 143, fail 0` (unveränderte
Zahl gegenüber WS-2 — WS-3 fügte keinen neuen `node:test`-Fall hinzu,
reine Konfigurations-/Dokuänderung plus reale Läufe außerhalb der
Testsuite).

**Reviewer-/QA-Pass (frischer Kontext, F-046), beide „Freigegeben mit
Hinweisen", keine Blocker:**

- **code-reviewer:** vier Hinweise. (1) `npm run check`-Beleg fehlte im
  ersten Entwurf dieses Journal-Eintrags („siehe unten" ohne Fortsetzung)
  — oben nachgetragen. (2) `docs/STATUS.md` war nach dem F11-Abschluss
  noch nicht nachgezogen — ergänzt (F11 als erledigt markiert, unter
  „Erledigt" und in der Meilenstein-2-Liste). (3) der ursprüngliche
  b2-Lauf gegen die Nachweisdatei selbst sei sauber dokumentiert, aber
  eine dedizierte, eigens getrennte Datei wäre für künftige Leser
  einfacher — als Nachtrag umgesetzt (`state/e2e-beleg-f11-ws3-b2.md`,
  zweiter realer Lauf). (4) der QA-Pass fehlte zum Zeitpunkt des
  code-reviewer-Durchgangs noch — parallel nachgeholt (unten).
- **qa:** „Freigegeben mit Hinweisen", vier Funde. Zwei davon deckungsgleich
  mit dem code-reviewer-Fund (b2-Selbstbezüglichkeit; fehlender
  `npm run check`-Beleg) — beide wie oben behoben. Ein dritter, niedrig
  eingestufter Fund (Beleg-Tiefe von (b1)/(b2) unter dem
  Meilenstein-1-Referenzmuster — dort volle `checkpoints`-Liste je Lauf,
  hier teils nur der `laufStatus`-Endzustand) bewusst nicht nachgezogen:
  die relevanten Felder (`exitCode`, `permission_denials`, tatsächlicher
  Dateiinhalt/`git diff`) sind vollständig vorhanden, die vollständige
  `checkpoints`-Liste trägt für den AK8-Nachweis keinen zusätzlichen
  Belegwert. Der vierte, kritischste Fund — `feature.md`/Journal
  hätten den Status erst NACH einem dokumentierten Reviewer-/QA-Pass auf
  `ABGESCHLOSSEN` setzen dürfen, nicht davor (F-046, „nicht retroaktiv
  nachgeholt") — ist durch die Reihenfolge dieses Auftrags selbst
  entstanden (Status wurde vor Abschluss beider Pässe gesetzt); da vor
  diesem Nachtrag noch kein Commit erfolgt war, wird das hier korrigiert
  dokumentiert statt rückwirkend verschleiert: der Status gilt erst mit
  diesem vollständigen Journal-Eintrag (inklusive beider Pässe und ihrer
  Behebung) als tatsächlich abgeschlossen.
- `npm run check` nach allen Nachbesserungen erneut geprüft → Exit 0,
  `tests 143, pass 143, fail 0` (unverändert).

Status `IN_ARBEIT` → `ABGESCHLOSSEN` — F11 ist damit vollständig
umgesetzt (AK1–AK9 erbracht, Reviewer-/QA-Pass durchlaufen und
dokumentiert).
