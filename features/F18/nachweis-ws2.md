# F18 WS-2 — Nachweisprotokoll (realer Router-Lauf → registrierter Workflow)

Stand: 11.09.2026. Bedienung durch Claude Code (Assistent) direkt über die
Leitstand-HTTP-Endpunkte (`curl` gegen `127.0.0.1:4173`), Startvorlage
`startvorlagen/beispielprojekt.json` (Server-Default, kein `worker.codex`
nötig — der Router-Lauf läuft strukturell als `claude-code`, siehe
„Entschieden" in `features/F18/feature.md`). Muster: `features/F17/
nachweis-ws3.md` (ebenfalls Bedienung über `curl`, nicht über einen
Browser-Klick — dieselbe, dort schon benannte Grenze: die Artefakte
unterscheiden nicht, ob eine Bedienung aus der Oberfläche oder aus `curl`
gegen dieselben Endpunkte kam).

**Rohstrom-Belege sind nicht committet** (`.gitignore`, E-190) — wie in
F16/F17 werden Rohstrom-Zitate über den `rohstrom_referenz.inhalts_hash`
der committeten Laufakte referenziell prüfbar gehalten.

---

## Aufbau

`[Fakt]` Auftrag `7fac8f57-8627-4244-a192-b11fb38267df` („F18 WS-2
Nachweis: Router-Klassifikation eines Tippfehler-Fixes", Auftragsartefakt-
`inhalts_hash` `050c0489928734c3e535b66da5b18e7ce57d320217434e80cdf12a9c9f1460b2`,
angelegt 19:29:20.325Z über `POST /api/auftraege`).

`[Fakt]` Der Auftragstext trägt zwei Teile in einem Feld — dieselbe
Selbstzuordnungs-Bauart wie in `features/F16/nachweis-ak12.md` (F-269: ein
Lauf hat keine eigene Instruktion, nur den Auftragstext): (1) die
Rollenanweisung „agiere als router, klassifiziere, führe NICHT aus, lies
kein `src/**`", (2) den zu klassifizierenden Gegenstand (Tippfehler-Fix in
`docs/STATUS.md`), (3) die Formatanweisung „antworte AUSSCHLIESSLICH mit
einem JSON-Objekt mit genau den Feldern …". `[Schlussfolgerung]` Diese
dritte Anweisung ist hier nicht überflüssig, sondern NOTWENDIG: anders als
ein Codex-Schritt mit `--output-schema` (F16/F17) hat ein Router-Lauf über
den direkten `POST /api/laeufe`-Pfad KEINEN Schema-Mechanismus — `worker`
und `ausgabeSchemaPfad` stehen nicht in `ERLAUBTE_STARTAUFTRAG_FELDER`
(`scripts/leitstand-server.mjs`) und kommen ausschließlich aus einem
geplanten Workflow-Schritt. Ohne die Prompt-Anweisung gäbe es keine
JSON-Form zu validieren.

`[Fakt]` Start über `POST /api/laeufe`:

```json
{
  "laufId": "f18-ws2-router-nachweis-1",
  "rolle": "router",
  "anfragen": [],
  "budget": { "maxElemente": 20, "maxBytes": 200000 },
  "aufrufEingaben": { "modell": "claude-sonnet-5" },
  "werkzeugsatz": "lesend",
  "auftragId": "7fac8f57-8627-4244-a192-b11fb38267df"
}
```

`202 {"laufId":"f18-ws2-router-nachweis-1"}`.

---

## A — Der Router-Lauf lief real und erfolgreich

Checkpoint-Kette `kontrollzustand/lineage-laufakte-f18-ws2-router-nachweis-1/`
plus Terminal-Wirkungsmarke in `kontrollzustand/f18-ws2-router-nachweis-1/`:

| # | Prüfung | Beobachtung | Marker |
|---|---|---|---|
| A-1 | `run_prepared` (19:29:31.295Z) → Terminal `ergebnis: ERFOLGREICH` (19:29:41.506Z) | `[Fakt]` | ✅ |
| A-2 | `laufStatus` über `stelleLaufstatusFest`: `{"status":"ABGESCHLOSSEN","ergebnis":"ERFOLGREICH","terminalSequenz":2,"runPreparedSequenz":1,"terminaleOhneRunPrepared":[]}` | `[Fakt]` | ✅ |
| A-3 | Laufakte (`inhalts_hash` `0d927c8384fc4f669be3b4d62a06b6802e9a4abbc6590bc123dbd9d3bd6b792a`): kein `worker`-Feld = `claude-code` (F16 AK4), `modell_beobachtet: "claude-sonnet-5"`, `berechtigungskontext: "profil-standard"`, `beobachtungsbasis_vollstaendig: true` | `[Fakt]` | ✅ |
| A-4 | `rohstrom_referenz.inhalts_hash` `6b4c2fc655cf8a44f3923e62d903497a733997e9820feb4ae19ef9560e44414e`, real nachgerechnet gegen `kontrollzustand-roh/f18-ws2-router-nachweis-1/rohstrom.json` (2193 Byte `stdout`) | `[Fakt]` | ✅ |
| A-5 | `permission_denials: []`, `exitCode: 0` — regulärer Abschluss, keine Genehmigungsverweigerung | `[Fakt]` | ✅ |

---

## B — Das Rohstrom-Ergebnis ist ein reales, schemakonformes `type:"result"`-Objekt

`[Fakt]` `rohstrom.stdout` (die INNERE JSON-Ebene — die äußere Hülle trägt
zusätzlich `werkzeugStartziel`/`stderr`/`exitCode`/`startfehler`/
`beendigungsart`) ist ein `type:"result"`-Objekt (Claude-Code-CLI,
`--output-format json`). Sein `result`-Feld — der einzige Kanal, über den
ein `claude-code`-Lauf ohne `--output-schema` überhaupt Freitext liefert —
enthält wörtlich:

```json
{"kontrolltiefe":"fast-lane","risikoklasse":"niedrig","task_typen":["text-aenderung","dokumentation"],"rueckfragen":[],"begruendung":"Es handelt sich um eine einzelne, klar spezifizierte Textkorrektur (Tippfehler-Fix eines fehlenden Umlauts) in einer Dokumentationsdatei (docs/STATUS.md), ohne Logik-, Schnittstellen- oder Verhaltensänderung. Der Suchbegriff und Ersetzungswert sind exakt vorgegeben, es gibt keinen Interpretationsspielraum und kein Risiko für Funktionalität oder Sicherheit."}
```

`[Fakt]` Kein Freitext davor oder danach — anders als beim F-308-Muster in
F16/F17 (dort mehrere `agent_message`-Ereignisse, nur die letzte
schemakonform) trägt ein `claude-code`-Ergebnisobjekt genau EIN
`result`-Feld; hier ist dessen gesamter Inhalt bereits das reine JSON.

`[Fakt]` `validiereErgebnisRouter` (`src/router/index.ts`) prüft dieses
Objekt real, über `scripts/route-auftrag.mjs` aufgerufen — kein
Quelltext-Blick, sondern der reale Lauf des Skripts gegen die reale
Laufakte:

```
$ node scripts/route-auftrag.mjs f18-ws2-router-nachweis-1 \
    7fac8f57-8627-4244-a192-b11fb38267df \
    "Suche in docs/STATUS.md nach dem Wort 'laueft' (ohne Umlaut) und ersetze es durch 'läuft', falls vorhanden."

{"ereignis":"laufstatus_festgestellt","lauf_id":"f18-ws2-router-nachweis-1","zeitstempel":"2026-09-11T19:32:51.060Z","status":"ABGESCHLOSSEN"}
{"ereignis":"lineage_geladen","artefakt_id":"laufakte-f18-ws2-router-nachweis-1","zeitstempel":"2026-09-11T19:32:51.062Z","versionSequenz":1}
Klassifikation (lauf_id 'f18-ws2-router-nachweis-1'): {"kontrolltiefe":"fast-lane","risikoklasse":"niedrig","task_typen":["text-aenderung","dokumentation"],"rueckfragen":[],"begruendung":"…"}
Workflow registriert: workflow_id 'router-7fac8f57-8627-4244-a192-b11fb38267df', versionSequenz 1 (Kontrolltiefe 'fast-lane')
```

`[Fakt]` `verstoesse.length === 0` — sonst hätte das Skript mit Exit 1 und
einer Verstoßliste abgebrochen, statt den Workflow zu registrieren (real
so beobachtet: der erste Lauf des Skripts scheiterte an einem echten
eigenen Bug, siehe „Real gefundener Blocker" unten, bevor die Korrektur
diesen Grünfall ermöglichte).

---

## C — Der gewählte Workflow ist real registriert und trägt die richtige Vorlage

`[Fakt]` `GET /api/workflows/router-7fac8f57-8627-4244-a192-b11fb38267df`:

```json
{
  "workflowId": "router-7fac8f57-8627-4244-a192-b11fb38267df",
  "versionSequenz": 1,
  "daten": {
    "workflow_id": "router-7fac8f57-8627-4244-a192-b11fb38267df",
    "auftrag_id": "7fac8f57-8627-4244-a192-b11fb38267df",
    "ziel": "Suche in docs/STATUS.md nach dem Wort 'laueft' (ohne Umlaut) und ersetze es durch 'läuft', falls vorhanden.",
    "status": "OFFEN",
    "aktiver_schritt_id": "schritt-1-ausfuehrung",
    "schritte": [
      {
        "schritt_id": "schritt-1-ausfuehrung",
        "rolle": "ausfuehrung",
        "werkzeugsatz": "schreibend",
        "worker": "claude-code",
        "modell": "claude-sonnet-5",
        "freigabe": "ZWINGEND",
        "status": "OFFEN",
        "lauf_id": null
      }
    ]
  },
  "verstoesse": [],
  "naechster": {
    "art": "haltFreigabe",
    "schrittId": "schritt-1-ausfuehrung",
    "grund": "Schritt 'schritt-1-ausfuehrung' verlangt eine menschliche Freigabe (freigabe 'ZWINGEND') — er startet erst, wenn für ihn eine Freigabe erteilt ist (POST /api/workflows/<id>/freigabe)"
  },
  "werkzeugsatzDurchsetzung": [{ "schrittId": "schritt-1-ausfuehrung", "durchsetzungsgrad": "ERZWUNGEN" }]
}
```

| # | Prüfung | Beobachtung | Marker |
|---|---|---|---|
| C-1 | `status: "OFFEN"`, nicht `WARTET_FREIGABE` | `[Fakt]` | ✅ |
| C-2 | Genau EIN Schritt (`fast-lane`-Vorlage), `rolle: ausfuehrung`, `werkzeugsatz: schreibend`, `freigabe: ZWINGEND` | `[Fakt]` | ✅ |
| C-3 | `verstoesse: []` — die Registrierung passierte `validiereWorkflowDaten` vollständig | `[Fakt]` | ✅ |
| C-4 | `naechster.art: "haltFreigabe"` — der Schritt-Automat würde bei einem Startversuch sofort anhalten, kein Autostart | `[Fakt]` | ✅ |
| C-5 | Workflow-Artefakt real registriert, `inhalts_hash` `f9c860dacacdafb096e712fe842e14b4cfbee41a67720928b9a244d81c288130`, `erstellt_am` 19:32:51.098Z | `[Fakt]` | ✅ |

`[Schlussfolgerung]` C-1 und C-4 zusammen belegen die im Kopfkommentar von
`src/router/index.ts` behauptete Kette real, nicht nur strukturell: der
Workflow wird OFFEN registriert (kein Autostart durch `POST
/api/workflows`), und selbst ein Startversuch träfe sofort auf einen
Freigabe-Halt — der Zielsatz „Stefan gibt den Workflow frei, bevor er
läuft" (§13.4) ist damit für diesen realen Fall doppelt abgesichert.

`[Fakt]` Kein Worker wurde für diesen Workflow gestartet — `lauf_id: null`
am einzigen Schritt, `POST /api/workflows/<id>/starten` wurde in diesem
Nachweis bewusst NICHT aufgerufen (Nicht-Ziel von WS-2: kein
Automatenlauf, das ist WS-3).

---

## Lineage

`[Fakt]` Kontextpaket des Router-Laufs (`GET /api/laeufe/
f18-ws2-router-nachweis-1`) trägt ein Element: `artefakt:
auftrag-7fac8f57-8627-4244-a192-b11fb38267df`, `inhalts_hash`
`050c0489928734c3e535b66da5b18e7ce57d320217434e80cdf12a9c9f1460b2` —
bytegleich mit dem `inhalts_hash` des Auftragsartefakts. Lineage per Hash
geschlossen (Muster F16/F17).

---

## Real gefundener Blocker (behoben vor dem Grünfall)

`[Fakt]` Der erste Lauf von `scripts/route-auftrag.mjs` scheiterte real
mit `"Rohstrom trägt kein type:'result'-Objekt mit einem 'result'-Textfeld"`.
Ursache: das Skript rief `leseErgebnisobjekt` direkt auf den Inhalt der
äußeren Rohstrom-Hülle auf (`{werkzeugStartziel, stdout, stderr, …}`)
statt — wie `src/result-evaluator/index.ts` es vormacht — zuerst die Hülle
zu parsen und `leseErgebnisobjekt` auf `.stdout` anzuwenden. `[Fakt]`
Korrigiert (ein zusätzlicher `JSON.parse`-Schritt vor dem
`leseErgebnisobjekt`-Aufruf); der zweite Lauf gegen dieselbe, unveränderte
Laufakte lieferte den in Abschnitt B/C dokumentierten Grünfall. Kein
Finding in `state/findings.md` nötig — der Fehler lag im neuen
WS-2-Skript selbst, nicht in einer bestehenden Grenze.

---

## Was dieser Nachweis nicht abdeckt

`[Fakt]` **Die `standard`- und `hoch`-Vorlage real gewählt** — dieser Lauf
klassifizierte real als `fast-lane`; dass `waehleWorkflowVorlage` auch für
`standard` und `hoch` ein gültiges `WORKFLOW_V0` liefert, ist über
`src/router/router.test.ts` (alle drei Vorlagen gegen
`validiereWorkflowDaten` geprüft) abgedeckt, nicht über einen zweiten
realen Lauf. · **Den Schritt-Automaten** — `POST /api/workflows/<id>/
starten` wurde nicht aufgerufen (Nicht-Ziel WS-2). · **Ein
Router-Ergebnis, das NICHT gegen das Schema passt** (z. B. Freitext statt
JSON) — real nicht eingetreten, nur über `src/router/router.test.ts`
kalibriert. · **Codex als Router-Worker** — strukturell für einen direkten
`POST /api/laeufe`-Aufruf ohnehin `claude-code` (siehe „Entschieden" in
`features/F18/feature.md`), hier nicht anders geprüft.

## Gesamtergebnis

**WS-2 real belegt:** ein echter, erfolgreicher `router`-Lauf über den
Leitstand liefert eine schemakonforme Klassifikation; `scripts/
route-auftrag.mjs` liest sie aus der realen Laufakte, validiert sie gegen
`ergebnis-router` und registriert über den bestehenden `POST
/api/workflows` einen `WORKFLOW_V0`-Datensatz mit `status: 'OFFEN'` und
einem `ZWINGEND`-Schreibschritt — sichtbar über `GET /api/workflows/<id>`,
mit dem laut Klassifikation korrekten Vorlagen-Inhalt (`fast-lane`, ein
Schritt).
