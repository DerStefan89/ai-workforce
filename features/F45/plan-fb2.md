# F45 FB-2 „Fähigkeit bauen — Anzeige“ (Plan v1)

Stand: 23.10.2026 · Branch `f45/fb2-faehigkeit-anzeige` (auf main #372). Grundlage: F-1167 (Pflichten für FB-2), F-1069, F-1096,
F-1169; Projektion `faehigkeitVorschlaege` in GET `…/abnahme`, Routen `…/faehigkeit-vorschlag/uebernehmen|verwerfen`
(`scripts/leitstand/routen-faehigkeit-vorschlag.mjs`), `features/F45/plan-fb1b-v2.md`.

## Briefing

1. **Ziel:** In der Abnahme eine Karte „Vorgeschlagene Fähigkeiten“ mit „Übernehmen“/„Verwerfen“, ein dauerhafter Hinweis auf
   ungesicherte `.claude/`-Änderungen im Arbeitsordner (F-1169) und die übrigen FB-2-Pflichten aus F-1167. Mit FB-2 ist „Fähigkeit
   bauen“ fertig; offen bleiben F-1164, F-1169, F-1170 und der Beleg im echten Lauf (R).
2. **Referenz:** Designvorlage V10 / Abgleich F-725 (Karten der Seite Entscheiden `entscheiden-karte`, Notizen `note amber`), Muster
   Umfangs-Hinweis und qa-Karte in `public/leitstand/views/workflow-abnahme.js`.
3. **Module/Daten:** siehe §1–§5.
4. **Zustände:** Default (Vorschläge mit Knöpfen) · leer (Feld fehlt ⇒ keine Karte; nur ungesichert ⇒ nur der Hinweis) · ladend (Knopf
   gesperrt während der Anfrage, ganze Abnahme gesperrt wie bisher) · Fehler (4xx/5xx-Grund wörtlich in der Abnahme-Meldung) · Hover:
   bestehende Knopfklassen.
5. **Akzeptanzkriterien:** §7.
6. **Risiken:** §8.

## 1 Server und Projektion (keine neue Route; Server netto ≤ 0)

`scripts/leitstand/routen-faehigkeit-vorschlag.mjs`:

- **Neu `baueVorschlagFelder(wurzel, { basisCommit, … })`** ⇒ `{}` oder `{ faehigkeitVorschlaege?, faehigkeitUngesichert? }` — jedes
  Feld nur, wenn nicht leer (ohne beides bleibt die Antwort bitgleich, Gate fb1 (p2)). `baueVorschlagProjektion` bleibt unverändert
  (Tests/Gates rufen sie direkt).
- **`faehigkeitUngesichert`** (F-1169, „dauerhaft, abgeleitet aus dem Stand von `.claude/`“): `string[]` der Pfade unter `.claude/` des
  Arbeitsordners, die `git --no-optional-locks status --porcelain=v1 -z --untracked-files=all -- :(icase).claude` meldet — dieselbe
  Sicht wie `leseClaudeAenderungen` (`src/execution-controller`), die nach dem nächsten Lauf `claude_ordner_veraendert` auslöst, aber
  asynchron über `fuehreGitAsync` (Git-Starter F-1000), Zeitgrenze 5 s, höchstens 20 Pfade gezeigt plus Anzahl. Nicht auswertbar ⇒
  Feld `faehigkeitUngesichert: null`? — **Offener Punkt A**.
- **Cache je Wurzel (cr1-Rest, code-reviewer FB-1b 5):** ein Eintrag je Wurzel `{ signatur, basisCommit, zeit, felder }`.
  - Vorschläge (Erkennung + Basis-Vergleich + ziel_ignoriert): wiederverwendet, solange die **Stat-Signatur** von
    `vorschlaege/faehigkeiten/` (begrenzter lstat-Durchlauf: Pfad, Größe, mtimeMs, ohne Lesen, ohne Verknüpfungen zu folgen; Grenze
    wie die Erkennung) und `basisCommit` gleich sind und der Eintrag jünger als 30 s ist. Sonst neu (die vorhandene git-Cache-Ebene
    in `baueVorschlagProjektion` bleibt).
  - Ungesichert: höchstens 10 s alt (git status lässt sich nicht billig signieren).
  - Jede POST-Aktion (übernehmen/verwerfen, egal mit welchem Ausgang) verwirft den Eintrag ihrer Wurzel
    (`vergissVorschlagStand(wurzel)` am Ende von `fuehreVorschlagAktionDurch`) — die Abnahme lädt nach dem Klick sofort frisch.
  - Höchstens ein Eintrag je Arbeitsordner (wie bisher), auch nach dem Aufräumen.
- **Server** (`scripts/leitstand-server.mjs`, GET `…/abnahme`): zwei bestehende Zeilen ändern —
  `const faehigkeitFelder = … ? await baueVorschlagFelder(…) : {}` und `...faehigkeitFelder,` statt des bedingten Spreads; Import-Name.
  Netto 0 (Kommentarzeile bleibt eine). `starteWorkflowSchritt(` bleibt 6×.

## 2 Anzeige — neues Modul `public/leitstand/faehigkeit-vorschlag-anzeige.js` (rein, kein fetch/DOM)

- `renderFaehigkeitVorschlaege(workflowId, abnahme)` ⇒ `''`, wenn weder `faehigkeitVorschlaege` (Array, nicht leer) noch
  `faehigkeitUngesichert` (Array, nicht leer) da ist. Sonst `<section class="entscheiden-karte faehigkeit-vorschlaege">` mit
  `<h2>`/`<h3>` „Vorgeschlagene Fähigkeiten“ (Ebene je Einbauort):
  - **Zwischenstand** (`workflowStatus === 'LAEUFT'`): Notiz „Zwischenstand — der Lauf schreibt noch; Übernehmen und Verwerfen nach
    dem Lauf“, keine Knöpfe (F-1167 „Vorschläge während eines laufenden Laufs“).
  - Je Vorschlag eine Zeile/Liste: Typ-Chip (Skill/Agent, übersetzt; unbekannt roh), Name (`<code>`, escaped; null ⇒ Pfad),
    Beschreibung (escaped, CSS-Umbruch für lange Texte), Hash-Präfix (12 Zeichen, `<code>`), Grund bei Ungültigkeit (escaped,
    amber), dazu Ziel (`.claude/skills/<name>/` bzw. `.claude/agents/<name>.md`).
  - Knopf **„Übernehmen“** (`button primary wf-faehigkeit-vorschlag`, `data-aktion="uebernehmen"`, `data-typ/-name/-hash/-workflow-id`)
    nur bei `uebernehmenErlaubt(abnahme, v)`; sonst ein Satz, warum nicht (Grund, Ziel existiert, Ziel gitignoriert/nicht bestimmbar,
    Abnahme-Lage, Lauf aktiv).
  - Knopf **„Verwerfen“** (`button danger wf-faehigkeit-vorschlag`, `data-aktion="verwerfen"`) nur, wenn der Körper gültig wäre (typ
    skill/agent, Name anlegbar nach `istSchreibbarerName`-Zwilling — oder nur `name` Text? —, Hash 64 Hex) und kein Lauf; sonst
    „von Hand entfernen: `<pfad>`“. Keine Rückfrage vor dem Verwerfen — **Offener Punkt B**.
  - **Hinweis ungesichert** (dauerhaft, solange `faehigkeitUngesichert` nicht leer): `note amber` „Ungesichert unter .claude/ dieses
    Arbeitsordners (n Dateien: …) — vor einem weiteren Lauf in diesem Ablauf sichern („Bereit zum Sichern“), sonst wird ein Lauf mit
    Fähigkeiten, Ort-B-Skill oder Plugin rot. Übernommene Fähigkeiten sind nach Inhalt freigegeben, aber nicht eingeschaltet — nach
    Sichern/Merge unter Fähigkeiten einschalten.“
- `uebernehmenErlaubt(abnahme, v)` — Anzeige-Zwilling der Server-Regel (die Route prüft selbst; der Zwilling nur, um nichts anzubieten,
  was sicher 409 wird): `v.grund === null`, `v.ziel_existiert === false`, `v.ziel_ignoriert === false`, `typeof v.hash === 'string'`,
  `workflowStatus === 'ABGESCHLOSSEN'`, Ausführung gelaufen (`ausfuehrungGelaufen`), `entscheidung.status !== 'ok' ||
  entscheidung.ergebnis === 'ANGENOMMEN'` (E-FB1-3 über `ermittleAbnahmeStand`: faellig ∧ (offen ∨ ANGENOMMEN)), kein Lauf.
- `faehigkeitVorschlagKennung(abnahme)` für das Kennzeichen der Abnahme (Typ, Name, Hash, Grund, Ziel-Flags, ungesicherte Pfade,
  LAEUFT) — sonst zeichnet der Poll die Karte nicht neu.
- `vorschlagErfolg(aktion, inhalt, abnahmeOffen)` ⇒ Text bzw. `{ text, art }`:
  - übernehmen: „<Typ> „<Name>“ übernommen, freigegeben nach Inhalt, noch nicht eingeschaltet — nach Sichern/Merge unter Fähigkeiten
    einschalten.“ + bei offener Abnahme „Das Review gilt danach als veraltet.“ + bei `vorschlag_geblieben` (Teilerfolg, `art: 'hinweis'`)
    „Der Vorschlag blieb liegen — verwerfen.“ Den deutschen `hinweis`-Text des Servers zeigt die Anzeige nicht wörtlich (i18n); sein
    Inhalt steht dauerhaft im Hinweis „ungesichert“.
  - verwerfen: „Vorschlag „<Name>“ verworfen.“

## 3 Einbau `workflow-abnahme.js` / `workflows.js`

- `renderAbnahme`: Lage „entscheidbar“ ⇒ Karte in der Seite (nach dem Umfangs-Hinweis, vor der qa-Karte); alle anderen Lagen ⇒ an
  `unten` angehängt (vorab, offen inkl. LAEUFT, entschieden). Kein neuer Container, keine neue ID im HTML-Gerüst.
- **Umfang (F-1167 „`umfang`-Hinweis zu Vorschlagsdateien“):** `renderUmfangHinweis` trennt Pfade unter `vorschlaege/faehigkeiten/`
  ab: sie stehen nicht in der amber Liste, sondern als ein Satz „n Dateien sind Fähigkeit-Vorschläge (siehe „Vorgeschlagene
  Fähigkeiten“) — dort gewollt“; bleiben nur sie, keine amber Notiz. `umfangKennung` unverändert.
- `workflows.js`: Kennzeichen um `faehigkeitVorschlagKennung(abnahme)`; Klick-Delegation an den drei Abnahme-Containern um
  `.wf-faehigkeit-vorschlag` ⇒ `fuehreVorschlagAktionAus(button)` ⇒ `sendeAbnahmeBedienung(workflowId, () =>
  sendeFaehigkeitVorschlag(workflowId, aktion, { typ, name, hash }), button, erfolg)` — **Doppelklick-Sperre** über die bestehende
  `laufendeAbnahme` (genau ein POST, alle Knöpfe der Abnahme gesperrt bis zur Antwort), 4xx/5xx wörtlich als „<Status>: <grund>“
  (die Gründe tragen seit FB-1b den Ausweg), danach frisches GET `…/abnahme` (Cache der Wurzel verworfen).
- `api.js`: `sendeFaehigkeitVorschlag(workflowId, aktion, koerper)` (POST, `mitPraefix`, Kennung kodiert).

## 4 F-1096 (Form-Empfehlung sichtbar)

Die Empfehlung steht seit FB-1a in der `zusammenfassung` des Architekten; die Plan-Karte der Freigabe zeigt `plan.zusammenfassung`
(`views/workflow-entscheiden.js` `renderPlanKarte`). Kein Bau; Gate (r) belegt, dass eine Zusammenfassung mit Form-Empfehlung escaped in
der Plan-Karte erscheint. Offen bleibt nur der Beleg im echten Architekten-Lauf (R).

## 5 i18n

Neue Schlüssel `abnahme.faehigkeiten.*` in de/en/tr/ru (Titel, Typen, Zwischenstand, Gründe „nicht angeboten“, Hinweis ungesichert,
Erfolg, Umfangs-Satz); keine internen Kennungen (F-<Zahl>, E-FB1-3, cr1) im sichtbaren Text.

## 6 Gate `scripts/check-f45-fb2-faehigkeit-anzeige.mjs` (in `check:gates`)

- (a) Karte nur mit Feld: ohne beide Felder `''`; nur ungesichert ⇒ Hinweis ohne Liste; Typ, Name, Beschreibung, Hash-Präfix, Grund.
- (b) Übernehmen nur, wenn erlaubt: je Bedingung (grund, ziel_existiert, ziel_ignoriert true/null, Hash null, LAEUFT, Lage
  vor dem Bau/KLAERUNG/ABGELEHNT, veraltete Entscheidung erlaubt, ANGENOMMEN erlaubt) ein Fall.
- (c) XSS: `<img src=x onerror=…>` in Name, Beschreibung, Grund, Pfad ⇒ nur escaped im HTML (Rotfall).
- (d) Hinweis „ungesichert“ dauerhaft: aus `faehigkeitUngesichert` in jeder Lage (entscheidbar, vorab, offen, entschieden), auch
  ohne Vorschläge; Projektion mit echtem git-Repo: nach Anlegen einer ungetrackten `.claude/skills/x/SKILL.md` ⇒ Feld mit Pfad; nach
  Commit ⇒ Feld fehlt; ohne beides bitgleich.
- (e) Doppelklick-Sperre und Klickweg: Quelltext (normalisiert) — `.wf-faehigkeit-vorschlag` geht nur über `sendeAbnahmeBedienung`;
  `sendeFaehigkeitVorschlag` kodiert die Kennung und nutzt `mitPraefix`.
- (f) Cache: Attrappe mit Zähler — 5 Abrufe gleiche Signatur ⇒ 1 Erkennung; Datei geändert (Größe/mtime) ⇒ neu; POST ⇒ neu.
- (g) i18n vollständig in vier Sprachen, ohne interne Kennung; Umfangs-Satz trennt Vorschlagsdateien.
- (h) Server: Zeilen ≤ Ratsche, `starteWorkflowSchritt(` genau 6×, keine neue Route (`erkenneVorschlagRoute` einziger Dispatch der
  Aktion).
- (r) F-1096: Plan-Karte zeigt die Zusammenfassung escaped.
- Gegenproben im Gate (verfälschte Eingaben/Module). **Rot-Nachweis:** `git archive main | tar -x` in den Scratchpad, Gate hinein, dort
  rot (Modul fehlt); Bericht.

Tests: `public/leitstand/faehigkeit-vorschlag-anzeige.test.mjs`, Ergänzungen `workflow-abnahme.test.mjs` (Einbau je Lage, Umfang),
`scripts/leitstand/routen-faehigkeit-vorschlag.test.mjs` (Felder, Cache, ungesichert mit `mkdtemp`-Repo). Plattformneutral (Pfade nur
über `join`/`mkdtemp`, F-1166).

## 7 Akzeptanzkriterien

1. Karte nur, wenn eines der Felder da ist; je Vorschlag Typ, Name, Beschreibung, Hash-Präfix, Grund.
2. „Übernehmen“ nur, wenn erlaubt; „Verwerfen“ immer, wenn gültig adressierbar und kein Lauf.
3. Während der Anfrage ist die ganze Abnahme gesperrt; ein zweiter Klick schickt nichts.
4. 409/4xx-Gründe erscheinen wörtlich samt Ausweg.
5. Nach Übernahme: Statussatz wie §2; der Hinweis „ungesichert“ steht danach dauerhaft (auch nach Neuladen der Seite), bis gesichert.
6. Während eines Laufs: Karte als Zwischenstand, keine Knöpfe.
7. Umfangs-Hinweis zählt Vorschlagsdateien nicht als Verstoß.
8. i18n de/en/tr/ru; Render-Nachweis (neutrale Instanz, Pfadprobe/OCR ohne persönliche Pfade); design-guardian.
9. `npm run check:gates` Exit 0; Server netto ≤ 0.

## 8 Risiken

- Der Zwilling der Abnahme-Lage weicht vom Server ab ⇒ Knopf angeboten, Server 409 (sichtbar, harmlos) oder Knopf fehlt
  (Übernahme nur von Hand). Gate (b) deckt die Lagen ab.
- git status je 10 s je offener Abnahme mit Arbeitsordner (nur bei geöffneter Ablaufseite gepollt).
- Stat-Signatur übersieht eine Änderung gleicher Größe im selben mtime-Takt ⇒ veralteter Hash angezeigt ⇒ Route 409 „Inhalt geändert —
  neu laden“ (fail-closed); höchstens 30 s.
- Render-Nachweis braucht feste Antworten für `…/abnahme` (Muster `nachweise/b2b4a2b2`).

## Offene Punkte (nicht stillschweigend entschieden)

- **A** `faehigkeitUngesichert` bei nicht auswertbarem git: Feld weglassen (still) oder `{ status: 'nicht_bestimmbar' }` mit grauer
  Zeile „Stand von .claude/ nicht bestimmbar — vor einem weiteren Lauf sichern“? Vorschlag: Zeile zeigen (fail-visible), Form
  `faehigkeitUngesichert: null` nur bei Arbeitsordnern mit erkannter Übernahme? — einfacher: immer `null` ⇒ graue Zeile.
- **B** Verwerfen ohne Rückfrage (löscht den Vorschlag im Arbeitsordner unwiderruflich; ein Lauf kann ihn neu bauen). Alternative:
  zweistufiger Knopf. Vorschlag: ohne Rückfrage, `danger`-Stil, Satz „löscht den Vorschlag im Arbeitsordner“.
- **C** Einbauort bei Lage „entschieden“ (ANGENOMMEN): die Karte unter der Entscheidungszeile — reicht das, oder gehört sie auch in
  „Auf einen Blick“ (Zahl)? Vorschlag: keine Blick-Zeile (Umfang bleibt klein).
- **D** `faehigkeitUngesichert` nimmt jede ungesicherte Datei unter `.claude/` (nicht nur übernommene Fähigkeiten) — das ist die Sicht,
  die den Lauf rot macht; der Text spricht deshalb von „Änderungen unter .claude/“, nicht nur von Fähigkeiten.
