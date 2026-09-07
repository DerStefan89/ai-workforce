# Plan v1 — Feature F12 WS-3: Detailansicht, sicherer Rohstrom-Lesepfad, Gate

Slug: f12-ws3
Stand: 2026-09-07
Rolle: Planner (Claude-Code-Sitzung, Repo-Zugriff)
Grundlage: `features/F12/feature.md` (AK7/AK8/AK10, Workstream-Liste WS-3),
`state/plan-v1-f12-ws2.md` (Formatvorlage, Abschnitt-0-Muster). WS-2 ist auf
`main` gemergt (`63e4059`, PR #91).

Kein Bau in diesem Schritt. Kein Advisor-Pass in diesem Schritt.

## 0. Verifikation

Abschnitt 0a gibt die neun mit dem Auftrag mitgelieferten, bereits real
gegen den Code verifizierten Befunde (Challenge 07.09.2026, Repo-Stand
`350a9d9`) unverändert wieder — sie werden hier **nicht neu hergeleitet**,
nur als Planungsgrundlage referenziert. Abschnitt 0b ergänzt zusätzliche
Fakten, die für die konkreten SCOPE-Entscheidungen (Abschnitt 2) real
gegen den Code (Stand `63e4059`, WS-2 gemergt) nachgelesen wurden.

### 0a. Mitgelieferte Befunde (unverändert übernommen)

1. WS-3 braucht **keinen** Eingriff in `src/`. Alle nötigen Funktionen sind
   bereits exportiert: `ladeArtefaktVersion` (F2), `leseErgebnisobjekt`
   (`src/claude-code-gateway/index.ts:150`), `loeseEvidenzPfadAuf` und
   `sammleCheckpoints` (`scripts/leitstand-server.mjs`). Weicht der Plan
   davon ab, muss er das begründen.
2. Die drei AK7-Quellen liegen in eigenen Artefaktketten, nicht in der
   Laufkette:
   - Kontextpaket: `ladeArtefaktVersion('kontextpaket-<laufId>')` →
     `elemente`, `ausgeschlossen`, `rolle`.
   - Laufakte: `ladeArtefaktVersion('laufakte-<laufId>')` →
     `rohstrom_referenz {pfad, inhalts_hash}`, `modell_beobachtet`,
     `beobachtungsbasis_vollstaendig`, `arbeitsverzeichnis_pfad`.
   - Auftrag: `auftragId` aus dem Kontextpaket-Element mit `pfad`
     `'artefakt:auftrag-<auftragId>'`, dann
     `ladeArtefaktVersion('auftrag-<auftragId>')` → `auftragstext`. AK5
     setzt diese Anfrage `notwendig: true` (Phase A der Budgetvergabe),
     bei einem erfolgreichen Lauf ist sie daher immer in `elemente`.
3. F7-Klassifikation: aus der Laufkette ist nur
   `wirkungsmarke.ergebnis` der `'terminal'`-Marke verfügbar.
   `bypass_verdacht_anzahl`/`is_error`/`non_execution_kind`/der
   `FEHLGESCHLAGEN`-Grund werden von `klassifiziereLauf` nicht
   persistiert (Finding F-146). Der Leitstand darf `klassifiziereLauf`
   **nicht** aufrufen — die Funktion schreibt eine Wirkungsmarke, der
   Server hat keinen Schreibzugriff auf `kontrollzustand/` (F10-Invariante).
   Die Klassifikationsregeln dürfen auch nicht nachgebaut werden (D5).
4. `permission_denials` steht **nicht** im Rohstrom-Wurzelobjekt, sondern
   im `'type':'result'`-Objekt innerhalb von `rohstrom.stdout`. Es wird
   ausschließlich über das exportierte `leseErgebnisobjekt(stdout)`
   gelesen, nie selbst geparst (D5, Muster
   `src/result-evaluator/index.ts:99`).
5. `rohstrom_referenz.pfad` ist real ein repo-relativer Windows-Pfad mit
   Backslashes, z. B. `'kontrollzustand-roh\\<laufId>\\rohstrom.json'`
   (verifiziert in
   `kontrollzustand/lineage-laufakte-e2e-referenzfeature-2026-09-06`).
   `loeseEvidenzPfadAuf` verträgt das.
6. Realer Bestandszustand: 7 Laufketten, 0 `lineage-auftrag-*`. Kein
   Bestandslauf hat einen Auftragsbezug; der Lauf
   `e2e-f11-ws3-lesend-2026-09-06` hat gar keine Laufakte.
7. `public/leitstand/app.js`: `laden()` überschreibt alle 2000 ms
   `#laeufe.innerHTML`. `checkpointZeile`/`statusZelle`/`staleZelle`
   liegen seit WS-1 bewusst unbenutzt vor (D6) und sind die Basis für
   AK7.
8. `sammleLaufKopfdaten` liefert `auftragsbezug` bis heute `null`, obwohl
   AK2 es als Kopfdatum nennt (Finding F-147).
9. F-145 (`basisVerzeichnis` nicht an `fuehreAufgabeDurchFn` durchgereicht)
   blockiert WS-3 nicht, solange kein Gate-Fall einen erfolgreichen
   Startpfad auslöst. Das ist eine Auflage an das Gate, keine Aufgabe.

### 0b. Zusätzlich real verifiziert (WS-3-Planung, Repo-Stand `63e4059`)

- **`AuftragV0Daten`** (`src/auftrag/types.ts:17-23`): `{ auftrag_schema:
  'v0', auftrag_id, titel, auftragstext, erstellt_am }` — bestätigt
  wörtlich für Befund 2. `ladeArtefaktVersion(...).daten` liefert diese
  Form unverändert (kein Umbau nötig).
- **`KontextpaketV0Daten`** (`src/context-builder/types.ts:58-65`):
  `{ kontextpaket_schema: 'v0', lauf_id, rolle, elemente:
  KontextpaketElement[], ausgeschlossen: KontextpaketAusschluss[],
  erstellt_am }`. `KontextpaketElement = { pfad, zitierter_bereich,
  inhalts_hash }` — **kein** `inhalt`-Feld, das Kontextpaket-Artefakt
  trägt selbst keinen Volltext (`src/context-builder/types.ts:45-49`).
  Für die Auftragsauflösung (Befund 2) reicht das: der gesuchte Eintrag
  ist der mit `pfad === 'artefakt:auftrag-<auftragId>'`
  (`src/execution-controller/index.ts:181-190`, real bestätigt: die
  Referenz wird dort wörtlich mit diesem Präfix gebaut).
- **`LaufakteV0Daten`** (`src/claude-code-gateway/types.ts:58-68`): trägt
  bewusst **kein** `ergebnis`-Feld (F7-Grenze, AK12, Kopfkommentar der
  Datei) — deckungsgleich mit Befund 3.
- **`sha256Hex`** ist bereits Export aus `src/checkpoint-store/index.ts`
  (`src/checkpoint-store/index.ts:62`), wiederverwendet u. a. in
  `src/result-evaluator/index.ts` und `src/execution-controller/index.ts`
  — für AK8s Hash-Prüfung derselbe Import, keine zweite Implementierung
  (D5). `scripts/leitstand-server.mjs` importiert ihn heute **nicht**.
- **Reale Form von `permission_denials`-Einträgen** (`state/tp-nachtrag.md`
  Zeile 61/156, `state/gates.md` Zeile 734/1481, real beobachtete
  Rohausgaben): `{ tool_name: string, tool_use_id: string, tool_input:
  object }`. `tool_name` ist ein einfacher String
  (`"Bash"`/`"WebSearch"`/`"Write"` real beobachtet) — geeignet für eine
  „Kurzform" ohne `tool_input` auszuliefern (Abschnitt 2.2, D3 unten).
  `src/result-evaluator/index.ts`s eigenes `PermissionDenial`-Interface
  (Zeile 63-65) modelliert bewusst nur `tool_input` (F7 braucht nur das)
  — für die Leitstand-Projektion wird `tool_name` direkt aus dem rohen
  `leseErgebnisobjekt`-Ergebnis gelesen, nicht über dieses engere
  F7-Interface.
- **Der bestehende Detailendpunkt (WS-1) prüft `istLaufkette` nicht.**
  `GET /api/laeufe/<laufId>` (`scripts/leitstand-server.mjs:592-608`)
  prüft nur `LAUFID_UNZULAESSIGE_ZEICHEN` und `existsSync(join(
  basisVerzeichnis, laufId))` — anders als `sammleLaeufe`/
  `sammleLaufKopfdaten`, die `istLaufkette` (mindestens eine
  Wirkungsmarke) verlangen (AK1). Eine reine Artefaktkette (z. B.
  `lineage-auftrag-<id>` mit `laufId` `auftrag-<id>` — Achtung,
  Verzeichnisname trägt den `lineage-`-Präfix, der Pfadteil hinter
  `/api/laeufe/` wäre der volle Verzeichnisname) liefert heute `200` mit
  `checkpoints`/`laufStatus` statt `404`. Das ist kein WS-1-Bug im Sinne
  der AK1-Abnahme (AK1 gilt für die **Liste**, nicht den Detailendpunkt,
  `feature.md` AK2 nennt für den Detailendpunkt nur „404 bei unbekannter
  laufId") und über die UI nicht erreichbar (das Detail-Panel öffnet nur
  aus bereits gefilterten Listeneinträgen, Abschnitt 2.4). Als eigener
  Fund dokumentiert, nicht in `state/findings.md` nachgetragen (Auftrag
  begrenzt den Nachtrag ausdrücklich auf F-146/F-147) — Offene Frage 9
  unten stellt zur Diskussion, ob AK10 dafür einen fünften Gate-Fall
  bekommen soll.
- **`ArtefaktVersion`** (`src/lineage-registry/types.ts:45-53`):
  `{ artefaktId, versionSequenz, erzeugungsart, inhaltsHash, herkunft,
  eingaben, daten? }` — `daten` ist `unknown`, optional. Jede
  `ladeArtefaktVersion`-Auswertung in diesem Plan liest `.daten` typlos
  (Muster bereits in `leitstand-server.mjs`s `sammleAuftraege`,
  `version.daten?.titel`) und muss defensiv gegen fehlende Felder sein.

## 1. Ziel (prüfbar, WS-3)

Für einen gewählten, real existierenden Lauf zeigt der Leitstand ohne
Öffnen einer Datei: den Auftragstext (falls ein Auftragsbezug existiert),
die Elemente und Ausschlüsse des Kontextpakets (falls vorhanden), die
bereits bestehende Checkpoint-Kette mit Kettenintegrität/Staleness
(WS-1, unverändert wiederverwendet), die verfügbare F7-Terminal-
Klassifikation (`wirkungsmarke.ergebnis`, kein Mehr über F-146 hinaus)
und eine begrenzte, hashgeprüfte Rohstrom-Projektion (`exitCode`,
`startfehler`, `permission_denials`-Kurzform, Längenangaben) (AK7/AK8).
Jede der drei Zusatzquellen (Auftrag, Kontextpaket, Laufakte) darf für
einen Bestandslauf fehlen, ohne den Request zu 500en (Befund 6). Das
Detail-Panel überlebt den 2-Sekunden-Poll der Liste (AK7-UI-Anforderung).
Ein Gate `scripts/check-f12-leitstand-ansicht.mjs` prüft AK1, AK2, AK5,
AK8 mechanisch und ist in `npm run check` eingehängt (AK10). AK9 (realer
Nachweis) bleibt WS-4.

## 2. SCOPE

### 2.1 A — Detailprojektion (Schnitt von `GET /api/laeufe/<laufId>`)

Der bestehende Endpunkt wird **erweitert**, nicht ersetzt — `laufId`,
`checkpoints`, `laufStatus` bleiben unverändert (kein Bruch für
bestehende Aufrufer). Vier neue Top-Level-Felder, jedes mit eigenem
`status`-Unterfeld statt Weglassen bei Fehlen (Q, Muster `sammleAuftraege`
Q4/`continue`-statt-500, Bestandsfälle real aus Befund 6 belegt: 6 von 7
Laufketten haben laut Befund 6 keinen Auftragsbezug, der Endpunkt muss
das aushalten):

```
{
  laufId, checkpoints, laufStatus,          // unverändert (WS-1)
  kontextpaket: { status: 'ok', rolle, elemente, ausgeschlossen }
              | { status: 'nicht_vorhanden' },
  auftrag:      { status: 'ok', auftragId, titel, auftragstext }
              | { status: 'kein_auftragsbezug' }   // Kontextpaket da, aber kein artefakt:auftrag-*-Element (Bestandslauf, Befund 6)
              | { status: 'kontextpaket_fehlt' }    // Auftragsbezug nicht ermittelbar, weil Quelle 1 schon fehlt
              | { status: 'auftrag_fehlt', auftragId },   // Referenz vorhanden, Zielartefakt nicht (nicht erwartet, aber kein Wurf)
  laufakte:     { status: 'ok', modellBeobachtet, beobachtungsbasisVollstaendig, arbeitsverzeichnisPfad }
              | { status: 'nicht_vorhanden' },
  rohstrom:     { status: 'ok', exitCode, startfehler, permissionDenials: { anzahl, toolNamen }, stdoutLaenge, stderrLaenge }
              | { status: 'hash_weicht_ab' }
              | { status: 'nicht_verfuegbar' }
              | { status: 'laufakte_fehlt' },
}
```

`kontextpaket` wird **zuerst** geladen (`ladeArtefaktVersion(
'kontextpaket-<laufId>')`) — `auftrag` hängt kausal davon ab (Befund 2):
ohne Kontextpaket ist die `artefakt:auftrag-*`-Referenz nicht auffindbar,
`auftrag.status` wird dann `'kontextpaket_fehlt'`, nicht `'nicht_vorhanden'`
(Q1 unten — der Unterschied ist bewusst, damit die UI nicht fälschlich
„kein Auftrag gewählt" statt „Kontextpaket fehlt, Ursache unbekannt"
zeigt). `laufakte` und `rohstrom` sind unabhängig ladbar (eigene
Artefaktkette `laufakte-<laufId>`, Befund 2) — `rohstrom.status ===
'laufakte_fehlt'`, wenn `laufakte.status === 'nicht_vorhanden'` (kein
zweiter Ladeversuch).

Neue Pure-Funktionen in `scripts/leitstand-server.mjs` (kein Bau hier,
nur Benennung fürs `Ablageort`-Kapitel unten):
`baueKontextpaketProjektion(laufId, basisVerzeichnis)`,
`baueAuftragsbezug(kontextpaketErgebnis, basisVerzeichnis)` (auch von
Abschnitt C/F-147 wiederverwendet — **eine** Ableitungsfunktion, zwei
Aufrufer: Kopfdaten brauchen nur `{auftragId, titel}`, Detail braucht
zusätzlich `auftragstext`, siehe Q2), `baueLaufakteProjektion(laufId,
basisVerzeichnis)`, `baueRohstromProjektion(laufakteVersion, repoWurzel)`.

### 2.2 B — AK8-Lesepfad, harte Invarianten

- Auflösung **ausschließlich** über `laufakteVersion.daten.rohstrom_referenz.pfad`
  — nie aus der URL/laufId gebaut (AK8-Wortlaut, Befund 5).
- `loeseEvidenzPfadAuf(pfad, repoWurzel)` wiederverwendet (Befund 1, D5)
  — kein zweiter Pfad-Sicherheits-Check. `repoWurzel` ist dieselbe
  Server-Option wie bei AK6 (`erzeugeRequestHandler`s bestehendes
  `repoWurzel`-Feld), kein neues Optionsfeld.
- `arbeitsverzeichnis_pfad` wird in `laufakte` **angezeigt**, aber **nie**
  zur Auflösung des Rohstroms benutzt (wäre ein absoluter Lesepfad,
  Auftragsvorgabe wörtlich).
- **Hash zuerst, Inhalt danach:** `sha256Hex(readFileSync(zielPfad,
  'utf8'))` gegen `rohstrom_referenz.inhalts_hash` geprüft, **bevor**
  irgendein Feld aus dem Inhalt projiziert wird. Bei Abweichung:
  `{ status: 'hash_weicht_ab' }`, **kein** `exitCode`/`permissionDenials`/
  sonstiges Feld in der Antwort — nie stillschweigend Inhalt ausliefern,
  auch nicht teilweise. Fehlt die Datei (`existsSync` false oder
  `loeseEvidenzPfadAuf` liefert `ok:false`): `{ status: 'nicht_verfuegbar'
  }`. Beides sichtbar (eigener `status`-Wert), nie ein leeres Objekt.
- **Begrenzte Projektion, nie roher Rohstrom:** `exitCode` und
  `startfehler` kommen direkt aus dem geparsten `rohstrom`-Wurzelobjekt
  (`ProzessErgebnis`-Form, `src/claude-code-gateway/types.ts:37-42`,
  bereits bekannte, stabile Form — kein zweites Parsing-Schema).
  `permissionDenials` kommt über `leseErgebnisobjekt(rohstrom.stdout)`
  (Befund 4, D5) → `ergebnisobjekt.permission_denials` → reduziert auf
  `{ anzahl: denials.length, toolNamen: [...neue Set(denials.map(d =>
  d.tool_name).filter(t => typeof t === 'string'))] }` (0b: `tool_name`
  ist ein real beobachteter, einfacher String-Wert — `tool_input` wird
  **nie** ausgeliefert, D3 unten). `stdoutLaenge`/`stderrLaenge` sind
  `.length` der jeweiligen Strings, nie der Inhalt selbst. Begründung:
  der Rohstrom kann beliebig große, potenziell sensible Werkzeugausgaben
  enthalten (Dateiinhalte, Suchergebnisse) — AK8-Wortlaut verlangt
  „mindestens exitCode und permission_denials", keine Volltextanzeige;
  eine begrenzte Projektion hält die Antwortgröße unabhängig von der
  Länge eines realen Laufs klein (Parallele zu D4 aus WS-2, schlanke
  Antwort).

### 2.3 C — F-147: `auftragsbezug` in `sammleLaufKopfdaten` füllen

`baueAuftragsbezug` (2.1) wiederverwendet: Kopfdaten laden zusätzlich
`kontextpaket-<laufId>` und bei Treffer `auftrag-<auftragId>`, liefern
`auftragsbezug: { auftragId, titel } | null` (`null` bleibt der Wert für
jeden Lauf ohne `artefakt:auftrag-*`-Element — Bestandsverhalten, kein
Rückschritt gegenüber WS-1/WS-2, Befund 6/8). **Kein** `auftragstext` in
den Kopfdaten (D4 aus WS-2 bleibt gültig, nur die Detailansicht braucht
den Volltext).

**Kosten (F-140-Einordnung):** pro Lauf im 2-Sekunden-Poll kommen bis zu
zwei zusätzliche `ladeArtefaktVersion`-Aufrufe hinzu (Kontextpaket,
optional Auftrag) — F-140 misst bereits 3,5-3,9 s für 28 Verzeichnisse/35
Checkpoints ohne diese Aufrufe; die reale Größenordnung heute ist 7
Laufketten (Befund 6), der Mehraufwand bleibt bei diesem Bestand klein,
skaliert aber linear mit, genau wie die bereits bekannte F-140-Kurve.
**Empfehlung:** trotzdem umsetzen — AK2 verlangt `auftragsbezug`
ausdrücklich als Kopfdatum, F-147 ist ein realer Soll-Ist-Bruch seit
WS-1/WS-2, kein hypothetisches Risiko. Kein Caching, keine
Sonderbehandlung in WS-3 (YAGNI, F-140 bleibt eigenständig zu lösen, hier
nicht mit-gelöst) — Offene Frage 3 unten.

### 2.4 D — UI (AK7)

Neues Element `<section id="lauf-detail" hidden>` in
`public/leitstand/index.html`, **außerhalb** von `<div id="laeufe">`
(Befund 7/0a-Punkt 7: `laden()` überschreibt `#laeufe.innerHTML`
vollständig alle 2000 ms — ein Detail-Panel innerhalb dieses Containers
würde bei jedem Poll verschwinden bzw. die gewählte `laufId` verlieren).

`app.js`: modulweite Variable `let gewaehlteLaufId = null` (Muster
`letzterLaufIdVorschlag`, bereits im Datei-Stil). Jede `laufAbschnitt`-
Zeile bekommt einen „Details"-Button (`data-lauf-id`, Muster
`wiederaufnahme-btn`); Klick-Delegation an `#laeufe` (bestehendes Muster
`initWiederaufnahmeBedienung`) setzt `gewaehlteLaufId` und ruft
`ladeLaufDetail(laufId)` — **nicht** Teil von `laden()`/dem Poll-Intervall
(AK2-Wortlaut: „Detail nur auf Anforderung"). `ladeLaufDetail` rendert in
`#lauf-detail`, macht den Container sichtbar, und rendert die
Checkpoint-Kette über die bestehenden, seit WS-1 unbenutzten
`checkpointZeile`/`statusZelle`/`staleZelle` (Befund 7 — wiederverwendet,
nicht neu geschrieben). Ein Fehlschlag von `ladeLaufDetail` (Netzwerk,
404 bei zwischenzeitlich verschwundenem Lauf — unwahrscheinlich, F1 ist
append-only, aber kein Wurf) zeigt Klartext im Panel statt eines leeren
Containers (Muster `zeigeStartFehler`).

### 2.5 E — AK10-Gate `scripts/check-f12-leitstand-ansicht.mjs`

Eingehängt in `package.json` `"check"`/`"check:template"` nach
`check-f11-auftrag.mjs` (Muster: einfache `&&`-Kette, exakt wie jeder
bisherige Feature-Gate-Eintrag). Vier Fälle mechanisch, Muster
`scripts/check-f10-leitstand.mjs` (eigenes `basisVerzeichnis`/`repoWurzel`
im Temp-Verzeichnis, `erzeugeRequestHandler` direkt, echter HTTP-Request):

- **AK1:** eine reine Artefaktkette (z. B. per `registriereAuftrag`
  angelegter Auftrag, kein Lauf) erscheint nicht in `GET /api/laeufe`
  (Wiederholung/Regressionsschutz des bereits in WS-1 real geprüften
  Verhaltens — WS-3 fügt hier keine neue Logik hinzu, das Gate sichert
  nur ab, dass AK7/AK8s Erweiterungen `sammleLaeufe`/`istLaufkette`
  nicht versehentlich verändern).
- **AK2:** die Listenantwort (`GET /api/laeufe`) enthält keine
  Checkpoint-Vollprojektion (kein `checkpoints`-Array je Eintrag) —
  ebenfalls Regressionsschutz, WS-3 rührt `sammleLaufKopfdaten`s Schnitt
  bis auf das neue `auftragsbezug`-Feld (2.3) nicht an.
- **AK5:** Body mit `auftragstext` → 400; unbekannte `auftragId` → 400 —
  Wiederholung der WS-2-Fälle (`feature.md` AK10 nennt sie ausdrücklich
  für **dieses** Gate, nicht `check-f10/f11`, Offene Frage 6 aus dem
  WS-2-Plan war noch offen; dieser Plan entscheidet sie hiermit: die
  Fälle wandern **nicht** zusätzlich hierher, sie bleiben, wo sie WS-2
  bereits gebaut hat — `check-f10-leitstand.mjs`/`check-f11-auftrag.mjs`
  — dieses Gate deckt sie nur ab, falls `feature.md` AK10 sie wörtlich
  als Pflicht **hier** verlangt; da der Wortlaut „prüft mechanisch: …
  AK5" nicht sagt „an einer neuen Stelle", reicht ein Verweis/Duplikat-
  Testfall mit denselben Aussagen in der neuen Datei, um AK10 auch
  isoliert (nur dieses eine Gate ausgeführt) beweiskräftig zu machen —
  Q7).
- **AK8:** manipulierter Rohstrom → sichtbare Hash-Abweichung
  (`rohstrom.status === 'hash_weicht_ab'`), **kein** `exitCode`/
  `permissionDenials`/sonstiges Rohstromfeld in der Antwort, kein
  stiller Durchlauf. Aufbau: echte Laufakte mit `rohstrom_referenz` auf
  eine reale Testdatei im Temp-Repo-Root schreiben (`registriereKernArtefakt`
  direkt oder über eine minimal echte `starteGateway`-Attrappe — TBD im
  Bauauftrag, kein Blocker hier), Datei nach Registrierung manipulieren
  (Bytes ändern), Request gegen `GET /api/laeufe/<laufId>` senden.

**Auflage (Befund 9):** kein Gate-Fall darf einen erfolgreichen Lauf
starten (`fuehreAufgabeDurchFn`/`POST /api/laeufe` mit einem echten
Startziel) — alle vier Fälle bauen ihre Fixtures direkt über die
exportierten Artefakt-/Checkpoint-Funktionen, nicht über den Startpfad.

## 3. NICHT (WS-3 Non-Scope, mit Grund)

- **F-146 wird NICHT behoben** — kein zusätzliches Persistieren von
  Klassifikationsdetails (`bypass_verdacht_anzahl`/`is_error`/
  `non_execution_kind`/Fehlschlaggrund) in Wirkungsmarke oder Laufakte.
  AK7 verlangt nur die vorhandene F7-Klassifikation zu **zeigen**, keine
  neue Persistenzform zu **schaffen** — das wäre ein `src/`-Eingriff und
  widerspricht Befund 1.
- **F-145 wird NICHT behoben** — gehört laut Befund 9/`feature.md` vor
  WS-4, nicht hierher. Die Auflage aus 2.5 (kein Gate-Fall startet einen
  Lauf) macht WS-3 davon unabhängig.
- **Keine Findings-Ansicht, kein Design-System** — `feature.md`
  Nicht-Ziele, unverändert.
- **Keine Änderung an `src/`** — Befund 1, durchgängig eingehalten
  (Abschnitt 2 baut ausschließlich in `scripts/leitstand-server.mjs`,
  `public/leitstand/*`, `scripts/check-f12-leitstand-ansicht.mjs`).
- **AK9 (realer Nachweis)** — WS-4, zwingend nach WS-3 laut
  Workstream-Reihenfolge.
- **Keine Behebung des in 0b dokumentierten Detailendpunkt-Fundes**
  (fehlende `istLaufkette`-Prüfung bei `GET /api/laeufe/<laufId>`) ohne
  Freigabe — Offene Frage 9.
- **Kein Caching/keine Performance-Optimierung für F-147/F-140** — der
  zusätzliche Ladeaufwand aus 2.3 wird bewusst in Kauf genommen, nicht
  in WS-3 gelöst (YAGNI, eigenständiges Finding).

## 4. Design-Entscheidungen

- **D1 (jede der drei Zusatzquellen bekommt einen eigenen `status`-Wert
  statt eines einzigen `gefunden: boolean`):** ein reines Boolean könnte
  „Kontextpaket fehlt" nicht von „Kontextpaket da, aber kein
  Auftragsbezug" unterscheiden (Q1) — beide sind für die UI fachlich
  verschiedene Aussagen („kein Datenmaterial" vs. „reale, ältere
  Ausführung ohne Auftrag"). Braucht Freigabe (Q1).
- **D2 (Hash-Prüfung read-then-verify-then-project, nie umgekehrt):**
  AK8-Wortlaut wörtlich; verhindert, dass ein teilweise projeziertes
  Feld (z. B. `exitCode`) bei abweichendem Hash trotzdem sichtbar würde,
  falls ein künftiger Refactor die Projektionsreihenfolge vertauscht —
  deshalb als bewusste Reihenfolge-Regel benannt, nicht nur implizit im
  Code.
- **D3 (`tool_input` wird nie ausgeliefert, nur `tool_name` in
  `permissionDenials.toolNamen`):** `tool_input` kann beliebige,
  potenziell große/sensible Werkzeugargumente enthalten (real
  beobachtet: Suchanfragen, Shell-Kommandos, `state/tp-nachtrag.md`) —
  „begrenzte Projektion" (AK8-Wortlaut) wird hier strikt ausgelegt,
  analog zu WS-2s D5 (Werkzeugsatz-Antwort). Braucht Freigabe (Q4, da
  `feature.md` selbst keine Feldliste für die Kurzform vorgibt).
- **D4 (`baueAuftragsbezug` wird von Kopfdaten (2.3) und Detail (2.1)
  gemeinsam genutzt, nicht zweimal geschrieben):** D5-Prinzip
  (Wartbarkeit/Wiederverwendung) — eine Funktion liefert die
  Rohstruktur `{auftragId, titel} | {auftragId, titel, auftragstext} |
  null`, der jeweilige Aufrufer schneidet `auftragstext` weg, statt zwei
  unabhängige Ableitungspfade zu pflegen. Konkrete Signatur (ob
  `auftragstext` optional immer mitgeladen und vom Kopfdaten-Aufrufer
  verworfen wird, oder ein zweites `mitAuftragstext`-Flag bekommt) ist
  Sache des Bauauftrags, nicht dieses Plans (Q2).
- **D5 (kein neues Optionsfeld für den Rohstrom-Lesepfad):**
  `repoWurzel` existiert bereits in `erzeugeRequestHandler`s Optionen
  (AK6/WS-2) — AK8 nutzt dasselbe Feld, kein zweites `rohstromRepoWurzel`
  o. Ä. (YAGNI, D5-Prinzip aus `CLAUDE.md`).

## 5. Risiken/offene Fragen für Stefan/Advisor (vor Bau)

1. **D1s drei-/vierwertiger `auftrag.status`** — genau die vier
   Ausprägungen aus 2.1 (`ok`/`kein_auftragsbezug`/
   `kontextpaket_fehlt`/`auftrag_fehlt`), oder reicht eine gröbere
   Unterscheidung? `auftrag_fehlt` (Referenz vorhanden, Zielartefakt
   nicht) ist im realen Bestand nicht beobachtet (F1 ist append-only,
   sollte nicht vorkommen) — als Diagnosefall trotzdem vorgesehen
   („nie stillschweigend", Entscheidungsregel `CLAUDE.md`).
2. **Genaue Signatur von `baueAuftragsbezug`** (D4) — ein Aufrufer-Flag,
   zwei getrennte Funktionen, oder immer alles laden und am Ende
   kürzen? Kein Fachrisiko, reine Bauauftrag-Entscheidung, hier nur
   benannt, damit sie nicht stillschweigend fällt.
3. **F-147s Mehrkosten (2.3)** — akzeptiert wie hier vorgeschlagen
   (sofort umsetzen, keine Optimierung), oder soll F-147 zurückgestellt
   werden, bis F-140 gelöst ist? Empfehlung: umsetzen (AK2-Pflicht,
   siehe 2.3-Begründung).
4. **AK7-UI-Detailgrad** — zeigt das Detail-Panel `ausgeschlossen`
   (Kontextpaket-Ausschlüsse, Grund `rolle`/`budget`) vollständig, oder
   nur `elemente`? `feature.md` AK7 nennt wörtlich „die Elemente des
   Kontextpakets" — `ausgeschlossen` nicht explizit erwähnt. Empfehlung:
   mitliefern (API-seitig ohnehin im Kontextpaket-Artefakt vorhanden,
   D5 — kein Grund, es der UI vorzuenthalten), aber Anzeige optional/
   eingeklappt.
5. **Testaufbau für den AK8-Rotfall (2.5)** — `registriereKernArtefakt`
   direkt für eine synthetische Laufakte, oder eine minimal echte
   `starteGateway`-Attrappe (Muster `check-f10-leitstand.mjs`)? Erste
   Variante ist einfacher und ausreichend, da AK8 nur die
   Hash-Prüfung/Pfadauflösung testet, keine reale Prozessausführung
   braucht — Empfehlung: `registriereKernArtefakt` direkt, spart eine
   künstliche Wirkungsmarke.
6. **Reihenfolge-Frage aus dem WS-2-Plan (dort Q6), hier durch 2.5
   beantwortet, aber zur Freigabe vorgelegt:** die AK5-400-Fälle bleiben
   in `check-f10-leitstand.mjs`/`check-f11-auftrag.mjs` (WS-2 hat sie
   dort bereits real gebaut), `check-f12-leitstand-ansicht.mjs`
   dupliziert sie nur so weit, wie nötig, um AK10 auch bei isoliertem
   Gate-Lauf zu belegen. Alternative: AK10 gilt bereits durch die
   bestehenden Testfälle als erfüllt, keine Duplizierung nötig, `feature.
   md`s Aufzählung ist nur eine Inhaltsbeschreibung, keine
   Ortsvorgabe — dann entfällt der AK5-Teil dieses Gates komplett.
   Empfehlung: letztere Variante (kein Duplikat, Verweis in der
   Kopfdokumentation des neuen Gates auf die bestehenden Testorte) —
   vermeidet zwei Wahrheiten über denselben Sachverhalt.
7. **`toolNamen` als `Set`-dedupliziert oder Roh-Liste mit Duplikaten?**
   (2.2) — ein Werkzeug kann mehrfach verweigert werden (z. B. zwei
   `Bash`-Versuche). `anzahl` zählt alle Denials (roh), `toolNamen` ist
   in diesem Plan als deduplizierte Menge vorgeschlagen (informativ:
   „welche Werkzeuge", nicht „wie oft welches") — Alternative wäre eine
   parallele Liste mit Duplikaten. Kein Blocker, Bauauftrag-Entscheidung.
8. **Der in 0b dokumentierte Detailendpunkt-Fund** (fehlende
   `istLaufkette`-Prüfung) — in WS-3 mit beheben (ein `if
   (!istLaufkette(...)) return 404` vor der bestehenden Antwort, eine
   Zeile) oder unangetastet lassen und als eigenständiges Finding
   nachtragen? Er ist über die UI nicht erreichbar, aber über die rohe
   API schon. Nicht Teil des AK7/AK8-Wortlauts, deshalb hier nur als
   Frage behandelt, nicht als Entscheidung getroffen.

## 6. Ablageort (Vorschlag für den Bau, hier nicht angelegt)

- `scripts/leitstand-server.mjs` — `GET /api/laeufe/<laufId>` erweitert
  (2.1), `sammleLaufKopfdaten` um `auftragsbezug` ergänzt (2.3,
  F-147), neue Funktionen `baueKontextpaketProjektion`,
  `baueAuftragsbezug`, `baueLaufakteProjektion`, `baueRohstromProjektion`,
  `sha256Hex`-Import ergänzt.
- `public/leitstand/index.html` — neues `#lauf-detail`-Element außerhalb
  von `#laeufe`.
- `public/leitstand/app.js` — `ladeLaufDetail`, Render-Funktionen fürs
  Detail-Panel (reaktivieren/erweitern von `checkpointZeile`/
  `statusZelle`/`staleZelle`), „Details"-Button je `laufAbschnitt`-Zeile,
  Klick-Delegation.
- `scripts/check-f12-leitstand-ansicht.mjs` — neu, vier Fälle (2.5).
- `package.json` — `"check"`/`"check:template"`-Kette um den neuen
  Gate-Aufruf ergänzt, nach `check-f11-auftrag.mjs`.
- `state/gates.md`, `docs/STATUS.md`, `features/F12/journal.md` —
  Einträge erst nach realem Bau-/Prüflauf.

## 7. Budget & Pässe

- Dieser Schritt liefert **nur** diesen Plan — kein Bau, kein
  Advisor-Pass, kein Handoff-Vertrag.
- Empfohlener nächster Schritt: Klärung der neun offenen Fragen
  (Abschnitt 5) durch Stefan, danach Advisor-Pass mit Fokus auf D1/D3
  (die beiden Stellen, an denen dieser Plan über den reinen
  `feature.md`-Wortlaut hinaus eigene Strukturentscheidungen trifft) und
  auf Frage 6 (Vermeidung doppelter Testwahrheiten zwischen WS-2- und
  WS-3-Gates).
- Zuschnitt-Heuristik (`CLAUDE.md`): WS-3 bleibt reine Projektion (kein
  `src/`-Eingriff, Befund 1) — ein neuer Endpunkt-Erweiterungsschritt,
  ein UI-Panel, ein neues Gate-Skript, ein Package.json-Eintrag bilden
  einen zusammenhängenden Baudurchgang plus höchstens eine
  Korrekturrunde, sofern die neun offenen Fragen vorab entschieden sind.

## 8. Akzeptanzkriterien — Zuordnung zu Testfällen (Entwurf, vor Advisor-Pass nicht final)

| AK | Testfall (Kurzform) | Ort |
|---|---|---|
| AK7 | `GET /api/laeufe/<laufId>` liefert `auftrag`/`kontextpaket`/`laufakte` mit korrektem `status` für (a) einen vollständigen WS-2-Lauf, (b) einen Bestandslauf ohne jede Zusatzquelle | neue Testfälle, `check-f12-leitstand-ansicht.mjs` oder `check-f10-leitstand.mjs`-Erweiterung (Offene Frage 6 sinngemäß) |
| AK8 | (a) gültiger Rohstrom → `status: 'ok'` mit reduzierten Feldern, kein Volltext; (b) manipulierter Rohstrom → `status: 'hash_weicht_ab'`, kein Feld; (c) fehlende Datei → `status: 'nicht_verfuegbar'` | `check-f12-leitstand-ansicht.mjs` (2.5) |
| AK10 | Gate meldet alle vier Fälle mechanisch, Exit 0 im Grünfall, Exit 1 bei injiziertem Rotfall (Kalibrierung) | `check-f12-leitstand-ansicht.mjs` selbst, `npm run check`-Kette |

## 9. Rollen für diesen Workstream

| Position | Träger | Rechte |
|---|---|---|
| Advisor | Subagent `architecture-advisor`, frisch | `Read, Grep, Glob` |
| Executor | Claude-Code-Sitzung, frisch, kennt nur Repo + Vertragsvolltext | voll im freigegebenen Pfad |
| Reviewer | Subagenten `code-reviewer`, `qa`, frisch | read-only |
| Mensch (Stefan) | — | Freigaben, Klärung Abschnitt 5, Release |

## 10. Nächste Schritte nach diesem Plan (nicht Teil dieses Auftrags)

1. Klärung der neun offenen Fragen (Abschnitt 5) durch Stefan.
2. Advisor-Pass auf diese Datei (Fokus: D1/D3, Frage 6).
3. Findings → `state/advisor-findings-f12-ws3.md`.
4. Falls nötig: plan-v2 als eigene Datei.
5. Handoff-Vertrag für WS-3 — erst danach, nicht Teil dieses Auftrags.

## Status
- [ ] Freigegeben
- [ ] Freigegeben mit Hinweisen
- [ ] Nicht freigegeben
- [ ] Blockiert

## Nächster sinnvoller Schritt
Freigabe dieses Plans durch Stefan, insbesondere der neun offenen Fragen
(Abschnitt 5) und der beiden eigenständigen Design-Entscheidungen D1/D3,
danach Advisor-Pass — noch kein Bau.
