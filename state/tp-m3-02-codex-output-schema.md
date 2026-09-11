# Messauftrag S-M3-02 — `--output-schema` an `gpt-6-astra`

Stand dieser Fassung: 11.09.2026 (Messauftrag S-M3-02, Nachtrag zu
`state/tp-m3-01b-codex-sandbox.md` und `features/F16/nachweis-rotfall.md`)

Zweck: die einzige unbelegte Voraussetzung von F16 AK12 belegen oder
widerlegen — liefert das Modell `gpt-6-astra` unter `--output-schema` eine
schemakonforme LETZTE `agent_message`? Die Schemakonformität war bisher an
anderen Modellen belegt (`state/tp-m3-01b-codex-sandbox.md`), nicht an dem
Modell, das auf dieser Maschine real läuft: `gpt-5-codex` ist mit der
ChatGPT-Anmeldung dieser Maschine gesperrt (HTTP 400,
`features/F16/nachweis-rotfall.md` Lauf 1), `gpt-6-astra` lief real, aber
ohne `--output-schema`.

Kein Produktcode geändert, kein `src/`, kein `scripts/`. Das Messskript lag
außerhalb des Repositoriums und ist nicht eingecheckt. `~/.codex/config.toml`
nicht geöffnet und nicht geändert. Kontrollzustand und Rohstrom beider Läufe
lagen außerhalb des Repositoriums (F-319). Nicht committet, nicht gepusht.

---

## Ergebnis in einem Satz

**Schemakonform: ja.** Lauf A (mit `--output-schema`) lieferte als LETZTE
`agent_message` ein JSON-Objekt, das Feld für Feld gegen
`schemas/ergebnis-code-reviewer.schema.json` prüfbar ist und alle 14
geprüften Kriterien erfüllt. Lauf B (gleicher Prompt, gleiches Modell, ohne
das Flag) lieferte Fließtext mit Markdown — das Ergebnis von Lauf A kommt
also vom Flag und nicht vom Prompt. [Fakt]

---

## Werkzeugversionen und Startziel

- Codex CLI: `codex-cli 0.153.4` (`<codex.exe> --version`, vor dem Lauf real
  gemessen)
- Node: `v24.16.0`
- Natives Startziel (beide Läufe):
  `C:\Users\stefa\AppData\Roaming\npm\node_modules\@openai\codex\node_modules\@openai\codex-win32-x64\vendor\x86_64-pc-windows-msvc\bin\codex.exe`
- Modell (beide Läufe, deklariert): `gpt-6-astra`
- Arbeitsverzeichnis beider Läufe: `C:\Users\stefa\Projekte\ai-workforce`
  (der Prompt nennt eine reale Repo-Datei; die Sandbox steht fest auf
  `read-only`)
- Ablage außerhalb des Repositoriums:
  `C:\Users\stefa\AppData\Local\Temp\s-m3-02-1789121411874` (je Lauf
  `<name>-kontrollzustand/` und `<name>-roh/`)

## Durchführungsweg

Beide Läufe über `starteCodexGateway` aus `src/codex-gateway/index.ts`, mit
einem über `baueCodexAufruf` konstruierten Argv — kein von Hand
zusammengebautes Argv. Der Messwert gilt damit für denselben Pfad, den AK12
später benutzt. Zeitgrenze je Lauf 300 000 ms; beide Läufe blieben weit
darunter.

Prompt (identisch in beiden Läufen, Wortlaut):

```
Lies src/codex-gateway/types.ts und beurteile, ob die Typdefinitionen zu ihren Kopfkommentaren passen.
```

## Vorbedingung F-299 — an der Wirkung erkannt, nicht an der Datei

Verlangt war, die `[windows] sandbox = "unelevated"`-Voraussetzung nicht per
Dateilesung zu prüfen, sondern an der Wirkung. Beide Läufe tragen
`item.completed`-Ereignisse vom Typ `command_execution` mit `exit_code: 0`
und nicht leerer `aggregated_output` — in Lauf B las der erste dieser Befehle
`src/codex-gateway/types.ts` und gab den Dateikopf im Wortlaut aus. Befehle
liefen also real; die Sandbox hat nicht `blocked by policy` abgewiesen. Die
Voraussetzung war zur Messzeit erfüllt. [Fakt]

---

## Lauf A — mit `--output-schema` (der Messpunkt)

**Argv** (Ausgabe von `baueCodexAufruf`, unverändert an `starteCodexGateway`):

```json
["exec","--json","--sandbox","read-only","--model","gpt-6-astra","--output-schema","C:\\Users\\stefa\\Projekte\\ai-workforce\\schemas\\ergebnis-code-reviewer.schema.json","Lies src/codex-gateway/types.ts und beurteile, ob die Typdefinitionen zu ihren Kopfkommentaren passen."]
```

- `exitCode`: **0** · `beendigungsart`: `null`
- Dauer (Wanduhr, `starteCodexGateway`-Aufruf): **27 018 ms**
- `turnCompleted`: `true` · `turnFailed`: `false` · `unparsbareZeilen`: **0**
- `stdout`: 19 070 Zeichen · `stderr`: 39 Zeichen
  (`Reading additional input from stdin...`, F-307, bekannt)
- Ereignisfolge: `thread.started`, `turn.started`,
  `item.completed/agent_message`, `item.started`,
  `item.completed/command_execution`, `item.started`,
  `item.completed/command_execution`, `item.completed/agent_message`,
  `turn.completed`
- Zwei `command_execution`-Items, beide `exit_code: 0`, beide über
  `powershell.exe -Command` (`Get-Content AGENTS.md; Get-Content
  src/codex-gateway/types.ts` — `AGENTS.md` existiert nicht, der Befehl lief
  trotzdem; danach ein `rg`/`Get-Content`-Befehl über
  `src/claude-code-gateway/types.ts`)

**Zwei `agent_message`-Items im Strom** — die frühere trägt freien Text, die
spätere das JSON. Genau der von F-308 beschriebene Fall, hier auch MIT
`--output-schema` real beobachtet:

- `agent_message` #1 (69 Zeichen, freier Text): `Ich lese die Typdefinitionen
  und prüfe sie gegen ihre Kopfkommentare.`
- `agent_message` #2 (884 Zeichen): das JSON unten

Wer statt der letzten die erste oder eine beliebige `agent_message` liest,
bekommt in diesem Lauf Fließtext — das Flag verhindert die frühere
Freitext-Nachricht nicht. [Fakt]

**Letzte `agent_message`, im Wortlaut** (über `leseCodexEreignisse`):

```json
{
  "urteil": "BEREIT_NACH_KORREKTUR",
  "befunde": [
    {
      "schwere": "NIEDRIG",
      "fundstelle": "src/codex-gateway/types.ts:14–18",
      "zusammenfassung": "Der Kopfkommentar suggeriert nominale Typsicherheit, die AufrufTokens nicht besitzt.",
      "beleg": "Der importierte Typ ist in src/claude-code-gateway/types.ts als `type AufrufTokens = string[]` definiert. Ein separat deklarierter Alias für string[] wäre ebenfalls zuweisungskompatibel. Die Wiederverwendung verhindert doppelte Definitionen, schafft aber keine nominale Typidentität."
    }
  ],
  "empfehlung": "Die Aussage zur nominalen Kompatibilität durch eine Begründung zur zentralen Pflege ersetzen. Die übrigen Typdefinitionen passen zu ihren Kommentaren. Absolute Schema-Pfade und unveränderte Token-Weitergabe sind allerdings Verhaltensanforderungen; string | null und string[] erzwingen sie nicht."
}
```

**Prüfergebnis Feld für Feld** (mechanisch gegen
`schemas/ergebnis-code-reviewer.schema.json`):

| Kriterium | Ergebnis | Beobachtung |
|---|---|---|
| ist JSON-Objekt | JA | `JSON.parse` ohne Fehler, `typeof === 'object'`, kein Array |
| Pflichtfeld `urteil` | JA | `"BEREIT_NACH_KORREKTUR"` |
| Pflichtfeld `befunde` | JA | Array mit 1 Eintrag |
| Pflichtfeld `empfehlung` | JA | nicht leerer String |
| keine Zusatzschlüssel (Wurzel) | JA | genau `urteil`, `befunde`, `empfehlung` |
| `urteil` in {BEREIT, BEREIT_NACH_KORREKTUR, BLOCKIERT} | JA | `BEREIT_NACH_KORREKTUR` |
| `empfehlung` nicht leer | JA | `string`, Länge > 0 |
| `befunde` ist Array | JA | 1 Eintrag |
| `befunde[0]` ist Objekt | JA | — |
| `befunde[0].schwere` in {NIEDRIG, MITTEL, HOCH} | JA | `NIEDRIG` |
| `befunde[0].fundstelle` nicht leer | JA | `string`, Länge > 0 |
| `befunde[0].zusammenfassung` nicht leer | JA | `string`, Länge > 0 |
| `befunde[0].beleg` nicht leer | JA | `string`, Länge > 0 |
| `befunde[0]` keine Zusatzschlüssel | JA | genau die vier Pflichtfelder |

14 von 14 Kriterien erfüllt. Kein Fehler, keine Abweichung. [Fakt]

---

## Lauf B — ohne `--output-schema` (Kalibrierung)

**Argv**:

```json
["exec","--json","--sandbox","read-only","--model","gpt-6-astra","Lies src/codex-gateway/types.ts und beurteile, ob die Typdefinitionen zu ihren Kopfkommentaren passen."]
```

- `exitCode`: **0** · `beendigungsart`: `null`
- Dauer: **34 700 ms**
- `turnCompleted`: `true` · `turnFailed`: `false` · `unparsbareZeilen`: **0**
- `stdout`: 37 933 Zeichen · `stderr`: 39 Zeichen (gleiche stdin-Meldung)
- Vier `command_execution`-Items; drei mit `exit_code: 0`, eines (`rg --files
  -g AGENTS.md …`) mit `exit_code: 1` — kein Treffer, kein Sandbox-Abweis.
- Ebenfalls zwei `agent_message`-Items: #1 (95 Zeichen) freier Text, #2
  (1 483 Zeichen) die Antwort.

**Letzte `agent_message`, im Wortlaut**:

```
Überwiegend ja. Zwei Kommentaraussagen sind allerdings unzutreffend beziehungsweise unvollständig:

- **Keine nominale Typsicherheit:** Der [Dateikopf, Zeilen 14–18](C:/Users/stefa/Projekte/ai-workforce/src/codex-gateway/types.ts:14) begründet die Wiederverwendung von `AufrufTokens` mit nominaler Kompatibilität. Tatsächlich ist der Typ lediglich `string[]`. Ein separat definierter Alias wäre genauso zuweisungskompatibel. Die Wiederverwendung zentralisiert die Definition, schafft aber keine nominale Typidentität.

- **`unparsbareZeilen` ist weiter gefasst als dokumentiert:** Laut [Kommentar](C:/Users/stefa/Projekte/ai-workforce/src/codex-gateway/types.ts:42) zählt das Feld ungültiges JSON. Die [Implementierung](C:/Users/stefa/Projekte/ai-workforce/src/codex-gateway/index.ts:191) zählt auch gültiges JSON wie `null`, Zahlen oder Arrays, weil diese keine Ereignisobjekte sind. Der Kommentar sollte beide Fälle nennen.

Die übrigen Definitionen passen zu ihren Kommentaren: Pflichtfelder, Nullable-Felder, der nullstellige `schreiber` und die Wiederverwendung des Ergebnistyps sind entsprechend umgesetzt.

Einige Zusicherungen sind dabei **Laufzeitverträge, keine Typgarantien**: `string | null` garantiert keinen absoluten Pfad; `AufrufTokens` garantiert weder Herkunft aus `baueCodexAufruf` noch Unveränderlichkeit. Die Pfadbedingung wird im Aufrufbauer geprüft. Das ist stimmig, solange die Kommentare als Verhaltensbeschreibung verstanden werden.

Keine Dateien geändert.
```

**Prüfergebnis Feld für Feld**:

| Kriterium | Ergebnis | Beobachtung |
|---|---|---|
| ist JSON-Objekt | NEIN | `JSON.parse` warf: `Unexpected token 'Ü', "Überwiegen"... is not valid JSON` |

Alle weiteren Kriterien entfallen: ohne JSON-Objekt gibt es keine Felder zu
prüfen. Die Antwort ist Markdown-Fließtext mit Aufzählung und
Datei-Verweisen. [Fakt]

**Damit ist Lauf A aussagekräftig:** derselbe Prompt, dasselbe Modell,
derselbe Gateway-Pfad, einziger Unterschied `--output-schema` — und nur mit
dem Flag kommt JSON. Der Prompt allein erzeugt kein JSON. [Fakt]

---

## Urteil

**Schemakonform: ja.** `gpt-6-astra` liefert unter `--output-schema` über
`starteCodexGateway` eine LETZTE `agent_message`, die
`schemas/ergebnis-code-reviewer.schema.json` in allen geprüften Punkten
erfüllt, einschließlich `additionalProperties: false` auf beiden
Objektebenen. Die bisher unbelegte Voraussetzung von F16 AK12 ist damit an
dem Modell belegt, das auf dieser Maschine real verfügbar ist.

Geltungsbereich, damit die Aussage nicht überdehnt wird: **ein** Lauf, **ein**
Prompt, **ein** Schema, **ein** Modell, **eine** Maschine. Belegt ist, dass es
geht — nicht, dass es immer geht. Eine Wiederholungsrate ist nicht gemessen.
Ein Kern, der die letzte `agent_message` verarbeitet, braucht den Fehlerpfad
für nicht-schemakonforme Antworten weiterhin.

### Echte Blocker

Keine. Beide Läufe endeten mit Exit-Code 0, ohne Abbruch, ohne Zeitgrenze,
ohne unparsbare Zeilen, ohne Sandbox-Abweisung.

---

## Findings-Vorschläge

Ohne eigene IDs vergeben (nächste freie ID ist F-322; F-320 und F-321 sind
laut Auftrag WS-3a bereits vergeben).

1. **`--output-schema` wirkt bei `gpt-6-astra` real, belegt am
   Gateway-Pfad.** [Fakt] Lauf A dieses Berichts: Argv über
   `baueCodexAufruf`, Start über `starteCodexGateway`, letzte
   `agent_message` erfüllt `schemas/ergebnis-code-reviewer.schema.json`
   Feld für Feld (14/14). Die einzige unbelegte Voraussetzung von AK12
   entfällt. *Warum das festzuhalten ist:* die bisherige Belegkette stützte
   sich auf andere Modelle (`state/tp-m3-01b-codex-sandbox.md`); für das
   einzige hier verfügbare Modell war die Aussage eine Übertragung.

2. **Das Flag unterdrückt frühere Freitext-`agent_message`s NICHT — F-308
   gilt auch mit `--output-schema`.** [Fakt] Lauf A trug zwei
   `agent_message`-Items: #1 mit 69 Zeichen freiem Text („Ich lese die
   Typdefinitionen …"), #2 mit dem JSON. *Warum das festzuhalten ist:* F-308
   wurde ohne Schema-Flag beobachtet; die naheliegende Annahme, dass ein
   erzwungenes Ausgabeschema alle Nachrichten des Turns formt, ist hiermit
   real widerlegt. Jeder Leser MUSS die letzte nehmen — eine Implementierung,
   die die erste oder „irgendeine" liest, ist in genau diesem Lauf falsch.

3. **Die Gegenprobe ohne Flag ist nicht symbolisch, sondern trennt real.**
   [Fakt] Lauf B, gleicher Prompt und gleiches Modell, lieferte
   Markdown-Fließtext; `JSON.parse` warf an Zeichen 1. *Warum das
   festzuhalten ist:* ohne diese Gegenprobe wäre nicht auszuschließen
   gewesen, dass der Prompt („beurteile …") das Modell von sich aus in eine
   strukturierte Antwort zieht. Die Trennung ist gemessen, nicht angenommen.

4. **Kandidat für einen Kommentar-Nachtrag (nicht Teil dieses Auftrags):**
   Lauf B merkt an, dass der Kopfkommentar zu `unparsbareZeilen` in
   `src/codex-gateway/types.ts` nur „ungültiges JSON" nennt, während
   `leseCodexEreignisse` auch gültige JSON-Skalare und -Arrays mitzählt
   (`src/codex-gateway/index.ts`, Zweig nach dem `JSON.parse`). [Fakt, am
   Code nachgeprüft] *Warum das hier steht:* es ist ein Nebenbefund aus dem
   Messprompt, kein Messergebnis — und Produktcode wurde in diesem Auftrag
   bewusst nicht angefasst.

---

## Nachprüfbarkeit

Das Messskript lag unter dem Sitzungs-Zwischenablageordner
(`…\scratchpad\mess-s-m3-02.mjs`) und ist bewusst nicht eingecheckt. Die
Artefakte beider Läufe (Rohstrom, Laufakte, Kontrollzustand, je eine
`*-auswertung.json` mit vollständigem stdout/stderr) liegen unter
`C:\Users\stefa\AppData\Local\Temp\s-m3-02-1789121411874` und sind nicht
aufgeräumt worden — solange dieses Temp-Verzeichnis besteht, ist der Bericht
gegen die Rohdaten prüfbar, danach nur noch wiederholbar.
