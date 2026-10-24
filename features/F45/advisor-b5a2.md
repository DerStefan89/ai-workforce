# Advisor-Pass F45 B5a-2 „Akte anzeigen“ (Plan v1)

Subagent `architecture-advisor`, frischer Kontext, 24.10.2026, gegen `features/F45/plan-b5a2.md`. Bericht unverändert abgelegt
(Formatierung minimal: Kopfebene). Plan v2: `features/F45/plan-b5a2-v2.md`.

Geprüft wurde `features/F45/plan-b5a2.md` gegen ARCHITECTURE.md, `scripts/leitstand/routen-f35.mjs`, `src/feature-auftrag/akte-schreiben.ts`, `src/feature-auftrag/index.ts`, `public/leitstand/views/workboard.js`, `views/workboard-detail.js` (+ Test), `views/chat.js`, `api.js`, `befehlsblock.js`, `persona-state.js`, `views/start.js`, `entwicklung-daten.js`, `attention-daten.js`, `index.html`, `src/product-coach/index.ts`, `scripts/check-f28-persona.mjs`, `scripts/check-f21-ws2-workboard-oberflaeche.mjs`, `package.json`, `state/findings.md` (F-912, F-991, F-995, F-1177) und `features/F45/feature.md`.

**Grenzen dieser Prüfung:** Ich hatte nur Read, Grep und Glob. Kein `git diff` und kein `git status`, deshalb konnte ich nicht klären, ob `package.json` schon auf main oder nur im Arbeitsbaum geändert ist (siehe B2). Ich habe weder Gates noch Tests ausgeführt. Die Design-Referenz V10 habe ich nicht angesehen, also ist offen, ob die Vorlage einen Kanban-Knopf vorsieht. Die Zeilenzahl von `workboard.js` habe ich nicht gezählt.

## Befunde

### B1 · hoch · vor Baubeginn klären: Eine unvollständige Akte überschreibt vorhandene Abschnitte, ohne dass Stefan es sieht
- [Fakt] Bei `unvollstaendig` liefert GET weder Ziel noch Nicht-Ziele (`routen-f35.mjs:174`). „Unvollständig“ heißt: das Ziel fehlt bzw. ist leer, **oder** die AKs sind nicht lesbar (`index.ts:256-264`).
- [Fakt] Weicht ein Abschnitt vom gelesenen Wert ab, ersetzt PUT ihn (`akte-schreiben.ts:332-351`). Sind die Nicht-Ziele leer und gibt es den Abschnitt schon, wird er durch die Zeile `keine` ersetzt (`:227`).
- [Fakt] Der erste echte Fall ist F45. Die Akte hat ein ausführliches `## Ziel` (`features/F45/feature.md:16-17`), aber keine Abschnitte Nicht-Ziele, AK oder Änderungen.
- [Schlussfolgerung] Mit der geplanten Vorbelegung (Ziel leer, ein leeres AK1, Plan Z. 24-25) muss Stefan das Ziel neu tippen, um speichern zu können. Das bestehende Ziel wird dann ersetzt, obwohl er es im Formular nie gesehen hat. Bei anderen unvollständigen Akten trifft es auch vorhandene Nicht-Ziele. Wiederherstellen geht nur über `git diff`.
- [Fakt] F-1177 sagt ausdrücklich: „qa 4 … mit B5a-2 entscheiden (Teilwerte additiv …)“ (`state/findings.md:8698`). Der Plan entscheidet das nebenbei („das Formular startet mit dem, was der Leser liefert“) und führt es nicht unter den offenen Punkten. Das widerspricht CLAUDE.md, Entscheidungsregel 5 („niemals stillschweigend“).
- **Lösungswege ohne Server-Code, Stefan entscheidet:** (a) Bei `unvollstaendig` gibt es kein Formular, nur den VS-Code-Link; die Teilwerte kommen mit B5b-1. (b) Das Formular bleibt, mit einem festen Warnhinweis „Ziel, Nicht-Ziele und AK werden durch deine Eingaben ersetzt – Akte vorher öffnen“ samt VS-Code-Link direkt im Formular. Dazu ein Gate-Fall, der den Hinweis prüft.

### B2 · mittel · vor Baubeginn klären: `package.json` ist schon geändert und verweist auf ein Gate, das es noch nicht gibt
- [Fakt] `package.json:22` enthält bereits `… check-f45-b5a1-akte.mjs && node scripts/check-f45-b5a2-akte-anzeige.mjs && node …`. Die Gate-Datei gibt es noch nicht (Glob `scripts/check-f45-b5a2*` findet nichts). `&&node` kommt in `package.json` nirgends mehr vor; `&& node scripts/check-f813-csrf.mjs` hat schon das Leerzeichen.
- [Schlussfolgerung] Baustein 6 ist damit im Arbeitsbaum schon erledigt, und `npm run check` ist rot, bis das Gate existiert.
- [Offene Unsicherheit] Ob das auf main liegt oder nur im Arbeitsbaum, kann ich ohne git nicht sagen. Bitte mit `git diff main -- package.json` prüfen und Baustein 6 im Plan entsprechend korrigieren.

### B3 · mittel: Der Weg zum Neuladen der Akte ist nicht beschrieben
- [Fakt] Die Akte wird nur einmal je Öffnen geladen: Merker `akteGestartet` (`workboard.js:1361-1364`). `ladeAkteUndRoadmap` prüft nur `detailNachtrag !== nachtrag` und hat keinen Ladezähler (`:1307-1315`), anders als `ablaufLadung` bei `ladeAblaufNachtrag` (`:1328-1329`).
- [Schlussfolgerung] Neu geladen wird zweimal: nach dem Speichern (200) und bei „Neu laden“ nach einem Hash-409. Eine überholte erste Antwort kann dabei die neue Akte samt neuem Hash überschreiben. Der Plan sagt nur „mit neuem Ladeauftrag“ (Z. 51).
- Empfehlung: im Plan festlegen `nachtrag.akteLadung` (Zähler wie `ablaufLadung`), `akte = undefined` setzen, dann laden und eine überholte Antwort verwerfen. Dazu ein Test.

### B4 · mittel · Offener Punkt 3: den Kanban-Knopf weglassen
- [Fakt] Die Karte ist ein `<a class="board-item">` (`workboard.js:315`). Davon hängen ab: die Klick-Delegation `closest('.board-item')` mit `navigiere` (`:1598-1602`), `fokussiereEintrag`, das `.board-item` fokussiert (`:1742-1745`), und das CSS mit Hover, Fokus und Mobil (`style.css:6046-6230`).
- [Fakt] `starteBauenFeature` prüft `auftragsSperre` nicht selbst (`:1172-1177`). Die Sperre hängt nur am Knopf im Detail (`:957-962`, `:1754`). Ein zweiter Einstieg bräuchte eine eigene Prüfung beim Klick.
- [Fakt, entlastend] `navigiere` dispatcht synchron (`router.js:150-154`). Die Reihenfolge „navigieren, dann starten“ würde also funktionieren.
- [Annahme] Die Vorlage V10 (Board) zeigt keinen solchen Knopf; das ist nicht geprüft. Ein neues Element bräuchte dann eine Freigabe durch den design-guardian.
- Urteil: weglassen (der Auftrag erlaubt das) und als Finding für B5b festhalten. Das entlastet auch den Zuschnitt.

### B5 · niedrig bis mittel: „Auftrag vorbereiten“, während das Formular offen ist
- [Schlussfolgerung] Bei offenem Formular bleibt `#workboard-bauen` bedienbar. Der Bau-Auftrag entsteht dann aus der noch ungespeicherten Akte (`baueAuftragAusFeature`). Ein danach gestarteter Ablauf sperrt das Speichern (409 Sperre, `routen-f35.mjs:274`).
- Empfehlung: Den Einstieg bei offenem Formular zurückstellen, oder einen Hinweis zeigen, dass ungespeicherte Änderungen nicht in den Auftrag gehen. Die Regel gehört in den Plan.

### B6 · niedrig: Deep-Link mit Neuladen (Baustein 3, Z. 71-72)
- [Schlussfolgerung] Das ändert `ladeDetail` für **jeden** Deep-Link, nicht nur für den aus dem Coach. Nötig sind ein Merker „einmal je id“ (sonst Schleife bei einer echt fehlenden ID) und ein Ladezustand während des Neuladens (`renderDetailOhneWorkitem`, `:1494-1505`). Beides fehlt im Plan.
- [Annahme] GET /workitems liest `features/` bei jeder Anfrage und zeigt eine neue ENTWURF-Akte sofort an. Das ist nicht geprüft.

### B7 · niedrig: Kachel „Entscheidungen“
- [Fakt] `text` ist das ganze Bullet einschließlich Kennung und `**` (`index.ts:220, 235`; Beispiel `- **E-F45-1 = A** (Stefan …)`, `feature.md:23`). Mit `<code>E-…</code>` davor stünde die Kennung doppelt da. Also auch das Kennungspräfix aus dem Text entfernen.
- [Annahme] „Neueste zuletzt“ (Plan Z. 60) gilt für F45, ist aber keine Regel der Akte. Besser „die letzten fünf in Aktenreihenfolge“ schreiben.
- [Fakt] Der bestehende Test erwartet „kommt“ bei den Entscheidungen (`workboard-detail.test.mjs:150`). Er muss mitgezogen werden; das fehlt im Plan.
- [Fakt] Gate (c) „kein ‚kommt‘“ muss auf diese Kachel begrenzt sein. „Verbrauch“ bleibt „kommt“ (`workboard-detail.js:718`), ebenso „Befunde“ bei 0 (`:702`).

### B8 · niedrig: Was `darfAkteBearbeiten` prüft
- [Fakt] Der Server prüft den Status aus der Datei (`akte-schreiben.ts:319-320`), und GET liefert dafür `featureStatus` auch bei `unvollstaendig` (`routen-f35.mjs:170-174`).
- Empfehlung: `akte.featureStatus` prüfen, nicht `workitem.status`. Mit `FEATURE_ENDSTATUS` (`workboard-detail.js:82`) entsteht kein neuer Zwilling [Fakt, entlastend].

### B9 · niedrig: Wohin `zaehleWartendeAufStefan` gehört
- [Fakt] `zaehleOffeneEntscheidungen` steht in `attention-daten.js:317-323` und hat dieselbe Form (`baueEntscheidungen(zustand, [])`, null bei fehlender Liste). `attention-daten.js` ist laut Dateikopf die eine Quelle der Auswahlregeln (`:4-6`), und `persona-state.js:7-9` verweist darauf.
- Empfehlung: die neue Zählung daneben in `attention-daten.js` legen. persona-state und start importieren sie von dort.
- [Fakt, entlastend] Bei einer null-Quelle bleibt Gate f28 (2) „null-Quelle workflows ⇒ idle“ grün (`check-f28-persona.mjs:83`), denn `filtereOffeneAbnahmen(null)` gibt null zurück (`attention-daten.js:66-68`). Gate f21-ws2 (h) bleibt mit einem zusätzlichen Import aus `./attention-daten.js` grün (`check-f21-…:267-280`).

### B10 · niedrig: Kleine Lücken im Coach-Knopf
- [Fakt] POST 201 kann `git: null` liefern (`baueGitBlock`, `routen-f35.mjs:211-217, 343`). Der Plan behandelt `null` nur beim PUT (Z. 36-37), nicht im Coach.
- [Fakt] Die Entwurfskarte erscheint nur ohne offenen Dialog und ohne `auftragErstelltId` (`chat.js:897-911`). Der Plan muss festlegen, ob „Als Feature anlegen“ sichtbar bleibt, wenn zu diesem Turn schon ein Auftrag angelegt wurde.
- [Annahme, wahrscheinlich entlastend] Der gespeicherte `antwort.scope` hält dasselbe Schema wie `validiereScope` (keine fremden Felder, `product-coach/index.ts:138-154`), wird beim POST also nicht mit 400 abgelehnt.

### B11 · niedrig: Begründung im Client
- [Fakt] Der Server begrenzt die Begründung auf 500 Zeichen (`akte-schreiben.ts:40, 158`). Ein `maxlength="500"` im Formular erspart Stefan eine 400-Antwort; der Text der Server-Antwort bleibt trotzdem wörtlich.

## Die sechs offenen Punkte

1. **Formular außerhalb von „Das Was“: die Trennung trägt.** [Fakt] `schreibeWennGeaendert` schreibt `innerHTML` bei jeder Änderung neu (`workboard.js:1446-1455`), und `renderDetailInhalt` sagt ausdrücklich zu: „Der Inhalt hat keine Formularfelder“ (`:1511-1512`). Der Container steht dort, wo heute „Das Was“ beginnt, also nach `#workboard-bearbeitung` und vor dem Inhalt (`index.html:406-411`); „Das Was“ ist der erste Block (`workboard-detail.js:884`). Ergänzen sollte der Plan: Fokus nach „Abbrechen“ bzw. „Schließen“ zurück auf „Bearbeiten“; `renderDetailOhneWorkitem` leert auch den neuen Container; das neue Sicht-Feld (z. B. `akteFormularOffen`) gehört in den Dateikopf von `workboard-detail.js:19-36`.
2. **Formular über Navigation: reicht ohne Rückfrage.** [Fakt, entlastend] Es gibt dafür ein Vorbild: Beim Wechsel zu einem anderen Eintrag verwirft `ladeDetail` den Zustand (`workboard.js:1552-1554`), und der getippte AK-Entwurf aus B2a-2 geht dabei ebenso verloren. Beim Zurück zum selben Feature hat das Formular weiter den alten Hash. Das ist richtig: ein inzwischen geänderter Stand führt zu 409. Bedingung: Vor jedem Neuschreiben werden die Werte aus dem DOM gelesen, auch nach `letztesDetailHtml.clear()` in `ladeDetail` (`:1556`). Die Grenze im Dateikopf festhalten.
3. **Kanban-Knopf: weglassen** (siehe B4).
4. **Doppelte Akten aus dem Coach: als Grenze dokumentieren und ein neues Finding für einen Rückverweis auf dem Server anlegen** (Vorbild F-625, `chat.js:1915-1923`). [Fakt, entlastend] Der Schaden ist klein: Eine doppelte Akte ist eine neue, nicht committete Datei mit eigener ID (`routen-f35.mjs:329, 339`) und fällt in `git status` auf.
5. **Leere Zeilen weglassen: vertretbar.** [Fakt] Ohne das würde der Server einen leeren Eintrag mit 400 ablehnen (`akte-schreiben.ts:111, 164-167, 181`). [Fakt, entlastend] „Nur Leerraum“ (`trim() === ''`) entspricht genau `normalisiereEintrag(...) === ''` (`:81-87`). Nebenwirkung, im Plan nennen: Die Indizes in Server-Meldungen (`nicht_ziele[2]`) beziehen sich auf die gesendete Liste, nicht auf die Zeilen im Formular.
6. **Hash-409: richtig so.** [Fakt] Der Server liefert dabei den aktuellen Hash mit (`routen-f35.mjs:285`). Der Plan nutzt ihn bewusst nicht für ein erneutes Speichern ohne Nachfrage; das ist korrekt, sonst wäre der Schutz umgangen. Ergänzen: Am Knopf „Neu laden“ steht, dass die Eingaben dabei verloren gehen.

## Was geprüft und in Ordnung war

- [Fakt, entlastend] Die Antwortformen im Plan stimmen mit dem Code überein: GET mit Status `ok` bzw. `unvollstaendig` einschließlich `featureStatus` (`routen-f35.mjs:174-189`; der JSDoc in `:151` lässt `featureStatus` aus, der Code liefert es). PUT antwortet mit 400, 404, 409 mit `hash`, 409 mit `workflowId`, 422 mit optionalen `verstoesse`, 500 und 200 mit `git` (`:259-304`). POST antwortet mit 201, 400/422 aus `baueFeatureAkteAusScope` und 409 mit `id` (`:312-344`).
- [Fakt, entlastend] Die beiden 409-Formen sind über den Schlüssel sicher zu unterscheiden. `workflowId` steht immer im Körper, auch als `null` (`:241, 245, 248, 274`), `hash` nur beim Hash-409. `deuteAkteAntwort` funktioniert so, ohne dass der Server geändert wird.
- [Fakt, entlastend] `scripts/leitstand-server.mjs` hat 13 264 Zeilen (letzte Zeile 13264). Der Plan braucht keine neue Route.
- [Fakt, entlastend] Schreiben über `api.js` hält Gate f21-ws2 (f) ein: kein `method: 'PUT'` in `workboard.js` (`check-f21-…:181-190`). `workboard-detail.js` bleibt ohne fetch, document und window (`:194-195`). Das neue reine Modul in Gate (f) des neuen Gates aufzunehmen, ist richtig.
- [Fakt, entlastend] CSRF: Der Schutz arbeitet über Origin und Sec-Fetch-Site (`check-f813-csrf.mjs:8-16`). Ein PUT mit derselben Origin aus dem Leitstand kommt ohne zusätzlichen Header durch.
- [Fakt, entlastend] ARCHITECTURE.md §2 (`:95-96`, „im Projektordner bleibt der Kern lesend, außer der Feature-Akte auf Eingabe“) deckt das Bearbeiten im Formular ab.
- [Fakt, entlastend] Baustein 7 ändert nur eine Zeile in `baueFeatureRolleninstruktion` (`product-coach/index.ts:358-373`); kein Gate prüft diesen Text. Die Zuordnung Grenzen → `out_of_scope` → Nicht-Ziele und Erfolgskriterium → AK1 passt zu `baueFeatureAkteAusScope` (`:549-553`).
- [Fakt, entlastend] Die Instanz für den Render-Nachweis gibt es (`features/F45/nachweise/b2b3b2b2a3/instanz.mjs`).

## Zuschnitt

[Schlussfolgerung] Mit allen sieben Bausteinen, rund 15 Render-Szenen in vier Sprachen, einem neuen Gate und dem Doku-Block ist der Plan zu groß für einen Baudurchgang plus eine Korrekturrunde. Baustein 1 allein umfasst ein neues Modul, einen Zustandsautomaten, einen Container, Fokusführung, den Ladezähler und rund neun Szenen. Die letzten Pakete haben ihre eine Korrekturrunde aufgebraucht (F-1173 N1).

Empfehlung:
- Baustein 5 streichen (B4).
- Danach liegt der Rest an der Grenze. Wer mehr Sicherheit will, schneidet in **B5a-2a** (Bausteine 1, 2 und 6 mit B1 bis B3: Detail und Akte) und **B5a-2b** (Bausteine 3, 4 und 7: Coach-Knopf, F-991, Klärungsleitfaden). Beide Teile lassen sich für sich prüfen, und B5a-2b hängt nur an B5a-1.

## Vor Baubeginn zu klären

1. **B1:** Stefan entscheidet zu F-1177 qa 4, Weg (a) oder (b).
2. **B2:** Stand von `package.json` gegen main klären und Baustein 6 im Plan berichtigen.
3. **B3:** Den Weg zum Neuladen festlegen (Ladezähler).
4. **Offener Punkt 3:** Kanban streichen, und den Zuschnitt entscheiden (alles in einem Paket oder 2a/2b).

B5 bis B11 können als Bauauflagen in Plan v2 stehen.

## Status
- [ ] Freigegeben
- [ ] Freigegeben mit Hinweisen
- [x] Nicht freigegeben
- [ ] Blockiert

**Begründung:** Die Architektur trägt: der eigene Container, Schreiben nur über `api.js`, keine neue Route, kein Server-Code und eine eindeutige 409-Unterscheidung. Der Plan entscheidet aber stillschweigend einen Punkt, der zu Datenverlust führen kann und den F-1177 ausdrücklich an B5a-2 übergibt (B1). Am ersten echten Fall F45 würde das Formular das bestehende Ziel ersetzen, ohne es zu zeigen. Dazu ist `package.json` schon vorab geändert (B2), der Weg zum Neuladen fehlt (B3), und der Zuschnitt ist grenzwertig. Für eine Plan v2 reichen kleine Änderungen; ein neuer Entwurf ist nicht nötig.

## Nächster sinnvoller Schritt
Stefan entscheidet B1 (Weg a oder b), den Kanban-Knopf und den Zuschnitt. Danach Plan v2 mit B2 bis B11 als Auflagen, anschließend ein kurzer Delta-Abgleich gegen diesen Bericht und Baubeginn.
