# Plan v1 — Feature 0: Datenformate

Slug: feature0-datenformate
Stand: 2026-08-29
Rolle: Planner (Claude-Code-Sitzung, Repo-Zugriff)
Grundlage: `claude/76_HANDOFF_FEATURE0_DATENFORMATE.md`,
`claude/77_CHALLENGE_FEATURE0_DATENFORMATE.md` (beide von Stefan im Chat
eingefügt, liegen nicht im Repo), plus reale Repo-Verifikation dieser
Sitzung.

## 0. Verifikation (F-013 — nicht annehmen, prüfen)

Vor der Planung gegen den realen Repo-Stand geprüft, nicht aus den
Handoff-Dokumenten übernommen:

- **`ARCHITECTURE.md` Abschnitt 1** beschreibt `kontrollzustand/` und
  `profiles/` bereits im Präsens (Zeile 27–28), obwohl beide Ordner noch
  nicht existieren (`ls` bestätigt: nur `src/`, `state/`, `scripts/`,
  `docs/`, `features/`, kein `kontrollzustand/`, kein `profiles/`).
- **F-010** in `state/findings.md` (Zeile 81–86) ist real noch offen,
  `TECH_DEBT`, P4: „`kontrollzustand/`/`profiles/` in `ARCHITECTURE.md`
  im Präsens beschrieben, existieren noch nicht … erledigt sich mit
  Feature 0 (Datenformate)". Deckt sich mit dem Urteil aus `77_CHALLENGE`
  §1.
- **`state/gates.md`** Kalibrierungsmuster real gelesen (24 Gates,
  Kalibrierungs-Log ab Zeile 26): jede Zeile trägt Gate/Datei/Prüft/
  Rot-Fall/Grün-Fall mit echtem Repo-Beleg (Befehl + Wortlaut-Ausgabe),
  kein hypothetischer Fall. Dieses Muster wird unten für
  `check-datenformate.mjs` übernommen.
- **Zwei ADRs existieren bereits**, nicht nur der eine erfragte:
  - `docs/adr/datenformate-kontrollzustand-und-profile.md` (ADR-0002,
    Status: Entschieden): `kontrollzustand/` = JSON/JSONL, hält vom
    Profil nur eine gepinnte Referenz (Pfad, Hash, Version), nie eine
    Kopie; `profiles/` = JSON, alleinige editierbare Quelle.
  - `docs/adr/ein-ebenen-profilmodell.md` (ADR-0004, Status: Entschieden):
    Ein-Ebenen-Modell, kein Domänen-Profil mit Projekt-Overlay.
  Beide ADRs sind mit dem Wortlaut in `76_HANDOFF`/`77_CHALLENGE`
  deckungsgleich — kein Widerspruch gefunden.
- **`features/`** enthält aktuell nur `features/AF-F001/` (Harness-
  Konvention, kein Produktfeature). Für „Feature 0 — Datenformate"
  existiert **noch keine** `features/<id>/feature.md` — siehe
  Offener Punkt 1.
- **Die eigentliche Feature-Akte v0** (Ziel/Scope/Nicht-Ziele/
  Akzeptanzkriterien 1–9, von Stefan über den Product-Coach-Kopierblock
  erzeugt) lag dieser Planungsrolle **nicht im Volltext vor** — nur
  `77_CHALLENGE`s Verweise auf einzelne AC-Nummern (AC2, AC4, AC5, AC6,
  AC7, AC8, AC9). Der SCOPE unten stützt sich stattdessen auf die
  Feature-Umfang-Beschreibung aus dem Planungsauftrag selbst
  („zwei JSON-Schemas … je ein gültiges und ein ungültiges Beispiel …")
  plus `76`/`77`. Siehe Offener Punkt 2.

## 1. Ziel (prüfbar)

`kontrollzustand/` und `profiles/` sind keine Behauptung mehr, sondern
real vorhanden; ihr Format ist maschinell geprüft (Schema + Gate), nicht
nur in Prosa beschrieben. `F-010` ist danach tatsächlich erledigt, nicht
nur laut Findings-Eintrag als erledigbar markiert.

## 2. SCOPE

1. **`schemas/profile.schema.json`** — JSON-Schema (Draft 2020-12) für
   den Inhalt einer `profiles/*.json`-Datei. Ein-Ebenen-Modell (ADR-0004):
   eine vollständige, eigenständige Datei je Projekt. Pflichtfelder auf
   oberster Ebene (siehe Design-Entscheidung D1 unten): `projekt`,
   `version`, `gates`, `dod`, `werkzeuge`, `reviewRegeln`.
2. **`schemas/kontrollzustand.schema.json`** — JSON-Schema für die
   generische Kontrollzustand-**Hülle**, nicht für einzelne
   Unterarten (Checkpoint, Wirkungsmarke, Lineage, Transportpaket bleiben
   Nicht-Ziel, siehe Abschnitt 3). Pflichtfelder: `typ` (String),
   `erzeugtAm` (ISO-8601), `profilReferenz` (Objekt mit `pfad`, `hash`,
   `version` — siehe ADR-0002). `additionalProperties: true` auf
   oberster Ebene, weil künftige Unterarten eigene Payload-Felder
   ergänzen, ohne die Hülle selbst zu ändern.
3. **`schemas/examples/`** — je Schema ein gültiges und ein ungültiges
   Beispiel:
   - `profile.valid.json`, `profile.invalid.json`
   - `kontrollzustand.valid.json`, `kontrollzustand.invalid.json`
4. **`profiles/.gitkeep`**, **`kontrollzustand/.gitkeep`** — die Ordner
   selbst entstehen jetzt (das schließt `F-010`), bleiben aber leer bis
   zum ersten echten Gebrauch (Checkpoint Store, künftiges Feature).
5. **`scripts/check-datenformate.mjs`** — ein Gate-Skript für beide
   Schemas, Muster wie `check-feature.mjs`/`check-contract.mjs` (Node,
   kein externes Test-Framework). Prüft:
   a. Beide Schema-Dateien sind gültiges JSON.
   b. `schemas/examples/*.valid.json` erfüllt sein Schema (Grün-Fall).
   c. `schemas/examples/*.invalid.json` verletzt sein Schema
      (Rot-Fall) — das Skript benennt, welche Pflichtfeld-/Typ-Regel
      greift.
   d. Jede reale Datei unter `profiles/*.json` bzw.
      `kontrollzustand/*.jsonl`/`*.json` (sobald vorhanden) wird
      ebenfalls gegen ihr Schema geprüft — leere Ordner ⇒ „0 Dateien
      geprüft", kein Fehler (Muster: `check-feature.mjs` AC4).
   Eingehängt in `npm run check:template` und damit `npm run check`.
6. **Zeile in `state/gates.md`** — neue Tabellenzeile
   `check-datenformate.mjs`, Rot-Fall = die `*.invalid.json`-Beispiele,
   Grün-Fall = die `*.valid.json`-Beispiele, jeweils mit echtem
   Befehls-/Ausgabe-Beleg (nicht vorab behauptet — erst nach dem realen
   Bau-/Prüflauf einzutragen, siehe Budget-Abschnitt).
7. **Zeile in `state/memory-map.md`** — „Datenformat-Schema (JSON Schema
   für `profiles/`/`kontrollzustand/`)" → `schemas/*.schema.json` +
   `schemas/examples/`, „nicht hierhin": nicht direkt unter
   `profiles/`/`kontrollzustand/` (Empfehlung 3, Begründung Abschnitt 4).
8. **`docs/STATUS.md`** — Eintrag unter „Erledigt": Datenformate
   (`kontrollzustand/`, `profiles/`, Schemas, Gate) umgesetzt; `F-010`
   in `state/findings.md` auf erledigt setzen (Status-Feld, nicht
   löschen — Konvention unklar, siehe Offener Punkt 3).
9. **`ARCHITECTURE.md` Abschnitt 1** — eine Zeile für `schemas/`
   ergänzen. **Nicht Teil der ursprünglichen Feature-Umfang-Aufzählung
   im Auftrag**, aber notwendig: sonst entsteht exakt das Spiegelbild von
   `F-010` — ein neuer, real existierender Ordner, den `ARCHITECTURE.md`
   nicht kennt. Siehe Design-Entscheidung D4.

## 3. NICHT (Non-Scope, mit Grund)

- Checkpoint Store, Artifact Registry, Lineage-Mechanik — eigenes,
  späteres Feature (Deliverable 1, #1/#2 in `umsetzungsplan-fassung-1.md`).
- Schemas für Checkpoint-, Wirkungsmarken-, Lineage- oder
  Transportpaket-**Payload** — ausdrücklicher Nicht-Ziel-Rand dieses
  Auftrags; Feature 0 liefert nur die Hülle plus Profil-Referenz.
- Ausführungslogik jeder Art (kein Checkpoint-Schreibpfad, keine
  Hash-Kette, kein Ausführungswerkzeug) — Deliverable 3.
- Web-UI/Leitstand — Feature 9/10, ganz am Ende.
- Produktcode unter `src/` — Feature 0 liefert Schemas und ein
  Prüfskript unter `scripts/`, keinen Kern-Code.
- Generischer JSON-Schema-Validator (z. B. `ajv` als Dependency) —
  siehe Design-Entscheidung D3.
- Detaillierte Binnenstruktur von `gates`/`dod`/`werkzeuge`/
  `reviewRegeln` innerhalb des Profils (z. B. Feldschema eines einzelnen
  Gate-Eintrags) — nur die vier Felder als Container (Array/Objekt) auf
  oberster Ebene, ihr Binnenaufbau ist nicht Teil dieses Features
  (YAGNI, kein zweiter konkreter Bedarf bekannt).
- `features/<id>/feature.md` für Feature 0 selbst anlegen oder
  fortschreiben — Offener Punkt 1, nicht Teil dieses technischen Plans.

## 4. Design-Entscheidungen — Übernahme der vier Empfehlungen aus `77_CHALLENGE`

Laut Auftrag sind die vier Empfehlungen Vorschläge, kein Diktat; bei
Widerspruch zum realen Repo-Stand gewinnt das Repo. Ergebnis des
Abgleichs: **kein Widerspruch gefunden**, alle vier übernommen —
Begründung je Punkt:

- **D1 (Empfehlung 1, Version ≠ Hash):** `ADR-0002` und
  `ARCHITECTURE.md:39` nennen bereits drei getrennte Felder („Pfad, Hash,
  Version"/„Pfad, Hash und Version") — wären Hash und Version identisch,
  bräuchte es nur zwei Felder. Übernommen: `version` ist ein vom
  Profil-Autor gepflegtes Feld (Ganzzahl, monoton steigend erwartet, aber
  in Feature 0 nur als `integer, minimum: 1` geprüft — Monotonie-Prüfung
  bräuchte eine Historie, die es hier noch nicht gibt), `hash` bleibt
  Integritätsprüfung des Inhalts. Kein Widerspruch zu `ARCHITECTURE.md:40`
  („Version ist der Inhalts-Hash") — jene Zeile regelt kern-erzeugte
  Artefakte (A8), eine von Menschen editierte `profiles/`-Datei fällt
  nicht darunter; das ist eine Auslegung, kein wörtlicher
  Ausnahmesatz in `ARCHITECTURE.md` — als solche hier benannt, nicht
  stillschweigend glattgezogen.
- **D2 (Empfehlung 2, Scope-Grenze):** deckt sich wörtlich mit dem
  Nicht-Ziel-Rand des Planungsauftrags („nur die generische
  Kontrollzustand-Hülle plus Profil-Referenz"). Übernommen ohne
  Änderung.
- **D3 (Empfehlung 3, Ablageort `schemas/`):** `profiles/` und
  `kontrollzustand/` sind laut `ARCHITECTURE.md` Ablage für echte
  Projektdaten des Kerns; `docs/examples/` existiert bereits im Repo
  (ein Eintrag, `design-guardian.example.md`) für eine andere Art von
  Beispiel (ausgefüllte Skill-Vorlage, kein Schema-Testfixture) — kein
  Namenskonflikt, aber Beleg, dass „Beispiel" im Repo bereits einen
  Präzedenzfall unter `docs/` hat. `schemas/examples/` bleibt trotzdem
  näher am Muster der Aufgabe (Schema und Beispiel gehören zusammen,
  nicht zur Doku-Beispielsammlung). Übernommen; `schemas/` ist ein neuer
  Top-Level-Ordner, der in `ARCHITECTURE.md` noch fehlt (siehe D4).
- **D4 (Empfehlung 4, Gate-Muster):** identisch mit dem im Auftrag
  bereits verlangten `scripts/check-datenformate.mjs` +
  `state/gates.md`-Eintrag. Übernommen, ergänzt um Punkt SCOPE.9
  (`ARCHITECTURE.md`-Zeile für `schemas/`) — sonst bliebe der neue Ordner
  seinerseits unbelegt, das Gegenstück zu `F-010`.

**Zusätzliche, nicht aus `77_CHALLENGE` stammende Entscheidung (D5):**
Kein `ajv` oder anderer generischer JSON-Schema-Validator als neue
Dependency. `state/tooling.md` listet aktuell nur Biome/`tsc`/`node:test`/
`gh`; jedes neue Werkzeug verlangt laut `ARCHITECTURE.md` Abschnitt 6
vorher den Skill `werkzeug-auswahl`. Für zwei Schemas mit je zwei
Beispielen genügt handgeschriebene Feld-/Typ-Prüfung nach dem Muster von
`check-feature.mjs` (Pflichtfeld-Regex/Typ-Check statt generischem
Parser) — YAGNI, kein zweiter konkreter Bedarf für einen vollständigen
JSON-Schema-Interpreter. Die Schema-Dateien selbst bleiben trotzdem
standardkonformes JSON Schema (Draft 2020-12), damit ein künftiger
Checkpoint-Store-Vertrag sie ohne Neuschreiben an `ajv` übergeben kann,
falls dort ein generischer Validator gebraucht wird.

## 5. Ablageort

`schemas/` (neu, Top-Level, analog `scripts/`), nicht unter `docs/`.
Begründung: Schemas sind Prüfgrundlage für Gate-Code, keine Prosa-Doku —
`docs/` ist laut Memory-Map-Konvention für geführte/erklärende Dokumente,
nicht für maschinell geprüfte Artefakte. Reversibel per `git mv`.

## 6. Budget & Pässe

- Ein Baudurchgang plus höchstens eine Korrekturrunde (Zuschnitt-
  Heuristik aus `CLAUDE.md`).
- Advisor-Pass fällig (neues blockierendes Gate `check-datenformate.mjs`,
  neuer Top-Level-Ordner `schemas/`, `ARCHITECTURE.md`-Änderung) —
  Subagent `architecture-advisor`, frischer Kontext, `Read/Grep/Glob`.
- Danach `code-reviewer` und `qa`, read-only.
- Rework-Regel: Gate 1 rot → eine Korrekturrunde → Gate 2. Zweites Rot ⇒
  BLOCKIERT ⇒ Mensch.
- `state/gates.md`-Eintrag (SCOPE.6) entsteht erst NACH dem realen
  Bau-/Prüflauf, mit echtem Befehl+Ausgabe-Beleg — nicht vorab im Plan
  behauptet (Konsistenz mit dem übrigen Kalibrierungs-Log).

## 7. Akzeptanzkriterien

- **A1** `schemas/profile.schema.json` und
  `schemas/kontrollzustand.schema.json` existieren, sind gültiges JSON
  Schema (Draft 2020-12), parsebar.
- **A2** `schemas/examples/profile.valid.json` erfüllt
  `profile.schema.json`; `schemas/examples/profile.invalid.json`
  verletzt es an mindestens einer benannten Stelle (Pflichtfeld oder Typ).
- **A3** Analog A2 für `kontrollzustand.schema.json`.
- **A4** `node scripts/check-datenformate.mjs` liefert Exit 0 gegen die
  vier Beispieldateien plus leere `profiles/`/`kontrollzustand/`-Ordner
  (nur `.gitkeep`).
- **A5** Wird `profile.invalid.json` versehentlich als `*.valid.json`
  benannt (oder ein Pflichtfeld aus dem echten `valid`-Beispiel entfernt),
  liefert das Skript Exit 1 mit benannter Regelverletzung — Nachweis,
  dass der Rot-Fall wirklich greift, nicht nur behauptet ist.
- **A6** `npm run check:template` ruft `check-datenformate.mjs` auf und
  ist grün.
- **A7** `npm run check` ist grün (inkl. Doku-Gate — keine toten Verweise
  durch die neuen Dateien; `schemas/` taucht nicht in einer
  `.gitignore`-Kollision auf).
- **A8** `state/gates.md` enthält die neue Zeile mit echtem Rot-/
  Grün-Fall-Beleg (Befehl + Wortlaut-Ausgabe, kein Platzhalter).
- **A9** `state/memory-map.md` enthält die Zeile für den Schema-Ablageort
  mit „nicht hierhin"-Spalte.
- **A10** `docs/STATUS.md` nennt die Datenformate unter „Erledigt".
- **A11** `state/findings.md` markiert `F-010` nicht mehr als `offen`.
- **A12** `ARCHITECTURE.md` Abschnitt 1 nennt `schemas/`.
- **A13** (Hauptkriterium) `kontrollzustand/` und `profiles/` existieren
  im Repo (nicht nur in `ARCHITECTURE.md` behauptet), ihr erwartetes
  Format ist maschinell geprüft, nicht nur in Prosa beschrieben.

A1–A12 sind Mechanik, A13 ist das eigentliche Kriterium.

## 8. Rollen für diesen Workstream

| Position | Träger | Rechte |
|---|---|---|
| Advisor | Subagent `architecture-advisor`, frisch | `Read, Grep, Glob` |
| Executor | Claude-Code-Sitzung, frisch, kennt nur Repo + Vertragsvolltext | voll im freigegebenen Pfad |
| Reviewer | Subagenten `code-reviewer`, `qa`, frisch | read-only |
| Mensch (Stefan) | — | Freigaben, Release, echte Abzweigungen, Klärung der offenen Punkte unten |

## 9. Nächste Schritte nach diesem Plan (nicht Teil dieses Auftrags)

1. Klärung der Offenen Punkte 1–3 unten (mindestens Punkt 1, Feature-ID).
2. Advisor-Pass auf diese Datei.
3. Findings → `state/advisor-findings-feature0-datenformate.md`.
4. `plan-v2-feature0-datenformate.md` als neue Datei — `plan-v1` bleibt
   unverändert stehen.
5. Handoff-Vertrag → `state/tasks/feature0-datenformate.md`, SCHRITT 0
   wörtlich, 7 Pflichtsektionen.

## 10. Offene Punkte — NICHT stillschweigend entschieden

1. **Feature-ID/Feature-Akte fehlt.** `features/AF-F001/` ist die einzige
   existierende Akte; für „Feature 0 — Datenformate" gibt es weder eine
   ID-Konvention (AF-F001 folgt offenbar einem Harness-/Prozess-Schema,
   nicht erkennbar, ob Produktfeatures eine andere Zählung bekommen,
   z. B. `F000`) noch eine `feature.md`. `77_CHALLENGE` Abschnitt 4
   („Ergänzung der Feature-Akte") geht von einer bereits existierenden
   Akte aus, die im Repo nicht vorliegt. Ob das Anlegen dieser Akte Teil
   des Handoff-Vertrags zu diesem Plan wird oder ein separater,
   vorgelagerter Schritt ist, entscheidet der Mensch oder der
   Advisor-Pass — hier nicht selbst festgelegt.
2. **Feature-Akte v0 nicht im Volltext geprüft.** Diese Planungsrolle hat
   nur die Feature-Umfang-Beschreibung aus dem Auftrag selbst und
   `77_CHALLENGE`s Verweise auf einzelne AC-Nummern gesehen, nicht
   Stefans Original mit AC 1–9. Der Akzeptanzkriterien-Abschnitt oben
   (A1–A13) ist aus dem Auftrag und den Empfehlungen abgeleitet, nicht
   Wort für Wort aus v0 übernommen — sollte im Advisor-Pass gegen das
   Original gegengelesen werden, falls Stefan es beilegt.
3. **`F-010`-Abschlusskonvention ungeklärt.** `state/findings.md` zeigt
   kein Beispiel für einen bereits erledigten Findings-Eintrag in dieser
   Sitzung — unklar, ob „erledigt" ein Statuswort im selben Format
   (`· offen` → `· erledigt`) ist oder ein separater Abschnitt
   „Erledigte Findings" existiert/entstehen soll. SCOPE.8 verlangt nur
   „nicht mehr als offen markiert", die genaue Notation ist dem
   Advisor-Pass überlassen.
