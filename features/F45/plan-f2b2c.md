# F45 F-2b-2c — Plan (Sammlung → Katalog, Eignung prüfen in der Capability Library, Stand der lokalen Datei)

Branch `f45/f2b2c-sammlung-katalog`, Basis `ec4ad21` (main mit F-2b-2b Teil 1, #327). Grundlage: Auftrag F45 F-2b-2c
(13.10.2026), Fixpaket-Zeile F-2b-2c, `plan-f2b2b.md` TEIL 2 und Advisor F12, Findings F-1056, F-1061, F-1068, F-1078.
Keine neue Abhängigkeit. Ziel: ein Sammlungseintrag ohne Katalog kommt ohne Handarbeit bis „Freigeben & installieren“.

## Plan v1

### Befunde vorab (Code gegen ec4ad21)
- `waehleBericht` bindet einen Bericht an die **Quelle** (git: Repo + Pfad-Präfix + SHA; npm: Paket + Version + Integrity),
  nicht an die id. Ein Bericht aus der Sammlung (`pruefbericht-s-<id>`) gilt damit für einen später angelegten
  Katalogeintrag mit derselben Quelle — **wenn** der Katalogeintrag die Quelle so beschreibt, dass `quellPfad` der
  Installation = `quelle.pfad` des Berichts (oder darunter) ist. Nichts umschlüsseln.
- `pruefeInstallierbarkeit` (`src/ressourcen/index.ts`): Skill braucht `installation_vorlage.skill_pfad` und eine GitHub-
  `herkunft.url`; MCP braucht `wirkung: lokal`, `herkunft.paket` (`npm:<name>`) und `installation_vorlage { bin, args,
  werkzeuge }`. Der heutige Vormerken-Text fordert keine Vorlage → ein vorgemerkter Sammlungseintrag wäre nicht
  installierbar.
- `skill_pfad` ist relativ zum Unterpfad der `herkunft.url` (`zerlegeGithubUrl`). Der Sammlungslink kann schon auf den
  Skill-Ordner zeigen (`…/tree/main/skills/x`); der Bericht pinnt `quelle.pfad` relativ zur Repo-Wurzel. Wer
  `herkunft.url = Sammlungslink` und `skill_pfad = quelle.pfad` kombiniert, verdoppelt den Pfad. Darum: **Ref-URL** =
  Repo + Ref ohne Unterpfad (`https://github.com/<o>/<r>/tree/<ref>`, bei Ref `HEAD` ohne `/tree`), `skill_pfad =
  quelle.pfad`. Dann ist `quellPfad` der Installation genau `quelle.pfad` und der Bericht gilt (gleiche Quelle, gleiche
  SHA, solange die Ref nicht weiterläuft — sonst Sperre „nur für …“ wie heute).
- `fakten.paket.bin` trägt nur die **Namen** der bin-Einträge, nicht die Pfade; die Bytes des Pakets liegen nach dem
  Prüflauf nicht mehr vor.
- `POST /api/sammlung/pruefung[/vorbereiten]` nimmt `katalog_id` schon (Katalogeintrag OFFEN, extern skill/mcp/agent).
- Vormerken (Scout) legt den Auftrag im **aktiven** Projekt an (`legeAuftragAn` über `mitPraefix`); `ressourcen.json` ist
  die der Workforce.

### 1 Vormerken für Sammlungseinträge ohne Katalog (F-1056 Rest)
**Server (nur Lesen, additiv):**
- `sammleFakten` (`src/sammlung/inhalt.ts`): `paket.bin_ziele` = `{ <name>: <pfad> }` aus `package.json` (`bin` als
  String → Name = Paketname ohne Scope; `./` vorn entfernt). Additiv, alte Berichte haben es nicht.
- `berichtKurz` (`routen-pruefung.mjs`): zusätzlich `typ`, `bin_ziele` (oder null), `uebersprungen` (Zahl der relevanten
  übersprungenen Dateien, siehe 5). Fließt über `ergaenzeSammlung` in `pruefbericht_letzter`.

**Oberfläche (reines Modul `public/leitstand/vormerken-auftrag.js`, Tests in `vormerken-auftrag.test.mjs`):**
- `sammlungVormerkbar(eintrag)` → `{ ok }` oder `{ ok: false, grund }` (Code für i18n): Zuordnung `keine` (kein
  Katalogeintrag; `mehrdeutig`/`alias` → nein), `pruefbericht_letzter` vorhanden, Urteil ≠ NICHT_GEEIGNET, Typ `skill`
  oder `mcp` (`agent` → nein, Agents sind noch nicht installierbar), Skill mit `quelle.pfad ≠ ''` (Bericht über das ganze
  Repo → „erst einen Skill-Ordner prüfen“).
- `baueSammlungVormerkenAuftragstext(eintrag, bericht)`: gleicher Rahmen wie `baueVormerkenAuftragstext` (GENAU EIN neuer
  Eintrag, keine andere Änderung, `freigabe: "OFFEN"` Pflicht) — der Eintrag steht als **JSON-Skelett** im Text; feste
  Felder sind gesetzt, nur die Felder mit `<…>` bestimmt die ausführende Rolle aus der Quelle:
  - fest: `id` (`ableiteRessourcenId(name)`), `typ: "extern"`, `name`, `unterart` (Typ des Berichts), `lizenz`/`kosten`
    (laut Sammlung), `freigabe: "OFFEN"`;
  - Skill: `herkunft { art: "extern", url: <Ref-URL> }`, `installation_vorlage { skill_pfad: quelle.pfad }`;
  - MCP: `herkunft { art: "extern", url: <Sammlungslink>, paket: "npm:<paket>" }`, `installation_vorlage { bin, args: [],
    werkzeuge }` — `bin` fest, wenn `bin_ziele` genau einen Eintrag hat, sonst `<…>` mit der Regel „Pfad aus `bin` der
    package.json von `<paket>@<version>`, relativ, muss in der geprüften Dateiliste stehen“; `werkzeuge`
    `["mcp__<id>__<…>"]` aus Quelle/README; `wirkung` `<…>` mit Regel (nur `lokal` ist installierbar, E-F36-4);
  - `<…>` außerdem: `beschreibung` (ein Satz aus der Quelle, Vorschlag: Kurzbeschreibung der Sammlung), `capabilities`
    (bekannte Codes, mindestens einer).
  - Hinweis: Die Installation prüft Serverstart und Werkzeugliste fail-closed (falsches `bin`/`werkzeuge` → 422, kein
    Eintrag).
  - Beleg: Bericht-id (`artefakt_id`, Version), gepinnte Version, Sammlungszeile.
- `views/sammlung.js`: Knopf „Vormerken“ im Detail unter dem Bericht, nur wenn `sammlungVormerkbar` ok **und**
  `workforceAktiv()` (sonst Hinweis „nur im Projekt AI Workforce — der Katalog gehört zur Workforce“). Ablauf = Scout-Weg:
  `legeAuftragAn` → `routeAuftrag` → Link zum Ablauf; „Erneut versuchen“ reicht dieselbe `auftragId` ein. Die
  Anlage+Routing-Schritte wandern aus `views/capabilities.js` in ein kleines Modul `public/leitstand/vormerken-ablauf.js`
  (beide Stellen nutzen es). Kein neuer Schreibweg, der F27-Guard (ZWINGEND-Freigabe am Ausführungsschritt) bleibt.
- **Gate** (`scripts/check-f45-f2b2-pruefung.mjs`, Abschnitt (j)): Skelett aus dem Text eines Skill- und eines
  MCP-Fixture-Eintrags parsen, `<…>` durch Beispielwerte ersetzen → `validiereRessourcenDaten` ohne Verstoß und
  `pruefeInstallierbarkeit` = null; dazu: Bericht aus der Sammlung (`pruefbericht-s-<id>`) + daraus gebauter
  Katalogeintrag → `waehleBericht(…, angezeigteQuelle des Katalogeintrags)` gilt (Skill: `quellPfad` = `quelle.pfad`).

### 2 „Eignung prüfen“ in der Capability Library
- Ort: im Freigabedialog des Library-Details. Gibt `…/installation/vorbereiten` `pruefbericht: null` mit Sperre zurück
  (kein geltender Bericht zur angezeigten Version), steht im Sperrblock statt des Links „in der Sammlung prüfen“ der Knopf
  **„Eignung prüfen“** (nur mit Option `eignungPruefen` von `bindeEmpfehlungInstallation` — Workboard/Workflows behalten
  den Link). NICHT_GEEIGNET bzw. übersprungene Dateien (Punkt 5) zeigen keinen Knopf (ein neuer Lauf derselben Version
  änderte nichts).
- Ablauf identisch zur Sammlung (Pin, Bestätigung inkl. Pfad-Feld bei git, Prüflauf, Bericht): Steuerung aus
  `views/sammlung.js` in `public/leitstand/views/pruefung-ablauf.js` herausgelöst (`erzeugePruefAblauf({ container,
  schluessel: 'sammlung_id' | 'katalog_id', praefix, zeichne, nachBericht })`); `renderPruefAblauf` bekommt einen
  `praefix` für DOM-ids (`sm`/`lib`, Sammlung und Library stehen auf derselben Seite). Die Library zeichnet den Ablauf in
  einen eigenen Platz `.library-eignung` im Detail.
- Nach „fertig“: Ablauf schließen und den Freigabedialog neu vorbereiten (derselbe Knopf „Prüfen & freigeben“) — der
  Bericht erscheint dort.
- Server unverändert.

### 3 Detail der Sammlung als eigene volle Tabellenzeile (F-1068 (3))
- In der Namensspalte statt `<details>` ein Knopf „Details“ (`aria-expanded`, `aria-controls`); offen → direkt nach der
  Zeile `<tr class="sm-detailzeile" id="sm-detail-<id>"><td colspan="6">…</td></tr>` (nur gerendert, wenn offen — kein
  `[hidden]` gegen `display:block` der Mobilregel, F-622). Umschalten zeichnet die Liste neu und setzt den Fokus zurück
  auf den Knopf; ein laufender Ablauf hält das Detail offen (wie heute). `.sm-daten` darf breit zweispaltig werden
  (`dt` 12rem, ab 900 px gestapelt). Keine neuen Farben/Schatten.

### 4 F-1061 (1): Stand der lokalen Fähigkeiten-Datei über Neustarts
- **Kern-Artefakt** `faehigkeiten-lokal-stand` über `registriereKernArtefakt` (Lineage, Hash-Kette) in der Ablage der
  Workforce (`kontrollzustand/`, dieselbe wie die Prüfberichte). Payload `{ hash, zeitpunkt, quelle }` (`quelle`:
  `serverstart` | `route` | `bestaetigt`), handgeschriebene Prüfung + `schemas/kontrollzustand-faehigkeiten-stand-
  payload.schema.json`. Modul `src/faehigkeiten/stand.ts`: `ladeLokalStand(basis)` (neueste gültige Version oder null),
  `schreibeLokalStand(stand, profilReferenz, basis)`.
- `erzeugeLokalWaechter(pfad, jetzt, ablage = null)`; `ablage = { lies(), schreibe(stand) }`:
  - Start: `lies()` = null (erster Start) → heutiger Stand gilt als bekannt und wird geschrieben;
    gleich dem aktuellen Hash → bekannt (Zeitpunkt aus der Ablage); **abweichend** → bekannt = gespeicherter Hash mit
    `quelle: "neustart"` → `pruefe()` meldet die Fremdänderung, Band + Sperre wie heute bis zur Bestätigung;
    `lies()` wirft (Ablage kaputt) → Log + bekannt = `{ hash: 'unbekannt', quelle: 'neustart' }` (fail-closed: gesperrt
    bis zur Bestätigung).
  - `nachRoute`/`bestaetige` schreiben zusätzlich in die Ablage; ein Schreibfehler wird geloggt (Speicher gilt weiter;
    nach dem nächsten Neustart zeigt der alte Stand ein Band — fail-closed).
- Nur der CLI-Bindeblock gibt eine Ablage mit (Profilreferenz aus der Startvorlage der Workforce); Gates/Tests ohne
  Ablage verhalten sich wie heute.
- Oberfläche: Band nennt `quelle` „neustart“ („Stand vor dem letzten Neustart des Leitstands“) — i18n de/en/ru/tr.
- ARCHITECTURE.md §2: der Satz „lebt nur im Speicher … keine weitere Datei“ wird ersetzt (Kern-Artefakt, Vergleich beim
  Start, Abweichung = fremd geändert).
- Tests (`routen-faehigkeiten.test.mjs`, echte Lineage im Temp-Ordner): Neustart nach Fremdänderung → `fremdGeaendert`
  mit quelle `neustart`, `aendereLokaleDatei` 409, `einschaltSperrgrund`/Start gesperrt; Bestätigen → frei, nächster
  Neustart frei; Neustart ohne Änderung → frei; erster Start schreibt; kaputte Ablage → gesperrt.

### 5 F-1078 (b): übersprungene Dateien sperren die Installation
- `waehleBericht`: gilt der neueste passende Bericht (nicht NICHT_GEEIGNET), aber sein Prüflauf hat Dateien übersprungen (jeder
  Grund: `binaer`, `zu_gross`, `pfad_abgelehnt`, auch `symlink`/`submodul`/`eintragstyp` — die Skill-Installation bricht bei
  Symlink/Submodul ohnehin mit 422 ab) → `{ bericht, sperre: "Prüflauf hat N Dateien übersprungen
  (binaer 2, zu_gross 1) — nicht installierbar" }`. git mit Bericht über einen höheren Pfad: gezählt werden nur
  Einträge unter dem installierten Pfad, wenn die Liste vollständig ist (Summe je Grund = Länge der Liste), sonst alle
  (fail-closed). Gilt damit für Vorbereiten (Knopf aus, Grund im Dialog) und die Installation (409) bei npm und Skills.
- `vergleicheInhalt`: ein „nicht geprüft“er Pfad, der in `fakten.uebersprungen.liste` steht, heißt
  `<pfad> (im Prüflauf übersprungen (<grund>))`.
- Rot-Tests in `src/sammlung/pruefbericht.test.ts` (npm, Skill, höherer Pfad mit Treffer außerhalb, gekürzte Liste) und
  Gate (i)-Erweiterung über die Route vorbereiten (409/Sperre).
- Sammlung: Vormerken bleibt möglich, mit Hinweis „Prüflauf hat N Dateien übersprungen — danach nicht installierbar
  (F-1078, K37)“.

### Doku/Register
F-1056 → erledigt; F-1061 (1), F-1068 (3), F-1078 (b) erledigt (Nachträge); neu F-1079 (K36), F-1080 (K37), weitere ab
F-1081 aus den Prüfpässen. Fixpaket-Zeile F-2b-2c, Akte `features/F45/feature.md` (Ist-Aufwand), `docs/STATUS.md`,
ARCHITECTURE.md §2. Nachweis `features/F45/nachweise/f2b2c/` (Render 1440/390, hell/dunkel, de + en).

### Invarianten
Keine Abhängigkeit; `.claude/settings.json`, Hooks, `projekte.json`, `ressourcen.json`, `vorlagen/` unverändert;
`starteWorkflowSchritt(` 6× im Server; keine Rohströme, keine `*.lokal.json` im Repo.

### Risiken / Fragen an den Advisor
- R1 (Punkt 4): Kern-Artefakt für **Laufzeitstand** — `kontrollzustand/` ist je Checkout. Ein zweiter Leitstand in einem
  anderen Worktree hat eine eigene Ablage: schreibt A über die Routen, sieht B beim nächsten Start ein Band (aus Sicht von
  B fremd — fail-closed, aber Reibung). Jede Route schreibt einen Checkpoint (append-only, wächst mit jedem Schalterklick).
  Alternative laut Auftrag: atomare JSON-Datei in der Workforce-Ablage. Wer `faehigkeiten.lokal.json` ändern kann, kann
  auch die Ablage ändern — die Hash-Kette macht das sichtbar, eine JSON-Datei nicht.
- R2 (Punkt 1): Die ausführende Rolle kennt die Bytes des Pakets nicht; `bin`/`werkzeuge` falsch → Installation 422
  (fail-closed). `bin_ziele` gibt es nur für neue Berichte.
- R3 (Punkt 1): Ref-URL statt Sammlungslink für Skills — weicht vom Wortlaut „Ref-URL der Sammlung“ ab, wenn damit der
  Link selbst gemeint war (Doppelpfad, siehe Befunde).
- R4 (Punkt 2): Der Knopf liegt im Freigabedialog statt direkt im Detail — „ohne geltenden Bericht“ ist erst nach dem Pin
  bekannt (Ref/Version kann weitergelaufen sein).
- R5 (Punkt 5): Sperre für jeden Grund statt nur der drei genannten — `skill-installation.ts` bricht bei Symlink/Submodul im
  Quellbaum ohnehin mit 422 ab; so steht der Grund vor dem Klick statt danach.
- R6 Zuschnitt: fünf Punkte, zwei davon Oberfläche mit Refaktor (Ablauf-Steuerung, Detailzeile). Kein echter Modelllauf
  nötig (Gate mit Attrappen).

## Advisor-Pass (13.10.2026, frischer Kontext, `architecture-advisor`)

Urteil: **überarbeiten**. Findings (Auszug): **A1** (hoch) eine kaputte Lineage-Ablage wirft nicht (`ladeGueltigeCheckpoints`
überspringt still) — der geplante fail-closed-Zweig ist unerreichbar; **A2** (hoch) „erster Start = heutiger Stand gilt“ ist
fail-open (Ablage löschen + Datei ändern + Neustart = still übernommen); A3 (mittel) die Hash-Kette hat kein Geheimnis —
Löschen/Anhängen bleibt unsichtbar; **A4** (mittel) gegen ein Kern-Artefakt: `kontrollzustand/` ist getrackt (rechnerlokale
Hashes im Repo, Wachstum je Klick), gilt je Checkout (zweiter Worktree zeigt falsche Bänder), umgelenkter Pfad
(`LEITSTAND_FAEHIGKEITEN_LOKAL_PFAD`) nicht unterschieden; A5 eine JSON-Ablage braucht eine Ausnahme in §2. B1 Ref-URL +
`skill_pfad = quelle.pfad` trägt; B2 `sammlungVormerkbar` zusätzlich `pruefeSkillPfad` und `SKILL.md`; B3 Zuordnung nach
dem Vormerken über den Namen — id mit NFKD ableiten, Gate prüft „zugeordnet“; B4 `bin_ziele` ist fremde Eingabe — nur nach
Form- und Dateilisten-Prüfung fest einsetzen; B5 P5-Klausel, `beschreibung` fest aus der Sammlung, 422-Grund mit den
angebotenen Werkzeugen; B6 Skelett als gültiges JSON; C1–C3 Punkt 5 trägt, Gleichheit mit dem Unterpfad zählt, `kollision`
mit, fehlende Angabe → Sperre, Grenzfall „neuerer Bericht über höheren Pfad mit gekürzter Liste sperrt“ benennen; D1 Knopf
nur bei OFFEN; D2 Delegation für Eingabe/Enter im Ablauf-Modul; D3 Pfad-Eingabe beim Neuzeichnen erhalten; **E1** Zuschnitt
trägt nicht → Teilung F-2b-2c-1 (Server/Sicherheit) / F-2b-2c-2 (Oberfläche) empfohlen.

## Plan v2

Ablage-Entscheidung Punkt 4: Der Auftrag gibt vor „nennt der Advisor einen Grund gegen ein Kern-Artefakt → atomare
JSON-Datei in der Workforce-Ablage (nicht im Repo, nicht faehigkeiten.lokal.json selbst)“. A4 nennt solche Gründe →
**JSON-Datei**. Zuschnitt (E1): beide Teile auf diesem Branch, gebaut in der Reihenfolge Teil 1 → Teil 2; die Pfadliste des
Berichts trennt sie, damit Stefan in zwei Commits/PRs stagen kann.

**Teil 1 (Server/Sicherheit)**
- 4: `src/faehigkeiten/stand.ts` — `faehigkeiten.stand.json` **neben** der lokalen Datei (Standard
  `~/.ai-workforce/faehigkeiten.stand.json`; bei umgelenktem Pfad im selben Ordner, damit Tests/Nachweise nie Stefans Stand
  schreiben), Inhalt `{ faehigkeiten_stand_schema: 'v0', pfad, hash, zeitpunkt, quelle }`, Schreiben tmp + rename, LF.
  Startregel (A1/A2): Stand gültig und `pfad` gleich → gleich: bekannt; abweichend: bekannt = gespeicherter Hash, quelle
  `neustart`. Stand fehlt/ungültig/anderer Pfad → nur wenn die Datei fehlt, gilt `fehlt` als bekannt (und wird
  geschrieben); sonst bekannt = `unbekannt`, quelle `unbekannt` → Band + Sperre bis zur Bestätigung (einmalig beim ersten
  Start mit F-2b-2c, dokumentiert). `nicht lesbar` wird nie geschrieben. `nachRoute`/`bestaetige` schreiben; Fehler →
  Log (fail-closed nach Neustart). Nur der CLI-Bindeblock übergibt einen Stand-Pfad. ARCHITECTURE.md §2: neue Ausnahme.
  Tests: Neustart nach Fremdänderung → Band + Sperre; Neustart ohne Änderung → frei; Stand leer + Datei da → gesperrt;
  Stand kaputt → gesperrt; anderer Pfad → gesperrt; leer + Datei fehlt → frei und geschrieben; Bestätigung → nächster
  Neustart frei.
- 5: wie v1, plus C2/C3 (Gleichheit mit Unterpfad, jeder Grund, fehlende/kaputte Angabe → Sperre), gemeinsame Hilfe
  `unterpfadImBericht` statt der Inline-Rechnung in `baueInhaltPruefer`.
- 1 (Server): `sammleFakten` `paket.bin_ziele`; `berichtKurz` + `typ`, `bin` (genau ein geprüfter Pfad: Form wie
  `installation_vorlage.bin`, ohne `./`, in `inhalt.dateien`, sonst null), `skill_md` (SKILL.md direkt im Ordner),
  `uebersprungen` (Zahl); 422 „Werkzeuge“ der Installation nennt die angebotenen Werkzeuge (B5).

**Teil 2 (Oberfläche)**
- 1 (UI): `ableiteRessourcenId` mit NFKD; `sammlungVormerkbar` (+ `skill_pfad`-Segmente, `skill_md`); Skelett als gültiges
  JSON mit Platzhaltern `"<…>"`, `beschreibung` fest aus der Sammlung, P5-Klausel; `vormerken-ablauf.js` für Scout und
  Sammlung. Gate (j): Skelett → `validiereRessourcenDaten`, `pruefeInstallierbarkeit`, `waehleBericht` gilt, `ordneZu`
  führt die Zeile als „zugeordnet“.
- 2: Knopf nur bei OFFEN (Library zeigt den Dialog ohnehin nur dort); Ablauf-Modul bringt Klick/Eingabe/Enter mit.
- 3: Detailzeile; Pfad-Eingabe im Ablauf gemerkt (D3); ein Auffrischer-Wechsel öffnet kein geschlossenes Detail.
