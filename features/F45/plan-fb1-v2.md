# F45 FB-1 „Fähigkeit bauen“ — Daten (Plan v2)

Stand: 23.10.2026 · nach Advisor-Pass `features/F45/advisor-fb1.md` (Nicht freigegeben) und den Entscheidungen Stefans vom
23.10.2026. Plan v1 (`plan-fb1.md`) bleibt unverändert stehen.

## Entscheidungen Stefan (23.10.2026)

- **E-FB1-1 = Teilen** (B2): **FB-1a** jetzt (dieser Branch) — Erkennung, Projektion, Regelzeilen, Auslagerung, Gate, Findings.
  **FB-1b** danach — Routen „übernehmen“/„verwerfen“ samt Doku §1/§2.
- **E-FB1-2 = Zwischenmuster bis W2** (B1/O1): neue Routen dürfen bis W2 nach dem Muster „Modul erkennt den Pfad
  (`erkenne…Route(pfad)`), der Server prüft die Methode hinter dem zentralen CSRF-Haken (`req.method !== 'POST'` ⇒ 405)“
  entstehen; Eintrag in Kern, `docs/architektur/wachstumsbremse.md` und F-1131 mit FB-1b, Durchsetzungsgrad DEKLARIERT, eigene
  CSRF-Probe im Gate (direkt und über `/api/projekte/<id>/…`).
- **E-FB1-3 = Verwerfen immer, Übernehmen auch nach Annahme** (B5/O3): beide nur mit bereitem Arbeitsordner und ohne aktiven
  Lauf; Übernehmen bei offener Abnahme oder nach ANGENOMMEN, solange nicht aufgeräumt; „Review veraltet“ wird benannt und
  hingenommen.
- **E-FB1-4 = knapp im Kern, Rest im Detail** (O9): je ein kurzer Satz mit Durchsetzungsgrad im Kern, Wortlaut in
  `docs/architektur/`; passt es nicht, wird anderer Kerntext wörtlich ins Detail verschoben, der Deckel bleibt.

## FB-1a — Umfang dieses Branches

### 1 `src/faehigkeiten/vorschlag.ts` (neu, nur lesend)

- `VORSCHLAG_ORDNER = 'vorschlaege/faehigkeiten'`, `VORSCHLAG_GRENZEN = { agentBytes: 256 KiB, skillBytes: 1 MiB,
  skillDateien: 200, vorschlaege: 20 }` (O5, B8).
- `erkenneFaehigkeitVorschlaege(wurzel, optionen?)` — synchron, wirft nie; fehlt `vorschlaege/faehigkeiten` ⇒ `[]` (ein `lstat`).
  Eintrag `{ typ: 'skill'|'agent'|null, name: string|null, pfad, beschreibung, hash, ziel_existiert, grund }`.
  - Behälter per `lstat` (keine Verknüpfung, Ordner) — sonst ein Eintrag mit grund, nichts darunter gelesen.
  - B7: nie durch eine Verknüpfung lesen, keine Nicht-Datei lesen, Größe vor dem Lesen per `lstat`; dann `hash: null`.
  - B8: begrenzter Durchlauf je Skill-Ordner (lstat, Abbruch bei > 200 Dateien bzw. > 1 MiB, Verknüpfung/Sonderdatei ⇒ grund);
    erst danach `berechneInhaltHash` und `pruefeSkillDateiNamen`. Mehr als 20 Einträge ⇒ die ersten 20 (sortiert) und ein
    Eintrag `grund: 'mehr als 20 Vorschläge …'`.
  - Frontmatter über `pruefeFrontmatter` (aus `index.ts` exportiert, `werkzeugNamen = null` ⇒ nur Form der `tools`, O2); der
    strenge Leser bleibt unverändert. Name = Ordnername bzw. Dateistamm, `NAME_MUSTER`.
  - B12: Name eines eingebauten Skills (S7, Rest-Skills, Plugin-Skills der Referenz) bzw. Agents (Referenzliste) ⇒ grund;
    Referenzliste nicht lesbar ⇒ grund (fail-closed, wie der Start).
  - `ziel_existiert` ohne Unterschied der Schreibweise über `readdirSync` von `.claude/skills` bzw. `.claude/agents`; nicht
    lesbar ⇒ `true`.
- `pruefeZielIgnoriert(wurzel, eintraege)` — **ein** asynchroner Aufruf `git --no-optional-locks check-ignore --no-index --
  <ziele>` (Ziel `.claude/skills/<name>/SKILL.md` bzw. `.claude/agents/<name>.md`), Exit 0/1 auswerten, sonst `null`; Zeitgrenze
  5 s. O4 gemessen (Nachtrag `advisor-fb1.md`): Ordnerregeln greifen auch für nicht existierende Pfade.
- `FAEHIGKEIT_VORSCHLAG_REGEL` (Zeile für die Ausführung).

### 2 Projektion in `GET /api/workflows/<id>/abnahme`

`faehigkeitVorschlaege` additiv, nur mit Arbeitsordner (`ermittleLaufort(...).arbeitsordner !== null`) und nicht leerer Liste —
sonst fehlt das Feld (bitgleich). Unabhängig vom Abnahme-Stand (E-FB1-3). Helfer `baueVorschlagProjektion(wurzel, jetzt)` in
`scripts/leitstand/routen-faehigkeit-vorschlag.mjs` mit Cache je Arbeitsordner (Schlüssel Wurzel + Liste der Ziele, 10 s) für
`check-ignore` (B8); die Erkennung selbst läuft je Poll (lstat/Lesen begrenzt).

### 3 Regelzeilen

- Ausführung: `FAEHIGKEIT_VORSCHLAG_REGEL` nur für `rolle === 'ausfuehrung'` mit `laufort.arbeitsordner !== null` (O6). Keine
  Zeile beginnt mit „- [x]“.
- Architekt (K39): Zeile in `baueFeatureRolleninstruktion` (gilt auch im Modus `projekt`).

### 4 Ausgleich der Server-Zeilen

`workflowStatusZuAusgang` und `beschreibeAutomatAusgang` unverändert nach `scripts/leitstand/automat-ausgang.mjs` (rein), Test
`automat-ausgang.test.mjs`; Grenze in `scripts/wachstumsbremse-server.json` auf das Ist.

### 5 Gate `scripts/check-f45-fb1-faehigkeit-vorschlag.mjs` (FB-1a-Teil)

Neue Module dynamisch importiert (auf main ⇒ Befund je Fall). Echter Handler mit Attrappen (Muster `check-f45-b2b4a1-sichern`).
(e1) Skill gültig: typ/name/beschreibung, Hash = Hash, den `ermittleProjektFaehigkeiten` nach dem Kopieren nach `.claude/skills/`
berechnet; (e2) Agent ebenso; (e3) Symlink/Junction: Agent-Datei, im Skill-Ordner, Behälter ⇒ grund, kein Lesen durch den Link
(Hash null); (e4) Name/Frontmatter ungültig (Ordnername ≠ name, Feld außerhalb der Positivliste, Name nicht schlicht, eingebauter
Name) ⇒ grund; (e5) Dateinamen (`.claude`-Segment, `CLAUDE.md`) ⇒ grund; (e6) Grenzen (Agent-Größe, Skill-Dateizahl, > 20
Vorschläge); (e7) `ziel_existiert` auch in anderer Schreibweise; (e8) `ziel_ignoriert` true/false; (p1) Abnahme mit
Vorschlägen im Arbeitsordner ⇒ Feld da; (p2) Abnahme ohne Vorschläge ⇒ Feld fehlt, Antwort sonst gleich; (p3) ohne Arbeitsordner
(Bestand) ⇒ kein Feld, auch wenn der Projektordner `vorschlaege/` trägt; (r1) Ausführungs-Auftrag im Arbeitsordner trägt die
Regelzeile; (r2) Architekten-Auftrag trägt die Form-Empfehlung; (e) `starteWorkflowSchritt(` 6×. Rot-Nachweis: Gate in einer
`git archive`-Kopie von main ⇒ jeder Fall rot mit eigenem Befund.

### 6 Findings und Doku

- F-1069, F-1096: Nachtrag FB-1a (Stand, Entscheidungen E-FB1-1…4, FB-1b und FB-2 offen). Neu F-1164 TECH_DEBT P3 (Hash ohne
  Zeilenende-Normalisierung), F-1165 PROCESS_IMPROVEMENT P2 (Belegslücke B3/Beleg 15, E-Stefan 23.10.2026), F-1166
  PROCESS_IMPROVEMENT P2 (Windows-Pfad + resolve), F-1167 HARNESS_IMPROVEMENT P2 „FB-1b offen“ mit den Advisor-Befunden B3, B4,
  B6, B9, B10, B11, B13 als Pflicht für FB-1b.
- `docs/projekt/fixpaket-f45.md`: Zeile „Fähigkeit bauen“ in FB-1 (geteilt FB-1a/FB-1b) und FB-2 teilen. `docs/STATUS.md`.
- ARCHITECTURE: in FB-1a keine Regeländerung (keine neue Schreibstelle, keine Route); nur lesend.

## FB-1b — Vorgabe für den nächsten Branch (nicht hier gebaut)

Routen wie Plan v1 §2.3 mit: E-FB1-2 (Muster), E-FB1-3 (Bedingungen), B3 (409, wenn `<typ>:<name>` schon in `an` oder mit
anderem Hash in `inhalt_freigaben`), B4 (Entscheidung a/b/c zum `.claude`-Laufdiff, mit Gate-Fall), B6 (lstat-Kette vor jedem
Anlegen, nicht rekursiv, `relative()` auf `realpathSync.native`, Fall „`.claude` als Junction“), B9 (Agents per
`linkSync`+`unlinkSync` oder DEKLARIERT; Fehlerpfad Rücknahme scheitert ⇒ 500 mit beiden Orten), B10 (Doku Schreiben im
Modul), B11 (Kernsatz §2 mit Durchsetzungsgrad, `lokale-dateien.md`), B13 (Stefan: 409 oder Hinweis bei ignoriertem Ziel).

## Delta-Advisor-Pass

Für FB-1a bewusst nicht: FB-1a schreibt nichts (keine Route, keine Schreibstelle, kein Kontrollzustand), die für FB-1a
einschlägigen Befunde (B2, B7, B8, B12, O2, O4–O7) sind mechanisch eingearbeitet. Code-Reviewer und qa laufen nach dem Bau.
FB-1b bekommt einen eigenen Plan mit Advisor-Pass.
