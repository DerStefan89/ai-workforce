<!-- Ziel-Pfad im Repo: state/assumption-ledger.md -->
# Assumption Ledger — [PROJEKTNAME]

Jede Annahme, die getroffen wurde, weil eine sichere Klärung zu teuer oder
nicht verfügbar war (`[Annahme]`-Marker aus einem Bericht) — mit Datum,
Fundstelle und Status. Ziel: eine Annahme verschwindet nicht stillschweigend,
sondern wird entweder bestätigt, widerlegt, oder bleibt sichtbar offen.

| Datum | Annahme | Fundstelle (Bericht/Commit) | Status | Aufgelöst am |
|---|---|---|---|---|
| 2026-08-28 | Claude-Code-Version zum Zeitpunkt der TP-Belege ist eindeutig bestimmbar | `claude/13_TP_ERGEBNISSE_LAUFEND.md`; Vertrag `tp-03d-wirkungsgrenze-und-hash-baseline`, `state/tp-nachtrag.md` Abschnitt „Schritt 1" | offen | |
| 2026-08-28 | Dreifache Freigabe pro Iteration ist ungemessen (aus B3) | `state/tasks/tp-03d-wirkungsgrenze-und-hash-baseline.md` SCOPE 7 (b) | offen | |
| 2026-08-28 | Verhalten an der Kontingentgrenze ist ungemessen | `state/tasks/tp-03d-wirkungsgrenze-und-hash-baseline.md` SCOPE 7 (c) | offen — bewusst nicht gemessen, Messfall C ausgelassen, siehe `state/tp-nachtrag.md` Abschnitt TP-01e (28.08.2026) | |
| 2026-08-28 | `.claude/hooks/commit-guard.cjs` bildet den Pfad zur Freigabe-Datei aus `eingabe.cwd \|\| process.cwd()` — liegt das Arbeitsverzeichnis der Bash-Sitzung nicht auf der Repo-Wurzel, zeigt der Pfad ins Leere und der Hook meldet fälschlich „keine Freigabedatei". Geerbt aus der Vorfassung vor Befund B6, mit `state/plan-v2-harness-freigabedatei-wiederherstellung.md` unverändert reaktiviert, nicht behoben (Reparatur wäre ein eigener Vertrag). | `state/advisor-findings-harness-freigabedatei-wiederherstellung.md` Finding 5; `.claude/hooks/commit-guard.cjs` (Aufgabe 3) | offen — bewusst nicht behoben | |
