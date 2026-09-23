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

**Weg (korrigiert nach realer Beobachtung):** derselbe Auftrag
`8780892f-b6d6-4eb3-bf96-2ca0cab5dd0f` wird über
`POST /api/auftraege/8780892f-b6d6-4eb3-bf96-2ca0cab5dd0f/routen` ERNEUT
geroutet. `workflow_id` ist deterministisch `router-<auftragId>`
(`scripts/leitstand-server.mjs:2862`) — re-routen erzeugt KEINEN neuen
Workflow, sondern hängt eine neue Version an denselben Workflow an
(`versionSequenz` 1→5 real beobachtet), `schritt-1-architekt` wird dabei auf
`OFFEN`/`lauf_id: null` zurückgesetzt. Nichts geht verloren — alle
bisherigen Versionen bleiben als eigene Checkpoint-Dateien unter
`kontrollzustand/lineage-workflow-router-8780892f-…/checkpoints/` erhalten
(append-only), nur `GET /api/workflows/<id>` zeigt standardmäßig die
neueste. Real ausgeführt am 23.09.2026, nach Merge von PR #230 in main.

## Versuch 2 — 23.09.2026, nach dem F-638-Fix (PR #230, main `fc4a0ed`)

- Leitstand neu gestartet gegen `main`@`fc4a0ed` (PID 19132, `startvorlagen/ai-workforce.json`), CI auf PR #230 und auf `main` grün.
- Re-Routen: `router-8780892f-b6d6-4eb3-bf96-2ca0cab5dd0f-1790172443587`, `202`, `ERFOLGREICH`. Workflow `router-8780892f-b6d6-4eb3-bf96-2ca0cab5dd0f` (`versionSequenz: 5`) — Stufe `hoch` (`[Untergrenze hoch wegen herkunft projekt_interview]`), vier Schritte, `verstoesse: []`, `schritt-1-architekt` zurückgesetzt auf `OFFEN`.
- **Schritt 5 (Architekt), Lauf `5869ddcd-966f-41e3-9042-f2d90c2c05db`: ERFOLGREICH.**
  - Start: 2026-09-23T14:11:09.377Z / Ende: 2026-09-23T14:12:13.301Z — Dauer 63,9 s (`verbrauch.dauer_ms: 63886`).
  - Kosten (Verbrauch-Ansicht, Rolle `architekt`/Modell `gpt-6-astra`): 20.246 Input-Tokens, 1.943 Output-Tokens, 0 Cache.
  - Schema valide: **ja** — `validiereErgebnisArchitektur` liefert `[]` (0 Verstöße), inkl. des neuen `json_schema`-String-Checks.
  - Anzahl `entscheidungen_mensch`: 0. `adr_entwuerfe`: 1. `schema_entwuerfe`: 0. `module`: 0. `capabilities_bedarf`: 3 (alle `status: vorhanden`). `evidenz`: 10 Einträge, jeder mit Marker.
  - `zusammenfassung`: Bestehenden Stack/Modulschnitt beibehalten, Existenzprüfung in `verknuepfeSparringAuftrag` verankern, keine neue Infrastruktur/Migration.
  - Volles Ergebnis-JSON: siehe `kontrollzustand-roh\5869ddcd-966f-41e3-9042-f2d90c2c05db\rohstrom.json` (`item.completed`/`agent_message`).
  - `entscheidungen_mensch` leer → Schritt 6 (Architektur-Entscheidung) entfällt, Workflow steht jetzt direkt auf `WARTET_FREIGABE` für `schritt-2-architektur` (Advisor) — **nicht freigegeben**, wie beauftragt.
- **F-638 damit im echten Reallauf bestätigt behoben**, nicht nur im Rauchtest.

### Fortsetzung Versuch 2 (Stefan hat Advisor/Ausführung selbst freigegeben)

Workflow `router-8780892f-b6d6-4eb3-bf96-2ca0cab5dd0f`, `versionSequenz: 16`,
Status `KLAERUNG_ERFORDERLICH` (`schritt-4-review` `FEHLGESCHLAGEN`).

- **Schritt 7 (`architecture-advisor`), Lauf `4b3ebc42-91df-422b-9dd4-b2fc02dc4151`: ERFOLGREICH.**
  Dauer 68,4 s (`dauer_ms`, API-Anteil 63,1 s). Kosten: **$0.5311376** (`total_cost_usd`, real aus dem claude-code-Rohstrom), 26 Input-/4.097 Output-Tokens, 797.238 Cache-Read/82.667 Cache-Write.
  **Kein echtes Prüf-Urteil geliefert** — die Antwort erklärt, nur lesende Werkzeuge (Glob/Grep/Read) zu haben, plant selbst die drei Dokumentations-Schreibschritte und bittet um Write/Edit/Bash-Zugriff, statt den Architekturentwurf zu bewerten (BEREIT/BEREIT_NACH_KORREKTUR/BLOCKIERT). `output_schema: null` bei dieser Rolle lässt jede Prosa-Antwort als `ERFOLGREICH` durch (Regel 1b prüft nur `ergebnis-code-reviewer`) — der Workflow lief trotz inhaltlich nutzlosem Advisor-Ergebnis automatisch weiter.
- **Schritt 8 (`ausfuehrung`), Lauf `ad0025e4-5796-41a8-b2cd-6d527f40e2b4`: ERFOLGREICH.**
  Dauer 105,7 s (API-Anteil 100,6 s). Kosten: **$0.7444364**, 26 Input-/10.975 Output-Tokens, 1.101.892 Cache-Read/103.564 Cache-Write.
  Arbeitsverzeichnis: `C:\Users\stefa\Projekte\ai-workforce` — direkt der Haupt-Checkout, kein Worktree, kein eigener Branch. Branch zum Zeitpunkt des Laufs: `main` (HEAD `fc4a0ed`, PR #230). Kein Git-Werkzeug im `schreibend`-Werkzeugsatz (`Read/Grep/Glob/Write/Edit`, `startvorlagen/ai-workforce.json`) — strukturell keine Commits/Pushes möglich, `git log` bestätigt `main` unverändert bei `fc4a0ed`.
  Real geschrieben (`git status`, ungestaged): `docs/projekt/kontext/beschreibung.md` (geändert), `docs/projekt/roadmap.json` (geändert), `docs/adr/bestehenden-stack-beibehalten-und-referenzpruefung-in-der-verknuepfungsfunktion-verankern.md` (neu), `features/F42/feature.md` (neu). **Kein einziger Treffer unter `src/`** — ausschließlich Dokumentation, keine Existenzprüfung/keine Tests in `verknuepfeSparringAuftrag` real implementiert.
  Ursache der Einengung: NICHT der Architekt, NICHT `baueUmsetzungsInstruktion` — sondern der ORIGINALE Auftragstext selbst. `baueAuftragAusProjektentwurf` (`src/product-coach/index.ts:700`) schreibt jedem aus einem Projekt-Interview erzeugten Auftrag hart den Abschnitt "Auftrag an den Baudurchgang: Schreibe AUSSCHLIESSLICH Dokumentation, KEIN Produktcode" vor — das stand schon im Auftragstext, bevor der Architekt je lief (Auftrag `8780892f…`, angelegt in Schritt 2 der Ablaufanleitung). Der Architekt zitiert diese Vorgabe in seiner `zusammenfassung` nur ("Produktimplementierung und deren Tests folgen separat"), er hat sie nicht erfunden.
- **Schritt 9 (`code-reviewer`), Lauf `bd7e2ba4-4f71-4545-85f5-606711e6f17a`: FEHLGESCHLAGEN — Prozess nie gestartet.**
  Dauer/Kosten: 0 (kein Modell-Aufruf zustande gekommen). `exitCode: null`, `stdout`/`stderr` leer.
  **Ursache (real aus `kontrollzustand-roh\bd7e2ba4-…\rohstrom.json`, Feld `startfehler`):**
  ```json
  "startfehler": { "code": "ENAMETOOLONG", "message": "spawn ENAMETOOLONG" }
  ```
  Der Codex-Prozess ließ sich gar nicht starten — die Kommandozeile (Auftragstext + `aenderungsuebersicht-@schritt-3-ausfuehrung`, die vermutlich die vollen Inhalte der vier neuen/geänderten Dokumentationsdateien aus Schritt 8 als Diff enthält) überschritt eine Windows-Kommandozeilenlängengrenze beim `spawn`-Aufruf — kein Schema-/API-Fehler, kein Timeout, sondern ein Betriebssystem-Limit beim Prozessstart selbst.

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
