# Plan v1 — Feature F11 WS-1: Auftragsartefakt, Auftragstext, Trennung von Auftrag/Evidenz

Slug: f11-auftrag-ws1
Stand: 2026-09-06
Rolle: Planner (Claude-Code-Sitzung, Repo-Zugriff)
Grundlage: `features/F11/feature.md` (Status READY_FOR_TECH, AK1/AK2/AK3,
Workstream-Liste WS-1/WS-2/WS-3), `docs/projekt/zielfassung.md` §13.3
(Meilenstein 2, E-M2-1/E-M2-2), §16.2/§16.3/§16.8.

Kein Bau in diesem Schritt. Kein Advisor-Pass in diesem Schritt.

## 0. Verifikation (F-013-Muster — nicht annehmen, prüfen)

Alle folgenden Aussagen real aus dem Repo gelesen, nicht aus `feature.md`s
Prosa übernommen:

- **`scripts/check-datenformate.mjs`** (vollständig gelesen) — prüft
  ausschließlich (a) dass `schemas/profile.schema.json` und
  `schemas/kontrollzustand.schema.json` gültiges JSON sind, (b)/(c) die
  vier `kontrollzustand.*`- und zwei `profile.*`-Beispiele gegen zwei
  handgeschriebene Funktionen `validiereProfil`/`validiereKontrollzustand`
  (reine Hüllenprüfung: `schema_version`, `typ`, `profil_referenz` — nie
  `payload.daten.daten`), (d) reale Dateien unter `profiles/*.json` und
  `kontrollzustand/*.json`/`*.jsonl`, ebenfalls nur gegen dieselben zwei
  Hüllenfunktionen. **Keine einzige `kontrollzustand-*-payload.schema.json`
  wird in dieser Datei referenziert** — weder die für Kontextpaket noch die
  für Laufakte. Das widerlegt AK1s wörtlichen Text („geprüft von
  `scripts/check-datenformate.mjs`") als Architekturbeschreibung — siehe
  Abschnitt 2.6.
- **`scripts/check-f5-context-builder.mjs:34-55`** und
  **`scripts/check-f6a-claude-code-gateway.mjs:120-138`** — beide
  validieren ihre jeweilige Payload (`kontrollzustand-kontextpaket-*`,
  `kontrollzustand-laufakte-*`) über eine modul-eigene, exportierte
  `validiereXDaten`-Funktion plus `schemas/examples/*.valid.json`/
  `*.invalid-*.json` — **im eigenen, modulzugehörigen Gate-Skript**, nicht
  in `check-datenformate.mjs`. Das ist der reale, zweifach bestätigte
  Präzedenzfall für AUFTRAG_V0.
- **`src/lineage-registry/index.ts:85-114`** (`registriereKernArtefakt`) —
  `(artefaktId, profilReferenz, herkunft, daten, eingaben?, optionen?) →
  { pfad, versionSequenz, inhaltsHash }`. Schreibt über F1s
  `schreibeCheckpoint` unter `lauf_id = 'lineage-' + artefaktId`, mit
  unterdrücktem F1-Ereignis (`stillerCheckpointSchreiber`) und eigenem
  `lineage_registriert`-Ereignis. Kein eigener Dateibaum unter
  `kontrollzustand/` — bestätigt AK1s „bestehende F1-Hash-Kette wird
  genutzt".
- **`src/context-builder/index.ts:80-210`** (`baueKontextpaket`) —
  vollständig gelesen. Prompt-relevanter Fakt: `Anfrage.inhalt` ist ein vom
  Aufrufer direkt gelieferter String (`types.ts:20`), keine
  Datei-Lesefunktion. `elemente` wird unverändert als `eingaben` an
  `registriereKernArtefakt` durchgereicht (`index.ts:185-206`).
- **`src/execution-controller/index.ts:90-104`**
  (`bauePromptAusKontextpaket`) und **`:118-218`** (`fuehreAufgabeDurch`) —
  vollständig gelesen. Der Prompt entsteht heute **ausschließlich** aus
  `kontextpaketErgebnis.paket.elemente`, verbunden mit `'\n\n---\n\n'`. Bei
  leerem `elemente`-Array liefert `Array.prototype.join` auf einem leeren
  Array einen leeren String — kein Sonderfall im heutigen Code, weil es
  noch keinen zweiten Abschnitt gibt, der davon abhinge.
- **`src/execution-controller/types.ts:56-66`** (`AusfuehrungsEingaben`) —
  sechs Pflichtfelder (`rolle`, `anfragen`, `budget`, `aufrufEingaben`,
  `werkzeugStartziel`, `werkzeugVersionDeklariert`,
  `berechtigungskontext` — sieben, nicht sechs) plus optionales
  `vorgaengerLaufId`. Kein `auftragstext`-Feld.
- **`src/claude-code-gateway/index.ts:145-147, 317-330`**
  (`laufakteArtefaktId`, `registriereKernArtefakt`-Aufruf in
  `starteGateway`) — die Laufakte wird von F6a **selbst** registriert, mit
  `eingaben` **hartkodiert als `[]`** (Zeile 328, literales leeres Array,
  kein durchgereichter Parameter). `GatewayEingaben`
  (`claude-code-gateway/types.ts:46-53`, bereits in
  `state/plan-v1-f8-execution-controller.md` Abschnitt 0 real zitiert)
  besitzt **kein** `eingaben`-Feld. → Ein Lineage-Verweis der Laufakte auf
  `artefakt:auftrag-<auftragId>` ist mit dem heutigen F6a-Vertrag technisch
  nicht erreichbar, ohne `GatewayEingaben` und den Aufrufort in
  `starteGateway` zu ändern. Siehe Abschnitt 2.2.
- **`src/execution-controller/index.ts:125-143`** (WS-2b,
  `vorgaengerLaufId`-Verweis) — der real bereits gebaute
  Lauf-zu-Lauf-Lineage-Mechanismus hängt seinen synthetischen
  `artefakt:laufakte-<vorgaengerLaufId>`-Eintrag **nicht** an die Laufakte,
  sondern stellt ihn der `anfragen`-Liste voran, die an `baueKontextpaket`
  geht — der Verweis landet damit in den `eingaben` des
  **Kontextpaket**-Artefakts (F5-eigen), nicht der Laufakte. Das ist der
  einzige real existierende Präzedenzfall für „Lauf verweist auf
  Fremdartefakt ohne F6a-Eingriff" — er arbeitet strukturell anders als in
  der Auftragsvorgabe zu Frage 2 vorgeschlagen.
- **`src/checkpoint-store/index.ts:75-84`** (`pruefeLaufId`) — verbietet
  ausschließlich `/`, `\`, `..` und Steuerzeichen < 0x20. **Kein**
  Verbot von Leerzeichen oder Bindestrich. Das ist die einzige real
  angewendete Zeichenregel für jede `laufId` (und damit für
  `lineage-auftrag-<auftragId>`, da `registriereKernArtefakt` intern
  `schreibeCheckpoint` mit dieser Kette aufruft).
- **`scripts/leitstand-server.mjs:207-308`**
  (`VERBOTENE_OPTIONEN_FELDER`, `ERLAUBTE_STARTAUFTRAG_FELDER`,
  `PFLICHT_STARTAUFTRAG_FELDER`, `pruefeStartauftrag`) — reine, exportierte
  Formprüf-Funktion. `PFLICHT_STARTAUFTRAG_FELDER` spiegelt heute 1:1 die
  sieben Pflichtfelder von `AusfuehrungsEingaben` (`LAUFID_UNZULAESSIGE_ZEICHEN`
  ist dabei **strenger** als F1s echtes `pruefeLaufId` — verbietet zusätzlich
  Leerzeichen/Bindestrich; eine vorbestehende, von F11 WS-1 nicht zu
  behebende Diskrepanz).
- **`scripts/check-f10-leitstand.mjs:72-82`** (`gueltigerStartauftrag`) —
  eine einzige Fixture-Fabrik, von der jeder Testfall in dieser Datei den
  Body ableitet (`gueltigerStartauftrag(laufId)`), kein wiederholter
  Bau je Testfall.
- **`src/execution-controller/execution-controller.test.ts:119-124`**
  (`gueltigeEingaben`) — ebenfalls eine einzige Fixture-Fabrik; alle 9
  Aufrufstellen in der Datei (Zeilen 275, 339, 380, 432, 544, 663, 685,
  745, 782) leiten von ihr ab. Ein neues Pflichtfeld erfordert dort genau
  **eine** Änderung, keine neun.

## 1. Ziel (prüfbar, WS-1)

Ein Auftrag lässt sich mit `titel`/`auftragstext` als eigenständiges
AUFTRAG_V0-Kernartefakt unter `auftrag-<auftragId>` registrieren (AK1).
`fuehreAufgabeDurch` verlangt `auftragstext` als Pflichtfeld und baut daraus
einen eigenen, vom Evidenzteil sichtbar getrennten Prompt-Abschnitt (AK2).
Ein Grep-Gate und ein Laufzeit-Test belegen mechanisch, dass `auftragstext`
nie ein Kontextpaket-Element wird und die Kontextpaket-Elementanzahl vom
Auftragstext-Wert unbeeinflusst bleibt (AK3). Kein Eingriff in F6as
`starteGateway`/`GatewayEingaben`, in `public/leitstand/`, oder in AK4-9.

## 2. SCOPE — die sechs gestellten Fragen

### 2.1 AUFTRAG_V0-Payload und Schema (Frage 1)

Neues, eigenständiges Kernmodul `src/auftrag/{index,types}.ts` (D1-Muster
wie F2/F5/F9 — ruft F2s `registriereKernArtefakt` nur von außen auf, kein
Eingriff in `src/lineage-registry/`):

```ts
export function registriereAuftrag(
  auftragId: string,
  profilReferenz: ProfilReferenz,
  titel: string,
  auftragstext: string,
  optionen?: Optionen
): { pfad: string; versionSequenz: number; inhaltsHash: string }
```

- `artefaktId = 'auftrag-' + auftragId` (AK1 wörtlich).
- `herkunft: { quelle: 'auftrag' }` — Muster der bestehenden
  `herkunft`-Objekte (Kontextpaket: `{ rolle, quelle: 'context-builder' }`,
  Laufakte: `{ erzeuger: 'kern', schritt: 'claude-code-gateway-lauf' }`).
- `eingaben: []` — **Antwort auf Frage 1, zweiter Teil: ja, keine
  Eingaben-Referenzen.** Ein Auftrag ist der Wurzelknoten eines
  Vorhabensstrangs; er zitiert keine vorherigen Artefakte (anders als das
  Kontextpaket, das reale Anfragen zitiert). Ein „wird referenziert
  von"-Zeiger könnte künftig entstehen (Frage 2/WS-2), aber nie ein
  „referenziert"-Zeiger davor.
- `daten` (AUFTRAG_V0):
  ```json
  {
    "auftrag_schema": "v0",
    "auftrag_id": "<auftragId>",
    "titel": "<titel>",
    "auftragstext": "<auftragstext>",
    "erstellt_am": "<ISO-Zeitstempel>"
  }
  ```

Schema `schemas/kontrollzustand-auftrag-payload.schema.json`, Muster
identisch zu `kontrollzustand-kontextpaket-payload.schema.json`:
`additionalProperties: false`, `required` = alle fünf Felder,
`auftrag_schema: { "const": "v0" }`, die übrigen vier als
`{ "type": "string", "minLength": 1 }`. Beispiele unter
`schemas/examples/`: mindestens `kontrollzustand-auftrag.valid.json` sowie
`kontrollzustand-auftrag.invalid-falscher-schema-wert.json` und
`kontrollzustand-auftrag.invalid-leerer-auftragstext.json` (Muster der
bestehenden Kontextpaket-/Laufakte-Beispielpaare).

`auftrag_id`-Zeichenregel: kein eigener Regelsatz nötig (D5) — die Kette
`lineage-auftrag-<auftragId>` läuft real durch F1s `schreibeCheckpoint`,
dessen `pruefeLaufId` bereits `/`, `\`, `..` und Steuerzeichen ablehnt
(Abschnitt 0). Ein zweiter, selbstgebauter Regelsatz in `src/auftrag/`
wäre eine unbelegte Dopplung.

### 2.2 Lauf→Auftrag-Verweis (Frage 2)

**Direkte Antwort: Der wörtliche Vorschlag (Lineage-Eingabe der Laufakte
auf `artefakt:auftrag-<auftragId>`) ist ohne Eingriff in F6as
`starteGateway` NICHT erreichbar.** Beleg (Abschnitt 0):
`claude-code-gateway/index.ts:323-330` registriert die Laufakte mit
`eingaben` hartkodiert als `[]`; `GatewayEingaben` hat kein Feld, über das
ein Aufrufer eine Eingaben-Liste einschleusen könnte. Jede Lösung auf
diesem Weg verlangt (a) ein neues optionales Feld auf `GatewayEingaben`
und (b) eine Änderung der Aufrufstelle in `starteGateway` — ein echter,
wenn auch kleiner, F6a-Vertragsbruch. Das widerspricht `feature.md`s
eigener Dependency-Zeile „Soft: F6a — unverändert" und liegt außerhalb der
WS-1-Workstream-Liste (WS-1 = AK1/AK2/AK3).

**Real existierende Alternative** (F8 WS-2b, `vorgaengerLaufId`,
`execution-controller/index.ts:125-143`, Abschnitt 0): der Verweis wird
nicht an die Laufakte, sondern an das **Kontextpaket** gehängt — ein
synthetischer Eintrag wird der `anfragen`-Liste vorangestellt, bevor
`baueKontextpaket` läuft. Das ist der einzige bereits gebaute und laufende
Mechanismus dieser Art. Er hat aber einen echten Nachteil für F11: ein
`artefakt:auftrag-<auftragId>`-Zeiger dort landet **innerhalb** der
Kontextpaket-`elemente`/`eingaben` — also genau in dem Datensatz, aus dem
`bauePromptAusKontextpaket` den Evidenzteil baut. Selbst wenn `inhalt` auf
Auftrags-Metadaten ohne `auftragstext` beschränkt würde, verwässert das
AK3s Grundsatz „Auftrag ist keine Evidenz" spürbar — und keine der drei
WS-1-Akzeptanzkriterien (AK1/AK2/AK3) verlangt diesen Verweis überhaupt;
er ist ausschließlich Vorarbeit für WS-2.

**Empfehlung:** den Lauf→Auftrag-Lineage-Mechanismus **nicht** in WS-1
bauen, sondern an WS-2 delegieren. WS-2 ändert ohnehin den
Leitstand-Startendpunkt (AK4-7) und ist der naheliegende, bereits
vorgesehene Ort, um zwischen der kleinen additiven F6a-Erweiterung und der
Kontextpaket-seitigen Variante zu entscheiden — abgewogen gegen WS-2s
konkrete Anforderungen (Startvorlage, D13-Sperre), nicht hier
vorweggenommen. WS-1 registriert den Auftrag; er bleibt bis zu einem
tatsächlichen Laufstart (WS-2/WS-3) unreferenziert — das ist kein
Mangel, weil AK1 nur die Registrierung verlangt.

### 2.3 Prompt-Zusammensetzung (Frage 3)

`AusfuehrungsEingaben` (`execution-controller/types.ts`) bekommt
`auftragstext: string` als Pflichtfeld.

`bauePromptAusKontextpaket` bleibt **unverändert** — sie baut weiterhin
ausschließlich den Evidenzteil aus dem Kontextpaket (F-124-Vertrag,
eigener Docstring bleibt korrekt). `fuehreAufgabeDurch` fügt einen neuen
Zusammensetzungsschritt zwischen dem bisherigen `bauePromptAusKontextpaket`-Aufruf
und `baueAufruf` ein:

```ts
const evidenzText = bauePromptAusKontextpaket(kontextpaketErgebnis.paket, anfragen)
const promptText = evidenzText.length === 0
  ? `Auftrag:\n${eingaben.auftragstext}`
  : `Auftrag:\n${eingaben.auftragstext}\n\n===\n\n${evidenzText}`
```

- **Trennzeichen `===` statt `---`:** `bauePromptAusKontextpaket` nutzt
  `'\n\n---\n\n'` bereits **zwischen** Kontextpaket-Elementen. Denselben
  Trenner für die Auftrag/Evidenz-Grenze zu verwenden, machte die
  Grenzen für einen menschlichen Leser (und für AK3s Grep, Abschnitt 2.5)
  ununterscheidbar. `===` ist bewusst ein anderes Zeichen.
- **Leeres Kontextpaket:** der Evidenzabschnitt entfällt vollständig
  statt eines leeren Trenners ohne Inhalt danach — ein reiner
  Auftrags-Lauf ohne Evidenzanfragen bekommt einen sauberen Prompt ohne
  toten Abschnitt.
- `eingaben.aufrufEingaben` bleibt unverändert (D5, reine Durchreichung —
  `{ ...eingaben.aufrufEingaben, prompt: promptText }` wie heute).
  `baueAufruf` selbst: keine Änderung (feature.md-Nicht-Ziel, wörtlich).

### 2.4 `auftragstext` als Pflichtfeld — Aufrufer und Tests (Frage 4)

Konkrete, real verifizierte Fundstellen:

1. `src/execution-controller/types.ts:56-66` — `auftragstext: string` zu
   `AusfuehrungsEingaben` ergänzen.
2. `src/execution-controller/index.ts` — Prompt-Zusammensetzung nach 2.3.
3. `src/execution-controller/execution-controller.test.ts:119-124` — die
   einzige Fixture-Fabrik `gueltigeEingaben` bekommt
   `auftragstext: '<Testtext>'`; alle neun Aufrufstellen erben es ohne
   Einzeländerung. Neue Testfälle für AK2 (Abschnittstrennung, leeres
   Kontextpaket) und AK3 (Laufzeitnachweis) sind additiv.
4. **Zielkonflikt, real gefunden:** `feature.md`s WS-1-Beschreibung
   schließt `scripts/leitstand-server.mjs` ausdrücklich aus („Reiner
   Kerneingriff … keine Änderung an scripts/leitstand-server.mjs"). AK2
   macht `auftragstext` gleichzeitig zu einem **Pflichtfeld** von
   `AusfuehrungsEingaben`. `pruefeStartauftrag`s `PFLICHT_STARTAUFTRAG_FELDER`
   spiegelt diese Feldliste heute 1:1 (Abschnitt 0). Bleibt der Server
   unverändert, akzeptiert `pruefeStartauftrag` einen Startauftrag-Body
   ohne `auftragstext` weiterhin als vollständig — der resultierende
   `eingaben`-Aufruf an `fuehreAufgabeDurch` hätte
   `auftragstext === undefined`, und der reale Prompt begänne mit
   `Auftrag:\nundefined`. Kein TypeScript-Compiler steht zur Laufzeit
   zwischen einem `.mjs`-Server und einer `.ts`-Kernfunktion, die
   Typprüfung greift also nicht automatisch.

   Zwei ehrliche Optionen, keine verdeckt die andere:
   - **Option A:** WS-1 liefert nur den Kernwandel; der reale
     Leitstand-Startpfad bleibt bis WS-2 mit diesem stillen Fehlerbild
     behaftet. Vertretbar nur, wenn zwischen WS-1 und WS-2 kein echter
     Lauf über den Leitstand gestartet wird (Reihenfolge WS-1→WS-2→WS-3
     ist laut `feature.md` zwingend, aber ohne genannte Zeitgrenze
     dazwischen).
   - **Option B (empfohlen):** die WS-1-Scope-Formulierung wird als
     „keine Verhaltens-/Routen-Änderung an leitstand-server.mjs" gelesen,
     nicht als „kein Byte Diff" — die mechanisch erzwungene Ergänzung von
     `auftragstext` in `ERLAUBTE_STARTAUFTRAG_FELDER`,
     `PFLICHT_STARTAUFTRAG_FELDER` und der `eingaben`-Rückgabe von
     `pruefeStartauftrag` (`scripts/leitstand-server.mjs:207-308`) wird
     Teil von WS-1. Sie berührt keinen AK4-9-Belang (Startvorlage,
     Body-Sperre-Erweiterung, D13, Werkzeugsätze bleiben unverändert) —
     nur die bestehende AK2(F10)-Formprüfung wird um ein Feld erweitert.
     `scripts/check-f10-leitstand.mjs:72-82`s `gueltigerStartauftrag`
     bekommt dieselbe eine Ergänzung.

   Diese Entscheidung braucht Stefans Freigabe vor dem Bau (Abschnitt 5,
   Offene Frage 1) — der Plan trifft sie nicht einseitig.

### 2.5 AK3 mechanische Prüfung (Frage 5)

Zweistufig, wie in `feature.md` gefordert:

**(a) Grep-Regel** (in `scripts/check-f11-auftrag.mjs`, Abschnitt 2.6):
Muster wie F8s D4 (`check-f8-execution-controller.mjs`) — mit
Selbsttest, damit das Gate nicht nur scheinbar prüft. Konkret: alle
Vorkommen des Bezeichners `auftragstext` in
`src/execution-controller/index.ts` (Produktionscode, `*.test.ts`
ausgenommen) auflisten; für jedes Vorkommen prüfen, dass es innerhalb des
Prompt-Zusammensetzungsschritts (2.3) liegt und **nicht** innerhalb des
Blocks, der die `anfragen`/`nachRollenfilter`-Liste für den Aufruf von
`baueKontextpaket(` konstruiert. Selbsttest: ein simulierter
Verstoßstring (`auftragstext` im `anfragen`-Aufbau injiziert) muss vom
Regex real erkannt werden — sonst ist das Gate vakuum.

**(b) Laufzeit-Nachweis** (Testfall in `execution-controller.test.ts`
oder im WS-1-Teil von `check-f11-auftrag.mjs`): `fuehreAufgabeDurch` mit
einem eindeutig markierten `auftragstext` (z. B. UUID-Fragment) laufen
lassen, danach `ladeArtefaktVersion('kontextpaket-' + laufId)` laden und
zwei Dinge prüfen:
1. `kanonischesJson(paket)` enthält die Marke nicht.
2. `paket.elemente.length` ist identisch zu einem Kontrolllauf mit
   denselben `anfragen`/`budget`, aber **anderem** `auftragstext` — das
   belegt, dass der Auftragstext-Wert keinerlei Einfluss auf Anzahl/Inhalt
   der Elemente hat, nicht nur, dass sein wörtlicher String fehlt (schützt
   gegen eine verdeckte, z. B. gehashte Durchreichung).

### 2.6 F0-Datenformat-Gate (Frage 6)

**Nein, `scripts/check-datenformate.mjs` muss nicht erweitert werden.**
Beleg Abschnitt 0: dieses Gate prüft ausschließlich die Hülle
(`kontrollzustand.schema.json`/`profile.schema.json`) plus reale Dateien
unter `profiles/`/`kontrollzustand/`, alle gegen dieselben zwei
Hüllenfunktionen — nie eine `kontrollzustand-*-payload.schema.json`. Weder
Kontextpaket noch Laufakte sind dort verankert; Payload-Validierung ist
durchgängig Sache des jeweiligen Feature-Gates
(`check-f5-context-builder.mjs`, `check-f6a-claude-code-gateway.mjs`).

Konsequenz für AK1s Formulierung („geprüft von
`scripts/check-datenformate.mjs`"): das ist architektonisch ungenau. Der
Plan schlägt vor, AK1 sinngemäß als „mechanisch geprüft, im etablierten
Muster" zu lesen und bereits in WS-1 `scripts/check-f11-auftrag.mjs`
anzulegen — auch wenn AK9 dieses Skript formal erst für AK3/AK5/AK6/AK7
(WS-2/WS-3) verlangt. Der WS-1-Teilumfang: (a) die fünf
AUFTRAG_V0-Beispiele gegen eine neue, exportierte
`validiereAuftragDaten`-Funktion (Muster `validiereKontextpaketDaten`),
(b) die AK3-Grep- und Laufzeitprüfung aus 2.5. In `npm run check`
eingehängt ab WS-1, von WS-2 um AK5/AK6/AK7 erweitert — genau das Muster,
nach dem F5/F6a/F8 ihr jeweiliges Gate am ersten eigenen Workstream
erhielten, nicht erst am letzten.

## 3. NICHT (WS-1 Non-Scope, mit Grund)

- **AK4-9** (Startvorlage, erweiterte Body-Sperre, Evidenzdateien-Lesen,
  D13-Sperre, reale Nachweisläufe, Gate-Vollumfang) — WS-2/WS-3.
- **Lauf→Auftrag-Lineage-Mechanismus** — Design-Entscheidung explizit an
  WS-2 delegiert (2.2), keine AK von WS-1 verlangt ihn.
- **`public/leitstand/`** — keine Oberfläche zur Auftragsanlage in WS-1.
- **Änderung an F6a** (`starteGateway`, `GatewayEingaben`) — bewusst
  ausgeschlossen, Begründung 2.2.
- **`baueAufruf`** — unverändert, feature.md-Nicht-Ziel wörtlich.
- **AK4-7-Felder in `scripts/leitstand-server.mjs`** (Startvorlage,
  Werkzeugsätze, D13) — nur die in 2.4/Option B benannte, minimal
  erzwungene Ein-Feld-Ergänzung ist überhaupt zur Debatte, nicht mehr.

## 4. Design-Entscheidungen

- **D1 (eigenständiges Modul `src/auftrag/`):** analog F2/F5/F9 — ruft F2
  nur von außen auf, kein Fremdmodul-Touch.
- **D2 (Auftrag hat keine eigenen `eingaben`):** er ist Wurzelknoten,
  Frage 1.
- **D3 (Trennzeichen `===` statt `---` für Auftrag/Evidenz-Grenze):**
  Unterscheidbarkeit von F5s bestehendem Element-Trenner, Frage 3 —
  braucht Freigabe (Abschnitt 5, Offene Frage 2).
- **D4 (leerer Kontextpaket-Fall: Evidenzabschnitt entfällt ganz):**
  Frage 3.
- **D5 (Lauf→Auftrag-Lineage an WS-2 delegiert, nicht in WS-1 gebaut):**
  Frage 2 — keine WS-1-AK verlangt ihn, der einzige real existierende
  Mechanismus (Kontextpaket-seitig) würde AK3s Grenze verwässern.
- **D6 (`check-f11-auftrag.mjs` bereits in WS-1 anlegen, Teilumfang):**
  Frage 6, Muster F5/F6a/F8 — Payload-Gate gehört zum Feature, nicht zu
  F0, und entsteht am ersten Workstream.
- **D7 (leitstand-server.mjs-Konflikt, Option A vs. B):** Frage 4 — echter
  Zielkonflikt zwischen WS-1-Scope-Text und AK2-Pflichtfeld, hier nicht
  einseitig entschieden (Abschnitt 5, Offene Frage 1).

## 5. Offene Fragen für Stefan/Advisor (vor Bau)

1. **Option A vs. B für den `leitstand-server.mjs`-Konflikt (2.4/D7).**
   Empfehlung: B — die Ergänzung ist mechanisch erzwungen, klein, und
   berührt keinen AK4-9-Belang.
2. **Trennzeichen `===` (D3)** — kosmetische, aber grep-relevante Wahl
   (AK3(a) hängt an einer eindeutigen Grenze). Freigabe vor Testbau
   erwünscht.
3. **`check-f11-auftrag.mjs` bereits ab WS-1 in `npm run check` (D6)** —
   oder erst mit AK9/WS-2? Empfehlung: ab WS-1, nur WS-1-Teilumfang.
4. **`auftrag_id`-Zeichenregel** — de facto von F1s echtem `pruefeLaufId`
   geerbt, dadurch **großzügiger** als `leitstand-server.mjs`s eigene,
   strengere Kopie (`LAUFID_UNZULAESSIGE_ZEICHEN`) für `laufId`. Nur zur
   Kenntnisnahme, kein Blocker — vorbestehende Diskrepanz, nicht von F11
   verursacht.

## 6. Ablageort (Vorschlag für den Bau, hier nicht angelegt)

- `src/auftrag/{index,types}.ts` — neues Kernmodul (D1).
- `schemas/kontrollzustand-auftrag-payload.schema.json` — neu.
- `schemas/examples/kontrollzustand-auftrag*.json` — neu, mindestens ein
  `*.valid.json` und zwei `*.invalid-*.json`.
- `src/execution-controller/types.ts` — `auftragstext` ergänzt.
- `src/execution-controller/index.ts` — Prompt-Zusammensetzung (2.3).
- `src/execution-controller/execution-controller.test.ts` — Fixture
  (`gueltigeEingaben`) plus neue AK2-/AK3-Testfälle.
- `scripts/check-f11-auftrag.mjs` — neu, WS-1-Teilumfang (D6).
- `scripts/leitstand-server.mjs`,
  `scripts/check-f10-leitstand.mjs` — nur bei Option B (2.4).
- `package.json`s `check`-Skript — `check-f11-auftrag.mjs` einhängen.
- `state/gates.md`, `state/memory-map.md`, `docs/STATUS.md`,
  `features/F11/journal.md` — Einträge erst nach realem Bau-/Prüflauf.

## 7. Budget & Pässe

- Dieser Schritt liefert **nur** diesen Plan — kein Bau, kein
  Advisor-Pass, kein Handoff-Vertrag (Auftragsvorgabe, §5.3-Halt gilt).
- Empfohlener nächster Schritt: Klärung der vier offenen Fragen
  (Abschnitt 5) durch Stefan, danach Advisor-Pass mit Fokus auf 2.2
  (F6a-Verzicht-Begründung, D5) und 2.4 (Server-Konflikt-Optionen, D7).
- Zuschnitt-Heuristik (`CLAUDE.md`): WS-1 bleibt ein zusammenhängender
  Kerneingriff (neues Modul + Execution-Controller-Erweiterung + ein
  neues Gate), plus höchstens die in Option B benannte Ein-Feld-Ergänzung
  am Rand von F10 — ein Baudurchgang plus höchstens eine Korrekturrunde
  bleibt realistisch, sofern Option B gewählt wird.

## 8. Akzeptanzkriterien — Zuordnung zu Testfällen (Entwurf, vor Advisor-Pass nicht final)

| AK | Testfall (Kurzform) | Ort |
|---|---|---|
| AK1 | Schema/Beispiele gegen `validiereAuftragDaten`; `registriereAuftrag`-Unit-Test prüft `artefaktId`, `eingaben: []`, Payload-Form | `check-f11-auftrag.mjs`, `src/auftrag/*.test.ts` |
| AK2 | `promptText` enthält Auftragsabschnitt vor Evidenzabschnitt, getrennt durch `===`; leeres Kontextpaket → kein Evidenzabschnitt; `aufrufEingaben`/`baueAufruf` unverändert (Spy/Vergleich) | `execution-controller.test.ts` |
| AK3 | (a) Grep + Selbsttest gegen einen injizierten Verstoß; (b) Laufzeit-Test: Marke fehlt in registriertem Kontextpaket, Elementanzahl unverändert bei anderem `auftragstext` | `check-f11-auftrag.mjs` (a), `execution-controller.test.ts` (b) |

## 9. Rollen für diesen Workstream

| Position | Träger | Rechte |
|---|---|---|
| Advisor | Subagent `architecture-advisor`, frisch | `Read, Grep, Glob` |
| Executor | Claude-Code-Sitzung, frisch, kennt nur Repo + Vertragsvolltext | voll im freigegebenen Pfad |
| Reviewer | Subagenten `code-reviewer`, `qa`, frisch | read-only |
| Mensch (Stefan) | — | Freigaben, Klärung Abschnitt 5, Release |

## 10. Nächste Schritte nach diesem Plan (nicht Teil dieses Auftrags)

1. Klärung der vier offenen Fragen (Abschnitt 5) durch Stefan.
2. Advisor-Pass auf diese Datei (Fokus 2.2/D5 und 2.4/D7).
3. Findings → `state/advisor-findings-f11-auftrag-ws1.md`.
4. Falls nötig: plan-v2 als eigene Datei.
5. Handoff-Vertrag für WS-1 — erst danach, nicht Teil dieses Auftrags.

## Status
- [ ] Freigegeben
- [ ] Freigegeben mit Hinweisen
- [ ] Nicht freigegeben
- [ ] Blockiert

## Nächster sinnvoller Schritt
Freigabe dieses Plans durch Stefan, insbesondere der vier offenen Fragen
(Abschnitt 5, vor allem Option A/B in 2.4), danach Advisor-Pass — noch
kein Bau.
