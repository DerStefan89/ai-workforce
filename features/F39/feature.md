# F39 — Architektur-Rolle „architekt"

## ID

F39

## Titel

Architektur-Rolle „architekt" (Rollenvertrag + Schema + Gate, WS-1; hoch-Kette + Herkunftsfeld + Ergebnis-Weitergabe, WS-2a; Fortsetzungsweg für Entscheidungen, WS-2b; Projektmodus „Architektur-Grundlage", WS-3)

## Status

Status: IN_ARBEIT

Gültige Status-Werte (geprüft vom Gate, siehe A3a–e in
`features/AF-F001/feature.md`): `ENTWURF, READY_FOR_TECH,
WORKSTREAM_SCHNITT_GENEHMIGT, IN_ARBEIT, FEATURE_GATE, ABGESCHLOSSEN,
BLOCKIERT, ABGEBROCHEN`.

## Ziel

Eine vierte Autor-Rolle `architekt`, die VOR dem Bau einen
Architekturentwurf liefert — Modulschnitt, ADR-Entwürfe, Schema-Entwürfe
und offene Grundsatzentscheidungen mit Abwägung —, ohne selbst Code zu
schreiben oder zu lesen (`ausschlussmuster: ['src/**']`, Muster
`product-coach`/`jarvis`/`router`). Prüfer bleibt die bestehende Workforce-
Rolle `architecture-advisor` (`src/rollen/index.ts`, Schritt 1 in
`workflow-vorlagen/hoch.json`, Worker `codex`) — NICHT zu verwechseln mit
dem gleichnamigen Harness-Subagenten unter `.claude/agents/` (drei
verschiedene Dinge trotz teils identischem Namen, siehe
`docs/harness/HARNESS-GLOSSARY.md`, F-522). Grundlage:
`docs/projekt/zielfassung.md` §13.6, E-M5-3′ (claude-Challenge 20.09.2026)
und E-M5-13 (22.09.2026 — F39 vor F35 gezogen, zusätzlicher Projektmodus
„Architektur-Grundlage").

## Nicht-Ziele

- **Kein Schreibpfad für `docs/adr/*.md`.** Der Architekt liefert einen
  geprüften ADR-*Entwurf* im JSON-Ergebnis; das tatsächliche Schreiben
  einer ADR-Datei bleibt einem Folgeauftrag/WS-3 vorbehalten (Muster
  `product-coach`: `baueAuftragAusProjektentwurf` schreibt auch erst nach
  einem separaten "Als Auftrag anlegen"-Schritt).
- **Kein Fortsetzungsweg für `entscheidungen_mensch` (Regel 1c/haltKlaerung)
  in WS-2a.** `entscheidungen_mensch[]` wird von `architekt` geliefert und
  über `ergebnis-@<schritt>` an Folgeschritte weitergereicht, aber NICHT
  ausgewertet — kein neuer Automaten-Ausgang, kein UI-Weg, eine offene
  Entscheidung bleibt bloßer Text im Kontext des nächsten Schritts. Das ist
  WS-2b-Scope (F-632 Teil b bleibt dafür offen, siehe „Findings").
- **Kein Projektmodus „Architektur-Grundlage" in WS-1/WS-2a** — das Ausgabeschema
  trägt `modus: 'feature'|'projekt'` bereits jetzt (E-M5-13 verlangt beide
  Werte in der Wertemenge), aber eine eigene, ausgearbeitete
  Projekt-Rolleninstruktion mit realem Nachweis ist WS-3-Scope (Muster
  `product-coach` F34 WS-1 → WS-3).
- **Keine `vergebeFeatureIds`-Analogie** für `module[].abhaengigkeiten` —
  reiner Freitext (Modulname als String), keine ID-Auflösung wie bei
  `product-coach`s `abhaengig_von_titel`. Neu zu bewerten, falls ein Modul-
  Graph später maschinell weiterverarbeitet werden soll.
- **Keine Duplizierung der Capability-Auszug-Logik.** `baueCapabilityAuszug`
  wird aus `src/product-coach/` importiert (E-M5-13: Coach und Architekt
  teilen sich dieselbe Capability Library, F36).
- **Kein Eintrag in `scripts/check-datenformate.mjs`** — bewusste Abweichung
  von der Auftrags-Formulierung Punkt 2, siehe „Entschieden".

## Workstreams

- **WS-1 — Rolle + Schema + Gate (dieser Auftrag).** Rolle `architekt` in
  `src/rollen/index.ts` (lesend, beide Worker, eigenes Ausgabeschema
  `ergebnis-architektur`, `ausschlussmuster: ['src/**']`, Muster
  `product-coach`). `schemas/ergebnis-architektur.schema.json` (Codex-
  Dialekt, F-423-Muster) + acht Beispiele unter `schemas/examples/`.
  `src/architekt/` (`validiereErgebnisArchitektur`,
  `baueArchitektAuftragstext`, `baueCapabilityAuszug` aus `src/product-coach/`
  reexportiert). Gate `scripts/check-f39-architekt.mjs`, in `npm run check`
  eingehängt.
- **WS-2a — hoch-Kette, Herkunftsfeld, Ergebnis-Weitergabe (dieser
  Auftrag).** `workflow-vorlagen/hoch.json` bekommt `architekt` als neuen
  Schritt 1 (`schritt-1-architekt`, lesend, Worker `codex`, Modell
  `gpt-6-astra`, `output_schema: 'ergebnis-architektur'`,
  `freigabe: ZWINGEND`) VOR der bestehenden Workforce-Rolle
  `architecture-advisor` (rückt zu Schritt 2, `schritt-2-architektur`, Worker
  `claude-code`, Modell `claude-sonnet-5`, `output_schema: null` — Autor
  zuerst, dann Prüfer, auf verschiedenen Modellen, siehe „Entschieden");
  `ausfuehrung`/`code-reviewer` rücken zu Schritt 3/4. Neuer Eingabe-Platzhalter `ergebnis-@<schrittId>`
  (`loeseSchrittEingabenAuf`, `scripts/leitstand-server.mjs`) — liefert das
  Laufergebnis (strukturiertes Output-Artefakt bzw. roher Ergebnistext,
  `leseErgebnistextAusRohstrom`) des referenzierten, abgeschlossenen
  Schritts, dieselben drei Schutzregeln wie beim bestehenden
  `aenderungsuebersicht-@` (Selbstverweis, unbekannte `schritt_id`, nicht
  gestartet); `architecture-advisor` bekommt `ergebnis-@schritt-1-architekt`,
  `ausfuehrung` bekommt beide Vorschritt-Ergebnisse. Optionales
  Herkunftsfeld `AuftragV0Daten.herkunft: { art }` (additiv,
  `src/auftrag/types.ts`), gesetzt über die Chat→Auftrag-Brücke
  (`leseAuftragKandidat`, `views/chat.js`: `projekt_entwurf` →
  `'projekt_interview'`, `scope_entwurf` → `'sparring'`, Jarvis'
  `auftrag_vorschlag` → `'jarvis'`) und optional in `POST /api/auftraege`
  (`pruefeAuftragsformular`). Deterministische Kontrolltiefe-Untergrenze
  (`bestimmeEffektiveKontrolltiefe`, `src/router/index.ts`): `herkunft.art
  === 'projekt_interview'` hebt die vom Router vorgeschlagene Kontrolltiefe
  auf mindestens `hoch` an (nie senken), sichtbar vermerkt in
  `workflow.ziel`. Neue Router-Rolleninstruktion (`baueRouterAuftragstext`)
  mit der Auslöserliste für `hoch` aus der Auftrags-Vorgabe.
- **WS-2b — Fortsetzungsweg für `entscheidungen_mensch` (dieser Auftrag,
  löst F-632 Teil b).** Regel 1c in `ermittleNaechstenSchritt`
  (`src/workflow/index.ts`, nach Regel 1b, gekoppelt an output_schema
  `ergebnis-architektur` wie Regel 1b an `ergebnis-code-reviewer`): a)
  `validiereErgebnisArchitektur` lehnt das Ergebnis ab → `haltKlaerung`
  mit den benannten Verstößen; b) sonst mindestens eine offene Frage in
  `entscheidungen_mensch[]` UND noch keine erfasste Entscheidung →
  `haltKlaerung` („Architektur-Entscheidung erforderlich"); c) sonst (Liste
  leer, oder Entscheidung bereits erfasst) fortsetzen wie ohne dieses
  output_schema — idempotent, kein erneuter Halt nach einer eingetragenen
  Entscheidung. Reine Funktion: der Aufrufer (`scripts/leitstand-server.mjs`)
  validiert das Ergebnis und fragt die neue Kernartefakt-Kette ab, reicht
  drei normalisierte, optionale Felder auf `SchrittErgebnis` durch
  (`architekturVerstoesse`, `architekturEntscheidungAusstehend`,
  `architekturAnzahlFragen`) — `src/workflow` bleibt abhängigkeitsarm.
  Eigene Kernartefakt-Kette `workflow-entscheidung-<workflowId>`
  (`scripts/leitstand/routen-f39.mjs`, Payload-Form
  `schemas/kontrollzustand-architektur-entscheidung-payload.schema.json`,
  Validator `src/workflow-entscheidung/index.ts`) — bewusst NICHT als
  siebter `art`-Wert auf der bestehenden `schemas/kontrollzustand-
  entscheidung-payload.schema.json`-Kette angelehnt (strukturell
  inkompatibel: jene trägt je `art` genau EIN `ergebnis` aus einer
  geschlossenen Wertemenge, hier antwortet eine Payload auf N Fragen mit N
  frei gewählten Optionen — siehe Begründung im Kopfkommentar von
  `src/workflow-entscheidung/types.ts`). Fortsetzungsweg `POST
  /api/workflows/<id>/entscheidung` (reine Formprüfung in
  `scripts/leitstand/routen-f39.mjs`, Server registriert nur — D13-
  Sperre/Automatenpfad wie bei `.../freigabe`): prüft Status +
  `aktiver_schritt_id`, dass der referenzierte Architektur-Lauf selbst
  gültig ist und offene Fragen trägt, und über `pruefeAntwortenGegenFragen`
  (`src/workflow-entscheidung/index.ts`) jede Frage genau einmal beantwortet
  mit einer gelisteten Option; speichert die Entscheidung und setzt danach
  über denselben Automatenpfad fort (`ermittleNaechstenSchritt` erneut, mit
  `architekturEntscheidungAusstehend: false`) — ein ZWINGEND-Folgeschritt
  landet auf `WARTET_FREIGABE`, kein Auto-Start. Neuer Eingabe-Platzhalter
  `entscheidung-@<schrittId>` (`loeseSchrittEingabenAuf`, dieselben drei
  Schutzregeln wie `ergebnis-@`): liefert die erfasste Entscheidung als
  Text; war `entscheidungen_mensch[]` leer, liefert er einen leeren
  Hinweistext statt einer Startsperre. `workflow-vorlagen/hoch.json`
  versorgt `architecture-advisor` UND `ausfuehrung` zusätzlich mit
  `entscheidung-@schritt-1-architekt`. Leitstand-UI
  (`public/leitstand/views/workflows.js`): additives Feld
  `architekturEntscheidung` an `GET /api/workflows/<id>` (nur gefüllt,
  solange Regel 1c real hält), Fragen mit Optionen (Vor-/Nachteile, die
  Empfehlung des Architekten hervorgehoben) als Radio-Auswahl, optionale
  eigene Begründung je Frage, „Entscheidung speichern". Render-Nachweis
  (Fixture-Workflow, kein LLM) unter `features/F39/nachweis-ws2b-ui/` belegt
  den echten Übergang KLAERUNG_ERFORDERLICH → WARTET_FREIGABE inkl. Reload.
  D13: vierter geschützter Automaten-Startpfad neben Startendpunkt/Auto-
  Fortsetzung/Freigabe-Endpunkt — die AK6b/AK7-Kalibrierzählungen in
  `scripts/check-f15-workflow.mjs` (Aufrufstellen von
  `starteWorkflowSchritt`/`schreibeWorkflowFortschritt`, `.eingefroren`-
  Lesestellen, `D13-UEBERGABE-OHNE-FENSTER`-Bereiche) sind entsprechend
  angehoben, nicht aufgeweicht. Geprüft in `scripts/check-f39-architekt.mjs`
  (i)–(m).
- **WS-3 — Projektmodus „Architektur-Grundlage" (nicht in diesem Auftrag).**
  Optionale technische Akte-Abschnitte in `check-feature.mjs`, reale
  ADR-Erzeugung, realer `hoch`-Durchlauf mit einem Erweiterungs-
  Projektauftrag (Muster F34 WS-3 Projekt-Interview).

Projektmodus ist ein Workflow-Schritt, kein eigener Chat (anders als
`product-coach`s Sparring — `architekt` läuft als Schritt einer
`WORKFLOW_V0`-Kette, nicht als interaktiver Dialog).

## Akzeptanzkriterien

- **AK1** *(WS-1)* — `ROLLENVERTRAEGE.architekt` trägt alle fünf
  Vertragsfelder (`erlaubte_werkzeugsatz_arten: ['lesend']`,
  `erlaubte_worker: ['claude-code', 'codex']`, `erlaubtes_output_schema:
  'ergebnis-architektur'`, `ausschlussmuster: ['src/**']`,
  `benoetigte_capabilities`) — Muster `product-coach`. `bekannteRollen()`
  liefert neun Rollen; `istBekannteRolle('planner')` bleibt `false`
  (negativ gepinnt, `src/rollen/rollen.test.ts`).
- **AK2** *(WS-1)* — `schemas/ergebnis-architektur.schema.json` im
  Codex-Dialekt (F-423, kein `oneOf`/`allOf`/`if`, jede `properties`-
  Eigenschaft in `required` — auch verschachtelt —, `additionalProperties:
  false`) — Felder `modus` (`feature`/`projekt`), `zusammenfassung`,
  `module[]`, `adr_entwuerfe[]`, `schema_entwuerfe[]`,
  `entscheidungen_mensch[]`, `capabilities_bedarf[]`, `evidenz[]`. Anders
  als `ergebnis-product-coach.schema.json` gibt es keinen `art`-
  Diskriminator — jeder Lauf liefert dieselbe feste Form, ein Array bleibt
  leer statt `null`, wenn seine Kategorie nichts beiträgt.
  `schema_entwuerfe[].json_schema` ist ein bewusst opakes Objekt ohne
  eigenes `properties` (kein Codex-Dialekt-Zwang auf ein vom Architekten
  selbst entworfenes Fragment).
- **AK3** *(WS-1)* — `validiereErgebnisArchitektur`
  (`src/architekt/index.ts`) akzeptiert beide gültigen Beispiele, lehnt
  jede der fünf Kopplungsverletzungen einzeln benannt ab (unbekannter
  `modus`, fehlendes Pflichtfeld, fehlendes Modul-Feld, leeres
  `evidenz`-Array, eine `empfehlung`, die keine gelistete Option nennt) —
  Rot-/Grünfall-Paare, `src/architekt/architekt.test.ts`. Eine erfundene
  `capabilities_bedarf[].ressource_id` ist nur ein Verstoß, wenn
  `bekannteRessourcenIds` übergeben wird (Muster `validiereErgebnisProductCoach`).
- **AK4** *(WS-1)* — `baueArchitektAuftragstext(planungstext, modus,
  capabilityAuszug)` liefert die Rolleninstruktion (Autor-, nicht
  Prüfrolle; Evidenz-Marker-Pflicht im `evidenz`-Array; JSON-only-Vertrag,
  F-337-Lehre) plus optionalen Capability-Auszug (nur Modus `projekt`, nur
  wenn gesetzt) plus den Planungstext. Default-Modus `feature`.
- **AK5** *(WS-1)* — `scripts/check-f39-architekt.mjs` prüft: Rollenvertrag-
  Form (a), Rot-/Grünfall gegen `loeseAusfuehrungsEingabenAuf` real — eine
  vertragswidrige Besetzung (`architekt` + `schreibend`) wird vor jedem
  Workerstart abgehalten, eine vertragskonforme angenommen (a2),
  Schema-Beispiele gegen den Validator (b), Codex-Dialekt-Scan (b2),
  Validator-Kopplungen (b3), `baueArchitektAuftragstext`-Form (c).
  `process.exitCode` statt `process.exit()` (Muster
  `check-f17-rollenvertrag.mjs`). In `npm run check` eingehängt.
- **AK6** *(WS-1)* — `docs/harness/HARNESS-GLOSSARY.md` klärt die
  Verwechslungsgefahr zwischen DREI verschiedenen Dingen (F-522, korrekt
  aufgelöst — nicht zwei): (1) dem Harness-Subagenten `architecture-advisor`
  (`.claude/agents/`, Claude-Code-Subagent dieser Sitzung, prüft Pläne
  außerhalb jeder `WORKFLOW_V0`-Kette), (2) der Workforce-**Rolle**
  `architecture-advisor` (`src/rollen/index.ts`, lesend, `output_schema:
  null`) — das ist der reale Prüfer im `hoch`-Workflow, Schritt 1 in
  `workflow-vorlagen/hoch.json` mit Worker `codex` — und (3) der neuen
  Workforce-Rolle `architekt` (Autor, `src/rollen/index.ts`), die in F39
  WS-2a als Schritt VOR (2) eingehängt wird.
- **AK7** *(WS-2a)* — `workflow-vorlagen/hoch.json` trägt vier Schritte in
  der Reihenfolge `architekt` → `architecture-advisor` → `ausfuehrung` →
  `code-reviewer`; `aktiver_schritt_id` zeigt auf den `architekt`-Schritt;
  `grenzen.max_schritte` (weiterhin 8) deckt alle vier Schritte mit
  Marge; `architecture-advisor` referenziert
  `ergebnis-@schritt-1-architekt`, `ausfuehrung` referenziert BEIDE
  Vorschritt-Ergebnisse; `workflow-vorlagen/fast-lane.json` bleibt
  unverändert ohne `architekt`-Schritt. Geprüft in
  `scripts/check-f39-architekt.mjs` (f)/(h).
- **AK8** *(WS-2a)* — der Eingabe-Platzhalter `ergebnis-@<schrittId>`
  (`loeseSchrittEingabenAuf`) lehnt dieselben drei Rot-Fälle ab wie das
  bestehende `aenderungsuebersicht-@` (Selbstverweis, unbekannte
  `schritt_id`, `lauf_id: null`/nicht gestartet) und löst im Grünfall real
  gegen eine registrierte Laufakte auf — strukturiertes JSON wird
  formatiert übernommen, ein reiner Prosa-Ergebnistext (z. B.
  `architecture-advisor`, `output_schema: null`) unverändert. Geprüft in
  `scripts/check-f39-architekt.mjs` (g1)–(g4), direkt gegen die reine
  Funktion (kein HTTP-Server nötig, Muster `check-f23-abnahme.mjs` (b)).
- **AK9** *(WS-2a)* — `bestimmeEffektiveKontrolltiefe`/`waehleWorkflowVorlage`
  (`src/router/index.ts`) heben die Kontrolltiefe NUR bei `herkunft.art ===
  'projekt_interview'` auf mindestens `hoch` an, senken nie, und lassen
  jeden Auftrag ohne (oder mit einer anderen) Herkunft bitgenau unverändert
  — real geprüft inkl. des Ladens der tatsächlichen `hoch.json`-Datei bei
  einer Anhebung. Die Anhebung wird sichtbar in `workflow.ziel` vermerkt
  (`[Untergrenze hoch wegen herkunft projekt_interview]`).
  `AuftragV0Daten.herkunft` ist additiv/optional
  (`validiereAuftragHerkunft`, `src/auftrag/index.ts`, dieselbe Prüfung für
  `AuftragV0Daten` UND `POST /api/auftraege`); ein Alt-Auftrag ohne das
  Feld bleibt gültig. Geprüft in `scripts/check-f39-architekt.mjs`
  (d)/(e1)/(e2) und `scripts/check-f11-auftrag.mjs` (a, zwei neue
  Payload-Fixturen).

- **AK10** *(WS-2b)* — Regel 1c in `ermittleNaechstenSchritt`
  (`src/workflow/index.ts`), gekoppelt an output_schema `ergebnis-
  architektur`: ein Verstoß gegen `validiereErgebnisArchitektur` hält mit den
  benannten Verstößen an; eine offene, unbeantwortete Frage in
  `entscheidungen_mensch[]` hält mit „Architektur-Entscheidung erforderlich"
  an; eine leere Liste oder eine bereits erfasste Entscheidung setzt
  unverändert bis Regel 5 fort (Idempotenz) — ein Schritt ohne dieses
  output_schema bleibt bitgenau unverändert (Regression). Rot-/Grünfälle in
  `src/workflow/workflow.test.ts` und `scripts/check-f39-architekt.mjs` (i).
- **AK11** *(WS-2b)* — `POST /api/workflows/<id>/entscheidung` (reine
  Formprüfung `pruefeWorkflowEntscheidungsformular` in `scripts/leitstand/
  routen-f39.mjs`, Kreuzprüfung `pruefeAntwortenGegenFragen` in
  `src/workflow-entscheidung/index.ts`) lehnt einen falschen
  Status/`aktiver_schritt_id` (409), eine unbeantwortete Frage (400) und
  eine erfundene Option (400) ab; ein gültiger Aufruf registriert die
  Entscheidung auf `workflow-entscheidung-<workflowId>` und setzt den
  Workflow über `ermittleNaechstenSchritt` real auf `WARTET_FREIGABE` fort
  (ZWINGEND-Folgeschritt, kein Auto-Start); ein zweiter Versuch nach
  bereits erfasster Entscheidung findet keine offene Klärung mehr
  (Idempotenz). D13-geschützt wie `.../freigabe`. Geprüft real gegen einen
  Testserver in `scripts/check-f39-architekt.mjs` (j)/(j0).
- **AK12** *(WS-2b)* — der Eingabe-Platzhalter `entscheidung-@<schrittId>`
  lehnt dieselben drei Rot-Fälle ab wie `ergebnis-@` (Selbstverweis,
  unbekannte `schritt_id`, nicht gestartet); im Grünfall liefert er die
  real registrierte Entscheidung formatiert, ohne registrierte Entscheidung
  einen leeren Hinweistext statt einer Startsperre. `workflow-vorlagen/
  hoch.json` versorgt `architecture-advisor` und `ausfuehrung` damit.
  Geprüft in `scripts/check-f39-architekt.mjs` (k).
- **AK13** *(WS-2b)* — Leitstand-UI (`public/leitstand/views/workflows.js`):
  additives Feld `architekturEntscheidung` an `GET /api/workflows/<id>`
  (geprüft in `scripts/check-f39-architekt.mjs` (m)), Fragen mit Optionen
  (Vor-/Nachteile, Empfehlung hervorgehoben) als Radio-Auswahl, optionale
  eigene Begründung, „Entscheidung speichern"; HTML-Escaping aller
  Architekt-Texte (`escapeHtml`, Muster der übrigen Bedienblöcke).
  Render-Nachweis (Fixture-Workflow, kein LLM,
  `features/F39/nachweis-ws2b-ui/`) belegt den echten Übergang
  KLAERUNG_ERFORDERLICH → WARTET_FREIGABE inkl. Reload.

## Entschieden

Claude, 23.09.2026, F39 WS-2b (löst F-632 Teil b):

- **Kein siebter `art`-Wert auf `schemas/kontrollzustand-entscheidung-
  payload.schema.json`** für die Architektur-Entscheidung — vor dem Bau
  gegrept (CLAUDE.md „vorher nach bestehenden Helfern/Regeln greppen"):
  `src/entscheidung/index.ts`/`-types.ts` decken sechs Workflow-
  Lebenszyklus-Entscheidungen ab (`freigabe`/`stopp`/`planaenderung`/
  `terminal`/`kenntnisnahme`/`abnahme`), jede mit GENAU EINEM `ergebnis`
  aus einer geschlossenen, art-eigenen Wertemenge, gekoppelt an
  `herkunft.schritt`. Eine Architektur-Entscheidung beantwortet dagegen N
  Fragen aus `entscheidungen_mensch[]` auf einmal, mit je einer frei
  gewählten Option statt eines der sechs fixen `ergebnis`-Werte — eine
  Erweiterung hätte `ergebnis` auf ein Array umgebaut und damit die
  bestehenden sechs `additionalProperties: false`-Zweige gebrochen. Eigene,
  kleine Kette (`workflow-entscheidung-<workflowId>`,
  `src/workflow-entscheidung/`) statt eine etablierte Form zu verbiegen
  (CLAUDE.md-Entscheidungsregel 5, dokumentiert statt stillschweigend
  abgewichen).
- **Regel 1c prüft `validiereErgebnisArchitektur` (volle Schemakonformität),
  nicht nur EIN semantisches Feld wie Regel 1b** — anders als bei
  `ergebnis-code-reviewer` (Regel 1b prüft ausschließlich `urteil` gegen
  eine Wertemenge) gibt es für `ergebnis-architektur` kein gleichwertig
  einzelnes, automaten-relevantes Feld außer `entscheidungen_mensch[]`
  selbst — und dessen Auswertung IST der Zweck von WS-2b. Die volle
  Validierung war in WS-2a ausdrücklich als „keine neue Automaten-Regel"
  zurückgestellt (siehe WS-2a-Eintrag unten) — WS-2b liefert genau das
  nach, weil es jetzt der eigene Auftrag ist, nicht eine stillschweigende
  Erweiterung eines fremden.
- **`architekturVerstoesse`/`architekturEntscheidungAusstehend`/
  `architekturAnzahlFragen` als drei zusätzliche optionale
  `SchrittErgebnis`-Felder statt eines verschachtelten Objekts** — Muster
  `urteil` (Regel 1b): `src/workflow` bleibt abhängigkeitsarm und
  importiert weder `validiereErgebnisArchitektur` noch die neue
  Entscheidungs-Kette; der Aufrufer normalisiert vollständig vorab.

Stefan, 23.09.2026 (WS-2a-Korrektur), Auftrags-Vorgabe für F39 WS-2a:

- **`schritt-1-architekt` (Rolle `architekt`) trägt `worker: 'codex'` +
  `output_schema: 'ergebnis-architektur'`; `schritt-2-architektur` (Rolle
  `architecture-advisor`) trägt `worker: 'claude-code'` +
  `output_schema: null`** — Korrektur der vorherigen Fassung dieses
  Eintrags (die stattdessen `architekt` auf `claude-code` beließ und
  `output_schema` auf `null` abweichen ließ). Weiterhin real geprüft gegen
  `src/workflow/index.ts` Regel 4b: sie hält jeden Workflow-Schritt mit
  `worker: 'claude-code'` UND gesetztem `output_schema` strukturell an
  (`haltKlaerung`, VOR jedem Workerstart), weil `claude-code` keinen
  `--output-schema`-Mechanismus kennt — `codex` dagegen löst ein
  Ausgabeschema real über `--output-schema` ein (F16 WS-3a). Der Tausch
  erfüllt damit sowohl die ursprüngliche Vorgabe
  (`architekt` liefert strukturiertes `ergebnis-architektur`-JSON, gegen
  `validiereErgebnisArchitektur` prüfbar) als auch Regel 4b, ohne
  `output_schema` auf `null` absenken zu müssen. Autor (`architekt`,
  `codex`/`gpt-6-astra`, wie der vorherige `schritt-2-architektur`) und
  Prüfer (`architecture-advisor`, `claude-code`/`claude-sonnet-5`, wie
  `ausfuehrung`) bleiben dabei auf verschiedenen Modellen — kein
  Selbst-Review. `ergebnis-@schritt-1-architekt` liest den Ergebnistext
  ohnehin worker-/schema-unabhängig (`leseErgebnistextAusRohstrom`, AK8):
  ein reiner Prosa-Ergebnistext (`architecture-advisor`) wird genauso
  weitergereicht wie strukturiertes JSON (`architekt`). Dokumentiert statt
  stillschweigend abgewichen (CLAUDE.md-Entscheidungsregel 5).
- **Keine neue Automaten-Regel, die `architekt`s Codex-Ergebnis gegen
  `validiereErgebnisArchitektur` prüft und bei Verstoß `haltKlaerung`
  auslöst** (Muster Regel 1b/`ergebnis-code-reviewer`,
  `src/workflow/index.ts`) — real geprüft: eine solche Regel existiert für
  `architekt` nicht und wurde in WS-2a nicht gebaut. Regel 1b selbst prüft
  ausdrücklich nur EIN semantisches Feld (`urteil` gegen eine
  Wertemenge), keine vollständige Schema-Konformität; eine Analogie für
  `architekt` bräuchte ein gleichwertig einzelnes, automaten-relevantes
  Feld — das ist `entscheidungen_mensch[]`, dessen Auswertung (Regel 1c)
  bereits als „Nicht-Ziel" dieser Fassung benannt und nach WS-2b verschoben
  ist (F-632 Teil b). Eine volle Strukturprüfung (Pflichtfelder, `evidenz`
  nicht leer, `empfehlung` nennt eine echte Option) HIER einzuhängen wäre
  eine neue, in keiner AK dieser Fassung vorgesehene Automaten-Regel und
  würde WS-2a stillschweigend um WS-2b-Scope erweitern. Basisschutz besteht
  bereits ohne neue Regel: `codex` mit gesetztem `output_schema` erhält
  `--output-schema` am Argv; liefert das Modell dazu kein valides
  JSON-Objekt, klassifiziert `src/result-evaluator/index.ts`
  (`ermittleErgebnisCodex`) den Lauf als `FEHLGESCHLAGEN`
  (`ergebnis_nicht_schemakonform`), und die bereits bestehende Regel 1 in
  `ermittleNaechstenSchritt` hält bei jedem nicht-`ERFOLGREICH`-Ausgang mit
  `haltKlaerung` an — geprüft nur auf „ist es ein JSON-Objekt", nicht auf
  volle Schema-Konformität (`istJsonObjekt`-Kommentar,
  `src/result-evaluator/index.ts`, bewusst). Offene Frage für einen
  künftigen Auftrag statt stillschweigend entschieden.
- **`ergebnis-@<schrittId>` liest den extrahierten Ergebnistext (roh oder
  als formatiertes JSON), nicht die vollständige Laufakte** — die
  Laufakte trägt Metadaten (Worker, `modell_beobachtet`,
  `permission_denials`, Rohstrom-Referenz), die für den Folgeschritt kein
  nützlicher Kontext sind; nur die tatsächliche Modellantwort ist es
  (Muster: `leseRollenErgebnisRohstrom` extrahiert für Router/Scout/
  Code-Reviewer ebenso nur den Ergebnistext, nicht die Laufakte).
- **Kein neues, separat registriertes `ergebnis-<laufId>`-Kernartefakt** —
  `ergebnis-@<schrittId>` löst zur Startzeit direkt gegen die bereits
  IMMER vorhandene `laufakte-<lauf_id>` auf (jeder abgeschlossene Lauf
  registriert sie) und extrahiert daraus, statt (wie
  `aenderungsuebersicht-@`) einen zusätzlichen, nur bedingt registrierten
  Artefakttyp zu verlangen — funktioniert dadurch für JEDEN Schritt, auch
  einen lesenden ohne `output_schema`.
- **`herkunft` lebt in `Optionen` (`registriereAuftrag`s letzter
  Parameter), nicht als eigenes Positionsargument** — jeder bestehende
  Aufrufer übergibt an dieser Stelle bereits ein Objektliteral;
  ein neues Positionsargument VOR `optionen` hätte jeden bestehenden
  Aufruf (`{ basisVerzeichnis }` als `herkunft` gelesen) stillschweigend
  gebrochen.

Stefan, 23.09.2026, Auftrags-Vorgabe für F39 WS-1:

- **Kein Eintrag in `scripts/check-datenformate.mjs`** (Abweichung von der
  ursprünglichen Formulierung „+ Eintrag in check-datenformate.mjs"):
  gegrept vor dem Bau (CLAUDE.md „vorher nach bestehenden Helfern/Regeln
  greppen") — `check-datenformate.mjs` prüft laut eigenem Kopfkommentar
  ausschließlich `profiles/*.json` und `kontrollzustand/*.json`/`*.jsonl`
  gegen `schemas/profile.schema.json`/`schemas/kontrollzustand.schema.json`;
  kein Rollen-Ausgabeschema (`ergebnis-jarvis`, `ergebnis-router`,
  `ergebnis-scout`, `ergebnis-product-coach`) ist dort je registriert
  worden. Jedes davon prüft sich stattdessen selbst in seinem eigenen
  Feature-Gate (`check-f26-jarvis.mjs`, `check-f34-product-coach.mjs`, hier
  `check-f39-architekt.mjs`, Abschnitt (b)/(b2)). Ein Eintrag in
  `check-datenformate.mjs` hätte diese etablierte Modulgrenze verletzt
  (F-591: keinen dokumentierten Schutzwert absenken — hier zusätzlich:
  keinen etablierten Zuschnitt unbegründet aufweichen). Dokumentiert statt
  stillschweigend abgewichen (CLAUDE.md-Entscheidungsregel 5).
- Rollenregister-Eintrag als TypeScript-Konstante wie jede andere Rolle
  (F17-Präzedenz), keine Sonderform für `architekt`.
- `entscheidungen_mensch` statt eines generischen `fragen`-Feldes — trägt
  strukturiert Optionen mit Vor-/Nachteilen, Auswirkung auf den Bestand,
  Empfehlung und Begründung, näher an einer tatsächlich entscheidbaren
  Frage als ein Freitext-Fragenfeld.

## Bestandsaufnahme (nur berichtet, nicht gebaut — Auftrags-Vorgabe)

**Frage 1: Gibt es im Leitstand einen Weg, bei `KLAERUNG_ERFORDERLICH` eine
Entscheidung einzutragen und den Workflow fortzusetzen?**

`[Fakt]` Auf **Lauf-Ebene** ja: F13 (`entscheideStale`/`importiereAntwort`,
`src/human-transport/index.ts`) plus ein geführtes, aus dem Vorgängerlauf
vorbelegtes Wiederaufnahme-Formular im Leitstand — ein neuer Lauf mit neuer
`laufId` und `vorgaengerLaufId` wird gestartet (F8 WS-2b).

`[Fakt]` Auf **Workflow-Ebene** nein, jedenfalls nicht als "Entscheidung
eintragen und automatisch fortsetzen": `POST /api/workflows` lehnt eine
bestehende `workflow_id` nur dann mit 409 ab, wenn ihr Status in
`GESPERRTE_ERSETZUNGS_STATUS` (`LAEUFT`, `WARTET_FREIGABE`,
`ABGESCHLOSSEN`) steht (`scripts/leitstand-server.mjs` ~Z. 1562) —
`KLAERUNG_ERFORDERLICH` ist ausdrücklich Teil der **ersetzbaren** Menge
(`ERSETZBARE_STATUS_TEXT`). Der einzige real verdrahtete Weg aus einem
`KLAERUNG_ERFORDERLICH`-Workflow heraus ist damit: eine **komplette,
korrigierte Fassung** desselben Workflows erneut per `POST /api/workflows`
einreichen (Replan) — keine strukturierte "Entscheidung", die als Eingabe
in denselben, bereits laufenden Schritt einfließt.

`[Schlussfolgerung]` Das deckt sich mit der PlanV1-Grundannahme (E-M5-3:
`AusfuehrungsEingaben.auftragstext` ist der EINZIGE Eingabekanal eines
Schritts, F-269-Muster) — ein Schritt kennt keinen zweiten, nachträglich
eingespeisten Entscheidungskanal. Ein Ergebnis der Rolle `architekt` mit
gefüllten `entscheidungen_mensch[]` hat damit strukturell KEINEN Weg,
zurück in den NÄCHSTEN Schritt derselben Kette zu fließen — genau der
Befund, den PROCESS_IMPROVEMENT-Finding F-632 unten festhält.

**Frage 2: Hat ein Auftrag heute ein strukturiertes Herkunftsfeld?**

`[Fakt]` Nein. `AuftragV0Daten` (`src/auftrag/types.ts`) trägt genau fünf
Felder: `auftrag_schema`, `auftrag_id`, `titel`, `auftragstext`,
`erstellt_am` — kein `herkunft`/`quelle`/`ursprung`-Feld. (Zum Vergleich:
`Ressource.herkunft` in `src/ressourcen/types.ts` ist ein anderes,
unverwandtes Konzept — Herkunft einer *Ressource*, nicht eines
*Auftrags*.) Ein aus F34s `baueAuftragAusProjektentwurf` erzeugter Auftrag
ist von einem manuell im Leitstand angelegten oder einem Jarvis-
Auftragsvorschlag auf Datenebene nicht unterscheidbar — nur der
Auftragstext-*Inhalt* (Abschnitt "Auftrag an den Baudurchgang") verrät die
Herkunft, kein strukturiertes Feld.

`[Schlussfolgerung]` Ein künftiger Router/eine künftige `hoch`-Untergrenze
kann eine Herkunft heute nur über Textmuster (z. B. einen Titel-Präfix)
erraten — genau der in der Auftrags-Vorgabe als Nicht-Weg benannte Ansatz.
Ohne ein strukturiertes Feld bleibt jede Kontrolltiefe-Untergrenze an das
LLM-Urteil des Routers gebunden — Grundlage für TECH_DEBT-Finding F-633
unten.

## Findings

`state/findings.md`:

- **F-632** (`PROCESS_IMPROVEMENT`, P2) — **erledigt** (WS-2a + WS-2b):
  Advisor-/Architekt-Ergebnisse erreichen den nächsten Schritt derselben
  Kette (`ergebnis-@<schrittId>`, AK8, WS-2a) — `architecture-advisor`
  sieht `architekt`s Entwurf, `ausfuehrung` sieht beide. Seit WS-2b (AK10–
  AK13) wertet Regel 1c `entscheidungen_mensch[]` real aus (`haltKlaerung`
  bei Verstoß oder offener Frage) und `POST /api/workflows/<id>/
  entscheidung` ist der reale Fortsetzungsweg für eine dort eingetragene
  menschliche Entscheidung — kein Replan mehr nötig. Bestandsaufnahme
  Frage 1 oben ist damit für BEIDE Teile eingelöst.
- **F-634** (`PROCESS_IMPROVEMENT`, P3) — **kein Fix nötig, dokumentiert**:
  Herkunft des ungetrackten `kontrollzustand/`-Bestands im Repo-Root vor
  dem WS-2b-Bau geklärt (Auftrags-Vorgabe Punkt 0) — legitime, nie
  committete reale Läufe (Jarvis-Chats, F18-Eval-Läufe, Feature-Nachweise),
  keine Testisolationslücke.
- **F-633** (`TECH_DEBT`, P2) — **erledigt** (WS-2a): `AuftragV0Daten.herkunft`
  (additiv/optional) plus `bestimmeEffektiveKontrolltiefe` heben die
  Kontrolltiefe für `herkunft.art === 'projekt_interview'` deterministisch
  auf mindestens `hoch` an (AK9) — kein Titel-Präfix-Raten mehr nötig.
  Siehe Bestandsaufnahme Frage 2 oben.

## Dependencies

- F17 — Rollenvertrag-Mechanik (`ROLLENVERTRAEGE`,
  `loeseAusfuehrungsEingabenAuf`).
- F34 — Muster `product-coach` (Modul-Zuschnitt, Codex-Dialekt-Schema,
  `baueCapabilityAuszug` wiederverwendet statt kopiert); Chat→Auftrag-
  Brücke (`views/chat.js`) setzt `herkunft` (WS-2a).
- F19 — `benoetigte_capabilities`, Capability Library (F36, gemeinsam mit
  `product-coach`, E-M5-13).
- F18/F22 — Router-Mechanik (`waehleWorkflowVorlage`,
  `verarbeiteRouterErgebnis`), jetzt um die deterministische
  Kontrolltiefe-Untergrenze erweitert (WS-2a).
- F15 — Schritt-Automat (`loeseSchrittEingabenAuf`, Regel 4b), Eingabe-
  Platzhalter-Muster (`aenderungsuebersicht-@`, Vorbild für
  `ergebnis-@`, WS-2a).
- docs/adr/TEMPLATE.md — Vorbild für `adr_entwuerfe[]`
  (Kontext/Entscheidung/Alternativen/Konsequenzen).
- Findings: F-632 erledigt (Teil a WS-2a, Teil b WS-2b), F-633 erledigt,
  F-634 dokumentiert (kein Fix nötig).
