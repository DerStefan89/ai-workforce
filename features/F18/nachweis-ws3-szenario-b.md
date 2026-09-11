# F18 WS-3 — Nachweisprotokoll Szenario B (Standard, real bis ABGESCHLOSSEN)

Stand: 11.09.2026. Bedienung durch Claude Code (Assistent) direkt über die
Leitstand-HTTP-Endpunkte (`curl` gegen `127.0.0.1:4173`), Muster:
`features/F17/nachweis-ws3.md` (dort AK8: zweistufiger Workflow läuft mit
automatischem Übergang durch). Startvorlage:
`LEITSTAND_STARTVORLAGE_PFAD=startvorlagen/ai-workforce.json` — dieses
Szenario braucht den `worker.codex`-Block (Schritt 1 läuft auf `codex`).

**Rohstrom-Belege sind nicht committet** (`.gitignore`, E-190) — Rohstrom-
Zitate sind über den `rohstrom_referenz.inhalts_hash` der committeten
Laufakten referenziell prüfbar. Design-Entscheidung „zwei Aufträge statt
einem" wortgleich zu `features/F18/nachweis-ws3-szenario-a.md` — hier
nicht wiederholt.

---

## A — Klassifikation: real `standard`, sauber, ohne Codezaun

`[Fakt]` Klassifikationsauftrag `3bba5630-2299-4554-96fc-3b0a74d7fa82`
(„F18 WS-3 Szenario B: Router-Klassifikation"), Prompt mit derselben in
Szenario A gelernten Verschärfung (task_typen-Enum wörtlich aufgezählt,
Codezaun-Verbot) von Anfang an. Zu klassifizierender Gegenstand: „Füge
unter schemas/examples/ eine neue Beispieldatei … hinzu, die eine
Klassifikation mit einem leeren String als rueckfragen-Element zeigt …
Ergänze scripts/check-f18-router.mjs …" — ein Test-Fixture- plus
Gate-Erweiterungsauftrag, kein reiner Tippfehlerfix.

`[Fakt]` Lauf `ws3-szenario-b-router-1789158243`, real
`ABGESCHLOSSEN`/`ERFOLGREICH` (Laufakte `inhalts_hash`
`da534be43d167eec28da954aadbf84a2fff03fdd072037885ee56510b5d6ea16`).
Beobachtetes `result`-Feld, reines JSON, KEIN Codezaun (im Gegensatz zu
zwei der drei Szenario-A-Klassifikationsläufe):

```json
{"kontrolltiefe":"standard","risikoklasse":"niedrig","task_typen":["neues-feature"],"rueckfragen":[],"begruendung":"Der Auftrag fuegt eine neue negative Testfixture unter schemas/examples/ hinzu und ergaenzt das Pruefskript scripts/check-f18-router.mjs um einen entsprechenden Eintrag mit sollGueltigSein:false. Es handelt sich um eine klar umrissene, kleine Erweiterung bestehender Testabdeckung (neuer Testfall/Fixture), kein Bugfix an Produktionslogik und keine reine Textaenderung. Risiko ist niedrig, da nur Beispiel-/Testdateien betroffen sind und die Aenderung isoliert, klein und eigenstaendig pruefbar ist; Standard-Kontrolltiefe reicht, da es sich um eine funktionale Ergaenzung (neuer Pruefpfad) und nicht um triviale Textkosmetik handelt."}
```

`[Fakt]` `kontrolltiefe: "standard"` — anders als jede der zehn
Eval-Aufgaben in Ziel 1 klassifizierte dieser reale Auftrag beim ERSTEN
Versuch sauber, ohne Nacharbeit am Prompt.

---

## B — Ausführungsauftrag (Klartext) und Workflow-Registrierung (2 Schritte)

`[Fakt]` Ausführungsauftrag `b576d8bd-a57d-41ee-97b4-f9b52c2686d5` (Titel
„F18 WS-3 Szenario B: Ausfuehrung"), Klartext ohne Router-Rolleninstruktion,
`inhalts_hash`
`79df93c36ef8e392c8fea8d4b0d6011008a259963a0a4316a8da033513d737f4`.

`[Fakt]` `node scripts/route-auftrag.mjs ws3-szenario-b-router-1789158243
b576d8bd-a57d-41ee-97b4-f9b52c2686d5 "Fuege unter schemas/examples/ …"`:

```
Workflow registriert: workflow_id 'router-b576d8bd-a57d-41ee-97b4-f9b52c2686d5', versionSequenz 1 (Kontrolltiefe 'standard')
```

`[Fakt]` Vorlage: `workflow-vorlagen/standard.json` — zwei Schritte:
`schritt-1-review` (`code-reviewer`/`codex`/`lesend`/`output_schema:
ergebnis-code-reviewer`/`freigabe: AUTOMATISCH`, `nachfolger:
schritt-2-ausfuehrung`), `schritt-2-ausfuehrung`
(`ausfuehrung`/`claude-code`/`schreibend`/`freigabe: ZWINGEND`).

---

## C — Schritt-Automat: Codex-Blocker, Neustart mit passender Startvorlage

`[Fakt, real gefundener Blocker]` Erster Startversuch
(`POST /api/workflows/router-b576d8bd-a57d-41ee-97b4-f9b52c2686d5/starten`)
gegen den Server-Default (`startvorlagen/beispielprojekt.json`) schlägt
real fehl:

```json
{"grund":"Schritt 'schritt-1-review': Worker 'codex' verlangt den Block 'worker.codex' in der Startvorlage (startziel, versionDeklariert, sandbox) — er fehlt"}
```

`[Schlussfolgerung]` Erwartbar und kein Softwarefehler: der Default für
Ziel 1 (reine `router`-Läufe, immer `claude-code`) genügt nicht für ein
Szenario, dessen erster Schritt real auf `codex` läuft — dieselbe
Startvorlagen-Vorbedingung, die `features/F17/nachweis-ws3.md` schon für
den F16/F17-Codex-Schritt dokumentiert. Server neu gestartet mit
`LEITSTAND_STARTVORLAGE_PFAD=startvorlagen/ai-workforce.json` (bestehender
Prozess beendet, `kontrollzustand/` unverändert — reine
Dateisystem-Persistenz, kein In-Memory-Zustand ging verloren, der für
diesen Workflow relevant gewesen wäre). Zweiter Startversuch:

```json
{"workflowId":"router-b576d8bd-a57d-41ee-97b4-f9b52c2686d5","schrittId":"schritt-1-review","laufId":"cd50dac9-8853-4213-b339-d839d12466cf"}
```

---

## D — Schritt 1 real auf Codex, automatischer Übergang zu Schritt 2

`[Fakt]` Laufakte `cd50dac9-8853-4213-b339-d839d12466cf` (`inhalts_hash`
`b2e99237a7ff4e57814274495b6dc57fa1290187e0794a2a953cfd8c1593147b`):
`worker: codex`, real `ABGESCHLOSSEN`/`ERFOLGREICH`.

`[Fakt]` Polling von `GET /api/workflows/router-b576d8bd-…` zeigt den
automatischen Übergang, KEIN manueller Zwischenstart:

| Zeitpunkt (Poll) | Workflow-Status | `schritt-1-review` | `schritt-2-ausfuehrung` |
|---|---|---|---|
| t+0s, t+3s | LAEUFT | LAEUFT, `lauf_id cd50dac9…` | OFFEN, `lauf_id null` |
| t+6s | **WARTET_FREIGABE** | **ERFOLGREICH** | OFFEN, `lauf_id null` (Freigabefrage offen) |

`[Fakt]` `naechster` vor der Freigabe (aus derselben Zwischenabfrage):
`{"art":"haltKlaerung", …}` während Schritt 1 noch lief, danach
`WARTET_FREIGABE` sobald Schritt 1 real `ERFOLGREICH` terminierte — der
Automat hat Schritt 1 → Cursor auf Schritt 2 → Freigabe-Halt VOR Schritt 2
selbstständig durchgereicht, exakt das AK8-Muster aus
`features/F17/nachweis-ws3.md` (dort 9 ms zwischen Vorschritt-Ende und
Folgeschritt-Start; hier über Server-Polling statt Checkpoint-Zeitstempeln
beobachtet, aber derselbe Mechanismus — `ermittleNaechstenSchritt`, kein
zweiter HTTP-Startaufruf für Schritt 2 nötig).

---

## E — Freigabe für Schritt 2, reale Ausführung, ABGESCHLOSSEN

`[Fakt]` `POST /api/workflows/router-b576d8bd-…/freigabe`
`{"schrittId":"schritt-2-ausfuehrung","entscheidung":"FREIGEGEBEN","begruendung":"F18 WS-3 Szenario-B-Nachweis: realer Grünfall, Freigabe durch Claude Code (Assistent) im Rahmen des Bauauftrags, nachdem Schritt 1 (code-reviewer/codex) real ERFOLGREICH lief."}`:

```json
{"workflowId":"router-b576d8bd-a57d-41ee-97b4-f9b52c2686d5","schrittId":"schritt-2-ausfuehrung","entscheidung":"FREIGEGEBEN","status":"LAEUFT","laufId":"8462f94d-a487-45ff-897f-f6ac0672436c", …}
```

`[Fakt]` Lauf `8462f94d-a487-45ff-897f-f6ac0672436c` real
`ABGESCHLOSSEN`/`ERFOLGREICH` (Laufakte `inhalts_hash`
`d6a9ed8c5b53b5f5082fc9c518ea9df063bc1fa5dbaed21c72db2cd79cd94b1c`, `worker:
claude-code`, `modell_beobachtet: claude-sonnet-5`).

`[Fakt]` Reale Schreibwirkung, git-sichtbar:

```
$ git status --porcelain
 M scripts/check-f18-router.mjs
?? schemas/examples/ergebnis-router.invalid-leeres-rueckfragen-element.json
```

`schemas/examples/ergebnis-router.invalid-leeres-rueckfragen-element.json`:

```json
{
  "kontrolltiefe": "standard",
  "risikoklasse": "mittel",
  "task_typen": ["bugfix"],
  "rueckfragen": [""],
  "begruendung": "rueckfragen enthält einen leeren String — jedes Element muss ein nicht-leerer String sein."
}
```

`scripts/check-f18-router.mjs`, neue Zeile in `beispiele`:

```js
{ pfad: 'schemas/examples/ergebnis-router.invalid-leeres-rueckfragen-element.json', sollGueltigSein: false },
```

`[Fakt]` `node scripts/check-f18-router.mjs` (real ausgeführt NACH dem
Lauf, nicht simuliert): `✓ (c) Beispiele: valid.json erfüllt das Schema,
alle drei invalid-*.json verletzen je eine benannte Regel.` — die neue
Fixture ist real gültig eingebunden, kein totes Beispiel.
`[Schlussfolgerung]` Die `ausfuehrung`-Rolle löste die Aufgabe inhaltlich
korrekt: neue Datei erfüllt genau eine benannte Regelverletzung
(`rueckfragen[0]` ist ein leerer String), Gate-Skript-Erweiterung
funktional richtig verdrahtet.

`[Fakt, kleiner Nachtrag]` Der ursprüngliche Konsolentext im Gate
(„beide invalid-*.json") war nach dieser realen Erweiterung auf drei
Beispiele sachlich falsch geworden — als Teil dieses Bauauftrags auf
„alle drei" korrigiert (kosmetisch, keine Verhaltensänderung der Prüfung
selbst).

`[Fakt]` `GET /api/workflows/router-b576d8bd-…` danach: `status:
"ABGESCHLOSSEN"`, beide Schritte `status: "ERFOLGREICH"`, `naechster.art:
"fertig"`, `werkzeugsatzDurchsetzung: [{"schrittId":"schritt-1-review",
"durchsetzungsgrad":"DEKLARIERT"},{"schrittId":"schritt-2-ausfuehrung",
"durchsetzungsgrad":"ERZWUNGEN"}]` — dieselbe Asymmetrie wie in
`features/F17/nachweis-ws3.md` AK8. Workflow-Artefakt `inhalts_hash`
`ed47e6ae4420cd87a0d0a28a547e5775be40b89e8d8f5a58b941918360093eb5`
(versionSequenz 6).

**Szenario B erfüllt: JA.** Ein echter `router`-Lauf klassifizierte real
als `standard`; `route-auftrag.mjs` registrierte den 2-Schritt-Workflow;
Schritt 1 (`code-reviewer`/`codex`/`AUTOMATISCH`) lief real und löste den
automatischen Übergang zu Schritt 2 aus — kein manueller Zwischenstart;
Schritt 2 (`ausfuehrung`/`ZWINGEND`) wurde real freigegeben und lief mit
geprüfter, korrekter Schreibwirkung bis `ABGESCHLOSSEN` durch.

---

## Was dieser Nachweis nicht abdeckt

`[Fakt]` **Das gerenderte Bild der Leitstand-Oberfläche** — `curl`, kein
Browser-Klick, dieselbe bereits mehrfach benannte Grenze. · **Einen realen
Rot-Fall des Rollenvertrags in diesem Workflow** — beide Schritte waren
rollenvertragskonform besetzt; dieser Nachweis zeigt den Grün-Pfad, der
Rot-Fall bleibt `features/F17/nachweis-ws3.md` AK9 (bereits belegt,
unverändert gültig, kein neuer Test nötig). · **Eine zweite Wiederholung
von Szenario B** — dieser Nachweis zeigt EINEN realen Durchlauf; die
statistische Breite ist Ziel 1.

## Findings

`[Fakt]` Kein neues Finding aus Szenario B selbst — der Startvorlagen-
Blocker (Abschnitt C) ist dieselbe, bereits bekannte Vorbedingung wie in
`features/F17/nachweis-ws3.md` (kein neues Muster). Die kosmetische
Gate-Textkorrektur (Abschnitt E) ist zu klein für ein eigenes Finding
(sofort im selben PR behoben). F-337 (Markdown-Codezäune) ist bereits in
`features/F18/eval-bericht-ws3.md` / `state/findings.md` angelegt; dieser
Nachweis liefert nur zusätzliche, hier nicht erneut aufgeführte
Beobachtungen (Szenario A, drei weitere Läufe).
