# Advisor-Pass F45 FB-2 „Fähigkeit bauen — Anzeige“ (Plan v1)

Stand: 23.10.2026 · Prüfling `features/F45/plan-fb2.md` · Subagent `architecture-advisor`, frischer Kontext. Bericht wörtlich
übernommen (abgelegt vom Autor des Plans, die Rollengrenze erlaubt dem Advisor kein Schreiben).

**Geprüft:** `features/F45/plan-fb2.md`, gelesen ohne Vorwissen, Branch `f45/fb2-faehigkeit-anzeige`.
**Quellen:** ARCHITECTURE.md §1/§2 (Z. 57–63, 92–98), `docs/architektur/wachstumsbremse.md`, `docs/architektur/arbeitsordner.md`,
`state/findings.md` (F-1069, F-1096, F-1167, F-1169), `scripts/leitstand/routen-faehigkeit-vorschlag.mjs`, `scripts/leitstand-server.mjs`
(2141–2147, 6505–6509, 8580–8834), `src/faehigkeiten/vorschlag.ts`, `src/execution-controller/index.ts` (173–199, 643–653),
`src/git-starter/index.ts`, `scripts/leitstand/routen-code.mjs` (30–47, 85, 416), `public/leitstand/views/workflow-abnahme.js`,
`public/leitstand/views/workflows.js` (200–277, 548–636, 1457–1575), `public/leitstand/views/workflow-entscheiden.js` (207–228, 306–308),
`public/leitstand/code-daten.js` (261–404), `public/leitstand/views/arbeitsordner-anzeige.js:232`, `fokus-daten.js`, `workboard.js:1317–1344`,
`features/F45/plan-fb1b-v2.md`, Gates `check-f45-fb1-faehigkeit-vorschlag.mjs` (280–356) und `check-f45-fb1b-faehigkeit-uebernehmen.mjs`
(200–400).

**Rollengrenze:** nur Read, Grep und Glob, kein Bash und kein Git. Deshalb **nicht** geprüft: Gates ausführen (auch nicht den
Rot-Nachweis per `git archive`); Kosten und Laufzeit von `git status`; wie git `:(icase)`-Pathspecs beim Durchlauf ungetrackter Dateien
behandelt; ob `git status` im Arbeitsordner einen Filter-Treiber startet; Zeilenzahl des Servers gegen `wachstumsbremse-server.json`.
Aussagen dazu sind als Annahme oder offene Unsicherheit markiert.

**Marker:** [Fakt] aus Datei und Zeile belegt · [Fakt, entlastend] geprüft und in Ordnung · [Schlussfolgerung] aus Fakten abgeleitet ·
[Annahme] nicht belegt · [offene Unsicherheit] mit meinen Mitteln nicht entscheidbar.

## Befunde

### Server, Projektion, Cache

**1. Offener Punkt A widerspricht §2; die Form des Felds ist offen.**
- [Fakt] §2 (plan-fb2.md:48) zeigt keine Karte, solange `faehigkeitUngesichert` kein nicht-leeres Array ist. Punkt A (Z. 150–152)
  schlägt `null` als „graue Zeile“ vor. Mit §2 würde `null` aber still verschwinden.
- [Fakt] Für fehlende Teile hat der Server ein festes Muster: „NIE stillschweigend leer, sondern als `{ status: '<Grund>' }`“
  (leitstand-server.mjs:8621). `umfang` nutzt dafür `status: 'nicht_bestimmbar'` (workflow-abnahme.js:519).
- [Fakt] Ist git nicht lesbar, wertet der Laufdiff das als Treffer, und der Lauf wird rot (execution-controller/index.ts:183–185).
- [Schlussfolgerung] Ein nicht bestimmbarer Stand ist für den nächsten Lauf genauso gefährlich wie ein ungesicherter. Er gehört sichtbar
  angezeigt.
- Empfehlung: `faehigkeitUngesichert: { status: 'ok', pfade, anzahl } | { status: 'nicht_bestimmbar', grund }`. Bei `ok` ohne Pfade fehlt
  das Feld weiter (bitgleich, Gate fb1 (p2)). §2, Gate (a) und Gate (d) daran anpassen. **Vor Baubeginn.**

**2. Fehlerpfad: `baueVorschlagFelder` hat keinen Vertrag „wirft nie“.**
- [Fakt] Die Serverzeile ruft die Funktion ohne try/catch auf (leitstand-server.mjs:8813, im Plan Z. 43).
- [Fakt] `baueVorschlagProjektion` sichert „Wirft nie“ ausdrücklich zu (routen-faehigkeit-vorschlag.mjs:67). Die neue Funktion kommt dazu:
  lstat-Signatur, Cache, Parsen der git-Ausgabe.
- [Schlussfolgerung] Ein Wurf dort macht aus GET `…/abnahme` eine 500. Dann fällt die ganze Abnahme aus, auch Fokus und Workboard
  (`fokus-daten.js:66`, `workboard.js:1335`).
- Empfehlung: „wirft nie; jeder Fehler wird zu `nicht_bestimmbar` bzw. zu den Vorschlägen wie bisher, geloggt“ in den Plan schreiben und
  mit einem Rotfall-Test belegen. **Vor Baubeginn.**

**3. „Dieselbe Sicht wie `leseClaudeAenderungen`“ stimmt nicht.**
- [Fakt] `leseClaudeAenderungen` ruft `git status` ohne Pathspec auf. Danach filtert es in JS jeden Pfad mit einem Segment `.claude` an
  beliebiger Stelle, ohne Unterschied der Schreibweise (execution-controller/index.ts:176, 198).
- [Fakt] Der Plan nutzt `-- :(icase).claude`. Das trifft nur `.claude` direkt unter der Wurzel (plan-fb2.md:29). Ein `pakete/x/.claude/…`
  macht den Lauf rot, bekommt aber keinen Hinweis.
- [Fakt] Der Laufdiff greift nur bei Ort-B-Läufen (execution-controller/index.ts:647–650). Der Hinweistext „Lauf mit Fähigkeiten,
  Ort-B-Skill oder Plugin“ ist deshalb richtig [entlastend].
- [offene Unsicherheit] `:(icase)` könnte die Präfix-Optimierung von git beim Durchlauf ungetrackter Dateien abschalten. Dann liefe alle
  10 s ein Durchlauf über den ganzen Arbeitsordner. Nicht gemessen.
- Empfehlung: Den Parser und Filter (Z. 187–198) als reine Funktion aus `execution-controller` exportieren und in beiden Wegen nutzen.
  Damit ist die Sicht wirklich dieselbe und es entsteht kein zweiter Parser. Danach entscheiden, ob mit Pathspec (schneller, verfehlt
  verschachtelte `.claude`) oder ohne (gleiche Sicht, voller Durchlauf). **Vor Baubeginn** entscheiden und im Plan festhalten.

**4. git-Aufruf: `git status` im Abfrageweg (Poll) und die Regeln dazu.**
- [Fakt] ARCHITECTURE.md:96 und arbeitsordner.md:50–54 verbieten `git status` nur für den Fingerabdruck des Review-Stands. Der Grund ist
  der Filter-Treiber, also „kein fremdes Programm im Leitstand“.
- [Fakt, entlastend] Es gibt schon einen Präzedenzfall für `git status` im Leitstand: `routen-code.mjs:416`. Dort laufen immer
  `--no-optional-locks` und `-c core.fsmonitor=false` mit, Letzteres mit dem Kommentar „kein Fremdprogramm beim status“ (Z. 30–33, 85).
  Auch `leseBasisBaum` setzt `core.fsmonitor=false` (vorschlag.ts:438).
- [Fakt] Der Plan nennt nur `--no-optional-locks` (Z. 29). Gegen ein Schreiben des Index reicht das [entlastend].
- [Schlussfolgerung] Ohne `-c core.fsmonitor=false` startet ein in der Repo-Konfiguration gesetzter fsmonitor-Hook alle 10 s im Leitstand.
- [offene Unsicherheit] `git status` vergleicht Dateien mit verändertem Stat nach Inhalt. Mit einem Clean-Filter (z. B. LFS) auf
  getrackten Dateien unter `.claude/` startet das den Filter. `routen-code` nimmt das hin; ob das hier, alle 10 s, gewollt ist, sollte im
  Plan stehen.
- Empfehlung: Die Grundargumente aus `routen-code` übernehmen (mindestens `-c core.fsmonitor=false`) und die Filter-Grenze in §8 als
  DEKLARIERT aufnehmen. Als Alternative mit Plumbing ohne Filter: `ls-files --others --exclude-standard` plus `diff-index --name-only HEAD`,
  Muster `src/review-stand`. **Vor Baubeginn** (eine Zeile im Plan).

**5. Cache: Frische und Wettläufe.**
- (a) [Fakt] Der bestehende Cache teilt laufende Aufrufe über ein gespeichertes Promise (routen-faehigkeit-vorschlag.mjs:81). Der neue
  Eintrag `{ signatur, basisCommit, zeit, felder }` (Plan Z. 33) sagt dazu nichts. [Schlussfolgerung] Zwei parallele GETs (Poll plus
  `pollJetzt` nach einem POST, workflows.js:635, oder ein zweiter Tab) starten dann `git status` doppelt.
- (b) [Schlussfolgerung] Ein GET kann vor dem POST beginnen und erst nach `vergissVorschlagStand` zurückschreiben. Für die Vorschläge ist
  das harmlos: die alte Signatur passt nicht mehr, also wird neu gerechnet. Für `ungesichert` (nur zeitbasiert, 10 s) entsteht ein alter
  Eintrag ohne den neuen `.claude`-Pfad; dann fehlt der dauerhafte Hinweis direkt nach dem Übernehmen bis zu 10 s. Empfehlung: einen
  Generationszähler je Wurzel — `vergiss` erhöht ihn, zurückgeschrieben wird nur bei gleicher Generation; außerdem festlegen, dass eine
  abweichende Signatur den ganzen Eintrag verwirft, also auch `ungesichert`.
- (c) [Fakt] `ziel_existiert` hängt an den Einträgen unter `.claude/skills|agents`, und Skills hängen zusätzlich an den Projekt-Commands
  (vorschlag.ts:27–30, 349–350). Beides liegt außerhalb der geplanten Signatur über `vorschlaege/faehigkeiten/` (Plan Z. 35).
  [Schlussfolgerung] Ändert jemand `.claude/` von Hand oder per Checkout, bleibt `ziel_existiert` bis zu 30 s veraltet. Die Route weist
  fail-closed mit 409 ab, und auch `ziel_ignoriert` wird von 10 s auf 30 s alt. Empfehlung: drei billige `readdir` (`.claude/skills`,
  `.claude/agents`, `.claude/commands`) in die Signatur aufnehmen; den Rest in §8 deklarieren.
- (d) [Fakt] „Jede POST-Aktion … egal mit welchem Ausgang“ (Z. 39): die frühen Ausgänge in `fuehreVorschlagAktionDurch` (400/404/409,
  Z. 425–434) kennen noch keine Wurzel. Empfehlung: verwerfen in einem `finally`, sobald `lage.wurzel` ein String ist.
- (e) Optionen für Tests: Gate (d) „nach Commit ⇒ Feld fehlt“ braucht innerhalb von 10 s frische Werte. Empfehlung:
  `baueVorschlagFelder(wurzel, { basisCommit, jetzt, cache })` wie bei `baueVorschlagProjektion` (Z. 72).
- Vor dem Bau festzulegen: 5a/5b/5e ja, 5c/5d dürfen mitlaufen.

**6. Bestehende Gates und der neue Cache.** [Fakt, entlastend] fb1 (p1)/(p2) (check-f45-fb1…:319–335): vorher (Ordner fehlt), danach
Anlegen, danach Entfernen — jeder Schritt ändert die Signatur; ohne `.claude`-Änderung kommt kein neues Feld, (p2) bleibt bitgleich. fb1b:
vor jedem `hashAus` nach einer Dateiänderung liegt ein POST, der den Cache verwirft (Z. 257–311, 356–366); (q1) nutzt einen frischen
Arbeitsordner (`w4`, Z. 377–382). [Schlussfolgerung] Unter der Voraussetzung von 5b/5d bricht der Cache keines der Gates. Mit Punkt-A-Form
`null` und einem zeitweise scheiternden git würde (p2) dagegen unzuverlässig (Feld erscheint) — ein weiterer Grund für Befund 1: das Feld
nur bei Befund setzen.

**7. Wachstumsbremse und Server.** [Fakt, entlastend] Geändert werden nur die Zeilen 8813 und 8833 sowie der Import-Name (Z. 562). Keine
neue Route, `vergiss` liegt im Modul, `starteWorkflowSchritt(` bleibt unberührt. Das Zwischenmuster bleibt wie in FB-1b
(wachstumsbremse.md:10). [Annahme] Netto 0 Zeilen; nicht gezählt.

### Anzeige, Zwilling, Klickweg

**8. Der Anzeige-Zwilling der Abnahme-Lage ist gegen den Server richtig.** [Fakt, entlastend] Server: `faellig = ABGESCHLOSSEN ∧ lauf_id
ist String`; Freigabe, wenn `faellig ∧ (status ≠ 'ok' ∨ (ok ∧ ANGENOMMEN))` = `faellig ∧ (status ≠ 'ok' ∨ ergebnis = ANGENOMMEN)`
(leitstand-server.mjs:2145–2146, routen-faehigkeit-vorschlag.mjs:138; `ergebnis` aus der Abnahme, Server:8596). Plan Z. 66–69:
`ABGESCHLOSSEN ∧ ausfuehrungGelaufen ∧ (entscheidung.status ≠ 'ok' ∨ ergebnis = ANGENOMMEN)`. `ausfuehrungGelaufen` ist wahr, sobald
`aenderungsuebersicht.status` weder `noch_nicht_gelaufen` noch `kein_ausfuehrungs_schritt` ist (workflow-abnahme.js:115–125); der Server
setzt diese Werte genau dann, wenn `lauf_id === null` oder kein Schritt existiert (Server:8707–8716) — gleichwertig. `entscheidung.status`
kommt aus derselben Funktion `ermittleAbnahmeStand` (Server:8752). `grund === null` deckt auch „Basis nicht bestimmbar“ ab, weil die
Projektion dann den Grund `BASIS_UNBESTIMMT` setzt (routen-faehigkeit-vorschlag.mjs:89).

**9. Zwilling: was er nicht sieht, muss deklariert werden.** [Fakt] `laufGesperrt` ist eine Sperre für die ganze Instanz (Server:6505–6509);
sie sperrt Übernehmen **und** Verwerfen (routen-faehigkeit-vorschlag.mjs:134); die Abnahme-Projektion enthält dieses Feld nicht.
[Fakt, entlastend] Präzedenz D13: Fehler werden „gezeigt, nicht vorhergesagt“ (workflows.js:642). [Fakt] Weitere 409-Gründe, die der
Zwilling nicht kennt (B3, lokale Datei, Wächter, Werkzeugsatz, Probe; routen-faehigkeit-vorschlag.mjs:320–329), führen alle zu einem
sichtbaren 409 mit Ausweg. Empfehlung: in §2 statt „kein Lauf“ genauer: „eigener `workflowStatus` LAEUFT; eine fremde Laufsperre wird nicht
vorhergesagt (D13), sie kommt als 409“. Mitlaufen.

**10. Verwerfen: der Zwilling von `istSchreibbarerName` ist im Plan selbst offen.** [Fakt] Plan Z. 60: „nach
`istSchreibbarerName`-Zwilling — oder nur `name` Text?“ — unentschieden, nicht als offener Punkt markiert. [Fakt] Der Körper wird
serverseitig mit `istSchreibbarerName` und `SHA256_MUSTER` geprüft (routen-faehigkeit-vorschlag.mjs:118–119). [Schlussfolgerung] Ein
Regex-Zwilling im Client kann vom Server abweichen (q9). Einfacher: `baueVorschlagFelder` setzt je Vorschlag ein Feld `adressierbar` aus
der echten Funktion — keine Serverzeile, kein Zwilling, additiv (fb1 (p1) prüft per `map`, Z. 324). **Vor Baubeginn** entscheiden.

**11. Doppelklick-Sperre.** [Fakt, entlastend] Die Wache `laufendeAbnahme` wird synchron vor dem ersten `await` gesetzt; alle Knöpfe in
`#workflow-abnahme`, `#workflow-abnahme-stand` und `#workflow-entscheidung` werden gesperrt (workflows.js:601–606); die Karte liegt in
beiden Lagen in diesen Containern, die Klick-Delegation hängt an genau diesen drei (Z. 1561). Ein Doppelklick auf denselben Knopf schickt
genau einen POST, sofern `fuehreVorschlagAktionAus` vor dem Aufruf kein `await` hat — im Plan festschreiben. [Fakt] Lücke: im Erfolgsweg
wird `laufendeAbnahme = null` (Z. 611) **vor** dem frischen `await holeAbnahme` (Z. 618) gesetzt. [Schlussfolgerung] Ein Poll-GET, das vor
dem POST startete und in diesem Fenster zurückkommt, zeichnet die Karte veraltet neu, mit freigegebenen Knöpfen (`abnahmeKennzeichen = null`,
Z. 617; die Wache in Z. 243 greift nicht mehr). Ein Klick dort schickt einen zweiten POST; der Server antwortet fail-closed mit 404 bzw. 409.
Nicht jeder doppelte POST wird verhindert; der Rest ist harmlos und sichtbar. Deklarieren oder `laufendeAbnahme` erst nach dem Neuzeichnen
freigeben. Mitlaufen. Empfehlung: im Render-Nachweis eine Zeile „Doppelklick ⇒ genau ein POST“.

**12. Ort der Fehlermeldung in der Lage „entscheidbar“.** [Fakt] Dort hängt `workflow-abnahme-meldung` hinter der Spalte „Deine
Entscheidung“ (workflows.js:269); Fokus nur bei Erfolg (Z. 623). [Schlussfolgerung] Ein 409 zu einem Knopf in der Hauptspalte erscheint in
der Nebenspalte ohne Fokus, mobil womöglich außerhalb des Blickfelds. Bei Fehlern aus der Vorschlagskarte ebenfalls fokussieren.
Mitlaufen, design-guardian.

**13. Wortlaut des Hinweises passt nicht zu D.** [Fakt] Z. 64–65 „Übernommene Fähigkeiten sind nach Inhalt freigegeben …“ — nach D zählt
jede ungesicherte Datei unter `.claude/`. [Fakt, entlastend] D in der Sache: gesichert wird über die Liste aus `git status`, die
`.claude/`-Pfade enthält (code-daten.js:261–280, routen-code.mjs:416); der Ausweg „Bereit zum Sichern“ trägt. Empfehlung: Satz 2 nur bei
bekannter Übernahme oder neutral formulieren. Mitlaufen.

**14. Umfang (F-1167).** [Fakt, entlastend] Abtrennen im Client unter Präfix `vorschlaege/faehigkeiten/`, `umfangKennung` unverändert
(workflow-abnahme.js:518–540) — kein neues Kennzeichen nötig. [Annahme] `umfang.ausserhalb` enthält nur Pfade relativ zur Wurzel mit `/`.

**15. F-1096.** [Fakt, entlastend] `renderPlanKarte` gibt `zusammenfassung` escaped aus (workflow-entscheiden.js:217), über das exportierte
`renderFreigabeSeite` (Z. 306–308) prüfbar; „kein Bau“ ist richtig. [Schlussfolgerung] Gate (r) ist schon auf main grün; der Rot-Nachweis
„Modul fehlt“ belegt nur Import-Fehler. (r), (h) und Teile von (e) brauchen eine Sabotage-Kopie (Muster FB-1b G, plan-fb1b-v2.md:66–67).
Mitlaufen.

**16. Kosten des Pollings.** [Fakt, entlastend] Dashboard und Workboard laden `…/abnahme` nur bei Übergängen (dashboard.js:277–281,
workboard.js:1321–1322); periodisch nur die Ablaufseite alle 2 s. [offene Unsicherheit] Laufzeit von `git status` in einem großen
Arbeitsordner unter Windows. Messen beim Bau und im Bericht nennen.

### Offene Punkte A–D

- **A:** Befund 1 — sichtbar als `{ status: 'nicht_bestimmbar' }`, für jeden Arbeitsordner.
- **B:** [Fakt] Destruktive Aktionen haben eine Bestätigung als Präzedenz („Aufräumen“, arbeitsordner-anzeige.js:232); Verwerfen löscht die
  Ausgabe eines bezahlten Laufs unwiderruflich (`rmSync`, routen-faehigkeit-vorschlag.mjs:339). [Schlussfolgerung] Ein zweistufiger Knopf
  in der Karte, weiter über `sendeAbnahmeBedienung`, passt zur Präzedenz. Entscheidung Stefan, **vor Baubeginn**.
- **C:** keine Blick-Zeile; Zustimmung.
- **D:** in der Sache richtig; Pathspec (3) und Wortlaut (13) korrigieren.

## Urteil

- [ ] Freigegeben
- [x] **Freigegeben mit Hinweisen**
- [ ] Nicht freigegeben
- [ ] Blockiert

Der Kern trägt: keine neue Route, Server netto 0 im Zwischenmuster, reines Anzeige-Modul, Klickweg über die bestehende Sperre, Zwilling
der Abnahme-Lage gleich zu `ermittleAbnahmeStand`/`lageSperre`. Die Mängel sind Lücken in der Spezifikation und ein falscher
Gleichheitsanspruch, kein Architekturfehler. Bedingung: V1–V6 stehen vor Baubeginn im Plan; dann ist kein weiterer Advisor-Pass nötig.

**Vor Baubeginn:** V1 Feldform `{ status }` (1) · V2 wirft nie, Rotfall-Test (2) · V3 gemeinsamer Parser/Filter, Pathspec-Entscheidung,
`-c core.fsmonitor=false`, Filter-Grenze deklariert (3, 4) · V4 Cache: geteiltes Promise, Generationszähler, Signatur verwirft den ganzen
Eintrag, Optionen `jetzt`/`cache` (5a/5b/5e) · V5 `adressierbar` aus dem Modul (10) · V6 Punkt B durch Stefan.

**Darf mitlaufen:** 5c, 5d, 9, 11, 12, 13, 15, 16.

## Nächster sinnvoller Schritt

Plan v1.1 (hier: `plan-fb2-v2.md`) mit V1–V5 und Stefans Entscheidung zu B, danach bauen. Im Baubericht: gemessene Laufzeit des
`.claude`-Statusaufrufs, Rot-Nachweis je Prüfung (Modul fehlt bzw. Sabotage-Kopie), Zeile „Doppelklick ⇒ ein POST“ aus dem Render-Nachweis.
