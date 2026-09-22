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

## 2026-09-22 — WS-2 gebaut (Latenz-A/B, Sparring-UI, Chat→Auftrag-Brücke), Status weiterhin IN_ARBEIT

Finding `state/findings.md` F-609 registriert (Sparring-Latenz 60–89 s
gegen Jarvis' ~12 s), dann als erste Handlung dieses Workstreams real
A/B-gemessen — VOR jeder UI-Arbeit, wie im Auftrag verlangt.

**Latenzmessung** (`features/F34/nachweis-ws2-latenz.md`): vier Varianten,
dieselben drei Nachrichten wie `nachweis-ws1.md`, je Variante eine frische,
isolierte Sparring-Kette (eigener `basisVerzeichnis`, Muster
`kontrollzustand-test-*`). V0 (Referenz) 67,1 s Median, V1
(`MAX_THINKING_TOKENS '0'`) 8,2 s, V2 (Lese-Obergrenze in der
Rolleninstruktion) 46,1 s, V3 (beides kombiniert) 30,7 s. V1 übernommen —
schnellste Variante, erfüllt die im Auftrag definierte Qualitätsschwelle
(reale Fundstellen + Abgrenzung vorhanden). Nebenbefund: V1/V2/V3 finden —
anders als V0 — `state/findings.md` F-596 nicht (P3-Finding, nicht in
`lagebild.md`, das nur P1 einspeist) — als F-610 (P3) registriert, kein
Blocker.

**Sparring-UI** (`public/leitstand/views/chat.js`, vollständig auf
`MODI`/`zustandJeModus` parametrisiert statt einer zweiten Kopie, D5):
"Jarvis"/"Sparring"-Umschalter (`localStorage`-Präferenz, try/catch), jeder
Modus pollt unabhängig weiter, auch wenn der andere gerade angezeigt wird.
Rendering nach `art`: `alternativen` als Liste, `scope_entwurf`
strukturiert (sieben Abschnitte) — beide über `escapeHtml`.

**Chat→Auftrag-Brücke** (löst `state/findings.md` F-606): "Als Auftrag
anlegen" bei Sparring `art: 'scope_entwurf'` (`baueAuftragAusScope`) und
Jarvis `art: 'auftrag_vorschlag'` (`auftrag.titel`/`auftrag.text`
direkt) — `public/leitstand/auftrag-aus-scope.js` ist eine reine JS-Kopie
von `src/product-coach/index.ts`s `baueAuftragAusScope` (kein Build-Schritt
im Leitstand, ein Browser kann `.ts` nicht laden); Gleichheit real geprüft
(`scripts/check-f34-product-coach.mjs` (i), drei Fixtures). Klick öffnet
eine editierbare Bestätigung, erst "Anlegen" ruft `POST /api/auftraege`
(`legeAuftragAn`, bestehender F12-Pfad) — kein automatisches Anlegen, kein
Routen/Starten. Erfolg verlinkt auf `#/projekt` (reale Aufträge-Übersicht —
ein frischer Auftrag ist kein Workboard-Workitem im F21-Sinn, Entscheidung
in "Bekannte Grenzen" dokumentiert statt stillschweigend getroffen).

Gate `scripts/check-f34-product-coach.mjs` um Abschnitte (i)
(`baueAuftragAusScope`-Gleichheit) und (j) (statische Quelltextprüfung der
Brücke — kein DOM-Test für `chat.js` selbst, Muster F-601: kein
View-Renderer im Repo hat eigene Tests) erweitert. `state/findings.md`
F-606 auf `erledigt`.

Kein eigener Browser-Sichttest durch die KI (Auftrag-Vorgabe: "Browser-
Sichtprüfung macht Stefan danach") — stattdessen `node --check` auf beiden
neuen JS-Dateien und ein Node-Smoke-Test (`index.html`/`views/chat.js`/
`auftrag-aus-scope.js`/`style.css` werden fehlerfrei ausgeliefert).

`npm run check`: siehe Bericht dieses Auftrags für das Gesamtergebnis.
`node scripts/erzeuge-lagebild.mjs` erneut gelaufen (F-609 erledigt,
F-610 neu, F-606 erledigt).

Status bleibt `IN_ARBEIT` bis Stefans Browser-Sichtprüfung.

## 2026-09-22 — Reviewer-/QA-Pass, zwei kritische Befunde behoben, Verifikations-Pass grün

`code-reviewer` (frischer Kontext): **„Nicht freigegeben"** — zwei
kritische Bugs. (1) `#chat-senden`/`#chat-zusammenfassen-btn` sind ein
geteiltes DOM-Element für beide Modi; löste ein im Hintergrund-Modus
laufender Lauf terminal auf, während der ANDERE Modus angezeigt wurde,
übersprang das an `modus === aktiverModus` gegatterte
`setzeSendenSperre(false)` die Freigabe — die Buttons blieben für den Rest
der Sitzung gesperrt, nur ein Reload half. (2) der "Als Auftrag
anlegen"-Dialog rendert Titel/Text aus dem Modulzustand; ein Re-Render
während der Bearbeitung (z. B. Poll-Tick eines parallelen Laufs) überschrieb
laufende Edits kommentarlos.

Beide behoben: (1) die Sende-/Zusammenfassen-Sperre wird seither bei jedem
`renderVerlauf()` aus `zustand.ausstehenderLauf` abgeleitet statt über
einen gegatterten Seiteneffekt gesetzt; `pruefeAusstehendenLauf` ruft
`renderVerlauf()` seither unconditional (rendert immer `aktiverModus` mit
dessen eigenem, korrektem Zustand — harmlos für einen Hintergrund-Modus).
(2) ein `input`-Listener spiegelt jeden Tastendruck in
`#chat-auftrag-titel`/`#chat-auftrag-text` sofort nach
`offenerAuftragDialog`, ohne `renderVerlauf()` auszulösen. Zusätzlich:
"Schließen"-Button für den Dialog-Erfolgszustand ergänzt (`qa`-Befund).
Neue Findings F-607/F-608 aus dem WS-1-Pass waren bereits registriert;
zwei neue, niedrigpriorisierte `qa`-Befunde (Moduswechsel verwirft
offenen Dialog ohne Warnung; Dialog kann aus dem Standard-Ausschnitt
fallen) als bewusste Grenzen in `feature.md` dokumentiert statt behoben
(CLAUDE.md-Entscheidungsregel 5).

**Verifikations-Pass** (frischer Kontext, nur die beiden Fixes geprüft):
`code-reviewer` bestätigte beide Bugs für ihr konkretes
Reproduktionsszenario als behoben, fand aber zwei angrenzende Lücken in
derselben Mechanik: mehrere andere `setzeSendenSperre`/
`setzeAbbrechenZustand`-Aufrufstellen waren nicht `aktiverModus`-sicher
(transiente Fehlableitung möglich); der Anlegen-Handler der Auftrag-Brücke
konnte ein Ergebnis auf einen inzwischen fremden, neu geöffneten Dialog
schreiben (Objekt-Spread nach dem `await`, keine erneute
Zugehörigkeitsprüfung). Beide behoben: `setzeSendenSperre`/
`setzeAbbrechenZustand` vollständig entfernt — jeder Button-Zustand
(Sende-/Zusammenfassen-Sperre, Abbrechen-Text/-Sperre) hat jetzt genau
EINE Ableitungsstelle in `renderVerlauf()` (neues `zustand.sendenLaeuft`-
Flag für das schmale Zeitfenster vor `ausstehenderLauf`); der
Anlegen-Handler friert `modus`/`schluessel` vor dem `await` ein und
verwirft eine fremd gewordene Fortsetzung (`gehoertNochZuDiesemDialog`).
Gate-Abschnitt (k) verschärft, (l) neu ergänzt — beide grün.

`npm run check`: siehe Bericht dieses Auftrags für das Gesamtergebnis.

Status bleibt `IN_ARBEIT` bis Stefans Browser-Sichtprüfung.
