# E2E-Nachweis F11 WS-3 (AK8) — reale Läufe über den Leitstand

Realer, über den Leitstand-Schreibpfad (`POST /api/laeufe`, F10/F11 WS-2)
ausgelöster Nachweis der beiden in `features/F11/feature.md` AK8
geforderten Läufe mit echtem Claude-Code-Kindprozess: (a) ein lesender
Lauf, der eine Frage zu einer real mitgelieferten Evidenzdatei
beantwortet, (b) ein schreibender Lauf, zweistufig — zuerst gegen einen
git-ignorierten Scratch-Pfad (b1), danach gegen eine echte, getrackte
Datei (b2, diese Datei selbst — siehe Abschnitt "Realer Schreibnachweis
(b2)" unten).

Muster: `state/e2e-nachweis-meilenstein-1.md`.

## Server

`npm run leitstand` real gestartet, Arbeitsverzeichnis
`C:\Users\stefa\Projekte\ai-workforce`, Port 4173 (Standard), Startvorlage
`startvorlagen/beispielprojekt.json`, Profil `profiles/beispielprojekt.json`.

## Echter Blocker während der Durchführung, real gelöst

Der erste Versuch von Lauf (a) (`laufId`
`e2e-f11-ws3-lesend-2026-09-06`, ohne `-v2`-Suffix) endete real
`VERWEIGERT`: `startvorlagen/beispielprojekt.json`s `werkzeugStartziel`
verwies auf den npm-Global-Installationspfad
(`C:\Users\stefa\AppData\Roaming\npm\node_modules\@anthropic-ai\claude-code\bin\claude.exe`),
der externe, committete Wirksamkeitsnachweis erwartet aber
`C:\Program Files\claude\claude.exe` (derselbe Pfad, den bereits
`scripts/verify-f6b-ws-g-schreiblauf.mjs` und der Meilenstein-1-Nachweis
verwenden) — F4s `pruefeStartfreigabe` lieferte real `ABGELEHNT`
(`Drift im Gültigkeitsschlüssel: 'startziel_pfad' (E-188)`), kein
Kindprozess wurde gestartet. Realer Beleg (`GET /api/startfehler` zum
Zeitpunkt des Fehlschlags):

```json
[{"zeitstempel":"2026-09-06T17:17:52.626Z","laufId":"e2e-f11-ws3-lesend-2026-09-06","fehler":"F6a-Ablehnung: Drift im Gültigkeitsschlüssel: 'startziel_pfad' (E-188)"}]
```

Die zugehörige `VERWEIGERT`-Wirkungsmarke steht real unter
`kontrollzustand/e2e-f11-ws3-lesend-2026-09-06/` — die `laufId` bleibt
laut dem in `scripts/leitstand-server.mjs` dokumentierten Muster
(Kommentar bei `angenommeneLaufIds`) absichtlich belegt, ein Retry
brauchte eine neue `laufId` (`-v2`-Suffix unten).

**Einordnung:** kein Blocker der WS-3-Aufgabe selbst, sondern ein realer,
bisher unentdeckter Konfigurationsfehler in der WS-2-Startvorlage — sie
wurde bislang nur gegen Testattrappen geprüft (`scripts/check-f10-
leitstand.mjs`), nie live gegen den echten F4/F6a-Pfad. **Fix:**
`startvorlagen/beispielprojekt.json`s `werkzeugStartziel` auf
`["C:\\Program Files\\claude\\claude.exe"]` korrigiert (einzige Änderung,
reine Konfigurationsdatei, kein Eingriff in `src/`), Server neu gestartet
(Startvorlage wird nur einmal beim Server-Start geladen), danach beide
folgenden Läufe real erfolgreich. Registriert als `state/findings.md`
F-136.

## Lauf (a) — lesend

- **laufId:** `e2e-f11-ws3-lesend-2026-09-06-v2`
- **Zeitstempel:** 2026-09-06T17:21:20.304Z (RUN_PREPARED) bis
  2026-09-06T17:21:29.975Z (Terminalartefakt)
- **Startauftrag (Body von `POST /api/laeufe`):**
  - `rolle`: `ausfuehrung`
  - `anfragen`: genau eine, `pfad: features/F11/feature.md`,
    `notwendig: true`, Frage "Wie viele Akzeptanzkriterien (AK1 bis AKn)
    sind im Abschnitt 'Akzeptanzkriterien' dieser Datei nummeriert?
    Antworte ausschliesslich mit der Zahl." — Server las die Datei selbst
    (AK6), `anfragen[]` enthielt kein `inhalt`-Feld im Body.
  - `budget`: `{ maxElemente: 5, maxBytes: 200000 }`
  - `aufrufEingaben`: `{ modell: 'claude-sonnet-5' }` — `werkzeugsatz`
    kam serverseitig aus der Startvorlage (AK4/AK5)
  - `auftragstext`: "Beantworte die in der mitgelieferten Evidenz
    gestellte Frage ausschliesslich anhand dieser Evidenz, kurz und
    praezise."
  - `werkzeugsatz`: `lesend` → serverseitig aufgelöst zu
    `{ modus: 'DEKLARIERT', erlaubte_werkzeuge: ['Read','Grep','Glob'] }`
    (kein Write, kein Edit, kein Bash)
  - `werkzeugStartziel` (aus Startvorlage): `["C:\\Program Files\\claude\\claude.exe"]`

### Realer LaufStatus (vollständiges JSON, `GET /api/laeufe`)

```json
{
  "laufId": "e2e-f11-ws3-lesend-2026-09-06-v2",
  "checkpoints": [
    {
      "sequenz": 1,
      "zeitstempel": "2026-09-06T17:21:20.304Z",
      "gueltig": true,
      "typ": "wirkungsmarke",
      "wirkungsmarke": { "art": "run_prepared" }
    },
    {
      "sequenz": 2,
      "zeitstempel": "2026-09-06T17:21:29.975Z",
      "gueltig": true,
      "typ": "wirkungsmarke",
      "wirkungsmarke": { "art": "terminal", "ergebnis": "ERFOLGREICH" }
    }
  ],
  "laufStatus": {
    "status": "ABGESCHLOSSEN",
    "ergebnis": "ERFOLGREICH",
    "terminalSequenz": 2,
    "runPreparedSequenz": 1,
    "terminaleOhneRunPrepared": []
  }
}
```

### Rohereignisstrom-Auszug (`kontrollzustand-roh/e2e-f11-ws3-lesend-2026-09-06-v2/rohstrom.json`, gitignoriert, lokal vorhanden)

- `werkzeugStartziel`: `["C:\\Program Files\\claude\\claude.exe"]`
- `exitCode`: `0`, `startfehler`: `null`
- `stdout` (geparst, `type: "result"`): `is_error: false`,
  `permission_denials: []` (kein einziger Genehmigungsverweigerungsversuch
  — der Kindprozess nutzte ausschließlich `Read` innerhalb des lesenden
  Werkzeugsatzes), `modelUsage`-Schlüssel genau `claude-sonnet-5`,
  `result: "9"`.

**Belegwert real geprüft:** `features/F11/feature.md` listet real neun
Akzeptanzkriterien (AK1–AK9, Abschnitt "Akzeptanzkriterien") — der
Kindprozess hat die echte, mitgelieferte Evidenzdatei gelesen und korrekt
ausgewertet, nicht geraten.

Belegakte: `kontrollzustand/e2e-f11-ws3-lesend-2026-09-06-v2/` (im Repo,
nicht aufgeräumt — realer Beleg). Der erste, `VERWEIGERT`e Versuch
(`kontrollzustand/e2e-f11-ws3-lesend-2026-09-06/`, ohne `-v2`) bleibt
ebenfalls stehen — realer Beleg des Blockers, kein Testartefakt.

## Lauf (b1) — schreibend, Scratch-Pfad

- **laufId:** `e2e-f11-ws3-schreibend-scratch-2026-09-06`
- **Zeitstempel:** RUN_PREPARED → Terminalartefakt real durchlaufen,
  Zwischenzustand `KLAERUNG_ERFORDERLICH` (offene RUN_PREPARED-Marke)
  zweimal beim Polling beobachtet, bevor die Terminalmarke geschrieben
  war — kein Fehlzustand, reines Timing des Pollings gegen den laufenden
  Kindprozess.
- **Startauftrag:**
  - `anfragen`: `[]` (keine Evidenz nötig für diesen Auftrag)
  - `auftragstext`: "Erstelle die Datei
    scratch-f11-ws3/beweis-schreiblauf.txt (Pfad relativ zum aktuellen
    Arbeitsverzeichnis, der Unterordner scratch-f11-ws3 existiert
    bereits) mit exakt diesem Inhalt und sonst nichts:
    F11_WS3_SCHREIBLAUF_PROBE. Nutze dafuer das Write-Werkzeug."
  - `werkzeugsatz`: `schreibend` → serverseitig aufgelöst zu
    `{ modus: 'DEKLARIERT', erlaubte_werkzeuge: ['Read','Grep','Glob','Write','Edit'] }`
  - `scratch-f11-ws3/` vorher manuell (nicht vom Kindprozess) angelegt
    und git-ignoriert (`.gitignore`-Ergänzung dieser Aufgabe)

### Vorher/Nachher

- **Vorher:** `scratch-f11-ws3/` real leer (`ls` vor dem `POST` geprüft).
- **Nachher:** `scratch-f11-ws3/beweis-schreiblauf.txt` real entstanden,
  Inhalt exakt `F11_WS3_SCHREIBLAUF_PROBE` (real mit `cat` gelesen, kein
  Zusatztext, kein Zeilenumbruch-Anhängsel über den Editor hinaus).

### Rohereignisstrom (`kontrollzustand-roh/e2e-f11-ws3-schreibend-scratch-2026-09-06/rohstrom.json`, gitignoriert, lokal vorhanden)

- `werkzeugStartziel`: `["C:\\Program Files\\claude\\claude.exe"]`
- `exitCode`: `0`, `startfehler`: `null`
- `stdout` (geparst): `is_error: false`, `permission_denials: []` (der
  Kindprozess nutzte `Write` — im schreibenden Werkzeugsatz erlaubt,
  daher keine Verweigerung), `result`: "Datei erstellt:
  `scratch-f11-ws3/beweis-schreiblauf.txt` mit Inhalt
  `F11_WS3_SCHREIBLAUF_PROBE`."

### Realer LaufStatus (`GET /api/laeufe`, Endzustand)

```json
{
  "status": "ABGESCHLOSSEN",
  "ergebnis": "ERFOLGREICH",
  "terminalSequenz": 2,
  "runPreparedSequenz": 1,
  "terminaleOhneRunPrepared": []
}
```

Belegakte: `kontrollzustand/e2e-f11-ws3-schreibend-scratch-2026-09-06/`
(im Repo, nicht aufgeräumt). `scratch-f11-ws3/` selbst bleibt
git-ignoriert bestehen — realer Beleg, aber bewusst kein Produktzustand.

## Lauf (b2) — schreibend, echte getrackte Datei

**Nachtrag nach Reviewer-/QA-Pass:** beide Pässe (siehe
`features/F11/journal.md`) bewerteten die ursprüngliche Wahl unten
(diese Nachweisdatei selbst als Ziel) als formal ausreichend, aber
selbstbezüglich — eine eigens getrennte, dauerhaft getrackte Zieldatei
sei eindeutiger. Deshalb zusätzlich ein zweiter, unabhängiger
Schreiblauf gegen eine dedizierte, thematisch neutrale Datei
(`state/e2e-beleg-f11-ws3-b2.md`) nachgelegt — siehe Abschnitt
"Lauf (b2, Nachtrag)" unten. Der ursprüngliche Lauf gegen diese Datei
bleibt als zusätzlicher, ebenfalls real verifizierter Beleg stehen.

[EMPFEHLUNG, ursprünglich] Als Zieldatei für den zweiten, nicht-
wegwerfbaren Schreibnachweis wurde zunächst diese Nachweisdatei selbst
gewählt (`state/e2e-nachweis-f11-ws3.md`), statt einer thematisch
fremden Dokudatei: sie ist real getrackt (nach dieser ersten Version
über `git add` diesem Commit zugeordnet, kein Scratch-Pfad), bleibt
dauerhaft im Repo stehen (kein Wegwerf-Test) und vermeidet, dass ein
automatisch erzeugter Ein-Satz-Anhang eine fachlich fremde Dokudatei
(z. B. `state/gates.md` oder `features/F11/journal.md`) mit einem
isolierten, aus dem Zusammenhang gerissenen Satz verunreinigt. Der
Auftrag an den Kindprozess verlangte einen Anhang mit einem eindeutigen,
vorab von der bauenden Sitzung generierten UUID-Marker (Muster: der
UUID-Marker-Beleg aus AK3, `execution-controller.test.ts`) — die Zeile
unten wurde real vom Kindprozess geschrieben, nicht von der bauenden
Sitzung selbst:

<!-- F11-WS3-B2-MARKER -->
F11-WS3-B2-BELEG: 4ada3874-37ae-4d0f-86de-534801810ce8

### Realer Beleg des Anhangs (nicht die Selbstauskunft des Kindprozesses)

- **laufId:** `e2e-f11-ws3-schreibend-real-2026-09-06`
- **Startauftrag:** `anfragen: []`, `auftragstext` verlangte wörtlich das
  Einfügen der Zeile `F11-WS3-B2-BELEG: 4ada3874-37ae-4d0f-86de-534801810ce8`
  direkt nach der Marker-Zeile `<!-- F11-WS3-B2-MARKER -->` in genau
  dieser Datei, `werkzeugsatz`: `schreibend`.
- **`git diff` VOR/NACH dem Lauf** (maßgeblicher Beleg, nicht die
  `result`-Selbstauskunft des Kindprozesses):
  ```diff
  @@ -197,3 +197,4 @@ aus AK3, `execution-controller.test.ts`) — die Zeile unten wurde real
   vom Kindprozess geschrieben, nicht von der bauenden Sitzung selbst:

   <!-- F11-WS3-B2-MARKER -->
  +F11-WS3-B2-BELEG: 4ada3874-37ae-4d0f-86de-534801810ce8
  ```
  Genau eine neue Zeile, exakt der verlangte Wortlaut, keine sonstige
  Änderung an der Datei — real mit `git diff` gegen den zuvor über
  `git add` getrackten Stand geprüft.
- **Rohereignisstrom** (`kontrollzustand-roh/e2e-f11-ws3-schreibend-real-2026-09-06/rohstrom.json`,
  gitignoriert, lokal vorhanden): `exitCode: 0`, `startfehler: null`,
  `type: "result"`, `is_error: false`, `permission_denials: []` (der
  Kindprozess nutzte `Edit` — im schreibenden Werkzeugsatz erlaubt).
- **Realer LaufStatus** (`GET /api/laeufe`, Endzustand): `ABGESCHLOSSEN`/
  `ERFOLGREICH`, `terminalSequenz: 2`, `runPreparedSequenz: 1`,
  `terminaleOhneRunPrepared: []`.

Belegakte: `kontrollzustand/e2e-f11-ws3-schreibend-real-2026-09-06/` (im
Repo, nicht aufgeräumt).

### Lauf (b2, Nachtrag) — dedizierte, thematisch neutrale Zieldatei

Zieldatei: `state/e2e-beleg-f11-ws3-b2.md` (neu angelegt, trägt keinen
anderen Zweck als diesen Beleg — anders als der ursprüngliche Lauf oben
ist sie nicht zugleich das Dokument, das den Lauf beschreibt).

- **laufId:** `e2e-f11-ws3-schreibend-real-b2fix-2026-09-06`
- **Startauftrag:** `anfragen: []`, `auftragstext` verlangte wörtlich das
  Einfügen der Zeile `F11-WS3-B2-BELEG: f01bc8b5-fc38-44f5-b27f-d1313b68946b`
  direkt nach `<!-- F11-WS3-B2-MARKER -->` in `state/e2e-beleg-f11-ws3-b2.md`,
  `werkzeugsatz`: `schreibend`.
- **`git diff` VOR/NACH dem Lauf:**
  ```diff
  @@ -13,3 +13,4 @@ Die folgende Zeile wurde real von einem echten Claude-Code-Kindprozess
   `schreibend`) eingefügt, nicht von der bauenden Sitzung:

   <!-- F11-WS3-B2-MARKER -->
  +F11-WS3-B2-BELEG: f01bc8b5-fc38-44f5-b27f-d1313b68946b
  ```
- **Rohereignisstrom** (`kontrollzustand-roh/e2e-f11-ws3-schreibend-real-b2fix-2026-09-06/rohstrom.json`,
  gitignoriert, lokal vorhanden): `exitCode: 0`, `startfehler: null`,
  `is_error: false`, `permission_denials: []`.
- **Realer LaufStatus** (`GET /api/laeufe`, Endzustand): `ABGESCHLOSSEN`/
  `ERFOLGREICH`, `terminalSequenz: 2`, `runPreparedSequenz: 1`,
  `terminaleOhneRunPrepared: []`.

Belegakte: `kontrollzustand/e2e-f11-ws3-schreibend-real-b2fix-2026-09-06/`
(im Repo, nicht aufgeräumt).

## Einordnung

Beide von AK8 geforderten realen Läufe liefen über den echten Leitstand-
Schreibpfad (`POST /api/laeufe` → F8 `fuehreAufgabeDurch` → F5 → F6a →
F7 → F1B) mit einem echten Claude-Code-Kindprozess, jeweils
`ABGESCHLOSSEN`/`ERFOLGREICH`:

1. **Lesend (a):** `werkzeugsatz: 'lesend'` (nur `Read`/`Grep`/`Glob`),
   `permission_denials: []`, der Kindprozess beantwortete eine reale
   Frage zu einer vom Server selbst gelesenen Evidenzdatei korrekt
   (`"9"`, geprüft gegen den echten Dateiinhalt).
2. **Schreibend, Scratch (b1):** `werkzeugsatz: 'schreibend'`,
   `permission_denials: []`, der Kindprozess erzeugte real eine neue
   Datei in einem git-ignorierten Scratch-Pfad mit exakt dem verlangten
   Inhalt.
3. **Schreibend, echte Datei (b2):** derselbe Mechanismus zweimal real
   belegt — zuerst gegen diese Nachweisdatei selbst, danach (Reviewer-/
   QA-Nachtrag) gegen die eigens dafür angelegte, thematisch neutrale
   `state/e2e-beleg-f11-ws3-b2.md`. Beide `git diff`s zeigen genau die
   verlangte, mit einem vorab generierten UUID-Marker eindeutig
   identifizierbaren Zeile, kein Kollateralschaden an der übrigen Datei.

Unterwegs real gefunden und behoben: ein bisher unentdeckter
Konfigurationsfehler in `startvorlagen/beispielprojekt.json`
(`werkzeugStartziel` zeigte auf einen Pfad, der nicht zum committeten
Wirksamkeitsnachweis passt, E-188-Drift) — siehe Abschnitt "Echter
Blocker" oben und `state/findings.md` F-136. Ohne den Fix hätte AK8 nicht
real erbracht werden können; der Fix selbst ist eine reine
Konfigurationskorrektur, kein Eingriff in `src/` oder in die
Sicherheitsmechanik von F4.

**Ergebnis:** AK8 real erbracht — beide geforderten Läufe (lesend,
schreibend zweistufig) liefen real über den Leitstand, mit echtem
Kindprozess, belegt über Rohereignisstrom und tatsächlichen
Dateiinhalt/`git diff`, nie über die Selbstauskunft des Kindprozesses
allein.
