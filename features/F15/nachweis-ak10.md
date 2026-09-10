# F15 AK10 — Nachweisprotokoll (Schritt-Automat, ZWINGEND-Halt, Abbruch)

Stand: 10.09.2026. Bedienung durch Stefan am 10.09.2026 über die
Leitstand-Oberfläche im Browser (`LEITSTAND_STARTVORLAGE_PFAD=startvorlagen/ai-workforce.json`),
Verifikation lesend an den Artefakten unter `kontrollzustand/` und am
`git diff`. Reviewer-Pass und QA-Pass mit frischem Kontext vor der Freigabe
durchlaufen; dieses Protokoll ist die überarbeitete Fassung nach dem
QA-Pass.

**Was dieses Protokoll NICHT belegt, vorweg:** Die Artefakte unterscheiden
nicht, ob eine Bedienung aus der Oberfläche oder aus einem `curl` gegen
dieselben Endpunkte kam. `herkunft.erzeuger: 'mensch'` ist ein Etikett, das
der Server jeder Anfrage an den Freigabe-/Stopp-Endpunkt gibt, keine
Authentifizierung. Belegt ist hier also „über die Leitstand-Endpunkte, ohne
Umgehung des Automatenpfads" — dass die Klicks real in der Oberfläche
stattfanden, steht auf Stefans Aussage. Dass die Oberfläche diese Bedienungen
kann, ist eigenständig in `nachweis/f15-ws3b-oberflaechennachweis.md`
belegt (AK8).

**Rohstrom-Belege sind nicht committet.** `kontrollzustand-roh/` ist
git-ignoriert (`.gitignore`, E-190). Wo unten ein Rohstrom zitiert wird,
steht der `rohstrom_referenz.inhalts_hash` aus der zugehörigen — committeten
— Laufakte dabei. Damit bleibt die Aussage für einen späteren Leser
referenziell prüfbar, auch wenn die Datei selbst nur auf Stefans Platte
liegt.

## Warum drei Läufe

AK10 verlangt dreierlei in einem Satz: „ein zweistufiger Workflow (lesender
Schritt, dann schreibender Schritt) läuft ohne manuellen Zwischenstart; ein
`ZWINGEND`-Halt tritt real ein; ein Abbruch nach F14 wirkt auf den aktiven
Schritt."

Die ersten beiden Teilsätze schließen sich in EINEM Lauf aus — ein
`ZWINGEND`-Halt IST der manuelle Zwischenschritt, dessen Abwesenheit Satz 1
belegen soll. Der dritte beendet den Lauf, in dem er stattfindet. AK10 braucht
deshalb drei Läufe. Als Finding festgehalten: **F-268** (Muster: F13s AK8 war
dieselbe Klasse).

Die Pläne liegen unter [nachweis/ws4/](../../nachweis/ws4/) — `L1.json`,
`L2.json`, `L3.json`, unverändert so eingereicht.

Zwei Aufträge statt einem, weil ein Workflow-Schritt keine eigene Anweisung
kennt (`WORKFLOW_V0` hat kein Feld dafür; alle Schritte eines Workflows
bekommen denselben `auftragstext`, und ein Schritt sieht seinen Workflow
nicht). L1s Schritt 2 („schreibe die Analyse") und L2s Schritt 2 („ändere die
eine Zeile") sind aus einem gemeinsamen Auftragstext nicht unterscheidbar.
Festgehalten als **F-269**.

| Auftrag | auftragId | benutzt von |
|---|---|---|
| Analyse + Dokumentation | `5efe706f-2e88-43c7-a877-c85ef59c9e42` | L1 |
| F-243 beheben (eine Zeile) | `6eeed289-074f-4427-99d7-8b52cdffc768` | L2, L3 |

---

## L1 — Satz 1: kein manueller Zwischenstart

**Ziel:** Ein zweistufiger Workflow (`lesend` → `schreibend`) läuft nach EINEM
Startaufruf vollständig durch. Wirkung: die Datei
`features/F15/nachweis-ak10-analyse.md`.

**Plan:** beide Schritte `freigabe: AUTOMATISCH` — L1 enthält bewusst KEINEN
`ZWINGEND`-Schritt, sonst bewiese der Lauf das Gegenteil dessen, wofür er
gebaut ist.

**Bedienung:** genau ein Klick auf „Starten" (`f15-ws4-l1`), danach nichts.

### Belege

Versionskette `kontrollzustand/lineage-workflow-f15-ws4-l1/checkpoints/`:

| Version | Zeit | Workflow | Cursor | schritt-1-analyse | schritt-2-doku |
|---|---|---|---|---|---|
| 1 | 17:35:50.828 | OFFEN | schritt-1-analyse | OFFEN, `lauf_id: null` | OFFEN, `lauf_id: null` |
| 2 | 17:48:27.555 | LAEUFT | schritt-1-analyse | LAEUFT, `1c971e35…` | OFFEN, `lauf_id: null` |
| 3 | 17:49:08.166 | LAEUFT | **schritt-2-doku** | ERFOLGREICH | OFFEN, `lauf_id: null` |
| 4 | 17:49:08.195 | LAEUFT | schritt-2-doku | ERFOLGREICH | **LAEUFT, `6c471237…`** |
| 5 | 17:49:34.859 | ABGESCHLOSSEN | null | ERFOLGREICH | ERFOLGREICH |

| # | Prüfung | Ergebnis |
|---|---|---|
| L1-1 | Zwischen Version 3 (Schritt 1 fertig, Cursor gewandert) und Version 4 (Schritt 2 läuft) liegen **29 ms** — dazwischen passt keine menschliche Bedienung. Der zweite Lauf entstand ohne zweiten `POST .../starten`. | ✅ |
| L1-2 | Genau EIN Übergang `OFFEN → LAEUFT` auf Workflow-Ebene (Version 2). Ein zweiter Startaufruf hätte eine zweite solche Version erzeugt; es gibt keine. | ✅ |
| L1-3 | Schritt 2 trägt eine eigene `lauf_id` (`6c471237-55a7-49a9-8390-60a3479a8dfb`), verschieden von der von Schritt 1 (`1c971e35-455c-4167-8b63-0a9a8181255c`) | ✅ |
| L1-4 | Eigene terminale Checkpoint-Kette je Lauf: `kontrollzustand/1c971e35…/checkpoints/` und `kontrollzustand/6c471237…/checkpoints/` — je `1-…json` Wirkungsmarke `run_prepared`, `2-…json` Wirkungsmarke `terminal` mit `ergebnis: ERFOLGREICH` | ✅ |
| L1-5 | `vorgaengerLaufId`-Kette real: das Kontextpaket von Schritt 2 (`lineage-kontextpaket-6c471237…`) trägt das Element `artefakt:laufakte-1c971e35-455c-4167-8b63-0a9a8181255c` | ✅ |
| L1-6 | Hash-Abgleich statt Verweis: `inhalts_hash` dieses Kontextpaket-Elements = `eb32d7c5a88bbb0228ce421696c06ff831567e03e6501f18cc744f7f7ea81bcf`, identisch mit dem `inhalts_hash` der Laufakte von Schritt 1 — reale Bytegleichheit. Dieser Hash kommt repo-weit in genau diesen zwei Dateien vor (QA-Pass, gegengeprüft). | ✅ |
| L1-7 | Der Werkzeugsatz-Wechsel ist geplant und im Artefakt festgehalten: Schritt 1 `werkzeugsatz: lesend`, Schritt 2 `werkzeugsatz: schreibend` | ✅ |
| L1-8 | Die Wirkung existiert real: `features/F15/nachweis-ak10-analyse.md` | ✅ |
| L1-9 | Rohstrom von Schritt 2 (`rohstrom_referenz.inhalts_hash` der Laufakte `6c471237…`: `fd0c5ae4165f21c1a079bf873c2d81e9e82b45aaffcdc8c7e242606a4e385a7c`): `is_error: false`, `permission_denials: []` — der schreibende Schritt lief ohne Verweigerung | ✅ |

**Ergebnis: Satz 1 belegt.**

---

## L2 — Satz 2: ein ZWINGEND-Halt tritt real ein

**Ziel:** Der schreibende Schritt (`schritt-2-fix`, `freigabe: ZWINGEND`)
greift in ausgelieferten Produktcode ein und hält vorher an, bis ein Mensch
freigibt. Wirkung: der F-243-Fix in `scripts/leitstand-server.mjs`.

**Bedienung:** „Starten", dann warten bis der Workflow auf `WARTET_FREIGABE`
steht, dann „Freigeben" mit Pflichtbegründung.

### Belege

Versionskette `kontrollzustand/lineage-workflow-f15-ws4-l2/checkpoints/`:

| Version | Zeit | Workflow | Cursor | schritt-1-analyse | schritt-2-fix |
|---|---|---|---|---|---|
| 2 | 17:51:25.425 | LAEUFT | schritt-1-analyse | LAEUFT, `2dc39905…` | OFFEN, `freigabe_erteilt` fehlt |
| 3 | 17:51:53.541 | **WARTET_FREIGABE** | schritt-2-fix | ERFOLGREICH | OFFEN, `freigabe_erteilt` fehlt |
| 4 | 17:53:00.493 | LAEUFT | schritt-2-fix | ERFOLGREICH | OFFEN, **`freigabe_erteilt: true`** |
| 5 | 17:53:00.529 | LAEUFT | schritt-2-fix | ERFOLGREICH | LAEUFT, `ef1efbd4…` |
| 6 | 17:53:26.889 | ABGESCHLOSSEN | null | ERFOLGREICH | ERFOLGREICH |

| # | Prüfung | Ergebnis |
|---|---|---|
| L2-1 | Der Halt trat real ein: Version 3 steht auf `WARTET_FREIGABE`, `grund`: „Schritt 'schritt-2-fix' verlangt eine menschliche Freigabe (freigabe 'ZWINGEND') — er startet erst, wenn für ihn eine Freigabe erteilt ist" | ✅ |
| L2-2 | Der Halt hielt: **67 Sekunden** zwischen Version 3 (17:51:53) und Version 4 (17:53:00). Ohne Bedienung wäre in dieser Zeit nichts passiert — anders als bei L1, wo 29 ms genügten. | ✅ |
| L2-3 | Entscheidungsartefakt existiert: `kontrollzustand/lineage-entscheidung-workflow-f15-ws4-l2-schritt-2-fix/checkpoints/1-…json`, `herkunft.erzeuger: 'mensch'`, `herkunft.schritt: 'entscheidung-workflow-freigabe'` | ✅ |
| L2-4 | Inhalt der Entscheidung: `ergebnis: FREIGEGEBEN`, `begruendung: "Fix sieht korrekt aus, Freigabe erteilt"`, `entschieden_am: 2026-09-10T17:53:00.466Z` — 27 ms vor der Zustandsänderung in Version 4 | ✅ |
| L2-5 | Die Entscheidung ist an die Fassung gebunden, die der Mensch vor sich hatte, und zwar per Hash, nicht per Verweis: `eingaben[0].pfad: artefakt:workflow-f15-ws4-l2`, `zitierter_bereich: "WORKFLOW_V0 versionSequenz 3, Schritt 'schritt-2-fix'"`, `inhalts_hash: ae932397cf1d32f511d4ccb9c4d612efab271a642a259148342eb3aec782a663` — bytegleich mit dem `inhalts_hash` von Version 3, der `WARTET_FREIGABE`-Fassung. Freigegeben wurde nachweislich genau der angehaltene Plan. | ✅ |
| L2-6 | Nur `freigabe_erteilt` wechselte auf `true`; `freigabe` blieb `ZWINGEND` (Plandatum unverändert, AK7 Satz 2 / F-195) | ✅ |
| L2-7 | Reale Wirkungsmarke des schreibenden Schritts: `kontrollzustand/ef1efbd4-717e-41a8-8a00-df8e93471bfd/checkpoints/2-…json`, `terminal`, `ergebnis: ERFOLGREICH` | ✅ |
| L2-8 | Reale Wirkung auf der Platte: `git diff -- scripts/leitstand-server.mjs` zeigt **genau eine geänderte Zeile und nichts sonst** (Zeile 3402): `laufenderSchritt.schritt_id` → `laufenderSchritt?.schritt_id ?? '—'`. Wörtlich die von F-243 empfohlene erste Variante. | ✅ |
| L2-9 | Die Änderung stammt aus diesem Schritt und nicht von Hand: Schritt 1 desselben Laufs las die Zeile um 17:51 noch in der ALTEN Fassung (siehe „Abgrenzung" unten), und der Ergebnistext von `ef1efbd4…` lautet „F-243 behoben: Zeile 3402 … geändert — genau eine Zeile, sonst nichts" (Rohstrom, `rohstrom_referenz.inhalts_hash` der Laufakte `ef1efbd4…`: `a146865ee5fb2e848c0c0cc409796a197b3c5c3fb4c3b3a4533342e86ed79d2d`) | ✅ |
| L2-10 | Rohstrom von `ef1efbd4…`: `is_error: false`, `permission_denials: []` | ✅ |
| L2-11 | Die Datei-mtime (`17:53:23.132Z`) liegt im Laufzeitfenster von `ef1efbd4…` (17:53:01 → 17:53:26). **Schwaches Indiz, kein Beleg:** eine mtime nennt nur den LETZTEN Schreibvorgang und kann einen früheren, überschriebenen nicht ausschließen. Der Beleg ist L2-9. | ⚠️ |

**Ergebnis: Satz 2 belegt.** Der Fix zu F-243 ist damit der erste Codeeingriff
dieses Repos, der von der Workforce selbst erzeugt wurde — geplant als
Workflow-Schritt, angehalten durch die eigene Freigabepflicht, freigegeben
von Hand, ausgeführt von einem echten Kindprozess.

### Abgrenzung: ein dritter, manuell gestarteter Lauf

Um 17:44:31 lief zusätzlich ein von Hand über das Startformular gestarteter
Lauf gegen denselben Auftrag (`laufId
f15-ws-4-l2-l3-f-243-beheben-eine-zeile--1789062222630`, Laufakte-Rohstromhash
`80bcd3c27187450891566c2fa131b7796c1fe0a06f0b47e238c57e02c7a7d9f9`). Er ist
nicht Teil von L2. Dass er nichts geschrieben hat, ist so belegt:

- **Entscheidend:** Schritt 1 von L2 (Lauf `2dc39905-0365-44d9-ab9f-8d4f3a151cb1`,
  17:51:25 → 17:51:53, also **sieben Minuten nach** dem Fremdlauf) hat die
  Datei gelesen und zitiert unter „heutiger Wortlaut (wörtlich)" die
  UNGEFIXTE Zeile `laufenderSchritt.schritt_id`. Rohstromhash der Laufakte
  `2dc39905…`: `dac0d3e316afebba6a6ee40d8ae2b3ade281bf2e1cd0d77b4487c633fb9be0b3`.
  Denselben alten Wortlaut zitiert die committete Datei
  `features/F15/nachweis-ak10-analyse.md`, geschrieben um 17:49:30 von L1s
  Schritt 2 — dieser Beleg überlebt den Commit und liegt nicht nur im
  ignorierten Rohstrom.
- Der Ergebnistext des Fremdlaufs ist reine Analyse (Zeilennummer, alter und
  neuer Wortlaut, Begründung), `num_turns: 3`, `terminal_reason: "completed"`,
  `is_error: false`. Er trug keine `vorgaengerLaufId` und verhielt sich nach
  Auftragstext folglich als Schritt 1.
- **Grenze dieser Abgrenzung, offen gesagt:** der Werkzeugsatz dieses Laufs
  ist aus keinem Artefakt rekonstruierbar — die Laufakte hält `argv` nicht
  fest, nur `werkzeugStartziel`. `permission_denials: []` trägt hier nichts,
  weil es mit „hatte keine Schreibrechte" und „hatte sie und nutzte sie nicht"
  gleich verträglich ist. Belegt ist damit: er hat DIESE Zeile nicht geändert.
  Dass er gar nichts geschrieben hat, ist nicht artefaktseitig belegt, sondern
  folgt aus `git status` (keine weitere geänderte Datei im Arbeitsbaum).
  Festgehalten als **F-271**.

---

## L3 — Satz 3: ein Abbruch nach F14 wirkt auf den aktiven Schritt

**Ziel:** Ein laufender Schritt wird über die Oberfläche abgebrochen; der
Abbruch trifft den aktiven Schritt.

**Bedienung:** „Starten", dann in der Schrittzeile auf die `lauf_id` klicken
und im Lauf-Detail „Abbrechen" (`POST /api/laeufe/<laufId>/abbrechen`, F14
WS-5) — **nicht** „Stoppen" im Workflow-Block, das ist ein anderer Vorgang mit
anderem Ergebnis (`GESTOPPT`).

### Erster Anlauf, vollständig protokolliert

Der erste Startversuch um 17:57:42 (Lauf `ff151246-be1e-42b2-b400-a390a04ee0d5`)
war zum Abbrechen zu schnell — nicht weil der Plan ein anderer war, sondern
weil Stefan den Klick nicht rechtzeitig setzte: der lesende Schritt endete
nach 64 Sekunden regulär `ERFOLGREICH` (Terminalmarke 17:58:46.405), und der
Workflow ging auf `WARTET_FREIGABE`, weil `schritt-2-fix` auch hier
`ZWINGEND` trägt.

Stefan hat den Workflow daraufhin gestoppt: Version 4 (18:00:49.909),
`GESTOPPT`, `grund: "Vom Menschen gestoppt: egal"`. Dazu existiert das
Entscheidungsartefakt
`kontrollzustand/lineage-entscheidung-workflow-f15-ws4-l3-stopp/checkpoints/1-…json`
mit `herkunft.erzeuger: 'mensch'`, `herkunft.schritt:
'entscheidung-workflow-stopp'`, `ergebnis: GESTOPPT`, gebunden an
`versionSequenz 3` (`inhalts_hash e91524a7d107aa043dc19639ef5bb2f8988c1ae00a5c65f093df0b658031c425`).

Zwischen 18:00:49 und 18:05:55 liegt eine Lücke von rund fünf Minuten, die
kein Artefakt füllt — Stefan hat in dieser Zeit die Reparaturfassung
vorbereitet. Version 5 (18:05:55.894) setzt den Workflow über den
Reparaturzug (F-240) zurück auf `OFFEN`, beide Schritte `OFFEN`/`lauf_id:
null`. Damit ist nebenbei belegt, dass der Reparaturzug real funktioniert.

**Der Preis dieser Reparatur, ausdrücklich benannt:** Version 5 setzt die
`lauf_id` von `schritt-1-analyse` auf `null` und verwaist damit den real
erfolgreich gelaufenen Lauf `ff151246…`. Seine Checkpoint-Kette existiert
weiter, aber kein Workflow-Artefakt verweist mehr auf sie. Genau dieser
Verlust ist als **F-219** beschrieben — hier real eingetreten, nicht nur
theoretisch.

### Belege des Abbruchlaufs

Versionskette `kontrollzustand/lineage-workflow-f15-ws4-l3/checkpoints/`:

| Version | Zeit | Workflow | Cursor | schritt-1-analyse | schritt-2-fix |
|---|---|---|---|---|---|
| 5 | 18:05:55.894 | OFFEN | schritt-1-analyse | OFFEN, `null` | OFFEN, `null` |
| 6 | 18:06:42.848 | LAEUFT | schritt-1-analyse | LAEUFT, `6741eda7…` | OFFEN, `null` |
| 7 | 18:07:01.698 | **KLAERUNG_ERFORDERLICH** | schritt-1-analyse | **FEHLGESCHLAGEN**, `6741eda7…` | **OFFEN, `null`** |

| # | Prüfung | Ergebnis |
|---|---|---|
| L3-1 | Der Lauf endete `FEHLGESCHLAGEN`: `kontrollzustand/6741eda7-d740-43f1-b639-6cc6176e56be/checkpoints/2-…json`, Wirkungsmarke `terminal`, `ergebnis: FEHLGESCHLAGEN` | ✅ |
| L3-2 | Beendigungsart ist der Abbruch, nicht ein Fehler: `daten.beendigungsart: 'ABBRUCH'`, `daten.art: 'MANUELL'`, `daten.grund: 'abgebrochen_manuell'` | ✅ |
| L3-3 | Der Abbruch traf einen echten, laufenden Kindprozess: Rohstrom (`rohstrom_referenz.inhalts_hash` der Laufakte `6741eda7…`: `5b7540ca3637eb85f1bd7fc4ee2f696793c6f679d03c3a4301105b17b4d8cb3d`) mit `beendigungsart: "ABBRUCH"`, `exitCode: null`, `stdout` leer (Länge 0) — der Prozess kam nicht zum Antworten | ✅ |
| L3-4 | Der letzte gültige Checkpoint ist in der Terminalmarke mitgeführt (`daten.letzter_gueltiger_checkpoint`: die `run_prepared`-Marke desselben Laufs, Sequenz 1) — der Abbruch verliert die Spur nicht | ✅ |
| L3-5 | Dauer zwischen Start (18:06:42.848) und Terminalmarke (18:07:01.698): ≈ 19 s, gegen `zeitgrenze_ms: 1800000` — kein Timeout, sondern ein echter Abbruch | ✅ |
| L3-6 | **Es war ein F14-Laufabbruch und kein Workflow-Stopp.** Zwei unabhängige Belege: (a) der Workflow endete `KLAERUNG_ERFORDERLICH`, nicht `GESTOPPT` — der Stopp-Endpunkt schreibt ausschließlich `GESTOPPT`; (b) von `lineage-entscheidung-workflow-f15-ws4-l3-stopp` existiert **nur eine einzige Version**, gebunden an `versionSequenz 3`, also an den ersten Anlauf um 18:00:49. Zum Abbruchlauf gehört kein Stopp-Artefakt. | ✅ |
| L3-7 | Der Workflow hielt an, statt fortzusetzen: Version 7 `KLAERUNG_ERFORDERLICH`, `grund`: „Schritt 'schritt-1-analyse' endete FEHLGESCHLAGEN (Lauf '6741eda7-d740-43f1-b639-6cc6176e56be')" | ✅ |
| L3-8 | Der Folgeschritt blieb unangetastet: `schritt-2-fix` in Version 7 unverändert `status: OFFEN`, `lauf_id: null`. **ÜBERDETERMINIERT, kein isolierter Beleg:** `schritt-2-fix` trägt in L3 planmäßig `freigabe: ZWINGEND` als zweite Sicherung (so auch im `risiko`-Feld von `nachweis/ws4/L3.json` begründet: „greift der Abbruch nicht wie erwartet, hält der Automat spätestens hier an"). Hätte der Abbruch den Automaten gar nicht erreicht, sähe Version 7 an dieser Stelle identisch aus. Der Beleg für „hält an" ist L3-7, nicht diese Zeile. | ⚠️ |

**Ergebnis: Satz 3 belegt** — in seinem Wortlaut („ein Abbruch nach F14 wirkt
auf den aktiven Schritt"): der aktive Schritt wurde real getroffen (L3-1 bis
L3-5), der Vorgang war nachweislich der F14-Abbruch und nicht der
Workflow-Stopp (L3-6), und der Automat hielt daraufhin an (L3-7).

**Nicht belegt, weil überdetermiert:** dass der Automat einen Folgeschritt mit
`freigabe: AUTOMATISCH` nach einem Abbruch ebenfalls nicht gestartet hätte.
Dafür bräuchte es einen vierten Lauf, dessen Folgeschritt unbeaufsichtigt
schreiben dürfte — das war der Grund, ihn nicht zu planen. Die Regel selbst
ist gate-geprüft (`scripts/check-f15-automat-real.mjs`, Block (b): „ein
abgebrochener Schritt 1 setzt NICHT auf Schritt 2 fort"). Festgehalten als
**F-272**.

---

## Gesamtergebnis

**AK10 erfüllt: JA**, in seinem Wortlaut und mit den oben ausdrücklich
benannten Grenzen:

- **Satz 1** (L1): ein Startaufruf, zwei getrennte reale Läufe, 29 ms
  Abstand, Lineage über Hash-Gleichheit belegt.
- **Satz 2** (L2): ein `ZWINGEND`-Halt hielt 67 Sekunden, wurde durch ein
  Entscheidungsartefakt mit `erzeuger: 'mensch'` aufgelöst, das per Hash an
  die angehaltene Fassung gebunden ist, und der freigegebene Schritt hat real
  genau eine Zeile Produktcode geändert.
- **Satz 3** (L3): ein echter Kindprozess wurde mitten im Lauf abgebrochen
  (`beendigungsart: ABBRUCH`), belegbar durch den F14-Laufabbruch und nicht
  durch den Workflow-Stopp, der Workflow hielt auf `KLAERUNG_ERFORDERLICH` an.

Aufgedeckt und als Finding festgehalten, nicht nachgebessert: **F-268**
(AK10 verlangt in einem Satz, was drei Läufe braucht), **F-269** (ein
Workflow-Schritt hat keine eigene Anweisung), **F-270** (der Handoff
zwischen zwei Schritten trägt kein Ergebnis, nur einen Pfad), **F-271** (die
Laufakte hält den Werkzeugsatz eines Laufs nicht fest), **F-272** (der
Abbruch-Nachweis konnte den Automatenhalt nicht isolieren).

### Was dieser Nachweis nicht abdeckt

Aus dem QA-Pass, damit es niemand für belegt hält: Abbruch eines
SCHREIBENDEN Schritts mitten im Schreiben; Abbruch im 29-ms-Übergabefenster
(F-212); `ZWINGEND` als erster Schritt; `ABGELEHNT` am Freigabe-Endpunkt;
Planabschwächung mit Begründungszwang (WS-2c (b3)); Ketten länger als ein
automatischer Sprung; `schritte[].eingaben` mit Inhalt (alle sechs Schritte
trugen `[]`, der Auflösungspfad wurde real nie berührt); `EMPFOHLEN` und
`worker: "codex"`; die Grenzen `max_schritte`/`max_replans`/`zeitgrenze_ms`;
Serverneustart mit stale `LAEUFT`; zweiter paralleler Start (D13-409).
Diese Fälle sind gate-geprüft, nicht real begangen.
