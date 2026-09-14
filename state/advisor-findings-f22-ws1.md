# Advisor-Findings — F22 WS-1 (Router-Endpunkt)

Geprüft: `state/plan-v1-f22-ws1.md` gegen den realen Code (Branch
`feat/f22-ws1-router-endpunkt`). Prüfer: `architecture-advisor`-Subagent,
frischer Kontext, nur Lesezugriff (Read/Grep/Glob), kein Schreibrecht.
Marker-Legende: `[Fakt]` im Code belegt · `[Schlussfolgerung]` aus Fakten
abgeleitet · `[Annahme]` unbelegte Prämisse · `[offene Unsicherheit]`
weder belegt noch widerlegt.

## Befunde

1. **[Fakt, entlastend]** D13-Sperre/Routenreihenfolge (`if (laufAktiv)`
   Zeile 3232, `erfuelltD13Vertrag` in `check-f11-auftrag.mjs:296-313`,
   `fuehreAufgabeDurchFn(` kommt nur EIN Mal vor, Zeile 2337) — Plan-Platz
   für den neuen Endpunkt verletzt den D13-Vertrag nicht.
2. **[Schlussfolgerung]** Reihenfolge D13-vs-Existenzprüfung ist im
   Bestand NICHT konsistent zwischen `POST /api/laeufe` (D13 zuerst) und
   `POST /api/workflows/<id>/starten` (404 zuerst, Zeile 3306-3309 vs.
   3381). Plan übernahm Statuscode (404) vom zweiten, Reihenfolge (D13
   zuerst) vom ersten Vorbild, ohne die Wahl auszusprechen — behoben in
   Plan v2 (D13 zuerst, bewusst, wie `POST /api/laeufe`, mit Begründung).
3. **[Fakt, Korrekturbedarf]** Plan-Schritt "auftragId gegen
   `LAUFID_UNZULAESSIGE_ZEICHEN` prüfen" zitierte die falsche Vorlage
   (Zeile 3028, dort bereits garantiert nicht-leer). Richtiges Muster:
   dreiteilige Bedingung `=== null || .length === 0 ||
   LAUFID_UNZULAESSIGE_ZEICHEN.test(...)` (Zeile 3300/3436) — `dekodiereSegment`
   liefert bei kaputter Prozent-Kodierung `null`, das der Regex-Test
   allein nicht abfängt. Behoben in Plan v2.
4. **[Fakt, entlastend]** `nachLauf`-Callback läuft synchron (kein Await
   in der gesamten Kette `readFileSync`/`JSON.parse`/
   `leseCodexEreignisse`/`leseErgebnisobjekt`/`validiereErgebnisRouter`/
   `registriereKernArtefakt`/`validiereWorkflowDaten`/`registriereWorkflow`)
   — D13-Übergabe-ohne-Fenster-Invariante bleibt gewahrt. Kein Fachfehler.
5. **[Fakt, entlastend]** `registriereKernArtefakt`s `artefaktId`-Parameter
   nimmt KEIN `lineage-`-Präfix (`src/lineage-registry/index.ts:47-49,106`)
   — Plan-Annahme bestätigt.
6. **[Fakt, Korrekturbedarf]** `waehleWorkflowVorlage` hat vier Parameter
   `(klassifikation, auftragId, ziel, repoWurzel)`. Plan-Aufruf ließ das
   vierte Argument weg (stiller Default `process.cwd()`) — inkonsistent
   zur eigenen Disziplin bei der Worker-Auflösung. Behoben in Plan v2:
   `repoWurzel` explizit übergeben.
7. **[Fakt]** Repo-weite Suche nach `workitem:` außerhalb des Plans:
   KEIN Treffer. `FindingWorkitem`/`FeatureWorkitem`
   (`src/workboard/types.ts:13-15,35-38`) tragen `quelle`/`id` GETRENNT,
   nirgends zu einem `workitem:<quelle>:<id>`-String zusammengesetzt.
   `POST /api/auftraege`-Schema (`additionalProperties: false`) hat kein
   Feld dafür vor. **[Schlussfolgerung]** Format UND Erzeuger dieser
   Referenz sind unbelegt — die Selbsteinschätzung "größte Unsicherheit"
   des Plans ist zutreffend, nicht übertrieben. Vorgeschlagener Fallback
   (tolerante Regex, `[Annahme]`-Kommentar, Verweis auf Korrektur 3) ist
   angemessen und schlank, keine Überkomplexität.
8. **[Fakt]** `sammleAuftraege`: `version.daten` trägt bestätigt
   `auftragstext` (Pflichtfeld im Schema), aktuell bewusst nicht
   exportiert (Kommentar Zeile 871-872 bestätigt das ausdrücklich).
9. **[Fakt, Korrektur der Quellenwahl]** `check-f15-automat-real.mjs`
   mockt laut eigenem Kopfkommentar NICHT (echter Kindprozess statt
   Attrappe) — falsches Vorbild für Abschnitt 6. Richtiges Muster:
   `check-f15-workflow.mjs`s `starteTestserver`-Helfer (Zeile 348-350,
   verwendet u. a. bei 709/1066/1549/1577/1633/1671) — echter HTTP-Server
   über `erzeugeRequestHandler` plus injizierbare
   `fuehreAufgabeDurchFn`-Attrappe. Übernommen in Plan v2.
10. **[offene Unsicherheit, vom Plan korrekt benannt]** AK7 (Rot-Fall
    "Vorschlag ohne Router-Artefakt wird abgelehnt") hat keine
    Laufzeit-Prüfung in den Abschnitten 1-4 — die Garantie ist strukturell
    (kein Codepfad erzeugt einen Workflow ohne vorheriges Artefakt). Der
    Gate-Test muss diese STRUKTURELLE Eigenschaft zeigen, keinen
    HTTP-Ablehnungspfad. Vor Abschnitt 6 mit Stefan zu bestätigen.
11. **[Fakt, entlastend, Ergänzung]** F-346 (`state/findings.md`, offen,
    P2) ist die bereits dokumentierte, bewusst akzeptierte Spannung, die
    den `claude-code`-Fallback-Mechanismus trägt: Rolle `router` verlangt
    `STRUCTURED_OUTPUT`, `claude-code` hat diese Capability laut
    `ressourcen.json` nicht, `erlaubte_worker` führt `claude-code`
    trotzdem — mit einer real gemessenen Fehlerquote (~27 % Codezaun-Fälle,
    F-337-Nachtrag). Das Fence-Stripping in Punkt 2 ist damit KEINE
    vorsorgliche Komplexität, sondern eine empirisch belegte
    Notwendigkeit — stützt den Plan zusätzlich.
12. **[Fakt, entlastend]** `loeseRessourcenAuf` gibt `id` unverändert
    durch (`{ ...ressource, ...aufgeloest }`), Plan-Zugriff
    `aufgeloest.find((r) => r.id === 'codex')` ist korrekt, obwohl die
    JSDoc der Funktion das Feld nicht explizit nennt.
13. **[Fakt, entlastend]** Einhängung in `npm run check` entspricht exakt
    dem etablierten Muster jedes vorherigen `check-f2X`-Eintrags.

## Urteil

**Freigegeben mit Hinweisen.**

Begründung: Kein Finding zwingt zu einer Neuplanung oder zieht unnötige
Komplexität ein; die überwiegende Mehrheit der im Plan zitierten
Zeilenangaben und Verhaltensannahmen hält der Nachprüfung stand. Vor/
während des Baus zu klären, in Baureihenfolge:

- Abschnitt 1: Drei-Teil-Bedingung statt nur Regex für `auftragId`
  (Befund 3); D13-vor-404-Reihenfolge bewusst aussprechen (Befund 2).
- Abschnitt 4: `repoWurzel` als viertes Argument an
  `waehleWorkflowVorlage` (Befund 6).
- Vor Abschnitt 5: `workitem_referenz`-Format bleibt unbelegte
  `[Annahme]`, klar markiert (Befund 7) — kein Blocker, da WS-2 dieses
  Feld ohnehin erst befüllen wird.
- Vor Abschnitt 6: `check-f15-workflow.mjs` als Testvorlage (Befund 9);
  AK7-Interpretation als strukturellen, nicht Laufzeit-Nachweis behandeln
  (Befund 10).

## Nächster sinnvoller Schritt

Plan v2 mit den vier mechanischen Korrekturen schreiben, dann in der vom
Plan festgelegten Reihenfolge bauen: Schema+Validator, `entferneCodezaun`,
Endpunkt+Nachbearbeitung+Workflow-Registrierung, `workitem_referenz`,
Gate, `npm run check`, `code-reviewer`+`qa` (frischer Kontext), `git-flow`.
