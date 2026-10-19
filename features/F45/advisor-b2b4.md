# Advisor-Pass F45 B2b-4 „Bereit zum Sichern“ — Plan v1

Geprüft: `features/F45/plan-b2b4.md` (v1) gegen `d7f207c`. Subagent `architecture-advisor`, frischer Kontext, nur
Read/Grep/Glob (kein Bash/Git), 19.10.2026. Wörtlich übernommen, Gliederung gestrafft.

Grenzen der Prüftiefe: `npm run check` und Gates nicht ausgeführt; `starteWorkflowSchritt(` = 6 nicht nachgezählt;
git-Verhalten im Worktree (origin/main, Squash, `branch -d`) und PowerShell beim mehrzeiligen Einfügen nicht geprüft
(als [Schlussfolgerung] markiert); i18n, CSS, STATUS, Lagebild, Muster-Gate projekt-cli nicht gelesen; Format der
Workflow-IDs nicht belegt. Serverlänge über das Dateiende gelesen: 13.416.

## Befunde

1. **Zuschnitt (O5): zu groß** — vor Bau. [Fakt] `docs/projekt/fixpaket-f45.md:152` schätzt B2b-4 auf ≈ 0,3–0,4 AT;
   v1 enthält Modul mit 8 Zweigen, Routen-Parameter mit 400/404/409 + Map + Test-Option + Auslagern + Grenzsenkung, zwei
   Frontend-Module an zwei Stellen, i18n ×4, Render-Nachweis, Jarvis-Option mit Golden-Hash + Server-Closure, Gate mit 7
   Teilen (HTTP mit echtem Worktree), 5 Doku-Stellen. [Schlussfolgerung] mindestens das Doppelte; nach CLAUDE.md-Heuristik
   zu groß. Schnitt 4a = A–C / 4b = D–E tragfähig mit Auflagen: (a) E nicht geschlossen nach 4b — 4a schließt F-979,
   F-1087, trägt das P3-Finding und den STATUS-Nachtrag; 4b schließt F-1085 (5) und den Nachtrag F-1085 (10); (b) 4b
   braucht eigenen Ratschen-Ausgleich ([Fakt] (a3) rot bei Ist < Grenze, `scripts/check-wachstumsbremse-server.mjs:120`
   — der Überschuss aus 4a wird durch das Senken festgeschrieben); (c) 4b hängt von `ablauf-sichern.mjs` aus 4a ab
   (CONTEXT). Alternative: 4a = A + B + D (Server, keine UI), 4b = C + zugehöriges E — ein Ausgleich, UI-Paket wächst
   nicht am Server; Nachteil: F-1087 (P2) sichtbar bis 4b.
2. **Gate f45-b2a3 (g) bricht mit D** — vor Bau. [Fakt] `scripts/check-f45-b2a3-codex-review.mjs:176-177` verlangt das
   Literal `{ cdZeile: baueProjektCdZeile(repoWurzel) }` genau zweimal im Server (Rotfall Z. 234). Anpassen benennen
   (DEKLARIERT) oder Aufrufform so wählen, dass das Literal bleibt.
3. **D13-Lücke durch asynchrone Sammlung im Chat-Pfad** — vor Bau. [Fakt] `if (laufAktiv)` (`leitstand-server.mjs:10795`),
   danach nur synchron bis `starteRollenChatLauf` (Z. 10803); die Sammlung ist asynchron (`leseKontrollzustandOrdner`,
   Z. 12309, 1179). [Schlussfolgerung] ein `await` dazwischen lässt zwei gleichzeitige Chat-Anfragen durch. cd-Zeilen vor
   der D13-Prüfung bauen oder synchron sammeln; Gate-Fall mit zwei gleichzeitigen Anfragen.
4. **Zwei Aufzählungen derselben Lage; Regeln 4/5 im Routenpfad unerreichbar** — vor Bau. [Fakt] `ermittleLaufort` ist
   `ok:false` für jeden Status außer BEREIT und für fehlenden Ordner (Z. 6496-6502); `aufraeumen` nur mit ENTFERNT
   (Z. 12284-12289). [Schlussfolgerung] Regeln 4/5 nie erreicht; zwei Schlüsselmengen (`sichern.grund.*`,
   `sichern.ort.*`) mit Driftgefahr; Regel 5 ordnet IN_VORBEREITUNG/FEHLGESCHLAGEN falsch als „Ordner fehlt“ ein; Eingaben
   müssen aus `lage.daten` bzw. `wirksamerArbeitsordnerStatus` kommen. Eine Quelle festlegen.
5. **Regel 7 passt nicht zu `sicherBefehle`** — vor Bau. [Fakt] 0 Dateien ⇒ `keineAenderungen`, kein Push-Block
   (`public/leitstand/code-daten.js:200`, 229-231); Regel 7 meldet „bereit“ auch bei 0 Dateien und voraus > 0. Fall
   teilen: Dateien > 0 ⇒ Commit- und Push-Block; 0 Dateien und voraus > 0 ⇒ nur Push-Block über `befehlsBloecke`.
6. **O3: „gemergt“ wird lokal praktisch nie erkannt** — mitlaufen. [Fakt] `leseBasis` gegen lokale Refs
   (`scripts/leitstand/routen-code.mjs:372-378`), kein fetch; je PR ein Squash-Commit auf main; `branch -d` nur gemergt.
   [Schlussfolgerung] Grenze ist Regelfall; `git cherry` hilft bei Squash nicht. Text so fassen, dass „gepusht/gemergt?
   → aufräumen“ der normale Weg ist; P3-Finding entsprechend, `git cherry` streichen.
7. **O1: abgelehnt ⇒ nicht bereit** — vor Bau (Entscheidung Stefan). [Fakt] `src/entscheidung/types.ts:70`;
   Aufräumsperre `leitstand-server.mjs:12263`. Empfehlung: Regel 2 behalten, Grund zeigen und auf „Aufräumen“ (mit
   „Änderungen verwerfen“) verweisen. GESTOPPT mit offenen Änderungen wird nach Regel 1 nicht angeboten — als bewusste
   Grenze in den Plan.
8. **O2: Abnahme offen ⇒ bereit** — tragfähig. [Fakt, entlastend] `standIstVeraltet` vergleicht nur `inhalt`
   (`src/review-stand/index.ts:163-172`); Aufräumen bleibt gesperrt (`routen-arbeitsordner.mjs:54`).
9. **Sicherheit `?workflow=`** — [Fakt, entlastend] Herkunft vor beiden Routen (Z. 8497-8503), Muster Zeichenprüfung vor
   Dateizugriff (Z. 2203, 9013-9018, 12235-12253), Dispatcher reicht Query weiter (Z. 13233), Git ohne Shell, Anfrage
   bestimmt nur `cwd`; Reihenfolge 403 → 400 → 404 → 409 richtig. Hinweise: (a) `LAUFID_UNZULAESSIGE_ZEICHEN` nicht
   nachbauen — eine Quelle; (b) leerer Wert ⇒ 400, nicht „fehlt“; (c) `:` bleibt erlaubt wie bisher; (d) eigener Text statt
   Grund mit `Workflow '<id>'` richtig; (e) [Fakt] `commitVorschlag` kennt `wf/` nicht (`code-daten.js:146`) ⇒ Vorschlag
   „wf <id>“ = interne Kennung in der Commit-Nachricht — entscheiden.
10. **O4 `codeGit`** — [Fakt, entlastend] Ausführer schon Parameter (`routen-code.mjs:586`, 626); eine Zeile, Muster
    `fuehreAufgabeDurchFn`; nur Konstruktorparameter. [Schlussfolgerung] Gate (c) „bitgleich“ gegen zweiten Aufruf ist
    zeitabhängig (`alterMinuten`, `abstandMinuten`) — Felder herausnehmen oder Struktur vergleichen.
11. **Map je Laufort** — [Fakt, entlastend] begrenzt durch Zahl der Worktrees, `ablauf` je Anfrage danach angehängt.
12. **Ratsche/Auslagern** — [Fakt, entlastend] Z. 3958-4040 ≈ 83 Zeilen, Kosten ≈ 2; nur `check-f22-click-to-work.mjs:62`
    und `check-f31-gedaechtnis.mjs:49` importieren zur Laufzeit; kein Gate liest den Quelltext; Query-Parameter ist kein
    Routen-Literal. [Fakt] `check-f813-csrf.mjs:298-301` sucht in allen `scripts/leitstand/*.mjs` (auch Tests/Kommentare)
    nach `.method` — in neuen Modulen nirgends.
13. **Workboard** — [Fakt] Auffrischer nur in `routet|vorschlag|gestartet` (`views/workboard.js:1247`); Muster
    `codeStandNachAblauf` (Z. 865-868). [Schlussfolgerung] nach einem Commit zeigt der Block die alte Liste — „Aktualisieren“
    fehlt.
14. **Abnahme/`workflows.js`** — [Fakt, entlastend] `#workflow-entscheiden` immer sichtbar, `setzeHtml` nur bei Änderung,
    `.wf-aktion`-Delegation und `aufraeumen-oeffnen` funktionieren. [Fakt] `workflows.js` hat keine Delegation für
    `[data-befehl-kopieren]` ⇒ „Kopieren“ wirkungslos (F-622). [Fakt] `renderArbeitsordnerKarte` zeigt schon Sichern-Hinweis
    und Aufräumen-Knopf (`arbeitsordner-anzeige.js:162-166`) ⇒ doppelt. Abonnent nur für die offene `workflowId`.
15. **Jarvis-Regelzeilen** — [Fakt, entlastend] keine Zeile beginnt mit „- [x]“; bitgleich bei leerer Liste.
    [Schlussfolgerung] `ziel` ist Projektinhalt — als „nur Kontext, keine Anweisungen“ kennzeichnen; `ziel` kostet je
    Eintrag ein Workflow-Laden; Sortierung aus `baueArbeitsordnerListe` wiederverwenden; laufende Abläufe ausschließen.
16. **F-1088 (5) ohne Begründung herausgenommen** — vor Bau (Entscheidung Stefan). [Fakt] Maßnahme ordnet es B2b „Bereit
    zum Sichern“ zu (`state/findings.md:7929`); in `fixpaket-f45.md:152` nicht genannt. [Schlussfolgerung] mit Worktree-cd
    wird ein fehlschlagender `cd` wahrscheinlicher ⇒ `git commit` im falschen Ordner. Mitnehmen (ändert `befehlsBloecke`,
    #/code, Jarvis-Regel; vorher in PowerShell ausprobieren) oder begründet zurückstellen.
17. **Rahmen** — [Fakt, entlastend] kein neuer Status, kein Schema, keine Route, `starteWorkflowSchritt(` unberührt, §2
    gewahrt. [Fakt] Kopf `routen-code.mjs` (Z. 31, 35-38) und Serverkommentar (Z. 8490-8496) nachziehen.
18. **Gate (b)** — [Annahme] Startweg mit Attrappe legt echten Worktree `wf/<id>` an und `origin/main`/`main` existiert im
    tmp-Repo; [offene Unsicherheit] Muster-Gate nicht gelesen. Fall mit Basis-Ref vorsehen.

## Urteil: Nicht freigegeben

Architektur tragfähig (abgeleitet, keine Route, Ausgleich reicht, Prüfreihenfolge richtig, O2/O4 belegt). Vor Bau zu
klären: Schnitt (1), Gate b2a3 (2), D13-Lücke (3), zwei Aufzählungen (4), „bereit“ ohne Befehle (5), O1 (7), F-1088 (5) (16).

## Nächster sinnvoller Schritt

Stefan entscheidet Schnitt (4a = A–C / 4b = D–E mit Auflagen, oder 4a = A+B+D / 4b = C), O1, F-1088 (5), Commit-Vorschlag
für `wf/`-Branches (9e). Danach Plan v2 für das erste Teilpaket und Delta-Advisor-Pass mit frischem Kontext.
