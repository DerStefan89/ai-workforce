# Plan v1 — Feature F8: Execution Controller

Slug: f8-execution-controller
Stand: 2026-09-04
Rolle: Planner (Claude-Code-Sitzung, Repo-Zugriff)
Grundlage: `features/F8/feature.md` (Status READY_FOR_TECH, Ziel/Scope/
Nicht-Ziele/AK1-9, Workstream-Vorschlag WS-1/WS-2).

Kein Bau in diesem Schritt. Kein Advisor-Pass in diesem Schritt.

## 0. Verifikation (F-013-Muster — nicht annehmen, prüfen)

Alle folgenden Signaturen real aus dem Repo gelesen, nicht aus
`feature.md`s Prosa übernommen:

- **`src/checkpoint-store/index.ts:86-88`** —
  `checkpointVerzeichnis(laufId, basisVerzeichnis)` gibt
  `join(basisVerzeichnis, laufId, 'checkpoints')` zurück. **Jede**
  öffentliche Funktion des Moduls (`schreibeCheckpoint`,
  `schreibeWirkungsmarke`, `ladeLetztenGueltigenCheckpoint`,
  `ladeGueltigeCheckpoints`, `stelleLaufstatusFest`) nimmt genau eine
  `laufId` entgegen und öffnet ausschließlich deren eigenes Verzeichnis —
  es gibt im gesamten Modul keinen Codepfad, der zwei `laufId`s
  gleichzeitig liest oder mischt. Das ist die Grundlage des F-091-
  Nachweises unten (Abschnitt 2.2).
- **`src/checkpoint-store/index.ts:697-756`** (`stelleLaufstatusFest`) —
  FIFO-Paarung von `run_prepared`/`terminal` **innerhalb einer** `kette =
  ladeGueltigeCheckpoints(laufId)`. Bleibt eine `run_prepared`-Sequenz am
  Ende offen, ist das Ergebnis `KLAERUNG_ERFORDERLICH` mit
  `resumeZiel: 'Kein automatischer Neustart dieser lauf_id (AC5) — ein
  bewusst neu gestarteter Lauf erhält eine eigene lauf_id (AC6, §16.6)'`
  (Zeile 739, wörtlich) — das ist die verbindliche `resumeZiel`-
  Invariante aus dem Auftrag.
- **`src/human-transport/index.ts:147`** (`haendigeAus`) —
  `schreibeWirkungsmarke(laufId, profilReferenz, 'run_prepared', {},
  optionen)`. Bestätigt: F9 schreibt bei jeder Aushändigung real eine
  `run_prepared`-Marke unter der ihr übergebenen `laufId` — ohne eigene
  `laufId`-Wahlfunktion, das entscheidet allein der Aufrufer (hier: F8).
- **`src/claude-code-gateway/index.ts:218-311`** (`starteGateway`) —
  vollständig gelesen, nicht nur Signatur. Ruft intern **bereits** alles,
  was AK3 dem Controller verbietet: `pruefeUndVerweigereBeiTreffer`
  (Zeile 219), `pruefeStartziel` (224), liest
  `state/aktuelle-autorisierung.json` selbst (229-237), misst
  `ermittleIstZustand` selbst (242), ruft `pruefeStartfreigabe` selbst
  (255-263), schreibt bei Erfolg selbst die `run_prepared`-Marke für die
  **Haupt-`laufId`** (269), startet den Prozess (271), registriert die
  Laufakte über F2 (301-308). Rückgabe: `{ ok: false; grund: string } |
  { ok: true; laufakte: LaufakteV0Daten; pfad: string; versionSequenz:
  number }` (`types.ts:68-71`). Der Controller hat dadurch **nichts**
  mehr zu prüfen, zu messen oder zu schreiben, um AK2/AK3 zu erfüllen —
  er muss nur `eingaben.tokens` selbst bauen (`baueAufruf`, WS1) und das
  Ergebnis unverändert weiterreichen.
- **`src/claude-code-gateway/types.ts:46-53`** (`GatewayEingaben`) —
  `{ laufId, profilReferenz, tokens, werkzeugStartziel,
  werkzeugVersionDeklariert, berechtigungskontext }`. Kein Baseline-/
  Autorisierungsfeld — bestätigt E-193 strukturell, nicht nur laut
  Kommentar: der Controller kann diese Felder gar nicht liefern, selbst
  wenn er wollte.
- **`src/result-evaluator/index.ts:125-134`** (`klassifiziereLauf`) —
  `(laufId, profilReferenz, eingaben: { laufakte: LaufakteV0Daten },
  optionen) → KlassifikationsErgebnis`. Ruft intern
  `schreibeWirkungsmarke(laufId, profilReferenz, 'terminal', {ergebnis},
  optionen)` (Zeile 132) — das ist die **einzige** Stelle, die für die
  Haupt-`laufId` das Terminalartefakt schreibt. `ermittleErgebnis`
  (Zeile 76-123) liefert bei `VERWEIGERT` ein Feld
  `bypass_verdacht_anzahl: number` (Zeile 122) — genau das von AK4
  verlangte Auslösekriterium.
- **`src/context-builder/index.ts:80-210`** (`baueKontextpaket`) —
  vollständig gelesen. `Anfrage.inhalt` (`types.ts:20`) ist ein vom
  Aufrufer **direkt gelieferter** String, keine Datei-Lesefunktion —
  dasselbe synthetische Muster, das F9s D2 für `BEDARF_V0` nutzt (siehe
  `state/plan-v1-f9-human-transport.md` Abschnitt 4, D2; Advisor-Pass
  bestätigt „fachlich tragfähig", `state/advisor-findings-f9-human-
  transport.md` Zeile 12/14). Zeile 180-206: die akzeptierten `elemente`
  werden **unverändert** als `eingaben` an `registriereKernArtefakt`
  weitergereicht — ein synthetischer `Anfrage.pfad` landet damit real in
  `eingaben[].pfad` des registrierten Kontextpaket-Artefakts. Das ist der
  Mechanismus für den AK7-Lineage-Verweis (Abschnitt 2.3 unten).
- **`src/lineage-registry/index.ts:47-49`** — `laufId(artefaktId) =
  'lineage-' + artefaktId`. F2 legt seine eigene, von der Fach-`laufId`
  getrennte Checkpoint-Kette unter `kontrollzustand/lineage-<artefaktId
  >/` an. Bestätigt: die F1B-Wirkungsmarken-Kette (Haupt-`laufId`) und
  die F2-Lineage-Kette (`lineage-<artefaktId>`) sind bereits heute zwei
  physisch getrennte Verzeichnisbäume — eine dritte, für die Eskalation
  gewählte `laufId` liegt automatisch in einem vierten, ebenfalls
  getrennten Baum.
- **`src/lineage-registry/index.ts:85-114`** (`registriereKernArtefakt`)
  — `(artefaktId, profilReferenz, herkunft, daten, eingaben?, optionen?)
  → { pfad, versionSequenz, inhaltsHash }`. `eingaben: EingabeReferenz[]`
  ist `{ pfad, zitierter_bereich, inhalts_hash }[]` — beliebige,
  freigewählte Strings, keine erzwungene Dateisystemsemantik (bestätigt
  in F9s Plan Abschnitt 0, hier erneut real nachgelesen).
- **`src/claude-code-gateway/index.ts:140`** — `laufakteArtefaktId(laufId)
  = 'laufakte-' + laufId`. Bestätigt real (nicht nur laut Testkommentar
  „starteGateway registriert die Laufakte über F2"): die Laufakte jedes
  Laufs ist unter `laufakte-<laufId>` als eigenständiges F2-Artefakt
  auffindbar — der natürliche Ankerpunkt für einen Lineage-Verweis von
  außen (Eskalation, Wiederaufnahme).
- **`scripts/check-f6a-claude-code-gateway.mjs` AK12/AK14** real
  gelesen: das dort etablierte Muster (Grep-Verbot bestimmter
  Bezeichner/Konstrukte in den Produktionsdateien des Moduls, plus
  Selbsttest, dass die Regel einen simulierten Verstoß auch tatsächlich
  erkennt) ist die direkte Vorlage für F8s AK1/AK3-Gate-Prüfungen
  (Abschnitt 4, D4 unten).
- **`features/F9/feature.md`** — `erfasseBedarf(laufId, profilReferenz,
  beschreibung, eingaben?, optionen?)`,
  `erzeugeTransportpaket(laufId, profilReferenz, bedarfVersionSequenz,
  inhalt, executor, optionen?)`, `haendigeAus(laufId, profilReferenz,
  optionen?)` — alle drei nehmen die `laufId` als expliziten ersten
  Parameter entgegen, keine interne Ableitung aus einem globalen
  Zustand. Der Controller kann sie deshalb ohne jede Änderung an F9
  unter einer selbst gewählten, vom auslösenden Lauf verschiedenen
  `laufId` aufrufen.

## 1. Ziel (prüfbar)

Eine Aufgabe lässt sich unter einer `laufId` vollständig durch F5 → F6a →
F7 führen; das Ergebnis ist über `stelleLaufstatusFest(laufId)` als
`ABGESCHLOSSEN` mit dem F7-Ergebnis feststellbar. Verweigert F6a den
Start, endet der Durchlauf mit dessen unverändertem Grund, ohne
Prozessstart und ohne Klassifikation. Meldet F7 `VERWEIGERT` mit
`bypass_verdacht_anzahl > 0`, entsteht über F9 eine Aushändigung an den
Menschen unter einer **eigenen** `laufId`, ohne den Status des
auslösenden Laufs zu verändern (F-091). Ein erneuter Anlauf nach
`KLAERUNG_ERFORDERLICH` erhält ebenfalls eine eigene `laufId` mit einem
über F2 auffindbaren Verweis auf den Vorgängerlauf.

## 2. SCOPE

### 2.1 WS-1 — Kette (F5 → F6a → F7 → Statusfeststellung)

**Modul:** `src/execution-controller/index.ts`

**Einstiegsfunktion (Entwurf):**

```ts
interface AusfuehrungsEingaben {
  rolle: string
  anfragen: Anfrage[]              // F5
  budget: Budget                   // F5
  aufrufEingaben: AufrufEingaben   // F6a WS1 (modell, werkzeugsatz)
  werkzeugStartziel: string[]      // F6a WS4
  werkzeugVersionDeklariert: string
  berechtigungskontext: string
}

type AusfuehrungsErgebnis =
  | { ok: false; stufe: 'kontextpaket'; ergebnis: KontextpaketErgebnis & { ok: false } }
  | { ok: false; stufe: 'gateway'; grund: string }
  | { ok: true; klassifikation: KlassifikationsErgebnis; laufStatus: LaufStatus }

async function fuehreAufgabeDurch(
  laufId: string,
  profilReferenz: ProfilReferenz,
  eingaben: AusfuehrungsEingaben,
  optionen?: Optionen
): Promise<AusfuehrungsErgebnis>
```

**Ablauf, feste Reihenfolge (AK1):**

1. `baueKontextpaket(laufId, eingaben.rolle, eingaben.anfragen,
   profilReferenz, eingaben.budget, optionen)` (F5). Bei `ok: false`:
   Rückgabe `{ ok: false, stufe: 'kontextpaket', ergebnis }` —
   unveränderter F5-Grund, sofortiger Abbruch, **kein** `baueAufruf`,
   **kein** `starteGateway`.
2. `baueAufruf(eingaben.aufrufEingaben)` (F6a WS1) → `tokens`. Reine
   Konstruktion, kein Prüf-/Startcode (bereits heute eine Funktion ohne
   Nebenwirkung — Abschnitt 0).
3. `starteGateway({ laufId, profilReferenz, tokens,
   werkzeugStartziel: eingaben.werkzeugStartziel,
   werkzeugVersionDeklariert: eingaben.werkzeugVersionDeklariert,
   berechtigungskontext: eingaben.berechtigungskontext }, optionen)`
   (F6a WS2). Bei `ok: false`: Rückgabe `{ ok: false, stufe: 'gateway',
   grund: gatewayErgebnis.grund }` — **derselbe** String, keine
   Anreicherung, kein eigener Grundtext (AK2). Kein `klassifiziereLauf`-
   Aufruf in diesem Zweig.
4. `klassifiziereLauf(laufId, profilReferenz, { laufakte:
   gatewayErgebnis.laufakte }, optionen)` (F7).
5. `stelleLaufstatusFest(laufId, optionen)` (F1B, reine
   Wiederverwendung, kein eigener Code — analog F9s AC9/AC8-Präzedenz).
   Rückgabe `{ ok: true, klassifikation, laufStatus }`.

Kein Schritt dieses Ablaufs enthält eine eigene Prüf- oder
Klassifikationsregel — jeder Entscheidungspunkt liegt in F5/F6a/F7
selbst. Das ist mechanisch prüfbar (Abschnitt 4, D4/AK1-Gate).

### 2.2 WS-2a — E-186-Eskalation über F9, mit dem F-091-Nachweis

**Auslösung:** nach Schritt 4 aus 2.1, wenn `klassifikation.ergebnis ===
'VERWEIGERT' && (klassifikation.bypass_verdacht_anzahl ?? 0) > 0`.

**Eskalations-`laufId`:** eigene, vom auslösenden Lauf syntaktisch
verschiedene ID —

```ts
function eskalationsLaufId(ausloesenderLaufId: string): string {
  return `${ausloesenderLaufId}-eskalation-${randomUUID()}`
}
```

(`randomUUID`-Suffix statt einer festen `-eskalation`-Endung, damit ein
Lauf, der — außerhalb des Nicht-Ziel-Rands, aber ohne dass F8 es
verhindern müsste — mehrfach eskaliert werden könnte, nie zwei
Eskalationen unter derselben `laufId` erzeugt; `pruefeLaufId`
(`checkpoint-store/index.ts:75-84`) lässt Bindestriche ausdrücklich zu.)

**Ablauf:**

1. `erfasseBedarf(eskLaufId, profilReferenz, beschreibung, [{ pfad:
   `artefakt:laufakte-${ausloesenderLaufId}`, zitierter_bereich:
   `LAUFAKTE_V0 versionSequenz ${laufakteVersionSequenz},
   bypass_verdacht_anzahl ${bypassVerdachtAnzahl}`, inhalts_hash:
   sha256Hex(kanonischesJson(laufakteDaten)) }], optionen)` — der
   `pfad`-Schlüssel `artefakt:laufakte-<...>` ist dasselbe synthetische
   Muster wie F9s D2 (Abschnitt 0), hier zum ersten Mal für einen
   **Lauf-zu-Lauf**-Verweis statt eines artefaktinternen Verweises
   verwendet (siehe Offene Frage 1, Abschnitt 10).
2. `erzeugeTransportpaket(eskLaufId, profilReferenz, bedarfVersionSequenz,
   inhalt, executor, optionen)`.
3. `haendigeAus(eskLaufId, profilReferenz, optionen)` — schreibt
   `run_prepared` **unter `eskLaufId`**, nicht unter
   `ausloesenderLaufId`.

**Der Nachweis (F-091), Schritt für Schritt anhand des realen Schemas:**

- Vor der Eskalation: `stelleLaufstatusFest(ausloesenderLaufId)` liest
  `kontrollzustand/${ausloesenderLaufId}/checkpoints/*` (Abschnitt 0,
  `checkpointVerzeichnis`). Diese Kette enthält zu diesem Zeitpunkt genau
  ein `run_prepared` (aus `starteGateway`, Schritt 2.1.3) und ein
  `terminal` (aus `klassifiziereLauf`, Schritt 2.1.4) — FIFO-Paarung
  vollständig, Ergebnis `{ status: 'ABGESCHLOSSEN', ergebnis:
  'VERWEIGERT', ... }`.
- `haendigeAus(eskLaufId, ...)` ruft `schreibeWirkungsmarke(eskLaufId,
  ...)` (`human-transport/index.ts:148`), was
  `checkpointVerzeichnis(eskLaufId, basisVerzeichnis)` öffnet —
  `join(basisVerzeichnis, eskLaufId, 'checkpoints')`. Da `eskLaufId !==
  ausloesenderLaufId` (String-Suffix `-eskalation-<uuid>` macht Gleichheit
  strukturell unmöglich), ist dies ein **anderes** Verzeichnis auf der
  Festplatte. Die neue `run_prepared`-Datei landet dort, nicht in
  `kontrollzustand/${ausloesenderLaufId}/checkpoints/`.
- Nach der Eskalation: `stelleLaufstatusFest(ausloesenderLaufId)` erneut
  aufgerufen — `ladeGueltigeCheckpoints(ausloesenderLaufId)` liest
  wieder ausschließlich `kontrollzustand/${ausloesenderLaufId}/
  checkpoints/*`. Diese Menge hat sich durch den Eskalationsschritt
  nicht verändert (kein Schreibzugriff hat je in dieses Verzeichnis
  gezielt) — FIFO-Paarung liefert unverändert `{ status: 'ABGESCHLOSSEN',
  ergebnis: 'VERWEIGERT', ... }`. **Kein Rückfall auf
  `KLAERUNG_ERFORDERLICH`.**
- `stelleLaufstatusFest(eskLaufId)` liefert dagegen real
  `KLAERUNG_ERFORDERLICH` (offene `run_prepared` ohne Terminal) — das
  ist der **korrekte** Zustand: die Eskalation wartet auf eine
  menschliche Antwort (F9-Ablauf, `importiereAntwort` schreibt das
  Terminal erst nach Rückkehr). AK6 verlangt nicht, dass die Eskalation
  sofort abgeschlossen ist, nur dass der **auslösende** Lauf nicht
  kippt.

**Testfall (AK6), benannt (Muster: F9s Advisor-Pass-Auflage B2,
`state/advisor-findings-f9-human-transport.md` Zeile 36):**
`test('F-091: E-186-Eskalation unter eigener laufId lässt
stelleLaufstatusFest(ausloesenderLaufId) unverändert ABGESCHLOSSEN')` —
Ablauf exakt wie oben, mit Assertion vor **und** nach `haendigeAus`.
Zweiter Testfall für die Lineage-Seite:
`test('F-091: Eskalations-BEDARF_V0 referenziert laufakte-<ausloesenderLaufId> mit passendem inhalts_hash')`
— lädt `ladeArtefaktVersion('bedarf-' + eskLaufId)` und prüft
`eingaben[0].pfad === 'artefakt:laufakte-' + ausloesenderLaufId` sowie
den `inhalts_hash`-Abgleich gegen `kanonischesJson(laufakteDaten)`.

### 2.3 WS-2b — Erneuter Anlauf nach `KLAERUNG_ERFORDERLICH`/`FEHLGESCHLAGEN`

**Neue `laufId`:** vom Aufrufer (Mensch, über den Controller angestoßen)
gewählt — der Controller generiert sie nicht automatisch (Nicht-Ziel
„Automatischer Neustart", ARCHITECTURE §4). Vorschlag für die
Erzeugungsstelle (Leitstand/CLI, außerhalb dieses Moduls): `laufId =
`${vorgaengerLaufId}-retry-${n}`` oder eine unabhängig gewählte ID — F8
selbst verlangt nur *irgendeine* von `vorgaengerLaufId` verschiedene
`laufId`, keine feste Namenskonvention (kein Kandidat dafür in AK7
benannt).

**Lineage-Verweis:** in Schritt 2.1.1 (`baueKontextpaket` des neuen
Laufs) wird der `anfragen`-Liste ein zusätzlicher, synthetischer Eintrag
vorangestellt:

```ts
{
  pfad: `artefakt:laufakte-${vorgaengerLaufId}`,
  frage: 'Kontext des vorherigen, klärungsbedürftigen/fehlgeschlagenen Laufs',
  begruendung: 'Lineage-Verweis auf den Vorgängerlauf (AK7)',
  inhalt: kanonischesJson(vorgaengerLaufakteDaten),
  notwendig: true,
}
```

`baueKontextpaket` reicht `elemente` unverändert als `eingaben` an
`registriereKernArtefakt` durch (Abschnitt 0,
`context-builder/index.ts:180-206`) — der neue Lauf trägt den Verweis
damit bereits in seinem **ersten** F2-Artefakt (`kontextpaket-<neue
laufId>`), ohne dass F8 selbst `registriereKernArtefakt` aufrufen muss.
`notwendig: true`, damit Budgetverdrängung (Phase B) den Verweis nicht
stillschweigend ausschließen kann — ein fehlender Verweis führt sonst zu
`EVIDENZLUECKE`, einem regulären, benannten F5-Fehlerausgang, nicht zu
einem stillen Verlust der Lineage.

**Invariante (AK7, keine Fortsetzung):** der neue Lauf durchläuft
Abschnitt 2.1 vollständig unter seiner **eigenen** `laufId` — `starteGateway`
schreibt dessen eigene `run_prepared`-Marke (Abschnitt 0, Zeile 269),
`stelleLaufstatusFest(vorgaengerLaufId)` bleibt unberührt, exakt
dasselbe Isolationsargument wie in 2.2. Es gibt im gesamten Modul keinen
Aufruf, der `vorgaengerLaufId` an `schreibeWirkungsmarke`,
`schreibeCheckpoint` oder `starteGateway` übergibt — mechanisch mit
demselben Grep-Muster wie AK1 belegbar (Abschnitt 4, D4).

**Testfall (AK7):**
`test('AK7: erneuter Anlauf nach KLAERUNG_ERFORDERLICH erzeugt neue laufId, Kontextpaket referenziert laufakte-<vorgaengerLaufId>')`
— prüft `paket.elemente` bzw. den registrierten `eingaben`-Eintrag,
**und** dass `resumeZiel-Grep` (`grep -r "vorgaengerLaufId" | grep
schreibeWirkungsmarke\(vorgaengerLaufId` o. ä.) keinen Treffer im
Produktionscode liefert.

## 3. NICHT (Non-Scope, mit Grund)

- **A4-Zustandsebenen (Workstream/Execution)** — E-192, F-090
  (TECH_DEBT P1, bewusst offen). Der Controller kennt nur `laufId`.
- **Autorisierungs-/Startfreigabeprüfung** — vollständig in
  `starteGateway` (Abschnitt 0, E-193). Der Controller wertet nur
  `GatewayErgebnis.ok`/`grund` aus.
- **Prozessstart** — bleibt F6a (`starteProzess`/`prozessstart.ts`).
- **Klassifikationsregeln** — bleiben F7 (`ermittleErgebnis`).
- **Kontextpaket-Regeln, Budget, Rollen-Ausschlussmuster** — bleiben F5.
- **Automatischer Neustart einer bestehenden `laufId`** — jeder erneute
  Anlauf ist eine vom Aufrufer bewusst angestoßene, neue `laufId`
  (Abschnitt 2.3).
- **Konsolentext-Deutung** — der Controller liest ausschließlich
  strukturierte Rückgaben (`GatewayErgebnis`, `KlassifikationsErgebnis`,
  `LaufStatus`), nie `stdout`/`stderr` direkt (das bleibt F6a/F7-intern).
- **Leitstand-Bedienung** — kein Aufruf dieses Moduls aus
  `scripts/leitstand-server.mjs` in diesem Schritt; Feature #10 bleibt
  separat.
- **Erzeugung der Wiederaufnahme-`laufId` selbst** — F8 verlangt nur,
  dass sie sich von der Vorgänger-`laufId` unterscheidet, legt aber
  keine Namenskonvention fest (Abschnitt 2.3, offen für den Aufrufer).

## 4. Design-Entscheidungen

- **D1 (eigenständiges Modul, kein Fremdmodul-Touch):** analog zu F2
  gegenüber F1 und F3/F9 gegenüber F1B — `src/execution-controller/`
  ruft F1B, F2, F5, F6a, F7, F9 ausschließlich von außen auf. Gleiche
  Modulschnitt-Begründung wie F9s D1.
- **D2 (Lauf-zu-Lauf-Lineage über denselben synthetischen `pfad`-
  Schlüssel wie F9s D2, jetzt artefakt- statt laufübergreifend):** F2
  kennt keinen dedizierten „Lauf X verweist auf Lauf Y"-Mechanismus,
  nur artefakt-zu-artefakt-`eingaben`. F8 referenziert deshalb nicht die
  fremde `laufId` direkt, sondern deren **Laufakte-Artefakt**
  (`laufakte-<laufId>`, real vorhanden seit F6a) über denselben
  synthetischen `artefakt:<id>`-Schlüssel, den F9 für eine
  artefaktinterne Referenz (BEDARF_V0 innerhalb derselben `laufId`)
  bereits nutzt und dessen Grundmuster ein Advisor-Pass als „fachlich
  tragfähig" bestätigt hat (`state/advisor-findings-f9-human-
  transport.md`). **Neu gegenüber F9:** hier verweist das Muster zum
  ersten Mal über eine `laufId`-Grenze hinweg — das ist eine neue
  Anwendung desselben Bausteins, keine bereits geprüfte Wiederholung
  (Offene Frage 1, Abschnitt 10).
- **D3 (Eskalations-`laufId` mit `randomUUID`-Suffix statt fester
  Konvention):** eine feste Endung (`<laufId>-eskalation`) wäre
  deterministisch, aber kollidiert bei einer zweiten Eskalation
  desselben Laufs mit sich selbst. `randomUUID` vermeidet das ohne neue
  Regel für „darf ein Lauf mehrfach eskalieren" — diese Frage bleibt
  unentschieden offen (Abschnitt 10, Frage 3), aber die ID-Wahl blockt
  sie nicht.
- **D4 (Grep-Gate für AK1/AK3, Muster wie F6as AK12/AK14):** zwei
  Gate-Prüfungen in `scripts/check-f8-execution-controller.mjs`, jede
  mit Selbsttest (F6a-Präzedenz, Abschnitt 0):
  1. AK1-Grep: kein Vorkommen von Bezeichnern aus F5/F6a/F7s internen
     Regelfunktionen (`ROLLEN_AUSSCHLUSSMUSTER`, `pruefeUndVerweigereBeiTreffer`,
     `ermittleErgebnis`, `permission_denials`, `non_execution_kind`) in
     `src/execution-controller/*.ts` (außer `*.test.ts`).
  2. AK3-Grep: kein Vorkommen von `pruefeStartfreigabe`,
     `ermittleIstZustand`, `aktuelle-autorisierung` in
     `src/execution-controller/*.ts`.
  Beide mit demselben Selbsttest-Muster wie F6as AK14 (ein simulierter
  Verstoßstring muss vom Regex tatsächlich erkannt werden), damit das
  Gate nicht nur scheinbar prüft.
- **D5 (kein eigener `schreibeWirkungsmarke`-Aufruf für die
  Haupt-`laufId`):** `starteGateway` schreibt `run_prepared`, F7s
  `klassifiziereLauf` schreibt `terminal` — der Controller ruft
  `schreibeWirkungsmarke` für die Haupt-`laufId` an keiner Stelle direkt
  auf (nur mittelbar über F6a/F7). Für die Eskalations-`laufId` gilt das
  nicht: dort schreibt F9s `haendigeAus`/`importiereAntwort` beide
  Wirkungsmarken, ebenfalls kein direkter Controller-Aufruf.

## 5. Ablageort (Vorschlag für den Bau, hier nicht angelegt)

- `src/execution-controller/{index,types}.ts`,
  `execution-controller.test.ts` — neuer, eigenständiger Modulordner
  (D1).
- `scripts/check-f8-execution-controller.mjs` — Gate-Skript, Muster wie
  `check-f6a-claude-code-gateway.mjs` (D4).
- `state/gates.md`, `state/memory-map.md`, `docs/STATUS.md`,
  `features/F8/journal.md` — Einträge erst nach realem Bau-/Prüflauf,
  nicht Teil dieses Schritts.

## 6. Budget & Pässe

- Dieser Schritt liefert **nur** diesen Plan — kein Bau, kein
  Advisor-Pass, kein Handoff-Vertrag (Auftragsvorgabe).
- Empfohlener nächster Schritt: Advisor-Pass mit Fokus auf D2 (neue
  Lauf-zu-Lauf-Anwendung des synthetischen Schlüssels) und D3
  (Mehrfach-Eskalation, Abschnitt 10 Frage 3).
- Zuschnitt-Heuristik (`CLAUDE.md`): WS-1 ist ein zusammenhängender,
  reiner Orchestrierungs-Workstream ohne Fremdmodul-Änderung — ein
  Baudurchgang plus höchstens eine Korrekturrunde realistisch. WS-2 hängt
  zusätzlich an F9 (bereits erfüllt) und an der hier getroffenen D2/D3-
  Festlegung — beide Workstreams bleiben deshalb wie im Feature-Vorschlag
  getrennt, WS-2 nach WS-1.

## 7. Akzeptanzkriterien — Zuordnung zu Testfällen (Entwurf, vor Advisor-Pass nicht final)

| AK | Testfall (Kurzform) | Workstream |
|---|---|---|
| AK1 | Grün-Fall ruft F5/F6a/F7 je 1×; AK1-Grep (D4) findet keine Regel-Bezeichner im Controller | WS-1 |
| AK2 | F6a-Rot-Fall (z. B. verbotener Aufrufparameter) → `{ ok:false, stufe:'gateway', grund }` identisch zu `starteGateway`s Grund, kein `klassifiziereLauf`-Aufruf (Spy/Zähler) | WS-1 |
| AK3 | AK3-Grep (D4) findet keine Startfreigabe-Bezeichner im Controller | WS-1 |
| AK4 | zwei Testfälle: `bypass_verdacht_anzahl > 0` → `erfasseBedarf` real aufgerufen (Zähler/Spy); `=== 0` → kein Aufruf | WS-2a |
| AK5 | nach Grün-Durchlauf: `stelleLaufstatusFest(laufId).ergebnis === klassifikation.ergebnis`, Status `ABGESCHLOSSEN` | WS-1 |
| AK6 | die beiden F-091-Testfälle aus Abschnitt 2.2 | WS-2a |
| AK7 | der Testfall aus Abschnitt 2.3 | WS-2b |
| AK8 | Tests laufen ausschließlich gegen `Starter`-Attrappe (F6a-Primitiv), kein echter Claude-Code-Prozess, kein Netz | WS-1 |
| AK9 | `npm run check` → Exit 0 | WS-1+WS-2 |

## 8. Rollen für diesen Workstream

| Position | Träger | Rechte |
|---|---|---|
| Advisor | Subagent `architecture-advisor`, frisch | `Read, Grep, Glob` |
| Executor | Claude-Code-Sitzung, frisch, kennt nur Repo + Vertragsvolltext | voll im freigegebenen Pfad |
| Reviewer | Subagenten `code-reviewer`, `qa`, frisch | read-only |
| Mensch (Stefan) | — | Freigaben, Klärung Abschnitt 10, Release |

## 9. Nächste Schritte nach diesem Plan (nicht Teil dieses Auftrags)

1. Klärung der Offenen Punkte (Abschnitt 10) durch Stefan.
2. Advisor-Pass auf diese Datei (Fokus D2/D3).
3. Findings → `state/advisor-findings-f8-execution-controller.md`.
4. Falls nötig: plan-v2 als eigene Datei.
5. Handoff-Vertrag je Workstream (WS-1 zuerst, WS-2 danach) — erst
   danach, nicht Teil dieses Auftrags.

## 10. Offene Fragen

1. **D2 ist eine neue Anwendung, keine geprüfte Wiederholung:** F9s
   Advisor-Pass hat den synthetischen `artefakt:<id>`-Schlüssel nur für
   eine artefaktinterne Referenz (BEDARF_V0 innerhalb derselben `laufId`)
   geprüft. F8 nutzt dasselbe Muster zum ersten Mal, um zwei
   verschiedene `laufId`s zu verbinden. Das ist strukturell gedeckt
   (F2 erzwingt keine Dateisystemsemantik für `eingaben[].pfad`,
   Abschnitt 0), aber ohne eigene Prüfung — echter Advisor-Pass-Kandidat,
   kein Blocker für diesen Plan.
2. **Wiederaufnahme-`laufId`-Konvention (Abschnitt 2.3):** `feature.md`
   legt keine Namenskonvention fest, dieser Plan auch nicht (bewusst
   offen gelassen für den Aufrufer/Leitstand). Vor dem WS-2b-Bauauftrag
   sollte Stefan entscheiden, ob eine feste Konvention (`-retry-N`)
   gewünscht ist oder ob eine freie ID ausreicht.
3. **Mehrfach-Eskalation innerhalb desselben auslösenden Laufs:** vom
   Feature/AK nicht ausgeschlossen, aber auch nicht ausdrücklich
   vorgesehen. D3 verhindert eine ID-Kollision, aber die fachliche Frage
   „soll ein Lauf zweimal eskalieren dürfen" bleibt offen — kein
   Blocker (der Nicht-Ziel-Rand deckt nur „automatischer Neustart",
   nicht „mehrfache Eskalation").
4. **`GatewayOptionen`-Durchreichung (Testinfrastruktur):** `starteGateway`
   nimmt `optionen.starter`/`optionen.aktuelleAutorisierungPfad`/
   `optionen.settingsPfad`/`optionen.rohBasisVerzeichnis` entgegen
   (Abschnitt 0). Der Controller muss seine eigene `Optionen`-Form so
   entwerfen, dass Tests (AK8) alle diese Felder durchreichen können,
   ohne sie selbst zu interpretieren — Detailfrage für den
   Handoff-Vertrag, kein Plan-Blocker.

## Status
- [ ] Freigegeben
- [ ] Freigegeben mit Hinweisen
- [ ] Nicht freigegeben
- [ ] Blockiert

## Nächster sinnvoller Schritt
Freigabe dieses Plans durch Stefan, danach Klärung der Offenen Punkte
(Abschnitt 10) und Advisor-Pass mit Fokus D2/D3 — noch kein Bau.
