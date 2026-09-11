# F16 AK12 — Nachweisprotokoll (zweistufiger Workflow, Codex → Claude Code)

Stand: 11.09.2026. Bedienung durch Stefan am 11.09.2026 über die
Leitstand-Oberfläche im Browser
(`LEITSTAND_STARTVORLAGE_PFAD=startvorlagen/ai-workforce.json`, F-326),
Verifikation lesend an den Artefakten unter `kontrollzustand/`, am
Rohstrom unter `kontrollzustand-roh/` und am `git status`. Reviewer-Pass
und QA-Pass mit frischem Kontext vor der Freigabe durchlaufen (F-046);
dieses Protokoll ist die überarbeitete Fassung nach beiden Pässen — die
dort gefundenen Fehlzuordnungen und zu starken Marker sind eingearbeitet,
nicht weggelassen.

**Was dieses Protokoll NICHT belegt, vorweg:** `[Fakt]` Die Artefakte
unterscheiden nicht, ob eine Bedienung aus der Oberfläche oder aus einem
`curl` gegen dieselben Endpunkte kam. Belegt ist hier — wie schon in
`features/F15/nachweis-ak10.md` — „über die Leitstand-Endpunkte, ohne
Umgehung des Automatenpfads"; `[Annahme]` dass die Klicks real im Browser
stattfanden, steht auf Stefans Aussage.

**Rohstrom-Belege sind nicht committet.** `[Fakt]` `kontrollzustand-roh/`
ist git-ignoriert (`.gitignore`, E-190). Wo unten ein Rohstrom zitiert
wird, steht der `rohstrom_referenz.inhalts_hash` aus der zugehörigen —
committeten — Laufakte dabei, damit die Aussage referenziell prüfbar
bleibt.

**Startvorlagen-Vorbedingung.** `[Fakt]` Der Lauf verlangt
`LEITSTAND_STARTVORLAGE_PFAD=startvorlagen/ai-workforce.json`. Der
Server-Default ist `startvorlagen/beispielprojekt.json` **ohne**
`worker.codex`-Block; ohne die gesetzte Umgebungsvariable greift kein
`worker.codex`-Block und ein `codex`-Schritt ist nicht auflösbar
(**F-326**, offen, `P1`).

---

## Aufbau

`[Fakt]` Workflow `f16-ws3b-ak12`, Auftrag
`89c10996-cbb2-4d56-94db-31f905bb6cd1` („F16 AK12 Nachweislauf",
Auftragsartefakt-`inhalts_hash`
`5755d5daa4df2074f6b05687eab12c2412ca5b015d576f7689399990b293141b`).
Der eingereichte Plan liegt unverändert unter
[nachweis/ws3b/L1.json](../../nachweis/ws3b/L1.json).

| Schritt | Rolle | Worker | Modell | Werkzeugsatz | `output_schema` | `freigabe` |
|---|---|---|---|---|---|---|
| `schritt-1-review` | `code-reviewer` | `codex` | `gpt-6-astra` | `lesend` | `ergebnis-code-reviewer` | `AUTOMATISCH` |
| `schritt-2-doku` | `ausfuehrung` | `claude-code` | `claude-sonnet-5` | `schreibend` | `null` | `AUTOMATISCH` |

`[Fakt]` Beide Schritte tragen `freigabe: AUTOMATISCH`. Das ist Absicht und
folgt **F-272**: ein `ZWINGEND` an Schritt 2 wäre eine zweite Sicherung, die
denselben Ausgang erzeugt wie der zu belegende Mechanismus — der Nachweis
„kein manueller Zwischenstart" wäre dann überdeterminiert und wertlos.

`[Fakt]` Beide Schritte teilen sich einen Auftragstext, weil `WORKFLOW_V0`
kein Feld für eine schrittindividuelle Anweisung kennt (**F-269**). Der
Auftragstext löst das über Selbstzuordnung: „kannst du keine Datei schreiben
(read-only Sandbox), bist du Stufe 1 … kannst du schreiben, bist du Stufe 2".

---

## Versionskette des Workflows

`kontrollzustand/lineage-workflow-f16-ws3b-ak12/checkpoints/`:

| Version | Zeit (UTC) | Workflow | Cursor | `schritt-1-review` | `schritt-2-doku` |
|---|---|---|---|---|---|
| 1 | 13:13:54.137 | OFFEN | `schritt-1-review` | OFFEN, `lauf_id: null` | OFFEN, `lauf_id: null` |
| 2 | 13:14:45.950 | **LAEUFT** | `schritt-1-review` | LAEUFT, `95d030d6…` | OFFEN, `lauf_id: null` |
| 3 | 13:15:13.331 | LAEUFT | **`schritt-2-doku`** | **ERFOLGREICH** | OFFEN, `lauf_id: null` |
| 4 | 13:15:13.360 | LAEUFT | `schritt-2-doku` | ERFOLGREICH | **LAEUFT, `df324f12…`** |
| 5 | 13:15:47.672 | ABGESCHLOSSEN | `null` | ERFOLGREICH | ERFOLGREICH |

---

## Belege

### A — Kein manueller Zwischenstart

| # | Prüfung | Marker | Ergebnis |
|---|---|---|---|
| A-1 | Genau **EIN** Übergang `OFFEN → LAEUFT` auf Workflow-Ebene (Version 2). Ein zweiter Aufruf des Workflow-Start-Endpunkts hätte eine zweite solche Version erzeugt; die Kette hat fünf Versionen und keine weitere. **Trägt allein weniger, als es klingt:** ein von Hand über das Startformular gestarteter Einzellauf erzeugt gar keinen Workflow-Übergang (in F15 AK10 real vorgekommen). Der tragende Beleg ist A-2, nicht diese Zeile. | `[Fakt]` | ⚠️ |
| A-2 | Zwischen Version 3 (Schritt 1 `ERFOLGREICH`, Cursor gewandert) und Version 4 (Schritt 2 `LAEUFT`) liegen **29 ms** (13:15:13.331 → 13:15:13.360). Das ist der Messwert. | `[Fakt]` | ✅ |
| A-2b | Dass in 29 ms keine menschliche Bedienung Platz hat, ist der Schluss daraus — nicht der Messwert selbst. | `[Schlussfolgerung]` | ✅ |
| A-3 | Zum Vergleich, als Kalibrierung derselben Kette: zwischen Version 1 (Plan eingereicht) und Version 2 (Start) liegen **51.813 ms** — das ist die Signatur einer echten menschlichen Bedienung. Der 29-ms-Sprung ist nachweislich von anderer Art. | `[Schlussfolgerung]` | ✅ |
| A-4 | Zwei getrennte reale Läufe mit eigenen `lauf_id`: `95d030d6-f282-464e-9be3-d500d3d7779c` und `df324f12-3fcf-4471-8f04-58ad4df0656d`. | `[Fakt]` | ✅ |
| A-5 | Eigene terminale Checkpoint-Kette je Lauf, je zwei Dateien: `run_prepared` (Sequenz 1) → `terminal` mit `ergebnis: ERFOLGREICH` (Sequenz 2), `vorgaenger_hash` real verkettet. Lauf 1: 13:14:45.993 → 13:15:13.307. Lauf 2: 13:15:14.210 → 13:15:47.648. | `[Fakt]` | ✅ |

### B — Schritt 1 lief real auf Codex

Laufakte `95d030d6…` (`lineage-laufakte-95d030d6…`, eigener
`inhalts_hash` `851cf841…`):

| # | Prüfung | Marker | Ergebnis |
|---|---|---|---|
| B-1 | `worker: "codex"` | `[Fakt]` | ✅ |
| B-2 | `modell_deklariert: "gpt-6-astra"`, `modell_beobachtet: null` — genau die in AK7/E-185 festgelegte Asymmetrie: Codex liefert keine beobachtbare Modellangabe, der Rang bleibt `DEKLARIERT`. | `[Fakt]` | ✅ |
| B-3 | `berechtigungskontext: "codex-sandbox-read-only"` | `[Fakt]` | ✅ |
| B-4 | `werkzeug_version_deklariert: "codex-cli 0.153.4"` | `[Fakt]` | ✅ |
| B-5 | Die Argv-Tokens im Rohstrom sind exakt die von AK1/AK2 erlaubte Grammatik: `exec`, `--json`, `--sandbox read-only`, `--model gpt-6-astra`, `--output-schema <abs. Pfad>`, genau ein abschließendes Prompt-Token. `--sandbox read-only` ist real am Argv gepinnt (F-290). | `[Fakt]` | ✅ |
| B-6 | `exitCode: 0`, `startfehler: null`, `beendigungsart: null` — regulärer Abschluss, kein Abbruch, kein Timeout. | `[Fakt]` | ✅ |
| B-7 | Terminalmarke `ERFOLGREICH` (`kontrollzustand/95d030d6…/checkpoints/2-…json`). | `[Fakt]` | ✅ |
| B-8 | Dass dabei der **Codex-Zweig** des Result Evaluators lief und nicht `leseErgebnisobjekt`, hält **kein Artefakt** fest. Es folgt aus dem Code (AK8 verzweigt vor dem Aufruf) plus F-283 (`leseErgebnisobjekt` scheitert an Codex-JSONL immer) — ein Rückschluss, kein Beobachtungswert. | `[Schlussfolgerung]` | ⚠️ |
| B-9 | Der Lauf hat real gelesen: zwei `command_execution`-Ereignisse im Rohstrom, beide `powershell.exe` — `Get-Content` auf `AGENTS.md` und `src/codex-gateway/codex-argv-allowlist.ts` (`exit_code: 0`) sowie ein `rg --files` (`exit_code: 1`, kein Treffer). Der lesende Schritt war also kein Leerlauf. | `[Fakt]` | ✅ |

### C — Das Ergebnis von Schritt 1 ist schemakonform

`[Fakt]` Der Rohstrom von `95d030d6…`
(`rohstrom_referenz.inhalts_hash`
`6d0003d9575f126d37b8a341ac15e8a9db9d6f2f16c2db0d200ecc54fa53be97`)
enthält **neun** JSONL-Zeilen, alle neun parsbar — **eigene Zählung am
Rohstrom**, kein nachschlagbarer Feldwert: `unparsbare_zeilen` ist ein
Ergebnis von `leseCodexEreignisse` (AK3) und wird in keinem Artefakt
persistiert. Darunter **zwei** `agent_message`-Ereignisse:

1. `item_0`: `"Ich führe Stufe 1 aus und prüfe die Token-Grammatik der Allowlist lesend.\n"` — **Freitext, nicht schemakonform.**
2. `item_3`: `{"urteil":"BEREIT","befunde":[],"empfehlung":"Keine Korrektur erforderlich: Die Allowlist prüft jedes Token entsprechend seiner Grammatikposition. Unbekannte Schalter werden abgelehnt; Werte und das abschließende Prompt-Token werden anhand expliziter Regeln geprüft."}`

`[Fakt]` **Nur die letzte `agent_message` zählt.** `--output-schema`
unterdrückt frühere Freitext-`agent_message`s nicht — das ist das
**F-308**-Muster. Einzige belastbare Vorinstanz ist Lauf A in
`state/tp-m3-02-codex-output-schema.md` (zwei `agent_message`-Items, #1
freier Text, #2 das schemakonforme JSON), so auch im Beleg-Nachtrag zu
F-308 festgehalten. AK8 ist genau darauf gebaut: die Prüfung
`ergebnis_nicht_schemakonform` liest die **letzte** `agent_message`.
Dieser Lauf ist damit kein Sonderfall, sondern die **zweite** reale
Instanz desselben, vorab beschriebenen Musters.

`[Fakt, entlastend]` **Nicht** hierher gehört Lauf 3 aus
`features/F16/nachweis-rotfall.md`: der lief ausdrücklich **ohne**
`--output-schema` („`turn.completed`, Exit 0, kein `--output-schema`") und
verzeichnet keine frühere Freitext-`agent_message`. Er ist keine Instanz
dieses Musters und wird hier nicht als solche geführt. Die Fehlzuordnung
stand im Challenger-Briefing zu diesem Nachweis, wurde im Reviewer-Pass
gefunden und vor dem Commit korrigiert — festgehalten als **F-328**
(`P3`, behoben), damit die Korrektur selbst nachlesbar bleibt und nicht
nur ihr Ergebnis.

`[Fakt]` Die letzte `agent_message` erfüllt
`schemas/ergebnis-code-reviewer.schema.json` vollständig, einzeln geprüft:

| Schemaregel | Beobachtung |
|---|---|
| `required: [urteil, befunde, empfehlung]` | alle drei vorhanden |
| `additionalProperties: false` (Wurzel) | Schlüsselmenge exakt `{befunde, empfehlung, urteil}`, kein Zusatzfeld |
| `urteil` ∈ `{BEREIT, BEREIT_NACH_KORREKTUR, BLOCKIERT}` | `"BEREIT"` |
| `befunde`: Array, leer zulässig | `[]` (Länge 0) — bedeutet „kein Befund", nicht „nicht geprüft" |
| `empfehlung`: String, `minLength: 1` | nicht-leerer String |

`[Schlussfolgerung]` Damit ist der Vollpfad `output_schema` → aufgelöstes
Schema → `--output-schema` am Argv → schemakonforme letzte
`agent_message` → `ERFOLGREICH` real einmal durchlaufen, nicht nur
gate-geprüft.

**Überdeterminiert — F-272-Klasse in eigener Sache, ausdrücklich benannt:**
`[Fakt]` Der Auftragstext verlangt die Form selbst: „Antworte AUSSCHLIESSLICH
mit einem einzigen JSON-Objekt mit den Feldern urteil …, befunde … und
empfehlung (String). Kein Freitext vor oder nach dem JSON-Objekt, keine
Codebloecke." Für die schemakonforme letzte `agent_message` gibt es in
diesem Lauf also **zwei** hinreichende Ursachen: den Schalter
`--output-schema` und die Prompt-Anweisung.

`[Fakt, entlastend]` Für den AK12-**Wortlaut** („schemakonformes Ergebnis
in der letzten `agent_message`") ist das unerheblich — verlangt ist der
Ausgang, und der ist belegt.

`[offene Unsicherheit]` Was dieser Lauf **nicht** isoliert, ist die
**Wirksamkeit des Schalters**: hätte `--output-schema` hier nichts bewirkt,
sähe das Ergebnis identisch aus. Der Wirksamkeitsbeleg für
`--output-schema` liegt nicht hier, sondern in
`state/tp-m3-02-codex-output-schema.md`. Festgehalten als **F-329**
(`P2`, offen): eine gezielte Prüfung des Schalters bräuchte einen
neutralen Auftragstext, der die JSON-Form nicht selbst verlangt.

### D — Schritt 2 lief real auf Claude Code und hat geschrieben

Laufakte `df324f12…` (eigener `inhalts_hash` `7504cd01…`):

| # | Prüfung | Marker | Ergebnis |
|---|---|---|---|
| D-1 | **Kein `worker`-Feld in der Laufakte** — während der Plan (`nachweis/ws3b/L1.json`) und alle fünf Workflow-Checkpoints für `schritt-2-doku` sehr wohl `"worker": "claude-code"` führen. Das Feld ist also im Plandatum gesetzt und wird vom Claude-Code-Pfad nicht in die Laufakte geschrieben. Nach AK4 bedeutet fehlendes `worker` genau `claude-code`. Der additive Charakter des Feldes ist damit real belegt und nicht nur behauptet: der Claude-Code-Pfad schreibt es nicht, der Codex-Pfad schon. | `[Fakt]` | ✅ |
| D-2 | `modell_beobachtet: "claude-sonnet-5"` — **beobachtet**, nicht nur deklariert, im Gegensatz zu B-2. Die beiden Laufakten desselben Workflows zeigen die Worker-Asymmetrie direkt nebeneinander. | `[Fakt]` | ✅ |
| D-3 | `berechtigungskontext: "profil-standard"` (nicht `codex-sandbox-read-only`) und `werkzeug_version_deklariert: "2.1.258 (Claude Code)"` — die worker-abhängige Auflösung aus AK11 hat real gegriffen. | `[Fakt]` | ✅ |
| D-4 | Terminalmarke `ERFOLGREICH` (13:15:47.648). | `[Fakt]` | ✅ |
| D-5 | Reale Schreibwirkung auf der Platte: `features/F16/nachweis-ak12-analyse.md` existiert, erzeugt von diesem Schritt. Sie wird mit **diesem** Commit mitgeführt — dass sie darin wirklich gestaged ist, ist vor dem Commit mit `git status` gegenzuprüfen (OneDrive-Falle, `CLAUDE.md`). | `[Fakt]` | ✅ |
| D-6 | Keine weitere Datei geändert: der Auftragstext verlangte „Ändere keine andere Datei", und `git status` weist außer den Kontrollzustands- und Nachweisartefakten dieses Laufs keine Produktänderung aus. **Grenze, ausdrücklich:** `git status` belegt nur, dass keine weitere *getrackte* Datei im Repo geändert wurde. Schreibvorgänge außerhalb des Repos oder in git-ignorierten Pfaden schließt es nicht aus; die Laufakte hält den Werkzeugsatz eines Laufs nicht fest (**F-271**). | `[Fakt]` | ⚠️ |

### E — Lineage zwischen den Schritten

| # | Prüfung | Marker | Ergebnis |
|---|---|---|---|
| E-1 | Beide Kontextpakete tragen den Auftrag: `artefakt:auftrag-89c10996…`, `inhalts_hash` `5755d5da…`, in beiden identisch. | `[Fakt]` | ✅ |
| E-2 | Das Kontextpaket von Schritt 2 trägt **zusätzlich** `artefakt:laufakte-95d030d6-f282-464e-9be3-d500d3d7779c` mit `inhalts_hash` `851cf84181502de844065244c4fbebc090e7d35b611b826e4b986030489e0c9e` — bytegleich mit dem `inhalts_hash` der Laufakte von Schritt 1. Die Lineage-Kette ist per Hash geschlossen, nicht per Pfadverweis. | `[Fakt]` | ✅ |
| E-3 | `rohstrom_referenz.inhalts_hash` der Laufakte von Schritt 1 (`6d0003d9575f126d37b8a341ac15e8a9db9d6f2f16c2db0d200ecc54fa53be97`) ist der real nachgerechnete SHA-256 der Datei `kontrollzustand-roh/95d030d6…/rohstrom.json` (17.486 Bytes). Bytegleichheit gegengeprüft (QA-Pass, unabhängig nachgerechnet). Die Aussage bleibt referenziell prüfbar, obwohl die Datei selbst nicht committet ist (E-190). | `[Fakt]` | ✅ |

**Präzisierung zu E-3, damit es niemand falsch zitiert:**
`[Fakt]` `6d0003d9…` ist der `rohstrom_referenz.inhalts_hash` **innerhalb**
der Laufakte, nicht der `inhalts_hash` der Laufakte selbst — der ist
`851cf841…` (E-2). Die beiden Hashes haben verschiedene Gegenstände:
`851cf841…` deckt das Laufakte-Artefakt, `6d0003d9…` die Rohstromdatei.

---

## F-270 ausdrücklich als Nicht-Aussage

`[Fakt]` Schritt 2 hatte das **Ergebnis** von Schritt 1 nicht vorliegen. Es
gibt kein Ergebnis-Artefakt zwischen Schritten (**F-270**, in der
F16-Feature-Akte ausdrücklich als Nicht-Ziel geführt). Was Schritt 2 bekam,
ist nach E-2 die **Laufakte** von Schritt 1 — also deren Metadaten
(`lauf_id`, `worker`, `modell_deklariert`, `berechtigungskontext`,
Rohstrom-Referenz), **nicht** der Text des Reviewer-Urteils.

`[Fakt]` Der Auftragstext hat das dem Schritt ausdrücklich gesagt: „Du hast
das Ergebnis von Stufe 1 NICHT vorliegen (F-270 …); schreibe aus eigener
Lektuere und behaupte nicht, ein Reviewer-Urteil zu zitieren."

`[Fakt]` Schritt 2 hat sich daran gehalten.
`features/F16/nachweis-ak12-analyse.md` beginnt mit „Eigene Lektüre von
`src/codex-gateway/codex-argv-allowlist.ts` … ohne Bezug auf ein
Reviewer-Urteil aus einem vorherigen Schritt (F-270 …)" und zitiert an
keiner Stelle ein Urteil, einen Befund oder eine Empfehlung aus Schritt 1.

`[Fakt]` **Zwei Präzisierungen, die die Aussage schwächer und richtiger
machen.** Erstens: die übergebene Laufakte trägt `rohstrom_referenz.pfad`
(`kontrollzustand-roh\95d030d6…\rohstrom.json`) — also einen **Pfad auf die
Datei, die das Reviewer-Urteil enthält**, und Schritt 2 hatte einen
schreibenden Werkzeugsatz im selben Arbeitsverzeichnis. Genau das ist
F-270s Wortlaut in F15: „trägt kein Ergebnis, **nur einen Pfad**". Belegt
ist deshalb nicht „hätte nicht herankommen können", sondern: es gab kein
Ergebnis-Artefakt, und im Ergebnisdokument steht kein Zitat.

`[offene Unsicherheit]` Zweitens, Asymmetrie der Beobachtbarkeit: für
Schritt 1 liegt der real übergebene Prompt im Rohstrom (`tokens`), für
Schritt 2 **nicht** — der Claude-Code-Rohstrom trägt nur das Ergebnisobjekt
(`num_turns`, `is_error`, `permission_denials`), kein `tokens` und kein
Transkript (**F-271**). Was Schritt 2 im Prompt real sah, ist
artefaktseitig nicht rekonstruierbar; belegt ist der *geplante*
Paketinhalt (E-2) plus das Ergebnisdokument.

`[Schlussfolgerung]` Dieser Lauf belegt also die **Mechanik** der Kette
(ein Startaufruf, zwei Läufe, Lineage per Hash), **nicht** eine inhaltliche
Übergabe. Wer aus diesem Protokoll „die Workforce reicht Reviewer-Ergebnisse
an den nächsten Schritt weiter" liest, liest etwas hinein, was hier
nachweislich nicht stattgefunden hat und in F16 auch nicht gebaut wurde.

`[offene Unsicherheit]` Dass die beiden Dokumente inhaltlich übereinstimmen
(beide kommen zum Schluss, die Allowlist prüfe gegen eine geschlossene
Grammatik), ist kein Beleg für eine Übergabe — beide haben dieselbe Datei
gelesen. Es ist aber auch kein Beleg für Unabhängigkeit im starken Sinn:
dass zwei Modelle dieselbe Quelle gleich lesen, ist der Normalfall, nicht
eine Bestätigung.

---

## Leitstand-Anzeige

`[Fakt]` **Belegt an der realen Serverantwort, nicht am Quelltext.** Beide
Detailansichten wurden real über `GET /api/laeufe/<laufId>` abgerufen —
also über genau den Endpunkt, aus dem das Laufdetail seinen
Laufakte-Block speist. Wörtlich:

```
GET /api/laeufe/95d030d6-f282-464e-9be3-d500d3d7779c → laufakte:
{"status":"ok","modellBeobachtet":null,"beobachtungsbasisVollstaendig":true,
 "arbeitsverzeichnisPfad":"C:\\Users\\stefa\\Projekte\\ai-workforce",
 "worker":"codex","modellDeklariert":"gpt-6-astra"}

GET /api/laeufe/df324f12-3fcf-4471-8f04-58ad4df0656d → laufakte:
{"status":"ok","modellBeobachtet":"claude-sonnet-5","beobachtungsbasisVollstaendig":true,
 "arbeitsverzeichnisPfad":"C:\\Users\\stefa\\Projekte\\ai-workforce",
 "worker":"claude-code","modellDeklariert":null}
```

`[Fakt]` Beide Felder sind in beiden Antworten real vorhanden und tragen
die richtigen Werte. Die Antworten sind mit den committeten Laufakten
gegengeprüft und stimmen feldweise überein — auch in der Asymmetrie:
Lauf 1 `codex`/`gpt-6-astra` deklariert bei `modellBeobachtet: null`,
Lauf 2 umgekehrt `modellBeobachtet: "claude-sonnet-5"` bei
`modellDeklariert: null`. Für Lauf 2 sind `worker: "claude-code"` und
`modellDeklariert: null` die nach **AK4** vorgesehenen Werte für eine
Laufakte ohne diese Felder — die Projektion rät nichts, sie setzt den
definierten Default.

`[Fakt]` **Zusätzlicher, unabhängiger Lineage-Beleg über die API.**
Dieselbe zweite Antwort trägt unter `kontextpaket.elemente`:

```
{"inhalts_hash":"851cf84181502de844065244c4fbebc090e7d35b611b826e4b986030489e0c9e",
 "pfad":"artefakt:laufakte-95d030d6-f282-464e-9be3-d500d3d7779c"}
```

Dieser Hash ist identisch mit dem `inhalts_hash` der Laufakte von
Schritt 1. Die `vorgaengerLaufId`-Kette aus E-2 ist damit **zweimal
unabhängig** belegt: einmal an der Datei im Arbeitsbaum, einmal an der
Serverantwort. Ein Leser muss dafür nicht mehr das Dateisystem bemühen.

`[Fakt]` Damit ist die AK12-Klausel „das Leitstand-Laufdetail zeigt
`worker` und `modell_deklariert`" **belegt** — nicht mehr nur am
Quelltext von `renderLaufakte` und nicht mehr auf Aussage des Bedieners.
Der laufende Server liefert beide Felder für beide Läufe korrekt aus.
**F-327 ist für diesen Lauf geschlossen**; die allgemeine Klasse (die
übrigen Zeilen des Laufakte-Blocks und die weiteren `render`-Funktionen
in `app.js` ohne gemeinsames Gate) bleibt unverändert vermerkt.

`[offene Unsicherheit]` Was auch diese Antworten nicht leisten: sie
belegen die Daten, die das Laufdetail rendert, nicht das gerenderte Pixel.
Zwischen Serverantwort und Bildschirm liegt `renderLaufakte`, für das
Fall (f) des Gates ausdrücklich nur Regressionsschutz und „KEIN
AK12-BELEG (F-272)" beansprucht. Diese letzte Spanne bleibt durch
Quelltextprüfung plus Aussage des Bedieners gedeckt — sie ist jetzt aber
eine Spanne von einer Funktion, nicht von der ganzen Kette.

---

## Gesamtergebnis

**AK12 erfüllt: JA**, in seinem Wortlaut und mit den oben benannten Grenzen:

- **Zweistufiger Workflow über den Leitstand, ohne manuellen
  Zwischenstart** — genau ein `OFFEN → LAEUFT`-Übergang, 29 ms zwischen
  Cursor-Wanderung und Start von Schritt 2, gegen 51,8 s für die eine echte
  Bedienung am Anfang (A-1 bis A-5).
- **Codex `code-reviewer`, lesend, mit schemakonformem Ergebnis in der
  letzten `agent_message`** — `worker: codex`, `gpt-6-astra` deklariert,
  `codex-sandbox-read-only`, Argv-Grammatik eingehalten,
  `ergebnis-code-reviewer.schema.json` feldweise erfüllt, F-308-Muster
  zum zweiten Mal real beobachtet (B, C).
- **Claude Code `ausfuehrung`, schreibend** — fehlendes `worker` = 
  `claude-code` nach AK4, `modell_beobachtet` real gefüllt,
  `profil-standard`, reale neue Datei auf der Platte (D).
- **Lineage per Hash geschlossen** (E).
- **Ohne die Sicherung, die den Nachweis entwertet hätte** — beide Schritte
  `AUTOMATISCH`, F-272 beachtet.

- **Das Leitstand-Laufdetail zeigt `worker` und `modell_deklariert`** —
  belegt an den realen Antworten von `GET /api/laeufe/<laufId>` für beide
  Läufe, samt einem zweiten, unabhängigen Lineage-Beleg über
  `kontextpaket.elemente`. F-327 für diesen Lauf geschlossen.

**Verbleibende Spanne, nicht verschwiegen:** `[offene Unsicherheit]` Zwischen
Serverantwort und Bildschirm liegt `renderLaufakte`, gedeckt durch
Quelltextprüfung und Aussage des Bedieners. Ein Oberflächennachweis nach dem
Muster von F15 AK8 würde auch diese Spanne schließen; für den AK12-Wortlaut
ist er nach der API-Belegung nicht mehr erforderlich.

### Was dieser Nachweis nicht abdeckt

`[Fakt]` **Das gerenderte Bild der Leitstand-Anzeige** — die beiden
`GET /api/laeufe/<laufId>`-Antworten belegen die ausgelieferten Daten,
nicht das Pixel; die Spanne `renderLaufakte` bleibt quelltextgeprüft
(siehe „Leitstand-Anzeige"). · **Die Wirksamkeit von `--output-schema`**
— in diesem Lauf durch die Prompt-Anweisung überdeterminiert, siehe
Abschnitt C (**F-329**). · **Dass Schritt 1
nichts geschrieben hat** — hier nur konstruktiv belegt (Sandbox am Argv,
`git status`), byteweise gegengeprüft ist das in AK9
(`features/F16/nachweis-rotfall.md`), nicht hier. · **Dass `gpt-6-astra`
real geantwortet hat** — `modell_beobachtet` ist `null`, der Rang der
Modellangabe ist `DEKLARIERT` (E-185); die Spalte „Modell" in der
Aufbau-Tabelle ist Plandatum, keine Beobachtung.

`[Fakt]` Ferner nicht abgedeckt: ein `ZWINGEND`-Halt in einer
Worker-gemischten Kette · ein Codex-Schritt, der `BLOCKIERT` oder
`BEREIT_NACH_KORREKTUR` urteilt · ein nicht-schemakonformes letztes
`agent_message` im Workflow-Pfad (`ergebnis_nicht_schemakonform` ist
gate-geprüft, hier real nicht eingetreten) · Abbruch oder Timeout eines
Codex-Schritts im Workflow · Ketten mit mehr als einem automatischen
Sprung · `schritte[].eingaben` mit Inhalt (beide Schritte trugen `[]`) ·
ein Codex-Schritt an zweiter Stelle. Diese Fälle sind gate-geprüft, nicht
real begangen.

### Offene Findings mit Bezug zu diesem Lauf

`[Fakt]` **F-326** (`P1`, offen) — der Lauf verlangt
`LEITSTAND_STARTVORLAGE_PFAD`; der Server-Default trägt keinen
`worker.codex`-Block. **F-308** (`P1`, offen) — `--output-schema`
unterdrückt frühere Freitext-`agent_message`s nicht. **F-269** (ein
Workflow-Schritt hat keine eigene Anweisung), **F-270** (kein
Ergebnis-Artefakt zwischen Schritten), **F-323** (die reale Schreibgrenze
ist die Sandbox, nicht der deklarierte Werkzeugsatz) — alle im Aufbau
dieses Laufs sichtbar geworden, keines davon hier nachgebessert.

`[Fakt]` Aus diesem Nachweis neu hervorgegangen: **F-328** (`P3`, behoben —
falsches F-308-Zitat im Briefing, vor dem Commit korrigiert), **F-329**
(`P2`, offen — dieser Lauf isoliert `--output-schema` nicht), **F-330**
(`P3`, offen — `docs/STATUS.md` bildet den Feature-Stand nicht mehr ab).
**F-327** ist für diesen Lauf geschlossen, als Klasse weiterhin teilweise
adressiert.

`[Fakt]` Kein offenes `P0`-Finding im Repo (`state/findings.md`,
gegengeprüft) — die Fortführungsbedingung aus E-M2-9 ist eingehalten.
