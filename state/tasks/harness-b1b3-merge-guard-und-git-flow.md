SCHRITT 0: Arbeitsverzeichnis ausgeben und gegen das im Auftrag genannte
Zielverzeichnis prüfen. Bei Abweichung: abbrechen, melden, nichts ändern.

## TASK: harness-b1b3-merge-guard-und-git-flow

GOAL:
Zwei Befunde der TP-Rückverifikation schließen: (B1) der Weg nach `main`
über das Werkzeug `gh` und die Branch-Protection-Regel selbst werden vom
Commit-Guard hart verweigert, mit echtem Rot- und Grün-Fall kalibriert;
(B3a) `git-flow` schreibt bei Divergenz kein automatisches Merge/Rebase
mehr vor — als Textänderung, ausdrücklich ohne Verhaltensbeleg.

CONTEXT:
- [Fakt] `.claude/hooks/commit-guard.js:170-175` greift nur, wenn der
  Befehlstext `git` UND `commit|push` je als eigenständiges Token enthält.
  `gh pr merge` enthält keines von beiden.
- [Fakt] `.claude/hooks/commit-guard.js:170-171` — die Wortgrenzen
  `GRENZE_VOR`/`GRENZE_NACH` enthalten den Schrägstrich NICHT. Ein Muster,
  das nur `merge` als Token prüft, verfehlt deshalb
  `gh api --method PUT repos/O/R/pulls/<n>/merge` (Zeichen davor ist `/`)
  und `gh api --method POST repos/O/R/merges …` (Zeichen danach ist `s`).
  Der zweite Endpunkt schreibt ohne PR direkt nach `main`.
- [Fakt] `state/gates.md:17` — Branch Protection auf `main` ist seit
  2026-08-22 real angelegt und kalibriert. Der letzte Schritt nach `main`
  ist damit ein Merge, kein Push.
- [Fakt] `state/tooling.md:13` — `gh` 2.98.0 ist installiert und unter
  Stefans Konto authentifiziert.
- [Fakt] `state/gates.md:556-562` — ein echter `gh pr merge`-Versuch wurde
  bereits einmal vom Auto-Mode-Classifier der Sitzung blockiert, nicht vom
  Harness. Die Reihenfolge von Classifier und PreToolUse-Hook ist im Repo
  nirgends belegt.
- [Fakt] `state/gates.md:233-246` — der Hook fängt die kritischen Wörter
  auch innerhalb eines Text-Literals ab; real aufgetreten.
- [Fakt] `.claude/skills/git-flow/SKILL.md:16` schreibt
  `git checkout main && git pull` vor. `git pull` führt bei Divergenz
  genau den automatischen Merge oder Rebase aus, den die Ziel-Fassung
  §9.2 Punkt 5 ausschließt.
- [Fakt] `.claude/skills/git-flow/SKILL.md:14-15` — Schritt 2 greift,
  wenn die Sitzung bereits auf einem dedizierten Branch läuft. Schritt 3
  ist der `Sonst`-Zweig und wird in diesem Vertrag deshalb NICHT
  durchlaufen.
- [Fakt] `.claude/hooks/guard-settings.js:9-26` schützt genau zwei
  Dateien; `.claude/hooks/*.js` gehört nicht dazu (Harness-Kandidat 8).
  Das ist hier der Wiederherstellungspfad: Bricht die neue Regel den
  Bash-Pfad, wird der Hook über das Edit-Werkzeug zurückgesetzt.
- [Fakt] `state/gates.md:552-568` — `gh api repos/…/pulls/<n>` →
  `mergeable_state` ist ein bereits kalibrierter Leseweg. Er enthält weder
  `branches/`+`/protection` noch `merge` als Token und muss offen bleiben.
- [Schlussfolgerung] Der Preis der Sperre ist damit kleiner als in v1
  angenommen: Es entfällt der Leseweg auf die KONFIGURATION der Regel; der
  Leseweg auf ihre WIRKUNG bleibt und ist der vorgesehene Ersatz.
- [Annahme, für diesen Vertrag festgelegt] Die Sperre auf
  `branches/…/protection` gilt für JEDEN Bash-Befehl, auch lesende. Grund:
  eine verlässliche Unterscheidung von GET und PUT/DELETE im Befehlstext
  ist fragil.
- [Schlussfolgerung] Der zu erzeugende Rot-Fall belegt ausschließlich den
  Bash-Pfad. Weboberfläche, `curl`, MCP-Werkzeuge und WebFetch bleiben
  offen. Die §9.1-Zeile wird deshalb zweigeteilt, nicht hochgestuft.

SCOPE:
1. `git status` sauber, aktueller `main`, eigener Branch angelegt.
2. `.claude/hooks/commit-guard.js`: eine VIERTE Aufgabe ergänzen — im Code
   an dritter Stelle, VOR der bestehenden git-commit/push-Prüfung, mit
   derselben `verweigern()`-Mechanik:
   a) Befehlstext enthält `gh` als eigenständiges Token UND mindestens
      eines von: `merge` als eigenständiges Token, ODER der normalisierte
      Text enthält `/merge`, ODER er enthält `/merges` → verweigern.
      `mergeable` bleibt ausdrücklich frei — eine reine Substring-Prüfung
      auf `merge` ist falsch und würde den kalibrierten Leseweg aus
      `state/gates.md:552-568` abschneiden.
   b) Normalisierter Befehlstext enthält `branches/` UND `/protection` →
      verweigern.
   `git merge` wird NICHT erfasst — es ist ein lokaler, gewollter Vorgang
   und wird in Schritt 4 gebraucht.
   Musterbau und Prüfung stehen in einem `try`/`catch`; im `catch` wird
   verweigert („commit-guard: Prüfung nicht ausführbar — fail-closed,
   Befehl verweigert."). Grund: Die neue Prüfung steht vor der
   Commit/Push-Prüfung; ein Wurf in `new RegExp(...)` würde sonst auch den
   bestehenden Schutz still mitreißen.
3. Kopfkommentar von „Drei Aufgaben" auf „Vier Aufgaben" umstellen und
   Punkt 4 ergänzen. Punkte 1–3 unverändert lassen. In der dokumentierten
   Musterbreiten-Grenze zusätzlich notieren: die Rulesets-API
   (`repos/…/rulesets`) ist nicht erfasst; der Schutz dieses Repos liegt in
   der klassischen Protection-API.
4. `.claude/skills/git-flow/SKILL.md`, Schritt 3 — Soll-Fassung wörtlich:
   `git fetch origin`, dann `git rev-list --left-right --count main...origin/main`
   mit vier Ausgängen:
     `0 0`  Gleichstand → `git checkout main`, weiter.
     `0 N`  nur zurück → `git checkout main && git merge --ff-only origin/main`.
     `N 0`  lokal voraus → anhalten und melden; unter Branch Protection ein
            anomaler Zustand.
     `N M`  Divergenz → anhalten und melden. Kein Merge, kein Rebase, kein
            Force.
   Die bestehende Stash-Anweisung und die Checkout-Verweigerungsregel
   bleiben unverändert und behalten ihre Position. Keine neuen
   Backtick-Verweise auf nicht existierende Dateien — die Datei unterliegt
   Prüfung 1 des Doku-Gates.
5. Rot-Fall B1a: `gh pr merge 999` (PR existiert nicht) → muss vom Hook
   verweigert werden. Der Beleg gilt nur dann als Hook-Rot-Fall, wenn die
   Meldung mit `commit-guard:` beginnt. Zusätzlich im Wortlaut festhalten:
   (i) es erschien kein `gh`-Ausgabetext und keine HTTP-/404-Meldung,
   (ii) die Meldung lautet nicht „Blocked by classifier".
6. Rot-Fall B1a-2: ein `gh api`-Aufruf auf einen Pfad, der auf `/merge`
   endet → muss verweigert werden. Wortlaut zeigen. Belegt die Erweiterung
   aus Schritt 2a.
7. Rot-Fall B1b: ein lesender `gh api`-Aufruf auf
   `repos/DerStefan89/ai-workforce/branches/main/protection` → muss
   verweigert werden. Wortlaut zeigen.
8. Rot-Fall Fail-Closed: den Hook mit einer Eingabe ohne
   `tool_input.command` aufrufen → muss weiterhin verweigern. Wortlaut
   zeigen. Belegt, dass die Voranstellung die Fail-Closed-Eigenschaft
   nicht aufgehoben hat.
9. Grün-Fälle: `gh pr list`, `gh repo view` und
   `gh api repos/DerStefan89/ai-workforce/pulls/2` (Leseweg auf
   `mergeable_state`) → müssen unverändert durchlaufen. Alle drei im
   Wortlaut zeigen. Der dritte belegt die `mergeable`-Ausnahme aus
   Schritt 2a.
10. Grün-Fall Regression: `git commit --allow-empty -m test` auf einem
    Wegwerf-Branch ohne Freigabe-Datei → muss weiterhin mit der bisherigen
    Meldung abgewiesen werden. Wegwerf-Branch danach löschen, nie pushen.
11. `state/gates.md`: Zeile `commit-guard.js`-Hook um die neue Aufgabe
    erweitern, Kalibrierungs-Log-Eintrag mit Datum und allen Wortlauten
    aus Schritt 5–10 ergänzen. Bestehenden Text nicht löschen.
12. Für `git-flow` KEINE Gate-Zeile — ein Skill ist kein Gate. Stattdessen
    im Kalibrierungs-Log wörtlich: „`git-flow` Schritt 3 wurde textlich
    geändert (`git pull` → `git fetch origin` plus expliziter Vergleich).
    Durchsetzungsgrad `DEKLARIERT`; das Verhalten wurde in diesem Lauf
    nicht ausgeführt, weil Schritt 2 des Skills greift. Der Widerspruch zu
    Ziel-Fassung §9.2 Punkt 5 ist im Wortlaut aufgelöst, nicht im
    Verhalten belegt."
13. Commit über Branch + PR nach `git-flow` (in der NEUEN Fassung),
    CI-Status melden, NICHT selbst mergen.
    Auflage: Commit-Message und PR-Titel/-Body dürfen die Tokens `gh` und
    `merge` nicht gemeinsam als eigenständige Wörter führen und nicht
    `branches/` zusammen mit `/protection` enthalten — sonst blockiert die
    neue Regel den eigenen Commit. Zulässig ist die Bindestrichform
    (`gh-Merge-Pfad`, `Branch-Protection-Regel`); die Wortgrenzen aus
    `commit-guard.js:170-171` greifen bei Bindestrichen nicht.

NICHT:
- `.claude/settings.json`, `package.json`, `.github/workflows/ci.yml`,
  `biome.json` anfassen.
- `git merge` oder `mergeable` in die Sperre aufnehmen.
- Das Muster um die Rulesets-API verbreitern (nur als Grenze notieren).
- Die Branch-Protection-Regel auf GitHub ändern, lesen oder löschen.
- Eine Freigabe-Datei-Prüfung für den Merge-Pfad einbauen — B1 ist als
  hartes `deny` entschieden, nicht als dritter Schlüssel.
- `guard-settings.js` um die Hook-Dateien erweitern.
- Die §9.1-Zeile der Ziel-Fassung selbst ändern — das ist Projektchat.
- Projektchat-Dokumente (`claude/*.md`,
  `04_ENTSCHEIDUNGSREGISTER_001_176.md`) anfassen.
- Änderungen an das Template-Remote zurückspielen.

BUDGET:
Ein Baudurchgang plus höchstens eine Korrekturrunde.

OUTPUT:
- `git diff --staged` vollständig zeigen, ausdrückliches „ja" abwarten.
- Wortlaut aller Kalibrierungsfälle aus Schritt 5–10.
- Abdeckungsaussage im Wortlaut: Der Rot-Fall belegt ausschließlich den
  Bash-Pfad. Ausdrücklich nicht belegt und namentlich aufzuführen:
  GitHub-Weboberfläche, `curl` und andere HTTP-Clients, MCP-Werkzeuge
  (E-187), WebFetch, freie Shell mit Variablen. Empfehlung an den
  Projektchat: §9.1 in zwei Zeilen aufteilen — „Merge auf `main` über
  Bash/`gh` | ERZWUNGEN (kalibriert <Datum>)" und „Merge auf `main`
  insgesamt | DEKLARIERT". Keine einzeilige Hochstufung.
- Aktualisierte Zeile und Log-Einträge in `state/gates.md`.
- PR-Link und CI-Status. NICHT selbst mergen.
- Meldung, dass beide Änderungen als Harness-Kandidaten für den späteren
  Rückfluss ins Template vorgemerkt sind.

ESCALATE:
- Ein Rot-Fall aus Schritt 5–8 tritt nicht ein → anhalten, melden, keine
  „kalibriert"-Aussage eintragen.
- Statt der Guard-Meldung erscheint eine Classifier-Meldung („Blocked by
  classifier") → anhalten, KEINEN Rot-Fall eintragen, melden. Keinen
  Ersatzweg selbst wählen.
- Ein Grün-Fall aus Schritt 9 wird verweigert → das Muster ist zu breit;
  anhalten, nicht eigenmächtig nachschärfen.
- Der Regressionsfall aus Schritt 10 läuft durch statt abgewiesen zu
  werden → sofort anhalten, alte Fassung des Hooks über das Edit-Werkzeug
  wiederherstellen, melden.
- Die neue Prüfung blockiert einen unbeteiligten eigenen Befehl
  (Commit-Message, PR-Body, Diagnosebefehl) → anhalten und melden.
  Wiederherstellung läuft über das Edit-Werkzeug, nicht über Bash — der
  Bash-Pfad kann selbst gesperrt sein.
- `git status` zu Beginn nicht sauber → anhalten, Ausgabe zeigen.

FOLGT:
- Projektchat: Ziel-Fassung §9.1 zweizeilig fassen (Ergebnis aus OUTPUT)
  und §9.2 Punkt 5 auf den Head des Arbeitsbranches umschreiben, Leseweg
  `git ls-remote origin <branch>`. Nicht Gegenstand dieses Vertrags, weil
  Projektchat-Dokumente hier nicht angefasst werden.
- Harness-Kandidat 8 (`guard-settings.js` um `.claude/hooks/*.js`) bleibt
  offen; noch kein Vertrag geschnitten.
