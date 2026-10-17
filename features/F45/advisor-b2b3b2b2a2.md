# Advisor-Pass B2b-3b-2b-2a-2 „Rückfrage-Kanal: Oberfläche“

Stand 17.10.2026. Geprüft: Plan v1 `features/F45/plan-b2b3b2b2a2.md` (Branch `f45/b2b3b2b2a2-anzeige`), frischer Kontext
(Subagent `architecture-advisor`). Bericht unverändert übernommen.

**Ergebnis vorab:** Plan v1 als Ganzes (A + B) **nicht freigegeben** — zu groß, Teil A mit vier Entwurfslücken (V1–V4) und einer
kleinen (V6). **Teil A allein** (vorab freigegebener Schnitt): **Freigegeben mit Hinweisen**, wenn Plan v2 V1–V4 und V6 aufnimmt.

## Kopf
Geprüfte Quellen: Plan v1, `plan-b2b3b2b2a-v2.md`, `plan-b2b3b2b2a.md` (Z. 112–121), `docs/projekt/fixpaket-f45.md` (Z. 101–102);
`state/findings.md` F-1126, F-1128, F-1131, F-1132; ARCHITECTURE §1 (Z. 32), §3 (Z. 116–156), §4 (Z. 161); `scripts/leitstand-server.mjs`
(694–829, 949–962, 4115–4270, 6029, 6363–6369, 6800–6890, 7600–7668, 7995–8035, 8340–8460, 8560–8590, 8700–8742, 9150–9212,
13100–13445); `scripts/leitstand/rueckfrage-vermittlung.mjs`, `scripts/_rueckfrage-aus-pruefung.mjs` (vollständig); Gates
`check-f21-ws2-workboard-oberflaeche.mjs`, `check-wachstumsbremse-server.mjs`, `wachstumsbremse-server.json` (vollständig),
`check-f20-zustand-poll.mjs`, `check-f45-b2b3b2b2a-einschalten.mjs`, `rueckfrage-einschalten(.test).mjs` (Grep); Oberfläche
`attention-daten.js`, `views/attention.js`, `zustand.js`, `start-hinweis.js`, `typ-chip.js`, `entscheidungen-zaehler.js` (vollständig),
`api.js`, `index.html` (Teile); Kern `src/result-evaluator/index.ts` (404–461), `src/execution-controller/index.ts` (383–527, 600–700),
`src/rueckfrage/index.ts` (50–55), `rueckfrage-mcp.mjs:154`; `biome.json`, `package.json`.

Rollengrenze: nur Read/Grep/Glob. Nicht ausgeführt: `npm run check`, Gates, Tests, Messungen; kein Vergleich gegen main (kein Git);
kein Browser (ob `Sec-Fetch-Site: same-origin` über den Dispatcher ankommt); nicht gemessen, wie lange nach Laufstart
`kontrollzustand/<laufId>` fehlt (V6); `views/lauf-detail.js`, `sichtung-anzeige.js`, `views/workflows.js` nur per Grep (Teil B).

## Befunde: vor dem Bau zu klären (Teil A)
**V1** Viertes Argument von `baueEntscheidungen`: „undefined = Gruppe nicht vorhanden“ widerspricht „undefined = lädt“.
[Fakt] `zaehleJeFilter` meldet undefined, sobald eine Gruppe undefined ist (`attention-daten.js:127-131`); `alleLeer` verlangt alle Listen
geladen und leer (`:283-291`); `views/attention.js:266-269` verbirgt bei `alleLeer` die Liste; Plan A3 nutzt undefined doppelt (Z. 41/47).
[Schlussfolgerung] Ohne Argument zeigen „Alle“/„Rückfragen“ dauerhaft „–“; zählt `alleLeer` die Gruppe nicht, liegt eine wartende Rückfrage
hinter „alles geklärt“; „Kanal aus“ als `[]` ergibt eine neue Quellenzeile. Abhilfe: vier Zustände (Schlüssel fehlt / undefined / null /
Liste); `zaehleJeFilter`, `alleLeer`, `defekt`, `QUELLEN` nur über vorhandene Gruppen; Kanal aus ⇒ Schlüssel fehlt, an ohne Lauf ⇒ `[]`;
Tests: Aufrufer ohne viertes Argument bitgleich (`dashboard.js:504`, `produkte-anzeige.js:115`, `chat-anzeige.js:113`,
`live-daten.js:223`, `fokus-daten.js:40`, `entwicklung-daten.js:179/241`).

**V2** innerHTML-Neuzeichnen löscht Eingaben, die Restzeit erzwingt es alle 2 s. [Fakt] `views/attention.js:104-108` (Schreiben bei
geändertem Text), `renderGruppe` `:200-212`; Plan Z. 50, 59. [Schlussfolgerung] Freitext, Fokus, angefangene Eingabe gehen je Takt
verloren. Abhilfe: stabiles DOM je Rückfrage-id (nur bei geänderter id-Menge hinzufügen/entfernen), Restzeit in eigenem Element per
`textContent`, Knöpfe beim Senden sperren; reine Render-Funktionen dürfen bleiben (Karte einmal bauen, Restzeit getrennt).

**V3** Gate f21-ws2 (f) wird nicht wörtlich gebrochen, aber ausgehöhlt. [Fakt] (f) prüft nur das Literal `method: 'POST|…'` in
`views/attention.js` (`check-f21-ws2-workboard-oberflaeche.mjs:176-185`); „aus api.js nur hole*“ nur für dashboard/workboard-detail
(`:202-213`); Kopf `views/attention.js:34-36` „Keine Schreibaktion“; Plan Z. 132 „Teil A: keines“. Sauber: Schreibweg nur in
`public/leitstand/rueckfrage-kanal.js` mit eigenem delegierten Listener auf `#attention-kanal`; `attention.js` importiert nichts
Schreibendes; Gate (f) erweitert mit Rot-Kalibrierung (attention.js aus api.js nur `hole*`; einziger Schreiber der Kanal-Gruppe ist
rueckfrage-kanal.js über `sendeRueckfrageAntwort`); Ausnahme im Kopf und in der Gate-Doku benannt ⇒ geändertes Bestands-Gate.

**V4** Signal einer wartenden Rückfrage fehlt außerhalb „Deine Entscheidungen“. [Fakt] Band mit festem Text ohne Anzahl (Z. 62–64),
Navigationszahl ohne Kanal (Z. 48–49); Abnehmer laufen synchron im Takt (`zustand.js:126-132`), der Kanal-Abruf antwortet danach.
[Schlussfolgerung] Im Chat oder auf der Workflow-Seite bemerkt Stefan die Rückfrage nicht ⇒ Ablehnung nach 10 min; F-1132 (3) bleibt
teilweise. Empfehlung **ja zur Kanal-Zahl**, ohne zweiten Abruf: `rueckfrage-kanal.js` mit eigenem `abonniere` für attention.js,
`entscheidungen-zaehler.js:34-53` und das Band; Band bei N > 0 „N Rückfrage(n) warten, nächste Frist mm:ss“ mit Link `#/attention`,
sonst schlanke Zeile „Kanal an“ (design-guardian).

**V6** Instanz des aktiven Laufs: trägt, aber „Präfix je laufId merken“ zu früh, Register-Abruf ohne Zeitlimit. [Fakt, entlastend]
Live-Projekte im selben `projekte`-Array (`:8738`, `:8581-8590`); Selbsteintrag = derselbe Handler (`:13145-13147`);
`globalerLaufZustand` geteilt (`:13364`, `:9194`). [Fakt] `laufAktiv` hängt an `existsSync(join(basis, laufId))` (`:8585`); `aktiv` wird
vor dem Laufstart gesetzt (`:7623`), Kontextpaket unter `lineage-…` (`:7649-7651`); Projekt-Anlage setzt `aktiv = true, laufId = null`
(`:8701-8702`). [offene Unsicherheit] ob zwischen `aktiv = true` und `<basis>/<laufId>` ein Takt liegt. Abhilfe: nur einen Treffer merken,
ohne Treffer `/api` nur für diesen Takt; `laufId === null` = kein aktiver Lauf. [Fakt] `holeProjekte` ohne Zeitlimit (`api.js:192`) ⇒
Variante mit `AbortSignal.timeout(POLL_ZEITLIMIT_MS)`.

## Befunde: mitlaufend
**M1** `rueckfrageKanal` in `/api/zustand`: [Fakt, entlastend] keine Kollision mit `_rueckfrage-aus-pruefung.mjs:78`/`:62-70`; keine
Pin-Zeile (`:9208`, f20 pinnt nur `holeZustand`/`setInterval(pollZustand`, `:187,200`); `rueckfrageAn` im Scope (`:6029`); Bilanz ±0.
[Schlussfolgerung] `an: true` + `warteGrenzeMs` reicht (mit V4); `grund: 'nicht_eingeschaltet'` totes und beim Port-0-Fall falsches Datum ⇒
`{ an: false }`. [Fakt] `rueckfrageKanal` heißt schon `eingaben.rueckfrageKanal` (Token; `:3470-3489`, Controller `:661-665`) ⇒ eigener
Name, z. B. `rueckfrageStatus`.
**M2** Ziel ungenau: Vermittlung entsteht immer (`:6363-6369`) ⇒ auch ohne Kanal `entschieden: []` in `GET /api/rueckfragen`; Ziel und
Gate (b) nennen das.
**M3** „Zuletzt entschieden“ verschwindet mit dem Lauf-Ende (`rueckfrage-vermittlung.mjs:368-376`) — kleiner Ringpuffer (≤ 20) auch
beendeter Läufe im Speicher oder Grenze deklarieren; Karte nennt das Projekt.
**M4** Maskierung/B12 im Grundsatz ausreichend [Fakt, entlastend: §3 Z. 135–137]; Ergänzungen: (a) Zeilennummern am Rand, (b) ⟦ ⟧ in
Eingaben selbst maskieren, (c) NBSP/Zs/Variationsselektoren/Homoglyphen als Grenze in §3, Tab in Fragen festlegen, (d) Option `""` bzw.
nur Leerzeichen zulässig (`:221`), Antwort darauf 400 (`:356`) ⇒ Knopf sperren.
**M5** Für Art `kanal` fehlen: `typ-chip.js:55,65` (Farbe `--art-rueckfrage`, keine neue), `attention.js` `GRUPPEN`/`QUELLEN`/
`IMMER_VOLLSTAENDIG`/`gruppeImFilter` (`:73-82,190`), Section in `index.html`, i18n `attention.{art,frage,knopf,satz,quelle,
nichtVerfuegbar}.kanal`, `hauptEintrag` (`:271`; „Einmal erlauben“ nicht primär); Platzhalter „Zuletzt entschieden“ `index.html:885-888`
nutzen statt zweiter Überschrift.
**M6** Kein Nachlauf im Kanal-Abruf ⇒ nach dem POST kann die Karte offen bleiben, zweiter Klick 409 — Nachlauf wie `zustand.js:161-176`
oder Karte lokal „gesendet“.
**M7** Render-Nachweis deckt das Dispatcher-Risiko nicht — `erzeugeMultiProjektDispatcher` + Registereintrag mit Laufordner, damit
`instanzPraefixDesLaufs` auf das Projekt auflöst und `herkunft: 'browser'` über das Präfix belegt ist. [Fakt, entlastend] die gemeinsame
Regel prüft nur Server und `scripts/leitstand/*.mjs`.
**M8** Gate (e) „keine neue Route“ doppelt zu `check-wachstumsbremse-server.mjs:122-127` (b1)/(b3) — weglassen bzw. nur `setInterval`.
**M9** Startzeile `rueckfrage-einschalten.mjs:57`, Test `:28`, ARCHITECTURE §3 Z. 129–131: Warnsatz „noch nicht für echte Läufe nutzen“
bleibt nach Teil A (Abnahme-Anzeige fehlt), nur der Verweis wird angepasst.
**M10 (nur Teil B)** trägt grundsätzlich: `ermittleSichtungsHalt` vergleicht Anfang/Schluss (`:4200`), Lauf-Detail über `holeLaufDetail`,
Kanal-Felder in `payload.daten`; Auslagern von `wirkungsmarkeFelder` senkt die Zeilen ⇒ Ratsche (a3) verlangt neue Grenze; R3-Einordnung
über den Präfix des Meldetexts brüchig ⇒ Feld `art` an `:6832`; Zählung vor `beendeLauf` (asynchron später) ⇒ Wartegrenze kann dazwischen
feuern (`zeitueberschreitung` vs. `lauf_ende`) ⇒ zusammenfassen oder deklarieren; Gate (t) bricht nicht (`:392,401`).
**M11** `entschieden` gibt ohne Token Stefans freie Antworten und erlaubte Befehle heraus (`:8385-8388`) — in §3 deklarieren, optional
Historie über `maskiereGeheimnisse` (Muster `:4153`); offene Karte bleibt wörtlich.

## Entlastend
E1 Antwort-Route/Token-Grenze unverändert (`:8395-8397`, `:8357-8381`, `herkunftDerAntwort` `:90-99`). E2 keine neue Route, je eine Zeile
`:8387`/`:9208`, `starteWorkflowSchritt(` unberührt (o3 `:274`). E3 Dispatcher schreibt nur `req.url` um (`:13262-13263`) ⇒ Herkunft
bleibt (real belegen: M7). E4 `api.js` bleibt einzige fetch-Stelle, explizite Präfixe wie `holeProjektZustand` (`:213`). E5 kein zweiter
Timer (`zustand.js:183`). E6 A und B fachlich unabhängig ⇒ Schnitt sauber.

## Zuschnitt
„Zu groß“: **ja** für A + B. Teil A allein: ein Baudurchgang + eine Korrekturrunde, wenn V1–V4/V6 vorher entschieden sind. Teil B eigener
Plan mit Advisor-Pass.

## Urteil
Plan v1 als Ganzes: **Nicht freigegeben**. Teil A: **Freigegeben mit Hinweisen** mit V1, V2, V3, V4, V6 in Plan v2; mitlaufend M1–M9, M11;
nur Teil B: M10. Kurzer Delta-Pass auf V2/V3 empfohlen, nicht Pflicht, wenn Plan v2 die Abhilfen wie beschrieben übernimmt.

## Nächster sinnvoller Schritt
Plan v2 nur für Teil A mit V1–V4/V6 und M1–M9/M11 als Bauauflagen; Gate f21-ws2 (f) als geändertes Bestands-Gate; neuer Feldname ohne
`grund`; Benachrichtigungsweg; Dispatcher-Instanz im Render-Nachweis; Startzeile/§3 weiter „noch nicht für echte Läufe nutzen“. Teil B
nach dem Merge von A.
