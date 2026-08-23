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

---

## NACHTRAG 23.08.2026 — bindend, ersetzt SCOPE 6

Grund: `.claude/settings.json` ist durch `.claude/hooks/guard-settings.js`
(PreToolUse, Edit|Write) gegen Schreibzugriff des Modells geschützt. Ein
Edit/Write-Aufruf auf diese Datei durch dich wird verweigert — das ist
gewollt, nicht ein Bug, den es zu umgehen gilt.

SCOPE 6 gilt ab sofort als ersetzt durch:

STOP. Lege dem Menschen die vier zu ändernden Zeilen exakt vor (alt →
neu, für `commit-guard`, `session-reminder`, `zwischenstand-laden`,
`zwischenstand-pruefen`; die `guard-settings.js`-Zeile bleibt
unverändert). Ändere `.claude/settings.json` NICHT selbst — weder per
Edit/Write noch per Bash (`sed`, `echo >`, o. ä.). Entferne, kommentiere
nicht aus und umgehe nicht den `guard-settings.js`-Eintrag in
`hooks.PreToolUse` — weder temporär noch dauerhaft, weder in dieser Datei
noch im Hauptrepo unter
`C:\Users\stefa\Projekte\ai-workforce\.claude\settings.json` (dieser Pfad
ist ohnehin außerhalb deines Arbeitsverzeichnisses und tabu). Warte auf
die Bestätigung des Menschen, dann fahre mit SCOPE 7 fort.

Ist an `.claude/settings.json` (in diesem Worktree oder im Hauptrepo)
bereits etwas geändert worden: zeige den aktuellen Inhalt und den Stand
gegen `git status`/`git diff`, bevor du fortfährst. Nichts zurücksetzen,
ohne es vorher zu zeigen.

---

## NACHTRAG 23.08.2026 (2) — bindend, ersetzt SCOPE 8–17 vollständig durch SCOPE 8–19

Grund: SCOPE 8 (Rot-Fall NACHHER) eskalierte real — ein Commit ohne
Freigabe-Datei lief durch (Commit `f986195`), trotz vollständig
umgesetzter SCOPE 1–7. Stefan hat entschieden: die Freigabe-Datei-Pflicht
(bisherige Aufgabe 1 von `commit-guard.js`) wird ersatzlos entfernt, nicht
repariert. Von den vier ursprünglichen Aufgaben des Hooks bleibt nur
Aufgabe 2 (Bash-Zugriff auf `.claude/settings.json` blockieren). Aufgabe 3
(Bash-Zugriff auf `state/freigabe-commit.md` blockieren) entfällt mit
Aufgabe 1. Aufgabe 4 (`gh`-Merge-Pfad/Branch-Protection blockieren) ist
nicht Teil dieses Vertrags — sie bleibt eigenständig bei Vertrag
`harness-b1b3-merge-guard-und-git-flow` und läuft danach, sequenziell
(Reihenfolge B6 → 1 → 2 → 4 → 3 unverändert). Aufgabe 2 bleibt trotz
Wegfalls von Aufgabe 1 nötig: sie schützt die gesamte Hook-Verdrahtung
(„schließt die Bash-Lücke von guard-settings.js") und wird mit Aufgabe 4
sogar wichtiger, nicht weniger wichtig.

**Geltende Fassung von GOAL (ab diesem Nachtrag):** „… Nach diesem
Vertrag laden alle fünf Hooks unter dem ESM-Projekt fehlerfrei. Der
Commit-Guard verliert die Freigabe-Datei-Pflicht ersatzlos und behält
ausschließlich den Bash-Schutz auf `.claude/settings.json`. Kein
Pfadverweis im Repo zeigt auf einen umbenannten Hook, und keine lebende
Dokumentation beschreibt den Freigabe-Workflow noch als aktuell."

**Neuer Dateiinhalt für `commit-guard.cjs`** (ersetzt den bisherigen
Inhalt vollständig — keine Freigabe-Logik, keine Dekodier-/Zeitstempel-
Hilfsfunktionen, kein Dateisystemzugriff mehr nötig):

```js
/**
 * Datei: .claude/hooks/commit-guard.cjs
 *
 * Zweck: PreToolUse-Hook auf Bash. Eine Aufgabe:
 * 1. Verweigert jeden Bash-Befehl, der `.claude/settings.json` referenziert
 *    (schließt die Bash-Lücke von guard-settings.js).
 *
 * Frühere Aufgaben "Freigabe-Datei-Pflicht vor git commit/push" und
 * "Bash-Zugriff auf state/freigabe-commit.md blockieren" wurden mit
 * Stefan-Entscheidung 23.08.2026 ersatzlos entfernt (Befund B6, Nachtrag
 * N24) — siehe state/plan-v1-harness-b6-hooks-cjs-migration.md.
 * state/freigabe-commit.md wird nicht mehr verwendet.
 *
 * Bekannte Grenze: Das Muster ist ein Substring-Test auf den Dateipfad,
 * kein exaktes Parsen des Befehlstexts.
 *
 * Geplante Erweiterung: Vertrag harness-b1b3-merge-guard-und-git-flow
 * fügt eine Sperre für den gh-Merge-Pfad und Branch-Protection-Zugriffe
 * hinzu — nicht Teil dieser Datei, folgt als eigener, separater Vertrag.
 */
function verweigern(reason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: reason,
      },
    })
  );
  process.exit(0);
}

function verarbeiten(input) {
  let eingabe;
  let command;
  try {
    eingabe = JSON.parse(input);
    command = eingabe.tool_input?.command;
  } catch {
    verweigern(
      "commit-guard: Eingabe nicht lesbar — fail-closed, Befehl verweigert."
    );
    return;
  }

  if (typeof command !== "string" || command.length === 0) {
    verweigern(
      "commit-guard: kein Befehlstext gefunden — fail-closed, Befehl verweigert."
    );
    return;
  }

  const normalisiert = command.replace(/\\/g, "/");

  if (normalisiert.includes(".claude/settings.json")) {
    verweigern(
      "commit-guard: Bash-Zugriff auf geteilte .claude/settings.json blockiert. " +
        "Die Datei ist Team-Policy und wird nur vom Menschen im eigenen Editor geändert."
    );
    return;
  }

  process.exit(0);
}

if (require.main === module) {
  let input = "";
  process.stdin.on("data", (d) => (input += d));
  process.stdin.on("end", () => verarbeiten(input));
}
```

**Änderung an `guard-settings.js`** (bleibt `.js`, nicht umbenannt):
- Kopfkommentar: dritten Bullet-Punkt (`state/freigabe-commit.md`) und den
  Satz „der zweite Schluessel des Commit-Guards" entfernen. Verweis auf
  `commit-guard.cjs` im ersten Bullet-Punkt bleibt (im Stash gesichert).
- `GUARDED_FILES`: den zweiten Eintrag (`state/freigabe-commit.md`)
  vollständig entfernen. Nur noch `.claude/settings.json` bleibt
  geschützt.

**`.gitignore`**: Kommentarblock Zeilen 25–28 (Einmal-Freigabe für den
Commit-Guard) und die Zeile `state/freigabe-commit.md` entfernen.

**Neue SCOPE-Schritte 8–19, ersetzen die bisherigen SCOPE 8–17
vollständig** (Korrektur gegenüber der ersten N24-Fassung: die dortige
Nummern-Wiederverwendung hätte die noch nicht ausgeführten Alt-Funktionen
„Grep nach alten `.js`-Hooknamen", „sechs Lebende-Doku-Dateien nachziehen"
und „`diagnose-hook-crash` löschen" stillschweigend verloren — hier zu
je einem gemeinsamen Schritt zusammengeführt, siehe
`state/plan-v1-harness-b6-hooks-cjs-migration.md`, Abschnitt
„N24-Korrektur"):

SCOPE 8: `git stash pop`. Ergebnis zeigen. Konflikt beim Pop → anhalten,
nicht eigenmächtig auflösen, melden.

SCOPE 9: `commit-guard.cjs` und `guard-settings.js` gemäß den
Spezifikationen oben umschreiben. Diff vollständig zeigen.

SCOPE 10: Ladetest wiederholen (wie ehemals SCOPE 7) für beide geänderten
Dateien — kein Ladefehler.

SCOPE 11: Zwei Rot-/Grün-Fall-Paare, auf einem Wegwerf-Branch, nie
gepusht, danach gelöscht:
  a) Rot: ein Bash-Befehl, der `.claude/settings.json` referenziert
     (z. B. `cat .claude/settings.json`) → muss verweigert werden,
     Meldung beginnt mit `commit-guard:`. Grün: ein unbeteiligter
     Bash-Befehl (z. B. `git status`) → läuft durch.
  b) `git commit --allow-empty -m "diagnose-ohne-freigabe"`, **ohne**
     `state/freigabe-commit.md` → muss jetzt **durchlaufen** (neue
     Sollfunktion, keine Lücke). Wortlaut/Exit-Code zeigen.

SCOPE 12: EIN kombinierter `grep -rn` im gesamten Repo — sowohl nach den
vier alten Hooknamen (`commit-guard\.js`, `session-reminder\.js`,
`zwischenstand-laden\.js`, `zwischenstand-pruefen\.js`) als auch nach
`freigabe-commit` und `zweiter Schl[üu]ssel`. Vollständiges Ergebnis
zeigen und gegen diese Klassifikationstabelle abgleichen:

| Gruppe | Dateien | Behandlung |
|---|---|---|
| Code, bereits behandelt | `.claude/hooks/commit-guard.cjs`, `.claude/hooks/guard-settings.js` | SCOPE 9 |
| Konfiguration | `.gitignore` | SCOPE 13 |
| Lebende Doku — Rename `.js`→`.cjs` | `docs/harness/HARNESS-OVERVIEW.md`, `docs/harness/zaehne-taxonomie.md`, `docs/guide/02-DEEPDIVE-claude-ordner.md`, `docs/guide/07-TOKEN-SPAREN.md` | SCOPE 13 |
| Lebende Doku — Freigabe-Wegfall | `docs/guide/03-DEEPDIVE-gates.md`, `docs/guide/04-DEEPDIVE-gedaechtnis.md`, `START-KLEIN.md`, `state/memory-map.md` | SCOPE 13 |
| `state/gates.md` | Gate-Tabellenzeile (Rename UND „Prüft"-Spalte auf Bash-Schutz-only reduzieren) | SCOPE 13; Kalibrierungs-Log bleibt unverändert |
| Aktiver, unausgeführter Vertrag | `state/tasks/harness-b1b3-merge-guard-und-git-flow.md` | SCOPE 17, nur Dateinamen (O1/N22-Regel) |
| Protokoll, bleibt | `state/gates.md` unterhalb `## Kalibrierungs-Log` | nicht anfassen |
| Historische Vertragsakten | `docs/harness/programm-historie/{advisor-findings-phase2-adoptionsfaehigkeit,harness-fix-2-commit-guard,harness-fix-5-commit-guard-haerten,harness-fix-7-reibung-und-doktrin,harness-fix-8-start-klein,plan-v2-phase2-adoptionsfaehigkeit}.md`, `state/tasks/harness-setup-0{a,b,c,d}-*.md` | nicht anfassen |
| Eigene Arbeitsdateien dieses Vertrags | `state/plan-v1-…`, `state/plan-v2-…`, `state/advisor-findings-…`, `state/tasks/harness-b6-…` (diese Datei) | nicht anfassen |

Treffer außerhalb dieser Tabelle → anhalten, vollständige Fundliste
zeigen, nicht selbst einordnen — ESCALATE.

SCOPE 13: alle als „SCOPE 13" markierten Dateien nachziehen. Jede Datei
vor der Änderung lesen, Formulierung nicht raten. `.gitignore`: Zeilen
25–28 vollständig entfernen. `state/gates.md`: ausschließlich die
Gate-Tabellenzeile.

SCOPE 14: denselben kombinierten Grep aus SCOPE 12 wiederholen. Treffer
nur noch in den Gruppen „nicht anfassen" oder „eigene Arbeitsdatei" →
sonst anhalten, melden.

SCOPE 15: `npm run check`. Wortlaut/Exit-Code zeigen.

SCOPE 16: `state/gates.md`-Kalibrierungs-Log-Eintrag ergänzen (Datum,
Bezug B6 Nachtrag N24, Wortlaut aus SCOPE 11).

SCOPE 17: `state/tasks/harness-b1b3-merge-guard-und-git-flow.md` — die
fünf Vorkommen von `commit-guard.js` auf `commit-guard.cjs` nachziehen
(ausschließlich Dateinamen), datierten Nachtrag-Satz anfügen: „Nachtrag
<Datum>: Dateinamen durch Vertrag `harness-b6-hooks-cjs-migration` von
`.js` auf `.cjs` nachgezogen. Wortlaut sonst unverändert." Diff dieser
einen Datei separat zeigen.

SCOPE 18: `diagnose-hook-crash` löschen (`git branch -D
diagnose-hook-crash`), Ergebnis wortwörtlich festhalten. Vermerken, dass
damit der einzige erreichbare Beleg-Commit `a9cd6ed` verschwindet —
ersetzt durch den Rot-Fall aus SCOPE 2 und die neuen Rot-/Grün-Fälle aus
SCOPE 11.

SCOPE 19: Commit über Branch + PR nach `git-flow`, CI-Status melden,
NICHT selbst mergen.

**OUTPUT-Ergänzung:** Verweise im ursprünglichen OUTPUT-Abschnitt auf
„Schritt 10" (grep-Ergebnis) beziehen sich ab diesem Nachtrag auf
SCOPE 12/14 dieser Fassung.

**BUDGET-Ergänzung:** eine weitere Korrekturrunde, zusätzlich zu den
bereits zugestandenen zwei aus Plan v2.

**ESCALATE-Ergänzung:**
- `git stash pop` mit Konflikt → anhalten.
- Ein Treffer aus SCOPE 12/14 außerhalb der Tabelle → anhalten.
- Rot-Fall a) (SCOPE 11) läuft durch statt zu verweigern → anhalten,
  melden.
- Grün-Fall b) (SCOPE 11) wird verweigert → anhalten, nicht eigenmächtig
  nachbessern, melden.

Diese Fassung ist bindend und ersetzt sowohl die ursprünglichen SCOPE
8–17 des Vertragstexts oben als auch den `## NACHTRAG 23.08.2026`-Block
zu SCOPE 6 bleibt unverändert gültig (SCOPE 6 ist bereits abgeschlossen).

---

## NACHTRAG 23.08.2026 (4) — SCOPE-12-Tabellenzeile „Historische
Vertragsakten" zurück auf Wildcard-Form

Der reale SCOPE-12-Lauf eskalierte mit fünf Treffern außerhalb der
Brace-Aufzählung in obiger Tabelle
(`docs/harness/programm-historie/harness-fix-1-hooks-und-zwischenstand.md`,
`docs/harness/programm-historie/harness-fix-6-werkzeug-katalog.md`,
`docs/harness/programm-historie/plan-v1-phase2-adoptionsfaehigkeit.md`,
`docs/harness/programm-historie/plan-v2-phase1-vertraege.md`,
`state/tasks/harness-setup-4c-branch-protection-anlegen-und-kalibrieren.md`).
Stefan hat geklärt: `docs/harness/programm-historie/*` und bereits
ausgeführte `state/tasks/harness-setup-*.md` waren durchgängig als
Wildcard definiert (siehe `claude/42_UEBERGABE_NEUER_CHAT_7.md`,
`claude/43_PLAN_V1_B6_HOOKS_CJS.md`), nicht als feste Dateiliste. Die
Brace-Aufzählung in der SCOPE-12-Tabelle oben war eine unbeabsichtigte
Verengung. Details siehe
`state/plan-v1-harness-b6-hooks-cjs-migration.md`, Abschnitt „N26".

**Geltende Fassung der Tabellenzeile „Historische Vertragsakten" in der
SCOPE-12-Tabelle oben** (ersetzt dort ausschließlich diese eine Zeile,
alles Übrige in der Tabelle bleibt unverändert):

> | Historische Vertragsakten | `docs/harness/programm-historie/*`,
> bereits ausgeführte `state/tasks/harness-setup-*.md` | nicht anfassen |

Alle fünf oben genannten Treffer fallen damit unter „nicht anfassen".
SCOPE 12/14 werden gegen diese korrigierte Fassung ausgewertet.

---

## NACHTRAG 23.08.2026 (3) — SCOPE-11a-Befund geklärt, kein SCOPE-Eingriff

Ein zuvor unklarer Ausgang von SCOPE 11 a) wurde geprüft: Ursache war ein
**falsches Arbeitsverzeichnis der Sitzung**, nicht Sitzungs-Caching im
Hook-Runner. Mit bestätigtem Arbeitsverzeichnis (Worktree
`C:\Users\stefa\claude-worktrees\ai-workforce-b6`, Branch
`diagnose-scope11-b6`) läuft SCOPE 11 a) sauber durch: `cat
.claude/settings.json` wird mit einer `commit-guard:`-Meldung verweigert,
ein unbeteiligter Befehl (`git status`) läuft im selben Arbeitsverzeichnis
regulär durch. Details und Marker-Einordnung siehe
`state/plan-v1-harness-b6-hooks-cjs-migration.md`, Abschnitt „N25". Kein
SCOPE-Schritt und keine Hook-Codeänderung folgen aus diesem Befund — die
bestehende SCHRITT-0-Prüfung (Arbeitsverzeichnis gegen Zielverzeichnis)
bleibt die maßgebliche Absicherung.
