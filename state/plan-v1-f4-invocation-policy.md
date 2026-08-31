# Plan v1 — Feature F4: Invocation Policy / Protection Validator (minimal)

Slug: f4-invocation-policy
Stand: 2026-08-31
Rolle: Planner (Claude-Code-Sitzung, Repo-Zugriff)
Grundlage: `features/F4/feature.md` (Ziel/Scope/Nicht-Ziele/AC1-11, aus
dem Auftrag dieser Sitzung abgeleitet).

## 0. Verifikation (F-013-Muster — nicht annehmen, prüfen)

- **`docs/projekt/zielfassung.md` §16.2/§16.4, §9.4 E-182–E-188 real
  gelesen, nicht aus dem Auftragstext übernommen:**
  - §16.2, Modul-Tabelle: „**Invocation Policy / Protection Validator** |
    Startfreigabe: Berechtigungskontext materialisieren, beide
    Startbedingungen erzwingen | keine Schutzschicht abschalten, kein
    Modellwechsel". Eigene Tabellenzeile, gleiche Ebene wie Authorization
    Boundary, Checkpoint Store, Claude-Code-Gateway — kein Unterpunkt
    eines anderen Moduls.
  - §16.4 (wörtlich): „Zwei getrennte Bedingungen, beide lokal, beide
    ohne Werkzeugaufruf: 1. Konfiguration gültig **und** jedes
    referenzierte Schutzskript existiert mit erwartetem Hash (E-183).
    2. Gültiger Wirksamkeitsnachweis für den Gültigkeitsschlüssel
    (E-188). Scheitert eine, startet kein Lauf. Erst danach
    `RUN_PREPARED`-Wirkungsmarke, dann Werkzeugstart." Die
    `RUN_PREPARED`-Wirkungsmarke und der Werkzeugstart selbst liegen bei
    F6 (Nicht-Ziel dieser Akte) — F4 liefert nur das Starturteil, das F6
    davor abfragt.
  - E-183 (präzisiert, Zeile 203): lokale Prüfung, Konfiguration gültig
    und jedes referenzierte Schutzskript mit erwartetem Hash — deckt
    SCOPE.2/AC3.
  - E-188 (präzisiert, Zeile 213): „Die Wirksamkeit der Schutzschichten
    wird gegen einen bekannten Rot-Fall nachgewiesen, nicht aus ihrer
    Existenz gefolgert. Der Nachweis gilt für einen Gültigkeitsschlüssel
    aus mindestens: Hash der Werkzeugkonfiguration, Hashes der
    referenzierten Schutzskripte, Version des Ausführungswerkzeugs,
    Berechtigungskontext des Aufrufs, Pfad des Arbeitsverzeichnisses.
    Ändert sich ein Bestandteil, wird erneut geprüft." — deckt
    SCOPE.3/AC4, exakte Feldliste des Gültigkeitsschlüssels.
  - E-182 (Zeile 201): Verbotsliste `--bare`, `--safe-mode`,
    `--dangerously-skip-permissions`,
    `--allow-dangerously-skip-permissions`, `--permission-mode
    bypassPermissions`, `--fallback-model` — deckt SCOPE.4/AC6.
  - §16.8 Punkt 3 (Zeile 374): „Der konkrete bekannte Rot-Fall der
    Wirksamkeitsprüfung. (Weiterhin offen — an die Kalibrierungen aus
    Vertrag 1 und Vertrag 2 gebunden.)" — bestätigt, dass F4 den
    Wirksamkeitsnachweis nur **prüft**, nicht erzeugt (Auftrag Punkt 3).
  - §16.8 Punkt 4 (Zeile 375): E-187 „weiterhin offen — an Vertrag 2,
    Messfall 3 gebunden" — deckt die Nicht-Ziel-Regel zu `--tools`.
  - §16.8 Punkt 8 (Zeile 379): Repräsentation des Gültigkeitsschlüssels
    und Normalisierung des Arbeitsverzeichnispfads „weiterhin offen".
    Wichtig für Abschnitt 4 unten (Design-Entscheidung 3): F4 darf diese offene Frage nicht
    stillschweigend durch eine eigene, endgültige Festlegung schließen.
- **`state/tp-nachtrag.md` real geprüft:**
  - „Schritt 1, Werkzeugversionen" (Zeilen 7–14): CLI `claude --version`
    meldet `2.1.241`, VSCode-Extension-Session-Metadatum `2.1.250` —
    Diskrepanz im Wortlaut festgehalten, „keine Auswahl zwischen ihnen
    getroffen … Ursache nicht untersucht". Auftrag Punkt 4 verlangt,
    diese Diskrepanz nicht stillschweigend aufzulösen — deshalb geht die
    Werkzeugversion als **deklarierter** Wert (vom Aufrufer/Profil
    gesetzt) in den Gültigkeitsschlüssel ein, nie als zur Laufzeit aus
    `claude --version` gemessener Wert, der die Diskrepanz verdecken
    würde.
  - „Gültigkeitsschlüssel, Ausgangsstand" (Zeilen 182–225): fünf
    Schutzskript-Hashes plus `.claude/settings.json`-Hash, gemessen unter
    Vertrag `tp-03d-wirkungsgrenze-und-hash-baseline` — das ist
    **Messhistorie** dieses Vertrags, nicht die Baseline-Instanz für F4
    (Auftrag Punkt 1, ausdrücklich). Diese Akte verweist auf die Datei
    als Beleg für das Muster „fünf Hook-Skripte + settings.json", kopiert
    aber keinen der dort genannten Hash-Werte in Schema, Beispiele oder
    Code (Auftrag NICHT-Abschnitt: „Keine Hash-Werte im Code oder im Plan
    hartkodieren").
  - „TP-03 d, Messfall 3" (Zeilen 74–93): kein MCP-Server auf der
    Zielmaschine konfiguriert, E-187 „bleibt … weiterhin unbelegt" —
    deckt Auftrag Punkt 8 (`--tools`/`--disallowedTools` nur
    `DEKLARIERT`, nie `ERZWUNGEN`).
- **`ARCHITECTURE.md` §3 „Auth" Punkt 2 real gelesen** — identischer
  Wortlaut wie §16.2/§16.4, hier verbindliche Code-Konvention: „vor jeder
  Execution mit Schreibwirkung, lokal und ohne Werkzeugaufruf: ist die
  Werkzeugkonfiguration gültig und existiert jedes von ihr referenzierte
  Schutzskript mit dem erwarteten Hash, und liegt ein gültiger
  Wirksamkeitsnachweis für den Gültigkeitsschlüssel vor. Scheitert eine
  der beiden Prüfungen, startet keine Execution."
- **`src/authorization-boundary/index.ts` real geprüft, nicht
  angenommen:** `leseAusCommit(repoWurzel, commitHash, relativerPfad)`
  liest per `execFileSync('git', ['show', ...])` einen Pfad aus einem
  konkreten Commit eines externen Git-Repos, liefert `string | null`,
  wirft nie nach außen. `gitattributesPinntZeilenenden(inhalt)` erkennt
  `* -text` in `.gitattributes`. Beide Funktionen sind exportierbar genug
  (Modulinterne Nutzung in `index.ts`, aber `export` fehlt aktuell bei
  `leseAusCommit`/`gitattributesPinntZeilenenden`/
  `leiteRepoRelativenPfadAb`) — **[offene Unsicherheit 1]**: F4 braucht
  entweder einen `export` auf diesen drei Helferfunktionen in F3 (kleiner,
  additiver Diff an `src/authorization-boundary/index.ts`, kein
  Verhaltens- oder Signaturwechsel) oder muss dasselbe `git
  show`-Leseverhalten selbständig nachbauen. Der Auftrag verbietet einen
  „zweiten Regelsatz" (D5-Muster) — das spricht für die erste Option.
  Diese Akte selbst ändert F3 nicht („von außen aufrufen, nicht anfassen"
  laut Auftrag KONTEXT); die Executor-Rolle entscheidet das bei der
  Umsetzung, mit Bezug auf dieses [offene Unsicherheit 1].
  `validiereAutorisierungEintrag(eintrag): string[]` und
  `pruefeAutorisierung(referenz, optionen): AutorisierungsErgebnis` zeigen
  das Rückgabemuster `{ ok: false, grund }`/`{ ok: true, ... }`, nie ein
  Wurf bei einem fachlich erwarteten Rot-Fall — F4 übernimmt dieses
  Muster für `starturteil`.
- **`schemas/kontrollzustand-autorisierung-payload.schema.json` real
  geprüft:** Draft 2020-12, `additionalProperties: false`,
  `if`/`then` für bedingte Pflichtfelder (`begruendung` bei
  `VERWEIGERT`) — Muster für die zwei neuen F4-Schemas unten.
  `schemas/examples/` folgt durchgängig `<name>.valid.json` /
  `<name>.invalid-<grund>.json` (siehe z. B.
  `kontrollzustand-wirkungsmarke-*`).
- **`scripts/check-f9-human-transport.mjs` real geprüft (AC10-Grep-
  Präzedenz, Zeilen 166–182):** liest `readdirSync(humanTransportDir)`,
  filtert `.ts`-Dateien, prüft jede gegen ein verbotenes Muster
  (`/\b(fetch|XMLHttpRequest|...)\b/i`), meldet den ersten Treffer als
  Befund. F4s AC8-Grep (`child_process`/`spawn`/`exec`/`execSync` in
  `src/invocation-policy/`) übernimmt exakt diese Struktur, anderes
  Muster.
- **`package.json` real geprüft:** `check`/`check:template` sind
  UND-verkettete `node scripts/check-*.mjs`-Aufrufe; F4 hängt sich als
  weiteres `&&`-Glied an, am Ende der bestehenden Kette (analog jedem
  vorherigen Feature).

## 1. Ziel (prüfbar)

Für eine geplante schreibende Execution stellt eine rein lokale, ohne
Werkzeugaufruf auskommende Prüfung fest, ob (a) die Werkzeugkonfiguration
gültig ist und jedes referenzierte Schutzskript mit dem in einer extern
bezeugten Baseline erwarteten Hash übereinstimmt (E-183), und (b) ein
vorliegender Wirksamkeitsnachweis für den aktuellen Gültigkeitsschlüssel
noch gilt (E-188, kein Drift). Erst wenn beide zutreffen, liefert die
Prüfung `{ starturteil: "FREIGEGEBEN", berechtigungskontext }`; sonst
`{ starturteil: "ABGELEHNT", grund }` plus F1Bs Terminalartefakt
`VERWEIGERT`. Zusätzlich liegt die E-182-Verbotsliste als eigenständige,
von F6 aufrufbare Prüffunktion vor. F4 startet nie selbst einen
Werkzeugprozess (AC8, Gate-Grep).

## 2. SCOPE

1. **Baseline-Ablageort (Auftrag Punkt 1, entschieden):** externes
   Autorisierungs-Repo `C:\Users\stefa\ai-workforce-autorisierung\`
   (dasselbe Repo wie F3, eigener Unterordner
   `invocation-policy-baseline/<baseline_id>.json` statt F3s
   `autorisierungen/<lauf_id>.json` — getrennter Unterordner, weil eine
   Baseline nicht an eine `lauf_id` gebunden ist, sondern über mehrere
   Läufe hinweg gilt, bis sie der Mensch ersetzt). Gelesen ausschließlich
   über eine Referenz `{ pfad, commit_hash, datei_hash }` — identisches
   Referenzformat wie F3 SCOPE.3 —, aufgelöst über F3s
   `leseAusCommit`-Pfad (siehe [offene Unsicherheit 1] zum `export`).
   Nie aus dem Arbeitsbaum dieses Produkt-Repos gelesen.
2. **Schema 1 — Baseline (E-183):**
   `schemas/kontrollzustand-invocation-policy-baseline-payload.schema.json`.
   Felder:
   ```
   {
     "werkzeug_konfiguration": {          // Pflicht
       "pfad": "...",                      // Pflicht, z. B. ".claude/settings.json"
       "hash": "<sha256hex, 64 Zeichen>"   // Pflicht
     },
     "schutzskripte": [                    // Pflicht, mind. 1 Eintrag
       { "pfad": "...", "hash": "<sha256hex, 64 Zeichen>" }
     ],
     "erzeugt_am": "..."                   // optional, ISO-Zeitstempel, reine Dokumentation
   }
   ```
   `additionalProperties: false` auf Wurzel- und Array-Element-Ebene,
   `pattern: "^[0-9a-f]{64}$"` auf jedem `hash`-Feld (case-insensitive
   über `pattern` + `i`-Flag laut Draft-2020-12-Konvention: Ajv wertet
   `pattern` case-sensitiv aus, deshalb wird der Baseline-Hash beim
   Vergleich in der Prüffunktion auf Kleinschreibung normalisiert, nicht
   im Schema selbst — Schema erlaubt `[0-9a-fA-F]{64}`, Vergleich
   normalisiert). Beispiele unter `schemas/examples/`:
   `kontrollzustand-invocation-policy-baseline.valid.json` (zwei
   Schutzskripte, offensichtlich erfundene Hash-Werte, klar als Beispiel
   erkennbar, keine reale Skript-Hash-Übereinstimmung), `kontrollzustand-
   invocation-policy-baseline.invalid-leere-schutzskripte.json`
   (`schutzskripte: []`, verletzt `minItems: 1`).
3. **Schema 2 — Wirksamkeitsnachweis / Gültigkeitsschlüssel (E-188):**
   `schemas/kontrollzustand-invocation-policy-wirksamkeitsnachweis-
   payload.schema.json`. Felder:
   ```
   {
     "gueltigkeitsschluessel": {                    // Pflicht
       "werkzeug_konfiguration_hash": "...",         // Pflicht, sha256hex
       "schutzskript_hashes": ["...", "..."],        // Pflicht, mind. 1, je sha256hex
       "werkzeug_version_deklariert": "...",         // Pflicht, z. B. "2.1.241"
       "berechtigungskontext": "...",                // Pflicht, siehe [offene Unsicherheit 2]
       "arbeitsverzeichnis_pfad": "..."               // Pflicht
     },
     "rot_fall_beleg": "...",                         // Pflicht, Freitext-Verweis auf den kalibrierten Rot-Fall (z. B. Vertragsname + Fundstelle)
     "geprueft_am": "..."                             // Pflicht, ISO-Zeitstempel
   }
   ```
   Deckt E-188 wörtlich: „Gültigkeitsschlüssel aus mindestens: Hash der
   Werkzeugkonfiguration, Hashes der referenzierten Schutzskripte,
   Version des Ausführungswerkzeugs, Berechtigungskontext des Aufrufs,
   Pfad des Arbeitsverzeichnisses." `rot_fall_beleg` ist Pflicht, weil
   E-188 den Nachweis „gegen einen bekannten Rot-Fall", nicht aus bloßer
   Existenz verlangt — ein Wirksamkeitsnachweis ohne benannten Rot-Fall
   wäre laut E-188 kein Nachweis. Beispiele:
   `kontrollzustand-invocation-policy-wirksamkeitsnachweis.valid.json`,
   `kontrollzustand-invocation-policy-wirksamkeitsnachweis.invalid-
   fehlender-rotfallbeleg.json`.
   **[offene Unsicherheit 3]:** Wo die konkrete Wirksamkeitsnachweis-
   **Instanz** abgelegt wird (externes Autorisierungs-Repo wie die
   Baseline, oder `kontrollzustand/` im Produkt-Repo als eigener
   Lineage-Artefakttyp, F2), entscheidet dieser Plan bewusst nicht — der
   Auftrag entscheidet nur den Ablageort der **Baseline** (Punkt 1),
   nicht den des Wirksamkeitsnachweises, und §16.8 Punkt 3 nennt den
   Rot-Fall selbst als weiterhin offen (an noch nicht ausgeführte
   Verträge gebunden). Die Prüffunktion (SCOPE.5) nimmt den
   Wirksamkeitsnachweis deshalb als **Parameter** entgegen (Dependency
   Injection, wie F3s `pruefeAutorisierung(referenz, ...)` die Referenz
   entgegennimmt), statt selbst zu entscheiden, wo er herkommt. Diese
   Entkopplung ist unabhängig von einer späteren Ablageort-Entscheidung
   tragfähig.
4. **E-182-Verbotsliste:**
   `src/invocation-policy/verbotene-aufrufparameter.ts` (oder als
   konstantes Array in `types.ts`, Executor entscheidet) — exportiertes
   Array der sechs wörtlichen Parameter aus E-182 (`--bare`,
   `--safe-mode`, `--dangerously-skip-permissions`,
   `--allow-dangerously-skip-permissions`, `--permission-mode
   bypassPermissions`, `--fallback-model`) plus eine Prüffunktion
   `pruefeAufrufparameter(parameter: string[]): { ok: boolean; grund?:
   string }`, die eine geplante Aufrufkonfiguration (Array von
   Kommandozeilen-Tokens oder Objektschlüsseln, je nachdem wie F6 seinen
   Aufruf später zusammensetzt) dagegen prüft.
   **[offene Unsicherheit 4]:** Das exakte Eingabeformat dieser Funktion
   hängt davon ab, wie F6 (noch nicht gebaut) seinen Aufruf intern
   repräsentiert (Array von CLI-Flags? Options-Objekt?). Diese Akte legt
   die Prüflogik und die Verbotsliste fest, nicht das endgültige
   Aufrufobjekt von F6 — die Signatur nimmt bewusst den generischsten
   Typ (`string[]` aus den bereits bekannten Flag-Namen), den F6 bei
   Bedarf in einem dünnen Adapter erzeugen kann, ohne dass F4 F6s interne
   Repräsentation kennen muss.
5. **`src/invocation-policy/index.ts` — neues, eigenständiges Modul
   (kein `src/authorization-boundary/`-Touch außer dem in [offene
   Unsicherheit 1] benannten `export`):**
   - `pruefeStartbedingung1(baselineReferenz, istZustand, optionen?)` —
     liest die Baseline über F3s Lesepfad, verifiziert Referenz-Hash
     (analog F3 SCOPE.4, Pfad-Präfixprüfung + `.gitattributes`-Prüfung +
     Commit-Hash-Vergleich, identisches Rot-Fall-Set wie F3: Pfad
     außerhalb, Divergenz, fehlender Commit/Pfad), validiert die
     Baseline gegen Schema 1, vergleicht dann jeden `istZustand.hashes`-
     Eintrag (vom Aufrufer real gemessene Hashes der aktuell
     referenzierten Schutzskripte plus Konfigurationsdatei) gegen die
     Baseline. Rückgabe `{ ok: true }` oder `{ ok: false; grund }`
     (D4-Muster, kein Wurf bei erwartetem Rot-Fall).
   - `pruefeStartbedingung2(wirksamkeitsnachweis, istGueltigkeitsschluessel)`
     — validiert den übergebenen Nachweis gegen Schema 2, vergleicht
     `wirksamkeitsnachweis.gueltigkeitsschluessel` feldweise gegen
     `istGueltigkeitsschluessel` (vom Aufrufer zusammengestellt, siehe
     [offene Unsicherheit 2]/3/4 — F4 vergleicht, materialisiert die
     Eingabefelder aber gemäß §16.2 „Berechtigungskontext
     materialisieren" aus den ihm direkt übergebenen Rohwerten, erfindet
     keine eigene Quelle dafür). Jede Abweichung eines Feldes → `{ ok:
     false; grund }` (Drift-Fall, AC4). Übereinstimmung aller Felder →
     `{ ok: true }`.
   - `pruefeAufrufparameter(parameter)` — siehe SCOPE.4.
   - `pruefeStartfreigabe(eingaben, optionen?)` — Orchestrator: ruft
     `pruefeStartbedingung1` und `pruefeStartbedingung2` (in dieser
     Reihenfolge — E-183 vor E-188, wie in §16.4 aufgezählt), liefert bei
     erstem Fehlschlag sofort `{ starturteil: "ABGELEHNT", grund,
     werkzeugsatz_begrenzung: "DEKLARIERT" }` (kein Bewerten von
     Bedingung 2, wenn Bedingung 1 schon fehlschlägt — spart einen
     unnötigen `git show`-Aufruf und hält die Fehlermeldung eindeutig
     einer Bedingung zugeordnet), sonst `{ starturteil: "FREIGEGEBEN",
     berechtigungskontext, werkzeugsatz_begrenzung: "DEKLARIERT" }`. Das
     Feld `werkzeugsatz_begrenzung` ist **fest** `"DEKLARIERT"` in jedem
     Rückgabepfad — feature.md AC9 verlangt unbedingt sowohl
     Dokumentation als auch Rückgabeobjekt, kein Ermessen der
     Executor-Rolle (Korrektur AC9, siehe Abschnitt 3/7).
   - `verweigereStart(laufId, profilReferenz, grund, optionen?)` —
     dünner Aufrufer von F1Bs `schreibeWirkungsmarke(laufId, ...,
     "terminal", { ergebnis: "VERWEIGERT", daten: { invocation_policy:
     { grund } } })`, identisches Muster wie F3s
     `verweigereAutorisierung` (AC7).
6. **Strukturierte Laufausgabe** — neue Ereignisnamen
   `startfreigabe_geprueft`, `startfreigabe_abgelehnt` in `src/
   invocation-policy/types.ts`, eigene Ereignis-Union (kein Eingriff in
   F1Bs `Ereignisname`-Union — Muster wie F2/F3 gegenüber F1/F1B).
7. **`scripts/check-f4-invocation-policy.mjs`** — neues Gate-Skript,
   Muster wie `check-f3-authorization-boundary.mjs`:
   (a) legt ein Wegwerf-Git-Repo unter `os.tmpdir()` an (`.gitattributes:
   * -text` vor dem ersten Commit, wie F3), committet eine gültige
   Baseline-Datei, prüft `pruefeStartbedingung1` gegen einen passenden
   `istZustand` (Grün-Fall), dann gegen einen `istZustand` mit
   abweichendem Schutzskript-Hash (Rot-Fall, E-183) und gegen einen Pfad
   außerhalb des Wegwerf-Repos (Rot-Fall, F3-Muster);
   (b) prüft `pruefeStartbedingung2` mit einem übereinstimmenden
   Gültigkeitsschlüssel (Grün-Fall) und einem in genau einem Feld
   abweichenden Schlüssel — der Drift-Fall (Rot-Fall, E-188, AC4);
   (c) prüft `pruefeAufrufparameter` mit einer leeren Parameterliste
   (Grün-Fall) und mit `--dangerously-skip-permissions` in der Liste
   (Rot-Fall, E-182);
   (d) **AC8-Grep** — liest jede `.ts`-Datei unter `src/invocation-
   policy/`, meldet einen Befund bei jedem Treffer von
   `/\b(child_process|spawn|exec|execSync)\b/`, exakte Struktur-
   Präzedenz `check-f9-human-transport.mjs` Zeilen 166–182;
   (e) räumt den Temp-Pfad danach auf. Eingehängt in `npm run check` und
   `npm run check:template`, als letztes Glied der bestehenden `&&`-Kette
   angehängt (Executor prüft die exakte Position beim Bauen —
   keine inhaltliche Reihenfolgeabhängigkeit zu den bestehenden Gates,
   nur Anhängen).
8. **`src/invocation-policy/invocation-policy.test.ts`** —
   `node:test`-Fälle für AC10 (vier Fälle: gültige Baseline + gültiger
   Nachweis → `FREIGEGEBEN`; manipuliertes/fehlendes Schutzskript →
   `ABGELEHNT`, E-183; Drift im Gültigkeitsschlüssel bei sonst gültiger
   Baseline → `ABGELEHNT`, E-188; verbotener Aufrufparameter →
   `ABGELEHNT`, E-182), plus ein Fall für AC7 (`verweigereStart` ruft
   real `schreibeWirkungsmarke` mit `art: "terminal"`, `ergebnis:
   "VERWEIGERT"` auf, Beleg über nachfolgenden `stelleLaufstatusFest`-
   Aufruf, F3-A4-Muster). Gleiches Wegwerf-Git-Repo-Fixture-Muster wie
   SCOPE.7, feingranularer als das Gate-Skript.
9. **Zeile in `state/gates.md`** — neue Tabellenzeile
   `check-f4-invocation-policy.mjs` (entsteht laut CLAUDE.md-Konvention
   erst NACH dem realen Bau-/Prüflauf, nicht in diesem Planungsschritt).
10. **Zeile in `state/memory-map.md`** — „Invocation-Policy-Modul" →
    `src/invocation-policy/`, zwei neue Schemas unter `schemas/`,
    „nicht hierhin": nicht in `src/authorization-boundary/` (eigenes
    Modul laut §16.2), kein Prozessstart (F6), keine Baseline-Instanz im
    Produkt-Repo (nur Schema, nie Inhalt — analog F3).
11. **`docs/STATUS.md`** — Eintrag unter „Erledigt" nach Bau.
12. **`features/F4/journal.md`** — Anhängeprotokoll, fortgeschrieben je
    Phase.

## 3. NICHT (Non-Scope, mit Grund)

- **Jeder tatsächliche Prozessstart.** F6 (Claude-Code-Gateway,
  Deliverable 3) startet, F4 entscheidet nur. AC8 macht das über den
  Gate-Grep nachweisbar, nicht nur behauptet.
- **Erzeugung des Wirksamkeitsnachweises.** Der konkrete bekannte
  Rot-Fall der Wirksamkeitsprüfung ist laut §16.8 Punkt 3 „weiterhin
  offen — an die Kalibrierungen aus Vertrag 1 und Vertrag 2 gebunden".
  F4 liefert die Prüflogik gegen einen **gegebenen** Nachweis (SCOPE.3/5,
  Dependency Injection), erzeugt oder kalibriert ihn nicht selbst
  (Auftrag Punkt 3, ausdrücklich).
- **Schreiben der Baseline-Instanz.** Auftrag Punkt 2: die
  Baseline-**Instanz** schreibt der Mensch, im externen Autorisierungs-
  Repo, außerhalb dieser Sitzung. Diese Akte liefert Schema 1 und die
  Prüffunktion, nie einen Schreibpfad für Baseline-Inhalte.
- **Auflösung der Werkzeugversions-Diskrepanz** (`2.1.241`/`2.1.250`,
  `state/tp-nachtrag.md`). Bleibt im Wortlaut unaufgelöst — die
  Werkzeugversion geht als vom Aufrufer **deklarierter** Wert in den
  Gültigkeitsschlüssel ein (Auftrag Punkt 4), nicht als zur Laufzeit
  gemessener.
- **Erzwingung des Werkzeugsatzes über `--tools`/`--disallowedTools`
  (E-187) selbst.** Messfall 3 (`state/tp-nachtrag.md`) ist nicht messbar
  (kein MCP-Server auf der Zielmaschine) — E-187 bleibt unbelegt. Diese
  Akte weist eine `--tools`/`--disallowedTools`-Begrenzung ausschließlich
  als `DEKLARIERT` aus, nie als `ERZWUNGEN` (Auftrag Punkt 8). Das Feld
  `werkzeugsatz_begrenzung: "DEKLARIERT"` ist dabei **fester**
  Bestandteil der `pruefeStartfreigabe`-Rückgabe (SCOPE.5) — feature.md
  AC9 verlangt Dokumentation **und** Rückgabeobjekt unbedingt, kein
  Ermessen der Executor-Rolle (Korrektur AC9; ehemals fälschlich als
  [offene Unsicherheit 5] geführt).
- **Änderung an `src/authorization-boundary/`** über den in [offene
  Unsicherheit 1] benannten, rein additiven `export`-Diff hinaus. Kein
  zweiter Regelsatz für `git show`-Lesen, keine eigene
  `.gitattributes`-Prüfung.
- **`docs/projekt/zielfassung.md` §16.8 Punkte 3, 4, 5, 8 endgültig
  schließen.** Diese Akte respektiert sie als offen und baut so, dass
  eine spätere Schließung (z. B. eine endgültige Form des
  Berechtigungskontexts) keinen Bruch der hier festgelegten
  Schema-/Funktionsgrenzen erzwingt (siehe Design-Entscheidung 3 unten).
- **UI.** Keine Leitstand-Anzeige eines Starturteils.
- **`ai-workforce-autorisierung/` beschreiben.** Auftrag NICHT-Abschnitt
  — nichts in diesem externen Repo wird von dieser Sitzung angelegt oder
  verändert.
- **Committen, Pushen, `state/freigabe-commit.md` anlegen.** Auftrag
  NICHT-Abschnitt — dieser Schritt endet mit Diff-Vorlage und Warten auf
  Freigabe.
- **Aussagen zu F-030 oder F6 über die Modulgrenze hinaus.** AC8 belegt
  die Grenze technisch (Grep); keine inhaltliche Aussage darüber, wie F6
  intern gebaut wird.

## 4. Design-Entscheidungen

- **Design-Entscheidung 1 (eigenes Modul `src/invocation-policy/`, kein
  `src/authorization-boundary/`-Umbau):** §16.2 führt „Invocation Policy
  / Protection Validator" als eigene Tabellenzeile, exakt wie F3
  gegenüber „Authorization Boundary". Gleiches Argument wie F3-Plan D1:
  ein Bau innerhalb von `src/authorization-boundary/` würde diese
  Modulgrenze ohne Beleg einebnen. F4 nutzt F3s Lesepfad rein als
  aufrufende Bibliotheksfunktion (D5-Muster).
- **Design-Entscheidung 2 (zwei getrennte Schemas statt eines
  gemeinsamen):** Baseline (E-183, „was ist erlaubt") und
  Wirksamkeitsnachweis (E-188, „wurde belegt, dass der Schutz wirkt")
  sind fachlich verschiedene Aussagen mit unterschiedlicher Lebensdauer —
  die Baseline ändert sich, wenn sich Schutzskripte ändern; der
  Wirksamkeitsnachweis ändert sich, wenn sich der Gültigkeitsschlüssel
  ändert (auch ohne Baseline-Änderung, z. B. bei einem neuen
  Berechtigungskontext). Ein gemeinsames Schema würde beide
  Änderungsanlässe künstlich koppeln. Getrennte Schemas halten SCOPE.5s
  zwei Prüffunktionen unabhängig testbar (AC3/AC4 sind bewusst getrennte
  Kriterien).
- **Design-Entscheidung 3 (Wirksamkeitsnachweis als Funktionsparameter,
  kein fest verdrahteter Lesepfad):** Weil §16.8 Punkt 3 den Rot-Fall
  selbst und Punkt 8 die Repräsentation des Gültigkeitsschlüssels als
  offen führt, würde ein fest verdrahteter Lesepfad (z. B. „immer aus dem
  externen Repo, exakt wie die Baseline") diese offene Frage
  stillschweigend vorentscheiden — genau das verbietet CLAUDE.md Punkt 5
  der Entscheidungsregel („Entscheidung dokumentieren — niemals
  stillschweigend in Code verwandeln"). `pruefeStartbedingung2` nimmt den
  Nachweis deshalb als Parameter entgegen; der Aufrufer (F6 oder ein
  späterer Vertrag) entscheidet die Ablageort-Frage, ohne dass F4 danach
  angepasst werden muss.
- **Design-Entscheidung 4 (kein Wurf bei erwarteten Rot-Fällen,
  `{ ok: false, grund }` / `{ starturteil: "ABGELEHNT", grund }`):**
  Gleiches Muster wie F1Bs `stelleLaufstatusFest` (D10) und F3s
  `pruefeAutorisierung` (D4) — eine fehlgeschlagene Startbedingung ist
  ein regulärer, benannter Ausgang, kein Programmfehler.
- **Design-Entscheidung 5 (Reihenfolge E-183 vor E-188 in
  `pruefeStartfreigabe`):** §16.4 zählt die Bedingungen in dieser
  Reihenfolge auf („1. … (E-183) 2. … (E-188)"). E-183 ist zudem die
  günstigere Prüfung (kein zweiter `git show`-Aufruf nötig, wenn schon
  die Baseline-Referenz nicht auflösbar ist) — Kurzschluss-Auswertung
  spart unnötige Arbeit und hält jede Ablehnung eindeutig einer der
  beiden Bedingungen zugeordnet (wichtig für AC3 vs. AC4, die getrennt
  geprüft werden müssen).

## 5. Ablageort

- `src/invocation-policy/{index,types}.ts`,
  `invocation-policy.test.ts` — neuer, eigenständiger Modulordner
  (Design-Entscheidung 1).
- `schemas/kontrollzustand-invocation-policy-baseline-payload.schema.json`,
  `schemas/kontrollzustand-invocation-policy-wirksamkeitsnachweis-
  payload.schema.json` + je zwei Dateien unter `schemas/examples/`
  (valid + invalid) — neben den bestehenden F0/F1/F1B/F2/F3/F9/F5-Schemas.
- `scripts/check-f4-invocation-policy.mjs` — neben den bestehenden
  Gate-Skripten.
- `C:\Users\stefa\ai-workforce-autorisierung\invocation-policy-
  baseline\` — außerhalb dieses Produkt-Repos, im bestehenden externen
  Git-Repository von F3 (neuer Unterordner, kein neues Repo).

## 6. Budget & Pässe

- Zuschnitt-Bewertung (CLAUDE.md-Heuristik): ein Baudurchgang plus
  höchstens eine Korrekturrunde, eigenständig prüfbares Artefakt (Gate +
  `npm run check` grün). Kleiner F3-Touch möglich ([offene Unsicherheit
  1], rein additiver `export`) — kein Umbau bestehender F3-Signaturen.
  Neue, sicherheitsrelevante Vertrauensgrenze (E-182/E-183/E-188) — daher
  Advisor-Pass fällig, mit Fokus auf Design-Entscheidung 3 (trägt
  „Nachweis als Parameter" wirklich E-188, oder verschiebt es nur die
  Verantwortung unsichtbar auf den Aufrufer?) und auf die vier offenen
  Unsicherheiten 1–4.
- Vor jedem Bau: Klärung von [offene Unsicherheit 1] (F3-`export`-Diff
  ja/nein) mit Stefan, weil sie den einzigen Berührungspunkt zu einer
  bereits abgeschlossenen Akte betrifft.
- Advisor-Pass — Subagent `architecture-advisor`, frischer Kontext,
  `Read/Grep/Glob`, danach `code-reviewer` und `qa`, read-only.
- Rework-Regel: Gate 1 rot → eine Korrekturrunde → Gate 2. Zweites Rot ⇒
  BLOCKIERT ⇒ Mensch.
- `state/gates.md`-Eintrag (SCOPE.9) entsteht erst NACH dem realen
  Bau-/Prüflauf, mit echtem Befehl+Ausgabe-Beleg.

## 7. Akzeptanzkriterien (technisch)

- **A1** Beide Schemas (`...-baseline-payload...`, `...-wirksamkeitsnachweis-
  payload...`) existieren, sind gültiges JSON Schema (Draft 2020-12),
  parsebar.
- **A2** `pruefeStartbedingung1` gegen eine echte, committete Baseline mit
  `istZustand`-Hashes, die exakt übereinstimmen, liefert `{ ok: true }`
  (deckt AC2/AC3, Grün-Fall).
- **A3** `pruefeStartbedingung1` gegen einen `istZustand` mit
  mindestens einem abweichenden Schutzskript-Hash liefert `{ ok: false,
  grund }` (deckt AC3, Rot-Fall E-183).
- **A4** `pruefeStartbedingung1` gegen eine Baseline-Referenz mit Pfad
  außerhalb des externen Repos oder nicht auffindbarem Commit liefert
  `{ ok: false, grund }` (F3-Muster, fail-closed).
- **A5** `pruefeStartbedingung2` gegen einen Wirksamkeitsnachweis, dessen
  `gueltigkeitsschluessel` exakt mit dem übergebenen
  `istGueltigkeitsschluessel` übereinstimmt, liefert `{ ok: true }`
  (Grün-Fall).
- **A6** `pruefeStartbedingung2` gegen einen Nachweis, bei dem genau ein
  Feld des Gültigkeitsschlüssels abweicht (Drift-Fall — z. B. ein anderer
  `arbeitsverzeichnis_pfad`), liefert `{ ok: false, grund }`, obwohl die
  Baseline aus A2 unverändert gültig bliebe (deckt AC4, zentraler
  Rot-/Grün-Beleg dieses Features).
- **A7** `pruefeAufrufparameter` gegen eine Parameterliste ohne einen der
  sechs E-182-Werte liefert `{ ok: true }`; mit mindestens einem der
  sechs Werte liefert `{ ok: false, grund }` (deckt AC6).
- **A8** `pruefeStartfreigabe` liefert bei Bedingung 1 fehlgeschlagen
  (A3) `{ starturteil: "ABGELEHNT", grund }` ohne Bedingung 2 auszuwerten
  (Design-Entscheidung 5, Kurzschluss — Beleg über einen absichtlich
  fehlerhaften, nicht auswertbaren `wirksamkeitsnachweis`-Parameter, der
  bei Auswertung einen Wurf verursachen würde, aber wegen des
  Kurzschlusses nie erreicht wird).
- **A9** `pruefeStartfreigabe` liefert bei beiden Bedingungen erfüllt
  `{ starturteil: "FREIGEGEBEN", berechtigungskontext }` (deckt AC5).
- **A10** `verweigereStart` ruft nach einem `ABGELEHNT`-Ergebnis F1Bs
  `schreibeWirkungsmarke` mit `art: "terminal"`, `ergebnis: "VERWEIGERT"`
  auf — Beleg über einen nachfolgenden `stelleLaufstatusFest`-Aufruf, der
  `ABGESCHLOSSEN`/`VERWEIGERT` liefert (deckt AC7, F3-A4-Muster).
- **A11** `grep -rnE "\b(child_process|spawn|exec|execSync)\b"
  src/invocation-policy/*.ts` liefert keinen Treffer (deckt AC8, real
  ausgeführt, nicht nur behauptet).
- **A12** `pruefeStartfreigabe` liefert in **jedem** Ergebnis —
  `FREIGEGEBEN` wie `ABGELEHNT` — das Feld `werkzeugsatz_begrenzung` mit
  exaktem Wert `"DEKLARIERT"`; real geprüft in
  `invocation-policy.test.ts` (automatisierter Testfall, kein manueller
  Doku-Grep). Als Review-Nebenprüfung zusätzlich:
  `docs/STATUS.md`/`features/F4/feature.md` nennen eine
  `--tools`/`--disallowedTools`-Begrenzung nirgends als `ERZWUNGEN`
  (deckt AC9 vollständig — Rückgabeobjekt automatisiert, Dokumentation
  manuell im Review).
- **A13** Test „gültige Baseline + gültiger Nachweis" (AC10, Fall 1) =
  A2 + A5 + A9 als benannter Testfall.
- **A14** Test „manipuliertes/fehlendes Schutzskript" (AC10, Fall 2) =
  A3 als benannter Testfall.
- **A15** Test „Drift im Gültigkeitsschlüssel" (AC10, Fall 3) = A6 als
  benannter Testfall.
- **A16** Test „verbotener Aufrufparameter" (AC10, Fall 4) = A7 als
  benannter Testfall.
- **A17** `node scripts/check-f4-invocation-policy.mjs` → Exit 0.
- **A18** `npm run check` und `npm run check:template` sind grün.
- **A19** `state/gates.md` enthält die neue Zeile mit echtem
  Rot-/Grün-Beleg.
- **A20** `state/memory-map.md` enthält die neue Zeile mit
  „nicht hierhin"-Spalte.
- **A21** `docs/STATUS.md` nennt F4 unter „Erledigt".
- **A22** (Hauptkriterium) Für eine reale Baseline-Abweichung (A3) oder
  einen realen Gültigkeitsschlüssel-Drift (A6) liefert
  `pruefeStartfreigabe` real `{ starturteil: "ABGELEHNT" }`, und kein
  Codepfad in diesem Feature leitet daraus ein `FREIGEGEBEN` ab — nicht
  in Prosa behauptet, über A3/A6/A8 nachgewiesen (analog F1Bs
  A19-/F3s A18-Muster).

A1–A21 sind Mechanik, A22 ist das eigentliche Kriterium.

## 8. Rollen für diesen Workstream

| Position | Träger | Rechte |
|---|---|---|
| Advisor | Subagent `architecture-advisor`, frisch | `Read, Grep, Glob` |
| Executor | Claude-Code-Sitzung, frisch, kennt nur Repo + Vertragsvolltext | voll im freigegebenen Pfad |
| Reviewer | Subagenten `code-reviewer`, `qa`, frisch | read-only |
| Mensch (Stefan) | — | Freigaben, Klärung [offene Unsicherheit 1]/2/3/4, Schreiben der Baseline-Instanz, Release, echte Abzweigungen |

## 9. Offene Unsicherheiten dieses Plans (Zusammenfassung)

1. Braucht `src/authorization-boundary/index.ts` einen additiven
   `export` auf `leseAusCommit`/`gitattributesPinntZeilenenden`/
   `leiteRepoRelativenPfadAb`, damit F4 sie ohne zweiten Regelsatz
   wiederverwenden kann? (Abschnitt 0, Abschnitt 6 Budget)
2. Genaue Form des Felds `berechtigungskontext` im Gültigkeitsschlüssel
   — diese Akte behandelt es als vom Aufrufer bereitgestellten,
   opaken Wert (String/Hash), materialisiert keine eigene, tiefere
   Struktur (SCOPE.3).
3. Ablageort der Wirksamkeitsnachweis-**Instanz** (externes Repo wie die
   Baseline, oder `kontrollzustand/`-Artefakt via F2-Lineage, oder
   anderswo) — bewusst nicht entschieden, gelöst über Parameter-
   Entkopplung (Design-Entscheidung 3).
4. Exaktes Eingabeformat von `pruefeAufrufparameter` gegenüber F6s noch
   nicht gebauter interner Aufrufrepräsentation (SCOPE.4).

Diese vier Punkte sind bewusst nicht vorentschieden (CLAUDE.md
Entscheidungsregel Punkt 5) — Klärung vor oder während der Umsetzung,
nicht Gegenstand dieses Planungsschritts. (Korrektur AC9: der ehemalige
Punkt 5 — ob `werkzeugsatz_begrenzung: "DEKLARIERT"` Teil der Rückgabe
wird — ist entschieden, siehe Abschnitt 2 SCOPE.5, Abschnitt 3 NICHT und
A12; entfällt hier ersatzlos.)

## 10. Nächste Schritte nach diesem Plan (nicht Teil dieses Auftrags)

1. Klärung der Offenen Punkte 1–4 oben, mindestens Punkt 1 vor Baubeginn.
2. Advisor-Pass auf diese Datei.
3. Findings → `state/advisor-findings-f4-invocation-policy.md`.
4. Falls nötig: `plan-v2-f4-invocation-policy.md` als neue Datei —
   dieser plan-v1 bleibt unverändert stehen.
5. Handoff-Vertrag → `state/tasks/f4-invocation-policy.md`, SCHRITT
   0 wörtlich, sieben Pflichtsektionen.
