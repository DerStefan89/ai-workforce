# F17 WS-3 — Nachweisprotokoll (realer Grün- und Rot-Fall des Rollenvertrags)

Stand: 11.09.2026. **Bedienung durch Claude Code (Assistent) direkt über die
Leitstand-HTTP-Endpunkte (`curl` gegen `127.0.0.1:4173`), nicht über einen
Browser-Klick.** Das ist eine bewusste Abweichung von
`features/F16/nachweis-ak12.md`, wo Stefan über die Oberfläche bediente —
und dieselbe Grenze, die dort schon benannt ist: die Artefakte unterscheiden
nicht, ob eine Bedienung aus der Oberfläche oder aus `curl` gegen dieselben
Endpunkte kam. Belegt ist hier — wie dort — „über die Leitstand-Endpunkte,
ohne Umgehung des Automatenpfads". Server, Startvorlage und Endpunkte sind
identisch mit dem AK12-Nachweis; nur der Bedienweg unterscheidet sich, und
zwar offen benannt statt stillschweigend vorausgesetzt.

**Startvorlagen-Vorbedingung**, wortgleich zu AK12: `[Fakt]` Der Lauf
verlangt `LEITSTAND_STARTVORLAGE_PFAD=startvorlagen/ai-workforce.json`
(F-326, weiterhin offen, nicht Gegenstand dieses Nachweises).

**Rohstrom-Belege sind nicht committet** (`.gitignore`, E-190) — wie in
AK12 werden Rohstrom-Zitate über den `rohstrom_referenz.inhalts_hash` der
committeten Laufakte referenziell prüfbar gehalten.

---

## Aufbau

`[Fakt]` Ausgangspunkt ist der unveränderte AK12-Plan
[nachweis/ws3b/L1.json](../../nachweis/ws3b/L1.json) — zwei Schritte,
`code-reviewer`/`codex`/`lesend` → `ausfuehrung`/`claude-code`/`schreibend`,
derselbe Auftrag `89c10996-cbb2-4d56-94db-31f905bb6cd1` („F16 AK12
Nachweislauf").

**Warum eine neue `workflow_id` und nicht dieselbe (`f16-ws3b-ak12`):**
`[Fakt]` `scripts/leitstand-server.mjs`, `GESPERRTE_ERSETZUNGS_STATUS`
sperrt `POST /api/workflows` für eine bestehende `workflow_id` mit Status
`ABGESCHLOSSEN` — genau der Zustand, in dem `f16-ws3b-ak12` seit dem
AK12-Nachweis steht (409, „eine fertige Historie wird nicht
umgeschrieben"). `[Schlussfolgerung]` „unverändert" im AK8-Wortlaut bezieht
sich auf Schritte, Rollen, Worker, Werkzeugsätze, Modelle und Ausgabeschema
des Plans — nicht auf die technische `workflow_id`, die als Dateipfad-
Schlüssel dient und für eine ABGESCHLOSSENE Fassung strukturell nicht
wiederverwendbar ist. Zwei neue, inhaltlich identische bzw. minimal
variierte Fassungen: `f17-ws3-ak8` (AK8, Grün) und `f17-ws3-ak9` (AK9,
Rot).

Server-Startzeile: `LEITSTAND_STARTVORLAGE_PFAD=startvorlagen/ai-workforce.json node scripts/leitstand-server.mjs` → `Leitstand läuft auf http://127.0.0.1:4173`.

---

## AK8 — Grün, real: der bestehende Workflow läuft unverändert durch

`[Fakt]` `POST /api/workflows` mit dem AK12-Plan, `workflow_id` auf
`f17-ws3-ak8` geändert, sonst byte-identisch (`auftrag_id`, beide Schritte,
Rollen, Worker, Werkzeugsätze, Modelle, `output_schema` unverändert) →
`{"workflowId":"f17-ws3-ak8","versionSequenz":1}`.

### Versionskette

`kontrollzustand/lineage-workflow-f17-ws3-ak8/checkpoints/`:

| # | Zeit (UTC) | Workflow-Status | Cursor | `schritt-1-review` | `schritt-2-doku` |
|---|---|---|---|---|---|
| 1 | 16:31:24.854 | OFFEN | `schritt-1-review` | OFFEN, `lauf_id: null` | OFFEN, `lauf_id: null` |
| 2 | 16:31:32.775 | **LAEUFT** | `schritt-1-review` | LAEUFT, `0f5a8206…` | OFFEN, `lauf_id: null` |
| 3 | 16:32:00.109 | LAEUFT | **`schritt-2-doku`** | **ERFOLGREICH** | OFFEN, `lauf_id: null` |
| 4 | 16:32:00.118 | LAEUFT | `schritt-2-doku` | ERFOLGREICH | **LAEUFT, `eeab7aa0…`** |
| 5 | 16:32:40.007 | ABGESCHLOSSEN | `null` | ERFOLGREICH | ERFOLGREICH |

`[Fakt]` **Kein manueller Zwischenstart:** Version 3 (Schritt 1
`ERFOLGREICH`, Cursor gewandert) → Version 4 (Schritt 2 `LAEUFT`) liegen
**9 ms** auseinander (16:32:00.109 → 16:32:00.118). Zum Vergleich: zwischen
dem `POST /starten`-Aufruf (16:31:32.630, per `date` protokolliert) und
Version 2 (16:31:32.775) liegen **145 ms** — die reale HTTP-Antwortzeit des
einen, hier ausgeführten Startaufrufs. `[Schlussfolgerung]` Ein zweiter,
separater Startaufruf für Schritt 2 hätte in derselben Größenordnung
gelegen, nicht bei 9 ms — dieselbe Signatur wie in AK12 (dort 29 ms vs.
51,8 s), hier mit einem HTTP-getriebenen statt browsergetriebenen ersten
Aufruf verglichen, deshalb näher beieinander, aber immer noch eine
Größenordnung auseinander.

### Schritt 1 — real auf Codex, lesend, schemakonformes Ergebnis

Laufakte `0f5a8206-5802-4cbe-a625-a0f98b903560` (`inhalts_hash`
`a948efd180ab22b31f7e30567834946b9ce31aca003d215d79f2dfb09d661e0c`):

| Prüfung | Beobachtung | Marker |
|---|---|---|
| `worker` | `codex` | `[Fakt]` |
| `modell_deklariert` / `modell_beobachtet` | `gpt-6-astra` / `null` — dieselbe Asymmetrie wie AK12 (E-185) | `[Fakt]` |
| `berechtigungskontext` | `codex-sandbox-read-only` | `[Fakt]` |
| Argv | `exec --json --sandbox read-only --model gpt-6-astra --output-schema <abs. Pfad zu ergebnis-code-reviewer.schema.json> <ein Prompt-Token>` — dieselbe Grammatik wie AK12 (AK1/AK2/F-290) | `[Fakt]` |
| `exitCode` | `0`, kein `startfehler`, keine `beendigungsart` | `[Fakt]` |
| reale Lesevorgänge | zwei `command_execution`-Ereignisse im Rohstrom (`Get-Content AGENTS.md; Get-Content src/codex-gateway/codex-argv-allowlist.ts`, exit 0; `rg --files …`, exit 1, kein Treffer) — kein Leerlauf | `[Fakt]` |
| `agent_message`-Ereignisse | **zwei**: erstes Freitext („Ich führe Stufe 1 aus und prüfe die Allowlist lesend auf eine geschlossene Token-Grammatik."), zweites schemakonform (`{"urteil":"BEREIT","befunde":[],"empfehlung":"…"}`) | `[Fakt]` |

`[Fakt]` Das **letzte** `agent_message` erfüllt
`schemas/ergebnis-code-reviewer.schema.json` feldweise: `urteil` ∈ Enum
(`"BEREIT"`), `befunde` Array (`[]`, zulässig leer), `empfehlung`
nicht-leerer String, keine Zusatzfelder. `[Schlussfolgerung]` Damit ist das
F-308-Muster (frühere Freitext-`agent_message`, `--output-schema`
unterdrückt sie nicht) hier zum **dritten** Mal real beobachtet — nach den
beiden in `features/F16/nachweis-ak12.md` Abschnitt C dokumentierten
Instanzen.

### Schritt 2 — real auf Claude Code, mit einer ehrlichen Einschränkung

Laufakte `eeab7aa0-4dd4-4593-824e-6aca68e02652`: kein `worker`-Feld (=
`claude-code` nach F16 AK4), `modell_beobachtet: "claude-sonnet-5"`,
`berechtigungskontext: "profil-standard"`, Terminalmarke `ERFOLGREICH`,
`exitCode 0`, `permission_denials: []`.

`[Fakt, offene Unsicherheit — nicht verschwiegen]` **Anders als in AK12
wurde `features/F16/nachweis-ak12-analyse.md` in diesem Lauf NICHT
neu geschrieben.** `git hash-object` vor und nach dem Lauf ist identisch
(`8eef09ba304817f34ae572115eb292e8befe95c6`); `git status` zeigt die Datei
nicht als geändert. Der reale Grund steht im Rohstrom des Laufs: die
Ausführungsrolle hat selbst geprüft, ob die verlangte Datei schon mit dem
verlangten Inhalt existiert (sie tut es, aus dem AK12-Lauf, committet),
und sich — im Sinne von CLAUDE.md „keine Doppelarbeit" — entschieden,
nichts zu schreiben, statt eine bereits committete Beweisdatei zu
überschreiben. Zitat aus dem Ergebnisobjekt: „Since the deliverable
already exists and matches the task requirements … there's nothing new
for me to write. Re-running Stufe 2 would just duplicate an already-
committed file with no changes." `[Schlussfolgerung]` Das ist ein reales,
unverfälschtes Verhalten einer urteilsfähigen Ausführungsrolle, kein
Mechanik-Fehler: `worker`-Dispatch, Rollenvertrag-Prüfung (Werkzeugsatz-
Art `schreibend` ∈ `erlaubte_werkzeugsatz_arten` von `ausfuehrung`),
Kontextübergabe (Auftrag + Laufakte von Schritt 1, siehe unten) und
Terminalklassifikation `ERFOLGREICH` liefen alle real — nur die
**Schreibwirkung selbst** ist in diesem konkreten Lauf nicht neu entstanden,
weil sie bereits vorlag. `[offene Unsicherheit]` Für den AK8-Wortlaut
(„läuft unverändert über den Leitstand durch") ist das unerheblich — der
Workflow lief vollständig und ohne manuellen Zwischenstart durch. Für
D8/F16s Beleg „Schritt 2 hat real geschrieben" trägt dieser Lauf dagegen
nichts Neues bei; dafür bleibt AK12 (`features/F16/nachweis-ak12.md`,
Abschnitt D-5) die tragende Quelle.

### Lineage

`[Fakt]` Kontextpaket von Schritt 2 (`GET /api/laeufe/eeab7aa0…`) trägt
zwei Elemente: den Auftrag (`inhalts_hash` `5755d5da…`, identisch zu
Schritt 1) und `artefakt:laufakte-0f5a8206-5802-4cbe-a625-a0f98b903560`
mit `inhalts_hash` `a948efd180ab22b31f7e30567834946b9ce31aca003d215d79f2dfb09d661e0c`
— bytegleich mit dem `inhalts_hash` der Laufakte von Schritt 1. Lineage
per Hash geschlossen, wie in AK12 (E-2).

### Leitstand-Anzeige (reale Serverantwort)

```
GET /api/laeufe/0f5a8206-5802-4cbe-a625-a0f98b903560 → laufakte:
{"status":"ok","modellBeobachtet":null,"beobachtungsbasisVollstaendig":true,
 "worker":"codex","modellDeklariert":"gpt-6-astra"}

GET /api/laeufe/eeab7aa0-4dd4-4593-824e-6aca68e02652 → laufakte:
{"status":"ok","modellBeobachtet":"claude-sonnet-5","beobachtungsbasisVollstaendig":true,
 "worker":"claude-code","modellDeklariert":null}
```

`[Fakt]` Zusätzlich, **neu gegenüber AK12**: `GET
/api/workflows/f17-ws3-ak8` liefert das additive Feld
`werkzeugsatzDurchsetzung` (F17 WS-2 AK7/F-323 Weg a):

```
"werkzeugsatzDurchsetzung":[
  {"schrittId":"schritt-1-review","durchsetzungsgrad":"DEKLARIERT"},
  {"schrittId":"schritt-2-doku","durchsetzungsgrad":"ERZWUNGEN"}
]
```

`[Schlussfolgerung]` Genau die in AK7 festgelegte Asymmetrie (`codex` →
`DEKLARIERT`, `claude-code` → `ERZWUNGEN`) ist an der realen Antwort dieses
Laufs zu sehen, nicht nur am Quelltext.

**AK8 erfüllt: JA.** Derselbe zweistufige F16-Workflow läuft nach F17
WS-1+WS-2 unverändert und ohne manuellen Zwischenstart durch — F17 hat
nichts an einem bestehenden, rollenvertrag-konformen Workflow gebrochen.

---

## AK9 — Rot, real: Rollenvertrag hält den Schritt vor dem Worker-Start an

`[Fakt]` Derselbe Plan, **eine** Änderung: `schritt-1-review.werkzeugsatz`
von `"lesend"` auf `"schreibend"` (Rolle `code-reviewer`, Worker `codex`
unverändert) — [nachweis/ws3b/L1.json](../../nachweis/ws3b/L1.json) selbst
bleibt unverändert, die Variante liegt nur im eingereichten Plan.

`[Fakt]` `POST /api/workflows` (`workflow_id: f17-ws3-ak9`) wird
**angenommen** (`{"workflowId":"f17-ws3-ak9","versionSequenz":1}`) —
`[Schlussfolgerung]` das bestätigt, dass die Rollenvertrag-Prüfung der
Werkzeugsatz-Art eine **Startzeit**-Prüfung ist (`loeseAusfuehrungsEingabenAuf`,
AK5), keine Planzeit-Prüfung (`validiereWorkflowDaten`, AK4 prüft nur
unbekannte Rollen) — genau die in F17 „Scope" beschriebene Aufteilung.

`[Fakt]` `POST /api/workflows/f17-ws3-ak9/starten`, real protokolliert:

```
16:37:05.425Z  → Aufruf
{"grund":"Schritt 'schritt-1-review': Rolle 'code-reviewer' erlaubt die
Werkzeugsatz-Art 'schreibend' nicht (Werkzeugsatz 'schreibend') — erlaubt: lesend"}
HTTP_STATUS:400
16:37:05.648Z  → Antwort
```

`[Fakt]` **223 ms** zwischen Aufruf und Antwort — die reale HTTP-Latenz
einer sofortigen Ablehnung, keine Prozessstart-Latenz (Vergleich: der
reale Codex-Start in AK8 brauchte 145 ms bis zur ersten Checkpoint-
Schreibung und danach 27,3 s bis zum `ERFOLGREICH`-Terminal). Der `grund`
nennt **Rolle** (`code-reviewer`) und **Werkzeugsatz-Art** (`schreibend`,
erlaubt `lesend`) — genau der AK9-Wortlaut.

`[Fakt]` **Kein Worker wurde gestartet:** `GET
/api/workflows/f17-ws3-ak9` danach zeigt `status: "OFFEN"`,
`aktiver_schritt_id: "schritt-1-review"` unverändert, beide Schritte
`lauf_id: null`. Die Versionskette
(`kontrollzustand/lineage-workflow-f17-ws3-ak9/checkpoints/`) hat genau
**eine** Datei (die Planeinreichung, 16:37:05.283Z) — kein zweiter
Checkpoint, weil der Startversuch vor jeder Zustandsänderung scheiterte.
Im Verzeichnis `kontrollzustand/` ist keine neue `lauf_id` entstanden (mit
`ls` gegen den Bestand vor und nach dem Aufruf gegengeprüft) — kein
Codex-Prozess, keine Laufakte, kein Rohstrom für diesen Versuch.

`[Fakt, F-272-Beachtung]` Dieser Rot-Fall lief gegen den **realen**
Produktionsendpunkt `POST /api/workflows/<id>/starten`, denselben, den AK8s
Grün-Fall real durchlaufen hat — nicht gegen einen Test-Double, Spy-Starter
oder eine isolierte Unit unter `scripts/check-f17-rollenvertrag.mjs`. Die
Ablehnung entsteht in `loeseAusfuehrungsEingabenAuf` selbst, an derselben
Stelle, die in AK8 denselben Schritt (mit `werkzeugsatz: "lesend"`) real
passieren ließ. Eine Sicherung, die denselben Ausgang unabhängig vom
geprüften Mechanismus erzeugt hätte (z. B. eine zusätzliche
`freigabe: ZWINGEND`-Klausel), ist an diesem Schritt nicht vorhanden — der
Plan trägt `freigabe: AUTOMATISCH`, unverändert zu AK8.

**AK9 erfüllt: JA.** Der Schritt startet nicht, der Workflow hält sichtbar
auf `OFFEN`/`schritt-1-review` an, der `grund` nennt Rolle und
Werkzeugsatz-Art, kein Worker-Prozess entsteht.

---

## AK10 — Durchsetzungsgrad `ERZWUNGEN`

`[Fakt]` `ARCHITECTURE.md` §8: „Eine neu behauptete Grenze trägt ihren
Durchsetzungsgrad. Ohne kalibrierten Rot- und Grün-Fall wird sie nicht
`ERZWUNGEN` genannt."

`[Schlussfolgerung]` Für die Rollenvertrag-Grenze liegen jetzt vor:

- **Grün-Fall real**, hier (AK8): eine rollenvertrag-konforme Besetzung
  (`code-reviewer`/`lesend`, `ausfuehrung`/`schreibend`) durchläuft den
  echten Leitstand-Start- und Fortsetzungspfad vollständig.
- **Rot-Fall real**, hier (AK9): dieselbe Besetzung mit einer verletzten
  Regel (`code-reviewer`/`schreibend`) wird real, am Produktionsendpunkt,
  vor jedem Worker-Start abgelehnt.
- Zusätzlich vier weitere, im WS-2-Gate kalibrierte Rot-Fälle
  (`code-reviewer` + schreibend, `ausfuehrung` + `worker: codex`,
  `code-reviewer` + fremdes `output_schema`, `qa` + irgendein
  `output_schema`) und ein Grün-Fall über
  `schemas/examples/kontrollzustand-workflow.valid.json` (F17 AK6).

`[Fakt]` Die Grenze ist damit mit kalibriertem Rot- **und** Grün-Fall
belegt und heißt nach §8 `ERZWUNGEN`, nicht `DEKLARIERT`. F-184 und F-323
sind in `state/findings.md` auf gelöst gesetzt, F-336 neu angelegt (siehe
unten).

---

## Was dieser Nachweis nicht abdeckt

`[Fakt]` **Das gerenderte Bild der Leitstand-Oberfläche** — wie in AK12
belegen die `GET`-Antworten die ausgelieferten Daten, nicht das Pixel; hier
zusätzlich real **kein Browser-Klick**, sondern `curl` gegen dieselben
Endpunkte (siehe Vorbemerkung). · **Eine reale Schreibwirkung von Schritt 2
in diesem konkreten Lauf** — die Ausführungsrolle hat begründet nichts
geschrieben, weil die Zieldatei bereits mit dem verlangten Inhalt existiert
(siehe Abschnitt „Schritt 2"); der tragende Schreib-Beleg bleibt
`features/F16/nachweis-ak12.md` Abschnitt D. · **Die Ablehnungen 7 und 8**
(Worker- bzw. Ausgabeschema-Allowlist) — die bleiben gate-geprüft aus
WS-2, hier nicht erneut real durchlaufen; nur Ablehnung 6
(Werkzeugsatz-Art) wurde in AK9 gezielt real ausgelöst, wie im Auftrag
verlangt. · **Ob Stefan denselben Ablauf im Browser reproduzieren würde**
— strukturell identisch (dieselben Endpunkte), aber nicht selbst
beobachtet.

---

## Findings

`[Fakt]` **F-184** (`TECH_DEBT`, P2) auf gelöst gesetzt: der Rollenvertrag
existiert (`src/rollen/`) und wird real durchgesetzt (dieser Nachweis).
**F-323** (`TECH_DEBT`, P2) auf gelöst gesetzt nach Weg (a): `DEKLARIERT`
+ Anzeige für `codex`-Werkzeugsätze, mit Querverweis auf den WS-2-Nachtrag
zur AK10-Unerreichbarkeit des alten F16-Rotfalls (kein Sicherheitsverlust,
nur Tiefenverteidigung statt kalibrierbarem Rotfall). **F-336** neu
angelegt (`PROCESS_IMPROVEMENT`, P3, offen): `features/F16/feature.md`
verweist im Abschnitt „Nicht-Ziele" auf einen F17-WS-2-Verbraucher einer
`besetzung`-Tabelle, den E-M3-3 (präzisiert) inzwischen ausgeschlossen hat.

## Gesamtergebnis

**AK8, AK9 und AK10 erfüllt: JA.** F17 WS-3 ist damit real abgeschlossen:
der bestehende zweistufige F16-Workflow läuft nach dem Rollenvertrag
unverändert durch (AK8), eine rollenvertragswidrige Variante desselben
Plans wird real und vor jedem Worker-Start abgehalten (AK9), und die
Rollenvertrag-Grenze trägt damit den Durchsetzungsgrad `ERZWUNGEN` (AK10).
