# Plan v1 — F45 B5a-2 „Akte anzeigen“ (Oberfläche)

Stand 24.10.2026, Branch `f45/b5a2-akte-anzeige` auf main `5c23bfb` (B5a-1). Grundlage: GET/PUT `…/features/<id>/akte`,
POST `/api/features` aus `scripts/leitstand/routen-f35.mjs` (`leseFeatureAkteFuerAnzeige`, `bearbeiteAkte`, `legeAkteAn`),
Körperprüfung `pruefeAkteAenderung` (`src/feature-auftrag/akte-schreiben.ts`), Gate `scripts/check-f45-b5a1-akte.mjs`.
Kein Server-Code: `scripts/leitstand-server.mjs` bleibt bei 13 264 Zeilen, keine neue Route, `routen-f35.mjs` unverändert.

## Antwortformen (aus dem Code, nicht geraten)

- GET 200 `{ status:'ok', id, titel, featureStatus, ziel, nicht_ziele[], akzeptanzkriterien[{id,text}], hash, entscheidungen[{id,text}] }`
  bzw. `{ status:'unvollstaendig', id, grund, featureStatus, hash, entscheidungen }` (ohne Teilwerte, F-1177 qa 4); 400/404/500 `{ grund }`.
- PUT Körper genau `{ ziel, nicht_ziele[string], akzeptanzkriterien[{id:^AK[0-9]+$, text}] (1..100, IDs eindeutig), grund (nicht leer, ≤500), hash (sha256) }`.
  200 `{ status:'ok', id, hash, geaendert[], git: string[] | null }` · 400 `{ grund }` · 404 · 409 Hash `{ grund, hash }` ·
  409 Sperre `{ grund, workflowId (kann null sein) }` · 422 `{ grund, verstoesse? }` · 500 `{ grund }`.
- POST `{ scope }` → 201 `{ status:'ok', id, hash, git }` · 400 · 409 `{ grund, id }` · 422 `{ grund, verstoesse? }` (Status aus
  `baueFeatureAkteAusScope`) · 500.

## Bausteine

### 1 Akte bearbeiten (E-F45-1) — neues reines Modul `public/leitstand/akte-bearbeiten.js`
Kein fetch, kein DOM (Muster `workboard-detail.js`), Test `public/leitstand/akte-bearbeiten.test.mjs`:
- `darfAkteBearbeiten(akte, workitem)`: Akte `ok`/`unvollstaendig` mit gültigem `hash` und Status nicht in `FEATURE_ENDSTATUS`
  (Zwilling der Server-Menge `STATUS_NICHT_BEARBEITBAR`; der Server bleibt Durchsetzung, 422).
- `baueAkteFormular(akte)`: Vorbelegung. `ok` ⇒ Ziel, Nicht-Ziele, AKs (IDs bleiben); `unvollstaendig` ⇒ leeres Ziel, keine
  Nicht-Ziele, ein leeres `AK1` (F-1177: das Formular startet mit dem, was der Leser liefert). `naechsteAk` = höchste Nummer + 1.
- `baueAkteKoerper(werte, hash)`: PUT-Körper; leere Nicht-Ziel-/AK-Zeilen (nur Leerraum) fallen weg, sonst unverändert (die
  Normalisierung macht der Server). Bleibt kein AK, geht der Körper trotzdem raus — der Server antwortet 400, der Grund steht wörtlich da.
- `darfSpeichern(werte, phase)`: `grund.trim() !== ''` und Phase nicht `speichert`.
- `deuteAkteAntwort(status, koerper)` ⇒ `{ art:'ok', git } | { art:'konflikt', grund } (409 mit hash) | { art:'gesperrt', grund,
  workflowId } (409 mit Schlüssel workflowId) | { art:'abgelehnt', status, grund, verstoesse[] } (400/422) | { art:'fehler', status, grund }`.
- `akteFormularHtml(stand)`: Ziel (textarea), Nicht-Ziele und AKs je Zeile ein Feld mit „Entfernen“, „Nicht-Ziel/AK hinzufügen“,
  Pflichtfeld „Änderungsgrund“ (`aria-required`, Hinweis), „Speichern“ (`disabled` ohne Grund bzw. während `speichert`), „Abbrechen“.
  Meldungen je Phase: konflikt „inzwischen geändert“ + „Neu laden“ (Speichern gesperrt, Eingaben bleiben stehen); gesperrt „gesperrt,
  solange Ablauf <id> läuft“ + Link `#/workflows/<id>` (ohne id nur der Servergrund); abgelehnt Grund und Verstöße wörtlich als Liste;
  fehler Status + Grund. Alle Akten-/Servertexte escaped, alle übrigen über t().
- `akteGespeichertHtml(git)`: Hinweis „gespeichert, noch nicht committet“ + Befehlsblock (`renderBefehlsblock`, echteWerte) bzw. ohne
  `git` der Satz „Git-Block nicht bestimmbar“; „Schließen“.

Verdrahtung in `views/workboard.js` (Schreiben nur über api.js, Gate f21-ws2 (f)):
- `api.js`: `speichereFeatureAkte(featureId, koerper)` ⇒ `fetch(mitPraefix('/features/<id>/akte'), { method:'PUT', body })` (rohe Response,
  Muster `legeAuftragAn`).
- `index.html`: neuer Container `#workboard-akte-formular` direkt vor `#workboard-detail-inhalt` (Muster `#workboard-bearbeitung`):
  Der Inhalt des Details wird bei jedem Poll-Tick mit geändertem HTML neu geschrieben — Formularfelder dort gingen verloren.
- Zustand `akteBearbeitung = { featureId, projektId, phase: 'offen'|'speichert'|'konflikt'|'gesperrt'|'abgelehnt'|'fehler'|'gespeichert',
  hash, werte, meldung, naechsteAk }` oder null. Geschrieben wird der Container nur bei Zustandswechsel (eigenes letztes-HTML, Fokus auf
  das markierte Element), getippte Werte werden vor jedem Neuschreiben aus dem DOM gelesen (Muster `leseEntwurfTexte`).
- „Bearbeiten“ (`[data-akte-bearbeiten]`) rendert `workboard-detail.js` im Kopf von „Das Was“ bzw. im Hinweis der unvollständigen Akte,
  nur wenn `sicht.akteBearbeitbar` und kein Formular offen. Bei offenem Formular lässt `wasBlock` die Karte weg (das Formular steht an ihrer Stelle).
- Speichern: Zustand prüft `darfSpeichern` (Doppelklick-Sperre im Zustand, nicht nur `disabled`), Phase `speichert` sofort rendern, PUT mit dem
  beim Öffnen gelesenen `hash`, Antwort über `deuteAkteAntwort`. Überholschutz: Antwort verworfen, wenn inzwischen anderes Detail/Projekt
  oder ein anderes Zustandsobjekt. Erfolg ⇒ Phase `gespeichert`, Akte und Roadmap neu laden (`ladeAkteUndRoadmap` mit neuem Ladeauftrag).
  „Neu laden“ (konflikt) ⇒ Formular zu, Akte neu laden. „Kopieren“ im Git-Block über `kopiereBefehlsblock`.
- `pruefeAkte` reicht `hash`, `featureStatus` und `entscheidungen` auch bei `unvollstaendig` durch (geprüft: hash 64 hex, Entscheidungen
  `{id,text}` Strings, sonst `[]`/null).
- Projektwechsel/anderes Detail ⇒ `akteBearbeitung = null`, Container leer. Detail desselben Features neu öffnen ⇒ Formular bleibt?
  → siehe Offener Punkt 2.

### 2 Kachel „Entscheidungen“ (F-995)
`verlaufBlock`: Akte lädt ⇒ „lädt“; Akte Fehler ⇒ „nicht verfügbar“; `entscheidungen` leer ⇒ ruhiger Satz „Die Akte nennt noch keine
Entscheidungen.“ (kein „kommt“); sonst Zahl + die letzten fünf (Dateireihenfolge, neueste zuletzt ⇒ umgekehrt gezeigt) als `<code>E-…</code>`
+ gekürzter Text (`**` entfernt, `kuerzeText`, escaped) und Link „Alle in der Akte“ (VS-Code-Link wie „ganze Akte“).

### 3 Coach legt Akte an (F-912) — `views/chat.js`
- `api.js`: `legeFeatureAn(scope)` ⇒ `fetch(mitPraefix('/features'), { method:'POST', body: JSON.stringify({ scope }) })`.
- In der Entwurfskarte des Coachs (nur `sparring`, nur `scope_entwurf`) neben „Als Auftrag anlegen“ der Knopf „Als Feature anlegen“
  (`data-feature-anlegen="<schluessel>"`). Der Auftragsweg bleibt unverändert (gleiche Funktion, gleiche Knöpfe, gleicher Dialog).
- Zustand je Schlüssel in einer Map `featureAnlagen` (`{ gesperrt, ergebnis }`), Doppelklick-Sperre über `gesperrt`. Ergebnis über
  `deuteFeatureAnlage(status, koerper)` (in `akte-bearbeiten.js`): 201 ⇒ „Feature F21 angelegt (ENTWURF)“, Link `#/workboard/F21`,
  Git-Block (Kopieren über die bestehende Delegation `[data-befehl-kopieren]`); 409/400/422 ⇒ Grund (und Verstöße) wörtlich; sonst Status + Grund.
  Nach Erfolg steht statt des Knopfs der Hinweis (kein zweiter Klick ⇒ keine zweite Akte im Fenster). Projektwechsel leert die Map.
- Deep-Link in die Entwicklung: findet `ladeDetail` die ID in der geladenen Liste nicht, lädt es die Workitems einmal neu (sonst zeigt eine
  schon offene Entwicklung „nicht gefunden“, bis Stefan „Neu laden“ drückt).

### 4 Offene Abnahmen überall gezählt (F-991)
- `persona-state.js`: neue Funktion `zaehleWartendeAufStefan(zustand)` = Anzahl `baueEntscheidungen(zustand, []).gruppen.workflows` +
  `.abnahmen` (null, wenn eine Liste fehlt). `leitePersonaZustandAb`: `waiting_for_human`, wenn > 0.
- `views/start.js`: Wartezeile zählt über `zaehleWartendeAufStefan` (statt `filtereAttentionWorkflows`).
- `entwicklung-daten.js` `spalteVon`: „Braucht dich“ auch bei `filtereOffeneAbnahmen(workflows).length > 0` (Gate f21-ws2 (h) bleibt grün: kein
  eigenes `naechster.art`).
- Gate `check-f28-persona` (2): Fall „offene Abnahme ⇒ waiting_for_human“ und Gegenprobe „abnahme.offen false ⇒ idle“; Tests in
  `entwicklung-daten.test.mjs` und neuer `persona-state`-Test.

### 5 „Auftrag vorbereiten“ auf der Kanban-Karte (Empfehlung Challenger)
Ohne Logikkopie: Feature-Karten mit freiem Einstieg (`hatEinstieg` und `auftragsSperre(...) === null`, dieselben Funktionen wie im Detail)
bekommen unter dem Link einen kleinen Knopf `[data-karte-bauen]`. Klick ⇒ `navigiere('#/workboard/<id>')` (dispatcht synchron, öffnet das
Detail) und danach `starteBauenFeature(workitem)` — derselbe Ablauf wie `#workboard-bauen`. Die Karte wird dafür ein `<div>` mit Link und
Knopf (ein Knopf im `<a>` ist ungültig). → siehe Offener Punkt 3.

### 6 package.json
`&&node scripts/check-f813-csrf.mjs` ⇒ `&& node …`; neues Gate `node scripts/check-f45-b5a2-akte-anzeige.mjs` nach `check-f45-b5a1-akte.mjs`.

### 7 Klärungsleitfaden „Fähigkeit“ (Coach)
Prompt-Ebene in `src/product-coach/index.ts` `baueFeatureRolleninstruktion`: eine zusätzliche Zeile — betrifft das Vorhaben eine Fähigkeit
(Skill oder Agent), klärt der Coach vor einem `scope_entwurf` nacheinander (je Turn eine Frage) Auslöser, Gut-/Schlecht-Beispiel, Grenzen und
Erfolgskriterium und trägt die Antworten in den Scope ein (Auslöser und Beispiele in `in_scope`, Grenzen in `out_of_scope`, Erfolgskriterium in
`erfolgskriterium`). Kein Schema-, Lauf- oder Routenwechsel. Test in `product-coach.test.ts`. F-1179 (neu) geht damit auf „umgesetzt, Wirkung
offen bis R“.

## Gate `scripts/check-f45-b5a2-akte-anzeige.mjs` (je Fall Gegenprobe)
(a) `speichereFeatureAkte` mit Attrappe `fetch`: PUT auf `…/features/F3/akte`, Körper trägt `hash` und `grund` aus dem Formular; Gegenprobe:
ohne Grund `darfSpeichern` false. (b) `deuteAkteAntwort` + `akteFormularHtml` für 200/400/409-Hash/409-Sperre/422: je eigene Art, Grund
wörtlich (escaped `<img>`), Verstöße als Liste, „Neu laden“ nur bei Hash-409, Link nur bei Sperre-409; Gegenprobe 409 ohne beide Felder ⇒ fehler.
(c) `detailInhaltHtml` mit Entscheidungen ⇒ IDs sichtbar, kein „kommt“ in der Kachel; leer ⇒ Leersatz, kein „kommt“. (d) `legeFeatureAn` mit
Attrappe ⇒ POST `/api/features`, Körper `{ scope }`; statisch: chat.js ruft `legeFeatureAn(` mit dem Scope der Antwort und importiert es aus
api.js; Gegenprobe: Auftragsweg ruft weiter `legeAuftragAn`. (e) eine offene Abnahme ⇒ Persona `waiting_for_human`, Zähler 1, `spalteVon`
„braucht_dich“, start.js nutzt `zaehleWartendeAufStefan`; Gegenprobe `offen:false`. (f) `workboard-detail.js`/`akte-bearbeiten.js` ohne fetch/DOM.

## Render-Nachweis `features/F45/nachweise/b5a2/`
Gegen die neutrale Instanz `features/F45/nachweise/b2b3b2b2a3/instanz.mjs` mit festen Antworten (workitems, auftraege, roadmap, akte, PUT,
sparring, POST features): Detail mit „Bearbeiten“ und Entscheidungen; Formular (ok, unvollständig, Speichern gesperrt ohne Grund); Doppelklick
Speichern (Zähler 1); 409 Hash; 409 Sperre; 422 mit Verstößen; 200 mit Git-Block; Kachel leer; Coach-Karte mit „Als Feature anlegen“, 201 und
409; Kanban-Karte mit Knopf. de 1440 hell/390 dunkel, en/tr/ru je eine Ansicht.

## Doku und Register
Findings F-1178 (Live-Vorschau), F-1179 (Klärungsinterview), F-1180 (Sollvorgabe Roadmap); F-912/F-991/F-995 auf erledigt;
`docs/projekt/fixpaket-f45.md` Zeile V1 und Reihenfolge, E-VORSCHAU-1; `features/F43/feature.md` Vermerk; `features/F45/feature.md` E-VORSCHAU-1
und „Stand B5a-2“; `docs/STATUS.md` Zeile F45; danach `node scripts/erzeuge-lagebild.mjs`.

## Offene Punkte, nicht stillschweigend entschieden
1. **Formular außerhalb von „Das Was“**: eigener Container vor dem Inhalt, „Das Was“ fällt währenddessen weg. Alternative wäre ein Formular
   in der Karte mit „Inhalt nicht neu schreiben, solange offen“ — riskanter (Poll-Ticks, `schreibeWennGeaendert`). Trägt die Trennung?
2. **Formular über Navigation**: Ein Wechsel zu einem anderen Detail verwirft das offene Formular samt Eingaben (wie Click-to-Work für ein
   anderes Workitem). Zurück zum selben Feature: Formular bleibt (gleiches Objekt). Reicht das, oder braucht es eine Rückfrage?
3. **Kanban-Knopf**: Umbau der Karte zu `<div>` mit Link + Knopf berührt Board-CSS und Fokuslogik (`fokussiereEintrag` sucht `.board-item`).
   Lohnt das im Paket, oder weglassen (Auftrag erlaubt das)?
4. **Doppelte Akten aus dem Coach**: Nach Neuladen der Seite steht der Knopf wieder da; ein zweiter Klick legt eine weitere Akte an (der Server
   überschreibt nie, vergibt eine neue ID). Ohne Server-Rückverweis (wie F-625 beim Auftrag) nicht zu verhindern — als Grenze dokumentieren?
5. **Leere Zeilen**: Client lässt leere Nicht-Ziel-/AK-Zeilen weg. Abweichung von „sende, was im Formular steht“ — vertretbar?
6. **409 Hash**: Speichern bleibt gesperrt, bis „Neu laden“; Eingaben bleiben lesbar (zum Abschreiben). Neu laden verwirft sie. Richtig so?
