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
