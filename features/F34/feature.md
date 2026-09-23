# F34 — Product Coach / Ideation + Discovery

## ID
F34

## Titel
Product Coach / Ideation + Discovery

## Status
Status: IN_ARBEIT

Gültige Status-Werte (geprüft vom Gate): ENTWURF, READY_FOR_TECH, WORKSTREAM_SCHNITT_GENEHMIGT, IN_ARBEIT, FEATURE_GATE, ABGESCHLOSSEN, BLOCKIERT, ABGEBROCHEN.

## Ziel
Ein Sparring-Partner, der eine Idee VOR dem Bau schärft — Annahmen
hinterfragt, Alternativen mit Abwägung vorstellt und erst bei
ausreichender Klarheit einen Scope-Entwurf liefert — statt direkt in einen
Auftrag zu münden, ohne dass die Fragen dazwischen je gestellt wurden
(`docs/projekt/zielfassung.md` §13.6, Meilenstein 5).

## Nicht-Ziele
- Eine eigene, dedizierte Sparring-Route (`#/sparring` o. ä.) — Sparring
  lebt als zweiter Modus in der bestehenden Chat-Spalte
  (`#shell-chat-spalte`), kein zweiter View-Container (WS-2: Umschalter
  "Jarvis"/"Sparring", Muster `#/chat`).
- `POST /api/sparring/zusammenfassen` — kein Gesprächsgedächtnis-
  Zusammenfassen für `product-coach` (Muster F31 WS-2, ausschließlich
  für `jarvis` gebaut); ein Sparring-Gespräch ist kürzer und zielgerichteter
  als ein offener Chat, ein Zusammenfassungs-Pfad ist kein Teil dieses
  Auftrags.
- Ein Schreibpfad, der aus einem Scope-Entwurf oder einem Jarvis-
  Auftragsvorschlag automatisch einen registrierten `AUFTRAG_V0` macht
  (WS-2, F-606) — die "Als Auftrag anlegen"-Brücke öffnet eine editierbare
  Bestätigung, erst der Klick auf "Anlegen" registriert; kein Routen/Starten
  danach.
- Neue Kontextdatei-Typen oder eine zweite Context-Builder-Einspeisung —
  `product-coach` bekommt denselben Projektkontext wie `jarvis`/`router`
  über die bestehende `baueProjektkontextAnfragen` (F33), unverändert.
- Neue Werkzeugsätze oder eine dritte Werkzeugsatz-Art — `product-coach`
  ist `lesend`-only, Muster `jarvis`/`router`.
- Eine Workboard-Workitem-Karte für einen frisch angelegten Auftrag (WS-2)
  — ein Auftrag ist kein Finding/keine Feature-Akte/kein Failed-Run/keine
  Capability-Lücke im F21-Sinn; die Erfolgsmeldung verlinkt stattdessen auf
  `#/projekt` (die reale Aufträge-Übersicht, s. "Bekannte Grenzen").

## Workstreams
- **WS-1 — Sparring-Backend (dieser Auftrag).** Rolle `product-coach` in
  `src/rollen/index.ts` (lesend, beide Worker, eigenes Ausgabeschema),
  `schemas/ergebnis-product-coach.schema.json` (Codex-Dialekt, F-423-Muster),
  `src/product-coach/index.ts` (`validiereErgebnisProductCoach`,
  `baueCoachAuftragstext`, `baueAuftragAusScope`). Server:
  `starteJarvisChatLauf` auf eine Rollenkonfiguration parametrisiert
  (`KONFIGURATION_JARVIS`/`KONFIGURATION_PRODUCT_COACH`, jetzt
  `starteRollenChatLauf`, D5) statt für `product-coach` kopiert;
  `POST /api/sparring` (Dispatch bleibt im Server, braucht die
  D13-Closure-Sperre), `GET /api/sparring`
  (`scripts/leitstand/routen-sparring.mjs`, reine Projektion, Muster
  `routen-roadmap.mjs`). `public/leitstand/api.js`:
  `sendeSparringNachricht`/`holeSparringVerlauf`. Gate
  `scripts/check-f34-product-coach.mjs`.
- **WS-2 — Latenz-A/B-Messung, Sparring-UI + Chat→Auftrag-Brücke (dieser
  Auftrag).** Reale A/B-Messung VOR der UI-Arbeit (`features/F34/
  nachweis-ws2-latenz.md`, F-609): `KONFIGURATION_PRODUCT_COACH.
  aufrufEingabenZusatz` trägt seither `umgebungsvariablen.
  MAX_THINKING_TOKENS: '0'` wie `KONFIGURATION_JARVIS` (Median-Latenz
  67,1 s → 8,2 s). `views/chat.js`: "Jarvis"/"Sparring"-Umschalter
  (`#chat-modus-jarvis-btn`/`#chat-modus-sparring-btn`, `MODI`-Konfiguration
  — die einzige Stelle, an der sich beide Modi unterscheiden, jede
  bisherige Funktion auf `modus` parametrisiert statt kopiert, D5),
  Modus-Präferenz in `localStorage` (try/catch). Rendering nach `art`:
  `alternativen` als Liste (Titel/Beschreibung/Abwägung, `renderAlternativen`),
  `scope_entwurf` strukturiert (Problem/Ziel/In-Out-Annahmen-
  Fragen-Erfolgskriterium, `renderScope`) — beide über `escapeHtml`. "Als
  Auftrag anlegen"-Brücke (löst `state/findings.md` F-606,
  `leseAuftragKandidat`/`renderAuftragBruecke`/`initAuftragBruecke`): bei
  Sparring `art: 'scope_entwurf'` (`baueAuftragAusScope`, reine JS-Kopie
  `public/leitstand/auftrag-aus-scope.js` für den Browser ohne
  Build-Schritt) UND bei Jarvis `art: 'auftrag_vorschlag'`
  (`auftrag.titel`/`auftrag.text` direkt, kein Builder nötig) — ein Klick
  öffnet eine vorbefüllte, editierbare Bestätigung, erst "Anlegen" ruft
  `POST /api/auftraege` (`legeAuftragAn`, bestehender F12-Pfad). Gate
  `scripts/check-f34-product-coach.mjs` Abschnitte (i) (Gleichheit
  Server-TS/Browser-JS) und (j) (statische Prüfung der Brücke, F-601-Muster
  — kein DOM-Test für `chat.js` selbst).
- **WS-3 — Projekt-Interview (dieser Auftrag, E-M5-12).** Zweiter
  Sparring-Modus `projekt` (Standard bleibt `feature`, unverändertes WS-1/
  WS-2-Verhalten): `POST /api/sparring` nimmt optional `{ modus:
  'feature'|'projekt' }` an, unbekannter Wert/Fremdfeld → 400; der Modus
  wird im Lineage-Eintrag (`sparring-<projektId>`) mitgespeichert und in
  `GET /api/sparring` projiziert (Alt-Einträge ohne das Feld projizieren
  als `feature`). `baueCoachAuftragstext(nachricht, verlauf, modus,
  capabilityAuszug)` bekommt im Modus `projekt` eine eigene
  Rolleninstruktion — Interview in fester Reihenfolge (Vision/Problem,
  Zielgruppe, Ziele/Erfolgskriterien, Scope In/Out, Meilensteine,
  Feature-Schnitt je Meilenstein), weiterhin höchstens eine Rückfrage je
  Turn, `projekt_entwurf` erst bei ausreichender Klarheit; erkennt der
  Coach am eingespeisten Projektkontext (F33) eine bestehende Roadmap,
  plant er eine ERWEITERUNG statt eines Neuanfangs. Schema
  `ergebnis-product-coach.schema.json` erweitert um `art: 'projekt_entwurf'`
  und das Pflichtfeld `projekt: object|null` (Vision, Zielgruppe, Ziele,
  Scope In/Out, Meilensteine mit Features — je Feature Titel/Ziel/
  Nicht-Ziele/Akzeptanzkriterien/`abhaengig_von_titel` —,
  `capabilities_bedarf`, `architektur_hinweise`, offene Fragen); die
  Kopplungen (`art projekt_entwurf` ⇔ `projekt` ≠ null; eine
  `ressource_id` ≠ null muss im eingespeisten Capability-Auszug existieren)
  bleiben Codex-Dialekt-konform ausschließlich im Validator
  (`validiereErgebnisProductCoach(daten, bekannteRessourcenIds?)`), keine
  Feature-IDs im Modell-Output. `baueCapabilityAuszug(aufgeloesteRessourcen)`
  rendert `loeseRessourcenAuf`s Ergebnis als kompakten, nach `id`
  sortierten Text — nur im Modus `projekt` in den Auftragstext eingefügt,
  keine zweite Leselogik. `vergebeFeatureIds(projekt, bestehendeIds)`
  vergibt Feature-/Meilenstein-IDs deterministisch im Server (nie das
  Modell, F-595-Muster) — nächste freie `F<n>`/`M<n>` aus `features/<id>/`
  und `roadmap.json` (irreguläre Alt-IDs wie `F1B`/`F6a`/`F19-bridge`
  werden übersprungen, nicht geraten), löst `abhaengig_von_titel` zu IDs
  auf, ein unbekannter Titel wird zu einer offenen Frage statt geraten zu
  werden; wird serverseitig direkt nach einem erfolgreichen
  `projekt_entwurf`-Lauf angewendet (`verarbeiteRollenChatErgebnis`, VOR
  dem Schreiben in die Lineage) — der persistierte Entwurf trägt bereits
  zugewiesene IDs plus `auftragModus` (`'neu'`/`'erweiterung'`, aus
  denselben `bestehendeIds` abgeleitet). `baueAuftragAusProjektentwurf
  (projektMitIds, auftragModus)` ist eine reine Funktion (Muster
  `baueAuftragAusScope`), die AUSSCHLIESSLICH einen Dokumentations-Auftrag
  baut (`docs/projekt/kontext/beschreibung.md` neu/ergänzt,
  `docs/projekt/roadmap.json` neu/ergänzt mit Status `GEPLANT`, je Feature
  ein `features/<id>/feature.md`-Skelett mit Status `ENTWURF`,
  `capabilities_bedarf` mit Status `fehlt` als Abschnitt
  "Scout-Kandidaten", `architektur_hinweise` als Abschnitt "Für den
  Architekten (F39)") — kein Produktcode, kein Dateizugriff selbst; Browser-
  Kopie `public/leitstand/auftrag-aus-projektentwurf.js` (Muster
  `auftrag-aus-scope.js`), Gleichheit mechanisch geprüft. `views/chat.js`:
  Unterumschalter "Feature"/"Projekt" (`#chat-untermodus-feature-btn`/
  `#chat-untermodus-projekt-btn`, nur im Modus `sparring` sichtbar,
  `sparringUntermodus` in `localStorage`), strukturierte Anzeige eines
  `projekt_entwurf` (`renderProjekt`: Vision, Zielgruppe, Ziele, Scope In/
  Out, Meilensteine mit Features + zugewiesenen IDs, Capability-Bedarf mit
  Status-Badge, offene Fragen), dieselbe "Als Auftrag anlegen"-Brücke wie
  WS-2 (`leseAuftragKandidat` um `art === 'projekt_entwurf'` erweitert).
  Gate `scripts/check-f34-product-coach.mjs` Abschnitte (m)–(r).

## Akzeptanzkriterien
- AK1 (WS-1): `ROLLENVERTRAEGE['product-coach']` trägt alle fünf
  Vertragsfelder (`erlaubte_werkzeugsatz_arten: ['lesend']`,
  `erlaubte_worker: ['claude-code', 'codex']`, `erlaubtes_output_schema:
  'ergebnis-product-coach'`, `ausschlussmuster: ['src/**']`,
  `benoetigte_capabilities`) — Muster `jarvis`. `bekannteRollen()` liefert
  acht Rollen; `istBekannteRolle('planner')` bleibt `false` (negativ
  gepinnt, `src/rollen/rollen.test.ts`).
- AK2 (WS-1): `schemas/ergebnis-product-coach.schema.json` im
  Codex-Dialekt (F-423, kein `oneOf`/`allOf`/`if`, jede `properties`-
  Eigenschaft in `required`, Optionales als Typ `[...,"null"]`,
  `additionalProperties: false`) — `art` (`frage`/`alternativen`/
  `scope_entwurf`), `antwort`, `alternativen`, `scope`. Die Kopplung (`art
  'alternativen'` ⇒ `alternativen` ≠ null, ≥ 2 Einträge; `art
  'scope_entwurf'` ⇒ `scope` ≠ null; sonst beide null) ist NUR im Validator
  erzwungen, nicht im Schema (Muster `ergebnis-jarvis.schema.json`).
- AK3 (WS-1): `validiereErgebnisProductCoach` (`src/product-coach/index.ts`)
  akzeptiert alle drei gültigen `art`-Formen und die ältere claude-code-Form
  (Felder weggelassen statt `null`), lehnt jede der Kopplungsverletzungen
  einzeln benannt ab (Rot-/Grünfall-Paare, `src/product-coach/
  product-coach.test.ts`). `baueCoachAuftragstext(nachricht, verlauf)`
  liefert die Rolleninstruktion (Sparring-Partner, höchstens eine
  Rückfrage je Turn, Alternativen mit Abwägung, Scope-Entwurf erst bei
  ausreichender Klarheit, JSON-only-Vertrag, F-337-Lehre) plus optionales
  Verlaufsfenster (über die bestehende `waehleVerlaufsfenster`-Logik aus
  `src/jarvis/index.ts`, keine Kopie) plus die Nachricht. `baueAuftragAusScope
  (scope)` ist eine reine, deterministische Funktion, die aus den
  Scope-Feldern Markdown für einen F22-Auftrag baut.
- AK4 (WS-1): `starteRollenChatLauf` (vormals `starteJarvisChatLauf`) läuft
  für `jarvis` bitgenau unverändert (`settingSources ''`, `mcpConfig
  '{"mcpServers":{}}'`, `umgebungsvariablen.MAX_THINKING_TOKENS '0'`,
  `disallowedTools` `AUTO_MEMORY_DENY_REGEL`, identische `auftragId`-/
  `laufId`-Form, identische Fehlertexte — Regressionsschutz über
  `scripts/check-f26-jarvis.mjs`/`check-f31-gedaechtnis.mjs`, beide
  unverändert grün). `product-coach` läuft mit `settingSources`/
  `mcpConfig`/`disallowedTools`/`umgebungsvariablen.MAX_THINKING_TOKENS '0'`
  wie `jarvis` — ursprünglich (WS-1) bewusst OHNE, seit WS-2 real
  A/B-gemessen dazugenommen (F-609, `nachweis-ws2-latenz.md`: senkt die
  Median-Latenz von 67,1 s auf 8,2 s ohne Qualitätsverlust). Worker-
  Auflösung (`codex`, wenn verfügbar, sonst `claude-code`) und
  Projektkontext-Einspeisung (`baueProjektkontextAnfragen`/
  `filtereExistierendeAnfragen`) sind für beide Rollen gemeinsam, D13
  identisch. `POST /api/sparring` (Body nur `{ nachricht }`, dieselben
  Prüfungen/Obergrenze 8000 Zeichen wie `POST /api/chat`, Lineage
  `sparring-<projektId>`), `GET /api/sparring` (`{ verlauf: [{ laufId,
  nachricht, coachAntwort }] }`, `scripts/leitstand/routen-sparring.mjs`).
  Präfixierte (`/api/projekte/<id>/sparring`) und unpräfigierte Variante wie
  `/api/chat` (generischer `erzeugeMultiProjektDispatcher`, keine
  Sonderbehandlung nötig). `public/leitstand/api.js`:
  `sendeSparringNachricht`/`holeSparringVerlauf` (Muster
  `sendeChatNachricht`/`holeChatVerlauf`, `holeJsonOderWirf`+Zeitlimit für
  die GET-Seite).
- AK5 (WS-1): `scripts/check-f34-product-coach.mjs` prüft: Schema-Dialekt
  (kein `oneOf`/`allOf`/`if`, alle `properties` in `required`,
  rekursiver Scan, Muster `check-f26-jarvis.mjs` (b2)), Validator-Grün/Rot
  je `art` gegen die Schema-Beispiele, `baueAuftragAusScope`
  deterministisch (zweimal derselbe Scope → byte-identisches Ergebnis),
  `GET /api/sparring` bei leerer Kette `{ verlauf: [] }` (kein Fehler),
  `POST /api/sparring` mit einem Fremdfeld → 400, Jarvis-Regression
  (`POST /api/chat`-Aufrufeingaben bitgenau unverändert gegen eine fake
  `fuehreAufgabeDurchFn`). `process.exitCode` statt `process.exit()`
  (Muster `check-f33-projektkontext.mjs`). In `npm run check` eingehängt.
- AK6 (WS-1): realer Nachweis — ein Sparring mit drei Turns gegen dieses
  Repo, das mit `art: 'scope_entwurf'` endet, Latenz je Turn und Worker
  dokumentiert (`features/F34/nachweis-ws1.md`).
- AK7 (WS-2): reale A/B-Messung VOR der UI-Arbeit, vier Varianten
  (`features/F34/nachweis-ws2-latenz.md`, F-609) mit denselben drei
  Nachrichten wie AK6, je Variante eine frische Sparring-Kette: Median-
  Latenz + Qualitätsvergleich (reale Fundstellen, Abgrenzung) je Variante
  tabellarisch dokumentiert; die schnellste Variante, die die
  Qualitätsschwelle hält (V1, `MAX_THINKING_TOKENS '0'`), wurde
  übernommen.
- AK8 (WS-2): "Jarvis"/"Sparring"-Umschalter in `views/chat.js`
  (`#chat-modus-jarvis-btn`/`#chat-modus-sparring-btn`) — reine Anzeige-/
  Zielwahl, lädt `GET /api/chat` bzw. `GET /api/sparring`, sendet an
  `POST /api/chat` bzw. `POST /api/sparring`. Ein im Hintergrund-Modus
  ausstehender Lauf pollt unabhängig vom angezeigten Modus weiter (kein
  verlorener Poll bei einem Moduswechsel mitten im Warten). Modus-
  Präferenz in `localStorage` (try/catch). `#chat-zusammenfassen-btn`
  bleibt für `sparring` versteckt (`MODI.hatZusammenfassen`).
- AK9 (WS-2): Sparring-Antworten werden nach `art` gerendert —
  `frage`/`antwort` als Text (unverändert), `alternativen` als Liste
  (Titel, Beschreibung, Abwägung), `scope_entwurf` strukturiert (Problem,
  Ziel, In/Out of Scope, Annahmen, offene Fragen, Erfolgskriterium) — jeder
  Textbaustein über `escapeHtml`.
- AK10 (WS-2, löst `state/findings.md` F-606): "Als Auftrag anlegen" bei
  Sparring `art: 'scope_entwurf'` (`baueAuftragAusScope`) UND bei Jarvis
  `art: 'auftrag_vorschlag'` (`auftrag.titel`/`auftrag.text`) — Klick öffnet
  eine vorbefüllte, editierbare Bestätigung; erst "Anlegen" ruft das
  bestehende `POST /api/auftraege`. Kein automatisches Anlegen, kein
  Routen/Starten. Nach Erfolg ein Link auf `#/projekt`.
- AK11 (WS-2): `scripts/check-f34-product-coach.mjs` erweitert um (i)
  `baueAuftragAusScope`-Gleichheit zwischen dem Server-Original
  (`src/product-coach/index.ts`) und seiner Browser-JS-Kopie
  (`public/leitstand/auftrag-aus-scope.js`) über drei Scope-Fixtures und
  (j) eine statische Quelltextprüfung der Auftrag-Brücke in `views/chat.js`
  (`legeAuftragAn` ausschließlich mit `{ titel, auftragstext }`, beide
  `art`-Werte lösen dieselbe Brücke aus). `state/findings.md` F-606 auf
  `erledigt`.
- AK12 (WS-3): `POST /api/sparring` akzeptiert optional `modus` ∈
  `{'feature','projekt'}`, Standard `feature`; ein unbekannter Wert oder
  ein sonstiges Fremdfeld bleibt real 400 (`scripts/check-f34-
  product-coach.mjs` Abschnitt (m), inkl. Regressionsfall für das
  bisherige Fremdfeld-Verhalten).
- AK13 (WS-3): `schemas/ergebnis-product-coach.schema.json` erweitert um
  `art: 'projekt_entwurf'` und das Codex-Dialekt-konforme Pflichtfeld
  `projekt: object|null` (jede verschachtelte Eigenschaft — Meilenstein,
  Feature, Capability-Bedarf — steht in ihrem eigenen `required`, geprüft
  durch einen rekursiven Scan, Abschnitt (b2)). `validiereErgebnisProductCoach`
  erzwingt die Kopplung `art 'projekt_entwurf'` ⇔ `projekt` ≠ null
  (Abschnitt (b3)) und — nur wenn `bekannteRessourcenIds` übergeben wird —
  dass jede gesetzte `capabilities_bedarf[].ressource_id` darin vorkommt;
  eine erfundene ID ist ein Verstoß, ohne übergebene Liste bleibt die
  Prüfung bewusst aus (Abschnitt (p)). Vier neue Beispiele unter
  `schemas/examples/` (ein valider `projekt_entwurf`, zwei ungültige, ein
  ressourcenabhängiger Rot-Fall).
- AK14 (WS-3): `vergebeFeatureIds` ist deterministisch (zweimal derselbe
  Entwurf → byte-identisches Ergebnis), kollidiert nicht mit real
  bestehenden Feature-/Meilenstein-IDs (inkl. der irregulären
  `F1B`/`F6a`/`F19-bridge`), löst eine bekannte `abhaengig_von_titel`-
  Abhängigkeit zu der zugewiesenen ID auf und erzeugt für einen
  unbekannten Titel einen `offene_fragen`-Eintrag statt zu raten
  (`scripts/check-f34-product-coach.mjs` Abschnitt (n)). `baueCapabilityAuszug`
  ist deterministisch, Eingabereihenfolge-unabhängig, nach `id` sortiert,
  zeigt `freigabe`/`verfuegbar` je Ressource (Abschnitt (o)).
- AK15 (WS-3): `baueAuftragAusProjektentwurf` (Server-TS,
  `src/product-coach/index.ts`) und ihre Browser-JS-Kopie
  (`public/leitstand/auftrag-aus-projektentwurf.js`) liefern für `'neu'`
  und `'erweiterung'` byte-identische Ergebnisse (Abschnitt (q), Muster
  Abschnitt (i)); der Auftragstext trägt ausschließlich eine
  Dokumentations-Anweisung, keinen Produktcode-Auftrag.
- AK16 (WS-3): ein realer POST/GET-`/api/sparring`-Rundlauf im Modus
  `projekt` gegen dieses Repo zeigt: der Auftragstext trägt einen
  Capability-Auszug UND die Interview-Reihenfolge-Instruktion, `GET
  /api/sparring` projiziert `modus: 'projekt'` für den geschriebenen Turn,
  und der persistierte Entwurf trägt real (gegen die tatsächlichen
  `features/<id>/`- und `roadmap.json`-Bestände dieses Repos) vergebene
  Meilenstein-/Feature-IDs plus `auftragModus` (Abschnitt (r)).
- AK17 (WS-3): `views/chat.js` zeigt im Modus `sparring` einen
  Unterumschalter "Feature"/"Projekt"; ein `projekt_entwurf`-Turn wird
  strukturiert gerendert (Vision, Zielgruppe, Ziele, Scope In/Out,
  Meilensteine mit Features + zugewiesenen IDs, Capability-Bedarf mit
  Status-Markierung, offene Fragen), jeder Textbaustein über `escapeHtml`.
  "Als Auftrag anlegen" löst für `art: 'projekt_entwurf'` dieselbe Brücke
  wie für `'scope_entwurf'`/`'auftrag_vorschlag'` aus (`POST
  /api/auftraege`, kein automatisches Anlegen/Routen/Starten).
- AK18 (WS-3): `docs/projekt/zielfassung.md` (§13.6, E-M5-12/13/14),
  `docs/STATUS.md` und diese Akte spiegeln die Entscheidungen vom
  22.09.2026 (Coach-Modus `projekt`, F39 vor F35 mit Architektur-
  Grundlage-Modus, F41 direkt nach F39) wider — kein stillschweigender
  Plan-Drift.
- AK19 (WS-3): realer Nachweis — ein Projekt-Interview mit 4–6 Turns gegen
  dieses Repo bis `projekt_entwurf` (ein kleiner neuer Meilenstein, Latenz
  je Turn, zugewiesene IDs, Capability-Bedarf dokumentiert), der daraus
  erzeugte Auftrag wird angelegt (nicht geroutet/gestartet) und sein
  Auftragstext in `features/F34/nachweis-ws3.md` festgehalten.

## Feature Review

### WS-1
Reviewer-/QA-Pass am 22.09.2026 (frischer Kontext, Muster CLAUDE.md/F33/F40)
für WS-1.

- **code-reviewer:** „Freigegeben mit Hinweisen", kein Blocker. Zwei
  Befunde, beide direkt behoben: (1) der F-506-Fehlerpfad
  (`schreibeRollenChatFehlerEintrag`, `konfiguration.fehlerArt`/
  `fehlerAntwortPraefix`) war für `product-coach` ungetestet — Abschnitt
  (h) in `scripts/check-f34-product-coach.mjs` ergänzt (Muster
  `check-f31-gedaechtnis.mjs` (j)), real grün. (2) `leseCoachErgebnisAusLaufakte`/
  `verarbeiteCoachSparringErgebnis` waren exportierte, aber nirgends
  aufgerufene Wrapper (anders als ihre Jarvis-Pendants, die bestehende
  Gates beim Namen importieren) — entfernt (YAGNI), der produktive Pfad
  ruft die internen, konfigurationsgetriebenen Funktionen direkt mit
  `KONFIGURATION_PRODUCT_COACH`. Bestätigt: der Jarvis-Pfad bleibt nach der
  `starteRollenChatLauf`-Parametrisierung bitgenau unverändert (Lektüre
  + grüne Regressionsgates), die `KONFIGURATION_JARVIS`/
  `KONFIGURATION_PRODUCT_COACH`-Zwei-Konstanten-Lösung (statt eines
  rollennamen-indizierten Objekts) ist eine begründete Design-Entscheidung
  gegen die reale `check-f17-rollenvertrag.mjs` AK1-Heuristik, kein
  Code-Smell.
- **qa:** wurde ohne Bash-Werkzeug aufgerufen und konnte die verlangten
  Live-Tests (Server selbst starten, echte Requests fahren,
  `npm run check` selbst ausführen) nicht durchführen — die Aussagen
  stützen sich auf Code-Lektüre inkl. `scripts/check-f34-product-coach.mjs`
  (das dieselben HTTP-Rundläufe bereits automatisiert fährt). Keine
  funktionalen Defekte gefunden. Zwei Befunde registriert, beide P4/
  `TECH_DEBT`, kein Blocker: F-607 (kein Test für die D13-Sperre unter
  echter Nebenläufigkeit — repo-weite, nicht F34-spezifische Lücke) und
  F-608 (`istNichtLeererString` akzeptiert Whitespace-only-Strings — seit
  F26 bestehendes, geteiltes Verhalten mit `jarvis`, keine F34-Regression).
  `npm run check` (Exit 0) und der reale 3-Turn-Nachweis
  (`features/F34/nachweis-ws1.md`) wurden von mir (nicht von qa) selbst
  ausgeführt und verifiziert.

Status bleibt `IN_ARBEIT` — WS-2 (Sparring-UI, "Als Auftrag anlegen") ist
noch offen, `FEATURE_GATE` erst nach dem vollständigen Feature (Muster
F33/F40).

### WS-2
Reviewer-/QA-Pass am 22.09.2026 (frischer Kontext) für WS-2.

- **code-reviewer:** **„Nicht freigegeben"** im ersten Durchgang — zwei
  kritische Befunde, beide noch in derselben Iteration behoben: (1) die
  geteilten `#chat-senden`/`#chat-zusammenfassen-btn`-Elemente blieben nach
  einem Moduswechsel während eines im Hintergrund laufenden Laufs
  dauerhaft gesperrt (die Freigabe war an `modus === aktiverModus`
  gegattert, ein Lauf im nicht angezeigten Modus konnte die Sperre dadurch
  nie mehr aufheben) — behoben durch Ableiten des Sperrzustands aus
  `zustandJeModus[aktiverModus]` bei JEDEM `renderVerlauf()`, statt eines
  einmaligen, gegatterten Seiteneffekts; Regressionswache in
  `scripts/check-f34-product-coach.mjs` Abschnitt (k). (2) unbestätigte
  Edits im "Als Auftrag anlegen"-Dialog gingen bei einem Re-Render
  während der Bearbeitung (z. B. Poll-Tick eines parallelen Laufs)
  kommentarlos verloren, weil die Eingabefelder nur aus dem Modulzustand
  gerendert wurden, ohne dass Tastatureingaben dorthin zurückgespiegelt
  wurden — behoben durch eine `input`-Event-Delegation, die jeden
  Tastendruck sofort (ohne Re-Render) nach `offenerAuftragDialog`
  spiegelt. Nach beiden Fixes real erneut gegen den Gate-Lauf geprüft
  (Abschnitte (i)/(j)/(k) grün).
- **qa:** wurde ohne Bash-Werkzeug aufgerufen (Muster WS-1) — Befunde aus
  Code-Lektüre/Aufrufketten-Verfolgung, keine echten Klick-/HTTP-Tests.
  Bestätigte unabhängig denselben Dialog-Datenverlust-Befund wie
  code-reviewer (dort behoben). Drei weitere, niedrigpriorisierte Befunde:
  ein Moduswechsel verwirft einen offenen Auftrag-Dialog ohne Warnung
  (jetzt als bewusste Grenze dokumentiert, s. u.), kein Schließen-Weg für
  die Erfolgsmeldung des Dialogs (behoben: "Schließen"-Button ergänzt), ein
  offener Dialog kann aus dem Standard-Ausschnitt herausfallen (als
  bewusste Grenze dokumentiert). Bestätigte Escaping (TC-05), Fehlerpfad
  von `POST /api/auftraege` (TC-04) und die Gate-Abschnitte (i)/(j) gegen
  den echten Quelltext als unauffällig.

Zwei der vier QA-Befunde direkt behoben (Erfolgs-Schließen-Button, Dialog-
Datenverlust bereits durch den code-reviewer-Fix miterledigt), zwei als
bewusste, dokumentierte Grenzen belassen (s. "Bekannte Grenzen") statt sie
stillschweigend offen zu lassen (CLAUDE.md-Entscheidungsregel 5).

**Verifikations-Pass (frischer Kontext, nur die beiden kritischen Fixes):**
`code-reviewer` bestätigte beide ursprünglich gemeldeten Bugs als für ihr
konkretes Reproduktionsszenario real behoben, fand aber in derselben
Mechanik zwei angrenzende, real reproduzierbare Lücken, die die erste
Fix-Runde noch nicht schloss: (1) mehrere andere imperative
`setzeSendenSperre`/`setzeAbbrechenZustand`-Aufrufstellen (in
`sendeAktuelleEingabe`, `sendeZusammenfassungAnfrage`,
`initAbbrechenBedienung`) waren nicht auf `aktiverModus` re-geprüft und
konnten transiente Fehlableitungen des Sperr-/Abbrechen-Zustands
verursachen; (2) der "Anlegen"-Handler der Auftrag-Brücke las
`offenerAuftragDialog` erst NACH dem `await legeAuftragAn(...)` — öffnete
der Mensch währenddessen den Dialog eines anderen Eintrags, schrieb die
Fortsetzung das Ergebnis der ersten Anfrage auf den zweiten, neuen Dialog
(falsche `auftragId`/falscher Fehlertext am falschen Eintrag). Beide Funde
in derselben Iteration behoben: `setzeSendenSperre`/`setzeAbbrechenZustand`
vollständig entfernt — Sende-/Zusammenfassen-Sperre UND
Abbrechen-Text/-Sperre werden jetzt AUSSCHLIESSLICH in `renderVerlauf()`
aus `zustand` (`sendenLaeuft`/`ausstehenderLauf`/`abbruchAngefordert`)
abgeleitet, keine zweite Schreibstelle mehr; der Anlegen-Handler friert
`modus`/`schluessel` vor dem `await` ein und verwirft eine inzwischen
fremd gewordene Fortsetzung (`gehoertNochZuDiesemDialog`). Gate-Abschnitte
(k) (verschärft) und (l) (neu) in `scripts/check-f34-product-coach.mjs`,
real grün.

Status bleibt `IN_ARBEIT` bis Stefans Browser-Sichtprüfung (Auftrag-Vorgabe).

### WS-3
Reviewer-/QA-Pass am 22.09.2026 (frischer Kontext) für WS-3.

- **code-reviewer:** „Freigegeben mit Hinweisen", kein Blocker. Kernbefund
  (löst F-613, P2, direkt behoben): die Ressourcen-Erfindungsprüfung und
  die Feature-/Meilenstein-ID-Vergabe hingen am ANGEFRAGTEN `modus`, nicht
  an der tatsächlich vom Modell gelieferten `art` — ein Modell, das seine
  Rolleninstruktion missachtet und im Modus `feature` trotzdem
  `art: 'projekt_entwurf'` liefert, hätte die Existenzprüfung für
  `ressource_id` unbeachtet gelassen UND trotzdem reale IDs bekommen.
  `verarbeiteRollenChatErgebnis` lehnt einen solchen Widerspruch jetzt als
  Vertragsverstoß ab (sichtbarer Fehler-Turn, F-506-Muster), real geprüft
  in Gate-Abschnitt (s). Bestätigte F-611/F-612 als akkurat beschrieben.
  Vier weitere P3/P4-Befunde registriert (F-615…F-617, plus die
  chat.js-Ergänzung zu F-612), keine Blocker.
- **qa:** wurde ohne Bash-Werkzeug aufgerufen (Muster WS-1/WS-2) — Befunde
  aus Code-Lektüre. Fand unabhängig vom code-reviewer denselben
  Kern-Befund wie F-614 (löst F-614, P3, direkt behoben): das
  Verlaufsfenster, das dem Coach als Kontext vorgelegt wird, filterte
  nicht nach Sparring-Unterumschalter — ein Wechsel zwischen `feature`/
  `projekt` mitten im Gespräch ließ frühere Turns des jeweils anderen
  Untermodus ungekennzeichnet in den Kontext einfließen (real beobachtet
  im eigenen Nachweislauf, `features/F34/nachweis-ws3.md`: der
  Projekt-Interview-Coach sah fünf ältere `feature`-Turns aus
  vorangegangenem Dogfooding). `ladeRollenVerlaufsfenster` filtert jetzt
  nach `modus`, real geprüft in Gate-Abschnitt (t). Bestätigte AK12–AK19
  als mit dem Code übereinstimmend, F-611/F-612 als akkurat. Ein weiterer
  Befund (F-617, P3, dokumentiert statt behoben — s. "Bekannte Grenzen"):
  zwei registrierte, aber noch nicht gebaute Projekt-Entwürfe können vor
  dem Bau des ersten dieselbe Feature-/Meilenstein-Nummer erhalten.

Beide kritischen Funde (F-613, F-614) in derselben Iteration behoben und
real gegen den Gate-Lauf geprüft (Abschnitte (s)/(t) neu, alle übrigen
Abschnitte unverändert grün). Die verbleibenden P3/P4-Befunde
(F-615/F-616/F-617, F-612-Ergänzung) sind bewusst als Findings statt als
Sofort-Fixes behandelt — keiner ändert das Kernverhalten, alle sind
kosmetisch oder seltene Randfälle (CLAUDE.md-Entscheidungsregel 5:
Entscheidung dokumentiert, nicht stillschweigend liegen gelassen).

### Korrekturrunde (Verifikation Challenger, 22.09.2026)

Eine unabhängige Verifikation fand einen weiteren realen Fehler und ließ
F-611/F-612 (bis dahin nur dokumentiert) nachträglich beheben:

- **F-618** (neu, `BUG`, P2, **erledigt**): der Schritt-0-Doku-Nachzug
  hatte `docs/projekt/roadmap.json`s `M5.features` nicht nachgezogen —
  weder die neue Reihenfolge (E-M5-13) noch `F41` selbst waren dort
  gelistet. `vergebeFeatureIds` konnte `F41` dadurch im realen
  WS-3-Nachweis nicht als belegt erkennen und vergab sie an ein anderes
  Vorhaben — real kollidierend mit dem für "Neues Projekt anlegen"
  (E-M5-14) geplanten Feature F41 (Mechanismus selbst korrekt, Lücke lag
  im Doku-Nachzug). `roadmap.json` korrigiert (`M5.features` trägt F41
  jetzt explizit, Reihenfolge E-M5-13/14); der Nachweis-Auftrag `1b3412a8…`
  bleibt als reales, dokumentiertes Negativbeispiel stehen und darf
  NIEMALS geroutet/gestartet werden. Neuer Gate-Abschnitt (u): gegen die
  reale `roadmap.json` vergibt `vergebeFeatureIds` für denselben Entwurf
  jetzt real `F42`, nie `F41`.
- **F-611** (`erledigt`): Auftragstitel im Modus `erweiterung` kommt jetzt
  aus den Titeln der neuen Meilensteine (`"Erweiterung: <Titel>"`), nicht
  mehr aus der unveränderten Gesamt-`vision`.
- **F-612** (`erledigt`): ein vom Coach selbst mitgelieferter, ID-artiger
  Titel-Präfix (`^\s*[MF][0-9]+[A-Za-z]?\s*[—–:-]\s*`) wird jetzt vor dem
  Voranstellen der echten ID entfernt — in `baueAuftragAusProjektentwurf`
  (Server + Browser-Kopie, weiterhin byte-identisch geprüft) UND in
  `views/chat.js` (`renderProjektMeilenstein`, per QA-Ergänzung als zweite
  Fundstelle mitbehoben, `entferneIdPraefix` aus der Browser-Kopie
  importiert statt dupliziert).

**Verifikations-Pass (frischer Kontext) auf diese Korrekturrunde selbst:**
„Nicht freigegeben" im ersten Durchgang — der Kernbefund traf zu: F-611/
F-612 standen in `state/findings.md` weiterhin auf `offen` (Widerspruch zu
den hier oben behaupteten Fixes), und die einzige damalige Prüfung war
Abschnitt (q)s reiner Server/Browser-Gleichheitsvergleich gegen die
UNVERÄNDERTE alte Fixture (`"Design-Phase vor F30"`, kein ID-artiger
Präfix) — der eigentliche F-611/F-612-Fall (ein Titel MIT ID-Präfix,
Titel aus Meilenstein statt `vision`) lief nie durch eine ausführende
Prüfung, nur durch eine Herleitung am Schreibtisch. Beides behoben: (1)
`state/findings.md` F-611/F-612 auf `**erledigt**` inkl. `Status:`-Zeile
korrigiert; (2) `entferneIdPraefix` exportiert und in `src/product-coach/
product-coach.test.ts` direkt getestet (6 Tests: Präfix-Varianten,
Negativfälle, bekannte Grenze F-619), zusätzlich 6 neue Tests für
`baueAuftragAusProjektentwurf` gegen ein Fixture MIT ID-Präfix (Muster
`vergebeFeatureIds` → reale ID → Rendering, wie im echten Pfad); (3)
Gate-Abschnitt (q) um eine zweite Fixture (ID-Präfix im Meilenstein- UND
Feature-Titel) sowie explizite Korrektheitsprüfungen (keine Dopplung,
Titel-Quelle) erweitert — ein Gleichheitsvergleich allein hätte "beide
Kopien gleich falsch" nicht gefangen. Dabei ein weiterer, kleiner Befund
registriert: **F-619** (`TECH_DEBT`, P3, offen, bewusst nicht behoben) —
`entferneIdPraefix` bereinigt einen Titel nur mit Trenner nach der ID
(`"M6 — …"`), ein Titel, der EXAKT der ID ohne Trenner ist (`"M6"`), bleibt
unbereinigt; als bekannte, kommentierte Grenze akzeptiert statt das Muster
ohne echten Bedarf zu verkomplizieren.

Alle vier Fixes (F-611, F-612, F-618, plus die Testabdeckungs-Korrektur)
real gegen den Gate-Lauf geprüft (Abschnitt (q) erweitert, (u) neu, alle
übrigen Abschnitte unverändert grün, 12 neue + bestehende Unit-Tests in
`product-coach.test.ts` grün); kein erneuter Interview-Lauf nötig
(`features/F34/nachweis-ws3.md` Nachtrag 2).

Status bleibt `IN_ARBEIT` bis Stefans Abnahme (Auftrag-Vorgabe: Auftrag nur
anlegen, nicht routen/starten).

## Dependencies
- F17 (Rollenvertrag) — `ROLLENVERTRAEGE`, `loeseAusfuehrungsEingabenAuf`
  (Startzeit-Durchsetzung, WS-2), gemeinsam mit `jarvis` geprüft.
- F19 (Capability Foundation) — `F346_AUSNAHMEN`
  (`src/capabilities-ansicht/index.ts`) trägt jetzt eine fünfte,
  `product-coach`/`claude-code` benannte Ausnahme (STRUCTURED_OUTPUT),
  Muster `jarvis`.
- F26 (Jarvis Chat v1) / F31 WS-2 (Gesprächsgedächtnis) — `baueAuftragstext`-
  Muster (F-269, Rolleninstruktion als einziger Eingabekanal),
  `waehleVerlaufsfenster` (unverändert wiederverwendet, keine Kopie).
- F33 (Projektkontext & Roadmap) — `baueProjektkontextAnfragen`/
  `filtereExistierendeAnfragen`, unverändert für `product-coach`
  mitgenutzt.
- F22 (Click-to-Work) — Zielpfad für `baueAuftragAusScope`s Rohmaterial
  (`POST /api/auftraege`), tatsächlich verdrahtet erst in WS-2.

## Bekannte Grenzen
- **`entferneIdPraefix` bereinigt einen Titel nur mit Trenner nach der ID
  (WS-3 Korrekturrunde, Code-Review-Befund, F-619):** das Muster
  `^\s*[MF][0-9]+[A-Za-z]?\s*[—–:-]\s*` verlangt zwingend einen der
  Trenner —/–/:/- — ein Titel, der EXAKT der ID ohne jeden Trenner ist
  (z. B. `titel: "M6"`), bleibt unbereinigt und erzeugt weiterhin
  `"M6 — M6"`. Seltener als der ursprünglich beobachtete Fall (ein Trenner
  ist der Normalfall für einen plausibel geratenen ID-Präfix); bewusst
  nicht behoben, um das Muster ohne echten Bedarf nicht zu verkomplizieren.
- **Zwei registrierte, aber noch nicht gebaute Projekt-Entwürfe können
  dieselbe Feature-/Meilenstein-Nummer erhalten (WS-3, QA-Pass-Befund,
  F-617):** `vergebeFeatureIds` liest `features/<id>/` und `roadmap.json`
  nur zur Laufzeit des jeweiligen Sparring-Turns — es reserviert keine
  Nummer im Voraus. "Als Auftrag anlegen" registriert nur (kein
  automatisches Routen/Bauen), daher können zwei nacheinander erzeugte
  Projekt-Entwürfe vor dem Bau des ersten real dieselbe `F<n>`/`M<n>`
  zugewiesen bekommen (real im eigenen Nachweis, `features/F34/
  nachweis-ws3.md`, beobachtet: die zufällig geratene "F41" des Demo-Laufs
  überschneidet sich nummerisch mit dem für F41 "Neues Projekt anlegen"
  geplanten, aber noch nicht gebauten Feature). Akzeptiert statt eines
  Reservierungsmechanismus — ein echter Konflikt würde beim Bauen des
  zweiten Entwurfs ohnehin sichtbar (`features/<id>/` existiert bereits).
- **Ein Moduswechsel verwirft einen offenen "Als Auftrag anlegen"-Dialog
  ohne Warnung (WS-2, Reviewer-/QA-Pass-Befund):** `initModusUmschalter`
  setzt `offenerAuftragDialog` beim Wechsel bedingungslos auf `null` —
  unbestätigte Edits gehen dabei verloren, ohne Rückfrage/Undo. Ein
  Re-Render IM SELBEN Modus (Poll-Tick, paralleler zweiter Turn) verliert
  die Edits seit dem Reviewer-Fix NICHT mehr (Live-Spiegelung der
  Eingabefelder nach `offenerAuftragDialog`, `initAuftragBruecke`) — nur der
  bewusste Moduswechsel selbst bleibt ein harter Reset. Akzeptiert statt
  einer eigenen Bestätigungs-UX (Scope-Erweiterung über den Auftrag hinaus).
- **Ein offener Auftrag-Dialog kann aus dem Standard-Ausschnitt
  herausfallen (WS-2, QA-Pass-Befund):** `berechneStandardAusschnitt` zeigt
  nur die letzten zwei Einträge (bzw. ab der letzten Zusammenfassung) — nach
  zwei weiteren Turns verschwindet ein Eintrag mit offenem Dialog optisch,
  ohne dass der Dialog-Zustand zurückgesetzt wird ("Ganzen Verlauf öffnen"
  holt ihn wieder sichtbar). Kein Datenverlust, nur potenziell verwirrend;
  akzeptiert statt einer Sonderregel in `berechneStandardAusschnitt`.
- **Kein Gesprächsgedächtnis-Zusammenfassen für `product-coach` (WS-1,
  bewusst):** ein sehr langes Sparring-Gespräch verliert ältere Turns über
  dasselbe Fenster-Verwerfen wie `jarvis` vor F31 WS-2 (`waehleVerlaufsfenster`
  ohne gepinnten Zusammenfassungs-Turn) — kein `POST
  /api/sparring/zusammenfassen`, explizites Nicht-Ziel dieser Iteration.
- **Kein Realtest mit echtem Codex-Worker (WS-1):** der reale
  3-Turn-Nachweis (AK6) lief mit dem verfügbaren Worker dieser Umgebung;
  ein Codex-Lauf über `--output-schema` ist strukturell durch dieselbe
  Worker-Auflösung wie `jarvis` abgedeckt (Muster, kein neuer Mechanismus),
  aber nicht gesondert real durchgespielt.
- **Kein Test für die D13-Sperre unter echter Nebenläufigkeit
  (QA-Pass-Befund, F-607, repo-weit, nicht F34-spezifisch):** kein Gate
  feuert zwei tatsächlich überlappende Requests gegen denselben
  D13-geschützten Endpunkt; die synchrone Codestruktur macht eine Race
  praktisch ausgeschlossen, aber unbewiesen bleibt unbewiesen.
- **Whitespace-only-Strings bestehen `istNichtLeererString` (QA-Pass-Befund,
  F-608, seit F26 bestehendes, geteiltes Verhalten mit `jarvis`, keine
  F34-Regression):** ein Feld wie `alternativen[].titel` mit reinem
  Leerzeichen-Inhalt validiert fälschlich als gültig.
- **Die schnellere `MAX_THINKING_TOKENS '0'`-Konfiguration (WS-2, V1)
  findet niedrigpriorisierte Findings seltener als die ungetunte Referenz
  (F-610):** real beobachtet an `state/findings.md` F-596 (P3), das nur die
  V0-Referenz fand — `docs/projekt/kontext/lagebild.md` speist nur offene
  P1-Findings ein, die eigenständige Recherche, die F-596 sonst gefunden
  hätte, wird durch die Latenzoptimierung reduziert. Kein Korrektheitsfehler
  (die Qualitätsschwelle aus dem Auftrag — reale Fundstellen + Abgrenzung —
  bleibt erfüllt), aber eine reale, dokumentierte Grenze.
- **"Als Auftrag anlegen" verlinkt auf `#/projekt`, nicht auf eine
  Workboard-Karte (WS-2, bewusste Interpretation):** der Auftrag-Wortlaut
  nennt "Link/Navigation zum Auftrag im Workboard" — ein frisch angelegter
  Auftrag ist aber kein Workboard-Workitem im F21-Sinn (Findings/
  Feature-Akten/Failed-Runs/Capability-Gaps, keine rohen Aufträge); `#/projekt`
  ist die reale Aufträge-Übersicht (`views/projekt.js`, `ladeAuftraege()`),
  in der der neue Auftrag tatsächlich erscheint. Entscheidung dokumentiert
  statt stillschweigend (CLAUDE.md-Entscheidungsregel 5).
- **Kein eigener Browser-Sichttest durch die KI (WS-2, Auftrag-Vorgabe) —
  ÜBERHOLT, s. F-622:** `npm run check` (inkl. Gate) war grün, ein
  Node-Smoke-Test bestätigte fehlerfreie Auslieferung — die eigentliche
  visuelle/interaktive Prüfung machte Stefan selbst. Genau diese Grenze
  ließ zwei real sichtbare Bugs (F-620, F-621: Umschalter-Hervorhebung
  wechselt nie; Unterumschalter bleibt im falschen Modus sichtbar) bis zur
  manuellen Sichtprüfung (WS-3 Korrekturrunde, 23.09.2026) unentdeckt —
  keine Quelltext-Prüfung kann eine CSS-Kaskadeninteraktion oder eine
  fehlende `classList`-Mutation bei korrekt gesetztem Attribut finden.
- **UI-Workstreams ohne Render-Nachweis vor Übergabe (WS-2/WS-3, F-622,
  PROCESS_IMPROVEMENT, ERLEDIGT — keine offene Grenze mehr):** WS-2 und WS-3
  wurden an Stefan übergeben, ohne die Seite je gerendert zu haben — mehrere
  Reviewer-/QA-Pässe und grüne `npm run check`-Läufe liefen dazwischen, ohne
  F-620/F-621 zu finden. Ab der WS-3-Korrekturrunde liegt für diesen
  Feature-Pfad ein echter Headless-Render-Nachweis vor (Playwright,
  `features/F34/nachweis-ws3.md` Teil (c)). Entscheidung Stefan
  (23.09.2026): verbindliche Harness-Regel — `npm run render-nachweis`
  (`scripts/render-nachweis.mjs`, generisch: URL + Klickfolge-JSON) ist jetzt
  Teil der `CLAUDE.md`-Definition of Done für UI-Workstreams, s.
  `state/findings.md` F-622.
