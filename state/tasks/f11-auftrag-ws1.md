SCHRITT 0: Arbeitsverzeichnis ausgeben und gegen das im Auftrag genannte Zielverzeichnis prüfen. Bei Abweichung: abbrechen, melden, nichts ändern.

Zielverzeichnis: `C:\Users\stefa\Projekte\ai-workforce`, ein von `main`
abgeleiteter Feature-Branch `feat/f11-ws1-auftragsartefakt`. `main` muss vor
Branch-Erzeugung frisch synchronisiert sein (`git fetch` + Stand prüfen).

**Vorrangregel dieses Vertrags (F-104-Muster):** Findest du einen
Widerspruch zwischen diesem Vertrag, `state/plan-v1-f11-auftrag-ws1.md`,
`features/F11/feature.md` und dem realen Code — **anhalten, beide Stellen
wörtlich zitieren, melden**. Nicht selbst auflösen, nicht im Test umgehen.

**Vier vorab entschiedene offene Fragen (Stefan, vor diesem Vertrag):**
1. Option B für den `leitstand-server.mjs`-Konflikt (plan Abschnitt 2.4/D7)
   — `leitstand-server.mjs` UND `check-f10-leitstand.mjs` werden in WS-1
   mitgeändert.
2. Trennzeichen `===` (plan Abschnitt 2.3/D3) — wörtlich übernehmen.
3. `scripts/check-f11-auftrag.mjs` wird bereits in WS-1 angelegt (plan D6),
   WS-1-Teilumfang (AK3-Grep + Selbsttest), in `npm run check` eingehängt.
4. `auftrag_id`-Zeichenregel: kein eigener Regelsatz (D5, erbt F1s
   `pruefeLaufId` über die `lineage-auftrag-<auftragId>`-Kette). Nicht
   anfassen.

## TASK: f11-auftrag-ws1

GOAL: Ein Auftrag lässt sich mit `titel`/`auftragstext` als eigenständiges
AUFTRAG_V0-Kernartefakt unter `auftrag-<auftragId>` registrieren (AK1).
`fuehreAufgabeDurch` verlangt `auftragstext` als Pflichtfeld und baut daraus
einen eigenen, vom Evidenzteil sichtbar getrennten Prompt-Abschnitt (AK2).
Ein Grep-Gate und ein Laufzeit-Test belegen mechanisch, dass `auftragstext`
nie ein Kontextpaket-Element wird und die Kontextpaket-Elementanzahl vom
Auftragstext-Wert unbeeinflusst bleibt (AK3). `scripts/check-f11-auftrag.mjs`
existiert, ist in `npm run check`/`check:template` eingehängt. Kein Eingriff
in F6as `starteGateway`/`GatewayEingaben`, in `public/leitstand/`, oder in
AK4-9. `npm run check` grün. Feature-Akte, Journal, Gates-Eintrag
aktualisiert. WS-2/WS-3 bleiben offen — Status wechselt auf `IN_ARBEIT`,
nicht `ABGESCHLOSSEN`.

CONTEXT:

- [Fakt] Vollständige Herleitung, Design-Entscheidungen und Verifikation:
  `state/plan-v1-f11-auftrag-ws1.md` (Advisor-freigegeben mit Hinweisen,
  siehe `71cf0c7`) — bindend für Feldnamen, Reihenfolge und Testfall-Form,
  soweit dieser Vertrag nicht abweicht (dann gilt dieser Vertrag, bei
  Widerspruch: Vorrangregel oben). Abschnitt 0 des Plans zitiert alle
  relevanten Fundstellen bereits mit Zeilennummern — hier nur, was für den
  Bau zusätzlich präzisiert wird.
- [Fakt, real gelesen] `src/context-builder/index.ts` ist das Referenz-
  Muster für D1 (eigenständiges Modul, ruft F2 nur von außen auf) UND für
  den `validiereXDaten`-Stil (Zeilen 270-302: reine Funktion, `erlaubt`-Set,
  `additionalProperties: false`-Meldungstext wörtlich). `src/auftrag/`
  übernimmt exakt diesen Stil, keinen eigenen.
- [Fakt, real gelesen] `registriereKernArtefakt` (`src/lineage-registry/
  index.ts:85-114`): `(artefaktId, profilReferenz, herkunft, daten,
  eingaben?, optionen?) → { pfad, versionSequenz, inhaltsHash }`. `eingaben`
  Default `[]`, wenn `undefined` übergeben — für den Auftrag explizit `[]`
  übergeben (D2, kein Undefined-Verlass).
- [Fakt, real gelesen] `AusfuehrungsEingaben` (`src/execution-controller/
  types.ts:56-66`): sieben Pflichtfelder plus optionales
  `vorgaengerLaufId`. `auftragstext: string` wird das achte Pflichtfeld,
  eingefügt vor `vorgaengerLaufId?`.
- [Fakt, real gelesen] `fuehreAufgabeDurch` (`src/execution-controller/
  index.ts:145-154`): heutige Zeile 153 `const promptText =
  bauePromptAusKontextpaket(kontextpaketErgebnis.paket, anfragen)` wird
  ersetzt (SCOPE Punkt 3 unten). `bauePromptAusKontextpaket` selbst
  (Zeilen 90-104) bleibt **unverändert** — sie baut weiterhin nur den
  Evidenzteil aus `paket.elemente`, F-124-Vertrag bleibt korrekt.
- [Fakt, real gelesen] `scripts/leitstand-server.mjs:207-308`:
  `VERBOTENE_OPTIONEN_FELDER` (Zeile 208), `ERLAUBTE_STARTAUFTRAG_FELDER`
  (Zeile 219), `PFLICHT_STARTAUFTRAG_FELDER` (Zeile 235),
  `pruefeStartauftrag`s Rückgabeobjekt (Zeilen 293-307, `eingaben: {...}`).
  Kein Feld dort bekommt heute einen eigenen Typ-Check über die
  Existenzprüfung hinaus außer `laufId`/`profilReferenz`/
  `werkzeugStartziel`/`vorgaengerLaufId` — `auftragstext` bekommt aus
  Konsistenz **keinen** zusätzlichen Typ-Check, nur Existenz (Pflichtfeld)
  plus Aufnahme in `eingaben`.
- [Fakt, real gelesen] `scripts/check-f10-leitstand.mjs:72-82`:
  `gueltigerStartauftrag(laufId)` ist die einzige Fixture-Fabrik, von der
  jeder Testfall der Datei ableitet — ein neues Pflichtfeld dort erfordert
  genau eine Änderung.
- [Fakt, real gelesen] `src/execution-controller/execution-controller.
  test.ts:119-129`: `gueltigeEingaben(uebrigeFelder)` ist die einzige
  Fixture-Fabrik, alle Aufrufstellen leiten von ihr ab (Muster wie
  `gueltigerStartauftrag`). `PROFIL_REFERENZ`/`KONTROLLZUSTAND_BASIS`
  Konstanten Zeile 92-94. `startfreigabeOptionen()` (Zeile 220-226) plus
  `ISTUEBRIGEFELDER_FIXTURE` (Zeile 171-176) sind die real bereits
  gebauten F4-Fixtures — für neue AK2/AK3(b)-Tests **wiederverwenden**,
  nicht neu bauen (D5, gleiche Baustelle wie AK1/AK2-Grün-Durchlauf-Test
  Zeile 230-262). `attrappeMitValidemErgebnis` ist bereits importiert
  (Zeile 79) und liefert einen echten `starteGateway`-Grün-Durchlauf ohne
  echten Kindprozess.
- [Fakt, real gelesen] `bauePromptAusKontextpaket` mit genau einer
  akzeptierten Anfrage (`gueltigeEingaben`s `anfragen`-Fixture, Zeile 122:
  `{ pfad: 'test/anfrage.md', frage: 'Testfrage', begruendung:
  'Testbegruendung', inhalt: 'Testinhalt', notwendig: true }`) liefert
  wörtlich `"Pfad: test/anfrage.md\nFrage: Testfrage\nBegründung:
  Testbegruendung\nInhalt:\nTestinhalt"` (ein Element, kein `join`-
  Trenner nötig) — Grundlage für die exakte `promptText`-Erwartung im
  AK2-Test unten.
- [Fakt, real gelesen] `schemas/kontrollzustand-kontextpaket-payload.
  schema.json` ist das Schema-Muster: `additionalProperties: false`,
  `required` = alle Felder, `const "v0"` für den Schema-Diskriminator,
  `{"type":"string","minLength":1}` für die übrigen. `schemas/kontrollzustand-
  auftrag-payload.schema.json` übernimmt dieses Muster 1:1 für die fünf
  AUFTRAG_V0-Felder.
- [Fakt] `package.json`s `check`/`check:template`-Skripte hängen jedes
  Feature-Gate nach demselben Muster ein (`&& node scripts/check-fN-
  *.mjs`), zuletzt `check-f10-leitstand.mjs`. `check-f11-auftrag.mjs` wird
  direkt danach eingehängt, in beiden Skripten.
- [Fakt] `docs/STATUS.md` listet F11 aktuell nur unter „Meilenstein 2 — in
  Arbeit" als Stichpunkt, kein eigener Absatz wie F1-F10. Dieser Vertrag
  fügt **keinen** neuen STATUS.md-Absatz hinzu (WS-1 ist nur ein Drittel
  von F11, ein Absatz entstünde erst mit dem F11-Abschluss, Muster F8/
  F10) — nur `features/F11/feature.md`s `Status`-Feld wechselt auf
  `IN_ARBEIT` und `features/F11/journal.md` bekommt einen Nachtrag.

SCOPE:

1. **`src/auftrag/types.ts`** (neu):
   ```ts
   export interface Optionen {
     basisVerzeichnis?: string
     schreiber?: Schreiber
   }
   export interface AuftragV0Daten {
     auftrag_schema: 'v0'
     auftrag_id: string
     titel: string
     auftragstext: string
     erstellt_am: string
   }
   export type Ereignisname = 'auftrag_registriert'
   export interface Ereignis {
     ereignis: Ereignisname
     zeitstempel: string
     auftrag_id?: string
     versionSequenz?: number
   }
   export type Schreiber = (ereignis: Ereignis) => void
   ```
   Dateikopf-Kommentar im Muster `context-builder/types.ts` (Zweck, Bezug
   zu `schemas/kontrollzustand-auftrag-payload.schema.json`).

2. **`src/auftrag/index.ts`** (neu), Muster `context-builder/index.ts`:
   - `import { registriereKernArtefakt } from '../lineage-registry/index.ts'`,
     `import type { ProfilReferenz } from '../checkpoint-store/types.ts'`.
   - `jetzt()`, `standardSchreiber`, `stillerLineageSchreiber` (Muster
     `context-builder/index.ts:33-44`, letztere unterdrückt F2s eigene
     `lineage_*`-Ereignisse).
   - `function auftragArtefaktId(auftragId: string): string { return
     'auftrag-' + auftragId }`.
   - `registriereAuftrag(auftragId, profilReferenz, titel, auftragstext,
     optionen = {})`: baut `AuftragV0Daten` mit `auftrag_schema: 'v0'`,
     ruft `registriereKernArtefakt(auftragArtefaktId(auftragId),
     profilReferenz, { quelle: 'auftrag' }, daten, [], lineageOptionen)`
     (leeres `eingaben`-Array explizit, D2), schreibt Ereignis
     `auftrag_registriert`, gibt `{ pfad, versionSequenz, inhaltsHash }`
     zurück.
   - `validiereAuftragDaten(daten: unknown): string[]` — exportierte,
     reine Funktion nach dem `validiereKontextpaketDaten`-Muster (CONTEXT):
     `erlaubt`-Set der fünf Felder, `auftrag_schema !== 'v0'`-Check,
     nicht-leere Strings für die übrigen vier.

3. **`schemas/kontrollzustand-auftrag-payload.schema.json`** (neu), Muster
   `kontrollzustand-kontextpaket-payload.schema.json` (CONTEXT):
   `additionalProperties: false`, `required` = alle fünf Felder,
   `auftrag_schema: {"const":"v0"}`, übrige vier
   `{"type":"string","minLength":1}`.

4. **`schemas/examples/`** (neu, mindestens drei Dateien):
   - `kontrollzustand-auftrag.valid.json` — gültiges AUFTRAG_V0.
   - `kontrollzustand-auftrag.invalid-falscher-schema-wert.json` —
     `auftrag_schema: "v1"`.
   - `kontrollzustand-auftrag.invalid-leerer-auftragstext.json` —
     `auftragstext: ""`.

5. **`src/auftrag/auftrag.test.ts`** (neu, ein fokussierter `node:test`-
   Fall): `registriereAuftrag` mit Test-`profilReferenz` aufrufen, danach
   `ladeArtefaktVersion('auftrag-' + auftragId, undefined, { basisVerzeichnis:
   ... })` — assert: `daten.auftrag_id === auftragId`,
   `daten.auftragstext` === übergebener Wert, `eingaben.length === 0`,
   `erzeugungsart === 'kern'`. `basisVerzeichnis: 'kontrollzustand-test'`
   (Repo-Konvention), Aufräumen im `finally` (Muster
   `context-builder.test.ts`/`raeumeAuf`).

6. **`src/execution-controller/types.ts`**: `auftragstext: string` als
   neues Pflichtfeld in `AusfuehrungsEingaben`, direkt vor
   `vorgaengerLaufId?`, mit Kommentar-Verweis auf plan-v1 Abschnitt 2.3
   und AK2.

7. **`src/execution-controller/index.ts`**:
   - Zeile 153 (`const promptText = bauePromptAusKontextpaket(...)`)
     ersetzen durch:
     ```ts
     const evidenzText = bauePromptAusKontextpaket(kontextpaketErgebnis.paket, anfragen)
     const promptText = evidenzText.length === 0
       ? `Auftrag:\n${eingaben.auftragstext}`
       : `Auftrag:\n${eingaben.auftragstext}\n\n===\n\n${evidenzText}`
     ```
   - `bauePromptAusKontextpaket` selbst NICHT ändern.
   - Dateikopf um F11 WS-1 ergänzen (Muster WS-2b-Nachtrag im selben
     Kopfkommentar).

8. **`src/execution-controller/execution-controller.test.ts`**:
   - `gueltigeEingaben` bekommt `auftragstext: 'Testauftrag'` im
     zurückgegebenen Objekt (eine Änderung, alle Aufrufstellen erben sie).
   - **Neuer Test AK2 (getrennter Prompt-Abschnitt):** `spyStarter`
     (Muster Zeile 269-273) erfasst `tokens`; `fuehreAufgabeDurch` mit
     `{ ...gueltigeEingaben(ISTUEBRIGEFELDER_FIXTURE), auftragstext:
     'Testauftragstext' }`, `startfreigabeOptionen()`,
     `basisVerzeichnis: KONTROLLZUSTAND_BASIS`, `starter: spyStarter`.
     Danach: `tokens` enthält `'-p'` gefolgt vom Token
     `` `Auftrag:\nTestauftragstext\n\n===\n\nPfad: test/anfrage.md\nFrage: Testfrage\nBegründung: Testbegruendung\nInhalt:\nTestinhalt` ``
     (CONTEXT, exakter erwarteter Wert). `raeumeKette` danach.
   - **Neuer Test AK2 (leeres Kontextpaket):** dieselbe Eingaben-Fixture
     mit `anfragen: []`. Danach: Prompt-Token exakt
     `` `Auftrag:\nTestauftragstext` `` — kein `===`, kein Evidenzabschnitt.
   - **Neuer Test AK3(b) (Laufzeit-Nachweis):** zwei `fuehreAufgabeDurch`-
     Läufe mit identischen `anfragen`/`budget`, aber verschiedenem
     `auftragstext` (einer davon mit UUID-Fragment als Marke, z. B.
     `` `MARKE-${randomUUID()}` ``), unterschiedliche `laufId`s. Nach
     jedem Lauf: `ladeArtefaktVersion('kontextpaket-' + laufId)`. Assert:
     (1) `!kanonischesJson(version.daten).includes(marke)` für den Lauf
     mit der Marke; (2) beide Läufe liefern identisches
     `version.daten.elemente.length`. `raeumeKette` für beide `laufId`s.
   - Alle neuen Tests räumen im `finally` auf, Test-`laufId`-Präfixe ≤4
     Zeichen wo neu vergeben (F-109).

9. **`scripts/check-f11-auftrag.mjs`** (neu), WS-1-Teilumfang:
   - **(a) Schema-Fixtures:** die drei `schemas/examples/kontrollzustand-
     auftrag*.json`-Dateien gegen `validiereAuftragDaten` (importiert aus
     `../src/auftrag/index.ts`), Muster `check-f5-context-builder.mjs`
     Abschnitt (a).
   - **(b) AK3-Grep + Selbsttest** (Muster `check-f8-execution-
     controller.mjs`, D4): Datei `src/execution-controller/index.ts`
     einlesen; Marker-String `'const kontextpaketErgebnis = baueKontextpaket('`
     suchen (Befund, falls nicht gefunden — Marker verschoben); Inhalt an
     dieser Stelle in `vorAufruf`/`abAufruf` teilen. Befund, wenn
     `/auftragstext/.test(vorAufruf)` (Bezeichner taucht vor dem
     `baueKontextpaket`-Aufruf auf — würde in die Anfragenliste
     durchsickern). Zusätzlicher Befund, wenn `!/auftragstext/.test(abAufruf)`
     (Bezeichner taucht im Prompt-Zusammensetzungsteil gar nicht auf —
     Gate wäre vakuum). Selbsttest: synthetischer String mit
     `auftragstext` VOR einem eingebetteten `'const kontextpaketErgebnis
     = baueKontextpaket('`-Marker, gegen dieselbe Teilungslogik geprüft —
     muss als Verstoß erkannt werden, sonst Befund „Selbsttest wirkungslos".
   - Ergebnisformat (Befunde-Array, `✓`/`✗`-Ausgabe, Exit 0/1) exakt wie
     `check-f8-execution-controller.mjs`.

10. **`scripts/leitstand-server.mjs`** (Option B, Stefan-Entscheidung):
    - `ERLAUBTE_STARTAUFTRAG_FELDER`: `'auftragstext'` ergänzen.
    - `PFLICHT_STARTAUFTRAG_FELDER`: `'auftragstext'` ergänzen.
    - `pruefeStartauftrag`s `eingaben`-Rückgabeobjekt: `auftragstext:
      body.auftragstext,` ergänzen (kein zusätzlicher Typ-Check, CONTEXT).
    - Dateikopf-Kommentar um den F11-WS-1-Bezug ergänzen (ein Satz).

11. **`scripts/check-f10-leitstand.mjs`**:
    - `gueltigerStartauftrag(laufId)`: `auftragstext: 'Testauftrag'`
      ergänzen.
    - Neuer Testfall: Body ohne `auftragstext` (restliche Felder aus
      `gueltigerStartauftrag` mit `delete`/Objekt-Destrukturierung ohne
      dieses Feld) → POST erwartet Status 400 mit `grund` enthält
      `"Pflichtfeld 'auftragstext' fehlt"`. Eigener Testserver-Block wie
      die bestehenden AK3/AK5/AK6-Abschnitte.

12. **`package.json`**: `&& node scripts/check-f11-auftrag.mjs` nach
    `check-f10-leitstand.mjs` in **beiden** Skripten (`check`,
    `check:template`) einhängen, vor `&& npm run test` im `check`-Skript.

13. **`features/F11/feature.md`**: `Status:` von `READY_FOR_TECH` auf
    `IN_ARBEIT`.

14. **`features/F11/journal.md`**: Nachtrag mit Datum, WS-1-Umfang
    (AK1/AK2/AK3 umgesetzt, Option B für den Server-Konflikt gewählt,
    `===`-Trennzeichen, `check-f11-auftrag.mjs` ab WS-1), Verweis auf
    `state/plan-v1-f11-auftrag-ws1.md` und diesen Vertrag, real gelaufene
    Prüfkette (Befehl + Ergebniszeile).

15. **`state/gates.md`**: neue Tabellenzeile „F11-Auftrag-Gate" (vor
    `## Kalibrierungs-Log`, Zeile ~37 aktuell — Zeilennummer kann sich
    verschoben haben, am Marker orientieren) nach dem etablierten
    Tabellenformat (Gate | Datei | Prüft | Rot-Fall | Grün-Fall), plus ein
    neuer datierter Nachtrag im `## Kalibrierungs-Log`-Abschnitt am
    Dateiende mit den real ausgeführten Rot-/Grün-Fall-Belegen (echte
    Befehle + Ausgabe, Muster der bestehenden Einträge — siehe F5-/F8-
    Zeilen als Vorbild für Ton und Detailgrad).

NICHT:

- **AK4-9** (Startvorlage, erweiterte Body-Sperre, Evidenzdateien-Lesen,
  D13-Sperre, reale Nachweisläufe, Gate-Vollumfang) — WS-2/WS-3.
- **Lauf→Auftrag-Lineage-Mechanismus** — an WS-2 delegiert (plan Abschnitt
  2.2/D5). Der Auftrag bleibt nach WS-1 unreferenziert von jeder Laufakte.
- **`public/leitstand/`** — keine Oberfläche zur Auftragsanlage.
- **Änderung an F6a** (`starteGateway`, `GatewayEingaben`) — bewusst
  ausgeschlossen (plan Abschnitt 2.2).
- **`baueAufruf`** — unverändert.
- **AK4-7-Felder in `scripts/leitstand-server.mjs`** (Startvorlage,
  Werkzeugsätze, D13) — nur die hier benannte Ein-Feld-Ergänzung.
- **Eigener Zeichenregel-Check für `auftrag_id`** — kein neuer Code (D5,
  offene Frage 4).
- **`docs/STATUS.md`-Absatz für F11** — entsteht erst mit F11-Abschluss
  (Muster F8/F10), nicht mit WS-1 (CONTEXT).
- **Statuswechsel auf `ABGESCHLOSSEN`** — WS-2/WS-3 stehen noch aus,
  `Status: IN_ARBEIT` ist der korrekte Zwischenstand.

FOLGT: WS-2 (`state/tasks/f11-auftrag-ws2.md`, noch nicht geschrieben) —
Startvorlage, erweiterte Body-Sperre, Evidenzdateien-Lesen, D13-Sperre,
Gate-Vollumfang (AK4-7, AK9). Eigener Vertrag nach Abschluss dieses hier.

BUDGET: Ein Baudurchgang plus höchstens eine Korrekturrunde
(`CLAUDE.md`-Zuschnitt-Heuristik; Plan Abschnitt 7 bestätigt diesen
Zuschnitt explizit für den Fall, dass Option B gewählt wird — hier der
Fall). Zweites Rot auf demselben Gate ⇒ BLOCKIERT ⇒ Mensch.

OUTPUT:

- Neue Dateien: `src/auftrag/index.ts`, `src/auftrag/types.ts`,
  `src/auftrag/auftrag.test.ts`, `schemas/kontrollzustand-auftrag-
  payload.schema.json`, `schemas/examples/kontrollzustand-auftrag.valid.
  json`, `schemas/examples/kontrollzustand-auftrag.invalid-falscher-
  schema-wert.json`, `schemas/examples/kontrollzustand-auftrag.invalid-
  leerer-auftragstext.json`, `scripts/check-f11-auftrag.mjs`.
- Geänderte Dateien: `src/execution-controller/{index,types}.ts`,
  `src/execution-controller/execution-controller.test.ts`,
  `scripts/leitstand-server.mjs`, `scripts/check-f10-leitstand.mjs`,
  `package.json`, `features/F11/feature.md`, `features/F11/journal.md`,
  `state/gates.md`.
- Beleg: `npm run check:template` und `npm run check` grün, vollständige
  Konsolenausgabe (inkl. Testzahl `tests N, pass N, fail 0`) im Bericht
  zeigen.
- Commit ausschließlich mit expliziten Pfaden (nie `-A`/`.`), `git-flow`-
  Skill nutzen, kein Commit ohne frische `state/freigabe-commit.md`, Push
  und PR-Erstellung gegen `main` nach Freigabe.
- Bericht (knapp): was geändert wurde, welche Checks/Tests liefen, Exit-
  Codes, Bestätigung Statuswechsel `IN_ARBEIT`, echte Blocker.

ESCALATE:

- Widerspruch zwischen diesem Vertrag, `state/plan-v1-f11-auftrag-ws1.md`,
  `features/F11/feature.md` und realem Code → anhalten, beide Stellen
  zitieren, melden.
- Eine reale Signatur (`registriereKernArtefakt`, `AusfuehrungsEingaben`,
  `pruefeStartauftrag`) weicht von den in CONTEXT zitierten Ständen ab →
  anhalten, Fundstelle zitieren, melden.
- Der AK3-Grep-Selbsttest erkennt den simulierten Verstoß NICHT →
  anhalten, melden, nicht das Muster so lange anpassen, bis irgendein
  Treffer entsteht.
- `npm run check` wird an einem Glied rot, das dieser Auftrag nicht
  angefasst hat → anhalten und melden.
- `git commit`/`git push` wird ohne frische Freigabedatei verlangt →
  nicht ausführen.

Vertrag endet mit Freigabe-Halt: kein Bau, kein Commit, kein Push in
diesem Schritt. Ausführung erst nach Stefans expliziter Freigabe.
