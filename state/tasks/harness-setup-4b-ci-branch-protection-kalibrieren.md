SCHRITT 0: Arbeitsverzeichnis ausgeben und gegen das im Auftrag genannte
Zielverzeichnis prüfen. Bei Abweichung: abbrechen, melden, nichts ändern.
Danach `git log --oneline -1` gegen main ausgeben und gegen den unten
genannten Commit prüfen. Bei Abweichung: anhalten, Wert nennen, nichts
ändern. Danach `git status --short` ausgeben und protokollieren, bevor
irgendetwas geändert wird.

Zielverzeichnis: C:\Users\stefa\Projekte\ai-workforce
Erwarteter main-Stand: fde07ff

## TASK: harness-setup-4b-ci-branch-protection-kalibrieren

GOAL:
Die CI-Zeile in `state/gates.md` hat einen echten, nach AP 4a erzeugten
Rot- und Grün-Fall (nicht den alten AP-3-Beleg, der vor `biome.json`
entstand). Die Branch-Protection-Zeile hat entweder einen echten Rot-/
Grün-Fall — falls die Regel bereits existiert und durchgesetzt wird —
oder einen belegten, ehrlichen Befund, dass/wie sie fehlt oder unwirksam
ist. Keine `[FÜLLUNG]`-Zelle mehr in beiden Zeilen mit Prüfanspruch.
Prüfbar an: `state/gates.md`, CI- und Branch-Protection-Zeile, beide ohne
`[FÜLLUNG]`, mit Original-Belegen (PR-Link, CI-Run-Link, `gh api`-Ausgabe).

CONTEXT:
- [Fakt] `state/gates.md`, aktuelle Zeilen: CI | `.github/workflows/
  ci.yml` | „npm run check auf frischer Maschine + Secret-Scan" |
  `[FÜLLUNG]` | `[FÜLLUNG]`. Branch Protection | „GitHub-Repo-Einstellung,
  kein Datei-Artefakt (siehe SETUP.md Punkt 1)" | „Required Status Check
  `check` vor Merge auf `main`, ohne Admin-Bypass" | `[FÜLLUNG]` |
  `[FÜLLUNG]`.
- [Fakt] `SETUP.md`, Punkt 1: Branch Protection ist reine GitHub-
  Einstellung, kein Template-Artefakt. „Do not allow bypassing the above
  settings" muss aktiv sein. Bei **privaten** Repos auf einem
  **persönlichen GitHub-Free-Konto** wird die Regel zwar angelegt, aber
  **nicht durchgesetzt** (GitHub zeigt „Not enforced") — erforderlich ist
  GitHub Pro oder ein Team-/Enterprise-Konto. Bei öffentlichen Repos
  greift sie auch im Free-Tarif.
- [Fakt] `state/advisor-findings-harness-setup.md`: Ist-Zustand der
  Branch-Protection-Regel war zuletzt „aus dem Repo heraus nicht
  feststellbar" — dieser Vertrag stellt ihn erstmals real fest.
- [Fakt] `state/tooling.md`: `gh` CLI `2.98.0` bereits installiert und
  für AP 3 verwendet.
- [Fakt] AP 3 hat einen echten grünen CI-Lauf belegt (Run 32494340548) —
  aber **vor** `biome.json`. Mit AP 4a prüft `npm run check` jetzt echte
  Linter-Regeln, die vorher praktisch folgenlos waren. Der AP-3-Beleg ist
  für den heutigen `check`-Umfang nicht mehr aktuell — dieser Vertrag
  braucht einen neuen CI-Lauf-Beleg nach AP 4a.

SCOPE:
1. Repo-Metadaten feststellen: `gh repo view --json owner,name,
   visibility` — Sichtbarkeit (öffentlich/privat) und damit die
   Tarif-Implikation aus SETUP.md Punkt 1 festhalten.
2. Ist-Zustand der Branch-Protection-Regel für `main` **nur lesend**
   abfragen: `gh api repos/{owner}/{repo}/branches/main/protection`.
   Wörtliche Ausgabe sichern: existiert die Regel? Welcher Required
   Status Check ist gesetzt (Name muss `check` sein, wie in
   `.github/workflows/ci.yml` benannt)? Ist Admin-Bypass-Schutz
   (`enforce_admins`) aktiv?
3. CI-Rot-Fall (unabhängig vom Ergebnis aus Schritt 2, immer
   durchführen): Wegwerf-Branch von `main` abzweigen
   (`harness-setup-4b-ci-rotfall`), eine echte Regelverletzung einbauen
   (dieselbe Art Testzeile wie in AP 4a — `const temp_rotfall_any: any =
   1` in `scripts/_mode.ts` reicht), pushen, PR gegen `main` öffnen
   (`gh pr create`), CI-Lauf verfolgen (`gh pr checks --watch` oder
   `gh run watch`). Muss rot werden. PR-Link, Run-Link und die
   entscheidende Fehlerzeile aus dem CI-Log wörtlich sichern.
4. CI-Grün-Fall: Testzeile entfernen, erneut pushen, CI-Lauf erneut
   verfolgen. Muss grün werden. Run-Link sichern.
5. Falls Schritt 2 zeigt, dass die Regel existiert UND durchgesetzt wird
   (Required Status Check `check` gesetzt, `enforce_admins` aktiv, kein
   Free-Tarif-Hinweis auf Nichtdurchsetzung): Branch-Protection-Rot-Fall
   — versuchen, den PR aus Schritt 3 **während CI noch rot war**
   (Wegwerf-Branch dafür neu anlegen, Verstoß erneut einbauen, PR erneut
   öffnen) zu mergen (`gh pr merge`). Muss von GitHub verweigert werden.
   Original-Fehlermeldung sichern.
6. Falls Schritt 2 zeigt, dass die Regel **fehlt** oder **nicht
   durchgesetzt** wird (fehlender Required Status Check, `enforce_admins:
   false`, oder Free-Tarif-Hinweis „Not enforced"): Schritt 5 entfällt.
   Stattdessen NICHT selbst über `gh api` (PUT/PATCH) die Regel anlegen
   oder ändern — das geht an ESCALATE.
7. Branch-Protection-Grün-Fall (nur falls Schritt 5 durchgeführt wurde):
   Nach dem Grün-Fall aus Schritt 4 mit `gh pr view --json mergeable`
   belegen, dass GitHub den PR jetzt als mergefähig einstuft. **Nicht
   selbst mergen.**
8. Alle in Schritt 3–7 angelegten Wegwerf-Branches und -PRs aufräumen:
   PRs schließen ohne Merge, Branches lokal und remote löschen.
9. `state/gates.md`, CI- und Branch-Protection-Zeile von `[FÜLLUNG]` auf
   die echten Belege umstellen (oder, im Fall von Schritt 6, auf einen
   ehrlichen „nicht durchgesetzt/nicht vorhanden"-Befund statt einer
   erfundenen Grün-Zeile) — plus Kalibrierungs-Log-Absatz im
   vorhandenen Stil.
10. Commit ausschließlich `state/gates.md`, Diff zeigen, Freigabe
    einholen, committen, pushen.
11. Abschließend zeigen: `git log --oneline -1`, `git status --short`,
    vollständiger Diff von `state/gates.md`.

NICHT:
- Branch-Protection-Regel selbst anlegen oder ändern (`gh api` mit
  PUT/PATCH), egal was Schritt 2 zeigt — nur lesen und berichten.
- Kein echter Merge irgendeines Test-PRs auf `main`.
- Keine Änderung an `biome.json` oder den AP-4a-Belegen.
- Kein `git add -A`/`git add .`.
- Keine Behauptung „Grün-Fall belegt" für eine Regel, die laut Tarif gar
  nicht durchgesetzt wird — das wäre ein falsches Kalibrierungs-Ergebnis.

BUDGET:
Ein Durchgang plus höchstens eine Korrekturrunde.

OUTPUT:
- Repo-Sichtbarkeit und Tarif-Implikation.
- Wörtliche `gh api`-Ausgabe zum Ist-Zustand der Branch-Protection-Regel.
- CI-Rot-/Grün-Fall mit PR-Link und CI-Run-Link.
- Branch-Protection-Rot-Fall mit Original-Fehlermeldung — oder, falls
  nicht durchführbar, der begründete Befund aus Schritt 6.
- Vollständiger Diff von `state/gates.md`.
- Ein Commit, gepusht.

ESCALATE:
- Branch-Protection-Regel existiert nicht oder ist nicht wie in SETUP.md
  Punkt 1 beschrieben konfiguriert → nach Schritt 2/6 anhalten, Ist-
  Zustand vollständig berichten, NICHT selbst anlegen. Das ist eine
  Repo-Sicherheitsentscheidung für Stefan/den Projektchat, kein
  Ausführungsschritt.
- Repo ist privat und der Tarif unterstützt keine Durchsetzung
  (Free-Tarif-Hinweis „Not enforced") → dasselbe: berichten, nicht als
  wirksames Gate verbuchen.
- CI-Rot-Fall (Schritt 3) löst NICHT aus → anhalten, das widerspräche
  AP 4a (dasselbe lokale Gate hat dort funktioniert) — nicht selbst
  erklären, vollständig berichten.
- Ein Hook meldet sich lokal (Commit-Guard, Settings-Guard) → anhalten,
  Meldung zeigen, keine Freigabe-Datei anlegen.
- Arbeitsverzeichnis oder main-Stand weichen von `fde07ff` ab →
  anhalten, beide Werte nennen, nichts ändern.
