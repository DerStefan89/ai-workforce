# F26 WS-2b — realer Nachweis: `aktion.typ 'anpassen'`

Diese Datei wurde von einem echten, vom Menschen freigegebenen Workflow-Lauf
erzeugt, um den Chat-zu-Workflow-Anschluss (Auftrag anlegen, Routen,
Abnahme/Anpassen) real zu belegen. Ergänzt hier um den realen Nachweis für
`aktion.typ 'anpassen'` (WS-2b-Rest, Schema-/Validator-Fix), Stand
17.09.2026. Bedienung über `curl` gegen den echten Leitstand-Prozess
(`127.0.0.1:4173`, `node scripts/leitstand-server.mjs`, Standard-Startvorlage
`startvorlagen/beispielprojekt.json` — garantierter `claude-code`-Fallback,
kein Codex-Block, Muster `nachweis-ws2a.md`), echte Claude-Code-Kindprozesse.

**Rohstrom-Belege sind nicht committet** (`.gitignore`, E-190, Muster
`nachweis-ws1.md`) — die `kontrollzustand/`-Verzeichnisse sind reale,
committete Evidenz.

---

## A — Vorbedingung: Schema-/Validator-Lücke real bestätigt

`[Fakt]` Vor der Änderung: `schemas/ergebnis-jarvis.schema.json`
`aktion.typ`-Enum trug nur `["routen", "oeffnen"]`. Die drei bereits
vorbereiteten Beispieldateien
(`ergebnis-jarvis.valid-aktion-anpassen.json`,
`ergebnis-jarvis.invalid-aktion-anpassen-mit-workitem.json`,
`ergebnis-jarvis.invalid-aktion-anpassen-ohne-bezug.json`) standen in
`scripts/check-f26-jarvis.mjs` (b) nicht in der festen Liste — ungeprüft,
tot. `valid-aktion-anpassen.json` wäre gegen das alte Schema durchgefallen.

`[Maßnahme]` `anpassen` zum Enum ergänzt (Schema + `AKTION_TYP` in
`src/jarvis/index.ts` + `JarvisAktionTyp` in `src/jarvis/types.ts`);
neue Kopplungsregel ergänzt (Schema-`allOf` + `validiereErgebnisJarvis`):
`aktion.typ === 'anpassen'` verlangt `bezug.auftrag_id` (kein bloßer
`bezug.workitem`, kein fehlender `bezug`) — sonst wüsste ein WS-2b-Client
nicht, welcher Workflow gemeint ist. Alle drei Beispieldateien in die feste
Liste in `check-f26-jarvis.mjs` (b) aufgenommen; drei neue Rot-/Grünfälle in
`src/jarvis/jarvis.test.ts` ergänzt (Kalibrierung: grün mit
`bezug.auftrag_id`, rot mit `bezug.workitem`, rot ohne `bezug`).
`baueJarvisAuftragstext`-Prompt um `anpassen` und die neue
`bezug.auftrag_id`-Pflicht ergänzt.

---

## B — Rotfall (real, unbeabsichtigt reproduziert): Codex + `allOf` (F-423)

`[Fakt]` Der erste reale Versuch traf eine bereits laufende
Leitstand-Instanz (PID 31308, gestartet mit
`LEITSTAND_STARTVORLAGE_PFAD=startvorlagen/ai-workforce.json`, konfigurierter
Codex-Worker) aus einer früheren Sitzung. `POST /api/chat` löste real
`worker: codex` aus, der Lauf endete `ABGESCHLOSSEN`/`FEHLGESCHLAGEN` — der
bereits dokumentierte Befund F-423 (`allOf` im Schema, von Codex'
`response_format` nicht akzeptiert) erneut real bestätigt, diesmal auch mit
dem zusätzlichen `allOf`-Eintrag für `anpassen`.
`[Maßnahme]` Alte Instanz beendet (`taskkill`), Lock-Datei entfernt, Server
neu gestartet mit der Standard-Startvorlage (kein Codex-Block) — Muster
`nachweis-ws2a.md` Abschnitt B/C.

---

## C — Grünfall 1 (real): Zielformulierung führt zu `auftrag_vorschlag`, nicht `aktion`

`[Fakt]` `POST /api/chat` mit `{"nachricht":"Ich moechte fuer den Workflow
f15-ws4-l3 eine Anpassung anfordern: Schritt 1 (schritt-1-analyse) ist
fehlgeschlagen, ich will ihn mit einem anderen Ansatz neu versuchen
lassen."}` → Lauf real `ABGESCHLOSSEN`/`ERFOLGREICH`
(`jarvis-jarvis-chat-c1f059cc-…`, `worker: claude-code`). Jarvis lieferte
korrekt schemakonformes, aber `art: "auftrag_vorschlag"` (nicht `aktion`):
ein fehlgeschlagener Ausführungsschritt ist inhaltlich ein neuer Bauauftrag,
kein nachträglicher Anpassungswunsch an ein bereits fertiges Ergebnis —
Jarvis' Einordnung war hier in der Sache zutreffend, nur für DIESEN Nachweis
der falsche Testfall.

`[Schlussfolgerung]` `aktion.typ 'anpassen'` bildet semantisch den
F23-ADJUST-Pfad ab ("Anpassungswunsch zu einem fertigen Ergebnis"), nicht
"fehlgeschlagenen Schritt neu versuchen" — dafür wurde Testfall D mit einem
tatsächlich `ABGESCHLOSSEN`en Workflow neu formuliert.

---

## D — Grünfall 2 (real): `aktion.typ 'anpassen'` real erzeugt, schemakonform

`[Fakt]` `POST /api/chat` mit `{"nachricht":"Ich habe das fertige Ergebnis
von Workflow f15-ws4-l1 (features/F15/nachweis-ak10-analyse.md) geprueft. Es
ist inhaltlich nicht ausreichend, der Abschnitt zu F-243 ist zu knapp.
Fordere fuer diesen Workflow eine Anpassung an, damit er ueberarbeitet
wird."}` → Lauf real `ABGESCHLOSSEN`/`ERFOLGREICH`
(`jarvis-jarvis-chat-b4bcc443-5441-43ca-9ade-b812de8e9ebb`, `worker:
claude-code`, `exitCode 0`). Ergebnis (aus `GET /api/chat`):

```json
{
  "art": "aktion",
  "antwort": "Ich fordere für Workflow f15-ws4-l1 eine Anpassung an: Der Abschnitt zu F-243 in features/F15/nachweis-ak10-analyse.md ist inhaltlich nicht ausreichend und muss überarbeitet werden.",
  "aktion": { "typ": "anpassen", "ziel": "f15-ws4-l1" },
  "bezug": { "auftrag_id": "jarvis-chat-b4bcc443-5441-43ca-9ade-b812de8e9ebb" }
}
```

`[Fakt]` Gültig gegen `validiereErgebnisJarvis` (real geschrieben als
`lineage-chat-ai-workforce`-Eintrag, `versionSequenz: 6`) — die neue
Kopplungsregel (`bezug.auftrag_id` bei `anpassen` Pflicht) griff korrekt,
weil `bezug.auftrag_id` gesetzt war.

`[Befund, siehe F-427]` `bezug.auftrag_id` zeigt real auf die Chat-eigene
Auftrags-ID, NICHT auf `5efe706f-2e88-43c7-a877-c85ef59c9e42` (den
tatsächlichen Auftrag hinter Workflow `f15-ws4-l1`) — Jarvis kennt in diesem
Ein-Schuss-Lauf keine echte Referenzliste. `aktion.ziel` ("f15-ws4-l1")
benennt den Workflow dagegen korrekt und ist das Feld, das der reale
Abnahme-Aufruf unten tatsächlich nutzt (Muster `routen`/`oeffnen`: auch dort
ist `aktion` bislang ein Vorschlag, den ein Mensch/Client liest und
ausführt, kein selbstauslösender Aufruf — WS-2b-Automatisierung bleibt
offener Bauauftrag).

---

## E — Realer Anschluss: `POST /api/workflows/f15-ws4-l1/abnahme` mit `ANPASSUNG_ANGEFORDERT`

`[Fakt]` Vorbedingung geprüft: `GET /api/workflows/f15-ws4-l1/abnahme` zeigt
`workflowStatus: "ABGESCHLOSSEN"`, `entscheidung.status: "nicht_vorhanden"`
(kein vorheriger Abnahme-Entscheid, `ANPASSUNG_ANGEFORDERT` also zulässig,
F23 AK21).

`[Fakt]` `POST /api/workflows/f15-ws4-l1/abnahme` mit
`{"ergebnis":"ANPASSUNG_ANGEFORDERT","begruendung":"F26 WS-2b realer
Nachweis: Jarvis-Chat-Lauf … lieferte aktion.typ anpassen mit ziel
f15-ws4-l1 …"}` (`ziel` aus Abschnitt D, von Hand gelesen — der reale
WS-2b-"Anschluss", den dieser Auftrag nachweisen sollte) → real `200`:

```json
{"workflowId":"f15-ws4-l1","ergebnis":"ANPASSUNG_ANGEFORDERT","status":"LAEUFT","artefaktId":"entscheidung-workflow-f15-ws4-l1-abnahme","versionSequenz":1}
```

`[Fakt]` `GET /api/workflows/f15-ws4-l1` danach real: `schritt-1-analyse`
(der von `findeAusfuehrungsSchritt` ermittelte Ausführungsschritt) auf
`status: "OFFEN"`, `lauf_id: null`, `eingaben` trägt zusätzlich
`artefakt:entscheidung-workflow-f15-ws4-l1-abnahme` (AK22); `naechster.art:
"starte"` — AUTOMATISCH freigegeben, also KEIN Freigabe-Halt (anders als bei
einem `ZWINGEND`-Schritt), aber auch KEIN automatischer Re-Start durch den
Abnahme-Aufruf selbst (das würde erst ein separater `POST
/api/workflows/<id>/starten` auslösen — hier bewusst NICHT ausgelöst, um den
Nachweis auf den WS-2b-Anschlusspunkt zu begrenzen).

`[Fakt]` `GET /api/workflows/f15-ws4-l1/abnahme` danach real:
`entscheidung.status: "veraltet"` (der referenzierte `ausfuehrung_lauf_id`
ist durch den Reset bereits überholt — erwartetes Verhalten, kein Fehler),
`entscheidung.ergebnis: "ANPASSUNG_ANGEFORDERT"`.

`[Schlussfolgerung]` Der reale Anschluss von `aktion.typ 'anpassen'` an den
F23-ADJUST-Pfad ist belegt: ein echter, schemakonformer Jarvis-Lauf liefert
eine `aktion`, deren `ziel` ein bestehender, `ABGESCHLOSSEN`er Workflow real
und erfolgreich über `POST /api/workflows/<id>/abnahme` mit
`ANPASSUNG_ANGEFORDERT` angepasst werden kann (AK21-AK24, unverändert seit
F23 WS-2b, hier nur erstmals mit einem echten Jarvis-Ergebnis statt einer
Hand-Eingabe angesteuert).

`[Bekannte Grenze dieses Nachweises]` Workflow `f15-ws4-l1` bleibt bewusst
im realen Zustand `LAEUFT`/`schritt-1-analyse: OFFEN` stehen (kein
`starten`-Aufruf) — ein reales, bereits als "abgeschlossenes F15-Feature"
committetes Artefakt zeigt dadurch bis zu einem künftigen `starten`- oder
Stopp-Aufruf einen offenen Punkt im Leitstand-Workboard. Folgenlos laut
eigenem Schritt-Risikotext ("Ein Fehlgriff ist per git diff sichtbar und
folgenlos rückgängig zu machen"), aber bewusst nicht selbst weiter
aufgelöst, um den Nachweis nicht über den beauftragten Umfang hinaus
auszuweiten — Stefan entscheidet über die Fortsetzung (`starten`) oder das
Zurücksetzen über die Leitstand-UI.

`[Voller automatischer WS-2b-Anschluss, unverändert offen]` Dieser Nachweis
belegt die REALE MACHBARKEIT des Pfads, nicht seine Automatisierung — der
Mensch/Client liest `aktion.ziel` und ruft den Endpunkt von Hand auf, genau
wie bei `routen`/`oeffnen`. Ein Client, der `aktion` automatisch in einen
API-Aufruf übersetzt, ist weiterhin WS-2b-Scope (`features/F26/feature.md`,
"WS-2b — Vorschlag-aus-Chat → F22/F23-Anschluss. Offen, eigener
Bauauftrag").

---

## F — Reale Belege (Repo-Pfade)

- `kontrollzustand/jarvis-jarvis-chat-54349482-…/` (Rotfall Codex/F-423,
  Abschnitt B, gegen die stehengebliebene Alt-Instanz).
- `kontrollzustand/jarvis-jarvis-chat-c1f059cc-…/`,
  `kontrollzustand/lineage-auftrag-jarvis-chat-c1f059cc-…/`,
  `kontrollzustand/lineage-laufakte-jarvis-jarvis-chat-c1f059cc-…/`
  (Grünfall 1, `auftrag_vorschlag`, Abschnitt C).
- `kontrollzustand/jarvis-jarvis-chat-b4bcc443-…/`,
  `kontrollzustand/lineage-auftrag-jarvis-chat-b4bcc443-…/`,
  `kontrollzustand/lineage-laufakte-jarvis-jarvis-chat-b4bcc443-…/`
  (Grünfall 2, `aktion.typ 'anpassen'`, Abschnitt D).
- `kontrollzustand/lineage-chat-ai-workforce/checkpoints/4-…json` bis
  `6-…json` (die drei neuen, automatisch geschriebenen Chat-Verlauf-
  Einträge, `versionSequenz` 4-6).
- `kontrollzustand/lineage-entscheidung-workflow-f15-ws4-l1-abnahme/`
  (die reale `ANPASSUNG_ANGEFORDERT`-Entscheidung, Abschnitt E).
- `kontrollzustand/lineage-workflow-f15-ws4-l1/checkpoints/6-…json` (der
  real zurückgesetzte Workflow-Zustand nach der Abnahme-Entscheidung).
- `state/findings.md` F-427 (neuer, realer Fund: `bezug.auftrag_id`
  referenziert bei `aktion.typ 'anpassen'` real die Chat-eigene Auftrags-ID,
  nicht den Ziel-Auftrag).
