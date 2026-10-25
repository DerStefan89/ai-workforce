# Plan v1 — F45 B5b-2b-2 „Roadmap: Bereinigungsliste“

Auftrag: Challenger, 25.10.2026 (Schnitt in `feature.md`, „Stand B5b-2b-1“). Basis `1e4c550`, Branch `f45/b5b2b2-bereinigung`.
Grundlage: `plan-b5b2b.md` Teil b, `advisor-b5b2b.md` (Server-Entwurf freigegeben; A1, A2), `plan-b5b2b-v2.md` §6 (Vorarbeit).
Nicht: Pflege & Fixes, Kanban, Bug-Felder (2c); Balken ziehen; Sperr-Meldung je Ziel (F-1189 qa9 → W2); Unterscheidung
offen/begründet (qa8 → W2); F-1199/F-1203 (View-Test) bleiben offen. ARCHITECTURE.md unverändert (kein neuer Schreibweg, F-1191).
Kein neues Gate (F-1190).

## 1 Server — einzige Änderung (`scripts/leitstand/routen-planung.mjs`)

- Neue interne reine Funktion `bereiteBestaetigungVor(stand, akte, eintrag, entscheidung, grund, datum)` →
  `{ ok: true, ziele, hinweis }` | `{ ok: false, antwort }`. Inhalt = heutiger Block des POST ab „Vorschlag vorhanden?“ bis
  einschließlich R1-Gate vor dem Schreiben (B10: „keine aktuelle R1-Abweichung“ bleibt im POST). Liest und schreibt nichts.
- POST: nach Hash-409 und Eintragssuche Aufruf; danach unverändert Schreiben/Rückbau. Bitgleich (Reihenfolge der Prüfungen,
  Texte, Körper).
- GET: je Vorschlag jedes Eintrags Aufruf mit Grund-Platzhalter „Vorprüfung“ und `kontext.datum ?? lokalesDatum()`; ergänzt
  `moeglich: boolean`, `grund: string | null` (= `antwort.koerper.grund`). Keine `verstoesse` im GET (B6).
- Nicht in der Vorprüfung (DEKLARIERT im Kopf): Sperre durch offenen Ablauf (A1 — POST 409, GET bleibt `moeglich: true`),
  Hash-Abweichung (POST 409). Ein Grund kann das Ergebnis nicht ändern (O1: `pruefeGrund` normalisiert auf eine Zeile ohne
  Steuerzeichen, der Grund steht nur in der Änderungszeile).
- Kopf und Antwortvertrag (Zeilen 20–25) nachziehen.

### A2 — jedes `return antwort(4xx…)` des Blocks

| Pfad | Zuordnung |
|---|---|
| Vorschlag nicht vorhanden (422) | unerreichbar aus GET: geprüft wird je vorhandenem Vorschlag |
| Akte fehlt (`akte.roh === null`) | erreichbar nur bei Groß-/Kleinschreibung auf case-insensitivem Dateisystem (`leseAktenStatus` findet die Akte ohne exakten Ordnernamen) — Test als Äquivalenz „falls Vorschlag, dann nicht möglich ⇔ 422“ |
| Akte kein UTF-8 | Test (ungültiges Byte im Rumpf; `leseAktenStatus` liest verlustbehaftet) |
| `setzeAkteAbgeschlossen`: keine Status-Zeile | unerreichbar: ohne Status kein Vorschlag (`roadmap-regeln.ts:185`) |
| … unbekannter Status | Test |
| … ABGESCHLOSSEN / ABGEBROCHEN | unerreichbar: keine Abweichung bzw. kein Vorschlag |
| … `Abgenommen:` vorhanden | Test |
| … Akte-Gate rot | Test (Akte ohne Pflichtabschnitt) |
| … Rundlauf weicht ab | unerreichbar ohne Fehler im Modul (Tests in `akte-abschliessen.test.ts`) |
| STATUS.md kein UTF-8 | Test |
| `setzeStatusMdStatus`: CRLF (mit Standardform) | Test |
| … 0× bzw. 2× für die ID (Konvention vorhanden) | Test je Fall |
| … Rundlauf weicht ab | unerreichbar ohne Fehler im Modul |
| STATUS.md fehlt / ohne Standardform | **kein Sperrgrund** — Test: `moeglich: true`, POST 200 mit `hinweis` |
| LAEUFT: roadmap.json CRLF | Test |
| `setzeMeilensteinStatus`: JSON/Schema, Meilenstein fehlt | unerreichbar: Stand wäre `ungueltig` bzw. kein Eintrag |
| … Lage/Rundlauf (Aufbau weicht ab) | Test, falls mit gültigem Schema erzeugbar (z. B. zwei `status`-Literale im Fenster); sonst Begründung im Test-Kopf |
| Ausnahmen CRLF (nur mit Ausnahme) | Test (mit und ohne Ausnahme) |
| `entferneStatusAusnahme`: ungültig | unerreichbar: Stand wäre `ungueltig` |
| … ≠ 1 einzeiliger Eintrag | Test (Paar über mehrere Zeilen) |
| R1 neu / „bliebe Abweichung“ | Test (verwaiste Ausnahme im Meilenstein bei LAEUFT) |

### Tests — neue Datei `scripts/leitstand/routen-planung-vorpruefung.test.mjs`

node:test, Temp-Repo je Fall unter `os.tmpdir()` (Muster Gate b5b1b2), Modulaufruf `fuehrePlanungRouteDurch` mit
`workflows`/`auftraege` als Rückrufe und festem `datum`. Je Sperrgrund: GET `moeglich: false` mit `grund` ⇔ POST 422 mit
genau diesem `grund`, nichts geschrieben. Dazu: „möglich ⇒ POST 200“ für beide Entscheidungen (einmal mit feindlichem Grund:
Steuerzeichen-frei, aber mit `## `, Backticks, 500 Zeichen), STATUS.md ohne Standardform (möglich, 200 mit hinweis),
Workflow-Sperre (GET möglich, POST 409 mit workflowId).

### Gate b5b1b2 — nur (a) sachlich

Jeder Vorschlag trägt `moeglich` (boolean) und `grund` (string|null); Attrappe: alle fünf „Feature → ABGESCHLOSSEN“ und
„M3 → LAEUFT“ `moeglich: true` (A1, F21 scheitert nur an der Sperre in (c)); echtes Repo: nur die Form (kein Zeitzünder).
Gate b5b1b1 prüft die Vorschlagsform nicht — unverändert.

## 2 Client

- `public/leitstand/api.js`: `holeBereinigung()` (holeJsonOderWirf, Zeitlimit POLL), `bestaetigeBereinigung(koerper)` (POST, rohe
  Response, Zeitlimit wie `speicherePlanung`).
- Neu `public/leitstand/roadmap-bereinigung.js` (rein: kein DOM, kein fetch) + `roadmap-bereinigung.test.mjs`:
  - `deuteBereinigung(antwort)` → `{ zustand: 'ok' | 'nicht_vorhanden' | 'ungueltig', eintraege, fehler }`; unbekannte Form ⇒
    `ungueltig` mit Hinweis; Vorschläge ohne `moeglich` gelten als möglich nur wenn boolean true (fail-closed: fehlt ⇒ nicht möglich).
  - `bereinigungsAnzahl(liste)`.
  - `darfBestaetigen(eintrag, stand)`: Wahl ist ein möglicher Vorschlag, Grund nicht leer, Phase nicht `sendet`, Liste aktuell.
  - `darfSchreiben(eintrag, stand)`: zusätzlich Schritt `pruefen` und bei `meilenstein_laeuft` Häkchen gesetzt (qa2).
  - `baueBestaetigung(eintrag, entscheidung, grund)` → `{ eintrag, entscheidung, grund, hashes }` (hashes unverändert aus GET).
  - `deuteBestaetigungAntwort(status, koerper)`: 200 → `{ art: 'ok', eintrag, entscheidung, geschrieben, hinweis, git }`; 409 mit
    `workflowId` → `gesperrt`; 409 sonst → `konflikt`; 400/422 → `abgelehnt` (grund, verstoesse); sonst `fehler`.
  - HTML: `bereinigungHtml({ liste, staende, erfolg, oben, laden, datum, sendetIrgendwo })` — Abschnitt `<section id=… aria-labelledby>`
    „Bereinigung (n)“; Einleitung (genau ein Eintrag je Bestätigung; qa8: „Dauerhaft begründete Ausnahmen sind heute nicht
    vorgesehen.“); je Eintrag Karte: `<M>/<F>`, Feature-Status, Quelle (STATUS.md-Zeile), Vorschläge als Radiogruppe
    (`fieldset`/`legend`; Text + Nebenwirkung des Servers wörtlich; nicht möglich ⇒ `disabled`, Grund sichtbar, „von Hand“),
    Begründung Pflicht (`maxlength` = `AKTE_GRUND_MAX`), „Bestätigen …“.
  - Bestätigungsschritt (O2: inline im Eintrag, `role="group"` mit Überschrift, Fokus darauf — kein `<dialog>`, weil die Seite bei
    jeder Zustandsänderung neu geschrieben wird): Wahl und Nebenwirkung; `feature_abgeschlossen`: „`Abgenommen:` trägt das heutige
    Datum (<datum>), nicht das Datum der fachlichen Abnahme.“ (qa6); `meilenstein_laeuft`: Warnhinweis (note amber) „Im Leitstand
    nicht zurücknehmbar — zurück auf ABGESCHLOSSEN nur von Hand in docs/projekt/roadmap.json“ + Pflicht-Häkchen (qa2); Knöpfe
    „Jetzt schreiben“ / „Zurück“.
  - Erfolg oben im Abschnitt (bleibt nach dem Neuladen, auch bei n = 0, bis „Schließen“): „Geschrieben, nicht committet“,
    geschriebene Pfade, fester Hinweis qa7 „Freitext und Überschriften in docs/STATUS.md von Hand prüfen.“, `hinweis` der Antwort
    zusätzlich, Git-Block über `gitBlockHtml` (eigener Hinweisschlüssel).
  - Meldung am Eintrag (Servertext wörtlich über `grundUndVerstoesse`); ist der Eintrag nach dem Neuladen weg, oben.
- `views/roadmap.js` (nur Verdrahtung):
  - Zustand `bereinigung = { projektId, laden: 'laedt' | 'ok' | 'fehler', liste, staende: Map<eintrag, { wahl, grund, haekchen,
    schritt: 'auswahl' | 'pruefen', phase: 'offen' | 'sendet', meldung }>, erfolg, oben }`; eigener Anfragezähler.
  - Laden: parallel in `ladeRoadmap` (scheitert für sich, Fehler im Abschnitt mit „Erneut laden“); Neuladen nur der Liste über
    `ladeBereinigung({ behalten })`.
  - „Jetzt schreiben“: Phase `sendet` (alle übrigen Einträge gesperrt: genau ein Eintrag je Klick), POST, Projektprüfung danach;
    200 ⇒ Erfolg oben, Zustand des Eintrags verworfen, Roadmap (`behalten`) und Liste neu; 409/422/400 ⇒ Meldung, Liste neu;
    Zeitlimit/Netz ⇒ Meldung „kann trotzdem geschrieben sein“, Liste neu.
  - Eingaben (`input`/`change`): Wahl, Grund, Häkchen in den Zustand; Knöpfe direkt schalten (kein Neuschreiben). Radio-`change`
    schreibt neu (Bestätigen-Zustand und Hinweis ändern sich; Fokus über `fokusSchluessel` mit `data-roadmap-bereinigung-*`).
  - Trennzeile: „· n Abweichungen zur Bereinigung“ als Knopf, springt zum Abschnitt (scrollIntoView + Fokus auf die Überschrift;
    kein Hash-Link — der Router nutzt den Hash).
  - Projektwechsel verwirft den Zustand.
- Texte `roadmap.bereinigung.*` in de/en/tr/ru.
- CSS: `.rm-bereinigung`, Karten im Muster vorhandener Klassen (`note amber|red`, `button`), Radiogruppe, keine neuen Farbwerte;
  Phone: einspaltig, keine Querrollbalken.

## 3 Nachweis (A7, Muster 2b-1)

`features/F45/nachweise/b5b2b2/erzeuge-nachweis.mjs`: selbst angelegte Wegwerf-Kopie unter `os.tmpdir()` (Basis-Commit, keine
Verknüpfung, keine `node_modules`, Pfadprüfung vor dem Löschen), eigener Leitstand-Prozess auf freiem Port. In der Kopie gezielt
präpariert und mitcommittet: STATUS.md mit zweiter Standardform für F22 (⇒ „F22 → ABGESCHLOSSEN“ deaktiviert mit Grund). Bilder
(WebP ≤ 8 MB; warten auf das Ende aller Ladezustände inkl. Liste): Liste mit möglichem und deaktiviertem Vorschlag; Bestätigung
„M3 → LAEUFT“ mit Nicht-zurücknehmbar-Hinweis und Häkchen; Bestätigung „F20 → ABGESCHLOSSEN“ mit Datumshinweis; Erfolg (echter
POST „F20 → ABGESCHLOSSEN“ gegen die Kopie) mit STATUS.md-Hinweis und Git-Block — dunkel/hell, 1440/390. Protokoll mit `git diff
--stat` der Kopie. Kein Schreiben gegen den Arbeitsbaum.

## 4 Prüfen

Betroffene Tests einzeln (`routen-planung-vorpruefung.test.mjs`, `roadmap-bereinigung.test.mjs`, `roadmap-anpassen.test.mjs`,
`akte-bearbeiten.test.mjs`, `projekt-wechsel.test.mjs`, `i18n.test.mjs`), Gates check-f20-design-tokens, check-f44-i18n,
check-f45-b5b1a-planung, check-f45-b5b1b1-planung-schreiben, check-f45-b5b1b2-bereinigung, check-feature, check-docs einzeln,
dann `npm run test` (bei Speicherabbruch nicht neu starten, melden). Danach design-guardian, code-reviewer, qa.

## 5 Offene Punkte

- O1: Vorschlag ohne `moeglich` im Client fail-closed (nicht möglich) — oder als möglich (Rückwärtsverträglichkeit)? Plan: fail-closed.
- O2: Radio-`change` mit Neuschreiben — oder direktes Schalten? Plan: Neuschreiben, Fokus über `fokusSchluessel`.
- O3: Zähler an der Trennzeile auch bei eingeblendeten abgeschlossenen Meilensteinen? Plan: ja, immer, solange n > 0.

## 6 Risiken

- R1 POST-Verhalten ändert sich beim Auslagern → Gate b5b1b2 komplett + neue Äquivalenztests.
- R2 GET wird teurer (je Vorschlag ein Akte-Gate) → bei ≤ 5 Einträgen vernachlässigbar (Advisor R2).
- R3 Nachweis schreibt echte Daten → nur selbst angelegte Temp-Kopie, Abbruch sonst.
- R4 View wächst (1132 Zeilen) → Bausteine im reinen Modul, View nur Verdrahtung.
