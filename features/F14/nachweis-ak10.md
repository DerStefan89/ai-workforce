# F14 AK10 — Nachweisprotokoll (Timeout, echter Kindprozess, Folgelauf im Kontextpaket)

Stand: 09.09.2026. Bedienung durch Stefan im Browser (Leitstand,
lokal, `LEITSTAND_STARTVORLAGE_PFAD=startvorlagen/beispielprojekt-kurze-zeitgrenze.json`),
Verifikation Klasse A durch den Technical Challenger, lesend über die
Bridge.

## Bedienphase

- Auftrag "F14-AK10-Timeout-Test" angelegt (auftragId
  `5dd582aa-140b-4a80-9b12-63a686c017e2`), Auftragstext: "Lies alle
  Dateien unter src/ und fasse die Modulstruktur zusammen."
- Ausgangslauf gestartet, werkzeugsatz `lesend`. laufId
  `f14-ak10-timeout-test-2026-09-09t14-28-3-1788964120719`.
- Real nach ≈16s (14:29:12.379Z → 14:29:28.426Z) in FEHLGESCHLAGEN
  geendet — echter Timeout bei zeitgrenzeMs=15000.
- "Wiederaufnahme starten" geklickt → Folgelauf laufId
  `f14-ak10-timeout-test-2026-09-09t14-28-3-1788964226720`, gestartet
  14:31:19.839Z.
- Folgelauf ebenfalls real in FEHLGESCHLAGEN/TIMEOUT geendet
  (14:31:35.327Z) — AK10 verlangt keinen Erfolg des Folgelaufs, nur
  dass er das Timeout-Ergebnis im Kontextpaket trägt.

## Belege Klasse A — real verifiziert (Technical Challenger, lesend über die Bridge)

| # | Prüfung | Ergebnis |
|---|---|---|
| A1 | Terminal-Wirkungsmarke Ausgangslauf: `ergebnis: FEHLGESCHLAGEN`, `daten.grund: 'timeout'`, `daten.art: 'TIMEOUT'`, `daten.beendigungsart: 'TIMEOUT'` | ✅ |
| A2 | Zeitspanne `run_prepared` → `terminal` Ausgangslauf ≈ 16s, konsistent mit `zeitgrenzeMs: 15000` | ✅ |
| A3 | Terminal-Wirkungsmarke Folgelauf: dieselben drei Felder, ebenfalls TIMEOUT | ✅ |
| A4 | Kontextpaket des Folgelaufs enthält Element `artefakt:laufakte-f14-ak10-timeout-test-2026-09-09t14-28-3-1788964120719` | ✅ |
| A5 | Hash-Abgleich: `inhalts_hash` dieses Kontextpaket-Elements (`68addf0bc1ee85d4ca81020fcbf0704413d6ace17ddda5ee4eee51bf924ec809`) gegen `inhalts_hash` der Ausgangslauf-Laufakte — exakt identisch, reale Bytegleichheit, kein indirekter Verweis | ✅ |
| A6 | Beide Läufe referenzieren denselben Auftrag (`auftrag-5dd582aa-140b-4a80-9b12-63a686c017e2`) | ✅ |

## Ergebnis

**AK10 erfüllt: JA.** Ein echter Claude-Code-Kindprozess lief real in
den 15-Sekunden-Timeout, das Ergebnis wurde real als TIMEOUT erfasst
(Terminal-Wirkungsmarke, nicht nur Laufstatus), und der über
"Wiederaufnahme starten" erzeugte Folgelauf trägt es nachweislich im
Kontextpaket — belegt über Hash-Abgleich, nicht über Behauptung.

Damit sind alle zehn Akzeptanzkriterien von F14 real erfüllt.
