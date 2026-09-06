# E2E-Nachweis Meilenstein 1 (§13.1 zielfassung.md)

Realer, über den Leitstand (F10) ausgelöster Durchlauf der Kette
F5 → F6a → F7 → F1B mit einem echten Claude-Code-Kindprozess. Erste
Invocation von `fuehreAufgabeDurch` außerhalb von Tests (F-119).

Mechanik-Nachweis gemäß §13.1 — bewiesen wird die Mechanik, nicht
Qualitätsüberlegenheit.

## Lauf

- **laufId:** `e2e-referenzfeature-2026-09-06`
- **Zeitstempel:** 2026-09-06T09:57:49Z (RUN_PREPARED) bis
  2026-09-06T09:57:58Z (Terminalartefakt)
- **Profil:** `profiles/ai-workforce.json` (neu, Ein-Ebenen-Modell,
  gegen `schemas/profile.schema.json` validiert)
- **Server:** `npm run leitstand` real gestartet, Arbeitsverzeichnis
  `C:\Users\stefa\Projekte\ai-workforce`, Port 4173, danach real beendet

## Real verwendete Aufrufparameter

- `rolle`: `ausfuehrung`
- `anfragen`: genau eine, `pfad: docs/STATUS.md`, `notwendig: true`,
  Frage "Aktuelle Phase bestätigen"
- `budget`: `{ maxElemente: 5, maxBytes: 200000 }`
- `aufrufEingaben.modell`: `claude-sonnet-5`
- `aufrufEingaben.werkzeugsatz`: `{ modus: 'DEKLARIERT', erlaubte_werkzeuge: ['Read'] }`
  — kein Bash, kein Write, kein Edit (Stefans Entscheidung, Option A)
- `werkzeugStartziel`: `["C:\Program Files\claude\claude.exe"]` —
  absoluter Pfad zur echten Claude-Code-Executable (Symlink auf den
  npm-global-Installationsort, `.exe`, keine `.cmd`), bestand
  `pruefeStartziel` (F6a WS4)
- `werkzeugVersionDeklariert` / `berechtigungskontext`: real gegen den
  bestehenden Wirksamkeitsnachweis geprüft (externer Ordner, siehe
  `state/aktuelle-autorisierung.json` → Verweis auf
  `C:\Users\stefa\ai-workforce-autorisierung\`) — nicht selbst
  abgedruckt, nur referenziert. F4s `pruefeStartfreigabe` lieferte
  real `FREIGEGEBEN` (kein E-188-Drift, kein E-183-Abweichung).

## Realer LaufStatus (vollständiges JSON, `GET /api/laeufe`)

```json
{
  "laufId": "e2e-referenzfeature-2026-09-06",
  "checkpoints": [
    {
      "sequenz": 1,
      "zeitstempel": "2026-09-06T09:57:49.821Z",
      "gueltig": true,
      "typ": "wirkungsmarke",
      "wirkungsmarke": { "art": "run_prepared" }
    },
    {
      "sequenz": 2,
      "zeitstempel": "2026-09-06T09:57:58.740Z",
      "gueltig": true,
      "typ": "wirkungsmarke",
      "wirkungsmarke": { "art": "terminal", "ergebnis": "FEHLGESCHLAGEN" }
    }
  ],
  "laufStatus": {
    "status": "ABGESCHLOSSEN",
    "ergebnis": "FEHLGESCHLAGEN",
    "terminalSequenz": 2,
    "runPreparedSequenz": 1,
    "terminaleOhneRunPrepared": []
  }
}
```

Belegakte: `kontrollzustand/e2e-referenzfeature-2026-09-06/` (im Repo,
nicht aufgeräumt — realer Beleg, kein Testartefakt). Rohereignisstrom:
`kontrollzustand-roh/e2e-referenzfeature-2026-09-06/rohstrom.json`
(gitignoriert, lokal vorhanden).

## Einordnung des Ergebnisses

Die volle Kette lief real und mechanisch korrekt durch:

1. **F5** baute real ein Kontextpaket aus der einen Anfrage.
2. **F6a** konstruierte real die Aufruf-Tokens und prüfte real gegen
   F4 — `pruefeStartfreigabe` lieferte `FREIGEGEBEN`, kein Drift.
3. Ein **echter Kindprozess** wurde real über `execFile` mit der
   echten Claude-Code-Executable gestartet (keine Attrappe, kein
   Test-Starter) — die `RUN_PREPARED`-Wirkungsmarke belegt das.
4. **F7** klassifizierte real das Prozessergebnis.
5. **F1B** stellte real den Terminalzustand `ABGESCHLOSSEN` fest.

Das Prozessergebnis selbst ist `FEHLGESCHLAGEN`, weil der echte
Kindprozess ohne verwertbares Ergebnisobjekt endete (`exitCode: 1`,
kein `"type":"result"`-JSON). Ursache laut Rohereignisstrom: die
reale Claude-Code-CLI verlangt bei den von F6as `baueAufruf`
konstruierten Flags (`--output-format json` u. a.) zwingend einen
Prompt über stdin oder ein Positionsargument — `AufrufEingaben`
(`src/claude-code-gateway/types.ts`) sieht aktuell kein Feld für einen
Prompt-Text vor, das gebaute Kontextpaket wird dem Kindprozess nicht
als Prompt übergeben. Das ist eine reale, strukturelle Lücke in F6a
WS1, keine Sicherheitslücke: der Prozess endete vor jeder
Werkzeugnutzung (`permission_denials` nicht erreicht, keine Datei
gelesen oder geschrieben) — die SICHERHEIT-ZUERST-Vorgabe (nur Read,
kein Bash) wurde damit nicht einmal geprüft, weil der Prozess vorher
abbrach. Kein Grund zur Eskalation laut Auftrag (kein E-188-Drift,
absoluter Pfad vorhanden, kein Hinweis auf Mehr-als-Lesen) — bewusst
nicht selbst in `src/` behoben (außerhalb des Zuschnitts dieser
Aufgabe, "kein Eingriff in src/").

**Ergebnis:** Mechanik-Nachweis für §13.1 erbracht — die Kette
F5→F6a→F7→F1B lief real, mit echtem Kindprozess, echter F4-Prüfung und
echter Klassifikation. Der inhaltliche Erfolg des Kindprozesses
(`ERFOLGREICH`) ist damit noch nicht belegt; das ist eine separate,
neue offene Frage (Prompt-Übergabe an den Kindprozess in F6a), kein
Rückschlag für die hier geprüfte Mechanik.

## Nachlauf nach F-124-Fix — realer ERFOLGREICH-Beleg

- **laufId:** `e2e-referenzfeature-2026-09-06-f124-nachlauf`
- **Zeitstempel:** 2026-09-06T10:49:31.992Z (RUN_PREPARED) bis
  2026-09-06T10:50:02.317Z (Terminalartefakt)
- **Fix:** `1a304fd fix(f6a,f8): F-124 Prompt-Uebergabe an
  Claude-Code-Kindprozess (#80)`, auf `main` gemergt. Identischer Aufbau
  wie oben (gleiches Profil `profiles/ai-workforce.json`, gleiche Anfrage
  `docs/STATUS.md`, gleiches Budget, gleiche `werkzeugsatz`-Beschränkung
  auf `Read`, gleiches `werkzeugStartziel`), nur neue `laufId`.
- **Server:** `npm run leitstand` real gestartet
  (`C:\Users\stefa\Projekte\ai-workforce`, Port 4173), Startauftrag über
  `POST /api/laeufe` ausgelöst, Terminalzustand über `GET /api/laeufe`
  abgewartet, Server danach real beendet.

### Realer LaufStatus (vollständiges JSON, `GET /api/laeufe`)

```json
{
  "laufId": "e2e-referenzfeature-2026-09-06-f124-nachlauf",
  "checkpoints": [
    {
      "sequenz": 1,
      "zeitstempel": "2026-09-06T10:49:31.992Z",
      "gueltig": true,
      "typ": "wirkungsmarke",
      "wirkungsmarke": { "art": "run_prepared" }
    },
    {
      "sequenz": 2,
      "zeitstempel": "2026-09-06T10:50:02.317Z",
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

### Reale Laufakte (`LAUFAKTE_V0`, vollständig im Wortlaut)

```json
{
  "arbeitsverzeichnis_pfad": "C:\\Users\\stefa\\Projekte\\ai-workforce",
  "beobachtungsbasis_vollstaendig": true,
  "berechtigungskontext": "profil-standard",
  "erstellt_am": "2026-09-06T10:50:02.286Z",
  "lauf_id": "e2e-referenzfeature-2026-09-06-f124-nachlauf",
  "laufakte_schema": "v0",
  "modell_beobachtet": "claude-sonnet-5",
  "rohstrom_referenz": {
    "inhalts_hash": "bef65c7b342e2e1a6fb098813fa3ac6b4bffc2a6648cc8cd05107bc777ec7b57",
    "pfad": "kontrollzustand-roh\\e2e-referenzfeature-2026-09-06-f124-nachlauf\\rohstrom.json"
  },
  "werkzeug_version_deklariert": "2.1.258 (Claude Code)"
}
```

Rohereignisstrom (`kontrollzustand-roh/e2e-referenzfeature-2026-09-06-
f124-nachlauf/rohstrom.json`, gitignoriert, lokal vorhanden):
`exitCode: 0`, `type: "result"`, `is_error: false`, `permission_denials:
[]` (kein einziger Genehmigungsverweigerungsversuch — die
`Read`-Beschränkung wurde nicht einmal geprüft, weil der Kindprozess sie
nie zu überschreiten versuchte), `modelUsage`-Schlüssel genau
`claude-sonnet-5`. Der Kindprozess las real `docs/STATUS.md` über das
`Read`-Werkzeug und bestätigte im `result`-Text die aktuelle Phase
("Meilenstein 1 ist in Arbeit").

Belegakte: `kontrollzustand/e2e-referenzfeature-2026-09-06-f124-nachlauf/`
(im Repo, nicht aufgeräumt — realer Beleg, kein Testartefakt, wie beim
ersten Lauf). Der ursprüngliche Lauf (`e2e-referenzfeature-2026-09-06`)
bleibt unverändert stehen — beide Läufe sind Belege, keiner wird
überschrieben.

### Einordnung

Die volle Kette lief real und mechanisch korrekt durch, und diesmal auch
inhaltlich erfolgreich:

1. **F5** baute real ein Kontextpaket aus der einen Anfrage.
2. **F6a** konstruierte real die Aufruf-Tokens — jetzt inklusive `-p`
   mit dem aus dem Kontextpaket gebauten Prompttext (F-124-Fix) — und
   prüfte real gegen F4 (`FREIGEGEBEN`).
3. Ein **echter Kindprozess** wurde real gestartet, nutzte real das
   `Read`-Werkzeug (einziges erlaubtes Werkzeug) und beendete sich mit
   `exitCode 0` und einem validen `"type":"result"`-Objekt.
4. **F7** klassifizierte das Ergebnis real als `ERFOLGREICH`
   (`is_error: false`, kein `permission_denials`-Eintrag).
5. **F1B** stellte real den Terminalzustand `ABGESCHLOSSEN` mit
   `ergebnis: "ERFOLGREICH"` fest.

**Ergebnis:** Realer ERFOLGREICH-Beleg für §13.1 erbracht. Der
F-124-Fix (PR #80) behebt die Prompt-Übergabe-Lücke nachweislich — die
Kette F5→F6a→F7→F1B läuft jetzt mit einem echten Claude-Code-
Kindprozess vollständig und inhaltlich erfolgreich durch. Meilenstein 1
gilt damit als erbracht (siehe `docs/STATUS.md`, `state/findings.md`
F-124).
