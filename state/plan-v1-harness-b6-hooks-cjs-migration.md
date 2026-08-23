<!-- Ziel-Pfad im Repo: state/plan-v1-harness-b6-hooks-cjs-migration.md -->
# Plan v1 — Befund B6, Hook-Reparatur (ESM/CommonJS)

Stand: 22.08.2026. Vorbereitet im Projektchat, **nicht ausgeführt**. Stefan
hat zu `claude/42_UEBERGABE_NEUER_CHAT_7.md` Abschnitt 1 **Option A**
gewählt: Advisor-Pass vorschalten, wie bei Vertrag 1
(`claude/39_VERTRAG_1_V2.md`, `claude/38_ADVISOR_FINDINGS_VERTRAG_1.md`).
Dieser Text ist die Plan-v1-Fassung, die der Advisor-Pass nach
`.claude/skills/advisor-pass/SKILL.md` prüft — Schritt 2: „Schreibe Plan v1
als Datei, nicht ins Fenster (`state/plan-v1-<slug>.md`)", Schritt 4:
„Frischer Kontext. Der Advisor läuft nicht in der Sitzung, die den Plan
geschrieben hat." Die Sitzung, die diesen Text verfasst hat, darf ihn
deshalb nicht selbst begutachten.

**Der Vertragstext unten ist der unveränderte Wortlaut aus der
Plan-Erstellungssitzung.** Korrekturen stehen ausschließlich im
`## Nachtrag 22.08.2026` am Ende — Schritt 10 des Advisor-Pass-Skills
(„Nachtrag statt Neufassung. … die Original-Datei bleibt unverändert").

## Methodischer Hinweis zur Evidenz in diesem Dokument

Alle CONTEXT-Fakten unten sind gegen den realen Stand von
`github.com/DerStefan89/ai-workforce`, Branch `main`, per Rohdatei-Abruf
verifiziert (nicht gegen `claude-projekt-template` — das ist ein separates,
generisches Vorlagen-Repo, das im ersten Versuch der Plan-Sitzung
fälschlich abgefragt wurde und andere, nicht zutreffende Platzhalterwerte
lieferte; der Fehler wurde bemerkt und korrigiert, bevor daraus etwas
übernommen wurde). Abruf erfolgte über `WebFetch` auf
`raw.githubusercontent.com`, nicht über ein Git-Werkzeug mit Zeilen-exaktem
Diff — für die hier zitierten kurzen, gezielten Ausschnitte (einzelne
Zeilen, Grep-artige Treffer) ist das ausreichend belastbar; für den
vollständigen Dateiinhalt großer Dateien nicht ohne Weiteres.

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
Hooks unter dem ESM-Projekt fehlerfrei, und der Commit-Guard verweigert
wieder nachweislich ohne Freigabe-Datei.

CONTEXT:
- [Fakt] `package.json` (Repo `ai-workforce`, Branch `main`) enthält
  `"type": "module"`.
- [Fakt] `.claude/settings.json:9,14,20,26,32` referenziert die Hooks
  unverändert mit der Endung `.js`:
  `node .claude/hooks/guard-settings.js`,
  `node .claude/hooks/commit-guard.js`,
  `node .claude/hooks/session-reminder.js`,
  `node .claude/hooks/zwischenstand-laden.js`,
  `node .claude/hooks/zwischenstand-pruefen.js`.
- [Fakt] Vier der fünf Dateien laden CommonJS-Syntax, die unter
  `"type": "module"` nicht mehr funktioniert:
  - `.claude/hooks/commit-guard.js:37` `const fs = require("fs");`,
    `:101` `module.exports = { … };`, zusätzlich `require.main === module`.
  - `.claude/hooks/session-reminder.js:1-3` drei `require(...)`-Zeilen
    (`fs`, `os`, `path`), keine `module.exports`.
  - `.claude/hooks/zwischenstand-laden.js:7-9` drei `require(...)`-Zeilen
    (`fs`, `path`, `child_process`), keine `module.exports`.
  - `.claude/hooks/zwischenstand-pruefen.js:6-8` drei `require(...)`-Zeilen
    (`fs`, `path`, `child_process`), keine `module.exports`.
- [Fakt] `.claude/hooks/guard-settings.js` enthält keine einzige Zeile mit
  `require(`, `module.exports`, `import` oder `export` — reines
  stdin/JSON/stdout, keine Node-Kernmodule importiert. Diese Datei lädt
  unter ESM unverändert. Sie wird in diesem Vertrag NICHT umbenannt.
- [Fakt] `.claude/hooks/commit-guard.js:2-18` (Kopfkommentar) dokumentiert
  den Hook ausdrücklich als bewusste Abweichung von der
  „Fail-Open-Konvention der übrigen Hooks in diesem Repo": Die drei
  anderen CommonJS-Hooks sind laut eigenem Design fail-open (Reminder/
  Kontext-Lader, kein Gate); `commit-guard.js` ist laut eigenem Design
  fail-closed, weil „ein Guard, der bei Störung durchlässt, kein Guard
  ist".
- [Schlussfolgerung] Der eigentliche Fehler ist nicht, dass
  `commit-guard.js` bei interner Störung fail-open liefe — dagegen ist der
  Code selbst abgesichert (`try/catch` um JSON-Parse und Freigabeprüfung,
  `verweigern()` im `catch`-Zweig). Der Fehler liegt eine Ebene davor: Ein
  `ReferenceError: require is not defined` beim Laden des Moduls tritt
  auf, bevor der eigene fail-closed-Code überhaupt erreicht wird. Node/der
  Hook-Runner behandelt einen Hook, der beim Laden crasht, faktisch wie
  „kein Hook registriert" — das eigene Fail-Closed-Design von
  `commit-guard.js` wird dadurch systematisch umgangen, nicht durch einen
  Fehler in seiner eigenen Logik.
- [Fakt, laut `claude/42_UEBERGABE_NEUER_CHAT_7.md`, in dieser Sitzung
  NICHT erneut selbst reproduziert] Ein diagnostischer Test
  (`git commit --allow-empty` auf Branch `diagnose-hook-crash`, ohne
  `state/freigabe-commit.md`) erzeugte Commit `a9cd6ed` ohne Abbruch. Das
  ist die empirische Bestätigung des oben hergeleiteten Mechanismus; diese
  Sitzung hat sie nicht selbst wiederholt, sondern übernimmt sie als durch
  eine vorherige Sitzung belegt.
- [Fakt, laut `claude/42_UEBERGABE_NEUER_CHAT_7.md` Abschnitt 1, in dieser
  Sitzung NICHT erneut gegen das Repo verifiziert] Reparaturumfang in drei
  Gruppen: funktional (`.claude/settings.json`), lebende Dokumentation
  (`docs/harness/HARNESS-OVERVIEW.md`,
  `docs/guide/02-DEEPDIVE-claude-ordner.md`, `docs/guide/03-DEEPDIVE-gates.md`,
  `docs/guide/07-TOKEN-SPAREN.md`, `state/gates.md`), historische
  Vertragsakten (`docs/harness/programm-historie/*`,
  bereits ausgeführte `state/tasks/harness-setup-*.md` — nicht anfassen).
- [offene Unsicherheit] Diese Sitzung konnte in `state/gates.md` auf
  `main` keine Zeile finden, die dem in der Übergabe zitierten Wortlaut
  „`state/gates.md:19` … ERZWUNGEN | gemessen" entspricht — die dortige
  Zeile 19 zeigt beim Abruf dieser Sitzung eine Regel-Gate-Zeile ohne
  Bezug zum Commit-Guard. Mögliche Erklärungen: der Abruf dieser Sitzung
  (`WebFetch`, kein zeilenexaktes Git-Werkzeug) hat sich vertan; die Datei
  wurde zwischen Übergabe-Zeitpunkt und jetzt verändert; oder der
  ursprüngliche Verweis bezog sich auf einen anderen Branch. Nicht
  aufgelöst — siehe ESCALATE und FOLGT.
- [Annahme, für diesen Vertrag festgelegt] Die Reparatur ist ein reiner
  Modulformat-Wechsel (Dateiendung `.js` → `.cjs`, Pfade in
  `.claude/settings.json` und Dokumentation nachziehen). Keine
  Verhaltensänderung an einem der fünf Hooks.

SCOPE:
1. `git status` sauber, aktueller `main`, eigener Branch angelegt.
2. Vor jeder Änderung: Rot-Fall-Beleg VORHER erzeugen — auf einem
   Wegwerf-Branch ohne `state/freigabe-commit.md`:
   `git commit --allow-empty -m "diagnose-vorher"`. Wortlaut zeigen. Bricht
   dieser Aufruf NICHT durch (wird verweigert), ist die CONTEXT-Prämisse
   widerlegt — siehe ESCALATE, nicht weitermachen. Wegwerf-Branch danach
   löschen, nie pushen.
3. Die vier betroffenen Dateien per `git mv` (Historie erhalten) umbenennen:
   `.claude/hooks/commit-guard.js` → `.claude/hooks/commit-guard.cjs`,
   `.claude/hooks/session-reminder.js` → `.claude/hooks/session-reminder.cjs`,
   `.claude/hooks/zwischenstand-laden.js` → `.claude/hooks/zwischenstand-laden.cjs`,
   `.claude/hooks/zwischenstand-pruefen.js` → `.claude/hooks/zwischenstand-pruefen.cjs`.
   `.claude/hooks/guard-settings.js` NICHT umbenennen.
4. `.claude/settings.json`: die vier `command`-Zeilen der umbenannten
   Dateien auf `.cjs` nachziehen. Die `guard-settings.js`-Zeile
   unverändert lassen.
5. Jeden der vier umbenannten Hooks einzeln mit einer synthetischen
   `stdin`-Eingabe aufrufen (`echo '{...}' | node .claude/hooks/<name>.cjs`)
   und Exit-Code plus `stdout`/`stderr` zeigen. Kein
   `ReferenceError: require is not defined` und kein sonstiger Crash beim
   Laden.
6. Rot-Fall-Beleg NACHHER: denselben Aufruf wie Schritt 2 wiederholen
   (neuer Wegwerf-Branch, kein `state/freigabe-commit.md`). Muss jetzt mit
   der `commit-guard:`-Meldung verweigert werden. Wortlaut zeigen. Der
   Beleg gilt nur, wenn die Meldung mit `commit-guard:` beginnt.
7. Grün-Fall: gültige, frische `state/freigabe-commit.md` anlegen, auf
   demselben oder einem neuen Wegwerf-Branch committen → muss
   durchlaufen. Wortlaut zeigen. Wegwerf-Branch(es) danach löschen, nie
   pushen.
8. `grep -rn` im gesamten Repo nach den vier alten Dateinamen
   (`commit-guard.js`, `session-reminder.js`, `zwischenstand-laden.js`,
   `zwischenstand-pruefen.js`) als Netz gegen die in CONTEXT übernommene
   Drei-Gruppen-Liste aus der Übergabe. Tritt ein Treffer außerhalb der
   drei bekannten Gruppen auf: anhalten, melden, nicht eigenmächtig
   einer Gruppe zuordnen — siehe ESCALATE.
9. Die als „lebende Dokumentation" gelistete Gruppe
   (`docs/harness/HARNESS-OVERVIEW.md`,
   `docs/guide/02-DEEPDIVE-claude-ordner.md`,
   `docs/guide/03-DEEPDIVE-gates.md`, `docs/guide/07-TOKEN-SPAREN.md`,
   `state/gates.md`) auf `.cjs` nachziehen.
10. `docs/harness/programm-historie/*` und bereits ausgeführte
    `state/tasks/harness-setup-*.md` ausdrücklich NICHT anfassen.
11. `npm run check` als Netz gegen tote Pfad-Verweise laufen lassen.
    Wortlaut/Exit-Code zeigen. Deckt das Doku-Gate
    (`scripts/check-docs.mjs`) die vier Hook-Pfade nicht ab: das ist ein
    Befund, kein Blocker — im Bericht ausdrücklich benennen.
12. `state/gates.md`: Kalibrierungs-Log-Eintrag mit Datum, Bezug auf
    Befund B6, Wortlaut aus Schritt 2, 6, 7, und dem in CONTEXT notierten
    Mechanismus (Crash-beim-Laden umgeht das eigene Fail-Closed-Design)
    ergänzen. Bestehenden Text nicht löschen. Die konkrete Zielzeile für
    diesen Eintrag erst nach Klärung der offenen Unsicherheit zu Zeile 19
    festlegen — siehe ESCALATE.
13. Klärung `diagnose-hook-crash`: prüfen, ob der Branch lokal noch
    existiert (`git branch --list diagnose-hook-crash`). Falls ja: löschen
    (`git branch -D diagnose-hook-crash`), niemals gepusht. Ergebnis im
    Bericht wortwörtlich festhalten — unabhängig vom Ausgang.
14. Commit über Branch + PR nach `git-flow`, CI-Status melden, NICHT
    selbst mergen.
    Auflage: Commit-Message und PR-Text dürfen die Tokens `gh` und `merge`
    nicht gemeinsam als eigenständige Wörter führen (Vertrag-1-Regel, falls
    dessen Merge-Guard-Erweiterung zu diesem Zeitpunkt bereits auf `main`
    liegt — vor dem Commit gegen den realen `main`-Stand prüfen, nicht aus
    dieser Übergabe übernehmen).

NICHT:
- Inhaltliche Logik eines der fünf Hooks ändern — reiner
  Modulformat-Wechsel, keine Verhaltensänderung.
- `.claude/hooks/guard-settings.js` umbenennen oder inhaltlich anfassen.
- `"type": "module"` aus `package.json` zurücknehmen — bewusste
  AP-1-Entscheidung, keine Fehlkonfiguration.
- `docs/harness/programm-historie/*` oder bereits ausgeführte
  `state/tasks/harness-setup-*.md` ändern.
- Die Vertragspaket-Reihenfolge (1 → 2 → 4 → 3,
  `claude/41_VERTRAGSPAKET.md`) vorgreifen oder verändern.
- `diagnose-hook-crash` pushen oder wiederverwenden.
- Projektchat-Dokumente (`claude/*.md`,
  `04_ENTSCHEIDUNGSREGISTER_001_176.md`) anfassen.

BUDGET:
Ein Baudurchgang plus höchstens eine Korrekturrunde.

OUTPUT:
- `git diff --staged` vollständig zeigen, ausdrückliches „ja" abwarten.
- Wortlaut aller Fälle aus Schritt 2, 5, 6, 7.
- Vollständiges `grep`-Ergebnis aus Schritt 8, mit Einordnung jedes
  Treffers in eine der drei Gruppen.
- `npm run check`-Ergebnis aus Schritt 11 im Wortlaut, inklusive
  ausdrücklicher Aussage zur Deckungslücke beim Doku-Gate.
- Aktualisierter Log-Eintrag in `state/gates.md`.
- Klarer Satz zum Status von `diagnose-hook-crash` (Schritt 13).
- PR-Link und CI-Status. NICHT selbst mergen.

ESCALATE:
- Der Rot-Fall-Beleg VORHER (Schritt 2) verweigert den Commit statt
  durchzulassen → CONTEXT-Prämisse widerlegt, anhalten, keine Reparatur
  vornehmen, melden.
- Der Rot-Fall-Beleg NACHHER (Schritt 6) läuft durch statt verweigert zu
  werden → sofort anhalten, alte `.js`-Fassung über `git mv` zurückholen,
  melden.
- Der Grün-Fall (Schritt 7) wird verweigert → anhalten, nicht eigenmächtig
  nachbessern, melden.
- `grep`-Treffer aus Schritt 8 außerhalb der drei bekannten Gruppen →
  anhalten, vollständige Fundliste zeigen, nicht selbst einordnen.
- `git status` zu Beginn nicht sauber → anhalten, Ausgabe zeigen.
- Unklarheit zu `state/gates.md`-Zeile für den Kalibrierungs-Log-Eintrag
  (siehe CONTEXT, offene Unsicherheit) lässt sich nicht durch Lesen der
  Datei zu Beginn des Laufs auflösen → anhalten, Ist-Zustand der Datei im
  Bericht zeigen, keine Zeilennummer raten.

FOLGT:
- Dieser Plan v1 geht in eine frische Sitzung zum Advisor-Pass nach
  `.claude/skills/advisor-pass/SKILL.md`, bevor SCOPE ausgeführt wird
  (Stefan-Entscheidung Option A, `claude/42_UEBERGABE_NEUER_CHAT_7.md`
  Abschnitt 1).
- Die offene Unsicherheit zu `state/gates.md:19` sollte der Advisor oder
  die ausführende Sitzung als Erstes klären, bevor Schritt 12 an eine
  falsche Zeile gebunden wird.
```

---

## Nachtrag 22.08.2026 — Korrekturen aus der Übergabe-Prüfung im Projektchat

Entstehung: Der Projektchat hat nach dem Schreiben dieses Plans geprüft, ob
der Stand aus `claude/42_UEBERGABE_NEUER_CHAT_7.md` im Repo umgesetzt ist.
Dabei sind zwei Faktenfehler in CONTEXT und ein struktureller Fehler in
SCOPE aufgefallen. Der Vertragstext oben bleibt im Wortlaut stehen (Schritt
10 des Advisor-Pass-Skills); was gilt, steht hier.

**Methodische Grenze aller Nachtrags-Fakten:** Rohdatei-Abruf über
`WebFetch` auf `raw.githubusercontent.com`, Branch `main`, am 22.08.2026.
Die GitHub-API (403) und die HTML-Ansicht (robots.txt) waren aus der
prüfenden Umgebung nicht erreichbar. **Dateiinhalte sind belastbar,
Zeilennummern nur bedingt** — die Aufbereitung lieferte an mehreren Stellen
doppelte Nummern. Wo unten eine Zeilennummer steht, ist der Inhalt der
Beleg, nicht die Nummer.

### N1 — Die Belegstelle „`state/gates.md:19` … ERZWUNGEN | gemessen" ist widerlegt

`[Fakt]` Die Strings `ERZWUNGEN` und `gemessen` kommen in `state/gates.md`
(main) nicht vor. Die Gate-Tabelle trägt die Spalten
`Gate | Datei | Prüft | Rot-Fall (bekannt) | Grün-Fall (bekannt)` — es gibt
dort keine Durchsetzungsgrad-Spalte. `[Fakt]` Auch
`docs/guide/03-DEEPDIVE-gates.md` enthält keinen der beiden Strings.

`[Schlussfolgerung]` Der in der Übergabe zitierte Wortlaut existiert im
Repo nicht. Die *inhaltliche* Aussage der Übergabe bleibt richtig — die
Gate-Tabelle führt für die commit-guard-Zeile reale Rot- und Grün-Fälle als
belegt —, aber sie ist über diese Belegstelle nicht zitierbar. Der
CONTEXT-Bullet, der von dieser Belegstelle ausgeht, ist als Zitat
unbrauchbar.

### N2 — Die offene Unsicherheit zu Zeile 19 ist aufgelöst; SCOPE 12 bekommt einen inhaltlichen Anker

`[Fakt]` Die Gate-Tabelle in `state/gates.md` besteht aus Kopfzeile,
Trennzeile und zehn Datenzeilen in dieser Reihenfolge: Doku-Gate,
Regel-Gate, Linter-Gate `noExplicitAny`, Linter-Gate `noFloatingPromises`,
Vertrags-Gate, CI, Branch Protection, `guard-settings.js`-Hook,
`commit-guard.js`-Hook, Zwischenstand-Loop. Die Commit-Guard-Zeile ist die
**neunte** Datenzeile.

`[Schlussfolgerung]` Zählt man ab dem Tabellenkopf, landet sie auf Zeile 19
— die *Zeilennummer* der Übergabe war richtig, nur ihr Zitat falsch. Die
Behauptung im CONTEXT oben („die dortige Zeile 19 zeigt eine
Regel-Gate-Zeile ohne Bezug zum Commit-Guard") ist damit **widerlegt**. Der
Regel-Gate-Eintrag ist die zweite Datenzeile, nicht die neunte.

**Geltende Fassung von SCOPE 12** (ersetzt den letzten Satz dort):

> Zielzeile für das Nachziehen auf `.cjs` ist die Tabellenzeile, die mit
> `` | `commit-guard.js`-Hook | `` beginnt (Spalten `Gate` und `Datei`).
> Der Kalibrierungs-Log-Eintrag wird ans Ende des Abschnitts
> `## Kalibrierungs-Log` angefügt. Keine Zeilennummer raten, keine
> Zeilennummer aus diesem Plan übernehmen — die Zeile über ihren Inhalt
> suchen.

**Der sechste ESCALATE-Punkt** („Unklarheit zu `state/gates.md`-Zeile …")
**entfällt ersatzlos.**

### N3 — `state/gates.md` ist keine homogene „lebende Dokumentation"; SCOPE 9 braucht eine Trennung

`[Fakt]` Die Datei besteht aus zwei strukturell verschiedenen Teilen: der
Gate-Tabelle (Ist-Zustand) und dem Abschnitt `## Kalibrierungs-Log` mit
datierten Beobachtungsprotokollen. Im Log stehen unter anderem die
Einträge „2026-08-17, `commit-guard.js`-Hook, Härtung …", „2026-08-17,
`commit-guard.js`-Hook, Nachtrag zur Härtung …", „2026-08-17,
`commit-guard.js`-Hook, realer Grün-Fall Push-Pfad …" und „2026-08-17,
Zwischenstand-Loop …" (letzterer nennt `zwischenstand-pruefen.js` und
`zwischenstand-laden.js`).

`[Schlussfolgerung]` Diese Einträge protokollieren Läufe, die real gegen
Dateien mit der Endung `.js` stattgefunden haben. Sie auf `.cjs`
umzuschreiben, fiele unter genau dieselbe Begründung, mit der SCOPE 10
`docs/harness/programm-historie/*` schützt: rückwirkende Korrektur würde
Geschichte fälschen. SCOPE 9 in seiner obigen Fassung würde das aber
verlangen.

**Geltende Fassung von SCOPE 9:**

> Die Gruppe „lebende Dokumentation" auf `.cjs` nachziehen, mit einer
> Ausnahme innerhalb von `state/gates.md`: **nur die Gate-Tabelle** (Spalten
> `Gate` und `Datei` der Zeilen zu `commit-guard`, Zwischenstand-Loop) wird
> nachgezogen. Einträge unterhalb von `## Kalibrierungs-Log` mit einem
> Datum vor diesem Vertrag bleiben **unverändert** — sie sind
> Beobachtungsprotokoll, nicht Ist-Beschreibung.

**Ergänzung zu SCOPE 8:** `grep`-Treffer in `state/gates.md` unterhalb von
`## Kalibrierungs-Log` sind **erwartete** Treffer und lösen den
ESCALATE-Fall „Treffer außerhalb der drei bekannten Gruppen" nicht aus.

### N4 — `diagnose-hook-crash` existiert lokal noch

`[Fakt, laut Stefan, 22.08.2026]` Auf die Rückfrage „existiert
`diagnose-hook-crash` lokal noch (`git branch --list diagnose-hook-crash`)"
lautete die Antwort `diagnose-hook-crash`. `[Schlussfolgerung, Lesart des
Projektchats]` Das ist die Ausgabe des Befehls bei vorhandenem Branch — der
Branch existiert lokal weiterhin. `[Fakt]` Auf `origin` existiert er nicht
(Rohabruf zweier Dateien auf diesem Branch → HTTP 404).

**Geltende Fassung von SCOPE 13:** Der Prüfschritt entfällt; der Branch
wird gelöscht (`git branch -D diagnose-hook-crash`) und das Ergebnis
wortwörtlich im Bericht festgehalten. Weicht die Ausgabe zu Beginn des
Laufs von der Erwartung ab (Branch nicht vorhanden), ist das im Bericht
festzuhalten, nicht stillschweigend zu übergehen.

### N5 — Reparaturumfang ist jetzt selbst verifiziert, nicht mehr nur aus der Übergabe übernommen

Der CONTEXT-Bullet „[Fakt, laut Übergabe …, in dieser Sitzung NICHT erneut
gegen das Repo verifiziert]" ist für die funktionale Gruppe und die
Doku-Gruppe **eingelöst**. `[Fakt]` Stand `main`, 22.08.2026:

- `.claude/settings.json`: alle fünf `command`-Zeilen weiterhin `.js`.
- `.claude/hooks/commit-guard.cjs` → HTTP 404, existiert nicht.
- `.claude/hooks/commit-guard.js`: `require("fs")` / `require("path")`
  (~Z. 35–36), `if (require.main === module)` (~Z. 231),
  `module.exports = { … }` (~Z. 237).
- `.claude/hooks/session-reminder.js`: Z. 2–4 drei `require(...)`.
- `package.json`: `"type": "module"` unverändert.
- `docs/harness/HARNESS-OVERVIEW.md` (~Z. 57–58): nennt
  `guard-settings.js, session-reminder.js, zwischenstand-laden.js,
  zwischenstand-pruefen.js`.
- `docs/guide/03-DEEPDIVE-gates.md` (~Z. 23): nennt
  `.claude/hooks/commit-guard.js`.
- `docs/guide/02-DEEPDIVE-claude-ordner.md`: nennt `guard-settings.js`,
  `session-reminder.js`, `zwischenstand-laden.js`,
  `zwischenstand-pruefen.js`.
- Der String `.cjs` kommt in keiner der geprüften Dateien vor.

`[Schlussfolgerung]` Der GOAL-Zustand ist auf `main` nicht erreicht; die
CONTEXT-Prämisse trägt unverändert.

`[Fakt]` Nicht eingelöst bleibt der diagnostische Commit `a9cd6ed` — er
liegt auf einem lokalen, nie gepushten Branch und ist von außen nicht
prüfbar. Er bleibt „laut Übergabe belegt", nicht „hier verifiziert".

### N6 — Ablage und Doku-Gate

`[Fakt]` `.claude/skills/advisor-pass/SKILL.md`, Schritt 2: „Schreibe Plan
v1 als Datei, nicht ins Fenster (`state/plan-v1-<slug>.md`)." Verlangt ist
**schreiben**, nicht committen — diese Datei erfüllt die Anforderung, sobald
sie unter dem oben genannten Ziel-Pfad im Arbeitsbaum liegt. Ein Commit ist
dafür nicht nötig und wäre wegen der offenen B6-Lücke ohnehin ungegatet.

`[Fakt]` `scripts/check-docs.mjs`, Prüfung 1 (tote Verweise) scannt
`anweisungsDateien` (Wurzel-Dokumente), `.claude/agents/*.md`,
`.claude/skills/*/SKILL.md` und `.claude/commands/*.md` — **kein Pfad unter
`state/`**. `[Schlussfolgerung]` Die Backtick-Verweise dieser Datei auf die
noch nicht existierenden `.cjs`-Pfade lösen keinen Doku-Gate-Befund aus.

---

## Offener Punkt, nicht stillschweigend entschieden

1. `[offene Unsicherheit]` `docs/guide/07-TOKEN-SPAREN.md`: Der Abruf des
   Projektchats war in sich widersprüchlich — die Trefferliste kam leer
   zurück, der Fließtext derselben Antwort erwähnte aber `session-reminder.js`.
   Ob die Datei einen der vier alten Namen führt, ist **nicht geklärt**. Der
   `grep` aus SCOPE 8 beantwortet das im Lauf; bis dahin bleibt die Datei in
   der Doku-Gruppe gelistet, ohne dass ein Treffer behauptet wird.
2. `[offene Unsicherheit]` Alle Zeilennummern in Plan und Nachtrag stammen
   aus einem nicht zeilenexakten Abruf. Die ausführende Sitzung arbeitet mit
   Inhalts-Ankern, nicht mit den Nummern aus diesem Dokument.
3. `[offene Unsicherheit]` Ob der Hook-Runner einen beim Laden crashenden
   Hook wirklich wie „nicht registriert" behandelt — oder ob eine andere
   Ursache den Durchlauf erklärt — ist hergeleitet und durch den Test in
   der Übergabe gestützt, aber nicht am Runner-Verhalten selbst gemessen.
   SCOPE 2 und SCOPE 6 sind die Stelle, an der sich das entscheidet.

---

## Nachtrag 2 — 22.08.2026: Reihenfolge und realer Arbeitsbaum

Entstehung: Nach dem ersten Nachtrag wurde der lokale Arbeitsbaum erstmals
direkt gelesen (vorher nur `raw.githubusercontent.com`). Der Ist-Zustand
weicht von dem ab, was Plan und Übergabe unterstellen.

### N7 — Reihenfolge geändert: B6 läuft VOR Vertrag 1

`[Fakt, Stefan-Entscheidung 22.08.2026]` Die in
`claude/41_VERTRAGSPAKET.md` festgelegte und in
`claude/40_ARCHITEKTUR_A1_A9.md` als Hinweis 4 bestätigte Reihenfolge
`1 → 2 → 4 → 3` wird zu **`B6 → 1 → 2 → 4 → 3`**. Architektur-Hinweis 4 ist
damit **überholt**, nicht verworfen — er war gegen den damaligen
Kenntnisstand richtig, in dem B6 noch unbekannt war.

`[Fakt]` `state/tasks/harness-b1b3-merge-guard-und-git-flow.md`, SCOPE 5–10
verlangen Rot-Fälle der Bauart „muss vom Hook verweigert werden", mit der
Auflage „Der Beleg gilt nur dann als Hook-Rot-Fall, wenn die Meldung mit
`commit-guard:` beginnt."

`[Schlussfolgerung]` Bei nicht ladendem Hook (Befund B6) laufen genau diese
Aufrufe durch, statt verweigert zu werden. Vertrag 1 ist solange technisch
nicht kalibrierbar — er würde unweigerlich in seinen eigenen ESCALATE
laufen. Die Reihenfolgeänderung behebt eine Sperre, sie ist keine
Priorisierungsfrage.

### N8 — Ist-Zustand des Arbeitsbaums, direkt gemessen

`[Fakt, gemessen 22.08.2026, lokaler Arbeitsbaum]`

- HEAD stand auf `diagnose-hook-crash`, Commit `a9cd6ed "diagnose"` — dem
  Fail-Open-Beleg aus der Übergabe. Er ist real und war ausgecheckt.
- `main`, `origin/main` und `harness-b1b3-merge-guard` zeigen alle auf
  denselben Commit `be09527`. Auf dem Arbeitsbranch von Vertrag 1 liegt
  **kein einziger** Vertrag-1-Commit.
- Vertrag 1 SCOPE 2, 3 und 4 sind **gebaut, aber unkommittiert**:
  `.claude/hooks/commit-guard.js` (+58 Zeilen, „Aufgabe 4" mit
  `gh`-Merge-Pfad und `branches/…/protection`, eigener `try`/`catch`) und
  `.claude/skills/git-flow/SKILL.md` (Schritt 3 auf `git fetch origin` plus
  Vier-Ausgänge-Prüfung). SCOPE 5–13 (Kalibrierung, PR) fehlen vollständig.
- `state/freigabe-commit.md` liegt unverbraucht im Arbeitsbaum. Nicht
  gelesen, nicht angefasst — sie ist per Doktrin für das Modell
  unerreichbar.
- HEAD wurde am 22.08.2026 auf `harness-b1b3-merge-guard` gewechselt; die
  beiden geänderten Dateien sind konfliktfrei mitgewandert (beide
  Branch-Spitzen tragen für diese Dateien identischen Inhalt). Eine
  Sicherungskopie liegt außerhalb der Versionierung unter
  `_backup-vertrag1/`.

**Neue Vorbedingung zu SCOPE 1:** „`git status` sauber, aktueller `main`"
ist erst erfüllt, wenn die unkommittierte Vertrag-1-Arbeit geparkt ist
(Stash, eigener Worktree oder Teilstand-Commit — offene Entscheidung, siehe
unten). Startet der B6-Lauf davor, greift sein eigener ESCALATE-Punkt
„`git status` zu Beginn nicht sauber".

### N9 — SCOPE 14: die `gh`/`merge`-Auflage bindet zum Zeitpunkt des B6-Laufs nicht

`[Fakt]` `be09527` (= `main`) enthält von Vertrag 1 nur den Vertragstext
(`979abe0`), nicht die Hook-Erweiterung. `[Schlussfolgerung]` Die Auflage in
SCOPE 14 („falls dessen Merge-Guard-Erweiterung zu diesem Zeitpunkt bereits
auf `main` liegt") ist zum Zeitpunkt des B6-Laufs **nicht einschlägig**. Der
Prüfschritt bleibt trotzdem stehen — er ist billig und wird nach dem Merge
von Vertrag 1 wieder scharf.

### N10 — SCOPE 13: Löschung von `diagnose-hook-crash`, zwei Ergänzungen

`[Fakt]` Ein Branch, auf dem HEAD steht, lässt sich nicht löschen. Durch den
Wechsel aus N8 ist diese Blockade beseitigt.

`[Fakt]` `a9cd6ed` ist ausschließlich über `diagnose-hook-crash` erreichbar
und nie gepusht. `[Schlussfolgerung]` Mit der Löschung verschwindet der
einzige erreichbare Beleg-Commit für den Fail-Open-Zustand. Das ist
vertretbar, weil SCOPE 2 den Rot-Fall vor der Reparatur neu erzeugt — aber
im Bericht ausdrücklich zu vermerken, nicht stillschweigend zu vollziehen.

### N11 — Erledigt aus dem Advisor-Auftrag

Prüfpunkt 5 des Advisor-Prompts („Greift die Auflage in SCOPE 14?") ist
durch N9 beantwortet. Er bleibt als Gegenprobe im Auftrag stehen — der
Advisor hat Dateizugriff und soll die Aussage prüfen, nicht übernehmen.

### N12 — Der B6-Lauf findet in einem eigenen Worktree statt

`[Fakt, Stefan-Entscheidung 22.08.2026]` Die unkommittierte Vertrag-1-Arbeit
wird weder gestasht noch als Teilstand committet. Stattdessen läuft B6 in
einem separaten Git-Worktree; der bestehende Arbeitsbaum bleibt unberührt.

`[Fakt]` `git fetch origin` und
`git rev-list --left-right --count main...origin/main` → `0 0`,
Gleichstand. `[Fakt]` `git worktree list` zeigt bislang nur den
Haupt-Arbeitsbaum (`be09527`, Branch `harness-b1b3-merge-guard`).

**Anzulegen, einmalig, vor dem Lauf** (nativ auf dem Rechner auszuführen,
nicht über eine Dateibrücke — ein Worktree speichert absolute Pfade, und
ein über einen Sitzungs-Mount angelegter Pfad wäre nativ ungültig):

```
cd C:\Users\stefa\Projekte\ai-workforce
git worktree add -b harness-b6-hooks-cjs-migration C:\Users\stefa\claude-worktrees\ai-workforce-b6 main
```

**Wirkung auf SCOPE 1:** „`git status` sauber, aktueller `main`, eigener
Branch angelegt" ist durch den Worktree bereits erfüllt. Der ausführende
Lauf **branched nicht erneut** — `.claude/skills/git-flow/SKILL.md`
Schritt 2 deckt genau diesen Fall ab („Läuft die Sitzung bereits in einem
dedizierten Worktree auf dem passenden Branch: NICHT von `main` neu
branchen."). SCOPE 1 wird zur Bestätigung statt zur Handlung: Zustand
zeigen, nicht herstellen.

**Wirkung auf den Advisor-Pass:** Er läuft ebenfalls im neuen Worktree, nicht
im Haupt-Arbeitsbaum. `[Fakt]` Dort trägt `.claude/hooks/commit-guard.js`
die unkommittierte Vertrag-1-Erweiterung („Aufgabe 4"), die auf `main` nicht
existiert. `[Schlussfolgerung]` Ein Advisor, der die CONTEXT-Fakten dieses
Plans im Haupt-Arbeitsbaum gegenprüft, läse einen Dateizustand, den der Plan
nicht meint, und käme zu falschen Befunden. Diese Datei ist unversioniert
und wandert nicht automatisch mit — sie muss vor dem Advisor-Lauf in den
neuen Worktree kopiert werden.

---

## Nachtrag 3 — 22.08.2026: Auflösung der Advisor-Findings

Der Advisor-Bericht liegt im Wortlaut unter
`state/advisor-findings-harness-b6-hooks-cjs-migration.md`. Urteil:
**Freigegeben mit Hinweisen.** Er ist Evidenz, keine Anweisung — jedes
Finding wurde im Projektchat am realen Repo gegengeprüft, bevor es hier
Geltung bekommt. Ergebnis der Gegenprüfung: **alle acht Findings bestätigt,
zusätzlich zwei Treffer, die der Advisor nicht hatte.**

### N13 — Vollständige Trefferliste und Klassifikation (löst Finding 1)

`[Fakt]` Repo-weiter Grep der vier Altnamen im b6-Worktree, alle 28 Dateien
mit Treffern, klassifiziert:

| Gruppe | Dateien | Behandlung |
|---|---|---|
| **Funktional** | `.claude/settings.json` (Z. 18, 25, 33, 41) | auf `.cjs` nachziehen. Z. 12 (`guard-settings.js`) bleibt |
| **Lebende Doku** | `docs/harness/HARNESS-OVERVIEW.md` (41–42), `docs/guide/02-DEEPDIVE-claude-ordner.md` (113–115, 119, 122), `docs/guide/03-DEEPDIVE-gates.md` (22, 35), `docs/guide/07-TOKEN-SPAREN.md` (118), `state/gates.md` (19, 20 = Tabelle) | auf `.cjs` nachziehen |
| **Lebende Doku, NEU aufgenommen** | `docs/harness/zaehne-taxonomie.md` (42, 43, 45 = Zähne H3, H4, H6) | auf `.cjs` nachziehen. Z. 40 (H1, `guard-settings.js`) bleibt |
| **Kopfkommentare in den umbenannten Dateien selbst** | `commit-guard.js` (2, 16), `zwischenstand-laden.js` (2), `zwischenstand-pruefen.js` (2) | siehe N14 |
| **Kommentar in einer NICHT umbenannten Datei** | `guard-settings.js` (5) | siehe N14, benannte Abweichung |
| **Kommentar ohne Wirkung** | `.gitignore` (25) | siehe N14 |
| **Protokoll, bleibt unverändert** | `state/gates.md` (41, 44, 51, 164, 197, 248, 289 = Kalibrierungs-Log ab Z. 22) | N3 |
| **Historische Vertragsakten, nicht anfassen** | `docs/harness/programm-historie/*` (10 Dateien), `state/tasks/harness-setup-0a…`, `-0b…`, `-0d…`, `-4c…` | SCOPE 10 |
| **Aktiver, noch nicht ausgeführter Vertrag** | `state/tasks/harness-b1b3-merge-guard-und-git-flow.md` (14, 17, 62, 121, 138) | **offen, siehe unten** |
| **Dieser Plan selbst** | `state/plan-v1-harness-b6-hooks-cjs-migration.md` | nicht anfassen, beschreibt den Ausgangszustand |

**Geltende Fassung von SCOPE 8:** Der `grep` bleibt Pflicht und wird im
Wortlaut gezeigt. ESCALATE greift nur noch bei Treffern in Dateien, die
**nicht** in der Tabelle oben stehen. Treffer in gelisteten Dateien werden
nach Tabelle behandelt, nicht neu eingeordnet.

**Geltende Fassung von SCOPE 9:** Die Doku-Gruppe wird um
`docs/harness/zaehne-taxonomie.md` erweitert (fünf → sechs Dateien).

### N14 — Pfadverweise nachziehen (löst Finding 2, plus zwei Zusatztreffer)

`[Fakt]` Der Advisor nennt drei `Datei:`-Kopfzeilen. Die Gegenprüfung fand
**zwei weitere** Verweise, die er nicht hatte:

- `.claude/hooks/commit-guard.js:16` — Querverweis „siehe Kopfkommentar
  `zwischenstand-laden.js`" auf eine **andere** der vier umbenannten
  Dateien. Ein Fix, der nur die `Datei:`-Zeile anfasst, übersieht ihn.
- `.claude/hooks/guard-settings.js:5` — nennt
  `(.claude/hooks/commit-guard.js)` im Kopfkommentar. Diese Datei wird
  **nicht** umbenannt, ihr Verweis zeigt danach trotzdem ins Leere.

**Neuer SCOPE-Unterschritt 3b:** Nach den vier `git mv` in allen fünf
Hook-Dateien die Pfadverweise auf `.cjs` nachziehen:
`commit-guard.cjs` Zeile 2 und 16, `zwischenstand-laden.cjs` Zeile 2,
`zwischenstand-pruefen.cjs` Zeile 2, `guard-settings.js` Zeile 5.
`session-reminder.js` trägt keinen solchen Verweis.

**Ergänzung zu SCOPE 9:** `.gitignore:25` (Kommentar zur Freigabe-Datei,
nennt `commit-guard.js`) ebenfalls nachziehen. Ohne Wirkung auf das
Ignorier-Verhalten, aber derselbe tote Pfad.

**Benannte Abweichung von der NICHT-Klausel:** Dort steht
„`.claude/hooks/guard-settings.js` umbenennen oder **inhaltlich anfassen**"
— verboten. Die Änderung an Zeile 5 ist eine reine Pfadkorrektur im
Kommentar, keine Verhaltensänderung; die Datei bleibt funktional und
namentlich unverändert. `[offene Unsicherheit]` Diese Auslegung ist eine
Auslegung. Verwirft Stefan sie, bleibt Zeile 5 auf `.js` stehen und wird
im Bericht als bewusst stehen gelassener toter Verweis vermerkt.

### N15 — Zeilenangaben im CONTEXT sind ungültig (löst Finding 7)

`[Fakt]` Der Advisor hat mit Dateizugriff nachgemessen; die Gegenprüfung
bestätigt jede Zahl:

| Stelle | Plan/N5 behauptet | real |
|---|---|---|
| `.claude/settings.json`, fünf `command`-Zeilen | 9, 14, 20, 26, 32 | **12, 18, 25, 33, 41** |
| `commit-guard.js`, `require` | 37 | **36–37** |
| `commit-guard.js`, `module.exports` | 101 | **240** |
| `commit-guard.js`, `require.main` | (ohne Zeile) | **234** |
| `session-reminder.js`, `require` | 1–3 | **2–4** |
| `zwischenstand-laden.js`, `require` | 7–9 | **12–14** |
| `zwischenstand-pruefen.js`, `require` | 6–8 | **9–11** |
| `HARNESS-OVERVIEW.md`, Hook-Namen (N5) | ~57–58 | **41–42** |

`[Schlussfolgerung]` Sämtliche Zeilenangaben im Vertragstext und in
Nachtrag 1 sind **ungültig**, nicht nur ungenau — die Abweichung erreicht
139 Zeilen. Sie bleiben als Original-Wortlaut stehen, gelten aber nicht.
Die ausführende Sitzung arbeitet ausschließlich mit Inhalts-Ankern. Die
Angaben in dieser Tabelle sind mit Dateizugriff gemessen und tragen.

`[Fakt, entlastend]` Inhaltlich trägt jede CONTEXT-Aussage: `"type":
"module"` steht in `package.json`, alle fünf Hooks werden mit `.js`
referenziert, vier nutzen CommonJS, `guard-settings.js` nutzt keines von
beidem. Falsch waren die Nummern, nicht die Befunde.

### N16 — `git mv` verifizieren (löst Finding 5)

`[Fakt]` `CLAUDE.md`, „Bekannte Fallen", warnt vor stillem Nicht-Staging
(OneDrive-Reparse-Points) und verlangt einen `git status`-Nachlauf.

**Neuer SCOPE-Unterschritt 3c:** Nach den vier `git mv` einmal `git status`
zeigen und belegen, dass alle vier als **Rename** erscheinen (`R`), nicht
als getrenntes Delete+Add und nicht gar nicht.

**Neuer ESCALATE-Punkt:** Erscheint ein Rename nicht oder nur als
Delete+Add → anhalten, `git status` im Wortlaut zeigen, nicht selbst
nachbessern.

### N17 — Unversehrtheit des Kalibrierungs-Logs belegen (löst Finding 4)

`[Fakt]` `scripts/check-docs.mjs` prüft tote Verweise, Versionsnummern und
Datums-Widersprüche — nicht, ob N3s Trennung eingehalten wurde. Es gibt
keinen automatischen Fänger.

**Ergänzung zu OUTPUT:** Zusätzlich zum Gesamt-Diff einen gezielten Nachweis
zeigen, dass in `state/gates.md` unterhalb von `## Kalibrierungs-Log`
(ab Zeile 22) keine Zeile verändert wurde — außer dem neu angefügten
B6-Eintrag aus SCOPE 12.

### N18 — Ursache statt nur Symptom belegen (löst Finding 3)

**Ergänzung zu SCOPE 2 und SCOPE 6:** Zusätzlich zum Commit-Ausgang den
rohen Hook-Fehlertext zeigen, soweit der Harness ihn sichtbar macht. Zeigt
er keinen, ist das selbst festzuhalten — dann bleibt der Mechanismus
hergeleitet, nicht gemessen, und Offener Punkt 3 bleibt offen. Nicht
stillschweigend als bewiesen führen.

### N19 — N12 präzisiert (löst Finding 8)

SCOPE 1 ist durch den Worktree erfüllt — **sauber bis auf die erwarteten
unversionierten Dateien** `state/plan-v1-harness-b6-hooks-cjs-migration.md`
und `state/advisor-findings-harness-b6-hooks-cjs-migration.md`. Weitere
untracked-Einträge sind ein ESCALATE-Fall.

### N20 — Offener Punkt 1 aus Nachtrag 1 ist aufgelöst

`[Fakt]` `docs/guide/07-TOKEN-SPAREN.md:118`: „Der Hook
`session-reminder.js` meldet sich alle 30 Nachrichten." Die Datei gehört
zur Doku-Gruppe, ein Treffer. Der widersprüchliche Abruf aus Nachtrag 1 ist
damit erledigt.

### N21 — Warum `.cjs` und nicht ESM (Begründung statt Annahme)

`[Fakt]` `commit-guard.js:234` nutzt `require.main === module`, Zeile 240
`module.exports`. `[Schlussfolgerung]` Eine ESM-Umschreibung bräuchte einen
Ersatz für `require.main === module` (`import.meta`-Vergleich) und würde
damit die Ausführungslogik des Guards anfassen — die NICHT-Klausel
(„Inhaltliche Logik eines der fünf Hooks ändern") verbietet genau das. Der
Endungswechsel ist deshalb nicht nur der einfachere, sondern der einzige
Weg, der die NICHT-Klausel einhält. Die `[Annahme]` im CONTEXT wird durch
diese Begründung ersetzt.

---

## Offener Punkt, nicht stillschweigend entschieden (Stand Nachtrag 3)

**O1 — `state/tasks/harness-b1b3-merge-guard-und-git-flow.md` und die
unkommittierte Vertrag-1-Arbeit.** Der Vertragstext von Vertrag 1 liegt auf
`main` und nennt `commit-guard.js` fünfmal als Bearbeitungsziel. Zusätzlich
liegen im Haupt-Arbeitsbaum 68 unkommittierte Zeilen, die genau diese Datei
ändern. `[Schlussfolgerung]` Benennt B6 die Datei um, zeigt der Vertragstext
auf einen nicht mehr existierenden Pfad, und die unkommittierte Arbeit hängt
an einem Dateinamen, den `main` nicht mehr kennt. Nicht entschieden, nicht
geraten.

**O2 — BUDGET.** „Ein Baudurchgang plus höchstens eine Korrekturrunde" für
14 SCOPE-Schritte mit inzwischen neun Belegausgaben. Nicht entschieden.

**O3 — Auslegung der NICHT-Klausel zu `guard-settings.js:5`** (siehe N14).
Vorschlag liegt vor, Bestätigung steht aus.

### N22 — O1 entschieden: B6 zieht den Vertragstext von Vertrag 1 mit (Option A)

`[Fakt, Stefan-Entscheidung 22.08.2026]` Option A zu O1.

**Neuer SCOPE-Unterschritt 9b:** In
`state/tasks/harness-b1b3-merge-guard-und-git-flow.md` die fünf Vorkommen
von `commit-guard.js` (Inhalts-Anker, nicht nach Zeilennummer suchen) auf
`commit-guard.cjs` nachziehen. **Ausschließlich die Dateinamen.** Kein
Eingriff in GOAL, CONTEXT, SCOPE, NICHT, BUDGET, OUTPUT oder ESCALATE
dieses Vertrags — weder inhaltlich noch sprachlich.

**Pflicht-Nachtrag im fremden Vertrag:** Am Ende von
`harness-b1b3-merge-guard-und-git-flow.md` anfügen:
„Nachtrag <Datum>: Dateinamen durch Vertrag
`harness-b6-hooks-cjs-migration` von `.js` auf `.cjs` nachgezogen.
Wortlaut sonst unverändert." Eine stille Änderung an einem fremden
Vertragstext ist ausgeschlossen.

**Ergänzung zu OUTPUT:** Den Diff dieser einen Datei separat zeigen, damit
belegt ist, dass nur Dateinamen geändert wurden.

**Grenze des Präzedenzfalls** — damit daraus kein Freibrief wird: Ein
Vertrag darf den Text eines anderen nur dann anfassen, wenn alle drei
Bedingungen zutreffen: (1) der fremde Vertrag ist **noch nicht ausgeführt**,
(2) die Änderung betrifft **ausschließlich einen Pfad oder Dateinamen**,
(3) dieser Pfad wird **durch den eigenen Vertrag** ungültig. Trifft eines
davon nicht zu, gilt weiterhin: nicht anfassen.

`[Fakt]` Nicht Teil dieses Vertrags: Die 68 unkommittierten Zeilen der
Vertrag-1-Arbeit im Haupt-Arbeitsbaum ändern `commit-guard.js`. Nach der
Umbenennung existiert diese Datei nicht mehr; die Arbeit muss von Hand auf
`commit-guard.cjs` übertragen werden. Vollständige Dateikopien liegen
außerhalb der Versionierung unter `_backup-vertrag1/`. Das geschieht bei
der Ausführung von Vertrag 1, nicht hier.

### N23 — 23.08.2026: SCOPE 6 blockiert sich selbst — `.claude/settings.json` ist gegen Edit/Write geschützt

Entstehung: Während der Ausführung (Bauauftrag, Plan v2) meldete die
bauende Sitzung eine fehlgeschlagene Änderung an `.claude/settings.json`.
Der Projektchat hat den Ist-Zustand direkt am Gerät nachgeprüft.

`[Fakt, verifiziert]` Beide `settings.json`-Dateien (Hauptrepo und
Worktree) sind zum Prüfzeitpunkt gültiges JSON und tragen alle fünf Hooks
unverändert, `guard-settings.js` eingeschlossen. Im Hauptrepo ist die Datei
laut `git status` **nicht** als geändert markiert — sie entspricht exakt
dem committeten Stand. `[offene Unsicherheit]` Ob die im Bericht
beschriebene JSON-Beschädigung real eingetreten und zwischenzeitlich
zurückgenommen wurde, oder ob der Bericht sich auf einen nicht persistent
gewordenen Zwischenstand bezog, ist nicht rekonstruierbar. Für den weiteren
Verlauf ist nur der Ist-Zustand maßgeblich: kein Schaden nachweisbar.

`[Fakt]` `.claude/hooks/guard-settings.js` blockiert Edit/Write ausschließlich
auf zwei Pfade: `.claude/settings.json` und `state/freigabe-commit.md`. Der
Denial-Text lautet wörtlich: „Absichtliche Aenderung: Hook in
.claude/settings.json (hooks.PreToolUse) temporaer entfernen, Grund im
Commit nennen."

`[Schlussfolgerung]` **SCOPE 6 dieses Vertrags — den ausführenden Agenten
`.claude/settings.json` per Edit/Write ändern zu lassen — ist mit dem
eigenen Sicherheitsmodell des Repos unvereinbar.** Der Guard existiert
genau dafür, Schreibzugriff des Modells auf diese Datei zu verweigern; sie
ist laut `commit-guard.js`s eigenem Wortlaut „Team-Policy … wird nur vom
Menschen im eigenen Editor geändert". Das ist ein Konstruktionsfehler in
Plan v1 und Plan v2, der weder beim Schreiben noch im Advisor-Pass
aufgefallen ist — keiner der acht Advisor-Findings benennt ihn.

`[Fakt]` Die im Denial-Text genannte Ausnahme („Hook temporär entfernen")
setzt voraus, dass **der Mensch** die Entfernung vornimmt — er ist der
Einzige, den der Guard nicht blockiert. Ein Agent, der versucht, den
Guard-Eintrag selbst zu entfernen, um sich damit den eigenen Schreibzugriff
freizuschalten, unterläuft genau den Zweck des Gates, nicht nur seine
Unbequemlichkeit. **Das ist in diesem Vertrag nicht vorgesehen und wird
hiermit ausdrücklich untersagt** — unabhängig davon, ob es als temporäre
oder dauerhafte Entfernung gerahmt wird, und unabhängig vom Zielort
(Worktree oder Hauptrepo).

**Geltende Fassung von SCOPE 6:** Der Schritt wird zu einem STOP:

> Die vier zu ändernden Zeilen (alt/neu) exakt vorlegen und den Menschen
> bitten, sie **selbst, in seinem eigenen Editor**, in der
> Worktree-Datei `.claude/hooks/settings.json` [sic: `.claude/settings.json`]
> zu ändern. Kein Edit/Write-Aufruf auf diese Datei durch den Agenten. Kein
> Entfernen, Auskommentieren oder Umgehen des `guard-settings.js`-Eintrags
> — weder temporär noch dauerhaft, weder im Worktree noch im Hauptrepo.
> Warten, bis der Mensch die Änderung bestätigt, dann mit SCOPE 7
> fortfahren.

**Neuer ESCALATE-Punkt:** Jeder Versuch — eigener oder vorgeschlagener —,
den PreToolUse-Eintrag von `guard-settings.js` zu entfernen oder zu
umgehen, ist sofort zu melden und zu unterlassen, auch wenn er als
Lösung für SCOPE 6 erscheint.

`[Fakt, entlastend]` SCOPE 3, 4 und 5 sind davon nicht betroffen —
`guard-settings.js` schützt nur `.claude/settings.json` und
`state/freigabe-commit.md`, nicht die Hook-Dateien selbst. Im Worktree
sind SCOPE 3 (vier `git mv` zu `.cjs`) und SCOPE 5 (Pfadverweise, inklusive
des Querverweises in `guard-settings.js:5` selbst) bereits korrekt
durchgeführt — verifiziert: `guard-settings.js` nennt jetzt
`commit-guard.cjs`.

### N24 — 23.08.2026: Freigabe-Datei-Pflicht ersatzlos entfernt (Stefan-Entscheidung), commit-guard entsprechend verschlankt

`[Fakt, Stefan-Entscheidung 23.08.2026]` Auslöser: SCOPE 8 (Rot-Fall
NACHHER) eskalierte real — ein Commit ohne Freigabe-Datei lief durch
(Commit `f986195`), trotz vollständig umgesetzter SCOPE 3–7. Stefan
entschied unabhängig vom ungeklärten Caching-Befund: die
Freigabe-Datei-Pflicht (bisherige Aufgabe 1 von `commit-guard.js`) wird
**ersatzlos entfernt**, nicht repariert. Der offene Fresh-Session-Retest
(siehe voriger Abschnitt dieses Nachtrags) entfällt damit — es gibt nichts
mehr zu testen.

`[Fakt, Stefan-Entscheidung, Reichweite geklärt]` Von den vier Aufgaben
des bisherigen `commit-guard.js` (Kopfkommentar: „Vier Aufgaben", vgl.
`state/tasks/harness-b1b3-merge-guard-und-git-flow.md`) bleibt:

| Aufgabe | Status | Begründung |
|---|---|---|
| 1. Freigabe-Datei-Pflicht vor `git commit`/`push` | **entfernt** | Stefan-Entscheidung. Die Reibung (Zeitfenster, Kodierung) und der real aufgetretene Fail-Open-Fall überwiegen den Nutzen. |
| 2. Bash-Zugriff auf `.claude/settings.json` blockieren | **bleibt** | Schützt die gesamte Hook-Verdrahtung vor Manipulation — unabhängig von Aufgabe 1, und mit Aufgabe 4 (siehe unten) sogar wichtiger als vorher. |
| 3. Bash-Zugriff auf `state/freigabe-commit.md` blockieren | **entfernt** | Existierte ausschließlich zum Schutz von Aufgabe 1. Ohne Aufgabe 1 schützt sie eine Datei, die nie wieder entsteht. |
| 4. `gh`-Merge-Pfad / Branch-Protection-Zugriff blockieren | **nicht Teil dieses Vertrags** | Bereits vertraglich vorgesehen in `harness-b1b3-merge-guard-und-git-flow`, SCOPE 2, dort als eigener Vertrag bereits entworfen (unkommittiert im Hauptrepo, gesichert unter `_backup-vertrag1/commit-guard.js.bak`). **Sequenzentscheidung: B — sequenziell, nicht in diesem Durchgang mit eingebaut.** Grund: Datei mitten in einem bereits eskalierten Vertrag um eine fremde, noch nicht advisor-geprüfte Erweiterung zu vergrößern, widerspräche der eigenen Scope-Disziplin des Projekts. Vertrag 1 bleibt eigenständig und läuft nach diesem Abschluss reihenfolgetreu (B6 → 1 → 2 → 4 → 3).

`[Korrektur eigener Fehleinschätzung]` In der vorangegangenen Antwort an
Stefan wurde behauptet, Aufgabe 2 falle „automatisch" mit Aufgabe 1 weg.
Das ist falsch. Aufgabe 2 schützt laut eigenem Kopfkommentar „die
Bash-Lücke von `guard-settings.js`" — die gesamte Hook-Verdrahtung, nicht
nur die Freigabe-Datei. Da Aufgabe 4 (später, separat) ebenfalls über
`.claude/settings.json` verdrahtet wird, ist der Erhalt von Aufgabe 2 sogar
wichtiger als vorher: Ohne sie könnte ein Agent per Bash genau den Eintrag
entfernen, der eine künftige Aufgabe-4-Sperre scharf schaltet.

**Geltende Fassung von GOAL:** „… Nach diesem Vertrag laden alle fünf
Hooks unter dem ESM-Projekt fehlerfrei. Der Commit-Guard verliert die
Freigabe-Datei-Pflicht ersatzlos und behält ausschließlich den
Bash-Schutz auf `.claude/settings.json`. Kein Pfadverweis im Repo zeigt
auf einen umbenannten Hook, und keine lebende Dokumentation beschreibt den
Freigabe-Workflow noch als aktuell."

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

**Änderung an `guard-settings.js`** (bleibt `.js`, nicht umbenannt, siehe
CONTEXT des Original-Vertragstexts):
- Kopfkommentar: dritten Bullet-Punkt (`state/freigabe-commit.md`) und den
  Satz „der zweite Schluessel des Commit-Guards" entfernen. Verweis auf
  `commit-guard.cjs` im ersten Bullet-Punkt bleibt (bereits per SCOPE 5
  korrigiert, im Stash gesichert).
- `GUARDED_FILES`: den zweiten Eintrag (`state/freigabe-commit.md`)
  vollständig entfernen. Nur noch `.claude/settings.json` bleibt
  geschützt.

**`.gitignore`**: Kommentarblock Zeilen 25–28 (Einmal-Freigabe für den
Commit-Guard) und die Zeile `state/freigabe-commit.md` entfernen — die
Datei wird nicht mehr erzeugt.

**Reparaturumfang für lebende Dokumentation**, per Grep auf
`freigabe-commit|zweiter Schlüssel|zweiten Schlüssel` klassifiziert:

| Gruppe | Dateien | Behandlung |
|---|---|---|
| Code, bereits oben spezifiziert | `.claude/hooks/commit-guard.cjs`, `.claude/hooks/guard-settings.js` | siehe oben |
| Konfiguration | `.gitignore` | siehe oben |
| Lebende Doku, nachziehen | `docs/guide/03-DEEPDIVE-gates.md`, `docs/guide/04-DEEPDIVE-gedaechtnis.md`, `START-KLEIN.md`, `state/memory-map.md` | Freigabe-Workflow-Beschreibung entfernen oder als „entfällt seit B6" kennzeichnen. Vor dem Bearbeiten jede Datei lesen — Formulierung nicht raten. |
| `state/gates.md` | Gate-Tabelle | Zeile `commit-guard.js`-Hook → `commit-guard.cjs`-Hook umbenennen, „Prüft"-Spalte auf „Bash-Zugriff auf .claude/settings.json" reduzieren, Rot-/Grün-Fall auf die neuen Tests (unten) umstellen. Kalibrierungs-Log **unverändert** (N3-Regel gilt weiter — historisches Protokoll realer Läufe). |
| Historische Vertragsakten, NICHT anfassen | `docs/harness/programm-historie/advisor-findings-phase2-adoptionsfaehigkeit.md`, `harness-fix-2-commit-guard.md`, `harness-fix-5-commit-guard-haerten.md`, `harness-fix-7-reibung-und-doktrin.md`, `harness-fix-8-start-klein.md`, `plan-v2-phase2-adoptionsfaehigkeit.md`, `state/tasks/harness-setup-0a/0b/0c/0d-*.md` | unverändert, wie durchgängig in diesem Vertrag |
| Eigene Arbeitsdateien dieses Vertrags | `state/plan-v1-…`, `state/plan-v2-…`, `state/advisor-findings-…`, `state/tasks/harness-b6-…` | nicht „bereinigen" — beschreiben den Verlauf, nicht den Ist-Zustand |
| Fremder, noch nicht ausgeführter Vertrag | `state/tasks/harness-b1b3-merge-guard-und-git-flow.md` | dort wird an keiner Stelle behauptet, die Freigabe-Datei bliebe bestehen — kein Widerspruch, nicht anfassen |

**Neue SCOPE-Schritte, ersetzen die bisherigen SCOPE 8/9:**

SCOPE 8 (neu): `git stash pop`. Ergebnis zeigen. Ein Konflikt beim Pop:
anhalten, nicht eigenmächtig auflösen, melden.

SCOPE 9 (neu): `commit-guard.cjs` und `guard-settings.js` gemäß den
Spezifikationen oben umschreiben. Diff vollständig zeigen.

SCOPE 10 (neu): Ladetest wiederholen (wie ehemals SCOPE 7) für beide
geänderten Dateien — kein Ladefehler.

SCOPE 11 (neu): Zwei Rot-/Grün-Fall-Paare, auf einem Wegwerf-Branch, nie
gepusht, danach gelöscht:
  a) Rot: ein Bash-Befehl, der `.claude/settings.json` referenziert (z. B.
     `cat .claude/settings.json`) → muss verweigert werden, Meldung
     beginnt mit `commit-guard:`. Grün: ein unbeteiligter Bash-Befehl
     (z. B. `git status`) → läuft durch.
  b) Neu, ersetzt den alten Freigabe-Rot-Fall: `git commit --allow-empty
     -m "diagnose-ohne-freigabe"`, **ohne** `state/freigabe-commit.md` →
     muss jetzt **durchlaufen** (das ist die neue Sollfunktion, keine
     Lücke). Wortlaut/Exit-Code zeigen.

SCOPE 12 (neu): `.gitignore` gemäß Spezifikation oben ändern.

SCOPE 13 (neu): Die vier klassifizierten lebenden Doku-Dateien plus
`state/gates.md` (nur Gate-Tabelle, Kalibrierungs-Log unverändert)
nachziehen. Jede Datei vor der Änderung lesen.

SCOPE 14 (neu): `grep -rn` erneut nach `freigabe-commit|zweiter
Schl[üu]ssel` — Treffer nur noch in den als „nicht anfassen" oder „eigene
Arbeitsdatei" klassifizierten Gruppen. Ein Treffer außerhalb: anhalten,
melden.

SCOPE 15 (neu, war 14): `npm run check`.

SCOPE 16 (neu, war 15/17): `state/gates.md` Kalibrierungs-Log-Eintrag
ergänzen (Datum, Bezug B6-Nachtrag N24, Wortlaut aus SCOPE 11).

SCOPE 17 (neu, war 16/12): `state/tasks/harness-b1b3-merge-guard-und-git-
flow.md` — Dateinamen nachziehen (unverändert wie zuvor beschlossen,
Option A zu O1).

SCOPE 18 (neu, war 17): Commit über Branch + PR, CI-Status, nicht selbst
mergen.

**BUDGET-Ergänzung:** Diese Erweiterung ist selbst ein Scope-Zuwachs
gegenüber Plan v2 — nicht durch einen neuen Advisor-Pass geprüft (analog
zur ursprünglichen B6-Reparatur selbst: mechanischer Charakter, keine neue
Architekturentscheidung, aber ausdrücklich vermerkt statt stillschweigend
übernommen). Zusätzliches Budget: eine weitere Korrekturrunde, on top von
den bereits zugestandenen zwei aus Plan v2.

**ESCALATE-Ergänzung:** `git stash pop` mit Konflikt → anhalten. Ein
Treffer aus SCOPE 14 außerhalb der erwarteten Gruppen → anhalten.

### N24-Korrektur — 23.08.2026: Zusammenführung mit Alt-SCOPE 10/11/16 (Option B, Stefan-Entscheidung)

`[Fakt, Stefan-Entscheidung 23.08.2026]` Option B zu Befund 1 (Projektchat-Prüfung
vor dem Anhängen von N24 an den Live-Vertragstext). Befund: N24s „Neue
SCOPE-Schritte, ersetzen die bisherigen SCOPE 8/9" vergibt durch
Nummern-Wiederverwendung die Nummern 10, 11 und 16 an neue Inhalte und
verliert dabei stillschweigend drei noch nicht ausgeführte, funktional
andere Alt-Schritte: SCOPE 10 alt (Grep nach den vier alten `.js`-
Hooknamen), SCOPE 11 alt (sechs Lebende-Doku-Dateien plus
`state/gates.md`-Zeile auf `.cjs` nachziehen) und SCOPE 16 alt
(`diagnose-hook-crash`-Branch löschen).

Diese Korrektur ersetzt NICHT den Inhalt von N24 (Entscheidung, GOAL,
Code für `commit-guard.cjs`, Edit-Spezifikation für `guard-settings.js`
und `.gitignore` bleiben wie dort spezifiziert), sondern nur dessen
SCOPE-Nummerierung und Klassifikationstabelle: beide Grep-/Doku-Durchgänge
(alte Hooknamen und Freigabe-Begriffe) werden zu je einem gemeinsamen
Schritt zusammengeführt, `diagnose-hook-crash` bekommt einen eigenen
Schritt.

**Geltende, korrigierte Fassung der SCOPE-Schritte 8–19** (ersetzt sowohl
die ursprünglichen SCOPE 8–17 des Vertragstexts als auch die in N24
skizzierten SCOPE 8–18 vollständig):

SCOPE 8: `git stash pop`. Ergebnis zeigen. Konflikt beim Pop → anhalten,
nicht eigenmächtig auflösen, melden.

SCOPE 9: `commit-guard.cjs` und `guard-settings.js` gemäß den
Spezifikationen in N24 umschreiben. Diff vollständig zeigen.

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

SCOPE 12: EIN kombinierter `grep -rn` im gesamten Repo nach einem
erweiterten Muster, das sowohl die vier alten Hooknamen als auch die
Freigabe-Begriffe abdeckt (z. B. getrennte `grep`-Aufrufe für
`commit-guard\.js|session-reminder\.js|zwischenstand-laden\.js|
zwischenstand-pruefen\.js` und für `freigabe-commit|zweiter
Schl[üu]ssel`, gemeinsam ausgewertet). Vollständiges Ergebnis zeigen und
gegen die kombinierte Klassifikationstabelle abgleichen:

| Gruppe | Dateien | Behandlung |
|---|---|---|
| Code, bereits behandelt | `.claude/hooks/commit-guard.cjs`, `.claude/hooks/guard-settings.js` | SCOPE 9 |
| Konfiguration | `.gitignore` | SCOPE 13 |
| Lebende Doku — Rename `.js`→`.cjs` | `docs/harness/HARNESS-OVERVIEW.md`, `docs/harness/zaehne-taxonomie.md`, `docs/guide/02-DEEPDIVE-claude-ordner.md`, `docs/guide/07-TOKEN-SPAREN.md` | SCOPE 13 |
| Lebende Doku — Freigabe-Wegfall | `docs/guide/03-DEEPDIVE-gates.md`, `docs/guide/04-DEEPDIVE-gedaechtnis.md`, `START-KLEIN.md`, `state/memory-map.md` | SCOPE 13 |
| `state/gates.md` | Gate-Tabellenzeile (Rename UND „Prüft"-Spalte auf Bash-Schutz-only reduzieren) | SCOPE 13; Kalibrierungs-Log bleibt unverändert (N3-Regel) |
| Aktiver, unausgeführter Vertrag | `state/tasks/harness-b1b3-merge-guard-und-git-flow.md` | SCOPE 17, nur Dateinamen (O1/N22-Regel) |
| Protokoll, bleibt | `state/gates.md` unterhalb `## Kalibrierungs-Log` | nicht anfassen |
| Historische Vertragsakten | `docs/harness/programm-historie/{advisor-findings-phase2-adoptionsfaehigkeit,harness-fix-2-commit-guard,harness-fix-5-commit-guard-haerten,harness-fix-7-reibung-und-doktrin,harness-fix-8-start-klein,plan-v2-phase2-adoptionsfaehigkeit}.md`, `state/tasks/harness-setup-0{a,b,c,d}-*.md` | nicht anfassen |
| Eigene Arbeitsdateien dieses Vertrags | `state/plan-v1-…`, `state/plan-v2-…`, `state/advisor-findings-…`, `state/tasks/harness-b6-…` | nicht anfassen |

Treffer außerhalb dieser Tabelle → anhalten, vollständige Fundliste
zeigen, nicht selbst einordnen — ESCALATE.

SCOPE 13: alle als „SCOPE 13" markierten Dateien nachziehen. Jede Datei
vor der Änderung lesen, Formulierung nicht raten. `.gitignore`: Zeilen
25–28 (Einmal-Freigabe-Block) vollständig entfernen — löst zugleich die
Rename-Frage für diese Datei, da der ganze Block wegfällt. `state/
gates.md`: ausschließlich die Gate-Tabellenzeile.

SCOPE 14: denselben kombinierten Grep aus SCOPE 12 wiederholen. Treffer
nur noch in den Gruppen „nicht anfassen" oder „eigene Arbeitsdatei" →
sonst anhalten, melden.

SCOPE 15: `npm run check`. Wortlaut/Exit-Code zeigen.

SCOPE 16: `state/gates.md`-Kalibrierungs-Log-Eintrag ergänzen (Datum,
Bezug B6 Nachtrag N24, Wortlaut aus SCOPE 11).

SCOPE 17: `state/tasks/harness-b1b3-merge-guard-und-git-flow.md` — die
fünf Vorkommen von `commit-guard.js` auf `commit-guard.cjs` nachziehen
(ausschließlich Dateinamen, O1/N22-Regel), datierten Nachtrag-Satz
anfügen, Diff dieser einen Datei separat zeigen.

SCOPE 18: `diagnose-hook-crash` löschen (`git branch -D
diagnose-hook-crash`), Ergebnis wortwörtlich festhalten. Vermerken, dass
damit der einzige erreichbare Beleg-Commit `a9cd6ed` verschwindet —
ersetzt durch den neuen Rot-Fall aus SCOPE 2 (bereits ausgeführt) und die
neuen Rot-/Grün-Fälle aus SCOPE 11.

SCOPE 19: Commit über Branch + PR nach `git-flow`, CI-Status melden,
NICHT selbst mergen.

**OUTPUT-Ergänzung:** Verweise im ursprünglichen OUTPUT-Abschnitt des
Vertragstexts auf „Schritt 10" (grep-Ergebnis) beziehen sich ab diesem
Nachtrag auf SCOPE 12/14 in der hier korrigierten Fassung.

**ESCALATE-Ergänzung (kumulativ zu N24):** `git stash pop` mit Konflikt →
anhalten. Ein Treffer aus SCOPE 14 außerhalb der Tabelle → anhalten.

### N25 — 23.08.2026: SCOPE-11a-Befund geklärt — Ursache falsches
Arbeitsverzeichnis der Sitzung, nicht Sitzungs-Caching

`[Fakt, laut Stefan, 23.08.2026]` Ein vorheriger, unklarer Ausgang von
SCOPE 11 a) (Rot-Fall: Bash-Zugriff auf `.claude/settings.json` muss
verweigert werden) wurde zunächst als möglicher Caching-Effekt vermutet
— etwa dass eine laufende Sitzung eine ältere Fassung von
`.claude/settings.json` oder der Hook-Verdrahtung im Speicher hält und
Änderungen am Dateisystem nicht nachzieht. Nach Prüfung durch Stefan ist
diese Vermutung **widerlegt**: Ursache war ein **falsches
Arbeitsverzeichnis der Sitzung** — Befehle liefen nicht zuverlässig im
Worktree `C:\Users\stefa\claude-worktrees\ai-workforce-b6`, sodass eine
andere `.claude/settings.json`/Hook-Verdrahtung als die dort gehärtete
gegolten haben kann (etwa die des Hauptrepos
`C:\Users\stefa\Projekte\ai-workforce`, das denselben Guard zu diesem
Zeitpunkt nicht in derselben Fassung trägt). Kein Caching-Mechanismus im
Hook-Runner ist beteiligt.

`[Fakt, in dieser Sitzung selbst gemessen]` Mit bestätigtem
Arbeitsverzeichnis (`pwd` → `/c/Users/stefa/claude-worktrees/ai-workforce-b6`,
`git rev-parse --show-toplevel` → `C:/Users/stefa/claude-worktrees/ai-workforce-b6`,
Branch `diagnose-scope11-b6` — ein Wegwerf-Branch für SCOPE 11) lief
SCOPE 11 a) sauber durch: `cat .claude/settings.json` wurde verweigert,
Wortlaut beginnt mit `commit-guard: Bash-Zugriff auf geteilte
.claude/settings.json blockiert. Die Datei ist Team-Policy und wird nur
vom Menschen im eigenen Editor geändert.` Der unbeteiligte Befehl
`git status` lief im selben Arbeitsverzeichnis unmittelbar danach
regulär durch (Grün-Fall a) erfüllt).

`[Schlussfolgerung]` SCOPE 11 a) gilt damit als belegt, sofern die
ausführende Sitzung im richtigen Arbeitsverzeichnis läuft. Das bestätigt
den Sinn von SCHRITT 0 dieses Vertragstexts (Arbeitsverzeichnis gegen das
Zielverzeichnis prüfen, bei Abweichung abbrechen) als die eigentliche
Absicherung gegen genau diese Fehlerklasse — nicht ein zusätzlicher
Caching-Fix. Kein SCOPE-Schritt und keine Codeänderung an einem der
Hooks sind aus diesem Befund abzuleiten.

`[offene Unsicherheit]` Die konkreten Umstände des ursprünglichen
Fehlschlags (welcher Befehl, welches tatsächliche Arbeitsverzeichnis, zu
welchem Zeitpunkt) liegen dieser Sitzung nicht im Volltext vor — Quelle
ist Stefans Einordnung. Für den weiteren Verlauf ist das nicht
blockierend: der Ist-Zustand ist mit korrektem Arbeitsverzeichnis
gemessen und trägt.

### N26 — 23.08.2026: SCOPE-12-Tabellenzeile „Historische Vertragsakten"
zurück auf Wildcard-Form

`[Fakt, laut Stefan, 23.08.2026]` Klärung zu den fünf ESCALATE-Treffern
aus dem realen SCOPE-12-Lauf (`docs/harness/programm-historie/harness-fix-1-hooks-und-zwischenstand.md`,
`docs/harness/programm-historie/harness-fix-6-werkzeug-katalog.md`,
`docs/harness/programm-historie/plan-v1-phase2-adoptionsfaehigkeit.md`,
`docs/harness/programm-historie/plan-v2-phase1-vertraege.md`,
`state/tasks/harness-setup-4c-branch-protection-anlegen-und-kalibrieren.md`):
`docs/harness/programm-historie/*` und bereits ausgeführte
`state/tasks/harness-setup-*.md` waren in `claude/42_UEBERGABE_NEUER_CHAT_7.md`
und `claude/43_PLAN_V1_B6_HOOKS_CJS.md` durchgängig als **Wildcard**
definiert, nicht als feste Sechs- bzw. Vier-Dateien-Liste. Das deckt sich
mit der ursprünglichen SCOPE-10-Tabelle dieses Vertragstexts selbst, die
bereits `docs/harness/programm-historie/*` (mit echtem Wildcard) trug —
siehe Vertragstext oben.

`[Schlussfolgerung]` Die explizite Brace-Aufzählung in der
N24-Korrektur-Tabelle (Abschnitt „N24-Korrektur", SCOPE 12) war eine
unbeabsichtigte Verengung gegenüber dieser durchgehend belegten
Wildcard-Definition, keine bewusste Neu-Entscheidung. Alle fünf oben
genannten Treffer gehören zur Gruppe „Historische Vertragsakten / nicht
anfassen".

**Geltende Fassung der SCOPE-12-Tabellenzeile „Historische
Vertragsakten"** (ersetzt die Brace-Aufzählung im Abschnitt
„N24-Korrektur" oben; jener Wortlaut bleibt stehen, Nachtrag statt
Neufassung, gilt aber ab sofort nicht mehr):

> | Historische Vertragsakten | `docs/harness/programm-historie/*`,
> bereits ausgeführte `state/tasks/harness-setup-*.md` | nicht anfassen |

Diese Fassung gilt für SCOPE 12/14 dieses Laufs und jeden künftigen
Wiederholungs-Grep. Ein Treffer außerhalb von
`docs/harness/programm-historie/*` bzw. außerhalb bereits ausgeführter
`state/tasks/harness-setup-*.md`-Dateien bleibt weiterhin ein
ESCALATE-Fall.
