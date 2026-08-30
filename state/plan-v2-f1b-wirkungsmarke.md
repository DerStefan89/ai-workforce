# Plan v2 — Feature F1B: Wirkungsmarke / RUN_PREPARED / Terminalartefakt

Slug: f1b-wirkungsmarke
Stand: 2026-08-30
Grundlage: `state/plan-v1-f1b-wirkungsmarke.md` (bleibt unverändert
stehen, wird hier nicht überschrieben) plus Advisor-Urteil
`state/advisor-findings-f1b-wirkungsmarke.md`: **NICHT FREIGEGEBEN** —
blockierend waren B3 (fehlende AC/Tests für gemischte Ketten und
unbekannten `typ`), B4 (Semantik bei mehrfachem `RUN_PREPARED` unsicher)
und B5 (Rückgabeform für `KLAERUNG_ERFORDERLICH` unterspezifiziert
gegenüber `ARCHITECTURE.md:61`). B1/B2 sind laut Advisor **bestätigt,
entlastend** — die Kernentscheidung D1 (eigener Hüllen-`typ`) und die
Kettenmechanik (D3/B6-Fix) brauchen keinen Umbau. B6/B7 sollen ins SCOPE
aufgenommen werden (kleiner Aufwand). B8-B10 dürfen unverändert in den
Handoff-Vertrag mitlaufen, sind nicht blockierend.

Alle Abschnitte von plan-v1, die hier nicht erwähnt werden, gelten
unverändert fort — anders als bei F2s plan-v2 ist der Eingriff hier
klein: Abschnitt 0 (Verifikation), 1 (Ziel), 4 D1-D2 (Design-
Entscheidungen), 5 (Ablageort), 6 (Budget), 8 (Rollen) bleiben
unverändert. Betroffen sind SCOPE.3/SCOPE.5 (Delta 1-3 unten), die
Akzeptanzkriterien (Delta-Tabelle unten) und die Offenen Punkte
(reduziert auf einen verbleibenden).

Diese Deltas sind technische Präzisierungen der bereits im Auftrag
festgelegten Semantik (AC5/AC6, `zielfassung.md` §16.6), keine neue
Grundsatzentscheidung im Sinne von F2s „Stefans Entscheidung, Option A"
— deshalb löst diese Sitzung B4/B5 direkt auf, statt sie an Stefan zu
eskalieren (CLAUDE.md-Entscheidungsregel: Wartbarkeit/Komplexität
reduzieren, Entscheidung dokumentieren, nicht stillschweigend). D1
selbst (Advisor B1, bestätigt) bleibt unangetastet.

---

## Delta 1 (löst B4) — Semantik bei mehrfachem `RUN_PREPARED`: chronologische FIFO-Paarung statt „neuestes gewinnt"

### Problem (Advisor B4)

plan-v1s Vorschlag „die `sequenz`-höchste `run_prepared`-Marke zählt"
kann ein unaufgelöstes `RUN_PREPARED` verdecken: `run_prepared`
(sequenz 2) → [Absturz, kein Terminal] → `run_prepared` (sequenz 3) →
Terminal `ERFOLGREICH` (sequenz 4) würde `ABGESCHLOSSEN`/`ERFOLGREICH`
liefern und die offene sequenz 2 stillschweigend verlieren — genau der
Zustand, den §16.6 als blockierten Klärzustand erzwingen will.

### Lösung: FIFO-Paarung, offene Liste statt einzelner Marke

`stelleLaufstatusFest` verarbeitet die `wirkungsmarke`-gefilterten
Einträge der Kette (aufsteigend nach `sequenz`, wie von
`ladeGueltigeCheckpoints` bereits geliefert) sequenziell mit einer
Warteschlange `offeneRunPrepared: number[]` (Sequenznummern):

- Bei `art: "run_prepared"`: `sequenz` an `offeneRunPrepared` anhängen.
- Bei `art: "terminal"`: wenn `offeneRunPrepared` nicht leer ist, die
  **älteste** offene Sequenz entnehmen (FIFO — deterministisch, ohne
  eine explizite Paar-Referenz zwischen Terminal und `RUN_PREPARED`
  einzuführen, die der Auftrag nicht verlangt) und als durch dieses
  Terminal aufgelöst vermerken (`ergebnis`, `terminalSequenz`). Ist
  `offeneRunPrepared` bereits leer, ist das Terminal ohne zugehöriges
  `RUN_PREPARED` — kein AC verlangt eine Reaktion darauf; wird als
  zusätzliches, nicht-blockierendes Diagnosefeld
  `terminaleOhneRunPrepared` mitgeführt (SCOPE.3 unten), nicht als
  eigener `status`-Wert (kein neuer Fall außerhalb der drei in
  `ARCHITECTURE.md:58` benannten Terminalausgänge).
- Am Ende der Kette: ist `offeneRunPrepared` **nicht leer**, ist der
  Lauf `KLAERUNG_ERFORDERLICH` — unabhängig davon, ob danach irgendein
  Terminal geschrieben wurde. Ist sie leer und mindestens ein Terminal
  wurde zugeordnet, ist der Lauf `ABGESCHLOSSEN` mit dem `ergebnis` des
  **zuletzt zugeordneten** Terminals. Ist die gesamte gefilterte Liste
  leer, `NICHT_GESTARTET`.

**Sicherheitseigenschaft (der eigentliche Fix für B4):** Unabhängig von
der Paarungsreihenfolge (FIFO hier gewählt für Determinismus, LIFO wäre
ebenso sicher) gilt strukturell: Anzahl offener `RUN_PREPARED` am Ende =
max(0, Anzahl `run_prepared`-Marken − Anzahl `terminal`-Marken bis zu
diesem Punkt in der Kette). Sobald mehr `RUN_PREPARED`- als
Terminal-Marken existieren, bleibt **mindestens eine** Sequenz offen und
erzwingt `KLAERUNG_ERFORDERLICH` — kein Pfad kann eine unaufgelöste
`RUN_PREPARED`-Marke durch ein späteres, unabhängiges Terminal
verdecken. Im Advisor-Szenario (2 `run_prepared`, 1 Terminal) bleibt
sequenz 2 (FIFO) oder sequenz 3 (LIFO) offen — welche konkret ist eine
Auslegung dieser Sitzung (**neuer Offener Punkt**, siehe unten), aber
dass **irgendeine** offen bleibt, ist strukturell erzwungen, nicht
Auslegung.

### SCOPE.3-Ergänzung (ersetzt plan-v1s Formulierung „die sequenz-höchste
run_prepared-Marke zählt, ältere werden ignoriert")

`stelleLaufstatusFest(laufId, optionen?)` gibt zurück:
- `{ status: "NICHT_GESTARTET" }` — keine Wirkungsmarke in der Kette.
- `{ status: "ABGESCHLOSSEN", ergebnis, terminalSequenz,
  runPreparedSequenz }` — jede `RUN_PREPARED`-Marke hat ein
  zugeordnetes Terminal; `ergebnis`/`terminalSequenz` beziehen sich auf
  das zuletzt zugeordnete Paar.
- `{ status: "KLAERUNG_ERFORDERLICH", ... }` (fünf Pflichtfelder, siehe
  Delta 2) — mindestens eine `RUN_PREPARED`-Marke ohne zugeordnetes
  Terminal.
- Optionales Diagnosefeld `terminaleOhneRunPrepared: number[]` in jedem
  der drei Fälle (leeres Array im Normalfall) — Terminals, die auf keine
  offene `RUN_PREPARED`-Marke trafen; kein AC verlangt eine
  Statusänderung dafür, nur Sichtbarkeit für künftige Diagnose.

---

## Delta 2 (löst B5) — `KLAERUNG_ERFORDERLICH`-Rückgabe mit den fünf `ARCHITECTURE.md:61`-Bestandteilen

`ARCHITECTURE.md:61`: „Ein blockierter Zustand trägt Blocker-Kennung,
Grund, Evidenz, Auflösungsbedingung und Resume-Ziel." Konkrete Belegung
für `stelleLaufstatusFest`s `KLAERUNG_ERFORDERLICH`-Fall:

```
{
  status: "KLAERUNG_ERFORDERLICH",
  blockerId: `wirkungsmarke-offene-run-prepared:${laufId}`,
  grund: "RUN_PREPARED-Wirkungsmarke(n) ohne zugeordnetes Terminalartefakt",
  evidenz: {
    laufId,
    offeneRunPreparedSequenzen: number[],   // FIFO-Rest, siehe Delta 1
    einträge: KontrollzustandEintrag[]      // die betroffenen Wirkungsmarke-Einträge selbst, unverändert aus der Kette
  },
  aufloesungsbedingung: "Menschliche Entscheidung: gültiges Terminalartefakt für die offene(n) RUN_PREPARED-Sequenz(en) nachtragen (schreibeWirkungsmarke mit art: 'terminal'), oder den Lauf als abgebrochen/geklärt einstufen",
  resumeZiel: "Kein automatischer Neustart dieser lauf_id (AC5) — ein bewusst neu gestarteter Lauf erhält eine eigene lauf_id (AC6, §16.6)"
}
```

Feldnamen (`blockerId`/`grund`/`evidenz`/`aufloesungsbedingung`/
`resumeZiel`) sind weiterhin Feinschliff der Ausführungssitzung — B5s
Kern war die **inhaltliche** Vollständigkeit (alle fünf Bestandteile
belegt), nicht die Benennung. `resumeZiel` beschreibt hier ausdrücklich
eine Bedingung/Voraussetzung für eine künftige Wiederaufnahme (welche
`lauf_id`-Regel gilt), nicht eine automatische Handlung — kollidiert
nicht mit dem in plan-v1 Abschnitt 3 korrekt ausgeklammerten Non-Scope
„keine automatische Wiederaufnahme".

---

## Delta 3 (löst B3) — zwei zusätzliche Testfälle

Ergänzung zu plan-v1 SCOPE.7 (`checkpoint-store.test.ts`):

- **Gemischte Kette (neu, deckt Fokus A des Advisor-Auftrags):**
  `schreibeCheckpoint` → `schreibeWirkungsmarke(art: "run_prepared")` →
  `schreibeCheckpoint` → `schreibeWirkungsmarke(art: "terminal",
  ergebnis: "ERFOLGREICH")` für dieselbe `lauf_id` (vier Einträge,
  `sequenz` 1-4, `typ` alternierend `checkpoint`/`wirkungsmarke`/
  `checkpoint`/`wirkungsmarke`). `ladeGueltigeCheckpoints` liefert alle
  vier Einträge, aufsteigend, Kettenintegrität (`vorgaenger_hash`) über
  die gesamte gemischte Folge hinweg intakt — Beleg, dass der
  typ-Dispatch (D3) die Rückwärts-Kettenprüfung nicht unterbricht.
  `stelleLaufstatusFest` liefert `ABGESCHLOSSEN`/`ERFOLGREICH`.
- **Unbekannter `typ` mitten in der Kette (neu, deckt Fokus A):** ein
  Checkpoint, danach eine Datei mit `typ: "unbekannt"` (sonst
  strukturell/hash-gültig) direkt ins Kettenverzeichnis geschrieben,
  danach ein weiterer Checkpoint. `ladeGueltigeCheckpoints` liefert nur
  den Checkpoint **vor** dem unbekannten Eintrag als gültige Kette (der
  Rückwärtslauf ab dem höchsten Kandidaten scheitert am unbekannten
  Typ, fällt auf den validen Vorgänger zurück — exakt F1s bestehendes
  D3-Verhalten für jeden ungültigen Kandidaten, hier erstmals mit einem
  typ-fremden statt einem payload-invaliden Kandidaten belegt); eine
  `checkpoint_validierungsfehler`-Zeile mit benanntem Verstoß
  (`"'typ' muss 'checkpoint' oder 'wirkungsmarke' sein"` o. ä.) wird
  emittiert, kein Absturz.

Deckt A4/A13 (plan-v1) präziser als zuvor formuliert und schließt B3.

---

## Delta 4 (nimmt B6/B7 ins SCOPE auf) — explizite `types.ts`- und Validierungs-Refactor-Zeilen

**SCOPE-Ergänzung zu plan-v1 SCOPE.5 (`types.ts`):**
- Neuer Typ `WirkungsmarkePayload` (`lauf_id`, `sequenz`,
  `vorgaenger_hash`, `selbst_hash`, `art: 'run_prepared' | 'terminal'`,
  `ergebnis?: 'ERFOLGREICH' | 'VERWEIGERT' | 'FEHLGESCHLAGEN'`,
  `daten?`).
- `KontrollzustandEintrag.payload` wird von `CheckpointPayload` auf
  `CheckpointPayload | WirkungsmarkePayload` erweitert (Union statt
  fixem Typ). Geprüft (Advisor B6, entlastend): F2s bestehende Zugriffe
  auf `payload` (`src/lineage-registry/index.ts`) verwenden
  ausschließlich Felder, die in beiden Varianten identisch vorkommen
  (`sequenz`, `selbst_hash`, `vorgaenger_hash`, `lauf_id`, `daten`) —
  die Union bricht F2 nicht, `tsc --noEmit` ist der reale Nachweis
  dafür im Bauschritt.

**SCOPE-Ergänzung zu plan-v1 SCOPE.3 (`index.ts`):**
- Gemeinsamer, privater Helfer `pruefeKettenfelder(payload,
  zusaetzlicheErlaubteFelder: string[])`, extrahiert aus dem
  Kettenfeld-Teil (`lauf_id`/`sequenz`/`vorgaenger_hash`/`selbst_hash`
  plus Kettenanfangs-Regel) von `validiereCheckpointEintrag`
  (`index.ts:151-179`). Beide `validiereCheckpointEintrag`
  (`zusaetzlicheErlaubteFelder: ['daten']`, unveränderte Signatur/
  Verhalten) und das neue `validiereWirkungsmarkeEintrag`
  (`zusaetzlicheErlaubteFelder: ['art', 'ergebnis', 'daten']`) rufen
  ihn auf — kein zweiter, unabhängig gepflegter Regelsatz für
  identische Kettenfeld-Prüfung (schließt B7, vermeidet eine künftige
  B6-artige Drift).

## Delta 5 (nicht blockierend, für den Handoff-Vertrag vorgemerkt)

- **B8** — Docstrings des Modulkopfs sowie von
  `ladeLetztenGueltigenCheckpoint`/`ladeGueltigeCheckpoints`
  aktualisieren: beide liefern nach F1B auch Wirkungsmarke-Einträge,
  nicht nur Checkpoints. Kleine, nicht-blockierende Textänderung.
- **B9** — Verzeichnisname `checkpoints/` trägt künftig auch
  Wirkungsmarken; bewusst unverändert belassen (kosmetisch, siehe
  Advisor-Befund), keine Aktion nötig.
- **B10** — F2s Nutzung von F1s Exporten bleibt laut Advisor unversehrt;
  als Regressionsbeleg A13 (plan-v1, unverändert) im Bauschritt real zu
  bestätigen (`node --test`, bestehende `lineage-registry.test.ts` läuft
  unverändert grün).

## Akzeptanzkriterien — Delta-Tabelle (gegen plan-v1 Abschnitt 7)

| AC (plan-v1) | Status | Delta |
|---|---|---|
| A1-A3 | unverändert | |
| A4 | präzisiert | jetzt zusätzlich durch die gemischte Kette aus Delta 3 belegt |
| A5 | geändert | Rückgabeform jetzt konkret (Delta 2), Semantik jetzt FIFO-Paarung (Delta 1) statt „sequenz-höchste zählt" |
| A6 | geändert | `ergebnis`/`terminalSequenz` beziehen sich auf das zuletzt zugeordnete Paar (Delta 1), nicht mehr implizit auf „das letzte Terminal" |
| A7 | unverändert | |
| A8 | unverändert | |
| A9-A11 | unverändert | |
| A12 | geändert | Abbruch-Szenario liefert jetzt `KLAERUNG_ERFORDERLICH` mit der offenen Sequenz in `evidenz.offeneRunPreparedSequenzen` (Delta 2), nicht nur dem bloßen Status |
| A13 | unverändert | |
| A14-A18 | unverändert | |
| A19 | präzisiert | Hauptkriterium jetzt zusätzlich durch das Advisor-Szenario (zwei `run_prepared`, ein Terminal) abgedeckt — neuer Testfall unten |

Neu (nicht in plan-v1):
- **A20** — Gemischte Kette (Checkpoint + Wirkungsmarke, vier Einträge)
  wird über `ladeGueltigeCheckpoints` vollständig und in korrekter
  Reihenfolge geladen, Kettenintegrität über die gesamte Folge hinweg
  bestätigt (Delta 3, deckt Advisor-Fokus A).
- **A21** — Ein Eintrag mit `typ` außerhalb von `checkpoint`/
  `wirkungsmarke` mitten in einer Kette wird als Regelverstoß erkannt
  (`checkpoint_validierungsfehler`), die Kette fällt auf den validen
  Vorgänger zurück, kein Absturz (Delta 3, deckt Advisor-Fokus A).
- **A22** — Advisor-Szenario real durchgespielt: `run_prepared`
  (sequenz 2) → `run_prepared` (sequenz 3) → Terminal `ERFOLGREICH`
  (sequenz 4) → `stelleLaufstatusFest` liefert `KLAERUNG_ERFORDERLICH`
  mit einer nicht-leeren `offeneRunPreparedSequenzen`-Liste, **nicht**
  `ABGESCHLOSSEN` (zentraler Rot-/Grün-Beleg für Delta 1, löst B4 real
  auf, nicht nur in Prosa).

## Offene Punkte (reduziert gegenüber plan-v1 — B1 durch Advisor bestätigt entfällt, B4/B5/B3 durch Delta 1-3 aufgelöst)

1. **FIFO- vs. LIFO-Paarung zwischen `RUN_PREPARED` und Terminal ist
   eine Auslegung dieser Sitzung, keine Vorgabe aus dem Auftrag oder aus
   `zielfassung.md`.** Beide Reihenfolgen erfüllen die
   Sicherheitseigenschaft aus Delta 1 (mindestens eine Sequenz bleibt
   bei einem Überschuss an `RUN_PREPARED` offen), unterscheiden sich nur
   darin, **welche konkrete** Sequenz als offen gemeldet wird. Diese
   Sitzung wählt FIFO für Determinismus (ältestes Problem zuerst
   sichtbar). Zur Bestätigung im nächsten Advisor-Pass oder durch
   Stefan vor dem Handoff-Vertrag — kein Blocker für den Bau, da beide
   Varianten die AC5/AC19-Garantie erfüllen und ein Wechsel später eine
   lokale, isolierte Änderung wäre (keine Schema-/Speicherform-Auswirkung).

## Ergebnis

Plan v2 = plan-v1 (Abschnitte 0, 1, 4 D1-D2, 5, 6, 8) unverändert +
Delta 1 (löst B4: FIFO-Paarung, offene Liste statt „neuestes gewinnt")
+ Delta 2 (löst B5: `KLAERUNG_ERFORDERLICH`-Rückgabe mit den fünf
`ARCHITECTURE.md:61`-Bestandteilen) + Delta 3 (löst B3: gemischte Kette
+ unbekannter `typ` als neue Testfälle) + Delta 4 (nimmt B6/B7 ins
SCOPE: `types.ts`-Union, gemeinsamer Kettenfeld-Helfer) + Delta 5 (B8-
B10 unverändert für den Handoff-Vertrag vorgemerkt, nicht blockierend).
Ein Offener Punkt verbleibt (FIFO-vs-LIFO), kein Blocker.

## Nächster Schritt

Kurzer, fokussierter zweiter Advisor-Pass ausschließlich auf Delta 1-4
(Grundarchitektur D1-D3 muss laut Urteil nicht erneut geprüft werden),
danach Handoff-Vertrag `state/tasks/f1b-wirkungsmarke.md`, sieben
Pflichtsektionen, SCHRITT 0 wörtlich, endet mit Freigabe-Halt.
