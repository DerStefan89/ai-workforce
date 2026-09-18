# F-423 — Nachweisprotokoll (Codex-kompatibles Jarvis-Schema)

Stand: 18.09.2026. Zwei Teile: (1) Spike direkt gegen `codex.exe` mit
konstruierten Test-Schemas (max. 30 Min, vor dem Schema-Umbau), (2) realer
Nachweis gegen den echten Leitstand-Prozess (`POST /api/chat`) nach dem Fix,
einmal mit Codex-Worker, einmal mit claude-code-Fallback.

---

## Teil 1 — Spike gegen `codex.exe` direkt (vor dem Fix)

Codex-CLI 0.153.4 (`startvorlagen/ai-workforce.json`), `exec --json --sandbox
read-only --output-schema <pfad> "<prompt>"`, Kontostatus: kein
`--model`-Flag durchgereicht (ein zuvor getestetes `--model gpt-5-codex`
scheitert am Konto, unabhängig vom Schema: `"The 'gpt-5-codex' model is not
supported when using Codex with a ChatGPT account."` — mit Default-Modell
verschwindet dieser Fehler, das reale `POST /api/chat` löst das Modell
ohnehin serverseitig auf, siehe Teil 2).

Vier konstruierte Test-Schemas, je einzeln gegen einen echten Codex-Lauf:

| Frage | Test-Schema | Ergebnis |
|---|---|---|
| (a) Optionale Properties (nicht in `required`)? | `art` required, `extra` NICHT required | **Nein.** `invalid_json_schema`: `"'required' is required to be supplied and to be an array including every key in properties. Missing 'extra'."` |
| (c) `additionalProperties:false` + alle Properties required, optional nur als `["object","null"]`? | `art`+`extra` beide required, `extra` Typ `["string","null"]` | **Ja.** `turn.completed`, Modell liefert `{"art":"x","extra":null}`. |
| (b) `oneOf`? | `bezug` mit `oneOf: [{required:[a]},{required:[b]}]` | **Nein.** `invalid_json_schema`: `"In context=('properties','bezug'), 'oneOf' is not permitted."` |
| (b) `anyOf`? | `bezug` mit `anyOf`, äußere Branches ohne eigenes `additionalProperties` | Abgelehnt: `"'additionalProperties' is required to be supplied and to be false"` (Branch-Ebene) |
| (b) `anyOf`, jede Branch vollständig (`type:object`, `additionalProperties:false`, eigenes `required`) | wie oben, Branches jetzt vollständig spezifiziert | **Ja, technisch möglich** — `turn.completed`, `{"bezug":{"a":"hello"}}` — aber deutlich komplexer als Nullable+Validator und ohne Mehrwert, da `validiereErgebnisJarvis` die "genau eines von beiden"-Regel ohnehin schon selbst durchsetzt. **Entscheidung: nicht verwendet** (Entscheidungsregel #3/#4 CLAUDE.md: Wartbarkeit, Komplexität reduzieren). |

Abschließend die volle Zielform (`art`/`antwort`/`auftrag`/`aktion`/`bezug`
alle top-level required, `auftrag`/`aktion`/`bezug` Typ `["object","null"]`,
`bezug.auftrag_id`/`bezug.workitem` Typ `["string","null"]`, kein
`allOf`/`if`/`then`/`oneOf`) gegen zwei realistische Prompts getestet — beide
`turn.completed`, korrekte Nullbelegung:
- `art=antwort`: `{"art":"antwort","antwort":"Alles gut.","auftrag":null,"aktion":null,"bezug":null}`
- `art=aktion` (anpassen): `{"art":"aktion","antwort":"Ok, passe an.","auftrag":null,"aktion":{"typ":"anpassen","ziel":"wf-42"},"bezug":{"auftrag_id":"auf-7","workitem":null}}`

**Ergebnis in drei Zeilen:**
1. Codex verlangt: JEDE Property in `properties` steht auch in `required`; ein optionales Feld gibt es nicht, nur ein Pflichtfeld mit zusätzlich erlaubtem `null`.
2. `oneOf` ist immer verboten; `anyOf` ist technisch möglich, aber nur mit vollständig redundant spezifizierten Branches — für dieses Schema mehr Komplexität ohne Mehrwert.
3. `allOf`/`if`/`then` (F-423-Ursache) bleiben in jedem Fall verboten — die Kopplungen wandern vollständig in `validiereErgebnisJarvis`.

---

## Teil 2 — Realer Nachweis nach dem Fix, gegen den echten Leitstand-Prozess

Bedienung wie `nachweis-ws2a.md`: `curl` gegen `127.0.0.1:<port>`, `node
scripts/leitstand-server.mjs`, echte Claude-Code-/Codex-Kindprozesse.

### A — Codex-Worker (`startvorlagen/ai-workforce.json`, Port 4174)

`[Fakt]` `POST /api/chat` mit `{"nachricht":"Welche offenen P1-Findings
blockieren F26 gerade am meisten?"}` (Nicht-Vorfilter-Nachricht, geht
serverseitig immer an den Worker) → `202
{"laufId":"jarvis-jarvis-chat-38d653cc-e43b-403c-86c0-559c83f5a54e", …}`.

`[Fakt]` Lauf real `ABGESCHLOSSEN`/`ERFOLGREICH` (worker `codex`, modell
deklariert `gpt-6-astra`, `exitCode 0`, `beobachtungsbasisVollstaendig:
true`) — **kein** `invalid_json_schema` mehr.

`[Fakt]` `GET /api/chat` zeigt den neuen Eintrag mit exakt der im Spike
vorhergesagten Codex-Form (alle Felder top-level vorhanden, nicht gesetzte
auf `null`):
```json
{"aktion":null,"antwort":"Am stärksten blockiert laut Findings-Register F-423 (P1, offen): …","art":"antwort","auftrag":null,"bezug":null}
```

`[Schlussfolgerung]` Das Codex-kompatible Schema wird vom echten
`--output-schema`-Endpunkt akzeptiert, der Lauf endet real ERFOLGREICH, der
automatische Lineage-Write (F26 WS-2a) greift unverändert.

### B — claude-code-Fallback (`startvorlagen/beispielprojekt.json`, Port 4175)

`[Fakt]` Server-Log bestätigt den erwarteten Fallback (`[F-391] … Codex ist
nicht verfügbar … Router fällt auf den claude-code-Klassifikationspfad
zurück`). `POST /api/chat` mit `{"nachricht":"Fasse in einem Satz zusammen,
was F26 WS-2b hinzugefuegt hat."}` → `202
{"laufId":"jarvis-jarvis-chat-7044936b-b0d8-47de-8b4a-7a9f5ed292a3", …}`.

`[Fakt]` Lauf real `ABGESCHLOSSEN`/`ERFOLGREICH` (worker `claude-code`,
modell beobachtet `claude-sonnet-5`, `exitCode 0`).

`[Fakt]` `GET /api/chat` zeigt den neuen Eintrag in der ÄLTEREN, schlankeren
Form (Felder ohne Bezug einfach weggelassen, kein explizites `null` —
`baueJarvisAuftragstext`, src/jarvis/index.ts, unverändert):
```json
{"antwort":"F26 WS-2b hat den Vorschlag-aus-Chat-Anschluss an F22/F23 real fertiggestellt: …","art":"antwort"}
```

`[Schlussfolgerung]` `validiereErgebnisJarvis` akzeptiert beide Formen
gleichwertig (fehlendes Feld == Feld auf `null`, F-423-Fix in
`src/jarvis/index.ts`) — der claude-code-Pfad bleibt unverändert
funktionsfähig, ohne dass sein Prompt angepasst werden musste.

---

### C — Codex-Worker, `art: 'aktion'`/`aktion.typ: 'anpassen'` (QA-Nachforderung)

QA-Pass (frischer Kontext) bemängelte, dass Teil 2A/B nur `art: 'antwort'`
abdeckten — genau der Fall, in dem `auftrag`/`aktion`/`bezug` immer `null`
bleiben, also der am wenigsten riskante Pfad. Der Bugfix betrifft aber das
GESAMTE Schema (jede Property ist jetzt Codex-seitig Pflicht); die
Unterobjekt-Validatoren (`validiereAuftragVorschlag`/`validiereAktion`/
`validiereBezug`) und speziell die WS-2b-Kopplung
`aktion.typ 'anpassen'` → `bezug.auftrag_id` waren damit real nur synthetisch
(Teil 1, außerhalb der Server-Pipeline), nicht end-to-end geprüft. Dritter
realer Lauf zur Schließung dieser Lücke:

`[Fakt]` `startvorlagen/ai-workforce.json` (Codex konfiguriert, Port 4176).
`POST /api/chat` mit `{"nachricht":"Ich habe das Ergebnis von Workflow
f15-ws4-l1 geprueft (features/F15/nachweis-ak10-analyse.md). Der Abschnitt
zu F-243 ist zu knapp. Fordere fuer diesen Workflow eine Anpassung an, damit
er ueberarbeitet wird."}` → `202
{"laufId":"jarvis-jarvis-chat-eaa0a215-0468-46ce-97cd-bf548f0ac7b5", …}`.

`[Fakt]` Lauf real `ABGESCHLOSSEN`/`ERFOLGREICH` (worker `codex`, `exitCode
0`). `GET /api/chat` zeigt den neuen Eintrag mit genau der erwarteten Form
— `aktion.typ: 'anpassen'` gesetzt, `bezug.auftrag_id` gesetzt,
`bezug.workitem` explizit `null` (nicht `undefined`), `auftrag` `null`:
```json
{
  "aktion": { "typ": "anpassen", "ziel": "f15-ws4-l1" },
  "antwort": "Anpassung für Workflow f15-ws4-l1 anfordern: Den Abschnitt zu F-243 in features/F15/nachweis-ak10-analyse.md ausführlicher ausarbeiten.",
  "art": "aktion",
  "auftrag": null,
  "bezug": { "auftrag_id": "f15-ws4-l1", "workitem": null }
}
```

`[Schlussfolgerung]` Die volle Pipeline (`baueJarvisAuftragstext` →
Codex-Kindprozess → `leseJarvisErgebnisAusLaufakte` →
`validiereErgebnisJarvis` → Lineage-Write) läuft real und fehlerfrei auch für
den Pfad mit dem höchsten strukturellen Risiko des ursprünglichen Bugs
(gekoppeltes Unterobjekt + `bezug`-Exklusivität in der Codex-Null-Form).

## Ergebnis

F-423 real behoben: Jarvis-Chat mit Codex-Worker endet ERFOLGREICH statt
FEHLGESCHLAGEN, beide Worker-Pfade real bestätigt für `art: 'antwort'` UND
`art: 'aktion'`/`aktion.typ: 'anpassen'` (der höchste-Risiko-Pfad, per
QA-Nachforderung ergänzt), bestehende WS-1/2a/2b-Tests unverändert grün
(28/28 `src/jarvis/jarvis.test.ts`, volles `npm run check` grün).
