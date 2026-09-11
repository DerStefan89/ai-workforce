# F18 WS-3 — Nachweisprotokoll Szenario A (Fast-Lane, real bis ABGESCHLOSSEN)

Stand: 11.09.2026. Bedienung durch Claude Code (Assistent) direkt über die
Leitstand-HTTP-Endpunkte (`curl` gegen `127.0.0.1:4173`), Muster:
`features/F18/nachweis-ws2.md`, `features/F17/nachweis-ws3.md`. Anders als
WS-2 (die dort bewusst NICHT über `POST /api/workflows/<id>/starten` ging)
läuft dieser Nachweis über den vollständigen Schritt-Automaten bis
`ABGESCHLOSSEN` — das ist der WS-3-Auftrag (Ziel 2, Szenario A).

**Rohstrom-Belege sind nicht committet** (`.gitignore`, E-190) — wie in
F16/F17/F18-WS2 werden Rohstrom-Zitate über den `rohstrom_referenz.
inhalts_hash` der committeten Laufakte referenziell prüfbar gehalten.
Startvorlage: Server-Default (`startvorlagen/beispielprojekt.json`)
genügt — dieses Szenario braucht keinen `codex`-Worker.

---

## Design-Entscheidung: zwei Aufträge statt einem

`[Fakt]` Ein Router-Lauf über `POST /api/laeufe` liest seinen
Auftragstext als EINZIGEN Eingabekanal (F-269, wortgleich zu WS-2). Der
spätere `ausfuehrung`-Schritt des registrierten Workflows liest — über
`eingaben: ["artefakt:auftrag-<AUFTRAG_ID>"]` — **denselben** Auftragstext
desjenigen `auftrag_id`, den `route-auftrag.mjs` als CLI-Argument bekommt
(`scripts/leitstand-server.mjs`, `starteWorkflowSchritt` →
`loeseSchrittEingabenAuf(..., auftragVersion.daten.auftragstext, ...)`).

`[Schlussfolgerung, real geprüft]` Ein erster Versuch, denselben Auftrag
für BEIDES zu verwenden (den Klassifikationsauftrag mit der
Router-Rollenanweisung UND als `auftrag_id` des Workflows), wurde bewusst
verworfen, BEVOR die Freigabe erteilt wurde: die `ausfuehrung`-Rolle hätte
dann die Anweisung „Agiere als Rolle 'router', klassifiziere … antworte
mit JSON" als ihren eigenen Auftrag gesehen — sinnlos für eine
Schreibrolle. `route-auftrag.mjs` trennt `auftrag_id`/`ziel` bewusst als
eigene CLI-Argumente vom Router-Lauf selbst (Kopfkommentar des Skripts:
„Wer route-auftrag.mjs aufruft, hat den Auftrag gerade selbst angelegt und
kennt beide Werte bereits") — das lässt ausdrücklich zu, dass es ein
ANDERER, frischer Auftrag ist. Für diesen Nachweis: **zwei** reale
Aufträge, einer für die Klassifikation (Rolleninstruktion), einer mit
reinem Klartext für die Ausführung.

---

## A — Klassifikation: zwei reale Rot-Fälle, dann ein realer Grün-Fall

`[Fakt]` Klassifikationsauftrag 1 (`fa052420-024f-4bcc-a38d-330ae5edaff1`,
Titel „F18 WS-3 Szenario A: Router-Klassifikation"), Router-Lauf
`ws3-szenario-a-router-1789157988`, real `ABGESCHLOSSEN`/`ERFOLGREICH`.
Beobachtetes `result`-Feld (wörtlich, inklusive des Codezauns, der den
realen Fehlschlag unten verursacht):

> ```` ```json ````
> `{"kontrolltiefe":"fast-lane","risikoklasse":"niedrig","task_typen":["dateierstellung"],"rueckfragen":[],"begruendung":"…"}`
> ```` ``` ````

`[Fakt]` `node scripts/route-auftrag.mjs ws3-szenario-a-router-1789157988 …`
scheitert real mit Exit 1, zwei unabhängigen Gründen: (1) Markdown-Codezaun
um das JSON (```` ```json … ``` ````) bricht `JSON.parse` — dasselbe
Muster wie in `features/F18/eval-bericht-ws3.md` (F-337, 8 von 30
Eval-Läufen betroffen); (2) selbst entzäunt wäre `task_typen: ["dateierstellung"]`
ungültig — `"dateierstellung"` ist kein Wert aus
`ERGEBNIS_ROUTER_FELDER`/`TASK_TYPEN` (`src/router/index.ts`).

`[Fakt]` Zweiter Versuch, neuer Lauf `ws3-szenario-a-router-r2-1789158029`
gegen denselben Auftrag: erneut Codezaun UND erneut `"dateierstellung"` —
derselbe Rot-Fall reproduziert sich, kein Einzelfall.

`[Fakt]` Klassifikationsauftrag 2 (`75c4a107-c7ab-4e6b-b159-36eea03e97be`,
„… (v2)"): Formatanweisung verschärft — Aufzählung der sechs zulässigen
`task_typen`-Werte wörtlich im Prompt, explizites Verbot von
Markdown-Codezäunen. Lauf `ws3-szenario-a-router-r3-1789158071`, real
`ABGESCHLOSSEN`/`ERFOLGREICH`:

```json
{"kontrolltiefe":"fast-lane","risikoklasse":"niedrig","task_typen":["dokumentation"],"rueckfragen":[],"begruendung":"Anlegen einer einzelnen neuen Markdown-Datei mit genau einer vorgegebenen Textzeile, keine Code- oder Logikänderung, keine Auswirkung auf src/**, geringes Risiko und minimaler Umfang."}
```

`[Fakt]` Reines JSON, kein Codezaun, `task_typen` gültig. Laufakte
`inhalts_hash` `48268cc7310b88005c498ebf8213de363c7a48c6f7aec6e3741a2837b8aa5aeb`.

`[Schlussfolgerung]` Diese drei Läufe sind selbst ein kleiner,
zusätzlicher realer Beleg für F-337 (Format-Zuverlässigkeit, nicht
Urteilsvermögen) — unabhängig vom 30-Lauf-Eval in Ziel 1.

---

## B — Ausführungsauftrag (Klartext) und Workflow-Registrierung

`[Fakt]` Ausführungsauftrag `0c22d6fd-9a03-432c-a1ad-b4d6fc7c665e` (Titel
„F18 WS-3 Szenario A: Ausfuehrung"), Auftragstext (vollständig, Klartext,
KEINE Router-Rolleninstruktion): „Erstelle die Datei
features/F18/nachweis-ws3-beleg-a.md mit exakt der einen Zeile: F18 WS-3
Szenario A (Fast-Lane) real durchgelaufen." `inhalts_hash`
`3ab9ed2f7e6309c0b52b86249763e08ececb5e4b4fe30c667c26eadeb73ad53c`.

`[Fakt]` `node scripts/route-auftrag.mjs ws3-szenario-a-router-r3-1789158071
0c22d6fd-9a03-432c-a1ad-b4d6fc7c665e "Erstelle die Datei …"`:

```
Klassifikation (lauf_id 'ws3-szenario-a-router-r3-1789158071'): {"kontrolltiefe":"fast-lane", …}
Workflow registriert: workflow_id 'router-0c22d6fd-9a03-432c-a1ad-b4d6fc7c665e', versionSequenz 1 (Kontrolltiefe 'fast-lane')
```

`[Fakt]` `verstoesse.length === 0` — die Registrierung passierte
`validiereWorkflowDaten` vollständig. Vorlage: `workflow-vorlagen/
fast-lane.json` (ein Schritt, `ausfuehrung`/`claude-code`/`schreibend`/
`ZWINGEND`).

---

## C — Der Schritt-Automat: Start, Freigabe-Halt, reale Ausführung, ABGESCHLOSSEN

`[Fakt]` `POST /api/workflows/router-0c22d6fd-9a03-432c-a1ad-b4d6fc7c665e/starten`:

```json
{"grund":"Workflow 'router-0c22d6fd-9a03-432c-a1ad-b4d6fc7c665e' ist nicht startbar (haltFreigabe): Schritt 'schritt-1-ausfuehrung' verlangt eine menschliche Freigabe (freigabe 'ZWINGEND') — er startet erst, wenn für ihn eine Freigabe erteilt ist (POST /api/workflows/<id>/freigabe)","art":"haltFreigabe"}
```

`[Fakt]` Kein Worker gestartet an diesem Punkt — derselbe reale Halt wie
in `features/F18/nachweis-ws2.md` Abschnitt C (dort nur beobachtet, hier
zusätzlich real durchlaufen).

`[Fakt]` `POST /api/workflows/router-0c22d6fd-9a03-432c-a1ad-b4d6fc7c665e/freigabe`
mit `{"schrittId":"schritt-1-ausfuehrung","entscheidung":"FREIGEGEBEN","begruendung":"F18 WS-3 Szenario-A-Nachweis: realer Grünfall, Freigabe durch Claude Code (Assistent) im Rahmen des Bauauftrags."}`:

```json
{"workflowId":"router-0c22d6fd-9a03-432c-a1ad-b4d6fc7c665e","schrittId":"schritt-1-ausfuehrung","entscheidung":"FREIGEGEBEN","status":"LAEUFT","laufId":"4efa5d7f-3c9d-483c-a05c-28fd3ed3b1b1", …}
```

`[Fakt, real, F-272-Beachtung]` Freigabe UND Start liefen über den echten
Produktionsendpunkt (`POST /api/workflows/<id>/freigabe`), kein Test-Double.
Lauf `4efa5d7f-3c9d-483c-a05c-28fd3ed3b1b1` real `ABGESCHLOSSEN`/
`ERFOLGREICH` (Laufakte `inhalts_hash`
`7ff6c88d6ec18ea83fa615e969d19fc00ab1d9dc5d1691cd46efb3dea2dc06b8`, `worker:
claude-code`, `modell_beobachtet: claude-sonnet-5`).

`[Fakt]` Reale Schreibwirkung — Datei existiert mit exakt dem verlangten
Inhalt:

```
$ cat features/F18/nachweis-ws3-beleg-a.md
F18 WS-3 Szenario A (Fast-Lane) real durchgelaufen.
```

`[Fakt]` `GET /api/workflows/router-0c22d6fd-9a03-432c-a1ad-b4d6fc7c665e`
danach: `status: "ABGESCHLOSSEN"`, `aktiver_schritt_id: null`,
`schritt-1-ausfuehrung.status: "ERFOLGREICH"`, `naechster.art: "fertig"`,
`werkzeugsatzDurchsetzung: [{"schrittId":"schritt-1-ausfuehrung","durchsetzungsgrad":"ERZWUNGEN"}]`.
Workflow-Artefakt `inhalts_hash`
`ff39d64fbaaff84ecfaf6a212de2ef6e411ed983affdd6eed0e5785edf3b6c68`
(versionSequenz 4 — Registrierung, Freigabe-Fortschritt, Terminal, je eine
Fassung).

**Szenario A erfüllt: JA.** Ein echter `router`-Lauf klassifizierte real
als `fast-lane`; `route-auftrag.mjs` registrierte den 1-Schritt-Workflow
über `POST /api/workflows`; der Workflow wurde über den echten
`POST /api/workflows/<id>/starten`-Endpunkt gestartet, hielt real am
`ZWINGEND`-Freigabe-Halt, wurde real freigegeben und lief bis
`ABGESCHLOSSEN` mit sichtbarer, geprüfter Schreibwirkung durch.

---

## Was dieser Nachweis nicht abdeckt

`[Fakt]` **Das gerenderte Bild der Leitstand-Oberfläche** — wie in
F16/F17: `curl` gegen dieselben Endpunkte, kein Browser-Klick (dieselbe,
bereits benannte Grenze). · **Eine Wiederholung mit einer zweiten,
unabhängigen fast-lane-Aufgabe** — dieser Nachweis zeigt EINEN realen
Durchlauf; die statistische Breite (mehrere Aufgaben, mehrere
Wiederholungen) ist Ziel 1 (`features/F18/eval-bericht-ws3.md`), nicht
Ziel 2.
