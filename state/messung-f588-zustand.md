# Messung F-556/F-588: GET /api/zustand vs. Größe von kontrollzustand/

Auftrag: reine Messung, KEIN Fix. Branch `messung/f588-zustand` von `main`
(c7d0404). Quelle: claude/314.

## 1. Code-Pfad — wie skaliert GET /api/zustand?

`GET /api/zustand` (`scripts/leitstand-server.mjs:4129`) ruft je Abfrage
`sammleLaeufe(basisVerzeichnis)` und `sammleWorkflows(basisVerzeichnis)` auf.

**`sammleLaeufe`** (`scripts/leitstand-server.mjs:958-967`) listet
`basisVerzeichnis` EINMAL komplett per `readdirSync` und ruft für **jeden**
Verzeichniseintrag — nicht nur echte Läufe, auch `lineage-auftrag-*`,
`lineage-kontextpaket-*`, `lineage-workflow-*`, `lineage-entscheidung-*` —
`sammleLaufKopfdatenGecached` auf. Anders als `sammleAuftraege` (983-999)
und `sammleWorkflows` (1168-1181), die VOR der teuren Arbeit nach
Präfix filtern, filtert `sammleLaeufe` erst NACH der Arbeit (`istLaufkette`
innerhalb `sammleLaufKopfdaten`, `.filter(kopfdaten !== null)` am Ende).

Der Perf-Fix `fix/zustand-poll-kosten` (Kommentarblock 883-923) hat einen
In-Memory-Cache pro Lauf-Id eingeführt (`laufKopfdatenCache`), der die teure
volle Kettenlesung (Checkpoint-Dateien parsen/hashen) nur bei Änderung
wiederholt. Der Cache-Treffer selbst kostet aber nicht null:
`leseCheckpointVerzeichnisStempel` (919-923) macht 1 `statSync` (+ 1
`readdirSync`, falls das Verzeichnis existiert) — und
`sammleLaufKopfdatenGecached` (934-946) ruft das für ZWEI Verzeichnisse pro
Eintrag auf (eigene Checkpoint-Kette + `lineage-entscheidung-<id>`-Kette).
Das ergibt bis zu 4 Dateisystem-Aufrufe **pro Verzeichniseintrag unter
kontrollzustand/, bei JEDER Abfrage, cache-warm wie cache-kalt**. Der
Kommentar an derselben Stelle (911-915) benennt das selbst: „654
Verzeichnisse … Stempelbildung allein kostete 79 ms … danach 52 ms — sie war
damit praktisch die gesamten ~75 ms von sammleLaeufe, auch wenn JEDER Lauf im
Cache lag." Das deckt sich mit F-559 (bereits offen: „GET /api/zustand
bleibt O(N) synchron über kontrollzustand/").

**Ergebnis Schritt 1:** GET /api/zustand liest nicht bei jeder Abfrage jede
Laufakte neu (die Kopfdaten sind gecacht), aber der Cache spart nur die
teure Kettenlesung — die Änderungserkennung selbst bleibt O(n) über ALLE
Top-Level-Verzeichnisse unter `basisVerzeichnis`, nicht nur echte Läufe.

## 2. Messreihe (Wegwerf-Kopien)

Kopien `kontrollzustand-test-{100,400,800}` = die ersten n (alphabetisch
sortierten) Verzeichnisse des echten Bestands, für n=800 mit 6 leeren
Füll-Verzeichnissen aufgefüllt (echter Bestand hatte zum Messzeitpunkt 794
Verzeichnisse). Nach der Messung vollständig gelöscht, echter Bestand nie
verändert.

**Methodikhinweis:** Messungen über einen echten HTTP-Roundtrip (Muster
Gate (d), `fetch` gegen `127.0.0.1`) streuten in dieser Umgebung um Faktor
10–20 zwischen Wiederholungen auf identischen Daten (z. B. derselbe
`kontrollzustand-test-800`-Bestand: einmal Median 70 ms, einmal Median
1021 ms). Das deckt sich mit der in CLAUDE.md dokumentierten Falle
„Test-/Gate-Lauf scheitert einmalig ohne erkennbaren Grund" — vermutlich
Windows-seitiges Rauschen (Defender-Scan frisch geschriebener Dateien,
OneDrive, Loopback-Socket-Overhead), nicht die Route selbst. Deshalb zweite,
robustere Messreihe: `requestHandler` direkt aufgerufen (Mock-`req`/`res`,
kein echter Socket), n-Werte pro Runde verschachtelt statt in
getrennten Prozessen — Hintergrundlast trifft dann alle n gleich statt
einzelne Läufe zu verzerren. Diese Reihe war über mehrere Wiederholungen
stabil (Streuung < 20 %) und ist die belastbare.

| n (Verzeichnisse) | kalt Median (15 Abrufe) | warm Median (15 Abrufe) |
|---:|---:|---:|
| 100 | 8,5 ms | 9,3 ms |
| 400 | 36,8 ms | 34,9 ms |
| 800 | 77,0 ms | 69,3 ms |

Kalt = je Abruf frische Handler-Instanz (leerer Kopfdaten-Cache). Warm = eine
Instanz, ein Aufwärmlauf, dann 15 gemessene Abrufe.

**Skalierung:** nahezu linear, ~0,09 ms pro Top-Level-Verzeichnis
(100→400: Faktor 4 Verzeichnisse, Faktor 4,3 Zeit; 400→800: Faktor 2
Verzeichnisse, Faktor ~2,1 Zeit). Kalt ≈ warm bei allen drei n — der Cache
spart hier praktisch nichts, deckt sich mit der Code-Analyse aus Schritt 1.

## 3. Echter Bestand (nur lesend)

`kontrollzustand/` (794 Verzeichnisse, unverändert gelassen), gleiche
In-Prozess-Methode, interleaved gegen `kontrollzustand-test-800` gemessen:

| Ziel | kalt Median | warm Median |
|---|---:|---:|
| echter Bestand (794) | 70,2 ms | 72,6 ms |
| `kontrollzustand-test-800` (800, Kopie) | 72,5 ms | 69,2 ms |

Beide praktisch identisch — die synthetischen Kopien sind repräsentativ,
und der echte Bestand liegt damit heute (unter ruhigem System) klar unter
der 300-ms-Gate-Grenze aus Gate (d).

## Ursache — belegt vs. offen

**Belegt** (Code + Messung stimmen überein): Die Kosten von GET /api/zustand
wachsen linear mit der Gesamtzahl der Top-Level-Verzeichnisse unter
`kontrollzustand/` — nicht mit der Zahl aktiver/echter Läufe —, weil
`sammleLaeufe` für jeden Eintrag eine Cache-Stempelbildung durchführt, bevor
gefiltert wird. Bei der heutigen Bestandsgröße (~800) macht das ~70–80 ms
aus, deutlich unter der 300-ms-Grenze unter ruhigem System.

**Offen:** Der einmalige Ausreißer vom 22.09.2026 (Median 1266 ms bei 794
Verzeichnissen, Gate (d)) ist mit reiner Verzeichnisanzahl NICHT erklärbar —
bei 794 Verzeichnissen liefert diese Messung 70–80 ms, nicht 1266 ms. Die
Größenordnung passt eher zu vorübergehender Systemlast (Hintergrundprozess,
Sync, Antivirus) als zu einem Datenwachstum. Das erklärt vermutlich auch,
warum der Retry am selben Tag grün lief. Die O(n)-Skalierung selbst ist real
und wird bei weiterem, unbegrenztem Wachstum von `kontrollzustand/`
(kein Archivierungs-/Bereinigungsmechanismus bekannt) relevant:
hochgerechnet auf ~0,09 ms/Verzeichnis würde die 300-ms-Grenze bei ruhigem
System erst bei ca. 3.300 Verzeichnissen erreicht — das Gate ist also heute
nicht strukturell knapp, sondern anfällig für genau solche einmaligen
Lastspitzen, wie in den Bekannten Fallen (CLAUDE.md) beschrieben.

## Fix-Optionen (nicht umgesetzt, nur zur Einordnung)

1. **Klein:** `sammleLaeufe` VOR der Stempelbildung nach Präfix/Muster
   filtern (Muster `sammleAuftraege`/`sammleWorkflows` — Präfix-Filter vor
   der teuren Arbeit), statt danach über `istLaufkette` auszusortieren. Senkt
   n von „alle Verzeichnisse" auf „echte Läufe" (im echten Bestand aktuell
   ~130 von 794, grob Faktor 6). Aufwand: klein, lokal in einer Funktion,
   bestehende Gates (d) und `check-fix-zustand-poll-kosten.mjs` decken die
   Regression bereits ab.
2. **Mittel:** Die Top-Level-Verzeichnisliste selbst cachen (ein
   Stempel über `basisVerzeichnis` statt pro Eintrag neu zu scannen),
   invalidiert nur bei Änderung am Wurzelverzeichnis. Entfernt die O(n)-Kosten
   zwischen echten Änderungen vollständig, braucht aber sorgfältige
   Invalidierung (ein neuer Lauf darf nicht übersehen werden) — nach
   CLAUDE.md-Regel ein Advisor-Pass vor Umsetzung, da Cache-/Invariante-
   Änderung.

## Blocker

Keiner. Hinweis für die nächste Bearbeitung von F-556: bei einem erneuten
Ausreißer Systemzustand (Uhrzeit, laufende Hintergrundprozesse) festhalten
statt sofort am Code zu suchen — die Messung hier zeigt, dass die
Verzeichnisanzahl allein den beobachteten Wert nicht erklärt.

## Nachtrag 22.09.2026 — Fix umgesetzt (branch fix/f588-sammle-laeufe)

Fix (Option 1 aus dem Fix-Optionen-Abschnitt oben): `sammleLaeufe`
(`scripts/leitstand-server.mjs:958-970`) überspringt Verzeichnisse mit
Präfix `lineage-` per Denylist, BEVOR `sammleLaufKopfdatenGecached`
(Stempelbildung) aufgerufen wird. Bewusst keine Allowlist (Auftrag F-588):
eine echte `laufId` trägt kein festes Präfix (`jarvis-…`, `router-…`,
`test5…`, `f12-…`), `istLaufkette` (Z. 613) bleibt inhaltsbasiert und
unverändert — die Denylist ergänzt nur einen billigen Vorab-Ausschluss für
Verzeichnisse, die schon namentlich nie Laufketten sein können.

### Äquivalenznachweis (echter Bestand, nur lesend)

Alte Version über einen temporären `git worktree` auf `main` (vor dem Fix,
4f2d2ef), neue Version aus dem Arbeitsverzeichnis — beide direkt gegen
`GET /api/laeufe` (Mock-`req`/`res`, kein Socket), gleicher echter
`kontrollzustand/`-Bestand (794 Verzeichnisse):

- Anzahl Läufe: alt 200, neu 200 — identisch.
- Lauf-Ids (sortiert): identisch.
- Kopfdaten (nach Lauf-Id sortiert): deep-equal.
- Läufe mit Präfix `lineage-` in der ALTEN, ungefilterten Liste: **0** — das
  ist der reale Beleg, dass `istLaufkette` heute keine `lineage-`-Kette je
  als Laufkette akzeptiert; die neue Denylist verliert dadurch nachweislich
  keinen echten Lauf gegen den heutigen Bestand.

Zusätzlich dauerhaft abgesichert: `scripts/check-fix-f588-sammle-laeufe.mjs`
(neu, in `npm run check`) — 40 synthetische `lineage-*`-Scheinverzeichnisse
neben einem echten Lauf verändern `GET /api/laeufe` nicht (Äquivalenz), und
ein Nicht-Lauf-Verzeichnis OHNE `lineage-`-Präfix bleibt weiterhin über
`istLaufkette` ausgefiltert (Regressionsschutz gegen eine versehentliche
Allowlist-artige Verengung).

### Messung vorher/nachher (in-process, interleaved, echter Bestand, 15 Wdh.)

| | kalt Median | warm Median |
|---|---:|---:|
| vorher (alt, main 4f2d2ef) | 68,1 ms | 69,3 ms |
| nachher (neu, Fix) | 19,9 ms | 19,5 ms |

Faktor ~3,4–3,5× schneller. Kein 4×-Sprung trotz ~294 von 794
`lineage-*`-Verzeichnissen (grob 37 %), weil außerhalb der Denylist noch
weitere Nicht-Lauf-Verzeichnisse ohne `lineage-`-Präfix bestehen (z. B.
einmalige `test*`-/`verify-*`-/`ws3-szenario-*`-Wegwerfverzeichnisse aus
früheren Nachweisläufen) — die bleiben bewusst über `istLaufkette` gefiltert
statt per Denylist, siehe Auftrag (keine Allowlist).

Hochrechnung 300-ms-Grenze (Gate (d)) verschiebt sich von ~3.300 auf grob
~11.000 Verzeichnisse bei gleichem Mix — deutlich mehr Marge, F-559s
grundsätzliches O(n)-über-echte-Läufe besteht aber unverändert fort.
