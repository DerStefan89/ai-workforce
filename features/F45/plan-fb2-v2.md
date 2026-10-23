# F45 FB-2 „Fähigkeit bauen — Anzeige“ (Plan v2)

Stand: 23.10.2026 · nach Advisor-Pass `features/F45/advisor-fb2.md` („Freigegeben mit Hinweisen“, V1–V6 vor Baubeginn). Plan v1
(`plan-fb2.md`) bleibt unverändert stehen; hier nur, was sich ändert — alles Übrige gilt wie in v1. Kein weiterer Advisor-Pass (Urteil).

## V1 Feldform `faehigkeitUngesichert` (Befund 1, Punkt A)

`{ status: 'ok', pfade: string[] (höchstens 20), anzahl }` nur, wenn Pfade da sind; `{ status: 'nicht_bestimmbar', grund }` bei nicht
auswertbarem git (Zeitgrenze, Exit ≠ 0, Ausgabe zu groß) — für jeden bereiten Arbeitsordner, sichtbar als graue Zeile „Stand von .claude/
nicht bestimmbar — vor einem weiteren Lauf sichern“ (der Laufdiff wertet dasselbe als Treffer). Ohne Pfade fehlt das Feld (bitgleich,
fb1 (p2)). Die Karte erscheint, sobald eines der beiden Felder da ist.

## V2 Wirft nie (Befund 2)

`baueVorschlagFelder` fängt jeden Fehler: Vorschläge über `baueVorschlagProjektion` (wirft nie, zusätzlich `.catch` ⇒ `[]` geloggt),
ungesichert über `fuehreGitAsync` (wirft nie) mit Parse in try; ein Wurf außerhalb ⇒ geloggt, Antwort
`{ faehigkeitUngesichert: { status: 'nicht_bestimmbar', grund } }` (fail-visible). Rotfall-Test mit einer werfenden Attrappe.

## V3 Sicht auf `.claude` (Befunde 3, 4)

- Parser und Filter aus `leseClaudeAenderungen` werden die reine Funktion `claudePfadeAusStatus(roh)` in `src/execution-controller`
  (exportiert, `leseClaudeAenderungen` nutzt sie) — **ohne Pathspec**, also dieselbe Sicht wie der Laufdiff (auch verschachtelte `.claude`,
  ohne Unterschied der Schreibweise).
- Aufruf: `fuehreGitAsync(['--no-optional-locks', '-c', 'core.fsmonitor=false', 'status', '--porcelain=v1', '-z', '--untracked-files=all'],
  { cwd, zeitgrenzeMs: 5000, maxBuffer: 50 MB })` — Argumente wie der Laufdiff plus fsmonitor aus (Muster `routen-code`).
- DEKLARIERT (§8): ein Clean-Filter (z. B. LFS) auf getrackten Dateien mit geändertem Stat startet bei `git status` wie in `routen-code` und
  im Laufdiff; Kosten: ein voller `git status` des Arbeitsordners höchstens alle 10 s, nur bei geöffneter Ablaufseite (gemessen im Bericht).

## V4 Cache (Befund 5a/5b/5c/5d/5e)

- Ein Eintrag je Wurzel in einer Map (Optionen `jetzt`, `cache` wie `baueVorschlagProjektion`): `{ signatur, basisCommit, vZeit, vorschlaege:
  Promise, uZeit, ungesichert: Promise }`. Laufende Aufrufe werden über die gespeicherten Promises geteilt (5a).
- Signatur (5c): begrenzter lstat-Durchlauf unter `vorschlaege/faehigkeiten/` (Pfad, Art, Größe, mtimeMs; nie einer Verknüpfung gefolgt;
  höchstens 4000 Einträge, darüber `null` ⇒ kein Cache) plus die Namen in `.claude/skills`, `.claude/agents`, `.claude/commands`. Weicht
  Signatur oder `basisCommit` ab, wird der **ganze** Eintrag ersetzt (auch `ungesichert`).
- Fristen: Vorschläge 30 s, ungesichert 10 s.
- Wettlauf (5b): Einträge werden nur synchron vor dem ersten `await` gesetzt; `vergissVorschlagStand(wurzel)` löscht den Eintrag. Ein vor
  dem POST gestarteter GET hält nur seinen eigenen, gelöschten Eintrag — er kann nichts zurückschreiben. Ein Generationszähler ist damit
  überflüssig (strukturell statt per Zähler); Unit-Test: GET gestartet, POST/vergiss, GET-Promise löst danach auf ⇒ nächster GET liest neu.
- 5d: `fuehreVorschlagAktionDurch` vergisst in einem `finally`, sobald die Lage eine Wurzel als Text trug.

## V5 `adressierbar` aus dem Modul (Befund 10)

`baueVorschlagFelder` setzt je Vorschlag `adressierbar` = typ skill/agent ∧ `istSchreibbarerName(name)` ∧ `SHA256_MUSTER.test(hash)` — die
Funktionen der Route, kein Client-Zwilling. Nicht adressierbar ⇒ kein Knopf, Satz „von Hand entfernen: <pfad>“.

## V6 Verwerfen zweistufig (Punkt B, Entscheidung Stefan 23.10.2026)

Erster Klick auf „Verwerfen“ schaltet die Zeile auf „Wirklich verwerfen?“ (danger) + „Abbrechen“ (Zustand je `workflowId|typ:name|hash` in
`views/workflows.js`, Teil des Kennzeichens, Fokus auf „Wirklich verwerfen?“); erst der zweite Klick schickt den POST über
`sendeAbnahmeBedienung`. Ein neuer Hash oder ein anderer Ablauf hebt die Stufe auf.

## Mitlaufend

- 9: „kein Lauf“ heißt `workflowStatus === 'LAEUFT'` des eigenen Ablaufs (Zwischenstand, keine Knöpfe); eine fremde Laufsperre sagt die
  Anzeige nicht vorher (D13) — sie kommt als 409 mit Grund.
- 11: `fuehreVorschlagAktionAus` ruft `sendeAbnahmeBedienung` ohne vorheriges `await`. Bekannte Lücke (DEKLARIERT): zwischen
  `laufendeAbnahme = null` und dem frischen GET kann ein alter Poll die Karte mit Knöpfen zeichnen; ein Klick dort endet fail-closed mit
  404/409 (Phase B synchron). Klicktabelle des Render-Nachweises: „Doppelklick ⇒ ein POST“.
- 12: Fehler aus der Vorschlagskarte fokussieren die Abnahme-Meldung (optionaler Parameter von `sendeAbnahmeBedienung`).
- 13: Hinweis neutral („ungesicherte Änderungen unter .claude/“); der Satz „übernommene Fähigkeit … nicht eingeschaltet — nach
  Sichern/Merge unter Fähigkeiten einschalten“ nur, wenn ein Pfad unter `.claude/skills/` oder `.claude/agents/` liegt.
- 15: Gegenproben im Gate (verfälschte Module/Eingaben) für die auf main grünen Prüfungen (r), (h), (e); Rot-Nachweis des ganzen Gates
  per `git archive main`.
- 16: Laufzeit von `git status` im Arbeitsordner im Bericht.

## Bau, Prüfpass und Korrekturrunde (23.10.2026)

Gebaut nach v2. Prüfpass code-reviewer, qa, design-guardian (frischer Kontext) je „Nicht freigegeben“; eine Korrekturrunde:

- **qa 1:** Hinweis „ungesichert“ auch auf der Freigabe-Seite (`renderFreigabeSeite` ← `faehigkeitUngesichert` der letzten Abnahme) — dort
  wird der nächste Lauf freigegeben, und der Weg mit der Karte ist zugeklappt.
- **qa 2 / cr 2:** „Wirklich verwerfen?“ zählt nur als Einzelklick (`detail ≤ 1`) und frühestens 700 ms nach dem Öffnen der Stufe
  (Doppelklick, gehaltene Taste); Render „Doppelklick Verwerfen ⇒ 0 POST“.
- **qa 3:** die Stufe setzt das Kennzeichen nicht mehr zurück — eine angefangene Begründung bleibt (Render 08a/08b). Grenze: nach einem
  erfolgreichen POST leert `sendeAbnahmeBedienung` das Feld wie bei jeder Abnahme-Bedienung (Bestand).
- **cr 1:** Umfang trennt auch den Ordner-Eintrag `vorschlaege/` (ganz ungetrackter Vorschlagsordner) ab; der Satz nennt den Ordner, keine
  Zahl (qa 8). Grenze: anderes unter einem ganz ungetrackten `vorschlaege/` zählt mit.
- **design-guardian 1:** auf der Seite „entscheidbar“ ist „Übernehmen“ kein Hauptknopf; **2 / qa 4:** ru „Перенести“/„Удалить“ statt der
  Abnahme-Begriffe, Label-in-Name bei „Отмена“; **3/4:** Notizen und h3 der Karte ohne eigenen Rand; **6:** Bild bei 200 %, Fokus-id im
  Protokoll.
- **cr 3:** Regex in Gate (d) ohne Alternative; **cr 4:** Signatur wirft nicht mehr (`.claude/skills` als Datei), zu viele Einträge ⇒ „?“ mit
  kurzer Frist, `git status` bleibt zeitlich gecacht; **cr 5:** nach einer Zeitgrenze 60 s Frist; **cr 6:** eigener catch für ungesichert
  (Vorschläge bleiben); **cr 7:** `vergissVorschlagStand` leert auch den git-Cache der Projektion, `.gitignore` in der Signatur (Rest
  deklariert); **cr 8:** `ausfuehrungGelaufen` im Blattmodul `abnahme-ausfuehrung.js` (kein Importzyklus); **cr 9:** `ziel` vom Server;
  **cr 10:** Kopfkommentare; **cr 11 / qa 5:** Fokus eines Kartenknopfs bleibt beim Neuzeichnen, Warnung per `aria-describedby`; **qa 9:**
  eine Stufe zu einem nicht mehr vorhandenen Vorschlag verfällt.
- DEKLARIERT, ohne Bau: qa 6 / design-guardian 5 (Ort der Meldung — bestehender Ort, Fokus springt dorthin), qa 7 („Aktualisieren“ im
  Abschnitt Sichern leert den 10-s-Cache nicht), Escape hebt die Stufe nicht auf, Ort der Karte vor „Selbst ausprobieren“.
