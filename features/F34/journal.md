# Journal — F34

Anhängeprotokoll. Neue Einträge unten anfügen, bestehende nicht ändern.

## 2026-09-22 — WS-1 gebaut (Sparring-Backend), Status IN_ARBEIT

Rolle `product-coach` (`src/rollen/index.ts`, Muster `jarvis`: lesend,
beide Worker, eigenes Ausgabeschema `ergebnis-product-coach`).
`schemas/ergebnis-product-coach.schema.json` im Codex-Dialekt (F-423-Muster
`ergebnis-jarvis.schema.json`): kein `oneOf`/`allOf`/`if`, jede
`properties`-Eigenschaft in `required`, Optionales als Typ
`[...,"null"]`. `src/product-coach/index.ts`
(`validiereErgebnisProductCoach`, `baueCoachAuftragstext`,
`baueAuftragAusScope`) — die Kopplung (`art`↔`alternativen`/`scope`, `art
'alternativen'` ⇒ mindestens zwei Einträge) ausschließlich im Validator,
nicht im Schema.

Server: `starteJarvisChatLauf` auf eine Rollenkonfiguration parametrisiert
(`KONFIGURATION_JARVIS`/`KONFIGURATION_PRODUCT_COACH`, Funktion umbenannt zu
`starteRollenChatLauf`) statt für `product-coach` wörtlich kopiert (D5) —
ebenso `leseJarvisErgebnisAusLaufakte`/`verarbeiteJarvisChatErgebnis`/
`schreibeJarvisChatFehlerEintrag` auf gemeinsame, konfigurationsgetriebene
Funktionen zurückgeführt, die alten Exportnamen bleiben als dünne
Jarvis-Wrapper erhalten (Regressionsschutz für `scripts/check-f26-jarvis.mjs`/
`scripts/check-f31-gedaechtnis.mjs`, beide unverändert importiert). Zwei
benannte Konstanten statt eines über Rollennamen indizierten Objekts — ein
Objekt hätte `scripts/check-f17-rollenvertrag.mjs` AK1 ("keine zweite
Rollenliste") als Fund gemeldet, real während des Baus aufgetreten und
behoben.

`POST /api/sparring`/`GET /api/sparring`: Body nur `{ nachricht }`, gleiche
Prüfungen/Obergrenze (8000 Zeichen) wie `POST /api/chat`, Lineage
`sparring-<projektId>`. Kein `POST /api/sparring/zusammenfassen` (explizites
Nicht-Ziel, siehe `feature.md`). GET-Projektion in
`scripts/leitstand/routen-sparring.mjs` (`baueSparringVerlaufsProjektion`,
Muster `routen-roadmap.mjs`), POST-Dispatch bleibt im Server (braucht die
D13-Closure-Sperre `laufAktiv`). `public/leitstand/api.js`:
`sendeSparringNachricht`/`holeSparringVerlauf` (Muster
`sendeChatNachricht`/`holeChatVerlauf`+`holeJsonOderWirf` mit Zeitlimit).

F19: `F346_AUSNAHMEN` (`src/capabilities-ansicht/index.ts`) um eine fünfte
Ausnahme `product-coach`/`claude-code`/`STRUCTURED_OUTPUT` ergänzt (Muster
`jarvis`) — `claude-code` hat weiterhin keinen `--output-schema`-Mechanismus.

Gate `scripts/check-f34-product-coach.mjs`, in `npm run check` eingehängt.

Finding `state/findings.md` F-606 registriert (Jarvis' `auftrag_vorschlag`
wird im Chat nirgends verarbeitet — kein Weg zu einem F22-Auftrag; Maßnahme
F34 WS-2).

`docs/STATUS.md`/`features/F32/feature.md`: F32 Status `FEATURE_GATE` →
`ABGESCHLOSSEN` nachgezogen (Abnahme Stefan 22.09.2026 nach #218, F-603
bereits vorher behoben) — Teil des Auftrags-Vorlaufs, kein F34-Inhalt.

Nicht Teil dieses Workstreams: Sparring-UI, "Als Auftrag anlegen"-Button
(F-606-Fix), `POST /api/sparring/zusammenfassen` — alle drei explizit WS-2/
Nicht-Ziel.

## 2026-09-22 — Reviewer-/QA-Pass (frischer Kontext), zwei Befunde direkt behoben

`code-reviewer` „Freigegeben mit Hinweisen": F-506-Fehlerpfad
(`fehlerArt`/`fehlerAntwortPraefix`) war für `product-coach` ungetestet —
Abschnitt (h) in `scripts/check-f34-product-coach.mjs` ergänzt (Muster
`check-f31-gedaechtnis.mjs` (j)), real grün. `leseCoachErgebnisAusLaufakte`/
`verarbeiteCoachSparringErgebnis` waren unbenutzte Exporte — entfernt
(YAGNI), Kommentar in `scripts/leitstand/routen-sparring.mjs` korrigiert.

`qa` (ohne Bash-Werkzeug aufgerufen, daher keine eigenen Live-Tests —
Befunde aus Code-Lektüre): keine funktionalen Defekte. Zwei neue Findings,
beide P4/`TECH_DEBT`, kein Blocker: F-607 (kein Test für die D13-Sperre
unter echter Nebenläufigkeit, repo-weite Lücke) und F-608
(`istNichtLeererString` akzeptiert Whitespace-only-Strings, seit F26
bestehendes Verhalten). Beide in `state/findings.md` registriert, nicht in
dieser Iteration behoben.

`npm run check` nach beiden Fixes erneut geprüft → Exit 0. `node
scripts/erzeuge-lagebild.mjs` erneut gelaufen (state/findings.md geändert).

Status bleibt `IN_ARBEIT` (WS-2 offen).
