# F39 WS-3b — Messvorlage für den realen Reallauf

**Dies ist eine leere Vorlage** für den vollständigen Durchlauf (Schritte
1-9). Versuch 1 unten ist bereits real gelaufen und dokumentiert einen
Abbruch bei Schritt 5 (Architekt) durch F-638 — Versuch 2 (nach dem F-638-
Fix) füllt die Felder darunter.

## Versuch 1 — 23.09.2026, gescheitert bei Schritt 5 (Architekt, F-638)

- Auftrag: `8780892f-b6d6-4eb3-bf96-2ca0cab5dd0f` ("Erweiterung: Sparring-Auftragsverweise absichern"), Workflow `router-8780892f-b6d6-4eb3-bf96-2ca0cab5dd0f`.
- Schritte 1-4 (Sparring-Interview, Auftrag anlegen, Router, Workflow öffnen): real durchlaufen, Stufe `hoch` korrekt bestimmt (`[Untergrenze hoch wegen herkunft projekt_interview]`), vier Schritte in korrekter Reihenfolge (architekt → architecture-advisor → ausfuehrung → code-reviewer).
- Schritt 5 (Architekt, Lauf `635dbad1-9ed8-4489-8386-12590d180cb0`): **gescheitert**.
  - Dauer: ~6,3 s (13:27:29,131Z → 13:27:35,416Z).
  - Kosten: 0 (0 Input-/Output-Tokens laut Verbrauch-Ansicht — API lehnte die Anfrage vor jeder Generierung ab).
  - Ursache: F-638 — `schemas/ergebnis-architektur.schema.json` von OpenAIs Strict-Modus abgelehnt (HTTP 400 `invalid_json_schema`, `schema_entwuerfe[].json_schema` ohne `additionalProperties:false`).
  - Kein Architekt-Ergebnis vorhanden (Ablehnung vor jeder Modellantwort).
  - Workflow korrekt auf `KLAERUNG_ERFORDERLICH` gehalten, `schritt-2-architektur` nicht gestartet (`lauf_id: null`), Advisor nicht freigegeben.
- Fix: `fix/f638-architekt-schema-strict` (`json_schema` → String/JSON-Text), plus neuer zentraler Gate-Check F-639. Rauchtest (echter minimaler Codex-Aufruf mit korrigiertem Schema): siehe Abschnitt unten.
- Wiederholung: siehe "Weg für die Wiederholung" unten.

## Weg für die Wiederholung (nur geklärt, nicht ausgeführt)

Workflow `router-8780892f-b6d6-4eb3-bf96-2ca0cab5dd0f` bleibt real geprüft
auf `status: FEHLGESCHLAGEN` stehen (`schritt-1-architekt`, `lauf_id
635dbad1-…`) — `ermittleNaechstenSchritt` (`src/workflow/index.ts`) startet
einen bereits gelaufenen Schritt nie automatisch neu ("ein bereits
gelaufener Schritt wird nie automatisch neu gestartet"); kein Reset-/Retry-
Endpunkt für einen einzelnen Schritt existiert (`scripts/leitstand-server.mjs`
geprüft). Dieser Workflow ist damit terminal und bleibt unverändert als
Beleg für F-638 stehen — kein Aufräumen nötig oder gewünscht.

**Weg:** derselbe Auftrag `8780892f-b6d6-4eb3-bf96-2ca0cab5dd0f` wird über
`POST /api/auftraege/8780892f-b6d6-4eb3-bf96-2ca0cab5dd0f/routen` ERNEUT
geroutet — das Repo kennt dieses Muster bereits real (mehrere historische
Workflows teilen denselben `auftragId`, z. B. `f16-ws3b-ak12`/`f17-ws3-ak8`
für `89c10996-…`). Das erzeugt einen NEUEN Workflow (neue `workflow_id`) mit
frischem `schritt-1-architekt` (`status: OFFEN`), diesmal gegen das
korrigierte Schema. Ablauf ab dort identisch zur Ablaufanleitung (Schritt 4
„Workflow öffnen" ff.) — noch mit Stefan zu klären: ob dieser Neu-Routen-
Schritt jetzt ausgeführt wird oder erst nach Merge von `fix/f638-…` in
main (damit der Reallauf gegen den freigegebenen Stand läuft, nicht gegen
einen offenen Branch).

## Rauchtest F-638-Fix (echter minimaler Codex-Aufruf)

23.09.2026, direkter Codex-Aufruf (kein Leitstand-Umweg) gegen das korrigierte
Schema — derselbe `--output-schema`-Mechanismus wie ein realer `architekt`-Schritt:

```
codex exec --json --sandbox read-only --model gpt-6-astra \
  --output-schema schemas/ergebnis-architektur.schema.json \
  "Antworte mit einem minimalen, schemakonformen JSON-Objekt: modus=feature, ..."
```

Ergebnis: kein `400 invalid_json_schema` — `turn.completed` erreicht,
`usage.input_tokens: 16614`, `output_tokens: 80`. Modellantwort (`item.completed`,
`agent_message`):

```json
{"modus":"feature","zusammenfassung":"Dies ist eine minimale Schemaantwort.","module":[],"adr_entwuerfe":[],"schema_entwuerfe":[],"entscheidungen_mensch":[],"capabilities_bedarf":[],"evidenz":[{"marker":"[Fakt]","aussage":"Der Modus ist feature."}]}
```

Schemakonform (passt `validiereErgebnisArchitektur` ohne Verstoß). Belegt:
das korrigierte Schema wird von der Modell-API im Strict-Modus akzeptiert.
`schema_entwuerfe` blieb in diesem Dummy-Prompt leer — der eigentliche
String-Pfad für `json_schema` wird erst im echten Reallauf (Versuch 2) mit
einem Datenmodell-Vorschlag durchlaufen, nicht durch diesen Rauchtest.

## Sicherheitshinweis — vor dem Lauf

Der bestehende Nachweis-Auftrag darf niemals geroutet/gestartet werden:

- **Volle ID:** `1b3412a8-88be-45e0-b97d-46e6cc5ba396`
- **Titel:** `Projekt-Erweiterung: AI Workforce führt ein Vorhaben von der Idee bis zum abgenommenen Ergebnis du...` (Kosmetik-Befund F-611: nennt die Gesamt-Vision statt des Meilensteins)
- Grund: trägt die mit „Neues Projekt anlegen" (E-M5-14, Feature `F41`) kollidierende Feature-ID (F-618).
- Keine technische/UI-Markierung verhindert das versehentliche Routen (F-627, offen, P3) — im Leitstand unter `#/projekt` normal auswählbar. Manuell prüfen, nicht anfassen.

## Coach-Eingabetext (Projektmodus, für den Testauftrag F-631)

```
Erweiterung: POST /api/sparring/<laufId>/auftrag (verknuepfeSparringAuftrag) soll vor dem Speichern des Rückverweises prüfen, dass laufId ein existierender Sparring-Lauf und auftragId ein existierender Auftrag ist. Unbekannte IDs werden mit einem klaren Fehler abgelehnt, statt den Verweis zu speichern. Heute wird nur die Form von auftragId geprüft (F-631). Mit Tests für beide Fehlerfälle.
```

## Schritt 1 — Sparring-Interview

- Anzahl Turns bis `projekt_entwurf`:
- Je Turn: `art` / `dauer_ms` / `turns` (intern) / `output_tokens`:
- Vergebene Meilenstein-/Feature-IDs:
- Capability-Bedarf-Tabelle (Bedarf / Ressource-ID / Status):

## Schritt 2 — „Als Auftrag anlegen"

- `auftragId`:
- Titel (inkl. etwaigem F-611/F-612-artigem Kosmetikbefund):
- Rückverweis-Hinweis erschienen (`renderAuftragBruecke`)? ja/nein:
- Browser-Konsole: Fehler beim `POST /api/sparring/<laufId>/auftrag`-Aufruf? ja/nein — falls ja: F-631-Priorität neu bewerten.

## Schritt 3 — Auftrag routen

- Router-Antwort (`202`/Worker):
- `GET /api/workflows/<workflowId>` → `ziel` trägt Vermerk `[Untergrenze hoch wegen herkunft projekt_interview]`? ja/nein (nein nur korrekt, wenn Router ohnehin `hoch` vorschlug):
- `schritte[].rolle` beginnt mit `architekt`? ja/nein:
- Router-Laufdauer / -Kosten:

## Schritt 4 — Workflow öffnen

- Vier Schritte sichtbar, Status `WARTET_FREIGABE`, aktiver Schritt `schritt-1-architekt`? ja/nein:

## Schritt 5 — `architekt` (Lauf-ID, Dauer, Kosten)

- Lauf-ID:
- Start- / Endzeit:
- Dauer (`verbrauch.dauer_ms`):
- Kosten (Verbrauch-Ansicht, Rolle `architekt` / Modell `gpt-6-astra`):
- Ergebnis: `ERFOLGREICH` mit `ergebnis-architektur`-JSON, oder `FEHLGESCHLAGEN` (`ergebnis_nicht_schemakonform`)?
- Schema valide? ja/nein:
- `zusammenfassung` inhaltlich zutreffend? ja/nein, Begründung:
- `module[]` — Anzahl, passend zum realen Thema (keine Vorratsarchitektur)?
- `adr_entwuerfe[]` — Anzahl:
- `schema_entwuerfe[]` — Anzahl:
- `evidenz[]` — jeder Eintrag mit plausiblem Marker (`[Fakt]`/`[Schlussfolgerung]`/`[Annahme]`/`[offene Unsicherheit]`)? ja/nein:
- `capabilities_bedarf[]` — jede `ressource_id` real (kein `null`/`fehlt` ohne Grund)? ja/nein:
- `entscheidungen_mensch[]` — Anzahl:
- Fragen tatsächlich entscheidungsreif (echte Optionen mit Vor-/Nachteilen)? ja/nein:

## Schritt 6 — Architektur-Entscheidung (nur falls `entscheidungen_mensch[]` nicht leer)

- Entscheidung angehalten (`KLAERUNG_ERFORDERLICH`)? ja/nein:
- Anzahl Fragen, je Frage gewählte Option:
- Übereinstimmung mit Architekten-Empfehlung? ja/nein, falls nein: Begründung (Entscheidungsregel 5):
- `POST /api/workflows/<id>/entscheidung` → `202`, Status `WARTET_FREIGABE`? ja/nein:

## Schritt 7 — `architecture-advisor`

- Lauf-ID:
- Start- / Endzeit:
- Dauer:
- Kosten (Rolle `architecture-advisor` / Modell `claude-sonnet-5`):
- Kernaussagen des Advisor-Urteils — bestätigt oder weicht ab (wo)?

## Schritt 8 — `ausfuehrung`

- Lauf-ID:
- Start- / Endzeit:
- Dauer:
- Kosten (Rolle `ausfuehrung` / Modell `claude-sonnet-5`):
- Je `adr_entwuerfe[]`-Eintrag: `docs/adr/<slug>.md` real angelegt (nach `docs/adr/TEMPLATE.md`, fortlaufende Nummer)? Abschnitt „Entscheidung (Mensch)" bei erfasster Entscheidung? Datei/Zeile:
- Je `schema_entwuerfe[]`-Eintrag: `schemas/<name>.schema.json` und `schemas/examples/<name>.json` real angelegt, Prüfung real ins Gate eingehängt? Datei/Zeile:
- `module[]`/Datenmodell: nur tatsächlich gelieferte optionale Abschnitte in `features/<id>/feature.md` ergänzt, nicht leer? Datei/Zeile:
- Widerspricht die Umsetzung dem Architektur-Entwurf irgendwo — und ist das vermerkt? ja/nein:

## Schritt 9 — `code-reviewer` (automatisch)

- Lauf-ID:
- Start- / Endzeit:
- Dauer:
- Kosten (Rolle `code-reviewer` / Modell `gpt-6-astra`):
- `urteil`:
- `befunde`:
- `empfehlung`:

## Abschluss

- Workflow-Endstatus (`ABGESCHLOSSEN` / `KLAERUNG_ERFORDERLICH`):
- Tabelle aller vier Lauf-IDs (Rolle / Worker / Modell / Dauer / Kosten):
- Gesamtkosten laut Verbrauch-Ansicht:
- `npm run check` nach Schritt 8 grün? ja/nein:
- Gesamteinschätzung Architekt-Qualität — trägt der Entwurf zu einem besseren Baudurchgang bei, oder ist er nur Ballast? Grundlage für die WS-3b-Abnahmeentscheidung (bleibt der Worker-Tausch codex→claude-code für `architecture-advisor`/`ausfuehrung`)?

## Versuch 3 — 23.09.2026, Feature-Modus, echte Code-Kette (Router wählt eigenständig `standard`, nicht `hoch`)

**Abweichung vom Ablauf oben:** dieser Versuch prüft NICHT die deterministische
`hoch`-Untergrenze (die ist Projekt-Modus-exklusiv, `herkunft.art:
'projekt_interview'`, s. Versuch 1/2) — er prüft, ob ein Feature-Modus-Auftrag
(`herkunft: { art: 'sparring' }`, kein Untergrenze-Träger) über das EIGENE
Urteil der Router-Rolle nach `hoch` gelangen kann (8-Auslöser-Liste in
`baueRouterAuftragstext`, `src/router/index.ts`). Vorab geklärt (nur lesend,
kein Router-Umgehen): es gibt keinen Weg, `kontrolltiefe` bei der
Auftragsanlage direkt zu setzen — weder Schema noch UI kennen ein solches
Feld.

- Auftrag: `a0d04470-d4eb-4204-aec4-ad3ee21e2b91` ("Sparring-Auftrag-Verknuepfung: Existenz von laufId/auftragId pruefen"), angelegt direkt über `POST /api/auftraege` mit `herkunft: { art: 'sparring' }` (deckungsgleich mit dem, was die Feature-Modus-Chat-Brücke sendet, `public/leitstand/views/chat.js:632`) — derselbe Auftragstext wie im Coach-Eingabetext oben (F-631).
- Router-Lauf: `router-a0d04470-d4eb-4204-aec4-ad3ee21e2b91-1790181886881`, Dauer 13.606 s, `input_tokens 20511`/`output_tokens 205`, Worker `codex`/`gpt-6-astra`.
- **Router-Ergebnis: `standard` (2 Schritte: `ausfuehrung` → `code-reviewer`), NICHT `hoch`.** Kein `[Untergrenze …]`-Vermerk im `ziel` — der Router hat das aus eigenem Urteil so entschieden. Deckt sich mit der Vorab-Analyse: der Auftragstext (Existenzprüfung vor einem Rückverweis-Speichern) trifft keinen der 8 `ROUTER_HOCH_AUSLOESER` eindeutig (keine Architekturentscheidung, keine neue zentrale Persistenzsemantik, keine Security-Grenze, kein neues externes System, nicht mehrere Kernmodule, kein neues Datenmodell, kein neues blockierendes Gate, keine Schema-/Migrationsänderung).
- Mit dem Menschen abgestimmt: Ergebnis als echtes Versuch-3-Ergebnis übernommen (keine Umgehung, kein künstlich zugespitzter Auftragstext nur um `hoch` zu erzwingen).
- Workflow: `router-a0d04470-d4eb-4204-aec4-ad3ee21e2b91`, Status nach Freigabe `ABGESCHLOSSEN`, beide Schritte `ERFOLGREICH`.

**Schritt A — `ausfuehrung`**
- Lauf-ID: `725f9a1b-d3c0-42ac-8376-2bf8c205927d`
- Start- / Endzeit: 2026-09-23T16:50:36.590Z → 16:53:44.281Z
- Dauer: 182.163 s (`verbrauch.dauer_ms`)
- Verbrauch (Rolle `ausfuehrung` / Modell `claude-sonnet-5`, Worker `claude-code`): `input_tokens 76`, `output_tokens 18166`, `cache_read_tokens 2102720`, `cache_write_tokens 86897`
- Ergebnis: `ERFOLGREICH`, `permissionDenials.anzahl: 0`
- Echter Code entstanden (kein Dokumentations-Ersatz, F-644-Muster geprüft — Feature-Modus umgeht das): `git diff --stat` zeigt `scripts/check-f34-product-coach.mjs` (+32/-3, neue Rot-/Grünfall-Tests), `scripts/leitstand-server.mjs` (+18/-1, zwei neue 404-Prüfungen VOR `registriereSparringAuftragZuordnung`), `scripts/leitstand/routen-sparring.mjs` (+19/-0, neue `sparringLaufExistiert`-Funktion), `state/findings.md` (+3/-3, F-631 auf erledigt).
- Umsetzung entspricht dem Auftrag 1:1: `sparringLaufExistiert` prüft `laufId` gegen die reale `sparring-<projektId>`-Kette, `auftragId` wird gegen `ladeArtefaktVersion('auftrag-<id>')` geprüft — beide unbekannten IDs werden mit `404` abgelehnt, bevor `registriereSparringAuftragZuordnung` einen Rückverweis speichert. Tests decken beide Rotfälle (`lauf-nicht-vorhanden`, `auftrag-nicht-vorhanden`) und einen Grünfall mit real über `POST /api/auftraege` angelegter `auftragId`.

**Schritt B — `code-reviewer` (automatisch)**
- Lauf-ID: `6319443a-8309-4bd1-aff4-91ec60756224`
- Start- / Endzeit: 2026-09-23T16:53:45.857Z → 16:55:03.156Z
- Dauer: 77.251 s
- Verbrauch (Rolle `code-reviewer` / Modell `gpt-6-astra`, Worker `codex`): `input_tokens 426745`, `output_tokens 1435`, `cache_read_tokens 366208`
- `urteil`: **`BEREIT_NACH_KORREKTUR`**
- `befunde`: 1 Eintrag, Schwere `MITTEL`, Fundstelle `scripts/leitstand-server.mjs:5885` — der Reviewer hat den neuen Existenzcheck real gegen den laufenden Handler getestet (eigener PowerShell-Request) und dabei reproduziert: eine `auftragId` mit unzulässigen Zeichen (z. B. `unbekannt/auftrag`) lässt `ladeArtefaktVersion` über `pruefeLaufId` werfen → `HTTP 500` statt eines klaren Eingabefehlers, weil `auftragId` vorher nur auf nicht-leeren String geprüft wird, nicht auf zulässige Zeichen. Die beiden regulären unbekannten IDs lieferten korrekt `404`.
- `empfehlung`: `auftragId` vor dem Laden auf unzulässige Zeichen prüfen, mit `HTTP 400` ablehnen, Regressionstest ergänzen. Hinweis des Reviewers: volle Testsuite wegen schreibgeschütztem Arbeitsbereich nicht selbst ausgeführt.
- Eigene Verifikation (nicht Teil des automatischen Laufs): Befund am Diff nachvollzogen — `scripts/leitstand-server.mjs:5878` ruft `ladeArtefaktVersion(\`auftrag-${body.auftragId}\`, …)` ungeprüft auf `body.auftragId` auf; ein `/` darin bricht `pruefeLaufId` (`src/checkpoint-store/index.ts:82`). Befund ist real, kein Fehlalarm — bislang nicht als eigenes Finding in `state/findings.md` erfasst (Entscheidung darüber bei Stefan, außerhalb dieses Auftrags).

**Abschluss**
- Workflow-Endstatus: `ABGESCHLOSSEN` (beide Schritte `ERFOLGREICH`; das Review-`urteil BEREIT_NACH_KORREKTUR` hält den Automaten NICHT an — nur `BLOCKIERT` oder ein fehlendes/unbekanntes Urteil würde auf `KLAERUNG_ERFORDERLICH` halten, `workflow-entscheidungsregeln`).
- Tabelle:

  | Schritt | Rolle | Worker | Modell | Dauer | Verbrauch (in/out/cache-read Tokens) |
  |---|---|---|---|---|---|
  | Router | router | codex | gpt-6-astra | 13,6 s | 20511 / 205 / 0 |
  | 1 | ausfuehrung | claude-code | claude-sonnet-5 | 182,2 s | 76 / 18166 / 2102720 |
  | 2 | code-reviewer | codex | gpt-6-astra | 77,3 s | 426745 / 1435 / 366208 |

- `npm run check` auf dem Branch (`test/f39-versuch3`) nach Schritt B: **728/729 grün**, 1 Fehlschlag (`src/claude-code-gateway/claude-code-gateway.test.ts:941`, Prozessbaum-Timeout-Test) — Wiederholung in Isolation lief grün durch; unrelated zum Diff (kein Bezug zu `leitstand-server.mjs`/`routen-sparring.mjs`/`check-f34-product-coach.mjs`), passt zum bekannten Flaky-Muster in `CLAUDE.md` ("Test-/Gate-Lauf scheitert einmalig ohne erkennbaren Grund"). Kein Regressionsbeleg gegen diese Änderung gefunden.
- Gesamteinschätzung: Feature-Modus + Router-Eigenurteil funktioniert wie im Code beschrieben — kein Zwang zu `hoch` nötig oder vorhanden für einen Auftrag, der keinen der 8 Auslöser trifft. Die `ausfuehrung`-Rolle hat echten, funktionsfähigen Code samt Tests geliefert (kein F-644-Dokumentations-Ersatz, weil Feature- statt Projekt-Modus). Der automatische Review-Schritt hat einen echten, eigenständig reproduzierten Randfall-Befund geliefert (Sonderzeichen in `auftragId` → 500 statt 400) — funktioniert als Qualitätsnetz wie vorgesehen.
