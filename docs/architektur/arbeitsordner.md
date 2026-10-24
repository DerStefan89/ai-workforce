# Arbeitsordner und lesender Fingerabdruck — Einzelheiten zu ARCHITECTURE.md §2

Herkunft: wörtlich aus `ARCHITECTURE.md` §2 verschoben (F45 K „Kontext-Diät“, 17.10.2026), nicht gekürzt. Die Regeln
stehen als Sätze im Kern `ARCHITECTURE.md` §2. Dieser Text ist gleich verbindlich; bei Widerspruch gilt der Kern, und
jeder Widerspruch ist ein Befund; eine Regeländerung ändert Kern und Detail gemeinsam. §-Angaben im Text meinen `ARCHITECTURE.md`. Lesen nur bei Bedarf — wenn eine Aufgabe das
Thema berührt.

---

- Produktdateien im freigegebenen Baupfad ändert ausschließlich das Ausführungswerkzeug. Der Kern liest sie read-only.
  Einzige Ausnahme: der Arbeitsordner je Ablauf (E-F45-3 = A, F45 B1a-1, `src/arbeitsordner/`). Der Kern legt den
  Git-Worktree eines schreibenden Ablaufs ausschließlich über git an und entfernt ihn ebenso (Git-Starter), führt
  darin `npm ci --ignore-scripts` aus und löscht nach einem Lauf der Rolle `ausfuehrung` ausschließlich geprüfte
  reguläre Dateien aus dessen Löschliste — nur innerhalb des Arbeitsordners, nie unter `.git`, `.claude/` oder
  `kontrollzustand/`. Im Projektordner selbst bleibt der Kern lesend — Ausnahmen nur die Feature-Akte und die Roadmap
  (nächste zwei Punkte).
- Feature-Akte im Projektordner (F45 B5a-1, E-F45-1, F-912; Entscheidung Stefan 23.10.2026 nach dem Advisor-Pass
  `features/F45/advisor-b5a1.md` A1/A2; `scripts/leitstand/routen-f35.mjs`, Plan `features/F45/plan-b5a1-v2.md`): der Server
  schreibt auf direkte Eingabe ausschließlich `features/<id>/feature.md` der `repoWurzel` des Projekts — PUT
  `…/features/<id>/akte` ersetzt nur `## Ziel`, `## Nicht-Ziele` und `## Akzeptanzkriterien` und hängt eine Zeile unter
  `## Änderungen` an (`grund` Pflicht); POST `/api/features` legt aus einem Coach-Scope eine neue Akte mit Status ENTWURF
  an. ERZWUNGEN (Gate f45-b5a1): ID-Muster und Pfad unter `features/` (F-595), Hash der gelesenen Bytes (abweichend ⇒
  409), Sperre bei einem nicht beendeten Ablauf, dessen Auftrag auf das Feature zeigt oder nicht lesbar ist (409),
  ABGESCHLOSSEN/ABGEBROCHEN nicht bearbeitbar, Listenabschnitt mit Text außerhalb der Liste ⇒ 422, Ergebnis besteht
  `scripts/check-feature.mjs` (sonst 422), Rest der Datei bytegleich, Anlage nie überschreibend (`wx` ⇒ 409). Zeilenende:
  eine bestehende Akte behält ihres (auch CRLF, Ausnahme zu §7 im Kern), eine neue wird LF geschrieben. Kein Commit und
  kein git-Prozess — die Antwort trägt einen Git-Block als Text. DEKLARIERT: „nur auf Eingabe“ (jeder lokale Prozess mit
  passender Herkunft kann die Route aufrufen); nicht atomar (direktes Schreiben, danach Rücklesen mit Hash-Vergleich ⇒
  500); ein Ablauf, der zwischen Sperrprüfung und Schreiben angelegt wird, wird übersehen; ein offener Ablauf mit kaputter
  Workflow-Kette fehlt in der Ablaufliste und sperrt nicht, einer mit unlesbarem Auftrag sperrt dagegen jede Akte des
  Projekts (fail-closed, 409 nennt die Ablauf-ID). Voraussetzung: schreibende
  Läufe arbeiten im eigenen Worktree (E-F45-3), deshalb gilt die globale Laufsperre hier nicht.
- Roadmap im Projektordner (F45 B5b-1b-1, R6, F-984; Entscheidung A2 Challenger 24.10.2026 nach den Advisor-Pässen
  `features/F45/advisor-b5b1.md` und `features/F45/advisor-b5b1b.md`; `scripts/leitstand/routen-planung.mjs`, Plan
  `features/F45/plan-b5b1b-v2.md`): PUT `…/features/<id>/planung` schreibt auf direkte Eingabe Priorität und Schätzungen in die
  Akte (Regeln des vorigen Punkts) und verschiebt bei einem Meilenstein-Wechsel die ID in `docs/projekt/roadmap.json` (bzw. dem
  `roadmapPfad` der Instanz) ans Ende des Ziel-Meilensteins. ERZWUNGEN (Gate f45-b5b1b1): Pflichtgrund (400), Sperre (409), Hash
  der Akte und `roadmap_hash` der Roadmap getrennt (409), CRLF in `roadmap.json` ⇒ 422 (A3: §7 bleibt, der Kern schreibt die
  Roadmap LF und ersetzt nur die beiden `features`-Literale, Rest bytegleich), Rundlauf (ganze Struktur gleich der erwarteten,
  `validiereRoadmapDaten`, ID genau einmal und im Ziel), R1 (`src/workboard/roadmap-regeln.ts`) auf dem neuen Stand — nur neue
  Befunde blockieren (422 „erst bereinigen“), das Akte-Gate blockiert jeden Befund wie B5a-1; Rücklesen je Datei; scheitert ein
  Schreiben oder Rücklesen, werden alle Dateien bis einschließlich der scheiternden auf die alten Bytes zurückgesetzt (500 nennt
  je Pfad das Ergebnis und „git diff prüfen“). Kein Commit — Git-Block mit allen geänderten Pfaden. DEKLARIERT: Rückbau best
  effort (nichts ist committet), ein Prozessabbruch zwischen zwei Schreibvorgängen bleibt ohne Rückbau, nicht atomar, „nur auf
  Eingabe“ wie beim vorigen Punkt; Ausplanen (`meilenstein: null`) nicht unterstützt; die Ausnahmen-Datei
  `roadmap-ausnahmen.json` liegt neben `roadmapPfad` und wird hier nur gelesen (Schreiben erst B5b-1b-2).
- Fähigkeit-Vorschläge (F45 FB-1b, F-1167, E-FB1-2/-3, `scripts/leitstand/routen-faehigkeit-vorschlag.mjs`, Plan
  `features/F45/plan-fb1b-v2.md`): außerdem bewegt bzw. löscht der Server auf direkte Eingabe (POST
  `…/workflows/<id>/faehigkeit-vorschlag/uebernehmen|verwerfen { typ, name, hash }`) einen Vorschlag des Laufs. Übernehmen
  verschiebt `vorschlaege/faehigkeiten/skills/<name>/` bzw. `…/agents/<name>.md` nach `.claude/skills/<name>/` bzw.
  `.claude/agents/<name>.md` desselben Arbeitsordners und setzt die Freigabe nach Inhalt (nie `an`); Verwerfen entfernt nur den
  Vorschlag. Beides nur mit bereitem Arbeitsordner und ohne Lauf, Übernehmen bei offener Abnahme oder nach ANGENOMMEN; nur
  Vorschläge, die gegenüber dem Basis-Commit neu oder geändert sind (q1). Fail-closed mit 409: Hash-Drift, Grund der Erkennung,
  Ziel vorhanden (ohne Unterschied der Schreibweise), Ziel gitignoriert (B13, würde beim Sichern nicht mitgenommen),
  eingeschaltet oder anders freigegeben (B3), Probe am Ziel mit allen vorhandenen Einträgen aktiv meldet ein neues Hindernis
  (q4, Rücknahme). ERZWUNGEN (Gate f45-fb1b (s)(z)(r)): lstat-Kette ohne Verknüpfung, `.claude` und `.claude/<art>` einzeln und
  nicht rekursiv angelegt, Enthaltensein über `relative()` auf `realpathSync.native`, nie überschreiben (Ordner-Rename bzw.
  `COPYFILE_EXCL`), Rücknahme bei Ablehnung; scheitert die Rücknahme ⇒ 500 mit beiden Orten (ohne Freigabe nicht aktiv).
  Geprüft und geschrieben wird in einem synchronen Abschnitt (kein Laufstart, kein Aufräumen dazwischen). DEKLARIERT: „nur auf
  Klick“ (jeder lokale Prozess mit passender Herkunft kann die Route aufrufen); ein fremder Prozess kann zwischen lstat und
  Bewegen eine Verknüpfung setzen (die Probe prüft danach den Hash am Ziel); `.gitignore` kann sich zwischen der Prüfung und dem
  Bewegen ändern. B4 (DEKLARIERT): `leseClaudeAenderungen` wertet den Laufdiff absolut aus — liegt eine übernommene Fähigkeit
  ungesichert unter `.claude/`, wird ein weiterer Lauf mit Fähigkeiten, Ort-B-Skill oder Plugin in diesem Arbeitsordner rot
  (fail-closed); die Antwort trägt den Hinweis „vor einem weiteren Lauf sichern“, bei offener Abnahme gilt das Review danach als
  veraltet (E-FB1-3). Vorher/nachher im Controller ist ein eigenes Paket (F-1169). Weitere Grenzen (DEKLARIERT, qa FB-1b):
  eine bestehende Fähigkeit (Ziel vorhanden) bzw. eine schon anders freigegebene aktualisiert die Route nicht — 409 mit Ausweg,
  Aktualisieren bleibt Handarbeit; eine Freigabe nach Inhalt bleibt in der lokalen Datei stehen, auch wenn der Arbeitsordner
  ohne Sichern verworfen wird; stürzt der Server zwischen Bewegen und Freigabe ab, liegt die Fähigkeit ohne Freigabe (nicht
  aktiv) unter `.claude/` bzw. beim Agent zusätzlich der Vorschlag — sichtbar erst mit FB-2. Ist der Basis-Commit nicht
  lesbar, sperrt das nur das Übernehmen; Verwerfen bleibt möglich.
- Anzeige in der Abnahme (F45 FB-2, `features/F45/plan-fb2-v2.md`): GET `…/abnahme` trägt `faehigkeitVorschlaege` (je Vorschlag
  `adressierbar` nach den Prüfungen der Route) und `faehigkeitUngesichert` — ungesicherte Änderungen unter `.claude/` des
  Arbeitsordners, gelesen nur lesend mit `git --no-optional-locks -c core.fsmonitor=false status --porcelain=v1 -z
  --untracked-files=all` und demselben Filter wie der Laufdiff (`claudePfadeAusStatus`); nicht auswertbar ⇒ „nicht bestimmbar“
  (sichtbar). Der Hinweis „vor einem weiteren Lauf sichern“ steht damit dauerhaft, solange der Stand ungesichert ist (B4) —
  in jeder Lage der Abnahme und auf der Freigabe-Seite des nächsten Laufs.
  Cache je Arbeitsordner (Stat-Signatur der Vorschläge, der Namen unter `.claude/skills|agents|commands` und der obersten
  `.gitignore`, höchstens 30 s; ungesichert höchstens 10 s, nach einer Zeitgrenze 60 s), den jede Aktion übernehmen/verwerfen
  verwirft. DEKLARIERT: verschachtelte `.gitignore` und Unterordner von `.claude/commands` gehen nicht in die Signatur ein (höchstens
  bis zum Ablauf der Frist; die Route prüft frisch). DEKLARIERT: `git status` startet wie im Laufdiff
  und in `routen-code` einen Clean-Filter (z. B. LFS) auf getrackten Dateien mit geändertem Stat — hier höchstens alle 10 s und
  nur, solange die Ablaufseite offen ist.
- Zeilenenden-Schutz (F45 B2b-3b-2b-2b-2a, Umsetzungsdetail zu „Worktree nur über git angelegt“, keine eigene Regel):
  `git worktree add` läuft mit `-c core.autocrlf=false -c core.eol=lf` — ohne autocrlf-Umwandlung, text-Dateien ohne
  eigenes `eol` mit LF. E-183 hasht bewusst Rohbytes; sonst bekäme der Arbeitsordner unter Windows CRLF und jeder
  schreibende Lauf scheiterte an der Startprüfung. Das Skelett trägt zusätzlich `vorlagen/projekt-skelett/.gitattributes`
  (`* text=auto eol=lf`); Nachrüsten legt sie nur an, wenn sie fehlt (eine abweichende bleibt); im Arbeitsordner wirkt sie
  erst nach dem Commit, in der Arbeitskopie des Projekts erst nach erneutem Auschecken. Ein wiederaufgenommener Arbeitsordner
  mit CR (von vor der Korrektur) bekommt im E-183-Grund den Rat „Arbeitsordner aufräumen“. Grenzen: ein `eol=crlf`-Attribut
  oder ein Filter des Projekts wirkt weiter; spätere Checkouts im Arbeitsordner folgen der gemeinsamen Repo-Konfiguration;
  die Startfreigabe folgt der Arbeitskopie, der Arbeitsordner dem Commit — eine von git mit CRLF ausgecheckte Arbeitskopie
  ohne `eol=lf` (vor der Korrektur zufällig grün) scheitert jetzt an E-183 ohne eigenen Rat (Abwägung, F-1143).
- Lesender Fingerabdruck (F45 B2a-3b, `src/review-stand`): nur Git-Plumbing mit `--no-optional-locks` (`rev-parse`,
  `ls-tree`, `diff-index`, `ls-files --others`, `check-attr`, `hash-object --stdin-paths` OHNE `-w`), nie `git status`,
  `update-index` oder `write-tree` — der Index wird nicht geschrieben und in `.git/objects` entsteht nichts (Gate
  f45-b2a3b (a) misst beides je Aufruf). Ausnahmen (`kontrollzustand/` u. a.) fallen in JS weg (`istAusnahmePfad`), nicht
  per Pathspec. Gesetzter Filter-Treiber (z. B. LFS) → nicht bestimmbar statt eines fremden Programms im Leitstand.
