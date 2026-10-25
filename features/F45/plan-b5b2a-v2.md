# Plan B5b-2a — Roadmap: Gantt lesend (v2)

Grundlage: `plan-b5b2a.md` (v1) und der Advisor-Pass vom 25.10.2026 (architecture-advisor, „Freigegeben mit Hinweisen“, kein
weiterer Schnitt). v1 gilt weiter, mit diesen Änderungen. Kein zweiter Advisor-Pass (Regel 3a).

## Änderungen gegenüber v1

1. **Projektion ohne `zeitachse`/`kennzahlen`** (Advisor 1; kommt in `projekt-wechsel.test.mjs:186` vor): `zeitachseVon`
   liefert `[]`, wenn das Feld fehlt oder kaputt ist. `bisFertig`/`planGegenIst` liefern dann `null`, und die Kennzahl zeigt „nicht
   verfügbar“. Der Gantt zeigt Zeilen ohne Balken. Dazu je ein Test.
2. **Ist-Zone als Band wie im Design** (Advisor 2): keine eigene Skala. `IST_BREITE` = 96 px. Eine Zeile mit erledigtem Anteil
   bekommt dort ein blasses Band über die ganze Zone (8 px Rand). Das ist der Fall bei Status abgenommen/erledigt oder wenn sie
   Ist-Einträge trägt. Ist-AT stehen als Text in der Kurzinfo (Summe `ist` der erledigten Zeilen, falls vorhanden). Damit
   entfallen `istSpanne` und der negative Zweig von `xVonAt`. Ein Abnahmedatum in der Zukunft hat keine Wirkung auf die Lage.
3. **`nach_unbekannt` und Sammelbalken sichtbar** (Advisor 3): Balken und Marke werden beide gezeichnet, wenn beides vorliegt.
   Das Label steht hinter dem rechtesten Element.
   - Text: „a–b AT“.
   - Gibt es Einträge ohne Schätzung, kommt „· n ohne Schätzung“ dazu.
   - Bei `nach_unbekannt` steht vorn „frühestens ab AT x ·“.
   - Gibt es nur die Marke: „Schätzung fehlt · frühestens ab AT x“.

   Alles steht als sichtbarer Text da, nicht nur im title.
4. **Plan gegen Ist, Formel** (Advisor 4):
   - `anzahl` = 0 ⇒ `leer`.
   - `ist` > `plan_max` ⇒ `ueber`. Die Prozentzahl ist `round((ist/plan_max − 1)·100)`, bei `plan_max` = 0 gibt es keine Zahl.
   - `ist` < `plan_min` ⇒ `unter`. Die Prozentzahl ist `round((ist/plan_min − 1)·100)`, also negativ.
   - Sonst `im_plan`.

   Unterzeile: „Ist x AT · Plan a–b AT · n Workstreams mit Schätzung und Ist“. Tests für 0, über, unter und im Plan.
5. **Eine Gruppenregel** (Advisor 5): Bei einer nicht abgeschlossenen Elternzeile stehen die erledigten Kinder gesammelt in
   einer Gruppenzeile vorn, aufklappbar.
   - Meilenstein ≠ ABGESCHLOSSEN: Features mit ABGESCHLOSSEN.
   - Feature ≠ ABGESCHLOSSEN/ABGEBROCHEN: Zeilen erledigt/verworfen.

   Abgeschlossene Eltern zeigen ihre Kinder direkt. Ebenen gehen von 0 bis 4, der Einzug richtet sich nach der Ebene. Features in
   der Gruppe lassen sich aufklappen (dieselbe Funktion, rekursiv).
6. **Ohne Akte** (Advisor 6): `workstreams`/`titel`/`prioritaet` werden mit `?? null` gelesen. Dazu ein Test mit `keine_akte`.
7. **Zeilen ohne Zeitachsen-Eintrag** (Advisor 7):
   - erledigt ohne Abgenommen ⇒ Ist-Band nach Status, keine Lage.
   - verworfen ⇒ keine Balken, Kurzinfo „verworfen“.
   - `geplant`/`laeuft` in einem abgeschlossenen Feature oder Meilenstein ⇒ keine Balken. Sichtbarer Text in der Spur: „keine Planlage — Feature/Meilenstein abgeschlossen“. Das ist ein Datenfall der Bereinigung und sieht nicht wie „fertig“ aus.
8. **Fokus und Zustand** (Advisor 8):
   - Neue Bedienelemente kommen in `fokusSchluessel`: Zoom `data-roadmap-zoom`, Klappe über den Zeilenschlüssel, Auswahl über den Zeilenschlüssel.
   - Der Projektwechsel setzt den Zoom auf Tage zurück.
   - Die Auswahl hält den Zeilenschlüssel statt art/id/meilensteinId.

Kleinigkeit (Advisor 10): Die Heute-Linie bekommt kein neues Token. Sie nutzt `color-mix(in srgb, var(--ink) 70%, transparent)` in der Regel. Das ist kein Farbliteral, und das helle Theme folgt über `--ink`.
