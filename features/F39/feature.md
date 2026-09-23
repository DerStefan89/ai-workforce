# F39 — Architektur-Rolle „architekt"

## ID

F39

## Titel

Architektur-Rolle „architekt" (Rollenvertrag + Schema + Gate; Projektmodus „Architektur-Grundlage" folgt in WS-3)

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
- **Kein `hoch.json`-Eintrag, kein Router, kein Leitstand-Endpunkt.**
  Explizite WS-1-Grenze der Auftrags-Vorgabe — diese drei sind WS-2-Scope
  (Advisor-Ergebnis muss den Workflow-Schritt erreichen, deterministische
  Kontrolltiefe-Untergrenze, siehe „Entschieden").
- **Kein Projektmodus „Architektur-Grundlage" in WS-1** — das Ausgabeschema
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
- **WS-2 — Einhängung (nicht in diesem Auftrag).** `hoch.json` bekommt
  `architekt` als neuen Schritt 1 VOR der bestehenden Workforce-Rolle
  `architecture-advisor` (deren Schritt rückt zu Schritt 2 — Autor zuerst,
  dann Prüfer); Eingabe-Platzhalter
  von `aenderungsuebersicht-@` auf `ergebnis-@<schritt>` verallgemeinert
  (`scripts/leitstand-server.mjs` ~Z. 2381); Regel 1c
  `entscheidungen_mensch` → `haltKlaerung` + Fortsetzungsweg; Router-
  Auslöserliste + deterministische Untergrenze `hoch` für Projektaufträge
  aus F34 über ein strukturiertes Herkunftsfeld (nicht über das
  Titel-Präfix).
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
  WS-2 als Schritt VOR (2) eingehängt wird.

## Entschieden

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

- **F-632** (`PROCESS_IMPROVEMENT`, P2, offen) — Advisor-/Architekt-Ergebnis
  in einem künftigen `hoch`-Workflow erreicht die Ausführung strukturell
  nicht, weil die einzige Schritt-Eingabe der Auftrag ist (kein
  Entscheidungskanal zwischen zwei Schritten derselben Kette). Siehe
  Bestandsaufnahme Frage 1 oben.
- **F-633** (`TECH_DEBT`, P2, offen) — keine deterministische
  Kontrolltiefe-Untergrenze: Pflichtpfade (z. B. `hoch` für
  Projektaufträge aus F34) hängen ausschließlich am LLM-Urteil des
  Routers, weil `AuftragV0Daten` kein strukturiertes Herkunftsfeld trägt.
  Siehe Bestandsaufnahme Frage 2 oben.

## Dependencies

- F17 — Rollenvertrag-Mechanik (`ROLLENVERTRAEGE`,
  `loeseAusfuehrungsEingabenAuf`).
- F34 — Muster `product-coach` (Modul-Zuschnitt, Codex-Dialekt-Schema,
  `baueCapabilityAuszug` wiederverwendet statt kopiert).
- F19 — `benoetigte_capabilities`, Capability Library (F36, gemeinsam mit
  `product-coach`, E-M5-13).
- docs/adr/TEMPLATE.md — Vorbild für `adr_entwuerfe[]`
  (Kontext/Entscheidung/Alternativen/Konsequenzen).
- Findings: F-632 (neu), F-633 (neu).
