# F45 FB-1 „Fähigkeit bauen“ — Daten (Plan v1)

Stand: 23.10.2026 · Branch `f45/fb1-faehigkeit-vorschlag-daten` (von main 5198f35) · Findings F-1069, F-1096 (K39) ·
`docs/projekt/fixpaket-f45.md` Z. 108 · Nicht-Ziele: keine Oberfläche (FB-2), kein Einschalten (E-F45-6), kein MCP-/Skript-Weg,
keine Änderung an der deny-Regel `Write/Edit(**/.claude/**)`, keine Hash-Normalisierung.

## 1 Ziel

Ein Ablauf (Rolle `ausfuehrung`, im eigenen Arbeitsordner) legt einen Skill oder Agent als **Vorschlag** ab:
`vorschlaege/faehigkeiten/skills/<name>/SKILL.md` (+ weitere Dateien) bzw. `vorschlaege/faehigkeiten/agents/<name>.md`.
Die Abnahme zeigt die Vorschläge (Daten), Stefan übernimmt oder verwirft per Route. Übernehmen verschiebt den Vorschlag nach
`.claude/skills/<name>/` bzw. `.claude/agents/<name>.md` **desselben Arbeitsordners** und setzt die Freigabe nach Inhalt
(`inhalt_freigaben['<typ>:<name>'] = hash`) in `~/.ai-workforce/faehigkeiten.lokal.json`; eingeschaltet wird nicht (`an`
unverändert). Die deny-Regel bleibt — der Lauf schreibt nie `.claude/`, der Server schreibt dorthin nur auf Stefans Klick.

## 2 Bausteine

### 2.1 `src/faehigkeiten/vorschlag.ts` (neu; Erkennung, nur lesend)

- `VORSCHLAG_ORDNER = 'vorschlaege/faehigkeiten'`, `VORSCHLAG_GRENZEN = { agentBytes: 256 KiB, skillBytes: 1 MiB, skillDateien: 200 }`.
- `erkenneFaehigkeitVorschlaege(wurzel): FaehigkeitVorschlag[]` — synchron, wirft nie. Fehlt `vorschlaege/faehigkeiten` ⇒ `[]`
  (der häufige Fall, ein `lstat`). Je Eintrag `{ typ, name, pfad (relativ, '/'), beschreibung, hash, ziel_existiert, grund }`:
  - Behälter (`vorschlaege`, `vorschlaege/faehigkeiten`, `…/skills`, `…/agents`) per `lstat`: Verknüpfung oder kein Ordner ⇒
    ein Eintrag mit `typ` (`skill`/`agent`, beim gemeinsamen Behälter `null`), `name: null`, `grund`, keine Kinder gelesen.
  - Skill: jeder Eintrag unter `skills/` muss ein Ordner sein (`lstat`, Verknüpfung ⇒ grund); `NAME_MUSTER` am Ordnernamen;
    `listeSkillDateien` (wirft bei Symlink/Junction ⇒ grund), `pruefeSkillDateiNamen` (`.claude`-Segment, `CLAUDE.md`),
    Grenzen (Summe der Größen, Anzahl); `SKILL.md` vorhanden; Frontmatter über `pruefeFrontmatter('skill', …)` (streng,
    unverändert), Frontmatter-`name` = Ordnername; Hash = `berechneInhaltHash(ordner)`.
  - Agent: jeder Eintrag unter `agents/` muss eine reguläre Datei `<name>.md` sein (Ordner, Verknüpfung, andere Endung ⇒
    grund); `NAME_MUSTER` am Stamm; Größe ≤ Grenze; Frontmatter `pruefeFrontmatter('agent', …)` mit `werkzeugNamen = null`
    (nur Form: schlichte Namen, keine `Agent`/`Task`/`Skill`; die Zugehörigkeit zum Werkzeugsatz prüft wie bisher der Start),
    `name` = Stamm; Hash = sha256 der Bytes.
  - Hash wird auch bei `grund` berechnet, wenn lesbar (Anzeige), aber ein Eintrag mit `grund` ist nie übernehmbar.
  - `ziel_existiert`: Ziel unter `.claude/skills` bzw. `.claude/agents` vorhanden — Vergleich ohne Groß-/Kleinschreibung über
    `readdirSync` der Zielordner (plattformneutral; die CLI führt Namen ohne Unterschied der Schreibweise, vgl.
    Mehrdeutigkeitsprüfung in `ermittleProjektFaehigkeiten`). Zielordner nicht lesbar ⇒ `true` (fail-closed).
- `pruefeZielIgnoriert(wurzel, vorschlaege): Promise<Map<pfad, boolean|null>>` — **ein** asynchroner Aufruf
  `git --no-optional-locks check-ignore --no-index -z -- <ziel1> …` mit cwd = Arbeitsordner (Ziel je Skill
  `.claude/skills/<name>/SKILL.md`, je Agent `.claude/agents/<name>.md`), nur für Einträge ohne grund. Exit 0/1 ⇒ ausgegebene
  Pfade sind ignoriert, die anderen nicht; anderer Exit, Zeitgrenze (5 s) ⇒ `null` (nicht bestimmbar). Liest nur Regeln
  (`--no-index`: kein Index), kein Filter-Treiber.
- `leseVorschlag(wurzel, typ, name)` — derselbe Prüfweg für genau einen Vorschlag (für die Routen), ohne git.
- `src/faehigkeiten/index.ts`: `pruefeFrontmatter` exportiert; Parameter `werkzeugNamen: readonly string[] | null` (null = nur
  Form). Der strenge Leser `leseFrontmatterStreng` bleibt unverändert.

### 2.2 Projektion `GET /api/workflows/<id>/abnahme`

Additiv `faehigkeitVorschlaege: [...]` (Einträge aus 2.1 plus `ziel_ignoriert`), **nur** wenn `ermittleLaufort(...)` einen
Arbeitsordner liefert (`arbeitsordner !== null`) und die Liste nicht leer ist; sonst fehlt das Feld (Antwort bitgleich). Ohne
Arbeitsordner (kein Bedarf, Bestand) gibt es keine Vorschläge — im Projektordner bleibt der Kern lesend (ARCHITECTURE §2).
Unabhängig davon, ob die Abnahme offen ist (die Routen prüfen das; FB-2 entscheidet über Knöpfe mit `entscheidung`). Kosten
je Poll ohne Vorschläge: ein `lstat`. Server: Aufruf eines Helfers `baueVorschlagProjektion(wurzel)` aus dem Routenmodul.

### 2.3 Routen `scripts/leitstand/routen-faehigkeit-vorschlag.mjs` (neu)

- `erkenneVorschlagRoute(pfad)` — `/api/workflows/<rohId>/faehigkeit-vorschlag/(uebernehmen|verwerfen)` ⇒ `{ rohId, aktion }`
  oder null (Stringvergleich im Modul, keine Methode — `check-f813-csrf` (4)).
- `pruefeVorschlagKoerper(body)` — genau `{ typ: 'skill'|'agent', name: NAME_MUSTER, hash: SHA256_MUSTER }`, sonst 400. Keine
  `projekt_id` im Körper (unbekanntes Feld ⇒ 400); die Projekt-id kommt aus der Instanz.
- `fuehreVorschlagAktionDurch({ aktion, koerper, wurzel, abnahmeOffen, laufAktiv, lokalPfad, projektId, waechter })` ⇒
  `{ status, koerper }`, wirft nie (unerwartet ⇒ 409 mit Grund, geloggt). Reihenfolge:
  1. `wurzel === null` (kein bereiter Arbeitsordner) ⇒ 409; `laufAktiv` ⇒ 409; `!abnahmeOffen` ⇒ 409.
  2. `leseVorschlag` ⇒ fehlt 404; `grund` ⇒ 409 mit Grund; `hash ≠` ⇒ 409 (Hash-Drift, „neu laden“).
  3. Begrenzung per `realpath`: `realpath(vorschlaege/faehigkeiten)` liegt in `realpath(wurzel)`, die Quelle in
     `realpath(vorschlaege/faehigkeiten)`; beim Übernehmen `.claude/` und `.claude/<skills|agents>` (anlegen mit
     `mkdirSync(recursive)`) per `realpath` in `realpath(wurzel)` bzw. `realpath(.claude)`. Abweichung ⇒ 409.
  4. Übernehmen: `ziel_existiert` (erneut, unmittelbar vor dem Verschieben) ⇒ 409, nie überschreiben. Lokale Datei vorab
     prüfen (`lokalPfad === null` ⇒ 409; Wächter meldet Fremdänderung ⇒ 409; ungültig ⇒ 409) — vor jeder Dateibewegung.
     Dann `renameSync(quelle, ziel)`; danach `aendereLokaleDatei(lokalPfad, projektId, { art: 'freigabe', eintrag: '<typ>:<name>',
     hash }, undefined, waechter)`; schlägt das fehl ⇒ `renameSync(ziel, quelle)` zurück und dessen Status. Erfolg ⇒
     `waechter.nachRoute(hash)`; Antwort `200 { typ, name, hash, ziel: '.claude/…', eingeschaltet: false }`.
  5. Verwerfen: `rmSync(quelle, { recursive: true })`, Antwort `200 { typ, name, verworfen: true }`.
  6. Danach leere Behälter (`skills|agents`, `faehigkeiten`, `vorschlaege`) best effort mit `rmdirSync` (nur wenn leer).
- `baueVorschlagProjektion(wurzel)` (async) — 2.1 + `pruefeZielIgnoriert`, Fehler ⇒ geloggt, `[]`? Nein: Fehler je Eintrag
  bleibt sichtbar als `ziel_ignoriert: null`; die Erkennung selbst wirft nicht.

Server (registriert nur): vor dem generischen `GET /api/workflows/`-Detail und vor den POST-Workflow-Routen

```js
const vorschlagRoute = erkenneVorschlagRoute(pfad)
if (vorschlagRoute !== null) {
  if (req.method !== 'POST') { sendeJson(res, 405, …); return }
  // workflowId dekodieren/prüfen wie …/abnahme (400), Workflow laden (404), Body (400)
  const laufort = ermittleLaufort(workflowId, daten)
  const { status, koerper } = fuehreVorschlagAktionDurch({ …, wurzel: laufort.ok && laufort.arbeitsordner !== null && !arbeitsordnerVorbereitungLaeuft.has(workflowId) ? laufort.wurzel : null,
    abnahmeOffen: ermittleAbnahmeStand(daten, abnahmeVersion).offen, laufAktiv: laufAktiv || laufSperreAnzeige().aktiv, … })
  sendeJson(res, status, koerper); return
}
```

`starteWorkflowSchritt(` bleibt 6×; kein Workflow-Schreiber, kein Kontrollzustand. Geschrieben werden nur Dateien im
Arbeitsordner (Verschieben/Löschen) und die lokale Datei über das bestehende `aendereLokaleDatei` (Muster F-1/F-2a).

### 2.4 Regelzeilen (kein Schemafeld)

- Ausführung: Konstante `FAEHIGKEIT_VORSCHLAG_REGEL` in `src/faehigkeiten/vorschlag.ts`: „Agents/Skills nie unter .claude/,
  sondern unter vorschlaege/faehigkeiten/skills/<name>/ (mit SKILL.md) bzw. vorschlaege/faehigkeiten/agents/<name>.md; Stefan
  übernimmt sie in der Abnahme.“ Angehängt im Server nur für `schritt.rolle === 'ausfuehrung'` mit `laufort.arbeitsordner !== null`
  (sonst gibt es keine Übernahme). Eine Zeile im Server.
- Architekt (K39): Zeile in `baueFeatureRolleninstruktion` (gilt auch im Modus `projekt`): „Bei wiederkehrenden Aufgaben in der
  zusammenfassung die Form mit Begründung empfehlen: deterministisch/wiederholt → Skript/Gate; Urteil/Wissen → Skill; eigene
  Rolle mit eigenem Kontext → Agent; fremder Dienst/Daten → MCP (über die Sammlung).“

### 2.5 Ausgleich der Server-Zeilen (Wachstumsbremse netto ≤ 0)

Server ≈ +30 Zeilen (Import 1, Route ≈ 22, Abnahme ≈ 3, Regelzeile ≈ 2). Ausgleich: die reinen Helfer
`workflowStatusZuAusgang` und `beschreibeAutomatAusgang` (≈ 68 Zeilen mit Doku, `leitstand-server.mjs:5107–5188`, kein
Schreiben, nur Ausgang → Text/Status) nach `scripts/leitstand/automat-ausgang.mjs` (+1 Importzeile). Netto ≈ −37; Grenze in
`scripts/wachstumsbremse-server.json` auf das Ist senken.

### 2.6 Gate `scripts/check-f45-fb1-faehigkeit-vorschlag.mjs`

Echter Handler mit Attrappen zur Laufzeit (Muster `check-f45-b2b4a1-sichern`: tmp-Repo, Arbeitsordner über den echten Startweg,
Attrappen-Worker; lokale Datei im tmp). Neue Module dynamisch importiert (auf main fehlen sie ⇒ Befund je Fall, nicht Absturz).
Fälle einzeln:
(u1) Übernahme Skill: Ziel da, Vorschlag weg, `inhalt_freigaben['skill:x'] = hash`, `an` unverändert, Wächter kennt den Stand
(kein „fremd geändert“). (u2) Übernahme Agent ebenso. (h) Hash-Drift ⇒ 409, nichts bewegt. (z) Ziel existiert (auch andere
Schreibweise) ⇒ 409, Ziel unverändert. (l) Lauf aktiv ⇒ 409 (über die Handler-Sperre; Mechanik siehe O7). (a) Abnahme nicht
offen ⇒ 409. (s) Symlink/Junction im Skill-Ordner und als Agent-Datei ⇒ grund, Übernahme 409 (Junction unter Windows,
Symlink sonst; nicht erzeugbar ⇒ übersprungen mit Meldung). (n) Name/Frontmatter ungültig (Ordnername ≠ name, Feld außerhalb
der Positivliste, `.claude`-Segment im Skill) ⇒ grund, 409. (v) Verwerfen ⇒ Vorschlag weg, lokale Datei bitgleich. (b) Abnahme
ohne Vorschläge bitgleich (Feld fehlt; Antwort gleich der ohne Ordner `vorschlaege/`). (p) projekt_id im Körper ⇒ 400. (c) fremde
Herkunft ⇒ 403. (r) Regelzeilen in Ausführungs- und Architekten-Auftrag (Ausführung nur mit Arbeitsordner). (e)
`starteWorkflowSchritt(` 6×. Rot-Nachweis: das Gate in eine `git archive`-Kopie von main gelegt ⇒ jeder Fall rot mit eigenem
Befund; zusätzlich je Fall eine Sabotage-Kopie (z. B. Hash-Vergleich entfernt) im Bericht.
Unit-Tests: `src/faehigkeiten/vorschlag.test.ts`, `scripts/leitstand/routen-faehigkeit-vorschlag.test.mjs`,
`scripts/leitstand/automat-ausgang.test.mjs` — plattformneutral (Pfade nur über `join`/`mkdtemp`, keine Windows-Literale).

### 2.7 Doku und Findings

- ARCHITECTURE.md (Kern, Deckel 17 800 B, Ist 17 565 B) und Detail gemeinsam: §2 Arbeitsordner-Ausnahme um die Übernahme
  ergänzen (`docs/architektur/arbeitsordner.md`), lokale Datei: neue Schreibroute (`docs/architektur/lokale-dateien.md`); §1
  Ausnahme zu „bis W2 keine neuen Routen“ (siehe O1, `docs/architektur/wachstumsbremse.md`).
- `state/findings.md`: F-1069 und F-1096 Nachtrag (FB-1 erledigt, FB-2 Anzeige offen); neu F-1164 TECH_DEBT P3 (CRLF-Hash),
  F-1165 PROCESS_IMPROVEMENT P2 (Belegslücke B3/Beleg 15, E-Stefan 23.10.2026), F-1166 PROCESS_IMPROVEMENT P2 (Windows-Pfad +
  resolve). `fixpaket-f45.md`: Zeile „Fähigkeit bauen“ in FB-1/FB-2 teilen. `docs/STATUS.md` Stand.

## 3 Offene Punkte — nicht stillschweigend entschieden

- **O1 (Regelkonflikt, Entscheidung Stefan):** ARCHITECTURE §1 / `docs/architektur/wachstumsbremse.md` / F-1131: „bis W2
  entstehen keine neuen Routen“. Der Auftrag verlangt zwei neue POST-Routen. Die Gates lassen eine neue Route regelkonform nicht
  zu: ein Literal an `pfad` im Server ⇒ Wachstumsbremse (b1)/(b2) rot; `req.method` im Modul ⇒ `check-f813-csrf` (4) rot; eine
  Zeile `req.method === 'POST' && x !== null` im Server ⇒ f813 (3) „nicht ableitbar“. Vorschlag: Dispatch über
  `erkenneVorschlagRoute(pfad)` (Modul) und `req.method !== 'POST'` ⇒ 405 im Server — CSRF-Schutz unverändert zentral (der Haken
  greift für jede nicht lesende Methode vor jeder Route), aber über die DEKLARIERTEN Lücken beider Gates (andere Variable;
  f813 (3) sieht die Zeile nicht). Ausgleich: eigene CSRF-Probe im Gate (c) und die Route in den Bestandslisten der Doku. Kern-
  Satz „bis W2 keine neuen Routen“ bekäme die Ausnahme „außer FB-1 (Entscheidung Stefan 23.10.2026), Muster Modul-Erkenner +
  Methodenprüfung im Server“. Alternative: Routen zurückstellen bis W2 (FB-1 liefert dann nur Erkennung + Projektion).
- **O2:** Agent-`tools` beim Vorschlag nur der Form nach geprüft (kein Werkzeugsatz bekannt). Genügt das, oder Werkzeugnamen des
  Ausführungs-Werkzeugsatzes der Startvorlage heranziehen?
- **O3:** Projektion auch bei nicht offener Abnahme (Vorschläge bleiben sonst unsichtbar liegen und würden über „Bereit zum
  Sichern“ mitcommittet). Richtig so?
- **O4:** `git check-ignore --no-index` mit einem nicht existierenden Pfad unter einem als Ordner ignorierten `.claude/` — erkennt
  git Regeln wie `.claude/` (mit Schrägstrich) für einen Pfad, dessen Ordner nicht existiert? Im Unit-Test mit echtem git messen;
  scheitert es, Ziel als Ordner prüfen (`.claude/skills/<name>/`) oder Elternordner zusätzlich abfragen.
- **O5:** Größengrenzen (256 KiB Agent, 1 MiB / 200 Dateien Skill) — frei gewählt, angelehnt an `GRENZEN.maxDateiBytes`
  (`src/sammlung/inhalt.ts:33`).
- **O6:** Ausführungs-Regelzeile nur im Arbeitsordner — auch bei Läufen, die gar keine Fähigkeit bauen (Kontextkosten eine
  Zeile). Alternative: nur bei Aufträgen mit Stichwort — verworfen (rät).
- **O7:** Gate-Fall „Lauf aktiv“: über HTTP nur mit einem hängenden Attrappen-Lauf deterministisch erzeugbar (Lauf startet,
  Worker wartet auf ein Versprechen) — oder über `globalerLaufZustand.aktiv` der Handler-Option. Welcher Weg trägt ohne
  Wettlauf?
- **O8:** Verschieben per `renameSync`: unter Windows kann ein offener Dateihandle (Editor, Virenscanner) EPERM/EBUSY werfen ⇒
  409 „nichts übernommen“ mit Grund. Bei Teilerfolg eines Ordner-Renames gibt es keinen Teilerfolg (atomar je Volume). Quelle
  und Ziel liegen im selben Arbeitsordner (selbes Volume).
- **O9:** ARCHITECTURE-Kern hat 235 B Luft; die Sätze zu O1 und §2 passen knapp oder nicht — dann Deckel anheben (Entscheidung
  Stefan, (a2) bewusst einmal rot) oder anderen Kerntext kürzen.

## 4 Risiken

Kleinster Pfad zur Datenzerstörung ist das Verschieben/Löschen im Arbeitsordner — begrenzt durch realpath, lstat-Kette,
Hash-Gleichheit, „nie überschreiben“ und Rücknahme bei Fehler der lokalen Datei. Die lokale Datei wird nur über
`aendereLokaleDatei` geschrieben (Wächter, ungültig ⇒ 409). Kein Kontrollzustand, kein Workflow-Schreiber.
