# Advisor-Findings — harness-freigabedatei-wiederherstellung

Geprüft: `state/plan-v1-harness-freigabedatei-wiederherstellung.md` gegen
den realen Stand von `.claude/hooks/commit-guard.cjs`,
`.claude/hooks/guard-settings.js`, `.claude/settings.json`,
`state/gates.md`, `state/assumption-ledger.md`, `ARCHITECTURE.md`,
`CLAUDE.md`, sowie die historischen Dokumente
`state/plan-v1-harness-b6-hooks-cjs-migration.md`,
`state/advisor-findings-harness-b6-hooks-cjs-migration.md` und
`docs/harness/programm-historie/harness-fix-5-commit-guard-haerten.md`.

Advisor: Subagent `architecture-advisor`, frischer Kontext (kein Bezug zur
Sitzung, die Plan v1 geschrieben hat).

**Rollengrenze, ausdrücklich:** Nur Read/Grep/Glob, kein Bash-/Git-Zugriff.
`git show f8d11f6^:.claude/hooks/commit-guard.js` konnte der Advisor
**nicht** ausführen — der historische Wortlaut ist als plausibel/konsistent
eingestuft, nicht als byte-genau verifiziert. Bewusster blinder Fleck,
kein übersehener.

## Marker-Legende
`[Fakt]` im Code belegt · `[Schlussfolgerung]` aus Fakten abgeleitet ·
`[Annahme]` unbelegte Prämisse · `[offene Unsicherheit]` weder belegt noch
widerlegt · `[Fakt, entlastend]` bestätigt, dass ein Teil in Ordnung ist.

## Findings

1. **[Fakt]** CONTEXT-Kernbehauptungen zu `commit-guard.cjs` stimmen exakt:
   121 Zeilen, genau zwei Aufgaben (Zeilen 63-69, 71-112), beide
   fail-closed (Zeilen 44-52, 107-112). Deckt sich mit Plan-CONTEXT.

2. **[Fakt]** CONTEXT-Behauptung zu `guard-settings.js` stimmt exakt:
   `GUARDED_FILES` (Zeilen 6-15) hat genau einen Eintrag,
   `.claude/settings.json`, mit `path`/`suffix`/`reason`-Struktur.

3. **[Fakt]** Die zitierte Wortgrenzen-Erkennung für `gh`/`merge` existiert
   exakt wie im Plan behauptet: `commit-guard.cjs:76-83`,
   `MERGE_GRENZE_VOR`/`MERGE_GRENZE_NACH`,
   Muster `(^|[\s"'`;&|()])TOKEN($|[\s"'`;&|()])`. Wiederverwendung für
   `git`/`commit`/`push` ist stilkonform, keine neue Abstraktion.

4. **[Schlussfolgerung, offene Unsicherheit]** Historischer Code-Wortlaut
   ist plausibel, aber nicht git-belegt. Gestützt durch drei unabhängige,
   bereits vorher committete Quellen:
   - `docs/harness/programm-historie/harness-fix-5-commit-guard-haerten.md:34,138,181`
     bestätigt `FRISCHEFENSTER_MINUTEN = 10`, `parseFreigabeZeitstempel`,
     BOM/UTF-16-Dekodierlogik, `eingabe.cwd || process.cwd()` (:102-103).
   - Dieselbe Datei, Zeilen 58-64, bestätigt die "historische Aufgabe 3"
     wörtlich (Bash-Block auf jeden Befehl mit
     `state/freigabe-commit.md`).
   - `state/gates.md` Kalibrierungs-Log (17.08./23.08.2026) bestätigt die
     Regex-Erweiterungen (Offset ohne Doppelpunkt, Sekundenbruchteile)
     konsistent mit dem im Plan zitierten finalen Regex.
   Starke Indizienlage, aber kein `git show`-Beleg. **Vor Bau: einmal
   `git show f8d11f6^:.claude/hooks/commit-guard.js` ziehen und gegen das
   Zitat diffen.**

5. **[MITTEL, Fakt]** Fehlender Fehlerpfad im Plan: bekannte, nie behobene
   cwd-Abhängigkeit wird stillschweigend mit reaktiviert.
   `docs/harness/programm-historie/harness-fix-5-commit-guard-haerten.md:68-72`
   dokumentiert explizit als `[Annahme]`, unbehoben: Pfadbildung aus
   `eingabe.cwd || process.cwd()` — liegt das Arbeitsverzeichnis nicht auf
   der Repo-Wurzel, zeigt der Pfad ins Leere, Hook meldet fälschlich
   "keine Freigabedatei". Diese Annahme steht nicht in
   `state/assumption-ledger.md` und wird im Plan nicht erwähnt, obwohl
   SCOPE 2 exakt diesen Code-Pfad 1:1 reaktiviert.

6. **[NIEDRIG, Fakt]** Race Conditions / TOCTOU nicht behandelt: zwischen
   Prüfung (Zeitstempel gültig/frisch) und `fs.unlinkSync`
   (Einmalgebrauch) liegt ein TOCTOU-Fenster. Keine neue Schwäche
   (historische Fassung hatte dieselbe Lücke), aber im Plan nicht als
   bekannte Grenze benannt.

7. **[Fakt, entlastend]** Option A für `guard-settings.js` ist strukturell
   konsistent. `guard-settings.js:25-27` matcht
   `normalized === f.path || normalized.endsWith(f.suffix)`.
   `tool_input.file_path` bei Edit/Write ist in der Praxis ein absoluter
   Pfad (belegt durch `state/gates.md:19`: zwei reale Edit-Versuche auf
   `.claude/settings.json` korrekt über den Suffix-Zweig abgefangen). Ein
   zweiter Eintrag würde nach demselben, bereits kalibrierten Mechanismus
   funktionieren — unabhängig vom cwd der Sitzung (Unterschied zu Finding
   5: der Edit/Write-Guard matcht nicht auf cwd, sondern auf den vom
   Werkzeug gelieferten absoluten Pfad). SCOPE 3 spezifiziert nicht
   explizit, dass der neue Eintrag beide Felder (`path` UND `suffix`)
   tragen soll — kleine Unschärfe, kein Blocker.

8. **[MITTEL, Fakt]** `state/gates.md`: SCOPE 9 adressiert die jetzt
   widersprüchliche Bestandszeile nicht. Die bestehende Tabellenzeile zum
   `commit-guard.cjs`-Hook sagt wörtlich, die Freigabe-Datei-Pflicht sei
   "mit Befund B6 ersatzlos entfernt". Nach Umsetzung dieses Plans ist das
   falsch. SCOPE 9 verlangt nur, neue Zeile(n) zu ergänzen ("Bestehenden
   Text nicht löschen") — richtig fürs Kalibrierungs-Log (Geschichtsschutz,
   analog N3 im B6-Plan), aber die Tabellenzeile ist Ist-Zustand, kein
   Protokoll, und muss korrigiert werden — sonst zwei sich widersprechende
   Aussagen im selben Dokument. Exakt die Unterscheidung, die im
   B6-Vorgänger (Advisor-Finding 4) bereits einmal gemacht werden musste.

9. **[Schlussfolgerung]** SCOPE 8 beantwortet die genannte offene
   Unsicherheit nur teilweise. `require(...)` beweist "lädt fehlerfrei",
   nicht "die neuen Funktionen laufen unter dieser Node-Version korrekt"
   (kein Durchlauf durch `verarbeiten()` mit echten Daten). Für die
   Funktionslogik selbst ist das unkritisch, sofern SCOPE 4-7 (echte
   Rot-/Grün-Fälle) ebenfalls auf der realen Maschine laufen — der Plan
   legt aber nicht fest, ob SCOPE 4-7 und SCOPE 8 auf derselben Maschine
   laufen. Ohne diese Klärung könnten Funktionsbeweis und
   Node-Versions-Beweis auf unterschiedlichen Maschinen erbracht werden,
   ohne dass das im Bericht sichtbar wird.

10. **[NIEDRIG]** SCOPE 8 nennt keine Ausführungslogistik dafür, wie die
    ausführende Sitzung sicherstellt, tatsächlich auf der realen
    Zielmaschine zu laufen (der B6-Vorgänger, N12, hatte für eine analoge
    Situation native Ausführung statt Dateibrücke explizit
    vorgeschrieben). Geringes Risiko, leicht im Bericht sichtbar zu
    machen.

11. **[Fakt, entlastend]** Keine unnötige Komplexität, keine neue
    Dependency. Reiner, bereits vorher produktiv gelaufener Code (native
    `fs`/`Buffer`), Wiederverwendung eines bestehenden Musters statt neuer
    Abstraktion. Entspricht CLAUDE.md "Bestehende Helper nutzen" und der
    Entscheidungsregel "Komplexität reduzieren".

12. **[Fakt, entlastend]** `ARCHITECTURE.md` ist projektweit noch reine
    `[FÜLLUNG]`-Vorlage. Keine verbindliche Konvention, gegen die dieser
    Plan verstoßen könnte — Prüfung "Abweichung von ARCHITECTURE.md"
    aktuell nicht anwendbar.

13. **[Fakt, entlastend]** Ablaufkonventionen aus CLAUDE.md eingehalten:
    SCHRITT-0-Präambel vorhanden, `git diff --staged` + ausdrückliches
    "ja" vor Commit verlangt, PR-Flow ohne Selbst-Merge, ESCALATE-Klauseln
    für alle kritischen Abweichungen. NICHT-Klausel verbietet dem Modell
    ausdrücklich jede eigene Erzeugung/Befüllung der Freigabedatei —
    konsistent mit der im Repo etablierten Doktrin.

## Urteil

**Freigegeben mit Hinweisen.**

Begründung: Die faktische Grundlage des Plans ist an jeder direkt
prüfbaren Stelle exakt zutreffend. Der zitierte historische Wortlaut ist
durch drei unabhängige, bereits vorher committete Quellen inhaltlich stark
gestützt, aber mangels Git-Zugriff des Advisors nicht byte-genau
verifizierbar — offen benannt, kein verdeckter Mangel. Kein Befund stellt
die Grundkonstruktion (Wiederherstellung + zusätzlicher Edit/Write-Schutz)
infrage; keine unnötige Komplexität, keine neue Dependency, keine
Abweichung von (noch ungefüllten) ARCHITECTURE.md-Regeln.

Vor Bau zu klären (in Plan v2 nachgezogen, keine davon blockiert die
Grundkonstruktion):
- Finding 4: `git show f8d11f6^:...` real ziehen, gegen Zitat diffen.
- Finding 5: geerbte cwd-Abhängigkeit als bekanntes Risiko benennen,
  in `state/assumption-ledger.md` nachtragen.
- Finding 8: SCOPE 9 um Korrektur der bestehenden Tabellenzeile in
  `state/gates.md` ergänzen (Log-Einträge bleiben unangetastet).
- Finding 9: klären, ob SCOPE 4-7 und SCOPE 8 auf derselben (realen)
  Maschine laufen.

Finding 6 und 10 sind niedrige, dokumentarische Ergänzungen ohne
Blockcharakter.

## Nächster sinnvolle Schritt
Plan v2 mit den vier Nachträgen aus dem Urteil schreiben, danach SCOPE
freigeben lassen.
