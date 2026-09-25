# Plan v1 — F35 WS-3 „ADJUST-Automatik"

Auftrag: siehe Konversation (Ziel/Kontext/Scope/AK oben). Kurzfassung: endet
ein Review-Schritt mit BLOCKIERT-Urteil oder mit AK-Verstößen, legt der Kern
automatisch dieselbe Abnahme-Entscheidung an, die heute nur ein Mensch über
POST `/api/workflows/<id>/abnahme` (ergebnis `ANPASSUNG_ANGEFORDERT`)
anlegen kann — mit Lineage-`erzeuger: 'kern'` statt `'mensch'`. Start bleibt
ZWINGEND: der Automat ruft `starteWorkflowSchritt` für die zurückgesetzte
`ausfuehrung` nie selbst auf.

## Verifizierter Bestand (gelesen, nicht angenommen)

- `scripts/leitstand-server.mjs:7568-7868` — POST `.../abnahme`. Der
  ANPASSUNG_ANGEFORDERT-Zweig (7781-7855): baut `bezug`
  (`workflow_version`, `ausfuehrung_lauf_id`, `review_lauf_id`), registriert
  `entscheidung-workflow-<id>-abnahme` mit `herkunft {erzeuger:'mensch',
  schritt:'entscheidung-workflow-abnahme'}`, setzt dann über
  `schreibeWorkflowFortschritt` `schritt-1-ausfuehrung` UND den
  Review-Schritt auf `OFFEN`/`lauf_id:null` zurück (mit
  `ermittleNaechstenSchritt`/`workflowStatusZuAusgang`/
  `beschreibeAutomatAusgang`), OHNE selbst `starteWorkflowSchritt`
  aufzurufen — "es wird nur geschrieben" (Kommentar Z. 7793).
- `scripts/leitstand-server.mjs:4122-4746` — `starteWorkflowSchritt`. Der
  `starteLaufUndVergiss`-Rückruf (4446-4743) berechnet nach jedem Lauf
  `urteil`/`akVerstoesse` NUR für `schritt.output_schema ===
  'ergebnis-code-reviewer'` UND `!heilbar && schrittStatus ===
  'ERFOLGREICH'` (4479-4498), schreibt den Fortschritt über
  `schreibeWorkflowFortschritt` (4624-4670) und setzt NUR fort
  (`starteWorkflowSchritt` erneut, 4727), wenn `naechster.art === 'starte'`
  (4725) — ein `haltKlaerung`-Ausgang (Regel 1b/1i) endet hier bereits
  still. Genau diese Stelle, NACH Zeile 4724 (eingefroren-Prüfung) und VOR
  Zeile 4725, ist der Hook-Punkt für den automatischen Auslöser.
- `laufAktiv`/`globalerLaufZustand.aktiv` sind an dieser Stelle bereits
  synchron auf `false` zurückgesetzt (Reset in `starteLaufUndVergiss` VOR
  dem `meldeLaufende`-Aufruf, `scripts/leitstand-server.mjs:4006-4014`,
  ohne `await` dazwischen) — D13 ist frei, kein Aufrufer kann in diesem
  synchronen Tick dazwischenfunken.
- `src/workflow/index.ts:768-828` — Regel 1b (Urteil ≠
  BEREIT/BEREIT_NACH_KORREKTUR → `haltKlaerung`) und Regel 1i
  (`akVerstoesse` nicht leer → `haltKlaerung`, unabhängig vom
  Gesamturteil). Beide bereits vorhanden (F35 WS-2), NICHT Teil dieses
  Scopes — WS-3 baut nur EINEN ZUSÄTZLICHEN Schritt NACH diesem bereits
  geschriebenen `haltKlaerung`-Zustand.
- `scripts/leitstand-server.mjs:3087-3103` `leseUrteilAusLaufakte` —
  liefert `null` (das GANZE Objekt, nicht nur `urteil`), wenn
  `geparst.urteil` kein String ist. Ein Reviewer-Ergebnis ganz ohne
  `urteil`-Feld liefert damit AUCH `ak_urteile: []` an den Aufrufer (kein
  Objekt zum Auslesen mehr) — das ist wichtig für Gate-Fall (e), siehe
  unten.
- `src/ak-pruefung/index.ts` `pruefeAkUrteile` — reine Funktion, liefert
  `string[]` (leer = gültig). Jeder Verstoß-String nennt die betroffene
  `ak_id` bereits wörtlich (z. B. "AK 'AK2': Urteil ... ist nicht
  'ERFUELLT'") — löst AK-Punkt "Begründung nennt die AK-ID" ohne
  Zusatzlogik.
- `src/korrekturschleife/index.ts` — `KorrekturBefund`-Interface
  (`schwere?`, `fundstelle?`, `zusammenfassung?`, `beleg?`) und
  `baueAusfuehrungKorrekturInstruktion`/`baueReviewKorrekturInstruktion`
  als Formmuster für `baueAutomatischeAnpassungsBegruendung`.
- F-648-Block (`scripts/leitstand-server.mjs:4251-4274`): liest die
  JEWEILS LETZTE Abnahme-Entscheidung über dieselbe Artefakt-ID
  (`entscheidung-workflow-<id>-abnahme`) und prüft NUR `.ergebnis ===
  'ANPASSUNG_ANGEFORDERT'` — liest `herkunft.erzeuger` NICHT. Eine
  automatisch geschriebene Anpassung mit `erzeuger:'kern'` wird von der
  bestehenden Korrekturschleife dadurch OHNE jede Änderung an diesem Block
  aufgegriffen (AK3) — reines Konsumverhalten, kein neuer Code nötig.
- `src/lineage-registry/index.ts:159` — `ArtefaktVersion.herkunft` trägt
  `daten.herkunft` roh; `listeVersionen`/`ladeArtefaktVersion` liefern es
  mit. `erzeuger: 'kern'` ist im Schema bereits ein gültiger Wert (Muster
  `schemas/examples/kontrollzustand-lineage-kern.valid.json`, im Repo
  bereits für `nach-lauf-aenderungsuebersicht`/`nach-lauf-pruefschritt`
  verwendet) — KEINE Schemaänderung nötig, nur ein neuer `schritt`-Wert am
  bestehenden `entscheidung-workflow-abnahme`-Namen (unverändert) mit
  variablem `erzeuger`.
- `scripts/check-f659-review-korrektur-begruendung.mjs` und
  `scripts/check-f35-ws2-urteil-je-ak.mjs` — Muster für Gate (6): echter
  HTTP-Server (`erzeugeRequestHandler`), gestubbtes
  `fuehreAufgabeDurchFn` (fängt `auftragstext` je `laufId` ab, registriert
  bei `rolle === 'code-reviewer'` real eine `laufakte-<laufId>` mit
  fabriziertem Rohstrom), Workflow-Fixture direkt über `registriereWorkflow`
  (NICHT die reale `workflow-vorlagen/standard.json`, die zusätzlich einen
  Architekt-Schritt trägt). check-f35-ws2 zeigt zusätzlich den
  `POST /api/features/<id>/auftrag`-Weg mit einem Wegwerf-"Fremdprojekt"
  (`features/<id>/feature.md`, git-Repo, NICHT auf main/master).
- `scripts/leitstand-server.mjs:6830-6929` POST `.../freigabe` — liest
  `ermittleNaechstenSchritt(workflowDaten)` und verlangt `art ===
  'haltFreigabe'`; setzt seit WS-2c bei Erfolg selbst fort (startet den
  freigegebenen Schritt automatisch, kein zweiter POST `.../starten`
  nötig — nicht wortwörtlich nachgelesen bis zum Funktionsende, siehe
  „Offener Punkt" unten).

## Entwurf

### 1. Neues Modul `scripts/leitstand/f35-ws3-adjust-automatik.mjs`

Reine/fast-reine Fachlogik (ARCHITECTURE.md M5/CLAUDE.md: "Fachlogik in
scripts/leitstand/\<modul\>.mjs, der Server registriert bzw. ruft nur auf").
Importiert NUR aus `src/` (Muster `scripts/leitstand/routen-f39.mjs` — KEIN
Import aus `scripts/leitstand-server.mjs`, um keinen Zirkelimport
einzuführen; kein bestehendes `scripts/leitstand/*.mjs`-Modul importiert
heute aus `leitstand-server.mjs`, das wird hier NICHT als erstes
eingeführt).

Exports:

- `baueAutomatischeAnpassungsBegruendung(urteil, befunde, akVerstoesse,
  iteration)` — reine Funktion. Fester Kopf `Automatische Anpassung
  (Iteration ${iteration} von max. 3) nach Review-Urteil ${urteil ??
  'unbekannt'}:`, danach Abschnitt "Befunde" (je Eintrag `schwere` /
  `fundstelle` / `zusammenfassung`, Muster
  `baueReviewKorrekturInstruktion`), danach Abschnitt "Verletzte
  Akzeptanzkriterien" (die `akVerstoesse`-Strings unverändert als Liste —
  sie nennen die AK-ID bereits). Deterministisch, minLength-konform (nie
  leer: der feste Kopf allein reicht bereits).
- `ermittleAutomatischeAnpassung({ outputSchema, schrittStatus, heilbar,
  urteil, akVerstoesse, anzahlBisherigerKernVersionen })` — reine
  Entscheidungsfunktion (Bauauftrag Punkt 5, Tabelle unten). Liefert
  `{ ausloesen: true }` oder `{ ausloesen: false, grund }` (Grund nur für
  Lesbarkeit/Tests, keine Fachbedeutung). Bewusst OHNE D13-Parameter (siehe
  „Offener Punkt 1").
- `wendeAutomatischeAnpassungAn(abhaengigkeiten, kontext)` — die
  eigentliche Schreiblogik, Parameter im Detail unter Punkt 2.

### 2. Extraktion "eine Funktion, zwei Aufrufer" (AK1)

`schreibeWorkflowFortschritt`, `workflowStatusZuAusgang`,
`beschreibeAutomatAusgang` sind bereits HEUTE reine, modul-globale
Funktionen in `leitstand-server.mjs` (3456/3571/3610) OHNE Closure über
`erzeugeRequestHandler`-lokale Variablen (`vorlage`, `laufAktiv` etc. werden
nirgends gelesen) — geprüft durch Lesen des vollständigen Funktionskörpers.
Sie werden per Parameter injiziert, NICHT importiert (vermeidet jeden
Zirkelimport, hält `scripts/leitstand/f35-ws3-adjust-automatik.mjs`
unabhängig testbar mit `node:test` ohne den ganzen Server zu laden — Muster
"reine Funktion, injizierte Abhängigkeit" ist im Repo nicht wörtlich
vorbelegt, aber die nächstliegende Lösung ohne neue Kopplung).

```js
wendeAutomatischeAnpassungAn(
  { schreibeWorkflowFortschritt, workflowStatusZuAusgang, beschreibeAutomatAusgang, ermittleNaechstenSchritt, registriereKernArtefakt, validiereEntscheidungsDaten },
  { workflowId, workflowVersion, ausfuehrungSchritt, reviewSchritt, begruendung, erzeuger, profilReferenz, ladeOptionen }
)
```

`ermittleNaechstenSchritt`/`registriereKernArtefakt`/
`validiereEntscheidungsDaten` sind schon heute direkt aus `src/`
importierbar (kein Injektionszwang, aber der Einheitlichkeit halber
ebenfalls injiziert — EINE Aufrufform statt zwei).

Körper (1:1 der bestehende ANPASSUNG_ANGEFORDERT-Block aus dem POST-Handler,
Zeilen 7714-7855, nur `herkunft.erzeuger` parametrisiert statt fest
`'mensch'`): baut `bezug`, `abgenommeneVersion`, `abnahmeDaten`
(`ergebnis: 'ANPASSUNG_ANGEFORDERT'` FEST — dieser Pfad kennt keinen
anderen Fall), validiert, registriert das Artefakt, setzt danach
`ausfuehrungSchritt`/`reviewSchritt` über `schreibeWorkflowFortschritt`
zurück (identischer Callback wie heute). Gibt zurück:
`{ ok: true, entscheidungsArtefakt, status, artefaktId } | { ok: false,
grund }` — wirft nie (Try/Catch um die Registrierung, Muster POST-Handler).

**POST-Handler-Umbau:** der bestehende Block 7714-7855 wird durch einen
Aufruf dieser Funktion mit `erzeuger: 'mensch'` ersetzt; die
Response-Formung (200/500, `sendeJson`) bleibt UNVERÄNDERT im Handler
(D2-Antwortformung ist Serverangelegenheit, nicht Fachlogik) und liest nur
noch das Rückgabeobjekt statt inline zu rechnen. Bitgenau gleiches
HTTP-Verhalten (AK1) — Gate-Fall (f) beweist das am bestehenden
check-f23-abnahme-Gate (bleibt grün) UND am neuen Gate-Fall (f).

**Automaten-Hook** (`starteWorkflowSchritt`-Rückruf, NACH Zeile 4724, VOR
Zeile 4725 `if (naechster === null || naechster.art !== 'starte') return`):

```js
if (nachlauf.ok && !heilbar && !nachlauf.eingefroren &&
    schritt.output_schema === 'ergebnis-code-reviewer' &&
    !laufAktiv && !globalerLaufZustand.aktiv) {
  const anzahlBisherigerKernVersionen = zaehleKernVersionen(basisVerzeichnis, workflowId, ladeOptionen) // neue kleine Helferfunktion, s.u.
  const entscheid = ermittleAutomatischeAnpassung({
    outputSchema: schritt.output_schema, schrittStatus, heilbar,
    urteil, akVerstoesse, anzahlBisherigerKernVersionen,
  })
  if (entscheid.ausloesen) {
    const begruendung = baueAutomatischeAnpassungsBegruendung(urteil, /* befunde aus derselben laufakteVersion, s. Offener Punkt 2 */ befunde, akVerstoesse ?? [], anzahlBisherigerKernVersionen + 1)
    const angewendet = wendeAutomatischeAnpassungAn({ ... }, { workflowId, workflowVersion: version /* bereits oben geladen, Z. 4126 */, ausfuehrungSchritt: findeAusfuehrungsSchritt(workflowDaten) /* ACHTUNG: workflowDaten ist die VOR diesem Lauf geladene Fassung, s. Offener Punkt 3 */, reviewSchritt: schritt, begruendung, erzeuger: 'kern', profilReferenz, ladeOptionen })
    if (!angewendet.ok) {
      startfehlerListe.push({ zeitstempel: new Date().toISOString(), laufId, fehler: `Automatische Anpassung für Workflow '${workflowId}' fehlgeschlagen: ${angewendet.grund}` })
    }
  }
}
if (naechster === null || naechster.art !== 'starte') return
// ... unverändert
```

Der Hook liegt bewusst VOR der bestehenden `if (naechster === null ||
naechster.art !== 'starte') return`-Zeile, ändert deren Bedingung aber
NICHT — `naechster` (aus dem GERADE beendeten Review-Schritt) ist bei einem
`haltKlaerung`-Ausgang nie `'starte'`, die bestehende Zeile bricht also so
oder so ab, BEVOR sie `wendeAutomatischeAnpassungAn`s eigenen, internen
`schreibeWorkflowFortschritt`-Aufruf (der einen ANDEREN, neuen `naechster`
erzeugt) je sehen könnte (AK4 strukturell erzwungen: kein Codepfad von
`wendeAutomatischeAnpassungAn` zurück zu `starteWorkflowSchritt`).

### 3. `zaehleKernVersionen` (neue kleine Helferfunktion)

`listeVersionen('entscheidung-workflow-<id>-abnahme',
ladeOptionen).filter(v => v.herkunft?.erzeuger === 'kern').length`. Genutzt
sowohl vom Auslöser (Grenze 3, VOR dem Schreiben gezählt = "bisherige"
Versionen) als auch von der GET-Projektion (`automatische_iteration`, NACH
dem Laden der aktuellen Version gezählt, s. Punkt 4) — EINE Funktion, zwei
Aufrufer, Muster AK1. Gehört ins neue Modul (reine Lese-Fachlogik, nur
`listeVersionen` aus `src/lineage-registry` importiert).

### 4. GET `/api/workflows/<id>/abnahme` — additive Felder

In der bestehenden `entscheidungProjektion`
(`scripts/leitstand-server.mjs:5085-5095`) zusätzlich:

```js
erzeuger: abnahmeVersion.herkunft?.erzeuger ?? null,
automatische_iteration: abnahmeVersion.herkunft?.erzeuger === 'kern' ? zaehleKernVersionen(...) : null,
```

`public/leitstand/views/workflows.js` (Detailansicht, WS-1-Bereich mit
`renderAbnahmeEntscheidung`, ungelesen bis zum Umsetzungsschritt — s.
„Offener Punkt 4"): additiv einen Hinweis "Automatisch angelegt – Iteration
n/3 – Start erfordert deine Freigabe" NUR bei `erzeuger === 'kern'`, davor
unverändert die Begründung wie heute.

### 5. Gate `scripts/check-f35-ws3-adjust-automatik.mjs`

Muster `check-f35-ws2-urteil-je-ak.mjs` (Fremdprojekt mit 2 AKs über
`POST /api/features/<id>/auftrag`, Workflow-Fixture per
`registriereWorkflow` — ABER `schritt-1-ausfuehrung` mit `freigabe:
'ZWINGEND'` statt `'AUTOMATISCH'`, weil AK4/das Grenzverhalten genau von
diesem Produktions-Verhalten abhängt, s. `workflow-vorlagen/standard.json`).

- (a) Reviewer-Stub liefert `{urteil:'BLOCKIERT', befunde:[1 Befund],
  ak_urteile:[AK1 ERFUELLT, AK2 ERFUELLT]}` → erwartet: Abnahme-Artefakt
  `ANPASSUNG_ANGEFORDERT`, `herkunft.erzeuger === 'kern'`,
  `bezug.review_lauf_id` zeigt auf den Review-Lauf, `schritt-1-ausfuehrung`
  OFFEN/`lauf_id:null`, Workflow-Status `WARTET_FREIGABE` (ZWINGEND), keine
  zweite `ausfuehrung`-laufId in `auftragstexte`.
- (b) `POST .../freigabe` mit `schrittId:'schritt-1-ausfuehrung'` →
  erwartet 200/202, danach ein NEUER `ausfuehrung`-Lauf, dessen
  Auftragstext (F-648, unverändert) die automatische Begründung UND den
  Befund trägt.
- (c) Zweiter Durchlauf: Reviewer-Stub liefert `{urteil:'BEREIT',
  ak_urteile:[AK1 ERFUELLT, AK2 NICHT_ERFUELLT]}` → automatische Anpassung,
  Begründung enthält `'AK2'`.
- (d) Grenze: nach 3 automatischen Zyklen (je BLOCKIERT → Auto-ADJUST →
  Freigabe → Neustart) hält ein 4. BLOCKIERT auf KLAERUNG_ERFORDERLICH,
  OHNE ein 4. Abnahme-Artefakt (`listeVersionen` bleibt bei 3 `kern`-Einträgen).
- (e) Reviewer-Stub liefert ein STRING-`urteil` außerhalb der drei
  bekannten Werte (z. B. `'UNKLAR'`), aber vollständige, `ERFUELLT`e
  `ak_urteile` für beide AK (sonst würde die AK-Prüfung selbst schon einen
  Verstoß erzeugen, s. „Offener Punkt 2" unten — bewusst SO gewählt, damit
  Fall (e) wirklich NUR Regel 1b prüft) → KLAERUNG_ERFORDERLICH, KEIN neues
  Abnahme-Artefakt.
- (f) Menschlicher `POST .../abnahme` mit `ANPASSUNG_ANGEFORDERT` (Muster
  check-f659) → Artefakt mit `herkunft.erzeuger === 'mensch'`, Verhalten
  bitgenau wie heute (bestehendes check-f23-abnahme-Gate bleibt zusätzlich
  grün als zweiter Beleg).

### 6. `features/F35/feature.md`

WS-3 als umgesetzt markieren (Analogie zum bestehenden WS-2-Absatz), AK17+
für WS-3 (AK4-AK7 des Auftrags oben, in Feature-Aktensprache).
Status bleibt `IN_ARBEIT`.

## Offene Punkte — NICHT stillschweigend entschieden

**Offener Punkt 1 — D13-Prüfung im Hook (`!laufAktiv &&
!globalerLaufZustand.aktiv`) ist an dieser Stelle strukturell IMMER wahr.**
Beleg: `starteLaufUndVergiss` setzt beide Flags synchron auf `false`
(Zeilen 4006-4013 bzw. 3919-3927), UNMITTELBAR vor dem `meldeLaufende`-
Aufruf (kein `await` dazwischen), der Hook liegt im selben synchronen Tick.
Die Prüfung ist damit tote Defensivcode — sie steht trotzdem da, weil (a)
Bauauftrag Punkt 2 sie explizit als Bedingung nennt und (b) sie als
Tiefenverteidigung nichts kostet, falls sich die Aufrufreihenfolge einmal
ändert (Muster: der bereits vorhandene "HEUTE UNERREICHBAR"-Kommentarstil
an mehreren Stellen in `starteWorkflowSchritt`, z. B. Zeile 4364/4709).
**Frage an den Advisor:** ist eine tote, aber explizit geforderte Bedingung
hier vertretbar, oder sollte sie ganz entfallen (und der Bauauftrags-Punkt
als "durch Konstruktion erfüllt" im Bericht vermerkt statt im Code
geprüft)?

**Offener Punkt 2 — Woher kommen `befunde` für
`baueAutomatischeAnpassungsBegruendung` im Automaten-Hook?** Der bestehende
`urteil`/`akVerstoesse`-Block (4479-4498) lädt `laufakteVersion` bereits
ZWEIMAL (einmal für `urteil`, einmal für `akVerstoesse`, jeweils eigener
`ladeArtefaktVersion`-Aufruf, Kommentarbegründung: "zweites, eigenständiges
Lesen"). Für die Begründung brauche ich zusätzlich `befunde[]` — geplant:
EIN drittes `ladeArtefaktVersion(laufakte-${laufId})` +
`leseUrteilAusLaufakte(...)?.befunde ?? []`, im Hook selbst, NUR wenn
`entscheid.ausloesen === true` (kein Overhead im Normalfall). Alternative
wäre, `befunde` am bestehenden `akVerstoesse`-Block (4493-4498) direkt
mitzuberechnen und durchzureichen — spart einen Lesevorgang, vergrößert
aber den bestehenden, bereits dicht kommentierten Block um ein WS-3-fremdes
Feld. **Ich tendiere zum dritten, eigenen Lesevorgang** (lokaler Schaden,
bestehender Block bleibt unangetastet) — Advisor-Meinung erwünscht.

**Offener Punkt 3 — welche `workflowDaten`/`ausfuehrungSchritt`-Fassung
reicht der Hook an `wendeAutomatischeAnpassungAn` durch?** Zum Zeitpunkt
des Hooks ist `workflowDaten` (Closure-Variable aus Zeile 4130) die vor
DIESEM Lauf geladene Fassung — der `schreibeWorkflowFortschritt`-Aufruf in
`nachlauf` (4624) hat inzwischen eine NEUE Version geschrieben (die den
Review-Schritt bereits auf seinen `schrittStatus` gesetzt hat). Der
menschliche POST-Handler lädt dagegen IMMER frisch
(`ladeArtefaktVersion('workflow-<id>')`, Zeile 7615) unmittelbar vor dem
Schreiben. **Geplant:** `wendeAutomatischeAnpassungAn` lädt INTERN
ebenfalls frisch (Muster POST-Handler, D2: nie auf einer möglicherweise
veralteten Closure-Variable aufbauen) — der Hook übergibt nur `workflowId`,
nicht `workflowVersion`/`ausfuehrungSchritt` direkt. Das macht die
Signatur aus Abschnitt 2 oben ungenau (dort stand `workflowVersion`
optimistisch als Parameter) — **Plan v2 korrigiert das**: die Funktion
lädt selbst und findet `ausfuehrungSchritt`/`reviewSchritt` über
`findeAusfuehrungsSchritt`/`findeReviewSchritt` (beide bereits aus `src/`
oder injiziert, s. Offener Punkt 5) auf der FRISCH geladenen Fassung.

**Offener Punkt 4 — `public/leitstand/views/workflows.js` UI-Änderung
(Punkt 6 AK6) ist im Plan nur grob skizziert.** Ich habe die bestehende
`renderAbnahmeEntscheidung`-Funktion NICHT gelesen (Zeitbudget). Risiko:
das tatsächliche Rendering-Muster (Framework-frei? Template-String?) könnte
von der Skizze abweichen. Wird vor der Umsetzung dieses Teils nachgeholt,
unabhängig vom Advisor-Urteil.

**Offener Punkt 5 — `findeAusfuehrungsSchritt`/`findeReviewSchritt` sind
wie `schreibeWorkflowFortschritt` heute nicht-exportierte, aber
closure-freie Modulfunktionen in `leitstand-server.mjs` (Zeilen
1642/1656).** Sie werden wie in Abschnitt 2 injiziert, nicht importiert —
dieselbe Zirkelimport-Vermeidung. Insgesamt injiziert
`wendeAutomatischeAnpassungAn` damit SECHS Funktionen
(`schreibeWorkflowFortschritt`, `workflowStatusZuAusgang`,
`beschreibeAutomatAusgang`, `findeAusfuehrungsSchritt`,
`findeReviewSchritt`, plus die drei aus `src/` der Einheitlichkeit halber)
— **das ist die Stelle, an der die Injektion am meisten nach
Overengineering aussieht.** Alternative: die drei `src/`-Funktionen NICHT
injizieren (direkt importieren, sie sind ja schon unabhängig verfügbar),
nur die VIER server-lokalen injizieren. Reduziert die injizierte Menge auf
vier. **Advisor-Meinung erwünscht**, ob diese Asymmetrie (manche injiziert,
manche importiert) klarer oder verwirrender ist als eine einheitliche
Injektion aller sieben.

## Risiken

- Der D13-Bauauftrags-Vertragsgate (`scripts/check-f11-auftrag.mjs`, sucht
  im Quelltext nach dem ERSTEN Vorkommen bestimmter Zeichenketten) prüft
  NUR den POST-`/api/laeufe`-Handler-Bereich (laut Kommentar Zeile
  3820-3831) — der neue Hook liegt in `starteWorkflowSchritt`s
  Nachbereitung, NICHT im D13-Übergabefenster selbst (das endet laut
  Kommentar bereits bei Zeile 4409, der Hook liegt danach, im bereits
  freien Bereich). Sollte das Gate NACH der Änderung trotzdem rot werden,
  ist die Annahme falsch und wird korrigiert, nicht das Gate umgangen.
- `npm run check` läuft nicht vor dem Advisor-Pass (Bauauftrag-Reihenfolge:
  Advisor vor Umsetzung) — dieser Plan ist ungeprüfter Code.
