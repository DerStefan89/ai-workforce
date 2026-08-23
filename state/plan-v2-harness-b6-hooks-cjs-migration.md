<!-- Ziel-Pfad im Repo: state/plan-v2-harness-b6-hooks-cjs-migration.md -->
# Plan v2 — Befund B6, Hook-Reparatur (ESM/CommonJS)

Stand: 22.08.2026. Ausführungsreife Fassung nach Advisor-Pass.

Herkunft: `state/plan-v1-harness-b6-hooks-cjs-migration.md` (Vertragstext
plus Nachträge 1–3, N1–N22) und
`state/advisor-findings-harness-b6-hooks-cjs-migration.md` (Urteil:
Freigegeben mit Hinweisen). Beide Dateien bleiben unverändert stehen —
Schritt 9 des Advisor-Pass-Skills. Diese Datei ist die konsolidierte
Fassung; wo sie von v1 abweicht, gilt sie.

**Zeilennummern gibt es hier nicht.** Sämtliche Angaben aus v1 waren
ungültig (N15, Abweichung bis 139 Zeilen). Gesucht wird über Inhalt.

**Ausführungsort:** Worktree
`C:\Users\stefa\claude-worktrees\ai-workforce-b6`, Branch
`harness-b6-hooks-cjs-migration`, angelegt von `main`@`be09527`.

**Vor dem Lauf:** Den Vertragstext unten wörtlich als
`state/tasks/harness-b6-hooks-cjs-migration.md` ablegen. Er wird im selben
PR mitcommittet (Regel aus `state/gates.md`, Eintrag 2026-08-22
„Prozess-Lücke").

---

## Vertragstext — `state/tasks/harness-b6-hooks-cjs-migration.md`

```
SCHRITT 0: Arbeitsverzeichnis ausgeben und gegen das im Auftrag genannte
Zielverzeichnis prüfen. Bei Abweichung: abbrechen, melden, nichts ändern.

## TASK: harness-b6-hooks-cjs-migration

GOAL:
Vier PreToolUse/UserPromptSubmit/SessionStart/PreCompact-Hooks laden nach
Einführung von `"type": "module"` nicht mehr und lassen den Commit-Guard
fail-open statt fail-closed laufen. Nach diesem Vertrag laden alle fünf
Hooks unter dem ESM-Projekt fehlerfrei, der Commit-Guard verweigert wieder
nachweislich ohne Freigabe-Datei, und kein Pfadverweis im Repo zeigt auf
einen umbenannten Hook.

CONTEXT:
- [Fakt] `package.json` enthält `"type": "module"`.
- [Fakt] `.claude/settings.json` referenziert fünf Hooks mit der Endung
  `.js`. Vier davon sind zu ändern: `commit-guard`, `session-reminder`,
  `zwischenstand-laden`, `zwischenstand-pruefen`. Die
  `guard-settings.js`-Zeile bleibt unverändert.
- [Fakt] Vier der fünf Dateien nutzen CommonJS-Syntax, die unter
  `"type": "module"` nicht mehr funktioniert:
  `commit-guard.js` (`require("fs")`, `require("path")`,
  `require.main === module`, `module.exports`), `session-reminder.js`
  (`fs`, `os`, `path`), `zwischenstand-laden.js` (`fs`, `path`,
  `child_process`), `zwischenstand-pruefen.js` (`fs`, `path`,
  `child_process`). Nur `commit-guard.js` hat `module.exports`.
- [Fakt] `guard-settings.js` enthält keine Zeile mit `require(`,
  `module.exports`, `import` oder `export` — reines stdin/JSON/stdout. Sie
  lädt unter ESM unverändert und wird NICHT umbenannt.
- [Fakt] Der Kopfkommentar von `commit-guard.js` dokumentiert den Hook als
  bewusste Abweichung von der Fail-Open-Konvention der übrigen Hooks:
  fail-closed, weil „ein Guard, der bei Störung durchlässt, kein Guard
  ist".
- [Schlussfolgerung] Der Fehler liegt nicht in der Guard-Logik — die ist
  per `try`/`catch` und `verweigern()` im `catch`-Zweig fail-closed
  abgesichert. Er liegt eine Ebene davor: Ein `ReferenceError: require is
  not defined` beim Laden des Moduls tritt auf, bevor dieser Code erreicht
  wird. Ein beim Laden crashender Hook wirkt wie „kein Hook registriert" —
  das Fail-Closed-Design wird umgangen, nicht verletzt.
- [Fakt, laut `claude/42_UEBERGABE_NEUER_CHAT_7.md`, in dieser Kette nicht
  reproduziert] Ein diagnostischer Test (`git commit --allow-empty` auf
  Branch `diagnose-hook-crash`, ohne Freigabe-Datei) erzeugte Commit
  `a9cd6ed` ohne Abbruch. Der Branch existiert lokal, wurde nie gepusht.
- [Fakt] Der Endungswechsel `.js` → `.cjs` ist nicht nur der einfachere,
  sondern der einzige regelkonforme Weg: `commit-guard.js` nutzt
  `require.main === module`. Eine ESM-Umschreibung bräuchte dafür einen
  `import.meta`-Ersatz und damit eine Änderung der Ausführungslogik — was
  die NICHT-Klausel dieses Vertrags verbietet.
- [Fakt] Reparaturumfang, vollständig ermittelt durch repo-weiten Grep der
  vier Altnamen: 28 Dateien mit Treffern, klassifiziert in der Tabelle
  unter SCOPE 10. Die frühere „Drei-Gruppen"-Liste war unvollständig.
- [Fakt] Reihenfolge im Vertragspaket: B6 → 1 → 2 → 4 → 3. Vertrag 1 liegt
  nicht auf `main`; die Auflage zu den Tokens `gh`/`merge` greift für
  diesen Lauf nicht.
- [Fakt] Keine Zeilennummern in diesem Vertrag. Alle Stellen werden über
  Inhalt gesucht.

SCOPE:
1. Arbeitsverzeichnis bestätigen. `git status` zeigen: sauber bis auf die
   erwarteten unversionierten Dateien `state/plan-v1-…md`,
   `state/plan-v2-…md`, `state/advisor-findings-…md` und den unter
   `state/tasks/` abgelegten Vertragstext. Jeder weitere untracked- oder
   modified-Eintrag ist ein ESCALATE-Fall. NICHT neu branchen — der
   Worktree steht bereits auf dem richtigen Branch (`git-flow` Schritt 2).
2. Rot-Fall-Beleg VORHER: auf einem Wegwerf-Branch ohne Freigabe-Datei
   `git commit --allow-empty -m "diagnose-vorher"`. Wortlaut zeigen.
   Zusätzlich den rohen Hook-Fehlertext zeigen, soweit der Harness ihn
   sichtbar macht; zeigt er keinen, das ausdrücklich festhalten — dann
   bleibt der Mechanismus hergeleitet statt gemessen. Wird der Aufruf
   verweigert statt durchgelassen: ESCALATE, nicht weitermachen.
   Wegwerf-Branch danach löschen, nie pushen.
3. Die vier Dateien per `git mv` umbenennen (Historie erhalten):
   `commit-guard.js` → `commit-guard.cjs`,
   `session-reminder.js` → `session-reminder.cjs`,
   `zwischenstand-laden.js` → `zwischenstand-laden.cjs`,
   `zwischenstand-pruefen.js` → `zwischenstand-pruefen.cjs`.
   `guard-settings.js` NICHT umbenennen.
4. `git status` zeigen und belegen, dass alle vier als Rename (`R`)
   erscheinen — nicht als getrenntes Delete+Add und nicht gar nicht.
   Abweichung: ESCALATE.
5. Pfadverweise INNERHALB der Hook-Dateien nachziehen — fünf Stellen:
   `commit-guard.cjs` Kopfzeile `Datei: …` sowie der Querverweis „siehe
   Kopfkommentar zwischenstand-laden.js";
   `zwischenstand-laden.cjs` Kopfzeile `Datei: …`;
   `zwischenstand-pruefen.cjs` Kopfzeile `Datei: …`;
   `guard-settings.js` Kopfkommentar-Verweis auf
   `(.claude/hooks/commit-guard.js)`.
   `session-reminder.cjs` trägt keinen solchen Verweis.
   Die Änderung an `guard-settings.js` ist eine reine Pfadkorrektur im
   Kommentar und ausdrücklich zugelassen (siehe NICHT).
6. `.claude/settings.json`: die vier `command`-Zeilen der umbenannten
   Dateien auf `.cjs` nachziehen. Die `guard-settings.js`-Zeile
   unverändert lassen.
7. Jeden der vier umbenannten Hooks einzeln mit einer synthetischen
   `stdin`-Eingabe aufrufen (`echo '{...}' | node .claude/hooks/<name>.cjs`)
   und Exit-Code plus `stdout`/`stderr` zeigen. Kein
   `ReferenceError: require is not defined`, kein sonstiger Ladefehler.
8. Rot-Fall-Beleg NACHHER: neuer Wegwerf-Branch, keine Freigabe-Datei,
   derselbe Aufruf wie Schritt 2. Muss jetzt verweigert werden. Wortlaut
   zeigen. Der Beleg gilt nur, wenn die Meldung mit `commit-guard:`
   beginnt. Läuft er durch: sofort anhalten, Umbenennung per `git mv`
   zurückholen, melden.
9. Grün-Fall: gültige, frische `state/freigabe-commit.md` vom Menschen
   anlegen lassen, auf einem Wegwerf-Branch committen → muss durchlaufen.
   Wortlaut zeigen. Wegwerf-Branches danach löschen, nie pushen.
10. `grep -rn` im gesamten Repo nach den vier Altnamen. Vollständiges
    Ergebnis zeigen und gegen diese Klassifikation abgleichen:

    | Gruppe | Dateien | Behandlung |
    |---|---|---|
    | Funktional | `.claude/settings.json` | Schritt 6 |
    | Hook-Dateien selbst | `commit-guard`, `zwischenstand-laden`, `zwischenstand-pruefen`, `guard-settings` | Schritt 5 |
    | Lebende Doku | `docs/harness/HARNESS-OVERVIEW.md`, `docs/harness/zaehne-taxonomie.md`, `docs/guide/02-DEEPDIVE-claude-ordner.md`, `docs/guide/03-DEEPDIVE-gates.md`, `docs/guide/07-TOKEN-SPAREN.md`, `state/gates.md` (nur Gate-Tabelle) | Schritt 11 |
    | Kommentar ohne Wirkung | `.gitignore` | Schritt 11 |
    | Aktiver, unausgeführter Vertrag | `state/tasks/harness-b1b3-merge-guard-und-git-flow.md` | Schritt 12 |
    | Protokoll, bleibt | `state/gates.md` unterhalb `## Kalibrierungs-Log` | nicht anfassen |
    | Historische Vertragsakten | `docs/harness/programm-historie/*`, `state/tasks/harness-setup-*.md` | nicht anfassen |
    | Plan-/Advisor-Dateien dieses Vertrags | `state/plan-v1-…`, `state/plan-v2-…`, `state/advisor-findings-…` | nicht anfassen, beschreiben den Ausgangszustand |

    Treffer in einer hier gelisteten Datei werden nach Tabelle behandelt.
    Treffer in einer NICHT gelisteten Datei: anhalten, vollständige
    Fundliste zeigen, nicht selbst einordnen — ESCALATE.
11. Lebende Doku auf `.cjs` nachziehen: die sechs oben gelisteten Dateien
    plus den `.gitignore`-Kommentar. In `state/gates.md` ausschließlich die
    Gate-Tabelle (Spalten `Gate` und `Datei` der Zeilen zu `commit-guard`
    und Zwischenstand-Loop); die `guard-settings.js`-Zeile bleibt.
    Alles unterhalb von `## Kalibrierungs-Log` bleibt unverändert — es sind
    datierte Protokolle realer `.js`-Läufe.
12. `state/tasks/harness-b1b3-merge-guard-und-git-flow.md`: die Vorkommen
    von `commit-guard.js` auf `commit-guard.cjs` nachziehen —
    ausschließlich die Dateinamen, kein Eingriff in GOAL, CONTEXT, SCOPE,
    NICHT, BUDGET, OUTPUT oder ESCALATE dieses fremden Vertrags. Am Ende
    der Datei anfügen: „Nachtrag <Datum>: Dateinamen durch Vertrag
    `harness-b6-hooks-cjs-migration` von `.js` auf `.cjs` nachgezogen.
    Wortlaut sonst unverändert." Den Diff dieser Datei separat zeigen.
13. `docs/harness/programm-historie/*` und `state/tasks/harness-setup-*.md`
    ausdrücklich NICHT anfassen.
14. `npm run check` laufen lassen. Wortlaut/Exit-Code zeigen. Deckt das
    Doku-Gate (`scripts/check-docs.mjs`) die Hook-Pfade nicht ab: das ist
    ein Befund, kein Blocker — im Bericht ausdrücklich benennen.
15. `state/gates.md`: am Ende des Abschnitts `## Kalibrierungs-Log` einen
    Eintrag mit Datum, Bezug auf Befund B6, den Wortlauten aus Schritt 2,
    8 und 9 sowie dem Mechanismus (Crash-beim-Laden umgeht das eigene
    Fail-Closed-Design) anfügen. Bestehenden Text nicht löschen. Zielzeile
    für die Tabellenkorrektur ist die Zeile, die mit
    `| \`commit-guard.js\`-Hook |` beginnt — über Inhalt suchen, keine
    Zeilennummer raten.
16. `diagnose-hook-crash` löschen (`git branch -D diagnose-hook-crash`),
    Ergebnis wortwörtlich festhalten. Im Bericht vermerken, dass damit der
    einzige erreichbare Beleg-Commit `a9cd6ed` verschwindet — ersetzt
    durch den neuen Rot-Fall aus Schritt 2.
17. Commit über Branch + PR nach `git-flow`, CI-Status melden, NICHT
    selbst mergen.

NICHT:
- Inhaltliche Logik eines der fünf Hooks ändern — reiner
  Modulformat-Wechsel, keine Verhaltensänderung.
- `.claude/hooks/guard-settings.js` umbenennen oder inhaltlich ändern.
  Ausdrücklich zugelassene Ausnahme: die Pfadkorrektur im Kopfkommentar
  (Schritt 5). Sie ändert weder Verhalten noch Dateinamen noch Logik.
- `"type": "module"` aus `package.json` zurücknehmen — bewusste
  AP-1-Entscheidung, keine Fehlkonfiguration.
- `docs/harness/programm-historie/*`, `state/tasks/harness-setup-*.md`
  oder das Kalibrierungs-Log in `state/gates.md` ändern.
- Am fremden Vertragstext (Schritt 12) etwas anderes als Dateinamen
  ändern.
- Die Vertragspaket-Reihenfolge (B6 → 1 → 2 → 4 → 3) vorgreifen oder
  verändern.
- `diagnose-hook-crash` pushen oder wiederverwenden.
- Die 68 unkommittierten Zeilen der Vertrag-1-Arbeit im Haupt-Arbeitsbaum
  anfassen. Sie gehören zu Vertrag 1, nicht hierher.
- Projektchat-Dokumente (`claude/*.md`) anfassen.

BUDGET:
Ein Baudurchgang plus bis zu zwei Korrekturrunden — eine für Schritt 1–10
(Beleglage), eine für Schritt 11–17 (Reparatur und PR).

OUTPUT:
- `git diff --staged` vollständig zeigen, ausdrückliches „ja" abwarten.
- Wortlaut aller Fälle aus Schritt 2, 4, 7, 8, 9.
- Vollständiges `grep`-Ergebnis aus Schritt 10, jeder Treffer einer
  Tabellenzeile zugeordnet.
- Separater Diff von `state/tasks/harness-b1b3-merge-guard-und-git-flow.md`
  (Schritt 12) als Beleg, dass nur Dateinamen geändert wurden.
- Gezielter Nachweis, dass in `state/gates.md` unterhalb von
  `## Kalibrierungs-Log` keine Zeile verändert wurde außer dem neuen
  B6-Eintrag.
- `npm run check`-Ergebnis im Wortlaut, inklusive ausdrücklicher Aussage
  zur Deckungslücke beim Doku-Gate.
- Klarer Satz zum Status von `diagnose-hook-crash`.
- PR-Link und CI-Status. NICHT selbst mergen.

ESCALATE:
- Rot-Fall VORHER (Schritt 2) verweigert statt durchzulassen →
  CONTEXT-Prämisse widerlegt, anhalten, keine Reparatur, melden.
- Rot-Fall NACHHER (Schritt 8) läuft durch statt zu verweigern → sofort
  anhalten, `git mv` zurückholen, melden.
- Grün-Fall (Schritt 9) wird verweigert → anhalten, nicht eigenmächtig
  nachbessern, melden.
- Ein `git mv` erscheint nicht als Rename (Schritt 4) → anhalten,
  `git status` im Wortlaut zeigen, nicht selbst nachbessern.
- `grep`-Treffer (Schritt 10) in einer nicht gelisteten Datei → anhalten,
  vollständige Fundliste zeigen, nicht selbst einordnen.
- `git status` zu Beginn zeigt mehr als die erwarteten unversionierten
  Dateien → anhalten, Ausgabe zeigen.

FOLGT:
- Nach diesem Vertrag ist Vertrag 1
  (`harness-b1b3-merge-guard-und-git-flow`) an der Reihe. Seine SCOPE 2–4
  sind bereits gebaut, liegen aber unkommittiert im Haupt-Arbeitsbaum und
  betreffen die dann umbenannte Datei — sie müssen von Hand auf
  `commit-guard.cjs` übertragen werden. Kopien unter `_backup-vertrag1/`.
```

---

## Herkunft der Änderungen gegenüber v1

| Änderung | Quelle |
|---|---|
| Vollständige Klassifikationstabelle statt „drei Gruppen" | Advisor-Finding 1 + Gegenprüfung (28 Dateien) |
| Neuer Schritt 5 (fünf Pfadverweise) | Finding 2 + zwei selbst gefundene Zusatztreffer |
| Neuer Schritt 4 (Rename-Nachweis) + ESCALATE | Finding 5 |
| Hook-Fehlertext in Schritt 2 | Finding 3 |
| Kalibrierungs-Log-Nachweis in OUTPUT | Finding 4 |
| BUDGET auf zwei Korrekturrunden | Finding 6, Stefan-Entscheidung O2 |
| Alle Zeilennummern entfernt | Finding 7 |
| SCOPE 1 „sauber bis auf erwartete Dateien" | Finding 8 |
| `.cjs`-Begründung statt `[Annahme]` | Auftragspunkt 4, N21 |
| Schritt 12 (fremder Vertragstext) | Stefan-Entscheidung O1 (Option A) |
| NICHT-Ausnahme für `guard-settings.js` | Stefan-Entscheidung O3 |
| `zaehne-taxonomie.md` in der Doku-Gruppe | Finding 1 |
| Worktree, kein Neu-Branchen | N12/N19 |

## Bewusst mitlaufende Restrisiken

`[offene Unsicherheit]` Der Crash-Mechanismus bleibt hergeleitet, solange
der Harness in Schritt 2 keinen Hook-Fehlertext sichtbar macht. Schritt 2
verlangt, das ehrlich festzuhalten, statt es als bewiesen zu führen.

`[offene Unsicherheit]` Es gibt keinen automatischen Fänger dafür, dass die
Trennung Gate-Tabelle / Kalibrierungs-Log eingehalten wird — nur den
Nachweis in OUTPUT.

`[Fakt]` Mit Schritt 12 ändert erstmals ein Vertrag den Text eines anderen.
Die Grenze steht in Plan v1, N22: nur bei unausgeführten Verträgen, nur
Pfade und Dateinamen, nur wenn der eigene Vertrag sie ungültig macht.

---

## Korrektur nach Ausführungsbeginn — 23.08.2026

`state/plan-v1-harness-b6-hooks-cjs-migration.md`, Nachtrag N23: SCOPE 6
(Edit/Write auf `.claude/settings.json` durch den Agenten) verstößt gegen
den eigenen `guard-settings.js`-Schutz dieser Datei. Der Schritt ist ein
STOP geworden: die vier Zeilenänderungen werden vorgelegt, der Mensch
ändert sie selbst in seinem Editor, kein Entfernen des Guard-Eintrags durch
den Agenten — weder temporär noch dauerhaft. Diese Datei bleibt sonst
unverändert stehen; maßgeblich für SCOPE 6 ist jetzt N23, nicht der
Wortlaut oben.

**Live-Vertragstext:** `state/tasks/harness-b6-hooks-cjs-migration.md`
trägt denselben Zusatz direkt am Ende — das ist die Fassung, die die
ausführende Sitzung tatsächlich liest.
