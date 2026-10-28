# Plan F45 V1 — Live-Vorschau des Projekts im Leitstand (Stufe 1), v1

Auftrag: Challenger, 28.10.2026, Branch `f45/v1-live-vorschau`, Basis main `4a07c1c` (#392). Entscheidung E-VORSCHAU-1 = A
(Stefan, 24.10.2026). Advisor-Pass fällig: neues Architekturmuster (erstes iframe im Leitstand, erste CSP), neues Gate.

## 1. Ziel

Karte c der Produktübersicht (`#/dashboard`, heute „Rolle im Detail“, fast nur „kommt“) lädt die laufende App des gewählten
Projekts über dessen `vorschau_url`; ohne erreichbare, zulässige URL steht dort „Start Building“. Der Leitstand startet und
stoppt nichts (F43-Nicht-Ziel „kein Start/Stopp“ gilt weiter).

## 2. Basis (gelesen, main 4a07c1c)

- `public/leitstand/views/dashboard.js` 1 035 Zeilen, Ratsche `zeilen: 1035`, Lint `noExcessiveCognitiveComplexity: 2`
  (`scripts/ratsche.json`). Karte c = `detailKarte()` (:459–482), im Block `uebersicht-cockpit` (`cockpitBlock`, :530), den
  `setzeBlock` bei jedem geänderten HTML per `innerHTML` neu schreibt (:181–208). Der Poll (`abonniere`, :1022) ruft `render()`.
  Ein iframe im Cockpit-Block würde also bei jeder Änderung an Karte a/b/d neu aufgebaut — deshalb eigener Container.
- Erreichbarkeit: `GET /api/projekte/<id>/projekt-aufruf` → `vorschau: { url, erreichbar, grund }` (`pruefeVorschau`,
  `src/projekt-aufruf/index.ts:215`): `url` nur bei `http://localhost|127.0.0.1:<port>`; Leitstand-Port ⇒ `erreichbar: null`,
  „nicht zulässig“; sonst Abruf 2 s, jede HTTP-Antwort = erreichbar. Client: `holeProjektAufruf(id)` (`api.js:219`, wirft bei
  Nicht-2xx), Muster `ladeVorschau` in `views/workflows.js:345`.
- „Auftrag & Start“ = Route `#/projekt` (`index.html:42`).
- Leerzustand: `istLeeresProdukt()` (keine Workitems, keine Roadmap, keine Workflows) blendet `#uebersicht-inhalt` samt Cockpit
  aus und zeigt den geführten ersten Schritt (Link `#/projekt`).

## 3. Umsetzung

### 3.1 Neues Modul `public/leitstand/vorschau-panel.js` (+ `vorschau-panel.test.mjs`)

Import-sicher (kein DOM, kein Netz beim Laden; Abruf und aktives Projekt werden injiziert, kein Import von `api.js`,
`projekt-kontext.js` oder `zustand.js`).

- `vorschauZustand(antwort, leitstandPort)` rein: `{ art: 'vorschau', url }` genau dann, wenn
  `antwort.vorschau.erreichbar === true` und `istZulaessigeVorschauUrl(url, leitstandPort)` — `http:`, Host `localhost` oder
  `127.0.0.1`, ausdrücklicher Port, Port ≠ Leitstand-Port (zweite Sicherung zu F-849: ein Leitstand im eigenen sandbox-iframe
  mit `allow-scripts allow-same-origin` wäre gleiche Herkunft und könnte die Sandbox abschütteln). Sonst
  `{ art: 'start', grund: 'keineUrl' | 'nichtErreichbar' | 'nichtZulaessig' | 'fehler', url? }`. Keine eigene Erreichbarkeitsprüfung.
- `vorschauHtml(zustand, projektName)` rein:
  - `laedt`: „Vorschau wird geprüft…“.
  - `vorschau`: Eyebrow „Live-Vorschau“, URL als `<code>` (escaped), Knöpfe „Neu laden“ (`data-vorschau-neu-laden`) und „In neuem
    Tab öffnen“ (`<a target="_blank" rel="noopener">`), darunter
    `<iframe src="<url>" sandbox="allow-scripts allow-same-origin allow-forms" title="Live-Vorschau von <Projekt>" loading="lazy">`.
  - `start`: Eyebrow „Live-Vorschau“, Titel „Start Building“, ein Satz Erklärung, Hinweis je Grund (keine URL: `vorschau_url` im
    Registereintrag eintragen; nicht erreichbar: App unter <url> selbst starten, dann „Neu laden“; nicht zulässig: Port der App
    statt des Leitstands; Fehler: Prüfung nicht möglich), Link „Zu Auftrag & Start“ → `#/projekt`, Knopf „Neu laden“.
- Steuerung `erzeugeVorschauPanel({ hole, element })` mit Zustand im Modul-Objekt:
  - `lade(projektId, projektName, { neuLaden })`: Überholschutz-Zähler; neues Projekt ⇒ sofort `laedt`; Antwort ⇒ `vorschauZustand`.
    Geschrieben wird `element().innerHTML` nur, wenn sich der Schlüssel `art|url|grund` ändert. Bei „Neu laden“ mit gleichem
    Schlüssel `vorschau` wird das vorhandene iframe neu geladen (`iframe.src = url`), nicht ersetzt.
  - Klick-Delegation auf `[data-vorschau-neu-laden]` (ein Listener am stabilen `#view-dashboard`).
- Test: Tabelle `vorschauZustand` (erreichbar/nicht/null/fehlt/Abruffehler/fremder Host/https/ohne Port/Leitstand-Port/
  `localhost:3000@evil`), Escaping, Schreibzähler am Schein-Element (gleicher Schlüssel ⇒ kein Schreiben), „Neu laden“ setzt `src`
  statt `innerHTML`, späte Antwort des alten Projekts verworfen; dazu **Integrationsfall**: `views/dashboard.js` mit Schein-DOM
  (Muster `projekt-wechsel.test.mjs`), zwei `pollJetzt()` mit geändertem Aggregat ⇒ 0 Schreibvorgänge auf `#uebersicht-vorschau`
  und 0 Abrufe `…/projekt-aufruf`; Projektwechsel ⇒ ein Abruf mit der neuen id und neues iframe.

### 3.2 `views/dashboard.js` (zeilenneutral oder senkend, Ziel ≤ 1 035)

- Gerüst: Cockpit-Sektion bekommt drei Kinder: `#uebersicht-cockpit-links` (Karten a + b, `display: contents`),
  `<article id="uebersicht-vorschau" class="uebersicht-karte uebersicht-vorschau">` (gehört nur dem Panel),
  `#uebersicht-cockpit-rechts` (Spalte d, `display: contents`). `render()` schreibt nur links/rechts, nie das Panel.
- `ladeAlles()` (Betreten, Projektwechsel) ruft zusätzlich `vorschau.lade(id, name)` — einziger Aufrufort außer „Neu laden“.
  Kein Aufruf aus `render()`/`abonniere`.
- Rollen-Details: `detailKarte` entfällt; „Bekommt/Liefert“ entfallen. Unter dem Kreis in Karte b ein kleiner Ausklapper:
  Umschalter-Knopf „Rolle im Detail · <Rolle> · <Status>“ (`aria-expanded`, `aria-controls`) und Panel (`role="tabpanel"`,
  `id` = bisheriges `ROLLE_PANEL_ID`, `hidden` wenn zu) mit Name, Worker · Aufgabe, Modell (wenn beobachtet), „In diesem Lauf“
  (unverändert, ohne Laufakte „—“) und den bisherigen Links (Output, Ablauf). Zustand `detailOffen` (Start zu, Projektwechsel
  zu). Klick oder Pfeiltaste auf eine Rolle wählt sie und öffnet den Ausklapper; Klick auf den Umschalter klappt um.
- Kopfkommentar Punkt 2c neu (Vorschau), Datenquellen um `…/projekt-aufruf` ergänzt.

### 3.3 `public/leitstand/style.css`

`.uebersicht-cockpit-teil { display: contents }`; Vorschau-Karte (Kopfzeile, iframe `flex: 1`, `min-height`, Rahmen
`var(--line)`, Radius wie Karten, Hintergrund `var(--bg)`); „Start Building“ wie bestehende Leerzustände; Ausklapper in Karte b
mit vorhandenen Tokens; alte `.uebersicht-detail*`-Regeln umgehängt bzw. entfernt. Ab 1 060 px Containerbreite spannt die
Vorschau über beide Spalten; mobil (≤ 640 px) einspaltig. Keine neuen Farben/Schatten.

### 3.4 `public/leitstand/index.html`

`<meta http-equiv="Content-Security-Policy" content="frame-src 'self' http://localhost:* http://127.0.0.1:*">` direkt nach
`charset`. Nur diese Direktive; Leitstand hat heute keine Frames, keine weitere Wirkung. Prüfen: Inline-Theme-Skript, Manifest,
Styles unberührt (CSP ohne `script-src`/`style-src`/`default-src`).

### 3.5 i18n de/en/tr/ru

Neu `vorschau.*`: eyebrow, start.titel („Start Building“ wörtlich in allen vier), start.text, hinweis.keineUrl,
hinweis.nichtErreichbar ({url}), hinweis.nichtZulaessig, hinweis.fehler, link (Auftrag & Start), neuLaden, neuerTab,
iframeTitel ({projekt}), laedt; `uebersicht.detail.umschalter` ({rolle}, {status}). Entfernt: `uebersicht.detail.bekommt`,
`uebersicht.detail.liefert`, `uebersicht.detail.eyebrow` (ersetzt durch umschalter).

### 3.6 Gate `scripts/check-f45-v1-vorschau.mjs` (neu, in `GATES` von `scripts/check-kette.mjs`, nicht seriell)

Neues kleines Gate statt Erweiterung von `check-f43-projekt-aufrufen` (das startet Prozesse und Server; die neuen Prüfungen sind
reine Funktionen und Quelltext). Je Prüfung ein Rotfall im Gate selbst:
- (a) erreichbare lokale URL ⇒ genau ein `<iframe`, `src` = geprüfte URL, `sandbox` exakt `allow-scripts allow-same-origin
  allow-forms`, kein `allow-top-navigation`/`allow-popups`; Rot: konstruiertes HTML mit fremdem `src` bzw. Sandbox mit
  `allow-top-navigation` wird gemeldet.
- (b) nicht erreichbar, keine URL, nicht zulässig (`erreichbar: null`), Abruffehler, fremder Host, https, ohne Port,
  Leitstand-Port ⇒ kein `<iframe`, „Start Building“ und `#/projekt`.
- (c) `index.html`: genau ein meta-CSP mit exakt dem Inhalt oben, im `<head>`.
- (d) Poll-Pfad: in `dashboard.js` steht der Lade-Aufruf des Panels nur in `ladeAlles` (nicht in `render`, nicht im
  `abonniere`-Rückruf), `render` nennt `uebersicht-vorschau` nicht; `vorschau-panel.js` importiert weder `zustand.js` noch
  `api.js`. Rot: konstruierter Quelltext mit dem Aufruf in `render`.
Durchsetzungsgrad: ERZWUNGEN für (a)–(d) wie beschrieben; DEKLARIERT: andere Aufrufformen (Alias, Umweg über eine Hilfsfunktion).

### 3.7 Nachweise `features/F45/nachweise/v1/` (WebP)

`erzeuge-nachweis.mjs` (Hand, nicht in `npm run check`): neutrale Umgebung zuerst (`scripts/neutrale-umgebung-starten.mjs`),
Test-App (`node:http`, Port 0, zählt Anfragen), Leitstand über `erzeugeMultiProjektDispatcher` mit zwei Wegwerf-Projekten
unter `os.tmpdir()` (minimale Roadmap, damit die Übersicht nicht im Leerzustand steht): `mit-app` (`vorschauUrl` = Test-App),
`ohne-app` (keine URL). Playwright: Vorschau 1440 dunkel/hell und 390; „Start Building“ 1440 dunkel/hell; Ausklapper offen.
Echter DOM-Beleg in `protokoll.json`: iframe-Referenz vor und nach ≥ 3 Poll-Ticks identisch, Test-App-Anfragen unverändert;
nach „Neu laden“ +1 Anfrage, gleiches Element; nach Projektwechsel Start-Building. Danach design-guardian.

### 3.8 Register und Doku

- **F-1178** („Live-Vorschau des Projekts im Leitstand“, PROCESS_IMPROVEMENT P2, E-VORSCHAU-1) **existiert bereits** mit genau
  diesem Inhalt. Statt eines Doppels: Kopf und Status-Zeile von F-1178 auf „erledigt (F45 V1)“ (Auftrag verlangte ein neues
  Finding — Abweichung, im Bericht genannt).
- Neu **F-1244** PROCESS_IMPROVEMENT P3, offen: E-K-1 legt nicht fest, ob Kopf- oder Status-Zeile zählt (W2d archivierte F-917,
  F-979, F-1087, F-1157 mit „erledigt“ im Kopf, offenem/teilweisem Status); Maßnahme E-K-1 präzisieren (Status-Zeile maßgeblich,
  Kopf muss passen), die vier in der Sichtung F-1243 prüfen.
- `features/F43/feature.md`: Vermerk mit E-VORSCHAU-1 steht schon (:52–54) — nur „umgesetzt F45 V1“ ergänzen, falls nötig.
- `docs/projekt/fixpaket-f45.md` Zeile V1 (:119): Stand „gebaut“ und Abweichung zur Zeile (Karte c statt „Rolle im Detail ·
  Builder“, Rolle im Detail als Ausklapper).
- Akte F45: Zeile W2 → erledigt (W2a–W2d gemergt, Abgenommen 2026-10-28 = Merge #392), Zeile V1 → laeuft, Begonnen 2026-10-28;
  Abschnitt `## Stand V1`.
- Ratsche: neue Code-Dateien `vorschau-panel.js`, `vorschau-panel.test.mjs`, `check-f45-v1-vorschau.mjs` formatiert,
  `check-ratsche --aktualisiere`; Senkung `dashboard.js` falls Zeilen < 1 035.

## 4. Zustände

Default (Vorschau) · Leer (Start Building; leeres Produkt ⇒ weiter geführter erster Schritt) · Ladend („wird geprüft…“) ·
Fehler (Abruf wirft ⇒ Start Building mit Hinweis „Prüfung nicht möglich“) · Hover (Knöpfe, Links wie Bestand).

## 5. Akzeptanzkriterien

1. Erreichbare, zulässige `vorschau_url` ⇒ iframe genau dieser URL mit sandbox; „Neu laden“, „In neuem Tab öffnen“ (noopener).
2. Sonst „Start Building“, Link `#/projekt`, Hinweis je Grund.
3. Erreichbarkeit nur bei Betreten, Projektwechsel, „Neu laden“ — nie im Poll (Test + Gate (d) + Protokoll).
4. iframe-Element über Poll-Renders identisch (Test + DOM-Beleg).
5. Projektwechsel lädt die Vorschau des neuen Projekts.
6. Rollen-Details als Ausklapper unter dem Kreis; Klick auf Rolle öffnet ihn; „—“ ohne Laufakte bleibt.
7. meta-CSP genau wie vorgegeben; nichts Bestehendes bricht (Render-Nachweis, Gates unten).
8. dashboard.js ≤ 1 035 Zeilen, Lint-Zählung nicht höher.

## 6. Risiken

- Eine App mit `X-Frame-Options: DENY`/`frame-ancestors` lässt sich nicht einbetten — Ausweg „In neuem Tab öffnen“; keine
  Erkennung (cross-origin nicht lesbar).
- `allow-scripts allow-same-origin`: die eingebettete App ist eine andere Herkunft (anderer Port) und erreicht das DOM des
  Leitstands nicht; Top-Navigation und Pop-ups sind gesperrt. Gleiche Herkunft nur bei Leitstand-Port — doppelt gesperrt (Server
  F-849, Client 3.1).
- Projekt-Apps, die beim Laden schwer sind, laufen dauerhaft im Hintergrund der Übersicht (`loading="lazy"` hilft nur
  außerhalb des Sichtfelds).
- Zeilenneutralität dashboard.js eng; Cockpit-Aufteilung muss das Rastermaß der Kopfkarten (4 Spalten, Containerabfragen)
  halten.

## 7. Offene Punkte, nicht stillschweigend entschieden

- O1 **Leeres Produkt**: Ohne Workitems, Roadmap und Workflows ist das ganze Cockpit ausgeblendet; „Start Building“ erscheint
  dann nicht, sondern der geführte erste Schritt (auch mit Weg zu `#/projekt`). Plan: so lassen. Alternative: Vorschau-Karte
  im Leerzustand zusätzlich zeigen — mehr Umbau.
- O2 **Client-Prüfung der URL** (3.1): nötig, oder reicht die Server-Prüfung plus CSP? Plan: behalten (eine Zeile, deckt den
  Leitstand-Port gegen Drift der Serverregel; CSP allein ließe ihn zu).
- O3 **Ausklapper statt Register**: Rollen bleiben `role=tab`, der Panel-Inhalt ist zugeklappt `hidden`. Alternative
  `<details>` (Zustandsabgleich über `toggle`, nicht bubbelnd) — verworfen.
- O4 **Neues Finding vs. F-1178** (3.8): Doppel vermeiden, Abweichung vom Auftrag.
- O5 **Integrationsfall im Test** (3.1): eigenes Schein-DOM in `vorschau-panel.test.mjs` (≈ 60 Zeilen), weil
  `projekt-wechsel.test.mjs` per Ratsche auf 1 161 Zeilen eingefroren ist.
- O6 **ARCHITECTURE.md**: neue Grenze (nur geprüfte localhost-URL im iframe, sandbox, CSP) mit Durchsetzungsgrad nur im Gate-Kopf
  und in „Stand V1“, nicht im Kern (Deckel 17 800, 1 074 Bytes Luft). Plan: nicht im Kern.
- O7 **W2 auf erledigt**: Auftrag sagt „W2d auf erledigt“; da W2a–W2d alle gemergt sind, setzt der Plan die Sammelzeile W2 auf
  erledigt.

## 8. Prüfung lokal (E-PRUEF-2 B)

lint, typecheck, `npm run test`, `node scripts/erzeuge-lagebild.mjs --check`, check-ratsche, -f43-projekt-aufrufen,
-f45-v1-vorschau, -f21-ws2-workboard-oberflaeche, -f44-i18n, -f46-bestand (index.html), -f20-design-tokens (style/Farben),
-f12-leitstand-ansicht, -docs, -rules, -status-akten, -feature, -akte-meilenstein, -f45-b5b1a-planung (Workstream-Tabelle),
-f21-workboard (Findings), -f45-k-kontext, -kette-Liste; Tests `rollen-kreis.test.mjs`, `projekt-wechsel.test.mjs`,
`vorschau-panel.test.mjs`.
