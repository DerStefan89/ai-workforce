# F45 W2a — Gates: Läufer + Inventur — Plan v2

Stand 27.10.2026. Plan v1 `plan-w2a.md` → Advisor `advisor-w2a.md` „Freigegeben mit Hinweisen“ (kein Schnitt). v1 bleibt
unverändert; hier nur, was sich ändert, plus die Bauliste.

## Entscheidungen zu den Advisor-Punkten

- **A1 = (a).** Begründung: F-1215 (offen, P2) weist genau diese Maßnahme W2a zu („git- und serverlastige Prüfungen
  grundsätzlich seriell … keine Wartegrenzen ohne Zeitfaktor“) — keine neue Abwägung, sondern Umsetzung des Findings.
  Kriterium 3 lautet jetzt: **wartet mit fester Frist ≤ 10 s auf Server-, Workflow- oder Kindprozess-Zustand, misst Zeit
  gegen eine feste Grenze, oder fiel unter Last schon aus.** Erhoben per Suche nach Fristen in `scripts/check-*.mjs`
  plus Advisor-Liste; großzügige Sicherheits-Timeouts (≥ 15 s für einen Prozess) zählen nicht.
  SERIELL damit 23 Gates (Σ ≈ 257 s einzeln gemessen, Rest ≈ 448 s parallel):
  - Repo-Baum: `check-docs`, `check-rules`, `check-f45-k-kontext`, `check-secrets`.
  - `startvorlagen/`-Schreiber: `check-f10-leitstand`, `check-f14-abbruch`, `check-f15-automat-real`.
  - Zeit/Frist/Ausfall: `check-f43-projekt-aufrufen`, `check-f20-zustand-poll`, `check-fix-zustand-poll-kosten`,
    `check-f652-pruefschritt`, `check-f656-pruefung-wiederholen`, `check-f659-review-korrektur-begruendung`,
    `check-f35-ws2-urteil-je-ak`, `check-f35-ws3-adjust-automatik`, `check-f45-b2b1-rueckweg`, `check-f45-b2b2-pruefer`,
    `check-f45-b2b3c-budget`, `check-f45-b2b3b1b-auswertung`, `check-f36-ws2-laufzeit`, `check-fixpaket-f36-nachlauf`,
    `check-f36-ws5b-skill`.
  - Echtes Home: `check-f45-f3b1-freigabe`.
  Erwartete Wanduhr (Messwerte, Sitzung): ≈ 4,5–6 min statt Σ 11,7 min. F-1215 wird damit für die Gates umgesetzt; der
  Teil „keine Wartegrenzen ohne Zeitfaktor“ bleibt W2b (Gates ändern) — F-1215 bleibt offen mit Nachtrag.
- **A2.** stdout und stderr je Gate getrennt gepuffert und auf `process.stdout` bzw. `process.stderr` zurückgeschrieben.
  Die Zusammenfassung steht ganz am Ende von stdout; je rotem Gate wiederholt sie die letzten 20 Zeilen seiner Ausgabe
  (stdout+stderr) und nennt das erste rote Gate zuerst („erstes rotes Gate zuerst lesen“, B7). Eine Schlusszeile mit den
  roten Gates geht zusätzlich auf stderr (stderr-Rest im Prüfergebnis).
- **A3.** `docs/harness/HARNESS-OVERVIEW.md` §5: Rückfallebene mit `AIW_GATES_PARALLEL=1` (PowerShell
  `$env:AIW_GATES_PARALLEL=1; npm run check:gates`).
- **A4.** Läufer heißt **`scripts/check-kette.mjs`** (unter `scripts/check-*`, keine Verwechslung mit
  `vorlagen/projekt-skelett/scripts/check-gates.mjs`). Exporte `GATES`, `SERIELL`, `leseParallelitaet`, `pruefeListe`,
  `fuehreKetteAus`.
- **A5.** Begründung für `.mjs`: Kommentare je SERIELL-Eintrag, eine Datei statt zwei. 1j schützt `.mjs` und `.json` unter
  `scripts/check-*` gleich.
- **Zusammenfassung ohne „fünf langsamste“** (Pflichtfrage): grün/rot, rote Gates mit Exit, Wanduhr, Σ Einzelzeiten.

## Läuft mit

- **B1** Läufer importiert nur `node:`-Module.
- **B2** F-1225 (1j schützt `scripts/teste.mjs`, `scripts/aufraeumen-nachlauf.mjs` nicht) als Finding.
- **B3/B4** `fuehreKetteAus(gates, seriell, { parallelitaet, starte, aus })`: `starte(befehl)` → Promise
  `{ exit, stdout, stderr, ms }` (Standard: echter Prozess); `aus` = `{ stdout(text), stderr(text) }`. Tests deterministisch
  mit steuerbaren Promises (höchstens N gleichzeitig, SERIELL überlappt nichts, Weiterlaufen nach Rot, Exit 0/1, Reihenfolge
  der Ausgabe, Zusammenfassung am Ende). Echte Prozesse nur: Exit-Code 3 über `shell: true`, stderr im stderr-Strom,
  Startfehler/Signal ⇒ rot (Signal über `node -e "process.kill(process.pid,'SIGTERM')"` nur unter POSIX, unter Windows
  übersprungen). Import ohne Wirkung: `import('./check-kette.mjs')` startet nichts.
- **B5** Startzeile `▶ <befehl>` je Gate sofort.
- **B6/B7** im Kopfkommentar DEKLARIERT.
- **B8** Commit-Block: ein voller Lauf mit Standard (Wanduhr) ist Pflicht (Auftrag); ein Vergleichslauf
  `AIW_GATES_PARALLEL=1` steht auskommentiert dabei (A1 = (a), daher nicht Pflicht).
- **B9** F-1205 bleibt offen.

## Bauliste

1. `scripts/check-kette.mjs` (neu) — Liste + Läufer.
2. `scripts/check-kette.test.mjs` (neu).
3. `package.json` `check:gates` → `node scripts/check-kette.mjs`.
4. `scripts/messe-check.mjs` — `GATES` aus `check-kette.mjs` statt `gateBefehle`.
5. `docs/harness/HARNESS-OVERVIEW.md` §5 (A3).
6. Inventur: Spalte Parallel-Risiko um „Frist“ nachziehen; Quelle `check-kette.mjs`.
7. Akte „Stand W2a“, F-1225, Nachtrag F-1215, Lagebild.

Sitzungsprüfung: `node --test scripts/check-kette.test.mjs`, Trockenlauf mit 6 leichten Gates über `fuehreKetteAus`,
Listenabgleich gegen `git show main:package.json`, `npm run lint`, `npm run typecheck`, einzelne leichte Gates. Kein voller
Lauf, kein `npm run test`.

## Nachtrag Prüfpass (27.10.2026)

Plan v2 bleibt als Stand vor dem Bau stehen. Nach code-reviewer/qa geändert: SERIELL läuft **zuerst** (qa 4), nicht danach;
Exit über `hauptprogramm` (qa 2); Schlusszeile „zuerst rot“ (qa 1); Erwartung der Wanduhr ≈ 6–7 min statt 4,5–6 min (cr 7,
qa 11); Commit-Block mit zwei Standardläufen (qa 3). Einzelheiten: Abschnitt „Stand W2a“ in `feature.md`.
