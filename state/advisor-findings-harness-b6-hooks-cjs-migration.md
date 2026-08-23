<!-- Ziel-Pfad im Repo: state/advisor-findings-harness-b6-hooks-cjs-migration.md -->
# Advisor-Findings — Befund B6 (Hook-Reparatur ESM/CommonJS)

Advisor-Pass nach `.claude/skills/advisor-pass/SKILL.md` zu
`state/plan-v1-harness-b6-hooks-cjs-migration.md`, ausgeführt am 22.08.2026
in einer eigenen Sitzung im Worktree
`C:\Users\stefa\claude-worktrees\ai-workforce-b6`
(Branch `harness-b6-hooks-cjs-migration`, von `main`@`be09527`).

**Bericht im Wortlaut, unverändert übernommen.** Die Gegenprüfung durch den
Projektchat steht in `## Nachtrag 3` des Plans, nicht in dieser Datei.

---

Arbeitsverzeichnis: `C:\Users\stefa\claude-worktrees\ai-workforce-b6` (per Glob bestätigt vorhanden, Branch-Inhalt aus `main`@`be09527` konsistent mit dem im Auftrag genannten Zielverzeichnis — kein Abbruch nötig).

Geprüft gegen: realer Dateizugriff (Read/Grep/Glob) im genannten Worktree — `state/plan-v1-harness-b6-hooks-cjs-migration.md`, `.claude/settings.json`, alle fünf Hook-Dateien, `state/gates.md`, `scripts/check-docs.mjs`, `docs/harness/HARNESS-OVERVIEW.md`, `docs/guide/02-DEEPDIVE-claude-ordner.md`, `docs/guide/03-DEEPDIVE-gates.md`, `docs/guide/07-TOKEN-SPAREN.md`, `docs/harness/zaehne-taxonomie.md`, `state/tasks/harness-b1b3-merge-guard-und-git-flow.md`, `.gitignore`, `package.json`, repo-weiter Grep der vier Hook-Altnamen.

Rollengrenze: Nur Read/Grep/Glob, kein Bash/Git. Ich konnte deshalb `git status` im b6-Worktree nicht direkt ausführen — die Aussagen zu SCOPE 1/N12 unten stützen sich auf Dateibestand (Glob/Read), nicht auf einen echten `git status`-Lauf. `state/freigabe-commit.md` habe ich absichtlich nicht gelesen (Doktrin: für das Modell unerreichbar), sie taucht auch nicht im b6-Worktree-Glob auf.

Marker-Legende: `[Fakt]` im Code belegt · `[Schlussfolgerung]` aus Fakten abgeleitet · `[Annahme]` unbelegte Prämisse · `[offene Unsicherheit]` weder belegt noch widerlegt.

## Findings

### 1. [HOCH] Die „drei Gruppen" des Reparaturumfangs sind unvollständig — SCOPE 8 wird mit hoher Wahrscheinlichkeit sofort eskalieren

`[Fakt]` Repo-weiter Grep der vier Altnamen trifft außerhalb der drei bekannten Gruppen (funktional/`.claude/settings.json`, lebende Doku [5 Dateien], `programm-historie/*` + `harness-setup-*.md`) mindestens:

- `docs/harness/zaehne-taxonomie.md:42-45` — echte Ist-Zustand-Beschreibung der Hooks (Taxonomie-Tabelle H3/H4/H6), nicht in SCOPE 9s Doku-Liste enthalten, nicht historisch.
- `state/tasks/harness-b1b3-merge-guard-und-git-flow.md:14,17,62,121,138` — ein aktiver, noch nicht ausgeführter Vertrag-1-Auftrag, der `commit-guard.js` mehrfach als Bearbeitungsziel nennt („eine VIERTE Aufgabe ergänzen"). Weder „bereits ausgeführt" (SCOPE 10 schützt nur `harness-setup-*.md`) noch „historisch".
- `.gitignore:25` — Kommentarzeile, harmlos, aber ebenfalls ein Treffer.

`[Schlussfolgerung]` SCOPE 8s ESCALATE („Treffer außerhalb der drei bekannten Gruppen → anhalten, vollständige Fundliste zeigen, nicht selbst einordnen") greift damit nicht als seltener Randfall, sondern nahezu sicher beim ersten echten Lauf — noch bevor SCOPE 9-14 überhaupt beginnen. Das ist kein Sicherheitsproblem (der Mechanismus fängt es korrekt ab), untergräbt aber BUDGET (siehe Finding 6).

Betroffen: CONTEXT „Reparaturumfang in drei Gruppen", SCOPE 8/9, ESCALATE. Änderungsvorschlag: Diese drei Treffer jetzt schon klassifizieren, statt die Klassifikation dem Lauf zu überlassen: `zaehne-taxonomie.md` explizit in SCOPE 9s Doku-Liste aufnehmen; für `harness-b1b3-merge-guard-und-git-flow.md` eine bewusste Entscheidung dokumentieren (z. B. „bleibt auf `.js` stehen, wird bei Ausführung von Vertrag 1 selbst korrigiert" — analog zur historischen Ausnahme); `.gitignore`-Kommentar als No-op vermerken. SCOPE 8 dann nur noch auf neue, nicht bereits klassifizierte Treffer eskalieren lassen.

### 2. [HOCH] Selbstreferenzierende „Datei:"-Kopfkommentare in drei der vier Hooks werden nach `git mv` stumpf

`[Fakt]` Direkt gelesen: `.claude/hooks/commit-guard.js:2` trägt `* Datei: .claude/hooks/commit-guard.js`; `.claude/hooks/zwischenstand-laden.js:2` trägt `* Datei: .claude/hooks/zwischenstand-laden.js`; `.claude/hooks/zwischenstand-pruefen.js:2` trägt `* Datei: .claude/hooks/zwischenstand-pruefen.js`. (`session-reminder.js` hat keinen solchen Header — betrifft nur diese drei.) `git mv` auf `.cjs` ändert den Dateiinhalt nicht — diese drei Zeilen zeigen danach auf einen nicht mehr existierenden Pfad.

Betroffen: SCOPE 3/4 (Rename-Schritte) — kein Teilschritt aktualisiert diesen Kommentar; NICHT-Klausel steht nicht im Weg (Kommentarkorrektur ist keine Verhaltensänderung). Änderungsvorschlag: SCOPE-Unterschritt ergänzen: nach jedem `git mv` die `Datei:`-Zeile im Kopfkommentar der drei betroffenen Dateien auf den neuen `.cjs`-Pfad nachziehen.

### 3. [MITTEL] SCOPE 2/6 belegen das Symptom, nicht zwingend die unterstellte Ursache

`[Schlussfolgerung]` „Commit läuft durch" (SCOPE 2) bzw. „wird verweigert" (SCOPE 6) sind reine Pass/Fail-Beobachtungen über den gesamten Hook-Aufruf. Ein alternativer Grund für ein Durchlaufen in SCOPE 2 — z. B. Hooks in dieser Ausführungsumgebung deaktiviert/anders konfiguriert, falscher `cwd`, abweichendes Runner-Verhalten — würde dieselbe Beobachtung erzeugen, ohne dass der unterstellte `ReferenceError: require is not defined`-Mechanismus tatsächlich vorliegt. Der Plan benennt genau das selbst als offen (Offener Punkt 3), löst es aber operational nicht auf — SCOPE 2/6 fangen kein Hook-`stderr`/keine Fehlermeldung des Runners ein, nur den Commit-Ausgang.

Betroffen: SCOPE 2, SCOPE 6, Offener Punkt 3. Änderungsvorschlag: SCOPE 2/6 um die Anzeige des rohen Hook-Fehlertexts erweitern, falls vom Harness sichtbar gemacht, statt den Crash-Mechanismus nur aus dem Passieren des Commits zu folgern.

### 4. [MITTEL] SCOPE 9s Tabelle/Log-Trennung in `state/gates.md` hat keine Verifikation oder ESCALATE-Grenze

`[Fakt]` Die Tabelle (Zeilen 9-20) und das `## Kalibrierungs-Log` (ab Zeile 22, mehrere datierte Einträge, die dieselben `.js`-Namen nennen) sind real getrennte Abschnitte — N3s Unterscheidung ist korrekt. Aber: `npm run check` prüft laut `scripts/check-docs.mjs` nur tote Verweise/Versionsnummern/Datums-Widersprüche, keine semantische Frage „wurde nur die Tabellenzeile und nicht der Log-Text verändert". Verletzt ein Edit versehentlich die Trennung, gibt es keinen automatischen Fänger.

Betroffen: N3, SCOPE 9, SCOPE 12, OUTPUT. Änderungsvorschlag: OUTPUT um einen gezielten Diff/Grep-Nachweis ergänzen: „Kalibrierungs-Log unterhalb Zeile 22 unverändert" explizit zeigen, nicht nur den Gesamtdiff.

### 5. [MITTEL] SCOPE 3 (git mv) hat keine Verifikation gegen eine im Projekt selbst dokumentierte Falle

`[Fakt, aus CLAUDE.md]` CLAUDE.md „⚠️ Bekannte Fallen" nennt ausdrücklich: „`git add` übernimmt manche Dateien stillschweigend nicht (OneDrive-Reparse-Points) … Nach jedem `git add` von Binärdateien mit `git status` prüfen, ob sie wirklich staged sind." SCOPE 3 verlangt `git mv` (impliziert `add`+`rm`), aber keinen Nachlauf-Check, und ESCALATE hat keinen Zweig für „Rename ist nicht sauber angekommen".

Betroffen: SCOPE 3, ESCALATE. Änderungsvorschlag: Sub-Schritt „`git status` nach jedem `git mv` zeigen, prüfen dass es als Rename (nicht als getrennte Delete+Add oder gar kein Diff) erscheint" plus ESCALATE-Eintrag für den Abweichungsfall.

### 6. [MITTEL] BUDGET wirkt für den tatsächlichen Umfang zu knapp bemessen

`[Schlussfolgerung]` 14 SCOPE-Schritte, sechs Belegausgaben (Schritt 2, 5, 6, 7, 8, 11), drei separate Wegwerf-Branch-Lebenszyklen, ein PR/CI-Zyklus — plus, wie Finding 1 zeigt, ein nahezu sicherer ESCALATE-Durchgang allein aus SCOPE 8, der eine Mensch-Entscheidung vor SCOPE 9 erzwingt. „Ein Baudurchgang plus höchstens eine Korrekturrunde" lässt dafür wenig Spielraum, zumal die zwei Nachträge selbst schon zeigen, wie viel Klärungsbedarf dieser Auftrag bisher erzeugt hat.

Betroffen: BUDGET. Änderungsvorschlag: Entweder Finding 1 vorab auflösen (verkleinert die realistische Korrekturfläche) oder BUDGET explizit auf „ein Durchgang plus bis zu zwei Korrekturrunden (eine für SCOPE 1-8/Beleglage, eine für SCOPE 9-14/Reparatur+PR)" erweitern.

### 7. [NIEDRIG] Zeilenangaben sind durchgehend unzuverlässig — auch nach N5s „Re-Verifikation"

`[Fakt]` Original-Vertragstext: `.claude/settings.json:9,14,20,26,32` — real liegen die fünf `command`-Zeilen bei 12, 18, 25, 33, 41. Original: `commit-guard.js:101` für `module.exports` — real Zeile 240 (>130 Zeilen Differenz, deutlich mehr als die im Text eingeräumte „doppelte Nummerierung"). `zwischenstand-laden.js:7-9` und `zwischenstand-pruefen.js:6-8` für die `require(...)`-Zeilen — real 12-14 bzw. 9-11; diese beiden Dateien wurden von N5 nicht erneut geprüft. Auch N5s eigene „~Z."-Angaben tragen Fehler: `HARNESS-OVERVIEW.md` „~Z. 57-58" — real Zeile 41-42.

Betroffen: CONTEXT (durchgehend), N5. Änderungsvorschlag: Zeilenangaben aus CONTEXT streichen oder klar als „nicht verlässlich, nur Inhaltsanker verwenden" markieren — nicht nur pauschal im Methodischen Hinweis, sondern an jeder einzelnen Stelle, da die Abweichung teils sehr groß ist, nicht nur „off-by-ein-paar".

### 8. [NIEDRIG] N12s „SCOPE 1 durch Worktree bereits erfüllt" ist eine Spur zu glatt formuliert

`[Fakt]` `state/plan-v1-harness-b6-hooks-cjs-migration.md` liegt selbst unversioniert im b6-Worktree (Zweck der Advisor-Pass-Vorbereitung). Ein `git status` würde also nicht komplett leer ausfallen, sondern diese eine erwartete untracked-Datei zeigen. N12 sagt „Zustand zeigen, nicht herstellen", aber die Formulierung „`git status` sauber … ist durch den Worktree bereits erfüllt" suggeriert einen blanken Stand.

Betroffen: N12. Änderungsvorschlag: Einen Halbsatz ergänzen: „sauber bis auf die erwartete, unversionierte Plan-Datei".

## Entlastende Befunde

- `[Fakt, entlastend]` N9 direkt am realen Code bestätigt: `.claude/hooks/commit-guard.js` im b6-Worktree enthält keine der Tokens `gh`, `merge`, `protection`, „Aufgabe 4" — entspricht dem unveränderten `main`-Stand, die SCOPE-14-Auflage greift zum jetzigen Zeitpunkt tatsächlich nicht.
- `[Fakt, entlastend]` N8s Angaben zum Haupt-Arbeitsbaum (unkommittierte Änderungen an `.claude/hooks/commit-guard.js` und `.claude/skills/git-flow/SKILL.md`, Branch `harness-b1b3-merge-guard` auf `be09527`) decken sich mit dem tatsächlichen Git-Status-Snapshot dieser Sitzung.
- `[Fakt, entlastend]` `.claude/hooks/guard-settings.js` enthält tatsächlich keine Zeile mit `require`/`module.exports`/`import`/`export` — die Nichtumbenennung ist korrekt begründet.
- `[Fakt, entlastend]` `session-reminder.js`, `zwischenstand-laden.js`, `zwischenstand-pruefen.js` enthalten tatsächlich kein `module.exports`/`export` — die CONTEXT-Aussage „keine module.exports" trifft für alle drei zu.
- `[Fakt, entlastend]` Die Kernaussage von CONTEXT — `package.json` hat `"type": "module"`, alle fünf Hooks werden weiterhin mit `.js` referenziert, vier davon nutzen inkompatible CommonJS-Syntax — trägt vollständig gegen den realen Repo-Stand; nur die Zeilenzahlen (Finding 7), nicht der Inhalt, sind falsch.
- `[Fakt, entlastend]` Offener Punkt 1 ist jetzt auflösbar: `docs/guide/07-TOKEN-SPAREN.md:118` nennt `session-reminder.js` — die Datei gehört korrekt in SCOPE 9s Doku-Gruppe.
- `[Fakt, entlastend]` N3s Trennung von `state/gates.md` in Tabelle (Zeile 9-20) und Kalibrierungs-Log (ab Zeile 22, echte datierte Einträge mit denselben Dateinamen) ist real und nicht konstruiert.

## Prüfung der acht Auftragspunkte — Kurzfazit

1. CONTEXT-Fakten tragen inhaltlich; Zeilenangaben durchgehend unzuverlässig (Finding 7).
2. N3 ist im Kern richtig, aber nicht vollständig — mind. eine weitere Live-Doku-Stelle (`zaehne-taxonomie.md`) fehlt in SCOPE 9 (Finding 1).
3. SCOPE 2/6 sind als Belege plausibel, aber nicht beweiskräftig für den unterstellten Crash-Mechanismus (Finding 3).
4. SCOPE 3 (`.cjs`-Rename) ist klar die einfachere, risikoärmere Wahl gegenüber ESM-Umschreibung — Letztere bräuchte eine `require.main === module`-Ersatzlösung, die selbst grenzwertig gegen NICHT verstieße; der Plan sollte das explizit begründen statt nur [Annahme] zu setzen.
5. SCOPE-14-Auflage greift laut N9 real nicht — direkt am Code bestätigt.
6. N12 trägt im Kern; SCOPE 1 wird durch den Worktree tatsächlich zur Bestätigung — kleine Ungenauigkeit bei „sauber" (Finding 8).
7. ESCALATE hat zwei konkrete Lücken: `git mv`-Silent-Failure (Finding 5) und SCOPE-9-Tabelle/Log-Verletzung (Finding 4).
8. BUDGET ist angesichts von Finding 1 vermutlich zu knapp (Finding 6).

## Urteil

**Freigegeben mit Hinweisen.**

Begründung: Die CONTEXT-Faktenbasis trägt gegen den realen Repo-Stand, die Kernmechanik (`git mv` statt ESM-Rewrite) ist die richtige Wahl, und N9/N3/N12 halten der Gegenprüfung stand. Es gibt keinen Befund, der die Grundannahme des Plans widerlegt oder auf echten Schaden hindeutet — die schwersten Findings (1, 2) sind Vollständigkeitslücken im Reparaturumfang, keine Fehlkonstruktion. Vor Ausführung sollten aber mindestens Finding 1 und Finding 2 geklärt werden, da beide sonst mitten im Lauf zu einem unnötigen Stopp bzw. zu stillen Doku-Leichen führen; Finding 3-6 dürfen als dokumentierte Risiken mitlaufen, sollten aber im Bericht der ausführenden Sitzung sichtbar bleiben.

## Nächster sinnvoller Schritt

Nachtrag 3 an `state/plan-v1-harness-b6-hooks-cjs-migration.md` anhängen (nicht überschreiben): Finding 1 und Finding 2 auflösen. Danach ist der Plan aus meiner Sicht ausführungsreif.
