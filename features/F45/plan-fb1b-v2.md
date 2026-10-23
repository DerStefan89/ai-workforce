# F45 FB-1b „Fähigkeit übernehmen/verwerfen“ — Routen (Plan v2)

Stand: 23.10.2026 · nach Advisor-Pass `features/F45/advisor-fb1b.md` („Nicht freigegeben“: vor Baubeginn 1, 2, 4). Plan v1
(`plan-fb1b.md`) bleibt unverändert stehen; hier nur, was sich ändert — alles Übrige gilt wie in v1.

## Änderungen gegenüber v1

### A Reihenfolge: erst alle `await`s, dann ein synchroner Block (Befund 1, vor Baubeginn)

`fuehreVorschlagAktionDurch` in zwei Phasen; **Invariante: ab Phase B kein `await`** (Kommentar im Code, Unit-Test: die
`lage`-Attrappe liefert beim zweiten Aufruf „Lauf aktiv“ bzw. „Aufräumen läuft“ ⇒ 409, nichts bewegt).

- **Phase A (asynchron, schreibt nichts):** Kennung/Körper (400) → `lage₀` (404/409 früh: Identität, Laufsperre, Wurzel, nur
  Übernehmen: Abnahme) → Erkennung₀ (Eintrag `typ`+`name` ⇒ sonst 404) → parallel `leseBasisBaum(wurzel, basisCommit)` (ein
  `ls-tree`) und nur Übernehmen `pruefeZielIgnoriert(wurzel, [eintrag])` (hängt nur am Namen und den Regeln).
- **Phase B (synchron, ein Block):** `lage₁` frisch — alle Bedingungen erneut (Laufsperre, `arbeitsordnerVorbereitungLaeuft`,
  Wurzel = Wurzel aus A, Abnahme) → Erkennung frisch → `hash` null ⇒ 409, ≠ `body.hash` ⇒ 409 → q1 `vergleicheMitBasis`
  (synchron, gegen den Baum aus A; `unveraendert` ⇒ 404, `null` ⇒ 409) → nur Übernehmen: `grund`, `ziel_existiert`,
  `ziel_ignoriert` aus A (`true` B13 / `null` ⇒ 409) → B3 lokale Datei → B6 Quelle/Ziel → Bewegen → Probe → `aendere` → Agent:
  Quelle löschen → leere Behälter. Verwerfen: B6 Quelle → löschen.
- DEKLARIERT (Befund 11, wie `vorschlag.ts` Kopf): ein fremder Prozess (kein Lauf, der ist gesperrt) kann zwischen lstat-Kette und
  Bewegen eine Verknüpfung setzen; Ordner-Rename und `COPYFILE_EXCL` zerstören dabei keinen Inhalt, die Probe am Ziel prüft den
  Hash nach dem Bewegen. `.gitignore` kann sich zwischen A und B ändern (Sekundenbruchteil) — DEKLARIERT.

### B q1 geteilt (Befund 1, 8)

`src/faehigkeiten/vorschlag.ts`: `leseBasisBaum(wurzel, basisCommit)` async ⇒ `{ ok: true, baum: Map pfad → { modus, typ, blob } }`
oder `{ ok: false, grund }` — `git --no-optional-locks -c core.quotePath=false -c core.fsmonitor=false ls-tree -r -z <basis> --
vorschlaege/faehigkeiten` mit `LC_ALL=C`, Parser `parseLsTree` aus `src/review-stand` (wiederverwendet). `vergleicheMitBasis(wurzel,
eintrag, baum)` synchron ⇒ `'neu' | 'geaendert' | 'unveraendert' | null`: Dateiliste über `vorschlagDateien(wurzel, eintrag)`
(neu exportiert; Agent die Datei, Skill der begrenzte Durchlauf); nur Typ `blob` mit Modus 100644/100755 zählt, anderer Modus
(120000/160000) ⇒ `geaendert`; Blob in JS (`blob <len>\0` + Bytes; sha1 bei 40, sha256 bei 64 Hex). Unit-Test gegen echtes
`git hash-object --no-filters`, auch `git init --object-format=sha256` (übersprungen mit Meldung, wenn git es nicht kann).
Projektion nutzt dieselben zwei Funktionen (Baum im Cache-Eintrag mit check-ignore).

### C Identität der Kennung (Befund 2, vor Baubeginn)

`lage(workflowId)` im Server liefert null, wenn `version.daten?.workflow_id !== workflowId` (wie `loeseCodeOrt`) ⇒ 404. Gate (k):
Kennung in anderer Schreibweise ⇒ 404 (unter Linux ohnehin 404 — der Fall prüft den Grund-Text).

### D Kern-Wortlaut gemessen (Befund 4, vor Baubeginn)

- §1: „bis W2 entstehen keine neuen Routen (Kollision mit `check-f813-csrf` (4), F-1131).“ ⇒ „neue Routen bis W2 nur im
  Zwischenmuster: Modul erkennt den Pfad, Server prüft die Methode hinter dem CSRF-Haken (DEKLARIERT, F-1131).“ Die Kollision steht
  schon wörtlich in `wachstumsbremse.md`.
- §2: nach „… oder `kontrollzustand/`;“ ⇒ „Fähigkeit-Vorschläge übernimmt bzw. verwirft er nur auf Klick (`.claude/`, F-1167);“.
- Gemessen wird beim Bau mit `node scripts/check-f45-k-kontext.mjs`; reicht es nicht, wandert die Klammer „(nie `git status`,
  `update-index`, `write-tree`)“ aus §2 wörtlich nach `docs/architektur/arbeitsordner.md` (dort ergänzt, falls nicht vorhanden).
  Deckel bleibt (E-FB1-4).

### E Probe q4 als Variante (a) (Befund 3, 9)

Probe vorher und nachher mit **allen** gefundenen Projekt-Einträgen aktiv (`an` = alle Schlüssel, `inhalt_freigaben` = je eigener
Hash, Katalog leer) und den echten Werkzeugnamen des Ausführungsschritts (Server: `werkzeugNamenAus` über den Werkzeugsatz des
Ausführungsschritts der Startvorlage; nicht bestimmbar ⇒ 409). 409, wenn `s` nachher nicht `aktiv` ist oder `hindernis` nachher
einen Teil (Trenner `; `) trägt, der vorher fehlte. Kein Typwechsel an `ProjektFaehigkeitenKontext` (Befund 9 entfällt).

### F Agent-Reihenfolge (Befund 7)

Agent: `copyFileSync(EXCL)` → Probe → `aendere` → `unlinkSync(quelle)`. Rücknahme vor `aendere`-Erfolg nur `unlinkSync(ziel)`.
Scheitert das Löschen der Quelle nach Erfolg ⇒ 200 mit Zusatz „Vorschlag blieb liegen — verwerfen“ (harmlos, Ziel existiert).
Skill unverändert (`renameSync`, Rücknahme `renameSync(ziel, quelle)`).

### G Kleinere Punkte (Befunde 5, 10, 12, 13)

- Rot-Nachweis: (c) und (e) sind auf main grün (CSRF-Haken greift ohne Route; Zähler unverändert) — Sabotage-Kopie für (c)
  (Route vor dem Haken); alle 4xx-Fälle prüfen den JSON-`grund`, nicht nur den Status.
- Verwerfen Skill: `rmSync(quelle, { recursive: true, maxRetries: 3 })`.
- Keine `.method` in `scripts/leitstand/*.mjs`, auch nicht in Tests oder Kommentaren.
- Körper über `leseJsonBegrenzt(req, 4096)` statt `leseBody`.
- `aendereLokaleDatei` meldet Schreibfehler mit 500 — die Route bildet jede Ablehnung von `aendere` auf 409 „nichts übernommen“
  ab (ausdrücklich, Statuscode-Regel des Auftrags).
- `hinweis` nennt zusätzlich „Review veraltet“ (E-FB1-3) bei offener Abnahme; `arbeitsordner.md` ebenso. F-1167/FB-2: Pflicht,
  den `hinweis` anzuzeigen.
- q9 zusätzlich `com0`, `lpt0`.
- B10 in `wachstumsbremse.md` ausdrücklich (Vorbild `schreibeKopie` der Plugin-Freigabe): Dateien im Arbeitsordner bewegt das
  Modul, die lokale Datei schreibt nur der Rückruf.
- Gate (s) zusätzlich: `.claude/skills` als Verknüpfung, Behälter `vorschlaege/faehigkeiten/skills` als Verknüpfung.

## Delta-Advisor-Pass

Nach der Empfehlung des Advisors (Nächster sinnvoller Schritt): kurzer Delta-Pass nur auf Abschnitt A (neue Reihenfolge) und E.
Ergebnis `features/F45/advisor-fb1b-delta.md`: **Freigegeben mit Hinweisen**.

## Nachtrag nach dem Delta-Pass (23.10.2026)

- (1) Phase B ist eine eigene, **nicht asynchrone** Funktion (`fuehreSynchronDurch`) — ein `await` darin ist ein SyntaxError,
  die Invariante damit strukturell ERZWUNGEN. `lage₁` streng: null ⇒ 404, `typeof wurzel !== 'string'` bzw. `laufGesperrt`
  weder null noch Text ⇒ 409, nie weiter. Unit-Test: Rückgabe von Phase B ist kein Promise.
- (2) Phase B verlangt zusätzlich `basisCommit₁ === basisCommit₀`, sonst 409.
- (3) `ziel_ignoriert !== false` ⇒ 409 (fail-closed, auch `undefined`).
- (5) Gate (k): Quelltextprüfung der Identitätszeile in `lage` (Muster b2b4a1 (a5)) und Artefakt mit abweichender `workflow_id`.
- (6) Kern §2: „außerdem übernimmt bzw. verwirft er Fähigkeit-Vorschläge nur auf Klick (`.claude/`; DEKLARIERT, Pfadprüfung
  ERZWUNGEN, Gate f45-fb1b)“ — gemessen beim Bau, Rückfall wie D.
- (7) Probe: Vorlauf mit leeren Einstellungen ⇒ Schlüssel/Hashes der vorhandenen Einträge ⇒ Probe vorher ⇒ Bewegen ⇒ Probe
  nachher mit denselben Schlüsseln plus `s`, für `s` `inhalt_freigaben[s] = body.hash` (Hash am Ziel geprüft). Alles in Phase B.
- (8) `ProjektFaehigkeitenErgebnis` additiv um `hindernisse: string[]` (Vergleich je Teil, kein Zerlegen am Trenner).
- (9) `BaumEintrag` additiv um `modus`; Skill-Pfade mit abschließendem `/`.
- (10) Das Modul nimmt das geparste Objekt aus `leseJsonBegrenzt(req, 4096)`; 400/413 reicht der Server durch.
- (11) `nachRoute` im `aendere`-Rückruf des Servers synchron nach Erfolg.
- (4) Neues Finding: Aufräumen-Route ohne Identitätsprüfung der Kennung (Bestand).
