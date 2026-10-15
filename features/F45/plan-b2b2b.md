# F45 B2b-2b — Plan (qa-Schritt in der Kette)

Branch `f45/b2b2b-qa-schritt` (von origin/main `ff1ca5d`, #343, nach B2b-2a #342 und der Startfreigabe 2.1.300). Grundlage:
`docs/projekt/fixpaket-f45.md` (B2b-2 = 2a gebaut + 2b; design-guardian-Schritt → B3, E-B2b-2-1 = A), F-820 (qa-Schritt
fehlt), F-1085, F-1113 (2), F-1114 (6); Muster `features/F45/plan-b2b2a.md`. Bau erst nach freigegebenem Plan. Nicht in
diesem Bau: design-guardian-Schritt im Lauf (B3), Doppel-Reviewer, F-1111-Reste; kein `.claude/`, kein
`projekte.json`/`ressourcen.json`/`vorlagen/`/`.githooks`; in `workflow-vorlagen/` nur `standard.json` und `hoch.json`.

## Plan v1

### 0. Spike (vor dem Plan erledigt, 15.10.2026)

Echter Lauf der Claude-Code-CLI 2.1.300 (`claude-sonnet-5`) mit `--json-schema` aus `baueClaudeJsonSchema(ergebnis-qa)`,
Prompt = Produkttext `baueQaAuftragstext` (neu, `src/qa`) mit einem Auftrag mit drei AK und einem Nicht-Ziel plus den drei
Eingaben als Text: Exit 0, `structured_output` schemagerecht (BLOCKIERT, Q1 KRITISCH, Q2 HOCH, **vier Testfälle**, je AK
einer), `result` = dasselbe JSON, `validiereErgebnisQa` ohne Verstöße. **Schema real durchgesetzt.** Nachweis
`features/F45/nachweise/b2b2b/spike-qa-schema.md` (+ `.mjs`, Rohstrom geschwärzt, Ausgabe). Schema-SHA-256 `37749f8d…e6f6`.

### 1. Ziel der Iteration

Nach dem Review prüft ein qa-Schritt das Ergebnis aus Nutzersicht; seine Befunde laufen in dieselbe Automatik und
Korrekturschleife wie die Review-Befunde — Review und qa zusammen höchstens eine Korrekturrunde.

### 2. Referenzen

F-820 (Maßnahme: qa-Ausgabeschema + Schritt vor der Abnahme), Spec §8/§10 (`docs/projekt/codex-review-spec.md`), Muster
B2b-2a (Spike, Allowlist Regel 4b, `baueBefundZusatzzeilen`, `schwere_bei_bereit`, Render-Nachweis `nachweise/b2b2a/`),
B2b-1a (Rückweg-Regel `pruefeRueckweg`, Wiederholungs-Halt, „Prüfer wiederholen“).

### 3. Module und Datenbedarf

**3.1 Schema, Rolle, qa-Modul**
- `schemas/ergebnis-qa.schema.json` (neu, Spike-Fassung): `urteil` (BEREIT/BEREIT_NACH_KORREKTUR/BLOCKIERT), `befunde[]`
  in der Befundform des Reviews ohne `dimension` (`id`, `schwere`, `evidenz`, `fundstelle`, `zusammenfassung`,
  `korrekturrichtung`, `beleg`; nullable wie dort), `testfaelle[]` (`name`, `schritte[]`, `erwartet`, `ergebnis`
  bestanden/durchgefallen/nicht_pruefbar), `empfehlung`; `additionalProperties: false` auf jeder Ebene, alle Felder required.
- `src/rollen/index.ts`: `qa.erlaubtes_output_schema = 'ergebnis-qa'`.
- `src/qa/index.ts` (neu): `baueQaAuftragstext(auftragstext, aks, nichtZiele)` (Rolleninstruktion mit JSON-Vertrag, AK und
  Nicht-Ziele, dann der Auftrag) und `validiereErgebnisQa(geparst)` (Urteil, Befund-Schwere/Textfelder, ID eindeutig,
  `testfaelle` nicht leer mit Name/Erwartet/≥1 Schritt/Ergebnis, BLOCKIERT ⇒ ≥1 Befund). Muster `src/architecture-advisor`.
- `src/workflow/index.ts`: `CLAUDE_CODE_AUSGABESCHEMAS` += `'ergebnis-qa'` (Regel 4b, Kommentar nennt den Spike).

**3.2 Ablauf und Regeln (`ermittleNaechstenSchritt`, rein)**
- Neue Regel **1q** (Kopplung an `output_schema 'ergebnis-qa'`, Muster 1b/1d), Reihenfolge nach 1k:
  (a) `qaVerstoesse` nicht leer ⇒ haltKlaerung (Ausweg „Prüfer wiederholen“); (b) `urteil` ∉ {BEREIT,
  BEREIT_NACH_KORREKTUR} ⇒ haltKlaerung; (c) `vorpruefungBeanstandet` (Text, vom Aufrufer: der Review dieser Runde hat
  BLOCKIERT geurteilt oder AK verletzt) ⇒ haltKlaerung mit diesem Grund.
- **Aufgeschobener Review-Halt**: 1b (BLOCKIERT) und 1i (AK-Verstöße) halten nicht, wenn der `nachfolger` des Reviews
  ein Schritt mit `output_schema 'ergebnis-qa'` ist — die Kette läuft zum qa, die Entscheidung fällt nach dem qa (sonst
  liefen die Befunde nicht gemeinsam in den Neubau). Ein unlesbares/unbekanntes Urteil (1b) und ein Vertragsbruch (1k)
  halten weiter sofort am Review (Ausweg „Review wiederholen“). Ohne qa-Nachfolger (Bestand, Gate-Fixtures) bitgleich.
- `SchrittErgebnis` (`src/workflow/types.ts`) additiv: `qaVerstoesse?`, `vorpruefungBeanstandet?`.

**3.3 Server (Nachlauf, Eingaben, Abnahme)**
- `findeQaSchritt(workflowDaten)` (Kopplung an `output_schema 'ergebnis-qa'`, Muster `findeReviewSchritt`);
  `leseQaErgebnisAusLaufakte` (Muster `leseAdvisorErgebnisAusLaufakte`: `leseRollenErgebnisRohstrom` + `validiereErgebnisQa`).
- Auftragstext: Rolle `qa` ⇒ `baueQaAuftragstext(...)` mit AK/Nicht-Zielen des Auftrags (statt des rohen Auftrags).
- Nachlauf **Review**: hat der Review einen qa-Nachfolger, keine Rückweg-Entscheidung am Review (`rueckwegEntscheid`
  bleibt null) — sie fällt beim qa.
- Nachlauf **qa** (ERFOLGREICH): qa-Ergebnis lesen und prüfen; das Review-Ergebnis derselben Runde aus dem Review-Schritt
  (seine `lauf_id`, `leseUrteilAusLaufakte`, `pruefeAkUrteile`) ⇒ `vorpruefungBeanstandet`; bei gültigem qa-Ergebnis
  `ermittleAutomatischeAnpassung` mit den zusammengeführten Prüfern (siehe 3.4). Halt-Grund wie bisher um Grenze/
  Wiederholung ergänzt (`mitRueckwegGrund`).
- `wendeAutomatischeAnpassungAn` (Kern und Mensch): setzt zusätzlich den qa-Schritt zurück; `bezug` additiv
  `qa_lauf_id` (nur wenn der Ablauf einen qa-Schritt hat — Bestand bitgleich). Ebenso der `bezug` der Mensch-Entscheidung
  ANGENOMMEN/ABGELEHNT. `schemas/kontrollzustand-entscheidung-payload.schema.json` + `src/entscheidung` (Validator, Typ):
  `qa_lauf_id` optional (string|null).
- F-648-Block: der Neubau bekommt die Befunde des Reviews UND des qa (aus `bezug.review_lauf_id`/`qa_lauf_id`) — je
  Herkunft eigener Abschnitt; der qa-Lauf der neuen Runde bekommt die Begründung und seine eigenen vorherigen Befunde
  (gezielt nachprüfen, Muster Re-Review).
- `leseVorherigeReviewBefunde` → liest Review- und qa-Befunde der Vorrunde (Wiederholungs-Halt über beide).
- „Prüfer wiederholen“: `pruefschrittWiederholbar` kennt qa (FEHLGESCHLAGEN, unlesbar oder Verstoß ⇒ wiederholbar;
  gültiges BLOCKIERT ⇒ nicht, „Anpassung wünschen“); `ermittlePrueferBefund` liest `qaVerstoesse`. Route unverändert
  (setzt den Cursor-Schritt zurück).
- GET …/abnahme additiv `qa` (Projektion wie `urteil`: Status, Urteil, Befunde, Testfälle, Empfehlung, Verstöße,
  `schwere_bei_bereit` nur bei offener Abnahme, `worker`, `laufId`) und `qaWiederholbar`.

**3.4 Automatik und Korrekturschleife (`f35-ws3-adjust-automatik.mjs`, `src/korrekturschleife`)**
- `ermittleAutomatischeAnpassung` additiv `qa: { urteil, befunde } | null` (Vorgabe null ⇒ bitgleich): ausgelöst, wenn
  Review BLOCKIERT/AK-Verstoß ODER qa BLOCKIERT; `outputSchema` darf `'ergebnis-qa'` sein (Aufruf aus dem qa-Nachlauf).
  Wiederholung: `sindDieselbenBefunde` über die Vereinigung beider Befundlisten (Schlüssel Schwere|Datei wie bisher).
  Grenze unverändert (`pruefeRueckweg`, Bau-Stufe, eine Runde je Stufe, Summe `max_replans`) ⇒ Review + qa = eine Runde.
- `baueAutomatischeAnpassungsBegruendung(..., qa = null)`: mit qa Kopf „nach Review-Urteil X und qa-Urteil Y“ und je
  Herkunft ein Abschnitt („Befunde des Reviews:“ / „Befunde der Prüfung aus Nutzersicht (qa):“); ohne qa bitgleich (Golden).
- `baueAusfuehrungKorrekturInstruktion(begruendung, reviewBefunde, qaBefunde = [])`: qa-Abschnitt „Offene Befunde der
  qa-Prüfung (Nutzersicht), die diese Iteration beheben muss:“ mit derselben Zeilenform + Zusatzzeilen; ohne qa bitgleich.
- `baueReviewKorrekturInstruktion(begruendung, befunde, herkunft = 'review')`: für qa der Satz „Die vorherige qa-Prüfung
  meldete …“; sonst bitgleich.

**3.5 Vorlagen** — `standard.json` und `hoch.json`: Review-`nachfolger` → neuer Schritt `schritt-3-qa` bzw.
`schritt-5-qa` (Rolle qa, lesend, claude-code, `claude-sonnet-5`, Eingaben des Reviews + `artefakt:ergebnis-@<review>`,
`output_schema 'ergebnis-qa'`, AUTOMATISCH, 600 000 ms, `nachfolger` null). `max_schritte` reicht (standard 6, hoch 8).
`fast-lane.json` unverändert.

**3.6 Anzeige** (`views/workflow-abnahme.js`, i18n de/en/ru/tr)
- Lage „entscheidbar“: eigene Karte „Prüfung aus Nutzersicht“ unter der Kachelreihe (Prüfung · Review · Nachweise):
  Urteil-Badge (Farbe wie Review, amber bei schweren Befunden trotz BEREIT), Empfehlung, Hinweis „bereit trotz schwerer
  Befunde“ (eigener Satz, gleiche Art wie beim Review), Befunde (gleiche Liste wie Review, `renderBefunde`), Testfälle
  (Name, Schritte, Erwartet, Ergebnis-Badge). Leerzustände: kein qa-Schritt ⇒ keine Karte; keine Befunde/Testfälle ⇒ Satz.
- Lage „vorab“: Hinweis-Notiz des qa (fehlgeschlagen/nicht lesbar/Verstöße) mit Knopf „Prüfung aus Nutzersicht
  wiederholen“ (`wf-pruefer-wiederholen`, gleiche Bedienung).
- `workflows.js`: Render-Kennzeichen um qa-Status/Lauf/Hinweise/Wiederholbar.
- Sichtbarer Text ohne Feldnamen und Kennungen („qa“ nur als Rollenname in Klammern? — nein: „Prüfung aus Nutzersicht“).

**3.7 Gate** `scripts/check-f45-b2b2-pruefer.mjs` erweitert (Attrappe beantwortet auch qa-Läufe mit echter Laufakte):
- (s1) `ergebnis-qa.schema.json` = Spike-Fassung (SHA-256). (q0) `standard.json`/`hoch.json`: Review → qa, qa letzter
  Schritt mit Schema, AUTOMATISCH, claude-code; `fast-lane.json` ohne qa.
- (q1) standard läuft Ausführung → Review → qa (Reihenfolge der Läufe), qa bekommt `jsonSchema`, ABGESCHLOSSEN.
- (q2) Review BEREIT, qa BLOCKIERT ⇒ eine Korrekturrunde; Neubau-Auftrag trägt den qa-Abschnitt mit Q1 (Herkunft sichtbar).
- (q3) Review BLOCKIERT + qa BLOCKIERT ⇒ qa läuft trotzdem, genau eine Kern-Version, Neubau trägt beide Abschnitte.
- (q4) zweite Runde wieder BLOCKIERT ⇒ keine zweite Kern-Version, Halt mit Grenz-/Wiederholungsgrund.
- (q5) qa mit Schemaverstoß ⇒ KLAERUNG_ERFORDERLICH am qa, `qaWiederholbar` true, POST …/pruefer-wiederholen 200.
- (q6) fast-lane ohne qa (eine Ausführung, kein qa-Lauf). (q7) GET …/abnahme `qa`: Urteil, Befunde, Testfälle,
  `schwere_bei_bereit` 1 bei BEREIT mit HOCH.
- Bestehende Fälle (k1)–(g1) bleiben (Fixture ohne qa ⇒ Bestand bitgleich), (f) 6× bleibt.
- Unit-Tests rot→grün: `src/qa/qa.test.ts`, `src/workflow/workflow.test.ts` (1q, aufgeschobener Halt, Allowlist),
  `f35-ws3-adjust-automatik.test.mjs` (qa-Zusammenführung, Golden ohne qa), `korrekturschleife.test.ts` (qa-Abschnitt,
  Golden), `workflow-abnahme.test.mjs` (Karte, Testfälle, Hinweis, Leerzustände), `src/entscheidung` (qa_lauf_id).

**3.8 Render-Nachweis** `features/F45/nachweise/b2b2b/` (Muster b2b2a): Abnahme mit Review- und qa-Karte, ein
qa-Befund HOCH; de 1440 dunkel, de 1440 hell, de 390, ru 390 hell, de 1440 200 %; scrollWidth gemessen. Danach design-guardian.

**3.9 Nebenbei (Doku)** — F-648 gegen B2b-2a prüfen und schließen; Jarvis-Stand „12.10.2026“: Quelle ist
`docs/STATUS.md` „Aktuelle Phase“ (Stand-Klammer + F45-Satz) → `docs/projekt/kontext/lagebild.md` (Jarvis/Router lesen
es); nachziehen und Lagebild neu erzeugen. `harness-abgleich/standard.json`: Agent qa `bewusst_nicht` → `ersetzt_durch`
Schritt qa (fast-lane ohne), „B2b“ beim design-guardian → „B3“ (F-1114 (6)).

### 4. Zustände

Default: Review BEREIT, qa BEREIT ⇒ ABGESCHLOSSEN, Karte grün. Leer: keine Befunde/Testfälle ⇒ Satz; kein qa-Schritt
(fast-lane, Bestand) ⇒ keine Karte, Verhalten bitgleich. Fehler: qa FEHLGESCHLAGEN/unlesbar/Verstoß ⇒ Halt am qa, rote
Notiz mit „wiederholen“; Review unlesbar ⇒ Halt am Review wie bisher (qa läuft nicht). Ladend: Poll wie bisher.

### 5. Akzeptanzkriterien

1. standard/hoch laufen Ausführung → Review → qa; fast-lane ohne qa.
2. qa BLOCKIERT ⇒ eine Korrekturrunde; Neubau nennt die qa-Befunde mit Herkunft; Review + qa BLOCKIERT ⇒ eine Runde mit
   beiden; zweite Runde ⇒ Halt (Grenze/Wiederholung über beide Prüfer).
3. qa mit Schemaverstoß ⇒ Halt + „Prüfer wiederholen“ (Server und Knopf).
4. Abnahme zeigt Urteil, Befunde und Testfälle in eigener Karte; BEREIT mit KRITISCH/HOCH ⇒ amber Hinweis (4 Sprachen,
   ohne Feldnamen/Kennungen).
5. Gate grün, Unit-Tests rot→grün, Render-Nachweis 5 Ansichten ohne waagerechten Überlauf, `npm run check` Exit 0;
   `starteWorkflowSchritt(` 6× im Server, F-228-Zählung unverändert.

### 6. Risiken

- Vorlagenänderung trifft Gates, die mit `standard.json` echte Abläufe fahren (Attrappen ohne qa-Laufakte ⇒ Halt am qa):
  Liste in §7, Lauf der vollen Kette entscheidet.
- Aufgeschobener Review-Halt ändert das Verhalten von 1b/1i — nur mit qa-Nachfolger; Bestand und Fixtures ohne qa bitgleich.
- Ein qa-Lauf mehr je Runde (Kosten/Zeit ≈ 1 min); auch bei Review BLOCKIERT an der Grenze läuft qa noch einmal (bewusst:
  Stefan bekommt beide Befundlisten zur Entscheidung).
- `capabilities-ansicht` liest die Vorlagen (Rolle qa ⇒ Capability TEST_DESIGN) — `ressourcen.json` darf nicht geändert
  werden; falls ein Gate eine Lücke meldet: anhalten und berichten.
- Schreibstellen: alle Änderungen über bestehende `schreibeWorkflowFortschritt`-Aufrufe, kein neuer Aufruf (F-228).

### 7. Anzupassende Prüfungen (Vorabliste)

`scripts/check-f45-b2b2-pruefer.mjs` (Erweiterung), ggf. Gates mit echten standard-Abläufen
(`check-f35-ws1-feature-auftrag`, `check-fixpaket-f30-vorbedingungen` (g), `check-fix-f676-installwurzel`,
`check-f39-architekt` (f)/(l)), `src/workflow/workflow.test.ts` (Allowlist deepEqual), Rollen-Gate `check-f17-rollenvertrag`
(Fall „qa + irgendein Schema“ nutzt `ergebnis-code-reviewer` — bleibt Rotfall), `harness-abgleich.test.ts`.

### 8. Doku

`state/findings.md` (F-820 erledigt, F-648 erledigt, neue Findings ab F-1116), `fixpaket-f45.md` (B2b-2b gebaut, B2b-2
abgeschlossen), `docs/STATUS.md` (+ Lagebild), Kopf der Codex-Review-Spec nur falls nötig.

### Offene Punkte (nicht stillschweigend entschieden)

- O1: Zuschnitt — Kern (3.1–3.5, 3.7) und Anzeige (3.6, 3.8) auf einem Branch, getrennt stagebar; bei „zu groß“
  Anzeige abtrennen (Auftrag).
- O2: qa bekommt keine Projektkarte und keinen Beobachtungsblock (Zuschnitt; Spike ohne Karte) — als Finding.
- O3: Wiederholungs-Schlüssel ohne Herkunft (gleiche Schwere+Datei von Review oder qa gilt als dieselbe).

## Advisor-Pass (15.10.2026, frischer Kontext, `architecture-advisor`)

Urteil **UEBERARBEITEN**; Zuschnitt: zu groß — Schnitt 2b-1 Kern (ohne Vorlagenänderung, Bestand bitgleich) und 2b-2
Live-Schaltung mit Anzeige (Vorlagen, Harness-Zuordnung, Anzeige, Render-Nachweis), weil sonst nach dem Merge echte
qa-Läufe liefen, deren Befunde die Abnahme nicht zeigt.
- A1 HOCH [Fakt]: der aufgeschobene Halt hebelt die Vorrangfolge 1b/1i vor 1k aus — „BLOCKIERT/AK verletzt bei leerer
  Befundliste“ hielte an 1k am Review, ohne Automatik und ohne „Review wiederholen“ (`pruefschrittWiederholbar` sperrt
  bei BLOCKIERT/AK). ⇒ bei beanstandetem Review mit qa-Nachfolger auch 1k aufschieben.
- A2 HOCH [Fakt]: Objektschlüssel `qa:` außerhalb `src/rollen` macht `check-f17-rollenvertrag` AK1 rot ⇒ umbenennen.
- A3 HOCH [Fakt]: „beanstandet“ und „hat qa-Nachfolger“ dürfen nicht mehrfach entschieden werden (D5) ⇒ ein exportiertes
  Prädikat in `src/workflow` für Regel und Nachlauf; strukturiert `vorpruefung` statt Text; Lesen über `ermittlePrueferBefund`.
- A4 HOCH [Fakt]: Vorabliste unvollständig: `src/router/router.test.ts` (Vorlagen, → 2b-2), `src/rollen/rollen.test.ts`
  (qa-Schema null), `scripts/check-f15-workflow.mjs:226` (Grundtext Regel 4b), check-f17 AK1.
- A5 MITTEL: Fehlerpfade im qa-Nachlauf (Review-Ergebnis nicht lesbar ⇒ fail closed mit Grund; qa ausgefallen bei
  beanstandetem Review ⇒ Beanstandung im Grund, Ursache wie Review/Advisor).
- A6 MITTEL: jedes gültige qa-Ergebnis ist nicht wiederholbar. A7 MITTEL: Vorrunden-Befunde mit Review- und qa-Lauf der
  laufenden Runde getrennt; Wiederholungs-Text mit qa auf beide Prüfer. A8 MITTEL (Anzeige): Vorab/Blick/Rollenkreis → 2b-2.
  A9/A10 NIEDRIG: Harness-Zuordnung (→ 2b-2), Wiederholungs-Halt bringt bei Grenze 1 nur den Grund-Text (vertretbar).

## Entscheidung Stefan (15.10.2026, nach dem Advisor-Pass)

- Zuschnitt = Advisor-Schnitt: **B2b-2b-1 Kern** (dieser Bau) und **B2b-2b-2** (Vorlagen standard/hoch, Harness-Zuordnung,
  Abnahme-Karte, Vorab/Blick/Rollenkreis, Render-Nachweis, design-guardian; Gate-Fälle „standard läuft Ausführung →
  Review → qa“ und „fast-lane ohne qa“ an den echten Vorlagen).

## Plan v2 — B2b-2b-1 Kern (Delta zu Plan v1)

- **Nicht in 2b-1:** §3.5 Vorlagen, §3.6 Anzeige, §3.8 Render-Nachweis, Harness-Zuordnung (§3.9 Teil), Router-Tests.
  Ohne qa-Schritt in einer Vorlage laufen alle echten Abläufe bitgleich; qa wirkt nur in Abläufen, die den Schritt tragen
  (Gate-Fixtures, Reparaturfassung). Keine UI-Änderung ⇒ kein design-guardian, kein Render-Nachweis in 2b-1.
- **§3.2 neu (A1, A3):** exportierte reine Funktionen in `src/workflow/index.ts`: `istReviewBeanstandet(urteil,
  akVerstoesse)` (BLOCKIERT oder ≥1 AK-Verstoß) und `qaNachfolgerStartbereit(schritte, reviewSchritt)` (nachfolger mit
  `output_schema 'ergebnis-qa'`, Status OFFEN/WARTET_FREIGABE, `lauf_id` null). **Aufschub**: am Review mit tragbarem
  Urteil (eines der drei) gilt `istReviewBeanstandet && qaNachfolgerStartbereit` ⇒ 1b, 1i UND 1k halten nicht, die Kette
  läuft zum qa. Ein unbekanntes Urteil hält weiter sofort (1b). Ist der qa nicht startbereit (Reparaturfassung), hält der
  Review wie bisher und die Automatik des Reviews greift wie bisher (dasselbe Prädikat im Nachlauf).
  Regel **1q** (`output_schema 'ergebnis-qa'`): (a) `qaVerstoesse` ⇒ Halt, Ausweg „Prüfer wiederholen“; (b)
  `vorpruefung` gesetzt, aber Review-Urteil nicht eines der drei ⇒ Halt „Review-Ergebnis dieser Runde nicht lesbar“ (fail
  closed, A5); (c) qa-Urteil nicht tragend und/oder `istReviewBeanstandet(vorpruefung)` ⇒ ein Halt, der beide nennt.
  `SchrittErgebnis` additiv `qaVerstoesse?`, `vorpruefung?: { urteil, akVerstoesse }`. Allowlist Regel 4b + `ergebnis-qa`.
- **§3.3 Delta:** Review-Nachlauf: `rueckwegEntscheid` nur, wenn NICHT aufgeschoben (dasselbe Prädikat auf der Fassung
  des Nachlaufs). qa-Nachlauf: Review-Befund über `ermittlePrueferBefund(reviewSchritt, …)` (erweitert um `befunde` und
  um AK-Verstöße auch bei BLOCKIERT — bisher nur bei tragendem Urteil gelesen) ⇒ `vorpruefung`. Ursache eines
  ausgefallenen qa wie Review/Advisor in den Grund, bei beanstandetem Review um „Der Review dieser Runde hat beanstandet“
  ergänzt (A5). GET …/abnahme: Feld `qaErgebnis` (nicht `qa`, A2) und `qaWiederholbar`. `pruefschrittWiederholbar` für
  qa: FEHLGESCHLAGEN oder Verstoß gegen das Schema ⇒ wiederholbar, jedes gültige Ergebnis ⇒ nicht (A6), VERWEIGERT ⇒ nicht.
- **§3.4 Delta (A2, A7):** Parameter heißt `qaErgebnis` (nicht `qa`). `leseVorherigePrueferBefunde(workflowId,
  reviewLaufId, qaLaufId)`: Vorrunden-Befunde aus `bezug.review_lauf_id` und `bezug.qa_lauf_id`, je nur, wenn ungleich dem
  Lauf der laufenden Runde. Wiederholungs-Grund mit qa: „Die Prüfer melden nach der Korrektur dieselben Befunde …“; ohne
  qa bitgleich. „Beanstandet“ in `ermittleAutomatischeAnpassung` über `istReviewBeanstandet` (eine Stelle).
- **§3.7 Gate (2b-1, Fixtures mit qa-Schritt):** (s1) Schema-SHA; (q1) Ausführung → Review → qa, qa mit `jsonSchema` und
  Rolleninstruktion, ABGESCHLOSSEN, `qaErgebnis` mit Testfällen; (q2) qa BLOCKIERT ⇒ eine Runde, `bezug.qa_lauf_id`,
  Neubau mit qa-Abschnitt (Herkunft) und Q1, qa der neuen Runde mit seinen Vorbefunden; (q3) Review + qa BLOCKIERT ⇒ qa
  läuft, eine Runde, Neubau mit beiden Abschnitten; (q4) zweite Runde ⇒ keine zweite Kern-Version, Halt mit Grund;
  (q5) qa-Schemaverstoß ⇒ Halt am qa, `qaWiederholbar`, POST …/pruefer-wiederholen 200; (q6) A1: Review BLOCKIERT ohne
  Befunde und ohne Pflichtsatz ⇒ qa läuft, Automatik löst aus; (q7) qa BEREIT mit HOCH ⇒ `qaErgebnis.schwere_bei_bereit` 1;
  (q8) qa FEHLGESCHLAGEN bei beanstandetem Review ⇒ Halt nennt die Beanstandung, wiederholbar. (k1)–(g1), (f) bleiben.
- **§7 Delta (A4):** `src/rollen/rollen.test.ts`, `src/workflow/workflow.test.ts` (Allowlist), `scripts/check-f15-workflow.mjs`
  (Grundtext Regel 4b), `scripts/check-f17-rollenvertrag.mjs` (AK1 — keine `qa:`-Schlüssel); Router-Tests erst 2b-2.
- **§8 Delta:** F-820 bleibt offen bis 2b-2 (Nachtrag „Kern gebaut“); `fixpaket-f45.md`: B2b-2b geteilt, 2b-1 gebaut,
  2b-2 offen — B2b-2 ist erst mit 2b-2 abgeschlossen.

## Delta-Advisor-Pass (15.10.2026, frischer Kontext) und Plan v2.1

Urteil **FREIGEGEBEN_MIT_AUFLAGEN** (A1–A7 sachlich gelöst). Eingearbeitet:
- D1 HOCH: der Aufschub gilt nur, wenn derselbe Ablauf mit tragendem Review den qa tatsächlich startet (Regeln 2/3/4/4b/5
  über einen zweiten Aufruf von `ermittleNaechstenSchritt` mit tragendem Review — eine Regelquelle); sonst hält der Review
  wie bisher. Im Nachlauf löst die Automatik nur bei `naechster.art === 'haltKlaerung'` aus (aus dem Ausgang abgeleitet,
  keine zweite Prädikatsauswertung im Server). Unit-Fall: qa ZWINGEND / `max_schritte` erreicht.
- D2: AK-Block 2b-1 (unten). D3: Gate-Fälle (q9) Review BEREIT mit AK-Verstoß + qa BEREIT ⇒ eine Runde nach dem qa;
  (q10) Mensch-Anpassung bei Halt am qa ⇒ `bezug.qa_lauf_id`; „qa nicht startbereit“ als Unit-Fall (Reparaturfassung).
  (q4) erwartet die Grenze (andere Befunde in Runde 2); die Wiederholung über beide Prüfer belegt der Unit-Test.
- D4: `vorpruefung` kommt vom Review, dessen `nachfolger` der qa ist; ist er nicht ERFOLGREICH oder unlesbar ⇒
  `{ urteil: null }` ⇒ 1q (b); undefined nur ohne Review davor. `ermittlePrueferBefund` liest beim Review AK-Verstöße und
  Befunde auch bei BLOCKIERT.
- D5: 1q (a) nennt eine Beanstandung des Reviews mit. D6: qa-Auftragstext gekoppelt an `output_schema 'ergebnis-qa'`.
- D7: Schemadatei LF/ohne BOM (check-f16); Rotfall-Name check-f17 nachgezogen; F-228-Zählung per grep im Review.
- Zuschnitt (D7, offen): GET …/abnahme `qaErgebnis`/`qaWiederholbar` gehen mit der Anzeige nach **2b-2**; (q7) ebenso.
  (q5) belegt „Prüfer wiederholen“ über POST …/pruefer-wiederholen.

### Akzeptanzkriterien B2b-2b-1

1. `ergebnis-qa` ist Schema der Rolle qa und an claude-code per `--json-schema` zugelassen (Spike, s1, Unit Regel 4b).
2. Ein Ablauf mit qa-Schritt läuft Ausführung → Review → qa; der qa bekommt Rolleninstruktion und Schema (q1).
3. qa BLOCKIERT, Review beanstandet oder beides ⇒ genau eine Korrekturrunde nach dem qa; der Neubau nennt die Befunde je
   Herkunft; der qa der neuen Runde bekommt seine Vorbefunde (q2, q3, q6, q9, q10).
4. Eine zweite beanstandete Runde löst keine weitere Runde aus; Halt mit Grund (q4; Wiederholung über beide: Unit).
5. qa mit Schemaverstoß oder Ausfall ⇒ Halt am qa, „Prüfer wiederholen“ möglich; Beanstandung des Reviews im Grund (q5, q8).
6. Ohne qa-Schritt (alle Vorlagen, Bestand) bitgleich: (k1)–(g1) grün, Golden-Tests; `starteWorkflowSchritt(` 6×.

## Bau und Prüfpass B2b-2b-1 (15.10.2026)

- Bau nach Plan v2.1. Rot→grün: Unit-Tests vor der Implementierung rot (Korrekturschleife 3, Workflow: fehlende Exporte,
  Rollen 1, Automatik 6, Entscheidung 1, Workflow D1 2); `src/qa`-Tests nach dem Modul (das Modul entstand für den Spike).
  Gate gegen die Produktdateien im Stand HEAD (Export ohne `kontrollzustand/`) rot mit 15 Befunden, danach grün.
- Prüfpass (frischer Kontext): code-reviewer und qa je „Freigegeben mit Hinweisen“, kein hoher Befund; design-guardian
  entfällt (keine UI-Änderung in 2b-1).
- Korrekturrunde: qa 1 (Halt-Text verspricht keine Runde mehr), qa 3 (fehlende Review-Laufakte der Vorrunde ⇒ kein
  Vergleich), qa 4a/4b (Gate (q5)(q8) mit Start nach „Prüfer wiederholen“, neuer Fall (q11) Wiederholung über beide Prüfer —
  ersetzt den Unit-Beleg bei AK 4), Code-Review 1 (Auftrag bei BLOCKIERT nur im qa-Nachlauf gelesen, nicht im Poll), 2
  (Beanstandungssatz ohne bekannte Ursache), 4 (Doku), 5 (Parametername), 7 (`AuftragAkzeptanzkriterium`).
- Nachpass: code-reviewer und qa je „Freigegeben mit Hinweisen“, alle Punkte erledigt; Resthinweise (toter `?? []`,
  Leerzeile in `src/qa`, F35-Altkommentar „NIE 'starte'“, Testtitel, zwei Formulierungen desselben Halt-Satzes, F3-Zweig
  ohne Test) und die übrigen Erstpass-Punkte in F-1116; Live-Schaltung und Anzeige in F-1117 (B2b-2b-2).

## Plan B2b-2b-2 „qa-Schritt live“ (Plan v1, 15.10.2026)

Branch `f45/b2b2b2-qa-live` (von origin/main `8b5ce98`, nach dem Merge von B2b-2b-1 #344). Umfang = F-1117 (1)–(9);
dazu F-1114 (6) und F-1116 (5)(6), soweit Anzeige und Gate sie berühren. Nicht: design-guardian-Schritt im Lauf (B3),
Doppel-Reviewer, F-1111-Reste; kein `.claude/`, `projekte.json`, `ressourcen.json`, `vorlagen/`, `.githooks`; in
`workflow-vorlagen/` nur `standard.json` und `hoch.json`; `starteWorkflowSchritt(` bleibt 6× im Server; F-228-Zählung
unverändert (keine neue Schreibstelle).

### 1. Ziel der Iteration

Die Vorlagen standard und hoch prüfen nach dem Review aus Nutzersicht (qa); Stefan sieht das qa-Ergebnis vor der Abnahme
(Urteil, Befunde, Testfälle, Hinweis bei schweren Befunden trotz BEREIT), bei einem Halt am qa die Ursache ohne Kennungen,
den Ausweg in einem Satz und den Knopf „Prüfung aus Nutzersicht wiederholen“. Damit sind B2b-2 und F-820 abgeschlossen.

### 2. Referenzen

F-1117 (1)–(9), F-1116 (5), F-1114 (6), Advisor A8/A9 (oben), Plan v2.1 2b-1; Muster Review: `reviewHaltGrund`,
`reviewWiederholbar`, `renderReviewHinweise`, `schwere_bei_bereit` (B2b-2a), Render `features/F45/nachweise/b2b2a/` und
Klickfolge `features/F45/nachweise/b2b1/render/`.

### 3. Module und Datenbedarf

**3.1 Vorlagen (F-1117 (4)(5)(9))** — `standard.json`: `schritt-2-review.nachfolger` → `schritt-3-qa`; neuer Schritt
`schritt-3-qa` (rolle qa, lesend, worker claude-code, modell claude-sonnet-5, output_schema `ergebnis-qa`, AUTOMATISCH,
600 000 ms, nachfolger null), Eingaben `artefakt:auftrag-__AUFTRAG_ID__`, `artefakt:aenderungsuebersicht-@schritt-1-ausfuehrung`,
`artefakt:pruefergebnis-@schritt-1-ausfuehrung`, `artefakt:ergebnis-@schritt-2-review`; `risiko` nennt claude-code (Spike
B2b-2b: `ergebnis-qa` nur dort real belegt). `hoch.json` gleich mit `schritt-5-qa` hinter `schritt-4-review` (Eingaben
auf `schritt-3-ausfuehrung`/`schritt-4-review`). `max_schritte` reicht (standard 3 ≤ 6, hoch 5 ≤ 8; das Budget zählt
verschiedene Schritte). `fast-lane.json` unverändert. Router-Tests: Schrittzahl 3 bzw. 5, Rollenfolge, qa-Schritt (Schema,
worker, AUTOMATISCH, Eingaben inkl. `ergebnis-@<review>`, nachfolger null), fast-lane ohne qa.

**3.2 Server, GET …/abnahme (F-1117 (1)(2))** — additiv:
- `qaErgebnis`: Projektion des qa-Schritts (`findeQaSchritt`) nach dem Muster `urteil`: `kein_qa_schritt` (fast-lane,
  Bestand) · `noch_nicht_gelaufen` · `nicht_gelaufen_klaerung` (lauf_id null, Halt am qa) · `fehlgeschlagen`
  (FEHLGESCHLAGEN/VERWEIGERT) · `laufakte_fehlt` · `nicht_lesbar` (Verstöße gegen das qa-Schema über
  `leseQaErgebnisAusLaufakte`; `verstoesse` nur zur Diagnose, nicht angezeigt) · `ok` (urteil, befunde, testfaelle,
  empfehlung, `schwere_bei_bereit` nur bei offener Abnahme über `zaehleSchwereBeiBereit` — dieselbe Regel wie beim Review,
  also nur BEREIT —, worker, laufId). Jeder Status trägt `halt` (Ablauf KLAERUNG_ERFORDERLICH mit Cursor am qa) und bei
  Halt `grund` (Server-Grund roh, nur Diagnose — die Oberfläche zeigt ihn nicht, F-1116 (5)).
- `qaWiederholbar`: dieselbe Vorbedingung wie POST …/pruefer-wiederholen (`pruefschrittWiederholbar` +
  `ermittlePrueferBefund`), nur wenn der Cursor auf dem qa-Schritt steht (gelesen nur dann, Poll 2 s).
- Lauf-Detail (GET /api/workflows/<id>): `prueferWiederholbar` bleibt beim Advisor (steuert „Advisor wiederholen“ in den
  Eingriffen); der qa-Halt wird wie der Review-Halt über die Abnahme derselben Seite `#/workflows/<id>` bedient — kein
  zweiter Knopf. Siehe O1.

**3.3 Anzeige (`views/workflow-abnahme.js`, `views/workflows.js`, `rollen-kreis.js`; F-1117 (7), Auftrag 3/4)**
- Lage „entscheidbar“: eigene Karte „Prüfung aus Nutzersicht“ (`section.entscheiden-karte`) direkt unter der Kachelreihe
  (Prüfung · Review · Nachweise), vor „Selbst ausprobieren“: Urteil-Badge (Farbe wie beim Review, amber bei schweren
  Befunden trotz BEREIT), wer prüfte („Claude“), Empfehlung, amber Hinweis „bereit trotz schwerer Befunde“ (eigener Satz
  „Die Prüfung aus Nutzersicht sagt „bereit“ …“, Pluralform wie beim Review), Befunde (`renderBefunde` wiederverwendet —
  ohne Dimension, das qa-Schema hat keine), Testfälle (Name, Schritte als Liste, Erwartet, Ergebnis-Badge bestanden/
  durchgefallen/nicht prüfbar mit Symbol ✓/✗/?; der Text trägt die Bedeutung). Leerzustände: `kein_qa_schritt` ⇒ keine
  Karte (Bestand, fast-lane bitgleich); keine Befunde ⇒ „Keine Befunde.“; keine Testfälle ⇒ eigener Satz; andere Status ⇒
  Satz statt Inhalt.
- Lage „vorab“ (Halt am qa): Notiz „Prüfung aus Nutzersicht“ — rot bei Ausfall/nicht lesbar/nicht gestartet mit Ursache
  ohne Kennungen („Das Werkzeug ist ausgefallen.“ / „Das Ergebnis war unvollständig oder nicht lesbar.“ / „Sie ist nicht
  gestartet.“) und **einem Satz zum Ausweg** (Auftrag 4, Entscheidung Challenger: „Ohne Prüfung aus Nutzersicht ist keine
  Abnahme möglich — wiederhole sie, repariere den Ablauf, wünsche eine Anpassung oder lehne ab.“; kein Annehmen ohne qa),
  dazu der Knopf „Prüfung aus Nutzersicht wiederholen“ (`.wf-pruefer-wiederholen`, `data-pruefer="qa"`) auf eigener Zeile,
  wenn `qaWiederholbar`. Halt bei gültigem Ergebnis (BLOCKIERT an der Grenze oder Wiederholung, Advisor A8): Urteil-Badge
  und die qa-Befunde (dieselbe Liste); kein Knopf (der Server lässt ein gültiges Ergebnis nicht wiederholen).
- „Auf einen Blick“: Zeile „Prüfung aus Nutzersicht“ mit Urteil-Badge, sobald `qaErgebnis.status === 'ok'`; bei Hinweisen
  (Halt, schwere Befunde) die Zahl mit „Details bei der Prüfung aus Nutzersicht“ (Liste nur einmal, design-guardian 2 B2a-3a).
- Bedienung (`views/workflows.js`): Kennzeichen um `qaErgebnis.status/laufId/halt`, die qa-Hinweiskennung und
  `qaWiederholbar`; Klick auf `.wf-pruefer-wiederholen` bleibt derselbe Weg (POST …/pruefer-wiederholen, danach POST
  …/starten); Meldungen je `data-pruefer` („Prüfung aus Nutzersicht neu gestartet …“ statt „Review neu gestartet …“).
- Rollen-Kreis: `KREIS_ROLLE_JE_SCHRITT_ROLLE.qa = 'qa'` — der Satellit qa wird aus dem qa-Schritt ‚jetzt‘/‚fertig‘/‚offen‘
  (dieselbe Statusregel wie die Kreis-Rollen); code-reviewer/design-guardian bleiben ‚offen‘. Kopfkommentar nachziehen.
- i18n de/en/ru/tr: neue Schlüssel unter `abnahme.qa.*` und `entscheiden.abnahme.qa.*`; sichtbarer Text ohne Feldnamen,
  Kennungen oder Rohwerte; ru mit Pluralformen.

**3.4 Harness-Zuordnung (`harness-abgleich/standard.json`, F-1117 (8), F-1114 (6))** — Agent qa: `bewusst_nicht` →
`ersetzt_durch` `{ rolle: 'qa' }` mit `fehlt_im_ablauf` („Kontrolltiefe fast-lane und Abläufe aus der Zeit vor B2b-2b-2 ohne
qa-Schritt“); DoD dod-04a521a7/dod-283ac334: Begründung „Review und qa sind eigene Workflow-Schritte (standard, hoch) …“
(Schritt-Feld bleibt code-reviewer — das Schema erlaubt eine Rolle); design-guardian und die UI-/Render-DoD: „B2b“ → „B3“.

**3.5 Gate `scripts/check-f45-b2b2-pruefer.mjs` (Auftrag 6)** — neue Fälle an den **echten Vorlagen** (Datei geladen,
Platzhalter ersetzt; dieselbe Attrappe):
- (v1) standard aus der Vorlage: Läufe Ausführung → Review → qa, ABGESCHLOSSEN; der qa-Auftrag enthält das Review-Ergebnis.
- (v2) qa-Halt (FEHLGESCHLAGEN) ⇒ GET …/abnahme `qaErgebnis.halt` true mit Status und `grund`, `qaWiederholbar` true.
- (v3) „qa wiederholen“: POST …/pruefer-wiederholen + POST …/starten ⇒ nur der qa läuft erneut, ABGESCHLOSSEN, danach
  `qaWiederholbar` false.
- (v4) qa BEREIT mit HOCH ⇒ `qaErgebnis.schwere_bei_bereit` 1, Testfälle in der Projektion; nach ANGENOMMEN 0.
- (v5) fast-lane aus der Vorlage: kein qa-Lauf, `qaErgebnis.status` `kein_qa_schritt`.
- (v6) hoch-Vorlage strukturell: qa hinter dem Review, Eingaben zeigen auf `schritt-3-ausfuehrung`/`schritt-4-review`.
- Bestehende Fälle bleiben. Gates mit echten standard-Abläufen, die an einer Attrappe ohne qa-Laufakte nun am qa halten,
  werden mit Begründung angepasst (Attrappe beantwortet qa bzw. Erwartung um den qa-Schritt ergänzt) — §7.
- Unit rot→grün: `workflow-abnahme.test.mjs` (Karte, Testfälle, Hinweis, Leerzustände, Vorab-Notiz mit Knopf und Satz,
  Blick, keine Kennungen im Text), `rollen-kreis.test.mjs` (qa-Satellit), `router.test.ts`.

**3.6 Render-Nachweis `features/F45/nachweise/b2b2b2/`** (Muster b2b2a/b2b1): `instanz.mjs` (Port 4402, Wegwerf-Ablage,
Attrappe, kein Netz) legt zwei Abläufe in der Form der Vorlage standard an: (a) Review BEREIT mit einem MITTEL-Befund, qa
BEREIT mit einem HOCH-Befund (lange Fundstelle) und drei Testfällen (bestanden, durchgefallen, nicht prüfbar) ⇒ Abnahme
mit Review-Kachel und qa-Karte, amber Hinweis; (b) qa im ersten Lauf FEHLGESCHLAGEN, im zweiten BEREIT ⇒ Halt am qa mit
roter Notiz und Knopf; Klick ⇒ qa läuft erneut ⇒ Abnahme. `render/erzeuge-nachweis.mjs`: je Folge de 1440 dunkel, de 1440
hell, de 390, ru 390 hell, de 1440 200 % (b vor dem Klick), dazu `halt-klick-de-1440` zuletzt; Klicktabelle mit Spalten für
Karte, Hinweis, Badge-Klasse (F-1114 (13)), Knopf, scrollWidth/clientWidth; `nachweis.md`. Danach design-guardian.

### 4. Zustände

Default: Review und qa BEREIT ⇒ Karte grün mit Testfällen. Leer: kein qa-Schritt ⇒ keine Karte; keine Befunde/Testfälle ⇒
Satz. Ladend: Poll wie bisher (Kennzeichen erweitert). Fehler: qa ausgefallen/nicht lesbar/nicht gestartet ⇒ rote Notiz mit
Ursache, Satz zum Ausweg und (wenn wiederholbar) Knopf; Halt mit gültigem BLOCKIERT ⇒ Befunde im Vorab-Block. Hover: Knopf
wie `.button` (kein neuer Stil, keine neuen Farben).

### 5. Akzeptanzkriterien

1. standard/hoch aus der Vorlage laufen Ausführung → Review → qa; fast-lane ohne qa (Router-Tests, Gate v1/v5/v6).
2. GET …/abnahme liefert `qaErgebnis` (Urteil, Befunde, Testfälle, `schwere_bei_bereit`), bei Halt am qa `halt`/`grund`
   und `qaWiederholbar` (v2, v4).
3. „Prüfung aus Nutzersicht wiederholen“ setzt nur den qa zurück und startet ihn; danach ABGESCHLOSSEN (v3, Klickfolge).
4. Abnahme zeigt die Karte mit Urteil, Befunden, Testfällen; BEREIT mit KRITISCH/HOCH ⇒ amber Hinweis; Vorab/Blick zeigen
   bei Halt die qa-Befunde bzw. Ursache und Ausweg in einem Satz; Rollen-Kreis zeigt qa als Satellit; de/en/ru/tr ohne
   Feldnamen/Kennungen (Unit, Render).
5. Harness-Zuordnung: qa `ersetzt_durch` mit `fehlt_im_ablauf`, design-guardian „B3“ (Validator und Abgleich-Gates grün).
6. Render-Nachweis ohne waagerechten Überlauf; design-guardian ohne offenen HOCH-Befund; `npm run check` Exit 0 (einmal);
   `starteWorkflowSchritt(` 6×.

### 6. Risiken

- Die Vorlagenänderung trifft Gates, die echte standard/hoch-Abläufe mit einer Attrappe fahren, die nur Review-Laufakten
  schreibt ⇒ Halt am qa statt ABGESCHLOSSEN. Anpassung je Gate mit Begründung, nicht durch Abschwächen.
- Harness-Abgleich: ein Ablauf mit qa-Schritt, der nicht lief, zählt qa als „offen“ (vorher „bewusst nicht“) — gewollt.
- `capabilities-ansicht` liest die Vorlagen: Rolle qa ⇒ TEST_DESIGN, in `ressourcen.json` vorhanden (nicht ändern).
- Echtbetrieb: ein qa-Lauf (≈ 1 min) je Runde; erster echter qa-Lauf mit allen vier Eingaben erst in R (F-1116 (7)(8)).

### 7. Anzupassende Prüfungen (Vorabliste)

`src/router/router.test.ts`, `scripts/check-f45-b2b2-pruefer.mjs`; Kandidaten mit echten Vorlagen (einzeln laufen lassen):
`check-f23-abnahme`, `check-f35-ws1-feature-auftrag`, `check-f35-ws3-adjust-automatik`, `check-f39-architekt`,
`check-f652-pruefschritt`, `check-fixpaket-f30-vorbedingungen`, `check-fix-f676-installwurzel`, `check-f22-click-to-work`,
`check-f42-projekt-harness`, `check-fixpaket-f35-reallauf`, `check-f36-ws3/ws5a/ws5b`, `check-f813-csrf`, `check-f814-host`,
`check-f45-b2b1-rueckweg`, `scripts/leitstand-abnahme-stand.test.mjs`, `src/capabilities-ansicht`.

### 8. Doku

`state/findings.md`: F-820 und F-1117 erledigt, F-1114 (6) erledigt, F-1116 (5) (Anzeige-Teil) erledigt, neue Findings ab
F-1118; `docs/projekt/fixpaket-f45.md`: B2b-2b-2 gebaut, B2b-2 abgeschlossen; `docs/STATUS.md`.

### Offene Punkte (nicht stillschweigend entschieden)

- O1: „Lauf-Detail“ im Auftrag (F-1117 (1): `prueferWiederholbar` dort nur für den Advisor). Vorschlag: Detail unverändert,
  weil der qa-Halt wie der Review-Halt in der Abnahme derselben Seite bedient wird; ein zweiter Knopf in den Eingriffen wäre
  doppelt. Alternative: `prueferWiederholbar` im Detail auch für qa und die qa-Notiz in den Eingriffen statt in der Abnahme.
- O2: Der Server-Grund des qa-Halts trägt Kennungen (F-1116 (5)); die Oberfläche zeigt ihn nicht, sondern eine Ursache je
  Status. „Korrekturrunde aufgebraucht“ bei einem BLOCKIERT-Halt an der Grenze zeigt die Oberfläche nur über den Satz zum
  Ausweg — eine strukturierte Halt-Art vom Server ist nicht Teil dieses Baus.
- O3: Zuschnitt — bei „zu groß“ zuerst §3.4 (Harness-Zuordnung) als Finding herausnehmen (Auftrag).

## Advisor-Pass B2b-2b-2 (15.10.2026, frischer Kontext, `architecture-advisor`) und Plan v1.1

Urteil **FREIGEGEBEN_MIT_AUFLAGEN**, Zuschnitt passt (knapp; bei „zu groß“ zuerst den Rollen-Kreis abtrennen, nicht §3.4).
Entlastend belegt: die vier Eingaben lösen für einen qa-Schritt real auf (`loeseSchrittEingabenAuf`), `max_schritte` reicht,
„Prüfer wiederholen“ ist serverseitig fertig, Harness-Zuordnung ist reine Datenänderung, O1 tragbar, kein D5-/F-228-Konflikt.
Eingearbeitet (Delta zu Plan v1):
- **A1 (MITTEL):** Halt am qa bei gültigem qa-Ergebnis (Regel 1q (b)/(c): Review nicht lesbar oder beanstandet an der
  Grenze/Wiederholung) ⇒ ein fester, neutraler Satz für `status ok && halt` (keine Unterscheidung (b)/(c) in der
  Oberfläche, D5): „Der Ablauf hält nach der Prüfung aus Nutzersicht — es gibt keine automatische Korrekturrunde mehr.
  Prüfe die Urteile und wünsche eine Anpassung oder lehne ab.“ Dazu Badge und Befunde, Unit-Test, Render-Folge (c).
- **A2 (MITTEL):** Ursache je Status: FEHLGESCHLAGEN „Das Werkzeug ist ausgefallen.“, VERWEIGERT „Der Lauf wurde
  verweigert.“ (über `schrittStatus` wie beim Review), nicht lesbar/Laufakte fehlt „Das Ergebnis war unvollständig oder
  nicht lesbar.“, nicht gestartet „Sie ist nicht gestartet.“. Ausweg-Satz je Lage (Muster `weiter`/`weiterWiederholbar`):
  wiederholbar ⇒ „… wiederhole sie (zählt nicht als Korrekturrunde), repariere den Ablauf, wünsche eine Anpassung oder
  lehne ab“; nicht wiederholbar ⇒ „… repariere oder starte den Ablauf, wünsche eine Anpassung oder lehne ab“. Beide
  beginnen mit „Ohne Prüfung aus Nutzersicht ist keine Abnahme möglich“ (Auftrag 4, ein Satz).
- **A3 (MITTEL):** Render-Folge (c) „qa BLOCKIERT bei `max_replans` 0“ (Vorab-Block mit qa-Befunden und A1-Satz, kein
  Knopf), de 1440 und de 390; Klicktabelle mit „Befundliste da“ und „Knopf fehlt“.
- **A4 (MITTEL):** „Urteile je Claude-Prüfer · kommt“ in der Review-Kachel wird „Weitere Claude-Prüfer · kommt“ (de/en/ru/tr)
  — qa urteilt jetzt, code-reviewer und design-guardian noch nicht (F-1114 (4) teilweise).
- **A5 (MITTEL), abgewandelt:** Bau-Reihenfolge zuerst Vorlagen + Router-Tests, dann die Kandidaten-Gates aus §7 **einzeln**
  (nicht die volle Kette — Auftrag: `npm run check` genau einmal am Ende); `scripts/leitstand/routen-faehigkeiten.test.mjs`
  in die Liste. Die echte Liste roter Gates steht im Bauabschnitt.
- **A6:** Gate (v1) über `waehleWorkflowVorlage(...)` (eine Ersetzungsstelle); belegt `artefakt:aenderungsuebersicht-<lauf>`
  und `artefakt:ergebnis-<reviewLauf>` in den Anfragen des qa-Laufs; `pruefergebnis-@` belegt der Router-Test (Vorlage).
- **A7:** (v4) prüft nach ANGENOMMEN `entscheidung.bezug.qa_lauf_id` (F-1116 (6) HTTP-Pfad). F-1116 (1)(2) bleiben offen
  (die Abnahme zeigt den Server-Grund nicht).
- **A8:** `vorgewaehlteRolle` wählt die erste laufende Rolle über alle Reiter (Kreis-Rollen, dann Satelliten) — sonst sagt
  die Mitte „qa läuft“ und das Panel zeigt den Builder. Kommentare im Kreis nachziehen. Kein eigener Render-Nachweis des
  Kreises (Unit-Test; Kreis außerhalb der Abnahme-Seite).
- **A9:** ein Name: „Prüfung aus Nutzersicht“ für Karte und Timeline (`rolle.qa`, de/en/ru/tr); im Kreis bleibt das
  Kürzel „qa“ wie die Nachbarn code-reviewer/design-guardian (Subagenten-Namen, Bestand F46).
- **A10:** die in der Projektion gelesene qa-Laufakte geht an `ermittlePrueferBefund` (Muster `reviewVorgelesen`).
- **A11:** O2 präzisiert — die **Abnahme** zeigt den Server-Grund nicht (Liste und Technik-Teil zeigen ihn weiter).
- **A12:** `schwere_bei_bereit` nur bei BEREIT (dieselbe Regel wie beim Review, `zaehleSchwereBeiBereit`) — bewusst,
  abweichend vom Wortlaut von F-1117 (2); bei der Erledigung notieren.
- **A13:** F-1117 (6) dokumentieren (Fixpaket/STATUS): kein Annehmen ohne qa; eine Reparaturfassung kann den
  AUTOMATISCH-qa-Schritt entfernen (`ermittleFreigabeAbschwaechungen` prüft nur ZWINGEND) — `fehlt_im_ablauf` nennt das.

## Bau und Prüfpass B2b-2b-2 (15.10.2026)

- Bau nach Plan v1.1. Reihenfolge (A5, abgewandelt): zuerst Router-Tests rot (Schrittzahl 4 statt 5), dann die Vorlagen
  ⇒ 22/22 grün; danach die Kandidaten aus §7 **einzeln** gegen die neuen Vorlagen: `check-f23-abnahme`,
  `check-f35-ws1-feature-auftrag`, `check-f35-ws3-adjust-automatik`, `check-f39-architekt`, `check-f652-pruefschritt`,
  `check-fixpaket-f30-vorbedingungen`, `check-fix-f676-installwurzel`, `check-f22-click-to-work`, `check-f42-projekt-harness`,
  `check-fixpaket-f35-reallauf`, `check-f36-ws3/ws5a/ws5b`, `check-f813-csrf`, `check-f814-host`, `check-f45-b2b1-rueckweg`,
  `check-f45-b2b2-pruefer`, `leitstand-abnahme-stand.test`, `routen-faehigkeiten.test`, `startvorlage-wahl.test`,
  `capabilities-ansicht.test`, `harness-abgleich.test` — **alle 22 grün, kein Gate angepasst** (keines fährt einen
  standard/hoch-Ablauf bis hinter den Review). Angepasst nur Tests mit Begründung: `router.test.ts` (Schrittzahl, qa-Schritt),
  `rollen-kreis.test.mjs` (Abbildung mit qa; der frühere Fall „Satelliten bleiben offen, auch mit qa-Schritt“ ist durch die
  Entscheidung F-1117 (7) überholt), `rollen-anzeige.test.mjs` (Rollenname „Prüfung aus Nutzersicht“, A9),
  `workflow-abnahme.test.mjs` („Weitere Claude-Prüfer“, A4).
- Rot→grün: Unit-Tests der Anzeige vor der Implementierung rot (fehlender Export), Kreis/Rollenname 3 rot; Gate gegen den
  Server-Stand HEAD rot mit 5 Befunden ((v2)–(v5)), danach grün.
- Prüfpass (frischer Kontext): code-reviewer „Freigegeben mit Hinweisen“, design-guardian „Freigegeben mit Hinweisen“ (kein
  HOCH), qa „Nicht freigegeben“ (laufender qa zeigte „nicht lesbar“; AK 6 noch ohne Beleg).
- Korrekturrunde: Status `laeuft` in der qa-Projektion (code-reviewer 1, qa 1; Gate (v7), Unit), Gate (q5)/(q10) mit
  GET …/abnahme (code-reviewer 3), `ermittlePrueferBefund` liest eine fehlende Laufakte nicht zweimal (code-reviewer 4), bei
  Halt kein „bevor du abnimmst“ und Satz „… startet nicht. Prüfe die Urteile von Review und Prüfung aus Nutzersicht …“ (qa 2),
  Testfälle aufklappbar mit Zahlenzeile + `abgleich-f46.md` qa „U (qa) / K“ mit begründeter Abweichung (design-guardian 1),
  h4 im Vorab-Block ohne letzte Linie (design-guardian 2), kürzerer Blick-Text (design-guardian 3), `kreis.aufgabe.qa`
  (design-guardian 5), ru „Не проверяемо“, Harness-Wortlaut ohne Kennung (qa 7). Render alle 13 Folgen neu.
- Nachpass: code-reviewer, qa und design-guardian je „Freigegeben mit Hinweisen“. Zwei Punkte sind durch die Korrektur neu
  entstanden (MITTEL) und bleiben nach der einen Korrekturrunde offen: `laeuft` auch bei Halt nach einer Stale-Heilung
  (Vorab-Block ohne Ursache) und „Details unten“ zeigt in zwei Lagen in die falsche Richtung — F-1118 (dazu derselbe
  Fehlalarm beim laufenden Review). Übrige Punkte F-1119.
