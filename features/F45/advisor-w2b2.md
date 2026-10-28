# F45 W2b-2 — Advisor-Pass auf `plan-w2b2.md`

Stand 27.10.2026, architecture-advisor mit frischem Kontext (Leitfragen: Muss das existieren? Einfachste Lösung? Was kann
weg?). Wiedergabe gekürzt, Belegstellen wie geliefert.

**Urteil: Freigegeben mit Hinweisen** (kein Schnitt). Ansatz, Helfer und „keine Produktänderung“ tragen; nicht belegt war die
Folge SERIELL 23 → 16 für die Repo-Baum-Läufer.

## Findings

1. **Keine Produktänderung nötig** — BELEGT: `erzeugeRequestHandler(optionen = {})` behält das Objekt
   (`leitstand-server.mjs:5538`), `starteLaufUndVergiss` verteilt es (`:6523-6524`), einziger Aufruf von
   `fuehreAufgabeDurchFn` (`:6581`); alle fünf Starts laufen darüber (Workflow `:7379`, Einzellauf `:9956`/`:10070`,
   Chat `:10286`, Prüfschritt `:10438`). `VERBOTENE_OPTIONEN_FELDER` greift nur am Body (`:2101`). Laufakte-Schema verlangt
   für `rohstrom_referenz.pfad` nur einen String; `result-evaluator/index.ts:289` liest wörtlich; Vorbild
   `check-f36-ws5b-skill.mjs:606`, `check-f45-b2b3b2b1b-r1.mjs:274`. `startvorlagePfad` absolut zulässig
   (`ressourcen/index.ts:634`, `ladeStartvorlage` `:6005`).
2. **Exit-Hook statt finally** — BELEGT: die finally-Aufräumer je Fall bleiben, der Hook kommt dazu; `raeumeVerzeichnis` ist
   synchron. node:test: `teste.mjs:105` ohne `--test-isolation` ⇒ eigener Prozess je Datei. VERMUTET: bei Signal kein Hook
   (Rest im Temp-Ordner); wirft der Hook mit anderem Fehlercode, wird ein grünes Gate rot — in den Kopf schreiben.
3. **git-Wartung** — Umgebungsvariante scheitert an `gitUmgebung` (`git-starter/index.ts:103-104`). Anhängen an
   `.git/config` trägt (VERMUTET, Test mit `git config --get`). BELEGT: Kriterium „danach committet das Gate“ übersieht
   Repos, in denen der Produktcode committet; einfacher und per grep prüfbar: jedes `init` ohne Ausnahme. Ursache F-1230 nur
   VERMUTET, Gegenprobe ein grüner Lauf ⇒ nicht „erledigt“, sondern „umgesetzt, Beobachtung in CI“.
4. **Repo-Baum-Läufer** — Beleg reicht nicht: Vorher/Nachher sieht keine kurzlebigen Schreiber (angelegt und im finally
   gelöscht — genau die ENOENT-Klasse) und deckt nur geänderte Gates. check-docs/check-rules/k-kontext gehen ohne
   gitignore-Filter durch den Baum. VERMUTET: Urheber der ungetrackten `kontrollzustand/jarvis-jarvis-chat-*` unklar.
   Entlastend: `scripts/.aufraeumen-reste/` wird während der Gates nur ergänzt; f12, fixpaket-f30, b2b3b2b2b1 liegen schon
   unter `tmpdir()`; Tests laufen nach den Gates.
5. **Frist-Gates bleiben seriell** — richtig (Standard 1, Läufer setzt keinen Faktor). VERMUTET: Fristen, die ablaufen
   sollen (Timeout-Rotfälle), nicht skalieren.
6. Weitere: Temp-Pfade ≈ 15 Zeichen länger (MAX_PATH); ohne Schutzregel schleicht sich die nächste relative
   `kontrollzustand-test-*`-Stelle ein.

## Auflagen

- **A1** Beleg für SERIELL: statisch `grep -rn kontrollzustand-test scripts src` = 0 Code-Treffer und kein Gateway-/F8-Lauf
  ohne `rohBasisVerzeichnis`; dazu vor/nach dem vollen `check:gates` Anzahl `kontrollzustand-roh/*`, Einträge in
  `kontrollzustand/`, `startvorlagen/`, Repo-Wurzel, `git status --porcelain --ignored`.
- **A2** Herkunft `kontrollzustand/jarvis-jarvis-chat-*` klären; stammt sie aus einem Gate, gehört es in den Umfang.
- **A3** `schalteGitWartungAb` nach jedem `git init` in Gates und Tests, ohne Bedingung.
- **A4** F-1230 „umgesetzt, Beobachtung“, nicht „erledigt“.
- **A5** Timeout-Rotfälle vom Skalieren ausnehmen; MAX_PATH und „Exit-Hook wirft“ unter Risiken.
- Optional: Regel in `check-rules` gegen das Literal `kontrollzustand-test`; git-Wartung als eigener Commit.
