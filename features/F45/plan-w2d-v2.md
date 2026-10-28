# F45 W2d — Doku-Diät — Plan v2

Stand 28.10.2026. Grundlage: `plan-w2d.md` (v1) und Advisor-Pass im frischen Kontext „Freigegeben mit Hinweisen“, kein
Schnitt (Befunde A1–A10, Bericht in der Sitzung). v1 gilt weiter, soweit hier nichts anderes steht.

## Änderungen gegenüber v1

- **A1 (Kern):** Die drei §2-Unterpunkte „Weitere Ausnahmen“ (vier Ausnahmen) sind Schreibregeln, keine Herleitung — das Verschieben weicht
  von der Kopfregel in `ARCHITECTURE.md` ab („die Herleitung wandert, die Regel bleibt als Satz hier“). Unter den Vorgaben
  (wörtlich, ≥ 1 000 Bytes, Deckel bleibt) gibt es keine bessere Stelle: §1 W1, §3 und §4 sind per Gate an den Wortlaut
  gebunden, §2 Arbeitsordner trägt Durchsetzungsgrade, echte Herleitung umfasst nur wenige hundert Bytes. **Bestätigt durch
  den Challenger (28.10.2026).** Vermerkt als Zeile unter „Entscheidungen“ in der Akte und in F-1242. Neue Überschrift in
  `docs/architektur/lokale-dateien.md` mit dem Hinweis: bis W2d Wortlaut des Kerns, eine Regeländerung ändert Kurz- und
  Langfassung gemeinsam. Die neue Namenszeile im Kern wird gemessen (höchstens ≈ 280 Bytes).
- **A2:** Es wandern **39** Stand-Abschnitte (B0 bis W2b-1), nicht 38.
- **A3:** F-917 trägt im Körper „Status: entschieden …“, nicht „offen“; F-979, F-1087, F-1157 tragen später „Erledigt (…)“.
  Alle vier wandern nach der Kopfzeile mit; die Restvermerke werden im Bericht genannt, kein Status geändert.
- **A4:** Keine Zeile des Kopfabsatzes der Akte beginnt mit `Status:`, `Priorität:`, `Abgenommen:` oder `## `. Die Alternative
  „HTML-Kommentar“ entfällt.
- **A5:** Regeltext ergänzt: die letzten drei Stand-Abschnitte (auch der eines laufenden Pakets) bleiben; am Ende von
  `akte-archiv.md` anfügen; gesammelt, wenn die Akte spürbar gewachsen ist; DEKLARIERT (kein Gate).
- **A6:** memory-map-Zusatz bleibt; Begründung: einziger aktenübergreifender Ort für eine Regel „für jede Feature-Akte“
  (Präzedenz Zeile „Findings“). Gemeldet als kleine Ergänzung des Umfangs.
- **A7 (Challenger, 28.10.2026):** keine E-Kennung (E-Kennungen sind Stefans Entscheidungen). Stattdessen neu **F-1243**
  `PROCESS_IMPROVEMENT` P2 offen (Sichtung des offenen Registerbestands vor F30) und unter „Entscheidungen“ eine Zeile ohne
  Kennung: „Erkenntnis W2d: Registergröße kommt vom offenen Bestand, nicht von erledigten Resten — Sichtung vor F30, siehe
  F-1243.“ Gemessen: 711 Kopfzeilen `offen…`, davon 363 P3; der Archivlauf bringt 25 Einträge.
- **A8:** Server-Kommentar: nur die Zahl; die Mischung mit der Messung vom 10.10.2026 wird im Bericht genannt.
- **A9:** Die 25 Einträge verschwinden aus den Workboard-Ansichten für Erledigtes — bekannte Grenze aus K (F-1139).
- **A10:** Kontrollskripte bestimmen die Blöcke mit `KOPFZEILE`/`ARCHIVREGEL` aus `check-f21-workboard.mjs` und prüfen
  genau 25 bzw. 39; beide Vergleiche ohne abschließende Leerzeilen.
- **Projektkarte:** Länge und Lage von §7 bleiben gleich; Text und Hash von §2 ändern sich (weiter hinten stehende
  §2-Regeln rücken ins 2 000-Zeichen-Fenster).
