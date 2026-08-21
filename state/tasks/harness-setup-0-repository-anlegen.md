SCHRITT 0: Arbeitsverzeichnis ausgeben und gegen das im Auftrag genannte
Zielverzeichnis prüfen. Bei Abweichung: abbrechen, melden, nichts ändern.
Danach `git rev-parse template-baseline` ausgeben und gegen den unten
genannten gepinnten SHA prüfen. Bei Abweichung: abbrechen, melden, nichts
ändern. NICHT `git log -1` verwenden — der aktuelle Branch ist ein
Orphan-Branch ohne Commit, siehe CONTEXT.
Danach `git status --short | Measure-Object` ausgeben und den Ausgangsstand
protokollieren, bevor irgendetwas geändert wird.

Zielverzeichnis: C:\Users\stefa\Projekte\ai-workforce
Gepinnter SHA: 9189959a7d4de0486a4fee1e30b57ea8e5644661
(erreichbar über den Branch `template-baseline`)

## TASK: harness-setup-0-repository-anlegen

GOAL:
Das Projekt-Repository für AI Workforce trägt den Harness auf dem Stand von
`main`, mit eigener Historie, und die Artefakte des abgeschlossenen
Harness-Fix-Programms sind aus den Pfaden entfernt, die die Gates aktiv
scannen. Prüfbar an: `git rev-parse template-baseline` zeigt den gepinnten
SHA · `git remote -v` zeigt `template` auf das Vorlagen-Repo ·
`state/tasks/` enthält ausschließlich AI-Workforce-Verträge (plus
`.gitkeep`) · `docs/harness/programm-historie/` enthält alle 15
verschobenen Dateien · `state/tooling.md` trägt einen Abschnitt
„Harness-Herkunft".

CONTEXT:
- [Fakt] Der Klon selbst ist **vor** diesem Vertrag im Terminal erfolgt,
  nicht durch dieses Werkzeug. Dieser Vertrag prüft ihn in SCHRITT 0 und
  arbeitet auf dem Ergebnis. Grund: Claude Code braucht ein Arbeits-
  verzeichnis mit aktivem `.claude/`, damit die Schutz-Hooks greifen — das
  ist erst nach dem Klon der Fall.
- [Fakt] Nach dem Klon wurde die Template-Historie bewusst abgeworfen
  (`git checkout --orphan`), damit das Projekt eine eigene Historie bekommt.
  Folge: `main` ist ein Branch **ohne Commit**, und alle Repo-Dateien liegen
  im Index als „neue Datei". Das ist der erwartete Ausgangszustand, **kein**
  unsauberer Arbeitsbaum. `git mv` funktioniert trotzdem, weil die Dateien
  im Index stehen.
- [Fakt] Der gepinnte Template-Stand ist über den Branch
  `template-baseline` referenziert, damit er nicht vom Reflog abhängt und
  einem `git gc` standhält.
- [Fakt] Ziel-Fassung v1.4, Abschnitt 7: „Template zusätzlich als nur
  lesendes Remote; Upgrade und Rückfluss als gezielter Diff/Cherry-Pick, nie
  als Merge in `main`."
- [Fakt] Ziel-Fassung v1.4, Abschnitt 11, Harness-Kandidat 9: `main` bei
  `9189959` trägt rund 140 KB Artefakte des abgeschlossenen
  Harness-Fix-Programms (Phasen 0–2). Verifiziert per `Test-Path` und
  `Get-Content` gegen einen frischen Klon am 20.08.2026.
- [Fakt] `scripts/check-contract.mjs` prüft **jede** `.md` unter
  `state/tasks/` auf `SCHRITT 0` plus acht Pflichtmarker. Die neun
  Fremdverträge würden mitgeprüft, obwohl ihr eigenes `Zielverzeichnis` auf
  `C:\Users\stefa\Projekte\claude-projekt-template` verweist.
- [Fakt] `scripts/check-docs.mjs`, Prüfung 3, prüft **rekursiv** über
  `docs/harness/**` und `state/**` — die `Stand dieser Fassung:`-Marker der
  Fremddateien (17.08.2026) landen im selben Staleness-Vergleich wie die
  AI-Workforce-eigenen Zustandsdateien.
- [Fakt] Die 15 zu verschiebenden Dateien, nach robocopy-Bestandsaufnahme
  vom 20.08.2026:
  - `state/advisor-findings-phase1-vertraege.md`
  - `state/advisor-findings-phase2-adoptionsfaehigkeit.md`
  - `state/plan-v1-phase1-vertraege.md`
  - `state/plan-v1-phase2-adoptionsfaehigkeit.md`
  - `state/plan-v2-phase1-vertraege.md`
  - `state/plan-v2-phase2-adoptionsfaehigkeit.md`
  - `state/tasks/harness-fix-1-hooks-und-zwischenstand.md`
  - `state/tasks/harness-fix-2-commit-guard.md`
  - `state/tasks/harness-fix-3-dokugate-und-ci.md`
  - `state/tasks/harness-fix-4-pruefkette-und-vertragspruefung.md`
  - `state/tasks/harness-fix-5-commit-guard-haerten.md`
  - `state/tasks/harness-fix-6-werkzeug-katalog.md`
  - `state/tasks/harness-fix-7-reibung-und-doktrin.md`
  - `state/tasks/harness-fix-8-start-klein.md`
  - `state/tasks/phase0-artefakte-committen.md`
- [Fakt] `state/reibung.md` gehört **nicht** dazu und bleibt, wo sie ist.
  `state/tasks/harness-fix-7-reibung-und-doktrin.md` legt sie ausdrücklich
  als leeres Template-Skelett an: „Keine echten Einträge — das Template ist
  leer, die Einträge dieses Repos gehören nicht in jeden Klon."
  Dasselbe gilt für `state/gates.md`, `memory-map.md`, `tooling.md`,
  `triggers.md`, `assumption-ledger.md` — Template-Skelett, bleibt.
- [Fakt] Die drei Planungsdateien dieses Workstreams
  (`plan-v1-harness-setup.md`, `advisor-findings-harness-setup.md`,
  `plan-v2-harness-setup.md`) sind vor diesem Vertrag manuell nach `state/`
  kopiert worden und gehören dorthin — nicht verschieben.
- [Annahme] Ein Klon mit zwei Remotes berührt die im Repo dokumentierten
  Windows- und Cloud-Sync-Fallen nicht. Ungeprüft; gehört als Beobachtung
  nach `state/tooling.md`, kein Grund zum Anhalten.

SCOPE:
1. Ist-Bestand aufnehmen: `state/` und `state/tasks/` auflisten. Die
   gefundenen Dateien gegen die 15er-Liste im CONTEXT abgleichen und das
   Ergebnis zeigen, bevor etwas bewegt wird.
2. `docs/harness/programm-historie/` anlegen.
3. Die 15 Dateien per `git mv` (nicht `mv`) dorthin verschieben, Dateinamen
   unverändert.
4. Jeder verschobenen Datei als allererste Zeile einen Kopfblock
   voranstellen — der bestehende Inhalt bleibt sonst unangetastet:
   `<!-- GESCHLOSSEN — Harness-Fix-Programm, nicht Teil von AI Workforce.`
   `     Verschoben aus state/ bzw. state/tasks/ am 2026-08-20. -->`
5. `state/tooling.md` einen Abschnitt „Harness-Herkunft" anfügen, mit:
   gepinntem SHA, Datum des Klons, den Remote-Namen aus `git remote -v`,
   und einer Zeile zur ungeprüften Annahme aus dem CONTEXT.
6. Abschließend zeigen: `git remote -v`, `git status`,
   `dir state\tasks`, `dir docs\harness\programm-historie`, und den Diff von
   `state/tooling.md`.

NICHT:
- Kein `git commit`, kein `git push`, kein `git add`.
- Keine der 15 Dateien löschen oder inhaltlich verändern — nur verschieben
  und den Kopfblock voranstellen.
- `state/reibung.md`, `gates.md`, `memory-map.md`, `tooling.md` (außer
  Abschnitt aus SCOPE 5), `triggers.md`, `assumption-ledger.md` nicht
  anfassen.
- Keine Arbeit aus AP 1–7 vorwegnehmen: kein `package.json`-Edit, kein
  `.claudeignore`-Edit, keine Gate-Kalibrierung, keine CI-Änderung.
- Kein Produktcode, keine Modulstruktur, keine Testdatei.
- Kein `npm install`, kein Werkzeug installieren.

BUDGET:
Ein Durchgang plus höchstens eine Korrekturrunde. Die Verschiebung ist
mechanisch; der wahrscheinlichste Korrekturfall ist eine Datei, die in der
Liste steht, aber im Repo anders heißt.

OUTPUT:
- Die Bestandsaufnahme aus SCOPE 1, vollständig.
- Die vier Ausgaben aus SCOPE 6, vollständig.
- Eine Aussage, ob die 15er-Liste exakt aufging oder abwich.
- Bestätigung, dass kein Commit entstanden ist.

ESCALATE:
- Arbeitsverzeichnis oder SHA weichen ab → anhalten, beide Werte nennen,
  nichts ändern.
- Eine der 15 Dateien fehlt, oder eine sechzehnte, ähnlich benannte taucht
  auf → anhalten, vollständige Liste zeigen, nicht selbst entscheiden, was
  dazugehört.
- `git status` zeigt etwas anderes als „alle Repo-Dateien als neue Datei im
  Index, plus die drei manuell kopierten Planungsdateien und diesen Vertrag"
  → anhalten, Ausgabe zeigen. Insbesondere: existiert bereits ein Commit auf
  `main`, ist der Ausgangszustand ein anderer als angenommen → anhalten.
- `git mv` scheitert an einer Datei → anhalten, nicht auf `mv` ausweichen;
  der Unterschied ist die Historie.
- Ein Hook meldet sich (Commit-Guard, Settings-Guard) → anhalten, Meldung
  vollständig zeigen, keine Freigabe-Datei anlegen.

FOLGT: harness-setup-1-pruefkette-fuellen (Vertrag für AP 1), zu schreiben
erst nachdem dieser Vertrag ausgeführt ist und sein OUTPUT vorliegt.
