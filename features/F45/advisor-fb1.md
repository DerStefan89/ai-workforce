# Advisor-Pass F45 FB-1 „Fähigkeit bauen – Daten“ (Plan v1)

Stand: 23.10.2026 · Prüfling `features/F45/plan-fb1.md` · Subagent `architecture-advisor`, frischer Kontext · Rollengrenze: nur
Read/Grep/Glob, kein Schreiben, kein Bash/Git. Bericht wörtlich übernommen (abgelegt vom Autor des Plans).

Geprüft gegen: ARCHITECTURE.md (Kern), `docs/architektur/wachstumsbremse.md`, `arbeitsordner.md`, `lokale-dateien.md`,
F-1069/F-1096/F-1131 und den benannten Code.

**Grenzen der Prüfung:** Bytes von ARCHITECTURE.md nicht nachgemessen (O9); `git check-ignore` nicht ausprobiert (O4); Gates
nicht gelaufen; `renameSync`/`realpathSync` unter Windows nicht gemessen; ob ein ADJUST-Lauf im Arbeitsordner mit unsauberem
Baum startet, nicht real geprüft.

Marker: [Fakt] im Code belegt · [Schlussfolgerung] abgeleitet · [Annahme] unbelegte Prämisse · [offene Unsicherheit] ·
[Fakt, entlastend] geprüft und in Ordnung.

## Befunde

**B1 · Hoch · O1 Regelkonflikt – vor Baubeginn**
- [Fakt] Kern „bis W2 entstehen keine neuen Routen“ (ARCHITECTURE.md:60), ebenso `docs/architektur/wachstumsbremse.md:10` und
  F-1131 (`state/findings.md:8256`).
- [Fakt] Die Gates sehen den vorgeschlagenen Dispatch nicht: Wachstumsbremse erhebt nur Literale an `pfad` im Server
  (`scripts/check-wachstumsbremse-server.mjs:49-62`); f813 (3) erkennt nur `req.method === '<X>'` (`scripts/check-f813-csrf.mjs:134`);
  f813 (4) verbietet `.method` nur in Modulen (`:301`).
- [Fakt, entlastend] Sicherheitlich trägt der Vorschlag: der CSRF-Haken greift für jede Methode außer GET/HEAD vor jeder Route
  (`scripts/leitstand-server.mjs:8251-8257`); `req.method !== 'POST'` ⇒ 405 ist Bestandsmuster (`:9396`, `:9420`).
- [Schlussfolgerung] „Modul erkennt den Pfad, Server prüft die Methode hinter dem Haken“ ist das Muster, das F-1131 für W2
  festlegen will; eine Einzelausnahme „außer FB-1“ schafft einen Präzedenzfall ohne Regel.
- Korrektur: Stefan entscheidet vor dem Bau. Bei A: als Zwischenmuster bis W2 in Kern, Detail und F-1131 eintragen, mit
  Durchsetzungsgrad (Erkennung im Modul DEKLARIERT, CSRF-Probe im Gate (c) direkt und über `/api/projekte/<id>/…`). Bei B:
  Teilung nach B2.

**B2 · Hoch · Zuschnitt trägt nicht – vor Baubeginn**
- [Fakt] 3 neue Module und 3 Testdateien, Server-Eingriff und Auslagerung, Gate mit 14 Fällen samt Rot-Nachweis und Sabotage je
  Fall, Kern plus 3 Detaildateien, Findings, Fixpaket, 9 offene Punkte; `docs/projekt/fixpaket-f45.md:108` schätzt ≈ 0,5–0,75 AT
  für FB-1 und FB-2 zusammen.
- [Schlussfolgerung] Ein Baudurchgang mit höchstens einer Korrekturrunde ist so nicht realistisch.
- Korrektur: **FB-1a** Erkennung, Projektion, Regelzeilen, Auslagerung `automat-ausgang.mjs`, Gate-Teil (unabhängig von O1);
  **FB-1b** Routen „übernehmen“/„verwerfen“ plus Doku §1/§2, nach den Entscheidungen zu O1 und O9.

**B3 · Hoch · Stilles Einschalten und Überschreiben einer Freigabe – vor Baubeginn**
- [Fakt] `setzeInhaltsfreigabe` überschreibt einen vorhandenen Schlüssel ohne Prüfung (`src/faehigkeiten/index.ts:265-268`).
  Aktiv = eingeschaltet, ohne Sperre, freigegeben (`:629-630`); `an` gilt je Projekt, nicht je Ordner. `ziel_existiert` prüft nur
  `.claude/` des Arbeitsordners (Plan Z. 34).
- [Schlussfolgerung] Steht `<typ>:<name>` schon in `an` (gleichnamige Fähigkeit im Projektordner, im Worktree fehlend), ist der
  übernommene Inhalt im nächsten Lauf aktiv, ohne dass jemand ihn eingeschaltet hat — gegen E-F45-6. Die Fassung im
  Projektordner verliert still ihre Freigabe.
- Korrektur: vor jeder Dateibewegung 409, wenn der Schlüssel in `an` steht oder in `inhalt_freigaben` mit anderem Hash; eigener
  Gate-Fall.

**B4 · Mittel · Wechselwirkung mit dem `.claude`-Laufdiff – vor Baubeginn klären**
- [Fakt] `leseClaudeAenderungen` wertet `git status --untracked-files=all` absolut aus, nicht vorher/nachher; nimmt einen sauberen
  Baum vor dem Lauf an (`src/execution-controller/index.ts:165-199`, Aufruf `:647-650`); gilt für jeden Lauf mit `ortBLauf`
  (`scripts/leitstand-server.mjs:3351-3379`).
- [Schlussfolgerung] Nach einer Übernahme liegt `.claude/skills/<name>/…` ungetrackt im Arbeitsordner; ein weiterer
  Ausführungslauf dort (ADJUST) mit Ort-B-Skill, aktiver Projekt-Fähigkeit oder Plugin würde rot.
- [offene Unsicherheit] Ob ein ADJUST-Lauf im Arbeitsordner mit unsauberem Baum startet, nicht real geprüft.
- [Fakt, entlastend] Der Dateisystem-Vergleich arbeitet vorher/nachher (`:235-242`); `pruefeGegenMomentaufnahme` prüft nur aktive
  Einträge (`src/faehigkeiten/index.ts:787-789`).
- Korrektur: eine Lösung festlegen und belegen — (a) nach Übernahme Läufe sperren bis gesichert; (b) Doku „vor dem nächsten Lauf
  sichern“; (c) `leseClaudeAenderungen` auf vorher/nachher umstellen (eigenes Paket).

**B5 · Mittel · O3 und die Bindung an die offene Abnahme – vor Baubeginn**
- [Fakt] „Abnahme offen“ = ABGESCHLOSSEN ohne aktuelle Entscheidung (`scripts/leitstand-server.mjs:2138-2144`); „Bereit zum
  Sichern“ gilt für abgeschlossene Abläufe (`scripts/leitstand/ablauf-sichern.mjs:29`, `:44`).
- [Schlussfolgerung] Nach ACCEPT/REJECT sind Vorschläge weder übernehmbar noch verwerfbar (Plan Z. 62), bleiben liegen und werden
  mitgesichert. Eine Übernahme bei offener Abnahme ändert den Inhalts-Fingerabdruck ⇒ „Review veraltet: true“
  (`vergleicheReviewStand`, `:6478-6497`; `istAusnahmePfad` kennt weder `vorschlaege/` noch `.claude/`,
  `src/ausfuehrung-vorbedingung/index.ts:23`).
- Korrektur: „Verwerfen“ ohne „Abnahme offen“ zulassen (nur Laufsperre und bereiter Ordner); ob „Übernehmen“ nach der Annahme
  erlaubt ist, entscheidet Stefan; den Effekt „Review veraltet“ im Plan benennen.

**B6 · Mittel · Pfadbegrenzung: Reihenfolge von mkdir und realpath – vor Baubeginn**
- [Fakt] Plan Z. 65-66 legt die Reihenfolge von `mkdirSync(recursive)` und `realpath` nicht fest.
- [Schlussfolgerung] Ist `.claude` eine Junction auf `~/.claude`, legt das rekursive Anlegen `skills/` dort an, bevor die
  realpath-Prüfung abweicht — Schreiben in Stefans Bestand (ARCHITECTURE.md:97).
- Korrektur: zuerst lstat-Kette für `.claude` (keine Verknüpfung, Ordner, realpath innerhalb der Wurzel); danach einzeln, nicht
  rekursiv anlegen, nach jedem Schritt erneut lstat; Enthaltensein über `relative()` auf `realpathSync.native`, nicht per
  String-Präfix (vgl. F-1166); Gate (s) um „`.claude` als Junction“ ergänzen.
- [Annahme] Wie `realpathSync` die Schreibweise unter Windows normalisiert, ist nicht geprüft.

**B7 · Mittel · Lesen durch Verknüpfungen, Sonderdateien, Größe – darf mitlaufen**
- [Fakt] Plan Z. 33: Hash auch bei grund. [Schlussfolgerung] Bei einer Agent-Verknüpfung folgt das Lesen dem Link (Hash/
  Beschreibung einer Datei außerhalb); eine FIFO hält `readFileSync` an (Muster `src/execution-controller/index.ts:216`).
- Korrektur: Verknüpfungen, Nicht-Dateien und zu große Dateien (Größe vorher per lstat) nie lesen; Hash dann `null`.

**B8 · Mittel · Kosten im 2-s-Poll – vor Baubeginn**
- [Fakt] Abnahme alle 2 s (`scripts/leitstand-server.mjs:8887`); teure Leser teilen einen Cache (`standCache`, `:6450-6465`).
- [Fakt] `listeSkillDateien` liest den Ordner vollständig, bevor eine Grenze greift (`src/ressourcen/skill-dateien.ts:123-139`);
  der Plan startet zusätzlich einen git-Prozess je Abfrage; Zahl der Vorschläge unbegrenzt.
- Korrektur: Zahl deckeln (≤ 20, darüber ein Eintrag mit Grund); begrenzter Durchlauf (Abbruch bei 200 Dateien bzw. 1 MiB);
  Cache je Arbeitsordner; `check-ignore` in FB-1 weglassen oder nur in der Route; O4 unbelegt.

**B9 · Niedrig · O8: `renameSync` und Rücknahme – darf mitlaufen**
- [Annahme] `renameSync` ersetzt eine vorhandene Zieldatei; „nie überschreiben“ hängt für Agents an der Prüfung direkt davor.
- [Fakt, entlastend] Keine Verschränkung im Node-Thread (`src/faehigkeiten/index.ts:344`); `schreibeFaehigkeitenLokal` atomar
  (`:350-361`); `aendereLokaleDatei` prüft Wächter und Gültigkeit selbst (`scripts/leitstand/routen-faehigkeiten.mjs:388-406`).
- Korrektur: Restrisiko fremder Prozesse DEKLARIERT oder für Agents `linkSync` (EEXIST atomar) + `unlinkSync`; Fehlerpfad
  „Zurück-Umbenennen scheitert“ ⇒ 500 mit beiden Orten und Log (fail-closed, ohne Freigabe nicht aktiv).

**B10 · Niedrig · Schreiben im Modul – darf mitlaufen**
- [Fakt] Kern „schreibende Aufrufe bleiben im Server“ (ARCHITECTURE.md:59), Detail präzisiert auf Workflow-Schreiber und
  `starteWorkflowSchritt(` (wachstumsbremse.md:10); Präzedenzfall `aendereLokaleDatei` im Modul.
- Korrektur: in der Doku klarstellen oder als Rückruf übergeben.

**B11 · Mittel · §2-Ausnahme und O9 – Entscheidung vor Baubeginn**
- [Fakt] ARCHITECTURE.md:90-96: im Arbeitsordner ändert der Kern nur über git, `npm ci` und die Löschliste, „nie unter `.claude/`“.
- [Schlussfolgerung] Übernehmen schreibt nach `.claude/`, Verwerfen löscht außerhalb der Löschliste — neue Ausnahme mit
  Durchsetzungsgrad (ARCHITECTURE.md:180). Die lokale Datei braucht keinen neuen Kernsatz (Z. 76 deckt es), nur
  `docs/architektur/lokale-dateien.md:13-14`.
- [Annahme] 235 B Luft nicht nachgemessen; zwei Kernsätze passen voraussichtlich nicht ⇒ Deckel-Entscheidung vor dem Bau.

**B12 · Niedrig · Eingebaute und mehrdeutige Namen – darf mitlaufen**
- [Fakt] Der Start sperrt eingebaute und mehrdeutige Namen (`src/faehigkeiten/index.ts:683-686`, `:739-741`, `:762-775`); die
  Erkennung nicht. [Schlussfolgerung] übernehmbar, aber dauerhaft gesperrt — fail-closed, Bedienärger. Korrektur: Grund schon in
  der Erkennung.

**B13 · Niedrig · Bedeutung von „ziel ignoriert“ – mit O4 entscheiden**
- [Schlussfolgerung] Ist `.claude/` ignoriert, kommt die Übernahme nie im Projektordner an; beim Aufräumen ohne „verwerfen“ geht
  sie verloren (`src/arbeitsordner/index.ts:517-523` zählt ignorierte Dateien nicht). [Annahme] `git worktree remove` entfernt
  ignorierte Dateien auch ohne `--force`. Korrektur: Stefan entscheidet 409 oder Hinweis.

## Geprüft und in Ordnung

- [Fakt, entlastend] Hash bleibt beim Verschieben gleich (`src/ressourcen/skill-dateien.ts:147-153`; Agent über Bytes,
  `src/faehigkeiten/index.ts:665-666`).
- [Fakt, entlastend] Vorhandene Helfer statt neuer (`pruefeFrontmatter`, `listeSkillDateien`, `pruefeSkillDateiNamen`,
  `aendereLokaleDatei`).
- [Fakt, entlastend] Laufsperre wie bei den Fähigkeiten-Routen (`scripts/leitstand-server.mjs:6626-6630`, `:9424`);
  `arbeitsordnerVorbereitungLaeuft` deckt Vorbereitung und Aufräumen (`:6429-6445`).
- [Fakt, entlastend] Wächter über `nachRoute` wie die bestehende Route (`:9498`).
- [Fakt, entlastend] O7: `globalerLaufZustand` ist Handler-Option, im Gate deterministisch setzbar (`scripts/check-f25-projekte.mjs:289-312`).
- [Fakt, entlastend] Auslagerung rein (`scripts/leitstand-server.mjs:5121-5188`), andere Fundstellen nur Kommentare
  (`scripts/check-f15-workflow.mjs:1535`, `src/workflow/index.ts:857`); ≈ 68 Zeilen gleichen +30 aus.
- [Fakt, entlastend] Regelzeilen: `laufort` liegt beim Auftragstext vor (`scripts/leitstand-server.mjs:7071`); Architekten-Zeile
  gilt auch im Modus `projekt` (`src/architekt/index.ts:611-617`). Hinweis: `src/architekt/architekt.test.ts` und
  `scripts/check-f39-architekt.mjs` mitprüfen; keine Regelzeile beginnt mit „- [x]“ (ARCHITECTURE.md:119).
- [Schlussfolgerung, entlastend] O2 Formprüfung genügt (Start prüft fail-closed, `src/faehigkeiten/index.ts:537-538`); O5, O6
  tragfähig (O5 plus Obergrenze aus B8).
- [Fakt] Nächste freie Finding-ID F-1164 (`state/findings.md:8556`).

## Urteil

**Nicht freigegeben.** B1 und O9 sind Regel- bzw. Deckelentscheidungen Stefans; B3 öffnet stilles Einschalten gegen ein
ausdrückliches Nicht-Ziel; B4, B5, B6 sind ungeklärte Wechselwirkungen bzw. eine mögliche Schreibstelle in `~/.claude`; der
Zuschnitt (B2) überschreitet die Heuristik. Der Kern des Ansatzes ist gut gewählt (Vorschlagsordner, Server schreibt nur auf
Klick, Freigabe nach Inhalt über den bestehenden Weg, deny-Regel unberührt).

Vor Baubeginn: O1, O9, Teilung FB-1a/FB-1b, B3, B4, B5 (O3), B6, B8 inkl. O4. Darf mitlaufen: B7, B9, B10, B11 (Wortlaut), B12,
B13 (nach O4), O2, O5, O6, O7.

## Nächster sinnvoller Schritt

Stefan entscheidet O1, O9 und O3. Danach Plan v2 für FB-1a (ohne Routen) mit B3, B4, B6, B8; FB-1b als eigenes Paket; Plan v2
höchstens mit Delta-Advisor-Pass.

## Nachtrag (Autor, 23.10.2026)

O4 gemessen (Scratch-Repo, echtes git): `git check-ignore --no-index` meldet nicht existierende Pfade unter Regeln `.claude/`,
`.claude`, `/.claude/*`, `.claude/skills/`, `*.md` korrekt als ignoriert; `.claude/` + `!.claude/agents/` ⇒ weiter ignoriert
(git-Semantik). Der Befund B8 bleibt als historischer Stand unverändert stehen.
