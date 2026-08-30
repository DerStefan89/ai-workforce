# Plan v1 — Feature F3: Authorization Boundary (minimal)

Slug: f3-authorization-boundary
Stand: 2026-08-30
Rolle: Planner (Claude-Code-Sitzung, Repo-Zugriff)
Grundlage: `features/F3/feature.md` (Ziel/Scope/Nicht-Ziele/AC1-8, aus
dem Auftrag dieser Sitzung abgeleitet).

## 0. Verifikation (F-013-Muster — nicht annehmen, prüfen)

- **`docs/projekt/zielfassung.md` §16.2/§16.3, Zeilen 50/215/318 real
  gelesen, nicht aus dem Auftragstext übernommen:**
  - §16.2, Modul-Tabelle: „**Authorization Boundary** | eigener Eingang
    für menschliche Entscheidungen; hält beide Schlüsselarten
    auseinander | keine Deutung von Modelltext als Freigabe; erzeugt nie
    die Git-Freigabe-Datei". Eigene Tabellenzeile, gleiche Ebene wie
    Checkpoint Store und Artifact Registry/Lineage — kein Unterpunkt
    eines anderen Moduls. Das ist die Weiche gegenüber F1B (siehe
    Abschnitt 4, D1 unten): F1B durfte in ein bestehendes Modul
    hineinbauen, weil die Doku es dort verortet; F3 muss das nicht, weil
    die Doku hier das Gegenteil sagt.
  - §16.3, zweiter Punkt (wörtlich): „Bezeugungen menschlicher Freigaben
    außerhalb des Produkt-Repositoriums, in einem eigenen
    Git-Repository des Kerns. Der Checkpoint trägt Referenz und Hash;
    der Controller validiert gegen den geschützten Ort, nie gegen die
    Referenz allein *(E-189, D16)*."
  - Zeile 50 (P2, E-177/E-189): „Autorisierungsartefakte entstehen
    ausschließlich aus direkter menschlicher Eingabe, und ihre Bezeugung
    muss gegen Erzeugung und Veränderung durch das Ausführungswerkzeug
    geschützt sein."
  - Zeile 215 (E-189 vollständig): „Der Execution Controller akzeptiert
    eine Autorisierung nur, wenn ihre Bezeugung nachweislich gegen
    Erzeugung und Veränderung durch das Ausführungswerkzeug geschützt
    ist. Eine im Produkt-Repository sichtbare Kopie oder Referenz ist
    niemals alleinige Autoritätsquelle."
  - Zeile 318 (D16): „Autorisierungsartefakte liegen außerhalb der
    Schreibreichweite des Ausführungswerkzeugs."
- **`ARCHITECTURE.md` §3 „Auth" (Zeilen 45–54) real gelesen — identischer
  Wortlaut wie §16.3/D16/E-189, hier aber verbindliche Code-Konvention,
  nicht nur Zielbild:** „Der Checkpoint trägt Referenz und Hash; validiert
  wird immer gegen den geschützten Ort, nie gegen die Referenz allein.
  […] Der Kern erzeugt niemals ein Freigabeartefakt." `ARCHITECTURE.md:58`
  (Klassifikationsreihenfolge der drei Terminalzustände) und §4
  (Fehlerbehandlung, Zeile 61: fünf Pflichtbestandteile eines blockierten
  Zustands) gelten unverändert fort — F3 führt keinen vierten
  Terminalzustand ein (AC6).
- **`src/checkpoint-store/types.ts` real geprüft, nicht angenommen:**
  `WirkungsmarkePayload.ergebnis` kennt bereits `'ERFOLGREICH' |
  'VERWEIGERT' | 'FEHLGESCHLAGEN'`, `schreibeWirkungsmarke` (F1B,
  `src/checkpoint-store/index.ts`) schreibt ein Terminalartefakt mit
  `art: "terminal"` in die bestehende Hash-Kette einer `lauf_id`. F3
  braucht **keine** Erweiterung dieser Typen oder Funktionen — es ruft
  `schreibeWirkungsmarke(laufId, ..., "terminal", { ergebnis:
  "VERWEIGERT", daten: {...} })` von außen auf, exakt das Muster, das F2
  gegenüber F1 bereits etabliert hat (externer Aufrufer, kein Eingriff in
  fremden Modulcode). Anders als F1B (das F1 anfassen musste, weil
  `typ: "wirkungsmarke"` neu war) ist für F3 kein F1B-Touch nötig — der
  Terminaltyp `VERWEIGERT` existiert bereits vollständig.
- **Harness-eigenes Präzedenzmuster geprüft, Unterschied benannt:**
  `.claude/hooks/commit-guard.cjs` erzwingt eine `state/
  freigabe-commit.md`, die laut Konvention „nur vom Menschen im eigenen
  Editor angelegt" werden darf (`state/plan-v1-harness-freigabedatei-
  wiederherstellung.md:139`). Prinzip identisch zu F3 (menschenauthentisch
  erzeugtes Artefakt statt Modelltext-Deutung), Ort nicht übertragbar:
  diese Datei liegt **innerhalb** des Repos und schützt nur den
  Commit-Schritt des Harness selbst — kein Schutz gegen ein
  Ausführungswerkzeug, das im selben Repo mit Schreibrechten läuft. D16
  verlangt für F3 ausdrücklich einen Ort außerhalb des Repos.

## 1. Ziel (prüfbar)

Für einen gegebenen Auftrag liegt die Freigabe- oder
Verweigerungsentscheidung als menschenautorisiertes Artefakt in einem
lokalen Git-Repository außerhalb dieses Produkt-Repos; eine Prüffunktion
im Kern liest diesen Ort direkt, vergleicht den echten Inhalt gegen eine
im Kontrollzustand mitgeführte Pfad-/Hash-Referenz, und liefert nur bei
Übereinstimmung eine akzeptierte Entscheidung — bei Verweigerung über
F1Bs bestehenden Terminalartefakt-Typ `VERWEIGERT`.

## 2. SCOPE

1. **Externer Ordner — von Stefan bestätigter Pfad (Aufgabe 2,
   Bestätigung 2026-08-30, vormals Offener Punkt 1):**
   `C:\Users\stefa\ai-workforce-autorisierung\` — Geschwisterordner zu
   `C:\Users\stefa\Projekte\` (nicht darunter), eigenes lokales
   Git-Repository (`git init` durch Stefan, nicht durch das
   Ausführungswerkzeug — D16 wörtlich: der Kern/das Werkzeug erzeugt das
   Repo nicht selbst). Begründung der Lage:
   - Außerhalb `C:\Users\stefa\Projekte\ai-workforce\` — jedes `git
     status`/Working-Tree-Prüfung des Produkt-Repos sieht diesen Ordner
     nie, keine Gefahr eines pauschalen Stagens (§16.3 Zeile 344).
   - Außerhalb von OneDrive (`C:\Users\stefa\OneDrive\`) — vermeidet die
     in `CLAUDE.md` dokumentierte Reparse-Point-Falle bei Binär-/
     Git-Objektdateien.
   - Innerhalb `C:\Users\stefa\` und damit potenziell vom
     Ausführungswerkzeug technisch erreichbar (siehe Abschnitt 3 „Grenze
     dieser Akte" — kein OS-Sandboxing im Scope).
2. **Struktur des externen Repos:**
   `autorisierungen/<lauf_id>.json` — genau eine Datei je `lauf_id`
   (Bestätigung 2026-08-30, vormals Offener Punkt 3: genau eine
   Autorisierung je `lauf_id`, keine Mehrfachautorisierung, analog F1Bs
   AC6 „ein bewusst neu gestarteter Lauf bekommt eine eigene `lauf_id`"
   — ein neuer Autorisierungsbedarf verlangt also eine neue `lauf_id`,
   nie eine zweite Datei unter derselben. Kein `sequenz`-Feld, keine
   Sequenz-Zählung: die Manipulationssicherheit kommt aus dem
   Git-Commit dieses Repos selbst, nicht aus einer zweiten Hash-Kette,
   siehe D2 unten). Inhalt je Datei:
   ```
   {
     "lauf_id": "...",
     "entscheidung": "FREIGEGEBEN" | "VERWEIGERT",
     "zeitstempel": "...",
     "begruendung": "..."   // Pflicht bei VERWEIGERT, optional sonst
   }
   ```
   Schema `schemas/kontrollzustand-autorisierung-payload.schema.json` im
   Produkt-Repo (die Schema-**Definition** ist kein Geheimnis, nur der
   **Inhalt** einer konkreten Entscheidung muss extern bleiben — analog
   zu F1Bs Payload-Schemas, die auch nur Struktur, nie Daten
   beschreiben).
3. **Referenzformat im Kontrollzustand (Aufgabe 2):** kein neuer
   Kontrollzustand-Eintragstyp. Ein Aufrufer, der eine Autorisierung
   prüfen lässt, erhält von `pruefeAutorisierung` (SCOPE.4) ein Ergebnis
   und trägt bei Bedarf selbst eine Referenz in `daten` eines
   bestehenden Checkpoints/einer Wirkungsmarke ein:
   ```
   {
     "autorisierung": {
       "pfad": "C:\\Users\\stefa\\ai-workforce-autorisierung\\autorisierungen\\<lauf_id>.json",
       "commit_hash": "<vollständiger Git-Commit-Hash des externen Repos>",
       "datei_hash": "<sha256 des Dateiinhalts, gleiche kanonischeJson-Regel wie F0/F1>"
     }
   }
   ```
   `commit_hash` **und** `datei_hash` (nicht nur einer von beiden) —
   der Commit-Hash bindet die Datei an einen bestimmten, im externen
   Repo tatsächlich vorhandenen Verlaufspunkt (verhindert eine Datei, die
   nie committet wurde, siehe A5), der Datei-Hash bindet den exakten
   Inhalt (verhindert eine spätere, andere Datei unter demselben Pfad).
   Deckt AC2 wörtlich: „Pfad + Hash, nie der Entscheidungsinhalt selbst
   als Kopie".
4. **`src/authorization-boundary/index.ts` — neues, eigenständiges
   Modul (kein Checkpoint-Store-Touch, siehe D1):**
   - `pruefeAutorisierung(referenz, optionen?)` — liest die Datei am
     referenzierten `pfad` direkt vom Dateisystem, verifiziert per `git
     show <commit_hash>:<repo-relativer-pfad>` (Kindprozess `git`, im
     externen Repo als `cwd`) zusätzlich, dass genau dieser Inhalt im
     benannten Commit tatsächlich enthalten ist (nicht nur im
     aktuellen Arbeitsbaum — sonst könnte eine unfertige, nicht
     committete Änderung durchgehen), berechnet den Hash beider
     gelesenen Inhalte, vergleicht gegen `referenz.datei_hash`, validiert
     die Payload gegen das Schema aus SCOPE.2. Rückgabe: `{ ok: true,
     entscheidung: "FREIGEGEBEN" | "VERWEIGERT", eintrag }` oder `{ ok:
     false, grund: "..." }` — nie ein Wurf für einen fachlich erwarteten
     Rot-Fall (Muster wie F1Bs `stelleLaufstatusFest`, D10).
   - Erwartete Rot-Fälle, alle `{ ok: false }`, nie `{ ok: true,
     entscheidung: "FREIGEGEBEN" }`: Datei fehlt, Datei existiert aber
     Hash weicht ab, `git show` liefert einen anderen Inhalt als die
     Datei im Arbeitsbaum (Divergenz-Fall), externes Repo/Pfad fehlt
     komplett, Schema-Verstoß. Deckt AC4/AC5.
   - `verweigereAutorisierung(laufId, referenz, begruendung, optionen?)`
     — dünner Aufrufer von F1Bs `schreibeWirkungsmarke(laufId, ...,
     "terminal", { ergebnis: "VERWEIGERT", daten: { autorisierung:
     referenz, begruendung } })`. Kein neuer Terminalzustand (AC6),
     keine Kopie von F1B-Logik.
5. **Strukturierte Laufausgabe** — neue Ereignisnamen
   `autorisierung_geprueft`, `autorisierung_abgelehnt` (gleiches
   Ereignisformat wie F1/F1B). Kein Eingriff in F1Bs `Ereignisname`-Union
   in `src/checkpoint-store/types.ts` — F3 definiert seine eigene
   Ereignis-Union in `src/authorization-boundary/types.ts` (Modultrennung
   wie zwischen F1/F1B und F2).
6. **`scripts/check-f3-authorization-boundary.mjs`** — neues Gate-Skript,
   Muster wie `check-f1b-wirkungsmarke.mjs`: legt vor dem Lauf ein
   Wegwerf-Git-Repo unter einem Temp-Pfad an (`git init`, ein Commit mit
   einer gültigen Autorisierungsdatei), prüft `pruefeAutorisierung`
   dagegen (Grün-Fall), danach einen manipulierten Fall (Datei nach dem
   Commit im Arbeitsbaum verändert, ohne neuen Commit — Divergenz-Fall,
   Rot erwartet) und einen Fehlt-Fall (Pfad existiert nicht, Rot
   erwartet). Räumt den Temp-Pfad danach auf. Eingehängt in `npm run
   check` und `npm run check:template`.
7. **`src/authorization-boundary/authorization-boundary.test.ts`** —
   `node:test`-Fälle für AC7 (vier Fälle: echte Freigabe, echte
   Verweigerung inkl. F1B-Terminalartefakt-Beleg, manipulierte Referenz,
   fehlender geschützter Ort), gleiches Wegwerf-Git-Repo-Fixture-Muster
   wie SCOPE.6, aber feingranularer (einzelne Assertions statt
   Gate-Exit-Code).
8. **Zeile in `state/gates.md`** — neue Tabellenzeile
   `check-f3-authorization-boundary.mjs`.
9. **Zeile in `state/memory-map.md`** — „Authorization-Boundary-Modul" →
   `src/authorization-boundary/`, `schemas/kontrollzustand-
   autorisierung-payload.schema.json`, „nicht hierhin": nicht in
   `src/checkpoint-store/` (eigenes Modul laut §16.2, siehe D1), keine
   Entscheidungsinhalte im Produkt-Repo (nur Schema, nie Daten).
10. **`docs/STATUS.md`** — Eintrag unter „Erledigt" nach Bau.
11. **`features/F3/journal.md`** — Anhängeprotokoll, fortgeschrieben je
    Phase.

## 3. NICHT (Non-Scope, mit Grund)

- **Invocation Policy / Protection Validator** (Deliverable 2, Feature
  #4) — Hash-Baseline der Schutzskripte (E-183/E-188), ausdrücklicher
  Nicht-Ziel-Rand des Auftrags.
- **Jeder Prozessstart, Claude-Code-Gateway** — Deliverable 3, baut erst
  auf F3 + Invocation Policy auf.
- **UI** — keine Leitstand-Anzeige einer Autorisierungsentscheidung.
- **OS-seitige Durchsetzung der Schreibsperre.** D16 sagt „außerhalb der
  Schreibreichweite des Ausführungswerkzeugs" — für dieses
  Ausführungswerkzeug (Claude Code, mit Datei-/Bash-Zugriff im Rahmen
  der erteilten Berechtigungen) ist „Schreibreichweite" ohne
  OS-Mechanismus (eigener Betriebssystembenutzer, Dateisystem-ACL) keine
  technisch unüberwindbare Grenze, sondern eine **Pfad-/Prozessgrenze**:
  der externe Ordner liegt außerhalb des Produkt-Repos (kein
  routinemäßiger Schreibzugriff im normalen Baupfad) und die Prüfung
  erkennt eine Manipulation, wenn sie trotzdem stattfindet (Hash-/
  Commit-Vergleich, AC4). Eine echte OS-Sperre wäre entweder ein
  eigener Prozessstart (Invocation Policy, Feature #4) oder eine
  Betriebssystem-/Rechteverwaltungsmaßnahme, die `docs/projekt/
  zielfassung.md` unter „Bewusste Nicht-Anforderungen" (Zeile 320:
  „Rechteverwaltung") ausdrücklich ausschließt. Diese Grenze ist real
  und wird nicht stillschweigend verschwiegen — von Stefan bestätigt
  (2026-08-30, vormals Offener Punkt 2): Pfad-/Prozessgrenze plus
  Manipulationserkennung reicht für diesen Zuschnitt, keine OS-Sperre
  nötig.
- **Ein neuer, vierter Terminalzustand.** `VERWEIGERT` aus F1B wird
  wiederverwendet, ausdrücklicher Auftrag (AC6, `feature.md` Scope).
- **Eine zweite Hash-Kette für das externe Repo.** Die
  Manipulationssicherheit kommt aus Git selbst (Commit-Hash bindet
  Inhalt an Verlaufspunkt) — eine zusätzliche `vorgaenger_hash`-Kette
  wie in F1/F1B wäre eine unbegründete Doppelung (D2 unten).
- **Automatisches `git init` des externen Ordners durch das
  Ausführungswerkzeug.** D16 verlangt, dass die Bezeugung außerhalb der
  Schreibreichweite des Werkzeugs entsteht — das Repo muss folgerichtig
  auch von Stefan angelegt werden, nicht vom Baulauf dieser Akte (Pfad
  bestätigt, siehe Abschnitt 6 Budget).

## 4. Design-Entscheidungen

- **D1 (eigenes Modul `src/authorization-boundary/`, kein
  Checkpoint-Store-Touch):** Anders als F1B, wo `zielfassung.md` §16.2
  „Wirkungsmarke" ausdrücklich dem Checkpoint Store zuordnet, führt
  §16.2 „Authorization Boundary" als **eigene** Tabellenzeile, gleiche
  Ebene wie Checkpoint Store und Artifact Registry/Lineage. Ein Bau
  innerhalb von `src/checkpoint-store/` würde diese Modulgrenze ohne
  Beleg einebnen. F3 folgt stattdessen F2s Präzedenzmuster (eigener,
  von außen aufrufender Ordner, keine fremden Exporte verändert) — nicht
  F1Bs Muster (Erweiterung eines bestehenden Moduls). Konsequenz: kein
  F1-/F1B-Touch nötig (Abschnitt 0 oben), geringeres Regressionsrisiko
  als F1B.
- **D2 (Manipulationssicherheit über Git-Commit-Hash, keine eigene
  Hash-Kette):** F1/F1B sichern eine **fortlaufende** Kette (jeder
  Eintrag verweist auf seinen Vorgänger), weil sie eine Reihe von
  Zustandsübergängen bezeugen. F3 bezeugt dagegen **einzelne,
  unabhängige** Entscheidungen — es gibt keinen fachlichen Vorgänger,
  den eine Autorisierungsdatei kennen müsste. Die Garantie „dieser
  Inhalt wurde nicht nachträglich verändert" liefert hier der
  Git-Commit selbst (`commit_hash` + `datei_hash`, SCOPE.3) günstiger
  und ohne Redundanz zu einer zweiten, parallelen Kettenmechanik.
- **D3 (`git show <hash>:<pfad>` statt reinem Arbeitsbaum-Lesen):** Ein
  reines Lesen der Datei im Arbeitsbaum des externen Repos würde eine
  nicht committete, nachträgliche Änderung nicht erkennen — genau die
  Lücke, die E-189 („Erzeugung und Veränderung durch das
  Ausführungswerkzeug") ausschließen will, falls das Werkzeug technisch
  doch Schreibzugriff auf den externen Pfad hätte (siehe NICHT-Abschnitt
  „OS-seitige Durchsetzung"). Der Git-Objekt-Lesezugriff ist die einzige
  Stelle in diesem Plan, die diese Lücke schließt, ohne einen OS-Mechanismus
  vorauszusetzen.
- **D4 (kein Wurf bei erwarteten Rot-Fällen, `{ ok: false, grund }`):**
  Gleiches Muster wie F1Bs `stelleLaufstatusFest` (D10) — ein fehlendes
  oder manipuliertes Autorisierungsartefakt ist ein regulärer,
  benannter Ausgang, kein Programmfehler. Ein Wurf würde den Aufrufer
  zwingen, Kontrollfluss über Exceptions zu bauen, obwohl „keine
  Freigabe gefunden" der erwartete Normalfall vieler Aufrufe ist.

## 5. Ablageort

- `src/authorization-boundary/{index,types}.ts`,
  `authorization-boundary.test.ts` — neuer, eigenständiger Modulordner
  (D1).
- `schemas/kontrollzustand-autorisierung-payload.schema.json` +
  `schemas/examples/kontrollzustand-autorisierung*.json` — neben den
  bestehenden F0/F1/F1B/F2-Schemas.
- `scripts/check-f3-authorization-boundary.mjs` — neben den bestehenden
  Gate-Skripten.
- `C:\Users\stefa\ai-workforce-autorisierung\` — außerhalb dieses
  Produkt-Repos, eigenes Git-Repository (Vorschlag, Offener Punkt 1).

## 6. Budget & Pässe

- Zuschnitt-Bewertung (CLAUDE.md-Heuristik): ein Baudurchgang plus
  höchstens eine Korrekturrunde, eigenständig prüfbares Artefakt (Gate +
  `npm run check` grün). Kein F1-/F1B-Touch nötig (D1) — kleineres
  Regressionsrisiko als F1B, aber eine neue, sicherheitsrelevante
  Vertrauensgrenze (D16/E-189) — deshalb trotzdem Advisor-Pass fällig,
  mit Fokus auf D2/D3 (reicht Git-Commit-Hash allein als
  Manipulationssicherheit für eine einzelne, unveränderliche Datei je
  `lauf_id`?) und auf D3s Divergenz-Erkennung (`git show` gegen
  Arbeitsbaum-Lesen).
- Vor jedem Bau: Stefan legt `C:\Users\stefa\ai-workforce-
  autorisierung\` real an (`git init`), unabhängig vom
  Ausführungswerkzeug (D16, NICHT-Abschnitt). Der Handoff-Vertrag prüft
  dessen Existenz als Startbedingung, erzeugt ihn nicht selbst.
- Advisor-Pass — Subagent `architecture-advisor`, frischer Kontext,
  `Read/Grep/Glob`, danach `code-reviewer` und `qa`, read-only.
- Rework-Regel: Gate 1 rot → eine Korrekturrunde → Gate 2. Zweites Rot ⇒
  BLOCKIERT ⇒ Mensch.
- `state/gates.md`-Eintrag (SCOPE.8) entsteht erst NACH dem realen
  Bau-/Prüflauf, mit echtem Befehl+Ausgabe-Beleg.

## 7. Akzeptanzkriterien (technisch)

- **A1** `schemas/kontrollzustand-autorisierung-payload.schema.json`
  existiert, ist gültiges JSON Schema (Draft 2020-12), parsebar.
- **A2** `pruefeAutorisierung` gegen eine echte, committete,
  unveränderte Autorisierungsdatei mit `entscheidung: "FREIGEGEBEN"`
  liefert `{ ok: true, entscheidung: "FREIGEGEBEN", eintrag }` (deckt
  AC1/AC3).
- **A3** `pruefeAutorisierung` gegen eine echte, committete
  `entscheidung: "VERWEIGERT"`-Datei liefert `{ ok: true, entscheidung:
  "VERWEIGERT", eintrag }`.
- **A4** `verweigereAutorisierung` ruft nach A3 `schreibeWirkungsmarke`
  mit `art: "terminal"`, `ergebnis: "VERWEIGERT"` auf — Beleg über einen
  nachfolgenden `stelleLaufstatusFest`-Aufruf (F1B), der
  `ABGESCHLOSSEN`/`VERWEIGERT` liefert (deckt AC6, keine Behauptung ohne
  echten Aufruf der F1B-Funktion).
- **A5** `pruefeAutorisierung` gegen eine Datei, die im Arbeitsbaum nach
  dem referenzierten Commit verändert wurde (Divergenz-Fall, D3) liefert
  `{ ok: false, grund }`, nie `{ ok: true }` (deckt AC4, zentraler
  Rot-/Grün-Beleg dieses Features).
- **A6** `pruefeAutorisierung` gegen einen fehlenden `pfad` oder ein
  fehlendes externes Repo liefert `{ ok: false, grund }`, kein Wurf, kein
  angenommener Erfolg (deckt AC5).
- **A7** `pruefeAutorisierung` gegen eine Datei mit falschem
  `datei_hash` in der Referenz (Hash-Mismatch ohne Divergenz-Ursache)
  liefert `{ ok: false, grund }`.
- **A8** `pruefeAutorisierung` gegen eine schemawidrige Datei (z. B.
  `entscheidung` außerhalb der zwei erlaubten Werte, fehlende
  `begruendung` bei `VERWEIGERT`) liefert `{ ok: false, grund }`.
- **A9** Test „echte Freigabe" (AC7, Fall 1) = A2 als benannter
  Testfall.
- **A10** Test „echte Verweigerung" (AC7, Fall 2) = A3+A4 als benannter
  Testfall.
- **A11** Test „manipulierte Referenz" (AC7, Fall 3) = A5 als benannter
  Testfall.
- **A12** Test „fehlender geschützter Ort" (AC7, Fall 4) = A6 als
  benannter Testfall.
- **A13** `node scripts/check-f3-authorization-boundary.mjs` → Exit 0.
- **A14** `npm run check` und `npm run check:template` sind grün.
- **A15** `state/gates.md` enthält die neue Zeile mit echtem
  Rot-/Grün-Beleg.
- **A16** `state/memory-map.md` enthält die neue Zeile mit
  „nicht hierhin"-Spalte.
- **A17** `docs/STATUS.md` nennt F3 unter „Erledigt".
- **A18** (Hauptkriterium) Für eine reale, manipulierte oder fehlende
  externe Referenz liefert `pruefeAutorisierung` real `{ ok: false }`,
  und kein Codepfad in diesem Feature leitet daraus eine akzeptierte
  Freigabe ab — nicht in Prosa behauptet, über A5/A6/A7 nachgewiesen
  (analog F1Bs A19-Muster).

A1–A17 sind Mechanik, A18 ist das eigentliche Kriterium.

## 8. Rollen für diesen Workstream

| Position | Träger | Rechte |
|---|---|---|
| Advisor | Subagent `architecture-advisor`, frisch | `Read, Grep, Glob` |
| Executor | Claude-Code-Sitzung, frisch, kennt nur Repo + Vertragsvolltext | voll im freigegebenen Pfad |
| Reviewer | Subagenten `code-reviewer`, `qa`, frisch | read-only |
| Mensch (Stefan) | — | Freigaben, Anlegen des externen Git-Ordners, Release, echte Abzweigungen, Klärung der offenen Punkte unten |

## 9. Nächste Schritte nach diesem Plan (nicht Teil dieses Auftrags)

1. Klärung der Offenen Punkte 1–3 unten.
2. Advisor-Pass auf diese Datei.
3. Findings → `state/advisor-findings-f3-authorization-boundary.md`.
4. Falls nötig: `plan-v2-f3-authorization-boundary.md` als neue Datei —
   dieser plan-v1 bleibt unverändert stehen.
5. Handoff-Vertrag → `state/tasks/f3-authorization-boundary.md`, SCHRITT
   0 wörtlich, sieben Pflichtsektionen.

## 10. Ehemals offene Punkte — von Stefan entschieden (2026-08-30)

1. **Konkreter externer Pfad** — `C:\Users\stefa\ai-workforce-
   autorisierung\` bestätigt (SCOPE.1). Projekteigen (nicht
   projektübergreifend geteilt) bleibt die Annahme dieser Akte, mangels
   gegenteiliger Angabe unverändert übernommen.
2. **Grenze „Pfad-/Prozessgrenze statt OS-Sperre"** (Abschnitt 3, NICHT)
   bestätigt: reicht für diesen Zuschnitt, keine OS-Sperre nötig. Der
   Advisor-Pass prüft diese Auslegung dennoch fachlich gegen E-189 (siehe
   Abschnitt 6 Budget) — die Bestätigung entscheidet die Scope-Frage,
   nicht die technische Tragfähigkeit von D3s Divergenz-Erkennung.
3. **Mehrfachautorisierung je `lauf_id`** — ausgeschlossen: genau eine
   Autorisierung je `lauf_id`, analog F1Bs AC6 (eigene `lauf_id` je neu
   gestartetem Lauf). SCOPE.2 entsprechend vereinfacht: keine `sequenz`,
   eine Datei je `lauf_id` (`autorisierungen/<lauf_id>.json`).

Diese drei Punkte sind entschieden und nicht mehr Gegenstand des
Advisor-Passes; der Advisor prüft die sich daraus ergebende technische
Umsetzung (D1–D4), nicht die Entscheidungen selbst erneut.
