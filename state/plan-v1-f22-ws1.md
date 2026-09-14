# Plan v1 — F22 WS-1 (Click-to-Work, Router-Endpunkt, Serverseite)

Branch: `feat/f22-ws1-router-endpunkt`. Bezug: `features/F22/feature.md`
(Status `WORKSTREAM_SCHNITT_GENEHMIGT`), Bauauftrag Stefan 14.09.2026.

Ziel dieses Plans: sechs eng benannte Änderungen, ausschließlich
serverseitig (kein UI, das ist WS-2). Geprüfte Quellen: `ARCHITECTURE.md`,
`scripts/leitstand-server.mjs` (POST /api/laeufe, POST /api/workflows,
`starteLaufUndVergiss`, `loeseAusfuehrungsEingabenAuf`,
`loeseSchrittEingabenAuf`, `loeseAusgabeSchemaAuf`, `sammleAuftraege`,
D13-Vertragsprüfung in `scripts/check-f11-auftrag.mjs`), `src/router/index.ts`,
`src/ressourcen/index.ts`, `src/codex-gateway/index.ts`,
`src/claude-code-gateway/index.ts` (`leseErgebnisobjekt`),
`src/rollen/index.ts` (ROLLENVERTRAEGE.router), `workflow-vorlagen/standard.json`,
`ressourcen.json`, `scripts/route-auftrag.mjs` (CLI-Vorlage für den
Nachbearbeitungspfad), `scripts/eval-router.mjs`, `scripts/check-f18-router.mjs`,
`schemas/kontrollzustand-workflow-payload.schema.json` (Schema-Muster).

## 1. Neuer Endpunkt `POST /api/auftraege/<auftragId>/routen`

Ort: `scripts/leitstand-server.mjs`, direkt NACH dem `POST /api/laeufe`-Block
(endet aktuell bei `return }` nach `starteLaufUndVergiss(laufId, eingaben)`,
Zeile ~3287) und VOR dem `POST /api/workflows/<id>/starten`-Block (Zeile
~3297). Grund: `scripts/check-f11-auftrag.mjs`s D13-Vertragsprüfung sucht
`text.indexOf('if (laufAktiv)')` — das ERSTE Vorkommen im ganzen
Quelltext. Das liegt bereits in `POST /api/laeufe` (Zeile 3232); die neue
Route muss danach folgen, darf aber selbst kein früheres `if (laufAktiv)`
einführen (dieselbe Regel, `if (laufAktiv)` steht in meinem Block danach,
verletzt die Prüfung nicht, weil sie nur die erste Fundstelle bewertet).

Ablauf im Handler:

```
pfad.startsWith('/api/auftraege/') && pfad.endsWith('/routen') && req.method === 'POST'
```

Reihenfolge exakt wie im Bauauftrag verlangt:
1. `auftragId = dekodiereSegment(rohId)` (Muster `POST /api/workflows/<id>/starten`,
   `rohId` = Segment zwischen `/api/auftraege/` und `/routen`).
2. `LAUFID_UNZULAESSIGE_ZEICHEN.test(auftragId)` → 400 (Muster: mehrere
   bestehende Stellen, z. B. Zeile 3028/3300/3436).
3. `if (laufAktiv)` → 409 mit dem bestehenden Grundtext (wortgleich zu
   Zeile 3233/3381/3567: `` `ein anderer, über diese Serverinstanz
   gestarteter Lauf ('${laufAktivLaufId}') ist noch aktiv (D13) — genau
   ein aktiver Arbeitsstrang` ``).
4. `auftragVersion = ladeArtefaktVersion(\`auftrag-${auftragId}\`, undefined,
   { basisVerzeichnis, schreiber: STILLER_SCHREIBER })` → bei `null` 404
   (NEU: bisherige Aufträge/Workflows antworten bei fehlendem Auftrag mit
   400, dieser Endpunkt laut Bauauftrag ausdrücklich mit 404 — Ressource
   in der URL, RESTful korrekt, bewusst abweichend).
5. `laufId = \`router-${auftragId}-${Date.now()}\`` (Bauauftrag-Vorgabe,
   keine `randomUUID()` — Kollisionsrisiko bei Doppelklick binnen
   derselben Millisekunde besteht, ist aber durch `laufIdBelegt` UND durch
   D13 (`laufAktiv`) doppelt abgesichert: ein zweiter Klick während des
   ersten Laufs scheitert schon an Schritt 3).

Worker-Auflösung (Bauauftrag Punkt 1, Korrektur 4 der Akte):

```js
const ressourcenRoh = JSON.parse(readFileSync(join(repoWurzel, 'ressourcen.json'), 'utf8'))
const aufgeloest = loeseRessourcenAuf(ressourcenRoh.ressourcen, repoWurzel, startvorlagePfad)
const codexEintrag = aufgeloest.find((r) => r.id === 'codex')
const codexVerfuegbar = codexEintrag !== undefined && codexEintrag.verfuegbar === true
```

`startvorlagePfad` ist bereits eine Closure-Variable der
`erzeugeRequestHandler`-Funktion (Zeile 2238/2242, dieselbe, mit der
`vorlage` geladen wurde) — keine zweite Quelle. `repoWurzel` ebenso
(Zeile 2239).

- `codexVerfuegbar === true` → `worker = 'codex'`, `modell = 'gpt-6-astra'`,
  `ausgabeSchemaPfad` über `loeseAusgabeSchemaAuf('ergebnis-router', repoWurzel)`
  aufgelöst (liefert absoluten Pfad + BOM-/additionalProperties-Prüfung,
  Muster `loeseSchrittEingabenAuf` Zeile 1877-1884). Bei `!ok` → 500
  (Konfigurationsfehler: das mitgelieferte Schema selbst ist kaputt, kein
  Fachfall) — **[Offener Punkt, nicht stillschweigend entschieden]**: der
  Bauauftrag nennt für diesen Fall keinen Statuscode; ich wähle 500, weil
  `schemas/ergebnis-router.schema.json` ein Repo-Artefakt ist, dessen
  Kaputtheit ein Konfigurationsfehler des Servers ist, kein Klientfehler —
  Muster: andere 500er in diesem Handler-Cluster (z. B. Zeile 3179).
- sonst → `worker = 'claude-code'`, `modell` wie im bestehenden
  `claude-code`-Zweig — **[Offener Punkt, nicht stillschweigend
  entschieden]**: „wie im bestehenden claude-code-Zweig" ist im
  Bauauftrag nicht mit einem konkreten Modellnamen benannt. Es gibt
  keinen bestehenden Server-Code, der für Rolle `router` + `claude-code`
  ein Modell festlegt (das ist bisher IMMER über den HTTP-Body gekommen,
  `aufrufEingaben.modell`, z. B. `scripts/eval-router.mjs` Zeile 151:
  `'claude-sonnet-5'`). Ich übernehme `'claude-sonnet-5'` als Modellwert
  für den Rückfallzweig — konsistent mit `eval-router.mjs`, dem einzigen
  bestehenden Aufrufer eines `claude-code`-Router-Laufs. Zu bestätigen im
  Advisor-Pass.

Eingaben (Bauauftrag Punkt 1, letzter Absatz):

```js
const eingabenRoh = {
  rolle: 'router',
  anfragen: [],
  budget: vorlage.standardBudget,
  aufrufEingaben: { modell },
  auftragId,
  worker,
  ...(worker === 'codex' ? { ausgabeSchemaPfad } : {}),
}
const eingabenErgebnis = loeseAusfuehrungsEingabenAuf(
  eingabenRoh, 'lesend', auftragVersion.daten.auftragstext, vorlage, repoWurzel
)
```

`budget: vorlage.standardBudget` — Muster `loeseSchrittEingabenAuf` Zeile
1919 (Begründung dort: einzige verwendbare Budgetquelle einer
Serverkonfiguration, ein Startauftrag ohne HTTP-Body hat keine eigene).
`anfragen: []` — Muster `scripts/eval-router.mjs` Zeile 149 (der Router
klassifiziert den Auftragstext selbst, `auftragstext` fließt bereits über
den vierten Parameter von `loeseAusfuehrungsEingabenAuf` ein, keine
zusätzliche Anfrage nötig).

Bei `!eingabenErgebnis.ok` → 400 mit `eingabenErgebnis.grund` (Muster
Zeile 3263-3266).

Reservierung + Start (Muster Zeile 3271-3287, identisch):
```js
angenommeneLaufIds.add(laufId)
laufAktiv = true
laufAktivLaufId = laufId
laufAktivAbortController = new AbortController()
sendeJson(res, 202, { laufId })
starteLaufUndVergiss(laufId, eingabenErgebnis.eingaben, undefined, (ergebnis, fehler) => { /* Punkt 2 */ })
return
```

`laufIdBelegt(laufId)`-Prüfung: **[Offener Punkt, nicht stillschweigend
entschieden]** — der Bauauftrag nennt sie nicht in der Prüfreihenfolge
(nur auftragId-Dekodierung, D13, 404). Da `laufId` serverseitig aus
`Date.now()` gebildet wird (nicht vom Client), ist eine Kollision nur
innerhalb derselben Millisekunde UND nur, wenn D13 sie nicht ohnehin
verhindert (ein zweiter Request während des ersten `laufAktiv`-Fensters
scheitert schon an Schritt 3) — ich baue die Prüfung trotzdem ein
(Muster Zeile 3238-3241, gleicher Fehlertext), weil sie in jedem
bestehenden Startpfad steht und ihr Fehlen eine stille Asymmetrie wäre,
kein Aufwand zusätzlich.

## 2. Nachbearbeitung im `nachLauf`-Callback

Läuft im selben Callback, der als vierter Parameter an
`starteLaufUndVergiss` übergeben wird — NICHT als zweiter Endpunkt (Muster:
der `nachLauf`-Callback bei `POST /api/workflows/<id>/starten`, Zeile
2641-2760, dort mit Workflow-Fortschreibung statt Artefakt-Registrierung,
aber gleiches Grundmuster: `nachLauf(ergebnis, fehler)` läuft im selben
synchronen Tick wie der D13-Reset in `starteLaufUndVergiss`s `.then`).

```js
starteLaufUndVergiss(laufId, eingabenErgebnis.eingaben, undefined, (ergebnis, fehler) => {
  if (fehler !== null || ergebnis?.ok === false) {
    startfehlerListe.push({ zeitstempel: new Date().toISOString(), laufId, fehler: fehler !== null ? String(fehler?.message ?? fehler) : beschreibeAblehnung(ergebnis) })
    return // kein Artefakt, kein Workflow — Lauf ist schon in startfehlerListe (starteLaufUndVergiss selbst pusht bereits bei ok:false, siehe Zeile 2345 — DOPPELTER Eintrag zu vermeiden, siehe unten)
  }
  // ergebnis.ok === true ab hier
  ...
})
```

**[Offener Punkt, nicht stillschweigend entschieden]**: `starteLaufUndVergiss`
pusht bei `ergebnis.ok === false` bereits selbst einen `startfehlerListe`-
Eintrag (Zeile 2343-2347), BEVOR `meldeLaufende`/`nachLauf` aufgerufen
wird. Ein zusätzlicher Eintrag im `nachLauf`-Callback für denselben Fall
wäre eine Dopplung. Plan: im `nachLauf`-Callback bei `ergebnis?.ok ===
false` NICHTS zusätzlich in `startfehlerListe` schreiben (der Aufrufer hat
das schon getan) — nur bei `fehler !== null` (Wurf, den `starteLaufUndVergiss`
im `.catch`-Zweig ebenfalls schon einträgt, Zeile 2352-2360) ebenso nichts
Zusätzliches. Der `nachLauf`-Callback tut in beiden nicht-erfolgreichen
Fällen NICHTS außer `return` — die Fehlerbehandlung ist bereits vollständig
durch `starteLaufUndVergiss` selbst erledigt (anders als beim
Workflow-Schritt-Callback, der zusätzlich einen Workflow-Fortschritt
schreiben MUSS, weil dort ein Automat weiterläuft; hier gibt es ohne
Erfolg nichts weiter zu tun — kein Workflow-Zustand hängt vom Ausgang ab).

Bei Erfolg (`ergebnis.ok === true`):

```js
const laufakteVersion = ladeArtefaktVersion(`laufakte-${laufId}`, undefined, ladeOptionenLokal)
const laufakte = laufakteVersion.daten // darf hier nicht null sein: ok:true impliziert eine geschriebene Laufakte (F6a-Vertrag)
const rohInhalt = readFileSync(laufakte.rohstrom_referenz.pfad, 'utf8')
const rohstrom = JSON.parse(rohInhalt)

let klassifikationsText = null
if (laufakte.worker === 'codex') {
  const ereignisse = leseCodexEreignisse(rohstrom.stdout)
  klassifikationsText = ereignisse.letzteAgentMessage
} else {
  const ergebnisobjekt = typeof rohstrom.stdout === 'string' ? leseErgebnisobjekt(rohstrom.stdout) : null
  klassifikationsText = ergebnisobjekt !== null && typeof ergebnisobjekt.result === 'string' ? ergebnisobjekt.result : null
}

if (klassifikationsText === null) {
  startfehlerListe.push({ zeitstempel: ..., laufId, fehler: `Router-Lauf '${laufId}' (worker '${laufakte.worker}'): kein Klassifikationstext im Rohstrom gefunden` })
  return
}

let beobachtung = null
let klassifikation
try {
  klassifikation = JSON.parse(klassifikationsText)
} catch {
  if (laufakte.worker === 'claude-code') {
    const entzaunt = entferneCodezaun(klassifikationsText) // NEUE reine Funktion, Punkt 2 unten
    if (entzaunt !== null) {
      try {
        klassifikation = JSON.parse(entzaunt)
        beobachtung = 'fence_entfernt'
      } catch { klassifikation = undefined }
    }
  }
}
if (klassifikation === undefined) {
  startfehlerListe.push({ ..., fehler: `Router-Lauf '${laufId}': Klassifikationstext ist kein gültiges JSON` })
  return
}

const verstoesse = validiereErgebnisRouter(klassifikation)
if (verstoesse.length > 0) {
  startfehlerListe.push({ ..., fehler: `Router-Lauf '${laufId}': Klassifikation verstößt gegen schemas/ergebnis-router.schema.json: ${verstoesse.join('; ')}` })
  return
}
// ... weiter zu Punkt 3/4
})
```

Fence-Stripping-Funktion (Bauauftrag: „eigene reine Funktion + Unit-Test"):

```js
/** Entfernt einen ```lang\n...\n``` -Codezaun, falls vorhanden; sonst null. Reine Funktion, kein Wurf. */
function entferneCodezaun(text) {
  const getrimmt = text.trim()
  if (!getrimmt.startsWith('```')) return null
  return getrimmt.replace(/^```[a-zA-Z]*\s*/, '').replace(/```\s*$/, '')
}
```

Muster identisch zu `scripts/eval-router.mjs` Zeile 241 (dort inline,
NUR forensisch/berichtend) — hier wird sie PRODUKTIV, deshalb eigene
benannte, exportierte Funktion mit eigenem Unit-Test unter
`scripts/leitstand-server.test.mjs` (falls die Datei existiert) oder
einem neuen `scripts/check-f22-click-to-work.mjs`-Fall. **[Offener Punkt,
nicht stillschweigend entschieden]**: `node:test`-Dateien für
`scripts/*.mjs` existieren im Repo bislang nicht durchgängig (die
Prüftiefe für `leitstand-server.mjs` läuft über die `check-f*.mjs`-Gates,
nicht über `node:test`). Ich lege den Unit-Test für `entferneCodezaun`
als eigene, kleine `node:test`-Datei `scripts/leitstand-server.entferne-codezaun.test.ts`
an (Wrapper importiert die exportierte Funktion) ODER teste sie über das
Gate `check-f22-click-to-work.mjs` mit `assert`-Aufrufen (Muster:
`check-f18-router.mjs`s Selbsttest-Stil, Zeile 321-333 in
`check-f11-auftrag.mjs`). Tendenz: Gate-Selbsttest, weil das Repo für
`scripts/*.mjs`-Helfer durchgängig dieses Muster nutzt (kein
`*.test.ts` neben `leitstand-server.mjs` vorhanden) — zu bestätigen.

## 3. Router-Ergebnis als Kernartefakt

Neues Schema `schemas/kontrollzustand-router-ergebnis-payload.schema.json`
(Muster `schemas/kontrollzustand-workflow-payload.schema.json`,
`additionalProperties: false`):

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://ai-workforce.local/schemas/kontrollzustand-router-ergebnis-payload.schema.json",
  "title": "Router-Ergebnis-Payload",
  "type": "object",
  "additionalProperties": false,
  "required": ["router_ergebnis_schema", "auftrag_id", "lauf_id", "worker", "klassifikation", "vorlage", "beobachtung", "erstellt_am"],
  "properties": {
    "router_ergebnis_schema": { "const": "v0" },
    "auftrag_id": { "type": "string", "minLength": 1 },
    "lauf_id": { "type": "string", "minLength": 1 },
    "worker": { "enum": ["claude-code", "codex"] },
    "klassifikation": { "type": "object" },
    "vorlage": { "enum": ["fast-lane", "standard", "hoch"] },
    "beobachtung": { "enum": [null, "fence_entfernt"] },
    "erstellt_am": { "type": "string", "minLength": 1 }
  }
}
```

**[Offener Punkt, nicht stillschweigend entschieden]**: `klassifikation`
als `{"type": "object"}` ohne Unterschema dupliziert die Form nicht aus
`ergebnis-router.schema.json` — Absicht (D5: die Form ist schon in
`validiereErgebnisRouter` geprüft, BEVOR das Artefakt entsteht; ein
JSON-Schema mit derselben Form wäre eine zweite, unabhängig verfallende
Kopie). Handgeschriebener Validator `validiereRouterErgebnisDaten` in
`src/router/index.ts` (Muster `validiereErgebnisRouter`), der für
`klassifikation` NICHT die Feldform nachprüft, sondern nur
`validiereErgebnisRouter(daten.klassifikation).length === 0` verlangt —
Wiederverwendung, kein zweiter Regelsatz.

Registrierung im `nachLauf`-Callback, nach bestandener Validierung:

```js
const routerErgebnisDaten = {
  router_ergebnis_schema: 'v0',
  auftrag_id: auftragId,
  lauf_id: laufId,
  worker: laufakte.worker,
  klassifikation,
  vorlage: klassifikation.kontrolltiefe,
  beobachtung,
  erstellt_am: new Date().toISOString(),
}
const verstoesseRouterErgebnis = validiereRouterErgebnisDaten(routerErgebnisDaten)
if (verstoesseRouterErgebnis.length > 0) { /* sollte durch obige Prüfungen nie auftreten — Konfigurationsfehler, in startfehlerListe */ return }

const routerArtefakt = registriereKernArtefakt(
  `router-${auftragId}`,
  profilReferenz,
  { erzeuger: 'kern', schritt: 'router-lauf' },
  routerErgebnisDaten,
  [{ pfad: `artefakt:auftrag-${auftragId}`, zitierter_bereich: 'auftragstext', inhalts_hash: auftragVersionInhaltsHash }],
  ladeOptionenLokal
)
```

**[Offener Punkt, nicht stillschweigend entschieden]**: Bauauftrag nennt
die Artefakt-ID `lineage-router-<auftragId>` — das ist der VERZEICHNISNAME
(`AUFTRAG_VERZEICHNIS_PRAEFIX`-Muster, `lineage-` ist ein von
`registriereKernArtefakt` selbst vorangestelltes Präfix, siehe
`sammleAuftraege` Zeile 864-865: „registriereAuftrag→registriereKernArtefakt
schreibt real unter lineage-auftrag-<auftragId>, nicht auftrag-<auftragId>").
`registriereKernArtefakt`s erstes Argument (`artefaktId`) ist deshalb
`router-${auftragId}` OHNE `lineage-`-Präfix (das Präfix kommt aus der
Funktion selbst) — Muster: jeder bestehende Aufruf (`entscheidung-${...}`,
`laufakte-${...}`, `kontextpaket-${...}`) übergibt ebenfalls das Präfix
NICHT mit. Zu verifizieren: `src/lineage-registry/index.ts:85-` (bereits
gelesen, kein `lineage-`-Zusatz im Funktionskörper sichtbar außer über den
Pfadaufbau selbst — zu bestätigen im Advisor-Pass, da ich den
Pfadaufbau-Teil der Funktion nicht vollständig gelesen habe).

`inhalts_hash` für die Lineage-Referenz: `auftragVersion.inhaltsHash`
(von `ladeArtefaktVersion` zurückgegeben, Muster Zeile 3127-3129) — Feld
muss aus dem bereits geladenen `auftragVersion`-Objekt stammen (kein
zweites `ladeArtefaktVersion`, D5/Performance).

## 4. Workflow-Registrierung im Anschluss

Direkt nach Punkt 3, im selben `nachLauf`-Callback:

```js
const workflow = waehleWorkflowVorlage(klassifikation, auftragId, auftragVersion.daten.titel ?? auftragId)
```

**[Offener Punkt, nicht stillschweigend entschieden]**: `waehleWorkflowVorlage`
verlangt einen `ziel`-Parameter (dritter Parameter, Freitext, ersetzt
`__ZIEL__` in der Vorlage). Der Bauauftrag benennt keine Quelle dafür.
`auftragVersion.daten` trägt laut `sammleAuftraege` (Zeile 890) die
Felder `titel` und `erstellt_am` — vermutlich auch `auftragstext` (wird
bereits an anderer Stelle als `auftragVersion.daten.auftragstext`
gelesen, Zeile 3262). Plan: `ziel = auftragVersion.daten.titel` (kurzer,
für einen Workflow-`ziel`-Freitext passender Wert; `auftragstext` kann
sehr lang sein und würde `WORKFLOW_V0.ziel` — laut Schema nur
`minLength: 1`, keine Obergrenze, aber inhaltlich ist `ziel` ein
Kurztext in jeder bestehenden Workflow-Instanz, siehe
`workflow-vorlagen/standard.json`s `__ZIEL__`-Platzhalter neben `titel`-
artigen Werten in Tests) — zu bestätigen im Advisor-Pass, da ich
`sammleAuftraege`s volle Feldliste nicht abschließend verifiziert habe
(nur `titel`/`erstellt_am` explizit gelesen, Zeile 890; `auftragstext`
nur indirekt über den bekannten Zugriff an anderer Stelle).

Registrierung über denselben internen Pfad wie `POST /api/workflows`
(Bauauftrag Punkt 4: „ueber denselben internen Pfad ... inklusive
validiereWorkflowDaten"):

```js
const workflowVerstoesse = validiereWorkflowDaten(workflow)
if (workflowVerstoesse.length > 0) { startfehlerListe.push(...); return }
if (LAUFID_UNZULAESSIGE_ZEICHEN.test(workflow.workflow_id)) { startfehlerListe.push(...); return }
// GESPERRTE_ERSETZUNGS_STATUS-Prüfung entfällt: waehleWorkflowVorlage liefert immer status:'OFFEN' (Vorlagen-Konstante) — kein Bestand-Ladevorgang nötig, ABER:
const bestand = ladeArtefaktVersion(`workflow-${workflow.workflow_id}`, undefined, ladeOptionenLokal)
const bestandUngueltig = bestand !== null && validiereWorkflowDaten(bestand.daten).length > 0
if (bestand !== null && !bestandUngueltig && GESPERRTE_ERSETZUNGS_STATUS.has(bestand.daten?.status)) {
  startfehlerListe.push({ ..., fehler: `Workflow '${workflow.workflow_id}' existiert bereits mit status '${bestand.daten?.status}' — Router-Ergebnis wurde registriert, Workflow NICHT ersetzt` })
  return // Artefakt aus Punkt 3 bleibt stehen, aber kein Workflow — AK2 (genau ein Vorschlag) bleibt gewahrt: ein zweiter Klick während LAEUFT/WARTET_FREIGABE/ABGESCHLOSSEN erzeugt keinen Workflow, aber ein neues Router-Artefakt (Historie, kein Schaden)
}
const registriert = registriereWorkflow(workflow, profilReferenz, { basisVerzeichnis })
```

**[Offener Punkt, nicht stillschweigend entschieden]**: der Bauauftrag
sagt „ueber denselben internen Pfad, den POST /api/workflows nutzt,
inklusive validiereWorkflowDaten" — er nennt NICHT ausdrücklich, ob die
`GESPERRTE_ERSETZUNGS_STATUS`-Prüfung (die POST /api/workflows vor jedem
Schreiben macht, Zeile 3059-3067) hier mitgezogen werden soll. Ich ziehe
sie mit: `waehleWorkflowVorlage` erzeugt IMMER `status:'OFFEN'` (der
eingereichte Datensatz selbst ist also nie gesperrt), aber der BESTAND
(ein vorheriger Workflow unter derselben `workflow_id =
router-<auftragId>`, deterministisch laut `leiteWorkflowIdAb`) kann
`LAEUFT`/`WARTET_FREIGABE`/`ABGESCHLOSSEN` tragen — ohne diese Prüfung
würde ein zweiter Routing-Versuch während eines laufenden Workflows
dessen Fassung unter dem laufenden Schritt ersetzen (exakt der Schaden,
den F15 WS-2b verhindert, Zeile 3039-3041). AK2 der Akte („ein zweiter
Klick ohne ausdrückliches 'neu routen' erzeugt keinen weiteren Lauf")
und die bestehende D13-Sperre verhindern den GLEICHZEITIGEN Fall; dieser
Zweig fängt den NACHGELAGERTEN Fall (Workflow läuft/wartet auf Freigabe,
ein zweiter Router-Lauf schließt trotzdem ab, weil D13 ihn nicht mehr
sperrt, sobald der erste Lauf beendet ist). Die
Planänderungs-/Freigabe-Abschwächungs-Prüfung (Zeile 3084-3141,
`ermittleFreigabeAbschwaechungen`) wird NICHT mitgezogen — sie gehört zu
menschlich eingereichten Planänderungen mit `begruendung`, nicht zu einer
automatisch aus einer Klassifikation erzeugten Erstfassung; eine frische
`waehleWorkflowVorlage`-Vorlage trägt ohnehin keine ZWINGEND-Schritte, die
zu OFFEN/AUTOMATISCH abgeschwächt werden könnten (jeder Schritt trägt
seine Vorlagen-`freigabe` unverändert). Zu bestätigen im Advisor-Pass.

`ladeOptionenLokal = { basisVerzeichnis, schreiber: STILLER_SCHREIBER }`
(Muster Zeile 2454).

## 5. `workitem_referenz` in `sammleAuftraege`

`scripts/leitstand-server.mjs`, Zeile 878-894. Erweiterung:

```js
const workitemMuster = /^workitem:[^:\s]+:[^:\s]+$/  // Form 'workitem:<quelle>:<id>', Muster grob an LAUFID_UNZULAESSIGE_ZEICHEN-Stil
...
const workitemZeile = typeof version.daten?.auftragstext === 'string'
  ? version.daten.auftragstext.split('\n').find((zeile) => workitemMuster.test(zeile.trim()))
  : undefined
const workitemReferenz = workitemZeile !== undefined ? workitemZeile.trim() : null
eintraege.push({ auftragId, titel: version.daten?.titel, erstellt_am: erstelltAm, workitem_referenz: workitemReferenz })
```

**[Offener Punkt, nicht stillschweigend entschieden — GRÖSSTE
Unsicherheit dieses Plans]**: Der Bauauftrag sagt „aus dem bereits
geladenen auftragstext die Referenz `workitem:<quelle>:<id>` lesen" —
aber NENNT NICHT das exakte Format, in dem diese Referenz im
Auftragstext steht (eigene Zeile? Präfix? JSON-Feld? Markdown-Anmerkung?).
Ich habe KEINE bestehende Stelle im Repo gefunden, die einen Auftrag mit
einer `workitem:`-Referenz im `auftragstext` erzeugt (F21/Workboard ist
WS-2-Voraussetzung, nicht Teil dieses gelesenen Codes) — das Format ist
vermutlich Teil von F21 (Workboard) oder einer noch zu bauenden
WS-2-Konvention, die WS-1 VORWEGNIMMT, ohne dass die Gegenseite (wer
schreibt diese Zeile in den Auftragstext?) in diesem Workstream sichtbar
ist. **Dies ist der Punkt, den ich dem Advisor als Fokus gebe** — ohne
reale Belegstelle für das Format ist jede Regex hier eine Annahme, die
beim WS-2-Bau (oder beim ersten echten Klick) widerlegt werden kann.
Fallback-Plan, falls der Advisor keine bessere Quelle findet: das Feld
bleibt bewusst so tolerant wie möglich (eine ganze Zeile, die dem Muster
entspricht) und wird in einem Kommentar EXPLIZIT als „[Annahme]"
gekennzeichnet, mit Verweis auf `features/F22/feature.md`s Korrektur 3
als einzige Quelle.

## 6. Gate `scripts/check-f22-click-to-work.mjs`

Muster `scripts/check-f18-router.mjs`/`scripts/check-f11-auftrag.mjs`
(Grep+Selbsttest für den D13-Kontrakt, Datenrot-/Grünfälle über einen
echten `erzeugeRequestHandler`-Aufruf gegen ein Wegwerf-`basisVerzeichnis`
unter `os.tmpdir()`, kein Mock des Werkzeuglaufs — Muster:
`fuehreAufgabeDurchFn`-Ersatzfunktion, wie es vermutlich in
`check-f15-automat-real.mjs` oder `check-f11-auftrag.mjs` bereits für
den `/starten`-Pfad gemacht wird — **[Offener Punkt, nicht
stillschweigend entschieden]**: ich habe `check-f15-automat-real.mjs`
NICHT gelesen und kenne das exakte Testmuster für einen "echten" Lauf
gegen eine Attrappen-`fuehreAufgabeDurchFn` nicht im Detail — vor der
Umsetzung von Punkt 6 lese ich diese Datei als Vorlage, das ist keine
Planänderung, nur eine noch ausstehende Recherche).

Drei kalibrierte Fälle (Bauauftrag):
- (a) Workflow-Vorschlag ohne persistiertes Router-Artefakt wird
  abgelehnt — AK7/Rot-Fall der Akte. Interpretation: ein Aufruf von
  `POST /api/workflows/<id>/starten` (oder die Vorschlag-Anzeige) für
  einen `workflow_id = router-<auftragId>`, zu dem KEIN
  `router-<auftragId>`-Artefakt existiert, wird abgelehnt. **[Offener
  Punkt]**: der genaue Ablehnungsmechanismus ist nicht Teil der sechs
  Scope-Punkte oben (keiner davon prüft beim STARTEN eines Workflows auf
  ein zugehöriges Router-Artefakt) — zu klären, ob AK7 damit gemeint ist,
  dass Punkt 4 selbst SO gebaut ist, dass ein Workflow nur entstehen
  KANN, wenn zuvor Punkt 3 erfolgreich war (das ist mit der Reihenfolge
  im `nachLauf`-Callback bereits strukturell erzwungen — es gibt in
  diesem Workstream keinen Pfad, der einen Workflow OHNE vorheriges
  Router-Artefakt registriert), und der Gate-Test genau das nachweist
  (z. B.: ruft die interne Registrierungsfunktion direkt mit
  präparierten Daten auf und zeigt, dass ohne vorheriges Artefakt ein
  Fehlerpfad greift). Zu bestätigen im Advisor-Pass.
- (b) 409 bei `laufAktiv` — direkter Test: Server mit `laufAktiv` auf
  `true` simulieren (zwei Requests kurz hintereinander, zweiter muss 409
  bekommen) — Muster `check-f11-auftrag.mjs` AK7-Selbsttest oder ein
  echter Integrationstest mit einer langsamen `fuehreAufgabeDurchFn`-
  Attrappe.
- (c) schemawidrige Klassifikation erzeugt weder Artefakt noch Workflow,
  sondern Startfehler — Test ruft die Nachbearbeitungslogik (oder den
  gesamten Handler mit einer `fuehreAufgabeDurchFn`-Attrappe, die eine
  Laufakte mit ungültigem `result`-JSON zurückgibt) auf und prüft:
  `existsSync` für `lineage-router-<id>` ist false, `startfehlerListe`
  trägt einen Eintrag.

In `npm run check` einhängen: `package.json`, `scripts`-Feld, neuer
`&& node scripts/check-f22-click-to-work.mjs`-Baustein VOR `&& npm run
test` (Muster: ans Ende der bestehenden Kette, wie jeder vorige
`check-f2X`-Eintrag).

## Reihenfolge der Umsetzung

1. Schema + Validator (`validiereRouterErgebnisDaten`, `src/router/index.ts`) +
   Beispiel-Dateien unter `schemas/examples/` (valid + mind. 2 invalid).
2. `entferneCodezaun` als exportierte reine Funktion in
   `scripts/leitstand-server.mjs`.
3. Endpunkt + Nachbearbeitung + Workflow-Registrierung (Punkte 1/2/3/4) in
   einem Zug, da sie einen zusammenhängenden Codeblock bilden.
4. `workitem_referenz` (Punkt 5), unabhängig, kleiner Diff.
5. Gate `check-f22-click-to-work.mjs` (Punkt 6), zuletzt — braucht den
   fertigen Endpunkt als Prüfgegenstand.
6. `npm run check` grün, dann `code-reviewer` + `qa` (frischer Kontext,
   Pflicht laut CLAUDE.md DoD), dann `git-flow`.

## Risiken / Nicht behandelt (bewusst außerhalb des Scopes)

- Prompt-Inhalt für die Klassifikation: `loeseAusfuehrungsEingabenAuf`
  baut den finalen Modell-Prompt NICHT rollen-spezifisch (geprüft:
  `src/execution-controller/index.ts:279`, der Prompt ist wörtlich
  `Auftrag:\n${auftragstext}` plus Evidenz — keine automatische
  „klassifiziere als JSON"-Anweisung). Für `codex` erzwingt
  `--output-schema` die Struktur trotzdem; für den `claude-code`-Rückfall
  gibt es keinen entsprechenden Mechanismus. Das ist ein bestehender,
  dokumentierter Zustand (F-337, `state/findings.md`) und explizit
  Nicht-Ziel von F22 laut Akte — nicht Teil dieses Plans, nur benannt,
  damit ein schlechter `claude-code`-Rückfall-Testlauf nicht als Bug
  dieses Workstreams missverstanden wird.
- UI/Terminal-Block/Ablehnungs-Artefakt: WS-2/F23, nicht hier.
