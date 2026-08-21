SCHRITT 0: Arbeitsverzeichnis ausgeben und gegen das im Auftrag genannte
Zielverzeichnis prüfen. Bei Abweichung: abbrechen, melden, nichts ändern.
Danach `git log --oneline -1` gegen main ausgeben und gegen den unten
genannten Commit prüfen. Bei Abweichung: anhalten, Wert nennen, nichts
ändern. Danach `git status --short` ausgeben und protokollieren, bevor
irgendetwas geändert wird.

Zielverzeichnis: C:\Users\stefa\Projekte\ai-workforce
Erwarteter main-Stand: 648c877 (== origin/main, siehe
claude/28_UEBERGABE_NEUER_CHAT_3.md, Abschnitt 3)

## TASK: harness-setup-1a-werkzeugwahl-und-nachtrag

GOAL:
Der AP-0-Nachtrag (`state/tasks/harness-setup-0d-push-origin.md`) ist
committet und gepusht, mit eigener wahrer Commit-Message. Für Biome, `tsc`
und `node:test` liegt in `state/tooling.md` eine geprüfte Entscheidung —
auch wenn sie negativ ausfällt —, mit Herkunft, Versionspin (Biome) bzw.
Lieferant (`tsc`/`node:test`), und die in Plan v1 Abschnitt 3 bereits
geprüften und verworfenen Kandidaten sind ebenfalls dort vermerkt. Noch
keine Installation, kein Code, kein `package.json`-Edit.
Prüfbar an: `git log -2 --oneline` zeigt zwei neue Commits, beide gepusht ·
`state/tooling.md` enthält für alle drei Werkzeuge einen Eintrag oder eine
begründete Ablehnung, inklusive der fünf verworfenen Kandidaten aus Plan
v1 · Biome-Telemetrie steht als benannter offener Punkt mit Zieltermin
AP 7, nicht als unbenannte Lücke.

CONTEXT:
- [Fakt] `state/tasks/harness-setup-0d-push-origin.md` liegt untracked,
  Inhalt: Ausführungsbericht des Push-Vertrags 0d. Siehe
  `claude/28_UEBERGABE_NEUER_CHAT_3.md`, Abschnitt 4.
- [Fakt] Stefan hat entschieden: dieser Nachtrag wird nicht als eigener
  Vertrag committet, sondern als erster, eigens freigegebener Schritt
  innerhalb des AP-1-Vertrags (Präzedenz: `harness-fix-3-dokugate-und-ci.md`,
  Commit und Push in einem Vertrag, zwei getrennte Freigaben).
- [Fakt] `SETUP.md`, Punkt 3: „Vor der ersten Installation: zuerst in
  `docs/harness/werkzeug-katalog.md` nachschlagen … Danach Skill
  `werkzeug-auswahl` laufen lassen … Ergebnis — auch das negative — nach
  `state/tooling.md`."
- [Fakt] `docs/harness/werkzeug-katalog.md`, Abschnitt „Einträge", ist
  `[FÜLLUNG]` (verweist auf ein zentrales, hier nicht verfügbares
  Lern-Repo) → kein Abkürzungspfad über Katalogeintrag für keins der drei
  Werkzeuge; volle Prozedur nach `werkzeug-auswahl` Schritt 2c/3 nötig.
- [Fakt] `state/plan-v1-harness-setup.md`, Abschnitt 3: Linter Biome
  (Klasse C, Versionspin+Telemetrie vor Installation klären), Typechecker
  `tsc --strict` (Klasse B), Testrunner `node:test` (Klasse B, in Laufzeit
  enthalten). Geprüft und verworfen: Python, C#/.NET, Go, Rust,
  ESLint+typescript-eslint — mit Begründung je Kandidat, dort nachlesbar.
- [Fakt] `state/plan-v2-harness-setup.md`, Abschnitt 3: Biome-Versionsstand
  20.08.2026: `2.5.9`, MIT/Apache-2.0, wöchentliche Release-Kadenz, exakter
  Pin ohne Caret. Regel `noFloatingPromises` hat Nursery-Status. Telemetrie
  an offizieller Doku nicht belegt.
- [Fakt] Diese Sitzung (Projektchat) hat entschieden (Befund 2, Option A,
  21.08.2026): Werkzeugnachweis findet vor der Installation statt (hier),
  nicht erst in AP 7. Telemetrie bleibt in AP 7, mit benanntem Zieltermin.
- [Fakt] `.claude/skills/werkzeug-auswahl/SKILL.md`, Schritt 2c: kein
  Katalogeintrag → volle Herkunfts-Check-Prozedur (Schritt 3-6).

SCOPE:
1. Nachtrag committen: `state/tasks/harness-setup-0d-push-origin.md`
   stagen (ausschließlich dieser explizite Pfad), Freigabe einholen,
   committen mit einer Message, die ausschließlich diesen Nachtrag
   beschreibt. Danach pushen (`git-flow`-Skill nutzen), eigene Freigabe für
   den Push.
2. Skill `werkzeug-auswahl` für Biome laufen lassen: Bedarf ist durch Plan
   v1/v2 bereits festgestellt, Schritt 1 entfällt inhaltlich — aber die
   Herkunfts-Check-Schritte 3–6 real durchführen (Quell-Repo, Lizenz,
   Aktivität, Telemetrie-Stand, Installationsweg, Risiko, Token-/
   Kostenwirkung). Versionspin exakt gegen die aktuelle Registry-/
   Repo-Angabe verifizieren, nicht aus Plan v2 übernehmen — falls
   `2.5.9` nicht mehr aktuell ist, den echten Stand nehmen.
3. Dieselbe Prozedur für `tsc` und `node:test`, verkürzt: beides
   Erstanbieter/Laufzeit-Bestandteil, Herkunfts-Check entsprechend
   leichter, aber nicht auslassen — insbesondere Versionsbindung an das
   gepinnte Node 24.x aus `package.json` `engines`.
4. Für alle drei Werkzeuge das Ergebnis nach `state/tooling.md`, Abschnitt
   „Im Einsatz" (oder „Bewusst nicht installiert" bei Ablehnung), im
   vorhandenen Tabellenformat ergänzen.
5. Die fünf in Plan v1 Abschnitt 3 bereits geprüften und verworfenen
   Kandidaten mit ihrer dortigen Begründung ebenfalls nach
   `state/tooling.md` übertragen, Abschnitt „Bewusst nicht installiert" —
   sie sind bereits entschieden, nicht neu prüfen.
6. Telemetrie-Frage zu Biome als benannten offenen Punkt in
   `state/tooling.md` eintragen: „durch Beobachtung beim ersten Lauf zu
   klären, Ziel: AP 7".
7. Zweiten Commit für die `state/tooling.md`-Änderung, eigene Freigabe,
   eigene wahre Commit-Message. Push, eigene Freigabe.
8. Abschließend zeigen: `git log --oneline -3`, `git status --short`,
   vollständiger Diff von `state/tooling.md`.

NICHT:
- Keine Installation (`npm install`), kein `package.json`-Edit, kein
  `tsconfig.json`.
- Kein Eintrag in `docs/harness/werkzeug-katalog.md` — projektübergreifend,
  gehört nicht in diesen Klon.
- Keine Testdatei, kein Produktcode.
- Keine Änderung an `state/plan-v2-harness-setup.md` — das ist Vertrag 1b.
- Kein `git add -A`/`git add .` — nur die im SCOPE genannten expliziten
  Pfade.

BUDGET:
Ein Durchgang plus höchstens eine Korrekturrunde je Werkzeug. Wahr-
scheinlichster Korrekturfall: Biome-Version hat sich seit dem 20.08.2026
geändert — dann Versionspin im SCOPE-Schritt 2 aktualisieren, tatsäch-
liches Prüfdatum eintragen, nicht das aus dem Plan kopieren.

OUTPUT:
- Zwei Commits mit den unter SCOPE 1 und 7 genannten Messages, beide
  gepusht.
- Vollständiger, finaler Inhalt von `state/tooling.md`.
- Für jedes der drei Werkzeuge: Herkunft, Lizenz, Vetting-Status,
  tatsächliches Prüfdatum dieses Laufs.
- Die Ausgaben aus SCOPE 8.

ESCALATE:
- Arbeitsverzeichnis oder Commit-Stand weichen von `648c877` ab →
  anhalten, beide Werte nennen, nichts ändern.
- Biome-Versionsstand weicht von `2.5.9` ab → nicht stillschweigend
  übernehmen, im Output explizit nennen.
- Telemetrie von Biome lässt sich schon jetzt eindeutig aus Doku klären →
  trotzdem nur als recherchierten Stand eintragen, nicht als beobachteten;
  die Beobachtungspflicht in AP 7 bleibt bestehen.
- Ein Hook meldet sich (Commit-Guard, Settings-Guard) → anhalten, Meldung
  vollständig zeigen, keine Freigabe-Datei anlegen.
- `git status` zeigt vor SCOPE 1 etwas anderes als „nur die eine
  untrackte 0d-Datei" → anhalten, Ausgabe zeigen, nicht selbst einordnen.

FOLGT: harness-setup-1b-installation-und-pruefkette (Installation,
`tsconfig.json`, `package.json`-Umstellung, Testdatei, geschärfte
Prüfbar-Zeile in `state/plan-v2-harness-setup.md` nachziehen) — zu
schreiben erst nach Ausführung dieses Vertrags, weil die echten
Versionspins und Herkunftsangaben aus SCOPE 2–4 als CONTEXT gebraucht
werden.
