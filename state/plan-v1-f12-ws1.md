# Plan v1 — Feature F12 WS-1: Ehrliche Laufliste, Detailendpunkt, Zeitstempel aus dem Artefakt

Slug: f12-ws1
Stand: 2026-09-07
Rolle: Planner (Claude-Code-Sitzung, Repo-Zugriff)
Grundlage: `features/F12/feature.md` (Status READY_FOR_TECH, AK1/AK2/AK3,
Workstream-Liste WS-1/WS-2/WS-3/WS-4), `docs/projekt/zielfassung.md` §13.3
(Meilenstein 2, E-M2-3/E-M2-4/E-M2-5).

Kein Bau in diesem Schritt. Kein Advisor-Pass in diesem Schritt.

## 0. Verifikation (F-013-Muster — nicht annehmen, prüfen)

Alle folgenden Aussagen real aus dem Repo gelesen, nicht aus `feature.md`s
Prosa übernommen.

- **`scripts/leitstand-server.mjs:207-218`** (`sammleLaeufe`) — listet
  **jedes** Verzeichnis unter `basisVerzeichnis`, ohne jede Inhaltsprüfung,
  und ruft für jedes `sammleCheckpoints` (voll) plus `stelleLaufstatusFest`
  auf. Bestätigt F-137 wörtlich.
- **`scripts/leitstand-server.mjs:141-198`** (`sammleCheckpoints`) — baut
  je Checkpoint ein vollständiges Objekt (Lineage-Felder, Wirkungsmarke-
  Felder, Live-Staleness über `pruefeStale`, `zeitstempel:
  statSync(pfad).mtime.toISOString()`). `zeitstempel` kommt an **keiner**
  Stelle aus dem Payload-Inhalt — bestätigt F-141 wörtlich.
- **`erzeugeRequestHandler` (`:451-454`)** — `GET /api/laeufe` liefert
  `sammleLaeufe(basisVerzeichnis)` unverändert als JSON. Kein Detail-
  Endpunkt existiert bisher.
- **`public/leitstand/app.js:77-98, 106-117`** (`laufAbschnitt`, `laden`) —
  rendert `lauf.checkpoints.map(checkpointZeile)` **direkt** aus der
  `GET /api/laeufe`-Antwort. Das ist der **einzige** reale Konsument der
  heutigen Antwortform. **Reale Konsequenz für AK2:** entfernt die Liste
  `checkpoints` aus der `GET /api/laeufe`-Antwort ersatzlos, rendert
  `laufAbschnitt` eine leere/kaputte Tabelle — ein echter, mechanisch
  geprüfter Bruch, kein hypothetisches Risiko. `darfWiederaufnehmen`
  (`:71-75`) liest nur `lauf.laufStatus` — bleibt unberührt, solange
  `laufStatus` Teil der Kopfdaten bleibt (AK2-Wortlaut fordert das
  ohnehin).
- **`scripts/check-f10-leitstand.mjs`** (vollständig gegrept) — **kein**
  Testfall ruft `GET /api/laeufe` auf oder prüft dessen Antwortform; alle
  `/api/laeufe`-Aufrufe dort sind `POST` (Startauftrag-Prüfung). AK2 bricht
  dieses Gate nicht.
- **`scripts/check-f11-auftrag.mjs`** (vollständig gegrept) — **keine**
  Referenz auf `sammleLaeufe`, `checkpoints`, `laufStatus` oder
  `GET /api/laeufe`. AK1/AK2/AK3 berühren dieses Gate nicht.
- **`src/checkpoint-store/index.ts:474-521`** (`schreibeCheckpoint`) und
  **`:530-592`** (`schreibeWirkungsmarke`) — beide bauen zuerst
  `payloadOhneHash`, dann `eintragOhneHash = { ..., payload:
  payloadOhneHash }`, dann `selbstHash = sha256Hex(kanonischesJson(
  eintragOhneHash))`. **Jedes Feld muss in `payloadOhneHash` stehen, BEVOR
  diese Zeile läuft** — ein nachträglich anghängtes Feld nach dem Hashen
  wäre nicht Teil von `selbst_hash` und damit ein Fehler (Auftragsvorgabe
  Punkt 3, hier real am Code bestätigt). Beide Funktionen besitzen bereits
  einen `jetzt(): string`-Helfer (`:333-335`, `new Date().toISOString()`),
  heute nur für `schreiber`-Ereigniszeilen genutzt, nicht für den Payload
  selbst.
- **`src/checkpoint-store/index.ts:127-159`** (`pruefeKettenfelder`) —
  **zentraler, real gefundener Befund:** dies ist ein vollständig
  handgeschriebener Feld-Allowlist-Regelsatz, **unabhängig von den
  `.schema.json`-Dateien**. `validiereCheckpointEintrag` (`:197`) ruft
  `pruefeKettenfelder(p, ['daten'])`, `validiereWirkungsmarkeEintrag`
  (`:246`) ruft `pruefeKettenfelder(p, ['art', 'ergebnis', 'daten'])`. Ein
  Feld, das nur in `schemas/kontrollzustand-checkpoint-payload.schema.json`
  ergänzt wird, aber nicht in diese beiden Aufrufstellen, würde von
  `validiereCheckpointEintrag`/`validiereWirkungsmarkeEintrag` weiterhin
  als `unbekanntes Feld 'payload.erstellt_am' (additionalProperties:
  false)` abgelehnt — die `.schema.json`-Dateien sind hier **Dokumentation,
  nicht Laufzeit-Durchsetzung** (derselbe Befund wie in
  `state/plan-v1-f11-auftrag-ws1.md` Abschnitt 0 für
  `check-datenformate.mjs`, hier aber an einer zweiten, unabhängigen
  Stelle). **Zwei Stellen müssen im Gleichschritt geändert werden, nicht
  eine.**
- **`schemas/kontrollzustand-checkpoint-payload.schema.json`** (vollständig
  gelesen) — `additionalProperties: false`, `required` nennt vier Felder,
  `daten` ist das einzige optionale Feld in `properties`. Ein neues
  optionales Feld muss explizit in `properties` stehen, sonst verbietet
  `additionalProperties: false` es — bestätigt Auftragsvorgabe Punkt 3
  wörtlich.
- **`schemas/kontrollzustand-wirkungsmarke-payload.schema.json`**
  (vollständig gelesen) — **zwei** `$defs` (`runPrepared`, `terminal`),
  jeweils eigenes `properties`/`additionalProperties: false`. Ein neues
  optionales Feld muss in **beiden** `$defs` ergänzt werden, nicht nur
  einem — sonst wäre `erstellt_am` bei `art: 'run_prepared'` weiterhin
  verboten.
- **`scripts/check-checkpoint-store.mjs:33-63`** und
  **`scripts/check-f1b-wirkungsmarke.mjs`** (Struktur identisch, gegrept)
  — beide iterieren eine feste Liste von `schemas/examples/kontrollzustand-
  checkpoint*.json` bzw. `*wirkungsmarke*.json`-Fixtures gegen
  `validiereCheckpointEintrag`/`validiereWirkungsmarkeEintrag` und prüfen
  `sollGueltigSein`. **Keine bestehende Fixture trägt `erstellt_am`** —
  die additive Eigenschaft ist heute an keiner Stelle mechanisch bewiesen,
  weder für das Schema noch für den handgeschriebenen Validator.
- **`src/checkpoint-store/types.ts:21-37`** (`CheckpointPayload`,
  `WirkungsmarkePayload`) — beide Interfaces kennen `erstellt_am` nicht.
  Ein Lesezugriff (`eintrag.payload.erstellt_am`) aus
  `scripts/leitstand-server.mjs` würde ohne Erweiterung dieser Interfaces
  nicht kompilieren (`tsc --noEmit` ist Teil von `npm run check`).
- **`scripts/leitstand-server.mjs`** exportiert heute `pruefeStartauftrag`,
  `loeseEvidenzPfadAuf`, `VERBOTENE_OPTIONEN_FELDER`,
  `VERBOTENE_STARTVORLAGE_FELDER`, `erzeugeRequestHandler` — **nicht**
  `sammleLaeufe`/`sammleCheckpoints`. Ein direkter Unit-Test von AK1/AK2/AK3
  ohne vollen HTTP-Testserver braucht einen neuen Export (Muster: F11 WS-2
  exportierte `loeseEvidenzPfadAuf` genau zu diesem Zweck).

## 1. Ziel (prüfbar, WS-1)

`GET /api/laeufe` listet ausschließlich echte Läufe (mindestens eine
Wirkungsmarke in der gültigen Kette), nicht länger F2-Artefaktketten
(AK1). Die Antwort enthält nur Kopfdaten; die vollständige Projektion
(Checkpoints, Lineage, Staleness) zieht in einen neuen
`GET /api/laeufe/<laufId>` um (AK2). Angezeigte Zeitpunkte stammen aus dem
Checkpoint-Inhalt (`erstellt_am`, additiv über E-M2-5 in Checkpoint- und
Wirkungsmarke-Payload eingeführt), nicht aus der Datei-mtime — fehlt das
Feld (Bestandsdaten), wird das als „Zeit unbekannt" ausgewiesen (AK3).
`public/leitstand/app.js` wird minimal angepasst, damit die schlankere
Listenantwort nicht zu einer kaputten Darstellung führt. Keine
Startvorlage, kein Startformular, keine Auftrag→Lauf-Zuordnung, keine
Lauf-Detailansicht (AK4-AK9, WS-2/WS-3/WS-4).

## 2. SCOPE

### 2.1 AK1 — Nur Läufe in der Laufliste

Neue reine Funktion in `scripts/leitstand-server.mjs`:

```js
/** Eine gültige Kette zählt nur als Lauf, wenn sie mindestens eine Wirkungsmarke enthält — Konvention (lauf_id-Präfix) ist dafür nie maßgeblich (F-137, AK1). */
function istLaufkette(gueltigeEintraege) {
  return gueltigeEintraege.some((eintrag) => eintrag.typ === 'wirkungsmarke')
}
```

`sammleLaeufe` ruft `ladeGueltigeCheckpoints` (bereits importiert) **einmal
pro Verzeichnis** und übergibt das Ergebnis sowohl an `istLaufkette` als
auch — nach AK2s Umbau — an die Kopfdaten-Projektion (2.2). **Kein**
zweiter `ladeGueltigeCheckpoints`-Aufruf für denselben `laufId` — das wäre
eine unnötige Verdopplung genau der Last, die F-140 bereits als Befund
festhält.

`registriereKernArtefakt` (F2) hängt nie eine Wirkungsmarke an — jede
`lineage-*`-Kette besteht ausschließlich aus `typ: 'checkpoint'`-Einträgen
mit `daten.typ === 'lineage'`. `istLaufkette` liefert für sie deshalb immer
`false`, unabhängig vom `lauf_id`-Präfix — genau die inhaltsbasierte
Erkennung, die AK1 verlangt (kein Präfixvergleich auf `"lineage-"`).

**Testfälle (a):** ein Testverzeichnis mit einer echten Wirkungsmarke
(`schreibeWirkungsmarke(..., 'run_prepared')`) erscheint in
`sammleLaeufe(...)`. **(b):** ein Testverzeichnis, das ausschließlich über
`registriereKernArtefakt` befüllt wurde (reine `lineage-kontextpaket-*`-
Kette ohne jede Wirkungsmarke), erscheint **nicht**.

### 2.2 AK2 — Liste schlank, Detail getrennt

**Kopfdaten-Projektion**, ersetzt den bisherigen vollen
`sammleCheckpoints`-Aufruf in `sammleLaeufe`:

```js
function sammleLaufKopfdaten(laufId, basisVerzeichnis) {
  const gueltigeEintraege = ladeGueltigeCheckpoints(laufId, { basisVerzeichnis, schreiber: STILLER_SCHREIBER })
  if (!istLaufkette(gueltigeEintraege)) return null

  const alleDateien = /* readdirSync + DATEINAME_MUSTER-Zaehlung, wie bisher in sammleCheckpoints */
  const kettenintegritaet = gueltigeEintraege.length === alleDateien.length
  const laufStatus = stelleLaufstatusFest(laufId, { basisVerzeichnis, schreiber: STILLER_SCHREIBER })
  const letzter = gueltigeEintraege.at(-1)

  return {
    laufId,
    laufStatus,
    ergebnis: laufStatus.status === 'ABGESCHLOSSEN' ? laufStatus.ergebnis : null,
    zeitpunkt: letzter?.payload.erstellt_am ?? null,   // AK3: null statt Datei-mtime, s. 2.3
    auftragsbezug: null,                                 // WS-2/AK5 füllt dieses Feld; WS-1 liefert es bewusst leer, kein Rückschritt
    anzahlCheckpoints: gueltigeEintraege.length,
    kettenintegritaet,
  }
}

function sammleLaeufe(basisVerzeichnis = BASISVERZEICHNIS) {
  if (!existsSync(basisVerzeichnis)) return []
  return readdirSync(basisVerzeichnis, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort()
    .map((laufId) => sammleLaufKopfdaten(laufId, basisVerzeichnis))
    .filter((kopfdaten) => kopfdaten !== null)
}
```

**Neuer Detailendpunkt** `GET /api/laeufe/<laufId>` liefert exakt das, was
`sammleLaeufe` bis WS-1 lieferte, für genau eine `laufId` — volle
`sammleCheckpoints`-Projektion (Lineage, Staleness, Wirkungsmarke-Felder)
plus `laufStatus`. Existiert `laufId` nicht unter `basisVerzeichnis`, 404
statt eines stillen leeren Arrays (Unterscheidung „kein Lauf" vs. „Lauf
ohne Checkpoints" bleibt so möglich). Route-Matching:
`pfad.startsWith('/api/laeufe/')` mit `laufId =
decodeURIComponent(pfad.slice('/api/laeufe/'.length))` — vor dem
bestehenden `pfad === '/api/laeufe'`-Vergleich geprüft (längeres, spezielleres
Präfix zuerst).

**`sammleCheckpoints` bleibt unverändert** als interne Funktion für den
Detailendpunkt — nur `sammleLaeufe` wird umgebaut, keine Logikänderung an
der vollen Projektion selbst (die zieht nur um, WS-1 ändert sie nicht).

**app.js, minimale Anpassung (real notwendig, s. Abschnitt 0):**
`laufAbschnitt` verliert die Checkpoint-Tabelle und zeigt stattdessen eine
Kopfdaten-Zeile (`laufId`, `laufStatus`-Badge, `ergebnis`, `zeitpunkt` oder
„Zeit unbekannt", `anzahlCheckpoints`, `kettenintegritaet` als Ja/Nein-
Badge). `darfWiederaufnehmen`/der Wiederaufnahme-Button bleiben unverändert
(lesen nur `lauf.laufStatus`, das Teil der Kopfdaten bleibt).
`checkpointZeile`/`statusZelle`/`staleZelle` werden **nicht gelöscht** —
sie sind die einzige real vorhandene Rendering-Logik für genau die Felder,
die WS-3s Detailansicht (AK7) gegen `GET /api/laeufe/<laufId>` braucht, und
würden sonst in WS-3 identisch neu geschrieben. Das ist eine bewusste
Abweichung von „kein toter Code" — als Offene Frage 3 (Abschnitt 5) zur
Freigabe vorgelegt, nicht einseitig entschieden.

### 2.3 AK3 — Zeitstempel aus dem Artefakt (inkl. E-M2-5)

**Schema-Diff `schemas/kontrollzustand-checkpoint-payload.schema.json`:**

```diff
   "properties": {
     ...
+    "erstellt_am": {
+      "type": "string",
+      "format": "date-time",
+      "description": "Vom Checkpoint Store beim Schreiben gesetzter ISO-8601-Zeitpunkt (E-M2-5). Fehlt bei Bestandsdaten aus der Zeit vor E-M2-5 — optional, additiv, nicht Teil von 'required'."
+    },
     "daten": { ... }
   }
```

`required` bleibt unverändert (vier Felder) — `erstellt_am` wird
**bewusst nicht** aufgenommen (Bestandsdaten ohne das Feld bleiben gültig,
E-M2-5-Wortlaut).

**Schema-Diff `schemas/kontrollzustand-wirkungsmarke-payload.schema.json`:**
identische `erstellt_am`-Eigenschaft in **beiden** `$defs.runPrepared.
properties` und `$defs.terminal.properties` ergänzt (Abschnitt 0 — sonst
bei `art: 'run_prepared'` weiterhin verboten). `required` in beiden
unverändert.

**`src/checkpoint-store/types.ts`:** `erstellt_am?: string` zu
`CheckpointPayload` und `WirkungsmarkePayload` ergänzt.

**`src/checkpoint-store/index.ts`, `pruefeKettenfelder`-Aufrufstellen**
(der real entscheidende Punkt aus Abschnitt 0):

```diff
- verstoesse.push(...pruefeKettenfelder(p, ['daten']))
+ verstoesse.push(...pruefeKettenfelder(p, ['daten', 'erstellt_am']))
```
(in `validiereCheckpointEintrag`, Zeile 197) und

```diff
- verstoesse.push(...pruefeKettenfelder(p, ['art', 'ergebnis', 'daten']))
+ verstoesse.push(...pruefeKettenfelder(p, ['art', 'ergebnis', 'daten', 'erstellt_am']))
```
(in `validiereWirkungsmarkeEintrag`, Zeile 246). Zusätzlich ein neuer,
optionaler Typ-Check in `pruefeKettenfelder` selbst (Muster der
bestehenden `vorgaenger_hash`/`selbst_hash`-Prüfungen):

```js
if ('erstellt_am' in p && (typeof p.erstellt_am !== 'string' || Number.isNaN(Date.parse(p.erstellt_am as string)))) {
  verstoesse.push("'payload.erstellt_am' muss ein ISO-8601-Zeitstempel sein")
}
```

**`schreibeCheckpoint`/`schreibeWirkungsmarke`:** `erstellt_am` wird **vom
Checkpoint Store selbst gesetzt**, nicht vom Aufrufer übergeben —
Empfehlung, s. Design-Entscheidung D3. Beide Funktionen nutzen den
bereits vorhandenen `jetzt()`-Helfer:

```diff
  const payloadOhneHash: Omit<CheckpointPayload, 'selbst_hash'> = {
    lauf_id: laufId,
    sequenz: naechsteSequenz,
    vorgaenger_hash: vorgaengerHash,
+   erstellt_am: jetzt(),
    ...(daten !== undefined ? { daten } : {}),
  }
```

(identisch in `schreibeWirkungsmarke`). Weil `erstellt_am` **vor** der
`selbstHash = sha256Hex(kanonischesJson(eintragOhneHash))`-Zeile in
`payloadOhneHash` steht (Abschnitt 0, hier eingehalten), ist es Teil des
gehashten Inhalts — ein Laufzeit-Test (unten, b) beweist das über zwei
Aufrufe mit unterschiedlichem `erstellt_am`-Wert (künstlich injiziert über
einen Zeitsprung oder eine austauschbare `jetzt`-Funktion) und
unterschiedlichem `selbst_hash`.

**Keine Änderung an bestehenden Aufrufstellen** von `schreibeCheckpoint`/
`schreibeWirkungsmarke` (F2, F1B, F6a, …) nötig — das Feld entsteht
vollständig innerhalb des Checkpoint Store, kein Aufrufer muss etwas
liefern oder wissen. Das ist der entscheidende Vorteil gegenüber einem
optionalen Parameter: keine der ~10 realen Aufrufstellen im Repo ändert
sich.

**`scripts/leitstand-server.mjs`, Kopfdaten- und Detailprojektion:**
`zeitpunkt`/`zeitstempel` liest `eintrag.payload.erstellt_am`. Ist das
Feld `undefined` (Bestandsdaten), wird **nicht** auf `statSync(pfad).mtime`
zurückgefallen, sondern `null` geliefert; `app.js` zeigt dafür „Zeit
unbekannt" statt eines Werts.

**Bestehende Fixtures bleiben gültig (real geprüft, nicht nur behauptet):**
alle vier `schemas/examples/kontrollzustand-checkpoint*.json` und alle
sechs `*wirkungsmarke*.json`-Fixtures tragen kein `erstellt_am` — additiv
und optional bedeutet, `validiereCheckpointEintrag`/
`validiereWirkungsmarkeEintrag` dürfen sie unverändert als gültig/ungültig
einstufen wie bisher (kein Fixture-Update nötig für die Bestandsfälle).
**Neu**: je eine zusätzliche Fixture
`kontrollzustand-checkpoint.valid-mit-erstellt-am.json` und
`kontrollzustand-wirkungsmarke-run-prepared-mit-erstellt-am.valid.json`,
registriert in `scripts/check-checkpoint-store.mjs` bzw.
`scripts/check-f1b-wirkungsmarke.mjs` mit `sollGueltigSein: true` — der
einzige mechanische Beweis, dass **beide** Stellen (Schema-Datei UND
`pruefeKettenfelder`) tatsächlich im Gleichschritt geändert wurden, nicht
nur eine.

## 3. NICHT (WS-1 Non-Scope, mit Grund)

- **AK4-AK9** (Auftrag anlegen, Auftrag→Lauf-Zuordnung, Startformular,
  Detailansicht-Inhalte über die reine Kopfdaten-Weiterleitung hinaus,
  Rohstrom-Lesepfad, realer Nachweis, Gate `check-f12-leitstand-
  ansicht.mjs`) — WS-2/WS-3/WS-4, `feature.md` Workstream-Liste.
- **`src/auftrag/`, `src/execution-controller/`** — kein Eingriff. Die
  Lineage-Eingabe-Referenz (E-M2-4) ist WS-2.
- **`startvorlagen/`, `src/startvorlage/`** — unberührt.
- **Rückwirkende Ergänzung von `erstellt_am` in bestehenden
  `kontrollzustand/`-Dateien** — F1s Kette ist append-only (§7,
  `ARCHITECTURE.md`); Bestandsdaten bleiben ohne das Feld, per Definition
  von E-M2-5.
- **`GET /api/laeufe/<laufId>`s Inhalt über die reine Umlagerung der
  heutigen `sammleCheckpoints`-Projektion hinaus** — AK7s neue Felder
  (Auftragstext, Kontextpaket-Elemente, F7-Klassifikation,
  Rohstrom-Auszug) sind WS-3.

## 4. Design-Entscheidungen

- **D1 (Ein `ladeGueltigeCheckpoints`-Aufruf je `laufId` in
  `sammleLaeufe`):** AK1s Filter und AK2s Kopfdaten-Projektion teilen sich
  dasselbe Ergebnis — vermeidet die in F-140 bereits belegte
  Doppelbelastung.
- **D2 (`istLaufkette` prüft `typ === 'wirkungsmarke'` auf der gültigen
  Kette, nie den `lauf_id`-Präfix):** AK1-Wortlaut, real gegen
  `registriereKernArtefakt`s Schreibverhalten geprüft (Abschnitt 2.1).
- **D3 (`erstellt_am` wird vom Checkpoint Store selbst gesetzt, nicht vom
  Aufrufer übergeben):** null Änderungen an bestehenden Aufrufstellen,
  keine plausible Notwendigkeit für einen Aufrufer, einen anderen
  Zeitpunkt als „jetzt" zu liefern. Alternative (optionaler Parameter)
  verworfen — unnötige Freiheit ohne belegten Bedarf.
- **D4 (`kettenintegritaet` = `gueltigeEintraege.length === alleDateien.
  length`):** einzige im Repo bereits vorhandene Definition von
  „vollständig gültig" auf Lauf-Ebene — jede Datei im Verzeichnis ist Teil
  der validierten Kette, keine Lücke, kein verworfener Kandidat. Braucht
  Freigabe (Offene Frage 1) — `feature.md` definiert „Kettenintegrität als
  Ja/Nein" nicht bis auf diese Formel herunter.
- **D5 (`sammleLaeufe`/`sammleCheckpoints`-Hilfsfunktionen werden für
  Direkttests exportiert):** Muster F11 WS-2 (`loeseEvidenzPfadAuf`) — ein
  AK1/AK2/AK3-Testfall soll nicht zwingend den vollen HTTP-Testserver
  brauchen.
- **D6 (`checkpointZeile`/`statusZelle`/`staleZelle` bleiben in `app.js`,
  vorerst unbenutzt):** Wiederverwendung durch WS-3 statt Neuschreiben —
  bewusste Abweichung vom „kein toter Code"-Grundsatz, braucht Freigabe
  (Offene Frage 3).

## 5. Offene Fragen für Stefan/Advisor (vor Bau)

1. **Definition von „Kettenintegrität" (D4).** `gueltigeEintraege.length
   === alleDateien.length` ist die einzige naheliegende Formel, aber
   `feature.md` legt sie nicht fest. Freigabe vor Testbau erwünscht.
2. **Route-Matching für `GET /api/laeufe/<laufId>` bei einer `laufId`, die
   selbst `/` oder unzulässige Zeichen enthält** — `pruefeStartauftrag`
   verbietet solche `laufId`-Werte bereits beim Schreiben
   (`LAUFID_UNZULAESSIGE_ZEICHEN`), ein alter, von außerhalb des Leitstands
   erzeugter Verzeichnisname könnte das theoretisch umgehen. Empfehlung:
   `laufId` nach `decodeURIComponent` gegen dieselbe Zeichenregel prüfen,
   sonst 400 statt eines Pfad-Escapes in `join(basisVerzeichnis, laufId)`
   — kein Blocker für WS-1 (kein realer Fall bekannt), aber vor dem Bau zu
   entscheiden, nicht stillschweigend offen zu lassen.
3. **`checkpointZeile`/`statusZelle`/`staleZelle` in WS-1 unbenutzt liegen
   lassen vs. löschen und in WS-3 neu schreiben (D6).** Empfehlung: liegen
   lassen, mit einem Kommentar, der auf WS-3/AK7 verweist.
4. **Wo lebt der AK1/AK2/AK3-Testcode?** Empfehlung: Erweiterung von
   `scripts/check-f10-leitstand.mjs` (dort liegt bereits die gesamte
   `/api/laeufe`-Testinfrastruktur, `starteTestserver`/
   `erzeugeRequestHandler`), nicht ein neues, vorgezogenes
   `check-f12-leitstand-ansicht.mjs` — AK10 benennt dieses Gate explizit
   für WS-3 (AK1/AK2/AK5/AK8 gemeinsam), ein Vorgriff in WS-1 würde die
   Workstream-Grenze aus `feature.md` verwischen. Analog D6 in
   `state/plan-v1-f11-auftrag-ws1.md` (F5/F6a/F8-Präzedenzfall), dort aber
   mit gegenteiligem Ergebnis (dort: eigenes Gate ab dem ersten
   Workstream) — der Unterschied: `check-f10-leitstand.mjs` deckt
   `/api/laeufe` bereits ab, ein zweites, teilweise redundantes Gate wäre
   hier keine Neugründung, sondern eine vermeidbare Dopplung.

## 6. Ablageort (Vorschlag für den Bau, hier nicht angelegt)

- `scripts/leitstand-server.mjs` — `istLaufkette`, `sammleLaufKopfdaten`,
  `sammleLaeufe`-Umbau, neue Route `GET /api/laeufe/<laufId>`.
- `public/leitstand/app.js` — `laufAbschnitt`-Kopfdaten-Darstellung.
- `schemas/kontrollzustand-checkpoint-payload.schema.json`,
  `schemas/kontrollzustand-wirkungsmarke-payload.schema.json` —
  `erstellt_am` ergänzt.
- `schemas/examples/kontrollzustand-checkpoint.valid-mit-erstellt-am.json`,
  `schemas/examples/kontrollzustand-wirkungsmarke-run-prepared-mit-
  erstellt-am.valid.json` — neu.
- `src/checkpoint-store/types.ts` — `erstellt_am?: string` in beiden
  Payload-Interfaces.
- `src/checkpoint-store/index.ts` — `pruefeKettenfelder`-Aufrufstellen,
  neuer Typ-Check, `schreibeCheckpoint`/`schreibeWirkungsmarke` setzen
  `erstellt_am` über `jetzt()`.
- `scripts/check-checkpoint-store.mjs`,
  `scripts/check-f1b-wirkungsmarke.mjs` — neue Fixture registriert.
- `scripts/check-f10-leitstand.mjs` — AK1/AK2/AK3-Testfälle (vorbehaltlich
  Offene Frage 4).
- `state/gates.md`, `docs/STATUS.md`, `features/F12/journal.md` —
  Einträge erst nach realem Bau-/Prüflauf.

## 7. Budget & Pässe

- Dieser Schritt liefert **nur** diesen Plan — kein Bau, kein
  Advisor-Pass, kein Handoff-Vertrag (Auftragsvorgabe, §5.3-Halt gilt).
- Empfohlener nächster Schritt: Klärung der vier offenen Fragen
  (Abschnitt 5) durch Stefan, danach Advisor-Pass mit Fokus auf die
  Zwei-Stellen-Änderung (Abschnitt 0, `pruefeKettenfelder` vs.
  `.schema.json`) und auf D4 (Kettenintegrität-Definition).
- Zuschnitt-Heuristik (`CLAUDE.md`): WS-1 bleibt ein zusammenhängender
  Baudurchgang (Leitstand-Server-Umbau + Schema-Erweiterung an zwei
  Payload-Arten + minimale `app.js`-Anpassung) — ein Baudurchgang plus
  höchstens eine Korrekturrunde bleibt realistisch.

## 8. Akzeptanzkriterien — Zuordnung zu Testfällen (Entwurf, vor Advisor-Pass nicht final)

| AK | Testfall (Kurzform) | Ort |
|---|---|---|
| AK1 | (a) Verzeichnis mit Wirkungsmarke erscheint in `sammleLaeufe`; (b) reine `lineage-*`-Kette ohne Wirkungsmarke erscheint nicht | `check-f10-leitstand.mjs` (Offene Frage 4) |
| AK2 | `GET /api/laeufe`-Antwort enthält kein `checkpoints`-Array; `GET /api/laeufe/<laufId>` liefert die volle, bisherige Projektion; unbekannte `laufId` → 404 | `check-f10-leitstand.mjs` |
| AK3 | (a) neue Fixtures mit `erstellt_am` gültig in beiden Validatoren; (b) zwei `schreibeCheckpoint`-Aufrufe mit unterschiedlichem `erstellt_am` (austauschbare `jetzt`-Funktion) liefern unterschiedlichen `selbst_hash`; (c) Kopfdaten/Detail zeigen `erstellt_am` wo vorhanden, `null`/„Zeit unbekannt" sonst — nie `statSync`-mtime | `check-checkpoint-store.mjs`, `check-f1b-wirkungsmarke.mjs` (a), `checkpoint-store.test.ts` (b), `check-f10-leitstand.mjs` (c) |

## 9. Rollen für diesen Workstream

| Position | Träger | Rechte |
|---|---|---|
| Advisor | Subagent `architecture-advisor`, frisch | `Read, Grep, Glob` |
| Executor | Claude-Code-Sitzung, frisch, kennt nur Repo + Vertragsvolltext | voll im freigegebenen Pfad |
| Reviewer | Subagenten `code-reviewer`, `qa`, frisch | read-only |
| Mensch (Stefan) | — | Freigaben, Klärung Abschnitt 5, Release |

## 10. Nächste Schritte nach diesem Plan (nicht Teil dieses Auftrags)

1. Klärung der vier offenen Fragen (Abschnitt 5) durch Stefan.
2. Advisor-Pass auf diese Datei (Fokus: Zwei-Stellen-Änderung Abschnitt 0,
   D4-Kettenintegrität, D6-toter-Code-Abweichung).
3. Findings → `state/advisor-findings-f12-ws1.md`.
4. Falls nötig: plan-v2 als eigene Datei.
5. Handoff-Vertrag für WS-1 — erst danach, nicht Teil dieses Auftrags.

## Status
- [ ] Freigegeben
- [ ] Freigegeben mit Hinweisen
- [ ] Nicht freigegeben
- [ ] Blockiert

## Nächster sinnvoller Schritt
Freigabe dieses Plans durch Stefan, insbesondere der vier offenen Fragen
(Abschnitt 5), danach Advisor-Pass — noch kein Bau.
