<!--
Ziel-Pfad im Repo: state/reibung.md

Wofür diese Datei da ist: eine Zeile pro Reibungsvorfall — jeder Moment, in
dem etwas den Arbeitsfluss aufgehalten hat (ein Werkzeug, ein Gate, eine
Doku-Stelle, ein Befehl, der nicht griff). Sie liegt im Projekt-Repo statt
in einem fünften, separat gepflegten Repo, weil genau die Person, die
gerade abkürzt, nicht zu einem weiteren Ort wechselt, um die Abkürzung
festzuhalten.

Diese Datei trägt absichtlich KEINEN `Stand dieser Fassung:`-Marker.
`scripts/check-docs.mjs`, Prüfung 3, vergleicht innerhalb einer Datei jedes
Datum gegen diesen Marker und meldet jedes jüngere Datum als Befund. Diese
Datei ist ein Anhänge-Protokoll mit fortlaufend neuen Daten — mit Marker
würde jeder neue Eintrag das Doku-Gate rot färben. Kalibrierter Beleg für
diese Entscheidung: `state/gates.md`, Kalibrierungs-Log.

Ein Eintrag ist eine Zeile, kein Aufsatz.
-->

# Reibungs-Log — AI Workforce

| Datum | Was hat aufgehalten | Wo (Datei/Schritt) | Kosten (grob) | Erledigt? |
|---|---|---|---|---|
| 2026-09-25 | checkout main vor Merge der Zustandssicherung | Terminal-Block des Challengers | ~15 min, kein Verlust | ja (F-737) |
| 2026-09-25 | F-735-Nachtrag (Doku-Nachzug) nicht angekommen | Prompt-Übergabe | Nachzug verschoben | ja (dieser PR, F-739) |
| 2026-09-25 | Freigabedatei für manuelle Commits verlangt | Skriptausgabe zustand:sichern | Rückfrage | ja (F-736) |
| 2026-09-23 | EPERM beim Aufräumen kontrollzustand-test-* (`raeumeVerzeichnis` warnt jetzt statt zu werfen, Reste meldet `scripts/aufraeumen-nachlauf.mjs` nur als Hinweis, kein Befund; `maxRetries` bleibt 10, F-591) | npm run check | wiederholte Läufe | ja (F-590, #228) |
| offen | Perf-Gate zustand-poll-kosten sporadisch rot | npm run check | Wiederholung nötig | nein (eigenes Finding bei nächstem Auftreten) |
| 2026-09-26 | npm run check rot (0xC000012D, kein virtueller Speicher), weil der Reviewer-Agent parallel lief | npm run check während Subagent-Lauf | ein Wiederholungslauf | ja (Wiederholung ohne Parallellast grün; erste Beobachtung) |
| laufend | PowerShell 5: ConvertFrom-Json scheitert an ~/.claude.json | manuelle Diagnose | Umweg über `node -e` | Workaround |
