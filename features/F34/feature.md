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
- Ein eigener View/eine eigene Route für das Sparring im Leitstand (WS-1)
  — nur der Backend-Pfad (Rolle, Schema, Endpunkte). Eine sichtbare
  Sparring-Ansicht ist WS-2.
- "Als Auftrag anlegen"-Bedienelement im Chat/Sparring (WS-1) — löst
  `state/findings.md` F-606 erst in WS-2; WS-1 liefert nur die reine
  Funktion `baueAuftragAusScope`, die WS-2 aufrufen kann.
- `POST /api/sparring/zusammenfassen` — kein Gesprächsgedächtnis-
  Zusammenfassen für `product-coach` in WS-1 (Muster F31 WS-2, ausschließlich
  für `jarvis` gebaut); ein Sparring-Gespräch ist kürzer und zielgerichteter
  als ein offener Chat, ein Zusammenfassungs-Pfad ist kein Teil dieses
  Auftrags.
- Ein Schreibpfad, der aus einem Scope-Entwurf automatisch einen
  registrierten `AUFTRAG_V0` macht — `baueAuftragAusScope` liefert nur
  Rohmaterial (`{ titel, auftragstext }`), die tatsächliche Registrierung
  (`POST /api/auftraege`) bleibt eine bewusste, vom Menschen ausgelöste
  Aktion (WS-2, F-606).
- Neue Kontextdatei-Typen oder eine zweite Context-Builder-Einspeisung —
  `product-coach` bekommt denselben Projektkontext wie `jarvis`/`router`
  über die bestehende `baueProjektkontextAnfragen` (F33), unverändert.
- Neue Werkzeugsätze oder eine dritte Werkzeugsatz-Art — `product-coach`
  ist `lesend`-only, Muster `jarvis`/`router`.

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
- **WS-2 — Sparring-UI + "Als Auftrag anlegen" (noch nicht begonnen).**
  Eine sichtbare Sparring-Ansicht im Leitstand und ein Bedienelement, das
  bei `art: 'scope_entwurf'` über `baueAuftragAusScope` + `POST
  /api/auftraege` einen echten Auftrag anlegt — löst `state/findings.md`
  F-606 (identischer Mechanismus fehlt heute auch für Jarvis'
  `auftrag_vorschlag`, F34 WS-2 sollte beide Fälle mit derselben
  UI-Komponente lösen, statt zweimal).

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
  `mcpConfig`/`disallowedTools` wie `jarvis`, aber OHNE
  `MAX_THINKING_TOKENS '0'` (Sparring braucht das Denkbudget). Worker-
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

## Feature Review
Reviewer-/QA-Pass am 22.09.2026 (frischer Kontext, Muster CLAUDE.md/F33/F40)
für WS-1 (dieser Auftrag).

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
- **Kein Gesprächsgedächtnis-Zusammenfassen für `product-coach` (WS-1,
  bewusst):** ein sehr langes Sparring-Gespräch verliert ältere Turns über
  dasselbe Fenster-Verwerfen wie `jarvis` vor F31 WS-2 (`waehleVerlaufsfenster`
  ohne gepinnten Zusammenfassungs-Turn) — kein `POST
  /api/sparring/zusammenfassen`, explizites Nicht-Ziel dieser Iteration.
- **`baueAuftragAusScope` ist nicht an einen Schreibpfad angeschlossen
  (WS-1, bewusst):** die Funktion existiert und ist getestet, aber kein
  Endpunkt und keine UI rufen sie auf — das schließt `state/findings.md`
  F-606 erst WS-2.
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
