# F45 B5a-1 „Akte schreiben“ — Plan v1

Basis: main = `5c94d69`, Branch `f45/b5a1-akte-schreiben`. Nur Daten/Server, keine UI (B5a-2).
Grundlage: zielfassung §13.6 (E-F45-1), F-912, F-995, E-B5-2, Zwischenmuster F-1131.

## 1. Ziel

1. `PUT /api/features/<id>/akte` — Ziel, Nicht-Ziele, Akzeptanzkriterien einer Akte bearbeiten.
2. `POST /api/features` — Akte aus einem Coach-Scope anlegen (Status ENTWURF, nächste freie F-Nummer).
3. `GET /api/features/<id>/akte` additiv um `hash` und `entscheidungen[]`.
4. `scripts/check-akte-meilenstein.mjs`: ENTWURF darf ohne Meilenstein sein (E-B5-2).

## 2. Module

| Datei | Änderung |
|---|---|
| `src/feature-auftrag/akte-schreiben.ts` (neu) | rein: `bearbeiteFeatureAkte(inhalt, featureId, aenderung, datum)`, `leseEntscheidungen(inhalt)`, `baueBulletZeilen(praefix, text)`, `erkenneZeilenende(inhalt)` |
| `src/feature-auftrag/index.ts` | `leseAbschnitt`, `leseTopLevelBullets` zusätzlich exportiert (kein Verhaltenswechsel) |
| `src/product-coach/index.ts` | `baueFeatureAkteAusScope(scope, bestehendeIds, datum)` rein, neben `baueAuftragAusScope` (dessen Verhalten unverändert); `validiereScope` zusätzlich exportiert |
| `src/workboard/feature-akte-pruefung.ts` (neu) | `pruefeFeatureAkteInhalt(inhalt): string[]` — die Regeln von `check-feature.mjs` als reine Funktion |
| `scripts/check-feature.mjs` | ruft `pruefeFeatureAkteInhalt` je Akte; Meldungstexte bytegleich (`<pfad>: <befund>`) |
| `scripts/leitstand/routen-f35.mjs` | `erkenneAkteRoute(pfad)`, `fuehreAkteRouteDurch(route, methode, koerper, kontext)`; GET-Projektion um hash/entscheidungen |
| `scripts/leitstand-server.mjs` | GET-akte-Block (13 Zeilen) durch einen Dispatch-Block (≈10 Zeilen) ersetzt; Server-Zeilen sinken |
| `scripts/check-akte-meilenstein.mjs` (+ `.test.mjs`) | 4. Parameter `aktenStatus` (Map id→Status), `leseAktenStatus`; Kopf-Kommentar |
| `scripts/check-f45-b5a1-akte.mjs` (neu) | Gate, in `check:gates` |
| Tests | `src/feature-auftrag/akte-schreiben.test.ts`, `src/product-coach/product-coach.test.ts` (+Fälle), `src/workboard/feature-akte-pruefung.test.ts`, `scripts/leitstand/routen-f35.test.mjs` (neu) |

## 3. Datenvertrag

### GET …/akte (additiv)
Beide 200-Körper (`ok` und `unvollstaendig`) erhalten `hash` (sha256 hex der Dateibytes) und
`entscheidungen: { id, text }[]` — Top-Level-Bullets unter `## Entscheidungen`, deren Text eine
Kennung `E-…` trägt (`/\bE-[0-9A-Za-z]+(?:-[0-9A-Za-z]+)*/`, erste Fundstelle = id). Bullets ohne
E-Kennung (z. B. „**Sammlung als Basis**“) fehlen. Kein Abschnitt → `[]`.

### PUT …/akte
Körper genau `{ ziel, nicht_ziele, akzeptanzkriterien, grund, hash }`, unbekannte Felder → 400.
- `ziel`: nicht-leerer String; keine Zeile, die mit `##` + Leerraum beginnt (sonst entstünde ein Abschnitt).
- `nicht_ziele`: String[] (je nicht leer), ≤ 100.
- `akzeptanzkriterien`: `{ id, text }[]` wie GET liefert, ≥ 1, ≤ 100, id `^AK\d+$` eindeutig, text nicht leer.
  Gleiche Form wie GET ⇒ Rundlauf ohne Umnummerierung (AK-Verweise in Stand-Abschnitten bleiben gültig).
- `grund`: nicht leer nach trim (sonst 400), Leerraum zu einem Leerzeichen, ≤ 500 Zeichen.
- `hash`: sha256 hex.
- Körpergrenze 64 KiB (`leseJsonBegrenzt`, 413).

Ablauf (Reihenfolge):
1. ID-Prüfung `FEATURE_ID_MUSTER` (400), Pfadsicherheit `loeseFeatureAktePfadAuf` (F-595), Akte fehlt → 404.
2. Körper prüfen → 400.
3. Sperre: `kontext.workflows()` (= `sammleWorkflows`), je Workflow mit Status ∉ {ABGESCHLOSSEN, GESTOPPT}
   (unbekannter/fehlender Status sperrt) den Auftrag `auftrag-<auftragId>` laden; `feature_ref === id` → 409
   `{ grund, workflowId }`. Asynchron, deshalb VOR dem Lesen der Datei.
4. Ab hier synchron bis zum Schreiben (kein `await`): Datei lesen, Hash vergleichen → 409 `{ grund, hash }`.
5. `bearbeiteFeatureAkte` → neuer Inhalt oder Fachfehler (422).
6. `pruefeFeatureAkteInhalt(neu)` nicht leer → 422 `{ grund, verstoesse }`, nichts geschrieben.
7. Rundlauf-Probe: `leseFeatureAkteAnzeige(neu)` muss genau ziel/nicht_ziele/akzeptanzkriterien der Anfrage
   liefern (Zeilenenden normalisiert) und die Status-Zeile unverändert lassen → sonst 422.
8. `writeFileSync`. Antwort 200 `{ status: 'ok', id, hash, geaendert: string[], git: string[] }`.

Keine Änderung (alle drei Abschnitte semantisch gleich) → 422 „nichts geändert“, nichts geschrieben.

### Schreibregel (`bearbeiteFeatureAkte`)
- Zeilenweise mit erhaltenem Zeilenende (`split(/(?<=\n)/)`); Zeilenende der Datei = erstes gefundenes
  (`\r\n` oder `\n`), neue Zeilen tragen dieses.
- Abschnitt = erste Überschriftzeile, die das Leser-Muster trifft (`/^##\s+Ziel\b/`, `…Nicht-Ziele\b`,
  `…Akzeptanzkriterien\b` — dieselben wie `leseAbschnitt` und `check-feature`), Körper bis vor die nächste
  `^##\s+`-Zeile bzw. Dateiende. Die Überschriftzeile selbst bleibt bytegleich.
- Neuer Körper: führende Leerzeile, wenn der alte Körper mit einer begann; dann der Inhalt; dann eine
  Leerzeile, wenn eine Überschrift folgt.
  - Ziel: getrimmter Text, Zeilenenden auf das Datei-Zeilenende umgestellt.
  - Nicht-Ziele: je Eintrag `- <text>`; leere Liste → Zeile `keine` (kein Bullet, liest sich als `[]`).
  - AK: je Eintrag `- AK<n>: <text>`.
  - Mehrzeiliger Eintrag (`baueBulletZeilen`): Zeilen getrimmt, leere entfallen, Folgezeilen mit zwei
    Leerzeichen eingerückt — der Leser hängt sie wieder mit `\n` an (Rundlauf stabil; eingerückte Zeilen
    werden weder Bullet noch Überschrift).
- Fehlender Abschnitt: direkt vor `## Änderungen` eingefügt, sonst am Dateiende (Nicht-Ziele nur, wenn
  die Liste nicht leer ist).
- `geaendert` = Abschnitte, deren gelesener Wert (alt, über `leseAbschnitt`/`leseTopLevelBullets`) vom
  neuen abweicht; nur diese werden ersetzt — ein unveränderter Abschnitt bleibt bytegleich.
- `## Änderungen` (exakt `^##[ \t]+Änderungen[ \t]*$`): Zeile `- <JJJJ-MM-TT> · <Abschnitte, mit „, “> · <grund>`
  nach der letzten nicht-leeren Zeile des Abschnitts eingefügt; fehlt der Abschnitt: am Dateiende
  (vorher Zeilenende ergänzt, falls die Datei ohne endet) Leerzeile + Überschrift + Zeile.
- Datum: lokales Datum, vom Aufrufer übergeben (rein, testbar).

### POST /api/features
Körper genau `{ scope }`; `validiereScope` (dieselbe Regel wie der Coach) → 400.
- `baueFeatureAkteAusScope(scope, kontext.bestehendeIds(), datum)` → `{ featureId, inhalt }`;
  `featureId = F<höchste Nummer + 1>` über die vorhandene `naechsteFreieNummer` (Ordner unter `features/`
  plus `roadmap.json`, `sammleBestehendeIds`).
- Inhalt (LF):
  `# F<n> — <titel>` / `## ID` / `## Titel` / `## Status` `Status: ENTWURF` / `## Ziel` (ziel, Leerzeile,
  `Problem: <problem>`) / `## Nicht-Ziele` (out_of_scope bzw. `keine`) / `## Akzeptanzkriterien`
  `- AK1: <erfolgskriterium>` / `## Scope` (in_scope) / `## Annahmen` / `## Offene Fragen` /
  `## Dependencies` `keine` / `## Änderungen` `- <Datum> · angelegt · aus Coach-Scope`.
  Titel ohne ID-Präfix (`entferneIdPraefix`), einzeilig.
- Prüfung `pruefeFeatureAkteInhalt` (422 bei Befund — Verteidigungslinie).
- `mkdirSync(features/<id>, recursive)` + `writeFileSync(…, { flag: 'wx' })`; `EEXIST` → 409, nie
  überschreiben. Pfad über `loeseFeatureAktePfadAuf`. Gilt für `repoWurzel` dieser Instanz (E-F41-2).
- Kein Roadmap-Eintrag (E-B5-2: ENTWURF ohne Meilenstein zulässig).
- Antwort 201 `{ status: 'ok', id, hash, git }`.

### Git-Block
`befehlsBlock(repoWurzel, [git add -- <pfad>, git commit -m <Nachricht>])` aus
`public/leitstand/code-daten.js` (Blockform F-1088 (5), wie jarvis-orte.mjs); Pfad über `gitPfadArgument`,
Nachricht über `psArgument`. Nur Text, nichts ausgeführt, kein `git`-Prozess (F-1000 unberührt).
Nachricht PUT: `<id>: Akte bearbeitet (<Abschnitte>) — <grund>`; POST: `<id>: Akte angelegt aus Coach-Scope`.

### Server-Dispatch (F-1131)
```js
const akteRoute = erkenneAkteRoute(pfad)
if (akteRoute !== null) {
  const koerper = req.method === 'PUT' || req.method === 'POST' ? await leseJsonBegrenzt(req, 65536) : null
  const kontext = { repoWurzel, ladeOptionen: { basisVerzeichnis, schreiber: STILLER_SCHREIBER }, workflows: () => sammleWorkflows(basisVerzeichnis), bestehendeIds: () => sammleBestehendeIds(repoWurzel, roadmapPfad), datum: heutigesDatum() }
  const antwort = await fuehreAkteRouteDurch(akteRoute, req.method, koerper, kontext)
  sendeJson(res, antwort.status, antwort.koerper)
  return
}
```
`erkenneAkteRoute` trifft `/api/features` und `/api/features/<roh>/akte`; falsche Methode → 405 im Modul.
CSRF/Host prüft der zentrale Haken. Datum bildet das Modul selbst (lokal), Tests übergeben `kontext.datum`.

## 4. Zustände / Fehler
400 (ID, Körper, grund leer), 404 (Akte fehlt), 405, 409 (Hash, Sperre mit workflowId, Anlage existiert),
413 (Körper zu groß), 422 (Gate-Verstöße, Rundlauf, nichts geändert), 500 (Lese-/Schreibfehler, catch
mit Grund). Leere Listen: Nicht-Ziele `keine`; AK leer → 400.

## 5. Gate `check-f45-b5a1-akte.mjs`
Attrappen-Repo zur Laufzeit (mkdtemp, nichts eingecheckt), echte Routen über `fuehreAkteRouteDurch`
plus ein HTTP-Durchstich über `erzeugeRequestHandler` (PUT und POST erreichen das Modul, nicht 404):
(a) Hash-409 mit aktuellem Hash, Datei unverändert; (b) Sperre-409 mit workflowId (nicht-terminal) und
Gegenprobe ABGESCHLOSSEN → kein 409; (c) grund leer → 400; (d) bytegleich außerhalb der drei Abschnitte
und `## Änderungen` bei LF und bei CRLF, Zeilenenden erhalten (keine `\n` ohne `\r` in CRLF-Datei);
(e) Anlage schreibt neue Akte, zweite Anlage auf belegte ID → 409 ohne Überschreiben (vorab angelegte
Datei bytegleich); (f) nächste freie ID über Ordner und roadmap.json; (g) Entscheidungen-Projektion;
(h) Ergebnis besteht `pruefeFeatureAkteInhalt`, 422-Fall mit Verstößen; (i) Gegenproben je Fall.

## 6. Doku/Findings
F-1174…F-1176 eintragen, F-912/F-995 Status-Notiz, fixpaket-f45.md Zeilen B5a/B5b ersetzt, Entscheidungen
E-B5-1/E-B5-2 in features/F45/feature.md, Abschnitt „Stand B5a-1“, STATUS.md, Lagebild.

## 7. Akzeptanzkriterien
AK1 PUT ersetzt nur die drei Abschnitte, Rest bytegleich, Zeilenenden erhalten (LF und CRLF).
AK2 Hash abweichend → 409 mit aktuellem Hash; Sperre → 409 mit workflowId; grund leer → 400.
AK3 Ergebnis besteht check-feature; sonst 422 mit Verstößen, nichts geschrieben.
AK4 POST legt ENTWURF-Akte mit nächster freier ID an, überschreibt nie (409).
AK5 GET liefert hash und entscheidungen[] zusätzlich.
AK6 check-akte-meilenstein: ENTWURF ohne Meilenstein zulässig, andere Status Pflicht (Tests beide Fälle).
AK7 Server-Zeilen ≤ 13.266; `npm run check:gates` Exit 0.

## 7a. Offene Punkte, nicht stillschweigend entschieden
- O1 AK-Form im PUT: `{ id, text }[]` (Rundlauf mit GET, IDs bleiben) statt `string[]` mit Neunummerierung.
- O2 Fehlender Abschnitt: Einfügen vor `## Änderungen`/am Ende statt 422.
- O3 „Nichts geändert“ → 422 statt 200 ohne Schreiben.
- O4 Sperre: nur Workflows mit Auftrag `feature_ref = id`; die globale Laufsperre (`laufGesperrtGrund`) bleibt
  unbeachtet, weil die Akte im Projektordner liegt und Läufe im eigenen Worktree arbeiten (E-F45-3).
- O5 `check-feature`-Regeln nach `src/workboard/feature-akte-pruefung.ts` verschoben statt den Gate-Skript-Import
  aus dem Server (Abhängigkeitsrichtung scripts → src).
- O6 `hash` und `entscheidungen` auch im Körper `unvollstaendig` (Reparatur einer unvollständigen Akte im UI).

## 8. Risiken
- R1 Überschrift in einem Code-Fence vor dem echten Abschnitt — gleiche Grenze wie der Leser; Rundlauf-Probe
  fängt Abweichungen nicht (sie liest gleich falsch). Hingenommen, dokumentiert.
- R2 Doppelte Abschnitte (zweites `## Akzeptanzkriterien`): nur der erste wird ersetzt, wie gelesen.
- R3 Rennen PUT ↔ Workflow-Start: Sperre wird vor dem Lesen geprüft; ein danach gestarteter Ablauf arbeitet
  im eigenen Worktree (E-F45-3) und sieht den Stand des Basis-Commits — kein Datenverlust.
- R4 Import `public/leitstand/code-daten.js` aus scripts/leitstand — Bestand (jarvis-orte.mjs).
- R5 Mehrzeiliger AK-Text aus Bestandsakten (`**AK1** …` ohne ID-Präfix) wird beim Speichern in die
  Form `- AK1: **AK1** …` umgeschrieben — sichtbar im Diff, Stefan sieht ihn vor dem Commit.
