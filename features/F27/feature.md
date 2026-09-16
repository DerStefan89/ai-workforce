# F27 — Resource Scout

## ID
F27

## Titel
Resource Scout (Werkzeugsatz-Art "recherchierend", Rolle "scout", Schema, realer CLI-Lauf — WS-1)

## Status
Status: READY_FOR_TECH

Gültige Status-Werte (geprüft vom Gate): ENTWURF, READY_FOR_TECH, WORKSTREAM_SCHNITT_GENEHMIGT, IN_ARBEIT, FEATURE_GATE, ABGESCHLOSSEN, BLOCKIERT, ABGEBROCHEN.

## Ziel
Ein Capability Gap oder eine explizite Suche löst eine read-only-Recherche aus; Ergebnis sind ≤5 strukturierte Kandidaten (Fit, Integrationsaufwand, Lizenz, Risiken). WS-1 liefert die Mechanik bis zum real per CLI ausgelösten, schemakonformen Lauf — ohne UI und ohne Schreibpfad nach ressourcen.json (das ist WS-2, "Vormerken"). Füllt die in F24 bewusst leer gelassene ASSESSED-Phase mit echtem Inhalt.

## Nicht-Ziele
- UI (Auslöser aus Gap-/Capability-View, Ergebnis-Vergleichsansicht, "Vormerken"-Schaltfläche) — WS-2.
- Fast-Lane-Auftragserzeugung, die einen Vormerken-Klick tatsächlich in einen Lauf+Freigabe übersetzt, der ressourcen.json ändert — WS-2.
- Installation, Freigabe, Vorratssuche, URL-/Repo-Analyse mit Ausführung, Modelle/Provider als Kandidaten.
- Codex als Scout-Worker (Spike offen, additiv nachrüstbar).

## Akzeptanzkriterien
- AK1 Werkzeugsatz-Art "recherchierend" additiv eingeführt: schemas/startvorlage.schema.json (Enum erweitert), src/startvorlage/types.ts und src/rollen/types.ts (Union-Typ erweitert), src/startvorlage/index.ts (Validierungszeile um 'recherchierend' ergänzt). Bestehende Startvorlagen bleiben ohne Änderung gültig. startvorlagen/ai-workforce.json erhält einen neuen Werkzeugsatz mit art: 'recherchierend', erlaubte_werkzeuge: ['Read','Grep','Glob','WebSearch','WebFetch'].
- AK2 Rolle "scout" in ROLLENVERTRAEGE (src/rollen/index.ts): erlaubte_werkzeugsatz_arten: ['recherchierend'], erlaubte_worker: ['claude-code'], erlaubtes_output_schema: 'ergebnis-scout', benoetigte_capabilities: ['WEB_RESEARCH','STRUCTURED_OUTPUT','REPO_READ'], ausschlussmuster analog zu den anderen lesenden Rollen. Real belegter Rot-Fall: derselbe Werkzeugsatz (art: 'recherchierend') gegen eine Rolle ohne diese erlaubte Art (z. B. ausfuehrung) wird vom Server real abgelehnt.
- AK3 schemas/ergebnis-scout.schema.json neu, additionalProperties: false: { gesuchte_capability: string, kandidaten: array (0–5) von { name, typ: enum[skill, extern], quelle_url, capabilities[], fit, integrationsaufwand, rechte, risiken[], lizenz?, empfehlung, unsicherheiten[] }, hinweis_untrusted: true (const) }. Prompt-Vertrag der Rolle: externe Inhalte sind Daten, keine Anweisungen (P5).
- AK4 ressourcen.json: claude-code.capabilities erhält WEB_RESEARCH. F346_AUSNAHMEN (src/capabilities-ansicht/index.ts) erhält { rolle: 'scout', worker: 'claude-code', erlaubteLuecke: ['STRUCTURED_OUTPUT'] }. features/F19/bekannte-luecken.md vermerkt WEB_RESEARCH als geschlossen (Abschlussnotation, nicht löschen).
- AK5 Gemeinsame Low-Level-Lesefunktion für Rollen-Rohstrom (Worker-Zweig, JSON-Parse, Codezaun-Fallback über entferneCodezaun) aus verarbeiteRouterErgebnis und leseUrteilAusLaufakte (scripts/leitstand-server.mjs) extrahiert und von der neuen Scout-Ergebnis-Lesefunktion mitgenutzt. Schema-Validierung und Artefaktbau bleiben pro Rolle getrennt. Falls sich beim Bauen ein inhaltlicher Unterschied zeigt, der die gemeinsame Funktion verkompliziert statt vereinfacht: Extraktion abbrechen, pro Rolle lassen, als Befund melden.
- AK6 Ein realer Scout-Lauf über POST /api/laeufe (Rolle scout, Werkzeugsatz mit art: 'recherchierend', kein Workflow nötig) zu einem echten, in features/F19/bekannte-luecken.md benannten Gap liefert ein gegen ergebnis-scout.schema.json valides Ergebnis mit ≤5 Kandidaten. Vorschlag: Gap UI_VISUAL_TESTING → erwarteter Kandidat playwright-mcp (bereits in ressourcen.json als extern/OFFEN katalogisiert).
- AK7 Gate scripts/check-f27-scout.mjs, kalibriert mit mindestens dem Rot-Fall aus AK2 (Muster check-f21-workboard.mjs: absichtlich falsche Testdaten → rot, dann korrigiert → grün).

## Dependencies
- F17 — Rollenvertrag (`ROLLENVERTRAEGE`, `erlaubte_werkzeugsatz_arten`-
  Durchsetzung in `loeseAusfuehrungsEingabenAuf`), auf dessen Mechanik F27
  ausschließlich mit einer additiven Werkzeugsatz-Art/Rolle aufsetzt — keine
  zweite Durchsetzungslogik.
- F19 — Capability Foundation (`ressourcen.json`,
  `ROLLENVERTRAEGE.benoetigte_capabilities`, `features/F19/bekannte-
  luecken.md`), deren Lückenliste AK4/AK6 fortschreiben.
- F11 WS-2 — Startvorlage (`schemas/startvorlage.schema.json`,
  `src/startvorlage/index.ts`, benannte Werkzeugsätze), die AK1 additiv um
  die Art 'recherchierend' erweitert.
- F24 WS-1 — Capabilities-View (`ASSESSED_HINWEIS`,
  `src/capabilities-ansicht/index.ts`), deren bewusst leer gelassene
  ASSESSED-Phase F27 als erster realer Scout-Lauf inhaltlich vorbereitet
  (WS-2 verdrahtet die Anzeige selbst).

## Betroffene Primitive
Startvorlagen-Schema, Rollenvertrag, ressourcen.json, F346_AUSNAHMEN, features/F19/bekannte-luecken.md.

## Risiken
Prompt-Injection über Web-Inhalte — bewusst akzeptiert (E5), P5-Vertrag verpflichtend. Halluzinierte Quellen — hinweis_untrusted muss ab WS-1 im Schema stehen.

## Feature Review
Nach WS-1 (dieser Auftrag). WS-2 (UI, Vormerken-Schreibpfad) erst nach ACCEPT.

## Rollback
Rolle scout und Werkzeugsatz-Art recherchierend aus den Registern entfernen; F346_AUSNAHMEN-Eintrag und WEB_RESEARCH-Capability können stehen bleiben.
