# F45 B2b-3d — Plan (Umfangs-Abgleich + Eingabefelder Bereiche/Budget)

Branch `f45/b2b3d-umfang` (von origin/main `e2efd91`, #347). Grundlage: F-978 (kein Umfangs-Abgleich), F-1083 (1)
(`bereiche` ohne Setzer), F-1122 (1)(2) (`budget_tokens` ohne Eingabeweg; E-B2b-3c-1), Plan B2b-3c v1 §3 und v2 (B5/B6).

Entscheidungen Challenger (gesetzt):
- **E-B2b-3c-1 = ja:** Budget gehört zum Arbeitspaket; eine Erhöhung gilt für alle weiteren Abläufe desselben Auftrags
  (gebaut ist es so — nur Doku: F-1122 (2) erledigt).
- Umfangs-Abgleich **nur Hinweis, kein Halt**; berührte Dateien der Ausführung gegen `bereiche`, Präfix auf
  Ordner/Module, `/` und `\` gleich. Ohne `bereiche` kein Abgleich.
- Sichtbar in der Abnahme (Dateiliste, keine Kennungen) und als Zeile in der Eingabe von Review und qa:
  „Diese Dateien liegen außerhalb der vereinbarten Bereiche: …“.
- Eingabe im Leitstand: „Bereiche“ (Liste) und „Budget (Tokens, leer = Standard der Kontrolltiefe)“; Standardwert als
  Platzhalter.

## 1 Reine Funktion `src/umfang/` (neu: `index.ts`, `umfang.test.ts`)

`gleicheUmfangAb(dateien, bereiche)`:
- `bereiche` undefined/leer ⇒ `null` (kein Abgleich).
- Normalisierung je Pfad und Bereich: `\` → `/`, führendes `./` weg, mehrfache `/` zu einem; beim Bereich zusätzlich
  abschließendes `/`, `/**`, `/*` weg. Kein Groß/Klein-Abgleich (Repo ist case-sensitiv in git).
- Treffer: `pfad === b` oder `pfad.startsWith(b + '/')` — `src/a` trifft `src/a/x.ts` und `src/a`, nicht `src/ab.ts`.
  Ein Bereich `.` bzw. leer nach Normalisierung trifft alles.
- Geprüft wird `pfad` und bei Umbenennung zusätzlich `alter_pfad` (liegt einer außerhalb, ist die Datei außerhalb; gemeldet
  wird `pfad`).
- Ausnahmen: `istAusnahmePfad` (src/ausfuehrung-vorbedingung) — `kontrollzustand/` u. a. zählen nie als außerhalb.
- Ergebnis `{ bereiche: string[] (wie im Auftrag), ausserhalb: string[] }`, sortiert, eindeutig.

`baueUmfangsZeile(ausserhalb)` ⇒ `''` bei leerer Liste, sonst
„Diese Dateien liegen außerhalb der vereinbarten Bereiche: a, b, c“ (für den Review-/qa-Auftrag; deutsch wie alle
Instruktionen dort). Bei > 50 Dateien die ersten 50 + „… und n weitere“.

Unit-Tests rot → grün: innen/außen, `\`-Pfade, `./`, Bereich mit `/`, `/**`, Präfix-Falle `src/ab.ts`, Umbenennung,
Ausnahme-Pfad, ohne `bereiche` ⇒ null, alle innen ⇒ leer, Zeile leer/gefüllt/gekürzt.

## 2 Server

**Festhalten nach der Ausführung** (Auftrag: „Ergebnis festhalten“): als optionales, additives Feld `umfang` in der
Änderungsübersicht des Ausführungslaufs (`aenderungsuebersicht-<lauf_id>`) — Muster `loeschliste` (F45 B1a-1): dieselbe
Registrierung, kein neuer Artefakttyp, kein neuer Schreiber.
- `starteWorkflowSchritt` reicht im `laufort` zusätzlich `bereiche` durch, nur für `rolle === 'ausfuehrung'` und nur, wenn
  der Auftrag sie trägt (Muster `loeschliste: schritt.rolle === 'ausfuehrung'`). Ad-hoc-Läufe (POST /api/laeufe) bleiben
  ohne Feld.
- Im Nachlauf: `umfang = gleicheUmfangAb(dateien, laufort.bereiche)`; nur bei `!== null` ins Artefakt. Eigener try: ein
  Fehler im Abgleich nimmt der Übersicht nichts (protokolliert, ohne Feld).
- Schema `schemas/kontrollzustand-aenderungsuebersicht-payload.schema.json` + `validiereAenderungsuebersichtDaten`:
  `umfang: { bereiche: string[≥1], ausserhalb: string[] }`, additionalProperties false. Beispiel in `schemas/examples/`.
- Alt-Artefakte ohne Feld ⇒ „kein Abgleich“ (keine Nachberechnung).

**Projektion Abnahme:** GET …/abnahme liefert die Übersicht schon als `aenderungsuebersicht.daten`; zusätzlich ein
schlankes Feld `umfang` neben `aenderungsuebersicht`: `{ status: 'kein_abgleich' | 'ok', ausserhalb: string[] }`
(`kein_abgleich` auch ohne gelaufene Ausführung oder ohne Übersicht) — die View liest nur dieses Feld.

**Zeile in Review- und qa-Eingabe:** in `starteWorkflowSchritt` für `rolle === 'code-reviewer'` und
`output_schema === 'ergebnis-qa'`: Übersicht des Ausführungslaufs (`findeAusfuehrungsSchritt(...).lauf_id`) laden; bei
`umfang.ausserhalb.length > 0` `baueUmfangsZeile` als eigener Absatz anhängen — beim Review NACH dem Policy-Block (der
Auftrag vor der Karte bleibt bitgleich, Gate f45-b2a2 (b)), beim qa am Ende. Ohne Treffer kein Text (bitgleich).

**Eingabe:** POST /api/auftraege nimmt optional `bereiche` (string[]) und `budget_tokens` (ganze Zahl ≥ 1) an —
`ERLAUBTE_AUFTRAG_FELDER` + Prüfung mit den bestehenden Validatoren aus `src/auftrag` (`validiereAuftragBereiche`, der
`budget_tokens`-Regel aus B2b-3c — eine Quelle); Durchreichen an `registriereAuftrag`. Für jede Herkunft erlaubt.

**Platzhalter-Quelle:** GET `/api/budget/standard` ⇒ `{ standard, hoch, 'fast-lane' }` aus `BUDGET_DEFAULTS` (rein lesend,
eine Quelle; keine Kopie der Zahlen im Leitstand). Die Kontrolltiefe steht beim Anlegen noch nicht fest (sie entsteht
beim Routen) — der Platzhalter nennt deshalb den Standard und den Wert für kleine Aufträge.

## 3 Leitstand

- **Formular „Auftrag & Start“** (`public/leitstand/index.html` `#auftrag-formular`, `views/projekt.js`): ein
  aufklappbarer Bereich „Arbeitspaket · optional“ (Muster „Kontext hinzufügen · optional“) mit
  - „Bereiche“ — Textfeld, ein Ordner oder Modul je Zeile; Hinweis „Leer = kein Abgleich. Dateien außerhalb werden nur
    gemeldet, nichts wird angehalten.“
  - „Budget (Tokens, leer = Standard der Kontrolltiefe)“ — `input type="text" inputmode="numeric"`; Platzhalter
    „Standard: 14 700 000 · kleine Aufträge: 5 300 000“ (Zahlen aus der Route, nach Sprache formatiert; nicht ladbar ⇒
    Platzhalter ohne Zahl).
  - Lesen: Zeilen trimmen, leere weg, Duplikate weg; Budget: Leerzeichen/Tausenderpunkte weg, ganze Zahl ≥ 1, sonst
    Fehlerzeile im Formular (kein POST). Gelten für „Ablauf vorbereiten“ und „Auftrag ohne Ablauf anlegen“; nach Erfolg
    geleert wie Titel/Ergebnis.
  - Reine Hilfsfunktionen (`leseBereiche`, `leseBudget`) in einer kleinen Datei `public/leitstand/arbeitspaket-felder.js`
    mit Unit-Test.
- **Abnahme** (`views/workflow-abnahme.js`): bei `umfang.status === 'ok' && ausserhalb.length > 0` ein Hinweis (Notiz
  „Hinweis“-Stil, keine neue Farbe) „Außerhalb der vereinbarten Bereiche geändert“ + Satz „Nur ein Hinweis — der
  Ablauf wurde nicht angehalten.“ + Liste der Pfade (`<code>`, `overflow-wrap:anywhere`). Ohne Treffer nichts.
- i18n de/en/ru/tr; keine Feldnamen/Kennungen im sichtbaren Text. View-Test für Hinweis (mit/ohne).
- Das Arbeitspaket-Formular aus B2a-2 (Click-to-Work an einem Finding, `views/workboard.js`, AK-Entwurf) bekommt die Felder
  in diesem Bau **nicht** — der Entwurf wird vom Poll neu gerendert und braucht dafür Zustandsübernahme (eigenes Finding).

## 4 Gate `scripts/check-f45-b2b3d-umfang.mjs` (neu, in `check:gates`)

Muster `check-f45-b2b3c-budget.mjs` (echter HTTP-Testserver, Wegwerf-git-Projekt, Attrappe schreibt Dateien in das
Projekt, damit die echte Änderungsübersicht sie sieht):
- (u1) Arbeitspaket mit `bereiche: ['src/']`, Ausführung ändert `src/a.ts` und `docs/x.md` ⇒ Übersicht `umfang.ausserhalb`
  = [`docs/x.md`], Ablauf läuft weiter (kein Halt, Review läuft), GET …/abnahme `umfang` ok mit der Datei.
- (u2) alle Dateien innerhalb ⇒ `ausserhalb` leer, Review-Eingabe ohne Zeile.
- (u3) ohne `bereiche` ⇒ kein Feld in der Übersicht, `umfang.status` `kein_abgleich`, Review-Eingabe ohne Zeile.
- (u4) Review- und qa-Eingabe (`eingaben.auftragstext` der Attrappe) enthalten in (u1) die Zeile mit `docs/x.md`.
- (u5) POST /api/auftraege mit `bereiche` und `budget_tokens` ⇒ Auftrag trägt beide; ungültige Werte ⇒ 400; mit
  `budget_tokens` klein ⇒ nach der Ausführung Budget-Halt mit `quelle: 'arbeitspaket'` (Eingabe wirkt im Budget-Halt).
- (u6) GET /api/budget/standard = `BUDGET_DEFAULTS`.
- (f) Quelltext: `starteWorkflowSchritt(` 6× in `scripts/leitstand-server.mjs`, F-228-Zählung (Workflow-Schreiber 14 /
  `.eingefroren` 13) unverändert.

## 5 Render-Nachweis `features/F45/nachweise/b2b3d/`

Testinstanz mit Attrappe (Muster `features/F45/nachweise/b2b3c/`): Lagen „Abnahme mit Umfangs-Hinweis“ und „Formular mit
beiden Feldern (aufgeklappt, Platzhalter sichtbar)“. Ansichten de 1440 dunkel, de 1440 hell, de 390, ru 390 hell,
de 1440 200 %; `scrollWidth` je Ansicht; Klicktabelle. Danach design-guardian.

## 6 Grenzen (NICHT)

Kein Halt bei Umfangsverletzung, kein Rückfrage-Kanal (B2b-3b), keine Neukalibrierung der Defaults (F-1121). Nicht
berührt: `.claude/`, `projekte.json`, `ressourcen.json`, `vorlagen/`, `.githooks`, `workflow-vorlagen/`, `startvorlagen/`.
`starteWorkflowSchritt(` bleibt 6×, F-228-Zählung unverändert (kein neuer Workflow-Schreiber).

## 7 Akzeptanz

- Unit-Tests `src/umfang`, Änderungsübersicht-Validator (`umfang`), `pruefeAuftragsformular` (neue Felder),
  `arbeitspaket-felder.js`, Abnahme-View rot → grün.
- Gate (u1)–(u6), (f) grün; `npm run check:gates`, `npm run check` grün (oder Speicherabbruch gemeldet).
- code-reviewer, qa, design-guardian; höchstens eine Korrekturrunde.

## 8 Risiken

- Ohne Arbeitsordner enthält die Übersicht auch Stefans eigene, nicht committete Änderungen im Projektordner (Bestand der
  Übersicht) ⇒ ggf. Fehlhinweis; nur Hinweis.
- Bereiche als Prosa („das Exportmodul“) ⇒ alles „außerhalb“ — Hinweis im Formular sagt „Ordner oder Modul je Zeile“.
- Gekürzte Übersicht (`gekuerzt`): `dateien` bleibt vollständig (nur `patch` wird gekürzt) — prüfen.
- Platzhalter nennt zwei Zahlen, weil die Kontrolltiefe beim Anlegen nicht feststeht.

## Offene Punkte, nicht stillschweigend entschieden

- O1 „Festhalten“: Feld `umfang` in der Änderungsübersicht (Muster `loeschliste`, Schemaänderung) gegen Berechnung zur
  Lesezeit (kein Schema, aber nicht „festgehalten“). Gewählt: Feld in der Übersicht.
- O2 Platzhalter-Quelle: neue lesende Route gegen Feld in einer bestehenden Antwort. Gewählt: neue Route.
- O3 Formular: nur „Auftrag & Start“, nicht das Finding-Formular aus B2a-2.
- O4 qa-Zeile auch, wenn der qa-Schritt Codex wäre (heute claude-code) — dieselbe Zeile, worker-unabhängig.

## 9 Zuschnitt und Schätzung

≈ 0,4–0,5 AT (Funktion + Server ≈ 0,15, Gate ≈ 0,1, Leitstand + i18n + Render ≈ 0,2). Trennlinie, falls zu groß:
Eingabefelder (§2 „Eingabe“/„Platzhalter-Quelle“, §3 Formular, Gate (u5)/(u6)) als eigener Bau.
